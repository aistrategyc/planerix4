"""
Analytics Creatives Routes - Creative performance and analysis
Based on real ITstep DWH data
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Optional, List

from liderix_api.db import get_itstep_session
from liderix_api.schemas.analytics import (
    CreativeMetrics,
    CreativeBurnout,
    Creative,
    CreativeType,
    PlatformType,
    CreativeTheme,
    CampaignStatus
)

router = APIRouter()


@router.get("/performance")
async def get_creative_performance(
    start_date: date = Query(...),
    end_date: date = Query(...),
    limit: int = Query(50, le=200),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get top performing creatives with metrics"""
    try:
        performance_query = text("""
            WITH creative_metrics AS (
                SELECT
                    creative_key,
                    campaign_key,
                    creative_title,
                    creative_url,
                    SUM(impressions) as impressions,
                    SUM(clicks) as clicks,
                    SUM(cost) as spend,
                    SUM(contracts) as conversions,
                    SUM(revenue) as revenue,
                    -- Calculate CTR from clicks/impressions since ctr_pct doesn't exist
                    CASE WHEN SUM(impressions) > 0 THEN SUM(clicks)::DECIMAL / SUM(impressions) * 100 ELSE 0 END as avg_ctr,
                    AVG(cpc) as avg_cpc,
                    AVG(cpm) as avg_cpm
                FROM dm.dm_ad_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND creative_key IS NOT NULL
                GROUP BY creative_key, campaign_key, creative_title, creative_url
            )
            SELECT
                creative_key,
                campaign_key,
                creative_title,
                creative_url,
                impressions,
                clicks,
                spend,
                conversions,
                revenue,
                avg_ctr,
                avg_cpc,
                avg_cpm,
                -- Calculate ROAS
                CASE WHEN spend > 0 THEN revenue / spend ELSE 0 END as roas,
                -- Calculate CVR
                CASE WHEN clicks > 0 THEN conversions::DECIMAL / clicks * 100 ELSE 0 END as cvr
            FROM creative_metrics
            ORDER BY revenue DESC, conversions DESC
            LIMIT :limit
        """)

        result = await session.execute(
            performance_query,
            {
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit
            }
        )
        rows = result.fetchall()

        creatives = []
        for row in rows:
            creative_data = {
                "creative_id": row.creative_key,
                "creative_name": row.creative_title or f"Creative {row.creative_key}",
                "campaign_key": row.campaign_key,
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "spend": float(row.spend or 0),
                "conversions": int(row.conversions or 0),
                "revenue": float(row.revenue or 0),
                "ctr": float(row.avg_ctr or 0),
                "cpc": float(row.avg_cpc or 0),
                "cpm": float(row.avg_cpm or 0),
                "roas": float(row.roas or 0),
                "cvr": float(row.cvr or 0),
                "creative_url": row.creative_url
            }
            creatives.append(creative_data)

        return {
            "status": "success",
            "data": creatives,
            "total_count": len(creatives)
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/burnout-analysis")
async def get_creative_burnout_analysis(
    days_back: int = Query(30, description="Days to analyze"),
    min_days_active: int = Query(7, description="Minimum days active to include"),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Analyze creative burnout based on CTR degradation"""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days_back)

        burnout_query = text("""
            WITH creative_daily AS (
                SELECT
                    creative_key,
                    creative_title,
                    date,
                    CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 ELSE 0 END as ctr,
                    ROW_NUMBER() OVER (PARTITION BY creative_key ORDER BY date ASC) as day_seq_asc,
                    ROW_NUMBER() OVER (PARTITION BY creative_key ORDER BY date DESC) as day_seq_desc
                FROM dm.dm_ad_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND creative_key IS NOT NULL
                  AND impressions > 0 AND clicks > 0
            ),
            creative_stats AS (
                SELECT
                    creative_key,
                    MAX(creative_title) as creative_name,
                    COUNT(*) as days_active,
                    MAX(CASE WHEN day_seq_asc <= 3 THEN ctr END) as initial_ctr,
                    MAX(CASE WHEN day_seq_desc <= 3 THEN ctr END) as current_ctr,
                    AVG(ctr) as avg_ctr
                FROM creative_daily
                GROUP BY creative_key
                HAVING COUNT(*) >= :min_days_active
            )
            SELECT
                creative_key,
                creative_name,
                days_active,
                COALESCE(initial_ctr, 0) as initial_ctr,
                COALESCE(current_ctr, 0) as current_ctr,
                COALESCE(avg_ctr, 0) as avg_ctr,
                -- Calculate burnout score
                CASE
                    WHEN initial_ctr > 0 AND current_ctr >= 0 THEN
                        GREATEST(0, (initial_ctr - current_ctr) / initial_ctr * 100)
                    ELSE 0
                END as burnout_score
            FROM creative_stats
            ORDER BY burnout_score DESC
        """)

        result = await session.execute(
            burnout_query,
            {
                "start_date": start_date,
                "end_date": end_date,
                "min_days_active": min_days_active
            }
        )
        rows = result.fetchall()

        burnout_analysis = []
        for row in rows:
            burnout_score = float(row.burnout_score or 0)

            # Determine status
            if burnout_score > 70:
                status = "burned_out"
            elif burnout_score > 30:
                status = "declining"
            else:
                status = "fresh"

            analysis = CreativeBurnout(
                creative_id=row.creative_key,
                creative_name=row.creative_name or f"Creative {row.creative_key}",
                days_active=int(row.days_active or 0),
                initial_ctr=float(row.initial_ctr or 0),
                current_ctr=float(row.current_ctr or 0),
                burnout_score=burnout_score,
                status=status
            )
            burnout_analysis.append(analysis)

        return {
            "status": "success",
            "data": [analysis.dict() for analysis in burnout_analysis],
            "alerts": [
                f"Creative {a.creative_id} needs refresh"
                for a in burnout_analysis
                if a.needs_refresh
            ][:5]  # Top 5 alerts
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/top-performers")
async def get_top_performing_creatives(
    start_date: date = Query(...),
    end_date: date = Query(...),
    metric: str = Query("roas", description="Metric to sort by: roas, revenue, conversions, ctr"),
    limit: int = Query(10, le=50),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get top performing creatives by specified metric"""
    try:
        # Define sort column based on metric
        sort_columns = {
            "roas": "revenue / NULLIF(cost, 0) DESC",
            "revenue": "revenue DESC",
            "conversions": "contracts DESC",
            "ctr": "AVG(CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 ELSE 0 END) DESC",
            "spend": "cost DESC"
        }

        sort_column = sort_columns.get(metric, sort_columns["roas"])

        top_performers_query = text(f"""
            SELECT
                creative_key,
                creative_title,
                campaign_key,
                platform,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(cost) as cost,
                SUM(contracts) as contracts,
                SUM(revenue) as revenue,
                AVG(CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 ELSE 0 END) as avg_ctr,
                AVG(cpc) as avg_cpc
            FROM dm.dm_ad_results_daily_v3
            WHERE date >= :start_date AND date <= :end_date
              AND creative_key IS NOT NULL
            GROUP BY creative_key, creative_title, campaign_key, platform
            ORDER BY {sort_column}
            LIMIT :limit
        """)

        result = await session.execute(
            top_performers_query,
            {
                "start_date": start_date,
                "end_date": end_date,
                "limit": limit
            }
        )
        rows = result.fetchall()

        performers = []
        for row in rows:
            cost = float(row.cost or 0)
            revenue = float(row.revenue or 0)

            performer = {
                "creative_id": row.creative_key,
                "creative_name": row.creative_title or f"Creative {row.creative_key}",
                "campaign_key": row.campaign_key,
                "platform": row.platform,
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "spend": cost,
                "conversions": int(row.contracts or 0),
                "revenue": revenue,
                "ctr": float(row.avg_ctr or 0),
                "cpc": float(row.avg_cpc or 0),
                "roas": revenue / cost if cost > 0 else 0,
                "metric_value": {
                    "roas": revenue / cost if cost > 0 else 0,
                    "revenue": revenue,
                    "conversions": int(row.contracts or 0),
                    "ctr": float(row.avg_ctr or 0),
                    "spend": cost
                }.get(metric, 0)
            }
            performers.append(performer)

        return {
            "status": "success",
            "metric": metric,
            "data": performers
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/themes-analysis")
async def get_creative_themes_analysis(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Analyze performance by creative themes (inferred from titles)"""
    try:
        themes_query = text("""
            WITH creative_themes AS (
                SELECT
                    creative_key,
                    creative_title,
                    cost,
                    revenue,
                    contracts,
                    impressions,
                    clicks,
                    -- Infer theme from creative title
                    CASE
                        WHEN creative_title ILIKE '%карьер%' OR creative_title ILIKE '%career%' THEN 'Карьера'
                        WHEN creative_title ILIKE '%деньг%' OR creative_title ILIKE '%money%' OR creative_title ILIKE '%зарплат%' THEN 'Деньги'
                        WHEN creative_title ILIKE '%изменен%' OR creative_title ILIKE '%change%' OR creative_title ILIKE '%новая жизнь%' THEN 'Изменения'
                        WHEN creative_title ILIKE '%сертифик%' OR creative_title ILIKE '%certificate%' THEN 'Сертификаты'
                        WHEN creative_title ILIKE '%гарант%' OR creative_title ILIKE '%guarantee%' THEN 'Гарантии'
                        WHEN creative_title ILIKE '%нуля%' OR creative_title ILIKE '%zero%' OR creative_title ILIKE '%начинающ%' THEN 'С нуля'
                        WHEN creative_title ILIKE '%поддержк%' OR creative_title ILIKE '%support%' THEN 'Поддержка'
                        ELSE 'Другое'
                    END as theme
                FROM dm.dm_ad_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND creative_title IS NOT NULL
            )
            SELECT
                theme,
                COUNT(DISTINCT creative_key) as creatives_count,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(cost) as spend,
                SUM(contracts) as conversions,
                SUM(revenue) as revenue,
                AVG(CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 END) as avg_ctr,
                AVG(CASE WHEN clicks > 0 THEN cost / clicks END) as avg_cpc
            FROM creative_themes
            GROUP BY theme
            ORDER BY revenue DESC
        """)

        result = await session.execute(
            themes_query,
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        themes_analysis = []
        for row in rows:
            spend = float(row.spend or 0)
            revenue = float(row.revenue or 0)

            theme_data = {
                "theme": row.theme,
                "creatives_count": int(row.creatives_count or 0),
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "spend": spend,
                "conversions": int(row.conversions or 0),
                "revenue": revenue,
                "avg_ctr": float(row.avg_ctr or 0),
                "avg_cpc": float(row.avg_cpc or 0),
                "roas": revenue / spend if spend > 0 else 0,
                "share_of_spend": 0,  # Will calculate below
                "performance_score": 0  # Will calculate below
            }
            themes_analysis.append(theme_data)

        # Calculate shares and performance scores
        total_spend = sum(theme["spend"] for theme in themes_analysis)

        for theme in themes_analysis:
            theme["share_of_spend"] = (theme["spend"] / total_spend * 100) if total_spend > 0 else 0
            # Performance score based on ROAS (scaled to 0-100)
            theme["performance_score"] = min(theme["roas"] * 20, 100)

        return {
            "status": "success",
            "data": themes_analysis,
            "insights": {
                "best_theme": max(themes_analysis, key=lambda x: x["roas"])["theme"] if themes_analysis else None,
                "most_used_theme": max(themes_analysis, key=lambda x: x["creatives_count"])["theme"] if themes_analysis else None
            }
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/{creative_id}/details")
async def get_creative_details(
    creative_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get detailed information for a specific creative"""
    try:
        details_query = text("""
            WITH creative_daily AS (
                SELECT
                    date,
                    impressions,
                    clicks,
                    cost,
                    contracts,
                    revenue,
                    CASE WHEN impressions > 0 THEN clicks::DECIMAL / impressions * 100 ELSE 0 END as ctr,
                    cpc,
                    cpm
                FROM dm.dm_ad_results_daily_v3
                WHERE creative_key = :creative_id
                  AND date >= :start_date
                  AND date <= :end_date
                ORDER BY date
            ),
            creative_summary AS (
                SELECT
                    creative_key,
                    creative_title,
                    creative_url,
                    campaign_key,
                    platform,
                    SUM(impressions) as total_impressions,
                    SUM(clicks) as total_clicks,
                    SUM(cost) as total_spend,
                    SUM(contracts) as total_conversions,
                    SUM(revenue) as total_revenue,
                    COUNT(DISTINCT date) as days_active,
                    MIN(date) as first_seen,
                    MAX(date) as last_active
                FROM dm.dm_ad_results_daily_v3
                WHERE creative_key = :creative_id
                  AND date >= :start_date
                  AND date <= :end_date
                GROUP BY creative_key, creative_title, creative_url, campaign_key, platform
            )
            SELECT
                s.*,
                array_agg(
                    json_build_object(
                        'date', d.date,
                        'impressions', d.impressions,
                        'clicks', d.clicks,
                        'spend', d.cost,
                        'conversions', d.contracts,
                        'revenue', d.revenue,
                        'ctr', CASE WHEN d.impressions > 0 THEN d.clicks::DECIMAL / d.impressions * 100 ELSE 0 END,
                        'cpc', d.cpc,
                        'cpm', d.cpm
                    ) ORDER BY d.date
                ) as daily_data
            FROM creative_summary s
            LEFT JOIN creative_daily d ON true
            GROUP BY s.creative_key, s.creative_title, s.creative_url, s.campaign_key, s.platform,
                     s.total_impressions, s.total_clicks, s.total_spend, s.total_conversions,
                     s.total_revenue, s.days_active, s.first_seen, s.last_active
        """)

        result = await session.execute(
            details_query,
            {
                "creative_id": creative_id,
                "start_date": start_date,
                "end_date": end_date
            }
        )
        row = result.fetchone()

        if not row:
            return {"status": "error", "message": "Creative not found"}

        total_spend = float(row.total_spend or 0)
        total_revenue = float(row.total_revenue or 0)

        return {
            "status": "success",
            "creative": {
                "id": row.creative_key,
                "name": row.creative_title or f"Creative {row.creative_key}",
                "url": row.creative_url,
                "campaign_key": row.campaign_key,
                "platform": row.platform,
                "first_seen": row.first_seen.isoformat() if row.first_seen else None,
                "last_active": row.last_active.isoformat() if row.last_active else None,
                "days_active": int(row.days_active or 0)
            },
            "total_metrics": {
                "impressions": int(row.total_impressions or 0),
                "clicks": int(row.total_clicks or 0),
                "spend": total_spend,
                "conversions": int(row.total_conversions or 0),
                "revenue": total_revenue,
                "roas": total_revenue / total_spend if total_spend > 0 else 0,
                "ctr": (int(row.total_clicks or 0) / int(row.total_impressions or 1) * 100),
                "cpc": total_spend / int(row.total_clicks or 1)
            },
            "daily_performance": row.daily_data or []
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}