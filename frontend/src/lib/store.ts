"use client";

import { create } from "zustand";
import type { User, AgentStatus, Notification } from "@/types";

interface AppState {
  user: User | null;
  agentStatus: AgentStatus;
  notifications: Notification[];
  sidebarCollapsed: boolean;

  setUser: (user: User | null) => void;
  setAgentStatus: (status: AgentStatus) => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  agentStatus: {
    is_active: true,
    is_running: false,
    applications_today: 0,
    max_applications_per_day: 5,
  },
  notifications: [],
  sidebarCollapsed: false,

  setUser: (user) => set({ user }),

  setAgentStatus: (agentStatus) => set({ agentStatus }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
