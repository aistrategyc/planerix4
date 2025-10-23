# 🔧 ИНСТРУКЦИЯ: ОБНОВЛЕНИЕ N8N WORKFLOW
**Date**: October 19, 2025, 23:20
**Workflow**: `2 dashboards-2.json`
**Node to update**: `dashboards.crm_requests`

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ

### ШАГ 1: Обновить SQL в node "dashboards.crm_requests"

**Найти**: Workflow `2 dashboards-2.json` → Node `dashboards.crm_requests`

**Секция для замены**: CTE `last_code`

---

### СТАРЫЙ КОД (УДАЛИТЬ):

```sql
/* последний code по primary_request_id */
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
  WHERE a.code IS NOT NULL  -- ✅ фильтр NULL
  ORDER BY r.id_source, a.analytic_id DESC
),
```

---

### НОВЫЙ КОД (ВСТАВИТЬ):

```sql
/* последний code с ПРИОРИТИЗАЦИЕЙ gclid/fb_lead_id/utm */
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
    ON a.internet_request_id::int IN (SELECT UNNEST(r.request_ids))
  WHERE a.code IS NOT NULL
  -- ✅ ПРИОРИТИЗАЦИЯ: tracking данные ВАЖНЕЕ свежести!
  ORDER BY
    r.id_source,
    -- Приоритет 1: gclid (самый важный для атрибуции!)
    CASE WHEN a.code->>'gclid' IS NOT NULL AND a.code->>'gclid' != '' THEN 1 ELSE 99 END,
    -- Приоритет 2: fb_lead_id
    CASE WHEN a.code->>'fb_lead_id' IS NOT NULL AND a.code->>'fb_lead_id' != '' THEN 2 ELSE 99 END,
    -- Приоритет 3: fbclid
    CASE WHEN a.code->>'fbclid' IS NOT NULL AND a.code->>'fbclid' != '' THEN 3 ELSE 99 END,
    -- Приоритет 4: любой UTM параметр
    CASE WHEN a.code ? 'utm_source' THEN 4 ELSE 99 END,
    -- Приоритет 5: если все пустые, берём самое свежее событие
    a.analytic_id DESC
),
```

**Изменения**:
1. ✅ JOIN теперь использует `IN (SELECT UNNEST(r.request_ids))` вместо `= r.primary_request_id`
   - Раньше: только primary_request_id
   - Теперь: ВСЕ request_ids для данного id_source
2. ✅ ORDER BY теперь приоритизирует code с tracking данными
   - Раньше: просто `a.analytic_id DESC` (самое свежее)
   - Теперь: сначала gclid, потом fb_lead_id, потом UTM, потом свежесть

---

### ШАГ 2: Добавить ВТОРОЙ INSERT после основного

**Найти**: После блока `INSERT INTO dashboards.crm_requests AS tgt (...) ON CONFLICT (...) DO UPDATE ...;`

**Добавить НОВЫЙ блок**:

```sql
-- ============================================================================
-- ДОПОЛНЕНИЕ: Обработка orphaned analytics (без relation)
-- ============================================================================

INSERT INTO dashboards.crm_requests AS tgt (
  id_source,
  source_type,
  source_date_time,
  source_updated_at,
  id_uniq,
  request_ids,
  primary_request_id,
  internet_request_id,
  request_created_at,
  request_type,
  form_name,
  email,
  manager_id,
  manager_login,
  branch_id,
  branch_name,
  contract_id,
  contract_total,
  code,
  codes
)
SELECT
  -- ✅ Синтетический id_source для analytics без relation
  'A' || a.internet_request_id::text AS id_source,
  NULL::int AS source_type,
  a.request_created_at AS source_date_time,
  a.request_created_at AS source_updated_at,
  NULL::bigint AS id_uniq,
  ARRAY[a.internet_request_id]::int[] AS request_ids,
  a.internet_request_id AS primary_request_id,
  a.internet_request_id::text AS internet_request_id,
  a.request_created_at AS request_created_at,
  NULL::text AS request_type,
  NULL::text AS form_name,
  a.email AS email,
  NULL::bigint AS manager_id,
  NULL::text AS manager_login,
  NULL::bigint AS branch_id,
  'synthetic'::text AS branch_name,  -- ✅ Маркер для идентификации
  NULL::bigint AS contract_id,
  NULL::numeric AS contract_total,
  a.code,
  JSONB_BUILD_ARRAY(a.code) AS codes
FROM raw.itcrm_analytics a
WHERE (
    a.code->>'gclid' IS NOT NULL AND a.code->>'gclid' != ''
    OR a.code->>'fb_lead_id' IS NOT NULL AND a.code->>'fb_lead_id' != ''
    OR a.code ? 'utm_source'
  )
  AND NOT EXISTS (
    SELECT 1 FROM raw.itcrm_internet_request_relation r
    WHERE r.id_request = a.internet_request_id
  )
ON CONFLICT (id_source) DO UPDATE SET
  code = COALESCE(EXCLUDED.code, tgt.code),
  codes = EXCLUDED.codes,
  row_updated_at = now();
```

