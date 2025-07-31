from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from liderix_api.db import Base

class Project(Base):
    __tablename__ = "projects"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    client_id = Column(UUID(as_uuid=True), ForeignKey("core.clients.id"))
    client = relationship("Client", back_populates="projects")

    tasks = relationship("Task", back_populates="project")
    okrs = relationship("OKR", back_populates="project")
    kpis = relationship("KPI", back_populates="project")