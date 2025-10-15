# Production Deployment Checklist

## 🎯 Purpose

This checklist ensures zero-downtime deployments and prevents recurring authentication issues.

**CRITICAL**: Follow this checklist for EVERY deployment to production.

---

## 📋 Pre-Deployment Checklist

### 1. Code Quality & Testing

- [ ] All tests pass locally
  ```bash
  cd apps/api && pytest
  cd apps/web-enterprise && npm test
  ```

- [ ] Linting passes
  ```bash
  cd apps/api && ruff check .
  cd apps/web-enterprise && npm run lint
  ```

- [ ] Type checking passes
  ```bash
  cd apps/api && mypy .
  cd apps/web-enterprise && npm run type-check
  ```

- [ ] No commented-out code or debug statements
  ```bash
  # Check for common debug patterns
  grep -r "console.log" apps/web-enterprise/src/ || echo "✅ No console.log found"
  grep -r "import pdb" apps/api/ || echo "✅ No pdb imports found"
  ```

### 2. Environment Variables

- [ ] All required env vars present in `.env.production`
  ```bash
  # Check critical variables
  grep -E '^(SECRET_KEY|JWT_|POSTGRES_|REDIS_|CORS_|COOKIE_)' .env.production
  ```

- [ ] JWT secrets are strong (minimum 32 characters)
  ```bash
  SECRET_KEY=$(grep '^SECRET_KEY=' .env.production | cut -d'=' -f2)
  echo "Secret length: ${#SECRET_KEY} (must be >= 32)"
  ```

- [ ] Database credentials match between `.env.production` and `docker-compose.prod.yml`

- [ ] CORS origins include production domain
  ```bash
  grep 'CORS_ALLOW_ORIGINS' .env.production | grep "app.planerix.com"
  ```

- [ ] Cookie domain is correct (`.planerix.com` for all subdomains)
  ```bash
  grep 'COOKIE_DOMAIN=' .env.production
  ```

### 3. Database Migrations

- [ ] All migrations created
  ```bash
  cd apps/api && alembic check
  ```

- [ ] Migration files reviewed for safety (no data loss)

- [ ] Migrations tested locally
  ```bash
  alembic upgrade head
  alembic downgrade -1
  alembic upgrade head
  ```

### 4. Frontend Build

- [ ] Build succeeds locally
  ```bash
  cd apps/web-enterprise && npm run build
  ```

- [ ] No build warnings or errors

- [ ] Environment variables injected correctly
  ```bash
  grep 'NEXT_PUBLIC_API_URL' apps/web-enterprise/.env.production
  ```

### 5. Git & Version Control

- [ ] All changes committed
  ```bash
  git status  # Should show "nothing to commit"
  ```

- [ ] Commit message is descriptive
  ```bash
  git log -1 --pretty=format:"%s"
  ```

- [ ] Branch is up to date with main/develop
  ```bash
  git pull origin develop
  ```

- [ ] Changes pushed to remote
  ```bash
  git push origin develop
  ```

---

## 🚀 Deployment Steps

### Step 1: Backup Current State

```bash
# Connect to server
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33

cd /opt/MONOREPv3

# Backup database (IMPORTANT!)
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U manfromlamp liderixapp | gzip > ~/backups/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup environment files
cp .env.production .env.production.bak.$(date +%Y%m%d_%H%M%S)
cp apps/api/.env.production apps/api/.env.production.bak.$(date +%Y%m%d_%H%M%S)

# Backup Docker volumes (Redis data)
docker run --rm -v monorepo_redis_data:/data -v ~/backups:/backup \
  alpine tar czf /backup/redis_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

echo "✅ Backups completed"
```

- [ ] Database backup created
- [ ] Environment files backed up
- [ ] Redis data backed up

### Step 2: Pull Latest Code

```bash
# Verify current branch
git branch --show-current

# Pull latest changes
git fetch origin
git pull origin develop

# Verify latest commit
git log -1 --oneline

echo "✅ Code updated"
```

- [ ] Latest code pulled
- [ ] Commit hash matches expected deployment

### Step 3: Update Environment Variables (if needed)

```bash
# Compare environment files
diff .env.production .env.production.bak.$(date +%Y%m%d) || echo "No changes"

# If changes needed, edit carefully
vim .env.production

echo "✅ Environment variables updated"
```

