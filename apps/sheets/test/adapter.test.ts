import { describe, expect, it } from 'vitest';
import {
  equivalent,
  evalLogic,
  flatten,
  kmap,
  kmapM,
  maxterms,
  minimize,
  minimizeM,
  minterms,
  truthTable,
} from '../src/adapter';

describe('flatten', () => {
  it('accepts scalars, rows and columns', () => {
    expect(flatten(5)).toEqual([5]);
    expect(flatten([[1, 3, 4]])).toEqual([1, 3, 4]);
    expect(flatten([[1], [3], [4]])).toEqual([1, 3, 4]);
  });
});

describe('truthTable', () => {
  it('spills a header row and one row per combination', () => {
    expect(truthTable('A & !B')).toEqual([
      ['A', 'B', 'A & !B'],
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 1],
      [1, 1, 0],
    ]);
  });

  it('accepts the expression as a single-cell range', () => {
    expect(truthTable([['A']])).toEqual([
      ['A', 'A'],
      [0, 0],
      [1, 1],
    ]);
  });

  it('accepts a numeric constant expression', () => {
    expect(truthTable(1)).toEqual([['1'], [1]]);
  });

  it('accepts the variable order as a string or a range of names', () => {
    const expected = [
      ['C', 'A', 'C & !A'],
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 1],
      [1, 1, 0],
    ];
    expect(truthTable('C & !A', 'C,A')).toEqual(expected);
    expect(truthTable('C & !A', [['C', 'A']])).toEqual(expected);
    expect(truthTable('C & !A', [['C'], ['A'], ['']])).toEqual(expected);
  });

  it('treats an empty variable-order cell as omitted', () => {
    expect(truthTable('B & A', '')[0]).toEqual(['A', 'B', 'B & A']);
  });

  it('rejects non-text and multi-cell expressions', () => {
    expect(() => truthTable(true)).toThrow('Expression must be text');
    expect(() => truthTable('')).toThrow('Expression is empty');
    expect(() => truthTable([['A', 'B']])).toThrow('Expression must be a single cell');
  });
});

describe('minterms / maxterms', () => {
  it('return a single row', () => {
    expect(minterms('A & B | !C')).toEqual([[0, 2, 4, 6, 7]]);
    expect(maxterms('A & B | !C')).toEqual([[1, 3, 5]]);
    expect(minterms('A & !B', 'B,A')).toEqual([[1]]);
  });

  it('return a blank cell when there are none', () => {
    expect(minterms('0')).toEqual([['']]);
    expect(maxterms("A + A'")).toEqual([['']]);
  });
});

describe('evalLogic', () => {
  it('takes one value per variable, as cells or a range', () => {
    expect(evalLogic('A & !B', 1, 0)).toBe(1);
    expect(evalLogic('A & !B', true, true)).toBe(0);
    expect(evalLogic('A & !B', [[1, 0]])).toBe(1);
  });

  it('reports empty cells', () => {
    expect(() => evalLogic('A & !B', 1, '')).toThrow('Value for B is empty');
  });
});

describe('minimize', () => {
  it('returns the minimal sum of products', () => {
    expect(minimize("AB + A'C + BC")).toBe("AB + A'C");
    expect(minimize('A & !B', [['B', 'A']])).toBe("B'A");
  });
});

describe('minimizeM', () => {
  it('accepts minterms as an array literal, a column, or text', () => {
    expect(minimizeM(3, [[1, 3, 5, 7]])).toBe('C');
    expect(minimizeM(3, [[1], [3], [5], [7], ['']])).toBe('C');
    expect(minimizeM(3, '1, 3, 5, 7')).toBe('C');
    expect(minimizeM('3', '{1;3;5;7}')).toBe('C');
  });

  it("treats omitted or empty don't-cares as none", () => {
    expect(minimizeM(2, [[3]], undefined)).toBe('AB');
    expect(minimizeM(2, [[3]], '')).toBe('AB');
  });

  it("uses don't-cares and custom names", () => {
    expect(minimizeM(4, [[1, 3, 7, 11, 15]], [[0, 2, 5]])).toBe("A'B' + CD");
    expect(minimizeM(2, [[3]], '', 'X,Y')).toBe('XY');
  });

  it('rejects bad arguments', () => {
    expect(() => minimizeM('three', [[1]])).toThrow('Number of variables must be a whole number');
    expect(() => minimizeM([[2, 3]], [[1]])).toThrow('Number of variables must be a whole number');
    expect(() => minimizeM(3, 'a,b')).toThrow("'a' is not a number");
    expect(() => minimizeM(3, [[true]])).toThrow('Minterm lists must contain numbers');
  });
});

describe('equivalent', () => {
  it('returns a boolean', () => {
    expect(equivalent('A ^ B', '(A|B)&!(A&B)')).toBe(true);
    expect(equivalent('A', 'B')).toBe(false);
  });
});

describe('kmap / kmapM', () => {
  it('spill a labelled K-map', () => {
    expect(kmap("AB + C'")).toEqual([
      ['A\\BC', '00', '01', '11', '10'],
      ['0', 1, 0, 0, 1],
      ['1', 1, 0, 1, 1],
    ]);
    expect(kmapM(3, [[1], [3]], '5', 'E,S,W')[2]).toEqual(['1', 0, 'X', 0, 0]);
  });
});
