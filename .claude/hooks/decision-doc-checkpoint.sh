#!/bin/bash
# 決定/ポリシー文書の横展開もれ「締め切りチェック」
# settings.json の PreCompact（会話が進んだ合図）と SessionEnd（セッション終了）に登録。
# 未コミットの決定/ポリシー文書変更があれば、並行SoTの整合確認を促す（advisory・非ブロック）。

CHANGED=$(git status --porcelain 2>/dev/null | sed 's/^...//' \
  | grep -E "決定.*\.md$|ADR.*\.md$|^.claude/knowledge/reference/|noteコンテンツ計画\.md$|^\.claude/(skills|agents)/|note-magazines\.ts$")

if [ -n "$CHANGED" ]; then
  echo ""
  echo "【締め切りチェック｜決定/ポリシー文書の横展開】"
  echo "  次のファイルに未コミット変更があります。同じ決定を載せる並行SoT（ADR / skill / checklist / 戦略SoT）が"
  echo "  一貫しているか、締める前に /doc-sync または \`npm run check-policy-anchors\` で横断確認してください。"
  echo "$CHANGED" | sed 's/^/    /'
  echo ""
fi

exit 0
