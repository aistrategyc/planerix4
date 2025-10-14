"""
Marketing Analytics v6 - Using new v6_* materialized views from dashboards schema
Replaces old dm.* schema tables that no longer exist
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date
from typing import Optional, Any
from liderix_api.db import get_itstep_session

router = APIRouter(tags=["Analytics - Marketing v6"])


def parse_date(date_str: str) -> date:
    """Convert string date 'YYYY-MM-DD' to date object for asyncpg"""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


@router.get("/campaigns")
async def get_campaigns(
    date_from: str = Query(...),
    date_to: str = Query(...),
    platform: Optional[str] = Query(None),
    campaign_key: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get campaign performance using v6_campaign_roi_daily"""
    try:
        date_from_obj = parse_date(date_from)
        date_to_obj = parse_date(date_to)

        # Build platform filter
        platform_filter = ""
        if platform:
            platform_filter = "AND platform = :platform"

        query = text(f"""
            SELECT
                platform,
                campaign_id,
                campaign_name,
                SUM(spend) as cost,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(leads) as leads,
                SUM(contracts) as contracts,
                SUM(revenue) as revenue,
                ROUND(AVG(ctr), 2) as ctr,
                ROUND(AVG(cpc), 2) as cpc,
                ROUND(AVG(cpl), 2) as cpl,
                ROUND(AVG(cpa), 2) as cpa,
                ROUND(AVG(cvr), 2) as cvr,
                MIN(date) as first_date,
                MAX(date) as last_date
            FROM dashboards.v6_campaign_roi_daily
            WHERE date >= :date_from AND date <= :date_to
            {platform_filter}
            GROUP BY platform, campaign_id, campaign_name
            ORDER BY cost DESC NULLS LAST
            LIMIT 100
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        }
        if platform:
            params["platform"] = platform

        result = await db.execute(query, params)
        rows = result.fetchall()

        campaigns = []
        for row in rows:
            campaigns.append({
                "platform": row.platform,
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name,
                "cost": float(row.cost or 0),
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpl": float(row.cpl or 0),
                "cpa": float(row.cpa or 0),
                "cvr": float(row.cvr or 0),
                "first_date": str(row.first_date),
                "last_date": str(row.last_date)
            })

        return {
            "campaigns": campaigns,
            "total_campaigns": len(campaigns)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/creatives")
async def get_creatives(
    date_from: str = Query(...),
    date_to: str = Query(...),
    platform: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get creative performance using v6_creative_performance"""
    try:
        search_filter = ""
        if search:
            search_filter = "AND (title ILIKE :search OR body ILIKE :search)"

        query = text(f"""
            SELECT
                creative_id,
                title,
                body,
                cta_type,
                link_url,
                total_spend,
                total_impressions,
                total_clicks,
                leads,
                contracts,
                revenue,
                cpl,
                cpa,
                ctr,
                click_to_lead_rate,
                cvr,
                roi_pct,
                first_seen_date,
                last_seen_date,
                days_active,
                performance_status
            FROM dashboards.v6_creative_performance
            WHERE first_seen_date >= :date_from::date OR last_seen_date <= :date_to::date
            {search_filter}
            ORDER BY total_spend DESC NULLS LAST
            LIMIT 100
        """)

        params = {
            "date_from": date_from,
            "date_to": date_to
        }
        if search:
            params["search"] = f"%{search}%"

        result = await db.execute(query, params)
        rows = result.fetchall()

        creatives = []
        for row in rows:
            creatives.append({
                "creative_id": row.creative_id,
                "title": row.title,
                "body": row.body,
                "cta_type": row.cta_type,
                "link_url": row.link_url,
                "total_spend": float(row.total_spend or 0),
                "total_impressions": int(row.total_impressions or 0),
                "total_clicks": int(row.total_clicks or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "cpl": float(row.cpl or 0),
                "cpa": float(row.cpa or 0),
                "ctr": float(row.ctr or 0),
                "click_to_lead_rate": float(row.click_to_lead_rate or 0),
                "cvr": float(row.cvr or 0),
                "roi_pct": float(row.roi_pct or 0),
                "first_seen_date": str(row.first_seen_date),
                "last_seen_date": str(row.last_seen_date),
                "days_active": int(row.days_active or 0),
                "performance_status": row.performance_status
            })

        return {
            "creatives": creatives,
            "total_creatives": len(creatives)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/channels-sources")
async def get_channels_sources(
    date_from: str = Query(...),
    date_to: str = Query(...),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get channel and source performance using fact_leads"""
    try:
        date_from_obj = parse_date(date_from)
        date_to_obj = parse_date(date_to)

        platform_filter = ""
        if platform:
            platform_filter = "AND dominant_platform = :platform"

        query = text(f"""
            SELECT
                dominant_platform as platform,
                utm_source as source,
                COUNT(*) as leads,
                COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
                SUM(COALESCE(contract_amount, 0)) as revenue,
                ROUND(100.0 * COUNT(CASE WHEN contract_amount > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 2) as conversion_rate
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
            {platform_filter}
            GROUP BY dominant_platform, utm_source
            ORDER BY leads DESC
            LIMIT 100
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        }
        if platform:
            params["platform"] = platform

        result = await db.execute(query, params)
        rows = result.fetchall()

        channels = []
        for row in rows:
            channels.append({
                "platform": row.platform,
                "source": row.source,
                "leads": int(row.leads),
                "contracts": int(row.contracts),
                "revenue": float(row.revenue or 0),
                "conversion_rate": float(row.conversion_rate or 0)
            })

        return {
            "channels": channels,
            "total_channels": len(channels)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/crm-outcomes")
async def get_crm_outcomes(
    date_from: str = Query(...),
    date_to: str = Query(...),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get CRM outcomes and funnel using fact_leads"""
    try:
        date_from_obj = parse_date(date_from)
        date_to_obj = parse_date(date_to)

        platform_filter = ""
        if platform:
            platform_filter = "AND dominant_platform = :platform"

        # Overall metrics
        overview_query = text(f"""
            SELECT
                COUNT(*) as total_leads,
                COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as total_contracts,
                SUM(COALESCE(contract_amount, 0)) as total_revenue,
                ROUND(100.0 * COUNT(CASE WHEN contract_amount > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 2) as conversion_rate
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
            {platform_filter}
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        }
        if platform:
            params["platform"] = platform

        result = await db.execute(overview_query, params)
        overview = result.fetchone()

        # By platform breakdown
        platform_query = text(f"""
            SELECT
                dominant_platform as platform,
                utm_source,
                COUNT(*) as leads,
                COUNT(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
                SUM(COALESCE(contract_amount, 0)) as revenue,
                ROUND(100.0 * COUNT(CASE WHEN contract_amount > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 2) as conversion_rate
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
            {platform_filter}
            GROUP BY dominant_platform, utm_source
            ORDER BY leads DESC
            LIMIT 20
        """)

        result = await db.execute(platform_query, params)
        platforms = result.fetchall()

        platform_data = []
        for row in platforms:
            platform_data.append({
                "platform": row.platform,
                "utm_source": row.utm_source,
                "leads": int(row.leads),
                "contracts": int(row.contracts),
                "revenue": float(row.revenue or 0),
                "conversion_rate": float(row.conversion_rate or 0)
            })

        return {
            "overview": {
                "total_leads": int(overview.total_leads),
                "total_contracts": int(overview.total_contracts),
                "total_revenue": float(overview.total_revenue or 0),
                "conversion_rate": float(overview.conversion_rate or 0)
            },
            "by_platform": platform_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/attribution-funnel")
async def get_attribution_funnel(
    date_from: str = Query(...),
    date_to: str = Query(...),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get attribution funnel using v6_funnel_daily"""
    try:
        date_from_obj = parse_date(date_from)
        date_to_obj = parse_date(date_to)

        platform_filter = ""
        if platform:
            platform_filter = "AND platform = :platform"

        query = text(f"""
            SELECT
                platform,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(leads) as leads,
                SUM(contracts) as contracts,
                SUM(revenue) as revenue,
                ROUND(AVG(ctr), 2) as ctr,
                ROUND(AVG(click_to_lead_rate), 2) as click_to_lead_rate,
                ROUND(AVG(lead_to_contract_rate), 2) as lead_to_contract_rate,
                ROUND(AVG(click_to_contract_rate), 2) as click_to_contract_rate
            FROM dashboards.v6_funnel_daily
            WHERE date >= :date_from AND date <= :date_to
            {platform_filter}
            GROUP BY platform
            ORDER BY impressions DESC
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        }
        if platform:
            params["platform"] = platform

        result = await db.execute(query, params)
        rows = result.fetchall()

        funnel_data = []
        for row in rows:
            funnel_data.append({
                "platform": row.platform,
                "impressions": int(row.impressions or 0),
                "clicks": int(row.clicks or 0),
                "leads": int(row.leads or 0),
                "contracts": int(row.contracts or 0),
                "revenue": float(row.revenue or 0),
                "ctr": float(row.ctr or 0),
                "click_to_lead_rate": float(row.click_to_lead_rate or 0),
                "lead_to_contract_rate": float(row.lead_to_contract_rate or 0),
                "click_to_contract_rate": float(row.click_to_contract_rate or 0)
            })

        return {
            "funnel": funnel_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/product-performance")
async def get_product_performance(
    date_from: str = Query(...),
    date_to: str = Query(...),
    platform: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get product performance using v6_product_performance"""
    try:
        date_from_obj = parse_date(date_from)
        date_to_obj = parse_date(date_to)

        query = text("""
            SELECT
                product_name,
                branch_name,
                COUNT(*) as leads,
                SUM(CASE WHEN contract_amount > 0 THEN 1 END) as contracts,
                SUM(COALESCE(contract_amount, 0)) as revenue,
                ROUND(AVG(contract_amount), 2) as avg_contract_value,
                ROUND(100.0 * SUM(CASE WHEN contract_amount > 0 THEN 1 END) / NULLIF(COUNT(*), 0), 2) as conversion_rate
            FROM dashboards.fact_leads
            WHERE created_date_txt::date >= :date_from
              AND created_date_txt::date <= :date_to
              AND product_name IS NOT NULL
            GROUP BY product_name, branch_name
            ORDER BY revenue DESC NULLS LAST
            LIMIT 50
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        }

        result = await db.execute(query, params)
        rows = result.fetchall()

        products = []
        for row in rows:
            products.append({
                "product_name": row.product_name,
                "branch_name": row.branch_name,
                "leads": int(row.leads),
                "contracts": int(row.contracts),
                "revenue": float(row.revenue or 0),
                "avg_contract_value": float(row.avg_contract_value or 0),
                "conversion_rate": float(row.conversion_rate or 0)
            })

        return {
            "products": products,
            "total_products": len(products)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/data-quality")
async def get_data_quality(
    date_from: str = Query(...),
    date_to: str = Query(...),
    db: AsyncSession = Depends(get_itstep_session)
):
    """Get data quality metrics using v6_attribution_coverage"""
    try:
        date_from_obj = parse_date(date_from)
        date_to_obj = parse_date(date_to)

        # Attribution coverage over time
        coverage_query = text("""
            SELECT
                date,
                total_leads,
                total_contracts,
                with_meta_campaign,
                with_google_campaign,
                with_utm,
                pct_with_creative,
                pct_contracts_with_creative,
                pct_contracts_with_campaign
            FROM dashboards.v6_attribution_coverage
            WHERE date >= :date_from AND date <= :date_to
            ORDER BY date DESC
        """)

        params = {
            "date_from": date_from_obj,
            "date_to": date_to_obj
        }

        result = await db.execute(coverage_query, params)
        coverage_rows = result.fetchall()

        daily_coverage = []
        for row in coverage_rows:
            daily_coverage.append({
                "date": str(row.date),
                "total_leads": int(row.total_leads),
                "total_contracts": int(row.total_contracts),
                "with_meta_campaign": int(row.with_meta_campaign),
                "with_google_campaign": int(row.with_google_campaign),
                "with_utm": int(row.with_utm),
                "pct_with_creative": float(row.pct_with_creative or 0),
                "pct_contracts_with_creative": float(row.pct_contracts_with_creative or 0),
                "pct_contracts_with_campaign": float(row.pct_contracts_with_campaign or 0)
            })

        # Overall summary
        summary_query = text("""
            SELECT
                SUM(total_leads) as total_leads,
                SUM(total_contracts) as total_contracts,
                SUM(with_meta_campaign) as with_meta,
                SUM(with_google_campaign) as with_google,
                SUM(with_utm) as with_utm,
                ROUND(AVG(pct_with_creative), 2) as avg_creative_coverage,
                ROUND(AVG(pct_contracts_with_campaign), 2) as avg_campaign_coverage
            FROM dashboards.v6_attribution_coverage
            WHERE date >= :date_from AND date <= :date_to
        """)

        result = await db.execute(summary_query, params)
        summary = result.fetchone()

        # Calculate quality score
        avg_coverage = (summary.avg_creative_coverage + summary.avg_campaign_coverage) / 2
        quality_score = min(100, max(0, avg_coverage))

        return {
            "quality_score": float(quality_score),
            "summary": {
                "total_leads": int(summary.total_leads),
                "total_contracts": int(summary.total_contracts),
                "with_meta": int(summary.with_meta),
                "with_google": int(summary.with_google),
                "with_utm": int(summary.with_utm),
                "avg_creative_coverage": float(summary.avg_creative_coverage or 0),
                "avg_campaign_coverage": float(summary.avg_campaign_coverage or 0)
            },
            "daily": daily_coverage
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
