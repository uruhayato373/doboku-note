---
name: weekly-review
description: >
  前週の成果・KPI・学びを振り返るレビューを生成する。Use when user asks to [週次レビュー, 先週の振り返り, /weekly-review].
---

今週の実績を調査し、成果・課題・学びを記録する週次レビューを生成する。

## 引数

```
/weekly-review [YYYY-Www]
```

- 週番号（任意）: ISO 8601 週番号（例: `2026-W10`）。省略時は今週。

## 概要

サブエージェントで並列に実績データを収集し、計画との差分を分析し、成果・課題・学びを構造化して記録する。

## 手順

### Phase 1: 実績収集（並列サブエージェント）

#### Agent A: 開発活動

```
調査項目:
- git log --since="7 days ago" --oneline
- git log --since="7 days ago" --stat --format="" | tail -1
- git diff --stat

出力形式:
- 「開発した機能・修正」を箇条書き
- 「変更規模」（コミット数、ファイル数）
```

#### Agent B: コンテンツ実績

```
調査項目:
- docs/ 配下で今週新規作成・更新されたファイル
- カテゴリ別のページ数変動

出力形式:
- 「今週追加したページ」
- 「更新したページ」
```

#### Agent C: NSM / パフォーマンス指標 + 実験進捗

```
調査方法 (2 段階):

A. NSM 指標取得:
- `node .claude/scripts/lib/metrics-reader.mjs` を実行（markdown 出力）
  → GA4 と GSC から今週 vs 前週の NSM 関連メトリクスを取得
  → Organic Search users（NSM）、全体 sessions、CTR、検索順位、トップクエリ
- 出力をそのまま「## NSM（オーガニック検索流入）」セクションとしてレビューに埋め込む

B. 実験進捗レポート:
- `.claude/state/experiments.json` を読み、status 別にグループ化:
  - running: 経過日数、baseline との gap（metrics-reader で再取得）
  - measuring: baseline vs current の前後比較
  - 今週 close したもの: result + learnings
- 各 running 実験について:
  - started_at から 10 日以上経過していれば「measure 実施推奨」を明記
  - baseline の metric が現状でどう動いたか数値表示
- 出力を「## 実験の進捗」セクションとして埋め込む

補助コマンド:
- `node .claude/scripts/lib/metrics-reader.mjs --json` で生データ
- 追加のディメンション別データ:
  - `npm run fetch-ga4-data -- --dimension page --days 7 --limit 20`
  - `npm run fetch-gsc-data -- --dimension page --days 7`

前提条件:
- .env.local に GOOGLE_SERVICE_ACCOUNT_KEY_PATH と GA4_PROPERTY_ID が設定されている
- サービスアカウントが GSC と GA4 の両方で閲覧者権限を持つ
- 条件未達時は「NSM セクション: スキップ (計測基盤未整備)」と記録

出力形式:
- A の markdown 出力をそのまま「## NSM（オーガニック検索流入）」に
- B を新規セクション「## 実験の進捗」として以下構造で:

## 実験の進捗

### Running ({n} 件)
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-001 | title改善 | 12 日 | pos 7.4 → 4.2 | measure 推奨 |

### Measuring ({n} 件)
| ID | title | baseline | current | 効果判定 |

### 今週 close ({n} 件)
- EXP-XXX: {result} — {learnings}

コメント: 次サイクルで試すべき仮説を 1-2 個提示
```

#### Agent C2: PSI パフォーマンス推移

```
調査項目:
- .claude/state/metrics/psi/psi-batch-*.json の直近 7 日分（GitHub Actions が毎日生成）
  - metrics-data ブランチの psi/ サブディレクトリに蓄積されたもの
- .claude/config/psi-config.json のしきい値
- gh issue list --label performance --state open --json number,title,createdAt（完了済み・継続中の Issue 確認用）
- gh issue list --label performance --state closed --search "closed:>{7日前}" --json number,title（今週解消した違反）

分析項目:
- 今週の違反件数 vs 先週
- 各 URL の Performance スコア・LCP の前週比
- 今週新規発生した違反
- 今週解消した違反（closed Issue から抽出）
- 放置されている Issue（7 日以上 open）

出力形式: 以下の「## PSI パフォーマンス推移」セクションに埋め込む
```

#### Agent D: 計画との差分

```
調査項目:
- docs/reviews/weekly/ の当週計画ファイルを読み込み
- 計画タスクの完了/未達を判定

出力形式:
- 「計画タスク vs 実績」の対照表
```

#### Agent E: 校正学習の蒸留

