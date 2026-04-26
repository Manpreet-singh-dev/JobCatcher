import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str
    source_job_id: Optional[str] = None
    title: str
    company: str
    company_logo_url: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None
    experience_required: Optional[str] = None
    apply_url: Optional[str] = None
    posted_date: Optional[str] = None
    is_active: bool = True


class JobListResponse(BaseModel):
    items: list[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class JobFilters(BaseModel):
    source: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    posted_after: Optional[datetime] = None
    posted_before: Optional[datetime] = None
    search: Optional[str] = None
    is_active: Optional[bool] = True
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class JobSaveRequest(BaseModel):
    """Full job data sent from the frontend to persist a saved job."""
    id: str
    source: str = ""
    source_job_id: Optional[str] = None
    title: str
    company: str
    company_logo_url: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None
    experience_required: Optional[str] = None
    apply_url: Optional[str] = None
    posted_date: Optional[str] = None


class SavedJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    source: str
    source_job_id: Optional[str] = None
    title: str
    company: str
    company_logo_url: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None
    experience_required: Optional[str] = None
    apply_url: Optional[str] = None
    posted_date: Optional[datetime] = None
    saved_at: datetime
