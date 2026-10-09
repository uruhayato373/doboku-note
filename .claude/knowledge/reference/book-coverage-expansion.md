---
title: 書籍の網羅をサイトへ展開する（Writer・QA・写真の手順）
---

# 書籍の網羅をサイトへ展開する（Writer・QA・写真の手順）

[book-coverage-judging.md](./book-coverage-judging.md) の判定で決まった追記を、サイトの記事へ書き足す手順。担当は 3 つで、Writer が追記を書き、QA が確かめ、写真の担当が AI 写真を作る。全体の流れは [content-taxonomy.md](./content-taxonomy.md) §7。

担当はどれも git の書き込み操作をしない（add・commit・stash・checkout・reset はすべて禁止）。コミットは親が記事ごとに行う。

## 0. 親が展開の前にすること

道具はリポジトリにある（DN-0621）。どの PC でも、判定と候補表を Drive から取り戻せば同じ手順で回せる。

1. `npm run drive-vault-sync -- --pull --group reference-book-coverage --commit` で判定（verdict.json）と候補表を手元へ取り戻す。
2. `node scripts/audit-reference-book-coverage.mjs --briefs [--source-id <id> | --shelf <棚>] [--alias <json>]` で、判定の計画を記事ごとの brief に束ねる。書き出し先は `.tmp/book-coverage/briefs/`（市販書籍の見出しを含むので git 管理外）。同じ記事に効く複数の本の追記は 1 本の brief になる。`items.json` が workflow に渡す記事の一覧。
3. 出力の「要確認」を読む。新しい記事の案が既にある記事・同じ資格で題名の近い案・既存記事に近い案を挙げる。同じ主題の案は 1 本にまとめ、`{"<案の slug>": "<寄せる先>"}`（題名も変えるなら `{"to": "…", "title": "…"}`）の JSON を `--alias` に渡して作り直す（2026-10-09 に、経営事項審査の新規案が 3 冊から別々に出ていた）。
4. Workflow `book-coverage-expand`（`.claude/workflows/book-coverage-expand.js`）を、args `{ root: "<リポジトリの絶対パス>", items: <items.json の中身> }` で回す。Writer → QA → 修正 → コミットを記事ごとに進め、コミットは `node scripts/book-coverage-commit.mjs` が 1 本ずつ行う（排他・trailer `Book-Coverage:`・図のサイズの検査・一時の作業ツリーでの静的インデックスの作り直し・develop への push）。QA から再開する記事は item に `"startAt": "qa"` を足す。
5. 写真は、展開の結果の `photosWanted` から `{ article, file, photos: [{ afterHeading, subject }] }` を作り、Workflow `book-coverage-photos` を args `{ root, items }` で回す（§3）。

- 新しい記事の案をまとめたら、判定の計画（verdict.json）の記事名も合わせ、`--check` を通す。
- 1 記事に追記が 30 件を超えたら、主題で別の記事へ分ける。分けたら、どの workflow の対象にも入っているかを `--status` の「展開中」で確かめる（振り分けで対象から漏れた記事が 2 本あった）。

## 1. Writer（追記を書く）

依頼文の brief（`.tmp/book-coverage/briefs/<資格>__<slug>.md`）にある追加を、指定の記事へ書き足す。新しい記事のときは記事を起こす。編集してよいのは、その記事の `article.mdx` と同じディレクトリの `img/` だけ。ほかの記事・設定（`category-curriculum.json`・`tags.json`・`figure-sources.json` など）は編集しない。親がまとめて直す。

### 独自性（最重要）

- 市販書籍の文字起こし（`content/sources/books/**/ocr/`）は読まない。brief の語句と、一次資料・自分の知識から書く。
- brief の見出しと論点の並びは、判定のために本の言葉から作った仮のもの。見出しの言葉・項目の順・各項目で挙げる要素の順と理由づけは、そのまま使わず自分の軸で組み直す。2026-10-08 には、主任技士の配合設計の追記が本の章と同じ 4 種・同じ順・同じ「利点と問題点」の切り口になり、QA で差し戻した。
- 本の章立て・小見出しのラベル・項目の数と順序・例をなぞらない。論点が同じでも、読者の判断の順番（何を見て → どう推定し → 何で確かめ → どう判定するか）や、失敗しやすい点で組み立てる。
- 運営者は元自治体の土木職（発注者）。発注者・監督・点検の現場でどこを見るか、答案や調書に何を書くかを一般論で書く。架空の体験談・数値・事例は作らず、「私は〜した」とも書かない。
- 例題は本からとらず、サイトの過去問・演習記事（`content/site/<資格>/primary-*`・`secondary-*`）から引いて内部リンクでつなぐ。実務記事（`civil-practice/`）では試験の文脈や note の案内を使わず、一次資料を示す。

