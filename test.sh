#!/usr/bin/env bash
# verify.sh — Health check for the deployed Order Management API
# Usage: ./verify.sh [host] [port]

set -u

HOST="${1:-192.168.0.150}"
PORT="${2:-3000}"
BASE_URL="http://${HOST}:${PORT}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # no color

PASS=0
FAIL=0

check() {
    local description="$1"
    local url="$2"
    local expected_status="$3"
    local method="${4:-GET}"
    local body="${5:-}"

    echo -n "→ ${description} ... "

    if [[ -n "$body" ]]; then
        actual=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$body" \
            "$url" --max-time 10)
    else
        actual=$(curl -s -o /dev/null -w "%{http_code}" \
            -X "$method" \
            "$url" --max-time 10)
    fi

    if [[ "$actual" == "$expected_status" ]]; then
        echo -e "${GREEN}PASS${NC} (got $actual)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC} (expected $expected_status, got $actual)"
        FAIL=$((FAIL + 1))
    fi
}

echo "================================================"
echo " Verifying deployment at ${BASE_URL}"
echo "================================================"

check "GET /orders returns 200"               "${BASE_URL}/orders"                          "200"
check "GET /orders/bad-id returns 404"        "${BASE_URL}/orders/00000000-0000-0000-0000-000000000000" "404"
check "GET /unknown-route returns 404"        "${BASE_URL}/unknown-route"                  "404"
check "POST /orders (valid) returns 201"      "${BASE_URL}/orders" "201" "POST" \
      '{"customer":"VerifyScript","product":"Widget","quantity":1}'
check "POST /orders (missing fields) returns 400" "${BASE_URL}/orders" "400" "POST" \
      '{"customer":"VerifyScript"}'

echo "================================================"
echo -e " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo "================================================"

if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN}✅ Deployment verified successfully.${NC}"
    exit 0
else
    echo -e "${RED}❌ Verification failed.${NC}"
    exit 1
fi
