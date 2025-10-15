# Planerix Calendar OKR/KPI System - Production Readiness Audit
**Date**: October 15, 2025
**Status**: 🔴 NOT READY FOR PRODUCTION

---

## Executive Summary

Planerix is an ambitious multi-user calendar system with deep OKR/KPI integration. After comprehensive audit of both backend and frontend codebases, **critical gaps** have been identified that prevent production deployment.

### Current Completion Status
- **Calendar Core**: 40% (Models exist, NO backend routes)
- **OKR System**: 75% (Backend complete, frontend basic)
- **KPI System**: 60% (Backend complete, models need enhancement)
- **Tasks Management**: 85% (Backend complete, frontend functional)
- **Projects Management**: 80% (Backend complete, frontend functional)
- **Overall Production Readiness**: **55%**

### Critical Blockers
1. ❌ **NO CALENDAR BACKEND ROUTES** - Calendar models exist but zero API endpoints
2. ❌ **KPI models missing essential fields** (indicators, measurements, bindings)
3. ❌ **No event/task/project linking system** (many-to-many relationships)
4. ❌ **No agents/automation system**
5. ❌ **No test data seeding on registration**
6. ❌ **No RRULE/recurrence support in Calendar**
7. ❌ **Missing Squad/CrossTeam functionality**

---

## 1. Backend Analysis

### 1.1 Database Models - Current State

#### ✅ COMPLETE Models
- **Organization** (`organization.py`) - Full org hierarchy support
- **User** (`users.py`) - Authentication, profiles
- **Membership** (`memberships.py`) - Org membership with roles
- **Task** (`tasks.py`) - Comprehensive task management with comments, attachments, time logs
- **Project** (`projects.py`) - Project management with members
- **Objective/KeyResult** (`okrs.py`) - OKR system models

#### ⚠️ INCOMPLETE Models

**Calendar Models** (`calendar.py`) - 40% Complete
```python
✅ CalendarEvent - has all fields (start_date, end_date, recurrence_type, etc.)
✅ EventAttendee - RSVP support
✅ Calendar - calendar containers
✅ CalendarPermission - sharing permissions

❌ MISSING:
- recurrence_type uses simple RecurrenceType enum (not iCal RRULE)
- No EXDATE support for exclusions
- No linking to OKR/KPI (okr_id exists but no many-to-many)
```

**KPI Models** (`kpi.py`) - 30% Complete
```python
❌ CURRENT MODEL IS TOO SIMPLE:
class KPI(Base):
    id, name, description
    target_value, current_value, unit
    is_active, on_track
    org_id

❌ MISSING REQUIRED MODELS:
- KPIIndicator (target, thresholds, formula, source)
- KPIMeasurement (time series data)
- MetricBinding (external data sources)
- No period/cycle tracking
- No RAG thresholds
```

#### ❌ MISSING Models
- **Squad** (cross-team collaboration)
- **Agent, AgentPolicy, AgentRun, AgentRecommendation**
- **OutboxEvent** (event bus for KPI_BREACH, TASK_OVERDUE)
- **MetricBinding** (n8n integration)
- **EventLink** (universal many-to-many linking)
- **Materialized views** for counters

### 1.2 API Routes Analysis

#### ✅ WORKING Routes
- `/tasks` - COMPLETE (879 lines, full CRUD, comments, stats)
- `/projects` - COMPLETE (786 lines, members, stats)
- `/okrs` - COMPLETE (548 lines, objectives, key results, analytics)
- `/kpis` - EXISTS but needs **major model upgrade** (634 lines)
- `/auth` - Complete authentication
- `/orgs` - Organization management
- `/memberships` - User management

#### ❌ MISSING Routes
```python
# CRITICAL: NO CALENDAR ROUTES AT ALL
/calendar/events - GET/POST/PATCH/DELETE
/calendar/events/{id}/attendees
/calendar/events/{id}/recurrence
/calendar/calendars - Calendar management
/calendar/permissions - Sharing

# MISSING: Linking system
/links - Universal event/task/project ↔ OKR/KPI linking
/links/{id}

# MISSING: Advanced features
/counters/daily - Aggregated metrics
/agents/policies - Agent management
/agents/runs/execute
/events/outbox - Event bus
```

### 1.3 Schema Validation

