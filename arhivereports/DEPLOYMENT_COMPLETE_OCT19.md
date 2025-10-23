# Deployment Complete Report - October 19, 2025

## ✅ ЧТО УСПЕШНО ВЫПОЛНЕНО

### 1. SQL Исправления в БД itstep_final (92.242.60.211:5432)

**Переклассификация fact_leads**:
- ✅ Instagram: 71 лидов переклассифицировано `other/paid_other` → `meta`
- ✅ Google CPC: 39 лидов переклассифицировано `other` → `google`
- ✅ Email: 34 лида теперь имеют `dominant_platform='email'`
- ✅ Telegram: 16 лидов теперь имеют `dominant_platform='telegram'`
- ✅ Viber: 3 лида теперь имеют `dominant_platform='viber'`

**Обновление v8 Views**:
- ✅ `dashboards.v8_platform_daily_full` - полностью переписан с поддержкой всех платформ
- ✅ Добавлено распознавание Instagram через `LOWER(utm_source) LIKE '%instagram%'` и `utm_source = 'ig'`
- ✅ Добавлено распознавание Google CPC через `utm_source = 'google' AND utm_medium IN ('cpc','ppc')`
- ✅ Добавлены новые категории: Email, Telegram, Viber

**Результат в БД**:
```
  platform  | total_leads | total_contracts | total_revenue |  cvr
------------+-------------+-----------------+---------------+-------
 Direct     |       14448 |             386 |   20894884.00 |  2.67
 Google Ads |         155 |              15 |     692740.00 |  9.68
 Meta       |        1068 |               6 |     143665.00 |  0.56
 Email      |          31 |               3 |      67500.00 |  9.68
 Other Paid |          91 |               2 |      11950.00 |  2.20
 Viber      |           3 |               2 |     167040.00 | 66.67
 Telegram   |          16 |               0 |               |  0.00
```

### 2. Backend API Обновления

**Новые Endpoints** (`/data-analytics/v8/contracts/`):
- ✅ `GET /attribution-summary` - общая сводка по атрибуции
- ✅ `GET /by-platform` - контракты по платформам
- ✅ `GET /by-source` - контракты по источникам
- ✅ `GET /timeline` - временная динамика контрактов

**Файлы**:
- ✅ `apps/api/liderix_api/routes/data_analytics/contracts_attribution.py` (270 строк)
- ✅ Использует `get_itstep_session` - правильное подключение к itstep_final DB
- ✅ Зарегистрировано в `__init__.py` под префиксом `/v8/contracts`

### 3. Frontend Обновления

**Новая Страница**:
- ✅ `/contracts-analytics` - полная визуализация контрактов (564 строки)
- ✅ KPI карточки, donut chart, bar chart, timeline, top sources table
- ✅ API client: `apps/web-enterprise/src/lib/api/contracts-attribution.ts` (191 строка)

**Navigation**:
- ✅ Добавлено в sidebar: "Contracts" с badge "New"

### 4. Documentation

**Созданные Документы**:
- ✅ `CRITICAL_FIX_PLAN_OCT19.md` - полный аудит проблем и план исправлений
- ✅ `FIX_FACT_LEADS_INSTAGRAM_OCT19.sql` - SQL скрипт исправлений (395 строк)
- ✅ `N8N_WORKFLOW_FIX_INSTRUCTIONS_OCT19.md` - инструкции по обновлению n8n (418 строк)

### 5. Production Deployment

- ✅ Код закоммичен в git: `commit 524da6e`
- ✅ Запушен в GitHub: `develop` branch
- ✅ Задеплоен на production сервер: `65.108.220.33:/opt/MONOREPv3`
- ✅ Контейнеры перезапущены БЕЗ КЕША: `docker-compose down && up --build --force-recreate`
- ✅ API Health Check: ✅ HEALTHY

## ⚠️ КРИТИЧЕСКИЕ ПРОБЛЕМЫ ОБНАРУЖЕНЫ

