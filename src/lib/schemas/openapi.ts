/**
 * 用 Zod schema 注册并生成博洛尼协同系统 OpenAPI 文档，供 Scalar 展示。
 */

import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
  createFieldSchema,
  createRecordSchema,
  createTableSchema,
  patchCellsSchema,
  riskReqSchema,
  summaryReqSchema,
} from "./base";

extendZodWithOpenApi(z);

// OpenAPI 注册表，集中登记 schema 和 route。
const registry = new OpenAPIRegistry();

// 标准错误响应 schema。
const errorSchema = registry.register(
  "Error",
  z.object({ error: z.string(), details: z.unknown().optional() }),
);

// 表元数据响应 schema。
const tableSchema = registry.register(
  "Table",
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }),
);

registry.register("CreateTable", createTableSchema);
registry.register("CreateField", createFieldSchema);
registry.register("CreateRecord", createRecordSchema);
registry.register("PatchCells", patchCellsSchema);
registry.register("RiskRequest", riskReqSchema);
registry.register("SummaryRequest", summaryReqSchema);

/**
 * 创建 JSON 请求体定义。
 *
 * @param schema 请求体 Zod schema。
 * @returns OpenAPI request body content 定义。
 */
function jsonBody(schema: z.ZodTypeAny) {
  return { content: { "application/json": { schema } } };
}

/**
 * 创建 JSON 响应定义。
 *
 * @param schema 响应体 Zod schema。
 * @param description 响应说明。
 * @returns OpenAPI response content 定义。
 */
function jsonResponse(schema: z.ZodTypeAny, description = "OK") {
  return { description, content: { "application/json": { schema } } };
}

registry.registerPath({
  method: "post",
  path: "/api/tables",
  request: { body: jsonBody(createTableSchema) },
  responses: { 200: jsonResponse(tableSchema), 400: jsonResponse(errorSchema, "请求错误") },
});

registry.registerPath({
  method: "get",
  path: "/api/tables",
  responses: { 200: jsonResponse(z.array(tableSchema)) },
});

registry.registerPath({
  method: "post",
  path: "/api/tables/{tableId}/fields",
  request: {
    params: z.object({ tableId: z.string().uuid() }),
    body: jsonBody(createFieldSchema),
  },
  responses: { 200: jsonResponse(z.unknown()), 400: jsonResponse(errorSchema, "请求错误") },
});

registry.registerPath({
  method: "post",
  path: "/api/tables/{tableId}/records",
  request: {
    params: z.object({ tableId: z.string().uuid() }),
    body: jsonBody(createRecordSchema),
  },
  responses: { 200: jsonResponse(z.unknown()), 400: jsonResponse(errorSchema, "请求错误") },
});

registry.registerPath({
  method: "get",
  path: "/api/tables/{tableId}/records",
  request: { params: z.object({ tableId: z.string().uuid() }) },
  responses: { 200: jsonResponse(z.unknown()), 404: jsonResponse(errorSchema, "资源不存在") },
});

registry.registerPath({
  method: "patch",
  path: "/api/records/{recordId}/cells",
  request: {
    params: z.object({ recordId: z.string().uuid() }),
    body: jsonBody(patchCellsSchema),
  },
  responses: { 200: jsonResponse(z.unknown()), 400: jsonResponse(errorSchema, "请求错误") },
});

registry.registerPath({
  method: "post",
  path: "/api/seed/supply-chain",
  responses: { 200: jsonResponse(z.unknown()) },
});

registry.registerPath({
  method: "post",
  path: "/api/ai/risk-score",
  request: { body: jsonBody(riskReqSchema) },
  responses: { 200: jsonResponse(z.unknown()), 400: jsonResponse(errorSchema, "请求错误") },
});

registry.registerPath({
  method: "post",
  path: "/api/ai/order-summary",
  request: { body: jsonBody(summaryReqSchema) },
  responses: { 200: jsonResponse(z.unknown()), 400: jsonResponse(errorSchema, "请求错误") },
});

registry.registerPath({
  method: "post",
  path: "/api/automation/inventory-warning",
  responses: { 200: jsonResponse(z.unknown()) },
});

registry.registerPath({
  method: "get",
  path: "/api/dashboard/supply-chain",
  responses: { 200: jsonResponse(z.unknown()) },
});

/**
 * 生成 OpenAPI 3.1 文档。
 *
 * @returns OpenAPI 文档对象。
 */
export function createOpenApi() {
  // OpenAPI 文档生成器。
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Boloni Base API",
      version: "0.1.0",
      description: "博洛尼全屋定制多维表格引擎与供应链协同 API。",
    },
  });
}
