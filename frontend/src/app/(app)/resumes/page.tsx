"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Star,
  MoreVertical,
  X,
  Check,
  Loader2,
  File,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resumes as resumesApi, ApiError } from "@/lib/api";

interface Resume {
  id: string;
  name: string;
  uploadedAt: string;
  fileSize: string;
  fileType: string;
  isBase: boolean;
  linkedApplications: number;
}

export default function ResumesPage() {
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closePreview = useCallback(() => {
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewId(null);
  }, []);

  useEffect(() => {
    if (!previewId) {
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    void (async () => {
      try {
        const blob = await resumesApi.getFileBlob(previewId);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setPreviewBlobUrl(url);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof ApiError ? err.message : "Could not load resume file.";
          setPreviewError(msg);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewId]);

  async function downloadResume(id: string, filename: string) {
    try {
      const blob = await resumesApi.getFileBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "resume";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Please try again.");
    }
    setActiveMenu(null);
  }

  useEffect(() => {
    async function fetchResumes() {
      try {
        const data = await resumesApi.list();
        const items = Array.isArray(data) ? data : [];
        setResumes(items.map((r) => ({
          id: String(r.id),
          name: r.original_filename || r.version_name || "Unnamed",
          uploadedAt: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
          fileSize: "",
          fileType: (r.original_filename || "").toLowerCase().endsWith(".docx") ? "DOCX" : "PDF",
          isBase: r.is_base,
          linkedApplications: 0,
        })));
      } catch {
        // API not available, empty state
      } finally {
        setLoading(false);
      }
    }
    fetchResumes();
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await resumesApi.upload(file);
      const newResume: Resume = {
        id: String(result.id),
        name: result.original_filename || result.version_name || file.name,
        uploadedAt: "Just now",
        fileSize: `${Math.round(file.size / 1024)} KB`,
        fileType: file.name.endsWith(".pdf") ? "PDF" : "DOCX",
        isBase: result.is_base,
        linkedApplications: 0,
      };
      setResumes((prev) => [newResume, ...prev]);
    } catch (err) {
      alert("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  async function setAsBase(id: string) {
    try {
      await resumesApi.setBase(id);
      setResumes((prev) =>
        prev.map((r) => ({ ...r, isBase: r.id === id }))
      );
    } catch {
      alert("Failed to set as base resume.");
    }
    setActiveMenu(null);
  }

  async function deleteResume(id: string) {
    try {
      await resumesApi.delete(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Failed to delete resume.");
    }
    setActiveMenu(null);
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F0FF]">Resumes</h1>
          <p className="text-sm text-[#8888AA]">
            {resumes.length} resume{resumes.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5A52E0] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload New Resume"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleUpload(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          dragActive
            ? "border-[#6C63FF] bg-[#6C63FF]/5"
            : "border-[#2E2E4A] bg-[#1A1A2E]/50"
        )}
      >
        <Upload className={cn("h-8 w-8 mb-3", dragActive ? "text-[#6C63FF]" : "text-[#55557A]")} />
        <p className="text-sm text-[#8888AA]">
          Drag & drop your resume here, or{" "}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[#6C63FF] hover:underline"
          >
            browse files
          </button>
        </p>
        <p className="mt-1 text-xs text-[#55557A]">
          PDF or DOCX, max 5MB
        </p>
      </div>

      {/* Resume Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className={cn(
              "group relative rounded-xl border bg-[#1A1A2E] p-5 transition-colors hover:border-[#6C63FF]/30",
              resume.isBase ? "border-[#6C63FF]/50" : "border-[#2E2E4A]"
            )}
          >
            {/* Base Badge */}
            {resume.isBase && (
              <div className="absolute -top-2 left-4 flex items-center gap-1 rounded-full bg-[#6C63FF] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                <Star className="h-3 w-3" />
                Base Resume
              </div>
            )}

            {/* Menu */}
            <div className="absolute right-3 top-3">
              <button
                onClick={() =>
                  setActiveMenu(activeMenu === resume.id ? null : resume.id)
                }
                className="rounded-lg p-1 text-[#55557A] opacity-0 transition-opacity hover:bg-[#252540] hover:text-[#8888AA] group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {activeMenu === resume.id && (
                <div className="absolute right-0 top-8 z-10 w-44 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] py-1 shadow-xl">
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      setPreviewId(resume.id);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#F0F0FF] hover:bg-[#252540]"
                  >
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadResume(resume.id, resume.name)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#F0F0FF] hover:bg-[#252540]"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                  {!resume.isBase && (
                    <button
                      onClick={() => setAsBase(resume.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#6C63FF] hover:bg-[#252540]"
                    >
                      <Star className="h-4 w-4" /> Set as Base
                    </button>
                  )}
                  <hr className="my-1 border-[#2E2E4A]" />
                  <button
                    onClick={() => deleteResume(resume.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#FF6B6B] hover:bg-[#252540]"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>

            {/* File Icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#252540]">
              <FileText
                className={cn(
                  "h-8 w-8",
                  resume.fileType === "PDF"
                    ? "text-[#FF6B6B]"
                    : "text-[#6C63FF]"
                )}
              />
            </div>

            {/* Info */}
            <h3 className="truncate text-sm font-semibold text-[#F0F0FF]">
              {resume.name}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-xs text-[#55557A]">
              <span>{resume.uploadedAt}</span>
              <span>·</span>
              <span>{resume.fileSize}</span>
              <span>·</span>
              <span className="rounded bg-[#252540] px-1.5 py-0.5 text-[10px] font-medium text-[#8888AA]">
                {resume.fileType}
              </span>
            </div>

            {/* Linked Applications */}
            <div className="mt-3 flex items-center gap-1 text-xs text-[#8888AA]">
              <Link2 className="h-3 w-3" />
              {resume.linkedApplications} linked application
              {resume.linkedApplications !== 1 ? "s" : ""}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewId(resume.id)}
                className="flex items-center gap-1 rounded-lg border border-[#2E2E4A] px-3 py-1.5 text-xs text-[#8888AA] transition-colors hover:border-[#6C63FF]/50 hover:text-[#F0F0FF]"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => void downloadResume(resume.id, resume.name)}
                className="flex items-center gap-1 rounded-lg border border-[#2E2E4A] px-3 py-1.5 text-xs text-[#8888AA] transition-colors hover:border-[#6C63FF]/50 hover:text-[#F0F0FF]"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
            <button
              type="button"
              onClick={closePreview}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#55557A] hover:bg-[#252540] hover:text-[#F0F0FF]"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-1 pr-10 text-lg font-semibold text-[#F0F0FF]">
              Resume Preview
            </h2>
            <p className="mb-4 truncate text-sm text-[#8888AA]">
              {resumes.find((r) => r.id === previewId)?.name}
            </p>

            <div className="min-h-[50vh] flex-1 overflow-hidden rounded-xl border border-[#2E2E4A] bg-[#0F0F1A]">
              {previewLoading && (
                <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-[#8888AA]">
                  <Loader2 className="h-10 w-10 animate-spin text-[#6C63FF]" />
                  <p className="text-sm">Loading preview…</p>
                </div>
              )}
              {!previewLoading && previewError && (
                <div className="flex h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
                  <FileText className="h-12 w-12 text-[#FF6B6B]/60" />
                  <p className="text-sm text-[#FF6B6B]">{previewError}</p>
                </div>
              )}
              {!previewLoading &&
                !previewError &&
                previewBlobUrl &&
                resumes.find((r) => r.id === previewId)?.fileType === "PDF" && (
                  <iframe
                    title="Resume PDF preview"
                    src={previewBlobUrl}
                    className="h-[75vh] w-full bg-[#0F0F1A]"
                  />
                )}
              {!previewLoading &&
                !previewError &&
                previewBlobUrl &&
                resumes.find((r) => r.id === previewId)?.fileType === "DOCX" && (
                  <div className="flex h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
                    <File className="h-14 w-14 text-[#6C63FF]" />
                    <div className="space-y-2">
                      <p className="text-sm text-[#F0F0FF]">Word preview isn&apos;t available in the browser</p>
                      <p className="text-xs text-[#55557A]">
                        Download the file to open it in Microsoft Word or another compatible app.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const r = resumes.find((x) => x.id === previewId);
                        if (r) void downloadResume(r.id, r.name);
                      }}
                      className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5A52E0]"
                    >
                      <Download className="h-4 w-4" />
                      Download DOCX
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
