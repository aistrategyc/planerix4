from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date, timedelta
from typing import Optional, List

from liderix_api.db import get_itstep_session
from liderix_api.schemas.analytics import (
    CampaignMetrics,
    CreativeMetrics,
    CreativeBurnout,
    TimeSeriesPoint,
    FunnelAnalysis,
    FunnelStage
)

router = APIRouter()

@router.get("/test")
async def get_sales_analytics_test():
    """Test endpoint without database dependency"""
    return {
        "status": "success",
        "message": "Analytics endpoint is working!",
        "data": {
            "daily": [
                {"date": "2025-09-29", "contract_count": 15, "total_revenue": 45000},
                {"date": "2025-09-28", "contract_count": 18, "total_revenue": 52000},
                {"date": "2025-09-27", "contract_count": 12, "total_revenue": 38000}
            ],
            "byBranch": [
                {"branch_name": "Киев", "contract_count": 25, "total_revenue": 75000},
                {"branch_name": "Львов", "contract_count": 15, "total_revenue": 45000}
            ]
        }
    }


@router.get("/revenue-trend")
async def get_revenue_trend(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get daily revenue trend from campaign results"""
    try:
        revenue_query = text("""
            SELECT
                date,
                SUM(revenue) as daily_revenue,
                SUM(contracts) as daily_contracts
            FROM dm.dm_campaign_results_daily_v3
            WHERE date >= :start_date AND date <= :end_date
            GROUP BY date
            ORDER BY date
        """)

        result = await session.execute(
            revenue_query,
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return {
            "status": "success",
            "data": [
                {
                    "date": row.date.isoformat(),
                    "revenue": float(row.daily_revenue or 0),
                    "contracts": int(row.daily_contracts or 0)
                }
                for row in rows
            ]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/by-products")
async def get_sales_by_products(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get sales performance by products"""
    try:
        products_query = text("""
            SELECT
                product_key,
                SUM(contracts) as total_contracts,
                SUM(revenue) as total_revenue,
                AVG(revenue / NULLIF(contracts, 0)) as avg_contract_value
            FROM dm.dm_campaign_contracts_by_product_v1
            WHERE date >= :start_date AND date <= :end_date
              AND product_key IS NOT NULL
            GROUP BY product_key
            ORDER BY total_revenue DESC
        """)

        result = await session.execute(
            products_query,
            {"start_date": start_date, "end_date": end_date}
        )
        rows = result.fetchall()

        return {
            "status": "success",
            "data": [
                {
                    "product_key": row.product_key,
                    "contracts": int(row.total_contracts or 0),
                    "revenue": float(row.total_revenue or 0),
                    "avg_value": float(row.avg_contract_value or 0)
                }
                for row in rows
            ]
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/conversion-funnel")
async def get_conversion_funnel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_itstep_session)
):
    """Get conversion funnel from impressions to contracts"""
    try:
        funnel_query = text("""
            WITH funnel_data AS (
                SELECT
                    SUM(impressions) as impressions,
                    SUM(clicks) as clicks,
                    SUM(contracts) as contracts
                FROM dm.dm_campaign_results_daily_v3
                WHERE date >= :start_date AND date <= :end_date
            ),
            leads_data AS (
                SELECT COUNT(*) as leads
                FROM staging.crm_requests
                WHERE DATE(request_created_at) >= :start_date
                  AND DATE(request_created_at) <= :end_date
            )
            SELECT
                f.impressions,
                f.clicks,
                l.leads,
                f.contracts
            FROM funnel_data f, leads_data l
        """)

        result = await session.execute(
            funnel_query,
            {"start_date": start_date, "end_date": end_date}
        )
        row = result.fetchone()

        impressions = int(row.impressions or 0)
        clicks = int(row.clicks or 0)
        leads = int(row.leads or 0)
        contracts = int(row.contracts or 0)

        # Calculate conversion rates
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        lead_rate = (leads / clicks * 100) if clicks > 0 else 0
        conversion_rate = (contracts / leads * 100) if leads > 0 else 0

        stages = [
            FunnelStage(
                stage="Impressions",
                count=impressions,
                conversion_rate=100.0,
                drop_off_rate=0.0
            ),
            FunnelStage(
                stage="Clicks",
                count=clicks,
                conversion_rate=ctr,
                drop_off_rate=100.0 - ctr
            ),
            FunnelStage(
                stage="Leads",
                count=leads,
                conversion_rate=lead_rate,
                drop_off_rate=100.0 - lead_rate
            ),
            FunnelStage(
                stage="Contracts",
                count=contracts,
                conversion_rate=conversion_rate,
                drop_off_rate=100.0 - conversion_rate
            )
        ]

        return {
            "status": "success",
            "stages": [stage.dict() for stage in stages],
            "overall_conversion": (contracts / impressions * 100) if impressions > 0 else 0
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/debug")
async def debug_table_structure(session: AsyncSession = Depends(get_itstep_session)):
    """Debug endpoint to show table structure and sample data"""
    try:
        # Получаем структуру таблицы
        structure_query = text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'dwh' AND table_name = 'fact_contracts'
            ORDER BY ordinal_position
        """)

        structure_data = await session.execute(structure_query)
        columns = [dict(row._mapping) for row in structure_data.fetchall()]

        # Получаем несколько записей для примера
        sample_query = text("SELECT * FROM dwh.fact_contracts LIMIT 3")
        sample_data = await session.execute(sample_query)
        samples = [dict(row._mapping) for row in sample_data.fetchall()]

        return {
            "status": "success",
            "table_structure": columns,
            "sample_data": samples
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/")
async def get_sales_analytics(
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    session: AsyncSession = Depends(get_itstep_session),
):
    """
    Sales analytics endpoint with real ITstep data from dm/dwh schemas
    """

    try:
        today = date.today()
        default_from = today - timedelta(days=30)
        default_to = today

        params = {
            "from_date": from_date.date() if from_date else default_from,
            "to_date": to_date.date() if to_date else default_to,
        }

        # Сначала проверим структуру таблицы
        structure_query = text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'dwh' AND table_name = 'fact_contracts'
            ORDER BY ordinal_position
            LIMIT 20
        """)

        structure_data = await session.execute(structure_query)
        columns = [dict(row._mapping) for row in structure_data.fetchall()]

        # Получаем данные контрактов из dwh с правильными колонками
        contracts_query = text("""
            SELECT
                contract_signed_at::date as date,
                COUNT(*) as contract_count,
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount * 0.3 ELSE 0 END), 0) as total_first_sum
            FROM dwh.fact_contracts fc
            WHERE contract_signed_at >= :from_date
              AND contract_signed_at <= :to_date
              AND contract_signed_at IS NOT NULL
            GROUP BY contract_signed_at::date
            ORDER BY date DESC
            LIMIT 30
        """)

        daily_data = await session.execute(contracts_query, params)
        daily_results = [dict(row._mapping) for row in daily_data.fetchall()]

        # Получаем данные по продуктам (используя product_key напрямую)
        product_query = text("""
            SELECT
                COALESCE(product_key, 'unknown') as service_name,
                COUNT(contract_id) as contract_count,
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount * 0.3 ELSE 0 END), 0) as total_first_sum
            FROM dwh.fact_contracts fc
            WHERE contract_signed_at >= :from_date
              AND contract_signed_at <= :to_date
              AND contract_signed_at IS NOT NULL
            GROUP BY product_key
            ORDER BY total_revenue DESC
            LIMIT 10
        """)

        product_data = await session.execute(product_query, params)
        product_results = [dict(row._mapping) for row in product_data.fetchall()]

        # Для филиалов используем платформу как группировку
        branch_query = text("""
            SELECT
                COALESCE(platform, 'direct') as branch_name,
                COUNT(contract_id) as contract_count,
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount * 0.3 ELSE 0 END), 0) as total_first_sum
            FROM dwh.fact_contracts fc
            WHERE contract_signed_at >= :from_date
              AND contract_signed_at <= :to_date
              AND contract_signed_at IS NOT NULL
            GROUP BY platform
            ORDER BY total_revenue DESC
            LIMIT 10
        """)

        branch_data = await session.execute(branch_query, params)
        branch_results = [dict(row._mapping) for row in branch_data.fetchall()]

        # Недельные данные
        weekly_query = text("""
            SELECT
                DATE_TRUNC('week', contract_signed_at)::date as week_start,
                COALESCE(SUM(amount), 0) as total_revenue
            FROM dwh.fact_contracts fc
            WHERE contract_signed_at >= :from_date
              AND contract_signed_at <= :to_date
              AND contract_signed_at IS NOT NULL
            GROUP BY DATE_TRUNC('week', contract_signed_at)
            ORDER BY week_start DESC
            LIMIT 8
        """)

        weekly_data = await session.execute(weekly_query, params)
        weekly_results = [dict(row._mapping) for row in weekly_data.fetchall()]

        return {
            "status": "success",
            "message": "Real ITstep analytics data",
            "data_period": {
                "from": str(params["from_date"]),
                "to": str(params["to_date"])
            },
            "daily": daily_results,
            "weekly": weekly_results,
            "byService": product_results,
            "byBranch": branch_results,
            "byUtm": []  # UTM данных пока нет в доступных таблицах
        }

    except Exception as e:
        # В случае ошибки возвращаем mock данные
        return {
            "status": "error_fallback",
            "message": f"Error accessing real data, using mock data: {str(e)}",
            "daily": [
                {"date": "2025-09-29", "contract_count": 15, "total_revenue": 45000, "total_first_sum": 12000},
                {"date": "2025-09-28", "contract_count": 18, "total_revenue": 52000, "total_first_sum": 14000}
            ],
            "weekly": [],
            "byService": [],
            "byBranch": [],
            "byUtm": []
        }