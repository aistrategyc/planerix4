"""
Analytics Campaigns Routes - Campaign performance and analysis
Based on real ITstep DWH data
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Optional, List

from liderix_api.db import get_itstep_session
from liderix_api.schemas.analytics import (
    CampaignMetrics,
    Campaign,
    PlatformType,
    CampaignStatus,
    MetricBase
)

router = APIRouter()


@router.get("/performance")
async def get_campaign_performance(
    start_date: date = Query(...),
    end_date: date = Query(...),
    platform: Optional[str] = Query(None, description="Filter by platform"),
    limit: int = Query(50, le=200),
    sort_by: str = Query("spend", description="Sort by: spend, revenue, roas, conversions"),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get campaign performance metrics"""
    try:
        # Define sort columns
        sort_columns = {
            "spend": "total_spend DESC",
            "revenue": "total_revenue DESC",
            "roas": "roas DESC",
            "conversions": "total_conversions DESC",
            "ctr": "avg_ctr DESC"
        }
        sort_column = sort_columns.get(sort_by, sort_columns["spend"])

        platform_filter = "AND platform = :platform" if platform else ""

        performance_query = text(f"""
            WITH campaign_metrics AS (
                SELECT
                    campaign_key,
                    platform,
                    SUM(impressions) as total_impressions,
                    SUM(clicks) as total_clicks,
                    SUM(cost) as total_spend,
                    SUM(contracts) as total_conversions,
                    SUM(revenue) as total_revenue,
                    AVG(CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 END) as avg_ctr,
                    AVG(cpc) as avg_cpc,
                    AVG(cpm) as avg_cpm,
                    COUNT(DISTINCT date) as days_active,
                    MIN(date) as first_seen,
                    MAX(date) as last_active,
                    -- Calculate ROAS
                    CASE WHEN SUM(cost) > 0 THEN SUM(revenue) / SUM(cost) ELSE 0 END as roas,
                    -- Calculate shares within platform
                    SUM(share_cost_in_platform) / COUNT(*) as avg_cost_share,
                    SUM(share_revenue_in_platform) / COUNT(*) as avg_revenue_share
                FROM dm.dm_campaign_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND campaign_key IS NOT NULL
                  {platform_filter}
                GROUP BY campaign_key, platform
            )
            SELECT *
            FROM campaign_metrics
            ORDER BY {sort_column}
            LIMIT :limit
        """)

        params = {
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit
        }
        if platform:
            params["platform"] = platform

        result = await session.execute(performance_query, params)
        rows = result.fetchall()

        campaigns = []
        for row in rows:
            campaign_data = {
                "campaign_id": row.campaign_key,
                "campaign_name": row.campaign_key,  # Using key as name for now
                "platform": row.platform,
                "total_metrics": {
                    "impressions": int(row.total_impressions or 0),
                    "clicks": int(row.total_clicks or 0),
                    "spend": float(row.total_spend or 0),
                    "conversions": int(row.total_conversions or 0),
                    "revenue": float(row.total_revenue or 0),
                    "ctr": float(row.avg_ctr or 0),
                    "cpc": float(row.avg_cpc or 0),
                    "cpm": float(row.avg_cpm or 0),
                    "roas": float(row.roas or 0)
                },
                "performance": {
                    "days_active": int(row.days_active or 0),
                    "first_seen": row.first_seen.isoformat() if row.first_seen else None,
                    "last_active": row.last_active.isoformat() if row.last_active else None,
                    "avg_cost_share": float(row.avg_cost_share or 0),
                    "avg_revenue_share": float(row.avg_revenue_share or 0)
                }
            }
            campaigns.append(campaign_data)

        return {
            "status": "success",
            "data": campaigns,
            "total_count": len(campaigns),
            "filters": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "platform": platform,
                "sort_by": sort_by
            }
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/daily-trend")
async def get_campaign_daily_trend(
    campaign_id: str = Query(..., description="Campaign key"),
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get daily trend for a specific campaign"""
    try:
        trend_query = text("""
            SELECT
                date,
                impressions,
                clicks,
                cost as spend,
                contracts as conversions,
                revenue,
                CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 END as ctr,
                cpc,
                cpm,
                share_cost_in_platform,
                share_revenue_in_platform
            FROM dm.dm_campaign_results_daily_v3
            WHERE campaign_key = :campaign_id
              AND date >= :start_date
              AND date <= :end_date
            ORDER BY date
        """)

        result = await session.execute(
            trend_query,
            {
                "campaign_id": campaign_id,
                "start_date": start_date,
                "end_date": end_date
            }
        )
        rows = result.fetchall()

        daily_data = []
        for row in rows:
            daily_metrics = {
                "date": row.date.isoformat(),
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "spend": float(row.spend or 0),
                "conversions": int(row.conversions or 0),
                "revenue": float(row.revenue or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpm": float(row.cpm or 0),
                "share_cost": float(row.share_cost_in_platform or 0),
                "share_revenue": float(row.share_revenue_in_platform or 0)
            }
            daily_data.append(daily_metrics)

        return {
            "status": "success",
            "campaign_id": campaign_id,
            "data": daily_data
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/by-products")
async def get_campaigns_by_products(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get campaign performance grouped by products"""
    try:
        products_query = text("""
            SELECT
                product_key,
                platform,
                campaign_key,
                SUM(contracts) as total_contracts,
                SUM(revenue) as total_revenue,
                COUNT(DISTINCT date) as days_active
            FROM dm.dm_campaign_contracts_by_product_v1
            WHERE date >= :start_date AND date <= :end_date
              AND product_key IS NOT NULL
            GROUP BY product_key, platform, campaign_key
            ORDER BY total_revenue DESC
        """)

        result = await session.execute(
            products_query,
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        # Group by product
        products_data = {}
        for row in rows:
            product_key = row.product_key
            if product_key not in products_data:
                products_data[product_key] = {
                    "product_key": product_key,
                    "total_contracts": 0,
                    "total_revenue": 0.0,
                    "campaigns": [],
                    "platforms": set()
                }

            products_data[product_key]["total_contracts"] += int(row.total_contracts or 0)
            products_data[product_key]["total_revenue"] += float(row.total_revenue or 0)
            products_data[product_key]["platforms"].add(row.platform)

            products_data[product_key]["campaigns"].append({
                "campaign_key": row.campaign_key,
                "platform": row.platform,
                "contracts": int(row.total_contracts or 0),
                "revenue": float(row.total_revenue or 0),
                "days_active": int(row.days_active or 0)
            })

        # Convert to list and format
        products_list = []
        for product_key, data in products_data.items():
            data["platforms"] = list(data["platforms"])
            data["campaigns_count"] = len(data["campaigns"])
            products_list.append(data)

        # Sort by revenue
        products_list.sort(key=lambda x: x["total_revenue"], reverse=True)

        return {
            "status": "success",
            "data": products_list
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/rolling-performance")
async def get_rolling_performance(
    days: int = Query(7, description="Rolling window in days"),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get rolling performance metrics for campaigns"""
    try:
        rolling_query = text("""
            SELECT
                platform,
                campaign_key,
                last_active_date,
                window_start,
                window_end,
                impressions,
                clicks,
                cost,
                ctr_pct,
                cpc,
                cpm
            FROM dm.dm_campaign_rolling_7d
            WHERE window_end >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY cost DESC
            LIMIT 50
        """)

        result = await session.execute(rolling_query)
        rows = result.fetchall()

        rolling_data = []
        for row in rows:
            campaign_data = {
                "campaign_key": row.campaign_key,
                "platform": row.platform,
                "last_active": row.last_active_date.isoformat() if row.last_active_date else None,
                "window": {
                    "start": row.window_start.isoformat() if row.window_start else None,
                    "end": row.window_end.isoformat() if row.window_end else None,
                    "days": days
                },
                "metrics": {
                    "impressions": int(row.impressions or 0),
                    "clicks": int(row.clicks or 0),
                    "spend": float(row.cost or 0),
                    "ctr": float(row.ctr_pct or 0),
                    "cpc": float(row.cpc or 0),
                    "cpm": float(row.cpm or 0)
                }
            }
            rolling_data.append(campaign_data)

        return {
            "status": "success",
            "rolling_days": days,
            "data": rolling_data
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/summary")
async def get_campaigns_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get overall campaigns summary statistics"""
    try:
        summary_query = text("""
            WITH campaign_summary AS (
                SELECT
                    COUNT(DISTINCT campaign_key) as total_campaigns,
                    COUNT(DISTINCT platform) as platforms_count,
                    SUM(impressions) as total_impressions,
                    SUM(clicks) as total_clicks,
                    SUM(cost) as total_spend,
                    SUM(contracts) as total_conversions,
                    SUM(revenue) as total_revenue,
                    AVG(CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 END) as avg_ctr
                FROM dm.dm_campaign_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
            ),
            platform_breakdown AS (
                SELECT
                    platform,
                    COUNT(DISTINCT campaign_key) as campaigns,
                    SUM(cost) as spend,
                    SUM(revenue) as revenue
                FROM dm.dm_campaign_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND platform IS NOT NULL
                GROUP BY platform
            )
            SELECT
                s.*,
                array_agg(
                    json_build_object(
                        'platform', p.platform,
                        'campaigns', p.campaigns,
                        'spend', p.spend,
                        'revenue', p.revenue,
                        'roas', CASE WHEN p.spend > 0 THEN p.revenue / p.spend ELSE 0 END
                    )
                ) as platform_breakdown
            FROM campaign_summary s, platform_breakdown p
            GROUP BY s.total_campaigns, s.platforms_count, s.total_impressions,
                     s.total_clicks, s.total_spend, s.total_conversions,
                     s.total_revenue, s.avg_ctr
        """)

        result = await session.execute(
            summary_query,
            {"start_date": start_date, "end_date": end_date}
        )
        row = result.fetchone()

        total_spend = float(row.total_spend or 0)
        total_revenue = float(row.total_revenue or 0)

        return {
            "status": "success",
            "summary": {
                "total_campaigns": int(row.total_campaigns or 0),
                "platforms_count": int(row.platforms_count or 0),
                "total_impressions": int(row.total_impressions or 0),
                "total_clicks": int(row.total_clicks or 0),
                "total_spend": total_spend,
                "total_conversions": int(row.total_conversions or 0),
                "total_revenue": total_revenue,
                "overall_roas": total_revenue / total_spend if total_spend > 0 else 0,
                "avg_ctr": float(row.avg_ctr or 0)
            },
            "by_platform": row.platform_breakdown or []
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/{campaign_id}/creatives")
async def get_campaign_creatives(
    campaign_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get all creatives for a specific campaign"""
    try:
        creatives_query = text("""
            SELECT
                creative_key,
                creative_title,
                creative_url,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(cost) as spend,
                SUM(contracts) as conversions,
                SUM(revenue) as revenue,
                AVG(ctr_pct) as avg_ctr,
                AVG(cpc) as avg_cpc,
                COUNT(DISTINCT date) as days_active
            FROM dm.dm_ad_results_daily_v3
            WHERE campaign_key = :campaign_id
              AND date >= :start_date
              AND date <= :end_date
              AND creative_key IS NOT NULL
            GROUP BY creative_key, creative_title, creative_url
            ORDER BY revenue DESC, conversions DESC
        """)

        result = await session.execute(
            creatives_query,
            {
                "campaign_id": campaign_id,
                "start_date": start_date,
                "end_date": end_date
            }
        )
        rows = result.fetchall()

        creatives = []
        for row in rows:
            spend = float(row.spend or 0)
            revenue = float(row.revenue or 0)

            creative_data = {
                "creative_id": row.creative_key,
                "creative_name": row.creative_title or f"Creative {row.creative_key}",
                "creative_url": row.creative_url,
                "metrics": {
                    "impressions": int(row.impressions or 0),
                    "clicks": int(row.clicks or 0),
                    "spend": spend,
                    "conversions": int(row.conversions or 0),
                    "revenue": revenue,
                    "ctr": float(row.avg_ctr or 0),
                    "cpc": float(row.avg_cpc or 0),
                    "roas": revenue / spend if spend > 0 else 0
                },
                "days_active": int(row.days_active or 0)
            }
            creatives.append(creative_data)

        return {
            "status": "success",
            "campaign_id": campaign_id,
            "creatives": creatives,
            "total_creatives": len(creatives)
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}