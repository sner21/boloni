/**
 * 补充 lucide-react 图标组件的最小类型声明。
 */

declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  export type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  export const RefreshCw: Icon;
  export const Sparkles: Icon;
  export const Truck: Icon;
}
