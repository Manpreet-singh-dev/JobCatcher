"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Download,
  FileText,
  Check,
  Bot,
  Mail,
  User,
  Send,
  ExternalLink,
  Loader2,
  Globe,
  Users,
  CalendarDays,
} from "lucide-react";
import StatusBadge from "@/components/status-badge";
import { cn, formatSalary } from "@/lib/utils";
import { applications as appApi, ApiError } from "@/lib/api";
import type { Application } from "@/types";

interface AppDetailData {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  workMode: string;
  source: string;
  postedDate: string;
  status: string;
  description: string;
  requirements: string[];
  niceToHave: string[];
  matchAnalysis: {
    reasons: string[];
    skillsYouHave: string[];
    skillsRequired: string[];
  };
  timeline: { time: string; event: string; icon: string; color: string }[];
}

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  bot: Bot,
  check: Check,
  file: FileText,
  mail: Mail,
  user: User,
  send: Send,
};

export default function ApplicationDetailPage() {
  const params = useParams();
  const confirmBannerShown = useRef(false);
  const [loading, setLoading] = useState(true);
  const [activeResumeTab, setActiveResumeTab] = useState<"original" | "tailored" | "diff">("tailored");
  const [notes, setNotes] = useState("");
  const [appData, setAppData] = useState<AppDetailData | null>(null);
  const [statusOverride, setStatusOverride] = useState("cv_emailed");
  const [error, setError] = useState<string | null>(null);
  const [confirmAppliedLoading, setConfirmAppliedLoading] = useState(false);

  const reloadApplication = useCallback(async () => {
    const id = params.id as string;
    const data: Application = await appApi.getById(id);
    const job = data.job;
    const analysis = data.match_analysis;

    setAppData({
      id: data.id,
      title: job?.title || "Unknown Role",
      company: job?.company || "Unknown Company",
      location: job?.location || "Not specified",
      salary: formatSalary(
        job?.salary_min ?? undefined,
        job?.salary_max ?? undefined,
        job?.salary_currency ?? "USD"
      ),
      workMode: job?.work_mode || "Not specified",
      source: job?.source || "Unknown",
      postedDate: job?.posted_at ? new Date(job.posted_at).toLocaleDateString() : "",
      status: data.status,
      description: job?.description || "No description available.",
      requirements: job?.requirements || [],
      niceToHave: [],
      matchAnalysis: {
        reasons: analysis?.match_reasons || [],
        skillsYouHave: analysis?.matched_skills || [],
        skillsRequired: analysis?.missing_skills || [],
      },
      timeline: [
        {
          time: new Date(data.created_at).toLocaleString(),
          event:
            data.status === "cv_emailed" || data.status === "applied_confirmed"
              ? "Tailored CV generated for this role"
              : "Application created by agent",
          icon: "bot",
          color: "#6C63FF",
        },
        ...(data.status === "cv_emailed" || data.status === "applied_confirmed"
          ? [
              {
                time: new Date(data.updated_at).toLocaleString(),
                event: "PDF emailed to your inbox",
                icon: "mail",
                color: "#00D4AA",
              },
            ]
          : []),
        ...(data.status === "applied_confirmed" && data.user_applied_confirmed_at
          ? [
              {
                time: new Date(data.user_applied_confirmed_at).toLocaleString(),
                event: "You confirmed you applied — shown under Recent applications",
                icon: "check",
                color: "#00D4AA",
              },
            ]
          : []),
        ...(data.approval_action_at
          ? [
              {
                time: new Date(data.approval_action_at).toLocaleString(),
                event: `You ${data.status === "rejected" ? "rejected" : "approved"} the application`,
                icon: "user",
                color: data.status === "rejected" ? "#FF6B6B" : "#00D4AA",
              },
            ]
          : []),
        ...(data.submitted_at
          ? [
              {
                time: new Date(data.submitted_at).toLocaleString(),
                event: "Application submitted",
                icon: "send",
                color: "#00D4AA",
              },
            ]
          : []),
      ],
    });
    setStatusOverride(data.status);
    setNotes(data.user_notes || "");
  }, [params.id]);

  useEffect(() => {
    async function fetchApplication() {
      try {
        await reloadApplication();
      } catch {
        setError("Failed to load application details.");
      } finally {
        setLoading(false);
      }
    }
    void fetchApplication();
  }, [params.id, reloadApplication]);

  useEffect(() => {
    if (loading || !appData || confirmBannerShown.current) return;
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const applied = q.get("applied");
    const already = q.get("already_confirmed");
    if (applied === "1" || already === "1") {
      confirmBannerShown.current = true;
      if (already === "1") {
        alert("You already confirmed this application earlier.");
      } else {
        alert("Thanks — this role is now listed under Recent applications on your dashboard.");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loading, appData]);

  async function handleConfirmAppliedFromDetail() {
    if (!appData) return;
    setConfirmAppliedLoading(true);
    try {
      await appApi.confirmApplied(appData.id);
      await reloadApplication();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not confirm.";
      alert(msg);
    } finally {
      setConfirmAppliedLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-[#252540]" />
        <div className="h-8 w-96 animate-pulse rounded bg-[#252540]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-64 animate-pulse rounded-xl bg-[#1A1A2E]" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-[#1A1A2E]" />
        </div>
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className="p-6">
        <Link href="/applications" className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#8888AA] hover:text-[#F0F0FF]">
          <ArrowLeft className="h-4 w-4" /> Back to Applications
        </Link>
        <div className="mt-4 rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 p-6 text-center text-sm text-[#FF6B6B]">
          {error || "Application not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Link
          href="/applications"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#8888AA] hover:text-[#F0F0FF]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F0F0FF]">
              {appData.title}{" "}
              <span className="text-[#8888AA]">at {appData.company}</span>
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8888AA]">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {appData.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {appData.salary}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {appData.workMode}
              </span>
              {appData.postedDate && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  Posted {appData.postedDate}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={appData.status} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Job Description */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#F0F0FF]">
              Job Description
            </h2>
            <div className="whitespace-pre-line text-sm leading-relaxed text-[#8888AA]">
              {appData.description}
            </div>
          </div>

          {/* Requirements */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#F0F0FF]">
              Requirements
            </h2>
            <ul className="space-y-2">
              {appData.requirements.map((req, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-[#8888AA]"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00D4AA]" />
                  {req}
                </li>
              ))}
            </ul>
            {appData.niceToHave.length > 0 && (
              <>
                <h3 className="mb-3 mt-5 text-sm font-semibold text-[#F0F0FF]">
                  Nice to Have
                </h3>
                <ul className="space-y-2">
                  {appData.niceToHave.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-[#55557A]"
                    >
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#55557A]" />
                      {req}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Company Info */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#F0F0FF]">
              About {appData.company}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-[#55557A]">Source</p>
                <p className="mt-0.5 text-sm text-[#F0F0FF]">{appData.source}</p>
              </div>
              <div>
                <p className="text-xs text-[#55557A]">Work Mode</p>
                <p className="mt-0.5 text-sm text-[#F0F0FF]">{appData.workMode}</p>
              </div>
              <div>
                <p className="text-xs text-[#55557A]">Status</p>
                <p className="mt-0.5 text-sm text-[#F0F0FF] capitalize">{appData.status.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* Resume Section */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F0F0FF]">Resume</h2>
              <button className="flex items-center gap-1.5 rounded-lg bg-[#6C63FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5A52E0]">
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
            <div className="flex gap-1 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] p-1">
              {(["original", "tailored", "diff"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveResumeTab(tab)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors",
                    activeResumeTab === tab
                      ? "bg-[#6C63FF] text-white"
                      : "text-[#55557A] hover:text-[#8888AA]"
                  )}
                >
                  {tab === "diff" ? "Diff View" : tab}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] p-6">
              {activeResumeTab === "original" && (
                <div className="space-y-3 text-sm text-[#8888AA]">
                  <p className="font-semibold text-[#F0F0FF]">Alex Johnson</p>
                  <p>Senior Software Engineer · 6 years experience</p>
                  <p>React, TypeScript, Node.js, Next.js, PostgreSQL, AWS</p>
                  <hr className="border-[#2E2E4A]" />
                  <p>
                    Experienced software engineer specializing in building
                    scalable web applications with modern frontend technologies.
                  </p>
                </div>
              )}
              {activeResumeTab === "tailored" && (
                <div className="space-y-3 text-sm text-[#8888AA]">
                  <p className="font-semibold text-[#F0F0FF]">Alex Johnson</p>
                  <p>
                    Senior Frontend Engineer · 6 years building{" "}
                    <span className="text-[#00D4AA]">payment UIs and data-heavy dashboards</span>
                  </p>
                  <p>
                    React, TypeScript, Next.js, TailwindCSS,{" "}
                    <span className="text-[#00D4AA]">Performance Optimization, Jest, Playwright</span>
                  </p>
                  <hr className="border-[#2E2E4A]" />
                  <p>
                    Experienced frontend engineer specializing in building{" "}
                    <span className="text-[#00D4AA]">
                      complex, data-driven UIs for financial platforms
                    </span>
                    . Passionate about web performance and clean architecture.
                  </p>
                </div>
              )}
              {activeResumeTab === "diff" && (
                <div className="space-y-2 font-mono text-xs">
                  <p className="text-[#8888AA]">  Alex Johnson</p>
                  <p className="text-[#FF6B6B]">
                    - Senior Software Engineer · 6 years experience
                  </p>
                  <p className="text-[#00D4AA]">
                    + Senior Frontend Engineer · 6 years building payment UIs and data-heavy dashboards
                  </p>
                  <p className="text-[#FF6B6B]">
                    - React, TypeScript, Node.js, Next.js, PostgreSQL, AWS
                  </p>
                  <p className="text-[#00D4AA]">
                    + React, TypeScript, Next.js, TailwindCSS, Performance Optimization, Jest, Playwright
                  </p>
                  <p className="text-[#8888AA]">  ---</p>
                  <p className="text-[#FF6B6B]">
                    - Experienced software engineer specializing in building scalable web applications...
                  </p>
                  <p className="text-[#00D4AA]">
                    + Experienced frontend engineer specializing in building complex, data-driven UIs for financial platforms...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Application Timeline */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#F0F0FF]">
              Application Timeline
            </h2>
            <div className="space-y-0">
              {appData.timeline.map((entry, idx) => {
                const Icon = TIMELINE_ICONS[entry.icon] || Bot;
                return (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: entry.color + "20" }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color: entry.color }}
                        />
                      </div>
                      {idx < appData.timeline.length - 1 && (
                        <div className="w-px flex-1 bg-[#2E2E4A]" />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="text-sm text-[#F0F0FF]">{entry.event}</p>
                      <p className="mt-0.5 text-xs text-[#55557A]">
                        {entry.time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#F0F0FF]">
              Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personal notes about this application…"
              rows={4}
              className="w-full rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none focus:border-[#6C63FF]"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {appData.status === "cv_emailed" && (
            <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
              <h2 className="mb-2 text-sm font-semibold text-[#F0F0FF]">Tailored CV emailed</h2>
              <p className="text-xs text-[#8888AA]">
                We sent a PDF to your account email. Use the employer link to apply, then click{" "}
                <strong className="text-[#F0F0FF]">I applied</strong> in that email (or the button below) so this role appears under{" "}
                <strong className="text-[#F0F0FF]">Recent applications</strong> on your dashboard.
              </p>
              <p className="mt-2 text-xs text-[#8888AA]">
                Tailored JSON:{" "}
                <Link href="/resumes" className="text-[#6C63FF] hover:underline">
                  Resume Manager
                </Link>
              </p>
              <button
                type="button"
                disabled={confirmAppliedLoading}
                onClick={() => void handleConfirmAppliedFromDetail()}
                className="mt-4 w-full rounded-xl bg-[#059669] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#047857] disabled:opacity-50"
              >
                {confirmAppliedLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </span>
                ) : (
                  "I applied to this job"
                )}
              </button>
            </div>
          )}
          {appData.status === "applied_confirmed" && (
            <div className="rounded-xl border border-[#059669]/30 bg-[#059669]/10 p-6">
              <h2 className="mb-1 text-sm font-semibold text-[#F0F0FF]">Application logged</h2>
              <p className="text-xs text-[#8888AA]">
                This role appears in your Recent applications list. You can still open the job from your email if you need the apply link again.
              </p>
            </div>
          )}
          {/* Why This Matches */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-3 text-sm font-semibold text-[#F0F0FF]">
              Why this matches you
            </h2>
            <ul className="space-y-2">
              {appData.matchAnalysis.reasons.map((reason, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-[#8888AA]"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00D4AA]" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Skills Overlap */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-3 text-sm font-semibold text-[#F0F0FF]">
              Skills Overlap
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-2 text-xs font-medium text-[#00D4AA]">
                  You Have
                </p>
                <div className="space-y-1">
                  {appData.matchAnalysis.skillsYouHave.map((skill) => (
                    <div
                      key={skill}
                      className="rounded-md bg-[#00D4AA]/10 px-2 py-1 text-xs text-[#00D4AA]"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-[#6C63FF]">
                  Job Requires
                </p>
                <div className="space-y-1">
                  {appData.matchAnalysis.skillsRequired.map((skill) => (
                    <div
                      key={skill}
                      className="rounded-md bg-[#6C63FF]/10 px-2 py-1 text-xs text-[#6C63FF]"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Manual Status Update */}
          <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <h2 className="mb-3 text-sm font-semibold text-[#F0F0FF]">
              Update Status
            </h2>
            <select
              value={statusOverride}
              onChange={(e) => setStatusOverride(e.target.value)}
              className="w-full rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
            >
              <option value="cv_preparing">Preparing CV</option>
              <option value="cv_emailed">CV emailed</option>
              <option value="applied_confirmed">Applied (logged)</option>
              <option value="applied">Applied</option>
              <option value="in_review">In Review</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={async () => {
                try {
                  await appApi.update(appData.id, { status: statusOverride } as never);
                  setAppData((prev) => prev ? { ...prev, status: statusOverride } : prev);
                } catch {
                  alert("Failed to update status.");
                }
              }}
              className="mt-3 w-full rounded-xl bg-[#6C63FF] py-2.5 text-sm font-semibold text-white hover:bg-[#5A52E0]"
            >
              Save Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
