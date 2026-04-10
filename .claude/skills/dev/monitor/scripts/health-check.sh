#!/usr/bin/env bash
# デプロイ後のヘルスチェック: 主要URLのHTTPステータスを検証
# Monitor tool用: stdoutの各行がイベント通知になる
#
# Usage:
#   bash .claude/skills/dev/monitor/scripts/health-check.sh [wait_sec]

WAIT="${1:-30}"
BASE_URL="https://doboku-note.com"
STORAGE_URL="https://storage.doboku-note.com"

echo "Waiting ${WAIT}s for deploy propagation..."
sleep "$WAIT"

urls=(
  "$BASE_URL/"
  "$BASE_URL/docs/civil-construction-1-guide-strategy"
  "$BASE_URL/docs/pe-comprehensive-management-exam-index"
  "$BASE_URL/category/civil-construction-1"
  "$BASE_URL/search"
  "$STORAGE_URL/posts/pe-comprehensive-management/followership/article.mdx"
)

failed=0
passed=0

for url in "${urls[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "TIMEOUT")
  if [ "$status" = "200" ]; then
    echo "OK ($status): $url"
    passed=$((passed + 1))
  else
    echo "FAILED ($status): $url"
    failed=$((failed + 1))
  fi
done

echo "---"
if [ "$failed" -eq 0 ]; then
  echo "HEALTH CHECK PASSED: all $passed URLs OK"
else
  echo "HEALTH CHECK FAILED: $failed/$((passed + failed)) URLs failed"
fi
