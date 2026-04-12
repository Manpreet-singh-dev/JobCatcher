"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-bg-tertiary text-text-secondary border border-border",
        pending_approval:
          "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20",
        cv_emailed:
          "bg-accent/10 text-accent border border-accent/20",
        applied_confirmed:
          "bg-accent/10 text-accent border border-accent/20",
        approved:
          "bg-primary/10 text-primary-light border border-primary/20",
        submitted:
          "bg-accent/10 text-accent border border-accent/20",
        failed:
          "bg-accent-warm/10 text-accent-warm border border-accent-warm/20",
        applied:
          "bg-primary/10 text-primary-light border border-primary/20",
        in_review:
          "bg-purple-500/10 text-purple-400 border border-purple-500/20",
        interview:
          "bg-accent/10 text-accent border border-accent/20",
        offer:
          "bg-accent/10 text-accent border border-accent/20",
        rejected:
          "bg-accent-warm/10 text-accent-warm/70 border border-accent-warm/20",
        expired:
          "bg-text-muted/10 text-text-muted border border-text-muted/20",
        success:
          "bg-accent/10 text-accent border border-accent/20",
        warning:
          "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20",
        error:
          "bg-accent-warm/10 text-accent-warm border border-accent-warm/20",
        info:
          "bg-primary/10 text-primary-light border border-primary/20",
        remote:
          "bg-accent/10 text-accent border border-accent/20",
        hybrid:
          "bg-primary/10 text-primary-light border border-primary/20",
        onsite:
          "bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