#### OKR Schemas (`schemas/okrs.py`)
```python
✅ ObjectiveCreate, ObjectiveUpdate, ObjectiveRead
✅ KeyResultCreate, KeyResultUpdate, KeyResultRead
✅ OKRProgressReport, OKRAnalytics
✅ ObjectiveListResponse with pagination
```

#### KPI Schemas (`schemas/kpis.py`)
```python
⚠️ EXISTS but needs expansion:
- KPICreate, KPIUpdate, KPIRead
- KPIMeasurementCreate (needs to be created)
- KPIDashboard, KPIAnalytics
- KPITrendData
```

#### ❌ MISSING Schemas
- `CalendarEventCreate/Update/Read`
- `EventLinkCreate/Read`
- `AgentPolicyCreate/Read`
- `MetricBindingCreate`

---

## 2. Frontend Analysis

### 2.1 Pages - Current State

#### ✅ WORKING Pages
- `/calendar` - **UI COMPLETE** but uses workaround (fetches tasks/okrs separately)
- `/tasks` - Fully functional with filters, creation, updates
- `/okr` - Basic OKR listing and creation
- `/projects` - Project management with members

#### ⚠️ INCOMPLETE Pages
- `/calendar` - Works but **NO real backend**, fakes events from tasks
- `/okr` - Basic functionality, needs KR progress tracking UI
- No KPI dedicated page (uses dashboard cards)

### 2.2 API Clients - Frontend

#### ✅ COMPLETE Clients
```typescript
// apps/web-enterprise/src/lib/api/tasks.ts
TasksAPI.getTasks(filters)
TasksAPI.createTask(data)
TasksAPI.updateTask(id, data)
TasksAPI.deleteTask(id)
TasksAPI.updateTaskStatus(id, status)
TasksAPI.getTaskComments(id)
```

```typescript
// apps/web-enterprise/src/lib/api/okr.ts
OKRsAPI.list()
OKRsAPI.get(id)
OKRsAPI.create(data)
OKRsAPI.update(id, data)
OKRsAPI.delete(id)
```

```typescript
// apps/web-enterprise/src/lib/api/projects.ts
ProjectsAPI similar structure
```

#### ⚠️ WORKAROUND Client
```typescript
// apps/web-enterprise/src/lib/api/calendar.ts
CalendarAPI.getEvents() {
  // ❌ NO /calendar/events endpoint
  // ⚠️ WORKAROUND: Fetches /tasks, /okrs, /projects separately
  // ⚠️ Transforms them into CalendarEvent format
  // ❌ Cannot create real calendar events
}
```

### 2.3 Schema Mismatches (Frontend vs Backend)

#### OKR Schemas
```typescript
// FRONTEND (apps/web-enterprise/src/lib/api/okr.ts)
interface OKR {
  id: string
  title: string
  status: 'draft' | 'active' | 'completed' | 'at_risk' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'  // ❌ NOT IN BACKEND
  owner: string  // ❌ BACKEND has no owner field
  team?: string  // ❌ BACKEND has no team field
  key_results: KeyResult[]
}

// BACKEND (apps/api/liderix_api/models/okrs.py)
class Objective:
    id, title, description
    status: ObjectiveStatus (draft/active/completed/archived)
    start_date, due_date
    org_id  // ❌ NO owner_id, NO team_id, NO priority
```

**FIX REQUIRED**: Align frontend/backend OKR schemas

#### Task Schemas
```typescript
// FRONTEND
interface Task {
  assigned_to: string  // ❌ WRONG
  created_by: string   // ❌ WRONG
}

// BACKEND
class Task:
    assignee_id: UUID  // ✅ CORRECT
    creator_id: UUID   // ✅ CORRECT
```

**FIX REQUIRED**: Frontend uses `assigned_to` but backend has `assignee_id`

---

## 3. Missing Core Features (from Requirements)

### 3.1 Calendar System

#### Required (from promtcalendar):
```
✅ Calendar, CalendarEvent models exist
✅ RRULE/EXDATE fields exist in model
✅ Attendees, permissions

❌ NO BACKEND ROUTES
❌ No recurring event generation logic
❌ No conflict detection
❌ No timezone handling
❌ No working hours / holidays
❌ No focus slots protection
```

