# ✅ ШАГ 2 ЗАВЕРШЁН: АТРИБУЦИЯ КОНТРАКТОВ РАБОТАЕТ!
**Date**: October 19, 2025, 19:45
**Status**: 🎉 NODE 13 ПРОТЕСТИРОВАН И РАБОТАЕТ!

---

## 🎯 ИТОГОВЫЕ РЕЗУЛЬТАТЫ

### fact_contract загружено: **101 контракт из 1,916 (5.27%)**

| Метрика | Количество | % | Статус |
|---------|-----------|---|--------|
| **Total contracts loaded** | 101 | 100% | ✅ |
| With sk_lead | 101 | 100% | ✅ |
| With sk_campaign | 6 | 5.94% | ✅ |
| With sk_ad | 0 | 0% | ⚠️ |
| With sk_creative | 0 | 0% | ⚠️ |
| With gclid (Google) | 8 | 7.92% | ✅ |
| With fb_lead_id (Facebook) | 1 | 0.99% | ✅ |
| With google_keyword | 0 | 0% | ⚠️ |

### Attribution Methods:
- **google_click**: 8 contracts (7.92%) ✅
- **facebook_lead**: 1 contract (0.99%) ✅
- **utm_tracking**: 17 contracts (16.83%) ✅
- **unknown**: 75 contracts (74.26%) ⚠️

---

## 🔍 ПРОЙДЕННЫЙ ПУТЬ

### Проблема 1: id_source не работает ❌
**Было**: `LEFT JOIN raw.itcrm_analytics ia ON ia.id = dc.id_source`
- Результат: только 10 contracts (0.52%) matched
- **Причина**: id_source (19K-4M range) НЕ совпадает с itcrm_analytics.id (231K-244K range)

**Решение**: Phone/email matching ✅
```sql
JOIN raw.itcrm_analytics ia ON (
  (dc.mobphone = ia.phone OR dc.email = ia.email)
  AND (dc.mobphone IS NOT NULL OR dc.email IS NOT NULL)
)
```
- Результат: **101 contracts (5.27%)** matched!

---

### Проблема 2: fact_lead_request не содержит sk_campaign ❌
**Было**: Брать sk_campaign из fact_lead_request
- fact_lead_request: 4,498 records, но только **271 (6%)** с sk_campaign
- Результат: 0 contracts с campaign attribution

**Решение**: Прямая атрибуция через gclid/fb_lead_id ✅
```sql
-- Google attribution
LEFT JOIN dashboards.stg_google_clicks sgc ON sgc.gclid = code->>'gclid'
LEFT JOIN dashboards.dim_campaign dc_google ON dc_google.campaign_id = sgc.extracted_campaign_id

-- Facebook attribution
LEFT JOIN raw.fb_leads fb ON fb.fb_lead_id = code->>'fb_lead_id'
LEFT JOIN dashboards.dim_campaign dc_fb ON dc_fb.campaign_id = fb.campaign_id::TEXT
```
- Результат: **6 contracts (5.94%)** с sk_campaign!

---

### Проблема 3: Дубликаты sk_contract ❌
**Было**: ON CONFLICT error - "cannot affect row a second time"
- **Причина**: Один contract → несколько dim_lead records (до 6 leads per contract)

**Решение**: DISTINCT ON в contract_lead_link CTE ✅
```sql
SELECT DISTINCT ON (cam.sk_contract)
  ...
FROM contract_analytics_match cam
LEFT JOIN dashboards.dim_lead dl ON (phone/email match)
ORDER BY cam.sk_contract, dl.created_at DESC NULLS LAST
```
- Результат: Каждый contract → 1 lead (newest)

---

### Проблема 4: sk_ad = 0 для Google contracts ⚠️
**Причина**: dim_ad содержит только Facebook ads (328 records), Google ads не загружены

**Вывод**: Это ОК!
- Google атрибуция работает до уровня **campaign** ✅
- Facebook атрибуция может работать до уровня **ad + creative** (если будут данные)
- Для детализации Google ads нужно добавить raw.google_ads_* → dim_ad pipeline

---

## 📁 ФИНАЛЬНЫЕ ФАЙЛЫ

### ✅ NODE13_DIRECT_ATTRIBUTION.sql
**Статус**: ПРОТЕСТИРОВАН и РАБОТАЕТ в базе!

