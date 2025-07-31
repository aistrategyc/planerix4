from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import uuid4
from datetime import datetime

from liderix_api.models.users import User
from liderix_api.services.auth import hash_password, create_access_token
from liderix_api.schemas.auth import RegisterSchema, TokenResponse
from liderix_api.db import get_async_session

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterSchema, session: AsyncSession = Depends(get_async_session)):
    result = await session.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if not data.username or not data.username.strip():
        raise HTTPException(status_code=422, detail="Username is required")

    user = User(
        id=uuid4(),
        username=data.username.strip(),
        email=data.email,
        hashed_password=hash_password(data.password),
        client_id=data.client_id,
        created_at=datetime.utcnow()
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)