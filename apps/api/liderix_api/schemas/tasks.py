from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class TaskBase(BaseModel):
    title: str
    description: str | None = None
    status: str
    priority: int
    project_id: UUID
    user_id: UUID

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):  # 🔧 добавлен для PATCH/PUT операций
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: int | None = None
    project_id: UUID | None = None
    user_id: UUID | None = None

class TaskRead(TaskBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ pydantic v2 совместимость