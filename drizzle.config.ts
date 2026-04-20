/**
 * 配置 Drizzle Kit 的 schema 路径、迁移输出目录和数据库连接。
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/supply_base",
  },
});
