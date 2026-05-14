---
name: pe-essay-draft
description: >
  技術士総合技術監理部門 記述式の模範論文（r0X-essay-{attr}）を、年度・受験者属性・設問からドラフトする Generator スキル。
  三層構造・属性別共通ペルソナ・5 管理間トレードオフの明示・採点者視点 ExamPoint を備えた MDX を生成する。--mode revise で pe-essay-review の添削レポートを反映する。
  Use when user asks to [模範論文を作成, 模範論文ドラフト, 記述式答案を書く, essay draft, /pe-essay-draft].
user-invocable: true
---

# /pe-essay-draft — 総監記述式 模範論文 ドラフト Generator

総監記述式の **模範論文ページ**（`r0X-essay-{attr}/article.mdx`）をドラフトする Generator スキル。Evaluator は `/pe-essay-review`。両者を分離する CLAUDE.md ハーネス原則に従い、このスキルは「作る」だけ・評価はしない。

## 引数

```
/pe-essay-draft --year R0X --attr <attr> [--mode draft|revise] [--review <report-path>]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `--year` | 必須 | 年度（`R03`〜`R07` 等） |
| `--attr` | 必須 | 受験者属性キー（下表 4 種） |
| `--mode` | 任意 | `draft`（既定・新規）/ `revise`（添削反映） |
| `--review` | revise で必須 | `pe-essay-review` の出力レポートパス |

| 属性キー | 日本語 | ハブ |
|---|---|---|
| `general-contractor` | ゼネコン土木支店 | `pattern-essay-general-contractor` |
| `river-consultant` | コンサル 河川・砂防 | `pattern-essay-river-consultant` |
| `environment-survey` | 環境調査事務所 | `pattern-essay-environment-survey` |
| `road-municipality` | 地方公共団体 道路担当（発注者） | `pattern-essay-road-municipality` |

出力先: `.local/r2/posts/pe-comprehensive-management/{year-lower}-essay-{attr}/article.mdx`（例 `r07-essay-general-contractor`）

## 実行手順（draft モード）

### Step 1: 入力資料を読む

1. **設問**: `r0X-secondary/article.mdx`（過去問ページ）の問題文全文 — 設問構造（何部構成か）はここに従う。年度で構成が異なる
2. **共通ペルソナ**: `pattern-essay-{attr}/article.mdx` の「共通ペルソナ（管理対象の統一設定）」表 — 事業名・規模・業務領域・立場・主要顧客・強み・弱みをそのまま流用
3. **構造の手本**: 同属性の既存年度（例 `r07-essay-{attr}/article.mdx`）があれば構造の参照に
4. **トレードオフの引き出し**: `management-tradeoffs/article.mdx`（解決フレーム: ALARP・LCA・段階的実施・合意形成・リスクベース）

### Step 2: MDX を構成する

以下の構造で書く（既存 `r0X-essay-*` 準拠）:

```
---
title: {年度} 総監記述式 模範論文｜{属性日本語}版（{テーマ}）
shortTitle: {年度短縮} 模範論文（{属性短縮}）
subtitle: {テーマ}を{属性}で解く
description: {200字程度。属性・テーマ・三層構造の論点・トレードオフを要約}
category: pe-comprehensive-management
group: guide
tags: [技術士（総合技術監理部門）, 模範論文, {属性日本語}, 受験者属性別, 記述式対策, {テーマ}]
created: {today}
published: false        # 新規は必ず false（人間ゲート）
publishedAt: {today}
seoTitle: "{title} ｜ 技術士 総合技術監理部門 キーワード集"
dateModified: {today}
reviewStatus: needs-review
faqs:                    # 3〜4 問。属性 × テーマの最頻出論点を Q&A 化
  - q: ...
    a: ...
---

# {title}

{導入: テーマと属性立場、設問の三層構造に対応する旨を 1 段落}

<Callout type="tip" title="この模範論文の使い方">
そのまま暗記せず、自分の規模・業務領域・経験事例に置き換えて再構成する前提で読む旨。
</Callout>

## 想定する管理対象と前提条件
{pattern-essay-{attr} の共通ペルソナ表をそのまま転記した表（事業名/規模/業務領域/立場/前提条件）}

## 設問（１）{設問1の問い}
### {事業内容と○○への対応}
### {顕在化している課題、施策、効果}
### 施策の問題点

