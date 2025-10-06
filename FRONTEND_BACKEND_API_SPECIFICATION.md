# Frontend-Backend API Specification

## Обзор

Этот документ определяет единую спецификацию API между фронтендом (Next.js) и бекендом (FastAPI) для предотвращения расхождений в моделях и вызовах.

**Обновлено:** 6 октября 2025
**Статус:** ✅ Актуально и проверено

## Базовые конфигурации

### URL и префиксы

```bash
# Backend URL
http://localhost:8001/api

# Frontend URL
http://localhost:3002

# API префикс
/api

# ВАЖНО: Все backend endpoints начинаются с /api/
# NEXT_PUBLIC_API_URL уже содержит /api суффикс
```

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Правильная конфигурация API URL

**Правильная настройка (исправлено 6 октября 2025):**

```bash
# В .env и docker-compose
NEXT_PUBLIC_API_URL=http://localhost:8001/api  # ✅ УЖЕ С /api

# В коде используем без дополнительного /api
fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`)  # ✅ Правильно
# Результат: http://localhost:8001/api/auth/login

# НЕ ДЕЛАЙТЕ ТАК:
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`)  # ❌ Неправильно
# Результат: http://localhost:8001/api/api/auth/login (404 ошибка)
```

**Файлы с правильной конфигурацией:**
- ✅ `apps/web-enterprise/src/contexts/auth-context.tsx` - все fetch URL БЕЗ `/api` префикса
- ✅ `apps/web-enterprise/.dockerignore` - добавлен `.env.production`
- ✅ Корневой `.env` - `NEXT_PUBLIC_API_URL=http://localhost:8001/api`
- ✅ `apps/api/liderix_api/config/settings.py` - CORS с конкретными origins

### Аутентификация

```bash
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/users/me
POST /api/auth/resend-verification
```

**Структура токена:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900,
  "refresh_expires_in": null,
  "user": null
}
```

**Заголовки авторизации:**
```
Authorization: Bearer <access_token>
```

## Основные endpoints

### 1. Пользователи

| Endpoint | Метод | Описание | Frontend API |
|----------|-------|----------|--------------|
| `/api/users/me` | GET | Текущий пользователь | `getCurrentUser()` |
| `/api/users/me` | PATCH | Обновить профиль | `updateUserProfile(updates)` |
| `/api/users/me/stats` | GET | Статистика пользователя | `getUserStats(userId)` |
| `/api/users/search` | GET | Поиск пользователей | `searchUsers(query)` |
| `/api/users/` | GET | Список пользователей | `listUsers(search, page, perPage)` |

**Модель пользователя:**
```typescript
interface UserProfile {
  id: string
  email: string
  username: string
  avatar_url?: string
  is_active?: boolean
  last_login_at?: string
}

interface UserStats {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  completion_rate: number
  active_projects: number
}
```

### 2. Организации

| Endpoint | Метод | Описание | Frontend API |
|----------|-------|----------|--------------|
| `/api/orgs/` | GET | Список организаций | `getOrganizations()` |
| `/api/orgs/` | POST | Создать организацию | `createOrganization(payload)` |
| `/api/orgs/{orgId}` | GET | Получить организацию | `getOrganization(orgId)` |
| `/api/orgs/{orgId}` | PATCH | Обновить организацию | `updateOrganization(orgId, updates)` |
| `/api/orgs/{orgId}/departments/` | GET | Департаменты организации | `getOrgDepartments(orgId)` |
| `/api/orgs/{orgId}/memberships/` | GET | Участники организации | `getOrgMembers(orgId)` |

**Модель организации:**
```typescript
interface Organization {
  id: string
  name: string
  description?: string
  website?: string
  slug?: string
  created_at: string
  updated_at: string
}
```

### 3. Департаменты

| Endpoint | Метод | Описание | Frontend API |
|----------|-------|----------|--------------|
| `/api/orgs/{orgId}/departments/` | GET | Список департаментов | `getDepartments(orgId)` |
| `/api/orgs/{orgId}/departments/` | POST | Создать департамент | `createDepartment(orgId, payload)` |
| `/api/orgs/{orgId}/departments/tree` | GET | Дерево департаментов | API вызов |
| `/api/orgs/{orgId}/departments/{deptId}` | GET | Получить департамент | API вызов |

**Модель департамента:**
```typescript
interface Department {
  id: string
  name: string
  description?: string
  parent_id?: string
  org_id: string
  created_at: string
  updated_at: string
}
```

### 4. Приглашения

| Endpoint | Метод | Описание | Frontend API |
|----------|-------|----------|--------------|
| `/api/orgs/{orgId}/invitations` | POST | Создать приглашение | `inviteToOrganization()` |
| `/api/orgs/{orgId}/memberships/bulk-invite` | POST | Массовые приглашения | `bulkInvite()` |
| `/api/invitations/{token}` | GET | Получить приглашение | API вызов |

**Модель приглашения:**
```typescript
interface InviteItem {
  email: string
  role?: string
  department_id?: string
}
```

### 5. Аналитика и Dashboard

| Endpoint | Метод | Описание | Frontend API |
|----------|-------|----------|--------------|
| `/api/dashboard/` | GET | Основной dashboard | API вызов |
| `/api/analytics/dashboard` | GET | Аналитическая панель | API вызов |
| `/api/analytics/realtime` | GET | Реальное время | API вызов |
| `/api/analytics/performance` | GET | Показатели производительности | API вызов |
| `/api/analytics/revenue-trend` | GET | Тренды доходов | API вызов |

## Статусы ошибок

| Код | Описание | Обработка |
|-----|----------|-----------|
| 200 | Успешно | Данные в response.data |
| 401 | Не авторизован | Редирект на логин |
| 403 | Недостаточно прав | Показать ошибку |
| 404 | Не найдено | Показать 404 |
| 422 | Ошибка валидации | Показать ошибки полей |
| 500 | Серверная ошибка | Показать общую ошибку |

## Соглашения Frontend

### API клиент
```typescript
// apps/web-enterprise/src/lib/api/config.ts
const API_BASE_URL = "http://localhost:8001/api"

