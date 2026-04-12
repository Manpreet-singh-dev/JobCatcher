import logging
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from workers.celery_app import celery_app, get_db, run_async

logger = logging.getLogger(__name__)

SCREENSHOTS_DIR = Path("data/screenshots")


async def _generate_resume_pdf(parsed_json: dict[str, Any]) -> Path | None:
    """Render a resume JSON to a PDF file using WeasyPrint."""
    try:
        from jinja2 import Environment, FileSystemLoader, select_autoescape
        from weasyprint import HTML

        env = Environment(
            loader=FileSystemLoader("email_templates"),
            autoescape=select_autoescape(["html"]),
        )

        personal = parsed_json.get("personal_info", {})
        name = personal.get("name", "Candidate")
        html_parts = [
            "<html><head><style>",
            "body{font-family:Helvetica,Arial,sans-serif;font-size:11pt;margin:40px;color:#222}",
            "h1{font-size:18pt;margin-bottom:4px}h2{font-size:13pt;border-bottom:1px solid #999;padding-bottom:3px;margin-top:16px}",
            "ul{margin:4px 0 8px 18px;padding:0}li{margin-bottom:2px}",
            ".header{text-align:center;margin-bottom:12px}.contact{font-size:9pt;color:#555}",
            ".exp-header{display:flex;justify-content:space-between}.company{font-weight:bold}",
            "</style></head><body>",
            f'<div class="header"><h1>{name}</h1>',
            f'<p class="contact">{personal.get("email","")} | {personal.get("phone","")} | {personal.get("location","")}</p></div>',
        ]

        summary = parsed_json.get("summary", "")
        if summary:
            html_parts.append(f"<h2>Professional Summary</h2><p>{summary}</p>")

        experiences = parsed_json.get("experience", [])
        if experiences:
            html_parts.append("<h2>Experience</h2>")
            for exp in experiences:
                dates = f'{exp.get("start_date","")} – {exp.get("end_date","Present") if not exp.get("current") else "Present"}'
                html_parts.append(
                    f'<div class="exp-header"><span class="company">{exp.get("title","")} — {exp.get("company","")}</span>'
                    f"<span>{dates}</span></div>"
                )
                achievements = exp.get("achievements", [])
                if achievements:
                    html_parts.append("<ul>" + "".join(f"<li>{a}</li>" for a in achievements) + "</ul>")
                elif exp.get("description"):
                    html_parts.append(f"<p>{exp['description']}</p>")

        education = parsed_json.get("education", [])
        if education:
            html_parts.append("<h2>Education</h2>")
            for edu in education:
                html_parts.append(
                    f'<p><strong>{edu.get("degree","")} in {edu.get("field","")}</strong> — {edu.get("institution","")}'
                    f' ({edu.get("start_date","")}-{edu.get("end_date","")})</p>'
                )

        skills = parsed_json.get("skills", [])
        if skills:
            html_parts.append(f"<h2>Skills</h2><p>{', '.join(skills)}</p>")

        projects = parsed_json.get("projects", [])
        if projects:
            html_parts.append("<h2>Projects</h2>")
            for proj in projects:
                html_parts.append(
                    f'<p><strong>{proj.get("name","")}</strong>: {proj.get("description","")}</p>'
                )

        html_parts.append("</body></html>")
        html_content = "\n".join(html_parts)

        pdf_path = Path(tempfile.mktemp(suffix=".pdf", prefix="resume_"))
        HTML(string=html_content).write_pdf(str(pdf_path))
        return pdf_path

    except Exception:
        logger.error("Failed to generate resume PDF", exc_info=True)
        return None


