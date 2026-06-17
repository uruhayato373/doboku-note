#!/bin/bash
# .claude/skills/ or .claude/agents/ が変更された場合に registry 更新チェック
# settings.json の PreToolUse(Bash(git commit*)) に登録して使用

STAGED=$(git diff --cached --name-only 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

SKILLS_CHANGED=$(echo "$STAGED" | grep -E "^\.claude/(skills|agents)/")
REGISTRY_CHANGED=$(echo "$STAGED" | grep -E "^docs/reference/(skills-guide|skills-registry|agents-registry)\.md")

if [ -n "$SKILLS_CHANGED" ] && [ -z "$REGISTRY_CHANGED" ]; then
  echo ""
  echo "WARNING: .claude/skills/ or .claude/agents/ が変更されましたが docs が未更新です。"
  echo "  docs/reference/skills-guide.md（一覧）または skills-registry.md（退役ログ）または agents-registry.md を同一 commit に含めてください。"
  echo ""
  echo "変更されたファイル:"
  echo "$SKILLS_CHANGED" | sed 's/^/  /'
  echo ""
fi

# 決定/ポリシー文書の変更 → 並行SoT（ADR/skill/checklist/戦略SoT）の横展開確認を促す（意味的ドリフト防止）。
# 台帳カップリング（上）では拾えない「同一決定の分散」を /doc-sync で照合させる forcing function。
DECISION_CHANGED=$(echo "$STAGED" | grep -E "決定.*\.md$|ADR.*\.md$|^docs/reference/|noteコンテンツ計画\.md$|^\.claude/skills/.*/SKILL\.md$")
if [ -n "$DECISION_CHANGED" ]; then
  echo ""
  echo "NOTE: 決定/ポリシー文書を変更しています。同じ決定を載せる並行SoT（ADR/skill/checklist/戦略SoT）の"
  echo "  横断更新を確認し、必要なら /doc-sync を回してください。"
  echo "$DECISION_CHANGED" | sed 's/^/  /'
  echo ""
fi

# ドキュメント肥大化（active handoff の蓄積）→ /doc-declutter（doc-curator）を促す forcing function。
# 完了済み handoff が active のまま積み上がると棚卸し漏れ＝肥大化するため、一定数で nudge する（非ブロッキング）。
ACTIVE_HANDOFFS=$(ls docs/handoffs/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "${ACTIVE_HANDOFFS:-0}" -ge 6 ]; then
  echo ""
  echo "NOTE: active handoff が ${ACTIVE_HANDOFFS} 本あります。完了済みの退避・古い行の trim・重複の統廃合は"
  echo "  /doc-declutter（機械 surfacer: npm run check-doc-lifecycle → doc-curator が処分判定）で。"
  echo ""
fi

# ポリシークラスタ（決定が複数文書に散在）の横展開もれを決定的に提示する。
node scripts/check-policy-anchors.mjs --staged 2>/dev/null || true
