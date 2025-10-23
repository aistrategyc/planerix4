-- ============================================================================
-- V10: PRODUCTION SCHEMA - Clean, Final, Fully Enriched Data
-- ============================================================================
-- Date: October 23, 2025
--
-- ARCHITECTURE:
--   stg schema:  All normalization, parsing, mapping bridges (messy, technical)
--   prod schema: Clean final tables and views ready for BI/API (business-ready)
--
-- PHILOSOPHY:
--   stg = ETL kitchen (preprocessing, cleaning, matching)
--   prod = Restaurant (beautiful, ready to serve)
-- ============================================================================

-- Create prod schema
CREATE SCHEMA IF NOT EXISTS prod;

COMMENT ON SCHEMA prod IS
'V10 Production: Clean, final, fully enriched tables and views ready for business use';

-- ============================================================================
-- PROD TABLE 1: prod.leads (Clean Final Leads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prod.leads (
    -- Identity
    lead_id BIGINT PRIMARY KEY,
    client_id BIGINT NOT NULL,
    lead_date DATE NOT NULL,
    lead_timestamp TIMESTAMP WITH TIME ZONE,

    -- Attribution (FINAL, CLEAN)
    platform VARCHAR(50) NOT NULL,  -- facebook, instagram, google, direct, organic
    channel VARCHAR(50),  -- paid, organic, direct, referral, email

    -- Campaign Details (FULLY POPULATED)
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    adset_name VARCHAR(500),
    ad_id VARCHAR(255),
    ad_name VARCHAR(500),

    -- Creative Details (for Meta/Facebook)
    creative_id VARCHAR(255),
    creative_title TEXT,
    creative_body TEXT,
    creative_image_url TEXT,
    cta_type VARCHAR(100),

    -- UTM Parameters
    utm_source VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),

    -- Tracking IDs
    fbclid VARCHAR(500),
    gclid VARCHAR(500),
    fb_lead_id VARCHAR(255),

    -- Contact Info
    phone VARCHAR(50),
    email VARCHAR(255),
    name VARCHAR(500),

    -- Attribution Quality
    attribution_method VARCHAR(100),  -- marketing_match, fb_leads_match, fbclid, utm_heuristic
    attribution_quality_score INTEGER,  -- 0-100

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_leads_client ON prod.leads(client_id);
CREATE INDEX idx_prod_leads_date ON prod.leads(lead_date);
CREATE INDEX idx_prod_leads_platform ON prod.leads(platform);
CREATE INDEX idx_prod_leads_campaign ON prod.leads(campaign_id);

COMMENT ON TABLE prod.leads IS
'V10: Clean final leads table with FULL attribution and enrichment';

-- ============================================================================
-- PROD TABLE 2: prod.contracts (Clean Final Contracts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prod.contracts (
    -- Identity
    contract_id VARCHAR(50) PRIMARY KEY,
    client_id BIGINT NOT NULL,
    contract_date DATE NOT NULL,
    contract_timestamp TIMESTAMP WITH TIME ZONE,

    -- Financial
    contract_amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'UAH',

    -- Product/Course
    product_name VARCHAR(500),
    product_category VARCHAR(255),
    course_id VARCHAR(255),
    course_name VARCHAR(500),

    -- Attribution (from FIRST paid touch)
    platform VARCHAR(50),
    channel VARCHAR(50),
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    adset_name VARCHAR(500),
    ad_id VARCHAR(255),
    ad_name VARCHAR(500),

    -- Creative Details
    creative_id VARCHAR(255),
    creative_image_url TEXT,

    -- Conversion Journey
    lead_id BIGINT REFERENCES prod.leads(lead_id),
    lead_date DATE,
    days_to_convert INTEGER,
    touchpoints_count INTEGER,

    -- Attribution Quality
    attribution_method VARCHAR(100),
    attribution_quality_score INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_contracts_client ON prod.contracts(client_id);
CREATE INDEX idx_prod_contracts_date ON prod.contracts(contract_date);
CREATE INDEX idx_prod_contracts_platform ON prod.contracts(platform);
CREATE INDEX idx_prod_contracts_campaign ON prod.contracts(campaign_id);
CREATE INDEX idx_prod_contracts_amount ON prod.contracts(contract_amount);

COMMENT ON TABLE prod.contracts IS
'V10: Clean final contracts table with FULL attribution and product details';

-- ============================================================================
-- PROD TABLE 3: prod.campaign_performance (Aggregated Performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prod.campaign_performance (
    -- Composite key
    performance_date DATE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500),

    -- Ad Metrics
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend NUMERIC(15,2) DEFAULT 0,
    ctr NUMERIC(10,4),
    cpc NUMERIC(10,4),
    cpm NUMERIC(10,4),

    -- Conversion Metrics
    leads INTEGER DEFAULT 0,
    contracts INTEGER DEFAULT 0,
    revenue NUMERIC(15,2) DEFAULT 0,

    -- Efficiency Metrics
    cpl NUMERIC(10,2),  -- cost per lead
    cpa NUMERIC(10,2),  -- cost per acquisition
    roas NUMERIC(10,4),  -- return on ad spend
    conversion_rate NUMERIC(10,4),  -- leads to contracts %

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (performance_date, platform, campaign_id)
);

CREATE INDEX idx_prod_perf_date ON prod.campaign_performance(performance_date);
CREATE INDEX idx_prod_perf_platform ON prod.campaign_performance(platform);
CREATE INDEX idx_prod_perf_roas ON prod.campaign_performance(roas DESC);

COMMENT ON TABLE prod.campaign_performance IS
'V10: Daily campaign performance with FULL metrics (ad spend + conversions + revenue)';

-- ============================================================================
-- PROD TABLE 4: prod.ad_creatives (Creative Library)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prod.ad_creatives (
    creative_id VARCHAR(255) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,

    -- Creative Details
    creative_name VARCHAR(500),
    title TEXT,
    body TEXT,
    cta_type VARCHAR(100),

    -- Media
    image_url TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    link_url TEXT,

    -- Associated Campaigns/Ads
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    ad_id VARCHAR(255),

    -- Performance Summary (aggregated)
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    total_contracts INTEGER DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,

    -- Metadata
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_creatives_platform ON prod.ad_creatives(platform);
CREATE INDEX idx_prod_creatives_campaign ON prod.ad_creatives(campaign_id);
CREATE INDEX idx_prod_creatives_contracts ON prod.ad_creatives(total_contracts DESC);

COMMENT ON TABLE prod.ad_creatives IS
'V10: Clean creative library with performance summary';

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ V10 PROD SCHEMA CREATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Clean Tables Created:';
  RAISE NOTICE '  1. prod.leads (attribution + enrichment)';
  RAISE NOTICE '  2. prod.contracts (revenue + journey)';
  RAISE NOTICE '  3. prod.campaign_performance (full metrics)';
  RAISE NOTICE '  4. prod.ad_creatives (creative library)';
  RAISE NOTICE '';
  RAISE NOTICE 'Philosophy:';
  RAISE NOTICE '  stg = ETL kitchen (messy, technical)';
  RAISE NOTICE '  prod = Restaurant (clean, business-ready)';
  RAISE NOTICE '============================================';
END $$;
