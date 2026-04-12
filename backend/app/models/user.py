import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_oauth_token: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    email_oauth_token: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    agent_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    preferences = relationship(
        "UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    resumes = relationship(
        "Resume", back_populates="user", cascade="all, delete-orphan"
    )
    applications = relationship(
        "Application", back_populates="user", cascade="all, delete-orphan"
    )
    email_logs = relationship(
        "EmailLog", back_populates="user", cascade="all, delete-orphan"
    )
    agent_logs = relationship(
        "AgentLog", back_populates="user", cascade="all, delete-orphan"
    )
