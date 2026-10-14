import { LogicError } from './errors';

/** A variable order as a comma/space separated string (`"C, A, B"`) or a list of names. */
export type VarOrderInput = string | readonly string[];

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const CHUNK = /\d+|\D+/g;

/**
 * Natural, case-insensitive ordering for variable names: `A < b < C`,
 * `X2 < X10`. Names equal ignoring case fall back to code-unit order, so
 * `A` sorts before `a`.
 */
export function compareNames(a: string, b: string): number {
  const ca = a.match(CHUNK) ?? [];
  const cb = b.match(CHUNK) ?? [];
  for (let i = 0; i < Math.min(ca.length, cb.length); i++) {
    const x = ca[i] as string;
    const y = cb[i] as string;
    const bothNumeric = /^\d/.test(x) && /^\d/.test(y);
    const diff = bothNumeric
      ? Number(x) - Number(y)
      : compareText(x.toLowerCase(), y.toLowerCase());
    if (diff !== 0) return diff;
  }
  return ca.length - cb.length || compareText(a, b);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Normalises a variable order into a validated list of names; blank input gives `[]`. */
export function parseVarOrder(input: VarOrderInput): string[] {
  const names = (
    typeof input === 'string' ? input.split(/[\s,]+/) : input.map((n) => n.trim())
  ).filter((n) => n !== '');
  const seen = new Set<string>();
  for (const name of names) {
    if (!IDENTIFIER.test(name))
      throw new LogicError(`Invalid variable name '${name}' in variable order`);
    if (seen.has(name)) throw new LogicError(`Variable '${name}' appears twice in variable order`);
    seen.add(name);
  }
  return names;
}
