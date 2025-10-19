# 🚨 КРИТИЧЕСКИЙ ПЛАН ИСПРАВЛЕНИЯ АНАЛИТИКИ - October 19, 2025

## ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### Проблема 1: Неправильная Классификация в fact_leads ❌

**Instagram (META)**:
- 91 лид в fact_leads с utm_source='instagram_*'
- 51 лид классифицирован как `dominant_platform='other'` ❌
- 6 лидов как `dominant_platform='paid_other'` ❌
- Только 5 как `dominant_platform='meta'` ✅
- **ПОТЕРЯНО**: 2 контракта Instagram (₴ неизвестно)

**Google CPC**:
- 61 лид с utm_source='google', medium='cpc'
- Классификация: неизвестна (проверить)
- Должны быть `dominant_platform='google'`

**Email/Telegram/Viber**:
- 44 лида (22 email + 20 telegram + 2 viber)
- Должны иметь свою категорию

### Проблема 2: v8 Views Игнорируют Instagram ❌

Текущая логика в v8_platform_daily_full:
```sql
WHEN fl.fb_lead_id IS NOT NULL
     OR fl.meta_campaign_id IS NOT NULL
     OR fl.fbclid IS NOT NULL
     OR fl.dominant_platform = 'meta'
     OR LOWER(fl.utm_source) LIKE '%facebook%'
     OR LOWER(fl.utm_source) LIKE '%meta%'
     OR fl.utm_source = 'fb' THEN 'Meta'
```

**ОТСУТСТВУЕТ**: `OR LOWER(fl.utm_source) LIKE '%instagram%'`

### Проблема 3: Данные Не Обновляются из RAW ❌

- `raw.itcrm_analytics`: 1,927 лидов (сентябрь-октябрь)
- `fact_leads` coverage: **0%** ❌
- fact_leads заполняется через n8n workflow
- **НЕТ автообновления** из raw

## КОРНЕВАЯ ПРИЧИНА

**fact_leads** - это материализованная таблица, заполняемая n8n workflow.

ETL процесс:
1. Берёт данные из `crm_requests` (не напрямую из raw)
2. Определяет `dominant_platform` на основе limited rules
3. НЕ ВКЛЮЧАЕТ Instagram в Meta
4. НЕ ОБНОВЛЯЕТ старые записи при изменении логики

## РЕШЕНИЕ

### Этап 1: Обновить ETL Logic в n8n Workflow ✅

**Файл**: `n8nflow/` (если есть) или база n8n

**Логика определения dominant_platform**:

```javascript
// Improved platform detection logic for n8n
function detectPlatform(leadData) {
  const utm_source = (leadData.utm_source || '').toLowerCase();
  const utm_medium = (leadData.utm_medium || '').toLowerCase();

  // Google Ads detection
  if (leadData.gclid || leadData.google_campaign_id ||
      (utm_source === 'google' && (utm_medium === 'cpc' || utm_medium === 'ppc'))) {
    return 'google';
  }

  // Meta detection (Facebook + Instagram)
  if (leadData.fbclid || leadData.fb_lead_id || leadData.meta_campaign_id ||
      utm_source.includes('facebook') || utm_source.includes('meta') || utm_source === 'fb' ||
      utm_source.includes('instagram') || utm_source === 'ig') {
    return 'meta';
  }

  // Email
  if (utm_source.includes('email') || utm_source === 'sendpulse' || utm_medium === 'email') {
    return 'email';
  }

  // Telegram
  if (utm_source.includes('telegram') || utm_source === 'tgchanel' || utm_source.includes('tg_')) {
    return 'telegram';
  }

  // Viber
  if (utm_source.includes('viber')) {
    return 'viber';
  }

  // Paid Other (has UTM but not identified)
  if (utm_source && utm_source !== 'direct') {
    return 'paid_other';
  }

  // Direct
  return 'direct';
}
```

### Этап 2: Обновить v8 Views с Instagram Detection ✅

**v8_platform_daily_full**:
```sql
WHEN fl.fb_lead_id IS NOT NULL
     OR fl.meta_campaign_id IS NOT NULL
     OR fl.fbclid IS NOT NULL
     OR fl.dominant_platform = 'meta'
     OR LOWER(fl.utm_source) LIKE '%facebook%'
     OR LOWER(fl.utm_source) LIKE '%meta%'
     OR LOWER(fl.utm_source) LIKE '%instagram%'  -- ✅ ДОБАВИТЬ
     OR fl.utm_source = 'fb'
     OR fl.utm_source = 'ig' THEN 'Meta'  -- ✅ ДОБАВИТЬ
```

