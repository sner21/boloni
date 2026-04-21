/**
 * 提供 shadcn 风格输入框组件。
 */

import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染统一输入框。
 *
 * @param props 原生 input 属性。
 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return <input className={cn("ui-input", className)} ref={ref} {...props} />;
});

Input.displayName = "Input";
