#!/bin/bash

# API Testing Script
# Tests all key endpoints after creating a test brand
# Usage: bash scripts/test-api.sh

echo "🧪 Analytics Dashboard API Testing"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"
SLUG="test-store"

echo "ℹ️  Make sure the dev server is running (npm run dev)"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Fetch all brands
echo -e "${YELLOW}Test 1: GET /api/brands${NC}"
echo "Testing if brands list endpoint works..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/brands")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  echo "Response: $(echo "$body" | jq -r '.[0].name // "No brands" | @json')"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

# Test 2: Fetch single brand
echo -e "${YELLOW}Test 2: GET /api/brands?slug=$SLUG${NC}"
echo "Testing if single brand fetch works..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/brands?slug=$SLUG")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  brand_name=$(echo "$body" | jq -r '.name')
  echo "Found brand: $brand_name"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

# Test 3: Shopify endpoint (will fail with fake creds, but endpoint should respond)
echo -e "${YELLOW}Test 3: POST /api/shopify (status check)${NC}"
echo "Testing if Shopify endpoint is accessible..."
response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/shopify" \
  -H "Content-Type: application/json" \
  -d "{\"slug\": \"$SLUG\"}")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ] || [ "$http_code" = "400" ] || [ "$http_code" = "500" ]; then
  echo -e "${GREEN}✅ Endpoint responds${NC} (HTTP $http_code)"
  echo "Note: Will fail with fake credentials, but endpoint is reachable"
else
  echo -e "${RED}❌ Endpoint not responding${NC} (HTTP $http_code)"
fi
echo ""

# Test 4: Custom Dashboard page load
echo -e "${YELLOW}Test 4: GET /dashboard/$SLUG/custom (page check)${NC}"
echo "Testing if custom dashboard page loads..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/dashboard/$SLUG/custom")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  echo "Page is accessible"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

# Test 5: AI Chat page load
echo -e "${YELLOW}Test 5: GET /dashboard/$SLUG/chat (page check)${NC}"
echo "Testing if AI chat page loads..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/dashboard/$SLUG/chat")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  echo "Page is accessible"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

# Test 6: Forecast page load
echo -e "${YELLOW}Test 6: GET /dashboard/$SLUG/forecast (page check)${NC}"
echo "Testing if forecast page loads..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/dashboard/$SLUG/forecast")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  echo "Page is accessible"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

# Test 7: Social page load
echo -e "${YELLOW}Test 7: GET /dashboard/$SLUG/social (page check)${NC}"
echo "Testing if social page loads..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/dashboard/$SLUG/social")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  echo "Page is accessible"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

# Test 8: Settings page load
echo -e "${YELLOW}Test 8: GET /dashboard/$SLUG/settings (page check)${NC}"
echo "Testing if settings page loads..."
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/dashboard/$SLUG/settings")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
  echo "Page is accessible"
else
  echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
fi
echo ""

echo -e "${GREEN}=================================="
echo "Testing complete!"
echo "==================================${NC}"
echo ""
echo "📝 Manual Testing Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. You should see 'Test Store' in the brands list"
echo "3. Click on it to access the dashboard"
echo "4. Try each feature:"
echo "   - Custom Dashboard: Add widgets from different platforms"
echo "   - AI Chat: Type a message to test streaming responses"
echo "   - Forecast: View 30/60/90 day revenue/order predictions"
echo "   - Social: View sentiment analysis (if Meta connected)"
echo "   - Settings: Check new TikTok/Klaviyo connection guides"
echo ""
