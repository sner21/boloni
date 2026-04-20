/**
 * 为博洛尼定制订单记录生成 AI 自然语言摘要。
 */

import { summarizeOrder } from "@/lib/base/supply";
import { fail, ok, readJson } from "@/lib/api/http";
import { summaryReqSchema } from "@/lib/schemas/base";

/**
 * 根据采购订单记录调用 AI 摘要生成流程。
 *
 * @param request 包含订单 recordId 的 HTTP 请求。
 * @returns 返回订单摘要文本；请求不合法时返回错误响应。
 */
export async function POST(request: Request) {
  try {
    // 已通过 Zod 校验的订单摘要请求体。
    const body = await readJson(request, summaryReqSchema);
    return ok(await summarizeOrder(body.recordId));
  } catch (error) {
    return fail(error);
  }
}
