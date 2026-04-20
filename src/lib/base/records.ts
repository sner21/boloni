/**
 * 实现多维表格核心记录服务，包括字段创建、记录写入、关联解析和公式计算。
 */

import { and, asc, eq, inArray } from "drizzle-orm";

import { evalFormula } from "@/lib/base/formula";
import { db } from "@/lib/db/client";
import { badRequest, notFound } from "@/lib/db/errors";
import { cells, fields, links, records, tables } from "@/lib/db/schema";
import type { FieldConfig } from "@/lib/schemas/base";
import { createFieldSchema, formulaNodeSchema } from "@/lib/schemas/base";

type FieldRow = typeof fields.$inferSelect;
type RecordRow = typeof records.$inferSelect;

/** 单元格前端展示结构，关联字段会包含 ids 和 display。 */
export type CellView = {
  value: unknown;
  ids?: string[];
  display?: { id: string; title: string }[];
  error?: string;
};

/** 记录前端展示结构。 */
export type RecordView = {
  id: string;
  createdAt: string;
  cells: Record<string, CellView>;
};

/**
 * 查询所有业务表。
 *
 * @returns 按创建时间排序的表元数据列表。
 */
export async function listTables() {
  return db.select().from(tables).orderBy(asc(tables.createdAt));
}

/**
 * 创建业务表。
 *
 * @param input 表名称和唯一 slug。
 * @returns 创建后的表记录。
 */
export async function createTable(input: { name: string; slug: string }) {
  // 新创建的业务表。
  const [table] = await db.insert(tables).values(input).returning();
  return table;
}

/**
 * 为指定表添加字段。
 *
 * @param tableId 目标表 ID。
 * @param input 未信任的字段创建输入。
 * @returns 创建后的字段记录。
 */
export async function addField(tableId: string, input: unknown) {
  // Zod 校验后的字段输入。
  const parsed = createFieldSchema.safeParse(input);
  if (!parsed.success) throw badRequest("字段参数不合法");
  await ensureTable(tableId);
  validateField(parsed.data.type, parsed.data.config);

  // 当前表已有字段数量，用于计算新字段排序位置。
  const count = await db.select().from(fields).where(eq(fields.tableId, tableId));
  // 新创建的字段。
  const [field] = await db
    .insert(fields)
    .values({
      tableId,
      name: parsed.data.name,
      type: parsed.data.type,
      config: parsed.data.config,
      orderIndex: count.length,
    })
    .returning();
  return field;
}

/**
 * 在指定表中创建记录。
 *
 * @param tableId 目标表 ID。
 * @param cellInput 以字段 ID 或字段名为 key 的单元格输入。
 * @returns 创建后的记录视图。
 */
export async function addRecord(tableId: string, cellInput: Record<string, unknown>) {
  await ensureTable(tableId);
  // 新创建的空记录，单元格随后写入。
  const [record] = await db.insert(records).values({ tableId, updatedAt: new Date() }).returning();
  await saveCells(record.id, cellInput);
  return getRecordView(record.id);
}

/**
 * 局部更新记录单元格。
 *
 * @param recordId 目标记录 ID。
 * @param cellInput 以字段 ID 或字段名为 key 的单元格补丁。
 * @returns 更新后的记录视图。
 */
export async function patchCells(recordId: string, cellInput: Record<string, unknown>) {
  await ensureRecord(recordId);
  await saveCells(recordId, cellInput);
  return getRecordView(recordId);
}

/**
 * 查询指定表记录并解析关联和公式字段。
 *
 * @param tableId 目标表 ID。
 * @returns 表元数据、字段列表和记录视图列表。
 */
export async function listRecords(tableId: string) {
  // 当前表元数据。
  const table = await ensureTable(tableId);
  // 当前表字段列表，按 orderIndex 排序。
  const tableFields = await getFields(tableId);
  // 当前表原始记录行。
  const rows = await db
    .select()
    .from(records)
    .where(eq(records.tableId, tableId))
    .orderBy(asc(records.createdAt));

  return {
    table,
    fields: tableFields,
    records: await buildRecords(rows, tableFields),
  };
}

/**
 * 查询单条记录视图。
 *
 * @param recordId 目标记录 ID。
 * @returns 记录所在表、字段列表和解析后的记录视图。
 */
export async function getRecordView(recordId: string) {
  // 原始记录行。
  const record = await ensureRecord(recordId);
  // 记录所属表。
  const table = await ensureTable(record.tableId);
  // 记录所属表字段。
  const tableFields = await getFields(record.tableId);
  // 复用批量解析逻辑得到单条记录视图。
  const [view] = await buildRecords([record], tableFields);
  return { table, fields: tableFields, record: view };
}

/**
 * 保存普通单元格和关联单元格。
 *
 * @param recordId 目标记录 ID。
 * @param cellInput 以字段 ID 或字段名为 key 的单元格输入。
 */