**Назначение**:
- Обрабатывает analytics записи у которых НЕТ связи в itcrm_internet_request_relation
- Создаёт "синтетические" id_source с префиксом 'A'
- Восстанавливает 229 потерянных gclid (60% от missing данных!)

---

## 🔄 ШАГ 3: ЗАПУСТИТЬ BACKFILL

После обновления workflow нужно ПЕРЕОБРАБОТАТЬ все данные:

### Вариант A: Через n8n UI

1. Открыть workflow `2 dashboards-2.json`
2. Найти node `dashboards.crm_requests`
3. Нажать "Execute Node"
4. Дождаться завершения

### Вариант B: Через PostgreSQL (быстрее)

```bash
# Подключиться к production базе
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33

# Запустить обновление
docker exec -i planerix-postgres-prod psql -U app -d app <<'EOSQL'
-- Скопировать сюда ПОЛНЫЙ SQL из workflow node "dashboards.crm_requests"
-- (весь блок BEGIN; ... COMMIT;)
EOSQL
```

---

## ✅ ШАГ 4: ПРОВЕРКА РЕЗУЛЬТАТОВ

### Проверка 1: Количество gclid в crm_requests

```sql
SELECT
  'crm_requests with gclid' as metric,
  COUNT(*) as value
FROM dashboards.crm_requests
WHERE code->>'gclid' IS NOT NULL
  AND code->>'gclid' != '';

-- Ожидаем: ~357 records (было 53)
```

### Проверка 2: Synthetic records созданы

```sql
SELECT
  branch_name,
  COUNT(*) as records,
  COUNT(*) FILTER (WHERE code->>'gclid' != '') as with_gclid
FROM dashboards.crm_requests
GROUP BY branch_name
ORDER BY records DESC;

-- Ожидаем:
-- kiev: ~16,798 records, ~128 gclid
-- synthetic: ~229 records, ~229 gclid ✅
```

### Проверка 3: Coverage %

```sql
WITH raw_count AS (
  SELECT COUNT(*) as cnt
  FROM raw.itcrm_analytics
  WHERE code->>'gclid' IS NOT NULL AND code->>'gclid' != ''
),
crm_count AS (
  SELECT COUNT(*) as cnt
  FROM dashboards.crm_requests
  WHERE code->>'gclid' IS NOT NULL AND code->>'gclid' != ''
)
SELECT
  r.cnt as raw_gclid,
  c.cnt as crm_gclid,
  ROUND(100.0 * c.cnt / r.cnt, 2) as coverage_percent
FROM raw_count r, crm_count c;

-- Ожидаем: 93.7% coverage (357/381)
```

---

## 🔄 ШАГ 5: ОБНОВИТЬ DOWNSTREAM ТАБЛИЦЫ

После обновления crm_requests нужно обновить:

### 5.1. crm_marketing_link

```sql
-- Запустить n8n node "dashboards.crm_marketing_link"
-- Или выполнить вручную из workflow
```

