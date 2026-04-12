import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from workers.celery_app import celery_app, get_db, run_async

logger = logging.getLogger(__name__)

TAILOR_PROMPT = """You are an expert resume writer. You will tailor the candidate's resume to better match the job description WITHOUT fabricating any experience.

Rules:
1. Only use information already present in the original resume
2. Rewrite bullet points using action verbs and keywords from the JD
3. Reorder sections/bullets to surface most relevant experience first
4. Update the professional summary to speak directly to this role
5. Do not change company names, job titles, dates, or education details
6. Maintain truthfulness at all times
7. Return the full tailored resume as structured JSON matching the input schema

Original Resume (JSON):
{resume_json}

Job Description:
Title: {job_title}
Company: {company}
Location: {location}
Description:
{job_description}

Required Skills: {required_skills}

Match Analysis:
{match_analysis}

Return ONLY the tailored resume as valid JSON matching the original schema. No explanations."""


@celery_app.task(
    bind=True,
    name="workers.tailoring.tailor_resume_for_job",
    max_retries=2,
    default_retry_delay=60,
    acks_late=True,
)
def tailor_resume_for_job(self, user_id: str, job_id: str, match_analysis: dict[str, Any]):
    """Tailor a user's base resume for a specific job, create an application, and send approval email."""

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.core.security import create_approval_token
        from app.models.application import Application
        from app.models.job import Job
        from app.models.resume import Resume
        from app.models.user import User
        from app.services.ai.service import AIService

        async with get_db() as db:
            user_result = await db.execute(
                select(User)
                .options(selectinload(User.preferences))
                .where(User.id == user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                logger.error("User %s not found for tailoring", user_id)
                return {"status": "error", "reason": "user_not_found"}

            job_result = await db.execute(select(Job).where(Job.id == job_id))
            job = job_result.scalar_one_or_none()
            if not job:
                logger.error("Job %s not found for tailoring", job_id)
                return {"status": "error", "reason": "job_not_found"}

            resume_result = await db.execute(
                select(Resume)
                .where(Resume.user_id == user_id, Resume.is_base == True)
                .order_by(Resume.created_at.desc())
                .limit(1)
            )
            base_resume = resume_result.scalar_one_or_none()
            if not base_resume or not base_resume.parsed_json:
                logger.error("No parsed base resume for user %s", user_id)
                return {"status": "error", "reason": "no_resume"}

            ai = AIService()

            try:
                prompt = TAILOR_PROMPT.format(
                    resume_json=json.dumps(base_resume.parsed_json, indent=2),
                    job_title=job.title,
                    company=job.company,
                    location=job.location or "Not specified",
                    job_description=job.description or "No description available",
                    required_skills=", ".join(job.required_skills or []),
                    match_analysis=json.dumps(match_analysis, indent=2),
                )
                response_text = await ai._call_llm(prompt, max_tokens=8192)
                tailored_json = ai._extract_json(response_text)
            except Exception:
                logger.error("AI tailoring failed for job %s, user %s", job_id, user_id, exc_info=True)
                return {"status": "error", "reason": "ai_tailoring_failed"}

            tailored_resume = Resume(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id),
                version_name=f"Tailored for {job.title} at {job.company}",
                is_base=False,
                parsed_json=tailored_json,
                original_filename=base_resume.original_filename,
            )
            db.add(tailored_resume)
            await db.flush()

            score = match_analysis.get("match_score", 0)
            now = datetime.now(timezone.utc)
            expires_at = now + timedelta(hours=48)

            application = Application(
                id=uuid.uuid4(),
                user_id=uuid.UUID(user_id),
                job_id=uuid.UUID(job_id),
                resume_id=base_resume.id,
                tailored_resume_id=tailored_resume.id,
                match_score=score,
                match_analysis=match_analysis,
                status="pending_approval",
                approval_token_expires_at=expires_at,
            )

            approval_token = create_approval_token(
                user_id=user_id,
                application_id=str(application.id),
                action="approve",
            )
            application.approval_token = approval_token

            db.add(application)
            await db.flush()

            prefs = user.preferences
            if prefs and prefs.approval_mode == "auto_approve" and score >= (prefs.min_match_score or 75):
                application.status = "approved"
                application.approval_action_at = now
                await db.flush()

                from workers.application_bot import submit_application
                submit_application.delay(str(application.id))
                logger.info(
                    "Auto-approved application %s (score %d) for user %s",
                    application.id, score, user_id,
                )
            else:
                from workers.notifications import send_approval_email
                send_approval_email.delay(str(application.id))
                logger.info(
                    "Approval email queued for application %s (score %d)",
                    application.id, score,
                )

            return {
                "status": "completed",
                "application_id": str(application.id),
                "tailored_resume_id": str(tailored_resume.id),
                "match_score": score,
                "auto_approved": application.status == "approved",
            }

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error(
            "tailor_resume_for_job failed for user %s, job %s",
            user_id, job_id, exc_info=True,
        )
        raise self.retry(exc=exc)
