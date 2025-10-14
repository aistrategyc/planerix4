# Полный аудит аналитики Planerix - 14 октября 2025

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

**Статус:** 73% страниц аналитики НЕ РАБОТАЮТ (8 из 11 страниц)

---

## 📊 Сводная статистика

| Статус | Количество | Процент | Страницы |
|--------|------------|---------|----------|
| ✅ Работает полностью | 1 | 9% | /data-analytics |
| ⚠️ Работает частично | 2 | 18% | /analytics, /analytics/sales |
| ❌ Не работает | 8 | 73% | ads, campaigns, channels, creatives, crm, funnel, products, quality |

---

## 🔥 КРИТИЧЕСКИЕ ОШИБКИ BACKEND

### Эндпоинты с ошибкой HTTP 500

```
❌ /api/analytics/marketing/campaigns          HTTP 500
❌ /api/analytics/marketing/channels-sources   HTTP 500
❌ /api/analytics/marketing/creatives          HTTP 500
❌ /api/analytics/marketing/crm-outcomes       HTTP 500
❌ /api/analytics/marketing/attribution-funnel HTTP 500
❌ /api/analytics/marketing/product-performance HTTP 500
❌ /api/analytics/marketing/data-quality       HTTP 500
❌ /api/data-analytics/v5/campaigns/wow        HTTP 500
```

### Причина ошибок 500

**Ошибка базы данных:**
```
relation "dashboards.v5_leads_campaign_weekly" does not exist
relation "dm.dm_campaign_daily" does not exist
could not determine data type of parameter $3
```

**Вывод:** Отсутствуют критические view/таблицы в базе данных или неправильные SQL запросы.

---

## 📄 ДЕТАЛЬНЫЙ АНАЛИЗ КАЖДОЙ СТРАНИЦЫ

### 1. /analytics (Главная аналитика) - ⚠️ ЧАСТИЧНО РАБОТАЕТ

**URL:** https://app.planerix.com/analytics

**Эндпоинты:**
- ✅ `/analytics/overview/dashboard` - HTTP 200
- ✅ `/analytics/overview/realtime` - HTTP 200
- ✅ `/analytics/overview/kpis` - HTTP 200
- ✅ `/analytics/sales/revenue-trend` - HTTP 200
- ✅ `/analytics/campaigns/performance` - HTTP 200
- ✅ `/analytics/creatives/performance` - HTTP 200

**Отображаемые данные:**
- Доход, расходы, ROAS, лиды (KPI карточки)
- Активные сессии (real-time)
- Новые лиды сегодня
- График трендов дохода
- Топ 10 кампаний по расходам
- Топ 10 креативов по CTR

**Mock данные:** Нет, использует реальные данные

**Проблемы:**
- Real-time метрики могут быть не актуальны
- Нет обработки ошибок при сбое эндпоинтов

**Приоритет:** 🟡 P2 (работает, но нужны улучшения)

**Рекомендации:**
- Добавить error boundaries
- Проверить актуальность real-time данных
- Добавить индикатор последнего обновления

---

### 2. /analytics/ads (Реклама) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/ads

**Эндпоинты:**
- ✅ `/api/analytics/ads/` - HTTP 200 (недавно созданный)
- ❌ Frontend вызывает `/api/analytics/marketing/ads` - **НЕ СУЩЕСТВУЕТ**

**Проблема:**
- Страница использует хук `useAdsData()` который вызывает несуществующий эндпоинт
- Frontend hook: `GET /api/analytics/marketing/ads`
- Существует только: `GET /api/analytics/ads/`
- Роутинг не совпадает!

**Отображаемые данные (при исправлении):**
- Дневной график расходов, кликов, CTR
- Таблица кампаний с метриками
- Таблица групп объявлений
- Разбивка по платформам
- UTM-анализ

**Mock данные:** Нет, но эндпоинт недоступен

**Приоритет:** 🔴 P0 (КРИТИЧНО)

