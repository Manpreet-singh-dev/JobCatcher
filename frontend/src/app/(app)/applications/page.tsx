"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Columns3,
  Table2,
  Clock,
  ChevronDown,
  GripVertical,
  Building2,
  ExternalLink,
  ArrowUpDown,
} from "lucide-react";
import StatusBadge from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { applications as appApi } from "@/lib/api";
import type { Application as BackendApplication } from "@/types";

type AppStatus =
  | "pending_approval"
  | "approved"
  | "submitted"
  | "rejected"
  | "expired"
  | "failed";

interface Application {
  id: string;
  title: string;
  company: string;
  source: string;
  appliedDate: string;
  matchScore: number;
  status: AppStatus;
  logo?: string;
}

const STATUS_COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "pending_approval", label: "Pending Approval", color: "#FFD93D" },
  { key: "approved", label: "Approved", color: "#6C63FF" },
  { key: "submitted", label: "Submitted", color: "#00D4AA" },
  { key: "rejected", label: "Rejected", color: "#FF6B6B" },
  { key: "expired", label: "Expired", color: "#8888AA" },
  { key: "failed", label: "Failed", color: "#FF6B6B" },
];

function getScoreColor(score: number): string {
  if (score >= 85) return "#00D4AA";
  if (score >= 70) return "#6C63FF";
  if (score >= 55) return "#FFD93D";
  return "#FF6B6B";
}

export default function ApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table" | "timeline">("kanban");
  const [apps, setApps] = useState<Application[]>([]);
  const [sortField, setSortField] = useState<string>("appliedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchApplications() {
      try {
        const data = await appApi.list({ page: 1, per_page: 100 });
        const items = data.items || [];
        setApps(items.map((app: BackendApplication) => ({
          id: app.id,
          title: app.job?.title || "Unknown Role",
          company: app.job?.company || "Unknown",
          source: app.job?.source || "Unknown",
          appliedDate: app.created_at ? new Date(app.created_at).toLocaleDateString() : "",
          matchScore: app.match_score || 0,
          status: app.status as AppStatus,
        })));
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, []);

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const sorted = [...apps].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortField === "matchScore") return (a.matchScore - b.matchScore) * dir;
    if (sortField === "company") return a.company.localeCompare(b.company) * dir;
    return 0;
  });

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 w-72 shrink-0 animate-pulse rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F0FF]">Applications</h1>
          <p className="text-sm text-[#8888AA]">{apps.length} total applications</p>
        </div>
        <div className="flex rounded-lg border border-[#2E2E4A] bg-[#1A1A2E]">
          {(
            [
              { key: "kanban", icon: Columns3, label: "Kanban" },
              { key: "table", icon: Table2, label: "Table" },
              { key: "timeline", icon: Clock, label: "Timeline" },
            ] as const
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors first:rounded-l-lg last:rounded-r-lg",
                view === key
                  ? "bg-[#6C63FF] font-medium text-white"
                  : "text-[#55557A] hover:text-[#8888AA]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => {
            const colApps = apps.filter((a) => a.status === col.key);
            return (
              <div
                key={col.key}
                className="flex w-72 shrink-0 flex-col rounded-xl border border-[#2E2E4A] bg-[#0F0F1A]"
              >
                <div className="flex items-center justify-between border-b border-[#2E2E4A] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-sm font-semibold text-[#F0F0FF]">
                      {col.label}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#252540] px-2 py-0.5 text-xs text-[#8888AA]">
                    {colApps.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {colApps.map((app) => (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="group block rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-3 transition-colors hover:border-[#6C63FF]/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#F0F0FF] group-hover:text-[#6C63FF]">
                            {app.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8888AA]">
                            <Building2 className="h-3 w-3" />
                            {app.company}
                          </p>
                        </div>
                        <span
                          className="ml-2 shrink-0 text-sm font-bold"
                          style={{ color: getScoreColor(app.matchScore) }}
                        >
                          {app.matchScore}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="rounded bg-[#252540] px-1.5 py-0.5 text-[10px] text-[#55557A]">
                          {app.source}
                        </span>
                        <span className="text-[10px] text-[#55557A]">
                          {app.appliedDate}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {colApps.length === 0 && (
                    <p className="py-8 text-center text-xs text-[#55557A]">
                      No applications
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="overflow-x-auto rounded-xl border border-[#2E2E4A]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2E2E4A] bg-[#1A1A2E]">
                {[
                  { key: "company", label: "Company" },
                  { key: "title", label: "Role" },
                  { key: "source", label: "Source" },
                  { key: "appliedDate", label: "Applied Date" },
                  { key: "matchScore", label: "Match %" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#55557A] hover:text-[#8888AA]"
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#55557A]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-[#2E2E4A]/50 transition-colors hover:bg-[#1A1A2E]"
                >
                  <td className="px-4 py-3 text-sm text-[#F0F0FF]">
                    {app.company}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-sm font-medium text-[#F0F0FF] hover:text-[#6C63FF]"
                    >
                      {app.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#252540] px-2 py-0.5 text-xs text-[#8888AA]">
                      {app.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#8888AA]">
                    {app.appliedDate}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: getScoreColor(app.matchScore) }}
                    >
                      {app.matchScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-center gap-1 text-xs text-[#6C63FF] hover:text-[#6C63FF]/80"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline View */}
      {view === "timeline" && (
        <div className="space-y-0">
          {sorted.map((app, idx) => (
            <div key={app.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="h-3 w-3 rounded-full border-2"
                  style={{
                    borderColor: getScoreColor(app.matchScore),
                    backgroundColor:
                      idx === 0 ? getScoreColor(app.matchScore) : "transparent",
                  }}
                />
                {idx < sorted.length - 1 && (
                  <div className="w-px flex-1 bg-[#2E2E4A]" />
                )}
              </div>
              <Link
                href={`/applications/${app.id}`}
                className="group mb-4 flex-1 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-4 transition-colors hover:border-[#6C63FF]/30"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#F0F0FF] group-hover:text-[#6C63FF]">
                      {app.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8888AA]">
                      {app.company} · {app.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-bold"
                      style={{ color: getScoreColor(app.matchScore) }}
                    >
                      {app.matchScore}%
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#55557A]">{app.appliedDate}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
