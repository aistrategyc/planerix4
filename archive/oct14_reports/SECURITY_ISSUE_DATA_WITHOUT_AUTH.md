# CRITICAL SECURITY ISSUE - Data Accessible Without Authentication

## 🚨 SEVERITY: CRITICAL

**Discovered**: October 15, 2025
**Status**: REQUIRES IMMEDIATE FIX
**Impact**: High - Client data exposed publicly

---

## 📋 Issue Description

### Problem

**ALL analytics endpoints are currently accessible WITHOUT authentication**, exposing sensitive client data (ITstep) to anyone with the API URL.

### Evidence

```bash
# TEST: Access analytics without any authentication
$ curl "https://api.planerix.com/api/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14"

# RESULT: HTTP 200 with full client data
{
  "campaigns": [
    {
      "platform": "google",
      "campaign_id": "20317544053",
      "campaign_name": "Performance Max - ПКО 2025",
      "cost": 24164.90,          # ❌ EXPOSED
      "impressions": 61865,       # ❌ EXPOSED
      "clicks": 2090,             # ❌ EXPOSED
      "leads": 23,                # ❌ EXPOSED
      "contracts": 4,             # ❌ EXPOSED
      "revenue": 272412.0         # ❌ EXPOSED
    }
  ]
}
```

**This is HIGHLY SENSITIVE business data** accessible to anyone without login!

---

## 🔍 Root Cause Analysis

### Files Affected

All endpoints in these files are missing authentication:

1. **`apps/api/liderix_api/routes/analytics/marketing_v6.py`** (8 endpoints)
   - `/campaigns` ❌
   - `/creatives` ❌
   - `/channels-sources` ❌
   - `/crm-outcomes` ❌
   - `/attribution-funnel` ❌
   - `/product-performance` ❌
   - `/data-quality` ❌

2. **`apps/api/liderix_api/routes/analytics/dashboard.py`** (2 endpoints)
   - `/overview/kpis` ❌
   - `/overview/realtime` ❌

3. **`apps/api/liderix_api/routes/analytics/sales.py`** (3 endpoints)
   - `/sales/revenue-trend` ❌
   - `/sales/contracts-detail` ❌
   - `/sales/funnel` ❌

4. **`apps/api/liderix_api/routes/data_analytics/campaigns.py`** (3 endpoints)
   - `/campaigns/performance` ❌
   - `/campaigns/wow` ❌
   - `/campaigns/trends` ❌

### Why This Happened

**Example of current endpoint (NO authentication)**:
```python
# apps/api/liderix_api/routes/analytics/marketing_v6.py:20
@router.get("/campaigns")
async def get_campaigns(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: AsyncSession = Depends(get_itstep_session)  # ❌ NO AUTH CHECK
):
    # Returns sensitive data to ANYONE
    return {"campaigns": [...]}
```

**What's missing**: `current_user: User = Depends(get_current_user)`

---

## 🎯 Required Fix

### Add Authentication to ALL Analytics Endpoints

**BEFORE** (insecure):
```python
@router.get("/campaigns")
async def get_campaigns(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: AsyncSession = Depends(get_itstep_session)
):
    # Anyone can access
    return data
```

**AFTER** (secure):
```python
from liderix_api.services.auth import get_current_user
from liderix_api.models.users import User

@router.get("/campaigns")
async def get_campaigns(
    date_from: str = Query(...),
    date_to: str = Query(...),
    current_user: User = Depends(get_current_user),  # ✅ REQUIRED
    db: AsyncSession = Depends(get_itstep_session)
):
    # Only authenticated users can access
    # Future: Filter data by current_user.organization_id
    return data
```

---

## 🔒 Complete Solution

### Phase 1: Add Authentication (IMMEDIATE)

**Step 1**: Add authentication dependency to all endpoints

```python
# apps/api/liderix_api/routes/analytics/marketing_v6.py
from liderix_api.services.auth import get_current_user
from liderix_api.models.users import User

# Add to EVERY endpoint
current_user: User = Depends(get_current_user)
```

**Step 2**: Test that unauthenticated requests are blocked

```bash
# Without auth → Should return 401
curl "https://api.planerix.com/api/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14"
# Expected: HTTP 401 Unauthorized

# With auth → Should return 200
curl "https://api.planerix.com/api/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
# Expected: HTTP 200 with data
```

### Phase 2: Data Isolation by Organization (NEXT)

**Problem**: Currently all users see ITstep data from `itstep_final` database.

**Solution**: Filter data by user's organization

```python
@router.get("/campaigns")
async def get_campaigns(
    date_from: str = Query(...),
    date_to: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_itstep_session)
):
    # Get user's organization
    user_org_id = current_user.organizations[0].id if current_user.organizations else None

    # For ITstep user → use itstep_final database
    if user_org_id == "b4703661-de3b-4cab-86c9-9187199c0a43":  # ITstep org ID
        # Query itstep_final data (current behavior)
        query = text("SELECT * FROM dashboards.v6_campaign_roi_daily ...")
    else:
        # For new users → return mock data or their own database
        return {"campaigns": get_mock_campaigns()}

    return data
```

### Phase 3: Mock Data for New Users (FUTURE)

**For users without real data**, provide example/demo data:

```python
def get_mock_campaigns():
    """Demo data for new organizations"""
    return [
        {
            "platform": "google",
            "campaign_id": "demo-001",
            "campaign_name": "Demo Campaign - Performance Max",
            "cost": 5000.00,
            "impressions": 50000,
            "clicks": 1500,
            "leads": 30,
            "contracts": 5,
            "revenue": 25000.0,
            "note": "This is demo data. Connect your accounts to see real metrics."
        }
    ]
```

