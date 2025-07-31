from sqlalchemy import String, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
import uuid
from liderix_api.db import Base
from enum import Enum as PythonEnum
from .users import UserRole  # Импорт из users, если нужно

class SubscriptionTier(PythonEnum):
    free = "free"
    basic = "basic"
    pro = "pro"

class Client(Base):
    __tablename__ = "clients"
    __table_args__ = {"schema": "core"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)  # Название компании/отдела
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=False)  # Владелец
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(Enum(SubscriptionTier), default=SubscriptionTier.free, nullable=False)  # Тариф
    max_employees: Mapped[int] = mapped_column(default=5)  # Лимит сотрудников
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship("User", back_populates="client")  # Все пользователи в client