---
title: コンテンツ・タクソノミー（領域 × 資格 × 記事型 × テーマ × タグ ＋ 原本→展開ルール）
---

# コンテンツ・タクソノミー

> **真実源**: 分類の**語彙と規則**は本書。**値**は機械ファイルが持つ（下表）。他の doc に同じ表を写さず、1 行ポインタで本書を指す（[information-architecture.md](./information-architecture.md)「SSOT と参照規律」）。
> 検査は `npm run check-content-taxonomy`（pre-commit `--staged` ＋ quality:audit `:ci`）。

## 0. 位置づけと SSOT 対応表

| 軸 | 規則（doc） | 値（machine） | 値を足せる人 | gate |
|---|---|---|---|---|
| 領域 area | [05_情報アーキテクチャ.md](../../../docs/strategy/05_情報アーキテクチャ.md) 公開領域表 | `src/config/categories.json` の `area` | ユーザー | build（`content-routes.ts`） |
| 資格 category | 本書 §2、追加手順は [exam-content-policy.md](./exam-content-policy.md) Part 4 | `src/config/categories.json` | ユーザー | `check-content-taxonomy`・`check-home-exam-coverage` |
| 記事型 group | 本書 §3 | `src/config/content-taxonomy.json` の `groups` ＋ `categories.json` の `groups` | ユーザー（URL 変更を伴う） | `check-content-taxonomy`（HARD） |
| 分野 section | `src/config/category-curriculum.json` の形がそのまま規則 | 同左 | 執筆者 | `check-category-curriculum` |
| タグ | 本書 §5 | `src/config/tags.json`（`class` / `canonical` / `aliases`） | 執筆者（§5 の追加条件） | `check-content-taxonomy`（staged は HARD・ci はラチェット） |
| テーマ topic | 三方向は 05_IA、軸・状態・昇格基準・所属・記事末の配線は本書 §6 | `src/config/topics.json`（軸・状態・昇格の閾値の語彙は `content-taxonomy.json`） | ユーザー | `check-topic-wiring`・`check-content-taxonomy`（HARD＋ラチェット＋WARN）・`report-taxonomy-wiring`（週次・月次） |
| 原本 source | class は [reference-sources-policy.md](./reference-sources-policy.md) §1、展開表は本書 §7 | `config/reference-sources.json` | ユーザー | `check-reference-sources` |

runtime は `src/lib/content-taxonomy.ts`（`getCategoryArea` / `getGroupDef` / `isStructuralTag` / `canonicalTag`）を通し、JSON を直読みしない。検査・codemod は `scripts/lib/content-taxonomy.mjs` の純関数を共有する。

## 1. 領域（area）

公開領域 6 つ（`/exam/ /practice/ /standards/ /topics/ /blog/ /tools/`）と URL 生成規則は 05_情報アーキテクチャ.md が真実源。記事が属する領域は **`categories.json` の `area`**（`exam` / `practice` / `standards`）で宣言し、`src/lib/content-routes.ts` はカテゴリ名でなく `area` で振り分ける。`/topics/ /blog/ /tools/` はカテゴリではないので `area` の値には無い。

## 2. 資格（category）

`categories.json` の 1 entry ＝ 1 カテゴリ。フィールド: `slug` / `label` / `subtitle` / `description` / `variant`（civil・pe・general・reference＝トップの資格カード判定） / `order` / `visible` / **`area`** / **`groups`（許可する記事型・順序＝表示順）**。文中の「civil 系」「pe 系」「concrete 系」は言い回しであって機械値ではない。カテゴリを増やす手順は exam-content-policy.md Part 4（手順 0 で `area` と `groups` を宣言する）。

## 3. 記事型（group）

frontmatter `group` の語彙は 7 値。定義は**問題形式**で与え、資格の系統で意味を変えない。

