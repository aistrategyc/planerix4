from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from schemas.analytics import KPIMetrics

async def get_kpi_metrics(db: AsyncSession) -> KPIMetrics:
    """
    Получает ключевые KPI-метрики: выручку, прибыль, CR, CAC
    из представления analytics.vw_financial_metrics
    """
    query = text("""
        SELECT 
            SUM(revenue) AS revenue,
            SUM(profit) AS profit,
            AVG(conversion_rate) AS cr,
            AVG(cac) AS cac
        FROM analytics.vw_financial_metrics
    """)

        result = await db.execute(query)
        row = result.fetchone()
        
        if not row:
            # если вообще нет данных, вернуть нули
            return KPIMetrics(revenue=0, profit=0, cr=0, cac=0)

        return KPIMetrics(
            revenue=row.revenue or 0,
            profit=row.profit or 0,
            cr=row.cr or 0,
            cac=row.cac or 0
        )
    except Exception as e:
        # можно подключить логгер здесь
        print(f"[ERROR] Failed to fetch KPI metrics: {e}")
        return KPIMetrics(revenue=0, profit=0, cr=0, cac=0)