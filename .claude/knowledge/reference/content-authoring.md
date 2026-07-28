---
title: コンテンツ作成詳細ルール
---

# コンテンツ作成詳細ルール

MDX コンテンツを書く・編集するときの詳細ルール集。

**いつ読むか**: MDX を新規作成するとき、既存 MDX を編集するとき、`/pdf-to-mdx` / `/keyword-page` / `/review-mobile` などコンテンツ系スキルを実行するとき。

**真実源の関係**:
- コンテンツ品質ルール（ExamPoint 個数・参考資料構成など）の**真実源は `.claude/knowledge/reference/content-principles.md`**
- このファイルは技術的な書き方ガイド（コンポーネント・構造・画像配信）が主
- CLAUDE.md 本体には最低限のルール（frontmatter 必須項目・文字化けチェック・CRLF 改行・絵文字禁止）のみ残している

## ペルソナ・コンテンツ原則

> **品質ルールの単一真実源**: `.claude/knowledge/reference/content-principles.md`
> ExamPoint 個数・配置・禁止パターン（§5）、参考資料の構成（§9）など、すべてのコンテンツ品質ルールはこのファイルが真実源。SKILL.md・lint スクリプト・cem-qa エージェントはこのファイルを参照する。**ルール変更時はまず content-principles.md を更新し、他は参照に揃える。**
>
> **ガイド記事（`group: guide`）固有ルール**: 本文 3,000 字下限（§25・`check-guide-length` で pre-commit/CI ゲート化）、読者ベネフィット型リード（§26）、見出し直下にいきなり箇条書き/図を置かない（§2/§17-2・lint 6-2〜6-4）、末尾は §20 承認パターンで参考資料節は不要（§22 のインライン出典も guide は対象外）。ガイドの品質サイクルは資格横断の専用エージェント3点: **`guide-qa`**（ガイド軸5軸の評価）→ **`guide-rewriter`**（§17/§26/§24/§20 準拠リライト・密度向上・事実是正、pe/総監/コンクリート含む全資格。civil は civil-textbook-rewriter も可）→ **`guide-fact-checker`**（加筆事実を WebSearch で一次情報照合）。過去問=past-exam-qa／キーワード=cem-qa と分業。**3,000 字ゲートは「水増し」を許す粗いフィルタで質を保証しない——質の番人は guide-qa の 5 軸**。加筆した試験統計・制度の事実は公開前に **`guide-fact-checker`** で照合する（LLM は Opus でも年度・制度を外す。32本で43件の誤りを検出した実績）。

- すべてのコンテンツは「実務経験10年以上の総監部門受験者」がスマホで読むことを前提に作成する
- 冒頭は概念の本質を簡潔に。試験での重要性は「総合技術監理における位置づけ」に集約する
- 表・箇条書きの前に必ず文脈を示す導入文を置く
- ベンチマーク: BCP（事業継続計画）ページの構成を品質基準とする
- **品質レベル**: L1（構造）/ L2（学習）/ L3（体験）の3層定義。詳細は `.claude/knowledge/reference/content-principles.md` の「コンテンツ品質レベル」セクション。Wave方式（全体を浅く→中→深く）で進める

## MDX コンポーネント

MDX 内で使える主要コンポーネント（`src/lib/component-loader/index.ts` で登録済み）:

