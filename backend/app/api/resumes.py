import uuid
from pathlib import Path

import aiofiles
import aiofiles.os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.resume import Resume
from app.models.user import User
from app.schemas.resume import (
    ResumeResponse,
    ResumeUpdate,
    ResumeUploadResponse,
    TailorFromPostingRequest,
)
from app.services.ai.service import ai_service

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
UPLOAD_DIR = "uploads/resumes"


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    resumes = result.scalars().all()
    return [ResumeResponse.model_validate(r) for r in resumes]


@router.post("/tailor-from-posting", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def tailor_from_posting(
    body: TailorFromPostingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a tailored resume JSON from a pasted job description (optional PDF to email)."""
    resume_result = await db.execute(
        select(Resume)
        .where(Resume.user_id == current_user.id, Resume.is_base.is_(True))
        .order_by(Resume.created_at.desc())
        .limit(1)
    )
    base_resume = resume_result.scalar_one_or_none()
    if not base_resume or not base_resume.parsed_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upload a base resume first so we can tailor it.",
        )

    match_stub = {
        "match_score": 0,
        "recommended": True,
        "strengths": [],
        "concerns": [],
        "matched_skills": [],
        "missing_skills": [],
        "match_reasons": [],
    }
    try:
        tailored_json = await ai_service.tailor_resume_json_for_job(
            base_resume.parsed_json,
            match_stub,
            job_title=body.job_title or "Role from your posting",
            company=body.company or "Employer",
            location=body.location or "Not specified",
            job_description=body.description.strip(),
            required_skills=list(body.required_skills or []),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not generate a tailored resume. Try again in a moment.",
        )

    title_hint = body.job_title or "Custom posting"
    company_hint = body.company or "Posted role"
    tailored_resume = Resume(
        user_id=current_user.id,
        version_name=f"Tailored: {title_hint} ({company_hint})",
        is_base=False,
        parsed_json=tailored_json,
        original_filename=base_resume.original_filename,
    )
    db.add(tailored_resume)
    await db.flush()
    await db.refresh(tailored_resume)

    if body.email_pdf:
        from app.services.email.service import EmailService
        from app.services.resume_pdf import generate_resume_pdf_async

        pdf_path = await generate_resume_pdf_async(tailored_json)
        if pdf_path and pdf_path.exists():
            try:
                pdf_bytes = pdf_path.read_bytes()
            finally:
                try:
                    pdf_path.unlink()
                except OSError:
                    pass

            def _safe_part(text: str, max_len: int = 32) -> str:
                out = "".join(
                    c for c in (text or "") if c.isalnum() or c in (" ", "-", "_")
                ).strip()
                return (out[:max_len] or "CV").replace(" ", "_")

            email_svc = EmailService(db)
            await email_svc.send_tailored_cv_for_posting_email(
                user=current_user,
                job_title=title_hint,
                company=company_hint,
                pdf_bytes=pdf_bytes,
                pdf_filename=f"CV_{_safe_part(company_hint)}_{_safe_part(title_hint)}.pdf",
            )

    return ResumeResponse.model_validate(tailored_resume)


@router.post("/upload", response_model=ResumeUploadResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are allowed",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit",
        )

    file_id = str(uuid.uuid4())
    extension = ".pdf" if file.content_type == "application/pdf" else ".docx"
    file_path = f"{UPLOAD_DIR}/{current_user.id}/{file_id}{extension}"

    dir_path = f"{UPLOAD_DIR}/{current_user.id}"
    await aiofiles.os.makedirs(dir_path, exist_ok=True)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    parsed_json = None
    try:
        text_content = ""
        if file.content_type == "application/pdf":
            import io
            import pdfplumber
            with pdfplumber.open(io.BytesIO(contents)) as pdf:
                text_content = "\n".join(
                    page.extract_text() or "" for page in pdf.pages
                )
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            import io
            import docx
            doc = docx.Document(io.BytesIO(contents))
            text_content = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        else:
            text_content = contents.decode("utf-8", errors="ignore")

        if len(text_content.strip()) > 50:
            parsed_json = await ai_service.parse_resume(text_content)
    except Exception:
        pass

    existing_base = await db.execute(
        select(Resume).where(
            Resume.user_id == current_user.id,
            Resume.is_base.is_(True),
        )
    )
    has_base = existing_base.scalar_one_or_none() is not None

    resume = Resume(
        user_id=current_user.id,
        version_name=file.filename,
        is_base=not has_base,
        original_filename=file.filename,
        file_path=file_path,
        parsed_json=parsed_json,
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)

    response = ResumeUploadResponse.model_validate(resume)
    response.message = "Resume uploaded and parsed successfully" if parsed_json else "Resume uploaded successfully"
    return response


def _safe_resume_file_path(file_path: str | None) -> Path | None:
    if not file_path:
        return None
    try:
        root = Path(UPLOAD_DIR).resolve()
        target = Path(file_path).resolve()
        target.relative_to(root)
    except (ValueError, OSError):
        return None
    if not target.is_file():
        return None
    return target


@router.get("/{resume_id}/file")
async def serve_resume_file(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the stored resume file (PDF or DOCX) for preview/download."""
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    path = _safe_resume_file_path(resume.file_path)
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on disk",
        )
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        media_type = "application/pdf"
    elif suffix == ".docx":
        media_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    else:
        media_type = "application/octet-stream"
    filename = resume.original_filename or path.name
    return FileResponse(
        path,
        media_type=media_type,
        filename=filename,
        content_disposition_type="inline",
    )


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    return ResumeResponse.model_validate(resume)


@router.put("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: uuid.UUID,
    body: ResumeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resume, field, value)

    await db.flush()
    await db.refresh(resume)
    return ResumeResponse.model_validate(resume)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    file_path = resume.file_path
    await db.delete(resume)
    await db.flush()

    if file_path:
        try:
            await aiofiles.os.remove(file_path)
        except OSError:
            pass

    return None


@router.post("/{resume_id}/set-base", response_model=ResumeResponse)
async def set_base_resume(
    resume_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id,
        )
    )
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    await db.execute(
        update(Resume)
        .where(Resume.user_id == current_user.id)
        .values(is_base=False)
    )

    resume.is_base = True
    await db.flush()
    await db.refresh(resume)
    return ResumeResponse.model_validate(resume)
