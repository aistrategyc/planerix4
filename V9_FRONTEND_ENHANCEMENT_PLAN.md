# V9 Frontend Enhancement Plan
## Усовершенствование страниц с V9 данными

**Дата**: 23 октября 2025
**Цель**: Расширить и дополнить фронтенд страницы реальными качественными данными из V9

---

## 📊 ДОСТУПНЫЕ V9 ДАННЫЕ

### 1. Platform Performance (stg.v9_platform_daily_overview)
**Колонки**: dt, platform, leads, contracts, revenue, conversion_rate

**Данные**:
- 214 записей за последние 2 месяца
- 9 платформ: google, facebook, instagram, telegram, viber, email, event, organic, other
- Ежедневная детализация

**Можно добавить на фронтенд**:
- 📈 Линейный график по платформам (leads + contracts по дням)
- 🔄 Conversion rate тренд
- 📊 Revenue по платформам (stacked area chart)

### 2. Marketing Funnel (stg.v9_marketing_funnel_complete)
**Колонки**: platform, leads, contracts, revenue, avg_contract_value, conversion_rate

**Данные**:
- 9 платформ с полной воронкой
- Facebook: 401 leads → 10 contracts (2.49%)
- Instagram: 8 leads → 9 contracts (112.5% - повторные клиенты!)
- Google: 55 leads → 21 contracts (38.18%)

**Можно добавить на фронтенд**:
- 🎯 Funnel visualization (Sankey diagram)
- 💰 ROI по платформам
- 🏆 Top performing platforms

### 3. Contracts with Attribution (stg.v9_contracts_with_full_attribution)
**Колонки**: 25 колонок! (contract_date, contract_amount, unified_platform, unified_campaign_name, attribution_level, days_to_contract, utm_source, utm_campaign, crm_manual_source, и т.д.)

**Данные**:
- 473 контракта с полной атрибуцией
- 5 уровней атрибуции: campaign_match, platform_detected, utm_attribution, crm_manual, unattributed
- Все UTM параметры
- CRM источники

**Можно добавить на фронтенд**:
- 🎨 Attribution sunburst chart (level → platform → campaign)
- ⏱️ Days to contract distribution
- 🔍 Детальный просмотр каждого контракта с UTM
- 📋 Фильтры по attribution_level

### 4. Contracts by Campaign (stg.v9_contracts_by_campaign)
**Колонки**: unified_platform, unified_campaign_name, attribution_level, contracts, revenue, avg_contract_value, avg_days_to_close, first_contract, last_contract

**Данные**:
- 75 кампаний с контрактами
- Группировка по платформам
- Performance метрики

**Можно добавить на фронтенд**:
- 📊 Top campaigns таблица (sortable)
- 💵 Revenue breakdown by campaign
- ⏰ Campaign lifespan timeline

### 5. Facebook Performance (stg.v9_facebook_performance_daily)
**Колонки**: dt, campaign_name, campaign_id, adset_name, ad_name, spend, impressions, clicks, ctr, cpc, fb_leads_raw, crm_leads_same_day, crm_leads_7d, contracts, revenue, cpl, roas

**Данные**:
- 1,993 записей (ежедневно по кампаниям)
- Детализация до уровня adset и ad
- ROAS, CPL, CPC метрики
- Связь с CRM лидами (same day + 7 дней)

**Можно добавить на фронтенд**:
- 💸 Spend vs Revenue chart
- 📈 ROAS trend по кампаниям
- 🎯 Best performing ads (по ROAS)
- 📊 Adset performance comparison
- 🔥 Heatmap: день недели vs performance

### 6. Google Ads Performance (stg.v9_google_performance_daily)
**Колонки**: dt, campaign_id, campaign_name, spend, impressions, clicks, cpc, ctr, crm_leads_same_day, crm_leads_7d, contracts, revenue, cpl, roas

**Данные**:
- 295 записей
- ROAS, CPL, CPC метрики
- Связь с CRM лидами

**Можно добавить на фронтенд**:
- 💸 Cost efficiency (CPC vs CPL)
- 📈 Performance trends
- 🎯 Campaign comparison

---

## 🎨 ПЛАН УСОВЕРШЕНСТВОВАНИЯ ПО СТРАНИЦАМ

### /data-analytics (основная аналитика)

#### Текущее состояние:
- Базовая воронка
- Campaigns performance
- Platform daily
- Contracts by campaign
- Attribution summary

#### ЧТО ДОБАВИТЬ:

**1. Advanced Funnel Visualization** 📊
```typescript
// Sankey diagram: Platform → Attribution Level → Campaign
<SankeyChart
  data={funnelData}
  levels={['platform', 'attribution_level', 'campaign']}
/>
```

**2. Attribution Sunburst Chart** 🎨
```typescript
// Hierarchical view: Level 1 → Platform → Campaign
<SunburstChart
  data={attributionData}
  valueField="revenue"
/>
```

