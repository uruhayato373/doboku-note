# 2026-06-27 全ページデザインレビュー（実装前確定版）

目的: デザイン改善の実装に入る前に、`src/app` 配下の全ページをレビューし、ページごとの改善方針・優先度・実装順を確定する。

対象:

- `/`
- `/docs/[slug]`
- `/category/[slug]`
- `/search`
- `/links`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/sitemap-keywords`
- `/tools`
- `/tools/kakomon-quiz`
- `/tools/juken-shikaku`
- `/tools/keiken-charcount`
- `not-found`
- 共通: `Header` / `Footer` / 検索 UI / カテゴリ UI / 記事末 UI

---

## 結論

全ページを一気に作り替える必要はない。現行デザインは、白い紙面・薄い罫線・2px radius・低い影・ゴシック本文という editorial 方針にかなり寄っている。

ただし、過去のデザイン履歴が混在しており、特に `primary-*` / `gray-*` / `blue-*` / `cyan-*` の Tailwind 直指定が、検索・カテゴリ内テーブル・法務ページ・記事末 UI に残っている。最初の実装テーマは **「全ページを同じ editorial token に揃える」** とする。

また、PC 右サイドバーの `sticky` 固定は、全ページ方針として一旦解除する。現状の固定対象は主に `/docs/[slug]` と `/category/[slug]` で、広告・著者・目次・ランキングが読中に追従する設計になっている。今後のデザイン改善では、追従で目立たせるより、本文の読書体験とページ全体の落ち着きを優先する。

推奨する実装順:

1. **共通 PageShell + トークン統一 + sticky 解除**: ページ幅・上部構造を揃え、`primary/gray/blue` 直指定を editorial token へ寄せ、PC 右サイドバーのスクロール固定を外す。
2. **Docs 記事テンプレート**: `ArticleHeader` 新設、記事末区画化。
3. **Category ページ**: 学習ハブとして、人気記事・記事一覧・CTA の情報優先度を整理。
4. **Search ページ**: 検索 UI を editorial token に統一し、ゼロステートを強化。
5. **Links ページ**: 購入導線としての主従を整理。
6. **About / Legal / Tools**: 共通 PageHeader と SectionCard へ寄せる。

---

## 横断課題

| 優先度 | 課題 | 対象 | 方針 |
|---|---|---|---|
| High | ページごとに外枠幅と上部構造が揺れている | Links, Search, About, Legal, Tools, Docs | 共通 `PageShell` / `PageHeader` を決め、Hero はトップ専用に寄せる |
| High | editorial token と旧 Tailwind 色の混在 | Search, Category, Privacy, Terms, 記事末 UI | `var(--accent)` / `var(--paper)` / `var(--rule-soft)` / `var(--ink*)` へ統一 |
| High | ページヘッダーの構造がページごとに微妙に違う | Docs, Category, Search, Tools, About, Legal | 共通 `PageHeader` / `ArticleHeader` を作る |
| Medium | カードの使い方がページごとにばらつく | Home, Category, Links, Tools, Legal | `MetaCard` または共通 `SectionCard` へ寄せる |
| Medium | 記事末・カテゴリ末の CTA が区画化されていない | Docs, Category, Links | 「参考・復習・教材・著者」の役割別に整理 |
| Medium | 右サイドバーの sticky 固定が本文読了中も広告/著者/目次を追従させる | Docs, Category | まず全ページ方針として sticky を解除し、必要なら後で目次だけ軽い追従を検討 |
| Medium | モバイルで現在地/次アクションが弱い | Docs, Category, Search | 冒頭に軽いアンカー/要約/目次導線を追加 |
| Low | デザイン原則文書と実装の差分 | docs/design-system, globals.css | 現行実装に合わせて原則側を更新する |

---

## レイアウト統一方針

サイト全体の統一感は必要。ただし、統一感は「全ページに同じ右サイドバーを置く」ことではなく、ページの役割に応じたレイアウト規則・余白・見出し・カード・CTA の文法を揃えることで作る。

現状は `max-w-[1280px]` / `max-w-[1200px]` / `max-w-5xl` / `max-w-[880px]` / `max-w-[780px]` / `max-w-[760px]` がページごとに混在し、Hero / PageHeader の有無や高さも揺れている。この状態では、右サイドバーの有無以前にサイト全体が別テンプレートの寄せ集めに見える。Phase 0 では、まずページ幅と上部構造を揃える。

右サイドバーを置く基準:

| ページ種別 | 右サイドバー | 理由 |
|---|---:|---|
| 長文記事 `/docs/[slug]` | あり | 本文を読みながら、目次・著者・カテゴリナビ・関連導線へ移動する必要がある |
| 学習ハブ `/category/[slug]` | あり | 記事一覧・人気記事・著者・教材導線を補助情報として並べる意味がある |
| 検索 `/search` | 原則なし | ユーザーの主目的は検索入力と結果比較。右サイドバーは視線と操作を分散させる |
| 教材導線 `/links` | 原則なし | 主目的は「試験を選ぶ」「無料/有料の次アクションを選ぶ」。2カラムサイドバーより、全幅のアクションカードが向く |
| 信頼形成 `/about` | 原則なし | 著者・編集方針・資格は本文そのもの。右サイドバーに逃がすより、本文内で順に見せる方が自然 |
| 法務 `/privacy` `/terms` | なし | 読み物ではなく参照文書。単カラムでよい |
| Tools | なし | 入力フォームと結果に集中させる |

採用する共通ルール:

- 全ページで `PageShell` / `PageHeader` / `SectionBlock` / `SectionCard` のような共通フレームを使い、ページごとの手書き `max-w-*` と Hero 乱立を減らす。
- 基本外枠は `max-w-[1280px]` + `px-4 sm:px-6 lg:px-10` に統一する。
- 単カラム本文は外枠を変えず、内側に `max-w-[780px]` または `max-w-[860px]` の content rail を置く。ページ全体の横幅自体は変えない。
- `/docs/[slug]` と `/category/[slug]` だけ PC 右サイドバーを持つ。ただし sticky 固定は一旦解除する。
- `/links` / `/search` / `/about` は右サイドバーを足さず、共通 `PageHeader`、同じ外枠幅、同じ `SectionCard`、同じ CTA 表現で統一する。
- 右サイドバーがないページにも、必要な補助導線は本文末の `SupportLinks` / `RelatedActions` として置く。
- Hero はトップページ専用の強い表現とし、下層ページは原則 `PageHeader` に統一する。`/links` も大型 Hero ではなく、薄い `PageHeader` + action grid にする。
- 「統一感」はレイアウトの完全一致ではなく、外枠・上部構造・余白・カード文法を共通化した上で、役割別テンプレートを使い分けることで担保する。

幅の基準:

| 用途 | 幅 | 対象 |
|---|---:|---|
| Site shell | `max-w-[1280px]` | Header / Footer / Home / Category / About / Links / Search 外枠 |
| Article shell | `max-w-[1200px]` または `max-w-[1280px]` へ統一検討 | Docs 本文 + 右サイドバー |
| Content rail | `max-w-[780px]`〜`860px` | Legal / Contact / Tools / Search 結果など単カラム本文の内側 |
| Sidebar | `300px` | Docs / Category の PC 右サイドバー |

---

## ページ別レビュー

### `/` トップページ

現状:

- Hero / ExamCards / LatestArticles / AboutSection / Premium 導線で構成。
- 主要導線は明快。カードも editorial token に寄っている。
- `Hero` は大きめだが、今のトップとしては許容範囲。

課題:

- 「Premium」導線が下部に単独で置かれ、トップ全体の流れから少し浮く。
- Hero の「ここだけで合格を目指せます」は強いが、信頼根拠は下まで読まないと出にくい。

改善方針:

- 大改修は不要。
- `ExamCards` の下に、無料→有料の学習フローを1行で補足する。
- Premium 導線は `/links` と同じ「試験別コンテンツ」文脈に寄せる。

優先度: Medium

---

### `/docs/[slug]` 記事ページ

詳細: `docs/design-system/_archive/proposals/2026-06-27-docs-template-improvement.md`

現状:

- 白い記事カード + 右 300px サイドバー。
- `ArticleSidebar` / `ArticleFooter` に分割済み。
- 本文可読性は悪くない。

課題:

- 冒頭で「この記事がどの試験・どの段階・何を解決するか」が弱い。
- 右サイドバーは広告・著者・目次が同じ密度で並び、PC では sticky 固定されている。
- 記事末が `mt-8` の連続で、次アクションの区切りが弱い。

改善方針:

- `ArticleHeader` を新設し、breadcrumb / H1 / description / meta を集約。
- `ArticleFooterSection` を新設し、参考・復習・教材・FAQ・関連・著者を区画化。
- サイドバーはまず広告位置と並び順を大きく動かさず、sticky 固定だけ解除する。そのうえで TOC と著者カードの密度を調整する。

優先度: High

---

### `/category/[slug]` カテゴリページ

現状:

- 学習ハブとして、カテゴリ見出し・人気記事・グループ別記事一覧・右サイドバーを持つ。
- `CategoryViews` で資格別ビューが分岐しており、情報量の多いカテゴリに対応できている。

課題:

- `CategoryPage` にデータ取得、広告、人気記事、記事一覧、サイドバーが集まっており、デザイン変更時の見通しが少し悪い。
- `CategoryViews` / `CategorySections` 内に `gray/blue` 系直指定が残る。
- 人気記事、記事一覧、note CTA、転職枠の優先順位がページ上で少し競合する。
- 右サイドバーが sticky 固定され、広告・著者・ランキング・note CTA が読中に追従するため、学習ハブとしてはやや販売導線が強く見える可能性がある。

改善方針:

- `CategoryHeader` / `CategorySidebar` / `CategoryContent` に薄く分割。
- 見た目は `editorial token` へ統一。
- 人気記事は「はじめに読む」ブロックとして位置づけ、記事一覧との差を明確化。
- Category でも PC 右サイドバーの sticky 固定は解除し、通常の縦積みサイドバーに戻す。

優先度: High

---

### `/search` 検索ページ

現状:

- 880px 単カラムで扱いやすい。
- SearchBox / Filters / Results / Pagination に分割済み。
- 右サイドバーはなく、検索行動に集中する構成。

課題:

- `SearchBox`, `SearchResults`, `SearchFilters`, `SearchPagination` に旧 `gray/primary` スタイルが多い。
- 検索前のゼロステートが「キーワードを入力して検索してください」だけで、人気検索・カテゴリ導線がない。
- Pagefind のカテゴリ推定が `categoryFromPath()` の簡易判定に留まるため、UI のタグ/カテゴリ表示が弱い。
- サイト統一のために右サイドバーを足すと、検索入力・絞り込み・結果比較の集中を削ぐ可能性が高い。

改善方針:

- まず visual token を統一。
- ゼロステートに「人気キーワード」「試験別入口」「最近読まれている記事」を追加検討。
- 結果カードを `DocCard` に寄せるか、検索専用の `SearchResultCard` を editorial style で作る。
- 右サイドバーは追加しない。代わりにゼロステートや検索結果末尾に `RelatedActions` としてカテゴリ・教材・人気キーワードを置く。

優先度: High

---

### `/links` リンクハブ

現状:

- 試験別に無料入口→note 教材を並べる funnel として機能している。
- 主力の総監を featured にしており、販売導線としての意図は明確。
- `Hero` / 価値提案 / 試験別パネル / 運営者・SNS がすべて同じカード調で並ぶため、サイト全体の editorial design と比べると「リンク集・販促ページ」感が強い。

課題:

- コード・表示ともに情報密度が高く、初見読者には「無料で始める」と「有料教材を買う」の切り替わりがやや速い。
- ヒーロー、価値提案、試験別コンテンツがすべてカード調で、ページ内のリズムが似る。
- 総監以外の商品群が増えると、ページ全体が長くなる。
- 文字説明が多く、クリック前に読む負荷が高い。CTR を上げたいページとしては、主アクションが埋もれている。
- `FreeLinkCard` / `MagazineCard` がどちらも横長テキストカードなので、無料導線と購入導線の差が視覚だけで直感的に伝わりにくい。
- 著者画像付き Hero は信頼形成には効くが、トップや About と役割が重なり、`/links` の「選ぶ・進む」体験を弱めている。

改善方針:

- `/links` は「Link Hub」ではなく **Exam Action Hub** として再設計する。
- ファーストビューは著者紹介より「受験試験を選ぶ」ことを主役にする。試験別の大きな選択カードを置き、各カードに `無料で始める` / `教材を見る` の2アクションを明確に出す。
- 文字説明はカード内で長く読ませず、`無料` `仕上げ` `全部入り` `施工経験記述` などの短い判断ラベルへ圧縮する。
- note 教材はテキストカードだけでなく、既存の `MagazineSidebarCard` 系の画像/表紙が使えるものは視覚資産として出す。クリック対象を「説明文」ではなく「教材そのもの」に見せる。
- 価値提案3本柱は残してよいが、ページ中盤以降へ下げるか、横長の薄い band にして主導線を邪魔しない。
- 運営者・SNS は最下部の補助導線に圧縮し、About と重複するプロフィール説明は削る。
- `LinksPage` は `LinksHero` / `ExamActionGrid` / `FeaturedProductRail` / `SupportLinks` に分割する。
- 右サイドバーは追加しない。教材導線ページでは、右側の補助カラムよりも全幅の試験選択カードと商品ブロックのほうがクリック対象を大きくできる。

優先度: High

実装イメージ:

1. Above the fold: `LinksHero` + 試験選択カード。見出しは `受験する試験を選ぶ` など、行動に直結させる。
2. Primary actions: 各試験カードに `無料ガイド` と `note教材` の2ボタンを並べる。外部リンクだけ icon を付ける。
3. Featured products: 総監の全部入りなど主力商品は、短い説明 + 表紙/画像 + 価格 + CTA の商品ブロックにする。
4. Secondary content: 価値提案、運営者、SNS は下部の補助情報にする。
5. Measurement: 既存 UTM は維持し、`utm_content` を `exam-card-free-*` / `exam-card-paid-*` / `featured-product-*` のようにクリック位置が分かる命名へ寄せる。

---

### `/about`

現状:

- 著者プロフィール・編集方針・対応試験・学習開始導線がある。
- E-E-A-T を伝える素材は十分。
- 右サイドバーはなく、ページ本文として信頼情報を順に読ませる構成。

課題:

- ページ前半は editorial token、途中から `neutral/primary/cyan/gray` 直指定が混在する。
- 「運営者プロフィール」「サイトコンセプト」「対応試験」がやや別デザインに見える。
- About なのか、サイト案内なのか、対応試験一覧なのか、役割が少し広い。
- 右サイドバーを追加すると、著者プロフィールや資格情報が本文と重複しやすく、About の主目的がぼやける。

改善方針:

- 共通 `PageHeader` と `SectionCard` へ寄せる。
- About の主目的は「信頼形成」に絞る。
- 対応試験は簡潔にし、詳細はカテゴリへ送る。
- 右サイドバーは追加せず、本文内のセクション順と CTA で統一感を作る。

優先度: Medium

---

### `/contact`

現状:

- 小さくまとまっており、目的は明確。
- editorial token に概ね揃っている。

課題:

- `Home` breadcrumb がテキストで、リンクではない。
- メールアドレス表示は明快だが、問い合わせ種類と返信条件の階層が少し平坦。

改善方針:

- 共通 `PageHeader` を使う。
- 問い合わせ用途別のリストを少し簡潔にし、メール CTA を主役にする。

優先度: Low

---

### `/privacy`

現状:

- カード形式で読みやすい。
- 情報量の多い法務文書を分節できている。

課題:

- `primary/gray/amber` 直指定が多く、現行 editorial から少し浮く。
- カードが多く、長いページで視線が同じリズムになりやすい。
- 現在の footer には Amazon アソシエイト表記が残っているが、プロジェクト方針上アフィリエイト完全廃止済みなら整合確認が必要。

改善方針:

- `PolicyCard` を `SectionCard` に統合または token 化。
- 法務ページは華美にせず、仕様書風に整理。
- アフィリエイト表記の現状方針を確認し、必要なら Privacy / Terms / Footer を同時更新。

優先度: Medium

---

### `/terms`

現状:

- 780px 単カラムで読みやすい。
- `SectionCard` がページ内ローカルにあり、構造は明快。

課題:

- `primary/gray` 直指定が残る。
- 末尾の問い合わせリンクが `/about` になっており、文言上は `/contact` の方が自然に見える。
- Privacy と似た構成だが、コンポーネントが別定義。

改善方針:

- Privacy と共通の `LegalPage` / `LegalSectionCard` へ寄せる。
- 末尾 CTA を Contact へ揃える。

優先度: Medium

---

### `/sitemap-keywords`

現状:

- 総監キーワードを体系別に並べる実用ページ。
- 5管理×セクションの構造は分かりやすい。

課題:

- キーワードチップが大量に並び、スマホでは視線負荷が高い。
- `gray/blue` 直指定が残り、カテゴリページや記事ページとやや見た目が違う。
- フィルタやページ内検索がないため、650+ キーワード規模では探す負荷が高い。

改善方針:

- token 統一。
- セクションごとの折りたたみ、または簡易ページ内検索を検討。
- チップを少し小さくしつつ、タップ領域は維持する。

優先度: Medium

---

### `/tools`

現状:

- 登録不要・無料ツールの一覧として明快。
- 各ツールカードは editorial token に揃っている。

課題:

- 3ツールの違いは分かるが、どの受験段階で使うかが少し弱い。
- `Tools` は便利だが、カテゴリ/記事からの導線と視覚的に強くは結びついていない。

改善方針:

- 各カードに「使うタイミング」を追加する。
- カテゴリページ側から Tools への導線も後続検討。

優先度: Low/Medium

---

### `/tools/kakomon-quiz`

現状:

- 4択演習として使いやすい。
- 即採点・解説・結果画面がある。
- visual token は概ね統一済み。

課題:

- 終了後の funnel はあるが、演習中の「続きは全問解説へ」が最後まで見えない。
- 選択肢カードの状態表示は良いが、結果画面は少しあっさりしている。

改善方針:

- 結果画面に「次にやること」を3択で出す。
- 問題画面下部の出典/ミニ演習説明を軽くし、演習への集中を優先。

優先度: Low/Medium

---

### `/tools/juken-shikaku`

現状:

- 入力項目が少なく、判定ツールとして分かりやすい。
- 公式手引への誘導もあり、誤判定リスクへの配慮がある。

課題:

- 第二次検定のルート選択が縦に並ぶため、初見ではやや文字量が多い。
- 結果表示の「いずれかの要件」が少し抽象的。

改善方針:

- ルートを segmented/card 選択にして、選択中の条件だけ強調。
- 結果欄に「受験可 / 不可 / 公式確認」の3段階を明示。

優先度: Low/Medium

---

### `/tools/keiken-charcount`

現状:

- 操作が明快で、入力→文字数→判定の流れがよい。
- プログレスバーと残文字数は実用的。

課題:

- 出題形式・設問選択が上に多く、テキスト入力開始までの視線が少し長い。
- 注意書きが重要だが、長めでツール本体の下に埋もれる。

改善方針:

- controls を `級 / 形式 / 設問` の3列またはステップ風に整理。
- 注意書きは `details` 折りたたみか、重要事項だけ先出しする。

優先度: Low/Medium

---

### `not-found`

現状:

- 簡潔で editorial token に揃っている。

課題:

- 検索・カテゴリへの復帰導線が Home のみ。

改善方針:

- `検索する` と `資格一覧へ` の2リンクを追加。

優先度: Low

---

### Header / Footer

現状:

- Header は軽量化のため lucide import を避け、inline SVG 化されている。LCP 観点で良い。
- Footer はカテゴリとサイト情報を網羅している。

課題:

- Footer の Amazon アソシエイト表記は、現在の収益方針と整合確認が必要。
- Header の desktop nav は icon + label で分かりやすいが、Tools / Links への導線が弱い。

改善方針:

- Header に `Links` または `教材` を入れるかは、試験直前期の CV 方針と合わせて判断。
- Footer の収益表記は、実態に合わせて Privacy / Terms と同時調整。

優先度: Medium

---

## 実装前チェックリスト

実装へ進む前に確定したい判断:

1. Header に `/links` を明示的に入れるか。
2. 共通 `PageShell` の外枠幅を `max-w-[1280px]` に統一し、単カラムページは内側 content rail で幅を制御する。
3. Hero はトップページ専用とし、下層ページは原則 `PageHeader` に統一する。
4. Footer / Privacy / Terms のアフィリエイト表記を現方針に合わせて残すか削るか。
5. PC 右サイドバーの sticky 固定は一旦解除する。順序はまず現状維持で、必要なら後で Docs の目次位置だけ検討する。
6. 右サイドバーは `/docs/[slug]` と `/category/[slug]` に限定し、`/links` / `/search` / `/about` には追加しない。
7. Search ゼロステートに人気キーワードを出すか。
8. `/links` を「文字中心のリンク集」から「試験選択 + 教材選択」のアクションハブへ再設計する。
9. `/sitemap-keywords` にページ内検索を入れるか、まず token 統一だけにするか。

---

## 推奨ロードマップ

### Phase 0: デザイン負債の地ならし

- 共通 `PageShell` / `PageHeader` / `SectionBlock` / `SectionCard` の最小実装を決める。
- ページ外枠の `max-w-*` を `max-w-[1280px]` に寄せ、単カラムの読み幅は内側 content rail で制御する。
- トップ以外の大型 Hero を `PageHeader` に置き換える。`/links` / `/about` / Tools / Legal を優先対象にする。
- `primary/gray/blue` 直指定を editorial token へ寄せる。
- `/docs/[slug]` と `/category/[slug]` の PC 右サイドバーから `sticky top-*` を外す。
- Footer / Privacy / Terms の収益表記整合を確認。

### Phase 1: Docs 記事テンプレート

- `ArticleHeader` 新設。
- `ArticleFooterSection` 新設。
- サイドバー密度を調整。

### Phase 2: Category + Search

- `CategoryPage` を `CategoryHeader` / `CategorySidebar` / `CategoryContent` へ分割。
- Search UI を editorial token に統一。
- Search ゼロステートを追加。

### Phase 3: Links Action Hub

- `/links` を `LinksHero` / `ExamActionGrid` / `FeaturedProductRail` / `SupportLinks` に分割。
- 文字説明中心の横長カードを減らし、試験カード・教材画像・短い判断ラベル・明確な CTA に置き換える。
- 無料/有料導線を分離し、試験ごとに `無料ガイド` と `note教材` の主アクションを明示する。
- 既存 UTM を維持しつつ、クリック位置が分かる `utm_content` 命名に整理する。

### Phase 4: Tools

- Tools 3ページのフォーム UI を共通化。
- Quiz 結果画面の次アクションを強化。

### Phase 5: About + Legal + 404

- About を信頼形成に絞る。
- Privacy / Terms を共通 legal layout に統一。
- 404 に検索・カテゴリ導線を追加。

---

## 採用するデザイン方向

**Editorial Study System**

派手なランディングページ化ではなく、技術文書サイトとしての信頼性を保ったまま、学習導線・検索・教材導線を整理する。

キーワード:

- 正確
- 明快
- 信頼
- 試験対策
- 学習シート
- 薄い罫線
- 低い影
- 2px radius
- 高密度だが窮屈でない

---

## 実装着手判断

このレビューをもって、全ページの一次レビューは確定とする。

最初の実装は **Phase 0 → Phase 1** の順が安全。特に `ArticleHeader` は、見た目の改善とコード分割の両方に効くため、最初の実装候補とする。