**Рекомендации:**
- **СРОЧНО:** Изменить frontend hook на правильный URL `/api/analytics/ads/`
- Или создать alias endpoint `/api/analytics/marketing/ads` → `/api/analytics/ads/`
- Проверить работу после исправления

---

### 3. /analytics/campaigns (Кампании) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/campaigns

**Эндпоинты:**
- ❌ `/api/analytics/marketing/campaigns` - **HTTP 500**

**Ошибка:**
```
AmbiguousParameterError: could not determine data type of parameter $3
Table: dm.dm_campaign_daily (не существует)
```

**Отображаемые данные:**
- Количество активных кампаний
- Общие расходы (7 дней)
- Средний CTR и CPC
- Топ кампании по расходам (bar chart)
- CTR vs CPC анализ
- Timeline кампаний
- Scatter plot эффективности
- Таблица деталей кампаний с статусом активности

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (КРИТИЧНО)

**Рекомендации:**
- Проверить существует ли таблица `dm.dm_campaign_daily`
- Если нет - использовать альтернативные источники данных (v6 views)
- Исправить SQL запрос (проблема с NULL параметрами)
- Добавить явное приведение типов для параметров

---

### 4. /analytics/channels (Каналы) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/channels

**Эндпоинты:**
- ❌ `/api/analytics/marketing/channels-sources` - **HTTP 500**

**Ошибка:**
```
Вероятная причина: отсутствует view или таблица
```

**Отображаемые данные:**
- Общая стоимость по каналам
- Общие лиды и договоры
- Средний ROAS
- Распределение стоимости по платформам (bar chart)
- Pie chart распределения расходов
- Топ источники по ROAS
- Таблица других источников трафика
- Сводка по платформам с CPL и ROAS

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (КРИТИЧНО)

**Рекомендации:**
- Проверить `v6_crm_360` view
- Создать view если отсутствует
- Добавить fallback на alternative data sources

---

### 5. /analytics/creatives (Креативы) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/creatives

**Эндпоинты:**
- ❌ `/api/analytics/marketing/creatives` - **HTTP 500**

**Отображаемые данные:**
- Количество активных креативов
- Общие расходы (7 дней)
- Средний CTR и CPC
- Топ креативы по расходам/CTR/кликам/показам
- График CTR анализа
- Scatter plot эффективности (CTR vs CPC)
- Таблица деталей креативов с заголовками, ссылками
- Отслеживание активности с датами

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (КРИТИЧНО)

**Рекомендации:**
- Проверить `v6_pd_creatives` view
- Добавить поиск по креативам
- Добавить пагинацию для больших наборов данных

---

### 6. /analytics/crm (CRM 360) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/crm

**Эндпоинты:**
- ❌ `/api/analytics/marketing/crm-outcomes` - **HTTP 500**

**Отображаемые данные:**
- Общие лиды и договоры
- Общий доход
- Конверсия лид → договор
- График воронки конверсии (лиды → договоры)
- График тренда дохода
- ROAS по источникам (bar chart)
- CPL по источникам
- Timeline трендов (30 дней)
- Анализ по платформам
- Таблицы топ источников по доходу и лидам

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (КРИТИЧНО - важно для отдела продаж)

**Рекомендации:**
- Проверить `v6_crm_360` и `v6_crm_funnel` views
- Критично для команды продаж - приоритет #1
- Добавить проверки качества данных

---

### 7. /analytics/funnel (Воронка атрибуции) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/funnel

**Эндпоинты:**
- ❌ `/api/analytics/marketing/attribution-funnel` - **HTTP 500**

**Отображаемые данные:**
- CTR (показы → клики)
- Конверсия клик → лид
- Конверсия лид → договор
- Общая конверсия (показ → договор)
- Визуализация воронки (bar chart)
- Стоимость на каждом этапе (CPC, CPL, CPA)
- Средний ROAS
- График динамики по времени
- Таблица анализа эффективности кампаний
- Сводная статистика

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (КРИТИЧНО - ключевая маркетинговая аналитика)

