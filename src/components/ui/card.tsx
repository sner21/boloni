/**
 * 提供 shadcn 风格卡片容器和标题区域组件。
 */

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染卡片容器。
 *
 * @param props 原生 div 属性。
 * @returns 卡片容器。
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("ui-card", className)} {...props} />;
}

/**
 * 渲染卡片头部。
 *
 * @param props 原生 div 属性。
 * @returns 卡片头部容器。
 */
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-card-head", className)} {...props} />;
}

/**
 * 渲染卡片标题。
 *
 * @param props 原生标题属性。
 * @returns 卡片标题。
 */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("ui-card-title", className)} {...props} />;
}

/**
 * 渲染卡片描述。
 *
 * @param props 原生段落属性。
 * @returns 卡片描述文本。
 */
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-card-desc", className)} {...props} />;
}

/**
 * 渲染卡片内容区。
 *
 * @param props 原生 div 属性。
 * @returns 卡片内容区。
 */
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-card-body", className)} {...props} />;
}
