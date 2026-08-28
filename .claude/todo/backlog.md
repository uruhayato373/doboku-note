# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。
> **完了したタスクはセクションごと削除する**（記録は git 履歴が持つ。完了サマリ・経緯 prose を本ファイルに書かない）。
> **タイトルが残作業と乖離したら TRIM でなく RESEED**（旧カード削除＋新 ID で再起票）。
> カード品質基準の詳細は `todo-standards.md`「5. 残す条件と削除条件」。

## 凡例

> カード構文・タグ語彙は **stats47 と共通の v3-unified スキーマ**
> （正典: `.claude/knowledge/reference/todo-standards.md`。拡張 token: `[期日:]` `[進行中]`・
> `### [ID] タイトル` の ID は任意）。

| 見出し | 意味 |
|---|---|
| ## 🔴 高 | 来月中に着手したい |
| ## 🟡 中 | 2〜3ヶ月以内 |
| ## 🟢 低 | 時期未定 |
| ## 🟣 判断待ち | **やるかどうかの意思決定が未了**（着手できないのではなく、着手すべきか決まっていない） |

> [!note] 🟣 は「ユーザー作業待ち」置き場ではない（2026-08-17 是正）
> 以前は 12 件中 7 件が「ユーザーの手作業待ち」で、判断は済んでいるのに 🟣 に沈殿していた。
> **待ち先が人であることを理由に 🟣 へ置かない**（ユーザーの手が要ることは本文に書く）。tier は緊急度だけを表す。

各タスクは `### タスク名` の直下に `タグ:` 行を置く（運営管理画面 TODO タブと `backlog-sweep-pick` が機械読取り）:

```
タグ: [カテゴリ] [種類:X] [Codex候補] [検証:cmd] [起票:YYYY-MM-DD]
```

| token | 意味 |
|---|---|
| 第1トークン | カテゴリ（コンテンツ品質 / UI・UX / 収益化 / エージェント・SSOT / SNS・マーケ / インフラ・計測） |
| **`[種類:X]`** | X = `不具合` / `改善` / `意思決定` / `制作` / `定期`。tier（緊急度）・カテゴリ（ドメイン）とは**直交する軸** |
| `[Codex候補]` | バルク処理向き（任意） |
| `[検証:cmd]` | 完了を判定できる npm script（任意。あると sweep が自動検証できる）。**下の「[検証:] を付けない判断」を先に読む** |
| `[起票:date]` | 鮮度測定用。**新規カードは必須**（`check-backlog-schema --staged` が止める）。既存の欠落分は返済を強制しない |

**種類の決定規則**（上から順に、最初に当たったものを採る）:

1. 期日で反復発火するか（毎週・毎月・四半期）→ `定期`。**これが付いたら backlog に置くべきでない合図**（backlog は「いつかやる」のマスタ。反復は monthly/weekly か `check-*-due` の担当）
2. 成果物が「決めたこと」そのもので、決まるまで着手できないか → `意思決定`。**このとき tier は 🟣**（🟣 の定義と一致する）
3. 約束・仕様に対して現状が壊れている／欠けているか → `不具合`
4. 新しい成果物（記事・図・書籍・投稿・商品）が増えるか → `制作`
5. それ以外（動いているものをより良くする）→ `改善`

境界の実例: 「薄層377本の散文増補」は既存成果物の質を上げるので `改善`／「BK-09/10 R08予想問題集の生成」は新しい成果物が増えるので `制作`。

選定順序は `node scripts/backlog-sweep-pick.mjs` が出す（**不具合を第1キー・tier を第2キー**・🟣 と `[進行中]` は自動選定しない）。tier がもはや不具合の緊急度を表していない（🟢 に沈む）ため、壊れているものを先に出す。**単独で回せるか（ユーザーの手・対話が要るか）は選定側が本文を読んで判断する**——旧 `[実行:]` 軸は 2026-08-26 に廃止した（起票時の判断をタグに凍結すると陳腐化し、モデルが本文から再導出できるため。doboku / stats47 両方）。

**`[検証:]` を付けない判断**（2026-08-25 に実測して確定・DN-0129 の結論）:

`[検証:]` は「そのカードが片付いたら**赤から緑へ変わる**」npm script にだけ付ける。**空欄のままが正しいカードは多い**——付けようとして 2 度失敗している:

- 2026-08-25 ①: `[検証:]` を持つ 11 枚のうち **5 枚が常時緑**だった（`check-note-paid-cta` / `audit-note-funnel` / `check-career-separation` / `check-doc-refs` / `quality-census`）。いずれも「報告するだけの surfacer」か「別軸の検査」で、完了判定に使えないので token を外した
- 同 ②: 空欄の sweep カードへ付けようと候補 5 本（`check-content-quality` / `check-image-assets` / `check-competitor-scan-due` / `check-script-imports` / `check-note-structure`）を実走したところ**全部 exit 0**。**baseline ラチェット型**（既存違反を台帳に載せて新規だけ落とす）なので、既存債務を返しても緑のままで数字が動かない。付ければ ① で外したのと同じ常時緑が復活する

したがって:

- **新しいゲートを「空欄を埋めるため」に作らない**。別作業が終わるまで構造的に赤いゲートは偽赤で、緑と同じくらい信号を殺す
- **`制作` と `意思決定` には原則付かない**。前者は「成果物が在ること」、後者は「決まったこと」で完了するので、指せる script が存在しない
- 陳腐化の本来の受け皿は `[検証:]` ではなく**定期棚卸し**（`check-backlog-due` → `/backlog-sweep --audit`）。`check-backlog-health` の S7（検証ゲート欠落）は 0 にする対象ではなく、読むための数

---

## 🔴 高 — 来月中に着手



### [DN-0117] コンクリート系2冊の Kindle 提出待ち（図の出所は解消済み・KDP提出のみ残）
タグ: [収益化] [種類:制作] [起票:2026-08-22]

g-01（コンクリート診断士 ¥990）・g-02（コンクリート主任技士 ¥1,250）を KDP へ提出する。
図の出所問題は全 10 点解消済み（concrete-diagnostician 8 点＝AI 生成画像と本文コメントで確認済み・
concrete-chief-engineer 2 点＝自作 SVG へ描き直し済み、2026-08-26）。EPUB は再ビルド済み
（`build-pe1-kindle.mjs`・epubcheck エラー 0・U+FFFD 0 件、2026-08-26）。
状態の真実源は `scripts/kindle-published/catalog.json`（現在 `status: "ready"`）。
手順は `/kdp-publish`。**完了条件**: catalog.json の status が `in_review` 以降へ進む
（提出はユーザー承認・KDP ログイン操作が要る）。






### [DN-0014] 読み方ガイド 横展開（建設部門＋土木）
タグ: [収益化] [種類:制作]

総監の3点セット（完全パック＋R8予想＋読み方ガイド）が sales-log で売上TOP3独占を実証。「科目非依存の読み方ガイドのみが横断で成立」（2026-06-23。建設部門は選択科目制ゆえ横断R8予想・横断完全パックは作らない）。

**②土木側は完結（2026-08-26）**: 1級=全2巻（`civil-1-reading-guide`）・2級=全1巻（`civil-2-reading-guide`・約5,000字・93タグ）とも `note-magazines.ts` に `published: false` で登録済み。note公開・価格はユーザー判断待ち。

**残る①建設部門のみ**: 11専門分野の技術事実を扱うため WebSearch によるファクトチェックが必須
（`pe-secondary-exam-factcheck` エージェント相当の裏取りをしてから着手する）。
論文対策キーワード6テーマ＋論文の書き方の組成。成果物は content＋published:false まで。


### [DN-0135] ユーザー手作業でしか閉じない残務（外部依存 11 件を統合）
タグ: [収益化] [種類:不具合] [起票:2026-08-25]

2026-08-25 に `[種類:不具合]` 26 枚を実体照合したとき、**この環境からは 1 手も進められない**ものを 1 枚へ畳んだ（個別カードは削除・詳細は git 履歴）。畳む前に各件の実体を読み直して状態を書き直してある——カードの自己申告で完了と決めない。

weekly.md の手動キューはこの ID だけを参照する（weekly は ID 参照ビューで、本文を複製しない仕様）。

| # | 残務 | 実体（2026-08-25 照合） | 律速 |
|---|---|---|---|
| 1 | Issue #473 のクローズ | 無料プレビュー下限の食い違いは解消し `note-live-audit.yml` は green 実測済み（run 32797779154）。診断コメントも投稿済み | automation-failure のクローズは**復旧実体を確認した人間**の担当（CLAUDE.md §8） |
| 3 | Kindle `e-02` の差し替え | **2026-08-27 実測で前提が変わった**: `in_review` ではなく既に**LIVE（ASIN B0H3GX3HNW・販売中）**。ローカルEPUB（2026-08-12修復・章名article.mdx漏れ解消）はepubcheck 0件・check-kindle-epub-leak PASS済みだが、KDPへの差し替えは未実施＝**ライブで販売中の内容が欠陥版のままの可能性**。`kdp-publish.mjs` に「LIVE本のマニュスクリプト更新」モードが無く、`--dump --page content` の `title-setup/kindle/<asin>/content` は既刊では404（下書き専用パス）。正しいKDP編集導線（本棚→編集→コンテンツ更新）の特定から必要 | KDP 実機。顧客影響がある可能性が高いため優先度を上げて確認すべき |
| 6 | コンクリート系 `cta-bg` 2 枚 | **実測: `public/images/cta-bg/` は 5 枚（civil-1 / civil-2 / note-hero / pe-comprehensive / pe-construction）で、主任技士・診断士が欠落**。生成スクリプトは無く手描きイラスト | 画像制作。無いあいだはテーマ色のベタ塗りへフォールバックする（実害は見栄えのみ） |
| 8 | civil-1 一次過去問 公式キー 24 件 | 残＝`h28-a`(19)・`h29-a`(1=No.38)・`h29-b`(4=No.3/12/17/21)。h28-a は 19 件と突出＝official 配列自体の OCR 誤りを疑い、mass-fix 前に第2ソースで再検証 | pre-H30 原典 PDF の入手（touhokugiken.com / dobokujira.com に h29 学科A/B は無し）。**LLM 推測厳禁**・キー番号だけの書き換え禁止 |
| 9 | 過去問 解説・図の要照合クラスタ | 解説＝civil-1 `secondary-construction-plan-past-problems` No.9(1) 記述省略／civil-2 `secondary-r06` 問8 画像未挿入／総監 h21・h22・h28・h30 の 7 問／pe-first-stage 3 問。図＝`rescan-need-source` 9 図 ＋ `r07-a-fig-02`（画素欠損で再クロップ不可・DN-0056 から合流） | 原典照合・外部原典の入手。台帳に理由記録済（真実源 `figure-provenance.md`・進捗ビューは admin 記事図版タブ） |
| 10 | ココナラ C12 プレミアム週枠の再判断（旧DN-0007） | C12（教材18冊＋添削2テーマ・¥15,000）は`weeklyCapacity: 1`で開始。添削は本番顧客への納品実績が無く（S2レビュー0）、初回工数が読めないための暫定値 | 初受注時に`orders-log`の`tensakuMinutes`を実測記録。2〜3件出たら週枠を再判断（判断基準→[ココナラ展開キット.md §5](../../content/note/1級・2級土木/ココナラ展開キット.md)）。実受注が無いと1手も進まない |
| 11 | Gmail転送＋フィルタ設定（旧DN-0017・別PC作業） | ココナラの運営通知は`dobokunotecom@gmail.com`にしか届かずMCPから見えない。ラベル`dobokunotecom`は作成済み、`create_filter`はセッションに未公開のためフィルタ作成は人の作業 | 手順1: `uruhayato373`側でフィルタ作成（To=dobokunotecom・受信トレイスキップ＋ラベル付与）→手順2: `dobokunotecom`側で転送先追加・確認コード承認・転送有効化。完了条件は`label:dobokunotecom`で1件以上ヒット |
| 12 | KDP Select 自動更新オフ A-00〜A-06（旧DN-0089） | note 択一PDF（`n155093f42183`・¥1,980・公開済み）との抵触リスクを安全側に倒すと判断（2026-08-27）。e-02 は Select 非加入方針・A 系列は収録範囲違い（422問論点別 vs 1162問全年度）だが部分集合の可能性が否定できない | KDP 管理画面で A-00〜A-06 の「KDPセレクトへの自動登録」をオフ。**期限=独占明け 2026-10-06 より前（10月上旬）**。10/6 を過ぎて自動更新されなければ制約自体が消滅 |

