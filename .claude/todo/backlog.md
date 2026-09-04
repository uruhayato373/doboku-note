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





### [DN-0167] 技術士第一次試験 Xキャンペーン095を週次予約する
タグ: [SNS・マーケ] [種類:制作] [起票:2026-09-05] [期日:2026-09-30]

`content/sns/x/draft/095-pe-first-stage-2026-10/` の31投稿とカード画像、`.claude/config/x-campaigns/2026-10-pe-first-stage.json` は完成している。2026-09-05の実査では `npm run x-schedule-guard -- --max-per-day 2` が、既存9月枠の1日3本を理由にBLOCKしたため未投入。既存予約を解除したり上限を迂回したりしない。

2026-09-30の既存投稿終了後に `npm run x-sync-status` で実体を更新し、`npm run x-schedule-guard -- --queue --max-per-day 2` が緑になった場合だけ、`publish-x` の予約モードを `--dry-run` で確認する。その後は一度に全件を積まず、10月分を最大1週間ずつ予約し、各バッチ後に `npm run x-sync-status` で queued 実在を確認する。凍結・ロック・認証要求が1回でも出たら停止する。

**完了条件**: 31投稿が `queued` または `posted` としてX実キュー／公開面に一致し、同時刻衝突・近似重複・1日上限超過が0件になったらカードを削除する。


### [DN-0135] 人・外部実体が必要な残務
タグ: [収益化] [種類:不具合] [起票:2026-08-25]

この環境だけでは完了できない残務を集約する。weekly の手動キューはこの ID だけを参照し、状態や件数は複製しない。

| # | 残務 | 実体（2026-08-25 照合） | 律速 |
|---|---|---|---|
| 1 | Issue #473 のクローズ | 無料プレビュー下限の食い違いは解消し `note-live-audit.yml` は green 実測済み（run 32797779154）。診断コメントも投稿済み | automation-failure のクローズは**復旧実体を確認した人間**の担当（CLAUDE.md §8） |
| 3 | Kindle `e-02` の差し替え | catalog は LIVE 反映済み（2026-08-28・ASIN B0H3GX3HNW）。残＝ローカルの修復済みEPUB（2026-08-12修復・章名article.mdx漏れ解消・epubcheck 0件・check-kindle-epub-leak PASS）をKDPへ差し替える経路が無い。`kdp-publish.mjs` に「LIVE本のマニュスクリプト更新」モードが未実装で、`--dump --page content` の `title-setup/kindle/<asin>/content` は既刊では404（下書き専用パス） | 正しいKDP編集導線（本棚→編集→コンテンツ更新）の特定から必要。KDP 実機。顧客影響がある可能性が高いため優先度を上げて確認すべき |
| 6 | コンクリート系 `cta-bg` 2 枚 | **実測: `public/images/cta-bg/` は 5 枚（civil-1 / civil-2 / note-hero / pe-comprehensive / pe-construction）で、主任技士・診断士が欠落**。生成スクリプトは無く手描きイラスト | 画像制作。無いあいだはテーマ色のベタ塗りへフォールバックする（実害は見栄えのみ） |
| 8 | civil-1 一次過去問 公式キー 24 件 | 残＝`h28-a`(19)・`h29-a`(1=No.38)・`h29-b`(4=No.3/12/17/21)。h28-a は 19 件と突出＝official 配列自体の OCR 誤りを疑い、mass-fix 前に第2ソースで再検証 | pre-H30 原典 PDF の入手（touhokugiken.com / dobokujira.com に h29 学科A/B は無し）。**LLM 推測厳禁**・キー番号だけの書き換え禁止 |
| 9 | 過去問 解説・図の要照合クラスタ | 解説＝civil-1 `secondary-construction-plan-past-problems` No.9(1) 記述省略／civil-2 `secondary-r06` 問8 画像未挿入／総監 h21・h22・h28・h30 の 7 問／pe-first-stage 3 問。図は `figure-provenance.md` の `rescan-need-source` 7 図（`r07-a-fig-02` を含む） | 原典照合・外部原典の入手。進捗ビューは admin 記事図版タブ |
| 10 | ココナラ C12 プレミアム週枠の再判断（旧DN-0007） | C12（教材18冊＋添削2テーマ・¥15,000）は`weeklyCapacity: 1`で開始。添削は本番顧客への納品実績が無く（S2レビュー0）、初回工数が読めないための暫定値 | 初受注時に`orders-log`の`tensakuMinutes`を実測記録。2〜3件出たら週枠を再判断（判断基準→[ココナラ展開キット.md §5](../../content/note/1級・2級土木/ココナラ展開キット.md)）。実受注が無いと1手も進まない |
| 11 | Gmail転送＋フィルタ設定（旧DN-0017・別PC作業） | ココナラの運営通知は`dobokunotecom@gmail.com`にしか届かずMCPから見えない。ラベル`dobokunotecom`は作成済み、`create_filter`はセッションに未公開のためフィルタ作成は人の作業 | 手順1: `uruhayato373`側でフィルタ作成（To=dobokunotecom・受信トレイスキップ＋ラベル付与）→手順2: `dobokunotecom`側で転送先追加・確認コード承認・転送有効化。完了条件は`label:dobokunotecom`で1件以上ヒット |
| 12 | KDP Select 自動更新オフ A-00〜A-06（旧DN-0089） | note 択一PDF（`n155093f42183`・¥1,980・公開済み）との抵触リスクを安全側に倒すと判断（2026-08-27）。e-02 は Select 非加入方針・A 系列は収録範囲違い（422問論点別 vs 1162問全年度）だが部分集合の可能性が否定できない | KDP 管理画面で A-00〜A-06 の「KDPセレクトへの自動登録」をオフ。**期限=独占明け 2026-10-06 より前（10月上旬）**。10/6 を過ぎて自動更新されなければ制約自体が消滅 |
| 19 | 技術士第一次試験 KDP Select早期解除の回答反映 | D-00／D-03の状態は`scripts/kindle-published/catalog.json`の`notes`を真実源とする。申請受付のローカル証跡は`.tmp/kdp-select-support-result.json`にあり、Amazonからの回答待ち | 回答受信後、KDP本棚で両書籍のSelect状態を実査する。解除済みならcatalogと`content/kindle/strategy.md`へ反映し、noteとの併売可否を確定する。未解除なら回答内容に従い再連絡し、解除確認前に恒常併売を確定しない |

