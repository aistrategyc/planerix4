# Frontend/Backend Upgrade Plan - Data Analytics v6

**Date**: October 14, 2025
**Status**: 🚧 In Progress
**Priority**: 🔥🔥🔥 HIGH

---

## 🎯 GOAL

Upgrade data-analytics page (https://app.planerix.com/data-analytics) to use new v6 analytical views with real data instead of mock data and old dm/dwh schemas.

---

## 📊 CURRENT STATE ANALYSIS

### Frontend (apps/web-enterprise/src/app/data-analytics/page.tsx)

**Status**: ✅ Well-structured, uses 13 working API endpoints

**API Calls**:
1. `getKPICards` - Top-level metrics (leads, contracts, revenue, spend, CPL, ROAS)
2. `getLeadsTrend` - Daily leads trend
3. `getSpendTrend` - Daily spend trend
4. `getCampaigns` - Campaign performance table
5. `getPlatformShare` - Platform distribution (Meta/Google/Direct)
6. `getUTMSources` - UTM source breakdown
7. `getWoWCampaigns` - Week-over-week comparison
8. `getBudgetRecommendationsLegacy` - Budget recommendations (scale/pause/monitor)
9. `getScatterMatrix` - CPL vs ROAS scatter plot
10. `getAnomalies` - Campaign anomaly detection
11. `getPaidSplitPlatforms` - Paid vs organic split
12. `getCampaignInsights` - Performance categories (high/medium/volume/needs attention)
13. `getMetricsTrend` - CPL, CPC, CTR, CPM daily trends

**Frontend Data Expectations**:
- Date filters: 2025-10-01 to 2025-10-03 (default)
- Platform filters: all/google/meta
- All charts use Recharts library
- Responsive design with grid layouts
- Error handling with retry functionality

---

### Backend (apps/api/liderix_api/routes/analytics/)

**Status**: ⚠️ Uses OLD schemas (dm/dwh) and MOCK DATA

**Current Schemas Used**:
- ❌ `dm.dm_campaign_results_daily_v3` - OLD aggregated campaigns
- ❌ `dwh.fact_contracts` - OLD contracts
- ❌ `dm.dm_campaign_contracts_by_product_v1` - OLD product data
- ❌ `dm.dm_ad_results_daily_v3` - OLD ad results
- ❌ `dm.dm_campaign_rolling_7d` - OLD rolling metrics

**Files to Update**:
1. `dashboard.py` - Has MOCK DATA, needs real queries
2. `sales.py` - Uses old dwh.fact_contracts
3. `campaigns.py` - Uses old dm.dm_campaign_results_daily_v3
4. `overview.py` - Needs update to v6 views

---

### New v6 Views Available (✅ Created & Indexed)

**Materialized Views**:
1. ✅ `dashboards.v6_contracts_enriched` (441 rows)
   - Contracts with full attribution chain
   - Products, branches, cities
   - Meta/Google campaign → adset → ad → creative

2. ✅ `dashboards.v6_product_performance` (370 products)
   - Product analytics with CVR, revenue, avg contract value
   - Platform breakdown per product
   - Category auto-detection

3. ✅ `dashboards.v6_branch_performance` (39 branches)
   - Geographical performance by city/branch
   - Product diversity per branch

4. ✅ `dashboards.v6_campaign_roi_daily` (660 rows)
   - Daily ROI by campaign (Meta + Google)
   - Spend, leads, contracts, revenue, CPL, ROAS per day

5. ✅ `dashboards.v6_attribution_coverage` (35 days)
   - Daily attribution monitoring
   - Platform coverage, creative coverage

6. ✅ `dashboards.v6_funnel_daily` (63 rows)
   - Conversion funnel: Impressions → Clicks → Leads → Contracts
   - Drop-off rates per stage

**Base Fact Table**:
- `dashboards.fact_leads` (14,971 leads) - Main analytical table with fixed dominant_platform

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Backend API Endpoints Rewrite (2-3 hours)

#### 1.1 Update `dashboard.py` - KPI Cards & Trends
**Current**: Mock data
**New**: Query v6 views

**Endpoints to implement**:
- `GET /api/analytics/dashboard/v5/kpi` → KPI cards
- `GET /api/analytics/dashboard/v5/trend/leads` → Leads trend
- `GET /api/analytics/dashboard/v5/trend/spend` → Spend trend

**Data Sources**:
```sql
-- KPI Cards
SELECT
  COUNT(DISTINCT CASE WHEN created_date_txt::date BETWEEN :start AND :end THEN sk_lead END) as leads,
  COUNT(DISTINCT CASE WHEN contract_amount > 0 AND created_date_txt::date BETWEEN :start AND :end THEN sk_lead END) as n_contracts,
  SUM(CASE WHEN created_date_txt::date BETWEEN :start AND :end THEN contract_amount ELSE 0 END) as revenue,
  -- Get spend from v6_campaign_roi_daily
  (SELECT SUM(spend) FROM dashboards.v6_campaign_roi_daily WHERE date BETWEEN :start AND :end) as spend
FROM dashboards.fact_leads
WHERE dominant_platform = :platform OR :platform IS NULL;

-- Leads Trend
SELECT
  created_date_txt::date as dt,
  COUNT(DISTINCT sk_lead) as leads
FROM dashboards.fact_leads
WHERE created_date_txt::date BETWEEN :start AND :end
  AND (dominant_platform = :platform OR :platform IS NULL)
GROUP BY created_date_txt::date
ORDER BY dt;

-- Spend Trend
SELECT
  date as dt,
  SUM(spend) as spend
FROM dashboards.v6_campaign_roi_daily
WHERE date BETWEEN :start AND :end
  AND (platform = :platform OR :platform IS NULL)
GROUP BY date
ORDER BY date;
```

---

#### 1.2 Update `sales.py` - Campaigns & Share
**Current**: Uses old dwh.fact_contracts
**New**: Use v6_campaign_roi_daily + v6_contracts_enriched

**Endpoints to implement**:
- `GET /api/analytics/sales/v5/campaigns` → Campaign performance table
- `GET /api/analytics/sales/v5/share/platforms` → Platform share pie chart
- `GET /api/analytics/sales/v5/utm-sources` → UTM sources table

**Data Sources**:
```sql
-- Campaigns Performance
SELECT
  platform,
  campaign_name,
  SUM(leads) as leads,
  SUM(contracts) as n_contracts,
  SUM(revenue) as revenue,
  SUM(spend) as spend,
  CASE WHEN SUM(leads) > 0 THEN SUM(spend) / SUM(leads) ELSE 0 END as cpl,
  CASE WHEN SUM(spend) > 0 THEN SUM(revenue) / SUM(spend) ELSE 0 END as roas
FROM dashboards.v6_campaign_roi_daily
WHERE date BETWEEN :start AND :end
  AND (platform = :platform OR :platform IS NULL)
GROUP BY platform, campaign_name
ORDER BY spend DESC
LIMIT :limit;

-- Platform Share
SELECT
  dominant_platform as platform,
  COUNT(DISTINCT sk_lead) as leads,
  100.0 * COUNT(DISTINCT sk_lead) / SUM(COUNT(DISTINCT sk_lead)) OVER () as share_pct
FROM dashboards.fact_leads
WHERE created_date_txt::date BETWEEN :start AND :end
GROUP BY dominant_platform;

-- UTM Sources
SELECT
  dominant_platform as platform,
  utm_source,
  COUNT(DISTINCT sk_lead) as leads,
  COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) as n_contracts,
  SUM(contract_amount) as revenue
FROM dashboards.fact_leads
WHERE created_date_txt::date BETWEEN :start AND :end
  AND utm_source IS NOT NULL
GROUP BY dominant_platform, utm_source
ORDER BY leads DESC;
```

---

#### 1.3 Update `campaigns.py` - Advanced Campaign Analytics
**Current**: Uses old dm.dm_campaign_results_daily_v3
**New**: Use v6_campaign_roi_daily

**Endpoints to implement**:
- `GET /api/analytics/campaigns/v5/campaigns/wow` → Week-over-week comparison
- `GET /api/analytics/campaigns/v5/campaigns/scatter-matrix` → CPL vs ROAS scatter
- `GET /api/analytics/campaigns/v5/campaigns/anomalies` → Anomaly detection

**Data Sources**:
```sql
-- Week-over-Week Comparison
WITH current_week AS (
  SELECT
    platform, campaign_name,
    SUM(leads) as leads_cur,
    SUM(spend) / NULLIF(SUM(leads), 0) as cpl_cur
  FROM dashboards.v6_campaign_roi_daily
  WHERE date BETWEEN :end_date - INTERVAL '6 days' AND :end_date
  GROUP BY platform, campaign_name
),
prev_week AS (
  SELECT
    platform, campaign_name,
    SUM(leads) as leads_prev,
    SUM(spend) / NULLIF(SUM(leads), 0) as cpl_prev
  FROM dashboards.v6_campaign_roi_daily
  WHERE date BETWEEN :end_date - INTERVAL '13 days' AND :end_date - INTERVAL '7 days'
  GROUP BY platform, campaign_name
)
SELECT
  c.platform,
  c.campaign_name,
  c.leads_cur,
  p.leads_prev,
  100.0 * (c.leads_cur - p.leads_prev) / NULLIF(p.leads_prev, 0) as leads_diff_pct,
  c.cpl_cur,
  p.cpl_prev
FROM current_week c
LEFT JOIN prev_week p USING (platform, campaign_name)
WHERE c.leads_cur > 0 OR p.leads_prev > 0
ORDER BY ABS(c.leads_cur - COALESCE(p.leads_prev, 0)) DESC
LIMIT 20;

-- Scatter Matrix (CPL vs ROAS)
SELECT
  platform,
  campaign_name,
  SUM(leads) as leads,
  SUM(spend) as spend,
  SUM(spend) / NULLIF(SUM(leads), 0) as cpl,
  SUM(revenue) / NULLIF(SUM(spend), 0) as roas
FROM dashboards.v6_campaign_roi_daily
WHERE date BETWEEN :start AND :end
  AND leads > 0 AND spend > 0
GROUP BY platform, campaign_name
HAVING SUM(leads) >= 3  -- Minimum volume filter
ORDER BY spend DESC
LIMIT 50;

-- Anomalies (CPL spikes, lead drops, spend spikes)
WITH baseline AS (
  SELECT
    platform, campaign_name,
    AVG(spend / NULLIF(leads, 0)) as baseline_cpl,
    STDDEV(spend / NULLIF(leads, 0)) as cpl_stddev,
    AVG(leads) as avg_leads
  FROM dashboards.v6_campaign_roi_daily
  WHERE date BETWEEN :start - INTERVAL '30 days' AND :start - INTERVAL '1 day'
    AND leads > 0
  GROUP BY platform, campaign_name
),
current AS (
  SELECT
    platform, campaign_name,
    SUM(leads) as leads,
    SUM(spend) as spend,
    SUM(spend) / NULLIF(SUM(leads), 0) as current_cpl
  FROM dashboards.v6_campaign_roi_daily
  WHERE date BETWEEN :start AND :end
  GROUP BY platform, campaign_name
)
SELECT
  c.platform,
  c.campaign_name,
  c.leads,
  c.spend,
  c.current_cpl,
  b.baseline_cpl,
  CASE
    WHEN c.current_cpl > b.baseline_cpl + 2 * b.cpl_stddev THEN 'spike_cpl'
    WHEN c.leads < b.avg_leads * 0.5 THEN 'drop_leads'
    WHEN c.spend > (SELECT AVG(spend) FROM current) * 2 THEN 'spike_spend'
    ELSE 'normal'
  END as anomaly_type,
  CASE
    WHEN c.current_cpl > b.baseline_cpl + 3 * b.cpl_stddev THEN 'high'
    WHEN c.current_cpl > b.baseline_cpl + 2 * b.cpl_stddev THEN 'medium'
    ELSE 'low'
  END as severity
FROM current c
JOIN baseline b USING (platform, campaign_name)
WHERE c.current_cpl > b.baseline_cpl + 2 * b.cpl_stddev
   OR c.leads < b.avg_leads * 0.5
   OR c.spend > (SELECT AVG(spend) FROM current) * 2
ORDER BY severity DESC, c.spend DESC
LIMIT 20;
```

---

#### 1.4 New Endpoints - Budget Recommendations & Insights
**Status**: Partially exists, needs v6 data

**Endpoints to implement**:
- `GET /api/analytics/sales/v6/reco/budget` → Budget recommendations
- `GET /api/analytics/campaigns/v7/insights/campaign-performance` → Campaign insights
- `GET /api/analytics/campaigns/v7/metrics/trend` → Metrics trend

**Data Sources**:
```sql
-- Budget Recommendations (scale/pause/monitor)
WITH campaign_performance AS (
  SELECT
    platform, campaign_name,
    SUM(leads) as leads_cur,
    SUM(spend) as spend_cur,
    SUM(revenue) as revenue_cur,
    SUM(contracts) as contracts_cur,
    SUM(spend) / NULLIF(SUM(leads), 0) as cpl_cur,
    SUM(revenue) / NULLIF(SUM(spend), 0) as roas_cur
  FROM dashboards.v6_campaign_roi_daily
  WHERE date BETWEEN :start AND :end
  GROUP BY platform, campaign_name
),
avg_metrics AS (
  SELECT
    AVG(cpl_cur) as avg_cpl,
    AVG(roas_cur) as avg_roas
  FROM campaign_performance
  WHERE leads_cur >= 5  -- Minimum volume
)
SELECT
  c.platform,
  c.campaign_name,
  c.leads_cur,
  c.spend_cur,
  c.cpl_cur,
  c.roas_cur,
  CASE
    WHEN c.roas_cur > a.avg_roas * 1.5 AND c.cpl_cur < a.avg_cpl THEN 'scale'
    WHEN c.roas_cur < a.avg_roas * 0.5 OR c.contracts_cur = 0 THEN 'pause'
    ELSE 'monitor'
  END as action
FROM campaign_performance c, avg_metrics a
WHERE c.spend_cur > 100  -- Minimum spend threshold
ORDER BY
  CASE
    WHEN c.roas_cur > a.avg_roas * 1.5 THEN 1
    WHEN c.roas_cur < a.avg_roas * 0.5 THEN 2
    ELSE 3
  END,
  c.spend_cur DESC
LIMIT :limit;

-- Campaign Insights (high_performer, medium_performer, volume_driver, needs_attention)
WITH campaign_contracts AS (
  SELECT
    r.platform,
    r.campaign_name,
    SUM(r.leads) as leads,
    SUM(r.contracts) as contracts,
    SUM(r.revenue) as revenue,
    SUM(r.spend) as spend,
    100.0 * SUM(r.contracts) / NULLIF(SUM(r.leads), 0) as conversion_rate,
    SUM(r.revenue) / NULLIF(SUM(r.contracts), 0) as avg_contract_value,
    SUM(r.revenue) / NULLIF(SUM(r.spend), 0) as roas
  FROM dashboards.v6_campaign_roi_daily r
  WHERE r.date BETWEEN :start AND :end
  GROUP BY r.platform, r.campaign_name
  HAVING SUM(r.contracts) > 0  -- Only campaigns with contracts
)
SELECT
  platform,
  campaign_name,
  leads,
  contracts,
  revenue,
  conversion_rate,
  avg_contract_value,
  roas,
  CASE
    WHEN conversion_rate >= 5 AND roas >= 2 THEN 'high_performer'
    WHEN conversion_rate >= 3 AND roas >= 1 THEN 'medium_performer'
    WHEN leads >= 50 THEN 'volume_driver'
    ELSE 'needs_attention'
  END as performance_category
FROM campaign_contracts
ORDER BY revenue DESC
LIMIT :limit;

-- Metrics Trend (CPL, CPC, CTR, CPM by day)
SELECT
  r.date as dt,
  SUM(r.leads) as leads,
  SUM(r.clicks) as clicks,
  SUM(r.impressions) as impressions,
  SUM(r.spend) as spend,
  SUM(r.spend) / NULLIF(SUM(r.leads), 0) as cpl,
  SUM(r.spend) / NULLIF(SUM(r.clicks), 0) as cpc,
  100.0 * SUM(r.clicks) / NULLIF(SUM(r.impressions), 0) as ctr,
  1000.0 * SUM(r.spend) / NULLIF(SUM(r.impressions), 0) as cpm
FROM dashboards.v6_campaign_roi_daily r
WHERE r.date BETWEEN :start AND :end
GROUP BY r.date
ORDER BY r.date;
```

---

#### 1.5 New Endpoint - Paid vs Organic Split
**Status**: Exists in frontend, needs backend

**Endpoint**:
- `GET /api/analytics/sales/v6/leads/paid-split/platforms`

**Data Source**:
```sql
SELECT
  dominant_platform as platform,
  COUNT(DISTINCT CASE WHEN is_paid = true THEN sk_lead END) as paid_leads,
  COUNT(DISTINCT CASE WHEN is_paid = false OR is_paid IS NULL THEN sk_lead END) as organic_leads,
  COUNT(DISTINCT sk_lead) as total_leads,
  100.0 * COUNT(DISTINCT CASE WHEN is_paid = true THEN sk_lead END) / NULLIF(COUNT(DISTINCT sk_lead), 0) as paid_pct,
  100.0 * COUNT(DISTINCT CASE WHEN is_paid = false OR is_paid IS NULL THEN sk_lead END) / NULLIF(COUNT(DISTINCT sk_lead), 0) as organic_pct
FROM dashboards.fact_leads
WHERE created_date_txt::date BETWEEN :start AND :end
GROUP BY dominant_platform;
```

---

### Phase 2: Test Locally (30 minutes)

1. **Start local development**:
   ```bash
   cd /Users/Kirill/planerix_new
   ./start-dev.sh
   ```

2. **Test each endpoint**:
   ```bash
   # KPI Cards
   curl "http://localhost:8001/api/analytics/dashboard/v5/kpi?date_from=2025-10-01&date_to=2025-10-03"

   # Campaigns
   curl "http://localhost:8001/api/analytics/sales/v5/campaigns?date_from=2025-10-01&date_to=2025-10-03&limit=20"

   # Platform Share
   curl "http://localhost:8001/api/analytics/sales/v5/share/platforms?date_from=2025-10-01&date_to=2025-10-03"
   ```

3. **Check frontend**:
   - Open http://localhost:3002/data-analytics
   - Verify all charts load with real data
   - Test date filters
   - Test platform filters

---

### Phase 3: Deploy to Production (30 minutes)

1. **SSH to server**:
   ```bash
   ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
   cd /opt/MONOREPv3
   ```

2. **Pull changes**:
   ```bash
   git pull origin develop
   ```

3. **Rebuild and restart**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

4. **Verify**:
   ```bash
   # Check containers
   docker-compose -f docker-compose.prod.yml ps

   # Check API logs
   docker-compose -f docker-compose.prod.yml logs --tail=50 api

   # Test endpoint
   curl "https://app.planerix.com/api/analytics/dashboard/v5/kpi?date_from=2025-10-01&date_to=2025-10-03"
   ```

---

## 📝 FILE CHANGES SUMMARY

### Backend Files to Modify

1. **apps/api/liderix_api/routes/analytics/dashboard.py**
   - Remove mock data
   - Add real queries to v6 views
   - Endpoints: `/v5/kpi`, `/v5/trend/leads`, `/v5/trend/spend`

2. **apps/api/liderix_api/routes/analytics/sales.py**
   - Replace `dwh.fact_contracts` with `v6_campaign_roi_daily` + `v6_contracts_enriched`
   - Endpoints: `/v5/campaigns`, `/v5/share/platforms`, `/v5/utm-sources`

3. **apps/api/liderix_api/routes/analytics/campaigns.py**
   - Replace `dm.dm_campaign_results_daily_v3` with `v6_campaign_roi_daily`
   - Endpoints: `/v5/campaigns/wow`, `/v5/campaigns/scatter-matrix`, `/v5/campaigns/anomalies`

4. **apps/api/liderix_api/routes/analytics/overview.py** (NEW)
   - Add new endpoints for v6/v7 features
   - Endpoints: `/v6/reco/budget`, `/v7/insights/campaign-performance`, `/v7/metrics/trend`, `/v6/leads/paid-split/platforms`

### Frontend Files (NO CHANGES NEEDED)

Frontend is already structured correctly and expects the right data format. Once backend is updated, it will "just work".

---

## ✅ SUCCESS CRITERIA

1. **No Mock Data**: All endpoints return real database data
2. **Fast Queries**: All queries under 2 seconds
3. **Correct Data**: Numbers match database verification queries
4. **All Charts Load**: All 13 widgets show data without errors
5. **Filters Work**: Date and platform filters return filtered results
6. **Production Works**: https://app.planerix.com/data-analytics loads successfully

---

## 🎯 EXPECTED RESULTS

### Before (Current State)
- ❌ Mock data in dashboard
- ❌ Old schemas (dm/dwh)
- ⚠️ Some endpoints may fail
- ⚠️ Attribution coverage: 5-7%

### After (v6 Upgrade)
- ✅ Real data from v6 views
- ✅ Improved attribution: 30%+ (after dominant_platform fix)
- ✅ Product/branch analytics available
- ✅ Better campaign insights
- ✅ Fast queries with indexes

---

**Total Time**: 3-4 hours
**Priority**: 🔥🔥🔥 HIGH
**Status**: 🚧 Ready to implement

**Next Step**: Start with Phase 1.1 - Update dashboard.py