// Все API вызовы идут через axios instance с базовым URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

### Обработка ошибок
```typescript
// Единообразная обработка ошибок
catch (error: any) {
  const message = error?.response?.data?.detail || 'Unknown error'
  const status = error?.response?.status

  if (status === 401) {
    // Редирект на логин
  } else {
    // Показать toast с ошибкой
    toast({ title: 'Error', description: message, variant: 'destructive' })
  }
}
```

### TypeScript типы
```typescript
// Все типы определены в apps/web-enterprise/src/types/
// - profile.ts - пользователи, организации
// - onboarding.ts - онбординг
// И т.д.
```

## Соглашения Backend

### Структура ответов
```python
# Успешный ответ - прямой возврат данных
return data

# Ошибка - HTTPException с detail
raise HTTPException(status_code=400, detail="Error message")

# Список с пагинацией
return {
    "items": [...],
    "total": count,
    "page": page,
    "per_page": per_page
}
```

### Модели SQLAlchemy
```python
# Базовые mixins используются везде:
from .mixins import TimestampMixin, SoftDeleteMixin

class Model(Base, TimestampMixin, SoftDeleteMixin):
    # Нестандартные relationships должны быть согласованы
    # back_populates использовать только если есть обратная связь
```

### Роутеры
```python
# Все роутеры подключаются в main.py с префиксом /api
app.include_router(router, prefix="/api", tags=["Tag"])

# Каждый роутер должен иметь правильные зависимости
```

## Статус KPI системы

**ВНИМАНИЕ:** KPI модель временно упрощена до базовой структуры БД:

```python
# Текущие поля KPI:
- id, name, description
- target_value, current_value, unit
- is_active, on_track
- org_id
- created_at, updated_at, is_deleted, deleted_at
```

KPI роутер временно отключен до создания соответствующей миграции.

## Проверенные endpoints (30.09.2025)

✅ **Работают корректно:**
- POST /api/auth/login
- GET /api/users/me
- GET /api/users/me/stats
- GET /api/orgs/
- GET /api/dashboard/
- GET /api/analytics/dashboard
- GET /api/analytics/realtime
- GET /api/analytics/performance
- GET /api/analytics/revenue-trend

