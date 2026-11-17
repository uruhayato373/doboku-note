---
title: 役割分担の明確化とエージェント再編の計画（引き継ぎ）
updated: 2026-11-18
---

# 役割分担の明確化とエージェント再編の計画

> [!note] 状態（2026-11-18）
> 運営者が承認した計画。第1段階（食い違いの修正）は develop の 5c2107e18e で完了。第2〜4段階は backlog のカードで進める。全段階が終わったらこの文書は削除する。

## Context（なぜやるか）

「どの領域のものか」は全部決まっている（8領域・データ296件・文書・スキル・エージェント84体すべてに領域が付き、検査が止める）。しかし次の3つがどこにも記録されていない。

- **誰が書くか**: 台帳 `scripts/lib/datasets.mjs` に書き手の欄が無い。コードから機械的に特定できるのは296件中70件。`config/automations.json` の `writes` で分かるのは38件。文書159本に持ち主の欄は0本。
- **誰が決めるか**: 領域ごとの判断者（運営者／親／スキル）が散文に散らばっている。
- **エージェントの持ち物**: 各エージェントが何を書いてよいかは本文の散文だけで、照合できない。

その結果、実際にずれが出ている（調査で確認済み）。

- `strategy-advisor` は「戦略の統括」と書かれているが、直近4週間（10/21〜11/17）の呼び出しは0回。戦略判断は親が `/weekly-review`・`/monthly-review` で行っている。
- 価格の正本 `config/products.json` を3体（note・ココナラ・KDP の運用役）が書く。`experiments.json` は書き手が4つ、`weekly.md` は2つ。
- 運用役の担当が広い（`coconala-operator` は7機能、`note-operator` は実質7機能）。
- 集客の分析役が居ない（note 内・ココナラ内）。商品企画は総監だけ。
- 84体のうち4週間で呼ばれたのは45体。39体は0回。一方、名前の無い `general-purpose` は184回で、どの専任エージェントより多い。

**狙い**: 「決める・動かす・見る」を領域ごとに1枚で言える状態にし、台帳1件ごとに書き手を1つに決め、検査で止める。エージェントは、実際に仕事がある所を分け、使われていない所を畳む（総数はほぼ変えない）。

## 分け方の原則

**エージェントは役割で分け、資格は設定で渡し、手順はスキルが持つ。**

| 軸 | 置き場 | 例 |
|---|---|---|
| 役割（分析・企画・制作・採点・運用・監査） | エージェント | `note-traffic-analyst`、`coconala-listing-operator` |
| 資格（総監・土木・RCCM…） | 設定と資格別の規則ファイル。エージェントには引数で渡す | 字数・形式・採点軸は資格別プロファイル |
| 手順（何をどの順で・どこで止めるか） | スキル | `/weekly-review`、`/coconala-order` |
| 数えられること（件数・閾値・週比・照合） | スクリプトと検査 | `check-*`・`report-*` |

- **資格ごとには分けない。** 分析・企画・運用の役は資格を引数で受ける。新設する3体も資格別にしない。
- 答案の制作だけは今、資格別に4組ある（cce・cem・rccm・civil-keiken の writer/qa）。本文の骨格は同じ（背景・入力・記事の構造・執筆規則・機械ゲート・担当外）で、違うのは字数と形式。4週間の呼び出しは cem 3回・civil-keiken 2回・cce と rccm は0回。**次の資格からは組を足さず、共通の `essay-writer`／`essay-qa` に資格別プロファイルを渡す形にする**。既存4組をまとめるかは DN-0798 で運営者が決める。`pe-secondary-exam-*`（51回・事実照合つき）は今のまま残す。

### 機械の段を先に置く（3層）

どの仕事も「①機械（取得・集計・閾値）→ ②意味の判断（エージェント）→ ③決定（親・運営者）」に分け、①で済むものはエージェントにしない。

