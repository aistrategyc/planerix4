"""
API endpoints для аналитических данных из схемы dm
Реализация согласно ТЗ на визуализацию маркетингово-CRM данных
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
from liderix_api.db import get_itstep_session

router = APIRouter(tags=["Analytics"])

def build_platform_condition(platform: Optional[str]) -> tuple[str, dict]:
    """Helper to build platform condition and parameters"""
    if platform:
        return "AND platform = :platform", {"platform": platform}
    return "", {}

def parse_date_string(date_str: Optional[str]) -> Optional[date]:
    """Parse date string to date object"""
    if not date_str:
        return None
    try:
        if isinstance(date_str, str):
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        return date_str
    except ValueError:
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
        except ValueError:
            return None

def prepare_date_params(date_from: Optional[str], date_to: Optional[str], **extra_params) -> dict:
    """Helper to prepare parameters with properly parsed dates"""
    params = {
        "date_from": parse_date_string(date_from),
        "date_to": parse_date_string(date_to),
    }
    params.update(extra_params)
    return params

async def get_dynamic_date_range(db: AsyncSession, default_days_back: int = 7) -> tuple[str, str]:
    """Helper function to get dynamic date range from database"""
    try:
        # Get actual latest dates from database
        date_range_query = text("""
            SELECT MAX(date) AS max_date,
                   MAX(date) - INTERVAL :days_back * '1 day' AS start_date
            FROM dm.dm_perf_crm_360_by_source
            WHERE date IS NOT NULL
        """)

        date_result = await db.execute(date_range_query, {"days_back": default_days_back})
        date_info = date_result.fetchone()

        if date_info and date_info.max_date:
            date_to = date_info.max_date.strftime("%Y-%m-%d")
            date_from = date_info.start_date.strftime("%Y-%m-%d") if date_info.start_date else date_to
            return date_from, date_to
        else:
            # Fallback to current dates if no data
            date_to = datetime.now().strftime("%Y-%m-%d")
            date_from = (datetime.now() - timedelta(days=default_days_back)).strftime("%Y-%m-%d")
            return date_from, date_to
    except Exception:
        # Fallback in case of any error
        date_to = datetime.now().strftime("%Y-%m-%d")
        date_from = (datetime.now() - timedelta(days=default_days_back)).strftime("%Y-%m-%d")
        return date_from, date_to

@router.get("/executive-overview")
async def get_executive_overview(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(None, description="Platform filter"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Executive Overview - KPI карточки и тренды за 30 дней"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        # Получаем актуальные даты из базы
        date_range_subquery = text("""
            SELECT MAX(date) AS max_date, MAX(date) - INTERVAL '7 days' AS start_date
            FROM dm.dm_perf_crm_360_by_source
            WHERE date IS NOT NULL
        """)
        date_result = await db.execute(date_range_subquery)
        date_info = date_result.fetchone()

        if date_info and date_info.max_date:
            if not date_to:
                date_to = date_info.max_date.strftime("%Y-%m-%d")
            if not date_from:
                date_from = date_info.start_date.strftime("%Y-%m-%d") if date_info.start_date else date_to
        else:
            # Fallback
            if not date_to:
                date_to = datetime.now().strftime("%Y-%m-%d")
            if not date_from:
                date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        # KPI агрегаты - используем реальную таблицу dm.dm_perf_crm_360_by_source
        platform_condition = "AND crm.platform = :platform" if platform else ""
        kpi_query = text(f"""
            SELECT
                COALESCE(SUM(cd.impressions), 0) AS impressions,
                COALESCE(SUM(cd.clicks), 0) AS clicks,
                COALESCE(SUM(crm.cost), 0) AS cost,
                COALESCE(SUM(crm.leads), 0) AS leads,
                COALESCE(SUM(crm.contracts), 0) AS contracts,
                COALESCE(SUM(crm.revenue), 0) AS revenue,
                CASE WHEN SUM(crm.cost) > 0 THEN SUM(crm.revenue)/SUM(crm.cost) ELSE 0 END AS roas,
                CASE WHEN SUM(crm.leads) > 0 THEN SUM(crm.cost)/SUM(crm.leads) ELSE 0 END AS cpl,
                CASE WHEN SUM(crm.contracts) > 0 THEN SUM(crm.cost)/SUM(crm.contracts) ELSE 0 END AS cpa
            FROM dm.dm_perf_crm_360_by_source crm
            LEFT JOIN dm.dm_campaign_daily cd ON crm.date = cd.date AND crm.platform = cd.platform
            WHERE crm.date BETWEEN :date_from AND :date_to
            {platform_condition}
            AND crm.source != '(platform_total)'
        """)

        # Получаем реальные данные из БД - преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
        }
        if platform:
            params["platform"] = platform
        result = await db.execute(kpi_query, params)
        kpis_raw = result.fetchone()

        # Обрабатываем реальные данные с fallback для NULL значений
        if kpis_raw:
            kpis = {
                'impressions': int(kpis_raw.impressions or 0),
                'clicks': int(kpis_raw.clicks or 0),
                'cost': float(kpis_raw.cost or 0),
                'leads': int(kpis_raw.leads or 0),
                'contracts': int(kpis_raw.contracts or 0),
                'revenue': float(kpis_raw.revenue or 0),
                'roas': float(kpis_raw.roas or 0),
                'cpl': float(kpis_raw.cpl or 0),
                'cpa': float(kpis_raw.cpa or 0)
            }
        else:
            kpis = {
                'impressions': 0, 'clicks': 0, 'cost': 0.0, 'leads': 0,
                'contracts': 0, 'revenue': 0.0, 'roas': 0.0, 'cpl': 0.0, 'cpa': 0.0
            }

        # Тренды по дням - используем реальную таблицу dm.dm_perf_crm_360_by_source
        platform_condition, platform_params = build_platform_condition(platform)
        trend_query = text(f"""
            SELECT
                date,
                SUM(cost) AS cost,
                SUM(leads) AS leads,
                SUM(contracts) AS contracts,
                SUM(revenue) AS revenue
            FROM dm.dm_perf_crm_360_by_source
            WHERE date BETWEEN :date_from AND :date_to
            {platform_condition}
            AND source != '(platform_total)'
            GROUP BY date
            ORDER BY date
        """)

        # Получаем данные трендов
        trend_params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
        }
        trend_params.update(platform_params)
        result = await db.execute(trend_query, trend_params)
        trends_raw = result.fetchall()

        # Обрабатываем реальные данные трендов
        trends = []
        for row in trends_raw:
            trends.append({
                "date": row.date.strftime("%Y-%m-%d"),
                "cost": float(row.cost or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0)
            })

        # ROAS vs Cost scatter data - используем реальную таблицу
        platform_condition_scatter, platform_params_scatter = build_platform_condition(platform)
        scatter_query = text(f"""
            SELECT
                date,
                platform,
                SUM(cost) AS cost,
                CASE WHEN SUM(cost) > 0 THEN SUM(revenue)/SUM(cost) ELSE 0 END AS roas
            FROM dm.dm_perf_crm_360_by_source
            WHERE date BETWEEN :date_from AND :date_to
            {platform_condition_scatter}
            AND source != '(platform_total)'
            GROUP BY date, platform
            HAVING SUM(cost) > 0
            ORDER BY date, platform
        """)

        # Получаем scatter данные
        scatter_params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
        }
        scatter_params.update(platform_params_scatter)
        result = await db.execute(scatter_query, scatter_params)
        scatter_raw = result.fetchall()

        # Обрабатываем реальные scatter данные
        scatter_data = []
        for row in scatter_raw:
            scatter_data.append({
                "date": row.date.strftime("%Y-%m-%d"),
                "platform": row.platform,
                "cost": float(row.cost or 0),
                "roas": float(row.roas or 0)
            })

        return {
            "kpis": kpis,
            "trends": trends,
            "scatter_data": scatter_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/channels-sources")
async def get_channels_sources(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Channels & Sources - распределение по платформам и другим источникам"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Распределение затрат по платформам и дням - используем реальную таблицу
        platform_cost_query = text("""
            SELECT
                date,
                platform,
                SUM(cost) AS cost
            FROM dm.dm_perf_crm_360_by_source
            WHERE date BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR platform = :platform)
            AND source != '(platform_total)'
            GROUP BY date, platform
            ORDER BY date, platform
        """)

        # Получаем данные распределения затрат
        result = await db.execute(platform_cost_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform
        })
        platform_costs_raw = result.fetchall()

        platform_costs = []
        for row in platform_costs_raw:
            platform_costs.append({
                "date": row.date.strftime("%Y-%m-%d"),
                "platform": row.platform,
                "cost": float(row.cost or 0)
            })

        # Other sources данные - используем реальную таблицу
        other_sources_query = text("""
            SELECT date, source, leads, contracts, revenue
            FROM dm.dm_perf_crm_360_by_source
            WHERE date BETWEEN :date_from AND :date_to
            AND platform = 'other'
            AND source != '(platform_total)'
            ORDER BY date DESC, revenue DESC NULLS LAST
        """)

        # Получаем данные других источников
        result = await db.execute(other_sources_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        other_sources_raw = result.fetchall()

        other_sources = []
        for row in other_sources_raw:
            other_sources.append({
                "date": row.date.strftime("%Y-%m-%d"),
                "source": row.source,
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0)
            })

        # Weekly view данные - используем реальную таблицу
        weekly_query = text("""
            SELECT
                platform,
                source,
                SUM(cost) AS cost,
                SUM(leads) AS leads,
                SUM(contracts) AS contracts,
                SUM(revenue) AS revenue,
                CASE WHEN SUM(cost) > 0 THEN SUM(revenue)/SUM(cost) ELSE 0 END AS roas,
                CASE WHEN SUM(leads) > 0 THEN SUM(cost)/SUM(leads) ELSE 0 END AS cpl
            FROM dm.dm_perf_crm_360_by_source
            WHERE date BETWEEN :date_from AND :date_to
            AND source != '(platform_total)'
            GROUP BY platform, source
            ORDER BY platform, source
        """)

        # Получаем недельные данные
        result = await db.execute(weekly_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        weekly_data_raw = result.fetchall()

        weekly_data = []
        for row in weekly_data_raw:
            weekly_data.append({
                "platform": row.platform,
                "source": row.source,
                "cost": float(row.cost or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "roas": float(row.roas or 0),
                "cpl": float(row.cpl or 0)
            })

        return {
            "platform_costs": platform_costs,
            "other_sources": other_sources,
            "weekly_data": weekly_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/campaigns")
async def get_campaigns(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    campaign_key: Optional[str] = Query(None, description="Filter by campaign key"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Campaign Performance - данные по кампаниям"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Основная таблица кампаний
        campaigns_query = text("""
            SELECT
                date,
                platform,
                campaign_key,
                SUM(impressions) AS impressions,
                SUM(clicks) AS clicks,
                SUM(cost) AS cost,
                AVG(ctr_pct) AS ctr_pct,
                AVG(cpc) AS cpc,
                AVG(cpm) AS cpm
            FROM dm.dm_campaign_daily
            WHERE date BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR platform = :platform)
            AND (:campaign_key IS NULL OR campaign_key = :campaign_key)
            GROUP BY date, platform, campaign_key
            ORDER BY date DESC, cost DESC NULLS LAST
        """)

        result = await db.execute(campaigns_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform,
            "campaign_key": campaign_key
        })
        campaigns = [dict(row._mapping) for row in result.fetchall()]

        # Последняя активность кампаний
        latest_activity_query = text("""
            SELECT
                platform,
                campaign_key,
                first_seen,
                last_active_date
            FROM dm.dm_campaign_latest
            WHERE (:platform IS NULL OR platform = :platform)
            AND (:campaign_key IS NULL OR campaign_key = :campaign_key)
            ORDER BY last_active_date DESC
        """)

        result = await db.execute(latest_activity_query, {
            "platform": platform,
            "campaign_key": campaign_key
        })
        latest_activity = [dict(row._mapping) for row in result.fetchall()]

        # 7-дневные агрегаты для оперативной оптимизации
        rolling_7d_query = text("""
            SELECT
                platform,
                campaign_key,
                SUM(impressions) AS impressions_7d,
                SUM(clicks) AS clicks_7d,
                SUM(cost) AS cost_7d,
                AVG(ctr_pct) AS avg_ctr_7d,
                AVG(cpc) AS avg_cpc_7d,
                AVG(cpm) AS avg_cpm_7d
            FROM dm.dm_campaign_rolling_7d
            WHERE (:platform IS NULL OR platform = :platform)
            AND (:campaign_key IS NULL OR campaign_key = :campaign_key)
            GROUP BY platform, campaign_key
            ORDER BY cost_7d DESC NULLS LAST
        """)

        result = await db.execute(rolling_7d_query, {
            "platform": platform,
            "campaign_key": campaign_key
        })
        rolling_7d = [dict(row._mapping) for row in result.fetchall()]

        return {
            "campaigns": campaigns,
            "latest_activity": latest_activity,
            "rolling_7d": rolling_7d
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/creatives")
async def get_creatives(
    platform: Optional[str] = Query(None),
    search_text: Optional[str] = Query(None, description="Search in creative_key/fb_title"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Creative Performance - данные по креативам"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Таблица креативов с поиском
        search_condition = ""
        if search_text:
            search_condition = "AND (c.creative_key ILIKE :search_text OR cat.fb_title ILIKE :search_text)"

        creatives_query = text(f"""
            SELECT
                c.creative_key,
                c.platform,
                cat.fb_title,
                cat.fb_permalink_url,
                SUM(c.impressions) AS impressions,
                SUM(c.clicks) AS clicks,
                SUM(c.cost) AS cost,
                AVG(c.ctr_pct) AS ctr_pct,
                AVG(c.cpc) AS cpc
            FROM dm.dm_creative_daily c
            LEFT JOIN dm.dm_creative_catalog cat ON c.creative_key = cat.fb_creative_id
            WHERE c.date BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR c.platform = :platform)
            {search_condition}
            GROUP BY c.creative_key, c.platform, cat.fb_title, cat.fb_permalink_url
            ORDER BY SUM(c.cost) DESC NULLS LAST, AVG(c.ctr_pct) DESC NULLS LAST
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform
        }
        if search_text:
            params["search_text"] = f"%{search_text}%"

        result = await db.execute(creatives_query, params)
        creatives = [dict(row._mapping) for row in result.fetchall()]

        # Последняя активность креативов
        latest_creatives_query = text("""
            SELECT
                creative_key,
                platform,
                first_seen,
                last_active_date
            FROM dm.dm_creative_latest
            WHERE (:platform IS NULL OR platform = :platform)
            ORDER BY last_active_date DESC
            LIMIT 100
        """)

        result = await db.execute(latest_creatives_query, {"platform": platform})
        latest_activity = [dict(row._mapping) for row in result.fetchall()]

        # 7-дневные агрегаты креативов
        rolling_7d_query = text("""
            SELECT
                creative_key,
                platform,
                SUM(impressions) AS impressions_7d,
                SUM(clicks) AS clicks_7d,
                SUM(cost) AS cost_7d,
                AVG(ctr_pct) AS avg_ctr_7d,
                AVG(cpc) AS avg_cpc_7d
            FROM dm.dm_creative_rolling_7d
            WHERE (:platform IS NULL OR platform = :platform)
            GROUP BY creative_key, platform
            ORDER BY cost_7d DESC NULLS LAST
            LIMIT 50
        """)

        result = await db.execute(rolling_7d_query, {"platform": platform})
        rolling_7d = [dict(row._mapping) for row in result.fetchall()]

        return {
            "creatives": creatives,
            "latest_activity": latest_activity,
            "rolling_7d": rolling_7d
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/crm-outcomes")
async def get_crm_outcomes(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """CRM Outcomes & 360 - воронка и 360 данные"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Ежедневная воронка
        funnel_query = text("""
            SELECT
                date,
                SUM(leads) AS leads,
                SUM(contracts) AS contracts,
                SUM(revenue) AS revenue
            FROM dm.dm_crm_funnel_daily_v2
            WHERE date BETWEEN :date_from AND :date_to
            GROUP BY date
            ORDER BY date
        """)

        result = await db.execute(funnel_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        funnel_data = [dict(row._mapping) for row in result.fetchall()]

        # 360 данные по платформам/источникам
        crm_360_query = text("""
            SELECT
                date,
                platform,
                source,
                cost,
                leads,
                contracts,
                revenue,
                CASE WHEN leads > 0 THEN cost/leads ELSE 0 END AS cpl,
                CASE WHEN contracts > 0 THEN cost/contracts ELSE 0 END AS cpa,
                CASE WHEN cost > 0 THEN revenue/cost ELSE 0 END AS roas
            FROM dm.dm_perf_crm_360_by_source_v2
            WHERE date BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR platform = :platform)
            AND (:source IS NULL OR source = :source)
            AND source != '(platform_total)'  -- Скрываем служебный источник
            ORDER BY date DESC, platform, source
        """)

        result = await db.execute(crm_360_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform,
            "source": source
        })
        crm_360_data = [dict(row._mapping) for row in result.fetchall()]

        # Топ источники по Revenue и Leads
        top_sources_revenue_query = text("""
            SELECT
                platform,
                source,
                SUM(revenue) AS total_revenue,
                SUM(leads) AS total_leads,
                SUM(contracts) AS total_contracts,
                SUM(cost) AS total_cost
            FROM dm.dm_perf_crm_360_by_source_v2
            WHERE date BETWEEN :date_from AND :date_to
            AND source != '(platform_total)'
            GROUP BY platform, source
            ORDER BY total_revenue DESC NULLS LAST
            LIMIT 10
        """)

        result = await db.execute(top_sources_revenue_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        top_sources_revenue = [dict(row._mapping) for row in result.fetchall()]

        top_sources_leads_query = text("""
            SELECT
                platform,
                source,
                SUM(leads) AS total_leads,
                SUM(revenue) AS total_revenue,
                SUM(contracts) AS total_contracts,
                SUM(cost) AS total_cost
            FROM dm.dm_perf_crm_360_by_source_v2
            WHERE date BETWEEN :date_from AND :date_to
            AND source != '(platform_total)'
            GROUP BY platform, source
            ORDER BY total_leads DESC NULLS LAST
            LIMIT 10
        """)

        result = await db.execute(top_sources_leads_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        top_sources_leads = [dict(row._mapping) for row in result.fetchall()]

        return {
            "funnel_data": funnel_data,
            "crm_360_data": crm_360_data,
            "top_sources_revenue": top_sources_revenue,
            "top_sources_leads": top_sources_leads
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/data-quality")
async def get_data_quality(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Data Quality & Monitoring - контроль качества данных"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 7)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Проверка несоответствий (если существует вью)
        try:
            issues_query = text("""
                SELECT issue_perf, issue_crm, count(*) as issue_count
                FROM dm.v_check_perf_vs_crm
                GROUP BY issue_perf, issue_crm
                ORDER BY issue_count DESC
            """)
            result = await db.execute(issues_query)
            issues = [dict(row._mapping) for row in result.fetchall()]
        except:
            issues = []

        # Сверка затрат между платформенными данными и 360
        cost_comparison_query = text("""
            WITH pd AS (
                SELECT date, platform, SUM(cost) AS cost_pd
                FROM dm.dm_platform_daily
                WHERE date BETWEEN :date_from AND :date_to
                GROUP BY date, platform
            ),
            x360 AS (
                SELECT date, platform, SUM(cost) AS cost_360
                FROM dm.dm_perf_crm_360_by_source_v2
                WHERE source = '(platform_total)'
                AND date BETWEEN :date_from AND :date_to
                GROUP BY date, platform
            )
            SELECT
                COALESCE(pd.date, x360.date) AS date,
                COALESCE(pd.platform, x360.platform) AS platform,
                COALESCE(pd.cost_pd, 0) AS cost_pd,
                COALESCE(x360.cost_360, 0) AS cost_360,
                (COALESCE(pd.cost_pd,0) = COALESCE(x360.cost_360,0)) AS is_match,
                ABS(COALESCE(pd.cost_pd,0) - COALESCE(x360.cost_360,0)) AS difference
            FROM pd FULL JOIN x360
                ON pd.date = x360.date AND pd.platform = x360.platform
            WHERE COALESCE(pd.cost_pd,0) != COALESCE(x360.cost_360,0)
            ORDER BY date DESC, platform
        """)

        result = await db.execute(cost_comparison_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        cost_comparison = [dict(row._mapping) for row in result.fetchall()]

        # Поиск пустых/нестандартных источников
        empty_sources_query = text("""
            SELECT
                date,
                platform,
                source,
                SUM(leads) AS leads,
                SUM(contracts) AS contracts,
                SUM(revenue) AS revenue
            FROM dm.dm_perf_crm_360_by_source_v2
            WHERE date BETWEEN :date_from AND :date_to
            AND (source = '(empty)' OR source = '' OR source IS NULL)
            GROUP BY date, platform, source
            ORDER BY date DESC, platform
        """)

        result = await db.execute(empty_sources_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        })
        empty_sources = [dict(row._mapping) for row in result.fetchall()]

        return {
            "issues": issues,
            "cost_comparison": cost_comparison,
            "empty_sources": empty_sources,
            "last_refresh": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/attribution-funnel")
async def get_attribution_funnel(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    product_key: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Attribution Funnel - полная воронка от клика до контракта с использованием fact tables"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Полная воронка атрибуции используя real fact tables
        funnel_query = text("""
            WITH marketing_data AS (
                SELECT
                    fmd.date,
                    fmd.platform,
                    fmd.campaign_key,
                    fmd.creative_key,
                    SUM(fmd.impressions) AS impressions,
                    SUM(fmd.clicks) AS clicks,
                    SUM(fmd.cost) AS cost,
                    SUM(fmd.conversions) AS conversions,
                    SUM(fmd.conversions_value) AS conversions_value
                FROM dwh.fact_marketing_daily fmd
                WHERE fmd.date BETWEEN :date_from AND :date_to
                AND (:platform IS NULL OR fmd.platform = :platform)
                GROUP BY fmd.date, fmd.platform, fmd.campaign_key, fmd.creative_key
            ),
            crm_requests AS (
                SELECT
                    DATE(fcr.request_created_at) AS date,
                    fcr.platform,
                    fcr.campaign_key,
                    fcr.creative_key,
                    fcr.product_key,
                    COUNT(*) AS leads
                FROM dwh.fact_crm_requests fcr
                WHERE DATE(fcr.request_created_at) BETWEEN :date_from AND :date_to
                AND (:platform IS NULL OR fcr.platform = :platform)
                AND (:product_key IS NULL OR fcr.product_key = :product_key)
                GROUP BY DATE(fcr.request_created_at), fcr.platform, fcr.campaign_key, fcr.creative_key, fcr.product_key
            ),
            contracts_data AS (
                SELECT
                    DATE(fc.contract_created_at) AS date,
                    fc.platform,
                    fc.campaign_key,
                    fc.creative_key,
                    fc.product_key,
                    COUNT(*) AS contracts,
                    SUM(fc.amount) AS revenue
                FROM dwh.fact_contracts fc
                WHERE DATE(fc.contract_created_at) BETWEEN :date_from AND :date_to
                AND (:platform IS NULL OR fc.platform = :platform)
                AND (:product_key IS NULL OR fc.product_key = :product_key)
                GROUP BY DATE(fc.contract_created_at), fc.platform, fc.campaign_key, fc.creative_key, fc.product_key
            )
            SELECT
                COALESCE(md.date, cr.date, cd.date) AS date,
                COALESCE(md.platform, cr.platform, cd.platform) AS platform,
                COALESCE(md.campaign_key, cr.campaign_key, cd.campaign_key) AS campaign_key,
                COALESCE(md.creative_key, cr.creative_key, cd.creative_key) AS creative_key,
                COALESCE(cr.product_key, cd.product_key) AS product_key,
                COALESCE(md.impressions, 0) AS impressions,
                COALESCE(md.clicks, 0) AS clicks,
                COALESCE(md.cost, 0) AS cost,
                COALESCE(cr.leads, 0) AS leads,
                COALESCE(cd.contracts, 0) AS contracts,
                COALESCE(cd.revenue, 0) AS revenue,
                CASE WHEN md.impressions > 0 THEN (md.clicks::float / md.impressions) * 100 ELSE 0 END AS ctr,
                CASE WHEN md.clicks > 0 THEN md.cost / md.clicks ELSE 0 END AS cpc,
                CASE WHEN cr.leads > 0 THEN md.cost / cr.leads ELSE 0 END AS cpl,
                CASE WHEN cd.contracts > 0 THEN md.cost / cd.contracts ELSE 0 END AS cpa,
                CASE WHEN cr.leads > 0 THEN (cd.contracts::float / cr.leads) * 100 ELSE 0 END AS lead_to_contract_rate,
                CASE WHEN md.cost > 0 THEN cd.revenue / md.cost ELSE 0 END AS roas
            FROM marketing_data md
            FULL OUTER JOIN crm_requests cr ON md.date = cr.date AND md.platform = cr.platform
                AND md.campaign_key = cr.campaign_key AND md.creative_key = cr.creative_key
            FULL OUTER JOIN contracts_data cd ON COALESCE(md.date, cr.date) = cd.date
                AND COALESCE(md.platform, cr.platform) = cd.platform
                AND COALESCE(md.campaign_key, cr.campaign_key) = cd.campaign_key
                AND COALESCE(md.creative_key, cr.creative_key) = cd.creative_key
            ORDER BY date DESC, platform, campaign_key
        """)

        result = await db.execute(funnel_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform,
            "product_key": product_key
        })

        funnel_data = []
        for row in result.fetchall():
            funnel_data.append({
                "date": row.date.strftime("%Y-%m-%d") if row.date else None,
                "platform": row.platform,
                "campaign_key": row.campaign_key,
                "creative_key": row.creative_key,
                "product_key": row.product_key,
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "cost": float(row.cost or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpl": float(row.cpl or 0),
                "cpa": float(row.cpa or 0),
                "lead_to_contract_rate": float(row.lead_to_contract_rate or 0),
                "roas": float(row.roas or 0)
            })

        # Агрегированные метрики воронки
        totals_query = text("""
            SELECT
                SUM(fmd.impressions) AS total_impressions,
                SUM(fmd.clicks) AS total_clicks,
                SUM(fmd.cost) AS total_cost,
                COUNT(DISTINCT fcr.request_id) AS total_leads,
                COUNT(DISTINCT fc.contract_id) AS total_contracts,
                SUM(fc.amount) AS total_revenue
            FROM dwh.fact_marketing_daily fmd
            LEFT JOIN dwh.fact_crm_requests fcr ON fmd.platform = fcr.platform
                AND fmd.campaign_key = fcr.campaign_key
                AND fmd.creative_key = fcr.creative_key
                AND DATE(fcr.request_created_at) BETWEEN :date_from AND :date_to
            LEFT JOIN dwh.fact_contracts fc ON fcr.request_id = fc.request_id
                AND DATE(fc.contract_created_at) BETWEEN :date_from AND :date_to
            WHERE fmd.date BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR fmd.platform = :platform)
            AND (:product_key IS NULL OR fc.product_key = :product_key)
        """)

        result = await db.execute(totals_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform,
            "product_key": product_key
        })

        totals_row = result.fetchone()
        funnel_totals = {
            "total_impressions": int(totals_row.total_impressions or 0),
            "total_clicks": int(totals_row.total_clicks or 0),
            "total_cost": float(totals_row.total_cost or 0),
            "total_leads": int(totals_row.total_leads or 0),
            "total_contracts": int(totals_row.total_contracts or 0),
            "total_revenue": float(totals_row.total_revenue or 0)
        }

        return {
            "funnel_data": funnel_data,
            "funnel_totals": funnel_totals
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/product-performance")
async def get_product_performance(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Product Performance - анализ по продуктам используя fact_contracts"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Производительность по продуктам из реальных fact tables
        product_query = text("""
            SELECT
                dp.product_key,
                dp.label AS product_name,
                dp.product_code,
                COUNT(DISTINCT fcr.request_id) AS leads,
                COUNT(DISTINCT fc.contract_id) AS contracts,
                SUM(fc.amount) AS revenue,
                AVG(fc.amount) AS avg_contract_value,
                CASE WHEN COUNT(DISTINCT fcr.request_id) > 0
                     THEN (COUNT(DISTINCT fc.contract_id)::float / COUNT(DISTINCT fcr.request_id)) * 100
                     ELSE 0 END AS conversion_rate
            FROM dwh.dim_product dp
            LEFT JOIN dwh.fact_crm_requests fcr ON dp.product_key = fcr.product_key
                AND DATE(fcr.request_created_at) BETWEEN :date_from AND :date_to
                AND (:platform IS NULL OR fcr.platform = :platform)
            LEFT JOIN dwh.fact_contracts fc ON fcr.request_id = fc.request_id
                AND DATE(fc.contract_created_at) BETWEEN :date_from AND :date_to
            GROUP BY dp.product_key, dp.label, dp.product_code
            ORDER BY revenue DESC NULLS LAST
        """)

        result = await db.execute(product_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform
        })

        products = []
        for row in result.fetchall():
            products.append({
                "product_key": row.product_key,
                "product_name": row.product_name,
                "product_code": row.product_code,
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "avg_contract_value": float(row.avg_contract_value or 0),
                "conversion_rate": float(row.conversion_rate or 0)
            })

        # Динамика по продуктам и времени
        timeline_query = text("""
            SELECT
                DATE(fc.contract_created_at) AS date,
                dp.product_key,
                dp.label AS product_name,
                COUNT(fc.contract_id) AS contracts,
                SUM(fc.amount) AS revenue
            FROM dwh.fact_contracts fc
            JOIN dwh.dim_product dp ON fc.product_key = dp.product_key
            WHERE DATE(fc.contract_created_at) BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR fc.platform = :platform)
            GROUP BY DATE(fc.contract_created_at), dp.product_key, dp.label
            ORDER BY date, revenue DESC
        """)

        result = await db.execute(timeline_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform
        })

        timeline = []
        for row in result.fetchall():
            timeline.append({
                "date": row.date.strftime("%Y-%m-%d"),
                "product_key": row.product_key,
                "product_name": row.product_name,
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0)
            })

        return {
            "products": products,
            "timeline": timeline
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/geography-analysis")
async def get_geography_analysis(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Geography Analysis - анализ по филиалам и городам из dim_branch"""

    # Установка дат по умолчанию (используем актуальные даты из базы)
    if not date_to or not date_from:
        default_from, default_to = await get_dynamic_date_range(db, 30)
        if not date_to:
            date_to = default_to
        if not date_from:
            date_from = default_from

    try:
        # Преобразуем строки в date объекты
        date_from_obj = parse_date_string(date_from)
        date_to_obj = parse_date_string(date_to)

        # Анализ по филиалам из реальных данных
        branch_query = text("""
            SELECT
                db.branch_key,
                db.name AS branch_name,
                db.country,
                db.currency_id,
                db.is_active,
                COUNT(DISTINCT fcr.request_id) AS leads,
                COUNT(DISTINCT fc.contract_id) AS contracts,
                SUM(fc.amount) AS revenue,
                CASE WHEN COUNT(DISTINCT fcr.request_id) > 0
                     THEN (COUNT(DISTINCT fc.contract_id)::float / COUNT(DISTINCT fcr.request_id)) * 100
                     ELSE 0 END AS conversion_rate
            FROM dwh.dim_branch db
            LEFT JOIN dwh.map_req_branch mrb ON db.branch_key = mrb.branch_key
            LEFT JOIN dwh.fact_crm_requests fcr ON mrb.request_id = fcr.request_id
                AND DATE(fcr.request_created_at) BETWEEN :date_from AND :date_to
                AND (:platform IS NULL OR fcr.platform = :platform)
            LEFT JOIN dwh.fact_contracts fc ON fcr.request_id = fc.request_id
                AND DATE(fc.contract_created_at) BETWEEN :date_from AND :date_to
            WHERE db.is_active = true
            GROUP BY db.branch_key, db.name, db.country, db.currency_id, db.is_active
            ORDER BY revenue DESC NULLS LAST
        """)

        result = await db.execute(branch_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform
        })

        branches = []
        for row in result.fetchall():
            branches.append({
                "branch_key": row.branch_key,
                "branch_name": row.branch_name,
                "country": row.country,
                "currency_id": row.currency_id,
                "is_active": row.is_active,
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "conversion_rate": float(row.conversion_rate or 0)
            })

        # Анализ уверенности маппинга
        mapping_quality_query = text("""
            SELECT
                mrb.matched_by,
                mrb.confidence,
                COUNT(*) AS requests_count,
                AVG(mrb.confidence) AS avg_confidence
            FROM dwh.map_req_branch mrb
            JOIN dwh.fact_crm_requests fcr ON mrb.request_id = fcr.request_id
            WHERE DATE(fcr.request_created_at) BETWEEN :date_from AND :date_to
            AND (:platform IS NULL OR fcr.platform = :platform)
            GROUP BY mrb.matched_by, mrb.confidence
            ORDER BY requests_count DESC
        """)

        result = await db.execute(mapping_quality_query, {
            "date_from": date_from_obj,
            "date_to": date_to_obj,
            "platform": platform
        })

        mapping_quality = []
        for row in result.fetchall():
            mapping_quality.append({
                "matched_by": row.matched_by,
                "confidence": row.confidence,
                "requests_count": int(row.requests_count or 0),
                "avg_confidence": float(row.avg_confidence or 0)
            })

        return {
            "branches": branches,
            "mapping_quality": mapping_quality
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/date-range")
async def get_available_date_range(db: AsyncSession = Depends(get_itstep_session)):
    """Получение актуального диапазона дат из базы данных"""

    try:
        # Получаем последние доступные даты из разных источников
        date_range_query = text("""
            WITH latest_dates AS (
                SELECT 'dm_marketing_daily' AS source, MAX(date) AS latest_date, MIN(date) AS earliest_date
                FROM dm.dm_marketing_daily
                UNION ALL
                SELECT 'dm_perf_crm_360' AS source, MAX(date) AS latest_date, MIN(date) AS earliest_date
                FROM dm.dm_perf_crm_360_by_source
                UNION ALL
                SELECT 'fact_marketing_daily' AS source, MAX(date) AS latest_date, MIN(date) AS earliest_date
                FROM dwh.fact_marketing_daily
                UNION ALL
                SELECT 'fact_crm_requests' AS source, MAX(DATE(request_created_at)) AS latest_date, MIN(DATE(request_created_at)) AS earliest_date
                FROM dwh.fact_crm_requests
                UNION ALL
                SELECT 'fact_contracts' AS source, MAX(DATE(contract_created_at)) AS latest_date, MIN(DATE(contract_created_at)) AS earliest_date
                FROM dwh.fact_contracts
            )
            SELECT
                MAX(latest_date) AS max_date,
                MIN(earliest_date) AS min_date,
                MAX(latest_date) - INTERVAL '7 days' AS suggested_start_date,
                MAX(latest_date) AS suggested_end_date,
                MAX(latest_date) - INTERVAL '30 days' AS month_start_date
            FROM latest_dates
            WHERE latest_date IS NOT NULL
        """)

        result = await db.execute(date_range_query)
        date_range = result.fetchone()

        if date_range and date_range.max_date:
            return {
                "max_date": date_range.max_date.strftime("%Y-%m-%d"),
                "min_date": date_range.min_date.strftime("%Y-%m-%d") if date_range.min_date else None,
                "suggested_start_date": date_range.suggested_start_date.strftime("%Y-%m-%d") if date_range.suggested_start_date else None,
                "suggested_end_date": date_range.suggested_end_date.strftime("%Y-%m-%d"),
                "month_start_date": date_range.month_start_date.strftime("%Y-%m-%d") if date_range.month_start_date else None,
                "has_recent_data": True
            }
        else:
            # Fallback если нет данных
            return {
                "max_date": datetime.now().strftime("%Y-%m-%d"),
                "min_date": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"),
                "suggested_start_date": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
                "suggested_end_date": datetime.now().strftime("%Y-%m-%d"),
                "month_start_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
                "has_recent_data": False
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")