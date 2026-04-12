import logging
from datetime import datetime, timezone
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Content, Email, Mail, To
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.application import Application
from app.models.email_log import EmailLog
from app.models.job import Job
from app.models.user import User

logger = logging.getLogger(__name__)

jinja_env = Environment(
    loader=FileSystemLoader("email_templates"),
    autoescape=select_autoescape(["html"]),
)


class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sg_client = SendGridAPIClient(settings.SENDGRID_API_KEY) if settings.SENDGRID_API_KEY else None

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        user: User,
        application: Application | None = None,
        email_type: str = "general",
    ) -> bool:
        if not self.sg_client:
            logger.warning("SendGrid API key not configured, skipping email send")
            return False

        try:
            message = Mail(
                from_email=Email(settings.FROM_EMAIL, "ApplyIQ"),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content),
            )

            response = self.sg_client.send(message)
            email_status = "sent" if response.status_code in (200, 201, 202) else "failed"

            log_entry = EmailLog(
                user_id=user.id,
                application_id=application.id if application else None,
                email_type=email_type,
                recipient_email=to_email,
                subject=subject,
                status=email_status,
                sent_at=datetime.now(timezone.utc),
            )
            self.db.add(log_entry)
            await self.db.flush()

            return email_status == "sent"

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            log_entry = EmailLog(
                user_id=user.id,
                application_id=application.id if application else None,
                email_type=email_type,
                recipient_email=to_email,
                subject=subject,
                status="error",
                sent_at=datetime.now(timezone.utc),
            )
            self.db.add(log_entry)
            await self.db.flush()
            return False

    def _render_template(self, template_name: str, context: dict[str, Any]) -> str:
        try:
            template = jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception:
            return self._render_fallback(template_name, context)

    def _render_fallback(self, template_name: str, context: dict[str, Any]) -> str:
        base_style = """
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                     max-width: 600px; margin: 0 auto; padding: 20px;">
        """

        if "approval" in template_name:
            return f"""{base_style}
            <h2 style="color: #2563eb;">New Application Ready for Review</h2>
            <p>Hi {context.get('user_name', 'there')},</p>
            <p>ApplyIQ found a matching job for you:</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">{context.get('job_title', 'N/A')}</h3>
                <p style="margin: 0; color: #64748b;">{context.get('company', 'N/A')} • {context.get('location', 'N/A')}</p>
                <p style="margin: 8px 0 0 0;"><strong>Match Score: {context.get('match_score', 'N/A')}%</strong></p>
            </div>
            <h4>Match Analysis</h4>
            <p>{context.get('match_summary', '')}</p>
            {f"<h4>Resume Changes</h4><p>{context.get('resume_changes', '')}</p>" if context.get('resume_changes') else ''}
            <div style="margin: 24px 0; text-align: center;">
                <a href="{context.get('approve_url', '#')}"
                   style="display: inline-block; padding: 12px 32px; background: #22c55e; color: white;
                          text-decoration: none; border-radius: 8px; margin-right: 12px; font-weight: 600;">
                    Approve & Apply
                </a>
                <a href="{context.get('reject_url', '#')}"
                   style="display: inline-block; padding: 12px 32px; background: #ef4444; color: white;
                          text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Reject
                </a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This link expires in 48 hours.</p>
            </div>"""

        if "approved" in template_name:
            return f"""{base_style}
            <h2 style="color: #22c55e;">Application Approved</h2>
            <p>Hi {context.get('user_name', 'there')},</p>
            <p>Your application has been approved and is being submitted.</p>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">{context.get('job_title', 'N/A')}</h3>
                <p style="margin: 0; color: #64748b;">{context.get('company', 'N/A')}</p>
            </div>
            <p>We'll notify you once the application is submitted.</p>
            </div>"""

        if "rejected" in template_name:
            return f"""{base_style}
            <h2 style="color: #ef4444;">Application Rejected</h2>
            <p>Hi {context.get('user_name', 'there')},</p>
            <p>You chose to skip this application:</p>
            <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">{context.get('job_title', 'N/A')}</h3>
                <p style="margin: 0; color: #64748b;">{context.get('company', 'N/A')}</p>
            </div>
            </div>"""

        if "expired" in template_name:
            return f"""{base_style}
            <h2 style="color: #f59e0b;">Approval Expired</h2>
            <p>Hi {context.get('user_name', 'there')},</p>
            <p>The approval window for this application has expired:</p>
            <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">{context.get('job_title', 'N/A')}</h3>
                <p style="margin: 0; color: #64748b;">{context.get('company', 'N/A')}</p>
            </div>
            <p>You can reactivate this application from your dashboard.</p>
            </div>"""

        if "submitted" in template_name:
            return f"""{base_style}
            <h2 style="color: #2563eb;">Application Submitted!</h2>
            <p>Hi {context.get('user_name', 'there')},</p>
            <p>Your application has been successfully submitted:</p>
            <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">{context.get('job_title', 'N/A')}</h3>
                <p style="margin: 0; color: #64748b;">{context.get('company', 'N/A')}</p>
            </div>
            <p>Good luck! 🎉</p>
            </div>"""

        return f"{base_style}<p>{context}</p></div>"

    def _build_context(
        self,
        user: User,
        application: Application,
        job: Job,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        ctx = {
            "user_name": user.name or user.email.split("@")[0],
            "user_email": user.email,
            "job_title": job.title,
            "company": job.company,
            "location": job.location or "Not specified",
            "match_score": application.match_score,
            "app_url": settings.APP_URL,
            "api_url": settings.API_URL,
        }
        if extra:
            ctx.update(extra)
        return ctx

    async def send_approval_email(
        self,
        user: User,
        application: Application,
        job: Job,
        match_analysis: dict[str, Any] | None = None,
        resume_changes: str | None = None,
    ) -> bool:
        approve_url = (
            f"{settings.API_URL}/api/applications/{application.id}"
            f"/approve?token={application.approval_token}"
        )
        reject_url = (
            f"{settings.API_URL}/api/applications/{application.id}"
            f"/reject?token={application.approval_token}"
        )

        match_summary = ""
        if match_analysis:
            strengths = match_analysis.get("strengths", [])
            concerns = match_analysis.get("concerns", [])
            match_summary = (
                f"Strengths: {', '.join(strengths)}. "
                f"Concerns: {', '.join(concerns) if concerns else 'None'}."
            )

        context = self._build_context(user, application, job, {
            "approve_url": approve_url,
            "reject_url": reject_url,
            "match_summary": match_summary,
            "match_analysis": match_analysis,
            "resume_changes": resume_changes,
        })

        html = self._render_template("approval.html", context)
        subject = f"[ApplyIQ] Review: {job.title} at {job.company} ({application.match_score}% match)"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="approval_request",
        )

    async def send_approved_email(
        self, user: User, application: Application, job: Job
    ) -> bool:
        context = self._build_context(user, application, job)
        html = self._render_template("approved.html", context)
        subject = f"[ApplyIQ] Approved: {job.title} at {job.company}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="approved",
        )

    async def send_rejected_email(
        self, user: User, application: Application, job: Job
    ) -> bool:
        context = self._build_context(user, application, job)
        html = self._render_template("rejected.html", context)
        subject = f"[ApplyIQ] Skipped: {job.title} at {job.company}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="rejected",
        )

    async def send_expired_email(
        self, user: User, application: Application, job: Job
    ) -> bool:
        context = self._build_context(user, application, job)
        html = self._render_template("expired.html", context)
        subject = f"[ApplyIQ] Expired: {job.title} at {job.company}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="expired",
        )

    async def send_submitted_email(
        self, user: User, application: Application, job: Job
    ) -> bool:
        context = self._build_context(user, application, job)
        html = self._render_template("submitted.html", context)
        subject = f"[ApplyIQ] Submitted: {job.title} at {job.company}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="submitted",
        )
