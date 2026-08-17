---
title: ココナラ運用 SSOT（受注・KPI・カタログ整合）
---

# ココナラ運用 SSOT — 1級・2級土木 経験記述サービス

ココナラ（coconala.com）で出品する単発サービスの**運用・スキーマ・安全弁**の真実源。2026-07-16 新設。

> [!important] 守備範囲の切り分け（重複 SSOT を作らない）
> - **本書** = 運用（受注フロー・KPI 記録・スキーマ・ドリフト検知・安全弁）
> - [ココナラ展開キット.md](../../../docs/note/1級・2級土木/ココナラ展開キット.md) = **戦略・出品文面**（競合分析・価格設計・出品文面・ヒアリングシート・撤退ライン）
> - `src/lib/coconala-services.ts` = **価格・状態・URL の機械可読 SoT**（文章側に価格を書かない）

**いつ読むか**: ココナラの受注を処理する／KPI を記録する／出品状態を変える／スキーマを触るとき。

---

## 1. アカウント SSOT

`.claude/config/coconala-account.json`（ig-account.json と同じ流儀＝フラット1オブジェクト＋`_note` 自己記述）。

| キー | 意味 |
|---|---|
| `sellerName` | ココナラの出品者名 |
| `profileUrl` | 出品者プロフィール URL |
| `listedAt` | 初出品日（ISO・未出品は null） |

出品前はプレースホルダ（空文字）。**listed のサービスが1件でもあれば `profileUrl` は必須**（`check-coconala-wiring` が強制）。`sellerName`（=dobokunote）は出品自動化の account assert に使う。

> **出品・修正は Playwright で自動化する**（2026-07-18〜）。ログイン済みプロファイル `.local/playwright-coconala-profile`（gitignore）を持つ。§8 参照。**KPI 自社数値も read-only で自動取得する**（2026-08-17 方針変更・§4）。

## 2. 3スキーマ

### 2.1 カタログ（SoT）: `src/lib/coconala-services.ts`

| フィールド | 用途 |
|---|---|
| `id` | `coconala-{種別}`。sales-log の productId は `coconala:{id}` |
| `status` | `draft`（未出品・非表示）/ `listed`（出品中・**/links に自動表示**）/ `full`（満枠・導線を伏せる）/ `paused`（季節オフ） |
| `serviceUrl` | 出品後の URL（`https://coconala.com/services/{n}`）。listed なら必須・照合キー |
| `price` / `priceYen` | 表示文字列 / 機械照合用。**必ず同時に更新**する |
| `weeklyCapacity` | 週の受付枠（Red Line #1「定員なし恒久添削の禁止」の機械的表明） |
| `title` | ココナラのサービスタイトル（**25字未満・末尾「ます」必須**＝ココナラ側バリデーション。出品自動化が使う） |

現行サービス（価格の実値はカタログが真実源。ここでは id と役割のみ）:

| id | 役割 |
|---|---|
| `coconala-shindan` | S1 合格診断。レビュー獲得フロント。診断のみ・書き換え案は出さない |
| `coconala-tensaku-set` | S2 添削（2テーマセット）。主力。赤入れ＋書き直し1回 |
| `coconala-sakusei` | S3 答案作成（ヒアリング→文章化・2テーマ・¥8,000）。質問シートで本人の実工事を吸い上げ答案ドラフト化（捏造禁止・本人確認必須・週2枠） |
| `coconala-sakusei-4theme` | S3+ 答案作成 上位版（4テーマ・¥16,000・週1枠）。本試験は5管理から2テーマが当日指定されるため、4テーマ備えて出題を外す事故に保険をかける商品。運用はシートを2回分受領し `--mode sakusei` を2テーマずつ2回（コード変更なし）。ちゃんさと（作成代行 2問¥16,000／4問¥32,000）の半額帯・S3 の価格アンカーも兼ねる |
| `coconala-bunseki-pdf` | C1 出題分析 PDF。**paused（2026-08-05 統廃合）**＝C10 フルパック限定収録 |
| `coconala-kanseitoan-pdf` | C2' 1級 経験記述 **模範答案セット** PDF 10冊（テーマ別5＋年度別5＝旧C2+C4 統合・¥5,000）。納品= C2 5冊+C4 5冊 |
| `coconala-2kyu-kanseitoan-pdf` | C3' 2級 模範答案セット PDF 8冊（テーマ別3＋年度別5＝旧C3+C5 統合・¥4,000） |
| `coconala-1kyu-kakomon-pdf` | C4 過去問模範答案。**paused**＝C2' へ統合 |
| `coconala-2kyu-kakomon-pdf` | C5 過去問模範答案。**paused**＝C3' へ統合 |
| `coconala-1kyu-gakka-pdf` | C6 学科記述攻略。**paused**＝C10 フルパック限定収録 |
| `coconala-2kyu-gakka-pdf` | C7 学科記述攻略。**paused**＝C11 フルパック限定収録 |
| `coconala-1kyu-moshi-pdf` | C8 1級 二次 予想模擬試験 PDF（問題冊子＋解答解説）。build-once の静的模試・Red Line #10 例外運用（計画 §4） |
| `coconala-2kyu-moshi-pdf` | C9 2級 二次 予想模擬試験 PDF（問題冊子＋解答解説） |
| `coconala-1kyu-full-pdf` | C10 1級 二次 **教材フルパック**（分析+模範答案+学科+模試・PDF 18冊・¥10,000）。顧客の買い分け混乱シグナル（2026-08-05 初受注 DM）を受けた旗艦。分析(C1)と学科(C6)はパック限定収録。納品は既存 C系 PDF をそのまま送付（新規ビルドなし）。決定ログ→展開キット §2 |
| `coconala-2kyu-full-pdf` | C11 2級 二次 教材フルパック（模範答案+学科+模試・PDF 15冊・¥7,000）。学科(C7)はパック限定。C10 の2級版 |
| `coconala-1kyu-premium` | C12 1級 二次 **プレミアム**（教材フルパック18冊 ＋ 経験記述添削2テーマ・書き直し1回・¥15,000）。純教材の天井 ¥10,000 を超える唯一の手段＝労働を足す。**weeklyCapacity=1**（添削は本番納品が未経験のため工数実測まで絞る）。決定ログ→展開キット §2 追補2 |
| `coconala-civil-keiken-kit` | K1 制作物（DLキット）テスト出品。1級・2級 施工経験記述の**自作 AI 設計キット**（Claude Code＋Node.js 前提・provision_format=2）。`status:'draft'`。公開前ゲート=(1) 納品ZIPは外部URL(note/サイト)除去版へ差替（安全弁#2）、(2) `/coconala-publish --commit`。客層が限定される test 出品 |
| `coconala-sokan-bunseki-pdf` | K2 単発PDF（テスト出品）。**総監** 記述式I-2 出題テーマ分析（provision_format=3・PDF は write_pdf 生成＝外部URL0件・`assets/pdf/coconala-sokan-bunseki.pdf`）。有料note施策バンク本文は非転載（分析/読み方に限定＝非カニバリ）。`status:'draft'`。総監はココナラ客層が薄い前提の test |

**サイト内動線（記事内 CTA）**: `/links` ハブに加え、二次系の高適合記事の末尾にサービスを文脈 CTA として出す。配線 SoT は `src/lib/offsite-cta.ts`（slug→listed サービス・note の magazine-placement.ts と直交）、描画は `OffsiteCta` コンポーネント。listed のみ発火・外部 URL に UTM 非付与・クリックは `data-cta="coconala"`（AnalyticsProvider）・1ページ最大3枚・1級/2級は slug prefix で PDF を出し分け。対応表:

| 記事 | 出すサービス |
|---|---|
| 経験記述（`secondary-experience-writing-{guide,examples}`・1級2級） | `coconala-shindan`＋`coconala-tensaku-set`（＋Brain 経験キット） |
| 二次 年度別過去問（`secondary-r0[3-9]`） | `{1kyu,2kyu}-kanseitoan-pdf`（模範答案セット）＋`{1kyu,2kyu}-full-pdf`（2026-08-05 統廃合で改配線） |
| 二次 学科分野別（1級 `secondary-(concrete\|construction-plan\|earthwork\|quality-management)-(basics\|past-problems)`） | `coconala-1kyu-full-pdf`（学科単品は paused） |
| 二次 入門・直前（1級 `secondary-getting-started`／`guide-last-minute-2026`） | `coconala-1kyu-moshi-pdf`＋`coconala-1kyu-full-pdf` |
| 二次 入門（2級 `secondary-getting-started`） | `coconala-2kyu-moshi-pdf`＋`coconala-2kyu-full-pdf` |
| 総監 記述系（`essay-*`／`pattern-essay-*`／`{h2X,r0X}-secondary`） | `coconala-sokan-bunseki-pdf`（＋Brain 施策バンク） |

