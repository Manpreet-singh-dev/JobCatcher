"use client";

import { useState } from "react";
import { FileText, Loader2, Mail } from "lucide-react";
import { resumes, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function TailorCvFromPostingPage() {
  const [description, setDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [emailPdf, setEmailPdf] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const trimmed = description.trim();
    if (trimmed.length < 40) {
      setError(
        `Add a bit more to the job description (${trimmed.length}/40 characters minimum).`
      );
      return;
    }
    setLoading(true);
    try {
      await resumes.tailorFromPosting({
        description: trimmed,
        job_title: jobTitle.trim() || undefined,
        company: company.trim() || undefined,
        location: location.trim() || undefined,
        email_pdf: emailPdf,
      });
      setMessage(
        emailPdf
          ? "Your tailored CV was saved and a PDF was sent to your email."
          : "Your tailored CV was saved. Open Resume Manager to view or download."
      );
      setDescription("");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F0F0FF]">Tailor CV from a job posting</h1>
        <p className="mt-1 text-sm text-[#8888AA]">
          Paste any job description. We use your base resume to generate a tailored version you can edit
          in Resume Manager, and optionally email you a PDF.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8888AA]">Job title (optional)</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
              placeholder="e.g. Senior Backend Engineer"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#8888AA]">Company (optional)</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
              placeholder="e.g. Acme Corp"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#8888AA]">Location (optional)</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
            placeholder="e.g. Remote, UK"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#8888AA]">Job description *</label>
          <textarea
            rows={12}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-y rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
            placeholder="Paste the full job description (at least a few sentences)…"
          />
          <p
            className={cn(
              "mt-1 text-xs",
              description.trim().length < 40 ? "text-[#FFD93D]" : "text-[#55557A]"
            )}
          >
            {description.trim().length} / 40 characters minimum (required before we can call the
            model).
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#8888AA]">
          <input
            type="checkbox"
            checked={emailPdf}
            onChange={(e) => setEmailPdf(e.target.checked)}
            className="rounded border-[#2E2E4A] bg-[#1A1A2E] text-[#6C63FF] focus:ring-[#6C63FF]"
          />
          <Mail className="h-4 w-4 shrink-0" />
          Also email me a PDF of this tailored CV
        </label>

        {error && (
          <p className="rounded-lg border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-sm text-[#FF6B6B]">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-[#00D4AA]/30 bg-[#00D4AA]/10 px-3 py-2 text-sm text-[#00D4AA]">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5A52E0]",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate tailored CV"}
        </button>
      </form>
    </div>
  );
}