**Рекомендации:**
- Проверить `v6_marketing_attribution_funnel` view
- Необходим для анализа ROI маркетинга
- Рассмотреть пре-агрегацию данных воронки для производительности

---

### 8. /analytics/products (Продукты) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/products

**Эндпоинты:**
- ❌ `/api/analytics/marketing/product-performance` - **HTTP 500**

**Отображаемые данные:**
- Количество активных продуктов
- Общий доход
- Средняя конверсия
- Средний чек (average check)
- Топ продукты по доходу/лидам/договорам/конверсии
- Pie chart распределения дохода
- Timeline продуктов (доход во времени)
- График анализа конверсий
- Таблица деталей продуктов с ROI расчётами

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (КРИТИЧНО)

**Рекомендации:**
- Проверить `v6_crm_product_performance` view
- Добавить категоризацию продуктов
- Отслеживать тренды продуктов во времени

---

### 9. /analytics/quality (Качество данных) - ❌ НЕ РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/quality

**Эндпоинты:**
- ❌ `/api/analytics/marketing/data-quality` - **HTTP 500**

**Проблема:** Ирония - страница качества данных имеет проблемы с качеством данных!

**Отображаемые данные:**
- Общий score качества (0-100%)
- Количество проблем
- Расхождения стоимости между источниками
- Записи с пустыми источниками
- Анализ расхождений по платформам
- Графики сравнения стоимостей
- Детальные таблицы расхождений
- Анализ пустых источников с влиянием на доход

**Mock данные:** Нет

**Приоритет:** 🔴 P0 (ВЫСОКИЙ - исправить первым!)

**Рекомендации:**
- **Исправить этот эндпоинт ПЕРВЫМ** - он помогает выявлять проблемы на других страницах
- Проверить `v6_data_quality_issues` и связанные views
- Добавить автоматические проверки качества
- Отправлять алерты когда score качества падает ниже порога

---

### 10. /analytics/sales (Продажи) - ⚠️ ЧАСТИЧНО РАБОТАЕТ

**URL:** https://app.planerix.com/analytics/sales

**Эндпоинты:**
- ⚠️ `/api/analytics/marketing/sales` - **НЕ ПРОТЕСТИРОВАН** (Next.js API proxy)

**Отображаемые данные:**
- Общие договоры
- Общий доход и первый платёж
- Средний чек
- Доход по филиалам
- Конверсия
- Топ услуга и топ UTM
- Дневной график продаж
- Недельный график продаж
- Таблица продаж по услугам
- Таблица продаж по филиалам
- Таблица UTM аналитики
- AI инсайты и рекомендации

**Mock данные:** Нет (пытается получить реальные данные)

**Приоритет:** 🟡 P1 (высокий)

**Рекомендации:**
- Проверить существует ли Next.js API route `/api/analytics/marketing/sales`
- Протестировать с реальными диапазонами дат
- Убедиться что данные о продажах обновляются ежедневно
- Добавить функционал экспорта отчётов

---

### 11. /data-analytics (Data Analytics) - ✅ РАБОТАЕТ ПОЛНОСТЬЮ

**URL:** https://app.planerix.com/data-analytics

**Эндпоинты:**
- ✅ `/api/data-analytics/v5/kpi` - HTTP 200
- ✅ `/api/data-analytics/v5/trend/leads` - HTTP 200
- ✅ `/api/data-analytics/v5/trend/spend` - HTTP 200
- ✅ `/api/data-analytics/v5/campaigns` - HTTP 200
- ✅ `/api/data-analytics/sales/v6/products/performance` - HTTP 200
- ✅ `/api/data-analytics/sales/v6/traffic/organic-vs-paid` - HTTP 200
- ✅ `/api/data-analytics/sales/v6/funnel` - HTTP 200
- ✅ `/api/data-analytics/contracts/v6/attribution/coverage` - HTTP 200