- `<Callout type="note|tip|warn|danger|success|exam|formula|standard|example|reference|faq|quote" title="...">children</Callout>` — 12 種のセマンティックボックス（左アクセントバー + 円形アイコン + 任意タイトル）。視覚ギャラリー: [`docs/ui/callout-gallery.md`](../../../docs/ui/callout-gallery.md)
- `<ExamPoint summary="要約文" items={["項目1", "項目2"]} />` — 試験対策ポイント専用ボックス（青タイトル + マーカー付き要約 + 箇条書き）
- `<SpecSheetList title="..." items={[...]} ordered={true|false} marker="dot|dash|square" />` — 仕様書調リスト（ordered / unordered 両対応）。視覚ギャラリー: [`docs/ui/speclist-gallery.md`](../../../docs/ui/speclist-gallery.md)
- `<RelatedKeywords items={[{ label: "名前", slug: "slug" }]} />` — 関連キーワードリンクタグ（slug でキーワードページへリンク、slug 省略で灰色テキスト）
- `<ArticleImage src="..." alt="..." width={N} height={N} />` — 画像（`<figure>` セマンティクス付き）。**`caption` は使わない** — [content-principles §8](./content-principles.md) 参照。詳細は「画像コンポーネントの使い分け」
- `<details><summary>解答・解説</summary>...</details>` — 開閉式セクション（過去問で使用）
- `<div className="list-plain">` — 原典番号付き列挙（本文に `(1)(2)`/`①…` が既にある転記リスト＝設問・選択肢正誤・論述フレーム等）を囲むと disc マーカーを抑制し、原典番号を唯一のマーカーにする（`・(1)` の二重マーカー回避）。前後に空行を空けて Markdown リストを囲む。`details` 内でも可。**原典番号のない通常の箇条書きには使わない**。番号を自前で付けたい仕様書調リストは `<SpecSheetList>`（あちらは自前マーカーを付けるため原典番号列挙には不可）
- `<Timeline>`, `<PdcaCycle>` — 時系列・サイクル表示
- `<SeeAlso href="/docs/slug" title="..." reason="..." />` — 内部 doboku-note ページへの「あわせて読みたい」カード
- `<NoteLink url="..." title="..." description="..." imageSrc="/images/note-links/*.webp" />` — **note 記事への画像付き導線カード**（有料単品は `kind="product" price="..."`）
- `<LinkCard url="..." title="..." description="..." siteName="..." imageUrl="..." />` — 一般外部 URL のカード（OGP 画像を左に本来比で表示する横型カード。モバイルは画像を上に縦積み）
- `<MagazineCard id="..." utmContent="..." />` — note magazine（有料）販売ページへの本文中カード（SoT 解決版・既定は画像中心の `<MagazineHeroCta>` を描画。列挙時のみ `variant="inline"`。記事末尾/サイドバーのタイルは placement 経由で自動配置）

## リンク系コンポーネントの使い分け

リンク先の種別ごとに使うコンポーネントを固定する。**サイト全体のリンク表現を統一するための真実源**。

| リンク先 | 使うもの | 補足 |
|---|---|---|
| 内部 doboku-note ページ | `<SeeAlso>`（ブロック）/ markdown リンク（インライン） | ページ間ナビ |
| **note 記事** | **`<NoteLink>`** | note.com 記事は必ずこれ。生 markdown・`<Callout type="reference">` で note リンクを書かない |
| note magazine（有料）販売ページ | `<MagazineCard>`（本文中）／記事末尾・サイドバーの もくじタイル `HubCtaBanner`（全 HUB 資格で自動） | 商品導線。見た目の型は下記 |
| 書籍・論文 | `<Callout type="reference">` | 参考文献。外部 URL 一般には使わない |
| 一般外部 URL（公的機関・規格等） | `<LinkCard>` または markdown リンク | note 以外の外部サイト |

- **note 記事リンクは例外なく画像付き `<NoteLink>`**。note.com のカバー/OGPは使わず、サイト制作画像を `public/images/note-links/` に置き、`imageSrc="/images/note-links/{name}.webp"` を必須指定する
- 画像内にタイトル・価格を焼き込まない。変更される情報は HTML props で表示し、無料記事は既定 `kind="article"`、有料単品は `kind="product" price="¥..."` とする
- 自動検出: `npm run check-note-link-cards` が自社note生リンク、旧 `coverImage`、画像省略、許可外パス、ファイル欠落、WebP偽装をCIエラーにする。pre-commitも変更MDXへ同じ契約を適用する

### note 商品 CTA の見た目（hero / inline）

`<MagazineCard>` の `variant` で 2 型を使い分ける。文言・URL・キャラは全て `src/lib/note-magazines.ts`（SoT）が供給するため、MDX には **id と utmContent だけ**を書く（価格・note URL の直書きは禁止）。

| variant | 実体 | 使う場面 |
|---|---|---|
| `hero`（**既定**・省略可） | `MagazineHeroCta` — 資格別背景イラスト＋ブランド紺オーバーレイ＋白枠＋マスコット＋note 緑の大ボタン（高さ ~380px） | 単体で強く売る面。記事中間 CTA（自動挿入）と MDX 本文中の既定 |
| `inline` | `MagazineInlineCard` — 横長の小カード（画像左＋テキスト右） | **同一記事に 3 枚以上を列挙**するとき（ペルソナ一覧等）。hero が縦に連続して読み流れを壊すのを避ける |

