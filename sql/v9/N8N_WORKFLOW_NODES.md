# N8N Workflow: V9 Analytics ETL Pipeline

## 📋 Overview

**Цель**: Ежедневное обновление stg таблиц из raw схемы (00:30 UTC каждую ночь)

**Схема работы**:
```
Schedule (00:30 UTC)
  → PostgreSQL Execute: refresh_all_stg_tables()
  → Check Results
  → Send Notification (Telegram/Email)
```

---

## 🔧 N8N Nodes Configuration

### Node 1: Schedule Trigger ⏰

**Тип**: Schedule Trigger
**Название**: "Daily at 00:30 UTC"

**Настройки**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "cronExpression",
        "expression": "30 0 * * *"
      }
    ]
  },
  "triggerTimes": {
    "mode": "everyX",
    "value": 1,
    "unit": "days"
  }
}
```

**Описание**: Запускает workflow каждый день в 00:30 UTC

---

### Node 2: PostgreSQL - Refresh STG Tables 🗃️

**Тип**: Postgres
**Название**: "Refresh All STG Tables"

**Настройки**:

**Credentials**: `PostgreSQL itstep_final`
- Host: `92.242.60.211`
- Port: `5432`
- Database: `itstep_final`
- User: `manfromlamp`
- Password: `lashd87123kKJSDAH81`
- SSL: `disable`

**Operation**: `Execute Query`

**Query**:
```sql
SELECT * FROM stg.refresh_all_stg_tables();
```

**Query Parameters**: `None`

**Описание**: Вызывает главную функцию обновления всех stg таблиц

**Expected Output** (пример):
```json
[
  {
    "step_name": "1. CRM Events",
    "rows_processed": 45231,
    "execution_time_ms": 12450,
    "status": "SUCCESS"
  },
  {
    "step_name": "2. Source Attribution",
    "rows_processed": 45231,
    "execution_time_ms": 8320,
    "status": "SUCCESS"
  },
  {
    "step_name": "3. Marketing Match",
    "rows_processed": 12456,
    "execution_time_ms": 5210,
    "status": "SUCCESS"
  },
  {
    "step_name": "4. Fact Leads",
    "rows_processed": 45231,
    "execution_time_ms": 3540,
    "status": "SUCCESS"
  },
  {
    "step_name": "5. Fact Contracts",
    "rows_processed": 8923,
    "execution_time_ms": 2890,
    "status": "SUCCESS"
  }
]
```

---

### Node 3: Check for Errors 🔍

**Тип**: IF (Condition)
**Название**: "Check All Steps Success"

**Настройки**:

**Conditions**:
```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.status }}",
        "operation": "equal",
        "value2": "SUCCESS"
      }
    ]
  },
  "combineOperation": "all"
}
```

**Route Options**:
- **TRUE Branch**: Все шаги успешны → Send Success Notification
- **FALSE Branch**: Есть ошибки → Send Error Alert

---

### Node 4A: Success Notification ✅

**Тип**: HTTP Request (Telegram)
**Название**: "Send Success to Telegram"

**Настройки**:

**Method**: POST
**URL**: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage`

**Body** (JSON):
```json
{
  "chat_id": "<YOUR_CHAT_ID>",
  "text": "✅ V9 Analytics ETL успешно завершен\n\n{{ $('Refresh All STG Tables').all().map(item => `${item.json.step_name}: ${item.json.rows_processed} rows (${item.json.execution_time_ms}ms)`).join('\n') }}\n\nВсего время: {{ $('Refresh All STG Tables').all().reduce((sum, item) => sum + item.json.execution_time_ms, 0) }}ms",
  "parse_mode": "HTML"
}
```

**Example Message**:
```
✅ V9 Analytics ETL успешно завершен

1. CRM Events: 45231 rows (12450ms)
2. Source Attribution: 45231 rows (8320ms)
3. Marketing Match: 12456 rows (5210ms)
4. Fact Leads: 45231 rows (3540ms)
5. Fact Contracts: 8923 rows (2890ms)

Всего время: 32410ms
```

---

### Node 4B: Error Alert 🚨

**Тип**: HTTP Request (Telegram)
**Название**: "Send Error Alert"

**Настройки**:

**Method**: POST
**URL**: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage`

**Body** (JSON):
```json
{
  "chat_id": "<YOUR_CHAT_ID>",
  "text": "🚨 ОШИБКА V9 Analytics ETL!\n\nФайл: {{ $json.step_name }}\nСтатус: {{ $json.status }}\n\nПроверьте логи PostgreSQL!",
  "parse_mode": "HTML"
}
```

---

### Node 5: Log to Database 📝

**Тип**: Postgres
**Название**: "Log ETL Execution"

**Query**:
```sql
INSERT INTO stg.etl_logs (
  workflow_name,
  execution_date,
  total_rows_processed,
  execution_time_ms,
  status,
  details
)
VALUES (
  'v9_analytics_etl',
  CURRENT_TIMESTAMP,
  {{ $('Refresh All STG Tables').all().reduce((sum, item) => sum + item.json.rows_processed, 0) }},
  {{ $('Refresh All STG Tables').all().reduce((sum, item) => sum + item.json.execution_time_ms, 0) }},
  '{{ $('Check All Steps Success').item.json.status }}',
  '{{ JSON.stringify($('Refresh All STG Tables').all()) }}'::jsonb
);
```

**Описание**: Логирует выполнение ETL для мониторинга

---

## 📊 Дополнительный Node: Data Quality Check

### Node 6: Data Quality Validation ✔️

**Тип**: Postgres
**Название**: "Check Data Quality"

**Query**:
```sql
WITH quality_checks AS (
  -- Check 1: Attribution rate должна быть > 80%
  SELECT
    'attribution_rate' as check_name,
    ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*), 2) as value,
    80.0 as threshold,
    CASE
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE dominant_platform IS NOT NULL) / COUNT(*), 2) >= 80 THEN 'PASS'
      ELSE 'FAIL'
    END as status
  FROM stg.fact_contracts
  WHERE contract_day >= CURRENT_DATE - 7

  UNION ALL

  -- Check 2: Количество лидов должно быть > 0
  SELECT
    'daily_leads',
    COUNT(*)::numeric,
    0.0,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END
  FROM stg.fact_leads
  WHERE lead_day = CURRENT_DATE - 1

  UNION ALL

  -- Check 3: Match rate должна быть > 50%
  SELECT
    'match_rate',
    ROUND(100.0 * COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) / COUNT(*), 2),
    50.0,
    CASE
      WHEN ROUND(100.0 * COUNT(*) FILTER (WHERE matched_platform IS NOT NULL) / COUNT(*), 2) >= 50 THEN 'PASS'
      ELSE 'FAIL'
    END
  FROM stg.fact_leads
  WHERE lead_day >= CURRENT_DATE - 7
)
SELECT * FROM quality_checks;
```

**Expected Output**:
```json
[
  {
    "check_name": "attribution_rate",
    "value": 87.5,
    "threshold": 80.0,
    "status": "PASS"
  },
  {
    "check_name": "daily_leads",
    "value": 245,
    "threshold": 0,
    "status": "PASS"
  },
  {
    "check_name": "match_rate",
    "value": 68.3,
    "threshold": 50.0,
    "status": "PASS"
  }
]
```

---

## 🗃️ Создание таблицы для логов (опционально)

```sql
-- Создать таблицу для логирования ETL процессов
CREATE TABLE IF NOT EXISTS stg.etl_logs (
  id SERIAL PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_rows_processed BIGINT,
  execution_time_ms INTEGER,
  status VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_etl_logs_workflow ON stg.etl_logs (workflow_name);
CREATE INDEX idx_etl_logs_execution_date ON stg.etl_logs (execution_date);

COMMENT ON TABLE stg.etl_logs IS 'V9: Логи выполнения ETL процессов n8n';
```

---

## 🔄 Полная схема Workflow (визуальная)

```
┌─────────────────────────┐
│  Schedule Trigger       │
│  (Daily 00:30 UTC)      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  PostgreSQL Execute     │
│  refresh_all_stg_tables │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Check All Steps        │
│  Success?               │
└─────┬─────────────┬─────┘
      │             │
   [TRUE]        [FALSE]
      │             │
      ▼             ▼
┌──────────┐  ┌──────────┐
│ Success  │  │  Error   │
│ Telegram │  │  Alert   │
└────┬─────┘  └────┬─────┘
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────────┐
│  Data Quality Check     │
│  (Optional)             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Log to Database        │
│  stg.etl_logs           │
└─────────────────────────┘
```

---

## 🧪 Тестирование Workflow

### Ручной запуск для тестирования:

1. **Проверить функцию напрямую в PostgreSQL**:
```sql
SELECT * FROM stg.refresh_all_stg_tables();
```

2. **Проверить результаты**:
```sql
-- Проверить количество записей
SELECT
  'crm_events' as table_name,
  COUNT(*) as row_count
FROM stg.crm_events
UNION ALL
SELECT 'fact_leads', COUNT(*) FROM stg.fact_leads
UNION ALL
SELECT 'fact_contracts', COUNT(*) FROM stg.fact_contracts;

-- Проверить свежесть данных
SELECT
  MAX(loaded_at) as last_update
FROM stg.crm_events;
```

3. **Запустить workflow вручную в n8n** (кнопка "Test Workflow")

4. **Проверить логи**:
```sql
SELECT * FROM stg.etl_logs ORDER BY execution_date DESC LIMIT 10;
```

---

## 📈 Мониторинг и алерты

### Создать view для мониторинга:

```sql
CREATE OR REPLACE VIEW stg.etl_monitoring AS
SELECT
  workflow_name,
  execution_date,
  total_rows_processed,
  ROUND(execution_time_ms / 1000.0, 2) as execution_time_seconds,
  status,
  CASE
    WHEN execution_time_ms > 60000 THEN '⚠️ SLOW'
    WHEN status != 'SUCCESS' THEN '🚨 ERROR'
    ELSE '✅ OK'
  END as health_status
FROM stg.etl_logs
WHERE execution_date >= CURRENT_DATE - 7
ORDER BY execution_date DESC;

-- Использование:
SELECT * FROM stg.etl_monitoring;
```

---

## 🎯 Success Criteria

ETL считается успешным если:
- ✅ Все 5 шагов выполнены со статусом SUCCESS
- ✅ Attribution rate > 80%
- ✅ Match rate > 50%
- ✅ Execution time < 60 секунд
- ✅ Количество лидов за вчера > 0

---

## 📞 Support

При проблемах с ETL:
1. Проверить логи: `SELECT * FROM stg.etl_logs ORDER BY execution_date DESC LIMIT 1;`
2. Проверить PostgreSQL logs: `docker logs planerix-postgres-prod`
3. Проверить n8n logs: UI → Executions → Last failed execution
4. Запустить ручной refresh: `SELECT * FROM stg.refresh_all_stg_tables();`

---

**Дата создания**: 22 октября 2025
**Автор**: Claude Code Assistant
**Версия**: 1.0