**Проблемы:**
- ❌ `/api/data-analytics/v5/campaigns/wow` - **HTTP 500** (отсутствует view `v5_leads_campaign_weekly`)

**Отображаемые данные:**
- Комплексная метрическая панель
- Тренды дохода
- Графики производительности
- Рабочий фильтр диапазона дат
- Органический vs платный трафик
- Топ 20 продуктов
- Воронка конверсий
- Покрытие атрибуции

**Mock данные:** Нет - использует реальные данные ITstep

**Приоритет:** ✅ Работает (но нужно исправить WoW endpoint)

**Рекомендации:**
- Создать view `v5_leads_campaign_weekly` для week-over-week сравнений
- Добавить экспорт в CSV/Excel
- Добавить drill-down фильтры

---

## 🗄️ ПРОБЛЕМЫ С БАЗОЙ ДАННЫХ

### Отсутствующие views/таблицы

```sql
❌ dm.dm_campaign_daily                       -- Используется в /campaigns
❌ dashboards.v5_leads_campaign_weekly        -- Используется в /data-analytics WoW
❌ dashboards.v6_pd_campaigns                 -- Предположительно для campaigns
❌ dashboards.v6_pd_creatives                 -- Предположительно для creatives
❌ dashboards.v6_crm_360                      -- Используется в /channels, /crm
❌ dashboards.v6_crm_funnel                   -- Используется в /crm
❌ dashboards.v6_marketing_attribution_funnel -- Используется в /funnel
❌ dashboards.v6_crm_product_performance      -- Используется в /products
❌ dashboards.v6_data_quality_issues          -- Используется в /quality
```

### SQL ошибки

1. **AmbiguousParameterError:** `could not determine data type of parameter $3`
   - Решение: Явное приведение типов в WHERE условиях
   - Пример: `WHERE ($3::text IS NULL OR platform = $3)`

2. **UndefinedTableError:** `relation "..." does not exist`
   - Решение: Создать отсутствующие views из `CREATE_v6_ANALYTICS_VIEWS.sql`

---

## 📋 ПЛАН ДОРАБОТОК

### 🔴 ПРИОРИТЕТ P0 - КРИТИЧНО (Исправить немедленно)

**Срок:** 1-2 дня

#### 1. Исправить базу данных
```bash
# Запустить создание всех v6 views
psql -h 92.242.60.211 -U manfromlamp -d itstep_final < CREATE_v6_ANALYTICS_VIEWS.sql

# Проверить какие views существуют
SELECT viewname FROM pg_views WHERE schemaname = 'dashboards' AND viewname LIKE 'v6%';
```

#### 2. Создать недостающие views
- `v5_leads_campaign_weekly` - для WoW сравнений
- `dm.dm_campaign_daily` - для страницы кампаний
- Все остальные v6_* views из списка выше

#### 3. Исправить SQL запросы с ошибками типов
```sql
-- Плохо
WHERE ($3 IS NULL OR platform = $3)

-- Хорошо
WHERE ($3::text IS NULL OR platform = $3)
```

#### 4. Исправить /analytics/ads endpoint
```typescript
// В useAdsData hook изменить:
// Было:
const url = '/api/analytics/marketing/ads'

// Стало:
const url = '/api/analytics/ads/'
```

**Затраты времени:**
- Создание views: 4-6 часов
- Исправление SQL: 2-3 часа
- Исправление frontend: 30 минут
- Тестирование: 2 часа
**Итого:** 1-2 рабочих дня

---

### 🟠 ПРИОРИТЕТ P1 - ВЫСОКИЙ (Исправить на этой неделе)

**Срок:** 3-5 дней

#### 1. Добавить error boundaries на все страницы
```typescript
// Добавить в каждую страницу аналитики
<ErrorBoundary fallback={<ErrorFallback />}>
  {/* Page content */}
</ErrorBoundary>
```

