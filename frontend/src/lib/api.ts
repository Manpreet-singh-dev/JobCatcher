import Cookies from "js-cookie";
import type {
  User,
  UserPreferences,
  Resume,
  Job,
  JobFilters,
  Application,
  ApplicationStatus,
  PaginatedResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const TOKEN_KEY = "jobcatcher_token";
const REFRESH_KEY = "jobcatcher_refresh";

function messageFromApiErrorBody(raw: {
  message?: string;
  detail?: string | { msg?: string }[];
  code?: string;
  details?: Record<string, string[]>;
}): string {
  let msg = "Request failed";
  if (typeof raw.message === "string" && raw.message) msg = raw.message;
  else if (typeof raw.detail === "string") msg = raw.detail;
  else if (Array.isArray(raw.detail)) {
    msg = raw.detail
      .map((d) =>
        typeof d === "object" && d && "msg" in d && typeof d.msg === "string"
          ? d.msg
          : JSON.stringify(d)
      )
      .join(", ");
  }
  return msg;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  }

  private setToken(token: string): void {
    Cookies.set(TOKEN_KEY, token, { expires: 1, sameSite: "strict" });
  }

  private setRefreshToken(token: string): void {
    Cookies.set(REFRESH_KEY, token, { expires: 7, sameSite: "strict" });
  }

  private getRefreshToken(): string | undefined {
    return Cookies.get(REFRESH_KEY);
  }

  private clearTokens(): void {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(REFRESH_KEY);
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.clearTokens();
        return null;
      }

      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          this.clearTokens();
          return null;
        }

        const data = await response.json();
        this.setToken(data.access_token);
        if (data.refresh_token) {
          this.setRefreshToken(data.refresh_token);
        }
        return data.access_token;
      } catch {
        this.clearTokens();
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
      isFormData?: boolean;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = { ...options?.headers };
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (!options?.isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.isFormData
        ? (options.body as FormData)
        : options?.body
          ? JSON.stringify(options.body)
          : undefined,
    });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        const retryResponse = await fetch(url.toString(), {
          method,
          headers,
          body: options?.isFormData
            ? (options.body as FormData)
            : options?.body
              ? JSON.stringify(options.body)
              : undefined,
        });
        if (!retryResponse.ok) {
          const raw = (await retryResponse.json().catch(() => ({}))) as Parameters<
            typeof messageFromApiErrorBody
          >[0];
          throw new ApiError(
            retryResponse.status,
            messageFromApiErrorBody(raw),
            raw.code,
            raw.details
          );
        }
        return retryResponse.json();
      }
      this.clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired", "UNAUTHORIZED");
    }

    if (!response.ok) {
      const raw = (await response.json().catch(() => ({}))) as Parameters<
        typeof messageFromApiErrorBody
      >[0];
      throw new ApiError(
        response.status,
        messageFromApiErrorBody(raw),
        raw.code,
        raw.details
      );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, { body });
  }

  async del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>("POST", path, { body: formData, isFormData: true });
  }

  /** Authenticated GET returning raw bytes (e.g. resume file for preview). */
  async getBlob(path: string): Promise<Blob> {
    const url = new URL(`${this.baseUrl}${path}`);
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(url.toString(), { method: "GET", headers });

    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url.toString(), { method: "GET", headers });
      } else {
        this.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new ApiError(401, "Session expired", "UNAUTHORIZED");
      }
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        detail?: string | { msg?: string }[];
        code?: string;
        details?: Record<string, string[]>;
      };
      let msg = "Request failed";
      if (typeof data.message === "string") msg = data.message;
      else if (typeof data.detail === "string") msg = data.detail;
      else if (Array.isArray(data.detail))
        msg = data.detail.map((d) => (typeof d === "object" && d && "msg" in d ? String(d.msg) : JSON.stringify(d))).join(", ");
      throw new ApiError(response.status, msg, data.code, data.details);
    }

    return response.blob();
  }

  handleAuthResponse(data: { access_token: string; refresh_token: string }): void {
    this.setToken(data.access_token);
    this.setRefreshToken(data.refresh_token);
  }

  logout(): void {
    this.clearTokens();
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string[]>;

  constructor(status: number, message: string, code?: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const client = new ApiClient(BASE_URL);

export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    client.post<{ access_token: string; refresh_token: string; user: User }>("/auth/register", data)
      .then((res) => { client.handleAuthResponse(res); return res; }),

  login: (data: { email: string; password: string }) =>
    client.post<{ access_token: string; refresh_token: string; user: User }>("/auth/login", data)
      .then((res) => { client.handleAuthResponse(res); return res; }),

  logout: () => {
    client.logout();
    return client.post<void>("/auth/logout").catch(() => { /* ignore */ });
  },

  googleAuth: (data: { code: string; redirect_uri: string }) =>
    client.post<{ access_token: string; refresh_token: string; user: User }>("/auth/google", data)
      .then((res) => { client.handleAuthResponse(res); return res; }),

  refreshToken: () =>
    client.post<{ access_token: string; refresh_token: string }>("/auth/refresh"),

  verifyEmail: (token: string) =>
    client.post<{ message: string }>("/auth/verify-email", { token }),
};

export const users = {
  getMe: () => client.get<User>("/users/me"),
  updateMe: (data: Partial<{ name: string }>) =>
    client.put<User>("/users/me", data),
  deleteMe: () => client.del<void>("/users/me"),
};

export const preferences = {
  get: () => client.get<UserPreferences>("/preferences"),
  update: (data: Partial<UserPreferences>) =>
    client.put<UserPreferences>("/preferences", data),
};

export const resumes = {
  list: () => client.get<Resume[]>("/resumes"),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.upload<Resume>("/resumes/upload", formData);
  },
  getById: (id: string) => client.get<Resume>(`/resumes/${id}`),
  /** Binary PDF or DOCX for preview/download (requires auth cookie). */
  getFileBlob: (id: string) => client.getBlob(`/resumes/${id}/file`),
  update: (id: string, data: Partial<Resume>) =>
    client.put<Resume>(`/resumes/${id}`, data),
  delete: (id: string) => client.del<void>(`/resumes/${id}`),
  setBase: (id: string) =>
    client.post<Resume>(`/resumes/${id}/set-base`, {}),
  tailorFromPosting: (body: {
    description: string;
    job_title?: string;
    company?: string;
    location?: string;
    required_skills?: string[];
    email_pdf?: boolean;
  }) => client.post<Resume>("/resumes/tailor-from-posting", body),
};

