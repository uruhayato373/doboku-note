# doboku-note デザインシステム（単一 SSOT）

> **このファイルがサイト UI・記事タイポグラフィのデザイン唯一の真実源（SSOT）。**
> デザインを変更するときは、まず本ファイルを読み、変更後は本ファイルを同一 PR で更新する（→ §10「更新手順」）。
> 機械可読なトークンの真実源は `src/styles/globals.css` の CSS 変数。本ファイルはその「考え方・使い分け・レイアウト体系」を記述する。

ブランドパーソナリティ: **正確・明快・信頼**。土木・建設系の試験対策ドキュメントとして、長文・数式・図表・過去問の「読みやすさ・学習効率・アクセシビリティ」を最優先する。装飾は最小、情報の正確な伝達が常に勝つ。

---

## 0. スコープと位置づけ

| 区分 | 真実源 | 本ファイルとの関係 |
|---|---|---|
| サイト UI（chrome・レイアウト・ページ骨格） | **本ファイル** + `src/styles/globals.css` | SSOT 本体 |
| 記事タイポグラフィ（`.prose-blog`） | **本ファイル** + `globals.css` | SSOT 本体 |
| カラー/カード/タイポのトークン値 | `src/styles/globals.css`（CSS 変数） | 値は globals.css が機械真実源、使い分けは本ファイル |
| SVG 図版の色・禁止 | 本ファイル §2.2（`--color-*`）+ `svg-tokens.json` | 図版は同値をリテラル hex で書く（→ `create-svg`） |
| Instagram カルーセル | `instagram-carousel.md` + `instagram-carousel-tokens.json` | **別サブシステム**（1080×1350 ラスター）。本ファイルの対象外、§9 でリンク |
| note カバー画像 | `note-cover.md` + `note-cover-tokens.json` | **別サブシステム**。§9 でリンク |
| サイト OGP | `docs/reference/ogp-prompts.md` | **別サブシステム**。§9 でリンク |

> 旧 `principles.md` / `quick-reference.md` / `prohibited.md`（melta-ui 系）と過去のリデザイン検討案（2026-05-25 multi-option・2026-06-27 proposals）は本ファイルへ統合のうえ削除した。必要時は git 履歴から復元できる（`git log --diff-filter=D -- docs/design-system/`）。

---

## 1. 設計の前提（doboku-note 固有）

1. **ドキュメントサイト** — ダッシュボードやデータ可視化ではなく、長文テキスト・数式・図表・過去問の閲覧が主目的。
2. **技術文書の可読性が最重要** — 専門文書を正確に・読みやすく提示する。
3. **モバイル前提** — 現場（屋外）でスマホ参照が多い。375px で破綻しないこと。
4. **印刷も想定** — 技術文書として印刷される。
5. **ダークモード必須** — next-themes（`html.dark` class）。すべての配色・罫線が light/dark 両対応。

技術スタック: Next.js 16 + next-mdx-remote / カスタム CSS（`globals.css`）+ Tailwind / MDX / KaTeX / SVG・PNG / フォント = Inter + Noto Sans JP（sans 既定）。

---

## 2. トークン体系（真実源 = `globals.css`）

**鉄則**: 色・角丸・影・フォントサイズは生値で書かず、必ず CSS 変数か Tailwind トークンを使う。生 hex / `rounded-xl shadow-md` 直書き / インライン `style={{ borderColor }}` は禁止（→ §8）。

トークンは**ドメインで二系統**に分かれる。混同しないこと。

### 2.1 Editorial パレット（サイト chrome + 記事 prose の主軸）

ページの地色・本文・見出し・罫線・リンク・表など「読み物としての面」に使う。

| 変数 | light | dark | 用途 |
|---|---|---|---|
| `--accent` | `#1a3a5c` | `#8fb4d8` | リンク・h3 アクセントバー・強調・thead 文字 |
| `--accent-fill` | `#eef3f8` | `#1a2632` | thead 背景・インラインコード背景・hover |
| `--paper` | `#ffffff` | `#141516` | カード・details の地 |
| `--bg` | `#fafafa` | `#141516` | ページ背景 |
| `--ink` | `#0a0a0a` | `#ececea` | 見出し（h1/h2/h3）本文の最濃色 |
| `--ink-body` | `#2d2d30` | `#b8b5ac` | 本文・td・h4 |
| `--ink-muted` | `#6a6a6a` | `#7a7770` | 補助テキスト・blockquote |
| `--rule` | `#1a1a1a` | `#3a3a3a` | 濃い罫線 |
| `--rule-soft` | `#e8e8eb` | `#2a2a2a` | 既定罫線（Tailwind preflight の border 既定をこれに上書き済み = bare border が dark 追従する） |

