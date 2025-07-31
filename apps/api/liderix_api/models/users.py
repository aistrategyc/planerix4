from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
import uuid
from liderix_api.db import Base
from enum import Enum as PythonEnum  # Для Python enum

class UserRole(PythonEnum):
    owner = "owner"
    teamlead = "teamlead"
    employee = "employee"

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, index=True, nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    client_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("core.clients.id"))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.teamlead, nullable=False)  # Новое: роль
    position: Mapped[str | None] = mapped_column(String, nullable=True)  # Новое: должность

    client: Mapped["Client"] = relationship("Client", back_populates="users")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="assignee")
    okrs: Mapped[list["OKR"]] = relationship("OKR", back_populates="owner")
    kpis: Mapped[list["KPI"]] = relationship("KPI", back_populates="owner")