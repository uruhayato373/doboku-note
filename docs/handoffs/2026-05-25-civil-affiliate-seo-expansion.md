# 1級土木 アフィリエイト拡張＆SEO 改善 — セッション引き継ぎ

> [!note] このハンドオフの役割
> 「次セッション最初の5分」で状況把握＋着手判断できる情報を圧縮した。
> 詳細・全配置設計は `docs/project/04_運営/05_civil-affiliate-seo-expansion.md`（進捗管理 md・真実源）。

## 1. このセッションの成果（7 commits）

| # | コミット | 概要 |
|---|---|---|
| 1 | `16aea0013` | guide BookCard 配置（合格ガイド+一次過去問）|
| 2 | `5698868d3` | textbook/secondary/primary BookCard 2冊ペア配置 |
| 3 | `f1a535816` | guide 3ページ CTR リライト（捨て問27問・12問8問選択・毎年5〜8問）|
| 4 | `27869ffdf` | primary-r07-a/b CTR リライト（全61問・全35問必須・無料）|
| 5 | `20dce3fa5` | 内部リンク強化（primary-r07 7リンク化・guide-strategy 重複削除）|
| 6 | `e551984f8` | SAT サイドバー配置（PE 系 + 1級土木 guide/secondary 横断）|
| 7 | `1da27cc4a` | SAT バナー上部移動 + 記事末 SAT 商品リンク CTA 追加 |

> [!warning] 重要：**まだ develop のみ・main 未反映**
> `/deploy` で main に push しないと GSC/GA4/A8 計測がスタートしない。Phase 3 効果検証日（4週後）から逆算すると **deploy は早いほど良い**。

## 2. 次セッション最初の3手

1. **本番ビルド再検証**（`npm run build`、3分）— サイドバー上部移動と CivilSatProductCTA の SSR 確認
2. **`/deploy`** で develop → main 反映 → 計測スタート
3. **dev server で実機確認**（`npm run dev`）— サイドバー上部・記事末商品リンクの視覚確認

## 3. ユーザー側に残っている TODO

> [!important] ユーザー作業（私からは進められない）
> - アガルート土木 申請（A8.net、提携プログラム検索 → 申請）
> - ヒューマンアカデミー「たのまな」（バリューコマース、要新規 ASP 登録）
> - SAT 商品リンク 再取得（前回受領は `<a>` 内が画像 URL 文字列で壊れていた。今回新たに正しい形式を受領済みなので、これは**もう不要**）

## 4. 4週後（〜2026-06-22）の効果検証手順

### 計測対象（事前値・CTR）

| ページ | 旧 CTR | 目標 |
|---|---|---|
| guide-strategy | 1.8% | 5% |
| guide-law-key-points | 2.8% | 6% |
| guide-concrete-key-points | 4.3% | 7% |
| primary-r07-a | 0.8% | 4% |
| primary-r07-b | 3.1% | 6% |

### 期待される変化

- 1級土木 月間 clicks: 17 → **60〜80**
- 1級土木 月間 users（GA4）: 130 → **200〜300**
- BookCard 経由 月間成約: 0 → **1〜3**
- 母数 **500 users/月 達成判定** → 達成なら Phase 4（記述式模範解答 有料 note 化）着手

### 計測コマンド

```bash
# GSC ページ別計測
node scripts/fetch-gsc-page.mjs  # 既存があるはず、要確認

# GA4 ページ別計測
node scripts/fetch-ga4-page.mjs

# A8 レポート（管理画面 manually）
# - SAT mat 4B3RUZ+6Y22UQ+5TRO+5YZ75 (サイドバー)
# - SAT mat 4B3RUZ+6Y23MI+5TRO+BWGDT (記事末 + 既存 PE テキスト）
```

## 5. 設計の覚えておくべき重要ポイント

### アフィリエイト住み分けロジック（page.tsx 条件分岐）

| ページ群 | サイドバー上部 | 記事末 BookCard | 記事末 講座 |
|---|---|---|---|
| `pe × keyword/guide/pastExam` | SAT 300×250 | （既存）| — |
| `civil × guide` | SAT 300×250 | 書籍2冊 | SAT 1級土木 商品リンク |
| `civil × textbook` | 独学サポート 300×250 | 書籍2冊 | SAT 1級土木 商品リンク |
| `civil × primary` | 独学サポート 300×250 | 書籍2冊 | SAT 1級土木 商品リンク |
| `civil × secondary` | SAT 300×250 | 書籍2冊 | 独学サポート CourseAffiliate |

→ **同一ページに同種の広告が2枚並ばない設計**。住み分けは `docGroup` で排他。

### A8 creative 識別（最重要 mat 一覧）

| 用途 | mat | pixel domain |
|---|---|---|
| SAT サイドバー 300×250 | `4B3RUZ+6Y22UQ+5TRO+5YZ75` | www14 |
| SAT 記事末 商品リンク（1級土木 教材セット）| `4B3RUZ+6Y23MI+5TRO+BWGDT` | www17 |
| SAT 既存テキストリンク（PE 系 MDX 内）| `4B3RUZ+6Y23MI+5TRO+BWGDT` | www19 |
| 独学サポート サイドバー 300×250 | `4B3VR8+FAQ04A+4ASS+66H9D` | www10 |

→ mat が同じでも pixel domain が違うので A8 レポートで識別可能。

### 戦略的判断（覚えておくべき）

- **有料 note 化のトリガー = 1級土木 月間 users 500+**（現状 130）。未達なら Phase 4 着手しない
- **「ファーストビュー回避」は記事「本文」の話**。サイドバー上部は OK（マガジン CTA も上部配置）
- **書籍アフィ = 補完層、講座アフィ = 主力層**。CVR 観点で講座 1件 ≒ 書籍 100冊分

## 6. 真実源ドキュメント

- 進捗管理: `docs/project/04_運営/05_civil-affiliate-seo-expansion.md`
- アフィリエイト提携状況: `docs/project/04_運営/02_アフィリエイト提携状況.md`
- 書籍台帳: `docs/reference/book-list.md`
- 配置実装: `src/app/docs/[...slug]/page.tsx`（定数 `CIVIL_SIDEBAR_AD` / `SAT_SIDEBAR_AD` / `SAT_DOBOKU_PRODUCT` + コンポーネント `CivilSatProductCTA`）
- 書籍 payload: `src/config/affiliate-books.json`（9 ASIN keys）

## 7. Phase 3 後に検討する追加施策（積み残し）

- primary 残 14 ページ（r06〜h26）の CTR リライト — テンプレ化スクリプトで一括処理（30 分）
- secondary 系 15 ページの関連コンテンツ拡充（現状「## 出典」のみ）
- アフィ URL の UTM 設計 — A8 と GA4 を連携してページ別 CVR 計測
- `/category/civil-construction-1` トップに guide ハブカード追加
