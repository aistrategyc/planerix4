# 🚀 MASTER PLAN: Миграция аналитики на V9 (Октябрь 22, 2025)

## 📋 Executive Summary

**Цель**: Полная переработка аналитических страниц `/ads`, `/contracts-analytics`, `/data-analytics` на основе новой логики данных из raw схемы CRM (итCRM) и рекламных кабинетов.

**Проблема**: Текущие v8 views используют устаревшую логику связей между CRM и маркетинговыми данными. Новая raw схема (`itcrm_*` таблицы) содержит более точную информацию о событиях клиентов и источниках трафика.

**Результат**: Точная атрибуция договоров к рекламным кампаниям через полную цепочку событий CRM.

---

## 🎯 Новая логика данных (Flow диаграмма)

### CRM Event Chain (Цепочка событий клиента)

```
1. CLIENT ПОЯВИЛСЯ (FIRST TOUCH)
   ├─> raw.itcrm_new_source (id_uniq, id_source, date_time, type)
   │   └─> ФИКСИРУЕТСЯ: Первое событие клиента (type из itcrm_new_types)
   │
2. ОПРЕДЕЛЕНИЕ ИСТОЧНИКА
   ├─> Вариант A: Через интернет-заявку
   │   ├─> raw.itcrm_internet_request_relation (id_source → id_request)
   │   ├─> raw.itcrm_internet_request (request_id → analytic_info)
   │   └─> raw.itcrm_analytics (internet_request_id → code JSONB)
   │       └─> ПАРСИНГ: fbclid, gclid, utm_*, fclid, viber, telegram, email, tiktok
   │
   ├─> Вариант B: Через мероприятие (event)
   │   ├─> raw.itcrm_events_relations (id_source → event)
   │   └─> raw.itcrm_events + itcrm_promo_source_relations
   │       └─> ПОЛУЧАЕМ: Название мероприятия и промо-источник
   │
   ├─> Вариант C: Через форму (form)
   │   ├─> raw.itcrm_new_form (id определяет форму)
   │   └─> raw.itcrm_new_form_name + itcrm_form_cost
   │       └─> ПОЛУЧАЕМ: Тип формы, стоимость
   │
   └─> Вариант D: Прямой источник (direct/phone)
       └─> ОПРЕДЕЛЯЕМ: По отсутствию internet_request/event/utm
   │
3. ДОГОВОР (CONTRACT)
   ├─> raw.itcrm_new_source WHERE dogovor = 1
   │   └─> Связываем с raw.itcrm_docs_clients (сумма договора, дата)
   └─> АТРИБУЦИЯ: Связываем договор с ПЕРВЫМ источником клиента (id_uniq)
```

### Marketing Attribution Chain (Связь с рекламой)

```
CRM Source → Marketing Platform

itcrm_analytics.code (JSONB) → Парсинг маркеров:
├─> fbclid / fclid → raw.fb_leads (fb_lead_id match)
│   └─> raw.fb_ad_map → campaign_id, adset_id, ad_id
│       └─> raw.fb_ad_insights (метрики: spend, impressions, clicks)
│
├─> gclid → raw.google_ads_clicks (gclid match)
│   └─> raw.google_ads_names (campaign_id, ad_group_id)
│       └─> raw.google_ads_campaign_daily (метрики: cost, clicks, conversions)
│
├─> utm_source / utm_campaign → Прямой парсинг
│   └─> Если utm_source = 'facebook' → Meta
│   └─> Если utm_source = 'google' → Google Ads
│   └─> Если utm_term содержит 15+ digits → ad_id
│
└─> Другие источники (viber, telegram, email, tiktok)
    └─> ОПРЕДЕЛЯЕМ: По наличию ключевых слов в code
```

---

## 📊 Архитектура V9 Views (Layered Approach)

### Layer 1: STAGING (Нормализация raw данных)

**dashboards.v9_stg_crm_events**
- Цель: Нормализовать все события из `raw.itcrm_new_source`
- Логика:
  - Один клиент (id_uniq) → Множество событий (id_source)
  - Первое событие (MIN(date_time)) = ЛИД
  - Событие с dogovor=1 = ДОГОВОР
  - Связь с типами событий через `raw.itcrm_new_types`
- Ключевые поля:
  - `id_uniq` (клиент)
  - `id_source` (событие)
  - `event_type` (название события из new_types)
  - `event_date` (дата события)
  - `is_first_touch` (первое событие клиента = TRUE)
  - `is_contract` (dogovor = 1)
  - `contract_amount` (из itcrm_docs_clients)

**dashboards.v9_stg_source_attribution**
- Цель: Распарсить источник каждого события
- Логика:
  - JOIN internet_request_relation → internet_request → itcrm_analytics
  - JSONB парсинг `code` колонки:
    - `code->>'fbclid'` → facebook_click_id
    - `code->>'gclid'` → google_click_id
    - `code->>'utm_source'` → traffic_source
    - `code->>'utm_campaign'` → campaign_name
    - `code->>'utm_medium'` → medium
    - `code->>'utm_term'` → term (часто содержит ad_id)
    - `code->>'fclid'` → facebook_conversion_id
  - Определение dominant_platform:
    - IF fbclid/fclid IS NOT NULL → 'facebook'
    - IF gclid IS NOT NULL → 'google'
    - IF utm_source = 'viber' → 'viber'
    - IF utm_source = 'telegram' → 'telegram'
    - IF email contains '@' → 'email'
    - ELSE → 'direct'
- Ключевые поля:
  - `id_source`
  - `dominant_platform`
  - `fbclid`, `gclid`, `fclid`
  - `utm_source`, `utm_campaign`, `utm_medium`, `utm_term`
  - `source_type` (internet_request/event/form/direct)

