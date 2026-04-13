"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Clock,
  XCircle,
  Bookmark,
  X,
  Loader2,
  Mail,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import { cn, formatRelativeTime, formatSalary, getInitials, generateGradient } from "@/lib/utils";
import { jobs, ApiError } from "@/lib/api";

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogoUrl: string | null;
  location: string;
  workMode: string;
  salary: string;
  postedAgo: string;
  postedAtMs: number;
  source: string;
  tags: string[];
  description: string;
  applyUrl: string;
  status: "new" | "pending" | "cv_requested" | "saved" | "skipped";
}

interface BackendJob {
  id: string;
  source?: string | null;
  title: string;
  company: string;
  location?: string | null;
  work_mode?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  description?: string | null;
  required_skills?: string[] | null;
  preferred_skills?: string[] | null;
  posted_date?: string | null;
  apply_url?: string | null;
  company_logo_url?: string | null;
}

const SOURCES = ["All Sources", "LinkedIn", "Indeed", "Glassdoor", "ZipRecruiter", "Company Sites"];
const WORK_MODES = ["All Modes", "Remote", "Hybrid", "On-site"];
const SORT_OPTIONS = ["Date Posted", "Salary (High)", "Salary (Low)"];

function workModePillClass(mode: string): string {
  switch (mode) {
    case "Remote":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/95";
    case "Hybrid":
      return "border-[#6C63FF]/35 bg-[#6C63FF]/12 text-[#D4D0FF]";
    case "On-site":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100/90";
    default:
      return "border-[#2E2E4A] bg-[#0F0F1A] text-[#8888AA]";
  }
}

function JobCompanyAvatar({
  company,
  logoUrl,
  size = "md",
}: {
  company: string;
  logoUrl: string | null;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-10 w-10 rounded-lg text-xs" : "h-12 w-12 rounded-xl text-sm";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn("shrink-0 border border-[#2E2E4A] bg-[#0F0F1A] object-cover", box)}
      />
    );
  }
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center border border-[#2E2E4A] font-bold text-white", box)}
      style={{ background: generateGradient(company) }}
      aria-hidden
    >
      {getInitials(company)}
    </div>
  );
}

