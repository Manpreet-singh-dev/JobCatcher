"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  Check,
  X,
  Briefcase,
  Code2,
  Building2,
  Bot,
  Clock,
  Globe,
  Plus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountrySelect, CitySelect, CurrencySelect } from "@/components/geo";
import { getCountryByCode, getCitiesByCountry, countries as allCountries } from "@/lib/geo";

const JOB_TITLE_SUGGESTIONS = [
  "Software Engineer", "Backend Developer", "Frontend Developer",
  "Full Stack Developer", "DevOps Engineer", "Data Scientist",
  "Machine Learning Engineer", "Product Manager", "UX Designer",
  "QA Engineer", "Mobile Developer", "Cloud Architect",
];

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

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EDUCATION_LEVELS = ["Any", "Bachelor's", "Master's", "PhD"];
const INDUSTRIES = [
  "FinTech", "EdTech", "SaaS", "Healthcare", "E-commerce",
  "AI/ML", "Cybersecurity", "Gaming", "Media", "Enterprise", "Dev Tools", "Climate Tech",
];
const COMPANY_SIZES = ["Startup (<50)", "Mid (50–500)", "Large (500+)", "Any"];
const COMPANY_STAGES = ["Pre-seed", "Seed", "Series A–C", "Public", "Any"];
const TIMEZONES = [
  "UTC-8 (PST)", "UTC-7 (MST)", "UTC-6 (CST)", "UTC-5 (EST)",
  "UTC+0 (GMT)", "UTC+1 (CET)", "UTC+5:30 (IST)", "UTC+8 (CST)", "UTC+9 (JST)",
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
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  function addTag(tag: string) {
    if (tag.trim() && !tags.includes(tag.trim())) {
      onChange([...tags, tag.trim()]);
    }
    setInput("");
    setShowSuggestions(false);
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-3 py-2.5 focus-within:border-[#6C63FF]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-lg bg-[#6C63FF]/20 px-2.5 py-1 text-xs font-medium text-[#6C63FF]"
          >
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(input); }
            if (e.key === "Backspace" && !input && tags.length) {
              onChange(tags.slice(0, -1));
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
              <Plus className="h-3 w-3 text-[#55557A]" /> {s}
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
  onChange: (s: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-[#6C63FF] bg-[#6C63FF]/20 text-[#6C63FF]"
                : "border-[#2E2E4A] bg-[#0F0F1A] text-[#8888AA] hover:border-[#6C63FF]/50"
            )}
          >
            {active && <Check className="mr-1 inline h-3 w-3" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface Prefs {
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
}

const defaultPrefs: Prefs = {
  jobTitles: ["Software Engineer", "Frontend Developer"],
  employmentTypes: ["Full-time"],
  workModes: ["Remote", "Hybrid"],
  salaryMin: 120000,
  salaryMax: 200000,
  currency: "USD",
  countries: ["US"],
  locations: ["San Francisco", "New York"],
  openToRelocation: false,
  yearsOfExperience: 6,
  primarySkills: ["React", "TypeScript", "Node.js", "Next.js"],
  secondarySkills: ["GraphQL", "Docker", "AWS"],
  educationLevel: "Bachelor's",
  industries: ["FinTech", "SaaS", "Dev Tools"],
  companySizes: ["Mid (50–500)", "Large (500+)"],
  companyStages: ["Series A–C", "Public"],
  blacklistedCompanies: [],
  preferredCompanies: ["Stripe", "Vercel"],
  minMatchScore: 75,
  activeHoursStart: "09:00",
  activeHoursEnd: "17:00",
  timezone: "UTC-5 (EST)",
  maxApplicationsPerDay: 5,
  notifyEmail: true,
  notifyWhatsApp: false,
};

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const { preferences } = await import("@/lib/api");
        const data = await preferences.get();
        if (data) {
          setPrefs((prev) => ({
            ...prev,
            jobTitles: data.desired_titles || prev.jobTitles,
            employmentTypes: (data.employment_types || []).map((t: string) =>
              t.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
            ),
            workModes: (data.work_modes || []).map((m: string) =>
              m === "remote" ? "Remote" : m === "hybrid" ? "Hybrid" : "On-site"
            ),
            salaryMin: data.salary_min ?? prev.salaryMin,
            salaryMax: data.salary_max ?? prev.salaryMax,
            currency: data.salary_currency || prev.currency,
            countries: data.preferred_countries || prev.countries,
            locations: data.preferred_locations || prev.locations,
            openToRelocation: data.open_to_relocation ?? prev.openToRelocation,
            yearsOfExperience: data.years_experience_min ?? prev.yearsOfExperience,
            primarySkills: data.primary_skills || prev.primarySkills,
            secondarySkills: data.secondary_skills || prev.secondarySkills,
            industries: data.industries || prev.industries,
            companySizes: data.company_sizes || prev.companySizes,
            blacklistedCompanies: data.blacklisted_companies || prev.blacklistedCompanies,
            preferredCompanies: data.preferred_companies || prev.preferredCompanies,
            minMatchScore: data.min_match_score ?? prev.minMatchScore,
            maxApplicationsPerDay: data.max_applications_per_day ?? prev.maxApplicationsPerDay,
            timezone: data.agent_timezone ?? prev.timezone,
          }));
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    }
    loadPrefs();
  }, []);

  const update = useCallback(
    <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
      setPrefs((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    []
  );

  async function handleSave() {
    setSaving(true);
    try {
      const { preferences } = await import("@/lib/api");
      await preferences.update({
        desired_titles: prefs.jobTitles,
        employment_types: prefs.employmentTypes.map((t) =>
          t.toLowerCase().replace("-", "_").replace(" ", "_")
        ),
        work_modes: prefs.workModes.map((m) =>
          m.toLowerCase().replace("-", "").replace(" ", "")
        ),
        salary_min: prefs.salaryMin,
        salary_max: prefs.salaryMax,
        salary_currency: prefs.currency,
        preferred_countries: prefs.countries,
        preferred_locations: prefs.locations,
        open_to_relocation: prefs.openToRelocation,
        years_experience_min: prefs.yearsOfExperience,
        primary_skills: prefs.primarySkills,
        secondary_skills: prefs.secondarySkills,
        industries: prefs.industries,
        company_sizes: prefs.companySizes,
        preferred_companies: prefs.preferredCompanies,
        blacklisted_companies: prefs.blacklistedCompanies,
        min_match_score: prefs.minMatchScore,
        max_applications_per_day: prefs.maxApplicationsPerDay,
        agent_timezone: prefs.timezone,
      } as Record<string, unknown>);
      setSaved(true);
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[#252540]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-[#1A1A2E]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F0F0FF]">Preferences</h1>
          <p className="text-sm text-[#8888AA]">
            Configure your job search criteria and how we match roles to you
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5A52E0] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Changes
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 px-4 py-3 text-sm text-[#6C63FF]">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Changes apply the next time you browse jobs or request a tailored CV.
      </div>

      {/* Job Basics */}
      <section className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[#6C63FF]" />
          <h2 className="text-lg font-semibold text-[#F0F0FF]">Job Basics</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Desired Job Titles</label>
            <TagInput tags={prefs.jobTitles} onChange={(v) => update("jobTitles", v)} placeholder="e.g. Software Engineer" suggestions={JOB_TITLE_SUGGESTIONS} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Employment Type</label>
            <MultiSelect options={EMPLOYMENT_TYPES} selected={prefs.employmentTypes} onChange={(v) => update("employmentTypes", v)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Work Mode</label>
            <MultiSelect options={WORK_MODES} selected={prefs.workModes} onChange={(v) => update("workModes", v)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Salary Range</label>
            <div className="mb-3">
              <CurrencySelect value={prefs.currency} onChange={(v) => update("currency", v)} />
            </div>
            <div className="flex items-center gap-3">
              <input type="number" value={prefs.salaryMin} onChange={(e) => update("salaryMin", parseInt(e.target.value) || 0)} className="w-full rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]" placeholder="Min" />
              <span className="text-[#55557A]">—</span>
              <input type="number" value={prefs.salaryMax} onChange={(e) => update("salaryMax", parseInt(e.target.value) || 0)} className="w-full rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]" placeholder="Max" />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Preferred Countries</label>
            <CountrySelect
              value=""
              onChange={(v) => {
                if (v && !prefs.countries.includes(v)) {
                  update("countries", [...prefs.countries, v]);
                  const c = getCountryByCode(v);
                  if (c && !prefs.currency) update("currency", c.currency);
                }
              }}
              placeholder="Add a country..."
            />
            {prefs.countries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {prefs.countries.map((code) => {
                  const c = allCountries.find((ct) => ct.code === code);
                  return (
                    <span key={code} className="flex items-center gap-1.5 rounded-lg bg-[#6C63FF]/20 px-2.5 py-1.5 text-xs font-medium text-[#6C63FF]">
                      {c?.flag} {c?.name || code}
                      <button
                        type="button"
                        onClick={() => {
                          const countryCities = getCitiesByCountry(code);
                          const cityNames = new Set(countryCities.map((city) => city.name));
                          update("countries", prefs.countries.filter((cc) => cc !== code));
                          update("locations", prefs.locations.filter((loc) => !cityNames.has(loc)));
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
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Preferred Cities</label>
            <CitySelect countryCode={prefs.countries} value={prefs.locations} onChange={(v) => update("locations", v)} placeholder={prefs.countries.length > 0 ? "Select cities..." : "Select a country first"} disabled={prefs.countries.length === 0} />
            <label className="mt-3 flex items-center gap-2 text-sm text-[#8888AA]">
              <div
                role="switch"
                aria-checked={prefs.openToRelocation}
                tabIndex={0}
                onClick={() => update("openToRelocation", !prefs.openToRelocation)}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); update("openToRelocation", !prefs.openToRelocation); } }}
                className={cn("relative h-6 w-11 cursor-pointer rounded-full transition-colors", prefs.openToRelocation ? "bg-[#6C63FF]" : "bg-[#2E2E4A]")}
              >
                <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", prefs.openToRelocation ? "translate-x-[22px]" : "translate-x-0.5")} />
              </div>
              Open to Relocation
            </label>
          </div>
        </div>
      </section>

      {/* Experience & Skills */}
      <section className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-[#6C63FF]" />
          <h2 className="text-lg font-semibold text-[#F0F0FF]">Experience & Skills</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">
              Years of Experience: {prefs.yearsOfExperience}{prefs.yearsOfExperience >= 20 ? "+" : ""}
            </label>
            <input type="range" min={0} max={20} value={prefs.yearsOfExperience} onChange={(e) => update("yearsOfExperience", parseInt(e.target.value))} className="w-full accent-[#6C63FF]" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Primary Skills</label>
            <TagInput tags={prefs.primarySkills} onChange={(v) => update("primarySkills", v)} placeholder="e.g. React, TypeScript" suggestions={SKILL_SUGGESTIONS} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Secondary Skills</label>
            <TagInput tags={prefs.secondarySkills} onChange={(v) => update("secondarySkills", v)} placeholder="e.g. GraphQL, Docker" suggestions={SKILL_SUGGESTIONS} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Education Level</label>
            <select value={prefs.educationLevel} onChange={(e) => update("educationLevel", e.target.value)} className="w-full rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]">
              {EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Industry Preferences</label>
            <MultiSelect options={INDUSTRIES} selected={prefs.industries} onChange={(v) => update("industries", v)} />
          </div>
        </div>
      </section>

      {/* Company Preferences */}
      <section className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#6C63FF]" />
          <h2 className="text-lg font-semibold text-[#F0F0FF]">Company Preferences</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Company Size</label>
            <MultiSelect options={COMPANY_SIZES} selected={prefs.companySizes} onChange={(v) => update("companySizes", v)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Company Stage</label>
            <MultiSelect options={COMPANY_STAGES} selected={prefs.companyStages} onChange={(v) => update("companyStages", v)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Blacklisted Companies</label>
            <TagInput tags={prefs.blacklistedCompanies} onChange={(v) => update("blacklistedCompanies", v)} placeholder="Companies to avoid" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Preferred Companies</label>
            <TagInput tags={prefs.preferredCompanies} onChange={(v) => update("preferredCompanies", v)} placeholder="Dream companies" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">
              Minimum Match Score: {prefs.minMatchScore}%
            </label>
            <input type="range" min={60} max={95} value={prefs.minMatchScore} onChange={(e) => update("minMatchScore", parseInt(e.target.value))} className="w-full accent-[#6C63FF]" />
          </div>
        </div>
      </section>

      {/* Agent Settings */}
      <section className="rounded-xl border border-[#2E2E4A] bg-[#1A1A2E] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Bot className="h-5 w-5 text-[#6C63FF]" />
          <h2 className="text-lg font-semibold text-[#F0F0FF]">Agent Settings</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-2 flex items-center gap-1 text-sm font-medium text-[#8888AA]">
              <Clock className="h-4 w-4" /> Active Hours
            </label>
            <div className="flex items-center gap-3">
              <input type="time" value={prefs.activeHoursStart} onChange={(e) => update("activeHoursStart", e.target.value)} className="rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]" />
              <span className="text-[#55557A]">to</span>
              <input type="time" value={prefs.activeHoursEnd} onChange={(e) => update("activeHoursEnd", e.target.value)} className="rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]" />
            </div>
            <div className="mt-2">
              <label className="mb-1 flex items-center gap-1 text-xs text-[#55557A]">
                <Globe className="h-3 w-3" /> Timezone
              </label>
              <select value={prefs.timezone} onChange={(e) => update("timezone", e.target.value)} className="w-full rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-3 text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]">
                {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Max Applications Per Day</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => update("maxApplicationsPerDay", Math.max(1, prefs.maxApplicationsPerDay - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] text-[#F0F0FF] hover:bg-[#252540]">−</button>
              <input type="number" min={1} max={20} value={prefs.maxApplicationsPerDay} onChange={(e) => update("maxApplicationsPerDay", Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))} className="w-20 rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] px-4 py-2.5 text-center text-sm text-[#F0F0FF] outline-none focus:border-[#6C63FF]" />
              <button type="button" onClick={() => update("maxApplicationsPerDay", Math.min(20, prefs.maxApplicationsPerDay + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2E2E4A] bg-[#0F0F1A] text-[#F0F0FF] hover:bg-[#252540]">+</button>
              <span className="text-sm text-[#55557A]">per day</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#8888AA]">Notifications</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-[#F0F0FF]">
                <input type="checkbox" checked={prefs.notifyEmail} onChange={(e) => update("notifyEmail", e.target.checked)} className="accent-[#6C63FF]" />
                Email notifications
              </label>
              <label className="flex items-center gap-2 text-sm text-[#F0F0FF]">
                <input type="checkbox" checked={prefs.notifyWhatsApp} onChange={(e) => update("notifyWhatsApp", e.target.checked)} className="accent-[#6C63FF]" />
                WhatsApp notifications
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[#6C63FF] px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5A52E0] disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="h-4 w-4" /> Saved</>
          ) : (
            <><Save className="h-4 w-4" /> Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}
