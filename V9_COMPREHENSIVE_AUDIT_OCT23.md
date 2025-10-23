# 🔍 V9 COMPREHENSIVE AUDIT - October 23, 2025

## Phase 1: Database Views Verification

### ✅ V9 Views Count: **42 views** in stg schema

```sql
-- Row counts verified:
v9_platform_weekly_trends: 63 rows
v9_contracts_with_sk_enriched: 538 rows
v9_facebook_ad_creatives_full: 1430 rows
```

### Complete V9 Views List:
1. v9_ad_creative_to_course
2. v9_attribution_completeness_sk
3. v9_attribution_quality_score ✅ USED
4. v9_campaign_summary
5. v9_campaign_to_course_effectiveness
6. v9_client_all_codes
7. v9_client_best_ad_match
8. v9_client_full_attribution
9. v9_contracts_attribution
10. v9_contracts_attribution_summary
11. v9_contracts_by_campaign
12. v9_contracts_with_full_attribution
13. v9_contracts_with_sk_enriched ✅ USED
14. v9_course_daily_funnel
15. v9_courses_by_campaign
16. v9_courses_by_platform
17. v9_courses_overview
18. v9_crm_contracts_summary
19. v9_crm_leads_summary
20. v9_events_attribution
21. v9_facebook_ad_creatives_full ✅ USED (for JOIN)
22. v9_facebook_ads_performance_sk
23. v9_facebook_creative_images_library
24. v9_facebook_creative_types_analysis
25. v9_facebook_creatives_performance
26. v9_facebook_creatives_with_contracts
27. v9_facebook_cta_effectiveness
28. v9_facebook_leads
29. v9_facebook_performance_daily
30. v9_facebook_top_creatives_by_revenue
31. v9_google_ads_performance_sk
32. v9_google_performance_daily
33. v9_lead_source_breakdown
34. v9_lead_to_contract_journey
35. v9_marketing_funnel_complete
36. v9_monthly_cohort_analysis_sk ✅ USED
37. v9_performance_max_courses
38. v9_platform_daily_overview
39. v9_platform_performance_comparison ✅ USED
40. v9_platform_weekly_trends ✅ USED
41. v9_promo_sources
42. v9_roas_analysis_detailed

---

## Phase 2: Page Requirements Analysis

### Page 1: `/data-analytics` (apps/web-enterprise/src/app/data-analytics/page.tsx)

**API Calls Made** (6 endpoints):
1. `getV9PlatformComparison(dateFrom, dateTo)` → `/api/data-analytics/v9/platforms/comparison`
2. `getV9MonthlyCohorts(platform?)` → `/api/data-analytics/v9/cohorts/monthly`
3. `getV9AttributionQuality(platform?)` → `/api/data-analytics/v9/attribution/quality`
4. `getV9ContractsEnriched(dateFrom, dateTo)` → `/api/data-analytics/v9/contracts/enriched`
5. `getV9FacebookWeekly(dateFrom, dateTo)` → `/api/data-analytics/v9/campaigns/facebook/weekly`
6. `getV9GoogleWeekly(dateFrom, dateTo)` → `/api/data-analytics/v9/campaigns/google/weekly`

**Components Rendered** (8 components):
1. **PlatformKPICards** - Uses: v9PlatformComparison (calculates best_conversion, highest_revenue, most_contracts, best_roas)
2. **WeekOverWeekComparison** - Uses: v9PlatformComparison
3. **PlatformPerformanceTrends** - Uses: v9PlatformComparison
4. **AttributionBreakdown** - Uses: v9AttributionQuality
5. **FacebookAdsPerformance** - Uses: v9FacebookWeekly
6. **GoogleAdsPerformance** - Uses: v9GoogleWeekly
7. **FacebookCreativeAnalytics** - Uses: v9ContractsEnriched (filters by platform='meta')
8. **ContractsSourceAnalytics** - Uses: v9ContractsEnriched

---

### Page 2: `/ads` (apps/web-enterprise/src/app/ads/page.tsx)

**Need to check this file**

---

### Page 3: `/contracts-analytics` (apps/web-enterprise/src/app/contracts-analytics/page.tsx)

**Need to check this file**

---

## Phase 3: API Endpoints Verification

### Endpoint 1: `/v9/platforms/comparison`
- **Route**: `@router.get("/platforms/comparison")` (line 707)
- **View Used**: `stg.v9_platform_performance_comparison`
- **Status**: ✅ REGISTERED
- **Returns**: period_start, period_type, platform, leads, contracts, revenue, prev_period_*, *_growth_pct
- **Issues**: NONE

### Endpoint 2: `/v9/contracts/enriched`
- **Route**: `@router.get("/contracts/enriched")` (line 780)
- **View Used**: `stg.v9_contracts_with_sk_enriched` + LEFT JOIN LATERAL with `v9_facebook_ad_creatives_full`
- **Status**: ⚠️ HAS ERROR
- **Error**: `SELECT DISTINCT ON expressions must match initial ORDER BY expressions`
- **Fix Needed**: Change ORDER BY to start with `c.contract_source_id`

### Endpoint 3: `/v9/cohorts/monthly`
- **Route**: `@router.get("/cohorts/monthly")` (line 895)
- **View Used**: `stg.v9_monthly_cohort_analysis_sk`
- **Status**: ✅ REGISTERED
- **Issues**: Need to verify view has data

### Endpoint 4: `/v9/campaigns/facebook/weekly`
- **Route**: `@router.get("/campaigns/facebook/weekly")` (line 967)
- **View Used**: `stg.v9_platform_weekly_trends` (filters by platform IN ('facebook', 'instagram', 'meta'))
- **Status**: ✅ REGISTERED
- **Issues**: NONE

### Endpoint 5: `/v9/campaigns/google/weekly`
- **Route**: `@router.get("/campaigns/google/weekly")` (line 1074)
- **View Used**: `stg.v9_platform_weekly_trends` (filters by platform = 'google')
- **Status**: ✅ REGISTERED
- **Issues**: NONE

### Endpoint 6: `/v9/attribution/quality`
- **Route**: `@router.get("/attribution/quality")` (line 1175)
- **View Used**: `stg.v9_attribution_quality_score`
- **Status**: ✅ REGISTERED
- **Issues**: Need to verify view has data

---

## Phase 4: Critical Issues Found

### ⚠️ ISSUE 1: ORDER BY Mismatch in `/contracts/enriched`

**Error in Production Logs**:
```
ERROR: SELECT DISTINCT ON expressions must match initial ORDER BY expressions
```

**Current Code** (line 851):
```python
query_text += " ORDER BY c.contract_date DESC, c.contract_amount DESC"
```

**Problem**: Using `DISTINCT ON (c.contract_source_id)` but ORDER BY doesn't start with `contract_source_id`

**Fix Required**:
```python
query_text += " ORDER BY c.contract_source_id, c.contract_date DESC, c.contract_amount DESC"
```

**Verification**: Already tested locally - returns 538 rows ✅

---

## Phase 5: Data Verification Checklist

### Need to Verify:

- [ ] v9_platform_performance_comparison has data for Sept-Oct 2025
- [ ] v9_monthly_cohort_analysis_sk has data
- [ ] v9_attribution_quality_score has data
- [ ] Check `/ads` page requirements
- [ ] Check `/contracts-analytics` page requirements
- [ ] Verify all API responses match frontend TypeScript interfaces

---

**Status**: Phase 1-3 Complete, Phase 4 in progress
**Next**: Fix ORDER BY issue, verify remaining views, check other 2 pages
