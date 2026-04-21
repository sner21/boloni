/**
 * 提供 shadcn 组件复用的类名合并工具。
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 className，并自动去掉冲突的样式类。
 *
 * @param inputs 候选 className 值。
 * @returns 合并后的 className 字符串。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
