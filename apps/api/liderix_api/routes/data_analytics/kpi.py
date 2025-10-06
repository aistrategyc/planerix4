"""
KPI Cards endpoint for Data Analytics
Source: dashboards.v5_bi_platform_daily
"""
import logging
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from liderix_api.db import get_itstep_session
from liderix_api.schemas.data_analytics import KPICardsResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/kpi", response_model=KPICardsResponse)
async def get_kpi_cards(
    date_from: date = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="End date (YYYY-MM-DD)"),
    platforms: Optional[str] = Query(
        "google,meta",
        description="Comma-separated platforms (google,meta,email)"
    ),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get KPI cards aggregated metrics for the period

    Returns: Leads, Contracts, Revenue, Spend, CPL, ROAS
    """
    try:
        # Parse platforms
        platforms_list = [p.strip() for p in platforms.split(",")] if platforms else []

        # SQL query matching the spec
        if platforms_list:
            platform_filter = "AND platform = ANY(:platforms)"
        else:
            platform_filter = ""

        query = text(f"""
            SELECT
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
            FROM dashboards.v5_bi_platform_daily
            WHERE dt BETWEEN :date_from AND :date_to
                {platform_filter}
        """)

        params = {
            "date_from": date_from,
            "date_to": date_to,
        }
        if platforms_list:
            params["platforms"] = platforms_list

        result = await session.execute(query, params)
        row = result.fetchone()

        if not row:
            return KPICardsResponse(
                leads=0,
                n_contracts=0,
                revenue=0.0,
                spend=0.0,
                cpl=None,
                roas=None,
            )

        return KPICardsResponse(
            leads=int(row[0] or 0),
            n_contracts=int(row[1] or 0),
            revenue=float(row[2] or 0.0),
            spend=float(row[3] or 0.0),
            cpl=float(row[4]) if row[4] is not None else None,
            roas=float(row[5]) if row[5] is not None else None,
        )

    except Exception as e:
        logger.error(f"Error fetching KPI cards: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch KPI data: {str(e)}")
