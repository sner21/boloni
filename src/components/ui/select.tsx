/**
 * 提供 shadcn 风格下拉选择组件，页面层不直接编写原生 option。
 */

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// 清空选择时使用的占位值，避免与真实选项冲突。
const emptyValue = "__empty__";

export type SelectOption = {
  /** 选项值。 */
  value: string;
  /** 选项标签。 */
  label: string;
  /** 选项说明。 */
  helper?: string;
  /** 是否禁用。 */
  disabled?: boolean;
};

type SelectProps = {
  /** 组件 DOM id。 */
  id?: string;
  /** 当前值。 */
  value?: string;
  /** 值变化回调。 */
  onValueChange?: (value: string) => void;
  /** 可选项列表。 */
  options: SelectOption[];
  /** 占位文本。 */
  placeholder?: string;
  /** 是否禁用。 */
  disabled?: boolean;
  /** 触发器追加类名。 */
  className?: string;
  /** 下拉层追加类名。 */
  contentClassName?: string;
};

/**
 * 渲染统一下拉框。
 *
 * @param props 当前值、选项列表、占位文本和交互配置。
 */
export function Select({
  className,
  contentClassName,
  disabled,
  id,
  onValueChange,
  options,
  placeholder = "请选择",
  value,
}: SelectProps) {
  /**
   * 处理下拉框值变化，并把清空占位值映射回空字符串。
   *
   * @param next Radix 返回的新值。
   */
  function handleValueChange(next: string) {
    onValueChange?.(next === emptyValue ? "" : next);
  }

  return (
    <SelectPrimitive.Root disabled={disabled} onValueChange={handleValueChange} value={value || undefined}>
      <SelectPrimitive.Trigger className={cn("ui-select-trigger", className)} id={id}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={16} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className={cn("ui-select-content", contentClassName)} position="popper" sideOffset={6}>
          <SelectPrimitive.Viewport className="ui-select-viewport">
            <SelectPrimitive.Item className="ui-select-item ui-select-empty" value={emptyValue}>
              <span className="ui-select-check" />
              <SelectPrimitive.ItemText>{placeholder}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
            {options.map((option) => (
              <SelectPrimitive.Item
                className="ui-select-item"
                disabled={option.disabled}
                key={option.value}
                value={option.value}
              >
                <span className="ui-select-check">
                  <SelectPrimitive.ItemIndicator asChild>
                    <Check size={14} />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <div className="ui-select-copy">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.helper ? <span className="ui-select-helper">{option.helper}</span> : null}
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
