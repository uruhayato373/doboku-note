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
| サイト OGP | `.claude/knowledge/reference/ogp-prompts.md` | **別サブシステム**。§9 でリンク |

> 旧 `principles.md` / `quick-reference.md` / `prohibited.md`（melta-ui 系）と過去のリデザイン検討案（2026-05-25 multi-option・2026-06-27 proposals）は本ファイルへ統合のうえ削除した。必要時は git 履歴から復元できる（`git log --diff-filter=D -- .claude/knowledge/design-system/`）。

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

**2026-07 Soft Editorial 改訂**: 紺のアイデンティティを保ちつつ 1 段明るく・寒色寄せに調整（重苦しさの解消と浮遊感の付与）。全て WCAG AA 以上（accent 白地 6.6:1 / body 11.4:1 / muted 4.9:1）。dark は `--paper` を `--bg` より 1 段明るくしカードに立体感を出す。**このパレットのみが刷新対象**で、下記 2.2 `--color-*`・2.3 `--ct-*`・試験別 `--exam-*` は**凍結**（OGP/note カバー/cta-bg/SVG 図版と色を共有するため触らない）。

| 変数 | light | dark | 用途 |
|---|---|---|---|
| `--accent` | `#2a5f96` | `#93b8e0` | リンク・h3 アクセントバー・強調・thead 文字 |
| `--accent-fill` | `#edf3fa` | `#1d2836` | thead 背景・インラインコード背景・hover |
| `--paper` | `#ffffff` | `#1b1d21` | カード・details の地 |
| `--bg` | `#f6f7f9` | `#121316` | ページ背景 |
| `--ink` | `#181a1f` | `#ececea` | 見出し（h1/h2/h3）本文の最濃色 |
| `--ink-body` | `#33363d` | `#b6b9c0` | 本文・td・h4 |
| `--ink-muted` | `#697080` | `#80858f` | 補助テキスト・blockquote |
| `--rule` | `#23252b` | `#3c3f47` | 濃い罫線 |
| `--rule-soft` | `#e7e9ef` | `#2b2e35` | 既定罫線（Tailwind preflight の border 既定をこれに上書き済み = bare border が dark 追従する） |

> リンク下線色・表行 hover 色は `color-mix(in srgb, var(--accent…) …)` で `--accent`/`--accent-fill` から派生させ、accent 変更に自動追従する（旧: 生 rgba の light/dark 2 定義）。

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

### 2.4 カード・影・モーショントークン

**2026-07 改訂**: カードは直角（角丸ゼロ）。inline（バッジ・チップ・インラインコード）のみ `6px` を維持。影は 2 層ソフトシャドウ（slate 寒色 `rgb(15 23 42)`）。値のみ変更で `rounded-card-*`/`shadow-*` 経由の全カードが自動追従。

| 変数 | 値 | 用途 |
|---|---|---|
| `--radius-card-inline` | `6px` | バッジ・チップ・インラインコード |
| `--radius-card-content` | `0` | 標準カード・表・details・pre・KaTeX display |
| `--radius-card-section` | `0` | SectionCard 等の大カード |
| `--radius-card-hero` | `0` | トップ hero |
| `--shadow-card-content` | `0 1px 2px /.04, 0 2px 8px /.05` | カード影（2 層）。Tailwind `shadow-card-*` |
| `--shadow-card-section` | `0 1px 3px /.04, 0 6px 20px /.06` | 大カード影 |
| `--shadow-card-hover` | `0 2px 4px /.06, 0 12px 32px /.10` | hover lift |
| `--shadow-soft` / `--shadow-lift` | editorial 影 | 帯・浮き |
| `--dur-fast` / `--dur-base` | `150ms` / `200ms` | transition duration |
| `--ease-soft` | `cubic-bezier(.22,1,.36,1)` | イージング |
| `.focus-ring` | 共通 focus-visible | キーボード操作時の現在位置表示 |
| `--disclosure-chevron` / `.disclosure-chevron` | 細線シェブロン SVG（mask 用 data URI）／開閉回転クラス | アコーディオン開閉アイコン（`DisclosureChevron`／prose details）。Tailwind の transform 変種が本 build で無効なため回転は素の CSS |

> クリック可能カードの hover 演出は共通クラス `.card-interactive`（影の深化＋`translateY(-2px)`）を使う。`prefers-reduced-motion: reduce` で transition/animation を無効化済み。**scale・色反転・長い duration は禁止**（§8）。
> `transition-all` は禁止。hover で変わる対象だけを `transition-colors` / `transition-shadow` / `transition-[border-color,box-shadow]` / `transition-[width]` のように明示する。
>
> キーボードフォーカスは共通クラス `.focus-ring` を使う。`focus-visible` のみで `--accent` リングを出し、マウスクリック時の不要なリングを避ける。`focus:outline-none` を使う場合は、同じ要素に `.focus-ring` または明示的な `focus-visible:ring-*` を必ず併用する。

