/**
 * 创建博洛尼全屋定制演示表结构和演示记录，保证 seed 可以重复执行。
 */

import { eq } from "drizzle-orm";

import { addField, addRecord, listRecords } from "@/lib/base/records";
import { db } from "@/lib/db/client";
import { fields, tables } from "@/lib/db/schema";
import type { FieldConfig, FieldType } from "@/lib/schemas/base";

type RecordList = Awaited<ReturnType<typeof listRecords>>;

/**
 * 初始化博洛尼全屋定制供应链演示数据。
 *
 * @returns 返回供应商表、商品表和采购订单表元数据。
 */
export async function seedSupply() {
  // 博洛尼供应商业务表。
  const suppliers = await ensureTable("博洛尼供应商表", "suppliers");
  // 博洛尼产品业务表。
  const products = await ensureTable("博洛尼产品表", "products");
  // 博洛尼定制订单业务表。
  const orders = await ensureTable("博洛尼定制订单表", "purchase-orders");

  await ensureField(suppliers.id, "名称", "text");
  await ensureField(suppliers.id, "风险等级", "singleSelect", { options: ["低", "中", "高"] });
  await ensureField(suppliers.id, "预警处理联系人", "multiSelect", {
    options: ["张三", "李四", "王五"],
  });
  await ensureField(suppliers.id, "历史延迟天数", "number");
  await ensureField(suppliers.id, "AI 风险评分", "aiScore");

  await ensureField(products.id, "SKU 关键属性", "text");
  await ensureField(products.id, "安全库存", "number");
  await ensureField(products.id, "当前库存", "number");

  await ensureField(orders.id, "关联供应商", "link", { targetTableId: suppliers.id });
  await ensureField(orders.id, "关联商品", "link", { targetTableId: products.id });
  await ensureField(orders.id, "采购数量", "number");
  await ensureField(orders.id, "单价", "number");
  await ensureField(orders.id, "总金额", "formula", {
    formula: {
      kind: "call",
      op: "MULTIPLY",
      args: [
        { kind: "field", fieldName: "采购数量" },
        { kind: "field", fieldName: "单价" },
      ],
    },
  });
  await ensureField(orders.id, "物流费单价", "number");
  await ensureField(orders.id, "体积数", "number");
  await ensureField(orders.id, "总运费", "formula", {
    formula: {
      kind: "call",
      op: "MULTIPLY",
      args: [
        { kind: "call", op: "CEIL", args: [{ kind: "field", fieldName: "体积数" }] },
        { kind: "field", fieldName: "物流费单价" },
      ],
    },
  });
  await ensureField(orders.id, "计件运费", "formula", {
    formula: {
      kind: "call",
      op: "DIVIDE",
      args: [
        { kind: "field", fieldName: "总运费" },
        { kind: "field", fieldName: "采购数量" },
      ],
    },
  });
  await ensureField(orders.id, "订单摘要", "aiText");

  await seedRows(suppliers.id, products.id, orders.id);

  return { suppliers, products, orders };
}

/**
 * 确保指定 slug 的业务表存在。
 *
 * @param name 表展示名称。
 * @param slug 表唯一 slug。
 * @returns 已存在、已改名或新创建的表记录。
 */
async function ensureTable(name: string, slug: string) {
  // 已存在的表记录。
  const [found] = await db.select().from(tables).where(eq(tables.slug, slug)).limit(1);
  if (found) {
    if (found.name === name) return found;
    // 已存在旧演示表时，仅更新展示名，不改 slug 和表结构。
    const [updated] = await db.update(tables).set({ name }).where(eq(tables.id, found.id)).returning();
    return updated;
  }
  // 新创建的表记录。
  const [created] = await db.insert(tables).values({ name, slug }).returning();
  return created;
}

/**
 * 确保指定字段存在。
 *
 * @param tableId 目标表 ID。
 * @param name 字段展示名称。
 * @param type 字段类型。
 * @param config 字段配置。
 * @returns 已存在或新创建的字段记录。
 */
async function ensureField(
  tableId: string,
  name: string,
  type: FieldType,
  config: FieldConfig = {},
) {
  // 当前表已有字段列表，用于避免重复创建。
  const all = await db.select().from(fields).where(eq(fields.tableId, tableId));
  // 已存在的同名字段。
  const existing = all.find((field) => field.name === name);
  if (existing) return existing;
  return addField(tableId, { name, type, config });
}

/**
 * 初始化博洛尼供应商、产品和定制订单演示记录。
 *
 * @param supplierId 供应商表 ID。
 * @param productId 商品表 ID。
 * @param orderId 采购订单表 ID。
 */
