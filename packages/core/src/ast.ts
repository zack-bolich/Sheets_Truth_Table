import { LogicError } from './errors';

export type Node = VarNode | ConstNode | NotNode | BinaryNode;

export interface VarNode {
  readonly type: 'var';
  readonly name: string;
}

export interface ConstNode {
  readonly type: 'const';
  readonly value: boolean;
}

export interface NotNode {
  readonly type: 'not';
  readonly operand: Node;
}

export type BinaryOp = 'and' | 'xor' | 'or';

export interface BinaryNode {
  readonly type: BinaryOp;
  readonly left: Node;
  readonly right: Node;
}

/** Variable assignments, keyed by variable name. */
export type Env = Readonly<Record<string, boolean>>;

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

export function evaluate(node: Node, env: Env): boolean {
  switch (node.type) {
    case 'var': {
      if (!hasOwn(env, node.name)) throw new LogicError(`No value for variable '${node.name}'`);
      return env[node.name] === true;
    }
    case 'const':
      return node.value;
    case 'not':
      return !evaluate(node.operand, env);
    case 'and':
      return evaluate(node.left, env) && evaluate(node.right, env);
    case 'xor':
      return evaluate(node.left, env) !== evaluate(node.right, env);
    case 'or':
      return evaluate(node.left, env) || evaluate(node.right, env);
  }
}

/** Returns the set of variable names used in the expression. */
export function variablesOf(node: Node, into: Set<string> = new Set()): Set<string> {
  switch (node.type) {
    case 'var':
      into.add(node.name);
      break;
    case 'const':
      break;
    case 'not':
      variablesOf(node.operand, into);
      break;
    default:
      variablesOf(node.left, into);
      variablesOf(node.right, into);
  }
  return into;
}

const SYMBOL: Readonly<Record<BinaryOp, string>> = { and: '&', xor: '^', or: '|' };

/** Prints the tree in fully parenthesised programmer notation, e.g. `((A & B) | !C)`. */
export function stringify(node: Node): string {
  switch (node.type) {
    case 'var':
      return node.name;
    case 'const':
      return node.value ? '1' : '0';
    case 'not':
      return `!${stringify(node.operand)}`;
    default:
      return `(${stringify(node.left)} ${SYMBOL[node.type]} ${stringify(node.right)})`;
  }
}
