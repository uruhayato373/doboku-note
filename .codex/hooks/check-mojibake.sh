#!/bin/bash
# MDXファイルの文字化け（U+FFFD）を検出するPostToolUseフック
# Write/Edit後に自動実行される

FILE_PATH="$TOOL_INPUT_FILE_PATH"

# .mdx ファイル以外はスキップ
case "$FILE_PATH" in
  *.mdx) ;;
  *) exit 0 ;;
esac

# U+FFFD (UTF-8: 0xEF 0xBF 0xBD) を検索
if printf '\xef\xbf\xbd' | grep -qFf - "$FILE_PATH" 2>/dev/null; then
  echo "BLOCK: MDXファイルに文字化け(U+FFFD)を検出: $FILE_PATH" >&2
  exit 1
fi
