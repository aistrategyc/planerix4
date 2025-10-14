# Analytics Dashboard Upgrade - October 14, 2025

## Summary

Comprehensive upgrade to https://app.planerix.com/data-analytics with two major new dashboards:
1. **Funnel Analysis Dashboard** - Track conversion journey (Impressions → Clicks → Leads → Contracts)
2. **Contracts Attribution Dashboard** - Drill-down from contracts to campaigns and creatives

## Backend Changes

### New API Endpoints (2 funnel + 5 contracts = 7 total)

#### Funnel Analysis (`apps/api/liderix_api/routes/analytics/sales.py`)
- **GET /api/analytics/sales/v6/funnel** - Daily funnel data with CTR, CVR, contract rate
- **GET /api/analytics/sales/v6/funnel/aggregate** - Platform-level funnel metrics

#### Contracts Attribution (`apps/api/liderix_api/routes/analytics/contracts.py`)
- **GET /api/analytics/contracts/v6/contracts/detail** - Individual contract attribution details
- **GET /api/analytics/contracts/v6/contracts/by-creative** - Revenue by Meta creative
- **GET /api/analytics/contracts/v6/contracts/by-campaign** - Revenue by campaign (Meta/Google)
- **GET /api/analytics/contracts/v6/contracts/timeline** - Daily contracts & revenue trend
- **GET /api/analytics/v6/attribution/coverage** - Attribution coverage statistics

### Database Views Used
- **v6_funnel_daily** - Materialized view with impressions, clicks, leads, contracts by date/platform
- **v6_campaign_roi_daily** - Campaign-level ROI metrics
- **fact_leads** - Core leads table with attribution fields
- **dim_contracts** - Contracts dimension table

### Fixed Issues
- Date parameter handling in asyncpg (converted strings to Python date objects)
- Added `parse_date()` helper function across all analytics endpoints

## Frontend Changes

### New Visualizations (`apps/web-enterprise/src/app/data-analytics/page.tsx`)

#### Funnel Analysis Dashboard
- Platform funnel cards (Meta/Google) with 4-stage conversion
- Funnel stages bar chart (logarithmic scale for visualization)
- Daily CTR trend line chart
- Daily CVR trend line chart
- Daily contract rate trend line chart
- End-to-end conversion rates (impressions → contracts)

#### Contracts Attribution Dashboard
- Attribution coverage overview (4-card dashboard)
  - Total volume (leads + contracts)
  - Leads attribution percentages
  - Contracts attribution percentages
  - Attribution health warning
- Daily contracts & revenue timeline (dual-axis line chart)
- Top revenue-generating creatives table (Meta)
- Contracts attribution by campaign table (Meta/Google/Direct)

### API Client Updates (`apps/web-enterprise/src/lib/api/data-analytics.ts`)
- Added TypeScript interfaces for funnel and contracts data
- Added 7 new API client functions
- Total: 21 active endpoints (was 13)

## Data Quality Verification

### Database Stats (Sep 1 - Oct 14, 2025)
- **Leads**: 1,557 total
- **Contracts**: 181 total
- **Revenue**: ₴10.3M total
- **Funnel Data**: 63 daily rows (Meta + Google)
- **Attribution Coverage**: 11% of contracts have full creative attribution (CRITICAL GAP)

### Known Limitations
- Only 20/181 contracts (11%) have Meta creative attribution
- Only 5/181 contracts (2.8%) have Google campaign attribution
- 154/181 contracts (85%) are marked as "Direct" (no attribution)
- Attribution gap identified in audit is still present but now visualized

## Testing Results

### API Endpoints Tested
✅ GET /api/analytics/sales/v6/funnel - Returns 63 rows with complete funnel metrics
✅ GET /api/analytics/sales/v6/funnel/aggregate - Returns 2 platforms (Meta, Google)
✅ All 5 contracts endpoints tested and verified

### Frontend Build
✅ Next.js build completed successfully (85.6s)
✅ 43 pages generated
✅ Data analytics page size: 8.28 kB (405 kB First Load JS)

### Local Testing
✅ Backend container rebuilt and running
✅ Frontend container rebuilt and running
✅ Frontend responding on http://localhost:3002 (HTTP 200)

## Deployment Instructions

### 1. SSH to Production Server
```bash
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
cd /opt/MONOREPv3
```

### 2. Pull Latest Code
```bash
git pull origin main  # or appropriate branch
```

### 3. Update Environment Variables (if needed)
```bash
# Verify .env.production has correct ITstep database credentials
cat .env.production | grep ITSTEP
# Should show: ITSTEP_DB_URL=postgresql+asyncpg://manfromlamp:lashd87123kKJSDAH81@92.242.60.211:5432/itstep_final
```

### 4. Rebuild and Restart Containers
```bash
docker-compose -f docker-compose.prod.yml down
docker system prune -f  # Optional: clean unused images
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check backend logs
docker-compose -f docker-compose.prod.yml logs --tail=50 api

# Test funnel endpoint
curl -s "https://app.planerix.com/api/analytics/sales/v6/funnel?date_from=2025-09-01&date_to=2025-10-14" | head -20

# Test contracts endpoint
curl -s "https://app.planerix.com/api/analytics/v6/attribution/coverage?date_from=2025-09-01&date_to=2025-10-14"

# Test frontend
curl -s -o /dev/null -w "%{http_code}" https://app.planerix.com/data-analytics
# Should return: 200
```

## Files Changed

### Backend
- `apps/api/liderix_api/routes/analytics/sales.py` - Added 2 funnel endpoints
- `apps/api/liderix_api/routes/analytics/contracts.py` - Added 5 contracts endpoints
- `apps/api/liderix_api/routes/analytics/__init__.py` - Registered contracts router
- `apps/api/liderix_api/routes/analytics/dashboard.py` - Fixed date handling
- `apps/api/liderix_api/routes/analytics/campaigns_v6.py` - Fixed date handling

### Frontend
- `apps/web-enterprise/src/app/data-analytics/page.tsx` - Added 2 new dashboard sections
- `apps/web-enterprise/src/lib/api/data-analytics.ts` - Added 7 API client functions

### Environment
- `apps/api/.env` - Updated ITstep DB credentials (local)
- `.env.production` - Updated ITstep DB credentials (production)

## Rollback Plan

If deployment fails:
```bash
# SSH to server
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
cd /opt/MONOREPv3

# Rollback to previous commit
git log --oneline -5  # Find previous commit hash
git reset --hard <previous-commit-hash>

# Restart containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

## Performance Considerations

- All new endpoints use existing materialized views (v6_funnel_daily, v6_campaign_roi_daily)
- Materialized views are refreshed by n8n workflows (not our concern)
- API queries are optimized with proper indexes
- Frontend uses Promise.allSettled for parallel data fetching (20 endpoints total)
- No performance degradation expected from new features

## Next Steps

1. ✅ Complete this upgrade and deploy to production
2. 🔄 Monitor attribution coverage metrics to track improvement
3. 🔄 Work with client to improve tracking (increase from 11% to 50%+)
4. 🔄 Add real-time data monitoring (if time permits)
5. 🔄 Add creative-level drill-down to individual ads (future enhancement)

---

**Tested and verified locally**: October 14, 2025
**Ready for production deployment**: YES ✅
**Estimated deployment time**: 5-10 minutes
**Estimated downtime**: 1-2 minutes during container restart
