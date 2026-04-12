"""Render resume JSON to a PDF file (used for email attachments and application bot)."""

import logging
import tempfile
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def generate_resume_pdf(parsed_json: dict[str, Any]) -> Path | None:
    """Render resume JSON to a temporary PDF using WeasyPrint."""
    try:
        from weasyprint import HTML

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
