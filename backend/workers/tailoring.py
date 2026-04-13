import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select, update

from workers.celery_app import celery_app, get_db, run_async

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="workers.tailoring.tailor_resume_for_job",
    max_retries=2,
    default_retry_delay=60,
    acks_late=True,
)
def tailor_resume_for_job(
    self,
    user_id: str,
    job_id: str,
    match_analysis: dict[str, Any] | None = None,
):
    """Tailor a user's base resume for a job, store it, and email a PDF to the user."""

    async def _run():
        from app.models.application import Application
        from app.models.job import Job
        from app.models.resume import Resume
        from app.models.user import User
        from app.services.ai.service import ai_service

        uid = uuid.UUID(user_id)
        jid = uuid.UUID(job_id)

        async with get_db() as db:

            async def _mark_cv_preparing_failed() -> None:
                await db.execute(
                    update(Application)
                    .where(
                        Application.user_id == uid,
                        Application.job_id == jid,
                        Application.status == "cv_preparing",
                    )
                    .values(status="failed")
                )

            await db.execute(
                delete(Application).where(
                    Application.user_id == uid,
                    Application.job_id == jid,
                    Application.tailored_resume_id.is_(None),
                    Application.status != "cv_preparing",
                )
            )

            existing_result = await db.execute(
                select(Application)
                .where(
                    Application.user_id == uid,
                    Application.job_id == jid,
                    Application.tailored_resume_id.isnot(None),
                )
                .order_by(Application.created_at.desc())
                .limit(1)
            )
            existing_app = existing_result.scalar_one_or_none()
            if existing_app:
                from workers.notifications import send_tailored_cv_email

                send_tailored_cv_email.delay(str(existing_app.id))
                logger.info("Resent tailored CV email for application %s", existing_app.id)
                return {"status": "resent", "application_id": str(existing_app.id)}

            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                logger.error("User %s not found for tailoring", user_id)
                await _mark_cv_preparing_failed()
                return {"status": "error", "reason": "user_not_found"}

            job_result = await db.execute(select(Job).where(Job.id == job_id))
            job = job_result.scalar_one_or_none()
            if not job:
                logger.error("Job %s not found for tailoring", job_id)
                await _mark_cv_preparing_failed()
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
                await _mark_cv_preparing_failed()
                return {"status": "error", "reason": "no_resume"}

            ph_result = await db.execute(
                select(Application)
                .where(
                    Application.user_id == uid,
                    Application.job_id == jid,
                    Application.tailored_resume_id.is_(None),
                    Application.status == "cv_preparing",
                )
                .order_by(Application.created_at.desc())
                .limit(1)
            )
            placeholder_app = ph_result.scalar_one_or_none()

            if match_analysis is None:
                try:
                    match_analysis = await ai_service.analyze_match_for_job_tailoring(
                        base_resume.parsed_json,
                        job_title=job.title,
                        company=job.company,
                        location=job.location or "Not specified",
                        job_description=job.description or "No description available",
                        required_skills=list(job.required_skills or []),
                    )
                except Exception:
                    logger.error("AI scoring failed for job %s (on-demand tailor)", job_id, exc_info=True)
                    await _mark_cv_preparing_failed()
                    return {"status": "error", "reason": "ai_match_failed"}

            try:
                tailored_json = await ai_service.tailor_resume_json_for_job(
                    base_resume.parsed_json,
                    match_analysis,
                    job_title=job.title,
                    company=job.company,
                    location=job.location or "Not specified",
                    job_description=job.description or "No description available",
                    required_skills=list(job.required_skills or []),
                )
            except Exception:
                logger.error("AI tailoring failed for job %s, user %s", job_id, user_id, exc_info=True)
                await _mark_cv_preparing_failed()
                return {"status": "error", "reason": "ai_tailoring_failed"}

            tailored_resume = Resume(
                id=uuid.uuid4(),
                user_id=uid,
                version_name=f"Tailored for {job.title} at {job.company}",
                is_base=False,
                parsed_json=tailored_json,
                original_filename=base_resume.original_filename,
            )
            db.add(tailored_resume)
            await db.flush()

            score = match_analysis.get("match_score", 0)

            if placeholder_app:
                placeholder_app.resume_id = base_resume.id
                placeholder_app.tailored_resume_id = tailored_resume.id
                placeholder_app.match_score = score
                placeholder_app.match_analysis = match_analysis
                placeholder_app.status = "cv_emailed"
                placeholder_app.approval_token = None
                placeholder_app.approval_token_expires_at = None
                application = placeholder_app
            else:
                application = Application(
                    id=uuid.uuid4(),
                    user_id=uid,
                    job_id=jid,
                    resume_id=base_resume.id,
                    tailored_resume_id=tailored_resume.id,
                    match_score=score,
                    match_analysis=match_analysis,
                    status="cv_emailed",
                    approval_token=None,
                    approval_token_expires_at=None,
                )
                db.add(application)

            await db.flush()

            from workers.notifications import send_tailored_cv_email

            send_tailored_cv_email.delay(str(application.id))
            logger.info(
                "Tailored CV queued for email — application %s (score %d) user %s",
                application.id,
                score,
                user_id,
            )

            return {
                "status": "completed",
                "application_id": str(application.id),
                "tailored_resume_id": str(tailored_resume.id),
                "match_score": score,
            }

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error(
            "tailor_resume_for_job failed for user %s, job %s",
            user_id,
            job_id,
            exc_info=True,
        )
        raise self.retry(exc=exc)