### 2.2 Legacy `--color-*` パレット（SVG 図版 + Tailwind semantic）

**廃止ではない。ドメインが違う。** SVG 図版のリテラル hex 真実源であり、Tailwind に `brand`/`ink`/`positive`/`warn`/`danger`/`surface` として登録される semantic ユーティリティの裏付け。図版・意味色（成功/警告/危険）に使う。

| 変数 | light | dark | 用途 |
|---|---|---|---|
| `--color-ink-strong` | `#222222` | `#f3f4f6` | 図版・UI の濃テキスト |
| `--color-ink-body` | `#555555` | `#cbd5e1` | 図版本文 |
| `--color-ink-muted` | `#8a8a8a` | `#94a3b8` | 図版補助 |
| `--color-border` | `#d7d7d7` | `#374151` | 図版罫線 |
| `--color-surface` | `#f5f5f5` | `#1f2937` | KaTeX display 背景等 |
| `--color-brand` | `#2e6da4` | `#60a5fa` | 図版ブランド色 |
| `--color-positive` | `#3a7d44` | `#86efac` | 正・成功 |
| `--color-warn` | `#d4a017` | `#fcd34d` | 警告 |
| `--color-danger` | `#b22234` | `#fca5a5` | 危険・誤 |

> SVG 図版は同じ値を**リテラル hex で書き、コメントでトークン名を併記**する（Satori/Resvg や静的 SVG は CSS 変数を解決できないため）。詳細 → `.claude/skills/authoring/create-svg/SKILL.md`、`svg-tokens.json`。

### 2.3 Callout パレット `--ct-*`（12 種）

12 種の Callout（note/tip/warn/danger/success/exam/formula/standard/example/reference/faq/quote）× bg/border/fg。light/dark 両定義。実装・使い分けは `src/components/ui/Callout/README.md` と `docs/ui/callout-gallery.md`。

### 2.4 カード・影トークン

| 変数 | 値 | 用途 |
|---|---|---|
| `--radius-card-{inline,content,section,hero}` | すべて `2px`（仕様書調に統一） | カード角丸。Tailwind `rounded-card-*` |
| `--shadow-card-{content,section}` | `0 1px 2px /0.05`（dark `/0.15`） | カード影。Tailwind `shadow-card-*` |
| `--shadow-card-hover` | 強めの lift | hover |
| `--shadow-soft` / `--shadow-lift` | editorial 影 | 帯・浮き |

### 2.5 タイポグラフィスケール（固定値・2026-06-26 確定）

参考: 記事 = sidejobearn / 本文・箇条書き = Zenn 実測。

| 変数 | 値 | 用途 |
|---|---|---|
| `--font-size-h1` | `1.5rem`（24px） | 記事 h1 |
| `--font-size-h2` | `1.4rem`（22.4px） | h2 |
| `--font-size-h3` | `1.3rem`（20.8px） | h3 |
| `--font-size-h4` | `1.125rem`（18px） | h4 |
| `--font-size-ui-title` | `1.125rem`（18px） | サイドバー/カード見出し |
| `--font-size-body` | `1rem`（16px） | 本文 |
| `--font-size-secondary` | `0.9375rem`（15px） | Callout 等 |
| `--font-size-small` | `0.875rem`（14px） | TOC/キャプション |
| `--font-size-xsmall` | `0.6875rem`（11px） | index 番号・thead ラベル |

---

## 3. レイアウト体系（editorial ページ骨格）

2026-06-27 のデザイン改善（Phase 0-5, PR #284-#290）で全ページを共通プリミティブへ統一した。**新規ページ・改修は必ずこの体系に従う。**

### 3.1 共通プリミティブ

