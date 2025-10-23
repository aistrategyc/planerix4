# 📋 V9 Analytics - Frontend Technical Specification
## Техническое Задание на Основные Страницы
### 23 октября 2025

---

## 🎯 ЦЕЛЬ

Создать 4 основные страницы аналитики которые отображают **ПОЛНУЮ атрибуцию контрактов** с учетом **ВСЕХ источников** (Google, Facebook, Instagram, Email, Viber, Telegram, Events) на основе V9 логики.

---

## 📄 СТРАНИЦЫ

### 1. `/analytics/ads` - Реклама (Google Ads + Facebook/Meta Ads)
### 2. `/analytics/data-analytics` - Общая Аналитика (Dashboard)
### 3. `/analytics/contracts` - Контракты и Атрибуция
### 4. `/analytics/marketing` - Маркетинг (Все Источники)

---

# 1️⃣ PAGE: `/analytics/ads` - Реклама

## Назначение
Детальная аналитика по платным рекламным каналам (Google Ads, Facebook Ads, Instagram Ads)

## Структура Страницы

### 📊 Section 1: KPI Cards (Top)

**4 карточки**:

1. **Total Spend**
   - Значение: сумма расходов (UAH)
   - Период: выбранный диапазон дат
   - Динамика: % изменение vs предыдущий период
   - Цвет: синий

2. **Total Contracts**
   - Значение: количество контрактов
   - Период: выбранный диапазон дат
   - Динамика: % изменение vs предыдущий период
   - Цвет: зеленый

3. **Total Revenue**
   - Значение: сумма revenue (UAH)
   - Период: выбранный диапазон дат
   - Динамика: % изменение vs предыдущий период
   - Цвет: фиолетовый

4. **ROAS**
   - Значение: Revenue / Spend
   - Формат: 1.2x, 5.5x, etc.
   - Динамика: % изменение vs предыдущий период
   - Цвет: оранжевый (зеленый если >3x, красный если <1x)

### 📈 Section 2: Charts

**Chart 1: Spend, Revenue, Contracts по дням (Line Chart)**
- X-axis: дата
- Y-axis (left): Spend (UAH), Revenue (UAH)
- Y-axis (right): Contracts (count)
- Lines: 3 линии с разными цветами
- Легенда: вверху справа
- Tooltip: дата, spend, revenue, contracts, ROAS

**Chart 2: ROAS Trend (Area Chart)**
- X-axis: дата
- Y-axis: ROAS (x)
- Area fill: gradient (green to yellow to red)
- Benchmark line: ROAS = 3x (dotted line)
- Tooltip: дата, ROAS, contracts, revenue, spend

**Chart 3: Contracts by Platform (Pie Chart)**
- Slices: Google, Facebook, Instagram
- Values: количество контрактов
- Tooltip: platform, contracts, % от total
- Colors: Google (blue), Facebook (dark blue), Instagram (pink)

### 📋 Section 3: Campaign Performance Table

**Columns**:
1. Platform (Google / Facebook / Instagram) - с иконкой
2. Campaign Name - кликабельная (открывает детали)
3. Spend (UAH) - отсортировано по умолчанию DESC
4. Impressions - форматировано с K, M
5. Clicks - форматировано с K, M
6. CTR (%) - цвет: зеленый >2%, желтый 1-2%, красный <1%
7. Leads - количество лидов
8. CPL (UAH) - Cost Per Lead
9. Contracts - количество контрактов
10. Revenue (UAH) - выручка
11. ROAS (x) - цвет: зеленый >3x, желтый 1-3x, красный <1x
12. Actions - кнопки (View Details, Edit, Pause)

**Features**:
- Сортировка по всем колонкам
- Фильтры: Platform, Date Range, Campaign Name (search)
- Pagination: 10, 25, 50, 100 записей
- Export: CSV, Excel

### 📋 Section 4: Creative Performance (Facebook/Instagram only)

**Креативы с превью**:

**Card Layout** (Grid 3 columns):

Каждая карточка содержит:
1. **Preview Image** (если есть)
   - Размер: 300x300px
   - Если нет - placeholder
