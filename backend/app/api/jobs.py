import math
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.job import Job
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.job import JobListResponse, JobResponse

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _apply_job_filters(
    query: Select,
    source: str | None,
    work_mode: str | None,
    employment_type: str | None,
    salary_min: int | None,
    salary_max: int | None,
    posted_after: datetime | None,
    posted_before: datetime | None,
    search: str | None,
    is_active: bool | None,
) -> Select:
    if source:
        query = query.where(Job.source.ilike(f"%{source}%"))
    if work_mode:
        query = query.where(Job.work_mode == work_mode)
    if employment_type:
        query = query.where(Job.employment_type == employment_type)
    if salary_min is not None:
        query = query.where(Job.salary_max >= salary_min)
    if salary_max is not None:
        query = query.where(Job.salary_min <= salary_max)
    if posted_after:
        query = query.where(Job.posted_date >= posted_after)
    if posted_before:
        query = query.where(Job.posted_date <= posted_before)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Job.title.ilike(search_filter))
            | (Job.company.ilike(search_filter))
            | (Job.description.ilike(search_filter))
        )
    if is_active is not None:
        query = query.where(Job.is_active == is_active)
    return query


def _normalize_work_modes_db(values: list[str] | None) -> list[str]:
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


def _normalize_employment_types_db(values: list[str] | None) -> list[str]:
    if not values:
        return []
    out: list[str] = []
    for raw in values:
        key = (raw or "").lower().replace("-", "_").replace(" ", "_")
        if key == "fulltime":
            key = "full_time"
        elif key == "parttime":
            key = "part_time"
        if key:
            out.append(key)
    return list(dict.fromkeys(out))


def _title_match_words(title: str) -> list[str]:
    """Split a desired title into tokens for softer matching (phrase ilike is often too strict)."""
    return [w for w in title.replace(",", " ").split() if len(w.strip()) >= 2]


def _apply_user_preference_filters(
    query: Select,
    pref: UserPreference | None,
    *,
    work_mode: str | None,
    employment_type: str | None,
    salary_min: int | None,
    salary_max: int | None,
    search: str | None,
) -> Select:
    """Narrow the job list using saved preferences when the client did not override that dimension."""
    if not pref:
        return query

    if not search:
        titles = [t.strip() for t in (pref.desired_titles or []) if t and t.strip()]
        if titles:
            title_clauses = []
            for t in titles:
                words = _title_match_words(t)
                if not words:
                    title_clauses.append(
                        Job.title.ilike(f"%{t}%") | Job.description.ilike(f"%{t}%")
                    )
                    continue
                per_title = and_(
                    *(
                        Job.title.ilike(f"%{w}%") | Job.description.ilike(f"%{w}%")
                        for w in words
                    )
                )
                title_clauses.append(per_title)
            if title_clauses:
                query = query.where(or_(*title_clauses))

    if work_mode is None:
        modes = _normalize_work_modes_db(pref.work_modes)
        if modes:
            query = query.where(
                or_(Job.work_mode.in_(modes), Job.work_mode.is_(None))
            )

    if employment_type is None:
        emp_types = _normalize_employment_types_db(pref.employment_types)
        if emp_types:
            query = query.where(
                or_(Job.employment_type.in_(emp_types), Job.employment_type.is_(None))
            )

    if salary_min is None and pref.salary_min is not None:
        query = query.where(
            or_(Job.salary_max >= pref.salary_min, Job.salary_max.is_(None))
        )
    if salary_max is None and pref.salary_max is not None:
        query = query.where(
            or_(Job.salary_min <= pref.salary_max, Job.salary_min.is_(None))
        )

    locs = [loc.strip() for loc in (pref.preferred_locations or []) if loc and loc.strip()]
    if locs and not pref.open_to_relocation:
        loc_clauses = [Job.location.ilike(f"%{loc}%") for loc in locs]
        modes = _normalize_work_modes_db(pref.work_modes)
        if modes and "remote" in modes:
            query = query.where(or_(Job.work_mode == "remote", or_(*loc_clauses)))
        else:
            query = query.where(or_(*loc_clauses))

    for company in pref.blacklisted_companies or []:
        c = (company or "").strip()
        if c:
            query = query.where(~Job.company.ilike(f"%{c}%"))

    return query


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
        False,
        description="When true, apply saved user preferences for dimensions not set in the query.",
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Job)
    base_query = _apply_job_filters(
        base_query, source, work_mode, employment_type,
        salary_min, salary_max, posted_after, posted_before,
        search, is_active,
    )

    if apply_preferences:
        pref_result = await db.execute(
            select(UserPreference).where(UserPreference.user_id == current_user.id)
        )
        preference = pref_result.scalar_one_or_none()
        base_query = _apply_user_preference_filters(
            base_query,
            preference,
            work_mode=work_mode,
            employment_type=employment_type,
            salary_min=salary_min,
            salary_max=salary_max,
            search=search,
        )

    count_query = select(func.count()).select_from(
        base_query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    items_query = base_query.order_by(Job.scraped_at.desc()).offset(offset).limit(page_size)
    items_result = await db.execute(items_query)
    jobs = items_result.scalars().all()

    return JobListResponse(
        items=[JobResponse.model_validate(j) for j in jobs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return JobResponse.model_validate(job)


@router.post("/{job_id}/tailor-and-email")
async def queue_tailored_cv_email(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Queue AI tailoring for this job and email a PDF tailored CV to the signed-in user."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )

    from workers.tailoring import tailor_resume_for_job

    tailor_resume_for_job.delay(str(current_user.id), str(job_id))
    return {
        "message": "Tailoring started. You will receive an email with your tailored CV shortly.",
        "job_id": str(job_id),
    }