- 商品ごとの CTA 文言は SoT の任意 3 フィールドで出し分ける: `ctaCatch`（キャッチコピー・~25字）/ `ctaButton`（ボタン文言・動詞で終える）/ `ctaPose`（`pointing` 論点提示 / `good-sign` 完成・合格訴求 / `smile` 伴走・入門）。省略時は `shortTitle` ?? `title` ／「note で詳しく見る」／`pointing` にフォールバックするため、**未設定のマガジンでも hero は描画できる**
- キャラ画像は `public/images/character/avatar-{pose}.webp`。**どのポーズを使えるかの真実源は `.claude/config/character-poses.json` の `siteCta: true`**。増やすときは manifest → 画像生成 → 型の順（`npm run check-character-avatars` が三者整合を gate）。手順の詳細: [character-asset-policy.md](character-asset-policy.md)「サイト CTA にポーズを追加する手順」
- 記事末尾・サイドバー・カテゴリ hub の「もくじタイル」は別系統（`HubCtaBanner`・商品単体ではない）

## 過去問 MDX の構造ルール

択一式過去問は以下を遵守:

- 設問番号は **H2**（`## Ⅰ-1-1` / `## 問題 No.1`）— アンカー（rehype-slug）と TOC 階層の基準となる唯一の見出し。※ `primary`/`secondary`/`pastExam`（過去問）は問番号羅列を避けるため**サイドバー TOC 自体を非表示**（`src/app/docs/[...slug]/page.tsx`）。H2 ルールはアンカー生成・他 docGroup の TOC のために引き続き遵守する
- `toc_max_heading_level: 2` を frontmatter に設定
- 回答・解説は `<details>/<summary>` で開閉式にする
- details 内に **H2/H3 見出しを使わない**（`**太字**` で代替）
- details 内に `---`（水平線）を使わない（不要な区切り線・余白の原因になる）
- 関連キーワードは `<RelatedKeywords>` コンポーネントを使用（slug 指定でキーワードページへリンク）
- キーワードページ側の「過去問での出題」セクションにバックリンクを追加する（双方向リンク）
- 試験対策ポイントは `<ExamPoint>` コンポーネントを使用
- 詳細テンプレートは `.claude/skills/conversion/pdf-to-mdx/templates/cem.md` を参照

## 数式・図表

- 数式: `$$...$$` (ブロック) / `$...$` (インライン) + KaTeX
- 図表: SVG（模式図）/ PNG（写真・複雑なイラスト）
- スクリーンショット・図版: `.local/r2/posts/{slug}/img/` に配置
- SVG 図版: モバイル視認性を最優先。作成ルールは `/create-svg` スキル（`.claude/skills/authoring/create-svg/SKILL.md`）を参照

### ブロック数式は必ず複数行 `$$`（最重要）

**ルール**: display math（ブロック数式）は **開始 `$$` と終了 `$$` を必ず別々の行**に置く。

```
# 正しい
$$
\text{価値} = \dfrac{\text{機能}}{\text{コスト}}
$$

# 間違い（remark-math v6 で inline math 扱いになる）
$$\text{価値} = \dfrac{\text{機能}}{\text{コスト}}$$
```

**理由**: 本サイトの remark-math は v6 系で、**単行 `$$X$$` は inline math として解釈**される。display math として描画するには開始・終了 `$$` を別行に配置する必要がある。

**単行で書いた場合の実害**:
- `\frac` の分子・分母が scriptstyle（70% サイズ）で描画され小さくなる
- `.katex-display` クラスが付与されず、ブロック数式の背景色・中央揃え等のスタイルが一切効かない
- 本文中にインライン扱いで埋め込まれ、視覚的に式ブロックと認識できない

**補足**: 式番号を付ける場合は `\tag{N}` を使う（行末に `(1)` を付けない）:
```
$$
FI_{t+1} = \frac{1}{k}(Y_t + \cdots + Y_{t-k+1}) \tag{1}
$$
```

**自動検出**: `lint-mdx-mobile.mjs` のカテゴリ 11-2（MEDIUM）で単行 `$$...$$` が検出され警告。pre-commit で警告表示、commit はブロックしない（MEDIUM のため）。

### 分数（`\frac` vs `\dfrac`）— CJK 縮小問題

**ルール**: 分数の分子または分母に `\text{}`（CJK テキスト）を含めるときは、`\frac` ではなく **`\dfrac`** を使う。