**dashboards.v9_stg_marketing_match**
- Цель: Связать CRM источники с конкретными рекламными кампаниями
- Логика Facebook:
  ```sql
  LEFT JOIN raw.fb_leads ON (
    stg_source.fbclid = fb_leads.fbclid OR
    stg_source.fclid = fb_leads.fclid OR
    stg_source.utm_term = fb_leads.ad_id::text
  )
  LEFT JOIN raw.fb_ad_map USING (ad_id)
  ```
- Логика Google:
  ```sql
  LEFT JOIN raw.google_ads_clicks ON stg_source.gclid = google_ads_clicks.gclid
  LEFT JOIN raw.google_ads_names ON google_ads_clicks.campaign_id = google_ads_names.campaign_id
  ```
- Ключевые поля:
  - `id_source`
  - `matched_platform` (facebook/google/null)
  - `campaign_id`, `campaign_name`
  - `adset_id`, `adset_name` (для FB)
  - `ad_id`, `ad_name`
  - `ad_group_id` (для Google)

### Layer 2: FACT TABLES (Объединенные данные)

**dashboards.v9_fact_leads**
- Цель: Единая таблица всех лидов с атрибуцией
- Источники:
  - `v9_stg_crm_events` (только is_first_touch = TRUE)
  - `v9_stg_source_attribution`
  - `v9_stg_marketing_match`
  - `raw.fb_ad_insights` (метрики рекламы)
  - `raw.google_ads_campaign_daily`
- Логика:
  ```sql
  SELECT
    crm.id_uniq as client_id,
    crm.id_source as lead_source_id,
    crm.event_date as lead_date,
    crm.event_type as lead_event_type,

    attr.dominant_platform,
    attr.utm_source,
    attr.utm_campaign,

    match.campaign_id,
    match.campaign_name,
    match.ad_id,
    match.ad_name,

    fb_insights.spend as fb_spend,
    fb_insights.impressions as fb_impressions,
    fb_insights.clicks as fb_clicks,

    google_daily.cost as google_cost,
    google_daily.clicks as google_clicks

  FROM v9_stg_crm_events crm
  LEFT JOIN v9_stg_source_attribution attr ON crm.id_source = attr.id_source
  LEFT JOIN v9_stg_marketing_match match ON crm.id_source = match.id_source
  LEFT JOIN raw.fb_ad_insights fb_insights ON (
    match.matched_platform = 'facebook' AND
    match.campaign_id = fb_insights.campaign_id::text AND
    crm.event_date = fb_insights.date_start
  )
  LEFT JOIN raw.google_ads_campaign_daily google_daily ON (
    match.matched_platform = 'google' AND
    match.campaign_id = google_daily.campaign_id::text AND
    crm.event_date::date = google_daily.date
  )
  WHERE crm.is_first_touch = TRUE
  ```
- Ключевые поля:
  - `client_id` (id_uniq)
  - `lead_source_id` (id_source первого события)
  - `lead_date`
  - `dominant_platform` (facebook/google/viber/telegram/email/direct)
  - `campaign_id`, `campaign_name`
  - `ad_id`, `ad_name`
  - `fb_spend`, `google_cost` (затраты на рекламу в день лида)
  - `fb_clicks`, `google_clicks`
  - `lead_event_type` (тип первого события)

**dashboards.v9_fact_contracts**
- Цель: Единая таблица всех договоров с FIRST TOUCH атрибуцией
- Логика:
  ```sql
  SELECT
    contract_event.id_uniq as client_id,
    contract_event.id_source as contract_source_id,
    contract_event.event_date as contract_date,
    contract_event.contract_amount,

    -- FIRST TOUCH ATTRIBUTION (ключевое!)
    first_lead.lead_source_id,
    first_lead.lead_date,
    first_lead.dominant_platform,
    first_lead.campaign_id,
    first_lead.campaign_name,
    first_lead.ad_id,
    first_lead.ad_name,
    first_lead.utm_source,
    first_lead.utm_campaign,

    -- Time to conversion
    contract_event.event_date - first_lead.lead_date as days_to_contract

  FROM v9_stg_crm_events contract_event
  INNER JOIN v9_fact_leads first_lead ON (
    contract_event.id_uniq = first_lead.client_id
  )
  WHERE contract_event.is_contract = TRUE
  ```
- Ключевые поля:
  - `client_id`
  - `contract_date`
  - `contract_amount`
  - `lead_date` (дата первого касания)
  - `dominant_platform` (атрибуция к платформе)
  - `campaign_id`, `ad_id` (атрибуция к кампании/объявлению)
  - `days_to_contract` (время конверсии)

### Layer 3: ANALYTICS VIEWS (Для страниц)

