from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from liderix_api.db import Base

class OKR(Base):
    __tablename__ = "okrs"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    objective = Column(String, nullable=False)  # Название цели
    key_results = Column(Text)  # Список ключевых результатов (можно хранить как текст или JSON)
    period = Column(String, nullable=True)  # Q1, Q2, etc.
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"))
    project_id = Column(UUID(as_uuid=True), ForeignKey("core.projects.id"))

    owner = relationship("User", back_populates="okrs")
    project = relationship("Project", back_populates="okrs")