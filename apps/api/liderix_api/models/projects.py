from __future__ import annotations
import uuid
from enum import Enum as PythonEnum
from sqlalchemy import Column, String, Text, Enum as SQLEnum, DateTime, ForeignKey, Index, Integer, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from liderix_api.db import Base
from liderix_api.enums import ProjectStatus, MembershipRole
from .mixins import TimestampMixin, SoftDeleteMixin, OrgFKMixin
# Using centralized enums from liderix_api.enums
class Project(Base, OrgFKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"
    __table_args__ = (
        Index("ix_project_metadata_gin", "metadata", postgresql_using="gin"),
        {"extend_existing": True})
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False)
    meta_data = Column("metadata", JSONB, nullable=True, default=lambda: {})
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False, index=True)
    organization = relationship("Organization", lazy="selectin", overlaps="projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan", lazy="selectin", overlaps="project,members")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan", lazy="selectin", overlaps="project,tasks")
    __mapper_args__ = {"eager_defaults": True}

