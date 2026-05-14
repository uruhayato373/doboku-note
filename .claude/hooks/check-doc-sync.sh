#!/bin/bash
# .claude/skills/ or .claude/agents/ が変更された場合に registry 更新チェック
# settings.json の PreToolUse(Bash(git commit*)) に登録して使用

STAGED=$(git diff --cached --name-only 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

SKILLS_CHANGED=$(echo "$STAGED" | grep -E "^\.claude/(skills|agents)/")
REGISTRY_CHANGED=$(echo "$STAGED" | grep -E "^docs/reference/(skills|agents)-registry\.md")

if [ -n "$SKILLS_CHANGED" ] && [ -z "$REGISTRY_CHANGED" ]; then
  echo ""
  echo "WARNING: .claude/skills/ or .claude/agents/ が変更されましたが registry が未更新です。"
  echo "  docs/reference/skills-registry.md または agents-registry.md を同一 commit に含めてください。"
  echo ""
  echo "変更されたファイル:"
  echo "$SKILLS_CHANGED" | sed 's/^/  /'
  echo ""
fi