| group | 定義 | 許可カテゴリ（`categories.json` の `groups`） | 構成ルールの真実源 |
|---|---|---|---|
| `guide` | 試験全体・学習法・キャリアの案内。本文 3,000 字以上 | 全資格＋`civil-practice`・`rccm`（この 2 つは唯一の group。rccm は過去問が事務局非公開のため） | content-principles §20 / §25 / §26 |
| `pillar` | 資格内の 1 分野＝1 本の**分野ハブ**（配下の keyword・past-exam の目次役。試験全体を扱う guide と区別する） | `pe-comprehensive-management`（5 管理） | 本書（H2 ＝ 分野の論点地図＋配下記事へのリンク） |
| `textbook` | 分野別の体系解説（章）。civil・concrete 系では分野ハブを兼ねる（pillar と併用しない） | `civil-construction-1/2`、concrete 3 資格 | content-principles §22 |
| `keyword` | 1 語 1 記事の用語解説 | `pe-comprehensive-management`、`pe-construction` | content-principles §5 / §6 / §12 / §17 / §18 / §19 |
| `primary` | **択一式**の過去問・演習（第1次検定・四肢択一・技術士一次） | `civil-construction-1/2`、concrete 3 資格、`pe-first-stage` | content-principles §22、exam-content-policy 原典照合 |
| `past-exam` | **記述式**の過去問（問題文＋解答戦略） | `pe-comprehensive-management`、`pe-construction` | content-principles §22 |
| `secondary` | 記述式の書き方・経験記述（問題文を持たない対策記事） | `civil-construction-1/2` | content-principles §22 |

- **`career` は group にしない**。`group: guide` ＋ フラグタグ `career`（`isCareerDoc()` が唯一の述語。`check-career-separation` が学習系ナビへの混入を止める）。
- コード側の `DocGroupKey` は `past-exam` を `pastExam` と書く。対応は `content-taxonomy.json` の `docGroupKey` が宣言し、`tests/content-taxonomy.test.mjs` が `GROUP_FIELD_MAP` / `GROUP_SEGMENT` との一致を固定する。改名はしない。
- frontmatter の `exams:` / `sections:` は **2026-09-11 に廃止**（読み捨て・新規記事に書かない）。複数資格にまたがる内容は資格タグと §6 のテーマで表現する。

## 4. 分野（section）

資格内の分野の並びと、guide・textbook・keyword の配置は `src/config/category-curriculum.json` が持つ（`examGuide` / `textbookChapters` / `fields.blocks` / `keywordSection` / `careerFeatured`。形はカテゴリごとに違ってよい）。未掲載の guide は `check-category-curriculum` が WARN で出す。分野名は §5 の資格・科目タグと同じ表記を使う。
- **実務（`civil-practice`）の工種別ノート（`fields.blocks`）には、工種の区分に加えてシリーズの区分を置ける**（[18_自治体土木担当・コンクリートシリーズ方針2026-10.md](../../../docs/strategy/18_自治体土木担当・コンクリートシリーズ方針2026-10.md)）。1 記事は 1 区分にだけ置く（表示は先に書いた区分が勝つ）。シリーズの章になった既存記事は、工種の区分からシリーズの区分へ移す。シリーズの記事には、横のナビ（タグの重なりで選ぶ）が近い章を出せるよう、シリーズ共通の主題タグ（自治体の土木担当は `地方公共団体`）と分野のタグ（`道路` `河川` など）を付ける。シリーズを工種別ノートとは別の節にする仕組みは、`/practice/` のカテゴリページが 28 日で 100 セッションを超えたら作る（2026-10-15 に 2 セッション）

## 5. タグ

### 5-1. 4 つの class（`tags.json` の `class`）

| class | 役割 | 例 | 追加の条件 |
|---|---|---|---|
| `structural` / `flag` | 機械スイッチ。**記事種別を写すタグ（`guide` `textbook` `primary` `secondary` `keyword` `pillar` `past-questions` `択一式` `記述式` `index`）は group と矛盾しない範囲でのみ許され、新規記事には原則書かない**（group が真実）。flag は `career`（転職・キャリア）と `模範論文`（一覧非表示） | `career` | コード変更を伴うのでユーザー承認 |
| `qualification` | 資格名・科目・分野・年度 | 技術士（第二次試験）、鋼構造及びコンクリート、令和7年度 | 試験実施機関の正式表記。揺れは `aliases` へ |
| `topical` | 技術テーマ。**1 タグ＝1 テーマ**で、どのテーマにも属さないタグは `noTopic`（理由）を持つ（§6-2） | コンクリート、河川、脱炭素 | 「同時に 3 本以上に付く」か「テーマに結びつく」のどちらかを満たすときだけ登録。**n＝1 の主題タグを作らない**（近い既存タグの `aliases` に入れる）。登録するときに行き先（テーマか `noTopic`）を決める |
| `learning` | 学習の型（試験対策・記述式対策・出題傾向・過去問分析・頻出テーマ・学習計画・学習法・経験記述・受験申込・合格率など）。技術テーマではないので**テーマ判定から外す**（`topics.json` の tags に置くと `check-content-taxonomy` が HARD） | 試験対策、出題傾向 | topical と同じ。語が技術テーマか学習の型かで class を選ぶ（2026-09-27 に 12 語を topical から移した） |

