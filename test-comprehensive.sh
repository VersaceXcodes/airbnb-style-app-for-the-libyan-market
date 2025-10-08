#!/bin/bash

echo "==================================="
echo "Comprehensive Application Test"
echo "==================================="
echo ""

BASE_URL="https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai"

echo "1. Testing Homepage..."
HOMEPAGE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$HOMEPAGE" = "200" ]; then
    echo "   ✓ Homepage: OK (200)"
else
    echo "   ✗ Homepage: FAIL ($HOMEPAGE)"
fi

echo ""
echo "2. Testing Static Assets..."
JS_ASSET=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/index-C1JxwpEq.js")
if [ "$JS_ASSET" = "200" ]; then
    echo "   ✓ JavaScript Bundle: OK (200)"
else
    echo "   ✗ JavaScript Bundle: FAIL ($JS_ASSET)"
fi

CSS_ASSET=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/assets/index-BiidPS-R.css")
if [ "$CSS_ASSET" = "200" ]; then
    echo "   ✓ CSS Bundle: OK (200)"
else
    echo "   ✗ CSS Bundle: FAIL ($CSS_ASSET)"
fi

echo ""
echo "3. Testing API Endpoints..."

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$HEALTH" = "200" ]; then
    echo "   ✓ Health Check: OK (200)"
else
    echo "   ✗ Health Check: FAIL ($HEALTH)"
fi

VILLAS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/villas?limit=1")
if [ "$VILLAS" = "200" ]; then
    echo "   ✓ Villas API: OK (200)"
else
    echo "   ✗ Villas API: FAIL ($VILLAS)"
fi

AMENITIES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/amenities")
if [ "$AMENITIES" = "200" ]; then
    echo "   ✓ Amenities API: OK (200)"
else
    echo "   ✗ Amenities API: FAIL ($AMENITIES)"
fi

echo ""
echo "4. Testing API Error Handling..."
AUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users/me")
if [ "$AUTH_TEST" = "401" ]; then
    echo "   ✓ Protected Endpoint: Correctly returns 401"
else
    echo "   ✗ Protected Endpoint: Unexpected status ($AUTH_TEST)"
fi

echo ""
echo "5. Testing CORS Headers..."
CORS=$(curl -s -I -H "Origin: https://example.com" "$BASE_URL/api/health" | grep -i "access-control")
if [ -n "$CORS" ]; then
    echo "   ✓ CORS Headers: Present"
else
    echo "   ⚠ CORS Headers: Not detected (may be expected)"
fi

echo ""
echo "6. Testing Content Type..."
CONTENT_TYPE=$(curl -s -I "$BASE_URL/api/villas?limit=1" | grep -i "content-type" | grep "application/json")
if [ -n "$CONTENT_TYPE" ]; then
    echo "   ✓ JSON Content-Type: Correct"
else
    echo "   ✗ JSON Content-Type: Missing or incorrect"
fi

echo ""
echo "7. Testing Database Connection..."
VILLA_DATA=$(curl -s "$BASE_URL/api/villas?limit=1")
if echo "$VILLA_DATA" | grep -q "id"; then
    echo "   ✓ Database: Connected and returning data"
else
    echo "   ✗ Database: No data returned"
fi

echo ""
echo "==================================="
echo "Test Summary"
echo "==================================="
