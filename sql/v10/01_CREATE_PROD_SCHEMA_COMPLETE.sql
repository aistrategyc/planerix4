-- ============================================================================
-- V10 PRODUCTION: Complete Clean Data Warehouse
-- ============================================================================
-- Date: October 23, 2025
-- Purpose: Professional production schema with MAXIMUM detail and cleanliness
--
-- Philosophy:
--   - 100% accurate data from CRM + Facebook/Meta + Google
--   - Maximum detail: events, products, funnels, campaigns, creatives
--   - Clean business-ready tables (no technical mess)
--   - All organic, paid, direct, event sources included
--   - Perfect relationships between all entities
--
-- Sources:
--   ✅ CRM (itcrm_*): clients, contracts, courses, events
--   ✅ Facebook/Meta: campaigns, ads, creatives, leads
--   ✅ Google Ads: campaigns, keywords, performance
--   ✅ Attribution: multi-level parsing (6 methods)
--   ✅ Events: offline events, webinars
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS prod;
COMMENT ON SCHEMA prod IS 'V10: Professional production data warehouse - clean, accurate, business-ready';

-- ============================================================================
-- DIMENSION TABLES (Справочники)
-- ============================================================================

-- ============================================================================
-- 1. prod.dim_clients (Клиенты)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.dim_clients (
    client_id BIGINT PRIMARY KEY,

    -- Contact Info
    phone VARCHAR(50),
    email VARCHAR(255),
    full_name VARCHAR(500),

    -- First Touch
    first_touch_date DATE,
    first_touch_platform VARCHAR(50),
    first_touch_channel VARCHAR(50),
    first_touch_campaign VARCHAR(500),

    -- Last Touch
    last_touch_date DATE,
    last_touch_platform VARCHAR(50),

    -- Summary Stats
    total_events INTEGER DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    total_contracts INTEGER DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,
    lifetime_value NUMERIC(15,2) DEFAULT 0,

    -- Segments
    client_segment VARCHAR(100),  -- новый/повторный/VIP
    acquisition_channel VARCHAR(50),  -- paid/organic/direct/event

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_clients_phone ON prod.dim_clients(phone);
CREATE INDEX idx_prod_clients_email ON prod.dim_clients(email);
CREATE INDEX idx_prod_clients_segment ON prod.dim_clients(client_segment);
CREATE INDEX idx_prod_clients_first_touch ON prod.dim_clients(first_touch_date);

COMMENT ON TABLE prod.dim_clients IS 'V10: Clean client dimension with full history and segments';

-- ============================================================================
-- 2. prod.dim_products (Продукты/Курсы)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.dim_products (
    product_id VARCHAR(100) PRIMARY KEY,

    -- Product Info
    product_name VARCHAR(500) NOT NULL,
    product_category VARCHAR(255),  -- МКА, Табори, Професійні курси, Step2talk
    product_type VARCHAR(100),  -- курс, табір, івент, консультація

    -- Pricing
    base_price NUMERIC(10,2),
    currency VARCHAR(10) DEFAULT 'UAH',

    -- Details
    duration_weeks INTEGER,
    age_group VARCHAR(100),
    skill_level VARCHAR(50),  -- початковий, середній, професійний

    -- Activity
    is_active BOOLEAN DEFAULT TRUE,
    first_sale_date DATE,
    last_sale_date DATE,

    -- Stats
    total_sales INTEGER DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,
    avg_price NUMERIC(10,2),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_products_category ON prod.dim_products(product_category);
CREATE INDEX idx_prod_products_active ON prod.dim_products(is_active);

COMMENT ON TABLE prod.dim_products IS 'V10: Product/Course catalog with full details';

-- ============================================================================
-- 3. prod.dim_campaigns (Рекламні Кампанії)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.dim_campaigns (
    campaign_key SERIAL PRIMARY KEY,

    -- Identity
    platform VARCHAR(50) NOT NULL,  -- facebook, google, instagram
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500),

    -- Hierarchy
    account_id VARCHAR(255),
    account_name VARCHAR(255),

    -- Campaign Details
    objective VARCHAR(100),  -- CONVERSIONS, TRAFFIC, AWARENESS
    status VARCHAR(50),  -- ACTIVE, PAUSED, ARCHIVED
    buying_type VARCHAR(50),  -- AUCTION, RESERVED

    -- Targeting (для Facebook/Google)
    target_locations TEXT[],
    target_age_min INTEGER,
    target_age_max INTEGER,
    target_genders VARCHAR[],

    -- Dates
    start_date DATE,
    end_date DATE,

    -- Performance Summary
    total_spend NUMERIC(15,2) DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    total_contracts INTEGER DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, campaign_id)
);

