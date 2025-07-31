from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from liderix_api.models.users import User
from liderix_api.services.auth import verify_password, create_access_token
from liderix_api.schemas.auth import LoginRequest, TokenResponse
from liderix_api.db import get_async_session

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_async_session)):
    query = select(User).where(User.email == data.email)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)