**理由**: KaTeX は `\frac{A}{B}` の分子・分母に `size3`（0.7em = 70%）CSS クラスを付与する。Latin 文字（`x`, `y`, `F/M` 等）では気にならない程度だが、CJK フォールバックフォント描画と組み合わさると視覚的に「半分」に見える。`\dfrac` は displaystyle を強制するため、縮小を回避できる。

```
# 良い例（分子・分母の CJK が等倍で表示される）
$$\text{価値} = \dfrac{\text{機能}}{\text{コスト}}$$

# 悪い例（機能・コストが 70% で縮小表示される）
$$\text{価値} = \frac{\text{機能}}{\text{コスト}}$$
```

**例外**: **インライン数式（`$...$`）では `\dfrac` を使わない**。行内に displaystyle の分数が入ると高さが異常に増え、行間レイアウトが崩れる。インラインの `$\frac{1}{2}$` のような Latin/数字の短い分数は `\frac` のままで OK。

**自動検出**: `lint-mdx-mobile.mjs` のカテゴリ 11-1（MEDIUM）で、`\frac{}` 内に `\text{}` を含む箇所が検出され警告される。pre-commit で警告表示、commit はブロックしない（MEDIUM のため）。本ルールの継続改善が必要になったら `.claude/state/task-queue.json` に `category: quality` で登録する。

### KaTeX strict 警告を出さない記法（全角記号・% ・CJK）

**ルール**: 数式（`$...$` / `$$...$$`）の**内側**では、以下を守る。build（rehype-katex 既定 `strict:'warn'`）が警告を出す＝将来の表示崩れリスク。

- **全角演算子は半角に**: `＝→=` `＜→<` `＞→>` `＋→+` `／→/`。全角のままだと `unicodeTextInMathMode` 警告。
- **`−`(U+2212) は半角ハイフン `-` に**: `unknownSymbol` 警告になる。
- **数式内の `%` は `\%`**: 素の `%` は KaTeX でコメント開始と解釈され `commentAtEnd` 警告＋以降が消える。
- **日本語（CJK）は `\text{...}` で包む**: `\dfrac{\text{せん断抵抗力}}{\text{滑動力}}` のように。素の CJK は `unicodeTextInMathMode` 警告。
- **通貨などの `$` は数式ではない**: 本文の「最小値 `\$100` / 最大値 `\$75,000`」のように `\$` エスケープする。エスケープしないと remark-math が `$100 〜 $75,000` を数式と誤解釈し、間の日本語まで math mode に入って警告になる。

**プロ側（数式の外）の全角記号は変えない**: `［rad／s］` のような単位表記や散文の `＞` はそのままで良い（警告は数式内のみ）。

**自動検出**: `npm run audit-katex`（レポート）/ `audit-katex:ci`（`--strict`・警告 > 0 で exit 1）。build と同じ remark-math パイプラインでファイル/行/数式/警告コード単位に一覧化。低リスク置換（全角演算子・U+2212・%）は `--fix-safe` で数式スパン内のみ一括修正できる（CJK・通貨 `$` は手修正）。CI では `quality:audit:ci` が 0 件を enforce。

## モバイル視認性（詳細ルール）

CLAUDE.md 本体にも要点を置いているが、詳細はここで扱う。

- **表は2軸比較にのみ使う** — 「行と列の両方向に読む」データだけが表にふさわしい。各行が独立した説明なら箇条書き（`- **用語**: 説明`）を使う
- **キーバリュー表を作らない** — 正式名称・目的・所管・施行などの基本情報は散文として冒頭セクションに統合する
- **計算手順を表で表現しない** — 番号付きリストで 1 行 1 ステップに記述する
- **4列以上の表は原則禁止** — 横スクロールで延命しない。下記カタログで表以外へ変換する
- **入れ子リスト（2階層以上）を避ける** — モバイルでインデントが視認しにくい。太字リード＋フラット1階層 or `<SpecSheetList>`
- **1段落は300字以内（目安200字）** — 2〜3文で改段。長い段落はモバイルで壁になる（note は〜120字で別系統）
- **表が適切な場面**: BCP vs 防災計画のような**短い値**の2軸比較、短いセルの分類一覧、マトリクス（SWOT 等）

#### 表 → 非表 変換パターンカタログ

情報の羅列・年度×項目マトリクス・長文セルは表にしない。優先順位は **散文 > 箇条書き > SpecSheetList > 表**（表は最後の手段）。

