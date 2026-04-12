import asyncio
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import redis as redis_lib
from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_init, worker_process_shutdown
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery("jobcatcher", broker=REDIS_URL, backend=REDIS_URL)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=200,
    task_soft_time_limit=300,
    task_time_limit=600,
    task_routes={
        "workers.scrapers.*": {"queue": "scrapers"},
        "workers.matching.*": {"queue": "ai"},
        "workers.tailoring.*": {"queue": "ai"},
        "workers.application_bot.*": {"queue": "browser"},
        "workers.notifications.*": {"queue": "email"},
        "workers.scan_orchestrator.*": {"queue": "default"},
    },
    beat_schedule={
        "schedule-all-scans": {
            "task": "workers.scan_orchestrator.schedule_all_scans",
            "schedule": crontab(minute="*/30"),
        },
        "check-expired-applications": {
            "task": "workers.notifications.check_expired_applications",
            "schedule": crontab(minute=0),
        },
    },
    task_default_queue="default",
    task_create_missing_queues=True,
    task_annotations={
        "workers.application_bot.submit_application": {
            "rate_limit": "5/m",
            "time_limit": 300,
        },
        "workers.scrapers.*": {
            "rate_limit": "10/m",
        },
    },
    include=[
        "workers.matching",
        "workers.tailoring",
        "workers.application_bot",
        "workers.notifications",
        "workers.scan_orchestrator",
    ],
)

# ---------------------------------------------------------------------------
# Worker-scoped async DB engine (uses NullPool to avoid event-loop affinity
# problems when asyncio.run() creates a fresh loop per task invocation).
# ---------------------------------------------------------------------------

_worker_engine = None
_worker_session_factory: async_sessionmaker[AsyncSession] | None = None


def _init_db() -> async_sessionmaker[AsyncSession]:
    global _worker_engine, _worker_session_factory
    if _worker_session_factory is None:
        from app.core.config import settings

        _worker_engine = create_async_engine(
            settings.async_database_url,
            poolclass=NullPool,
            echo=False,
        )
        _worker_session_factory = async_sessionmaker(
            _worker_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _worker_session_factory


@worker_process_shutdown.connect
def _shutdown_db(**kwargs):
    global _worker_engine, _worker_session_factory
    if _worker_engine is not None:
        asyncio.run(_worker_engine.dispose())
        _worker_engine = None
        _worker_session_factory = None


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional async DB session for Celery tasks."""
    factory = _init_db()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_redis() -> redis_lib.Redis:
    """Return a synchronous Redis client."""
    return redis_lib.Redis.from_url(REDIS_URL, decode_responses=True)


def run_async(coro):
    """Execute an async coroutine from a synchronous Celery task."""
    return asyncio.run(coro)
