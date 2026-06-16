---
title: note 売上管理 SSOT
---

# note 売上管理 SSOT

note 有料記事・マガジンの販売履歴を一元管理する運用手順書。

## いつ読むか

- 販売履歴を記録するとき
- 売上集計・分析を行うとき
- productId マッピングを追加するとき
- 売上データの整合性を検証するとき

---

## SSOT 定義

| ファイル | 役割 | 更新頻度 |
|---|---|---|
| `.claude/state/sales/sales-log.json` | 販売履歴データ（日付・商品・価格） | 都度（手動転記） |
| `src/lib/note-magazines.ts` | マガジン ID マスター（公開状態・URL・価格） | 商品追加時 |

### sales-log.json の構造

```json
{
  "version": 1,
  "updatedAt": "2026-06-17",
  "currency": "JPY",
  "source": "note クリエイターダッシュボード「販売履歴」の手動転記",
  "privacyNote": "購入者名・ハンドルはプライバシー保護のため記録しない",
  "sales": [
    {
      "date": "2026-06-17",
      "productId": "essay-complete-pack",
      "title": "総監記述式 完全パック",
      "type": "magazine",
      "price": 7980
    }
  ]
}
```

### フィールド仕様

| フィールド | 型 | 説明 |
|---|---|---|
| `date` | string | 購入日（ISO 8601 日付のみ、時刻は記録しない） |
| `productId` | string | 商品 ID（マガジン: `essay-*`, 単品記事: `article:<slug>`） |
| `title` | string | 商品名（note 上の表示名） |
| `type` | enum | `magazine` \| `article` |
| `price` | number | 購入価格（円、数値型） |

---

## 運用フロー

### 1. 販売履歴の記録

```bash
# スキル経由（推奨）
/record-sales
# （販売履歴テキストをペースト）

# 手動編集（上級者向け）
vim .claude/state/sales/sales-log.json
```

### 2. 集計の確認

```bash
npm run sales-summary              # 全期間
npm run sales-summary -- --month 2026-06  # 指定月
```

### 3. note ダッシュボードとの突合

1. note ダッシュボード → 売上 → 「今月の売上」を確認
2. `npm run sales-summary -- --month YYYY-MM` と比較
3. 差異があれば sales-log.json を確認・修正

---

## productId 命名規則

### マガジン

| パターン | 例 |
|---|---|
| ペルソナ別模範論文 | `essay-river-consultant-magazine` |
| テーマ別マガジン | `r8-essay-forecast`, `setsumon3-policy-bank` |
| バンドル | `essay-complete-pack`, `essay-core-pack` |
| 精読ガイド | `tankan-reading-guide` |
| 建設部門 | `bk-i-required-essay-magazine` |

### 単品記事

`article:<slug>` 形式。slug は商品内容から推定:

| カテゴリ | パターン例 |
|---|---|
| 総監 R8 予想単品 | `article:r8-economic-security-supply-chain` |
| 総監 設問3 単品 | `article:setsumon3-ai-society-5.0` |
| 総監 計算問題 | `article:tankan-calc-6patterns` |
| 総監 トレードオフ単品 | `article:tradeoff-information-management` |
| 2級土木 経験記述 | `article:civil-2-pastexam-essay-r06` |
| 建設部門 単品 | `article:bk-01-road-r8-yosou-ii1` |

### 新商品の追加

1. `src/lib/note-magazines.ts` にエントリ追加（マガジンの場合）
2. `.claude/agents/sales-recorder.md` の productId 推定ルールに追加
3. 本ドキュメントの命名規則テーブルに追記

---

## 分析の観点

### 月次トレンド

```bash
npm run sales-summary -- --trend
```

| 月 | 件数 | 売上 | 前月比 |
|---|---|---|---|
| 2026-05 | 16 | ¥33,220 | — |
| 2026-06 | 40 | ¥89,760 | +170% |

### 商品別ランキング

```bash
npm run sales-summary -- --by-product
```

| 商品 | 件数 | 売上 | 構成比 |
|---|---|---|---|
| essay-complete-pack | 5 | ¥39,900 | 44% |
| r8-essay-forecast | 6 | ¥20,880 | 23% |

### 曜日・時間帯分析（将来）

現在は日付のみ記録。時刻を記録する場合は `date` を ISO 8601 完全形式に拡張。

---

## プライバシーポリシー

- **購入者名・ハンドルは記録しない**
- 売上分析には `date / productId / price` で十分
- 個人を特定できる情報は sales-log.json に含めない

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `.claude/agents/sales-recorder.md` | 販売履歴正規化エージェント |
| `.claude/skills/metrics/record-sales/SKILL.md` | 記録スキル |
| `scripts/sales-summary.mjs` | 集計スクリプト |
| `src/lib/note-magazines.ts` | マガジン ID マスター |
