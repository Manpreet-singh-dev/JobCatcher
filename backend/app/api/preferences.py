from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.preference import PreferenceResponse, PreferenceUpdate

router = APIRouter(prefix="/api/preferences", tags=["preferences"])


@router.get("", response_model=PreferenceResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preference = result.scalar_one_or_none()
    if not preference:
        preference = UserPreference(user_id=current_user.id)
        db.add(preference)
        await db.flush()
        await db.refresh(preference)

    return PreferenceResponse.model_validate(preference)


@router.put("", response_model=PreferenceResponse)
async def update_preferences(
    body: PreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    preference = result.scalar_one_or_none()

    if not preference:
        preference = UserPreference(user_id=current_user.id)
        db.add(preference)
        await db.flush()

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    for field, value in update_data.items():
        setattr(preference, field, value)

    await db.flush()
    await db.refresh(preference)
    return PreferenceResponse.model_validate(preference)
