import { describe, expect, it } from 'vitest';
import { kmap, kmapGrid, kmapM } from '../src/kmap';

describe('kmap', () => {
  it('lays out 2 variables as a 2×2 map', () => {
    expect(kmap('A ^ B')).toEqual([
      ['A\\B', '0', '1'],
      ['0', 0, 1],
      ['1', 1, 0],
    ]);
  });

  it('lays out 3 variables with Gray-coded columns', () => {
    expect(kmap("AB + C'")).toEqual([
      ['A\\BC', '00', '01', '11', '10'],
      ['0', 1, 0, 0, 1],
      ['1', 1, 0, 1, 1],
    ]);
  });

  it('lays out 4 variables with Gray-coded rows and columns', () => {
    // Cell (row AB, col CD) holds minterm AB·4 + CD; mark only minterm 14 = 1110.
    expect(kmapM(4, [14])).toEqual([
      ['AB\\CD', '00', '01', '11', '10'],
      ['00', 0, 0, 0, 0],
      ['01', 0, 0, 0, 0],
      ['11', 0, 0, 0, 1],
      ['10', 0, 0, 0, 0],
    ]);
  });

  it('places every minterm in the cell whose labels spell its binary value', () => {
    for (let m = 0; m < 16; m++) {
      const grid = kmapM(4, [m]);
      const r = grid.findIndex((row) => row.slice(1).includes(1));
      const c = (grid[r] as (string | number)[]).indexOf(1);
      expect(`${String(grid[r]?.[0])}${String(grid[0]?.[c])}`).toBe(m.toString(2).padStart(4, '0'));
    }
  });

  it('honours the variable order and can add unused variables', () => {
    expect(kmap('A', 'B,A')).toEqual([
      ['B\\A', '0', '1'],
      ['0', 0, 1],
      ['1', 0, 1],
    ]);
  });

  it('labels multi-letter names with commas', () => {
    expect(kmap('En & Clk & X1', 'En,Clk,X1')[0]).toEqual(['En\\Clk,X1', '00', '01', '11', '10']);
  });

  it('rejects fewer than 2 or more than 4 variables', () => {
    expect(() => kmap('A')).toThrow(
      'A K-map needs 2 to 4 variables (got 1); pass a variable order',
    );
    expect(() => kmap('ABCDE')).toThrow('A K-map needs 2 to 4 variables (got 5)');
    expect(() => kmapGrid(['A'], () => 0)).toThrow('A K-map needs 2 to 4 variables (got 1)');
  });
});

describe('kmapM', () => {
  it("shows don't-cares as X", () => {
    expect(kmapM(3, [1, 3], [5], 'E,S,W')).toEqual([
      ['E\\SW', '00', '01', '11', '10'],
      ['0', 0, 1, 1, 0],
      ['1', 0, 'X', 0, 0],
    ]);
  });

  it('validates its arguments', () => {
    expect(() => kmapM(5, [])).toThrow('A K-map needs 2 to 4 variables');
    expect(() => kmapM(1, [])).toThrow('A K-map needs 2 to 4 variables');
    expect(() => kmapM(3, [8])).toThrow('Minterm 8 is out of range');
    expect(() => kmapM(3, [1], [1])).toThrow("Minterm 1 is also listed as a don't-care");
    expect(() => kmapM(3, [1], [], 'A,B')).toThrow('Expected 3 variable names but got 2');
  });
});