### 2.5 タイポグラフィスケール（2026-07 Soft Editorial 改訂）

参考: 本文・箇条書き = Zenn 実測 / 和文タイポ = 16px 以上・行間 1.7〜1.9・letter-spacing 0.02〜0.05em・見出しに `palt`（AQ works / Typotheque 各ガイド）。フォントはシステムスタック（游ゴシック→ヒラギノ→Meiryo・webfont は LCP 対策で非採用）を維持し、詰め・トラッキング・ジャンプ率で磨く方針。

| 変数 | 値 | 用途 |
|---|---|---|
| `--font-size-h1` | `1.75rem`（28px） | 記事 h1（ジャンプ率拡大） |
| `--font-size-h2` | `1.375rem`（22px） | h2 |
| `--font-size-h3` | `1.1875rem`（19px） | h3 |
| `--font-size-h4` | `1.0625rem`（17px） | h4 |
| `--font-size-ui-title` | `1.125rem`（18px） | サイドバー/カード見出し |
| `--font-size-body` | `1rem`（16px） | 本文 |
| `--font-size-secondary` | `0.9375rem`（15px） | Callout 等 |
| `--font-size-small` | `0.875rem`（14px） | TOC/キャプション |
| `--font-size-xsmall` | `0.6875rem`（11px） | index 番号・thead ラベル |

---

## 3. レイアウト体系（editorial ページ骨格）

2026-06-27 のデザイン改善（Phase 0-5, PR #284-#290）で全ページを共通プリミティブへ統一した。**新規ページ・改修は必ずこの体系に従う。**

> [!warning]
> **既存の共通機構を探してから書く。** 2026-07 に「共通機構があるのに新しい面が独自実装する」事故が
> 3 回起きた——docs サイドバーが `resolveCurriculum` を使わず career 記事を 49 件中 26 件混入させ、
> 同サイドバーが `shortTitle`/`subtitle` を使わずフル title を並べて冗長化し、`/links` の末尾が
> `AuthorProfile` を使わず運営者カードを 54 行分再実装した。いずれもルールは本ファイルにあった。
> **ページが SSOT データ（`@/config/author`・`@/lib/note-magazines` 等）を直接 import していたら
> 迂回のサイン**。`npm run check-ssot-consumers` が WARN で surface する（allowlist に理由を書けば通る）。
> なお**幅の一致は機械検査しない**——描画しないと判定できず、静的な `max-w-*` 検査は
> 意図的なネスト（`/about` の 4xl 内 2xl 等）を誤検知して形骸化するため。幅は本節の体系と
> `/design-review` で担保する。

### 3.1 共通プリミティブ

