"""
JSearch (RapidAPI) scraper — aggregates LinkedIn, Indeed, Glassdoor,
ZipRecruiter, and more via a single REST API.

Requires RAPIDAPI_KEY in environment / .env.
"""

import logging
import re
from typing import Any

import httpx

from workers.scrapers.base import BaseJobScraper

logger = logging.getLogger(__name__)

EMPLOYMENT_TYPE_MAP = {
    "fulltime": "FULLTIME",
    "full_time": "FULLTIME",
    "full-time": "FULLTIME",
    "parttime": "PARTTIME",
    "part_time": "PARTTIME",
    "part-time": "PARTTIME",
    "contract": "CONTRACTOR",
    "contractor": "CONTRACTOR",
    "internship": "INTERN",
    "intern": "INTERN",
}

EXPERIENCE_MAP = {
    "entry": "under_3_years_experience",
    "junior": "under_3_years_experience",
    "mid": "more_than_3_years_experience",
    "senior": "more_than_3_years_experience",
    "none": "no_experience",
}


class JSearchScraper(BaseJobScraper):
    SOURCE_NAME = "jsearch"
    MAX_REQUESTS_PER_HOUR = 200
    MIN_DELAY = 0.5
    MAX_DELAY = 1.5

    API_HOST = "jsearch.p.rapidapi.com"
    SEARCH_URL = f"https://{API_HOST}/search"

    def __init__(self, api_key: str | None = None):
        super().__init__()
        if api_key:
            self._api_key = api_key
        else:
            from app.core.config import settings
            self._api_key = getattr(settings, "RAPIDAPI_KEY", None) or ""
        self._client: httpx.Client | None = None

    def _get_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(
                timeout=httpx.Timeout(30.0, connect=10.0),
                follow_redirects=True,
            )
        return self._client

    def _api_headers(self) -> dict[str, str]:
        return {
            "x-rapidapi-host": self.API_HOST,
            "x-rapidapi-key": self._api_key,
        }

    def _build_search_url(self, preferences: dict[str, Any]) -> str:
        return self.SEARCH_URL

    def _build_params(self, title: str, preferences: dict[str, Any]) -> dict[str, str]:
        location = preferences.get("location", "")
        query = f"{title} in {location}" if location else title

        params: dict[str, str] = {
            "query": query,
            "page": "1",
            "num_pages": str(preferences.get("num_pages", 3)),
        }

        country = preferences.get("country", "")
        if country:
            params["country"] = country.lower()

        date_posted = preferences.get("date_posted", "week")
        date_map = {"24h": "today", "today": "today", "past_week": "week", "week": "week", "month": "month"}
        params["date_posted"] = date_map.get(date_posted, "week")

        emp_types = preferences.get("employment_types", [])
        if emp_types:
            mapped = []
            for et in emp_types:
                mapped_val = EMPLOYMENT_TYPE_MAP.get(et.lower().replace(" ", "_"), "")
                if mapped_val:
                    mapped.append(mapped_val)
            if mapped:
                params["employment_types"] = ",".join(set(mapped))

        work_mode = preferences.get("work_mode", "")
        if work_mode and "remote" in work_mode.lower():
            params["remote_jobs_only"] = "true"

        return params

    def _execute_search(self, query_params: dict[str, Any]) -> list[Any]:
        if not self._api_key:
            logger.error("RAPIDAPI_KEY not configured, cannot use JSearch")
            return []

        client = self._get_client()
        results: list[Any] = []

        titles = query_params.get("titles") or [query_params.get("title", "software engineer")]

        for title in titles:
            self._wait_for_rate_limit()
            params = self._build_params(title, query_params)

            try:
                resp = client.get(
                    self.SEARCH_URL,
                    params=params,
                    headers=self._api_headers(),
                )

                if resp.status_code == 429:
                    logger.warning("JSearch rate-limited (429)")
                    break
                if resp.status_code == 403:
                    logger.error("JSearch API key invalid or quota exceeded (403)")
                    break

                resp.raise_for_status()
                data = resp.json()

                jobs = data.get("data", [])
                results.extend(jobs)
                logger.info(
                    "JSearch returned %d jobs for '%s' (status: %s)",
                    len(jobs), title, data.get("status", "unknown"),
                )

                self._random_delay()

            except httpx.HTTPStatusError as exc:
                logger.warning("JSearch HTTP %s for '%s'", exc.response.status_code, title)
                break
            except Exception:
                logger.error("JSearch request failed for '%s'", title, exc_info=True)
                continue

        return results

    def _normalize_job(self, raw_data: Any) -> dict[str, Any]:
        job = raw_data
        if not isinstance(job, dict):
            return {}

        title = (job.get("job_title") or "").strip()
        company = (job.get("employer_name") or "").strip()
        if not title or not company:
            return {}

        city = job.get("job_city") or ""
        state = job.get("job_state") or ""
        country = job.get("job_country") or ""
        location_parts = [p for p in [city, state, country] if p]
        location = ", ".join(location_parts)

        work_mode = self._determine_work_mode(job)
        employment_type = self._normalize_employment_type(job.get("job_employment_type"))

        salary_min = self._safe_int(job.get("job_min_salary"))
        salary_max = self._safe_int(job.get("job_max_salary"))
        salary_currency = job.get("job_salary_currency") or None

        description = (job.get("job_description") or "").strip() or None

        required_skills = job.get("job_required_skills") or []
        if isinstance(required_skills, str):
            required_skills = [s.strip() for s in required_skills.split(",") if s.strip()]

        highlights = job.get("job_highlights", {})
        qualifications = highlights.get("Qualifications") or []
        responsibilities = highlights.get("Responsibilities") or []

        if not required_skills and qualifications:
            required_skills = self._extract_skills_from_highlights(qualifications)

        experience_str = job.get("job_required_experience", {})
        experience_required = None
        if isinstance(experience_str, dict):
            exp_text = experience_str.get("required_experience_in_months")
            if exp_text:
                months = self._safe_int(exp_text)
                if months:
                    experience_required = f"{months // 12}+ years" if months >= 12 else f"{months} months"
            if not experience_required:
                exp_text = experience_str.get("experience_mentioned")
                if exp_text:
                    experience_required = str(exp_text)

        apply_url = job.get("job_apply_link") or ""
        if not apply_url:
            apply_options = job.get("apply_options", [])
            if apply_options and isinstance(apply_options, list):
                apply_url = apply_options[0].get("apply_link", "")

        posted_at = job.get("job_posted_at_datetime_utc") or job.get("job_posted_at") or None

        source_job_id = job.get("job_id", "")
        publisher = (job.get("job_publisher") or "jsearch").lower()

        company_logo = job.get("employer_logo") or None

        return {
            "source": f"jsearch:{publisher}",
            "source_job_id": source_job_id,
            "title": title,
            "company": company,
            "company_logo_url": company_logo,
            "location": location,
            "work_mode": work_mode,
            "employment_type": employment_type,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": salary_currency,
            "description": description,
            "required_skills": required_skills[:20] if required_skills else [],
            "preferred_skills": [],
            "experience_required": experience_required,
            "apply_url": apply_url,
            "posted_date": posted_at,
            "scraped_at": self._now_utc(),
        }

    @staticmethod
    def _determine_work_mode(job: dict) -> str | None:
        if job.get("job_is_remote"):
            return "remote"
        title = (job.get("job_title") or "").lower()
        city = (job.get("job_city") or "").lower()
        desc = (job.get("job_description") or "")[:500].lower()
        combined = f"{title} {city} {desc}"
        if "remote" in combined:
            return "remote"
        if "hybrid" in combined:
            return "hybrid"
        return "onsite"

    @staticmethod
    def _normalize_employment_type(emp_type: str | None) -> str | None:
        if not emp_type:
            return None
        emp_lower = emp_type.lower()
        mapping = {
            "fulltime": "full_time",
            "full_time": "full_time",
            "parttime": "part_time",
            "part_time": "part_time",
            "contractor": "contract",
            "contract": "contract",
            "intern": "internship",
            "internship": "internship",
        }
        return mapping.get(emp_lower, emp_lower)

    @staticmethod
    def _safe_int(val: Any) -> int | None:
        if val is None:
            return None
        try:
            f = float(val)
            return int(f) if f > 0 else None
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _extract_skills_from_highlights(qualifications: list[str]) -> list[str]:
        tech_patterns = [
            r'\b(Python|Java|JavaScript|TypeScript|Go|Rust|C\+\+|C#|Ruby|PHP|Swift|Kotlin)\b',
            r'\b(React|Angular|Vue|Node\.js|Django|Flask|FastAPI|Spring|Rails|\.NET)\b',
            r'\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|Jenkins|CI/CD)\b',
            r'\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra)\b',
            r'\b(Git|Linux|Agile|Scrum|REST|GraphQL|gRPC|Kafka|RabbitMQ)\b',
            r'\b(Machine Learning|Deep Learning|NLP|Computer Vision|Data Science)\b',
        ]
        skills: set[str] = set()
        text = " ".join(qualifications)
        for pattern in tech_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            skills.update(m if isinstance(m, str) else m[0] for m in matches)
        return list(skills)[:15]

    def close(self):
        if self._client and not self._client.is_closed:
            self._client.close()

    def __del__(self):
        self.close()
