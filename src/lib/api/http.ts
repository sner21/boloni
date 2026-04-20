/**
 * 封装 API Route 的 JSON 读取、成功响应和错误响应工具。
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/db/errors";

/**
 * 读取并校验 JSON 请求体。
 *
 * @param request HTTP 请求对象。
 * @param schema 用于校验请求体的 Zod schema。
 * @returns 返回校验后的请求体数据；校验失败时抛出 AppError。
 */
export async function readJson<T>(request: Request, schema: z.ZodType<T>) {
  // 原始请求体，JSON 解析失败时按空对象处理。
  const body = await request.json().catch(() => ({}));
  // Zod 校验结果。
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("请求体不合法", 400);
  }
  return parsed.data;
}

/**
 * 返回标准 JSON 成功响应。
 *
 * @param data 响应数据。
 * @returns Next.js JSON 响应。
 */
export function ok<T>(data: T) {
  return NextResponse.json(data);
}

/**
 * 把异常转换成标准 JSON 错误响应。
 *
 * @param error 捕获到的异常。
 * @returns 带 HTTP 状态码的 JSON 错误响应。
 */
export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
}
