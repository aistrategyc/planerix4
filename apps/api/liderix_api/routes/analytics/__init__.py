from fastapi import APIRouter
from . import sales, ads, marketing, overview, creatives, campaigns, dashboard

router = APIRouter()

# Main dashboard endpoints
router.include_router(overview.router, prefix="/overview", tags=["Dashboard Overview"])

# Analytics dashboard - direct endpoints without prefix for /api/analytics/dashboard
router.include_router(dashboard.router, tags=["Analytics Dashboard"])

# Sales analytics
router.include_router(sales.router, prefix="/sales", tags=["Sales Analytics"])

# Campaign analytics
router.include_router(campaigns.router, prefix="/campaigns", tags=["Campaign Analytics"])

# Creative analytics
router.include_router(creatives.router, prefix="/creatives", tags=["Creative Analytics"])

# Platform analytics
router.include_router(ads.router, prefix="/ads", tags=["Ads Analytics"])
router.include_router(marketing.router, prefix="/marketing", tags=["Marketing Analytics"])