### Проблема 1: N8N Workflow НЕ ОБНОВЛЁН ❌

**Симптом**: Новые Instagram лиды продолжают классифицироваться как 'google' вместо 'meta'

**Пример из БД**:
```
         utm_source          | dominant_platform | leads
-----------------------------+-------------------+-------
 instagram_reels             | google            |    22  ❌ НЕПРАВИЛЬНО
 instagram_feed              | google            |    17  ❌ НЕПРАВИЛЬНО
 instagram_stories           | google            |    10  ❌ НЕПРАВИЛЬНО
 instagram_feed              | meta              |    27  ✅ ПРАВИЛЬНО (старые данные)
```

**Причина**: n8n workflow "2 dashboards" продолжает использовать СТАРУЮ логику определения `dominant_platform`

**Решение**: Обновить 3 nodes в n8n согласно инструкциям в `N8N_WORKFLOW_FIX_INSTRUCTIONS_OCT19.md`:
1. Node `lead_marketing_enriched` (ID: `95d95764-025e-4dd1-88eb-a59ea83f3d69`)
2. Node `Полностью обновить fact_leads (UTM + ключи + креативы)`
3. Node `dashboards.fact_leads(additional platform)` (ID: `0daebffb-a531-4395-99d0-7c5a7b5fbe2a`)

**Срочность**: 🔴 КРИТИЧЕСКАЯ - Каждый день теряются новые Instagram лиды

### Проблема 2: Production Login Не Работает ❌

**Симптом**: `POST /api/auth/login` возвращает ошибку валидации JSON

**Ответ API**:
```json
{
  "detail": {
    "type": "urn:problem:validation-error",
    "title": "Validation Error",
    "detail": "Request validation failed",
    "status": 422,
    "errors": [{"type": "json_invalid", "loc": ["body", 51], "msg": "JSON decode error"}]
  }
}
```

**Причина**: Неизвестна - требует отдельного расследования

**Срочность**: 🔴 КРИТИЧЕСКАЯ - Невозможно протестировать API endpoints без авторизации

## 📋 TODO: ОБЯЗАТЕЛЬНЫЕ СЛЕДУЮЩИЕ ШАГИ

### Шаг 1: Обновить N8N Workflow (СРОЧНО!)

1. Войти в n8n: https://n8n.yourdomain.com
2. Открыть workflow "2 dashboards"
3. Обновить 3 nodes согласно `N8N_WORKFLOW_FIX_INSTRUCTIONS_OCT19.md`
4. Сохранить и активировать workflow
5. Запустить вручную для проверки
6. Проверить что новые Instagram лиды классифицируются как 'meta'

**Проверочный SQL** (после обновления n8n):
```sql
-- Должны быть ТОЛЬКО meta, НЕ google
SELECT
  utm_source,
  dominant_platform,
  COUNT(*) as leads,
  MAX(created_date_txt::date) as latest_date
FROM dashboards.fact_leads
WHERE (LOWER(utm_source) LIKE '%instagram%' OR utm_source = 'ig')
  AND created_date_txt::date >= CURRENT_DATE - 7  -- последние 7 дней
GROUP BY utm_source, dominant_platform
ORDER BY latest_date DESC;
```

Ожидаемый результат: `dominant_platform = 'meta'` для ВСЕХ Instagram лидов

### Шаг 2: Исправить Production Login

1. Проверить API логи: `docker logs planerix-api-prod --tail=100`
2. Проверить environment variables в `docker-compose.prod.yml`
3. Протестировать локально: `curl -X POST http://localhost:8001/api/auth/login ...`
4. Исправить и задеплоить fix

### Шаг 3: Протестировать Contracts Endpoints

После исправления login:
```bash
# 1. Get token
TOKEN=$(curl -s -X POST 'https://app.planerix.com/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"itstep@itstep.com","password":"ITstep2025!"}' | jq -r '.access_token')

# 2. Test contracts by platform
curl -s -G 'https://app.planerix.com/api/data-analytics/v8/contracts/by-platform' \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "date_from=2025-09-01" \
  --data-urlencode "date_to=2025-10-19" | jq '.'
```

