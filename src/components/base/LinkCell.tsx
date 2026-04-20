/**
 * 渲染关联字段单元格，并从目标表加载可关联记录。
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import type { CellData, FieldMeta, TableData } from "./types";

type Props = {
  /** 当前关联单元格数据。 */
  cell: CellData;
  /** 当前关联字段元数据，config 中包含 targetTableId。 */
  field: FieldMeta;
  /** 选择目标记录后的提交回调。 */
  onCommit: (value: unknown) => Promise<void> | void;
};

/**
 * 渲染关联记录选择器。
 *
 * @param props 当前单元格、字段配置和提交回调。
 * @returns 关联记录展示与选择控件。
 */
export function LinkCell({ cell, field, onCommit }: Props) {
  // 目标表的记录数据，用于下拉选择。
  const [data, setData] = useState<TableData | null>(null);
  // 当前关联选择草稿，点击确认后才提交后端。
  const [draft, setDraft] = useState(cell.ids?.[0] ?? "");
  // 当前关联单元格是否正在保存。
  const [saving, setSaving] = useState(false);
  // 关联字段配置中的目标表 ID。
  const targetTableId = String(field.config.targetTableId ?? "");

  useEffect(() => {
    if (!targetTableId) return;
    fetch(`/api/tables/${targetTableId}/records`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, [targetTableId]);

  useEffect(() => {
    setDraft(cell.ids?.[0] ?? "");
  }, [cell.ids]);

  // 当前已保存的目标记录 ID，MVP 中默认展示第一条关联。
  const selected = cell.ids?.[0] ?? "";
  // 当前关联草稿是否已修改。
  const dirty = draft !== selected;
  // 下拉选择项，使用目标记录的首个文本类字段作为标题。
  const choices = useMemo(() => {
    if (!data) return [];
    return data.records.map((row) => ({ id: row.id, title: rowTitle(data, row.id) }));
  }, [data]);

  /**
   * 确认提交当前关联草稿。
   */
  async function confirm() {
    setSaving(true);
    try {
      await onCommit(draft ? [draft] : []);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cell-editor">
      <div className="chip-row">
        {cell.display?.map((item) => (
          <span className="chip" key={item.id}>
            {item.title}
          </span>
        ))}
      </div>
      <select className="cell-select" value={draft} onChange={(event) => setDraft(event.target.value)}>
        <option value="">选择记录</option>
        {choices.map((item) => (
          <option value={item.id} key={item.id}>
            {item.title}
          </option>
        ))}
      </select>
      {dirty ? (
        <div className="cell-actions">
          <button className="mini-btn primary" disabled={saving} onClick={confirm} type="button">
            {saving ? "保存中" : "确认"}
          </button>
          <button className="mini-btn" disabled={saving} onClick={() => setDraft(selected)} type="button">
            重置
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * 读取目标记录的展示标题。
 *
 * @param data 目标表记录数据。
 * @param recordId 目标记录 ID。
 * @returns 展示标题；没有文本字段时返回短 ID。
 */
function rowTitle(data: TableData, recordId: string) {
  // 目标记录。
  const row = data.records.find((item) => item.id === recordId);
  // 优先用文本、单选或标签字段作为标题字段。
  const field = data.fields.find((item) => ["text", "singleSelect", "tag"].includes(item.type));
  if (!row || !field) return recordId.slice(0, 8);
  return String(row.cells[field.id]?.value ?? recordId.slice(0, 8));
}