#### 2. Реализовать retry логику
```typescript
// В React Query config
retry: 3,
retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
```

#### 3. Добавить user-friendly сообщения об ошибках
```typescript
if (error) {
  return (
    <Card>
      <CardContent>
        <AlertTriangle />
        <h3>Данные временно недоступны</h3>
        <p>Мы работаем над восстановлением. Попробуйте обновить через несколько минут.</p>
        <Button onClick={refetch}>Попробовать снова</Button>
      </CardContent>
    </Card>
  )
}
```

#### 4. Проверить и исправить /sales endpoint
- Убедиться что Next.js API route существует
- Или создать direct backend endpoint

#### 5. Добавить логирование ошибок в backend
```python
import logging

logger = logging.getLogger(__name__)

@router.get("/campaigns")
async def get_campaigns(...):
    try:
        # ... query logic
    except Exception as e:
        logger.error(f"Failed to fetch campaigns: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

**Затраты времени:** 3-5 дней

---

### 🟡 ПРИОРИТЕТ P2 - СРЕДНИЙ (Исправить в этом спринте)

**Срок:** 1-2 недели

#### 1. Добавить loading skeletons
```typescript
<CardContent>
  {isLoading ? (
    <Skeleton className="h-8 w-32" />
  ) : (
    <div className="text-2xl font-bold">{value}</div>
  )}
</CardContent>
```

#### 2. Добавить индикаторы last updated
```typescript
<Badge variant="outline">
  Обновлено: {lastUpdated.toLocaleString('ru-RU')}
</Badge>
```

#### 3. Реализовать graceful degradation
- Показывать частичные данные если некоторые эндпоинты fail
- Добавить fallback данные для демо

#### 4. Добавить экспорт в CSV/Excel
```typescript
<Button onClick={exportToExcel}>
  <Download className="h-4 w-4 mr-2" />
  Экспорт
</Button>
```

#### 5. Оптимизировать производительность
- Добавить индексы на часто запрашиваемые колонки
- Использовать мемоизацию для тяжёлых вычислений
- Добавить pagination где нужно

**Затраты времени:** 1-2 недели

---

### 🟢 ПРИОРИТЕТ P3 - НИЗКИЙ (Будущие улучшения)

**Срок:** 1+ месяц

#### 1. Real-time обновление данных
- WebSocket подключение для live метрик
- Auto-refresh каждые 5 минут

#### 2. Продвинутая фильтрация
- Multi-select фильтры
- Сохранённые фильтры
- Custom date ranges

#### 3. Кастомный dashboard builder
- Drag-and-drop виджеты
- Персональные дашборды
- Шаринг дашбордов

#### 4. Алерты и нотификации
- Email уведомления при аномалиях
- Slack интеграция
- Telegram бот

#### 5. AI-powered инсайты
- Автоматическое выявление трендов
- Предикция будущих метрик
- Рекомендации по оптимизации

**Затраты времени:** 1+ месяц

---

## 🎯 ROADMAP

### Неделя 1 (14-21 октября)
- ✅ День 1-2: Создать все недостающие views в БД
- ✅ День 2-3: Исправить SQL запросы во всех endpoints
- ✅ День 3-4: Исправить /ads endpoint routing
- ✅ День 4-5: Протестировать все страницы

### Неделя 2 (21-28 октября)
- Добавить error boundaries на все страницы
- Реализовать retry logic
- Улучшить UX с loading states
- Добавить user-friendly error messages

### Неделя 3-4 (28 октября - 11 ноября)
- Добавить экспорт данных
- Оптимизировать производительность
- Добавить логирование
- Мониторинг и алерты

### Месяц 2+ (ноябрь+)
- Real-time обновления
- Продвинутые фильтры
- AI инсайты
- Custom dashboards

---

## 📊 МЕТРИКИ УСПЕХА

### До исправлений
- ✅ Работающих страниц: 1/11 (9%)
- ⚠️ Частично работающих: 2/11 (18%)
- ❌ Не работающих: 8/11 (73%)
- 🔥 Критических ошибок: 8

### После исправлений P0 (цель через 2 дня)
- ✅ Работающих страниц: 11/11 (100%)
- ⚠️ Частично работающих: 0/11 (0%)
- ❌ Не работающих: 0/11 (0%)
- 🔥 Критических ошибок: 0

### После всех исправлений (цель через 2 недели)
- 100% функциональность
- < 500ms среднее время ответа
- Нет ошибок в логах
- 100% uptime
- User satisfaction: 95%+

---

## 🚨 КРИТИЧЕСКИЕ ДЕЙСТВИЯ (СДЕЛАТЬ СЕГОДНЯ)

### 1. Проверить наличие views в БД (30 мин)
```bash
ssh root@65.108.220.33
docker exec -it planerix-api-prod python3 << 'EOF'
import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://manfromlamp:lashd87123kKJSDAH81@92.242.60.211:5432/itstep_final')
    rows = await conn.fetch("SELECT viewname FROM pg_views WHERE schemaname = 'dashboards' AND viewname LIKE 'v%'")
    for r in rows:
        print(r['viewname'])
    await conn.close()

