# Упрощённая KPI модель, соответствующая текущей структуре БД
from uuid import uuid4
from sqlalchemy import Column, String, Float, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from liderix_api.db import Base
from .mixins import TimestampMixin, SoftDeleteMixin

class KPI(Base, TimestampMixin, SoftDeleteMixin):
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

    # Мягкое удаление осуществляется SoftDeleteMixin

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