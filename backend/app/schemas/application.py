import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.job import JobResponse


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None
    tailored_resume_id: Optional[uuid.UUID] = None
    match_score: Optional[int] = None
    match_analysis: Optional[dict[str, Any]] = None
    status: str = "pending_approval"
    approval_token_expires_at: Optional[datetime] = None
    approval_action_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    submission_screenshot_path: Optional[str] = None
    submission_error: Optional[str] = None
    user_notes: Optional[str] = None
    user_applied_confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    job: Optional[JobResponse] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    user_notes: Optional[str] = None


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApplicationFilters(BaseModel):
    status: Optional[str] = None
    min_match_score: Optional[int] = None
    max_match_score: Optional[int] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    sort_by: str = Field(
        default="created_at",
        pattern="^(created_at|match_score|status|updated_at|user_applied_confirmed_at)$",
    )
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
