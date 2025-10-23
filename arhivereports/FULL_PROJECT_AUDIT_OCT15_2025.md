# 📋 ПОЛНЫЙ АУДИТ ПРОЕКТА - СПИСОК ДОРАБОТОК
**Дата**: 15 октября 2025
**Статус Production**: ✅ LIVE (app.planerix.com)
**Версия**: 1.0 (Post-Launch)

---

## 🎯 EXECUTIVE SUMMARY

**Цель аудита**: Определить все необходимые доработки для улучшения функциональности, UX, производительности и бизнес-логики платформы Planerix.

**Текущее состояние**:
- ✅ Production запущен и работает
- ✅ 17 аналитических endpoints защищены JWT
- ✅ Система ролей (8 ролей) реализована
- ✅ Calendar API (9 endpoints) работает
- ✅ EventLink система создана
- ✅ Onboarding система с шаблонами

**Приоритизация**:
- 🔴 **CRITICAL** - Блокирует использование продукта
- 🟠 **HIGH** - Критичная бизнес-логика, должна быть в ближайшем релизе
- 🟡 **MEDIUM** - Важные улучшения, можно отложить на 1-2 недели
- 🟢 **LOW** - Nice-to-have, доработки для улучшения UX

---

## 📊 КАТЕГОРИИ ДОРАБОТОК

### 1. [FRONTEND] - User Interface & Experience
### 2. [BACKEND] - API & Business Logic
### 3. [DATABASE] - Schema & Performance
### 4. [INTEGRATION] - Third-party Services
### 5. [DEVOPS] - Infrastructure & Monitoring
### 6. [TESTING] - QA & Automation
### 7. [DOCUMENTATION] - User & Developer Docs

---

## 1️⃣ FRONTEND - USER INTERFACE & EXPERIENCE

### 1.1 🔴 CRITICAL - EventLink UI Missing

**Проблема**: Backend EventLink API готов (6 endpoints), но UI полностью отсутствует. Пользователи не могут линковать задачи к OKR.

**Что нужно доработать**:
1. **Создать компонент `EventLinkManager.tsx`**:
   - Форма для создания линка (task → OKR KR, event → KPI)
   - Список существующих линков с фильтрацией
   - Визуализация весов (weight) и прогресса
   - Bulk operations (создать несколько линков разом)

2. **Интегрировать в Task Detail Page**:
   ```tsx
   // apps/web-enterprise/src/app/tasks/[id]/page.tsx
   <EventLinkSection taskId={task.id} />
   // Показывать: "This task contributes to OKR: [Name]"
   ```

3. **Интегрировать в OKR Detail Page**:
   ```tsx
   // apps/web-enterprise/src/app/okrs/[id]/page.tsx
   <LinkedTasksList okrId={okr.id} />
   // Показывать: "3 tasks linked (auto-update progress)"
   ```

4. **Добавить drag-and-drop линкинг**:
   - Перетаскивание задачи на OKR Key Result
   - Visual feedback (highlight, tooltip)

**Приоритет**: 🔴 CRITICAL
**Время**: 12 часов
**Блокирует**: Ключевой функционал платформы

---

### 1.2 🟠 HIGH - Onboarding Template Selector UI Missing

**Проблема**: Backend поддерживает 4 шаблона (business, marketing, software, sales), но UI для выбора отсутствует в `/onboarding`.

**Что нужно доработать**:
1. **Создать `TemplateSelector.tsx`**:
   ```tsx
   // apps/web-enterprise/src/components/onboarding/TemplateSelector.tsx
   interface Template {
     name: string
     description: string
     icon: LucideIcon
     ideal_for: string
     includes: string[]
   }

   // Красивые карточки для каждого шаблона (4 cards)
   // Hover effects, recommended badges
   ```

2. **Обновить `/onboarding/page.tsx`**:
   - Шаг 1: Выбор шаблона (новый UI)
   - Шаг 2: Название организации
   - Шаг 3: Invite members
   - Показывать loading state при создании sample data

3. **Добавить preview шаблона**:
   - Показывать что будет создано (X projects, Y tasks, Z events)
   - Button "Skip" для empty template

**Приоритет**: 🟠 HIGH
**Время**: 8 часов
**Влияние**: First-time user experience

---

### 1.3 🟠 HIGH - Calendar UI Improvements

**Проблема**: Calendar page работает, но недостает важных UX фич.

**Что нужно доработать**:
1. **Recurrence Support UI**:
   - Selector для RRULE patterns (Daily, Weekly, Monthly)
   - "Repeat every X days/weeks" inputs
   - "End after X occurrences" or "End by date"
   - Display recurrence info in event detail

2. **Event Edit Dialog**:
   - Currently missing - только create + delete
   - Inline editing для event details
   - Change assignee, dates, status

3. **Attendees Management UI**:
   - Add/remove attendees
   - RSVP status badges (accepted, declined, tentative)
   - Send email invites

4. **Linking to Tasks/OKRs UI**:
   - Dropdown "Link to task" (search by name)
   - Show linked entities in event detail
   - "This event is linked to Task: [Name]"

5. **Views Enhancement**:
   - Add Agenda view (list of upcoming events)
   - Add Year view
   - Filter by event type, priority, assignee

**Приоритет**: 🟠 HIGH
**Время**: 16 часов
**Влияние**: Core calendar functionality

---

### 1.4 🟡 MEDIUM - Data Analytics UI/UX Polish

**Проблема**: Analytics page работает (22 endpoints), но UI перегружен и не интуитивен.

