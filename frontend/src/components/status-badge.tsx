"use client";

import {
  Clock,
  CheckCircle,
  Eye,
  Calendar,
  Star,
  XCircle,
  Hourglass,
  Mail,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/utils";
import type { ApplicationStatus } from "@/types";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pending_approval: Clock,
  cv_preparing: Loader2,
  cv_emailed: Mail,
  applied_confirmed: CheckCircle,
  approved: CheckCircle,
  submitted: CheckCircle,
  applied: CheckCircle,
  in_review: Eye,
  interview: Calendar,
  offer: Star,
  rejected: XCircle,
  expired: Hourglass,
  failed: XCircle,
};

function StatusBadge({ status, className }: StatusBadgeProps) {
  const Icon = statusIcons[status] || CheckCircle;
  const variant = status as ApplicationStatus;
  const iconClass = status === "cv_preparing" ? "h-3 w-3 animate-spin" : "h-3 w-3";

  return (
    <Badge variant={variant} className={className}>
      <Icon className={iconClass} />
      {getStatusLabel(variant)}
    </Badge>
  );
}

export default StatusBadge;
export { StatusBadge };