| コンポーネント | 役割 | 主な API |
|---|---|---|
| `PageShell`（`layout/PageShell.tsx`） | 全ページの chrome（Header/main/Footer）を 1 箇所に集約 | `variant`: `default`（素の main・ページ側が PageHeader+SectionBlock を構成）/ `content`（内側 content rail を持つ単カラム）/ `article`（2カラム記事・内側で `TwoColumnShell` を使う）。`rail`: `780`(既定)/`820`/`860`。`beforeHeader` |
| `TwoColumnShell`（`layout/TwoColumnShell.tsx`） | **2カラム（本文＋右サイドバー）の単一定義**。docs 記事・category が共用（旧: 各ページが手書きコピペ）。外枠 `max-w-[1280px]`・カラム間 `gap-10`(40px)・サイドバー `w-72`(288px)・`zenn-desktop`(≥993px)でのみサイドバー表示——これらレイアウト値の**真実源はこのファイルのみ**（幅・gap・cap を変えるときはここだけ）。サイドバー中身は `aside` prop へ渡す（`<aside>` 要素・幅・表示制御はシェルが所有） | `gutter`: `flush-mobile`（docs・≤576px 外周0でカードフルブリード）/ `default`（category 等・`px-4 sm:px-6 lg:px-10`）。`mainClassName`(既定 `py-10`)。`aside` |
| `PageHeader`（`layout/PageHeader.tsx`） | 下層ページの breadcrumb + eyebrow label + h1 + lead + meta + actions | `variant`: `band`(全幅帯)/`inline`(帯なし)。`titleSize`: `default`/`lg`。`width`: `wide`(既定)/`860`/`780`/`760` |
| `SectionBlock`（`layout/SectionBlock.tsx`） | セクション間余白・band 背景を統一 | — |
| `SectionCard`（`ui/SectionCard/`） | カード（radius/border/shadow を token に統一・カード内カード回避） | — |
| `ArticleHeader`（`ui/ArticleHeader/`） | docs 記事冒頭（breadcrumb + h1 + description リード + byline/meta） | — |
| `CurriculumSections`（`category/CurriculumSections.tsx`） | カテゴリページの体系表示。試験ガイド・テキストを**カードでなく目次調リスト**で見せ、章立て・出題分野の体系を一目で伝える（`CurriculumSection` 枠 / `CurriculumList` 目次リスト / `CareerSection` 横スクロールカードレール）。編成は `src/config/category-curriculum.json`（SSOT）、解決は `src/lib/category-curriculum.ts`（resolver・silent drop 防止の `unassigned` 付き）、健全性は `check-category-curriculum`（pre-commit・`guide`/`careerFeatured`/`textbookChapters` に加え `keywordSection` の slug 実在・重複・列数一致も検査し、検査した slug 参照数を出力する＝検査 0 件の偽 PASS 防止）。過去問テーブル群（`CategorySections.tsx`）・キーワード節（`KeywordSections.tsx`）とは併存。テキスト章がある分野の**要点 guide は各章の入口**（config `textbookChapters[].introGuides`）に「要点」マーカーで内包し、分野別対策との重複を回避 | `CurriculumList`: `blocks`/`numbered`/`collapsible`（テキストは章を `<details>` アコーディオン。`collapsible` 章の summary は `[章番号(config `chapterNo`)] [章タイトル] [N記事] [右端 `DisclosureChevron`]` の 1 行＝畳めば体系一目・開いてドリルダウン。`block.intro` で章頭の要点。分冊見出しは章タイトルより一段控えめな 13px 太字＋区切り罫線）。`CareerSection`: `featured`/`rest`（注目→残りの順で 1 本の横スクロール `CardRail`（ui/CardRail・左右矢印付き）に統合＝二次セクションを全件縦積みせず畳む。カード幅 clamp(240,80%,288px) で常に次カードを覗かせ scroll-snap で吸着。レールは最大 `CAREER_RAIL_MAX`=10 枚で打ち切り、超過分は「その他のキャリア記事 N記事」の `<details>` 目次リストへ＝リンクは閉状態でも DOM に残りクロール/内部リンク維持。テールの発見は記事ページの RelatedArticles（career タグ共有で自動相互リンク）と検索が担う。全カテゴリ共通・career 記事が無い資格では非描画） |
| `CategoryNavCard`（`ui/CategoryNavCard/`） | docs 記事の**カテゴリ内ナビ一覧**（PC 右サイドバー＋モバイル記事末の 1 コンポーネントで両面）。**学習系のみを載せ、転職・キャリア記事（`tags: [career]`）は入れない** — career は `group: guide` なので `classifyDoc` が `guide` を返し、素朴な filter だと混入する（2026-07-28 に civil-1 で 49 件中 26 件・civil-2 で 22 件中 10 件が混入していた）。civil の `guide` 分岐は **`resolveCurriculum` 経由**で examGuide 記載順 → unassigned の意図順に並べる（カテゴリページと同じ SSOT `category-curriculum.json` を共有・slug アルファベット順にしない）。判定述語は `isCareerDoc`（`lib/doc-classifier.ts`）に集約。転職導線はサイドバーのアフィリ枠とカテゴリページ `CareerSection` が担当。健全性は `check-career-separation`（pre-commit＝source 整合／CI＝`--built` で `data-nav-list="exam-guide"` 内に career リンクが無いこと）。**リンクは 2 行構成**＝1 行目 `shortTitle ?? title`、2 行目 `subtitle`（12px `--ink-muted`・`line-clamp: 2`）。解決は `lib/doc-title.ts` の `resolveNavTitle`（**title の分割はしない** — 区切り方言が 2 系統・2 段区切り 6 件・資格名除去で 21 件破綻するため実測で却下）。PC/モバイル両 variant で同一。frontmatter が欠けると長い title にフォールバックするので `lint-frontmatter` が guide の `shortTitle`/`subtitle` 欠落を MEDIUM 警告 | `variant`（sidebar/mobile）/ `category` / `currentSlug` / `docGroup` / `categoryArticles` |
| `ExamMatrix`（`category/ExamMatrix.tsx`） | 「**行ラベル × 種別リンク**」マトリクスの**全資格共通**レンダラ（過去問＝年度 or 科目 × 問題種別、建設部門キーワード節＝選択科目 × 種別）。デスクトップ=table／モバイル(<993px)=**1 行 1 レコードのチップリスト**（行ラベル＋存在するリンクだけ `ExamChipLink` 横並び）。**表は `min-w-full`（`w-full` にしない）**＝`w-full` は表を枠内へ縮めるため、縮まない値セルに押された行ラベル列が潰れて折返す（建設部門 8 列・記事カラム 527px で科目列 64px・行高 193px・節 1,453px の崩れが 2026-07-30 に発生。`min-w-full` なら内容が狭いときは全幅・広いときは自然幅で親が横スクロール）。**行ラベル列は `sticky left-0`** で横スクロール中も左に残す（背景は不透明 `--paper` が必須なので行 hover は `group-hover` で追従させる）。`CategorySections.tsx` の各 `*ExamTable`（civil-1/civil-2/総監/一次/建設部門）は整形して `columns`/`rows` を渡すのみ | `columns: string[]` / `rows: {key,label,labelTitle?,cells:{label,chipLabel?,doc?}[]}[]`（`labelTitle`=短縮表示時の正式名を title へ／`chipLabel`=モバイルチップだけ差し替え＝行ラベルが科目の面ではチップ側が年度を名乗る）/ `rowHeader?`（行ラベル列の見出し・既定 `年度`。キーワード節は `選択科目`、建設部門過去問は `科目`）/ `rowLabelWidth?`（`default`=年度 nowrap／`wide`=長い科目名を全幅行見出しにしてチップを次行へ）/ `dense?`（列が多い面のセル左右余白 `px-2`＋チップを mono 詰め。**縦 `py-2` は詰めない**＝タップ標的の高さを保つ）/ `tableFrom?`（table に切り替える最小幅。既定 `desktop`=993px／`wide`=`xl`(1280px)。**「表が記事カラムに収まる幅でしか table を出さない」ための切替**＝建設部門 8 列は自然幅 600px で、記事カラムがそれを満たすのは viewport ≥1,116px（内容幅 = V − 516）。それ未満はチップリストで見せるので**全幅域で横スクロール 0**）。チップ=`ExamChipLink`（`dense` 対応）。`rowLabelWidth='wide'` は ≥769px（`zenn-tablet`）で行ラベルを inline に戻し `min-w-[10rem]`（最長ラベル幅）で揃える＝1 レコード 1 行に圧縮（これ以上広げると 1024px 帯でチップが 2 行に折返す） |
| `PE_CONSTRUCTION_SUBJECTS`（`lib/pe-construction-subjects.ts`） | 建設部門の 必須科目I ＋ 11 選択科目の**行ラベル単一真実源**。同一ページに縦に並ぶ 2 つのマトリクス（過去問＝科目×年度、キーワード節＝科目×種別）が同一表記・同一順であることが「同じ行を横に読む」設計の前提。`short` は狭い記事カラム（993〜1150px＝527px）で折返さない表示形（例 `鋼構造・コンクリート`／`河川・砂防・海岸`／`施工計画・積算`＝既存記事の `shortTitle` 語彙に合わせる）で、正式名は `title`/`aria-label` に残す。キーワード節側は `category-curriculum.json` の `keywordSection.selective.subjects[].label`/`fullLabel` に同じ表示形を書き、**ドリフトは `check-category-curriculum` が定義行と突合して HARD FAIL** させる | `subjectDisplayLabel(s)` / `subjectFullLabel(s)` / `findPeConstructionSubject(key)` |
| `KeywordSections`（`category/KeywordSections.tsx`） | **キーワード節（`keyword` group）のレンダラ**。建設部門の 35 本を 3 列カードグリッド（12 行・実測 ~2,600px）から**必須科目I ブロック＋選択科目 科目×種別マトリクス**（desktop ~1,160px）へ圧縮した実装（2026-07-30）。構成＝ブロック見出し（ラベル＋件数＋罫線・`CurriculumList` の分冊区切りと同様式）／先頭 1 本の `LeadRow`（左に accent 縦罫）／`KeywordChip` 帯（**白地＋罫線**＝`ExamChipLink` の accent-fill 地とは別実装。12 枚並べると面が青一色になるため）／選択科目は `ExamMatrix`（`rowHeader="選択科目"`・`rowLabelWidth="wide"`）。チップの表示ラベルは種別サフィックス（` 論点キーワード`/` 論文の論点`/` 論文`）を落として圧縮し、**`aria-label` には省略前の記事名**を渡す。アンカー `sec-keyword` は `DocSection` 時代と同一（`NextStepNav` 等の既存リンクを維持）。編成は `category-curriculum.json` の `keywordSection`（SSOT）、解決は `resolveKeywordSection`（未割当は「その他」で必ず表示＝silent drop 防止）、健全性は `check-category-curriculum`。config 未定義のカテゴリは従来のカードグリッドへ fallback | `section`（`ResolvedKeywordSection`）/ `title` / `description?`（節タイトル・説明は `category-groups` の `GROUP_DESCRIPTIONS` が真実源なので config に持たせず渡す） |
| `CardRail`（`ui/CardRail/`） | **横スクロール カードレールの共通コンポーネント**（client）。見た目は globals.css `.card-rail`（scroll-snap・カード幅 clamp で次カード覗き・右端フェード）、この component は左右端の**浮き矢印オーバーレイ**を追加（クリックで 1 画面ぶん scrollBy・端に達した側は自動非表示・全カード収容時は両方非表示・sm 未満は非表示＝モバイルはスワイプのみ）。矢印は角丸なし細線ボタン（DisclosureChevron と同 path）。縦センタリング/左右反転は inline style（Tailwind transform 系は本 build 不可）。CareerSection で使用・他セクションでも再利用可 | `children`（カード群） / `ariaLabel?` |
| `OgpThumbRow`（`category/CategorySections.tsx`） | **OGP サムネ左＋タイトル右の1行の単一実装**（全資格・カテゴリ hub 共通）。「よく読まれている記事」（`PopularShowcase`・`rank` 付き）と各セクションの OGP 行（`DocSection layout="ogp-rows"`・`rank` 無し）で共用。サムネは `aspect-[1200/630] w-[124px] sm:w-[168px]`。**`self-start` 必須**＝親 flex の `align-items:stretch` がサムネをテキスト列の高さに引き伸ばし `aspect-ratio` を無効化する縦伸び事故を防ぐ（2026-07-15 根治。横並び flex 内で aspect 比を保つ要素には常に付ける）。OGP は R2 配信・全 published で CI 実在保証 | `doc: DocMeta` / `rank?: number` |
| `DisclosureChevron`（`ui/DisclosureChevron.tsx`） | **アコーディオン（`<details>`）開閉アイコンの単一実装**（細線シェブロン・右向き→開くと 90°回転）。FAQCard・CurriculumList（テキスト章）共通。回転は `.disclosure-chevron`（globals.css の素の CSS）＝Tailwind の transform 変種（`rotate-90` 合成／`[transform:…]` arbitrary）が本 build で無効なため。prose 記事内 `<details>` も同一 path を `--disclosure-chevron` マスク＋`[open]` 回転で使う（path の真実源は DisclosureChevron） | `className`（色・サイズ passthrough） |
| `NextStepNav`（`ui/NextStepNav/NextStepNav.tsx`） | guide（要点）記事末の「次のステップ」導線。読者を演習（過去問）・テキスト・分野へ送り行き止まりを解消（リンク先はカテゴリ hub の `sec-*` アンカー＝季節 note CTA と同居）。解決は `src/lib/next-step.ts`（カテゴリ別・純関数）。`MetaCard` の `trackNav` で回遊クリックが `internal_nav_click` 計測に乗る。キャリア記事では非描画（転職導線と非競合）。回遊ナビの GA4 計測は `data-cta="nav"`＋`MetaCard trackNav`／`AnalyticsProvider` の `nav` 種別 | `category` |
| `HubCtaBanner`（`ui/HubCtaBanner/HubCtaBanner.tsx`） | **資格別リッチ背景 note CTA / もくじタイル**。カテゴリ hub の本文＋PC サイドバー＋モバイル、および docs 記事の末尾＋サイドバーの**もくじタイル**に共用（NextStepNav が指す「季節 note CTA」の実体）。背景は資格ごと 1 枚 `public/images/cta-bg/*.webp` を使い回し、文言・価格は**画像に焼かず HTML 文字を左に重ねる**（文字色は `--on-image-*` の固定濃色＝背景イラストが常に明色のため dark でも可読）。**季節モード**: 直前期（試験日の 6 週間前〜試験日）は売れ筋の特定商品へ直リンク（`mode=product`・価格ピル）、それ以外は資格別 **L2「もくじ」へ集約**（`mode=mokuji`・マガジンが増えても config 追加不要でスケール）。解決は `src/lib/hub-cta.ts`（`resolveHubCta(category, {utmSuffix?})`・ビルド時 `Date.now()` で switch。カテゴリ hub・docs 記事末尾・docs サイドバーで共用し `utmSuffix`（`-sb`/`-mob`/`-docs-sb`/`-footer`）で面分離）。もくじ URL は **`.claude/config/note-funnel.json` の L2 レジストリと同一 note 永続 ID**（変更時は両方更新）。GA4 は `data-cta="note"`＋`data-cta-label`、色は `--exam-*` トークン | `cta`（`ResolvedHubCta`） |
| `MagazineHeroCta`（`ui/MagazineHeroCta/`） | **note マガジン単体の画像中心ヒーロー CTA バナー**（高さ ~380px）。資格別背景イラスト（`brandOf(id)` の `cta-bg/*.webp`）を**ブランド紺 `--hero-cta-tint` で覆い**、白キーライン枠の中にバッジ帯→キャッチコピー→短縮説明→マスコット「doboku-note 先生」円形アバター→note 緑の大ボタンを積む。文字は白＋`--hero-cta-*`（テーマ非追従の画像上固定色・`--on-image-*` と同型）。**文言・URL・キャラは全て `note-magazines.ts` から `id` で解決**（`ctaCatch`/`ctaButton`/`ctaPose`・省略時フォールバックあり）＝焼き込みバナーを作らずマガジン追加・価格改定で画像生成が不要。描画元は `MidArticleCta`（note モード＝記事中間 CTA の既定）と MDX `<MagazineCard>`（既定 `variant="hero"`）。列挙面（同一記事 3 枚以上）は `variant="inline"`＝`MagazineInlineCard` に落とす。アバターは `public/images/character/avatar-{pose}.webp`（`npm run character-avatars`）。`getMagazine()` ゲートで未公開は自動非表示。GA4 は `data-cta="note"`＋`data-cta-label` | `id`（`MagazineId`）/ `utmContent` |
| `MagazineTopBanner`（`ui/MagazineTopBanner/`） | docs 記事**冒頭**（ArticleHeader と本文 prose の間）に置く 1 行テキスト note CTA（バッジ＋短縮タイトル＋価格＋矢印）。二次系の高 intent ページのみ `resolvePlacement().top`（`src/lib/magazine-placement.ts`）で設定され、記事が長いため冒頭にも到達導線を 1 本置く。**末尾のもくじタイル（`HubCtaBanner`）と別物・重複可**（冒頭=個別商品テキスト／末尾=もくじタイルで役割が違う）。表示可否は `getMagazine()`（published＋noteUrl）ゲート通過で決まり未公開は自動非表示。GA4 は `data-cta="note"`＋`data-cta-label`（utm_content） | `url`/`title`/`price?`/`badge`/`trackLabel` |
| `LinksHubTile`（`ui/LinksHubTile/`） | 「note 有料教材まとめ（`/links`）」への**内部リンクタイル**（画像レス・accent テキスト）。ホームの note 教材セクションで使う（記事側の note CTA は 2026-07 に `HubCtaBanner` もくじタイルへ統一し ArticleFooter フォールバックは廃止）。全資格横断ハブのため単一資格イラストは使わない。`data-cta="note"` で計測（内部遷移・同タブ） | `trackLabel` |