**Что нужно доработать**:
1. **Dashboard Reorganization**:
   - Разделить на табы: Overview / Campaigns / Funnel / Attribution
   - Sticky filter bar (date range, platform)
   - Export to PDF/Excel button

2. **Interactive Charts**:
   - Click на campaign → drill-down в детали
   - Hover tooltips с дополнительной информацией
   - Zoom/pan для timeline charts

3. **Smart Insights Panel**:
   - AI-generated recommendations (топ 3 действия)
   - "🔴 Alert: Campaign X CPL increased 50%"
   - "✅ Success: Campaign Y ROAS above target"

4. **Saved Filters & Views**:
   - Save current filter set as "Q4 2025 Performance"
   - Quick access buttons для частых фильтров

5. **Mobile Responsiveness**:
   - Cards stack vertically
   - Charts resize properly
   - Filter collapse на mobile

**Приоритет**: 🟡 MEDIUM
**Время**: 20 часов
**Влияние**: User experience, data discoverability

---

### 1.5 🟡 MEDIUM - OKR Management UI Enhancement

**Проблема**: Базовый CRUD есть, но не хватает визуализации прогресса и управления Key Results.

**Что нужно доработать**:
1. **OKR Progress Visualization**:
   - Progress bars для каждого KR
   - Overall objective progress (weighted average)
   - Color coding (on track / at risk / behind)

2. **Key Results Management**:
   - Inline edit current_value (quick update)
   - Add note/comment при обновлении
   - History timeline (changed from X to Y on date)

3. **OKR Alignment View**:
   - Tree view: Organization → Department → Team → Individual OKRs
   - Show dependencies/relationships

4. **Check-in System**:
   - Weekly check-in reminder
   - Form для update всех KRs разом
   - Comments field для каждого check-in

**Приоритет**: 🟡 MEDIUM
**Время**: 14 часов
**Влияние**: Goal tracking effectiveness

---

### 1.6 🟢 LOW - Tasks Kanban Board

**Проблема**: Tasks отображаются только в table view, нет Kanban.

**Что нужно доработать**:
1. **Kanban Board Component**:
   - Columns: TODO / IN_PROGRESS / IN_REVIEW / DONE
   - Drag-and-drop между колонками
   - Card preview (title, assignee avatar, due date, priority)

2. **Filters & Grouping**:
   - Group by: Assignee, Priority, Project, Due Date
   - Filter by labels, tags

3. **Quick Actions**:
   - Hover на card → Quick edit, Delete, Assign
   - Double click → Open detail modal

**Приоритет**: 🟢 LOW
**Время**: 10 часов
**Влияние**: Task management UX

---

### 1.7 🟢 LOW - Dark Mode Support

**Проблема**: Платформа поддерживает только light mode.

**Что нужно доработать**:
1. **Theme Toggle**:
   - Button в header для переключения
   - Persist выбор в localStorage

2. **Dark Theme Colors**:
   - Update TailwindCSS config с dark: variants
   - Ensure charts/graphs работают в dark mode

3. **System Preference Detection**:
   - Auto-switch based on `prefers-color-scheme`

**Приоритет**: 🟢 LOW
**Время**: 8 часов
**Влияние**: User preference

---

### 1.8 🟢 LOW - Notifications Center

**Проблема**: Нет centralized notifications UI.

**Что нужно доработать**:
1. **Notification Bell Icon**:
   - Badge с количеством непрочитанных
   - Dropdown список notifications

2. **Notification Types**:
   - Task assigned to you
   - OKR check-in reminder
   - Event RSVP response
   - Budget recommendation alert

3. **Mark as read/unread**:
   - Click to mark read
   - "Mark all as read" button

**Приоритет**: 🟢 LOW
**Время**: 6 часов
**Влияние**: User engagement

---

## 2️⃣ BACKEND - API & BUSINESS LOGIC

### 2.1 🔴 CRITICAL - KPI System Enhancement

**Проблема**: Текущая KPI модель упрощена (только name, target_value, current_value). Не хватает:
- Measurement history
- Automated calculations
- Threshold alerts (warn/alarm)
- Multiple measurement sources

**Что нужно доработать**:
1. **Обновить KPI Models**:
   ```python
   # apps/api/liderix_api/models/kpi.py

   class KPIIndicator(Base):
       # ... existing fields
       baseline_value: float
       warn_threshold: float  # Yellow alert
       alarm_threshold: float  # Red alert
       source_type: Enum['manual', 'formula', 'external']
       formula: str  # e.g., "revenue / spend" for ROAS
       kpi_type: Enum['counter', 'gauge', 'percentage']
       period: Enum['daily', 'weekly', 'monthly', 'quarterly']
       aggregation: Enum['sum', 'avg', 'last', 'min', 'max']

   class KPIMeasurement(Base):
       id: UUID
       indicator_id: UUID (FK to KPIIndicator)
       value: float
       measured_at: DateTime
       notes: str
       source: str  # "manual", "api", "formula"
       created_by: UUID (FK to User)
   ```

2. **Создать `/kpis/{id}/measurements` endpoints**:
   - `POST /kpis/{id}/measurements` - Add measurement
   - `GET /kpis/{id}/measurements` - Get history
   - `GET /kpis/{id}/measurements/latest` - Get latest

3. **Auto-update KPI status**:
   - При добавлении measurement → recalculate status
   - `on_track` if >= baseline
   - `at_risk` if < warn_threshold
   - `off_track` if < alarm_threshold

