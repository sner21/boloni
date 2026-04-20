/**
 * 定义博洛尼定制协同台的应用根布局和页面元信息。
 */

import type { Metadata } from "next";

import "./globals.css";

// 页面级 SEO 元信息，供 Next.js 生成 HTML head。
export const metadata: Metadata = {
  title: "Boloni Base",
  description: "博洛尼全屋定制供应链协同系统",
};

/**
 * 渲染应用根布局。
 *
 * @param props 包含当前页面 children 的布局参数。
 * @returns 包裹页面内容的 HTML 根结构。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