**v8_campaigns_daily_full** - аналогично

### Этап 3: ПЕРЕОБОГАТИТЬ fact_leads Исторические Данные ✅

**SQL скрипт для исправления**:

```sql
-- Fix existing Instagram leads in fact_leads
UPDATE dashboards.fact_leads
SET dominant_platform = 'meta'
WHERE (
  LOWER(utm_source) LIKE '%instagram%'
  OR utm_source = 'ig'
)
AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Fix Google CPC leads
UPDATE dashboards.fact_leads
SET dominant_platform = 'google'
WHERE utm_source = 'google'
  AND (utm_medium = 'cpc' OR utm_medium = 'ppc')
  AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Fix Email leads
UPDATE dashboards.fact_leads
SET dominant_platform = 'email'
WHERE (
  LOWER(utm_source) LIKE '%email%'
  OR utm_source = 'sendpulse'
  OR utm_medium = 'email'
)
AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Fix Telegram leads
UPDATE dashboards.fact_leads
SET dominant_platform = 'telegram'
WHERE (
  LOWER(utm_source) LIKE '%telegram%'
  OR utm_source = 'tgchanel'
)
AND dominant_platform IN ('other', 'paid_other', 'direct');

-- Fix Viber leads
UPDATE dashboards.fact_leads
SET dominant_platform = 'viber'
WHERE utm_source = 'viber'
  AND dominant_platform IN ('other', 'paid_other', 'direct');
```

### Этап 4: Добавить Новые Платформы в v8 Views ✅

```sql
CASE
  WHEN ... THEN 'Google Ads'
  WHEN ... THEN 'Meta'  -- включая Instagram
  WHEN fl.dominant_platform = 'email' OR ... THEN 'Email'
  WHEN fl.dominant_platform = 'telegram' OR ... THEN 'Telegram'
  WHEN fl.utm_source IS NOT NULL THEN 'Other Paid'
  ELSE 'Direct'
END AS platform
```

## ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### До исправления:
- Meta: 1,007 leads → 4 contracts (₴131,715)
- Instagram leads classified as 'other': 57 leads

### После исправления:
- Meta (Facebook + Instagram): ~1,100+ leads → 6+ contracts (₴131,715+)
- Google Ads: ~215+ leads (155 + 61 CPC)
- Email: 22 leads (новая категория)
- Telegram: 20 leads (новая категория)
- Viber: 2 leads (новая категория)

### Покрытие контрактов:
- Сейчас: 446 контрактов отслеживаются
- После: 446+ контрактов (может быть больше с правильной атрибуцией)

## ПОРЯДОК ВЫПОЛНЕНИЯ

1. ✅ **Обновить v8 views** - добавить Instagram detection
2. ✅ **Исправить fact_leads** - переклассифицировать исторические данные
3. ⏳ **Обновить n8n workflow** - улучшить логику определения платформ
4. ⏳ **Перезапустить ETL** - обогатить новые лиды
5. ⏳ **Верифицировать** - проверить корректность данных

## SQL СКРИПТ ДЛЯ НЕМЕДЛЕННОГО ИСПРАВЛЕНИЯ

См. `FIX_FACT_LEADS_INSTAGRAM_OCT19.sql`

## ВАЖНО

**НЕ ТРОГАТЬ**:
- crm_requests (источник истины)
- crm_contract_summary (контракты)
- raw.itcrm_analytics (источник RAW)

**ОБНОВИТЬ**:
- fact_leads (переклассифицировать)
- v8 views (добавить Instagram)
- n8n workflow (улучшить logic)

## ПРОВЕРКА ПОСЛЕ ИСПРАВЛЕНИЯ

```sql
-- Test 1: Instagram в Meta?
SELECT
  platform,
  SUM(leads) as leads,
  SUM(contracts) as contracts
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-01'
  AND platform = 'Meta'
GROUP BY platform;
-- Ожидаем: ~1,100+ leads, 6+ contracts

-- Test 2: Новые платформы видны?
SELECT DISTINCT platform
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-01'
ORDER BY platform;
-- Ожидаем: Google Ads, Meta, Email, Telegram, Direct, Other Paid
```

---

*Generated by Claude Code*
*Date: October 19, 2025*
*Critical Fix Required*