### 3.2 OKR/KPI Linking

#### Required:
```
EventLink (universal many-to-many):
  event_id?, task_id?, project_id? → okr_kr_id?, kpi_id?

❌ Model does NOT exist
❌ No routes
❌ Frontend cannot link tasks to OKRs
```

### 3.3 KPI System Enhancements

#### Required:
```python
class KPIIndicator:  # ❌ MISSING
    id, org_id, name, unit
    target_value, warn_threshold, alarm_threshold
    source, formula
    period: KPIPeriod

class KPIMeasurement:  # ❌ MISSING
    id, org_id, indicator_id
    measured_at: datetime
    value: float
    notes: str

class MetricBinding:  # ❌ MISSING
    bound_type, bound_id
    source_kind, connection_name
    sql_text, value_column, ts_column
```

### 3.4 Agents & Automation

#### Required:
```python
class Agent:  # ❌ MISSING
    id, org_id, name, agent_type

class AgentPolicy:  # ❌ MISSING
    scope, condition: jsonb, action: jsonb
    schedule_rrule

class AgentRun:  # ❌ MISSING
    agent_id, event_id, status, result

class AgentRecommendation:  # ❌ MISSING
    agent_run_id, recommendation_text, priority
```

### 3.5 Squads (Cross-Team)

#### Required:
```python
class Squad:  # ❌ MISSING
    id, org_id, name, description

squad_members = Table(  # ❌ MISSING
    'squad_members',
    Column('squad_id', ForeignKey('squads.id')),
    Column('user_id', ForeignKey('users.id')),
    Column('role', String)
)
```

### 3.6 Outbox Pattern (Event Bus)

#### Required:
```python
class OutboxEvent:  # ❌ MISSING
    id, org_id, event_type
    payload: jsonb
    created_at, processed_at

# Event types:
# KPI_BREACH, TASK_OVERDUE, OKR_RISK, DEADLINE_APPROACHING
```

### 3.7 Test Data Seeding

#### Required:
```python
# During user registration:
# 1. Create default calendar
# 2. Create sample OKR with 3 Key Results
# 3. Create 5 sample tasks (different statuses)
# 4. Create 2 sample projects
# 5. Create 3 sample calendar events
# 6. Link tasks to OKR

❌ NO AUTO-SEEDING IMPLEMENTED
```

---

## 4. Critical Fixes Required

### 4.1 Priority 1 (Blocking Issues)

#### 1. Create Calendar Backend Routes
**Files to create:**
- `apps/api/liderix_api/routes/calendar_events.py` (main CRUD)
- `apps/api/liderix_api/routes/calendars.py` (calendar management)
- `apps/api/liderix_api/schemas/calendar.py` (request/response schemas)

**Endpoints needed:**
```python
# calendar_events.py
POST   /calendar/events
GET    /calendar/events
GET    /calendar/events/{id}
PATCH  /calendar/events/{id}
DELETE /calendar/events/{id}

# Support for recurring events
POST   /calendar/events/{id}/instances  # Generate recurrence
GET    /calendar/events/{id}/instances
PATCH  /calendar/events/{id}/instances/{date}  # Update single instance
DELETE /calendar/events/{id}/instances/{date}  # Cancel single instance

# Attendees
GET    /calendar/events/{id}/attendees
POST   /calendar/events/{id}/attendees
PATCH  /calendar/events/{id}/attendees/{user_id}  # RSVP
DELETE /calendar/events/{id}/attendees/{user_id}

# Calendars
GET    /calendar/calendars
POST   /calendar/calendars
GET    /calendar/calendars/{id}
PATCH  /calendar/calendars/{id}
DELETE /calendar/calendars/{id}

# Permissions
GET    /calendar/calendars/{id}/permissions
POST   /calendar/calendars/{id}/permissions
DELETE /calendar/calendars/{id}/permissions/{user_id}
```

#### 2. Enhance KPI Models
**Files to modify:**
- `apps/api/liderix_api/models/kpi.py`

