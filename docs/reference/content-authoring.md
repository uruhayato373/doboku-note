---
title: コンテンツ作成詳細ルール
---

# コンテンツ作成詳細ルール

MDX コンテンツを書く・編集するときの詳細ルール集。

**いつ読むか**: MDX を新規作成するとき、既存 MDX を編集するとき、`/pdf-to-mdx` / `/keyword-page` / `/review-mobile` などコンテンツ系スキルを実行するとき。

**真実源の関係**:
- コンテンツ品質ルール（ExamPoint 個数・参考資料構成など）の**真実源は `docs/reference/content-principles.md`**
- このファイルは技術的な書き方ガイド（コンポーネント・構造・画像配信）が主
- CLAUDE.md 本体には最低限のルール（frontmatter 必須項目・文字化けチェック・CRLF 改行・絵文字禁止）のみ残している

## ペルソナ・コンテンツ原則

> **品質ルールの単一真実源**: `docs/reference/content-principles.md`
> ExamPoint 個数・配置・禁止パターン（§5）、参考資料の構成（§9）など、すべてのコンテンツ品質ルールはこのファイルが真実源。SKILL.md・lint スクリプト・cem-qa エージェントはこのファイルを参照する。**ルール変更時はまず content-principles.md を更新し、他は参照に揃える。**
>
> **ガイド記事（`group: guide`）固有ルール**: 本文 3,000 字下限（§25・`check-guide-length` で pre-commit/CI ゲート化）、読者ベネフィット型リード（§26）、見出し直下にいきなり箇条書き/図を置かない（§2/§17-2・lint 6-2〜6-4）、末尾は §20 承認パターンで参考資料節は不要（§22 のインライン出典も guide は対象外）。ガイドの品質サイクルは資格横断の専用エージェント3点: **`guide-qa`**（ガイド軸5軸の評価）→ **`guide-rewriter`**（§17/§26/§24/§20 準拠リライト・密度向上・事実是正、pe/総監/コンクリート含む全資格。civil は civil-textbook-rewriter も可）→ **`guide-fact-checker`**（加筆事実を WebSearch で一次情報照合）。過去問=past-exam-qa／キーワード=cem-qa と分業。**3,000 字ゲートは「水増し」を許す粗いフィルタで質を保証しない——質の番人は guide-qa の 5 軸**。加筆した試験統計・制度の事実は公開前に **`guide-fact-checker`** で照合する（LLM は Opus でも年度・制度を外す。32本で43件の誤りを検出した実績）。

- すべてのコンテンツは「実務経験10年以上の総監部門受験者」がスマホで読むことを前提に作成する
- 冒頭は概念の本質を簡潔に。試験での重要性は「総合技術監理における位置づけ」に集約する
- 表・箇条書きの前に必ず文脈を示す導入文を置く
- ベンチマーク: BCP（事業継続計画）ページの構成を品質基準とする
- **品質レベル**: L1（構造）/ L2（学習）/ L3（体験）の3層定義。詳細は `docs/reference/content-principles.md` の「コンテンツ品質レベル」セクション。Wave方式（全体を浅く→中→深く）で進める

## MDX コンポーネント

MDX 内で使える主要コンポーネント（`src/lib/component-loader/index.ts` で登録済み）:

- `<Callout type="note|tip|warn|danger|success|exam|formula|standard|example|reference|faq|quote" title="...">children</Callout>` — 12 種のセマンティックボックス（左アクセントバー + 円形アイコン + 任意タイトル）。視覚ギャラリー: [`docs/ui/callout-gallery.md`](../../docs/ui/callout-gallery.md)
- `<ExamPoint summary="要約文" items={["項目1", "項目2"]} />` — 試験対策ポイント専用ボックス（青タイトル + マーカー付き要約 + 箇条書き）
- `<SpecSheetList title="..." items={[...]} ordered={true|false} marker="dot|dash|square" />` — 仕様書調リスト（ordered / unordered 両対応）。視覚ギャラリー: [`docs/ui/speclist-gallery.md`](../../docs/ui/speclist-gallery.md)
- `<RelatedKeywords items={[{ label: "名前", slug: "slug" }]} />` — 関連キーワードリンクタグ（slug でキーワードページへリンク、slug 省略で灰色テキスト）
- `<ArticleImage src="..." alt="..." width={N} height={N} />` — 画像（`<figure>` セマンティクス付き）。**`caption` は使わない** — [content-principles §8](../content-principles.md) 参照。詳細は「画像コンポーネントの使い分け」
- `<details><summary>解答・解説</summary>...</details>` — 開閉式セクション（過去問で使用）
- `<Timeline>`, `<PdcaCycle>` — 時系列・サイクル表示
- `<SeeAlso href="/docs/slug" title="..." reason="..." />` — 内部 doboku-note ページへの「あわせて読みたい」カード
- `<NoteLink url="..." title="..." description="..." coverImage="..." />` — **note 記事への導線専用カード**（リンク系の使い分けは下記参照）
- `<LinkCard url="..." title="..." description="..." siteName="..." imageUrl="..." />` — 一般外部 URL のカード（OGP 画像を左に本来比で表示する横型カード。モバイルは画像を上に縦積み）
- `<MagazineCard id="..." utmContent="..." />` — note magazine（有料）販売ページへの本文中カード（SoT 解決版・内部で `<MagazineInlineCard>` を描画。記事末尾/サイドバーのタイルは placement 経由で自動配置）

