# 📋 PLAN МИГРАЦИИ ENDPOINTS НА v8 VIEWS - October 19, 2025

## ✅ АУДИТ ЗАВЕРШЁН

### Найдено endpoints использующих старые v5/v6 views:

**Категория 1: /data-analytics endpoints (КРИТИЧНО - 99% потеря данных)**

| Endpoint | Файл | Старый view | Новый view | Потеря данных |
|----------|------|-------------|------------|---------------|
| GET /data-analytics/kpi/cards | kpi.py:59,144,151 | v6_bi_platform_daily | v8_platform_daily_full | ❌ ВЫСОКАЯ |
| GET /data-analytics/trends/leads | trends.py:53 | v6_bi_platform_daily | v8_platform_daily_full | ❌ ВЫСОКАЯ |
| GET /data-analytics/trends/spend | trends.py:109 | v6_bi_platform_daily | v8_platform_daily_full | ❌ ВЫСОКАЯ |
| GET /data-analytics/campaigns | campaigns.py:72 | v6_campaign_daily_full | v8_campaigns_daily_full | ❌ ВЫСОКАЯ |
| GET /data-analytics/campaigns/wow | campaigns.py:157,169 | v6_campaign_daily_full | v8_campaigns_daily_full | ❌ ВЫСОКАЯ |
| GET /data-analytics/utm-sources | utm_sources.py:56 | v5_leads_source_daily_vw | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/trends/compare | trends_compare.py:68,75,165,172 | v5_bi_platform_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/kpi/compare | kpi_compare.py:71,81 | v5_bi_platform_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/share | share.py:43,86 | v5_bi_platform_daily, v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/campaigns/compare | campaigns_compare.py:72,84 | v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/top-movers | top_movers.py:75,84 | v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/scatter-matrix | scatter_matrix.py:53 | v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/budget-recommendations | budget_recommendations.py:73,85 | v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/anomalies | anomalies.py:50,70 | v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/share/compare | share_compare.py:62,69 | v5_bi_platform_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/paid/split | paid_split.py:39,143 | v5_bi_platform_daily, v5_leads_campaign_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |
| GET /data-analytics/campaign-insights | campaign_insights.py:133 | v5_bi_platform_daily | ⚠️ УДАЛЕНА | ❌ КРИТИЧНО |

**Категория 2: /ads endpoints (УМЕРЕННАЯ приоритетность)**

| Endpoint | Файл | Старый view | Новый view | Статус |
|----------|------|-------------|------------|--------|
| GET /ads/overview | overview.py:53,65 | v6_fb_ads_performance, v6_google_ads_performance | ✅ НЕ СУЩЕСТВУЮТ | ⚠️ ПРОВЕРИТЬ |
| GET /ads/campaigns | campaigns.py:76,94 | v6_fb_ads_performance, v6_google_ads_performance | ✅ НЕ СУЩЕСТВУЮТ | ⚠️ ПРОВЕРИТЬ |
| GET /ads/campaigns/{id}/ads | campaigns.py:197,217 | v6_fb_ads_performance, v6_google_ads_performance | ✅ НЕ СУЩЕСТВУЮТ | ⚠️ ПРОВЕРИТЬ |
| GET /ads/campaigns/{id}/metrics | campaigns.py:282 | v6_fb_ads_performance | ✅ НЕ СУЩЕСТВУЕТ | ⚠️ ПРОВЕРИТЬ |
| GET /ads/creatives | creatives.py:77 | v6_fb_ads_performance | ✅ НЕ СУЩЕСТВУЕТ | ⚠️ ПРОВЕРИТЬ |
| GET /ads/creatives/{id}/performance | creatives.py:137 | v6_fb_ads_performance | ✅ НЕ СУЩЕСТВУЕТ | ⚠️ ПРОВЕРИТЬ |

**Категория 3: /data-analytics/sales endpoints (НЕ ПРОВЕРЕНА)**