**完了条件**: 各行の実体が解消したら行ごと消す。全行が消えたらカードを削除する。**部分的に片付いたら行を消して残数を書き直す**（「残 N 件」を本文に持たない＝表の行数が真実源）。

## 🟡 中 — 2〜3ヶ月以内

### [DN-0120] 転職アフィリの成果が 3 ヶ月ゼロ — 継続するか、面を畳んで別収益に寄せるか
タグ: [収益化] [種類:意思決定] [起票:2026-08-24] [期日:2026-09-16]

2026-08-27 判断: **(1) 現状維持で観測を続ける**を採択（面はこのまま・撤去も縮小もしない）。
配置の優劣は現標本（28日 11,106imp / 13click）では判定不能、有意に劣る唯一の面
（DXConsulting-sidebar）はピクセル発火源のため撤去不可と確認済み（詳細分析は git 履歴）。

次: 2026-08 の A8 実績が確定する 9 月中旬に `npm run a8-ui:fetch`（ローカルログイン＋CAPTCHA 要）で
取り込み、(1)継続 / (2)露出を絞る / (3)撤退して自社商品（note・ココナラ・Brain）導線へ、を再判定する。
実績 2026-05〜07 累計: クリック140・成果発生1・確定 ¥0（`.claude/state/metrics/affiliate/a8-results.json`）。


### [DN-0142] reference-materials 再公開5記事のGSC効果を計測する
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-26] [期日:2026-09-09]

旧DN-0074の残作業③。2026-08-26に精度向上のうえ再公開した5記事
（reference-materials-hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02）
について、再公開14日後（2026-09-09以降）にGSCでインデックス状況とimpressions/clicksのdeltaを計測し、
再実験化（EXP系起票）するかを判断する。EXP-002はcancelled（2026-06-27）なので新規起票になる。

### [DN-0141] GSC実験候補1件を/nsm-experimentへ起票するか判断する（旧DN-0106の残作業）
タグ: [インフラ・計測] [種類:意思決定] [起票:2026-08-26]

旧DN-0106（GSC検索流入停滞の原因分離）のPhase 1（データ全件化）・Phase 2（RCA）は2026-08-26完了。
結論は**季節性が支配的**（clicks減-201の82%が総監・建設部門の試験後需要減。技術エラー0件）。
詳細: `.claude/state/improvements/2026-08-26-gsc-access-rca.md`・判断ログ: `gsc-management.md`末尾。

**残る判断**: Phase 3実験候補は1件のみ——`civil-1-textbook-network-schedule` の
「インターフェアリングフロートとは」クエリ（278impr / position 9.17 / clicks 0。
8/4見送り済みの主クエリとは別物と確認済み）。これを `/nsm-experiment` で起票して
seoTitle変更を実験化するかをユーザーと決める。**推測でtitle/descriptionを一括変更しない**。
次回の月次 URL Inspection（`search-growth:cem-plan`・[gsc-management.md](../knowledge/reference/gsc-management.md)「総監 CNI 5分類の運用ルール」）と合流して判断するのが自然。

### [DN-0139] LINE公式アカウントを開設し一次二次ブリッジ磁石の配信を始める
タグ: [収益化] [種類:制作] [起票:2026-08-26]

1級土木 二次10/4に向けたリード獲得施策「一次→二次ブリッジ磁石」。中身（磁石記事・LINE配信台本3通・友だち追加CTA文言）は完成し、磁石記事はnote無料記事として公開済み（https://note.com/dobokunote/n/na31c6abae8f6）。

残るのは以下の「器」＝ユーザー作業のみ（LINE公式アカウントの開設を伴うためエージェントでは実行不可）:

1. LINE公式アカウントの開設（ノーコード）
2. `delivery-script.md` の内容を管理画面へ転記（あいさつ1通＋ステップ配信2通）
3. `friend-add-cta.md` の `[LINE公式のURL]` プレースホルダーを実URLへ差し替えてX・note・サイトの各面に配置

詳細: [content/note/1級・2級土木/一次二次ブリッジ磁石-LINE/README.md](../../content/note/1級・2級土木/一次二次ブリッジ磁石-LINE/README.md)



### [DN-0110] 動画パック基盤・通常動画pilot・read-only管理画面
タグ: [SNS・マーケ] [種類:改善] [Codex候補] [検証:quality:audit:ci] [起票:2026-08-21]

サイト・note・既存図版をYouTube通常動画へ再編集し、関連Shorts・Instagram・Xへ派生するストックコンテンツ基盤を作る。現状はShorts台帳200本（公開13・pending187）がある一方、通常動画への接続、クリック可能な外部導線、動画パック単位の品質・公開・成果管理がない。追加量産より先に、動画マスターと回遊・計測を成立させる。

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

**批判的レビュー**: [動画コンテンツ運用設計_批判的レビュー.md](../../docs/reviews/critical/動画コンテンツ運用設計_批判的レビュー.md)

**依存関係**: 左ナビのコンテンツ中心IAとYouTube入口は`DN-0103`を再利用し、本カードで別のナビregistryを作らない。`DN-0046`の聞き流し一問一答は本カードへ統合済み。

**IG リール残（旧 DN-0136 から合流・2026-08-27）**: cem 42 パックは `reels/script.txt`（ナレーション原稿）のみで **mp4/wav は未生成**（`verify-ig-status.mjs:88` が script.txt の存在だけで「素材あり」判定するため、旧カードの「素材完成済み・投稿するだけ」は誤り）。別途 97 パックは原稿から。生成には VOICEVOX + ffmpeg が要る。カルーセル既投稿パックのリール派生は、本カードの動画基盤が成立してから判断する。

**確定方針**:
- 資格別・媒体別agentは増やさず、`video-script-writer`（Generator）と`video-content-qa`（Evaluator）の1組だけを新設する
- 既存`yt-shorts-title-writer`／`yt-shorts-publisher-qa`はShorts固有責務に限定して残す
- `content/sns/video-packs/{exam}/{slug}/`を制作SSOT、`.claude/state/video-content-status.json`を可変状態、mp4/wav等をR2とする
- adminは`/content/video`で企画・QA・派生・公開・計測をjoinするread-onlyビュー。編集・投稿・shell・secret・ライブAPIを持たせない
- Shortsは関連通常動画へ送り、通常動画のクリック可能な概要欄からサイト/note/ココナラへ送客する。1動画1主CTA
- 契約の機械可読SSOT＝`.claude/config/video-content.json`、ゲート＝`npm run check-video-content`（quality:audit ci登録済み・fixture＝`tests/fixtures/video-content/`）。schema/状態/UTM を変えるときは config・policy・fixture・checker を同一 commit で同期

**Phase 1 残 — pilot 4本の音声/mp4と派生**: pilot 4パック（koji-gaiyo-7items／anzen-ippanron-3riyu／gokanri-tradeoff／monbun-yomikata）は制作・機械ゲート・独立QA（6軸 avg2.67-2.83・BLOCK 0）まで完了し state=qa_passed。残り＝(1) VOICEVOX+ffmpeg のある環境（Mac/Actions）で `npm run render-longform` を完走させ mp4/wav を生成→R2退避、(2) QA横断指摘の反映＝出典記事の既存SVG図版（figure-tradeoff-frequency-matrix 等）を scene visual に埋め込める renderer 拡張（現状 text-list のみで軸4が全パック2点）、(3) 各通常動画から Shorts 2本・IG 1組・X 1スレッドを派生、(4) ユーザー承認（approved は user のみ）→公開→実URL・videoId・関連動画・CTA 再照合。

**Phase 2 — skill/agents**: 薄い`/video-content` skillと上記2agentを新設。生成→機械ゲート→独立QA→承認待ちで停止し、レンダリング・R2・投稿は既存CLI/workflowへ委譲する。skills/agents registry、coupling gate、責務境界テストを同時更新。

**Phase 3 — admin/CI**: `/content/video`、SNS状態、動画成果ビューを追加。manifest＋runtime state＋CI供給snapshotをjoinし、未取得/期限切れ/ドリフトを明示。YouTube AnalyticsとGA4 UTMはCIで取得し、会社PCからライブAPIを叩かない。

**Phase 4 — 段階拡張**: 6週間のpilotでShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移を評価。送客シグナルが無ければ自動化拡張を停止。成立後だけ他資格とThreads会話briefへ広げる。ThreadsのX単純クロスポスト、全記事一括動画化、全資格同時展開は禁止。

**完了条件**: 4packのmanifest/script/storyboard/QA/派生/statusが一意にjoinされ、全機械・意味ゲートとadmin型検査/E2EがPASSする。4本の通常動画と関連Shortsを外部実体で照合し、6週間後の継続/修正/停止判断日とbaselineを記録する。公開・push・deploy・外部設定変更は対象と影響を提示してユーザー承認を得るまで実行しない。

### [DN-0112] NotebookLMコンテキスト圧縮ゲートウェイでClaude/Codexトークンを削減
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-08-21]

大量の白書・標準テキスト・過去問をClaude/Codexへ直接読み込ませず、NotebookLMを検索・根拠抽出層として使い、制作エージェントには短い根拠パックだけを渡す。MCPを追加すること自体はトークン削減にならず、取得回答をそのまま会話へ流すと逆に増えるため、**ルーティング・出力上限・キャッシュ・引用検査・効果計測**を先に実装する。

**現状**:

- `.mcp.json`にNotebookLM MCPはなく、現行経路は`.claude/scripts/notebooklm-cross-query.mjs`と`notebooklm-batch-ask.mjs`からNotebookLM CLIを呼ぶ方式
- `cross-query`は指定した全notebookへ同じ質問を逐次送信し、各回答全文を連結する。notebookを増やすほど受信コンテキストも増える
- 総監標準テキスト、一次過去問、記述式模範解答、白書notebookは構築済みだが、質問結果の再利用、最大文字数、共通schema、source更新時のcache失効、作業別routingがない
- Windows会社PCは`~/bin/notebooklm.bat`経由でproxyを通す必要があり、認証切れは人による`notebooklm login`が必要。CIへ認証profileを持ち込まない

**目標フロー**:

```text
作業種別＋対象slug
  → 1冊を原則とするnotebook routing
  → 最大1回の構造化質問
  → citation付きevidence pack（800〜1,500字）
  → cache
  → Sonnet/Codexは記事＋evidence packだけを読む
  → 根拠不足時だけ追加質問／人の確認
```

**Phase 0 — 現状計測とMCP要否の切り分け**:

1. キーワード記事、白書数値照合、過去問論点、論文骨子、図解設計を各4件、計20件の固定fixtureにする
2. 現行方式の質問回数、対象notebook数、NotebookLM返答文字数、エージェントへ渡した文字数、所要時間、引用取得率、最終QA結果をbaselineとして記録する
3. 「CLI経由でも達成できる機能」と「MCPでなければ困る機能」を分ける。接続方式は利便性、トークン削減は返却コンテキスト制御の問題として混同しない
4. 個人版NotebookLMの非公式連携を増やす前に既存wrapperを利用する。Gemini Notebook Enterprise API／将来の公式MCPは、料金・ライセンス・認証・個人版notebook互換を確認できた場合だけ候補にする

**Phase 1 — routingとevidence pack契約**:

1. `.claude/config/notebooklm-routing.json`に作業種別→既定notebook、fallback、最大質問数、必須引用数、cache TTLを定義する。通常は1冊、複数notebook横断は明示opt-inにする
2. `scripts/notebooklm-context-pack.mjs`を追加し、`taskType`、`target`、`questionTemplateVersion`、`notebook`を受ける薄い入口にする。既存cross-query／batch-askを内部利用し、別の認証実装を作らない
3. 出力を`conclusion`最大3件、`evidence`最大3件、`examPoints`最大3件、`unknowns`、`sourceTitles`、`citations`へ固定する。通常800〜1,500字、引用本文は必要最小限、長文回答を禁止する
4. 定義・背景・事例・試験論点を別々に連打せず、1回の構造化質問へまとめる。引用不足・unknownsありの場合だけ追加質問を1回許可する

