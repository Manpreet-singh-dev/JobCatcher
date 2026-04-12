import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_approval_token,
    get_current_user,
    verify_approval_token,
)
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.application import (
    ApplicationListResponse,
    ApplicationResponse,
    ApplicationUpdate,
)
from app.services.email.service import EmailService

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _apply_application_filters(
    query: Select,
    user_id: uuid.UUID,
    app_status: str | None,
    min_match_score: int | None,
    max_match_score: int | None,
    created_after: datetime | None,
    created_before: datetime | None,
    sort_by: str,
    sort_order: str,
) -> Select:
    query = query.where(Application.user_id == user_id)

    if app_status:
        query = query.where(Application.status == app_status)
    if min_match_score is not None:
        query = query.where(Application.match_score >= min_match_score)
    if max_match_score is not None:
        query = query.where(Application.match_score <= max_match_score)
    if created_after:
        query = query.where(Application.created_at >= created_after)
    if created_before:
        query = query.where(Application.created_at <= created_before)

    sort_column_map = {
        "created_at": Application.created_at,
        "match_score": Application.match_score,
        "status": Application.status,
        "updated_at": Application.updated_at,
    }
    sort_col = sort_column_map.get(sort_by, Application.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return query


@router.get("", response_model=ApplicationListResponse)
async def list_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    min_match_score: Optional[int] = Query(None),
    max_match_score: Optional[int] = Query(None),
    created_after: Optional[datetime] = Query(None),
    created_before: Optional[datetime] = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|match_score|status|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(Application).options(joinedload(Application.job))
    base_query = _apply_application_filters(
        base_query, current_user.id, status_filter,
        min_match_score, max_match_score,
        created_after, created_before, sort_by, sort_order,
    )

    count_query = select(func.count()).select_from(
        select(Application.id)
        .where(Application.user_id == current_user.id)
        .subquery()
    )
    if status_filter:
        count_query = select(func.count()).select_from(
            select(Application.id)
            .where(Application.user_id == current_user.id, Application.status == status_filter)
            .subquery()
        )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    items_query = base_query.offset(offset).limit(page_size)
    items_result = await db.execute(items_query)
    applications = items_result.unique().scalars().all()

    return ApplicationListResponse(
        items=[ApplicationResponse.model_validate(a) for a in applications],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    job_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = await db.execute(
        select(Application).where(
            Application.user_id == current_user.id,
            Application.job_id == job_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already applied to this job")

    application = Application(
        user_id=current_user.id,
        job_id=job_id,
        status="pending_approval",
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == application.id)
    )
    application = result.unique().scalar_one()
    return ApplicationResponse.model_validate(application)


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application(
    application_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    application = result.unique().scalar_one_or_none()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )
    return ApplicationResponse.model_validate(application)


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: uuid.UUID,
    body: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    application = result.unique().scalar_one_or_none()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(application, field, value)

    await db.flush()
    await db.refresh(application)
    return ApplicationResponse.model_validate(application)


@router.get("/{application_id}/approve")
async def approve_application(
    application_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    payload = verify_approval_token(token)

    if str(application_id) != payload.get("application_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not match application",
        )

    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == application_id)
    )
    application = result.unique().scalar_one_or_none()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status not in ("pending_approval", "expired"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application cannot be approved from status '{application.status}'",
        )

    application.status = "approved"
    application.approval_action_at = datetime.now(timezone.utc)
    await db.flush()

    user_result = await db.execute(
        select(User).where(User.id == application.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user and application.job:
        email_service = EmailService(db)
        await email_service.send_approved_email(user, application, application.job)

    return {
        "message": "Application approved successfully",
        "redirect_url": f"{settings.APP_URL}/applications/{application_id}",
    }


@router.get("/{application_id}/reject")
async def reject_application(
    application_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    payload = verify_approval_token(token)

    if str(application_id) != payload.get("application_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token does not match application",
        )

    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(Application.id == application_id)
    )
    application = result.unique().scalar_one_or_none()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status != "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application cannot be rejected from status '{application.status}'",
        )

    application.status = "rejected"
    application.approval_action_at = datetime.now(timezone.utc)
    await db.flush()

    user_result = await db.execute(
        select(User).where(User.id == application.user_id)
    )
    user = user_result.scalar_one_or_none()
    if user and application.job:
        email_service = EmailService(db)
        await email_service.send_rejected_email(user, application, application.job)

    return {
        "message": "Application rejected",
        "redirect_url": f"{settings.APP_URL}/applications/{application_id}",
    }


@router.post("/{application_id}/reactivate", response_model=ApplicationResponse)
async def reactivate_application(
    application_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .options(joinedload(Application.job))
        .where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    )
    application = result.unique().scalar_one_or_none()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    if application.status != "expired":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only expired applications can be reactivated",
        )

    new_token = create_approval_token(
        str(current_user.id), str(application.id), "approve"
    )
    application.status = "pending_approval"
    application.approval_token = new_token
    application.approval_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    await db.flush()
    await db.refresh(application)

    if application.job:
        email_service = EmailService(db)
        await email_service.send_approval_email(
            current_user, application, application.job,
            match_analysis=application.match_analysis,
        )

    return ApplicationResponse.model_validate(application)