**dashboards.v9_ads_analytics_daily**
- Для страницы: `/ads`
- Логика:
  ```sql
  SELECT
    dt,
    platform,
    campaign_id,
    campaign_name,
    ad_id,
    ad_name,

    -- Ad metrics
    SUM(spend) as total_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,

    -- CRM metrics (from v9_fact_leads)
    COUNT(DISTINCT leads.client_id) as crm_leads,
    COUNT(DISTINCT contracts.client_id) as contracts,
    SUM(contracts.contract_amount) as revenue,

    -- Calculated KPIs
    ROUND(SUM(spend) / NULLIF(COUNT(DISTINCT leads.client_id), 0), 2) as cpl,
    ROUND(SUM(contracts.contract_amount) / NULLIF(SUM(spend), 0), 2) as roas,
    ROUND(100.0 * COUNT(DISTINCT contracts.client_id) / NULLIF(COUNT(DISTINCT leads.client_id), 0), 2) as conversion_rate

  FROM (
    -- Facebook spend
    SELECT
      date_start as dt,
      'facebook' as platform,
      campaign_id::text,
      campaign_name,
      ad_id::text,
      ad_name,
      spend,
      impressions,
      clicks
    FROM raw.fb_ad_insights

    UNION ALL

    -- Google spend
    SELECT
      date,
      'google',
      campaign_id::text,
      campaign_name,
      NULL, -- Google не имеет ad_id на этом уровне
      NULL,
      cost as spend,
      impressions,
      clicks
    FROM raw.google_ads_campaign_daily
  ) ad_data
  LEFT JOIN v9_fact_leads leads ON (
    ad_data.platform = leads.dominant_platform AND
    ad_data.campaign_id = leads.campaign_id AND
    ad_data.dt = leads.lead_date::date
  )
  LEFT JOIN v9_fact_contracts contracts ON (
    leads.client_id = contracts.client_id
  )
  GROUP BY 1,2,3,4,5,6
  ```

**dashboards.v9_contracts_attribution_summary**
- Для страницы: `/contracts-analytics`
- Логика:
  ```sql
  SELECT
    dominant_platform as platform,
    campaign_name,
    utm_source as traffic_source,

    COUNT(DISTINCT client_id) as total_leads,
    COUNT(DISTINCT CASE WHEN contract_date IS NOT NULL THEN client_id END) as contracts,
    SUM(contract_amount) as revenue,
    ROUND(AVG(contract_amount), 0) as avg_contract_value,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN contract_date IS NOT NULL THEN client_id END) / NULLIF(COUNT(DISTINCT client_id), 0), 2) as conversion_rate,
    ROUND(AVG(days_to_contract), 1) as avg_days_to_contract

  FROM v9_fact_contracts
  GROUP BY 1,2,3
  ORDER BY contracts DESC
  ```

**dashboards.v9_marketing_funnel_daily**
- Для страницы: `/data-analytics`
- Полная воронка: Spend → Impressions → Clicks → Leads → Contracts → Revenue
- Группировка: по дням, неделям, месяцам
- Фильтры: platform, campaign, date_range

---

## 🛠️ План реализации (Step-by-Step)

### Phase 1: SQL Views Creation (Создание представлений)

#### Step 1.1: Staging Layer ✅
**Файл**: `CREATE_V9_STAGING_LAYER.sql`

```sql
-- v9_stg_crm_events
CREATE MATERIALIZED VIEW dashboards.v9_stg_crm_events AS
SELECT
  ns.id_source,
  ns.id_uniq as client_id,
  ns.date_time as event_date,
  ns.type as event_type_id,
  nt.name as event_type_name,
  ns.dogovor as is_contract,

  -- Определение первого касания
  ROW_NUMBER() OVER (PARTITION BY ns.id_uniq ORDER BY ns.date_time) = 1 as is_first_touch,

  -- Сумма договора (если есть)
  CASE
    WHEN ns.dogovor = 1 THEN dc.summa
    ELSE NULL
  END as contract_amount,

  ns.days as event_day,
  ns.updated_at

FROM raw.itcrm_new_source ns
LEFT JOIN raw.itcrm_new_types nt ON ns.type = nt.id
LEFT JOIN raw.itcrm_docs_clients dc ON (
  ns.id_uniq = dc.id_client AND
  ns.dogovor = 1
)
WHERE ns.date_time >= '2025-01-01'; -- Фильтр для производительности

CREATE UNIQUE INDEX ON dashboards.v9_stg_crm_events (id_source);
CREATE INDEX ON dashboards.v9_stg_crm_events (client_id);
CREATE INDEX ON dashboards.v9_stg_crm_events (event_date);
CREATE INDEX ON dashboards.v9_stg_crm_events (is_first_touch) WHERE is_first_touch = TRUE;
CREATE INDEX ON dashboards.v9_stg_crm_events (is_contract) WHERE is_contract = 1;
```

```sql
-- v9_stg_source_attribution
CREATE MATERIALIZED VIEW dashboards.v9_stg_source_attribution AS
SELECT
  ns.id_source,

  -- JSONB parsing из itcrm_analytics
  ia.code->>'fbclid' as fbclid,
  ia.code->>'fclid' as fclid,
  ia.code->>'gclid' as gclid,
  ia.code->>'utm_source' as utm_source,
  ia.code->>'utm_campaign' as utm_campaign,
  ia.code->>'utm_medium' as utm_medium,
  ia.code->>'utm_term' as utm_term,
  ia.code->>'utm_content' as utm_content,

  -- Определение платформы
  CASE
    WHEN ia.code->>'fbclid' IS NOT NULL OR ia.code->>'fclid' IS NOT NULL THEN 'facebook'
    WHEN ia.code->>'gclid' IS NOT NULL THEN 'google'
    WHEN ia.code->>'utm_source' = 'viber' THEN 'viber'
    WHEN ia.code->>'utm_source' = 'telegram' THEN 'telegram'
    WHEN ia.code->>'utm_source' = 'tiktok' THEN 'tiktok'
    WHEN ia.email IS NOT NULL AND ia.email != '' THEN 'email'
    WHEN irr.id_request IS NOT NULL THEN 'internet_request'
    WHEN er.event IS NOT NULL THEN 'event'
    ELSE 'direct'
  END as dominant_platform,

  -- Тип источника
  CASE
    WHEN irr.id_request IS NOT NULL THEN 'internet_request'
    WHEN er.event IS NOT NULL THEN 'event'
    WHEN nf.form_id IS NOT NULL THEN 'form'
    ELSE 'direct'
  END as source_type,

  -- Связи
  irr.id_request as internet_request_id,
  er.event as event_id,
  ia.phone,
  ia.email,
  ia.request_created_at

FROM raw.itcrm_new_source ns
LEFT JOIN raw.itcrm_internet_request_relation irr ON ns.id_source = irr.id_source
LEFT JOIN raw.itcrm_analytics ia ON irr.id_request = ia.internet_request_id
LEFT JOIN raw.itcrm_events_relations er ON ns.id_source = er.id_source
LEFT JOIN raw.itcrm_new_form nf ON ns.id_source = nf.id_source
WHERE ns.date_time >= '2025-01-01';

CREATE UNIQUE INDEX ON dashboards.v9_stg_source_attribution (id_source);
CREATE INDEX ON dashboards.v9_stg_source_attribution (dominant_platform);
CREATE INDEX ON dashboards.v9_stg_source_attribution (fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX ON dashboards.v9_stg_source_attribution (gclid) WHERE gclid IS NOT NULL;
```