| コンポーネント | 役割 | 主な API |
|---|---|---|
| `PageShell`（`layout/PageShell.tsx`） | 全ページの chrome（Header/main/Footer）を 1 箇所に集約 | `variant`: `default`（素の main・ページ側が PageHeader+SectionBlock を構成）/ `content`（内側 content rail を持つ単カラム）/ `article`（2カラム記事・docs/category が内側で grid 構成）。`rail`: `780`(既定)/`820`/`860`。`beforeHeader` |
| `PageHeader`（`layout/PageHeader.tsx`） | 下層ページの breadcrumb + eyebrow label + h1 + lead + meta + actions | `variant`: `band`(全幅帯)/`inline`(帯なし)。`titleSize`: `default`/`lg`。`width`: `wide`(既定)/`860`/`780`/`760` |
| `SectionBlock`（`layout/SectionBlock.tsx`） | セクション間余白・band 背景を統一 | — |
| `SectionCard`（`ui/SectionCard/`） | カード（radius/border/shadow を token に統一・カード内カード回避） | — |
| `ArticleHeader`（`ui/ArticleHeader/`） | docs 記事冒頭（breadcrumb + h1 + description リード + byline/meta） | — |
| `CurriculumSections`（`category/CurriculumSections.tsx`） | カテゴリページの体系表示。試験ガイド・テキストを**カードでなく目次調リスト**で見せ、章立て・出題分野の体系を一目で伝える（`CurriculumSection` 枠 / `CurriculumList` 目次リスト / `CareerSection` 注目カード＋リスト）。編成は `src/config/category-curriculum.json`（SSOT）、解決は `src/lib/category-curriculum.ts`（resolver・silent drop 防止の `unassigned` 付き）、健全性は `check-category-curriculum`（pre-commit）。過去問テーブル群（`CategorySections.tsx`）とは併存 | `CurriculumList`: `blocks`/`numbered`。`CareerSection`: `featured`/`rest` |
| `NextStepNav`（`ui/NextStepNav/NextStepNav.tsx`） | guide（要点）記事末の「次のステップ」導線。読者を演習（過去問）・テキスト・分野へ送り行き止まりを解消（リンク先はカテゴリ hub の `sec-*` アンカー＝季節 note CTA と同居）。解決は `src/lib/next-step.ts`（カテゴリ別・純関数）。`MetaCard` の `trackNav` で回遊クリックが `internal_nav_click` 計測に乗る。キャリア記事では非描画（転職導線と非競合）。回遊ナビの GA4 計測は `data-cta="nav"`＋`MetaCard trackNav`／`AnalyticsProvider` の `nav` 種別 | `category` |

`not-found` は Header/Footer を持たない設計のため PageShell を使わない（意図的な例外）。

### 3.2 幅の基準

| 用途 | 基準 |
|---|---|
| Site shell（外枠） | `max-w-[1280px]` + `px-4 sm:px-6 lg:px-10` |
| Article shell | `1280px` 寄せ（docs は 2 カラム） |
| Content rail（読み幅） | `max-w-[780px]`〜`860px`（PageShell `rail`） |
| Sidebar | `300px` |

単カラムページでも外枠は変えず、読み幅は内側 content rail で制御する。

### 3.3 Hero / PageHeader

- **Hero はトップページ専用。** 下層ページは原則 `PageHeader` に統一する。
- `/links` も大型 Hero ではなく薄い `PageHeader` + action grid。
- `/about` / Tools / Legal / Search も同じ上部構造に寄せる。

### 3.4 右サイドバー

右サイドバーを置くのは以下の**2 ページのみ**:

- `/docs/[slug]`（記事 = `ArticleSidebar`）
- `/category/[slug]`

以下には**追加しない**: `/links`・`/search`・`/about`・`/privacy`・`/terms`・`/tools`。
理由 — 検索=入力と結果比較に集中 / links=試験カードを全幅で大きく / about=本文そのもので右に逃さない。

**PC 右サイドバーの `sticky` 固定は解除済み**（読中に追従しない）。再び目次だけ軽く sticky に戻す案は別途検討事項とし、安易に戻さない。

---

## 4. 記事タイポグラフィ（`.prose-blog`）

真実源は `globals.css` の `@layer components`。

