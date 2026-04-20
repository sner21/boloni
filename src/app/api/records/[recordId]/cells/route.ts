/**
 * 更新指定记录的单元格数据。
 */

import { patchCells } from "@/lib/base/records";
import { fail, ok, readJson } from "@/lib/api/http";
import { patchCellsSchema } from "@/lib/schemas/base";

type Context = { params: Promise<{ recordId: string }> };

/**
 * 局部更新一条记录的多个单元格。
 *
 * @param request 包含 cells 的 HTTP 请求。
 * @param context Next.js 动态路由上下文，提供 recordId。
 * @returns 返回更新后的记录视图。
 */
export async function PATCH(request: Request, context: Context) {
  try {
    // 动态路由中的记录 ID。
    const { recordId } = await context.params;
    // 已通过 Zod 校验的单元格补丁请求体。
    const body = await readJson(request, patchCellsSchema);
    return ok(await patchCells(recordId, body.cells ?? {}));
  } catch (error) {
    return fail(error);
  }
}
