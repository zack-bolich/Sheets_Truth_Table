import { describe, expect, it } from 'vitest';
import { formatSop } from '../src/format';
import { type Implicant, compareImplicants, covers, literalCount } from '../src/implicant';
import {
  MAX_MINIMIZE_VARIABLES,
  minimize,
  minimizeM,
  minimizeMinterms,
  petrick,
  primeImplicants,
} from '../src/minimize';
import { equivalent, minterms } from '../src/truthTable';
import { randomExpression, rng } from './helpers';

const cost = (cover: readonly Implicant[], n: number) => ({
  terms: cover.length,
  literals: cover.reduce((sum, imp) => sum + literalCount(imp, n), 0),
});

/** Every m in [0, 2^n) is covered iff it is a minterm (don't-cares may go either way). */
function expectExactCover(n: number, cover: readonly Implicant[], on: number[], dc: number[] = []) {
  for (let m = 0; m < 2 ** n; m++) {
    if (dc.includes(m)) continue;
    expect(
      cover.some((imp) => covers(imp, m)),
      `minterm ${m}`,
    ).toBe(on.includes(m));
  }
}

describe('primeImplicants', () => {
  it('finds the primes of a classic 3-variable function', () => {
    // F = Σm(0,1,2,5,6,7): A'B', A'C', B'C, BC', AC, AB
    const primes = primeImplicants(3, [0, 1, 2, 5, 6, 7]);
    expect(formatSop(primes, ['A', 'B', 'C'])).toBe("AB + AC + A'B' + A'C' + BC' + B'C");
  });

  it('merges all the way to the constant 1', () => {
    expect(primeImplicants(2, [0, 1, 2, 3])).toEqual([{ value: 0, mask: 3 }]);
  });

  it('returns nothing for no terms', () => {
    expect(primeImplicants(3, [])).toEqual([]);
  });
});

describe('minimizeM: textbook answers', () => {
  it.each([
    // [n, minterms, don't-cares, expected]
    [1, [1], [], 'A'],
    [1, [0], [], "A'"],
    [2, [1, 2], [], "AB' + A'B"],
    [2, [1, 2, 3], [], 'A + B'],
    [3, [2, 3, 4, 5], [], "AB' + A'B"],
    [3, [0, 2, 4, 5, 6], [], "AB' + C'"],
    [3, [3, 5, 6, 7], [], 'AB + AC + BC'],
    [4, [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], [], "A'D' + BD' + C'"],
    [4, [0, 1, 2, 8, 10, 9, 6], [], "A'CD' + B'C' + B'D'"],
    [4, [0, 2, 8, 10], [], "B'D'"],
    [4, [5, 7, 13, 15], [], 'BD'],
    [4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [], '1'],
    [4, [], [1, 2], '0'],
    [4, [1, 3, 7, 11, 15], [0, 2, 5], "A'B' + CD"],
    [4, [0, 6, 8, 13, 14], [2, 4, 10], "ABC'D + B'D' + CD'"],
  ] as const)('n=%i Σm%j + d%j → %s', (n, on, dc, expected) => {
    expect(minimizeM(n, on, dc)).toBe(expected);
  });

  it('picks a minimal cover of a cyclic function deterministically', () => {
    // Σm(0,1,2,5,6,7) has two minimal covers of 3 terms; either is minimal.
    const result = minimizeM(3, [0, 1, 2, 5, 6, 7]);
    expect(["AB + A'B' + BC'", "AC + A'B' + BC'", "AB + A'C' + B'C"]).toContain(result);
    expect(minimizeMinterms(3, [0, 1, 2, 5, 6, 7])).toHaveLength(3);
    expect(minimizeM(3, [0, 1, 2, 5, 6, 7])).toBe(result);
  });
});