**Changes:**
```python
# Replace simple KPI model with:
class KPIIndicator(Base, OrgFKMixin, TimestampMixin, SoftDeleteMixin):
    """KPI metric definitions"""
    __tablename__ = "kpi_indicators"

    id = Column(PG_UUID, primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    unit = Column(String(50), nullable=True)

    # Targets and thresholds
    target_value = Column(Float, nullable=False)
    baseline_value = Column(Float, nullable=True)
    warn_threshold = Column(Float, nullable=True)   # Yellow
    alarm_threshold = Column(Float, nullable=True)  # Red

    # Data source
    source_type = Column(Enum('manual', 'formula', 'external'), nullable=False)
    formula = Column(Text, nullable=True)  # For calculated KPIs

    # Tracking
    kpi_type = Column(Enum('counter', 'gauge', 'percentage'), nullable=False)
    period = Column(Enum('daily', 'weekly', 'monthly', 'quarterly', 'yearly'), nullable=False)
    aggregation = Column(Enum('sum', 'avg', 'last', 'min', 'max'), nullable=True)

    # Ownership
    owner_id = Column(PG_UUID, ForeignKey("users.id"), nullable=True)
    project_id = Column(PG_UUID, ForeignKey("projects.id"), nullable=True)

    # Current state
    current_value = Column(Float, nullable=True)
    status = Column(Enum('on_track', 'at_risk', 'off_track', 'achieved'), default='on_track')
    last_measured_at = Column(DateTime(timezone=True), nullable=True)
    next_review_date = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    tags = Column(JSONB, nullable=True, default=lambda: [])
    custom_fields = Column(JSONB, nullable=True, default=lambda: {})

    # Relationships
    measurements = relationship("KPIMeasurement", back_populates="indicator", cascade="all, delete-orphan")
    metric_bindings = relationship("MetricBinding", back_populates="indicator", cascade="all, delete-orphan")


class KPIMeasurement(Base, TimestampMixin):
    """Time-series measurements for KPIs"""
    __tablename__ = "kpi_measurements"

    __table_args__ = (
        UniqueConstraint("indicator_id", "measured_at", name="uq_kpi_measurement"),
        Index("ix_kpi_measurement_date", "indicator_id", "measured_at"),
    )

    id = Column(PG_UUID, primary_key=True, default=uuid4)
    indicator_id = Column(PG_UUID, ForeignKey("kpi_indicators.id", ondelete="CASCADE"), nullable=False)

    measured_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    value = Column(Float, nullable=False)

    # Metadata
    notes = Column(Text, nullable=True)
    measured_by = Column(PG_UUID, ForeignKey("users.id"), nullable=True)
    source = Column(String(100), nullable=True)  # manual, auto, import

    # Relationships
    indicator = relationship("KPIIndicator", back_populates="measurements")


class MetricBinding(Base, OrgFKMixin, TimestampMixin):
    """Bind KPIs to external data sources"""
    __tablename__ = "metric_bindings"

    id = Column(PG_UUID, primary_key=True, default=uuid4)
    indicator_id = Column(PG_UUID, ForeignKey("kpi_indicators.id"), nullable=False)

    # Binding target (KR or KPI)
    bound_type = Column(Enum('key_result', 'kpi'), nullable=False)
    bound_id = Column(PG_UUID, nullable=False)

    # Source configuration
    source_kind = Column(String(50), nullable=False)  # 'postgres_view', 'api', 'webhook'
    connection_name = Column(String(100), nullable=True)
    sql_text = Column(Text, nullable=True)
    value_column = Column(String(100), nullable=True)
    ts_column = Column(String(100), nullable=True)

    # Processing
    aggregation = Column(Enum('sum', 'avg', 'last', 'min', 'max'), nullable=True)
    unit = Column(String(50), nullable=True)

    # Relationships
    indicator = relationship("KPIIndicator", back_populates="metric_bindings")
```

**Migration needed:**
```bash
cd apps/api
alembic revision -m "enhance_kpi_system_with_indicators_and_measurements"
alembic upgrade head
```

#### 3. Create Event/Task/OKR Linking System
**Files to create:**
- `apps/api/liderix_api/models/event_links.py`
- `apps/api/liderix_api/routes/links.py`
- `apps/api/liderix_api/schemas/links.py`

