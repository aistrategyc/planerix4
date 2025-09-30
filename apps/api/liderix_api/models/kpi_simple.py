# Упрощённая KPI модель, соответствующая текущей структуре БД
from uuid import uuid4
from sqlalchemy import Column, String, Float, Boolean, DateTime, UUID as PG_UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from liderix_api.models.base import Base, TimestampMixin

class KPI(Base, TimestampMixin):
    """
    Упрощённая модель KPI, соответствующая текущей структуре БД.
    """
    __tablename__ = "kpis"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True
    )

    # Базовые поля (соответствуют БД)
    name = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    target_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    on_track = Column(Boolean, nullable=False, default=True)

    # Связи
    org_id = Column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True
    )

    # Мягкое удаление
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<KPI {self.name}: {self.current_value}/{self.target_value}>"

    @property
    def progress(self) -> float:
        """Прогресс в процентах"""
        if self.target_value == 0:
            return 0.0
        return (self.current_value / self.target_value) * 100.0

    @property
    def completion_rate(self) -> float:
        """Коэффициент выполнения"""
        if self.target_value == 0:
            return 0.0
        return self.current_value / self.target_value