describe('minimizeM: arguments', () => {
  it('uses custom variable names', () => {
    expect(minimizeM(2, [3], [], 'X,Y')).toBe('XY');
    expect(minimizeM(2, [1], [], ['En', 'Clk'])).toBe("En'·Clk");
  });

  it('ignores duplicate indices', () => {
    expect(minimizeM(2, [3, 3], [3 - 1, 2])).toBe('A');
  });

  it('allows zero variables', () => {
    expect(minimizeM(0, [0])).toBe('1');
    expect(minimizeM(0, [])).toBe('0');
  });

  it('rejects bad variable counts', () => {
    expect(() => minimizeM(-1, [])).toThrow(
      'Number of variables must be a whole number from 0 to 10',
    );
    expect(() => minimizeM(1.5, [])).toThrow('whole number');
    expect(() => minimizeM(MAX_MINIMIZE_VARIABLES + 1, [])).toThrow('from 0 to 10');
  });

  it('rejects out-of-range and non-integer indices', () => {
    expect(() => minimizeM(3, [8])).toThrow('Minterm 8 is out of range for 3 variables (0–7)');
    expect(() => minimizeM(1, [-1])).toThrow('Minterm -1 is out of range for 1 variable (0–1)');
    expect(() => minimizeM(3, [1.5])).toThrow('Minterm 1.5 is not a whole number');
    expect(() => minimizeM(3, [1], [9])).toThrow("Don't-care 9 is out of range");
  });

  it("rejects a minterm that is also a don't-care", () => {
    expect(() => minimizeM(3, [1, 2], [2])).toThrow("Minterm 2 is also listed as a don't-care");
  });

  it('rejects the wrong number of names', () => {
    expect(() => minimizeM(3, [1], [], 'A,B')).toThrow('Expected 3 variable names but got 2');
  });

  it('falls back to default names for a blank name list', () => {
    expect(minimizeM(2, [3], [], '')).toBe('AB');
  });
});

describe('minimize (expression)', () => {
  it.each([
    ['A & B | A & !B', 'A'],
    ["A + A'B", 'A + B'],
    ['A ^ B', "AB' + A'B"],
    ['(A + B)(A + C)', 'A + BC'],
    ["AB + A'C + BC", "AB + A'C"],
    ["A + A'", '1'],
    ["A A'", '0'],
    ['!(A & B)', "A' + B'"],
    ['A & B | !C', "AB + C'"],
  ])('%s → %s', (expression, expected) => {
    expect(minimize(expression)).toBe(expected);
  });

  it('orders literals by the variable order', () => {
    expect(minimize('A & !B', 'B,A')).toBe("B'A");
  });

  it('uses · between multi-letter names', () => {
    expect(minimize('En & X | En & !X')).toBe('En');
    expect(minimize('En & Clk | X1')).toBe('Clk·En + X1');
  });

  it('rejects more than 10 variables', () => {
    expect(() => minimize('ABCDEFGHIJK')).toThrow(
      'Too many variables to minimize (11); the limit is 10',
    );
  });

  it('handles 10 variables', () => {
    expect(minimize('ABCDEFGHIJ + A')).toBe('A');
    const parity = 'A ^ B ^ C ^ D ^ E ^ F ^ G ^ H ^ I ^ J';
    expect(minimizeMinterms(10, minterms(parity))).toHaveLength(512);
  });
});

describe('petrick', () => {
  it('returns the cheapest product, fewest terms first', () => {
    // (0+1)(1+2)(2+3): {0,2}, {1,2} and {1,3} all have two terms; cost breaks
    // the tie against {0,2}, then index order picks {1,2} over {1,3}.
    const costs = [3, 1, 1, 1];
    expect(
      petrick(
        [
          [0, 1],
          [1, 2],
          [2, 3],
        ],
        (i) => costs[i] ?? 0,
      ),
    ).toEqual([1, 2]);
    expect(petrick([[0, 1]], (i) => [5, 2][i] ?? 0)).toEqual([1]);
  });

  it('beats the greedy choice when the biggest implicant is a trap', () => {
    // Implicant 2 covers the most minterms, but {0, 1} covers everything with two.
    const clauses = [[0, 2], [0, 2], [0], [1, 2], [1, 2], [1]];
    expect(petrick(clauses, () => 1)).toEqual([0, 1]);
  });

  it('returns an empty product for no clauses', () => {
    expect(petrick([], () => 1)).toEqual([]);
  });
});

