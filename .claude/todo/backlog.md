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
| 3 | Kindle `e-02` の差し替え | catalog は LIVE 反映済み（2026-08-28・ASIN B0H3GX3HNW）。残＝ローカルの修復済みEPUB（2026-08-12修復・章名article.mdx漏れ解消・epubcheck 0件・check-kindle-epub-leak PASS）をKDPへ差し替える経路が無い。`kdp-publish.mjs` に「LIVE本のマニュスクリプト更新」モードが未実装で、`--dump --page content` の `title-setup/kindle/<asin>/content` は既刊では404（下書き専用パス） | 正しいKDP編集導線（本棚→編集→コンテンツ更新）の特定から必要。KDP 実機。顧客影響がある可能性が高いため優先度を上げて確認すべき |
| 8 | civil-1 一次過去問 公式キー 24 件 | 残＝`h28-a`(19)・`h29-a`(1=No.38)・`h29-b`(4=No.3/12/17/21)。h28-a は 19 件と突出＝official 配列自体の OCR 誤りを疑い、mass-fix 前に第2ソースで再検証 | pre-H30 原典 PDF の入手（touhokugiken.com / dobokujira.com に h29 学科A/B は無し）。**LLM 推測厳禁**・キー番号だけの書き換え禁止 |
| 9 | 過去問 解説・図の要照合クラスタ | 解説＝civil-1 `secondary-construction-plan-past-problems` No.9(1) 記述省略／civil-2 `secondary-r06` 問8 画像未挿入／総監 h21・h22・h28・h30 の 7 問／pe-first-stage 3 問。図は `figure-provenance.md` の `rescan-need-source` 7 図（`r07-a-fig-02` を含む） | 原典照合・外部原典の入手。進捗ビューは admin 記事図版タブ |
| 10 | ココナラ C12 プレミアム週枠の再判断（旧DN-0007） | C12（教材18冊＋添削2テーマ・¥15,000）は`weeklyCapacity: 1`で開始。添削は本番顧客への納品実績が無く（S2レビュー0）、初回工数が読めないための暫定値 | 初受注時に`orders-log`の`tensakuMinutes`を実測記録。2〜3件出たら週枠を再判断（判断基準→[ココナラ展開キット.md §5](../../content/note/1級・2級土木/ココナラ展開キット.md)）。実受注が無いと1手も進まない |
| 11 | Gmail転送＋フィルタ設定（旧DN-0017・別PC作業） | ココナラの運営通知は`dobokunotecom@gmail.com`にしか届かずMCPから見えない。ラベル`dobokunotecom`は作成済み、`create_filter`はセッションに未公開のためフィルタ作成は人の作業 | 手順1: `uruhayato373`側でフィルタ作成（To=dobokunotecom・受信トレイスキップ＋ラベル付与）→手順2: `dobokunotecom`側で転送先追加・確認コード承認・転送有効化。完了条件は`label:dobokunotecom`で1件以上ヒット |
| 12 | KDP Select 自動更新オフ A-00〜A-06（旧DN-0089） | note 択一PDF（`n155093f42183`・¥1,980・公開済み）との抵触リスクを安全側に倒すと判断（2026-08-27）。e-02 は Select 非加入方針・A 系列は収録範囲違い（422問論点別 vs 1162問全年度）だが部分集合の可能性が否定できない | KDP 管理画面で A-00〜A-06 の「KDPセレクトへの自動登録」をオフ。**期限=独占明け 2026-10-06 より前（10月上旬）**。10/6 を過ぎて自動更新されなければ制約自体が消滅 |
| 19 | 技術士第一次試験 KDP Select早期解除の回答反映 | D-00／D-03の状態は`scripts/kindle-published/catalog.json`の`notes`を真実源とする。申請受付のローカル証跡は`.tmp/kdp-select-support-result.json`にあり、Amazonからの回答待ち | 回答受信後、KDP本棚で両書籍のSelect状態を実査する。解除済みならcatalogと`content/kindle/strategy.md`へ反映し、noteとの併売可否を確定する。未解除なら回答内容に従い再連絡し、解除確認前に恒常併売を確定しない |
| 13 | LINE 一次→二次ブリッジの器 | 磁石記事・配信台本3通・友だち追加CTA文言は完成済み。残るのは外部アカウントと実URLだけ | LINE公式アカウント開設→`delivery-script.md`を管理画面へ転記→`friend-add-cta.md`のプレースホルダーを実URLへ差し替え、X・note・サイトへ配置 |
| 14 | note 会員プランの初回設定保存 | 公開中プランの保存結果は未実測。非公開ドラフトのままと断定せず、即時ライブ反映の可能性を前提にする | 説明文など影響の小さい差分を保存前に提示し、ユーザー承認後だけ`--commit`。保存後に管理UIと公開面を実査 |
| 15 | Cloudflare / R2 認証キーの最小権限化 | 固定90/180日ローテーションの根拠はない。R2監査専用キーの作成手順は`ci-cd-security-hardening.md`に既存 | Cloudflare管理画面で`CLOUDFLARE_API_TOKEN`の実期限・権限を確認し、R2読み取り専用キーを`CLOUDFLARE_R2_AUDIT_*`へ登録。`r2-audit.yml`が汎用キーへフォールバックせず成功することを確認 |
| 16 | コンクリート主任技士の原典待ち問題 | H25 skip 18問・H24 conflict 4問とR6/R7はローカル原典がなく、推測補完できない。詳細は`exam-content-policy.md`の主任技士メモが真実源 | 原典入手後に問題・公式解答表を視覚照合し、復元できた設問だけ追加。解答キーに合わせた本文創作は禁止 |
| 19 | 技術士第一次試験 KDP Select早期解除の回答反映 | D-00／D-03の状態は`scripts/kindle-published/catalog.json`の`notes`を真実源とする。申請受付のローカル証跡は`.tmp/kdp-select-support-result.json`にあり、Amazonからの回答待ち | 回答受信後、KDP本棚で両書籍のSelect状態を実査する。解除済みならcatalogと`content/kindle/strategy.md`へ反映し、noteとの併売可否を確定する。未解除なら回答内容に従い再連絡し、解除確認前に恒常併売を確定しない |