未掲載（`/links` のみ）: `coconala-sakusei`／`coconala-civil-keiken-kit`（経験記述ページは診断+添削+Brain で満杯・クロップ回避のため意図的に載せない）。※模範答案セット（`{1kyu,2kyu}-kanseitoan-pdf`）は 2026-08-05 統廃合で年度別過去問記事の CTA へ配線済み。

### 2.1b 出品投入 SoT: `.claude/config/coconala-listings.json`

出品フォームへ流し込む本文・カテゴリ・納期・ジャンルの機械可読 SoT（`coconala-publish/edit` が serviceId で引く）。**価格・タイトル・状態・URL はカタログ（2.1）が真実源＝ここに価格を書かない**（安全弁§4）。

| listings[id] のキー | 意味 |
|---|---|
| `category` | `{ master, sub, type }`（value）。実機確定＝12 学習指導・資格・キャリア相談 / 254 資格取得・国家試験の相談 / 764 技術士・技術系資格の取得相談。`_labels` は可読メモ |
| `genreFacets` | ジャンル facet の value 配列（※必須）。実機確定＝`["256"]` 学習方法アドバイス |
| `provisionFormat` | 提供形式ラジオ（1=テキスト完結 / 2=制作物 / 3=PDF）。既定 1 |
| `catchphrase` | キャッチコピー（15〜30字目安） |
| `deliveryDays` | お届け日数 |
| `body` / `purchaseNote` | サービス内容（≤1000字）/ 購入にあたってのお願い（≤500字・ともに※必須） |
| `faq` / `options` | v1 では自動投入しない（保持のみ・公開後に UI 手動） |

> カテゴリ/価格/facet の value が coconala 側でリニューアルされたら `node scripts/coconala-discover.mjs --advance --cat 12 --sub 254 --type 764` で現行 options を再取得して是正する。

### 2.2 受注実績: `.claude/state/coconala/orders-log.json`（v2）

`{ version, updatedAt, currency, source, privacyNote, howToUpdate, schema, orders: [] }`

| orders[] のキー | 意味 |
|---|---|
| `date` | 販売日（ISO 日付）。snapshot の `soldOn` と一致必須 |
| `serviceId` | カタログの id と一致必須。見積り受注では**どの商品から仕立てたかの基準商品** |
| `quote` | **見積り（カスタム提案）受注のときだけ**置く `{ amountYen, basis, proposedAt, purchasedAt }`。詳細は下の [!note] |
| `talkroomId` | **必須**。ココナラのトークルーム ID（`https://coconala.com/talkrooms/{id}`）＝取引の一意キー・突合キー。これが無いと後からどの取引か辿れない |
| `priceYen` | 販売額（手数料差引前）。カタログと不一致なら要説明（価格改定時は memo に改定日）。見積り受注は `quote.amountYen` と一致必須 |
| `grade` | 1 or 2（級）。級の無い商品は null |
| `status` | `received` → `delivered` → `revised`（書き直し対応）→ `closed`（**購入者評価まで送信済み**） |
| `replyDueAt` | 返信期限（**無連絡で自動キャンセル**になる時刻）。snapshot が拾えたら転記 |
| `deliveredAt` | 納品した日時（ISO）。未納品は null |
| `artifacts` | 納品した成果物 `[{ file, sha256, builtAt }]`。**どの版を送ったかを特定するため** |
| `tensakuMinutes` | 最終赤入れの所要時間（工数の実測・定員判断の根拠）。C系 PDF は null |
| `rating` | 出品者→購入者の評価を送ったら記録 `{ providerRatedAt, stars{overall,demand,communication,schedule}, commentChars, comment, dueAt, verified }`。公開・取消不可なので**送った文面そのもの**を残す |
| `memo` | 任意。**個人情報・原稿本文は書かない** |

> **記録しないもの**: 購入者名・購入者 ID・提出原稿・トークルーム本文（privacyNote）。事例化は匿名化して
> `docs/note/1級・2級土木/メンバーシップ/添削事例アーカイブ/` へ（1対多の資産化）。

> [!note] 見積り（カスタム提案）受注の記録（2026-08-06 初発生）
> 出品ページ経由でない**見積り提案からの受注**は、定価と違う額で成立するのが正しい取引形態のため、
> `priceYen` とカタログ定価の一致検査（`check-coconala-wiring` 規則3）に構造的に引っかかる。
> かといって検査を外すと**価格改定の取り残し**を検知できなくなる。そこで検査を**消さずに差し替える**:
> `quote` があるときは「カタログ定価と一致」ではなく「`quote.amountYen` と一致」＋「`basis` が空でない」を検査する。
> `basis` を必須にするのは、**値引きミスと正当な見積りを後から区別する**ため。
> `serviceId` には基準商品（何から仕立てたか）を入れる＝商品別の売上集計が壊れない。
> 初例: フルパック `coconala-1kyu-full-pdf`（¥10,000・18冊）から購入済みの模試（¥2,500・2冊）を
> 差し引いた ¥7,500・16冊（room 18091375）。
>
> **販売日はココナラ側で表示が割れる**。同じ取引で 取引一覧＝`2026/08/06`・トークルーム取引詳細＝`2026年8月5日`
> だった（コンビニ払いで購入と入金完了に日をまたぐラグが出たため）。`date` は**突合キーである一覧側**
> （＝`snapshot.soldOn`）に合わせ、もう一方の日付は memo に残す。

> [!important] `artifacts` を必ず埋める理由（2026-08-05）
> C8 の初受注では、**販売の翌朝に納品 PDF を作り直した**（記入欄の行数と答案例の字数を是正）。
> 何を送ったかを残さないと「顧客が持っているのは旧版か新版か」が永久に分からなくなる。
> C系 PDF は送付時に `file` と `sha256` を記録する。

### 2.2b 受注の実体: `.claude/state/coconala/orders-snapshot.json`（read-only 収集）

`npm run coconala-orders`（`scripts/coconala-orders.mjs`・Playwright・**書き込み一切なし**）が
取引管理（出品）の全タブを走査して生成する機械可読スナップショット。orders-log が「こちらの記録」、
snapshot が「ココナラ側の実体」で、`npm run check-coconala-orders` が `talkroomId` で突合する。

`{ version, fetchedAt, status, source, privacyNote, scan: { tabs[], tabsOk, tabsTotal, deadlineFailed }, orders: [] }`

| orders[] のキー | 意味 |
|---|---|
| `talkroomId` / `talkroomUrl` | 取引の一意キー。エージェントはこの URL で会話を辿る |
| `tab` / `tabLabel` | どのタブで見つかったか（`required`/`requests`/`open`/`closed`/`canceled`） |
| `serviceId` | カタログ `title` の**前方一致**で解決（表示名＝サービス名＋キャッチ）。解決できなければ null で警告 |
| `priceYen` / `soldOn` / `statusLabel` / `deliveryDueSet` / `lastMessageAt` | 一覧から抽出 |
| `unreplied` | `open?message_status=2`（未返信タブ）に居るか |
| `replyDueAt` | 自動キャンセル期限。**一覧に出ないのでトークルームを開いて拾う**（未返信の room のみ・最大10件） |

**`inquiries[]`（購入前の問い合わせ＝ダイレクトメッセージ）**: 受注（トークルーム）とは**別系統**。
`{ dmId, dmUrl, dateText, subject, serviceId, unread }`。`subject` は引用されたサービス名だけを採り、
`serviceId` はカタログ title の前方一致で解決する。**スレッドは開かない**（開くと未読→既読になり、
人が気づく手段を壊すため）。DM 一覧 = `/message?fromMyPage=true`、行 = `a.c-messageItemWrap[href="/mypage/direct_message/{id}"]`。

> [!warning] 受注一覧だけ見ていると DM を落とす（2026-08-05）
> C8 の購入者から **DM で別商品（C1）の購入前質問**が届いたが、受注一覧しか見ていなかったため
> 機械では拾えず、人が気づいて指摘した。DM は売上機会そのものなので必ず一緒に採る。

