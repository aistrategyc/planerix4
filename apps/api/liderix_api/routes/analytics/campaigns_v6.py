# apps/api/liderix_api/routes/analytics/campaigns_v6.py
"""
Advanced Campaign Analytics endpoints - v5/v7 using ITstep v6 data
Updated: October 14, 2025
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Optional, List

from liderix_api.db import get_itstep_session

router = APIRouter(tags=["Campaigns Analytics v6"])


def parse_date(date_str: str) -> date:
    """Convert string date 'YYYY-MM-DD' to date object for asyncpg"""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


@router.get("/v5/campaigns/wow")
async def get_wow_campaigns(
    date_from: str = Query(..., description="Current period start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="Current period end date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get Week-over-Week campaign comparison
    Frontend expects: [{ platform, campaign_name, leads_cur, leads_prev, leads_diff_pct, cpl_cur, cpl_prev }]
    """
    try:
        # Calculate previous period (same duration before current period)
        date_from_obj = datetime.strptime(date_from, "%Y-%m-%d").date()
        date_to_obj = datetime.strptime(date_to, "%Y-%m-%d").date()
        period_days = (date_to_obj - date_from_obj).days + 1

        prev_date_to = date_from_obj - timedelta(days=1)
        prev_date_from = prev_date_to - timedelta(days=period_days - 1)

        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND platform IN ({placeholders})"

        wow_query = text(f"""
            WITH current_period AS (
                SELECT
                    platform,
                    campaign_name,
                    SUM(leads) as leads_cur,
                    SUM(spend) / NULLIF(SUM(leads), 0) as cpl_cur
                FROM dashboards.v6_campaign_roi_daily
                WHERE date >= :date_from
                  AND date <= :date_to
                  {platform_filter}
                GROUP BY platform, campaign_name
            ),
            prev_period AS (
                SELECT
                    platform,
                    campaign_name,
                    SUM(leads) as leads_prev,
                    SUM(spend) / NULLIF(SUM(leads), 0) as cpl_prev
                FROM dashboards.v6_campaign_roi_daily
                WHERE date >= :prev_date_from
                  AND date <= :prev_date_to
                  {platform_filter}
                GROUP BY platform, campaign_name
            )
            SELECT
                COALESCE(c.platform, p.platform) as platform,
                COALESCE(c.campaign_name, p.campaign_name) as campaign_name,
                COALESCE(c.leads_cur, 0) as leads_cur,
                COALESCE(p.leads_prev, 0) as leads_prev,
                CASE
                    WHEN p.leads_prev > 0 THEN 100.0 * (c.leads_cur - p.leads_prev) / p.leads_prev
                    WHEN c.leads_cur > 0 THEN 100.0
                    ELSE 0
                END as leads_diff_pct,
                c.cpl_cur,
                p.cpl_prev
            FROM current_period c
            FULL OUTER JOIN prev_period p USING (platform, campaign_name)
            WHERE c.leads_cur > 0 OR p.leads_prev > 0
            ORDER BY ABS(COALESCE(c.leads_cur, 0) - COALESCE(p.leads_prev, 0)) DESC
            LIMIT :limit
        """)

        result = await db.execute(
            wow_query,
            {
                "date_from": parse_date(date_from),
                "date_to": parse_date(date_to),
                "prev_date_from": prev_date_from,
                "prev_date_to": prev_date_to,
                "limit": limit
            }
        )
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "campaign_name": row.campaign_name,
                "leads_cur": int(row.leads_cur or 0),
                "leads_prev": int(row.leads_prev or 0),
                "leads_diff_pct": float(row.leads_diff_pct or 0),
                "cpl_cur": float(row.cpl_cur or 0) if row.cpl_cur else None,
                "cpl_prev": float(row.cpl_prev or 0) if row.cpl_prev else None
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"WoW campaigns query failed: {str(e)}")