4. **Formula Evaluation**:
   ```python
   def evaluate_formula(formula: str, context: dict) -> float:
       # Safe eval using ast.literal_eval
       # Example: formula = "total_revenue / total_spend"
       # context = {"total_revenue": 100000, "total_spend": 20000}
       # Returns: 5.0 (ROAS)
   ```

5. **Alembic Migration**:
   ```bash
   alembic revision -m "enhance_kpi_system_with_measurements"
   ```

**Приоритет**: 🔴 CRITICAL
**Время**: 12 часов
**Блокирует**: KPI tracking functionality

---

### 2.2 🟠 HIGH - Auto Progress Update for EventLinks

**Проблема**: EventLink создан, но auto_update прогресса OKR/KPI при изменении task не реализован.

**Что нужно доработать**:
1. **Task Update Trigger**:
   ```python
   # apps/api/liderix_api/routes/tasks.py

   @router.patch("/tasks/{task_id}")
   async def update_task(...):
       # ... update task

       # Trigger EventLink progress update
       if task.progress_percentage_changed or task.status_changed:
           await update_linked_targets(task_id, session)
   ```

2. **Progress Calculation Service**:
   ```python
   # apps/api/liderix_api/services/event_links.py

   async def update_linked_targets(
       source_id: UUID,
       source_type: str,  # "task", "event", "project"
       session: AsyncSession
   ):
       # Get all links for this source
       links = await get_event_links(source_id, source_type)

       for link in links:
           if link.auto_update:
               # Calculate weighted contribution
               source_progress = get_source_progress(source_id, source_type)
               weighted_value = source_progress * link.weight

               # Update target (OKR KR or KPI)
               await update_target_value(
                   link.target_id,
                   link.target_type,
                   weighted_value,
                   session
               )
   ```

3. **Aggregation Logic**:
   - Если несколько tasks linked к одному KR → суммировать weighted contributions
   - Если task completion = 100% → mark link as "completed"

4. **Audit Trail**:
   - Log каждое auto-update событие
   - "OKR KR updated from 45% to 58% due to Task X completion"

**Приоритет**: 🟠 HIGH
**Время**: 10 часов
**Влияние**: Core linking functionality

---

### 2.3 🟠 HIGH - Recurrence Service Implementation

**Проблема**: Calendar events поддерживают recurrence_type в schema, но генерация instances не реализована.

**Что нужно доработать**:
1. **Создать RecurrenceService**:
   ```python
   # apps/api/liderix_api/services/recurrence.py

   from dateutil.rrule import rrulestr
   from datetime import datetime, timedelta

   class RecurrenceService:
       @staticmethod
       def generate_instances(
           parent_event: CalendarEvent,
           start_date: datetime,
           end_date: datetime
       ) -> List[CalendarEvent]:
           """
           Generate recurring event instances based on RRULE

           Example:
           - parent_event.recurrence_pattern = "FREQ=WEEKLY;BYDAY=MO,WE,FR"
           - Returns: [event_instance_1, event_instance_2, ...]
           """
           if parent_event.recurrence_type == RecurrenceType.NONE:
               return [parent_event]

           rrule = rrulestr(parent_event.recurrence_pattern, dtstart=parent_event.start_date)
           instances = []

           for dt in rrule.between(start_date, end_date):
               instance = CalendarEvent(
                   id=uuid4(),
                   parent_event_id=parent_event.id,
                   title=parent_event.title,
                   start_date=dt,
                   end_date=dt + (parent_event.end_date - parent_event.start_date),
                   # ... copy other fields
               )
               instances.append(instance)

           return instances
   ```

2. **Интегрировать в `/calendar/events` endpoint**:
   ```python
   @router.get("/calendar/events")
   async def list_events(expand_recurring: bool = False):
       events = await get_events(...)

       if expand_recurring:
           expanded = []
           for event in events:
               if event.recurrence_type != RecurrenceType.NONE:
                   instances = RecurrenceService.generate_instances(
                       event, start_date, end_date
                   )
                   expanded.extend(instances)
               else:
                   expanded.append(event)
           return expanded

       return events
   ```

3. **EXDATE Support**:
   - Поддержка exclusion dates (пропустить конкретные даты)
   - `exdate = ['2025-10-20', '2025-10-27']`

4. **Update/Delete Recurring Events**:
   - "Update this event only" vs "Update all future events"
   - "Delete this occurrence" vs "Delete entire series"

**Приоритет**: 🟠 HIGH
**Время**: 8 часов
**Влияние**: Recurring meetings functionality

---

### 2.4 🟡 MEDIUM - Permission Scoping для Roles

**Проблема**: Роли определены (BU_MANAGER, HOD, TEAM_LEAD), но scoped access не реализован.

**Что нужно доработать**:
1. **Добавить scope fields в Membership**:
   ```python
   # Alembic migration (если еще нет)
   op.add_column('memberships', sa.Column('business_unit_id', UUID, nullable=True))
   op.add_column('memberships', sa.Column('department_id', UUID, nullable=True))
   op.add_column('memberships', sa.Column('team_id', UUID, nullable=True))
   ```