### 5-2. 正規表記と別名

- **正規表記は日本語名**（`tags.json` の `name`。試験実施機関の表記・`categories.json` の label・curriculum の分野名と一致させる）。例外は structural / flag（`guide` `career` など group を写す機械値）だけ。
- 英語 `slug` と `aliases[]` は**受理はするが正規でない綴り**。`build-doc-meta-index` がビルド時に canonical へ正規化し（元の綴りは `tagsRaw`）、runtime（関連記事・テーマ収集・構造タグ判定）は canonical だけを見る。
- 新規・変更記事は正規表記で書く。別名で書くと pre-commit の `--staged` が赤になる。既存記事の別名は `node scripts/migrate-tag-aliases.mjs <file> --write` で直す（既定 dry-run・frontmatter の tags 行だけを書き換え・CRLF 保持）。
- 2026-09-11 時点で公開 1,211 本は未登録 0・別名 0・構造タグ不整合 0。`.claude/config/content-taxonomy-baseline.json` は空で、増えた時点で `:ci` が赤になる。

### 5-3. 記事に付けるタグの最小構成

資格・科目タグを 1 つ以上 ＋ 主題タグを 1 つ以上。structural を書かない（group で表す）。`career` / `模範論文` は該当時のみ。同じ語の別名を並べない。

## 6. 横断テーマ（topics）と回遊の配線

設計の判断と数字は [21_分類の軸と回遊の配線2026-10.md](../../../docs/strategy/21_分類の軸と回遊の配線2026-10.md)。ここは規則だけを持つ。

### 6-1. 軸・状態・必須項目

- `src/config/topics.json` の 1 entry ＝ `/topics/{slug}`。必須: `slug` / `label` / **`facet`（軸）** / **`status`（状態）** / `description` / `tags`（正規表記・各タグは 1 テーマにだけ属す）/ `standardKeywords`。任意: `categories`（カテゴリ丸ごと所属）、`featuredStandardRefs`（基準文書の結線）、`featured`（入口記事の論理 slug。一覧の先頭に固定。公開中でこのテーマに属す記事に限る）、`seoTitle`・`demandEvidence`（下記 (1) の根拠 1 行。ページには出さない）・`intro`（一覧の前に置く 2〜4 段落の編集リード）。ページの一覧は領域（資格試験／土木施工の実務／公的基準）→ 資格の順に区切る。
- **軸**（`content-taxonomy.json` の `topicFacets`）: `field`＝分野・工種（構造物と工種のまとまり。コンクリート・道路・河川・港湾など）／`management`＝施工管理・マネジメント（工程・品質・安全・環境・維持管理と総監の 5 管理）／`law`＝法令・制度（関係法令と行政の手続き）。**資格は軸にしない**（資格はカテゴリ＝`/exam/{資格}` がハブで、テーマのページが資格ごとに区切って見せる）。**個々の法令はタグにしない**（本文の e-Gov へのリンクから集める・§6-3・05_IA「法令ページ」）。`/topics` の一覧は軸ごとに区切る。
- **状態**（`topicStatuses`）: `hub`＝公開ハブ（検索に出す・サイトマップに載る）／`incubating`＝育成中（ページの `robots` を noindex にし、サイトマップは out/ の robots を見て外す。ページと記事からのリンクは出す）。
- **昇格基準**: (1) 検索需要の根拠を `demandEvidence` に 1 行で残す、(2) 05_IA の三方向（資格試験／施工実務／公的基準）のうち **2 方向以上**が埋まる（閾値は `content-taxonomy.json` の `topicPromotion`＝exam 5 本・practice 1 本・standards 1 件。判定は `scripts/lib/content-taxonomy.mjs` の `topicEligibility`）、(3) 総監 5 管理のように基準が原理的に無いテーマは `standardKeywords` を基準の本文に出る語で埋め、基準の件数が 0 でも他の 2 方向で判定する。**status は人が切り替える**: 育成中で基準を満たした・公開ハブで基準を下回ったときは `check-content-taxonomy` が WARN を出し、週次の点検が拾う（§6-4）。基準を下回った公開ハブを**即 noindex にしない**（記事を足すか判断する）。
- `安全管理` は資格横断の 1 テーマ（`safety-management-cem`）に属し、`safety-laws` は関係法令のテーマ（2026-09-11。同じ語を 2 テーマに置けないため）。`行政手続き` は 2026-10-21 に `safety-laws` へ入れた。
- 経緯: 2026-09-27 の棚卸し（DN-0424）では港湾・鉄道・電力土木・都市計画を「practice・standards が 0」でテーマ外にした。2026-10-21 に 6 つの分野テーマ（橋梁・鋼構造／港湾・空港・海岸／鉄道／ダム・電力土木／上下水道／都市・地域計画）を足し、基準を満たした 5 つを公開ハブ、実務・基準が 0 の鉄道を育成中にした。