**Phase 2 — cacheと生回答の隔離**:

1. cache keyを`notebook ID + source inventory hash + question template version + normalized question`のSHA-256とする
2. 生回答とdebug JSONは`.tmp/notebooklm/raw/`へ保存してGit非追跡とし、制作エージェントは原則読まない。エージェントへ渡すのは検証済み`context-pack.json`だけにする
3. 標準テキスト等の静的sourceは長いTTL、白書・年度更新資料は短いTTLとする。source追加・rename・status変更時はinventory hashを更新してcacheを失効させる
4. cache hit／miss、質問数、返答文字数、pack文字数、圧縮率、引用数、追加質問理由を`.claude/state/notebooklm/metrics.json`へ記録する。質問文・回答本文・認証情報はmetricsへ保存しない

**Phase 3 — 機械ゲートと偽PASS防止**:

1. JSON schema、最大文字数、最大件数、notebook解決、source status、citation存在、空回答、重複evidenceを検査する`check-notebooklm-context-pack`を追加する
2. 白書数値・固有名・制度名を使う作業はcitation 0件をFAIL、概念構造の補助はWARNなど、taskType別に厳しさを変える
3. NotebookLM回答は一次資料そのものではないため、引用先が質問対象sourceに存在することを確認できない主張を本文へ自動反映しない。`unknowns`を空欄で握り潰さない
4. 認証切れ、proxy 503、rate limit、notebook不存在、source processing中、回答0件を成功扱いしない。認証切れはexit 2で停止して手動loginを案内する

**Phase 4 — 既存skill／agentへ段階配線**:

1. パイロットは`notebooklm-research`と`note-fact-checker`の2経路だけに配線し、直接`cross-query`を呼ぶ箇所をcontext pack経由へ置換する
2. 効果確認後、`improve-article`、`visual-research`、`quality-cycle`、`audit-exam-mapping`へ広げる。各skillにraw回答をReadしない契約とtaskTypeを明記する
3. Generatorはpackから要約・再構成し、Evaluatorはclaimとcitationの対応だけを見る。NotebookLM回答をそのまま記事へ貼らず、同じエージェントに生成と根拠判定を兼務させない
4. agents／skills registry、doc coupling、CLI gotchas、作業別routing表を同期する。資格別NotebookLM agentを量産せず、共通gatewayを1つだけ持つ

**Phase 5 — 効果判定**:

1. Phase 0と同じ20件で、エージェントへ渡すNotebookLM由来文字数を現行比60%以上削減する
2. 質問回数、所要時間、認証／rate失敗率、引用取得率を比較し、最終QAのBLOCK件数、事実誤り、内容網羅性を悪化させない
3. cache再実行ではNotebookLM問い合わせ0、同一pack再利用、source更新後は確実にcache missとなることをテストする
4. 60%削減または品質同等を満たさなければ展開を止め、routing／schemaを修正する。MCP導入はこの結果でCLIが律速と確認された場合だけ別途判断する

**使う作業／使わない作業**:

- 使う: 白書・標準テキスト・過去問の横断検索、数値／制度の引用確認、論文根拠、図解・動画台本の概念構造抽出
- 使わない: Git差分、コード構造、テスト失敗、ファイル配置、現在値のWeb調査。これらは`rg`、ローカル検査、公式Web一次情報を優先する

**停止条件・禁止事項**:

- NotebookLM／GoogleのCookie、OAuth state、認証profileをGit、`.env`、GitHub Secrets、CI artifactへ保存しない。CIから個人NotebookLMへログインしない
- sourceに投入する権利が不明なPDF、顧客情報、非公開注文原稿を追加しない。既存sourceの削除・共有設定変更はユーザー承認前に行わない
- citation 0、回答不能、認証切れをAIの一般知識で補完して「NotebookLM照合済み」と記録しない
- 複数notebookへの並列連打をしない。既存`notebooklm-batch-ask`の逐次・間隔・有限retry契約を維持する

**完了条件**:

- 固定20件でNotebookLM由来の受信コンテキスト60%以上削減、QA非劣化、引用必須taskのcitation取得率100%
- context pack schema、routing、cache失効、偽PASS、認証切れ、Windows全角引数、proxy経路のテストがPASS
- `notebooklm-research`と`note-fact-checker`がraw回答を直接読まず、cache hit時は外部問い合わせ0で同じ根拠パックを返す
- 恒久ルールと計測結果を`notebooklm-cli-gotchas.md`または専用referenceへ抽出し、MCPを「採用／見送り／再検討条件付き」のいずれかに決定して本カードを削除する

**Claude Code実行プロンプト**:

```text
DN-0112をPhase 0から1 Phaseずつ実行してください。最初にAGENTS.md、
.claude/todo/backlog.mdのDN-0112、.mcp.json、
.claude/scripts/notebooklm-cross-query.mjs、notebooklm-batch-ask.mjs、
notebooklm-notebook-builder.mjs、notebooklm-cli-gotchas.md、
notebooklm-research／improve-article／visual-researchの各SKILL.md、
note-fact-checker.mdを全文読んでください。

開始前にbranch、originとの差、dirty filesを確認し、他セッションの変更を上書き・revertしないでください。
Phase 0ではコードを変える前に固定20件のbaselineを取り、NotebookLM返答全文の文字数と、
実際にエージェントへ渡した文字数を分けて計測してください。

MCP追加を先に行わず、既存CLI wrapperを再利用してrouting、1,500字以下のevidence pack、
cache、citation gateを実装してください。raw回答は.tmpへ隔離し、制作エージェントに読ませないでください。
個人NotebookLM認証をCIへ移さず、認証切れは手動login待ちで停止してください。

各Phase終了時に変更ファイル、質問数、返答文字数、pack文字数、圧縮率、引用取得率、
QA差分、失敗ケースを報告して停止してください。既存20件で60%以上削減かつ品質同等が確認できるまで
既存skill全体へ展開しないでください。source追加・削除・共有変更、MCP／Enterprise契約、外部設定変更は
影響と費用を提示してユーザー承認を得るまで実行しないでください。
```

### [DN-0113] Claude/Codexのモデル分業・コンテキスト予算でトークン消費を削減
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-08-21]

親モデルへ全作業を集中させず、**高判断作業は Opus / GPT-5.6 Sol、定型実装・意味監査は Sonnet / GPT-5.6 Terra、機械寄りの大量処理は GPT-5.6 Luna または決定的スクリプト**へ分ける。同時に、サブエージェントへ会話履歴・巨大ログ・無関係な参照を重複投入しないコンテキスト契約を作り、品質を落とさず高性能モデル使用量と総トークンを削減する。

**DN-0112との境界**: `DN-0112` はNotebookLMの長い資料を短い evidence pack に圧縮する「外部知識入力」の改善。本カードは、コード・記事・監査を含む全作業の**モデル選択、spawn条件、親子間コンテキスト、返却量、効果計測**を扱う。NotebookLM、MCP、資料検索機能は本カードで新設しない。

**起票時の実査結果（再調査不要）**:

- `.claude/agents/*.md` は80体中77体が `model: sonnet`、`inherit` は `strategy-advisor`、`guide-qa`、`civil-construction-review` の3体。Claude Code側の「Opusで考え、Sonnetで実行」はすでに大半へ配線済み
- `CLAUDE.md` / `AGENTS.md` §5 はサブエージェントSonnet既定、同時3体まで、小作業を委任しない、検証目的だけのspawnを禁止している。この原則は維持する
- `.Codex/agents/*.toml` の本文にある ``model: sonnet`` は説明文で、Codex実行時のモデル指定ではない。Codexのspawnでoverrideしなければ親モデルを継承し、期待した節約が成立しない
- 並列化は待ち時間を短くするが、親と複数workerが同じ会話履歴・AGENTS・ログ・対象ファイルを読むと**総トークンは増える**。評価対象は「親モデル使用量」だけでなく、親子合計、retry、品質、所要時間とする
- OpenAI公式の現行モデル区分は `gpt-5.6-sol`＝最高性能、`gpt-5.6-terra`＝性能とコストの均衡、`gpt-5.6-luna`＝高頻度・大量処理向け。モデル名は直接各skillへ散在させず、provider別routing SSOTから解決する

**目標ルーティング**:

| 作業 | Claude Code | Codex | 例 |
|---|---|---|---|
| 親の計画・競合解決・最終統合・高リスク判断 | Opus / `inherit` | GPT-5.6 Sol | 設計変更、複数案の採否、外部write前判断 |
| 境界の明確な実装・定型Generator・意味Evaluator | Sonnet | GPT-5.6 Terra | MDX校正、UI実装、ルーブリック採点、URL分類 |
| 低判断の大量処理・抽出・分類 | pilot合格時のみ軽量モデル候補 | GPT-5.6 Luna | ファイル棚卸し、ログ要約、schema分類、候補列挙 |
| 終了条件がコードで決まる処理 | LLMを使わない | LLMを使わない | grep、件数、hash、schema、lint、status code |

Sonnet/Terra/Lunaへの変更は、名前だけで一括置換しない。専門事実、曖昧な要件、広い設計判断、不可逆操作の対象選択は親へ残す。軽量モデルが失敗して親が全文を読み直す経路は二重消費なので、pilotでretry率まで比較する。

**Phase 0 — 使用量baselineと代表fixture**:

1. 代表作業を最低12件固定する。内訳は、CI失敗診断、単一バグ修正、複数ファイル実装、MDX校正、定型QA、GSC分類、doc-sync、TODO整理を含める。同じ入力・同じ合格条件を再利用可能にする
2. 取得可能なusage metadataから、親/worker別のinput・cached input・output・reasoning tokens、tool call数、spawn数、retry数、所要時間、gate PASS/FAILを記録する。製品が正確なtoken数を返さない場合は、入力文字数・読んだファイル数・出力文字数をproxyとして明記し、推測値を正確なtokenとして扱わない
3. 現行の「親単独」「既定spawn」をbaselineにする。実装後は「provider別routing」「最小context」の2段階を別々に比較し、何が効いたかを混ぜない
4. 計測ログに会話本文、顧客情報、認証情報、長いモデル出力を保存しない。task class、model tier、数値、結果、fixture IDだけを保持する

**Phase 1 — provider非依存のrouting SSOT**:

1. 既存config配置規則を確認し、`flagship / balanced / fast / deterministic` の論理tier、Claude/Codexの実モデル、許可するtask class、既定reasoning、fallback、親へのescalation条件を1つのJSONへ定義する
2. Claude側は既存77体のSonnet指定を基線として保持し、3つの`inherit`を「親判断が本当に必要か」fixtureで再確認する。Opus固定の新規agentは原則作らない
3. Codex側はAgent TOML本文のSonnet表記を実行指定と誤認しないようprovider別説明へ直す。spawnするskill/orchestratorはrouting SSOTを参照し、境界の明確なtaskで `gpt-5.6-terra` / `gpt-5.6-luna` を明示する。対応モデルが利用不能なら黙って別provider名を使わず、`balanced`から親継承へfail-safeする
4. 全agentに固定モデルを埋め込まず、role既定＋例外allowlistにする。例外には理由、fixture、再評価日を必須とする
5. `check-agent-model-routing`を追加し、未登録agent、不明tier、provider不一致、理由のないflagship/inherit、退役model、skill内へのモデル名散在を検出する。対象0件・config parse失敗をPASSにしない

**Phase 2 — spawnとコンテキストの予算契約**:

1. spawn条件を「独立している」「親が並行して別作業を進められる」「数回のtool callでは終わらない」「明確な成果物または判定がある」の4条件へ固定する。満たさない小作業と、親の作業を再確認するだけのworkerは禁止する
2. workerへ渡す入力を `objective / owned files / evidence / constraints / acceptance / output schema` に固定する。会話全文、未整理ログ、repo全体の説明を貼らない。必要な参照はパスと読む理由を指定する
3. Codexの境界明確なworkerは原則 `fork_turns: none` または必要な直近turnだけを使う。full-history forkは、過去の判断そのものが成果物要件である場合だけ理由付きで許可する
4. Claudeの`context: fork`は明確な実行タスクだけに使い、ガイドを読むだけ・確認だけのforkを禁止する。子が再度同じ大規模referenceを読む場合は、親が要約を複製せず必要節へ直接routeする
5. 初期contextのファイル数・文字数、worker返却文字数、同じファイルを読んだagent数を計測する。上限値はPhase 0の分布から決め、超過時は警告＋理由を記録する。根拠なしの一律文字数制限は作らない
6. 返却は原則 `outcome / changed filesまたはfile:line / validation / unresolved` のみ。全文転載、長い実況、親が再度要約する前提の重複説明を禁止する

