import type { BinaryOp, Node } from './ast';
import { LogicError } from './errors';
import { parse } from './parser';
import { parseVarOrder, type VarOrderInput } from './variables';

const SCHEMDRAW_KEYWORDS = new Set([
  'and',
  'or',
  'nand',
  'nor',
  'xor',
  'xnor',
  'not',
  'true',
  'false',
]);

/**
 * Converts an expression to the syntax of Schemdraw's `logicparse`
 * (`schemdraw.parsing.logicparse`), which draws it as a gate diagram, e.g.
 * `"E'S'W"` → `"not E and not S and W"`.
 *
 * - Chains of one operator are written flat (`a and b and c`) so Schemdraw
 *   draws a single multi-input gate.
 * - Operands that use a different operator are always parenthesised, because
 *   Schemdraw's precedence differs from ours (it ranks XOR below OR).
 * - Double negations cancel; Schemdraw's parser can't draw `not not a`.
 *   `not (a and b)` is drawn as a NAND gate.
 */
export function toSchemdraw(source: string, varOrder?: VarOrderInput): string {
  const order = varOrder === undefined ? [] : parseVarOrder(varOrder);
  return schemdraw(cancelDoubleNegation(parse(source, { varOrder: order })));
}

function schemdraw(node: Node): string {
  switch (node.type) {
    case 'var':
      if (SCHEMDRAW_KEYWORDS.has(node.name)) {
        throw new LogicError(`Schemdraw can't use '${node.name}' as a variable name`);
      }
      return node.name;
    case 'const':
      return node.value ? 'true' : 'false';
    case 'not': {
      const inner = schemdraw(node.operand);
      return node.operand.type === 'var' || node.operand.type === 'const'
        ? `not ${inner}`
        : `not (${inner})`;
    }
    default:
      return chain(node.type, node)
        .map((child) => {
          const text = schemdraw(child);
          return child.type === 'and' || child.type === 'or' || child.type === 'xor'
            ? `(${text})`
            : text;
        })
        .join(` ${node.type} `);
  }
}

/** Removes every `!!x`, so no NOT is directly applied to another NOT. */
function cancelDoubleNegation(node: Node): Node {
  switch (node.type) {
    case 'var':
    case 'const':
      return node;
    case 'not':
      return node.operand.type === 'not'
        ? cancelDoubleNegation(node.operand.operand)
        : { type: 'not', operand: cancelDoubleNegation(node.operand) };
    default:
      return {
        type: node.type,
        left: cancelDoubleNegation(node.left),
        right: cancelDoubleNegation(node.right),
      };
  }
}

/** The operands of a run of the same binary operator, e.g. `(a & b) & c` → [a, b, c]. */
function chain(op: BinaryOp, node: Node): Node[] {
  return node.type === op ? [...chain(op, node.left), ...chain(op, node.right)] : [node];
}
