#!/bin/bash

echo "Testing Complete User Flow"
echo "=========================="
echo ""

BASE_URL="https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai"

echo "1. User visits homepage..."
HOMEPAGE=$(curl -s "$BASE_URL/" | grep -o "root" | head -1)
if [ "$HOMEPAGE" = "root" ]; then
    echo "   ✓ Homepage loads with React root element"
else
    echo "   ✗ Homepage issue detected"
fi

echo ""
echo "2. User browses listings..."
LISTINGS=$(curl -s "$BASE_URL/api/villas?limit=3" | grep -o "villa_" | wc -l)
if [ "$LISTINGS" -gt 0 ]; then
    echo "   ✓ Listings API returning data ($LISTINGS items)"
else
    echo "   ✗ No listings returned"
fi

echo ""
echo "3. User views listing details..."
FIRST_VILLA=$(curl -s "$BASE_URL/api/villas?limit=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$FIRST_VILLA" ]; then
    DETAILS=$(curl -s "$BASE_URL/api/villas/$FIRST_VILLA" | grep -o '"title"' | head -1)
    if [ "$DETAILS" = '"title"' ]; then
        echo "   ✓ Villa details API working for ID: $FIRST_VILLA"
    else
        echo "   ✗ Villa details API issue"
    fi
else
    echo "   ⚠ Could not extract villa ID for testing"
fi

echo ""
echo "4. User checks amenities..."
AMENITIES=$(curl -s "$BASE_URL/api/amenities" | grep -o '"name"' | wc -l)
if [ "$AMENITIES" -gt 0 ]; then
    echo "   ✓ Amenities API returning data ($AMENITIES items)"
else
    echo "   ✗ No amenities returned"
fi

echo ""
echo "5. Protected routes (requires auth)..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/users/me")
if [ "$AUTH_STATUS" = "401" ]; then
    echo "   ✓ Protected routes correctly require authentication"
else
    echo "   ⚠ Unexpected auth status: $AUTH_STATUS"
fi

echo ""
echo "6. Static assets..."
JS_SIZE=$(curl -s -I "$BASE_URL/assets/index-C1JxwpEq.js" | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
if [ -n "$JS_SIZE" ]; then
    echo "   ✓ JavaScript bundle served ($JS_SIZE bytes)"
else
    echo "   ⚠ Could not determine JS bundle size"
fi

echo ""
echo "=========================="
echo "User Flow Test Complete"
echo "=========================="