**実機確定（2026-08-05）**:
- タブ URL = `/mypage/received_orders/{required,requests,open,closed,canceled,flags}`（`close` は 404）
- 行 = `.d-providerTalkroomCassetteBlock`。**PC/SP が二重描画される**ので `talkroomId` で dedupe する（素の行数を件数として信じない）
- トークルームは `/talkrooms/{id}`（`/mypage/talkrooms/{id}` は 404）
- 期限は本文の `期限 M/D HH:MM`（年の表記が無いので販売日の年を採る）

**§4「ダッシュボードはスクレイプしない」との関係**: あちらの対象は **KPI（閲覧数・お気に入り）＝手動貼付が正**。
こちらは**取引の実在**（何が・いつ・いくらで売れ・どのトークルームか）で、金銭と納品に直結し人手転記では
取りこぼす。read-only・低頻度・書き込みなしでスコープが直交する。

### 2.3 市場調査: 2層（生データ + エージェント参照サマリー）

競合の一次データを **2層** で管理する。**エージェントは軽量サマリーを SSOT として read し、生データは深掘り時のみ read する**。

| 層 | ファイル | 役割 | サイズ |
|---|---|---|---|
| **エージェント参照 SSOT** | `.claude/state/coconala/market-summary.json` | キーワード別の価格分位・セグメント内訳・レビュー数トップ5 に畳んだ派生物。**着手時はまずこれを read** | 約 8KB |
| アーカイブ（生データ） | `.claude/state/coconala/market-research.json` | 全出品の実測明細。個別出品の説明文・オプションまで見たいときだけ read | 約 700KB |

- **再取得（実測）**: `npm run coconala-research`（＝`scripts/coconala-research.mjs`・Playwright）。生データ更新後にサマリーも自動再生成。
- **サマリーだけ再生成**: `npm run coconala-summary`（＝`--summary-only`・Playwright 不使用・生データから畳むだけ・秒で終わる）。
- **公開・ログイン不要ページの read-only 調査**で、§4 の「ダッシュボードはスクレイプしない」とは**スコープが直交**する（あちらは自社 KPI＝ログイン必須・規約と bot 検知の懸念。こちらは公開検索ページを低頻度〔商品設計時＝数ヶ月に1度〕に読むだけ・書き込みは一切しない）。

`market-summary.json` = `{ version, generatedAt, fetchedAt, source, note, keywords: [{ keyword, totalHits, collected, priceYen: {min,median,mean,max}, segments, topByReviews: [{title,seller,priceYen,rating,reviews,segment,url}] }] }`

生データ `market-research.json` = `{ version, fetchedAt, method, note, queries: [{ keyword, resolvedUrl, pageType, totalHits, pagesScanned, services: [...] }] }`

`{ version, fetchedAt, method, note, queries: [{ keyword, resolvedUrl, pageType, totalHits, pagesScanned, services: [...] }] }`

| services[] のキー | 意味 |
|---|---|
| `title` / `catchphrase` / `excerpt` | 出品タイトル・キャッチ・説明抜粋 |
| `priceYen` / `rating` / `reviews` / `seller` / `url` | 実測値（DOM から直接。WebFetch の LLM 要約ではない） |
| `segment` | 機械分類: `daiko`（答案作成＝2026-07-18〜 S3 で出品・捏造禁止の建て付け）/ `tensaku`（添削）/ `shindan`（診断）/ `soudan`（相談・指導）/ `kyozai`（教材）/ `other` |
| `detail` | 上位N件のみ: `deliveryDays` / `totalSales` / `description` / `hasOptions` |

> **ページ形式が2種類**（実測 2026-07-16）: `/search?keyword=X` は検索結果（カード `.c-serviceListItem`）。ただし
> **「技術士」「土木施工管理技士」等カテゴリ名と完全一致するキーワードは `/categories/{a}/{b}` へ 301**（カード `.c-serviceBlockItem`・冒頭の `.c-recommendItem` はおすすめカルーセルで本体リストではない）。スクリプトは両対応。

散文の分析結果は [ココナラ展開キット.md](../../../docs/note/1級・2級土木/ココナラ展開キット.md) §1。

### 2.4 KPI: `.claude/state/coconala/kpi-log.json`

`{ version, updatedAt, source, howToUpdate, weekly: [...], blogsWeekly: [...], milestones, sellerRank, notificationMailbox }`

| 配列 | 1行 |
|---|---|
| `weekly` | `{ weekOf, serviceId, views, favorites, orders, period:{from,to}, windowDays, cumulative, source }` |
| `blogsWeekly` | `{ weekOf, slug, blogId, title, views, postedOn, period, windowDays, cumulative, source }` |

`weekOf` は ISO 週初（月曜）。読み取れない数値は `null`（推測で埋めない＝欠測として扱う）。
`source: 'analytics-auto'` は §4 の自動取得由来。`weekOf` + `serviceId`（ブログは `slug`）で upsert するので再実行しても二重計上しない。

> **`cumulative: true` の意味**: 数値は `period` 区間の**累計**（既定は過去30日間のローリング）であって
> 週次の増分ではない。前週行との引き算で「今週の伸び」を出してはいけない（区間が26日重なる）。

### 2.5 分析スナップショット: `.claude/state/coconala/analytics-snapshot.json`

`npm run coconala-analytics` の出力＝ココナラ分析画面の実体。`{ fetchedOnJst, status, period{services,blogs}, totals, services[], skipped[], blogs[], scan }`。

- `status: 'partial'` は「取得できなかった対象がある」＝件数を全件として扱わない
- `services[].ok:false` は 0 件ではなく**欠測**（数値は `null`）
- `skipped[]` は公開中でない（`paused`）ため分析ページが構造的に無いもの。黙って落とさず残す
- `masked` は画面が `0000` でマスクした指標（セラーサクセス未加入の表示数）。0 ではなく `null`

## 3. 受注フロー（`/coconala-order`）

```
購入通知 → npm run coconala-orders（実体を取得＝何が売れたかを推測しない・§2.2b）
  → 初回挨拶＋シート送付（定型文・キット §4c → §4/§4b）
  → 受領 → scratchpad/.tmp に .md 保存（★リポジトリに置かない・C系は不要）
  → /coconala-order <serviceId> <path>
      ├ カタログ status 確認（draft なら停止・full なら警告）
      ├ serviceId でタイプ分岐:
      │   S1 診断  → /keiken-tensaku --mode shindan → 診断下書き.md（A/B/C＋ワースト3・書き換え文なし）
      │   S2 添削  → /keiken-tensaku            → 添削下書き.md（NG→OK 2点）
      │   S3 作成  → 宣誓/素材検査→/keiken-tensaku --mode sakusei → 答案ドラフト.md（事実確認チェックリスト）
      │   C系 PDF → ヒアリング不要・キット §4c「C系 PDF 送付」文＋該当PDF特定
      ├ 納品文面ドラフト生成
      └ orders-log へ append（status: received・**talkroomId 必須**・replyDueAt を転記）
  → npm run check-coconala-orders（記録漏れ・金額ズレ・返信期限を機械で確認）
  → ★運営者: 最終赤入れ/事実確認（10〜30分・C系は送付のみ）→ トークルームへ送信
  → orders-log を delivered へ・deliveredAt/artifacts（送った版の sha256）・tensakuMinutes 記録
  → （書き直し依頼時）/keiken-tensaku を前回下書きと再実行し差分中心に再チェック → status: revised（1回まで）
  → 共通の誤りは匿名化して添削事例アーカイブへ
```

添削3ステップ（字数→論点抽出→最終赤入れ）の真実源は [2級経験記述-添削テンプレ.md](../../../docs/note/1級・2級土木/2級土木/2級経験記述-添削テンプレ.md)。トークルーム定型文（初回挨拶・シート送付・C系 PDF 送付・満枠断り・書き直し受付・S1 診断返却テンプレ）は [ココナラ展開キット.md §4c](../../../docs/note/1級・2級土木/ココナラ展開キット.md)、S2 納品文面テンプレは `.claude/agents/coconala-operator.md`。

## 3-1. 受注に気づく経路（通知メールの宛先）

**ココナラの取引通知は `dobokunotecom@gmail.com`（出品アカウント dobokunote の登録アドレス）にだけ届く。**
購入者アカウント `uruhayato373@gmail.com` の受信箱には**取引通知が1通も来ない**（届くのはクーポン・
くじ等のマーケティングメールのみ。2026-08-11 に全期間・迷惑メール含めて実査）。
Gmail コネクタが繋がっているのは `uruhayato373` 側なので、**そこを見ても受注に気づけない**。

