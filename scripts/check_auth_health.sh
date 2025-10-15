#!/bin/bash

# ============================================================================
# Authentication System Health Check Script
# ============================================================================
# Purpose: Comprehensive health check for authentication system
# Usage: ./scripts/check_auth_health.sh [production|local]
# Author: Claude Code
# Date: October 15, 2025
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment
ENV=${1:-production}

if [ "$ENV" = "production" ]; then
    API_URL="https://api.planerix.com/api"
    WEB_URL="https://app.planerix.com"
    SSH_HOST="root@65.108.220.33"
    SSH_KEY="~/.ssh/id_ed25519_hetzner"
    PROJECT_DIR="/opt/MONOREPv3"
else
    API_URL="http://localhost:8001/api"
    WEB_URL="http://localhost:3002"
    SSH_HOST=""
    SSH_KEY=""
    PROJECT_DIR="$(pwd)"
fi

TEST_EMAIL="${TEST_EMAIL:-itstep@itstep.com}"
TEST_PASSWORD="${TEST_PASSWORD:-ITstep2025!}"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Authentication Health Check - $ENV${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# ============================================================================
# Helper Functions
# ============================================================================

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    echo -e "   ${RED}Details: $2${NC}"
    ((TESTS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# Test 1: Container Health (Production Only)
# ============================================================================

if [ "$ENV" = "production" ]; then
    section "1. Container Health Check"

    # Check API container
    API_STATUS=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps api --format json | jq -r '.[0].Health // .[0].Status'" 2>/dev/null || echo "error")

    if [[ "$API_STATUS" == *"healthy"* ]] || [[ "$API_STATUS" == *"running"* ]]; then
        pass "API container is $API_STATUS"
    else
        fail "API container status: $API_STATUS" "Container may be down or unhealthy"
    fi

    # Check Web container
    WEB_STATUS=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps web --format json | jq -r '.[0].Health // .[0].Status'" 2>/dev/null || echo "error")

    if [[ "$WEB_STATUS" == *"healthy"* ]] || [[ "$WEB_STATUS" == *"running"* ]]; then
        pass "Web container is $WEB_STATUS"
    else
        fail "Web container status: $WEB_STATUS" "Container may be down or unhealthy"
    fi

    # Check Redis container
    REDIS_STATUS=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml ps redis --format json | jq -r '.[0].Health // .[0].Status'" 2>/dev/null || echo "error")

    if [[ "$REDIS_STATUS" == *"healthy"* ]] || [[ "$REDIS_STATUS" == *"running"* ]]; then
        pass "Redis container is $REDIS_STATUS"
    else
        fail "Redis container status: $REDIS_STATUS" "Redis is required for token whitelist"
    fi

    # Check Redis persistence
    REDIS_VOLUME=$(ssh -i $SSH_KEY $SSH_HOST "docker volume inspect monorepo_redis_data 2>/dev/null | jq -r '.[0].Mountpoint'" || echo "none")

    if [ "$REDIS_VOLUME" != "none" ]; then
        pass "Redis persistence is configured at $REDIS_VOLUME"
    else
        warn "Redis persistence not configured - tokens will be lost on restart"
    fi
fi

# ============================================================================
# Test 2: Environment Configuration
# ============================================================================

section "2. Environment Configuration"

if [ "$ENV" = "production" ]; then
    # Check JWT configuration
    JWT_SECRET=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && grep -E '^SECRET_KEY=' apps/api/.env.production | cut -d'=' -f2" 2>/dev/null || echo "")

    if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -ge 32 ]; then
        pass "JWT secret is configured (length: ${#JWT_SECRET})"
    else
        fail "JWT secret is missing or too short" "Must be at least 32 characters"
    fi

    # Check token TTLs
    ACCESS_TTL=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && grep -E '^ACCESS_TTL_SEC=' apps/api/.env.production | cut -d'=' -f2" 2>/dev/null || echo "0")
    REFRESH_TTL=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && grep -E '^REFRESH_TTL_SEC=' apps/api/.env.production | cut -d'=' -f2" 2>/dev/null || echo "0")

    if [ "$ACCESS_TTL" -ge 300 ] && [ "$ACCESS_TTL" -le 3600 ]; then
        pass "Access token TTL: ${ACCESS_TTL}s ($(($ACCESS_TTL / 60)) minutes)"
    else
        warn "Access token TTL: ${ACCESS_TTL}s - Recommended: 300-3600s"
    fi

    if [ "$REFRESH_TTL" -ge 86400 ] && [ "$REFRESH_TTL" -le 2592000 ]; then
        pass "Refresh token TTL: ${REFRESH_TTL}s ($(($REFRESH_TTL / 86400)) days)"
    else
        warn "Refresh token TTL: ${REFRESH_TTL}s - Recommended: 86400-2592000s (1-30 days)"
    fi

    # Check cookie configuration
    COOKIE_DOMAIN=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && grep -E '^COOKIE_DOMAIN=' apps/api/.env.production | cut -d'=' -f2" 2>/dev/null || echo "")
    COOKIE_SECURE=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && grep -E '^COOKIE_SECURE=' apps/api/.env.production | cut -d'=' -f2" 2>/dev/null || echo "false")

    if [ "$COOKIE_DOMAIN" = ".planerix.com" ]; then
        pass "Cookie domain: $COOKIE_DOMAIN (works for all subdomains)"
    else
        warn "Cookie domain: $COOKIE_DOMAIN - Should be .planerix.com for subdomains"
    fi

    if [ "$COOKIE_SECURE" = "true" ]; then
        pass "Secure cookies enabled (HTTPS only)"
    else
        fail "Secure cookies disabled" "Must be 'true' in production"
    fi

    # Check CORS configuration
    CORS_ORIGINS=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && grep -E '^CORS_ALLOW_ORIGINS=' apps/api/.env.production | cut -d'=' -f2" 2>/dev/null || echo "[]")

    if [[ "$CORS_ORIGINS" == *"app.planerix.com"* ]]; then
        pass "CORS allows app.planerix.com"
    else
        fail "CORS configuration missing app.planerix.com" "Frontend will be blocked"
    fi
fi

# ============================================================================
# Test 3: API Endpoints Availability
# ============================================================================

section "3. API Endpoints Availability"

# Test health endpoint
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    pass "Health endpoint: HTTP $HEALTH_STATUS"
else
    fail "Health endpoint: HTTP $HEALTH_STATUS" "API may be down"
fi

# Test login endpoint (without credentials)
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")

if [ "$LOGIN_STATUS" = "422" ] || [ "$LOGIN_STATUS" = "400" ]; then
    pass "Login endpoint: HTTP $LOGIN_STATUS (validation working)"
elif [ "$LOGIN_STATUS" = "200" ]; then
    warn "Login endpoint: HTTP $LOGIN_STATUS (accepted empty payload?)"
else
    fail "Login endpoint: HTTP $LOGIN_STATUS" "Should return 422 for invalid payload"
fi

# Test refresh endpoint (without cookie)
REFRESH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/refresh" 2>/dev/null || echo "000")

if [ "$REFRESH_STATUS" = "401" ]; then
    pass "Refresh endpoint: HTTP $REFRESH_STATUS (correctly rejects missing token)"
else
    fail "Refresh endpoint: HTTP $REFRESH_STATUS" "Should return 401 without cookie"
fi

# ============================================================================
# Test 4: Full Authentication Flow
# ============================================================================

section "4. Full Authentication Flow"

# Create temp files for cookies and responses
COOKIE_FILE=$(mktemp)
LOGIN_RESPONSE=$(mktemp)
REFRESH_RESPONSE=$(mktemp)
USER_RESPONSE=$(mktemp)

# Test login
info "Testing login with $TEST_EMAIL..."
LOGIN_HTTP=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    -c "$COOKIE_FILE" \
    -o "$LOGIN_RESPONSE" 2>/dev/null || echo "000")

if [ "$LOGIN_HTTP" = "200" ]; then
    pass "Login successful: HTTP 200"

    # Extract access token
    ACCESS_TOKEN=$(jq -r '.access_token // empty' "$LOGIN_RESPONSE" 2>/dev/null || echo "")

    if [ -n "$ACCESS_TOKEN" ]; then
        pass "Access token received (length: ${#ACCESS_TOKEN})"
    else
        fail "Access token missing in response" "$(cat $LOGIN_RESPONSE)"
    fi

    # Check for refresh cookie
    if grep -q "lrx_refresh" "$COOKIE_FILE"; then
        pass "Refresh cookie set (lrx_refresh)"

        # Verify cookie attributes
        COOKIE_ATTRS=$(grep "lrx_refresh" "$COOKIE_FILE")
        if [[ "$COOKIE_ATTRS" == *"HttpOnly"* ]] || [[ "$ENV" = "production" ]]; then
            pass "Refresh cookie has HttpOnly attribute"
        else
            warn "Refresh cookie missing HttpOnly attribute (check in browser)"
        fi
    else
        fail "Refresh cookie not set" "Cookie name should be 'lrx_refresh'"
    fi

    # Test user endpoint with access token
    if [ -n "$ACCESS_TOKEN" ]; then
        info "Testing /users/me with access token..."
        USER_HTTP=$(curl -s -w "%{http_code}" "$API_URL/users/me" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -o "$USER_RESPONSE" 2>/dev/null || echo "000")

        if [ "$USER_HTTP" = "200" ]; then
            pass "User endpoint: HTTP 200 (access token valid)"

            USER_EMAIL=$(jq -r '.email // empty' "$USER_RESPONSE" 2>/dev/null || echo "")
            if [ "$USER_EMAIL" = "$TEST_EMAIL" ]; then
                pass "User data correct: $USER_EMAIL"
            else
                warn "User email mismatch: got '$USER_EMAIL', expected '$TEST_EMAIL'"
            fi
        else
            fail "User endpoint: HTTP $USER_HTTP" "Access token may be invalid"
        fi
    fi

    # Test token refresh
    if grep -q "lrx_refresh" "$COOKIE_FILE"; then
        info "Testing token refresh..."
        REFRESH_HTTP=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/refresh" \
            -b "$COOKIE_FILE" \
            -c "$COOKIE_FILE" \
            -o "$REFRESH_RESPONSE" 2>/dev/null || echo "000")

        if [ "$REFRESH_HTTP" = "200" ]; then
            pass "Token refresh: HTTP 200"

            NEW_ACCESS_TOKEN=$(jq -r '.access_token // empty' "$REFRESH_RESPONSE" 2>/dev/null || echo "")

            if [ -n "$NEW_ACCESS_TOKEN" ] && [ "$NEW_ACCESS_TOKEN" != "$ACCESS_TOKEN" ]; then
                pass "New access token received (token rotation working)"
            elif [ "$NEW_ACCESS_TOKEN" = "$ACCESS_TOKEN" ]; then
                warn "Access token unchanged after refresh (rotation may not be working)"
            else
                fail "New access token missing" "$(cat $REFRESH_RESPONSE)"
            fi
        else
            fail "Token refresh: HTTP $REFRESH_HTTP" "$(cat $REFRESH_RESPONSE)"
        fi
    fi

elif [ "$LOGIN_HTTP" = "401" ]; then
    fail "Login failed: HTTP 401" "Invalid credentials or user not verified"
    info "Response: $(cat $LOGIN_RESPONSE)"
elif [ "$LOGIN_HTTP" = "423" ]; then
    fail "Login failed: HTTP 423" "Account is locked"
    info "Response: $(cat $LOGIN_RESPONSE)"
else
    fail "Login failed: HTTP $LOGIN_HTTP" "$(cat $LOGIN_RESPONSE)"
fi

# Cleanup temp files
rm -f "$COOKIE_FILE" "$LOGIN_RESPONSE" "$REFRESH_RESPONSE" "$USER_RESPONSE"

# ============================================================================
# Test 5: Redis Token Whitelist
# ============================================================================

if [ "$ENV" = "production" ]; then
    section "5. Redis Token Whitelist"

    # Check Redis connection
    REDIS_PING=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a lashd87123kKJSDAH81 ping" 2>/dev/null || echo "ERROR")

    if [ "$REDIS_PING" = "PONG" ]; then
        pass "Redis connection: PONG"
    else
        fail "Redis connection failed" "Token whitelist will not work"
    fi

    # Check for refresh tokens in whitelist
    TOKEN_COUNT=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a lashd87123kKJSDAH81 --scan --pattern 'refresh_whitelist:*' | wc -l" 2>/dev/null || echo "0")

    if [ "$TOKEN_COUNT" -gt 0 ]; then
        pass "Active refresh tokens in whitelist: $TOKEN_COUNT"
    else
        warn "No refresh tokens in whitelist (all users will need to re-login)"
    fi
fi

# ============================================================================
# Test 6: Frontend Configuration
# ============================================================================

section "6. Frontend Configuration"

# Test frontend loads
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" 2>/dev/null || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    pass "Frontend loads: HTTP 200"
else
    fail "Frontend status: HTTP $FRONTEND_STATUS" "May be down or misconfigured"
fi

# Test login page
LOGIN_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/login" 2>/dev/null || echo "000")

if [ "$LOGIN_PAGE_STATUS" = "200" ]; then
    pass "Login page loads: HTTP 200"
else
    fail "Login page status: HTTP $LOGIN_PAGE_STATUS" "Users cannot login"
fi

# ============================================================================
# Test 7: Recent Error Logs
# ============================================================================

if [ "$ENV" = "production" ]; then
    section "7. Recent Error Logs (Last 50 lines)"

    AUTH_ERRORS=$(ssh -i $SSH_KEY $SSH_HOST "cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml logs --tail=50 api | grep -E '(auth|401|403|token)'" 2>/dev/null || echo "")

    if [ -z "$AUTH_ERRORS" ]; then
        pass "No recent auth errors in logs"
    else
        ERROR_COUNT=$(echo "$AUTH_ERRORS" | wc -l)
        warn "Found $ERROR_COUNT auth-related log entries:"
        echo "$AUTH_ERRORS" | tail -5
    fi
fi

# ============================================================================
# Final Report
# ============================================================================

section "Test Summary"

echo ""
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}All tests passed! Authentication system is healthy.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Tests passed with warnings. Review above.${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}Tests failed! Review errors above.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