2. **Ad Name** - заголовок
3. **Campaign Name** - подзаголовок
4. **Ad Copy** - первые 100 символов
5. **CTA** - call to action
6. **Metrics**:
   - Impressions
   - Clicks
   - CTR (%)
   - Spend (UAH)
   - Contracts
   - ROAS (x)
7. **Status Badge** - Active / Paused / Completed

**Features**:
- Фильтр по Campaign
- Сортировка: по Spend, ROAS, Contracts
- Поиск по Ad Name
- Кнопка "View Full Creative" - открывает модальное окно с полным изображением

## API Endpoints

### `GET /api/v1/analytics/ads/summary`

**Parameters**:
- `start_date` (required): string (YYYY-MM-DD)
- `end_date` (required): string (YYYY-MM-DD)
- `platforms` (optional): array of strings (google, facebook, instagram)

**Response**:
```json
{
  "total_spend": 150000.50,
  "total_contracts": 49,
  "total_revenue": 1696599.00,
  "roas": 11.31,
  "prev_period": {
    "total_spend": 120000.00,
    "total_contracts": 35,
    "total_revenue": 1200000.00,
    "roas": 10.00
  },
  "change": {
    "spend_pct": 25.0,
    "contracts_pct": 40.0,
    "revenue_pct": 41.4,
    "roas_pct": 13.1
  }
}
```

### `GET /api/v1/analytics/ads/daily-trend`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `platforms` (optional): array of strings

**Response**:
```json
{
  "data": [
    {
      "date": "2025-10-01",
      "spend": 5000.00,
      "revenue": 50000.00,
      "contracts": 2,
      "roas": 10.0
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/ads/campaigns`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `platforms` (optional): array of strings
- `sort_by` (optional): string (spend, revenue, roas, contracts)
- `sort_order` (optional): string (asc, desc)
- `page` (optional): integer
- `limit` (optional): integer

**Response**:
```json
{
  "data": [
    {
      "platform": "google",
      "campaign_id": "12345",
      "campaign_name": "Performance Max - ПКО 2025",
      "spend": 50000.00,
      "impressions": 100000,
      "clicks": 5000,
      "ctr": 5.0,
      "leads": 100,
      "cpl": 500.00,
      "contracts": 21,
      "revenue": 972407.00,
      "roas": 19.45
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 10,
    "total_pages": 1
  }
}
```

### `GET /api/v1/analytics/ads/creatives`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `platforms` (optional): array (facebook, instagram only)
- `campaign_id` (optional): string

**Response**:
```json
{
  "data": [
    {
      "ad_id": "67890",
      "ad_name": "Lager_school_Kyiv - Creative 1",
      "campaign_name": "Lager_school_Kyiv",
      "platform": "instagram",
      "image_url": "https://...fb_ad_images/67890.jpg",
      "ad_copy": "Літній табір для дітей...",
      "cta": "Дізнатися більше",
      "status": "active",
      "impressions": 50000,
      "clicks": 2500,
      "ctr": 5.0,
      "spend": 10000.00,
      "contracts": 7,
      "roas": 19.55
    },
    ...
  ]
}
```

---

# 2️⃣ PAGE: `/analytics/data-analytics` - Общая Аналитика

## Назначение
Главная dashboard страница с общей картиной по ВСЕМ источникам (не только реклама)

## Структура Страницы

### 📊 Section 1: Global KPI Cards (Top)

**6 карточек**:

1. **Total Contracts**
   - Значение: 473 (все контракты)
   - Период: выбранный диапазон дат
   - Динамика: % изменение

2. **Total Revenue**
   - Значение: 25.1M UAH (вся выручка)
   - Период: выбранный диапазон дат
   - Динамика: % изменение

3. **Attributed Contracts**
   - Значение: 49 (10.36%)
   - Breakdown: с источником vs без источника
   - Динамика: % изменение

4. **Attributed Revenue**
   - Значение: 1.7M UAH (6.75%)
   - Breakdown: с источником vs без источника
   - Динамика: % изменение

5. **Avg Contract Value**
   - Значение: 53,141 UAH
   - Период: выбранный диапазон дат
   - Динамика: % изменение

