-- ============================================================================
-- N8N NODES FOR CONTRACTS SYSTEM
-- ============================================================================

-- ============================================================================
-- NODE 11: Load dim_product
-- Purpose: Extract and load unique products from crm_orders
-- Schedule: Daily
-- ============================================================================

INSERT INTO dashboards.dim_product (product_id, product_name)
SELECT DISTINCT
  id_product as product_id,
  product as product_name
FROM raw.crm_orders
WHERE id_product IS NOT NULL
  AND product IS NOT NULL
  AND product != ''
ON CONFLICT (product_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  updated_at = NOW();

-- ============================================================================
-- NODE 12: Load dim_contract
-- Purpose: Extract and load ALL contracts from crm_orders
-- Schedule: Daily
-- ============================================================================

INSERT INTO dashboards.dim_contract (
  contract_id, id_source, id_product, product,
  name_form, name_sub_form, contract_date,
  customer, mobphone, email,
  payment_status, payment_form, total_cost,
  first_sum, entrance_fee, quantity_of_pairs
)
SELECT
  id as contract_id,
  id_source,
  id_product,
  product,
  name_form,
  name_sub_form,
  date as contract_date,
  customer,
  mobphone,
  email,
  payment_status,
  payment_form,
  total_cost,
  first_sum,
  entrance_fee,
  quantity_of_pairs
FROM raw.crm_orders
WHERE date >= '2025-01-01'::DATE
  AND load_timestamp > COALESCE(
    (SELECT MAX(updated_at) FROM dashboards.dim_contract),
    '1970-01-01'::TIMESTAMP
  )
ON CONFLICT (contract_id) DO UPDATE SET
  id_source = EXCLUDED.id_source,
  product = EXCLUDED.product,
  contract_date = EXCLUDED.contract_date,
  customer = EXCLUDED.customer,
  mobphone = EXCLUDED.mobphone,
  email = EXCLUDED.email,
  payment_status = EXCLUDED.payment_status,
  total_cost = EXCLUDED.total_cost,
  updated_at = NOW();

-- ============================================================================
-- NODE 13: Load fact_contract
-- Purpose: Link contracts to campaigns/ads/creatives with full attribution
-- Dependencies: dim_contract, dim_lead, fact_lead_request, dim_campaign, dim_ad, dim_creative, dim_product
-- Schedule: Daily (after Node 12)
-- ============================================================================

INSERT INTO dashboards.fact_contract (
  sk_contract, sk_lead, sk_campaign, sk_ad, sk_creative, sk_product,
  contract_date, total_cost, payment_status,
  attribution_method, attribution_confidence,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  fb_lead_id, fclid, gclid, ga_client_id,
  google_keyword
)
WITH contract_lead_match AS (
  -- Match contract to lead using id_source
  SELECT
    dc.sk_contract,
    dc.contract_id,
    dc.id_source,
    dc.contract_date,
    dc.total_cost,
    dc.payment_status,
    dc.id_product,
    dl.sk_lead
  FROM dashboards.dim_contract dc
  LEFT JOIN raw.itcrm_analytics ia ON ia.id = dc.id_source
  LEFT JOIN dashboards.dim_lead dl ON (
    (dl.phone = ia.phone OR dl.phone = dc.mobphone)
    AND (dl.email = ia.email OR dl.email = dc.email)
  )
  WHERE dc.contract_date >= '2025-01-01'::DATE
),
contract_attribution AS (
  -- Get best attribution for each contract from fact_lead_request
  SELECT DISTINCT ON (clm.sk_contract)
    clm.sk_contract,
    clm.sk_lead,
    clm.contract_date,
    clm.total_cost,
    clm.payment_status,
    clm.id_product,
    flr.sk_campaign,
    flr.sk_ad,
    flr.attribution_method,
    flr.attribution_confidence,
    flr.utm_source,
    flr.utm_medium,
    flr.utm_campaign,
    flr.utm_term,
    flr.utm_content,
    flr.fb_lead_id,
    flr.fclid,
    flr.gclid,
    flr.ga_client_id
  FROM contract_lead_match clm
  LEFT JOIN dashboards.fact_lead_request flr ON (
    flr.sk_lead = clm.sk_lead
    AND flr.request_created_at::DATE <= clm.contract_date::DATE
    AND flr.request_created_at::DATE >= clm.contract_date::DATE - INTERVAL '90 days'
  )
  ORDER BY clm.sk_contract, flr.attribution_confidence DESC NULLS LAST, flr.request_created_at DESC
)
SELECT
  ca.sk_contract,
  ca.sk_lead,
  ca.sk_campaign,
  ca.sk_ad,

  -- Get creative from ad
  da.sk_creative,

  -- Get product
  dp.sk_product,

  ca.contract_date::DATE,
  ca.total_cost,
  ca.payment_status,

  ca.attribution_method,
  ca.attribution_confidence,

  ca.utm_source,
  ca.utm_medium,
  ca.utm_campaign,
  ca.utm_term,
  ca.utm_content,

  ca.fb_lead_id,
  ca.fclid,
  ca.gclid,
  ca.ga_client_id,

  -- Try to find Google keyword
  (
    SELECT gkd.keyword_text
    FROM dashboards.stg_google_clicks sgc
    LEFT JOIN raw.google_ads_keyword_daily gkd ON (
      gkd.campaign_id::TEXT = sgc.extracted_campaign_id
      AND gkd.date = sgc.click_timestamp::DATE
    )
    WHERE sgc.gclid = ca.gclid
      AND gkd.keyword_text IS NOT NULL
    ORDER BY gkd.clicks DESC
    LIMIT 1
  ) as google_keyword

FROM contract_attribution ca
LEFT JOIN dashboards.dim_ad da ON da.sk_ad = ca.sk_ad
LEFT JOIN dashboards.dim_product dp ON dp.product_id = ca.id_product

ON CONFLICT (sk_contract) DO UPDATE SET
  sk_lead = COALESCE(EXCLUDED.sk_lead, fact_contract.sk_lead),
  sk_campaign = COALESCE(EXCLUDED.sk_campaign, fact_contract.sk_campaign),
  sk_ad = COALESCE(EXCLUDED.sk_ad, fact_contract.sk_ad),
  sk_creative = COALESCE(EXCLUDED.sk_creative, fact_contract.sk_creative),
  sk_product = COALESCE(EXCLUDED.sk_product, fact_contract.sk_product),
  attribution_method = COALESCE(EXCLUDED.attribution_method, fact_contract.attribution_method),
  attribution_confidence = COALESCE(EXCLUDED.attribution_confidence, fact_contract.attribution_confidence),
  google_keyword = COALESCE(EXCLUDED.google_keyword, fact_contract.google_keyword),
  load_timestamp = NOW();

-- ============================================================================
-- Проверка загрузки данных
-- ============================================================================

SELECT
  'dim_product' as table_name,
  COUNT(*) as rows
FROM dashboards.dim_product

UNION ALL

SELECT
  'dim_contract',
  COUNT(*)
FROM dashboards.dim_contract

UNION ALL

SELECT
  'fact_contract',
  COUNT(*)
FROM dashboards.fact_contract

UNION ALL

SELECT
  'fact_contract with attribution',
  COUNT(*) FILTER (WHERE sk_campaign IS NOT NULL)
FROM dashboards.fact_contract;
