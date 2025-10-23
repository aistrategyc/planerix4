# 📊 V9 API Endpoints - GAP Analysis
## Что есть vs Что нужно
### 23 октября 2025

---

## ✅ СУЩЕСТВУЮЩИЕ ENDPOINTS (`/api/v1/v9/...`)

### Campaign Performance
- ✅ `GET /v9/campaigns/performance` - Campaign performance with full funnel
- ✅ `GET /v9/campaigns/summary` - Campaign summary

### Contract Attribution
- ✅ `GET /v9/contracts/attribution` - Contracts with full attribution
- ✅ `GET /v9/contracts/attribution-summary` - Attribution summary by level
- ✅ `GET /v9/contracts/by-campaign` - Contracts grouped by campaign

### Facebook Creatives
- ✅ `GET /v9/facebook/creatives` - Facebook ad creatives with details
- ✅ `GET /v9/facebook/creative-types` - Performance by creative type
- ✅ `GET /v9/facebook/top-creatives` - Top performing creatives

### Platform & Funnel
- ✅ `GET /v9/platforms/daily` - Daily platform performance
- ✅ `GET /v9/funnel/complete` - Complete marketing funnel

### Health Check
- ✅ `GET /v9/health` - System health check

---

## ❌ ОТСУТСТВУЮЩИЕ ENDPOINTS (Нужно создать)

### Page 1: `/analytics/ads` - Реклама

#### Summary & Trends
- ❌ `GET /api/v1/analytics/ads/summary`
  - **Нужно**: Total Spend, Contracts, Revenue, ROAS с динамикой vs prev period
  - **Статус**: Частично есть в `/v9/campaigns/performance` но без TOTAL и без prev period
  - **Action**: Создать новый endpoint

- ❌ `GET /api/v1/analytics/ads/daily-trend`
  - **Нужно**: Spend, Revenue, Contracts, ROAS по дням
  - **Статус**: Частично есть в `/v9/platforms/daily` но без Spend
  - **Action**: Создать новый endpoint с Spend data

#### Campaigns
- ✅ `GET /api/v1/analytics/ads/campaigns`
  - **Статус**: Почти есть в `/v9/campaigns/performance`
  - **Action**: Добавить pagination, sorting, filters

#### Creatives
- ✅ `GET /api/v1/analytics/ads/creatives`
  - **Статус**: Есть в `/v9/facebook/creatives`
  - **Action**: Переименовать или создать alias

---

### Page 2: `/analytics/data-analytics` - Общая Аналитика

#### Global Summary
- ❌ `GET /api/v1/analytics/data-analytics/summary`
  - **Нужно**: Total contracts (ALL), Total revenue (ALL), Attributed contracts, Attributed revenue, Avg contract value, Avg days to close
  - **Статус**: Нет такого endpoint
  - **Action**: Создать новый endpoint

#### Daily Trend
- ❌ `GET /api/v1/analytics/data-analytics/daily-trend`
  - **Нужно**: Total contracts, Total revenue, Attributed contracts, Attributed revenue по дням
  - **Статус**: Частично есть в `/v9/platforms/daily` но только по платформам
  - **Action**: Создать новый endpoint с TOTAL aggregation

#### Contracts by Source
- ❌ `GET /api/v1/analytics/data-analytics/contracts-by-source`
  - **Нужно**: Stacked data (Google, Facebook, Instagram, Email, Viber, Telegram, Event, Direct, Organic) по дням/неделям
  - **Статус**: Нет такого endpoint
  - **Action**: Создать новый endpoint

#### Platforms Summary
- ✅ `GET /api/v1/analytics/data-analytics/platforms`
  - **Статус**: Частично есть в `/v9/funnel/complete`
  - **Action**: Добавить trend sparkline, top campaign

#### Conversion Funnel
- ❌ `GET /api/v1/analytics/data-analytics/funnel`
  - **Нужно**: Impressions → Clicks → Leads → Contracts с conversion rates
  - **Статус**: Есть `/v9/funnel/complete` но без Impressions и Clicks
  - **Action**: Расширить существующий endpoint