**Phase 3 — skillとagentのコンテキスト縮小**:

1. `AGENTS.md` / `CLAUDE.md`、agent definition、`SKILL.md`、reference間の同一指示重複を機械抽出し、真実源への参照で済む箇所を特定する。安全弁・受入条件・製品固有のルールは削らない
2. skillは選択した`SKILL.md`を完全に読む前提を維持しつつ、無関係なreferenceを列挙して一括読込させない。用途別routingを明示し、1タスクで読むreferenceを必要最小限にする
3. 長いログは親が保存して、workerへは失敗step、error、前後行、再現コマンドだけを渡す。画像・PDF・CSVも対象ページ/行/列へ絞る
4. ルーティング、retry、status code、件数、hash、重複、schemaなど決定論で処理できる部分をscriptへ移す。LLMはscriptがsurfaceした候補の意味判断だけを担当する
5. Generator/Evaluator分離は商品品質の自己評価バイアス対策として維持する。ただし両者に同じ巨大入力を渡さず、Evaluatorには成果物、rubric、決定的gate結果、検証対象の根拠だけを渡す

**Phase 4 — A/B pilotと段階展開**:

1. 12件以上の固定fixtureで `現行` / `routingのみ` / `routing＋最小context` を比較する。最低指標は親高性能モデルtokens、親子総tokens、cached比率、spawn数、retry、gate成功率、重大指摘、所要時間
2. pilot目標は、高性能モデル使用量40%以上削減、親子総トークン20%以上削減、決定的gate成功率非劣化、重大な品質欠落0件とする。実測で達成不能なら値を都合よく変えず、task class別に採用/見送りを分ける
3. 軽量modelでretryが増え、親が全文再読するtask classはbalancedまたはflagshipへ戻す。速さだけ改善して総tokensや品質が悪化した経路は採用しない
4. pilot合格後だけ、利用頻度の高いskillから5件ずつ段階配線する。一括変更しない。各batchでrouting gateと既存quality gateを通す
5. 結果をagent設計SSOTへ抽出し、モデル更新時の再評価条件、期限、担当を残す。恒久化後は本カードを削除する

**停止条件・禁止事項**:

- model変更だけを目的に全80agentを一括編集しない。provider間で存在しないモデル名をコピーしない
- サブエージェント数や並列数の増加を削減成果として扱わない。wall-clock短縮と総tokens削減を分ける
- 品質評価を同じGeneratorの自己申告だけで合格にしない。決定的gateまたは独立Evaluatorの既存契約を維持する
- usage metadataに認証情報、会話本文、顧客原稿、外部サービスの生データを保存しない
- API課金、新しい外部サービス、Claude/Codexプラン変更、CIでの有料model呼出しは、費用・上限・停止方法を提示してユーザー承認を得るまで行わない
- 他セッションのdirty file、未追跡成果物、進行中cardをrevert・commitしない

**完了条件**:

- provider別routing SSOTと`check-agent-model-routing`が存在し、全agentの論理tier、例外理由、fallbackを機械検証できる
- Claudeの77 Sonnet / 3 inheritを維持または根拠付きで改善し、CodexはSonnetという説明文ではなくSol/Terra/Lunaの実行可能なroutingへ分離される
- spawn入力と返却schema、full-history例外、コンテキスト超過の記録、決定論優先がskill作成規約とagent registryへ反映される
- 固定fixtureのbaselineとA/B結果が再現でき、高性能モデル40%以上・総tokens20%以上削減、gate非劣化、重大欠落0を満たすtask classだけ本運用へ展開される
- `check-agent-model-routing`、既存のagent/skill coupling検査、対象skillの決定的gate、`quality:audit:ci`がPASSする。恒久ルールと結果をSSOTへ抽出後、本カードを削除する

**Claude Code実行プロンプト**:

```text
DN-0113をPhase 0から1 Phaseずつ実行してください。最初にCLAUDE.md §5-6、AGENTS.md §5-6、
.claude/todo/backlog.mdのDN-0113、.claude/skills/dev/create-skill/SKILL.mdのmodel指定ルール、
.claude/knowledge/reference/agents-registry.md、skills-design-guide.mdを読んでください。

開始前にbranch、originとの差、dirty/untracked files、他セッションの進行中作業を確認し、
他人の変更をrevert・commitしないでください。DN-0112のNotebookLM入力圧縮とは分離し、
本タスクではmodel routing、spawn条件、親子context、返却量、usage計測だけを扱ってください。

Phase 0ではコードやagent定義を変更せず、最低12件の固定fixtureと現行baselineを作ってください。
正確なtoken metadataが取得できない項目は文字数等のproxyであることを明記し、推測tokenを記録しないでください。
親高性能modelだけでなく親子合計、cached input、spawn、retry、gate結果、所要時間を比較してください。

Phase 1ではprovider非依存のflagship/balanced/fast/deterministicをSSOT化し、ClaudeはOpus/Sonnet、
CodexはSol/Terra/Lunaへ実モデルを解決してください。.Codex agent本文のmodel: sonnetを実行指定として扱わず、
spawn側でroutingを実装してください。対応modelが無ければ親継承へfail-safeし、別provider名へ置換しないでください。

Phase 2以降はfull-history forkを既定にせず、objective、owned files、evidence、constraints、acceptance、
output schemaだけをworkerへ渡してください。小作業・検証だけのspawn・同一巨大入力の複製を増やさないでください。
モデル名の全80件一括置換や外部有料サービス追加は行わないでください。

各Phase終了時に変更ファイル、fixture別の親tokens、親子総tokens、retry、gate結果、品質差分、
未解決点を短く報告して停止してください。高性能model40%以上、総tokens20%以上削減、gate非劣化、
重大欠落0を同時に満たすtask classだけ次Phaseへ進めてください。API課金、CI有料model利用、
プラン変更、外部設定変更は費用と影響を提示し、ユーザー承認を得るまで実行しないでください。
```

### [DN-0114] 法人・組織向け資格支援パックとライセンス収益のpilot
タグ: [収益化] [種類:改善] [Codex候補] [起票:2026-08-21]

個人向け販売チャネルをさらに増やすのではなく、既存のサイト・note・PDF・Claude Codeキットを、**建設会社・建設コンサルタント・自治体等の法人が複数人で利用できる商品**へ再包装する。最初からLMS、法人アカウント、Stripe連携を作らず、案内ページ＋問い合わせ＋利用範囲を定めたpilotで支払い意思を確認する。成立後にだけグループ講座、スポンサー、データライセンスへ段階展開する。

**既存施策との境界**:

- noteは個人受験者向けの高粗利な学習商品、ココナラは個別診断・添削・単発PDF、Brainは個人向けClaude Codeキットの販売を継続する。本カードは**法人が支払う複数人利用・組織内利用**に限定し、同じ個人商品を別市場へ安売りしない
- 学習・受験意図への教材／講座アフィリエイトは再開しない。既存Red Lineどおり、学習の財布は自社商品、キャリア意図は転職アフィリエイトに分ける
- PWAの買い切り／会員認証は既存PWA計画の担当。本カードではPWA本体、独自会員基盤、LMS、決済Webhookを実装しない
- `DN-0112`はNotebookLM入力圧縮、`DN-0113`はモデル分業。本カードはそれらの開発者向け仕組みを商品化せず、販売オファーと検証を扱う

**起票時の実査結果（2026-08-21・再調査不要）**:

- `content/site`は1,117 MDX、`content/note/**/article.md`は632本。既存資産の再包装余地は十分で、新しい教材を大量制作する必要はない
- `sales-log.json`の台帳合計は2026-06 ¥217,760、07 ¥275,140、08は17日時点¥39,520。note個人販売は実証済みだが試験季節とnoteプラットフォームへの依存が大きい
- ココナラは初回の1級模試¥2,500から同一購入者が教材16冊¥7,500を追加購入し、2件計¥10,000。入口商品→上位パックの価格ラダーは実売で成立した。一方、経験記述診断は29 view・受注0なので診断SaaSを先に作らない
- Kindleは2026-07に34冊でロイヤリティ¥1,712。追加KDP量産より、既存資産の高単価利用権を検証する方を優先する
- Brainの個人向けAI設計キットは2商品がlisted（¥7,980／¥9,800）。組織内利用ライセンスは未定義
- 国土交通省はi-Construction 2.0で人材確保・生産性向上を掲げ、厚生労働省の人材開発支援助成金には職務関連訓練の支援枠がある。ただし**本商品が助成対象と断定しない**。訓練要件・申請・価格根拠は購入企業と所管窓口が確認する

**商品仮説と順序**:

| 順位 | 商品 | pilot価格仮説 | 作る前の成功条件 |
|---|---|---:|---|
| 1 | 1級土木 法人資格支援パック | 5人¥49,800／20人¥99,800／60分説明会つき¥149,800 | 30日で適格問い合わせ3件または有料pilot1社 |
| 2 | Claude Codeキット 組織内利用ライセンス | 5人¥39,800／20人¥79,800 | 個人版ページから法人問い合わせ1件 |
| 3 | 季節限定グループ講座 | 8〜15人・1人¥6,000〜9,800 | 制作前に8席を先行販売 |
| 4 | キャリアページ直接スポンサー | 1社¥30,000〜100,000/月の仮説 | career面で月100 qualified click等の営業根拠 |
| 5 | 問題・解説データB2Bライセンス | 年¥300,000〜1,000,000の仮説 | 権利確認済みsampleへの具体商談1件 |

価格は市場実績ではなく検証用仮説。問い合わせが無いのに値下げせず、まず対象・提供価値・到達面を見直す。法人個別カスタマイズ、無制限サポート、受講者ごとの添削は標準価格に含めない。

**Phase 0 — オファー契約とpilot対象の固定**:

1. 既存のnote、ココナラ、Brain、Kindle、メンバーシップ、転職アフィリを一覧化し、個人向け商品と法人向け利用権の重複・価格逆転を確認する。現行価格とstatusは各catalog SSOTから取得し、本文の古い価格を使わない
2. 最初の対象は**1級土木施工管理技士 第2次検定・5人利用**の1商品に固定する。建設部門、総監、2級、コンクリートへ同時展開しない
3. 提供物を既存PDF、利用開始ガイド、管理者用配布案内、学習順チェックリストに限定する。新規動画、LMS、個別添削、合格保証、助成金申請代行を含めない
4. 利用範囲を「契約法人内・契約人数まで・複製可／社外再配布、転売、公開アップロード、別法人共有は禁止」と仮定し、法的文言は公開前にユーザーが確認する
5. 仮説価格、納品物、対応時間、更新期間、返金条件、問い合わせから納品までの手順を1枚のoffer specにする。税・適格請求書・特商法・助成対象をエージェント判断で断定しない

**Phase 1 — 売れる前に作り込まない案内ページ**:

1. サイト内に法人購入案内を1ページだけ作る。資格別商品カタログを増やさず、対象、含むもの／含まないもの、人数、価格仮説、利用範囲、導入手順、FAQ、`/contact`への導線を載せる
2. `/contact`に既存設計を壊さない範囲で「法人・団体購入」の問い合わせ例を追加する。会社名、利用人数、対象資格、希望時期、質問だけを受け、不要な個人情報を求めない
3. CTAは1級土木の学習ページ全体へ一括注入せず、法人利用と関連する資格トップ、経験記述ガイド、about/contactから少数面でpilotする。一般受験者のnote CTAを押し下げない
4. `corporate_inquiry_click`等の計測イベントを新設する場合は既存GA4 event namingとUTM規約を再利用する。計測未取得・0件を成功扱いしない
5. 公開・deploy前にページ、価格、連絡先、プライバシー記述、利用範囲、計測イベントを提示し、ユーザー承認を得る

