"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn, getInitials, generateGradient } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { auth, users } from "@/lib/api";

interface TopbarProps {
  title: string;
  className?: string;
}

function Topbar({ title, className }: TopbarProps) {
  const router = useRouter();
  const { user, setUser } = useAppStore();

  React.useEffect(() => {
    let cancelled = false;
    users
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        /* keep existing store user if any */
      });
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  function handleLogout() {
    // `auth.logout()` clears cookies synchronously first, then notifies the API.
    // Navigate immediately so we never wait on the network to leave the app shell.
    void auth.logout();
    setUser(null);
    router.replace("/login");
    router.refresh();
  }

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
                "z-[100] min-w-[220px] rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-1.5 shadow-2xl",
                "outline-none animate-fade-in"
              )}
            >
              {/* User info */}
              <div className="mb-1 rounded-lg bg-[#0F0F1A] px-3 py-2.5">
                <p className="text-sm font-medium text-[#F0F0FF]">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs text-[#8888AA]">{user?.email || ""}</p>
              </div>

              <DropdownMenu.Separator className="my-1 h-px bg-[#2E2E4A]" />

              <DropdownMenu.Item
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none",
                  "text-[#C8C8E0] transition-colors duration-150 ease-out",
                  "hover:bg-[#252540] hover:text-[#F0F0FF]",
                  "data-[highlighted]:bg-[#252540] data-[highlighted]:text-[#F0F0FF]",
                  "data-[highlighted]:[&_svg]:text-[#B8B3FF]",
                  "focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40"
                )}
                onSelect={() => {
                  router.push("/profile");
                }}
              >
                <User className="h-4 w-4 shrink-0 text-[#8888AA]" />
                Profile
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none",
                  "text-[#C8C8E0] transition-colors duration-150 ease-out",
                  "hover:bg-[#252540] hover:text-[#F0F0FF]",
                  "data-[highlighted]:bg-[#252540] data-[highlighted]:text-[#F0F0FF]",
                  "data-[highlighted]:[&_svg]:text-[#B8B3FF]",
                  "focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40"
                )}
                onSelect={() => {
                  router.push("/preferences");
                }}
              >
                <Settings className="h-4 w-4 shrink-0 text-[#8888AA]" />
                Settings
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-[#2E2E4A]" />

              <DropdownMenu.Item
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none",
                  "text-[#FF8A8A] transition-colors duration-150 ease-out",
                  "hover:bg-[#3d1f24] hover:text-[#FFB4B4]",
                  "data-[highlighted]:bg-[#3d1f24] data-[highlighted]:text-[#FFB4B4]",
                  "focus-visible:ring-2 focus-visible:ring-[#FF6B6B]/35"
                )}
                onSelect={() => {
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4 shrink-0" />
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