async function seedRows(supplierId: string, productId: string, orderId: string) {
  // 当前供应商记录，用于判断是否需要创建演示数据。
  const suppliers = await listRecords(supplierId);
  if (!hasValue(suppliers, "名称", "意境木作板材供应中心")) {
    await addRecord(supplierId, {
      名称: "意境木作板材供应中心",
      风险等级: "中",
      预警处理联系人: ["设计交付组", "工程采购组"],
      历史延迟天数: 6,
    });
    await addRecord(supplierId, {
      名称: "岩板石材加工工坊",
      风险等级: "高",
      预警处理联系人: ["工程采购组"],
      历史延迟天数: 13,
    });
    await addRecord(supplierId, {
      名称: "德国五金铰链伙伴",
      风险等级: "低",
      预警处理联系人: ["项目运营组"],
      历史延迟天数: 2,
    });
  }

  // 当前商品记录，用于判断是否需要创建演示数据。
  const products = await listRecords(productId);
  if (!hasValue(products, "SKU 关键属性", "致境MAX岛台模块")) {
    await addRecord(productId, { "SKU 关键属性": "致境MAX岛台模块｜岩板木纹", 安全库存: 80, 当前库存: 46 });
    await addRecord(productId, { "SKU 关键属性": "指挥家PRO隐藏电器套组", 安全库存: 35, 当前库存: 42 });
    await addRecord(productId, { "SKU 关键属性": "鉴赏家PRO智能收纳系统", 安全库存: 120, 当前库存: 74 });
    await addRecord(productId, { "SKU 关键属性": "曼恩门墙系统饰面组件", 安全库存: 160, 当前库存: 118 });
  }

  // 创建订单前重新读取供应商，确保拿到刚刚创建的记录 ID。
  const freshSuppliers = await listRecords(supplierId);
  // 创建订单前重新读取商品，确保拿到刚刚创建的记录 ID。
  const freshProducts = await listRecords(productId);
  // 当前订单记录，用于避免重复创建演示订单。
  const orders = await listRecords(orderId);
  if (!hasValue(orders, "订单摘要", "博洛尼")) {
    // 博洛尼示例订单优先关联本次品牌化演示数据。
    const woodSupplier = findByValue(freshSuppliers, "名称", "意境木作板材供应中心") ?? freshSuppliers.records[0];
    // 岩板石材供应商，用于高风险示例订单。
    const stoneSupplier = findByValue(freshSuppliers, "名称", "岩板石材加工工坊") ?? freshSuppliers.records[1];
    // 致境MAX产品记录。
    const islandModule = findByValue(freshProducts, "SKU 关键属性", "致境MAX岛台模块") ?? freshProducts.records[0];
    // 智能收纳产品记录。
    const smartStorage = findByValue(freshProducts, "SKU 关键属性", "鉴赏家PRO智能收纳系统") ?? freshProducts.records[2];

    await addRecord(orderId, {
      关联供应商: woodSupplier?.id ? [woodSupplier.id] : [],
      关联商品: islandModule?.id ? [islandModule.id] : [],
      采购数量: 36,
      单价: 12800,
      物流费单价: 420,
      体积数: 18.6,
      订单摘要: "博洛尼致境MAX智慧厨房项目补充岛台模块，优先保障全屋定制交付节点。",
    });
    await addRecord(orderId, {
      关联供应商: stoneSupplier?.id ? [stoneSupplier.id] : [],
      关联商品: smartStorage?.id ? [smartStorage.id] : [],
      采购数量: 72,
      单价: 3600,
      物流费单价: 280,
      体积数: 11.3,
      订单摘要: "博洛尼鉴赏家PRO项目补充智能收纳系统，关注石材与柜体协同到货风险。",
    });
  }
}

/**
 * 判断记录列表中是否存在包含指定文本的字段值。
 *
 * @param list 表记录列表。
 * @param fieldName 字段名称。
 * @param expected 需要匹配的文本片段。
 * @returns 找到匹配记录时返回 true。
 */
function hasValue(list: RecordList, fieldName: string, expected: string) {
  return Boolean(findByValue(list, fieldName, expected));
}

/**
 * 按字段值查找记录。
 *
 * @param list 表记录列表。
 * @param fieldName 字段名称。
 * @param expected 需要匹配的文本片段。
 * @returns 找到的第一条记录；未找到时返回 undefined。
 */
function findByValue(list: RecordList, fieldName: string, expected: string) {
  // 用于读取目标单元格的字段元数据。
  const field = list.fields.find((item) => item.name === fieldName);
  if (!field) return undefined;
  return list.records.find((record) => String(record.cells[field.id]?.value ?? "").includes(expected));
}