**完了条件**: 各行の実体が解消したら行ごと消し、全行が消えたらカードを削除する。

## 🟡 中 — 2〜3ヶ月以内


### [DN-0162] 建設部門の過去問に設問単位の逆引き（キーワード↔設問）を開通する
タグ: [コンテンツ品質] [種類:改善] [起票:2026-09-03]

`PastExamBacklinks` の設問単位逆引きは総監（`exam-keyword-map.json`＝人手キュレーション）と 1級・2級土木（本文照合の自動索引）にしかない。pe-construction は past-exam 84 本と keyword 35 本が科目タグ（都市及び地方計画・道路 等）で `RelatedArticles` により**記事単位では既に相互リンク済み**（2026-09-03 実物確認）。残るのは設問単位の紐付けで、総監と同じく `exam-keyword-map.json` を pe-construction 向けにキュレーション（`exam-keyword-mapping-auditor` の対象拡張）してから `build-exam-backlinks.mjs` の走査対象へ加える。コンクリート 3 資格は primary-X ↔ textbook-X が同じ分野名で 1 対 1 に対応し、各記事の `RelatedKeywords` で既に明示リンク済みのため対象外。


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

サイト・note・既存図版をYouTube通常動画へ再編集し、関連Shorts・Instagram・Xへ派生するストックコンテンツ基盤を作る。現状はShorts台帳200本（公開13・retired187）がある一方、通常動画への接続、クリック可能な外部導線、動画パック単位の品質・公開・成果管理がない。追加量産より先に、動画マスターと回遊・計測を成立させる。

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

**批判的レビュー**: [動画コンテンツ運用設計_批判的レビュー.md](../../docs/reviews/critical/動画コンテンツ運用設計_批判的レビュー.md)

**依存関係**: 左ナビのコンテンツ中心IAとYouTube入口は`DN-0103`を再利用し、本カードで別のナビregistryを作らない。聞き流し一問一答は本カードへ統合済み。

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