```
目的: 今週の校正作業から新ルール・原則精緻化・ユーザー嗜好・ワークフロー改善を抽出
      次週以降の校正品質を底上げする継続改善ループを週次で回す

実行方法:
- /distill-proofread-learnings --since "7d" を呼び出す
  （スキル実体: .claude/skills/management/distill-proofread-learnings/SKILL.md）
- 分析対象: git log で直近 7 日の `.local/r2/posts/` 配下の MDX/SVG コミット
- 出力: .claude/state/proofread-learnings/YYYY-MM-DD.md

出力形式: 「## 校正学習の蒸留」セクションに以下を埋め込む:

## 校正学習の蒸留

### 今週の抽出結果
- 既存原則の適用: N 件（学習対象外）
- 新規ルール候補: N 件
- 既存原則の精緻化: N 件
- ユーザー嗜好: N 件
- ワークフロー改善: N 件

### 採択候補（ユーザー承認待ち）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | ... | content-principles.md §X |

### 学習ログ
- `.claude/state/proofread-learnings/YYYY-MM-DD.md` に詳細記録

注意:
- 2 回以上適用されたパターンのみ新規ルール候補に昇格（偶然排除）
- 本エージェントは候補を surface するのみ。適用はユーザー承認後に別途実行
- 候補がなければ「今週の学習候補: なし」と記録して次週へ
```

### Phase 2: 分析・統合

1. **達成率**: 計画タスクの完了率
2. **成果ハイライト**: 今週のトップ成果
3. **課題・ブロッカー**: 未達タスクの原因分析
4. **学び**: 発見・改善点

### Phase 3: 出力

`docs/reviews/weekly/YYYY-Www-review.md` に保存する。

### Phase 4: 週次計画の自動生成

レビュー完了後、**自動的に `/weekly-plan` を実行**して来週の計画を生成する。

## 出力フォーマット

```markdown
---
week: "YYYY-Www"
type: review
generatedAt: "YYYY-MM-DD"
---

# 週次レビュー YYYY-Www

## サマリー
- 計画タスク達成率: N/M（N%）
- 主な成果: ...

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|

## 成果ハイライト
1. ...

## 開発活動
- コミット数: N
- 主な変更: ...

## コンテンツ実績

| カテゴリ | 今週 | 先週 | 増減 |
|---|---|---|---|

## NSM（オーガニック検索流入）

<!-- Agent C の metrics-reader.mjs 出力をここに埋め込む。
     GA4 週次（Organic Search users ★NSM、全体 users/sessions、チャネル別）と
     GSC 週次（clicks/impressions/CTR/平均順位、トップクエリ）の前週比較表。 -->

### NSM トレンドの洞察
- Organic Search users の増減: ...（コンテンツ追加・SEO 改善・試験シーズン影響などの要因）
- 注目クエリ: 順位上位だが CTR が低い → title/description 改善候補

## 実験の進捗

<!-- Agent C が .claude/state/experiments.json から running/measuring/今週 close を自動生成。
     running 実験の baseline → current 比較、measure 推奨の警告、
     close 実験の learnings を出力。 -->

### Running
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|

### Measuring
| ID | title | baseline | current | 効果判定 |
|---|---|---|---|---|

### 今週 close

- なし

### 次サイクルへの仮説
- （Agent C が running/closed の学びから提示）

## PSI パフォーマンス推移

<!-- Agent C2 が metrics-data branch の psi/ と open/closed Issues から自動生成。
     今週の違反件数、スコア前週比、新規/解消した違反を記録。 -->

### Core Web Vitals 前週比

| URL | Perf | LCP | CLS | 違反状態 |
|---|---|---|---|---|

### 今週の変動

- **新規発生**: （件数）件 — 例: `/docs/xxx` で LCP 4.2s (Issue #N)
- **解消**: （件数）件 — 例: `/docs/yyy` Perf 62→78 (Issue #N closed)
- **継続放置**: （件数）件 — 7 日以上 open の Issue 一覧

### 洞察
- 改善が見える領域・退行した領域・次週の焦点

## 校正学習の蒸留

<!-- Agent E が /distill-proofread-learnings --since "7d" を呼び出して生成。
     今週の校正作業（.local/r2/posts/ 配下の MDX/SVG 差分＋ユーザー指示）から、
     content-principles.md や関連スキルに反映すべき新ルール・精緻化・嗜好・
     ワークフロー改善を抽出する。 -->

### 今週の抽出結果
- 既存原則の適用: N 件（学習対象外）
- 新規ルール候補: N 件
- 既存原則の精緻化: N 件
- ユーザー嗜好: N 件
- ワークフロー改善: N 件

### 採択候補（ユーザー承認待ち）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|

### 学習ログ
- `.claude/state/proofread-learnings/YYYY-MM-DD.md` に詳細記録

## その他パフォーマンス（必要に応じて）

ページ別 PV・内部リンク導線・リファラーなど、NSM 以外で注目すべき指標があれば記録。

## 課題・ブロッカー
1. ...

## 学び
- ...

## 来週への申し送り
- ...
```

## 運用ルール

- **毎週日曜〜月曜に実行**
- レビュー完了後に `/weekly-plan` が自動実行される
- レビューファイルは蓄積する（削除しない）

## 参照

- `.claude/skills/management/weekly-plan/SKILL.md` — 週次計画
- `.claude/skills/management/nsm-experiment/SKILL.md` — 実験ライフサイクル管理
- `.claude/scripts/lib/metrics-reader.mjs` — NSM 週次メトリクス取得（本スキル Agent C の中核）
- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs` — GSC 個別取得（ページ別・フィルタ付き）
- `.claude/scripts/fetch-ga4-data.mjs` — GA4 個別取得（ディメンション・メトリクス指定）
- `.claude/skills/management/nsm-experiment/references/definition.md` — NSM 定義の真実源
