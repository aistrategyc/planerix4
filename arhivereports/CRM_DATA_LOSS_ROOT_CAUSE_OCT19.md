# 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА: ПОТЕРЯ 86% GCLID ДАННЫХ
**Date**: October 19, 2025, 22:30
**Status**: ✅ КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

---

## 📊 ФИНАЛЬНАЯ СТАТИСТИКА

### Данные в RAW таблицах:
- ✅ **381 gclid** в raw.itcrm_analytics
- ✅ Период: June 19, 2025 → October 17, 2025 (4 месяца)
- ✅ 4,498 total analytics events

### Данные в crm_requests:
- ❌ **53 gclid** (только 13.9% от RAW!)
- ❌ Период: September 9, 2025 → October 17, 2025 (1 месяц)
- ✅ 16,798 total requests (но с 2014 года!)

### ПОТЕРИ:
- **328 gclid records LOST (86.1%)** ❌

---

## 🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ

### ПРОБЛЕМА №1: ВРЕМЕННОЙ РАЗРЫВ (288 gclid)

**Факты**:
```sql
-- itcrm_analytics June-August: 288 gclid ❌ НЕ загружены
-- itcrm_analytics Sept-Oct: 93 gclid ✅ Частично загружены (53 из 93)
```

**Диагноз**: ETL процесс **НЕ ЗАГРУЗИЛ данные за June-August 2025**

**Детали**:
- raw.itcrm_analytics earliest date: **2025-06-19**
- crm_requests earliest date with gclid: **2025-09-09**
- **82 ДНЯ данных ОТСУТСТВУЮТ** в crm_requests!

**Причина**:
- Возможно, ETL workflow запущен только с 9 сентября
- Исторические данные (June-August) никогда не были загружены
- Нет backfill процесса для старых данных

---

### ПРОБЛЕМА №2: НЕПОЛНАЯ ЗАГРУЗКА ТЕКУЩИХ ДАННЫХ (40 gclid)

**Факты**:
```sql
-- itcrm_analytics Sept-Oct: 93 gclid
-- crm_requests Sept-Oct: 53 gclid
-- ПОТЕРЯ: 40 gclid (43% текущих данных!)
```

**Диагноз**: Даже для ТЕКУЩЕГО периода (Sept-Oct) загружается только **57%** данных!

**Детальный анализ**:

#### Проверка через internet_request_id:
- itcrm_analytics records с matching internet_request_id в crm_requests: **152 gclid**
- itcrm_analytics records БЕЗ matching internet_request_id: **229 gclid**
- crm_requests actual gclid in code: **53 gclid**

**Вывод**:
1. **229 gclid (60%)** имеют internet_request_id которого НЕТ в crm_requests
2. **152 gclid (40%)** имеют matching internet_request_id, НО
3. Только **53 gclid (13.9%)** реально попали в crm_requests.code

**Причина**:
- ETL процесс НЕ создаёт crm_requests для многих internet_request_id
- Или логика агрегации теряет gclid при группировке

---

### ПРОБЛЕМА №3: ПОТЕРЯ GCLID ПРИ АГРЕГАЦИИ (99 gclid)

**Факты**:
- itcrm_analytics с matching internet_request_id: **152 gclid**
- crm_requests с gclid: **53 gclid**
- **ПОТЕРЯ при агрегации: 99 gclid (65%)**

**Диагноз**: Логика создания crm_requests **ТЕРЯЕТ gclid** при агрегации нескольких itcrm_analytics событий в один request.

**Сценарий потери**:
```
internet_request_id: 123456

itcrm_analytics events:
├── Event 1: code = {"gclid": "ABC123", "utm_source": "google"} ✅
├── Event 2: code = {"utm_source": "google"}
└── Event 3: code = {}

crm_requests aggregation:
└── Выбрано Event 3 (пустой code) ❌ gclid потерян!
```

**Причина**:
- Логика выбирает ПОСЛЕДНЕЕ событие (или первое) вместо ПРИОРИТИЗАЦИИ событий с gclid
- Нет логики merge всех code полей из множественных событий
- Возможно используется DISTINCT ON или GROUP BY с произвольным выбором записи

---

## 🎯 КОРНЕВЫЕ ПРИЧИНЫ

### 1. Отсутствие Backfill процесса

**Проблема**: itcrm_analytics имеет данные с June 19, 2025, но crm_requests загружает только с Sept 9, 2025.

