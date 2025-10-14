# 📋 Инструкция: Что Запустить и Как

**Дата**: 14 октября 2025

---

## 🔴 ШАГ 1: Разовое Выполнение (СЕЙЧАС - 5 минут)

### 1.1 Очистка и Заполнение Исторических Данных

**Файл**: `ONE_TIME_CLEANUP.sql`

**Запустить**:
```bash
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -f /Users/Kirill/planerix_new/ONE_TIME_CLEANUP.sql
```

**Что делает**:
- ✅ TRUNCATE crm_marketing_link (удалить старые данные)
- ✅ Заполнить из ВСЕХ исторических данных (без ограничения по дате)
- ✅ Добавить поля fb_lead_id, event_id в fact_leads
- ✅ Заполнить fb_lead_id для всех записей
- ✅ Заполнить Meta attribution через fb_lead_id

**Время**: 2-3 минуты

---

### 1.2 Создать Индексы и Первый Refresh Views

**Файл**: `CREATE_INDEXES_AND_FIRST_REFRESH.sql`

**Запустить**:
```bash
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -f /Users/Kirill/planerix_new/CREATE_INDEXES_AND_FIRST_REFRESH.sql
```

**Что делает**:
- ✅ Удалить старые индексы
- ✅ Создать правильные UNIQUE индексы для v6 views
- ✅ Первое обновление всех v6 views
- ✅ Проверка размеров и количества строк

**Время**: 1-2 минуты

---

## ⚙️ ШАГ 2: Обновить n8n Workflow (10 минут)

### 2.1 Обновить Существующую Ноду

**Нода**: `crm_marketing_link_upsert`

**Где**: n8n → Workflow "2 Staging" → найти ноду

**Заменить весь код на**: `WORKFLOW_crm_marketing_link_upsert.sql`

**Ключевые изменения**:
```sql
-- ✅ Парсит fb_lead_id, fclid (Facebook)
-- ✅ Парсит gbraid, wbraid (Google альтернативы)
-- ✅ Только последние 30 дней (НЕ удаляет старые данные!)
-- ✅ ON CONFLICT DO UPDATE (обновляет, не дублирует)
```

---

### 2.2 Добавить 3 Новые Ноды

#### Нода 1: `update_fb_lead_id`

**Где вставить**: После ноды `fact_leads_upsert`

**Тип**: PostgreSQL

**Код**: `WORKFLOW_update_fb_lead_id.sql`

**Что делает**: Заполняет fb_lead_id из code для новых записей

---

#### Нода 2: `update_meta_attribution`

**Где вставить**: После ноды `update_fb_lead_id`

**Тип**: PostgreSQL

**Код**: `WORKFLOW_update_meta_attribution.sql`

**Что делает**: Заполняет Meta attribution через fb_lead_id

---

#### Нода 3: `refresh_v6_views`

**Где вставить**: В КОНЦЕ workflow (последняя нода)

**Тип**: PostgreSQL

**Код**: `WORKFLOW_refresh_v6_views.sql`

**Что делает**: Обновляет все v6 materialized views

---

### 2.3 Схема Обновлённого Workflow

```
Schedule Trigger (каждый час в :40)
  ↓
[Существующие ноды до crm_marketing_link_upsert...]
  ↓
crm_marketing_link_upsert ← ✅ ОБНОВИТЬ КОД
  ↓
[Существующие ноды...]
  ↓
fact_leads_upsert
  ↓
update_fb_lead_id ← ✅ ДОБАВИТЬ (новая нода #1)
  ↓
update_meta_attribution ← ✅ ДОБАВИТЬ (новая нода #2)
  ↓
update_fact_leads_attribution (уже есть, оставить как есть)
  ↓
[Остальные ноды...]
  ↓
refresh_v6_views ← ✅ ДОБАВИТЬ (новая нода #3, в конце!)
```

---

## ✅ ШАГ 3: Проверка (5 минут)

### 3.1 Проверить что Шаг 1 выполнился успешно

```bash
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -c "
SELECT
  'crm_marketing_link' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN gclid IS NOT NULL THEN 1 END) as gclid,
  COUNT(CASE WHEN fbclid IS NOT NULL THEN 1 END) as fbclid
FROM dashboards.crm_marketing_link

UNION ALL

SELECT
  'fact_leads',
  COUNT(*),
  COUNT(CASE WHEN fb_lead_id IS NOT NULL THEN 1 END),
  COUNT(CASE WHEN meta_creative_id IS NOT NULL THEN 1 END)
FROM dashboards.fact_leads;
"
```

**Ожидается**:
```
table_name          | total  | gclid | fbclid
--------------------|--------|-------|--------
crm_marketing_link  | 1,596  | 46    | 22
fact_leads          | 14,971 | 1,009 | 567
```

---

### 3.2 Проверить Views

