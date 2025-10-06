#!/bin/bash

# Get authentication token
TOKEN=$(curl -s -X POST "https://api.planerix.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"itstep@itstep.com","password":"ITstep2025!"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "Testing DataAnalytics v5 Endpoints"
echo "===================================="
echo ""

# Test 1: KPI endpoint
echo "1. Testing v5/kpi..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/kpi?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 2: Trend Leads
echo "2. Testing v5/trend/leads..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/trend/leads?date_from=2025-09-01&date_to=2025-09-30&granularity=daily" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
echo ""

# Test 3: Trend Spend
echo "3. Testing v5/trend/spend..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/trend/spend?date_from=2025-09-01&date_to=2025-09-30&granularity=daily" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
echo ""

# Test 4: Platform Share
echo "4. Testing v5/share/platforms..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/share/platforms?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 5: Campaigns
echo "5. Testing v5/campaigns (Google)..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/campaigns?date_from=2025-09-01&date_to=2025-09-30&platform=google" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 6: UTM Sources
echo "6. Testing v5/utm-sources..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/utm-sources?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 7: WoW Campaigns
echo "7. Testing v5/campaigns/wow..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/campaigns/wow?date_from=2025-09-22&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 8: Scatter Matrix
echo "8. Testing v5/campaigns/scatter-matrix..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/campaigns/scatter-matrix?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

# Test 9: Paid Split Platforms
echo "9. Testing v6/leads/paid-split/platforms..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v6/leads/paid-split/platforms?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 10: Anomalies
echo "10. Testing v5/campaigns/anomalies..."
curl -s -X GET "https://api.planerix.com/api/data-analytics/v5/campaigns/anomalies?date_from=2025-09-01&date_to=2025-09-30" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
echo ""

echo "===================================="
echo "Testing complete!"
