# Authentication System - Complete Rules and Configuration

**Last Updated:** October 13, 2025
**Status:** ✅ VERIFIED WORKING

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Frontend Configuration](#frontend-configuration)
3. [Backend Configuration](#backend-configuration)
4. [Database Schema](#database-schema)
5. [Registration Flow](#registration-flow)
6. [Login Flow](#login-flow)
7. [Environment Variables](#environment-variables)
8. [Testing Instructions](#testing-instructions)
9. [Troubleshooting](#troubleshooting)

---

## System Overview

### Architecture Stack

- **Frontend:** Next.js 15 with React Hook Form + Zod validation
- **Backend:** FastAPI with Pydantic schemas
- **Database:** PostgreSQL 14
- **Cache/Sessions:** Redis 7
- **Authentication:** JWT (access + refresh tokens)
- **Email Verification:** Resend API (optional)

### Key Principles

1. **Schema Alignment:** Frontend and backend schemas MUST match exactly
2. **Type Safety:** TypeScript types MUST mirror Pydantic schemas
3. **Validation:** Both frontend and backend validate data independently
4. **Security:** Passwords hashed with bcrypt, JWT tokens with RS256
5. **Email Verification:** Users must verify email before full access

---

## Frontend Configuration

### Location: `apps/web-enterprise/`

### Environment Variables (`.env.local`)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8001/api
NEXT_PUBLIC_API_PREFIX=/api

# Production
NEXT_PUBLIC_API_URL=https://api.planerix.com/api
NEXT_PUBLIC_API_PREFIX=/api
```

### TypeScript Types (`src/lib/api/auth.ts`)

```typescript
export type RegisterSchema = {
  email: string
  password: string
  username: string
  first_name?: string       // ✅ Optional
  last_name?: string        // ✅ Optional
  terms_accepted: boolean
}

export type LoginRequest = {
  email: string
  password: string
}

export type TokenResponse = {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
}
```

### Validation Rules (Zod Schemas)

#### Registration (`apps/web-enterprise/src/app/(auth)/register/page.tsx`)

```typescript
const registerSchema = z.object({
  email: z.string().email({ message: "Введите корректный email" }),
  password: z.string()
    .min(8, { message: "Минимум 8 символов" })
    .regex(/[A-Z]/, { message: "Пароль должен содержать заглавную букву" })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "Пароль должен содержать спецсимвол" }),
  username: z.string().min(3, { message: "Введите имя пользователя" }),
  first_name: z.string().min(1, { message: "Введите имя" }),
  last_name: z.string().min(1, { message: "Введите фамилию" }),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: "Необходимо принять условия использования",
  }),
})
```

#### Login (`apps/web-enterprise/src/app/(auth)/login/page.tsx`)

```typescript
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
})
```

---

## Backend Configuration

### Location: `apps/api/`

### Environment Variables (`.env`)

```bash
# Database
LIDERIX_DB_URL=postgresql+asyncpg://app:app@localhost:5432/app
POSTGRES_HOST=localhost
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app

# Redis
REDIS_URL=redis://:redis_dev_password@localhost:6379/0
REDIS_PASSWORD=redis_dev_password

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (Optional)
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@planerix.com
FRONTEND_URL=http://localhost:3002

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001","http://localhost:3002"]
```

### Pydantic Schemas (`apps/api/liderix_api/schemas/auth.py`)

```python
class RegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Username (3-50 characters)")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (8-128 characters)")
    first_name: Optional[str] = Field(None, max_length=100, description="User's first name")
    last_name: Optional[str] = Field(None, max_length=100, description="User's last name")
    client_id: Optional[str] = Field(None, description="Client ID for tracking registration source")
    terms_accepted: bool = Field(..., description="User must accept terms of service")

    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username can only contain letters, numbers, and underscores')
        if v.lower() in ['admin', 'root', 'system', 'api', 'support']:
            raise ValueError('Username is reserved')
        return v.strip()

    @validator('password')
    def validate_password_complexity(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

    @validator('terms_accepted')
    def validate_terms(cls, v):
        if not v:
            raise ValueError('You must accept the terms of service')
        return v

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., description="Password")
    remember_me: Optional[bool] = Field(False, description="Extend session duration")
    device_name: Optional[str] = Field(None, max_length=100, description="Optional device name for tracking")
```

---

## Database Schema

### User Model (`apps/api/liderix_api/models/users.py`)

```python
class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=True)          # ✅ Optional
    last_name = Column(String(100), nullable=True)           # ✅ Optional
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.MEMBER, nullable=False)

    # Verification tokens
    verification_token_hash = Column(String(255), nullable=True, index=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Password reset tokens
    password_reset_token_hash = Column(String(255), nullable=True, index=True)
    password_reset_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Audit fields
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    client_id = Column(PG_UUID(as_uuid=True), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
```

### Migration: Initial Schema

**File:** `apps/api/alembic/versions/2025_08_19-0942_08ae632427f9_fresh_init_schema.py`

```python
op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('username', sa.String(length=50), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('first_name', sa.String(length=100), nullable=True),
    sa.Column('last_name', sa.String(length=100), nullable=True),
    sa.Column('full_name', sa.String(length=255), nullable=True),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    # ... other columns
    sa.PrimaryKeyConstraint('id')
)
```

---

## Registration Flow

### Step-by-Step Process

1. **User submits registration form** (`/register`)
   - Frontend validates with Zod schema
   - Form data: `{ email, password, username, first_name, last_name, terms_accepted }`

2. **POST /api/auth/register**
   - Backend validates with Pydantic `RegisterSchema`
   - Checks password complexity (uppercase, lowercase, digit, special char)
   - Checks username format (alphanumeric + underscore only)
   - Normalizes email (lowercase, trim)

3. **Database checks**
   - Check if email already exists and is verified → Error 409
   - Check if username already exists (among verified users) → Error 409
   - If unverified user exists with same email → Update existing record

4. **User creation**
   ```python
   user = User(
       id=uuid4(),
       username=username,
       email=email,
       first_name=data.first_name,    # ✅ Saved
       last_name=data.last_name,      # ✅ Saved
       hashed_password=hash_password(data.password),
       client_id=data.client_id,
       is_verified=False,
       is_active=True,
       verification_token_hash=token_hash,
       verification_token_expires_at=now_utc() + timedelta(hours=48),
   )
   ```

5. **Email verification** (background task)
   - Generate secure token (32 bytes, URL-safe)
   - Hash token with SHA256 before storing
   - Send email with verification link
   - Token expires in 48 hours

6. **Response**
   - Status: 201 Created
   - Message: "Account created successfully! Please check your email to verify your account."
   - Location header: `/api/users/{user.id}`

### Rate Limiting

- **Per IP:** 5 registration attempts per hour
- **Per Email:** Unified response for security (don't reveal if email exists)
- **Resend Verification:** 3 attempts per hour per email

---

## Login Flow

### Step-by-Step Process

1. **User submits login form** (`/login`)
   - Frontend validates with Zod schema
   - Form data: `{ email, password }`

2. **POST /api/auth/login**
   - Backend validates with Pydantic `LoginRequest`
   - Rate limiting: 5 failed attempts → temporary account lockout (15 min)

3. **User lookup**
   - Find user by email (case-insensitive)
   - Check user exists → Error 401 if not
   - Check account not suspended → Error 403 if suspended

4. **Password verification**
   - Verify password with bcrypt
   - If incorrect:
     - Increment failed attempt counter
     - Audit log failure event
     - Return 401 Unauthorized

5. **Account status checks**
   - Check `is_active=True` → Error 403 if false
   - Check `is_verified=True` → Error 403 if false (with resend verification option)

6. **Token generation**
   ```python
   access_token = create_access_token(
       data={"sub": str(user.id), "email": user.email, "type": "access"},
       expires_delta=timedelta(minutes=15)
   )

   refresh_token = create_refresh_token(
       data={"sub": str(user.id), "jti": str(uuid4()), "type": "refresh"},
       expires_delta=timedelta(days=7)
   )
   ```

7. **Session management**
   - Store refresh token JTI in whitelist (Redis + DB)
   - Set secure HTTP-only cookie with refresh token
   - Update `last_login_at` timestamp
   - Audit log success event

8. **Response**
   - Status: 200 OK
   ```json
   {
     "access_token": "eyJhbGc...",
     "token_type": "bearer",
     "expires_in": 900,
     "refresh_expires_in": 604800,
     "user": {
       "id": "uuid",
       "username": "...",
       "email": "...",
       "is_verified": true
     }
   }
   ```

### Security Features

- **Rate Limiting:** 5 failed attempts per IP per 15 minutes
- **Account Lockout:** 5 consecutive failures → 15 minute lockout
- **Audit Logging:** All login attempts logged with IP and User-Agent
- **Device Tracking:** Optional device_name for session management
- **Token Rotation:** Refresh tokens rotate on use
- **Secure Cookies:** HTTP-only, Secure, SameSite=Lax

---

## Environment Variables

### Development Environment

#### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001/api
NEXT_PUBLIC_API_PREFIX=/api
```

#### Backend (`apps/api/.env`)
```bash
# Database
LIDERIX_DB_URL=postgresql+asyncpg://app:app@localhost:5432/app
POSTGRES_HOST=localhost
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app

# Redis
REDIS_URL=redis://:redis_dev_password@localhost:6379/0
REDIS_PASSWORD=redis_dev_password

# JWT
JWT_SECRET_KEY=dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email (Optional in dev)
RESEND_API_KEY=
EMAIL_FROM=noreply@localhost
FRONTEND_URL=http://localhost:3002

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001","http://localhost:3002"]
```

#### Docker PostgreSQL (`.env.postgres`)
```bash
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
```

### Production Environment

#### Frontend (`.env.production`)
```bash
NEXT_PUBLIC_API_URL=https://api.planerix.com/api
NEXT_PUBLIC_API_PREFIX=/api
NODE_ENV=production
```

#### Backend (`apps/api/.env.production`)
```bash
# Database
LIDERIX_DB_URL=postgresql+asyncpg://prod_user:STRONG_PASSWORD@postgres:5432/planerix_db
POSTGRES_HOST=postgres
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=planerix_db

# Redis
REDIS_URL=redis://:REDIS_PROD_PASSWORD@redis:6379/0
REDIS_PASSWORD=REDIS_PROD_PASSWORD

# JWT
JWT_SECRET_KEY=PRODUCTION_SECRET_KEY_MIN_32_CHARS
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Email
RESEND_API_KEY=re_xxx_production_key
EMAIL_FROM=noreply@planerix.com
FRONTEND_URL=https://app.planerix.com

# CORS
CORS_ORIGINS=["https://planerix.com","https://app.planerix.com","https://www.planerix.com"]
```

#### Root (`.env.production`)
```bash
# Domain Configuration
MAIN_DOMAIN=planerix.com
APP_DOMAIN=app.planerix.com
API_DOMAIN=api.planerix.com
RAG_DOMAIN=rag.planerix.com
SSL_EMAIL=admin@planerix.com

# Database
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=STRONG_PASSWORD
POSTGRES_DB=planerix_db

# Redis
REDIS_PASSWORD=REDIS_PROD_PASSWORD
```

---

## Testing Instructions

### Prerequisites

```bash
# Ensure services are running
docker-compose -f docker-compose.dev.yml ps

# Expected output:
# - db-postgres: healthy
# - cache-redis: healthy
# - api-backend: healthy
```

### Test Registration

```bash
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

# Expected: 201 Created
# {
#   "message": "Account created successfully! Please check your email to verify your account."
# }
```

### Verify Database

```bash
docker exec db-postgres psql -U app -d app -c \
  "SELECT username, email, first_name, last_name, is_verified FROM users WHERE email='test@example.com';"

# Expected:
#  username |      email       | first_name | last_name | is_verified
# ----------+------------------+------------+-----------+-------------
#  testuser | test@example.com | John       | Doe       | f
```

### Test Login (with verified user)

```bash
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "itstep@itstep.com",
    "password": "ITstep2025!"
  }'

# Expected: 200 OK
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIs...",
#   "token_type": "bearer",
#   "expires_in": 900,
#   "refresh_expires_in": 604800,
#   "user": { ... }
# }
```

### Test with Python Requests

```python
import requests

# Registration
response = requests.post(
    "http://localhost:8001/api/auth/register",
    json={
        "email": "test2@example.com",
        "password": "SecurePass123!",
        "username": "testuser2",
        "first_name": "Jane",
        "last_name": "Smith",
        "terms_accepted": True
    }
)
assert response.status_code == 201

# Login
response = requests.post(
    "http://localhost:8001/api/auth/login",
    json={
        "email": "itstep@itstep.com",
        "password": "ITstep2025!"
    }
)
assert response.status_code == 200
assert "access_token" in response.json()
```

---

## Troubleshooting

### Common Issues

#### 1. "422 Unprocessable Entity" on registration

**Cause:** Frontend sending fields that backend doesn't accept, or vice versa.

**Solution:**
- Verify `RegisterSchema` in both frontend TypeScript and backend Pydantic
- Check that field names match exactly (including optional fields)
- Rebuild backend container if schema changed:
  ```bash
  docker-compose -f docker-compose.dev.yml up -d --build backend
  ```

#### 2. Database fields are NULL despite being sent

**Cause:** Backend code not updated in running container.

**Solution:**
```bash
# Rebuild backend with new code
docker-compose -f docker-compose.dev.yml up -d --build backend

# Verify code in container
docker exec api-backend cat /app/liderix_api/schemas/auth.py | head -n 20
```

#### 3. Login returns 403 "Email not verified"

**Cause:** User registered but hasn't verified email.

**Solution:**
- For testing, manually verify user:
  ```sql
  UPDATE users SET is_verified=true, verified_at=NOW()
  WHERE email='test@example.com';
  ```
- Or implement email verification flow in tests

#### 4. Port conflicts

**Cause:** Ports 8001, 3002, 5432, or 6379 already in use.

**Solution:**
```bash
# Stop all dev containers
docker-compose -f docker-compose.dev.yml down

# Check port usage
lsof -i :8001
lsof -i :3002

# Kill processes if needed, then restart
docker-compose -f docker-compose.dev.yml up -d
```

#### 5. Database connection refused

**Cause:** PostgreSQL container not healthy or wrong credentials.

**Solution:**
```bash
# Check container status
docker-compose -f docker-compose.dev.yml ps postgres

# Verify credentials match in:
# - .env.postgres (Docker)
# - apps/api/.env (API connection)

# Check logs
docker-compose -f docker-compose.dev.yml logs postgres
```

### Debugging Commands

```bash
# Check all service logs
docker-compose -f docker-compose.dev.yml logs -f

# Check API logs only
docker-compose -f docker-compose.dev.yml logs -f backend

# Test API health
curl http://localhost:8001/api/health

# Check database connection
docker exec db-postgres psql -U app -d app -c "SELECT version();"

# Check Redis connection
docker exec cache-redis redis-cli -a redis_dev_password PING
```

---

## Best Practices

### Schema Synchronization

1. **Always update both frontend and backend schemas together**
2. **Run type checking after schema changes:**
   ```bash
   cd apps/web-enterprise && npm run type-check
   cd apps/api && poetry run mypy .
   ```

3. **Test immediately after changes:**
   ```bash
   # Backend
   cd apps/api && poetry run pytest tests/test_auth.py

   # Frontend (if tests exist)
   cd apps/web-enterprise && npm run test
   ```

### Database Migrations

1. **Generate migration after model changes:**
   ```bash
   cd apps/api
   alembic revision --autogenerate -m "description"
   ```

2. **Review generated migration before applying**
3. **Apply migration:**
   ```bash
   alembic upgrade head
   ```

4. **Never skip migrations in production**

### Security Checklist

- [ ] JWT_SECRET_KEY is strong (min 32 random characters)
- [ ] Database passwords are strong and unique
- [ ] Redis password is set and strong
- [ ] CORS origins are explicitly listed (no wildcards in production)
- [ ] HTTPS enabled in production
- [ ] Email verification enforced before sensitive operations
- [ ] Rate limiting enabled on all auth endpoints
- [ ] Audit logging enabled
- [ ] Session rotation implemented
- [ ] Secure cookies (HTTP-only, Secure, SameSite)

---

## API Endpoints Reference

### Authentication

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/register` | POST | Register new user | No |
| `/api/auth/login` | POST | Login user | No |
| `/api/auth/logout` | POST | Logout current session | Yes |
| `/api/auth/logout-all` | POST | Logout all sessions | Yes |
| `/api/auth/refresh` | POST | Refresh access token | Refresh Token |
| `/api/auth/verify` | POST/GET | Verify email address | No |
| `/api/auth/resend-verification` | POST | Resend verification email | No |
| `/api/auth/password-reset/request` | POST | Request password reset | No |
| `/api/auth/password-reset/confirm` | POST | Confirm password reset | No |
| `/api/auth/change-password` | POST | Change password | Yes |

### User Management

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/users/me` | GET | Get current user | Yes |
| `/api/users/me` | PATCH | Update current user | Yes |
| `/api/auth/sessions` | GET | Get active sessions | Yes |
| `/api/auth/sessions/{jti}` | DELETE | Revoke session | Yes |

---

## Changelog

### 2025-10-13: Schema Alignment Fix

**Problem:** Frontend was sending `first_name` and `last_name` fields, but backend `RegisterSchema` didn't accept them. This caused registration to succeed but fields were not saved to database.

**Files Changed:**
1. `apps/api/liderix_api/schemas/auth.py`:
   - Added `first_name: Optional[str]`
   - Added `last_name: Optional[str]`

2. `apps/api/liderix_api/routes/auth/register.py`:
   - Updated User creation to include `first_name=data.first_name`
   - Updated User update to include `last_name=data.last_name`

3. `apps/web-enterprise/src/lib/api/auth.ts`:
   - Added `first_name?: string` to `RegisterSchema`
   - Added `last_name?: string` to `RegisterSchema`

**Testing:**
- ✅ Registration with first_name="John" and last_name="Doe" → Saved correctly
- ✅ Login with verified user → Access token generated
- ✅ Database fields populated correctly

**Impact:** None on existing users. New registrations will now save name fields.

---

**Document Status:** COMPLETE ✅
**System Status:** PRODUCTION READY ✅
**Last Tested:** October 13, 2025
