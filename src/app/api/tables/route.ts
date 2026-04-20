/**
 * 提供表列表查询和新表创建 API。
 */

import { createTable, listTables } from "@/lib/base/records";
import { fail, ok, readJson } from "@/lib/api/http";
import { createTableSchema } from "@/lib/schemas/base";

/**
 * 查询所有业务表。
 *
 * @returns 返回表元数据列表的 JSON 响应。
 */
export async function GET() {
  try {
    return ok(await listTables());
  } catch (error) {
    return fail(error);
  }
}

/**
 * 创建一张新的业务表。
 *
 * @param request 包含表名称和 slug 的 HTTP 请求。
 * @returns 返回创建后的表元数据；请求不合法时返回错误响应。
 */
export async function POST(request: Request) {
  try {
    // 已通过 Zod 校验的建表请求体。
    const body = await readJson(request, createTableSchema);
    return ok(await createTable(body));
  } catch (error) {
    return fail(error);
  }
}