## 設問（２）{設問2の問い・近い将来5年以内 等}
### 施策 1：{施策名}
**内容** / **効果** / **障害と克服策（トレードオフ）**（障害は管理名を括弧書き、克服策、トレードオフを 1 行で明示）
### 施策 2：{施策名}
（同上）

## 設問（３）{設問3の問い・我が国における施策 等}
### 施策 1：{施策名}
**①課題と施策** / **②有効性と実現性** / **③重大な障害と克服策**
### 施策 2：{施策名}
（同上）

## トレードオフと解決フレームの整理
{設問ごとに「論じたトレードオフ」「解決フレーム」を 2 軸表で再整理。フレームは management-tradeoffs へリンク}

## 採点者視点でのチェックポイント
<ExamPoint summary="..." items={[...]} />

## 関連リソース
<SeeAlso ... />   # 属性ハブ / 同年度 secondary / 別属性同年度 / management-tradeoffs
<RelatedKeywords items={[...]} />   # 5 個程度
```

### Step 3: 必須ルール

- **三層構造**: 設問（２）以降は「現在 → 近い将来（5 年以内）→ 我が国施策」など年度設問の時間軸に沿う
- **ペルソナの一貫性**: 事業名・規模・組織体制・予算・主要顧客を `pattern-essay-{attr}` から固定流用。年度間でブレさせない
- **トレードオフは異管理間**: 各施策に最低 1 つ、設問（２）全体で 2 つ以上。「○○管理 × ○○管理」を明示し、第三の管理または解決フレームで解消する形にする（QCD 等の同一管理内対立は総監の主問ではない）
- **固有用語の正確性**: i-Construction 2.0・CCUS・流域治水・ブルーカーボン等の制度・数値は事実確認する
- **frontmatter**: 新規は `published: false` ＋ `reviewStatus: needs-review`（人間ゲート）
- **書き込みは `.claude/scripts/lib/mdx-io.mjs` の `transformMdxFile` 経由**（CRLF 保持）。書き込み後 `U+FFFD` チェック
- **既存 `*-secondary` の Callout 方針とは別**: 模範論文（`*-essay-*`）は guide 系のため `<Callout type="tip">` を使ってよい

## 実行手順（revise モード）

1. `--review` のレポート（`.claude/state/pe-essay-review/{slug}-*.md`）を読む
2. 「致命的問題」と修正優先度 **High / Med** の指摘を反映（Low は任意）
3. **Evaluator の指摘を Generator が反映する** — これが Gen/Eval 分離の受け皿。`pe-essay-review` 自身は改変しない
4. `dateModified` を今日に更新、`reviewStatus: needs-review` のまま（再評価へ）
5. 書き込み後 `U+FFFD` チェック

## 例

```bash
# R06 環境調査事務所版を新規ドラフト
/pe-essay-draft --year R06 --attr environment-survey

# 添削レポートを反映
/pe-essay-draft --year R06 --attr environment-survey --mode revise --review .claude/state/pe-essay-review/r06-essay-environment-survey-20260514.md
```

## トラブルシューティング

- **設問構造が年度で違う**: 必ず該当年度の `r0X-secondary/article.mdx` の問題文を正とする。3 部構成とは限らない
- **ペルソナが思いつかない**: `pattern-essay-{attr}` の共通ペルソナ表が唯一の正。新規創作しない
- **トレードオフが同一管理内になっている**: QCD・CIA 等は総監の主問ではない。5 管理の垣根を越える対立に組み替える
- **published を true にしてよいか**: 不可。AI ドラフトは必ず `false` ＋ `needs-review`。公開は人間判断

## 参照

- `.claude/skills/quality/pe-essay-review/SKILL.md` — 対になる Evaluator（3 ペルソナ）
- `.claude/skills/authoring/pe-essay-cycle/SKILL.md` — 統括オーケストレーター
- `.local/r2/posts/pe-comprehensive-management/pattern-essay-{attr}/article.mdx` — 属性別共通ペルソナ（入力）
- `.local/r2/posts/pe-comprehensive-management/r0X-secondary/article.mdx` — 年度別設問（入力）
- `.local/r2/posts/pe-comprehensive-management/management-tradeoffs/article.mdx` — 解決フレーム
- `.claude/scripts/lib/mdx-io.mjs` — CRLF 保持 I/O（書き込み時必須）
