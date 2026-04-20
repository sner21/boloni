/**
 * 执行博洛尼定制交付预警自动化流程。
 */

import { runInventory } from "@/lib/base/supply";
import { fail, ok } from "@/lib/api/http";

/**
 * 扫描低库存商品并自动创建采购申请。
 *
 * @returns 返回本次自动化新增的采购订单记录 ID 列表。
 */
export async function POST() {
  try {
    return ok(await runInventory());
  } catch (error) {
    return fail(error);
  }
}
