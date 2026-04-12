import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from workers.celery_app import celery_app, get_db, get_redis, run_async

logger = logging.getLogger(__name__)

JOB_QUEUE_KEY = "applyiq:jobs:{user_id}"


def _get_scraper():
    from workers.scrapers.jsearch import JSearchScraper
    return JSearchScraper()


def _build_query_params(preferences) -> dict[str, Any]:
    locations = preferences.preferred_locations or []
    return {
        "titles": preferences.desired_titles or ["software engineer"],
        "location": locations[0] if locations else "",
        "work_mode": (preferences.work_modes or [""])[0] if preferences.work_modes else "",
        "employment_types": preferences.employment_types or [],
        "experience_years": preferences.years_experience_min,
        "salary_min": preferences.salary_min,
        "date_posted": "week",
        "num_pages": 3,
    }


@celery_app.task(
    bind=True,
    name="workers.scan_orchestrator.run_scan_cycle",
    max_retries=1,
    default_retry_delay=300,
    soft_time_limit=600,
    time_limit=900,
    acks_late=True,
)
def run_scan_cycle(self, user_id: str):
    """Full agent scan cycle for one user:
    1. Load preferences
    2. Scrape enabled sources
    3. Deduplicate against DB
    4. Queue new jobs to Redis
    5. Trigger matching pipeline
    6. Log activity
    """

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.agent_log import AgentLog
        from app.models.job import Job
        from app.models.user import User

        async with get_db() as db:
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.preferences))
                .where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                logger.error("User %s not found for scan cycle", user_id)
                return {"status": "error", "reason": "user_not_found"}

            if not user.agent_active:
                logger.info("Agent inactive for user %s, skipping scan", user_id)
                return {"status": "skipped", "reason": "agent_inactive"}

            prefs = user.preferences
            if not prefs:
                logger.warning("No preferences for user %s, skipping scan", user_id)
                return {"status": "skipped", "reason": "no_preferences"}

            query_params = _build_query_params(prefs)
            all_jobs: list[dict[str, Any]] = []

            scraper = _get_scraper()
            try:
                results = scraper.search(query_params)
                all_jobs.extend(results)
                logger.info("JSearch returned %d jobs for user %s", len(results), user_id)
            except Exception:
                logger.error("JSearch failed for user %s", user_id, exc_info=True)
            finally:
                scraper.close()

            if not all_jobs:
                db.add(AgentLog(
                    user_id=uuid.UUID(user_id),
                    event_type="scan_complete",
                    message="Scan completed — 0 new jobs found via JSearch",
                    metadata_={"total": 0},
                ))
                return {"status": "completed", "new_jobs": 0}

            dedup_hashes = [j["dedup_hash"] for j in all_jobs if j.get("dedup_hash")]
            existing_result = await db.execute(
                select(Job.dedup_hash).where(Job.dedup_hash.in_(dedup_hashes))
            )
            existing_hashes = set(existing_result.scalars().all())

            new_jobs = [j for j in all_jobs if j.get("dedup_hash") and j["dedup_hash"] not in existing_hashes]
            logger.info(
                "User %s: %d total scraped, %d duplicates filtered, %d new",
                user_id, len(all_jobs), len(all_jobs) - len(new_jobs), len(new_jobs),
            )

            r = get_redis()
            queue_key = JOB_QUEUE_KEY.format(user_id=user_id)
            queued_count = 0

            for job_data in new_jobs:
                job_record = Job(
                    id=uuid.uuid4(),
                    source=job_data.get("source", "unknown"),
                    source_job_id=job_data.get("source_job_id"),
                    dedup_hash=job_data["dedup_hash"],
                    title=job_data["title"],
                    company=job_data["company"],
                    company_logo_url=job_data.get("company_logo_url"),
                    location=job_data.get("location"),
                    work_mode=job_data.get("work_mode"),
                    employment_type=job_data.get("employment_type"),
                    salary_min=job_data.get("salary_min"),
                    salary_max=job_data.get("salary_max"),
                    salary_currency=job_data.get("salary_currency"),
                    description=job_data.get("description"),
                    required_skills=job_data.get("required_skills"),
                    preferred_skills=job_data.get("preferred_skills"),
                    experience_required=job_data.get("experience_required"),
                    apply_url=job_data.get("apply_url"),
                    is_active=True,
                )
                db.add(job_record)
                await db.flush()

                queue_payload = {
                    "db_id": str(job_record.id),
                    "title": job_data["title"],
                    "company": job_data["company"],
                    "location": job_data.get("location"),
                    "work_mode": job_data.get("work_mode"),
                    "source": job_data.get("source"),
                }
                r.rpush(queue_key, json.dumps(queue_payload))
                queued_count += 1

            db.add(AgentLog(
                user_id=uuid.UUID(user_id),
                event_type="scan_complete",
                message=f"Scan completed — {queued_count} new jobs queued via JSearch",
                metadata_={
                    "total_scraped": len(all_jobs),
                    "duplicates_filtered": len(all_jobs) - len(new_jobs),
                    "new_jobs_queued": queued_count,
                },
            ))

            if queued_count > 0:
                from workers.matching import process_job_matches
                process_job_matches.delay(user_id)
                logger.info("Matching pipeline triggered for user %s with %d new jobs", user_id, queued_count)

            return {
                "status": "completed",
                "new_jobs": queued_count,
                "total_scraped": len(all_jobs),
            }

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error("run_scan_cycle failed for user %s", user_id, exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.scan_orchestrator.schedule_all_scans",
    acks_late=True,
)
def schedule_all_scans():
    """Beat task: find all active users within their active hours and trigger scan cycles."""

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.user import User

        async with get_db() as db:
            result = await db.execute(
                select(User)
                .options(selectinload(User.preferences))
                .where(User.agent_active == True)
            )
            users = result.scalars().all()

            triggered = 0
            skipped = 0

            for user in users:
                prefs = user.preferences
                if not prefs:
                    skipped += 1
                    continue

                if not _is_within_active_hours(prefs):
                    skipped += 1
                    continue

                run_scan_cycle.delay(str(user.id))
                triggered += 1

            logger.info(
                "schedule_all_scans: triggered %d scans, skipped %d users",
                triggered, skipped,
            )
            return {"triggered": triggered, "skipped": skipped}

    try:
        return run_async(_run())
    except Exception:
        logger.error("schedule_all_scans failed", exc_info=True)
        raise


def _is_within_active_hours(preferences) -> bool:
    """Check if current time is within the user's configured active hours."""
    start = preferences.agent_active_hours_start
    end = preferences.agent_active_hours_end
    if not start or not end:
        return True

    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(preferences.agent_timezone or "UTC")
    except Exception:
        tz = timezone.utc

    now = datetime.now(tz).time()

    if isinstance(start, datetime):
        start = start.time()
    if isinstance(end, datetime):
        end = end.time()

    if start <= end:
        return start <= now <= end
    else:
        return now >= start or now <= end
