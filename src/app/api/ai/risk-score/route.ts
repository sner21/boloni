/**
 * 为博洛尼供应商记录生成 AI 履约风险评分。
 */

import { scoreSupplier } from "@/lib/base/supply";
import { fail, ok, readJson } from "@/lib/api/http";
import { riskReqSchema } from "@/lib/schemas/base";

/**
 * 根据供应商记录调用 AI 风险评分流程。
 *
 * @param request 包含 supplier recordId 的 HTTP 请求。
 * @returns 返回风险评分对象；请求不合法时返回错误响应。
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request, riskReqSchema);
    return ok(await scoreSupplier(body.recordId));
  } catch (error) {
    return fail(error);
  }
}