- **本文**: 16px / line-height 1.8 / weight 500（中太）。`text-autospace: normal`。段落間は `p + p` で `1.5em`。見出し直後の p は `0.3em`（ほぼ密着）。
- **h1**: ゴシック・weight 700・24px・行間 1.4・`letter-spacing -0.01em`・**罫線なし**（旧・明朝/白抜き/下線は 2026-06-26 廃止）。色 `--ink`。
- **h2**: ゴシック・700・22.4px・**装飾なし**（旧・黒背景白抜きは廃止）。`margin 2.4em 0 0.8em`。
- **h3**: 700・20.8px・**左 4px アクセントバー** `border-left-color: var(--accent)` + `pl-4`。
- **h4**: semibold・18px・**左 2px 細罫** `var(--rule-soft)` + `pl-3`。色 `--ink-body`。
- **リンク**: `color: var(--accent)` + 半透明 accent アンダーライン（offset 4px、hover で濃く）。
- **表**: soft border（`--rule-soft`）+ thead 背景 `--accent-fill` + th はモノスペース・大文字・11px・letter-spacing。`rounded-card-content`。最初列（ラベル列慣習）は `white-space: nowrap`。
- **details / blockquote / code / pre**: editorial soft rule（`--rule-soft`）。インラインコードは `--accent-fill` 背景 + `--accent` 文字。
- **モバイル（≤576px）**: 本文 16px、見出しは em 比例で縮小、table/blockquote/pre/details はフルブリード化（左右 margin 0）。
- **KaTeX**: 本文サイズに揃える（`.katex { font-size: inherit }`）。display 式は `--color-surface` 背景 + `overflow-x: auto`。長い式は横スクロール。

---

## 5. 5 つのデザイン原則

1. **Layered** — Background（地色 `--bg`）→ Surface（カード/表/details = `--paper`）→ Text/Object（`--ink`/`--ink-body`）の 3 層。
2. **Contrast** — WCAG 2.1 AA。通常テキスト 4.5:1 / 大テキスト・UI 3:1。本文 `--ink-body` on `--paper` は十分。
3. **Semantic** — 色は用途で固定。リンク=`--accent`、成功=`--color-positive`、警告=`--color-warn`、危険=`--color-danger`。色だけで情報を伝えない（アイコン/テキスト併用）。
4. **Minimal** — 装飾は最小。見出し階層で視覚ヒエラルキー。カード/枠はグルーピング目的のみ。アニメーションは原則不要。
5. **Grid** — 外枠 1280 / content rail で読み幅 / line-height 1.8（日本語長文最適）/ セクション余白は `SectionBlock` で統一。

---

## 6. アクセシビリティ

- `<img>` には内容を説明する `alt`。装飾画像のみ空 alt 可。
- 表の `<th>` に `scope="col"|"row"`。
- リンクテキストは行き先が分かる文言（「こちら」「ここ」単独は不可）。
- タッチターゲット 44px 以上。
- **ダークモード**: bare な border は既定で `--rule-soft` に追従するが、明示的に色を付けた border には必ず `dark:border-*` を併記する。

---

## 7. UI 実装ルール（`.tsx`）

CLAUDE.md §7 と一致:

- デザイントークン使用（`rounded-card-*` / `shadow-card-*`）。生値 `rounded-xl shadow-md` 直書き禁止。
- 色は token / Tailwind semantic（`brand`/`ink-strong`/`ink-body`/`ink-muted`/`positive`/`warn`/`danger`）または editorial 変数（`var(--accent)` 等）。
- `dark:border-*` を必ず書く。インライン `style={{ borderColor }}` 禁止（`dark:` クラスを上書きするため）。
- 新規ページ・改修は §3 のレイアウト体系（PageShell / PageHeader / SectionCard）に乗せる。
- 機械検出: `node scripts/lint-ui.mjs`（`border-gray-*` の dark 欠落 / `rounded-* + shadow-*` 直書き / インライン borderColor を HIGH 検出）。

---

## 8. 禁止パターン

### カラー
- `color: black` / `#000`（純黒は目が疲れる）→ `--ink`。
- 生 hex の直書き（editorial/legacy トークンがあるもの）→ CSS 変数 / Tailwind token。
- `#999` 以下の薄いグレー本文（WCAG 不適合）→ `--ink-body` 以上の濃さ。
- 色だけで情報伝達 → アイコン/テキスト併用。
- リンク色を本文色と同じに → `--accent` を維持。

### タイポグラフィ
- 日本語**本文**へのネガティブ letter-spacing → 0 以上。（※ ラテン主体の**見出し**は `-0.01em` を採用済み。本文には適用しない。）
- `font-weight: 300` 以下 → 400 以上（本文は 500）。
- MDX 本文 `font-size: 12px` 以下 → 本文 16px 基準。
- 見出し階層スキップ（h2 → h4）→ h1→h2→h3→h4 順。

