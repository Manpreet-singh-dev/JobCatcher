import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import type { ApplicationStatus } from "@/types";
import { getCurrencyByCode } from "@/lib/geo";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return `Today at ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday at ${format(date, "h:mm a")}`;
  return format(date, "MMM d, yyyy");
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function formatSalary(
  min?: number,
  max?: number,
  currency: string = "USD"
): string {
  const curr = getCurrencyByCode(currency);
  const locale = curr?.locale || "en-US";

  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
  } catch {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }

  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
  if (min) return `From ${formatter.format(min)}`;
  if (max) return `Up to ${formatter.format(max)}`;
  return "Not specified";
}

export function formatMatchScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function getScoreColor(score: number): string {
  if (score >= 85) return "text-score-excellent";
  if (score >= 70) return "text-score-good";
  if (score >= 55) return "text-score-fair";
  return "text-score-low";
}

export function getScoreHexColor(score: number): string {
  if (score >= 85) return "#00D4AA";
  if (score >= 70) return "#6C63FF";
  if (score >= 55) return "#FFD93D";
  return "#FF6B6B";
}

export function getScoreBgColor(score: number): string {
  if (score >= 85) return "bg-score-excellent/10";
  if (score >= 70) return "bg-score-good/10";
  if (score >= 55) return "bg-score-fair/10";
  return "bg-score-low/10";
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Low";
}

export function getStatusColor(status: ApplicationStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    pending_approval: {
      bg: "bg-accent-yellow/10",
      text: "text-accent-yellow",
      border: "border-accent-yellow/30",
      dot: "bg-accent-yellow",
    },
    cv_emailed: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/30",
      dot: "bg-accent",
    },
    applied_confirmed: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/30",
      dot: "bg-accent",
    },
    approved: {
      bg: "bg-primary/10",
      text: "text-primary-light",
      border: "border-primary/30",
      dot: "bg-primary",
    },
    submitted: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/30",
      dot: "bg-accent",
    },
    failed: {
      bg: "bg-accent-warm/10",
      text: "text-accent-warm",
      border: "border-accent-warm/30",
      dot: "bg-accent-warm",
    },
    applied: {
      bg: "bg-primary/10",
      text: "text-primary-light",
      border: "border-primary/30",
      dot: "bg-primary",
    },
    in_review: {
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/30",
      dot: "bg-purple-500",
    },
    interview: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/30",
      dot: "bg-accent",
    },
    offer: {
      bg: "bg-accent/10",
      text: "text-accent",
      border: "border-accent/30",
      dot: "bg-accent",
    },
    rejected: {
      bg: "bg-accent-warm/10",
      text: "text-accent-warm",
      border: "border-accent-warm/30",
      dot: "bg-accent-warm",
    },
    expired: {
      bg: "bg-text-muted/10",
      text: "text-text-muted",
      border: "border-text-muted/30",
      dot: "bg-text-muted",
    },
  };

  return colors[status] ?? colors.pending_approval;
}

export function getStatusLabel(status: ApplicationStatus | string): string {
  const labels: Record<string, string> = {
    pending_approval: "Pending Approval",
    cv_emailed: "CV emailed",
    applied_confirmed: "Applied (logged)",
    approved: "Approved",
    submitted: "Submitted",
    applied: "Applied",
    in_review: "In Review",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
    expired: "Expired",
    failed: "Failed",
  };
  return labels[status] || status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 40%))`;
}