`not-found` は Header/Footer を持たない設計のため PageShell を使わない（意図的な例外）。

### 3.2 幅の基準

| 用途 | 基準 |
|---|---|
| Site shell（外枠） | `max-w-[1280px]` + `px-4 sm:px-6 lg:px-10` |
| Article shell（2カラム） | `max-w-[1280px]` + カラム間 `gap-10`(40px)。真実源 = `TwoColumnShell` |
| Content rail（読み幅） | `max-w-[780px]`〜`860px`（PageShell `rail`） |
| Sidebar | `288px`（`w-72`・`TwoColumnShell` 所有・≥993px でのみ表示） |
| 記事カード 横 padding | ≤576px `16px`（`--article-gutter-sp`）/ 577–992px `40px`（`px-10`）/ ≥993px `44px`（`zenn-desktop:px-11`） |

単カラムページでも外枠は変えず、読み幅は内側 content rail で制御する。
2カラム（docs/category）は必ず `TwoColumnShell` を使い、コンテナ・サイドバー幅・gap を手書きしない。
モバイル（≤576px）は記事カードを外周0でフルブリードし、設問カード（`.prose-blog details`）は
`--article-gutter-sp` を負マージンで相殺して真の全幅化＋内側同値 padding の単層にする（二重 padding 回避）。

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

