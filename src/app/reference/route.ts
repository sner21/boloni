/**
 * 渲染 Scalar API 参考文档页面。
 */

import { ApiReference } from "@scalar/nextjs-api-reference";

import { createOpenApi } from "@/lib/schemas/openapi";

// Scalar 的 Next.js Route Handler，直接内嵌 OpenAPI 文档，避免相对 URL 加载为空。
export const GET = ApiReference({
  content: createOpenApi(),
});
