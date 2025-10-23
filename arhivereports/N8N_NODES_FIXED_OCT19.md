# N8N Workflow Nodes - ИСПРАВЛЕННЫЕ SQL (все ошибки устранены)
**Date**: October 19, 2025, 14:10
**Status**: ✅ ВСЕ ОШИБКИ ИСПРАВЛЕНЫ - готово к использованию

---

## ⚠️ ВАЖНО: Про существующие ноды

**Вопрос**: Что делать с остальными нодами из текущего флоу `/Users/Kirill/planerix_new/n8nflow/2 dashboards.json`?

**Ответ**:
1. **ОСТАВЬ старые ноды НА ВРЕМЯ** (не удаляй их)
2. **Добавь эти 10 новых нод ПАРАЛЛЕЛЬНО** старым
3. После проверки, что новые ноды работают корректно, старые можно будет отключить или удалить
4. **Старые ноды обновляют**: `dashboards.crm_requests`, `dashboards.fact_leads` (старые таблицы)
5. **Новые ноды обновляют**: `dashboards.stg_*`, `dashboards.dim_*`, `dashboards.fact_lead_request`, `dashboards.fact_ad_performance` (новые таблицы)

---

## 🔧 Node 1: ИСПРАВЛЕНО - Load CRM → stg_crm_requests

**Ошибка была**: Syntax error at line 113 near "MIN" - N8N скопировал лишний текст из старой ноды

**Исправление**: Чистый SQL без лишних частей

```sql
INSERT INTO dashboards.stg_crm_requests (
  source_id, analytic_id, internet_request_id,
  phone, email, request_created_at,
  code_variant,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  fb_lead_id, fclid, fb_event_id,
  gclid, ga_client_id,
  ga_session_id, ga_session_number, ga_session_timestamp,
  extracted_ad_id, extracted_campaign_id,
  raw_code
)
SELECT
  id as source_id,
  analytic_id,
  internet_request_id,
  phone,
  email,
  request_created_at,

  CASE
    WHEN code IS NULL THEN 'null'
    WHEN jsonb_typeof(code) = 'string' THEN 'string'
    WHEN code ? 'ga' AND code ? 'gsession' THEN 'google_analytics'
    WHEN code ? 'fb_lead_id' OR code ? 'fclid' THEN 'facebook_lead'
    WHEN code ? 'utm_source' THEN 'utm_params'
    ELSE 'unknown'
  END as code_variant,

  code->>'utm_source' as utm_source,
  code->>'utm_medium' as utm_medium,
  code->>'utm_campaign' as utm_campaign,
  code->>'utm_term' as utm_term,
  code->>'utm_content' as utm_content,

  code->>'fb_lead_id' as fb_lead_id,
  NULLIF(code->>'fclid', '') as fclid,
  code->>'event_id' as fb_event_id,

  NULLIF(code->>'gclid', '') as gclid,
  code->>'ga' as ga_client_id,

  (
    SELECT key
    FROM jsonb_each(code->'gsession')
    LIMIT 1
  ) as ga_session_id,

  (
    SELECT NULLIF(
      regexp_replace(
        SPLIT_PART(SPLIT_PART(value::TEXT, '$o', 2), '$', 1),
        '[^0-9]', '', 'g'
      ),
      ''
    )::INTEGER
    FROM jsonb_each(code->'gsession')
    WHERE value::TEXT LIKE '%$o%'
    LIMIT 1
  ) as ga_session_number,

  (
    SELECT NULLIF(
      regexp_replace(
        SPLIT_PART(SPLIT_PART(value::TEXT, '$t', 2), '$', 1),
        '[^0-9]', '', 'g'
      ),
      ''
    )::BIGINT
    FROM jsonb_each(code->'gsession')
    WHERE value::TEXT LIKE '%$t%'
    LIMIT 1
  ) as ga_session_timestamp,

  CASE
    WHEN code->>'utm_term' ~ '^\d{15,20}$' THEN code->>'utm_term'
    ELSE NULL
  END as extracted_ad_id,

  CASE
    WHEN code->>'utm_campaign' ~ '^\d{10,20}$' THEN code->>'utm_campaign'
    ELSE NULL
  END as extracted_campaign_id,

  code as raw_code

FROM raw.itcrm_analytics

WHERE inserted_at > COALESCE(
  (SELECT MAX(load_timestamp) FROM dashboards.stg_crm_requests),
  '1970-01-01'::TIMESTAMP
)

ON CONFLICT (source_id) DO UPDATE SET
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  code_variant = EXCLUDED.code_variant,
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
  ga_session_number = EXCLUDED.ga_session_number,
  ga_session_timestamp = EXCLUDED.ga_session_timestamp,
  extracted_ad_id = EXCLUDED.extracted_ad_id,
  extracted_campaign_id = EXCLUDED.extracted_campaign_id,
  raw_code = EXCLUDED.raw_code,
  load_timestamp = NOW();
```

