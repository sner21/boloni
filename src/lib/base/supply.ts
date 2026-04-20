/**
 * 实现博洛尼全屋定制供应链业务能力，包括 AI 字段生成、交付预警和仪表盘统计。
 */

import { eq } from "drizzle-orm";

import { makeRisk, makeSummary } from "@/lib/ai/provider";
import { addRecord, getRecordView, listRecords, patchCells } from "@/lib/base/records";
import { db } from "@/lib/db/client";
import { notFound } from "@/lib/db/errors";
import { tables } from "@/lib/db/schema";

type FieldMeta = { id: string; name: string; type: string };
type ViewData = Awaited<ReturnType<typeof getRecordView>>;
type ListData = Awaited<ReturnType<typeof listRecords>>;

/**
 * 为博洛尼供应商记录生成并写入 AI 履约风险评分。
 *
 * @param recordId 供应商记录 ID。
 * @returns AI 风险评分结果。
 */
export async function scoreSupplier(recordId: string) {
  // 供应商记录视图，包含字段元数据和单元格值。
  const view = await getRecordView(recordId);
  // 供应商名称，用于风险评分 Prompt。
  const name = String(readNamed(view, "名称") ?? "未知供应商");
  // 历史延迟天数，是风险评分的核心输入。
  const delayDays = Number(readNamed(view, "历史延迟天数") ?? 0);
  // 当前人工风险等级，作为模型参考信号。
  const riskLevel = String(readNamed(view, "风险等级") ?? "");
  // 大模型或 mock 返回的风险评分。
  const result = await makeRisk({ name, delayDays, riskLevel });
  await patchCells(recordId, { "AI 风险评分": result });
  return result;
}

/**
 * 为采购订单生成并写入 AI 摘要。
 *
 * @param recordId 采购订单记录 ID。
 * @returns 生成的订单摘要对象。
 */
export async function summarizeOrder(recordId: string) {
  // 采购订单记录视图。
  const view = await getRecordView(recordId);
  // 订单关联的供应商标题。
  const supplier = linkTitle(view, "关联供应商") ?? "未知供应商";
  // 订单关联的商品标题。
  const product = linkTitle(view, "关联商品") ?? "未知商品";
  // 采购数量。
  const quantity = Number(readNamed(view, "采购数量") ?? 0);
  // 公式字段计算出的总金额。
  const amount = toNumber(readNamed(view, "总金额"));
  // 大模型或 mock 返回的订单摘要。
  const summary = await makeSummary({ supplier, product, quantity, amount });
  await patchCells(recordId, { 订单摘要: summary });
  return { summary };
}

/**
 * 执行博洛尼定制交付预警自动化。
 *
 * @returns 本次自动创建的采购订单记录 ID 列表。
 */
export async function runInventory() {
  // 供应商表，用于给自动订单选择默认供应商。
  const suppliers = await tableBySlug("suppliers");
  // 商品表，用于扫描库存缺口。
  const products = await tableBySlug("products");
  // 采购订单表，用于创建采购申请。
  const orders = await tableBySlug("purchase-orders");
  // 供应商记录列表。
  const supplierRows = await listRecords(suppliers.id);
  // 商品记录列表。
  const productRows = await listRecords(products.id);
  // 当前订单记录列表，用于避免重复生成预警订单。
  const orderRows = await listRecords(orders.id);
  // 默认供应商 ID，演示环境使用第一条供应商。
  const supplierId = supplierRows.records[0]?.id;
  // 本次新创建的采购订单 ID 列表。
  const created: string[] = [];

  for (const product of productRows.records) {
    // 商品安全库存。
    const safe = Number(readRow(productRows, product.id, "安全库存") ?? 0);
    // 商品当前库存。
    const current = Number(readRow(productRows, product.id, "当前库存") ?? 0);
    if (current >= safe) continue;
    if (hasOrder(orderRows, product.id)) continue;

    // 建议补货数量，至少补 1 件。
    const quantity = Math.max(safe - current, 1);
    // 自动生成的采购申请记录。
    const record = await addRecord(orders.id, {
      关联供应商: supplierId ? [supplierId] : [],
      关联商品: [product.id],
      采购数量: quantity,
      单价: 0,
      物流费单价: 0,
      体积数: 0,
      订单摘要: `博洛尼交付预警自动生成，建议为全屋定制项目补货 ${quantity} 件。`,
    });
    created.push(record.record.id);
  }

  return { created };
}

/**
 * 生成博洛尼定制供应链仪表盘统计。
 *
 * @returns 采购总金额、风险分布和库存预警列表。
 */
