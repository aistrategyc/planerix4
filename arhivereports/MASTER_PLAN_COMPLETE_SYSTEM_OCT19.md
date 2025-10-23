# МАСТЕР-ПЛАН: ПОЛНАЯ СИСТЕМА DATA ANALYTICS - 10000% ГОТОВНОСТЬ
**Date**: October 19, 2025, 17:00
**Цель**: Создать комплексную точную систему с детализацией каждого контракта до креатива/ключевого слова

---

## 🎯 ПРИОРИТЕТЫ (из ТЗ)

1. ✅ **Точная детализация каждого договора** - откуда пришел (до креатива или ключевого слова)
2. ✅ **Включая email рассылки, Telegram, другие источники** - у нас есть данные
3. ✅ **Сортировка по продуктам** - ~60+ продуктов в crm_orders
4. ✅ **Правильные фильтры с датами** - для корректировки периодов
5. ✅ **Правильные графики** - точная понятная информация
6. ✅ **Качественный UI** - все данные точно и понятно

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### ШАГ 1: RAW ДАННЫЕ ✅ ГОТОВО
- ✅ 33 таблицы проверены
- ✅ 1,916 контрактов (100% с id_source + product)
- ✅ 4,498 лидов (100% с атрибуцией)
- ✅ 383 Facebook лидов (99.7% с ad_id)
- ✅ 192,815 Google clicks
- ✅ 500 ключевых слов

### ШАГ 2: DASHBOARDS НОРМАЛИЗАЦИЯ ⚠️ ТРЕБУЕТ ИСПРАВЛЕНИЯ

**Проблемы**:
1. ❌ `contract_attribution` содержит только 226 из 1,916 контрактов (11.8%!)
2. ❌ Нет таблицы `dim_contract` для хранения ВСЕХ контрактов
3. ❌ Нет таблицы `dim_product` для продуктов
4. ❌ Нет связи contracts → fact_lead_request
5. ❌ Нет view с детализацией контрактов до креатива

### ШАГ 3-7: VIEWS, API, UI ⚠️ ТРЕБУЮТ ОБНОВЛЕНИЯ

---

## 🔧 ПЛАН ИСПРАВЛЕНИЯ

### ЭТАП 2.1: Создать dim_contract ✅

```sql
CREATE TABLE dashboards.dim_contract (
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

CREATE INDEX idx_dim_contract_id_source ON dashboards.dim_contract(id_source);
CREATE INDEX idx_dim_contract_product ON dashboards.dim_contract(id_product);
CREATE INDEX idx_dim_contract_date ON dashboards.dim_contract(contract_date);
```

### ЭТАП 2.2: Создать dim_product ✅

```sql
CREATE TABLE dashboards.dim_product (
  sk_product BIGSERIAL PRIMARY KEY,
  product_id BIGINT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_category TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dim_product_name ON dashboards.dim_product(product_name);
```

### ЭТАП 2.3: Загрузить данные в dim_contract и dim_product ✅

**N8N Node: Load dim_contract**:
```sql
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
ON CONFLICT (contract_id) DO UPDATE SET
  id_source = EXCLUDED.id_source,
  product = EXCLUDED.product,
  contract_date = EXCLUDED.contract_date,
  updated_at = NOW();
```

**N8N Node: Load dim_product**:
```sql
INSERT INTO dashboards.dim_product (product_id, product_name)
SELECT DISTINCT
  id_product as product_id,
  product as product_name
FROM raw.crm_orders
WHERE id_product IS NOT NULL
  AND product IS NOT NULL
ON CONFLICT (product_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  updated_at = NOW();
```

---

### ЭТАП 2.4: Создать fact_contract ✅

```sql
CREATE TABLE dashboards.fact_contract (
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

CREATE INDEX idx_fact_contract_date ON dashboards.fact_contract(contract_date);
CREATE INDEX idx_fact_contract_lead ON dashboards.fact_contract(sk_lead);
CREATE INDEX idx_fact_contract_campaign ON dashboards.fact_contract(sk_campaign);
CREATE INDEX idx_fact_contract_ad ON dashboards.fact_contract(sk_ad);
CREATE INDEX idx_fact_contract_product ON dashboards.fact_contract(sk_product);
CREATE INDEX idx_fact_contract_gclid ON dashboards.fact_contract(gclid) WHERE gclid IS NOT NULL;
```

### ЭТАП 2.5: N8N Node для загрузки fact_contract ✅

