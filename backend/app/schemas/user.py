import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    agent_active: Optional[bool] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: Optional[str] = None
    email_verified: bool = False
    agent_active: bool = True
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class EmailVerifyRequest(BaseModel):
    token: str


class ConnectEmailOAuthRequest(BaseModel):
    provider: str = Field(..., pattern="^(gmail|outlook)$")
    code: str
    redirect_uri: str
