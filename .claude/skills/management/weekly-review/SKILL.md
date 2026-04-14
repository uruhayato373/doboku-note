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

#### Agent C: NSM / パフォーマンス指標

```
調査方法:
- `node scripts/lib/metrics-reader.mjs` を実行（markdown 出力）
  → GA4 と GSC から今週 vs 前週の NSM 関連メトリクスを取得
  → Organic Search users（NSM）、全体 sessions、CTR、検索順位、トップクエリ を自動取得
- 出力をそのまま「## NSM（オーガニック検索流入）」セクションとしてレビューに埋め込む

補助:
- `node scripts/lib/metrics-reader.mjs --json` で生データを取りたい場合は JSON モード
- 追加のディメンション別データが欲しい場合は以下を個別実行:
  - `npm run fetch-ga4-data -- --dimension page --days 7 --limit 20` (ページ別)
  - `npm run fetch-gsc-data -- --dimension page --days 7` (ページ別検索流入)

前提条件:
- .env.local に GOOGLE_SERVICE_ACCOUNT_KEY_PATH と GA4_PROPERTY_ID が設定されている
- サービスアカウントが GSC と GA4 の両方で閲覧者権限を持つ
- 条件未達時は「NSM セクション: スキップ (計測基盤未整備)」と記録

出力形式:
- metrics-reader.mjs の markdown 出力をそのまま採用
- コメント: NSM トレンドについての洞察（Organic 増減の背景、注目クエリなど）
- 改善候補: 検索順位が上位だが CTR が低いクエリ → title/description 改善候補
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

## NSM（オーガニック検索流入）

<!-- Agent C の metrics-reader.mjs 出力をここに埋め込む。
     GA4 週次（Organic Search users ★NSM、全体 users/sessions、チャネル別）と
     GSC 週次（clicks/impressions/CTR/平均順位、トップクエリ）の前週比較表。 -->

### NSM トレンドの洞察
- Organic Search users の増減: ...（コンテンツ追加・SEO 改善・試験シーズン影響などの要因）
- 注目クエリ: 順位上位だが CTR が低い → title/description 改善候補

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
- `scripts/lib/metrics-reader.mjs` — NSM 週次メトリクス取得（本スキル Agent C の中核）
- `scripts/fetch-gsc-data.mjs` — GSC 個別取得（ページ別・フィルタ付き）
- `scripts/fetch-ga4-data.mjs` — GA4 個別取得（ディメンション・メトリクス指定）
- `docs/project/03_NSMと計測指標.md` — NSM 定義の真実源