**Phase 2 — 30日間の法人pilot**:

1. 案内ページ公開日をday 0とし、30日間は1級5人版だけを検証する。外部企業への営業メール、電話、SNS DM、既存購入者への連絡はユーザー承認なしに行わない
2. 問い合わせを`date / source / companyType / seats / exam / stage / result`で集計する。会社名、担当者名、メール本文はGitへ保存しない
3. 有料pilotが成立した場合、実作業時間、問い合わせ回数、納品ファイル数、決済／請求の摩擦、利用者からの質問、継続・追加人数意向を記録する
4. 成功は「適格問い合わせ3件」または「有料pilot1社」。問い合わせ1〜2件は価格・説明改善して15日延長、0件は停止してページ到達と対象設定を見直す。需要未確認のままLMSや5資格展開へ進まない
5. 1社目の値引きは最大20%までのpilot価格とし、定価として恒久表示しない。無償提供を販売実績として数えない

**Phase 3 — 組織ライセンスとグループ講座**:

1. 法人pilotまたはBrain個人版から法人問い合わせが得られた場合だけ、AI設計キットに組織内5人／20人ライセンスを追加する。成果物の社外販売、答案作成代行、顧客情報の投入を禁止する
2. グループ講座は「発注者目線で経験記述を分解」「模試の解説と自己採点」等の90分単発に限定し、8席の先行販売成立後に資料を作る。常設スクールや毎週ライブへ広げない
3. 録画・スライドを再販売または会員特典へ転用する場合、参加者の氏名・音声・質問を除去し、収録同意を事前に得る
4. 1回当たり売上、準備・実施・フォロー時間、返金、満足度、既存note／会員へのカニバリを記録し、実質時給が既存note制作を下回る場合は停止する

**Phase 4 — 条件成立後だけ検討する収益源**:

1. **直接スポンサー**: 転職・給与・キャリアページだけを対象とし、「広告／スポンサー」を明記する。記事評価・比較順位への介入を認めず、学習ページには出さない。営業開始はcareer CTAの月次実績を説明できる場合だけ
2. **B2Bデータライセンス**: 自作問題、独自解説、タグ、難易度、分類、検索インデックスを候補とし、試験問題本文・図・第三者資料は権利確認前に提供しない。最初はJSON/CSV sampleのみで商談し、API、SCORM、管理画面は契約後に作る
3. **CPD／CPDS等の認定研修**: 認定主体の最新要件、講師、時間、受講確認、修了証、費用を人が確認し、既存pilotが成立した後の別タスクとする。未認定の段階で単位取得可能と表示しない

**決済・契約方針**:

- 問い合わせが無いPhase 0-1では決済を実装しない。有料pilotが決まった時点で、銀行振込、既存プラットフォーム、Stripe Payment Links等を比較する
- Stripeは単発／継続の決済リンクをノーコードで作れるが、導入は新しい外部決済・顧客情報取扱い・税務対応を伴う。アカウント作成、本人確認、商品登録、公開リンク作成はユーザー承認後
- 法人の請求書、適格請求書、消費税、源泉・会計処理、助成金対象性を自動回答しない。必要に応じて税理士・所管窓口へ確認する
- 決済情報、請求書、会社担当者情報をGit、CI artifact、分析snapshotへ保存しない

**今は採らない案**:

- 追加Kindle量産: 34冊で月¥1,712の実績に対して優先度が低い
- 経験記述の診断SaaS: ココナラ診断29 view・受注0。まず既存S1の実売を待つ
- Udemy／常設動画講座: 動画制作・更新負荷が高く、既存YouTube／noteと役割が重なる
- 教材・講座アフィリエイト再開: note商品とカニバるためRed Line違反
- 有料検索＋AI Chat SaaS: 既存戦略どおり、現PVと運用負荷ではROI不足

**完了条件**:

- 1級5人版のoffer spec、法人購入案内ページ、問い合わせ導線、利用範囲、計測、30日判断日が一意に結線される
- 公開前に価格、法的表現、連絡先、プライバシー、外部write範囲をユーザーが承認し、公開後のURLとイベントを実体確認する
- 30日で適格問い合わせ3件または有料pilot1社を達成し、売上、原価、対応時間、問い合わせ、継続意向を記録する。未達ならLMS・資格横展開・Stripe実装をせず停止する
- 成立時は組織ライセンス／グループ講座のどちらか1つだけを次に検証し、スポンサー／データライセンスは各開始条件を満たすまで着手しない
- 検証結果と恒久ルールを収益化戦略SSOTへ反映し、採用／修正／撤退を決めて本カードを削除する

**Claude Code実行プロンプト**:

```text
DN-0114をPhase 0から1 Phaseずつ実行してください。最初にCLAUDE.md、
.claude/todo/backlog.mdのDN-0114、docs/strategy/03_事業戦略.md、04_収益化戦略.md、
src/lib/note-magazines.ts、coconala-services.ts、brain-products.ts、
.claude/state/sales/sales-log.json、coconala/orders-log.json、analytics-snapshot.json、
kdp-royalties.json、src/app/contact/page.tsxを確認してください。

開始前にbranch、originとの差、dirty/untracked files、他セッションの進行中作業を確認し、
他人の変更をrevert・commitしないでください。価格とstatusはcatalog SSOT、売上は追跡台帳から取得し、
docs本文の古いスナップショットを現行値として使わないでください。

Phase 0ではコードを変更せず、個人商品と法人利用権の境界、1級5人版の納品物、含まないもの、
利用範囲、価格仮説、対応工数、30日成功基準を1枚のoffer specとして提示してください。
LMS、PWA、法人アカウント、Stripe、動画、個別添削、助成金申請代行は追加しないでください。

Phase 1では法人案内1ページと既存/contactへの導線だけを最小実装してください。
一般受験者向けnote CTAを置換せず、資格横断・全ページ一括注入をしないでください。
助成対象、合格保証、CPD/CPDS単位、税務・適格請求書を未確認で断定しないでください。

公開、deploy、営業メール、DM、外部決済作成、外部サービス登録は、対象URL、価格、文面、
送信先、費用、個人情報の扱いを提示してユーザー承認を得るまで行わないでください。
各Phase終了時に変更ファイル、残した仮説、捨てた案、計測方法、法務・税務の未確認事項、
次の承認点を報告して停止してください。有料pilot1社または適格問い合わせ3件が得られるまで、
組織ライセンス、講座、スポンサー、データAPIへ展開しないでください。
```

### [DN-0115] PWA買い切り・メール主／LINE補助の収益導線pilot
タグ: [収益化] [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-08-22]

1級土木の無料過去問演習を、検索流入の入口から **Premium買い切り・note送客・自社リスト**へつなぐ。サイト全体はログイン必須にせず、PWAの購入権限・端末間同期・購入復元だけをメールのマジックリンクで認証する。メールを会員ID兼メインリスト、LINE公式を試験直前・合格発表・一次→二次の任意補助に分ける。

**設計SSOT**: [PWA過去問アプリ設計方針 v2](../../docs/products/06_PWA過去問アプリ設計方針.md) ／ [リスト化・自社オーディエンス戦略](../../docs/strategy/10_リスト化・自社オーディエンス戦略.md) ／ [収益化戦略](../../docs/strategy/04_収益化戦略.md)

**既存タスクとの境界**:

- `DN-0139` のLINEは、2026-10-04の1級二次に向けた「一次おつかれ→二次の始め方」の季節キャンペーン。本カードはPWA会員ID、購入権限、継続利用、全資格へ再利用するリスト基盤を扱う。`DN-0139`の期限付き配信を待たせず、友だち・配信台本・CTAを勝手に移管しない
- noteは模範解答・経験記述・論文等の文書商品を販売し続ける。PWAは弱点分析・復習計画・端末間同期等のツール価値だけを販売し、既存note商品の本文をPremiumへ複製しない
- `DN-0114`は法人ライセンスpilot。本カードは個人受験者のPWA買い切りで、法人アカウント、席数管理、請求書払い、LMSを実装しない

**起票時の実査結果（2026-08-22・再調査不要）**:

- `src/app/tools/kakomon-quiz/`に1級土木の無料演習が稼働し、平成26〜令和7年度の全1,098問、年度別、ランダム20問、間違い復習、`localStorage`進捗、結果画面のnote CTAまで存在する
- 公開ページとメタデータが「全1,098問を無料」と約束しているため、後から全問アクセスを有料化しない。Premiumは分野別弱点分析、復習スケジュール、端末間同期、オフライン、模試履歴等に限定する
- 現在はmanifest / Service Worker、会員認証、決済、entitlement、メール配信、LINE結線が無く、`package.json`にもStripe／Supabase／Clerk等のPWA認証・決済依存はない
- 旧設計の「note購入コード＋localStorage解放」は、決済Webhook、購入復元、端末間同期、失効、コード共有を解決できない。文書商品=note、PWA機能権限=Stripeに分離する
- LINE公式のコミュニケーションプランは月額0円・月200通で、通数は友だち数×配信回数。旧戦略の「月1,000通」は陳腐化していた。LINEを大規模CRMやPWAログインにしない
- 広告宣伝メールは事前同意、送信者表示、配信停止、送信拒否後の再送禁止が必要。ログイン／購入同意と販促メール同意を同じチェックにしない

**確定ファネル**:

```text
SEO記事・note・SNS
  → 1級土木PWA無料演習（ログイン不要）
  → 2回目完了／間違い蓄積／結果画面
  → Premium案内 + メール学習レポート任意登録 + LINE期限通知任意追加
  → Stripe買い切り
  → Webhookでentitlement付与
  → メールのマジックリンクでログイン
  → 弱点分析・復習計画・端末間同期
  → 記述式／模範答案はnoteへ送客
```

**Phase 0 — 計測契約とfake-door検証（認証・決済を作らない）**:

1. `quiz_start / quiz_complete / review_start / premium_view / premium_intent / email_interest / line_interest / note_cta_click`のイベント名、発火条件、`exam / placement / mode`パラメータを既存GA4規約に合わせて定義する。メール、LINE ID、購入者IDをイベントへ送らない。実リスト開始後の`email_opt_in / line_add_click`は別イベントにする
2. 結果画面とメニューにPremium案内を1面ずつ置く。価値は弱点分析、復習計画、同期。価格は仮説¥980〜¥1,480と明記し、「準備中／先行案内」であることを隠さない。未実装機能の決済を受けない
3. メール候補は「学習レポート・先行案内」、LINE候補は「試験日・合格発表の通知」と用途を分ける。Phase 0は匿名の希望クリックだけを測り、メールアドレスやLINE友だちをまだ取得しない。両方を同時に必須化せず、初回問題の前には置かない
4. メール収集フォームを作る前に、候補サービスの料金、export、削除、unsubscribe、double opt-in、custom domain、SPF/DKIM/DMARC、Webhook、障害時のexportを比較する。認証のtransactionalメールとmarketing配信を同じ同意で送らない
5. success gateは、1級PWA利用者100人以上、`premium_intent / premium_view` 5%以上、重複除外した購入希望10人以上。LINEは`line_interest`だけで採否を決めず、Phase 1開始後の`line_add_click`と試験期の再訪を別に記録する

**Phase 1 — メールリストpilotとLINE補助（外部サービス承認後）**:

1. ユーザー承認後にメール基盤を1つだけ作る。最小フィールドは`subscriber_id / email / exam / source / consent_at / consent_text_version / status / unsubscribed_at`。氏名、勤務先、生年月日、住所は取得しない
2. 販促同意は未選択を既定とし、フォーム付近に配信内容・頻度・プライバシーポリシー・配信停止を表示する。確認メール、送信者名称、問い合わせ先、ワンクリック解除、suppression listを実査する
3. 配信は月2回以下を基線に、学習レポート、試験日、直近の無料演習、PWA／note自社商品だけを扱う。A8アフィリは配信しない。A8登録メルマガへ将来載せる場合も別タスク・個別媒体条件確認を必須にする
4. LINE公式は無料200通の範囲で、1資格・1イベントのpilotに限定する。友だち数×予定配信回数が200を超える場合、有料プランへ自動変更せず、費用と停止方法を提示する
5. 30日で`登録率 / 確認完了率 / 開封 / クリック / unsubscribe / PWA再訪 / premium_intent`を集計する。生メール、LINE識別子、本文、個別行動履歴をGit、GA4、CI artifactへ保存しない