**上端揃え（docs/category 共通）**: メイン本文と右サイドバーの上端は揃える。縦位置は `TwoColumnShell` の `aside py-10` ＝ main の上 padding（≥993px で 40px）が唯一の供給源で、**サイドバー先頭要素・main 先頭要素に独自の `margin-top` を持たせない**（先頭が下がって上端がズレる。例: 旧 `SidebarAdBanner` の `mt-3` を撤去して是正）。

**PC 右サイドバー（`/docs`）は 2 ブロック構成**（2026-07 改訂）:
1. **通常フロー（追従させない）**: 転職アフィリ枠（最上部・唯一のピクセル源）→ note もくじタイル（`HubCtaBanner`・転職枠直下に 1 枚・utm `-docs-sb`。HUB 対応資格 & 非 career 記事のときのみ＝`resolveHubCta` が null で自動非表示）→ 運営者プロフィール。広告・著者は追従させない（「広告が追いかけてくる」体験を避ける）。
2. **sticky クラスタ（列の最終要素・読中に追従）**: TOC / 設問ナビ → カテゴリナビ → ピラーナビ。`sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto`。ナビゲーションだけ追従させ長記事でも導線を視界に残す。

> sticky クラスタの**下に非 sticky 要素を置かない**（下スクロールで届かなくなる過去事故）。だからクラスタは列の末尾に置く。TOC 自身の `max-h` は撤去し高さ制御を sticky コンテナへ一元化。note もくじタイルは記事末尾（`ArticleFooter`・utm `-footer`）と PC サイドバー（utm `-docs-sb`）に各 1 枚を併掲し全 HUB ページで統一（2026-07・個別マガジンタイルは廃止）。

