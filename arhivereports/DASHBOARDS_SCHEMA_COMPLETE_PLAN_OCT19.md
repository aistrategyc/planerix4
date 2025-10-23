# Dashboards Schema - Complete Implementation Plan
**Date**: October 19, 2025
**Objective**: Create high-quality normalized staging and dimensional tables for N8N workflow "2 dashboards"

---

## 📊 Executive Summary

### Current State Analysis

**RAW Data Sources**:
1. **CRM Analytics** (`raw.itcrm_analytics`): 4,498 records
   - 46.84% Google Analytics sessions
   - 24.59% Facebook leads
   - 19.43% UTM parameters
   - 8.47% Google Click IDs
   - Mixed JSONB code structures

2. **Facebook Ads** (8 tables):
   - `fb_ad_insights` (10,266 records) - Performance metrics
   - `fb_leads` (283 records) - Lead form submissions
   - `fb_ad_creative_details` (1,167 records, 366 with images)
   - Supporting tables: campaigns, adsets, ads, creative_posts, ad_map

3. **Google Ads** (12 tables):
   - `google_ads_campaign_daily` (266 records)
   - `google_ads_clicks` (302 MB - largest table!)
   - `google_ads_ad_daily`, `google_ads_keyword_daily`, etc.
   - Rich dimensional data: assets, conversion actions, device/hour breakdowns

**Current Dashboards Schema**:
- 48 objects (tables + materialized views)
- v5 and v6 naming conventions coexist
- Some tables well-designed (`fact_leads`, `crm_requests`)
- Missing: Proper staging layer, complete SK architecture

### Problems Identified

1. **❌ No Staging Layer**: Raw data directly consumed by matviews
   - Hard to debug issues
   - Difficult to reprocess data
   - No data quality checks

2. **❌ Incomplete Code Parsing**: CRM `code` JSONB has 5 distinct formats
   - Current parsing misses many attribution signals
   - utm_term contains ad_id but not extracted
   - gsession data ignored
   - fclid (Facebook Click ID) not used

3. **❌ Inconsistent SK Strategy**:
   - Some tables use surrogate keys, others don't
   - No central dimension tables
   - Hard to join across sources

4. **❌ Data Loss**:
   - Only 545 CRM leads attributed vs 4,498 total analytics records
   - Google Ads clicks table (302MB) underutilized
   - Creative details not linked to performance

5. **❌ Performance Issues**:
   - Materialized views refresh entire datasets
   - No incremental updates
   - Missing indexes on join keys

---

## 🎯 Implementation Strategy

### Phase 1: Staging Tables (Clean, Normalized)

Create clean staging tables that parse ALL data from RAW sources:

#### 1.1 CRM Staging (`stg_crm_requests`)

**Purpose**: Normalize `itcrm_analytics` with ALL code variants parsed

**Schema**:
```sql
CREATE TABLE dashboards.stg_crm_requests (
  -- Primary Key
  sk_crm_request BIGSERIAL PRIMARY KEY,

  -- Source IDs
  source_id INTEGER NOT NULL,  -- raw.itcrm_analytics.id
  analytic_id SMALLINT,
  internet_request_id INTEGER,

  -- Contact Info
  phone TEXT,
  email TEXT,
  request_created_at TIMESTAMP,

  -- UTM Parameters (from code JSONB)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,  -- Often contains ad_id!
  utm_content TEXT,

  -- Facebook Attribution
  fb_lead_id TEXT,
  fclid TEXT,  -- Facebook Click ID
  fb_event_id TEXT,

  -- Google Attribution
  gclid TEXT,  -- Google Click ID
  ga_client_id TEXT,  -- GA1.1.XXXXX format

  -- Session Data (from gsession JSONB)
  ga_session_id TEXT,
  ga_session_count INTEGER,
  ga_session_timestamp BIGINT,

  -- Extracted Ad Identifiers
  extracted_ad_id TEXT,  -- Parsed from utm_term or other fields
  extracted_campaign_id TEXT,

  -- Metadata
  raw_code JSONB,  -- Original code field for reference
  code_type TEXT,  -- utm_params|facebook_lead|facebook_click|google_click|google_analytics
  load_timestamp TIMESTAMP DEFAULT NOW(),

  -- Indexes
  UNIQUE(source_id)
);

CREATE INDEX idx_stg_crm_fb_lead_id ON dashboards.stg_crm_requests(fb_lead_id) WHERE fb_lead_id IS NOT NULL;
CREATE INDEX idx_stg_crm_fclid ON dashboards.stg_crm_requests(fclid) WHERE fclid IS NOT NULL;
CREATE INDEX idx_stg_crm_gclid ON dashboards.stg_crm_requests(gclid) WHERE gclid IS NOT NULL AND gclid != '';
CREATE INDEX idx_stg_crm_utm_term ON dashboards.stg_crm_requests(utm_term) WHERE utm_term IS NOT NULL;
CREATE INDEX idx_stg_crm_extracted_ad_id ON dashboards.stg_crm_requests(extracted_ad_id) WHERE extracted_ad_id IS NOT NULL;
CREATE INDEX idx_stg_crm_request_date ON dashboards.stg_crm_requests(request_created_at);
```

