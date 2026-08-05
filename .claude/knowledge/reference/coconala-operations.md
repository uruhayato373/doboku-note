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

> **出品・修正は Playwright で自動化する**（2026-07-18〜）。ログイン済みプロファイル `.local/playwright-coconala-profile`（gitignore）を持つ。§8 参照。KPI 自社数値のスクレイプはしない方針は不変（§4）。

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
| `coconala-bunseki-pdf` | C1 出題分析 PDF。**paused（2026-08-05 統廃合）**＝C10 フルパック限定収録 |
| `coconala-kanseitoan-pdf` | C2' 1級 経験記述 **模範答案セット** PDF 10冊（テーマ別5＋年度別5＝旧C2+C4 統合・¥4,980）。納品= C2 5冊+C4 5冊 |
| `coconala-2kyu-kanseitoan-pdf` | C3' 2級 模範答案セット PDF 8冊（テーマ別3＋年度別5＝旧C3+C5 統合・¥3,980） |
| `coconala-1kyu-kakomon-pdf` | C4 過去問模範答案。**paused**＝C2' へ統合 |
| `coconala-2kyu-kakomon-pdf` | C5 過去問模範答案。**paused**＝C3' へ統合 |
| `coconala-1kyu-gakka-pdf` | C6 学科記述攻略。**paused**＝C10 フルパック限定収録 |
| `coconala-2kyu-gakka-pdf` | C7 学科記述攻略。**paused**＝C11 フルパック限定収録 |
| `coconala-1kyu-moshi-pdf` | C8 1級 二次 予想模擬試験 PDF（問題冊子＋解答解説）。build-once の静的模試・Red Line #10 例外運用（計画 §4） |
| `coconala-2kyu-moshi-pdf` | C9 2級 二次 予想模擬試験 PDF（問題冊子＋解答解説） |
| `coconala-1kyu-full-pdf` | C10 1級 二次 **教材フルパック**（分析+模範答案+学科+模試・PDF 18冊・¥9,800）。顧客の買い分け混乱シグナル（2026-08-05 初受注 DM）を受けた旗艦。分析(C1)と学科(C6)はパック限定収録。納品は既存 C系 PDF をそのまま送付（新規ビルドなし）。決定ログ→展開キット §2 |
| `coconala-2kyu-full-pdf` | C11 2級 二次 教材フルパック（模範答案+学科+模試・PDF 15冊・¥6,980）。学科(C7)はパック限定。C10 の2級版 |
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
| `serviceId` | カタログの id と一致必須 |
| `talkroomId` | **必須**。ココナラのトークルーム ID（`https://coconala.com/talkrooms/{id}`）＝取引の一意キー・突合キー。これが無いと後からどの取引か辿れない |
| `priceYen` | 販売額（手数料差引前）。カタログと不一致なら要説明（価格改定時は memo に改定日） |
| `grade` | 1 or 2（級）。級の無い商品は null |
| `status` | `received` → `delivered` → `revised`（書き直し対応）→ `closed` |
| `replyDueAt` | 返信期限（**無連絡で自動キャンセル**になる時刻）。snapshot が拾えたら転記 |
| `deliveredAt` | 納品した日時（ISO）。未納品は null |
| `artifacts` | 納品した成果物 `[{ file, sha256, builtAt }]`。**どの版を送ったかを特定するため** |
| `tensakuMinutes` | 最終赤入れの所要時間（工数の実測・定員判断の根拠）。C系 PDF は null |
| `memo` | 任意。**個人情報・原稿本文は書かない** |

> **記録しないもの**: 購入者名・購入者 ID・提出原稿・トークルーム本文（privacyNote）。事例化は匿名化して
> `docs/note/1級・2級土木/メンバーシップ/添削事例アーカイブ/` へ（1対多の資産化）。

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

`{ version, updatedAt, source, howToUpdate, weekly: [{ weekOf, serviceId, views, favorites, orders }] }`

`weekOf` は ISO 週初（月曜）。読み取れない数値は `null`（推測で埋めない＝欠測として扱う）。

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

## 4. KPI 週次運用（`/coconala-status`）

