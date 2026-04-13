import logging
from datetime import datetime, timezone

from workers.celery_app import celery_app, get_db, run_async

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    name="workers.notifications.send_approval_email",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def send_approval_email(self, application_id: str):
    """Send the approval-request email for a pending application."""

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.application import Application
        from app.models.job import Job
        from app.models.user import User
        from app.services.email.service import EmailService

        async with get_db() as db:
            app_result = await db.execute(
                select(Application).where(Application.id == application_id)
            )
            application = app_result.scalar_one_or_none()
            if not application:
                logger.error("Application %s not found for approval email", application_id)
                return {"status": "error", "reason": "not_found"}

            user_result = await db.execute(select(User).where(User.id == application.user_id))
            user = user_result.scalar_one_or_none()

            job_result = await db.execute(select(Job).where(Job.id == application.job_id))
            job = job_result.scalar_one_or_none()

            if not user or not job:
                logger.error("Missing user/job for application %s", application_id)
                return {"status": "error", "reason": "missing_data"}

            email_svc = EmailService(db)
            sent = await email_svc.send_approval_email(
                user=user,
                application=application,
                job=job,
                match_analysis=application.match_analysis,
            )

            if sent:
                logger.info("Approval email sent for application %s", application_id)
                return {"status": "sent"}
            else:
                logger.warning("Approval email not sent for application %s", application_id)
                return {"status": "not_sent"}

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error("send_approval_email failed for %s", application_id, exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="workers.notifications.send_status_email",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def send_status_email(self, application_id: str, email_type: str):
    """Send a status-update email (approved, rejected, submitted, expired)."""

    async def _run():
        from sqlalchemy import select

        from app.models.application import Application
        from app.models.job import Job
        from app.models.user import User
        from app.services.email.service import EmailService

        async with get_db() as db:
            app_result = await db.execute(
                select(Application).where(Application.id == application_id)
            )
            application = app_result.scalar_one_or_none()
            if not application:
                logger.error("Application %s not found for %s email", application_id, email_type)
                return {"status": "error", "reason": "not_found"}

            user_result = await db.execute(select(User).where(User.id == application.user_id))
            user = user_result.scalar_one_or_none()

            job_result = await db.execute(select(Job).where(Job.id == application.job_id))
            job = job_result.scalar_one_or_none()

            if not user or not job:
                logger.error("Missing user/job for application %s", application_id)
                return {"status": "error", "reason": "missing_data"}

            email_svc = EmailService(db)

            sender_map = {
                "approved": email_svc.send_approved_email,
                "rejected": email_svc.send_rejected_email,
                "expired": email_svc.send_expired_email,
                "submitted": email_svc.send_submitted_email,
            }

            sender = sender_map.get(email_type)
            if not sender:
                logger.error("Unknown email type: %s", email_type)
                return {"status": "error", "reason": "unknown_type"}

            sent = await sender(user=user, application=application, job=job)

            if sent:
                logger.info("%s email sent for application %s", email_type, application_id)
                return {"status": "sent", "type": email_type}
            else:
                logger.warning("%s email not sent for application %s", email_type, application_id)
                return {"status": "not_sent", "type": email_type}

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error(
            "send_status_email(%s) failed for %s", email_type, application_id, exc_info=True
        )
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="workers.notifications.send_tailored_cv_email",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def send_tailored_cv_email(self, application_id: str):
    """Email the user a PDF of the tailored resume for a job (no external application submission)."""

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.application import Application
        from app.models.job import Job
        from app.models.user import User
        from app.services.email.service import EmailService
        from app.services.resume_pdf import generate_resume_pdf_async

        async with get_db() as db:
            app_result = await db.execute(
                select(Application)
                .options(selectinload(Application.tailored_resume))
                .where(Application.id == application_id)
            )
            application = app_result.scalar_one_or_none()
            if not application:
                logger.error("Application %s not found for tailored CV email", application_id)
                return {"status": "error", "reason": "not_found"}

            user_result = await db.execute(select(User).where(User.id == application.user_id))
            user = user_result.scalar_one_or_none()

            job_result = await db.execute(select(Job).where(Job.id == application.job_id))
            job = job_result.scalar_one_or_none()

            tailored = application.tailored_resume
            if not user or not job or not tailored or not tailored.parsed_json:
                logger.error("Missing data for tailored CV email %s", application_id)
                return {"status": "error", "reason": "missing_data"}

            pdf_path = await generate_resume_pdf_async(tailored.parsed_json)
            if not pdf_path or not pdf_path.exists():
                logger.error("Could not build PDF for application %s", application_id)
                return {"status": "error", "reason": "pdf_failed"}

            try:
                pdf_bytes = pdf_path.read_bytes()
            finally:
                try:
                    pdf_path.unlink()
                except OSError:
                    pass

            def _safe_part(text: str, max_len: int = 36) -> str:
                out = "".join(c for c in (text or "") if c.isalnum() or c in (" ", "-", "_")).strip()
                return (out[:max_len] or "role").replace(" ", "_")

            pdf_name = f"CV_{_safe_part(job.company)}_{_safe_part(job.title)}.pdf"

            from app.core.security import create_applied_confirm_token

            applied_token = create_applied_confirm_token(
                str(user.id), str(application.id)
            )

            email_svc = EmailService(db)
            sent = await email_svc.send_tailored_cv_email(
                user=user,
                application=application,
                job=job,
                pdf_bytes=pdf_bytes,
                pdf_filename=pdf_name,
                applied_confirm_token=applied_token,
            )

            if sent:
                logger.info("Tailored CV email sent for application %s", application_id)
                return {"status": "sent"}
            logger.warning("Tailored CV email not sent for application %s", application_id)
            return {"status": "not_sent"}

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error("send_tailored_cv_email failed for %s", application_id, exc_info=True)
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.notifications.check_expired_applications",
    acks_late=True,
)
def check_expired_applications():
    """Find applications whose 48-hour approval window has passed and mark them expired."""

    async def _run():
        from sqlalchemy import select

        from app.models.application import Application

        async with get_db() as db:
            now = datetime.now(timezone.utc)

            result = await db.execute(
                select(Application).where(
                    Application.status == "pending_approval",
                    Application.approval_token_expires_at != None,
                    Application.approval_token_expires_at < now,
                )
            )
            expired_apps = result.scalars().all()

            count = 0
            for app in expired_apps:
                app.status = "expired"
                app.approval_action_at = now
                count += 1

            await db.flush()

            for app in expired_apps:
                send_status_email.delay(str(app.id), "expired")

            logger.info("Expired %d applications", count)
            return {"status": "completed", "expired_count": count}

    try:
        return run_async(_run())
    except Exception:
        logger.error("check_expired_applications failed", exc_info=True)
        raise