- 取引関連メールの受信は**ココナラ設定で必須**（解除不可）＝送られていないのではなく宛先が別
- サブメールアドレス欄（`/mypage/email`）は**未設定**。ここに入れれば両方へ届く
- `dobokunotecom` は Playwright プロファイル `.local/playwright-note-profile` にログイン済み
  （2026-08-11）。`mail.google.com` を開けば読める。セッションが切れたら人がログインし直す

受注の取りこぼしを防ぐ主経路は**サイト側の実体収集**（`npm run coconala-orders` → `check-coconala-orders`）で、
メールは補助。不在期間があるときは特に、メール到達に依存しないこと。

## 3-2. 購入者評価（出品者→購入者）

取引がクローズすると**評価入力の依頼メールが届く**（宛先は出品アカウントの登録アドレス
`dobokunotecom@gmail.com`。購入者アカウント `uruhayato373@gmail.com` には**取引通知は一切来ない**ので
そちらを見ても気づけない）。期限は概ね取引完了から2週間。

**実機仕様（2026-08-11 確定）**

| 項目 | 実体 |
|---|---|
| URL | `/ratings/provider_add/{talkroomId}`（トークルームの「評価を入力する」は同 URL への `<a>`。DOM の `.click()` では開かないことがあり URL 直打ちが確実） |
| 必須 | 4項目＝総合評価（**公開**・コメント400字）／要望のわかりやすさ／コミュニケーション／納期・スケジュール（後ろ3つは非公開・平均値のみ表示） |
| 星 | radio ではない。`span.rating-star-input.js_rating-*` 配下の `img[alt="1..5"]` をクリック → hidden の `input[name=score]` に入る |
| 送信 | 「確認する」→ 確認画面（`修正する` / `送信する`）→ 送信の二段構え |
| 公開条件 | 評価期限内は**双方の評価が揃うまで相手に公開されない**。期限超過で入力した側のみ公開 |

```bash
npm run coconala-rate-buyer -- <talkroomId> <コメントtxt>            # 入力のみ（既定）
npm run coconala-rate-buyer -- <talkroomId> <コメントtxt> --submit   # 送信
```

**安全弁**: 既定は入力までで停止（draft-first）／星の読み戻しが全て 5 でなければ中断／400字超は事前中断／
確認画面の送信ボタンは既知の名前だけを押す（盲目クリックしない）／送信後にトークルームで
「評価未入力」が消えたことを実査。**星は 5 固定**なので、5 をつけたくない取引では使わず人が UI で入力する。

**文面の作り方**: やり取りの実体（トークルームのログ）から拾った事実だけで書く（捏造禁止）。
定型の一文で終わらせず、その取引で実際に起きたことを1つ以上入れる。同一顧客の複数取引では
文面を書き分ける（同じ文が並ぶと機械的に見える）。

## 4. KPI 週次運用（`/coconala-analytics` → `/coconala-status`）

1. ココナラの分析画面を**read-only で自動取得**する（`npm run coconala-analytics -- --append-kpi` → `npm run check-coconala-analytics`）。手動貼付も引き続き可
2. kpi-log へ週次 upsert ＋ orders-log から受注サマリ
3. 判定:
   - **撤退ライン**: 出品4週で S2 受注3件未満 → 投資停止・看板維持のみ（キット §6）
   - **価格引き上げ**: 4週で S1+S2 合計5件以上 → S2 の引き上げを検討（評価20件が目安）
   - **工数警告**: `tensakuMinutes` 平均が30分超 → `weeklyCapacity` 引き下げ
   - **満枠**: 当週受注が `weeklyCapacity` 到達 → `status: 'full'` flip を提案
4. 売上は月次で orders-log（closed）→ sales-log へ転記（`coconala:<id>`・[sales-tracking.md](sales-tracking.md)）

> **2026-08-17 方針変更（旧: ダッシュボードはスクレイプしない）**
> 自社 KPI は長らく「手動貼付が正」としていたが、貼付が続かず `kpi-log.weekly` は**14週間 0 行**のまま
> だった（初受注 08-04・出品 07-16 を経ても撤退ライン判定の素地が無い）。運用が回らない安全策は
> 安全ではないので、**ログイン必須の自社分析画面も read-only で自動取得する**（ユーザー判断）。
> 安全弁は受注収集（§2.2b）と同じ＝`assertAccount`・低頻度（週次）・**書き込み操作なし**
> （メモ追加・期間変更・出品操作をしない）。取得は `/coconala-analytics`。
>
> 変わらない線引き: **公開ページの競合調査**（`npm run coconala-research`・§2.3）は商品設計の一次データで、
> こちらは自社実績。両者は依然スコープが直交する。
>
> 外部 API 遮断（[[feedback_metrics_cicd_supplied]]）との関係: あれは**会社PCから外部 API を叩けない**話。
> ココナラ分析はブラウザセッションで読む画面なのでプロキシの制約に当たらない。

## 5. 安全弁

1. **捏造禁止（Red Line #2・2026-07-18 再定義）** — 経験していない工事・事実・数値を創作しない。答案作成（S3）は**本人の実工事のヒアリング事実のみ**から構成（宣誓＋本人の事実確認を必須・欠落数値は `〇〇` プレースホルダ）。旧「代筆禁止＝作成代行は出品しない」を改訂（真実源 → noteコンテンツ計画 §Red Line #2）
2. **外部誘導禁止（ココナラ規約）** — ココナラ向け文面に note・doboku-note.com の URL を書かない。導線は逆向き（サイト/note → ココナラ）のみ。**出品文面・トークルーム・納品PDF だけでなく「ブログ」にも及ぶ**（ブログ投稿エディタが「外部サービスのリンクを記載する行為」を禁止と明示・§9.1）＝ブログを自サイト集客に使う設計は成立しない
3. **出品・修正は自動化・返信送信は運営者** — 出品・内容修正・価格反映は `/coconala-publish`（account assert＋draft-first＋`--commit` gate）で行う。一方**トークルームの返信送信・購入者対応は運営者（人間）**。「（購入者へ）送信した」と報告しない。バリデーションエラー時は「公開した」と言わない
4. **価格の直書き禁止** — 真実源はカタログ。文面に価格を出すならカタログから転記し、改定はカタログ→キットの順で同一 commit
5. **個人情報の非コミット** — 提出原稿・購入者名をリポジトリに置かない
6. **AI 下書き注記の残存禁止** — 添削下書きの注記が残った文面を納品しない
7. **合格保証表現の禁止** — 改善効果の表現まで

## 6. ドリフト検知（`npm run check-coconala-wiring`）

`scripts/check-coconala-wiring.mjs`（pre-commit・`--staged` で関連 staged 時のみ発火）。決定論的検査＝CLAUDE.md 原則5。

| # | 検査 | 落ちる例 |
|---|---|---|
| 1 | listed は serviceUrl 必須（`https://coconala.com/services/{n}`） | 出品したのに URL 未記入で /links が空リンクを出す |
| 2 | orders-log / kpi-log の serviceId がカタログに実在 | typo・退役サービスの記録 |
| 3 | orders-log の priceYen がカタログと一致 | 価格改定の取り残し |
| 4 | sales-log の `coconala:<id>` がカタログに実在 | 売上の productId 命名ミス |
| 5 | listed があるなら account の profileUrl が非空 | 出品済みなのにアカウント SSOT が空 |
| 6 | 一度も出品していない（`draft` かつ `listedAt` 未設定）サービスに受注/KPI 実績が無い | 未出品なのに閲覧・販売が立つ論理矛盾（ダミー値の混入・serviceId 取り違え）。※ listed 後に `paused`/`draft` へ戻した場合は `listedAt` が残るので誤検知しない |

> 出品したら**カタログを先に更新**（`status: 'listed'` ＋ `serviceUrl` ＋ `listedAt`）してから KPI・受注を記録する。
> 順序を逆にすると検査6で落ちる（＝実績の記録先を間違えていないかの早期検知）。

### 6.2 受注の突合（`npm run check-coconala-orders`・2026-08-05 新設）

snapshot（§2.2b＝ココナラ側の実体）と orders-log（こちらの記録）を `talkroomId` で突合する**オフライン検査**。
取得は `npm run coconala-orders` が担当で、こちらはネットワークに出ない。

