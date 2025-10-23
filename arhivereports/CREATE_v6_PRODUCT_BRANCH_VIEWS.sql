-- ============================================================================
-- СТВОРЕННЯ ДОДАТКОВИХ АНАЛІТИЧНИХ VIEW з продуктами, містами, менеджерами
-- ============================================================================
-- Виконати: ОДИН РАЗ через psql
-- Час виконання: 30-60 секунд
-- Створює: 3 materialized views + indexes
-- ============================================================================

\echo '=== 1/3: Створення v6_contracts_enriched (з продуктами та містами) ==='

CREATE MATERIALIZED VIEW dashboards.v6_contracts_enriched AS
SELECT
  fl.id_source,
  fl.sk_lead,
  fl.created_date_txt::date as contract_date,
  fl.contract_amount,

  -- Platform attribution
  fl.dominant_platform,
  fl.utm_source,
  fl.utm_medium,
  fl.utm_campaign,
  fl.is_paid,

  -- Meta attribution
  fl.meta_campaign_id,
  fl.meta_campaign_name,
  fl.meta_adset_name,
  fl.meta_ad_name,
  fl.meta_creative_id,
  fc.title as meta_creative_title,
  fc.body as meta_creative_body,

  -- Google attribution
  fl.google_campaign_id,
  fl.google_campaign_name,
  fl.google_ad_group_name,
  fl.google_keyword_text,

  -- CRM Orders data (продукт + місто)
  co.id as order_id,
  co.product as product_name,
  co.id_product,
  co.id_course,
  co.total_cost as order_total_cost,
  co.date as order_date,

  -- Міста/філії з довідника
  db.id_city,
  db.name as branch_name,
  db.country,
  db.alias as branch_alias,
  db.timezone,

  -- Агрегація кількох замовлень для одного ліда
  COUNT(co.id) OVER (PARTITION BY fl.id_source) as orders_count,
  SUM(co.total_cost) OVER (PARTITION BY fl.id_source) as total_orders_value,

  -- Lead metadata
  fl.form_name,
  fl.request_type,

  -- Timestamps
  fl.row_created_at as lead_created_at,
  co.date as order_created_at

FROM dashboards.fact_leads fl
LEFT JOIN raw.crm_orders co
  ON co.id_source::text = fl.id_source
  AND co.total_cost > 0  -- Тільки замовлення з вартістю
LEFT JOIN raw.fb_ad_creative_details fc
  ON fc.ad_creative_id = fl.meta_creative_id
LEFT JOIN raw.dim_branch_src db
  ON db.id_city = co.id_city

WHERE fl.contract_amount > 0;

CREATE INDEX idx_v6_contracts_enriched_id ON dashboards.v6_contracts_enriched(id_source);
CREATE INDEX idx_v6_contracts_enriched_date ON dashboards.v6_contracts_enriched(contract_date);
CREATE INDEX idx_v6_contracts_enriched_product ON dashboards.v6_contracts_enriched(product_name);
CREATE INDEX idx_v6_contracts_enriched_city ON dashboards.v6_contracts_enriched(id_city);
CREATE INDEX idx_v6_contracts_enriched_platform ON dashboards.v6_contracts_enriched(dominant_platform);

\echo '✅ v6_contracts_enriched створено'
\echo ''

-- ============================================================================

\echo '=== 2/3: Створення v6_product_performance (по продуктах) ==='

CREATE MATERIALIZED VIEW dashboards.v6_product_performance AS

WITH product_contracts AS (
  SELECT
    co.product,
    co.id_product,
    COUNT(DISTINCT fl.id_source) as total_leads,
    COUNT(DISTINCT co.id) as total_contracts,
    SUM(co.total_cost) as total_revenue,

    -- По платформах
    COUNT(DISTINCT CASE WHEN fl.dominant_platform = 'meta' THEN fl.id_source END) as meta_leads,
    COUNT(DISTINCT CASE WHEN fl.dominant_platform = 'google' THEN fl.id_source END) as google_leads,
    COUNT(DISTINCT CASE WHEN fl.dominant_platform = 'direct' THEN fl.id_source END) as direct_leads,

    -- Креатив attribution для Meta
    COUNT(DISTINCT CASE WHEN fl.meta_creative_id IS NOT NULL THEN fl.id_source END) as leads_with_creative,

    -- Дати
    MIN(co.date::date) as first_contract_date,
    MAX(co.date::date) as last_contract_date

  FROM raw.crm_orders co
  LEFT JOIN dashboards.fact_leads fl
    ON fl.id_source = co.id_source::text
  WHERE co.product IS NOT NULL
    AND co.total_cost > 0
  GROUP BY co.product, co.id_product
)