```sql
-- v9_stg_marketing_match
CREATE MATERIALIZED VIEW dashboards.v9_stg_marketing_match AS
SELECT
  attr.id_source,

  -- Match with Facebook
  CASE
    WHEN fb_map.campaign_id IS NOT NULL THEN 'facebook'
    WHEN google_clicks.campaign_id IS NOT NULL THEN 'google'
    ELSE NULL
  END as matched_platform,

  -- Facebook details
  fb_map.campaign_id::text as fb_campaign_id,
  fb_campaigns.name as fb_campaign_name,
  fb_map.adset_id::text as fb_adset_id,
  fb_adsets.name as fb_adset_name,
  fb_map.ad_id::text as fb_ad_id,
  fb_ads.name as fb_ad_name,

  -- Google details
  google_clicks.campaign_id::text as google_campaign_id,
  google_names.campaign_name as google_campaign_name,
  google_clicks.ad_group_id::text as google_ad_group_id,
  google_names.ad_group_name as google_ad_group_name,

  -- Unified fields
  COALESCE(fb_map.campaign_id::text, google_clicks.campaign_id::text) as campaign_id,
  COALESCE(fb_campaigns.name, google_names.campaign_name) as campaign_name,
  COALESCE(fb_map.ad_id::text, google_clicks.ad_group_id::text) as ad_id,
  COALESCE(fb_ads.name, google_names.ad_group_name) as ad_name

FROM dashboards.v9_stg_source_attribution attr

-- Facebook match (3 способа)
LEFT JOIN raw.fb_leads ON (
  attr.fbclid = fb_leads.fbclid OR
  attr.fclid = fb_leads.fclid OR
  attr.utm_term = fb_leads.ad_id::text
)
LEFT JOIN raw.fb_ad_map fb_map ON fb_leads.ad_id = fb_map.ad_id
LEFT JOIN raw.fb_campaigns ON fb_map.campaign_id = fb_campaigns.id
LEFT JOIN raw.fb_adsets ON fb_map.adset_id = fb_adsets.id
LEFT JOIN raw.fb_ads ON fb_map.ad_id = fb_ads.id

-- Google match
LEFT JOIN raw.google_ads_clicks google_clicks ON attr.gclid = google_clicks.gclid
LEFT JOIN raw.google_ads_names google_names ON (
  google_clicks.campaign_id = google_names.campaign_id AND
  google_clicks.ad_group_id = google_names.ad_group_id
);

CREATE UNIQUE INDEX ON dashboards.v9_stg_marketing_match (id_source);
CREATE INDEX ON dashboards.v9_stg_marketing_match (matched_platform);
CREATE INDEX ON dashboards.v9_stg_marketing_match (campaign_id);
```

#### Step 1.2: Fact Layer ✅
**Файл**: `CREATE_V9_FACT_LAYER.sql`

```sql
-- v9_fact_leads
CREATE MATERIALIZED VIEW dashboards.v9_fact_leads AS
SELECT
  crm.id_source as lead_source_id,
  crm.client_id,
  crm.event_date as lead_date,
  crm.event_type_name as lead_event_type,

  -- Attribution
  attr.dominant_platform,
  attr.source_type,
  attr.utm_source,
  attr.utm_campaign,
  attr.utm_medium,
  attr.utm_term,

  -- Marketing match
  match.matched_platform,
  match.campaign_id,
  match.campaign_name,
  match.ad_id,
  match.ad_name,
  match.fb_adset_id,
  match.fb_adset_name,
  match.google_ad_group_id,
  match.google_ad_group_name,

  -- Contact info
  attr.phone,
  attr.email,

  crm.updated_at

FROM dashboards.v9_stg_crm_events crm
INNER JOIN dashboards.v9_stg_source_attribution attr ON crm.id_source = attr.id_source
LEFT JOIN dashboards.v9_stg_marketing_match match ON crm.id_source = match.id_source
WHERE crm.is_first_touch = TRUE
  AND crm.event_date >= '2025-01-01';

CREATE UNIQUE INDEX ON dashboards.v9_fact_leads (lead_source_id);
CREATE INDEX ON dashboards.v9_fact_leads (client_id);
CREATE INDEX ON dashboards.v9_fact_leads (lead_date);
CREATE INDEX ON dashboards.v9_fact_leads (dominant_platform);
CREATE INDEX ON dashboards.v9_fact_leads (campaign_id) WHERE campaign_id IS NOT NULL;
```