**完了条件**: 各行の実体が解消したら行ごと消し、全行が消えたらカードを削除する。

## 🟡 中 — 2〜3ヶ月以内

### [DN-0167] コンクリート単品¥980の値上げ可否を試験後に判定する
タグ: [収益化] [種類:改善] [起票:2026-09-04] [期日:2026-12-12]

2026-09-04 に最上位アンカー `cce-marugoto-pack`（¥9,800）を新設した（既存SKUは据え置き）。残る論点は小論文/記述の単品 45 本（主任技士 37・診断士 8）が一律 ¥980 で、同じ記述式の土木 経験記述 ¥1,680〜1,980 より低いこと。字数単価では ¥183/千字で自社上位帯のため「安すぎる」とは断定できず、実売も 0 件のため値上げの効果は未検証。**アンカー新設の効果（¥9,800 の実売・¥5,980 の動き）を 11-29 試験〜12月上旬で観測してから**、¥1,480 への改定可否を判定する。

実行時の罠: 対象 48 本が `paidBoundary` を持つため `note-article-price-sweep` は既定 ABORT（exit 9）。`--allow-boundary-risk` の後に `note-update-body --commit` で境界を再設定し `npm run check-note-structure` で FULL_LOCK=0 を実査するまでが 1 セット（2026-07-24 に civil 58 本で無料プレビューを消した形）。




### [DN-0120] 9月中旬のA8成果を取り込み、転職アフィリ継続を再判定する
タグ: [収益化] [種類:改善] [起票:2026-08-24] [期日:2026-09-16]

2026-08は現状維持で観測を継続した。実績が確定する9月中旬に`npm run a8-ui:fetch`（ローカルログイン＋CAPTCHA要）で取り込み、(1)継続 / (2)露出を絞る / (3)撤退して自社商品導線へ、を再判定する。比較には`.claude/state/metrics/affiliate/a8-results.json`と配置別クリックを使い、確定成果・EPC・面別母数を同じ期間で揃える。


### [DN-0142] reference-materials 再公開5記事のGSC効果を計測する
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-26] [期日:2026-09-09]

旧DN-0074の残作業③。2026-08-26に精度向上のうえ再公開した5記事
（reference-materials-hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02）
について、再公開14日後（2026-09-09以降）にGSCでインデックス状況とimpressions/clicksのdeltaを計測し、
再実験化（EXP系起票）するかを判断する。EXP-002はcancelled（2026-06-27）なので新規起票になる。





### [DN-0110] 通常動画pilot 4本の図版・派生・公開・6週間判定
タグ: [SNS・マーケ] [種類:改善] [Codex候補] [検証:quality:audit:ci] [起票:2026-08-21]

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

pilot 4パック（`koji-gaiyo-7items` / `anzen-ippanron-3riyu` / `gokanri-tradeoff` / `monbun-yomikata`）は `qa_passed`。残作業は次の順で行う。