- [ ] Environment variables reviewed
- [ ] No secrets exposed in git history

### Step 4: Run Database Migrations

```bash
# Check pending migrations
docker-compose -f docker-compose.prod.yml exec api alembic current
docker-compose -f docker-compose.prod.yml exec api alembic history

# Run migrations
docker-compose -f docker-compose.prod.yml exec api alembic upgrade head

# Verify migrations succeeded
docker-compose -f docker-compose.prod.yml exec api alembic current

echo "✅ Migrations completed"
```

- [ ] Migrations executed successfully
- [ ] Database schema version matches code

### Step 5: Rebuild Containers

**CRITICAL**: ALWAYS use `--no-cache` for API and Web containers to ensure code changes are applied.

```bash
# Stop containers
docker-compose -f docker-compose.prod.yml down

# Rebuild with no cache (IMPORTANT!)
docker-compose -f docker-compose.prod.yml build --no-cache api web

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Wait for containers to be healthy
sleep 30

echo "✅ Containers rebuilt and started"
```

- [ ] Containers stopped gracefully
- [ ] Build completed without errors
- [ ] Containers started successfully

### Step 6: Verify Container Health

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check container health
for container in api web postgres redis; do
    STATUS=$(docker-compose -f docker-compose.prod.yml ps $container --format json | jq -r '.[0].Health // .[0].Status')
    echo "$container: $STATUS"
done

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=50 api | grep -i error || echo "No errors"
docker-compose -f docker-compose.prod.yml logs --tail=50 web | grep -i error || echo "No errors"

echo "✅ Containers healthy"
```

- [ ] All containers show "healthy" or "running"
- [ ] No error messages in logs
- [ ] Containers not restarting

---

## ✅ Post-Deployment Verification

### 1. API Endpoints

```bash
# Test health endpoint
curl -f https://api.planerix.com/api/health

# Test authentication flow
./scripts/check_auth_health.sh production

echo "✅ API endpoints verified"
```

- [ ] Health endpoint returns 200
- [ ] Login endpoint works
- [ ] Token refresh works
- [ ] All analytics endpoints return 200

### 2. Frontend Pages

```bash
# Test key pages
for page in "" "/login" "/analytics/campaigns" "/analytics/ads"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://app.planerix.com${page}")
    echo "Page $page: HTTP $STATUS"
done

echo "✅ Frontend pages verified"
```

- [ ] Homepage loads (200)
- [ ] Login page loads (200)
- [ ] Analytics pages load (200)
- [ ] No 404 or 500 errors

### 3. Authentication Flow (Manual Browser Test)

**Open Incognito Window** and test:

- [ ] Can access https://app.planerix.com
- [ ] Redirects to /login if not authenticated
- [ ] Can login with test credentials
- [ ] Dashboard loads after login (no white screen)
- [ ] Can navigate between pages
- [ ] Can logout successfully
- [ ] After logout, redirects to login page

### 4. Token Refresh Test (Manual)

**In browser DevTools:**

1. Login successfully
2. Open Application → Cookies
3. Find `lrx_refresh` cookie
4. Verify cookie attributes:
   - [ ] HttpOnly: true
   - [ ] Secure: true
   - [ ] SameSite: Lax
   - [ ] Domain: .planerix.com
5. Wait 16+ minutes (access token expires)
6. Refresh page or make API call
7. Verify: No white screen, auto-refresh works

### 5. Database Verification

```bash
# Check database connection
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U manfromlamp -d liderixapp -c "SELECT COUNT(*) FROM users;"

# Check recent user activity
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U manfromlamp -d liderixapp -c \
  "SELECT email, last_login_at FROM users ORDER BY last_login_at DESC LIMIT 5;"

echo "✅ Database verified"
```

- [ ] Database accessible
- [ ] User data intact
- [ ] Recent activity shows

### 6. Redis Token Whitelist

```bash
# Check Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a lashd87123kKJSDAH81 ping

# Check token count
TOKEN_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T redis \
  redis-cli -a lashd87123kKJSDAH81 --scan --pattern 'refresh_whitelist:*' | wc -l)
echo "Active tokens: $TOKEN_COUNT"

# Check Redis persistence
docker volume inspect monorepo_redis_data | jq -r '.[0].Mountpoint'