| # | 検査 | 落ちる例 |
|---|---|---|
| 1 | snapshot の取引が orders-log に存在 | **売れたのに記録が無い**（人手の追記もれ） |
| 2 | serviceId / priceYen / 販売日 が一致 | 商品の取り違え・価格改定の取り残し |
| 3 | 未返信かつ返信期限が 24h 以内 or 経過 | **48時間無連絡で自動キャンセル**を落とす |
| 3a | `statusLabel:'納品確認待ち'` の期限は**要対応に混ぜない**（`level:'buyer-confirm'`・別枠で surface） | 正式な納品の後、同じ「返信期限」が**買い手の承諾期限**に変わる。混同すると**対応不要の取引が緊急として立つ** |
| 3b | 購入前の問い合わせ（DM）を要対応に surface | 受注一覧だけ見て**購入前の質問を落とす**（＝売上機会の逸失） |
| 4 | `status:'received'` のまま 5 日超 | 納品の滞留 |
| 5 | orders-log にあって snapshot に無い | talkroomId の誤り |

DM は突合相手が無いので**存在の surface に徹する**（未読/既読と対象商品を出すだけ・自動で開かない）。
DM 一覧の取得に失敗したら警告を出す（「問い合わせ 0 件」と「見ていない」を区別する）。

> [!important] 「返信期限」は正式な納品の前後で**意味が反転する**（2026-08-06 実測）
> | 局面 | 期限の主語 | 無反応だとどうなるか | 扱い |
> |---|---|---|---|
> | 納品前 | **出品者** | **取引が自動キャンセル**（売上が消える） | 要対応 |
> | 納品後（`納品確認待ち`） | **買い手** | 自動的に「承諾」（差し戻しは1回のみ可） | 対応不要・別枠で surface |
>
> UI 上は同じ枠・同じ「返信期限」の文字列で出るため、`statusLabel` で区別しないと
> **出品者が何もしなくてよい取引が緊急として立つ**。長期不在中は「売上が消えるかも」と
> 誤読させるので実害がある。未知の `statusLabel` は出品者側として扱う（surface する方が安全）。
> 判定は `classifyReplyDeadlines`、境界は `tests/coconala-guards.test.mjs` で固定。

> [!note] 「正式な納品」はボタンではなく**チェックボックス**（2026-08-06 実測）
> メッセージ入力欄の左下に `☐ 正式な納品` があり、**チェックしたままメッセージを送信**して初めて成立する。
> チェックだけでは何も起きず、**ページを再読み込みすると外れる**。送信直前に入れること。
> 成立すると `statusLabel` が `納品確認待ち` に変わる（一覧の「完了」タブに入るのは買い手の承諾後）。
> ファイルを送っただけでは取引は進まず、納品予定日を過ぎると `納品日超過` になる。

**「検査ゼロを PASS と呼ばない」**（[[feedback_gate_zero_coverage_false_pass]]）:
snapshot が **無い / `status:'partial'` / 7日より古い** ときは **exit 2＝検査不成立**で、
「取引 0 件だから緑」と区別する。出力は常に `実検査 ココナラ側 N 件 / orders-log M 件` の形で件数を出す。

pre-commit では `--staged --no-freshness` で走り、**exit 1（実際の不整合）だけを止める**。
exit 2（snapshot 欠落・陳腐化）で commit を止めると、無関係な作業のたびに Playwright 実行を
強いることになり SKIP が常態化するため。鮮度ゲートは週次の `/coconala-status` 側で効かせる。

## 7. サイト導線（/links）

`src/app/links/page.tsx` の `CoconalaSection` が `listedCoconalaServices()` を参照し、**listed が0件なら描画しない**（wire-ahead＝出品前に配線だけ済ませておける）。ココナラ側 URL に UTM は付けない（計測がココナラ内で完結せずパラメータが露出するだけのため）。

## 8. 出品・修正の自動化（`/coconala-publish`・2026-07-18 新設）

note-publish 流儀の決定的 Playwright。ログイン済みプロファイル `.local/playwright-coconala-profile`（初回のみ headed で手動ログイン）。

| スクリプト | 役割 |
|---|---|
| `scripts/coconala-publish.mjs --service <id> [--commit]` | 新規出品。`/services/add`→種別=テキストチャット→「内容の入力に進む」で下書き生成→フォーム充填→下書き保存（既定）/公開（`--commit`）→公開時カタログへ `listed`＋`serviceUrl`＋`listedAt` 書き戻し |
| `scripts/coconala-edit.mjs --service <id> [--fields …] [--commit]` | 既存修正。カタログ＋listings の現値でフォーム再充填。`--fields price,delivery` 等で部分更新 |
| `scripts/coconala-delete-draft.mjs --id <n[,n]> [--allow-duplicate] [--commit]` | **空の下書き（orphan draft）を安全に削除**。4重ガード（G0 カタログ在籍拒否・G1 URL一致・G2 タイトル空・G3「下書きを削除」導線＝公開商品には出ない）。既定 dry-run・実削除は `--commit`。公開中商品は構造的に誤爆しない。**G2b（2026-08-12）**: publish は毎回 `/services/add` を叩くため「draft 実行→commit 実行」で**サービスが2件でき draft 側が孤児になる**。この孤児だけは「タイトルが listed 商品と一致（末尾ます剥がしで正規化）かつ別 id」で一意に判定でき、`--allow-duplicate` で削除できる。作りかけの題名付き下書きは従来どおり触らない |
| `scripts/coconala-orders.mjs [--no-deadline] [--headless]` | **受注実績＋購入前問い合わせ(DM) の read-only 収集**（§2.2b）。取引管理（出品）の全タブ＋未返信タブ＋DM 一覧を走査し、未返信 room の返信期限をトークルームから拾って `orders-snapshot.json` を生成（DM スレッドは開かない＝既読にしない）。**書き込み一切なし・個人情報を保存しない**。1タブでも取得失敗なら `status:'partial'` ＋ exit 2 |
| `scripts/coconala-pause.mjs [--resume --absence \| --archive --all-retired \| --all-paused] [--commit]` | **受付休止 / 再開 / アーカイブ**の決定的操作。対象選択とガードは `scripts/lib/coconala-guards.mjs`（`tests/coconala-guards.test.mjs` で固定）＝休止は `paused` のみ・再開は `listed` のみ・アーカイブは `pauseReason:'retired'` のみを受け付ける。既定 dry-run。実行後は一覧を再読して `stop_fg`（アーカイブは一覧からの消失）を**実測で検証**。**一覧は1ページ10件でページ送り**するので対象の載るページを探してから操作する（1ページ目しか見ないと11件目以降が「見つからない」に化ける）。`--resume --absence` はカタログの `listed` 戻しとマーカー除去まで行う |
| `scripts/coconala-discover.mjs [--advance] [--cat --sub --type]` | フォーム構造・selector・カテゴリ/価格/facet options の偵察（読み取り専用）。仕様ドリフト時の再校正用 |
| `scripts/coconala-blog-publish.mjs --post <slug> [--commit]` | **ブログ記事**の下書き投入/公開（§9・`/coconala-blog`）。投入前に同名記事を検出（オートセーブ残骸の二重投稿防止）→ guards 全通過→ 2パス入力→ **DOM 実測**（本文90%・見出し適用・順序一致・カード枚数・一覧実在）→ `--commit` で公開→ ログアウト実査（G6）→ frontmatter 書き戻し |
| `scripts/coconala-blog-delete-draft.mjs [--title <部分一致> \| --all] [--commit]` | ブログの**下書きだけ**を削除（公開中は `statusDraft` を持たないため構造的に対象外）。中断のオートセーブ残骸の掃除。既定 dry-run・削除後に一覧再読で実測 |
| `scripts/scout-coconala-blogs.mjs [--query <q>]` | ブログ検索/競合ブログ一覧の read-only 偵察（四半期）→ `blog-competitors.json` |
| `scripts/check-coconala-blog.mjs [--staged\|--json]` | ブログ記事 SoT のオフライン検査（ハードゲート＋公開整合＋送客先ドリフト）。pre-commit / quality:audit / 週次に配線 |
| `scripts/coconala-profile.mjs [--commit]` | プロフィール（職業/アピール/自己紹介）を `coconala-account.json` の値へ反映。**プロフィール編集（/mypage/user）はインライン編集型**（フィールドは初期描画に無く、セクション見出し近傍の鉛筆 `.d-profileItemControlButton` クリックで展開・2026-07-20 UI 変更対応済み）。ナビ誤爆は URL 不変 assert で検知 |
| 共有 `scripts/lib/coconala-{session,form}.mjs` | プロファイル起動・login 待ち・account assert・カタログ/listings 解析・フォーム充填 |