async function saveCells(recordId: string, cellInput: Record<string, unknown>) {
  // 目标记录，用于确认表 ID。
  const record = await ensureRecord(recordId);
  // 记录所属表字段，用于按字段名或字段 ID 匹配输入。
  const tableFields = await getFields(record.tableId);

  for (const [key, rawValue] of Object.entries(cellInput)) {
    // 当前输入 key 对应的字段。
    const field = tableFields.find((item) => item.id === key || item.name === key);
    if (!field || field.type === "formula") continue;

    if (field.type === "link") {
      await saveLinks(record, field, rawValue);
      continue;
    }

    // 规范化后的 JSONB 单元格值。
    const value = normalizeValue(field, rawValue);
    await db
      .insert(cells)
      .values({ recordId, fieldId: field.id, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [cells.recordId, cells.fieldId],
        set: { value, updatedAt: new Date() },
      });
  }

  await db.update(records).set({ updatedAt: new Date() }).where(eq(records.id, recordId));
}

/**
 * 保存关联字段值。
 *
 * @param record 源记录。
 * @param field 关联字段。
 * @param rawValue 前端提交的目标记录 ID 或 ID 数组。
 */
async function saveLinks(record: RecordRow, field: FieldRow, rawValue: unknown) {
  // 关联字段配置，必须包含 targetTableId。
  const config = field.config as FieldConfig;
  if (!config.targetTableId) throw badRequest("关联字段缺少 targetTableId");

  // 前端提交的目标记录 ID 列表。
  const ids = Array.isArray(rawValue)
    ? rawValue.map(String).filter(Boolean)
    : rawValue
      ? [String(rawValue)]
      : [];
  // 去重后的目标记录 ID 列表。
  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length > 0) {
    // 目标记录必须全部属于关联字段配置的目标表。
    const targets = await db
      .select()
      .from(records)
      .where(and(inArray(records.id, uniqueIds), eq(records.tableId, config.targetTableId)));
    if (targets.length !== uniqueIds.length) {
      throw badRequest("关联目标记录不属于配置的目标表");
    }
  }

  // 关联字段独立存表，避免跨表查询依赖 JSON 单元格结构。
  await db
    .delete(links)
    .where(and(eq(links.sourceRecordId, record.id), eq(links.sourceFieldId, field.id)));

  if (uniqueIds.length > 0) {
    await db.insert(links).values(
      uniqueIds.map((targetRecordId) => ({
        sourceRecordId: record.id,
        sourceFieldId: field.id,
        targetRecordId,
      })),
    );
  }
}

/**
 * 把数据库原始记录解析为前端记录视图。
 *
 * @param rows 原始记录行。
 * @param tableFields 当前表字段列表。
 * @returns 包含普通值、关联展示和公式结果的记录视图列表。
 */
async function buildRecords(rows: RecordRow[], tableFields: FieldRow[]) {
  if (rows.length === 0) return [];

  // 本次批量解析的记录 ID 列表。
  const recordIds = rows.map((row) => row.id);
  // 批量读取普通单元格，减少逐行查询。
  const storedCells = await db.select().from(cells).where(inArray(cells.recordId, recordIds));
  // 批量读取关联关系。
  const storedLinks = await db.select().from(links).where(inArray(links.sourceRecordId, recordIds));
  // 关联目标记录展示标题映射。
  const titleMap = await loadTitles(storedLinks.map((link) => link.targetRecordId));

  // recordId -> fieldId -> value 的单元格索引。
  const cellMap = new Map<string, Map<string, unknown>>();
  for (const cell of storedCells) {
    const rowCells = cellMap.get(cell.recordId) ?? new Map<string, unknown>();
    rowCells.set(cell.fieldId, cell.value);
    cellMap.set(cell.recordId, rowCells);
  }

  // sourceRecordId:sourceFieldId -> targetRecordId[] 的关联索引。
  const linkMap = new Map<string, string[]>();
  for (const link of storedLinks) {
    const key = `${link.sourceRecordId}:${link.sourceFieldId}`;
    linkMap.set(key, [...(linkMap.get(key) ?? []), link.targetRecordId]);
  }

  return rows.map((row) => {
    // 当前记录的普通单元格索引。
    const rowCells = cellMap.get(row.id) ?? new Map<string, unknown>();
    // 当前记录的输出单元格视图。
    const output: Record<string, CellView> = {};
    // 当前记录公式计算缓存，避免重复计算依赖字段。
    const memo = new Map<string, number | null>();
    // 当前公式调用栈，用于检测循环依赖。
    const stack = new Set<string>();

    /**
     * 读取公式依赖字段的数值。
     *
     * @param field 公式字段引用，支持 fieldId 或 fieldName。
     * @returns 字段数值；缺失或无法转换时返回 null。
     */
    const readField = (field: { fieldId?: string; fieldName?: string }): number | null => {
      // 被公式引用的目标字段。
      const target = tableFields.find(
        (item) => item.id === field.fieldId || item.name === field.fieldName,
      );
      if (!target) return null;
      if (target.type === "formula") return computeFormula(target);
      return toNumber(rowCells.get(target.id));
    };

    /**
     * 计算当前记录中的公式字段。
     *
     * @param field 公式字段行。
     * @returns 公式结果；配置非法或循环依赖时返回 null。
     */
    const computeFormula = (field: FieldRow): number | null => {
      if (memo.has(field.id)) return memo.get(field.id) ?? null;
      if (stack.has(field.id)) {
        memo.set(field.id, null);
        return null;
      }
      stack.add(field.id);
      // 经过 Zod 校验的公式 AST。
      const parsed = formulaNodeSchema.safeParse((field.config as FieldConfig).formula);
      // 当前公式字段的计算值。
      const value = parsed.success ? evalFormula(parsed.data, readField) : null;
      stack.delete(field.id);
      memo.set(field.id, value);
      return value;
    };

    for (const field of tableFields) {
      if (field.type === "link") {
        const ids = linkMap.get(`${row.id}:${field.id}`) ?? [];
        output[field.id] = {
          value: ids,
          ids,
          display: ids.map((id) => ({ id, title: titleMap.get(id) ?? id.slice(0, 8) })),
        };
      } else if (field.type === "formula") {
        // 公式字段只读，写入时不落库，查询时实时计算。
        const value = computeFormula(field);
        output[field.id] = {
          value,
          error: value === null ? "Formula returned empty value" : undefined,
        };
      } else {
        output[field.id] = { value: rowCells.get(field.id) ?? null };
      }
    }

    return { id: row.id, createdAt: row.createdAt.toISOString(), cells: output };
  });
}

