"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

function AnimatedValue({ value }: { value: string | number }) {
  const [displayValue, setDisplayValue] = React.useState(typeof value === "number" ? 0 : value);

  React.useEffect(() => {
    if (typeof value !== "number") {
      setDisplayValue(value);
      return;
    }

    let startTime: number;
    const duration = 1000;

    function animate(currentTime: number) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round((value as number) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue}</>;
}

function StatCard({ title, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <Card variant="default" className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-text-muted">{title}</p>
          <p className="text-2xl font-bold text-text-primary animate-count-up">
            <AnimatedValue value={value} />
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              {trendUp !== undefined && (
                trendUp ? (
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-accent-warm" />
                )
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  trendUp === true
                    ? "text-accent"
                    : trendUp === false
                      ? "text-accent-warm"
                      : "text-text-muted"
                )}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
        <div className="rounded-md bg-primary/10 p-2.5 text-primary-light">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default StatCard;
export { StatCard };
