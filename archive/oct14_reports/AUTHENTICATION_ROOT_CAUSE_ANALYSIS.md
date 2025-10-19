# Authentication Root Cause Analysis - October 15, 2025

## 🔍 Problem Summary

**User Report**: "Белый экран после логина" (White screen after login)

**Frequency**: Recurring issue despite multiple fixes

**Impact**: Critical - blocks user access to the application

---

## 🧬 Root Cause Analysis

### Primary Cause: Token Lifecycle Management

The authentication system is working **correctly as designed**, but the issue stems from **token expiration in production** combined with **insufficient frontend error handling**.

### Technical Breakdown

#### 1. Token Architecture (Working Correctly ✅)

**Access Token**:
- **Lifespan**: 900 seconds (15 minutes)
- **Storage**: Memory/localStorage (frontend)
- **Purpose**: API authentication

**Refresh Token**:
- **Lifespan**: 2,592,000 seconds (30 days / 720 hours)
- **Storage**: HTTP-only secure cookie (`lrx_refresh`)
- **Purpose**: Access token renewal

**Token Rotation** (Security Feature):
```python
# apps/api/liderix_api/routes/auth/refresh.py:256
# Every refresh generates NEW tokens and invalidates OLD ones
await token_whitelist.remove(sub, jti)  # Remove old token
new_access_jti = str(uuid4())           # Generate new access JTI
new_refresh_jti = str(uuid4())          # Generate new refresh JTI
```

#### 2. Why Tokens Expire

**Scenario 1: Long Inactivity**
```
User last login: Oct 5, 2025
Current date: Oct 15, 2025 (10 days later)
→ Access token expired (15 min max)
→ Refresh token VALID (30 days)
→ Frontend should auto-refresh
```

**Scenario 2: Token Revocation (Security)**
```python
# apps/api/liderix_api/routes/auth/refresh.py:173-185
# Replay attack detection
if not await token_whitelist.exists(sub, jti):
    # Token reuse detected → Security violation
    await token_whitelist.remove_all_user_tokens(sub)
    AuthError.problem(401, "urn:problem:refresh-revoked",
                     "Refresh Token Revoked",
                     "Security violation detected. Please login again.")
```

**Scenario 3: Code Deployment**
```
1. Backend container rebuilt (new code)
2. Redis cache cleared (token whitelist lost)
3. All existing refresh tokens invalidated
→ Users get 401 errors on next refresh attempt
```

#### 3. Frontend Behavior (THE ACTUAL PROBLEM ❌)

**Current Implementation**:
```typescript
// apps/web-enterprise/src/contexts/auth-context.tsx
// When refresh fails → Frontend shows WHITE SCREEN
// NO error message, NO redirect to login, NO user feedback
```

**What Should Happen**:
```typescript
// When refresh fails:
1. Clear invalid tokens from browser storage
2. Redirect to login page with message: "Session expired, please login again"
3. Log error details for debugging
4. Show user-friendly error message
```

---

## 📊 Evidence from Logs

### Production Logs (Oct 15, 06:27 UTC)

```bash
ERROR: Database session error: 401: {
  'type': 'urn:problem:invalid-credentials',
  'title': 'Invalid Credentials',
  'detail': 'Incorrect email or password'
}

ERROR: Database session error: 401: {
  'type': 'urn:problem:refresh-revoked',
  'title': 'Refresh Token Revoked',
  'detail': 'Security violation detected. Please login again.'
}

INFO: POST /api/auth/login → 401 Unauthorized
INFO: POST /api/auth/refresh → 401 Unauthorized
```

**Analysis**:
1. First error: User tried wrong credentials OR token expired
2. Second error: Refresh token was revoked (replay detection OR not in whitelist)
3. Frontend received 401 → showed white screen instead of login form

---

## 🎯 The Real Problem

### It's Not the Backend Authentication System

The backend is working exactly as designed:
- ✅ Tokens have proper expiration
- ✅ Security measures (rotation, whitelist, replay detection) working
- ✅ Error responses are correct and detailed
- ✅ Cookie settings are secure and correct

