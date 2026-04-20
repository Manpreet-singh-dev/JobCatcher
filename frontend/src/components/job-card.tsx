"use client";

import * as React from "react";
import { MapPin, Building2, Clock, Briefcase, DollarSign, ExternalLink, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatRelativeTime, formatSalary, getInitials, generateGradient, truncateText } from "@/lib/utils";
import type { Job, ApplicationStatus } from "@/types";

interface JobCardProps {
  job: Job;
  status?: ApplicationStatus;
  onViewDetails?: () => void;
  onApprove?: () => void;
  onSkip?: () => void;
  className?: string;
}

const workModeLabels: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const employmentTypeLabels: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  contract: "Contract",
  internship: "Internship",
};

function JobCard({
  job,
  status,
  onViewDetails,
  onApprove,
  onSkip,
  className,
}: JobCardProps) {
  return (
    <Card
      variant="interactive"
      className={cn("p-5", onViewDetails && "cursor-pointer", className)}
      onClick={onViewDetails}
    >
      <div className="flex items-start gap-4">
        {/* Company Logo / Initials Avatar */}
        <div className="shrink-0">
          {job.company_logo_url ? (
            <img
              src={job.company_logo_url}
              alt={job.company}
              className="h-12 w-12 rounded-md object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ background: generateGradient(job.company) }}
            >
              {getInitials(job.company)}
            </div>
          )}
        </div>

        {/* Job Info */}
        <div className="flex-1 min-w-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-text-primary truncate">
              {job.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-text-secondary">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{job.company}</span>
              <span className="text-text-muted">·</span>
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={job.work_mode as "remote" | "hybrid" | "onsite"}>
              {workModeLabels[job.work_mode]}
            </Badge>
            <Badge variant="default">
              <Briefcase className="h-3 w-3" />
              {employmentTypeLabels[job.employment_type]}
            </Badge>
            {(job.salary_min || job.salary_max) && (
              <Badge variant="default">
                <DollarSign className="h-3 w-3" />
                {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
              </Badge>
            )}
            {status && <StatusBadge status={status} />}
          </div>

          {/* Description preview */}
          {job.description && (
            <p className="mt-2 text-sm text-text-muted line-clamp-2">
              {truncateText(job.description, 180)}
            </p>
          )}

          {/* Footer row */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(job.posted_at)}</span>
            </div>

            <div className="flex items-center gap-2">
              {onViewDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails();
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Details
                </Button>
              )}
              {onSkip && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Skip
                </Button>
              )}
              {onApprove && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove();
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve & Apply
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export { JobCard };