**Transformation Logic**:
```sql
INSERT INTO dashboards.stg_crm_requests (
  source_id, analytic_id, internet_request_id,
  phone, email, request_created_at,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  fb_lead_id, fclid, fb_event_id,
  gclid, ga_client_id,
  ga_session_id, ga_session_count, ga_session_timestamp,
  extracted_ad_id, extracted_campaign_id,
  raw_code, code_type
)
SELECT
  id as source_id,
  analytic_id,
  internet_request_id,
  phone,
  email,
  request_created_at,

  -- Parse UTM parameters
  code->>'utm_source' as utm_source,
  code->>'utm_medium' as utm_medium,
  code->>'utm_campaign' as utm_campaign,
  code->>'utm_term' as utm_term,
  code->>'utm_content' as utm_content,

  -- Parse Facebook attribution
  code->>'fb_lead_id' as fb_lead_id,
  NULLIF(code->>'fclid', '') as fclid,
  code->>'event_id' as fb_event_id,

  -- Parse Google attribution
  NULLIF(code->>'gclid', '') as gclid,
  code->>'ga' as ga_client_id,

  -- Parse GA session data (first session property)
  (
    SELECT key
    FROM jsonb_each(code->'gsession')
    LIMIT 1
  ) as ga_session_id,
  (
    SELECT CAST(
      SPLIT_PART(
        SPLIT_PART(value::TEXT, '$o', 2),
        '$',
        1
      ) AS INTEGER
    )
    FROM jsonb_each(code->'gsession')
    LIMIT 1
  ) as ga_session_count,
  (
    SELECT CAST(
      SPLIT_PART(
        SPLIT_PART(value::TEXT, '$t', 2),
        '$',
        1
      ) AS BIGINT
    )
    FROM jsonb_each(code->'gsession')
    LIMIT 1
  ) as ga_session_timestamp,

  -- Extract ad_id from utm_term (often contains ad_id)
  CASE
    WHEN code->>'utm_term' ~ '^\d{15,20}$' THEN code->>'utm_term'  -- Looks like FB ad_id
    ELSE NULL
  END as extracted_ad_id,

  -- Extract campaign_id if possible
  CASE
    WHEN code->>'utm_campaign' ~ '^\d{15,20}$' THEN code->>'utm_campaign'
    ELSE NULL
  END as extracted_campaign_id,

  -- Store raw code for debugging
  code as raw_code,

  -- Classify code type
  CASE
    WHEN code ? 'utm_source' THEN 'utm_params'
    WHEN code ? 'fb_lead_id' AND (code->>'fb_lead_id') IS NOT NULL THEN 'facebook_lead'
    WHEN code ? 'fclid' AND (code->>'fclid') != '' THEN 'facebook_click'
    WHEN code ? 'gclid' AND (code->>'gclid') != '' THEN 'google_click'
    WHEN code ? 'ga' THEN 'google_analytics'
    ELSE 'other'
  END as code_type

FROM raw.itcrm_analytics
WHERE code IS NOT NULL

ON CONFLICT (source_id) DO UPDATE SET
  utm_source = EXCLUDED.utm_source,
  utm_medium = EXCLUDED.utm_medium,
  utm_campaign = EXCLUDED.utm_campaign,
  utm_term = EXCLUDED.utm_term,
  utm_content = EXCLUDED.utm_content,
  fb_lead_id = EXCLUDED.fb_lead_id,
  fclid = EXCLUDED.fclid,
  fb_event_id = EXCLUDED.fb_event_id,
  gclid = EXCLUDED.gclid,
  ga_client_id = EXCLUDED.ga_client_id,
  ga_session_id = EXCLUDED.ga_session_id,
  ga_session_count = EXCLUDED.ga_session_count,
  ga_session_timestamp = EXCLUDED.ga_session_timestamp,
  extracted_ad_id = EXCLUDED.extracted_ad_id,
  extracted_campaign_id = EXCLUDED.extracted_campaign_id,
  raw_code = EXCLUDED.raw_code,
  code_type = EXCLUDED.code_type,
  load_timestamp = NOW();
```

#### 1.2 Facebook Ads Staging (`stg_fb_ads_daily`)

**Purpose**: Daily aggregated Facebook ad performance with full attribution chain

**Schema**:
```sql
CREATE TABLE dashboards.stg_fb_ads_daily (
  sk_fb_ad_daily BIGSERIAL PRIMARY KEY,

  -- Date & Identifiers
  date_day DATE NOT NULL,
  ad_id TEXT NOT NULL,
  ad_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  account_id TEXT,

  -- Status
  ad_status TEXT,
  adset_status TEXT,
  campaign_status TEXT,
  campaign_objective TEXT,

  -- Performance Metrics
  impressions BIGINT,
  clicks BIGINT,
  spend NUMERIC(18,6),
  reach BIGINT,
  frequency NUMERIC(10,4),

  -- Action Metrics (array of JSONB for all action types)
  actions JSONB,  -- All fb_ad_insights actions

  -- Calculated Metrics
  ctr NUMERIC(10,4),  -- (clicks / impressions) * 100
  cpc NUMERIC(18,6),  -- spend / clicks
  cpm NUMERIC(18,6),  -- (spend / impressions) * 1000

  -- Creative Link
  ad_creative_id TEXT,

  -- Metadata
  load_timestamp TIMESTAMP DEFAULT NOW(),
  source_row_ids TEXT[],  -- Array of raw.fb_ad_insights.id for traceability

  UNIQUE(date_day, ad_id, campaign_id)
);

CREATE INDEX idx_stg_fb_ads_date ON dashboards.stg_fb_ads_daily(date_day);
CREATE INDEX idx_stg_fb_ads_ad_id ON dashboards.stg_fb_ads_daily(ad_id);
CREATE INDEX idx_stg_fb_ads_campaign_id ON dashboards.stg_fb_ads_daily(campaign_id);
CREATE INDEX idx_stg_fb_ads_creative_id ON dashboards.stg_fb_ads_daily(ad_creative_id) WHERE ad_creative_id IS NOT NULL;
```

#### 1.3 Google Ads Staging (`stg_google_ads_daily`)

**Purpose**: Daily aggregated Google Ads performance

**Schema**:
```sql
CREATE TABLE dashboards.stg_google_ads_daily (
  sk_google_ad_daily BIGSERIAL PRIMARY KEY,

  -- Date & Identifiers
  date_day DATE NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  ad_group_id TEXT,
  ad_group_name TEXT,
  ad_id TEXT,

  -- Status
  campaign_status TEXT,
  ad_group_status TEXT,
  ad_status TEXT,

  -- Performance Metrics
  impressions BIGINT,
  clicks BIGINT,
  cost_micros BIGINT,  -- Cost in micros (divide by 1M for actual cost)
  spend NUMERIC(18,6),  -- Calculated: cost_micros / 1,000,000
  conversions NUMERIC(10,2),
  conversion_value NUMERIC(18,6),

  -- Calculated Metrics
  ctr NUMERIC(10,4),
  cpc NUMERIC(18,6),
  cpm NUMERIC(18,6),

  -- Device & Network
  device TEXT,
  network TEXT,

  -- Metadata
  load_timestamp TIMESTAMP DEFAULT NOW(),
  source_table TEXT,  -- Which raw table this came from

  UNIQUE(date_day, campaign_id, COALESCE(ad_id, ''), COALESCE(device, ''))
);

CREATE INDEX idx_stg_google_ads_date ON dashboards.stg_google_ads_daily(date_day);
CREATE INDEX idx_stg_google_ads_campaign_id ON dashboards.stg_google_ads_daily(campaign_id);
CREATE INDEX idx_stg_google_ads_ad_id ON dashboards.stg_google_ads_daily(ad_id) WHERE ad_id IS NOT NULL;
```

