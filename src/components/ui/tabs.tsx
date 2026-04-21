/**
 * 提供 shadcn 风格标签页组件，用于公式模板等分组内容展示。
 */

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from "react";

import { cn } from "@/lib/utils";

/**
 * 渲染标签页根节点。
 */
export const Tabs = TabsPrimitive.Root;

/**
 * 渲染标签页列表。
 *
 * @param props TabsList 原始属性。
 */
export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => {
    return <TabsPrimitive.List className={cn("ui-tabs-list", className)} ref={ref} {...props} />;
  },
);

TabsList.displayName = "TabsList";

/**
 * 渲染标签页触发器。
 *
 * @param props TabsTrigger 原始属性。
 */
export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return <TabsPrimitive.Trigger className={cn("ui-tabs-trigger", className)} ref={ref} {...props} />;
});

TabsTrigger.displayName = "TabsTrigger";

/**
 * 渲染标签页内容区。
 *
 * @param props TabsContent 原始属性。
 */
export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  return <TabsPrimitive.Content className={cn("ui-tabs-content", className)} ref={ref} {...props} />;
});

TabsContent.displayName = "TabsContent";