**Phase 3 完了（2026-08-28）**: `/content/video`・`/content/lifecycle`・`/metrics/video`（成果＝公開状態×GA4送客を `utm_campaign=packId` で join）・`/sns` の動画パック節・GA4 campaign 次元の CI 供給・公開実体の照合（実査 `verify-video-publication` は CI 週次、ゲート `check-video-publication` は quality:audit ci）まで実装済み。

**Phase 4 — 段階拡張**: 6週間のpilotでShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移を評価。送客シグナルが無ければ自動化拡張を停止。成立後だけ他資格とThreads会話briefへ広げる。ThreadsのX単純クロスポスト、全記事一括動画化、全資格同時展開は禁止。

**完了条件**: 4packのmanifest/script/storyboard/QA/派生/statusが一意にjoinされ、全機械・意味ゲートとadmin型検査/E2EがPASSする。4本の通常動画と関連Shortsを外部実体で照合し、6週間後の継続/修正/停止判断日とbaselineを記録する。公開・push・deploy・外部設定変更は対象と影響を提示してユーザー承認を得るまで実行しない。



### [DN-0114] 法人・組織向け資格支援パックとライセンス収益のpilot
タグ: [収益化] [種類:改善] [Codex候補] [起票:2026-08-21]

個人向け販売チャネルをさらに増やすのではなく、既存のサイト・note・PDF・Claude Codeキットを、**建設会社・建設コンサルタント・自治体等の法人が複数人で利用できる商品**へ再包装する。最初からLMS、法人アカウント、Stripe連携を作らず、案内ページ＋問い合わせ＋利用範囲を定めたpilotで支払い意思を確認する。成立後にだけグループ講座、スポンサー、データライセンスへ段階展開する。

**既存施策との境界**:

- noteは個人受験者向けの高粗利な学習商品、ココナラは個別診断・添削・単発PDF、Brainは個人向けClaude Codeキットの販売を継続する。本カードは**法人が支払う複数人利用・組織内利用**に限定し、同じ個人商品を別市場へ安売りしない
- 学習・受験意図への教材／講座アフィリエイトは再開しない。既存Red Lineどおり、学習の財布は自社商品、キャリア意図は転職アフィリエイトに分ける
- PWAの買い切り／会員認証は既存PWA計画の担当。本カードではPWA本体、独自会員基盤、LMS、決済Webhookを実装しない
- 内部開発者向けの NotebookLM・モデル運用は商品化せず、本カードは販売オファーと検証だけを扱う

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
- 並行セッションの未コミット変更を revert・代理 commit せず、カードの並べ替えをしない

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









### [DN-0051] 計測基盤 Tier 2/3 ＋ GA4 UI 設定
タグ: [インフラ・計測] [種類:改善]

詳細な真実源は [計測基盤強化ロードマップ.md](../../docs/operations/計測基盤強化ロードマップ.md)。残る実装項目は同文書の #5 / #7 / #8 / #12 / #14 / #15 と bing bot 疑いの確定。

`fetch-ga4-ui-csv.mjs` は未ログイン検証までで、ログイン済み実UIでは 3 ユニットとも取得失敗（`trafficAcquisition`: `csv-menu-ambiguous`、`landingPage` / `events`: `report-not-found`）。正式ラベルを確定して fixture と回帰テストへ反映する。API優先方針は維持する。






## 🟢 低 — 時期未定


### [DN-0153] kindle-dist EPUBのgit追跡解除（2条件付き・条件(ii)は前提が要再検証）
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-29]

2026-08-29 に scripts/kindle-dist/（76件・56.8MB）を kindle-dist group で R2 private へ
バックアップ済み（DN-0151(3) 決着・commit 994e481de）。ただし git 追跡は維持している——
untrack するには次の2条件が要る:
(i) 全冊再ビルドの内容一致検証。ツールの部品は揃っている（`scripts/check-kindle-format.mjs`
の `unzip -Z1`/`unzip -p` パターンを転用すればタイムスタンプ非依存の内容比較器を組める）が
未実装。**危険**: `scripts/sync-kindle-dist.mjs` を id 全指定で流すと再ビルドしたEPUBが
即座に `scripts/kindle-dist/` へ上書きコピーされる設計（catalog.json 実測=live 43/in_review 2）
ので、比較前に別ディレクトリへ退避する安全なラッパーが要る。
(ii) **2026-08-29 の再調査で前提が誤りと判明**: `scripts/check-kindle-format.mjs` の既定スキャン
対象は `scripts/kindle-published/*.epub` のハードコードで、`scripts/kindle-dist/` は一切
スキャンしていない（grep で確認・kindle-dist を引数に取る呼び出しは repo 全体に無い）。
つまり現状の CI 配線では kindle-dist の untrack は check-kindle-format の「0冊で exit 2」
ゲートを壊さない可能性が高い。ただしこれが意図的設計か記述が古いだけかは未確認——
着手前に再確認すること。