---

## 4. 記事タイポグラフィ（`.prose-blog`）

真実源は `globals.css` の `@layer components`。

- **本文**: 16px / line-height 1.8 / weight 500（中太）/ `letter-spacing 0.03em`（2026-07 追加・和文可読性）。`text-autospace: normal`。段落間は `p + p` で `1.5em`。見出し直後の p は `0.3em`（ほぼ密着）。コード・数式（`code`/`pre`/`.katex`）は `letter-spacing: normal` でリセット。
- **見出し共通**: `font-feature-settings: "palt" 1`（仮名・約物を詰める）+ `letter-spacing 0.02em`（呼吸を戻す）。2026-07 に旧 `-0.01em`（ラテン主体前提）から反転。
- **h1**: ゴシック・weight 700・28px・行間 1.4・**罫線なし**（旧・明朝/白抜き/下線は 2026-06-26 廃止）。色 `--ink`。
- **h2**: ゴシック・700・22px・**装飾なし**（旧・黒背景白抜きは廃止）。`margin 2.8em 0 0.8em`（セクション区切りを余白で作る）。
- **h3**: 700・19px・**左 4px アクセントバー** `border-left-color: var(--accent)` + `pl-4`。
- **h4**: semibold・17px・**左 2px 細罫** `var(--rule-soft)` + `pl-3`。色 `--ink-body`。
- **リンク**: `color: var(--accent)` + 半透明 accent アンダーライン（offset 4px、hover で濃く）。
- **表**: soft border（`--rule-soft`）+ thead 背景 `--accent-fill` + th はモノスペース・大文字・11px・letter-spacing。`rounded-card-content`。最初列（ラベル列慣習）は `white-space: nowrap`。
- **details / blockquote / code / pre**: editorial soft rule（`--rule-soft`）。インラインコードは `--accent-fill` 背景 + `--accent` 文字。
- **モバイル（≤576px）**: 本文 16px、見出しは em 比例で縮小、table/blockquote/pre はフルブリード化（左右 margin 0）。details（設問カード）は `--article-gutter-sp` を負マージンで相殺して記事カード端まで真の全幅化＋内側同値 padding の単層構成（table 等の単純 margin 0 とは別メカニズム・詳細 → §3.2）。
- **KaTeX**: 本文サイズに揃える（`.katex { font-size: inherit }`）。display 式は `--color-surface` 背景 + `overflow-x: auto`。長い式は横スクロール。

