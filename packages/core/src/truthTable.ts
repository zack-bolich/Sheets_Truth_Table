import { type Node, evaluate, variablesOf } from './ast';
import { LogicError } from './errors';
import { parse } from './parser';
import { type VarOrderInput, compareNames, parseVarOrder } from './variables';

export type Bit = 0 | 1;

/** Largest number of input variables a truth table may have (2^12 = 4096 rows). */
export const MAX_VARIABLES = 12;

export interface CompiledExpression {
  readonly source: string;
  readonly ast: Node;
  /** Input variables, most significant first. */
  readonly variables: readonly string[];
}

export interface TruthTableRow {
  /** Row number, which is also the minterm index. */
  readonly index: number;
  readonly inputs: readonly Bit[];
  readonly output: Bit;
}

export interface TruthTable {
  readonly expression: string;
  readonly variables: readonly string[];
  readonly rows: readonly TruthTableRow[];
}

/**
 * Parses an expression and fixes its variable order. Without an explicit
 * order, variables are sorted with {@link compareNames}. An explicit order must
 * name every variable in the expression and may add extra ones.
 */
export function compile(source: string, varOrder?: VarOrderInput): CompiledExpression {
  const order = varOrder === undefined ? [] : parseVarOrder(varOrder);
  const ast = parse(source, { varOrder: order });
  const used = [...variablesOf(ast)].sort(compareNames);
  if (order.length === 0) return { source, ast, variables: used };

  const missing = used.filter((name) => !order.includes(name));
  if (missing.length > 0) throw new LogicError(`Variable order is missing ${missing.join(', ')}`);
  return { source, ast, variables: order };
}

export function truthTable(source: string, varOrder?: VarOrderInput): TruthTable {
  const { ast, variables } = compile(source, varOrder);
  const n = variables.length;
  if (n > MAX_VARIABLES) {
    throw new LogicError(`Too many variables (${n}); the limit is ${MAX_VARIABLES}`);
  }
  const rows: TruthTableRow[] = [];
  for (let index = 0; index < 2 ** n; index++) {
    const inputs = variables.map((_, k) => ((index >> (n - 1 - k)) & 1) as Bit);
    const env: Record<string, boolean> = {};
    variables.forEach((name, k) => (env[name] = inputs[k] === 1));
    rows.push({ index, inputs, output: evaluate(ast, env) ? 1 : 0 });
  }
  return { expression: source, variables, rows };
}

/**
 * The truth table as a 2D array ready to spill into a spreadsheet: a header of
 * variable names plus the trimmed expression, then one row of bits per input
 * combination.
 */
export function truthTableGrid(source: string, varOrder?: VarOrderInput): (string | number)[][] {
  const { variables, rows } = truthTable(source, varOrder);
  return [[...variables, source.trim()], ...rows.map((r) => [...r.inputs, r.output])];
}

/** Indices of the rows where the expression is 1. */
export function minterms(source: string, varOrder?: VarOrderInput): number[] {
  return truthTable(source, varOrder)
    .rows.filter((r) => r.output === 1)
    .map((r) => r.index);
}

/** Indices of the rows where the expression is 0. */
export function maxterms(source: string, varOrder?: VarOrderInput): number[] {
  return truthTable(source, varOrder)
    .rows.filter((r) => r.output === 0)
    .map((r) => r.index);
}

/** Coerces a spreadsheet-style value (1/0, TRUE/FALSE, "1"/"true"...) to a bit. */
export function toBit(value: unknown, name: string): Bit {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 1 || value === 0) return value;
  if (typeof value === 'string') {
    const text = value.trim().toUpperCase();
    if (text === '1' || text === 'TRUE') return 1;
    if (text === '0' || text === 'FALSE') return 0;
    if (text === '') throw new LogicError(`Value for ${name} is empty`);
  }
  if (value === null || value === undefined) throw new LogicError(`Value for ${name} is empty`);
  const got =
    typeof value === 'string'
      ? `"${value}"`
      : typeof value === 'number'
        ? String(value)
        : typeof value;
  throw new LogicError(`Value for ${name} must be 0, 1, TRUE or FALSE (got ${got})`);
}

/** Evaluates an expression with values given positionally, in alphabetical variable order. */
export function evalLogic(source: string, values: readonly unknown[]): Bit {
  const { ast, variables } = compile(source);
  if (values.length !== variables.length) {
    const expected =
      variables.length === 0
        ? 'no values'
        : `${variables.length} value${variables.length === 1 ? '' : 's'} (for ${variables.join(', ')})`;
    throw new LogicError(`Expected ${expected} but got ${values.length}`);
  }
  const env: Record<string, boolean> = {};
  variables.forEach((name, k) => (env[name] = toBit(values[k], name) === 1));
  return evaluate(ast, env) ? 1 : 0;
}