| 対象 | いま | 変更 |
|---|---|---|
| `gsc-csv-auditor`・`a8-csv-auditor` | 本文が「件数照合・sha256・schema は機械的」と自認。4週間0回 | 検査スクリプト（`check-google-ui-ssot` と A8 側の同等品）へ寄せて**廃止**。桁違いの跳ね上がりも閾値で検出する |
| `technical-seo-auditor` | 機械の出力を束ねるだけ。0回 | 束ねは `report-*` スクリプトにして**廃止** |
| `performance-auditor` | 閾値判定と回帰検出は決定的。0回 | 判定はスクリプトへ。改善案が要るときだけ親が読む。**廃止** |
| `sns-archive-auditor` | 定型の分類。0回 | `drive-vault-sync` の dry-run 判定へ寄せて**廃止** |
| ココナラの撤退ライン | `coconala-operator` が判定 | 閾値は設定に置き、スクリプトが判定。分析役は理由と次の手だけ |
| 新設の分析役3体 | — | 入力は必ずスクリプトの集計（JSON）。自分で数え直さない |

廃止の5体はどれも「検査が無くなる」のではなく、検査を `quality-audit.mjs` に登録して CI・週次で必ず走る形に変える。

### モデルとエフォートは役割で決める

個別の表は作らず、役割ごとの既定を `.claude/rules/skills-agents.md` に1か所書き、`check-domains` が外れを止める（外すときは本文の「モデル方針」に理由）。

| 役割 | モデル | エフォート | 理由 |
|---|---|---|---|
| `planner`（企画） | sonnet | medium | 台帳の突き合わせは子、決定は親 |
| `analyst`（分析） | sonnet | medium | 集計済みの数字の解釈 |
| `writer`（制作） | sonnet | medium | 規則に沿った生成 |
| `qa`（採点） | sonnet | medium | 定型ルーブリック |
| `operator`（運用） | sonnet | low | 手順どおりにスクリプトを回す |
| `auditor`（監査） | sonnet | low | 機械の出力の読み取り |
| 機械の段（`cli-runner`） | haiku | low | 1コマンドの実行 |

frontmatter の `effort:` が今の Claude Code で効くかは、第3段階の着手時に公式ドキュメントで確かめる（効かなければ、呼び出す側のスキルに書く）。

## 設計の骨子

### 1. 書き手は台帳が正本（データ296件）

`scripts/lib/datasets.mjs` の各行に `writer` を足す。値は接頭辞つきの配列。

| 値 | 意味 | 実在の検査 |
|---|---|---|
| `script:<npm script 名>` | 人や親が回すスクリプト | package.json |
| `automation:<id>` | 定期実行（土曜の収集・CI） | `config/automations.json` |
| `skill:<名>` / `agent:<名>` | スキル・エージェントが書く | `.claude/skills`・`.claude/agents` |
| `human` | 運営者か親が手で編集する設定 | — |

- 書き手が2つ以上の行は `writerNote`（どの欄を誰が書くか）を必須にする。例: `business.experiments` は「measurements＝`automation:fetch-metrics`、それ以外＝`skill:nsm-experiment`」。
- `config/automations.json` の `writes` は廃止し、台帳からの逆引きにする（同じ事実を2か所に持たない）。管理画面の「書き手」列（`tools/admin-app/src/lib/stores.ts` の `writersByDataset`）は台帳を読む形に変える。
- 未記入は増やせないラチェットで管理する（`.claude/config/dataset-writer-baseline.json`）。最初の PR で戦略・計画・商品・アフィリエイトと検索集客（約130件）を埋め、残りは領域ごとに下げる。

### 2. 領域ごとの担当表（決める・動かす・見る）

`config/domains.json` の各領域に `roles` を足す。

```json
"roles": {
  "decides": "operator",                       // 最終判断（operator＝運営者 / parent＝親）
  "review": ["skill:weekly-review", "skill:monthly-review"],  // 判断の場
  "gaps": [{ "job": "SNS投稿の送客効果の評価", "by": "skill:weekly-review", "reason": "SNS保留中" }]
}
```

- エージェントの frontmatter に `role:` を足す（`analyst` 分析 / `planner` 企画・計画 / `writer` 制作 / `qa` 採点 / `operator` 外部サービスの運用 / `auditor` 監査）。今は tools から「編集可／監査のみ」の2値を導いているだけ。
- 「領域×役割」の表は `build-capability-index` が `agents-registry.md` に生成する（`scripts/lib/capability-index.mjs` の `renderAgents` に列を足す）。管理画面 `/domains/[id]` にも役割と持ち物（台帳の逆引き）を出す。
- 担当エージェントが居ない仕事は `gaps` に「誰が代わりに担うか」を書く。空白を黙って残さない。

### 3. 文書の持ち主

