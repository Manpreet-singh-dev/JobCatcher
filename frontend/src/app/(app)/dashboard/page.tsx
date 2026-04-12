"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  ExternalLink,
  Sparkles,
  FileText,
  Briefcase,
} from "lucide-react";
import { applications, users, ApiError } from "@/lib/api";
import type { Application } from "@/types";

interface ReadyToApplyRow {
  id: string;
  title: string;
  company: string;
  applicationUrl: string | null;
  insight: string | null;
  emailedAt: string;
}

function jobApplyUrl(job: Application["job"]): string | null {
  if (!job || typeof job !== "object") return null;
  const j = job as { apply_url?: string; application_url?: string };
  const u = (j.apply_url ?? j.application_url ?? "").trim();
  return u || null;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-5">
      <div className="mb-3 h-4 w-2/3 rounded bg-[#252540]" />
      <div className="mb-2 h-3 w-1/2 rounded bg-[#252540]" />
      <div className="h-3 w-1/3 rounded bg-[#252540]" />
    </div>
  );
}

function pickMatchInsight(app: Application): string | null {
  const a = app.match_analysis;
  if (!a || typeof a !== "object") return null;
  const reasons = (a as { match_reasons?: unknown }).match_reasons;
  if (Array.isArray(reasons) && reasons.length > 0 && typeof reasons[0] === "string") {
    return reasons[0];
  }
  const skills = (a as { matched_skills?: unknown }).matched_skills;
  if (Array.isArray(skills) && skills.length > 0) {
    const top = skills.slice(0, 3).filter((s): s is string => typeof s === "string");
    if (top.length) return `Strong fit on: ${top.join(", ")}`;
  }
  return null;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("there");
  const [readyToApply, setReadyToApply] = useState<ReadyToApplyRow[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [user, readyData] = await Promise.allSettled([
        users.getMe(),
        applications.list({
          status: "cv_emailed",
          sort_by: "updated_at",
          sort_order: "desc",
          page: 1,
          per_page: 10,
        }),
      ]);

      if (user.status === "fulfilled") {
        setUserName(user.value.name || "there");
      }
      if (readyData.status === "fulfilled") {
        const items = readyData.value.items || [];
        setReadyToApply(
          items.map((app: Application) => ({
            id: app.id,
            title: app.job?.title || "Unknown Role",
            company: app.job?.company || "Unknown Company",
            applicationUrl: jobApplyUrl(app.job),
            insight: pickMatchInsight(app),
            emailedAt: app.updated_at
              ? new Date(app.updated_at).toLocaleString()
              : "",
          }))
        );
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleConfirmAwaiting(applicationId: string) {
    setActionId(applicationId);
    try {
      await applications.confirmApplied(applicationId);
      await loadDashboard();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not confirm.";
      alert(msg);
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-96 animate-pulse rounded-lg bg-[#252540]" />
        <div className="grid grid-cols-1 gap-6">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F0F0FF]">Welcome back, {userName}!</h1>
        <p className="mt-1 text-sm text-[#8888AA]">
          Use <strong className="text-[#F0F0FF]">Jobs Feed</strong> to email yourself a tailored CV PDF and the employer
          posting link for any role. Confirm <strong className="text-[#F0F0FF]">I applied</strong> from the list below
          or on <Link href="/applications" className="text-[#6C63FF] hover:underline">My Applications</Link>.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A52E0]"
          >
            <Briefcase className="h-4 w-4" />
            Open jobs feed
          </Link>
          <Link
            href="/tailor-cv"
            className="inline-flex items-center gap-2 rounded-lg border border-[#2E2E4A] px-4 py-2 text-sm font-medium text-[#6C63FF] hover:border-[#6C63FF]/40"
          >
            <FileText className="h-4 w-4" />
            CV from a posting
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#F0F0FF]">
              <Sparkles className="h-5 w-5 text-[#FFD93D]" />
              Top jobs to apply
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[#8888AA]">
              Roles where you already received a tailored CV by email (newest updates first). Open the posting, apply,
              then mark <strong className="text-[#F0F0FF]">I applied</strong> when done.
            </p>
          </div>
          <Link href="/applications" className="shrink-0 text-sm text-[#6C63FF] hover:text-[#6C63FF]/80">
            All applications →
          </Link>
        </div>

        {readyToApply.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-[#2E2E4A] bg-[#0F0F1A]/50 px-4 py-8 text-center text-sm text-[#8888AA]">
            Nothing queued yet. From{" "}
            <Link href="/jobs" className="text-[#6C63FF] hover:underline">
              Jobs Feed
            </Link>
            , use <strong className="text-[#F0F0FF]">Email CV + posting link</strong> on a listing—we will email the PDF
            and application link.
          </p>
        ) : (
          <ul className="mt-5 space-y-4">
            {readyToApply.map((row, idx) => (
              <li
                key={row.id}
                className="rounded-lg border border-[#2E2E4A] bg-[#0F0F1A]/40 p-4 transition-colors hover:border-[#6C63FF]/30"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2E2E4A] bg-[#252540] text-sm font-bold text-[#6C63FF]">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="rounded bg-[#6C63FF]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6C63FF]">
                        #{idx + 1} pick
                      </span>
                      <Link
                        href={`/applications/${row.id}`}
                        className="text-base font-semibold text-[#F0F0FF] hover:text-[#6C63FF]"
                      >
                        {row.title}
                      </Link>
                    </div>
                    <p className="mt-0.5 text-sm text-[#8888AA]">{row.company}</p>
                    {row.insight && (
                      <p className="mt-2 text-xs leading-relaxed text-[#55557A]">{row.insight}</p>
                    )}
                    <p className="mt-2 text-xs text-[#55557A]">CV emailed · {row.emailedAt || "recently"}</p>
                  </div>
                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {row.applicationUrl && (
                        <a
                          href={row.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#2E2E4A] bg-[#1A1A2E] px-3 py-1.5 text-xs font-medium text-[#F0F0FF] hover:border-[#6C63FF]/50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Job posting
                        </a>
                      )}
                      <Link
                        href={`/applications/${row.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2E2E4A] px-3 py-1.5 text-xs font-medium text-[#6C63FF] hover:bg-[#6C63FF]/10"
                      >
                        Application details
                      </Link>
                    </div>
                    <button
                      type="button"
                      disabled={actionId === row.id}
                      onClick={() => void handleConfirmAwaiting(row.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-50"
                    >
                      {actionId === row.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "I applied"
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
