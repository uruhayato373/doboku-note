# 情報アーキテクチャ — 4 ゾーンモデル

doboku-note の情報をどこに置くかの**唯一の真実源**。議論・戦略・進捗・タスク・計測データ・スキル定義のすべてを、git 追跡下の単一媒体（ファイル）で矛盾なく管理する。

**いつ読むか**: 新しい情報を「どこに書くか」迷ったとき / CI・スキル・ドキュメントの置き場を設計するとき。

> 2026-04-21 の 3 層モデル（`docs-issue-separation.md`）は GitHub Issue を Tier 1 としていたが、2026-05-11 に CLAUDE.md が「Issue 廃止」を宣言し矛盾していた。本ドキュメントが両者を統合し置き換える唯一の正とする。

---

## 4 ゾーンモデル

| Zone | 置き場 | 役割 | 形式 | 真実源とするもの |
|---|---|---|---|---|
| **A. docs/** | `docs/project/` ほか `docs/` 配下 | 確定した知識・戦略・設計（Why / What） | 散文 md | 事業戦略・収益化方針・ロードマップの Why・ADR・設計思想・週次 PDCA 記録・セッション引き継ぎ |
| **B. .claude/reference/** | `.claude/reference/*.md` | 運用手順・ポリシー（How） | 散文 md | 作業マニュアル・執筆ルール・各種ポリシー・レジストリ・**本ドキュメント** |
| **C. .claude/state/ + .claude/config/** | `*.json`（散文 md 禁止） | 機械データ（State / Settings） | JSON | CI 出力・監査結果・サイクル状態・**task-queue.json**・しきい値・ツール設定 |
| **D. .claude/skills/ + .claude/agents/** | 定義ファイル | 実行可能な能力（Capability） | md + scripts | Claude Code のスキル・サブエージェント定義 |

**GitHub Issue は使わない**。新規作成は全面停止。既存の closed Issue は GitHub 上に履歴アーカイブとして残置する（移行しない・参照は可）。

---

## 判断フロー — 新しい情報をどこに置くか

1. **open/close したい実行タスクか** → Yes: `.claude/state/task-queue.json` の 1 エントリ（後述）
2. **エージェント / CI が programmatic に読み書きするか** → Yes: Zone C（JSON）
3. **2 ヶ月後も参照価値のある知識か** → Yes:
   - Why / 戦略 / 設計判断 → Zone A（`docs/`）
   - 手順 / ポリシー / レジストリ → Zone B（`.claude/reference/`）
4. **Claude Code の実行能力の定義か** → Yes: Zone D
5. 上記いずれでもない一時メモは作らない。会話・plan・task ツールで完結させる

### 禁止事項

- `.claude/state/*.md` の新規作成（`README.md` を除く）。状態・進捗は JSON か Zone A/B の md へ
- GitHub Issue の新規作成（テンプレートも廃止済み）
- 同じ情報を 2 箇所に転記する。真実源を 1 つ決め、反対側はリンクのみ

---

## task-queue.json — TODO / タスクの単一正源

すべての「やるべきこと」は `.claude/state/task-queue.json` に集約する。GitHub Issue・散文 TODO リスト・複数の state ファイルに散らさない。

```jsonc
{
  "meta": { "schema": 1, "updated_at": "ISO8601" },
  "tasks": [{
    "id": "T-001",
    "title": "...",
    "status": "todo | in_progress | blocked | done",
    "category": "content | sns | seo | infra | quality | meta",
    "priority": "high | mid | low",
    "source": "manual | ci:<workflow> | skill:<name>",
    "parent": "T-000 | null",            // Umbrella 相当の階層（任意）
    "refs": ["docs/project/NN_xxx.md"],   // 関連する Why ドキュメント（任意）
    "dedupe_key": "ci:psi:lcp",           // CI 重複起票防止キー（任意）
    "created": "YYYY-MM-DD",
    "updated": "YYYY-MM-DD",
    "notes": "..."
  }]
}
```

- **人間用ビュー**: `.claude/scripts/build-todo-view.mjs` が `docs/project/TODO.md` を生成（`status != done` を category 別に表示）。`TODO.md` は生成物・直接編集禁止
- **CI からの追記**: `.claude/scripts/lib/task-queue.mjs` ヘルパ経由で append。`dedupe_key` で同一事象の重複起票を防ぐ（旧 find-or-create Issue ロジックの置換）
- **完了タスク**: `status: done` で JSON に残す（履歴）。肥大化したら別途 prune
- **Umbrella 相当**: 親タスクを 1 エントリ作り、子タスクは `parent` に親 id を持たせる

---

## 個別ルール

### 週次 PDCA

`/weekly-review` → `/weekly-plan` の出力は `docs/project/pdca/YYYY-Www.md`（週 1 ファイル、Zone A）。レビュー本文（成果・課題・学び）は md に、そこで surface された未完了アクションは `task-queue.json` に登録する。

### セッション引き継ぎ

長時間タスクの中断時は `docs/handoffs/YYYY-MM-DD-{context}.md`（Zone A）。前提・現状・未コミット差分・次に読むファイル・次アクションを記す。

### CI / 自動化の出力

計測生データ・監査結果は Zone C（`.claude/state/` 配下、timestamped JSON + `latest-report.md` パターン）。CI が「人が対応すべき事象」を検出したら Issue ではなく `task-queue.json` に append する（`source: ci:<workflow>` + `dedupe_key`）。develop に `[skip ci]` で commit する。

### 収益化戦略 vs 価格データ

戦略・方針の散文は Zone A（`docs/project/02_事業戦略.md` 等）。価格・金額などの機械可読データは専用ファイル（Zone C ないし `docs/project/` 配下のデータファイル）に分離し、散文側はそれを参照する。

### コード実装方針

階層は `CLAUDE.md`（最上位）→ `.claude/reference/*.md`（領域別の How）→ `.claude/content-principles.md` / `.claude/design-system/principles.md`（コンテンツ・UI の真実源）。各ルールは 1 箇所のみに置き、他はリンクで参照する。

### スキル / エージェント

定義は Zone D。一覧は `.claude/reference/skills-registry.md` / `agents-registry.md`（Zone B）。新規追加時はレジストリも更新する。

---

## 関連

- `CLAUDE.md` — 4 原則「1. 考えてから書く」に本モデルの要約
- `.claude/state/task-queue.json` — タスクの単一正源
- `.claude/scripts/build-todo-view.mjs` — `docs/project/TODO.md` 生成
- `.claude/reference/workflows.md` — 週次運用・CI スケジュール
- `.claude/reference/data-storage-decision.md` — DB 採否の ADR（Zone C の設計判断）
