from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from liderix_api.db import Base

class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = {"schema": "core"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project_id = Column(UUID(as_uuid=True), ForeignKey("core.projects.id"))
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"))

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")