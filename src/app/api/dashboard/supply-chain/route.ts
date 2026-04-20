/**
 * 提供博洛尼定制交付仪表盘统计 API。
 */

import { getDashboard } from "@/lib/base/supply";
import { fail, ok } from "@/lib/api/http";

/**
 * 查询采购总金额、风险等级分布和库存预警列表。
 *
 * @returns 返回仪表盘统计数据。
 */
export async function GET() {
  try {
    return ok(await getDashboard());
  } catch (error) {
    return fail(error);
  }
}