❌ **Временно отключены:**
- GET /api/kpis/* (ожидает миграцию)

## Инструменты для тестирования

### Скрипт Python для тестирования API
```bash
python3 /Users/Kirill/planerix_new/test_api.py
```

### Скрипт Bash (проблемный - не использовать)
```bash
./test_api.sh  # НЕ РАБОТАЕТ из-за проблем с JSON в curl
```

## Следующие шаги

1. **Приоритет 1:** Восстановить KPI систему с правильной миграцией
2. **Приоритет 2:** Проверить endpoints приглашений
3. **Приоритет 3:** Проверить онбординг процесс
4. **Приоритет 4:** Добавить недостающие CRUD операции

---

**Важно:** Этот документ должен обновляться при каждом изменении API или моделей для поддержания согласованности между фронтендом и бекендом.

## Архитектура взаимодействия

### Компоненты системы:

1. **Web Enterprise** (apps/web-enterprise) - основное React/Next.js приложение для работы с API
2. **Planerix Landing** (apps/planerix) - маркетинговый Next.js сайт (НЕ использует API)
3. **Backend API** (apps/api) - FastAPI сервер для Web Enterprise

### Адреса и порты:

#### Локальная разработка:
- **Web Enterprise**: `http://localhost:3002` (основное приложение, использует API)
- **Planerix Landing**: `http://localhost:3001` (маркетинговый сайт, БЕЗ API)
- **API Base URL**: `http://localhost:8001/api` (только для Web Enterprise)
- **Swagger Docs**: `http://localhost:8001/docs`

#### Продакшен:
- **Web Enterprise**: `https://app.planerix.com` (основное приложение, использует API)
- **Planerix Landing**: `https://planerix.com`, `https://www.planerix.com` (маркетинговый сайт, БЕЗ API)
- **API Base URL**: `https://api.planerix.com/api` (только для Web Enterprise)
- **Swagger Docs**: `https://api.planerix.com/docs`

### ⚠️ ВАЖНО: Различия между фронтендами

| Характеристика | Web Enterprise | Planerix Landing |
|---|---|---|
| **Назначение** | Основное приложение | Маркетинговый сайт |
| **Использует API** | ✅ Да | ❌ Нет |
| **Требует авторизации** | ✅ Да | ❌ Нет |
| **Локальный порт** | 3002 | 3001 |
| **Продакшен домен** | app.planerix.com | planerix.com |
| **Директория** | apps/web-enterprise | apps/planerix |

---

## 🔐 Система аутентификации

### 1. Регистрация пользователя

**Endpoint**: `POST /api/auth/register`

**Данные запроса**:
```typescript
interface RegisterRequest {
  email: string;           // валидный email
  password: string;        // минимум 8 символов
  first_name: string;      // имя пользователя
  last_name: string;       // фамилия пользователя
  organization_name?: string; // опционально - название организации
}
```

**Пример запроса**:
```javascript
const response = await fetch('http://localhost:8001/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    first_name: 'Иван',
    last_name: 'Петров',
    organization_name: 'Моя Компания'
  })
});
```

**Ответ при успехе (201)**:
```typescript
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    created_at: string;
  };
  organization?: {
    id: string;
    name: string;
    created_at: string;
  };
  access_token: string;    // JWT токен для авторизации
  refresh_token: string;   // Токен для обновления
  token_type: "bearer";
}
```

**Ошибки**:
- `400` - невалидные данные
- `409` - пользователь с таким email уже существует

### 2. Авторизация (логин)

**Endpoint**: `POST /api/auth/login`

**Данные запроса**:
```typescript
interface LoginRequest {
  email: string;     // email пользователя
  password: string;  // пароль пользователя
}
```

**Пример запроса**:
```javascript
const response = await fetch('http://localhost:8001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'itstep@itstep.com',
    password: 'ITstep2025!'
  })
});
```

**Ответ при успехе (200)**:
```typescript
interface LoginResponse {
  access_token: string;    // JWT токен (срок действия: 15 минут)
  refresh_token: string;   // Refresh токен (срок действия: 30 дней)
  token_type: "bearer";
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
  };
  organizations: Array<{
    id: string;
    name: string;
    role: "owner" | "admin" | "member" | "viewer";
  }>;
}
```

**Ошибки**:
- `400` - невалидные данные
- `401` - неверный email или пароль
- `423` - аккаунт заблокирован

### 3. Обновление токена

**Endpoint**: `POST /api/auth/refresh`

**Данные запроса**:
```typescript
interface RefreshRequest {
  refresh_token: string; // refresh токен из ответа login
}
```

**Ответ при успехе (200)**:
```typescript
interface RefreshResponse {
  access_token: string;    // новый JWT токен
  refresh_token: string;   // новый refresh токен
  token_type: "bearer";
}
```

### 4. Выход из системы

**Endpoint**: `POST /api/auth/logout`

**Headers**: `Authorization: Bearer {access_token}`

**Ответ**: `204 No Content`

---

## 🏢 Управление организациями

### 1. Получение списка организаций пользователя

**Endpoint**: `GET /api/orgs`

**Headers**: `Authorization: Bearer {access_token}`

**Ответ (200)**:
```typescript
interface OrganizationsResponse {
  organizations: Array<{
    id: string;
    name: string;
    description?: string;
    role: "owner" | "admin" | "member" | "viewer";
    created_at: string;
    updated_at: string;
    members_count: number;
    projects_count: number;
  }>;
}
```

### 2. Создание организации

**Endpoint**: `POST /api/orgs`

**Headers**: `Authorization: Bearer {access_token}`

**Данные запроса**:
```typescript
interface CreateOrganizationRequest {
  name: string;
  description?: string;
}
```

### 3. Получение информации об организации

**Endpoint**: `GET /api/orgs/{org_id}`

**Headers**: `Authorization: Bearer {access_token}`

**Ответ (200)**:
```typescript
interface OrganizationResponse {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "member" | "viewer";
  settings: {
    timezone: string;
    currency: string;
    date_format: string;
  };
  statistics: {
    members_count: number;
    projects_count: number;
    tasks_count: number;
    completed_tasks_count: number;
  };
}
```

---

## 👥 Управление участниками (Memberships)

### 1. Получение участников организации

**Endpoint**: `GET /api/orgs/{org_id}/memberships`

**Headers**: `Authorization: Bearer {access_token}`

**Query параметры**:
```typescript
interface MembershipsQuery {
  page?: number;        // номер страницы (по умолчанию 1)
  limit?: number;       // количество на странице (по умолчанию 20)
  role?: "owner" | "admin" | "member" | "viewer";
  search?: string;      // поиск по имени/email
  status?: "active" | "invited" | "suspended";
}
```

**Ответ (200)**:
```typescript
interface MembershipsResponse {
  memberships: Array<{
    id: string;
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
    role: "owner" | "admin" | "member" | "viewer";
    status: "active" | "invited" | "suspended";
    joined_at: string;
    last_active_at?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

### 2. Приглашение пользователя

**Endpoint**: `POST /api/orgs/{org_id}/memberships`

**Headers**: `Authorization: Bearer {access_token}`

**Данные запроса**:
```typescript
interface InviteUserRequest {
  email: string;
  role: "admin" | "member" | "viewer";
  message?: string;     // персональное сообщение
}
```

### 3. Массовое приглашение пользователей

**Endpoint**: `POST /api/orgs/{org_id}/memberships/bulk-invite`

**Headers**: `Authorization: Bearer {access_token}`

**Данные запроса**:
```typescript
interface BulkInviteRequest {
  invitations: Array<{
    email: string;
    role: "admin" | "member" | "viewer";
  }>;
  message?: string;
}
```

---

## 📊 Проекты и задачи

### 1. Получение проектов организации

**Endpoint**: `GET /api/orgs/{org_id}/projects`

**Headers**: `Authorization: Bearer {access_token}`

**Query параметры**:
```typescript
interface ProjectsQuery {
  page?: number;
  limit?: number;
  status?: "active" | "completed" | "archived";
  search?: string;
  sort?: "name" | "created_at" | "updated_at";
  order?: "asc" | "desc";
}
```

### 2. Создание проекта

**Endpoint**: `POST /api/orgs/{org_id}/projects`

**Headers**: `Authorization: Bearer {access_token}`

**Данные запроса**:
```typescript
interface CreateProjectRequest {
  name: string;
  description?: string;
  start_date?: string;    // ISO 8601 date
  end_date?: string;      // ISO 8601 date
  status: "active" | "completed" | "archived";
  color?: string;         // hex color code
  members?: string[];     // массив ID пользователей
}
```

### 3. Получение задач организации

**Endpoint**: `GET /api/orgs/{org_id}/tasks`

**Headers**: `Authorization: Bearer {access_token}`

**Query параметры**:
```typescript
interface TasksQuery {
  page?: number;
  limit?: number;
  status?: "todo" | "in_progress" | "completed" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  assigned_to?: string;   // ID пользователя
  project_id?: string;    // ID проекта
  due_date_from?: string; // ISO 8601 date
  due_date_to?: string;   // ISO 8601 date
  search?: string;
}
```

**Ответ (200)**:
```typescript
interface TasksResponse {
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    project: {
      id: string;
      name: string;
      color?: string;
    };
    assigned_to?: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
    created_by: {
      id: string;
      first_name: string;
      last_name: string;
    };
    due_date?: string;
    created_at: string;
    updated_at: string;
    estimated_hours?: number;
    actual_hours?: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

### 4. Создание задачи

**Endpoint**: `POST /api/orgs/{org_id}/tasks`

**Headers**: `Authorization: Bearer {access_token}`

**Данные запроса**:
```typescript
interface CreateTaskRequest {
  title: string;
  description?: string;
  project_id: string;
  assigned_to?: string;    // ID пользователя
  priority: "low" | "medium" | "high" | "urgent";
  due_date?: string;       // ISO 8601 date
  estimated_hours?: number;
  tags?: string[];         // массив тегов
}
```

---

## 📈 Аналитика и данные клиентов

### 1. Аналитика продаж

**Endpoint**: `GET /api/analytics/sales`

**Headers**: `Authorization: Bearer {access_token}`

**Query параметры**:
```typescript
interface SalesAnalyticsQuery {
  org_id: string;
  date_from: string;    // ISO 8601 date
  date_to: string;      // ISO 8601 date
  group_by?: "day" | "week" | "month" | "quarter";
  client_id?: string;   // фильтр по клиенту
}
```

**Ответ (200)**:
```typescript
interface SalesAnalyticsResponse {
  metrics: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    growth_rate: number;    // в процентах
  };
  data: Array<{
    date: string;
    revenue: number;
    orders: number;
    average_order_value: number;
  }>;
  clients: Array<{
    client_id: string;
    client_name: string;
    revenue: number;
    orders: number;
    growth_rate: number;
  }>;
}
```

### 2. Аналитика рекламы

**Endpoint**: `GET /api/analytics/ads`

**Headers**: `Authorization: Bearer {access_token}`

**Query параметры**:
```typescript
interface AdsAnalyticsQuery {
  org_id: string;
  date_from: string;
  date_to: string;
  platform?: "facebook" | "google" | "yandex" | "all";
  campaign_id?: string;
}
```

### 3. Данные из ITstep базы (клиентская база)

**Endpoint**: `GET /api/analytics/clients`

**Headers**: `Authorization: Bearer {access_token}`

**Query параметры**:
```typescript
interface ClientsAnalyticsQuery {
  date_from: string;
  date_to: string;
  client_type?: "individual" | "corporate" | "all";
  course_category?: string;
  city?: string;
  page?: number;
  limit?: number;
}
```

**Ответ (200)**:
```typescript
interface ClientsAnalyticsResponse {
  clients: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    registration_date: string;
    last_activity: string;
    total_courses: number;
    total_spent: number;
    courses: Array<{
      course_name: string;
      start_date: string;
      completion_rate: number;
      payment_status: "paid" | "pending" | "overdue";
    }>;
    location: {
      city: string;
      country: string;
    };
  }>;
  statistics: {
    total_clients: number;
    active_clients: number;
    new_clients_this_period: number;
    retention_rate: number;
    average_ltv: number;    // Lifetime Value
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

---

## 🔒 Система авторизации и безопасность

### JWT токены

**Access Token**:
- Срок действия: 15 минут (продакшен), 30 минут (разработка)
- Используется для всех API запросов
- Передается в заголовке: `Authorization: Bearer {token}`

**Refresh Token**:
- Срок действия: 30 дней
- Используется для обновления access token
- Хранится в httpOnly cookies (продакшен) или localStorage (разработка)

### Права доступа (роли)

1. **Owner** - владелец организации
   - Полный доступ ко всем функциям
   - Управление участниками и их ролями
   - Удаление организации

2. **Admin** - администратор
   - Управление проектами и задачами
   - Приглашение новых участников
   - Доступ к аналитике

3. **Member** - обычный участник
   - Создание и редактирование задач
   - Просмотр проектов
   - Ограниченный доступ к аналитике

4. **Viewer** - только просмотр
   - Только чтение данных
   - Нет прав на создание/редактирование

### Обработка ошибок

**Стандартный формат ошибок**:
```typescript
interface ErrorResponse {
  error: {
    code: string;           // уникальный код ошибки
    message: string;        // человекочитаемое сообщение
    details?: any;          // дополнительные данные об ошибке
    timestamp: string;      // время возникновения ошибки
    trace_id?: string;      // ID для отслеживания в логах
  };
}
```

**Типичные коды ошибок**:
- `AUTH_TOKEN_EXPIRED` - токен истек
- `AUTH_TOKEN_INVALID` - недействительный токен
- `INSUFFICIENT_PERMISSIONS` - недостаточно прав
- `RESOURCE_NOT_FOUND` - ресурс не найден
- `VALIDATION_ERROR` - ошибка валидации данных
- `RATE_LIMIT_EXCEEDED` - превышен лимит запросов

---

## 🌐 Фронтенд интеграция

### Настройка API клиента

```typescript
// libs/api-client.ts
class ApiClient {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Токен истек, попытка обновления
        await this.refreshToken();
        return this.request(endpoint, options);
      }

      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API Error');
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.access_token);
    return response;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await this.request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    this.setToken(response.access_token);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
  }

  // API методы
  async getOrganizations(): Promise<OrganizationsResponse> {
    return this.request('/orgs');
  }

  async getTasks(orgId: string, query: TasksQuery = {}): Promise<TasksResponse> {
    const params = new URLSearchParams(query as any).toString();
    return this.request(`/orgs/${orgId}/tasks?${params}`);
  }

  async createTask(orgId: string, data: CreateTaskRequest): Promise<TaskResponse> {
    return this.request(`/orgs/${orgId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Инициализация (ТОЛЬКО для Web Enterprise!)
const apiClient = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api'
);

export default apiClient;

// ВАЖНО: Этот API клиент используется ТОЛЬКО в Web Enterprise!
// Planerix Landing не использует API и не нуждается в этом коде!
```

### React хуки для API

```typescript
// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import apiClient from '@/libs/api-client';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      apiClient.setToken(token);
      // Проверить валидность токена
      verifyToken();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.login(email, password);

      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    apiClient.setToken('');
  };

  return { user, isLoading, login, logout };
};
```

---

## 📝 Примеры использования

### Компонент авторизации

```tsx
// components/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      // Redirect to dashboard
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### Компонент списка задач

```tsx
// components/TasksList.tsx
import React, { useState, useEffect } from 'react';
import apiClient from '@/libs/api-client';

interface TasksListProps {
  orgId: string;
}

const TasksList: React.FC<TasksListProps> = ({ orgId }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadTasks();
  }, [orgId, page]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTasks(orgId, { page, limit: 20 });
      setTasks(response.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div className="tasks-list">
      {tasks.map(task => (
        <div key={task.id} className="task-card">
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <span className={`status ${task.status}`}>
            {task.status}
          </span>
          <span className={`priority ${task.priority}`}>
            {task.priority}
          </span>
        </div>
      ))}
    </div>
  );
};
```

---

## 🚨 Важные правила

### Для Frontend разработчиков:

1. **Всегда проверяйте статус ответа** перед обработкой данных
2. **Обрабатывайте ошибки 401** - автоматически обновляйте токен
3. **Используйте типизацию TypeScript** для всех API вызовов
4. **Кэшируйте данные** где это возможно для улучшения UX
5. **Показывайте loading состояния** для всех асинхронных операций

### Для Backend разработчиков:

1. **Всегда валидируйте входные данные** с помощью Pydantic схем
2. **Возвращайте консистентные коды ошибок** во всех endpoints
3. **Логируйте все критические операции** для отладки
4. **Используйте пагинацию** для списков данных
5. **Проверяйте права доступа** на каждом protected endpoint

---

## 🌟 Planerix Landing (Маркетинговый сайт)

### Что это такое:
**Planerix Landing** - это отдельный Next.js сайт для маркетинга и привлечения клиентов. Он НЕ использует API и НЕ связан с основным функционалом системы.

### Технические характеристики:
- **Директория**: `apps/planerix/`
- **Технологии**: Next.js 15, React 19, Tailwind CSS
- **Локальный адрес**: http://localhost:3001
- **Продакшен**: https://planerix.com, https://www.planerix.com

### Функциональность:
- ✅ Статические маркетинговые страницы
- ✅ Контактные формы (через Resend API)
- ✅ SEO оптимизация
- ❌ НЕ использует основной API
- ❌ НЕ требует авторизации
- ❌ НЕ работает с пользователями и организациями

### Переменные окружения (Planerix Landing):
```bash
# apps/planerix/.env.local
RESEND_API_KEY=re_7jw2Yip1_4396Z2zxRRtuGLRqZMiVWRJV
RESEND_FROM=notifications@planerix.com
CONTACT_TO=kprolieiev@gmail.com

# НЕТ API переменных - они не нужны!
```

### Запуск Planerix Landing:
```bash
# Локальная разработка (вместе со всем проектом)
./start-dev.sh

# Только Landing (если нужно)
cd apps/planerix
npm run dev  # запуск на порту 3000

# Docker
docker-compose -f docker-compose.dev.yml up planerix-landing
```

### Структура проекта Landing:
```
apps/planerix/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Главная страница
│   │   ├── features/        # Страница функций
│   │   ├── pricing/         # Страница тарифов
│   │   └── api/
│   │       ├── contact/     # API для контактной формы
│   │       └── lead/        # API для лидов
│   ├── components/          # React компоненты
│   └── lib/                 # Утилиты
├── public/                  # Статические файлы
├── next.config.js
└── package.json
```

### Отличия от Web Enterprise:

| Аспект | Web Enterprise | Planerix Landing |
|---|---|---|
| **Цель** | Рабочее приложение | Маркетинговый сайт |
| **Пользователи** | Зарегистрированные | Все посетители |
| **Данные** | Из API + база данных | Статический контент |
| **Авторизация** | Обязательна | Не нужна |
| **Формы** | Управление проектами/задачами | Контакты/лиды |
| **API использование** | Активное | Только email отправка |

### Важные команды для Landing:

```bash
# Сборка продакшена
cd apps/planerix
npm run build

# Проверка типов
cd apps/planerix
npm run type-check

# Линтинг
cd apps/planerix
npm run lint
```

### Типичные ошибки:
❌ **НЕ ДЕЛАЙТЕ**:
- Не пытайтесь использовать API клиент в Landing
- Не добавляйте авторизацию в Landing
- Не путайте порты (3001 для Landing, 3002 для Web Enterprise)

✅ **ПРАВИЛЬНО**:
- Landing работает независимо от API
- Landing использует только Resend для отправки email
- Landing доступен всем без регистрации

---

## 📊 Аналитические API endpoints (ITstep реальные данные)

### Настройки аналитики

**Период реальных данных**: 31 августа 2025 - 25 сентября 2025 (25 дней)
**Фронтенд настройки**: По умолчанию отображает реальный период данных

### 1. Обзор дашборда

**Endpoint**: `GET /api/analytics/dashboard/overview`

**Query параметры**:
```typescript
interface DashboardQuery {
  start_date: string;  // "2025-08-31" (фиксированный период)
  end_date: string;    // "2025-09-25" (фиксированный период)
}
```

**Ответ (200)**:
```typescript
interface DashboardOverviewResponse {
  status: "success";
  data: {
    total_revenue: number;        // $6,498.54 (реальные данные)
    total_spend: number;          // Общие расходы
    roas: number;                 // Return on Ad Spend
    total_leads: number;          // 833 лида
    revenue_trend: number;        // % изменение
    spend_trend: number;          // % изменение
    roas_trend: number;           // % изменение
    active_campaigns: number;     // 38 активных кампаний
  };
}
```

### 2. Реальное время метрики

**Endpoint**: `GET /api/analytics/realtime`

**Ответ (200)**:
```typescript
interface RealTimeMetricsResponse {
  status: "success";
  data: {
    active_sessions: number;
    new_leads_today: number;
    revenue_today: number;
    alerts: string[];          // Предупреждения по кампаниям
  };
}
```

### 3. KPI показатели

**Endpoint**: `GET /api/analytics/kpis`

**Query параметры**: Те же что и в dashboard/overview

**Ответ (200)**:
```typescript
interface KPIsResponse {
  status: "success";
  data: {
    revenue: {
      current: number;
      previous: number;
      change_percent: number;
    };
    leads: {
      current: number;
      previous: number;
      change_percent: number;
    };
    campaigns: {
      active: number;
      paused: number;
      total: number;
    };
    spend: {
      current: number;
      previous: number;
      change_percent: number;
    };
  };
}
```

### 4. Продажи - тренд доходов

**Endpoint**: `GET /api/analytics/sales/revenue-trend`

**Ответ (200)**:
```typescript
interface RevenueTrendResponse {
  status: "success";
  data: Array<{
    date: string;        // "2025-08-31", "2025-09-01", ...
    revenue: number;     // Доход за день
  }>;
}
```

### 5. Продажи по продуктам

**Endpoint**: `GET /api/analytics/sales/by-products`

**Ответ (200)**:
```typescript
interface SalesByProductsResponse {
  status: "success";
  data: Array<{
    product_name: string;
    revenue: number;
    orders: number;
    growth_rate: number;
  }>;
}
```

### 6. Воронка конверсий

**Endpoint**: `GET /api/analytics/sales/funnel`

**Ответ (200)**:
```typescript
interface ConversionFunnelResponse {
  status: "success";
  data: {
    stages: Array<{
      stage: "impressions" | "clicks" | "leads" | "conversions";
      count: number;
      rate: number;        // Конверсия в %
    }>;
  };
}
```

### 7. Рекламные кампании

**Endpoint**: `GET /api/analytics/ads/campaigns`

**Query параметры**:
```typescript
interface CampaignsQuery {
  start_date: string;
  end_date: string;
  page?: number;
  page_size?: number;
  platform?: string;    // "facebook", "google", etc.
  sort_by?: "spend" | "revenue" | "roas";
  sort_order?: "asc" | "desc";
}
```

**Ответ (200)**:
```typescript
interface CampaignsResponse {
  status: "success";
  data: Array<{
    campaign_id: string;
    campaign_name: string;
    platform: string;
    total_metrics: {
      spend: number;
      revenue: number;
      roas: number;
      leads: number;
      impressions: number;
      clicks: number;
      ctr: number;       // Click-through rate
    };
    daily_breakdown: Array<{
      date: string;
      spend: number;
      revenue: number;
      leads: number;
    }>;
  }>;
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
```

### 8. Креативы

**Endpoint**: `GET /api/analytics/ads/creatives`

**Query параметры**: Те же что и для campaigns

**Ответ (200)**:
```typescript
interface CreativesResponse {
  status: "success";
  data: Array<{
    creative_id: string;
    creative_name: string;
    campaign_name: string;
    platform: string;
    spend: number;
    revenue: number;
    roas: number;
    ctr: number;
    leads: number;
    impressions: number;
    clicks: number;
  }>;
}
```

### 9. Анализ выгорания креативов

**Endpoint**: `GET /api/analytics/ads/creatives/burnout`

**Query параметры**:
```typescript
interface BurnoutQuery {
  days_back?: number;      // По умолчанию 30
  min_days_active?: number; // По умолчанию 7
}
```

**Ответ (200)**:
```typescript
interface BurnoutResponse {
  status: "success";
  data: Array<{
    creative_id: string;
    creative_name: string;
    days_active: number;
    performance_decline: number;  // % снижения эффективности
    status: "healthy" | "declining" | "burned_out";
    recommendation: string;
  }>;
}
```

### 10. Топ креативы

**Endpoint**: `GET /api/analytics/ads/creatives/top-performing`

**Query параметры**:
```typescript
interface TopCreativesQuery {
  start_date: string;
  end_date: string;
  metric?: "roas" | "revenue" | "conversions" | "ctr" | "spend";
  limit?: number;     // По умолчанию 10
}
```

### Frontend хуки для аналитики

**Основные хуки с реальными датами**:
```typescript
// hooks/useAnalytics.ts
import { useAnalyticsDateRange } from './useAnalyticsDateRange';

// Автоматически использует реальные даты (2025-08-31 to 2025-09-25)
export function useDashboardOverview(dateRange: DateRange) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', dateRange],
    queryFn: () => AnalyticsAPI.getDashboardOverview(dateRange),
    staleTime: 5 * 60 * 1000, // 5 минут
    enabled: Boolean(dateRange.start_date && dateRange.end_date),
  });
}

export function useRealTimeMetrics() {
  return useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: () => AnalyticsAPI.getRealTimeMetrics(),
    refetchInterval: 30 * 1000, // Обновление каждые 30 сек
  });
}
```

**Управление датами**:
```typescript
// hooks/useAnalyticsDateRange.ts - настроено на реальные данные
export function useAnalyticsDateRange(defaultDays: number = 25) {
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    // Использует реальные даты из базы данных
    const to = new Date('2025-09-25');
    const from = new Date('2025-08-31');
    return { from, to };
  });

  // Конвертация в формат API
  const apiDateRange: DateRange = {
    start_date: dateRange.from.toISOString().split('T')[0],
    end_date: dateRange.to.toISOString().split('T')[0]
  };

  return { dateRange, apiDateRange, updateDateRange };
}
```

### Компоненты аналитики

**Основные компоненты готовы**:
- `/apps/web-enterprise/src/app/analytics/page.tsx` - главная страница
- `/apps/web-enterprise/src/app/analytics/campaigns/` - страница кампаний
- `/apps/web-enterprise/src/app/analytics/creatives/` - страница креативов
- `/apps/web-enterprise/src/app/analytics/products/` - продажи по продуктам
- `/apps/web-enterprise/src/app/analytics/funnel/` - воронка конверсий

**Реальные данные в интерфейсе**:
- KPI карточки отображают актуальные $6,498.54, 833 лида, 38 кампаний
- Графики строятся по реальным датам из базы
- Фильтры по умолчанию показывают период с реальными данными
- Все таблицы заполнены реальной информацией о кампаниях

---

**Последнее обновление**: 30 сентября 2025
**Версия API**: 1.0.0
**Статус аналитики**: ✅ Реальные данные ITstep интегрированы