### レイアウト・カード
- `rounded-{lg,xl,2xl} + shadow-*` の直書き → `rounded-card-*` / `shadow-card-*`。
- インライン `style={{ borderColor }}` → Tailwind `dark:border-*`。
- 下層ページにトップ級の大型 Hero を増やす → `PageHeader`。
- `/search` `/links` `/about` 等へ右サイドバーを追加 → §3.4 の限定に従う。
- 外枠幅をページごとにバラつかせる（`max-w-5xl` 等の混在）→ `max-w-[1280px]` + content rail。

### MDX コンテンツ
- 数式の折り返し → `scroll-equation` で横スクロール。
- 図のキャプション省略 → `<p className="text-center">`。表ヘッダー省略 → `<th>`。
- 原文にない見出し・「まとめ」・補足の追加 → 原文に忠実に。
- 不要な絵文字・過剰な箇条書き化・カード/枠の過剰使用 → 最小限。

### アクセシビリティ
- `alt` なし `<img>` / `scope` なし `<th>` / `outline: none` で focus 欠如 → §6。

---

## 9. 別サブシステム（本ファイルの対象外・リンクのみ）

サイト UI とは別系統。各々が独自トークン真実源を持つ。混ぜない。

| サブシステム | 真実源 | 入口 |
|---|---|---|
| SVG 図版（記事内） | `svg-tokens.json`（§2.2 の `--color-*` をリテラル hex で） | `.claude/skills/authoring/create-svg/SKILL.md` |
| Instagram カルーセル | `instagram-carousel-tokens.json` | `instagram-carousel.md` / `docs/reference/ig-carousel-policy.md` |
| note カバー画像 | `note-cover-tokens.json` | `note-cover.md` |
| サイト OGP | — | `docs/reference/ogp-prompts.md` |
| Callout / SpecSheetList ギャラリー | コンポーネント README | `docs/ui/callout-gallery.md` / `docs/ui/speclist-gallery.md` |

---

## 10. このドキュメントの更新手順（SSOT 管理）

デザインを改善するときは、**コードとドキュメントを同一 PR で更新する**。

1. **トークンを変える**（`src/styles/globals.css` の CSS 変数）→ §2 の該当表を同一 PR で更新。
2. **レイアウトを変える**（`PageShell`/`PageHeader`/`SectionCard`/`ArticleHeader` 等）→ §3 を更新。
3. **記事タイポを変える**（`.prose-blog`）→ §4 を更新。
4. **禁止/原則を追加/緩和** → §5/§8 を更新。
5. コミット前に **`/doc-sync` を 1 回回す**（`src/styles/**`・`src/components/**` は doc-sync 対象面。`doc-sync-auditor` が本ファイルとの意味ズレを検出）。
6. 過去の検討案・退役仕様は本ファイルに残さず `_archive/` へ退避し、参照を同一 commit で張り替える（`npm run check-doc-refs`）。

**読み手（ツール）**: `/design-review` スキル（Evaluator）と `page-design-builder` エージェント（Generator）は本ファイルを基準に動く。本ファイルが陳腐化すると両者が誤った基準でレビュー/生成するため、更新を怠らない。

---

## 11. ツーリング（Generator / Evaluator 分離）

| 役割 | 実体 | 担当 |
|---|---|---|
| Generator（ページ UI を設計・実装） | 親 Claude Code ＋ `page-design-builder` エージェント | §3 体系に沿ったページ/レイアウト案・実装 |
| Evaluator（デザイン準拠を検証） | `/design-review` スキル（`--visual` で Playwright 視覚回帰） | 7 カテゴリ静的レビュー + light/dark × desktop/mobile スクショ採点 |
| 静的 lint | `scripts/lint-ui.mjs` | token 逸脱・dark 欠落・インライン borderColor |
| SVG 図版 | `svg-figure-auditor` / `svg-canvas-fitter` / `svg-figure-rewriter` | §9 別サブシステム |

> Generator（作った直後は「綺麗だ」と判断するバイアスを持つ）と Evaluator を**必ず分離**する。

---

## 履歴・退避

- 2026-06-27: デザイン改善 Phase 0-5 + token 化（PR #284-#290）完了・本番 deploy。
- 2026-06-28: 旧 `principles.md` / `quick-reference.md` / `prohibited.md` を本ファイルへ統合。旧 3 doc と検討案（`2026-05-25-page-redesign/`・`2026-06-27-*.md`）は削除（git 履歴に保全）。