6. **Avg Days to Close**
   - Значение: 7.5 дней (для attributed)
   - Breakdown: по платформам
   - Динамика: % изменение

### 📈 Section 2: Charts

**Chart 1: Contracts & Revenue by Day (Combo Chart)**
- X-axis: дата
- Y-axis (left): Contracts (bar chart)
- Y-axis (right): Revenue (line chart)
- Colors: bars (blue), line (green)
- Tooltip: дата, contracts, revenue, avg contract value

**Chart 2: Contracts by Source (Stacked Bar Chart)**
- X-axis: дата (недельные бары)
- Y-axis: количество контрактов
- Stacks: Google, Facebook, Instagram, Email, Viber, Telegram, Event, Direct, Organic
- Colors: уникальный цвет для каждого источника
- Tooltip: дата, source, contracts, % от total

**Chart 3: Revenue Distribution (Treemap)**
- Rectangles: источники (размер = revenue)
- Colors: по платформе
- Labels: source name, revenue, % от total
- Click: drill-down в campaigns

**Chart 4: Conversion Funnel (Funnel Chart)**
- Steps:
  1. Impressions (если есть данные)
  2. Clicks
  3. Leads
  4. Contracts
- Values: количество + % conversion между этапами
- Colors: gradient от синего к зеленому

### 📋 Section 3: Platform Performance Table

**Columns**:
1. Platform - с иконкой
2. Contracts - количество
3. Contracts % - процент от total
4. Revenue (UAH) - выручка
5. Revenue % - процент от total
6. Avg Contract (UAH) - средний чек
7. Avg Days to Close - среднее время до закрытия
8. Top Campaign - лучшая кампания (по revenue)
9. Trend - спарклайн за последние 30 дней

**Features**:
- Сортировка по всем колонкам
- Фильтры: Date Range
- Цветовая кодировка строк (по ROAS если есть)
- Клик на Platform - переход на детальную страницу

### 📊 Section 4: Geographic Distribution (если есть данные)

**Map Chart**:
- Карта Украины (или мира)
- Heatmap: интенсивность цвета = количество контрактов
- Tooltip: город, contracts, revenue
- Zoom: возможность увеличить регион

**Top Cities Table**:
1. City Name
2. Contracts
3. Revenue
4. Avg Contract
5. Top Source

## API Endpoints

### `GET /api/v1/analytics/data-analytics/summary`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "total_contracts": 473,
  "total_revenue": 25142227.00,
  "attributed_contracts": 49,
  "attributed_contracts_pct": 10.36,
  "attributed_revenue": 1696599.00,
  "attributed_revenue_pct": 6.75,
  "avg_contract_value": 53141.00,
  "avg_days_to_close": 7.5,
  "prev_period": { ... },
  "change": { ... }
}
```

### `GET /api/v1/analytics/data-analytics/daily-trend`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "data": [
    {
      "date": "2025-10-01",
      "total_contracts": 10,
      "total_revenue": 500000.00,
      "attributed_contracts": 2,
      "attributed_revenue": 100000.00
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/data-analytics/contracts-by-source`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `group_by` (optional): string (daily, weekly, monthly)

