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

#### Agent C: パフォーマンス指標

```
調査項目:
- GA4 データ取得（`/fetch-ga4-data` 利用可能な場合）
  - overview: PV・ユーザー数・セッション・直帰率
  - channels: 流入経路別
  - pages: ページ別 PV 上位
- GSC データ取得（`/fetch-gsc-data` 利用可能な場合）
  - query: 検索クエリ上位
  - page: ページ別

出力形式:
- 「パフォーマンス概況」
- 「注目すべきトレンド」
- 「改善候補」
```

#### Agent D: 計画との差分

```
調査項目:
- docs/reviews/weekly/ の当週計画ファイルを読み込み
- 計画タスクの完了/未達を判定

出力形式:
- 「計画タスク vs 実績」の対照表
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

## パフォーマンス

### GA4（過去 28 日）
| 指標 | 値 | 前期比 |
|---|---|---|

### GSC（過去 28 日）
| 指標 | 値 |
|---|---|

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
- `.claude/skills/analytics/fetch-ga4-data/SKILL.md` — GA4 データ取得
- `.claude/skills/analytics/fetch-gsc-data/SKILL.md` — GSC データ取得
