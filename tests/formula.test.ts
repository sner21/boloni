/**
 * 验证公式 AST 计算器的核心函数行为。
 */

import { describe, expect, it } from "vitest";

import { evalFormula } from "@/lib/base/formula";
import type { FormulaNode } from "@/lib/schemas/base";

// 测试用字段值映射，模拟一条记录中的数字字段。
const values = new Map([
  ["qty", 3],
  ["price", 12],
  ["volume", 4.2],
  ["fee", 8],
]);

/**
 * 测试用字段读取器。
 *
 * @param field 字段引用信息。
 * @returns 对应字段数值；不存在时返回 null。
 */
function readField(field: { fieldId?: string; fieldName?: string }) {
  return values.get(field.fieldId ?? field.fieldName ?? "") ?? null;
}

describe("evalFormula", () => {
  it("计算字段乘法", () => {
    // 采购数量乘以单价的公式节点。
    const node: FormulaNode = {
      kind: "call",
      op: "MULTIPLY",
      args: [
        { kind: "field", fieldId: "qty" },
        { kind: "field", fieldId: "price" },
      ],
    };
    expect(evalFormula(node, readField)).toBe(36);
  });

  it("先向上取整体积再计算运费", () => {
    // 总运费公式节点，先 CEIL 体积再乘物流费单价。
    const node: FormulaNode = {
      kind: "call",
      op: "MULTIPLY",
      args: [
        { kind: "call", op: "CEIL", args: [{ kind: "field", fieldId: "volume" }] },
        { kind: "field", fieldId: "fee" },
      ],
    };
    expect(evalFormula(node, readField)).toBe(40);
  });

  it("除零时返回 null", () => {
    // 除零公式节点，用于验证安全兜底。
    const node: FormulaNode = {
      kind: "call",
      op: "DIVIDE",
      args: [{ kind: "number", value: 10 }, { kind: "number", value: 0 }],
    };
    expect(evalFormula(node, readField)).toBeNull();
  });
});
