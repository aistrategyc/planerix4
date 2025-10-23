# 📚 V9 Analytics - Index всех файлов

## 📂 Структура проекта

```
planerix_new/
├── sql/v9/                                    # SQL скрипты V9
│   ├── 01_CREATE_STG_SCHEMA.sql              # 1.0 KB - Создание схемы stg
│   ├── 02_CREATE_STG_TABLES.sql              # 11 KB - 5 таблиц (crm_events, source_attribution, marketing_match, fact_leads, fact_contracts)
│   ├── 03_CREATE_STG_FUNCTIONS.sql           # 18 KB - 6 ETL функций
│   ├── 04_CREATE_ANALYTICS_VIEWS.sql         # 11 KB - 7 analytics views
│   ├── N8N_WORKFLOW_NODES.md                 # 11 KB - Настройка n8n workflow
│   ├── README_V9_DEPLOYMENT.md               # 16 KB - Полная инструкция деплоя
│   ├── QUICK_START.md                        # 2.6 KB - Быстрый старт за 30 минут
│   └── INDEX.md                              # Этот файл
│
├── MASTER_PLAN_V9_ANALYTICS_OCT22.md         # Мастер-план системы
├── V9_ANALYTICS_SUMMARY_OCT22.md             # Финальный summary
│
└── n8nflow/                                  # N8N workflows (будут созданы)
    └── V9_Analytics_ETL_Daily.json           # Экспорт workflow

Total: ~70 KB documentation + SQL
```

---

## 📋 Порядок выполнения

### 1️⃣ Подготовка (Прочитать документацию)

| Файл | Зачем читать | Время |
|------|--------------|-------|
| `V9_ANALYTICS_SUMMARY_OCT22.md` | Общее понимание системы | 10 мин |
| `QUICK_START.md` | Быстрая инструкция деплоя | 5 мин |
| `README_V9_DEPLOYMENT.md` | Детальная инструкция (опционально) | 30 мин |

### 2️⃣ Deployment SQL (Выполнить в PostgreSQL)

| # | Файл | Что делает | Время | Команда |
|---|------|-----------|-------|---------|
| 1 | `01_CREATE_STG_SCHEMA.sql` | Создает схему `stg` | <1s | `\i sql/v9/01_CREATE_STG_SCHEMA.sql` |
| 2 | `02_CREATE_STG_TABLES.sql` | Создает 5 таблиц | ~5s | `\i sql/v9/02_CREATE_STG_TABLES.sql` |
| 3 | `03_CREATE_STG_FUNCTIONS.sql` | Создает 6 функций | ~3s | `\i sql/v9/03_CREATE_STG_FUNCTIONS.sql` |
| 4 | `04_CREATE_ANALYTICS_VIEWS.sql` | Создает 7 views | ~2s | `\i sql/v9/04_CREATE_ANALYTICS_VIEWS.sql` |

**Total deployment time**: ~10 секунд

### 3️⃣ Initial Data Load (Первичное заполнение)

```sql
SELECT * FROM stg.refresh_all_stg_tables();
```

**Time**: 10-30 минут (зависит от объема данных)

### 4️⃣ N8N Workflow Setup

| Файл | Что делать | Время |
|------|-----------|-------|
| `N8N_WORKFLOW_NODES.md` | Настроить workflow по инструкции | 15 мин |

---

## 📖 Справочник по файлам

### SQL Scripts

#### `01_CREATE_STG_SCHEMA.sql`
**Размер**: 1.0 KB
**Что создает**: Схема `stg` в БД
**Зависимости**: Нет
**Output**:
```
CREATE SCHEMA
GRANT USAGE ON SCHEMA stg TO manfromlamp
GRANT CREATE ON SCHEMA stg TO manfromlamp
```

#### `02_CREATE_STG_TABLES.sql`
**Размер**: 11 KB
**Что создает**:
1. `stg.crm_events` - События CRM (45k+ rows)
2. `stg.source_attribution` - Распарсенные источники (45k+ rows)
3. `stg.marketing_match` - Связь с рекламой (12k+ rows)
4. `stg.fact_leads` - Финальные лиды (45k+ rows)
5. `stg.fact_contracts` - Договоры с атрибуцией (9k+ rows)

**Зависимости**: `01_CREATE_STG_SCHEMA.sql` должен быть выполнен
**Output**: 5 tables + 30+ indexes

#### `03_CREATE_STG_FUNCTIONS.sql`
**Размер**: 18 KB
**Что создает**: 6 функций ETL
1. `stg.refresh_stg_crm_events()` - Обновить события CRM
2. `stg.refresh_stg_source_attribution()` - Распарсить источники
3. `stg.refresh_stg_marketing_match()` - Связать с рекламой
4. `stg.refresh_stg_fact_leads()` - Создать финальные лиды
5. `stg.refresh_stg_fact_contracts()` - Создать договоры
6. `stg.refresh_all_stg_tables()` ⭐ - **Главная функция** (вызывает все остальные)

**Зависимости**: `02_CREATE_STG_TABLES.sql`
**Output**: 6 functions

**Использование**:
```sql
-- Обновить все таблицы одной командой
SELECT * FROM stg.refresh_all_stg_tables();
```

#### `04_CREATE_ANALYTICS_VIEWS.sql`
**Размер**: 11 KB
**Что создает**: 7 analytics views
1. `stg.v9_ads_analytics_daily` - Для `/ads` page
2. `stg.v9_contracts_attribution` - Для `/contracts-analytics` page
3. `stg.v9_marketing_funnel_daily` - Для `/data-analytics` page
4. `stg.v9_platform_summary` - Общая статистика платформ
5. `stg.v9_campaign_performance` - Детализация кампаний
6. `stg.v9_lead_source_breakdown` - Анализ источников лидов
7. `stg.v9_daily_overview` - Ежедневный обзор

