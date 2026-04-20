"""Render resume JSON to a PDF file (used for email attachments and application bot)."""

import logging
import tempfile
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def generate_resume_pdf_reportlab(parsed_json: dict[str, Any]) -> Path | None:
    """Render resume JSON to PDF using reportlab (no external dependencies)."""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.enums import TA_LEFT, TA_CENTER

        pdf_path = Path(tempfile.mktemp(suffix=".pdf", prefix="resume_"))
        doc = SimpleDocTemplate(str(pdf_path), pagesize=letter,
                                leftMargin=0.75*inch, rightMargin=0.75*inch,
                                topMargin=0.75*inch, bottomMargin=0.75*inch)

        story = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor='#000000',
            spaceAfter=6,
            alignment=TA_CENTER,
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=13,
            textColor='#000000',
            spaceAfter=6,
            spaceBefore=12,
            borderWidth=0,
            borderColor='#999999',
            borderPadding=0,
        )

        normal_style = styles['Normal']

        # Personal Info
        personal = parsed_json.get("personal_info", {})
        name = personal.get("name", "Candidate")
        story.append(Paragraph(name, title_style))

        contact_parts = []
        if personal.get("email"):
            contact_parts.append(personal["email"])
        if personal.get("phone"):
            contact_parts.append(personal["phone"])
        if personal.get("location"):
            contact_parts.append(personal["location"])

        if contact_parts:
            contact_text = " | ".join(contact_parts)
            contact_style = ParagraphStyle('Contact', parent=normal_style,
                                          fontSize=9, alignment=TA_CENTER)
            story.append(Paragraph(contact_text, contact_style))
            story.append(Spacer(1, 0.2*inch))

        # Summary
        summary = parsed_json.get("summary", "")
        if summary:
            story.append(Paragraph("Professional Summary", heading_style))
            story.append(Paragraph(summary, normal_style))
            story.append(Spacer(1, 0.1*inch))

        # Experience
        experiences = parsed_json.get("experience", [])
        if experiences:
            story.append(Paragraph("Experience", heading_style))
            for exp in experiences:
                title = exp.get("title", "")
                company = exp.get("company", "")
                start = exp.get("start_date", "")
                end = exp.get("end_date", "Present") if not exp.get("current") else "Present"

                job_title = f"<b>{title}</b> — {company}"
                story.append(Paragraph(job_title, normal_style))

                if start or end:
                    dates = f"{start} – {end}"
                    date_style = ParagraphStyle('Dates', parent=normal_style, fontSize=9, textColor='#666666')
                    story.append(Paragraph(dates, date_style))

                achievements = exp.get("achievements", [])
                if achievements:
                    for achievement in achievements:
                        story.append(Paragraph(f"• {achievement}", normal_style))
                elif exp.get("description"):
                    story.append(Paragraph(exp["description"], normal_style))

                story.append(Spacer(1, 0.1*inch))

        # Education
        education = parsed_json.get("education", [])
        if education:
            story.append(Paragraph("Education", heading_style))
            for edu in education:
                degree = edu.get("degree", "")
                field = edu.get("field", "")
                institution = edu.get("institution", "")
                start = edu.get("start_date", "")
                end = edu.get("end_date", "")

                edu_text = f"<b>{degree} in {field}</b> — {institution}"
                if start and end:
                    edu_text += f" ({start}-{end})"
                story.append(Paragraph(edu_text, normal_style))
                story.append(Spacer(1, 0.05*inch))

        # Skills
        skills = parsed_json.get("skills", [])
        if skills:
            story.append(Paragraph("Skills", heading_style))
            skills_text = ", ".join(skills)
            story.append(Paragraph(skills_text, normal_style))
            story.append(Spacer(1, 0.1*inch))

        # Projects
        projects = parsed_json.get("projects", [])
        if projects:
            story.append(Paragraph("Projects", heading_style))
            for proj in projects:
                name = proj.get("name", "")
                desc = proj.get("description", "")
                story.append(Paragraph(f"<b>{name}</b>: {desc}", normal_style))
                story.append(Spacer(1, 0.05*inch))

        doc.build(story)
        return pdf_path

    except Exception:
        logger.error("Failed to generate resume PDF with reportlab", exc_info=True)
        return None


async def generate_resume_pdf_async(parsed_json: dict[str, Any]) -> Path | None:
    """Ask the model for LaTeX, compile to PDF; fall back to reportlab if LaTeX fails."""
    from app.services.ai.service import ai_service
    from app.services.resume_latex import compile_latex_to_pdf

    try:
        tex = await ai_service.resume_json_to_latex_document(parsed_json)
        pdf_path = compile_latex_to_pdf(tex)
        if pdf_path and pdf_path.is_file():
            return pdf_path
        logger.warning("LaTeX compile returned no PDF; falling back to reportlab renderer")
    except Exception:
        logger.warning("LaTeX PDF generation failed; falling back to reportlab renderer", exc_info=True)

    return generate_resume_pdf_reportlab(parsed_json)


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