SELECT
  product as product_name,
  id_product,
  total_leads,
  total_contracts,
  total_revenue,

  -- Conversion rates
  ROUND(100.0 * total_contracts / NULLIF(total_leads, 0), 2) as lead_to_contract_rate,

  -- Average metrics
  ROUND(total_revenue / NULLIF(total_contracts, 0), 2) as avg_contract_value,

  -- Platform breakdown
  meta_leads,
  google_leads,
  direct_leads,
  ROUND(100.0 * meta_leads / NULLIF(total_leads, 0), 2) as meta_leads_pct,
  ROUND(100.0 * google_leads / NULLIF(total_leads, 0), 2) as google_leads_pct,

  -- Attribution
  leads_with_creative,
  ROUND(100.0 * leads_with_creative / NULLIF(total_leads, 0), 2) as creative_attribution_pct,

  -- Dates
  first_contract_date,
  last_contract_date,
  last_contract_date - first_contract_date + 1 as days_selling,

  -- Category detection (по ключовим словам)
  CASE
    WHEN product ILIKE '%Мала Комп''ютерна Академія%' OR product ILIKE '%МКА%' THEN 'Діти (МКА)'
    WHEN product ILIKE '%IT Start%' OR product ILIKE '%First Step%' THEN 'Діти (IT Start)'
    WHEN product ILIKE '%Digital kids%' OR product ILIKE '%діти%' OR product ILIKE '%табір%' THEN 'Діти (Інше)'
    WHEN product ILIKE '%Розробка програмного%' OR product ILIKE '%Software Development%' THEN 'Дорослі (Розробка)'
    WHEN product ILIKE '%дизайн%' OR product ILIKE '%Design%' THEN 'Дорослі (Дизайн)'
    WHEN product ILIKE '%Marketing%' OR product ILIKE '%маркетинг%' THEN 'Дорослі (Маркетинг)'
    WHEN product ILIKE '%QA%' OR product ILIKE '%тестув%' THEN 'Дорослі (QA)'
    WHEN product ILIKE '%Motion%' OR product ILIKE '%3D%' OR product ILIKE '%графік%' THEN 'Дорослі (Графіка)'
    ELSE 'Інше'
  END as product_category

FROM product_contracts
WHERE total_contracts > 0
ORDER BY total_revenue DESC NULLS LAST;

CREATE UNIQUE INDEX idx_v6_product_perf_pk ON dashboards.v6_product_performance(id_product);
CREATE INDEX idx_v6_product_perf_category ON dashboards.v6_product_performance(product_category);
CREATE INDEX idx_v6_product_perf_revenue ON dashboards.v6_product_performance(total_revenue DESC NULLS LAST);

\echo '✅ v6_product_performance створено'
\echo ''

-- ============================================================================

\echo '=== 3/3: Створення v6_branch_performance (по філіях/містах) ==='

CREATE MATERIALIZED VIEW dashboards.v6_branch_performance AS