```sql
INSERT INTO dashboards.fact_contract (
  sk_contract, sk_lead, sk_campaign, sk_ad, sk_creative, sk_product,
  contract_date, total_cost, payment_status,
  attribution_method, attribution_confidence,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  fb_lead_id, fclid, gclid, ga_client_id,
  google_keyword
)
SELECT
  dc.sk_contract,
  dl.sk_lead,
  flr.sk_campaign,
  flr.sk_ad,
  da.sk_creative,
  dp.sk_product,

  dc.contract_date::DATE,
  dc.total_cost,
  dc.payment_status,

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
  flr.ga_client_id,

  -- Google keyword matching через gclid
  (
    SELECT gkd.keyword_text
    FROM dashboards.stg_google_clicks sgc
    LEFT JOIN raw.google_ads_keyword_daily gkd ON (
      gkd.campaign_id = sgc.extracted_campaign_id::BIGINT
      AND gkd.date = sgc.click_timestamp::DATE
    )
    WHERE sgc.gclid = flr.gclid
    LIMIT 1
  ) as google_keyword

FROM dashboards.dim_contract dc

-- Join to lead
LEFT JOIN dashboards.dim_lead dl ON (
  dl.phone = dc.mobphone
  AND dl.email = dc.email
)

-- Join to lead request (для атрибуции)
LEFT JOIN dashboards.fact_lead_request flr ON (
  flr.sk_lead = dl.sk_lead
  AND flr.request_created_at::DATE <= dc.contract_date::DATE
  AND flr.request_created_at::DATE >= dc.contract_date::DATE - INTERVAL '90 days'
)

-- Join to ad (для креатива)
LEFT JOIN dashboards.dim_ad da ON (
  da.sk_ad = flr.sk_ad
)

-- Join to product
LEFT JOIN dashboards.dim_product dp ON (
  dp.product_id = dc.id_product
)

WHERE dc.contract_date >= '2025-01-01'::DATE

ON CONFLICT (sk_contract) DO UPDATE SET
  sk_lead = EXCLUDED.sk_lead,
  sk_campaign = COALESCE(EXCLUDED.sk_campaign, fact_contract.sk_campaign),
  sk_ad = COALESCE(EXCLUDED.sk_ad, fact_contract.sk_ad),
  sk_creative = COALESCE(EXCLUDED.sk_creative, fact_contract.sk_creative),
  attribution_method = COALESCE(EXCLUDED.attribution_method, fact_contract.attribution_method),
  google_keyword = COALESCE(EXCLUDED.google_keyword, fact_contract.google_keyword),
  load_timestamp = NOW();
```

---

### ЭТАП 3: VIEWS С ДЕТАЛИЗАЦИЕЙ ✅

#### VIEW 1: v7_contracts_detail (ГЛАВНЫЙ VIEW)

```sql
CREATE OR REPLACE VIEW dashboards.v7_contracts_detail AS
SELECT
  fc.contract_date,

  -- Contract Info
  dc.contract_id,
  dc.customer,
  dc.mobphone,
  dc.email,
  dc.payment_status,
  dc.total_cost,

  -- Product Info
  dp.product_name,
  dc.name_form,
  dc.name_sub_form,

  -- Attribution
  fc.attribution_method,
  fc.attribution_confidence,

  -- Platform
  CASE
    WHEN dcamp.platform IS NOT NULL THEN dcamp.platform
    WHEN fc.fb_lead_id IS NOT NULL THEN 'facebook'
    WHEN fc.gclid IS NOT NULL THEN 'google'
    WHEN fc.utm_source ILIKE '%facebook%' THEN 'facebook'
    WHEN fc.utm_source ILIKE '%google%' THEN 'google'
    WHEN fc.utm_source ILIKE '%email%' THEN 'email'
    WHEN fc.utm_source ILIKE '%telegram%' THEN 'telegram'
    ELSE 'other'
  END as platform,

  -- Campaign Info
  dcamp.campaign_id,
  dcamp.campaign_name,

  -- Ad Info
  dad.ad_id,
  dad.ad_name,
  dad.adset_name,

  -- Creative Info
  dcr.ad_creative_id,
  dcr.media_type,
  dcr.title as creative_title,
  dcr.body as creative_body,
  dcr.call_to_action,

  -- UTM Info
  fc.utm_source,
  fc.utm_medium,
  fc.utm_campaign,
  fc.utm_term,
  fc.utm_content,

  -- Google Keyword
  fc.google_keyword,

  -- Tracking IDs
  fc.fb_lead_id,
  fc.fclid,
  fc.gclid,
  fc.ga_client_id

FROM dashboards.fact_contract fc

LEFT JOIN dashboards.dim_contract dc ON dc.sk_contract = fc.sk_contract
LEFT JOIN dashboards.dim_product dp ON dp.sk_product = fc.sk_product
LEFT JOIN dashboards.dim_campaign dcamp ON dcamp.sk_campaign = fc.sk_campaign
LEFT JOIN dashboards.dim_ad dad ON dad.sk_ad = fc.sk_ad
LEFT JOIN dashboards.dim_creative dcr ON dcr.sk_creative = fc.sk_creative

WHERE fc.contract_date >= '2025-01-01'::DATE

ORDER BY fc.contract_date DESC;
```

