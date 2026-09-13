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
| テーマ topic | 三方向は 05_IA、昇格基準は本書 §6 | `src/config/topics.json` | ユーザー | `check-topic-wiring`・`check-content-taxonomy`（WARN） |
| 原本 source | class は [reference-sources-policy.md](./reference-sources-policy.md) §1、展開表は本書 §7 | `.claude/config/reference-sources.json` | ユーザー | `check-reference-sources` |

runtime は `src/lib/content-taxonomy.ts`（`getCategoryArea` / `getGroupDef` / `isStructuralTag` / `canonicalTag`）を通し、JSON を直読みしない。検査・codemod は `scripts/lib/content-taxonomy.mjs` の純関数を共有する。

## 1. 領域（area）

公開領域 6 つ（`/exam/ /practice/ /standards/ /topics/ /blog/ /tools/`）と URL 生成規則は 05_情報アーキテクチャ.md が真実源。記事が属する領域は **`categories.json` の `area`**（`exam` / `practice` / `standards`）で宣言し、`src/lib/content-routes.ts` はカテゴリ名でなく `area` で振り分ける。`/topics/ /blog/ /tools/` はカテゴリではないので `area` の値には無い。

## 2. 資格（category）

`categories.json` の 1 entry ＝ 1 カテゴリ。フィールド: `slug` / `label` / `subtitle` / `description` / `variant`（civil・pe・general・reference＝トップの資格カード判定） / `order` / `visible` / **`area`** / **`groups`（許可する記事型・順序＝表示順）**。文中の「civil 系」「pe 系」「concrete 系」は言い回しであって機械値ではない。カテゴリを増やす手順は exam-content-policy.md Part 4（手順 0 で `area` と `groups` を宣言する）。

## 3. 記事型（group）

frontmatter `group` の語彙は 7 値。定義は**問題形式**で与え、資格の系統で意味を変えない。

| group | 定義 | 許可カテゴリ（`categories.json` の `groups`） | 構成ルールの真実源 |
|---|---|---|---|
| `guide` | 試験全体・学習法・キャリアの案内。本文 3,000 字以上 | 全資格＋`civil-practice`（唯一の group） | content-principles §20 / §25 / §26 |
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

## 5. タグ

### 5-1. 3 つの class（`tags.json` の `class`）

| class | 役割 | 例 | 追加の条件 |
|---|---|---|---|
| `structural` / `flag` | 機械スイッチ。**記事種別を写すタグ（`guide` `textbook` `primary` `secondary` `keyword` `pillar` `past-questions` `択一式` `記述式` `index`）は group と矛盾しない範囲でのみ許され、新規記事には原則書かない**（group が真実）。flag は `career`（転職・キャリア）と `模範論文`（一覧非表示） | `career` | コード変更を伴うのでユーザー承認 |
| `qualification` | 資格名・科目・分野・年度 | 技術士（第二次試験）、鋼構造及びコンクリート、令和7年度 | 試験実施機関の正式表記。揺れは `aliases` へ |
| `topical` | 技術テーマ。`topics.json` に載るものは **1 タグ＝1 テーマ** | コンクリート、河川、脱炭素 | 「同時に 3 本以上に付く」か「テーマに結びつく」のどちらかを満たすときだけ登録。**n＝1 の主題タグを作らない**（近い既存タグの `aliases` に入れる） |

### 5-2. 正規表記と別名

- **正規表記は日本語名**（`tags.json` の `name`。試験実施機関の表記・`categories.json` の label・curriculum の分野名と一致させる）。例外は structural / flag（`guide` `career` など group を写す機械値）だけ。
- 英語 `slug` と `aliases[]` は**受理はするが正規でない綴り**。`build-doc-meta-index` がビルド時に canonical へ正規化し（元の綴りは `tagsRaw`）、runtime（関連記事・テーマ収集・構造タグ判定）は canonical だけを見る。
- 新規・変更記事は正規表記で書く。別名で書くと pre-commit の `--staged` が赤になる。既存記事の別名は `node scripts/migrate-tag-aliases.mjs <file> --write` で直す（既定 dry-run・frontmatter の tags 行だけを書き換え・CRLF 保持）。
- 2026-09-11 時点で公開 1,211 本は未登録 0・別名 0・構造タグ不整合 0。`.claude/config/content-taxonomy-baseline.json` は空で、増えた時点で `:ci` が赤になる。

### 5-3. 記事に付けるタグの最小構成

資格・科目タグを 1 つ以上 ＋ 主題タグを 1 つ以上。structural を書かない（group で表す）。`career` / `模範論文` は該当時のみ。同じ語の別名を並べない。

## 6. 横断テーマ（topics）

- `src/config/topics.json` の 1 entry ＝ `/topics/{slug}`。必須: `slug` / `label` / `description` / `tags`（正規表記・各タグは 1 テーマにだけ属す）。任意: `categories`（カテゴリ丸ごと所属）、`standardKeywords` / `featuredStandardRefs`（基準文書の結線）、**`featured`（入口記事の論理 slug。一覧の先頭に固定）**。
- 記事側は frontmatter **`topics: [slug]`** で明示所属を宣言できる（タグ由来の自動収集に加える。`check-topic-wiring` が slug の実在を検査）。
- **昇格基準**: (1) 検索需要の根拠を `description` の直下に 1 行で残す、(2) 05_IA の三方向（資格試験／施工実務／公的基準）のうち **2 方向以上**が公開時点で埋まる（目安: exam 5 本以上・practice 1 本以上・standards 1 件以上）、(3) 総監 5 管理のように基準が原理的に無いテーマは `standardKeywords: []` を許し、ページは基準節を出さない。
- 三方向の件数と 0 件の方向は `check-content-taxonomy` の WARN で出す（読み手＝`/weekly-review` Phase 2）。
- `安全管理` は資格横断の 1 テーマ（`safety-management-cem`）に属し、`safety-laws` は関係法令のテーマ（2026-09-11。同じ語を 2 テーマに置けないため）。

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

1. 親が原本の文字起こしを読んで方法を理解する。執筆エージェント（`guide-rewriter` 新規起草モード等）には**原文を渡さず、親の言葉で 30 字以内の語句だけの brief** を渡す。
2. H2 は原本の章順・項目数・ラベル名をなぞらず、読者の時間軸や失敗パターンで組む。
3. 例題・出題例は公式過去問（exam-official・サイトの過去問記事）から。原本の例題は使わない。
4. 図は自作 SVG（[figure-canvas-policy.md](./figure-canvas-policy.md)）。原本の図は題材リストとしてだけ使う。
5. `guide-qa` → `guide-fact-checker`（制度・数値を一次資料へ）→ Drive をマウントして `npm run check-reference-sources:deep` で 40 字一致 0 → 1 記事 1 コミット。

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
2. 値: `content-taxonomy.json` / `categories.json` / `tags.json` / `topics.json` を更新し、`npm test`（`tests/content-taxonomy.test.mjs` が `doc-classifier.ts` / `content-routes.ts` との一致を固定）→ `npm run check-content-taxonomy`。
3. `.claude/config/policy-anchors.json` の `content-taxonomy` クラスタに挙がるファイルの整合を確認し、`/doc-sync` を 1 回回す。
