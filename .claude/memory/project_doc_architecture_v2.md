---
name: doc-architecture-v2
description: 2026-05-14 に確立した 4 ゾーンモデル + Obsidian 可視化対応のドキュメント構造
metadata: 
  node_type: memory
  type: project
  originSessionId: aefedb1a-d7ab-4f49-b668-2b3787a8dbde
---

2026-05-14 に docs アーキテクチャを抜本改訂。docs/project/ は同日にカテゴリ別サブディレクトリ構造に再編。

**変更内容:**
- `.claude/reference/` → `docs/reference/` に移動（Obsidian vault から可視化）
- `.claude/content-principles.md` → `docs/reference/content-principles.md`
- `.claude/design-system/` → `docs/design-system/`
- `docs/ig-posts/` を削除（SSOT は `docs/sns/instagram/`）

**docs/project/ カテゴリ構造（2026-05-14 再編）:**
- `strategy/` — vision.md / business.md / monetization.md / content-roadmap.md
- `content/` — essay-strategy.md / scoring-rubric.md / rewrite-methodology.md / civil-figure-restoration.md / essay-analysis/
- `sns/` — sns-strategy.md / channel-funnel.md / calendar-2026q2.md / design-mockups/
- `operations/` — performance-monitoring.md / correction-cycle-roadmap.md
- `products/` — ios-app-spec.md
- `competitor-audit/` / `archive/` / `TODO.md` はそのまま
- 旧番号体系（01〜31）は廃止。番号欠番・壊れた参照も同時解消

**4 ゾーンモデル（確定）:**
- Zone A: `docs/project/`（戦略・設計思想・ADR）
- Zone B: `docs/reference/`（運用手順・ポリシー）← Obsidian で見える
- Zone C: `.claude/state/` / `.claude/config/`（機械データ JSON のみ）
- Zone D: `.claude/skills/` / `.claude/agents/`（Claude 実行能力）

**SNS SSOT:**
- `docs/sns/instagram/` = Instagram SSOT（JSON 形式）
- `docs/sns/x/` = X SSOT
- `docs/sns/youtube/` = YouTube SSOT
- `docs/ig-posts/` 削除済み

**note SSOT:** `docs/note/`（各 {slug}/article.md）

**スキル/エージェント更新ルール:**
`.claude/skills/` または `.claude/agents/` 変更時は同一 commit で `docs/reference/skills-registry.md` または `docs/reference/agents-registry.md` を更新。自動チェック: `.claude/hooks/check-doc-sync.sh`

**Why:** Obsidian vault = `/doboku-note/` ルート全体。`.claude/` は隠しフォルダで不可視だったため。

**How to apply:** CLAUDE.md や各 reference への参照は必ず `docs/reference/` を使う。`.claude/reference/` パスは無効。
