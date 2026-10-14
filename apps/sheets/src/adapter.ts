/**
 * Sheets-facing implementations of the custom functions. This module is
 * bundled with the core into `build/core.js` as the `SheetsLogic` global; the
 * `@customfunction` stubs in `functions.ts` delegate to it.
 *
 * Its job is only to translate spreadsheet argument shapes (scalars, 2D range
 * arrays, empty cells) into core calls and core results into cell values.
 */
import * as core from '@sheets-logic/core';

/** A value returned to a cell. Sheets renders `''` as an empty cell. */
export type CellValue = string | number | boolean;

/** Flattens range arguments (`[[1, 3, 4]]` or `[[1], [3], [4]]`) to a flat list. */
export function flatten(arg: unknown): unknown[] {
  return Array.isArray(arg) ? arg.flatMap(flatten) : [arg];
}

function expressionArg(value: unknown): string {
  const cells = flatten(value);
  const [cell] = cells;
  if (cells.length !== 1) throw new core.LogicError('Expression must be a single cell or string');
  if (typeof cell === 'string') return cell;
  if (typeof cell === 'number') return String(cell);
  throw new core.LogicError('Expression must be text, e.g. "A & B | !C"');
}

function varOrderArg(value: unknown): string[] | undefined {
  const names = flatten(value)
    .filter((cell) => cell !== undefined && cell !== null && cell !== '')
    .map(String);
  return names.length === 0 ? undefined : core.parseVarOrder(names.join(','));
}

/** A single row, or a blank cell when there is nothing to list. */
function row(values: number[]): CellValue[][] {
  return [values.length === 0 ? [''] : values];
}

export function truthTable(expression: unknown, varOrder?: unknown): CellValue[][] {
  return core.truthTableGrid(expressionArg(expression), varOrderArg(varOrder));
}

export function minterms(expression: unknown, varOrder?: unknown): CellValue[][] {
  return row(core.minterms(expressionArg(expression), varOrderArg(varOrder)));
}

export function maxterms(expression: unknown, varOrder?: unknown): CellValue[][] {
  return row(core.maxterms(expressionArg(expression), varOrderArg(varOrder)));
}

export function evalLogic(expression: unknown, ...values: unknown[]): number {
  return core.evalLogic(expressionArg(expression), values.flatMap(flatten));
}
