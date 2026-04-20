/**
 * 初始化博洛尼演示表和演示记录。
 */

import { seedSupply } from "@/lib/base/seed";
import { fail, ok } from "@/lib/api/http";

/**
 * 创建供应商、商品和采购订单演示数据。
 *
 * @returns 返回三张核心业务表的元数据。
 */
export async function POST() {
  try {
    return ok(await seedSupply());
  } catch (error) {
    return fail(error);
  }
}