## リンク系コンポーネントの使い分け

リンク先の種別ごとに使うコンポーネントを固定する。**サイト全体のリンク表現を統一するための真実源**。

| リンク先 | 使うもの | 補足 |
|---|---|---|
| 内部 doboku-note ページ | `<SeeAlso>`（ブロック）/ markdown リンク（インライン） | ページ間ナビ |
| **note 記事** | **`<NoteLink>`** | note.com 記事は必ずこれ。生 markdown・`<Callout type="reference">` で note リンクを書かない |
| note magazine（有料）販売ページ | `<MagazineCard>`（本文中）／記事末尾・サイドバーの もくじタイル `HubCtaBanner`（全 HUB 資格で自動） | 商品導線 |
| 書籍・論文 | `<Callout type="reference">` | 参考文献。外部 URL 一般には使わない |
| 一般外部 URL（公的機関・規格等） | `<LinkCard>` または markdown リンク | note 以外の外部サイト |

- **note 記事リンクは例外なく `<NoteLink>`**。`coverImage` は `/images/note-covers/` 配下を渡す（省略可・省略時はテキストカード）。note.com は OGP の bot 取得をブロックするため `<LinkCard>` の自動取得は機能しない
- 自動検出: `/check-mdx --rules note-link`（`lint-mdx-mobile.mjs` ルール 8-3）が `<NoteLink>` 外の note リンクを MEDIUM 警告
- **`coverImage` を指定する場合の手順**（pre-commit が HIGH エラーでブロック）:
  1. カバー PNG（1280×670）を `public/images/note-covers/{name}.png` に配置
  2. `node scripts/generate-note-square-covers.mjs` で `-square.webp` を生成
  3. MDX には `/images/note-covers/{name}.webp` を渡す（`/posts/...` 等の R2 パス禁止）
  4. `public/images/note-covers/{name}.png` + `{name}-square.{png,webp}` の 3 点を git add してコミット

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

ルールの重大度・資格×種別の適用は `.claude/config/content-rules.json` が SSOT。機械チェックは `.claude/scripts/lint-mdx-mobile.mjs`（pre-commit staged + 週次全量ラチェット `check-content-quality`）と `/review-mobile` スキルで実施。

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

## 画像コンポーネントの使い分け

**真実源**: [docs/reference/content-principles.md §8](../content-principles.md) L146 — *caption は「図の説明」には使わない。ただし出典・帰属・機種名などの短い帰属情報（60 字以内）は caption に書いてよい。*

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

SVG 自体のルート要素にも `style="max-width:{viewBox width}px;width:100%"` が必須（`/check-mdx --rules svg` の P3-missing-maxwidth HIGH 違反）。詳細は [.claude/skills/authoring/create-svg/SKILL.md](../skills/authoring/create-svg/SKILL.md) §最大表示幅の固定。

### CC/PD 写真の取得・出典表記

詳細は [image-policy.md](./image-policy.md) 参照（Wikimedia Commons からの取得、ライセンス判定、出典コメントフォーマット）。

## frontmatter テンプレート

```yaml
---
title: "ページタイトル"
description: "50〜160文字の説明"
category: "civil-construction-1"     # 試験または分野
tags: ["guide", "primary"]           # 分類タグ（複数可）
published: true                      # false なら下書き・非表示
---
```

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