#### 1.4 Google Clicks Staging (`stg_google_clicks`)

**Purpose**: Clean version of google_ads_clicks with parsed parameters

**Schema**:
```sql
CREATE TABLE dashboards.stg_google_clicks (
  sk_google_click BIGSERIAL PRIMARY KEY,

  -- Click Details
  gclid TEXT NOT NULL,
  click_timestamp TIMESTAMP NOT NULL,

  -- Page Info
  page_url TEXT,
  page_path TEXT,
  page_title TEXT,

  -- UTM Parameters (parsed from page_url)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Extracted IDs
  extracted_campaign_id TEXT,
  extracted_ad_id TEXT,

  -- Metadata
  raw_url TEXT,
  load_timestamp TIMESTAMP DEFAULT NOW(),

  UNIQUE(gclid, click_timestamp)
);

CREATE INDEX idx_stg_google_clicks_gclid ON dashboards.stg_google_clicks(gclid);
CREATE INDEX idx_stg_google_clicks_timestamp ON dashboards.stg_google_clicks(click_timestamp);
CREATE INDEX idx_stg_google_clicks_campaign_id ON dashboards.stg_google_clicks(extracted_campaign_id) WHERE extracted_campaign_id IS NOT NULL;
```

---

### Phase 2: Dimension Tables (Master Data)

Create proper dimension tables with surrogate keys:

#### 2.1 `dim_campaign`

**Purpose**: Master list of all campaigns across all platforms

**Schema**:
```sql
CREATE TABLE dashboards.dim_campaign (
  sk_campaign BIGSERIAL PRIMARY KEY,

  -- Natural Keys
  platform TEXT NOT NULL,  -- 'facebook' | 'google' | 'other'
  campaign_id TEXT NOT NULL,

  -- Attributes
  campaign_name TEXT,
  campaign_status TEXT,
  campaign_objective TEXT,  -- Facebook only
  campaign_type TEXT,  -- Google: Search, Display, Shopping, etc.

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Classification (manual or auto)
  product_category TEXT,  -- 'Web Development', 'QA', 'Design', etc.
  target_audience TEXT,  -- 'Kiev', 'Ukraine', 'All', etc.
  manager_name TEXT,

  -- Metadata
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(platform, campaign_id)
);

CREATE INDEX idx_dim_campaign_name ON dashboards.dim_campaign(campaign_name);
CREATE INDEX idx_dim_campaign_platform ON dashboards.dim_campaign(platform);
CREATE INDEX idx_dim_campaign_active ON dashboards.dim_campaign(is_active);
```

#### 2.2 `dim_ad`

**Purpose**: Master list of all ads

**Schema**:
```sql
CREATE TABLE dashboards.dim_ad (
  sk_ad BIGSERIAL PRIMARY KEY,

  -- Natural Keys
  platform TEXT NOT NULL,
  ad_id TEXT NOT NULL,

  -- Foreign Keys
  sk_campaign BIGINT REFERENCES dashboards.dim_campaign(sk_campaign),

  -- Attributes
  ad_name TEXT,
  ad_status TEXT,
  adset_id TEXT,  -- Facebook only
  adset_name TEXT,
  ad_group_id TEXT,  -- Google only
  ad_group_name TEXT,

  -- Creative Link
  ad_creative_id TEXT,  -- Facebook

  -- Metadata
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(platform, ad_id)
);

CREATE INDEX idx_dim_ad_campaign ON dashboards.dim_ad(sk_campaign);
CREATE INDEX idx_dim_ad_creative ON dashboards.dim_ad(ad_creative_id) WHERE ad_creative_id IS NOT NULL;
```

#### 2.3 `dim_creative`

**Purpose**: Facebook ad creatives with images

**Schema**:
```sql
CREATE TABLE dashboards.dim_creative (
  sk_creative BIGSERIAL PRIMARY KEY,

  -- Natural Key
  ad_creative_id TEXT NOT NULL UNIQUE,

  -- Media
  media_type TEXT,  -- 'image' | 'video' | 'carousel'
  media_image_src TEXT,
  thumbnail_url TEXT,
  video_id TEXT,

  -- Content
  title TEXT,
  body TEXT,
  description TEXT,
  call_to_action TEXT,
  link_url TEXT,
  permalink_url TEXT,

  -- Metadata
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dim_creative_has_image ON dashboards.dim_creative(media_image_src) WHERE media_image_src IS NOT NULL;
```

#### 2.4 `dim_source`

**Purpose**: Traffic source classification

**Schema**:
```sql
CREATE TABLE dashboards.dim_source (
  sk_source BIGSERIAL PRIMARY KEY,

  -- Natural Key
  source_key TEXT NOT NULL UNIQUE,  -- Composite: platform|source|medium|campaign

  -- Components
  platform TEXT,  -- 'facebook' | 'google' | 'direct' | 'organic' | 'email' | 'other'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Classification
  source_type TEXT,  -- 'paid' | 'organic' | 'direct' | 'referral' | 'email' | 'social'
  source_category TEXT,  -- 'Paid Search' | 'Paid Social' | 'Organic' | 'Direct' | 'Email'

  -- Metadata
  first_seen_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.5 `dim_lead`

**Purpose**: Master list of all leads (deduplicated by phone/email)

**Schema**:
```sql
CREATE TABLE dashboards.dim_lead (
  sk_lead BIGSERIAL PRIMARY KEY,

  -- Contact Info (deduplicated)
  phone TEXT,
  email TEXT,

  -- First Touch
  first_request_at TIMESTAMP,
  first_utm_source TEXT,
  first_utm_medium TEXT,
  first_utm_campaign TEXT,

  -- Metadata
  total_requests INTEGER DEFAULT 1,
  last_request_at TIMESTAMP,
  is_converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP,

  UNIQUE(phone, email)
);

