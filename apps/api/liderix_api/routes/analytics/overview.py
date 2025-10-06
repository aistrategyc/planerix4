"""
Analytics Overview Routes - Main dashboard endpoints
Based on real ITstep DWH data
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Optional, List

from liderix_api.db import get_itstep_session
from liderix_api.schemas.analytics import (
    DashboardOverview,
    DateRangeFilter,
    RealTimeMetrics,
    PlatformPerformance,
    MetricBase,
    PlatformType
)

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOverview)
async def get_dashboard_overview(
    start_date: date = Query(..., description="Start date for analytics"),
    end_date: date = Query(..., description="End date for analytics"),
    session: AsyncSession = Depends(get_itstep_session)
):
    """
    Get main dashboard overview with key metrics
    Based on dm.dm_campaign_results_daily_v3 and dwh.fact_contracts
    """
    try:
        # Main metrics from campaign results
        metrics_query = text("""
            SELECT
                SUM(cost) as total_spend,
                SUM(revenue) as total_revenue,
                SUM(contracts) as total_conversions,
                COUNT(DISTINCT campaign_key) as active_campaigns
            FROM dm.dm_campaign_results_daily_v3
            WHERE date >= :start_date AND date <= :end_date
        """)

        metrics_result = await session.execute(
            metrics_query,
            {"start_date": start_date, "end_date": end_date}
        )
        metrics = metrics_result.fetchone()

        # Get total leads from CRM - using request_created_at column
        leads_query = text("""
            SELECT COUNT(*) as total_leads
            FROM dwh.fact_crm_requests
            WHERE DATE(request_created_at) >= :start_date
              AND DATE(request_created_at) <= :end_date
        """)

        leads_result = await session.execute(
            leads_query,
            {"start_date": start_date, "end_date": end_date}
        )
        leads = leads_result.fetchone()

        # Get unique creatives count
        creatives_query = text("""
            SELECT COUNT(DISTINCT creative_key) as active_creatives
            FROM dm.dm_ad_results_daily_v3
            WHERE date >= :start_date AND date <= :end_date
              AND creative_key IS NOT NULL
        """)

        creatives_result = await session.execute(
            creatives_query,
            {"start_date": start_date, "end_date": end_date}
        )
        creatives = creatives_result.fetchone()

        # Previous period for trends (same duration)
        period_days = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date - timedelta(days=1)

        prev_metrics_query = text("""
            SELECT
                SUM(cost) as prev_spend,
                SUM(revenue) as prev_revenue
            FROM dm.dm_campaign_results_daily_v3
            WHERE date >= :prev_start AND date <= :prev_end
        """)

        prev_result = await session.execute(
            prev_metrics_query,
            {"prev_start": prev_start, "prev_end": prev_end}
        )
        prev_metrics = prev_result.fetchone()

        # Calculate metrics
        total_spend = float(metrics.total_spend or 0)
        total_revenue = float(metrics.total_revenue or 0)
        total_conversions = int(metrics.total_conversions or 0)
        total_leads = int(leads.total_leads or 0)
        active_campaigns = int(metrics.active_campaigns or 0)
        active_creatives = int(creatives.active_creatives or 0)

        # Calculate rates
        roas = total_revenue / total_spend if total_spend > 0 else 0
        conversion_rate = (total_conversions / total_leads * 100) if total_leads > 0 else 0

        # Calculate trends
        prev_spend = float(prev_metrics.prev_spend or 1)
        prev_revenue = float(prev_metrics.prev_revenue or 1)
        prev_roas = prev_revenue / prev_spend if prev_spend > 0 else 0

        spend_trend = ((total_spend - prev_spend) / prev_spend * 100) if prev_spend > 0 else 0
        revenue_trend = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
        roas_trend = ((roas - prev_roas) / prev_roas * 100) if prev_roas > 0 else 0

        return DashboardOverview(
            date_range=DateRangeFilter(start_date=start_date, end_date=end_date),
            total_spend=total_spend,
            total_revenue=total_revenue,
            total_conversions=total_conversions,
            total_leads=total_leads,
            roas=roas,
            conversion_rate=conversion_rate,
            active_campaigns=active_campaigns,
            active_creatives=active_creatives,
            spend_trend=spend_trend,
            revenue_trend=revenue_trend,
            roas_trend=roas_trend
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/realtime", response_model=RealTimeMetrics)
async def get_realtime_metrics(
    session: AsyncSession = Depends(get_itstep_session)
):
    """
    Get real-time metrics for dashboard
    """
    try:
        today = date.today()

        # Get today's metrics
        today_query = text("""
            SELECT
                SUM(revenue) as revenue_today,
                SUM(contracts) as conversions_today
            FROM dm.dm_campaign_results_daily_v3
            WHERE date = :today
        """)

        today_result = await session.execute(today_query, {"today": today})
        today_metrics = today_result.fetchone()

        # Get new leads today from CRM
        leads_query = text("""
            SELECT COUNT(*) as new_leads_today
            FROM dwh.fact_crm_requests
            WHERE DATE(request_created_at) = :today
        """)

        leads_result = await session.execute(leads_query, {"today": today})
        leads = leads_result.fetchone()
        new_leads_today = int(leads.new_leads_today or 0)

        # Get top performing creative
        top_creative_query = text("""
            SELECT creative_key
            FROM dm.dm_ad_results_daily_v3
            WHERE date >= :start_date
            ORDER BY contracts DESC, revenue DESC
            LIMIT 1
        """)

        week_start = today - timedelta(days=7)
        top_result = await session.execute(
            top_creative_query,
            {"start_date": week_start}
        )
        top_creative = top_result.fetchone()

        # Mock active sessions (would need real-time data)
        active_sessions = 156  # Mock data

        alerts = []

        # Add alerts based on performance
        revenue_today = float(today_metrics.revenue_today or 0)
        if revenue_today < 10000:  # Below target
            alerts.append("Daily revenue below target")

        return RealTimeMetrics(
            active_sessions=active_sessions,
            new_leads_today=new_leads_today,
            revenue_today=revenue_today,
            conversions_today=int(today_metrics.conversions_today or 0),
            top_performing_creative=top_creative.creative_key if top_creative else None,
            alerts=alerts,
            last_updated=datetime.now()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/platforms", response_model=List[PlatformPerformance])
async def get_platform_performance(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """
    Get performance by platform
    """
    try:
        platform_query = text("""
            WITH platform_campaigns AS (
                SELECT
                    platform,
                    COUNT(DISTINCT campaign_key) as campaigns_count,
                    SUM(impressions) as impressions,
                    SUM(clicks) as clicks,
                    SUM(cost) as spend,
                    SUM(contracts) as conversions,
                    SUM(revenue) as revenue
                FROM dm.dm_campaign_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND platform IS NOT NULL
                GROUP BY platform
            ),
            platform_creatives AS (
                SELECT
                    platform,
                    COUNT(DISTINCT creative_key) as creatives_count
                FROM dm.dm_ad_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
                  AND platform IS NOT NULL
                  AND creative_key IS NOT NULL
                GROUP BY platform
            )
            SELECT
                pc.platform,
                pc.campaigns_count,
                COALESCE(pcr.creatives_count, 0) as creatives_count,
                pc.impressions,
                pc.clicks,
                pc.spend,
                pc.conversions,
                pc.revenue
            FROM platform_campaigns pc
            LEFT JOIN platform_creatives pcr ON pc.platform = pcr.platform
            ORDER BY pc.spend DESC
        """)

        result = await session.execute(
            platform_query,
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        # Calculate totals for share calculation
        total_spend = sum(float(row.spend or 0) for row in rows)
        total_revenue = sum(float(row.revenue or 0) for row in rows)

        platforms = []
        for row in rows:
            spend = float(row.spend or 0)
            revenue = float(row.revenue or 0)

            # Map platform name to enum
            platform_type = PlatformType.FACEBOOK
            if row.platform and "Google" in row.platform:
                platform_type = PlatformType.GOOGLE
            elif row.platform and "Instagram" in row.platform:
                platform_type = PlatformType.INSTAGRAM

            # Calculate performance score (ROAS weighted)
            roas = revenue / spend if spend > 0 else 0
            performance_score = min(roas * 20, 100)  # Scale ROAS to 0-100

            platform_perf = PlatformPerformance(
                platform=platform_type,
                campaigns_count=int(row.campaigns_count or 0),
                creatives_count=int(row.creatives_count or 0),
                metrics=MetricBase(
                    impressions=int(row.impressions or 0),
                    clicks=int(row.clicks or 0),
                    spend=spend,
                    conversions=int(row.conversions or 0),
                    revenue=revenue
                ),
                share_of_spend=(spend / total_spend * 100) if total_spend > 0 else 0,
                share_of_revenue=(revenue / total_revenue * 100) if total_revenue > 0 else 0,
                performance_score=performance_score
            )
            platforms.append(platform_perf)

        return platforms

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/kpis")
async def get_kpis(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """
    Get key performance indicators
    """
    try:
        kpis_query = text("""
            WITH campaign_metrics AS (
                SELECT
                    SUM(cost) as total_cost,
                    SUM(revenue) as total_revenue,
                    SUM(contracts) as total_contracts,
                    COUNT(DISTINCT campaign_key) as campaigns_count
                FROM dm.dm_campaign_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
            ),
            lead_metrics AS (
                SELECT
                    COUNT(DISTINCT fcr.request_id) as total_leads,
                    COUNT(DISTINCT fc.contract_id) as converted_leads
                FROM dwh.fact_crm_requests fcr
                LEFT JOIN dwh.fact_contracts fc ON fcr.request_id = fc.request_id
                    AND DATE(fc.contract_created_at) >= :start_date
                    AND DATE(fc.contract_created_at) <= :end_date
                WHERE DATE(fcr.request_created_at) >= :start_date
                  AND DATE(fcr.request_created_at) <= :end_date
            )
            SELECT
                c.total_cost,
                c.total_revenue,
                c.total_contracts,
                l.total_leads,
                l.converted_leads
            FROM campaign_metrics c, lead_metrics l
        """)

        result = await session.execute(
            kpis_query,
            {"start_date": start_date, "end_date": end_date}
        )
        row = result.fetchone()

        total_cost = float(row.total_cost or 0)
        total_revenue = float(row.total_revenue or 0)
        total_leads = int(row.total_leads or 0)
        converted_leads = int(row.converted_leads or 0)

        # Calculate metrics
        roas = total_revenue / total_cost if total_cost > 0 else 0
        profit = total_revenue - total_cost
        conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
        cac = total_cost / converted_leads if converted_leads > 0 else 0

        return {
            "roas": roas,
            "profit": profit,
            "revenue": total_revenue,
            "spend": total_cost,
            "conversion_rate": conversion_rate,
            "cac": cac,
            "leads": total_leads,
            "conversions": converted_leads
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")