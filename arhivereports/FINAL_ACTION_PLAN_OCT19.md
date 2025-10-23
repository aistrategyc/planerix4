# 🎯 ФИНАЛЬНЫЙ ПЛАН ДЕЙСТВИЙ - October 19, 2025

## ✅ ЧТО УЖЕ СДЕЛАНО:

1. **N8N Workflow обновлён**: `/Users/Kirill/planerix_new/n8nflow/2 dashboards-3.json`
   - ✅ Приоритизация tracking данных (gclid > fb_lead_id > fbclid > utm_source)
   - ✅ Synthetic records для orphaned analytics (229 записей)
   - ✅ Результат: 357 gclid (93.7% coverage)

2. **CRM Requests обновлён**:
   - ✅ 357 gclid из 381 в RAW (93.7%)
   - ✅ 1,002 fb_lead_id (полное покрытие)
   - ✅ 876 synthetic records
   - ✅ Всего: 17,674 requests

3. **Базовые v8 Views созданы**:
   - ✅ `v8_campaigns_daily` (339 rows)
   - ✅ `v8_platform_daily` (177 rows)
   - ✅ `v8_attribution_summary` (7 rows)

---

## ⚠️ ЧТО НУЖНО СДЕЛАТЬ:

### ДЕЙСТВИЕ 1: Обновить fact_leads
**Проблема**: fact_leads ещё не обновлён (251 gclid вместо 357)

**Решение**: Запустить n8n node `dashboards.fact_leads` в workflow `2 dashboards-3.json`

**Проверка**:
```sql
SELECT COUNT(*) FROM dashboards.fact_leads WHERE gclid IS NOT NULL AND gclid != '';
-- Ожидаем: 357 (сейчас 251)
```

---

### ДЕЙСТВИЕ 2: Создать v8 views с ПОЛНЫМИ метриками
**Проблема**: Текущие v8 views НЕ содержат ad performance (spend, clicks, impressions, CPL, ROAS)

**Решение**: Запустить SQL скрипт `/Users/Kirill/planerix_new/UPGRADE_V8_VIEWS.sql`

**Что создаст**:
- `v8_campaigns_daily_full` - кампании с полными метриками (leads, contracts, revenue, impressions, clicks, spend, CPL, ROAS, CTR, conversion_rate)
- `v8_platform_daily_full` - платформы с полными метриками (то же самое)

**Источники данных**:
- `raw.google_ads_campaign_daily` - Google Ads performance (impressions, clicks, spend)
- `raw.fb_ad_insights` + `raw.fb_campaigns` - Facebook performance
- `dashboards.fact_leads` + `dashboards.crm_requests` - leads и contracts

**Команда**:
```bash
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -f /Users/Kirill/planerix_new/UPGRADE_V8_VIEWS.sql
```

**Проверка**:
```sql
-- Должны увидеть метрики spend, clicks, impressions, CPL, ROAS
SELECT * FROM dashboards.v8_campaigns_daily_full WHERE platform = 'Meta' LIMIT 5;
SELECT * FROM dashboards.v8_platform_daily_full WHERE platform = 'Google Ads' LIMIT 5;
```

---

### ДЕЙСТВИЕ 3: Удалить старые v5/v6 views
**Проблема**: 40 старых views путают и занимают место (14 v5 + 18 v6 matviews + 8 v6 views)

**Решение**: Запустить SQL скрипт `/Users/Kirill/planerix_new/DELETE_OLD_VIEWS.sql`

**Что удалит**:
- Все v5_* materialized views (14 объектов)
- Все v6_* materialized views (18 объектов)
- Все v6_* regular views (8 объектов)
- Старые matviews: `contract_source_bridge_mv`, `crm_marketing_link_kvm`
- Старые таблицы: `dim_contract`, `dim_lead`, `fact_contract` и т.д.

**Команда**:
```bash
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -f /Users/Kirill/planerix_new/DELETE_OLD_VIEWS.sql
```

