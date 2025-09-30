# apps/api/liderix_api/models/kpi.py
from __future__ import annotations

import uuid
from enum import Enum as PyEnum
from typing import Optional, List

from sqlalchemy import (
    Column, String, Float, Boolean, DateTime, Text, Enum,
    ForeignKey, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship

from liderix_api.db import Base
from .mixins import TimestampMixin, SoftDeleteMixin, OrgFKMixin

class KPIPeriod(PyEnum):
    """Периоды для KPI."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class KPIType(PyEnum):
    """Типы KPI."""
    REVENUE = "revenue"
    PERFORMANCE = "performance"
    QUALITY = "quality"
    EFFICIENCY = "efficiency"
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    CUSTOM = "custom"

class KPIStatus(PyEnum):
    """Статусы KPI."""
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"
    ACHIEVED = "achieved"
    PAUSED = "paused"

class KPI(Base, TimestampMixin, SoftDeleteMixin, OrgFKMixin):
    """
    Расширенная модель ключевого показателя эффективности (KPI).
    """
    __tablename__ = "kpis"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    # Основные поля
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    kpi_type = Column(
        Enum(KPIType, native_enum=False),
        default=KPIType.CUSTOM,
        nullable=False
    )

    # Значения и цели
    current_value = Column(Float, nullable=False, default=0.0)
    target_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=True)  # Базовое значение для сравнения
    unit = Column(String(50), nullable=True)  # Единица измерения (%, $, количество и т.д.)

    # Статус и отслеживание
    status = Column(
        Enum(KPIStatus, native_enum=False),
        default=KPIStatus.ON_TRACK,
        nullable=False
    )
    is_higher_better = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="True если большее значение лучше, False если меньшее"
    )

    # Временные рамки
    period = Column(
        Enum(KPIPeriod, native_enum=False),
        default=KPIPeriod.MONTHLY,
        nullable=False
    )
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    next_review_date = Column(DateTime(timezone=True), nullable=True)

    # Владелец и связи
    owner_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    project_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    objective_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("objectives.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Метаданные
    tags = Column(JSON, nullable=True)  # Массив тегов для категоризации
    formula = Column(Text, nullable=True)  # Формула расчета (если применимо)
    data_source = Column(String(255), nullable=True)  # Источник данных
    automation_config = Column(JSON, nullable=True)  # Конфигурация автообновления

    # Отношения
    owner = relationship(
        "User",
        lazy="selectin",
        back_populates="owned_kpis"
    )
    project = relationship(
        "Project",
        lazy="selectin",
        back_populates="kpis"
    )
    objective = relationship(
        "Objective",
        lazy="selectin"
    )
    measurements = relationship(
        "KPIMeasurement",
        cascade="all, delete-orphan",
        lazy="selectin",
        back_populates="kpi",
        order_by="KPIMeasurement.measured_at.desc()"
    )

    # Индексы для производительности
    __table_args__ = (
        Index('idx_kpi_org_status', 'org_id', 'status'),
        Index('idx_kpi_owner_period', 'owner_id', 'period'),
        Index('idx_kpi_project_type', 'project_id', 'kpi_type'),
        Index('idx_kpi_dates', 'start_date', 'end_date'),
    )

    def __repr__(self) -> str:
        return f"<KPI {self.name}: {self.current_value}/{self.target_value} ({self.unit or 'units'})>"

    @property
    def progress_percentage(self) -> float:
        """Вычисляет процент выполнения KPI с учетом направления улучшения."""
        if self.baseline_value is not None:
            # Используем базовое значение как точку отсчета
            if self.target_value == self.baseline_value:
                return 100.0 if self.current_value == self.target_value else 0.0

            progress = ((self.current_value - self.baseline_value) /
                       (self.target_value - self.baseline_value)) * 100
        else:
            # Простой расчет от нуля
            if self.target_value == 0:
                return 100.0 if self.current_value == 0 else 0.0
            progress = (self.current_value / self.target_value) * 100

        # Учитываем направление улучшения
        if not self.is_higher_better:
            # Для метрик где меньше = лучше (например, время ответа)
            if self.baseline_value is not None:
                progress = ((self.baseline_value - self.current_value) /
                           (self.baseline_value - self.target_value)) * 100
            else:
                progress = (self.target_value / self.current_value) * 100 if self.current_value > 0 else 0

        return max(0.0, min(100.0, progress))

    @property
    def is_achieved(self) -> bool:
        """Проверяет, достигнут ли целевой показатель с учетом направления."""
        if self.is_higher_better:
            return self.current_value >= self.target_value
        else:
            return self.current_value <= self.target_value

    @property
    def variance_percentage(self) -> float:
        """Вычисляет отклонение от цели в процентах."""
        if self.target_value == 0:
            return 0.0
        return ((self.current_value - self.target_value) / self.target_value) * 100

    @property
    def latest_measurement(self) -> Optional['KPIMeasurement']:
        """Возвращает последнее измерение."""
        return self.measurements[0] if self.measurements else None

    def update_status_based_on_progress(self) -> None:
        """Автоматически обновляет статус на основе прогресса."""
        progress = self.progress_percentage

        if self.is_achieved:
            self.status = KPIStatus.ACHIEVED
        elif progress >= 80:
            self.status = KPIStatus.ON_TRACK
        elif progress >= 50:
            self.status = KPIStatus.AT_RISK
        else:
            self.status = KPIStatus.OFF_TRACK


class KPIMeasurement(Base, TimestampMixin):
    """
    Модель для хранения исторических измерений KPI.
    """
    __tablename__ = "kpi_measurements"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    kpi_id = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("kpis.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Измеренное значение
    value = Column(Float, nullable=False)
    measured_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Контекст измерения
    notes = Column(Text, nullable=True)
    data_source = Column(String(255), nullable=True)
    measured_by = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    # Дополнительные метаданные
    metadata = Column(JSON, nullable=True)
    is_automated = Column(Boolean, nullable=False, default=False)
    confidence_level = Column(Float, nullable=True)  # Уровень доверия к измерению

    # Отношения
    kpi = relationship(
        "KPI",
        lazy="selectin",
        back_populates="measurements"
    )
    measured_by_user = relationship(
        "User",
        lazy="selectin"
    )

    # Индексы
    __table_args__ = (
        Index('idx_measurement_kpi_date', 'kpi_id', 'measured_at'),
        Index('idx_measurement_date', 'measured_at'),
    )

    def __repr__(self) -> str:
        return f"<KPIMeasurement {self.value} at {self.measured_at}>"


# Добавляем обратные ссылки в связанные модели (добавится в миграции)
# User.owned_kpis = relationship("KPI", back_populates="owner")
# Project.kpis = relationship("KPI", back_populates="project")