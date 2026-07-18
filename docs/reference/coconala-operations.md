---
title: ココナラ運用 SSOT（受注・KPI・カタログ整合）
---

# ココナラ運用 SSOT — 1級・2級土木 経験記述サービス

ココナラ（coconala.com）で出品する単発サービスの**運用・スキーマ・安全弁**の真実源。2026-07-16 新設。

> [!important] 守備範囲の切り分け（重複 SSOT を作らない）
> - **本書** = 運用（受注フロー・KPI 記録・スキーマ・ドリフト検知・安全弁）
> - [ココナラ展開キット.md](../note/1級・2級土木/ココナラ展開キット.md) = **戦略・出品文面**（競合分析・価格設計・出品文面・ヒアリングシート・撤退ライン）
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

### 2.2 受注実績: `.claude/state/coconala/orders-log.json`

`{ version, updatedAt, currency, source, privacyNote, howToUpdate, orders: [] }`

| orders[] のキー | 意味 |
|---|---|
| `date` | 受注日（ISO 日付） |
| `serviceId` | カタログの id と一致必須 |
| `priceYen` | 販売額（手数料差引前）。カタログと不一致なら要説明（価格改定時は memo に改定日） |
| `grade` | 1 or 2（級） |
| `status` | `received` → `delivered` → `revised`（書き直し対応）→ `closed` |
| `tensakuMinutes` | 最終赤入れの所要時間（工数の実測・定員判断の根拠） |
| `memo` | 任意。**個人情報・原稿本文は書かない** |

> **記録しないもの**: 購入者名・提出原稿・トークルーム本文（privacyNote）。事例化は匿名化して
> `docs/note/1級・2級土木/メンバーシップ/添削事例アーカイブ/` へ（1対多の資産化）。

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
| `segment` | 機械分類: `daiko`（作成代行＝当社は出さない）/ `tensaku`（添削）/ `shindan`（診断）/ `soudan`（相談・指導）/ `kyozai`（教材）/ `other` |
| `detail` | 上位N件のみ: `deliveryDays` / `totalSales` / `description` / `hasOptions` |

> **ページ形式が2種類**（実測 2026-07-16）: `/search?keyword=X` は検索結果（カード `.c-serviceListItem`）。ただし
> **「技術士」「土木施工管理技士」等カテゴリ名と完全一致するキーワードは `/categories/{a}/{b}` へ 301**（カード `.c-serviceBlockItem`・冒頭の `.c-recommendItem` はおすすめカルーセルで本体リストではない）。スクリプトは両対応。

散文の分析結果は [ココナラ展開キット.md](../note/1級・2級土木/ココナラ展開キット.md) §1。

### 2.4 KPI: `.claude/state/coconala/kpi-log.json`

`{ version, updatedAt, source, howToUpdate, weekly: [{ weekOf, serviceId, views, favorites, orders }] }`

`weekOf` は ISO 週初（月曜）。読み取れない数値は `null`（推測で埋めない＝欠測として扱う）。

## 3. 受注フロー（`/coconala-order`）

```
購入通知 → ヒアリングシート送付（定型文・キット §4）
  → 受領 → scratchpad/.tmp に .md 保存（★リポジトリに置かない）
  → /coconala-order <serviceId> <path>
      ├ カタログ status 確認（draft なら停止・full なら警告）
      ├ 入力検証（級・工種・立場・テーマ・下書き）→ 欠落なら再送依頼文
      ├ /keiken-tensaku → 添削下書き.md（civil-keiken-tensaku-drafter）
      ├ 納品文面ドラフト生成
      └ orders-log へ append（status: received）
  → ★運営者: 最終赤入れ（10〜30分）→ トークルームへ送信
  → orders-log を delivered へ・tensakuMinutes 記録
  → 共通の誤りは匿名化して添削事例アーカイブへ
```

添削3ステップ（字数→論点抽出→最終赤入れ）の真実源は [2級経験記述-添削テンプレ.md](../note/1級・2級土木/2級土木/2級経験記述-添削テンプレ.md)。納品文面のテンプレは `.claude/agents/coconala-operator.md`。

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