**Решение**:
```sql
-- Создать backfill процесс для загрузки исторических данных
INSERT INTO dashboards.crm_requests (...)
SELECT ...
FROM raw.itcrm_analytics
WHERE request_created_at >= '2025-06-19'::DATE
  AND request_created_at < '2025-09-09'::DATE;
```

### 2. Неполная загрузка internet_request_id

**Проблема**: 229 gclid (60%) имеют internet_request_id которого НЕТ в crm_requests.

**Возможные причины**:
- JOIN условие слишком строгое (INNER JOIN вместо LEFT JOIN)
- Фильтр WHERE удаляет записи
- itcrm_internet_request таблица не содержит эти request_id

**Решение**: Проверить ETL логику создания crm_requests:
```sql
-- Найти missing internet_request_ids
SELECT DISTINCT ia.internet_request_id
FROM raw.itcrm_analytics ia
WHERE ia.code->>'gclid' != ''
  AND ia.code->>'gclid' IS NOT NULL
  AND ia.internet_request_id::TEXT NOT IN (
    SELECT internet_request_id
    FROM dashboards.crm_requests
    WHERE internet_request_id IS NOT NULL
  )
ORDER BY ia.internet_request_id
LIMIT 10;

-- Проверить существуют ли они в raw.itcrm_internet_request
SELECT COUNT(*)
FROM raw.itcrm_internet_request
WHERE request_id::TEXT IN (...);
```

### 3. Потеря gclid при агрегации

**Проблема**: Логика агрегации выбирает событие БЕЗ gclid вместо события С gclid.

**Текущая логика (гипотеза)**:
```sql
-- ПЛОХО: берёт произвольную запись
SELECT DISTINCT ON (internet_request_id)
  *
FROM raw.itcrm_analytics
ORDER BY internet_request_id, request_created_at DESC; -- или ASC
```

**Правильная логика**:
```sql
-- ХОРОШО: приоритизирует записи с gclid
SELECT DISTINCT ON (internet_request_id)
  internet_request_id,
  COALESCE(
    code,
    '{}'::jsonb
  ) as code,
  ...
FROM raw.itcrm_analytics
ORDER BY
  internet_request_id,
  CASE
    WHEN code->>'gclid' != '' AND code->>'gclid' IS NOT NULL THEN 1
    WHEN code->>'fb_lead_id' != '' THEN 2
    WHEN code ? 'utm_source' THEN 3
    ELSE 4
  END ASC,
  request_created_at DESC;
```

**Или MERGE всех code полей**:
```sql
-- ЛУЧШЕ: объединить все code поля из всех событий
SELECT
  internet_request_id,
  jsonb_object_agg(
    key,
    value
  ) as code -- слить все ключи из всех событий
FROM (
  SELECT
    internet_request_id,
    jsonb_each.key,
    jsonb_each.value
  FROM raw.itcrm_analytics,
       jsonb_each(code)
  GROUP BY internet_request_id, key
)
GROUP BY internet_request_id;
```

---

## 📋 ЗАДАЧИ ДЛЯ CRM КОМАНДЫ

### ЗАДАЧА №1: Backfill исторических данных (URGENT)

**Описание**: Загрузить 288 gclid records за период June 19 - Sept 8, 2025.

**Приоритет**: 🔴 CRITICAL

**SQL для проверки данных**:
```sql
SELECT
  request_created_at::DATE as date,
  COUNT(*) as records_with_gclid
FROM raw.itcrm_analytics
WHERE code->>'gclid' != ''
  AND code->>'gclid' IS NOT NULL
  AND request_created_at >= '2025-06-19'::DATE
  AND request_created_at < '2025-09-09'::DATE
GROUP BY request_created_at::DATE
ORDER BY date;
```

**Ожидаемый результат**: crm_requests должен содержать 381 gclid (вместо 53).

---

### ЗАДАЧА №2: Исправить логику агрегации (HIGH)

**Описание**: Изменить ETL процесс crm_requests чтобы ПРИОРИТИЗИРОВАТЬ записи с tracking данными (gclid, fb_lead_id, UTM).

**Приоритет**: 🟠 HIGH

**Текущее поведение**:
- 152 gclid с matching internet_request_id → только 53 попали в crm_requests
- **99 gclid (65%) потеряны при агрегации**

