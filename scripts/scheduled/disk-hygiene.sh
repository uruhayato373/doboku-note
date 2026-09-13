#!/bin/bash
# launchd から日次で呼ばれるラッパー（com.doboku-note.disk-hygiene）。
# Claude Code と Codex のどちらのフックにも依存せず掃除を回すのが目的。
# 導入・状態確認・解除: npm run disk-hygiene:install [-- --status|--uninstall|--run-now]

set -euo pipefail

# launchd の PATH は最小なので node を明示的に通す。
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LANG="ja_JP.UTF-8"
export LC_ALL="ja_JP.UTF-8"

PROJECT_DIR="/Users/minamidaisuke/doboku-note"
LOG_DIR="$HOME/Library/Logs/doboku-note"
LOG_FILE="$LOG_DIR/disk-hygiene.log"
mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"
{
  echo ""
  echo "=== $(date -Iseconds) [disk-hygiene] start ==="
} >> "$LOG_FILE"

if node scripts/disk-hygiene.mjs --fix >> "$LOG_FILE" 2>&1; then
  echo "=== $(date -Iseconds) [disk-hygiene] ok ===" >> "$LOG_FILE"
else
  rc=$?
  # 完走できなかったときは stamp が更新されないので、次のセッション開始で
  # 「日次掃除が止まっている」と警告が出る（沈黙で溜まるのを防ぐ）。
  echo "=== $(date -Iseconds) [disk-hygiene] FAILED rc=${rc} ===" >> "$LOG_FILE"
  exit $rc
fi
