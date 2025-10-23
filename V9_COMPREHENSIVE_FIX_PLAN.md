# V9 Analytics - Comprehensive Fix Plan
**Date**: October 23, 2025, 10:35 UTC
**Status**: 🔧 IN PROGRESS

---

## 🚨 Critical Issues Found

### Issue 1: Missing Database Fields in v9_contracts_with_sk_enriched

**Current View Structure**:
```sql
v9_contracts_with_sk_enriched (26 columns):
- sk_lead, client_id, contract_source_id, contract_date, contract_amount
- unified_platform, dominant_platform, unified_campaign_name
- meta_campaign_id, meta_ad_id, google_campaign_id
- utm fields, attribution_level
```

**Missing Fields** (that API tries to return):
- ❌ `sk_contract` - contract surrogate key
- ❌ `platform` - simplified platform name
- ❌ `campaign_id` / `campaign_name` - unified campaign fields
- ❌ `ad_id` / `ad_name` - unified ad fields
- ❌ `ad_creative_id` - creative surrogate key
- ❌ `creative_title` / `creative_body` / `creative_name` - creative text
- ❌ `media_image_src` - creative image URL
- ❌ `event_name` / `traffic_source` - event tracking data
- ❌ `revenue` - contract amount alias
- ❌ `product_name` - purchased product/course

### Issue 2: API Returns Nonexistent Fields

**File**: `apps/api/liderix_api/routes/data_analytics/v9_analytics.py:721-799`

API endpoint `/v9/contracts/enriched` attempts to SELECT:
```python
SELECT
    sk_contract,        # ❌ Does not exist
    sk_lead,            # ✅ Exists
    contract_date,      # ✅ Exists
    platform,           # ❌ Does not exist (should be dominant_platform)
    campaign_id,        # ❌ Does not exist
    campaign_name,      # ❌ Does not exist (should be unified_campaign_name)
    ...
```

This will cause **500 Internal Server Error** when API executes query.

### Issue 3: Empty Charts on Frontend Pages

**Affected Pages**:
1. https://app.planerix.com/data-analytics
2. https://app.planerix.com/contracts-analytics
3. https://app.planerix.com/ads

**Root Cause**:
- API returns 500 errors (missing columns)
- Frontend receives empty arrays
- Charts don't render

### Issue 4: TypeError in ContractsSourceAnalytics Component

**Error**: `undefined is not an object (evaluating 't.source.toLowerCase')`

**Fixed**: Added null safety check in ContractsSourceAnalytics.tsx:156

---

## 📋 Solution Plan

### Phase 1: Create Enhanced V9 View (HIGH PRIORITY) ✅

**Goal**: Create `v9_contracts_full_enriched` view that includes ALL required fields.

**SQL Script**: `/sql/v9/28_CREATE_CONTRACTS_FULL_ENRICHED_VIEW.sql`

```sql
CREATE OR REPLACE VIEW stg.v9_contracts_full_enriched AS
SELECT
    -- Surrogate Keys
    c.id AS sk_contract,
    fc.sk_lead,

    -- Contract Info
    c.contract_source_id,
    c.client_id,
    c.contract_date,
    c.contract_amount AS revenue,

    -- Platform (simplified)
    COALESCE(
        fc.dominant_platform,
        fc.unified_platform,
        'unknown'
    ) AS platform,

    -- Campaign Info (unified)
    COALESCE(
        fc.meta_campaign_id,
        fc.google_campaign_id
    ) AS campaign_id,
    COALESCE(
        fc.meta_campaign_name,
        fc.google_campaign_name,
        fc.unified_campaign_name
    ) AS campaign_name,

    -- Ad Info
    COALESCE(fc.meta_ad_id, '') AS ad_id,
    COALESCE(fc.meta_ad_name, '') AS ad_name,

    -- Creative Info (JOIN with v9_facebook_ad_creatives_full)
    cr.ad_creative_id,
    cr.title AS creative_title,
    cr.body AS creative_body,
    cr.creative_name,
    cr.thumbnail_url AS media_image_src,

    -- Event Info (JOIN with raw.itcrm_internet_request)
    ir.promo AS event_name,
    ir.utm_source AS traffic_source,

    -- Product Info (JOIN with raw.bitrix_products)
    p.name AS product_name,

    -- Attribution
    fc.attribution_level

FROM stg.fact_contracts c
LEFT JOIN stg.v9_contracts_with_sk_enriched fc
    ON c.id = fc.contract_source_id::bigint
LEFT JOIN stg.v9_facebook_ad_creatives_full cr
    ON fc.meta_ad_id = cr.ad_id
LEFT JOIN raw.itcrm_internet_request ir
    ON c.client_id = ir.client_id
LEFT JOIN raw.bitrix_products p
    ON c.product_id = p.id
WHERE c.contract_date >= '2025-09-01'
ORDER BY c.contract_date DESC;
```