1. 既存SVG図版をscene visualへ埋め込めるようrendererを拡張し、4本を最終再生成する
2. `.tmp/video-render/` のmp4・wav・ASS・frameをR2へ検証付きで退避し、再取得経路を用意する
3. 各通常動画からShorts 2本・IG 1組・X 1スレッドを派生する
4. 薄い`/video-content` skillと`video-script-writer`（Generator）／`video-content-qa`（Evaluator）を追加する
5. 公開対象・日時・アカウントを提示し、ユーザー承認後に公開してURL・videoId・関連動画・CTAを照合する
6. 公開6週間後にShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移から継続・修正・停止を判定する

**制約**: `approved` はユーザーだけが設定する。mp4/wavをGitへ入れない。ThreadsのX単純クロスポスト、全記事一括動画化、全資格同時展開は行わない。IGの既存リール素材は本pilot成立後に判断する。

**完了条件**: 4packのmanifest/script/storyboard/QA/派生/statusが一意にjoinされ、全機械・意味ゲートとadmin型検査/E2EがPASSする。4本の通常動画と関連Shortsを外部実体で照合し、6週間後の継続/修正/停止判断とbaselineを記録したらカードを削除する。




### [DN-0115] PWA買い切り・メール主／LINE補助の収益導線pilot
タグ: [収益化] [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-08-22]

1級土木の無料過去問演習を、検索流入の入口から **Premium買い切り・note送客・自社リスト**へつなぐ。サイト全体はログイン必須にせず、PWAの購入権限・端末間同期・購入復元だけをメールのマジックリンクで認証する。メールを会員ID兼メインリスト、LINE公式を試験直前・合格発表・一次→二次の任意補助に分ける。

**設計SSOT**: [PWA過去問アプリ設計方針 v2](../../docs/products/06_PWA過去問アプリ設計方針.md) ／ [リスト化・自社オーディエンス戦略](../../docs/strategy/10_リスト化・自社オーディエンス戦略.md) ／ [収益化戦略](../../docs/strategy/04_収益化戦略.md)

**既存タスクとの境界**:

- `DN-0139` のLINEは、2026-10-04の1級二次に向けた「一次おつかれ→二次の始め方」の季節キャンペーン。本カードはPWA会員ID、購入権限、継続利用、全資格へ再利用するリスト基盤を扱う。`DN-0139`の期限付き配信を待たせず、友だち・配信台本・CTAを勝手に移管しない
- noteは模範解答・経験記述・論文等の文書商品を販売し続ける。PWAは弱点分析・復習計画・端末間同期等のツール価値だけを販売し、既存note商品の本文をPremiumへ複製しない
- 法人向けライセンスpilotは収益化戦略で凍結中。本カードは個人受験者のPWA買い切りに限定し、法人アカウント、席数管理、請求書払い、LMSを実装しない

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

### [DN-0101] note L1/L2再編をライブ反映して実査する
タグ: [UI・UX] [種類:改善] [起票:2026-08-20] [期日:2026-10-04]

**実装指示書**: [DN-0101-note-funnel-information-architecture.md](../plans/DN-0101-note-funnel-information-architecture.md)

ソース側はL1に技術士第一次試験の公開済み入口を追加し、3つのL2で無料の現在地確認を最初の選択肢にした。1級一次ページの主CTAも`exam-calendar.json`の二次試験日を読み、試験当日までは二次教材、翌日から一次教材へ戻る。

**残作業**: ユーザー承認後、L1と3つのL2を1本ずつ安全に更新する。更新通知は「いいえ」とし、既存の目次・画像・価格を保持する。公開APIと`audit-note-funnel --live --ci`で4本を実査し、問題がなければ指示書と本カードを削除する。



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



### [DN-0155] git履歴の次回切り詰め（.git実体1.0GBの回収）
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-29]

`.git` の `size-pack` は1.05GiB。通常のcommitでは過去blobを回収できないため、全worktreeと
長時間プロセスを停止し、`asset-storage-policy.md` §8の履歴切り詰め手順を単独で実行する。
`seo-meta` は追跡スナップショットを1件に固定済みで、明示的な`--snapshot`以外は
`seo-meta-latest.json`を上書きする。履歴切り詰め後に`git count-objects -vH`とfresh clone容量を記録し、
主要ブランチ・タグ・Cloudflareデプロイ・R2復元経路を確認してからカードを削除する。
















## 🟣 判断待ち — ユーザーの意思決定が必要