**Phase 2 — Stripe買い切り・マジックリンク・権限（Phase 0成功後）**:

1. ADRで少なくとも「Supabase Auth＋DB」「既存Cloudflare Pages Functions／Workers＋D1」「他のmanaged auth」を、実装量、月額、SMTP、データexport、Webhook、障害復旧、削除請求、vendor lock-inで比較する。自前パスワード認証を作らない
2. Stripe test modeで1級Premiumの商品・価格・success/cancel URLを作る。`checkout.session.completed`等を署名検証し、同じeventを再送してもentitlementが重複しない冪等処理にする。価格登録・本番Payment Link・本人確認はユーザーが承認するまで作らない
3. `users / entitlements / progress / marketing_consents`を分離し、購入者は販促未同意でもPremiumを使えるようにする。購入メールとアカウントメールが異なる場合の安全な紐付け、購入復元、返金・取消、アカウント削除を設計する
4. マジックリンクは購入後または「端末間同期を使う」時だけ要求し、無料演習と1端末内`localStorage`を壊さない。既存データをログイン後へ明示的にmergeし、別人の進捗を上書きしない
5. 最初の有料機能は弱点分析、端末間同期の2つに絞る。オフライン、PDF出力、AI学習計画、複数資格bundle、サブスクはpilot後へ送る

**Phase 3 — 有料pilotと拡張判断**:

1. 1級だけで30日または購入20件までpilotし、`checkout_start / purchase / refund / entitlement_error / magic_link_success / sync_success / premium_active`を匿名集計する
2. 価格別の売上、購入率、Stripe手数料、サポート件数、購入復元、返金、週次継続利用を記録する。購入数だけでなく、1購入あたりの対応時間と権限事故0件を合格条件にする
3. successは購入10件以上、`purchase / premium_view` 2%以上、重大な権限漏れ0、購入復元成功100%、サポート30分/件以下。未達なら総監・2級・月額へ展開せず、価値・価格・到達面を見直す
4. 成立後だけ共通エンジン化、総監または2級のどちらか1資格、manifest / SW / オフラインへ進む。両資格同時追加やメンバーシップ統合をしない
5. 継続課金は、月次予想・添削・更新モートを8週以上安定供給できる場合だけ別カードで評価する。静的な過去問だけを月額化しない

**法務・データ・安全弁**:

- 直接販売前に特商法表記、利用規約、プライバシーポリシー、返金方針、問い合わせ、データ削除・export、未成年購入の扱いをユーザーが確認する。エージェントが法的適合を断定しない
- 認証メールと販促メールを分離し、販促はオプトイン、送信者表示、解除、suppressionを必須にする。解除済みへの再送をテストで防ぐ
- Secret、Webhook署名、メールアドレス、Stripe customer、LINE user ID、session、magic-link tokenをGit、ログ、GA4、Sentry、CI artifactへ出さない
- 外部サービス登録、DNS、Stripe本番設定、価格公開、実決済、メール／LINE送信、deployは、対象、費用、送信内容、保存データ、停止・削除方法を提示し、ユーザー承認まで実行しない
- 現在のdirty `.claude/todo/backlog.md` には他セッションのDN-0113/0114がある。revert、代理commit、カードの並べ替えをしない

**完了条件**:

- PWA v2、リスト戦略、収益化戦略、実装コードの無料／有料境界、メール／LINE役割、note／Stripe境界が一致する
- Phase 0イベントと案内面が実装され、100利用者・CTA 5%・希望10人の判定を再現できる。未達なら課金基盤を作らず停止できる
- Phase 1以降へ進む場合、販促同意・解除・suppression・個人情報非混入をテストでき、メールとLINEの費用・配信数を管理できる
- Phase 2以降へ進む場合、Webhook署名・冪等性・entitlement・購入復元・返金・削除・端末mergeのE2EがPASSし、Premium権限漏れ0件
- 有料pilotが購入10件、購入率2%以上、復元100%、対応30分/件以下を満たした場合だけ資格拡張を起票する。結果を戦略SSOTへ反映後、本カードを削除する

**Claude Code実行プロンプト**:

```text
DN-0115をPhase 0から1 Phaseずつ実行してください。最初にCLAUDE.md、AGENTS.md、
.claude/todo/backlog.mdのDN-0115、docs/products/06_PWA過去問アプリ設計方針.md、
docs/strategy/10_リスト化・自社オーディエンス戦略.md、04_収益化戦略.md、
src/app/tools/kakomon-quiz/{page.tsx,KakomonQuizClient.tsx}、src/lib/quiz/types.ts、
src/app/privacy/page.tsx、既存GA4イベント実装と計測規約を読んでください。

開始前にbranch、originとの差、dirty/untracked filesを確認し、他人の変更をrevert・commitしないでください。
Phase 0では認証、DB、Stripe、メール配信SaaS、LINE Messaging APIを導入せず、現行PWAの利用イベント、
Premium案内面、メール／LINEの用途別CTA、匿名の判定レポートだけを実装してください。

全1,098問の無料アクセス、ログイン不要の演習、localStorage進捗、note CTAを維持してください。
未実装Premiumを販売中と表示せず、価格は検証仮説、CTAは先行案内であることを明記してください。
メールとLINEを同時必須にせず、個人情報をGA4、Git、ログ、CI artifactへ保存しないでください。

Phase 0のローカル実装とbuild、イベントテスト、light/dark/mobile目視が終わったら変更ファイル、
イベント契約、案内文、未収集の外部データ、100利用者・CTA 5%・希望10人の測定方法を報告して停止してください。
外部サービス登録、DNS、Stripe設定、実決済、メール／LINE送信、deployは行わないでください。

成功基準を満たしてPhase 1以降を指示された場合も、まずサービス比較とADRを提示してください。
外部サービスのアカウント作成、料金発生、Secret登録、顧客データ保存、本番価格公開は、費用、
保存項目、export／削除、解除、障害時復旧を示しユーザー承認を得るまで実行しないでください。
Phase 2はStripe test modeとfixtureまで、Phase 3は別承認として扱い、資格横展開や月額化を同時に行わないでください。
```


### [DN-0108] Windows・Mac共通のPlaywright認証永続化基盤
タグ: [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-08-21]

Playwrightのログインprofileはサービス別に永続化されているが、note/Brain/ココナラ/KDPはrepository配下の`.local`、X/Instagram/A8の一部はMacユーザー名の絶対パス、Googleだけは独自`DOBOKU_PROFILE_ROOT`と保存先規則が分裂している。worktreeやWindows/Macを切り替えると別profileを作り、再ログインや誤アカウント操作の原因になる。一方、Cookie/profileのPC間同期はOS暗号化・漏洩・破損リスクがあるため採用しない。

**実装指示書**: [DN-0108-cross-device-playwright-auth/00-master.md](../plans/DN-0108-cross-device-playwright-auth/00-master.md)

**確定方針**: コード・service registry・account assertだけをGit共有し、認証profile/stateはWindowsとMacで独立保持する。`DOBOKU_AUTH_ROOT`＋OS標準ローカル領域へ統一し、password/2FA/CookieはGit・env・GitHub Secretsへ保存しない。GitHub ActionsはAPI/MCP経路を維持する。

**ハーネス判断**: `.agents/skills/dev/playwright-auth/SKILL.md`をuser-invocableかつ`disable-model-invocation: true`で新設し、`auth:paths/doctor/login/status/migrate`を安全な順番で呼ぶ薄いオーケストレーターにする。skill内へ認証ロジックを複製せず、`skills-registry.md`へ登録する。意味評価や生成がなく決定的scriptで判定できるため、専用agentは作らない。サービス固有操作は既存operator/collectorの責務を維持する。

**機械チェック**: ①CI/ローカル共通=`check-playwright-auth-wiring:strict`でMac/Windows絶対パス、repo相対profile、resolver未使用、secret key候補を0にする、②PCローカルoffline=`auth:paths/doctor`でroot・権限・lock・legacy・profile競合を診断、③PCローカルonline read-only=`auth:status`で`authenticated/expired/blocked/unknown/unsupported`を実ページ＋account assertから判定する。profile存在だけをauthenticatedにしない。CIには実profile・login・statusを持ち込まない。

**実行順**: ②note/Brain/ココナラ/KDP移行、③X/Instagram/Google/A8/もしも/afb移行、④`auth:paths/doctor/login/status/migrate`とservice lock、⑤専用`playwright-auth`スキル新設・registry登録、⑥Windows実機→同じcommit候補でMac実機の順に独立login/status検証、⑦恒久SSOTへ抽出して本カードとplanを削除する。各Phaseで検証・報告して停止する。

**禁止**: profile/Cookie/storageStateのPC間・クラウド・Git同期、password/2FA自動入力、CAPTCHA回避、旧profileの自動削除、target上書き、profile並行利用時の自動kill、profile存在だけでauthenticated判定、account/site/property assert弱化、Gmail Playwright化、投稿・公開・申請・購入・push・deploy。

**完了条件**: runtimeのMac絶対パスとrepo相対profile直書きが0、全対象が共通resolver利用、Windows/Mac双方でnoteのlogin→close→別プロセスstatusとworktree非依存がPASSする。専用スキルが薄いCLIオーケストレーターとして登録され、専用agentが増えていない。A8 profile-plus-state、afb same-process、Gmail非対応を維持し、`check-playwright-auth-wiring:strict`・auth CLIテスト・affiliate/Google配線・lint/type-check/doc refsがPASS。profile/state/Cookie/password/token/2FAのGit差分は0。

### [DN-0101] note L1/L2・サイト→note意味導線の再編
タグ: [UI・UX] [種類:改善] [起票:2026-08-20] [期日:2026-10-04]

DN-0100で行き止まりと季節ドリフトを止めた後、機械監査では判定できない「読者の現在地に合う次の一歩」を再編する。L1総合案内は公開済みコンクリート2資格を「準備中」と表示し、技術士第一次試験の入口がない。3つのL2は有料商品が無料記事より先で、サイトの1級一次→二次CTAは10月以降の戻しが手動コメントに依存している。

**実装指示書**: [DN-0101-note-funnel-information-architecture.md](../plans/DN-0101-note-funnel-information-architecture.md)

**実行順**: ①L1の公開実体との一致、②3 L2を「無料で現在地確認→有料で仕上げる→目的別逆引き」へ再編、③総監・建設・土木の資格セグメント維持、④1級一次過去問の季節商品切替を `exam-calendar.json` 駆動化、⑤ソース監査、⑥ユーザー承認後のnoteライブ反映。新しいL2や商品は作らず、既存公開実体だけを案内する。

**完了条件**: L1の「準備中」誤表示と資格入口欠落が解消し、3 L2の最初の選択肢が無料の現在地診断になる。1級一次CTAが10/4後に一次商品へ戻ることを日付固定テストで証明し、`audit-note-funnel`・`check-magazine-cta:ci`・`check-note-link-cards`・`check-note-site-utm` がPASS。ライブ更新後はL1/L2公開APIと目次ブロックを実査する。



### [DN-0026] 土木公務員 SEO 第1期の効果測定（handoff 2026-08-17 抽出）
タグ: [SNS・マーケ] [種類:改善] [期日:2026-09-14]

2026-08-17 に資格ハブ改稿＋1級土木の新設ページを公開・デプロイ済み。測定が残っている:

1. 資格ハブ（`pe-comprehensive-management-public-engineer-qualification-map`）と新設ページ（`civil-construction-1-public-servant-merit`）を GSC で URL 検査し、インデックス状況を記録する
2. **目安 2026-09-14 以降**、公開後 28 日と直前 28 日を比較する。判定の正規表現と基準は [13_土木公務員SEO戦略2026-08.md](../../docs/strategy/13_土木公務員SEO戦略2026-08.md)
3. 次記事「土木公務員に技術士は必要？」の着手可否は 1・2 の結果を見てから判断する（語順違いの類似ページは作らない）

### [DN-0027] コンクリート診断士 択一98問＋記述式8本の技術内容レビュー（人手）
タグ: [コンテンツ品質] [種類:改善] [起票:2026-07-31]

