#!/bin/bash
# R2からPDFを_sources/にダウンロード
# Usage: ./scripts/fetch-source-pdf.sh "奥義/01_土木共通/.../file.pdf" "_sources/general/"
#
# 例:
#   ./scripts/fetch-source-pdf.sh \
#     "奥義/01_土木共通/03_積算・施工/90_1級土木施工管理技士試験/１級土木施工管理第１次試験問題集" \
#     "_sources/general/"

set -euo pipefail

R2_REMOTE="obsidian-r2:obsidian-pdf"
R2_KEY="${1:?Usage: $0 <r2-key> <local-dest>}"
LOCAL_DEST="${2:?Usage: $0 <r2-key> <local-dest>}"

mkdir -p "$LOCAL_DEST"

echo "Fetching from R2: $R2_KEY → $LOCAL_DEST"
rclone copy "$R2_REMOTE/$R2_KEY" "$LOCAL_DEST" --progress --transfers 4

echo "Done."
