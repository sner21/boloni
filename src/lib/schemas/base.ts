/**
 * 定义多维表格、公式、AI 请求和响应的 Zod 校验 schema。
 */

import { z } from "zod";

// 字段类型 schema，与数据库枚举保持一致。
export const fieldTypeSchema = z.enum([
  "text",
  "number",
  "tag",
  "singleSelect",
  "multiSelect",
  "link",
  "formula",
  "aiText",
  "aiScore",
]);

// 公式函数 schema，限制公式只能调用安全白名单函数。
export const formulaOpSchema = z.enum(["SUM", "MULTIPLY", "DIVIDE", "SUBTRACT", "CEIL"]);

/** 公式 AST 节点类型。 */
export type FormulaNode =
  | { kind: "number"; value: number }
  | { kind: "field"; fieldId?: string; fieldName?: string }
  | { kind: "call"; op: z.infer<typeof formulaOpSchema>; args: FormulaNode[] };

// 递归公式 AST schema，支持数字、字段引用和函数调用。
export const formulaNodeSchema: z.ZodType<FormulaNode> = z.lazy(() =>
  z.union([
    z.object({ kind: z.literal("number"), value: z.number() }),
    z
      .object({
        kind: z.literal("field"),
        fieldId: z.string().uuid().optional(),
        fieldName: z.string().min(1).optional(),
      })
      .refine((value) => value.fieldId || value.fieldName, "fieldId or fieldName is required"),
    z.object({
      kind: z.literal("call"),
      op: formulaOpSchema,
      args: z.array(formulaNodeSchema).min(1),
    }),
  ]),
) as z.ZodType<FormulaNode>;

// 字段配置 schema，允许保留扩展配置。
export const fieldConfigSchema = z
  .object({
    options: z.array(z.string()).optional(),
    targetTableId: z.string().uuid().optional(),
    formula: formulaNodeSchema.optional(),
    prompt: z.string().optional(),
  })
  .passthrough();

// 创建表请求 schema。
export const createTableSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});

// 创建字段请求 schema。
export const createFieldSchema = z.object({
  name: z.string().min(1).max(80),
  type: fieldTypeSchema,
  config: fieldConfigSchema.default({}),
});

// 创建记录请求 schema。
export const createRecordSchema = z.object({
  cells: z.record(z.unknown()).default({}),
});

// 更新单元格请求 schema。
export const patchCellsSchema = z.object({
  cells: z.record(z.unknown()).default({}),
});

// AI 风险评分请求 schema。
export const riskReqSchema = z.object({
  recordId: z.string().uuid(),
});

// AI 订单摘要请求 schema。
export const summaryReqSchema = z.object({
  recordId: z.string().uuid(),
});

// AI 风险评分响应 schema。
export const riskResultSchema = z.object({
  score: z.number().min(0).max(100),
  level: z.enum(["低", "中", "高"]),
  reason: z.string().min(1),
});

/** 字段类型 TypeScript 类型。 */
export type FieldType = z.infer<typeof fieldTypeSchema>;
/** 字段配置 TypeScript 类型。 */
export type FieldConfig = z.infer<typeof fieldConfigSchema>;
/** 创建字段请求 TypeScript 类型。 */
export type CreateField = z.infer<typeof createFieldSchema>;
