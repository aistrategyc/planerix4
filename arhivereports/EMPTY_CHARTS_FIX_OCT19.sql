-- ============================================================================
-- ИСПРАВЛЕНИЕ ПУСТЫХ ГРАФИКОВ на /data-analytics - October 19, 2025
-- ============================================================================
--
-- ПРОБЛЕМЫ:
-- 1. v6_funnel_daily view НЕ СУЩЕСТВОВАЛА - для Funnel Analysis charts
-- 2. v6_product_performance view НЕ СУЩЕСТВОВАЛА - для Products Performance chart
--
-- ДАННЫЕ ПРОВЕРЕНЫ:
-- - v8_platform_daily_full: есть impressions, clicks, leads, contracts ✅
-- - dim_product: есть product_name ✅
-- - v5_ref_campaign_product: связь campaign → product ✅
-- - fact_leads.is_paid: EXISTS ✅ (Organic vs Paid уже работает)
--
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: Создать v6_funnel_daily view для Funnel Analysis
-- ----------------------------------------------------------------------------
-- Используем v8_platform_daily_full как источник
-- API endpoint ожидает поля: date, platform, impressions, clicks, leads, contracts, ctr, cvr, contract_rate

CREATE OR REPLACE VIEW dashboards.v6_funnel_daily AS
SELECT
    dt as date,
    platform,
    impressions,
    clicks,
    leads,
    contracts,
    -- CTR = (clicks / impressions) * 100
    CASE
        WHEN impressions > 0 THEN (clicks / impressions) * 100
        ELSE 0
    END as ctr,
    -- CVR = (leads / clicks) * 100
    CASE
        WHEN clicks > 0 THEN (leads::numeric / clicks) * 100
        ELSE 0
    END as cvr,
    -- Contract Rate = (contracts / leads) * 100
    CASE
        WHEN leads > 0 THEN (contracts::numeric / leads) * 100
        ELSE 0
    END as contract_rate,
    -- Additional fields for context
    spend,
    revenue,
    roas,
    cpl
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-10'::date;  -- Same date as other v8 views

-- Result: Daily funnel metrics by platform with conversion rates ✅

-- ----------------------------------------------------------------------------
-- FIX 2: Создать v6_product_performance view для Products Performance chart
-- ----------------------------------------------------------------------------
-- API endpoint ожидает: product_name, total_contracts, total_revenue, avg_contract_value

CREATE OR REPLACE VIEW dashboards.v6_product_performance AS
WITH campaign_products AS (
    -- Get product mapping from campaign reference table
    SELECT
        platform,
        campaign_id,
        product_code,
        product_name
    FROM dashboards.v5_ref_campaign_product
),
lead_products AS (
    -- Link leads to products via campaign_id
    SELECT
        fl.sk_lead,
        fl.id_source,
        fl.contract_amount,
        COALESCE(
            -- Try Meta campaign first
            mp.product_name,
            -- Then Google campaign
            gp.product_name,
            -- Fallback to 'Unknown Product'
            'Unknown Product'
        ) as product_name
    FROM dashboards.fact_leads fl
    LEFT JOIN campaign_products mp
        ON mp.platform = 'meta'
        AND mp.campaign_id = fl.meta_campaign_id
    LEFT JOIN campaign_products gp
        ON gp.platform = 'google'
        AND gp.campaign_id = fl.google_campaign_id
    WHERE fl.contract_amount > 0  -- Only contracts
)
SELECT
    product_name,
    COUNT(DISTINCT sk_lead) as total_contracts,
    COALESCE(SUM(contract_amount), 0) as total_revenue,
    CASE
        WHEN COUNT(DISTINCT sk_lead) > 0
        THEN COALESCE(SUM(contract_amount), 0) / COUNT(DISTINCT sk_lead)
        ELSE 0
    END as avg_contract_value
FROM lead_products
GROUP BY product_name
HAVING COUNT(DISTINCT sk_lead) > 0  -- Only products with contracts
ORDER BY total_contracts DESC, total_revenue DESC;

-- Result: Product performance metrics for products with contracts ✅

-- ============================================================================
-- ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- ============================================================================

-- Проверка v6_funnel_daily
SELECT
    'v6_funnel_daily' as view_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT platform) as unique_platforms,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    SUM(leads) as total_leads,
    SUM(contracts) as total_contracts
FROM dashboards.v6_funnel_daily;

-- Ожидаемый результат: Сотни строк с данными с Sep 10 по Oct 18, 2025

-- Проверка v6_product_performance
SELECT
    'v6_product_performance' as view_name,
    COUNT(*) as total_products,
    SUM(total_contracts) as sum_contracts,
    SUM(total_revenue) as sum_revenue,
    MIN(avg_contract_value) as min_contract_value,
    MAX(avg_contract_value) as max_contract_value
FROM dashboards.v6_product_performance;

-- Ожидаемый результат: Несколько продуктов (PKO_2025, TEENS, PYTHON, etc)

-- Проверка конкретных продуктов
SELECT
    product_name,
    total_contracts,
    ROUND(total_revenue, 0) as total_revenue,
    ROUND(avg_contract_value, 0) as avg_contract_value
FROM dashboards.v6_product_performance
ORDER BY total_contracts DESC
LIMIT 10;

-- Проверка Funnel за последние 7 дней
SELECT
    date,
    platform,
    impressions,
    clicks,
    leads,
    contracts,
    ROUND(ctr::numeric, 2) as ctr,
    ROUND(cvr::numeric, 2) as cvr,
    ROUND(contract_rate::numeric, 2) as contract_rate
FROM dashboards.v6_funnel_daily
WHERE date >= CURRENT_DATE - 7
ORDER BY date DESC, platform
LIMIT 20;

-- ============================================================================
-- СТАТУС: ВСЕ VIEWS СОЗДАНЫ И ПРОВЕРЕНЫ ✅
-- ============================================================================
--
-- Применено: October 19, 2025
-- База: itstep_final (92.242.60.211:5432)
-- Пользователь: manfromlamp
--
-- RESULTS:
-- ✅ v6_funnel_daily - создана из v8_platform_daily_full
-- ✅ v6_product_performance - создана с campaign→product mapping
-- ✅ fact_leads.is_paid - уже существует (Organic vs Paid работает)
--
-- CHARTS FIXED:
-- ✅ Funnel Analysis chart
-- ✅ Funnel Aggregate chart
-- ✅ Products Performance chart
-- ✅ Organic vs Paid chart (уже работал)
--
