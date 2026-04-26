import math
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.application import Application
from app.models.job import Job
from app.models.resume import Resume
from app.models.saved_job import SavedJob
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.job import (
    JobListResponse,
    JobResponse,
    JobSaveRequest,
    SavedJobResponse,
)
from app.services.jobs.search import search_jobs_realtime

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _normalize_work_modes(values: list[str] | None) -> list[str]:
    if not values:
        return []
    out: list[str] = []
    for raw in values:
        key = (raw or "").lower().replace("-", "").replace(" ", "")
        if key in ("remote", "hybrid", "onsite"):
            out.append(key)
        elif key == "on_site":
            out.append("onsite")
    return list(dict.fromkeys(out))


def _client_side_filter(
    jobs: list[dict],
    *,
    source: str | None,
    work_mode: str | None,
    employment_type: str | None,
    salary_min: int | None,
    salary_max: int | None,
) -> list[dict]:
    result = jobs
    if source:
        src = source.lower()
        result = [j for j in result if src in (j.get("source") or "").lower()]
    if work_mode:
        wm = work_mode.lower()
        result = [j for j in result if (j.get("work_mode") or "").lower() == wm]
    if employment_type:
        et = employment_type.lower()
        result = [j for j in result if (j.get("employment_type") or "").lower() == et]
    if salary_min is not None:
        result = [j for j in result if (j.get("salary_max") or 0) >= salary_min or j.get("salary_max") is None]
    if salary_max is not None:
        result = [j for j in result if (j.get("salary_min") or 0) <= salary_max or j.get("salary_min") is None]
    return result