---

### Page 3: `/analytics/contracts` - Контракты

#### Summary
- ❌ `GET /api/v1/analytics/contracts/summary`
  - **Нужно**: Total contracts, Total revenue, Attributed/Unattributed breakdown, Top platform
  - **Статус**: Частично есть в `/v9/contracts/attribution-summary`
  - **Action**: Расширить с добавлением top platform

#### Contracts List
- ❌ `GET /api/v1/analytics/contracts/list`
  - **Нужно**: Full contracts list с фильтрами (platforms, amount range, days range, attribution status, search)
  - **Статус**: Есть `/v9/contracts/attribution` но без advanced filters
  - **Action**: Расширить с pagination и filters

#### Contract Details
- ❌ `GET /api/v1/analytics/contracts/{contract_id}`
  - **Нужно**: Full contract details (contract info, client info, attribution info, timeline)
  - **Статус**: НЕТ
  - **Action**: Создать новый endpoint

- ❌ `GET /api/v1/analytics/contracts/{contract_id}/events`
  - **Нужно**: All client events for contract
  - **Статус**: НЕТ
  - **Action**: Создать новый endpoint

#### Attribution Breakdown
- ✅ `GET /api/v1/analytics/contracts/attribution-breakdown`
  - **Статус**: Есть в `/v9/contracts/attribution-summary`
  - **Action**: Переименовать или создать alias

#### Days to Close Distribution
- ❌ `GET /api/v1/analytics/contracts/days-to-close-distribution`
  - **Нужно**: Histogram data (buckets: 0-5, 6-10, 11-15, etc.)
  - **Статус**: НЕТ
  - **Action**: Создать новый endpoint

---

### Page 4: `/analytics/marketing` - Маркетинг

#### Marketing Summary
- ❌ `GET /api/v1/analytics/marketing/summary`
  - **Нужно**: Total sources, Paid channels summary, Organic channels summary, Best channel, Fastest channel
  - **Статус**: НЕТ
  - **Action**: Создать новый endpoint

#### Sources Performance
- ❌ `GET /api/v1/analytics/marketing/sources`
  - **Нужно**: ALL sources (paid + organic) с type, contracts, revenue, spend, ROAS/ROI, top campaign, trend
  - **Статус**: Частично есть в `/v9/funnel/complete` но без organic sources
  - **Action**: Создать новый endpoint

#### Source Campaigns
- ❌ `GET /api/v1/analytics/marketing/source/{source}/campaigns`
  - **Нужно**: Campaigns for specific source (Email, Viber, Telegram, etc.)
  - **Статус**: Частично есть в `/v9/contracts/by-campaign` но только для attributed
  - **Action**: Создать новый endpoint

#### Paid vs Organic Comparison
- ❌ `GET /api/v1/analytics/marketing/paid-vs-organic`
  - **Нужно**: Side by side comparison (paid channels vs organic channels)
  - **Статус**: НЕТ
  - **Action**: Создать новый endpoint

#### Channel Mix Trend
- ❌ `GET /api/v1/analytics/marketing/channel-mix-trend`
  - **Нужно**: Stacked area data (% from total by day/week)
  - **Статус**: НЕТ
  - **Action**: Создать новый endpoint

---

## 📊 ПРИОРИТЕТЫ РАЗРАБОТКИ

### CRITICAL (P0) - Без этого страницы не работают

1. **`GET /api/v1/analytics/data-analytics/summary`** ⚠️
   - Нужно для главного dashboard
   - Total contracts, Total revenue, Attribution rate
   - **ETA**: 1 day

2. **`GET /api/v1/analytics/contracts/list`** ⚠️
   - Нужно для contracts table с filters
   - Pagination, sorting, advanced filters
   - **ETA**: 2 days

3. **`GET /api/v1/analytics/ads/summary`** ⚠️
   - Нужно для ads KPI cards
   - Total spend, contracts, revenue, ROAS с prev period
   - **ETA**: 1 day

