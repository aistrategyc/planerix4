"""
Marketing Campaigns API routes - Real data from ITstep analytics database.

This module provides endpoints for viewing marketing campaign performance
from the itstep_final database on 92.242.60.211.
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List
from datetime import date, timedelta

from ..db import get_itstep_session
from ..schemas.ads import CampaignRead, CampaignMetrics, CampaignStatsResponse
from ..services.dependencies import get_current_user

router = APIRouter(prefix="/marketing-campaigns", tags=["marketing-campaigns"])


@router.get("", response_model=List[CampaignRead])
async def get_campaigns(
    date_from: date = Query(default=None, description="Start date for filtering campaigns"),
    date_to: date = Query(default=None, description="End date for filtering campaigns"),
    platform: str = Query(default="all", description="Platform filter: 'all', 'google', or 'meta'"),
    limit: int = Query(default=50, ge=1, le=500, description="Maximum number of campaigns to return"),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """
    Get list of marketing campaigns from ITstep analytics database.

    Returns real campaign data with daily aggregated metrics including
    impressions, clicks, spend, leads, CPL, and CTR.
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
          c.campaign_id,
          c.campaign_name,
          c.platform,
          COUNT(DISTINCT lc.dt) as days_active,
          SUM(lc.impressions) as total_impressions,
          SUM(lc.clicks) as total_clicks,
          SUM(lc.spend) as total_spend,
          SUM(lc.leads) as total_leads,
          ROUND(SUM(lc.spend) / NULLIF(SUM(lc.leads), 0), 2) as cpl,
          ROUND(SUM(lc.clicks)::numeric / NULLIF(SUM(lc.impressions), 0) * 100, 2) as ctr
        FROM dashboards.campaign_reference c
        LEFT JOIN dashboards.v5_leads_campaign_daily lc ON c.campaign_id = lc.campaign_id
        WHERE lc.dt >= :date_from
          AND lc.dt <= :date_to
          {platform_filter}
        GROUP BY c.campaign_id, c.campaign_name, c.platform
        HAVING SUM(lc.impressions) > 0
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

    # Convert rows to CampaignRead objects
    campaigns = []
    for row in rows:
        campaigns.append(CampaignRead(
            campaign_id=str(row.campaign_id),
            campaign_name=row.campaign_name or "Unnamed Campaign",
            platform=row.platform if row.platform in ['google', 'meta'] else 'meta',
            type='ppc',  # Most campaigns are PPC (pay-per-click)
            status='active',  # Assume active if in recent data
            days_active=int(row.days_active or 0),
            metrics=CampaignMetrics(
                impressions=int(row.total_impressions or 0),
                clicks=int(row.total_clicks or 0),
                spend=float(row.total_spend or 0),
                leads=int(row.total_leads or 0),
                cpl=float(row.cpl or 0),
                ctr=float(row.ctr or 0),
                conversions=int(row.total_leads or 0),  # Leads are conversions
                roas=0.0  # ROAS not available in current data
            ),
            budget=None,  # Budget not available in current data
            target_audience=None  # Target audience not available in current data
        ))

    return campaigns


@router.get("/stats", response_model=CampaignStatsResponse)
async def get_campaign_stats(
    date_from: date = Query(default=None, description="Start date for statistics"),
    date_to: date = Query(default=None, description="End date for statistics"),
    session: AsyncSession = Depends(get_itstep_session),
    current_user = Depends(get_current_user)
):
    """
    Get aggregated statistics for all marketing campaigns.

    Returns totals and averages across all campaigns in the specified date range.
    """
    # Default to last 30 days if no dates provided
    if date_from is None:
        date_from = date.today() - timedelta(days=30)
    if date_to is None:
        date_to = date.today()

    query_text = """
        SELECT
          COUNT(DISTINCT c.campaign_id) as total_campaigns,
          COUNT(DISTINCT CASE
            WHEN lc.dt >= CURRENT_DATE - INTERVAL '7 days'
            THEN c.campaign_id
          END) as active_campaigns,
          SUM(lc.spend) as total_spend,
          SUM(lc.leads) as total_leads,
          ROUND(SUM(lc.spend) / NULLIF(SUM(lc.leads), 0), 2) as avg_cpl,
          ROUND(SUM(lc.clicks)::numeric / NULLIF(SUM(lc.impressions), 0) * 100, 2) as avg_ctr
        FROM dashboards.campaign_reference c
        LEFT JOIN dashboards.v5_leads_campaign_daily lc ON c.campaign_id = lc.campaign_id
        WHERE lc.dt >= :date_from
          AND lc.dt <= :date_to
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
        return CampaignStatsResponse(
            total_campaigns=0,
            active_campaigns=0,
            total_spend=0.0,
            total_leads=0,
            avg_cpl=0.0,
            avg_ctr=0.0
        )

    return CampaignStatsResponse(
        total_campaigns=int(row.total_campaigns or 0),
        active_campaigns=int(row.active_campaigns or 0),
        total_spend=float(row.total_spend or 0),
        total_leads=int(row.total_leads or 0),
        avg_cpl=float(row.avg_cpl or 0),
        avg_ctr=float(row.avg_ctr or 0)
    )
