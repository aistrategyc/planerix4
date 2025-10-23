-- ============================================================================
-- СОЗДАНИЕ ДЕТАЛЬНОГО VIEW ДЛЯ КОНТРАКТОВ С ПОЛНОЙ АТРИБУЦИЕЙ
-- ============================================================================
-- Цель: Показать ВСЕ контракты с детальной информацией:
-- - Какая именно реклама привела к контракту (кампания → adset → ad → креатив)
-- - Продукт, филиал, город
-- - Менеджеры по городу
-- - Сумма контракта, дата
-- ============================================================================

\echo '=== Создание v6_contracts_with_attribution_detail ==='

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboards.v6_contracts_with_attribution_detail AS
WITH contracts_base AS (
    SELECT
        -- Lead ID
        fl.id_source,
        fl.sk_lead,

        -- Contract info
        fl.created_date_txt::date as contract_date,
        fl.contract_amount,

        -- Platform
        fl.dominant_platform,
        fl.utm_source,
        fl.utm_medium,
        fl.utm_campaign,
        fl.utm_content,
        fl.utm_term,

        -- Meta attribution (full chain)
        fl.meta_campaign_id,
        fl.meta_campaign_name,
        fl.meta_adset_name,
        fl.meta_ad_name,
        fl.meta_creative_id,

        -- Google attribution
        fl.google_campaign_id,
        fl.google_campaign_name,
        fl.google_ad_group_name,
        fl.google_keyword_text,

        -- Click IDs
        fl.fbclid,
        fl.gclid,

        -- Lead metadata
        fl.form_name,
        fl.request_type,
        fl.is_paid,
        fl.row_created_at as lead_created_at

    FROM dashboards.fact_leads fl
    WHERE fl.contract_amount > 0  -- Только контракты
)

SELECT
    ROW_NUMBER() OVER (ORDER BY cb.contract_date DESC, cb.id_source, co.id) as row_num,

    -- Lead & Contract IDs
    cb.id_source,
    cb.sk_lead,
    co.id as order_id,
    cb.contract_date,
    cb.contract_amount,

    -- Platform classification
    cb.dominant_platform,
    cb.is_paid,

    -- UTM parameters
    cb.utm_source,
    cb.utm_medium,
    cb.utm_campaign,
    cb.utm_content,
    cb.utm_term,

    -- === META ATTRIBUTION CHAIN ===
    cb.meta_campaign_id,
    cb.meta_campaign_name,
    cb.meta_adset_name,
    cb.meta_ad_name,
    cb.meta_creative_id,

    -- Meta Creative Details
    fc.title as meta_creative_title,
    fc.body as meta_creative_body,
    fc.link_url as meta_creative_link,
    fc.media_image_src as meta_creative_image,
    fc.cta_type as meta_cta_type,
    fc.cta_link as meta_cta_link,

    -- === GOOGLE ATTRIBUTION ===
    cb.google_campaign_id,
    cb.google_campaign_name,
    cb.google_ad_group_name,
    cb.google_keyword_text,

    -- Click IDs for tracking
    cb.fbclid,
    cb.gclid,

    -- === PRODUCT INFORMATION ===
    co.product as product_name,
    co.id_product,
    co.id_course,
    co.total_cost as order_total_cost,
    co.date as order_date,

    -- === BRANCH / CITY INFORMATION ===
    db.id_city,
    db.name as branch_name,
    db.country,
    db.alias as branch_alias,
    db.timezone,

    -- === MANAGERS BY CITY ===
    (
        SELECT
            STRING_AGG(DISTINCT u.name_user, ', ' ORDER BY u.name_user)
        FROM raw.itcrm_users_ua u
        WHERE u.id_city = db.id_city
          AND u.arc_user = false
          AND u.name_user IS NOT NULL
        LIMIT 10
    ) as managers_in_city,

    (
        SELECT COUNT(DISTINCT u.id_user)
        FROM raw.itcrm_users_ua u
        WHERE u.id_city = db.id_city
          AND u.arc_user = false
    ) as managers_count_in_city,

    -- === LEAD FORM INFO ===
    cb.form_name,
    cb.request_type,
    cb.lead_created_at,

    -- === AGGREGATIONS ===
    COUNT(co.id) OVER (PARTITION BY cb.id_source) as orders_count_per_lead,
    SUM(co.total_cost) OVER (PARTITION BY cb.id_source) as total_orders_value_per_lead,

    -- === ATTRIBUTION FLAGS ===
    CASE WHEN cb.meta_creative_id IS NOT NULL THEN true ELSE false END as has_meta_creative,
    CASE WHEN cb.google_keyword_text IS NOT NULL THEN true ELSE false END as has_google_keyword,
    CASE
        WHEN cb.meta_campaign_id IS NOT NULL
          OR cb.google_campaign_id IS NOT NULL THEN 'full_attribution'
        WHEN cb.utm_source IS NOT NULL THEN 'utm_only'
        WHEN cb.fbclid IS NOT NULL OR cb.gclid IS NOT NULL THEN 'click_id_only'
        ELSE 'no_attribution'
    END as attribution_level

