from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import (
    ConnectEmailOAuthRequest,
    EmailVerifyRequest,
    GoogleAuthRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.auth.service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=dict, status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.register(email=body.email, password=body.password, name=body.name)
    return {
        "user": UserResponse.model_validate(result["user"]),
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": result["token_type"],
        "expires_in": result["expires_in"],
    }


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.login(email=body.email, password=body.password)
    return TokenResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        token_type=result["token_type"],
        expires_in=result["expires_in"],
    )


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.post("/google", response_model=dict)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.google_oauth(code=body.code, redirect_uri=body.redirect_uri)
    return {
        "user": UserResponse.model_validate(result["user"]),
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": result["token_type"],
        "expires_in": result["expires_in"],
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    result = await service.refresh_access_token(refresh_token_str=body.refresh_token)
    return TokenResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        token_type=result["token_type"],
        expires_in=result["expires_in"],
    )


@router.post("/verify-email")
async def verify_email(body: EmailVerifyRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.verify_email(token=body.token)
    return {"message": "Email verified successfully", "user": UserResponse.model_validate(user)}


@router.post("/connect-email-oauth")
async def connect_email_oauth(
    body: ConnectEmailOAuthRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = AuthService(db)
    user = await service.connect_email_oauth(
        user=current_user,
        provider=body.provider,
        code=body.code,
        redirect_uri=body.redirect_uri,
    )
    return {
        "message": f"{body.provider} email connected successfully",
        "user": UserResponse.model_validate(user),
    }