### HIGH (P1) - Нужно для полного функционала

4. **`GET /api/v1/analytics/marketing/summary`** 🔶
   - Нужно для marketing overview
   - Paid vs Organic breakdown
   - **ETA**: 1 day

5. **`GET /api/v1/analytics/contracts/{contract_id}`** 🔶
   - Нужно для contract details modal
   - Full contract + client + attribution info
   - **ETA**: 1 day

6. **`GET /api/v1/analytics/data-analytics/contracts-by-source`** 🔶
   - Нужно для stacked bar chart
   - ALL sources (не только paid)
   - **ETA**: 1 day

### MEDIUM (P2) - Улучшения UX

7. **`GET /api/v1/analytics/ads/daily-trend`** 🟡
   - Нужно для ads line chart
   - Spend, Revenue, Contracts по дням
   - **ETA**: 0.5 days

8. **`GET /api/v1/analytics/marketing/paid-vs-organic`** 🟡
   - Нужно для paid vs organic comparison
   - Side by side metrics
   - **ETA**: 0.5 days

9. **`GET /api/v1/analytics/contracts/days-to-close-distribution`** 🟡
   - Нужно для histogram
   - Buckets по days
   - **ETA**: 0.5 days

### LOW (P3) - Nice to have

10. **`GET /api/v1/analytics/contracts/{contract_id}/events`** 🟢
    - Нужно для contract details modal (tab 2)
    - All client events
    - **ETA**: 0.5 days

11. **`GET /api/v1/analytics/marketing/channel-mix-trend`** 🟢
    - Нужно для stacked area chart
    - Channel evolution over time
    - **ETA**: 0.5 days

12. **`GET /api/v1/analytics/marketing/source/{source}/campaigns`** 🟢
    - Нужно для expandable rows
    - Campaigns per source
    - **ETA**: 0.5 days

---

## 🛠️ IMPLEMENTATION PLAN

### Week 1: Critical Endpoints (P0)

**Day 1-2**:
- [ ] Create `/api/v1/analytics/data-analytics/summary`
- [ ] Create `/api/v1/analytics/ads/summary`
- [ ] Test with frontend

**Day 3-4**:
- [ ] Create `/api/v1/analytics/contracts/list` (with pagination, filters)
- [ ] Test with frontend

**Day 5**:
- [ ] Code review
- [ ] Documentation
- [ ] Deploy to staging

### Week 2: High Priority Endpoints (P1)

**Day 6-7**:
- [ ] Create `/api/v1/analytics/marketing/summary`
- [ ] Create `/api/v1/analytics/contracts/{contract_id}`
- [ ] Test with frontend

**Day 8-9**:
- [ ] Create `/api/v1/analytics/data-analytics/contracts-by-source`
- [ ] Test with frontend

**Day 10**:
- [ ] Code review
- [ ] Documentation
- [ ] Deploy to staging

### Week 3: Medium Priority Endpoints (P2)

**Day 11-12**:
- [ ] Create `/api/v1/analytics/ads/daily-trend`
- [ ] Create `/api/v1/analytics/marketing/paid-vs-organic`
- [ ] Test with frontend

**Day 13**:
- [ ] Create `/api/v1/analytics/contracts/days-to-close-distribution`
- [ ] Test with frontend

**Day 14**:
- [ ] Code review
- [ ] Documentation

**Day 15**:
- [ ] Deploy to staging
- [ ] QA testing

### Week 4: Low Priority Endpoints (P3) + Polish

**Day 16-18**:
- [ ] Create remaining P3 endpoints
- [ ] Test all endpoints
- [ ] Performance optimization

**Day 19-20**:
- [ ] Final QA
- [ ] Documentation complete
- [ ] Deploy to production

---

## 📝 ENDPOINT TEMPLATES

### Template 1: Summary Endpoint

