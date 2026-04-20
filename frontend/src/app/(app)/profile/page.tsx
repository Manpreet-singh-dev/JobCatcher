"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Settings } from "lucide-react";
import { users, ApiError } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn, getInitials, generateGradient } from "@/lib/utils";

export default function ProfilePage() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await users.getMe();
        if (!cancelled) {
          setUser(me);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <p className="text-sm text-[#FF6B6B]">{error || "Profile unavailable."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ background: generateGradient(user.name || user.email) }}
          >
            {getInitials(user.name || user.email)}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-xl font-semibold text-[#F0F0FF]">{user.name || "—"}</h2>
            <p className="text-sm text-[#8888AA]">{user.email}</p>
            <p className="text-xs text-[#55557A]">
              Email status:{" "}
              <span className={cn(user.email_verified ? "text-[#00D4AA]" : "text-[#FFD93D]")}>
                {user.email_verified ? "Verified" : "Not verified"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/preferences"
        className="inline-flex items-center gap-2 rounded-lg border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm font-medium text-[#C8C8E0] transition-colors hover:border-[#6C63FF]/45 hover:text-[#F0F0FF]"
      >
        <Settings className="h-4 w-4" />
        Job &amp; agent preferences
      </Link>
    </div>
  );
}