2. **Implement Scoped Access Checks**:
   ```python
   # apps/api/liderix_api/services/permissions.py

   def check_scoped_access(
       user: User,
       membership: Membership,
       resource: Any,
       resource_type: str
   ) -> bool:
       role = membership.role

       if role == MembershipRole.BU_MANAGER:
           # Can only access resources within their BU
           if hasattr(resource, 'business_unit_id'):
               return resource.business_unit_id == membership.business_unit_id

       if role == MembershipRole.HEAD_OF_DEPARTMENT:
           # Can only access resources within their department
           if hasattr(resource, 'department_id'):
               return resource.department_id == membership.department_id

       if role == MembershipRole.TEAM_LEAD:
           # Can only access resources within their team
           if hasattr(resource, 'team_id'):
               return resource.team_id == membership.team_id

       # OWNER and ADMIN have full access
       if role in [MembershipRole.OWNER, MembershipRole.ADMIN]:
           return True

       return False
   ```

3. **Apply to Resource Endpoints**:
   - Filter tasks: only show tasks within user's scope
   - Filter projects: only show projects within BU/department/team
   - Filter OKRs: only show relevant OKRs

**Приоритет**: 🟡 MEDIUM
**Время**: 10 часов
**Влияние**: Enterprise multi-team functionality

---

### 2.5 🟡 MEDIUM - Email Notifications System

**Проблема**: События происходят (task assigned, invitation sent), но email уведомления не отправляются.

**Что нужно доработать**:
1. **Setup Email Service**:
   ```python
   # apps/api/liderix_api/services/mailer.py

   from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

   # Configure SMTP (e.g., SendGrid, AWS SES, Mailgun)
   conf = ConnectionConfig(
       MAIL_USERNAME=settings.MAIL_USERNAME,
       MAIL_PASSWORD=settings.MAIL_PASSWORD,
       MAIL_FROM=settings.MAIL_FROM,
       MAIL_PORT=587,
       MAIL_SERVER="smtp.sendgrid.net",
       MAIL_TLS=True,
       MAIL_SSL=False,
       USE_CREDENTIALS=True
   )

   async def send_email(to: str, subject: str, body: str):
       message = MessageSchema(
           subject=subject,
           recipients=[to],
           body=body,
           subtype="html"
       )
       fm = FastMail(conf)
       await fm.send_message(message)
   ```

2. **Email Templates**:
   - Task assigned: "You have been assigned to task: {task_name}"
   - Invitation: "You've been invited to join {org_name}"
   - OKR check-in reminder: "Time to update your OKRs"
   - Event RSVP: "New event invitation: {event_title}"

3. **Background Tasks**:
   ```python
   from fastapi import BackgroundTasks

   @router.post("/tasks/{task_id}/assign")
   async def assign_task(
       task_id: UUID,
       assignee_id: UUID,
       background_tasks: BackgroundTasks
   ):
       # ... assign task logic

       # Send email in background
       background_tasks.add_task(
           send_email,
           to=assignee.email,
           subject="New Task Assigned",
           body=render_template("task_assigned.html", task=task)
       )
   ```

4. **Email Preferences**:
   - User settings: "Email me when task assigned"
   - Frequency: Immediate, Daily digest, Weekly digest

**Приоритет**: 🟡 MEDIUM
**Время**: 12 часов
**Влияние**: User engagement, notifications

---

### 2.6 🟡 MEDIUM - Rate Limiting & Throttling

**Проблема**: API не имеет rate limiting, уязвим к abuse.

**Что нужно доработать**:
1. **Install slowapi**:
   ```bash
   pip install slowapi
   ```

2. **Configure Rate Limits**:
   ```python
   # apps/api/liderix_api/main.py

   from slowapi import Limiter, _rate_limit_exceeded_handler
   from slowapi.util import get_remote_address
   from slowapi.errors import RateLimitExceeded

   limiter = Limiter(key_func=get_remote_address)
   app.state.limiter = limiter
   app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
   ```

3. **Apply Limits to Endpoints**:
   ```python
   @router.post("/auth/login")
   @limiter.limit("5/minute")  # 5 requests per minute
   async def login(request: Request, ...):
       # ... login logic

   @router.get("/data-analytics/v5/kpi")
   @limiter.limit("100/hour")  # 100 requests per hour
   async def get_kpi(request: Request, ...):
       # ... analytics logic
   ```

4. **Different Limits for Roles**:
   - Free tier: 100 API calls/hour
   - Pro tier: 1000 API calls/hour
   - Enterprise: Unlimited

**Приоритет**: 🟡 MEDIUM
**Время**: 4 часов
**Влияние**: Security, infrastructure protection

---

### 2.7 🟢 LOW - Audit Logging для всех операций

**Проблема**: Частичный audit logging есть (calendar events), но не для всех операций.

**Что нужно доработать**:
1. **Create AuditLog Model**:
   ```python
   class AuditLog(Base):
       id: UUID
       user_id: UUID
       org_id: UUID
       action: str  # "created", "updated", "deleted"
       resource_type: str  # "task", "okr", "project"
       resource_id: UUID
       changes: JSONB  # {"old": {...}, "new": {...}}
       ip_address: str
       user_agent: str
       timestamp: DateTime
   ```

2. **Audit Middleware**:
   ```python
   @app.middleware("http")
   async def audit_middleware(request: Request, call_next):
       response = await call_next(request)

       # Log if mutation endpoint
       if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
           await log_audit_event(
               user=request.state.user,
               action=request.method,
               path=request.url.path,
               ip=request.client.host,
               user_agent=request.headers.get("user-agent")
           )

       return response
   ```

3. **Audit Dashboard**:
   - `/admin/audit-logs` endpoint
   - Filter by user, date range, action type
   - Export to CSV