describe('compareImplicants', () => {
  it('puts plain literals before complements before absent variables', () => {
    const terms: Implicant[] = [
      { value: 0b000, mask: 0b011 }, // A'
      { value: 0b100, mask: 0b011 }, // A
      { value: 0b000, mask: 0b100 }, // B'C'
    ];
    expect(
      formatSop(
        [...terms].sort((a, b) => compareImplicants(a, b, 3)),
        ['A', 'B', 'C'],
      ),
    ).toBe("A + A' + B'C'");
  });
});

describe('minimization properties', () => {
  /** Brute-force: the cheapest (terms, literals) over every subset of the prime implicants. */
  function bruteForceCost(n: number, on: number[]) {
    const primes = primeImplicants(n, on);
    let best = { terms: Infinity, literals: Infinity };
    for (let subset = 0; subset < 2 ** primes.length; subset++) {
      const chosen = primes.filter((_, i) => (subset >> i) & 1);
      if (!on.every((m) => chosen.some((p) => covers(p, m)))) continue;
      const c = cost(chosen, n);
      if (c.terms < best.terms || (c.terms === best.terms && c.literals < best.literals)) best = c;
    }
    return best;
  }

  it('is exact and minimal for every 3-variable function', () => {
    for (let f = 0; f < 256; f++) {
      const on = [...Array(8).keys()].filter((m) => (f >> m) & 1);
      const cover = minimizeMinterms(3, on);
      expectExactCover(3, cover, on);
      expect(cost(cover, 3), `f=${f}`).toEqual(
        on.length === 0 ? { terms: 0, literals: 0 } : bruteForceCost(3, on),
      );
    }
  });

  it('is exact and minimal for random 4-variable functions', () => {
    const random = rng(4);
    for (let trial = 0; trial < 150; trial++) {
      const on = [...Array(16).keys()].filter(() => random() < 0.5);
      const cover = minimizeMinterms(4, on);
      expectExactCover(4, cover, on);
      if (on.length > 0 && primeImplicants(4, on).length <= 16) {
        expect(cost(cover, 4), `on=${on.join(',')}`).toEqual(bruteForceCost(4, on));
      }
    }
  });

  it("respects don't-cares on random 5-variable functions", () => {
    const random = rng(5);
    for (let trial = 0; trial < 100; trial++) {
      const on: number[] = [];
      const dc: number[] = [];
      for (let m = 0; m < 32; m++) {
        const r = random();
        if (r < 0.4) on.push(m);
        else if (r < 0.55) dc.push(m);
      }
      const cover = minimizeMinterms(5, on, dc);
      expectExactCover(5, cover, on, dc);
      expect(cost(cover, 5).literals).toBeLessThanOrEqual(on.length * 5);
      // Using don't-cares never makes the result worse than ignoring them.
      const without = cost(minimizeMinterms(5, on), 5);
      expect(cost(cover, 5).terms).toBeLessThanOrEqual(without.terms);
    }
  });

  it('gives an equivalent, never-longer expression for random expressions', () => {
    const random = rng(42);
    for (let trial = 0; trial < 200; trial++) {
      const variables = 'ABCDEF'.slice(0, 2 + Math.floor(random() * 5));
      const expression = randomExpression(random, variables, 5);
      const result = minimize(expression);
      expect(equivalent(result, expression), `${expression} → ${result}`).toBe(true);
      const literals = (result.match(/[A-Z]/g) ?? []).length;
      const n = new Set(expression.match(/[A-Z]/g)).size;
      expect(literals).toBeLessThanOrEqual(minterms(expression).length * n);
      expect(minimize(result)).toBe(result);
    }
  });

  it('handles dense 8-variable functions quickly', () => {
    const random = rng(8);
    const on = [...Array(256).keys()].filter(() => random() < 0.5);
    const cover = minimizeMinterms(8, on);
    expectExactCover(8, cover, on);
  });
});
