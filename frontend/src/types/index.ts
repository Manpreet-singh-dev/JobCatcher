export interface User {
  id: string;
  email: string;
  name?: string;
  email_verified: boolean;
  agent_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  desired_titles?: string[] | null;
  employment_types?: string[] | null;
  work_modes?: string[] | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  preferred_locations?: string[] | null;
  open_to_relocation?: boolean;
  years_experience_min?: number | null;
  years_experience_max?: number | null;
  primary_skills?: string[] | null;
  secondary_skills?: string[] | null;
  industries?: string[] | null;
  company_sizes?: string[] | null;
  preferred_companies?: string[] | null;
  blacklisted_companies?: string[] | null;
  min_match_score?: number | null;
  max_applications_per_day?: number | null;
  agent_active_hours_start?: string | null;
  agent_active_hours_end?: string | null;
  agent_timezone?: string | null;
  approval_mode?: string | null;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  version_name?: string;
  is_base: boolean;
  original_filename?: string;
  file_path?: string;
  parsed_json?: Record<string, unknown>;
  created_at: string;
  message?: string;
}

export interface Job {
  id: string;
  external_id: string;
  source: string;
  title: string;
  company: string;
  company_logo_url?: string;
  location: string;
  work_mode: "remote" | "hybrid" | "onsite";
  employment_type: "full_time" | "part_time" | "contract" | "internship";
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  description: string;
  requirements: string[];
  benefits: string[];
  application_url: string;
  posted_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface JobFilters {
  search?: string;
  location?: string;
  work_mode?: "remote" | "hybrid" | "onsite";
  employment_type?: "full_time" | "part_time" | "contract" | "internship";
  salary_min?: number;
  salary_max?: number;
  source?: string;
  sort_by?: "posted_at" | "salary";
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
  page_size?: number;
  /** When true, backend applies saved profile preferences to the job list. */
  apply_preferences?: boolean;
}

export type ApplicationStatus =
  | "pending_approval"
  | "cv_preparing"
  | "cv_emailed"
  | "applied_confirmed"
  | "approved"
  | "submitted"
  | "rejected"
  | "expired"
  | "failed";

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_id?: string;
  tailored_resume_id?: string;
  match_score?: number;
  match_analysis?: MatchAnalysis;
  user_applied_confirmed_at?: string | null;
  status: string;
  approval_token_expires_at?: string;
  approval_action_at?: string;
  submitted_at?: string;
  submission_error?: string;
  user_notes?: string;
  created_at: string;
  updated_at: string;
  job?: Job;
}

export interface MatchAnalysis {
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  match_reasons?: string[];
  concerns?: string[];
  recommended?: boolean;
}

export interface AgentStatus {
  is_active: boolean;
  is_running: boolean;
  last_run_at?: string;
  next_run_at?: string;
  applications_today: number;
  max_applications_per_day: number;
}

export interface AgentLog {
  id: string;
  user_id?: string;
  event_type?: string;
  message?: string;
  metadata_?: Record<string, unknown>;
  created_at: string;
}

export interface AnalyticsSummary {
  total_applications: number;
  pending_approval: number;
  cv_emailed: number;
  approved: number;
  submitted: number;
  rejected: number;
  expired: number;
  average_match_score: number;
  approval_rate: number;
  submission_success_rate: number;
}

export interface ApplicationsOverTime {
  date: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface TopSkill {
  skill: string;
  count: number;
  match_rate: number;
}

export interface MatchScoreHistogramBucket {
  range_label: string;
  count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  timestamp: number;
}