export const jobs = {
  list: (filters?: JobFilters) =>
    client.get<PaginatedResponse<Job>>("/jobs", filters as Record<string, string | number | boolean | undefined>),
  getById: (id: string) => client.get<Job>(`/jobs/${id}`),
  requestTailoredCv: (id: string) =>
    client.post<{ message: string; job_id: string }>(`/jobs/${id}/tailor-and-email`),
};

export const applications = {
  list: (filters?: {
    status?: ApplicationStatus;
    sort_by?: string;
    sort_order?: "asc" | "desc";
    page?: number;
    per_page?: number;
    page_size?: number;
    needs_apply_confirmation?: boolean;
    in_applied_activity?: boolean;
  }) => {
    const params = { ...filters } as Record<string, string | number | boolean | undefined>;
    if (params.per_page && !params.page_size) {
      params.page_size = params.per_page;
      delete params.per_page;
    }
    return client.get<PaginatedResponse<Application>>("/applications", params);
  },
  create: (jobId: string) =>
    client.post<Application>(`/applications?job_id=${jobId}`),
  getById: (id: string) => client.get<Application>(`/applications/${id}`),
  update: (id: string, data: Partial<Application>) =>
    client.put<Application>(`/applications/${id}`, data),
  approve: (id: string) =>
    client.post<Application>(`/applications/${id}/approve`),
  reject: (id: string) =>
    client.post<Application>(`/applications/${id}/reject`),
  reactivate: (id: string) =>
    client.post<Application>(`/applications/${id}/reactivate`),
  confirmApplied: (id: string) =>
    client.post<Application>(`/applications/${id}/confirm-applied`),
};

