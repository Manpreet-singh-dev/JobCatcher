"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Briefcase,
  Building2,
  MapPin,
  ExternalLink,
  Loader2,
} from "lucide-react";
import StatCard from "@/components/stat-card";
import ActivityLog from "@/components/activity-log";
import MatchScoreRing from "@/components/match-score-ring";
import StatusBadge from "@/components/status-badge";
import { cn, formatSalary } from "@/lib/utils";
import { analytics, applications, users, ApiError } from "@/lib/api";
import type { Application, AnalyticsSummary } from "@/types";

interface PendingJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  postedAgo: string;
  tags: string[];
}

interface RecentApplication {
  id: string;
  title: string;
  company: string;
  appliedAt: string;
  matchScore: number;
  status: string;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#00D4AA";
  if (score >= 70) return "#6C63FF";
  if (score >= 55) return "#FFD93D";
  return "#FF6B6B";
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("there");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [pendingApps, setPendingApps] = useState<PendingJob[]>([]);
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [user, summaryData, pendingData, recentData] = await Promise.allSettled([
        users.getMe(),
        analytics.getSummary(),
        applications.list({ status: "pending_approval" as never, page: 1, per_page: 10 }),
        applications.list({ page: 1, per_page: 5 }),
      ]);

      if (user.status === "fulfilled") {
        setUserName(user.value.name || "there");
      }
      if (summaryData.status === "fulfilled") {
        setSummary(summaryData.value);
      }
      if (pendingData.status === "fulfilled") {
        const items = pendingData.value.items || [];
        setPendingApps(items.map((app: Application) => ({
          id: app.id,
          title: app.job?.title || "Unknown Role",
          company: app.job?.company || "Unknown Company",
          location: app.job?.location || "Not specified",
          salary: formatSalary(
            app.job?.salary_min ?? undefined,
            app.job?.salary_max ?? undefined,
            app.job?.salary_currency ?? "USD"
          ),
          matchScore: app.match_score || 0,
          postedAgo: app.created_at ? new Date(app.created_at).toLocaleDateString() : "Recently",
          tags: app.job?.requirements || (app.match_analysis?.matched_skills ?? []).slice(0, 3),
        })));
      }
      if (recentData.status === "fulfilled") {
        const items = recentData.value.items || [];
        setRecentApps(items.map((app: Application) => ({
          id: app.id,
          title: app.job?.title || "Unknown Role",
          company: app.job?.company || "Unknown Company",
          appliedAt: app.created_at ? new Date(app.created_at).toLocaleString() : "",
          matchScore: app.match_score || 0,
          status: app.status,
        })));
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

  async function handleApprove(applicationId: string) {
    setActionId(applicationId);
    try {
      await applications.approve(applicationId);
      await loadDashboard();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not approve application.";
      alert(msg);
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(applicationId: string) {
    setActionId(applicationId);
    try {
      await applications.reject(applicationId);
      await loadDashboard();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not reject application.";
      alert(msg);
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-96 animate-pulse rounded-lg bg-[#252540]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="lg:col-span-2">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-[#F0F0FF]">
          Welcome back, {userName}!
        </h1>
        <p className="mt-1 text-sm text-[#8888AA]">
          {pendingApps.length > 0 ? (
            <>Your agent found <span className="font-semibold text-[#6C63FF]">{pendingApps.length} pending</span> applications.</>
          ) : (
            "Your agent is scanning for matches."
          )}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Applied"
          value={String(summary?.total_applications ?? 0)}
          icon={<Send className="h-5 w-5" />}
          trend={`${summary?.submitted ?? 0} submitted`}
          trendUp={true}
        />
        <StatCard
          title="Approved"
          value={String(summary?.approved ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={`${summary?.approval_rate ?? 0}% approval rate`}
          trendUp={true}
        />
        <StatCard
          title="Avg Match Score"
          value={`${summary?.average_match_score ?? 0}%`}
          icon={<Target className="h-5 w-5" />}
          trend={`${summary?.submission_success_rate ?? 0}% success rate`}
          trendUp={true}
        />
        <StatCard
          title="Pending Approvals"
          value={String(summary?.pending_approval ?? 0)}
          icon={<Clock className="h-5 w-5" />}
          trend="Action needed"
          trendUp={false}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Pending Approvals */}
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F0F0FF]">
              Pending Approvals
            </h2>
            <span className="rounded-full bg-[#FFD93D]/10 px-2.5 py-0.5 text-xs font-medium text-[#FFD93D]">
              {pendingApps.length} waiting
            </span>
          </div>

          <div className="space-y-3">
            {pendingApps.length === 0 && (
              <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-8 text-center">
                <p className="text-sm text-[#8888AA]">No pending approvals right now. Your agent is scanning for matches.</p>
              </div>
            )}
            {pendingApps.map((job) => (
              <div
                key={job.id}
                className="group rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-5 transition-colors hover:border-[#6C63FF]/30"
              >
                <div className="flex items-start gap-4">
                  <div className="hidden sm:block">
                    <MatchScoreRing score={job.matchScore} size={48} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[#F0F0FF]">
                          {job.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#8888AA]">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {job.salary}
                          </span>
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-sm font-bold sm:hidden"
                        style={{ color: getScoreColor(job.matchScore) }}
                      >
                        {job.matchScore}%
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#252540] px-2 py-0.5 text-xs text-[#8888AA]"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="ml-auto text-xs text-[#55557A]">
                        {job.postedAgo}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionId === job.id}
                        onClick={() => void handleApprove(job.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-[#00D4AA] px-3.5 py-1.5 text-xs font-semibold text-[#0F0F1A] transition-colors hover:bg-[#00D4AA]/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionId === job.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionId === job.id}
                        onClick={() => void handleReject(job.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#FF6B6B]/30 px-3.5 py-1.5 text-xs font-medium text-[#FF6B6B] transition-colors hover:bg-[#FF6B6B]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <Link
                        href={`/applications/${job.id}`}
                        className="ml-auto flex items-center gap-1 text-xs text-[#6C63FF] hover:text-[#6C63FF]/80"
                      >
                        View details
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Activity */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F0F0FF]">
              Agent Activity
            </h2>
            <Link
              href="/agent"
              className="text-xs text-[#6C63FF] hover:text-[#6C63FF]/80"
            >
              View all
            </Link>
          </div>
          <div className="mt-4">
            <ActivityLog />
          </div>
        </div>
      </div>

      {/* Recent Applications */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F0F0FF]">
            Recent Applications — Last 5
          </h2>
          <Link
            href="/applications"
            className="flex items-center gap-1 text-sm text-[#6C63FF] hover:text-[#6C63FF]/80"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2E2E4A] text-left text-xs font-medium uppercase tracking-wider text-[#55557A]">
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 pr-4">Applied</th>
                <th className="pb-3 pr-4">Match</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentApps.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-[#8888AA]">
                    No applications yet. The agent will start finding matches once preferences are set.
                  </td>
                </tr>
              )}
              {recentApps.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-[#2E2E4A]/50 transition-colors hover:bg-[#1A1A2E]"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/applications/${app.id}`}
                      className="text-sm font-medium text-[#F0F0FF] hover:text-[#6C63FF]"
                    >
                      {app.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#8888AA]">
                    {app.company}
                  </td>
                  <td className="py-3 pr-4 text-sm text-[#8888AA]">
                    {app.appliedAt}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: getScoreColor(app.matchScore) }}
                    >
                      {app.matchScore}%
                    </span>
                  </td>
                  <td className="py-3">
                    <StatusBadge status={app.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
