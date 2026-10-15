/** Small deterministic PRNG (mulberry32) so property tests are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random expression string over the given single-letter variables. */
export function randomExpression(random: () => number, variables: string, depth: number): string {
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(random() * xs.length)] as T;
  if (depth === 0 || random() < 0.25) {
    const leaf = random() < 0.05 ? pick(['0', '1']) : pick(variables.split(''));
    return random() < 0.3 ? `!${leaf}` : leaf;
  }
  if (random() < 0.15) return `!(${randomExpression(random, variables, depth - 1)})`;
  const op = pick(['&', '|', '^']);
  return `(${randomExpression(random, variables, depth - 1)} ${op} ${randomExpression(random, variables, depth - 1)})`;
}