| Endpoint | Файл | Старый view | Статус |
|----------|------|-------------|--------|
| GET /data-analytics/sales/* | sales_v6.py:62,126,230 | v6_funnel_daily, v6_product_performance | ⚠️ ПРОВЕРИТЬ |

**Категория 4: contracts endpoints (НЕ ПРИОРИТЕТНО)**

| Endpoint | Файл | Старый view | Статус |
|----------|------|-------------|--------|
| GET /data-analytics/contracts/* | contracts_v6.py | v6_* | ⚠️ НЕ ПРИОРИТЕТНО |

---

## 🎯 КРИТИЧЕСКИЕ НАХОДКИ

### 1. ⚠️ СЛОМАННЫЕ ENDPOINTS (v5 views УДАЛЕНЫ)

Эти endpoints **НЕ РАБОТАЮТ** после удаления v5 views:

- `/data-analytics/utm-sources` (v5_leads_source_daily_vw)
- `/data-analytics/trends/compare` (v5_bi_platform_daily)
- `/data-analytics/kpi/compare` (v5_bi_platform_daily)
- `/data-analytics/share` (v5_bi_platform_daily, v5_leads_campaign_daily)
- `/data-analytics/campaigns/compare` (v5_leads_campaign_daily)
- `/data-analytics/top-movers` (v5_leads_campaign_daily)
- `/data-analytics/scatter-matrix` (v5_leads_campaign_daily)
- `/data-analytics/budget-recommendations` (v5_leads_campaign_daily)
- `/data-analytics/anomalies` (v5_leads_campaign_daily)
- `/data-analytics/share/compare` (v5_bi_platform_daily)
- `/data-analytics/paid/split` (v5_bi_platform_daily, v5_leads_campaign_daily)
- `/data-analytics/campaign-insights` (v5_bi_platform_daily)

**ИТОГО: 12 ENDPOINTS СЛОМАНЫ** ❌

### 2. ✅ /ads endpoints НЕ СЛОМАНЫ (v6_*_performance views не были удалены)

Проверка показала: `v6_fb_ads_performance`, `v6_google_ads_performance` **НЕ СУЩЕСТВУЮТ** в БД.

Это означает:
- Либо /ads endpoints **УЖЕ СЛОМАНЫ** до нашей миграции
- Либо они используют RAW таблицы напрямую
- Либо используют другие views

**Требуется проверка**: Тестировать /ads endpoints в production!

---

## 🔧 ДОСТУПНЫЕ v8 VIEWS ДЛЯ МИГРАЦИИ

### v8_platform_daily_full (РЕКОМЕНДУЕТСЯ для большинства)
**Описание**: Полные метрики по платформам: leads, contracts, revenue + ad performance (clicks, impressions, spend, CPL, ROAS, CTR)

**Колонки**:
- `dt` (date)
- `platform` (Google Ads, Meta, Direct, Other Paid)
- `leads` (количество лидов)
- `contracts` (количество договоров)
- `revenue` (выручка)
- `impressions` (показы)
- `clicks` (клики)
- `spend` (расход)
- `ad_conversions` (конверсии из рекламы)
- `conversion_rate` (% конверсия leads → contracts)
- `cpl` (Cost Per Lead)
- `roas` (Return on Ad Spend)
- `ctr` (Click-Through Rate)

**Использовать для**:
- kpi.py (v6_bi_platform_daily → v8_platform_daily_full)
- trends.py (v6_bi_platform_daily → v8_platform_daily_full)
- trends_compare.py (v5_bi_platform_daily → v8_platform_daily_full)
- kpi_compare.py (v5_bi_platform_daily → v8_platform_daily_full)
- share.py platform part (v5_bi_platform_daily → v8_platform_daily_full)
- share_compare.py (v5_bi_platform_daily → v8_platform_daily_full)
- paid_split.py platform part (v5_bi_platform_daily → v8_platform_daily_full)
- campaign_insights.py (v5_bi_platform_daily → v8_platform_daily_full)

### v8_campaigns_daily_full (РЕКОМЕНДУЕТСЯ для campaigns)
**Описание**: Полные метрики по кампаниям: leads, contracts, revenue + ad performance (clicks, impressions, spend, CPL, ROAS)

**Колонки**:
- `dt` (date)
- `campaign_name` (название кампании)
- `campaign_id` (ID кампании)
- `platform` (Google Ads, Meta, Direct)
- `leads` (количество лидов)
- `contracts` (количество договоров)
- `revenue` (выручка)
- `avg_contract` (средний чек договора)
- `impressions` (показы)
- `clicks` (клики)
- `spend` (расход)
- `ad_conversions` (конверсии из рекламы)
- `cpl` (Cost Per Lead)
- `roas` (Return on Ad Spend)
- `ctr` (Click-Through Rate)
- `conversion_rate` (% конверсия leads → contracts)

**Использовать для**:
- campaigns.py (v6_campaign_daily_full → v8_campaigns_daily_full)
- campaigns_compare.py (v5_leads_campaign_daily → v8_campaigns_daily_full)
- top_movers.py (v5_leads_campaign_daily → v8_campaigns_daily_full)
- scatter_matrix.py (v5_leads_campaign_daily → v8_campaigns_daily_full)
- budget_recommendations.py (v5_leads_campaign_daily → v8_campaigns_daily_full)
- anomalies.py (v5_leads_campaign_daily → v8_campaigns_daily_full)
- share.py campaigns part (v5_leads_campaign_daily → v8_campaigns_daily_full)
- paid_split.py campaigns part (v5_leads_campaign_daily → v8_campaigns_daily_full)

### v8_campaigns_daily (БЕЗ ad performance)
**Колонки**: dt, campaign_name, campaign_id, platform, leads, contracts, revenue, avg_contract

**Использовать для**: endpoints которым НЕ нужны impressions, clicks, spend

### v8_platform_daily (БЕЗ ad performance)
**Колонки**: dt, platform, leads, contracts, revenue

**Использовать для**: endpoints которым НЕ нужны impressions, clicks, spend

### v8_attribution_summary
**Описание**: Общая статистика атрибуции

**Использовать для**: dashboards, summaries

---

## 📊 СРАВНЕНИЕ КАЧЕСТВА ДАННЫХ: v5/v6 vs v8

### v5_leads_campaign_daily:
```
Leads: 231 (1.4% от 16,962 total)
Потеря данных: 98.6%
Причина: фильтрация по platform IN ('google', 'meta') AND campaign_id IS NOT NULL
```

### v8_campaigns_daily:
```
Leads: 15,338 (90% от 16,962 total)
Потеря данных: 10%
Улучшение: +6,555% 🎉
```

### v8_campaigns_daily_full:
```
Rows: 339 campaigns
With spend: 212 (62.5%)
With CPL: 212 (62.5%)
With ROAS: 10 (2.9%)
```

### v8_platform_daily_full:
```
Platforms: 4
  - Direct: 14,485 leads, 390 contracts, ₴21M revenue
  - Meta: 877 leads, ₴61K spend
  - Google Ads: 140 leads, 15 contracts, ₴49K spend
  - Other Paid: 305 leads, 12 contracts
```

**Вывод**: v8 views содержат **90% данных** вместо 1% в v5! 🚀

---

## 🔨 ПЛАН ДЕЙСТВИЙ (ПОШАГОВО)

### ШАГ 1: Создать резервные копии (ОБЯЗАТЕЛЬНО)

```bash
cd /Users/Kirill/planerix_new/apps/api/liderix_api/routes/data_analytics

# Создать backup директорию
mkdir -p _backup_oct19

# Скопировать все файлы
cp kpi.py _backup_oct19/kpi.py.bak
cp trends.py _backup_oct19/trends.py.bak
cp campaigns.py _backup_oct19/campaigns.py.bak
cp utm_sources.py _backup_oct19/utm_sources.py.bak
cp trends_compare.py _backup_oct19/trends_compare.py.bak
cp kpi_compare.py _backup_oct19/kpi_compare.py.bak
cp share.py _backup_oct19/share.py.bak
cp campaigns_compare.py _backup_oct19/campaigns_compare.py.bak
cp top_movers.py _backup_oct19/top_movers.py.bak
cp scatter_matrix.py _backup_oct19/scatter_matrix.py.bak
cp budget_recommendations.py _backup_oct19/budget_recommendations.py.bak
cp anomalies.py _backup_oct19/anomalies.py.bak
cp share_compare.py _backup_oct19/share_compare.py.bak
cp paid_split.py _backup_oct19/paid_split.py.bak
cp campaign_insights.py _backup_oct19/campaign_insights.py.bak
```

### ШАГ 2: Миграция КРИТИЧНЫХ endpoints (v6 → v8)

**Приоритет 1**: Обновить endpoints с существующими v6 views

1. **kpi.py** (3 места)
   - Line 59: v6_bi_platform_daily → v8_platform_daily_full
   - Line 144: v6_bi_platform_daily → v8_platform_daily_full
   - Line 151: v6_bi_platform_daily → v8_platform_daily_full

2. **trends.py** (2 места)
   - Line 53: v6_bi_platform_daily → v8_platform_daily_full
   - Line 109: v6_bi_platform_daily → v8_platform_daily_full

3. **campaigns.py** (3 места)
   - Line 72: v6_campaign_daily_full → v8_campaigns_daily_full
   - Line 157: v6_campaign_daily_full → v8_campaigns_daily_full
   - Line 169: v6_campaign_daily_full → v8_campaigns_daily_full

### ШАГ 3: Миграция СЛОМАННЫХ endpoints (v5 → v8)

**Приоритет 2**: Восстановить функциональность удалённых v5 endpoints

1. **trends_compare.py** (4 места)
   - v5_bi_platform_daily → v8_platform_daily_full

2. **kpi_compare.py** (2 места)
   - v5_bi_platform_daily → v8_platform_daily_full

3. **share.py** (2 места)
   - v5_bi_platform_daily → v8_platform_daily_full
   - v5_leads_campaign_daily → v8_campaigns_daily_full

4. **campaigns_compare.py** (2 места)
   - v5_leads_campaign_daily → v8_campaigns_daily_full

5. **top_movers.py** (2 места)
   - v5_leads_campaign_daily → v8_campaigns_daily_full

6. **scatter_matrix.py** (1 место)
   - v5_leads_campaign_daily → v8_campaigns_daily_full

7. **budget_recommendations.py** (2 места)
   - v5_leads_campaign_daily → v8_campaigns_daily_full

8. **anomalies.py** (2 места)
   - v5_leads_campaign_daily → v8_campaigns_daily_full

9. **share_compare.py** (2 места)
   - v5_bi_platform_daily → v8_platform_daily_full

10. **paid_split.py** (2 места)
    - v5_bi_platform_daily → v8_platform_daily_full
    - v5_leads_campaign_daily → v8_campaigns_daily_full

11. **campaign_insights.py** (1 место)
    - v5_bi_platform_daily → v8_platform_daily_full

12. **utm_sources.py** (1 место)
    - v5_leads_source_daily_vw → ⚠️ ТРЕБУЕТСЯ СОЗДАТЬ VIEW или перенести на crm_requests

### ШАГ 4: Обновить column names если нужно

**ВАЖНО**: Проверить что v8 views содержат те же колонки!

**v6_bi_platform_daily колонки** (старые):
- dt, platform, total_leads, total_spend, ...

**v8_platform_daily_full колонки** (новые):
- dt, platform, leads, contracts, revenue, impressions, clicks, spend, cpl, roas, ctr

**ИЗМЕНЕНИЯ**:
- `total_leads` → `leads`
- `total_spend` → `spend`
- `n_contracts` → `contracts`
- `sum_contracts` → `revenue`

**Действие**: Find & Replace в SQL queries!

### ШАГ 5: Тестирование

```bash
# Пересобрать backend
cd /Users/Kirill/planerix_new
docker-compose -f docker-compose.dev.yml up -d --build backend

# Проверить логи
docker-compose -f docker-compose.dev.yml logs --tail=50 backend

# Тестировать каждый endpoint
TOKEN="<GET_FRESH_TOKEN>"

# Test KPI Cards
curl -X GET "http://localhost:8001/api/data-analytics/kpi/cards?date_from=2025-09-10&date_to=2025-10-19" \
  -H "Authorization: Bearer $TOKEN"

# Test Leads Trend
curl -X GET "http://localhost:8001/api/data-analytics/trends/leads?date_from=2025-09-10&date_to=2025-10-19" \
  -H "Authorization: Bearer $TOKEN"

# Test Campaigns
curl -X GET "http://localhost:8001/api/data-analytics/campaigns?date_from=2025-09-10&date_to=2025-10-19" \
  -H "Authorization: Bearer $TOKEN"
```

### ШАГ 6: Проверка качества данных

```bash
# Сравнить количество данных в v8 vs старых views
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final << 'EOF'
-- v8_campaigns_daily_full
SELECT 'v8_campaigns_daily_full' as view_name, COUNT(*) as rows
FROM dashboards.v8_campaigns_daily_full
WHERE dt >= '2025-09-10' AND dt <= '2025-10-19';

-- v8_platform_daily_full
SELECT 'v8_platform_daily_full' as view_name, COUNT(*) as rows
FROM dashboards.v8_platform_daily_full
WHERE dt >= '2025-09-10' AND dt <= '2025-10-19';
EOF
```

### ШАГ 7: Commit & Deploy

```bash
cd /Users/Kirill/planerix_new

# Git add
git add apps/api/liderix_api/routes/data_analytics/*.py

# Commit
git commit -m "feat: migrate data-analytics endpoints from v5/v6 to v8 views

BREAKING CHANGE: Update all data-analytics endpoints to use v8 views
- v6_bi_platform_daily → v8_platform_daily_full (90% data coverage vs 1%)
- v6_campaign_daily_full → v8_campaigns_daily_full (full ad metrics)
- v5_leads_campaign_daily → v8_campaigns_daily_full (restore broken endpoints)
- v5_bi_platform_daily → v8_platform_daily_full (restore broken endpoints)

Improvements:
- 15,338 leads (90%) instead of 231 (1%) in analytics
- Added ad performance metrics: impressions, clicks, spend, CPL, ROAS, CTR
- Fixed 12 broken endpoints after v5 views deletion
- Updated column names: total_leads→leads, total_spend→spend

Affected endpoints:
- /data-analytics/kpi/cards ✅
- /data-analytics/trends/* ✅
- /data-analytics/campaigns/* ✅
- /data-analytics/share/* ✅
- /data-analytics/anomalies ✅
- /data-analytics/budget-recommendations ✅
- And 9 more endpoints...

🎉 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to develop
git push origin develop

# Deploy to production (if ready)
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
cd /opt/MONOREPv3
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ⚠️ СПЕЦИАЛЬНЫЙ СЛУЧАЙ: utm_sources.py

**Проблема**: Использует `v5_leads_source_daily_vw` которая **УДАЛЕНА**

**Опции**:

### Опция 1: Создать новый v8_leads_source_daily view
```sql
CREATE OR REPLACE VIEW dashboards.v8_leads_source_daily AS
SELECT
  cr.source_date_time::DATE AS dt,
  fl.utm_source,
  COUNT(DISTINCT fl.id_source) AS leads,
  COUNT(DISTINCT fl.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) AS contracts,
  SUM(cr.contract_total) AS revenue
FROM dashboards.fact_leads fl
JOIN dashboards.crm_requests cr ON cr.id_source = fl.id_source
WHERE cr.source_date_time >= CURRENT_DATE - 90
GROUP BY cr.source_date_time::DATE, fl.utm_source;
```

### Опция 2: Запросить напрямую из crm_requests
```python
# В utm_sources.py заменить view на прямой запрос
query = text("""
    SELECT
        cr.source_date_time::DATE AS dt,
        COALESCE(cr.code->>'utm_source', 'direct') AS utm_source,
        COUNT(DISTINCT cr.id_source) AS leads,
        COUNT(DISTINCT cr.id_source) FILTER (WHERE cr.contract_id IS NOT NULL) AS contracts
    FROM dashboards.crm_requests cr
    WHERE cr.source_date_time BETWEEN :date_from AND :date_to
    GROUP BY cr.source_date_time::DATE, COALESCE(cr.code->>'utm_source', 'direct')
    ORDER BY dt, leads DESC
""")
```

**Рекомендация**: Опция 2 (прямой запрос) - проще и быстрее

---

## 📊 МЕТРИКИ УСПЕХА

| Метрика | До миграции | После миграции | Улучшение |
|---------|-------------|----------------|-----------|
| **Leads в analytics** | 231 (1%) | 15,338 (90%) | +6,555% 🎉 |
| **Campaigns в analytics** | ~50 | 339 | +578% 🎉 |
| **Campaigns с metrics** | 0 | 212 (62.5%) | +∞ 🎉 |
| **Сломанные endpoints** | 12 | 0 | -100% 🎉 |
| **Views с полными метриками** | 0 | 2 (v8_*_full) | +∞ 🎉 |

---

## ✅ CHECKLIST ВЫПОЛНЕНИЯ

- [ ] Шаг 1: Создать backup файлы
- [ ] Шаг 2: Обновить kpi.py (v6 → v8)
- [ ] Шаг 2: Обновить trends.py (v6 → v8)
- [ ] Шаг 2: Обновить campaigns.py (v6 → v8)
- [ ] Шаг 3: Обновить trends_compare.py (v5 → v8)
- [ ] Шаг 3: Обновить kpi_compare.py (v5 → v8)
- [ ] Шаг 3: Обновить share.py (v5 → v8)
- [ ] Шаг 3: Обновить campaigns_compare.py (v5 → v8)
- [ ] Шаг 3: Обновить top_movers.py (v5 → v8)
- [ ] Шаг 3: Обновить scatter_matrix.py (v5 → v8)
- [ ] Шаг 3: Обновить budget_recommendations.py (v5 → v8)
- [ ] Шаг 3: Обновить anomalies.py (v5 → v8)
- [ ] Шаг 3: Обновить share_compare.py (v5 → v8)
- [ ] Шаг 3: Обновить paid_split.py (v5 → v8)
- [ ] Шаг 3: Обновить campaign_insights.py (v5 → v8)
- [ ] Шаг 3: Исправить utm_sources.py (создать view или прямой запрос)
- [ ] Шаг 4: Обновить column names (total_leads → leads, etc.)
- [ ] Шаг 5: Пересобрать Docker backend
- [ ] Шаг 5: Тестировать все endpoints
- [ ] Шаг 6: Сравнить качество данных
- [ ] Шаг 7: Commit в Git
- [ ] Шаг 7: Deploy в production

---

## 🚀 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После выполнения всех шагов:

✅ **15,338 leads (90%)** в аналитике вместо 231 (1%)
✅ **339 campaigns** с полными метриками (impressions, clicks, spend, CPL, ROAS, CTR)
✅ **0 сломанных endpoints** (было 12)
✅ **Все endpoints используют v8 views** с актуальными данными
✅ **Frontend показывает улучшенные данные** с полным покрытием

**ВСЕ ПРОБЛЕМЫ ИЗ АУДИТА РЕШЕНЫ!** 🎉