**Model:**
```python
class EventLink(Base, OrgFKMixin, TimestampMixin, SoftDeleteMixin):
    """Universal many-to-many linking between calendar events, tasks, projects and goals"""
    __tablename__ = "event_links"

    __table_args__ = (
        Index("ix_event_link_event", "event_id"),
        Index("ix_event_link_task", "task_id"),
        Index("ix_event_link_project", "project_id"),
        Index("ix_event_link_okr", "okr_kr_id"),
        Index("ix_event_link_kpi", "kpi_indicator_id"),
        CheckConstraint(
            "(event_id IS NOT NULL OR task_id IS NOT NULL OR project_id IS NOT NULL) "
            "AND (okr_kr_id IS NOT NULL OR kpi_indicator_id IS NOT NULL)",
            name="chk_link_valid"
        ),
    )

    id = Column(PG_UUID, primary_key=True, default=uuid4)

    # Source (one of these)
    event_id = Column(PG_UUID, ForeignKey("calendar_events.id", ondelete="CASCADE"), nullable=True)
    task_id = Column(PG_UUID, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    project_id = Column(PG_UUID, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)

    # Target (one of these)
    okr_kr_id = Column(PG_UUID, ForeignKey("key_results.id", ondelete="CASCADE"), nullable=True)
    kpi_indicator_id = Column(PG_UUID, ForeignKey("kpi_indicators.id", ondelete="CASCADE"), nullable=True)

    # Weighting (optional for V1)
    weight = Column(Float, nullable=True, default=1.0)
    contribution_pct = Column(Float, nullable=True)

    # Relationships
    event = relationship("CalendarEvent")
    task = relationship("Task")
    project = relationship("Project")
    key_result = relationship("KeyResult")
    kpi_indicator = relationship("KPIIndicator")
```

#### 4. Fix Frontend/Backend Schema Mismatches

**Fix OKR Model - Add Missing Fields:**
```python
# apps/api/liderix_api/models/okrs.py
class Objective(Base, TimestampMixin, SoftDeleteMixin, OrgFKMixin):
    # ... existing fields ...

    # ADD THESE:
    owner_id = Column(PG_UUID, ForeignKey("users.id"), nullable=True, index=True)
    team_id = Column(PG_UUID, ForeignKey("teams.id"), nullable=True, index=True)  # If teams exist
    priority = Column(Enum('low', 'medium', 'high', 'critical'), default='medium', nullable=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
```

**Fix Task API Response:**
```typescript
// apps/web-enterprise/src/lib/api/tasks.ts
export interface Task {
  id: string
  title: string
  assignee_id?: string  // ✅ FIX: was "assigned_to"
  creator_id: string    // ✅ FIX: was "created_by"
  // ... rest
}
```

### 4.2 Priority 2 (Important for MVP)

#### 5. Implement Test Data Seeding
**Files to modify:**
- `apps/api/liderix_api/routes/auth/register.py`

**Add after user creation:**
```python
from liderix_api.services.test_data_seeder import seed_test_data_for_user

async def register_user(...):
    # ... existing user creation ...

    # Seed test data for new user
    if settings.AUTO_SEED_TEST_DATA:  # Add to settings
        await seed_test_data_for_user(session, new_user, organization)

    return {...}
```

**Files to create:**
- `apps/api/liderix_api/services/test_data_seeder.py`

