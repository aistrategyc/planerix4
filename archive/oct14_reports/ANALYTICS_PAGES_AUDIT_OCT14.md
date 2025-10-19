# Analytics Pages Audit - October 14, 2025

## Executive Summary

Comprehensive audit of all analytics pages to identify mock data and replace with real ITstep database data.

**Total Pages Found:** 10 analytics pages
**Database Data Available:** Extensive real ad data from Facebook and Google Ads (Sep 2025 - Oct 2025)
**Primary Goal:** Replace ALL mock/hardcoded data with real API calls to backend

---

## Real Database Data Inventory

### Facebook Ads Data (Sep 13 - Oct 13, 2025)
- **Table:** `raw.fb_ad_insights`
- **Rows:** 8,504 daily metrics
- **Campaigns:** 52 unique
- **Ad Sets:** 83 unique
- **Ads:** 275 unique
- **Spend:** ₴54,413.35 total
- **Impressions:** 8,778,211
- **Clicks:** 142,352
- **Columns:** date_start, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, impressions, clicks, spend, reach, frequency, ctr, cpc

### Facebook Leads Data (Jun 20 - Oct 13, 2025)
- **Table:** `raw.fb_leads`
- **Rows:** 375 leads
- **Campaigns:** 37 unique
- **Ad Sets:** 52 unique
- **Ads:** 88 unique

### Google Ads Campaign Data (Sep 10 - Oct 13, 2025)
- **Table:** `raw.google_ads_campaign_daily`
- **Rows:** 228 daily metrics
- **Campaigns:** 9 unique
- **Spend:** ₴46,928.38 total
- **Impressions:** 400,469
- **Clicks:** 4,419
- **Conversions:** 41.34
- **Columns:** date, campaign_id, campaign_name, campaign_status, impressions, clicks, cost_micros, average_cpc_micros, ctr, conversions, conversions_value

### Additional Raw Tables Available
- `raw.fb_campaigns` - Campaign dimension data
- `raw.fb_adsets` - Ad set dimension data
- `raw.fb_ads` - Ad dimension data
- `raw.fb_ad_creative_details` - Creative details (27 columns)
- `raw.google_ads_ad_daily` - Google ad-level daily metrics
- `raw.google_ads_keyword_daily` - Keyword performance
- `raw.google_ads_clicks` - Click-level data
- `raw.google_ads_names` - Name mappings

---

## Pages Audit Results

### 1. `/analytics/ads/page.tsx` - **COMPLETE** ✅

**Current State:**
- Uses custom hook `useAdsData()` that calls `/api/analytics/marketing/ads`
- Hook expects: `{ daily, campaigns, adGroups, platforms, utm }`
- Displays: Daily charts, campaigns table, ad groups table, platforms table, UTM table
- Has Top Performers section

**Mock Data Identified:**
- ~~ALL data was mock/undefined because API endpoint didn't exist~~ **FIXED**
- Subtitle trends are hardcoded ("+5% порівняно з попереднім періодом") **TO FIX IN FRONTEND**

**Real Data Available:**
- ✅ Facebook: 8,504 daily metrics with campaign/adset/ad breakdown
- ✅ Google: 228 daily campaign metrics
- ✅ Combined platform data available
- ✅ UTM data from fact_leads table
- ✅ Ad sets data (Facebook adsets)

**Backend Implementation - COMPLETE ✅**
- ✅ Created comprehensive endpoint: `GET /api/analytics/ads/`
- ✅ Returns all required data: daily, campaigns, adGroups, platforms, utm
- ✅ Queries Facebook data from `raw.fb_ad_insights`
- ✅ Queries Google data from `raw.google_ads_campaign_daily`
- ✅ Queries UTM data from `dashboards.fact_leads`
- ✅ Includes totals calculations for summary cards
- ✅ Auto-detects date range from available data
- ✅ File: `apps/api/liderix_api/routes/analytics/ads.py` (394 lines)

**Data Structure Returned:**
```json
{
  "status": "success",
  "date_range": { "from": "2025-09-13", "to": "2025-10-13" },
  "data_sources": {
    "facebook": "raw.fb_ad_insights",
    "google_ads": "raw.google_ads_campaign_daily",
    "utm": "dashboards.fact_leads"
  },
  "daily": [...],
  "campaigns": [...],
  "adGroups": [...],
  "platforms": [...],
  "utm": [...],
  "totals": { "total_spend": 0, "total_clicks": 0, ... }
}
```

**Frontend Updates Required:**
- ✅ Hook already points to correct endpoint: `/api/analytics/marketing/ads`
- ⏳ **PENDING:** Remove hardcoded trend subtitles ("+5% порівняно з попереднім періодом")
- ⏳ **PENDING:** Calculate real WoW/MoM trends in frontend
- ✅ No other changes needed - frontend structure matches backend response