**Зависимости**: `03_CREATE_STG_FUNCTIONS.sql` + данные должны быть загружены
**Output**: 7 views

---

### Documentation

#### `README_V9_DEPLOYMENT.md`
**Размер**: 16 KB (50+ страниц)
**Содержание**:
- Phase 1: Database setup (detailed)
- Phase 2: Initial data load
- Phase 3: n8n workflow setup
- Phase 4: Backend API implementation (будущее)
- Phase 5: Frontend update (будущее)
- Testing checklist
- Troubleshooting guide
- Monitoring queries

**Кому читать**: DevOps, Backend developers

#### `QUICK_START.md`
**Размер**: 2.6 KB
**Содержание**:
- Checklist для быстрого деплоя за 30 минут
- Минимальные команды без детальных объяснений
- Success criteria

**Кому читать**: Все, кто хочет быстро развернуть систему

#### `N8N_WORKFLOW_NODES.md`
**Размер**: 11 KB
**Содержание**:
- Полная конфигурация n8n workflow
- 6 nodes с настройками
- Schedule trigger (00:30 UTC daily)
- PostgreSQL execute query node
- IF condition для error handling
- Telegram notifications
- Data quality checks
- Monitoring queries

**Кому читать**: DevOps, кто будет настраивать n8n

#### `MASTER_PLAN_V9_ANALYTICS_OCT22.md`
**Размер**: ~30 KB
**Содержание**:
- Executive summary
- Полная архитектура системы
- Data flow diagrams
- Layered approach (staging, fact, analytics)
- Phase-by-phase implementation plan
- Expected results
- Success metrics

**Кому читать**: Product managers, Tech leads, Architects

#### `V9_ANALYTICS_SUMMARY_OCT22.md`
**Размер**: ~20 KB
**Содержание**:
- Краткий summary всей системы
- Что было сделано
- Ключевые особенности
- How to deploy
- Current status
- Timeline
- Success criteria

**Кому читать**: Все stakeholders

---

## 🔍 Quick Reference

### Часто используемые команды

#### Деплой всей системы (10 секунд)
```bash
cd /opt/MONOREPv3
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -f sql/v9/01_CREATE_STG_SCHEMA.sql
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -f sql/v9/02_CREATE_STG_TABLES.sql
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -f sql/v9/03_CREATE_STG_FUNCTIONS.sql
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final -f sql/v9/04_CREATE_ANALYTICS_VIEWS.sql
```

#### Обновить данные
```sql
SELECT * FROM stg.refresh_all_stg_tables();
```

#### Проверить статус
```sql
-- Количество записей
SELECT 'crm_events' as t, COUNT(*) FROM stg.crm_events
UNION ALL SELECT 'fact_leads', COUNT(*) FROM stg.fact_leads
UNION ALL SELECT 'fact_contracts', COUNT(*) FROM stg.fact_contracts;

-- Attribution rate
SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*), 2) as attribution_rate
FROM stg.fact_contracts WHERE contract_day >= '2025-09-01';
```

#### Тестовый запрос к analytics view
```sql
SELECT * FROM stg.v9_ads_analytics_daily WHERE dt >= '2025-10-01' ORDER BY spend DESC LIMIT 5;
```

---

## ✅ Checklist деплоя

- [ ] Прочитал `V9_ANALYTICS_SUMMARY_OCT22.md`
- [ ] Прочитал `QUICK_START.md`
- [ ] Подключился к production БД
- [ ] Выполнил `01_CREATE_STG_SCHEMA.sql` ✓
- [ ] Выполнил `02_CREATE_STG_TABLES.sql` ✓
- [ ] Выполнил `03_CREATE_STG_FUNCTIONS.sql` ✓
- [ ] Выполнил `04_CREATE_ANALYTICS_VIEWS.sql` ✓
- [ ] Проверил созданные объекты (`\dt stg.*`, `\df stg.*`, `\dv stg.*`)
- [ ] Запустил первичное заполнение `SELECT * FROM stg.refresh_all_stg_tables();`
- [ ] Проверил attribution rate (> 80%)
- [ ] Проверил match rate (> 50%)
- [ ] Тестовые запросы к views работают
- [ ] Настроил n8n workflow (см. `N8N_WORKFLOW_NODES.md`)
- [ ] Тестовый запуск n8n workflow успешен
- [ ] Активировал n8n workflow для ежедневного обновления
- [ ] Проверил автоматическое обновление на следующий день

---

## 📞 Помощь

**Проблемы с SQL**: См. раздел Troubleshooting в `README_V9_DEPLOYMENT.md`
**Проблемы с n8n**: См. `N8N_WORKFLOW_NODES.md`
**Общие вопросы**: См. `V9_ANALYTICS_SUMMARY_OCT22.md`

---

## 🎯 Next Steps

После успешного деплоя V9 database layer:

1. **Backend API** (Week 2)
   - Создать новые endpoints `/api/v9/ads/*`
   - Создать новые endpoints `/api/v9/contracts/*`
   - Создать новые endpoints `/api/v9/data/*`

2. **Frontend** (Week 3)
   - Обновить `/ads` page
   - Обновить `/contracts-analytics` page
   - Обновить `/data-analytics` page

3. **Testing** (Week 4)
   - Full QA cycle
   - User acceptance testing
   - Production deployment

---

**Дата создания**: 22 октября 2025
**Версия**: 1.0
**Автор**: Claude Code Assistant
**Статус**: 🟢 READY TO DEPLOY