| 現状の表 | 変換先 | 実例 |
|---|---|---|
| 年度×分野マトリクス（4列以上） | 分野別 H3 ＋ 年度リスト（太字テーマ）、または年度キーの1行フラット箇条書き | `pe-construction/river-coast-exam-themes`（II-1/II-2/III を年度キーの箇条書きへ） |
| キーバリュー表（項目/内容） | 散文に統合、または `<SpecSheetList>` | — |
| 数値スペック・設問構成の羅列 | `<SpecSheetList>`（ordered/marker で調整） | river-coast 冒頭「設問構成」表 → SpecSheetList |
| 長文セルの3列表 | H3/太字リード＋箇条書き | — |
| 本当に必要な2軸比較（**短い値**） | 2〜3列表のまま可 | 年度→テーマの2列表 |

ルールの重大度・資格×種別の適用は `.claude/config/content-rules.json` が SSOT。機械チェックは `.claude/scripts/lint-mdx-mobile.mjs`（実行点＝品質サイクル `/quality-cycle`・`/check-mdx`・手動、全量は週次ラチェット `check-content-quality`）と `/review-mobile` スキルで実施。pre-commit フックが実行するのは `pre-commit-mdx.mjs`（MDX コンパイル・frontmatter・壊れ表等）で、lint-mdx-mobile とはルールの一部（0-1/1-7 相当）が判定同等という関係。

## 画像配信

画像は **git 追跡下の `.local/r2/posts/{slug}/img/` にマスターを置き、R2（Cloudflare）を本番配信ミラーとして使う** 二重管理方式。複数 PC での作業同期を git 経由で行う。

- **R2 URL（本番）**: `https://storage.doboku-note.com/posts/{slug}/img/{ファイル名}`
- **MDX での参照**: `<img src="/posts/{slug}/img/{ファイル名}" />`
- **ローカル開発**: `public/posts` → `.local/r2/posts` のシンボリックリンク経由で配信
- **本番**: Cloudflare Pages `_redirects` で R2 にリダイレクト
- **マスター**: `.local/r2/posts/**/img/` は **git 追跡対象**（PNG・SVG 含む）。複数 PC 間で git pull により同期される
- **R2 へのアップロード（本番反映）**: 通常は `main` push 時に `r2-sync.yml`（CI）が自動同期する（対象 path = `**/img/**` / `**/ogp.png` / `**/ogp.webp`）。手動同期は `npm run upload-images-r2`（= `node .claude/scripts/upload-images-to-r2.mjs`）。**OGP 画像 `ogp.png` は `img/` の外＝記事ディレクトリ直下**にあり同じ経路で同期される（生成は `npm run ogp`、未生成は CI ゲート `check-ogp-coverage` が検知）
- **R2 からのダウンロード（新規 PC 初期化時のフォールバック）**: `/sync-r2-images` または `npm run download-images`
- `static/img/` はサイト共通素材（favicon, logo 等）専用

### 読み込み優先度（LCP ゲート・必読）

**本文の 1 枚目の図版（先頭 2,000 文字以内にあるもの）は `loading="eager" fetchpriority="high"` にする。2 枚目以降は `loading="lazy"`。**

```mdx
{/* 1枚目＝モバイルのフォールド内に入る＝LCP 要素 */}
<img src="/posts/{slug}/img/fig-01.webp" alt="..." loading="eager" fetchpriority="high" width={740} height={401} />

{/* 2枚目以降 */}
<img src="/posts/{slug}/img/fig-02.webp" alt="..." loading="lazy" width={756} height={496} />
```

- **なぜ**: 1 枚目はモバイル（390×844）のフォールド内に入り LCP 要素になる。ここに `loading="lazy"` が付くと低速回線で取得がレイアウト確定まで遅延し、**LCP が数秒伸びる**（2026-07-27 の EXP-005 で実測。PSI lab 5〜7s の主因）
- **なぜ MDX 側で書くのか**: MDX の**リテラル JSX `<img>` は components マップを経由しない**（マップされるのは markdown 記法 `![]()` 由来の要素のみ）。そのため `src/lib/component-loader` では強制できず、記事ソースが真実源になる
- **機械ゲート**: `npm run check-lcp-image-hints`（pre-commit で staged / `quality:audit` と CI で全量）。違反は `-- --fix` で自動修正できる
- 詳細・背景: [measurement-incidents.md](./measurement-incidents.md)「2026-07-27: lab と field の判定原則」