function postedDateToMs(iso?: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function normalizeSource(source?: string | null): string {
  if (!source) return "Unknown";
  const key = source.toLowerCase();
  if (key.includes("linkedin")) return "LinkedIn";
  if (key.includes("indeed")) return "Indeed";
  if (key.includes("glassdoor")) return "Glassdoor";
  if (key.includes("ziprecruiter")) return "ZipRecruiter";
  if (key.includes("wellfound") || key.includes("angel")) return "AngelList";
  if (key.startsWith("jsearch:")) {
    const publisher = key.replace("jsearch:", "").trim();
    if (publisher) return publisher.charAt(0).toUpperCase() + publisher.slice(1);
    return "JSearch";
  }
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function normalizeWorkMode(workMode?: string | null): string {
  if (!workMode) return "Unknown";
  const key = workMode.toLowerCase();
  if (key === "onsite") return "On-site";
  if (key === "remote") return "Remote";
  if (key === "hybrid") return "Hybrid";
  return workMode;
}

function mapApiJobToView(job: BackendJob): Job {
  const tags = [...(job.required_skills ?? []), ...(job.preferred_skills ?? [])]
    .filter(Boolean)
    .slice(0, 5);
  const postedAgo = job.posted_date ? formatRelativeTime(job.posted_date) : "Recently";
  return {
    id: String(job.id),
    title: job.title,
    company: job.company,
    companyLogoUrl: job.company_logo_url?.trim() || null,
    location: job.location ?? "Location not specified",
    workMode: normalizeWorkMode(job.work_mode),
    salary: formatSalary(job.salary_min ?? undefined, job.salary_max ?? undefined, job.salary_currency ?? "USD"),
    postedAtMs: postedDateToMs(job.posted_date),
    postedAgo,
    source: normalizeSource(job.source),
    tags,
    description: job.description ?? "No description provided.",
    applyUrl: job.apply_url ?? "",
    status: "new",
  };
}

const PER_PAGE = 20;

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [serverPage, setServerPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [modeFilter, setModeFilter] = useState("All Modes");
  const [sortBy, setSortBy] = useState("Date Posted");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [actionedJobs, setActionedJobs] = useState<Record<string, "cv_requested" | "skipped" | "saved">>({});
  const [matchMyPreferences, setMatchMyPreferences] = useState(false);

  async function handleRequestTailoredCv(job: Job) {
    setApplyingId(job.id);
    try {
      await jobs.requestTailoredCv(job.id);
      setActionedJobs((prev) => ({ ...prev, [job.id]: "cv_requested" }));
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      alert("Could not queue tailored CV: " + msg);
    } finally {
      setApplyingId(null);
    }
  }

  function handleSkip(jobId: string) {
    setActionedJobs((prev) => ({ ...prev, [jobId]: "skipped" }));
  }

  function handleSave(jobId: string) {
    setActionedJobs((prev) => ({ ...prev, [jobId]: "saved" }));
  }

  function getJobStatus(job: Job): Job["status"] {
    return actionedJobs[job.id] || job.status;
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchJobs() {
      setLoading(true);
      setError(null);
      try {
        const source =
          sourceFilter === "All Sources"
            ? undefined
            : sourceFilter === "AngelList"
              ? "wellfound"
              : sourceFilter.toLowerCase();
        const workMode =
          modeFilter === "All Modes"
            ? undefined
            : modeFilter === "On-site"
              ? "onsite"
              : modeFilter.toLowerCase();

        const response = await jobs.list({
          page,
          page_size: PER_PAGE,
          search: search || undefined,
          source,
          work_mode: workMode as "remote" | "hybrid" | "onsite" | undefined,
          apply_preferences: matchMyPreferences,
        });

        const items = ((response as unknown as { items?: BackendJob[]; data?: BackendJob[] }).items ??
          (response as unknown as { items?: BackendJob[]; data?: BackendJob[] }).data ??
          []) as BackendJob[];

        if (cancelled) return;
        setAllJobs(items.map(mapApiJobToView));
        setTotal((response as unknown as { total?: number }).total ?? items.length);
        setServerPage((response as unknown as { page?: number }).page ?? page);
        setTotalPages((response as unknown as { total_pages?: number }).total_pages ?? 1);
      } catch (err) {
        if (cancelled) return;
        setAllJobs([]);
        setTotal(0);
        setTotalPages(0);
        setError(err instanceof Error ? err.message : "Failed to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchJobs();
    return () => {
      cancelled = true;
    };
  }, [page, search, sourceFilter, modeFilter, matchMyPreferences]);

  const filtered = useMemo(() => {
    const jobs = [...allJobs];
    jobs.sort((a, b) => {
      switch (sortBy) {
        case "Date Posted":
          return b.postedAtMs - a.postedAtMs;
        case "Salary (High)":
          return b.salary.localeCompare(a.salary);
        case "Salary (Low)":
          return a.salary.localeCompare(b.salary);
        default:
          return 0;
      }
    });
    return jobs;
  }, [allJobs, sortBy]);

  const paged = filtered;

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F0FF]">Jobs Feed</h1>
          <p className="text-sm text-[#8888AA]">{total} jobs found</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#2E2E4A] bg-[#1A1A2E]">
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded-l-lg p-2 transition-colors",
                view === "list" ? "bg-[#6C63FF] text-white" : "text-[#55557A] hover:text-[#8888AA]"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "rounded-r-lg p-2 transition-colors",
                view === "grid" ? "bg-[#6C63FF] text-white" : "text-[#55557A] hover:text-[#8888AA]"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55557A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search jobs, companies, skills…"
            className="w-full rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] py-2 pl-10 pr-4 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none focus:border-[#6C63FF]"
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
        >
          {SOURCES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={modeFilter}
          onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
        >
          {WORK_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#8888AA] hover:border-[#6C63FF]/50">
          <input
            type="checkbox"
            checked={matchMyPreferences}
            onChange={(e) => {
              setMatchMyPreferences(e.target.checked);
              setPage(1);
            }}
            className="rounded border-[#2E2E4A] bg-[#1A1A2E] text-[#6C63FF] focus:ring-[#6C63FF]"
          />
          <span>Match my preferences</span>
        </label>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setSourceFilter("All Sources");
            setModeFilter("All Modes");
            setSortBy("Date Posted");
            setMatchMyPreferences(false);
            setPage(1);
          }}
          className="flex items-center gap-1 rounded-lg border border-[#2E2E4A] px-3 py-2 text-sm text-[#8888AA] transition-colors hover:border-[#FF6B6B]/30 hover:text-[#FF8A8A]"
        >
          <X className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* Job List */}
      {error && (
        <div className="rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 p-3 text-sm text-[#FF6B6B]">
          {error}
        </div>
      )}
      {view === "list" ? (
        <div className="space-y-3">
          {paged.map((job) => {
            const rowStatus = getJobStatus(job);
            return (
              <article
                key={job.id}
                className="overflow-hidden rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] shadow-sm transition-all hover:border-[#6C63FF]/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.28)]"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex gap-4">
                    <JobCompanyAvatar company={job.company} logoUrl={job.companyLogoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold leading-snug text-[#F0F0FF]">{job.title}</h2>
                          <p className="mt-1 inline-flex min-w-0 items-center gap-1.5 text-sm text-[#8888AA]">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#6C63FF]/70" />
                            <span className="truncate font-medium text-[#C4C4E6]">{job.company}</span>
                          </p>
                        </div>
                        {job.applyUrl ? (
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-1.5 text-xs font-medium text-[#B8B3FF] transition-colors hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/10"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View posting
                          </a>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium",
                            workModePillClass(job.workMode)
                          )}
                        >
                          {job.workMode}
                        </span>
                        <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-2.5 py-1 text-xs text-[#A8A8CC]">
                          <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                          <span className="truncate">{job.location}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-2.5 py-1 text-xs text-[#A8A8CC]">
                          <DollarSign className="h-3 w-3 shrink-0 opacity-70" />
                          {job.salary}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-2.5 py-1 text-xs text-[#8A86B8]">
                          <Clock className="h-3 w-3 shrink-0" />
                          {job.postedAgo}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-[#6C63FF]/25 bg-[#6C63FF]/10 px-2.5 py-1 text-xs font-medium text-[#B8B3FF]">
                          {job.source}
                        </span>
                      </div>

                      {job.description && job.description !== "No description provided." && (
                        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[#6B6B90]">{job.description}</p>
                      )}

                      {job.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {job.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md border border-[#2E2E4A] bg-[#0F0F1A]/90 px-2 py-0.5 text-[11px] text-[#A8A8CC]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[#2E2E4A]/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {rowStatus === "saved" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#6C63FF]/10 px-3 py-2 text-xs font-medium text-[#B8B3FF]">
                          <Bookmark className="h-3.5 w-3.5" />
                          Saved for later
                        </span>
                      ) : rowStatus === "skipped" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#252540] px-3 py-2 text-xs font-medium text-[#8888AA]">
                          <XCircle className="h-3.5 w-3.5" />
                          Skipped
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSave(job.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-xs font-medium text-[#C8C8E0] transition-colors hover:border-[#6C63FF]/45 hover:text-[#F0F0FF]"
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                            Save for later
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSkip(job.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6B6B]/25 bg-transparent px-3 py-2 text-xs font-medium text-[#FF8A8A] transition-colors hover:bg-[#FF6B6B]/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Not interested
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[14rem] sm:items-stretch">
                      <p className="text-[11px] leading-snug text-[#55557A] sm:text-right">
                        Emails you a tailored CV PDF and this job&apos;s apply link.
                      </p>
                      <button
                        type="button"
                        disabled={applyingId === job.id}
                        onClick={() => void handleRequestTailoredCv(job)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#5A52E0] disabled:opacity-50 sm:py-2.5"
                      >
                        {applyingId === job.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 shrink-0" />
                        )}
                        {applyingId === job.id ? "Sending…" : "Email CV + posting link"}
                      </button>
                      {rowStatus === "cv_requested" && (
                        <p className="text-center text-[11px] leading-relaxed text-[#8888AA] sm:text-right">
                          <Link href="/applications" className="font-medium text-[#6C63FF] hover:underline">
                            My Applications
                          </Link>{" "}
                          <span className="text-[#00D4AA]">— role added.</span> Tailoring runs in the background; you
                          will receive the PDF by email when it is ready.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((job) => {
            const cardStatus = getJobStatus(job);
            return (
              <article
                key={job.id}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] shadow-sm transition-all hover:border-[#6C63FF]/40 hover:shadow-[0_8px_28px_rgba(0,0,0,0.25)]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#2E2E4A]/60 bg-[#0F0F1A]/35 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <JobCompanyAvatar company={job.company} logoUrl={job.companyLogoUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#C4C4E6]">{job.company}</p>
                      <span className="mt-0.5 inline-flex items-center rounded-md border border-[#6C63FF]/25 bg-[#6C63FF]/10 px-2 py-0.5 text-[10px] font-medium text-[#B8B3FF]">
                        {job.source}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
                  <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#F0F0FF]">{job.title}</h3>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                        workModePillClass(job.workMode)
                      )}
                    >
                      {job.workMode}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-[#2E2E4A] bg-[#0F0F1A] px-2 py-0.5 text-[11px] text-[#8A8AB0]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="max-w-[10rem] truncate">{job.location}</span>
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6B90]">
                    <span className="inline-flex items-center gap-0.5">
                      <DollarSign className="h-3 w-3" />
                      {job.salary}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {job.postedAgo}
                    </span>
                  </div>

                  {job.applyUrl ? (
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex w-fit items-center gap-1 text-xs font-medium text-[#6C63FF] hover:text-[#8B84FF]"
                    >
                      View posting
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}

                  {job.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {job.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-[#2E2E4A] bg-[#0F0F1A]/80 px-1.5 py-0.5 text-[10px] text-[#9A9AB8]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex flex-col gap-3 border-t border-[#2E2E4A]/50 pt-4">
                    <p className="text-center text-[10px] leading-snug text-[#55557A]">
                      PDF + apply link to your inbox
                    </p>
                    <button
                      type="button"
                      disabled={applyingId === job.id}
                      onClick={() => void handleRequestTailoredCv(job)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-3 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-[#5A52E0] disabled:opacity-50"
                    >
                      {applyingId === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      {applyingId === job.id ? "Sending…" : "Email CV + posting link"}
                    </button>
                    {cardStatus === "cv_requested" && (
                      <p className="text-center text-[11px] leading-relaxed text-[#8888AA]">
                        <Link href="/applications" className="font-medium text-[#6C63FF] hover:underline">
                          My Applications
                        </Link>{" "}
                        <span className="text-[#00D4AA]">— role added.</span> Email arrives when tailoring finishes.
                      </p>
                    )}

                    <div className="flex gap-2">
                      {cardStatus === "saved" ? (
                        <span className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#6C63FF]/10 py-2 text-xs font-medium text-[#B8B3FF]">
                          <Bookmark className="h-3.5 w-3.5" />
                          Saved
                        </span>
                      ) : cardStatus === "skipped" ? (
                        <span className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#252540] py-2 text-xs font-medium text-[#8888AA]">
                          <XCircle className="h-3.5 w-3.5" />
                          Skipped
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSave(job.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] py-2 text-xs font-medium text-[#C8C8E0] transition-colors hover:border-[#6C63FF]/45"
                            title="Save for later"
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSkip(job.id)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[#FF6B6B]/25 py-2 text-xs font-medium text-[#FF8A8A] transition-colors hover:bg-[#FF6B6B]/10"
                            title="Not interested"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#2E2E4A] pt-4">
          <p className="text-sm text-[#8888AA]">
            Showing {(page - 1) * PER_PAGE + 1}–
            {Math.min(page * PER_PAGE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[#2E2E4A] p-2 text-[#8888AA] transition-colors hover:bg-[#252540] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-[#55557A]">…</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={cn(
                      "h-8 w-8 rounded-lg text-sm transition-colors",
                      p === serverPage
                        ? "bg-[#6C63FF] font-semibold text-white"
                        : "text-[#8888AA] hover:bg-[#252540]"
                    )}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-[#2E2E4A] p-2 text-[#8888AA] transition-colors hover:bg-[#252540] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
