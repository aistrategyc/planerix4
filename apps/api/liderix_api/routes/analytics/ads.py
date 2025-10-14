"""
Ads Analytics API - Real Facebook and Google Ads data
Provides detailed ad performance metrics from raw.fb_ad_insights and raw.google_ads_campaign_daily
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
from liderix_api.db import get_itstep_session

router = APIRouter()

def parse_date(date_str: Optional[str]) -> Optional[date]:
    """Parse date string to date object"""
    if not date_str:
        return None
    try:
        if isinstance(date_str, str):
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        return date_str
    except ValueError:
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
        except ValueError:
            return None

@router.get("/")
async def get_ads_analytics(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_itstep_session)
):
    """
    Get comprehensive ads analytics data from Facebook and Google Ads
    Returns: daily metrics, campaigns, adsets, platforms, and UTM breakdown

    Data Sources:
    - Facebook: raw.fb_ad_insights (8,504 rows, Sep 13 - Oct 13, 2025)
    - Google: raw.google_ads_campaign_daily (228 rows, Sep 10 - Oct 13, 2025)
    """

    # Default to last 30 days of available data if dates not provided
    if not date_from or not date_to:
        try:
            date_range_query = text("""
                SELECT
                    MIN(earliest) as min_date,
                    MAX(latest) as max_date
                FROM (
                    SELECT MIN(date_start::date) as earliest, MAX(date_start::date) as latest
                    FROM raw.fb_ad_insights
                    UNION ALL
                    SELECT MIN(date) as earliest, MAX(date) as latest
                    FROM raw.google_ads_campaign_daily
                ) dates
            """)
            result = await db.execute(date_range_query)
            date_info = result.fetchone()

            if date_info and date_info.max_date:
                date_to = date_info.max_date.strftime("%Y-%m-%d")
                # Last 7 days by default
                date_from = (date_info.max_date - timedelta(days=7)).strftime("%Y-%m-%d")
            else:
                date_to = datetime.now().strftime("%Y-%m-%d")
                date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        except Exception:
            date_to = datetime.now().strftime("%Y-%m-%d")
            date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    date_from_obj = parse_date(date_from)
    date_to_obj = parse_date(date_to)

    if not date_from_obj or not date_to_obj:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    try:
        # ==================== 1. DAILY METRICS ====================
        daily_query = text("""
            WITH fb_daily AS (
                SELECT
                    date_start::date as date,
                    'facebook' as platform,
                    SUM(spend) as spend,
                    SUM(clicks) as clicks,
                    SUM(impressions) as impressions,
                    CASE WHEN SUM(impressions) > 0
                        THEN (SUM(clicks)::float / SUM(impressions)) * 100
                        ELSE 0
                    END as ctr,
                    CASE WHEN SUM(clicks) > 0
                        THEN SUM(spend) / SUM(clicks)
                        ELSE 0
                    END as cpc,
                    CASE WHEN SUM(impressions) > 0
                        THEN (SUM(spend) / SUM(impressions)) * 1000
                        ELSE 0
                    END as cpm,
                    0 as conversions
                FROM raw.fb_ad_insights
                WHERE date_start::date BETWEEN :date_from AND :date_to
                GROUP BY date_start::date
            ),
            google_daily AS (
                SELECT
                    date,
                    'google_ads' as platform,
                    SUM(cost_micros) / 1000000.0 as spend,
                    SUM(clicks) as clicks,
                    SUM(impressions) as impressions,
                    AVG(ctr) as ctr,
                    AVG(average_cpc_micros) / 1000000.0 as cpc,
                    CASE WHEN SUM(impressions) > 0
                        THEN ((SUM(cost_micros) / 1000000.0) / SUM(impressions)) * 1000
                        ELSE 0
                    END as cpm,
                    SUM(conversions) as conversions
                FROM raw.google_ads_campaign_daily
                WHERE date BETWEEN :date_from AND :date_to
                GROUP BY date
            )
            SELECT * FROM fb_daily
            UNION ALL
            SELECT * FROM google_daily
            ORDER BY date DESC, platform
        """)

        result = await db.execute(daily_query, {"date_from": date_from_obj, "date_to": date_to_obj})
        daily_raw = result.fetchall()

        daily = []
        for row in daily_raw:
            daily.append({
                "date": row.date.strftime("%Y-%m-%d"),
                "platform": row.platform,
                "spend": float(row.spend or 0),
                "clicks": int(row.clicks or 0),
                "impressions": int(row.impressions or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpm": float(row.cpm or 0),
                "conversions": int(row.conversions or 0)
            })

        # ==================== 2. CAMPAIGNS ====================
        campaigns_query = text("""
            WITH fb_campaigns AS (
                SELECT
                    i.campaign_id::text as campaign_id,
                    COALESCE(c.name, i.campaign_id) as campaign_name,
                    'facebook' as platform,
                    SUM(i.spend) as spend,
                    SUM(i.clicks) as clicks,
                    SUM(i.impressions) as impressions,
                    0 as conversions,
                    CASE WHEN SUM(i.impressions) > 0
                        THEN (SUM(i.clicks)::float / SUM(i.impressions)) * 100
                        ELSE 0
                    END as ctr,
                    CASE WHEN SUM(i.clicks) > 0
                        THEN SUM(i.spend) / SUM(i.clicks)
                        ELSE 0
                    END as cpc,
                    0.0 as cpa
                FROM raw.fb_ad_insights i
                LEFT JOIN raw.fb_campaigns c ON i.campaign_id = c.campaign_id
                WHERE i.date_start::date BETWEEN :date_from AND :date_to
                GROUP BY i.campaign_id, c.name
            ),
            google_campaigns AS (
                SELECT
                    campaign_id::text,
                    campaign_name,
                    'google_ads' as platform,
                    SUM(cost_micros) / 1000000.0 as spend,
                    SUM(clicks) as clicks,
                    SUM(impressions) as impressions,
                    SUM(conversions) as conversions,
                    AVG(ctr) as ctr,
                    AVG(average_cpc_micros) / 1000000.0 as cpc,
                    CASE WHEN SUM(conversions) > 0
                        THEN (SUM(cost_micros) / 1000000.0) / SUM(conversions)
                        ELSE 0
                    END as cpa
                FROM raw.google_ads_campaign_daily
                WHERE date BETWEEN :date_from AND :date_to
                GROUP BY campaign_id, campaign_name
            )
            SELECT * FROM fb_campaigns
            UNION ALL
            SELECT * FROM google_campaigns
            ORDER BY spend DESC NULLS LAST
        """)

        result = await db.execute(campaigns_query, {"date_from": date_from_obj, "date_to": date_to_obj})
        campaigns_raw = result.fetchall()

        campaigns = []
        for row in campaigns_raw:
            campaigns.append({
                "campaign_id": row.campaign_id,
                "campaign_name": row.campaign_name or "(no name)",
                "platform": row.platform,
                "spend": float(row.spend or 0),
                "clicks": int(row.clicks or 0),
                "impressions": int(row.impressions or 0),
                "conversions": int(row.conversions or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpa": float(row.cpa or 0)
            })

        # ==================== 3. AD GROUPS (Facebook Ad Sets) ====================
        # Note: Renamed from "ad groups" to "ad sets" to match Facebook terminology
        # Google Ads ad groups not available in current schema
        adgroups_query = text("""
            SELECT
                i.adset_id::text as ad_group_id,
                COALESCE(a.name, i.adset_id) as ad_group_name,
                i.campaign_id::text,
                'facebook' as platform,
                SUM(i.spend) as spend,
                SUM(i.clicks) as clicks,
                SUM(i.impressions) as impressions,
                0 as conversions,
                CASE WHEN SUM(i.impressions) > 0
                    THEN (SUM(i.clicks)::float / SUM(i.impressions)) * 100
                    ELSE 0
                END as ctr,
                CASE WHEN SUM(i.clicks) > 0
                    THEN SUM(i.spend) / SUM(i.clicks)
                    ELSE 0
                END as cpc,
                0.0 as cpa
            FROM raw.fb_ad_insights i
            LEFT JOIN raw.fb_adsets a ON i.adset_id = a.adset_id
            WHERE i.date_start::date BETWEEN :date_from AND :date_to
              AND i.adset_id IS NOT NULL
            GROUP BY i.adset_id, a.name, i.campaign_id
            ORDER BY spend DESC NULLS LAST
        """)

        result = await db.execute(adgroups_query, {"date_from": date_from_obj, "date_to": date_to_obj})
        adgroups_raw = result.fetchall()

        adGroups = []
        for row in adgroups_raw:
            adGroups.append({
                "ad_group_id": row.ad_group_id,
                "ad_group_name": row.ad_group_name or "(no name)",
                "campaign_id": row.campaign_id,
                "platform": row.platform,
                "spend": float(row.spend or 0),
                "clicks": int(row.clicks or 0),
                "conversions": int(row.conversions or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpa": float(row.cpa or 0)
            })

        # ==================== 4. PLATFORMS ====================
        platforms_query = text("""
            WITH fb_platform AS (
                SELECT
                    'facebook' as platform,
                    SUM(spend) as spend,
                    SUM(clicks) as clicks,
                    SUM(impressions) as impressions,
                    0 as conversions,
                    CASE WHEN SUM(impressions) > 0
                        THEN (SUM(clicks)::float / SUM(impressions)) * 100
                        ELSE 0
                    END as ctr,
                    CASE WHEN SUM(clicks) > 0
                        THEN SUM(spend) / SUM(clicks)
                        ELSE 0
                    END as cpc,
                    0.0 as cpa
                FROM raw.fb_ad_insights
                WHERE date_start::date BETWEEN :date_from AND :date_to
            ),
            google_platform AS (
                SELECT
                    'google_ads' as platform,
                    SUM(cost_micros) / 1000000.0 as spend,
                    SUM(clicks) as clicks,
                    SUM(impressions) as impressions,
                    SUM(conversions) as conversions,
                    AVG(ctr) as ctr,
                    AVG(average_cpc_micros) / 1000000.0 as cpc,
                    CASE WHEN SUM(conversions) > 0
                        THEN (SUM(cost_micros) / 1000000.0) / SUM(conversions)
                        ELSE 0
                    END as cpa
                FROM raw.google_ads_campaign_daily
                WHERE date BETWEEN :date_from AND :date_to
            )
            SELECT * FROM fb_platform
            UNION ALL
            SELECT * FROM google_platform
            ORDER BY spend DESC
        """)

        result = await db.execute(platforms_query, {"date_from": date_from_obj, "date_to": date_to_obj})
        platforms_raw = result.fetchall()

        platforms = []
        for row in platforms_raw:
            platforms.append({
                "platform": row.platform,
                "spend": float(row.spend or 0),
                "clicks": int(row.clicks or 0),
                "impressions": int(row.impressions or 0),
                "conversions": int(row.conversions or 0),
                "ctr": float(row.ctr or 0),
                "cpc": float(row.cpc or 0),
                "cpa": float(row.cpa or 0)
            })

        # ==================== 5. UTM SOURCES ====================
        # Get UTM data from fact_leads table
        utm_query = text("""
            SELECT
                created_date_txt::date as date,
                utm_source,
                utm_medium,
                utm_campaign,
                dominant_platform as platform,
                COUNT(DISTINCT sk_lead) as sessions,
                COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END) as conversions,
                0.0 as spend,
                CASE WHEN COUNT(DISTINCT sk_lead) > 0
                    THEN (COUNT(DISTINCT CASE WHEN contract_amount > 0 THEN sk_lead END)::float / COUNT(DISTINCT sk_lead)) * 100
                    ELSE 0
                END as conv_rate,
                NULL::float as cpa,
                NULL::float as cps
            FROM dashboards.fact_leads
            WHERE created_date_txt::date BETWEEN :date_from AND :date_to
              AND utm_source IS NOT NULL
              AND utm_source != ''
            GROUP BY created_date_txt::date, utm_source, utm_medium, utm_campaign, dominant_platform
            ORDER BY date DESC, conversions DESC NULLS LAST
            LIMIT 100
        """)

        result = await db.execute(utm_query, {"date_from": date_from_obj, "date_to": date_to_obj})
        utm_raw = result.fetchall()

        utm = []
        for row in utm_raw:
            utm.append({
                "date": row.date.strftime("%Y-%m-%d") if row.date else "",
                "utm_source": row.utm_source or "(not set)",
                "utm_medium": row.utm_medium or "(not set)",
                "utm_campaign": row.utm_campaign or "(not set)",
                "platform": row.platform or "unknown",
                "sessions": int(row.sessions or 0),
                "conversions": int(row.conversions or 0),
                "spend": float(row.spend or 0),
                "conv_rate": float(row.conv_rate or 0),
                "cpa": float(row.cpa) if row.cpa else None,
                "cps": float(row.cps) if row.cps else None
            })

        return {
            "status": "success",
            "date_range": {
                "from": date_from,
                "to": date_to
            },
            "data_sources": {
                "facebook": "raw.fb_ad_insights",
                "google_ads": "raw.google_ads_campaign_daily",
                "utm": "dashboards.fact_leads"
            },
            "daily": daily,
            "campaigns": campaigns,
            "adGroups": adGroups,
            "platforms": platforms,
            "utm": utm,
            "totals": {
                "total_spend": sum(p["spend"] for p in platforms),
                "total_clicks": sum(p["clicks"] for p in platforms),
                "total_impressions": sum(p["impressions"] for p in platforms),
                "total_conversions": sum(p["conversions"] for p in platforms),
                "avg_ctr": sum(p["ctr"] * p["impressions"] for p in platforms) / sum(p["impressions"] for p in platforms) if sum(p["impressions"] for p in platforms) > 0 else 0,
                "avg_cpc": sum(p["spend"] for p in platforms) / sum(p["clicks"] for p in platforms) if sum(p["clicks"] for p in platforms) > 0 else 0
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
