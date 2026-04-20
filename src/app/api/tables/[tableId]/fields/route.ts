/**
 * 为指定业务表添加字段。
 */

import { addField } from "@/lib/base/records";
import { fail, ok, readJson } from "@/lib/api/http";
import { createFieldSchema } from "@/lib/schemas/base";

type Context = { params: Promise<{ tableId: string }> };

/**
 * 为指定表创建字段。
 *
 * @param request 包含字段名称、类型和配置的 HTTP 请求。
 * @param context Next.js 动态路由上下文，提供 tableId。
 * @returns 返回创建后的字段；请求不合法时返回错误响应。
 */
export async function POST(request: Request, context: Context) {
  try {
    const { tableId } = await context.params;
    const body = await readJson(request, createFieldSchema);
    return ok(await addField(tableId, body));
  } catch (error) {
    return fail(error);
  }
}
