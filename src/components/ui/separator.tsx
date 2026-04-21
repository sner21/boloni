/**
 * 提供 shadcn 风格分隔线组件。
 */

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染统一分隔线。
 *
 * @param props Separator 原始属性。
 */
export const Separator = forwardRef<
  ElementRef<typeof SeparatorPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", ...props }, ref) => {
  return <SeparatorPrimitive.Root className={cn("ui-separator", className)} orientation={orientation} ref={ref} {...props} />;
});

Separator.displayName = "Separator";
