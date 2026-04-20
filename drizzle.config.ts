/**
 * 配置 Drizzle Kit 的 schema 路径、迁移输出目录和数据库连接。
 */

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit 不是 Next.js 运行时，需要手动读取本地环境变量文件。
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/supply_base",
  },
});
