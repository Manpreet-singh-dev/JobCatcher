"use client";

import * as React from "react";
import { cn, formatDate } from "@/lib/utils";
import type { AgentLog } from "@/types";

interface ActivityLogProps {
  logs?: AgentLog[];
  maxHeight?: string;
  className?: string;
}

const logTypeConfig: Record<
  string,
  { icon: string; color: string }
> = {
  scanning: { icon: "\uD83D\uDD0D", color: "text-primary-light" },
  found: { icon: "\u2705", color: "text-accent" },
  scoring: { icon: "\uD83E\uDDE0", color: "text-primary-light" },
  match: { icon: "\uD83D\uDCCA", color: "text-accent-yellow" },
  tailoring: { icon: "\u270D\uFE0F", color: "text-primary-light" },
  email: { icon: "\uD83D\uDCE7", color: "text-accent" },
  waiting: { icon: "\u23F8", color: "text-text-muted" },
  error: { icon: "\u274C", color: "text-accent-warm" },
  info: { icon: "\u2139\uFE0F", color: "text-text-secondary" },
};

const defaultLogs: AgentLog[] = [];

function ActivityLog({ logs, maxHeight = "400px", className }: ActivityLogProps) {
  const displayLogs = logs ?? defaultLogs;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLogs, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

  return (
    <div className={cn("flex flex-col rounded-md border border-border bg-bg-secondary/50", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        <div className="space-y-0.5 p-3">
          {displayLogs.length === 0 ? (
            <p className="text-sm text-text-muted font-mono py-4 text-center">
              No activity logs yet...
            </p>
          ) : (
            displayLogs.map((log) => {
              const eventKey = log.event_type || "info";
              const config = logTypeConfig[eventKey] || logTypeConfig.info;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 py-1.5 px-2 rounded hover:bg-bg-tertiary/50 transition-colors"
                >
                  <span className="text-sm shrink-0 mt-0.5 w-5 text-center">
                    {config.icon}
                  </span>
                  <span className={cn("text-sm font-mono flex-1", config.color)}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      {!autoScroll && displayLogs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="mx-auto my-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary-light hover:bg-primary/20 transition-colors"
        >
          Scroll to latest
        </button>
      )}
    </div>
  );
}

export default ActivityLog;
export { ActivityLog };