著作権対応で 8 記事・98 問を原典転記からオリジナル演習問題へ全面書き換えした（2026-07-31）。論点は保っているが、**技術内容の人手レビューは未了**。すでに本番公開済みなので、誤りが見つかったら修正して再デプロイする形になる。対象は `content/site/concrete-diagnostician/primary-exercise-01〜08`。

**記述式も同様に未レビュー**（2026-08-17 に旧「著作権方針」セクションから引き継ぎ）。対象は note `mf2a132408b6f` 収録 8 本＋`content/site/concrete-diagnostician/guide-essay`。いずれも公開済みのため事後修正になる。

原典照合できない数値は出していない（JIS 規格値は原理を問う形へ、改正年代順は塩化物総量規制の考え方へ差し替え済み）。


### [DN-0031] Brain 2商品の審査後フォローと販売運用（2026-07-22 申請済み）
タグ: [収益化] [種類:改善] [コンテンツ品質]

残るのは note 入口記事 2 本の公開（`published: false` のまま待機中）:
①`content/note/技術士総監/出題テーマ分析-R8地方創生検証/`
②`content/note/1級・2級土木/経験記述-AI設計-無料/`。
**完了条件**: `src/lib/note-magazines.ts` で両記事が `published: true` かつライブ URL 実在。
Brain 商品自体（施工経験記述キット・総監施策バンク）は `src/lib/brain-products.ts` が
両方 `status: 'listed'` と持つ（審査結果はメールで確認済み・状態はそちら参照）。
運用の詳細は [brain-operations.md](../knowledge/reference/brain-operations.md)。


### [DN-0033] civil-1 土木一般編 テキスト章 本文変換（土工/コンクリート工/基礎工 ~19記事）
タグ: [コンテンツ品質] [種類:制作]

**Phase 1（config 統合）は完了・PR #395 で develop マージ済**（2026-07-14）。`src/config/category-curriculum.json` の civil-1 に 土工(order 1-49)・コンクリート工(50-79)・基礎工(80-99) を textbookChapters 新設し、配列順を PDF 章順（土工→建設機械→コンクリート工→基礎工→測量→解体工事）に再構成、受け皿だった「分野別対策」fields は廃止。要点ガイド4本は各章 introGuides へ移設済。→ カテゴリページの該当3章は現在「要点ガイド1〜2行」だけ表示（本文記事が空）。

**残（Phase 2-4）= OCR 済み md → textbook site 記事（MDX）の忠実変換**。変換元は `content/sources/textbook/１級土木施工管理技士/テキスト（土木一般編）/` の第1/3/4章。order レンジは確保済みなので、記事 frontmatter に `textbook_order` を割り当てれば自動的に該当章へ収まる。

- **Phase 2: 第１章_土工.md（4,209行・最大）→ 約8記事（order 1-49・5刻み）**: 4/8記事が変換済み（`textbook-soil-investigation-methods`/`textbook-embankment`/`textbook-cut-slope-protection`/`textbook-soft-ground-drainage`。生成済みか否かは記事の実在が真実源）。残: 土工計画・建設機械の作業能力 / 道路土工・路盤 / アスファルト舗装 / 舗装補修・品質管理（行範囲は変換元 `content/sources/textbook/１級土木施工管理技士/テキスト（土木一般編）/第１章_土工.md` を参照）
- **Phase 3: 第３章_コンクリート工.md（2,646行）→ 約6記事（order 50-79）**: 材料 / コンクリートの性質 / 配合設計・レディーミクスト / 施工(運搬・打込み・締固め・打継目・養生) / 鉄筋工・型枠支保工 / 特別なコンクリート・品質管理検査
- **Phase 4: 第４章_基礎工.md（1,561行）→ 約5記事（order 80-99）**: 概説・地質調査 / 土留め・仮締切り / 直接基礎 / 杭基礎(既製杭) / 場所打ち杭

**手順**: 見本 = `content/site/civil-construction-1/textbook-demolition/article.mdx`（frontmatter・リード・Callout・ArticleImage・RelatedKeywords・CareerAffiliate・参考資料を踏襲）。変換ツール = `/pdf-to-mdx --exam civil-construction-1` textbook モード（テンプレ `.claude/skills/conversion/pdf-to-mdx/templates/civil-construction-1.md`）。図は元 md 隣の `img/01-YY.png` を記事 `img/` へコピー → `<ArticleImage src=".../{name}.webp">` → `npm run generate-webp`。網羅率95%+・KaTeX（$$は複数行）・表4列以下・参考URLは実在確認済のみ（捏造禁止）。1記事=`/check-mdx`→QA(civil-construction-qa ≥2.0)→即 commit。仕上げ = `npm run refresh-indexes` + `npm run ogp`（check-ogp-coverage 対策）。

**進め方**: 1章=1セッション目安（トークン大）。develop 上で通常コンテンツフロー。関連 = [[project_civil1_textbook_transcription]]（既に両編 OCR→MD 完了・条文数値は原典照合）。既存の「土木一般編（スキャン教材）図タイト化・素材活用」タスクとは別スコープ（あちらは図タイト化＋guide/note展開、こちらは textbook 章本文の site 記事化）。

### [DN-0036] モバイル可読性リライト 第1弾
タグ: [コンテンツ品質] [種類:制作]

機械ラチェット基盤は整備済み（`content-rules.json`＋`lint-mdx-mobile --all`＋週次 `check-content-quality`）。baseline に grandfather された既存違反を GA4 人気度順にリライトして漸減させる。

- **優先上位**: `civil-construction-1-guide-strategy`（3-1×29・#1人気）／`pe-comprehensive-management-keyword-2026`（3-1×48）／`civil-construction-2-secondary-r0X`／`pe-construction/*-exam-themes` 残11本
- **手順**: レポート上位を group 対応の `/quality-cycle` へ。表→非表・入れ子→フラット・長段落→改段。1バッチ 10-20 記事、完了ごとに `npm run update-content-quality-baseline`
- **バッチ1実績（2026-08-26）**: cem keyword 15本で可読性改修込みリライト実施・baseline更新済み（違反記事592件）。
- **バッチ2実績（2026-08-26）**: cem keyword 追加15本（計30本）。残バッチは優先上位（guide-strategy等）から
- **注意**: civil textbook の規格表・配合表は override 除外済み。過去問の年度×選択肢表は無理に崩さない





### [DN-0043] note 導線 後続配線（Fable P1 残・3 件）
タグ: [収益化] [種類:改善] [起票:2026-08-17]

2026-08-17 に 4 bullet を個別実査し、②「一次→二次 季節CTA切替」は **2026-07-01 の journey stage 再設計で完了済み**と確認したので削除した（`magazine-placement.ts` の `CIVIL_EXAM_PREP_GUIDES` が既に二次・経験記述 led）。

残り:
1. **トンネル / 都市計画パックの実体作成**（律速＝note 実機）。掲載文は `content/note/**/PACK-02` `PACK-03` に作成済みだが、`note-magazines.ts` の `pe-construction-tunnel-pack` / `pe-construction-urban-planning-pack` は `published: false` / `noteUrl: ''`
2. **建設→総監ブリッジ記事 1 本**（無料・建設部門合格者を総監の来季見込み客に）。現状は建設部門もくじに L1 総合案内リンクがあるだけで専用記事なし。**執筆自体は sweep で可能**
3. 道路パックの finer placement（任意・現状 1 面）


### [DN-0046] 競合の勝ち型を policy 化（SNS 投稿型カタログ拡張）
タグ: [SNS・マーケ] [種類:改善]

SNS競合実地調査（2026-07-04・`07_競合調査.md` SNS節）でsurfaceした残り型: 合格後キャリア/現場リアル リール＝**運営者の一次情報素材待ち**。聞き流し一問一答と16:9動画基盤は`DN-0110`へ統合した。真実源`content-angle-policy`／`00_SNS整理マップ §型カタログ`。


### [DN-0049] SEO 品質ゲート後続（PR #390 マージ後の残タスク）
タグ: [インフラ・計測] [種類:改善]

SEO 品質ゲート実装（PR #390・handoff `2026-07-13-seo-quality-gates.md` は削除済・git 履歴参照）の後続。ゲート本体は develop 済み。残:
1. **deploy 後の GSC 監視**: `develop→main` deploy で canonical/OGP 修正が本番反映＝サイト全ページ canonical 一斉更新の再クロールが走る。**コアアップデート期を避け、直後2週間は GSC 日次を監視**（gsc-management.md 2026-07-10 の教訓）。
2. **GSC page×query 実データ確認**: 初回検証 2026-07-15 完了（workflow_dispatch で `gsc-page-query-2026-07-15` 取得・窓 6/14–7/12）。Pattern 7 site-wide 検出 3 件は**すべて同一ページの #fragment 誤検出＝カニバリ実証 0 件**。残: (a) メタ改善は少数 URL の 14〜28 日実験に限る、(b) **8/31 BuildJob キャンペーン終了後に civil-construction-1 career 26 本を page×query で再測定**。先行シグナルは `guide-1-vs-2` ↔ `guide-grade-comparison` が同一クエリ「1級 2級 土木」で共に表示（impr 1/3・pos 73/80、閾値 impr≥5×pos≤30 に未達）のみ。年収系4本（salary-up/salary-by-role/allowance/career-salary）・辞める系3本（quit-or-stay/quit-honne/career-consultation-before-quit）はクエリ競合の観測なし。実証されたペアのみ統合（301 or canonical）、感覚では削らない。
3. **orphan/unreachable 6本の gate 昇格**: `pe-comprehensive-management-r8-essay-theme-*` 6本は現状 warn（意図的未リンク）。導線設計を決めたら check-seo-build の gate へ昇格。
4. **robots / OAI-SearchBot の ADR**（v2監査 §8.3）: ADR ドラフト起案済み → [robots-ai-crawler-decision.md](../../docs/operations/robots-ai-crawler-decision.md)。実測: robots.txt はリポジトリ管理下になく Cloudflare Managed（全 AI bot 既に Disallow）。案B（search/user bot のみ選択的許可）を推奨として提示、適用はユーザー承認（Cloudflare ダッシュボード側の設定変更が必要でこの環境からは不可）。


### [DN-0051] 計測基盤 Tier 2/3 ＋ GA4 UI 設定
タグ: [インフラ・計測] [種類:改善]

Tier 1（NoteLink 計測・cadence 化・bot 監査 CI 等）は実装完了。残:
- **Tier 2/3**: カスタムパラメータ・検索/scroll イベント・アフィリA/B の label 取得・GA4↔GSC 突合・sales×流入 attribution・送客リダイレクタ・A8 EPC
- **GA4 サーバ側（ユーザー手作業）**: 残るのは**未解決の bing bot 疑いの確定**のみ（内部トラフィック/参照除外・既知ボット除外・カスタムディメンション登録はすべて完了済み。`ga4-admin:check` / `check-ga4-dimensions` とも「不足 0」を実測）。真実源 → [計測基盤強化ロードマップ.md](../../docs/operations/計測基盤強化ロードマップ.md)
- **Playwright UI CSV**: `fetch-ga4-ui-csv.mjs` は未ログイン検証のみ。ログイン済み実UIでレポート名・ディメンション・指標・ダウンロードメニューの正式ラベルを確定し、fixtureと回帰テストへ反映（API優先方針は維持）
  - **2026-08-25 実測: ga4-ui は一度も完全成功していない**。`check-gsc-ui-due --json` の `ga4-ui` が `due:true`（直近実行 2026-07-30 は 取得 0/3・失敗 3＝`csv-menu-ambiguous` / `report-not-found`×2、完全取得の記録なし）。gsc-ui は 11/16 取得で期限内なので、欠測しているのは GA4 UI 由来の指標だけ
  - **故障記録（2026-07-30 実測・`check-gsc-ui-due` が DUE を出し続ける原因）**: 3 ユニットとも失敗。
    `trafficAcquisition` は `csv-menu-ambiguous`（ダウンロードメニューの候補が一意に決まらない）、
    `landingPage` は `report-not-found`（候補 0）、`events` は `report-not-found`（候補 11＝絞り込めていない）。
    上のラベル確定作業がそのまま修正になる。**GSC UI 側は正常**（2026-07-30 に 10 ユニット中 7 取得・失敗 0）
