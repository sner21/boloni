/**
 * 输出 Scalar 使用的 OpenAPI JSON 文档。
 */

import { ok } from "@/lib/api/http";
import { createOpenApi } from "@/lib/schemas/openapi";

/**
 * 生成并返回 OpenAPI 3.1 文档。
 *
 * @returns 返回 OpenAPI JSON 响应。
 */
export async function GET() {
  return ok(createOpenApi());
}
