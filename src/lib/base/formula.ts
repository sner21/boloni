/**
 * 安全计算公式字段的 AST，避免使用 eval 执行任意代码。
 */

import type { FormulaNode } from "@/lib/schemas/base";

type Reader = (field: { fieldId?: string; fieldName?: string }) => number | null;

/**
 * 把任意输入规范为可计算数字。
 *
 * @param value 原始输入值。
 * @returns 有效数字；无法转换时返回 null。
 */
function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * 递归计算公式 AST。
 *
 * @param node 当前公式节点。
 * @param readField 外部字段读取函数，用于读取当前记录中的字段值。
 * @returns 公式计算结果；缺失值、非法值或除零时返回 null。
 */
export function evalFormula(node: FormulaNode, readField: Reader): number | null {
  if (node.kind === "number") return node.value;
  if (node.kind === "field") return readField(node);

  const values = node.args.map((arg) => evalFormula(arg, readField));

  if (node.op === "SUM") {
    return values.reduce<number>((sum, value) => sum + (asNumber(value) ?? 0), 0);
  }

  if (node.op === "MULTIPLY") {
    return values.reduce<number>((product, value) => product * (asNumber(value) ?? 0), 1);
  }

  if (node.op === "DIVIDE") {
    const [left, right] = values.map(asNumber);
    if (left === null || right === null || right === 0) return null;
    return left / right;
  }

  if (node.op === "SUBTRACT") {
    const [first, ...rest] = values.map((value) => asNumber(value) ?? 0);
    return rest.reduce((result, value) => result - value, first ?? 0);
  }

  const first = asNumber(values[0]);
  return first === null ? null : Math.ceil(first);
}
