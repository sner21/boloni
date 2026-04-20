/**
 * 验证核心 Zod schema 的输入校验行为。
 */

import { describe, expect, it } from "vitest";

import { createFieldSchema, riskResultSchema } from "@/lib/schemas/base";

describe("schemas", () => {
  it("接受合法关联字段配置", () => {
    // 合法关联字段配置，目标表 ID 必须是 uuid。
    const result = createFieldSchema.safeParse({
      name: "关联供应商",
      type: "link",
      config: { targetTableId: "7f289ca0-7375-41c3-9fae-b6c11014d97b" },
    });
    expect(result.success).toBe(true);
  });

  it("接受合法 AI 风险评分结果", () => {
    expect(riskResultSchema.parse({ score: 88, level: "高", reason: "延迟较多" }).score).toBe(88);
  });
});
