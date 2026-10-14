import { describe, expect, it } from 'vitest';
import { compareNames, parseVarOrder } from '../src/variables';

describe('compareNames', () => {
  const sorted = (names: string[]) => [...names].sort(compareNames);

  it('sorts alphabetically, ignoring case', () => {
    expect(sorted(['C', 'b', 'A'])).toEqual(['A', 'b', 'C']);
    expect(sorted(['En', 'B', 'X'])).toEqual(['B', 'En', 'X']);
  });

  it('sorts numeric suffixes numerically', () => {
    expect(sorted(['X10', 'X2', 'X1'])).toEqual(['X1', 'X2', 'X10']);
    expect(sorted(['X01', 'X1'])).toEqual(['X01', 'X1']);
  });

  it('puts a prefix before its extensions', () => {
    expect(sorted(['AB', 'A'])).toEqual(['A', 'AB']);
    expect(sorted(['A1', 'A'])).toEqual(['A', 'A1']);
  });

  it('breaks case-only ties deterministically, uppercase first', () => {
    expect(sorted(['a', 'A'])).toEqual(['A', 'a']);
    expect(compareNames('A', 'A')).toBe(0);
  });
});

describe('parseVarOrder', () => {
  it('splits on commas and whitespace', () => {
    expect(parseVarOrder('A,C')).toEqual(['A', 'C']);
    expect(parseVarOrder(' C , A  B ')).toEqual(['C', 'A', 'B']);
  });

  it('accepts an array of names', () => {
    expect(parseVarOrder(['En', ' X '])).toEqual(['En', 'X']);
  });

  it('returns an empty list for blank input', () => {
    expect(parseVarOrder('')).toEqual([]);
    expect(parseVarOrder(' , ')).toEqual([]);
    expect(parseVarOrder([])).toEqual([]);
  });

  it('rejects invalid names', () => {
    expect(() => parseVarOrder('A,1B')).toThrow("Invalid variable name '1B' in variable order");
    expect(() => parseVarOrder('A,B-C')).toThrow("Invalid variable name 'B-C'");
  });

  it('rejects duplicates', () => {
    expect(() => parseVarOrder('A,B,A')).toThrow("Variable 'A' appears twice in variable order");
  });
});
