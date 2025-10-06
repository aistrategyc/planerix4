#!/bin/bash

# Get authentication token
TOKEN=$(curl -s -X POST "https://api.planerix.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"itstep@itstep.com","password":"ITstep2025!"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "Testing DataAnalytics v5/v6 Endpoints - Part 2"
echo "=============================================="
echo ""

# Test 11: Campaign Compare (PoP)
echo "11. Testing v5/campaigns/compare..."
curl -s -X POST "https://api.planerix.com/api/data-analytics/v5/campaigns/compare" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date_from":"2025-09-16","date_to":"2025-09-30","prev_date_from":"2025-09-01","prev_date_to":"2025-09-15","platform":"meta"}' | \
  python3 -m json.tool | head -40
echo ""

# Test 12: Top Movers
echo "12. Testing v5/campaigns/top-movers..."
curl -s -X POST "https://api.planerix.com/api/data-analytics/v5/campaigns/top-movers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date_from":"2025-09-16","date_to":"2025-09-30","prev_date_from":"2025-09-01","prev_date_to":"2025-09-15"}' | \
  python3 -m json.tool | head -50
echo ""

# Test 13: Budget Recommendations
echo "13. Testing v6/reco/budget..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/reco/budget?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 14: Paid Split Campaigns
echo "14. Testing v6/leads/paid-split/campaigns..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/leads/paid-split/campaigns?date_from=2025-09-01&date_to=2025-09-30&platform=meta" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 15: Campaign Overview (Google)
echo "15. Testing v6/campaigns/google/overview..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/campaigns/google/21662576767/overview?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 16: Campaign AdGroups (Google)
echo "16. Testing v6/campaigns/google/adgroups..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/campaigns/google/21662576767/adgroups?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 17: Campaign Search Terms (Google)
echo "17. Testing v6/campaigns/google/search-terms..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/campaigns/google/21662576767/search-terms?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 18: Campaign AdSets (Meta)
echo "18. Testing v6/campaigns/meta/adsets..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/campaigns/meta/120233384854330479/adsets?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 19: Meta Leads
echo "19. Testing v6/leads/meta..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/leads/meta?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 20: Contracts Summary
echo "20. Testing v6/contracts/summary..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/contracts/summary?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 21: Google Contracts
echo "21. Testing v6/contracts/google..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/contracts/google?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

echo "=============================================="
echo "Testing complete!"
