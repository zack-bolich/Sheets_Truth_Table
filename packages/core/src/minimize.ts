import { LogicError } from './errors';
import { formatSop } from './format';
import { type Implicant, compareImplicants, covers, literalCount } from './implicant';
import { compile, truthTable } from './truthTable';
import { type VarOrderInput, parseVarOrder } from './variables';

/** Largest number of variables minimization accepts. */
export const MAX_MINIMIZE_VARIABLES = 10;

/**
 * Search budget for solving the cyclic core. Within it the cover found is
 * provably minimal; past it the best cover found so far is returned, which is
 * still correct but may not be minimal. Hand-sized problems (and anything that
 * dominance reduction mostly solves) finish in a handful of nodes; only large
 * random functions of 8+ variables come near the budget.
 */
const SEARCH_NODE_LIMIT = 20_000;

const DEFAULT_NAMES = 'ABCDEFGHIJ';

/**
 * Quine–McCluskey: all prime implicants of the function whose 1s and
 * don't-cares are `terms`. Implicants are merged level by level; one that
 * merges with nothing at its level is prime.
 */
export function primeImplicants(n: number, terms: readonly number[]): Implicant[] {
  const key = (imp: Implicant) => imp.mask * 2 ** n + imp.value;
  let level = new Map<number, Implicant>();
  for (const value of terms) level.set(value, { value, mask: 0 });

  const primes: Implicant[] = [];
  while (level.size > 0) {
    const next = new Map<number, Implicant>();
    const merged = new Set<number>();
    for (const imp of level.values()) {
      for (let bit = 1; bit < 1 << n; bit <<= 1) {
        if ((imp.mask | imp.value) & bit) continue;
        const partner = key({ value: imp.value | bit, mask: imp.mask });
        if (!level.has(partner)) continue;
        merged.add(key(imp)).add(partner);
        const combined = { value: imp.value, mask: imp.mask | bit };
        next.set(key(combined), combined);
      }
    }
    for (const [k, imp] of level) if (!merged.has(k)) primes.push(imp);
    level = next;
  }
  return primes.sort((a, b) => compareImplicants(a, b, n));
}

/**
 * A minimal sum-of-products cover: fewest terms, then fewest literals, ties
 * broken towards textbook term order. Returns the chosen prime implicants in
 * textbook order; an empty list means the function is 0.
 */
export function minimizeMinterms(
  n: number,
  minterms: readonly number[],
  dontCares: readonly number[] = [],
): Implicant[] {
  if (!Number.isInteger(n) || n < 0 || n > MAX_MINIMIZE_VARIABLES) {
    throw new LogicError(
      `Number of variables must be a whole number from 0 to ${MAX_MINIMIZE_VARIABLES}`,
    );
  }
  const on = validateIndices(n, minterms, 'Minterm');
  const dc = validateIndices(n, dontCares, "Don't-care");
  for (const m of on) {
    if (dc.includes(m)) throw new LogicError(`Minterm ${m} is also listed as a don't-care`);
  }
  if (on.length === 0) return [];

  const primes = primeImplicants(n, [...on, ...dc]);
  return selectCover(n, on, primes).sort((a, b) => compareImplicants(a, b, n));
}

