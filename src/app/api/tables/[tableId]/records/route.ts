/**
 * 提供指定业务表的记录查询和记录创建 API。
 */

import { addRecord, listRecords } from "@/lib/base/records";
import { fail, ok, readJson } from "@/lib/api/http";
import { createRecordSchema } from "@/lib/schemas/base";

type Context = { params: Promise<{ tableId: string }> };

/**
 * 查询指定表的记录，并返回已解析的关联字段和公式字段。
 *
 * @param _ 当前接口未使用请求体，仅保留 Request 参数满足 Next.js 签名。
 * @param context Next.js 动态路由上下文，提供 tableId。
 * @returns 返回表元数据、字段列表和记录列表。
 */
export async function GET(_: Request, context: Context) {
  try {
    // 动态路由中的表 ID。
    const { tableId } = await context.params;
    return ok(await listRecords(tableId));
  } catch (error) {
    return fail(error);
  }
}

/**
 * 在指定表中创建一条记录。
 *
 * @param request 包含 cells 的 HTTP 请求。
 * @param context Next.js 动态路由上下文，提供 tableId。
 * @returns 返回创建后的记录视图。
 */
export async function POST(request: Request, context: Context) {
  try {
    // 动态路由中的表 ID。
    const { tableId } = await context.params;
    // 已通过 Zod 校验的记录创建请求体。
    const body = await readJson(request, createRecordSchema);
    return ok(await addRecord(tableId, body.cells ?? {}));
  } catch (error) {
    return fail(error);
  }
}
