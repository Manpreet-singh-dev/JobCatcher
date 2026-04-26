"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Clock, DollarSign, ExternalLink, Loader2, Mail, Bookmark, BookmarkCheck } from "lucide-react";
import { cn, formatRelativeTime, formatSalary, getInitials, generateGradient } from "@/lib/utils";
import { jobs as jobsApi, ApiError } from "@/lib/api";

interface BackendJob {
  id: string;
  source?: string | null;
  source_job_id?: string | null;
  title: string;
  company: string;
  location?: string | null;
  work_mode?: string | null;
  employment_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  description?: string | null;
  required_skills?: string[] | null;
  preferred_skills?: string[] | null;
  experience_required?: string | null;
  posted_date?: string | null;
  apply_url?: string | null;
  company_logo_url?: string | null;
}

const JOB_CACHE_KEY = "jobcatcher_job_cache";

function getCachedJob(id: string): BackendJob | null {
  try {
    const cache = JSON.parse(sessionStorage.getItem(JOB_CACHE_KEY) || "{}");
    return cache[id] || null;
  } catch {
    return null;
  }
}

function normalizeWorkMode(workMode?: string | null): string {
  if (!workMode) return "Unknown";
  const key = workMode.toLowerCase();
  if (key === "onsite") return "On-site";
  if (key === "remote") return "Remote";
  if (key === "hybrid") return "Hybrid";
  return workMode;
}

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

function backendJobPayload(raw: BackendJob): Record<string, unknown> {
  return {
    id: raw.id,
    source: raw.source ?? "",
    source_job_id: raw.source_job_id ?? null,
    title: raw.title,
    company: raw.company,
    company_logo_url: raw.company_logo_url ?? null,
    location: raw.location ?? null,
    work_mode: raw.work_mode ?? null,
    employment_type: raw.employment_type ?? null,
    salary_min: raw.salary_min ?? null,
    salary_max: raw.salary_max ?? null,
    salary_currency: raw.salary_currency ?? null,
    description: raw.description ?? null,
    required_skills: raw.required_skills ?? null,
    preferred_skills: raw.preferred_skills ?? null,
    experience_required: raw.experience_required ?? null,
    apply_url: raw.apply_url ?? null,
    posted_date: raw.posted_date ?? null,
  };
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [job, setJob] = useState<BackendJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = getCachedJob(jobId);
    if (cached) {
      setJob(cached);
      setLoading(false);
      return;
    }

    async function fetchJob() {
      setLoading(true);
      setError(null);
      try {
        const response = await jobsApi.getById(jobId);
        setJob(response as unknown as BackendJob);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setLoading(false);
      }
    }
    void fetchJob();
  }, [jobId]);

  async function handleRequestTailoredCv() {
    if (!job) return;
    setApplyingId(job.id);
    try {
      await jobsApi.requestTailoredCv(job.id, backendJobPayload(job));
      alert("Tailored CV requested! You'll receive an email when it's ready.");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      alert("Could not queue tailored CV: " + msg);
    } finally {
      setApplyingId(null);
    }
  }

  async function handleSave() {
    if (!job) return;
    setSaving(true);
    try {
      await jobsApi.save(backendJobPayload(job));
      setSaved(true);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      if (msg.includes("already saved")) {
        setSaved(true);
      } else {
        alert("Could not save job: " + msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="h-96 animate-pulse rounded-xl bg-[#1A1A2E]" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4 p-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[#8888AA] hover:text-[#F0F0FF]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="rounded-xl border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 p-4 text-[#FF6B6B]">
          {error || "Job not found"}
        </div>
      </div>
    );
  }

  const workMode = normalizeWorkMode(job.work_mode);
  const salary = formatSalary(job.salary_min ?? undefined, job.salary_max ?? undefined, job.salary_currency ?? "USD");
  const postedAgo = job.posted_date ? formatRelativeTime(job.posted_date) : "Recently";
  const allSkills = [...(job.required_skills ?? []), ...(job.preferred_skills ?? [])].filter(Boolean);

  return (
    <div className="space-y-6 p-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[#8888AA] transition-colors hover:text-[#F0F0FF]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </button>

      {/* Job Header */}
      <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="flex gap-4">
          {/* Company Logo */}
          <div className="shrink-0">
            {job.company_logo_url ? (
              <img
                src={job.company_logo_url}
                alt={job.company}
                className="h-16 w-16 rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] object-cover"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-xl border border-[#2E2E4A] text-lg font-bold text-white"
                style={{ background: generateGradient(job.company) }}
              >
                {getInitials(job.company)}
              </div>
            )}
          </div>

          {/* Job Info */}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#F0F0FF]">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#8888AA]">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#6C63FF]/70" />
                <span className="font-medium text-[#C4C4E6]">{job.company}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {job.location ?? "Location not specified"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {postedAgo}
              </span>
            </div>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium",
                  workModePillClass(workMode)
                )}
              >
                {workMode}
              </span>
              {job.employment_type && (
                <span className="inline-flex items-center rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-1.5 text-sm text-[#A8A8CC]">
                  {job.employment_type.replace("_", " ")}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-1.5 text-sm text-[#A8A8CC]">
                <DollarSign className="h-4 w-4" />
                {salary}
              </span>
              {job.source && (
                <span className="inline-flex items-center rounded-lg border border-[#6C63FF]/25 bg-[#6C63FF]/10 px-3 py-1.5 text-sm font-medium text-[#B8B3FF]">
                  {job.source}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-[#2E2E4A]/60 pt-6">
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-2.5 text-sm font-medium text-[#B8B3FF] transition-colors hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/10"
            >
              <ExternalLink className="h-4 w-4" />
              View Original Posting
            </a>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              saved
                ? "border-[#6C63FF]/30 bg-[#6C63FF]/10 text-[#B8B3FF]"
                : "border-[#2E2E4A] bg-[#0F0F1A] text-[#C8C8E0] hover:border-[#6C63FF]/45 hover:text-[#F0F0FF]"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            {saved ? "Saved" : "Save for later"}
          </button>
          <button
            type="button"
            disabled={applyingId === job.id}
            onClick={handleRequestTailoredCv}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#5A52E0] disabled:opacity-50"
          >
            {applyingId === job.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {applyingId === job.id ? "Sending…" : "Email CV + Posting Link"}
          </button>
        </div>
      </div>

      {/* Job Description */}
      {job.description && (
        <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
          <h2 className="text-lg font-semibold text-[#F0F0FF]">Job Description</h2>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#8888AA]">
            {job.description}
          </div>
        </div>
      )}

      {/* Skills */}
      {allSkills.length > 0 && (
        <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
          <h2 className="text-lg font-semibold text-[#F0F0FF]">Skills & Requirements</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {allSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-1.5 text-sm text-[#A8A8CC]"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
