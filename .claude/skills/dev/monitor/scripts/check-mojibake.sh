#!/usr/bin/env bash
# Unicode置換文字 (U+FFFD) をMDXファイルからリアルタイム検出する
# Monitor tool用: stdoutの各行がイベント通知になる

CONTENT_DIR="content/site"
INTERVAL="${1:-15}"  # デフォルト15秒間隔

# プロジェクトルートに移動（scripts/ は .claude/skills/dev/monitor/scripts/ にある）
cd "$(dirname "$0")/../../../../.." || exit 1

echo "Monitoring MDX files for mojibake (U+FFFD) every ${INTERVAL}s..."

while true; do
  # U+FFFD (EF BF BD) を含むファイルを検索
  hits=$(grep -rn $'\xEF\xBF\xBD' "$CONTENT_DIR" --include="*.mdx" 2>/dev/null)
  if [ -n "$hits" ]; then
    count=$(echo "$hits" | wc -l)
    echo "MOJIBAKE DETECTED: ${count} occurrence(s)"
    echo "$hits" | head -10
    if [ "$count" -gt 10 ]; then
      echo "  ... and $((count - 10)) more"
    fi
  fi
  sleep "$INTERVAL"
done
