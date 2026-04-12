"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Target,
  CheckCircle2,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import StatCard from "@/components/stat-card";

const applicationsOverTime = [
  { date: "Mar 1", count: 2 },
  { date: "Mar 8", count: 5 },
  { date: "Mar 15", count: 3 },
  { date: "Mar 22", count: 7 },
  { date: "Mar 29", count: 6 },
  { date: "Apr 1", count: 4 },
  { date: "Apr 2", count: 5 },
  { date: "Apr 3", count: 8 },
  { date: "Apr 4", count: 3 },
  { date: "Apr 5", count: 6 },
  { date: "Apr 6", count: 4 },
  { date: "Apr 7", count: 7 },
];

const statusDistribution = [
  { name: "Applied", value: 18, color: "#6C63FF" },
  { name: "In Review", value: 8, color: "#8888AA" },
  { name: "Interview", value: 5, color: "#00D4AA" },
  { name: "Offer", value: 2, color: "#00D4AA" },
  { name: "Rejected", value: 7, color: "#FF6B6B" },
  { name: "Pending", value: 7, color: "#FFD93D" },
];

const matchScoreHistogram = [
  { range: "50-59%", count: 2 },
  { range: "60-69%", count: 5 },
  { range: "70-79%", count: 12 },
  { range: "80-89%", count: 18 },
  { range: "90-100%", count: 10 },
];

const applicationsBySource = [
  { source: "LinkedIn", count: 22 },
  { source: "Indeed", count: 10 },
  { source: "AngelList", count: 7 },
  { source: "Glassdoor", count: 5 },
  { source: "Company Sites", count: 3 },
];

const topSkillsDemanded = [
  { skill: "React", count: 35 },
  { skill: "TypeScript", count: 31 },
  { skill: "Node.js", count: 24 },
  { skill: "Python", count: 18 },
  { skill: "AWS", count: 16 },
  { skill: "PostgreSQL", count: 14 },
  { skill: "Docker", count: 12 },
  { skill: "GraphQL", count: 9 },
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#2E2E4A] bg-[#1A1A2E] px-3 py-2 shadow-xl">
      {label && <p className="mb-1 text-xs text-[#55557A]">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-[#1A1A2E]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F0FF]">Analytics</h1>
          <p className="text-sm text-[#8888AA]">
            Track your application performance and trends
          </p>
        </div>
        <div className="flex rounded-lg border border-[#2E2E4A] bg-[#1A1A2E]">
          {(["week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm capitalize transition-colors first:rounded-l-lg last:rounded-r-lg ${
                period === p
                  ? "bg-[#6C63FF] font-medium text-white"
                  : "text-[#55557A] hover:text-[#8888AA]"
              }`}
            >
              {p === "all" ? "All Time" : `This ${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Applications This Month"
          value="47"
          icon={<Send className="h-5 w-5" />}
          trend="+23% vs last month"
          trendUp={true}
        />
        <StatCard
          title="Avg Match Score"
          value="84%"
          icon={<Target className="h-5 w-5" />}
          trend="+3% improvement"
          trendUp={true}
        />
        <StatCard
          title="Approval Rate"
          value="91%"
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend="Consistent"
          trendUp={true}
        />
        <StatCard
          title="Success Rate"
          value="15%"
          icon={<TrendingUp className="h-5 w-5" />}
          trend="Interview+ stage"
          trendUp={true}
        />
        <StatCard
          title="Top Skill Demanded"
          value="React"
          icon={<Award className="h-5 w-5" />}
          trend="35 job mentions"
          trendUp={true}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications Over Time */}
        <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
          <h2 className="mb-4 text-base font-semibold text-[#F0F0FF]">
            Applications Over Time
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={applicationsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E2E4A" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#55557A", fontSize: 12 }}
                axisLine={{ stroke: "#2E2E4A" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#55557A", fontSize: 12 }}
                axisLine={{ stroke: "#2E2E4A" }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Applications"
                stroke="#6C63FF"
                strokeWidth={2.5}
                dot={{ fill: "#6C63FF", r: 4, strokeWidth: 0 }}
                activeDot={{ fill: "#6C63FF", r: 6, strokeWidth: 2, stroke: "#0F0F1A" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
          <h2 className="mb-4 text-base font-semibold text-[#F0F0FF]">
            Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                stroke="none"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-[#8888AA]">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Match Score Histogram */}
        <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
          <h2 className="mb-4 text-base font-semibold text-[#F0F0FF]">
            Match Score Distribution
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={matchScoreHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E2E4A" />
              <XAxis
                dataKey="range"
                tick={{ fill: "#55557A", fontSize: 11 }}
                axisLine={{ stroke: "#2E2E4A" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#55557A", fontSize: 12 }}
                axisLine={{ stroke: "#2E2E4A" }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="count"
                name="Jobs"
                radius={[6, 6, 0, 0]}
              >
                {matchScoreHistogram.map((entry, index) => {
                  const ranges = ["#FF6B6B", "#FFD93D", "#6C63FF", "#6C63FF", "#00D4AA"];
                  return <Cell key={`cell-${index}`} fill={ranges[index]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Applications by Source */}
        <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
          <h2 className="mb-4 text-base font-semibold text-[#F0F0FF]">
            Applications by Source
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={applicationsBySource} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#2E2E4A"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#55557A", fontSize: 12 }}
                axisLine={{ stroke: "#2E2E4A" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="source"
                tick={{ fill: "#8888AA", fontSize: 12 }}
                axisLine={{ stroke: "#2E2E4A" }}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="count"
                name="Applications"
                fill="#6C63FF"
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Skills Demanded */}
      <div className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <h2 className="mb-4 text-base font-semibold text-[#F0F0FF]">
          Top Skills Demanded in Matched Jobs
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topSkillsDemanded.map((skill, i) => {
            const maxCount = topSkillsDemanded[0].count;
            const pct = (skill.count / maxCount) * 100;
            return (
              <div key={skill.skill} className="rounded-xl bg-[#0F0F1A] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#F0F0FF]">
                    {skill.skill}
                  </span>
                  <span className="text-xs text-[#55557A]">
                    {skill.count} mentions
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#252540]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor:
                        i < 2 ? "#00D4AA" : i < 5 ? "#6C63FF" : "#8888AA",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
