"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import type { AgentStatus } from "@/types";

interface AgentStatusPillProps {
  status: AgentStatus;
  className?: string;
}

const statusConfig = {
  active: {
    label: "ACTIVE",
    dotClass: "bg-accent",
    textClass: "text-accent",
    pulse: true,
  },
  idle: {
    label: "IDLE",
    dotClass: "bg-text-muted",
    textClass: "text-text-muted",
    pulse: false,
  },
  paused: {
    label: "PAUSED",
    dotClass: "bg-text-muted",
    textClass: "text-text-muted",
    pulse: false,
  },
  error: {
    label: "ERROR",
    dotClass: "bg-accent-warm",
    textClass: "text-accent-warm",
    pulse: true,
  },
};

function deriveState(status: AgentStatus): "active" | "idle" | "paused" | "error" {
  if (!status.is_active) return "paused";
  if (status.is_running) return "active";
  return "idle";
}

function AgentStatusPill({ status, className }: AgentStatusPillProps) {
  const state = deriveState(status);
  const config = statusConfig[state];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5",
        "bg-bg-tertiary/80 border border-border",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className={cn("h-2 w-2 rounded-full", config.dotClass)} />
        {config.pulse && (
          <div
            className={cn(
              "absolute h-2 w-2 rounded-full animate-ping",
              config.dotClass,
              "opacity-75"
            )}
          />
        )}
      </div>
      <span className={cn("text-xs font-semibold tracking-wider", config.textClass)}>
        {config.label}
      </span>
      {status.next_run_at && status.is_active && (
        <>
          <span className="text-text-muted">·</span>
          <span className="text-xs text-text-muted">
            Next {formatRelativeTime(status.next_run_at)}
          </span>
        </>
      )}
    </div>
  );
}

export { AgentStatusPill };
