from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class OKRBase(BaseModel):
    title: str
    description: str | None = None
    user_id: UUID | None = None
    project_id: UUID | None = None

class OKRCreate(OKRBase):
    pass

class OKRUpdate(BaseModel):  # 🔧 Для PATCH/PUT
    title: str | None = None
    description: str | None = None
    user_id: UUID | None = None
    project_id: UUID | None = None

class OKRRead(OKRBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ Pydantic v2