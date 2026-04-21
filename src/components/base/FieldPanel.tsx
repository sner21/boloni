/**
 * 渲染字段管理页面，支持关联、选项和公式字段的组件化配置。
 */

"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createFieldSchema } from "@/lib/schemas/base";

import { buildFieldOptions, buildTableOptions, fieldTypeOptions, formulaConfig, formulaLabel, formulaPresets, getFormulaPreset, splitOptions } from "./field-kit";
import type { FieldMeta, TableMeta } from "./types";

type Props = {
  /** 当前选中的业务表。 */
  table?: TableMeta;
  /** 当前表字段列表。 */
  fields: FieldMeta[];
  /** 全部业务表列表。 */
  tables: TableMeta[];
  /** 字段创建完成后的刷新回调。 */
  onCreated: () => void;
  /** 页面状态提示更新函数。 */
  setStatus: (value: string) => void;
};

// 选项字段的默认演示文本。
const defaultOptions = "基础款, 进阶款, 旗舰款";

/**
 * 渲染字段管理工作台。
 *
 * @param props 当前表、字段、业务表列表和外层回调。
 */
export function FieldPanel({ fields, onCreated, setStatus, table, tables }: Props) {
  // 新字段名称。
  const [name, setName] = useState("");
  // 新字段类型。
  const [type, setType] = useState("text");
  // 关联字段的目标表 ID。
  const [targetTableId, setTargetTableId] = useState("");
  // 选项字段的逗号分隔配置文本。
  const [optionsText, setOptionsText] = useState(defaultOptions);
  // 当前公式模板。
  const [formulaKind, setFormulaKind] = useState<(typeof formulaPresets)[number]["value"]>("multiply");
  // 公式左侧字段。
  const [leftField, setLeftField] = useState("");
  // 公式右侧字段。
  const [rightField, setRightField] = useState("");
  // 扩展 JSON 配置文本。
  const [jsonText, setJsonText] = useState("{}");
  // 当前提交状态，避免重复点击。
  const [saving, setSaving] = useState(false);

  // 可用于公式的数字或公式字段。
  const calcFields = useMemo(
    () => fields.filter((field) => field.type === "number" || field.type === "formula"),
    [fields],
  );
  // 公式字段可选项。
  const fieldOptions = useMemo(() => buildFieldOptions(calcFields), [calcFields]);
  // 关联字段可选目标表。
  const tableOptions = useMemo(() => buildTableOptions(tables), [tables]);
  // 当前公式模板元信息。
  const activeFormula = useMemo(() => getFormulaPreset(formulaKind), [formulaKind]);
  // 当前字段配置对象。
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
  // 当前字段配置是否满足提交要求。
  const canSubmit = useMemo(() => {
    if (!table?.id || !name.trim() || !config) return false;
    if (type === "link") return Boolean(targetTableId);
    if (type === "formula") return Boolean(leftField && rightField);
    if (["tag", "singleSelect", "multiSelect"].includes(type)) return splitOptions(optionsText).length > 0;
    return true;
  }, [config, leftField, name, optionsText, rightField, table?.id, targetTableId, type]);
  // 右侧预览 JSON。
  const previewText = useMemo(() => JSON.stringify({ name, type, config }, null, 2), [config, name, type]);
  // 页面顶部的统计条目。
  const statItems = useMemo(
    () => [
      { label: "当前业务表", value: table?.name ?? "未选择" },
      { label: "字段总数", value: String(fields.length) },
      { label: "关联字段", value: String(fields.filter((field) => field.type === "link").length) },
      { label: "公式字段", value: String(fields.filter((field) => field.type === "formula").length) },
    ],
    [fields, table?.name],
  );

  /**
   * 重置当前表单。
   */
  function resetForm() {
    setName("");
    setType("text");
    setTargetTableId("");
    setOptionsText(defaultOptions);
    setFormulaKind("multiply");
    setLeftField("");
    setRightField("");
    setJsonText("{}");
  }

  /**
   * 提交字段创建请求。
   */
  async function submit() {
    if (!table?.id || !config) {
      setStatus("字段配置还不完整，先补齐字段信息。");
      return;
    }

    const parsed = createFieldSchema.safeParse({ config, name, type });
    if (!parsed.success) {
      setStatus("字段名称、类型或配置不合法。");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tables/${table.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setStatus("字段创建失败，请检查字段配置后重试。");
        return;
      }
      resetForm();
      await onCreated();
      setStatus("字段已创建。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="field-page">
      <div className="field-shell">
        <div className="field-topbar">
          {statItems.map((item) => (
            <div className="field-stat" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="field-layout">
          <Card className="field-main-card">
            <CardHeader>
              <CardTitle>字段配置</CardTitle>
              <CardDescription>字段创建是题目明确要求的一部分，关联和公式字段都在这里完成配置。</CardDescription>
            </CardHeader>
            <CardContent className="field-main-body">
              <section className="field-section">
                <div className="field-section-head">
                  <h4>基础定义</h4>
                  <p>先定义字段名称和字段类型，再进入对应的配置面板。</p>
                </div>
                <div className="field-form-grid">
                  <div className="field-item">
                    <Label htmlFor="field-name">字段名称</Label>
                    <Input id="field-name" placeholder="例如：订单摘要" value={name} onChange={(event) => setName(event.target.value)} />
                  </div>
                  <div className="field-item">
                    <Label>字段类型</Label>
                    <Select onValueChange={setType} options={fieldTypeOptions} placeholder="请选择字段类型" value={type} />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="field-section">
                <div className="field-section-head">
                  <h4>类型配置</h4>
                  <p>根据字段类型切换不同的配置面板，所有控件统一使用 shadcn 风格组件。</p>
                </div>
                <ConfigEditor
                  fieldOptions={fieldOptions}
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
                  tableOptions={tableOptions}
                  targetTableId={targetTableId}
                  type={type}
                />
              </section>

              <Separator />

              <section className="field-actions">
                <Button disabled={saving || !canSubmit} onClick={submit} type="button">
                  {saving ? "创建中..." : "添加字段"}
                </Button>
                <Button disabled={saving} onClick={resetForm} type="button" variant="outline">
                  重置配置
                </Button>
              </section>
            </CardContent>
          </Card>

          <Card className="field-side-card">
            <CardHeader>
              <CardTitle>创建预览</CardTitle>
              <CardDescription>右侧实时展示本次字段结构，方便确认关联和公式配置。</CardDescription>
            </CardHeader>
            <CardContent className="field-side-body">
              <div className="field-preview">
                <Badge>{name || "未命名字段"}</Badge>
                <Badge>{type}</Badge>
                {type === "formula" ? <Badge>{formulaLabel(formulaKind, leftField, rightField)}</Badge> : null}
              </div>

              <div className="field-side-block">
                <h5>字段说明</h5>
                <p>{typeDesc(type)}</p>
              </div>

              <div className="field-side-block">
                <h5>业务预览</h5>
                <div className="field-side-grid">
                  <div className="field-side-item">
                    <span>目标表</span>
                    <strong>{tableOptions.find((item) => item.value === targetTableId)?.label ?? "未设置"}</strong>
                  </div>
                  <div className="field-side-item">
                    <span>公式模板</span>
                    <strong>{activeFormula.label}</strong>
                  </div>
                  <div className="field-side-item">
                    <span>公式表达</span>
                    <strong>{formulaLabel(formulaKind, leftField, rightField)}</strong>
                  </div>
                  <div className="field-side-item">
                    <span>选项数量</span>
                    <strong>{splitOptions(optionsText).length}</strong>
                  </div>
                </div>
              </div>

              <div className="field-side-block">
                <h5>配置 JSON</h5>
                <pre className="json-preview">{previewText}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * 根据字段类型渲染对应配置面板。
 *
 * @param props 当前字段类型和配置状态。
 */
function ConfigEditor({
  fieldOptions,
  formulaKind,
  jsonText,
  leftField,
  optionsText,
  rightField,
  setFormulaKind,
  setJsonText,
  setLeftField,
  setOptionsText,
  setRightField,
  setTargetTableId,
  tableOptions,
  targetTableId,
  type,
}: {
  type: string;
  tableOptions: { value: string; label: string; helper?: string }[];
  fieldOptions: { value: string; label: string; helper?: string }[];
  targetTableId: string;
  optionsText: string;
  formulaKind: (typeof formulaPresets)[number]["value"];
  leftField: string;
  rightField: string;
  jsonText: string;
  setTargetTableId: (value: string) => void;
  setOptionsText: (value: string) => void;
  setFormulaKind: (value: (typeof formulaPresets)[number]["value"]) => void;
  setLeftField: (value: string) => void;
  setRightField: (value: string) => void;
  setJsonText: (value: string) => void;
}) {
  if (type === "link") {
    return (
      <div className="field-stack">
        <div className="field-item">
          <Label>目标业务表</Label>
          <Select onValueChange={setTargetTableId} options={tableOptions} placeholder="选择目标表" value={targetTableId} />
        </div>
        <div className="config-note">关联字段会校验目标记录是否属于指定业务表，并在查询时返回关联摘要。</div>
      </div>
    );
  }

  if (["tag", "singleSelect", "multiSelect"].includes(type)) {
    return (
      <div className="field-stack">
        <div className="field-item">
          <Label htmlFor="field-options">选项内容</Label>
          <Input
            id="field-options"
            placeholder="选项之间用逗号分隔"
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
          />
        </div>
        <div className="option-preview">
          {splitOptions(optionsText).map((option) => (
            <Badge key={option}>{option}</Badge>
          ))}
        </div>
      </div>
    );
  }

  if (type === "formula") {
    return (
      <FormulaEditor
        fieldOptions={fieldOptions}
        formulaKind={formulaKind}
        leftField={leftField}
        rightField={rightField}
        setFormulaKind={setFormulaKind}
        setLeftField={setLeftField}
        setRightField={setRightField}
      />
    );
  }

  return (
    <div className="field-item">
      <Label htmlFor="field-json">扩展配置</Label>
      <Textarea
        id="field-json"
        placeholder='{"prompt":"可选配置"}'
        value={jsonText}
        onChange={(event) => setJsonText(event.target.value)}
      />
    </div>
  );
}

/**
 * 渲染公式字段专用配置器。
 *
 * @param props 公式模板、字段选择项和状态变更函数。
 */
function FormulaEditor({
  fieldOptions,
  formulaKind,
  leftField,
  rightField,
  setFormulaKind,
  setLeftField,
  setRightField,
}: {
  fieldOptions: { value: string; label: string; helper?: string }[];
  formulaKind: (typeof formulaPresets)[number]["value"];
  leftField: string;
  rightField: string;
  setFormulaKind: (value: (typeof formulaPresets)[number]["value"]) => void;
  setLeftField: (value: string) => void;
  setRightField: (value: string) => void;
}) {
  return (
    <div className="formula-shell">
      <Tabs onValueChange={(value) => setFormulaKind(value as (typeof formulaPresets)[number]["value"])} value={formulaKind}>
        <TabsList className="formula-tabs-list">
          {formulaPresets.map((item) => (
            <TabsTrigger className="formula-tabs-trigger" key={item.value} value={item.value}>
              <span>{item.label}</span>
              <small>{item.scene}</small>
            </TabsTrigger>
          ))}
        </TabsList>

        {formulaPresets.map((item) => (
          <TabsContent className="formula-tabs-panel" key={item.value} value={item.value}>
            <div className="formula-hero">
              <div>
                <h5>{item.label}</h5>
                <p>{item.desc}</p>
              </div>
              <Badge>{item.output}</Badge>
            </div>

            <div className="formula-code">{formulaLabel(item.value, leftField, rightField)}</div>

            <div className="formula-grid">
              <div className="formula-kpi">
                <span>典型场景</span>
                <strong>{item.scene}</strong>
              </div>
              <div className="formula-kpi">
                <span>模板示意</span>
                <strong>{item.expression}</strong>
              </div>
            </div>

            <div className="field-form-grid">
              <FieldSelect label="左侧字段" options={fieldOptions} value={leftField} onChange={setLeftField} />
              <FieldSelect label="右侧字段" options={fieldOptions} value={rightField} onChange={setRightField} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * 渲染公式字段依赖字段选择器。
 *
 * @param props 标签、选项、当前值和回调。
 */
function FieldSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  options: { value: string; label: string; helper?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field-item">
      <Label>{label}</Label>
      <Select disabled={options.length === 0} onValueChange={onChange} options={options} placeholder="请选择字段" value={value} />
    </div>
  );
}

/**
 * 返回字段类型说明文案。
 *
 * @param type 当前字段类型。
 * @returns 字段说明文本。
 */
function typeDesc(type: string) {
  if (type === "link") return "用于连接另一张业务表，适合供应商、商品、订单之间的业务关联。";
  if (type === "formula") return "使用安全 AST 执行基础公式计算，不使用 eval，可支持公式依赖。";
  if (type === "tag" || type === "singleSelect" || type === "multiSelect") return "用于枚举类字段，可直接驱动标签和筛选展示。";
  if (type === "aiText") return "用于承载 AI 生成的定制订单摘要、说明文案等文本结果。";
  if (type === "aiScore") return "用于承载 AI 风险评分、等级和原因说明。";
  if (type === "number") return "适合数量、金额、体积、库存等可聚合的业务数据。";
  return "用于自由文本输入，适合备注、名称、补充说明等通用信息。";
}
