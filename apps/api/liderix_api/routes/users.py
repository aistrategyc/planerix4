from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from liderix_api.models.users import User
from liderix_api.schemas.user import UserRead, UserCreate, UserUpdate
from liderix_api.db import get_async_session
from liderix_api.services.auth import get_current_user  # ✅ Добавляем
from uuid import UUID
from datetime import datetime
from passlib.context import CryptContext

router = APIRouter(prefix="/users", tags=["Users"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🔹 Получить всех пользователей (только для авторизованных)
@router.get("/", response_model=list[UserRead])
async def get_users(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)  # ✅ Авторизация
):
    result = await session.execute(select(User))
    return result.scalars().all()

# 🔹 Получить текущего пользователя
@router.get("/me", response_model=UserRead)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    return current_user

# 🔹 Получить одного пользователя по ID
@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_async_session)):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# 🔹 Создать нового пользователя
@router.post("/", response_model=UserRead)
async def create_user(data: UserCreate, session: AsyncSession = Depends(get_async_session)):
    # 🔒 Проверка уникальности email
    existing_user = await session.execute(select(User).where(User.email == data.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = pwd_context.hash(data.password)
    new_user = User(
        email=data.email,
        username=data.username,
        hashed_password=hashed_pw,
        created_at=datetime.utcnow()
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

# 🔹 Обновить пользователя
@router.put("/{user_id}", response_model=UserRead)
async def update_user(user_id: UUID, data: UserUpdate, session: AsyncSession = Depends(get_async_session)):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(user, field, value)

    await session.commit()
    await session.refresh(user)
    return user

# 🔹 Удалить пользователя
@router.delete("/{user_id}")
async def delete_user(user_id: UUID, session: AsyncSession = Depends(get_async_session)):
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await session.delete(user)
    await session.commit()
    return {"detail": "User deleted"}