**商品画像（サービスサムネ）**: ブランド流儀＝AI で「文字なし雰囲気写真」を生成 → satori で日本語文字を正確に重ねる（AI に日本語を焼き込ませない）。

| スクリプト | 役割 |
|---|---|
| `scripts/gen-image-gemini.mjs --out <png> --prompt "..."` | Gemini 画像 API（`gemini-2.5-flash-image`・`.env.local` の `GEMINI_API_KEY`）で背景写真を生成。**API 課金・1呼び出し=1枚**。プロンプトは brand-image-system §5 準拠（明るく低コントラスト・青トーン・文字/人物なし・左に文字余白） |
| `scripts/coconala-thumb.mjs [--service <id>] [--bg <png>]` | 背景＋タイトル/訴求/価格/ブランド色を satori で 1200×900（4:3）合成。コピーは `THUMB_COPY`（サムネ用の短文）＋カタログ priceYen（オプション有=「〜」）。出力 `.claude/config/coconala/assets/thumb-<id>.png` |

素材は `.claude/config/coconala/assets/`（`bg-civil.png`＝生成背景の保存・再生成の課金回避／`thumb-*.png`＝合成結果）。

> [!important] 長期不在（旅行・出張）は**全件 受付休止**が既定（2026-08-05 制定）
> ココナラは**購入から48時間以内に出品者がトークルームで連絡しないと取引が自動キャンセル**される。
> **PDF 商品も手作業で送付する**ので「無人で売れる商品」は1つも無く、例外を作れない。
> 「スケジュール」欄（プロフィール編集 `/mypage/user?anchor=schedule`）は**自由記述600字の表示だけで購入を止めない**——休暇モードは存在しない。止める手段は受付休止のみ。
>
> 手順（カタログが常に意図の真実源）:
> 1. 出発前: listed を `'paused'` ＋ **`pauseReason: 'absence'`（＋`resumeOn`）** にして
>    `npm run coconala-pause -- --all-paused --commit`
> 2. 復帰時: **`npm run coconala-pause -- --resume --absence --commit`** の1コマンド
>    （`pauseReason:'absence'` のものだけカタログを `listed` へ戻し、マーカーを消し、live も reopen して実測検証する）
>
> どちらも実行後に `stop_fg` を実測検証する。**レビュー0の段階で自動キャンセルを踏むと致命的**なので、
> 売上機会の逸失より取引事故の回避を優先する。初回適用＝2026-08-06〜08-16（17件休止）。

> [!important] 公開済みサービスは**削除できない**。棚から消すのはアーカイブ（2026-08-05 実機確定）
> 削除導線があるのは**空の下書きだけ**（`coconala-delete-draft.mjs` の「下書きを削除」）。
> 公開済みサービスの選択肢は「受付休止」と「アーカイブ（非表示）」の2つで、差は決定的:
>
> | | 受付休止 | アーカイブ |
> |---|---|---|
> | 検索・カテゴリ・**プロフィール一覧** | 「休止中」で**残る** | **消える** |
> | サービス詳細 | 休止中・購入不可 | **「受付終了」**・購入不可 |
> | URL / 評価 / トークルーム | 残る | 残る（404 にしない仕様） |
> | 出品サービス管理の一覧 | 残る | **消える** |
>
> **解除導線は実機で見つからなかった**（`?archive=1` 等も不発）＝**実質片道**。
> したがって **`archivedAt` は `pauseReason:'retired'`（恒久廃止）にのみ使う**。
> 一時休止（`absence`）をアーカイブしないよう `coconala-pause --archive` は retired 限定でガードしている。
> アーカイブは「一覧に居ない＝既にアーカイブ済み」を skip 扱いにして冪等（初回実装で ng 誤検知した）。
> 実行: `npm run coconala-pause -- --archive --all-retired --commit`
> 初回適用＝2026-08-05（統廃合した C1/C4/C5/C6/C7 の 5 件・公開ページで「受付終了」を実測確認）。

> [!important] `paused` は多義なので `pauseReason` で必ず区別する（2026-08-05 制定）
> 同じ `status:'paused'` に**2つの理由**が同居する:
>
> | pauseReason | 意味 | 復帰 |
> |---|---|---|
> | `'retired'` | 商品整理で恒久廃止（2026-08-05 統廃合の C1/C4/C5/C6/C7） | **させない** |
> | `'absence'` | 運営者の長期不在による一時休止 | `--resume --absence` で戻す |
>
> 区別が無いと**一括復帰で恒久廃止した商品まで復活し、統廃合が巻き戻る**。
> 17件を全休止したときに実際に取り違えかけたため、機械可読フィールドとして固定した。
> `check-coconala-wiring` が ①paused なのに理由なし ②未知の理由 ③listed なのに理由が残存 を落とす（変異テスト済み）。
> **`--resume --all-listed` は使わない**（理由を見ないため retired を巻き込む）。

> [!warning] 価格は「刻み」に従う（2026-08-05 実機確定）
> **¥10,000 以下は 500 円刻み／超は 1,000 円刻み**。`¥9,800` `¥4,980` のような端数は**フォームに入力できず** publish がガードで拒否する（`ABORT: priceYen ... はココナラの価格刻みに不一致`）。カタログの `priceYen` を決めるときは先にこの刻みへ丸める。

**画像の差し替え（`--replace-image`・2026-08-05）**: populated スロットの削除ボタン `a.js_delete-button` は **width/height が 0**（hover 依存）で通常クリックできない。Playwright の actionability を迂回する `dispatchEvent('click')` で削除→再アップロードする（`replaceImage` in coconala-form.mjs）。各スロットが持つ `input[type=file][data-service-image-id]` へ直接 `setInputFiles` する方式は **AJAX が発火せず失敗する**（試行済み）。

**アップロード（自動化済み・2026-07-18）**: `node scripts/coconala-edit.mjs --service <id> --service-id <n> --image <png> --commit`。「画像を追加」（`a.js_upload-…`・javascript:;）クリックで隠し file input（`data[UploadedFile][n1][image_files]`）が出現→setInputFiles→**トリミングモーダルなし**でスロットに直接入る（populated 判定＝`a.js_delete-button` の数）。既に画像があれば skip（`--force-image` で追加）。`--image` かつ `--fields` 無しなら**画像だけ更新**（本文フィールドは触らない）。

> [!warning] `--image` のパス解決と orphan draft（2026-07-18 事故→恒久対策）
> `--image` の **bare 名**（例 `thumb-x.png`）は `.claude/config/coconala/assets/` に解決される（`resolveImagePath`・session lib）。以前は cwd 相対で解決したため不正パスが ENOENT を起こし、**下書き作成後にクラッシュ→空の orphan draft が残る**事故があった。恒久対策として publish/edit は**ブラウザ操作より前に画像存在を検査（fail-fast）**する。万一 orphan（サービスタイトル未設定・¥0・下書き中）が出たら `npm run coconala-delete-draft -- --id <n> --commit` で掃除（公開中商品はガードで誤爆しない）。編集ページの正URLは `/mypage/services/{id}`（`/edit` は 404）。

**単発コンテンツ商品（C系）の納品 PDF**: note 記事を coconala 用 PDF にする再現可能ビルド。**外部誘導禁止（規約）＝アカウント防衛**のため note 導線を機械除去してから PDF 化する。

| スクリプト | 役割 |
|---|---|
| `scripts/lib/strip-note-funnel.mjs` | note 記事から CTA コメントブロック・裸URL・note 商品誘導文・ペイウォール文・**note 専用節（印刷用PDF 案内）・著者バナー画像とその定型キャプション**を機械除去し、最後に**除去で中身が空になった見出し/太字ラベルを落とす**。`assertNoFunnel` で残存検査。境界は `tests/strip-note-funnel.test.mjs` で固定 |
| `scripts/build-coconala-content-pdf.mjs` | `PRODUCTS` 定義（C1〜C9）の源を strip → クリーン版を staging → `magazine-to-pdf` で PDF 生成 → **pdftotext で note.com/URL が 0件でなければ FAIL**。出力 `.claude/config/coconala/assets/pdf/*.pdf`（`CHROME_PATH=... node scripts/build-coconala-content-pdf.mjs [--product C8]`）。C1〜C7 の源は note 記事、**C8/C9（模試）は生成 markdown**（`generated:true`・源 `.claude/config/coconala/assets/moshi-src/{C8,C9}/`・strip は冪等で二重担保） |