### It's the Frontend Error Handling

**Missing**:
1. **Automatic token refresh on 401**: Frontend doesn't automatically call `/auth/refresh` when access token expires
2. **Graceful degradation**: When refresh fails, should redirect to login, not white screen
3. **Token cleanup**: Should clear invalid tokens from browser storage
4. **User feedback**: Should show "Session expired" message, not blank page
5. **Retry logic**: Should attempt refresh before giving up

**Frontend Flow Should Be**:
```
1. User visits app → Check for refresh cookie
2. If no refresh cookie → Redirect to login
3. If refresh cookie exists → Call /auth/refresh
4. If refresh succeeds → Get new access token → Load app
5. If refresh fails (401) → Clear cookies → Redirect to login with message
6. During app use → On any 401 → Try refresh → If fails → Redirect to login
```

---

## 🔧 Configuration Analysis

### Production Configuration (Correct ✅)

**File**: `/opt/MONOREPv3/apps/api/.env.production`

```bash
# Token Lifespans
ACCESS_TTL_SEC=900           # 15 minutes ✅
REFRESH_TTL_SEC=2592000      # 30 days ✅

# Cookie Settings
COOKIE_DOMAIN=.planerix.com  # ✅ Works for app.planerix.com
COOKIE_SECURE=true           # ✅ HTTPS only
COOKIE_SAMESITE=lax          # ✅ Allows cross-subdomain

# CORS Settings
CORS_ALLOW_ORIGINS=["https://app.planerix.com",...] # ✅ Correct
CORS_ALLOW_CREDENTIALS=true  # ✅ Allows cookies

# Redis (Token Whitelist)
REDIS_URL=redis://redis:6379/0  # ✅ Working
```

**All backend configuration is correct** ✅

---

## 🚨 Why This Keeps Happening

### Previous "Fixes" Only Addressed Symptoms

**Pattern**:
1. User reports: "Login doesn't work"
2. We fix: Backend code, environment variables, CORS, cookies
3. **We don't fix**: Frontend error handling and token refresh logic
4. Issue "resolved" temporarily
5. User goes inactive for a few days
6. Tokens expire → Issue returns

**The Real Issue**:
- Backend is solid and secure
- Frontend lacks proper authentication flow
- When tokens expire (normal behavior), frontend doesn't handle it gracefully

---

## ✅ Complete Solution Plan

### Phase 1: Frontend Token Refresh Logic (CRITICAL)

**File**: `apps/web-enterprise/src/contexts/auth-context.tsx`

**Changes Needed**:

1. **Auto-refresh on mount**:
```typescript
useEffect(() => {
  // On app load, try to refresh token
  const initAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAccessToken(data.access_token)
        await fetchCurrentUser(data.access_token)
      } else {
        // Refresh failed → Clear everything and redirect to login
        clearAuthState()
        router.push('/login?reason=session_expired')
      }
    } catch (error) {
      console.error('Auth init failed:', error)
      clearAuthState()
      router.push('/login?reason=error')
    }
  }

  initAuth()
}, [])
```