export async function getDashboard() {
  // 可选供应商表，未初始化时返回空仪表盘。
  const suppliers = await optionalTable("suppliers");
  // 可选商品表，未初始化时返回空仪表盘。
  const products = await optionalTable("products");
  // 可选采购订单表，未初始化时返回空仪表盘。
  const orders = await optionalTable("purchase-orders");
  if (!suppliers || !products || !orders) {
    return { totalAmount: 0, riskDist: [], warnings: [] };
  }

  // 供应商记录列表。
  const supplierRows = await listRecords(suppliers.id);
  // 商品记录列表。
  const productRows = await listRecords(products.id);
  // 采购订单记录列表。
  const orderRows = await listRecords(orders.id);

  // 所有采购订单总金额的聚合值。
  const totalAmount = orderRows.records.reduce(
    (sum, row) => sum + (toNumber(readRow(orderRows, row.id, "总金额")) ?? 0),
    0,
  );

  // 风险等级到供应商数量的聚合映射。
  const riskMap = new Map<string, number>();
  for (const row of supplierRows.records) {
    const level = String(readRow(supplierRows, row.id, "风险等级") ?? "未设置");
    riskMap.set(level, (riskMap.get(level) ?? 0) + 1);
  }

  // 低于安全库存的商品预警列表。
  const warnings = productRows.records
    .map((row) => {
      const safe = Number(readRow(productRows, row.id, "安全库存") ?? 0);
      const current = Number(readRow(productRows, row.id, "当前库存") ?? 0);
      return {
        id: row.id,
        sku: String(readRow(productRows, row.id, "SKU 关键属性") ?? "未命名商品"),
        safe,
        current,
        shortage: Math.max(safe - current, 0),
      };
    })
    .filter((row) => row.shortage > 0);

  return {
    totalAmount,
    riskDist: Array.from(riskMap.entries()).map(([name, value]) => ({ name, value })),
    warnings,
  };
}

/**
 * 从单条记录视图中读取指定字段值。
 *
 * @param view 单条记录视图。
 * @param fieldName 字段名称。
 * @returns 单元格值；字段不存在时返回 null。
 */
function readNamed(view: ViewData, fieldName: string) {
  // 匹配到的字段元数据。
  const field = view.fields.find((item: FieldMeta) => item.name === fieldName);
  return field ? view.record.cells[field.id]?.value : null;
}

/**
 * 从关联字段中读取第一条关联记录标题。
 *
 * @param view 单条记录视图。
 * @param fieldName 关联字段名称。
 * @returns 关联记录标题；不存在时返回 null。
 */
function linkTitle(view: ViewData, fieldName: string) {
  // 匹配到的关联字段元数据。
  const field = view.fields.find((item: FieldMeta) => item.name === fieldName);
  return field ? view.record.cells[field.id]?.display?.[0]?.title : null;
}

/**
 * 从表记录列表中读取指定记录和字段的值。
 *
 * @param list 表记录列表。
 * @param recordId 记录 ID。
 * @param fieldName 字段名称。
 * @returns 单元格值；字段或记录不存在时返回 null。
 */
function readRow(list: ListData, recordId: string, fieldName: string) {
  // 匹配到的字段元数据。
  const field = list.fields.find((item: FieldMeta) => item.name === fieldName);
  // 匹配到的记录。
  const row = list.records.find((item) => item.id === recordId);
  return field && row ? row.cells[field.id]?.value : null;
}

/**
 * 判断指定商品是否已有自动预警生成的订单。
 *
 * @param list 采购订单记录列表。
 * @param productId 商品记录 ID。
 * @returns 已存在自动预警订单时返回 true。
 */
function hasOrder(list: ListData, productId: string) {
  // 采购订单中的商品关联字段。
  const productField = list.fields.find((item: FieldMeta) => item.name === "关联商品");
  // 采购订单中的摘要字段，用于识别自动化创建的订单。
  const summaryField = list.fields.find((item: FieldMeta) => item.name === "订单摘要");
  if (!productField || !summaryField) return false;
  return list.records.some((row) => {
    // 当前订单是否关联该商品。
    const linked = row.cells[productField.id]?.ids?.includes(productId);
    // 当前订单摘要文本。
    const summary = String(row.cells[summaryField.id]?.value ?? "");
    return linked && summary.includes("自动生成");
  });
}

/**
 * 根据 slug 查询业务表，未找到时抛出错误。
 *
 * @param slug 表 slug。
 * @returns 表记录。
 */
async function tableBySlug(slug: string) {
  // 可选表记录。
  const table = await optionalTable(slug);
  if (!table) throw notFound(`表 ${slug} 不存在`);
  return table;
}

/**
 * 根据 slug 查询业务表。
 *
 * @param slug 表 slug。
 * @returns 表记录；不存在时返回 null。
 */
async function optionalTable(slug: string) {
  // 查询到的业务表。
  const [table] = await db.select().from(tables).where(eq(tables.slug, slug)).limit(1);
  return table ?? null;
}

/**
 * 把任意值转换成数字。
 *
 * @param value 原始值。
 * @returns 有效数字；无法转换时返回 null。
 */
function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