`config/domains.json` に `documentStewards`（パス接頭辞 → `updates`＝更新する人、`approves`＝承認する人）を足す。最初は `docs/strategy/`・`docs/marketing/`・`docs/products/` の全文書を必須にし、作業マニュアルはラチェットで後から埋める。例: `06_多資格展開戦略`＝`skill:monthly-review`／運営者、`09_販売チャネル競合分析`＝`skill:competitor-review`／運営者。

### 4. エージェントの再編

| 領域 | 変更 | 理由 |
|---|---|---|
| 戦略 | `strategy-advisor` を**廃止**。ルーティング表は `business-review.md` へ移す | 4週間で0回。サブエージェントは他のエージェントを束ねられない |
| 戦略 | `product-portfolio-planner` を**新設**（planner・書かない） | 資格ごとの「次に作る商品」と価格・品揃えの案。総監以外は空白。`/monthly-review` と `/monetization-strategy` から呼ぶ |
| 戦略 | `competitor-analyst` を**2分割**: `sales-competitor-analyst`（note・ココナラ・Kindle の価格・品揃え・訴求）と `content-competitor-analyst`（X・IG・YouTube の型・論点・再生） | 5チャネル×7資格を1体で見ている。売り場の競合は商品企画に、発信の競合は SNS・動画の制作に効き、返す先が違う。出力は `competitor-positions.json` の差分に統一。資格は引数 |
| 戦略 | 競合の取得・変化の検出・資格ごとの混み具合は今のままスクリプト（`scout-*`・`qualification-market`・`competitor-position`） | 機械の段。分析役は取得しない |
| 商品 | `note-traffic-analyst` を**新設**（analyst・書かない） | note 内のアクセス・スキ・マガジン流入→購入。`/weekly-review` の名無しの子（Agent B）を置き換えるので起動数は増えない |
| 商品 | `coconala-traffic-analyst` を**新設**（analyst・書かない） | 閲覧・お気に入り・撤退ライン判定。`coconala-operator` のケース2を移す |
| 商品 | `coconala-operator` を**2分割**: `coconala-listing-operator`（出品・編集・休止）と `coconala-order-drafter`（受注→納品文面の下書き） | 7機能・制作と評価と運用の兼務 |
| 商品 | `note-operator` を**2分割**: `note-catalog-operator`（価格・マガジン・カバー・PDF）と `note-buyer-responder`（購入者への返信の下書き） | 実質7機能・本文に矛盾あり |
| 商品 | `kdp-operator` から販売文の作成を `kindle-book-composer` へ移す | 制作と運用の分離 |
| 商品 | `sales-recorder` を**廃止**。商品名の対応表は設定ファイルへ移す | 0回。`/record-sales` は親が直接実行。対応表は `check-sales-mapping`・`sales-normalize` が読んでいる |
| 商品 | `config/products.json` の書き手を `script:product` の1つにする | 3体が書いている |
| 計画 | `weekly.md` の書き手を `todo-planner` だけにする（`/a8-report` は親へ返す） | 書き手が2つ |
| サイト | `metrics-analyzer` を検索（GSC・GA4）に絞る。パターン数の食い違い（8と6）を直す | SNS 流入は weekly-review と重複 |
| 全体 | 評価役8体に `tools:` の制限を足す。本文と tools の食い違い4体を直す | 規約は監査役に制限を必須としている |

### 5. サイト（記事・図・UI）

サイトは最も使われている領域（4週間で `site-page-visual-auditor` 54回・`guide-fact-checker` 38回・`civil-guide-writer` 22回・`page-design-builder` 21回）。「作る役と見る役の分離」「機械で決まる崩れは機械が先に確定」はすでにできているので、骨格は変えない。直すのは、資格名で分かれている所・1体に詰め込んだ所・採点の中に残る機械の仕事の3点。

エージェントの frontmatter に `target:`（対象の型）を足し、`role:` と合わせて「対象×役割」の表を生成する。同じ組み合わせが2体あれば、違いの説明が無い限り検査で止める。

**記事**（型で分ける。資格は引数）

