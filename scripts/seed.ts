/**
 * 从命令行初始化博洛尼演示数据。
 */

import { seedSupply } from "../src/lib/base/seed";
import { sql } from "../src/lib/db/client";

/**
 * 执行供应链 seed 并关闭数据库连接，seed 失败时抛出错误。
 */
async function main() {
  // seed 执行结果，包含三张核心业务表。
  const result = await seedSupply();
  await sql.end();
  console.log("演示数据初始化完成：", result);
}

main().catch(async (error) => {
  await sql.end();
  console.error(error);
  process.exit(1);
});
