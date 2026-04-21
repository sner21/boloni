/**
 * 提供 shadcn 风格骨架屏组件。
 */

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染骨架占位块。
 *
 * @param props 原生 div 属性。
 * @returns 骨架占位块。
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-skeleton", className)} {...props} />;
}
