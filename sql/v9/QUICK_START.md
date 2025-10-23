# ⚡ V9 Analytics Quick Start

## 🎯 Цель

Быстро развернуть V9 аналитику за 30 минут.

---

## 📝 Checklist (отмечай по ходу)

### Phase 1: Database Setup (15 min)

```bash
# 1. Подключиться к БД
ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
cd /opt/MONOREPv3
```

```sql
-- 2. Подключиться к PostgreSQL
PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final

-- 3. Создать схему
\i sql/v9/01_CREATE_STG_SCHEMA.sql

-- 4. Создать таблицы
\i sql/v9/02_CREATE_STG_TABLES.sql

-- 5. Создать функции
\i sql/v9/03_CREATE_STG_FUNCTIONS.sql

-- 6. Создать views
\i sql/v9/04_CREATE_ANALYTICS_VIEWS.sql

-- 7. Проверить
\dt stg.*     -- Должно быть 5 таблиц
\df stg.*     -- Должно быть 6 функций
\dv stg.*     -- Должно быть 7 views
```

### Phase 2: Initial Data Load (10-30 min)

```sql
-- 8. Запустить full refresh
SELECT * FROM stg.refresh_all_stg_tables();

-- 9. Проверить результаты
SELECT
  'crm_events' as table_name,
  COUNT(*) as rows
FROM stg.crm_events
UNION ALL
SELECT 'fact_leads', COUNT(*) FROM stg.fact_leads
UNION ALL
SELECT 'fact_contracts', COUNT(*) FROM stg.fact_contracts;

-- 10. Проверить attribution rate (должна быть > 80%)
SELECT
  ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*), 2) as attribution_rate
FROM stg.fact_contracts
WHERE contract_day >= '2025-09-01';

-- 11. Тестовый запрос к analytics view
SELECT * FROM stg.v9_ads_analytics_daily
WHERE dt >= '2025-10-01'
ORDER BY spend DESC
LIMIT 5;
```

### Phase 3: n8n Workflow (15 min)

```bash
# 12. Открыть n8n UI
# http://65.108.220.33:5678
```

**13. Создать workflow:**
- Schedule Trigger: `30 0 * * *`
- PostgreSQL Node:
  - Query: `SELECT * FROM stg.refresh_all_stg_tables();`
  - Credentials: PostgreSQL itstep_final
- Activate workflow

**14. Тестовый запуск:**
- Нажать "Test Workflow"
- Проверить что все 5 шагов SUCCESS

---

## ✅ Done!

Если все чеклисты отмечены - V9 система развернута успешно! 🎉

**Следующие шаги**:
1. Проверить автоматическое обновление данных (завтра утром)
2. Обновить backend API (см. README_V9_DEPLOYMENT.md)
3. Обновить frontend pages

**Проблемы?** См. раздел Troubleshooting в README_V9_DEPLOYMENT.md