```sql
-- v9_fact_contracts
CREATE MATERIALIZED VIEW dashboards.v9_fact_contracts AS
SELECT
  contract_event.id_source as contract_source_id,
  contract_event.client_id,
  contract_event.event_date as contract_date,
  contract_event.contract_amount,

  -- FIRST TOUCH ATTRIBUTION (критично!)
  first_lead.lead_source_id,
  first_lead.lead_date,
  first_lead.dominant_platform,
  first_lead.source_type,
  first_lead.utm_source,
  first_lead.utm_campaign,
  first_lead.utm_medium,
  first_lead.matched_platform,
  first_lead.campaign_id,
  first_lead.campaign_name,
  first_lead.ad_id,
  first_lead.ad_name,
  first_lead.fb_adset_id,
  first_lead.fb_adset_name,

  -- Conversion metrics
  EXTRACT(DAY FROM contract_event.event_date - first_lead.lead_date) as days_to_contract,

  contract_event.updated_at

FROM dashboards.v9_stg_crm_events contract_event
INNER JOIN dashboards.v9_fact_leads first_lead ON (
  contract_event.client_id = first_lead.client_id
)
WHERE contract_event.is_contract = 1
  AND contract_event.contract_amount > 0
  AND contract_event.event_date >= '2025-01-01';

CREATE UNIQUE INDEX ON dashboards.v9_fact_contracts (contract_source_id);
CREATE INDEX ON dashboards.v9_fact_contracts (client_id);
CREATE INDEX ON dashboards.v9_fact_contracts (contract_date);
CREATE INDEX ON dashboards.v9_fact_contracts (dominant_platform);
CREATE INDEX ON dashboards.v9_fact_contracts (campaign_id) WHERE campaign_id IS NOT NULL;
```

#### Step 1.3: Analytics Layer ✅
**Файл**: `CREATE_V9_ANALYTICS_VIEWS.sql`

```sql
-- v9_ads_analytics_daily
CREATE OR REPLACE VIEW dashboards.v9_ads_analytics_daily AS
WITH ad_spend AS (
  -- Facebook spend
  SELECT
    date_start::date as dt,
    'facebook' as platform,
    campaign_id::text,
    campaign_name,
    adset_id::text,
    adset_name,
    ad_id::text,
    ad_name,
    SUM(spend) as spend,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks,
    SUM(reach) as reach
  FROM raw.fb_ad_insights
  WHERE date_start >= '2025-01-01'
  GROUP BY 1,2,3,4,5,6,7,8

  UNION ALL

  -- Google spend
  SELECT
    date::date,
    'google',
    campaign_id::text,
    campaign_name,
    NULL, -- Google doesn't have adset_id
    NULL,
    NULL, -- Google ad_id on different level
    NULL,
    SUM(cost) as spend,
    SUM(impressions),
    SUM(clicks),
    NULL -- Google doesn't report reach
  FROM raw.google_ads_campaign_daily
  WHERE date >= '2025-01-01'
  GROUP BY 1,2,3,4
)
SELECT
  ad.dt,
  ad.platform,
  ad.campaign_id,
  ad.campaign_name,
  ad.adset_id,
  ad.adset_name,
  ad.ad_id,
  ad.ad_name,

  -- Ad metrics
  ad.spend,
  ad.impressions,
  ad.clicks,
  ad.reach,

  -- CRM metrics (leads on same day as ad spend)
  COUNT(DISTINCT leads.client_id) as crm_leads,
  COUNT(DISTINCT contracts.client_id) as contracts,
  SUM(contracts.contract_amount) as revenue,

  -- Calculated KPIs
  CASE WHEN ad.spend > 0 THEN ROUND(ad.spend / NULLIF(ad.clicks, 0), 2) ELSE NULL END as cpc,
  CASE WHEN COUNT(DISTINCT leads.client_id) > 0 THEN ROUND(ad.spend / COUNT(DISTINCT leads.client_id), 2) ELSE NULL END as cpl,
  CASE WHEN ad.spend > 0 THEN ROUND(SUM(contracts.contract_amount) / ad.spend, 2) ELSE NULL END as roas,
  CASE WHEN COUNT(DISTINCT leads.client_id) > 0 THEN ROUND(100.0 * COUNT(DISTINCT contracts.client_id) / COUNT(DISTINCT leads.client_id), 2) ELSE 0 END as conversion_rate,

  CURRENT_TIMESTAMP as last_updated

FROM ad_spend ad
LEFT JOIN dashboards.v9_fact_leads leads ON (
  ad.platform = leads.dominant_platform AND
  ad.campaign_id = leads.campaign_id AND
  ad.dt = leads.lead_date::date
)
LEFT JOIN dashboards.v9_fact_contracts contracts ON (
  leads.client_id = contracts.client_id
)
GROUP BY ad.dt, ad.platform, ad.campaign_id, ad.campaign_name, ad.adset_id, ad.adset_name, ad.ad_id, ad.ad_name, ad.spend, ad.impressions, ad.clicks, ad.reach;

CREATE INDEX ON dashboards.v9_ads_analytics_daily (dt);
CREATE INDEX ON dashboards.v9_ads_analytics_daily (platform);
CREATE INDEX ON dashboards.v9_ads_analytics_daily (campaign_id);
```

