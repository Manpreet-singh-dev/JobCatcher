"""
Seed the jobs table by running scrapers directly (no Celery required).
Usage:  python -m scripts.seed_jobs
"""

import asyncio
import logging
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("seed_jobs")

from app.core.database import Base, engine, async_session_factory
from app.models import Job  # noqa: ensure model is registered
from sqlalchemy import select, func


async def ensure_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured.")


def scrape_all() -> list[dict]:
    from app.core.config import settings
    from workers.scrapers.jsearch import JSearchScraper

    if not settings.RAPIDAPI_KEY:
        logger.error("RAPIDAPI_KEY not set in .env — cannot fetch jobs.")
        logger.error("Get a free key at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch")
        return []

    all_jobs: list[dict] = []
    queries = [
        {"titles": ["software engineer", "full stack developer", "backend developer"], "location": "", "num_pages": 3, "date_posted": "week"},
        {"titles": ["python developer", "react developer", "data engineer"], "location": "", "num_pages": 3, "date_posted": "week"},
        {"titles": ["devops engineer", "machine learning engineer", "frontend developer"], "location": "", "num_pages": 2, "date_posted": "week"},
    ]

    scraper = JSearchScraper(api_key=settings.RAPIDAPI_KEY)
    for q in queries:
        try:
            logger.info("JSearch: searching for %s ...", q["titles"])
            results = scraper.search(q)
            all_jobs.extend(results)
            logger.info("  -> got %d jobs", len(results))
        except Exception:
            logger.warning("JSearch failed for %s", q, exc_info=True)
    scraper.close()

    logger.info("Total fetched: %d jobs", len(all_jobs))
    return all_jobs


async def insert_jobs(scraped: list[dict]) -> int:
    seen_hashes: set[str] = set()
    unique_scraped: list[dict] = []
    for j in scraped:
        h = j.get("dedup_hash")
        if h and h not in seen_hashes:
            seen_hashes.add(h)
            unique_scraped.append(j)
    logger.info("Deduplicated within batch: %d -> %d", len(scraped), len(unique_scraped))

    async with async_session_factory() as db:
        hashes = [j["dedup_hash"] for j in unique_scraped]
        existing_result = await db.execute(
            select(Job.dedup_hash).where(Job.dedup_hash.in_(hashes))
        )
        existing = set(existing_result.scalars().all())

        new_jobs = [j for j in unique_scraped if j["dedup_hash"] not in existing]
        logger.info("After DB dedup: %d new jobs to insert", len(new_jobs))

        for jd in new_jobs:
            db.add(Job(
                id=uuid.uuid4(),
                source=jd.get("source", "unknown"),
                source_job_id=jd.get("source_job_id"),
                dedup_hash=jd["dedup_hash"],
                title=jd["title"],
                company=jd["company"],
                company_logo_url=jd.get("company_logo_url"),
                location=jd.get("location"),
                work_mode=jd.get("work_mode"),
                employment_type=jd.get("employment_type"),
                salary_min=jd.get("salary_min"),
                salary_max=jd.get("salary_max"),
                salary_currency=jd.get("salary_currency"),
                description=jd.get("description"),
                required_skills=jd.get("required_skills"),
                preferred_skills=jd.get("preferred_skills"),
                experience_required=jd.get("experience_required"),
                apply_url=jd.get("apply_url"),
                is_active=True,
            ))

        await db.commit()
        logger.info("Inserted %d jobs into database.", len(new_jobs))

        count_result = await db.execute(select(func.count()).select_from(Job))
        total = count_result.scalar() or 0
        logger.info("Total jobs in database: %d", total)
        return len(new_jobs)


async def main():
    logger.info("=== Job Seeder ===")
    await ensure_tables()

    scraped = scrape_all()
    if not scraped:
        logger.warning("No jobs scraped. Check network connectivity.")
        return

    inserted = await insert_jobs(scraped)
    logger.info("Done! %d new jobs added.", inserted)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