**Приоритет**: 🟢 LOW
**Время**: 6 часов
**Влияние**: Compliance, security

---

## 3️⃣ DATABASE - SCHEMA & PERFORMANCE

### 3.1 🟠 HIGH - Add Missing Indexes

**Проблема**: Запросы slow, особенно на больших датасетах (calendar events, tasks).

**Что нужно доработать**:
1. **Calendar Indexes**:
   ```sql
   -- Date range queries
   CREATE INDEX ix_calendar_events_date_range
   ON calendar_events USING GIST (tstzrange(start_date, end_date));

   -- User's events
   CREATE INDEX ix_calendar_events_creator_date
   ON calendar_events (creator_id, start_date DESC);

   -- Status filtering
   CREATE INDEX ix_calendar_events_status_date
   ON calendar_events (status, start_date)
   WHERE deleted_at IS NULL;
   ```

2. **Tasks Indexes**:
   ```sql
   -- Assignee tasks
   CREATE INDEX ix_tasks_assignee_status
   ON tasks (assigned_to, status)
   WHERE deleted_at IS NULL;

   -- Project tasks
   CREATE INDEX ix_tasks_project_priority
   ON tasks (project_id, priority DESC);

   -- Due date lookups
   CREATE INDEX ix_tasks_due_date
   ON tasks (due_date)
   WHERE status != 'DONE' AND deleted_at IS NULL;
   ```

3. **EventLink Indexes**:
   ```sql
   -- Source lookups
   CREATE INDEX ix_event_links_task_id
   ON event_links (task_id)
   WHERE task_id IS NOT NULL AND deleted_at IS NULL;

   CREATE INDEX ix_event_links_event_id
   ON event_links (event_id)
   WHERE event_id IS NOT NULL AND deleted_at IS NULL;

   -- Target lookups
   CREATE INDEX ix_event_links_okr_kr_id
   ON event_links (okr_kr_id)
   WHERE okr_kr_id IS NOT NULL AND deleted_at IS NULL;

   -- Weight-based ordering
   CREATE INDEX ix_event_links_weight
   ON event_links (weight DESC)
   WHERE is_active = TRUE;
   ```

4. **KPI Measurements Indexes**:
   ```sql
   -- Time-series queries
   CREATE INDEX ix_kpi_measurements_indicator_time
   ON kpi_measurements (indicator_id, measured_at DESC);

   -- Latest measurement
   CREATE INDEX ix_kpi_measurements_latest
   ON kpi_measurements (indicator_id, measured_at DESC)
   WHERE measured_at IS NOT NULL;
   ```

5. **Alembic Migration**:
   ```bash
   alembic revision -m "add_performance_indexes"
   ```

**Приоритет**: 🟠 HIGH
**Время**: 3 часов
**Влияние**: Query performance (10x-50x faster)

---

### 3.2 🟡 MEDIUM - Database Query Optimization

**Проблема**: N+1 queries в некоторых endpoints (особенно с relationships).

**Что нужно доработать**:
1. **Eager Loading**:
   ```python
   # BAD (N+1 queries)
   tasks = session.query(Task).all()
   for task in tasks:
       print(task.assignee.username)  # Extra query per task

   # GOOD (2 queries total)
   tasks = session.query(Task).options(
       selectinload(Task.assignee)
   ).all()
   for task in tasks:
       print(task.assignee.username)
   ```

2. **Batch Loading**:
   ```python
   # For EventLinks with multiple relationships
   links = await session.execute(
       select(EventLink)
       .options(
           selectinload(EventLink.task),
           selectinload(EventLink.event),
           selectinload(EventLink.okr_key_result),
           selectinload(EventLink.kpi_indicator)
       )
   )
   ```

3. **Pagination Optimization**:
   ```python
   # Add cursor-based pagination для больших datasets
   @router.get("/tasks")
   async def list_tasks(
       cursor: Optional[str] = None,
       limit: int = 50
   ):
       # Instead of OFFSET (slow on large tables)
       if cursor:
           query = query.where(Task.id > cursor)

       tasks = await query.limit(limit).all()
       next_cursor = tasks[-1].id if len(tasks) == limit else None

       return {"items": tasks, "next_cursor": next_cursor}
   ```

**Приоритет**: 🟡 MEDIUM
**Время**: 6 часов
**Влияние**: API response time

---

### 3.3 🟢 LOW - Database Backup & Recovery Strategy

**Проблема**: Production database не имеет automated backups.

**Что нужно доработать**:
1. **Automated Daily Backups**:
   ```bash
   # Cron job на сервере
   # /etc/cron.d/postgres-backup
   0 2 * * * root /opt/scripts/backup_postgres.sh

   # backup_postgres.sh
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/backups/postgres"

   docker exec planerix-postgres-prod pg_dump -U app -d app > \
     $BACKUP_DIR/app_$DATE.sql

   # Compress
   gzip $BACKUP_DIR/app_$DATE.sql

   # Delete backups older than 30 days
   find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
   ```

2. **Offsite Backup**:
   - Upload to S3/Backblaze daily
   - Encryption at rest

3. **Restore Testing**:
   - Monthly restore test на staging environment
   - Document recovery procedures

**Приоритет**: 🟢 LOW
**Время**: 4 часа
**Влияние**: Data protection

---

## 4️⃣ INTEGRATION - THIRD-PARTY SERVICES

### 4.1 🟡 MEDIUM - N8N Workflow Integration

**Проблема**: N8N сервис запущен, но не интегрирован с Planerix API.

