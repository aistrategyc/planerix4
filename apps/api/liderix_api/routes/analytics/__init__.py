from fastapi import APIRouter
from . import sales, ads, marketing, overview, creatives, campaigns, dashboard, campaigns_v6, contracts

router = APIRouter()

# Main dashboard endpoints
router.include_router(overview.router, prefix="/overview", tags=["Dashboard Overview"])

# Analytics dashboard - direct endpoints without prefix for /api/analytics/dashboard
router.include_router(dashboard.router, tags=["Analytics Dashboard"])

# Contracts attribution analytics (v6 endpoints)
router.include_router(contracts.router, prefix="/contracts", tags=["Contracts Attribution"])

# Sales analytics (v5/v6 endpoints)
router.include_router(sales.router, prefix="/sales", tags=["Sales Analytics"])

# Campaign analytics (legacy)
router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaign Analytics"])

# Campaign analytics v6 (new v5/v7 endpoints)
router.include_router(campaigns_v6.router, prefix="/campaigns", tags=["Campaigns Analytics v6"])

# Creative analytics
router.include_router(creatives.router, prefix="/creatives", tags=["Creative Analytics"])

# Platform analytics
# Note: /ads registered first to avoid conflict with /marketing/* routes
router.include_router(ads.router, prefix="/ads", tags=["Ads Analytics"])
router.include_router(marketing.router, prefix="/marketing", tags=["Marketing Analytics"])