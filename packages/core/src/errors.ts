/**
 * Thrown for any malformed expression or invalid argument. The message is
 * written for end users: Sheets shows it when hovering over `#ERROR!`.
 */
export class LogicError extends Error {
  override readonly name = 'LogicError';
  /** Zero-based offset into the expression, when the error has one. */
  readonly position: number | undefined;

  constructor(message: string, position?: number) {
    super(position === undefined ? message : `${message} at position ${position + 1}`);
    this.position = position;
  }
}