**Testing Notes:**
- ✅ Endpoint successfully created and tested locally
- ✅ Fixed database permission issues (GRANT USAGE ON SCHEMA raw)
- ✅ Fixed missing columns (added LEFT JOINs to dimension tables)
- ✅ Verified with real ITstep data (Oct 12-13, 2025):
  - Facebook: ₴5,020.75 spend, 18,094 clicks, 23 campaigns
  - Google: ₴3,303.64 spend, 284 clicks
- ⏳ Ready for production deployment

---

### 2. `/analytics/campaigns/page.tsx` - Uses Real API ✅

**Current State:**
- Uses `AnalyticsAPI.getMarketingCampaigns()` - **THIS WORKS!**
- Fetches real data with proper error handling
- Has platform filter, search, multiple chart views

**Mock Data Identified:**
- None! Already using real data from backend

**Required Action:**
- ✅ NO CHANGES NEEDED - Already using real data
- Just verify endpoint returns correct data format

---

### 3. `/analytics/page.tsx` (Main Analytics Page) - Uses Real API Hooks ✅

**Current State:**
- Uses comprehensive hook system from `useAnalytics.ts`
- All hooks call `AnalyticsAPI.*` methods
- Proper error handling and loading states

**Mock Data Identified:**
- None in component itself
- **BUT:** Check if `useAnalyticsHooks` endpoints actually exist in backend

**Required Action:**
- [ ] Verify all AnalyticsAPI methods in backend exist:
  - `getDashboardOverview()`
  - `getRealTimeMetrics()`
  - `getKPIs()`
  - `getRevenueTrend()`
  - `getCampaignPerformance()`
  - `getCreativePerformance()`

---

### 4. `/analytics/channels/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

### 5. `/analytics/creatives/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

### 6. `/analytics/crm/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

### 7. `/analytics/funnel/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

### 8. `/analytics/products/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

### 9. `/analytics/quality/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

### 10. `/analytics/sales/page.tsx` - TO BE AUDITED

**Status:** Not yet read, need to check

---

## Implementation Priority

### Phase 1: Fix /ads Page (HIGHEST PRIORITY) 🔴
**User explicitly requested:** "начни с /ads"

1. Create backend router `marketing_ads.py`
2. Implement 5 core endpoints with Facebook + Google data
3. Update frontend hook to use new endpoints
4. Test locally
5. Deploy to production

**Estimated Time:** 2-3 hours
**Impact:** HIGH - Most critical user-facing page

### Phase 2: Audit Remaining Pages 🟡

1. Read remaining 7 pages
2. Identify mock data vs real API calls
3. Check which backend endpoints exist
4. Create missing endpoints
5. Update frontend hooks

**Estimated Time:** 4-6 hours
**Impact:** MEDIUM - Complete coverage

### Phase 3: Testing & Deployment 🟢

1. Test all pages locally
2. Verify data accuracy
3. Deploy to production
4. Monitor for errors

**Estimated Time:** 1-2 hours
**Impact:** HIGH - Ensure quality

---

## Technical Decisions

### Data Aggregation Strategy

**Option A: Backend Aggregation (RECOMMENDED)**
- Pro: Faster frontend, less data transfer
- Pro: Consistent business logic
- Con: More complex backend queries

**Option B: Frontend Aggregation**
- Pro: Simpler backend
- Con: Slower page loads, more data transfer
- Con: Inconsistent calculations across pages

**Decision:** Use Option A - Backend aggregates data in SQL for performance

### Date Range Handling

**Current:** Most pages use custom date ranges (7 days, 30 days, etc.)
**Problem:** Data only available from Sep 10, 2025 to Oct 13, 2025
**Solution:** Dynamically detect available date range from database and set as default

### Platform Naming Consistency

**Current Issues:**
- Facebook called: "facebook", "meta", "fb" inconsistently
- Google called: "google", "google_ads", "google ads"

**Solution:** Standardize in backend:
- Facebook → "facebook" (lowercase, full word)
- Google Ads → "google_ads" (lowercase, underscore)

---

## Next Steps

1. ✅ Complete this audit document
2. 🔄 Create backend endpoints for /ads page
3. ⏳ Continue auditing remaining 7 pages
4. ⏳ Update all frontends to use real data
5. ⏳ Test and deploy to production

---

**Audit Started:** October 14, 2025 18:45 UTC
**Status:** IN PROGRESS - Phase 1 (Ads Page) Starting
**Auditor:** Claude Code
**Database:** itstep_final (PostgreSQL)
