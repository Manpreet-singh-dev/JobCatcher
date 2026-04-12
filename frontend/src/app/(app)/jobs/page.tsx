"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  Bookmark,
  X,
  Loader2,
} from "lucide-react";
import MatchScoreRing from "@/components/match-score-ring";
import { cn, formatRelativeTime, formatSalary } from "@/lib/utils";
import { jobs, applications } from "@/lib/api";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  salary: string;
  matchScore: number;
  postedAgo: string;
  source: string;
  tags: string[];
  description: string;
  applyUrl: string;
  status: "new" | "pending" | "applied" | "saved" | "skipped";
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
const SORT_OPTIONS = ["Match Score", "Date Posted", "Salary (High)", "Salary (Low)"];

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
    location: job.location ?? "Location not specified",
    workMode: normalizeWorkMode(job.work_mode),
    salary: formatSalary(job.salary_min ?? undefined, job.salary_max ?? undefined, job.salary_currency ?? "USD"),
    matchScore: 75,
    postedAgo,
    source: normalizeSource(job.source),
    tags,
    description: job.description ?? "No description provided.",
    applyUrl: job.apply_url ?? "",
    status: "new",
  };
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#00D4AA";
  if (score >= 70) return "#6C63FF";
  if (score >= 55) return "#FFD93D";
  return "#FF6B6B";
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
  const [minScore, setMinScore] = useState(50);
  const [sortBy, setSortBy] = useState("Match Score");
  const [showFilters, setShowFilters] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [actionedJobs, setActionedJobs] = useState<Record<string, "applied" | "skipped" | "saved">>({});
  const [matchMyPreferences, setMatchMyPreferences] = useState(false);

  async function handleApply(job: Job) {
    setApplyingId(job.id);
    try {
      await applications.create(job.id);
      setActionedJobs((prev) => ({ ...prev, [job.id]: "applied" }));
      if (job.applyUrl) {
        window.open(job.applyUrl, "_blank", "noopener");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409") || msg.includes("Already applied")) {
        setActionedJobs((prev) => ({ ...prev, [job.id]: "applied" }));
        if (job.applyUrl) window.open(job.applyUrl, "_blank", "noopener");
      } else {
        alert("Failed to apply: " + msg);
      }
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
    let jobs = [...allJobs];
    jobs = jobs.filter((j) => j.matchScore >= minScore);
    jobs.sort((a, b) => {
      switch (sortBy) {
        case "Match Score": return b.matchScore - a.matchScore;
        case "Date Posted": return 0;
        case "Salary (High)": return b.salary.localeCompare(a.salary);
        case "Salary (Low)": return a.salary.localeCompare(b.salary);
        default: return 0;
      }
    });
    return jobs;
  }, [allJobs, minScore, sortBy]);

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

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
            showFilters
              ? "border-[#6C63FF] bg-[#6C63FF]/10 text-[#6C63FF]"
              : "border-[#2E2E4A] text-[#8888AA] hover:border-[#6C63FF]/50"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Extended Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-[#8888AA]">Min Match Score:</label>
            <input
              type="range"
              min={30}
              max={95}
              value={minScore}
              onChange={(e) => { setMinScore(parseInt(e.target.value)); setPage(1); }}
              className="w-32 accent-[#6C63FF]"
            />
            <span className="text-sm font-medium text-[#F0F0FF]">{minScore}%</span>
          </div>
          <button
            onClick={() => {
              setSearch("");
              setSourceFilter("All Sources");
              setModeFilter("All Modes");
              setMinScore(50);
              setSortBy("Match Score");
              setPage(1);
            }}
            className="flex items-center gap-1 text-sm text-[#FF6B6B] hover:text-[#FF6B6B]/80"
          >
            <X className="h-3.5 w-3.5" />
            Reset filters
          </button>
        </div>
      )}

      {/* Job List */}
      {error && (
        <div className="rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 p-3 text-sm text-[#FF6B6B]">
          {error}
        </div>
      )}
      {view === "list" ? (
        <div className="space-y-3">
          {paged.map((job) => (
            <div
              key={job.id}
              className="group rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-5 transition-colors hover:border-[#6C63FF]/30"
            >
              <div className="flex items-start gap-4">
                <div className="hidden sm:block">
                  <MatchScoreRing score={Math.round(job.matchScore)} size={48} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {job.applyUrl ? (
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-[#F0F0FF] hover:text-[#6C63FF]"
                        >
                          {job.title}
                        </a>
                      ) : (
                        <span className="text-base font-semibold text-[#F0F0FF]">
                          {job.title}
                        </span>
                      )}
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
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {job.postedAgo}
                        </span>
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-lg font-bold sm:hidden"
                      style={{ color: getScoreColor(job.matchScore) }}
                    >
                      {Math.round(job.matchScore)}%
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[#252540] px-2 py-0.5 text-xs text-[#8888AA]"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="rounded-md bg-[#6C63FF]/10 px-2 py-0.5 text-xs text-[#6C63FF]">
                      {job.source}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {(() => {
                      const s = getJobStatus(job);
                      if (s === "applied") return (
                        <span className="rounded-md bg-[#00D4AA]/10 px-2.5 py-1 text-xs font-medium text-[#00D4AA]">
                          Applied
                        </span>
                      );
                      if (s === "saved") return (
                        <span className="rounded-md bg-[#6C63FF]/10 px-2.5 py-1 text-xs font-medium text-[#6C63FF]">
                          Saved
                        </span>
                      );
                      if (s === "skipped") return (
                        <span className="rounded-md bg-[#55557A]/10 px-2.5 py-1 text-xs font-medium text-[#55557A]">
                          Skipped
                        </span>
                      );
                      return (
                        <>
                          <button
                            disabled={applyingId === job.id}
                            onClick={() => handleApply(job)}
                            className="flex items-center gap-1.5 rounded-lg bg-[#6C63FF] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#5A52E0] disabled:opacity-50"
                          >
                            {applyingId === job.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {applyingId === job.id ? "Applying..." : "Apply"}
                          </button>
                          <button
                            onClick={() => handleSave(job.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#2E2E4A] px-3 py-1.5 text-xs text-[#8888AA] transition-colors hover:border-[#6C63FF]/50"
                          >
                            <Bookmark className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            onClick={() => handleSkip(job.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#FF6B6B]/30 px-3 py-1.5 text-xs text-[#FF6B6B] transition-colors hover:bg-[#FF6B6B]/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Skip
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {paged.map((job) => (
            <div
              key={job.id}
              className="group flex flex-col rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-5 transition-colors hover:border-[#6C63FF]/30"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xl font-bold"
                  style={{ color: getScoreColor(job.matchScore) }}
                >
                  {Math.round(job.matchScore)}%
                </span>
                <span className="rounded-md bg-[#6C63FF]/10 px-2 py-0.5 text-xs text-[#6C63FF]">
                  {job.source}
                </span>
              </div>
              {job.applyUrl ? (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-base font-semibold text-[#F0F0FF] hover:text-[#6C63FF]"
                >
                  {job.title}
                </a>
              ) : (
                <span className="mt-3 text-base font-semibold text-[#F0F0FF]">
                  {job.title}
                </span>
              )}
              <p className="mt-1 text-sm text-[#8888AA]">
                {job.company} · {job.location}
              </p>
              <p className="mt-1 text-sm text-[#8888AA]">{job.salary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-[#252540] px-2 py-0.5 text-xs text-[#8888AA]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-4">
                {(() => {
                  const s = getJobStatus(job);
                  if (s === "applied") return (
                    <span className="flex-1 rounded-lg bg-[#00D4AA]/10 py-1.5 text-center text-xs font-medium text-[#00D4AA]">Applied</span>
                  );
                  if (s === "saved") return (
                    <span className="flex-1 rounded-lg bg-[#6C63FF]/10 py-1.5 text-center text-xs font-medium text-[#6C63FF]">Saved</span>
                  );
                  if (s === "skipped") return (
                    <span className="flex-1 rounded-lg bg-[#55557A]/10 py-1.5 text-center text-xs font-medium text-[#55557A]">Skipped</span>
                  );
                  return (
                    <>
                      <button
                        disabled={applyingId === job.id}
                        onClick={() => handleApply(job)}
                        className="flex-1 rounded-lg bg-[#6C63FF] py-1.5 text-xs font-semibold text-white hover:bg-[#5A52E0] disabled:opacity-50"
                      >
                        {applyingId === job.id ? "Applying..." : "Apply"}
                      </button>
                      <button
                        onClick={() => handleSave(job.id)}
                        className="rounded-lg border border-[#2E2E4A] p-1.5 text-[#8888AA] hover:border-[#6C63FF]/50"
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleSkip(job.id)}
                        className="rounded-lg border border-[#FF6B6B]/30 p-1.5 text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
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
