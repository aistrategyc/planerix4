# apps/api/liderix_api/routes/analytics/dashboard.py
"""
Analytics Dashboard endpoints - v6 using real ITstep data
Updated: October 14, 2025
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
from datetime import datetime, date, timedelta

from liderix_api.db import get_itstep_session

router = APIRouter(tags=["Analytics Dashboard"])


@router.get("/v5/kpi")
async def get_kpi_cards(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter: meta, google, direct, or comma-separated"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get KPI cards data: leads, contracts, revenue, spend, CPL, ROAS
    Frontend expects: { leads, n_contracts, revenue, spend, cpl, roas }
    """
    try:
        # Parse platforms filter
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        # Platform filter SQL
        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND dominant_platform IN ({placeholders})"

        kpi_query = text(f"""
            WITH leads_data AS (
                SELECT
                    COUNT(DISTINCT sk_lead) as leads,
                    COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) as n_contracts,
                    COALESCE(SUM(contract_amount), 0) as revenue
                FROM dashboards.fact_leads
                WHERE created_date_txt::date >= :date_from
                  AND created_date_txt::date <= :date_to
                  {platform_filter}
            ),
            spend_data AS (
                SELECT
                    COALESCE(SUM(spend), 0) as spend
                FROM dashboards.v6_campaign_roi_daily
                WHERE date >= :date_from
                  AND date <= :date_to
                  {platform_filter.replace('dominant_platform', 'platform') if platform_filter else ''}
            )
            SELECT
                l.leads,
                l.n_contracts,
                l.revenue,
                s.spend,
                CASE WHEN l.leads > 0 THEN s.spend / l.leads ELSE 0 END as cpl,
                CASE WHEN s.spend > 0 THEN l.revenue / s.spend ELSE 0 END as roas
            FROM leads_data l, spend_data s
        """)

        result = await db.execute(
            kpi_query,
            {
                "date_from": datetime.strptime(date_from, "%Y-%m-%d").date(),
                "date_to": datetime.strptime(date_to, "%Y-%m-%d").date()
            }
        )
        row = result.fetchone()

        if not row:
            return {
                "leads": 0,
                "n_contracts": 0,
                "revenue": 0,
                "spend": 0,
                "cpl": 0,
                "roas": 0
            }

        return {
            "leads": int(row.leads or 0),
            "n_contracts": int(row.n_contracts or 0),
            "revenue": float(row.revenue or 0),
            "spend": float(row.spend or 0),
            "cpl": float(row.cpl or 0),
            "roas": float(row.roas or 0)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"KPI query failed: {str(e)}")


@router.get("/v5/trend/leads")
async def get_leads_trend(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get daily leads trend
    Frontend expects: [{ dt: "YYYY-MM-DD", leads: number }]
    """
    try:
        # Parse platforms
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND dominant_platform IN ({placeholders})"

        trend_query = text(f"""
            SELECT
                created_date_txt::date as dt,
                COUNT(DISTINCT sk_lead) as leads
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
              {platform_filter}
            GROUP BY created_date_txt::date
            ORDER BY dt
        """)

        result = await db.execute(
            trend_query,
            {
                "date_from": datetime.strptime(date_from, "%Y-%m-%d").date(),
                "date_to": datetime.strptime(date_to, "%Y-%m-%d").date()
            }
        )
        rows = result.fetchall()

        return [
            {
                "dt": row.dt.isoformat(),
                "leads": int(row.leads or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leads trend query failed: {str(e)}")


@router.get("/v5/trend/spend")
async def get_spend_trend(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get daily spend trend
    Frontend expects: [{ dt: "YYYY-MM-DD", spend: number }]
    """
    try:
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND platform IN ({placeholders})"

        trend_query = text(f"""
            SELECT
                date as dt,
                SUM(spend) as spend
            FROM dashboards.v6_campaign_roi_daily
            WHERE date >= :date_from
              AND date <= :date_to
              {platform_filter}
            GROUP BY date
            ORDER BY date
        """)

        result = await db.execute(
            trend_query,
            {
                "date_from": datetime.strptime(date_from, "%Y-%m-%d").date(),
                "date_to": datetime.strptime(date_to, "%Y-%m-%d").date()
            }
        )
        rows = result.fetchall()

        return [
            {
                "dt": row.dt.isoformat(),
                "spend": float(row.spend or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Spend trend query failed: {str(e)}")


# Legacy endpoints (keep for backward compatibility but with updated data)

@router.get("/dashboard")
async def get_analytics_dashboard(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get analytics dashboard summary data (legacy endpoint)
    """
    try:
        # Default dates
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")

        # Use v5/kpi endpoint
        kpi_data = await get_kpi_cards(date_from=date_from, date_to=date_to, platforms=None, db=db)

        return {
            "total_revenue": kpi_data["revenue"],
            "total_leads": kpi_data["leads"],
            "total_conversions": kpi_data["n_contracts"],
            "conversion_rate": (kpi_data["n_contracts"] / kpi_data["leads"] * 100) if kpi_data["leads"] > 0 else 0,
            "period": {
                "from": date_from,
                "to": date_to
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime")
async def get_realtime_analytics(
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get real-time analytics data (today's data)
    """
    try:
        today = datetime.now().strftime("%Y-%m-%d")

        realtime_query = text("""
            SELECT
                COUNT(DISTINCT sk_lead) as leads_today,
                COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) as contracts_today,
                COALESCE(SUM(contract_amount), 0) as revenue_today
            FROM dashboards.fact_leads
            WHERE created_date_txt::date = :today
        """)

        result = await db.execute(realtime_query, {"today": datetime.strptime(today, "%Y-%m-%d").date()})
        row = result.fetchone()

        return {
            "leads_today": int(row.leads_today or 0),
            "contracts_today": int(row.contracts_today or 0),
            "revenue_today": float(row.revenue_today or 0),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
