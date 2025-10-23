# N8N Workflow Fix Instructions - October 19, 2025

## КРИТИЧЕСКАЯ ПРОБЛЕМА

n8n workflow "2 dashboards" содержит НЕПОЛНУЮ логику определения `dominant_platform` в таблице `fact_leads`.

**Результат**:
- Instagram лиды классифицируются как 'other' вместо 'meta'
- Google CPC лиды теряются
- Email, Telegram, Viber не имеют своих категорий
- Контракты теряются из-за неправильной атрибуции

## NODES КОТОРЫЕ НУЖНО ОБНОВИТЬ

### Node 1: "lead_marketing_enriched"
**ID**: `95d95764-025e-4dd1-88eb-a59ea83f3d69`
**Название в n8n**: `lead_marketing_enriched`
**Файл**: `/Users/Kirill/planerix_new/n8nflow/2 dashboards-3.json`

**Текущий код**: Устанавливает `dominant_platform = NULL`

**НОВЫЙ КОД**:
```sql
BEGIN;

INSERT INTO dashboards.lead_marketing_enriched AS tgt (
  id_source,
  internet_request_id,
  request_type,
  form_name,
  created_date_txt,
  dominant_platform
)
SELECT DISTINCT
  cr.id_source,
  cr.internet_request_id,
  cr.request_type,
  cr.form_name,
  COALESCE(cr.request_created_at, cr.source_date_time)::text AS created_date_txt,

  -- ✅ ИСПРАВЛЕНО: Правильная классификация платформ
  CASE
    -- Google Ads (includes Google CPC)
    WHEN cr.code->>'gclid' IS NOT NULL AND cr.code->>'gclid' != ''
      THEN 'google'
    WHEN cr.code->>'utm_source' = 'google'
         AND cr.code->>'utm_medium' IN ('cpc', 'ppc')
      THEN 'google'
    WHEN LOWER(cr.code->>'utm_source') LIKE '%google%'
      THEN 'google'

    -- Meta (Facebook + Instagram)
    WHEN cr.code->>'fbclid' IS NOT NULL AND cr.code->>'fbclid' != ''
      THEN 'meta'
    WHEN cr.code->>'fb_lead_id' IS NOT NULL AND cr.code->>'fb_lead_id' != ''
      THEN 'meta'
    WHEN LOWER(cr.code->>'utm_source') LIKE '%facebook%'
      THEN 'meta'
    WHEN LOWER(cr.code->>'utm_source') LIKE '%instagram%'
      THEN 'meta'
    WHEN cr.code->>'utm_source' IN ('fb', 'ig', 'meta')
      THEN 'meta'

    -- Email
    WHEN LOWER(cr.code->>'utm_source') LIKE '%email%'
      THEN 'email'
    WHEN cr.code->>'utm_source' = 'sendpulse'
      THEN 'email'
    WHEN cr.code->>'utm_medium' = 'email'
      THEN 'email'

    -- Telegram
    WHEN LOWER(cr.code->>'utm_source') LIKE '%telegram%'
      THEN 'telegram'
    WHEN cr.code->>'utm_source' LIKE 'tg_%'
      THEN 'telegram'
    WHEN cr.code->>'utm_source' = 'tgchanel'
      THEN 'telegram'

    -- Viber
    WHEN cr.code->>'utm_source' = 'viber'
      THEN 'viber'

    -- Paid Other (has UTM but not identified)
    WHEN cr.code->>'utm_source' IS NOT NULL
         AND cr.code->>'utm_source' != ''
      THEN 'paid_other'

    -- Direct (no UTM at all)
    ELSE 'direct'
  END AS dominant_platform

FROM dashboards.crm_requests cr
WHERE cr.id_source IS NOT NULL
  AND COALESCE(cr.request_created_at, cr.source_date_time) >= CURRENT_DATE - 30
ON CONFLICT (id_source) DO UPDATE SET
  internet_request_id = COALESCE(EXCLUDED.internet_request_id, tgt.internet_request_id),
  request_type        = COALESCE(EXCLUDED.request_type, tgt.request_type),
  form_name           = COALESCE(EXCLUDED.form_name, tgt.form_name),
  created_date_txt    = COALESCE(EXCLUDED.created_date_txt, tgt.created_date_txt),
  dominant_platform   = COALESCE(EXCLUDED.dominant_platform, tgt.dominant_platform),
  row_updated_at      = now();

SELECT
  'lead_marketing_enriched' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN created_date_txt::date >= CURRENT_DATE - 7 THEN 1 END) as last_7_days,
  MAX(created_date_txt::date) as latest_date
FROM dashboards.lead_marketing_enriched;

COMMIT;
```

