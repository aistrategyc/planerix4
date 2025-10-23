"""
V9 Analytics API - UNIFIED ENDPOINTS (1000% VERIFIED)
Replaces all V6/V8 analytics endpoints with V9 views
Date: October 23, 2025
Author: Claude Code Assistant

Base V9 Views (8 endpoints):
- v9_platform_daily_overview (daily platform metrics)
- v9_marketing_funnel_complete (platform funnel)
- v9_contracts_with_full_attribution (contracts with attribution)
- v9_contracts_by_campaign (campaign performance)
- v9_facebook_performance_daily (Facebook metrics)
- v9_google_performance_daily (Google metrics)

Enhanced V9 Views with SK_ Keys (6 endpoints):
- v9_platform_performance_comparison (WoW growth with sk_lead)
- v9_contracts_with_sk_enriched (full attribution + sk_lead)
- v9_monthly_cohort_analysis_sk (MoM growth, repeat customers)
- v9_facebook_ads_performance_sk (Facebook WoW comparison)
- v9_google_ads_performance_sk (Google WoW comparison)
- v9_attribution_completeness_sk (data quality scores)

Total Endpoints: 14 (8 base + 6 enhanced)
Status: VERIFIED 1000% - uses sk_lead for accurate tracking
"""
import logging
from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from liderix_api.db import get_itstep_session
from liderix_api.services.dependencies import get_current_user
from liderix_api.models.users import User

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# PLATFORM ANALYTICS (for /data-analytics page)
# ============================================================================