### 6-2. 記事の所属

- 所属の判定は `src/lib/topic-membership.mjs` の `topicsOfDoc`（明示 `topics:` → カテゴリ丸ごと → タグの一致）だけ。サイト（`src/lib/topics.ts`）・検査・報告が同じ関数を使う。
- **所属が要る記事**（`needsTopic`）: 用語・章・分野ハブ（keyword / textbook / pillar）、実務（`area: practice`）の記事、主題タグ（topical）を持つガイド。**要らない記事**: 非公開、転職・キャリア（`career`）、`模範論文`、過去問（primary / secondary / past-exam。問題ごとに RelatedKeywords と backlink で用語へつなぐ）、公的基準の領域、主題タグを持たないガイド（試験の概要・申込・勉強法など手続きの記事）。
- 付け方: まず分野・管理のタグ（正規表記）を付ける。タグで決まらない総論（複数の管理にまたがる記事など）は frontmatter **`topics: [slug]`** で明示する（`check-topic-wiring` が slug の実在を検査）。試験の手続きのガイドでも、中身が技術の解説（水理・構造力学など）なら主題タグを付けて所属させる。
- **主題タグの行き先**: topical class のタグは、どれか 1 つのテーマの `tags` に入れるか、`tags.json` に **`noTopic`**（理由。`content-taxonomy.json` の `noTopicReasons`＝audience 読み手・シリーズ／org 組織・業態／source 出典・資料名／method 考え方・手法／generic 広すぎる語）を書く。どちらも無いタグは `check-content-taxonomy` が HARD で止める（新しい主題タグを足した人に行き先を決めさせる）。
- 検査: `check-content-taxonomy --staged`（pre-commit）は新規・変更記事の所属漏れを赤、`--ci` は所属漏れの slug 集合を `.claude/config/content-taxonomy-baseline.json` の `topicless` とのラチェットで見る（2026-10-21 に 0 本）。

### 6-3. 記事末の配線

記事末は **根拠法令 → この記事のテーマ → 関連記事** の順に置き、先のカードで出した記事は後ろのカードから外す（同じ記事を 2 度並べない）。選び方は `src/lib/article-end-wiring.ts`、関連度は `src/lib/related-core.mjs`（`src/lib/related-score.ts` がサイトのタグの class とテーマの所属を渡す）。キャリア記事にはテーマのカードを出さない。

- **同じ法令を扱う記事**: 「この記事の根拠法令」の法令ごとに、同じ法令を本文で引く他の記事を最大 3 本（他の資格・実務を先に、資格が重ならないように）。法令は `build-doc-meta-index` が本文の e-Gov へのリンクから `lawIds` に入れる（`config/egov-laws.json` にある法令だけ）。
- **この記事のテーマ**: 記事が属するテーマ（最大 3 つ。明示が先）ごとに、テーマのページへのリンクと、同じテーマを他の資格・実務で扱う記事を最大 3 本（資格が重ならないように）。テーマの記事が自分だけなら出さない。
- **関連記事**（`rankRelated`）: 共有するタグの点は class で変える（主題 10・資格 3・学習の型 0）、同じテーマ 1 つにつき 6、同じ資格に 2。技術テーマ（主題タグかテーマ）を 1 つも共有しない記事は関連にしない。足りなければ資格・学習の型の共有で補う（`fallbackScore`）。同じ資格は 6 件中 4 件まで。**同点は記事の組ごとの擬似乱数**（`stableTieBreak`。更新日の順にすると新しい記事に関連が集中し、どこからも選ばれない記事が増える）。
- テーマのページ: 「関連するテーマ」（記事を多く共有するテーマ 4 つ）を末尾に置く。`/topics` の一覧は軸ごと。