```python
async def seed_test_data_for_user(session: AsyncSession, user: User, org: Organization):
    """Create sample data for newly registered user"""

    # 1. Create default calendar
    calendar = Calendar(
        id=uuid4(),
        name=f"{user.username}'s Calendar",
        owner_id=user.id,
        org_id=org.id,
        is_default=True,
        color="#3174ad"
    )
    session.add(calendar)
    await session.flush()

    # 2. Create sample OKR
    objective = Objective(
        id=uuid4(),
        title="Q4 2025: Launch Product Beta",
        description="Successfully launch beta version to 100 users",
        status=ObjectiveStatus.ACTIVE,
        start_date=datetime(2025, 10, 1, tzinfo=timezone.utc),
        due_date=datetime(2025, 12, 31, tzinfo=timezone.utc),
        owner_id=user.id,
        org_id=org.id
    )
    session.add(objective)
    await session.flush()

    # 3. Create Key Results
    key_results = [
        KeyResult(
            objective_id=objective.id,
            description="Acquire 100 beta testers",
            start_value=0,
            target_value=100,
            current_value=35,
            unit="users"
        ),
        KeyResult(
            objective_id=objective.id,
            description="Achieve 80% user satisfaction",
            start_value=0,
            target_value=80,
            current_value=72,
            unit="%"
        ),
        KeyResult(
            objective_id=objective.id,
            description="Complete 20 user interviews",
            start_value=0,
            target_value=20,
            current_value=8,
            unit="interviews"
        )
    ]
    for kr in key_results:
        session.add(kr)

    # 4. Create sample project
    project = Project(
        id=uuid4(),
        name="Product Beta Development",
        description="Core features for beta release",
        status=ProjectStatus.ACTIVE,
        org_id=org.id,
        start_date=datetime(2025, 10, 1, tzinfo=timezone.utc),
        end_date=datetime(2025, 12, 15, tzinfo=timezone.utc)
    )
    session.add(project)
    await session.flush()

    # 5. Create sample tasks
    tasks = [
        Task(
            title="Design user onboarding flow",
            description="Create mockups and user flow diagrams",
            status=TaskStatus.DONE,
            priority=TaskPriority.HIGH,
            creator_id=user.id,
            assignee_id=user.id,
            project_id=project.id,
            org_id=org.id,
            due_date=datetime(2025, 10, 15, tzinfo=timezone.utc),
            completed_at=datetime(2025, 10, 12, tzinfo=timezone.utc)
        ),
        Task(
            title="Implement authentication system",
            description="JWT-based auth with refresh tokens",
            status=TaskStatus.IN_PROGRESS,
            priority=TaskPriority.URGENT,
            creator_id=user.id,
            assignee_id=user.id,
            project_id=project.id,
            org_id=org.id,
            due_date=datetime(2025, 10, 20, tzinfo=timezone.utc),
            estimated_hours=16,
            actual_hours=10
        ),
        Task(
            title="Write API documentation",
            description="OpenAPI specs for all endpoints",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            creator_id=user.id,
            assignee_id=user.id,
            project_id=project.id,
            org_id=org.id,
            due_date=datetime(2025, 11, 1, tzinfo=timezone.utc)
        ),
        Task(
            title="Setup CI/CD pipeline",
            description="GitHub Actions for automated testing and deployment",
            status=TaskStatus.TODO,
            priority=TaskPriority.HIGH,
            creator_id=user.id,
            project_id=project.id,
            org_id=org.id,
            due_date=datetime(2025, 10, 25, tzinfo=timezone.utc)
        ),
        Task(
            title="Conduct user testing session #1",
            description="5 participants, record feedback",
            status=TaskStatus.TODO,
            priority=TaskPriority.MEDIUM,
            creator_id=user.id,
            assignee_id=user.id,
            project_id=project.id,
            org_id=org.id,
            due_date=datetime(2025, 11, 10, tzinfo=timezone.utc)
        )
    ]
    for task in tasks:
        session.add(task)
    await session.flush()

    # 6. Create sample calendar events
    events = [
        CalendarEvent(
            title="Product Planning Meeting",
            description="Weekly sync with product team",
            event_type=EventType.MEETING,
            status=EventStatus.CONFIRMED,
            start_date=datetime(2025, 10, 18, 10, 0, tzinfo=timezone.utc),
            end_date=datetime(2025, 10, 18, 11, 0, tzinfo=timezone.utc),
            creator_id=user.id,
            org_id=org.id,
            recurrence_type=RecurrenceType.WEEKLY,
            color="#10b981"
        ),
        CalendarEvent(
            title="Beta Launch Deadline",
            description="Target date for beta release",
            event_type=EventType.DEADLINE,
            status=EventStatus.CONFIRMED,
            start_date=datetime(2025, 12, 15, 0, 0, tzinfo=timezone.utc),
            end_date=datetime(2025, 12, 15, 23, 59, tzinfo=timezone.utc),
            is_all_day=True,
            creator_id=user.id,
            org_id=org.id,
            project_id=project.id,
            color="#ef4444"
        ),
        CalendarEvent(
            title="Focus Time: Development",
            description="Deep work session for coding",
            event_type=EventType.FOCUS,
            status=EventStatus.CONFIRMED,
            start_date=datetime(2025, 10, 17, 9, 0, tzinfo=timezone.utc),
            end_date=datetime(2025, 10, 17, 12, 0, tzinfo=timezone.utc),
            creator_id=user.id,
            org_id=org.id,
            is_important=True,
            color="#8b5cf6"
        )
    ]
    for event in events:
        session.add(event)
    await session.flush()

    # 7. Link tasks to Key Result
    link1 = EventLink(
        task_id=tasks[1].id,  # "Implement authentication"
        okr_kr_id=key_results[0].id,  # "100 beta testers"
        org_id=org.id,
        weight=0.3
    )
    link2 = EventLink(
        task_id=tasks[4].id,  # "User testing session"
        okr_kr_id=key_results[1].id,  # "80% satisfaction"
        org_id=org.id,
        weight=0.5
    )
    session.add(link1)
    session.add(link2)

    await session.commit()
```