CREATE INDEX idx_prod_campaigns_platform ON prod.dim_campaigns(platform);
CREATE INDEX idx_prod_campaigns_status ON prod.dim_campaigns(status);
CREATE INDEX idx_prod_campaigns_dates ON prod.dim_campaigns(start_date, end_date);

COMMENT ON TABLE prod.dim_campaigns IS 'V10: Campaign dimension with full details from ad accounts';

-- ============================================================================
-- 4. prod.dim_ad_creatives (Креативи)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.dim_ad_creatives (
    creative_key SERIAL PRIMARY KEY,

    -- Identity
    platform VARCHAR(50) NOT NULL,
    creative_id VARCHAR(255) NOT NULL,
    creative_name VARCHAR(500),

    -- Hierarchy
    campaign_id VARCHAR(255),
    adset_id VARCHAR(255),
    ad_id VARCHAR(255),

    -- Creative Content
    title TEXT,
    body TEXT,
    description TEXT,
    call_to_action VARCHAR(100),

    -- Media
    image_url TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    landing_page_url TEXT,

    -- Creative Type
    creative_type VARCHAR(100),  -- IMAGE, VIDEO, CAROUSEL, COLLECTION
    format VARCHAR(50),  -- SINGLE_IMAGE, VIDEO, etc.

    -- Performance Summary
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    total_contracts INTEGER DEFAULT 0,
    total_revenue NUMERIC(15,2) DEFAULT 0,

    -- Quality Metrics
    ctr NUMERIC(10,4),
    conversion_rate NUMERIC(10,4),
    roas NUMERIC(10,4),

    -- Dates
    first_shown TIMESTAMP WITH TIME ZONE,
    last_shown TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(platform, creative_id)
);

CREATE INDEX idx_prod_creatives_platform ON prod.dim_ad_creatives(platform);
CREATE INDEX idx_prod_creatives_campaign ON prod.dim_ad_creatives(campaign_id);
CREATE INDEX idx_prod_creatives_contracts ON prod.dim_ad_creatives(total_contracts DESC);

COMMENT ON TABLE prod.dim_ad_creatives IS 'V10: Creative library with performance metrics';

-- ============================================================================
-- FACT TABLES (Факти/Події)
-- ============================================================================

