#!/usr/bin/env bash
# Gemini（Google）の課金が発生しうるコマンドを検出したら permissionDecision:ask を返し、
# 実行前にユーザー確認を強制する。defaultMode:bypassPermissions でも PreToolUse フックは
# 効くため、これが実質的な「課金前の確認ゲート」になる。
#
# 真実源: memory feedback gemini-cost-confirm（Gemini 課金利用は実行前に必ず確認）。
# 安全側設計: 解析に失敗しても何も出力せず exit 0（正規コマンドの誤ブロックを防ぐ）。
set -o pipefail

cmd="${CLAUDE_TOOL_INPUT:-}"
# stdin にも JSON が来る環境に備えてフォールバック
if [ -z "$cmd" ]; then cmd="$(cat 2>/dev/null)"; fi

# 無料の確認系（--dry-run / ListModels 相当）は確認不要 → 素通し
case "$cmd" in
  *--dry-run*) exit 0 ;;
esac

# 課金が発生しうる Gemini 利用パターン:
#   - ogp-backgrounds / generate-ogp-backgrounds（画像背景の本生成）
#   - :generateContent / :predict（画像生成 API エンドポイント）
#   - generativelanguage.googleapis.com（Gemini API ホスト）
#   - gemini <空白>（CLI 実行。無料枠だが「Gemini 利用は必ず確認」の方針に合わせ含める）
if printf '%s' "$cmd" | grep -Eq 'ogp-backgrounds|generate-ogp-backgrounds|:generateContent|:predict|generativelanguage\.googleapis\.com|(^|[^a-zA-Z-])gemini[[:space:]]'; then
  printf '%s' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Gemini は従量課金（画像 1 枚 ~$0.03-0.04）です。実行前にユーザー確認が必要（memory: gemini-cost-confirm）。--dry-run なら確認不要。"}}'
fi
exit 0