| 型 | 作る | 直す | 見る（意味） | 事実照合 | 変更 |
|---|---|---|---|---|---|
| ガイド | `civil-guide-writer` | `guide-rewriter` | `guide-qa` | `guide-fact-checker` | 作る役を `guide-writer` に改名（中身はすでに土木1級・2級・実務の横断） |
| キーワード | 親（`/keyword-page`） | `keyword-rewriter` | `cem-qa` | — | `cem-qa` を `keyword-qa` に改名し、総監の規則は資格別プロファイルへ。参考 URL の実在確認は `check-mdx` の links へ移す |
| 教科書 | `/pdf-to-mdx` | `civil-textbook-rewriter` | `civil-construction-qa` Mode A | 原典 PDF | 下の分割 |
| 過去問 | `/exam-questions-import` | `past-exam-rewriter` | `past-exam-qa`（正答・解説の質）／`content-qa`（原典への忠実さ） | 原典 PDF | 2体の境界を本文に明記するだけ |
| 基準書の表 | `standards-table-writer` | — | `standards-table-qa` | 原本ページ画像 | 変更なし |

- `civil-construction-qa`（492行・4モード・最長）を**2分割**: `textbook-qa`（原典との照合・Mode A）と `article-proofreader`（既存記事の校正・Mode R）。Mode B（ガイド）は `guide-qa` と重なるので削り、Mode C（`content-qa` へ回すだけ）も削る。
- 一度きりの修復用で0回の `civil-exampoint-restorer` は廃止候補（DN-0798）。

**採点から機械の仕事を抜く**: 採点表に残っている数えられる軸（MDX 互換性＝`check-mdx`、図ファイルの存在、網羅率＝既存スクリプトの値、モバイル視認性＝`lint-mdx-mobile` の件数、URL の実在）は、親が先に機械で通す。機械で落ちたら採点役を起動しない。採点役は意味の軸だけを見る。

**図**（系統で分ける）

| 系統 | 作る・直す | 見る | 変更 |
|---|---|---|---|
| SVG 図版 | `svg-figure-rewriter`・`svg-canvas-fitter` | `svg-figure-auditor`・`pe-exam-figure-auditor` | 総監の試験図は `svg-figure-auditor` の対象の1つにする |
| 切り抜き | `civil-exam-figure-extractor`・`figure-crop-worker` | `civil-exam-figure-auditor`・`scanned-figure-crop-auditor` | `figure-crop-worker`（作る）と `figure-crop-auditor`（見る）の1対にまとめる |
| AI 画像 | 親（生成スクリプト） | `ai-image-fidelity-auditor` | 変更なし |

図の統合は SVG 系3体と切り抜き系の一部が0回なので、DN-0798 の判断と一緒に行う。

**UI**

- `page-design-builder`（作る）↔ `site-page-visual-auditor`（見る）の対と、合否を `/design-review` が決める形は変えない。
- 画面の目視役3体（サイト・基準書・note）は比べる相手が違うので分けたままにする。
- 管理画面（`tools/admin-app`）には作る役も見る役も無い。機械検査（`check-admin-ui-debt`・`check-shadcn-parity`・`check-admin-pages`）と親が担うと `gaps` に書く。
- 速度（Core Web Vitals）は閾値判定なのでスクリプトへ（上の「機械の段」の `performance-auditor`）。

**記事の持ち主**: `content/site/` は台帳の対象外なので、`config/domains.json` に `contentStewards`（記事の型 → 作るスキル・直す役・見る役・機械ゲート）を置く。commit するのは常に親。

**作らないもの**（`gaps` に明記する）: SNS 投稿の送客効果の分析役（SNS 保留中）、アフィリエイトの掲載先の最適化役（`/weekly-improve` の親が担う）、会員維持の役（メンバーシップ撤退 DN-0477 待ち）、実験の判定役（`/nsm-experiment` の親が担う）。

**0回だった39体**は、ちょうど判断時期が来ている DN-0798（11/18 以降に運営者が判断）で扱う。候補表を作って1行ずつ判断をもらい、退役は別 PR にする。SNS 保留中のものは0回でも対象外。検索系スキル3本の統合も DN-0798 の範囲。

## 進め方（4段階・各段階1 PR・base は develop）

コード変更は worktree（`.claude/worktrees/`）で feature ブランチを切り、develop へ PR を出す。

**第1段階: 食い違いの修正**（完了・5c2107e18e）
- `docs/strategy/01_プロダクト戦略.md:76`（存在しない `weekly-plan`・strategy-advisor 統括）、`agents-registry.md:247`
- `competitor-analyst.md`、`note-operator.md`（`note-magazines.ts` の扱い）、`metrics-analyzer.md`、`/record-sales`（説明文）、`/a8-report:87`
- `/monetization-strategy:28,62` の AdSense 撤退の記述（現在は再開済み）

