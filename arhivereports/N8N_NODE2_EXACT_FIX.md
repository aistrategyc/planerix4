# N8N Node 2 - ТОЧНОЕ ИСПРАВЛЕНИЕ

## Какой Node?

**Имя ноды**: `google_utm_fallback`
**Позиция в workflow**: После ноды `dashboards.fact_leads`
**Строка в JSON**: 464-467

## Что Искать в N8N UI?

Откройте ноду с именем **"google_utm_fallback"**

## Что Заменить?

### НАЙДИТЕ ЭТИ СТРОКИ (начало секции UPDATE):

```sql
UPDATE dashboards.fact_leads fl
SET
  utm_source = cml.utm_source,
  utm_medium = cml.utm_medium,
  utm_campaign = cml.utm_campaign,
  utm_content = cml.utm_content,
  utm_term = cml.utm_term,
  gclid = cml.gclid,
  fbclid = cml.fbclid,
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
  row_updated_at = now()
FROM dashboards.crm_marketing_link cml
WHERE fl.id_source = cml.id_source
  AND fl.created_date_txt::date >= CURRENT_DATE - 30;
```

### ЗАМЕНИТЕ НА:

```sql
UPDATE dashboards.fact_leads fl
SET
  utm_source = cml.utm_source,
  utm_medium = cml.utm_medium,
  utm_campaign = cml.utm_campaign,
  utm_content = cml.utm_content,
  utm_term = cml.utm_term,
  gclid = cml.gclid,
  fbclid = cml.fbclid,
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
    WHEN LOWER(cml.utm_source) LIKE '%instagram%' THEN 'meta'
    WHEN LOWER(cml.utm_source) LIKE '%meta%' THEN 'meta'
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
  row_updated_at = now()
FROM dashboards.crm_marketing_link cml
WHERE fl.id_source = cml.id_source
  AND fl.created_date_txt::date >= CURRENT_DATE - 30;
```

## Ключевые Изменения:

1. ✅ Добавлено: `WHEN LOWER(cml.utm_source) LIKE '%instagram%' THEN 'meta'`
2. ✅ Добавлено: `WHEN LOWER(cml.utm_source) LIKE '%meta%' THEN 'meta'`
3. ✅ Добавлено: `WHEN cml.utm_source = 'google' AND cml.utm_medium IN ('cpc', 'ppc') THEN 'google'`
4. ✅ Улучшено: Email detection с `LIKE '%email%'` и `sendpulse`
5. ✅ Добавлено: `WHEN cml.utm_source = 'tgchanel' THEN 'telegram'`
6. ✅ Добавлено: `WHEN cml.utm_source = 'viber' THEN 'viber'`
7. ✅ Изменено: `ELSE 'direct'` вместо `ELSE NULL` (чтобы не терять лиды)

## ВАЖНО:

Это **ПЕРВАЯ** секция в большом SQL запросе ноды. После этой секции идут ещё 5 секций:
- `-- 2. Заполнить Google Campaign ID через gclid`
- `-- 3. Google keyword attribution`
- `-- 4. Google ad attribution`
- `-- 5. Meta attribution from fb_leads`
- `-- 6. Meta creative`

**НЕ ТРОГАЙТЕ** остальные 5 секций! Замените только **CASE** блок в первой секции!

## Как Проверить Правильность?

После обновления ноды, найдите в SQL:
- ✅ Должно быть: `LIKE '%instagram%' THEN 'meta'`
- ✅ Должно быть: `utm_source = 'google' AND cml.utm_medium IN ('cpc', 'ppc') THEN 'google'`
- ✅ Должно быть: `LIKE '%email%' THEN 'email'`
- ✅ Должно быть: `utm_source = 'tgchanel' THEN 'telegram'`
- ✅ Должно быть: `ELSE 'direct'` (НЕ `ELSE NULL`)

## После Сохранения:

1. Сохраните ноду
2. Активируйте workflow
3. Запустите workflow вручную (Execute Workflow)
4. Проверьте что нода выполнилась успешно (зелёная галочка)
5. Проверьте данные в БД:

```sql
-- Проверка: Instagram в Meta?
SELECT
  utm_source,
  dominant_platform,
  COUNT(*) as leads,
  MAX(created_date_txt::date) as latest_date
FROM dashboards.fact_leads
WHERE (LOWER(utm_source) LIKE '%instagram%' OR utm_source = 'ig')
  AND created_date_txt::date >= CURRENT_DATE - 7
GROUP BY utm_source, dominant_platform
ORDER BY latest_date DESC;
```

Ожидаемый результат: ВСЕ Instagram лиды должны иметь `dominant_platform = 'meta'`

---

*Инструкция создана: October 19, 2025*
*Node: google_utm_fallback*
*Критичность: HIGH*