/**
 * 批量读取关联目标记录的展示标题。
 *
 * @param ids 目标记录 ID 列表。
 * @returns 记录 ID 到展示标题的映射。
 */
async function loadTitles(ids: string[]) {
  // 去重后的目标记录 ID。
  const uniqueIds = Array.from(new Set(ids));
  // 目标记录展示标题映射。
  const titleMap = new Map<string, string>();
  if (uniqueIds.length === 0) return titleMap;

  // 关联目标记录及其可作为标题的单元格。
  const rows = await db
    .select({
      recordId: records.id,
      fieldType: fields.type,
      value: cells.value,
    })
    .from(records)
    .leftJoin(cells, eq(cells.recordId, records.id))
    .leftJoin(fields, eq(cells.fieldId, fields.id))
    .where(inArray(records.id, uniqueIds));

  for (const row of rows) {
    if (titleMap.has(row.recordId)) continue;
    if (row.fieldType === "text" || row.fieldType === "singleSelect" || row.fieldType === "tag") {
      // 文本类字段优先作为关联记录标题。
      const value = row.value == null ? "" : String(row.value);
      if (value.trim()) titleMap.set(row.recordId, value);
    }
  }

  for (const id of uniqueIds) {
    if (!titleMap.has(id)) titleMap.set(id, id.slice(0, 8));
  }
  return titleMap;
}

/**
 * 查询指定表的字段列表。
 *
 * @param tableId 目标表 ID。
 * @returns 按 orderIndex 排序的字段列表。
 */
async function getFields(tableId: string) {
  return db.select().from(fields).where(eq(fields.tableId, tableId)).orderBy(asc(fields.orderIndex));
}

/**
 * 确认表存在。
 *
 * @param tableId 目标表 ID。
 * @returns 表记录；不存在时抛出 404 错误。
 */
async function ensureTable(tableId: string) {
  // 查询到的表记录。
  const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
  if (!table) throw notFound("表不存在");
  return table;
}

/**
 * 确认记录存在。
 *
 * @param recordId 目标记录 ID。
 * @returns 记录行；不存在时抛出 404 错误。
 */
async function ensureRecord(recordId: string) {
  // 查询到的记录行。
  const [record] = await db.select().from(records).where(eq(records.id, recordId)).limit(1);
  if (!record) throw notFound("记录不存在");
  return record;
}

/**
 * 校验字段类型和字段配置，配置不合法时抛出 400 错误。
 *
 * @param type 字段类型。
 * @param config 字段配置对象。
 */
function validateField(type: string, config: FieldConfig) {
  if (type === "link" && !config.targetTableId) {
    throw badRequest("关联字段必须配置 targetTableId");
  }
  if (type === "formula" && !formulaNodeSchema.safeParse(config.formula).success) {
    throw badRequest("公式字段必须配置合法公式 AST");
  }
}

/**
 * 按字段类型规范化单元格值。
 *
 * @param field 字段元数据。
 * @param rawValue 原始输入值。
 * @returns 可写入 JSONB 的规范化值。
 */
function normalizeValue(field: FieldRow, rawValue: unknown) {
  if (field.type === "number") return toNumber(rawValue);
  if (field.type === "multiSelect") {
    if (Array.isArray(rawValue)) return rawValue.map(String).filter(Boolean);
    if (typeof rawValue === "string") return rawValue.split(",").map((item) => item.trim()).filter(Boolean);
    return [];
  }
  if (field.type === "aiScore") return rawValue;
  if (rawValue == null) return null;
  return String(rawValue);
}

/**
 * 把任意值转换为数字。
 *
 * @param value 原始值。
 * @returns 有效数字；无法转换时返回 null。
 */
function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