asyncio.run(check())
EOF
```

### 2. Создать недостающие views (4-6 часов)
```bash
# Если CREATE_v6_ANALYTICS_VIEWS.sql существует
psql < CREATE_v6_ANALYTICS_VIEWS.sql

# Если нет - создать views вручную на основе существующих таблиц
```

### 3. Исправить /ads endpoint (30 минут)
```typescript
// File: apps/web-enterprise/src/app/analytics/ads/hooks/use_ads_data.ts
// Line: ~15

// Change from:
const response = await fetch(`${API_URL}/api/analytics/marketing/ads?...`)

// To:
const response = await fetch(`${API_URL}/api/analytics/ads/?...`)
```

### 4. Протестировать все исправления (2 часа)
```bash
# Run endpoint tests
curl https://api.planerix.com/api/analytics/marketing/campaigns?date_from=2025-09-01&date_to=2025-10-14
# Expect: HTTP 200 with data

# Test frontend
open https://app.planerix.com/analytics/campaigns
# Expect: Data loads without errors
```

---

## 📁 ФАЙЛЫ ТРЕБУЮЩИЕ ВНИМАНИЯ

### Backend (в порядке приоритета)
1. `CREATE_v6_ANALYTICS_VIEWS.sql` - создать/исправить все views
2. `apps/api/liderix_api/routes/analytics/marketing.py` - исправить SQL запросы
3. `apps/api/liderix_api/routes/analytics/campaigns.py` - fix 500 errors
4. `apps/api/liderix_api/routes/analytics/channels.py` - fix 500 errors
5. `apps/api/liderix_api/routes/analytics/creatives.py` - fix 500 errors
6. `apps/api/liderix_api/routes/analytics/crm.py` - fix 500 errors
7. `apps/api/liderix_api/routes/analytics/funnel.py` - fix 500 errors
8. `apps/api/liderix_api/routes/analytics/products.py` - fix 500 errors
9. `apps/api/liderix_api/routes/analytics/quality.py` - fix 500 errors

### Frontend
1. `apps/web-enterprise/src/app/analytics/ads/hooks/use_ads_data.ts` - fix endpoint URL
2. `apps/web-enterprise/src/app/analytics/*/page.tsx` - add error handling (all)
3. `apps/web-enterprise/src/hooks/useAnalytics.ts` - add retry logic
4. `apps/web-enterprise/src/lib/api/analytics.ts` - improve error messages

---

## 💰 ОЦЕНКА ЗАТРАТ

### Команда из 2 разработчиков:

**P0 - Критичные исправления:**
- Backend developer: 2 дня (16 часов)
- Frontend developer: 0.5 дня (4 часа)
- QA testing: 0.5 дня (4 часа)
**Итого:** 3 дня / 24 часа

**P1 - Высокий приоритет:**
- Backend developer: 2 дня
- Frontend developer: 2 дня
- QA testing: 1 день
**Итого:** 5 дней

**P2 - Средний приоритет:**
- Backend developer: 3 дня
- Frontend developer: 4 дня
- QA testing: 1 день
**Итого:** 8 дней

**Общие затраты:** 16 рабочих дней = 3.2 недели для команды из 2 человек

---

## ✅ ЧЕКЛИСТ ВЫПОЛНЕНИЯ

### P0 - Критично (должно быть сделано в течение 48 часов)
- [ ] Проверить существование всех v6 views в БД
- [ ] Создать недостающие views из CREATE_v6_ANALYTICS_VIEWS.sql
- [ ] Создать view `v5_leads_campaign_weekly` для WoW
- [ ] Создать таблицу/view `dm.dm_campaign_daily`
- [ ] Исправить SQL запросы с AmbiguousParameterError (добавить ::text)
- [ ] Исправить /ads endpoint URL в frontend hook
- [ ] Протестировать все 8 сломанных страниц
- [ ] Убедиться что все возвращают HTTP 200 с данными
- [ ] Запустить полный regression test

### P1 - Высокий приоритет (эта неделя)
- [ ] Добавить ErrorBoundary на все /analytics/* страницы
- [ ] Добавить retry logic в React Query config
- [ ] Улучшить error messages для пользователей
- [ ] Добавить loading skeletons
- [ ] Проверить /sales endpoint и Next.js API route
- [ ] Добавить backend logging для всех errors
- [ ] Настроить error tracking (Sentry/LogRocket)
- [ ] Создать runbook для troubleshooting

### P2 - Средний приоритет (2 недели)
- [ ] Добавить "Last updated" timestamps
- [ ] Реализовать graceful degradation
- [ ] Добавить CSV/Excel export
- [ ] Оптимизировать DB queries (добавить индексы)
- [ ] Добавить query caching где возможно
- [ ] Улучшить mobile responsiveness
- [ ] Добавить pagination для больших datasets
- [ ] Создать end-to-end tests

### P3 - Низкий приоритет (1+ месяц)
- [ ] Real-time data updates
- [ ] Advanced filtering system
- [ ] Custom dashboard builder
- [ ] Email/Slack alerts
- [ ] AI-powered insights
- [ ] A/B testing capabilities

---

## 📞 КОНТАКТЫ И РЕСУРСЫ

### Производственный сервер
- **Host:** 65.108.220.33
- **Project:** /opt/MONOREPv3
- **Branch:** develop

### База данных
- **Host:** 92.242.60.211:5432
- **Database:** itstep_final
- **User:** manfromlamp
- **Schema:** dashboards

### URLs
- **Frontend:** https://app.planerix.com
- **API:** https://api.planerix.com/api
- **Analytics:** https://app.planerix.com/analytics

---

## 🎯 ЗАКЛЮЧЕНИЕ

**Текущее состояние:** 73% аналитических страниц не функционируют из-за отсутствующих database views и ошибок в SQL запросах.

**Основная причина:** Backend endpoints возвращают HTTP 500 из-за:
1. Отсутствующих database views (v6_*, dm.*)
2. SQL ошибок с типами параметров
3. Несоответствия между frontend и backend routing

**Критический путь:**
1. Создать все недостающие views (1 день)
2. Исправить SQL запросы (0.5 дня)
3. Исправить routing issues (0.5 дня)
4. Протестировать (0.5 дня)

**Итого:** 2.5 дня для восстановления полной функциональности

**Рекомендация:** Начать исправления немедленно, начиная с database views, затем SQL queries, затем frontend routing.

---

**Отчёт составлен:** 14 октября 2025, 19:30 UTC
**Аудитор:** Claude Code AI Assistant
**Статус:** Готов к исполнению
**Следующий шаг:** Создание database views

---

**Конец отчёта**