---

## 5. 5 つのデザイン原則

1. **Layered** — Background（地色 `--bg`）→ Surface（カード/表/details = `--paper`）→ Text/Object（`--ink`/`--ink-body`）の 3 層。
2. **Contrast** — WCAG 2.1 AA。通常テキスト 4.5:1 / 大テキスト・UI 3:1。本文 `--ink-body` on `--paper` は十分。
3. **Semantic** — 色は用途で固定。リンク=`--accent`、成功=`--color-positive`、警告=`--color-warn`、危険=`--color-danger`。色だけで情報を伝えない（アイコン/テキスト併用）。
4. **Minimal** — 装飾は最小。見出し階層で視覚ヒエラルキー。カード/枠はグルーピング目的のみ。モーションは抑制（クリック可能カードの hover 演出 = 影の深化＋`translateY(-2px)` まで。`.card-interactive` を使う。scale・色反転・長い duration は禁止）。
5. **Grid** — 外枠 1280 / content rail で読み幅 / line-height 1.8（日本語長文最適）/ セクション余白は `SectionBlock` で統一。

---

## 6. アクセシビリティ

- `<img>` には内容を説明する `alt`。装飾画像のみ空 alt 可。
- 表の `<th>` に `scope="col"|"row"`。
- リンクテキストは行き先が分かる文言（「こちら」「ここ」単独は不可）。
- タッチターゲット 44px 以上。
- **フォーカス表示**: リンク・ボタン・入力欄・textarea・select などの操作要素は、ブラウザ既定 outline を残すか `.focus-ring` を付ける。
- **ダークモード**: bare な border は既定で `--rule-soft` に追従するが、明示的に色を付けた border には必ず `dark:border-*` を併記する。

---

## 7. UI 実装ルール（`.tsx`）

CLAUDE.md §7 と一致:

- デザイントークン使用（`rounded-card-*` / `shadow-card-*`）。生値 `rounded-xl shadow-md` 直書き禁止。
- 色は token / Tailwind semantic（`brand`/`ink-strong`/`ink-body`/`ink-muted`/`positive`/`warn`/`danger`）または editorial 変数（`var(--accent)` 等）。
- `dark:border-*` を必ず書く。インライン `style={{ borderColor }}` 禁止（`dark:` クラスを上書きするため）。
- 操作要素には `.focus-ring` を付ける。`focus:outline-none` 単独は禁止。
- `transition-all` 禁止。変化するプロパティだけを明示する。
- 新規ページ・改修は §3 のレイアウト体系（PageShell / PageHeader / SectionCard）に乗せる。
- 機械検出: `node scripts/lint-ui.mjs`（`border-gray-*` の dark 欠落 / `rounded-* + shadow-*` 直書き / インライン borderColor / focus outline 代替欠如 / `transition-all` を検出）。

---

## 8. 禁止パターン

### カラー
- `color: black` / `#000`（純黒は目が疲れる）→ `--ink`。
- 生 hex の直書き（editorial/legacy トークンがあるもの）→ CSS 変数 / Tailwind token。
- `#999` 以下の薄いグレー本文（WCAG 不適合）→ `--ink-body` 以上の濃さ。
- 色だけで情報伝達 → アイコン/テキスト併用。
- リンク色を本文色と同じに → `--accent` を維持。

