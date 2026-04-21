/**
 * 补充 lucide-react 图标组件的最小类型声明。
 */

declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  export type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  export const Check: Icon;
  export const ChevronDown: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const LayoutDashboard: Icon;
  export const RefreshCw: Icon;
  export const SlidersHorizontal: Icon;
  export const Sparkles: Icon;
  export const Table2: Icon;
  export const Truck: Icon;
}