function validateIndices(n: number, indices: readonly number[], what: string): number[] {
  const size = 2 ** n;
  for (const m of indices) {
    if (!Number.isInteger(m)) throw new LogicError(`${what} ${m} is not a whole number`);
    if (m < 0 || m >= size) {
      throw new LogicError(
        `${what} ${m} is out of range for ${n} variable${n === 1 ? '' : 's'} (0–${size - 1})`,
      );
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Picks prime implicants covering every minterm in `on`: repeatedly take
 * essential implicants and drop dominated rows and columns, then solve
 * whatever cyclic core is left with Petrick's method.
 */
function selectCover(n: number, on: readonly number[], primes: readonly Implicant[]): Implicant[] {
  const cost = (i: number) => literalCount(primes[i] as Implicant, n);
  const coverOf = (i: number, minterms: Iterable<number>) =>
    new Set([...minterms].filter((m) => covers(primes[i] as Implicant, m)));
  const remaining = new Set(on);
  const candidates = new Set(primes.keys());
  const chosen: number[] = [];

  const coveringAll = new Map(
    on.map((m) => [m, [...primes.keys()].filter((i) => covers(primes[i] as Implicant, m))]),
  );
  const coveringOf = (m: number) => (coveringAll.get(m) ?? []).filter((i) => candidates.has(i));
  const take = (i: number) => {
    chosen.push(i);
    candidates.delete(i);
    for (const m of [...remaining]) if (covers(primes[i] as Implicant, m)) remaining.delete(m);
  };

  const takeEssentials = (): boolean => {
    let changed = false;
    for (const m of [...remaining]) {
      if (!remaining.has(m)) continue;
      const covering = coveringOf(m);
      if (covering.length === 1) {
        take(covering[0] as number);
        changed = true;
      }
    }
    return changed;
  };

  // Drop implicant p when another implicant q covers everything p still
  // covers at no greater cost (for identical rows keep the earlier one).
  const dropDominatedRows = (): boolean => {
    let changed = false;
    const rows = new Map([...candidates].map((i) => [i, coverOf(i, remaining)]));
    for (const [p, rowP] of rows) {
      const dominated =
        rowP.size === 0 ||
        [...rows].some(
          ([q, rowQ]) =>
            q !== p &&
            candidates.has(q) &&
            cost(q) <= cost(p) &&
            isSubset(rowP, rowQ) &&
            (rowP.size < rowQ.size || cost(q) < cost(p) || q < p),
        );
      if (dominated) {
        candidates.delete(p);
        changed = true;
      }
    }
    return changed;
  };

  // Drop minterm a when some minterm b can only be covered by implicants that
  // also cover a: covering b then covers a for free.
  const dropDominatingColumns = (): boolean => {
    let changed = false;
    const columns = new Map([...remaining].map((m) => [m, new Set(coveringOf(m))]));
    for (const [a, colA] of columns) {
      const dominates = [...columns].some(
        ([b, colB]) =>
          b !== a && remaining.has(b) && isSubset(colB, colA) && (colB.size < colA.size || b < a),
      );
      if (dominates) {
        remaining.delete(a);
        changed = true;
      }
    }
    return changed;
  };

  while (
    remaining.size > 0 &&
    (takeEssentials() || dropDominatedRows() || dropDominatingColumns())
  );

  const cyclic = petrick([...remaining].map(coveringOf), (i) => cost(i));
  return [...chosen, ...cyclic].map((i) => primes[i] as Implicant);
}

function isSubset<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Petrick's method: each clause lists the implicants that can cover one
 * minterm, and the cheapest product term of the product of the clauses is the
 * cheapest cover. Rather than multiplying the clauses out (exponential), the
 * cheapest product is found by branch and bound: branch on the clause with the
 * fewest options, and prune with a lower bound from pairwise-disjoint clauses
 * (each needs its own implicant). Cost is (number of implicants, total
 * `cost`), ties going to the lexicographically smallest index list.
 */
export function petrick(
  clauses: readonly (readonly number[])[],
  cost: (i: number) => number,
): number[] {
  if (clauses.length === 0) return [];
  const ids = [...new Set(clauses.flat())].sort((a, b) => a - b);
  const rows = new Map<number, number[]>(ids.map((id) => [id, []]));
  clauses.forEach((clause, j) => {
    for (const id of clause) rows.get(id)?.push(j);
  });
  const rowOf = (id: number) => rows.get(id) ?? [];
  const minCost = Math.min(...ids.map(cost));
  const order = [...clauses.keys()].sort(
    (a, b) => (clauses[a]?.length ?? 0) - (clauses[b]?.length ?? 0) || a - b,
  );

  const coveredBy = new Int32Array(clauses.length);
  let uncovered = clauses.length;
  const chosen: number[] = [];
  let chosenCost = 0;
  const choose = (id: number) => {
    chosen.push(id);
    chosenCost += cost(id);
    for (const j of rowOf(id)) {
      const before = coveredBy[j] ?? 0;
      coveredBy[j] = before + 1;
      if (before === 0) uncovered--;
    }
  };
  const unchoose = () => {
    const id = chosen.pop() as number;
    chosenCost -= cost(id);
    for (const j of rowOf(id)) {
      const after = (coveredBy[j] ?? 0) - 1;
      coveredBy[j] = after;
      if (after === 0) uncovered++;
    }
  };
  const gain = (id: number) => rowOf(id).filter((j) => coveredBy[j] === 0).length;

  type Solution = { ids: number[]; cost: number };
  const better = (a: Solution, b: Solution) =>
    a.ids.length - b.ids.length || a.cost - b.cost || compareArrays(a.ids, b.ids);

  // Greedy start: repeatedly take the implicant covering the most clauses.
  while (uncovered > 0) {
    let pick = -1;
    for (const id of ids) {
      if (
        pick === -1 ||
        gain(id) > gain(pick) ||
        (gain(id) === gain(pick) && cost(id) < cost(pick))
      ) {
        if (gain(id) > 0) pick = id;
      }
    }
    choose(pick);
  }
  let best: Solution = { ids: [...chosen].sort((a, b) => a - b), cost: chosenCost };
  while (chosen.length > 0) unchoose();

  const lowerBound = (): number => {
    const blocked = new Set<number>();
    let count = 0;
    for (const j of order) {
      const clause = clauses[j] as readonly number[];
      if (coveredBy[j] !== 0 || clause.some((id) => blocked.has(id))) continue;
      count++;
      for (const id of clause) blocked.add(id);
    }
    return count;
  };

  let nodes = 0;
  const search = (): void => {
    if (uncovered === 0) {
      const candidate = { ids: [...chosen].sort((a, b) => a - b), cost: chosenCost };
      if (better(candidate, best) < 0) best = candidate;
      return;
    }
    if (++nodes > SEARCH_NODE_LIMIT) return;
    const needed = lowerBound();
    const terms = chosen.length + needed;
    if (terms > best.ids.length) return;
    if (terms === best.ids.length && chosenCost + needed * minCost > best.cost) return;

    const branch = order.find((j) => coveredBy[j] === 0) as number;
    const options = [...(clauses[branch] as readonly number[])].sort(
      (a, b) => gain(b) - gain(a) || cost(a) - cost(b) || a - b,
    );
    for (const id of options) {
      choose(id);
      search();
      unchoose();
    }
  };
  search();
  return best.ids;
}

function compareArrays(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const diff = (a[i] as number) - (b[i] as number);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

/** Minimal sum of products for an expression, e.g. `minimize("A & B | A & !B")` → `"A"`. */
export function minimize(source: string, varOrder?: VarOrderInput): string {
  const { variables } = compile(source, varOrder);
  checkMinimizeSize(variables.length);
  const on = truthTable(source, varOrder)
    .rows.filter((r) => r.output === 1)
    .map((r) => r.index);
  return formatSop(minimizeMinterms(variables.length, on), variables);
}

/**
 * Minimal sum of products from a minterm list, with optional don't-cares.
 * Variables default to A, B, C, … with A as the most significant bit.
 */
export function minimizeM(
  n: number,
  minterms: readonly number[],
  dontCares: readonly number[] = [],
  names?: VarOrderInput,
): string {
  const cover = minimizeMinterms(n, minterms, dontCares);
  const given = names === undefined ? [] : parseVarOrder(names);
  if (given.length > 0 && given.length !== n) {
    throw new LogicError(`Expected ${n} variable names but got ${given.length}`);
  }
  const variables = given.length > 0 ? given : DEFAULT_NAMES.slice(0, n).split('');
  return formatSop(cover, variables);
}

function checkMinimizeSize(n: number): void {
  if (n > MAX_MINIMIZE_VARIABLES) {
    throw new LogicError(
      `Too many variables to minimize (${n}); the limit is ${MAX_MINIMIZE_VARIABLES}`,
    );
  }
}
