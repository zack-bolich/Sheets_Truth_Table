import { LogicError } from './errors';
import { resolveNames, validateTermLists } from './terms';
import { truthTable } from './truthTable';
import type { VarOrderInput } from './variables';

/** A K-map cell: the output bit, or `'X'` for a don't-care. */
export type KMapCell = 0 | 1 | 'X';

const GRAY: Readonly<Record<number, readonly number[]>> = {
  1: [0, 1],
  2: [0, 1, 3, 2],
};

/**
 * Lays out a 2–4 variable function as a Karnaugh map. The first variables
 * label the rows and the rest the columns (2 vars: 1×1, 3 vars: 1×2, 4 vars:
 * 2×2), each in Gray-code order (00, 01, 11, 10) so that neighbouring cells,
 * including wrap-around, differ in one variable. Returns a grid ready to spill:
 * a corner label like `AB\CD`, the column codes, then one row per row code.
 * Codes are strings so leading zeros survive.
 */
export function kmapGrid(
  variables: readonly string[],
  cellAt: (minterm: number) => KMapCell,
): (string | number)[][] {
  const n = variables.length;
  if (n < 2 || n > 4) {
    throw new LogicError(`A K-map needs 2 to 4 variables (got ${n})`);
  }
  const rowBits = n === 4 ? 2 : 1;
  const colBits = n - rowBits;
  const rowVars = variables.slice(0, rowBits);
  const colVars = variables.slice(rowBits);
  const join = (names: readonly string[]) =>
    names.every((name) => name.length === 1) ? names.join('') : names.join(',');
  const code = (value: number, bits: number) => value.toString(2).padStart(bits, '0');

  const rows = GRAY[rowBits] as readonly number[];
  const cols = GRAY[colBits] as readonly number[];
  return [
    [`${join(rowVars)}\\${join(colVars)}`, ...cols.map((c) => code(c, colBits))],
    ...rows.map((r) => [code(r, rowBits), ...cols.map((c) => cellAt((r << colBits) | c))]),
  ];
}

/** The K-map of an expression with 2–4 variables, e.g. `kmap("AB + C'")`. */
export function kmap(source: string, varOrder?: VarOrderInput): (string | number)[][] {
  const { variables, rows } = truthTable(source, varOrder);
  if (variables.length < 2 || variables.length > 4) {
    throw new LogicError(
      `A K-map needs 2 to 4 variables (got ${variables.length}); pass a variable order to add more`,
    );
  }
  return kmapGrid(variables, (m) => (rows[m] as { output: 0 | 1 }).output);
}

/** The K-map of a function given by minterms and optional don't-cares (shown as X). */
export function kmapM(
  n: number,
  minterms: readonly number[],
  dontCares: readonly number[] = [],
  names?: VarOrderInput,
): (string | number)[][] {
  if (!Number.isInteger(n) || n < 2 || n > 4) {
    throw new LogicError('A K-map needs 2 to 4 variables');
  }
  const { on, dc } = validateTermLists(n, minterms, dontCares);
  return kmapGrid(resolveNames(n, names), (m) => (on.includes(m) ? 1 : dc.includes(m) ? 'X' : 0));
}
