from uuid import UUID
from datetime import datetime
from pydantic import BaseModel

class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    client_id: UUID

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):  # 🧩 Добавляем вот этот класс
    pass

class ProjectRead(ProjectBase):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True