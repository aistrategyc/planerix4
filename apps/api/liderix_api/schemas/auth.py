from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from pydantic import ConfigDict  # для Pydantic v2
from enum import Enum

class UserRole(str, Enum):
    OWNER = "owner"
    TEAMLEAD = "teamlead"
    EMPLOYEE = "employee"

class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"

class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    username: str = Field(..., min_length=1)
    client_id: Optional[UUID] = None  # Оставляем, если присоединяемся к существующему client
    role: UserRole = UserRole.TEAMLEAD  # Новое: роль по умолчанию teamlead
    company_name: Optional[str] = None  # Новое: для owner — название client (компании), обязательно если создаём новый
    position: Optional[str] = None  # Новое: должность, опционально

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    subscription_tier: Optional[SubscriptionTier] = None  # Новое: для показа тарифа на фронте (заполним в роуте)

    model_config = ConfigDict(from_attributes=True)