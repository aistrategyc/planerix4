# 📁 Индекс Файлов - ITstep Analytics Project

**Обновлено**: 14 октября 2025

---

## 📊 ДОКУМЕНТАЦИЯ (Для чтения)

### Аудит и Отчёты
```
✅ DATABASE_AUDIT_REPORT.md      - Полный аудит архитектуры (ГЛАВНЫЙ ДОКУМЕНТ)
✅ AUDIT_SUMMARY.md              - Краткая сводка аудита (5 минут чтения)
✅ SUCCESS_REPORT.md             - Отчёт о достижениях
✅ SETUP_INSTRUCTIONS.md         - Пошаговая инструкция по setup (выполнено)
```

### Техническая Документация
```
✅ CLAUDE.md                     - Claude Code конфигурация (rules для AI)
✅ AUTHENTICATION_RULES.md       - Правила аутентификации
✅ README.md                     - Общее описание проекта
✅ database-schema.md            - Схема базы данных
✅ DEPLOYMENT_AND_CONFIGURATION_GUIDE.md - Deployment guide
✅ FRONTEND_BACKEND_API_SPECIFICATION.md - API спецификация
```

---

## 🛠️ SQL SCRIPTS (Выполнены)

### Разовое Выполнение (Уже выполнено ✅)
```
✅ ONE_TIME_CLEANUP.sql                   - Очистка и заполнение исторических данных
✅ CREATE_INDEXES_AND_FIRST_REFRESH.sql   - Создание индексов и первый refresh views
```

### Для Workflow (Уже добавлены в n8n ✅)
```
✅ WORKFLOW_crm_marketing_link_upsert.sql - Парсинг code JSONB (gclid, fbclid, UTM)
✅ WORKFLOW_update_fb_lead_id.sql         - Извлечение fb_lead_id из code
✅ WORKFLOW_update_meta_attribution.sql   - Meta attribution через fb_lead_id
✅ WORKFLOW_refresh_v6_views.sql          - Обновление всех v6 materialized views
```

---

## 📦 N8N WORKFLOW FILES (JSON)

### Активные Workflows ✅
```
✅ 1.1 CRM RAW-6.json         - Сбор CRM данных (44 ноды, Active: ✅)
✅ 1.2 Facebook RAW-2.json    - Сбор Facebook данных (39 нод, Active: ✅)
✅ 1.3 GoogleADS RAW.json     - Сбор Google Ads данных (44 ноды, Active: ✅)
```

### Требует Активации ⚠️
```
⚠️ 2 Staging-7.json           - Трансформация данных (28 нод, Active: ❌)
   └─ ДЕЙСТВИЕ: Активировать в n8n!
```

---

## 📂 СТРУКТУРА ПРОЕКТА

```
planerix_new/
├── 📄 Документация (8 файлов)
│   ├── DATABASE_AUDIT_REPORT.md          ⭐ ГЛАВНЫЙ ОТЧЁТ
│   ├── AUDIT_SUMMARY.md                  ⭐ КРАТКАЯ СВОДКА
│   ├── SETUP_INSTRUCTIONS.md
│   ├── SUCCESS_REPORT.md
│   ├── CLAUDE.md
│   ├── AUTHENTICATION_RULES.md
│   ├── README.md
│   └── database-schema.md
│
├── 🗃️ SQL Scripts (6 файлов)
│   ├── ONE_TIME_CLEANUP.sql              ✅ Выполнено
│   ├── CREATE_INDEXES_AND_FIRST_REFRESH.sql ✅ Выполнено
│   ├── WORKFLOW_crm_marketing_link_upsert.sql ✅ В workflow
│   ├── WORKFLOW_update_fb_lead_id.sql    ✅ В workflow
│   ├── WORKFLOW_update_meta_attribution.sql ✅ В workflow
│   └── WORKFLOW_refresh_v6_views.sql     ✅ В workflow
│
├── 📦 n8n Workflows (4 файла)
│   ├── 1.1 CRM RAW-6.json                ✅ Active
│   ├── 1.2 Facebook RAW-2.json           ✅ Active
│   ├── 1.3 GoogleADS RAW.json            ✅ Active
│   └── 2 Staging-7.json                  ⚠️ Нужно активировать!
│
└── 🏗️ Application Code
    ├── apps/web-enterprise/              Next.js frontend
    ├── apps/api/                         FastAPI backend
    ├── docker-compose.dev.yml
    ├── docker-compose.prod.yml
    └── ...
```

---

## 🎯 Назначение Файлов

### Для Менеджера/Владельца Бизнеса
```
→ Читай: AUDIT_SUMMARY.md
   └─ 5 минут чтения
   └─ Все критичные выводы
   └─ Список действий

→ Если нужны детали: DATABASE_AUDIT_REPORT.md
   └─ 15 минут чтения
   └─ Полный аудит архитектуры
   └─ Проверки качества данных
```

### Для Разработчика/Аналитика
```
→ Читай: DATABASE_AUDIT_REPORT.md (полный аудит)
→ Используй: SQL Scripts для исправлений
→ Проверяй: n8n Workflow Files
```

### Для DevOps
```
→ Читай: DEPLOYMENT_AND_CONFIGURATION_GUIDE.md
→ Используй: docker-compose files
→ Следи: n8n workflows активны
```

---

## ✅ Статус Выполнения

### ✅ Завершено (14 октября 2025)

1. ✅ Аудит всех 4 воркфлоу
2. ✅ Проверка 68 таблиц (33 RAW + 35 dashboards)
3. ✅ Анализ потерь данных (0% потерь!)
4. ✅ Проверка Facebook attribution (работает до креатива!)
5. ✅ Проверка Google attribution (работает до campaign)
6. ✅ Создание полного отчёта
7. ✅ Создание краткой сводки
8. ✅ Очистка старых файлов

### ⚠️ Требует Действия

1. ⚠️ Активировать workflow "2 Staging" в n8n (5 минут)

### 📋 Опционально (Можно сделать позже)

1. 📋 Добавить Google Keywords attribution (1-2 часа)
2. 📋 Добавить Google Search Terms (30 минут)
3. 📋 Мигрировать дашборды с v5 на v6 views

---

## 🔍 Быстрый Поиск

**Ищешь инструкцию по setup?**
→ `SETUP_INSTRUCTIONS.md`

**Нужен полный аудит архитектуры?**
→ `DATABASE_AUDIT_REPORT.md`

**Хочешь краткую сводку?**
→ `AUDIT_SUMMARY.md`

**Нужны SQL скрипты для workflow?**
→ `WORKFLOW_*.sql` (4 файла)

**Ищешь workflow definitions?**
→ `*.json` (4 файла)

**Проблема с аутентификацией?**
→ `AUTHENTICATION_RULES.md`

**Нужна схема базы данных?**
→ `database-schema.md`

---

## 📞 Поддержка

Если что-то не работает:

1. Проверь `AUDIT_SUMMARY.md` → раздел "Критичные Действия"
2. Проверь `DATABASE_AUDIT_REPORT.md` → раздел "Troubleshooting"
3. Проверь логи n8n: `n8n → Executions`

---

**Последнее обновление**: 14 октября 2025
**Статус проекта**: ✅ Готов к использованию
**Активных файлов**: 18 (8 docs + 6 SQL + 4 workflows)
