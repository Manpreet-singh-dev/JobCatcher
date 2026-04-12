"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Trash2,
  Settings,
  Clock,
  Target,
  Send,
  Shield,
  Wifi,
  WifiOff,
  Bot,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Mail,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agent as agentApi, preferences as preferencesApi } from "@/lib/api";
import type { AgentLog as BackendLog } from "@/types";

type AgentState = "active" | "paused" | "error";

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  icon: string;
}

const LOG_ICONS: Record<string, React.ElementType> = {
  search: Search,
  target: Target,
  file: FileText,
  check: CheckCircle2,
  error: XCircle,
  mail: Mail,
  warning: AlertTriangle,
  send: Send,
  bot: Bot,
};

function mapEventTypeToLogStyle(eventType?: string): { type: LogEntry["type"]; icon: string } {
  if (!eventType) return { type: "info", icon: "bot" };
  const e = eventType.toLowerCase();
  if (e.includes("error") || e.includes("fail")) return { type: "error", icon: "error" };
  if (e.includes("scan_complete") || e.includes("match_found") || e.includes("submitted")) return { type: "success", icon: "check" };
  if (e.includes("scan") || e.includes("scrape")) return { type: "info", icon: "search" };
  if (e.includes("tailor")) return { type: "info", icon: "file" };
  if (e.includes("email") || e.includes("approval")) return { type: "info", icon: "mail" };
  if (e.includes("pause") || e.includes("limit") || e.includes("warn")) return { type: "warning", icon: "warning" };
  if (e.includes("manual") || e.includes("trigger") || e.includes("resume")) return { type: "info", icon: "bot" };
  return { type: "info", icon: "bot" };
}

interface AgentConfig {
  activeHours: string;
  maxAppsPerDay: number;
  approvalMode: string;
  minMatchScore: number;
}

interface TodaySummary {
  jobs_scanned: number;
  jobs_matched: number;
  resumes_tailored: number;
  approvals_sent: number;
  applications_submitted: number;
}

const APPROVAL_MODE_LABELS: Record<string, string> = {
  always_ask: "Always Ask",
  auto_above_threshold: "Auto Above Threshold",
  always_auto: "Fully Automatic",
};

function formatTime12(t: string | null | undefined): string {
  if (!t) return "–";
  try {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
  } catch {
    return t;
  }
}