@router.get("/v5/campaigns/scatter-matrix")
async def get_scatter_matrix(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get CPL vs ROAS scatter matrix data
    Frontend expects: [{ platform, campaign_name, leads, spend, cpl, roas }]
    """
    try:
        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND platform IN ({placeholders})"

        scatter_query = text(f"""
            SELECT
                platform,
                campaign_name,
                SUM(leads) as leads,
                SUM(spend) as spend,
                SUM(spend) / NULLIF(SUM(leads), 0) as cpl,
                SUM(revenue) / NULLIF(SUM(spend), 0) as roas
            FROM dashboards.v6_campaign_roi_daily
            WHERE date >= :date_from
              AND date <= :date_to
              AND leads > 0
              AND spend > 0
              {platform_filter}
            GROUP BY platform, campaign_name
            HAVING SUM(leads) >= 3
            ORDER BY spend DESC
            LIMIT :limit
        """)

        result = await db.execute(
            scatter_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to), "limit": limit}
        )
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "campaign_name": row.campaign_name,
                "leads": int(row.leads or 0),
                "spend": float(row.spend or 0),
                "cpl": float(row.cpl or 0) if row.cpl else None,
                "roas": float(row.roas or 0) if row.roas else None
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scatter matrix query failed: {str(e)}")


@router.get("/v5/campaigns/anomalies")
async def get_anomalies(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(None, description="Platform filter"),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get campaign anomalies (CPL spikes, lead drops, spend spikes)
    Frontend expects: [{ anomaly_type, severity, platform, campaign_name, leads, spend, current_cpl, baseline_cpl }]
    """
    try:
        # Calculate baseline period (30 days before start date)
        date_from_obj = datetime.strptime(date_from, "%Y-%m-%d").date()
        baseline_start = (date_from_obj - timedelta(days=30)).isoformat()
        baseline_end = (date_from_obj - timedelta(days=1)).isoformat()

        platform_list = None
        if platforms:
            platform_list = [p.strip() for p in platforms.split(',')]

        platform_filter = ""
        if platform_list:
            placeholders = ', '.join([f"'{p}'" for p in platform_list])
            platform_filter = f"AND platform IN ({placeholders})"

        anomalies_query = text(f"""
            WITH baseline AS (
                SELECT
                    platform,
                    campaign_name,
                    AVG(spend / NULLIF(leads, 0)) as baseline_cpl,
                    STDDEV(spend / NULLIF(leads, 0)) as cpl_stddev,
                    AVG(leads) as avg_leads,
                    AVG(spend) as avg_spend
                FROM dashboards.v6_campaign_roi_daily
                WHERE date >= :baseline_start
                  AND date <= :baseline_end
                  AND leads > 0
                  {platform_filter}
                GROUP BY platform, campaign_name
                HAVING COUNT(*) >= 7
            ),
            current AS (
                SELECT
                    platform,
                    campaign_name,
                    SUM(leads) as leads,
                    SUM(spend) as spend,
                    SUM(spend) / NULLIF(SUM(leads), 0) as current_cpl
                FROM dashboards.v6_campaign_roi_daily
                WHERE date >= :date_from
                  AND date <= :date_to
                  {platform_filter}
                GROUP BY platform, campaign_name
            ),
            avg_current_spend AS (
                SELECT AVG(spend) as avg_spend FROM current
            )
            SELECT
                c.platform,
                c.campaign_name,
                c.leads,
                c.spend,
                c.current_cpl,
                b.baseline_cpl,
                b.cpl_stddev,
                b.avg_leads,
                CASE
                    WHEN c.current_cpl > b.baseline_cpl + 2 * COALESCE(b.cpl_stddev, 0) THEN 'spike_cpl'
                    WHEN c.leads < b.avg_leads * 0.5 THEN 'drop_leads'
                    WHEN c.spend > (SELECT avg_spend FROM avg_current_spend) * 2 THEN 'spike_spend'
                    ELSE 'normal'
                END as anomaly_type,
                CASE
                    WHEN c.current_cpl > b.baseline_cpl + 3 * COALESCE(b.cpl_stddev, 0) THEN 'high'
                    WHEN c.current_cpl > b.baseline_cpl + 2 * COALESCE(b.cpl_stddev, 0) THEN 'medium'
                    WHEN c.leads < b.avg_leads * 0.3 THEN 'high'
                    ELSE 'low'
                END as severity
            FROM current c
            JOIN baseline b USING (platform, campaign_name)
            WHERE c.current_cpl > b.baseline_cpl + 2 * COALESCE(b.cpl_stddev, 0)
               OR c.leads < b.avg_leads * 0.5
               OR c.spend > (SELECT avg_spend FROM avg_current_spend) * 2
            ORDER BY
                CASE severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                c.spend DESC
            LIMIT :limit
        """)

        result = await db.execute(
            anomalies_query,
            {
                "baseline_start": parse_date(baseline_start),
                "baseline_end": parse_date(baseline_end),
                "date_from": parse_date(date_from),
                "date_to": parse_date(date_to),
                "limit": limit
            }
        )
        rows = result.fetchall()

        return [
            {
                "anomaly_type": row.anomaly_type,
                "severity": row.severity,
                "platform": row.platform,
                "campaign_name": row.campaign_name,
                "leads": int(row.leads or 0),
                "spend": float(row.spend or 0),
                "current_cpl": float(row.current_cpl or 0) if row.current_cpl else None,
                "baseline_cpl": float(row.baseline_cpl or 0) if row.baseline_cpl else None
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomalies query failed: {str(e)}")


@router.get("/v7/insights/campaign-performance")
async def get_campaign_insights(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get campaign performance insights (high_performer, medium_performer, volume_driver, needs_attention)
    Frontend expects: [{ performance_category, platform, campaign_name, leads, contracts, revenue, conversion_rate, avg_contract_value }]
    """
    try:
        insights_query = text("""
            WITH campaign_contracts AS (
                SELECT
                    r.platform,
                    r.campaign_name,
                    SUM(r.leads) as leads,
                    SUM(r.contracts) as contracts,
                    SUM(r.revenue) as revenue,
                    SUM(r.spend) as spend,
                    100.0 * SUM(r.contracts) / NULLIF(SUM(r.leads), 0) as conversion_rate,
                    SUM(r.revenue) / NULLIF(SUM(r.contracts), 0) as avg_contract_value,
                    SUM(r.revenue) / NULLIF(SUM(r.spend), 0) as roas
                FROM dashboards.v6_campaign_roi_daily r
                WHERE r.date >= :date_from
                  AND r.date <= :date_to
                GROUP BY r.platform, r.campaign_name
                HAVING SUM(r.contracts) > 0
            )
            SELECT
                platform,
                campaign_name,
                leads,
                contracts,
                revenue,
                conversion_rate,
                avg_contract_value,
                roas,
                CASE
                    WHEN conversion_rate >= 5 AND roas >= 2 THEN 'high_performer'
                    WHEN conversion_rate >= 3 AND roas >= 1 THEN 'medium_performer'
                    WHEN leads >= 50 THEN 'volume_driver'
                    ELSE 'needs_attention'
                END as performance_category
            FROM campaign_contracts
            ORDER BY revenue DESC
            LIMIT :limit
        """)

        result = await db.execute(
            insights_query,
            {"date_from": parse_date(date_from), "date_to": parse_date(date_to), "limit": limit}
        )
        rows = result.fetchall()

        return [
            {
                "performance_category": row.performance_category,
                "platform": row.platform,
                "campaign_name": row.campaign_name,
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "conversion_rate": float(row.conversion_rate or 0),
                "avg_contract_value": float(row.avg_contract_value or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Campaign insights query failed: {str(e)}")


@router.get("/v7/metrics/trend")
async def get_metrics_trend(
    date_from: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: str = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get daily metrics trend (CPL, CPC, CTR, CPM)
    Frontend expects: [{ dt, leads, clicks, impressions, spend, cpl, cpc, ctr, cpm }]
    """
    try:
        trend_query = text("""
            SELECT
                r.date as dt,
                SUM(r.leads) as leads,
                SUM(r.clicks) as clicks,
                SUM(r.impressions) as impressions,
                SUM(r.spend) as spend,
                SUM(r.spend) / NULLIF(SUM(r.leads), 0) as cpl,
                SUM(r.spend) / NULLIF(SUM(r.clicks), 0) as cpc,
                100.0 * SUM(r.clicks) / NULLIF(SUM(r.impressions), 0) as ctr,
                1000.0 * SUM(r.spend) / NULLIF(SUM(r.impressions), 0) as cpm
            FROM dashboards.v6_campaign_roi_daily r
            WHERE r.date >= :date_from
              AND r.date <= :date_to
            GROUP BY r.date
            ORDER BY r.date
        """)

        result = await db.execute(trend_query, {"date_from": parse_date(date_from), "date_to": parse_date(date_to)})
        rows = result.fetchall()

        return [
            {
                "dt": row.dt.isoformat(),
                "leads": int(row.leads or 0),
                "clicks": int(row.clicks or 0),
                "impressions": int(row.impressions or 0),
                "spend": float(row.spend or 0),
                "cpl": float(row.cpl or 0) if row.cpl else None,
                "cpc": float(row.cpc or 0) if row.cpc else None,
                "ctr": float(row.ctr or 0) if row.ctr else None,
                "cpm": float(row.cpm or 0) if row.cpm else None
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics trend query failed: {str(e)}")
