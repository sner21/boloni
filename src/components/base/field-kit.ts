/**
 * 提供字段管理页使用的字段类型选项、公式模板和配置转换方法。
 */

import type { SelectOption } from "@/components/ui/select";

import type { FieldMeta, TableMeta } from "./types";

export type FormulaKind = "multiply" | "sum" | "divide" | "ceilMultiply";

export type FormulaPreset = {
  /** 模板值。 */
  value: FormulaKind;
  /** 模板标题。 */
  label: string;
  /** 模板说明。 */
  desc: string;
  /** 典型场景。 */
  scene: string;
  /** 输出说明。 */
  output: string;
  /** 公式示意。 */
  expression: string;
};

// 字段类型选项，统一供字段管理页使用。
export const fieldTypeOptions: SelectOption[] = [
  { value: "text", label: "文本", helper: "适合摘要、说明、备注" },
  { value: "number", label: "数字", helper: "适合数量、单价、库存" },
  { value: "tag", label: "标签", helper: "适合业务标签归类" },
  { value: "singleSelect", label: "单选", helper: "适合状态、等级" },
  { value: "multiSelect", label: "多选", helper: "适合组合属性" },
  { value: "link", label: "关联", helper: "连接另一张业务表记录" },
  { value: "formula", label: "公式", helper: "由安全 AST 计算结果" },
  { value: "aiText", label: "AI 文本", helper: "适合订单摘要等生成内容" },
  { value: "aiScore", label: "AI 评分", helper: "适合履约风险等评分结果" },
];

// 公式模板清单，用于字段页的高保真配置体验。
export const formulaPresets: FormulaPreset[] = [
  {
    value: "multiply",
    label: "金额计算",
    desc: "适合数量 × 单价、面积 × 单价等标准金额场景。",
    scene: "采购金额",
    output: "返回乘积结果",
    expression: "字段 A × 字段 B",
  },
  {
    value: "sum",
    label: "累计求和",
    desc: "适合基础费用、辅料费用、打样费用等直接累加场景。",
    scene: "费用汇总",
    output: "返回求和结果",
    expression: "字段 A + 字段 B",
  },
  {
    value: "divide",
    label: "比值换算",
    desc: "适合损耗率、单位成本、配比系数等换算场景。",
    scene: "成本换算",
    output: "返回除法结果",
    expression: "字段 A ÷ 字段 B",
  },
  {
    value: "ceilMultiply",
    label: "向上取整计费",
    desc: "适合体积、包数、板件数向上取整后再乘以费率。",
    scene: "运费规则",
    output: "先 CEIL，再计算乘积",
    expression: "CEIL(字段 A) × 字段 B",
  },
];

/**
 * 构建表选择器选项。
 *
 * @param tables 可选业务表列表。
 * @returns 供下拉框使用的选项数组。
 */
export function buildTableOptions(tables: TableMeta[]): SelectOption[] {
  return tables.map((table) => ({
    value: table.id,
    label: table.name,
    helper: table.slug,
  }));
}

/**
 * 构建字段选择器选项。
 *
 * @param fields 可选字段列表。
 * @returns 供下拉框使用的选项数组。
 */
export function buildFieldOptions(fields: FieldMeta[]): SelectOption[] {
  return fields.map((field) => ({
    value: field.name,
    label: field.name,
    helper: field.type,
  }));
}

/**
 * 根据公式模板生成安全 AST 配置。
 *
 * @param kind 模板类型。
 * @param left 左侧字段名称。
 * @param right 右侧字段名称。
 * @returns 公式字段的 config 对象。
 */
export function formulaConfig(kind: FormulaKind, left: string, right: string) {
  if (!left || !right) return {};
  // 左操作数字段节点。
  const leftNode = { kind: "field" as const, fieldName: left };
  // 右操作数字段节点。
  const rightNode = { kind: "field" as const, fieldName: right };

  if (kind === "sum") {
    return { formula: { kind: "call", op: "SUM", args: [leftNode, rightNode] } };
  }
  if (kind === "divide") {
    return { formula: { kind: "call", op: "DIVIDE", args: [leftNode, rightNode] } };
  }
  if (kind === "ceilMultiply") {
    return {
      formula: {
        kind: "call",
        op: "MULTIPLY",
        args: [{ kind: "call", op: "CEIL", args: [leftNode] }, rightNode],
      },
    };
  }
  return { formula: { kind: "call", op: "MULTIPLY", args: [leftNode, rightNode] } };
}

/**
 * 生成当前公式模板的人类可读预览。
 *
 * @param kind 模板类型。
 * @param left 左侧字段名称。
 * @param right 右侧字段名称。
 * @returns 公式展示文本。
 */
export function formulaLabel(kind: FormulaKind, left: string, right: string) {
  // 左侧展示名称，缺省时回落到字段 A。
  const a = left || "字段 A";
  // 右侧展示名称，缺省时回落到字段 B。
  const b = right || "字段 B";

  if (kind === "sum") return `${a} + ${b}`;
  if (kind === "divide") return `${a} ÷ ${b}`;
  if (kind === "ceilMultiply") return `CEIL(${a}) × ${b}`;
  return `${a} × ${b}`;
}

/**
 * 读取当前公式模板元数据。
 *
 * @param kind 模板类型。
 * @returns 模板对象。
 */
export function getFormulaPreset(kind: FormulaKind) {
  return formulaPresets.find((item) => item.value === kind) ?? formulaPresets[0];
}

/**
 * 把逗号分隔文本拆分为选项数组。
 *
 * @param value 用户输入的选项文本。
 * @returns 清理后的选项数组。
 */
export function splitOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
