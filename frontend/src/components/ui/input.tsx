"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type = "text", ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          ref={ref}
          className={cn(
            "h-10 w-full rounded-md border border-border bg-bg-secondary px-3 text-sm text-text-primary placeholder:text-text-muted",
            "transition-all duration-200",
            "focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 focus:shadow-[0_0_12px_rgba(108,99,255,0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-accent-warm/50 focus:border-accent-warm focus:ring-accent-warm/30",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-accent-warm">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
