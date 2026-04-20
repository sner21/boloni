/**
 * 配置 Next.js 构建行为和文件追踪根目录。
 */

import type { NextConfig } from "next";
import path from "node:path";

// Next.js 项目配置。
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve("."),
};

export default nextConfig;
