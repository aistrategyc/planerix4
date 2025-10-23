-- ============================================================================
-- CONTRACTS SYSTEM - TABLES, INDEXES, AND N8N NODES
-- Date: October 19, 2025
-- Purpose: Complete contract attribution system with product detail
-- ============================================================================

-- ============================================================================
-- TABLE 1: dim_contract
-- Purpose: Store ALL contracts from crm_orders
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards.dim_contract (
  sk_contract BIGSERIAL PRIMARY KEY,
  contract_id BIGINT UNIQUE NOT NULL,
  id_source BIGINT, -- Link to lead (itcrm_analytics.id)

  -- Product Info
  id_product BIGINT,
  product TEXT,
  name_form TEXT,
  name_sub_form TEXT,

  -- Contract Info
  contract_date TIMESTAMP,
  customer TEXT,
  mobphone TEXT,
  email TEXT,

  -- Payment Info
  payment_status SMALLINT,
  payment_form TEXT,
  total_cost NUMERIC,
  first_sum NUMERIC,
  entrance_fee NUMERIC,
  quantity_of_pairs INTEGER,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_contract_id_source ON dashboards.dim_contract(id_source);
CREATE INDEX IF NOT EXISTS idx_dim_contract_product ON dashboards.dim_contract(id_product);
CREATE INDEX IF NOT EXISTS idx_dim_contract_date ON dashboards.dim_contract(contract_date);
CREATE INDEX IF NOT EXISTS idx_dim_contract_phone ON dashboards.dim_contract(mobphone) WHERE mobphone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dim_contract_email ON dashboards.dim_contract(email) WHERE email IS NOT NULL;

-- ============================================================================
-- TABLE 2: dim_product
-- Purpose: Store unique products
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards.dim_product (
  sk_product BIGSERIAL PRIMARY KEY,
  product_id BIGINT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_category TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_product_name ON dashboards.dim_product(product_name);

-- ============================================================================
-- TABLE 3: fact_contract
-- Purpose: Link contracts to campaigns/ads/creatives/products with full attribution
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboards.fact_contract (
  sk_fact_contract BIGSERIAL PRIMARY KEY,
  sk_contract BIGINT REFERENCES dashboards.dim_contract(sk_contract),
  sk_lead BIGINT REFERENCES dashboards.dim_lead(sk_lead),
  sk_campaign BIGINT REFERENCES dashboards.dim_campaign(sk_campaign),
  sk_ad BIGINT REFERENCES dashboards.dim_ad(sk_ad),
  sk_creative BIGINT REFERENCES dashboards.dim_creative(sk_creative),
  sk_product BIGINT REFERENCES dashboards.dim_product(sk_product),

  -- Contract Metrics
  contract_date DATE NOT NULL,
  total_cost NUMERIC,
  payment_status SMALLINT,

  -- Attribution
  attribution_method TEXT,
  attribution_confidence NUMERIC(10,4),

  -- Source Info (для детализации)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Tracking IDs
  fb_lead_id TEXT,
  fclid TEXT,
  gclid TEXT,
  ga_client_id TEXT,

  -- Google Keyword (если есть)
  google_keyword TEXT,

  -- Metadata
  load_timestamp TIMESTAMP DEFAULT NOW(),

  UNIQUE(sk_contract)
);

CREATE INDEX IF NOT EXISTS idx_fact_contract_date ON dashboards.fact_contract(contract_date);
CREATE INDEX IF NOT EXISTS idx_fact_contract_lead ON dashboards.fact_contract(sk_lead);
CREATE INDEX IF NOT EXISTS idx_fact_contract_campaign ON dashboards.fact_contract(sk_campaign);
CREATE INDEX IF NOT EXISTS idx_fact_contract_ad ON dashboards.fact_contract(sk_ad);
CREATE INDEX IF NOT EXISTS idx_fact_contract_product ON dashboards.fact_contract(sk_product);
CREATE INDEX IF NOT EXISTS idx_fact_contract_gclid ON dashboards.fact_contract(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fact_contract_fb_lead ON dashboards.fact_contract(fb_lead_id) WHERE fb_lead_id IS NOT NULL;

-- ============================================================================
-- Проверка создания таблиц
-- ============================================================================

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='dashboards' AND table_name=t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'dashboards'
  AND table_name IN ('dim_contract', 'dim_product', 'fact_contract')
ORDER BY table_name;
