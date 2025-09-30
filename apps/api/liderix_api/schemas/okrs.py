# apps/api/liderix_api/schemas/okrs.py
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict, computed_field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum as PythonEnum

# ==================== ENUMS ====================

class ObjectiveStatus(PythonEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"

# ==================== KEY RESULT SCHEMAS ====================

class KeyResultBase(BaseModel):
    description: str = Field(min_length=1, max_length=255)
    start_value: float = Field(default=0.0)
    target_value: float = Field(gt=0)
    current_value: float = Field(default=0.0)
    unit: Optional[str] = Field(None, max_length=50)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KeyResultCreate(KeyResultBase):
    pass

class KeyResultUpdate(BaseModel):
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    start_value: Optional[float] = None
    target_value: Optional[float] = Field(None, gt=0)
    current_value: Optional[float] = None
    unit: Optional[str] = Field(None, max_length=50)

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KeyResultRead(KeyResultBase):
    id: UUID
    objective_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    @computed_field
    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage based on current, start and target values."""
        if self.target_value == self.start_value:
            return 100.0 if self.current_value >= self.target_value else 0.0

        progress = ((self.current_value - self.start_value) /
                   (self.target_value - self.start_value)) * 100
        return max(0.0, min(100.0, progress))

    model_config = ConfigDict(from_attributes=True, extra="forbid")

# ==================== OBJECTIVE SCHEMAS ====================

class ObjectiveBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    status: ObjectiveStatus = ObjectiveStatus.DRAFT
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class ObjectiveCreate(ObjectiveBase):
    key_results: Optional[List[KeyResultCreate]] = Field(default_factory=list)

class ObjectiveUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ObjectiveStatus] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class ObjectiveRead(ObjectiveBase):
    id: UUID
    org_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    key_results: List[KeyResultRead] = Field(default_factory=list)

    @computed_field
    @property
    def overall_progress(self) -> float:
        """Calculate overall progress based on key results."""
        if not self.key_results:
            return 0.0

        total_progress = sum(kr.progress_percentage for kr in self.key_results)
        return total_progress / len(self.key_results)

    @computed_field
    @property
    def completed_key_results(self) -> int:
        """Count of completed key results (100% progress)."""
        return sum(1 for kr in self.key_results if kr.progress_percentage >= 100.0)

    @computed_field
    @property
    def is_overdue(self) -> bool:
        """Check if objective is overdue."""
        if not self.due_date:
            return False
        return datetime.now() > self.due_date and self.status != ObjectiveStatus.COMPLETED

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class ObjectiveListResponse(BaseModel):
    items: List[ObjectiveRead]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True, extra="forbid")

# ==================== ANALYTICS SCHEMAS ====================

class OKRProgressReport(BaseModel):
    organization_id: UUID
    period_start: datetime
    period_end: datetime
    total_objectives: int
    active_objectives: int
    completed_objectives: int
    overdue_objectives: int
    average_progress: float
    completion_rate: float
    objectives_by_status: Dict[str, int]
    top_performers: List[ObjectiveRead] = Field(max_items=10)
    at_risk_objectives: List[ObjectiveRead] = Field(max_items=10)

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class OKRAnalytics(BaseModel):
    total_objectives: int
    objectives_by_status: Dict[str, int]
    average_completion_rate: float
    key_results_stats: Dict[str, Any]
    monthly_trends: List[Dict[str, Any]]
    performance_insights: List[str]

    model_config = ConfigDict(from_attributes=True, extra="forbid")

# ==================== LEGACY COMPATIBILITY ====================

# Keep old schemas for backward compatibility
class OKRTimeframe(PythonEnum):
    q = "q"
    h1 = "h1"
    h2 = "h2"
    y = "y"

class OKRStatus(PythonEnum):
    draft = "draft"
    active = "active"
    done = "done"
    canceled = "canceled"

class OKRBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    timeframe: OKRTimeframe = OKRTimeframe.q
    status: OKRStatus = OKRStatus.draft
    owner_id: Optional[UUID] = None
    project_id: Optional[UUID] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class OKRCreate(OKRBase):
    pass

class OKRUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    timeframe: Optional[OKRTimeframe] = None
    status: Optional[OKRStatus] = None
    owner_id: Optional[UUID] = None
    project_id: Optional[UUID] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class OKRRead(OKRBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class OKRListResponse(BaseModel):
    items: List[OKRRead]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True, extra="forbid")