1. ココナラのダッシュボード数値を**手で貼る**（スクレイピング・API 取得はしない → [[feedback_metrics_cicd_supplied]] と同思想）
2. kpi-log へ週次 append ＋ orders-log から受注サマリ
3. 判定:
   - **撤退ライン**: 出品4週で S2 受注3件未満 → 投資停止・看板維持のみ（キット §6）
   - **価格引き上げ**: 4週で S1+S2 合計5件以上 → S2 の引き上げを検討（評価20件が目安）
   - **工数警告**: `tensakuMinutes` 平均が30分超 → `weeklyCapacity` 引き下げ
   - **満枠**: 当週受注が `weeklyCapacity` 到達 → `status: 'full'` flip を提案
4. 売上は月次で orders-log（closed）→ sales-log へ転記（`coconala:<id>`・[sales-tracking.md](sales-tracking.md)）

> **「取得しない」の正確な範囲**: 自社ダッシュボードの KPI（ログイン必須）は**手動貼付が正**。
> 一方、**公開ページの競合調査**は `npm run coconala-research` で取得してよい（read-only・低頻度・§2.3）。
> 両者を混同しない（前者はアカウント安全と規約、後者は商品設計の一次データ）。

## 5. 安全弁

1. **捏造禁止（Red Line #2・2026-07-18 再定義）** — 経験していない工事・事実・数値を創作しない。答案作成（S3）は**本人の実工事のヒアリング事実のみ**から構成（宣誓＋本人の事実確認を必須・欠落数値は `〇〇` プレースホルダ）。旧「代筆禁止＝作成代行は出品しない」を改訂（真実源 → noteコンテンツ計画 §Red Line #2）
2. **外部誘導禁止（ココナラ規約）** — ココナラ向け文面に note・doboku-note.com の URL を書かない。導線は逆向き（サイト/note → ココナラ）のみ
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
| 3b | 購入前の問い合わせ（DM）を要対応に surface | 受注一覧だけ見て**購入前の質問を落とす**（＝売上機会の逸失） |
| 4 | `status:'received'` のまま 5 日超 | 納品の滞留 |
| 5 | orders-log にあって snapshot に無い | talkroomId の誤り |

DM は突合相手が無いので**存在の surface に徹する**（未読/既読と対象商品を出すだけ・自動で開かない）。
DM 一覧の取得に失敗したら警告を出す（「問い合わせ 0 件」と「見ていない」を区別する）。

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
| `scripts/coconala-delete-draft.mjs --id <n[,n]> [--commit]` | **空の下書き（orphan draft）を安全に削除**。4重ガード（G0 カタログ在籍拒否・G1 URL一致・G2 タイトル空・G3「下書きを削除」導線＝公開商品には出ない）。既定 dry-run・実削除は `--commit`。公開中商品は構造的に誤爆しない |
| `scripts/coconala-orders.mjs [--no-deadline] [--headless]` | **受注実績＋購入前問い合わせ(DM) の read-only 収集**（§2.2b）。取引管理（出品）の全タブ＋未返信タブ＋DM 一覧を走査し、未返信 room の返信期限をトークルームから拾って `orders-snapshot.json` を生成（DM スレッドは開かない＝既読にしない）。**書き込み一切なし・個人情報を保存しない**。1タブでも取得失敗なら `status:'partial'` ＋ exit 2 |
| `scripts/coconala-discover.mjs [--advance] [--cat --sub --type]` | フォーム構造・selector・カテゴリ/価格/facet options の偵察（読み取り専用）。仕様ドリフト時の再校正用 |
| `scripts/coconala-profile.mjs [--commit]` | プロフィール（職業/アピール/自己紹介）を `coconala-account.json` の値へ反映。**プロフィール編集（/mypage/user）はインライン編集型**（フィールドは初期描画に無く、セクション見出し近傍の鉛筆 `.d-profileItemControlButton` クリックで展開・2026-07-20 UI 変更対応済み）。ナビ誤爆は URL 不変 assert で検知 |
| 共有 `scripts/lib/coconala-{session,form}.mjs` | プロファイル起動・login 待ち・account assert・カタログ/listings 解析・フォーム充填 |

**商品画像（サービスサムネ）**: ブランド流儀＝AI で「文字なし雰囲気写真」を生成 → satori で日本語文字を正確に重ねる（AI に日本語を焼き込ませない）。