Ожидаемый результат: Meta должен показать 6 контрактов, ₴143,665 revenue

### Шаг 4: Протестировать Frontend

1. Открыть https://app.planerix.com/contracts-analytics
2. Убедиться что страница загружается
3. Проверить что данные отображаются корректно
4. Проверить что Meta показывает 6 контрактов

## 📊 МЕТРИКИ УСПЕХА

### До Исправлений:
- Meta contracts: **0** ❌
- Instagram лиды: **57** классифицированы как 'other' ❌
- Email/Telegram/Viber: **НЕТ категорий** ❌
- Потерянные контракты: **2 Instagram** ❌

### После Исправлений (Historical Data):
- Meta contracts: **6** (₴143,665) ✅
- Instagram лиды: **71** переклассифицированы в 'meta' ✅
- Email: **34 лида**, 3 контракта ✅
- Telegram: **16 лидов**, 0 контрактов ✅
- Viber: **3 лида**, 2 контракта ✅

### Осталось Исправить (N8N Workflow):
- Новые Instagram лиды: **49 лидов** продолжают классифицироваться неправильно ❌
- Требуется обновление n8n workflow ⏳

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Базы Данных:
1. **liderixapp** (на planerix-postgres-prod) - база Planerix приложения (CRM, Tasks, Users)
2. **itstep_final** (на 92.242.60.211:5432) - клиентская база ITstep с аналитикой

### API Подключения:
- Endpoints `/data-analytics/v8/*` используют `get_itstep_session` → itstep_final DB ✅
- Остальные endpoints используют `get_db_session` → liderixapp DB ✅

### Git Status:
- Branch: `develop`
- Last commit: `524da6e` - "fix(analytics): Critical Instagram/Email/Telegram classification fix + v8 contracts attribution"
- Files changed: 9 files, +2018 lines, -211 lines

## 📞 КОНТАКТЫ И РЕСУРСЫ

- **Production Server**: `root@65.108.220.33` (SSH key: `~/.ssh/id_ed25519_hetzner`)
- **Production URL**: https://app.planerix.com
- **Database Host**: 92.242.60.211:5432
- **Database Name**: itstep_final
- **Database User**: manfromlamp
- **N8N**: https://n8n.yourdomain.com (требуется настройка)

## ⏰ ВРЕМЕННЫЕ МЕТКИ

- SQL исправления применены: **October 19, 2025 17:30 UTC**
- Production deployment: **October 19, 2025 17:45 UTC**
- Контейнеры перезапущены: **October 19, 2025 17:46 UTC**
- Проверка завершена: **October 19, 2025 17:50 UTC**

---

## ИТОГО

### ✅ Выполнено:
1. Исправлены historical данные в fact_leads
2. Обновлены v8 views для поддержки всех платформ
3. Созданы новые API endpoints для contracts attribution
4. Создана frontend страница /contracts-analytics
5. Задеплоено на production сервер

### ❌ Требуется Доработка:
1. **СРОЧНО**: Обновить n8n workflow (новые Instagram лиды неправильно классифицируются)
2. **СРОЧНО**: Исправить production login (невозможно протестировать API)
3. Протестировать contracts endpoints после исправления login
4. Протестировать frontend страницу с реальными данными

### 📈 Результат:
- Meta contracts восстановлено: 0 → 6 контрактов
- Instagram attribution исправлена (для historical data)
- Все платформы теперь видны: Direct, Google Ads, Meta, Email, Telegram, Viber
- **НО**: Новые лиды продолжают классифицироваться неправильно до обновления n8n

---

*Report Generated: October 19, 2025*
*Author: Claude Code*
*Status: PARTIALLY COMPLETE - N8N UPDATE REQUIRED*