@router.get("", response_model=JobListResponse)
async def list_jobs(
    source: Optional[str] = Query(None),
    work_mode: Optional[str] = Query(None),
    employment_type: Optional[str] = Query(None),
    salary_min: Optional[int] = Query(None),
    salary_max: Optional[int] = Query(None),
    posted_after: Optional[datetime] = Query(None),
    posted_before: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    apply_preferences: bool = Query(
        True,
        description="Always applies user preferences to build the search query.",
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch jobs in real-time from JSearch API using user preferences."""
    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preference = pref_result.scalar_one_or_none()

    titles = ["software engineer"]
    location = ""
    country = ""
    pref_work_modes: list[str] = []
    pref_employment_types: list[str] = []

    if preference:
        if preference.desired_titles:
            titles = [t.strip() for t in preference.desired_titles if t and t.strip()]
            if not titles:
                titles = ["software engineer"]
        if preference.preferred_locations:
            locs = [loc.strip() for loc in preference.preferred_locations if loc and loc.strip()]
            if locs:
                location = locs[0]
        if preference.work_modes:
            pref_work_modes = _normalize_work_modes(preference.work_modes)
        if preference.employment_types:
            pref_employment_types = preference.employment_types

    api_work_modes = pref_work_modes
    if work_mode:
        api_work_modes = [work_mode.lower()]

    api_emp_types = pref_employment_types
    if employment_type:
        api_emp_types = [employment_type]

    raw_jobs = await search_jobs_realtime(
        titles=titles,
        location=location,
        country=country,
        work_modes=api_work_modes,
        employment_types=api_emp_types,
        date_posted="week",
        num_pages=1,
        page=page,
        search=search,
    )

    filtered = _client_side_filter(
        raw_jobs,
        source=source,
        work_mode=work_mode,
        employment_type=employment_type,
        salary_min=salary_min,
        salary_max=salary_max,
    )

    total = len(filtered)
    offset = (page - 1) * page_size
    page_items = filtered[offset : offset + page_size]
    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return JobListResponse(
        items=[JobResponse(**j) for j in page_items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/saved", response_model=JobListResponse)
async def list_saved_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List jobs that the user explicitly saved."""
    base_query = select(SavedJob).where(SavedJob.user_id == current_user.id)

    if search:
        search_filter = f"%{search}%"
        base_query = base_query.where(
            (SavedJob.title.ilike(search_filter))
            | (SavedJob.company.ilike(search_filter))
        )

    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    items_query = base_query.order_by(SavedJob.saved_at.desc()).offset(offset).limit(page_size)
    items_result = await db.execute(items_query)
    saved_jobs = items_result.scalars().all()

    items = []
    for sj in saved_jobs:
        items.append(JobResponse(
            id=str(sj.id),
            source=sj.source,
            source_job_id=sj.source_job_id,
            title=sj.title,
            company=sj.company,
            company_logo_url=sj.company_logo_url,
            location=sj.location,
            work_mode=sj.work_mode,
            employment_type=sj.employment_type,
            salary_min=sj.salary_min,
            salary_max=sj.salary_max,
            salary_currency=sj.salary_currency,
            description=sj.description,
            required_skills=sj.required_skills,
            preferred_skills=sj.preferred_skills,
            experience_required=sj.experience_required,
            apply_url=sj.apply_url,
            posted_date=sj.posted_date.isoformat() if sj.posted_date else None,
            is_active=True,
        ))

    return JobListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("/save", response_model=SavedJobResponse)
async def save_job(
    payload: JobSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a job to the user's saved list. The full job data is sent from the frontend."""
    existing = await db.execute(
        select(SavedJob).where(
            SavedJob.user_id == current_user.id,
            SavedJob.title == payload.title,
            SavedJob.company == payload.company,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Job already saved",
        )

    posted_date = None
    if payload.posted_date:
        try:
            posted_date = datetime.fromisoformat(payload.posted_date.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass

    saved_job = SavedJob(
        user_id=current_user.id,
        source=payload.source,
        source_job_id=payload.source_job_id,
        title=payload.title,
        company=payload.company,
        company_logo_url=payload.company_logo_url,
        location=payload.location,
        work_mode=payload.work_mode,
        employment_type=payload.employment_type,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        salary_currency=payload.salary_currency,
        description=payload.description,
        required_skills=payload.required_skills,
        preferred_skills=payload.preferred_skills,
        experience_required=payload.experience_required,
        apply_url=payload.apply_url,
        posted_date=posted_date,
    )
    db.add(saved_job)
    await db.flush()
    await db.refresh(saved_job)
    return SavedJobResponse.model_validate(saved_job)


@router.delete("/save/{saved_job_id}")
async def unsave_job(
    saved_job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a job from the user's saved list."""
    result = await db.execute(
        select(SavedJob).where(
            SavedJob.id == saved_job_id,
            SavedJob.user_id == current_user.id,
        )
    )
    saved_job = result.scalar_one_or_none()
    if not saved_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved job not found",
        )
    await db.delete(saved_job)
    return {"message": "Job unsaved"}


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single job — checks saved_jobs first, then the legacy jobs table."""
    try:
        parsed_uuid = uuid.UUID(job_id)
        result = await db.execute(select(SavedJob).where(SavedJob.id == parsed_uuid))
        saved = result.scalar_one_or_none()
        if saved:
            return JobResponse(
                id=str(saved.id),
                source=saved.source,
                source_job_id=saved.source_job_id,
                title=saved.title,
                company=saved.company,
                company_logo_url=saved.company_logo_url,
                location=saved.location,
                work_mode=saved.work_mode,
                employment_type=saved.employment_type,
                salary_min=saved.salary_min,
                salary_max=saved.salary_max,
                salary_currency=saved.salary_currency,
                description=saved.description,
                required_skills=saved.required_skills,
                preferred_skills=saved.preferred_skills,
                experience_required=saved.experience_required,
                apply_url=saved.apply_url,
                posted_date=saved.posted_date.isoformat() if saved.posted_date else None,
                is_active=True,
            )

        result = await db.execute(select(Job).where(Job.id == parsed_uuid))
        job = result.scalar_one_or_none()
        if job:
            return JobResponse(
                id=str(job.id),
                source=job.source,
                source_job_id=job.source_job_id,
                title=job.title,
                company=job.company,
                company_logo_url=job.company_logo_url,
                location=job.location,
                work_mode=job.work_mode,
                employment_type=job.employment_type,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                salary_currency=job.salary_currency,
                description=job.description,
                required_skills=job.required_skills,
                preferred_skills=job.preferred_skills,
                experience_required=job.experience_required,
                apply_url=job.apply_url,
                posted_date=job.posted_date.isoformat() if job.posted_date else None,
                is_active=job.is_active,
            )
    except ValueError:
        pass

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Job not found",
    )


@router.post("/{job_id}/tailor-and-email")
async def queue_tailored_cv_email(
    job_id: str,
    payload: JobSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Queue AI tailoring for a job and email a tailored CV PDF.

    The frontend sends the full job data in the request body.
    If the job already exists in the DB we reuse it, otherwise we persist it.
    """
    db_job: Job | None = None

    try:
        parsed_uuid = uuid.UUID(job_id)
        result = await db.execute(select(Job).where(Job.id == parsed_uuid))
        db_job = result.scalar_one_or_none()
    except ValueError:
        pass

    if not db_job:
        posted_date = None
        if payload.posted_date:
            try:
                posted_date = datetime.fromisoformat(payload.posted_date.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

        db_job = Job(
            id=uuid.uuid4(),
            source=payload.source or "jsearch",
            source_job_id=payload.source_job_id,
            title=payload.title,
            company=payload.company,
            company_logo_url=payload.company_logo_url,
            location=payload.location,
            work_mode=payload.work_mode,
            employment_type=payload.employment_type,
            salary_min=payload.salary_min,
            salary_max=payload.salary_max,
            salary_currency=payload.salary_currency,
            description=payload.description,
            required_skills=payload.required_skills,
            preferred_skills=payload.preferred_skills,
            experience_required=payload.experience_required,
            apply_url=payload.apply_url,
            posted_date=posted_date,
            is_active=True,
        )
        db.add(db_job)
        await db.flush()
        await db.refresh(db_job)

    if not db_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found. Please provide job data in the request body.",
        )

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
            detail="Upload a base resume before requesting a tailored CV.",
        )

    job_data = {
        "title": payload.title,
        "company": payload.company,
        "location": payload.location,
        "description": payload.description,
        "required_skills": payload.required_skills,
    }

    tailored_existing = await db.execute(
        select(Application)
        .where(
            Application.user_id == current_user.id,
            Application.job_id == db_job.id,
            Application.tailored_resume_id.isnot(None),
        )
        .order_by(Application.created_at.desc())
        .limit(1)
    )
    existing_app = tailored_existing.scalar_one_or_none()
    if existing_app:
        from workers.tailoring import tailor_resume_for_job
        tailor_resume_for_job.delay(str(current_user.id), str(db_job.id), job_data=job_data)
        return {
            "message": "Tailoring started. You will receive an email with your tailored CV shortly.",
            "job_id": str(db_job.id),
            "application_id": str(existing_app.id),
        }

    await db.execute(
        delete(Application).where(
            Application.user_id == current_user.id,
            Application.job_id == db_job.id,
            Application.tailored_resume_id.is_(None),
            Application.status != "cv_preparing",
        )
    )

    prep_result = await db.execute(
        select(Application)
        .where(
            Application.user_id == current_user.id,
            Application.job_id == db_job.id,
            Application.tailored_resume_id.is_(None),
            Application.status == "cv_preparing",
        )
        .order_by(Application.created_at.desc())
        .limit(1)
    )
    placeholder = prep_result.scalar_one_or_none()
    if not placeholder:
        placeholder = Application(
            user_id=current_user.id,
            job_id=db_job.id,
            resume_id=base_resume.id,
            tailored_resume_id=None,
            match_score=None,
            match_analysis=None,
            status="cv_preparing",
        )
        db.add(placeholder)

    await db.flush()
    await db.refresh(placeholder)

    from workers.tailoring import tailor_resume_for_job
    tailor_resume_for_job.delay(str(current_user.id), str(db_job.id), job_data=job_data)
    return {
        "message": "Tailoring started. You will receive an email with your tailored CV shortly.",
        "job_id": str(db_job.id),
        "application_id": str(placeholder.id),
    }