---

### Node 2: "Полностью обновить fact_leads (UTM + ключи + креативы)"
**Текущая позиция в workflow**: После `dashboards.fact_leads`
**Файл**: `/Users/Kirill/planerix_new/n8nflow/2 dashboards-3.json`

**Секция которую нужно изменить** (начало запроса, строки 488-510):

**ТЕКУЩИЙ КОД (НЕПРАВИЛЬНЫЙ)**:
```sql
  dominant_platform = CASE
    WHEN cml.gclid IS NOT NULL OR LOWER(cml.utm_source) LIKE '%google%' THEN 'google'
    WHEN cml.fbclid IS NOT NULL OR LOWER(cml.utm_source) IN ('facebook', 'instagram', 'fb', 'ig', 'meta') THEN 'meta'
    WHEN LOWER(cml.utm_source) LIKE '%telegram%' THEN 'telegram'
    WHEN LOWER(cml.utm_source) LIKE '%youtube%' THEN 'youtube'
    WHEN LOWER(cml.utm_source) LIKE '%tiktok%' THEN 'tiktok'
    WHEN LOWER(cml.utm_source) IN ('email', 'mail') THEN 'email'
    WHEN LOWER(cml.utm_source) IN ('direct', '(direct)', '(none)') OR cml.utm_source IS NULL THEN 'direct'
    WHEN LOWER(cml.utm_medium) = 'organic' THEN 'organic'
    WHEN LOWER(cml.utm_medium) IN ('referral', 'refer') THEN 'referral'
    WHEN LOWER(cml.utm_medium) IN ('cpc', 'ppc', 'paid') THEN 'paid_other'
    WHEN cml.utm_source IS NOT NULL AND cml.utm_source <> '' THEN 'other'
    ELSE NULL
  END,
```

**НОВЫЙ КОД (ПРАВИЛЬНЫЙ)**:
```sql
  dominant_platform = CASE
    -- Google Ads (includes Google CPC)
    WHEN cml.gclid IS NOT NULL AND cml.gclid != '' THEN 'google'
    WHEN fl.google_campaign_id IS NOT NULL THEN 'google'
    WHEN cml.utm_source = 'google' AND cml.utm_medium IN ('cpc', 'ppc') THEN 'google'
    WHEN LOWER(cml.utm_source) LIKE '%google%' THEN 'google'

    -- Meta (Facebook + Instagram)
    WHEN cml.fbclid IS NOT NULL AND cml.fbclid != '' THEN 'meta'
    WHEN fl.fb_lead_id IS NOT NULL AND fl.fb_lead_id != '' THEN 'meta'
    WHEN fl.meta_campaign_id IS NOT NULL THEN 'meta'
    WHEN LOWER(cml.utm_source) LIKE '%facebook%' THEN 'meta'
    WHEN LOWER(cml.utm_source) LIKE '%instagram%' THEN 'meta'  -- ✅ ДОБАВЛЕНО
    WHEN LOWER(cml.utm_source) LIKE '%meta%' THEN 'meta'        -- ✅ ДОБАВЛЕНО
    WHEN cml.utm_source IN ('facebook', 'fb', 'ig', 'meta') THEN 'meta'

    -- Email
    WHEN LOWER(cml.utm_source) LIKE '%email%' THEN 'email'
    WHEN cml.utm_source IN ('email', 'mail', 'sendpulse') THEN 'email'
    WHEN cml.utm_medium = 'email' THEN 'email'

    -- Telegram
    WHEN LOWER(cml.utm_source) LIKE '%telegram%' THEN 'telegram'
    WHEN cml.utm_source LIKE 'tg_%' THEN 'telegram'
    WHEN cml.utm_source = 'tgchanel' THEN 'telegram'

    -- Viber
    WHEN cml.utm_source = 'viber' THEN 'viber'

    -- YouTube
    WHEN LOWER(cml.utm_source) LIKE '%youtube%' THEN 'youtube'

    -- TikTok
    WHEN LOWER(cml.utm_source) LIKE '%tiktok%' THEN 'tiktok'

    -- Direct
    WHEN LOWER(cml.utm_source) IN ('direct', '(direct)', '(none)') OR cml.utm_source IS NULL THEN 'direct'

    -- Organic
    WHEN LOWER(cml.utm_medium) = 'organic' THEN 'organic'

    -- Referral
    WHEN LOWER(cml.utm_medium) IN ('referral', 'refer') THEN 'referral'

    -- Paid Other (has UTM but not identified)
    WHEN LOWER(cml.utm_medium) IN ('cpc', 'ppc', 'paid') THEN 'paid_other'
    WHEN cml.utm_source IS NOT NULL AND cml.utm_source <> '' THEN 'paid_other'

    ELSE 'direct'
  END,
```