> [!warning] 納品前は「URL 0 件」だけでなく **PDF そのもの**を見る（2026-08-06）
> ビルドのゲートは「note.com/URL が残っていないか」しか見ない。これは緑のまま、
> **10 冊が「関連リンク」の一語で終わり、うち 3 冊はその一語だけの空白ページが最終ページ**だった
> （リンク行は消え、ラベルだけ残った）。顧客が最後に見る面がこれでは商品にならない。
> 納品前に PyMuPDF で次を実測する（対象数と該当数を必ず出す）:
> **①孤立見出し**（見出し語の後ろが空）**②空白ページ**（ただし模試の**解答欄**は罫線が 5 本以上引かれた
> 意図的な白ページなので除外する）**③外部 URL / リンク注釈** **④U+FFFD** **⑤note 専用節の混入**。
>
> 併せて**PDF が現行ソースと同じ中身か**も確認する。ただし **PDF のコミット日が古いことは陳腐化の証拠にならない**
> ——導線・カバー・タグの更新は strip で消えるため中身は変わらない。判定は「両版を strip に通して本文比較」で行い、
> かつ**ビルドと同じ `includeFrom` を適用**する（適用し忘れると、仕様どおり落ちている冒頭が「本文欠落」に見える）。

- **納品運用**: C系（`provision_format=3`・PDF・各種定型ファイル）は**ヒアリング不要**。購入通知→トークルームで PDF を送付（例: C1=1本 / C2=5本 / C8・C9 模試=問題冊子＋解答解説の2冊）＋キット §4c「C系 PDF 送付」文（`orders-log` へ append）。個別相談は添削（S2）へ誘導。
- **KDP 安全**: 二次経験記述は Kindle Select ロック無し（土木 Kindle は一次のみ）。一次過去問PDF は Select 独占中＝coconala 化しない。
- `magazine-to-pdf.mjs` は Mac の新 headless Chrome が exit しない事例に対応（PDF 生成済みなら timeout を成功扱い・2026-07-18）。**`spec.outDir` は `srcDir` と同じく REPO 基準で絶対パス化する**（Chrome の `--print-to-pdf` は相対パスを受け付けず、`0x3 指定されたパスが見つかりません` で PDF だけ出ないまま exit 0 を返すため。呼び出し側には「PDF 生成に失敗」としか見えない・2026-08-05 修正）。

> [!important] 模試（C8/C9）の記入欄行数は目分量で決めない
> 問題冊子の `[[記入欄:N]]` は **`.claude/config/keiken-answer-sheet-limits.json`（解答欄しきい値 SSOT）** から決める。
> 本冊子の記入欄は本文幅 178mm ＝ **約 25字/行**。
> - **問題1（施工経験記述）**: 1級＝各区画 200字 → **8行**（①②とも同寸。7/9 のような非対称にしない）。2級＝1項目 250字 → **10行**。
> - **学科記述（問題2以降）**: 公式の行数は非公開＝本冊子独自。「答案例（N行の記入欄に収まる分量）」という冊子の主張が真になるよう、**答案例の実字数 ÷ 25 を切り上げた行数**にする（答案を圧縮して枠に合わせない）。
>
> 2026-08-05 に C8 で 1級 経験記述が 7行/9行（旧3項目形式の名残）、学科記述 5 問で答案例が枠から +2〜+68 字あふれる状態を検出し是正。**答案例の「約N字」表記が枠容量を超えている＝その場で破綻が読める**ので、ラベルと行数は必ず突き合わせる。

**安全弁**: ①account assert（`sellerName`=dobokunote をマイページ本文で確認・不一致は即中断）②既定は「下書きで保存」・実公開は `--commit` 必須 ③価格/カテゴリ充填 warning があれば公開せず下書き退避 ④送信後の記入エラーは `ok:false` を返し「公開した」と報告しない。

**フォーム仕様の要点**（2026-07-18 実機確定）:
- **タイトル**: 25字未満。末尾「ます」は**固定サフィックスで自動付与**されるため、フォームには末尾「ます」を剥がして入れる（さもないと公開表示が「〜しますます」と二重になる）。form lib が自動で剥がす＝カタログ title は自然な「〜します」で持つ。
- **キャッチコピー**: **15〜30字**（範囲外は公開時に記入エラー・下書き保存は通ることがある）。form lib が範囲外を warning。
- **価格**: select（表示テキスト「N,NNN円」で一致・カタログ priceYen 由来）。
- **カテゴリ**: 3段 cascading（master→sub→type・全て必須）＋**ジャンル facet（※必須）**。type/facet は sub 選択後の AJAX で populate。
- **公開ボタン**: 新規＝「公開する」／公開中サービスの更新＝「更新する」（form lib が両対応）。公開成功で `/services/new_open/{id}` へ遷移。
- QA/有料オプション/画像は v1 未対応（公開後 UI 手動）。

**規約**: 2026-07-18 時点で利用規約・ルールに「出品者が自分の出品をブラウザ自動化することを禁じる明示条項」は確認できず（第13条2項22号は購入者側の自動応答が対象）。禁止行為一覧(zendesk)の1面は 403 で未確認・bot 検知の運用リスクは残るため、出品/価格改定時の**低頻度**利用に限る。

## 9. ココナラブログ／コンテンツマーケット（2026-08-12 実機調査）

**現状 = 投稿ゼロ**（`/mypage/blogs` が「ブログを投稿しましょう」の空状態）。
記事型（9.2）は着手決定・実装中。コンテンツマーケット（9.3）は未探査のまま残置。

### 9.1 使えない用途: サイト/note への集客

**ブログ本文に外部リンクを書けない。** 投稿エディタ（`/mypage/blogs/add?kind=1`）の冒頭に、ココナラ自身が注意書きとして常時表示している:

> ココナラでは外部誘導やココナラを介さない直接取引を禁止しております。メールアドレス、電話番号、LINEなど、**外部連絡先や外部サービスのリンクを記載する行為**やココナラを介さない直接取引を誘引する記載 … これらの行為が確認された場合はアカウント制限等の対応をさせていただきます

つまり §5 安全弁2（外部誘導禁止）は**取引・納品物だけでなくブログにも及ぶ**。
「ブログで集客して doboku-note / note へ流す」は**成立しない**（アカウント制限のリスクを負うだけ）。
送客先にできるのは**自分のココナラ出品のみ**で、導線の向きは §5-2 のまま（サイト/note → ココナラ）変わらない。

**ただし「自出品への内部リンク」は禁止どころか公式機構だった**（2026-08-12 実測・当初の推測を訂正）:
本文に `https://coconala.com/services/{id}` を貼ると、エディタが**サービスカードに自動変換**する
（`div.c-blogBody_service[data-id]` ＝ 画像・タイトル・出品者・**ライブ価格**を持つウィジェット）。
つまり CTA は「テキストで出品名を案内」ではなく**カード埋め込み**が正しい形。
価格はココナラ側が描画するので**本文に価格を書く必要がない**（＝価格ドリフトの余地がそもそも無い）。

### 9.2 使える用途A: ココナラ内検索・回遊から S1/S2/S3 へ

ブログ内検索の実測ヒット数（2026-08-12）:

| クエリ | 件数 |
|---|---|
| 技術士 | 1,100 |
| 施工管理 | 376 |
| 施工管理技士 | 82 |

※部分一致のためノイズを含む（特に「技術士」）。

**競合が実際に運用中**: 「セコカンサポート長」が経験論文の書き方を、「小泉士郎（技術士 建設・総監）」が**受講生の復元論文＋添削講評**を連載。展開キット §競合 に記録した「ちゃんさと技師＝ブログ無料例文→ココナラ」と同型が、ココナラブログ上でも回っている。
自社の優位性は**実際の添削事例という一次資産**（競合と同じ土俵で戦える材料がある）。

### 9.3 使える用途B: コンテンツマーケット＝C系PDFの「やりとり不要」販売

ブログ管理画面の導線に明記:

> コンテンツマーケットで記事を出品する — 記事・画像・イラストが**やりとり不要**で、**同時に複数の人に販売**できます