```python
@router.get("/analytics/data-analytics/summary")
async def get_data_analytics_summary(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> Dict[str, Any]:
    """
    Get global analytics summary
    """
    try:
        # Current period
        current_query = """
            SELECT
                COUNT(*) as total_contracts,
                SUM(contract_amount) as total_revenue,
                COUNT(*) FILTER (WHERE campaign_name IS NOT NULL) as attributed_contracts,
                SUM(contract_amount) FILTER (WHERE campaign_name IS NOT NULL) as attributed_revenue,
                AVG(contract_amount) as avg_contract_value,
                AVG(days_to_contract) FILTER (WHERE campaign_name IS NOT NULL) as avg_days_to_close
            FROM stg.fact_contracts
            WHERE contract_day >= :start_date AND contract_day <= :end_date
        """

        current_result = await session.execute(
            text(current_query),
            {"start_date": start_date, "end_date": end_date}
        )
        current = current_result.fetchone()

        # Previous period (same duration)
        days_diff = (end_date - start_date).days
        prev_start = start_date - timedelta(days=days_diff + 1)
        prev_end = start_date - timedelta(days=1)

        prev_result = await session.execute(
            text(current_query),
            {"start_date": prev_start, "end_date": prev_end}
        )
        prev = prev_result.fetchone()

        # Calculate changes
        def pct_change(current_val, prev_val):
            if not prev_val or prev_val == 0:
                return None
            return round(100.0 * (current_val - prev_val) / prev_val, 2)

        return {
            "total_contracts": int(current.total_contracts),
            "total_revenue": float(current.total_revenue) if current.total_revenue else 0.0,
            "attributed_contracts": int(current.attributed_contracts) if current.attributed_contracts else 0,
            "attributed_contracts_pct": round(100.0 * current.attributed_contracts / current.total_contracts, 2) if current.total_contracts else 0,
            "attributed_revenue": float(current.attributed_revenue) if current.attributed_revenue else 0.0,
            "attributed_revenue_pct": round(100.0 * current.attributed_revenue / current.total_revenue, 2) if current.total_revenue else 0,
            "avg_contract_value": round(float(current.avg_contract_value), 2) if current.avg_contract_value else 0.0,
            "avg_days_to_close": round(float(current.avg_days_to_close), 1) if current.avg_days_to_close else None,
            "prev_period": {
                "total_contracts": int(prev.total_contracts),
                "total_revenue": float(prev.total_revenue) if prev.total_revenue else 0.0,
                "attributed_contracts": int(prev.attributed_contracts) if prev.attributed_contracts else 0,
            },
            "change": {
                "total_contracts_pct": pct_change(current.total_contracts, prev.total_contracts),
                "total_revenue_pct": pct_change(current.total_revenue, prev.total_revenue),
                "attributed_contracts_pct": pct_change(current.attributed_contracts, prev.attributed_contracts),
            }
        }

    except Exception as e:
        logger.error(f"Error fetching data analytics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Template 2: List Endpoint with Filters

```python
@router.get("/analytics/contracts/list")
async def get_contracts_list(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    platforms: Optional[List[str]] = Query(default=None),
    min_amount: Optional[float] = Query(default=None),
    max_amount: Optional[float] = Query(default=None),
    min_days: Optional[int] = Query(default=None),
    max_days: Optional[int] = Query(default=None),
    attribution_status: Optional[str] = Query(default=None),  # all, attributed, unattributed
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="contract_date"),
    sort_order: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> Dict[str, Any]:
    """
    Get contracts list with advanced filters and pagination
    """
    try:
        # Build WHERE clause
        where_clauses = ["contract_day >= :start_date", "contract_day <= :end_date"]
        params = {"start_date": start_date, "end_date": end_date}

        if platforms:
            where_clauses.append("matched_platform = ANY(:platforms)")
            params["platforms"] = platforms

        if min_amount is not None:
            where_clauses.append("contract_amount >= :min_amount")
            params["min_amount"] = min_amount

        if max_amount is not None:
            where_clauses.append("contract_amount <= :max_amount")
            params["max_amount"] = max_amount

        if min_days is not None:
            where_clauses.append("days_to_contract >= :min_days")
            params["min_days"] = min_days

        if max_days is not None:
            where_clauses.append("days_to_contract <= :max_days")
            params["max_days"] = max_days

        if attribution_status == "attributed":
            where_clauses.append("campaign_name IS NOT NULL")
        elif attribution_status == "unattributed":
            where_clauses.append("campaign_name IS NULL")

        if search:
            where_clauses.append("(campaign_name ILIKE :search OR ad_name ILIKE :search OR CAST(client_id AS TEXT) ILIKE :search)")
            params["search"] = f"%{search}%"

        where_sql = " AND ".join(where_clauses)

        # Sort
        sort_columns = {
            "contract_date": "contract_day",
            "contract_amount": "contract_amount",
            "days_to_close": "days_to_contract",
            "platform": "matched_platform"
        }
        sort_column = sort_columns.get(sort_by, "contract_day")
        sort_direction = "DESC" if sort_order.lower() == "desc" else "ASC"

        # Count total
        count_query = f"SELECT COUNT(*) as total FROM stg.fact_contracts WHERE {where_sql}"
        count_result = await session.execute(text(count_query), params)
        total = count_result.fetchone().total

        # Fetch data
        offset = (page - 1) * limit
        data_query = f"""
            SELECT
                contract_source_id,
                client_id,
                contract_date,
                contract_day,
                contract_amount,
                matched_platform,
                campaign_name,
                ad_name,
                lead_day,
                days_to_contract,
                utm_source,
                utm_campaign
            FROM stg.fact_contracts
            WHERE {where_sql}
            ORDER BY {sort_column} {sort_direction}
            LIMIT :limit OFFSET :offset
        """
        params["limit"] = limit
        params["offset"] = offset

        result = await session.execute(text(data_query), params)
        rows = result.fetchall()

        return {
            "data": [
                {
                    "contract_id": int(row.contract_source_id),
                    "client_id": int(row.client_id),
                    "contract_date": str(row.contract_day),
                    "contract_amount": float(row.contract_amount),
                    "platform": row.matched_platform,
                    "campaign_name": row.campaign_name,
                    "ad_name": row.ad_name,
                    "lead_date": str(row.lead_day) if row.lead_day else None,
                    "days_to_close": int(row.days_to_contract) if row.days_to_contract is not None else None,
                    "utm_source": row.utm_source,
                    "utm_campaign": row.utm_campaign,
                }
                for row in rows
            ],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": int(total),
                "total_pages": (int(total) + limit - 1) // limit
            }
        }

    except Exception as e:
        logger.error(f"Error fetching contracts list: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ✅ CHECKLIST ДЛЯ КАЖДОГО ENDPOINT

- [ ] SQL query написан и протестирован
- [ ] Pydantic schema создана (если нужна)
- [ ] Route handler реализован
- [ ] Parameters валидация добавлена
- [ ] Error handling добавлен
- [ ] Logging добавлен
- [ ] Документация (docstring) написана
- [ ] Unit tests написаны
- [ ] Integration test написан
- [ ] Postman/Thunder collection обновлена
- [ ] Frontend TypeScript types обновлены
- [ ] API documentation (Swagger) обновлена

---

## 🎯 SUCCESS METRICS

### Performance
- Response time < 1s для summary endpoints
- Response time < 2s для list endpoints с pagination
- Response time < 3s для complex queries

### Coverage
- [ ] 100% critical endpoints (P0) реализованы
- [ ] 80%+ high priority endpoints (P1) реализованы
- [ ] 50%+ medium priority endpoints (P2) реализованы

### Quality
- [ ] Unit test coverage > 80%
- [ ] Integration test coverage > 60%
- [ ] Zero critical bugs in production

---

**Prepared by**: Claude Code Assistant
**Date**: 2025-10-23
**Version**: V9 Final
**Status**: 🟡 **IN PROGRESS** (10/14 endpoints exist, 4/14 critical missing)
