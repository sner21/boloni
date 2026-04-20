/**
 * 为命令行脚本加载 Next.js 同款环境变量文件。
 */

import { loadEnvConfig } from "@next/env";

/**
 * 加载项目根目录下的 .env、.env.local 等环境变量文件。
 */
export function loadScriptEnv() {
  // 当前 npm 命令所在目录，作为 Next.js 环境变量加载根目录。
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);
}
