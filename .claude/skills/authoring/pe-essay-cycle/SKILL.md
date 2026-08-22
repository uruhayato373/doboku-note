---
name: pe-essay-cycle
description: >
  技術士総合技術監理部門 記述式（模範論文・doboku-note 記述式ページ・note 有料記事）の作業を一本化する統括オーケストレーション・スキル。
  作成（pe-essay-draft）→ 添削（pe-essay-review）→ 修正反映（pe-essay-draft --mode revise）→ note 企画（pe-note-plan）→ 公開（note-prepublish-review）の各工程へルーティングし、毎回の指示の重複とミスを防ぐ。
  Use when user asks to [総監記述式の作業, 模範論文を作りたい, 模範論文の添削, 記述式ページの整備, note 有料記事の企画, /pe-essay-cycle].
user-invocable: true
---

# /pe-essay-cycle — 総監記述式 統括オーケストレーション

技術士総合技術監理部門 記述式まわりの作業を 1 つの入口に集約する統括スキル。各工程は専用スキルへルーティングするだけで、このスキル自体は MDX を直接書き換えない（`draft` / `revise` の実体は `pe-essay-draft`、`review` の実体は `pe-essay-review`）。`quality-cycle` の設計をミラーする。

**目的**: 「同じ前提・同じルールを毎回プロンプトに書き直す」「Generator と Evaluator を混同する」「frontmatter や属性名を取り違える」といった反復ミスを、SKILL.md にルールを 1 箇所集約することで構造的に防ぐ。

## 引数

```
/pe-essay-cycle --mode {draft|review|revise|plan|publish|page} [--year R0X] [--attr <attr>] [--target <slug>] [--review <report-path>]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `--mode` | 必須 | 実行工程（下表） |
| `--year` | draft/revise で必須 | 年度（`R03`〜`R07` 等） |
| `--attr` | draft/revise で必須 | 受験者属性（下記 3 種のいずれか） |
| `--target` | review/page で必須 | 対象 slug（例 `r05-essay-general-contractor`）または属性 |
| `--review` | revise で必須 | `pe-essay-review` が出力したレポートのパス |

### 受験者属性（3 種・正式キー）

| 正式キー | 日本語 | ハブページ |
|---|---|---|
| `general-contractor` | ゼネコン土木支店 | `pattern-essay-general-contractor` |
| `river-consultant` | コンサル 河川・砂防 | `pattern-essay-river-consultant` |
| `road-municipality` | 地方公共団体 道路担当（発注者） | `pattern-essay-road-municipality` |

## モード一覧

| モード | ルーティング先 | 役割 |
|---|---|---|
| `draft` | `pe-essay-draft`（Generator スキル） | ② 模範論文を新規ドラフト |
| `review` | `/pe-essay-review`（Evaluator スキル） | ③ 3 ペルソナ × 4 項目で添削 |
| `revise` | `pe-essay-draft --mode revise`（Generator スキル） | ③ の添削レポートを反映（Evaluator は改変しない） |
| `plan` | `pe-note-plan`（企画スキル） | ④ note 有料記事の編集ロードマップ提案 |
| `publish` | `/note-prepublish-review` ＋ `.claude/knowledge/reference/note-essay-review-checklist.md`（ペルソナ別マガジン）／`.claude/knowledge/reference/note-publish-enhancement.md`（記事個別） | note 公開前の品質ゲート＋公開工程 |
| `page` | `/keyword-page` / `/improve-article` / `/quality-cycle` のいずれか | ① doboku-note 記述式ページの整備（ルーティング指示のみ） |

## 実行手順

### draft — 模範論文を作る（②）

1. `--year` `--attr` を検証（属性は上記 3 種のキーのみ）
2. `pe-essay-draft` の SKILL.md を読み、その手順で実行する（このスキルは指示を渡すだけ）
3. 出力後、状態を `reviewStatus: needs-review` にする（人間ゲート）
4. 続けて `review` を回すかユーザーに確認

### review — 添削する（③）

1. `--target` の slug を解決
2. `/pe-essay-review {target}` を実行（3 ペルソナ評価、レポートは `.claude/state/pe-essay-review/` に保存）
3. 総合スコアが 8.0 未満なら `revise` を提案

### revise — 添削結果を反映する（③→②）

1. `--review` のレポートパスを受け取る
2. `pe-essay-draft --mode revise --review <path>` を実行（**Evaluator ではなく Generator が反映する** — Gen/Eval 分離の受け皿）
3. 反映後は再び `reviewStatus: needs-review`、`review` で再評価

### plan — note 有料記事を企画する（④）

1. `pe-note-plan` を実行（`content/note/技術士総監/noteコンテンツ計画.md`・magazine 在庫・価格を読んで次の記事を提案）。**模範論文ペルソナ別マガジンの価格 SoT は `src/lib/note-magazines.ts`（セット）＋記事 frontmatter `price:`（単品）で、`_meta.yaml` は使わない**

### publish — note 公開前ゲート

1. `/note-prepublish-review` を実行（記事個別の note 互換・字数・構造）
2. **総監模範論文ペルソナ別マガジン**（`総監模範論文-{persona}`）の公開品質化は `.claude/knowledge/reference/note-essay-review-checklist.md` の Step 0〜6f ＋ 横展開ランブックを全 PASS させる（**全ペルソナ＝R03-R07 ＋ R8予想2記事（`R08-yosou-1`/`-2`）を作成＝2026-06-16 方針転換**〔旧「per-persona R8予想は作らない＝決定2026」を撤回。真実源→`総監マガジン構成_決定2026.md` 2026-06-16追補。横断「R8予想問題集」はフラッグシップとして併存・全記事パックのR8二重は受容〕・各施策600字・`note掲載文.txt` 作成・セット価格を `note-magazines.ts` へ・**`_meta.yaml` は作らない**）
3. 大規模な記事公開は `.claude/knowledge/reference/note-publish-enhancement.md` の B0〜B9 工程に従う

### page — doboku-note 記述式ページの整備（①）

新機能は足さない。状況に応じて既存スキルへルーティングするだけ:

- 新規キーワードページ作成・校正 → `/keyword-page`
- 単一記事の対話的改善・PDF 照合 → `/improve-article`
- 複数ページのバルク品質サイクル → `/quality-cycle --profile cem`

## ミス防止ルール（全モード共通・単一の真実源）

- **Generator / Evaluator 分離**: 作る（`pe-essay-draft`）と評価する（`pe-essay-review`）を同一工程に混ぜない。`revise` の反映は必ず Generator 側で行う
- **人間ゲート必須**: AI が作成・修正した模範論文は `reviewStatus: needs-review`。`approved` への変更は人間のみ
- **MDX 書き込みは `.claude/scripts/lib/mdx-io.mjs` 経由**（直接 `writeFileSync` は CRLF 混在で pre-commit reject）
- **書き込み後に `U+FFFD` チェック**（文字化け検出）
- **frontmatter 必須**: `title` / `seoTitle` / `description` / `category` / `tags` / `published`
- **属性キーは 3 種固定**（上表）。日本語表記とキーを取り違えない
- **note と doboku-note に同じ技術解説を両方載せない**（重複コンテンツ禁止、`noteコンテンツ計画.md` Red Line）

## 状態遷移

```
draft → needs-review → verified → approved
                     └→ needs-rework → revise → needs-review (loop)