#### 6. Add RRULE Support
**Files to create:**
- `apps/api/liderix_api/services/recurrence.py`

Use `python-dateutil` library:
```python
from dateutil.rrule import rrulestr
from datetime import datetime, timedelta

class RecurrenceService:
    @staticmethod
    def generate_instances(
        event: CalendarEvent,
        start_range: datetime,
        end_range: datetime
    ) -> list[datetime]:
        """Generate recurring event instances using RRULE"""

        if not event.recurrence_pattern or not event.recurrence_pattern.get('rrule'):
            return []

        rrule_str = event.recurrence_pattern['rrule']
        exdates = event.recurrence_pattern.get('exdates', [])

        # Parse RRULE
        rrule = rrulestr(rrule_str, dtstart=event.start_date)

        # Generate instances
        instances = []
        for dt in rrule.between(start_range, end_range, inc=True):
            if dt.isoformat() not in exdates:
                instances.append(dt)

        return instances
```

### 4.3 Priority 3 (Nice to Have)

#### 7. Add Agents System (Future)
#### 8. Add Squad/CrossTeam (Future)
#### 9. Add Outbox Event Bus (Future)
#### 10. Add n8n Integration (Future)

---

## 5. Development Roadmap

### Phase 1: Critical Fixes (Week 1-2)
**Goal**: Make calendar functional, fix schema mismatches

1. ✅ Create calendar backend routes (3 days)
   - `calendar_events.py` - main CRUD
   - `calendars.py` - calendar management
   - `calendar_schemas.py` - request/response models
   - Test with Postman/curl

2. ✅ Fix frontend/backend schema mismatches (1 day)
   - OKR: Add owner_id, team_id, priority to backend
   - Task: Fix assignee_id/assigned_to naming
   - Update frontend types

3. ✅ Update frontend calendar to use real API (1 day)
   - Remove workaround in `CalendarAPI`
   - Use `/calendar/events` endpoints
   - Test create/update/delete

### Phase 2: KPI Enhancement (Week 3)
**Goal**: Implement proper KPI system

4. ✅ Create enhanced KPI models (2 days)
   - `KPIIndicator`, `KPIMeasurement`, `MetricBinding`
   - Alembic migration
   - Test data migration if needed

5. ✅ Update KPI routes (1 day)
   - Adapt existing `/kpis` routes to new models
   - Add `/kpis/{id}/measurements` endpoints

### Phase 3: Linking & Integration (Week 4)
**Goal**: Connect calendar/tasks to OKRs/KPIs

6. ✅ Create EventLink system (2 days)
   - Model, routes, schemas
   - Frontend UI for linking

7. ✅ Test data seeding (1 day)
   - Implement `seed_test_data_for_user()`
   - Test on new registration

### Phase 4: Polish & Testing (Week 5)
**Goal**: Production-ready deployment

8. ✅ Add RRULE support (2 days)
   - Recurrence service
   - Instance generation
   - Frontend recurrence UI

9. ✅ End-to-end testing (2 days)
   - Test all workflows
   - Fix bugs
   - Performance optimization

10. ✅ Deploy to production (1 day)
    - Update environment variables
    - Run migrations
    - Health checks

---

## 6. Testing Checklist

### 6.1 Backend API Tests