**Response**:
```json
{
  "data": [
    {
      "date": "2025-10-01",
      "google": 2,
      "facebook": 1,
      "instagram": 1,
      "email": 0,
      "viber": 0,
      "telegram": 0,
      "event": 0,
      "direct": 3,
      "organic": 2,
      "other": 1
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/data-analytics/platforms`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "data": [
    {
      "platform": "google",
      "contracts": 21,
      "contracts_pct": 42.86,
      "revenue": 972407.00,
      "revenue_pct": 57.32,
      "avg_contract": 46305.00,
      "avg_days_to_close": 8.6,
      "top_campaign": "Performance Max - ПКО 2025",
      "trend": [1, 2, 1, 3, 2, 4, 3, 2, 1, 2] // last 30 days
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/data-analytics/funnel`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "funnel": [
    {
      "stage": "impressions",
      "value": 1000000,
      "conversion_rate": null
    },
    {
      "stage": "clicks",
      "value": 50000,
      "conversion_rate": 5.0
    },
    {
      "stage": "leads",
      "value": 1000,
      "conversion_rate": 2.0
    },
    {
      "stage": "contracts",
      "value": 49,
      "conversion_rate": 4.9
    }
  ]
}
```

---

# 3️⃣ PAGE: `/analytics/contracts` - Контракты и Атрибуция

## Назначение
Детальная информация по каждому контракту с полной атрибуцией источника

## Структура Страницы

### 📊 Section 1: KPI Cards (Top)

**4 карточки**:

1. **Total Contracts**
   - Значение: 473
   - Breakdown: с attribution (49) vs без attribution (424)
   - Pie chart внутри карточки

2. **Total Revenue**
   - Значение: 25.1M UAH
   - Breakdown: attributed (1.7M) vs unattributed (23.4M)
   - Pie chart внутри карточки

3. **Attribution Rate**
   - Значение: 10.36% (by count), 6.75% (by revenue)
   - Динамика: % изменение
   - Target: 15% (progress bar)

4. **Top Performing Platform**
   - Значение: Google (21 contracts, 972K UAH)
   - Second: Instagram (9 contracts, 232K UAH)
   - Badge: "Top Performer"

### 📈 Section 2: Charts

**Chart 1: Attribution Breakdown (Donut Chart)**
- Inner ring: contracts (count)
- Outer ring: revenue (UAH)
- Slices: по платформам (Google, Facebook, Instagram, Email, Viber, Telegram, Event, Unattributed)
- Tooltip: platform, contracts, revenue, % от total
- Center label: "10.36% Attributed"

**Chart 2: Days to Close Distribution (Histogram)**
- X-axis: days to close (0-5, 6-10, 11-15, 16-20, 21-30, 30+)
- Y-axis: количество контрактов
- Bars: цвет от зеленого (fast) к красному (slow)
- Tooltip: range, contracts, avg contract value

**Chart 3: Contract Value Distribution (Box Plot)**
- По платформам (Google, Facebook, Instagram, Email, Viber, etc.)
- Y-axis: contract value (UAH)
- Box: Q1, median, Q3
- Whiskers: min, max
- Outliers: dots
- Tooltip: platform, min, Q1, median, Q3, max

**Chart 4: Attribution Timeline (Gantt Chart)**
- X-axis: дата
- Y-axis: контракты (каждая строка = контракт)
- Bars: от даты первого события до даты контракта
- Colors: по платформе
- Tooltip: client_id, platform, campaign, lead_date, contract_date, days_to_close

### 📋 Section 3: Contracts Table (Main)

**Columns**:
1. Contract ID - кликабельный
2. Client ID - кликабельный
3. Contract Date - дата
4. Contract Amount (UAH) - форматировано
5. Platform - badge с иконкой
6. Campaign - кликабельная
7. Ad Name - truncated с tooltip
8. Lead Date - дата
9. Days to Close - цвет: зеленый <7, желтый 7-14, красный >14
10. UTM Source - badge
11. UTM Campaign - truncated
12. Actions - кнопки (View Details, Export)

**Features**:
- **Multi-filter**:
  - Platform (multiselect)
  - Date Range (двойной picker)
  - Contract Amount Range (slider)
  - Days to Close Range (slider)
  - Campaign (autocomplete search)
  - Attribution Status (All / Attributed / Unattributed)
- **Advanced Search**: по client_id, campaign, ad_name
- **Sorting**: по всем колонкам
- **Pagination**: 10, 25, 50, 100, 500 записей
- **Bulk Actions**: Export Selected, Compare Selected
- **Export**: CSV, Excel, PDF (with details)

### 📋 Section 4: Contract Details Modal

**Открывается при клике на Contract ID**:

**Tabs**:

1. **Overview**:
   - Contract Info (id, date, amount, status)
   - Client Info (id, name if available, email if available)
   - Attribution Info (platform, campaign, ad, source)
   - Timeline (visual timeline от первого события до контракта)

2. **All Client Events**:
   - Таблица всех событий клиента (id_source)
   - Columns: event_date, event_type, utm_source, utm_campaign, utm_medium, code (JSON)
   - Highlight: событие которое привело к атрибуции

3. **Campaign Details**:
   - Campaign Info (name, platform, status)
   - Campaign Metrics (spend, impressions, clicks, leads, contracts, ROAS)
   - Other Contracts from this Campaign (список)

4. **Creative Preview** (если Facebook/Instagram):
   - Preview Image
   - Ad Copy
   - CTA
   - Ad Metrics

## API Endpoints

### `GET /api/v1/analytics/contracts/summary`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "total_contracts": 473,
  "total_revenue": 25142227.00,
  "attributed_contracts": 49,
  "attributed_contracts_pct": 10.36,
  "attributed_revenue": 1696599.00,
  "attributed_revenue_pct": 6.75,
  "unattributed_contracts": 424,
  "unattributed_revenue": 23445628.00,
  "top_platform": {
    "platform": "google",
    "contracts": 21,
    "revenue": 972407.00
  },
  "second_platform": {
    "platform": "instagram",
    "contracts": 9,
    "revenue": 232253.00
  }
}
```

### `GET /api/v1/analytics/contracts/list`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `platforms` (optional): array of strings
- `min_amount` (optional): number
- `max_amount` (optional): number
- `min_days` (optional): number
- `max_days` (optional): number
- `attribution_status` (optional): string (all, attributed, unattributed)
- `search` (optional): string
- `sort_by` (optional): string
- `sort_order` (optional): string (asc, desc)
- `page` (optional): integer
- `limit` (optional): integer

**Response**:
```json
{
  "data": [
    {
      "contract_id": "ns_123456",
      "client_id": "4175600",
      "contract_date": "2025-10-10",
      "contract_amount": 45720.00,
      "platform": "instagram",
      "campaign_name": "Lager_school_Kyiv",
      "ad_name": null,
      "lead_date": "2025-09-28",
      "days_to_close": 12,
      "utm_source": "Instagram_Feed",
      "utm_campaign": "Lager_school_Kyiv",
      "utm_medium": "cpc"
    },
    ...
  ],
  "pagination": { ... }
}
```

### `GET /api/v1/analytics/contracts/{contract_id}`

**Response**:
```json
{
  "contract": {
    "contract_id": "ns_123456",
    "client_id": "4175600",
    "contract_date": "2025-10-10T12:00:00Z",
    "contract_amount": 45720.00,
    "status": "completed"
  },
  "attribution": {
    "platform": "instagram",
    "campaign_id": "67890",
    "campaign_name": "Lager_school_Kyiv",
    "ad_id": null,
    "ad_name": null,
    "adset_name": null,
    "utm_source": "Instagram_Feed",
    "utm_campaign": "Lager_school_Kyiv",
    "utm_medium": "cpc",
    "utm_term": null,
    "utm_content": null
  },
  "timeline": {
    "first_event_date": "2025-09-28T10:00:00Z",
    "lead_date": "2025-09-28T10:00:00Z",
    "contract_date": "2025-10-10T12:00:00Z",
    "days_to_close": 12
  }
}
```

### `GET /api/v1/analytics/contracts/{contract_id}/events`

**Response**:
```json
{
  "events": [
    {
      "event_id": "ia_789",
      "event_date": "2025-09-28T10:00:00Z",
      "event_type": "lead",
      "id_source": "src_111",
      "utm_source": "Instagram_Feed",
      "utm_campaign": "Lager_school_Kyiv",
      "utm_medium": "cpc",
      "code": {
        "fclid": "fb_click_12345",
        "utm_source": "Instagram_Feed",
        "utm_campaign": "Lager_school_Kyiv",
        ...
      },
      "is_attributed": true
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/contracts/attribution-breakdown`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "platforms": [
    {
      "platform": "google",
      "contracts": 21,
      "contracts_pct": 42.86,
      "revenue": 972407.00,
      "revenue_pct": 57.32
    },
    ...
  ],
  "unattributed": {
    "contracts": 424,
    "contracts_pct": 89.64,
    "revenue": 23445628.00,
    "revenue_pct": 93.25
  }
}
```

### `GET /api/v1/analytics/contracts/days-to-close-distribution`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "buckets": [
    {
      "range": "0-5",
      "contracts": 15,
      "avg_contract_value": 35000.00
    },
    {
      "range": "6-10",
      "contracts": 20,
      "avg_contract_value": 40000.00
    },
    ...
  ]
}
```

---

# 4️⃣ PAGE: `/analytics/marketing` - Маркетинг (Все Источники)

## Назначение
Анализ ВСЕХ маркетинговых источников (не только платная реклама): Email, Telegram, Viber, Events, Organic, Direct, etc.

## Структура Страницы

### 📊 Section 1: KPI Cards (Top)

**5 карточек**:

1. **Total Sources**
   - Значение: 10+ (количество уникальных источников)
   - Top 3: Google, Instagram, Facebook
   - Breakdown: платные vs бесплатные

2. **Paid Channels**
   - Contracts: 39 (Google + Facebook + Instagram)
   - Revenue: 1.42M UAH
   - Spend: ~150K UAH (если есть)
   - ROAS: ~9.5x

3. **Organic Channels**
   - Contracts: 10 (Email + Telegram + Viber + Event)
   - Revenue: 277K UAH
   - Cost: 0 UAH
   - ROI: ∞

4. **Best Channel (by ROAS)**
   - Channel: Google Ads
   - ROAS: 19.45x
   - Contracts: 21
   - Badge: "Top Performer"

5. **Fastest Channel (by Days to Close)**
   - Channel: Event
   - Avg Days: 0.0
   - Second: Telegram (3.0 days)
   - Badge: "Fastest"

### 📈 Section 2: Charts

**Chart 1: Source Comparison (Grouped Bar Chart)**
- X-axis: источники (Google, Facebook, Instagram, Email, Viber, Telegram, Event, Direct, Organic)
- Y-axis (left): Contracts (bars)
- Y-axis (right): Revenue (line)
- Grouped bars: текущий период vs предыдущий период
- Tooltip: source, contracts (current/prev), revenue (current/prev), % change

**Chart 2: Channel Mix Evolution (Stacked Area Chart)**
- X-axis: дата (дни или недели)
- Y-axis: % от total contracts
- Areas: по источникам (stacked to 100%)
- Colors: уникальный цвет для каждого источника
- Tooltip: дата, source, contracts, % от total в этот день

**Chart 3: ROI by Channel (Horizontal Bar Chart)**
- Y-axis: источники
- X-axis: ROI или ROAS (для платных) / Revenue (для бесплатных)
- Bars: цвет от красного (low) к зеленому (high)
- Labels: значение ROI/ROAS/Revenue на баре
- Tooltip: source, ROI/ROAS, contracts, revenue, spend (if paid)

**Chart 4: Customer Journey (Sankey Diagram)**
- Flows: от источника → к кампании → к контракту
- Width: пропорционален количеству контрактов
- Colors: по источнику
- Tooltip: source → campaign, contracts, revenue

### 📋 Section 3: Source Performance Table

**Columns**:
1. Source - badge с иконкой
2. Type - платный / бесплатный
3. Contracts - количество
4. Contracts % - процент от total
5. Revenue (UAH) - выручка
6. Revenue % - процент от total
7. Avg Contract (UAH) - средний чек
8. Avg Days to Close - среднее время
9. Spend (UAH) - расходы (если платный)
10. ROAS / ROI - возврат инвестиций
11. Top Campaign - лучшая кампания
12. Trend - спарклайн

**Features**:
- Фильтры: Type (paid/organic), Date Range
- Группировка: All / Paid / Organic
- Сортировка: по всем колонкам
- Цветовая кодировка: по ROAS/ROI
- Export: CSV, Excel

### 📋 Section 4: Campaign Details by Source

**Expandable Rows**:
Каждый источник можно развернуть чтобы увидеть кампании:

**Email**:
- MA_Kiev_site: 2 контракта, 67,500 UAH
- a360-mka-progrev-lidov: 1 контракт, 33,250 UAH
- opros_repetitor: 1 контракт, 0 UAH
- skr_kiev_site: 1 контракт, 0 UAH

**Viber**:
- viber: 2 контракта, 167,040 UAH

**Telegram**:
- tgchanel: 2 контракта, 0 UAH

**Instagram**:
- Lager_school_Kyiv: 7 контрактов, 195,550 UAH
- MA_Kiev_site: 2 контракта, 36,703 UAH

etc.

### 📊 Section 5: Organic vs Paid Analysis

**Side by Side Comparison**:

**Left: Paid Channels**
- Total Contracts: 39
- Total Revenue: 1.42M UAH
- Total Spend: 150K UAH (estimate)
- ROAS: 9.47x
- Avg Contract: 36,415 UAH
- Avg Days: 7.5

**Right: Organic Channels**
- Total Contracts: 10
- Total Revenue: 277K UAH
- Total Spend: 0 UAH
- ROI: ∞
- Avg Contract: 27,700 UAH
- Avg Days: 6.9

**Bottom: Comparison Chart (Radar Chart)**
- Axes: Contracts, Revenue, Avg Contract, Speed (inverse days), Efficiency (ROAS)
- 2 polygons: Paid (blue) vs Organic (green)
- Normalized scale (0-100)

## API Endpoints

### `GET /api/v1/analytics/marketing/summary`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "total_sources": 10,
  "top_sources": ["google", "instagram", "facebook"],
  "paid_channels": {
    "contracts": 39,
    "revenue": 1423909.00,
    "spend": 150000.00,
    "roas": 9.49
  },
  "organic_channels": {
    "contracts": 10,
    "revenue": 272690.00,
    "spend": 0,
    "roi": null
  },
  "best_channel": {
    "source": "google",
    "roas": 19.45,
    "contracts": 21
  },
  "fastest_channel": {
    "source": "event",
    "avg_days": 0.0
  }
}
```

### `GET /api/v1/analytics/marketing/sources`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `type` (optional): string (paid, organic, all)
- `sort_by` (optional): string
- `sort_order` (optional): string

**Response**:
```json
{
  "data": [
    {
      "source": "google",
      "type": "paid",
      "contracts": 21,
      "contracts_pct": 42.86,
      "revenue": 972407.00,
      "revenue_pct": 57.32,
      "avg_contract": 46305.00,
      "avg_days_to_close": 8.6,
      "spend": 50000.00,
      "roas": 19.45,
      "top_campaign": "Performance Max - ПКО 2025",
      "trend": [...]
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/marketing/source/{source}/campaigns`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "source": "email",
  "campaigns": [
    {
      "campaign_name": "MA_Kiev_site",
      "contracts": 2,
      "revenue": 67500.00,
      "avg_contract": 33750.00,
      "avg_days": 6.0
    },
    ...
  ]
}
```

### `GET /api/v1/analytics/marketing/paid-vs-organic`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string

**Response**:
```json
{
  "paid": {
    "contracts": 39,
    "revenue": 1423909.00,
    "spend": 150000.00,
    "roas": 9.49,
    "avg_contract": 36515.00,
    "avg_days": 7.5
  },
  "organic": {
    "contracts": 10,
    "revenue": 272690.00,
    "spend": 0,
    "roi": null,
    "avg_contract": 27269.00,
    "avg_days": 6.9
  },
  "comparison": {
    "contracts_diff_pct": 290.0,
    "revenue_diff_pct": 422.2,
    "avg_contract_diff_pct": 33.9,
    "avg_days_diff_pct": 8.7
  }
}
```

### `GET /api/v1/analytics/marketing/channel-mix-trend`

**Parameters**:
- `start_date` (required): string
- `end_date` (required): string
- `group_by` (optional): string (daily, weekly, monthly)

**Response**:
```json
{
  "data": [
    {
      "date": "2025-10-01",
      "google": 2,
      "facebook": 1,
      "instagram": 1,
      "email": 0,
      "viber": 0,
      "telegram": 0,
      "event": 0,
      "direct": 3,
      "organic": 2,
      "other": 1,
      "total": 10
    },
    ...
  ]
}
```

---

## 🛠️ ОБЩИЕ ТРЕБОВАНИЯ

### UI/UX Guidelines

1. **Design System**:
   - Use Tailwind CSS
   - Follow existing component library
   - Consistent spacing (4px grid)
   - Typography: Inter font family

2. **Colors**:
   - Primary: Blue (#3B82F6)
   - Success: Green (#10B981)
   - Warning: Yellow (#F59E0B)
   - Danger: Red (#EF4444)
   - Platform specific:
     - Google: #4285F4
     - Facebook: #1877F2
     - Instagram: #E4405F
     - Email: #EA4335
     - Telegram: #0088CC
     - Viber: #7360F2

3. **Responsive**:
   - Mobile: 320px+
   - Tablet: 768px+
   - Desktop: 1024px+
   - Large: 1440px+

4. **Loading States**:
   - Skeleton loaders для карточек
   - Spinner для графиков
   - Progress bar для таблиц

5. **Error Handling**:
   - Toast notifications для ошибок
   - Inline errors для форм
   - Retry buttons для failed requests

6. **Accessibility**:
   - ARIA labels
   - Keyboard navigation
   - Screen reader support
   - High contrast mode

### Performance Requirements

1. **Page Load**:
   - Initial render: <2s
   - Time to Interactive: <3s
   - First Contentful Paint: <1s

2. **API Response**:
   - Summary endpoints: <500ms
   - List endpoints: <1s
   - Complex queries: <2s

3. **Data Refresh**:
   - Auto-refresh: every 5 minutes (optional toggle)
   - Manual refresh button
   - Real-time updates for critical metrics (optional)

### Security

1. **Authentication**:
   - JWT tokens
   - Token refresh
   - Role-based access (Admin, Manager, Viewer)

2. **Data Protection**:
   - No sensitive data in URLs
   - Encrypted API calls (HTTPS)
   - Rate limiting

### Testing

1. **Unit Tests**:
   - Components: >80% coverage
   - Utils: >90% coverage

2. **Integration Tests**:
   - API calls
   - State management

3. **E2E Tests**:
   - Critical user flows
   - Cross-browser testing

---

## 📦 IMPLEMENTATION CHECKLIST

### Phase 1: Core Infrastructure (Week 1)
- [ ] Setup API endpoints (all listed above)
- [ ] Create TypeScript types for all responses
- [ ] Implement authentication & authorization
- [ ] Setup error handling & logging

### Phase 2: Page 1 - Ads (Week 2)
- [ ] Implement `/analytics/ads` page
- [ ] KPI cards with summary endpoint
- [ ] Charts (4 charts)
- [ ] Campaign performance table
- [ ] Creative performance section
- [ ] Responsive design
- [ ] Unit tests

### Phase 3: Page 2 - Data Analytics (Week 3)
- [ ] Implement `/analytics/data-analytics` page
- [ ] Global KPI cards
- [ ] Charts (4 charts)
- [ ] Platform performance table
- [ ] Responsive design
- [ ] Unit tests

### Phase 4: Page 3 - Contracts (Week 4)
- [ ] Implement `/analytics/contracts` page
- [ ] KPI cards
- [ ] Charts (4 charts)
- [ ] Contracts table with filters
- [ ] Contract details modal
- [ ] Responsive design
- [ ] Unit tests

### Phase 5: Page 4 - Marketing (Week 5)
- [ ] Implement `/analytics/marketing` page
- [ ] KPI cards
- [ ] Charts (4 charts)
- [ ] Source performance table
- [ ] Paid vs Organic comparison
- [ ] Responsive design
- [ ] Unit tests

### Phase 6: Polish & Testing (Week 6)
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] E2E tests for all pages
- [ ] Documentation
- [ ] User acceptance testing

---

## 🎯 SUCCESS METRICS

### User Engagement
- Page views per session: >5
- Avg session duration: >5 minutes
- Return visit rate: >60%

### Performance
- Page load time: <2s
- API response time: <1s
- Error rate: <1%

### Business Impact
- Time to insights: <1 minute
- Decision-making speed: +50%
- Attribution accuracy: 10.36% → 15% (target)

---

**Prepared by**: Claude Code Assistant
**Date**: 2025-10-23
**Version**: V9 Final
**Status**: 🟢 READY FOR IMPLEMENTATION