## 画像コンポーネントの使い分け

**真実源**: [.claude/knowledge/reference/content-principles.md §8](./content-principles.md) L146 — *caption は「図の説明」には使わない。ただし出典・帰属・機種名などの短い帰属情報（60 字以内）は caption に書いてよい。*

### 新規記事: `<ArticleImage>` を使う

```mdx
{/* source: Wikimedia Commons, CC0, https://commons.wikimedia.org/wiki/File:... */}
<ArticleImage
  src="/posts/civil-construction-1/textbook-crane/img/crawler-crane.jpg"
  alt="クローラクレーン（日立 CX900HD）"
  caption="Wikimedia Commons, CC0"
  width={960}
  height={720}
/>
```

- `<figure>` セマンティクスと Next.js `<Image>` 最適化が自動で効く
- **caption の用途は帰属情報のみ**（出典ライセンス・機種名など、60 字以内）
- caption に **図の説明・構造の解説を書くのは禁止**（本文と重複するため）
- `alt` は簡潔な識別情報のみ、**80 字以内**
- 機種の詳細・図の読み方は **本文** で説明する

### 既存 `<img>` との互換

- 既存の生 `<img>` を使った記事はリライト時に順次 `<ArticleImage>` へ移行
- 移行が未完了の記事で `<img>` を使う場合も `alt` と `{/* source: */}` コメントは必須

**重要 — 新規 SVG/画像で raw `<img>` を絶対に使わない**:

MDX パイプラインは raw `<img>` の `style` / `width` / `height` / `className` 等の属性を**すべて剥がす**（sanitizer の仕様）。このため:

- `<img style="width:100%">` → style が消えて SVG の自然サイズ（viewBox 幅）で固定表示
- `<img width="800">` → width が消えてコンテナ幅を無視
- SVG ファイル内部の `style="width:100%"` も `<img src>` 経由では効かない（ブラウザ仕様：SVG が replaced element として扱われるため）

既存記事に raw `<img>` が残っていても、それは移行未完了の遺物であり、**真似をしない**。新規追加は必ず `<ArticleImage>` を使う。`<ArticleImage>` は SVG 用に `w-full max-w-2xl mx-auto px-6` コンテナと `max-width:100%;height:auto` inline style を付与してレスポンシブ表示する。

SVG 自体のルート要素にも `style="max-width:{viewBox width}px;width:100%"` が必須（`/check-mdx --rules svg` の P3-missing-maxwidth HIGH 違反）。詳細は [.claude/skills/authoring/create-svg/SKILL.md](../../skills/authoring/create-svg/SKILL.md) §最大表示幅の固定。

### CC/PD 写真の取得・出典表記

詳細は [image-policy.md](./image-policy.md) 参照（Wikimedia Commons からの取得、ライセンス判定、出典コメントフォーマット）。

## frontmatter テンプレート

```yaml
---
title: "ページタイトル"
seoTitle: "検索結果に出す完全タイトル｜資格名・キーワードを保持"
shortTitle: "短縮タイトル"           # ナビ・カード用（10字前後）。group: guide は必須級
subtitle: "一覧の2行目に出る補足"     # ナビ・カード用（30字程度・2行で打ち切られる）
description: "50〜160文字の説明"
category: "civil-construction-1"     # 試験または分野
tags: ["guide", "primary"]           # 分類タグ（複数可）
published: true                      # false なら下書き・非表示
---
```

**`title` / `shortTitle` / `subtitle` / `seoTitle` の使い分け**

| フィールド | 出る面 | 目安 |
|---|---|---|
| `title` | 記事 H1・パンくず・OGP 文字・関連記事 | 概念名。資格名の繰り返しは避ける |
| `shortTitle` | **サイドバー / モバイル記事末ナビ**・カテゴリカード・人気記事 | 10 字前後。`title` が長い記事ほど効く |
| `subtitle` | 同上の**2 行目**（小さく・muted・2 行で打ち切り） | 30 字程度。`title` の「—」「｜」以降が概ねそのまま使える |
| `seoTitle` | `<title>`（検索結果）のみ | 資格名・接尾辞を保持した完全形。`｜` 区切りが慣例 |

