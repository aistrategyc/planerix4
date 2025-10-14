# apps/api/liderix_api/routes/analytics/sales.py
"""
Sales Analytics endpoints - v5/v6 using real ITstep v6 data
Updated: October 14, 2025
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Optional, List

from liderix_api.db import get_itstep_session

router = APIRouter(tags=["Sales Analytics"])


def parse_date(date_str: str) -> date:
    """Convert string date 'YYYY-MM-DD' to date object for asyncpg"""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


@router.get("/v5/campaigns")
async def get_campaigns(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    limit: int = Query(50, le=200, description="Limit results"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get campaign performance table
    Frontend expects: [{ platform, campaign_name, leads, n_contracts, revenue, spend, cpl, roas }]
    """
    try:
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND platform IN ({placeholders})"

        campaigns_query = text(f"""
            SELECT
                platform,
                campaign_name,
                SUM(leads) as leads,
                SUM(contracts) as n_contracts,
                SUM(revenue) as revenue,
                SUM(spend) as spend,
                CASE WHEN SUM(leads) > 0 THEN SUM(spend) / SUM(leads) ELSE 0 END as cpl,
                CASE WHEN SUM(spend) > 0 THEN SUM(revenue) / SUM(spend) ELSE 0 END as roas
            FROM dashboards.v6_campaign_roi_daily
            WHERE date >= :date_from
              AND date <= :date_to
              {platform_filter}
            GROUP BY platform, campaign_name
            ORDER BY spend DESC
            LIMIT :limit
        """)

        result = await db.execute(
            campaigns_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to), "limit": limit}
        )
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "campaign_name": row.campaign_name or "Unknown",
                "leads": int(row.leads or 0),
                "n_contracts": int(row.n_contracts or 0),
                "revenue": float(row.revenue or 0),
                "spend": float(row.spend or 0),
                "cpl": float(row.cpl or 0),
                "roas": float(row.roas or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaigns query failed: {str(e)}")


@router.get("/v5/share/platforms")
async def get_platform_share(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get platform share (Meta/Google/Direct) for pie chart
    Frontend expects: [{ platform, leads, share_pct }]
    """
    try:
        share_query = text("""
            SELECT
                dominant_platform as platform,
                COUNT(DISTINCT sk_lead) as leads,
                100.0 * COUNT(DISTINCT sk_lead) / SUM(COUNT(DISTINCT sk_lead)) OVER () as share_pct
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
            GROUP BY dominant_platform
            ORDER BY leads DESC
        """)

        result = await db.execute(share_query, {"date_from": parse_date(date_from), "date_to": parse_date(date_to)})
        rows = result.fetchall()

        return [
            {
                "platform": row.platform or "unknown",
                "leads": int(row.leads or 0),
                "share_pct": float(row.share_pct or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Platform share query failed: {str(e)}")


@router.get("/v5/utm-sources")
async def get_utm_sources(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get UTM sources breakdown
    Frontend expects: [{ platform, utm_source, leads, n_contracts, revenue }]
    """
    try:
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND dominant_platform IN ({placeholders})"

        utm_query = text(f"""
            SELECT
                dominant_platform as platform,
                utm_source,
                COUNT(DISTINCT sk_lead) as leads,
                COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) as n_contracts,
                COALESCE(SUM(contract_amount), 0) as revenue
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
              AND utm_source IS NOT NULL
              {platform_filter}
            GROUP BY dominant_platform, utm_source
            ORDER BY leads DESC
            LIMIT :limit
        """)

        result = await db.execute(
            utm_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to), "limit": limit}
        )
        rows = result.fetchall()

        return [
            {
                "platform": row.platform or "unknown",
                "utm_source": row.utm_source,
                "leads": int(row.leads or 0),
                "n_contracts": int(row.n_contracts or 0),
                "revenue": float(row.revenue or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UTM sources query failed: {str(e)}")


@router.get("/v6/reco/budget")
async def get_budget_recommendations(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    limit: int = Query(10, le=50, description="Number of recommendations"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get budget recommendations (scale/pause/monitor)
    Frontend expects: [{ action, platform, campaign_name, leads_cur, spend_cur, cpl_cur, roas_cur }]
    """
    try:
        reco_query = text("""
            WITH campaign_performance AS (
                SELECT
                    platform,
                    campaign_name,
                    SUM(leads) as leads_cur,
                    SUM(spend) as spend_cur,
                    SUM(revenue) as revenue_cur,
                    SUM(contracts) as contracts_cur,
                    SUM(spend) / NULLIF(SUM(leads), 0) as cpl_cur,
                    SUM(revenue) / NULLIF(SUM(spend), 0) as roas_cur
                FROM dashboards.v6_campaign_roi_daily
                WHERE date >= :date_from
                  AND date <= :date_to
                GROUP BY platform, campaign_name
            ),
            avg_metrics AS (
                SELECT
                    AVG(cpl_cur) as avg_cpl,
                    AVG(roas_cur) as avg_roas
                FROM campaign_performance
                WHERE leads_cur >= 5
            )
            SELECT
                c.platform,
                c.campaign_name,
                c.leads_cur,
                c.spend_cur,
                c.cpl_cur,
                c.roas_cur,
                c.contracts_cur,
                CASE
                    WHEN c.roas_cur > a.avg_roas * 1.5 AND c.cpl_cur < a.avg_cpl THEN 'scale'
                    WHEN c.roas_cur < a.avg_roas * 0.5 OR c.contracts_cur = 0 THEN 'pause'
                    ELSE 'monitor'
                END as action
            FROM campaign_performance c, avg_metrics a
            WHERE c.spend_cur > 100
            ORDER BY
                CASE
                    WHEN c.roas_cur > a.avg_roas * 1.5 THEN 1
                    WHEN c.roas_cur < a.avg_roas * 0.5 THEN 2
                    ELSE 3
                END,
                c.spend_cur DESC
            LIMIT :limit
        """)

        result = await db.execute(
            reco_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to), "limit": limit}
        )
        rows = result.fetchall()

        return [
            {
                "action": row.action,
                "platform": row.platform,
                "campaign_name": row.campaign_name,
                "leads_cur": int(row.leads_cur or 0),
                "spend_cur": float(row.spend_cur or 0),
                "cpl_cur": float(row.cpl_cur or 0),
                "roas_cur": float(row.roas_cur or 0),
                "contracts_cur": int(row.contracts_cur or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Budget recommendations query failed: {str(e)}")


@router.get("/v6/leads/paid-split/platforms")
async def get_paid_split_platforms(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get paid vs organic split by platform
    Frontend expects: [{ platform, paid_leads, organic_leads, total_leads, paid_pct, organic_pct }]
    """
    try:
        split_query = text("""
            SELECT
                dominant_platform as platform,
                COUNT(DISTINCT CASE WHEN is_paid = true THEN sk_lead END) as paid_leads,
                COUNT(DISTINCT CASE WHEN is_paid = false OR is_paid IS NULL THEN sk_lead END) as organic_leads,
                COUNT(DISTINCT sk_lead) as total_leads,
                100.0 * COUNT(DISTINCT CASE WHEN is_paid = true THEN sk_lead END) / NULLIF(COUNT(DISTINCT sk_lead), 0) as paid_pct,
                100.0 * COUNT(DISTINCT CASE WHEN is_paid = false OR is_paid IS NULL THEN sk_lead END) / NULLIF(COUNT(DISTINCT sk_lead), 0) as organic_pct
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
            GROUP BY dominant_platform
            ORDER BY total_leads DESC
        """)

        result = await db.execute(split_query, {"date_from": parse_date(date_from), "date_to": parse_date(date_to)})
        rows = result.fetchall()

        return [
            {
                "platform": row.platform or "unknown",
                "paid_leads": int(row.paid_leads or 0),
                "organic_leads": int(row.organic_leads or 0),
                "total_leads": int(row.total_leads or 0),
                "paid_pct": float(row.paid_pct or 0),
                "organic_pct": float(row.organic_pct or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Paid split query failed: {str(e)}")


# Legacy endpoints (backward compatibility)

@router.get("/test")
async def get_sales_analytics_test():
    """Test endpoint without database dependency"""
    return {
        "status": "success",
        "message": "Analytics endpoint is working!",
        "version": "v6"
    }


@router.get("/revenue-trend")
async def get_revenue_trend(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get daily revenue trend (legacy endpoint)"""
    try:
        revenue_query = text("""
            SELECT
                date,
                SUM(revenue) as daily_revenue,
                SUM(contracts) as daily_contracts
            FROM dashboards.v6_campaign_roi_daily
            WHERE date >= :start_date AND date <= :end_date
            GROUP BY date
            ORDER BY date
        """)

        result = await session.execute(
            revenue_query,
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return {
            "status": "success",
            "data": [
                {
                    "date": row.date.isoformat(),
                    "revenue": float(row.daily_revenue or 0),
                    "contracts": int(row.daily_contracts or 0)
                }
                for row in rows
            ]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/by-products")
async def get_sales_by_products(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get sales performance by products (legacy endpoint using v6 views)"""
    try:
        products_query = text("""
            SELECT
                product_name,
                total_contracts as contracts,
                total_revenue as revenue,
                avg_contract_value as avg_value
            FROM dashboards.v6_product_performance
            ORDER BY total_revenue DESC
            LIMIT 20
        """)

        result = await session.execute(products_query)
        rows = result.fetchall()

        return {
            "status": "success",
            "data": [
                {
                    "product_name": row.product_name,
                    "contracts": int(row.contracts or 0),
                    "revenue": float(row.revenue or 0),
                    "avg_value": float(row.avg_value or 0)
                }
                for row in rows
            ]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/v6/funnel")
async def get_funnel_analysis(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(None, description="Platform filter (Meta/Google/Direct)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get marketing funnel analysis: Impressions → Clicks → Leads → Contracts
    Frontend expects: [{ date, platform, impressions, clicks, leads, contracts, ctr, cvr, contract_rate }]
    """
    try:
        platform_filter = ""
        if platform:
            platform_filter = "AND platform = :platform"

        funnel_query = text(f"""
            SELECT
                date,
                platform,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(leads) as leads,
                SUM(contracts) as contracts,
                CASE WHEN SUM(impressions) > 0
                    THEN 100.0 * SUM(clicks) / SUM(impressions)
                    ELSE 0
                END as ctr,
                CASE WHEN SUM(clicks) > 0
                    THEN 100.0 * SUM(leads) / SUM(clicks)
                    ELSE 0
                END as cvr,
                CASE WHEN SUM(leads) > 0
                    THEN 100.0 * SUM(contracts) / SUM(leads)
                    ELSE 0
                END as contract_rate
            FROM dashboards.v6_funnel_daily
            WHERE date >= :date_from
              AND date <= :date_to
              {platform_filter}
            GROUP BY date, platform
            ORDER BY date DESC, platform
        """)

        params = {"date_from": parse_date(date_from), "date_to": parse_date(date_to)}
        if platform:
            params["platform"] = platform

        result = await db.execute(funnel_query, params)
        rows = result.fetchall()

        return [
            {
                "date": row.date.isoformat(),
                "platform": row.platform or "unknown",
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "ctr": float(row.ctr or 0),
                "cvr": float(row.cvr or 0),
                "contract_rate": float(row.contract_rate or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Funnel analysis query failed: {str(e)}")


@router.get("/v6/funnel/aggregate")
async def get_funnel_aggregate(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get aggregated funnel metrics by platform
    Frontend expects: [{ platform, impressions, clicks, leads, contracts, ctr, cvr, contract_rate }]
    """
    try:
        aggregate_query = text("""
            SELECT
                platform,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(leads) as leads,
                SUM(contracts) as contracts,
                CASE WHEN SUM(impressions) > 0
                    THEN 100.0 * SUM(clicks) / SUM(impressions)
                    ELSE 0
                END as ctr,
                CASE WHEN SUM(clicks) > 0
                    THEN 100.0 * SUM(leads) / SUM(clicks)
                    ELSE 0
                END as cvr,
                CASE WHEN SUM(leads) > 0
                    THEN 100.0 * SUM(contracts) / SUM(leads)
                    ELSE 0
                END as contract_rate
            FROM dashboards.v6_funnel_daily
            WHERE date >= :date_from
              AND date <= :date_to
            GROUP BY platform
            ORDER BY impressions DESC
        """)

        result = await db.execute(
            aggregate_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to)}
        )
        rows = result.fetchall()

        return [
            {
                "platform": row.platform or "unknown",
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "ctr": float(row.ctr or 0),
                "cvr": float(row.cvr or 0),
                "contract_rate": float(row.contract_rate or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Funnel aggregate query failed: {str(e)}")


@router.get("/v6/traffic/organic-vs-paid")
async def get_organic_vs_paid_traffic(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get organic vs paid traffic breakdown with contracts
    Frontend expects: [{ traffic_type, platform, leads, contracts, revenue, cvr }]
    """
    try:
        traffic_query = text("""
            SELECT
                CASE
                    WHEN is_paid = true THEN 'Paid'
                    WHEN is_paid = false THEN 'Organic'
                    ELSE 'Unknown'
                END as traffic_type,
                dominant_platform as platform,
                COUNT(DISTINCT sk_lead) as leads,
                COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) as contracts,
                COALESCE(SUM(contract_amount), 0) as revenue,
                CASE WHEN COUNT(DISTINCT sk_lead) > 0
                    THEN 100.0 * COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) / COUNT(DISTINCT sk_lead)
                    ELSE 0
                END as cvr
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
            GROUP BY traffic_type, dominant_platform
            ORDER BY contracts DESC, leads DESC
        """)

        result = await db.execute(
            traffic_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to)}
        )
        rows = result.fetchall()

        return [
            {
                "traffic_type": row.traffic_type,
                "platform": row.platform or "unknown",
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "cvr": float(row.cvr or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Organic vs paid traffic query failed: {str(e)}")


@router.get("/v6/products/performance")
async def get_products_performance(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    limit: int = Query(20, le=100, description="Limit results"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get product performance statistics
    Frontend expects: [{ product_name, contracts, revenue, avg_value }]
    """
    try:
        products_query = text("""
            SELECT
                product_name,
                total_contracts,
                total_revenue,
                avg_contract_value
            FROM dashboards.v6_product_performance
            WHERE total_contracts > 0
            ORDER BY total_contracts DESC, total_revenue DESC
            LIMIT :limit
        """)

        result = await db.execute(
            products_query,
            {"limit": limit}
        )
        rows = result.fetchall()

        return [
            {
                "product_name": row.product_name,
                "contracts": int(row.total_contracts or 0),
                "revenue": float(row.total_revenue or 0),
                "avg_value": float(row.avg_contract_value or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Products performance query failed: {str(e)}")