**第2段階: 書き手の欄**（feature ブランチ）
- `scripts/lib/datasets.mjs`（`d()` の opts と約130行）、`scripts/check-datasets.mjs`（`DECLARATION_KEYS`・行ループに検査）、`scripts/lib/dataset-refs.mjs` の実在検査の形を流用
- `config/automations.json` から `writes` を外し、`scripts/check-automations.mjs` と `stores.ts` を逆引きに変える
- テスト: `tests/datasets.test.mjs` に、書き手の実在・複数書き手の `writerNote`・ラチェットを足す

**第3段階: 担当表と文書の持ち主**（feature ブランチ）
- `config/domains.json`（`roles`・`documentStewards`）、`scripts/check-domains.mjs`、`scripts/lib/domains.mjs`
- エージェント84体の frontmatter に `role:`、`scripts/lib/capability-index.mjs`、`tools/admin-app/src/lib/domains.ts` と `/domains/[id]`
- `docs/strategy/14_領域モデル.md` に「決める・動かす・見る」の節を足す

**第4段階: エージェントの再編**（feature ブランチ）
- 上の表の新設3体・分割3組・廃止2体と、機械の段へ寄せる5体の廃止（検査スクリプトと `quality-audit.mjs` への登録を先に入れる）。差し引きで84体→約82体
- 呼び出し元の SKILL.md（`weekly-review`・`monthly-review`・`monetization-strategy`・`competitor-review`・`coconala-order`・`coconala-publish`・`coconala-status`・`pe-note-plan`・`google-search-growth`・`seo-growth-review`・`a8-report`・`psi-audit`）を更新
- サイト側: `civil-guide-writer`→`guide-writer`、`cem-qa`→`keyword-qa` の改名、`civil-construction-qa` の2分割、採点表から機械の軸を抜く（`/improve-article`・`/quality-cycle`・`/keyword-page` の手順で機械ゲートを先に置く）。図の統合は DN-0798 の判断後
- 役割ごとのモデル・エフォートの既定を `.claude/rules/skills-agents.md` に書き、`check-domains` に外れの検査を足す
- `npm run build-capability-index`、`npm run sync-codex-compat`、`scripts/check-sales-mapping.mjs` と `scripts/lib/sales-normalize.mjs` の読み先変更
- DN-0798 の候補表（0回の39体と呼び出し回数）を `docs/reviews/` に出し、運営者の判断を待つ

## 検証

- `npm run check-datasets`（書き手の欠落・実在しない書き手で落ちること、埋めた後は通ること）
- `npm run check-domains`、`npm run check-doc-coupling`、`node scripts/check-agent-descriptions.mjs`、`npm run check-doc-refs`
- `node --test tests/datasets.test.mjs tests/dataset-refs.test.mjs`、`npm run quality:audit:ci`（FAILURE 0 件を読む）
- 管理画面: `npm run admin` で `/ops/store`（書き手列が296件に出る・未記入の件数が出る）と `/domains/strategy`（役割と持ち物）を画面で確認
- 再編後の試し呼びはしない（確認だけのための起動はトークンの無駄）。新設の役は、次の本番の週次・月次レビューで初めて動かし、その回の返り値で形を直す

## トークンを増やさない決まり

- **起動数を増やさない**: `note-traffic-analyst` は週次レビューの名無しの子（Agent B）の置き換えで、差し引き0。`coconala-traffic-analyst` は、スクリプトが閾値越え（撤退ライン・前週比の急変）を出した週だけ起動する。`product-portfolio-planner` は月次だけ、競合の分析役は四半期の `/competitor-review` だけ。
- **読む量を絞る**: 分析役の入力はスクリプトが作った集計（JSON）だけ。生データ・記事本文・Web は読ませない。tools は `Read, Glob, Grep` に限る。
- **返す量を決める**: 出力は「変化・考えられる理由・次の手・根拠の数字」の定型にする。
- **高いモデルを使わない**: 企画役も sonnet にする（上の表の `planner` を inherit から sonnet に変更）。台帳の突き合わせは子、決定は親。
- **機械へ寄せる5体の廃止と、採点の前の機械ゲート**は、起動そのものを減らす側に働く。
- 起動回数は `~/.claude/usage-log/` に残るので、再編の4週間後に前後を比べる（84体・4週間で専任568回＋`general-purpose` 184回が基準）。
