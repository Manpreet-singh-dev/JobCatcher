import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class AgentStatus(BaseModel):
    is_active: bool
    is_running: bool = False
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    applications_today: int = 0
    max_applications_per_day: int = 5


class AgentLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    event_type: Optional[str] = None
    message: Optional[str] = None
    metadata_: Optional[dict[str, Any]] = None
    created_at: datetime


class AgentLogList(BaseModel):
    items: list[AgentLog]
    total: int
    page: int
    page_size: int
