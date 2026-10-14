import { describe, expect, it } from 'vitest';
import { evaluate, stringify, variablesOf } from '../src/ast';
import { parse } from '../src/parser';

const ev = (src: string, env: Record<string, boolean>) => evaluate(parse(src), env);

describe('evaluate', () => {
  it('evaluates constants', () => {
    expect(ev('1', {})).toBe(true);
    expect(ev('0', {})).toBe(false);
  });

  it.each([
    [false, false, false, false, false],
    [false, true, false, true, true],
    [true, false, false, true, true],
    [true, true, true, true, false],
  ])('A=%s B=%s → AND %s, OR %s, XOR %s', (A, B, and, or, xor) => {
    expect(ev('A & B', { A, B })).toBe(and);
    expect(ev('A | B', { A, B })).toBe(or);
    expect(ev('A ^ B', { A, B })).toBe(xor);
    expect(ev('!A', { A, B })).toBe(!A);
  });

  it('throws when a variable has no value', () => {
    expect(() => ev('A & B', { A: true })).toThrow("No value for variable 'B'");
  });

  it('does not pick up inherited object properties as variable values', () => {
    expect(() => evaluate({ type: 'var', name: 'toString' }, {})).toThrow(
      "No value for variable 'toString'",
    );
  });
});

describe('variablesOf', () => {
  it('collects each variable once', () => {
    expect([...variablesOf(parse("AB + A'C ^ 1"))].sort()).toEqual(['A', 'B', 'C']);
    expect(variablesOf(parse('1 | 0')).size).toBe(0);
  });
});

describe('stringify', () => {
  it('prints fully parenthesised programmer notation', () => {
    expect(stringify(parse("(A + B)'C ^ 0"))).toBe('((!(A | B) & C) ^ 0)');
  });
});
