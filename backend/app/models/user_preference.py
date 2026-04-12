import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Time
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    desired_titles: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    employment_types: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    work_modes: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_currency: Mapped[str | None] = mapped_column(String(10), nullable=True)
    preferred_locations: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    open_to_relocation: Mapped[bool] = mapped_column(Boolean, default=False)
    years_experience_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    years_experience_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    primary_skills: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    secondary_skills: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    industries: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    company_sizes: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    preferred_companies: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    blacklisted_companies: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )

    min_match_score: Mapped[int] = mapped_column(Integer, default=75)
    max_applications_per_day: Mapped[int] = mapped_column(Integer, default=5)
    agent_active_hours_start: Mapped[datetime | None] = mapped_column(
        Time, nullable=True
    )
    agent_active_hours_end: Mapped[datetime | None] = mapped_column(
        Time, nullable=True
    )
    agent_timezone: Mapped[str] = mapped_column(
        String(50), default="Asia/Kolkata"
    )
    approval_mode: Mapped[str] = mapped_column(
        String(50), default="always_ask"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="preferences")