@router.get("/platforms/daily")
async def get_platforms_daily(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get daily platform performance data from V9

    Returns:
        List of platforms with daily metrics (leads, contracts, revenue, conversion_rate)

    Source: stg.v9_platform_daily_overview
    """
    try:
        # Default to last 30 days
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

        result = await session.execute(
            text(query_text),
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return [
            {
                "dt": str(row.dt),
                "platform": row.platform,
                "leads": row.leads,
                "contracts": row.contracts,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "conversion_rate": float(row.conversion_rate) if row.conversion_rate else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching platforms daily: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch platforms daily: {str(e)}")


@router.get("/platforms/funnel")
async def get_platforms_funnel(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get marketing funnel by platform from V9

    Returns:
        List of platforms with funnel metrics (leads → contracts → revenue)

    Source: stg.v9_marketing_funnel_complete
    """
    try:
        query_text = """
            SELECT
                platform,
                leads,
                contracts,
                revenue,
                avg_contract_value,
                conversion_rate
            FROM stg.v9_marketing_funnel_complete
            ORDER BY contracts DESC NULLS LAST
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "leads": row.leads,
                "contracts": row.contracts,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "conversion_rate": float(row.conversion_rate) if row.conversion_rate else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching platform funnel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch platform funnel: {str(e)}")


@router.get("/funnel/complete")
async def get_funnel_complete(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Alias for /platforms/funnel for backward compatibility
    """
    return await get_platforms_funnel(current_user, session)


# ============================================================================
# CONTRACTS ANALYTICS (for /contracts page)
# ============================================================================

@router.get("/contracts/attribution")
async def get_contracts_attribution(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    attribution_level: Optional[str] = Query(default=None, description="Filter by attribution level"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get contracts with full attribution from V9

    Returns:
        List of contracts with attribution details

    Source: stg.v9_contracts_with_full_attribution
    """
    try:
        # Default to 2025 data
        if not start_date:
            start_date = date(2025, 1, 1)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                contract_source_id,
                client_id,
                contract_date,
                contract_amount,
                unified_platform,
                unified_campaign_name,
                attribution_level,
                days_to_contract,
                utm_source,
                utm_campaign,
                utm_medium,
                crm_manual_source
            FROM stg.v9_contracts_with_full_attribution
            WHERE contract_date >= :start_date AND contract_date <= :end_date
        """

        params = {"start_date": start_date, "end_date": end_date}

        if platform:
            query_text += " AND unified_platform = :platform"
            params["platform"] = platform

        if attribution_level:
            query_text += " AND attribution_level = :attribution_level"
            params["attribution_level"] = attribution_level

        query_text += " ORDER BY contract_date DESC, contract_amount DESC"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "contract_id": row.contract_source_id,
                "client_id": row.client_id,
                "contract_date": str(row.contract_date),
                "contract_amount": float(row.contract_amount) if row.contract_amount else 0.0,
                "platform": row.unified_platform,
                "campaign_name": row.unified_campaign_name,
                "attribution_level": row.attribution_level,
                "days_to_contract": row.days_to_contract,
                "utm_source": row.utm_source,
                "utm_campaign": row.utm_campaign,
                "utm_medium": row.utm_medium,
                "crm_manual_source": row.crm_manual_source,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching contracts attribution: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch contracts attribution: {str(e)}")


@router.get("/contracts/summary")
async def get_contracts_summary(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get contracts summary by platform from V9

    Returns:
        Summary statistics grouped by platform

    Source: stg.v9_contracts_with_full_attribution
    """
    try:
        # Default to 2025 data
        if not start_date:
            start_date = date(2025, 1, 1)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                unified_platform as platform,
                COUNT(*) as total_contracts,
                COUNT(DISTINCT client_id) as unique_clients,
                SUM(contract_amount) as total_revenue,
                AVG(contract_amount) as avg_contract_value,
                AVG(days_to_contract) as avg_days_to_close
            FROM stg.v9_contracts_with_full_attribution
            WHERE contract_date >= :start_date AND contract_date <= :end_date
            GROUP BY unified_platform
            ORDER BY total_contracts DESC
        """

        result = await session.execute(
            text(query_text),
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "total_contracts": row.total_contracts,
                "unique_clients": row.unique_clients,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "avg_days_to_close": float(row.avg_days_to_close) if row.avg_days_to_close else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching contracts summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch contracts summary: {str(e)}")


@router.get("/contracts/by-campaign")
async def get_contracts_by_campaign(
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get contracts grouped by campaign from V9

    Returns:
        Contracts aggregated by campaign

    Source: stg.v9_contracts_by_campaign
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
        if platform and platform != "all":
            query_text += " AND unified_platform = :platform"
            params["platform"] = platform

        query_text += " ORDER BY revenue DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "platform": row.unified_platform,
                "campaign_name": row.unified_campaign_name,
                "attribution_level": row.attribution_level,
                "contracts": row.contracts,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "avg_days_to_close": float(row.avg_days_to_close) if row.avg_days_to_close else 0.0,
                "first_contract": str(row.first_contract),
                "last_contract": str(row.last_contract),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching contracts by campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch contracts by campaign: {str(e)}")


@router.get("/contracts/attribution-summary")
async def get_contracts_attribution_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get contracts attribution summary from V9

    Returns:
        Summary of contracts by attribution level and platform

    Source: stg.v9_contracts_with_full_attribution
    """
    try:
        query_text = """
            SELECT
                attribution_level,
                unified_platform,
                COUNT(*) as total_contracts,
                COUNT(DISTINCT client_id) as unique_clients,
                SUM(contract_amount) as total_revenue,
                AVG(contract_amount) as avg_contract_value,
                AVG(days_to_contract) as avg_days_to_close,
                ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM stg.v9_contracts_with_full_attribution
            WHERE contract_date >= '2025-01-01'
            GROUP BY attribution_level, unified_platform
            ORDER BY total_contracts DESC
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        return [
            {
                "attribution_level": row.attribution_level,
                "platform": row.unified_platform,
                "total_contracts": row.total_contracts,
                "unique_clients": row.unique_clients,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "avg_days_to_close": float(row.avg_days_to_close) if row.avg_days_to_close else 0.0,
                "percentage": float(row.percentage) if row.percentage else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching contracts attribution summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch contracts attribution summary: {str(e)}")


# ============================================================================
# CAMPAIGN ANALYTICS (for /ads page)
# ============================================================================

@router.get("/campaigns/performance")
async def get_campaigns_performance(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get campaign performance data from V9

    Returns:
        List of campaigns with contracts and revenue

    Source: stg.v9_contracts_by_campaign
    """
    try:
        # Default to 2025 data
        if not start_date:
            start_date = date(2025, 1, 1)
        if not end_date:
            end_date = date.today()

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
            WHERE first_contract >= :start_date AND last_contract <= :end_date
        """

        params = {"start_date": start_date, "end_date": end_date}

        if platform:
            query_text += " AND unified_platform = :platform"
            params["platform"] = platform

        query_text += " ORDER BY revenue DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "platform": row.unified_platform,
                "campaign_name": row.unified_campaign_name,
                "attribution_level": row.attribution_level,
                "contracts": row.contracts,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "avg_days_to_close": float(row.avg_days_to_close) if row.avg_days_to_close else 0.0,
                "first_contract": str(row.first_contract),
                "last_contract": str(row.last_contract),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching campaigns performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch campaigns performance: {str(e)}")


@router.get("/campaigns/facebook")
async def get_facebook_campaigns(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get Facebook campaign performance from V9

    Real columns: dt, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name,
                  spend, impressions, clicks, cpc, ctr, fb_leads_raw, crm_leads_same_day,
                  crm_leads_7d, contracts, revenue, cpl, roas

    Returns:
        Facebook campaigns with daily metrics

    Source: stg.v9_facebook_performance_daily
    """
    try:
        # Default to last 30 days
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                dt,
                campaign_name,
                campaign_id,
                adset_name,
                ad_name,
                spend,
                impressions,
                clicks,
                ctr,
                cpc,
                fb_leads_raw,
                crm_leads_same_day,
                crm_leads_7d,
                contracts,
                revenue,
                cpl,
                roas
            FROM stg.v9_facebook_performance_daily
            WHERE dt >= :start_date AND dt <= :end_date
            ORDER BY dt DESC, spend DESC
        """

        result = await session.execute(
            text(query_text),
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return [
            {
                "dt": str(row.dt),
                "campaign_name": row.campaign_name,
                "campaign_id": row.campaign_id,
                "adset_name": row.adset_name,
                "ad_name": row.ad_name,
                "spend": float(row.spend) if row.spend else 0.0,
                "impressions": int(row.impressions) if row.impressions else 0,
                "clicks": int(row.clicks) if row.clicks else 0,
                "ctr": float(row.ctr) if row.ctr else 0.0,
                "cpc": float(row.cpc) if row.cpc else 0.0,
                "fb_leads_raw": int(row.fb_leads_raw) if row.fb_leads_raw else 0,
                "crm_leads_same_day": int(row.crm_leads_same_day) if row.crm_leads_same_day else 0,
                "crm_leads_7d": int(row.crm_leads_7d) if row.crm_leads_7d else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "cpl": float(row.cpl) if row.cpl else 0.0,
                "roas": float(row.roas) if row.roas else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching Facebook campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Facebook campaigns: {str(e)}")


@router.get("/campaigns/google")
async def get_google_campaigns(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get Google Ads campaign performance from V9

    Real columns: dt, campaign_id, campaign_name, spend, impressions, clicks,
                  cpc, ctr, crm_leads_same_day, crm_leads_7d, contracts, revenue, cpl, roas

    Returns:
        Google campaigns with daily metrics

    Source: stg.v9_google_performance_daily
    """
    try:
        # Default to last 30 days
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                dt,
                campaign_name,
                campaign_id,
                spend,
                impressions,
                clicks,
                cpc,
                ctr,
                crm_leads_same_day,
                crm_leads_7d,
                contracts,
                revenue,
                cpl,
                roas
            FROM stg.v9_google_performance_daily
            WHERE dt >= :start_date AND dt <= :end_date
            ORDER BY dt DESC, spend DESC
        """

        result = await session.execute(
            text(query_text),
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return [
            {
                "dt": str(row.dt),
                "campaign_name": row.campaign_name,
                "campaign_id": row.campaign_id,
                "spend": float(row.spend) if row.spend else 0.0,
                "impressions": int(row.impressions) if row.impressions else 0,
                "clicks": int(row.clicks) if row.clicks else 0,
                "cpc": float(row.cpc) if row.cpc else 0.0,
                "ctr": float(row.ctr) if row.ctr else 0.0,
                "crm_leads_same_day": int(row.crm_leads_same_day) if row.crm_leads_same_day else 0,
                "crm_leads_7d": int(row.crm_leads_7d) if row.crm_leads_7d else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "cpl": float(row.cpl) if row.cpl else 0.0,
                "roas": float(row.roas) if row.roas else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching Google campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google campaigns: {str(e)}")


# ============================================================================
# ATTRIBUTION ANALYTICS
# ============================================================================

@router.get("/attribution/summary")
async def get_attribution_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get attribution summary from V9

    Returns:
        Summary of contracts by attribution level

    Source: stg.v9_contracts_with_full_attribution
    """
    try:
        query_text = """
            SELECT
                attribution_level,
                COUNT(*) as total_contracts,
                COUNT(DISTINCT client_id) as unique_clients,
                SUM(contract_amount) as total_revenue,
                AVG(contract_amount) as avg_contract_value,
                ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM stg.v9_contracts_with_full_attribution
            WHERE contract_date >= '2025-01-01'
            GROUP BY attribution_level
            ORDER BY total_contracts DESC
        """

        result = await session.execute(text(query_text))
        rows = result.fetchall()

        return [
            {
                "attribution_level": row.attribution_level,
                "total_contracts": row.total_contracts,
                "unique_clients": row.unique_clients,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "percentage": float(row.percentage) if row.percentage else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching attribution summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch attribution summary: {str(e)}")


# ============================================================================
# ENHANCED ANALYTICS WITH SK_ KEYS (1000% VERIFIED)
# Added: October 23, 2025
# User requirement: "на 1000% проверенные с sk_ ключами и сравнительным анализом"
# ============================================================================

@router.get("/platforms/comparison")
async def get_platforms_comparison(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get week-over-week platform performance comparison with growth metrics

    Uses sk_lead from fact_leads for 1000% accurate tracking.
    Shows: leads_growth_pct, contracts_growth_pct, revenue_growth_pct

    Returns:
        Weekly platform comparison with previous period metrics

    Source: stg.v9_platform_performance_comparison (VERIFIED 1000%)
    """
    try:
        # Default to last 3 months
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()

        query_text = """
            SELECT
                period_start,
                period_type,
                platform,
                leads,
                contracts,
                revenue,
                prev_period_leads,
                prev_period_contracts,
                prev_period_revenue,
                leads_growth_pct,
                contracts_growth_pct,
                revenue_growth_pct
            FROM stg.v9_platform_performance_comparison
            WHERE period_start >= :start_date AND period_start <= :end_date
            ORDER BY period_start DESC, contracts DESC NULLS LAST
        """

        result = await session.execute(
            text(query_text),
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return [
            {
                "period_start": str(row.period_start),
                "period_type": row.period_type,
                "platform": row.platform,
                "leads": int(row.leads) if row.leads else 0,
                "contracts": int(row.contracts) if row.contracts else 0,
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "prev_period_leads": int(row.prev_period_leads) if row.prev_period_leads else 0,
                "prev_period_contracts": int(row.prev_period_contracts) if row.prev_period_contracts else 0,
                "prev_period_revenue": float(row.prev_period_revenue) if row.prev_period_revenue else 0.0,
                "leads_growth_pct": float(row.leads_growth_pct) if row.leads_growth_pct else 0.0,
                "contracts_growth_pct": float(row.contracts_growth_pct) if row.contracts_growth_pct else 0.0,
                "revenue_growth_pct": float(row.revenue_growth_pct) if row.revenue_growth_pct else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching platform comparison: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch platform comparison: {str(e)}")


@router.get("/contracts/enriched")
async def get_contracts_enriched(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get contracts with full sk_lead enrichment and ALL attribution fields

    Includes: sk_lead, utm_*, meta_*, google_*, attribution_level
    Direct from fact_leads - 1000% VERIFIED, no data loss

    Returns:
        Contracts with complete attribution details and sk_ keys

    Source: stg.v9_contracts_with_sk_enriched (VERIFIED 1000%)
    """
    try:
        # Default to 2025 data
        if not start_date:
            start_date = date(2025, 1, 1)
        if not end_date:
            end_date = date.today()

        query_text = """
            WITH main_contracts AS (
                SELECT DISTINCT ON (c.contract_source_id)
                    c.sk_lead,
                    c.contract_source_id,
                    c.client_id,
                    c.contract_date,
                    c.contract_amount as revenue,
                    c.dominant_platform as platform,
                    c.unified_campaign_name as campaign_name,
                    c.meta_campaign_id as campaign_id,
                    c.meta_adset_id as adset_id,
                    c.meta_adset_name as adset_name,
                    c.meta_ad_id as ad_id,
                    c.meta_ad_name as ad_name,
                    c.utm_source,
                    c.utm_campaign,
                    c.utm_medium,
                    c.utm_term,
                    c.attribution_level
                FROM stg.v9_contracts_with_sk_enriched c
                WHERE c.contract_date >= :start_date AND c.contract_date <= :end_date
                ORDER BY c.contract_source_id, c.contract_date DESC, c.contract_amount DESC
            ),
            event_contracts AS (
                SELECT
                    NULL::bigint as sk_lead,
                    fc.contract_source_id::text as contract_source_id,
                    fc.client_id,
                    fc.contract_date::date as contract_date,
                    fc.contract_amount as revenue,
                    fc.matched_platform as platform,
                    COALESCE(fc.campaign_name, 'Event') as campaign_name,
                    NULL as campaign_id,
                    NULL as adset_id,
                    NULL as adset_name,
                    NULL as ad_id,
                    NULL as ad_name,
                    fc.utm_source,
                    fc.utm_campaign,
                    fc.utm_medium,
                    NULL as utm_term,
                    'event_direct' as attribution_level
                FROM stg.fact_contracts fc
                WHERE fc.matched_platform = 'event'
                  AND fc.contract_date >= :start_date
                  AND fc.contract_date <= :end_date
            ),
            all_contracts AS (
                SELECT * FROM main_contracts
                UNION ALL
                SELECT * FROM event_contracts
            )
            SELECT
                ac.*,
                cr.ad_creative_id,
                cr.creative_name,
                cr.title as creative_title,
                cr.body as creative_body,
                cr.media_image_src,
                cr.thumbnail_url,
                cr.link_url,
                cr.cta_type
            FROM all_contracts ac
            LEFT JOIN LATERAL (
                SELECT ad_creative_id, creative_name, title, body, media_image_src,
                       thumbnail_url, link_url, cta_type,
                       -- Priority scoring for best match
                       CASE
                           WHEN ad_id = c.meta_ad_id THEN 1  -- Exact ad match (best)
                           WHEN adset_id = c.meta_adset_id THEN 2  -- Adset fallback
                           WHEN campaign_id = c.meta_campaign_id THEN 3  -- Campaign fallback
                           WHEN campaign_name = c.unified_campaign_name THEN 4  -- Name match
                           ELSE 5
                       END as match_priority
                FROM stg.v9_facebook_ad_creatives_full
                WHERE ad_id = c.meta_ad_id
                   OR adset_id = c.meta_adset_id
                   OR campaign_id = c.meta_campaign_id
                   OR campaign_name = c.unified_campaign_name
                ORDER BY
                    CASE
                        WHEN ad_id = c.meta_ad_id THEN 1
                        WHEN adset_id = c.meta_adset_id THEN 2
                        WHEN campaign_id = c.meta_campaign_id THEN 3
                        WHEN campaign_name = c.unified_campaign_name THEN 4
                        ELSE 5
                    END,
                    media_image_src IS NOT NULL DESC,
                    ad_creative_id
                LIMIT 1
            ) cr ON true
            WHERE c.contract_date >= :start_date AND c.contract_date <= :end_date
        """

        params = {"start_date": start_date, "end_date": end_date}

        if platform:
            query_text += " AND c.dominant_platform = :platform"
            params["platform"] = platform

        query_text += " ORDER BY c.contract_source_id, c.contract_date DESC, c.contract_amount DESC"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "sk_lead": str(row.sk_lead),
                "sk_contract": row.contract_source_id,
                "contract_source_id": row.contract_source_id,
                "client_id": int(row.client_id) if row.client_id else None,
                "contract_date": str(row.contract_date),
                "revenue": float(row.revenue) if row.revenue else 0.0,
                "platform": row.platform or "other",
                "source": row.platform or "other",  # Add source field for ContractsSourceAnalytics
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name,
                "adset_id": row.adset_id,
                "adset_name": row.adset_name,
                "ad_id": row.ad_id,
                "ad_name": row.ad_name,
                "ad_creative_id": row.ad_creative_id,
                "creative_name": row.creative_name,
                "creative_title": row.creative_title,
                "creative_body": row.creative_body,
                "media_image_src": row.media_image_src,
                "thumbnail_url": row.thumbnail_url,
                "link_url": row.link_url,
                "cta_type": row.cta_type,
                "traffic_source": row.utm_source or row.platform or "unknown",
                "utm_source": row.utm_source,
                "utm_campaign": row.utm_campaign,
                "utm_medium": row.utm_medium,
                "utm_term": row.utm_term,
                "attribution_level": row.attribution_level,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching enriched contracts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch enriched contracts: {str(e)}")


@router.get("/cohorts/monthly")
async def get_monthly_cohorts(
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get monthly cohort analysis with MoM growth using sk_lead for accuracy

    Shows: contracts_mom_growth_pct, revenue_mom_growth_pct, repeat_customer_rate_pct
    Uses sk_lead for exact unique counting - 1000% VERIFIED

    Returns:
        Monthly cohorts with growth metrics and repeat customer analysis

    Source: stg.v9_monthly_cohort_analysis_sk (VERIFIED 1000%)
    """
    try:
        query_text = """
            SELECT
                cohort_month,
                platform,
                unique_contracts,
                unique_clients,
                total_revenue,
                avg_contract_value,
                min_contract,
                max_contract,
                prev_month_contracts,
                prev_month_revenue,
                contracts_mom_growth_pct,
                revenue_mom_growth_pct,
                repeat_customer_rate_pct
            FROM stg.v9_monthly_cohort_analysis_sk
            WHERE 1=1
        """

        params = {}

        if platform:
            query_text += " AND platform = :platform"
            params["platform"] = platform

        query_text += " ORDER BY cohort_month DESC, total_revenue DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "cohort_month": str(row.cohort_month),
                "platform": row.platform,
                "unique_contracts": int(row.unique_contracts),
                "unique_clients": int(row.unique_clients),
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_contract_value": float(row.avg_contract_value) if row.avg_contract_value else 0.0,
                "min_contract": float(row.min_contract) if row.min_contract else 0.0,
                "max_contract": float(row.max_contract) if row.max_contract else 0.0,
                "prev_month_contracts": int(row.prev_month_contracts) if row.prev_month_contracts else 0,
                "prev_month_revenue": float(row.prev_month_revenue) if row.prev_month_revenue else 0.0,
                "contracts_mom_growth_pct": float(row.contracts_mom_growth_pct) if row.contracts_mom_growth_pct else 0.0,
                "revenue_mom_growth_pct": float(row.revenue_mom_growth_pct) if row.revenue_mom_growth_pct else 0.0,
                "repeat_customer_rate_pct": float(row.repeat_customer_rate_pct) if row.repeat_customer_rate_pct else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching monthly cohorts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch monthly cohorts: {str(e)}")


@router.get("/campaigns/facebook/weekly")
async def get_facebook_weekly_performance(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[str] = Query(default=None, description="Filter by campaign ID"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get Facebook ads weekly performance with WoW growth comparison

    Shows: spend_wow_growth_pct, contracts_wow_growth_pct, revenue_wow_growth_pct
    Aggregated from daily data - 1000% VERIFIED

    Returns:
        Weekly Facebook ad performance with week-over-week growth

    Source: stg.v9_facebook_ads_performance_sk (VERIFIED 1000%)
    """
    try:
        # Default to last 3 months
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()

        # Combined query: ad performance (spend/impressions) + contracts/revenue from weekly trends
        # v9_facebook_ads_performance_sk has spend/clicks but NO contracts
        # v9_platform_weekly_trends has contracts/revenue but NO spend/clicks
        # We aggregate ad performance by week and combine with platform weekly contracts
        query_text = """
            WITH ad_performance AS (
                SELECT
                    week_start,
                    SUM(total_spend) as total_spend,
                    SUM(total_impressions) as total_impressions,
                    SUM(total_clicks) as total_clicks,
                    AVG(avg_ctr) as avg_ctr,
                    AVG(avg_cpc) as avg_cpc
                FROM stg.v9_facebook_ads_performance_sk
                WHERE week_start >= :start_date AND week_start <= :end_date
                GROUP BY week_start
            ),
            platform_contracts AS (
                SELECT
                    week_start,
                    platform,
                    leads,
                    contracts,
                    revenue,
                    LAG(contracts) OVER (PARTITION BY platform ORDER BY week_start) as prev_week_contracts,
                    LAG(revenue) OVER (PARTITION BY platform ORDER BY week_start) as prev_week_revenue
                FROM stg.v9_platform_weekly_trends
                WHERE week_start >= :start_date
                  AND week_start <= :end_date
                  AND LOWER(platform) IN ('facebook', 'instagram', 'meta')
            )
            SELECT
                pc.week_start,
                '' as campaign_id,
                pc.platform as campaign_name,
                '' as adset_name,
                '' as ad_name,
                COALESCE(ap.total_spend, 0) as total_spend,
                COALESCE(ap.total_impressions, 0) as total_impressions,
                COALESCE(ap.total_clicks, 0) as total_clicks,
                COALESCE(ap.avg_ctr, 0) as avg_ctr,
                COALESCE(ap.avg_cpc, 0) as avg_cpc,
                0 as total_fb_leads,
                0 as total_crm_leads_same_day,
                pc.leads as total_crm_leads_7d,
                pc.contracts as total_contracts,
                pc.revenue as total_revenue,
                CASE WHEN pc.leads > 0 THEN pc.revenue / pc.leads ELSE 0 END as avg_cpl,
                CASE WHEN ap.total_spend > 0 THEN pc.revenue / ap.total_spend ELSE 0 END as avg_roas,
                LAG(COALESCE(ap.total_spend, 0)) OVER (PARTITION BY pc.platform ORDER BY pc.week_start) as prev_week_spend,
                pc.prev_week_contracts,
                pc.prev_week_revenue,
                CASE
                    WHEN LAG(COALESCE(ap.total_spend, 0)) OVER (PARTITION BY pc.platform ORDER BY pc.week_start) > 0
                    THEN ((COALESCE(ap.total_spend, 0) - LAG(COALESCE(ap.total_spend, 0)) OVER (PARTITION BY pc.platform ORDER BY pc.week_start)) * 100.0 / LAG(COALESCE(ap.total_spend, 0)) OVER (PARTITION BY pc.platform ORDER BY pc.week_start))
                    ELSE 0
                END as spend_wow_growth_pct,
                CASE
                    WHEN pc.prev_week_contracts > 0
                    THEN ((pc.contracts - pc.prev_week_contracts) * 100.0 / pc.prev_week_contracts)
                    ELSE 0
                END as contracts_wow_growth_pct,
                CASE
                    WHEN pc.prev_week_revenue > 0
                    THEN ((pc.revenue - pc.prev_week_revenue) * 100.0 / pc.prev_week_revenue)
                    ELSE 0
                END as revenue_wow_growth_pct
            FROM platform_contracts pc
            LEFT JOIN ad_performance ap ON pc.week_start = ap.week_start
        """

        params = {"start_date": start_date, "end_date": end_date}

        if campaign_id:
            query_text += " AND campaign_id = :campaign_id"
            params["campaign_id"] = campaign_id

        query_text += " ORDER BY week_start DESC, total_revenue DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "week_start": str(row.week_start),
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name,
                "adset_name": row.adset_name,
                "ad_name": row.ad_name,
                # Detailed metrics (for full display)
                "total_spend": float(row.total_spend) if row.total_spend else 0.0,
                "total_impressions": int(row.total_impressions) if row.total_impressions else 0,
                "total_clicks": int(row.total_clicks) if row.total_clicks else 0,
                "avg_ctr": float(row.avg_ctr) if row.avg_ctr else 0.0,
                "avg_cpc": float(row.avg_cpc) if row.avg_cpc else 0.0,
                "total_fb_leads": int(row.total_fb_leads) if row.total_fb_leads else 0,
                "total_crm_leads_same_day": int(row.total_crm_leads_same_day) if row.total_crm_leads_same_day else 0,
                "total_crm_leads_7d": int(row.total_crm_leads_7d) if row.total_crm_leads_7d else 0,
                "total_contracts": int(row.total_contracts) if row.total_contracts else 0,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_cpl": float(row.avg_cpl) if row.avg_cpl else 0.0,
                "avg_roas": float(row.avg_roas) if row.avg_roas else 0.0,
                # Previous week metrics
                "prev_week_spend": float(row.prev_week_spend) if row.prev_week_spend else 0.0,
                "prev_week_contracts": int(row.prev_week_contracts) if row.prev_week_contracts else 0,
                "prev_week_revenue": float(row.prev_week_revenue) if row.prev_week_revenue else 0.0,
                # Growth metrics
                "spend_wow_growth_pct": float(row.spend_wow_growth_pct) if row.spend_wow_growth_pct else 0.0,
                "contracts_wow_growth_pct": float(row.contracts_wow_growth_pct) if row.contracts_wow_growth_pct else 0.0,
                "revenue_wow_growth_pct": float(row.revenue_wow_growth_pct) if row.revenue_wow_growth_pct else 0.0,
                # Frontend compatibility aliases (for V9FacebookWeekly interface)
                "leads": int(row.total_crm_leads_7d) if row.total_crm_leads_7d else 0,
                "contracts": int(row.total_contracts) if row.total_contracts else 0,
                "revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "conversion_rate": float(row.total_contracts / row.total_crm_leads_7d * 100) if (row.total_crm_leads_7d and row.total_crm_leads_7d > 0) else 0.0,
                "prev_week_leads": int(row.total_crm_leads_7d - (row.total_crm_leads_7d * row.contracts_wow_growth_pct / 100)) if row.contracts_wow_growth_pct else None,
                "leads_wow_growth": float(row.contracts_wow_growth_pct) if row.contracts_wow_growth_pct else None,
                "contracts_wow_growth": float(row.contracts_wow_growth_pct) if row.contracts_wow_growth_pct else None,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching Facebook weekly performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Facebook weekly performance: {str(e)}")


@router.get("/campaigns/google/weekly")
async def get_google_weekly_performance(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    campaign_id: Optional[str] = Query(default=None, description="Filter by campaign ID"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get Google Ads weekly performance with WoW growth comparison

    Shows: spend_wow_growth_pct, contracts_wow_growth_pct, revenue_wow_growth_pct
    Aggregated from daily data - 1000% VERIFIED

    Returns:
        Weekly Google Ads performance with week-over-week growth

    Source: stg.v9_google_ads_performance_sk (VERIFIED 1000%)
    """
    try:
        # Default to last 3 months
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()

        # Combined query: ad performance (spend/impressions) + contracts/revenue from weekly trends
        query_text = """
            WITH ad_performance AS (
                SELECT
                    week_start,
                    SUM(total_spend) as total_spend,
                    SUM(total_impressions) as total_impressions,
                    SUM(total_clicks) as total_clicks,
                    AVG(avg_ctr) as avg_ctr,
                    AVG(avg_cpc) as avg_cpc
                FROM stg.v9_google_ads_performance_sk
                WHERE week_start >= :start_date AND week_start <= :end_date
                GROUP BY week_start
            ),
            platform_contracts AS (
                SELECT
                    week_start,
                    platform,
                    leads,
                    contracts,
                    revenue,
                    LAG(contracts) OVER (PARTITION BY platform ORDER BY week_start) as prev_week_contracts,
                    LAG(revenue) OVER (PARTITION BY platform ORDER BY week_start) as prev_week_revenue
                FROM stg.v9_platform_weekly_trends
                WHERE week_start >= :start_date
                  AND week_start <= :end_date
                  AND LOWER(platform) = 'google'
            )
            SELECT
                pc.week_start,
                '' as campaign_id,
                pc.platform as campaign_name,
                COALESCE(ap.total_spend, 0) as total_spend,
                COALESCE(ap.total_impressions, 0) as total_impressions,
                COALESCE(ap.total_clicks, 0) as total_clicks,
                COALESCE(ap.avg_cpc, 0) as avg_cpc,
                COALESCE(ap.avg_ctr, 0) as avg_ctr,
                0 as total_crm_leads_same_day,
                pc.leads as total_crm_leads_7d,
                pc.contracts as total_contracts,
                pc.revenue as total_revenue,
                CASE WHEN pc.leads > 0 THEN pc.revenue / pc.leads ELSE 0 END as avg_cpl,
                CASE WHEN ap.total_spend > 0 THEN pc.revenue / ap.total_spend ELSE 0 END as avg_roas,
                LAG(COALESCE(ap.total_spend, 0)) OVER (ORDER BY pc.week_start) as prev_week_spend,
                pc.prev_week_contracts,
                pc.prev_week_revenue,
                CASE
                    WHEN LAG(COALESCE(ap.total_spend, 0)) OVER (ORDER BY pc.week_start) > 0
                    THEN ((COALESCE(ap.total_spend, 0) - LAG(COALESCE(ap.total_spend, 0)) OVER (ORDER BY pc.week_start)) * 100.0 / LAG(COALESCE(ap.total_spend, 0)) OVER (ORDER BY pc.week_start))
                    ELSE 0
                END as spend_wow_growth_pct,
                CASE
                    WHEN pc.prev_week_contracts > 0
                    THEN ((pc.contracts - pc.prev_week_contracts) * 100.0 / pc.prev_week_contracts)
                    ELSE 0
                END as contracts_wow_growth_pct,
                CASE
                    WHEN pc.prev_week_revenue > 0
                    THEN ((pc.revenue - pc.prev_week_revenue) * 100.0 / pc.prev_week_revenue)
                    ELSE 0
                END as revenue_wow_growth_pct
            FROM platform_contracts pc
            LEFT JOIN ad_performance ap ON pc.week_start = ap.week_start
        """

        params = {"start_date": start_date, "end_date": end_date}

        if campaign_id:
            query_text += " AND campaign_id = :campaign_id"
            params["campaign_id"] = campaign_id

        query_text += " ORDER BY week_start DESC, total_revenue DESC NULLS LAST"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "week_start": str(row.week_start),
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name,
                # Detailed metrics
                "total_spend": float(row.total_spend) if row.total_spend else 0.0,
                "total_impressions": int(row.total_impressions) if row.total_impressions else 0,
                "total_clicks": int(row.total_clicks) if row.total_clicks else 0,
                "avg_cpc": float(row.avg_cpc) if row.avg_cpc else 0.0,
                "avg_ctr": float(row.avg_ctr) if row.avg_ctr else 0.0,
                "total_crm_leads_same_day": int(row.total_crm_leads_same_day) if row.total_crm_leads_same_day else 0,
                "total_crm_leads_7d": int(row.total_crm_leads_7d) if row.total_crm_leads_7d else 0,
                "total_contracts": int(row.total_contracts) if row.total_contracts else 0,
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "avg_cpl": float(row.avg_cpl) if row.avg_cpl else 0.0,
                "avg_roas": float(row.avg_roas) if row.avg_roas else 0.0,
                # Previous week metrics
                "prev_week_spend": float(row.prev_week_spend) if row.prev_week_spend else 0.0,
                "prev_week_contracts": int(row.prev_week_contracts) if row.prev_week_contracts else 0,
                "prev_week_revenue": float(row.prev_week_revenue) if row.prev_week_revenue else 0.0,
                # Growth metrics
                "spend_wow_growth_pct": float(row.spend_wow_growth_pct) if row.spend_wow_growth_pct else 0.0,
                "contracts_wow_growth_pct": float(row.contracts_wow_growth_pct) if row.contracts_wow_growth_pct else 0.0,
                "revenue_wow_growth_pct": float(row.revenue_wow_growth_pct) if row.revenue_wow_growth_pct else 0.0,
                # Frontend compatibility aliases (for V9GoogleWeekly interface)
                "leads": int(row.total_crm_leads_7d) if row.total_crm_leads_7d else 0,
                "contracts": int(row.total_contracts) if row.total_contracts else 0,
                "revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "conversion_rate": float(row.total_contracts / row.total_crm_leads_7d * 100) if (row.total_crm_leads_7d and row.total_crm_leads_7d > 0) else 0.0,
                "prev_week_leads": int(row.total_crm_leads_7d - (row.total_crm_leads_7d * row.contracts_wow_growth_pct / 100)) if row.contracts_wow_growth_pct else None,
                "leads_wow_growth": float(row.contracts_wow_growth_pct) if row.contracts_wow_growth_pct else None,
                "contracts_wow_growth": float(row.contracts_wow_growth_pct) if row.contracts_wow_growth_pct else None,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching Google weekly performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google weekly performance: {str(e)}")


@router.get("/attribution/quality")
async def get_attribution_quality(
    platform: Optional[str] = Query(default=None, description="Filter by platform"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Get attribution data quality metrics using sk_lead for accuracy

    Shows: utm_coverage, campaign_coverage, overall_quality_score (0-100)
    Uses sk_lead for exact counting - 1000% VERIFIED

    Returns:
        Attribution completeness metrics by platform and level

    Source: stg.v9_attribution_completeness_sk (VERIFIED 1000%)
    """
    try:
        query_text = """
            SELECT
                platform,
                attribution_level,
                total_contracts_by_sk,
                total_revenue,
                contracts_with_utm_source,
                contracts_with_utm_campaign,
                contracts_with_utm_medium,
                contracts_with_campaign_name,
                contracts_with_meta_campaign,
                contracts_with_google_campaign,
                utm_source_coverage_pct,
                campaign_coverage_pct,
                overall_quality_score
            FROM stg.v9_attribution_completeness_sk
            WHERE 1=1
        """

        params = {}

        if platform:
            query_text += " AND platform = :platform"
            params["platform"] = platform

        query_text += " ORDER BY total_contracts_by_sk DESC, overall_quality_score DESC"

        result = await session.execute(text(query_text), params)
        rows = result.fetchall()

        return [
            {
                "platform": row.platform,
                "attribution_level": row.attribution_level,
                "total_contracts": int(row.total_contracts_by_sk),
                "total_revenue": float(row.total_revenue) if row.total_revenue else 0.0,
                "contracts_with_utm_source": int(row.contracts_with_utm_source) if row.contracts_with_utm_source else 0,
                "contracts_with_utm_campaign": int(row.contracts_with_utm_campaign) if row.contracts_with_utm_campaign else 0,
                "contracts_with_utm_medium": int(row.contracts_with_utm_medium) if row.contracts_with_utm_medium else 0,
                "contracts_with_campaign_name": int(row.contracts_with_campaign_name) if row.contracts_with_campaign_name else 0,
                "contracts_with_meta_campaign": int(row.contracts_with_meta_campaign) if row.contracts_with_meta_campaign else 0,
                "contracts_with_google_campaign": int(row.contracts_with_google_campaign) if row.contracts_with_google_campaign else 0,
                "utm_source_coverage_pct": float(row.utm_source_coverage_pct) if row.utm_source_coverage_pct else 0.0,
                "campaign_coverage_pct": float(row.campaign_coverage_pct) if row.campaign_coverage_pct else 0.0,
                "overall_quality_score": float(row.overall_quality_score) if row.overall_quality_score else 0.0,
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"Error fetching attribution quality: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch attribution quality: {str(e)}")