FROM contracts_base cb
LEFT JOIN raw.crm_orders co
    ON co.id_source::text = cb.id_source
    AND co.total_cost > 0
LEFT JOIN raw.fb_ad_creative_details fc
    ON fc.ad_creative_id = cb.meta_creative_id
LEFT JOIN raw.dim_branch_src db
    ON db.id_city = co.id_city;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_v6_contracts_detail_pk
    ON dashboards.v6_contracts_with_attribution_detail(row_num);

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_date
    ON dashboards.v6_contracts_with_attribution_detail(contract_date);

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_platform
    ON dashboards.v6_contracts_with_attribution_detail(dominant_platform);

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_product
    ON dashboards.v6_contracts_with_attribution_detail(product_name);

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_branch
    ON dashboards.v6_contracts_with_attribution_detail(branch_name);

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_meta_campaign
    ON dashboards.v6_contracts_with_attribution_detail(meta_campaign_id)
    WHERE meta_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_meta_creative
    ON dashboards.v6_contracts_with_attribution_detail(meta_creative_id)
    WHERE meta_creative_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v6_contracts_detail_attribution
    ON dashboards.v6_contracts_with_attribution_detail(attribution_level);

\echo '✅ v6_contracts_with_attribution_detail создан'
\echo ''

-- ============================================================================

\echo '=== Первый REFRESH ===';

REFRESH MATERIALIZED VIEW dashboards.v6_contracts_with_attribution_detail;

\echo ''
\echo '=== ПРОВЕРКА РЕЗУЛЬТАТОВ ===';

-- Общая статистика
SELECT
    'Total contracts' as metric,
    COUNT(*) as value
FROM dashboards.v6_contracts_with_attribution_detail

UNION ALL

SELECT
    'With full attribution (campaign+creative)',
    COUNT(*)
FROM dashboards.v6_contracts_with_attribution_detail
WHERE attribution_level = 'full_attribution'

UNION ALL

SELECT
    'With Meta creative',
    COUNT(*)
FROM dashboards.v6_contracts_with_attribution_detail
WHERE has_meta_creative = true

UNION ALL

SELECT
    'With Google keyword',
    COUNT(*)
FROM dashboards.v6_contracts_with_attribution_detail
WHERE has_google_keyword = true

UNION ALL

SELECT
    'With product info',
    COUNT(*)
FROM dashboards.v6_contracts_with_attribution_detail
WHERE product_name IS NOT NULL

UNION ALL

SELECT
    'With branch info',
    COUNT(*)
FROM dashboards.v6_contracts_with_attribution_detail
WHERE branch_name IS NOT NULL;

\echo ''
\echo '=== ТОП-5 КОНТРАКТОВ С ПОЛНОЙ АТРИБУЦИЕЙ ===';

SELECT
    contract_date,
    contract_amount,
    dominant_platform,
    meta_campaign_name,
    meta_ad_name,
    meta_creative_title,
    product_name,
    branch_name
FROM dashboards.v6_contracts_with_attribution_detail
WHERE attribution_level = 'full_attribution'
ORDER BY contract_amount DESC
LIMIT 5;

\echo ''
\echo '=========================================';
\echo '✅ ДЕТАЛЬНЫЙ VIEW ДЛЯ КОНТРАКТОВ СОЗДАН';
\echo '=========================================';
