"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface AppLayoutProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/jobs": "Jobs Feed",
  "/applications": "My Applications",
  "/resumes": "Resume Manager",
  "/agent": "Agent Settings",
  "/preferences": "Preferences",
  "/analytics": "Analytics",
};

function AppLayout({ title, children, className }: AppLayoutProps) {
  const { sidebarCollapsed } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    const token = Cookies.get("applyiq_token");
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else {
      setAuthChecked(true);
    }
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6C63FF] border-t-transparent" />
      </div>
    );
  }

  const resolvedTitle =
    title ||
    Object.entries(pageTitles).find(([path]) =>
      pathname.startsWith(path)
    )?.[1] ||
    "ApplyIQ";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg-primary">
        <Sidebar />

        <div
          className={cn(
            "transition-all duration-200",
            sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
          )}
        >
          <Topbar title={resolvedTitle} />

          <main className={cn("mx-auto max-w-[1280px]", className)}>
            {children}
          </main>
        </div>

        {/* Mobile overlay for sidebar */}
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => useAppStore.getState().setSidebarCollapsed(true)}
          />
        )}
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}

export default AppLayout;
export { AppLayout };
