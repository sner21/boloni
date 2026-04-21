/**
 * 渲染可动态编辑的多维表格，并提供整表单统一确认、重置、多级分组和聚合统计。
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { LinkCell } from "./LinkCell";
import type { CellData, FieldMeta, RowData, TableData } from "./types";

type Props = {
  /** 当前表格的字段、记录和表元数据。 */
  data: TableData | null;
  /** 单条记录补丁提交函数。 */
  onPatch: (recordId: string, cells: Record<string, unknown>) => Promise<void>;
  /** 整表单提交完成后的刷新函数。 */
  onReload: () => Promise<void>;
  /** 新增空记录的处理函数。 */
  onAdd: () => Promise<void>;
  /** 当前表格数据是否正在加载。 */
  loading?: boolean;
};

type DraftMap = Record<string, Record<string, unknown>>;

type GroupItem =
  /** 分组行，携带聚合统计和折叠状态。 */
  | { kind: "group"; key: string; label: string; count: number; sumText: string; level: number; closed: boolean }
  /** 普通数据行。 */
  | { kind: "row"; row: RowData };

/**
 * 渲染动态表格工作区。
 *
 * @param props 表格数据、编辑回调和新增记录回调。
 */
export function DynamicGrid({ data, loading = false, onAdd, onPatch, onReload }: Props) {
  // 一级分组字段 ID。
  const [groupOne, setGroupOne] = useState("");
  // 二级分组字段 ID。
  const [groupTwo, setGroupTwo] = useState("");
  // 当前折叠的分组 key 集合。
  const [closed, setClosed] = useState<Set<string>>(new Set());
  // 当前整表单是否正在提交。
  const [saving, setSaving] = useState(false);
  // 当前表格记录列表，空数据时保持稳定数组。
  const rows = data?.records ?? [];
  // 当前表格字段列表，驱动动态列渲染。
  const fields = data?.fields ?? [];
  // 分组选项。
  const fieldOptions = useMemo(
    () => fields.map((field) => ({ value: field.id, label: field.name, helper: field.type })),
    [fields],
  );
  // 表格顶部密度更高的业务统计。
  const statItems = useMemo(
    () => [
      { label: "记录", value: String(rows.length) },
      { label: "字段", value: String(fields.length) },
      { label: "公式字段", value: String(fields.filter((field) => field.type === "formula").length) },
      { label: "关联字段", value: String(fields.filter((field) => field.type === "link").length) },
    ],
    [fields, rows.length],
  );
  // 当前表格的初始草稿快照。
  const initialDrafts = useMemo(() => buildTableDrafts(fields, rows), [fields, rows]);
  // 整表单可编辑草稿，所有输入先写入这里。
  const [drafts, setDrafts] = useState<DraftMap>(initialDrafts);
  // 当前整表单的改动统计。
  const dirtyState = useMemo(() => summarizeDirty(fields, rows, drafts, initialDrafts), [drafts, fields, initialDrafts, rows]);
  // 按分组状态计算后的渲染行。
  const groups = useMemo(
    () => groupRows(rows, fields, groupOne, groupTwo, closed),
    [closed, fields, groupOne, groupTwo, rows],
  );

  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  if (loading) {
    return <LoadingBlock text="正在加载当前业务表数据..." />;
  }

  if (!data) {
    return (
      <div className="workspace muted" style={{ padding: 22 }}>
        请选择一张博洛尼业务表。
      </div>
    );
  }

  /**
   * 切换指定分组的折叠状态。
   *
   * @param key 分组唯一 key。
   */
  function toggle(key: string) {
    setClosed((current) => {
      // 复制 Set，避免直接修改 React state。
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /**
   * 更新某条记录某个字段的整表单草稿值。
   *
   * @param recordId 目标记录 ID。
   * @param fieldId 目标字段 ID。
   * @param value 新草稿值。
   */
  function updateDraft(recordId: string, fieldId: string, value: unknown) {
    setDrafts((current) => ({
      ...current,
      [recordId]: {
        ...(current[recordId] ?? {}),
        [fieldId]: value,
      },
    }));
  }

  /**
   * 重置整个表单草稿。
   */
  function resetForm() {
    setDrafts(initialDrafts);
  }

  /**
   * 提交整个表单的所有改动。
   */
  async function submitForm() {
    if (dirtyState.cellCount === 0) return;
    setSaving(true);
    try {
      for (const row of rows) {
        const patch = buildRowPatch(fields, drafts[row.id] ?? {}, initialDrafts[row.id] ?? {});
        if (Object.keys(patch).length === 0) continue;
        await onPatch(row.id, patch);
      }
      await onReload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace">
      <div className="workspace-head">

        <div className="toolbar">
          <div className="toolbar-main">
            <div className="toolbar-copy">
              <strong>整表单编辑</strong>
              <span>所有修改都会先进入统一草稿，确认时一次性提交，重置时整体回退。</span>
            </div>
            <div className="group-tools">
              <Select onValueChange={setGroupOne} options={fieldOptions} placeholder="一级分组" value={groupOne} />
              <Select onValueChange={setGroupTwo} options={fieldOptions} placeholder="二级分组" value={groupTwo} />
            </div>
          </div>

          <div className="toolbar-actions">
            <span className="form-state">
              {dirtyState.cellCount > 0 ? `已修改 ${dirtyState.rowCount} 行 / ${dirtyState.cellCount} 项` : "当前表单未修改"}
            </span>
            {groupOne ? (
              <Button onClick={() => setClosed(new Set())} size="sm" type="button" variant="outline">
                展开全部
              </Button>
            ) : null}
            <Button onClick={resetForm} disabled={dirtyState.cellCount === 0 || saving} size="sm" type="button" variant="outline">
              重置
            </Button>
            <Button onClick={submitForm} disabled={dirtyState.cellCount === 0 || saving} size="sm" type="button">
              {saving ? "保存中" : "确认"}
            </Button>
            <Button onClick={onAdd} type="button">
              新增记录
            </Button>
          </div>
        </div>
      </div>

      <div className="grid-wrap">
        <table className="data-grid">
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.id}>{field.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.kind === "row" ? (
                <DataRow
                  dirty={dirtyState.rowIds.has(group.row.id)}
                  drafts={drafts[group.row.id] ?? {}}
                  fields={fields}
                  key={group.row.id}
                  onChange={updateDraft}
                  row={group.row}
                />
              ) : (
                <tr className={`group-row level-${group.level}`} key={group.key}>
                  <td colSpan={Math.max(fields.length, 1)}>
                    <Button className="group-toggle" onClick={() => toggle(group.key)} type="button" variant="ghost">
                      <span>{group.closed ? "+" : "-"}</span>
                      <strong>{group.label}</strong>
                      <em>{group.count} 条</em>
                      <small>{group.sumText}</small>
                    </Button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * 渲染一条普通数据行。
 *
 * @param props 行数据、字段列表和整表单草稿回调。
 */
function DataRow({
  dirty,
  drafts,
  fields,
  onChange,
  row,
}: {
  row: RowData;
  fields: FieldMeta[];
  drafts: Record<string, unknown>;
  dirty: boolean;
  onChange: (recordId: string, fieldId: string, value: unknown) => void;
}) {
  return (
    <tr className={dirty ? "dirty-row" : undefined}>
      {fields.map((field) => (
        <td key={field.id}>
          <CellEditor
            cell={row.cells[field.id]}
            field={field}
            onChange={(value) => onChange(row.id, field.id, value)}
            value={drafts[field.id]}
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * 根据字段类型渲染对应的单元格编辑器。
 *
 * @param props 单元格数据、字段元数据和整表单草稿回调。
 */
function CellEditor({
  cell,
  field,
  onChange,
  value,
}: {
  cell: CellData | undefined;
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "formula") return <span className="readonly">{formatValue(cell?.value)}</span>;
  if (field.type === "link") {
    return (
      <LinkCell cell={cell ?? { value: [] }} field={field} onChange={(next) => onChange(next)} value={String(value ?? "")} />
    );
  }
  if (field.type === "aiScore") return <ScoreCell value={cell?.value} />;
  if (field.type === "tag" || field.type === "singleSelect") {
    return <OptionCell field={field} mode="single" onChange={(next) => onChange(next)} value={value} />;
  }
  if (field.type === "multiSelect") {
    return <OptionCell field={field} mode="multi" onChange={(next) => onChange(next)} value={value} />;
  }
  if (field.type === "aiText") {
    return <Textarea className="cell-area" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  }
  if (field.type === "number") {
    return <Input inputMode="decimal" placeholder="输入数值" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
  }
  return <Input placeholder="输入内容" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />;
}

/**
 * 渲染表格局部加载状态。
 *
 * @param props 加载提示文本。
 */
function LoadingBlock({ text }: { text: string }) {
  return (
    <div className="workspace loading-box">
      <Skeleton className="loading-icon" />
      <strong>{text}</strong>
    </div>
  );
}

/**
 * 渲染单选、多选和标签字段的可视化选项。
 *
 * @param props 字段配置、选择模式、当前草稿值和草稿变更回调。
 */
function OptionCell({
  field,
  mode,
  onChange,
  value,
}: {
  field: FieldMeta;
  mode: "single" | "multi";
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  // 字段配置中的可选项。
  const options = getOptions(field);
  // 当前选中值，单选为字符串，多选为字符串数组。
  const selected = mode === "multi" ? toList(value) : value == null ? "" : String(value);

  if (options.length === 0) {
    return (
      <Input
        placeholder={mode === "multi" ? "多个值请用逗号分隔" : "输入选项值"}
        value={mode === "multi" ? toList(value).join(", ") : String(value ?? "")}
        onChange={(event) => onChange(mode === "multi" ? splitList(event.target.value) : event.target.value)}
      />
    );
  }

  if (mode === "multi") {
    // 多选字段当前选中的选项列表。
    const selectedList = selected as string[];
    return (
      <div className="option-grid">
        {options.map((option, index) => {
          const active = selectedList.includes(option);
          return (
            <Button
              className={`option-chip tone-${index % 6} ${active ? "active" : ""}`}
              key={option}
              onClick={() => onChange(toggleValue(selectedList, option))}
              size="sm"
              type="button"
              variant={active ? "default" : "outline"}
            >
              {option}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="option-grid">
      {options.map((option, index) => (
        <Button
          className={`option-chip tone-${index % 6} ${selected === option ? "active" : ""}`}
          key={option}
          onClick={() => onChange(option)}
          size="sm"
          type="button"
          variant={selected === option ? "default" : "outline"}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

/**
 * 渲染 AI 风险评分单元格。
 *
 * @param value AI 返回的评分对象。
 */
function ScoreCell({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return <span className="muted">待生成</span>;
  const item = value as { score?: number; level?: string; reason?: string };
  return (
    <div>
      <Badge className="chip">
        {item.level ?? "未定"} · {item.score ?? "-"}
      </Badge>
      <div className="muted">{item.reason}</div>
    </div>
  );
}

/**
 * 将记录按一到两级字段分组，并按折叠状态过滤子行。
 *
 * @param rows 原始记录列表。
 * @param fields 字段元数据列表。
 * @param first 一级分组字段 ID。
 * @param second 二级分组字段 ID。
 * @param closed 已折叠的分组 key 集合。
 * @returns 表格渲染用的分组行和数据行。
 */
function groupRows(rows: RowData[], fields: FieldMeta[], first: string, second: string, closed: Set<string>) {
  if (!first) return rows.map((row) => ({ kind: "row" as const, row }));
  // 最终输出的行序列，混合分组行和数据行。
  const output: GroupItem[] = [];
  // 一级分组桶。
  const firstGroups = bucketRows(rows, first);

  for (const [name, items] of firstGroups) {
    // 一级分组 key 包含字段 ID 和分组值，保证切换字段后状态不串。
    const firstKey = `one:${first}:${name}`;
    // 一级分组是否折叠。
    const firstClosed = closed.has(firstKey);
    output.push(groupHeader(name, items, fields, firstKey, 1, firstClosed));
    if (firstClosed) continue;

    if (second) {
      for (const [subName, subItems] of bucketRows(items, second)) {
        // 二级分组 key 同时包含两个分组字段和值。
        const secondKey = `two:${first}:${second}:${name}:${subName}`;
        // 二级分组是否折叠。
        const secondClosed = closed.has(secondKey);
        output.push(groupHeader(subName, subItems, fields, secondKey, 2, secondClosed));
        if (!secondClosed) output.push(...subItems.map((row) => ({ kind: "row" as const, row })));
      }
    } else {
      output.push(...items.map((row) => ({ kind: "row" as const, row })));
    }
  }

  return output;
}

/**
 * 按指定字段把记录分桶。
 *
 * @param rows 原始记录列表。
 * @param fieldId 分组字段 ID。
 * @returns 分组名到记录列表的映射。
 */
function bucketRows(rows: RowData[], fieldId: string) {
  // 分组容器，保持插入顺序用于稳定展示。
  const map = new Map<string, RowData[]>();
  for (const row of rows) {
    // 关联字段优先使用 display 标题，普通字段使用 value。
    const value = row.cells[fieldId]?.display?.map((item) => item.title).join(", ") ?? row.cells[fieldId]?.value;
    // 空值统一归入“未设置”分组。
    const key = Array.isArray(value) ? value.join(", ") : String(value ?? "未设置");
    map.set(key, [...(map.get(key) ?? []), row]);
  }
  return map;
}

/**
 * 创建分组行并计算聚合说明。
 *
 * @param label 分组展示名称。
 * @param rows 分组下的记录列表。
 * @param fields 字段元数据列表。
 * @param key 分组唯一 key。
 * @param level 分组层级。
 * @param closed 当前分组是否折叠。
 * @returns 分组行对象。
 */
function groupHeader(
  label: string,
  rows: RowData[],
  fields: FieldMeta[],
  key: string,
  level: number,
  closed: boolean,
): GroupItem {
  // 对数字列和公式列做 sum 聚合展示。
  const sums = fields
    .filter((field) => field.type === "number" || field.type === "formula")
    .map((field) => `${field.name}: ${sumRows(rows, field.id)}`)
    .join(" / ");
  return { kind: "group", key, label, count: rows.length, sumText: sums || "无数值列", level, closed };
}

/**
 * 构建整张表的初始草稿快照。
 *
 * @param fields 当前表字段列表。
 * @param rows 当前表记录列表。
 * @returns 以记录 ID 为 key 的整表单草稿对象。
 */
function buildTableDrafts(fields: FieldMeta[], rows: RowData[]) {
  return Object.fromEntries(rows.map((row) => [row.id, buildRowDraft(fields, row)]));
}

/**
 * 构建单条记录的初始草稿。
 *
 * @param fields 当前表字段列表。
 * @param row 当前记录。
 * @returns 以字段 ID 为 key 的记录草稿对象。
 */
function buildRowDraft(fields: FieldMeta[], row: RowData) {
  return Object.fromEntries(fields.map((field) => [field.id, draftFromValue(field, row.cells[field.id]?.value)]));
}

/**
 * 汇总整表单的改动情况。
 *
 * @param fields 当前表字段列表。
 * @param rows 当前表记录列表。
 * @param drafts 当前草稿快照。
 * @param initialDrafts 初始草稿快照。
 * @returns 改动的行数、字段数和行 ID 集合。
 */
function summarizeDirty(fields: FieldMeta[], rows: RowData[], drafts: DraftMap, initialDrafts: DraftMap) {
  // 已修改的记录 ID 集合。
  const rowIds = new Set<string>();
  // 已修改的字段总数。
  let cellCount = 0;

  for (const row of rows) {
    const patch = buildRowPatch(fields, drafts[row.id] ?? {}, initialDrafts[row.id] ?? {});
    const changed = Object.keys(patch).length;
    if (changed > 0) {
      rowIds.add(row.id);
      cellCount += changed;
    }
  }

  return { rowCount: rowIds.size, cellCount, rowIds };
}

/**
 * 构建单条记录的提交补丁。
 *
 * @param fields 当前表字段列表。
 * @param drafts 当前记录草稿。
 * @param initialDrafts 当前记录初始草稿。
 * @returns 仅包含已改动字段的补丁对象。
 */
function buildRowPatch(fields: FieldMeta[], drafts: Record<string, unknown>, initialDrafts: Record<string, unknown>) {
  return Object.fromEntries(
    fields
      .filter((field) => !sameDraft(drafts[field.id], initialDrafts[field.id]))
      .map((field) => [field.id, valueFromDraft(field, drafts[field.id])]),
  );
}

/**
 * 读取字段配置中的选项列表。
 *
 * @param field 字段元数据。
 * @returns 字符串选项数组。
 */
function getOptions(field: FieldMeta) {
  // 字段配置中的 options，可能来自后端 JSONB。
  const options = field.config.options;
  return Array.isArray(options) ? options.map(String).filter(Boolean) : [];
}

/**
 * 把逗号分隔文本转为选项数组。
 *
 * @param value 用户输入的选项文本。
 * @returns 清理后的选项数组。
 */
function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 把任意单元格值规范成字符串数组。
 *
 * @param value 单元格原始值。
 * @returns 字符串数组。
 */
function toList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) return splitList(value);
  return [];
}

/**
 * 在多选列表中切换一个选项。
 *
 * @param values 当前已选择的选项。
 * @param option 要切换的选项。
 * @returns 切换后的新数组。
 */
function toggleValue(values: string[], option: string) {
  return values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
}

/**
 * 把后端单元格值转换成前端编辑草稿。
 *
 * @param field 字段元数据。
 * @param value 后端单元格值。
 * @returns 编辑器使用的草稿值。
 */
function draftFromValue(field: FieldMeta, value: unknown) {
  if (field.type === "multiSelect") return toList(value);
  if (field.type === "link") return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  if (field.type === "number") return value == null ? "" : String(value);
  return value == null ? "" : String(value);
}

/**
 * 把前端编辑草稿转换成后端单元格值。
 *
 * @param field 字段元数据。
 * @param draft 当前编辑草稿。
 * @returns 提交给后端的单元格值。
 */
function valueFromDraft(field: FieldMeta, draft: unknown) {
  if (field.type === "multiSelect") return Array.isArray(draft) ? draft : toList(draft);
  if (field.type === "link") return draft ? [String(draft)] : [];
  if (field.type === "number") return draft === "" ? null : draft;
  return draft;
}

/**
 * 比较两个草稿值是否一致。
 *
 * @param left 左侧草稿值。
 * @param right 右侧草稿值。
 * @returns 草稿值一致时返回 true。
 */
function sameDraft(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * 汇总指定字段在记录列表中的数值。
 *
 * @param rows 参与聚合的记录列表。
 * @param fieldId 数字或公式字段 ID。
 * @returns 保留两位小数的汇总文本。
 */
function sumRows(rows: RowData[], fieldId: string) {
  return rows.reduce((sum, row) => sum + (Number(row.cells[fieldId]?.value) || 0), 0).toFixed(2);
}

/**
 * 格式化只读字段值。
 *
 * @param value 原始字段值。
 * @returns 展示文本。
 */
function formatValue(value: unknown) {
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(2);
  return value == null ? "空" : String(value);
}
