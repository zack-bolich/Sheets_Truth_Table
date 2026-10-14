import { LogicError } from './errors';

export type TokenKind =
  'ident' | 'const' | 'not' | 'postnot' | 'and' | 'xor' | 'or' | 'lparen' | 'rparen' | 'eof';

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  /** Zero-based offset into the source string. */
  readonly pos: number;
}

const SYMBOLS: ReadonlyMap<string, TokenKind> = new Map<string, TokenKind>([
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
]);

const IDENT_START = /[A-Za-z_]/;
const IDENT_PART = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;
const SPACE = /\s/;

/**
 * Splits an expression into tokens. Identifiers are read as maximal runs of
 * `[A-Za-z_][A-Za-z0-9_]*`; whether a run like `AB` means `A AND B` is decided
 * later by {@link useJuxtaposition}.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source.charAt(i);
    if (SPACE.test(ch)) {
      i++;
      continue;
    }
    const symbol = SYMBOLS.get(ch);
    if (symbol !== undefined) {
      tokens.push({ kind: symbol, text: ch, pos: i });
      i++;
      continue;
    }
    const start = i;
    if (IDENT_START.test(ch)) {
      while (i < source.length && IDENT_PART.test(source.charAt(i))) i++;
      tokens.push({ kind: 'ident', text: source.slice(start, i), pos: start });
      continue;
    }
    if (DIGIT.test(ch)) {
      while (i < source.length && DIGIT.test(source.charAt(i))) i++;
      const text = source.slice(start, i);
      if (text !== '0' && text !== '1') {
        throw new LogicError(`Invalid constant '${text}'; only 0 and 1 are allowed`, start);
      }
      tokens.push({ kind: 'const', text, pos: start });
      continue;
    }
    const codePoint = source.codePointAt(i) ?? 0;
    throw new LogicError(`Unexpected character '${String.fromCodePoint(codePoint)}'`, i);
  }
  tokens.push({ kind: 'eof', text: '', pos: source.length });
  return tokens;
}

/**
 * Decides whether juxtaposed letters mean AND (`AB` = `A·B`). Juxtaposition is
 * on unless the expression uses an explicit AND operator, any identifier
 * contains a digit or underscore, or the variable order names a variable
 * longer than one character.
 */
export function useJuxtaposition(
  tokens: readonly Token[],
  varOrder: readonly string[] = [],
): boolean {
  if (tokens.some((t) => t.kind === 'and')) return false;
  if (tokens.some((t) => t.kind === 'ident' && /[0-9_]/.test(t.text))) return false;
  return varOrder.every((name) => name.length === 1);
}

/** Splits every multi-letter identifier into single-letter identifiers. */
export function splitIdentifiers(tokens: readonly Token[]): Token[] {
  return tokens.flatMap((t) =>
    t.kind === 'ident' && t.text.length > 1
      ? t.text.split('').map((ch, k) => ({ kind: 'ident' as const, text: ch, pos: t.pos + k }))
      : [t],
  );
}
