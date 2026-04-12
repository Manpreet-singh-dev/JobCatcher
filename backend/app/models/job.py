import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    source_job_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dedup_hash: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    employment_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    required_skills: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    preferred_skills: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    experience_required: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    apply_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    posted_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
