/**
 * 定义多维表格引擎的 Drizzle PostgreSQL 数据库结构。
 */

import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// 多维表格支持的字段类型枚举。
export const fieldType = pgEnum("field_type", [
  "text",
  "number",
  "tag",
  "singleSelect",
  "multiSelect",
  "link",
  "formula",
  "aiText",
  "aiScore",
]);

// 业务表元数据表。
export const tables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 字段定义表，config 保存选项、关联目标表、公式 AST 和 AI 配置。
export const fields = pgTable(
  "fields",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tableId: uuid("table_id")
      .notNull()
      .references(() => tables.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: fieldType("type").notNull(),
    config: jsonb("config").notNull().default({}),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tableNameUnique: unique().on(table.tableId, table.name),
  }),
);

// 记录表，每一行记录归属于一张业务表。
export const records = pgTable("records", {
  id: uuid("id").defaultRandom().primaryKey(),
  tableId: uuid("table_id")
    .notNull()
    .references(() => tables.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 普通单元格值表，value 使用 JSONB 支持多种字段类型。
export const cells = pgTable(
  "cell_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => fields.id, { onDelete: "cascade" }),
    value: jsonb("value").notNull().default(null),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    recordFieldUnique: unique().on(table.recordId, table.fieldId),
  }),
);

// 关联字段关系表，独立存储跨表记录关联。
export const links = pgTable(
  "record_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceRecordId: uuid("source_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    sourceFieldId: uuid("source_field_id")
      .notNull()
      .references(() => fields.id, { onDelete: "cascade" }),
    targetRecordId: uuid("target_record_id")
      .notNull()
      .references(() => records.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    linkUnique: unique().on(table.sourceRecordId, table.sourceFieldId, table.targetRecordId),
  }),
);

/** 表记录类型。 */
export type TableRow = typeof tables.$inferSelect;
/** 字段记录类型。 */
export type FieldRow = typeof fields.$inferSelect;
/** 业务记录类型。 */
export type RecordRow = typeof records.$inferSelect;
/** 单元格记录类型。 */
export type CellRow = typeof cells.$inferSelect;
/** 关联记录类型。 */
export type LinkRow = typeof links.$inferSelect;