**3. Platform Performance Trends** 📈
```typescript
// Multi-line chart: leads, contracts, revenue по времени
<LineChart
  data={platformDaily}
  lines={[
    {key: 'leads', color: 'blue'},
    {key: 'contracts', color: 'green'},
    {key: 'revenue', color: 'purple'}
  ]}
/>
```

**4. Conversion Rate Heatmap** 🔥
```typescript
// Platform vs Day of Week heatmap
<Heatmap
  data={conversionRates}
  xAxis="day_of_week"
  yAxis="platform"
  value="conversion_rate"
/>
```

**5. Days to Contract Distribution** ⏱️
```typescript
// Histogram: сколько дней от лида до контракта
<Histogram
  data={daysToContract}
  bins={[0, 1, 3, 7, 14, 30, 60, 90]}
  label="Days to Close"
/>
```

**6. Top Platforms KPI Cards** 💎
```typescript
// 4 карточки с ключевыми метриками
<KpiCards>
  <Card title="Best Conversion" value="Email" metric="50%" />
  <Card title="Highest Revenue" value="Google" metric="972K" />
  <Card title="Most Contracts" value="Other" metric="386" />
  <Card title="Best ROAS" value="Event" metric="2.6x" />
</KpiCards>
```

---

### /ads (реклама)

#### ЧТО ДОБАВИТЬ:

**1. Facebook Ads Deep Dive** 📱

```typescript
// Tabs: Campaigns | Adsets | Ads
<Tabs>
  <Tab title="Campaigns">
    <CampaignTable
      columns={['campaign', 'spend', 'leads', 'contracts', 'roas', 'cpl']}
      sortable
      filterable
    />
  </Tab>

  <Tab title="Adsets">
    <AdsetPerformance
      groupBy="campaign"
      metrics={['spend', 'ctr', 'cpc', 'conversions']}
    />
  </Tab>

  <Tab title="Ads">
    <AdPerformance
      withCreatives
      columns={['ad_name', 'adset', 'campaign', 'roas', 'cpl']}
    />
  </Tab>
</Tabs>
```

**2. Google Ads Performance** 🔍

```typescript
// Campaign comparison chart
<BarChart
  data={googleCampaigns}
  x="campaign_name"
  bars={[
    {key: 'clicks', color: 'blue'},
    {key: 'conversions', color: 'green'}
  ]}
/>
```

**3. Cross-Platform Comparison** ⚖️

```typescript
// Side-by-side: Facebook vs Google
<ComparisonView>
  <Column title="Facebook">
    <Metric name="Spend" value={facebookSpend} />
    <Metric name="ROAS" value={facebookRoas} />
    <Metric name="Contracts" value={facebookContracts} />
  </Column>

  <Column title="Google">
    <Metric name="Spend" value={googleSpend} />
    <Metric name="ROAS" value={googleRoas} />
    <Metric name="Contracts" value={googleContracts} />
  </Column>
</ComparisonView>
```

**4. Daily Performance Trend** 📈

```typescript
// Dual-axis chart: Spend (bars) + ROAS (line)
<ComboChart
  data={dailyPerformance}
  bars={[{key: 'spend', color: 'red'}]}
  lines={[{key: 'roas', color: 'green'}]}
/>
```

**5. Campaign Efficiency Matrix** 🎯

```typescript
// Scatter plot: CPL (x) vs Conversion Rate (y)
// Size = spend, Color = platform
<ScatterPlot
  data={campaigns}
  x="cpl"
  y="conversion_rate"
  size="spend"
  color="platform"
/>
```

---

### /contracts (контракты)

#### ЧТО ДОБАВИТЬ:

**1. Attribution Breakdown** 🎨

```typescript
// Stacked bar chart by month
<StackedBarChart
  data={contractsByMonth}
  x="month"
  stacks={[
    {key: 'campaign_match', label: 'Campaign', color: '#10b981'},
    {key: 'utm_attribution', label: 'UTM', color: '#3b82f6'},
    {key: 'crm_manual', label: 'CRM', color: '#f59e0b'},
    {key: 'unattributed', label: 'Unknown', color: '#ef4444'}
  ]}
/>
```

**2. Contract Details Table** 📋

```typescript
// Expandable rows с полными деталями
<ExpandableTable
  data={contracts}
  columns={['date', 'amount', 'platform', 'campaign', 'attribution_level']}
  expandedContent={(row) => (
    <ContractDetails
      utmSource={row.utm_source}
      utmCampaign={row.utm_campaign}
      utmMedium={row.utm_medium}
      crmSource={row.crm_manual_source}
      daysToClose={row.days_to_contract}
    />
  )}
/>
```

**3. Revenue Timeline** 💰

