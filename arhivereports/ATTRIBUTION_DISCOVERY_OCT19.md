# КРИТИЧЕСКОЕ ОТКРЫТИЕ: ПРАВИЛЬНАЯ АТРИБУЦИЯ КОНТРАКТОВ
**Date**: October 19, 2025, 18:30
**Status**: ✅ РЕШЕНО - Найдена правильная связь!

---

## 🔍 ПРОБЛЕМА

**Исходная стратегия (НЕВЕРНАЯ)**:
```sql
-- ❌ НЕ РАБОТАЕТ - только 0.52% контрактов
FROM dashboards.dim_contract dc
LEFT JOIN raw.itcrm_analytics ia ON ia.id = dc.id_source
```

**Почему не работает**:
- `id_source` в crm_orders: диапазон 19,751 - 4,199,195
- `id` в itcrm_analytics: диапазон 231,171 - 244,655
- **Диапазоны НЕ ПЕРЕСЕКАЮТСЯ!**
- id_source НЕ ссылается на itcrm_analytics.id

---

## ✅ РЕШЕНИЕ: PHONE/EMAIL MATCHING

**Правильная стратегия**:
```sql
-- ✅ РАБОТАЕТ - 5.27% контрактов (101 из 1,916)
FROM raw.crm_orders co
JOIN raw.itcrm_analytics ia ON (
  (co.mobphone = ia.phone OR co.email = ia.email)
  AND (co.mobphone IS NOT NULL OR co.email IS NOT NULL)
)
```

---

## 📊 РЕЗУЛЬТАТЫ АТРИБУЦИИ

### Текущее покрытие (через phone/email):
- **Total contracts**: 1,916 (100%)
- **Matched to analytics**: 101 (5.27%)
- **With Google gclid**: 100 (5.22%) ✅
- **With Facebook fb_lead_id**: 1 (0.05%)
- **With utm_source**: 30 (1.57%)

### Пример найденных данных:
```
contract_id: 1546670
id_source: 4191008
mobphone: 000002432124
analytics_id: 241715
gclid: EAIaIQobChMI8826u-7ujwMVQRaiAx2JOyhbEAAYAyAAEgKR1PD_BwE ✅
```

---

## 🎯 ПЛАН УЛУЧШЕНИЯ

### Почему только 5.27% покрытие?

**Возможные причины**:
1. **Телефоны с префиксами "00000"** - маскированные номера
2. **Разные форматы телефонов** - нужна нормализация
3. **Email может быть пустым** - нужна проверка
4. **Лиды без контрактов** - нормально для воронки

### Следующие шаги для увеличения покрытия:

**1. Нормализация телефонов**:
```sql
-- Убрать префикс "00000"
REPLACE(co.mobphone, '00000', '')

-- Убрать пробелы и дефисы
REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
```

**2. Проверка через itcrm_new_source** (6.78% покрытие):
```sql
-- Попробовать связь через itcrm_new_source
FROM raw.crm_orders co
JOIN raw.itcrm_new_source ins ON ins.id_source = co.id_source
```

**3. Использовать оба метода (UNION)**:
- Phone/email matching: 5.27%
- itcrm_new_source: 6.78%
- Возможно объединить для ~10-12% покрытия

---

## 🔧 ИСПРАВЛЕННЫЙ NODE 13

Будет создан новый файл `NODE13_PHONE_EMAIL_MATCH.sql` с правильной логикой:
- Использовать phone/email matching вместо id_source
- Нормализовать телефоны
- COALESCE для множественных вариантов сопоставления

---

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

**До исправления**:
- sk_lead: 9 (0.47%) ❌
- sk_campaign: 0 (0.00%) ❌
- sk_ad: 0 (0.00%) ❌

**После исправления (минимум)**:
- sk_lead: 101+ (5.27%+) ✅
- sk_campaign: ~100+ (через fact_lead_request) ✅
- sk_ad: ~100+ (через fact_lead_request) ✅
- sk_creative: ~100+ (через dim_ad → dim_creative) ✅
- google_keyword: ~100+ (через gclid → stg_google_clicks) ✅

**После нормализации телефонов (потенциально)**:
- sk_lead: ~200-300 (10-15%)
- Полная атрибуция для Google Ads контрактов

---

## 💡 КЛЮЧЕВОЙ ИНСАЙТ

**Цитата пользователя**: "Нам нужно решить точно вопрос атрибуции искать связь через code в crm analytics !"

✅ **НАЙДЕНО**: Связь НЕ через id_source, а через:
1. Phone/email matching
2. JSONB `code` field содержит gclid, fb_lead_id, utm_*
3. fact_lead_request уже содержит правильную атрибуцию

Теперь нужно просто **правильно соединить contract → analytics → fact_lead_request** через phone/email!

---

**СТАТУС**: Готов создавать исправленный NODE 13 с phone/email matching! 🚀
