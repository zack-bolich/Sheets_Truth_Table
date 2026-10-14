import { describe, expect, it } from 'vitest';
import { LogicError } from '../src/errors';
import { splitIdentifiers, tokenize, useJuxtaposition } from '../src/lexer';

const kinds = (src: string) => tokenize(src).map((t) => t.kind);
const texts = (src: string) => tokenize(src).map((t) => t.text);

describe('tokenize', () => {
  it('ends every token stream with eof at the end of the source', () => {
    expect(tokenize('')).toEqual([{ kind: 'eof', text: '', pos: 0 }]);
    expect(tokenize('A ')[1]).toEqual({ kind: 'eof', text: '', pos: 2 });
  });

  it.each([
    ['!', 'not'],
    ['~', 'not'],
    ['¬', 'not'],
    ["'", 'postnot'],
    ['&', 'and'],
    ['*', 'and'],
    ['·', 'and'],
    ['∧', 'and'],
    ['^', 'xor'],
    ['⊕', 'xor'],
    ['|', 'or'],
    ['+', 'or'],
    ['∨', 'or'],
    ['(', 'lparen'],
    [')', 'rparen'],
  ])('recognises %s as %s', (symbol, kind) => {
    expect(kinds(symbol)).toEqual([kind, 'eof']);
  });

  it('reads maximal identifier runs including digits and underscores', () => {
    expect(texts('En X1 a_b _q AB')).toEqual(['En', 'X1', 'a_b', '_q', 'AB', '']);
    expect(kinds('En X1')).toEqual(['ident', 'ident', 'eof']);
  });

  it('reads 0 and 1 as constants', () => {
    expect(tokenize('0 1')).toEqual([
      { kind: 'const', text: '0', pos: 0 },
      { kind: 'const', text: '1', pos: 2 },
      { kind: 'eof', text: '', pos: 3 },
    ]);
  });

  it('records zero-based source positions and skips all whitespace', () => {
    expect(tokenize(' A\t&\nB').map((t) => t.pos)).toEqual([1, 3, 5, 6]);
  });

  it('rejects numbers other than 0 and 1', () => {
    expect(() => tokenize('A & 2')).toThrow(
      "Invalid constant '2'; only 0 and 1 are allowed at position 5",
    );
    expect(() => tokenize('10')).toThrow("Invalid constant '10'");
  });

  it('rejects unknown characters with a 1-based position', () => {
    expect(() => tokenize('A % B')).toThrow(LogicError);
    expect(() => tokenize('A % B')).toThrow("Unexpected character '%' at position 3");
  });

  it('reports astral characters whole rather than as half a surrogate pair', () => {
    expect(() => tokenize('A😀')).toThrow("Unexpected character '😀' at position 2");
  });

  it('exposes the error position on LogicError', () => {
    try {
      tokenize('AB $');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LogicError);
      expect((e as LogicError).position).toBe(3);
      expect((e as LogicError).name).toBe('LogicError');
    }
  });
});

describe('useJuxtaposition', () => {
  const on = (src: string, varOrder?: readonly string[]) =>
    useJuxtaposition(tokenize(src), varOrder);

  it('is on for plain letter runs with no explicit AND', () => {
    expect(on("AB + C'")).toBe(true);
    expect(on('ab + c')).toBe(true);
    expect(on('En + X')).toBe(true);
    expect(on('A ^ B')).toBe(true);
  });

  it.each(['&', '*', '·', '∧'])('is off when the expression uses explicit AND %s', (op) => {
    expect(on(`AB ${op} C`)).toBe(false);
  });

  it('is off when any identifier contains a digit or underscore', () => {
    expect(on('X1 + Y')).toBe(false);
    expect(on('AB + en_a')).toBe(false);
    expect(on('AB + _')).toBe(false);
  });

  it('is off when the variable order names a multi-character variable', () => {
    expect(on('En + X', ['En', 'X'])).toBe(false);
  });

  it('stays on when the variable order names only single letters', () => {
    expect(on('AB + C', ['C', 'B', 'A'])).toBe(true);
    expect(on('AB + C', [])).toBe(true);
  });
});

describe('splitIdentifiers', () => {
  it('splits multi-letter identifiers into single letters with their own positions', () => {
    expect(splitIdentifiers(tokenize("AB+C'"))).toEqual([
      { kind: 'ident', text: 'A', pos: 0 },
      { kind: 'ident', text: 'B', pos: 1 },
      { kind: 'or', text: '+', pos: 2 },
      { kind: 'ident', text: 'C', pos: 3 },
      { kind: 'postnot', text: "'", pos: 4 },
      { kind: 'eof', text: '', pos: 5 },
    ]);
  });
});
