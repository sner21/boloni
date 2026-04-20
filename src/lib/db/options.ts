/**
 * 解析 PostgreSQL 连接选项，统一处理云数据库 SSL 配置。
 */

import type postgres from "postgres";

type SslMode = "require" | "allow" | "prefer" | "verify-full";

/**
 * 移除 postgres 驱动不直接支持的连接串参数。
 *
 * @param url 原始 PostgreSQL 连接串。
 * @returns 适合传给 postgres 驱动的连接串。
 */
export function normalizeDbUrl(url: string) {
  try {
    // 标准 URL 对象，用于安全删除 libpq 专属参数。
    const parsed = new URL(url);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * 根据连接串生成 postgres 驱动选项。
 *
 * @param url PostgreSQL 连接串。
 * @param max 最大连接数。
 * @returns postgres 驱动连接选项。
 */
export function createDbOptions(url: string, max: number): postgres.Options<{}> {
  // 基础连接池大小配置，由调用方按运行场景传入。
  const options: postgres.Options<{}> = { max };
  // 连接串中的 sslmode 参数，Neon 等云数据库通常要求 require。
  const sslMode = readSslMode(url);

  if (sslMode === "verify-full") {
    options.ssl = "verify-full";
  } else if (sslMode) {
    // Neon 等云数据库通常需要 TLS，但本地未配置 CA 时用该选项保持加密连接可用。
    options.ssl = { rejectUnauthorized: false };
  }

  return options;
}

/**
 * 读取 PostgreSQL 连接串中的 sslmode 参数。
 *
 * @param url PostgreSQL 连接串。
 * @returns sslmode 参数值；连接串无效或未配置时返回 null。
 */
function readSslMode(url: string): SslMode | null {
  try {
    // URL 查询参数中携带的 SSL 模式。
    const sslMode = new URL(url).searchParams.get("sslmode");
    if (!sslMode) return null;
    if (sslMode === "require" || sslMode === "allow" || sslMode === "prefer" || sslMode === "verify-full") {
      return sslMode;
    }
    return null;
  } catch {
    return null;
  }
}
