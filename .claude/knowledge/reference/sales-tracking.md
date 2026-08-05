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
npm run sales-summary              # 全期間（月次が並び、各月内に商品別内訳も表示）
npm run sales-summary -- 2026-06   # 指定月（位置引数。--month フラグは無い）
```

### 3. note ダッシュボードとの突合

1. note ダッシュボード → 売上 → 「今月の売上」を確認
2. `npm run sales-summary -- YYYY-MM` と比較
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
| 建設部門 必須科目I | `bk-i-required-essay-magazine` |
| 建設部門 選択科目 模範解答集 | `bk-{subject}-secondary-magazine`（例: `bk-road-secondary-magazine` / `bk-geotechnical-secondary-magazine` / `bk-port-airport-secondary-magazine`。subject は note-magazines.ts の romaji に合わせる） |
| 建設部門 まるごと合格パック（必須科目I＋選択科目） | `bk-{subject}-pack`（例: `bk-road-pack`。note-magazines.ts の `pe-construction-{subject}-pack` に対応） |
| 1級2級土木 学科記述セット | `civil-1-gakka-kijutsu`（¥2,480）/ `civil-2-gakka-kijutsu`（¥1,980） |
| 1級土木 二次まるごとパック | `civil-1-niji-marugoto-pack`（¥11,800・108記事バンドル） |

### 単品記事

`article:<slug>` 形式。slug は商品内容から推定:

| カテゴリ | パターン例 |
|---|---|
| 総監 R8 予想単品 | `article:r8-economic-security-supply-chain` |
| 総監 設問3 単品 | `article:setsumon3-ai-society-5.0` |
| 総監 計算問題 | `article:tankan-calc-6patterns` |
| 総監 トレードオフ単品 | `article:tradeoff-information-management` |
| 2級土木 経験記述 | `article:civil-2-pastexam-essay-r06` |
| 建設部門 道路 単品 | `article:bk-01-road-r8-yosou-ii1` |
| 建設部門 他科目 R8予想単品 | `article:bk-{subject}-r8-yosou-{ii1\|ii2\|iii}`（例: `bk-steel-concrete-r8-yosou-ii1` / `bk-port-airport-r8-yosou-ii2` / `bk-environment-r8-yosou-iii`） |
| 建設部門 過去問単品 | `article:bk-i-r07-required`（必須科目I R07 等） |
| 総監 R8予想 老朽化インフラ | `article:r8-aging-infra-preventive` |
| 総監 R8予想 資源循環 | `article:r8-resource-circulation-supply-chain` |
| 総監 ペルソナ別 R8予想単品（③老朽化/④災害復旧/⑤AI社会/⑥経済安保・¥780） | `article:essay-{persona}-r08-{3..6}`（例: `essay-sabo-municipality-r08-3` / `essay-general-contractor-r08-6`。persona はマガジン id `essay-{persona}-magazine` に合わせる） |
| 建設部門 電力土木/鉄道 R8予想単品 | `article:bk-power-civil-r8-yosou-{ii1\|ii2\|iii}` / `article:bk-railway-r8-yosou-{ii1\|ii2\|iii}` |
| 1級2級土木 学科記述 直前暗記ノート | `article:civil-1-anki-note`（¥980）/ `article:civil-2-anki-note`（¥580）。noteUrl は `/n/…` 単品（マガジン非収録） |

### ココナラ（非 note チャネル・2026-07-16〜）

`coconala:<serviceId>` 形式。**接頭辞でチャネルを判別**する（既存の `article:` と同じ流儀。`channel` フィールドは新設しない）。

| パターン | 例 |
|---|---|
| ココナラ 単発サービス | `coconala:<id>`（id は `src/lib/coconala-services.ts` の id と**完全一致**）。**価格の実値はカタログが真実源**（ここは目安）。人が動くサービス: `coconala-shindan`（¥1,500）/ `coconala-tensaku-set`（¥6,000）/ `coconala-sakusei`（¥8,000）。教材3段はしご: `coconala-{1kyu,2kyu}-moshi-pdf`（¥2,500/¥2,000）→ `coconala-{,2kyu-}kanseitoan-pdf`（模範答案セット ¥5,000/¥4,000）→ `coconala-{1kyu,2kyu}-full-pdf`（教材フルパック ¥10,000/¥7,000）。最上位: `coconala-1kyu-premium`（教材＋添削 ¥15,000）。その他: `coconala-civil-keiken-kit`（¥8,000）/ `coconala-sokan-bunseki-pdf`（¥2,500）。**2026-08-05 にアーカイブ**（恒久廃止・新規売上なし／過去分の転記は id をそのまま使う）: `coconala-bunseki-pdf`・`coconala-{1kyu,2kyu}-kakomon-pdf`・`coconala-{1kyu,2kyu}-gakka-pdf`。全て `coconala:` 接頭辞 |

- **入力ソースが note と異なる**: note ダッシュボードの貼付ではなく `.claude/state/coconala/orders-log.json`（`/coconala-order` が受注時に追記）からの月次転記。
- `price` は**手数料差引前の販売額**を記録する（note と同じ粒度。ココナラ手数料 約22% は集計時に別途考慮）。
- id の実在は `npm run check-coconala-wiring` が pre-commit で検証（sales-log の `coconala:*` がカタログに無いと落ちる）。運用 SSOT → [coconala-operations.md](coconala-operations.md)

### 新商品の追加

1. `src/lib/note-magazines.ts` にエントリ追加（マガジンの場合）／ココナラは `src/lib/coconala-services.ts`
2. `.claude/agents/sales-recorder.md` の productId 推定ルールに追加
3. 本ドキュメントの命名規則テーブルに追記

> **機械ガード**: 手順②の取りこぼし（mapping 陳腐化）は `npm run check-sales-mapping` が検知する。
> sales-log.json に出現する productId が sales-recorder.md の mapping パターンに 1 つも一致しない、
> または `article:unknown-*` が残っていると **pre-commit で commit を止める**（sales-log.json か
> sales-recorder.md を含むコミットのみ発火）。緊急回避は `SKIP_SALES_MAPPING=1`。

---

## 分析の観点

### 月次トレンド

```bash
npm run sales-summary   # 引数なし＝全期間。月次が昇順で並ぶ（前月比は手計算）
```

| 月 | 件数 | 売上 | 前月比 |
|---|---|---|---|
| 2026-05 | 16 | ¥33,220 | — |
| 2026-06 | 58 | ¥113,060 | +240% |

### 商品別ランキング

商品別内訳は月次サマリ内に売上降順で自動表示される（専用フラグは無い）:

```bash
npm run sales-summary -- 2026-06   # 当月内の商品別内訳を確認
```

| 商品 | 件数 | 売上 |
|---|---|---|
| essay-complete-pack | 6 | ¥47,880 |
| r8-essay-forecast | 6 | ¥17,880 |

### 曜日・時間帯分析（将来）

現在は日付のみ記録。時刻を記録する場合は `date` を ISO 8601 完全形式に拡張。

---

## Kindle（KDP）ロイヤリティ（非 note チャネル・2026-07-31〜）

note の販売履歴が「1 購入 = 1 レコードの手動転記」なのに対し、Kindle は Amazon 側が月次で
集計した**推計ロイヤリティ**しか出さない。粒度が違うため sales-log.json には混ぜず、
別ファイル `.claude/state/sales/kdp-royalties.json` に月次で保存する。

```bash
npm run kdp-report                 # 当月を取得して保存
npm run kdp-report -- --dry-run    # 保存せず表示のみ
```

| 項目 | 内容 |
|---|---|
| 取得元 | `kdpreports.amazon.co.jp` の `/royalties`（書籍別）＋ `/pmr`（マーケットプレイス別・KENP 既読ページ） |
| 方式 | `scripts/kdp-report.mjs`（Playwright・読み取り専用。ログインは kdp-publish と同じ `.local/playwright-kdp-profile` を共用） |
| 突合 | 書籍は `scripts/kindle-published/catalog.json` の `title: subtitle` で `bookId` に紐づけ（副題ドリフト時は主タイトルで再照合） |
| 期間 | 当月と前月のみ（KDP の日付入力は React が握り潰すためカレンダーのプリセットを使う）。それ以前の確定値は `/pmr` を目視 |

**運用**: 月末に当月を 1 回、翌月に前月を再取得して上書き（KENP は翌月 15 日頃に確定するため）。
当月分は `estimated: true` で記録される。取得できなかった項目は 0 埋めせず `null` で残す。

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
| `scripts/sales-summary.mjs` | 集計スクリプト（月フィルタは位置引数。`-- 2026-06`） |
| `scripts/check-sales-mapping.mjs` | productId が mapping に文書化されているか検証する pre-commit ガード |
| `scripts/kdp-report.mjs` | KDP 月次ロイヤリティ取得（`npm run kdp-report`・読み取り専用） |
| `.claude/state/sales/kdp-royalties.json` | Kindle 月次ロイヤリティ（note とは別スキーマ） |
| `src/lib/note-magazines.ts` | マガジン ID マスター |