---

## 🔧 Node 2: ИСПРАВЛЕНО - Load Facebook → stg_fb_ads_daily

**Ошибка была**: column fai.reach does not exist

**Причина**: В таблице `raw.fb_ad_insights` НЕТ колонки `reach` и `frequency`

**Исправление**: Убрал несуществующие колонки

```sql
INSERT INTO dashboards.stg_fb_ads_daily (
  date_day, ad_id, ad_name, adset_id, adset_name,
  campaign_id, campaign_name, account_id,
  ad_status, adset_status, campaign_status, campaign_objective,
  impressions, clicks, spend, reach, frequency,
  ctr, cpc, cpm,
  ad_creative_id, actions, source_row_ids
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
  NULL::BIGINT as reach,
  NULL::NUMERIC(10,4) as frequency,

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
  NULL::JSONB as actions,
  array_agg(fai.date_start::TEXT || '_' || fai.ad_id)::INTEGER[] as source_row_ids

FROM raw.fb_ad_insights fai
LEFT JOIN raw.fb_ads fa ON fai.ad_id = fa.ad_id
LEFT JOIN raw.fb_adsets fas ON fai.adset_id = fas.adset_id
LEFT JOIN raw.fb_campaigns fc ON fai.campaign_id = fc.campaign_id

WHERE fai.date_start >= CURRENT_DATE - INTERVAL '90 days'
  AND fai.load_timestamp > COALESCE(
    (SELECT MAX(load_timestamp) FROM dashboards.stg_fb_ads_daily),
    '1970-01-01'::TIMESTAMP
  )

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
  campaign_objective = EXCLUDED.campaign_objective,
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  spend = EXCLUDED.spend,
  reach = EXCLUDED.reach,
  frequency = EXCLUDED.frequency,
  ctr = EXCLUDED.ctr,
  cpc = EXCLUDED.cpc,
  cpm = EXCLUDED.cpm,
  ad_creative_id = EXCLUDED.ad_creative_id,
  actions = EXCLUDED.actions,
  load_timestamp = NOW();
```

---

## 🔧 Node 3: ИСПРАВЛЕНО - Load Google Ads → stg_google_ads_daily

**Ошибка была**: column "conversion_value" does not exist

**Причина**: В `raw.google_ads_campaign_daily` колонка называется `conversions_value` (с 's')

**Исправление**: Использую правильное имя колонки

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
  SUM(conversions_value) as conversion_value,

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
  AND load_timestamp > COALESCE(
    (SELECT MAX(load_timestamp) FROM dashboards.stg_google_ads_daily),
    '1970-01-01'::TIMESTAMP
  )

GROUP BY date, campaign_id, campaign_name, campaign_status

ON CONFLICT ON CONSTRAINT idx_stg_google_ads_unique
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

---

## 🔧 Node 4: ИСПРАВЛЕНО - Load Google Clicks → stg_google_clicks

**Ошибка была**: column "click_timestamp" does not exist

**Причина**: В `raw.google_ads_clicks` НЕТ колонок `click_timestamp`, `page_url` - это минимальная таблица (только date, gclid, campaign_id, ad_group_id)

**Решение**: Используем только те колонки, которые есть

```sql
INSERT INTO dashboards.stg_google_clicks (
  gclid, click_timestamp,
  page_url, page_path, page_title,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content,
  extracted_campaign_id, extracted_ad_id
)
SELECT DISTINCT
  gclid,
  date::TIMESTAMP as click_timestamp,
  NULL as page_url,
  NULL as page_path,
  NULL as page_title,
  NULL as utm_source,
  NULL as utm_medium,
  NULL as utm_campaign,
  NULL as utm_term,
  NULL as utm_content,
  campaign_id::TEXT as extracted_campaign_id,
  ad_group_id::TEXT as extracted_ad_id

FROM raw.google_ads_clicks

WHERE date >= CURRENT_DATE - INTERVAL '90 days'
  AND gclid IS NOT NULL
  AND gclid != ''
  AND load_timestamp > COALESCE(
    (SELECT MAX(load_timestamp) FROM dashboards.stg_google_clicks),
    '1970-01-01'::TIMESTAMP
  )

ON CONFLICT (gclid, click_timestamp) DO NOTHING;
```

