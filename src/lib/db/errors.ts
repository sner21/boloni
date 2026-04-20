/**
 * 定义业务 API 使用的可携带 HTTP 状态码的错误类型。
 */

export class AppError extends Error {
  /** HTTP 响应状态码。 */
  status: number;

  /**
   * 创建应用错误。
   *
   * @param message 面向 API 调用方的错误信息。
   * @param status HTTP 状态码，默认 400。
   */
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * 创建 404 错误。
 *
 * @param message 错误信息。
 * @returns AppError 实例。
 */
export function notFound(message = "资源不存在") {
  return new AppError(message, 404);
}

/**
 * 创建 400 错误。
 *
 * @param message 错误信息。
 * @returns AppError 实例。
 */
export function badRequest(message: string) {
  return new AppError(message, 400);
}
