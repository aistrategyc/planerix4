-- ============================================================================
-- ИСПРАВЛЕНИЕ ETL: crm_requests - ЗАГРУЗКА ВСЕХ 381 GCLID
-- Date: October 19, 2025, 22:45
-- ПРОБЛЕМЫ: 1) Нет backfill, 2) Потеря при агрегации, 3) Missing request_id
-- ============================================================================

-- ПРОБЛЕМА №1 из workflow:
-- last_code CTE использует:
--   ORDER BY r.id_source, a.analytic_id DESC
-- Это берёт ПОСЛЕДНЕЕ событие (самое свежее analytic_id)!
-- НО нужно ПРИОРИТИЗИРОВАТЬ событие с gclid!

-- ИСПРАВЛЕННАЯ ВЕРСИЯ ETL:

BEGIN;

/* База источников */
WITH ns AS (
  SELECT
    s.id_source::text        AS id_source,
    s.type::int              AS source_type,
    s.date_time              AS source_date_time,
    s.updated_at             AS source_updated_at,
    s.id_user::bigint        AS manager_id,
    s.id_uniq::bigint        AS id_uniq
  FROM raw.itcrm_new_source s
),

/* уникальные связи source↔request */
rr AS (
  SELECT
    irr.id_source::text AS id_source,
    irr.id_request::int AS id_request
  FROM raw.itcrm_internet_request_relation irr
  GROUP BY irr.id_source, irr.id_request
),

/* агрегируем по source */
rel AS (
  SELECT
    id_source,
    ARRAY_AGG(id_request ORDER BY id_request)::int[] AS request_ids,
    MIN(id_request)                                  AS primary_request_id
  FROM rr
  GROUP BY id_source
),

/* все codes по всем IR конкретного source */
all_codes AS (
  SELECT
    r.id_source,
    JSONB_AGG(
      CASE
        WHEN a.code IS NOT NULL AND jsonb_typeof(a.code) IN ('object','array')
        THEN a.code
        ELSE NULL
      END
      ORDER BY a.analytic_id
    ) AS codes
  FROM rr r
  JOIN raw.itcrm_analytics a
    ON a.internet_request_id::int = r.id_request
  GROUP BY r.id_source
),

/* ✅ ИСПРАВЛЕНИЕ: ПРИОРИТИЗАЦИЯ code с gclid/fb_lead_id/utm */
last_code AS (
  SELECT DISTINCT ON (r.id_source)
    r.id_source,
    CASE
      WHEN a.code IS NULL THEN NULL
      WHEN jsonb_typeof(a.code) IN ('object','array','string') THEN a.code
      ELSE NULL
    END AS code
  FROM rel r
  JOIN raw.itcrm_analytics a
    ON a.internet_request_id::int = r.primary_request_id
  WHERE a.code IS NOT NULL
  -- ✅ ПРИОРИТИЗАЦИЯ: Сначала события с tracking данными!
  ORDER BY
    r.id_source,
    -- Приоритет 1: gclid (самый важный!)
    CASE WHEN a.code->>'gclid' IS NOT NULL AND a.code->>'gclid' != '' THEN 1 ELSE 99 END,
    -- Приоритет 2: fb_lead_id
    CASE WHEN a.code->>'fb_lead_id' IS NOT NULL AND a.code->>'fb_lead_id' != '' THEN 2 ELSE 99 END,
    -- Приоритет 3: fbclid
    CASE WHEN a.code->>'fbclid' IS NOT NULL AND a.code->>'fbclid' != '' THEN 3 ELSE 99 END,
    -- Приоритет 4: любой UTM
    CASE WHEN a.code ? 'utm_source' THEN 4 ELSE 99 END,
    -- Если все пустые, берём самое свежее
    a.analytic_id DESC
),

/* менеджер */
mgr AS (
  SELECT u.id_user::bigint AS manager_id, u.login_user AS manager_login
  FROM raw.itcrm_users_ua u
),

/* договор (последний) */
doc_pick AS (
  SELECT DISTINCT ON (dc.id_source)
    dc.id_source::text AS id_source,
    dc.contract_id::bigint AS contract_id,
    COALESCE(dc.total_cost_of_the_contract, dc.sum2)::numeric AS contract_total
  FROM raw.itcrm_docs_clients dc
  ORDER BY dc.id_source, COALESCE(dc.updated_at, dc.created_at) DESC NULLS LAST
)

INSERT INTO dashboards.crm_requests AS tgt (
  id_source, source_type, source_date_time, source_updated_at, id_uniq,
  request_ids, primary_request_id,
  request_created_at, request_type, form_name, email,
  manager_id, manager_login,
  branch_id, branch_name,
  contract_id, contract_total,
  code, codes
)
SELECT
  n.id_source,
  n.source_type,
  n.source_date_time,
  n.source_updated_at,
  n.id_uniq,
  r.request_ids,
  r.primary_request_id,
  NULL::timestamp,
  NULL::text,
  NULL::text,
  NULL::text,
  n.manager_id,
  m.manager_login,
  NULL::bigint AS branch_id,
  'kiev'::text AS branch_name,
  d.contract_id,
  d.contract_total,
  lc.code,
  ac.codes
