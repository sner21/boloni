/**
 * 渲染可动态编辑的多维表格，并提供多级分组折叠、聚合统计和选项字段选择器。
 */

"use client";

import { useMemo, useState } from "react";

import { LinkCell } from "./LinkCell";
import type { CellData, FieldMeta, RowData, TableData } from "./types";

type Props = {
  /** 当前表格的字段、记录和表元数据。 */
  data: TableData | null;
  /** 单元格提交后的后端同步函数。 */
  onPatch: (recordId: string, field: FieldMeta, value: unknown) => Promise<void>;
  /** 新增空记录的处理函数。 */
  onAdd: () => Promise<void>;
};

type GroupItem =
  /** 分组行，携带聚合统计和折叠状态。 */
  | { kind: "group"; key: string; label: string; count: number; sumText: string; level: number; closed: boolean }
  /** 普通数据行。 */
  | { kind: "row"; row: RowData };

/**
 * 渲染动态表格工作区。
 * @param props 表格数据、编辑回调和新增记录回调。
 * @returns 可编辑、可分组、可折叠的表格组件。
 */
export function DynamicGrid({ data, onPatch, onAdd }: Props) {
  // 一级分组字段 ID。
  const [groupOne, setGroupOne] = useState("");
  // 二级分组字段 ID。
  const [groupTwo, setGroupTwo] = useState("");
  // 当前折叠的分组 key 集合。
  const [closed, setClosed] = useState<Set<string>>(new Set());
  // 当前表格记录列表，空数据时保持稳定数组。
  const rows = data?.records ?? [];
  // 当前表格字段列表，驱动动态列渲染。
  const fields = data?.fields ?? [];
  // 按分组状态计算后的渲染行。
  const groups = useMemo(
    () => groupRows(rows, fields, groupOne, groupTwo, closed),
    [closed, fields, groupOne, groupTwo, rows],
  );

  if (!data) {
    return (
      <div className="workspace muted" style={{ padding: 22 }}>
        请先初始化博洛尼演示数据。
      </div>
    );
  }

  /**
   * 切换指定分组的折叠状态。
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

  return (
    <section className="workspace">
      <div className="toolbar">
        <div className="group-tools">
          <span className="muted">分组</span>
          <select className="config-input" value={groupOne} onChange={(e) => setGroupOne(e.target.value)}>
            <option value="">一级分组</option>
            {fields.map((field) => (
              <option value={field.id} key={field.id}>
                {field.name}
              </option>
            ))}
          </select>
          <select className="config-input" value={groupTwo} onChange={(e) => setGroupTwo(e.target.value)}>
            <option value="">二级分组</option>
            {fields.map((field) => (
              <option value={field.id} key={field.id}>
                {field.name}
              </option>
            ))}
          </select>
          {groupOne ? (
            <button className="mini-btn" onClick={() => setClosed(new Set())} type="button">
              展开全部
            </button>
          ) : null}
        </div>
        <button className="btn" onClick={onAdd} type="button">
          新增记录
        </button>
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
                <DataRow fields={fields} key={group.row.id} onPatch={onPatch} row={group.row} />
              ) : (
                <tr className={`group-row level-${group.level}`} key={group.key}>
                  <td colSpan={Math.max(fields.length, 1)}>
                    <button className="group-toggle" onClick={() => toggle(group.key)} type="button">
                      <span>{group.closed ? "+" : "-"}</span>
                      <strong>{group.label}</strong>
                      <em>{group.count} 条</em>
                      <small>{group.sumText}</small>
                    </button>
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
 * @param props 行数据、字段列表和编辑回调。
 * @returns 表格行组件。
 */
function DataRow({
  row,
  fields,
  onPatch,
}: {
  row: RowData;
  fields: FieldMeta[];
  onPatch: Props["onPatch"];
}) {
  return (
    <tr>
      {fields.map((field) => (
        <td key={field.id}>
          <CellEditor cell={row.cells[field.id]} field={field} onCommit={(value) => onPatch(row.id, field, value)} />
        </td>
      ))}
    </tr>
  );
}

/**
 * 根据字段类型渲染对应的单元格编辑器。
 * @param props 单元格数据、字段元数据和提交回调。
 * @returns 可编辑或只读的单元格内容。
 */
function CellEditor({
  cell,
  field,
  onCommit,
}: {
  cell: CellData | undefined;
  field: FieldMeta;
  onCommit: (value: unknown) => void;
}) {
  // 当前单元格原始值。
  const value = cell?.value;

  if (field.type === "formula") return <span className="readonly">{formatValue(value)}</span>;
  if (field.type === "link") return <LinkCell cell={cell ?? { value: [] }} field={field} onCommit={onCommit} />;
  if (field.type === "aiScore") return <ScoreCell value={value} />;
  if (field.type === "tag" || field.type === "singleSelect") {
    return <OptionCell field={field} mode="single" value={value} onCommit={onCommit} />;
  }
  if (field.type === "multiSelect") {
    return <OptionCell field={field} mode="multi" value={value} onCommit={onCommit} />;
  }
  if (field.type === "aiText") {
    return (
      <textarea className="cell-area" defaultValue={String(value ?? "")} onBlur={(e) => onCommit(e.target.value)} />
    );
  }
  if (field.type === "number") {
    return (
      <input
        className="cell-input"
        defaultValue={value == null ? "" : String(value)}
        inputMode="decimal"
        onBlur={(e) => onCommit(e.target.value)}
      />
    );
  }
  return (
    <input className="cell-input" defaultValue={String(value ?? "")} onBlur={(e) => onCommit(e.target.value)} />
  );
}

/**
 * 渲染单选、多选和标签字段的可视化选项。
 * @param props 字段配置、选择模式、当前值和提交回调。
 * @returns 标签式选择器。
 */
function OptionCell({
  field,
  mode,
  value,
  onCommit,
}: {
  field: FieldMeta;
  mode: "single" | "multi";
  value: unknown;
  onCommit: (value: unknown) => void;
}) {
  // 字段配置中的可选项。
  const options = getOptions(field);
  // 当前选中值，单选为字符串，多选为字符串数组。
  const selected = mode === "multi" ? toList(value) : value == null ? "" : String(value);

  if (options.length === 0) {
    return (
      <input
        className="cell-input"
        defaultValue={mode === "multi" ? toList(value).join(", ") : String(value ?? "")}
        onBlur={(event) => onCommit(mode === "multi" ? splitList(event.target.value) : event.target.value)}
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
            <button
              className={`option-chip tone-${index % 6} ${active ? "active" : ""}`}
              key={option}
              onClick={() => onCommit(toggleValue(selectedList, option))}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="option-grid">
      {options.map((option, index) => (
        <button
          className={`option-chip tone-${index % 6} ${selected === option ? "active" : ""}`}
          key={option}
          onClick={() => onCommit(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/**
 * 渲染 AI 风险评分单元格。
 * @param value AI 返回的评分对象。
 * @returns 风险评分展示内容。
 */
function ScoreCell({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return <span className="muted">待生成</span>;
  const item = value as { score?: number; level?: string; reason?: string };
  return (
    <div>
      <span className="chip">
        {item.level ?? "未定"} · {item.score ?? "-"}
      </span>
      <div className="muted">{item.reason}</div>
    </div>
  );
}

/**
 * 将记录按一到两级字段分组，并按折叠状态过滤子行。
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
 * 读取字段配置中的选项列表。
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
 * @param values 当前已选择的选项。
 * @param option 要切换的选项。
 * @returns 切换后的新数组。
 */
function toggleValue(values: string[], option: string) {
  return values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
}

/**
 * 汇总指定字段在记录列表中的数值。
 * @param rows 参与聚合的记录列表。
 * @param fieldId 数字或公式字段 ID。
 * @returns 保留两位小数的汇总文本。
 */
function sumRows(rows: RowData[], fieldId: string) {
  return rows.reduce((sum, row) => sum + (Number(row.cells[fieldId]?.value) || 0), 0).toFixed(2);
}

/**
 * 格式化只读字段值。
 * @param value 原始字段值。
 * @returns 展示文本。
 */
function formatValue(value: unknown) {
  if (typeof value === "number") return Number.isInteger(value) ? value : value.toFixed(2);
  return value == null ? "空" : String(value);
}
