"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Code2,
  Building2,
  Bot,
  Mail,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Loader2,
  Globe,
  Clock,
  Plus,
} from "lucide-react";
import { CountrySelect, CitySelect, CurrencySelect } from "@/components/geo";
import { getCountryByCode, getCitiesByCountry, countries as allCountries } from "@/lib/geo";

const STEPS = [
  { label: "Job Basics", icon: Briefcase },
  { label: "Experience & Skills", icon: Code2 },
  { label: "Company Prefs", icon: Building2 },
  { label: "Agent Settings", icon: Bot },
  { label: "Connect Email", icon: Mail },
];

const JOB_TITLE_SUGGESTIONS = [
  "Software Engineer",
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Product Manager",
  "UX Designer",
  "QA Engineer",
  "Mobile Developer",
  "Cloud Architect",
];

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const WORK_MODES = ["Remote", "Hybrid", "On-site"];

const SKILL_SUGGESTIONS = [
  // Languages
  "TypeScript", "JavaScript", "Python", "Java", "C#", "C++", "Go", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Dart", "Elixir",
  // Frontend
  "React", "Next.js", "Vue.js", "Angular", "Svelte", "TailwindCSS",
  "HTML/CSS", "SASS", "Material UI", "Storybook", "Redux", "Zustand",
  // Backend
  "Node.js", "Express.js", "Django", "Flask", "FastAPI", "Spring Boot",
  "Ruby on Rails", "Laravel", ".NET", "NestJS", "GraphQL", "REST APIs", "gRPC",
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
  "SQLite", "Cassandra", "Neo4j", "Supabase", "Firebase",
  // Cloud & DevOps
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
  "Jenkins", "CI/CD", "GitHub Actions", "Linux", "Nginx",
  // Data & ML
  "Pandas", "NumPy", "TensorFlow", "PyTorch", "Scikit-learn",
  "Spark", "Airflow", "dbt", "Snowflake", "BigQuery", "Kafka",
  // Mobile
  "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
  // Testing
  "Jest", "Cypress", "Playwright", "Selenium", "Vitest",
  // Other
  "Git", "Figma", "Agile/Scrum", "Microservices", "System Design",
  "WebSockets", "RabbitMQ", "Solidity", "Web3",
];

const EDUCATION_LEVELS = ["Any", "Bachelor's", "Master's", "PhD"];

const INDUSTRIES = [
  "FinTech",
  "EdTech",
  "SaaS",
  "Healthcare",
  "E-commerce",
  "AI/ML",
  "Cybersecurity",
  "Gaming",
  "Media",
  "Enterprise",
  "Dev Tools",
  "Climate Tech",
];

const COMPANY_SIZES = ["Startup (<50)", "Mid (50–500)", "Large (500+)", "Any"];
const COMPANY_STAGES = [
  "Pre-seed",
  "Seed",
  "Series A–C",
  "Public",
  "Any",
];

const TIMEZONES = [
  "UTC-8 (PST)",
  "UTC-7 (MST)",
  "UTC-6 (CST)",
  "UTC-5 (EST)",
  "UTC+0 (GMT)",
  "UTC+1 (CET)",
  "UTC+5:30 (IST)",
  "UTC+8 (CST)",
  "UTC+9 (JST)",
];

