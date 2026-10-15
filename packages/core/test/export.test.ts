import { describe, expect, it } from 'vitest';
import { toSchemdraw } from '../src/export';

describe('toSchemdraw', () => {
  it.each([
    ['A', 'A'],
    ["A'", 'not A'],
    ["E'S'W", 'not E and not S and W'],
    ["AB + C'", '(A and B) or not C'],
    ['A + B + C', 'A or B or C'],
    ['A & (B & C)', 'A and B and C'],
    ['A ^ B | C', '(A xor B) or C'],
    ['A | B ^ C', 'A or (B xor C)'],
    ['A ^ B ^ C', 'A xor B xor C'],
    ["(AB)'", 'not (A and B)'],
    ["(A + B)'C", 'not (A or B) and C'],
    ['!!A & B', 'A and B'],
    ['!!!A', 'not A'],
    ['!!(A | B)', 'A or B'],
    ['!!(A & C) | B', '(A and C) or B'],
    ['!!!(A ^ B) & C', 'not (A xor B) and C'],
    ['A & 1 | 0', '(A and true) or false'],
    ['!1', 'not true'],
    ['En & Clk', 'En and Clk'],
  ])('%s → %s', (expression, expected) => {
    expect(toSchemdraw(expression)).toBe(expected);
  });

  it('uses the variable order to decide juxtaposition', () => {
    expect(toSchemdraw('En + X', 'En,X')).toBe('En or X');
    expect(toSchemdraw('En + X')).toBe('(E and n) or X');
  });

  it('rejects variable names that are Schemdraw keywords', () => {
    expect(() => toSchemdraw('not & A')).toThrow("Schemdraw can't use 'not' as a variable name");
  });
});