現在の C1〜C9 は `provision_format=3`（購入後トークルームで PDF 手送付）＝**1件ごとに人手が要る**。
コンテンツマーケットならその納品作業が消える（note 有料記事に近い売り方をココナラ内で完結）。
**既存 PDF の再利用で在庫が既にあるため、記事執筆型（9.2）より投下コストが小さい。**

> **未確認**（着手前に実機で押さえること）: 価格帯・対応ファイル形式・手数料・出品フォームの構造。
> 「出品する」導線からのフォーム到達は 2026-08-12 の probe では未達（モーダル遷移）。

### 9.4 実機で確定した仕様（2026-08-12 プローブ完了・捨て下書き1本で計測し削除済み）

**画面・URL**

| 項目 | 実測値 |
|---|---|
| ブログ管理 | `/mypage/blogs`（投稿導線 `?new=true`）・種別 radio 3つ（記事 / コンテンツ / 告知）→「入力へ進む」 |
| 新規エディタ | `/mypage/blogs/add?kind=1` |
| 既存エディタ | `/mypage/blogs/edit/{blogId}` |
| 公開記事 | `https://coconala.com/blogs/{userId}/{postId}` |
| ブログ内検索 | `/blogs/search?keyword=…`（総数は本文の「N 件中」） |
| 他人のブログ一覧 | `/blogs/{userId}`（**`/users/{id}/blogs` は 404**） |
| 効果測定 | マイページ「サービス・ブログ分析」／購入者側「購入ブログ」`/mypage/blog_orders` |

**セレクタ（テキスト一致は使えない）**

| 対象 | セレクタ | 備考 |
|---|---|---|
| タイトル | `input[placeholder="ブログタイトル"]` | **maxlength 属性なし・200字を投入して切り詰めなし**＝プラットフォーム上限は未到達。上限はポリシー側で決める |
| 本文 | `div.c-blogEditor_base[contenteditable="true"]` | 段落は `div.c-blogBody_text` が1つずつ生成される |
| 装飾 | 選択すると `.c-blogEditor_decorationBtn` が浮上（**見出し / 太字 / 位置 / 引用**） | 見出しは**選択→ツールバー**でのみ作れる。`# ` の markdown 記法は変換されない |
| サービスカード | `div.c-blogBody_service[data-id="{serviceId}"]` | 自出品 URL を貼ると自動生成（§9.1） |
| 下書き保存 | `button`（tw-* のみで固有クラスなし） | |
| 公開設定 | `button.c-blogPost_triggerPublish` | |
| 一覧の行 | `div.c-blogContent` / 編集 `a.c-blogContent_edit` | **`<a href>` ではない**ので JS クリックで開く |
| 削除 | `.c-blogPost_triggerDelete` → `.dropdown-item`「この投稿を削除」→ モーダル `.c-blogDelete` の「削除する」 | 実測で一覧 0 件に戻ることを確認 |

> **Playwright の罠**: `getByText('下書き保存' / '公開設定').click()` は **30s タイムアウトする**（Vue の再描画で actionability が安定しない）。
> `page.evaluate(() => document.querySelector(sel).click())` で確実に押せる。
> なお**タイムアウトしても下書きは保存されていた**（オートセーブ疑い）＝「クリックが失敗したから何も起きていない」と決めつけない。

**本文エディタの罠（2026-08-12 実装時に全部踏んだ）**

| 罠 | 症状 | 正しいやり方 |
|---|---|---|
| 入力と装飾を交互にやる | ツールバーのクリックで contenteditable からフォーカスが外れ、**以降の insertText がどこにも入らない**（本文 500/1684 字で切れた） | **2パス**＝全段落を素で流し込む → 見出し行だけ後から選択して当てる |
| ツールバーを `el.click()` で押す | ボタンは**非表示でも DOM に存在する**ので `true` が返るが書式は当たらない（偽成功） | 可視性を確認し、**実マウス** `page.mouse.click(x, y)` で押す |
| 対象行が画面外のまま選択 | ツールバーの座標も画面外になり、**別要素をクリックしてページ遷移**した | 選択前に `scrollIntoView({block:'center'})`＋座標がビューポート内か検査 |
| `.c-blogEditor_decorationBtn` を掴む | これは**4ボタンを包むコンテナ**（textContent＝「見出し 太字 位置 引用」）。中心を押すと3番目の**「位置」**が当たり、5行が `c-blogBody_center` になった | 見出しは `.c-blogEditor_decorationBtn-first`、引用は `-last` |
| 見出し化後に `> div` で探す | 見出しは **`div` ではなく `h2.c-blogBody_h2` になる**ので、h2 が5個できているのに「行が見つからない」 | `.c-blogEditor_base > *` で探し、テキストは空白差を吸収して比較 |
| カード挿入後に `page.click(CE)` でフォーカスを取り直す | クリック位置にキャレットが飛び、**以降の段落が本文の途中に挿入される**。字数もカード枚数も正常なのに**順序だけ壊れる** | Range で `selectNodeContents` → `collapse(false)` して末尾へ移動 |

> 最後の罠が示すとおり、**字数とカード枚数の検証だけでは順序の破壊を検出できない**。
> `coconala-blog-publish.mjs` は原稿のブロック列と DOM の並びを突き合わせる**順序検証**を持つ。

**ブロックのクラス**: 段落 `div.c-blogBody_text` ／ 見出し `h2.c-blogBody_h2` ／
中央寄せ `div.c-blogBody_text c-blogBody_center` ／ サービスカード `div.c-blogBody_service[data-id]`

**公開設定ダイアログ**（`button.c-blogPost_triggerPublish` で開く）

- **カテゴリ `<select>`（必須）**: コラム / ビジネス・マーケティング / デザイン・イラスト / **学び** / 写真・動画 / 音声・音楽 / 美容・ファッション / 小説 / IT・テクノロジー / ライフスタイル / エンタメ・趣味 / 占い / マンガ / 法律・税務・士業全般 / マネー・副業（未選択だと一覧が「カテゴリなし」になる）
- **ハッシュタグ** `input.input`（画面表記「2〜4つをオススメ」）
- **目次設定**: 「見出しを設定すると利用できます」＝見出しを作ると自動で目次が付く
- ボタン: 「編集を続ける」`.c-blogPublishing_draftBtn` ／ **「投稿する」**（＝最終公開）

**下書き保存が独立ボタンとして在る**＝§8 と同じ draft-first ＋ `--commit` gate の流儀でそのまま自動化できる構造（`coconala-session.mjs` の launch/login/account assert をそのまま再利用可能）。

### 9.5 判断

**着手する（2026-08-12 決定・9.2 を先行）。** 当初は 9.3（コンテンツマーケット）先行と判断したが、
①出品 10 件を再受付して**送客先が揃った** ②内部リンクがサービスカードとして機能する（§9.1）＝
ブログ→出品の導線が想定より強い ③ブログ内検索「経験記述」は **646 件**で競合が現に連載している、
の3点から**記事型（9.2）を先に立てる**。9.3 は出品フォーム未探査のまま残置（backlog）。

実装 → [coconala-blog-policy.md](coconala-blog-policy.md)（真実源）・`/coconala-blog` スキル・
`coconala-blog-writer` / `coconala-blog-qa`・`scripts/coconala-blog-publish.mjs`・`npm run check-coconala-blog`

## 関連

- 戦略・出品文面・ヒアリングシート・撤退ライン: [ココナラ展開キット.md](../../../docs/note/1級・2級土木/ココナラ展開キット.md)
- 出品文面の**構成の型**: [note-selling-structures.md](note-selling-structures.md)「強化コンポーネント」（C系PDF=直適用／S系人力=翻案・詳細は展開キット §3）
- 添削パイプライン: `/keiken-tensaku`（`civil-keiken-tensaku-drafter`）／添削テンプレ: [2級経験記述-添削テンプレ.md](../../../docs/note/1級・2級土木/2級土木/2級経験記述-添削テンプレ.md)
- 売上: [sales-tracking.md](sales-tracking.md)（`coconala:<serviceId>` 命名）
- 会員（主戦場）: [noteコンテンツ計画.md](../../../docs/note/1級・2級土木/noteコンテンツ計画.md)（ココナラは第3チャネル・会員の価格アンカー）
- エージェント: `.claude/agents/coconala-operator.md` ／ スキル: `/coconala-publish`（出品・修正）・`/coconala-order`（受注）・`/coconala-status`（KPI）
