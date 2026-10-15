import { describe, expect, it } from 'vitest';
import { equivalent } from '../src/truthTable';

describe('equivalent', () => {
  it.each([
    ['A ^ B', '(A|B)&!(A&B)'],
    ['AB', 'A & B'],
    ["(AB)'", "A' + B'"],
    ['A | B & C', '(A | B) & (A | C)'],
    ['A', 'A | A & B'],
    ['1', 'A | !A'],
    ['B', 'B & (A | !A)'],
  ])('%s ≡ %s', (a, b) => {
    expect(equivalent(a, b)).toBe(true);
    expect(equivalent(b, a)).toBe(true);
  });

  it.each([
    ['A ^ B', 'A | B'],
    ['A', 'B'],
    ['A & B', 'A'],
    ['0', '1'],
  ])('%s ≢ %s', (a, b) => {
    expect(equivalent(a, b)).toBe(false);
  });

  it('compares over the union of variables, capped at 12', () => {
    expect(() => equivalent('ABCDEFG', 'HIJKLM')).toThrow('Too many variables (13)');
  });

  it('propagates parse errors', () => {
    expect(() => equivalent('A &', 'A')).toThrow('Unexpected end of expression');
  });
});
