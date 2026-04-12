"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  FileUp,
  Bot,
  Settings,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Zap,
} from "lucide-react";
import { AgentStatusWidget } from "@/components/agent-status-widget";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs Feed", icon: Briefcase },
  { href: "/applications", label: "My Applications", icon: FileText },
  { href: "/resumes", label: "Resume Manager", icon: FileUp },
  { href: "/agent", label: "Agent Settings", icon: Bot },
  { href: "/preferences", label: "Preferences", icon: Settings },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

interface SidebarProps {
  className?: string;
}

function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, agentStatus, user } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-bg-secondary",
        "transition-all duration-200",
        sidebarCollapsed ? "w-[72px]" : "w-[260px]",
        className
      )}
    >
      {/* Logo + Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text-primary">JobCatcher</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "rounded-sm p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors",
            sidebarCollapsed && "hidden"
          )}
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="mx-auto mt-2 rounded-sm p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                    "transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary-light border border-primary/20"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Agent Status Widget */}
      <div className="px-3 pb-3">
        <AgentStatusWidget
          status={agentStatus}
          collapsed={sidebarCollapsed}
        />
      </div>

      {/* Upgrade CTA (for free users) */}
      {user?.plan === "free" && !sidebarCollapsed && (
        <div className="mx-3 mb-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="h-4 w-4 text-accent-yellow" />
            <span className="text-sm font-medium text-text-primary">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-text-muted mb-2.5">
            Unlock unlimited applications, advanced analytics, and priority support.
          </p>
          <Link
            href="/pricing"
            className="block w-full text-center rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-light transition-colors"
          >
            View Plans
          </Link>
        </div>
      )}
    </aside>
  );
}

export { Sidebar };
