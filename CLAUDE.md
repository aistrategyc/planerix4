# Claude Code Project Configuration Guide

## Критическое исправление API URL (6 октября 2025) 🔥

### Проблема: Duplicate /api prefix
**Симптом**: Все API запросы возвращали 404 ошибку, запросы шли на `/api/api/auth/login`

**Причина**:
- `NEXT_PUBLIC_API_URL` = `http://localhost:8001/api` (уже содержит `/api`)
- Код в `auth-context.tsx` добавлял `/api` еще раз: `${NEXT_PUBLIC_API_URL}/api/auth/login`
- Результат: `http://localhost:8001/api/api/auth/login` ❌

**Решение (commit 229c637)**: ✅
1. Удалён префикс `/api` из всех fetch URL в `auth-context.tsx` (7 мест):
   - `/auth/login` (2 раза - обычный логин и dev auto-login)
   - `/auth/register`
   - `/auth/refresh`
   - `/auth/logout`
   - `/auth/resend-verification`
   - `/users/me`

2. Добавлен `.env.production` в `.dockerignore` - предотвращает переопределение build args

3. Обновлён корневой `.env`: `NEXT_PUBLIC_API_URL=http://localhost:8001/api`

4. Исправлены CORS настройки в `settings.py`:
   - Заменён wildcard `*` на конкретные origins
   - Улучшен парсинг comma-separated списков

5. Увеличен rate limit для `/auth/refresh`: 10 → 100 запросов/час (dev)

6. Удалены несуществующие ссылки из sidebar (Settings, Help)

7. Обновлены default даты в data-analytics: 2025-09-10 до 2025-10-03

**Проверка**: ✅ Все API запросы теперь идут на правильные URL без дублирования `/api`

---

## Authentication Audit Results (September 2025)

### Fixed Issues Summary

1. **Database Configuration Inconsistency** ✅
   - Problem: API using wrong database credentials (`manfromlamp/dev_password_123` vs Docker `app/app`)
   - Fix: Updated `apps/api/.env` to match Docker PostgreSQL credentials
   - Files: `apps/api/.env`, `.env.postgres`

2. **Port Configuration** ✅
   - Frontend: `http://localhost:3002` (Docker port mapping 3002:3001)
   - Backend: `http://localhost:8001` (Docker port mapping 8001:8001)
   - Use `./start-dev.sh` script for proper startup

3. **ITstep Organization Created** ✅
   - User: `itstep@itstep.com` / `ITstep2025!`
   - Organization: ITstep (ID: `b4703661-de3b-4cab-86c9-9187199c0a43`)

### Critical Configuration Files

#### Database Configuration
```bash
# .env.postgres (Docker PostgreSQL)
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app

# apps/api/.env (API Database Connection)
LIDERIX_DB_URL=postgresql+asyncpg://app:app@localhost:5432/app
POSTGRES_HOST=localhost
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
```

#### Frontend Environment
```bash
# apps/web-enterprise/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8001/api
NEXT_PUBLIC_API_PREFIX=/api
```

#### Docker Port Mappings
```yaml
# docker-compose.dev.yml
frontend:
  ports:
    - "3002:3001"  # Access via http://localhost:3002
backend:
  ports:
    - "8001:8001"  # API at http://localhost:8001/api
```

### Startup Commands

#### Proper Development Startup
```bash
# Use the startup script (recommended)
./start-dev.sh

# Manual startup (if needed)
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build -d
```

#### Database Migrations
```bash
# If database schema changes
cd apps/api
alembic upgrade head
```

### API Testing Commands
```bash
# Test login
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "itstep@itstep.com", "password": "ITstep2025!"}'

# Test organizations endpoint
curl -X GET "http://localhost:8001/api/orgs" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Lint and Type Check Commands
```bash
# Frontend
cd apps/web-enterprise
npm run lint
npm run type-check

# Backend (if available)
cd apps/api
# Add lint/type-check commands as needed
```

### Troubleshooting Common Issues

1. **Login not working**:
   - Verify database credentials match between Docker and API
   - Check if migrations are up to date: `alembic upgrade head`
   - Verify API is responding: `curl http://localhost:8001/api/health`

2. **Port conflicts**:
   - Use `./start-dev.sh` to properly clean and restart
   - Verify nothing else is using ports 3002, 8001, 5432, 6379

3. **Database connection errors**:
   - Ensure PostgreSQL container is running and healthy
   - Check credentials in both `.env.postgres` and `apps/api/.env`

## Серверное восстановление (30 сентября 2025)

### Критическая проблема на сервере
**Проблема**: После изменений в коде API перестал запускаться из-за синтаксической ошибки в файле `memberships.py`

### Решение
1. **Восстановление рабочей версии**:
   ```bash
   ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
   cd /opt/MONOREPv3
   git reset --hard HEAD  # Сброс всех изменений к последнему коммиту
   ```