### 事実と数値

- 規格値・基準値・年号・法令の条項・試験方法の手順は、一次資料（法令・告示・国交省の要領・JIS・土木学会示方書・各試験機関の公表資料・白書・統計）で確かめてから書く。WebSearch / WebFetch で確認し、出典を示す。示し方は記事の型に合わせる。教科書（textbook）・キーワード記事のように「参考資料」の見出しがある記事はそこへ足す。ガイド（`group: guide`）は「参考資料」の見出しを置かず、本文中のリンクで一次資料を引く（content-principles.md §20・lint-mdx-mobile 12-2）。市販書籍の名前は出典に書かない。
- 業界の統計は最新の公表値で書き、年次を明記する。確かめられない数値は書かない。どうしても要るときは本文に `（要確認）` を付けて残し、返答で報告する。
- brief に「サイトと本で食い違う」とある論点は、一次資料で正しい方を決めてから書く。

### 書き方

- 先に対象の記事を全文 Read し、文体（である調／ですます調）・見出し階層・コンポーネントの使い方を踏襲する。brief の範囲外の既存の文章は変えない。
- 見出しは H2 以下、絵文字は使わない。強調は `<Callout>` で、type は既存記事で使っているものにする。表は 2 軸比較だけで 4 列以上は作らない。数式は KaTeX（`$…$`）。1 段落は 200 字以内を目安にする。
- モバイル規約（pre-commit の lint-mdx-mobile が止める）:
  - `<Callout>` は記事全体で 3 個まで。
  - 表は原則 2 列。3 列にするならセルは 15 字以内。
  - `alt` は 80 字以内。
  - 同じ語尾の文を 3 つ以上続けない。
- 締めの H2（「記述式で使う思考フレーム」「誤答の型を潰す」「参考資料」など）があれば、その前に入れる（brief に `after` の指定があれば従う）。
- 表記は textlint（prh）の規則が正。同じ記事の既存の行に規則と違う表記があって `npx textlint` が止めるときは、`npx textlint --fix` の表記に直してよい（意味は変わらない。2026-10-09 に、QA が元の表記へ戻させて textlint で止まる形が 3 回起きた）。
- frontmatter: `dateModified` を今日（JST）にする。`sources` に brief の書籍 id（`config/reference-sources.json` に登録済みのもの）が無ければ足す。

### 新しい記事

- 置き場は `content/site/<資格>/<slug>/article.mdx`（Convention B）で、図は同じディレクトリの `img/`。
- frontmatter は同じ資格の既存記事と同じ項目・順序にする。`tags` は `src/config/tags.json` に登録済みの語だけ（`npm run check-content-taxonomy`）。`title` は「主題 — 読者の判断の言葉」、`seoTitle` は 60 字以内、`description` は 120〜160 字。
- 本文は 3,000 字以上（`npm run check-guide-length`）。導入は、読者が現場や試験で迷う場面から書き始める。
- 既存記事と重複させず、役割を分ける。関連する既存記事への内部リンクを本文に 1 本以上張る。逆向きのリンクとカリキュラムへの登録は親が行うので、返答に「リンクを張ってほしい記事と節」「カリキュラムの区分の案」を書く。

### 図（brief に図の案があるとき・自作 SVG）

- `.claude/skills/authoring/create-svg/SKILL.md` と `.claude/knowledge/reference/figure-canvas-policy.md` を読んでから描く。
- viewBox は `0 0 400 500` 固定。色は `.claude/knowledge/design-system/svg-tokens.json` の allowlist だけ、最小フォントは 11。図の中に概念名のタイトルや「試験ポイント」枠を入れない。右端のラベルは x=366 以下にする（P1-text-clip）。
- ファイル名は `img/figure-<英語のスラッグ>.svg`。本の図の構図を再現しない。
- 埋め込みは既存の形式に合わせる（`{/* source: doboku-note による自作 SVG（教材原図の複製ではない。論点を再構成） */}` と `<ArticleImage src="/posts/<資格>/<slug>/img/figure-….svg" alt="…" width={400} height={500} />`）。

### 写真

