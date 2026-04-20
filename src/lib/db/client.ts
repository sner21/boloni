/**
 * 创建 Drizzle PostgreSQL 客户端，并在开发环境复用连接。
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { createDbOptions, normalizeDbUrl } from "./options";
import * as schema from "./schema";

// 数据库连接地址，未配置时使用本地 Docker Compose 默认地址。
const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/supply_base";

declare global {
  // eslint-disable-next-line no-var
  /** 开发环境复用的 PostgreSQL 连接，避免热更新时重复建连。 */
  var __supplySql: postgres.Sql | undefined;
}

// PostgreSQL 连接实例。
const sql = globalThis.__supplySql ?? postgres(normalizeDbUrl(url), createDbOptions(url, 10));

if (process.env.NODE_ENV !== "production") {
  globalThis.__supplySql = sql;
}

// Drizzle 数据库客户端。
export const db = drizzle(sql, { schema });
export { sql };