2. **Исправление синтаксической ошибки**:
   ```bash
   # Файл: apps/api/liderix_api/routes/org_structure/memberships.py
   # Строка 319: отсутствуют кавычки в роуте
   @router.post("/bulk-invite", response_model=dict[str, Any])  # Исправлено
   ```

3. **Перезапуск продакшн сервисов**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

### Команды для быстрого восстановления сервера
```bash
# Подключение к серверу
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33

# Переход в проект
cd /opt/MONOREPv3

# Сброс к рабочему состоянию
git reset --hard HEAD
git clean -fd

# Перезапуск с очисткой
docker-compose -f docker-compose.prod.yml down
docker system prune -f
docker-compose -f docker-compose.prod.yml up -d --build
```

### Проверка состояния сервера
```bash
# Статус контейнеров
docker-compose -f docker-compose.prod.yml ps

# Логи API (если есть ошибки)
docker-compose -f docker-compose.prod.yml logs --tail=20 api

# Проверка доступности API
curl -X GET https://app.planerix.com/api/health
```

### Never Do This Again
- Never mix database credentials between Docker and API configs
- Never change port configurations without updating all dependent files
- Always use the startup script for development environment
- Always run migrations after database credential changes
- **ВСЕГДА проверяй синтаксис Python файлов перед коммитом**
- **Не изменяй роуты без кавычек в декораторах**
- **Тестируй изменения локально перед деплоем на сервер**

This configuration has been tested and verified working on September 30, 2025.

## Authentication Schema Alignment (October 13, 2025)

### Critical Fix: Frontend/Backend Schema Mismatch

**Problem**: Frontend registration form was sending `first_name` and `last_name` fields, but backend `RegisterSchema` didn't accept them. Registration succeeded (201), but these fields were silently discarded and saved as NULL in the database.

**Root Cause**: Schema definitions were not synchronized between frontend and backend after the User model was updated to include name fields.

### Files Fixed

1. **Backend Schema** (`apps/api/liderix_api/schemas/auth.py`):
   ```python
   class RegisterSchema(BaseModel):
       username: str = Field(..., min_length=3, max_length=50)
       email: EmailStr = Field(...)
       password: str = Field(..., min_length=8, max_length=128)
       first_name: Optional[str] = Field(None, max_length=100)  # ✅ ADDED
       last_name: Optional[str] = Field(None, max_length=100)   # ✅ ADDED
       client_id: Optional[str] = Field(None)
       terms_accepted: bool = Field(...)
   ```

2. **Backend Registration Route** (`apps/api/liderix_api/routes/auth/register.py`):
   ```python
   # New user creation
   user = User(
       id=uuid4(),
       username=username,
       email=email,
       first_name=data.first_name,  # ✅ ADDED
       last_name=data.last_name,    # ✅ ADDED
       hashed_password=hash_password(data.password),
       # ... other fields
   )

   # Existing user update
   await session.execute(
       update(User)
       .where(User.id == existing.id, User.is_verified == False)
       .values(
           username=username,
           first_name=data.first_name,  # ✅ ADDED
           last_name=data.last_name,    # ✅ ADDED
           # ... other fields
       )
   )
   ```

3. **Frontend TypeScript Types** (`apps/web-enterprise/src/lib/api/auth.ts`):
   ```typescript
   export type RegisterSchema = {
     email: string
     password: string
     username: string
     first_name?: string  // ✅ Now matches backend
     last_name?: string   // ✅ Now matches backend
     terms_accepted: boolean
   }
   ```

### Testing Verification

```bash
# Test registration with name fields
curl -X POST "http://localhost:8001/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "username": "testuser",
    "first_name": "John",
    "last_name": "Doe",
    "terms_accepted": true
  }'

# Verify database
docker exec db-postgres psql -U app -d app -c \
  "SELECT username, email, first_name, last_name, is_verified
   FROM users WHERE email='test@example.com';"

# Result:
#  username |      email       | first_name | last_name | is_verified
# ----------+------------------+------------+-----------+-------------
#  testuser | test@example.com | John       | Doe       | f
```

**Status**: ✅ VERIFIED WORKING

### Important Notes

1. **Container Rebuild Required**: After schema changes, the backend container must be rebuilt to pick up Python file changes:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build backend
   ```

2. **Schema Synchronization Rule**: When updating authentication schemas, ALWAYS update:
   - Backend Pydantic schema (`apps/api/liderix_api/schemas/auth.py`)
   - Backend route handlers (`apps/api/liderix_api/routes/auth/*.py`)
   - Frontend TypeScript types (`apps/web-enterprise/src/lib/api/auth.ts`)
   - Frontend Zod schemas (in respective page files)
   - Database model (if needed) + Alembic migration

3. **Documentation**: See `AUTHENTICATION_RULES.md` for complete authentication system documentation, including:
   - Full schema definitions
   - Validation rules
   - Registration and login flows
   - Environment variables
   - Testing instructions
   - Troubleshooting guide

This fix has been tested and verified working on October 13, 2025.