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
