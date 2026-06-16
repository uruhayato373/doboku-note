---
title: サブエージェント詳細レジストリ
---

# サブエージェント詳細レジストリ

`.claude/agents/` に定義されたサブエージェント群の詳細。Generator/Evaluator 分離の原則に基づき設計。

**いつ読むか**: サブエージェントを呼び出すときに担当範囲を確認するとき、連携設計時、新規エージェント追加時の命名・責務設計時。

**モデル指定のクイックリファレンス**は CLAUDE.md 本体「ハーネス設計原則」§6 にある（判断の土台として毎ターン読めるようにするため）。このファイルには詳細な担当範囲・Phase 対応・連携パターンを集約。

---

## スキル → エージェント呼出マップ

どのスキルがどのエージェントを起動するかの早引き。

| 呼出元スキル                                    | 起動エージェント                                                         | 役割                 |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------ |
| `/pdf-to-mdx`                             | `content-qa`                                                     | 変換後品質評価（5軸ルーブリック）  |
| `/pdf-to-mdx --scanned`                   | `scanned-textbook-transcriber`（図 bbox は `civil-exam-figure-extractor` 同型） | スキャン書籍ページ画像の並列 OCR 文字起こし |
| `/quality-cycle --profile cem`            | `cem-qa`, `keyword-rewriter`                                     | 評価 → リライト → 再評価ループ |
| `/quality-cycle --profile civil-textbook` | `civil-construction-review`, `civil-textbook-rewriter`           | 評価 → リライト → 再評価ループ |
| `/audit-exam-mapping`                     | `exam-keyword-mapping-auditor`                                   | 紐づけ精度の semantic 評価 |
| `/note-prepublish-review`                 | `note-link-injector`, `note-figure-auditor`, `note-fact-checker` | 公開前品質チェック 3 並列     |
| `/audit-note-funnel --semantic`           | `note-funnel-auditor`                                            | note 導線の意味的監査（並び順・CTA関連性・回遊の質） |
| `/civil-figure-rework`                    | `civil-exam-figure-extractor`, `civil-exam-figure-auditor`       | 過去問1次 図クロップ品質ループ（1ページ最大3反復） |
| `/weekly-improve`                         | `metrics-analyzer`                                               | 計測データから改善機会抽出      |
| `/psi-audit`                              | `performance-auditor`                                            | CWV 違反・回帰検出        |
| `/weekly-review`, `/weekly-plan`          | `strategy-advisor`（オーケストレータ）                                     | 戦略的な PDCA 統括       |
| `/magazine-to-pdf`                        | `magazine-pdf-builder`                                           | 新規マガジンの PDF 抽出 spec 作成・変換実行 |
| `/civil-keiken-magazine`                  | `civil-keiken-essay-writer`, `civil-keiken-essay-qa`            | 施工経験記述マガジン模範答案の生成 → 5軸採点ループ |
| 技術士建設部門 模範解答生成（親が起動）           | `pe-secondary-exam-writer`, `pe-secondary-exam-qa`              | 二次模範解答 article.md の生成 → 6軸採点ループ（論述メソッドは `技術士論文の書き方` 由来） |
| `/pe-secondary-yosou`（建設部門二次 予想バッチ）   | `pe-secondary-exam-writer`, `pe-secondary-exam-factcheck`, `pe-secondary-exam-qa` | 1科目分の R8予想（II-1/II-2/III）を 生成 → 外部事実照合 → 6軸採点 → 梱包 → SoT → commit。クラウド実行前提（factcheck は WebSearch 必須） |
| note カバーロールアウト（親が起動）              | `note-cover-writer`                                              | 記事の G2 `cover:` ブロック執筆 → `add-note-cover.mjs` → 再生成 |
| X 投稿生成（親が起動 / `social-post` 連携）     | `x-post-writer`, `x-post-qa`                                     | X 投稿 `tweets.md` 執筆 → 5軸採点（多資格 exam 横断） |
| `/x-repost`（親が起動）                          | `x-repost-curator`                                              | 引用RP 候補の選別＋引用コメント生成（discover/exec は純 Playwright） |
| `/yt-shorts-create`（親が起動）                  | `yt-shorts-title-writer`, `yt-shorts-publisher-qa`              | YT Shorts の論点タイトル生成（既定上書き）→ 4軸採点 |
| `/doc-sync`（コード変更面の完了時に親が起動）          | `doc-sync-auditor`                                              | 変更 diff × 候補 doc を突合し prose・表・コマンド・件数・閾値の意味的陳腐化を検出（適用は親） |

⏸️ Phase 2 で復活（着手条件: Web 月収 ¥15k 達成後）:

| 呼出元スキル | 起動エージェント |
|---|---|
| `/keyword-gap`, `/exam-demand`, `/discover-exam-season` | `content-planner` |
| `/fetch-gsc-data` + 分析 | `seo-auditor` |