```

`approved` への遷移は人間のみ。

## 例

```bash
# R07 ゼネコン版の模範論文をドラフト
/pe-essay-cycle --mode draft --year R07 --attr general-contractor

# 既存模範論文を添削
/pe-essay-cycle --mode review --target r05-essay-river-consultant

# 添削レポートを反映
/pe-essay-cycle --mode revise --year R05 --attr river-consultant --review .claude/state/pe-essay-review/r05-essay-river-consultant-20260514.md

# note 有料記事の次の一手を企画
/pe-essay-cycle --mode plan

# doboku-note の記述式ページを直したい（ルーティング確認）
/pe-essay-cycle --mode page --target essay-exam-strategy
```

## トラブルシューティング

- **属性キーが通らない**: `--attr` は `general-contractor` / `river-consultant` / `road-municipality` のいずれか。日本語名は不可
- **review が複数ファイルを指定された**: `/pe-essay-review` は 1 回 1 ファイル原則。逐次実行する
- **draft の設問構造が分からない**: 年度の設問構造は `r0X-secondary/article.mdx`（過去問ページ）の問題文に従う。`pe-essay-draft` が参照する

## 参照

- `.claude/skills/authoring/pe-essay-draft/SKILL.md` — ② 模範論文 Generator
- `.claude/skills/quality/pe-essay-review/SKILL.md` — ③ 模範論文 Evaluator（3 ペルソナ）
- `.claude/skills/social/pe-note-plan/SKILL.md` — ④ note 有料記事 企画
- `.claude/agents/cem-essay-writer.md` / `.claude/agents/cem-essay-qa.md` — **note 有料マガジンの記述式模範論文の生成・採点**（本スキルの draft/review は**サイト** r0X-essay ページが対象。note 模範論文の生成・QA はこのペアが担う。ランブック＝note-essay-review-checklist.md）
- `.claude/skills/quality/quality-cycle/SKILL.md` — キーワード/教科書版の品質サイクル（本スキルの設計元）
- `.claude/skills/quality/note-prepublish-review/SKILL.md` — note 公開前ゲート
- `.claude/knowledge/reference/note-essay-review-checklist.md` — **総監模範論文ペルソナ別マガジンの公開品質化 SoT**（Step 0〜6f・全ペルソナ＝R03-R07＋R8予想2記事を作成＝2026-06-16 方針転換〔旧「per-persona R8予想は作らない＝決定2026」撤回〕・note掲載文.txt・価格・_meta.yaml 廃止）
- `content/note/技術士総監/総監マガジン構成_決定2026.md` — **マガジン構成の上位決定（ADR）**。2026-06-16 追補で旧「per-persona R8予想を作らない」を撤回＝**全14ペルソナで R03-R07＋R8予想2記事を作成**し、横断「R8予想問題集」はテーマ駆動フラッグシップとして併存（上行 note-essay-review-checklist と整合）
- `.claude/knowledge/reference/note-publish-enhancement.md` — note 公開引き上げ 10 工程
- `CLAUDE.md` ハーネス設計原則 — Generator/Evaluator 分離