WITH branch_contracts AS (
  SELECT
    db.id_city,
    db.name as branch_name,
    db.country,
    db.alias as branch_alias,

    COUNT(DISTINCT co.id) as total_contracts,
    COUNT(DISTINCT fl.id_source) as total_leads,
    SUM(co.total_cost) as total_revenue,

    -- По платформах
    COUNT(DISTINCT CASE WHEN fl.dominant_platform = 'meta' THEN fl.id_source END) as meta_leads,
    COUNT(DISTINCT CASE WHEN fl.dominant_platform = 'google' THEN fl.id_source END) as google_leads,

    -- Унікальні продукти
    COUNT(DISTINCT co.product) as unique_products,

    -- Дати
    MIN(co.date::date) as first_contract_date,
    MAX(co.date::date) as last_contract_date

  FROM raw.crm_orders co
  LEFT JOIN raw.dim_branch_src db
    ON db.id_city = co.id_city
  LEFT JOIN dashboards.fact_leads fl
    ON fl.id_source = co.id_source::text
  WHERE co.total_cost > 0
    AND db.id_city IS NOT NULL
  GROUP BY db.id_city, db.name, db.country, db.alias
)

SELECT
  id_city,
  branch_name,
  country,
  branch_alias,

  total_contracts,
  total_leads,
  total_revenue,

  -- Conversion
  ROUND(100.0 * total_contracts / NULLIF(total_leads, 0), 2) as lead_to_contract_rate,

  -- Average metrics
  ROUND(total_revenue / NULLIF(total_contracts, 0), 2) as avg_contract_value,

  -- Platform breakdown
  meta_leads,
  google_leads,
  ROUND(100.0 * meta_leads / NULLIF(total_leads, 0), 2) as meta_leads_pct,
  ROUND(100.0 * google_leads / NULLIF(total_leads, 0), 2) as google_leads_pct,

  -- Product diversity
  unique_products,

  -- Dates
  first_contract_date,
  last_contract_date

FROM branch_contracts
WHERE total_contracts > 0
ORDER BY total_revenue DESC NULLS LAST;

CREATE UNIQUE INDEX idx_v6_branch_perf_pk ON dashboards.v6_branch_performance(id_city);
CREATE INDEX idx_v6_branch_perf_revenue ON dashboards.v6_branch_performance(total_revenue DESC NULLS LAST);
CREATE INDEX idx_v6_branch_perf_branch ON dashboards.v6_branch_performance(branch_name);

\echo '✅ v6_branch_performance створено'
\echo ''

-- ============================================================================

\echo '=== ПЕРШИЙ REFRESH ==='

REFRESH MATERIALIZED VIEW dashboards.v6_contracts_enriched;
REFRESH MATERIALIZED VIEW dashboards.v6_product_performance;
REFRESH MATERIALIZED VIEW dashboards.v6_branch_performance;

\echo ''
\echo '=== ПЕРЕВІРКА РЕЗУЛЬТАТІВ ==='

SELECT 'v6_contracts_enriched' as view_name,
  COUNT(*) as rows,
  COUNT(DISTINCT id_source) as unique_leads,
  COUNT(DISTINCT product_name) as unique_products,
  COUNT(DISTINCT id_city) as unique_cities,
  ROUND(SUM(contract_amount), 2) as total_revenue
FROM dashboards.v6_contracts_enriched

UNION ALL

SELECT 'v6_product_performance',
  COUNT(*),
  NULL,
  COUNT(*),
  NULL,
  ROUND(SUM(total_revenue), 2)
FROM dashboards.v6_product_performance

UNION ALL

SELECT 'v6_branch_performance',
  COUNT(*),
  NULL,
  NULL,
  COUNT(*),
  ROUND(SUM(total_revenue), 2)
FROM dashboards.v6_branch_performance;

\echo ''
\echo '=== ТОП-5 ПРОДУКТІВ ПО REVENUE ==='

SELECT
  product_name,
  product_category,
  total_contracts,
  total_revenue,
  avg_contract_value,
  meta_leads,
  google_leads
FROM dashboards.v6_product_performance
ORDER BY total_revenue DESC NULLS LAST
LIMIT 5;

\echo ''
\echo '=== ТОП-5 ФІЛІЙ ПО REVENUE ==='

SELECT
  branch_name,
  country,
  total_contracts,
  total_revenue,
  avg_contract_value,
  unique_products
FROM dashboards.v6_branch_performance
ORDER BY total_revenue DESC NULLS LAST
LIMIT 5;

\echo ''
\echo '========================================='
\echo '✅ ВСІ 3 ДОДАТКОВІ VIEWS СТВОРЕНО'
\echo '========================================='