FROM ns n
LEFT JOIN rel        r  ON r.id_source = n.id_source
LEFT JOIN mgr        m  ON m.manager_id = n.manager_id
LEFT JOIN doc_pick   d  ON d.id_source  = n.id_source
LEFT JOIN last_code  lc ON lc.id_source = n.id_source
LEFT JOIN all_codes  ac ON ac.id_source = n.id_source

ON CONFLICT (id_source) DO UPDATE SET
  source_type         = EXCLUDED.source_type,
  source_date_time    = EXCLUDED.source_date_time,
  source_updated_at   = EXCLUDED.source_updated_at,
  id_uniq             = EXCLUDED.id_uniq,
  request_ids         = EXCLUDED.request_ids,
  primary_request_id  = EXCLUDED.primary_request_id,
  manager_id          = EXCLUDED.manager_id,
  manager_login       = EXCLUDED.manager_login,
  branch_id           = EXCLUDED.branch_id,
  branch_name         = EXCLUDED.branch_name,
  contract_id         = EXCLUDED.contract_id,
  contract_total      = EXCLUDED.contract_total,
  code                = COALESCE(EXCLUDED.code, tgt.code), -- ✅ Не затираем существующий code
  codes               = EXCLUDED.codes,
  row_updated_at      = now();

COMMIT;

-- ============================================================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================================================================

SELECT
  'crm_requests AFTER FIX' as stage,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE code->>'gclid' IS NOT NULL AND code->>'gclid' != '') as with_gclid,
  MIN(source_date_time)::DATE as earliest_date,
  MAX(source_date_time)::DATE as latest_date
FROM dashboards.crm_requests;

-- Ожидаем:
-- with_gclid: должно быть близко к 381 (или больше если есть новые данные)
-- earliest_date: должна быть 2025-06-19 или раньше

-- ============================================================================
-- ПРОБЛЕМА №2: MISSING INTERNET_REQUEST_ID
-- ============================================================================

-- Эта проблема не в текущем workflow!
-- Проблема в том что:
-- 1) itcrm_analytics имеет internet_request_id
-- 2) НО в itcrm_internet_request_relation может НЕ быть связи id_source ↔ id_request

-- Давайте проверим:
SELECT
  'itcrm_analytics records with internet_request_id' as metric,
  COUNT(*) as value
FROM raw.itcrm_analytics
WHERE internet_request_id IS NOT NULL

UNION ALL

SELECT
  'itcrm_analytics with gclid',
  COUNT(*)
FROM raw.itcrm_analytics
WHERE code->>'gclid' IS NOT NULL
  AND code->>'gclid' != ''

UNION ALL

SELECT
  'itcrm_internet_request_relation records',
  COUNT(DISTINCT id_request)
FROM raw.itcrm_internet_request_relation

UNION ALL

SELECT
  'itcrm_analytics records WITH relation',
  COUNT(*)
FROM raw.itcrm_analytics a
WHERE EXISTS (
  SELECT 1 FROM raw.itcrm_internet_request_relation r
  WHERE r.id_request::int = a.internet_request_id::int
)

UNION ALL

SELECT
  'itcrm_analytics with gclid WITH relation',
  COUNT(*)
FROM raw.itcrm_analytics a
WHERE a.code->>'gclid' IS NOT NULL
  AND a.code->>'gclid' != ''
  AND EXISTS (
    SELECT 1 FROM raw.itcrm_internet_request_relation r
    WHERE r.id_request::int = a.internet_request_id::int
  )

UNION ALL

SELECT
  'itcrm_analytics with gclid WITHOUT relation',
  COUNT(*)
FROM raw.itcrm_analytics a
WHERE a.code->>'gclid' IS NOT NULL
  AND a.code->>'gclid' != ''
  AND NOT EXISTS (
    SELECT 1 FROM raw.itcrm_internet_request_relation r
    WHERE r.id_request::int = a.internet_request_id::int
  );

-- ============================================================================
-- ПРОБЛЕМА №3: ДОБАВИТЬ MISSING RECORDS
-- ============================================================================

-- Если есть analytics записи БЕЗ relation, нужно их добавить!
-- Создадим временную relation для них:

INSERT INTO raw.itcrm_internet_request_relation (
  id_source,
  id_request,
  date,
  load_timestamp
)
SELECT DISTINCT
  a.id_source::int,
  a.internet_request_id::int,
  a.request_created_at,
  NOW()
FROM raw.itcrm_analytics a
WHERE a.internet_request_id IS NOT NULL
  AND a.id_source IS NOT NULL
  -- ✅ Только те у кого НЕТ relation
  AND NOT EXISTS (
    SELECT 1 FROM raw.itcrm_internet_request_relation r
    WHERE r.id_source::int = a.id_source::int
      AND r.id_request::int = a.internet_request_id::int
  )
ON CONFLICT (id_source, id_request) DO NOTHING;

-- Проверка:
SELECT
  'Added missing relations' as action,
  COUNT(*) as records_added
FROM raw.itcrm_internet_request_relation
WHERE load_timestamp >= NOW() - INTERVAL '1 minute';
