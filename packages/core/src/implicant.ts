/**
 * A product term over n variables in cube notation. Bit k of `mask` set means
 * variable k is absent (a "-" in Quine–McCluskey tables); otherwise bit k of
 * `value` gives its polarity. Bits are numbered like minterm indices, so the
 * first variable is the most significant bit. `value` is always 0 wherever
 * `mask` is 1.
 */
export interface Implicant {
  readonly value: number;
  readonly mask: number;
}

export function covers(imp: Implicant, minterm: number): boolean {
  return (minterm & ~imp.mask) === imp.value;
}

export function popcount(x: number): number {
  let count = 0;
  for (let v = x; v !== 0; v &= v - 1) count++;
  return count;
}

/** Number of literals in the product term. */
export function literalCount(imp: Implicant, n: number): number {
  return n - popcount(imp.mask);
}

/**
 * Textbook term order: compare variable by variable (MSB first), with a plain
 * literal before its complement before an absent variable. Gives
 * `AB + AC' + B'C` rather than an arbitrary order.
 */
export function compareImplicants(a: Implicant, b: Implicant, n: number): number {
  for (let k = n - 1; k >= 0; k--) {
    const diff = rank(a, 1 << k) - rank(b, 1 << k);
    if (diff !== 0) return diff;
  }
  return 0;
}

function rank(imp: Implicant, bit: number): number {
  if (imp.mask & bit) return 2;
  return imp.value & bit ? 0 : 1;
}