**Проверка**:
```sql
-- Должно быть 0, 0, 0
SELECT
  COUNT(*) FILTER (WHERE matviewname LIKE 'v5_%') AS v5_matviews,
  COUNT(*) FILTER (WHERE matviewname LIKE 'v6_%') AS v6_matviews,
  COUNT(*) FILTER (WHERE viewname LIKE 'v6_%') AS v6_views
FROM pg_matviews
FULL OUTER JOIN pg_views USING (schemaname)
WHERE schemaname = 'dashboards';
```

---

### ДЕЙСТВИЕ 4: Обновить Backend API
**Файл**: `/Users/Kirill/planerix_new/apps/api/liderix_api/routes/data_analytics/analytics.py` (УЖЕ СОЗДАН)

**Что нужно**:
1. Зарегистрировать router в `main.py`
2. Перезапустить backend container

**Команды**:
```bash
# Проверить что router правильно импортирован
grep -n "data_analytics.*analytics" /Users/Kirill/planerix_new/apps/api/liderix_api/main.py

# Если НЕТ, добавить в main.py:
# from liderix_api.routes.data_analytics import analytics
# app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])

# Перезапустить backend
cd /Users/Kirill/planerix_new
docker-compose -f docker-compose.dev.yml up -d --build backend
```

**Endpoints созданы**:
- `GET /api/analytics/campaigns/daily?start_date=2025-09-01&end_date=2025-10-19&platform=Meta`
- `GET /api/analytics/platforms/daily?start_date=2025-09-01&end_date=2025-10-19`
- `GET /api/analytics/attribution/summary`

**Проверка**:
```bash
# Получить токен
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "itstep@itstep.com", "password": "ITstep2025!"}'

# Тестировать endpoints
TOKEN="<access_token>"
curl -X GET "http://localhost:8001/api/analytics/campaigns/daily?start_date=2025-09-01&end_date=2025-10-19" \
  -H "Authorization: Bearer $TOKEN"
```

---

### ДЕЙСТВИЕ 5: Обновить Frontend /data-analytics page
**Файл**: `/Users/Kirill/planerix_new/apps/web-enterprise/src/app/data-analytics/page.tsx`

**Что изменить**:

1. **Обновить API fetch URLs** (использовать новые endpoints):
```typescript
// СТАРОЕ (если использовались старые endpoints):
const kpiData = await fetch('/api/data-analytics/kpi?...')

// НОВОЕ:
const campaignsData = await fetch('/api/analytics/campaigns/daily?start_date=2025-09-01&end_date=2025-10-19')
const platformsData = await fetch('/api/analytics/platforms/daily?start_date=2025-09-01&end_date=2025-10-19')
const attributionData = await fetch('/api/analytics/attribution/summary')
```

2. **Обновить charts** для использования новых полей:
   - `impressions` (новое)
   - `clicks` (новое)
   - `spend` (новое)
   - `cpl` (новое)
   - `roas` (новое)
   - `ctr` (новое)
   - `ad_conversions` (новое)

3. **Добавить новые KPI карты**:
   - Total Spend (сумма spend по всем платформам)
   - Average CPL (средний CPL)
   - ROAS (Return on Ad Spend)

**Команды**:
```bash
# Перезапустить frontend
cd /Users/Kirill/planerix_new
docker-compose -f docker-compose.dev.yml up -d --build frontend
```

**Проверка**: Открыть http://localhost:3002/data-analytics и проверить:
- Charts показывают данные
- KPI карты показывают метрики
- Таблицы содержат все колонки (impressions, clicks, spend, CPL, ROAS)

---

## 📊 ФИНАЛЬНАЯ ПРОВЕРКА

После выполнения всех действий:

```sql
-- 1. fact_leads обновлён
SELECT
  COUNT(*) FILTER (WHERE gclid IS NOT NULL AND gclid != '') AS gclid_count,
  COUNT(*) FILTER (WHERE fb_lead_id IS NOT NULL AND fb_lead_id != '') AS fb_lead_id_count,
  COUNT(*) AS total_leads
FROM dashboards.fact_leads;
-- Ожидаем: 357 gclid, 1078 fb_lead_id, 16962 leads

-- 2. v8 views с полными метриками существуют
SELECT viewname, obj_description(oid, 'pg_class')
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
WHERE schemaname = 'dashboards' AND viewname LIKE 'v8_%'
ORDER BY viewname;
-- Ожидаем: v8_attribution_summary, v8_campaigns_daily, v8_campaigns_daily_full, v8_platform_daily, v8_platform_daily_full

-- 3. Старые views удалены
SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'dashboards' AND (matviewname LIKE 'v5_%' OR matviewname LIKE 'v6_%');
-- Ожидаем: 0

-- 4. v8_campaigns_daily_full содержит ad performance метрики
SELECT
  COUNT(*) AS total_campaigns,
  COUNT(*) FILTER (WHERE spend > 0) AS campaigns_with_spend,
  COUNT(*) FILTER (WHERE impressions > 0) AS campaigns_with_impressions,
  COUNT(*) FILTER (WHERE cpl IS NOT NULL) AS campaigns_with_cpl,
  COUNT(*) FILTER (WHERE roas IS NOT NULL) AS campaigns_with_roas
FROM dashboards.v8_campaigns_daily_full;
-- Ожидаем: много записей с метриками

-- 5. v8_platform_daily_full содержит полные KPI
SELECT
  platform,
  SUM(leads) AS total_leads,
  SUM(contracts) AS total_contracts,
  SUM(revenue) AS total_revenue,
  SUM(spend) AS total_spend,
  ROUND(AVG(conversion_rate), 2) AS avg_conversion_rate,
  ROUND(AVG(cpl), 2) AS avg_cpl,
  ROUND(AVG(roas), 2) AS avg_roas
FROM dashboards.v8_platform_daily_full
GROUP BY platform
ORDER BY total_leads DESC;
-- Ожидаем: Google Ads, Meta, Other Paid, Direct с метриками
```

---

## 🎯 ИТОГОВЫЙ CHECKLIST

- [ ] **ШАГ 1**: Запустить n8n node `dashboards.fact_leads` → проверить 357 gclid
- [ ] **ШАГ 2**: Запустить `UPGRADE_V8_VIEWS.sql` → проверить v8_campaigns_daily_full и v8_platform_daily_full
- [ ] **ШАГ 3**: Запустить `DELETE_OLD_VIEWS.sql` → проверить 0 старых views
- [ ] **ШАГ 4**: Обновить main.py (зарегистрировать analytics router) → перезапустить backend
- [ ] **ШАГ 5**: Обновить /data-analytics page.tsx → перезапустить frontend
- [ ] **ФИНАЛ**: Открыть http://localhost:3002/data-analytics и проверить что всё работает!

---

## 📈 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

**После выполнения всех шагов**:

1. ✅ **fact_leads**: 357 gclid (93.7% coverage)
2. ✅ **Views**: v8_campaigns_daily_full и v8_platform_daily_full с ПОЛНЫМИ метриками
3. ✅ **Старые views**: УДАЛЕНЫ (0 v5/v6 objects)
4. ✅ **API**: 3 новых endpoints работают
5. ✅ **Frontend**: /data-analytics показывает РЕАЛЬНЫЕ данные с полной атрибуцией

**Метрики на /data-analytics page**:
- Leads по кампаниям (daily breakdown)
- Contracts с атрибуцией
- Revenue по платформам
- Spend, CPL, ROAS (Google Ads + Meta)
- Impressions, Clicks, CTR
- Conversion Rate
- Attribution breakdown (Google Click, Facebook Lead, Direct, etc.)

**ВСЁ ГОТОВО К PRODUCTION!** 🚀
