from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_ads_analytics():
    """Mock ads analytics endpoint"""
    return {
        "status": "success",
        "message": "Ads analytics with mock data for ITstep",
        "daily": [
            {"date": "2025-09-29", "spend": 5000, "clicks": 250, "impressions": 12500, "ctr": 2.0, "cpc": 20.0, "cpm": 400},
            {"date": "2025-09-28", "spend": 4500, "clicks": 225, "impressions": 11250, "ctr": 2.0, "cpc": 20.0, "cpm": 400},
            {"date": "2025-09-27", "spend": 5500, "clicks": 275, "impressions": 13750, "ctr": 2.0, "cpc": 20.0, "cpm": 400}
        ],
        "campaigns": [
            {"campaign_name": "Курс Full Stack", "spend": 15000, "clicks": 750, "impressions": 37500},
            {"campaign_name": "UI/UX Design", "spend": 12000, "clicks": 600, "impressions": 30000}
        ],
        "platforms": [
            {"platform": "Google Ads", "spend": 20000, "clicks": 1000, "impressions": 50000},
            {"platform": "Facebook Ads", "spend": 15000, "clicks": 750, "impressions": 37500}
        ]
    }