@celery_app.task(
    bind=True,
    name="workers.application_bot.submit_application",
    max_retries=1,
    default_retry_delay=1800,
    soft_time_limit=240,
    time_limit=300,
    acks_late=True,
)
def submit_application(self, application_id: str):
    """Use Playwright to submit a job application via the job source's apply page."""

    async def _run():
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.application import Application
        from app.models.job import Job
        from app.models.resume import Resume
        from app.models.user import User

        async with get_db() as db:
            app_result = await db.execute(
                select(Application).where(Application.id == application_id)
            )
            application = app_result.scalar_one_or_none()
            if not application:
                logger.error("Application %s not found", application_id)
                return {"status": "error", "reason": "not_found"}

            if application.status not in ("approved", "pending_submission"):
                logger.warning(
                    "Application %s has status '%s', cannot submit",
                    application_id, application.status,
                )
                return {"status": "skipped", "reason": "invalid_status"}

            user_result = await db.execute(select(User).where(User.id == application.user_id))
            user = user_result.scalar_one_or_none()

            job_result = await db.execute(select(Job).where(Job.id == application.job_id))
            job = job_result.scalar_one_or_none()

            if not user or not job:
                logger.error("Missing user or job for application %s", application_id)
                application.status = "failed"
                application.submission_error = "Missing user or job data"
                await db.flush()
                return {"status": "error", "reason": "missing_data"}

            resume_id = application.tailored_resume_id or application.resume_id
            resume = None
            if resume_id:
                resume_result = await db.execute(select(Resume).where(Resume.id == resume_id))
                resume = resume_result.scalar_one_or_none()

            pdf_path = None
            if resume and resume.parsed_json:
                pdf_path = await _generate_resume_pdf(resume.parsed_json)

            application.status = "submitting"
            await db.flush()

            personal_info = {}
            if resume and resume.parsed_json:
                personal_info = resume.parsed_json.get("personal_info", {})

            form_data = {
                "name": personal_info.get("name") or user.name or "",
                "email": personal_info.get("email") or user.email,
                "phone": personal_info.get("phone", ""),
                "linkedin": personal_info.get("linkedin", ""),
            }

            try:
                result = await _submit_with_playwright(
                    apply_url=job.apply_url or "",
                    source=job.source,
                    form_data=form_data,
                    pdf_path=pdf_path,
                    resume_json=resume.parsed_json if resume else None,
                    job_title=job.title,
                    company=job.company,
                    application_id=application_id,
                )

                if result["success"]:
                    application.status = "submitted"
                    application.submitted_at = datetime.now(timezone.utc)
                    application.submission_screenshot_path = result.get("screenshot")
                    await db.flush()

                    from workers.notifications import send_status_email
                    send_status_email.delay(str(application.id), "submitted")

                    logger.info("Application %s submitted successfully", application_id)
                    return {"status": "submitted", "screenshot": result.get("screenshot")}

                else:
                    error_msg = result.get("error", "Unknown submission failure")
                    is_captcha = "captcha" in error_msg.lower()
                    is_unsupported = "unsupported" in error_msg.lower()

                    if is_captcha or is_unsupported:
                        application.status = "failed"
                        application.submission_error = error_msg
                        await db.flush()
                        logger.warning(
                            "Application %s failed (non-retryable): %s",
                            application_id, error_msg,
                        )
                        return {"status": "failed", "error": error_msg, "retryable": False}

                    application.status = "failed"
                    application.submission_error = error_msg
                    application.submission_screenshot_path = result.get("screenshot")
                    await db.flush()
                    raise RuntimeError(error_msg)

            finally:
                if pdf_path and pdf_path.exists():
                    try:
                        pdf_path.unlink()
                    except OSError:
                        pass

    try:
        return run_async(_run())
    except RuntimeError as exc:
        logger.warning("Application %s transient failure, retrying: %s", application_id, exc)
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.error("submit_application failed for %s", application_id, exc_info=True)
        raise self.retry(exc=exc)


async def _submit_with_playwright(
    apply_url: str,
    source: str,
    form_data: dict[str, str],
    pdf_path: Path | None,
    resume_json: dict | None,
    job_title: str,
    company: str,
    application_id: str,
) -> dict[str, Any]:
    """Drive a headless browser to fill and submit the application form."""
    from playwright.async_api import async_playwright, TimeoutError as PWTimeout

    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    screenshot_path = str(SCREENSHOTS_DIR / f"{application_id}.png")

    if not apply_url:
        return {"success": False, "error": "No apply URL provided"}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            await page.goto(apply_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2000)

            if await _detect_captcha(page):
                await page.screenshot(path=screenshot_path, full_page=True)
                return {"success": False, "error": "CAPTCHA detected", "screenshot": screenshot_path}

            await _fill_form_fields(page, form_data)

            if pdf_path and pdf_path.exists():
                await _upload_resume(page, pdf_path)

            await _answer_custom_questions(page, resume_json, job_title, company)

            submitted = await _click_submit(page)

            await page.wait_for_timeout(3000)
            await page.screenshot(path=screenshot_path, full_page=True)

            if submitted:
                confirmation = await _check_confirmation(page)
                if confirmation:
                    return {"success": True, "screenshot": screenshot_path}
                return {"success": True, "screenshot": screenshot_path}

            return {"success": False, "error": "Could not find submit button", "screenshot": screenshot_path}

        except PWTimeout:
            try:
                await page.screenshot(path=screenshot_path, full_page=True)
            except Exception:
                pass
            return {"success": False, "error": "Page timeout during submission", "screenshot": screenshot_path}

        except Exception as exc:
            try:
                await page.screenshot(path=screenshot_path, full_page=True)
            except Exception:
                pass
            return {"success": False, "error": str(exc), "screenshot": screenshot_path}

        finally:
            await context.close()
            await browser.close()


