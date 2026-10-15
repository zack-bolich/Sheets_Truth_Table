import type { Implicant } from './implicant';

/**
 * Formats a sum of products in textbook notation, e.g. `AB + C'`. When every
 * variable is a single letter, literals are juxtaposed; otherwise they are
 * joined with `·` so the result parses back to the same function. (A result
 * with multi-letter names and no AND at all, like `En + X`, needs the variable
 * order to parse back, as the juxtaposition rule describes.)
 */
export function formatSop(implicants: readonly Implicant[], variables: readonly string[]): string {
  if (implicants.length === 0) return '0';
  const juxtapose = variables.every((name) => /^[A-Za-z]$/.test(name));
  return implicants.map((imp) => formatTerm(imp, variables, juxtapose)).join(' + ');
}

function formatTerm(imp: Implicant, variables: readonly string[], juxtapose: boolean): string {
  const n = variables.length;
  const literals: string[] = [];
  variables.forEach((name, k) => {
    const bit = 1 << (n - 1 - k);
    if (imp.mask & bit) return;
    literals.push(imp.value & bit ? name : `${name}'`);
  });
  return literals.length === 0 ? '1' : literals.join(juxtapose ? '' : '·');
}