**Что нужно доработать**:
1. **Create Webhook Endpoints**:
   ```python
   @router.post("/webhooks/n8n/task-created")
   async def n8n_task_webhook(data: dict):
       # Trigger N8N workflow when task created
       # E.g., send Slack notification, update Google Sheets
   ```

2. **Common Workflows**:
   - Task assigned → Slack notification
   - OKR check-in due → Email reminder
   - Budget exceeded → Alert to CFO
   - New lead → Add to CRM (HubSpot, Salesforce)

3. **N8N Credentials Management**:
   - Store API credentials in N8N_ENCRYPTION_KEY encrypted storage
   - Provide UI для connecting integrations

**Приоритет**: 🟡 MEDIUM
**Время**: 8 часов
**Влияние**: Automation, integrations

---

### 4.2 🟢 LOW - Google Calendar Sync

**Проблема**: Calendar events изолированы в Planerix, no sync с Google Calendar.

**Что нужно доработать**:
1. **Google Calendar API Integration**:
   ```python
   from google.oauth2.credentials import Credentials
   from googleapiclient.discovery import build

   async def sync_to_google_calendar(event: CalendarEvent, user: User):
       creds = Credentials(token=user.google_access_token)
       service = build('calendar', 'v3', credentials=creds)

       google_event = {
           'summary': event.title,
           'description': event.description,
           'start': {'dateTime': event.start_date.isoformat()},
           'end': {'dateTime': event.end_date.isoformat()},
       }

       service.events().insert(calendarId='primary', body=google_event).execute()
   ```

2. **OAuth Flow**:
   - User connects Google account
   - Store access/refresh tokens
   - Two-way sync (Planerix ↔ Google)

**Приоритет**: 🟢 LOW
**Время**: 12 часов
**Влияние**: Calendar integration

---

## 5️⃣ DEVOPS - INFRASTRUCTURE & MONITORING

### 5.1 🟠 HIGH - Application Monitoring (Prometheus + Grafana)

**Проблема**: No metrics, no dashboards, blind to production issues.

**Что нужно доработать**:
1. **Setup Prometheus**:
   ```yaml
   # docker-compose.prod.yml
   prometheus:
     image: prom/prometheus:latest
     volumes:
       - ./prometheus.yml:/etc/prometheus/prometheus.yml
       - prometheus_data:/prometheus
     ports:
       - "9090:9090"
   ```

2. **Instrument FastAPI**:
   ```python
   from prometheus_client import Counter, Histogram, generate_latest

   request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
   request_latency = Histogram('http_request_duration_seconds', 'HTTP request latency')

   @app.middleware("http")
   async def metrics_middleware(request: Request, call_next):
       start_time = time.time()
       response = await call_next(request)
       duration = time.time() - start_time

       request_count.labels(method=request.method, endpoint=request.url.path).inc()
       request_latency.observe(duration)

       return response

   @app.get("/metrics")
   def metrics():
       return Response(generate_latest(), media_type="text/plain")
   ```

3. **Setup Grafana**:
   ```yaml
   grafana:
     image: grafana/grafana:latest
     volumes:
       - grafana_data:/var/lib/grafana
     ports:
       - "3000:3000"
   ```

4. **Create Dashboards**:
   - Request rate (req/sec)
   - Response time (P50, P95, P99)
   - Error rate (4xx, 5xx)
   - Database query time
   - Active users

**Приоритет**: 🟠 HIGH
**Время**: 8 часов
**Влияние**: Production visibility

---

### 5.2 🟡 MEDIUM - Error Tracking (Sentry)

**Проблема**: Errors happen, but not tracked or alerted.

**Что нужно доработать**:
1. **Setup Sentry**:
   ```python
   import sentry_sdk
   from sentry_sdk.integrations.fastapi import FastApiIntegration

   sentry_sdk.init(
       dsn=settings.SENTRY_DSN,
       integrations=[FastApiIntegration()],
       traces_sample_rate=0.1,
       environment="production"
   )
   ```

2. **Custom Error Context**:
   ```python
   with sentry_sdk.push_scope() as scope:
       scope.set_tag("user_id", user.id)
       scope.set_tag("org_id", org.id)
       scope.set_context("request", {
           "path": request.url.path,
           "method": request.method
       })
       # Error будет caught автоматически
   ```

3. **Alert Rules**:
   - Spike в error rate → Slack alert
   - Critical error → Email to on-call engineer

**Приоритет**: 🟡 MEDIUM
**Время**: 4 часа
**Влияние**: Error tracking, faster debugging

---

### 5.3 🟢 LOW - CI/CD Pipeline

**Проблема**: Manual deployment, no automated testing.

