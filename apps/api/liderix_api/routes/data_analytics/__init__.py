"""
Data Analytics routes for ITstep client
Includes v3 (basic) and v4 (compare) endpoints
"""
from fastapi import APIRouter

# Import all subroutes (v3 basic endpoints)
from . import kpi, trends, campaigns, utm_sources, share

# Import v4 compare endpoints
from . import kpi_compare, trends_compare, campaigns_compare, share_compare, top_movers, budget_recommendations

router = APIRouter()

# Include v3 basic data analytics subroutes
router.include_router(kpi.router, prefix="/v5", tags=["Data Analytics - KPI"])
router.include_router(trends.router, prefix="/v5/trend", tags=["Data Analytics - Trends"])
router.include_router(campaigns.router, prefix="/v5/campaigns", tags=["Data Analytics - Campaigns"])
router.include_router(utm_sources.router, prefix="/v5", tags=["Data Analytics - UTM Sources"])
router.include_router(share.router, prefix="/v5/share", tags=["Data Analytics - Share"])

# Include v4 compare endpoints
router.include_router(kpi_compare.router, prefix="/v5", tags=["Data Analytics v4 - Compare"])
router.include_router(trends_compare.router, prefix="/v5", tags=["Data Analytics v4 - Compare"])
router.include_router(campaigns_compare.router, prefix="/v5", tags=["Data Analytics v4 - Compare"])
router.include_router(share_compare.router, prefix="/v5", tags=["Data Analytics v4 - Compare"])
router.include_router(top_movers.router, prefix="/v5", tags=["Data Analytics v4 - Top Movers"])

# Include v6 recommendations
router.include_router(budget_recommendations.router, prefix="/v6", tags=["Data Analytics v6 - Recommendations"])