---

### Node 3: "dashboards.fact_leads(additional platform)"
**ID**: `0daebffb-a531-4395-99d0-7c5a7b5fbe2a`
**Название в n8n**: `dashboards.fact_leads(additional platform)`

**Секция которую нужно изменить** (CTE `plat`, строки 152-172):

**ТЕКУЩИЙ КОД (НЕПРАВИЛЬНЫЙ)**:
```sql
plat AS (
  SELECT
    fl.id_source,
    COALESCE(
      NULLIF(fl.dominant_platform, ''),
      CASE
        WHEN fl.google_campaign_id IS NOT NULL OR NULLIF(fl.gclid,'') IS NOT NULL THEN 'google'
        WHEN fl.meta_campaign_id   IS NOT NULL OR NULLIF(fl.fbclid,'') IS NOT NULL THEN 'meta'
        WHEN cml.utm_source ILIKE 'google%' OR cml.utm_source ILIKE '%adwords%' OR cml.utm_source ILIKE '%gads%' THEN 'google'
        WHEN cml.utm_source ILIKE 'facebook%' OR cml.utm_source ILIKE 'instagram%' OR cml.utm_source ILIKE 'meta%' OR cml.utm_source ILIKE 'fb%' OR cml.utm_source ILIKE 'ig%' THEN 'meta'
        WHEN lower(cml.utm_source) IN ('email','e-mail','mail','mailchimp','sendpulse') THEN 'email'
        WHEN lower(cml.utm_source) IN ('direct','(direct)','none') THEN 'direct'
        WHEN (lower(cml.utm_medium) IN ('cpc','ppc') AND cml.utm_source ILIKE '%google%') THEN 'google'
        WHEN (lower(cml.utm_medium) IN ('cpc','ppc') AND (cml.utm_source ILIKE '%facebook%' OR cml.utm_source ILIKE '%instagram%' OR cml.utm_source ILIKE '%meta%')) THEN 'meta'
        ELSE NULL
      END
    ) AS unified_platform
  FROM dashboards.fact_leads fl
  LEFT JOIN dashboards.crm_marketing_link cml ON cml.id_source = fl.id_source
),
```

**НОВЫЙ КОД (ПРАВИЛЬНЫЙ)**:
```sql
plat AS (
  SELECT
    fl.id_source,
    COALESCE(
      NULLIF(fl.dominant_platform, ''),
      CASE
        -- Google Ads (includes Google CPC)
        WHEN fl.google_campaign_id IS NOT NULL OR NULLIF(fl.gclid,'') IS NOT NULL THEN 'google'
        WHEN cml.utm_source = 'google' AND cml.utm_medium IN ('cpc','ppc') THEN 'google'
        WHEN cml.utm_source ILIKE 'google%' OR cml.utm_source ILIKE '%adwords%' OR cml.utm_source ILIKE '%gads%' THEN 'google'

        -- Meta (Facebook + Instagram)
        WHEN fl.meta_campaign_id IS NOT NULL OR NULLIF(fl.fbclid,'') IS NOT NULL THEN 'meta'
        WHEN fl.fb_lead_id IS NOT NULL AND fl.fb_lead_id != '' THEN 'meta'
        WHEN cml.utm_source ILIKE '%facebook%' OR cml.utm_source ILIKE '%instagram%' OR cml.utm_source ILIKE '%meta%' THEN 'meta'
        WHEN cml.utm_source IN ('fb','ig','meta') THEN 'meta'
        WHEN (lower(cml.utm_medium) IN ('cpc','ppc') AND (cml.utm_source ILIKE '%facebook%' OR cml.utm_source ILIKE '%instagram%' OR cml.utm_source ILIKE '%meta%')) THEN 'meta'

        -- Email
        WHEN lower(cml.utm_source) IN ('email','e-mail','mail','mailchimp','sendpulse') THEN 'email'
        WHEN cml.utm_medium = 'email' THEN 'email'

        -- Telegram
        WHEN cml.utm_source ILIKE '%telegram%' OR cml.utm_source = 'tgchanel' OR cml.utm_source LIKE 'tg_%' THEN 'telegram'

        -- Viber
        WHEN cml.utm_source = 'viber' THEN 'viber'

        -- Direct
        WHEN lower(cml.utm_source) IN ('direct','(direct)','none') OR cml.utm_source IS NULL THEN 'direct'

        -- Paid Other
        WHEN lower(cml.utm_medium) IN ('cpc','ppc','paid') THEN 'paid_other'

        ELSE 'paid_other'
      END
    ) AS unified_platform
  FROM dashboards.fact_leads fl
  LEFT JOIN dashboards.crm_marketing_link cml ON cml.id_source = fl.id_source
),
```

