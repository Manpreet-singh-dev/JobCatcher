"use client";

import * as React from "react";
import { cn, getScoreHexColor, getScoreLabel } from "@/lib/utils";

interface MatchScoreRingProps {
  score: number;
  size?: number | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const namedSizes = {
  sm: 48,
  md: 80,
  lg: 120,
};

function MatchScoreRing({ score, size = "md", showLabel = true, className }: MatchScoreRingProps) {
  const dimension = typeof size === "number" ? size : namedSizes[size];
  const strokeWidth = dimension <= 48 ? 3 : dimension <= 80 ? 4 : 5;
  const radius = (dimension - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreHexColor(score);
  const label = getScoreLabel(score);

  const fontSize =
    dimension <= 48 ? "text-xs" : dimension <= 80 ? "text-xl" : "text-3xl";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg
          width={dimension}
          height={dimension}
          viewBox={`0 0 ${dimension} ${dimension}`}
          className="-rotate-90"
        >
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            style={{
              animation: "scoreFill 1s ease-out forwards",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", fontSize)} style={{ color }}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {showLabel && dimension > 48 && (
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
            Match Score
          </span>
          {dimension >= 120 && (
            <span className="text-xs font-medium" style={{ color }}>
              {label}
            </span>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes scoreFill {
          0% {
            stroke-dashoffset: ${circumference};
          }
          100% {
            stroke-dashoffset: ${offset};
          }
        }
      `}</style>
    </div>
  );
}

export default MatchScoreRing;
export { MatchScoreRing };
