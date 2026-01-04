#!/bin/bash

echo "=== Testando Backend NR12 ==="
echo ""

echo "1. Testando Health Check:"
curl -s https://nr12-backend.onrender.com/api/v1/health/
echo ""
echo ""

echo "2. Testando Login:"
RESPONSE=$(curl -s -c /tmp/nr12_cookies.txt -X POST "https://nr12-backend.onrender.com/api/v1/auth/login/" \
  -H "Content-Type: application/json" \
  -H "Origin: https://nr12-frontend.onrender.com" \
  -d '{"username":"admin","password":"admin123"}')
echo "$RESPONSE"
echo ""
echo ""

echo "3. Testando /me/ com cookie:"
curl -s -b /tmp/nr12_cookies.txt "https://nr12-backend.onrender.com/api/v1/me/"
echo ""
echo ""

echo "4. Cookies salvos:"
cat /tmp/nr12_cookies.txt 2>/dev/null | grep -v "^#"
echo ""