async def _detect_captcha(page) -> bool:
    captcha_indicators = [
        "iframe[src*='recaptcha']",
        "iframe[src*='captcha']",
        "#captcha",
        ".captcha",
        "[data-captcha]",
        "iframe[src*='hcaptcha']",
    ]
    for selector in captcha_indicators:
        if await page.query_selector(selector):
            return True
    content = await page.content()
    return "captcha" in content.lower() and "recaptcha" in content.lower()


async def _fill_form_fields(page, form_data: dict[str, str]):
    field_mappings = {
        "name": [
            'input[name*="name" i]',
            'input[id*="name" i]',
            'input[placeholder*="name" i]',
            'input[aria-label*="name" i]',
            'input[autocomplete="name"]',
        ],
        "email": [
            'input[type="email"]',
            'input[name*="email" i]',
            'input[id*="email" i]',
            'input[placeholder*="email" i]',
            'input[autocomplete="email"]',
        ],
        "phone": [
            'input[type="tel"]',
            'input[name*="phone" i]',
            'input[id*="phone" i]',
            'input[placeholder*="phone" i]',
            'input[name*="mobile" i]',
        ],
        "linkedin": [
            'input[name*="linkedin" i]',
            'input[id*="linkedin" i]',
            'input[placeholder*="linkedin" i]',
        ],
    }

    for field_key, selectors in field_mappings.items():
        value = form_data.get(field_key, "")
        if not value:
            continue
        for selector in selectors:
            try:
                el = await page.query_selector(selector)
                if el and await el.is_visible():
                    await el.click()
                    await el.fill("")
                    await el.type(value, delay=50)
                    break
            except Exception:
                continue


async def _upload_resume(page, pdf_path: Path):
    upload_selectors = [
        'input[type="file"]',
        'input[accept*=".pdf"]',
        'input[accept*="application/pdf"]',
        'input[name*="resume" i]',
        'input[name*="cv" i]',
    ]
    for selector in upload_selectors:
        try:
            file_input = await page.query_selector(selector)
            if file_input:
                await file_input.set_input_files(str(pdf_path))
                logger.debug("Resume uploaded via selector: %s", selector)
                return
        except Exception:
            continue

    try:
        file_inputs = await page.query_selector_all('input[type="file"]')
        if file_inputs:
            await file_inputs[0].set_input_files(str(pdf_path))
            return
    except Exception:
        logger.warning("Could not find file upload input")


async def _answer_custom_questions(
    page, resume_json: dict | None, job_title: str, company: str
):
    """Find unanswered text fields/textareas and use AI to fill them."""
    try:
        questions = await page.query_selector_all("textarea:not([style*='display: none'])")
        additional_inputs = await page.query_selector_all(
            "input[type='text']:not([name*='name' i]):not([name*='email' i])"
            ":not([name*='phone' i]):not([name*='linkedin' i]):not([type='hidden'])"
        )

        elements_to_fill = list(questions) + list(additional_inputs)
        if not elements_to_fill or not resume_json:
            return

        from app.services.ai.service import AIService
        ai = AIService()
        summary = resume_json.get("summary", "")
        skills = resume_json.get("skills", [])
        resume_summary = f"{summary}\nSkills: {', '.join(skills)}"

        for el in elements_to_fill[:5]:
            try:
                current_value = await el.input_value()
                if current_value.strip():
                    continue

                label_text = ""
                el_id = await el.get_attribute("id")
                if el_id:
                    label = await page.query_selector(f'label[for="{el_id}"]')
                    if label:
                        label_text = await label.inner_text()

                if not label_text:
                    placeholder = await el.get_attribute("placeholder") or ""
                    aria_label = await el.get_attribute("aria-label") or ""
                    name_attr = await el.get_attribute("name") or ""
                    label_text = placeholder or aria_label or name_attr

                if not label_text:
                    continue

                answer = await ai.answer_question(
                    question=label_text,
                    resume_summary=resume_summary,
                    job_title=job_title,
                    company=company,
                )
                if answer:
                    await el.fill("")
                    await el.type(answer, delay=30)

            except Exception:
                continue

    except Exception:
        logger.debug("Custom question answering encountered an error", exc_info=True)


async def _click_submit(page) -> bool:
    submit_selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        "button:has-text('Submit')",
        "button:has-text('Apply')",
        "button:has-text('Send')",
        "button:has-text('Submit Application')",
        "button:has-text('Apply Now')",
        'a:has-text("Submit")',
    ]
    for selector in submit_selectors:
        try:
            btn = await page.query_selector(selector)
            if btn and await btn.is_visible():
                await btn.click()
                return True
        except Exception:
            continue
    return False


async def _check_confirmation(page) -> bool:
    confirmation_indicators = [
        "text=thank you",
        "text=application received",
        "text=successfully submitted",
        "text=application has been submitted",
        "text=we've received your application",
    ]
    for indicator in confirmation_indicators:
        try:
            el = await page.query_selector(indicator)
            if el:
                return True
        except Exception:
            continue
    return False
