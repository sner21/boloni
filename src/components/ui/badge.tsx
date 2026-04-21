/**
 * 提供 shadcn 风格标签组件。
 */

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染状态标签。
 *
 * @param props 原生 span 属性。
 * @returns 标签组件。
 */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ui-badge", className)} {...props} />;
}