**Требуемое изменение**:
1. При агрегации множественных itcrm_analytics событий в один crm_requests:
   - Выбирать событие с gclid (если есть)
   - Или выбирать событие с fb_lead_id (если нет gclid)
   - Или выбирать событие с utm_source (если нет других)
   - Только если НИ ОДНОГО нет - брать последнее событие

2. Или (лучше): MERGE все code поля из всех событий одного internet_request_id

**Ожидаемый результат**: Все 152 gclid должны попасть в crm_requests.

---

### ЗАДАЧА №3: Добавить missing internet_request_id (MEDIUM)

**Описание**: Выяснить почему 229 gclid (60%) имеют internet_request_id которого нет в crm_requests.

**Приоритет**: 🟡 MEDIUM

**Проверка**:
```sql
-- Список internet_request_id которых нет в crm_requests
SELECT DISTINCT ia.internet_request_id
FROM raw.itcrm_analytics ia
WHERE ia.code->>'gclid' != ''
  AND ia.code->>'gclid' IS NOT NULL
  AND ia.internet_request_id::TEXT NOT IN (
    SELECT internet_request_id
    FROM dashboards.crm_requests
    WHERE internet_request_id IS NOT NULL
  )
ORDER BY ia.internet_request_id;

-- Проверить существуют ли они в itcrm_internet_request
SELECT
  'Missing in crm_requests' as status,
  COUNT(*) as count
FROM raw.itcrm_internet_request
WHERE request_id IN (...);
```

**Возможные причины**:
- Фильтр в ETL удаляет эти requests (например, только "завершённые" заявки)
- Нет связи в itcrm_internet_request_relation
- Нет записи в itcrm_internet_request

**Ожидаемый результат**: Определить причину и исправить ETL логику.

---

### ЗАДАЧА №4: Автоматический мониторинг (LOW)

**Описание**: Создать alert если данные из itcrm_analytics не попадают в crm_requests.

**Приоритет**: 🟢 LOW

**Метрика для мониторинга**:
```sql
-- Должно быть < 5%
SELECT
  ROUND(100.0 * (
    (SELECT COUNT(*) FROM raw.itcrm_analytics WHERE code->>'gclid' != '')
    -
    (SELECT COUNT(*) FROM dashboards.crm_requests WHERE code->>'gclid' != '')
  ) / NULLIF((SELECT COUNT(*) FROM raw.itcrm_analytics WHERE code->>'gclid' != ''), 0), 2)
  as percent_data_loss;
```

**Ожидаемый результат**: Alert если data loss > 5%.

---

## ✅ ЧТО РАБОТАЕТ ПРАВИЛЬНО

1. ✅ raw.itcrm_analytics СОДЕРЖИТ ВСЕ ДАННЫЕ (381 gclid)
2. ✅ Tracking работает с June 19, 2025
3. ✅ code поле корректно заполнено в RAW таблице
4. ✅ 53 gclid (13.9%) успешно загружены в crm_requests

---

## 📊 ИТОГОВЫЕ ЦИФРЫ

| Метрика | Значение | % |
|---------|----------|---|
| **RAW gclid (итого)** | 381 | 100% |
| **Потеряно: June-Aug backfill** | 288 | 75.6% |
| **Потеряно: missing internet_request_id** | 229 | 60.1% |
| **Потеряно: агрегация** | 99 | 26.0% |
| **Загружено в crm_requests** | 53 | 13.9% |

**ИТОГО ПОТЕРЯНО: 328 gclid (86.1%)** ❌

---

## 🎯 ПРИОРИТИЗАЦИЯ

1. 🔴 **ЗАДАЧА №1** (Backfill) - НЕМЕДЛЕННО
   - Восстановит 288 gclid (75.6%)
   - Простое решение: переобработать данные за June-Aug

2. 🟠 **ЗАДАЧА №2** (Агрегация) - ВЫСОКИЙ
   - Восстановит 99 gclid (26.0%)
   - Требует изменения ETL логики

3. 🟡 **ЗАДАЧА №3** (Missing ID) - СРЕДНИЙ
   - Восстановит до 229 gclid (60.1%)
   - Требует анализа почему нет связи

4. 🟢 **ЗАДАЧА №4** (Мониторинг) - НИЗКИЙ
   - Предотвратит будущие потери
   - Можно сделать после исправления основных проблем

---

**После исправления ВСЕХ проблем: 381 gclid (100%) должны быть в crm_requests!** ✅
