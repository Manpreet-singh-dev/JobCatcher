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
    job_data: dict[str, Any] | None = None,
):
    """Tailor a user's base resume for a job, store it, and email a PDF to the user."""

    async def _run():
        from app.models.application import Application
        from app.models.resume import Resume
        from app.models.user import User
        from app.services.ai.service import ai_service

        uid = uuid.UUID(user_id)
        jid = uuid.UUID(job_id)

        if not job_data:
            logger.error("No job_data provided for job %s", job_id)
            return {"status": "error", "reason": "no_job_data"}

        job_title = job_data.get("title", "Unknown")
        job_company = job_data.get("company", "Unknown")
        job_location = job_data.get("location") or "Not specified"
        job_description = job_data.get("description") or "No description available"
        job_required_skills = list(job_data.get("required_skills") or [])

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
                        job_title=job_title,
                        company=job_company,
                        location=job_location,
                        job_description=job_description,
                        required_skills=job_required_skills,
                    )
                except Exception:
                    logger.error("AI scoring failed for job %s (on-demand tailor)", job_id, exc_info=True)
                    await _mark_cv_preparing_failed()
                    return {"status": "error", "reason": "ai_match_failed"}

            try:
                tailored_json = await ai_service.tailor_resume_json_for_job(
                    base_resume.parsed_json,
                    match_analysis,
                    job_title=job_title,
                    company=job_company,
                    location=job_location,
                    job_description=job_description,
                    required_skills=job_required_skills,
                )
            except Exception:
                logger.error("AI tailoring failed for job %s, user %s", job_id, user_id, exc_info=True)
                await _mark_cv_preparing_failed()
                return {"status": "error", "reason": "ai_tailoring_failed"}

            # Generate PDF from tailored resume JSON
            from app.services.resume_pdf import generate_resume_pdf_async
            import aiofiles
            import aiofiles.os
            from pathlib import Path

            pdf_path = None
            file_path = None
            try:
                pdf_path = await generate_resume_pdf_async(tailored_json)
                if pdf_path and pdf_path.exists():
                    # Save PDF to uploads directory
                    upload_dir = Path(f"uploads/resumes/{uid}")
                    await aiofiles.os.makedirs(str(upload_dir), exist_ok=True)

                    tailored_id = uuid.uuid4()
                    file_path = f"uploads/resumes/{uid}/{tailored_id}.pdf"

                    # Copy the temp PDF to the permanent location
                    pdf_bytes = pdf_path.read_bytes()
                    async with aiofiles.open(file_path, "wb") as f:
                        await f.write(pdf_bytes)

                    logger.info(f"Saved tailored PDF to {file_path}")
            except Exception as e:
                logger.error(f"Failed to save tailored PDF: {e}", exc_info=True)
            finally:
                # Clean up temp file
                if pdf_path and pdf_path.exists():
                    try:
                        pdf_path.unlink()
                    except OSError:
                        pass

            tailored_resume = Resume(
                id=uuid.uuid4(),
                user_id=uid,
                version_name=f"Tailored for {job_title} at {job_company}",
                is_base=False,
                parsed_json=tailored_json,
                original_filename=base_resume.original_filename,
                file_path=file_path,
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
