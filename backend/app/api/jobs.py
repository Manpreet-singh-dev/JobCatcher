import math
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.job import Job
from app.models.user import User
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
        query = query.where(Job.source == source)
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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Job)
    base_query = _apply_job_filters(
        base_query, source, work_mode, employment_type,
        salary_min, salary_max, posted_after, posted_before,
        search, is_active,
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
