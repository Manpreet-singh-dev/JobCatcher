import json
import logging
from typing import Any

from workers.celery_app import celery_app, get_db, get_redis, run_async

logger = logging.getLogger(__name__)

MATCH_PROMPT = """You are a job-candidate matching expert. Given the candidate profile and job description below, return a JSON object with:
{{
  "match_score": 0-100,
  "matched_skills": ["skills found in both"],
  "missing_skills": ["required skills candidate lacks"],
  "match_reasons": ["3-5 bullet points explaining why this is a good match"],
  "concerns": ["any red flags or gaps"],
  "recommended": true | false
}}

Candidate Profile:
{candidate_json}

Job Description:
Title: {job_title}
Company: {company}
Location: {location}
Description: {job_description}
Required Skills: {required_skills}

Return ONLY valid JSON. No explanations."""

JOB_QUEUE_KEY = "applyiq:jobs:{user_id}"
DAILY_COUNT_KEY = "applyiq:daily_apps:{user_id}"


def _matches_work_mode(job: dict[str, Any], preferences) -> bool:
    if not preferences.work_modes:
        return True
    job_mode = (job.get("work_mode") or "").lower()
    if not job_mode:
        return True
    return job_mode in [m.lower() for m in preferences.work_modes]


def _matches_location(job: dict[str, Any], preferences) -> bool:
    if not preferences.preferred_locations:
        return True
    if preferences.open_to_relocation:
        return True
    job_location = (job.get("location") or "").lower()
    if not job_location:
        return True
    for pref_loc in preferences.preferred_locations:
        if pref_loc.lower() in job_location:
            return True
    if job.get("work_mode", "").lower() == "remote":
        return True
    return False


def _is_blacklisted(job: dict[str, Any], preferences) -> bool:
    if not preferences.blacklisted_companies:
        return False
    company = (job.get("company") or "").lower()
    return any(b.lower() in company for b in preferences.blacklisted_companies)


def _check_daily_limit(user_id: str, max_per_day: int) -> bool:
    r = get_redis()
    key = DAILY_COUNT_KEY.format(user_id=user_id)
    count = r.get(key)
    if count is not None and int(count) >= max_per_day:
        return False
    return True


def _increment_daily_count(user_id: str):
    r = get_redis()
    key = DAILY_COUNT_KEY.format(user_id=user_id)
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400)
    pipe.execute()


@celery_app.task(
    bind=True,
    name="workers.matching.process_job_matches",
    max_retries=2,
    default_retry_delay=120,
    acks_late=True,
)
def process_job_matches(self, user_id: str):
    """Process queued jobs for a user: filter, score, and trigger tailoring."""

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.job import Job
        from app.models.resume import Resume
        from app.models.user import User
        from app.services.ai.service import AIService

        async with get_db() as db:
            result = await db.execute(
                select(User)
                .options(selectinload(User.preferences))
                .where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            if not user:
                logger.error("User %s not found", user_id)
                return {"status": "error", "reason": "user_not_found"}

            prefs = user.preferences
            if not prefs:
                logger.warning("User %s has no preferences configured", user_id)
                return {"status": "skipped", "reason": "no_preferences"}

            resume_result = await db.execute(
                select(Resume)
                .where(Resume.user_id == user_id, Resume.is_base == True)
                .order_by(Resume.created_at.desc())
                .limit(1)
            )
            base_resume = resume_result.scalar_one_or_none()
            if not base_resume or not base_resume.parsed_json:
                logger.warning("User %s has no parsed base resume", user_id)
                return {"status": "skipped", "reason": "no_resume"}

            r = get_redis()
            queue_key = JOB_QUEUE_KEY.format(user_id=user_id)
            ai = AIService()

            processed = 0
            matched = 0
            skipped = 0

            max_per_day = prefs.max_applications_per_day or 5
            threshold = prefs.min_match_score or 75

            while True:
                if not _check_daily_limit(user_id, max_per_day):
                    logger.info("User %s hit daily application limit (%d)", user_id, max_per_day)
                    break

                raw = r.lpop(queue_key)
                if raw is None:
                    break

                try:
                    job_data = json.loads(raw)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON in job queue for user %s", user_id)
                    continue

                processed += 1

                if _is_blacklisted(job_data, prefs):
                    logger.debug("Skipping blacklisted company: %s", job_data.get("company"))
                    skipped += 1
                    continue

                if not _matches_work_mode(job_data, prefs):
                    logger.debug("Skipping work mode mismatch: %s", job_data.get("work_mode"))
                    skipped += 1
                    continue

                if not _matches_location(job_data, prefs):
                    logger.debug("Skipping location mismatch: %s", job_data.get("location"))
                    skipped += 1
                    continue

                job_id = job_data.get("db_id")
                if not job_id:
                    skipped += 1
                    continue

                job_result = await db.execute(select(Job).where(Job.id == job_id))
                job = job_result.scalar_one_or_none()
                if not job:
                    skipped += 1
                    continue

                try:
                    prompt = MATCH_PROMPT.format(
                        candidate_json=json.dumps(base_resume.parsed_json, indent=2),
                        job_title=job.title,
                        company=job.company,
                        location=job.location or "Not specified",
                        job_description=job.description or "No description available",
                        required_skills=", ".join(job.required_skills or []),
                    )
                    response_text = await ai._call_llm(prompt)
                    match_analysis = ai._extract_json(response_text)
                except Exception:
                    logger.error("AI scoring failed for job %s", job_id, exc_info=True)
                    skipped += 1
                    continue

                score = match_analysis.get("match_score", 0)
                recommended = match_analysis.get("recommended", False)

                if score >= threshold and recommended:
                    matched += 1
                    _increment_daily_count(user_id)

                    from workers.tailoring import tailor_resume_for_job
                    tailor_resume_for_job.delay(
                        user_id=str(user_id),
                        job_id=str(job_id),
                        match_analysis=match_analysis,
                    )
                    logger.info(
                        "Job %s matched user %s with score %d — tailoring triggered",
                        job_id, user_id, score,
                    )
                else:
                    skipped += 1
                    logger.debug(
                        "Job %s scored %d for user %s (threshold %d) — skipped",
                        job_id, score, user_id, threshold,
                    )

            return {
                "status": "completed",
                "processed": processed,
                "matched": matched,
                "skipped": skipped,
            }

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error("process_job_matches failed for user %s", user_id, exc_info=True)
        raise self.retry(exc=exc)