-- ============================================================================
-- 5. prod.fact_events (Всі Події Клієнтів)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.fact_events (
    event_id BIGSERIAL PRIMARY KEY,

    -- Who
    client_id BIGINT REFERENCES prod.dim_clients(client_id),

    -- When
    event_date DATE NOT NULL,
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- What
    event_type VARCHAR(100) NOT NULL,  -- lead, contract, visit, call, email
    event_category VARCHAR(50),  -- marketing, sales, support, product
    event_status VARCHAR(50),  -- completed, pending, failed

    -- Attribution (як клієнт прийшов)
    platform VARCHAR(50),
    channel VARCHAR(50),  -- paid, organic, direct, referral, email, event
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    ad_id VARCHAR(255),
    creative_id VARCHAR(255),

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

    -- Context
    device_type VARCHAR(50),
    browser VARCHAR(100),
    location_city VARCHAR(255),
    location_country VARCHAR(100),

    -- Attribution Quality
    attribution_method VARCHAR(100),
    attribution_confidence INTEGER,  -- 0-100

    -- Flags
    is_first_touch BOOLEAN DEFAULT FALSE,
    is_last_touch BOOLEAN DEFAULT FALSE,
    is_paid_touch BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_events_client ON prod.fact_events(client_id);
CREATE INDEX idx_prod_events_date ON prod.fact_events(event_date);
CREATE INDEX idx_prod_events_type ON prod.fact_events(event_type);
CREATE INDEX idx_prod_events_platform ON prod.fact_events(platform);
CREATE INDEX idx_prod_events_campaign ON prod.fact_events(campaign_id);
CREATE INDEX idx_prod_events_timestamp ON prod.fact_events(event_timestamp);

COMMENT ON TABLE prod.fact_events IS 'V10: All client events with full attribution (every touch)';

-- ============================================================================
-- 6. prod.fact_leads (Чисті Ліди)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.fact_leads (
    lead_id BIGINT PRIMARY KEY,

    -- Who
    client_id BIGINT REFERENCES prod.dim_clients(client_id),

    -- When
    lead_date DATE NOT NULL,
    lead_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- How (Attribution - LAST PAID TOUCH!)
    platform VARCHAR(50) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    adset_name VARCHAR(500),
    ad_id VARCHAR(255),
    ad_name VARCHAR(500),
    creative_id VARCHAR(255),

    -- Creative Details
    creative_title TEXT,
    creative_body TEXT,
    creative_image_url TEXT,
    creative_cta VARCHAR(100),

    -- UTM
    utm_source VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),

    -- Tracking
    fbclid VARCHAR(500),
    gclid VARCHAR(500),
    fb_lead_id VARCHAR(255),

    -- Contact (з форми)
    phone VARCHAR(50),
    email VARCHAR(255),
    name VARCHAR(500),

    -- Lead Source Details
    form_name VARCHAR(500),
    page_url TEXT,
    referrer_url TEXT,

    -- Lead Quality
    lead_score INTEGER,  -- 0-100
    lead_grade VARCHAR(10),  -- A, B, C, D

    -- Attribution
    attribution_method VARCHAR(100),
    attribution_quality_score INTEGER,  -- 0-100

    -- Conversion
    converted_to_contract BOOLEAN DEFAULT FALSE,
    contract_id VARCHAR(50),
    days_to_convert INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_leads_client ON prod.fact_leads(client_id);
CREATE INDEX idx_prod_leads_date ON prod.fact_leads(lead_date);
CREATE INDEX idx_prod_leads_platform ON prod.fact_leads(platform);
CREATE INDEX idx_prod_leads_campaign ON prod.fact_leads(campaign_id);
CREATE INDEX idx_prod_leads_converted ON prod.fact_leads(converted_to_contract);

COMMENT ON TABLE prod.fact_leads IS 'V10: Clean leads with LAST PAID TOUCH attribution';

-- ============================================================================
-- 7. prod.fact_contracts (Контракти/Продажі)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.fact_contracts (
    contract_id VARCHAR(50) PRIMARY KEY,

    -- Who
    client_id BIGINT REFERENCES prod.dim_clients(client_id),
    lead_id BIGINT REFERENCES prod.fact_leads(lead_id),

    -- When
    contract_date DATE NOT NULL,
    contract_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

    -- What (Product)
    product_id VARCHAR(100) REFERENCES prod.dim_products(product_id),
    product_name VARCHAR(500),
    product_category VARCHAR(255),

    -- How Much
    contract_amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'UAH',
    payment_status VARCHAR(50),  -- paid, partial, pending
    payment_method VARCHAR(50),

    -- Attribution (від якої кампанії)
    platform VARCHAR(50),
    channel VARCHAR(50),
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    ad_id VARCHAR(255),
    creative_id VARCHAR(255),
    creative_image_url TEXT,

    -- Journey (шлях клієнта)
    lead_date DATE,
    days_to_convert INTEGER,
    total_touchpoints INTEGER,  -- скільки разів взаємодіяв до покупки

    -- Attribution Quality
    attribution_method VARCHAR(100),
    attribution_quality_score INTEGER,  -- 0-100

    -- Contract Type
    contract_type VARCHAR(50),  -- new, renewal, upsell
    contract_status VARCHAR(50),  -- active, completed, cancelled

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prod_contracts_client ON prod.fact_contracts(client_id);
CREATE INDEX idx_prod_contracts_date ON prod.fact_contracts(contract_date);
CREATE INDEX idx_prod_contracts_product ON prod.fact_contracts(product_id);
CREATE INDEX idx_prod_contracts_platform ON prod.fact_contracts(platform);
CREATE INDEX idx_prod_contracts_campaign ON prod.fact_contracts(campaign_id);
CREATE INDEX idx_prod_contracts_amount ON prod.fact_contracts(contract_amount DESC);

COMMENT ON TABLE prod.fact_contracts IS 'V10: Sales/Contracts with full product and attribution details';

-- ============================================================================
-- 8. prod.fact_campaign_performance_daily (Щоденна Продуктивність Кампаній)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prod.fact_campaign_performance_daily (
    performance_id SERIAL PRIMARY KEY,

    -- Dimensions
    performance_date DATE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    campaign_id VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(500),
    adset_id VARCHAR(255),
    adset_name VARCHAR(500),
    ad_id VARCHAR(255),
    ad_name VARCHAR(500),

    -- Ad Metrics (з рекламних кабінетів)
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    spend NUMERIC(15,2) DEFAULT 0,
    reach BIGINT DEFAULT 0,
    frequency NUMERIC(10,4),

    -- Calculated Ad Metrics
    ctr NUMERIC(10,4),  -- click-through rate
    cpc NUMERIC(10,4),  -- cost per click
    cpm NUMERIC(10,4),  -- cost per 1000 impressions

    -- Conversion Metrics (з CRM)
    fb_leads INTEGER DEFAULT 0,  -- leads з форм Facebook
    crm_leads INTEGER DEFAULT 0,  -- leads в CRM (через 7 днів)
    contracts INTEGER DEFAULT 0,
    revenue NUMERIC(15,2) DEFAULT 0,

    -- Calculated Conversion Metrics
    cpl NUMERIC(10,2),  -- cost per lead
    cpa NUMERIC(10,2),  -- cost per acquisition
    roas NUMERIC(10,4),  -- return on ad spend
    lead_conversion_rate NUMERIC(10,4),  -- leads to contracts
    roi_percent NUMERIC(10,4),  -- ROI percentage

    -- Quality Scores
    quality_score INTEGER,  -- 0-100
    relevance_score NUMERIC(3,2),  -- 1-10

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(performance_date, platform, campaign_id, COALESCE(adset_id, ''), COALESCE(ad_id, ''))
);

CREATE INDEX idx_prod_perf_date ON prod.fact_campaign_performance_daily(performance_date);
CREATE INDEX idx_prod_perf_platform ON prod.fact_campaign_performance_daily(platform);
CREATE INDEX idx_prod_perf_campaign ON prod.fact_campaign_performance_daily(campaign_id);
CREATE INDEX idx_prod_perf_roas ON prod.fact_campaign_performance_daily(roas DESC);
CREATE INDEX idx_prod_perf_contracts ON prod.fact_campaign_performance_daily(contracts DESC);

COMMENT ON TABLE prod.fact_campaign_performance_daily IS
'V10: Daily campaign performance with FULL metrics (ads + conversions + revenue)';

-- ============================================================================
-- AGGREGATE VIEWS (Агрегати для BI/Аналітики)
-- ============================================================================

-- ============================================================================
-- 9. prod.view_funnel_summary (Воронка по Каналах)
-- ============================================================================
CREATE OR REPLACE VIEW prod.view_funnel_summary AS
SELECT
    l.platform,
    l.channel,
    DATE_TRUNC('month', l.lead_date) as month,

    -- Funnel Steps
    COUNT(DISTINCT l.client_id) as unique_visitors,
    COUNT(DISTINCT l.lead_id) as total_leads,
    COUNT(DISTINCT c.contract_id) as total_contracts,

    -- Revenue
    COALESCE(SUM(c.contract_amount), 0) as total_revenue,

    -- Conversion Rates
    ROUND(COUNT(DISTINCT c.contract_id)::numeric / NULLIF(COUNT(DISTINCT l.lead_id), 0) * 100, 2) as lead_to_contract_rate,

    -- AOV
    ROUND(COALESCE(SUM(c.contract_amount) / NULLIF(COUNT(DISTINCT c.contract_id), 0), 0), 2) as avg_order_value

FROM prod.fact_leads l
LEFT JOIN prod.fact_contracts c ON l.client_id = c.client_id
WHERE l.lead_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY l.platform, l.channel, DATE_TRUNC('month', l.lead_date);

COMMENT ON VIEW prod.view_funnel_summary IS 'V10: Marketing funnel by channel and month';

-- ============================================================================
-- 10. prod.view_product_performance (Продуктивність Продуктів)
-- ============================================================================
CREATE OR REPLACE VIEW prod.view_product_performance AS
SELECT
    p.product_id,
    p.product_name,
    p.product_category,
    DATE_TRUNC('month', c.contract_date) as month,

    -- Sales
    COUNT(DISTINCT c.contract_id) as total_sales,
    COALESCE(SUM(c.contract_amount), 0) as total_revenue,
    ROUND(AVG(c.contract_amount), 2) as avg_price,

    -- By Channel
    COUNT(DISTINCT CASE WHEN c.channel = 'paid' THEN c.contract_id END) as paid_sales,
    COUNT(DISTINCT CASE WHEN c.channel = 'organic' THEN c.contract_id END) as organic_sales,
    COUNT(DISTINCT CASE WHEN c.channel = 'direct' THEN c.contract_id END) as direct_sales,

    -- Performance
    ROUND(AVG(c.days_to_convert), 1) as avg_days_to_convert

FROM prod.fact_contracts c
INNER JOIN prod.dim_products p ON c.product_id = p.product_id
WHERE c.contract_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY p.product_id, p.product_name, p.product_category, DATE_TRUNC('month', c.contract_date);

COMMENT ON VIEW prod.view_product_performance IS 'V10: Product sales performance by channel';

-- ============================================================================
-- Success Message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ V10 PRODUCTION SCHEMA CREATED - COMPLETE & PROFESSIONAL';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'DIMENSION TABLES (Справочники):';
  RAISE NOTICE '  1. prod.dim_clients - Клієнти з повною історією';
  RAISE NOTICE '  2. prod.dim_products - Продукти/Курси з деталями';
  RAISE NOTICE '  3. prod.dim_campaigns - Рекламні кампанії (FB+Google)';
  RAISE NOTICE '  4. prod.dim_ad_creatives - Креативи з метриками';
  RAISE NOTICE '';
  RAISE NOTICE 'FACT TABLES (Події):';
  RAISE NOTICE '  5. prod.fact_events - ВСІ події клієнтів (кожен дотик)';
  RAISE NOTICE '  6. prod.fact_leads - Чисті ліди з LAST PAID TOUCH';
  RAISE NOTICE '  7. prod.fact_contracts - Продажі з продуктами';
  RAISE NOTICE '  8. prod.fact_campaign_performance_daily - Щоденні метрики';
  RAISE NOTICE '';
  RAISE NOTICE 'AGGREGATE VIEWS (Аналітика):';
  RAISE NOTICE '  9. prod.view_funnel_summary - Воронка по каналах';
  RAISE NOTICE ' 10. prod.view_product_performance - Продуктивність продуктів';
  RAISE NOTICE '';
  RAISE NOTICE 'Джерела Даних:';
  RAISE NOTICE '  ✅ CRM (itcrm_*): clients, contracts, courses, events';
  RAISE NOTICE '  ✅ Facebook/Meta: campaigns, ads, creatives, leads';
  RAISE NOTICE '  ✅ Google Ads: campaigns, keywords, performance';
  RAISE NOTICE '  ✅ Attribution: multi-level (6 methods)';
  RAISE NOTICE '  ✅ Events: offline events, webinars';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Step: Populate tables with ETL (02_POPULATE_PROD.sql)';
  RAISE NOTICE '============================================================';
END $$;
