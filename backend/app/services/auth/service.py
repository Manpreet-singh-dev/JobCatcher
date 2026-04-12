import uuid
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)
from app.models.user import User
from app.models.user_preference import UserPreference


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, email: str, password: str, name: str | None = None) -> dict:
        result = await self.db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name,
            email_verified=False,
            agent_active=True,
        )
        self.db.add(user)
        await self.db.flush()

        preference = UserPreference(user_id=user.id)
        self.db.add(preference)
        await self.db.flush()

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def login(self, email: str, password: str) -> dict:
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def google_oauth(self, code: str, redirect_uri: str) -> dict:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange Google authorization code",
                )

            token_data = token_response.json()

            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch Google user info",
                )

            google_user = userinfo_response.json()

        email = google_user["email"]
        name = google_user.get("name")

        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.google_oauth_token = token_data
            user.email_verified = True
            if name and not user.name:
                user.name = name
        else:
            user = User(
                email=email,
                name=name,
                google_oauth_token=token_data,
                email_verified=True,
                agent_active=True,
            )
            self.db.add(user)
            await self.db.flush()

            preference = UserPreference(user_id=user.id)
            self.db.add(preference)

        await self.db.flush()

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def refresh_access_token(self, refresh_token_str: str) -> dict:
        payload = verify_token(refresh_token_str)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        user_id = payload.get("sub")
        result = await self.db.execute(
            select(User).where(User.id == uuid.UUID(user_id))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        access_token = create_access_token(str(user.id))
        new_refresh_token = create_refresh_token(str(user.id))

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def verify_email(self, token: str) -> User:
        payload = verify_token(token)
        if payload.get("type") != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email verification token",
            )

        user_id = payload.get("sub")
        result = await self.db.execute(
            select(User).where(User.id == uuid.UUID(user_id))
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        user.email_verified = True
        await self.db.flush()
        return user

    async def connect_email_oauth(
        self, user: User, provider: str, code: str, redirect_uri: str
    ) -> User:
        if provider == "gmail":
            token_data = await self._exchange_google_email_token(code, redirect_uri)
        elif provider == "outlook":
            token_data = await self._exchange_outlook_email_token(code, redirect_uri)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported email provider: {provider}",
            )

        user.email_oauth_token = {
            "provider": provider,
            **token_data,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.db.flush()
        return user

    async def _exchange_google_email_token(
        self, code: str, redirect_uri: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                    "scope": "https://www.googleapis.com/auth/gmail.send",
                },
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to connect Gmail account",
                )
            return response.json()

    async def _exchange_outlook_email_token(
        self, code: str, redirect_uri: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                    "scope": "https://graph.microsoft.com/Mail.Send",
                },
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to connect Outlook account",
                )
            return response.json()
