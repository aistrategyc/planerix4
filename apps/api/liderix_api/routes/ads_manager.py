"""
Ads Manager API routes - Real data from ITstep analytics database.

This module provides endpoints for managing and viewing advertising data
from the itstep_final database on 92.242.60.211.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from datetime import date, timedelta

from ..db import get_itstep_session
from ..schemas.ads import AdRead, AdMetrics, AdStatsResponse
from ..services.dependencies import get_current_user

router = APIRouter(prefix="/ads-manager", tags=["ads-manager"])


@router.get("", response_model=List[AdRead])
async def get_ads(
    date_from: date = Query(default=None, description="Start date for filtering ads"),
    date_to: date = Query(default=None, description="End date for filtering ads"),
    platform: str = Query(default="all", description="Platform filter: 'all', 'google', or 'meta'"),
    limit: int = Query(default=50, ge=1, le=500, description="Maximum number of ads to return"),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """
    Get list of advertising campaigns from ITstep analytics database.

    Returns real ad data from raw.fb_ad_insights with campaign information.
    Data includes impressions, clicks, spend, CTR, and CPC metrics.
    """
    # Default to last 30 days if no dates provided
    if date_from is None:
        date_from = date.today() - timedelta(days=30)
    if date_to is None:
        date_to = date.today()

    # Build platform filter
    platform_filter = ""
    if platform != "all":
        platform_filter = f"AND c.platform = :platform"

    query_text = f"""
        SELECT
          fb.ad_id,
          fb.ad_name,
          fb.campaign_id,
          c.campaign_name,
          COALESCE(c.platform, 'meta') as platform,
          MIN(fb.date_start) as date_start,
          MAX(fb.date_stop) as date_stop,
          SUM(fb.impressions) as total_impressions,
          SUM(fb.clicks) as total_clicks,
          SUM(fb.spend) as total_spend,
          ROUND(SUM(fb.clicks)::numeric / NULLIF(SUM(fb.impressions), 0) * 100, 2) as ctr,
          ROUND(SUM(fb.spend) / NULLIF(SUM(fb.clicks), 0), 2) as cpc
        FROM raw.fb_ad_insights fb
        LEFT JOIN dashboards.campaign_reference c ON fb.campaign_id = c.campaign_id
        WHERE fb.date_start >= :date_from
          AND fb.date_start <= :date_to
          {platform_filter}
        GROUP BY fb.ad_id, fb.ad_name, fb.campaign_id, c.campaign_name, c.platform
        HAVING SUM(fb.impressions) > 0
        ORDER BY total_spend DESC
        LIMIT :limit
    """

    params = {
        "date_from": date_from,
        "date_to": date_to,
        "limit": limit
    }

    if platform != "all":
        params["platform"] = platform

    try:
        result = await session.execute(text(query_text), params)
        rows = result.fetchall()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database query failed: {str(e)}"
        )

    # Convert rows to AdRead objects
    ads = []
    for row in rows:
        ads.append(AdRead(
            ad_id=str(row.ad_id),
            ad_name=row.ad_name or "Unnamed Ad",
            campaign_id=str(row.campaign_id) if row.campaign_id else "unknown",
            campaign_name=row.campaign_name,
            platform=row.platform if row.platform in ['google', 'meta'] else 'meta',
            type='social',  # Facebook ads are social type
            status='active',  # Assume active if in recent data
            metrics=AdMetrics(
                impressions=int(row.total_impressions or 0),
                clicks=int(row.total_clicks or 0),
                spend=float(row.total_spend or 0),
                ctr=float(row.ctr or 0),
                cpc=float(row.cpc or 0),
                conversions=0,  # Not available in fb_ad_insights
                cpa=0.0,
                roas=0.0
            ),
            date_start=row.date_start,
            date_stop=row.date_stop
        ))

    return ads


@router.get("/stats", response_model=AdStatsResponse)
async def get_ads_stats(
    date_from: date = Query(default=None, description="Start date for statistics"),
    date_to: date = Query(default=None, description="End date for statistics"),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """
    Get aggregated statistics for all advertisements.

    Returns totals and averages across all ads in the specified date range.
    """
    # Default to last 30 days if no dates provided
    if date_from is None:
        date_from = date.today() - timedelta(days=30)
    if date_to is None:
        date_to = date.today()

    query_text = """
        SELECT
          COUNT(DISTINCT ad_id) as total_ads,
          COUNT(DISTINCT campaign_id) as total_campaigns,
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(spend) as total_spend,
          ROUND(SUM(clicks)::numeric / NULLIF(SUM(impressions), 0) * 100, 2) as avg_ctr,
          ROUND(SUM(spend) / NULLIF(SUM(clicks), 0), 2) as avg_cpc
        FROM raw.fb_ad_insights
        WHERE date_start >= :date_from
          AND date_start <= :date_to
    """

    try:
        result = await session.execute(
            text(query_text),
            {"date_from": date_from, "date_to": date_to}
        )
        row = result.fetchone()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database query failed: {str(e)}"
        )

    if not row:
        return AdStatsResponse(
            total_ads=0,
            total_campaigns=0,
            total_impressions=0,
            total_clicks=0,
            total_spend=0.0,
            avg_ctr=0.0,
            avg_cpc=0.0
        )

    return AdStatsResponse(
        total_ads=int(row.total_ads or 0),
        total_campaigns=int(row.total_campaigns or 0),
        total_impressions=int(row.total_impressions or 0),
        total_clicks=int(row.total_clicks or 0),
        total_spend=float(row.total_spend or 0),
        avg_ctr=float(row.avg_ctr or 0),
        avg_cpc=float(row.avg_cpc or 0)
    )