2. **Retry logic for 401 errors**:
```typescript
// API interceptor
const apiClient = async (url: string, options: RequestInit = {}) => {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  })

  // If 401, try to refresh token once
  if (response.status === 401 && !options.headers?.['X-Retry-After-Refresh']) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })

    if (refreshResponse.ok) {
      const { access_token } = await refreshResponse.json()
      setAccessToken(access_token)

      // Retry original request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${access_token}`,
          'X-Retry-After-Refresh': 'true'
        }
      })
    } else {
      // Refresh failed → Logout
      clearAuthState()
      router.push('/login?reason=session_expired')
    }
  }

  return response
}
```

3. **Clear invalid tokens**:
```typescript
const clearAuthState = () => {
  // Clear access token from memory
  setAccessToken(null)
  setUser(null)

  // Clear any localStorage
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')

  // Note: Refresh cookie is HTTP-only, cleared by backend
}
```

### Phase 2: Improved Error Messages

**File**: `apps/web-enterprise/src/app/login/page.tsx`

**Add query param handling**:
```typescript
const LoginPage = () => {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')

  const errorMessages = {
    session_expired: 'Your session has expired. Please login again.',
    token_revoked: 'Your session was revoked for security reasons. Please login again.',
    error: 'An error occurred. Please try logging in again.',
    unauthorized: 'Please login to continue.'
  }

  return (
    <div>
      {reason && (
        <Alert variant="warning">
          {errorMessages[reason] || 'Please login to continue.'}
        </Alert>
      )}
      {/* Login form */}
    </div>
  )
}
```

### Phase 3: Backend Token Persistence Across Deployments

**Problem**: Redis cache is cleared on container restart → All tokens invalidated

**Solution**: Use Redis persistence

**File**: `docker-compose.prod.yml`

```yaml
redis:
  image: redis:7-alpine
  container_name: planerix-redis-prod
  restart: unless-stopped
  command: redis-server --save 60 1 --loglevel warning --requirepass ${REDIS_PASSWORD}
  volumes:
    - redis_data:/data  # ✅ Persist token whitelist across restarts
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
```

**Add to volumes section**:
```yaml
volumes:
  redis_data:
    driver: local
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] **Frontend**: Verify token refresh logic implemented
- [ ] **Frontend**: Test token expiration handling (set ACCESS_TTL_SEC=60 for testing)
- [ ] **Backend**: Verify Redis persistence configured
- [ ] **Backend**: Check all environment variables present in `.env.production`
- [ ] **Docker**: Verify volume mounts for Redis data persistence

### Deployment Steps

1. **Pull latest code**:
   ```bash
   ssh root@65.108.220.33
   cd /opt/MONOREPv3
   git pull origin develop
   ```

2. **Rebuild containers** (ALWAYS use --no-cache for Python/Node code changes):
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml build --no-cache api web
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify Redis persistence**:
   ```bash
   docker volume inspect monorepo_redis_data
   ```

4. **Check container health**:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

5. **Test authentication flow**:
   ```bash
   # Test login
   curl -X POST https://api.planerix.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"itstep@itstep.com","password":"ITstep2025!"}' \
     -c cookies.txt -v

   # Test refresh (with cookies from login)
   curl -X POST https://api.planerix.com/api/auth/refresh \
     -b cookies.txt -v

   # Verify access token works
   curl -X GET https://api.planerix.com/api/users/me \
     -H "Authorization: Bearer <ACCESS_TOKEN>"
   ```

### Post-Deployment Verification

- [ ] Can login successfully in browser
- [ ] Access token refresh works automatically
- [ ] When manually clearing cookies → Redirects to login (not white screen)
- [ ] After 15+ minutes of inactivity → Auto-refresh works
- [ ] Check logs for 401 errors: `docker-compose -f docker-compose.prod.yml logs --tail=100 api | grep 401`

---

## 🎯 Summary

### The Problem Wasn't Authentication

- ✅ Backend JWT system is secure and correct
- ✅ Token rotation and security measures working as designed
- ✅ Environment variables properly configured
- ✅ CORS and cookies working correctly

### The Problem IS Frontend Error Handling

- ❌ No automatic token refresh on 401
- ❌ No graceful handling of expired tokens
- ❌ White screen instead of redirect to login
- ❌ No user feedback when session expires

### The Fix

1. **Add frontend token refresh logic** (auth-context.tsx)
2. **Add API retry interceptor** for 401 errors
3. **Add Redis persistence** to survive deployments
4. **Add user-friendly error messages** on login page
5. **Test token expiration** before deploying

---

## 🚀 Next Steps

1. Implement frontend changes (auth-context.tsx, api interceptor)
2. Add Redis persistence to docker-compose.prod.yml
3. Test locally with short token lifespans (ACCESS_TTL_SEC=60)
4. Deploy to production with full verification checklist
5. Monitor for 24 hours to confirm no white screen issues

---

**Date**: October 15, 2025
**Status**: Root cause identified - Frontend error handling needs implementation
**Priority**: CRITICAL - Blocks user access
**Estimated Fix Time**: 2-3 hours of frontend development + testing