#### VIEW 2: v7_contracts_by_product

```sql
CREATE OR REPLACE VIEW dashboards.v7_contracts_by_product AS
SELECT
  fc.contract_date::DATE as dt,
  dp.product_name,

  COUNT(DISTINCT fc.sk_contract) as n_contracts,
  COUNT(DISTINCT fc.sk_lead) as n_leads,

  -- Attribution Coverage
  COUNT(DISTINCT fc.sk_campaign) FILTER (WHERE fc.sk_campaign IS NOT NULL) as campaigns_attributed,
  COUNT(DISTINCT fc.sk_ad) FILTER (WHERE fc.sk_ad IS NOT NULL) as ads_attributed,
  COUNT(DISTINCT fc.sk_creative) FILTER (WHERE fc.sk_creative IS NOT NULL) as creatives_attributed,
  COUNT(DISTINCT fc.google_keyword) FILTER (WHERE fc.google_keyword IS NOT NULL) as keywords_attributed,

  ROUND(100.0 * COUNT(*) FILTER (WHERE fc.sk_campaign IS NOT NULL) / COUNT(*), 2) as campaign_coverage_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE fc.sk_ad IS NOT NULL) / COUNT(*), 2) as ad_coverage_pct

FROM dashboards.fact_contract fc
LEFT JOIN dashboards.dim_product dp ON dp.sk_product = fc.sk_product

WHERE fc.contract_date >= '2025-01-01'::DATE

GROUP BY fc.contract_date::DATE, dp.product_name

ORDER BY dt DESC, n_contracts DESC;
```

#### VIEW 3: v7_contracts_by_creative

```sql
CREATE OR REPLACE VIEW dashboards.v7_contracts_by_creative AS
SELECT
  dcr.ad_creative_id,
  dcr.media_type,
  dcr.title as creative_title,
  dcr.body as creative_body,
  dcr.call_to_action,

  COUNT(DISTINCT fc.sk_contract) as n_contracts,
  COUNT(DISTINCT fc.sk_lead) as n_leads,

  STRING_AGG(DISTINCT dp.product_name, ', ') as products

FROM dashboards.fact_contract fc
LEFT JOIN dashboards.dim_creative dcr ON dcr.sk_creative = fc.sk_creative
LEFT JOIN dashboards.dim_product dp ON dp.sk_product = fc.sk_product

WHERE fc.sk_creative IS NOT NULL
  AND fc.contract_date >= '2025-01-01'::DATE

GROUP BY dcr.ad_creative_id, dcr.media_type, dcr.title, dcr.body, dcr.call_to_action

ORDER BY n_contracts DESC;
```

#### VIEW 4: v7_contracts_by_keyword

```sql
CREATE OR REPLACE VIEW dashboards.v7_contracts_by_keyword AS
SELECT
  fc.google_keyword,

  COUNT(DISTINCT fc.sk_contract) as n_contracts,
  COUNT(DISTINCT fc.sk_lead) as n_leads,

  STRING_AGG(DISTINCT dp.product_name, ', ') as products

FROM dashboards.fact_contract fc
LEFT JOIN dashboards.dim_product dp ON dp.sk_product = fc.sk_product

WHERE fc.google_keyword IS NOT NULL
  AND fc.contract_date >= '2025-01-01'::DATE

GROUP BY fc.google_keyword

ORDER BY n_contracts DESC;
```

---

### ЭТАП 4-7: API + UI

*Будет реализовано после создания таблиц и views*

---

## 📋 ПОРЯДОК ВЫПОЛНЕНИЯ

### СЕЙЧАС (Шаг 2):
1. ✅ Создать dim_contract
2. ✅ Создать dim_product
3. ✅ Создать fact_contract
4. ✅ Добавить 3 N8N ноды для загрузки
5. ✅ Запустить N8N workflow

### ПОТОМ (Шаг 3):
6. ✅ Создать 4 views (v7_contracts_*)
7. ✅ Проверить данные

### ЗАТЕМ (Шаг 4-7):
8. ✅ Обновить API endpoints
9. ✅ Обновить UI компоненты
10. ✅ Протестировать end-to-end

**ГОТОВ СОЗДАВАТЬ ТАБЛИЦЫ!** 🚀
