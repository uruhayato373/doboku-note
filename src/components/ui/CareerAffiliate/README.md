# CareerAffiliate

建設・施工管理の**転職サービス**のアフィリエイトリンクを統一カードで表示するコンポーネント。doboku-note で唯一稼働しているアフィリエイト（講座/教材/添削・書籍は 2026-06-25 に完全廃止＝note 有料商品とのカニバリ回避）。

## 特徴

| 観点 | 仕様 |
|---|---|
| 対象 | 転職サービス（RSG・セコカン等） |
| 計測ピクセル | `trackingPixelUrl`（完全 URL、ASP 横断） |
| 訴求ポイント | `points`（年収UP率・求人数等の箇条書き） |
| 画像 | 任意（テキスト主体カード可） |

転職案件は ASP が分散する（A8.net / バリューコマース / アクセストレード / レントラックス）。各 ASP で計測ピクセルの配信ドメインが異なるため、mat 値ではなく**発行された 1x1 ピクセル URL をそのまま渡す**設計にしている。

## 使い方

MDX 本文の転職枠は `program="career"` だけを書く。案件・リンク・文言・ピクセルは配置ルール（`config/affiliate-placements.json`）の解決結果で決まり、ルールの無いカテゴリでは描画しない（MDX に mat を直書きしない＝`check-affiliate-mats`）。

```mdx
<CareerAffiliate program="career" />
```

面が 1 つだけのページ（公的基準の章末・トップ・ツール）は `src/components/ui/AffiliateSlot/AffiliateSlot.tsx` を使う（ルールを引いてこのカードを描き、その面でピクセルを 1 発出す）。記事・カテゴリの面は DocPage・CategoryPage が並べる。

以下は配置ルールを通さず直接渡す旧来の形（新しく書かない）。

```mdx
<CareerAffiliate
  service="RSG建設転職"
  category="施工管理 転職エージェント"
  description="建設業界特化。独自ルートの優良求人で年収アップを狙えます。"
  href="https://px.a8.net/svt/ejp?a8mat=XXXX"
  points={["利用者の収入UP率99.4%", "建設特化のキャリアアドバイザー", "登録・相談すべて無料"]}
  trackingPixelUrl="https://www11.a8.net/0.gif?a8mat=XXXX"
  cta="無料で求人を見る"
/>
```

## Props

| Prop | 必須 | 説明 |
|---|---|---|
| `service` | 必須 | サービス名（例: "RSG建設転職"） |
| `category` | 必須 | カテゴリ・職種ラベル（例: "施工管理 転職エージェント"） |
| `program` | 任意 | `"career"`（`"gks"` は歴史的な別名）。指定すると案件・リンク・文言は `inlineCard` で決まる |
| `inlineCard` | 任意 | 配置ルールで解決した、この面に出す案件（DocPage・AffiliateSlot・診断ツールが渡す） |
| `placement` | 任意 | GA4 の `cta_placement`（MDX 直書きは article-inline） |
| `href` | `program` なしで必須 | アフィリエイトリンク URL |
| `description` | 任意 | 補足説明 |
| `imageSrc` | 任意 | バナー画像 URL。無い場合はテキスト主体カードで描画 |
| `trackingPixelUrl` | 任意 | 計測ピクセルの**完全 URL**（ASP ごとに配信ドメインが異なるため） |
| `points` | 任意 | 訴求ポイントの箇条書き（最大 3 件目安） |
| `cta` | 任意 | CTA ボタンテキスト（デフォルト「無料で相談する」） |

## 自動付与される属性

- `rel`（`AFFILIATE_LINK_REL`＝`nofollow sponsored noopener`）— SEO 的に正しい挙動、ステマ規制対応
- `referrerPolicy`（`AFFILIATE_LINK_REFERRER_POLICY`＝`no-referrer-when-downgrade`）— A8 の成果別レポートの「リファラ」にクリックしたページの URL を残す。rel と対で付ける（`src/components/ui/AffiliateParts.tsx`・`tests/affiliate-link-referrer.test.mjs`）
- `target="_blank"` — 外部リンクは新タブで開く
- 「PR」バッジ — 消費者庁ステマ規制 2023-10〜 で広告表示は法的義務
- 画像・ピクセルとも `loading="lazy"` 相当（ピクセルは画面外配置）

## 配置原則

- doboku-note のメイン導線は「ここだけで合格できる」体験。アフィは**補完ポジション**で配置
- どのページのどの面に出すかは配置ルールが決める（2026-10-07 から学習・実務・公的基準・トップ・ツールにも面がある・EXP-017）。方針は `.claude/knowledge/reference/affiliate-operations.md` §6
- **ファーストビュー（記事冒頭）禁止** — メイン導線と矛盾するため

詳細: `.claude/knowledge/reference/affiliate-operations.md`