### 6-4. 点検と計測

| いつ | 何が | 何を見る |
|---|---|---|
| commit | `check-content-taxonomy --staged` | 新規・変更記事の所属漏れ・未登録タグ・別名綴り（赤） |
| CI | `check-content-taxonomy --ci`・`check-topic-wiring`・`tests/topic-wiring-rules.test.mjs`・quality-audit `report-generators` の `taxonomy-wiring-report` | 軸・状態・タグの行き先（HARD）、所属漏れ（ラチェット）、入口記事の実在、記事末の配線と計測ラベル、報告の完走 |
| 週次 | `npm run check-taxonomy-wiring`（review-checks の点検。赤なら `npm run report-taxonomy-wiring`） | 所属なし・行き先の無いタグ・昇格の食い違い（要対応） |
| 月次 | `npm run report-taxonomy-wiring` | 三方向と昇格、取りこぼし（関連記事のどこからも選ばれない記事・記事の多い noTopic のタグ＝新テーマの候補）、回遊の質（他の資格の割合・同じ法令の記事）、計測 |

計測は GA4 の `internal_nav_click` を `event_label` で分ける（`fetch-metrics` が週次で by-label を取る）: `topic-hub:hub`（テーマのページへ）・`topic-hub:article`（テーマのカードの記事へ）・`law-siblings`（同じ法令の記事へ）・`topic-page`（テーマページの記事へ）・`topic-related`（関連するテーマへ）・`topics-index:{facet}`（一覧から）・`related-articles`（関連記事）。レポートが無いときは「未取得」と書き、0 として扱わない。

## 7. 原本 class × 展開先の加工ルール

記号: **V** 逐語可 ／ **S** 要約・再構成（技術的意味を確認したうえで独自表現） ／ **M** 方法論のみ（下記 標準手順） ／ **×** 不可。class の定義と出典粒度は reference-sources-policy.md §1。

| class | guide・textbook・keyword・practice | primary・past-exam | standards | note | `sources` | gate |
|---|---|---|---|---|---|---|
| `commercial-book` | **M**。図は自作 SVG のみ（[image-policy.md](./image-policy.md) の「参考 SVG 化」禁止）。例題は exam-official から。数値・規格値は external-primary／public-standard で取り直す | 出所にしない。書籍収録の過去問は exam-official の ID で登録し直す。教材由来の演習は論点だけ保った自作 | × | M | 必須・粒度 `title` | `check-reference-sources:deep`（40 字一致 0）＋公開前に構成の類似を目視（sources-policy §5） |
| `exam-official` | 問題文の引用は例題として V（出典 section 明記）。解説は S | 問題文 V・解答解説は独自・原典 PDF と照合 | × | 問題文 V・模範論文は独自 | 必須・粒度 `section` | `check-reference-sources` ＋ `past-exam-qa` |
| `public-standard` | V（`page` 明記）。**内部リンクは章記事 `/standards/{agency}/{document}/chapters/…`**。noindex の `part-XX` へは張らない | 裏取り | V（standards 領域の原本はこの class だけ） | V | 必須・粒度 `page` | `check-reference-sources` |
| `government-publication` | V（利用条件を明記） | 裏取り | S（章記事化しない） | V | 必須・`title-url` | `check-reference-sources` |
| `external-primary` | 短い引用のみ・条番号 ID（`id#第N条`）。図 × | 裏取り（正答根拠の第一候補） | × | 短い引用のみ | 必須・`name` | `check-reference-sources` |
| `operator-owned` | V・図可 | V | × | **S のみ**（site⇄note の逐語複製禁止） | 任意 | note-lint |

**commercial-book → guide / textbook の標準手順**（2026-09-10 の建設部門展開で確立・memory `book-to-guide-expansion`）

