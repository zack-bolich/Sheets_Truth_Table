import { LogicError } from './errors';
import { type VarOrderInput, parseVarOrder } from './variables';

const DEFAULT_NAMES = 'ABCDEFGHIJKL';

/**
 * Validates minterm and don't-care lists for an n-variable function: whole
 * numbers in range, no index in both lists. Returns both sorted and deduplicated.
 */
export function validateTermLists(
  n: number,
  minterms: readonly number[],
  dontCares: readonly number[],
): { on: number[]; dc: number[] } {
  const on = validateIndices(n, minterms, 'Minterm');
  const dc = validateIndices(n, dontCares, "Don't-care");
  for (const m of on) {
    if (dc.includes(m)) throw new LogicError(`Minterm ${m} is also listed as a don't-care`);
  }
  return { on, dc };
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
 * Variable names for a function given by minterms: the names passed, which
 * must number exactly n, or A, B, C, … (A = most significant bit).
 */
export function resolveNames(n: number, names?: VarOrderInput): string[] {
  const given = names === undefined ? [] : parseVarOrder(names);
  if (given.length === 0) return DEFAULT_NAMES.slice(0, n).split('');
  if (given.length !== n) {
    throw new LogicError(`Expected ${n} variable names but got ${given.length}`);
  }
  return given;
}