```bash
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -c "
SELECT
  matviewname,
  (SELECT COUNT(*) FROM dashboards.v6_lead_to_creative_attribution) as v6_lead,
  (SELECT COUNT(*) FROM dashboards.v6_google_campaign_to_keyword) as v6_google,
  (SELECT COUNT(*) FROM dashboards.v6_meta_campaign_to_creative) as v6_meta
FROM pg_matviews
WHERE schemaname = 'dashboards'
  AND matviewname = 'v6_lead_to_creative_attribution'
LIMIT 1;
"
```

**Ожидается**:
```
matviewname                     | v6_lead | v6_google | v6_meta
--------------------------------|---------|-----------|--------
v6_lead_to_creative_attribution | 25      | 1         | 2
```

---

### 3.3 Тестовый Запуск Workflow

1. Открыть n8n
2. Найти workflow "2 Staging"
3. Нажать **Execute Workflow** (справа вверху)
4. Дождаться завершения (~3-5 минут)
5. Проверить логи - не должно быть ошибок

---

## 📊 ШАГ 4: Проверка Результатов (После Workflow)

### 4.1 Проверить что Новые Данные Обновляются

```bash
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -c "
SELECT
  'Updated Today' as status,
  COUNT(*) as records
FROM dashboards.crm_marketing_link
WHERE row_updated_at::date = CURRENT_DATE

UNION ALL

SELECT
  'Meta Attribution Today',
  COUNT(*)
FROM dashboards.fact_leads
WHERE row_updated_at::date = CURRENT_DATE
  AND meta_campaign_id IS NOT NULL;
"
```

---

### 4.2 Проверить Meta Креативы

```sql
SELECT
  creative_title,
  creative_body,
  leads,
  contracts
FROM dashboards.v6_meta_campaign_to_creative
ORDER BY leads DESC;
```

**Ожидается**: 2 строки с креативами

---

## 🎯 Чек-лист Выполнения

### Разовое (Сделай СЕЙЧАС):
- [ ] Запустить `ONE_TIME_CLEANUP.sql` (2-3 мин)
- [ ] Запустить `CREATE_INDEXES_AND_FIRST_REFRESH.sql` (1-2 мин)
- [ ] Проверить результаты (Шаг 3.1 и 3.2)

### Workflow (Сделай СЕГОДНЯ):
- [ ] Обновить ноду `crm_marketing_link_upsert`
- [ ] Добавить ноду `update_fb_lead_id`
- [ ] Добавить ноду `update_meta_attribution`
- [ ] Добавить ноду `refresh_v6_views`
- [ ] Нажать **Save** в n8n
- [ ] Запустить тестовый запуск (Шаг 3.3)
- [ ] Проверить логи

### Проверка (Через 1 час):
- [ ] Подождать автоматический запуск workflow
- [ ] Проверить что данные обновились (Шаг 4.1)
- [ ] Проверить что views обновились (Шаг 4.2)

---

## 🚨 Если Что-то Пошло Не Так

### Ошибка в Шаге 1:

**Проблема**: "ERROR: column does not exist"

**Решение**:
```bash
# Проверить что поля существуют
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -c "\d dashboards.fact_leads" | grep fb_lead_id
```

Если нет - добавить вручную:
```sql
ALTER TABLE dashboards.fact_leads
  ADD COLUMN IF NOT EXISTS fb_lead_id text,
  ADD COLUMN IF NOT EXISTS event_id text;
```

---

### Ошибка в Workflow:

**Проблема**: Нода упала с ошибкой

**Решение**:
1. Открыть n8n → Executions
2. Найти последний запуск
3. Посмотреть на какой ноде ошибка
4. Проверить что код скопирован полностью (нет обрезанных строк)
5. Проверить что все кавычки правильные

---

### Views Не Обновляются:

**Проблема**: `v6_meta_campaign_to_creative` показывает 0 строк

**Решение**:
```bash
# Обновить вручную
PGPASSWORD='lashd87123kKJSDAH81' psql \
  -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
  -c "REFRESH MATERIALIZED VIEW dashboards.v6_meta_campaign_to_creative;"
```

---

## 📁 Файлы

### Для Разового Запуска (psql):
- `ONE_TIME_CLEANUP.sql` - очистка и заполнение всех данных
- `CREATE_INDEXES_AND_FIRST_REFRESH.sql` - индексы и первый refresh

### Для n8n Workflow:
- `WORKFLOW_crm_marketing_link_upsert.sql` - обновить существующую ноду
- `WORKFLOW_update_fb_lead_id.sql` - новая нода #1
- `WORKFLOW_update_meta_attribution.sql` - новая нода #2
- `WORKFLOW_refresh_v6_views.sql` - новая нода #3

### Для Справки:
- `SETUP_INSTRUCTIONS.md` - этот файл
- `SUCCESS_REPORT.md` - итоговый отчёт

---

## 🎉 После Выполнения

**У тебя будет**:
- ✅ Все исторические данные заполнены
- ✅ Workflow обновляет данные каждый час
- ✅ Meta атрибуция до креатива работает
- ✅ Views обновляются автоматически
- ✅ Можешь строить дашборды!

**Время на всё**: 20 минут (5 разово + 10 workflow + 5 проверка)

---

**Дата создания**: 14 октября 2025
**Статус**: ✅ Готово к выполнению!
