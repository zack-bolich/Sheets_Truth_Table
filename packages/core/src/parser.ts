import type { BinaryOp, Node } from './ast';
import { LogicError } from './errors';
import { type Token, splitIdentifiers, tokenize, useJuxtaposition } from './lexer';

export interface ParseOptions {
  /** Explicit variable order; a multi-character name disables juxtaposition. */
  readonly varOrder?: readonly string[];
}

/**
 * Parses a Boolean expression into an AST.
 *
 * Grammar, lowest precedence first (all binary operators are left-associative):
 *
 *     or      := xor (OR xor)*
 *     xor     := and (XOR and)*
 *     and     := unary ((AND | juxtaposition) unary)*
 *     unary   := NOT unary | postfix
 *     postfix := primary "'"*
 *     primary := IDENT | 0 | 1 | "(" or ")"
 */
export function parse(source: string, options: ParseOptions = {}): Node {
  const raw = tokenize(source);
  if (raw.length === 1) throw new LogicError('Expression is empty');
  const juxtaposition = useJuxtaposition(raw, options.varOrder);
  const tokens = juxtaposition ? splitIdentifiers(raw) : raw;
  return new Parser(tokens, juxtaposition).parseExpression();
}

const startsOperand = (t: Token): boolean =>
  t.kind === 'ident' || t.kind === 'const' || t.kind === 'not' || t.kind === 'lparen';

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: readonly Token[],
    private readonly juxtaposition: boolean,
  ) {}

  parseExpression(): Node {
    const node = this.parseOr();
    const next = this.peek();
    if (next.kind !== 'eof') throw unexpected(next);
    return node;
  }

  private peek(): Token {
    // The stream always ends with eof and `advance` never moves past it.
    return this.tokens[this.index] as Token;
  }

  private advance(): Token {
    const token = this.peek();
    if (token.kind !== 'eof') this.index++;
    return token;
  }

  private parseOr(): Node {
    return this.parseBinary('or', () => this.parseXor());
  }

  private parseXor(): Node {
    return this.parseBinary('xor', () => this.parseAnd());
  }

  private parseBinary(op: BinaryOp, operand: () => Node): Node {
    let left = operand();
    while (this.peek().kind === op) {
      this.advance();
      left = { type: op, left, right: operand() };
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseUnary();
    for (;;) {
      const next = this.peek();
      if (next.kind === 'and') {
        this.advance();
      } else if (startsOperand(next)) {
        if (!this.juxtaposition)
          throw new LogicError(`Missing operator before '${next.text}'`, next.pos);
      } else {
        return left;
      }
      left = { type: 'and', left, right: this.parseUnary() };
    }
  }

  private parseUnary(): Node {
    if (this.peek().kind === 'not') {
      this.advance();
      return { type: 'not', operand: this.parseUnary() };
    }
    let node = this.parsePrimary();
    while (this.peek().kind === 'postnot') {
      this.advance();
      node = { type: 'not', operand: node };
    }
    return node;
  }

  private parsePrimary(): Node {
    const token = this.advance();
    switch (token.kind) {
      case 'ident':
        return { type: 'var', name: token.text };
      case 'const':
        return { type: 'const', value: token.text === '1' };
      case 'lparen': {
        const inner = this.parseOr();
        const close = this.peek();
        if (close.kind === 'eof') throw new LogicError("Missing ')' to close '('", token.pos);
        if (close.kind !== 'rparen') throw unexpected(close);
        this.advance();
        return inner;
      }
      default:
        throw unexpected(token);
    }
  }
}

function unexpected(token: Token): LogicError {
  return token.kind === 'eof'
    ? new LogicError("Unexpected end of expression; expected a variable, 0, 1 or '('")
    : new LogicError(`Unexpected '${token.text}'`, token.pos);
}
