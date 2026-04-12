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

  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3" />
      {getStatusLabel(variant)}
    </Badge>
  );
}

export default StatusBadge;
export { StatusBadge };