### タイポグラフィ
- ネガティブ letter-spacing → 使わない。本文は `0.03em`・見出しは `palt` + `0.02em`（2026-07 で旧見出し `-0.01em` を廃止）。
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

## 8.5 収益要素の密度ルール（2026-07）

読書体験を壊さないための収益要素（第三者広告＝転職アフィリ／自社 note CTA）の上限。第三者広告と自社 note CTA を区別する。

**機械ゲート** = `npm run check-cta-density`（ビルド後 `out/docs/**` を走査）。守る対象は (1)「ファーストビュー〜本文中の能動的な note 押し出し密度」の暴走回帰、(2) アフィリの「1 ページ 1 ピクセル」（同一 a8mat の二重発火）。全 1056 ページで違反 0 を確認済み（2026-07 フルビルド検証）。

| ルール | 値 | 担保 |
|---|---|---|
| footer を除く note スロット（top + sidebar `-sb`/`-docs-sb` + 中間 `-mid`） | ≤ 3 | **機械**（check-cta-density） |
| note 要素の総数（footer 含む・暴走検知の緩い上限） | ≤ 30 | **機械**（旗艦ハブは意図的に多数収録＝22 程度まで） |
| 同一 a8mat のインプレッションピクセル（`<img …0.gif?a8mat=MAT>`） | ≤ 1 /ページ | **機械**（同一 MAT 二重発火を検知。別 MAT の併置＝カテゴリ hub の補完 2 案件 は正当で許可） |
| note もくじタイル（`HubCtaBanner`／L2 索引） | 全 HUB 資格（civil-1/2・総監・建設）の docs 記事末尾＋サイドバーに各 1 枚（`-docs-sb`／`-footer`）＋カテゴリ hub に sidebar/mobile 各 1 枚。個別マガジンタイル（旧・最大 3 誌）は 2026-07 廃止し個別導線は冒頭/中間 CTA・MDX 内 MagazineCard に一本化。非 HUB 資格・career タグ記事は非表示 | コード（page.tsx 導出・`resolveHubCta`） |
| 本文中間 CTA（`MidArticleCta`） | **記事長に応じて 1〜3 枠**（2026-07-28 に 1 枠固定から変更＝長文で note と転職カードが枠を奪い合っていたため）。枠数 = `max(1, min(3, ⌊h2/3⌋, ⌊本文字数/4000⌋))`、下限ゲート h2≥4 かつ 2,500字（未満は 0 枠）。位置は h2 境界に均等配分し最終 h2（まとめ）直前は避ける。**埋める順**＝①note（guide/pillar/textbook・h2≥5・8,000字以上・冒頭 CTA と別マガジンのとき）→②転職ネイティブカード→③related。**各種別 1 記事 1 回まで**（同じ広告を 2 度出さない）。転職カードは affiliate 対象カテゴリ（civil-1/2・pe-construction・concrete-*・pe-first-stage）＋総監（DXコンサル）で、手書き inline `<CareerAffiliate>` 保有記事は自動抑制（二重表示回避） | コード（挿入条件） |
| 記事末尾 footer カード | ≤ 7 目安（旗艦セールスハブは例外的に超過可） | 手動 |
| AdSense 自動広告 | コードで除外指定不可 → 管理画面「広告掲載率」＋`google-auto-placed` 出現数を週次監査 | 手動 |

> **アフィリ ピクセル計数の注意**: 素朴な substring カウント（`px.a8.net`・`0.gif` の出現数）は Next.js の RSC ペイロード（props の JSON 直列化）で ~2 倍に膨らむため使わない。check-cta-density は**レンダリング済み `<img>` タグだけ**をパースして a8mat を数える（href の `px.a8.net/svt/ejp`・banner の `bgt`・RSC payload は無視）。docs 記事は サイドバー枠の 1 ピクセルのみ発火（モバイル記事末カードは href のみ＝ピクセルなし）で 1 ページ 1 ピクセルを維持済み。

> 中間 CTA 導入後 1〜2 週は RPM／スクロール完了率を GA4・AdSense で監視し、悪化時は中間 CTA 閾値を h2≥7 / 12,000 字へ引き上げる（ロールバックレバー）。

---

## 9. 別サブシステム（本ファイルの対象外・リンクのみ）

サイト UI とは別系統。各々が独自トークン真実源を持つ。混ぜない。

| サブシステム | 真実源 | 入口 |
|---|---|---|
| SVG 図版（記事内） | `svg-tokens.json`（§2.2 の `--color-*` をリテラル hex で） | `.claude/skills/authoring/create-svg/SKILL.md` |
| Instagram カルーセル | `instagram-carousel-tokens.json` | `instagram-carousel.md` / `.claude/knowledge/reference/ig-carousel-policy.md` |
| note カバー画像 | `note-cover-tokens.json` | `note-cover.md` |
| サイト OGP | — | `.claude/knowledge/reference/ogp-prompts.md` |
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
