"""
Campaigns endpoints for Data Analytics
Sources:
- dashboards.v5_leads_campaign_daily (campaigns aggregated)
- dashboards.v5_leads_campaign_weekly (week-over-week)
"""
import logging
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from liderix_api.services.auth import get_current_user
from liderix_api.models.users import User
from liderix_api.db import get_itstep_session
from liderix_api.services.dependencies import get_current_user
from liderix_api.models.users import User
from liderix_api.schemas.data_analytics import (
    CampaignsResponse,
    CampaignItem,
    WoWCampaignsResponse,
    WoWCampaignItem,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=CampaignsResponse)
async def get_campaigns(
    date_from: date = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(
        "google,meta",
        description="Comma-separated platforms (google,meta,email)"
    ),
    min_spend: Optional[float] = Query(0.0, description="Minimum spend filter"),
    limit: Optional[int] = Query(500, description="Results limit"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get campaigns aggregated metrics for the period

    Returns: Array of campaigns with platform, campaign_id, campaign_name, leads, contracts, revenue, spend, CPL, ROAS
    """
    try:
        # Parse platforms
        platforms_list = [p.strip() for p in platforms.split(",")] if platforms else []

        if platforms_list:
            platform_filter = "AND platform = ANY(:platforms)"
        else:
            platform_filter = ""

        query = text(f"""
            SELECT
                platform,
                campaign_id,
                campaign_name,
                SUM(leads) AS leads,
                SUM(n_contracts) AS n_contracts,
                SUM(sum_contracts) AS revenue,
                SUM(spend) AS spend,
                CASE WHEN SUM(leads) > 0
                    THEN SUM(spend)::numeric / NULLIF(SUM(leads), 0)
                END AS cpl,
                CASE WHEN SUM(spend) > 0
                    THEN SUM(sum_contracts)::numeric / NULLIF(SUM(spend), 0)
                END AS roas
            FROM dashboards.v5_leads_campaign_daily
            WHERE dt BETWEEN :date_from AND :date_to
                {platform_filter}
            GROUP BY platform, campaign_id, campaign_name
            HAVING SUM(spend) >= :min_spend
            ORDER BY leads DESC
            LIMIT :limit
        """)

        params = {
            "date_from": date_from,
            "date_to": date_to,
            "min_spend": min_spend or 0.0,
            "limit": limit or 500,
        }
        if platforms_list:
            params["platforms"] = platforms_list

        result = await session.execute(query, params)
        rows = result.fetchall()

        data = [
            CampaignItem(
                platform=row[0],
                campaign_id=row[1],
                campaign_name=row[2],
                leads=int(row[3] or 0),
                n_contracts=int(row[4] or 0),
                revenue=float(row[5] or 0.0),
                spend=float(row[6] or 0.0),
                cpl=float(row[7]) if row[7] is not None else None,
                roas=float(row[8]) if row[8] is not None else None,
            )
            for row in rows
        ]

        return CampaignsResponse(data=data)

    except Exception as e:
        logger.error(f"Error fetching campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns: {str(e)}")


@router.get("/wow", response_model=WoWCampaignsResponse)
async def get_wow_campaigns(
    platforms: Optional[str] = Query(
        "google,meta",
        description="Comma-separated platforms (google,meta,email)"
    ),
    limit: Optional[int] = Query(200, description="Results limit"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get week-over-week campaigns comparison

    Returns: Array of campaigns with current week vs previous week metrics
    Source: dashboards.v5_leads_campaign_weekly (view with pre-calculated WoW)
    """
    try:
        # Parse platforms
        platforms_list = [p.strip() for p in platforms.split(",")] if platforms else []

        if platforms_list:
            platform_filter = "WHERE dominant_platform = ANY(:platforms)"
        else:
            platform_filter = ""

        query = text(f"""
            SELECT
                dominant_platform as platform,
                campaign_id,
                campaign_name,
                leads as leads_cur,
                prev_week_leads as leads_prev,
                (leads - COALESCE(prev_week_leads, 0)) AS leads_diff,
                CASE WHEN COALESCE(prev_week_leads, 0) > 0
                    THEN (leads - COALESCE(prev_week_leads, 0))::numeric * 100.0 / prev_week_leads
                    ELSE NULL
                END AS leads_diff_pct,
                0.0 as spend_cur,
                0.0 as spend_prev,
                0.0 AS spend_diff,
                NULL AS spend_diff_pct,
                revenue_per_lead as cpl_cur,
                NULL as cpl_prev
            FROM dashboards.v5_leads_campaign_weekly
            {platform_filter}
            ORDER BY (leads - COALESCE(prev_week_leads, 0)) DESC
            LIMIT :limit
        """)

        params = {
            "limit": limit or 200,
        }
        if platforms_list:
            params["platforms"] = platforms_list

        result = await session.execute(query, params)
        rows = result.fetchall()

        data = [
            WoWCampaignItem(
                platform=row[0],
                campaign_id=row[1],
                campaign_name=row[2],
                leads_cur=int(row[3] or 0),
                leads_prev=int(row[4] or 0),
                leads_diff=int(row[5] or 0),
                leads_diff_pct=float(row[6]) if row[6] is not None else None,
                spend_cur=float(row[7] or 0.0),
                spend_prev=float(row[8] or 0.0),
                spend_diff=float(row[9] or 0.0),
                spend_diff_pct=float(row[10]) if row[10] is not None else None,
                cpl_cur=float(row[11]) if row[11] is not None else None,
                cpl_prev=float(row[12]) if row[12] is not None else None,
            )
            for row in rows
        ]

        return WoWCampaignsResponse(data=data)

    except Exception as e:
        logger.error(f"Error fetching WoW campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch WoW campaigns: {str(e)}")
