# V9 Data Quality Report - 22 октября 2025

## ✅ ETL Successfully Completed

```sql
 step_name             | rows_processed | execution_time_ms | status
-----------------------+----------------+-------------------+---------
 1. CRM Events         |         17,136 |             155ms | SUCCESS
 2. Source Attribution |         17,136 |             196ms | SUCCESS
 3. Marketing Match    |          1,973 |           1,254ms | SUCCESS
 4. Fact Leads         |          4,570 |              73ms | SUCCESS
 5. Fact Contracts     |              0 |              11ms | SUCCESS
```

## 📊 Data Quality Metrics

### 1. Row Counts по всем таблицам

| Table | Total Rows | Unique Clients | First Touch Events | Date Range |
|-------|------------|----------------|--------------------| -----------|
| `stg.crm_events` | 17,136 | 4,570 | 4,570 | 2025-04-24 to 2025-10-21 |
| `stg.source_attribution` | 17,136 | 17,136 | - | 2025-08-24 to 2025-10-21 |
| `stg.marketing_match` | 1,973 | 1,973 | - | - |
| `stg.fact_leads` | 4,570 | 4,570 | - | 2025-04-24 to 2025-10-21 |
| `stg.fact_contracts` | 0 | 0 | - | NO DATA |

### 2. Attribution Rate (dominant_platform)

| Platform | Leads | % of Total |
|----------|-------|------------|
| direct | 4,395 | **96.17%** ⚠️ |
| google | 97 | 2.12% |
| facebook | 53 | 1.16% |
| event | 14 | 0.31% |
| internet_request | 11 | 0.24% |

**🚨 ПРОБЛЕМА**: 96% лидов классифицированы как "direct" - требуется улучшение атрибуции!

### 3. Marketing Match Rate

| Metric | Value |
|--------|-------|
| Matched Leads | 11 |
| Total Leads | 4,570 |
| **Match Rate** | **0.24%** 🔴 |

**🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА**: Только 0.24% лидов смогли связать с рекламными кампаниями!

### 4. Attribution Markers Availability

| Marker Type | Count | % of Total |
|-------------|-------|------------|
| has_fbclid | 0 | 0% |
| has_fclid | 201 | 1.17% |
| has_gclid | 138 | 0.81% |
| has_utm_source | 1 | 0.01% |
| has_utm_campaign | 0 | 0% |

## 🔍 Root Cause Analysis

### Проблема 1: Низкий Match Rate (0.24%)

**Причина**: В таблице `raw.fb_leads` (401 запись) **нет fclid/fbclid в поле `code`**.

**Факты**:
- `itcrm_analytics` содержит 342 записи с fclid (Facebook click ID)
- 201 из них попали в `stg.source_attribution`
- `raw.fb_leads` имеет 0 записей с fclid/fbclid в JSONB поле `code`

**Структура fb_leads.code**:
```json
{
  "source": "facebook_leads",
  "fb_ad_id": "120235294843860479",
  "fb_ad_name": "4",
  "fb_form_id": "678084875338358",
  "fb_lead_id": "1408616574490708",
  "fb_page_id": "140824942643821",
  "fb_adset_id": "120235294843880479",
  "fb_platform": "fb",
  "fb_form_name": "Табір Forest Legends",
  "fb_adset_name": "широка",
  "fb_campaign_id": "120235293308670479",
  "fb_campaign_name": "Табір осінь МКА / ГЛ"
  // НЕТ fclid или fbclid!
}
```

**Решение**: Изменить логику маппинга с fclid на **телефон/email** между CRM и Facebook leads.

### Проблема 2: Нет договоров (fact_contracts = 0 rows)

**Причина**: Требуется проверка данных в `raw.itcrm_docs_clients`.

**Возможные причины**:
1. В crm_events нет событий с `is_contract = TRUE`
2. Связь по `id_source` между `itcrm_new_source` и `itcrm_docs_clients` не работает
3. Фильтр `WHERE contract_day >= '2025-01-01'` исключает все данные

## 🎯 Recommended Actions

### Immediate Fixes (High Priority)

1. **Улучшить Facebook маппинг**:
   - ✅ Использовать phone/email matching (уже реализовано в marketing_match)
   - ⚠️ Проверить качество phone/email данных (нормализация)
   - Добавить дополнительные способы связи через `fb_lead_id`

2. **Исследовать договоры**:
   ```sql
   -- Проверить есть ли договоры в crm_events
   SELECT COUNT(*) FROM stg.crm_events WHERE is_contract = TRUE;

   -- Проверить связь с itcrm_docs_clients
   SELECT COUNT(*)
   FROM raw.itcrm_new_source ns
   JOIN raw.itcrm_docs_clients dc ON ns.id_source = dc.id_source
   WHERE ns.dogovor = 1;
   ```

3. **Улучшить атрибуцию "direct" лидов**:
   - Проверить данные в `itcrm_events` (мероприятия)
   - Использовать `itcrm_promo_sources` для органических источников
   - Добавить fallback logic для UTM параметров

### Medium Priority

4. **Добавить дополнительные источники атрибуции**:
   - Viber/Telegram/TikTok sources
   - Email campaigns
   - Referral sources

5. **Создать data quality dashboard**:
   - Monitor match rate daily
   - Track attribution distribution
   - Alert if match rate < 10%

## 📈 Success Criteria (Goals)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Attribution Rate (non-direct) | 3.83% | >80% | 🔴 MISS |
| Marketing Match Rate | 0.24% | >50% | 🔴 MISS |
| Facebook Match Rate | 0.24% | >60% | 🔴 MISS |
| Google Match Rate | - | >40% | 🟡 PENDING |
| Contract Data Availability | 0% | 100% | 🔴 MISS |

## 🚀 Next Steps

1. ✅ **Phase 1**: ETL pipeline - COMPLETED
2. ✅ **Phase 2**: Data quality check - COMPLETED
3. 🟡 **Phase 2.5**: FIX критических проблем (match rate, contracts)
4. ⏸️ **Phase 3**: Create analytics views (BLOCKED until match rate fixed)
5. ⏸️ **Phase 4**: Test views with real data
6. ⏸️ **Phase 5**: Create additional visualizations
7. ⏸️ **Phase 6**: N8N workflow
8. ⏸️ **Phase 7**: Final system verification

---

**Report Date**: 22 октября 2025
**Status**: 🟡 ETL работает, но требуются критические исправления атрибуции
**Author**: Claude Code Assistant
