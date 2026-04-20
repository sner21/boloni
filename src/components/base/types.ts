/**
 * 定义前端多维表格和仪表盘使用的数据类型。
 */

/** 表元数据。 */
export type TableMeta = {
  id: string;
  name: string;
  slug: string;
};

/** 字段元数据，config 来自后端 JSONB 配置。 */
export type FieldMeta = {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
};

/** 单元格展示数据，关联字段会额外包含 ids 和 display。 */
export type CellData = {
  value: unknown;
  ids?: string[];
  display?: { id: string; title: string }[];
  error?: string;
};

/** 表格记录展示数据。 */
export type RowData = {
  id: string;
  createdAt: string;
  cells: Record<string, CellData>;
};

/** 指定表的完整前端展示数据。 */
export type TableData = {
  table: TableMeta;
  fields: FieldMeta[];
  records: RowData[];
};

/** 供应链仪表盘统计数据。 */
export type DashboardData = {
  totalAmount: number;
  riskDist: { name: string; value: number }[];
  warnings: { id: string; sku: string; safe: number; current: number; shortage: number }[];
};
