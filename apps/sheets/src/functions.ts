/*
 * Google Sheets custom functions.
 *
 * This file is transpiled WITHOUT bundling so that every function below stays
 * a top-level global declaration, which Apps Script requires for custom
 * functions. Keep each one a one-line delegation to the bundled `SheetsLogic`
 * global (see adapter.ts) and give it a `@customfunction` JSDoc block, which
 * Sheets uses for autocomplete.
 */

/**
 * Generates the truth table of a Boolean expression: a header row, then one
 * row of 1/0 inputs and the output for every combination.
 *
 * Operators: NOT ! ~ ¬ or postfix ', AND & * · ∧ or juxtaposition (AB),
 * XOR ^ ⊕, OR | + ∨, and constants 0 and 1.
 *
 * @param {string} expression The expression, e.g. "A & B | !C" or "AB + C'".
 * @param {string} [varOrder] Optional variable order, e.g. "C,A,B". The first variable is the most significant bit. Defaults to alphabetical.
 * @return {Array<Array<string|number>>} The truth table.
 * @customfunction
 */
function TRUTHTABLE(expression: unknown, varOrder?: unknown): unknown[][] {
  return SheetsLogic.truthTable(expression, varOrder);
}

/**
 * Lists the minterms of a Boolean expression: the row numbers of its truth
 * table where the output is 1.
 *
 * @param {string} expression The expression, e.g. "A & B | !C".
 * @param {string} [varOrder] Optional variable order, e.g. "C,A,B". The first variable is the most significant bit. Defaults to alphabetical.
 * @return {Array<Array<number>>} The minterm indices as a single row.
 * @customfunction
 */
function MINTERMS(expression: unknown, varOrder?: unknown): unknown[][] {
  return SheetsLogic.minterms(expression, varOrder);
}

/**
 * Lists the maxterms of a Boolean expression: the row numbers of its truth
 * table where the output is 0.
 *
 * @param {string} expression The expression, e.g. "A & B | !C".
 * @param {string} [varOrder] Optional variable order, e.g. "C,A,B". The first variable is the most significant bit. Defaults to alphabetical.
 * @return {Array<Array<number>>} The maxterm indices as a single row.
 * @customfunction
 */
function MAXTERMS(expression: unknown, varOrder?: unknown): unknown[][] {
  return SheetsLogic.maxterms(expression, varOrder);
}

/**
 * Evaluates a Boolean expression for the given input values, which are
 * assigned to the variables in alphabetical order.
 *
 * @param {string} expression The expression, e.g. "A & !B".
 * @param {...any} values One value per variable: 1/0 or TRUE/FALSE. Cells or ranges.
 * @return {number} 1 or 0.
 * @customfunction
 */
function EVALLOGIC(expression: unknown, ...values: unknown[]): number {
  return SheetsLogic.evalLogic(expression, ...values);
}