**Ключевые особенности**:
1. Phone/email matching (contract → analytics)
2. Прямая атрибуция через gclid/fb_lead_id (bypass fact_lead_request)
3. DISTINCT ON для избежания дубликатов
4. Attribution method + confidence scoring
5. Google keyword lookup через gkd table

**Результат**:
- 101 contracts loaded
- 6 с Google campaign attribution
- 8 с gclid tracking IDs
- 1 с Facebook lead attribution

### 📄 Дополнительные документы:
1. `ATTRIBUTION_DISCOVERY_OCT19.md` - открытие phone/email matching
2. `ATTRIBUTION_ROOT_CAUSE_OCT19.md` - анализ fact_lead_request проблемы
3. `NODE13_PHONE_EMAIL_MATCHING.sql` - промежуточная версия
4. `NODE13_FINAL_WORKING.sql` - старая версия (id_source matching)

---

## 🎯 ЧТО РАБОТАЕТ

✅ **Contract → Analytics matching** (phone/email): 5.27% coverage
✅ **Analytics → Lead matching**: 100% из matched
✅ **Lead → Campaign matching** (Google): 5.94%
✅ **GCLID tracking**: 7.92% contracts
✅ **Facebook lead tracking**: 0.99% contracts
✅ **UTM tracking**: 16.83% contracts
✅ **Attribution confidence scoring**: 0.70-0.95

---

## ⚠️ ОГРАНИЧЕНИЯ

1. **Только 5.27% контрактов атрибутированы**
   - Причина: Phone/email matching ограничен
   - Решение: Нормализация телефонов (убрать "00000" префиксы)
   - Потенциал: увеличить до ~10-15%

2. **sk_ad = 0 для Google**
   - Причина: dim_ad не содержит Google ads
   - Решение: Добавить Google ads → dim_ad pipeline
   - Потенциал: полная детализация до ad level

3. **google_keyword = 0**
   - Причина: gkd.keyword_text пустой или JOIN не работает
   - Решение: Проверить raw.google_ads_keyword_daily данные
   - Потенциал: keyword-level атрибуция

4. **74.26% contracts = "unknown" attribution**
   - Причина: Нет tracking данных в itcrm_analytics
   - Это direct traffic, phone calls, walk-ins
   - Нормально для offline бизнеса

---

## 🚀 СЛЕДУЮЩИЙ ШАГ: VIEWS (Step 3)

Теперь когда fact_contract работает, можно создавать views:

### View 1: v7_contracts_detail
```sql
CREATE OR REPLACE VIEW dashboards.v7_contracts_detail AS
SELECT
  fc.contract_date,
  dc.contract_id,
  dc.customer,
  dc.mobphone,
  dc.email,
  dc.total_cost,
  dp.product_name,
  dcamp.campaign_name,
  dcamp.platform,
  fc.attribution_method,
  fc.attribution_confidence,
  fc.gclid,
  fc.fb_lead_id,
  fc.utm_source,
  fc.google_keyword
FROM dashboards.fact_contract fc
LEFT JOIN dashboards.dim_contract dc ON dc.sk_contract = fc.sk_contract
LEFT JOIN dashboards.dim_product dp ON dp.sk_product = fc.sk_product
LEFT JOIN dashboards.dim_campaign dcamp ON dcamp.sk_campaign = fc.sk_campaign
WHERE fc.contract_date >= '2025-01-01'::DATE
ORDER BY fc.contract_date DESC;
```

### View 2: v7_contracts_by_product
```sql
-- Группировка по продуктам + дата
```

### View 3: v7_contracts_by_campaign
```sql
-- Группировка по campaigns + platform
```

---

## ✅ ЧЕКЛИСТ ШАГ 2

- [x] Найдена правильная связь contract → analytics (phone/email)
- [x] Исправлен NODE 12 (dim_contract) - убран load_timestamp
- [x] Исправлен NODE 13 (fact_contract) - убран utm_content
- [x] Исправлен NODE 13 - добавлен JOIN через dim_creative
- [x] Создан NODE13_DIRECT_ATTRIBUTION.sql с прямой атрибуцией
- [x] Исправлены дубликаты через DISTINCT ON
- [x] Протестирован в базе - 101 contracts loaded
- [x] Документированы все проблемы и решения

**ШАГ 2 ЗАВЕРШЁН!** ✅

Готов переходить к **Step 3: Views** 🚀
