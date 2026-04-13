"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn, getInitials, generateGradient } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

interface TopbarProps {
  title: string;
  className?: string;
}

function Topbar({ title, className }: TopbarProps) {
  const { user } = useAppStore();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-bg-primary/80 backdrop-blur-md px-6",
        className
      )}
    >
      {/* Page title */}
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-bg-tertiary transition-colors">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: generateGradient(user?.name || "User") }}
              >
                {getInitials(user?.name || "User")}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                "z-50 min-w-[200px] rounded-md border border-border bg-bg-secondary p-1.5 shadow-xl",
                "animate-fade-in"
              )}
            >
              {/* User info */}
              <div className="px-2.5 py-2 mb-1.5">
                <p className="text-sm font-medium text-text-primary">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-text-muted">{user?.email || ""}</p>
              </div>

              <DropdownMenu.Separator className="h-px bg-border my-1" />

              <DropdownMenu.Item className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-secondary outline-none cursor-pointer transition-colors hover:bg-bg-tertiary hover:text-text-primary">
                <User className="h-4 w-4" />
                Profile
              </DropdownMenu.Item>

              <DropdownMenu.Item className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-secondary outline-none cursor-pointer transition-colors hover:bg-bg-tertiary hover:text-text-primary">
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-border my-1" />

              <DropdownMenu.Item className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-accent-warm outline-none cursor-pointer transition-colors hover:bg-accent-warm/10">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

export { Topbar };
