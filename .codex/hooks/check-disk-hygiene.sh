#!/bin/bash
# ローカル容量の警告を Stop（ターン終了）で出す。ブロックはしない（警告のみ・常に exit 0）。
# Codex 側は worktree からも main repo の検査を叩けるよう絶対パスで固定する。
# Codex には SessionStart が無いので、両ツールに共通で効く面はここだけ。
# 毎ターン鳴るので --stop で「いま効く 2 件」（空き逼迫・マージ済み worktree）に絞る。
# 掃除の実体は launchd（日次 disk-hygiene:fix）。詳細: .claude/knowledge/reference/disk-hygiene.md

REPO_ROOT="/Users/minamidaisuke/doboku-note"
cd "$REPO_ROOT" || exit 0
node scripts/check-disk-hygiene.mjs --quick --stop 1>&2 2>/dev/null
exit 0