### [DN-0155] git履歴の次回切り詰め（.git実体1.0GBの回収）
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-29]

DN-0111（2026-08-22）で単一commitへ切り詰めたが、.git実体は現在1.03GiB（size-pack）まで
再肥大している。2026-08-29の全ストレージ最適化（P1-P8）でHEAD追跡容量は415.4MBまで
下がったが、過去のcommit履歴（切り詰め後の7日分含む）は.gitのpackに残ったままで、通常の
commitでは減らない。**全worktree停止が必要な単独作業**（policy §8手順）なので、
P1-P8完了後（このカード起票時点）にやるのが最も効果が大きい。

2026-09-04 の DN-0152 再計測では size-pack が 1.03GiB→1.05GiB（約20MiB/6日）となり、
目標の10MB/週以下を超過した。主な回避可能要因は `seo-meta` の時系列 JSON 11件（約13MiB）。
残りは standards 記事・OGP背景など意図した新規コンテンツだった。次回の履歴切り詰め前に、
`seo-meta` の保存世代数または commit 頻度を制限し、再肥大源を止めてから単一 worktree で実施する。

### [DN-0059] フロントエンド土台リファクタ 残増分（新資格が増えたら着手）
タグ: [UI・UX] [種類:改善] [起票:2026-08-17]

増分3（ArticleFooter config駆動化）・増分4残（`sortDocs` の strategy factory 化）は **新資格追加が実際に発生したら**着手する（indirection 増に対し効果が限界的）。`category-groups.ts` の分岐は実測 26 件。
※Underline 撤去の別件は DN-0050（UI-009 と同じデッドコード領域）へ移記した（2026-08-26）。

### [DN-0060] note 会員プラン設定の保存が即時ライブ反映か未検証（handoff 2026-07-30 抽出）
タグ: [収益化] [種類:改善]

公開中プランに対する `note-membership-plan-edit` は一度も実行しておらず、保存が即座にライブへ出るかが分かっていない。会費・定員・特典マガジン紐付けを触る前に、影響の小さい項目（説明文）で 1 回だけ実機確認する。会費そのものは変更不可で作り直しになる（memory `note-membership-publish`）。





### [DN-0069] コンクリート主任技士 H24/H25 skip 分の補完＋R6/R7 拡張
タグ: [コンテンツ品質] [種類:制作]

2026-07-17 に H24（26問）・H25（12問）を site へ追加（計303問・H24〜R5）。ただし 2022年版底本の**OCR品質がまだらで、以下は復元不能/不確実として収録せず skip**。**書籍原典（コンクリート主任技士2022）を再入手できれば補完可能**（現状ローカルに原典PDFなし＝照合不可）:
- **H25 skip 18問**: Q1,3,4,5,7,8,9,10,12,13,14,15,16,17,19,20,21,26（選択肢文のOCR破綻・表崩れで数値確定不可・図が別問題と判明・解答表と技術判断の conflict 3問）
- **H24 conflict skip 4問**: Q14（低確度・肢が技術的に擁護可能で解答表と齟齬）,Q16（「鉄筋腐食→硫酸塩」等OCR再構成）,Q17（JIS A5308 計量誤差表を数値検証できず）,Q18（標準偏差値がOCRで入替わり解答表と数学的に不整合）。answer key に合わせて再構成した本文の公開は避け撤去済み
- **年度拡張**: R6・R7 は原典スキャン未入手（書籍入手が前提）
- **表記統一（軽微）**: 既存 cce に「令和1年度」と「令和元年度」の混在（同一年=R1）。片方へ統一

真実源 = [exam-content-policy.md](../knowledge/reference/exam-content-policy.md) §コンクリート主任技士。






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
