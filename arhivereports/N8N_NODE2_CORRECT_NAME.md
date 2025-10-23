# N8N Node 2 - ПРАВИЛЬНОЕ ИМЯ И ИСПРАВЛЕНИЕ

## ✅ ПРАВИЛЬНОЕ ИМЯ НОДЫ

**Имя в N8N UI**: `update_fact_leads_attribution`

**НЕ**: ~~google_utm_fallback~~ (это другая нода!)

## Что Заменить?

Откройте ноду **"update_fact_leads_attribution"** в N8N UI.

Найдите SQL запрос который начинается с:
```sql
BEGIN;

-- 1. Обновить UTM и платформу
UPDATE dashboards.fact_leads fl
SET
  utm_source = cml.utm_source,
  ...
  dominant_platform = CASE
```

## СТАРЫЙ КОД (УДАЛИТЬ):

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

## НОВЫЙ КОД (ВСТАВИТЬ):

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
```

## КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ:

1. ✅ **Instagram**: Добавлено `WHEN LOWER(cml.utm_source) LIKE '%instagram%' THEN 'meta'`
2. ✅ **Google CPC**: Добавлено `WHEN cml.utm_source = 'google' AND cml.utm_medium IN ('cpc', 'ppc') THEN 'google'`
3. ✅ **Email улучшено**: Добавлено `LIKE '%email%'` и `'sendpulse'`
4. ✅ **Telegram**: Добавлено `'tgchanel'` и `LIKE 'tg_%'`
5. ✅ **Viber**: Добавлена категория
6. ✅ **Финал**: Изменено `ELSE 'direct'` вместо `ELSE NULL`

## ЧТО НЕ ТРОГАТЬ:

После блока `dominant_platform = CASE ... END,` идут ещё 5 секций:
- `-- 2. Заполнить Google Campaign ID через gclid`
- `-- 3. Google keyword attribution`
- `-- 4. Google ad attribution`
- `-- 5. Meta attribution from fb_leads`
- `-- 6. Meta creative`

**НЕ ИЗМЕНЯЙТЕ** эти 5 секций! Они работают правильно!

## ПРОВЕРКА:

После сохранения, в SQL должно быть:
- ✅ `LIKE '%instagram%' THEN 'meta'`
- ✅ `utm_source = 'google' AND cml.utm_medium IN ('cpc', 'ppc')`
- ✅ `LIKE '%email%'`
- ✅ `utm_source = 'sendpulse'`
- ✅ `ELSE 'direct'` (НЕ NULL!)

## ПОСЛЕ СОХРАНЕНИЯ:

1. Сохраните ноду в N8N
2. Активируйте workflow
3. Запустите вручную (Execute Workflow)
4. Проверьте что нода выполнилась успешно
5. Проверьте БД:

```sql
SELECT
  utm_source,
  dominant_platform,
  COUNT(*) as leads
FROM dashboards.fact_leads
WHERE (LOWER(utm_source) LIKE '%instagram%' OR utm_source = 'ig')
  AND created_date_txt::date >= CURRENT_DATE - 3
GROUP BY utm_source, dominant_platform;
```

**Ожидаемый результат**: ВСЕ новые Instagram лиды должны быть `dominant_platform = 'meta'`

---

*Нода: update_fact_leads_attribution*
*Дата: October 19, 2025*
*Критичность: ВЫСОКАЯ*
