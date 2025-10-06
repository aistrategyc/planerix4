# apps/api/liderix_api/schemas/kpis.py
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict, computed_field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum as PythonEnum

# ==================== ENUMS ====================

class KPIPeriod(PythonEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class KPIType(PythonEnum):
    REVENUE = "revenue"
    PERFORMANCE = "performance"
    QUALITY = "quality"
    EFFICIENCY = "efficiency"
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    CUSTOM = "custom"

class KPIStatus(PythonEnum):
    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    OFF_TRACK = "off_track"
    ACHIEVED = "achieved"
    PAUSED = "paused"

# ==================== KPI MEASUREMENT SCHEMAS ====================

class KPIMeasurementBase(BaseModel):
    value: float
    measured_at: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = None
    data_source: Optional[str] = None
    confidence_level: Optional[float] = Field(None, ge=0.0, le=1.0)
    meta_data: Optional[Dict[str, Any]] = None
    is_automated: bool = False

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KPIMeasurementCreate(KPIMeasurementBase):
    pass

class KPIMeasurementUpdate(BaseModel):
    value: Optional[float] = None
    measured_at: Optional[datetime] = None
    notes: Optional[str] = None
    data_source: Optional[str] = None
    confidence_level: Optional[float] = Field(None, ge=0.0, le=1.0)
    meta_data: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KPIMeasurementRead(KPIMeasurementBase):
    id: UUID
    kpi_id: UUID
    measured_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")

# ==================== KPI SCHEMAS ====================

class KPIBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    kpi_type: KPIType = KPIType.CUSTOM
    target_value: float
    current_value: float = 0.0
    baseline_value: Optional[float] = None
    unit: Optional[str] = Field(None, max_length=50)
    status: KPIStatus = KPIStatus.ON_TRACK
    is_higher_better: bool = True
    period: KPIPeriod = KPIPeriod.MONTHLY
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    next_review_date: Optional[datetime] = None
    owner_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    objective_id: Optional[UUID] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    formula: Optional[str] = None
    data_source: Optional[str] = None
    automation_config: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KPICreate(KPIBase):
    initial_measurements: Optional[List[KPIMeasurementCreate]] = Field(default_factory=list)

class KPIUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    kpi_type: Optional[KPIType] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    baseline_value: Optional[float] = None
    unit: Optional[str] = Field(None, max_length=50)
    status: Optional[KPIStatus] = None
    is_higher_better: Optional[bool] = None
    period: Optional[KPIPeriod] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    next_review_date: Optional[datetime] = None
    owner_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    objective_id: Optional[UUID] = None
    tags: Optional[List[str]] = None
    formula: Optional[str] = None
    data_source: Optional[str] = None
    automation_config: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KPIRead(KPIBase):
    id: UUID
    org_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    measurements: List[KPIMeasurementRead] = Field(default_factory=list)

    @computed_field
    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage based on current, baseline and target values."""
        if self.baseline_value is not None:
            if self.target_value == self.baseline_value:
                return 100.0 if self.current_value == self.target_value else 0.0
            progress = ((self.current_value - self.baseline_value) /
                       (self.target_value - self.baseline_value)) * 100
        else:
            if self.target_value == 0:
                return 100.0 if self.current_value == 0 else 0.0
            progress = (self.current_value / self.target_value) * 100

        if not self.is_higher_better:
            if self.baseline_value is not None:
                progress = ((self.baseline_value - self.current_value) /
                           (self.baseline_value - self.target_value)) * 100
            else:
                progress = (self.target_value / self.current_value) * 100 if self.current_value > 0 else 0

        return max(0.0, min(100.0, progress))

    @computed_field
    @property
    def is_achieved(self) -> bool:
        """Check if target is achieved considering direction."""
        if self.is_higher_better:
            return self.current_value >= self.target_value
        else:
            return self.current_value <= self.target_value

    @computed_field
    @property
    def variance_percentage(self) -> float:
        """Calculate variance from target in percentage."""
        if self.target_value == 0:
            return 0.0
        return ((self.current_value - self.target_value) / self.target_value) * 100

    @computed_field
    @property
    def days_until_review(self) -> Optional[int]:
        """Days until next review."""
        if not self.next_review_date:
            return None
        delta = self.next_review_date - datetime.now()
        return delta.days if delta.days >= 0 else 0

    @computed_field
    @property
    def latest_measurement(self) -> Optional[KPIMeasurementRead]:
        """Get the latest measurement."""
        return self.measurements[0] if self.measurements else None

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class KPIListResponse(BaseModel):
    items: List[KPIRead]
    total: int
    page: int
    page_size: int
    filters_applied: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True, extra="forbid")

# ==================== ANALYTICS SCHEMAS ====================

class KPIDashboard(BaseModel):
    organization_id: UUID
    total_kpis: int
    kpis_by_status: Dict[str, int]
    kpis_by_type: Dict[str, int]
    average_achievement_rate: float
    on_track_percentage: float
    overdue_reviews: int
    top_performers: List[KPIRead] = Field(max_items=10)
    underperformers: List[KPIRead] = Field(max_items=10)
    recent_achievements: List[KPIRead] = Field(max_items=5)

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class KPITrendData(BaseModel):
    kpi_id: UUID
    kpi_name: str
    data_points: List[Dict[str, Any]]  # [{date, value, target}, ...]
    trend_direction: str  # "up", "down", "stable"
    trend_percentage: float
    period_comparison: Dict[str, float]  # {"vs_last_period": 5.2, "vs_last_year": 15.8}

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class KPIAnalytics(BaseModel):
    period_start: datetime
    period_end: datetime
    summary_stats: Dict[str, float]
    performance_trends: List[KPITrendData]
    correlation_insights: List[Dict[str, Any]]
    recommendations: List[str]
    risk_factors: List[Dict[str, Any]]

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class KPIBulkUpdateRequest(BaseModel):
    kpi_ids: List[UUID] = Field(min_items=1, max_items=100)
    updates: KPIUpdate

    model_config = ConfigDict(extra="forbid")

class KPIBulkMeasurementRequest(BaseModel):
    measurements: List[Dict[str, Any]] = Field(min_items=1, max_items=500)
    # Format: [{"kpi_id": UUID, "value": float, "measured_at": datetime, ...}, ...]

    model_config = ConfigDict(extra="forbid")

# ==================== LEGACY COMPATIBILITY ====================

# Keep old enum names for backward compatibility
class KPIPeriodLegacy(PythonEnum):
    day = "day"
    week = "week"
    month = "month"
    quarter = "quarter"
    year = "year"

class KPIStatusLegacy(PythonEnum):
    on_track = "on_track"
    off_track = "off_track"
    unknown = "unknown"

# Legacy schemas for backward compatibility
class KPIBaseLegacy(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    target_value: float = Field(ge=0)
    current_value: Optional[float] = Field(None, ge=0)
    period: KPIPeriodLegacy = KPIPeriodLegacy.month
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    status: KPIStatusLegacy = KPIStatusLegacy.unknown
    tags: Optional[List[str]] = None
    owner_id: Optional[UUID] = None
    org_id: Optional[UUID] = None
    project_id: Optional[UUID] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KPICreateLegacy(KPIBaseLegacy):
    pass

class KPIUpdateLegacy(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    target_value: Optional[float] = Field(None, ge=0)
    current_value: Optional[float] = Field(None, ge=0)
    period: Optional[KPIPeriodLegacy] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    status: Optional[KPIStatusLegacy] = None
    tags: Optional[List[str]] = None
    owner_id: Optional[UUID] = None
    org_id: Optional[UUID] = None
    project_id: Optional[UUID] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class KPIReadLegacy(KPIBaseLegacy):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")

class KPIListResponseLegacy(BaseModel):
    items: List[KPIReadLegacy]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(from_attributes=True, extra="forbid")