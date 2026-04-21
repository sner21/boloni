/**
 * 提供 shadcn 风格按钮组件，统一页面操作与表单交互样式。
 */

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// 按钮样式变体，统一管理视觉层级和尺寸。
const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button-default",
      secondary: "ui-button-secondary",
      outline: "ui-button-outline",
      ghost: "ui-button-ghost",
    },
    size: {
      default: "ui-button-default-size",
      sm: "ui-button-sm",
      icon: "ui-button-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** 是否把样式附着到子节点上。 */
    asChild?: boolean;
  };

/**
 * 渲染统一按钮。
 *
 * @param props 原生按钮属性、视觉层级、尺寸和 asChild 配置。
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    // 根据 asChild 决定使用原生按钮还是子组件插槽。
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ size, variant }), className)} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";