1. **代筆禁止（Red Line #2）** — 本人答案への赤入れまで。作成代行は出品しない（断り文面はキット §3 FAQ）
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

## 7. サイト導線（/links）

`src/app/links/page.tsx` の `CoconalaSection` が `listedCoconalaServices()` を参照し、**listed が0件なら描画しない**（wire-ahead＝出品前に配線だけ済ませておける）。ココナラ側 URL に UTM は付けない（計測がココナラ内で完結せずパラメータが露出するだけのため）。

## 8. 出品・修正の自動化（`/coconala-publish`・2026-07-18 新設）

note-publish 流儀の決定的 Playwright。ログイン済みプロファイル `.local/playwright-coconala-profile`（初回のみ headed で手動ログイン）。

| スクリプト | 役割 |
|---|---|
| `scripts/coconala-publish.mjs --service <id> [--commit]` | 新規出品。`/services/add`→種別=テキストチャット→「内容の入力に進む」で下書き生成→フォーム充填→下書き保存（既定）/公開（`--commit`）→公開時カタログへ `listed`＋`serviceUrl`＋`listedAt` 書き戻し |
| `scripts/coconala-edit.mjs --service <id> [--fields …] [--commit]` | 既存修正。カタログ＋listings の現値でフォーム再充填。`--fields price,delivery` 等で部分更新 |
| `scripts/coconala-discover.mjs [--advance] [--cat --sub --type]` | フォーム構造・selector・カテゴリ/価格/facet options の偵察（読み取り専用）。仕様ドリフト時の再校正用 |
| 共有 `scripts/lib/coconala-{session,form}.mjs` | プロファイル起動・login 待ち・account assert・カタログ/listings 解析・フォーム充填 |

**商品画像（サービスサムネ）**: ブランド流儀＝AI で「文字なし雰囲気写真」を生成 → satori で日本語文字を正確に重ねる（AI に日本語を焼き込ませない）。

| スクリプト | 役割 |
|---|---|
| `scripts/gen-image-gemini.mjs --out <png> --prompt "..."` | Gemini 画像 API（`gemini-2.5-flash-image`・`.env.local` の `GEMINI_API_KEY`）で背景写真を生成。**API 課金・1呼び出し=1枚**。プロンプトは brand-image-system §5 準拠（明るく低コントラスト・青トーン・文字/人物なし・左に文字余白） |
| `scripts/coconala-thumb.mjs [--service <id>] [--bg <png>]` | 背景＋タイトル/訴求/価格/ブランド色を satori で 1200×900（4:3）合成。コピーは `THUMB_COPY`（サムネ用の短文）＋カタログ priceYen（オプション有=「〜」）。出力 `.claude/config/coconala/assets/thumb-<id>.png` |

素材は `.claude/config/coconala/assets/`（`bg-civil.png`＝生成背景の保存・再生成の課金回避／`thumb-*.png`＝合成結果）。**coconala への画像アップロードは未自動化**（v1）＝生成した PNG を出品フォームの「画像を追加」に手動 drag-drop。

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

- 戦略・出品文面・ヒアリングシート・撤退ライン: [ココナラ展開キット.md](../note/1級・2級土木/ココナラ展開キット.md)
- 添削パイプライン: `/keiken-tensaku`（`civil-keiken-tensaku-drafter`）／添削テンプレ: [2級経験記述-添削テンプレ.md](../note/1級・2級土木/2級土木/2級経験記述-添削テンプレ.md)
- 売上: [sales-tracking.md](sales-tracking.md)（`coconala:<serviceId>` 命名）
- 会員（主戦場）: [noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md)（ココナラは第3チャネル・会員の価格アンカー）
- エージェント: `.claude/agents/coconala-operator.md` ／ スキル: `/coconala-publish`（出品・修正）・`/coconala-order`（受注）・`/coconala-status`（KPI）
