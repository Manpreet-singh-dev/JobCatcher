import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ParsedResumeData(BaseModel):
    personal_info: Optional[dict[str, Any]] = None
    summary: Optional[str] = None
    experience: Optional[list[dict[str, Any]]] = None
    education: Optional[list[dict[str, Any]]] = None
    skills: Optional[list[str]] = None
    certifications: Optional[list[dict[str, Any]]] = None
    projects: Optional[list[dict[str, Any]]] = None
    languages: Optional[list[str]] = None


class ResumeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    version_name: Optional[str] = None
    is_base: bool = False
    original_filename: Optional[str] = None
    file_path: Optional[str] = None
    parsed_json: Optional[dict[str, Any]] = None
    created_at: datetime


class ResumeUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    version_name: Optional[str] = None
    is_base: bool = False
    original_filename: Optional[str] = None
    file_path: Optional[str] = None
    parsed_json: Optional[dict[str, Any]] = None
    created_at: datetime
    message: str = "Resume uploaded successfully"


class ResumeUpdate(BaseModel):
    version_name: Optional[str] = None
    parsed_json: Optional[dict[str, Any]] = None
