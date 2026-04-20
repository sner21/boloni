/**
 * 执行项目内置 PostgreSQL 初始化迁移 SQL。
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import { createDbOptions, normalizeDbUrl } from "../src/lib/db/options";
import { loadScriptEnv } from "./env";

loadScriptEnv();

// 数据库连接地址，未配置时使用 Docker Compose 默认地址。
const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/supply_base";
// 迁移脚本使用单连接，执行完成后立即关闭。
const sql = postgres(normalizeDbUrl(url), createDbOptions(url, 1));

/**
 * 执行初始化迁移文件，迁移失败时抛出错误。
 */
async function main() {
  // 初始化迁移 SQL 文件路径。
  const file = path.join(process.cwd(), "drizzle", "0000_init.sql");
  // 初始化迁移 SQL 文本，去掉 Windows 编辑器可能写入的 UTF-8 BOM。
  const migration = (await readFile(file, "utf8")).replace(/^\uFEFF/, "");
  await sql.unsafe(migration);
  await sql.end();
  console.log("数据库迁移完成。");
}

main().catch(async (error) => {
  await sql.end();
  console.error(error);
  process.exit(1);
});
