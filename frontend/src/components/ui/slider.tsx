"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  minLabel?: string;
  maxLabel?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, label, minLabel, maxLabel, showValue, formatValue, value, defaultValue, ...props }, ref) => {
  const currentValue = value || defaultValue || [0];

  return (
    <div className="flex flex-col gap-2">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-text-secondary">
              {label}
            </label>
          )}
          {showValue && (
            <span className="text-sm font-medium text-primary">
              {formatValue
                ? currentValue.map(formatValue).join(" - ")
                : currentValue.join(" - ")}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        value={value}
        defaultValue={defaultValue}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-bg-tertiary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        {currentValue.map((_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            className={cn(
              "block h-4 w-4 rounded-full border-2 border-primary bg-bg-primary",
              "transition-all duration-200",
              "hover:bg-primary/20 hover:shadow-[0_0_10px_rgba(108,99,255,0.3)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "disabled:pointer-events-none disabled:opacity-50",
              "cursor-grab active:cursor-grabbing"
            )}
          />
        ))}
      </SliderPrimitive.Root>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between">
          <span className="text-xs text-text-muted">{minLabel}</span>
          <span className="text-xs text-text-muted">{maxLabel}</span>
        </div>
      )}
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
