export { LogicError } from './errors';
export { type Token, type TokenKind, tokenize } from './lexer';
export { type ParseOptions, parse } from './parser';
export {
  type BinaryNode,
  type BinaryOp,
  type ConstNode,
  type Env,
  type Node,
  type NotNode,
  type VarNode,
  evaluate,
  stringify,
  variablesOf,
} from './ast';
export { type VarOrderInput, compareNames, parseVarOrder } from './variables';
export {
  type Bit,
  type CompiledExpression,
  type TruthTable,
  type TruthTableRow,
  MAX_VARIABLES,
  compile,
  evalLogic,
  maxterms,
  minterms,
  toBit,
  truthTable,
  truthTableGrid,
} from './truthTable';