---

## 🔧 Node 5: РАБОТАЕТ - Upsert dim_campaign

**Без изменений** - эта нода работала корректно

```sql
INSERT INTO dashboards.dim_campaign (
  platform, campaign_id, campaign_name, campaign_status,
  campaign_objective, campaign_type, last_seen_at
)
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

SELECT DISTINCT
  'google' as platform,
  campaign_id,
  campaign_name,
  campaign_status,
  NULL as campaign_objective,
  NULL as campaign_type,
  NOW() as last_seen_at
FROM dashboards.stg_google_ads_daily
WHERE campaign_id IS NOT NULL

ON CONFLICT (platform, campaign_id) DO UPDATE SET
  campaign_name = COALESCE(EXCLUDED.campaign_name, dim_campaign.campaign_name),
  campaign_status = COALESCE(EXCLUDED.campaign_status, dim_campaign.campaign_status),
  campaign_objective = COALESCE(EXCLUDED.campaign_objective, dim_campaign.campaign_objective),
  last_seen_at = NOW(),
  is_active = TRUE;
```

---

## 🔧 Node 6: РАБОТАЕТ - Upsert dim_ad

**Без изменений** - эта нода работала корректно

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
  last_seen_at = NOW(),
  is_active = TRUE;
```

---

## 🔧 Node 7: ИСПРАВЛЕНО - Upsert dim_creative

**Ошибка была**: Syntax error at line 37 near "adset_name" - N8N скопировал лишний текст из Node 6

**Исправление**: Чистый SQL без лишних частей

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

---

## 🔧 Node 8: РАБОТАЕТ - Upsert dim_lead

**Без изменений** - эта нода работала корректно

```sql
INSERT INTO dashboards.dim_lead (
  phone, email,
  first_request_at, last_request_at,
  first_utm_source, first_utm_medium, first_utm_campaign, first_platform,
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
  (array_agg(
    CASE
      WHEN code_variant = 'facebook_lead' THEN 'facebook'
      WHEN code_variant = 'google_analytics' THEN 'google'
      WHEN utm_source IN ('fb', 'facebook', 'Instagram_Reels') THEN 'facebook'
      WHEN utm_source IN ('google', 'google_ads') THEN 'google'
      ELSE 'other'
    END
    ORDER BY request_created_at
  ))[1] as first_platform,
  COUNT(*) as total_requests
FROM dashboards.stg_crm_requests
WHERE phone IS NOT NULL OR email IS NOT NULL
GROUP BY phone, email

ON CONFLICT (phone, email) DO UPDATE SET
  last_request_at = GREATEST(dim_lead.last_request_at, EXCLUDED.last_request_at),
  total_requests = dim_lead.total_requests + EXCLUDED.total_requests,
  updated_at = NOW();
```

---

## 🔧 Node 9: ИСПРАВЛЕНО - Insert fact_lead_request

**Ошибка была**: constraint "idx_fact_lead_req_unique" does not exist

**Причина**: Constraint name is INDEX name, not UNIQUE constraint

**Исправление**: Использую список колонок вместо constraint name

```sql
INSERT INTO dashboards.fact_lead_request (
  sk_lead, sk_campaign, sk_ad,
  request_created_at, analytic_id, internet_request_id,
  fb_lead_id, fclid, gclid, ga_client_id,
  utm_source, utm_medium, utm_campaign, utm_term,
  has_phone, has_email, has_fb_attribution, has_google_attribution,
  attribution_method, attribution_confidence,
  code_variant, source_crm_id
)
SELECT
  dl.sk_lead,
  COALESCE(
    da_fb_lead.sk_campaign,
    da_utm_term.sk_campaign,
    da_gclid.sk_campaign
  ) as sk_campaign,
  COALESCE(
    da_fb_lead.sk_ad,
    da_utm_term.sk_ad,
    da_gclid.sk_ad
  ) as sk_ad,

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

  CASE
    WHEN da_fb_lead.sk_ad IS NOT NULL THEN 'fb_lead_id'
    WHEN da_utm_term.sk_ad IS NOT NULL THEN 'utm_term_ad_id'
    WHEN da_gclid.sk_ad IS NOT NULL THEN 'gclid'
    WHEN scr.fclid IS NOT NULL THEN 'fclid'
    WHEN scr.utm_campaign IS NOT NULL THEN 'utm_campaign'
    ELSE 'unknown'
  END as attribution_method,

  CASE
    WHEN da_fb_lead.sk_ad IS NOT NULL THEN 1.00
    WHEN da_utm_term.sk_ad IS NOT NULL THEN 0.95
    WHEN da_gclid.sk_ad IS NOT NULL THEN 0.90
    WHEN scr.fclid IS NOT NULL THEN 0.85
    WHEN scr.utm_campaign IS NOT NULL THEN 0.70
    ELSE 0.00
  END as attribution_confidence,

  scr.code_variant,
  scr.source_id as source_crm_id

FROM dashboards.stg_crm_requests scr

LEFT JOIN dashboards.dim_lead dl ON (
  dl.phone = scr.phone
  AND dl.email = scr.email
)

LEFT JOIN raw.fb_leads fbl ON fbl.fb_lead_id = scr.fb_lead_id
LEFT JOIN dashboards.dim_ad da_fb_lead ON (
  da_fb_lead.platform = 'facebook'
  AND da_fb_lead.ad_id = fbl.ad_id
)

LEFT JOIN dashboards.dim_ad da_utm_term ON (
  da_utm_term.platform = 'facebook'
  AND da_utm_term.ad_id = scr.extracted_ad_id
)

LEFT JOIN dashboards.stg_google_clicks sgc ON sgc.gclid = scr.gclid
LEFT JOIN dashboards.dim_ad da_gclid ON (
  da_gclid.platform = 'google'
  AND da_gclid.ad_id = sgc.extracted_ad_id
)

WHERE scr.load_timestamp > COALESCE(
  (SELECT MAX(load_timestamp) FROM dashboards.fact_lead_request),
  '1970-01-01'::TIMESTAMP
)

ON CONFLICT (source_crm_id, COALESCE(analytic_id, 0), COALESCE(internet_request_id, 0))
DO UPDATE SET
  sk_lead = EXCLUDED.sk_lead,
  sk_campaign = COALESCE(EXCLUDED.sk_campaign, fact_lead_request.sk_campaign),
  sk_ad = COALESCE(EXCLUDED.sk_ad, fact_lead_request.sk_ad),
  attribution_method = COALESCE(EXCLUDED.attribution_method, fact_lead_request.attribution_method),
  attribution_confidence = COALESCE(EXCLUDED.attribution_confidence, fact_lead_request.attribution_confidence),
  load_timestamp = NOW();
```

---

## 🔧 Node 10: ИСПРАВЛЕНО - Insert fact_ad_performance

**Ошибка была**: constraint "idx_fact_ad_perf_unique" does not exist

**Исправление**: Использую список колонок вместо constraint name

```sql
INSERT INTO dashboards.fact_ad_performance (
  date_day, sk_campaign, sk_ad, sk_creative,
  platform, impressions, clicks, spend, reach, conversions,
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
  0 as conversions,

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

WHERE sfad.load_timestamp > COALESCE(
  (SELECT MAX(load_timestamp) FROM dashboards.fact_ad_performance WHERE platform = 'facebook'),
  '1970-01-01'::TIMESTAMP
)

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
  sgad.conversions,

  sgad.ctr,
  sgad.cpc,
  sgad.cpm

FROM dashboards.stg_google_ads_daily sgad

LEFT JOIN dashboards.dim_campaign dc ON (
  dc.platform = 'google' AND dc.campaign_id = sgad.campaign_id
)

WHERE sgad.load_timestamp > COALESCE(
  (SELECT MAX(load_timestamp) FROM dashboards.fact_ad_performance WHERE platform = 'google'),
  '1970-01-01'::TIMESTAMP
)

ON CONFLICT (date_day, COALESCE(sk_ad, 0), platform)
DO UPDATE SET
  impressions = EXCLUDED.impressions,
  clicks = EXCLUDED.clicks,
  spend = EXCLUDED.spend,
  reach = EXCLUDED.reach,
  conversions = EXCLUDED.conversions,
  ctr = EXCLUDED.ctr,
  cpc = EXCLUDED.cpc,
  cpm = EXCLUDED.cpm,
  load_timestamp = NOW();
```

---

## ✅ Все исправления внесены

**Список всех ошибок и их исправлений**:
1. ✅ Node 1: Убран лишний текст ("MIN")
2. ✅ Node 2: Убраны несуществующие колонки (reach, frequency)
3. ✅ Node 3: Исправлено имя колонки (conversion_value → conversions_value)
4. ✅ Node 4: Адаптирован под минимальную структуру google_ads_clicks
5. ✅ Node 5-6,8: Работали корректно
6. ✅ Node 7: Убран лишний текст ("adset_name")
7. ✅ Node 9-10: Исправлен ON CONFLICT (использование списка колонок вместо constraint name)

**Теперь все готово к использованию!**