---

## ПОРЯДОК ДЕЙСТВИЙ В N8N

1. **Войти в n8n** (https://n8n.yourdomain.com или локальный инстанс)

2. **Найти workflow "2 dashboards"**

3. **Обновить Node "lead_marketing_enriched"**:
   - Открыть node
   - Заменить весь SQL query на новый код выше
   - Сохранить

4. **Обновить Node "Полностью обновить fact_leads (UTM + ключи + креативы)"**:
   - Открыть node
   - Найти секцию `dominant_platform = CASE`
   - Заменить на новый код выше
   - Сохранить

5. **Обновить Node "dashboards.fact_leads(additional platform)"**:
   - Открыть node
   - Найти CTE `plat AS (`
   - Заменить на новый код выше
   - Сохранить

6. **Activate workflow**:
   - Убедиться что workflow активирован
   - Trigger: Schedule (каждый час в :40 минут)

7. **Ручной запуск для проверки**:
   - Нажать "Execute Workflow" manually
   - Проверить что все nodes выполнились успешно
   - Проверить логи на ошибки

---

## ПРОВЕРКА ПОСЛЕ ОБНОВЛЕНИЯ

После обновления n8n workflow, выполнить следующие проверки:

```sql
-- Проверка 1: Instagram должны быть в Meta
SELECT
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE LOWER(utm_source) LIKE '%instagram%' OR utm_source = 'ig'
GROUP BY dominant_platform;
-- Ожидаем: dominant_platform='meta', leads=71+

-- Проверка 2: Google CPC должны быть в Google
SELECT
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE utm_source = 'google' AND utm_medium IN ('cpc','ppc')
GROUP BY dominant_platform;
-- Ожидаем: dominant_platform='google', leads=39+

-- Проверка 3: Email категория существует
SELECT
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE dominant_platform = 'email';
-- Ожидаем: leads=34+

-- Проверка 4: Telegram категория существует
SELECT
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE dominant_platform = 'telegram';
-- Ожидаем: leads=16+

-- Проверка 5: Все платформы в v8 views
SELECT DISTINCT platform
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-01'
ORDER BY platform;
-- Ожидаем: Direct, Email, Google Ads, Meta, Other Paid, Telegram, Viber
```

---

## ВАЖНО: BACKUP ПЕРЕД ИЗМЕНЕНИЯМИ

Перед изменением workflow в n8n:

1. **Export текущего workflow**:
   - В n8n UI: Settings → Export
   - Сохранить файл как `2_dashboards_BACKUP_OCT19.json`

2. **Backup таблицы fact_leads** (опционально, но рекомендуется):
   ```sql
   CREATE TABLE dashboards.fact_leads_backup_oct19 AS
   SELECT * FROM dashboards.fact_leads;
   ```

---

## ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправления n8n workflow и следующего запуска:

### Платформы в fact_leads:
- **Google Ads**: ~194 leads (155 + 39 Google CPC)
- **Meta**: ~1,078 leads (1,007 + 71 Instagram)
- **Email**: ~34 leads (новая категория)
- **Telegram**: ~16 leads (новая категория)
- **Viber**: ~3 leads (новая категория)
- **Direct**: ~14,448 leads (уменьшится, так как лиды правильно классифицированы)
- **Other Paid**: ~91 leads (остаток неопознанных UTM)

### Контракты в v8_platform_daily_full (Sept 1 - Oct 19):
- **Direct**: 386 contracts
- **Google Ads**: 15 contracts (может увеличиться)
- **Meta**: 6 contracts (включая Instagram)
- **Email**: 3 contracts
- **Viber**: 2 contracts
- **Other Paid**: 2 contracts
- **Telegram**: 0 contracts

### Важные метрики:
- **Meta conversion rate**: 0.56% (6 contracts / 1,068 leads)
- **Google Ads conversion rate**: 9.68% (15 contracts / 155 leads)
- **Email conversion rate**: 9.68% (3 contracts / 31 leads)

---

## ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ

1. **Мониторинг после изменений**:
   - Проверять логи n8n workflow ежедневно в течение первой недели
   - Убедиться что новые лиды правильно классифицируются

2. **Алерты**:
   - Настроить алерт если workflow падает
   - Настроить алерт если dominant_platform = NULL для лидов с UTM

3. **Документация**:
   - Сохранить этот документ в репозитории
   - Добавить ссылку в README проекта

---

*Дата создания: October 19, 2025*
*Автор: Claude Code*
*Критичность: HIGH - Влияет на точность атрибуции контрактов*