---

## エージェント一覧

| エージェント                         | 役割                                                                                                   | 種別           | model   | 担当スキル                                                                 | Phase 1 対応                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------ | ------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `content-qa`                   | PDF→MDX 変換の品質評価（5軸ルーブリック、過去問・基準書）                                                                    | Evaluator    | sonnet  | check-mdx, （Phase C で削除）                                              | ✅ 運用中                                     |
| `scanned-textbook-transcriber` | スキャン書籍（テキスト層なし）ページ画像の逐語 OCR 文字起こし（Read 画像＋Write のみ・Bash 不可。`## ` はトップ節専用・図はプレースホルダ・本文は Write して戻り値は軽量ステータス） | Generator    | sonnet  | pdf-to-mdx（`--scanned` のファンアウト OCR ワーカー）                              | ✅ 運用中（2026-06-14 起動）                      |
| `cem-qa`                       | 技術士総合技術監理キーワードページの品質評価（5軸ルーブリック）                                                                     | Evaluator    | sonnet  | lint-mdx-mobile, check-mdx, check-links, exam-backlinks               | ✅ 運用中                                     |
| `civil-construction-qa`        | 1級土木 textbook/guide ページの視覚＋網羅率検証（PDF 原本との3モード5軸ルーブリック）                                               | Evaluator    | sonnet  | check-mdx, review-mobile, Playwright MCP                              | ✅ 運用中                                     |
| `civil-construction-review`    | 1級土木 textbook/guide の既存 MDX 校正（PDF照合なし、content-principles準拠＋モバイル視認性＋画像キャプション品質）                      | Evaluator    | inherit | lint-mdx-mobile, check-mdx, check-links                               | ✅ 運用中                                     |
| `civil-keiken-essay-qa`        | 1級・2級土木 施工経験記述 マガジン模範答案の5軸採点（重複回避/形式適合/捏造なし/著作権・改変前提/採点視点）＋必須ゲート（U+FFFD・本文価格/ID〔導線リンクカードURLは許可〕・サイト重複・問題文整合・字数 strict）＋hashtags.txt 存在は推奨検査              | Evaluator    | sonnet  | civil-keiken-magazine 連携、civil-keiken-essay-writer と対                | ✅ 運用中（2026-05-29 起動）                      |
| `strategy-advisor`             | 戦略・PDCA・レビュールーティング・収益化戦略を統括するオーケストレーター                                                               | Orchestrator | inherit | weekly-plan, weekly-review, critical-review, pre-mortem               | ✅ 運用中（⏸️ 競合分析・keyword-gap 等は Phase 2 で復活） |
| `seo-auditor`                  | SEO 監査（Phase 2 で復活）                                                                                  | Evaluator    | sonnet  | fetch-gsc-data, fetch-ga4-data                                        | ⏸️ Phase 2 で復活                            |
| `metrics-analyzer`             | GSC/GA4 計測データから改善機会を5パターン抽出（High-Impr-Low-CTR 等）                                                     | Evaluator    | sonnet  | weekly-improve                                                        | ✅ 運用中                                     |
| `performance-auditor`          | PSI 計測データからしきい値違反・回帰を検出し、LCP 肥大・CLS 発生等の既知パターンに改善候補をマッピング                                            | Evaluator    | sonnet  | psi-audit                                                             | ✅ 運用中                                     |
| `content-planner`              | コンテンツ企画（Phase 2 で復活）                                                                                 | Generator    | sonnet  | discover-exam-season, exam-demand, keyword-gap                        | ⏸️ Phase 2 で復活                            |
| `keyword-rewriter`             | CEM キーワードページのバルクリライト                                                                                 | Generator    | sonnet  | quality-cycle 連携                                                      | ✅ 運用中                                     |
| `civil-textbook-rewriter`      | 1級土木 textbook/guide ページのバルクリライト                                                                      | Generator    | sonnet  | civil-textbook-cycle 連携                                               | ✅ 運用中                                     |
| `civil-exampoint-restorer`     | 1級土木 primary-* (一次過去問) の壊れた `<ExamPoint>` を体言止め学習ポイントに再生成（migrate-civil-answer-style.mjs 句読点分割バグの修復） | Generator    | sonnet  | civil-textbook-cycle 連携、lint 9-11 検証                                  | ✅ 運用中（2026-05-16 起動、AdSense 再申請対応）        |
| `civil-secondary-exam-writer`  | 1級土木 secondary-r03〜r07 (二次過去問) の解答・ポイント・各設問解説を `<details>` で補完（公式解答の逐語転載禁止、著者独自表現で再構成）。**問1経験記述は詳細な書き方/解答例を置かず記事中CTA `<MagazineCard pastexam-essay>` に置換**（カニバリ回避、2026-06-09）               | Generator    | sonnet  | civil-textbook-cycle 連携、lint 9-12 検証                                  | ✅ 運用中（2026-05-16 起動、AdSense 再申請対応）        |
| `civil-keiken-essay-writer`    | 1級・2級土木 施工経験記述 note有料マガジンのフル模範答案 article.md を生成（過去問年度別/テーマ別完成答案集/予想問題集、規格値プレースホルダ・工種重複回避・改変前提テンプレ。**返却前 `note-lint` ゲート必須**）         | Generator    | sonnet  | civil-keiken-magazine 連携、civil-keiken-essay-qa と対                    | ✅ 運用中（2026-05-29 起動）                      |
| `pe-secondary-exam-writer`     | 技術士第二次試験 建設部門 note有料マガジン用 模範解答 article.md を生成（必須科目I・選択科目II-1/II-2/III の全科目種別・全11専門分野。元公務員発注者視点を全科目に注入。合格3科目=道路/河川/都市計画は合格者訴求、残8科目は発注者監修訴求。**論述メソッドの真実源＝`docs/textbook/技術士論文の書き方`**：設問の問い分解・論点の絞り込み・あいまい表現排除を執筆原則に組込。**記事単位の完全梱包DoD**＝cover:ブロック＋`img/cover-{suffix}.png`＋`hashtags-{suffix}.txt`（`/note-hashtags --article {suffix}`）約90個、**命名規則（区分1ファイル＝全選択肢網羅、2026-06-10改訂）**: II-1=`article-II1.md`（全設問）/II-2=`article-II2.md`（II-2-1・II-2-2両方）/III=`article-III.md`（III-1・III-2両方）/必須I=`article.md`（I-1・I-2両方）。設問別ファイル（`article-II1-1.md`等）・選択科目dirの`article.md`は廃止。字数は各選択肢が個別に枚数上限内か判定。選択科目は article*.md 全件、経験記述免責の誤流用禁止。**末尾CTAは全区分で必須科目Iマガジン**（`pe-construction-required-magazine`）に統一＝選択科目はクロスセル文面/必須Iは単品→セットのアップセル文面、サイト無料導線でなく有料ファネル・**合格者コメント節は置かない**・採点ポイントは箇条書き）。**予想問題モード（forecast:true・`R{NN}-yosou`）**＝過去問が無い次年度の予想問題＋模範解答を作る時限商品。テーマ分析記事（`{subject}-exam-themes`）から予想設問を自作（過去問転載禁止・出典行なし）、`## 予想問題`＋`## 予想の根拠`＋予想免責を付す。**必須Iは複数案併記（A案/B案＝最重要課題で分岐・総監A/B方式）**で全分野受験者に訴求  | Generator    | sonnet  | `docs/note/技術士建設部門/noteコンテンツ計画.md` 参照、`pe-secondary-exam-qa` と対 | ✅ 運用中（2026-06-08 起動、2026-06-10 区分1ファイル＋末尾必須ICTA/コメント廃止＋予想問題モード）                      |
| `pe-secondary-exam-qa`         | 技術士第二次試験 建設部門 模範解答 article.md の**6軸**採点（設問適合/論述構成・論点絞り込み/分かりやすさ・あいまい表現排除/発注者視点・専門性/note完成度/**改訂コンピテンシー反映〔令和8〜：データ活用・多角的視点/ステークホルダー・持続可能な成果/経済/文化的価値〕**）＋必須ゲート（U+FFFD・note-lint〔note 非互換 BLOCK 全般: pipe表/太字内全角括弧/マガジンCTA形式/3点セット 等〕・本文価格/ID・**各選択肢が個別に字数上限〔枚数×600字〕内**・**全選択肢収録**〔片側欠落は不合格〕・設問1対1・旧方式残骸なし・論述式文体・著作権）。論述原則は `技術士論文の書き方`、改訂は `pe-construction-competency-revision-r8` から。**記事単位の完全梱包チェック**（cover:ブロック/img cover.png/hashtags~90/マガジン `note掲載文.txt`〔総監模範論文と同方式・旧_meta.yaml廃止〕・SoT）＋経験記述免責の誤流用ゲート。**末尾CTAは全区分で必須科目Iマガジンに統一**（選択科目=クロスセル/必須I=単品→セット、サイト無料ページ導線は不可）・**合格者コメント節は廃止**（あれば減点）・採点ポイントは箇条書き（pipe表不可）を採点。**予想問題モード（forecast:true）**＝記事内予想設問を真実源に設問適合採点、予想根拠/予想免責/予想専用見出しの有無・自作問題ゆえ出典行なしを検査。**必須Iの複数案併記（A案/B案）は両案収録・案ごと個別字数・最重要課題で実質分岐**を検査 | Evaluator    | sonnet  | `pe-secondary-exam-writer` と対、`docs/textbook/技術士論文の書き方` 参照 | ✅ 運用中（2026-06-09 起動、6軸化＋梱包チェック、2026-06-10 全選択肢収録ゲート＋末尾CTA/コメント廃止＋予想問題モード） |
| `pe-secondary-exam-factcheck`  | 技術士第二次試験 建設部門 模範解答の**技術的事実だけ**を WebSearch で外部一次情報（国交省・e-Gov法令・各学会基準書）に照合（数値/基準値/法令名・条番号/制度名・施策/技術用語の定義分類/統計年次。論述の巧拙・設問適合は見ない＝QAの領分）。verified/uncertain/likely_wrong の3区分、`likely_wrong`は`must_fix`（公開前修正必須）。**合格科目外（土質基礎/鋼コン/トンネル/港湾/鉄道/電力土木 等）の専門事実ハルシネーションを捕捉する最後の砦**。`note-fact-checker`（内部データ）と`pe-secondary-exam-qa`（構造）を補完。**WebSearch必須＝会社PCプロキシで空振り→クラウド/CI/Mac実行**（不可時は`blocked_no_websearch`、照合を偽装しない）。捏造禁止・ソースURL無き「wrong」判定を出さない | Evaluator    | sonnet  | `pe-secondary-exam-writer`/`qa` と連携、`/pe-secondary-yosou` Step3 で起動 | ✅ 運用中（2026-06-10 新設、BK-04〜11 予想の事実担保） |
| `note-link-injector`           | note ドラフトに doboku-note キーワードページへのインラインリンクを全 occurrence 注入（synonym 判断を含む semantic マッチ。**返却前 `note-lint` ゲート必須**）                | Generator    | sonnet  | note-prepublish-review 連携、辞書 `src/config/pe-chapters.json` 参照         | ✅ 運用中（2026-04-29 起動）                      |
| `note-figure-auditor`          | note ドラフトの図版を `note-svg-policy.md` 準拠で 4 軸監査（キャンバス・フォント・ブランド・密度）                                     | Evaluator    | sonnet  | note-prepublish-review 連携                                             | ✅ 運用中（2026-04-29 起動）                      |
| `note-fact-checker`            | note ドラフトの数値・主張を A（内部整合）+ B（キーワード参照）+ C（過去問データ）+ **D（白書ローカル一次照合）** でファクトチェック                          | Evaluator    | sonnet  | note-prepublish-review 連携、辞書 `src/config/past-exam-backlinks.json` 参照、**`.claude/scripts/whitepaper-grep-check.mjs`（スコープ D）** | ✅ 運用中（2026-04-29 起動、2026-05-29 スコープ D 追加） |
| `note-funnel-auditor`          | note 導線（資格別 3 層モデル）の**意味的**監査。4 軸（資格セグメント整合・もくじ構成・CTA 文面の関連性・回遊の質）。機械監査 `audit-note-funnel.mjs`（D1-D4）が拾えない並び順・文面ズレ・行き止まりを surface。audit-only | Evaluator    | sonnet  | `/audit-note-funnel --semantic` 起動、真実源 `docs/reference/note-funnel-architecture.md`・`.claude/config/note-funnel.json` 参照 | ✅ 運用中（2026-06-16 新設） |
| `exam-keyword-mapping-auditor` | PE 過去問 1 問の現紐づけ slug 群を semantic 評価し、追加/削除候補を confidence 付き JSON で surface                           | Evaluator    | sonnet  | audit-exam-mapping 連携、辞書 `.claude/state/keyword-summaries.json` 参照    | ✅ 運用中（2026-05-11 起動）                      |
| `ig-carousel-writer`           | Instagram カルーセル `slide-data.json` v2 を1キーワードずつ執筆（枚数可変・figure 判断・findings ログ追記）。色を本文に書かない。`angle` パラメータで6切り口の hook とスライド構成を制御 | Generator    | sonnet  | `docs/reference/ig-carousel-policy.md` + `sns-repurpose-policy.md` + **`docs/reference/content-angle-policy.md`** 参照 | 🚧 Phase 1 着手中（2026-05-20 起動、2026-06-10 angle 追加）             |
| `ig-carousel-qa`               | Instagram カルーセル の **6 軸**ルーブリック品質評価（テキスト 5 軸 + デザイン統一性 1 軸）。過去問パックは PNG を Read し tokens.json と照合。**角度型は軸1で角度純度・軸5で Red Line（experience 断片/number 出典）を確認** | Evaluator    | sonnet  | `docs/reference/ig-carousel-policy.md` + `docs/design-system/instagram-carousel-tokens.json` + **`docs/reference/content-angle-policy.md`** 参照 | 🚧 Phase 1 着手中（2026-05-20 起動、2026-05-27 第6軸追加、2026-05-28 lint E3 はみ出し検知連携） |
| `civil-exam-figure-extractor`  | 1級土木 primary（過去問1次）図クロップ bbox spec の Generator。事前レンダリング済み PDF ページ画像を Read し JSON spec を返す | Generator | sonnet | `/civil-figure-rework` 連携、`image-policy.md` L165-177 準拠 alt 生成 | ✅ 運用中（2026-05-28 起動） |
| `civil-exam-figure-auditor`    | 1級土木 primary 図 PNG の 4 軸ルーブリック品質評価（クリップ純度・本文重複・alt 精度・MDX 結線）。次反復用 feedback JSON 返却 | Evaluator | sonnet | `/civil-figure-rework` 連携、`note-figure-auditor` の 4 軸構造を参考 | ✅ 運用中（2026-05-28 起動） |
| `ig-reels-writer`              | Instagram Reels の `reels/script.json`（読み上げ台本・想定秒数・無音 pause）+ `caption.txt`（ネタバレなし・ハッシュタグ 3 階層 mix）を 1 パックずつ執筆。`angle` パラメータで6切り口の冒頭 Hook を制御 | Generator    | sonnet  | `docs/reference/ig-reels-policy.md` + `sns-repurpose-policy.md` 参照（戦略 v7 で新設） | 🚧 Phase 1（2026-05-28 起動、2026-06-10 angle 追加）       |
| `ig-reels-qa`                  | Instagram Reels の **5 軸**ルーブリック品質評価（尺・読み上げ完結性・キャプション/タグ品質・音声画面整合・保存導線）。「スワイプで」等カルーセル流用 CTA を重大減点 | Evaluator    | sonnet  | `docs/reference/ig-reels-policy.md` 参照（戦略 v7 で新設） | 🚧 Phase 1（2026-05-28 起動、戦略 v7 Phase B）       |
| `ig-stories-writer`            | Instagram Stories の `stories/caption.txt` と `stories/note.md` をパック固有にキュレーション。投票/質問ステッカー文言・リンクスタンプ URL 確定。`angle` パラメータで6切り口の4枚ストーリー弧を制御 | Generator    | sonnet  | `docs/reference/ig-stories-policy.md` + `sns-repurpose-policy.md` 参照（戦略 v7 で新設） | 🚧 Phase 1（2026-05-28 起動、2026-06-10 angle 追加）       |
| `ig-stories-qa`                | Instagram Stories の **3 軸**ルーブリック品質評価（コピー力・リンク導線整合・ステッカー双方向性）。テンプレ未差替（「令和7年度」のまま等）と 02/03 ステッカー誤配置を減点 | Evaluator    | sonnet  | `docs/reference/ig-stories-policy.md` 参照（戦略 v7 で新設） | 🚧 Phase 1（2026-05-28 起動、戦略 v7 Phase C）       |
| `yt-shorts-title-writer`       | YouTube Shorts（過去問派生）の**論点ベースのタイトル**を執筆し meta.json の既定タイトルを上書き（`技術士総監 令和X年度 択一｜論点 #Shorts`・40字以内・使い回し/ネタバレ禁止）。親が featured 設問文を抽出して渡す | Generator    | sonnet  | `docs/reference/yt-shorts-publisher-policy.md` §2 参照、`yt-shorts-publisher-qa` と対 | ✅ 運用中（2026-06-05 起動）            |
| `yt-shorts-publisher-qa`       | YouTube Shorts（IG Reels 派生 mp4 + meta.json）の **4 軸**ルーブリック品質評価（尺=**≤60秒ゲート**〔60秒超は通常動画扱いで不合格〕・UTM 整合・タイトル長/検索性・字幕整合）。IG 用 UTM 混入を重大減点、予約後は `videos.list` で偽成功検証（policy §7） | Evaluator    | sonnet  | `docs/reference/yt-shorts-publisher-policy.md` 参照（戦略 v7 で新設、2026-06-05 v2 確定） | 🚧 Phase 1（2026-05-28 起動、戦略 v7 Phase D）       |
| `ig-highlight-designer`        | Instagram ハイライト（`highlights/NN_*/slide-data.json`）の Stories 用構造化データを 1 ハイライトずつ執筆。モダンシック意匠 + データ駆動レイアウト | Generator    | sonnet  | `docs/reference/ig-highlight-design-policy.md` 参照（戦略 v7.1 で新設） | 🚧 Phase 1（2026-05-28 起動、戦略 v7.1）              |
| `ig-highlight-qa`              | Instagram ハイライト の **4 軸**ルーブリック品質評価（サムネ識別性・リードコピー力・ジャンル一貫性・余白配分／セーフエリア）。IG UI セーフエリア侵入（overline が y<200）・本文の y>=1280 侵入・06_materials の note 有料直リンクを重大減点 | Evaluator    | sonnet  | `docs/reference/ig-highlight-design-policy.md` 参照（戦略 v7.1 で新設） | 🚧 Phase 1（2026-05-28 起動、戦略 v7.1）              |
| `magazine-pdf-builder`         | note マガジンの article.md を「問題文＋解答」紙用 PDF に変換する spec(JSON) を作成し `scripts/magazine-to-pdf.mjs` を実行。新規/構造不明マガジンの include/exclude 設計が主戦場。複数解答（A/B案）両収録を社則化 | Generator    | sonnet  | `/magazine-to-pdf` 連携、`scripts/magazine-to-pdf.mjs` DSL 準拠 | ✅ 運用中（2026-05-29 起動） |
| `note-cover-writer`            | note 記事の G2 カバー frontmatter（`cover:` ブロック）を1記事ずつ執筆。タイトルを leadIn/hi/hiSuffix/banner/chips×3 に分解。色は書かず文字列のみ（試験色は dir から自動）。注入は `add-note-cover.mjs`（CRLF安全）、再生成は `generate-note-covers.mjs` | Generator    | sonnet  | `docs/design-system/note-cover.md` + `note-cover-tokens.json` 参照、`ogp-create` スキルと対 | ✅ 運用中（2026-05-29 起動） |
| `x-post-writer`                | X(旧Twitter)投稿 `tweets.md` を多資格（総監/1級土木/2級土木）横断で執筆。過去問/キーワード/テーマからネタ生成（切り口分割 angle-slice・**`experience` 型新設**）、280 weighted 以下・試験別ベースタグ・サイト誘導を遵守。**near-duplicate テンプレ/同一 URL 反復を避ける凍結回避（policy §11）も自己点検**。`social-post`/`create-x-card`/`publish-x` と連携 | Generator    | sonnet  | `docs/reference/x-post-policy.md` §5.1/§11 + **`docs/reference/content-angle-policy.md`** 参照、`x-post-qa` と対 | ✅ 運用中（2026-06-12 更新） |
| `x-post-qa`                    | X 投稿 `tweets.md` の **5 軸**ルーブリック品質評価（文字数 280 weighted・論点的確さ・タグ 1-3 個・導線/UTM・偽成功検証。angle-slice 型は体験軸の合格捏造・**軸2 で角度純度（主角度 1 つ・experience 断片）** もチェック）。**+ 凍結リスク（§11）を重大減点ゲート**（near-duplicate テンプレ/同一 URL 反復/機械的タグ固定）。`publish-x` の予約完了ログを信用せず予約キュー実査を採点 | Evaluator    | sonnet  | `docs/reference/x-post-policy.md` §11 + **`docs/reference/content-angle-policy.md`** 参照、`x-post-writer` と対 | ✅ 運用中（2026-06-12 更新） |
| `x-repost-curator`             | X 引用RP 候補（`candidates.json`）を安全ゲート（誤情報/炎上/宣伝/無関係/古さ）＋関連性で選別し、引用コメントを生成して `approved.json` を出力。**exam 多様性ゲート**: 1セット内で同 exam は1件まで・reposted-log 直近10件を確認して連続回避。完全自動運用ではコメントが無検閲で投稿されるため「迷ったら reject」既定 | Evaluator+Generator | sonnet  | `.claude/skills/social/x-repost/SKILL.md` 参照 | ✅ 運用中（2026-06-08 起動、2026-06-10 exam多様性ゲート追加） |
| `doc-sync-auditor`             | コード/スクリプト/スキル/設定の変更 diff と候補 doc を突合し、**意味的に陳腐化**した記述（prose・表・コマンド・パス・件数・閾値）を `file:line + 引用 + 矛盾根拠 + 修正案 + severity` で報告。**検出専用＝自動修正しない**。Bash 不可で親（`/doc-sync`）が grep/diff を抽出して渡す。`check-doc-refs`（壊れ参照）・`check-doc-coupling`（台帳もれ）が拾えない semantic staleness を担当 | Evaluator    | sonnet  | `.claude/skills/dev/doc-sync/SKILL.md` 参照、CLAUDE.md §8 | ✅ 運用中（2026-06-12 起動） |

### 退役したエージェント（2026-04-23 Phase A）

| エージェント | 役割 | 代替 |
|---|---|---|
| `aidesigner-frontend` | AIDesigner 連携の UI 生成 | 直接 Claude 指示 or AIDesigner MCP 直接 |
| `ui-visual-qa` | UI 視覚 Evaluator（`.tsx` 視覚回帰） | `/design-review --visual`（同機能を design-review スキルに統合） |
| `cem-advisor` | CEM 試験対策 Generator（placeholder） | Generator は `keyword-rewriter`、Evaluator は `cem-qa`、orchestration は `strategy-advisor` |

## Generator と Evaluator の分離原則

> Generator と Evaluator を分離する — 自己評価バイアスは構造で解決する

同じエージェントが作成も評価も担うと、自分の出力を「良い」と判断するバイアスが生じる。Evaluator エージェントは生成・修正には一切関与せず、**完成物の品質評価のみ**を行う。

### 分離例

- **PDF→MDX 変換**: `/pdf-to-mdx`（Generator スキル）→ `content-qa`（Evaluator エージェント）
- **キーワードページ**: `/keyword-page`（Generator スキル）→ `cem-qa`（Evaluator エージェント）
- **1級・2級土木 textbook/guide**: `/pdf-to-mdx --exam {civil-construction-1|civil-construction-2}`（Generator スキル）→ `civil-construction-qa`（Evaluator エージェント、category フィルタで両級対応）

### Evaluator エージェントの区別

| エージェント | 対象ファイル | 主な軸 | 起動タイミング |
|---|---|---|---|
| **content-qa** | `.mdx`（過去問・基準書） | 静的5軸（視覚検証なし） | PDF→MDX 変換後 |
| **cem-qa** | `.mdx`（総監キーワード `group: keyword` 全件 + 横断トレードオフガイド `management-tradeoffs` の §23 構造チェック） | 5管理体系・コンポーネント原則・参考資料・横断トレードオフ §23（核同士の対称関係・固有名詞混入） | キーワードページ執筆後 / `management-tradeoffs` 編集後 |
| **civil-construction-qa** | `.mdx`（1級土木 textbook/guide） | 視覚検証 + テキスト網羅率（3モード5軸） | 1級土木 MDX 生成後 |
| **civil-construction-review** | `.mdx`（1級土木 textbook/guide） | content-principles準拠＋モバイル視認性＋画像キャプション品質（PDF照合なし、5軸） | 既存 MDX の定期校正・編集後 |
| **metrics-analyzer** | `.claude/state/metrics/gsc/*.json`, `.claude/state/metrics/ga4/*.json` | 5パターン抽出（High-Impr-Low-CTR, Rank-Stuck, Traffic-Drop, Hidden-Winner, Orphan-Query） | `/weekly-improve` 実行時 |
| **performance-auditor** | `.claude/state/metrics/psi/*.json` | しきい値違反＋回帰検出（LCP/CLS/INP/TBT/TTFB/Scores）＋既知パターンマッピング | `/psi-audit` 実行時 / 日次 workflow 後 |
| **exam-keyword-mapping-auditor** | `.claude/state/exam-keyword-map.json` の anchor 1 件単位 | 紐づけ精度の 2 段階 semantic 評価（Stage 1=現紐づけのカバレッジ、Stage 2=候補発見）＋ 3 階層 confidence（auto_apply / needs_review / reject） | `/audit-exam-mapping audit-year` 実行時に各 anchor へ分配 |
| **note-fact-checker（スコープ D）** | note 記事本文の白書由来 数値・固有名 + `docs/textbook/白書等/*.pdf` | ローカル白書 PDF 原文との offline grep 照合（ハルシネーション検出。`whitepaper-grep-check.mjs` が空白・カンマ・全半角ゆれを正規化吸収、MISS を ⚠️要確認 で surface） | 白書連動 note 記事（クロストレードオフ・白書R7対応集・R8予想問題集・模範論文の白書事例）公開前 |
| **ig-carousel-qa** | `slide-data.json`（v2）+ 過去問パックは `carousel/img/*.png` | スライド構成・文の完結性・図文整合・字数視認性・試験的正確性（5軸）+ デザイン統一性（過去問パック、tokens.json 照合） | IG カルーセル設定ファイル執筆後 / restyle 後 |
| **civil-exam-figure-auditor** | `.local/r2/posts/civil-construction-1/primary-*/img/*.png` + 該当 MDX | クリップ純度・本文重複なし・alt 精度・MDX 結線（4軸、加重 ≥2.0 かつ全軸 ≥2 で合格） | `/civil-figure-rework` 実行時、Generator 直後 |
| **ig-reels-qa** | `reels/script.json` + `reels/caption.txt` + `reels/video.mp4` + 対応 `reels/img/*.png` | 尺・読み上げ完結性・キャプション/タグ品質・音声画面整合・保存導線（5軸）。「スワイプで」等カルーセル流用 CTA を重大減点 | IG Reels script.json 執筆後 / mp4 生成後 |
| **ig-stories-qa** | `stories/caption.txt` + `stories/note.md` + 対応 `stories/img/01-04.png` | コピー力・リンク導線整合・ステッカー双方向性（3軸）。テンプレ未差替・ステッカー誤配置を減点 | IG Stories caption.txt 執筆後 |
| **yt-shorts-publisher-qa** | `docs/sns/youtube/<date>-<pack-id>/shorts.mp4` + `meta.json` + `thumbnail.png` | 尺=**≤60秒ゲート**・UTM 整合・タイトル長/検索性・字幕整合（4軸）。IG 用 UTM 混入を重大減点、予約後 `videos.list` 実査 | YT Shorts 派生 mp4 生成後（`yt-shorts-create --from-reels` 完了後） |
| **ig-highlight-qa** | `highlights/NN_*/slide-data.json` + `img/*.png` | サムネ識別性・リードコピー力・ジャンル一貫性・余白配分／セーフエリア（4軸）。IG UI セーフエリア侵入・本文 y>=1280 侵入・06_materials の note 有料直リンクを重大減点。`ig-stories-qa`（過去問 4 枚連投）とは別文脈 | IG ハイライト slide-data.json 執筆後 / PNG 生成後 |
| **pe-secondary-exam-qa** | `docs/note/技術士建設部門/magazines/{magazine}/{year}/article.md`（論述式 模範解答） | 設問適合・論述構成/論点絞り込み・分かりやすさ/あいまい表現排除・発注者視点/専門性・note完成度（5軸）＋字数上限〔枚数×600字〕・note-lint・設問1対1・論述式文体ゲート。論述原則は `技術士論文の書き方`（非公開・原則抽出）由来 | 技術士二次 模範解答 article.md 生成後 |

**対象ファイル・軸・起動タイミングが全て異なる**ため、これらは統合しない（「対象ドメインの分離」原則）。

**PE ガイド記事（`group: guide`）の Evaluator は部分割当**: `cem-qa` は原則キーワードページ専用だが、**横断トレードオフガイド（`management-tradeoffs`）の §23 構造チェック**は cem-qa の追加スコープとして 2026-05-28 起動済み（核同士の対称関係宣言・固有名詞混入・SpecSheetList 個数・評価軸メタ解説）。他の `group: guide` 記事（戦略系 Type-1 / 俯瞰系 Type-2）は依然 lint-mdx-mobile.mjs カテゴリ 12 で構造違反を機械検知のみ。Phase 2 で `guide-qa` Evaluator 新設を検討（note CTA 整合性・サイト内回遊密度の 3 軸）。

**UI コンポーネント（`.tsx`）の視覚回帰**は `/design-review --visual` スキル（旧 `ui-visual-qa` エージェントを統合）で実施する。スキル層で完結するためサブエージェント化不要。

---

## チーム連携パターン（Phase 1）

| シナリオ | エージェント連携 |
|---|---|
| **Phase 1 開発フロー** | 1. PDF→MDX 変換 → 2. **content-qa**（品質評価） → 3. `/deploy`（本番反映） |
| 週次 PDCA（簡略版） | strategy-advisor（weekly-review → weekly-plan） |
| キーワードページ作成 | `/keyword-page`（Generator） → `cem-qa`（Evaluator）→ 不合格なら再修正 |
| キーワードページ品質サイクル | `/quality-cycle`（オーケストレータ） → `cem-qa`（評価） → `keyword-rewriter`（改訂） → 再評価 → 人間レビュー |
| 1級・2級土木 textbook 変換 | `/pdf-to-mdx --exam {civil-construction-1\|civil-construction-2}`（Generator） → `civil-construction-qa`（Evaluator） → `/improve-article --mode verify` |
| 2級土木 過去問変換 | `/exam-questions-import --exam {civil-primary-2\|civil-secondary-2}` --year r0X [--sub zenki\|kouki]（Generator） → `content-qa`（Evaluator） → `civil-secondary-exam-writer`（解答補完、Phase 1 対応予定） |
| 技術士第一次 過去問変換 | `/exam-questions-import --exam pe-first-stage` --year r0X --sub {basic\|aptitude\|construction}（Generator） → `content-qa`（Evaluator、`pe-first-stage` + `primary`） |
| 1級土木 textbook/guide 品質サイクル | `/civil-textbook-cycle`（オーケストレータ） → `civil-construction-review`（評価） → `civil-textbook-rewriter`（改訂） → 再評価 → 人間レビュー |
| UI コンポーネント変更 | 親エージェント（Generator） → `/design-review --visual`（視覚検証・スキル層で完結） → `/simplify` で修正 |

**注**: 月次企画・四半期レビュー・試験シーズン対策・広告最適化は Phase 2 で再開予定。

---

## 新規エージェント追加時の手順

1. `.claude/agents/{agent-name}.md` を作成
2. frontmatter に `name` / `description` / `model` を必ず指定
   - model 選択ルールは `.claude/skills/dev/create-skill/SKILL.md` の「サブエージェント作成時の model 指定ルール」または CLAUDE.md「ハーネス設計原則」§6 を参照
3. Generator か Evaluator かを明記（混在禁止）
4. 本文に「モデル方針」欄を設け、`model: sonnet/inherit` を選んだ理由を 1-2 文で記載
5. このファイル（agents-registry.md）の一覧表に行を追加
6. CLAUDE.md の「サブエージェント `model:` クイックリファレンス」表にも行を追加
7. 関連スキル（Generator 側）があれば `skills-registry.md` も更新
