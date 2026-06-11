---
title: 情報アーキテクチャ（4 ゾーンモデル）
---

# 情報アーキテクチャ（4 ゾーンモデル）

doboku-note プロジェクトにおけるドキュメント・データの置き場ルールの真実源。

## 4 ゾーンモデル

| Zone | 場所 | 役割 | 形式 | Obsidian |
|---|---|---|---|---|
| A | `docs/` | 確定知識・戦略（Why/What） | md | ✅ |
| B | `docs/reference/` | 運用手順・ポリシー（How） | md | ✅ |
| C | `.claude/state/` / `.claude/config/` | 機械データ・ツール設定 | JSON | ❌（OK） |
| D | `.claude/skills/` / `.claude/agents/` | Claude 実行能力 | md + scripts | ❌（OK） |

**追加 SSOT ディレクトリ：**
- `docs/sns/` — 全 SNS 投稿管理（instagram / x / youtube）
- `docs/note/` — note 記事管理

## 判断フロー

1. 実行タスク・計画 → `docs/todo/`（annual / monthly / weekly）
2. CI・エージェントが programmatic に読む → Zone C（JSON）
3. 2 ヶ月後も参照価値あり → Why なら Zone A（`docs/project/`）、手順なら Zone B（`docs/reference/`）
4. Claude Code の能力定義 → Zone D
5. SNS 投稿管理 → `docs/sns/{instagram,x,youtube}/`
6. note 記事管理 → `docs/note/`
7. 上記いずれでもない一時メモは作らない（`.tmp/` 配下のみ）

## スキル/エージェント更新ルール

`.claude/skills/` または `.claude/agents/` を追加・修正・削除した場合は、  
**同一 commit** で以下を更新すること：

- スキル変更 → `docs/reference/skills-registry.md`
- エージェント変更 → `docs/reference/agents-registry.md`

自動チェック: `.claude/hooks/check-doc-sync.sh`（settings.json の PreToolUse に登録済み）

## todo/ ディレクトリ仕様

すべての計画・タスクの単一正源。GitHub Issue・task-queue.json は使わない。

ディレクトリ: `docs/todo/`

| ファイル | 粒度 | 更新タイミング |
|---|---|---|
| `annual.md` | 年（試験カレンダー × 商品投入計画） | 戦略転換時 |
| `monthly.md` | 月（今月のフォーカス + 締切） | 月初 |
| `weekly.md` | 週（今週やること 3〜5件） | 週初（Claude と協働） |

## .claude/ の残留ファイル

`.claude/` には Claude の実行能力と機械データのみを置く：

```
.claude/
  skills/           # Zone D
  agents/           # Zone D
  state/            # Zone C（JSON のみ）
  config/           # Zone C（JSON のみ）
  hooks/            # Claude Code + git hooks
  commands/         # カスタムコマンド
  plans/            # 実装プラン（一時）
  pdfs/             # 参照 PDF
  scripts/          # 自動化スクリプト
  settings.json
  settings.local.json
```

## SSOT と参照規律

ドキュメントを移動・リネーム・統廃合したときに、参照していたスキル・エージェント・他 docs のパスが黙って壊れる事故（2026-06-11 に旧体系から蓄積した 47 件の壊れ参照が判明）を防ぐための恒久ルール。

### 規律

1. **1 トピック = 1 SSOT**。同じ事実を複数ファイルに重複させない。重複が必要なら「正」を 1 つ決め、他は 1 行ポインタ（`→ 最新は {path} 参照`）にする。
2. **価格・リリースカレンダー・ロードマップは指定 SSOT のみに置く**。散在させない（真実源は各 `docs/note/{試験}/noteコンテンツ計画.md`）。
3. **doc を移動・リネーム・統廃合したら、同一 commit で全参照を更新する**。検出は `npm run check-doc-refs`（下記）。
4. **揺れやすいパスより安定したインデックスを指す**。章番号付き（`04_コンテンツロードマップ.md` 等）は再編で動きやすいので、可能なら README や本ドキュメント、内容 SSOT（`noteコンテンツ計画.md` 等）を参照する。
5. **例示パスはプレースホルダで書く**（`{slug}` / `{magazine}` / `YYYY-Www` / `r0X` 等）。実在ファイル参照と区別され、ガードが誤検知しない。
6. **廃止台帳・移行履歴など「死んだパスを記録として残す」行**は行末に `<!-- doc-ref:ignore -->` を付ける（このセクション直後の「廃止済み」がその例）。

### ガード（再発防止）

`scripts/check-doc-refs.mjs` が、スキル・エージェント・docs 内の `.md` / `.mdx` 参照がリポジトリ内に実在するかを検証する。

- 全体検証: `npm run check-doc-refs`
- pre-commit: staged の `.claude/skills/` `.claude/agents/` `docs/` `CLAUDE.md` を自動検査（`scripts/install-pre-commit.mjs` に登録済み）
- 対象外（実在しなくても正当）: `.claude/state/**`（生成物）・`.claude/plans/**`（一時）・`.claude/projects/**`（memory）・`docs/handoffs/**`・`docs/reviews/**`・`docs/sns/**`（point-in-time 記録）。コード参照（`src/*.tsx` 等）は build/type-check/lint が担う別系統

## 廃止済み

- `docs/ig-posts/` — 削除済み（2026-05-14）。SSOT は `docs/sns/instagram/`
- `.claude/reference/` — 削除済み（2026-05-14）。移行先は `docs/reference/`
- `.claude/content-principles.md` — 移行先は `docs/reference/content-principles.md` <!-- doc-ref:ignore -->
- `.claude/design-system/` — 移行先は `docs/design-system/`
- `.claude/reference/docs-issue-separation.md` — 削除済み。本ドキュメントに統合 <!-- doc-ref:ignore -->
- GitHub Issue — 廃止。タスクは `docs/todo/` に集約
- `task-queue.json` + `build-todo-view.mjs` + `npm run build-todo` — 廃止完了（2026-06-11）。CI 3本の自動起票・lib スクリプト・全スキル/エージェント参照を撤去し `docs/todo/`（手動運用）へ一本化。CI の違反検出は「CI 失敗 → GitHub 通知 → 手動起票」に置換
- `docs/project/TODO.md` — 廃止（自動生成ビューは不要と判断）。task-queue.json 撤去で生成元も消滅 <!-- doc-ref:ignore -->
