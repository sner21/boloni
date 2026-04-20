/**
 * 渲染 Scalar API 参考文档页面。
 */

import { ApiReference } from "@scalar/nextjs-api-reference";

// Scalar 的 Next.js Route Handler，读取本项目生成的 OpenAPI 文档。
export const GET = ApiReference({
  url: "/openapi.json",
});