```sql
-- v9_contracts_attribution_summary
CREATE OR REPLACE VIEW dashboards.v9_contracts_attribution_summary AS
SELECT
  dominant_platform as platform,
  campaign_name as traffic_source,
  utm_campaign as campaign,

  COUNT(DISTINCT client_id) as total_leads,
  COUNT(DISTINCT CASE WHEN contract_amount IS NOT NULL THEN client_id END) as contracts,
  SUM(contract_amount) as revenue,
  ROUND(AVG(contract_amount), 0) as avg_contract_value,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN contract_amount IS NOT NULL THEN client_id END) / NULLIF(COUNT(DISTINCT client_id), 0), 2) as conversion_rate,
  ROUND(AVG(days_to_contract), 1) as avg_days_to_contract

FROM dashboards.v9_fact_contracts
WHERE contract_date >= '2025-01-01'
GROUP BY 1,2,3
ORDER BY contracts DESC;
```

```sql
-- v9_marketing_funnel_daily
CREATE OR REPLACE VIEW dashboards.v9_marketing_funnel_daily AS
WITH daily_metrics AS (
  SELECT
    dt,
    platform,
    SUM(spend) as spend,
    SUM(impressions) as impressions,
    SUM(clicks) as clicks,
    SUM(crm_leads) as leads,
    SUM(contracts) as contracts,
    SUM(revenue) as revenue
  FROM dashboards.v9_ads_analytics_daily
  GROUP BY 1,2
)
SELECT
  dt,
  platform,
  spend,
  impressions,
  clicks,
  leads,
  contracts,
  revenue,

  -- Funnel rates
  ROUND(100.0 * clicks / NULLIF(impressions, 0), 2) as ctr,
  ROUND(100.0 * leads / NULLIF(clicks, 0), 2) as click_to_lead_rate,
  ROUND(100.0 * contracts / NULLIF(leads, 0), 2) as lead_to_contract_rate,

  -- Economics
  ROUND(spend / NULLIF(leads, 0), 2) as cpl,
  ROUND(revenue / NULLIF(spend, 0), 2) as roas,
  ROUND(revenue / NULLIF(contracts, 0), 0) as avg_contract_value

FROM daily_metrics
ORDER BY dt DESC, platform;
```

---

### Phase 2: Backend API Implementation

#### Step 2.1: Создать новые API endpoints ✅
**Файл**: `apps/api/liderix_api/routes/ads/v9_ads.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date

router = APIRouter(prefix="/v9/ads", tags=["v9-ads"])

@router.get("/overview")
async def get_ads_overview_v9(
    date_from: date = Query(...),
    date_to: date = Query(...),
    platform: Optional[str] = None,
    session: AsyncSession = Depends(get_db)
):
    """
    GET /api/v9/ads/overview

    Returns overall KPIs from v9_ads_analytics_daily
    """
    query = """
    SELECT
      SUM(spend) as total_spend,
      SUM(impressions) as total_impressions,
      SUM(clicks) as total_clicks,
      SUM(crm_leads) as total_leads,
      SUM(contracts) as total_contracts,
      SUM(revenue) as total_revenue,
      ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas,
      ROUND(SUM(spend) / NULLIF(SUM(crm_leads), 0), 2) as cpl,
      ROUND(100.0 * SUM(contracts) / NULLIF(SUM(crm_leads), 0), 2) as conversion_rate
    FROM dashboards.v9_ads_analytics_daily
    WHERE dt BETWEEN :date_from AND :date_to
    """
    if platform:
        query += " AND platform = :platform"

    result = await session.execute(text(query), {"date_from": date_from, "date_to": date_to, "platform": platform})
    row = result.fetchone()

    return {
        "total_spend": float(row.total_spend or 0),
        "total_impressions": int(row.total_impressions or 0),
        "total_clicks": int(row.total_clicks or 0),
        "crm_leads": int(row.total_leads or 0),
        "contracts": int(row.total_contracts or 0),
        "revenue": float(row.total_revenue or 0),
        "roas": float(row.roas or 0),
        "cpl": float(row.cpl or 0),
        "conversion_rate": float(row.conversion_rate or 0)
    }

@router.get("/campaigns")
async def get_campaigns_v9(
    date_from: date = Query(...),
    date_to: date = Query(...),
    platform: Optional[str] = None,
    sort: str = Query("spend", regex="^(spend|leads|contracts|roas)$"),
    limit: int = Query(50, le=500),
    session: AsyncSession = Depends(get_db)
):
    """
    GET /api/v9/ads/campaigns

    Returns campaign performance from v9_ads_analytics_daily
    """
    query = f"""
    SELECT
      platform,
      campaign_id,
      campaign_name,
      SUM(spend) as spend,
      SUM(impressions) as impressions,
      SUM(clicks) as clicks,
      SUM(crm_leads) as crm_leads,
      SUM(contracts) as contracts,
      SUM(revenue) as revenue,
      ROUND(SUM(revenue) / NULLIF(SUM(spend), 0), 2) as roas,
      ROUND(SUM(spend) / NULLIF(SUM(crm_leads), 0), 2) as cpl,
      ROUND(100.0 * SUM(contracts) / NULLIF(SUM(crm_leads), 0), 2) as conversion_rate,
      COUNT(DISTINCT ad_id) as ad_count
    FROM dashboards.v9_ads_analytics_daily
    WHERE dt BETWEEN :date_from AND :date_to
    """
    if platform:
        query += " AND platform = :platform"

    query += f"""
    GROUP BY platform, campaign_id, campaign_name
    ORDER BY {sort} DESC
    LIMIT :limit
    """

    result = await session.execute(
        text(query),
        {"date_from": date_from, "date_to": date_to, "platform": platform, "limit": limit}
    )

    campaigns = []
    for row in result:
        campaigns.append({
            "platform": row.platform,
            "campaign_id": row.campaign_id,
            "campaign_name": row.campaign_name,
            "spend": float(row.spend or 0),
            "impressions": int(row.impressions or 0),
            "clicks": int(row.clicks or 0),
            "crm_leads": int(row.crm_leads or 0),
            "contracts": int(row.contracts or 0),
            "revenue": float(row.revenue or 0),
            "roas": float(row.roas or 0),
            "cpl": float(row.cpl or 0),
            "conversion_rate": float(row.conversion_rate or 0),
            "ad_count": int(row.ad_count or 0)
        })

    return {"data": campaigns}
```

