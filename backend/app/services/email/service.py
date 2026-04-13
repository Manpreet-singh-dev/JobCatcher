import base64
import logging
from pathlib import Path
from urllib.parse import quote
from datetime import datetime, timezone
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Attachment,
    Content,
    Disposition,
    Email,
    FileContent,
    FileName,
    FileType,
    Mail,
    To,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.application import Application
from app.models.email_log import EmailLog
from app.models.job import Job
from app.models.user import User

logger = logging.getLogger(__name__)

# Resolve templates from package tree (works regardless of process cwd, e.g. Celery in Docker).
_EMAIL_TEMPLATE_DIR = Path(__file__).resolve().parents[3] / "email_templates"
if not _EMAIL_TEMPLATE_DIR.is_dir():
    logger.warning(
        "email_templates directory not found at %s — HTML fallbacks will be used",
        _EMAIL_TEMPLATE_DIR,
    )

jinja_env = Environment(
    loader=FileSystemLoader(str(_EMAIL_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html"]),
)


class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db
        key = (settings.SENDGRID_API_KEY or "").strip()
        self.sg_client = SendGridAPIClient(key) if key else None

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        user: User,
        application: Application | None = None,
        email_type: str = "general",
        attachments: list[tuple[str, bytes, str]] | None = None,
    ) -> bool:
        if not self.sg_client:
            logger.warning("SendGrid API key not configured, skipping email send")
            return False

        try:
            message = Mail(
                from_email=Email(settings.FROM_EMAIL, "JobCatcher"),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content),
            )
            if attachments:
                for filename, file_bytes, mime in attachments:
                    b64 = base64.b64encode(file_bytes).decode()
                    att = Attachment(
                        FileContent(b64),
                        FileName(filename),
                        FileType(mime),
                        Disposition("attachment"),
                    )
                    message.add_attachment(att)

            response = self.sg_client.send(message)
            email_status = "sent" if response.status_code in (200, 201, 202) else "failed"
            if email_status != "sent":
                logger.warning(
                    "SendGrid non-success for %s: HTTP %s body=%s",
                    to_email,
                    response.status_code,
                    getattr(response, "body", b"")[:500],
                )

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
            <p>JobCatcher found a matching job for you:</p>
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

        if "tailored_cv" in template_name:
            apply_html = ""
            if context.get("apply_url"):
                apply_html = (
                    f'<p><a href="{context.get("apply_url")}" style="color:#2563eb;">Open application page</a></p>'
                )
            confirm_html = ""
            if context.get("confirm_applied_url"):
                confirm_html = (
                    f'<div style="margin:20px 0;text-align:center;">'
                    f'<a href="{context.get("confirm_applied_url")}" '
                    'style="display:inline-block;padding:12px 28px;background:#059669;color:white;'
                    'text-decoration:none;border-radius:8px;font-weight:600;">I applied to this job</a></div>'
                    "<p style=\"color:#64748b;font-size:12px;\">Click after you submit your application so it appears "
                    "in your Recent applications list.</p>"
                )
            return f"""{base_style}
            <h2 style="color: #2563eb;">Your tailored CV is ready</h2>
            <p>Hi {context.get('user_name', 'there')},</p>
            <p>Your tailored CV is attached (PDF).</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0;">{context.get('job_title', 'N/A')}</h3>
                <p style="margin: 0; color: #64748b;">{context.get('company', 'N/A')} · {context.get('location', '')}</p>
            </div>
            {confirm_html}
            {apply_html}
            <p style="color:#64748b;font-size:12px;">You can also open Resume Manager in JobCatcher to view or download.</p>
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
        subject = f"[JobCatcher] Review: {job.title} at {job.company} ({application.match_score}% match)"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="approval_request",
        )

    async def send_tailored_cv_email(
        self,
        user: User,
        application: Application,
        job: Job,
        pdf_bytes: bytes,
        pdf_filename: str,
        applied_confirm_token: str,
    ) -> bool:
        match_summary = ""
        if application.match_analysis:
            ma = application.match_analysis
            reasons = ma.get("match_reasons") or []
            if isinstance(reasons, list) and reasons:
                match_summary = " ".join(str(r) for r in reasons[:8])
            strengths = ma.get("strengths", [])
            concerns = ma.get("concerns", [])
            if not match_summary and (strengths or concerns):
                match_summary = (
                    f"Strengths: {', '.join(str(s) for s in strengths)}. "
                    f"Concerns: {', '.join(str(c) for c in concerns) if concerns else 'None'}."
                )

        confirm_url = (
            f"{settings.API_URL}/api/applications/{application.id}"
            f"/confirm-applied?token={quote(applied_confirm_token, safe='')}"
        )
        context = self._build_context(user, application, job, {
            "match_summary": match_summary,
            "apply_url": job.apply_url or "",
            "show_match_score": application.match_score is not None,
            "confirm_applied_url": confirm_url,
        })

        html = self._render_template("tailored_cv.html", context)
        subject = f"[JobCatcher] Your tailored CV — {job.title} at {job.company}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="tailored_cv",
            attachments=[(pdf_filename, pdf_bytes, "application/pdf")],
        )

    async def send_tailored_cv_for_posting_email(
        self,
        user: User,
        job_title: str,
        company: str,
        pdf_bytes: bytes,
        pdf_filename: str,
    ) -> bool:
        ctx = {
            "user_name": user.name or user.email.split("@")[0],
            "user_email": user.email,
            "job_title": job_title,
            "company": company or "Posting you provided",
            "location": "—",
            "match_score": 0,
            "show_match_score": False,
            "match_summary": "",
            "apply_url": "",
            "app_url": settings.APP_URL,
            "api_url": settings.API_URL,
        }
        html = self._render_template("tailored_cv.html", ctx)
        subject = f"[JobCatcher] Tailored CV — {job_title}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=None,
            email_type="tailored_cv_posting",
            attachments=[(pdf_filename, pdf_bytes, "application/pdf")],
        )

    async def send_approved_email(
        self, user: User, application: Application, job: Job
    ) -> bool:
        context = self._build_context(user, application, job)
        html = self._render_template("approved.html", context)
        subject = f"[JobCatcher] Approved: {job.title} at {job.company}"

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
        subject = f"[JobCatcher] Skipped: {job.title} at {job.company}"

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
        subject = f"[JobCatcher] Expired: {job.title} at {job.company}"

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
        subject = f"[JobCatcher] Submitted: {job.title} at {job.company}"

        return await self._send_email(
            to_email=user.email,
            subject=subject,
            html_content=html,
            user=user,
            application=application,
            email_type="submitted",
        )
