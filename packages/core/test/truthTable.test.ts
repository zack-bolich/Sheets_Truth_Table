import { describe, expect, it } from 'vitest';
import {
  MAX_VARIABLES,
  compile,
  evalLogic,
  maxterms,
  minterms,
  toBit,
  truthTable,
  truthTableGrid,
} from '../src/truthTable';

describe('compile', () => {
  it('orders variables alphabetically by default', () => {
    expect(compile('C & A | B').variables).toEqual(['A', 'B', 'C']);
    expect(compile('X10 + X2').variables).toEqual(['X2', 'X10']);
  });

  it('uses an explicit variable order, string or array', () => {
    expect(compile('C & A', 'C,A').variables).toEqual(['C', 'A']);
    expect(compile('C & A', ['C', 'A']).variables).toEqual(['C', 'A']);
  });

  it('keeps extra variables from the order as inputs', () => {
    expect(compile('A', 'A,B').variables).toEqual(['A', 'B']);
  });

  it('falls back to alphabetical order when the order is blank', () => {
    expect(compile('C & A', '').variables).toEqual(['A', 'C']);
  });

  it('rejects an order that omits a variable', () => {
    expect(() => compile('A & B & C', 'C,A')).toThrow('Variable order is missing B');
    expect(() => compile('A & B & C', 'A')).toThrow('Variable order is missing B, C');
  });

  it('lets a multi-character order disable juxtaposition', () => {
    expect(compile('En + X', 'En,X').variables).toEqual(['En', 'X']);
    expect(compile('En + X').variables).toEqual(['E', 'n', 'X']);
  });

  it('keeps the source text', () => {
    expect(compile(' A ').source).toBe(' A ');
  });
});

describe('truthTable', () => {
  it('enumerates rows with the first variable as the MSB', () => {
    const table = truthTable('A & !B');
    expect(table.variables).toEqual(['A', 'B']);
    expect(table.rows).toEqual([
      { index: 0, inputs: [0, 0], output: 0 },
      { index: 1, inputs: [0, 1], output: 0 },
      { index: 2, inputs: [1, 0], output: 1 },
      { index: 3, inputs: [1, 1], output: 0 },
    ]);
  });

  it('produces a single row for a constant expression', () => {
    expect(truthTable('1 ^ 0').rows).toEqual([{ index: 0, inputs: [], output: 1 }]);
  });

  it('allows exactly MAX_VARIABLES variables', () => {
    const vars = 'ABCDEFGHIJKL';
    expect(vars).toHaveLength(MAX_VARIABLES);
    const table = truthTable(vars.split('').join(' | '));
    expect(table.rows).toHaveLength(4096);
    expect(table.rows[0]?.output).toBe(0);
    expect(table.rows[4095]?.inputs).toEqual(new Array<number>(12).fill(1));
  });

  it('rejects more than MAX_VARIABLES variables', () => {
    expect(() => truthTable('ABCDEFGHIJKLM')).toThrow('Too many variables (13); the limit is 12');
    expect(() => truthTable('A', 'A,B,C,D,E,F,G,H,I,J,K,L,M')).toThrow('Too many variables (13)');
  });
});

describe('truthTableGrid', () => {
  it('returns a header row then one row per combination', () => {
    expect(truthTableGrid('A & B | !C')).toEqual([
      ['A', 'B', 'C', 'A & B | !C'],
      [0, 0, 0, 1],
      [0, 0, 1, 0],
      [0, 1, 0, 1],
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [1, 0, 1, 0],
      [1, 1, 0, 1],
      [1, 1, 1, 1],
    ]);
  });

  it('trims the expression used as the output header', () => {
    expect(truthTableGrid('  A  ', 'A')[0]).toEqual(['A', 'A']);
  });

  it('honours a custom variable order', () => {
    expect(truthTableGrid('C & !A', 'C,A')).toEqual([
      ['C', 'A', 'C & !A'],
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 1],
      [1, 1, 0],
    ]);
  });
});

describe('minterms / maxterms', () => {
  it('lists the rows where the output is 1 / 0', () => {
    expect(minterms('A & B | !C')).toEqual([0, 2, 4, 6, 7]);
    expect(maxterms('A & B | !C')).toEqual([1, 3, 5]);
  });

  it('reads AB + C via juxtaposition', () => {
    expect(minterms('AB + C')).toEqual([1, 3, 5, 6, 7]);
    expect(maxterms('AB + C')).toEqual([0, 2, 4]);
  });

  it('depends on the variable order', () => {
    expect(minterms('A & !B', 'B,A')).toEqual([1]);
    expect(minterms('A & !B')).toEqual([2]);
  });

  it('handles tautologies and contradictions', () => {
    expect(minterms("A + A'")).toEqual([0, 1]);
    expect(maxterms("A + A'")).toEqual([]);
    expect(minterms('0')).toEqual([]);
    expect(maxterms('0')).toEqual([0]);
  });
});

describe('toBit', () => {
  it.each([
    [true, 1],
    [false, 0],
    [1, 1],
    [0, 0],
    ['1', 1],
    ['0', 0],
    [' true ', 1],
    ['FALSE', 0],
  ])('%j → %d', (value, bit) => {
    expect(toBit(value, 'A')).toBe(bit);
  });

  it('rejects empty values', () => {
    expect(() => toBit('', 'B')).toThrow('Value for B is empty');
    expect(() => toBit(null, 'B')).toThrow('Value for B is empty');
    expect(() => toBit(undefined, 'B')).toThrow('Value for B is empty');
  });

  it.each([2, -1, 0.5, 'yes', {}, Number.NaN])('rejects %j', (value) => {
    expect(() => toBit(value, 'B')).toThrow('Value for B must be 0, 1, TRUE or FALSE');
  });
});

describe('evalLogic', () => {
  it('binds values to variables in alphabetical order', () => {
    expect(evalLogic('B & !A', [0, 1])).toBe(1);
    expect(evalLogic('B & !A', [1, 1])).toBe(0);
    expect(evalLogic('A & !B', [true, 'FALSE'])).toBe(1);
  });

  it('evaluates constant expressions with no values', () => {
    expect(evalLogic('1 ^ 1', [])).toBe(0);
  });

  it('requires exactly one value per variable', () => {
    expect(() => evalLogic('A & B', [1])).toThrow('Expected 2 values (for A, B) but got 1');
    expect(() => evalLogic('A', [1, 0])).toThrow('Expected 1 value (for A) but got 2');
    expect(() => evalLogic('1', [1])).toThrow('Expected no values but got 1');
  });
});

describe('toBit error messages', () => {
  it('describes the offending value', () => {
    expect(() => toBit('yes', 'B')).toThrow('(got "yes")');
    expect(() => toBit(2, 'B')).toThrow('(got 2)');
    expect(() => toBit({}, 'B')).toThrow('(got object)');
  });
});