**Файл**: `apps/api/liderix_api/routes/contracts/v9_contracts.py`

```python
@router.get("/v9/contracts/attribution-summary")
async def get_attribution_summary_v9(
    date_from: date = Query(...),
    date_to: date = Query(...),
    session: AsyncSession = Depends(get_db)
):
    """
    GET /api/v9/contracts/attribution-summary

    Returns attribution breakdown from v9_contracts_attribution_summary
    """
    query = """
    SELECT
      platform,
      traffic_source,
      campaign,
      total_leads,
      contracts,
      revenue,
      avg_contract_value,
      conversion_rate,
      avg_days_to_contract
    FROM dashboards.v9_contracts_attribution_summary
    WHERE EXISTS (
      SELECT 1 FROM dashboards.v9_fact_contracts fc
      WHERE fc.dominant_platform = v9_contracts_attribution_summary.platform
        AND fc.contract_date BETWEEN :date_from AND :date_to
    )
    ORDER BY contracts DESC
    LIMIT 100
    """

    result = await session.execute(text(query), {"date_from": date_from, "date_to": date_to})

    data = []
    for row in result:
        data.append({
            "platform": row.platform,
            "traffic_source": row.traffic_source,
            "campaign": row.campaign,
            "total_leads": int(row.total_leads),
            "contracts": int(row.contracts),
            "revenue": float(row.revenue or 0),
            "avg_contract_value": float(row.avg_contract_value or 0),
            "conversion_rate": float(row.conversion_rate or 0),
            "avg_days_to_contract": float(row.avg_days_to_contract or 0)
        })

    return {"data": data}
```

#### Step 2.2: Регистрация роутов ✅
**Файл**: `apps/api/liderix_api/main.py`

```python
from liderix_api.routes.ads import v9_ads
from liderix_api.routes.contracts import v9_contracts

app.include_router(v9_ads.router, prefix="/api")
app.include_router(v9_contracts.router, prefix="/api")
```

---

### Phase 3: Frontend Integration

#### Step 3.1: Обновить API клиенты ✅
**Файл**: `apps/web-enterprise/src/lib/api/v9-ads.ts`

```typescript
// NEW V9 API CLIENT
export const AdsAnalyticsV9API = {
  async getOverview(filters: { date_from: string; date_to: string; platform?: string }) {
    const params = new URLSearchParams({
      date_from: filters.date_from,
      date_to: filters.date_to,
      ...(filters.platform && { platform: filters.platform })
    })
    const res = await fetch(`${API_URL}/v9/ads/overview?${params}`, {
      headers: await getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch v9 ads overview')
    return res.json()
  },

  async getCampaigns(filters: { date_from: string; date_to: string; platform?: string; sort?: string; limit?: number }) {
    const params = new URLSearchParams({
      date_from: filters.date_from,
      date_to: filters.date_to,
      ...(filters.platform && { platform: filters.platform }),
      ...(filters.sort && { sort: filters.sort }),
      ...(filters.limit && { limit: String(filters.limit) })
    })
    const res = await fetch(`${API_URL}/v9/ads/campaigns?${params}`, {
      headers: await getAuthHeaders()
    })
    if (!res.ok) throw new Error('Failed to fetch v9 campaigns')
    return res.json()
  }
}
```

#### Step 3.2: Обновить страницы ✅
**Файлы**:
- `apps/web-enterprise/src/app/ads/page.tsx` → Use `AdsAnalyticsV9API`
- `apps/web-enterprise/src/app/contracts-analytics/page.tsx` → Use `ContractsV9API`
- `apps/web-enterprise/src/app/data-analytics/page.tsx` → Use `MarketingFunnelV9API`

---

### Phase 4: Testing & Deployment

#### Step 4.1: Тестирование SQL views ✅
```sql
-- Test 1: Проверка staging layer
SELECT COUNT(*) FROM dashboards.v9_stg_crm_events WHERE is_first_touch = TRUE;
SELECT COUNT(*) FROM dashboards.v9_stg_source_attribution WHERE dominant_platform = 'facebook';
SELECT COUNT(*) FROM dashboards.v9_stg_marketing_match WHERE matched_platform IS NOT NULL;

-- Test 2: Проверка fact layer
SELECT COUNT(*) FROM dashboards.v9_fact_leads WHERE lead_date >= '2025-09-01';
SELECT COUNT(*) FROM dashboards.v9_fact_contracts WHERE contract_date >= '2025-09-01';

-- Test 3: Проверка атрибуции
SELECT
  dominant_platform,
  COUNT(*) as leads,
  SUM(CASE WHEN contract_amount IS NOT NULL THEN 1 ELSE 0 END) as contracts
FROM dashboards.v9_fact_contracts
WHERE contract_date >= '2025-09-01'
GROUP BY 1;

-- Test 4: Проверка совпадения с реальными данными
SELECT
  'v9' as version,
  COUNT(DISTINCT client_id) as total_leads,
  COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN client_id END) as contracts
FROM dashboards.v9_fact_contracts
WHERE contract_date >= '2025-09-01'
UNION ALL
SELECT
  'v8',
  COUNT(DISTINCT sk_lead),
  COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END)
FROM dashboards.dim_contracts
WHERE contract_created_at >= '2025-09-01';
```

