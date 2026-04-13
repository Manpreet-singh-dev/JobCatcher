"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowUpDown, ExternalLink, Loader2 } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import { applications as appApi, ApiError } from "@/lib/api";
import type { Application as BackendApplication } from "@/types";

type AppStatus =
  | "pending_approval"
  | "cv_preparing"
  | "cv_emailed"
  | "applied_confirmed"
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
  createdAt: string;
  status: AppStatus;
}

function mapItems(items: BackendApplication[]): Application[] {
  return items.map((app) => ({
    id: app.id,
    title: app.job?.title || "Unknown Role",
    company: app.job?.company || "Unknown",
    source: app.job?.source || "Unknown",
    appliedDate: app.created_at ? new Date(app.created_at).toLocaleDateString() : "",
    createdAt: app.created_at || "",
    status: app.status as AppStatus,
  }));
}

export default function ApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [sortField, setSortField] = useState<string>("appliedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    const data = await appApi.list({ page: 1, per_page: 100 });
    const items = data.items || [];
    setApps(mapItems(items));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        await fetchApplications();
      } catch {
        if (!cancelled) setApps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchApplications]);

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
    if (sortField === "company") return a.company.localeCompare(b.company) * dir;
    if (sortField === "title") return a.title.localeCompare(b.title) * dir;
    if (sortField === "source") return a.source.localeCompare(b.source) * dir;
    if (sortField === "status") return a.status.localeCompare(b.status) * dir;
    if (sortField === "appliedDate") {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (ta - tb) * dir;
    }
    return 0;
  });

  async function handleSetAsApplied(applicationId: string) {
    setConfirmingId(applicationId);
    try {
      await appApi.confirmApplied(applicationId);
      await fetchApplications();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not mark as applied.";
      alert(msg);
    } finally {
      setConfirmingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="overflow-hidden rounded-xl border border-[#2E2E4A]">
          <div className="h-10 animate-pulse bg-[#1A1A2E]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse border-t border-[#2E2E4A]/50 bg-[#0F0F1A]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F0F0FF]">My applications</h1>
        <p className="text-sm text-[#8888AA]">
          {apps.length} total · For roles where you received a tailored CV by email, use{" "}
          <strong className="text-[#F0F0FF]">Set as applied</strong> after you submit your application (same as the link in the email).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#2E2E4A]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2E2E4A] bg-[#1A1A2E]">
              {[
                { key: "company", label: "Company" },
                { key: "title", label: "Role" },
                { key: "source", label: "Source" },
                { key: "appliedDate", label: "Date added" },
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
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8888AA]">
                  No applications yet.
                </td>
              </tr>
            )}
            {sorted.map((app) => (
              <tr
                key={app.id}
                className="border-b border-[#2E2E4A]/50 transition-colors hover:bg-[#1A1A2E]"
              >
                <td className="px-4 py-3 text-sm text-[#F0F0FF]">{app.company}</td>
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
                <td className="px-4 py-3 text-sm text-[#8888AA]">{app.appliedDate}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {app.status === "cv_emailed" && (
                      <button
                        type="button"
                        disabled={confirmingId === app.id}
                        onClick={() => void handleSetAsApplied(app.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#047857] disabled:opacity-50"
                      >
                        {confirmingId === app.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          "Set as applied"
                        )}
                      </button>
                    )}
                    <Link
                      href={`/applications/${app.id}`}
                      className="inline-flex items-center gap-1 text-xs text-[#6C63FF] hover:text-[#6C63FF]/80"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