#### Calendar Routes
```bash
# Create calendar
curl -X POST http://localhost:8001/api/calendar/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Standup",
    "start_date": "2025-10-20T09:00:00Z",
    "end_date": "2025-10-20T09:30:00Z",
    "event_type": "meeting",
    "recurrence_type": "daily"
  }'

# List events
curl -X GET "http://localhost:8001/api/calendar/events?start=2025-10-01&end=2025-10-31" \
  -H "Authorization: Bearer $TOKEN"

# Update event
curl -X PATCH http://localhost:8001/api/calendar/events/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Delete event
curl -X DELETE http://localhost:8001/api/calendar/events/{id} \
  -H "Authorization: Bearer $TOKEN"
```

#### Event Linking
```bash
# Link task to OKR Key Result
curl -X POST http://localhost:8001/api/links \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "uuid-here",
    "okr_kr_id": "uuid-here",
    "weight": 0.5
  }'
```

### 6.2 Frontend UI Tests

#### Calendar Page
- [ ] Calendar loads without errors
- [ ] Can create new event
- [ ] Can view event details
- [ ] Can edit event
- [ ] Can delete event
- [ ] Recurring events display correctly
- [ ] Can filter by event type
- [ ] Search works

#### Tasks Page
- [ ] Can link task to OKR
- [ ] Task shows linked OKR badge
- [ ] Task completion updates OKR progress

#### OKR Page
- [ ] Can view linked tasks
- [ ] Progress bar reflects task completion

---

## 7. Environment Variables

### Required for Calendar
```bash
# apps/api/.env
CALENDAR_DEFAULT_TIMEZONE=UTC
CALENDAR_MAX_RECURRENCE_INSTANCES=1000
CALENDAR_WORKING_HOURS_START=09:00
CALENDAR_WORKING_HOURS_END=18:00
```

### Required for Agents (Future)
```bash
AGENTS_ENABLED=false
N8N_WEBHOOK_URL=http://n8n:5678/webhook
```

---

## 8. Database Indexes (Performance)

### Critical Indexes for Calendar
```sql
-- Calendar events by date range
CREATE INDEX ix_calendar_event_date_range ON calendar_events
    USING GIST (tstzrange(start_date, end_date));

-- Events by organization and type
CREATE INDEX ix_calendar_event_org_type ON calendar_events (org_id, event_type, start_date);

-- Recurrence lookups
CREATE INDEX ix_calendar_event_parent ON calendar_events (parent_event_id) WHERE parent_event_id IS NOT NULL;
```

### Critical Indexes for KPI
```sql
-- KPI measurements time-series
CREATE INDEX ix_kpi_measurement_ts ON kpi_measurements (indicator_id, measured_at DESC);

-- Event links
CREATE INDEX ix_event_link_task_okr ON event_links (task_id, okr_kr_id) WHERE task_id IS NOT NULL;
CREATE INDEX ix_event_link_kpi ON event_links (kpi_indicator_id) WHERE kpi_indicator_id IS NOT NULL;
```

---

## 9. Risk Assessment

### High Risk
- **Calendar RRULE complexity**: Recurring events with exceptions are complex
  - **Mitigation**: Use battle-tested `python-dateutil` library

- **Performance with large datasets**: 1000+ events could slow calendar
  - **Mitigation**: Implement pagination, date range filtering, indexes

### Medium Risk
- **KPI measurement ingestion at scale**: n8n could flood the system
  - **Mitigation**: Rate limiting, batch inserts, background jobs

### Low Risk
- **Schema migrations**: Well-tested Alembic process
- **Frontend state management**: React hooks sufficient for MVP

---

## 10. Success Metrics

### MVP Success Criteria
- [ ] User can register and see test data immediately
- [ ] User can create calendar events
- [ ] User can create tasks and link to OKRs
- [ ] User can view OKR progress based on linked tasks
- [ ] User can create KPIs and add measurements
- [ ] Calendar shows events from tasks, projects, OKRs
- [ ] All CRUD operations work without errors
- [ ] Page load time < 2 seconds
- [ ] API response time P95 < 300ms

---

## Conclusion

Planerix has a **solid foundation** but requires **critical calendar routes implementation** and **KPI model enhancement** before production deployment.

**Estimated time to production**: 4-5 weeks with dedicated development.

**Next immediate action**: Implement calendar backend routes (Priority 1, Item 1).

---

**Document Version**: 1.0
**Last Updated**: October 15, 2025
**Next Review**: October 22, 2025