| スクリプト | 役割 |
|---|---|
| `scripts/gen-image-gemini.mjs --out <png> --prompt "..."` | Gemini 画像 API（`gemini-2.5-flash-image`・`.env.local` の `GEMINI_API_KEY`）で背景写真を生成。**API 課金・1呼び出し=1枚**。プロンプトは brand-image-system §5 準拠（明るく低コントラスト・青トーン・文字/人物なし・左に文字余白） |
| `scripts/coconala-thumb.mjs [--service <id>] [--bg <png>]` | 背景＋タイトル/訴求/価格/ブランド色を satori で 1200×900（4:3）合成。コピーは `THUMB_COPY`（サムネ用の短文）＋カタログ priceYen（オプション有=「〜」）。出力 `.claude/config/coconala/assets/thumb-<id>.png` |

素材は `.claude/config/coconala/assets/`（`bg-civil.png`＝生成背景の保存・再生成の課金回避／`thumb-*.png`＝合成結果）。

**アップロード（自動化済み・2026-07-18）**: `node scripts/coconala-edit.mjs --service <id> --service-id <n> --image <png> --commit`。「画像を追加」（`a.js_upload-…`・javascript:;）クリックで隠し file input（`data[UploadedFile][n1][image_files]`）が出現→setInputFiles→**トリミングモーダルなし**でスロットに直接入る（populated 判定＝`a.js_delete-button` の数）。既に画像があれば skip（`--force-image` で追加）。`--image` かつ `--fields` 無しなら**画像だけ更新**（本文フィールドは触らない）。

> [!warning] `--image` のパス解決と orphan draft（2026-07-18 事故→恒久対策）
> `--image` の **bare 名**（例 `thumb-x.png`）は `.claude/config/coconala/assets/` に解決される（`resolveImagePath`・session lib）。以前は cwd 相対で解決したため不正パスが ENOENT を起こし、**下書き作成後にクラッシュ→空の orphan draft が残る**事故があった。恒久対策として publish/edit は**ブラウザ操作より前に画像存在を検査（fail-fast）**する。万一 orphan（サービスタイトル未設定・¥0・下書き中）が出たら `npm run coconala-delete-draft -- --id <n> --commit` で掃除（公開中商品はガードで誤爆しない）。編集ページの正URLは `/mypage/services/{id}`（`/edit` は 404）。

**単発コンテンツ商品（C系）の納品 PDF**: note 記事を coconala 用 PDF にする再現可能ビルド。**外部誘導禁止（規約）＝アカウント防衛**のため note 導線を機械除去してから PDF 化する。

| スクリプト | 役割 |
|---|---|
| `scripts/lib/strip-note-funnel.mjs` | note 記事から CTA コメントブロック・裸URL・note 商品誘導文・ペイウォール文を機械除去。`assertNoFunnel` で残存検査 |
| `scripts/build-coconala-content-pdf.mjs` | `PRODUCTS` 定義（C1〜C9）の源を strip → クリーン版を staging → `magazine-to-pdf` で PDF 生成 → **pdftotext で note.com/URL が 0件でなければ FAIL**。出力 `.claude/config/coconala/assets/pdf/*.pdf`（`CHROME_PATH=... node scripts/build-coconala-content-pdf.mjs [--product C8]`）。C1〜C7 の源は note 記事、**C8/C9（模試）は生成 markdown**（`generated:true`・源 `.claude/config/coconala/assets/moshi-src/{C8,C9}/`・strip は冪等で二重担保） |

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

## 関連

- 戦略・出品文面・ヒアリングシート・撤退ライン: [ココナラ展開キット.md](../../../docs/note/1級・2級土木/ココナラ展開キット.md)
- 出品文面の**構成の型**: [note-selling-structures.md](note-selling-structures.md)「強化コンポーネント」（C系PDF=直適用／S系人力=翻案・詳細は展開キット §3）
- 添削パイプライン: `/keiken-tensaku`（`civil-keiken-tensaku-drafter`）／添削テンプレ: [2級経験記述-添削テンプレ.md](../../../docs/note/1級・2級土木/2級土木/2級経験記述-添削テンプレ.md)
- 売上: [sales-tracking.md](sales-tracking.md)（`coconala:<serviceId>` 命名）
- 会員（主戦場）: [noteコンテンツ計画.md](../../../docs/note/1級・2級土木/noteコンテンツ計画.md)（ココナラは第3チャネル・会員の価格アンカー）
- エージェント: `.claude/agents/coconala-operator.md` ／ スキル: `/coconala-publish`（出品・修正）・`/coconala-order`（受注）・`/coconala-status`（KPI）
