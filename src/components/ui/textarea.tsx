/**
 * 提供 shadcn 风格多行输入框组件。
 */

import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染统一多行输入框。
 *
 * @param props 原生 textarea 属性。
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return <textarea className={cn("ui-textarea", className)} ref={ref} {...props} />;
  },
);

Textarea.displayName = "Textarea";
