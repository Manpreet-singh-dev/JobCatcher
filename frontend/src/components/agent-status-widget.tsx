"use client";

import { Bot, Pause, Play, Settings, Clock, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AgentStatus } from "@/types";

interface AgentStatusWidgetProps {
  status: AgentStatus;
  onPauseResume?: () => void;
  onSettings?: () => void;
  collapsed?: boolean;
  className?: string;
}

const statusConfig = {
  active: {
    icon: Activity,
    label: "Agent Active",
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/20",
  },
  idle: {
    icon: Clock,
    label: "Agent Idle",
    color: "text-text-muted",
    bgColor: "bg-bg-tertiary",
    borderColor: "border-border",
  },
  paused: {
    icon: Pause,
    label: "Agent Paused",
    color: "text-text-muted",
    bgColor: "bg-bg-tertiary",
    borderColor: "border-border",
  },
  error: {
    icon: AlertCircle,
    label: "Agent Error",
    color: "text-accent-warm",
    bgColor: "bg-accent-warm/10",
    borderColor: "border-accent-warm/20",
  },
};

function deriveState(status: AgentStatus): "active" | "idle" | "paused" | "error" {
  if (!status.is_active) return "paused";
  if (status.is_running) return "active";
  return "idle";
}

function AgentStatusWidget({
  status,
  onPauseResume,
  onSettings,
  collapsed = false,
  className,
}: AgentStatusWidgetProps) {
  const state = deriveState(status);
  const config = statusConfig[state];
  const StatusIcon = config.icon;

  if (collapsed) {
    return (
      <div className={cn("flex flex-col items-center gap-2 py-3", className)}>
        <div className={cn("rounded-md p-2", config.bgColor)}>
          <Bot className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="relative">
          <div className={cn("h-2 w-2 rounded-full", state === "active" ? "bg-accent" : state === "error" ? "bg-accent-warm" : "bg-text-muted")} />
          {state === "active" && (
            <div className="absolute inset-0 h-2 w-2 rounded-full bg-accent animate-ping opacity-75" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border p-4 space-y-3",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Status header */}
      <div className="flex items-center gap-2">
        <StatusIcon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>
          {config.label}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        {status.next_run_at && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Next scan</span>
            <span className="text-text-secondary">
              {formatRelativeTime(status.next_run_at)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">Today&apos;s applications</span>
          <span className="text-text-secondary font-medium">
            {status.applications_today}/{status.max_applications_per_day}
          </span>
        </div>
        {status.last_run_at && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Last scan</span>
            <span className="text-text-secondary">
              {formatRelativeTime(status.last_run_at)}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-bg-primary/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${Math.min((status.applications_today / status.max_applications_per_day) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onPauseResume && (
          <Button
            variant={state === "active" ? "secondary" : "primary"}
            size="sm"
            onClick={onPauseResume}
            className="flex-1"
          >
            {state === "active" || state === "idle" ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Resume
              </>
            )}
          </Button>
        )}
        {onSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export { AgentStatusWidget };
