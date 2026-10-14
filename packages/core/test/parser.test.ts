import { describe, expect, it } from 'vitest';
import { stringify } from '../src/ast';
import { LogicError } from '../src/errors';
import { parse } from '../src/parser';

const p = (src: string, varOrder?: readonly string[]) =>
  stringify(parse(src, varOrder === undefined ? {} : { varOrder }));

describe('parse: atoms', () => {
  it('parses variables and constants', () => {
    expect(p('A')).toBe('A');
    expect(p('En & X')).toBe('(En & X)');
    expect(p('1')).toBe('1');
    expect(p('0')).toBe('0');
  });

  it('ignores redundant parentheses', () => {
    expect(p('((A))')).toBe('A');
    expect(p('(A | B) & C')).toBe('((A | B) & C)');
  });
});

describe('parse: operator aliases', () => {
  it.each(['!A', '~A', '¬A', "A'"])('%s is NOT', (src) => {
    expect(p(src)).toBe('!A');
  });

  it.each(['A & B', 'A * B', 'A · B', 'A ∧ B', 'AB', 'A B'])('%s is AND', (src) => {
    expect(p(src)).toBe('(A & B)');
  });

  it.each(['A ^ B', 'A ⊕ B'])('%s is XOR', (src) => {
    expect(p(src)).toBe('(A ^ B)');
  });

  it.each(['A | B', 'A + B', 'A ∨ B'])('%s is OR', (src) => {
    expect(p(src)).toBe('(A | B)');
  });
});

describe('parse: precedence and associativity', () => {
  it('binds NOT tighter than AND, AND tighter than XOR, XOR tighter than OR', () => {
    expect(p('A & B | !C')).toBe('((A & B) | !C)');
    expect(p('A | B & C')).toBe('(A | (B & C))');
    expect(p('A ^ B & C')).toBe('(A ^ (B & C))');
    expect(p('A | B ^ C')).toBe('(A | (B ^ C))');
    expect(p('A ^ B | C ^ D')).toBe('((A ^ B) | (C ^ D))');
    expect(p('!A & B')).toBe('(!A & B)');
  });

  it('is left-associative for binary operators', () => {
    expect(p('A & B & C')).toBe('((A & B) & C)');
    expect(p('A ^ B ^ C')).toBe('((A ^ B) ^ C)');
    expect(p('A | B | C')).toBe('((A | B) | C)');
  });

  it('lets parentheses override precedence', () => {
    expect(p('A & (B | C)')).toBe('(A & (B | C))');
    expect(p('!(A & B)')).toBe('!(A & B)');
  });

  it('allows stacked prefix and postfix NOT', () => {
    expect(p('!!A')).toBe('!!A');
    expect(p("A''")).toBe('!!A');
    expect(p("!A'")).toBe('!!A');
  });

  it("applies postfix ' to the preceding operand only", () => {
    expect(p("AB'")).toBe('(A & !B)');
    expect(p("(AB)'")).toBe('!(A & B)');
    expect(p("A + B'")).toBe('(A | !B)');
    expect(p("(A + B)'C")).toBe('(!(A | B) & C)');
  });
});

describe('parse: juxtaposition', () => {
  it('reads letter runs as AND when no explicit AND is present', () => {
    expect(p("AB + C'")).toBe('((A & B) | !C)');
    expect(p('ABC')).toBe('((A & B) & C)');
    expect(p('ab + c')).toBe('((a & b) | c)');
    expect(p('En + X')).toBe('((E & n) | X)');
  });

  it('treats adjacent operands, groups, negations and constants as AND', () => {
    expect(p("A'B")).toBe('(!A & B)');
    expect(p('A(B + C)')).toBe('(A & (B | C))');
    expect(p('(A + B)(C + D)')).toBe('((A | B) & (C | D))');
    expect(p('A!B')).toBe('(A & !B)');
    expect(p('!AB')).toBe('(!A & B)');
    expect(p('A 1')).toBe('(A & 1)');
    expect(p('1A')).toBe('(1 & A)');
  });

  it('binds juxtaposition at AND precedence', () => {
    expect(p('AB ^ C')).toBe('((A & B) ^ C)');
    expect(p('A ^ BC')).toBe('(A ^ (B & C))');
    expect(p("A'B' + AB")).toBe('((!A & !B) | (A & B))');
  });

  it('keeps multi-letter identifiers when an explicit AND is present', () => {
    expect(p('AB & C')).toBe('(AB & C)');
    expect(p('En * X | Y')).toBe('((En & X) | Y)');
  });

  it('keeps identifiers whole when any of them contains a digit or underscore', () => {
    expect(p('X1 + Y')).toBe('(X1 | Y)');
    expect(p('AB + en_a')).toBe('(AB | en_a)');
  });

  it('keeps identifiers whole when the variable order has a multi-character name', () => {
    expect(p('En + X', ['En', 'X'])).toBe('(En | X)');
    expect(p('AB + C', ['A', 'B', 'C'])).toBe('((A & B) | C)');
  });

  it('rejects adjacent operands when juxtaposition is off', () => {
    expect(() => p('AB & C D')).toThrow("Missing operator before 'D' at position 8");
    expect(() => p('X1 Y')).toThrow("Missing operator before 'Y' at position 4");
    expect(() => p('X1 (Y)')).toThrow("Missing operator before '(' at position 4");
    expect(() => p('X1 !Y')).toThrow("Missing operator before '!' at position 4");
    expect(() => p('En X', ['En', 'X'])).toThrow("Missing operator before 'X'");
  });
});

describe('parse: malformed input', () => {
  it.each([
    ['', 'Expression is empty'],
    ['   ', 'Expression is empty'],
    ['A &', 'Unexpected end of expression'],
    ['A |', 'Unexpected end of expression'],
    ['!', 'Unexpected end of expression'],
    ['(', 'Unexpected end of expression'],
    ['& A', "Unexpected '&' at position 1"],
    ["'A", "Unexpected ''' at position 1"],
    ['A | | B', "Unexpected '|' at position 5"],
    ['()', "Unexpected ')' at position 2"],
    ['A)', "Unexpected ')' at position 2"],
    ['(A))', "Unexpected ')' at position 4"],
    ['(A', "Missing ')' to close '(' at position 1"],
    ['((A) | B', "Missing ')' to close '(' at position 1"],
  ])('%j → %s', (src, message) => {
    expect(() => parse(src)).toThrow(LogicError);
    expect(() => parse(src)).toThrow(message);
  });
});
