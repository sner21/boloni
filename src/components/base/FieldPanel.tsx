/**
 * 提供字段创建面板，支持关联字段、选项字段和公式字段的可视化配置。
 */

"use client";

import { useMemo, useState } from "react";

import { createFieldSchema } from "@/lib/schemas/base";

import type { FieldMeta, TableMeta } from "./types";

type Props = {
  /** 当前选中表 ID。 */
  tableId?: string;
  /** 当前表的字段列表，用于公式字段选择依赖字段。 */
  fields: FieldMeta[];
  /** 全部表列表，用于关联字段选择目标表。 */
  tables: TableMeta[];
  /** 字段创建成功后的刷新回调。 */
  onCreated: () => void;
  /** 顶部状态文本更新函数。 */
  setStatus: (value: string) => void;
};

// 选项字段的默认选项文本。
const defaultOptions = "低, 中, 高";

/**
 * 渲染字段创建面板。
 * @param props 当前表、字段列表、表列表、刷新回调和状态更新函数。
 * @returns 字段创建表单组件。
 */
export function FieldPanel({ tableId, fields, tables, onCreated, setStatus }: Props) {
  // 新字段名称。
  const [name, setName] = useState("");
  // 新字段类型。
  const [type, setType] = useState("text");
  // 关联字段的目标表 ID。
  const [targetTableId, setTargetTableId] = useState("");
  // 选项字段的逗号分隔配置文本。
  const [optionsText, setOptionsText] = useState(defaultOptions);
  // 公式模板类型。
  const [formulaKind, setFormulaKind] = useState("multiply");
  // 公式左侧字段名。
  const [leftField, setLeftField] = useState("");
  // 公式右侧字段名。
  const [rightField, setRightField] = useState("");
  // 高级 JSON 配置文本，用于普通字段扩展。
  const [jsonText, setJsonText] = useState("{}");

  // 公式模板可选择的数字或公式字段。
  const numberFields = useMemo(
    () => fields.filter((field) => field.type === "number" || field.type === "formula"),
    [fields],
  );
  // 根据当前字段类型生成后端需要的字段 config。
  const config = useMemo(() => {
    if (type === "link") return { targetTableId };
    if (type === "formula") return formulaConfig(formulaKind, leftField, rightField);
    if (["tag", "singleSelect", "multiSelect"].includes(type)) {
      return { options: splitOptions(optionsText) };
    }
    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }, [formulaKind, jsonText, leftField, optionsText, rightField, targetTableId, type]);

  /**
   * 提交字段创建请求。
   */
  async function submit() {
    if (!tableId || !config) {
      setStatus("字段配置不完整。");
      return;
    }
    const parsed = createFieldSchema.safeParse({ name, type, config });
    if (!parsed.success) {
      setStatus("字段名称、类型或配置不合法。");
      return;
    }
    const res = await fetch(`/api/tables/${tableId}/fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      setStatus("字段创建失败。");
      return;
    }
    setName("");
    onCreated();
    setStatus("字段已创建。");
  }

  return (
    <section className="panel">
      <h3>字段</h3>
      <p>新增列，关联、选项和公式都可视化配置。</p>
      <div className="field-form">
        <input className="config-input" placeholder="字段名" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="config-input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="text">文本</option>
          <option value="number">数字</option>
          <option value="tag">字典标签</option>
          <option value="singleSelect">单选</option>
          <option value="multiSelect">多选</option>
          <option value="link">关联</option>
          <option value="formula">公式</option>
          <option value="aiText">AI 文本</option>
          <option value="aiScore">AI 评分</option>
        </select>
        <ConfigEditor
          fields={numberFields}
          formulaKind={formulaKind}
          jsonText={jsonText}
          leftField={leftField}
          optionsText={optionsText}
          rightField={rightField}
          setFormulaKind={setFormulaKind}
          setJsonText={setJsonText}
          setLeftField={setLeftField}
          setOptionsText={setOptionsText}
          setRightField={setRightField}
          setTargetTableId={setTargetTableId}
          tables={tables}
          targetTableId={targetTableId}
          type={type}
        />
        <button className="btn secondary" type="button" onClick={submit}>
          添加字段
        </button>
      </div>
    </section>
  );
}

/**
 * 根据字段类型渲染不同的配置编辑器。
 * @param props 字段类型、表列表、字段列表和各配置状态。
 * @returns 字段配置编辑区域。
 */
function ConfigEditor({
  type,
  tables,
  fields,
  targetTableId,
  optionsText,
  formulaKind,
  leftField,
  rightField,
  jsonText,
  setTargetTableId,
  setOptionsText,
  setFormulaKind,
  setLeftField,
  setRightField,
  setJsonText,
}: {
  type: string;
  tables: TableMeta[];
  fields: FieldMeta[];
  targetTableId: string;
  optionsText: string;
  formulaKind: string;
  leftField: string;
  rightField: string;
  jsonText: string;
  setTargetTableId: (value: string) => void;
  setOptionsText: (value: string) => void;
  setFormulaKind: (value: string) => void;
  setLeftField: (value: string) => void;
  setRightField: (value: string) => void;
  setJsonText: (value: string) => void;
}) {
  if (type === "link") {
    return (
      <select className="config-input" value={targetTableId} onChange={(e) => setTargetTableId(e.target.value)}>
        <option value="">目标表</option>
        {tables.map((table) => (
          <option value={table.id} key={table.id}>
            {table.name}
          </option>
        ))}
      </select>
    );
  }

  if (["tag", "singleSelect", "multiSelect"].includes(type)) {
    return (
      <div className="field-config">
        <input
          className="config-input"
          value={optionsText}
          onChange={(event) => setOptionsText(event.target.value)}
          placeholder="选项，用逗号分隔"
        />
        <div className="option-preview">
          {splitOptions(optionsText).map((option, index) => (
            <span className={`option-chip tone-${index % 6} active`} key={option}>
              {option}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (type === "formula") {
    return (
      <div className="field-config">
        <select className="config-input" value={formulaKind} onChange={(event) => setFormulaKind(event.target.value)}>
          <option value="multiply">字段 × 字段</option>
          <option value="sum">字段 + 字段</option>
          <option value="divide">字段 ÷ 字段</option>
          <option value="ceilMultiply">CEIL(字段) × 字段</option>
        </select>
        <FieldSelect fields={fields} label="左侧字段" value={leftField} onChange={setLeftField} />
        <FieldSelect fields={fields} label="右侧字段" value={rightField} onChange={setRightField} />
        <div className="formula-preview">{formulaLabel(formulaKind, leftField, rightField)}</div>
      </div>
    );
  }

  return (
    <textarea
      className="cell-area"
      value={jsonText}
      onChange={(event) => setJsonText(event.target.value)}
      placeholder='{"prompt":"可选配置"}'
    />
  );
}

/**
 * 渲染公式字段依赖字段选择器。
 * @param props 可选字段、提示文案、当前值和变更回调。
 * @returns 字段下拉选择器。
 */
function FieldSelect({
  fields,
  label,
  value,
  onChange,
}: {
  fields: FieldMeta[];
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select className="config-input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{label}</option>
      {fields.map((field) => (
        <option value={field.name} key={field.id}>
          {field.name}
        </option>
      ))}
    </select>
  );
}

/**
 * 根据公式模板生成安全公式 AST 配置。
 * @param kind 公式模板类型。
 * @param left 左侧字段名。
 * @param right 右侧字段名。
 * @returns 字段 config 对象。
 */
function formulaConfig(kind: string, left: string, right: string) {
  if (!left || !right) return {};
  // 左侧字段引用节点。
  const leftNode = { kind: "field" as const, fieldName: left };
  // 右侧字段引用节点。
  const rightNode = { kind: "field" as const, fieldName: right };
  if (kind === "sum") return { formula: { kind: "call", op: "SUM", args: [leftNode, rightNode] } };
  if (kind === "divide") return { formula: { kind: "call", op: "DIVIDE", args: [leftNode, rightNode] } };
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
 * 生成人类可读的公式预览。
 * @param kind 公式模板类型。
 * @param left 左侧字段名。
 * @param right 右侧字段名。
 * @returns 公式预览文本。
 */
function formulaLabel(kind: string, left: string, right: string) {
  // 预览中使用的左侧占位名。
  const a = left || "字段 A";
  // 预览中使用的右侧占位名。
  const b = right || "字段 B";
  if (kind === "sum") return `${a} + ${b}`;
  if (kind === "divide") return `${a} ÷ ${b}`;
  if (kind === "ceilMultiply") return `CEIL(${a}) × ${b}`;
  return `${a} × ${b}`;
}

/**
 * 把逗号分隔的选项文本转为数组。
 * @param value 用户输入的选项文本。
 * @returns 清理后的选项数组。
 */
function splitOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
