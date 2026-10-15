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

/**
 * Simplifies a Boolean expression to a minimal sum of products, e.g.
 * "A & B | A & !B" → "A". Uses Quine–McCluskey with Petrick's method.
 *
 * @param {string} expression The expression, e.g. "AB + A'C + BC".
 * @param {string} [varOrder] Optional variable order, e.g. "C,A,B". Sets the order of literals in each term.
 * @return {string} The minimal sum of products, e.g. "AB + A'C".
 * @customfunction
 */
function MINIMIZE(expression: unknown, varOrder?: unknown): string {
  return SheetsLogic.minimize(expression, varOrder);
}

/**
 * Builds a minimal sum-of-products expression from a list of minterms, with
 * optional don't-cares, e.g. MINIMIZE_M(3, {1,3,5,7}) → "C".
 *
 * @param {number} numVars Number of variables, 0 to 10.
 * @param {number[]} minterms Row numbers where the output is 1: a range, an array like {1,3,5}, or text like "1,3,5".
 * @param {number[]} [dontCares] Optional row numbers whose output doesn't matter.
 * @param {string} [varNames] Optional variable names, e.g. "X,Y,Z". Defaults to A, B, C, … with A as the most significant bit.
 * @return {string} The minimal sum of products.
 * @customfunction
 */
function MINIMIZE_M(
  numVars: unknown,
  minterms: unknown,
  dontCares?: unknown,
  varNames?: unknown,
): string {
  return SheetsLogic.minimizeM(numVars, minterms, dontCares, varNames);
}

/**
 * Checks whether two Boolean expressions are logically equivalent, i.e. give
 * the same output for every input.
 *
 * @param {string} expression1 The first expression, e.g. "A ^ B".
 * @param {string} expression2 The second expression, e.g. "(A | B) & !(A & B)".
 * @return {boolean} TRUE if they are equivalent.
 * @customfunction
 */
function EQUIVALENT(expression1: unknown, expression2: unknown): boolean {
  return SheetsLogic.equivalent(expression1, expression2);
}

/**
 * Draws the Karnaugh map of a Boolean expression with 2 to 4 variables. Rows
 * and columns are in Gray-code order (00, 01, 11, 10), so neighbouring cells
 * differ in one variable.
 *
 * @param {string} expression The expression, e.g. "AB + C'".
 * @param {string} [varOrder] Optional variable order, e.g. "C,A,B". The first variables label the rows.
 * @return {Array<Array<string|number>>} The K-map with row and column labels.
 * @customfunction
 */
function KMAP(expression: unknown, varOrder?: unknown): unknown[][] {
  return SheetsLogic.kmap(expression, varOrder);
}

/**
 * Draws the Karnaugh map of a function given by its minterms, with optional
 * don't-cares shown as X.
 *
 * @param {number} numVars Number of variables, 2 to 4.
 * @param {number[]} minterms Row numbers where the output is 1: a range, an array like {1,3,5}, or text like "1,3,5".
 * @param {number[]} [dontCares] Optional row numbers whose output doesn't matter.
 * @param {string} [varNames] Optional variable names, e.g. "X,Y,Z". Defaults to A, B, C, … with A as the most significant bit.
 * @return {Array<Array<string|number>>} The K-map with row and column labels.
 * @customfunction
 */
function KMAP_M(
  numVars: unknown,
  minterms: unknown,
  dontCares?: unknown,
  varNames?: unknown,
): unknown[][] {
  return SheetsLogic.kmapM(numVars, minterms, dontCares, varNames);
}
