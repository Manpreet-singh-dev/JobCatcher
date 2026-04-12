import math
import uuid
from datetime import datetime, timezone
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.agent_log import AgentLog
from app.models.application import Application
from app.models.user import User
from app.schemas.agent import AgentLog as AgentLogSchema
from app.schemas.agent import AgentLogList, AgentStatus

router = APIRouter(prefix="/api/agent", tags=["agent"])


async def _get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/status", response_model=AgentStatus)
async def get_agent_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    redis_client = await _get_redis()
    try:
        is_running = await redis_client.get(f"agent:running:{current_user.id}")
        last_run_raw = await redis_client.get(f"agent:last_run:{current_user.id}")
        next_run_raw = await redis_client.get(f"agent:next_run:{current_user.id}")
    finally:
        await redis_client.aclose()

    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    count_result = await db.execute(
        select(func.count())
        .select_from(Application)
        .where(
            Application.user_id == current_user.id,
            Application.created_at >= today_start,
        )
    )
    applications_today = count_result.scalar() or 0

    pref_result = await db.execute(
        select(Application)
        .where(Application.user_id == current_user.id)
        .limit(1)
    )

    from app.models.user_preference import UserPreference

    pref_query = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preference = pref_query.scalar_one_or_none()
    max_per_day = preference.max_applications_per_day if preference else 5

    last_run_at = None
    if last_run_raw:
        try:
            last_run_at = datetime.fromisoformat(last_run_raw)
        except (ValueError, TypeError):
            pass

    next_run_at = None
    if next_run_raw:
        try:
            next_run_at = datetime.fromisoformat(next_run_raw)
        except (ValueError, TypeError):
            pass

    return AgentStatus(
        is_active=current_user.agent_active,
        is_running=bool(is_running),
        last_run_at=last_run_at,
        next_run_at=next_run_at,
        applications_today=applications_today,
        max_applications_per_day=max_per_day,
    )


@router.post("/pause")
async def pause_agent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.agent_active = False
    await db.flush()

    log_entry = AgentLog(
        user_id=current_user.id,
        event_type="agent_paused",
        message="Agent paused by user",
    )
    db.add(log_entry)
    await db.flush()

    return {"message": "Agent paused", "agent_active": False}


@router.post("/resume")
async def resume_agent(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.agent_active = True
    await db.flush()

    log_entry = AgentLog(
        user_id=current_user.id,
        event_type="agent_resumed",
        message="Agent resumed by user",
    )
    db.add(log_entry)
    await db.flush()

    return {"message": "Agent resumed", "agent_active": True}


@router.post("/run-now")
async def trigger_agent_run(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.agent_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent is paused. Resume it first.",
        )

    redis_client = await _get_redis()
    try:
        is_running = await redis_client.get(f"agent:running:{current_user.id}")
        if is_running:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Agent is already running",
            )
        await redis_client.set(
            f"agent:trigger:{current_user.id}",
            datetime.now(timezone.utc).isoformat(),
            ex=300,
        )
    finally:
        await redis_client.aclose()

    from workers.scan_orchestrator import run_scan_cycle
    run_scan_cycle.delay(str(current_user.id))

    log_entry = AgentLog(
        user_id=current_user.id,
        event_type="agent_manual_trigger",
        message="Agent run triggered manually by user",
    )
    db.add(log_entry)
    await db.flush()

    return {"message": "Agent run triggered", "status": "queued"}


@router.get("/today-summary")
async def get_today_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    today_logs_result = await db.execute(
        select(AgentLog)
        .where(
            AgentLog.user_id == current_user.id,
            AgentLog.created_at >= today_start,
        )
    )
    today_logs = today_logs_result.scalars().all()

    jobs_scanned = 0
    jobs_matched = 0
    resumes_tailored = 0
    for log in today_logs:
        et = (log.event_type or "").lower()
        meta = log.metadata_ or {}
        if "scan_complete" in et:
            jobs_scanned += meta.get("total_scraped", 0)
            jobs_matched += meta.get("new_jobs_queued", 0)
        if "tailor" in et:
            resumes_tailored += 1

    app_counts = await db.execute(
        select(Application.status, func.count())
        .where(
            Application.user_id == current_user.id,
            Application.created_at >= today_start,
        )
        .group_by(Application.status)
    )
    status_map: dict[str, int] = {}
    for row in app_counts:
        status_map[row[0]] = row[1]

    approvals_sent = status_map.get("pending_approval", 0)
    applications_submitted = status_map.get("submitted", 0) + status_map.get("approved", 0)

    return {
        "jobs_scanned": jobs_scanned,
        "jobs_matched": jobs_matched,
        "resumes_tailored": resumes_tailored,
        "approvals_sent": approvals_sent,
        "applications_submitted": applications_submitted,
    }


@router.post("/reset-daily-limit")
async def reset_daily_limit(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    from app.models.user_preference import UserPreference

    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = pref_result.scalar_one_or_none()
    if pref:
        pref.max_applications_per_day = max(
            (pref.max_applications_per_day or 5),
            (pref.max_applications_per_day or 5),
        )

    log_entry = AgentLog(
        user_id=current_user.id,
        event_type="daily_limit_reset",
        message="Daily application limit reset by user",
    )
    db.add(log_entry)
    await db.flush()

    return {"message": "Daily limit counter acknowledged as reset"}


@router.post("/clear-queue")
async def clear_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    redis_client = await _get_redis()
    try:
        queue_key = f"jobcatcher:jobs:{current_user.id}"
        deleted = await redis_client.delete(queue_key)
    finally:
        await redis_client.aclose()

    log_entry = AgentLog(
        user_id=current_user.id,
        event_type="queue_cleared",
        message="Application queue cleared by user",
    )
    db.add(log_entry)
    await db.flush()

    return {"message": "Queue cleared", "keys_removed": deleted}


@router.get("/logs", response_model=AgentLogList)
async def get_agent_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(AgentLog).where(AgentLog.user_id == current_user.id)
    if event_type:
        base_query = base_query.where(AgentLog.event_type == event_type)

    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    items_query = (
        base_query.order_by(AgentLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items_result = await db.execute(items_query)
    logs = items_result.scalars().all()

    return AgentLogList(
        items=[AgentLogSchema.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