---

## 📋 Implementation Checklist

### Immediate Actions (Phase 1 - Authentication)

- [ ] Add `get_current_user` import to all analytics route files
- [ ] Add `current_user: User = Depends(get_current_user)` to every endpoint
- [ ] Test unauthenticated access (should return 401)
- [ ] Test authenticated access (should return 200 with data)
- [ ] Deploy to production with full rebuild
- [ ] Verify fix with production test

### Next Steps (Phase 2 - Data Isolation)

- [ ] Design multi-tenant architecture
  - Map organizations to database connections
  - Store database credentials securely per org
- [ ] Implement organization-based data filtering
- [ ] Add organization ID to all analytics queries
- [ ] Test with multiple organizations
- [ ] Document multi-tenant setup

### Future Enhancements (Phase 3 - Mock Data)

- [ ] Create mock data generator function
- [ ] Add "demo mode" for new organizations
- [ ] Add UI indicator: "You're viewing demo data"
- [ ] Add "Connect your accounts" CTA in UI
- [ ] Document how to connect real data sources

---

## 🧪 Testing Script

```bash
#!/bin/bash
# Test authentication on analytics endpoints

API_URL="https://api.planerix.com/api"
ENDPOINTS=(
    "/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14"
    "/analytics/marketing/creatives?date_from=2025-09-01&date_to=2025-10-14"
    "/analytics/marketing/data-quality?date_from=2025-09-01&date_to=2025-10-14"
    "/analytics/overview/kpis"
    "/analytics/sales/revenue-trend?date_from=2025-09-01&date_to=2025-10-14"
)

echo "=== Testing Analytics Endpoints Security ==="
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing: $endpoint"

    # Test WITHOUT auth (should be 401)
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")

    if [ "$STATUS" = "401" ]; then
        echo "✅ PASS: Returns 401 without auth"
    else
        echo "❌ FAIL: Returns $STATUS without auth (should be 401)"
    fi

    echo ""
done

echo "=== Test with Authentication ==="
echo "Login first to get access token:"
echo ""
echo "ACCESS_TOKEN=\$(curl -s -X POST '$API_URL/auth/login' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"itstep@itstep.com\",\"password\":\"ITstep2025!\"}' \\"
echo "  | jq -r '.access_token')"
echo ""
echo "Then test endpoint with token:"
echo "curl '$API_URL/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14' \\"
echo "  -H \"Authorization: Bearer \$ACCESS_TOKEN\""
```

---

## 📊 Impact Assessment

### Current Risk Level: **CRITICAL**

**Data Exposed**:
- ✅ Campaign performance (costs, impressions, clicks)
- ✅ Revenue and contract data
- ✅ Lead generation metrics
- ✅ Creative performance
- ✅ Product sales data
- ✅ CRM outcomes

**Who Can Access**:
- ❌ Anyone with API URL (no authentication required)
- ❌ Competitors
- ❌ Malicious actors
- ❌ Web crawlers/bots

**Business Impact**:
- Competitive disadvantage (strategy exposed)
- Privacy violations (client data exposed)
- GDPR/compliance issues (personal data potentially exposed)
- Loss of client trust
- Potential legal liability

---

## ✅ Success Criteria

Fix is considered complete when:

1. **All analytics endpoints require authentication**
   - Unauthenticated requests return 401
   - Authenticated requests return 200 with data

2. **No data leakage**
   - Public endpoint scan shows no sensitive data
   - API documentation updated to show auth requirements

3. **User experience unchanged for authenticated users**
   - Login flow works
   - Analytics pages load normally
   - No performance degradation

4. **Future-ready for multi-tenancy**
   - Architecture supports org-based data filtering
   - Mock data ready for new users

---

## 🚀 Deployment Plan

### Pre-Deployment

1. Implement authentication on all endpoints (local testing)
2. Run test suite to ensure no breaking changes
3. Test authentication flow end-to-end
4. Update API documentation

### Deployment

1. **Commit changes**:
   ```bash
   git add apps/api/liderix_api/routes/analytics/
   git commit -m "SECURITY: Add authentication to all analytics endpoints"
   git push origin develop
   ```

2. **Deploy to production**:
   ```bash
   ssh root@65.108.220.33
   cd /opt/MONOREPv3
   git pull origin develop
   docker-compose -f docker-compose.prod.yml build --no-cache api
   docker-compose -f docker-compose.prod.yml up -d api
   ```

3. **Verify security fix**:
   ```bash
   # Test unauthenticated (should fail)
   curl "https://api.planerix.com/api/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14"
   # Expected: 401 Unauthorized

   # Test authenticated (should work)
   ./scripts/check_auth_health.sh production
   # Expected: All tests pass
   ```

### Post-Deployment

1. Monitor logs for auth errors
2. Verify frontend still works (users can login and see data)
3. Document security fix in changelog
4. Notify team of changes

---

**Priority**: 🔴 CRITICAL - Deploy ASAP
**Estimated Fix Time**: 30 minutes (code) + 15 minutes (testing) + 10 minutes (deployment) = 55 minutes
**Next Review**: After Phase 2 (data isolation) implementation

---

## 📝 Related Documentation

- `AUTHENTICATION_ROOT_CAUSE_ANALYSIS.md` - Auth system deep dive
- `DEPLOYMENT_CHECKLIST.md` - Production deployment steps
- `apps/api/liderix_api/services/auth.py` - Auth service implementation
- `apps/api/liderix_api/routes/auth/login.py` - Login endpoint
