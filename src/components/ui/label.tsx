/**
 * 提供 shadcn 风格表单标签组件。
 */

import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染统一标签。
 *
 * @param props Label 原始属性。
 */
export const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => {
    return <LabelPrimitive.Root className={cn("ui-label", className)} ref={ref} {...props} />;
  },
);

Label.displayName = "Label";
