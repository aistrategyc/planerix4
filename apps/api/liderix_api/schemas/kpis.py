from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class KPIBase(BaseModel):
    name: str
    target_value: float
    current_value: float | None = None
    user_id: UUID | None = None
    project_id: UUID | None = None

class KPICreate(KPIBase):
    pass

class KPIUpdate(BaseModel):  # 🔧 Для обновлений
    name: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    user_id: UUID | None = None
    project_id: UUID | None = None

class KPIRead(KPIBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True  # ✅ Pydantic v2 поддержка ORM