```typescript
// Area chart: Cumulative revenue by platform
<AreaChart
  data={revenueTimeline}
  x="date"
  areas={platforms.map(p => ({
    key: p,
    color: platformColors[p]
  }))}
  cumulative
/>
```

**4. Top Campaigns Revenue** 🏆

```typescript
// Horizontal bar chart: Top 10 campaigns by revenue
<HorizontalBarChart
  data={topCampaigns}
  y="campaign_name"
  x="revenue"
  color="platform"
  sorted
  limit={10}
/>
```

**5. Contract Velocity** ⚡

```typescript
// Line chart: Contracts per day (7-day moving average)
<LineChart
  data={contractVelocity}
  x="date"
  y="contracts_ma7"
  showTrend
  annotations={[
    {date: '2025-09-01', label: 'Campaign Launch'},
    {date: '2025-10-01', label: 'New Ad Set'}
  ]}
/>
```

**6. Attribution Sankey** 🌊

```typescript
// Flow: Source → Platform → Campaign → Contract
<SankeyDiagram
  nodes={['Sources', 'Platforms', 'Campaigns', 'Contracts']}
  links={attributionFlow}
  valueFormat="contract"
/>
```

---

## 📦 НОВЫЕ КОМПОНЕНТЫ ДЛЯ СОЗДАНИЯ

### 1. Chart Components

```typescript
// apps/web-enterprise/src/components/charts/

SankeyChart.tsx         // Sankey diagram for flow visualization
SunburstChart.tsx       // Hierarchical data visualization
Heatmap.tsx             // 2D heatmap for correlations
ComboChart.tsx          // Dual-axis (bars + lines)
ScatterPlot.tsx         // Scatter plot with size + color
HorizontalBarChart.tsx  // Horizontal bars for rankings
```

### 2. Data Components

```typescript
// apps/web-enterprise/src/components/analytics/

AttributionBreakdown.tsx    // Attribution level breakdown
CampaignComparison.tsx      // Side-by-side campaign comparison
ContractDetails.tsx         // Expandable contract details
PlatformKpis.tsx           // Platform KPI cards
FunnelVisualization.tsx    // Multi-stage funnel
```

### 3. Table Components

```typescript
// apps/web-enterprise/src/components/tables/

ExpandableTable.tsx         // Table with expandable rows
SortableTable.tsx          // Table with sorting + filtering
PaginatedTable.tsx         // Table with server-side pagination
```

---

## 🎯 ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

### Phase 1: Базовые улучшения (1-2 дня)
1. ✅ Добавить недостающие V9 API endpoints
2. ⏳ Attribution breakdown на /contracts
3. ⏳ Platform KPI cards на /data-analytics
4. ⏳ Campaign performance table на /ads

### Phase 2: Визуализации (2-3 дня)
1. ⏳ Sankey diagram для attribution flow
2. ⏳ Heatmap для conversion rates
3. ⏳ Scatter plot для campaign efficiency
4. ⏳ Revenue timeline

### Phase 3: Advanced Features (3-4 дня)
1. ⏳ Facebook Ads deep dive (campaigns/adsets/ads)
2. ⏳ Google Ads performance analysis
3. ⏳ Contract details с UTM + CRM
4. ⏳ Days to contract distribution

---

## 🚀 ТЕХНИЧЕСКИЙ СТЕК

### Frontend:
- **Charts**: Recharts (уже используется) + D3.js для Sankey/Sunburst
- **Tables**: TanStack Table v8
- **UI**: Shadcn/ui components
- **State**: React hooks + SWR для кэширования

### API Endpoints (уже готовы):
- `/api/data-analytics/v9/platforms/daily` ✅
- `/api/data-analytics/v9/funnel/complete` ✅
- `/api/data-analytics/v9/contracts/attribution` ✅
- `/api/data-analytics/v9/contracts/by-campaign` ✅
- `/api/data-analytics/v9/campaigns/facebook` ✅
- `/api/data-analytics/v9/campaigns/google` ✅

---

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### До (текущее состояние):
- Базовые таблицы
- Простые графики
- Ограниченная детализация

### После улучшений:
- 🎨 Rich visualizations (Sankey, Sunburst, Heatmap)
- 📊 Deep dive по каждой платформе
- 🔍 Детальная атрибуция с UTM + CRM
- 📈 Тренды и прогнозы
- ⚡ Real-time performance metrics
- 🎯 Actionable insights

### Метрики качества:
- **Данные**: 100% покрытие (473 контракта, 1993 Facebook ads, 295 Google campaigns)
- **Визуализации**: 15+ типов графиков
- **Детализация**: 3 уровня (platform → campaign → ad)
- **Атрибуция**: 5 уровней attribution

---

**Автор**: Claude Code Assistant
**Дата**: 23 октября 2025
**Версия**: V9 Frontend Enhancement Plan v1.0
**Статус**: 🟡 Ready for Implementation
