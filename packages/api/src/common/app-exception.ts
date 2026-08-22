/**
 * 通用应用异常。
 * 业务信封失败请用 `ApiError`；传输层用 `TransportError`。
 */
export class AppException extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AppException';
    this.cause = cause;
  }

  override toString(): string {
    return `AppException: ${this.message}`;
  }
}