> `shortTitle`/`subtitle` を省くとナビが `title` にフォールバックし、
> 「2級土木施工管理技士とは — 難易度・合格率・試験内容」のような長い行が並んで一覧が読めなくなる。
> **group: guide の新規記事では必ず両方書く**（`lint-frontmatter` が欠落を警告する）。
> なお `sidebar_label` は Docusaurus 由来の廃止フィールドで**書かない**（0 件運用・lint が legacy 検出）。

**category の選択肢**（真実源: `src/config/categories.json`）:
- `civil-construction-1` — 1級土木施工管理技士
- `civil-construction-2` — 2級土木施工管理技士
- `pe-comprehensive-management` — 技術士（総合技術監理部門）
- `pe-first-stage` — 技術士 第一次試験
- `pe-construction` — 技術士第二次試験（建設部門）
- `concrete-chief-engineer` — コンクリート主任技師
- `concrete-diagnostician` — コンクリート診断士（下書き）

**tags の例**:
- `guide` — 試験ガイド・勉強方法
- `primary` — 第1次試験対策
- `secondary` — 第2次試験対策
- `past-questions` — 過去問
- `keyword` — キーワード解説

## FAQ オプション（任意）

ガイドページやキーワード解説ページに FAQ セクションを持たせる場合、frontmatter に `faqs` を追加すると `<StructuredData>` が `@type: FAQPage` を出力する。Google の Rich Results で SERP 占有面積拡大が狙える。

```yaml
faqs:
  - q: "1級土木施工管理技士の合格率はどれくらい？"
    a: "第1次試験 約60%、第2次試験 約30%（過去5年平均）。"
  - q: "学習期間の目安は？"
    a: "実務2年以上の受験者で、第1次は3〜4ヶ月、第2次は4〜6ヶ月が目安。"
```

**ルール**:
- `q` / `a` は **プレーンテキスト**（HTML タグや Markdown は書かない）。Schema.org 仕様上 HTML も許容されるが、Google のリッチリザルト表示でエスケープされるケースがあるため避ける
- `q` は質問形（疑問符で終える）、`a` は 1〜3 文程度で簡潔に
- 1 ページあたり **3〜10 件** が目安。多すぎると Google から spam 判定の懸念
- frontmatter の FAQ と本文の FAQ セクション（`## よくある質問` 等）は内容を一致させる
- 配列が空 / 不正な形（`q` か `a` が文字列でない等）の場合は FAQPage スキーマを出力しない

実装は `src/components/seo/StructuredData.tsx` の `generateFAQSchema()`。

## 複数試験対応コンテンツ

frontmatter に複数カテゴリを参照する方法（要検討）:

```yaml
# パターン1: category は主要試験、tags に補助試験を列挙
category: "civil-construction-1"
tags: ["shared-with-pe"]

# パターン2: exams 配列で明示（実装に応じて）
exams: ["civil-construction-1", "pe-comprehensive-management"]
```

このルールにより、新試験対応時の重複排除と SEO 効率を両立する。

## 全試験で共通のデザイン制約

試験を問わず、以下は **必ず統一** する。サイト全体のデザイン一貫性を保つため。

- **frontmatter スキーマ**: `title`, `description`, `category`, `tags`, `group`, `published`, `publishedAt`（必須項目）
- **MDX コンポーネント**: `<Callout>`, `<ExamPoint>`, `<SpecSheetList>`, `<RelatedKeywords>`, `<Timeline>`, `<PdcaCycle>`, `<details>` を試験横断で使用
- **モバイル視認性ルール**: 表は2軸比較のみ、4列以上禁止、計算手順は番号付きリスト、3列以上の表はセル15字以内
- **数式**: KaTeX 一択（他のレンダラを混在させない）
- **図表**: SVG（模式図・フロー）/ PNG（写真・複雑なイラスト）。フロー/タイムライン/PDCA は `<Timeline>` `<PdcaCycle>` コンポーネントも利用可
- **画像配信**: R2 経由 `/posts/{slug}/img/` パスで参照
- **URL**: フラット `/docs/{slug}` 設計
- **見出し階層**: H1 = ページタイトル、H2-H4 = 本文構造、H1 を本文中に複数置かない
- **絵文字禁止**: 装飾絵文字（❌✅💡🔑📌⚠️ 等）は本文に使わない（Callout の type で表現する）
- **MDX 書き込み**: `.claude/scripts/lib/mdx-io.mjs` の `readMdxFile` / `writeMdxFile` 経由で改行コード保持