### [DN-0052] SVG図版 dual-use パイプライン残
タグ: [コンテンツ品質] [種類:改善]

PR #269（カタログ）/#270（SNSレンダラー）済。残 = Phase4 記事への `<ArticleImage>` 埋込（orphan 6点・**ユーザー保留中**）・SNSパイプライン残（IG管理別カルーセルのオーケストレーション/コピーGenerator/Evaluator配線）。






## 🟢 低 — 時期未定

### [DN-0088] search-growth 残存 UNKNOWN 1,280 URL の発生源裁定
タグ: [インフラ・計測] [種類:意思決定] [起票:2026-08-22]

トリガー: DN-0106 で全件化した GSC query/page の**次回 CI スナップショット（`truncated:false`）が
取れたら**着手（それまで判断材料が無い＝2026-08-27 に 🟣 から trigger 待ち 🟢 へ移動）。

1. `npm run search-growth:report` を再実行し、残る UNKNOWN を発生源別に束ねる。
2. 上位バケットの代表 URL を確認し、EXPECTED_EXCLUSION / KEEP_MONITOR / 個別精査へ一括裁定する。
3. noindex は「固有価値が低い」かつ「長期ゼロ流入」の双方が確認できた場合だけ提案し、自動適用しない。
4. 決定を `gsc-management.md` の観測・判断ログへ記録し、同じバケットの再検討を防ぐ。

seo-fix-planner は audit-only。変更候補が再発生しても適用は人の承認後。
前提整理済み（2026-08-22 分類ロジック修正・最新 run = EXPECTED_EXCLUSION 1,084 /
UNKNOWN_REVIEW 1,280 / 破壊的変更候補 0）。


### [DN-0122] 発注者クラスタ（会計検査・臨時協議・設計変更）の新設可否
タグ: [コンテンツ品質] [種類:制作] [起票:2026-08-24]

genba-career 調査（2026-08-24）で見つかった**相手固有の空白のうち、doboku-note が最も強く書ける領域**。

実照合: `content/site/**/*.mdx` で「発注者」に触れる記事は 224 本あるが、**会計検査 0 件・臨時協議 0 件**。相手は「発注者が数年後まで会計検査を怖れている」「協議の早さは技術力と同じくらい信頼をつくる」「設計変更が嫌がられる2つの本音」を実体験で書いており、6本で1カテゴリを構成している。

運営者は元自治体土木（発注者）＝この座を持つ唯一の側。相手は受注者→発注者→発注者支援の順で、**発注者としての決裁・検査の当事者性はこちらが上**。

ただし**受験者の検索意図ではない**ため、試験対策ハブという事業定義から外れる。13 の SEO クラスタにも入れていない。やるなら「なぜこのサイトにこの記事があるか」の位置づけを先に決める。

### [DN-0058] サイトアクセス×収益化 戦略の深掘り論点
タグ: [SNS・マーケ] [種類:改善]

「検索→サイト→note」が実収益回路と判明（サイト流入84%オーガニック・CTAクリック構成が売上と一致）。土木は同回路が未稼働＝最大の伸びしろ。残（全未着手・別PC）: ①勝ち記事の型抽出（GA4 page×cta-clicks で総監の勝ちパターン→土木移植）②土木SEOビルド計画（textbook 34本×テキスト13章ギャップ表）③土木のサイト→note導線整備 ④売上×イベント相関 ⑤note内発見性の手動検証 ⑥AI検索対策。

### [DN-0059] フロントエンド土台リファクタ 残増分（新資格が増えたら着手）
タグ: [UI・UX] [種類:改善] [起票:2026-08-17]

増分3（ArticleFooter config駆動化）・増分4残（`sortDocs` の strategy factory 化）は **新資格追加が実際に発生したら**着手する（indirection 増に対し効果が限界的）。`category-groups.ts` の分岐は実測 26 件。
※Underline 撤去の別件は DN-0050（UI-009 と同じデッドコード領域）へ移記した（2026-08-26）。

### [DN-0060] note 会員プラン設定の保存が即時ライブ反映か未検証（handoff 2026-07-30 抽出）
タグ: [収益化] [種類:改善]

公開中プランに対する `note-membership-plan-edit` は一度も実行しておらず、保存が即座にライブへ出るかが分かっていない。会費・定員・特典マガジン紐付けを触る前に、影響の小さい項目（説明文）で 1 回だけ実機確認する。会費そのものは変更不可で作り直しになる（memory `note-membership-publish`）。

### [DN-0063] 画像系 pre-render ワークアラウンドの再検証（Opus 5 vision）
タグ: [インフラ・計測] [種類:改善]

Anthropic の Opus 5 プロンプトガイドが「旧モデル向けに仕込んだ vision ワークアラウンドは不要になっている可能性があるので再検証せよ」「vision はモデル自身が切り出し・拡大・目視確認できるツールを持つときに最も精度が出る（思考量を上げるより費用対効果が高い）」としている。

現状、図まわりは親が**事前に**レンダリング・抽出してからエージェントへ渡す設計になっている。この前処理が今も必要か測る。

- 対象: `civil-exam-figure-extractor`（事前レンダリング済みページ画像を Read して bbox spec を返す）、`scanned-textbook-transcriber` / `scanned-figure-crop-auditor`（`pdfimages` で抽出・回転・分割した単ページ画像を渡す）、`figure-crop-worker`
- 測り方: 既知の正解がある数枚で「従来の事前レンダリング経路」と「エージェントが自分で開いて拡大・クロップして確認する経路」を突き合わせ、bbox 精度と総トークンを比較
- 簡素化できるならスキル側の前処理ステップを削る。できないなら**なぜ必要か**を各エージェント定義に1行残す（次に同じ検討を繰り返さないため）
- 根拠: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5>

**2026-08-28 着手→中断**: A/B比較には原本PDF（過去問/テキスト）が要るが、この環境（Windows会社PC）には実体が無い。`content/sources/textbook/` 配下・asset manifest とも過去問PDFの登録なし。figure-provenance.md は「元PDFは大半が実在しフル再抽出可能」と記録するが、これは作業時にユーザーが `.tmp/` 配下へ都度配置する運用（.gitignore対象）を指しており、常設の格納場所ではない。**原本PDF入手が前提条件**（DN-0090・figure-provenance の rescan-need-source と同型の制約）。PDFが手元にあるセッションで再着手すること。




### [DN-0069] コンクリート主任技士 H24/H25 skip 分の補完＋R6/R7 拡張
タグ: [コンテンツ品質] [種類:制作]

2026-07-17 に H24（26問）・H25（12問）を site へ追加（計303問・H24〜R5）。ただし 2022年版底本の**OCR品質がまだらで、以下は復元不能/不確実として収録せず skip**。**書籍原典（コンクリート主任技士2022）を再入手できれば補完可能**（現状ローカルに原典PDFなし＝照合不可）:
- **H25 skip 18問**: Q1,3,4,5,7,8,9,10,12,13,14,15,16,17,19,20,21,26（選択肢文のOCR破綻・表崩れで数値確定不可・図が別問題と判明・解答表と技術判断の conflict 3問）
- **H24 conflict skip 4問**: Q14（低確度・肢が技術的に擁護可能で解答表と齟齬）,Q16（「鉄筋腐食→硫酸塩」等OCR再構成）,Q17（JIS A5308 計量誤差表を数値検証できず）,Q18（標準偏差値がOCRで入替わり解答表と数学的に不整合）。answer key に合わせて再構成した本文の公開は避け撤去済み
- **年度拡張**: R6・R7 は原典スキャン未入手（書籍入手が前提）
- **表記統一（軽微）**: 既存 cce に「令和1年度」と「令和元年度」の混在（同一年=R1）。片方へ統一

真実源 = [exam-content-policy.md](../knowledge/reference/exam-content-policy.md) §コンクリート主任技士。





### [DN-0075] 土木一般編（スキャン教材）図タイト化・素材活用
タグ: [コンテンツ品質] [種類:改善]

①図320点のタイト化 — 再開時は軽量版 `apply_deltas_recrop.py --damp 0.7`＋監査2-3ラウンド上限（フルはトークン過大で後回し）②素材活用（本丸）: 検証済みテキストで guide 品質改善・note 無料集客記事展開（GSC 先行で伸び悩みトピック特定）。runbook = `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/README.md`。

### [DN-0076] textbook 白黒図のカラー化（対象B・任意）
タグ: [コンテンツ品質] [種類:改善]

PDF クロップ済み白黒図 約65枚（construction-machinery-01=13/-02=7/schedule-management=24/surveying=11/demolition=6/construction-mgmt-overview=4 ほか）。著作権問題なし・見栄え向上のみ。**Gemini 有料→着手前に必ずユーザー確認（[[gemini-cost-confirm]]）**。パイロット5枚→品質・コスト確認→全体。



### [DN-0079] カテゴリカードの残改善
タグ: [UI・UX] [種類:改善]

人気データの鮮度（CI の ga4-page 取得依存・週次見込み）。



### [DN-0082] API トークン更新サイクル ＋ MCP 棚卸し
タグ: [インフラ・計測] [種類:改善]

GitHub Secrets: `CLOUDFLARE_API_TOKEN`/R2 キー=90日・`PSI_API_KEY`/`YOUTUBE_CLIENT_SECRET`=180日。①期限確認・更新 ②Cloudflare token の権限スコープ最小化 ④更新サイクルを Calendar/schedule hook に登録。

### [DN-0083] note 編集スクリプトの共有 lib 化（Tier 2 保守性）
タグ: [エージェント・SSOT] [種類:改善]

**見積りを実測へ訂正（2026-08-25）**: 起票時「3〜5スクリプト」と書いたが、棚卸しの実測は
それより大きい——account ゲートのコピペだけで **15 本以上**、`launchPersistentContext` を持つ
ファイルは **36 本**。account ゲートはリトライ回数がファイルごとに微妙にズレており
（12回×2500ms / 10回×2000ms / 10回×1500ms）、コピペ後の個別ドリフトが実際に進行している。

account ゲート/ClipboardEvent paste/リンクカード化/ブラウザ起動が多数スクリプトにコピペ分岐
（note-update-body paste 無音失敗事故の震源）。`scripts/lib/note-browser.mjs` へ一元化。
**有料境界（paywall boundary）ロジックは収益直結のため統合せず各スクリプトにインライン保持**。
独立 worktree で実施・dry-run/probe で挙動同一確認。

**このカードへ統合するもう 1 系統（2026-08-25 追加）**: I/O の入口全般が共有化されておらず、
事故は常にここで起きる。棚卸しの実測:

| 種別 | ローカル実装の本数 | 共有 lib |
|---|--:|---|
| note API（`note.com/api/v3/notes` 直叩き） | 14 本中 13 本 | `scripts/lib/note-api.mjs`（2026-08-25 新設・新規消費者のみ） |
| frontmatter の自作正規表現リーダー | 21 本（gray-matter 派 34 本と二系統並存） | `scripts/lib/note-frontmatter.mjs`（2026-08-25 新設・新規消費者のみ） |
| Playwright account ゲート/ブラウザ起動 | 15 本以上 | `scripts/lib/note-browser.mjs`（2026-08-26 新設・2本移行済み） |

note-api.mjs / note-frontmatter.mjs は**新規に書くコードだけ**が使っており、既存 13 本・21 本の
移行はまだ。動いている検査を一度に触るリスクを避けるため、着手時は 1 本ずつ移行して
その都度実測で挙動同一を確認する（バルクでの一斉置換はしない）。

**2026-08-26 実績**: `note-browser.mjs`（`launchNoteContext`/`assertAccountGate`）を新設し、
独立worktreeで`check-note-attachments.mjs`・`note-convert-to-paid.mjs`の2本を移行（dry-run/probe
で移行前後の挙動一致を確認・developへマージ・push済み）。**残: launchPersistentContext保有36本中34本**
（note-api.mjs/note-frontmatter.mjs未消費の既存34本も含め、1本ずつ継続）。account ゲート自体が
無いスクリプト（note-sync-tags.mjs等）は「抽出」でなく「ゲート新規追加」になるため別判断。


## 🟣 判断待ち — ユーザーの意思決定が必要