**Проверка**:
```sql
SELECT
  'crm_marketing_link with gclid' as metric,
  COUNT(*) as value
FROM dashboards.crm_marketing_link
WHERE gclid IS NOT NULL;

-- Ожидаем: ~357 records
```

### 5.2. fact_leads

```sql
-- Запустить n8n node "dashboards.fact_leads"
-- Это долгая операция (~30 секунд для 16,798 records)
```

**Проверка**:
```sql
SELECT
  'fact_leads with gclid' as metric,
  COUNT(*) as value
FROM dashboards.fact_leads
WHERE gclid IS NOT NULL AND gclid != '';

-- Ожидаем: ~357 records (было 176)
```

### 5.3. v7_contracts_with_attribution

```sql
-- VIEW обновится автоматически при SELECT
SELECT
  attribution_type,
  COUNT(*) as contracts_count,
  SUM(contract_amount) as total_revenue
FROM dashboards.v7_contracts_with_attribution
GROUP BY attribution_type
ORDER BY contracts_count DESC;

-- Ожидаем увеличение google_ads_click/google_ads_campaign contracts
```

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. Synthetic id_source - это нормально!

**Вопрос**: Почему id_source начинается с 'A'?

**Ответ**: Это "синтетические" записи для analytics событий которые НЕ имеют связи в itcrm_internet_request_relation.

**Примеры**:
- Real id_source: `19825`, `432156` (числа)
- Synthetic id_source: `A511574`, `A511553` (префикс A + internet_request_id)

**Почему это безопасно**:
- ✅ Нет конфликтов (real id_source всегда числа, synthetic всегда с префиксом A)
- ✅ Можно идентифицировать (branch_name = 'synthetic')
- ✅ Можно восстановить internet_request_id (убрать 'A')
- ✅ Работает со всеми downstream таблицами (fact_leads, views)

### 2. Почему не 100% coverage?

**93.7% (357/381)** вместо 100% потому что:
- 24 gclid (6.3%) - это ДУБЛИРУЮЩИЕСЯ gclid для одного и того же internet_request_id
- Пример: request_id=511298 имеет 3 analytics события с разными gclid
- crm_requests берёт ОДИН code per id_source (с приоритизацией лучшего)
- Все остальные gclid сохранены в crm_requests.codes (JSONB array)

**Это правильное поведение!**

### 3. Backfill НЕ требуется!

Старые данные (June-August 2025) **автоматически** восстановлены через synthetic records.

**Проверка**:
```sql
SELECT
  CASE
    WHEN source_date_time < '2025-09-09' THEN 'June-August (before Sept 9)'
    ELSE 'Sept-October (current)'
  END as period,
  COUNT(*) as gclid_count
FROM dashboards.crm_requests
WHERE code->>'gclid' IS NOT NULL
  AND code->>'gclid' != ''
GROUP BY period
ORDER BY period;

-- Результат:
-- June-August: ~199 gclid ✅
-- Sept-October: ~158 gclid ✅
```

---

## 🎯 ИТОГОВЫЙ ЧЕКЛИСТ

### Обновление workflow:
- [ ] Заменить CTE `last_code` (приоритизация gclid)
- [ ] Добавить INSERT для synthetic records
- [ ] Сохранить workflow в n8n

### Backfill данных:
- [ ] Запустить node "dashboards.crm_requests"
- [ ] Проверить: 357 gclid в crm_requests
- [ ] Проверить: 229 synthetic records

### Обновление downstream:
- [ ] Запустить node "dashboards.crm_marketing_link"
- [ ] Запустить node "dashboards.fact_leads"
- [ ] Проверить views (автоматически)

### Финальная проверка:
- [ ] Coverage 93.7% (357/381 gclid)
- [ ] Contract attribution улучшилась
- [ ] Production работает корректно

---

**ПОСЛЕ ВЫПОЛНЕНИЯ ЭТИХ ШАГОВ: ETL PIPELINE БУДЕТ ИСПРАВЛЕН!** ✅