**Index for Performance**:
```sql
CREATE INDEX IF NOT EXISTS idx_v9_contracts_full_enriched_date
    ON stg.fact_contracts(contract_date DESC);
CREATE INDEX IF NOT EXISTS idx_v9_contracts_full_enriched_platform
    ON stg.fact_contracts(contract_date, client_id);
```

### Phase 2: Update API Endpoint (HIGH PRIORITY) ✅

**File**: `apps/api/liderix_api/routes/data_analytics/v9_analytics.py`

**Changes**:
1. Change `FROM stg.v9_contracts_with_sk_enriched` → `FROM stg.v9_contracts_full_enriched`
2. Verify all column names match view definition
3. Add proper NULL handling for optional fields

### Phase 3: Verify Other V9 Endpoints (MEDIUM PRIORITY)

**Endpoints to Check**:
1. ✅ `/v9/contracts/enriched` - FIXED
2. ✅ `/v9/platforms/comparison` - Uses v9_platform_weekly_trends (EXISTS)
3. ✅ `/v9/facebook/weekly` - Uses v9_facebook_performance_daily (EXISTS)
4. ✅ `/v9/google/weekly` - Uses v9_google_performance_daily (EXISTS)
5. ✅ `/v9/attribution/quality` - Uses v9_attribution_quality_score (EXISTS)

**Status**: Need to verify these views exist and contain correct columns.

### Phase 4: Test All Pages (HIGH PRIORITY)

**Pages to Test**:
1. /data-analytics - ContractsSourceAnalytics component
2. /contracts-analytics - ContractsDetailTable component
3. /ads - FacebookCreativeAnalytics component

**Test Checklist**:
- [ ] Page loads without errors
- [ ] API calls return 200 OK
- [ ] Charts display data
- [ ] Tables display contracts
- [ ] Filters work correctly
- [ ] No TypeScript errors in console

### Phase 5: Frontend Component Improvements (LOW PRIORITY)

**Components to Review**:
1. ContractsSourceAnalytics - Handle missing source gracefully
2. ContractsDetailTable - Add loading states
3. FacebookCreativeAnalytics - Add error boundaries
4. PlatformKPICards - Verify calculations

---

## 🔍 Required V9 Views Verification

### Views That MUST Exist:

1. ✅ `v9_contracts_full_enriched` - **TO BE CREATED**
2. ✅ `v9_platform_weekly_trends` - Check existence
3. ✅ `v9_facebook_performance_daily` - Check existence
4. ✅ `v9_google_performance_daily` - Check existence
5. ✅ `v9_attribution_quality_score` - Check existence
6. ✅ `v9_contracts_with_sk_enriched` - Exists (26 columns)
7. ✅ `v9_facebook_creatives_with_contracts` - Exists (10 columns)

### Command to Check Views:
```bash
PGPASSWORD='...' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'stg'
  AND table_name IN (
    'v9_contracts_full_enriched',
    'v9_platform_weekly_trends',
    'v9_facebook_performance_daily',
    'v9_google_performance_daily',
    'v9_attribution_quality_score'
  )
ORDER BY table_name;
"
```

---

## 🚀 Execution Order

1. **IMMEDIATE**: Create v9_contracts_full_enriched view
2. **IMMEDIATE**: Update API endpoint to use new view
3. **IMMEDIATE**: Verify other V9 views exist
4. **IMMEDIATE**: Rebuild API container
5. **IMMEDIATE**: Test all 3 pages
6. **NEXT**: Fix any remaining issues
7. **FINAL**: Document all changes

---

## 📊 Expected Results After Fix

### API Response Format:
```json
[
  {
    "sk_contract": "123456",
    "sk_lead": 556375,
    "contract_date": "2025-10-22",
    "platform": "facebook",
    "campaign_id": "120212345678",
    "campaign_name": "IT курсы осінь 2025",
    "ad_id": "120212345679",
    "ad_name": "Carousel ad - Programming",
    "ad_creative_id": "120212345680",
    "creative_title": "Вивчай програмування з нуля",
    "creative_body": "Python, JavaScript, React - реальні проекти",
    "creative_name": "fall_programming_2025",
    "media_image_src": "https://scontent.xx.fbcdn.net/v/...",
    "event_name": null,
    "traffic_source": null,
    "revenue": 33750.00,
    "product_name": "Python Developer Pro"
  }
]
```

### Frontend Display:
- ✅ ContractsDetailTable shows 4 tables (Facebook, Instagram, Google, Event)
- ✅ Each table shows: date, client, campaign, ad, creative preview, product, revenue
- ✅ Creative images display correctly
- ✅ Summary badges show correct totals

---

## ⚠️ Potential Issues

1. **Performance**: New view with 5 JOINs may be slow
   - Solution: Create materialized view with daily refresh

2. **Missing Data**: Some contracts may not have creative info
   - Solution: LEFT JOINs ensure all contracts returned

3. **Platform Names**: Inconsistent naming (facebook vs Facebook)
   - Solution: Normalize to lowercase in view

4. **Event Contracts**: No creative data for events
   - Solution: Conditional display in ContractsDetailTable

---

**Next Action**: Create v9_contracts_full_enriched view SQL script
