# 2026-05-25 ページリデザイン検討案（収益化導線統合）

Claude による doboku-note 全主要ページのリデザイン検討案。**収益化導線**（Amazon アソシエイト / 有料 note / Google AdSense）を組み込んだ 4 方向 × 5 ページの合計 20 案を比較できる静的プレビュー集。

> **位置づけ**: これは検討用の sketch/artifact であり、実装ではない。デザインシステム本体のルール（`principles.md` / `prohibited.md` / `quick-reference.md`）とは別レイヤー。

## プレビュー方法

各 HTML をローカルで直接ブラウザ起動するだけで動作する（CDN から React/Babel/Tailwind を読み込む構成）。

```bash
# 例: トップ画面の4案を比較
start docs/design-system/proposals/2026-05-25-page-redesign/index.html
```

| ページ | HTML |
|---|---|
| トップ画面 | [`index.html`](./index.html) |
| About | [`about.html`](./about.html) |
| Docs（記事） | [`docs.html`](./docs.html) |
| Privacy | [`privacy.html`](./privacy.html) |
| Search | [`search.html`](./search.html) |

## 設計方向の一覧（5ページ × 4方向 = 20案）

### トップ画面（`index-option-*.jsx`）

| 案 | 方向性 | コンセプト |
|---|---|---|
| A | Editorial Native | 現行の編集記事スタイルを保ち、収益化を紙面オブジェクトとして自然統合 |
| B | Learning Dashboard | 試験までのカウントダウン軸、学習ロードマップに商品を埋め込む |
| C | Magazine Cover | 月刊誌の表紙型、今月の有料 note Vol.X を主役にコンバージョン最大化 |
| D | Hybrid Compact | 3カラム高密度（新聞紙面 × ダッシュボード）、サイドに商品縦集約 |

### About（`about-option-*.jsx`）

| 案 | 方向性 | コンセプト |
|---|---|---|
| A | Editorial Profile | 現行構造踏襲、著者信頼性 → 参考書・有料 note を自然紹介 |
| B | Author Hero | 個人ブランド型（Stratechery）、ニュースレター・定期購読モデル |
| C | Manifesto + Three Pillars | 強い editorial manifesto、無料/有料/参考書 3 柱で並列展開 |
| D | Trust + Press Kit | メディア化、E-A-T 全面提示、企業スポンサーシップ・B2B 窓口 |

### Docs / 記事ページ（`docs-option-*.jsx`）

| 案 | 方向性 | コンセプト |
|---|---|---|
| A | Editorial Inline Native | 読書体験最優先、本文割り込み最小（中央1回 + 末尾CTA） |
| B | Sidebar-Heavy | 本文クリーン、sticky サイドバーに 3スタック（note/Amazon/AdSense） |
| C | Affiliate-First Inline | 章ごとに「この章を深掘りする本」、Amazon 最大化 |
| D | Magazine Wrapper | 誌面型、Issue 番号 + 余白注釈に Amazon、末尾に定期購読 CTA |

### Privacy（`privacy-option-*.jsx`）

| 案 | 方向性 | コンセプト |
|---|---|---|
| A | Editorial Long-form | 長文編集記事スタイル、番号付き TOC + PDF 配布 |
| B | Transparency Dashboard | Cookie 設定 UI・データフロー図、操作可能型 |
| C | Specification Sheet | 仕様書スタイル、データ目録 DC-XX、GDPR 条文紐付け |
| D | Reading + Trust Sidebar | 編集者からの一文・変更履歴・多言語版、信頼性集約 |

### Search（`search-option-*.jsx`）

| 案 | 方向性 | コンセプト |
|---|---|---|
| A | Editorial Native | 単カラム 880px、Sponsored result 明示 + 関連書籍/note |
| B | Faceted + Right Rail | 3カラム 1280px、左フィルタ・中央結果・右商品縦集約 |
| C | Search Hub | ゼロステート主役、人気検索/試験ステージ別/編集部の本棚 |
| D | Knowledge Panel | 既知キーワード一致時に決定版パネル（用語定義 + 推薦書 + note） |

## ファイル構成

```
2026-05-25-page-redesign/
├── README.md                      # このファイル
├── design-canvas.jsx              # 共通プレビューラッパー（DCSection / DCArtboard）
├── shared.jsx                     # 全ページ共通の基底モジュール（Header/Footer/Icons/MockData）
├── styles.css                     # 共通スタイル
│
├── index.html                     # トップ画面プレビュー（4案並列）
├── index-option-a.jsx 〜 d.jsx    # トップ画面 4方向
│
├── about.html                     # About プレビュー
├── about-option-a.jsx 〜 d.jsx
├── about-shared.jsx               # About 固有の共通モジュール
│
├── docs.html
├── docs-option-a.jsx 〜 d.jsx
├── docs-shared.jsx
│
├── privacy.html
├── privacy-option-a.jsx 〜 d.jsx
├── privacy-shared.jsx
│
├── search.html
└── search-option-a.jsx 〜 d.jsx
    search-shared.jsx
```

**依存関係**: 各サブページ HTML は `design-canvas.jsx` → `shared.jsx` → `{page}-shared.jsx` → `{page}-option-{a,b,c,d}.jsx` の順で読み込む。

## 出典

Claude（Anthropic Artifacts 経由）で生成された設計検討 sketch。2026-05-25 に handoff zip として受領。元 zip では `index` ページのみ prefix なし（`option-a.jsx` / `shared.jsx`）だったため、他ページとの一貫性のため `index-` prefix を付与してリネーム。`shared.jsx` は全ページ共通の基底モジュールなので prefix なしのまま維持。

## 採用判断後の取り扱い

採用案が決まった場合は、実装は `src/components/` / `src/app/` 配下で行い、このフォルダは履歴として保存する。複数案を組み合わせる場合（例: トップは A、Docs は B）も、案ごとの出典をこの README に追記する。