function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = suggestions?.filter(
    (s) =>
      s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  function addTag(tag: string) {
    if (tag.trim() && !tags.includes(tag.trim())) {
      onChange([...tags, tag.trim()]);
    }
    setInput("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-3 py-2.5 focus-within:border-[#6C63FF]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-lg bg-[#6C63FF]/20 px-2.5 py-1 text-xs font-medium text-[#6C63FF]"
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === "Backspace" && !input && tags.length > 0) {
              removeTag(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length === 0 ? placeholder : "Add more…"}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-[#F0F0FF] placeholder-[#55557A] outline-none"
        />
      </div>
      {showSuggestions && filtered && filtered.length > 0 && input && (
        <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] py-1 shadow-xl">
          {filtered.slice(0, 6).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#F0F0FF] hover:bg-[#252540]"
            >
              <Plus className="h-3 w-3 text-[#55557A]" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-[#6C63FF] bg-[#6C63FF]/20 text-[#6C63FF]"
                : "border-[#2E2E4A] bg-[#1A1A2E] text-[#8888AA] hover:border-[#6C63FF]/50"
            }`}
          >
            {active && <Check className="mr-1 inline h-3 w-3" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

interface OnboardingData {
  jobTitles: string[];
  employmentTypes: string[];
  workModes: string[];
  salaryMin: number;
  salaryMax: number;
  currency: string;
  countries: string[];
  locations: string[];
  openToRelocation: boolean;
  yearsOfExperience: number;
  primarySkills: string[];
  secondarySkills: string[];
  educationLevel: string;
  industries: string[];
  companySizes: string[];
  companyStages: string[];
  blacklistedCompanies: string[];
  preferredCompanies: string[];
  minMatchScore: number;
  activeHoursStart: string;
  activeHoursEnd: string;
  timezone: string;
  maxApplicationsPerDay: number;
  notifyEmail: boolean;
  notifyWhatsApp: boolean;
  connectedEmail: string | null;
}

const defaultData: OnboardingData = {
  jobTitles: [],
  employmentTypes: [],
  workModes: [],
  salaryMin: 60000,
  salaryMax: 150000,
  currency: "USD",
  countries: [],
  locations: [],
  openToRelocation: false,
  yearsOfExperience: 3,
  primarySkills: [],
  secondarySkills: [],
  educationLevel: "Any",
  industries: [],
  companySizes: [],
  companyStages: [],
  blacklistedCompanies: [],
  preferredCompanies: [],
  minMatchScore: 75,
  activeHoursStart: "09:00",
  activeHoursEnd: "17:00",
  timezone: "UTC-5 (EST)",
  maxApplicationsPerDay: 5,
  notifyEmail: true,
  notifyWhatsApp: false,
  connectedEmail: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);

  const update = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return data.jobTitles.length > 0 && data.employmentTypes.length > 0;
      case 1:
        return data.primarySkills.length > 0;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const { preferences } = await import("@/lib/api");
      await preferences.update({
        desired_titles: data.jobTitles,
        employment_types: data.employmentTypes.map((t) =>
          t.toLowerCase().replace("-", "_").replace(" ", "_")
        ),
        work_modes: data.workModes.map((m) =>
          m.toLowerCase().replace("-", "").replace(" ", "")
        ),
        salary_min: data.salaryMin,
        salary_max: data.salaryMax,
        salary_currency: data.currency,
        preferred_countries: data.countries,
        preferred_locations: data.locations,
        open_to_relocation: data.openToRelocation,
        years_experience_min: data.yearsOfExperience,
        primary_skills: data.primarySkills,
        secondary_skills: data.secondarySkills,
        industries: data.industries,
        company_sizes: data.companySizes,
        preferred_companies: data.preferredCompanies,
        blacklisted_companies: data.blacklistedCompanies,
        min_match_score: data.minMatchScore,
        max_applications_per_day: data.maxApplicationsPerDay,
      } as Record<string, unknown>);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to save onboarding data", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-[#6C63FF] text-white"
                      : isComplete
                        ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                        : "bg-[#1A1A2E] text-[#55557A]"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    isActive
                      ? "text-[#F0F0FF]"
                      : isComplete
                        ? "text-[#00D4AA]"
                        : "text-[#55557A]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${
                    i < step ? "bg-[#00D4AA]/40" : "bg-[#2E2E4A]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        {/* Step 1: Job Basics */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F0F0FF]">Job Basics</h2>
              <p className="mt-1 text-sm text-[#8888AA]">
                Tell us what kind of roles you&apos;re looking for
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Desired Job Titles *
              </label>
              <TagInput
                tags={data.jobTitles}
                onChange={(v) => update("jobTitles", v)}
                placeholder="e.g. Software Engineer"
                suggestions={JOB_TITLE_SUGGESTIONS}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Employment Type *
              </label>
              <MultiSelect
                options={EMPLOYMENT_TYPES}
                selected={data.employmentTypes}
                onChange={(v) => update("employmentTypes", v)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Work Mode
              </label>
              <MultiSelect
                options={WORK_MODES}
                selected={data.workModes}
                onChange={(v) => update("workModes", v)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Expected Salary Range
              </label>
              <div className="mb-3">
                <CurrencySelect
                  value={data.currency}
                  onChange={(v) => update("currency", v)}
                  placeholder="Select currency..."
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={data.salaryMin}
                  onChange={(e) =>
                    update("salaryMin", parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
                  placeholder="Min"
                />
                <span className="text-[#55557A]">—</span>
                <input
                  type="number"
                  value={data.salaryMax}
                  onChange={(e) =>
                    update("salaryMax", parseInt(e.target.value) || 0)
                  }
                  className="w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
                  placeholder="Max"
                />
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min={0}
                  max={300000}
                  step={5000}
                  value={data.salaryMin}
                  onChange={(e) =>
                    update("salaryMin", parseInt(e.target.value))
                  }
                  className="w-full accent-[#6C63FF]"
                />
                <input
                  type="range"
                  min={0}
                  max={300000}
                  step={5000}
                  value={data.salaryMax}
                  onChange={(e) =>
                    update("salaryMax", parseInt(e.target.value))
                  }
                  className="w-full accent-[#6C63FF]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Preferred Countries
              </label>
              <CountrySelect
                value=""
                onChange={(v) => {
                  if (v && !data.countries.includes(v)) {
                    update("countries", [...data.countries, v]);
                    const c = getCountryByCode(v);
                    if (c && !data.currency) update("currency", c.currency);
                  }
                }}
                placeholder="Add a country..."
              />
              {data.countries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.countries.map((code) => {
                    const c = allCountries.find((ct) => ct.code === code);
                    return (
                      <span key={code} className="flex items-center gap-1.5 rounded-lg bg-[#6C63FF]/20 px-2.5 py-1.5 text-xs font-medium text-[#6C63FF]">
                        {c?.flag} {c?.name || code}
                        <button
                          type="button"
                          onClick={() => {
                            const countryCities = getCitiesByCountry(code);
                            const cityNames = new Set(countryCities.map((city) => city.name));
                            update("countries", data.countries.filter((cc) => cc !== code));
                            update("locations", data.locations.filter((loc) => !cityNames.has(loc)));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Preferred Cities
              </label>
              <CitySelect
                countryCode={data.countries}
                value={data.locations}
                onChange={(v) => update("locations", v)}
                placeholder={data.countries.length > 0 ? "Select cities..." : "Select a country first"}
                disabled={data.countries.length === 0}
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-[#8888AA]">
                <div
                  role="switch"
                  aria-checked={data.openToRelocation}
                  tabIndex={0}
                  onClick={() =>
                    update("openToRelocation", !data.openToRelocation)
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      update("openToRelocation", !data.openToRelocation);
                    }
                  }}
                  className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    data.openToRelocation ? "bg-[#6C63FF]" : "bg-[#2E2E4A]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      data.openToRelocation
                        ? "translate-x-[22px]"
                        : "translate-x-0.5"
                    }`}
                  />
                </div>
                Open to Relocation
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Experience & Skills */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F0F0FF]">
                Experience & Skills
              </h2>
              <p className="mt-1 text-sm text-[#8888AA]">
                Help us match you with the right level of roles
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Years of Experience: {data.yearsOfExperience}
                {data.yearsOfExperience >= 20 ? "+" : ""}
              </label>
              <input
                type="range"
                min={0}
                max={20}
                value={data.yearsOfExperience}
                onChange={(e) =>
                  update("yearsOfExperience", parseInt(e.target.value))
                }
                className="w-full accent-[#6C63FF]"
              />
              <div className="mt-1 flex justify-between text-xs text-[#55557A]">
                <span>0</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20+</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Primary Tech Stack / Skills *
              </label>
              <TagInput
                tags={data.primarySkills}
                onChange={(v) => update("primarySkills", v)}
                placeholder="e.g. React, Node.js, TypeScript"
                suggestions={SKILL_SUGGESTIONS}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Secondary / Nice-to-have Skills
              </label>
              <TagInput
                tags={data.secondarySkills}
                onChange={(v) => update("secondarySkills", v)}
                placeholder="e.g. GraphQL, Docker"
                suggestions={SKILL_SUGGESTIONS}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Education Level
              </label>
              <select
                value={data.educationLevel}
                onChange={(e) => update("educationLevel", e.target.value)}
                className="w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
              >
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Industry Preferences
              </label>
              <MultiSelect
                options={INDUSTRIES}
                selected={data.industries}
                onChange={(v) => update("industries", v)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Company Preferences */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F0F0FF]">
                Company Preferences
              </h2>
              <p className="mt-1 text-sm text-[#8888AA]">
                Define the kind of companies you want to work for
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Company Size
              </label>
              <MultiSelect
                options={COMPANY_SIZES}
                selected={data.companySizes}
                onChange={(v) => update("companySizes", v)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Company Stage
              </label>
              <MultiSelect
                options={COMPANY_STAGES}
                selected={data.companyStages}
                onChange={(v) => update("companyStages", v)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Blacklisted Companies
              </label>
              <TagInput
                tags={data.blacklistedCompanies}
                onChange={(v) => update("blacklistedCompanies", v)}
                placeholder="Companies you don't want to apply to"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Preferred Companies
              </label>
              <TagInput
                tags={data.preferredCompanies}
                onChange={(v) => update("preferredCompanies", v)}
                placeholder="Dream companies"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Minimum Match Score: {data.minMatchScore}%
              </label>
              <input
                type="range"
                min={60}
                max={95}
                value={data.minMatchScore}
                onChange={(e) =>
                  update("minMatchScore", parseInt(e.target.value))
                }
                className="w-full accent-[#6C63FF]"
              />
              <div className="mt-1 flex justify-between text-xs text-[#55557A]">
                <span>60%</span>
                <span>75%</span>
                <span>95%</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Agent Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F0F0FF]">
                Agent Settings
              </h2>
              <p className="mt-1 text-sm text-[#8888AA]">
                Configure how your AI agent operates
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                <Clock className="mr-1 inline h-4 w-4" />
                Agent Active Hours
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={data.activeHoursStart}
                  onChange={(e) =>
                    update("activeHoursStart", e.target.value)
                  }
                  className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
                />
                <span className="text-[#55557A]">to</span>
                <input
                  type="time"
                  value={data.activeHoursEnd}
                  onChange={(e) => update("activeHoursEnd", e.target.value)}
                  className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
                />
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-xs text-[#55557A]">
                  <Globe className="mr-1 inline h-3 w-3" />
                  Timezone
                </label>
                <select
                  value={data.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                  className="w-full rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Max Applications Per Day
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "maxApplicationsPerDay",
                      Math.max(1, data.maxApplicationsPerDay - 1)
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] text-[#F0F0FF] hover:bg-[#252540]"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={data.maxApplicationsPerDay}
                  onChange={(e) =>
                    update(
                      "maxApplicationsPerDay",
                      Math.min(
                        20,
                        Math.max(1, parseInt(e.target.value) || 1)
                      )
                    )
                  }
                  className="w-20 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-4 py-2.5 text-center text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]"
                />
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "maxApplicationsPerDay",
                      Math.min(20, data.maxApplicationsPerDay + 1)
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] text-[#F0F0FF] hover:bg-[#252540]"
                >
                  +
                </button>
                <span className="text-sm text-[#55557A]">per day</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#8888AA]">
                Notification Preferences
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-[#F0F0FF]">
                  <input
                    type="checkbox"
                    checked={data.notifyEmail}
                    onChange={(e) =>
                      update("notifyEmail", e.target.checked)
                    }
                    className="rounded border-[#2E2E4A] accent-[#6C63FF]"
                  />
                  Email notifications
                </label>
                <label className="flex items-center gap-2 text-sm text-[#F0F0FF]">
                  <input
                    type="checkbox"
                    checked={data.notifyWhatsApp}
                    onChange={(e) =>
                      update("notifyWhatsApp", e.target.checked)
                    }
                    className="rounded border-[#2E2E4A] accent-[#6C63FF]"
                  />
                  WhatsApp notifications
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Connect Email */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#F0F0FF]">
                Connect Email
              </h2>
              <p className="mt-1 text-sm text-[#8888AA]">
                Connect your email so the agent can send applications on your
                behalf
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => update("connectedEmail", "gmail")}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 transition-colors ${
                  data.connectedEmail === "gmail"
                    ? "border-[#00D4AA] bg-[#00D4AA]/10"
                    : "border-[#2E2E4A] bg-[#1A1A2E] hover:border-[#6C63FF]/50"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#F0F0FF]">
                    Connect Gmail
                  </p>
                  <p className="text-xs text-[#8888AA]">
                    Use your Google account
                  </p>
                </div>
                {data.connectedEmail === "gmail" && (
                  <div className="flex items-center gap-1 rounded-full bg-[#00D4AA]/20 px-2.5 py-1 text-xs font-medium text-[#00D4AA]">
                    <Check className="h-3 w-3" />
                    Connected
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => update("connectedEmail", "outlook")}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 transition-colors ${
                  data.connectedEmail === "outlook"
                    ? "border-[#00D4AA] bg-[#00D4AA]/10"
                    : "border-[#2E2E4A] bg-[#1A1A2E] hover:border-[#6C63FF]/50"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      fill="#0078D4"
                      d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 0 1-.588.234h-8.488v-6.93l1.674 1.212a.31.31 0 0 0 .378 0L24 7.387zm-9.314 6.11v5.116H.826a.806.806 0 0 1-.588-.234A.771.771 0 0 1 0 17.803V6.197L7.343 11.5l2.343-1.654V5H14.686v6.111l2.343 1.654L24 6.197v1.19l-7.031 5.098a.31.31 0 0 1-.378 0L14.686 11.5v1.997zM0 4.5v.197l7.343 5.303L0 4.697V4.5zm.826-.5h8.488a.806.806 0 0 1 .588.234.771.771 0 0 1 .238.576v.887L7.343 7.851 0 4.197a.771.771 0 0 1 .238-.576A.806.806 0 0 1 .826 4z"
                    />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-[#F0F0FF]">
                    Connect Outlook
                  </p>
                  <p className="text-xs text-[#8888AA]">
                    Use your Microsoft account
                  </p>
                </div>
                {data.connectedEmail === "outlook" && (
                  <div className="flex items-center gap-1 rounded-full bg-[#00D4AA]/20 px-2.5 py-1 text-xs font-medium text-[#00D4AA]">
                    <Check className="h-3 w-3" />
                    Connected
                  </div>
                )}
              </button>
            </div>

            {data.connectedEmail && (
              <div className="flex items-center gap-2 rounded-xl border border-[#00D4AA]/20 bg-[#00D4AA]/5 px-4 py-3 text-sm text-[#00D4AA]">
                <Check className="h-4 w-4" />
                Email connected successfully!
              </div>
            )}

            <button
              type="button"
              onClick={() => update("connectedEmail", null)}
              className="text-sm text-[#55557A] underline hover:text-[#8888AA]"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-[#2E2E4A] pt-6">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] px-5 py-2.5 text-sm font-medium text-[#F0F0FF] transition-colors hover:bg-[#252540] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="text-sm text-[#55557A]">
            {step + 1} of {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5A52E0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#00D4AA] px-5 py-2.5 text-sm font-semibold text-[#0F0F1A] transition-colors hover:bg-[#00D4AA]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Finish Setup
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