**Что нужно доработать**:
1. **GitHub Actions Workflow**:
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to Production

   on:
     push:
       branches: [main]

   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Run Backend Tests
           run: cd apps/api && pytest
         - name: Run Frontend Tests
           run: cd apps/web-enterprise && npm test

     deploy:
       needs: test
       runs-on: ubuntu-latest
       steps:
         - name: SSH to server and deploy
           run: |
             ssh root@65.108.220.33 \
               'cd /opt/MONOREPv3 && \
               git pull && \
               docker-compose -f docker-compose.prod.yml up -d --build'
   ```

2. **Automated Tests**:
   - Unit tests для services
   - Integration tests для API endpoints
   - E2E tests для critical user flows

**Приоритет**: 🟢 LOW
**Время**: 10 часов
**Влияние**: Deployment confidence

---

## 6️⃣ TESTING - QA & AUTOMATION

### 6.1 🟠 HIGH - Backend Unit Tests

**Проблема**: No tests, risky refactoring.

**Что нужно доработать**:
1. **Setup pytest**:
   ```bash
   pip install pytest pytest-asyncio httpx
   ```

2. **Test Structure**:
   ```python
   # apps/api/tests/test_tasks.py

   @pytest.fixture
   async def test_client():
       async with AsyncClient(app=app, base_url="http://test") as client:
           yield client

   @pytest.fixture
   async def test_user(test_db):
       user = User(id=uuid4(), email="test@test.com")
       test_db.add(user)
       await test_db.commit()
       return user

   @pytest.mark.asyncio
   async def test_create_task(test_client, test_user):
       response = await test_client.post(
           "/tasks",
           json={"title": "Test Task", "project_id": str(uuid4())},
           headers={"Authorization": f"Bearer {test_user.access_token}"}
       )
       assert response.status_code == 201
       assert response.json()["title"] == "Test Task"
   ```

3. **Test Coverage Target**:
   - Critical paths: 80% coverage
   - Services: 70% coverage
   - Routes: 60% coverage

**Приоритет**: 🟠 HIGH
**Время**: 20 часов
**Влияние**: Code quality, refactoring safety

---

### 6.2 🟡 MEDIUM - Frontend Unit Tests

**Проблема**: No tests для React components.

**Что нужно доработать**:
1. **Setup Jest + React Testing Library**:
   ```bash
   npm install --save-dev @testing-library/react @testing-library/jest-dom
   ```

2. **Component Tests**:
   ```tsx
   // apps/web-enterprise/src/components/tasks/TaskCard.test.tsx

   import { render, screen } from '@testing-library/react'
   import TaskCard from './TaskCard'

   test('displays task title', () => {
     const task = { id: '1', title: 'Test Task', status: 'TODO' }
     render(<TaskCard task={task} />)
     expect(screen.getByText('Test Task')).toBeInTheDocument()
   })
   ```

3. **Hook Tests**:
   ```tsx
   import { renderHook, waitFor } from '@testing-library/react'
   import { useCalendar } from '@/app/calendar/hooks/useCalendar'

   test('fetches calendar events', async () => {
     const { result } = renderHook(() => useCalendar())
     await waitFor(() => expect(result.current.loading).toBe(false))
     expect(result.current.events.length).toBeGreaterThan(0)
   })
   ```

**Приоритет**: 🟡 MEDIUM
**Время**: 16 часов
**Влияние**: Component stability

---

### 6.3 🟢 LOW - E2E Tests (Playwright)

**Проблема**: No automated browser testing.

**Что нужно доработать**:
1. **Setup Playwright**:
   ```bash
   npm install --save-dev @playwright/test
   ```

2. **Critical Flow Tests**:
   ```typescript
   // e2e/auth.spec.ts

   test('user can login and create task', async ({ page }) => {
     await page.goto('http://localhost:3002/login')
     await page.fill('input[name=email]', 'test@test.com')
     await page.fill('input[name=password]', 'password123')
     await page.click('button[type=submit]')

     await expect(page).toHaveURL('/dashboard')

     await page.click('text=New Task')
     await page.fill('input[name=title]', 'E2E Test Task')
     await page.click('button:has-text("Create")')

     await expect(page.locator('text=E2E Test Task')).toBeVisible()
   })
   ```

**Приоритет**: 🟢 LOW
**Время**: 10 часов
**Влияние**: Regression prevention

---

## 7️⃣ DOCUMENTATION - USER & DEVELOPER

### 7.1 🟠 HIGH - API Documentation Enhancement

**Проблема**: OpenAPI docs exist (`/docs`), but lack examples and descriptions.

**Что нужно доработать**:
1. **Enhanced Docstrings**:
   ```python
   @router.post("/tasks", response_model=TaskRead)
   async def create_task(data: TaskCreate):
       """
       Create a new task

       Creates a new task and assigns it to the specified user.

       **Parameters**:
       - **title**: Task title (required, 1-500 chars)
       - **description**: Detailed description (optional)
       - **project_id**: Project UUID (required)
       - **assigned_to**: User UUID (optional, defaults to creator)
       - **due_date**: ISO datetime (optional)
       - **priority**: low, medium, high, urgent (optional, default: medium)

       **Returns**: Created task with ID and metadata

       **Example**:
       ```json
       {
         "title": "Implement login page",
         "description": "Create React component for user authentication",
         "project_id": "uuid-here",
         "assigned_to": "user-uuid",
         "due_date": "2025-10-20T15:00:00Z",
         "priority": "high"
       }
       ```

       **Errors**:
       - 400: Invalid input (title too long, invalid UUID)
       - 401: Unauthorized (missing token)
       - 404: Project not found
       """
   ```

2. **Request/Response Examples**:
   - Add example values to Pydantic schemas
   ```python
   class TaskCreate(BaseModel):
       title: str = Field(..., example="Implement login page")
       description: Optional[str] = Field(None, example="Create React component...")
       priority: TaskPriority = Field(default=TaskPriority.MEDIUM, example="high")
   ```

**Приоритет**: 🟠 HIGH
**Время**: 8 часов
**Влияние**: Developer experience

---

### 7.2 🟡 MEDIUM - User Guide & Tutorials

**Проблема**: No user-facing documentation.

**Что нужно доработать**:
1. **Getting Started Guide**:
   - "Your First 5 Minutes with Planerix"
   - Create organization → Invite team → Create first project → Add tasks

2. **Feature Guides**:
   - "Setting up OKRs for your team"
   - "Using Calendar for meeting management"
   - "Linking tasks to OKRs for automatic progress tracking"
   - "Understanding Analytics Dashboard"

3. **Video Tutorials**:
   - 2-minute intro video
   - 5-minute feature walkthroughs

4. **Help Center**:
   - `/help` page with searchable articles
   - Embedded tutorials in UI (tooltips, onboarding tours)

**Приоритет**: 🟡 MEDIUM
**Время**: 16 часов
**Влияние**: User onboarding success

---

### 7.3 🟢 LOW - Developer Setup Guide

**Проблема**: README exists, but lacks detailed setup instructions.

**Что нужно доработать**:
1. **Enhanced README.md**:
   - Prerequisites checklist
   - Step-by-step setup (with screenshots)
   - Common errors and solutions
   - Architecture diagrams

2. **CONTRIBUTING.md**:
   - Code style guidelines
   - Git workflow (branches, commits, PRs)
   - Testing requirements

3. **Architecture Documentation**:
   - System architecture diagram
   - Database ERD
   - API flow diagrams

**Приоритет**: 🟢 LOW
**Время**: 6 часов
**Влияние**: Developer onboarding

---

## 📈 PRIORITY MATRIX & ROADMAP

### Sprint 1 (Week 1-2): CRITICAL + HIGH Priority
**Focus**: Core functionality completion

🔴 **CRITICAL** (Must Have):
1. EventLink UI Implementation (12h) - **BLOCKING**
2. KPI System Enhancement (12h) - **BLOCKING**
3. Add Missing Database Indexes (3h) - **PERFORMANCE**

🟠 **HIGH** (Should Have):
4. Onboarding Template Selector UI (8h)
5. Calendar UI Improvements (16h)
6. Auto Progress Update for EventLinks (10h)
7. Recurrence Service Implementation (8h)
8. Application Monitoring Setup (8h)
9. Backend Unit Tests (20h)
10. API Documentation Enhancement (8h)

**Total**: ~105 hours (~2.5 weeks for 1 developer, ~1.5 weeks for 2 developers)

---

### Sprint 2 (Week 3-4): MEDIUM Priority
**Focus**: UX improvements & integrations

🟡 **MEDIUM**:
11. Data Analytics UI/UX Polish (20h)
12. OKR Management UI Enhancement (14h)
13. Permission Scoping for Roles (10h)
14. Email Notifications System (12h)
15. Rate Limiting & Throttling (4h)
16. Database Query Optimization (6h)
17. N8N Workflow Integration (8h)
18. Error Tracking (Sentry) (4h)
19. Frontend Unit Tests (16h)
20. User Guide & Tutorials (16h)

**Total**: ~110 hours (~2.5 weeks)

---

### Sprint 3 (Week 5-6): LOW Priority
**Focus**: Polish, testing, DevOps

🟢 **LOW**:
21. Tasks Kanban Board (10h)
22. Dark Mode Support (8h)
23. Notifications Center (6h)
24. Audit Logging Enhancement (6h)
25. Database Backup Strategy (4h)
26. Google Calendar Sync (12h)
27. CI/CD Pipeline (10h)
28. E2E Tests (Playwright) (10h)
29. Developer Setup Guide (6h)

**Total**: ~72 hours (~2 weeks)

---

## 🎯 ESTIMATED TOTAL EFFORT

**Total Hours**: ~287 hours
**Estimated Timeline**:
- **1 Developer**: ~7-8 weeks (full-time)
- **2 Developers**: ~4-5 weeks (full-time)
- **3 Developers**: ~3 weeks (full-time)

**Recommendation**: Start with Sprint 1 (CRITICAL + HIGH), validate with users, then proceed to Sprint 2.

---

## ✅ ACCEPTANCE CRITERIA

### Sprint 1 Completion Criteria:
- [ ] Users can create EventLinks через UI
- [ ] Tasks автоматически обновляют OKR progress
- [ ] KPI measurements system работает
- [ ] Calendar recurrence работает
- [ ] Onboarding показывает template selector
- [ ] Database queries <200ms (P95)
- [ ] Backend tests coverage >50%
- [ ] Prometheus metrics доступны в /metrics
- [ ] API docs имеют примеры для всех endpoints

### Sprint 2 Completion Criteria:
- [ ] Analytics dashboard имеет табы и filters
- [ ] OKR progress bars визуализированы
- [ ] Email notifications отправляются
- [ ] Rate limiting работает (5 req/min для login)
- [ ] N8N workflows интегрированы
- [ ] Sentry tracking errors
- [ ] Frontend tests coverage >40%

### Sprint 3 Completion Criteria:
- [ ] Kanban board работает с drag-and-drop
- [ ] Dark mode toggle в header
- [ ] Automated backups настроены
- [ ] CI/CD pipeline деплоит на staging
- [ ] E2E tests проходят для critical flows

---

## 📞 NEXT STEPS

1. **Review & Prioritize**: Согласовать приоритеты с бизнесом
2. **Assign Developers**: Распределить задачи между разработчиками
3. **Create Tickets**: Разбить каждую задачу на GitHub Issues/Jira tickets
4. **Start Sprint 1**: Начать с CRITICAL items (EventLink UI, KPI Enhancement)

---

**Документ подготовлен**: 15 октября 2025
**Версия**: 1.0
**Статус**: Ready for Review

