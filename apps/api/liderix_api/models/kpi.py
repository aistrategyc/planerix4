from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from liderix_api.db import Base

class KPI(Base):
    __tablename__ = "kpis"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)  # Название KPI
    target_value = Column(Float, nullable=False)  # Целевое значение
    current_value = Column(Float, nullable=True)  # Текущее значение
    unit = Column(String, default="%")  # Единица измерения (%, $, шт и т.д.)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"))
    project_id = Column(UUID(as_uuid=True), ForeignKey("core.projects.id"))

    owner = relationship("User", back_populates="kpis")
    project = relationship("Project", back_populates="kpis")