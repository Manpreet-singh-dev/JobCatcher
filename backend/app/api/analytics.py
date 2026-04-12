from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, cast, func, select, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsSummary,
    ApplicationsOverTime,
    MatchScoreHistogram,
    StatusDistribution,
    TopSkills,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = select(Application).where(Application.user_id == current_user.id)

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar() or 0

    status_counts = await db.execute(
        select(Application.status, func.count())
        .where(Application.user_id == current_user.id)
        .group_by(Application.status)
    )
    status_map: dict[str, int] = {}
    for row in status_counts:
        status_map[row[0]] = row[1]

    avg_score_result = await db.execute(
        select(func.avg(Application.match_score))
        .where(Application.user_id == current_user.id)
        .where(Application.match_score.isnot(None))
    )
    avg_score = avg_score_result.scalar() or 0.0

    approved = status_map.get("approved", 0) + status_map.get("submitted", 0)
    total_decided = approved + status_map.get("rejected", 0)
    approval_rate = (approved / total_decided * 100) if total_decided > 0 else 0.0

    submitted = status_map.get("submitted", 0)
    failed = status_map.get("submission_failed", 0)
    total_attempted = submitted + failed
    success_rate = (submitted / total_attempted * 100) if total_attempted > 0 else 0.0

    return AnalyticsSummary(
        total_applications=total,
        pending_approval=status_map.get("pending_approval", 0),
        approved=status_map.get("approved", 0),
        submitted=submitted,
        rejected=status_map.get("rejected", 0),
        expired=status_map.get("expired", 0),
        average_match_score=round(float(avg_score), 1),
        approval_rate=round(approval_rate, 1),
        submission_success_rate=round(success_rate, 1),
    )


@router.get("/applications-over-time", response_model=list[ApplicationsOverTime])
async def get_applications_over_time(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.date_trunc("day", Application.created_at).label("day"),
            func.count().label("count"),
        )
        .where(
            Application.user_id == current_user.id,
            Application.created_at >= start_date,
        )
        .group_by("day")
        .order_by("day")
    )

    day_counts: dict[str, int] = {}
    for row in result:
        day_str = row[0].strftime("%Y-%m-%d") if row[0] else ""
        day_counts[day_str] = row[1]

    output: list[ApplicationsOverTime] = []
    current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = datetime.now(timezone.utc)
    while current <= end:
        day_str = current.strftime("%Y-%m-%d")
        output.append(ApplicationsOverTime(date=day_str, count=day_counts.get(day_str, 0)))
        current += timedelta(days=1)

    return output


@router.get("/status-distribution", response_model=list[StatusDistribution])
async def get_status_distribution(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application.status, func.count().label("count"))
        .where(Application.user_id == current_user.id)
        .group_by(Application.status)
    )
    rows = result.all()
    total = sum(r[1] for r in rows)

    return [
        StatusDistribution(
            status=row[0],
            count=row[1],
            percentage=round(row[1] / total * 100, 1) if total > 0 else 0.0,
        )
        for row in rows
    ]


@router.get("/top-skills", response_model=list[TopSkills])
async def get_top_skills(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            func.unnest(Job.required_skills).label("skill"),
            func.count().label("count"),
            func.avg(Application.match_score).label("avg_score"),
        )
        .join(Application, Application.job_id == Job.id)
        .where(Application.user_id == current_user.id)
        .where(Job.required_skills.isnot(None))
        .group_by("skill")
        .order_by(func.count().desc())
        .limit(limit)
    )

    return [
        TopSkills(
            skill=row[0],
            count=row[1],
            match_rate=round(float(row[2] or 0), 1),
        )
        for row in result
    ]


@router.get("/match-score-histogram", response_model=list[MatchScoreHistogram])
async def get_match_score_histogram(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ranges = [
        (0, 20, "0-20"),
        (21, 40, "21-40"),
        (41, 60, "41-60"),
        (61, 80, "61-80"),
        (81, 100, "81-100"),
    ]

    result = await db.execute(
        select(
            case(
                *[
                    (
                        Application.match_score.between(low, high),
                        label,
                    )
                    for low, high, label in ranges
                ],
                else_="unknown",
            ).label("range_label"),
            func.count().label("count"),
        )
        .where(
            Application.user_id == current_user.id,
            Application.match_score.isnot(None),
        )
        .group_by("range_label")
    )

    range_counts = {row[0]: row[1] for row in result}

    return [
        MatchScoreHistogram(
            range_label=label,
            count=range_counts.get(label, 0),
        )
        for _, _, label in ranges
    ]
