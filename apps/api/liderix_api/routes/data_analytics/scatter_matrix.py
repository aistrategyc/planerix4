"""
Scatter Matrix endpoint for CPL vs ROAS visualization
Shows campaigns as bubbles: x=CPL, y=ROAS, size=spend
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from liderix_api.db import get_itstep_session

router = APIRouter()


@router.get("/scatter-matrix")
async def get_scatter_matrix(
    date_from: date = Query(..., description="Start date (YYYY-MM-DD)"),
    date_to: date = Query(..., description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(None, description="Platform filter (google/meta)"),
    min_leads: int = Query(5, description="Minimum leads to include"),
    min_spend: float = Query(100, description="Minimum spend to include"),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get scatter matrix data for CPL vs ROAS visualization.
    Returns campaigns with CPL, ROAS, and spend for bubble chart.

    Data source: dashboards.v5_leads_campaign_daily
    """

    # Build platform filter
    if platform and platform.lower() in ["google", "meta"]:
        platform_filter = "AND platform = :platform"
        has_platform_filter = True
    else:
        platform_filter = ""
        has_platform_filter = False

    query = text(f"""
        SELECT
            platform,
            campaign_id,
            campaign_name,
            SUM(leads) as leads,
            SUM(spend) as spend,
            SUM(revenue) as revenue,
            SUM(n_contracts) as n_contracts,
            CASE
                WHEN SUM(leads) > 0 THEN SUM(spend) / SUM(leads)
                ELSE NULL
            END as cpl,
            CASE
                WHEN SUM(spend) > 0 THEN SUM(revenue) / SUM(spend)
                ELSE NULL
            END as roas
        FROM dashboards.v5_leads_campaign_daily
        WHERE dt >= :date_from
          AND dt <= :date_to
          {platform_filter}
        GROUP BY platform, campaign_id, campaign_name
        HAVING SUM(leads) >= :min_leads
           AND SUM(spend) >= :min_spend
           AND SUM(leads) > 0
           AND SUM(spend) > 0
        ORDER BY spend DESC
        LIMIT 50
    """)

    params = {
        "date_from": date_from,
        "date_to": date_to,
        "min_leads": min_leads,
        "min_spend": min_spend,
    }
    if has_platform_filter:
        params["platform"] = platform.lower()

    result = await session.execute(query, params)
    rows = result.mappings().all()

    return {
        "data": [
            {
                "platform": row["platform"],
                "campaign_id": row["campaign_id"],
                "campaign_name": row["campaign_name"],
                "leads": row["leads"],
                "spend": float(row["spend"]) if row["spend"] else 0.0,
                "revenue": float(row["revenue"]) if row["revenue"] else 0.0,
                "n_contracts": row["n_contracts"],
                "cpl": float(row["cpl"]) if row["cpl"] else None,
                "roas": float(row["roas"]) if row["roas"] else None,
            }
            for row in rows
        ]
    }
