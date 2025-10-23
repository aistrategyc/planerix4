"""
V9 Analytics API Endpoints
Uses V9 views with enhanced attribution, contract tracking, and Facebook creatives
Date: October 22, 2025
Author: Claude Code Assistant
"""
import logging
from typing import List, Optional, Any, Dict
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from liderix_api.db import get_itstep_session
from liderix_api.services.dependencies import get_current_user
from liderix_api.models.users import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v9", tags=["V9 Analytics"])


# ============================================================================
# CAMPAIGN PERFORMANCE ENDPOINTS
# ============================================================================

@router.get("/campaigns/performance")
async def get_campaign_performance(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    platform: Optional[str] = Query(default=None, description="facebook or google"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get full funnel campaign performance: Spend → Clicks → Leads → Contracts → Revenue → ROAS

    View: stg.v9_campaign_performance_with_contracts
    """
    try:
        query_text = """
            SELECT
                platform,
                campaign_name,
                total_spend,
                total_clicks,
                leads,
                contracts,
                revenue,
                cpl,
                cpa,
                roas,
                conversion_rate
            FROM stg.v9_campaign_performance_with_contracts
            WHERE 1=1
        """

        params = {}

        if platform:
            query_text += " AND LOWER(platform) = LOWER(:platform)"
            params["platform"] = platform

        query_text += " ORDER BY total_spend DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "campaign_name": row.campaign_name,
                "total_spend": float(row.total_spend) if row.total_spend else 0.0,
                "total_clicks": int(row.total_clicks) if row.total_clicks else 0,
                "leads": int(row.leads) if row.leads else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "cpl": float(row.cpl) if row.cpl else None,
                "cpa": float(row.cpa) if row.cpa else None,
                "roas": float(row.roas) if row.roas else None,
                "conversion_rate": float(row.conversion_rate) if row.conversion_rate else None,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching campaign performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaign performance: {str(e)}")


@router.get("/campaigns/summary")
async def get_campaigns_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get campaign summary from v9_campaign_summary view

    Returns: Campaign-level aggregations with spend, leads, contracts
    """
    try:
        query_text = """
            SELECT
                campaign_name,
                platform,
                total_leads,
                total_contracts,
                total_revenue,
                avg_contract_value,
                conversion_rate,
                first_lead_date,
                last_lead_date
            FROM stg.v9_campaign_summary
            ORDER BY total_leads DESC
            LIMIT 100
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        return [
            {
                "campaign_name": row.campaign_name,
                "platform": row.platform,
                "total_leads": int(row.total_leads),
                "total_contracts": int(row.total_contracts),
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "conversion_rate": float(row.conversion_rate) if row.conversion_rate else 0.0,
                "first_lead_date": str(row.first_lead_date) if row.first_lead_date else None,
                "last_lead_date": str(row.last_lead_date) if row.last_lead_date else None,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching campaigns summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONTRACT ATTRIBUTION ENDPOINTS
# ============================================================================

@router.get("/contracts/attribution")
async def get_contracts_attribution(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    attribution_level: Optional[str] = Query(default=None, description="campaign_match, utm_attribution, utm_source_only, platform_inferred, unattributed"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get contracts with multi-level attribution

    View: stg.v9_contracts_with_full_attribution
    """
    try:
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                contract_source_id,
                client_id,
                contract_date,
                contract_amount,
                lead_day,
                days_to_contract,
                dominant_platform,
                unified_platform,
                unified_campaign_name,
                attribution_level,
                campaign_name,
                ad_name,
                utm_source,
                utm_campaign
            FROM stg.v9_contracts_with_full_attribution
            WHERE contract_date >= :start_date AND contract_date <= :end_date
        """

        params = {"start_date": start_date, "end_date": end_date}

        if attribution_level:
            query_text += " AND attribution_level = :attribution_level"
            params["attribution_level"] = attribution_level

        query_text += " ORDER BY contract_date DESC, contract_amount DESC"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "contract_source_id": int(row.contract_source_id),
                "client_id": int(row.client_id),
                "contract_date": str(row.contract_date),
                "contract_amount": float(row.contract_amount),
                "lead_day": str(row.lead_day) if row.lead_day else None,
                "days_to_contract": int(row.days_to_contract) if row.days_to_contract else None,
                "dominant_platform": row.dominant_platform,
                "unified_platform": row.unified_platform,
                "unified_campaign_name": row.unified_campaign_name,
                "attribution_level": row.attribution_level,
                "campaign_name": row.campaign_name,
                "ad_name": row.ad_name,
                "utm_source": row.utm_source,
                "utm_campaign": row.utm_campaign,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching contracts attribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contracts/attribution-summary")
async def get_contracts_attribution_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get summary of contract attribution by level

    View: stg.v9_contracts_attribution_summary
    """
    try:
        query_text = """
            SELECT
                attribution_level,
                contracts,
                revenue,
                avg_contract_value,
                avg_days_to_close,
                percent_of_total,
                percent_of_revenue
            FROM stg.v9_contracts_attribution_summary
            ORDER BY contracts DESC
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        return [
            {
                "attribution_level": row.attribution_level,
                "contracts": int(row.contracts),
                "revenue": float(row.revenue),
                "avg_contract_value": float(row.avg_contract_value),
                "avg_days_to_close": float(row.avg_days_to_close),
                "percent_of_total": float(row.percent_of_total),
                "percent_of_revenue": float(row.percent_of_revenue),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching attribution summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contracts/by-campaign")
async def get_contracts_by_campaign(
    platform: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get contracts grouped by campaign

    View: stg.v9_contracts_by_campaign
    """
    try:
        query_text = """
            SELECT
                unified_platform,
                unified_campaign_name,
                attribution_level,
                contracts,
                revenue,
                avg_contract_value,
                avg_days_to_close,
                first_contract,
                last_contract
            FROM stg.v9_contracts_by_campaign
            WHERE 1=1
        """

        params = {}

        if platform:
            query_text += " AND LOWER(unified_platform) = LOWER(:platform)"
            params["platform"] = platform

        query_text += " ORDER BY revenue DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "platform": row.unified_platform,
                "campaign_name": row.unified_campaign_name,
                "attribution_level": row.attribution_level,
                "contracts": int(row.contracts),
                "revenue": float(row.revenue),
                "avg_contract_value": float(row.avg_contract_value),
                "avg_days_to_close": float(row.avg_days_to_close) if row.avg_days_to_close else None,
                "first_contract": str(row.first_contract),
                "last_contract": str(row.last_contract),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching contracts by campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FACEBOOK CREATIVES ENDPOINTS
# ============================================================================

@router.get("/facebook/creatives")
async def get_facebook_creatives(
    campaign_name: Optional[str] = Query(default=None),
    with_performance: bool = Query(default=True, description="Include performance metrics"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get Facebook ad creatives with full details (images, texts, CTAs, URLs)

    View: stg.v9_facebook_ad_creatives_full or stg.v9_facebook_creatives_performance
    """
    try:
        if with_performance:
            query_text = """
                SELECT
                    ad_id,
                    ad_name,
                    ad_creative_id,
                    creative_name,
                    campaign_name,
                    adset_name,
                    title,
                    body,
                    media_image_src,
                    cta_type,
                    object_type,
                    spend,
                    impressions,
                    clicks,
                    leads,
                    contracts,
                    revenue,
                    cpc,
                    cpl,
                    cpa,
                    roas,
                    ctr,
                    first_date,
                    last_date
                FROM stg.v9_facebook_creatives_performance
                WHERE 1=1
            """
        else:
            query_text = """
                SELECT
                    ad_id,
                    ad_name,
                    ad_creative_id,
                    creative_name,
                    campaign_name,
                    adset_name,
                    title,
                    body,
                    description,
                    media_image_src,
                    thumbnail_url,
                    video_id,
                    link_url,
                    permalink_url,
                    cta_type,
                    cta_link,
                    object_type
                FROM stg.v9_facebook_ad_creatives_full
                WHERE 1=1
            """

        params = {}

        if campaign_name:
            query_text += " AND campaign_name ILIKE :campaign_name"
            params["campaign_name"] = f"%{campaign_name}%"

        query_text += " LIMIT 500"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        if with_performance:
            return [
                {
                    "ad_id": row.ad_id,
                    "ad_name": row.ad_name,
                    "ad_creative_id": row.ad_creative_id,
                    "creative_name": row.creative_name,
                    "campaign_name": row.campaign_name,
                    "adset_name": row.adset_name,
                    "title": row.title,
                    "body": row.body,
                    "media_image_src": row.media_image_src,
                    "cta_type": row.cta_type,
                    "object_type": row.object_type,
                    "spend": float(row.spend) if row.spend else 0.0,
                    "impressions": int(row.impressions) if row.impressions else 0,
                    "clicks": int(row.clicks) if row.clicks else 0,
                    "leads": int(row.leads) if row.leads else 0,
                    "contracts": int(row.contracts) if row.contracts else 0,
                    "revenue": float(row.revenue) if row.revenue else 0.0,
                    "cpc": float(row.cpc) if row.cpc else None,
                    "cpl": float(row.cpl) if row.cpl else None,
                    "cpa": float(row.cpa) if row.cpa else None,
                    "roas": float(row.roas) if row.roas else None,
                    "ctr": float(row.ctr) if row.ctr else None,
                    "first_date": str(row.first_date) if row.first_date else None,
                    "last_date": str(row.last_date) if row.last_date else None,
                }
                for row in rows
            ]
        else:
            return [
                {
                    "ad_id": row.ad_id,
                    "ad_name": row.ad_name,
                    "ad_creative_id": row.ad_creative_id,
                    "creative_name": row.creative_name,
                    "campaign_name": row.campaign_name,
                    "adset_name": row.adset_name,
                    "title": row.title,
                    "body": row.body,
                    "description": row.description,
                    "media_image_src": row.media_image_src,
                    "thumbnail_url": row.thumbnail_url,
                    "video_id": row.video_id,
                    "link_url": row.link_url,
                    "permalink_url": row.permalink_url,
                    "cta_type": row.cta_type,
                    "cta_link": row.cta_link,
                    "object_type": row.object_type,
                }
                for row in rows
            ]

    except Exception as e:
        logger.error(f"Error fetching Facebook creatives: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/facebook/creative-types")
async def get_facebook_creative_types(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get performance analysis by creative type (image, video, carousel, etc.)

    View: stg.v9_facebook_creative_types_analysis
    """
    try:
        query_text = """
            SELECT
                object_type,
                unique_creatives,
                ads_using_type,
                campaigns_using_type,
                total_spend,
                total_impressions,
                total_clicks,
                total_leads,
                total_contracts,
                total_revenue,
                avg_spend_per_creative,
                avg_cpl,
                avg_roas,
                avg_ctr,
                avg_conversion_rate
            FROM stg.v9_facebook_creative_types_analysis
            ORDER BY total_spend DESC NULLS LAST
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        return [
            {
                "object_type": row.object_type,
                "unique_creatives": int(row.unique_creatives),
                "ads_using_type": int(row.ads_using_type),
                "campaigns_using_type": int(row.campaigns_using_type),
                "total_spend": float(row.total_spend) if row.total_spend else 0.0,
                "total_impressions": int(row.total_impressions) if row.total_impressions else 0,
                "total_clicks": int(row.total_clicks) if row.total_clicks else 0,
                "total_leads": int(row.total_leads) if row.total_leads else 0,
                "total_contracts": int(row.total_contracts) if row.total_contracts else 0,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_spend_per_creative": float(row.avg_spend_per_creative) if row.avg_spend_per_creative else None,
                "avg_cpl": float(row.avg_cpl) if row.avg_cpl else None,
                "avg_roas": float(row.avg_roas) if row.avg_roas else None,
                "avg_ctr": float(row.avg_ctr) if row.avg_ctr else None,
                "avg_conversion_rate": float(row.avg_conversion_rate) if row.avg_conversion_rate else None,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching creative types: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/facebook/top-creatives")
async def get_top_facebook_creatives(
    limit: int = Query(default=20, le=100),
    order_by: str = Query(default="revenue", description="revenue, roas, contracts"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get top performing Facebook creatives

    View: stg.v9_facebook_top_creatives_by_revenue
    """
    try:
        order_column = {
            "revenue": "revenue DESC",
            "roas": "roas DESC",
            "contracts": "contracts DESC"
        }.get(order_by, "revenue DESC")

        query_text = f"""
            SELECT
                ad_id,
                ad_name,
                ad_creative_id,
                creative_name,
                campaign_name,
                title,
                body_preview,
                media_image_src,
                cta_type,
                spend,
                leads,
                contracts,
                revenue,
                roas,
                cpl,
                cpa,
                revenue_rank,
                roas_rank,
                contracts_rank
            FROM stg.v9_facebook_top_creatives_by_revenue
            ORDER BY {order_column} NULLS LAST
            LIMIT :limit
        """

        result = await session.execute(text(query_text), {"limit": limit})
        rows = result.fetchall()

        return [
            {
                "ad_id": row.ad_id,
                "ad_name": row.ad_name,
                "ad_creative_id": row.ad_creative_id,
                "creative_name": row.creative_name,
                "campaign_name": row.campaign_name,
                "title": row.title,
                "body_preview": row.body_preview,
                "media_image_src": row.media_image_src,
                "cta_type": row.cta_type,
                "spend": float(row.spend) if row.spend else 0.0,
                "leads": int(row.leads) if row.leads else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue),
                "roas": float(row.roas) if row.roas else None,
                "cpl": float(row.cpl) if row.cpl else None,
                "cpa": float(row.cpa) if row.cpa else None,
                "revenue_rank": int(row.revenue_rank),
                "roas_rank": int(row.roas_rank),
                "contracts_rank": int(row.contracts_rank),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching top creatives: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PLATFORM & FUNNEL ENDPOINTS
# ============================================================================

@router.get("/platforms/daily")
async def get_platforms_daily(
    start_date: date = Query(default=None),
    end_date: date = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get daily platform performance

    View: stg.v9_platform_daily_overview
    """
    try:
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                dt,
                platform,
                leads,
                contracts,
                revenue,
                conversion_rate
            FROM stg.v9_platform_daily_overview
            WHERE dt >= :start_date AND dt <= :end_date
            ORDER BY dt DESC, leads DESC
        """

        result = await session.execute(text(query_text), {"start_date": start_date, "end_date": end_date})
        rows = result.fetchall()

        return [
            {
                "dt": str(row.dt),
                "platform": row.platform,
                "leads": int(row.leads),
                "contracts": int(row.contracts),
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "conversion_rate": float(row.conversion_rate) if row.conversion_rate else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching platforms daily: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel/complete")
async def get_marketing_funnel(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> Dict[str, Any]:
    """
    Get complete marketing funnel metrics - aggregated by platform (all dates)

    View: stg.v9_marketing_funnel_complete (aggregated)
    """
    try:
        query_text = """
            SELECT
                platform,
                SUM(leads) as total_leads,
                SUM(contracts) as total_contracts,
                SUM(revenue) as total_revenue,
                ROUND(SUM(revenue) / NULLIF(SUM(contracts), 0), 2) as avg_contract_value,
                ROUND(100.0 * SUM(contracts) / NULLIF(SUM(leads), 0), 2) as conversion_rate
            FROM stg.v9_marketing_funnel_complete
            GROUP BY platform
            ORDER BY total_contracts DESC NULLS LAST
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        # Calculate avg_days_to_contract from fact_leads (by platform)
        days_query = """
            SELECT
                fl.dominant_platform as platform,
                ROUND(AVG(fc.days_to_contract), 2) as avg_days
            FROM stg.fact_leads fl
            JOIN stg.fact_contracts fc ON fl.sk_lead = fc.sk_lead
            WHERE fc.days_to_contract IS NOT NULL
            GROUP BY fl.dominant_platform
        """
        days_result = await session.execute(text(days_query))
        days_map = {row.platform: float(row.avg_days) for row in days_result.fetchall()}

        return {
            "platforms": [
                {
                    "platform": row.platform,
                    "total_leads": int(row.total_leads) if row.total_leads else 0,
                    "total_contracts": int(row.total_contracts) if row.total_contracts else 0,
                    "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                    "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                    "conversion_rate": float(row.conversion_rate) if row.conversion_rate else 0.0,
                    "avg_days_to_contract": days_map.get(row.platform, None),
                }
                for row in rows
            ]
        }

    except Exception as e:
        logger.error(f"Error fetching marketing funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONTRACTS ENRICHED (FOR FRONTEND PAGES)
# ============================================================================

@router.get("/contracts/enriched")
async def get_contracts_enriched(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    platform: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get enriched contract data with FULL campaign and creative details

    Uses fact_contracts (has most fields) + JOIN with Facebook creatives for images
    """
    try:
        query_text = """
            SELECT
                fc.contract_source_id as sk_contract,
                fc.lead_source_id as sk_lead,
                fc.contract_date,
                COALESCE(fc.dominant_platform, fc.matched_platform, 'unknown') as platform,
                fc.campaign_id,
                COALESCE(fc.campaign_name, '—') as campaign_name,
                fc.ad_id,
                COALESCE(fc.ad_name, '') as ad_name,
                fb_cr.ad_creative_id,
                fb_cr.title as creative_title,
                fb_cr.body as creative_body,
                fb_cr.creative_name,
                COALESCE(fb_cr.media_image_src, fb_cr.thumbnail_url) as media_image_src,
                CAST(NULL AS TEXT) as event_name,
                COALESCE(fc.utm_source, '') as traffic_source,
                fc.contract_amount as revenue,
                CAST(NULL AS TEXT) as product_name
            FROM stg.fact_contracts fc
            LEFT JOIN stg.v9_facebook_ad_creatives_full fb_cr
                ON fc.ad_id = fb_cr.ad_id
            WHERE fc.contract_date >= '2025-09-01'
        """

        params = {}
        if start_date:
            query_text += " AND fc.contract_day >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query_text += " AND fc.contract_day <= :end_date"
            params["end_date"] = end_date
        if platform:
            query_text += " AND (LOWER(fc.dominant_platform) = LOWER(:platform) OR LOWER(fc.matched_platform) = LOWER(:platform))"
            params["platform"] = platform

        query_text += " ORDER BY fc.contract_date DESC LIMIT 500"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "sk_contract": str(row.sk_contract) if row.sk_contract else "",
                "sk_lead": str(row.sk_lead) if row.sk_lead else "",
                "contract_date": str(row.contract_date.date()) if row.contract_date else None,
                "platform": row.platform,
                "campaign_id": row.campaign_id if row.campaign_id else "",
                "campaign_name": row.campaign_name,
                "ad_id": row.ad_id if row.ad_id else "",
                "ad_name": row.ad_name,
                "ad_creative_id": row.ad_creative_id if row.ad_creative_id else None,
                "creative_title": row.creative_title if row.creative_title else None,
                "creative_body": row.creative_body if row.creative_body else None,
                "creative_name": row.creative_name if row.creative_name else None,
                "media_image_src": row.media_image_src if row.media_image_src else None,
                "event_name": row.event_name,
                "traffic_source": row.traffic_source,
                "revenue": float(row.revenue) if row.revenue else 0,
                "product_name": row.product_name,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching enriched contracts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PLATFORM COMPARISON (WEEKLY AGGREGATES)
# ============================================================================

@router.get("/platforms/comparison")
async def get_platform_comparison(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get platform performance comparison by week

    View: stg.v9_platform_weekly_trends
    """
    try:
        query_text = """
            SELECT
                week_start,
                platform,
                leads,
                contracts,
                revenue,
                avg_conversion_rate as conversion_rate,
                revenue / NULLIF(contracts, 0) as avg_contract_value
            FROM stg.v9_platform_weekly_trends
            WHERE 1=1
        """

        params = {}
        if start_date:
            query_text += " AND week_start >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query_text += " AND week_start <= :end_date"
            params["end_date"] = end_date

        query_text += " ORDER BY week_start DESC, platform"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "period_start": str(row.week_start) if row.week_start else None,
                "platform": row.platform,
                "leads": int(row.leads) if row.leads else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0,
                "conversion_rate": float(row.conversion_rate) if row.conversion_rate else 0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching platform comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# FACEBOOK & GOOGLE WEEKLY PERFORMANCE
# ============================================================================

@router.get("/facebook/weekly")
async def get_facebook_weekly(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    campaign_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get Facebook weekly performance metrics

    View: stg.v9_facebook_performance_daily (aggregated by week)
    """
    try:
        query_text = """
            SELECT
                DATE_TRUNC('week', dt)::date as week_start,
                campaign_id,
                campaign_name,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(spend) as spend,
                SUM(crm_leads_7d) as conversions,
                SUM(contracts) as contracts,
                SUM(revenue) as revenue,
                AVG(ctr) as ctr,
                AVG(cpc) as cpc,
                AVG(cpl) as cpl,
                AVG(roas) as roas
            FROM stg.v9_facebook_performance_daily
            WHERE 1=1
        """

        params = {}
        if start_date:
            query_text += " AND dt >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query_text += " AND dt <= :end_date"
            params["end_date"] = end_date
        if campaign_id:
            query_text += " AND campaign_id = :campaign_id"
            params["campaign_id"] = campaign_id

        query_text += """
            GROUP BY DATE_TRUNC('week', dt), campaign_id, campaign_name
            ORDER BY week_start DESC
        """

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "week_start": str(row.week_start) if row.week_start else None,
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name,
                "impressions": int(row.impressions) if row.impressions else 0,
                "clicks": int(row.clicks) if row.clicks else 0,
                "spend": float(row.spend) if row.spend else 0,
                "conversions": int(row.conversions) if row.conversions else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0,
                "ctr": float(row.ctr) if row.ctr else 0,
                "cpc": float(row.cpc) if row.cpc else 0,
                "cpl": float(row.cpl) if row.cpl else 0,
                "roas": float(row.roas) if row.roas else 0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching Facebook weekly performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/google/weekly")
async def get_google_weekly(
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    campaign_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get Google Ads weekly performance metrics

    View: stg.v9_google_performance_daily (aggregated by week)
    """
    try:
        query_text = """
            SELECT
                DATE_TRUNC('week', dt)::date as week_start,
                campaign_id,
                campaign_name,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(spend) as spend,
                SUM(crm_leads_7d) as conversions,
                SUM(contracts) as contracts,
                SUM(revenue) as revenue,
                AVG(ctr) as ctr,
                AVG(cpc) as cpc,
                AVG(cpl) as cpl,
                AVG(roas) as roas
            FROM stg.v9_google_performance_daily
            WHERE 1=1
        """

        params = {}
        if start_date:
            query_text += " AND dt >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query_text += " AND dt <= :end_date"
            params["end_date"] = end_date
        if campaign_id:
            query_text += " AND campaign_id = :campaign_id"
            params["campaign_id"] = campaign_id

        query_text += """
            GROUP BY DATE_TRUNC('week', dt), campaign_id, campaign_name
            ORDER BY week_start DESC
        """

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "week_start": str(row.week_start) if row.week_start else None,
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name,
                "impressions": int(row.impressions) if row.impressions else 0,
                "clicks": int(row.clicks) if row.clicks else 0,
                "spend": float(row.spend) if row.spend else 0,
                "conversions": int(row.conversions) if row.conversions else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0,
                "ctr": float(row.ctr) if row.ctr else 0,
                "cpc": float(row.cpc) if row.cpc else 0,
                "cpl": float(row.cpl) if row.cpl else 0,
                "roas": float(row.roas) if row.roas else 0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching Google weekly performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ATTRIBUTION QUALITY
# ============================================================================

@router.get("/attribution/quality")
async def get_attribution_quality(
    platform: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
) -> List[Dict[str, Any]]:
    """
    Get attribution quality scores by platform

    View: stg.v9_attribution_quality_score
    """
    try:
        query_text = """
            SELECT
                platform,
                attribution_level,
                contracts as total_contracts,
                contracts as contracts_with_campaign,
                campaign_name_coverage_pct as campaign_match_rate,
                (utm_source_coverage_pct + utm_campaign_coverage_pct + utm_medium_coverage_pct) / 3 as utm_coverage,
                overall_quality_score as attribution_quality_score,
                revenue,
                avg_days_to_close
            FROM stg.v9_attribution_quality_score
            WHERE 1=1
        """

        params = {}
        if platform:
            query_text += " AND LOWER(platform) = LOWER(:platform)"
            params["platform"] = platform

        query_text += " ORDER BY overall_quality_score DESC"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "attribution_level": row.attribution_level,
                "total_contracts": int(row.total_contracts) if row.total_contracts else 0,
                "contracts_with_campaign": int(row.contracts_with_campaign) if row.contracts_with_campaign else 0,
                "campaign_match_rate": float(row.campaign_match_rate) if row.campaign_match_rate else 0,
                "utm_coverage": float(row.utm_coverage) if row.utm_coverage else 0,
                "attribution_quality_score": float(row.attribution_quality_score) if row.attribution_quality_score else 0,
                "revenue": float(row.revenue) if row.revenue else 0,
                "avg_days_to_close": float(row.avg_days_to_close) if row.avg_days_to_close else 0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching attribution quality: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def v9_health_check(
    session: AsyncSession = Depends(get_itstep_session),
) -> Dict[str, Any]:
    """
    Health check for V9 analytics system

    Returns: System status, view counts, data freshness
    """
    try:
        # Check view count
        view_count_query = """
            SELECT COUNT(*) as view_count
            FROM information_schema.views
            WHERE table_schema = 'stg' AND table_name LIKE 'v9_%'
        """
        view_count_result = await session.execute(text(view_count_query))
        view_count = view_count_result.fetchone().view_count

        # Check data freshness
        freshness_query = """
            SELECT
                MAX(lead_day) as last_lead_date,
                MAX(contract_day) as last_contract_date
            FROM stg.fact_leads fl
            FULL OUTER JOIN stg.fact_contracts fc ON 1=1
        """
        freshness_result = await session.execute(text(freshness_query))
        freshness = freshness_result.fetchone()

        # Check record counts
        counts_query = """
            SELECT
                (SELECT COUNT(*) FROM stg.fact_leads) as leads_count,
                (SELECT COUNT(*) FROM stg.fact_contracts) as contracts_count,
                (SELECT COUNT(*) FROM stg.marketing_match) as marketing_matches
        """
        counts_result = await session.execute(text(counts_query))
        counts = counts_result.fetchone()

        return {
            "status": "healthy",
            "version": "V9",
            "views_count": int(view_count),
            "data": {
                "total_leads": int(counts.leads_count),
                "total_contracts": int(counts.contracts_count),
                "marketing_matches": int(counts.marketing_matches),
                "last_lead_date": str(freshness.last_lead_date) if freshness.last_lead_date else None,
                "last_contract_date": str(freshness.last_contract_date) if freshness.last_contract_date else None,
            },
            "timestamp": str(date.today())
        }

    except Exception as e:
        logger.error(f"V9 health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }
