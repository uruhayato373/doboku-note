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

## 廃止済み

- `docs/ig-posts/` — 削除済み（2026-05-14）。SSOT は `docs/sns/instagram/`
- `.claude/reference/` — 削除済み（2026-05-14）。移行先は `docs/reference/`
- `.claude/content-principles.md` — 移行先は `docs/reference/content-principles.md`
- `.claude/design-system/` — 移行先は `docs/design-system/`
- `.claude/reference/docs-issue-separation.md` — 削除済み。本ドキュメントに統合
- GitHub Issue — 廃止。タスクは `docs/todo/` に集約
- `task-queue.json` — 廃止（2026-06-10）。`docs/todo/` に移行
- `docs/project/TODO.md` — 廃止（2026-06-10）。自動生成ビューは不要と判断