1. 着手前に `npm run audit-reference-book-coverage -- --source-id <id>` で章・節ごとの候補表（covered / partial / gap の暫定ヒント・`content/sources/books/<dir>/coverage/candidates.json`）を作り、意味で判定してから gap・partial を展開先に割り当てる（判定は同じ `coverage/verdict.json`。手順は [book-coverage-judging.md](./book-coverage-judging.md)（展開は [book-coverage-expansion.md](./book-coverage-expansion.md)）、判定資料は同じ `coverage/packet.md`、判定の検査は `-- --check`、比べるサイトの資格は reference-sources.json の `bookBundle.coverageSiteDirs`、全書籍の進み具合は `-- --status`）。どちらも市販書籍の見出しを含むので `npm run drive-vault-sync -- --group reference-book-coverage --commit` で Drive vault に置き、ほかの PC は `--pull` で取り戻す。展開を終えたら `npm run audit-reference-book-coverage -- --summary` で git の要約 `.claude/state/book-coverage.json`（判定件数・展開した記事とコミット）を更新する。親が原本の文字起こしを読んで方法を理解する。執筆エージェント（`guide-rewriter` 新規起草モード等）には**原文を渡さず、親の言葉で 30 字以内の語句だけの brief** を渡す。
2. H2 は原本の章順・項目数・ラベル名をなぞらず、読者の時間軸や失敗パターンで組む。
3. 例題・出題例は公式過去問（exam-official・サイトの過去問記事）から。原本の例題は使わない。
4. 図は自作 SVG（[figure-canvas-policy.md](./figure-canvas-policy.md)）。原本の図は題材リストとしてだけ使う。
5. `guide-qa` → `guide-fact-checker`（制度・数値を一次資料へ）→ Drive をマウントして `npm run check-reference-sources:deep` で 40 字一致 0 → 1 記事 1 コミット。コミットの本文に trailer `Book-Coverage: <書籍 id>`（複数の本からなら「,」区切り）を書く。`audit-reference-book-coverage -- --summary` はこの trailer のあるコミットだけを展開として数える（判定日以降の別の作業の変更を数えない）。判定日を付けたときの HEAD を要約の `judgedHead` に残し、それより後のコミットだけを数える（`--rejudge` で判定し直した本は、前の判定からの展開を数えない。DN-0659）。

## 8. site ↔ note の対応

| site の記事型 | note の mirror | 根拠 |
|---|---|---|
| guide | 可（体験・要約の角度で。逐語複製は不可） | site＝中立・体系／note＝体験・BOFU（06_seo-note-synergy-strategy.md） |
| past-exam・secondary | 可（模範論文・経験記述例は note 有料） | noteコンテンツ計画.md の Red Line |
| keyword・textbook・primary | 不可（site 専有） | 同上 |

CTA の配線は `src/lib/magazine-placement.ts`（slug と group で決める）。到達性は `npm run check-magazine-cta`。

## 9. 新規コンテンツのチェックリスト

1. `category` は `categories.json` にある。
2. `group` はその category の `groups` に含まれる。
3. `tags` は正規表記（日本語名）で、資格・科目 1 つ以上＋主題 1 つ以上。structural を書かない。
4. `career` / `模範論文` は該当時のみ。
5. `sources` は §7 の粒度で宣言（commercial-book 由来は deep ゲート）。
6. 例題は exam-official のみ、図は自作。
7. 公的基準への内部リンクは章記事 URL。
8. `exams:` を書かない。テーマへ明示所属させるなら `topics:`。
9. 用語・章・実務、主題タグを持つガイドは、どれかのテーマに属す（分野・管理のタグか `topics:`・§6-2）。新しい主題タグはテーマか `noTopic` の行き先を決めてから登録する。

## 10. 経過措置

| 対象 | 扱い |
|---|---|
| 既存記事の structural タグ（group を写す `guide` `textbook` 等） | group と矛盾しない範囲で残す。矛盾する 59 本は 2026-09-11 に外した。新規は書かない |
| `exams:` を持つ既存 50 本 | 読み捨て。削除は任意 |
| `pillar` 5 本 | §3 の定義で正規化。建設部門への展開は別判断 |
| `reference-materials`（`area: standards`・`visible: false`） | 宣言された未公開。standards 領域の再設計時に扱う |
| civil-practice から `part-XX` への内部リンク 4 本 | 新規は禁止。既存は章記事 URL へ差し替える（backlog） |

## 11. 語彙を変えるときの手順

1. 本書を先に更新する（規則）。
2. 値: `content-taxonomy.json` / `categories.json` / `tags.json` / `topics.json` を更新し（テーマを足すときは `facet`・`status` と、`src/components/topics/TopicIcon.tsx` のアイコン）、`npm test`（`tests/content-taxonomy.test.mjs` が `doc-classifier.ts` / `content-routes.ts` との一致を固定）→ `npm run check-content-taxonomy`。
3. `.claude/config/policy-anchors.json` の `content-taxonomy` クラスタに挙がるファイルの整合を確認し、`/doc-sync` を 1 回回す。