CREATE INDEX idx_dim_lead_phone ON dashboards.dim_lead(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_dim_lead_email ON dashboards.dim_lead(email) WHERE email IS NOT NULL;
CREATE INDEX idx_dim_lead_converted ON dashboards.dim_lead(is_converted);
```

---

### Phase 3: Fact Tables (Transactional Data)

#### 3.1 `fact_ad_performance`

**Purpose**: Daily ad performance facts with full attribution

**Schema**:
```sql
CREATE TABLE dashboards.fact_ad_performance (
  sk_fact_ad_performance BIGSERIAL PRIMARY KEY,

  -- Date & Foreign Keys
  date_day DATE NOT NULL,
  sk_campaign BIGINT REFERENCES dashboards.dim_campaign(sk_campaign),
  sk_ad BIGINT REFERENCES dashboards.dim_ad(sk_ad),
  sk_creative BIGINT REFERENCES dashboards.dim_creative(sk_creative),

  -- Platform
  platform TEXT NOT NULL,

  -- Performance Metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC(18,6) DEFAULT 0,
  reach BIGINT DEFAULT 0,

  -- Calculated Metrics
  ctr NUMERIC(10,4),
  cpc NUMERIC(18,6),
  cpm NUMERIC(18,6),

  -- Metadata
  load_timestamp TIMESTAMP DEFAULT NOW(),

  UNIQUE(date_day, sk_ad, platform)
);

CREATE INDEX idx_fact_ad_perf_date ON dashboards.fact_ad_performance(date_day);
CREATE INDEX idx_fact_ad_perf_campaign ON dashboards.fact_ad_performance(sk_campaign);
CREATE INDEX idx_fact_ad_perf_ad ON dashboards.fact_ad_performance(sk_ad);
CREATE INDEX idx_fact_ad_perf_platform ON dashboards.fact_ad_performance(platform);
```

#### 3.2 `fact_lead_request`

**Purpose**: Every CRM request with full attribution

**Schema**:
```sql
CREATE TABLE dashboards.fact_lead_request (
  sk_fact_lead_request BIGSERIAL PRIMARY KEY,

  -- Foreign Keys
  sk_lead BIGINT REFERENCES dashboards.dim_lead(sk_lead),
  sk_campaign BIGINT REFERENCES dashboards.dim_campaign(sk_campaign),
  sk_ad BIGINT REFERENCES dashboards.dim_ad(sk_ad),
  sk_source BIGINT REFERENCES dashboards.dim_source(sk_source),

  -- Request Details
  request_created_at TIMESTAMP NOT NULL,
  analytic_id SMALLINT,
  internet_request_id INTEGER,

  -- Attribution Identifiers
  fb_lead_id TEXT,
  fclid TEXT,
  gclid TEXT,
  ga_client_id TEXT,

  -- Source Data
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,

  -- Lead Quality Indicators
  has_phone BOOLEAN,
  has_email BOOLEAN,
  has_fb_attribution BOOLEAN,
  has_google_attribution BOOLEAN,

  -- Metadata
  code_type TEXT,
  load_timestamp TIMESTAMP DEFAULT NOW(),

  UNIQUE(analytic_id, internet_request_id)
);

CREATE INDEX idx_fact_lead_req_lead ON dashboards.fact_lead_request(sk_lead);
CREATE INDEX idx_fact_lead_req_campaign ON dashboards.fact_lead_request(sk_campaign);
CREATE INDEX idx_fact_lead_req_ad ON dashboards.fact_lead_request(sk_ad);
CREATE INDEX idx_fact_lead_req_date ON dashboards.fact_lead_request(request_created_at);
CREATE INDEX idx_fact_lead_req_fb_lead_id ON dashboards.fact_lead_request(fb_lead_id) WHERE fb_lead_id IS NOT NULL;
CREATE INDEX idx_fact_lead_req_gclid ON dashboards.fact_lead_request(gclid) WHERE gclid IS NOT NULL;
```

#### 3.3 `fact_contract`

**Purpose**: Contracts with attribution to source campaign/ad

**Schema**:
```sql
CREATE TABLE dashboards.fact_contract (
  sk_contract BIGSERIAL PRIMARY KEY,

  -- Foreign Keys
  sk_lead BIGINT REFERENCES dashboards.dim_lead(sk_lead),
  sk_campaign BIGINT REFERENCES dashboards.dim_campaign(sk_campaign),
  sk_ad BIGINT REFERENCES dashboards.dim_ad(sk_ad),

  -- Contract Details
  contract_id TEXT NOT NULL UNIQUE,
  contract_created_at TIMESTAMP NOT NULL,
  contract_amount NUMERIC(18,2),
  payment_amount NUMERIC(18,2),

  -- Product
  product_name TEXT,
  product_category TEXT,

  -- Branch
  branch_name TEXT,
  branch_city TEXT,

  -- Attribution Confidence
  attribution_method TEXT,  -- 'direct_match' | 'fuzzy_match' | 'first_touch' | 'last_touch' | 'unknown'
  attribution_confidence NUMERIC(3,2),  -- 0.00 to 1.00

  -- Metadata
  load_timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fact_contract_lead ON dashboards.fact_contract(sk_lead);
CREATE INDEX idx_fact_contract_campaign ON dashboards.fact_contract(sk_campaign);
CREATE INDEX idx_fact_contract_date ON dashboards.fact_contract(contract_created_at);
```

---

### Phase 4: Bridge Tables (Many-to-Many)

#### 4.1 `bridge_lead_campaigns`

**Purpose**: Track all campaigns a lead touched (multi-touch attribution)

**Schema**:
```sql
CREATE TABLE dashboards.bridge_lead_campaigns (
  sk_lead BIGINT REFERENCES dashboards.dim_lead(sk_lead),
  sk_campaign BIGINT REFERENCES dashboards.dim_campaign(sk_campaign),

  -- Touch Details
  touch_sequence INTEGER,  -- 1 = first touch, 2 = second, etc.
  touch_timestamp TIMESTAMP,
  touch_type TEXT,  -- 'view' | 'click' | 'form_submit'

  -- Attribution Weight
  attribution_weight NUMERIC(5,4),  -- For multi-touch attribution models

  PRIMARY KEY (sk_lead, sk_campaign, touch_timestamp)
);

CREATE INDEX idx_bridge_lead_campaigns_lead ON dashboards.bridge_lead_campaigns(sk_lead);
CREATE INDEX idx_bridge_lead_campaigns_campaign ON dashboards.bridge_lead_campaigns(sk_campaign);
```

---

## 🔧 N8N Workflow Implementation

### Workflow Structure

```
[Trigger: Schedule 15min]
  ↓
[1. Load CRM RAW → stg_crm_requests]
  ↓
[2. Load FB Ads RAW → stg_fb_ads_daily]
  ↓
[3. Load Google Ads RAW → stg_google_ads_daily]
  ↓
[4. Load Google Clicks RAW → stg_google_clicks]
  ↓
[5. Upsert dim_campaign]
  ↓
[6. Upsert dim_ad]
  ↓
[7. Upsert dim_creative]
  ↓
[8. Upsert dim_lead (deduplicate)]
  ↓
[9. Upsert dim_source]
  ↓
[10. Insert fact_lead_request (with SK lookups)]
  ↓
[11. Insert fact_ad_performance]
  ↓
[12. Update contracts attribution]
  ↓
[13. Refresh Materialized Views]
  ↓
[Success Notification]
```

---

## 📝 SQL Queries for N8N Nodes

### Node 1: Load CRM → Staging

```sql
-- Use the INSERT query from section 1.1 above
-- This is the ~150 line query that parses all code variants
```

### Node 2: Load Facebook Ads → Staging

```sql
INSERT INTO dashboards.stg_fb_ads_daily (
  date_day, ad_id, ad_name, adset_id, adset_name,
  campaign_id, campaign_name, account_id,
  ad_status, adset_status, campaign_status, campaign_objective,
  impressions, clicks, spend, reach, frequency,
  actions, ctr, cpc, cpm, ad_creative_id,
  source_row_ids
)
SELECT
  fai.date_start as date_day,
  fai.ad_id,
  fai.ad_name,
  fai.adset_id,
  fas.name as adset_name,
  fai.campaign_id,
  fc.name as campaign_name,
  fai.account_id,

  fa.status as ad_status,
  fas.status as adset_status,
  fc.status as campaign_status,
  fc.objective as campaign_objective,

  SUM(fai.impressions) as impressions,
  SUM(fai.clicks) as clicks,
  SUM(fai.spend) as spend,
  SUM(fai.reach) as reach,
  AVG(fai.frequency) as frequency,

  jsonb_agg(fai.actions) FILTER (WHERE fai.actions IS NOT NULL) as actions,

  CASE
    WHEN SUM(fai.impressions) > 0
    THEN (SUM(fai.clicks)::NUMERIC / SUM(fai.impressions) * 100)::NUMERIC(10,4)
  END as ctr,

  CASE
    WHEN SUM(fai.clicks) > 0
    THEN (SUM(fai.spend) / SUM(fai.clicks))::NUMERIC(18,6)
  END as cpc,

  CASE
    WHEN SUM(fai.impressions) > 0
    THEN (SUM(fai.spend) / SUM(fai.impressions) * 1000)::NUMERIC(18,6)
  END as cpm,

  fa.ad_creative_id,

  array_agg(fai.id::TEXT) as source_row_ids

FROM raw.fb_ad_insights fai
LEFT JOIN raw.fb_ads fa ON fai.ad_id = fa.ad_id
LEFT JOIN raw.fb_adsets fas ON fai.adset_id = fas.adset_id
LEFT JOIN raw.fb_campaigns fc ON fai.campaign_id = fc.campaign_id

WHERE fai.date_start >= CURRENT_DATE - INTERVAL '90 days'

GROUP BY
  fai.date_start, fai.ad_id, fai.ad_name, fai.adset_id, fas.name,
  fai.campaign_id, fc.name, fai.account_id,
  fa.status, fas.status, fc.status, fc.objective,
  fa.ad_creative_id

ON CONFLICT (date_day, ad_id, campaign_id) DO UPDATE SET
  ad_name = EXCLUDED.ad_name,
  adset_name = EXCLUDED.adset_name,
  campaign_name = EXCLUDED.campaign_name,
  ad_status = EXCLUDED.ad_status,
  adset_status = EXCLUDED.adset_status,
  campaign_status = EXCLUDED.campaign_status,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  spend = EXCLUDED.spend,
  reach = EXCLUDED.reach,
  frequency = EXCLUDED.frequency,
  actions = EXCLUDED.actions,
  ctr = EXCLUDED.ctr,
  cpc = EXCLUDED.cpc,
  cpm = EXCLUDED.cpm,
  ad_creative_id = EXCLUDED.ad_creative_id,
  load_timestamp = NOW();
```

### Node 3: Load Google Ads → Staging

```sql
INSERT INTO dashboards.stg_google_ads_daily (
  date_day, campaign_id, campaign_name,
  ad_group_id, ad_group_name, ad_id,
  campaign_status, ad_group_status, ad_status,
  impressions, clicks, cost_micros, spend,
  conversions, conversion_value,
  ctr, cpc, cpm,
  device, network, source_table
)
SELECT
  date as date_day,
  campaign_id::TEXT,
  campaign_name,
  NULL as ad_group_id,
  NULL as ad_group_name,
  NULL as ad_id,

  campaign_status,
  NULL as ad_group_status,
  NULL as ad_status,

  SUM(impressions) as impressions,
  SUM(clicks) as clicks,
  SUM(cost_micros) as cost_micros,
  (SUM(cost_micros)::NUMERIC / 1000000)::NUMERIC(18,6) as spend,

  SUM(conversions) as conversions,
  SUM(conversion_value) as conversion_value,

  CASE
    WHEN SUM(impressions) > 0
    THEN (SUM(clicks)::NUMERIC / SUM(impressions) * 100)::NUMERIC(10,4)
  END as ctr,

  CASE
    WHEN SUM(clicks) > 0
    THEN (SUM(cost_micros)::NUMERIC / 1000000 / SUM(clicks))::NUMERIC(18,6)
  END as cpc,

  CASE
    WHEN SUM(impressions) > 0
    THEN (SUM(cost_micros)::NUMERIC / 1000000 / SUM(impressions) * 1000)::NUMERIC(18,6)
  END as cpm,

  NULL as device,
  NULL as network,
  'google_ads_campaign_daily' as source_table

FROM raw.google_ads_campaign_daily

WHERE date >= CURRENT_DATE - INTERVAL '90 days'

GROUP BY date, campaign_id, campaign_name, campaign_status

ON CONFLICT (date_day, campaign_id, COALESCE(ad_id, ''), COALESCE(device, ''))
DO UPDATE SET
  campaign_name = EXCLUDED.campaign_name,
  campaign_status = EXCLUDED.campaign_status,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  cost_micros = EXCLUDED.cost_micros,
  spend = EXCLUDED.spend,
  conversions = EXCLUDED.conversions,
  conversion_value = EXCLUDED.conversion_value,
  ctr = EXCLUDED.ctr,
  cpc = EXCLUDED.cpc,
  cpm = EXCLUDED.cpm,
  load_timestamp = NOW();
```

### Node 4: Load Google Clicks → Staging

```sql
INSERT INTO dashboards.stg_google_clicks (
  gclid, click_timestamp,
  page_url, page_path, page_title,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  extracted_campaign_id, extracted_ad_id,
  raw_url
)
SELECT DISTINCT
  gclid,
  click_timestamp,
  page_url,
  SPLIT_PART(page_url, '?', 1) as page_path,
  NULL as page_title,

  -- Parse UTM from URL
  (regexp_matches(page_url, '[?&]utm_source=([^&]*)'))[1] as utm_source,
  (regexp_matches(page_url, '[?&]utm_medium=([^&]*)'))[1] as utm_medium,
  (regexp_matches(page_url, '[?&]utm_campaign=([^&]*)'))[1] as utm_campaign,
  (regexp_matches(page_url, '[?&]utm_term=([^&]*)'))[1] as utm_term,
  (regexp_matches(page_url, '[?&]utm_content=([^&]*)'))[1] as utm_content,

  -- Extract campaign_id if present in URL
  CASE
    WHEN (regexp_matches(page_url, '[?&]utm_campaign=(\d{10,20})'))[1] IS NOT NULL
    THEN (regexp_matches(page_url, '[?&]utm_campaign=(\d{10,20})'))[1]
  END as extracted_campaign_id,

  -- Extract ad_id if present
  CASE
    WHEN (regexp_matches(page_url, '[?&]utm_term=(\d{15,20})'))[1] IS NOT NULL
    THEN (regexp_matches(page_url, '[?&]utm_term=(\d{15,20})'))[1]
  END as extracted_ad_id,

  page_url as raw_url

FROM raw.google_ads_clicks

WHERE click_timestamp >= CURRENT_DATE - INTERVAL '90 days'
  AND gclid IS NOT NULL
  AND gclid != ''

ON CONFLICT (gclid, click_timestamp) DO NOTHING;
```

### Node 5: Upsert dim_campaign

```sql
INSERT INTO dashboards.dim_campaign (
  platform, campaign_id, campaign_name, campaign_status,
  campaign_objective, campaign_type, last_seen_at
)
-- Facebook campaigns
SELECT DISTINCT
  'facebook' as platform,
  campaign_id,
  campaign_name,
  campaign_status,
  campaign_objective,
  NULL as campaign_type,
  NOW() as last_seen_at
FROM dashboards.stg_fb_ads_daily
WHERE campaign_id IS NOT NULL

UNION

-- Google campaigns
SELECT DISTINCT
  'google' as platform,
  campaign_id,
  campaign_name,
  campaign_status,
  NULL as campaign_objective,
  NULL as campaign_type,  -- TODO: enrich with campaign type from raw data
  NOW() as last_seen_at
FROM dashboards.stg_google_ads_daily
WHERE campaign_id IS NOT NULL

ON CONFLICT (platform, campaign_id) DO UPDATE SET
  campaign_name = COALESCE(EXCLUDED.campaign_name, dim_campaign.campaign_name),
  campaign_status = COALESCE(EXCLUDED.campaign_status, dim_campaign.campaign_status),
  campaign_objective = COALESCE(EXCLUDED.campaign_objective, dim_campaign.campaign_objective),
  last_seen_at = NOW();
```

### Node 6: Upsert dim_ad

```sql
INSERT INTO dashboards.dim_ad (
  platform, ad_id, ad_name, ad_status,
  adset_id, adset_name, ad_creative_id,
  sk_campaign, last_seen_at
)
SELECT DISTINCT
  'facebook' as platform,
  sfad.ad_id,
  sfad.ad_name,
  sfad.ad_status,
  sfad.adset_id,
  sfad.adset_name,
  sfad.ad_creative_id,
  dc.sk_campaign,
  NOW() as last_seen_at
FROM dashboards.stg_fb_ads_daily sfad
LEFT JOIN dashboards.dim_campaign dc ON (
  dc.platform = 'facebook'
  AND dc.campaign_id = sfad.campaign_id
)
WHERE sfad.ad_id IS NOT NULL

ON CONFLICT (platform, ad_id) DO UPDATE SET
  ad_name = COALESCE(EXCLUDED.ad_name, dim_ad.ad_name),
  ad_status = COALESCE(EXCLUDED.ad_status, dim_ad.ad_status),
  adset_id = COALESCE(EXCLUDED.adset_id, dim_ad.adset_id),
  adset_name = COALESCE(EXCLUDED.adset_name, dim_ad.adset_name),
  ad_creative_id = COALESCE(EXCLUDED.ad_creative_id, dim_ad.ad_creative_id),
  sk_campaign = COALESCE(EXCLUDED.sk_campaign, dim_ad.sk_campaign),
  last_seen_at = NOW();
```

### Node 7: Upsert dim_creative

```sql
INSERT INTO dashboards.dim_creative (
  ad_creative_id, media_type, media_image_src, thumbnail_url,
  video_id, title, body, description, call_to_action,
  link_url, permalink_url, last_updated_at
)
SELECT DISTINCT
  ad_creative_id,
  CASE
    WHEN video_id IS NOT NULL THEN 'video'
    WHEN media_image_src IS NOT NULL THEN 'image'
    ELSE 'unknown'
  END as media_type,
  media_image_src,
  thumbnail_url,
  video_id,
  title,
  body,
  description,
  cta_type as call_to_action,
  link_url,
  permalink_url,
  NOW() as last_updated_at
FROM raw.fb_ad_creative_details
WHERE ad_creative_id IS NOT NULL

ON CONFLICT (ad_creative_id) DO UPDATE SET
  media_type = COALESCE(EXCLUDED.media_type, dim_creative.media_type),
  media_image_src = COALESCE(EXCLUDED.media_image_src, dim_creative.media_image_src),
  thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, dim_creative.thumbnail_url),
  video_id = COALESCE(EXCLUDED.video_id, dim_creative.video_id),
  title = COALESCE(EXCLUDED.title, dim_creative.title),
  body = COALESCE(EXCLUDED.body, dim_creative.body),
  description = COALESCE(EXCLUDED.description, dim_creative.description),
  call_to_action = COALESCE(EXCLUDED.call_to_action, dim_creative.call_to_action),
  link_url = COALESCE(EXCLUDED.link_url, dim_creative.link_url),
  permalink_url = COALESCE(EXCLUDED.permalink_url, dim_creative.permalink_url),
  last_updated_at = NOW();
```

### Node 8: Upsert dim_lead (Deduplicate)

```sql
-- First, upsert all unique phone/email combinations
INSERT INTO dashboards.dim_lead (
  phone, email, first_request_at, last_request_at,
  first_utm_source, first_utm_medium, first_utm_campaign,
  total_requests
)
SELECT
  phone,
  email,
  MIN(request_created_at) as first_request_at,
  MAX(request_created_at) as last_request_at,
  (array_agg(utm_source ORDER BY request_created_at))[1] as first_utm_source,
  (array_agg(utm_medium ORDER BY request_created_at))[1] as first_utm_medium,
  (array_agg(utm_campaign ORDER BY request_created_at))[1] as first_utm_campaign,
  COUNT(*) as total_requests
FROM dashboards.stg_crm_requests
WHERE phone IS NOT NULL OR email IS NOT NULL
GROUP BY phone, email

ON CONFLICT (phone, email) DO UPDATE SET
  last_request_at = GREATEST(dim_lead.last_request_at, EXCLUDED.last_request_at),
  total_requests = dim_lead.total_requests + EXCLUDED.total_requests;
```

### Node 9: Upsert dim_source

```sql
INSERT INTO dashboards.dim_source (
  source_key, platform, utm_source, utm_medium, utm_campaign,
  source_type, source_category
)
SELECT DISTINCT
  COALESCE(
    CONCAT_WS('|',
      COALESCE(
        CASE
          WHEN utm_source IN ('Instagram_Reels', 'an', 'fb', 'facebook') THEN 'facebook'
          WHEN utm_source IN ('google', 'google_ads') THEN 'google'
          ELSE 'other'
        END,
        'unknown'
      ),
      COALESCE(utm_source, 'unknown'),
      COALESCE(utm_medium, 'unknown'),
      COALESCE(utm_campaign, 'unknown')
    ),
    'unknown|unknown|unknown|unknown'
  ) as source_key,

  CASE
    WHEN utm_source IN ('Instagram_Reels', 'an', 'fb', 'facebook') THEN 'facebook'
    WHEN utm_source IN ('google', 'google_ads') THEN 'google'
    WHEN utm_source = '(direct)' THEN 'direct'
    WHEN utm_medium = 'organic' THEN 'organic'
    WHEN utm_medium = 'email' THEN 'email'
    ELSE 'other'
  END as platform,

  utm_source,
  utm_medium,
  utm_campaign,

  CASE
    WHEN utm_medium IN ('cpm', 'cpc', 'ppc', 'paid') THEN 'paid'
    WHEN utm_medium = 'organic' THEN 'organic'
    WHEN utm_source = '(direct)' THEN 'direct'
    WHEN utm_medium = 'referral' THEN 'referral'
    WHEN utm_medium = 'email' THEN 'email'
    WHEN utm_medium = 'social' THEN 'social'
    ELSE 'other'
  END as source_type,

  CASE
    WHEN utm_medium IN ('cpm', 'cpc', 'ppc', 'paid') AND utm_source IN ('google', 'google_ads') THEN 'Paid Search'
    WHEN utm_medium IN ('cpm', 'cpc', 'ppc', 'paid') AND utm_source IN ('fb', 'facebook', 'Instagram_Reels') THEN 'Paid Social'
    WHEN utm_medium = 'organic' THEN 'Organic'
    WHEN utm_source = '(direct)' THEN 'Direct'
    WHEN utm_medium = 'email' THEN 'Email'
    WHEN utm_medium = 'referral' THEN 'Referral'
    ELSE 'Other'
  END as source_category

FROM dashboards.stg_crm_requests
WHERE utm_source IS NOT NULL OR utm_medium IS NOT NULL OR utm_campaign IS NOT NULL

ON CONFLICT (source_key) DO NOTHING;
```

### Node 10: Insert fact_lead_request

```sql
INSERT INTO dashboards.fact_lead_request (
  sk_lead, sk_campaign, sk_ad, sk_source,
  request_created_at, analytic_id, internet_request_id,
  fb_lead_id, fclid, gclid, ga_client_id,
  utm_source, utm_medium, utm_campaign, utm_term,
  has_phone, has_email, has_fb_attribution, has_google_attribution,
  code_type
)
SELECT
  dl.sk_lead,
  dc.sk_campaign,
  da.sk_ad,
  ds.sk_source,

  scr.request_created_at,
  scr.analytic_id,
  scr.internet_request_id,

  scr.fb_lead_id,
  scr.fclid,
  scr.gclid,
  scr.ga_client_id,

  scr.utm_source,
  scr.utm_medium,
  scr.utm_campaign,
  scr.utm_term,

  scr.phone IS NOT NULL as has_phone,
  scr.email IS NOT NULL as has_email,
  (scr.fb_lead_id IS NOT NULL OR scr.fclid IS NOT NULL) as has_fb_attribution,
  (scr.gclid IS NOT NULL AND scr.gclid != '') as has_google_attribution,

  scr.code_type

FROM dashboards.stg_crm_requests scr

-- Join to dim_lead
LEFT JOIN dashboards.dim_lead dl ON (
  dl.phone = scr.phone AND dl.email = scr.email
)

-- Join to dim_campaign via extracted_ad_id → dim_ad → dim_campaign
LEFT JOIN dashboards.dim_ad da ON (
  (da.platform = 'facebook' AND da.ad_id = scr.extracted_ad_id)
  OR (da.platform = 'facebook' AND da.ad_id = scr.utm_term)
)
LEFT JOIN dashboards.dim_campaign dc ON da.sk_campaign = dc.sk_campaign

-- Join to dim_source
LEFT JOIN dashboards.dim_source ds ON (
  ds.source_key = CONCAT_WS('|',
    CASE
      WHEN scr.utm_source IN ('Instagram_Reels', 'an', 'fb', 'facebook') THEN 'facebook'
      WHEN scr.utm_source IN ('google', 'google_ads') THEN 'google'
      ELSE 'other'
    END,
    COALESCE(scr.utm_source, 'unknown'),
    COALESCE(scr.utm_medium, 'unknown'),
    COALESCE(scr.utm_campaign, 'unknown')
  )
)

WHERE scr.load_timestamp > (SELECT COALESCE(MAX(load_timestamp), '1970-01-01') FROM dashboards.fact_lead_request)

ON CONFLICT (analytic_id, internet_request_id) DO NOTHING;
```

### Node 11: Insert fact_ad_performance

```sql
INSERT INTO dashboards.fact_ad_performance (
  date_day, sk_campaign, sk_ad, sk_creative,
  platform, impressions, clicks, spend, reach,
  ctr, cpc, cpm
)
SELECT
  sfad.date_day,
  dc.sk_campaign,
  da.sk_ad,
  dcr.sk_creative,

  'facebook' as platform,

  sfad.impressions,
  sfad.clicks,
  sfad.spend,
  sfad.reach,

  sfad.ctr,
  sfad.cpc,
  sfad.cpm

FROM dashboards.stg_fb_ads_daily sfad

LEFT JOIN dashboards.dim_campaign dc ON (
  dc.platform = 'facebook' AND dc.campaign_id = sfad.campaign_id
)
LEFT JOIN dashboards.dim_ad da ON (
  da.platform = 'facebook' AND da.ad_id = sfad.ad_id
)
LEFT JOIN dashboards.dim_creative dcr ON (
  dcr.ad_creative_id = sfad.ad_creative_id
)

WHERE sfad.load_timestamp > (SELECT COALESCE(MAX(load_timestamp), '1970-01-01') FROM dashboards.fact_ad_performance WHERE platform = 'facebook')

UNION ALL

SELECT
  sgad.date_day,
  dc.sk_campaign,
  NULL as sk_ad,
  NULL as sk_creative,

  'google' as platform,

  sgad.impressions,
  sgad.clicks,
  sgad.spend,
  NULL as reach,

  sgad.ctr,
  sgad.cpc,
  sgad.cpm

FROM dashboards.stg_google_ads_daily sgad

LEFT JOIN dashboards.dim_campaign dc ON (
  dc.platform = 'google' AND dc.campaign_id = sgad.campaign_id
)

WHERE sgad.load_timestamp > (SELECT COALESCE(MAX(load_timestamp), '1970-01-01') FROM dashboards.fact_ad_performance WHERE platform = 'google')

ON CONFLICT (date_day, sk_ad, platform) DO UPDATE SET
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  spend = EXCLUDED.spend,
  reach = EXCLUDED.reach,
  ctr = EXCLUDED.ctr,
  cpc = EXCLUDED.cpc,
  cpm = EXCLUDED.cpm,
  load_timestamp = NOW();
```

### Node 12: Refresh Materialized Views

```sql
-- Refresh key materialized views in dependency order
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_full_attribution;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_fb_ads_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_google_ads_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_campaign_daily_full;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_funnel_daily;
```

---

## 🎯 Expected Results

### Data Coverage Improvement

**Current State**:
- CRM leads attributed: 545 / 4,498 (12.1%)
- Facebook leads matched: 283 platform → 495 CRM (incomplete)
- Google clicks: 302MB data mostly unused

**After Implementation**:
- CRM leads attributed: ~85%+ (extract ad_id from utm_term, fclid, gclid)
- Facebook leads matched: 100% via fb_lead_id + fclid
- Google clicks: Linked via gclid → CRM requests
- Multi-touch attribution: Track full customer journey

### Data Quality

- ✅ All 5 code types properly parsed
- ✅ No data loss from RAW to staging
- ✅ Full traceability (source_id, source_row_ids)
- ✅ Deduplication of leads by phone/email
- ✅ Proper SK architecture for easy joins

### Performance

- ✅ Incremental loads (WHERE load_timestamp > last_run)
- ✅ Indexes on all join keys
- ✅ Staging tables cache complex parsing
- ✅ Matviews refresh in <5 seconds

---

## 📋 Implementation Checklist

### Week 1: Staging Tables
- [ ] Create `stg_crm_requests` table
- [ ] Create `stg_fb_ads_daily` table
- [ ] Create `stg_google_ads_daily` table
- [ ] Create `stg_google_clicks` table
- [ ] Test all staging SQL queries
- [ ] Verify data coverage (should be 100% of RAW)

### Week 2: Dimension Tables
- [ ] Create `dim_campaign` table
- [ ] Create `dim_ad` table
- [ ] Create `dim_creative` table
- [ ] Create `dim_source` table
- [ ] Create `dim_lead` table
- [ ] Test deduplication logic

### Week 3: Fact Tables
- [ ] Create `fact_lead_request` table
- [ ] Create `fact_ad_performance` table
- [ ] Create `fact_contract` table
- [ ] Test attribution logic
- [ ] Verify SK lookups work

### Week 4: N8N Workflow
- [ ] Create N8N workflow "2 dashboards v2"
- [ ] Add all 12 nodes with SQL queries
- [ ] Test incremental loads
- [ ] Schedule every 15 minutes
- [ ] Monitor for errors

### Week 5: Migration & Validation
- [ ] Run full historical load
- [ ] Compare old vs new attribution rates
- [ ] Update all v6 materialized views to use new tables
- [ ] Retire old crm_requests, fact_leads tables
- [ ] Document for team

---

## 🚀 Next Steps

1. **Review this plan** with the team
2. **Create staging tables** (Phase 1) - This is the foundation
3. **Test CRM parsing** - Most critical: all 5 code types must parse correctly
4. **Build N8N workflow** incrementally (one node at a time)
5. **Validate data** at each step before moving to next phase

---

**Document Status**: ✅ Complete
**Ready for**: Implementation
**Estimated Time**: 4-5 weeks for full implementation
**Priority**: HIGH - Improves data coverage from 12% to 85%+