Writer は写真を作らない。返答に「写真を入れたい位置（直前の見出し）と被写体」を書く（写真の担当が作る）。

### 完了条件（Writer が自分で回す）

- `node .claude/scripts/lint-mdx-mobile.mjs <article.mdx>`: 追記で増えた指摘が 0。
- `npx textlint <article.mdx>`: 指摘 0（`npx textlint --fix` で機械修正できる）。
- `node scripts/check-figure-canvas.mjs`: 通る。
- `node scripts/check-image-assets.mjs --ci`: この記事の図に `size-new`（サイズ上限 10KB 超え）が無い。超えたら、同じ値の属性（`font-size`・`text-anchor` など）を親の `<g>` にまとめ、既定値の属性（`stroke-width="1"`）を省いて軽くする。指定の無かった要素が親の値を受け継がないよう、元の既定値は明示する（2026-10-09 に 2 枚が CI で落ちた）。
- `node scripts/check-reference-sources.mjs --deep 2>&1 | grep <記事のパス>`: 一致 0。40 字以上の一致があれば言い換える。
- 文字化け（U+FFFD）が 0。
- 新しい記事なら `npm run check-guide-length` と `npm run check-content-taxonomy` も回す。

## 2. QA（追記を確かめる・編集しない）

依頼文の記事について、今回追記した部分（`git diff -- <記事ディレクトリ>`。新しい記事は全体）だけを確かめ、直すべき箇所を報告する。

1. 事実・数値: 規格値・基準値・年号・条項・統計・用語の定義を、一次資料で WebSearch / WebFetch して照合する。誤り・古い値・出典の無い数値・`（要確認）` の残りを挙げ、正しい値と出典 URL を示す。
2. 独自性: 依頼文で指定した書籍の文字起こし（OCR のファイルと節）と追記を読み比べる。章立て・見出しのラベル・項目の数と順序・例・言い回しをなぞっている箇所を挙げる。40 字以上の一致は機械が調べるので、ここでは構成の類似と言い換えの近さを見る。
3. 読みやすさと規約: 既存の文体との揃い、200 字を超える段落、4 列以上の表、絵文字、H2 以下か、既存の内容との重複・矛盾、内部リンクの切れ（リンク先が `content/site/` に実在するか、問題番号が合っているか）。
4. 図: 追加した `img/figure-*.svg` を Read し、次を確かめる。
   - 概念の正しさと本文との整合
   - 誤字、文字の重なり・はみ出し、最小フォント 11
   - 図の中のタイトル・試験ポイント枠の有無
   - 色の allowlist
   - alt と図の内容の一致
5. 体験談の捏造: 運営者の架空の体験（「私は〜した」・具体的な現場名・数値）が無いか。

表記の指摘は textlint（prh）の規則に合わせる。規則の表記を「元の表記へ戻す」ようには求めない（textlint が止める）。

判定は、直さなくてよければ `PASS`、直す箇所があれば `FIX` にする。FIX のときは、直す箇所を重要度順（高・中・低）に「場所 — 問題 — 直し方（正しい値と出典 URL）」で返す。

## 3. 写真の担当（AI 写真を作って入れる）

1. Writer が挙げた位置と被写体から、生成の指示（prompt）を書く。次を守る。
   - 実物の形を具体的に書く（機械の構造・器具の置き方・変状の見た目）。
   - 文字・ロゴ・人の顔を入れない。
   - 浅い被写界深度にする（ファイルが 150KB を超えにくい）。
   - 2026-10-08 には、コアドリルを縦の支柱で描いて監査で落ちた。正しくは、壁にアンカーで固定した横向きの支柱。自信のない形は一次資料の写真・図で確かめてから書く。
2. `npm run gen-article-photo -- --fig <資格>/<slug>/img/photo-<英語のスラッグ> --prompt "…"` を回す。1 枚ずつ、親が指定した順番で回す。同時に回すと台帳の JSON がぶつかる。
3. 記事の指定の位置に `<ArticleImage src="/posts/<資格>/<slug>/img/photo-….webp" alt="…" width={960} height={720} />` を入れる。生成の結果に寸法が出たら、それに合わせる。
4. できた画像を Read で見て、本文と食い違う形や生成の破綻があれば、prompt を直して作り直す。
5. 返答に、図のキー（`<資格>/<slug>/img/photo-…`）・prompt・本文の該当箇所を書く。親が `ai-image-fidelity-auditor` に監査させ、`node scripts/check-image-origin.mjs record-ai` で記録する。
