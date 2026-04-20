/**
 * 从命令行初始化博洛尼演示数据。
 */

import { loadScriptEnv } from "./env";

loadScriptEnv();

type SqlClient = typeof import("../src/lib/db/client")["sql"];

// seed 执行期间复用的数据库连接，失败时用于统一关闭。
let sqlClient: SqlClient | undefined;

/**
 * 执行供应链 seed 并关闭数据库连接，seed 失败时抛出错误。
 */
async function main() {
  // 动态导入业务模块，确保数据库客户端创建前已经读取 .env。
  const [{ seedSupply }, { sql }] = await Promise.all([
    import("../src/lib/base/seed"),
    import("../src/lib/db/client"),
  ]);
  sqlClient = sql;
  // seed 执行结果，包含三张核心业务表。
  const result = await seedSupply();
  await sqlClient.end();
  console.log("演示数据初始化完成：", result);
}

main().catch(async (error) => {
  await sqlClient?.end();
  console.error(error);
  process.exit(1);
});