export default function AgentPage() {
  const [loading, setLoading] = useState(true);
  const [agentState, setAgentState] = useState<AgentState>("active");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [config, setConfig] = useState<AgentConfig>({
    activeHours: "Not configured",
    maxAppsPerDay: 5,
    approvalMode: "Always Ask",
    minMatchScore: 75,
  });
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    jobs_scanned: 0,
    jobs_matched: 0,
    resumes_tailored: 0,
    approvals_sent: 0,
    applications_submitted: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [statusData, logsData, prefsData, summaryData] = await Promise.allSettled([
        agentApi.getStatus(),
        agentApi.getLogs({ page: 1, per_page: 50 }),
        preferencesApi.get(),
        agentApi.getTodaySummary(),
      ]);

      if (statusData.status === "fulfilled") {
        const s = statusData.value;
        setAgentState(s.is_active ? "active" : "paused");
        setDailyUsed(s.applications_today);
        setDailyLimit(s.max_applications_per_day);
      }

      if (logsData.status === "fulfilled") {
        const rawLogs = (logsData.value as unknown as { items: BackendLog[] }).items || [];
        setLogs(rawLogs.map((log) => {
          const style = mapEventTypeToLogStyle(log.event_type);
          return {
            id: log.id,
            time: log.created_at ? new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false }) : "",
            message: log.message || log.event_type || "Agent event",
            type: style.type,
            icon: style.icon,
          };
        }));
      }

      if (prefsData.status === "fulfilled") {
        const p = prefsData.value;
        const start = formatTime12(p.agent_active_hours_start);
        const end = formatTime12(p.agent_active_hours_end);
        const tz = p.agent_timezone || "";
        const activeHours =
          start !== "–" && end !== "–"
            ? `${start} – ${end}${tz ? ` ${tz}` : ""}`
            : "Not configured";

        setConfig({
          activeHours,
          maxAppsPerDay: p.max_applications_per_day ?? 5,
          approvalMode: APPROVAL_MODE_LABELS[p.approval_mode ?? "always_ask"] || p.approval_mode || "Always Ask",
          minMatchScore: p.min_match_score ?? 75,
        });
      }

      if (summaryData.status === "fulfilled") {
        setTodaySummary(summaryData.value);
      }
    } catch {
      // API not available
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePauseResume = useCallback(async () => {
    setActionLoading("pause");
    try {
      if (agentState === "active") {
        await agentApi.pause();
        setAgentState("paused");
      } else {
        await agentApi.resume();
        setAgentState("active");
      }
      await fetchData(false);
    } catch {
      alert("Failed to change agent state.");
    } finally {
      setActionLoading(null);
    }
  }, [agentState, fetchData]);

  const handleRunNow = useCallback(async () => {
    setActionLoading("run");
    try {
      await agentApi.runNow();
      const entry: LogEntry = {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString("en-US", { hour12: false }),
        message: "Manual scan triggered by user",
        type: "info",
        icon: "bot",
      };
      setLogs((prev) => [entry, ...prev]);
      setTimeout(() => fetchData(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to trigger scan.");
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  const handleResetLimit = useCallback(async () => {
    setActionLoading("reset");
    try {
      await agentApi.resetDailyLimit();
      await fetchData(false);
    } catch {
      alert("Failed to reset daily limit.");
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  const handleClearQueue = useCallback(async () => {
    setActionLoading("clear");
    try {
      await agentApi.clearQueue();
      await fetchData(false);
    } catch {
      alert("Failed to clear queue.");
    } finally {
      setActionLoading(null);
    }
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="h-32 animate-pulse rounded-xl bg-[#1A1A2E]" />
        <div className="h-96 animate-pulse rounded-xl bg-[#1A1A2E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F0FF]">
            Agent Control Center
          </h1>
          <p className="text-sm text-[#8888AA]">
            Monitor and manage your AI application agent
          </p>
        </div>
        <Link
          href="/preferences"
          className="flex items-center gap-2 rounded-xl border border-[#2E2E4A] px-4 py-2 text-sm text-[#8888AA] transition-colors hover:border-[#6C63FF]/50 hover:text-[#F0F0FF]"
        >
          <Settings className="h-4 w-4" />
          Full Settings
        </Link>
      </div>

      {/* Agent Status */}
      <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {/* Status Indicator */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl",
                agentState === "active" && "animate-pulse-glow bg-[#00D4AA]/20",
                agentState === "paused" && "bg-[#FFD93D]/20",
                agentState === "error" && "bg-[#FF6B6B]/20"
              )}
            >
              {agentState === "active" ? (
                <Wifi className="h-10 w-10 text-[#00D4AA]" />
              ) : agentState === "paused" ? (
                <Pause className="h-10 w-10 text-[#FFD93D]" />
              ) : (
                <WifiOff className="h-10 w-10 text-[#FF6B6B]" />
              )}
            </div>
            <div>
              <p className="text-sm text-[#8888AA]">Agent Status</p>
              <p
                className={cn(
                  "text-2xl font-bold capitalize",
                  agentState === "active" && "text-[#00D4AA]",
                  agentState === "paused" && "text-[#FFD93D]",
                  agentState === "error" && "text-[#FF6B6B]"
                )}
              >
                {agentState}
              </p>
              <p className="text-xs text-[#55557A]">
                {agentState === "active"
                  ? "Scanning and applying automatically"
                  : agentState === "paused"
                    ? "Agent is paused, no actions being taken"
                    : "An error occurred, check logs for details"}
              </p>
            </div>
          </div>

          {/* Daily Usage */}
          <div className="flex-1 sm:text-right">
            <p className="text-sm text-[#8888AA]">
              Daily Applications
            </p>
            <p className="text-2xl font-bold text-[#F0F0FF]">
              {dailyUsed}
              <span className="text-base text-[#55557A]">/{dailyLimit}</span>
            </p>
            <div className="mt-2 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-[#252540] sm:ml-auto">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(dailyUsed / dailyLimit) * 100}%`,
                  backgroundColor:
                    dailyUsed >= dailyLimit ? "#FF6B6B" : "#6C63FF",
                }}
              />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#2E2E4A] pt-6">
          <button
            onClick={handlePauseResume}
            disabled={actionLoading === "pause"}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
              agentState === "active"
                ? "bg-[#FFD93D]/10 text-[#FFD93D] hover:bg-[#FFD93D]/20"
                : "bg-[#00D4AA]/10 text-[#00D4AA] hover:bg-[#00D4AA]/20"
            )}
          >
            {agentState === "active" ? (
              <>
                <Pause className="h-4 w-4" /> {actionLoading === "pause" ? "Pausing..." : "Pause Agent"}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> {actionLoading === "pause" ? "Resuming..." : "Resume Agent"}
              </>
            )}
          </button>
          <button
            onClick={handleRunNow}
            disabled={actionLoading === "run" || agentState === "paused"}
            className="flex items-center gap-2 rounded-xl bg-[#6C63FF]/10 px-5 py-2.5 text-sm font-semibold text-[#6C63FF] transition-colors hover:bg-[#6C63FF]/20 disabled:opacity-50"
          >
            <Zap className="h-4 w-4" /> {actionLoading === "run" ? "Triggering..." : "Run Now"}
          </button>
          <button
            onClick={handleResetLimit}
            disabled={actionLoading === "reset"}
            className="flex items-center gap-2 rounded-xl border border-[#2E2E4A] px-5 py-2.5 text-sm font-medium text-[#8888AA] transition-colors hover:border-[#6C63FF]/50 hover:text-[#F0F0FF] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> {actionLoading === "reset" ? "Resetting..." : "Reset Daily Limit"}
          </button>
          <button
            onClick={handleClearQueue}
            disabled={actionLoading === "clear"}
            className="flex items-center gap-2 rounded-xl border border-[#FF6B6B]/30 px-5 py-2.5 text-sm font-medium text-[#FF6B6B] transition-colors hover:bg-[#FF6B6B]/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> {actionLoading === "clear" ? "Clearing..." : "Clear Queue"}
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Log */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E]">
            <div className="flex items-center justify-between border-b border-[#2E2E4A] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#F0F0FF]">
                Agent Activity Log
              </h2>
              <span className="text-xs text-[#55557A]">
                {logs.length} entries
              </span>
            </div>
            <div className="max-h-[500px] overflow-y-auto p-4">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bot className="h-10 w-10 text-[#2E2E4A]" />
                  <p className="mt-3 text-sm text-[#55557A]">No agent activity yet</p>
                  <p className="text-xs text-[#3A3A55]">Logs will appear here when the agent runs</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => {
                    const Icon = LOG_ICONS[log.icon] || Bot;
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[#252540]/50"
                      >
                        <span className="mt-0.5 shrink-0 font-mono text-xs text-[#55557A]">
                          {log.time}
                        </span>
                        <Icon
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            log.type === "success" && "text-[#00D4AA]",
                            log.type === "info" && "text-[#6C63FF]",
                            log.type === "warning" && "text-[#FFD93D]",
                            log.type === "error" && "text-[#FF6B6B]"
                          )}
                        />
                        <p
                          className={cn(
                            "text-sm",
                            log.type === "success" && "text-[#00D4AA]",
                            log.type === "info" && "text-[#8888AA]",
                            log.type === "warning" && "text-[#FFD93D]",
                            log.type === "error" && "text-[#FF6B6B]"
                          )}
                        >
                          {log.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-sm font-semibold text-[#F0F0FF]">
              Agent Configuration
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#8888AA]">
                  <Clock className="h-4 w-4" />
                  Active Hours
                </div>
                <span className="text-sm text-[#F0F0FF] text-right max-w-[160px] truncate" title={config.activeHours}>
                  {config.activeHours}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#8888AA]">
                  <Send className="h-4 w-4" />
                  Max Apps/Day
                </div>
                <span className="text-sm text-[#F0F0FF]">{config.maxAppsPerDay}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#8888AA]">
                  <Shield className="h-4 w-4" />
                  Approval Mode
                </div>
                <span className="text-sm text-[#F0F0FF]">{config.approvalMode}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#8888AA]">
                  <Target className="h-4 w-4" />
                  Min Match Score
                </div>
                <span className="text-sm text-[#F0F0FF]">{config.minMatchScore}%</span>
              </div>
            </div>

            <Link
              href="/preferences"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-[#2E2E4A] py-2.5 text-sm font-medium text-[#6C63FF] transition-colors hover:border-[#6C63FF]/50"
            >
              Edit Settings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-sm font-semibold text-[#F0F0FF]">
              Today&apos;s Summary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8888AA]">Jobs Scanned</span>
                <span className="text-sm font-semibold text-[#F0F0FF]">
                  {todaySummary.jobs_scanned}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8888AA]">Matched</span>
                <span className="text-sm font-semibold text-[#00D4AA]">
                  {todaySummary.jobs_matched}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8888AA]">
                  Resumes Tailored
                </span>
                <span className="text-sm font-semibold text-[#6C63FF]">
                  {todaySummary.resumes_tailored}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8888AA]">
                  Approvals Sent
                </span>
                <span className="text-sm font-semibold text-[#FFD93D]">
                  {todaySummary.approvals_sent}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8888AA]">
                  Applications Submitted
                </span>
                <span className="text-sm font-semibold text-[#00D4AA]">
                  {todaySummary.applications_submitted}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
