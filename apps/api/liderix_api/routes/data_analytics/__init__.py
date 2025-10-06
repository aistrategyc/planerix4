"""
Data Analytics routes for ITstep client
Includes v5 (basic + advanced) and v6 (recommendations) endpoints
Updated: October 6, 2025
"""
from fastapi import APIRouter

# Import all subroutes (v5 basic endpoints)
from . import kpi, trends, campaigns, utm_sources, share

# Import v5 advanced endpoints
from . import scatter_matrix, anomalies, paid_split

# Import v4 compare endpoints
from . import kpi_compare, trends_compare, campaigns_compare, share_compare, top_movers, budget_recommendations

router = APIRouter()

# Include v5 basic data analytics subroutes
router.include_router(kpi.router, prefix="/v5", tags=["Data Analytics v5 - KPI"])
router.include_router(trends.router, prefix="/v5/trend", tags=["Data Analytics v5 - Trends"])
router.include_router(campaigns.router, prefix="/v5/campaigns", tags=["Data Analytics v5 - Campaigns"])
router.include_router(utm_sources.router, prefix="/v5", tags=["Data Analytics v5 - UTM Sources"])
router.include_router(share.router, prefix="/v5/share", tags=["Data Analytics v5 - Share"])

# Include v5 advanced endpoints (Oct 6, 2025)
router.include_router(scatter_matrix.router, prefix="/v5/campaigns", tags=["Data Analytics v5 - Advanced"])
router.include_router(anomalies.router, prefix="/v5/campaigns", tags=["Data Analytics v5 - Advanced"])

# Include v4 compare endpoints
router.include_router(kpi_compare.router, prefix="/v5", tags=["Data Analytics v5 - Compare"])
router.include_router(trends_compare.router, prefix="/v5", tags=["Data Analytics v5 - Compare"])
router.include_router(campaigns_compare.router, prefix="/v5", tags=["Data Analytics v5 - Compare"])
router.include_router(share_compare.router, prefix="/v5", tags=["Data Analytics v5 - Compare"])
router.include_router(top_movers.router, prefix="/v5", tags=["Data Analytics v5 - Top Movers"])

# Include v6 recommendations and paid split
router.include_router(budget_recommendations.router, prefix="/v6", tags=["Data Analytics v6 - Recommendations"])
router.include_router(paid_split.router, prefix="/v6/leads/paid-split", tags=["Data Analytics v6 - Paid Split"])
