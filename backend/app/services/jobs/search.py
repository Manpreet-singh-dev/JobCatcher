"""
Real-time JSearch service — calls the API on every request and returns
results directly without saving to the database.
"""

import hashlib
import logging
import re
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

API_HOST = "jsearch.p.rapidapi.com"
SEARCH_URL = f"https://{API_HOST}/search"

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


def _dedup_hash(company: str, title: str, location: str) -> str:
    raw = f"{company.strip().lower()}|{title.strip().lower()}|{location.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _safe_int(val: Any) -> int | None:
    if val is None:
        return None
    try:
        f = float(val)
        return int(f) if f > 0 else None
    except (ValueError, TypeError):
        return None


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


def _normalize_employment_type(emp_type: str | None) -> str | None:
    if not emp_type:
        return None
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
    return mapping.get(emp_type.lower(), emp_type.lower())


TECH_PATTERNS = [
    r'\b(Python|Java|JavaScript|TypeScript|Go|Rust|C\+\+|C#|Ruby|PHP|Swift|Kotlin)\b',
    r'\b(React|Angular|Vue|Node\.js|Django|Flask|FastAPI|Spring|Rails|\.NET)\b',
    r'\b(AWS|Azure|GCP|Docker|Kubernetes|Terraform|Jenkins|CI/CD)\b',
    r'\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra)\b',
    r'\b(Git|Linux|Agile|Scrum|REST|GraphQL|gRPC|Kafka|RabbitMQ)\b',
    r'\b(Machine Learning|Deep Learning|NLP|Computer Vision|Data Science)\b',
]


def _extract_skills(qualifications: list[str]) -> list[str]:
    skills: set[str] = set()
    text = " ".join(qualifications)
    for pattern in TECH_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        skills.update(m if isinstance(m, str) else m[0] for m in matches)
    return list(skills)[:15]


def _normalize_job(raw: dict) -> dict[str, Any] | None:
    title = (raw.get("job_title") or "").strip()
    company = (raw.get("employer_name") or "").strip()
    if not title or not company:
        return None

    city = raw.get("job_city") or ""
    state = raw.get("job_state") or ""
    country = raw.get("job_country") or ""
    location = ", ".join(p for p in [city, state, country] if p)

    required_skills = raw.get("job_required_skills") or []
    if isinstance(required_skills, str):
        required_skills = [s.strip() for s in required_skills.split(",") if s.strip()]

    highlights = raw.get("job_highlights", {})
    qualifications = highlights.get("Qualifications") or []
    if not required_skills and qualifications:
        required_skills = _extract_skills(qualifications)

    experience_str = raw.get("job_required_experience", {})
    experience_required = None
    if isinstance(experience_str, dict):
        exp_text = experience_str.get("required_experience_in_months")
        if exp_text:
            months = _safe_int(exp_text)
            if months:
                experience_required = f"{months // 12}+ years" if months >= 12 else f"{months} months"
        if not experience_required:
            exp_text = experience_str.get("experience_mentioned")
            if exp_text:
                experience_required = str(exp_text)

    apply_url = raw.get("job_apply_link") or ""
    if not apply_url:
        apply_options = raw.get("apply_options", [])
        if apply_options and isinstance(apply_options, list):
            apply_url = apply_options[0].get("apply_link", "")

    publisher = (raw.get("job_publisher") or "jsearch").lower()

    return {
        "id": _dedup_hash(company, title, location),
        "source": f"jsearch:{publisher}",
        "source_job_id": raw.get("job_id", ""),
        "title": title,
        "company": company,
        "company_logo_url": raw.get("employer_logo") or None,
        "location": location or None,
        "work_mode": _determine_work_mode(raw),
        "employment_type": _normalize_employment_type(raw.get("job_employment_type")),
        "salary_min": _safe_int(raw.get("job_min_salary")),
        "salary_max": _safe_int(raw.get("job_max_salary")),
        "salary_currency": raw.get("job_salary_currency") or None,
        "description": (raw.get("job_description") or "").strip() or None,
        "required_skills": required_skills[:20] if required_skills else [],
        "preferred_skills": [],
        "experience_required": experience_required,
        "apply_url": apply_url,
        "posted_date": raw.get("job_posted_at_datetime_utc") or raw.get("job_posted_at") or None,
        "is_active": True,
    }


async def search_jobs_realtime(
    *,
    titles: list[str],
    location: str = "",
    country: str = "",
    work_modes: list[str] | None = None,
    employment_types: list[str] | None = None,
    date_posted: str = "week",
    num_pages: int = 1,
    page: int = 1,
    search: str | None = None,
) -> list[dict[str, Any]]:
    api_key = settings.RAPIDAPI_KEY
    if not api_key:
        logger.error("RAPIDAPI_KEY not configured")
        return []

    headers = {
        "x-rapidapi-host": API_HOST,
        "x-rapidapi-key": api_key,
    }

    date_map = {"24h": "today", "today": "today", "past_week": "week", "week": "week", "month": "month"}

    query_titles = titles
    if search:
        query_titles = [search]

    all_results: list[dict[str, Any]] = []
    seen_hashes: set[str] = set()

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
        for title in query_titles:
            query = f"{title} in {location}" if location else title
            params: dict[str, str] = {
                "query": query,
                "page": str(page),
                "num_pages": str(num_pages),
                "date_posted": date_map.get(date_posted, "week"),
            }

            if country:
                params["country"] = country.lower()

            if employment_types:
                mapped = []
                for et in employment_types:
                    val = EMPLOYMENT_TYPE_MAP.get(et.lower().replace(" ", "_"), "")
                    if val:
                        mapped.append(val)
                if mapped:
                    params["employment_types"] = ",".join(set(mapped))

            if work_modes and any("remote" in m.lower() for m in work_modes):
                params["remote_jobs_only"] = "true"

            try:
                resp = await client.get(SEARCH_URL, params=params, headers=headers)

                if resp.status_code == 429:
                    logger.warning("JSearch rate-limited (429)")
                    break
                if resp.status_code == 403:
                    logger.error("JSearch API key invalid or quota exceeded (403)")
                    break

                resp.raise_for_status()
                data = resp.json()
                raw_jobs = data.get("data", [])

                for raw in raw_jobs:
                    normalized = _normalize_job(raw)
                    if normalized and normalized["id"] not in seen_hashes:
                        seen_hashes.add(normalized["id"])
                        all_results.append(normalized)

                logger.info("JSearch returned %d jobs for '%s'", len(raw_jobs), title)
            except httpx.HTTPStatusError as exc:
                logger.warning("JSearch HTTP %s for '%s'", exc.response.status_code, title)
                break
            except Exception:
                logger.error("JSearch request failed for '%s'", title, exc_info=True)
                continue

    return all_results
