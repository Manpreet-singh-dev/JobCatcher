import uuid
from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PreferenceBase(BaseModel):
    desired_titles: Optional[list[str]] = None
    employment_types: Optional[list[str]] = None
    work_modes: Optional[list[str]] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = None
    preferred_locations: Optional[list[str]] = None
    open_to_relocation: Optional[bool] = False
    years_experience_min: Optional[int] = None
    years_experience_max: Optional[int] = None
    primary_skills: Optional[list[str]] = None
    secondary_skills: Optional[list[str]] = None
    industries: Optional[list[str]] = None
    company_sizes: Optional[list[str]] = None
    preferred_companies: Optional[list[str]] = None
    blacklisted_companies: Optional[list[str]] = None
    min_match_score: Optional[int] = Field(default=75, ge=0, le=100)
    max_applications_per_day: Optional[int] = Field(default=5, ge=1, le=50)
    agent_active_hours_start: Optional[time] = None
    agent_active_hours_end: Optional[time] = None
    agent_timezone: Optional[str] = "Asia/Kolkata"
    approval_mode: Optional[str] = Field(
        default="always_ask",
        pattern="^(always_ask|auto_above_threshold|always_auto)$",
    )


class PreferenceCreate(PreferenceBase):
    pass


class PreferenceUpdate(PreferenceBase):
    pass


class PreferenceResponse(PreferenceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    updated_at: datetime