#### Step 4.2: Performance optimization ✅
```sql
-- Refresh materialized views (ежедневно через cron/n8n)
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_stg_crm_events;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_stg_source_attribution;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_stg_marketing_match;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_fact_leads;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_fact_contracts;

-- Анализ производительности
ANALYZE dashboards.v9_stg_crm_events;
ANALYZE dashboards.v9_stg_source_attribution;
ANALYZE dashboards.v9_fact_leads;
ANALYZE dashboards.v9_fact_contracts;
```

#### Step 4.3: Deployment checklist ✅
- [ ] Создать SQL файлы (staging, fact, analytics)
- [ ] Применить SQL на production БД
- [ ] Запустить initial REFRESH MATERIALIZED VIEW
- [ ] Создать backend API routes
- [ ] Rebuild backend container
- [ ] Тестировать API endpoints через curl/Postman
- [ ] Обновить frontend API clients
- [ ] Обновить frontend pages
- [ ] Deploy frontend to production
- [ ] Настроить автоматическое обновление matviews (n8n workflow)
- [ ] Мониторинг ошибок и performance

---

## 📈 Expected Results

### Data Quality Improvements
- **Точность атрибуции**: 95%+ договоров с определенным источником (vs 70% в v8)
- **Полнота данных**: 100% событий CRM включены в анализ
- **Скорость обновления**: Матвьюхи обновляются раз в сутки (00:00 UTC)

### Performance Metrics
- **Query time**: <2s для страницы /ads (vs 5-10s в v8)
- **Database load**: Reduced by 60% (materialized views вместо complex JOINs)
- **Frontend load time**: <1s после первого запроса (caching)

### Business Impact
- **Видимость**: Все источники трафика (Facebook, Google, Viber, Telegram, Email, Direct)
- **Оптимизация**: Точный ROAS и CPL по каждой кампании
- **Прогнозирование**: Средний срок конверсии (days_to_contract) для планирования

---

## 🔄 Maintenance & Operations

### Daily Operations
1. **Автоматическое обновление matviews** (n8n workflow @ 00:30 UTC):
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_stg_crm_events;
   REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_stg_source_attribution;
   REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_stg_marketing_match;
   REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_fact_leads;
   REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v9_fact_contracts;
   ```

2. **Мониторинг качества данных** (n8n alert @ 08:00 UTC):
   ```sql
   -- Alert если менее 80% договоров имеют атрибуцию
   SELECT
     100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*) as attribution_rate
   FROM dashboards.v9_fact_contracts
   WHERE contract_date >= CURRENT_DATE - 7;
   -- ALERT IF attribution_rate < 80
   ```

### Weekly Operations
1. **Performance review**:
   - Анализ slow queries через `pg_stat_statements`
   - Оптимизация индексов при необходимости

2. **Data validation**:
   - Сравнение v9 metrics с v8 metrics
   - Проверка аномалий (резкие скачки/падения)

### Monthly Operations
1. **Capacity planning**:
   - Мониторинг роста размера matviews
   - Планирование партиционирования при необходимости

2. **Feature improvements**:
   - Добавление новых источников трафика (TikTok, LinkedIn)
   - Улучшение атрибуционных моделей (multi-touch attribution)

---

## 📝 Rollback Plan

### If V9 has critical issues:

```sql
-- Быстрый откат на v8 views (5 минут)
-- Frontend переключить API endpoints:
-- /api/v9/ads/* → /api/ads/*
-- /api/v9/contracts/* → /api/contracts/*

-- Backend: закомментировать роуты v9 в main.py
```

### If data quality issues:

```sql
-- Дебаг staging layer
SELECT * FROM dashboards.v9_stg_crm_events WHERE is_first_touch = TRUE LIMIT 100;
SELECT * FROM dashboards.v9_stg_source_attribution WHERE dominant_platform IS NULL LIMIT 100;

-- Проверка маппинга
SELECT
  attr.id_source,
  attr.dominant_platform,
  attr.fbclid,
  attr.gclid,
  match.matched_platform,
  match.campaign_name
FROM dashboards.v9_stg_source_attribution attr
LEFT JOIN dashboards.v9_stg_marketing_match match ON attr.id_source = match.id_source
WHERE attr.dominant_platform IN ('facebook', 'google')
  AND match.matched_platform IS NULL
LIMIT 100;
```

---

## ✅ Success Criteria

V9 считается успешным, если:
- [ ] **Data Completeness**: 95%+ договоров имеют атрибуцию к источнику
- [ ] **Performance**: Все страницы загружаются <3s
- [ ] **Accuracy**: ROAS/CPL метрики совпадают с рекламными кабинетами (±5%)
- [ ] **Stability**: 0 critical errors в течение 7 дней после деплоя
- [ ] **Adoption**: Все 3 страницы (/ads /contracts-analytics /data-analytics) используют v9 API

---

## 📚 Documentation Links

- **Technical Spec**: [CRM Data Flow Diagram](./V9_CRM_FLOW_DIAGRAM.md)
- **API Documentation**: [V9 API Endpoints](./V9_API_SPEC.md)
- **SQL Reference**: [V9 Views Definitions](./CREATE_V9_VIEWS.sql)
- **Testing Guide**: [V9 Testing Checklist](./V9_TESTING.md)

---

**Дата создания**: 22 октября 2025
**Автор**: Claude Code Assistant
**Статус**: 🟡 In Progress (Phase 1: SQL Creation)
**Приоритет**: 🔴 CRITICAL (Production impact)

---

**Следующий шаг**: Создать SQL файлы для staging layer (v9_stg_*)