echo "✅ Redis verified"
```

- [ ] Redis responds to ping
- [ ] Token whitelist has entries (after users login)
- [ ] Redis data volume is mounted

### 7. Monitor Logs for Errors (First 5 minutes)

```bash
# Watch logs in real-time
docker-compose -f docker-compose.prod.yml logs -f --tail=20 api web

# After 5 minutes, check for errors
docker-compose -f docker-compose.prod.yml logs --since=5m api | grep -i error
docker-compose -f docker-compose.prod.yml logs --since=5m web | grep -i error

echo "✅ No errors in logs"
```

- [ ] No 500 errors in API logs
- [ ] No uncaught exceptions
- [ ] No database connection errors
- [ ] No Redis connection errors

---

## 🚨 Rollback Procedure (If Issues Occur)

### Quick Rollback Steps

```bash
# 1. Stop current containers
docker-compose -f docker-compose.prod.yml down

# 2. Revert to previous commit
git log --oneline -5  # Find previous working commit
git checkout <previous-commit-hash>

# 3. Restore environment files
cp .env.production.bak.<timestamp> .env.production
cp apps/api/.env.production.bak.<timestamp> apps/api/.env.production

# 4. Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache api web
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify services
docker-compose -f docker-compose.prod.yml ps
curl -f https://api.planerix.com/api/health

echo "✅ Rollback completed"
```

### Database Rollback (If Migration Issues)

```bash
# Restore database from backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U manfromlamp -d liderixapp < ~/backups/db_<timestamp>.sql.gz

# OR rollback migration
docker-compose -f docker-compose.prod.yml exec api \
  alembic downgrade <previous-revision>

echo "✅ Database restored"
```

---

## 📊 Success Criteria

Deployment is considered successful when:

- ✅ All containers are healthy
- ✅ All API endpoints return expected status codes
- ✅ Frontend loads without errors
- ✅ Users can login successfully
- ✅ Token refresh works automatically
- ✅ No white screen on any page
- ✅ No errors in logs for 15 minutes post-deployment
- ✅ Database queries succeed
- ✅ Redis token whitelist operational

---

## 📝 Post-Deployment Report Template

```markdown
# Deployment Report - [Date]

## Summary
- **Deployed by**: [Name]
- **Deployment time**: [HH:MM UTC]
- **Commit hash**: [git hash]
- **Branch**: develop

## Changes Deployed
- [List of commits or features]

## Verification Results
- [ ] All containers healthy
- [ ] API endpoints: X/X passing
- [ ] Frontend pages: X/X loading
- [ ] Authentication: Working
- [ ] No errors in logs

## Issues Encountered
- [None / List issues]

## Actions Taken
- [Any manual interventions]

## Next Steps
- [Any follow-up tasks]

**Status**: ✅ SUCCESS / ⚠️ PARTIAL / ❌ FAILED (ROLLED BACK)
```

---

## 🔒 Security Checklist

After deployment, verify:

- [ ] JWT secrets not exposed in logs or public files
- [ ] Database credentials not in git history
- [ ] HTTPS enforced (no HTTP access)
- [ ] Secure cookies enabled (`COOKIE_SECURE=true`)
- [ ] CORS properly configured (no wildcard `*` in production)
- [ ] Rate limiting active on auth endpoints
- [ ] No debug mode enabled (`DEBUG=false`)
- [ ] No development secrets in production

---

## 📞 Emergency Contacts

If deployment fails:

1. **Rollback immediately** using procedure above
2. **Check logs**: `docker-compose -f docker-compose.prod.yml logs api web`
3. **Notify team**: Document issue with logs and steps taken
4. **Create incident report**: What failed, why, how to prevent

---

**Last Updated**: October 15, 2025
**Version**: 1.0
**Next Review**: After 3 successful deployments

---

## 📌 Quick Reference Commands

```bash
# Health check
./scripts/check_auth_health.sh production

# View logs
docker-compose -f docker-compose.prod.yml logs -f api web

# Container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api

# Rebuild single service
docker-compose -f docker-compose.prod.yml build --no-cache api
docker-compose -f docker-compose.prod.yml up -d api

# Database backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U manfromlamp liderixapp | gzip > ~/backups/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Redis check
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a lashd87123kKJSDAH81 ping
```
