# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。
> **完了したタスクはセクションごと削除する**（記録は git 履歴が持つ。完了サマリ・経緯 prose を本ファイルに書かない）。

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
> 実行者は `[実行:]` が表すので、**待ち先が人であることを理由に 🟣 へ置かない**。tier は緊急度だけを表す。

各タスクは `### タスク名` の直下に `タグ:` 行を置く（運営管理画面 TODO タブと `backlog-sweep-pick` が機械読取り）:

```
タグ: [カテゴリ] [種類:X] [Codex候補] [実行:X] [検証:cmd] [起票:YYYY-MM-DD]
```

| token | 意味 |
|---|---|
| 第1トークン | カテゴリ（コンテンツ品質 / UI・UX / 収益化 / エージェント・SSOT / SNS・マーケ / インフラ・計測） |
| **`[種類:X]`** | X = `不具合` / `改善` / `意思決定` / `制作` / `定期`。tier（緊急度）・カテゴリ（ドメイン）とは**直交する軸**で、`[実行:]` は代理にならない（不具合と改善が同じ `sweep` に並ぶ） |
| `[Codex候補]` | バルク処理向き（任意） |
| **`[実行:X]`** | X = `sweep`（AI が単独で完了まで持てる）/ `機械`（スクリプト実行のみ）/ `対話`（方針判断がユーザーと要る）/ `ユーザー`（手作業・ログイン・実測）/ `windows` / `別環境`。**`/backlog-sweep` はこれで選定する** |
| `[検証:cmd]` | 完了を判定できる npm script（任意。あると sweep が自動検証できる） |
| `[起票:date]` | 鮮度測定用。**新規カードは必須**（`check-backlog-schema --staged` が止める）。既存の欠落分は返済を強制しない |

**種類の決定規則**（上から順に、最初に当たったものを採る）:

1. 期日で反復発火するか（毎週・毎月・四半期）→ `定期`。**これが付いたら backlog に置くべきでない合図**（backlog は「いつかやる」のマスタ。反復は monthly/weekly か `check-*-due` の担当）
2. 成果物が「決めたこと」そのもので、決まるまで着手できないか → `意思決定`。**このとき tier は 🟣**（🟣 の定義と一致する）
3. 約束・仕様に対して現状が壊れている／欠けているか → `不具合`
4. 新しい成果物（記事・図・書籍・投稿・商品）が増えるか → `制作`
5. それ以外（動いているものをより良くする）→ `改善`

境界の実例: 「薄層377本の散文増補」は既存成果物の質を上げるので `改善`／「BK-09/10 R08予想問題集の生成」は新しい成果物が増えるので `制作`。

選定は `node scripts/backlog-sweep-pick.mjs` が行う（**不具合を第1キー・tier を第2キー**・`sweep`/`機械` のみ実行候補・🟣 は自動選定しない）。tier がもはや不具合の緊急度を表していない（🟢 に沈む）ため、壊れているものを先に出す。

---

## 🔴 高 — 来月中に着手

### [DN-0100] note回遊導線の緊急修復（試験後CTA・有料74本L3・ライブ4本）
タグ: [収益化] [種類:不具合] [実行:対話] [検証:check-note-paid-cta] [起票:2026-08-20] [期日:2026-08-23]

2026-08-20 の `/audit-note-funnel --semantic` 再監査は **FAIL（7/12）**。サイト側の商品到達性は保たれているが、総監の共通冒頭CTAが本試験後も「本番直前・R8最終予想」のまま、有料記事74本は無料プレビュー内に同資格L2への帰路がなく、公開4本はソースとnoteライブが不一致。

**実装指示書**: [DN-0100-note-funnel-emergency-remediation.md](../plans/DN-0100-note-funnel-emergency-remediation.md)

**実行順**:

1. 総監の共通冒頭CTAとサイト側L2タイルを試験後のevergreen文面へ変更し、総監キーワードhubは精読ガイドを先頭にする
2. review候補10本を `KEEP 4 / LIGHTWEIGHT 2 / EXCLUDE 4` へ反映し、同じ記事を二度ライブ更新しない状態までソースを確定する
3. `wire-note-paid-cta` で1級50本・2級24本の無料プレビュー直前に土木L2帰路を配線し、対象件数とパスを固定する
4. ソース検査をすべて通し、ライブ対象78本・変更内容・添付有無を提示してユーザー承認を得る
5. 承認後だけnoteライブを直列更新する。更新通知は「いいえ」、有料境界・価格・既存PDFを保持し、公開APIとライブ監査で実体確認する

**停止条件**: 対象が74本以外へ広がる、noteアカウント不一致、ログイン/CAPTCHA、添付消失の恐れ、有料境界・価格の不一致、3本連続失敗のいずれかで保存せず停止する。`publish` / `deploy` / noteライブ変更はユーザー承認前に行わない。

**完了条件**: 指示書のPhase A〜Dを満たし、`check-note-funnel`・`check-note-paid-cta`・`check-magazine-cta:ci`・`check-note-site-utm` がPASS。承認後のライブ反映では `audit-note-funnel -- --live --ci` のD5=0、有料74本の公開無料域に `n4fde0f62dc20` が存在する。恒久ルールをSSOTへ抽出し、指示書と本カードを削除する。

### [DN-0109] CI/CD信頼性回復と機械チェック・安全な自動化の再編
タグ: [インフラ・計測] [種類:不具合] [Codex候補] [実行:対話] [検証:quality:audit:ci] [起票:2026-08-21] [期日:2026-08-31]

2026-08-21 実査では GitHub Actions 22 workflow、`quality-audit.mjs` 63検査（CI gate 52）が存在し、自動化の量は十分。一方、直近30 runは成功11・失敗19、Pre-merge checkは17回中16回失敗し、赤が異常信号として機能していない。起票時の確定エラーだった `docs/handoffs/2026-08-21-actions-recovery.md` の `DN-0105` 参照は 2026-08-21 に解消済み（カードは削除され、handoff 側の記述を実績へ書き換えた）。GSC/GA4 と PSI は取得・判定に成功しても、最後の develop への bot push で失敗している。追加機能より先に、既存CIを常時greenへ戻し、同時書込み・権限・本番配信の境界を閉じる。

**Phase 0-2 の分類結果（2026-08-21 実査済み・以下は調査済みなので再調査不要）**

Pre-merge の最後の緑は **2026-08-19 12:04Z**。以後 24 連続で赤く、原因は 2 つだけ。

| 検査 | 根本原因 | 直し方 |
|---|---|---|
| `relative-links` | `DN-0108` カードが `../plans/DN-0108-cross-device-playwright-auth/00-master.md` へリンクしているが、**その plan が git 未追跡**。カードだけ commit された状態 | 別セッションが plan を commit する（他人の未コミット成果物なので代理 commit しない） |
| `knip-ratchet` | `scripts/magazine-to-pdf.mjs` が `import('playwright')` を追加。入ったのが `03731a1ca`（`[skip ci]`）で**ラチェットが回らないまま baseline を 1 超えた** | `playwright` を devDependencies へ明示（後述） |

`relative-links` はクリーンチェックアウト相当で全 846 リンクを走査し、壊れは**この 1 件のみ**と確定済み。
`knip` の内訳は baseline 時点との import 数の差分で特定した（playwright 40→41、他 6 パッケージは増減なし）。

**`playwright` は baseline を上げるより宣言するのが正しい**。41 箇所が直接 import しているのに
package.json に無く、`@playwright/test@1.59.1` の推移依存で**たまたま解決している**だけ。
devDependencies へ足せば Unlisted dependencies は 60 → 19 に落ちる（ラチェットのリセットではなく返済）。

**Phase 1-4 に該当する未修正の同型欠陥（新規発見）**

`fetch-metrics.yml` で直した「schedule が main を checkout するのに develop へ書く」が **2 本残っている**。

| workflow | checkout ref | develop へ書込 | 状態 |
|---|---|---|---|
| `index-coverage.yml` | **なし（＝main）** | あり | 未修正・同型 |
| `psi-audit.yml` | **なし（＝main）** | あり | 未修正・同型（2026-08-20 に実際 failure） |
| `fetch-metrics.yml` | `develop` | あり | 修正済（462b206d2） |

計測系 3 workflow（GSC / fetch-metrics / PSI）の 2026-08-20 の失敗は、いずれも `ref: develop` が
main へ入る前の run で説明がつく。

**`gsc-auto-review.yml` の別原因も解明済み（2026-08-21）**: `System.IO.IOException: No space left on device`。
`fetch-depth: 0` で **remote 11 GB** を丸ごと clone し、ubuntu-latest の空き（約 14 GB）を超えて
ランナーごと落ちていた。全ステップが `conclusion=null` になり**ランナーが自分のログも書けない**ため
`--log-failed` は「log not found」しか返さず、annotations API でだけ理由が読めた。
数週間にわたり成功と失敗が交互に出ていたのは容量の縁で動いていたため。
`gsc-auto-review.yml` と `competitor-scan.yml`（同じく履歴不使用）から `fetch-depth: 0` を削除し、
`check-workflow-clone-depth` で禁止した。詳細と追跡手順は measurement-incidents.md。

**Phase 0 — 信号回復**:

1. main/developの台帳実体を照合し、`DN-0105` を安易に作り直さず、参照先修正・統合・削除のどれが正しいかをgit履歴で確定する
2. 直近の Pre-merge / GSC auto review / fetch-metrics / PSI の失敗を「検査FAIL・checkout・外部取得・bot publish・閾値超過」に分類し、原因一覧と再現コマンドを作る
3. `quality:audit:ci` の失敗レポートを Job Summary と artifact に残し、単一の `Quality audit` ステップだけを開かないと原因が分からない状態を解消する
4. 現在の既知FAILを0にし、少なくともdevelopのPre-merge checkを3回連続greenにする
5. `Audit Cloudflare via MCP`をworkflow_dispatchし、対象workflow成功・Job Summary・artifactのread-only監査結果を確認する

**Phase 1 — 自動書込みの直列化**:

1. developへcommit/pushする全workflowを列挙し、repository-wide共通 `concurrency` group（例 `state-writer-develop`、`cancel-in-progress:false`）へ統一する
2. `fetch → /tmp退避 → origin/develop最新取得 → 成果物復元 → commit → push` を共通publish helperへ集約する
3. non-fast-forward時だけ有限回再取得・再試行し、データ取得成功／台帳保存失敗を別statusでJob Summaryへ出す
4. schedule workflowの制御ファイルはdefault branchのmainから評価される前提を検査し、developだけに修正が残って定期実行へ反映されない状態を検出する

**Phase 2 — GitHub Actions自体の機械検査**:

1. `actionlint` と `check-github-actions-policy` を追加する
2. 全workflowの明示 `permissions`、全jobの `timeout-minutes`、外部書込みの `concurrency`、Actionsのcommit SHA固定、Node version SSOT、workflow inputのshell直展開禁止、scheduleのcheckout refを検査する
3. npm と GitHub Actions のDependabot週次更新を追加し、本番依存のHigh/Criticalだけをblocking、その他をreport-onlyにする
4. `continue-on-error` 全件に理由と後続surfacerを要求し、取得0件・検査不成立・保存失敗をPASSにしない

**Phase 3 — 本番配信の一本化**:

1. main保護ルールの実体を確認し、PR経由・required check・force push/delete禁止を設定する。botのdevelop書込み例外と人のmain保護を分離する
2. CIで生成した同一 `out/` artifactを本番へ渡し、R2画像同期完了後にCloudflare Pagesへdeployする順序へ統一する
3. production `environment` と `concurrency: production-deploy` を追加し、古いPages deployだけをcancel可能にする
4. deploy直後にトップ・代表記事・転職hub・sitemap・robots・RSS・代表R2画像・canonical/OGP・主要CTAをsmoke testする
5. `npx wrangler@3` の浮動majorをlockfile管理へ移し、deploy jobで使っていないR2認証情報を除く

**Phase 4 — Secrets・破壊操作**:

1. R2 auditは読取専用credentialを必須にし、書込みcredentialへのfallbackを廃止する。Actions実行成功と、監査credentialで書込み操作できないことを確認する
2. R2 deleteはproduction-destructive承認、削除リストの許可パス、件数上限、前後artifact、inputのenv経由受渡しを追加する
3. workflowごとにCloudflare/Google/YouTube/Anthropicの最小権限を記録し、値やtokenをログ・artifact・Job Summaryへ出さないテストを追加する

**Phase 5 — Windows・管理画面・認証境界**:

1. Windows runnerはフル品質監査でなく、path resolver・Node script起動・改行/文字化け・Playwright auth配線の軽量smokeに限定する
2. `tools/admin-app/**` 変更時に既存 `test:e2e:admin` をCI配線し、`/metrics`・`/todo`・`/docs`・`/content/*`・サイドメニュー・主要tableを検査する
3. DN-0108のPlaywright認証はstatic wiringだけをCIへ入れ、profile/Cookie/storageState/login/status/CAPTCHA/2FAはPCローカルに固定する
4. `weekly-review-guard` を拡張し、重要workflowの最終成功日時・データ鮮度・publish成否を1件の重複防止Issueへsurfaceする

**停止条件**: branch protection・GitHub Environment・Secrets・外部push・R2削除・Pages deployは、dry-run結果と変更対象を提示してユーザー承認を得るまで変更しない。`git reset --hard`、force push、認証profileのCI投入、secret値の取得/表示、外部投稿は行わない。既存workflowを一括置換せず、1 Phaseごとにgreenを確認する。

**完了条件**:

- developのPre-merge checkが3回連続green、主要定期workflow（fetch-metrics / PSI / GSC auto review）が次回実行またはmanual dry-runで取得・保存とも成功
- mainのrequired checkと保護設定、本番deployのartifact同一性、R2→Pages順序、post-deploy smokeが実査できる
- state writer全件が共通concurrency/helperを利用し、push競合を再現するテストまたはfixtureがPASS
- `check-github-actions-policy`・actionlint・Windows smoke・admin E2E・`quality:audit:ci`・build・SEO build checkがPASS
- R2 auditのwrite credential fallbackが0、全workflowが明示permissions、未固定Action、未説明`continue-on-error`、shell直展開inputが0
- profile/Cookie/storageState/password/token/2FAのGit差分とCI artifactが0。恒久判断をoperations/referenceへ抽出し、本カードを削除する

**Claude Code 実行プロンプト**:

```text
DN-0109をPhase 0から1 Phaseずつ実行してください。最初にAGENTS.md、
.claude/todo/backlog.mdのDN-0109、scripts/quality-audit.mjs、
.github/workflows/*.yml、.claude/knowledge/reference/measurement-incidents.md、
.claude/knowledge/reference/workflows.md、DN-0108の認証計画を全文読んでください。

作業前にbranch、origin/develop・origin/mainとの差、dirty files、直近30件のActions runを確認し、
他作業の変更を上書き・revertしないでください。Phase 0では既知FAILを証拠付きで分類し、
DN-0105参照はgit履歴とmain/developの実体を照合してから修正してください。

以後は、bot state writerの共通concurrency/helper、Actions policy gate、CI artifact→R2→Pages→smokeの順に進めます。
branch protection、Environment、Secrets、外部push、R2削除、deployはread-only確認とdry-runまでとし、
変更内容・影響・復旧方法を提示してユーザー承認を得るまで実適用しないでください。

Playwrightのprofile/Cookie/storageState/login/statusをCIへ持ち込まず、DN-0108のstatic wiringだけを対象にしてください。
各Phase終了時に、変更ファイル、失敗原因、実行した検証、未解決FAIL、GitHub上のrun URLを報告し、
greenを確認してから次Phaseへ進んでください。外部状態を変えるPhaseの直前で必ず停止してください。
```

### [DN-0002] 会員フロー 週次配信（W1-W5 配信済・W6 以降は週1）
タグ: [収益化] [種類:制作] [実行:sweep] [起票:2026-08-06]

**2026-08-05 に初の入会**（通年プラン ¥1,480）。プラン説明が約束する「月例の予想問題配信」を会員限定で配信する。全 11 週分の在庫は `content/note/1級・2級土木/メンバーシップ/予想問題マガジン/01〜11` に揃っている。


**残り17本の状態**: W6〜W11・学科記述予想10本・添削練習1本は公開検査済みで `noteStatus: draft`。W6 は note 下書き `n81850411ecb7` まで投入済み（未公開）。

**経験記述の配信残り**: 週1で W6 8/31・W7 9/7・W8 9/14・W9 9/21・W10 9/24頃・W11 9/28（10/4 に間に合う）。次回は:

```bash
node scripts/note-publish.mjs --article "content/note/1級・2級土木/メンバーシップ/予想問題マガジン/06_安全管理-労働災害の防止/article.md" --commit
node scripts/note-magazine-add-articles.mjs --target mbe07bd5cecda --notes <noteId> --commit
```

**公開範囲を選べなければ公開しない**（無料公開事故の防止）。公開後は public API で `is_limited=true`・未ログイン本文 0 字を確認する。

**並行トラック**: 学科記述予想10本は 8/21〜9/22 の火・金を基本に週2本、添削練習1本は9/25に配信する。対応するnoteマガジンは実在しないため、虚偽の `noteMagazine` を削除し、会員限定の単独記事として公開する。正確な日付・順序は `content/note/1級・2級土木/メンバーシップ/README.md` を真実源とする。

### [DN-0003] note ライブ反映の一括消化（本文 drift 実測 348 本）
タグ: [インフラ・計測] [種類:不具合] [Codex候補] [実行:sweep] [起票:2026-08-17]

**実測（2026-08-18 再測）**: 公開 702 本中 synced 347・**本文 drift 348 本**・未初期化 7。ほかタグ drift 137 / メタ 13 / アセット 77。**drift 348 のうち画像を持つのは 159 本**。

> [!warning] 画像持ち 159 本は CDN 確定失敗でブロックされている（2026-08-18）
> 待ち時間の延長では解けないと実測で判明した（45 秒/枚で確定 2/3・180 秒/枚でブラウザが crash）。
> 🔴「note ライブ反映の CDN 確定失敗」の決着が先。**画像なしの 189 本は先に流せる**。

内訳（重複あり・同じ記事が複数理由で drift する）:
- 著者オーソリティバナーのソース配置 196 記事に対し live 反映は約 12 記事
- 建設部門の UTM 欠落 残 99 件（対象リストは `.claude/state/note-utm-live-remaining.txt` に生成済み）
- CTA・blockquote・cover 文言・UTM のソース修正分

```bash
node scripts/note-update-body.mjs --list <list.txt> --commit
```

**運用上の制約（2026-08-17 に 100 件バッチで実測）**:
- **1 日 100 件上限**（note 側）。全消化には 4 日規模
- **画像持ち記事は約 4 割が CDN 確定タイムアウトで ABORT**（90 秒上限・`NOTE_IMG_SETTLE_MIN_MS` / `NOTE_IMG_SETTLE_PER_IMG_MS` で延長可）。fail-closed で保存されないので実害はないが、drift が減りきらない
- **3 本連続失敗で残りを止める安全弁**が効く（`--max-consecutive-fail`）。100 件投入して 29 件で停止した実績あり
- **PDF 添付カードを持つ記事は `--reattach-pdf` が要る**（全文置換で添付が消えるため中断される）
- 有料記事の境界は動かない（有料 70 件の無料プレビュー長を before/after 比較して事故ゼロを実証済み）

**内訳（2026-08-17 実測）**: 1級・2級土木 157 ／ 技術士建設部門 110 ／ 技術士総監 81。
- 1級・2級土木の 157 は「著者オーソリティバナーのソース配置 196 件のうち未反映分」と**同一集合**（公開済み 178 中 反映済み 21 / 未反映 157・未公開 18）
- 建設部門 110 のうち 58 が UTM 欠落分。**`.claude/state/note-utm-live-remaining.txt`（99 行）は 41 件ぶん陳腐化している**（8/5〜8/17 の一括反映で既に synced）。そのまま流すと 41 件を無駄に再送信するので、着手前に `--json` の `driftFiles` から作り直す
- 旧記載の `.tmp/republish-batch2.txt` は**消滅している**。対象リストは毎回 `--json` から再生成する

**反映後**: `npm run check-note-structure` で FULL_LOCK / PAYWALL_LEAK ゼロを確認し、`.claude/state/note-republish-hashes.json` をコミットする。

### [DN-0004] 生成物・送客先を見る検査が存在しない（機械チェックの穴 残 2 件）
タグ: [コンテンツ品質] [種類:不具合] [インフラ・計測] [実行:対話] [起票:2026-08-18]

2026-08-13 監査の 6 件のうち **#1 / #3 / #5 / #6 は解消済み**。残る 2 件はどちらも
「新しい検査を設計する」必要があり、実装手段の判断が要る。

| # | 穴 | 実害 |
|---|---|---|
| 2 | **生成画像の色・文字を検査するものがゼロ** | X カード PNG（`content/sns/x/**/img/`）はどの check も開かない。`check-ogp-design` は輝度判定のみで資格別テーマ色を見ていない |
| 4 | **送客先の状態検査が X の「計画」だけ** | note 本文（714 リンク）・ココナラ（12 箇所）・IG（313 ファイル）の送客先が live で生きているか未検証 |

**#2 の判断が要る点**: 生成画像の中身を機械で見る手段（OCR / 基準画像とのピクセル差分 /
生成時に構造化ログを吐いて画像でなくログを検査する）のどれを採るか。3 つ目が一番安く、
`gen-x-card` が描画に使った色・文字列を JSON で残せば画像を開かずに検査できる。

**#4 の下敷き**: `check-sns-urls` が本番 `/docs/` の実在を 886 ファイルで検査済み（2026-08-18 実測）。
これを note 本文とココナラへ広げる形が近い。ただし note は有料記事の本文が未ログインで取れないので、
`note-live-check.mjs` の `isUnmeasurable` と同じ「計測不能を FAIL と呼ばない」扱いが要る。

### [DN-0005] X 9月分90本の週次投入（8/25頃から毎週・意図的に未投入）
タグ: [SNS・マーケ] [種類:制作] [実行:sweep]

9月分90本（1日3本・9/1-9/30）は**執筆・全検査済みだが、あえてキューへ積んでいない**。
`x-post-policy.md` §11.6 が「1週間分ずつ」を定めており、141本を一度に積むのは
2026-06-12 凍結の実因そのものだから。8月分51本は投入済み。

| 週 | 対象 | 本数 | ドラフト |
|---|---|---|---|
| 1 | 9/1-9/7 | 21 | 090 |
| 2 | 9/8-9/14 | 21 | 090 / 091 |
| 3 | 9/15-9/21 | 21 | 091 / 092 |
| 4 | 9/22-9/30 | 27 | 092 |

**手順**（1週ごとに繰り返す）

```bash
npm run x-schedule-guard -- --queue    # 緑を確認
npx tsx .claude/skills/social/publish-x/publish-x.ts <NNN> --tweets <a>-<b> ${=DATES}
npm run x-sync-status                  # キュー実在を実照合（投入数と queued 昇格数が一致するか）
```

- **zsh は変数を単語分割しない**。`$DATES` だと日時が引数1個扱いになり、静かに即時投稿モードへ落ちる。`${=DATES}` 必須（`publish-x/SKILL.md` に事故記録）
- **`--dry-run` の緑は証拠にならない**。ログで「📅 予約モード確認OK」を目で読む
- 凍結・警告の兆候が1度でも出たら即 S0 へ後退し、投入を止める（§11.6）

### [DN-0006] Kindle e-02 を欠陥版から差し替える（審査中・別セッションがKDP操作中のため保留）
タグ: [収益化] [種類:不具合] [実行:ユーザー]

`e-02`（1級土木一次 全年度 1162問・¥1,250）が **欠陥版のまま Amazon 審査中**（`in_review`・ASIN 未発行）。
ローカルは 2026-08-12 に修復済みだが、Amazon 側は古いまま。

**欠陥の中身**（提出済みバイナリ `b8e8d0a7de` を実展開して確認）
- **24章すべて**で章タイトルが `article.mdx`。目次が「article.mdx（61問）」×24 で年度も問題A/Bも区別できない
- 各章冒頭に YAML frontmatter（`title:`/`seoTitle:`/`tags:`/`ogp:` …）が本文として印字
- `<p className="text-center">…</p>` など JSX も生のまま
- 設問・解説の中身自体は正常（読めない本ではないが、商品として出せる体裁ではない）

**原因**（当初「BOM 付き5ファイル」と結論づけたが誤り）
24本のうち BOM 持ちは5本だけで、残る19本は一度も BOM を持っていない。真因はパーサの
`/^---\n/` が **BOM でも CRLF でも落ちる**こと。Windows は既定 autocrlf なので作業ツリー全体が
CRLF になり、その状態でビルドすると全章が一斉にファイル名フォールバックする。
→ ビルダ3本（`build-pe1-kindle` / `build-essay-kindle` / `build-takuitsu-pdf`）を
BOM/CRLF 耐性に修正済み（`26cc51d789`）。dist 38 冊は無欠陥を確認済み。

**判断（未決）**: 審査通過を待たず今のうちに差し替えるか、通過後に改訂版を出すか。
推奨は**通過を待たず差し替え**（まだ1冊も売れていない状態のほうが、レビューが付いてからの改訂より安全）。

**保留理由**: 2026-08-13 時点で別セッションが KDP を操作中。KDP は収益アカウントで
同時操作すると状態が壊れるため、そちらの完了を待つ。

```bash
node scripts/kdp-publish.mjs --book e-02   # 再提出（--commit は gate）
```

- 提出前に本棚突合で重複を確認（`kdp-operator` の手順）
- 差し替え後は `scripts/kindle-published/catalog.json` の status を更新
- 検知ゲートは `npm run check-kindle-epub-leak`（EPUB 実展開＋ソース BOM・pre-commit は `--bom-only`）

### [DN-0007] ココナラ 初添削の工数実測 → プレミアム週枠の再判断
タグ: [収益化] [種類:改善] [実行:ユーザー]

C12 プレミアム（教材18冊＋添削2テーマ・¥15,000）は `weeklyCapacity: 1` で開始した。**添削は本番顧客への納品が未経験**（S2 はレビュー0＝販売実績ゼロ）のため、初回の工数が読めないことによる暫定値。

- 初受注時に `orders-log` の `tensakuMinutes` を実測記録
- 2〜3件の実測が出たら週枠を再判断（30分超が続くなら据え置き、10〜20分で収まるなら 2〜3 へ）
- 判断基準 → [ココナラ展開キット.md §5 工数設計](../../content/note/1級・2級土木/ココナラ展開キット.md)

### [DN-0009] note ライブ反映の CDN 確定失敗 — 待ち延長では解けないと判明（次は経路を疑う）
タグ: [インフラ・計測] [種類:不具合] [実行:対話] [起票:2026-08-17]

**2026-08-18 の実測で「待てば通る」仮説が否定された。** 案 1〜4 のうち残るのは 2（別回線）と 4（判定条件）。

| 上限 | 結果 |
|---|---|
| 20 秒/枚（旧既定） | 画像持ち記事の 40% が ABORT（2026-08-17 実測・着手 15 件中 6 件） |
| 45 秒/枚（現既定） | 3 枚の記事で上限 135 秒・**確定 2/3 で timeout** |
| 180 秒/枚 | 582 秒で **ブラウザが Target crashed**（`page.evaluate` を 1.5 秒間隔で 9 分以上ポーリングし続けるため） |

**待ち時間を伸ばす方向は行き止まり**。`settleUploads` は長時間ポーリングそのものが自壊する。
また 3 枚中 2 枚は確定して 1 枚だけ確定しないという形なので、「全体が遅い」より
**特定の画像がアップロードされていない**（note 側 or プロキシで落ちている）可能性が高い。

**次にやること（どれも実測が要る）**:

1. 確定しない 1 枚を特定して、その画像だけを単独でアップしてみる（サイズ・形式・ファイル名の特徴を見る）
2. 別回線（テザリング等）で同じ記事を回す。プロキシ要因なら切り分けられる
3. `settleUploads` の判定条件を見直す（`img:not([src^="blob:"])` の数え方が実体とズレている可能性）。
   ただし**緩めると live で画像が欠落する**ので、判定を変えるなら反映後のライブ実査とセットにする

既定は 45 秒/枚のまま据え置く（20 秒より確実に良く、クラッシュもしない）。

> [!note] 旧形式の abort 記録 13 件は 2026-08-18 に処理済み
> public API でライブ実査し、11 件は published・本文 5,517〜112,841 字・画像ありで破損なしを確認して解除。
> 残る 2 件は `is_limited=true` で未ログイン API では本文が返らず**計測不能**なのでゲートを維持している
> （計測不能を「無事」と読み替えない）。

### [DN-0010] noteカバーV4 残2件の手動更新（free×メンバーシップ連携LP）
タグ: [収益化] [種類:不具合] [SNS・マーケ] [実行:ユーザー] [起票:2026-08-20]

Crop-safe V4 全量移行の残り。2026-08-20 に `note-update-cover` を現行UIの「試し読みエリアを設定」へ対応させ、完全攻略ガイド索引と2級想定工事バンク索引は自動更新・API確認まで完了。残る2件はメンバーシップ連携LPの公開範囲を個別確認して更新する。

1. メンバーシップ「はじめに-合格ラボ」（`content/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/`）
2. 「1級土木-二次まるごとパック」LP（`content/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/`）
新カバーは各 dir の `img/cover.png`。知見 SSOT: memory `reference_note_cover_live_gotchas`

### [DN-0011] IG 論点パック 残92件の波状予約（1セッション30件）
タグ: [SNS・マーケ] [種類:制作] [実行:ユーザー] [起票:2026-08-18]

1級/2級土木の論点パック 122 件のうち 30 件を予約済（2026-07-17・7/18〜8/1）。残 92 件を波状で継続予約する。

**過去日の張り付きは 2026-08-18 に解消済み**。`ANCHOR` 固定＋過去日ガード無しで未予約分が過去日へ落ち続け（8/17 に 32 件 → 8/18 に 41 件と 1 日 2 件ずつ悪化）、Business Suite が過去日時を拒否して失敗 2 連続で自動中止する状態だった。
`rebaseToFuture` を入れて**未予約分を明日以降へ 1 日 2 件で詰め直す**ようにしたので、消化が何日空いても再発しない。

- **コマンド**: `node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30`（予約済は status.json で自動 skip＝冪等・再開安全）。1 週間以上空いたら先に `--dry-run` を 1 本。全体は `--plan`
- **現在のプラン**（2026-08-18 実測）: 92 件 / 46 日 / 2.00 件per日・**8/19〜10/03**。過去日 0・Meta +75 日枠（11/01）超過 0・**1級パックが二次（10/4）後にはみ出す件数 0**
- **安全弁**: ブラウザ自動操作＝Meta 規約グレー・X 凍結歴あり。**1 セッション 30 件上限**（スクリプトが強制）。実行後 status.json を commit → 次セッションで同コマンド再実行
- 実行後はプランナー月ビューで実体確認（`npm run verify-ig-status`）。真実源 → memory [[project_ig_theme_packs_civil]]・ig-carousel-skill.md シリーズC

**残作業**: 3 セッションに分けて 30 / 30 / 32 件を予約する（ブラウザ操作なのでユーザー実行）。
`--plan` の日付は実行日を基準に再計算されるため、セッションを空けても常に「明日以降」から積まれる。

### [DN-0013] 1級土木 二次10/4 直前スプリント（死守コア2つ）
タグ: [収益化] [種類:制作] [実行:ユーザー]

令和8年度 1級二次 **2026-10-04**（約13週）が経験記述商品の買い場ピーク。W28（7月中旬）以降に始動。真実源・設計は [content/note/1級・2級土木/noteコンテンツ計画.md](../../content/note/1級・2級土木/noteコンテンツ計画.md) §5.4／§3.3／§1.2。

**一次合格発表は 2026-08-13**（公式 jctc.jp で確認・二次まで約7週）。**買い場は既に開いている**。

**前提**: 「¥9,800 パックは実売ゼロ」（2026-07-01 の転換根拠）は**現在は成立しない**。8/3 に ¥9,800 が売れ、単品 ¥1,980 も 7/30・7/31・8/15 に3件。当時の sales-log は7月を18%しか記録していなかった。

**死守コア（時間が足りなければこれだけ）**:
1. **会員ローンチ** — 律速はユーザー作業（→ 🔴「土木メンバーシップ ローンチ実機」参照）。
2. **最小リスト捕獲** — LINE公式（ノーコード）＋一次→二次ブリッジ磁石「一次おつかれ→二次の始め方」。器=ユーザー／中身（磁石PDF・配信台本・友だち追加CTA）=当方。

**捨てる**: 1級向け一次PDF／重い学科予想の作り込み／2級深掘り。`[Codex候補]`=パック残公開の機械配線。

### [DN-0014] 読み方ガイド 横展開（建設部門＋土木）
タグ: [収益化] [種類:制作] [実行:sweep]

総監の3点セット（完全パック＋R8予想＋読み方ガイド）が sales-log で売上TOP3独占を実証。検証の結果「科目非依存の読み方ガイドのみが横断で成立」（2026-06-23。建設部門は選択科目制ゆえ横断R8予想・横断完全パックは構造的にニーズなし＝作らない）。

**残作業**: ①建設部門 読み方ガイド組成（論文対策キーワード6テーマ＋論文の書き方）②土木 読み方ガイド組成（既存ガイド再包装）。note 公開は手動（成果物は content＋note-magazines.ts published:false まで）。

### [DN-0015] AdSense 再申請（有用性の低いコンテンツ対策の仕上げ）
タグ: [収益化] [種類:改善] [実行:ユーザー]

主因＝非インデックス265本(25%)・本丸=薄いCEMキーワード（2026-07-04 診断・[[project_adsense_low_value_2026_07]]）。薄層CEMキーワード112本の全リライト＋deploy は完了済み。

**残（外部承認依存・ユーザー作業）**:
1. **2026-09-01 の月次 URL Inspection を待つ**。EXP-006 は20本→未登録13本でpartial終了し、同一URLへの登録リクエスト反復は打ち切った。総監209本へ日次10件を機械的に送らない
2. `DN-0107` の次回分類で、現行sitemapの技術エラー0と価値改善方針を再確認する
3. **前回却下から2〜4週間空けて再申請**。チェックリスト `docs/operations/13_AdSense再申請SOP.md`「再申請 SOP」節

### [DN-0016] ココナラ S3 2テーマ版の是正文面をライブへ反映
タグ: [収益化] [種類:不具合] [実行:ユーザー] [起票:2026-08-18]

**SoT の是正は 2026-08-18 に完了**（`src/lib/coconala-services.ts` の `coconala-sakusei`）。残るのはライブ反映のみ。

4テーマ版（`coconala-sakusei-4theme`）が 2026-08-12 に運営から「学校の課題を代行すると判断されるサービス」として取り下げられ、08-17 に文面修正して再出品＝**通った書き方が判明した**。2テーマ版はその表現を欠いたまま公開中だったので先回りで適用した。

| | 是正前 | 是正後（4テーマ版と同基準） |
|---|---|---|
| 学校課題の否認 | 無し | 「学校の課題の代行ではなく、国家資格の第2次検定で問われる本人の実務経験が対象」 |
| 成果物の呼び方 | 「答案の形にまとめます」 | 「記述ドラフトに構成します」 |
| shortTitle | 「答案作成」 | 「記述ドラフト構成」 |

**残作業**: `/coconala-publish` でサービス 4317796 の説明文を SoT の内容へ更新する（ブラウザ操作なのでユーザー実行）。
title（「ヒアリングで作成します」）は 4テーマ版が同じ「作成します」で審査を通っているため変更しない。

### [DN-0017] Gmail 転送＋フィルタで `dobokunotecom` 宛の通知を MCP から読めるようにする（要・別PC作業）
タグ: [インフラ・計測] [種類:改善] [実行:ユーザー]

ココナラの運営通知（出品取り下げ等）・取引通知・評価依頼は `dobokunotecom@gmail.com` にしか届かない。Claude の Gmail コネクタは `uruhayato373@gmail.com` の1アカウントだけに繋がっているので**MCP からは原理的に見えず**、2026-08-12 の4テーマ版 取り下げはメールで気づけずココナラのメッセージ画面で初めて発見した。Playwright で Gmail を開く経路は Google の自動化検知で塞がれている（→ [playwright-auth-profiles.md](../../.claude/knowledge/reference/playwright-auth-profiles.md)）。

転送するだけだとスマホで同じメールを2回見ることになるので、**受信側でフィルタして受信トレイに出さない**。ラベル `dobokunotecom`（teal・`Label_6`）は作成済み。`create_filter` はコネクタのカタログにはあるがセッションに公開されておらず、フィルタ作成は人の作業。

**順序が大事**（転送を先に有効化すると、フィルタができるまでの分が受信トレイに出る）:

1. `uruhayato373` 側 — 設定 → フィルタとブロック中のアドレス → 新しいフィルタを作成 → **To** に `dobokunotecom@gmail.com` → 「受信トレイをスキップ（アーカイブする）」＋「ラベルを付ける: `dobokunotecom`」
2. `dobokunotecom` 側 — 設定 → メール転送と POP/IMAP → 転送先に `uruhayato373@gmail.com` を追加 → 確認コードを承認（コードは `uruhayato373` に届くので Claude からも読める）→ 「受信メールを転送する」を有効化

**完了条件**: `label:dobokunotecom` でココナラの取引通知が1件以上ヒットする。**0件は「メールが無い」ではなく設定が効いていない**（12原則 9）。完了したら `coconala-operations.md` §3-1 と memory `reference_gmail_mcp_only` の「MCP では見えない」記述を実態に合わせて更新する。

不採用案: ココナラのサブメール欄への登録はココナラの通知しか救えず、保存にログインパスワードが要る（エージェント実行不可）。転送ならその受信箱宛て全部（Brain 審査結果を含む）が対象になる。

---

### [DN-0018] 売上取得スクリプトの committed 化（Phase B-5）
タグ: [インフラ・計測] [種類:改善] [実行:ユーザー] [起票:2026-08-17]

`sales-tracking.md`「取得と検算」に手順は書いたが**実装が使い捨てで残っていない**。次回また手作業で組み直すことになる。`scripts/check-sales-freshness.mjs:116` は復旧手段として `npm run note-sales-fetch` を案内するが、**そのスクリプトは存在しない**（壊れた案内）。

- `scripts/note-sales-fetch.mjs` を新設（read-only・既定 dry-run・`--commit` で書き込み）
- パスワード再確認は**人が通す**。`ctx.close()` で Cookie 書き戻し・storageState 退避
- 月フィルタは `<select>` の 0=年 / 1=月。「もっとみる」を尽きるまで押す（7月は14回で145件）
- **検算に通らなければ1バイトも書かない**: 明細合計が「売上管理」の月次表示と一致するまで exit 2
- productId 解決を `scripts/lib/sales-normalize.mjs` に純関数で切り出し、`tests/sales-normalize.test.mjs` で固定（`bk-i-r8-yosou-04-cn-gx` と `bk-i-r08-yosou-4` が同一 id に解決されること）

**先行できる部分**: 純関数（`sales-normalize.mjs` + テスト）はログイン不要で今すぐ書ける。Playwright 取得本体だけがユーザーのパスワード認証を待つ。

> [!note] Phase E（CTA 到達検査の実描画同期）は 2026-08-17 に完了
> [PR #470](https://github.com/uruhayato373/doboku-note/pull/470) で 4 点ズレを是正し、civil primary 29 ページの死に配線も解消・本番実査済み。
### [DN-0019] 土木メンバーシップ ローンチ実機（律速＝添削の工数実測）
タグ: [収益化] [種類:制作] [実行:ユーザー] [起票:2026-07-30]

会員の器は 2026-07-30 に完成済み（2プラン公開・`civil-membership-lab` published:true・サイト会員CTA 発火・本番 deploy 実査）。2026-08-05 に初の入会（通年 ¥1,480）。

**律速はユーザー作業 1 点**: 添削 1 本の工数実測（30 分以内か）。これが出ないと定員と価格が確定せず、添削つきプランを募集できない。二次 10/4 の買い場に間に合わせるならここが最優先。

実測後に決まる従属タスク（すべて本セクションが親）:
- 添削つきプランの定員・価格の確定 → 募集開始
- 無料集客 16 本の公開（`note-publish-magazine --commit`）
- **2級 想定工事バンク（36本＋索引・`civil-2-koji-bank` ¥5,480・公開済み）を会員特典として2級ライブラリへ内包**（2026-08-17 に統合。会員ローンチが律速で単独では動かせないため）

週次の予想問題配信は「会員フロー 週次配信」が、フロー在庫の制作は同セクションが持つ。

### [DN-0093] TODO UIとAgent実装の実行ライフサイクルを統合する
タグ: [エージェント・SSOT] [種類:改善] [実行:対話] [起票:2026-08-18]

TODOをAdminで管理し、Codexが設計、Claude Codeが実装する運用を、task → plan → claim → verify → completeの一貫した機械契約にする。現状は`[進行中]`を選定器が除外しない、planの相互参照を検査しない、完了時のbacklog・monthly・weekly・plan・dispatch log更新が別操作という欠落がある。

- **設計根拠**: [TODO UI × Agent実装 運用設計の批判的レビュー](../../docs/reviews/critical/todo-ui-agent-implementation-operations_批判的レビュー.md)
- **実行順**: 情報アーキテクチャ移行（2026-08-18 完了・`docs`/`content`/`.claude` の 4 領域）の差分を実査してから、WIP排他 → task-plan結線 → claim/release/complete共通CLI → ID付き実行ログ → Admin状態表示・Claude Code用prompt生成の順で実装する
- **禁止**: 既存の情報アーキテクチャ移行セッションと同じファイルを並行編集しない。task-plan結線とclaimが成立する前に、UIからAgentや任意shellを直接起動する機能を作らない
- **完了条件**: 同一IDの二重claimを拒否し、実行中カードを自動選定から除外する。planの孤児・リンク切れ・重複を検査し、完了処理でbacklog・monthly・weekly・plan・実行証拠を一貫して閉じる。恒久ルールを`.claude/knowledge/`へ抽出後、このレビューを削除する

### [DN-0106] GSC 検索流入停滞の原因分離と performance データ全件化
タグ: [インフラ・計測] [種類:改善] [Codex候補] [実行:sweep] [起票:2026-08-20]

**2026-08-22 Phase 1 実装済み**: query/pageの週次取得へ`--all`を追加し、ページング純関数・0行/truncatedゲート・テストを追加した。旧8/21スナップショットは意図どおり`INCOMPLETE`。次回CIで`truncated:false`を確認してからPhase 2へ進む。

**目的**: 「アクセスが増えない」を、検索流入・SNS/リファラル・試験日程による季節性・index coverage の4要因に分け、検索施策で動かせる部分だけを実験化する。推測で title/description を一括変更しない。

**実行順**: 本カード Phase 1 → 完全スナップショット取得 → Phase 2/3 → `DN-0107` Phase 0/1 → ユーザー承認 → 統合pilot。データが不完全なまま統合対象を選ばない。

**2026-08-20 baseline**:

- GSC 7日窓は clicks `110 → 77 → 24 → 32`、impressions `1,506 → 1,079 → 590 → 535`（7/13〜8/10）。7月の技術士二次・1級土木一次の直後なので、季節性を分離せず「SEO悪化」と断定できない
- 最新週次レビューでは GA4 sessions が4週で `3,335 → 1,577 → 1,458 → 1,053`。GSC clicks の減少より大きく、SNS/リファラル減が混在している
- `civil-construction-1-guide-strategy` は sessions `641 → 421 → 64 → 45` で再浮上条件成立。engagement は不変なので、本文品質より流入元を先に調べる
- 週次 CI の GSC `query` / `page` は既定100行で `truncated:true`。件数比較や候補数の増減をそのまま判断に使えない。`page×query` は `--all` で完全取得済み
- 技術面は `check-seo-build` error 0、sitemap欠落0、壊れた内部リンク0。先に直す technical error は無い

**Phase 1 — 取得の全件化（最初に実装）**:

1. `.github/workflows/fetch-metrics.yml` の週次 `query` と `page` を `--all` で取得する。`page×query` の既存 `--all` は維持する
2. `.claude/scripts/check-data-integrity.mjs` か同等の既存ゲートへ、最新 `gsc-query-*` / `gsc-page-*` が `truncated:true` なら WARN ではなく「performance診断に不完全」と明示する検査を追加する。0行も PASS にしない
3. `.claude/agents/metrics-analyzer.md` に、入力が truncated のとき候補件数の前週比較・全体断定をしない規則を追加する。完全な `date` 合計と `page×query` は別に使ってよい
4. 取得関数をテスト可能な純関数へ最小限切り出し、`--all` 時の pagination / `meta.truncated=false` / 0行をテストする。新しい取得基盤は作らない
5. develop 反映後、次の定期 CI またはユーザー承認済み `workflow_dispatch` で完全スナップショットを1回取得する

**Phase 2 — 検索流入の RCA**:

1. GSC `date` の直近8週を clicks / impressions / CTR / position で時系列化し、`.claude/config/exam-calendar.json` の試験日を重ねる
2. 完全取得した `page` / `page×query` を content family（総監 / 技術士建設 / 1級 / 2級 / concrete / category）と `group` に分け、クリック減の寄与を算出する。top100だけの合計をサイト全体と呼ばない
3. GA4 は Data API の Organic Search / Referral / Organic Social を分け、GSCと同方向かを確認する。取得不能な GA4 UI CSV は任意チャネルなので、このRCAのブロッカーにしない
4. `guide-strategy` は主要 query の impressions / position / CTR と、note・X・内部リンク・UTM の流入元を突合する。GSC側が維持なら外部流入の問題、GSC側も低下なら query/順位の問題として分ける
5. `pe-comprehensive-management-keyword-2026` など絶対減上位、`civil-construction-2-secondary-experience-writing-guide` など Hidden Winner を同じ表に置き、季節性・index脱落・順位低下・外部流入減のいずれかに分類する
6. 結果を `.claude/state/improvements/YYYY-MM-DD-gsc-access-rca.md` に保存し、確定判断だけを `gsc-management.md` の観測・判断ログへ追記する

**Phase 3 — 実験化のゲート**:

- 一度に変更するのは最大5 URL、14〜28日、必ず `/nsm-experiment` に baseline / target / next_check を持たせる
- `textbook-scraper` のメタ変更は、既存の人間裁定どおり「順位10位以内・表示300以上/28日・CTR 2%未満」を2期間連続で満たすまで行わない。8/14の自動候補はこの裁定を上書きしない
- `guide-strategy` はRCA完了前に本文やメタを変えない。原因が外部流入ならリンク/UTM、検索順位なら検索意図・競合・内部リンクを1要素だけ実験する
- civil-2 Hidden Winner は次回も sessions 300超なら、既存ページからの導線強化を1実験として起票する。類似記事は増やさない
- description 24件の一括短縮はしない。実験対象URLに入ったときだけ扱う

**完了条件**:

- 最新 `gsc-query` / `gsc-page` が `truncated:false` で、0行検査・paginationテストが通る
- GSC検索減とSNS/リファラル減、季節性、index脱落の寄与が同じレポートで分離されている
- 修正候補は「最大5 URLの実験」または「見送り＋再浮上条件」に必ず落ち、全ページ一括メタ変更が無い
- `npm run check-gsc-auto-review` / `node .claude/scripts/check-data-integrity.mjs` / 関連 unit test が通る

**Claude Code 実行プロンプト**:

```text
DN-0106を実行してください。最初にAGENTS.mdと
.claude/skills/management/seo-growth-review/SKILL.md、
.claude/knowledge/reference/gsc-management.md、
.claude/knowledge/reference/measurement-incidents.md、
docs/operations/11_SEO品質ゲートとClaude分業実装計画.md、
docs/operations/gsc-ga4-playwright-automation-spec.mdを読み、branch・origin差分・dirty filesを確認してください。

Phase 1ではfetch-metrics.ymlのGSC query/pageを--all化し、truncated/0行を偽PASSにしない最小の整合ゲートとテストを追加してください。既存のpage×query取得・CI供給モデルを再設計しないでください。

Phase 2ではコミット済みスナップショットだけを読み、GSC検索、GA4 Organic/Referral/Social、試験日程、index coverageを分離したRCAレポートを作成してください。top100データを全体値として扱わず、title/descriptionの一括変更はしないでください。

Phase 3は最大5 URLの実験候補または見送り条件まで。外部workflow_dispatch、GSC操作、deployはユーザー承認なしに実行しないでください。最後に変更ファイル、根拠数値、検証結果、次回測定日を報告してください。
```

### [DN-0107] index coverage 回復プログラム（総監209本の再分類＋権威性）
タグ: [インフラ・計測] [種類:改善] [実行:対話] [起票:2026-08-20]

**2026-08-22 完了済み**:

- GSC UIを完全取得・正規化（allKnown: crawled 353 / redirect 857 / 404 297 / canonical 160。現行sitemap側のcrawledは302）
- EXP-006を実体同期し、20本→未登録13本の`partial`で終了。登録リクエスト反復を中止
- `npm run search-growth:cem-plan`を実装。総監209本を`KEEP 31 / IMPROVE 19 / CONSOLIDATE 0 / NOINDEX_REVIEW 0 / MONITOR 159`へ分類し、`.claude/state/improvements/cem-index-consolidation-2026-08-22.{json,md}`へ保存
- 技術修正候補は0。現在は承認対象の統合クラスタも0なので、301・削除・noindex・pilot deployは行わない

**次にやること**:

1. `DN-0106` の次回CIでquery/page全件スナップショットが`truncated:false`になった後、`npm run search-growth:report && npm run search-growth:cem-plan`を再実行
2. 2026-09-01の月次URL Inspectionで全体・総監・各カテゴリの遷移を更新。`MONITOR`のうち2回連続未登録になったURLだけ再分類
3. `CONSOLIDATE`が出た場合のみ、source/target/残す固有情報/需要を最大10件で提示し、明示承認後にpilotする

**権威性の外向きレバー**:

1. 既存資産を再利用し、被リンク理由になる独自データを1本だけ作る。第一候補は既存 `frequent-topics` の根拠データ・算出方法・CSV/表の公開強化。重複ページは新設しない
2. civil版ランキングは past-exam backlink / 論点タグのcoverageを先に監査し、根拠が作れる場合だけ1級または2級の1本を制作する
3. hub・該当過去問・カテゴリから文脈リンクを集め、note無料記事とSNSではデータの要点を紹介してcanonicalへdeep linkする
4. 外部サイトへの掲載依頼・プロフィール更新・実送信はユーザー担当。Claude Codeは候補先、依頼文、UTM、記録テンプレまで作る
5. 28日で impressions / indexed、56日で参照ドメインまたは外部リンク獲得を判定し、量産は成果確認後に決める

**技術warnの低優先監査**:

- `check-seo-meta` の HIGH 0は維持する。`jsonld_headline_mismatch` 59件は10件をサンプルし、schemaがseoTitleを使う共通実装の問題か、意図的なH1差かを判定する。共通原因なら1箇所で直し、59 MDXを個別編集しない
- `description_long` 24件は順位・表示が実験条件を満たすURLだけ直す
- `ssr_thin_body` は `/search` がnoindexの意図的状態かを確認し、`/category/reference-materials` だけユーザー価値のある説明が不足する場合に限って改善する
- このwarn監査をcoverage回復の主因として扱わない

**残る完了条件**:

- 次回全件データと月次Inspectionで再分類し、pilotを見送るか承認済み5〜10クラスタに限定する
- 独自データ1本に算出根拠・canonical・内部配線・外向け配布計画を揃える
- 28日/次回月次の判定を`gsc-management.md`へ記録する

**Claude Code 実行プロンプト**:

```text
DN-0107をPhase 0から順番に実行してください。最初にAGENTS.md、
.claude/knowledge/reference/gsc-management.md、
.claude/knowledge/reference/measurement-incidents.md、
docs/operations/06_seo-note-synergy-strategy.md、
docs/strategy/13_土木公務員SEO戦略2026-08.md、
backlogのDN-0015/DN-0088/DN-0106を読んでください。

まずEXP-006とgsc-indexing historyのドリフトを、run item単位の証拠で是正してください。次に総監のcrawled-not-indexed母集合をcanonical URLで重複排除し、検索実績・index遷移・内部リンク・類似性・過去問価値を付けた5分類レポートを作ってください。

このターンで自動実施してよいのはread-only分析、台帳の事実同期、候補レポート、テストまでです。301、削除、published変更、noindex、GSC登録リクエスト、外部投稿、deployは、対象URL一覧と影響を提示してユーザー承認を得るまで実行しないでください。

承認後もpilotは5〜10クラスタ、1deploy最大10 source URLです。メタ一括変更・類似記事の新規量産・313件一括noindexは禁止です。最後にbaseline、分類件数、pilot候補、検証結果、28日後と次回月次の測定日を報告してください。
```

## 🟡 中 — 2〜3ヶ月以内

### [DN-0110] 動画パック基盤・通常動画pilot・read-only管理画面
タグ: [SNS・マーケ] [種類:改善] [Codex候補] [実行:対話] [検証:quality:audit:ci] [起票:2026-08-21]

サイト・note・既存図版をYouTube通常動画へ再編集し、関連Shorts・Instagram・Xへ派生するストックコンテンツ基盤を作る。現状はShorts台帳200本（公開13・pending187）がある一方、通常動画への接続、クリック可能な外部導線、動画パック単位の品質・公開・成果管理がない。追加量産より先に、動画マスターと回遊・計測を成立させる。

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

**批判的レビュー**: [動画コンテンツ運用設計_批判的レビュー.md](../../docs/reviews/critical/動画コンテンツ運用設計_批判的レビュー.md)

**依存関係**: 左ナビのコンテンツ中心IAとYouTube入口は`DN-0103`を再利用し、本カードで別のナビregistryを作らない。`DN-0046`の聞き流し一問一答は本カードへ統合済み。

**確定方針**:
- 資格別・媒体別agentは増やさず、`video-script-writer`（Generator）と`video-content-qa`（Evaluator）の1組だけを新設する
- 既存`yt-shorts-title-writer`／`yt-shorts-publisher-qa`はShorts固有責務に限定して残す
- `content/sns/video-packs/{exam}/{slug}/`を制作SSOT、`.claude/state/video-content-status.json`を可変状態、mp4/wav等をR2とする
- adminは`/content/video`で企画・QA・派生・公開・計測をjoinするread-onlyビュー。編集・投稿・shell・secret・ライブAPIを持たせない
- Shortsは関連通常動画へ送り、通常動画のクリック可能な概要欄からサイト/note/ココナラへ送客する。1動画1主CTA

**Phase 0 — 契約と偽PASS防止**: manifest schema、state machine、CTA/UTM、sourceRef、relatedVideoIdを確定。`check-video-content`とfixtureを作り、対象0件・parse失敗・source未解決・status未取得をPASSにしない。既存Shortsの尺・リンク・cron記述を現行仕様へ同期。

**Phase 1 — 手動pilot 4本**: 16:9 renderer・字幕・音声の最小経路を実装。1級/2級土木施工経験記述2本＋技術士総監2本を制作し、各通常動画からShorts 2本・IG 1組・X 1スレッドを派生。公開前に機械ゲート、独立QA、ユーザー承認を通し、公開後に実URL・videoId・関連動画・CTAを再照合する。

**Phase 2 — skill/agents**: 薄い`/video-content` skillと上記2agentを新設。生成→機械ゲート→独立QA→承認待ちで停止し、レンダリング・R2・投稿は既存CLI/workflowへ委譲する。skills/agents registry、coupling gate、責務境界テストを同時更新。

**Phase 3 — admin/CI**: `/content/video`、SNS状態、動画成果ビューを追加。manifest＋runtime state＋CI供給snapshotをjoinし、未取得/期限切れ/ドリフトを明示。YouTube AnalyticsとGA4 UTMはCIで取得し、会社PCからライブAPIを叩かない。

**Phase 4 — 段階拡張**: 6週間のpilotでShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移を評価。送客シグナルが無ければ自動化拡張を停止。成立後だけ他資格とThreads会話briefへ広げる。ThreadsのX単純クロスポスト、全記事一括動画化、全資格同時展開は禁止。

**完了条件**: 4packのmanifest/script/storyboard/QA/派生/statusが一意にjoinされ、全機械・意味ゲートとadmin型検査/E2EがPASSする。4本の通常動画と関連Shortsを外部実体で照合し、6週間後の継続/修正/停止判断日とbaselineを記録する。公開・push・deploy・外部設定変更は対象と影響を提示してユーザー承認を得るまで実行しない。

### [DN-0112] NotebookLMコンテキスト圧縮ゲートウェイでClaude/Codexトークンを削減
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [実行:対話] [起票:2026-08-21]

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
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [実行:対話] [起票:2026-08-21]

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
タグ: [収益化] [種類:改善] [Codex候補] [実行:対話] [起票:2026-08-21]

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
タグ: [収益化] [インフラ・計測] [種類:改善] [Codex候補] [実行:対話] [起票:2026-08-22]

1級土木の無料過去問演習を、検索流入の入口から **Premium買い切り・note送客・自社リスト**へつなぐ。サイト全体はログイン必須にせず、PWAの購入権限・端末間同期・購入復元だけをメールのマジックリンクで認証する。メールを会員ID兼メインリスト、LINE公式を試験直前・合格発表・一次→二次の任意補助に分ける。

**設計SSOT**: [PWA過去問アプリ設計方針 v2](../../docs/products/06_PWA過去問アプリ設計方針.md) ／ [リスト化・自社オーディエンス戦略](../../docs/strategy/10_リスト化・自社オーディエンス戦略.md) ／ [収益化戦略](../../docs/strategy/04_収益化戦略.md)

**既存タスクとの境界**:

- `DN-0013` のLINEは、2026-10-04の1級二次に向けた「一次おつかれ→二次の始め方」の季節キャンペーン。本カードはPWA会員ID、購入権限、継続利用、全資格へ再利用するリスト基盤を扱う。`DN-0013`の期限付き配信を待たせず、友だち・配信台本・CTAを勝手に移管しない
- noteは模範解答・経験記述・論文等の文書商品を販売し続ける。PWAは弱点分析・復習計画・端末間同期等のツール価値だけを販売し、既存note商品の本文をPremiumへ複製しない
- `DN-0114`は法人ライセンスpilot。本カードは個人受験者のPWA買い切りで、法人アカウント、席数管理、請求書払い、LMSを実装しない

**起票時の実査結果（2026-08-22・再調査不要）**:

- `src/app/tools/kakomon-quiz/`に1級土木の無料演習が稼働し、平成26〜令和7年度の全1,098問、年度別、ランダム20問、間違い復習、`localStorage`進捗、結果画面のAdSense・note CTAまで存在する
- 公開ページとメタデータが「全1,098問を無料」と約束しているため、後から全問アクセスを有料化しない。Premiumは分野別弱点分析、復習スケジュール、端末間同期、広告非表示、オフライン、模試履歴等に限定する
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
  → 弱点分析・復習計画・端末間同期・広告非表示
  → 記述式／模範答案はnoteへ送客
```

**Phase 0 — 計測契約とfake-door検証（認証・決済を作らない）**:

1. `quiz_start / quiz_complete / review_start / premium_view / premium_intent / email_interest / line_interest / note_cta_click`のイベント名、発火条件、`exam / placement / mode`パラメータを既存GA4規約に合わせて定義する。メール、LINE ID、購入者IDをイベントへ送らない。実リスト開始後の`email_opt_in / line_add_click`は別イベントにする
2. 結果画面とメニューにPremium案内を1面ずつ置く。価値は弱点分析、復習計画、同期、広告非表示。価格は仮説¥980〜¥1,480と明記し、「準備中／先行案内」であることを隠さない。未実装機能の決済を受けない
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
5. 最初の有料機能は弱点分析、端末間同期、広告非表示の3つに絞る。オフライン、PDF出力、AI学習計画、複数資格bundle、サブスクはpilot後へ送る

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

全1,098問の無料アクセス、ログイン不要の演習、localStorage進捗、AdSense、note CTAを維持してください。
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

### [DN-0103] 管理画面をコンテンツ中心IAへ再編しBrainをpilot統合
タグ: [UI・UX] [種類:改善] [Codex候補] [実行:sweep] [検証:test:e2e:admin] [起票:2026-08-21]

管理画面の第一分類が「発信」4媒体と「管理 > 制作物」に分裂し、実体として存在するYouTube・ココナラ・Kindleや、販売中のBrain商品へ日常導線がない。`docs/products` 21本中14本がBrain関係で、商品設計・販売原稿・無料note原稿・ココナラPDF source・手動playbookが同じ分類に混在する一方、販売本文・画像・配布ZIPは `.claude/config/brain*` に置かれ、Publishable ContentとAgent Configの境界も崩れている。

**実装指示書**: [DN-0103-admin-content-ia/00-master.md](../plans/DN-0103-admin-content-ia/00-master.md)

**実行順**: ①左ナビを「コンテンツ」へ変更しpureなchannel registryへ集約、②MarkdownをSSOTのまま文書を目的・チャネル・保持区分で絞り込み、Callout/表/関連タスクを改善、③Brainの販売本文・画像・ZIPだけを`content/brain`へmoveして全script/workflow/skill/agent参照を同期、④Brain専用read-only画面で商品・販売文・画像・配布物・関連設計を横断表示、⑤恒久SSOTへ抽出して本カードとplanを削除する。

**禁止**: `docs/products/brain-*`の一括移動、旧新コピーの併存、HTML文書SSOT化、sanitize無効化、価格/status/URL/ZIP名/R2 keyの変更、adminへの公開・R2 upload・任意shell実行UI追加、push/deploy/外部サービス変更。Phase単位で実装・検証・停止する。

**完了条件**: adminからSite/note/X/Instagram/YouTube/Coconala/Kindle/Brainへ到達でき、`/docs`は多軸分類、Brainは`content/brain`だけが販売素材SSOTとなる。`check-information-architecture`・`check-doc-refs`・`check-brain-wiring`・admin型検査・E2E・light/dark/mobile目視がPASSし、恒久SSOT抽出後に本カードとplan bundleを削除する。

### [DN-0104] 品質ゲートの Windows 実行が構造的に偽赤（ローカル検証が成立しない）
タグ: [インフラ・計測] [種類:不具合] [実行:対話] [検証:quality:audit:ci] [起票:2026-08-21]

**発覚**: 2026-08-21、Actions 復旧 handoff の再開手順（ローカルで全量検証してから通常コミット）を Windows PC で実行しようとして判明。`quality-audit.mjs` の `spawnSync` が `shell` 無しで `npm`/`npx`（実体は `.cmd`）を起動できず ENOENT。**orchestrator 新設（`d30bf11a7`）以来ずっと Windows では 54 件中 53 件が 0.0 秒 FAIL** で、`node` 直起動の `frontmatter` だけが走っていた。同 commit で `shell: process.platform === 'win32'` を入れて起動は通した（47 PASS / 6 FAIL / 1 timeout）。

**同 commit で追加修正済み**: `check-relative-links` は `resolve('/'+dir, target).slice(1)` が Windows でカレントドライブを足して `C:/...` を返し、`.slice(1)` が `C` を削って `:/docs/...` にしていた。`posix.resolve` へ変更し、**偽の壊れリンク 807 件 → 0 件**、`tests/relative-links.test.mjs` も 7/7 に回復。ドキュメントを触る commit が Windows で毎回 pre-commit に弾かれる状態だったため先に潰した。

**残っている本体**: 以下は Windows 固有の理由で落ちる。**CI は全 22 workflow が `ubuntu-latest` なので本番影響はなく、被害はローカル検証が成立しないことに限られる**。
- `tests/repository-paths.test.mjs`（2 件）: `import()` に `C:\` を直渡しして `ERR_UNSUPPORTED_ESM_URL_SCHEME`（Windows は `file://` URL が必要）
- `check-jst-date`: 全量実行時のみ、glob が絶対パスを返すのに `join(ROOT, f)` して二重連結し ENOENT。**`--staged`（pre-commit 経路）は正常**なのでコミットは阻害しない
- `check-dead-handles`: 走査 0 ファイル（自ら「検査不成立」と申告＝設計は正しい）
- `check-knip-ratchet`: 同じ `npx` ENOENT（こちらも「増加なし」でなく「検査不成立」と申告）
- `check-content-layout`: timeout

**判断が要る**: 54 件を全部クロスプラットフォーム化する価値があるか。**ローカルは pre-commit（staged・高速・現に Windows で動く）、全量は CI（Linux）**という分担にして、Windows での全量実行は「やらない」と明記する案が対抗馬。§9 の「偽赤も偽緑と同じ害」に照らすと、直す気のない検査を赤いまま放置するのが最悪。

### [DN-0108] Windows・Mac共通のPlaywright認証永続化基盤
タグ: [インフラ・計測] [種類:改善] [Codex候補] [実行:対話] [起票:2026-08-21]

Playwrightのログインprofileはサービス別に永続化されているが、note/Brain/ココナラ/KDPはrepository配下の`.local`、X/Instagram/A8の一部はMacユーザー名の絶対パス、Googleだけは独自`DOBOKU_PROFILE_ROOT`と保存先規則が分裂している。worktreeやWindows/Macを切り替えると別profileを作り、再ログインや誤アカウント操作の原因になる。一方、Cookie/profileのPC間同期はOS暗号化・漏洩・破損リスクがあるため採用しない。

**実装指示書**: [DN-0108-cross-device-playwright-auth/00-master.md](../plans/DN-0108-cross-device-playwright-auth/00-master.md)

**確定方針**: コード・service registry・account assertだけをGit共有し、認証profile/stateはWindowsとMacで独立保持する。`DOBOKU_AUTH_ROOT`＋OS標準ローカル領域へ統一し、password/2FA/CookieはGit・env・GitHub Secretsへ保存しない。GitHub ActionsはAPI/MCP経路を維持する。

**ハーネス判断**: `.agents/skills/dev/playwright-auth/SKILL.md`をuser-invocableかつ`disable-model-invocation: true`で新設し、`auth:paths/doctor/login/status/migrate`を安全な順番で呼ぶ薄いオーケストレーターにする。skill内へ認証ロジックを複製せず、`skills-registry.md`へ登録する。意味評価や生成がなく決定的scriptで判定できるため、専用agentは作らない。サービス固有操作は既存operator/collectorの責務を維持する。

**機械チェック**: ①CI/ローカル共通=`check-playwright-auth-wiring:strict`でMac/Windows絶対パス、repo相対profile、resolver未使用、secret key候補を0にする、②PCローカルoffline=`auth:paths/doctor`でroot・権限・lock・legacy・profile競合を診断、③PCローカルonline read-only=`auth:status`で`authenticated/expired/blocked/unknown/unsupported`を実ページ＋account assertから判定する。profile存在だけをauthenticatedにしない。CIには実profile・login・statusを持ち込まない。

**実行順**: ①service registry・OS非依存resolver・配線ratchet、②note/Brain/ココナラ/KDP移行、③X/Instagram/Google/A8/もしも/afb移行、④`auth:paths/doctor/login/status/migrate`とservice lock、⑤専用`playwright-auth`スキル新設・registry登録、⑥Windows実機→同じcommit候補でMac実機の順に独立login/status検証、⑦恒久SSOTへ抽出して本カードとplanを削除する。各Phaseで検証・報告して停止する。

**禁止**: profile/Cookie/storageStateのPC間・クラウド・Git同期、password/2FA自動入力、CAPTCHA回避、旧profileの自動削除、target上書き、profile並行利用時の自動kill、profile存在だけでauthenticated判定、account/site/property assert弱化、Gmail Playwright化、投稿・公開・申請・購入・push・deploy。

**完了条件**: runtimeのMac絶対パスとrepo相対profile直書きが0、全対象が共通resolver利用、Windows/Mac双方でnoteのlogin→close→別プロセスstatusとworktree非依存がPASSする。専用スキルが薄いCLIオーケストレーターとして登録され、専用agentが増えていない。A8 profile-plus-state、afb same-process、Gmail非対応を維持し、`check-playwright-auth-wiring:strict`・auth CLIテスト・affiliate/Google配線・lint/type-check/doc refsがPASS。profile/state/Cookie/password/token/2FAのGit差分は0。

### [DN-0101] note L1/L2・サイト→note意味導線の再編
タグ: [UI・UX] [種類:改善] [実行:対話] [検証:audit-note-funnel] [起票:2026-08-20] [期日:2026-10-04]

DN-0100で行き止まりと季節ドリフトを止めた後、機械監査では判定できない「読者の現在地に合う次の一歩」を再編する。L1総合案内は公開済みコンクリート2資格を「準備中」と表示し、技術士第一次試験の入口がない。3つのL2は有料商品が無料記事より先で、サイトの1級一次→二次CTAは10月以降の戻しが手動コメントに依存している。

**実装指示書**: [DN-0101-note-funnel-information-architecture.md](../plans/DN-0101-note-funnel-information-architecture.md)

**実行順**: ①L1の公開実体との一致、②3 L2を「無料で現在地確認→有料で仕上げる→目的別逆引き」へ再編、③総監・建設・土木の資格セグメント維持、④1級一次過去問の季節商品切替を `exam-calendar.json` 駆動化、⑤ソース監査、⑥ユーザー承認後のnoteライブ反映。新しいL2や商品は作らず、既存公開実体だけを案内する。

**完了条件**: L1の「準備中」誤表示と資格入口欠落が解消し、3 L2の最初の選択肢が無料の現在地診断になる。1級一次CTAが10/4後に一次商品へ戻ることを日付固定テストで証明し、`audit-note-funnel`・`check-magazine-cta:ci`・`check-note-link-cards`・`check-note-site-utm` がPASS。ライブ更新後はL1/L2公開APIと目次ブロックを実査する。

### [DN-0021] KDP F系 f-08〜f-16 の審査結果を反映（ASIN を 3 箇所へ記録）
タグ: [収益化] [種類:不具合] [実行:ユーザー] [起票:2026-08-18]

2026-08-03 に f-08〜f-16 の 9 冊を出版申請済み（commit `17d03e22b`）。`catalog.json` は 9 冊とも `status: in_review` で、**ASIN が入っているのは f-08 (B0HCMGB517) と f-09 (B0HCMC5JHG) の 2 冊だけ**。

審査完了メールを確認して LIVE 化した本の ASIN を 3 箇所へ記録する: `scripts/kindle-published/catalog.json` / `content/kindle/strategy.md` / `scripts/kindle-published/README.md`。あわせて `status` を `in_review` → `live` へ flip。

**doc ドリフト**: `content/kindle/strategy.md:194-196` の F シリーズ提出状況表が「f-08〜14 提出待ち」のままで、同ファイル 263-273 行の 08-03 提出ログと矛盾している（`/doc-sync` 対象）。

### [DN-0022] BK-09/10 の過去問記事展開（各科目 15 記事・技術士二次の試験後）
タグ: [収益化] [種類:制作] [実行:対話] [起票:2026-08-18]

BK-09 電力土木 / BK-10 鉄道 の **R08 予想問題集（各 3 記事）は生成・公開・PDF 添付まで完了**（2026-08-11・`note-attach-done.json` で 6/6 実査）。残るのは過去問記事の展開で、1 科目あたり 15 記事。

着手時期は技術士二次の試験後。受験者規模が小さい科目なので、BK-09/10 の R08 予想の売れ行きを見てから量を決める。

### [DN-0023] note ハッシュタグの live 反映 残5本（会員記事のみ）
タグ: [収益化] [種類:不具合] [実行:ユーザー] [起票:2026-07-23]

一般公開記事は 158 本すべて live≥90 で完了済み。**残るのは会員限定（`is_limited`）記事 5 本だけ**で、いずれも `hashtags.txt` を持ちながら live タグが 0。

| noteId | 記事 |
|---|---|
| `n6b66793ca20c` | はじめに-合格ラボ |
| `n66570efb6d23` / `nc92c82ac4ea5` | 会員フロー W1 / W2 |
| `nb589a26111a1` / `n8d23a04bb32b` | 会員フロー W3 / W4 |

**この「live タグが 0」自体が誤診の可能性が高い（2026-08-18 棚卸し）**。判定は未ログイン public API の `hashtag_notes` が空であることに依っているが、`scripts/lib/note-live-check.mjs` は 2026-07-30 に「`published` かつ body 空かつ hashtag_notes 空」を**計測不能**（`isUnmeasurable`）へ分類し直している——`is_limited` 記事は未ログインでは中身を返さないため。さらに 2026-08-06 に `is_limited` を直接シグナルとして足したときの実測対象が、この 5 本のうちの `n66570efb6d23` そのもの。起票日 2026-07-23 は、この誤結論が出ていた時期と一致する。

**最初にやること**: 著者ログイン経路（Playwright・`.claude/knowledge/reference/note-api-verification.md`）で 5 本のタグを直接確認する。タグが実在すればこのカードごと削除。本当に空なら、下の手動貼付が残作業として生きる。

**対処**: 編集画面で `hashtags.txt` を全選択コピペ→更新（手動が確実）。編集URL は `https://editor.note.com/notes/<noteId>/edit/`。

残 5 本は公開 API の `hashtag_notes` で実測した値。対照として一般公開の有料記事（`n74c193d154e5`）は tags=93 を返すので、0 は取得失敗ではなく実測値。

### [DN-0024] PSI リトライの live 検証（実装は完了・deploy 後に確認）
タグ: [インフラ・計測] [種類:不具合] [実行:機械] [起票:2026-08-18]


**残っているのは live 検証だけ**:
- ローカルでは `PSI_API_KEY` が無く、キー無しは匿名共有枠で即 429 になるため実測できない
- `psi-audit.yml` は `ref:` 指定が無く **main のコードで動く**ので、確認は main への deploy 後
- 見るもの: 次の psi-batch で 1 バッチあたりの計測件数が 22 に揃うか（従来は 18〜22 で揺れていた。
  欠測率 6.8%＝直近14バッチ 308 計測中 21 失敗）。`[psi-retry]` のログが出ていれば再送が働いた証拠
- 欠測が残る場合の中央値の扱いは **エージェント側へ明記済み**（`performance-auditor` の
  「回帰検出」＋ `psi-audit` SKILL）: 母数はその URL が測れているバッチだけ・3 バッチ未満なら
  「劣化なし」ではなく「判定不能」と書く・計測件数が 22 に満たない日は欠測件数を添える

### [DN-0025] GA4 の配置別 CTA データを誰も読んでいない（handoff 2026-07-25 抽出）
タグ: [収益化] [種類:改善] [インフラ・計測] [実行:sweep]

`fetch-metrics.yml` が `ga4-cta-clicks-by-placement-*.json` を週次で積んでいる（現在 4 本・最新 2026-08-13）が、**配置別 CTR を比較する読み手がいない**。参照しているのは GA4 側の設定検査スクリプト 2 本だけで、週次レビューにも改善サイクルにも入っていない。

可視インプレッションを実装した目的は「どの配置が効いているか」を判断することなので、`affiliate_cta_impression` と `affiliate_cta_click` を配置別に突き合わせ、低 CTR 配置の是正まで一度通す。通した結果として読む場所（週次レビューか管理画面か）も決める。

### [DN-0026] 土木公務員 SEO 第1期の効果測定（handoff 2026-08-17 抽出）
タグ: [SNS・マーケ] [種類:改善] [実行:機械]

2026-08-17 に資格ハブ改稿＋1級土木の新設ページを公開・デプロイ済み。測定が残っている:

1. 資格ハブ（`pe-comprehensive-management-public-engineer-qualification-map`）と新設ページ（`civil-construction-1-public-servant-merit`）を GSC で URL 検査し、インデックス状況を記録する
2. **目安 2026-09-14 以降**、公開後 28 日と直前 28 日を比較する。判定の正規表現と基準は [13_土木公務員SEO戦略2026-08.md](../../docs/strategy/13_土木公務員SEO戦略2026-08.md)
3. 次記事「土木公務員に技術士は必要？」の着手可否は 1・2 の結果を見てから判断する（語順違いの類似ページは作らない）

### [DN-0027] コンクリート診断士 択一98問＋記述式8本の技術内容レビュー（人手）
タグ: [コンテンツ品質] [種類:改善] [実行:ユーザー] [起票:2026-07-31]

著作権対応で 8 記事・98 問を原典転記からオリジナル演習問題へ全面書き換えした（2026-07-31）。論点は保っているが、**技術内容の人手レビューは未了**。すでに本番公開済みなので、誤りが見つかったら修正して再デプロイする形になる。対象は `content/site/concrete-diagnostician/primary-exercise-01〜08`。

**記述式も同様に未レビュー**（2026-08-17 に旧「著作権方針」セクションから引き継ぎ）。対象は note `mf2a132408b6f` 収録 8 本＋`content/site/concrete-diagnostician/guide-essay`。いずれも公開済みのため事後修正になる。

原典照合できない数値は出していない（JIS 規格値は原理を問う形へ、改正年代順は塩化物総量規制の考え方へ差し替え済み）。

### [DN-0028] コンクリート系 CTA 背景イラスト（cta-bg）未整備
タグ: [UI・UX] [種類:不具合] [実行:ユーザー]

`cta-bg/*.webp` がコンクリート主任技士・診断士の 2 資格分だけ無く、テーマ色のベタ塗りにフォールバックしている。他資格と並べたときに CTA の見栄えが落ちる。

### [DN-0029] 診断士 記事の増補（競合が持ち自社に無い論点）
タグ: [コンテンツ品質] [種類:制作] [実行:sweep]

競合2ブログ（行ってクラブログ・エナガパパ）にあって自社に無いのは **劣化予測の計算演習・維持管理計画とLCC・基準体系・ひび割れパターン図鑑**。企画は旧 plan `doboku-note-purrfect-mist.md` の Phase 4（現環境に無し・別作業環境のもの）。

副次効果として、診断士は全記事が本文 8,000 字未満（最長 7,364 字）のため**中間 note CTA の発火条件を満たしていない**。加筆すれば冒頭 CTA に加えて中間 CTA も自動で乗る。

### [DN-0030] Brain 施工経験記述キットの検証残（handoff 2026-07-19 抽出）
タグ: [収益化] [種類:不具合] [実行:ユーザー]

Brain「Claude Code 施工経験記述設計キット」の配布物検証が未実施のまま出品済み: ①実スキル `quick_validate.py` の動作確認 ②字数検査 ③Windows/macOS 両環境での動作確認。審査結果反映（status flip）は memory `Brainチャネル2026-07` 側で追跡中。仕様 SSOT: `docs/products/brain-claude-code-essay-skill/`

### [DN-0031] Brain 2商品の審査後フォローと販売運用（2026-07-22 申請済み）
タグ: [収益化] [種類:改善] [コンテンツ品質] [実行:ユーザー]

両商品とも制作〜Brain公開申請まで完了（Playwright全自動・審査は原則24h・結果はメール）。旧「β商品化」「スキル商品化」タスクは完了につき本エントリへ置換（2026-07-22）。

- **申請済み**: ①施工経験記述キット ¥7,980（`brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY`）／②総監施策バンク ¥9,800（`.../a/b1IDO3UjMgoTZsNWa0JXY`）。ココナラは両商品 listed 済（¥3,000／¥2,500PDF・/links 反映済）
- **審査結果メールを確認**: 通過→販売開始の告知（note入口記事2本の手動公開＝`content/note/技術士総監/出題テーマ分析-R8地方創生検証/`・`content/note/1級・2級土木/経験記述-AI設計-無料/`、published:false のまま待機中）。却下→指摘に沿って修正・再申請（編集は `.tmp/brain-post*.mjs` のノウハウ＝memory 参照）
- **カテゴリ変更**: 両記事とも「ビジネス」で申請。Brain には「資格」カテゴリあり→審査通過後に変更検討
- **納品オペ**: ココナラ注文時はトークルームで送付（①=`C:\tmp\claude-code-civil-essay-kit-coconala.zip` 外部URL除去版／②=`.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf`）。Brain は有料エリアの R2 リンクで自動（`storage.doboku-note.com/brain/dist/`）
- **売上記録**: 発生したら `/record-sales`（productId 規約は sales-recorder 台帳済）
- **経緯・検証記録**: 企画〜バックテスト＝[brain-r8-policy-prediction-skill/](../../docs/products/brain-r8-policy-prediction-skill)（00〜07・統制run結果=04§6）／①仕様=[brain-claude-code-essay-skill/](../../docs/products/brain-claude-code-essay-skill)／出品手順=[brain-publish-playbook.md](../../docs/products/brain-publish-playbook.md)

### [DN-0032] note施策C フォローアップ: 一次「出る順 合格ノート」の露出調整（任意・売れ行き次第）
タグ: [収益化] [種類:改善] [実行:対話]

C（`civil-1-ichiji-ronten` ¥1,480・[nec34238ca6d6](https://note.com/dobokunote/n/nec34238ca6d6)）は 2026-07-16 公開済。civil primary/secondary の中間CTAは**転職アフィリ優先の既存設計**のため、C は主に L2 土木もくじ経由で露出（もくじには収録済）。**hero-cta の全体ロジックは触らない**方針（2026-07-16 ユーザー確定＝A案）。数週間の売れ行きを見て露出不足なら、相性の良い一次ガイド記事の**本文に `<MagazineCard id="civil-1-ichiji-ronten">` を個別挿入**（記事単位・転職導線と非競合の外科的調整）。B（`civil-1-r8-bunseki`）も同様の位置づけ。

### [DN-0033] civil-1 土木一般編 テキスト章 本文変換（土工/コンクリート工/基礎工 ~19記事）
タグ: [コンテンツ品質] [種類:制作] [実行:sweep]

**Phase 1（config 統合）は完了・PR #395 で develop マージ済**（2026-07-14）。`src/config/category-curriculum.json` の civil-1 に 土工(order 1-49)・コンクリート工(50-79)・基礎工(80-99) を textbookChapters 新設し、配列順を PDF 章順（土工→建設機械→コンクリート工→基礎工→測量→解体工事）に再構成、受け皿だった「分野別対策」fields は廃止。要点ガイド4本は各章 introGuides へ移設済。→ カテゴリページの該当3章は現在「要点ガイド1〜2行」だけ表示（本文記事が空）。

**残（Phase 2-4）= OCR 済み md → textbook site 記事（MDX）の忠実変換**。変換元は `content/sources/textbook/１級土木施工管理技士/テキスト（土木一般編）/` の第1/3/4章。order レンジは確保済みなので、記事 frontmatter に `textbook_order` を割り当てれば自動的に該当章へ収まる。

- **Phase 2: 第１章_土工.md（4,209行・最大）→ 約8記事（order 1-49・5刻み）**: 土質調査(概説+原位置/室内試験+土/岩分類, 行22-591) / 盛土(592-1456) / 切土・法面保護(1457-1897) / 軟弱地盤対策・排水工法(1898-2353) / 土工計画・建設機械の作業能力(2354-2863) / 道路土工・路盤(2864-3324) / アスファルト舗装(3325-3888) / 舗装補修・品質管理(3889-end)
- **Phase 3: 第３章_コンクリート工.md（2,646行）→ 約6記事（order 50-79）**: 材料 / コンクリートの性質 / 配合設計・レディーミクスト / 施工(運搬・打込み・締固め・打継目・養生) / 鉄筋工・型枠支保工 / 特別なコンクリート・品質管理検査
- **Phase 4: 第４章_基礎工.md（1,561行）→ 約5記事（order 80-99）**: 概説・地質調査 / 土留め・仮締切り / 直接基礎 / 杭基礎(既製杭) / 場所打ち杭

**手順**: 見本 = `content/site/civil-construction-1/textbook-demolition/article.mdx`（frontmatter・リード・Callout・ArticleImage・RelatedKeywords・CareerAffiliate・参考資料を踏襲）。変換ツール = `/pdf-to-mdx --exam civil-construction-1` textbook モード（テンプレ `.claude/skills/conversion/pdf-to-mdx/templates/civil-construction-1.md`）。図は元 md 隣の `img/01-YY.png` を記事 `img/` へコピー → `<ArticleImage src=".../{name}.webp">` → `npm run generate-webp`。網羅率95%+・KaTeX（$$は複数行）・表4列以下・参考URLは実在確認済のみ（捏造禁止）。1記事=`/check-mdx`→QA(civil-construction-qa ≥2.0)→即 commit。仕上げ = `npm run refresh-indexes` + `npm run ogp`（check-ogp-coverage 対策）。

**進め方**: 1章=1セッション目安（トークン大）。develop 上で通常コンテンツフロー。関連 = [[project_civil1_textbook_transcription]]（既に両編 OCR→MD 完了・条文数値は原典照合）。既存の「土木一般編（スキャン教材）図タイト化・素材活用」タスクとは別スコープ（あちらは図タイト化＋guide/note展開、こちらは textbook 章本文の site 記事化）。

### [DN-0034] civil-1 一次過去問 公式キー deferred 24件（要 pre-H30 原典）
タグ: [コンテンツ品質] [種類:不具合] [実行:ユーザー]

公式正答肢照合は16本0不一致で完了済み。残 = `h28-a`(19件)・`h29-a`(1件=No.38)・`h29-b`(4件=No.3/12/17/21)。**LLM推測厳禁**・キー番号だけの書き換え禁止（設問極性・本文化けと絡む）。

- **h28-a は mass-fix 前に official 配列自体を第2ソース（kakomonn 等）で OCR 再検証**（19件と突出＝OCR誤りの疑い）
- pre-H30 原典PDFの入手: touhokugiken.com / dobokujira.com（h29 学科A/Bは両者に無し→kakomonn等別ソース要）
- 手順SSOT: `.claude/knowledge/reference/exam-content-policy.md` Part 2「過去問の原典照合」＋監査ツール `.claude/state/quality/civil-1-primary-tools/`（diff-keys/check-marks/check-contradict）

### [DN-0035] 過去問 解説品質の残指摘クラスタ（数値上合格・要照合）
タグ: [コンテンツ品質] [種類:不具合] [実行:ユーザー]

品質採点は failed 0 だが、個別指摘として記録済みの要照合項目（official key／原典照合が要る・LLM推測禁止）:

- civil-1 `secondary-construction-plan-past-problems` No.9(1): 解答欄記述が省略
- civil-2 `secondary-r06` 問8: 画像 `{/* TODO */}` 未挿入で本文欠落
- 総監 `h21-primary` Ⅱ-1-31（自己矛盾）・`h22-primary` Ⅱ-1-22（下書き跡）・`h28-primary` I-1-9/25/28・`h30-primary` I-1-24
- pe-first-stage `r03-construction` Ⅲ-2/Ⅲ-18（正答矛盾）・`r04-basic` Ⅰ-2-4（ハミング距離解説破綻）

### [DN-0036] モバイル可読性リライト 第1弾
タグ: [コンテンツ品質] [種類:制作] [実行:sweep]

機械ラチェット基盤は整備済み（`content-rules.json`＋`lint-mdx-mobile --all`＋週次 `check-content-quality`）。baseline に grandfather された既存違反を GA4 人気度順にリライトして漸減させる。

- **優先上位**: `civil-construction-1-guide-strategy`（3-1×29・#1人気）／`pe-comprehensive-management-keyword-2026`（3-1×48）／`civil-construction-2-secondary-r0X`／`pe-construction/*-exam-themes` 残11本
- **手順**: レポート上位を group 対応の `/quality-cycle` へ。表→非表・入れ子→フラット・長段落→改段。1バッチ 10-20 記事、完了ごとに `npm run update-content-quality-baseline`
- **注意**: civil textbook の規格表・配合表は override 除外済み。過去問の年度×選択肢表は無理に崩さない

### [DN-0038] 過去問図 rescan-need-source 9図（要外部/別原典）
タグ: [コンテンツ品質] [種類:不具合] [実行:ユーザー]

進捗の生きたビュー＝管理画面ギャラリー（`npm run admin`→記事図版タブ→「対応」フィルタ）で残数を見る運用。真実源 `.claude/knowledge/reference/figure-provenance.md`、手順 `/figure-recrop`。

残 = h29-b-fig-02（要H29第2次B原典）／h27-a-fig-01（要H27原典）／pe-construction 4（fig22/27/04/05＝要白書PDF等）／concrete-chief 3（steel-carbon-h29・bingham-flow-h30・bingham-shear-r04＝要該当年度原典）。台帳に理由記録済。

### [DN-0039] civil-1 secondary 合格後の残存 follow-up
タグ: [コンテンツ品質] [種類:制作] [実行:sweep]

8本全合格済みだが scores.json の qualitative_comment に記録した改善余地: earthwork 表2.9 の散文詰込13セル解体（最優先）・入れ子リスト群のフラット化・factual table のインライン出典・qm-basics/past-problems の民間ソース不在。

### [DN-0040] 性能: CI PSI 再計測（mobile 追加）
タグ: [UI・UX] [種類:改善] [実行:sweep]

①`pe-comprehensive-management-exam-index` desktop Perf 56・TBT 2521ms の再現確認（Mermaid 出現0の軽構成＝計測スパイク疑い。再現なら client JS を profiling）②**モバイル PSI が未計測**→CI 供給で計測開始（外部Google API＝ローカル不可）③CLS 超過2ページ＝AdSense 枠の width/height 明示。実装: `.claude/config/psi-urls.txt`・`psi-config.json`。

### [DN-0041] 回遊・note 動線 P4-P7
タグ: [UI・UX] [種類:改善] [実行:対話]

P1-P3（GA4 計測基盤・NextStepNav・季節モード note CTA）は実装済み。

- **P4**: `keyword-relations.json`（598KB・未活用）から RelatedKeywords 未記述の keyword 記事へ build 時 top-N 自動挿入 fallback。要: 挿入品質の監査＋PE keyword 面 A/B
- **P5-b**: 面別 CTR の実値化 — **計測窓は揃った**（2026-07-16〜08-12 の GA4 で `BuildJob-endbanner` 623 imp / `article-mid` 967 imp / `article-end` 975 imp を実測。7/30 以降を完全に含む）。`report-buildjob-affiliate` を実値で回して面別 CTR を出す
- **P5**: アフィリ EPC 判定（~2026-09）。基準は `affiliate-operations.md` §6.5 に新設済。**着手前に 2 点確認**: ①現状は確定成果 0 件（累計 137click）で**分母規律未達＝判定不能**、分母供給には A8 単月取得（`a8-ui:fetch -- --month`）が前提 ②9/1 以降は 50/50 A/B を停止して**建設JOBs 単一 arm**にしたため、判定は arm 間比較ではなく**時系列比較**（8 月の BuildJob ↔ 9 月以降の建設JOBs）になる。期限で無理に決めず、判定不能なら §6.5 の裁定ログに据え置きを記録する
- **P6**: 高購買意欲ページへ MDX 本文内 `<MagazineCard>` の個別商品導線補強。要: `sales-log.json` で対象ページ特定が先
- **P7**（🟢）: concrete 系の L2 もくじ新設（note 商品拡充が前提）

### [DN-0042] note 孤児下書き 5 件の手動削除
タグ: [収益化] [種類:不具合] [実行:ユーザー] [起票:2026-08-17]

3 セクションに散在していた同じ手作業を統合（2026-08-17）。**1 回の note ダッシュボード作業で全部閉じる**。

| noteId | 素性 |
|---|---|
| `nbf2a6de8f9c9` | 総監マガジンの歩き方（L1配線は 2026-07-14 に完了済み・これだけ残っていた） |
| `nf2316420abd0` | BuildJob N7 の dry-run 残骸 |
| `n3e2475d0b6d5` / `na5b4cef4fcfe` / `nfc608702b477` | 1級 完全攻略パックの stray |

**自動削除できない**: `note-delete-note` は下書きカードの href を key で拾えず、note ダッシュボードでの手動操作が要る。

**存在確認も目視でしかできない**: note API は**下書きも削除済みも同じ HTTP 404** を返すため、404 を「削除済み」と読んではいけない（2026-08-17 に 5 件すべてで確認）。ログイン後のダッシュボードで見るのが唯一の判定手段。

### [DN-0043] note 導線 後続配線（Fable P1 残・3 件）
タグ: [収益化] [種類:改善] [実行:ユーザー] [起票:2026-08-17]

2026-08-17 に 4 bullet を個別実査し、②「一次→二次 季節CTA切替」は **2026-07-01 の journey stage 再設計で完了済み**と確認したので削除した（`magazine-placement.ts` の `CIVIL_EXAM_PREP_GUIDES` が既に二次・経験記述 led）。

残り:
1. **トンネル / 都市計画パックの実体作成**（律速＝note 実機）。掲載文は `content/note/**/PACK-02` `PACK-03` に作成済みだが、`note-magazines.ts` の `pe-construction-tunnel-pack` / `pe-construction-urban-planning-pack` は `published: false` / `noteUrl: ''`
2. **建設→総監ブリッジ記事 1 本**（無料・建設部門合格者を総監の来季見込み客に）。現状は建設部門もくじに L1 総合案内リンクがあるだけで専用記事なし。**執筆自体は sweep で可能**
3. 道路パックの finer placement（任意・現状 1 面）

### [DN-0044] `note-publish --schedule` の予約投稿 selector 修復
タグ: [インフラ・計測] [種類:不具合] [実行:対話] [起票:2026-08-17]

`scripts/note-publish.mjs:530` のコメントが今も「selector は scheduling.md 由来・**first-run 要検証**」のまま＝予約投稿フローが一度も実機検証されていない。即時公開は実績多数だが、予約は使えるか不明。

旧「1級 完全攻略パック 公開後の仕上げ」から残った唯一の項目（2026-08-17 実査で ①PDF添付＝104件添付済み・②ネイティブ目次＝ライブ3/3で `<table-of-contents>` 実在 を確認して削除。④孤児下書き3件は「note 孤児下書き 5 件の手動削除」へ統合）。

### [DN-0046] 競合の勝ち型を policy 化（SNS 投稿型カタログ拡張）
タグ: [SNS・マーケ] [種類:改善] [実行:対話]

SNS競合実地調査（2026-07-04・`07_競合調査.md` SNS節）でsurfaceした残り2型: ①合格後キャリア/現場リアル リール＝**運営者の一次情報素材待ち** ②**お悩み相談回答＝素材不要で先行policy化可**（既存FAQ/キーワードから素材化）。聞き流し一問一答と16:9動画基盤は`DN-0110`へ統合した。着手時に該当writerエージェントの参照を更新。真実源`content-angle-policy`／`00_SNS整理マップ §型カタログ`。

### [DN-0047] SNS 競合モニタリングの反復化
タグ: [SNS・マーケ] [種類:改善] [実行:sweep]

**取得（fetch）はメインループが agent-reach スキルで実施**（サブエージェントは Bash 不可＝[[agent-bash-permission]]）。分析は新規 Evaluator `sns-research-analyst`（corpus を読んで頻出論点・刺さる切り口・gap を構造化抽出）。cadence 週次。X は**投稿アカウント @doboku373 を read に使わない**（[[x-suspension-guardrail]]）＝当初「未ログイン公開読取」は X の 404 遮断で実行不能のため、**運営者個人アカ `uruhayato373` の agent-reach twitter CLI 経由 read** がその代替（投稿アカ温存の目的は同じ・真実源 x-post-policy §11.7・2026-07-20 稼働 `scout-x-competitors.mjs`）。競合SoT = 価格/品揃え `09_販売チャネル競合分析.md` §B・エンゲージ/型 `07_競合調査.md` SNS競合節。エージェント追加時は agents-registry 更新＋check-doc-coupling。

### [DN-0049] SEO 品質ゲート後続（PR #390 マージ後の残タスク）
タグ: [インフラ・計測] [種類:改善] [実行:対話]

SEO 品質ゲート実装（PR #390・handoff `2026-07-13-seo-quality-gates.md` は削除済・git 履歴参照）の後続。ゲート本体は develop 済み。残:
1. **deploy 後の GSC 監視**: `develop→main` deploy で canonical/OGP 修正が本番反映＝サイト全ページ canonical 一斉更新の再クロールが走る。**コアアップデート期を避け、直後2週間は GSC 日次を監視**（gsc-management.md 2026-07-10 の教訓）。
2. **GSC page×query 実データ確認**: 初回検証 2026-07-15 完了（workflow_dispatch で `gsc-page-query-2026-07-15` 取得・窓 6/14–7/12）。Pattern 7 site-wide 検出 3 件は**すべて同一ページの #fragment 誤検出＝カニバリ実証 0 件**。残: (a) メタ改善は少数 URL の 14〜28 日実験に限る、(b) **8/31 BuildJob キャンペーン終了後に civil-construction-1 career 26 本を page×query で再測定**。先行シグナルは `guide-1-vs-2` ↔ `guide-grade-comparison` が同一クエリ「1級 2級 土木」で共に表示（impr 1/3・pos 73/80、閾値 impr≥5×pos≤30 に未達）のみ。年収系4本（salary-up/salary-by-role/allowance/career-salary）・辞める系3本（quit-or-stay/quit-honne/career-consultation-before-quit）はクエリ競合の観測なし。実証されたペアのみ統合（301 or canonical）、感覚では削らない。
3. **orphan/unreachable 6本の gate 昇格**: `pe-comprehensive-management-r8-essay-theme-*` 6本は現状 warn（意図的未リンク）。導線設計を決めたら check-seo-build の gate へ昇格。
4. **robots / OAI-SearchBot の ADR**（v2監査 §8.3）: ChatGPT Search 露出を取りに行くか。training bot は block 維持、search/user bot の許可可否を ADR で決定。robots.txt/Cloudflare はユーザー承認事項。

### [DN-0050] UIコードベース静的監査 残フェーズ（Phase4 A11y ＋ P3 整理）
タグ: [UI・UX] [種類:改善] [Codex候補] [実行:sweep] [検証:knip]

静的監査 `docs/reviews/2026-07-11-static-ui-codebase-audit.md`（作業指示書・SSOT）のうち、Phase 1〜3（UI-002/003/004/005/006）は develop 済み。残:
1. **UI-007 P2**: Header メニュー/drawer の dialog・focus 管理（開閉トラップ・閉状態の dialog semantics 除去）
2. **UI-008 P2**: `Callout` type を閉じた union へ変更＋未知 type を content lint で検出
3. **UI-009 P2**: Knip 報告のデッド UI/依存整理（`LinksHubTile`・`next-themes`・`date-fns`・fontsource は要個別確認、一括削除しない）
4. **UI-010〜012 P3** ＋ **UI-001 完了確認**（仕様書と現行実装の残ズレ同期）
- 実装順・完了条件は監査文書の各節参照。

### [DN-0051] 計測基盤 Tier 2/3 ＋ GA4 UI 設定
タグ: [インフラ・計測] [種類:改善] [実行:対話]

Tier 1（NoteLink 計測・cadence 化・bot 監査 CI 等）は実装完了。残:
- **Tier 2/3**: カスタムパラメータ・検索/scroll イベント・アフィリA/B の label 取得・GA4↔GSC 突合／AdSense RPM 取込・sales×流入 attribution・送客リダイレクタ・A8 EPC
- **GA4 サーバ側（ユーザー手作業）**: 残るのは**未解決の bing bot 疑いの確定**のみ（内部トラフィック/参照除外・既知ボット除外・カスタムディメンション登録はすべて完了済み。`ga4-admin:check` / `check-ga4-dimensions` とも「不足 0」を実測）。真実源 → [計測基盤強化ロードマップ.md](../../docs/operations/計測基盤強化ロードマップ.md)
- **Playwright UI CSV**: `fetch-ga4-ui-csv.mjs` は未ログイン検証のみ。ログイン済み実UIでレポート名・ディメンション・指標・ダウンロードメニューの正式ラベルを確定し、fixtureと回帰テストへ反映（API優先方針は維持）
  - **故障記録（2026-07-30 実測・`check-gsc-ui-due` が DUE を出し続ける原因）**: 3 ユニットとも失敗。
    `trafficAcquisition` は `csv-menu-ambiguous`（ダウンロードメニューの候補が一意に決まらない）、
    `landingPage` は `report-not-found`（候補 0）、`events` は `report-not-found`（候補 11＝絞り込めていない）。
    上のラベル確定作業がそのまま修正になる。**GSC UI 側は正常**（2026-07-30 に 10 ユニット中 7 取得・失敗 0）
### [DN-0052] SVG図版 dual-use パイプライン残
タグ: [コンテンツ品質] [種類:改善] [実行:対話]

PR #269（カタログ）/#270（SNSレンダラー）済。残 = Phase4 記事への `<ArticleImage>` 埋込（orphan 6点・**ユーザー保留中**）・SNSパイプライン残（IG管理別カルーセルのオーケストレーション/コピーGenerator/Evaluator配線）・doc-sync 宿題（`build-svg-catalog`/`render-figure-sns` を reference 索引へ追記）。

### [DN-0053] 記事構成ルールの SSOT 化 + サブエージェント管理
タグ: [エージェント・SSOT] [種類:改善] [実行:sweep]

1. `.claude/knowledge/reference/article-structure-guide.md`（新設予定）<!-- doc-ref:ignore --> を起草 — 基本構成・文字数目標・Callout 使い方・見出し構成・CTA の型（たけブログの知見反映 → .claude/knowledge/reference/reference-sites.md）
2. `.claude/knowledge/reference/todo-writing-guide.md`（新設予定）<!-- doc-ref:ignore --> を起草 — todo 記述フォーマット・優先度表記
3. `civil-guide-writer` エージェント新設（article-structure-guide を真実源に）
4. `todo-planner` に todo-writing-guide と backlog の参照を追加

### [DN-0055] `frequent-topics` を r08 込み（18年度720問）へ更新する
タグ: [コンテンツ品質] [種類:不具合] [実行:sweep] [起票:2026-07-17]

`content/site/pe-comprehensive-management/frequent-topics/article.mdx` は「17年度・680問」（h21〜r07）のまま。title / seoTitle / description / JSON-LD の 4 箇所に数字が入る**公開 SEO ページ**で、生成元は `build-frequent-topics.mjs`（入力＝`past-exam-backlinks.json`）。単純再生成では r08 は入らない。

1. 先に r08 の紐づけ配線（`exam-keyword-map.json` へ 40 問追記＋`YEAR_ORDER`。真実源 → memory `新過去問backlink配線`）
2. `npm run build-frequent-topics` で再生成
3. **note 記事のタイトルにも「17年分680問」が入っている**（`note-published.json:173`）。サイトだけ更新すると食い違うので note republish まで同時に行う

### [DN-0056] 図クロップ写り込み・切断の是正
タグ: [コンテンツ品質] [種類:不具合] [実行:sweep] [起票:2026-08-18]

`check-figure-crop`（2026-07-16 新設・機械ゲート）が検出した既存債務。baseline 登録済みで CI は通るが、実体は要修復。**ImageMagick 7.1.2 はこのマシンに導入済み**で `figure-recrop.mjs` は実行可能（2026-08-18 確認）。

- **STRAY_SLIVER 15図（隣接図の切れ端＝写り込み・要 recrop）**: 一覧は `.claude/state/quality/figure-crop-report.json` の `rule=STRAY_SLIVER`。ユーザー報告の `r07-a-fig-04`（下端ルビ）を含む。各図 `node scripts/figure-recrop.mjs <img> --top/--bottom F` で除去→ `check-figure-crop --file` で clean 確認。precision ≈ 8/10 なので着手前に1枚ずつ現物 Read（alarp-carrot 等の FP は触らない）。
- **`r07-a-fig-02`（「収縮限界」欠け・切断済み＋白枠で機械検出不能）**: 再クロップでは修復不可（画素欠損）。provenance `rescannable:needs-source` → 元スキャン（`content/sources/textbook/１級土木施工管理技士`）から再抽出が必要。
- 是正後は該当図を除いて `check-figure-crop --update-baseline` で baseline を刈り込む。
### [DN-0057] OGP タイトルが 3 行以上に折れる 121 件のチューニング
タグ: [UI・UX] [種類:改善] [実行:sweep] [検証:check-ogp-line-count:done] [起票:2026-08-18]

**2026-08-18 に再測定して件数を訂正した（旧「残り 5 件」→ 実測 121 件）。**
`check-ogp-title-fit` はフォントサイズ（56px 以上）しか見ておらず、**何行に折れるかを
誰も測っていなかった**ため、台帳の数字が 24 倍ずれたまま放置されていた。
実測手段を `npm run check-ogp-line-count` として用意した（描画と同じ wrap 実装を使う）。

- 全 1,092 件のうち **3 行以上かつ `ogp.title` 未設定が 121 件**
- 行数分布: 9行:1 / 7行:2 / 6行:14 / 5行:37 / 4行:40 / 3行:27
- 最悪例: `pe-comprehensive-management-r8-essay-keyword-forecast`（**9 行**）、
  `pe-construction-{construction-planning,river-coast}-exam-themes`（7 行）
- 偏り: pe-construction の `*-exam-themes` 系が 6 行に集中＝**タイトル命名の型そのものが長い**。
  1 件ずつ手当てする前に、この系列の命名を見直すほうが安い

**対処**: frontmatter に `ogp.title` を入れて明示的に折る → `npm run ogp -- <slug> --force`。
コード変更は不要。**何行までを許容するかはデザイン判断**なので surfacer は判定しない
（`ci: false`・読み手はこのカードの着手時）。まず 6 行以上の 17 件から。

### [DN-0092] 技術士建設部門 選択科目まるごと合格パックを全11科目へ展開
タグ: [収益化] [種類:制作] [実行:対話] [起票:2026-08-18]

道路パックの実売 7 件を再現可能な商品モデルとみなし、公開済みの道路は維持したうえで、残る 10 選択科目（トンネル、都市及び地方計画、河川・砂防、鋼構造及びコンクリート、土質及び基礎、鉄道、建設環境、港湾及び空港、施工計画、電力土木）を各 4,980 円の「まるごと合格パック」として展開する。

- **実装契約**: [商品計画・詳細実装手順書](../plans/pe-construction-subject-packs/00-product-plan.md) と同ディレクトリの Phase 01〜03、99 を真実源とする
- **着手順**: 情報アーキテクチャ移行は 2026-08-18 に完了済み。ローカル準備 → A（トンネル・都市計画・河川）→ B（鋼コン・土質・鉄道）→ C（環境・港湾・施工計画・電力土木）→ 導線・計測の順で進める。同一時点の note ライブ操作は 1 商品だけに限定する
- **停止条件**: note アカウント不一致、CAPTCHA、既存商品の価格・収録数ドリフト、公開 API 検証不能、別セッションとのライブ操作競合があれば、書き込み前に停止してユーザー確認へ戻す
- **完了条件**: 全 11 パックについて公開状態、4,980 円、カバー、収録記事数、SoT、サイト CTA、売上記録配線を検証し、4 週・8 週レビューを起票する。全条件を満たした後だけ、手順書の削除マニフェストに従って `pe-construction-subject-packs/` の計画書 5 ファイルを削除する

### [DN-0094] 総監記述式の民間ペルソナを全50類型へ展開
タグ: [収益化] [種類:制作] [実行:対話] [起票:2026-08-18]

既存実売は民間4ペルソナが8件・¥19,840、自治体10ペルソナが5件・¥12,400で、1商品あたり販売数は民間側が4倍だった。「自分の立場に近い完成答案」需要を全分野へ展開する。

- **実装契約**: [全ペルソナ展開計画](../plans/DN-0094-pe-cem-private-personas/00-master.md) と同ディレクトリのPhase 01〜03、99を真実源とする
- **対象**: 自治体10（既存）＋建設コンサル21（既存3・新規18）＋ゼネコン・施工会社19（既存1・新規18）＝全50。新規制作は36商品
- **着手順**: 情報アーキテクチャ移行は 2026-08-18 に完了済み。既存14のライブ棚卸し → 50件レジストリとdossier → Batch A〜D制作・独立QA → 1商品ずつnote公開 → 3段選択UI・計測・パック再設計の順で進める
- **真正性**: 旧「14固定」は本決定で上書きするが、著者がコンサル・ゼネコン等で勤務したという一人称は使わない。全商品を「想定した立場の答案モデル」と明示し、権限・一次資料・兄弟商品との差分をQAする
- **完了条件**: 全50件のレジストリ、原稿、QA、カタログ、noteライブ、選択導線、売上配線が一致し、4週・8週レビューを起票する。恒久方針を移行後の戦略SSOT・knowledgeへ抽出した後だけ、削除マニフェストに従って計画書5ファイルを削除する

### [DN-0095] 施工経験記述の想定工事拡張＋コンクリート資格の商品展開
タグ: [収益化] [種類:制作] [実行:対話] [起票:2026-08-18]

「自分の工事・立場に近い答案」の販売シグナルを横展開する。1級土木は100→150工事、2級土木は実体確認後の36→60工事、コンクリート主任技士は既存4テーマに加えて8実務ペルソナ×4テーマ＝32小論文を制作する。公式名称は「技士」「主任技士」であり、コンクリート技士は四肢択一のみのため小論文商品を作らない。

- **実装契約**: [商品計画・詳細実装手順書](../plans/DN-0095-civil-concrete-answer-expansion/00-master.md) と同ディレクトリのPhase 01〜03、99を真実源とする
- **着手順**: 情報アーキテクチャ移行は 2026-08-18 に完了済み。既存原稿・ライブ・販売の棚卸し → 1級/2級Batch A → 主任技士Batch A → 4週観測 → 各Batch B → コンクリート技士の択一40問パイロット → 全体検証の順で進める
- **既存購入者保護**: 1級・2級の追加工事は現行マガジンへ収録し、既存購入者へ買い直しを要求しない。主任技士の既存4テーマ商品は入口として維持する
- **真正性**: 工事名・所属名だけを置換した量産を禁止し、1級/2級の権限差、主任技士8ペルソナの業務範囲、オリジナル想定問題であることを独立QAする
- **主任技士 残作業**: **note実publish・価格確定（32本完成時¥5,980仮説）はユーザー確認後に別途実施**。無料ガイドの`{{MAGAZINE_URL}}`はマガジン作成後に`inject-magazine-url`で注入。4週観測は公開後に開始
- **完了条件**: 1級150工事、2級60工事、主任技士32小論文の原稿・QA・カタログ・noteライブ・導線が一致し、技士択一パイロットのGO/NO-GOと4週・8週レビューを記録する。恒久判断を抽出した後だけ、削除マニフェストに従って計画書5ファイルを削除する

## 🟢 低 — 時期未定

### [DN-0058] サイトアクセス×収益化 戦略の深掘り論点
タグ: [SNS・マーケ] [種類:改善] [実行:対話]

「検索→サイト→note」が実収益回路と判明（サイト流入84%オーガニック・CTAクリック構成が売上と一致）。土木は同回路が未稼働＝最大の伸びしろ。残（全未着手・別PC）: ①勝ち記事の型抽出（GA4 page×cta-clicks で総監の勝ちパターン→土木移植）②土木SEOビルド計画（textbook 34本×テキスト13章ギャップ表）③土木のサイト→note導線整備 ④売上×イベント相関 ⑤note内発見性の手動検証 ⑥AI検索対策。

### [DN-0059] フロントエンド土台リファクタ 残増分（新資格が増えたら着手）
タグ: [UI・UX] [種類:改善] [実行:sweep] [起票:2026-08-17]

増分3（ArticleFooter config駆動化）・増分4残（`sortDocs` の strategy factory 化）は **新資格追加が実際に発生したら**着手する（indirection 増に対し効果が限界的）。`category-groups.ts` の分岐は実測 26 件。

別件: `Underline` は **MDX 実使用 0 件**（component-loader には登録済み）。撤去の可否は要判断（loader 登録を見落として削除すると `type-check` が割れる）。

### [DN-0060] note 会員プラン設定の保存が即時ライブ反映か未検証（handoff 2026-07-30 抽出）
タグ: [収益化] [種類:改善] [実行:ユーザー]

公開中プランに対する `note-membership-plan-edit` は一度も実行しておらず、保存が即座にライブへ出るかが分かっていない。会費・定員・特典マガジン紐付けを触る前に、影響の小さい項目（説明文）で 1 回だけ実機確認する。会費そのものは変更不可で作り直しになる（memory `note-membership-publish`）。

### [DN-0063] 画像系 pre-render ワークアラウンドの再検証（Opus 5 vision）
タグ: [インフラ・計測] [種類:改善] [実行:対話]

Anthropic の Opus 5 プロンプトガイドが「旧モデル向けに仕込んだ vision ワークアラウンドは不要になっている可能性があるので再検証せよ」「vision はモデル自身が切り出し・拡大・目視確認できるツールを持つときに最も精度が出る（思考量を上げるより費用対効果が高い）」としている。

現状、図まわりは親が**事前に**レンダリング・抽出してからエージェントへ渡す設計になっている。この前処理が今も必要か測る。

- 対象: `civil-exam-figure-extractor`（事前レンダリング済みページ画像を Read して bbox spec を返す）、`scanned-textbook-transcriber` / `scanned-figure-crop-auditor`（`pdfimages` で抽出・回転・分割した単ページ画像を渡す）、`figure-crop-worker`
- 測り方: 既知の正解がある数枚で「従来の事前レンダリング経路」と「エージェントが自分で開いて拡大・クロップして確認する経路」を突き合わせ、bbox 精度と総トークンを比較
- 簡素化できるならスキル側の前処理ステップを削る。できないなら**なぜ必要か**を各エージェント定義に1行残す（次に同じ検討を繰り返さないため）
- 根拠: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5>

### [DN-0064] 既存画像 grandfather 135件の圧縮バーンダウン
タグ: [UI・UX] [種類:改善] [Codex候補] [実行:sweep]

画像品質ゲート導入前から残る大容量PNG/JPG/WebPを、アクセス数と削減可能容量の高い順に段階処理する。新規画像は既存ゲートで防止済み。

- `quality:audit` の画像レポートを起点に対象を再計測
- noteマガジンカバー、販売画像、外部参照画像など誤検知を除外
- `generate-webp`または既存の用途別変換経路を使用し、寸法・透過・OGP参照を維持
- 1バッチごとにbuild・画像参照・差分容量を検証し、baselineを漸減

### [DN-0067] ココナラ コンテンツマーケット（やりとり不要のPDF販売）への展開
タグ: [収益化] [種類:改善] [実行:対話]

> [!note] 2026-08-12 実機調査済み・未着手（詳細 → [coconala-operations.md §9](../../.claude/knowledge/reference/coconala-operations.md)）

ココナラ「ブログ」機能の実体を read-only で調査した結果、**コンテンツマーケット**（記事・画像を**やりとり不要**で複数人に同時販売）が使える。現行 C 系 PDF は `provision_format=3`＝購入後トークルームで手送付のため**1件ごとに人手が要る**が、これが消える。**既存 PDF の再利用で在庫があるため投下コストが小さい**。

- **先にやること**: 価格帯・対応ファイル形式・手数料・出品フォーム構造の実機確認（2026-08-12 の probe はモーダル遷移でフォーム未到達）
- **やらないこと**: ブログを自サイト/note の集客に使う設計。**エディタ自身が「外部サービスのリンク記載」を禁止と明示**しており、外部誘導禁止（安全弁2）はブログにも及ぶ
- **記事型ブログ（9.2）は後回し**: ココナラ内検索の実測は 技術士1,100件／施工管理376件／施工管理技士82件で需要はあり、競合（セコカンサポート長・小泉士郎）も運用中だが、記事執筆の継続コストが乗る
- 優先度は**納品義務（未添付の解消）より下**

### [DN-0068] ココナラ 単発コンテンツの追加展開（暗記ノート等・売れ行き次第）
タグ: [収益化] [種類:改善] [実行:対話]

> [!note] 前提の更新（2026-08-05 再構成後）
> 現行は **実売10本**＝S1/S2/S3 ＋ C8/C9（模試）＋ C2'/C3'（模範答案セット）＋ C10/C11（教材フルパック）＋ C12（プレミアム＝教材＋添削¥15,000）。
> **C1/C4/C5/C6/C7 は archived**（恒久廃止・フルパック限定収録 or セットへ統合）。
2026-07-18 にコンテンツ PDF を **C1〜C9 の9本**、加えて **S1/S2 サービス＋S3 答案作成（ヒアリング→文章化・¥8,000）** を公開＝計12商品（S1/S2/S3＋C1-C9）。冗長回避で**除外した源**＝2テーマ組合せ大全・想定工事バンク・完全攻略パック・直前暗記ノート・一次（KDP Select ロック）。C8/C9＝二次予想模試（Red Line #10 例外運用）。

**売れ行きを見て検討**:
- **S3 上位版（4テーマ）**: 2026-08-12 に運営が「課題代行と判断されるサービス」として取り下げ → 08-17 に文面修正して再出品（`coconala-sakusei-4theme`）。受注が入ったら工数を実測する
- **S3 価格引き上げ**: 評価20件で ¥8,000→¥12,000〜16,000（kit §2）
- **一次 予想模擬試験（本丸・要設計）**: 建築版 ¥18,000×1,730件の最大ヒット帯。土木一次は過去問1,162問資産（`civil-1-exam-questions.json` 等）から作れるが、**KDP Select 一次過去問PDF との重複を回避する設計が必須**（模試＝本番形式の予想・過去問PDF＝全問解説で別物にする線引き）。着手前に KDP 抵触を確認。
- **模試の Red Line #10 監視**: C8/C9 模試が売れる一方で**会員ベース層が伸びない兆候**（模試購入が会員ベース層純増を継続的に上回る）が出たら、模試の内容・価格を再判断 or 撤退。予想の毎月更新版は会員限定を堅持（計画 §4 Red Line #10 例外決定ログ）。
- 暗記ノート（穴埋め・¥1,000〜）や PWA 過去問との連携

手順は [coconala-operations.md §8](../knowledge/reference/coconala-operations.md)・`build-coconala-content-pdf.mjs`（C8/C9 は `generated:true`）・作成モード=`/keiken-tensaku --mode sakusei`。

### [DN-0069] コンクリート主任技士 H24/H25 skip 分の補完＋R6/R7 拡張
タグ: [コンテンツ品質] [種類:制作] [実行:ユーザー]

2026-07-17 に H24（26問）・H25（12問）を site へ追加（計303問・H24〜R5）。ただし 2022年版底本の**OCR品質がまだらで、以下は復元不能/不確実として収録せず skip**。**書籍原典（コンクリート主任技士2022）を再入手できれば補完可能**（現状ローカルに原典PDFなし＝照合不可）:
- **H25 skip 18問**: Q1,3,4,5,7,8,9,10,12,13,14,15,16,17,19,20,21,26（選択肢文のOCR破綻・表崩れで数値確定不可・図が別問題と判明・解答表と技術判断の conflict 3問）
- **H24 conflict skip 4問**: Q14（低確度・肢が技術的に擁護可能で解答表と齟齬）,Q16（「鉄筋腐食→硫酸塩」等OCR再構成）,Q17（JIS A5308 計量誤差表を数値検証できず）,Q18（標準偏差値がOCRで入替わり解答表と数学的に不整合）。answer key に合わせて再構成した本文の公開は避け撤去済み
- **年度拡張**: R6・R7 は原典スキャン未入手（書籍入手が前提）
- **表記統一（軽微）**: 既存 cce に「令和1年度」と「令和元年度」の混在（同一年=R1）。片方へ統一

真実源 = [exam-content-policy.md](../knowledge/reference/exam-content-policy.md) §コンクリート主任技士。

### [DN-0071] 総監キーワード cem-qa 2.2–2.5帯 40本リライト
タグ: [コンテンツ品質] [種類:制作] [Codex候補] [実行:sweep]

合格マージン大（2.2:2/2.3:27/2.4:7/2.5:4）で緊急度低。先頭 = inventory-control / personal-info-protection / risk-analysis / ojt-off-jt。1バッチ4本。

### [DN-0072] 薄層 345本の散文増補（3,000字下限）
タグ: [コンテンツ品質] [種類:制作] [Codex候補] [実行:sweep] [検証:quality-census]

総監 keyword 328（5/29 demote 源流コホート・[[project_adsense_low_value_2026_07]] の続き）・pe-construction keyword 16・concrete textbook 1。3,000字下限へ散文増補（7月112本バッチの継続）。census の thin 指標で残数管理（`npm run quality-census`）。

### [DN-0073] 品質 census に前回比 delta と読み口を足す
タグ: [コンテンツ品質] [種類:改善] [実行:sweep] [起票:2026-08-17]

**月次再生成は既に達成済み**（`quality-audit.mjs` に `quality-census` が配線され完走。`census.json` は 2026-08-17 再生成で total 1092 / scored 1064 / unscored 28 / thin 345）。

残る宿題は 3 点:
1. **前回比 delta が無い** — `build-quality-census.mjs` に history/差分の実装がなく、「新規公開の未採点」「薄層への逆戻り」「スコア低下」を surface できない
2. **読み手がいない** — `ci: false` かつ `/gsc-review` にも `/weekly-review` にも census への言及ゼロ。読む場所を決めないと、また誰も見ない検査になる（§9）
3. group 別の正しい Evaluator ルーティングへの拡張

### [DN-0074] reference-materials 5記事 精度向上 → 再公開
タグ: [コンテンツ品質] [種類:制作] [実行:sweep]

hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02（`published:false`・GSC impr 資産保持）。試験ピーク 7/13 後: ①精度向上リライト ②published:true→refresh-indexes→commit ③再公開14日後に GSC delta 計測し再実験化を判断。EXP-002 は cancelled（2026-06-27）。

### [DN-0075] 土木一般編（スキャン教材）図タイト化・素材活用
タグ: [コンテンツ品質] [種類:改善] [実行:対話]

①図320点のタイト化 — 再開時は軽量版 `apply_deltas_recrop.py --damp 0.7`＋監査2-3ラウンド上限（フルはトークン過大で後回し）②素材活用（本丸）: 検証済みテキストで guide 品質改善・note 無料集客記事展開（GSC 先行で伸び悩みトピック特定）。runbook = `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/README.md`。

### [DN-0076] textbook 白黒図のカラー化（対象B・任意）
タグ: [コンテンツ品質] [種類:改善] [実行:ユーザー]

PDF クロップ済み白黒図 約65枚（construction-machinery-01=13/-02=7/schedule-management=24/surveying=11/demolition=6/construction-mgmt-overview=4 ほか）。著作権問題なし・見栄え向上のみ。**Gemini 有料→着手前に必ずユーザー確認（[[gemini-cost-confirm]]）**。パイロット5枚→品質・コスト確認→全体。

### [DN-0077] pe-construction 選択科目 within-specialty インラインリンク
タグ: [コンテンツ品質] [種類:改善] [実行:sweep]

選択科目3記事（road/river-coast/urban-planning）＋新規8記事の本文からの個別キーワードページへのインラインリンク拡充（本文精読を伴う別スコープ）。

### [DN-0078] 1級 textbook 10本の品質監査
タグ: [コンテンツ品質] [種類:制作] [実行:sweep]

`civil-construction-qa` で監査（合格マージン大・低優先）。H28-A fig-02/07/08/09 は元 PDF に図が無く修正不能で確定。

### [DN-0079] カテゴリカードの残改善
タグ: [UI・UX] [種類:改善] [実行:対話]

①サムネイル画像の本格採用（OGP はタイトル焼込みで二重になるため写真素材を別途持つ設計が要る）②人気データの鮮度（CI の ga4-page 取得依存・週次見込み）③トップページ／検索結果ページへの横展開。

### [DN-0080] Kindle 出版（KDP）続き
タグ: [収益化] [種類:制作] [実行:ユーザー]

A-01〜A-06 個別本6冊は KDP 公開済（LIVE）。残:
- B系（総監 択一・era別合本2冊）＝Phase 4 待ち。**ジェネレータ設計は不要と判明済み**（既存 D ビルダー流用で足りる・`content/kindle/strategy.md:95`）／C系（建設部門 二次模範解答）＝着手条件達成済み・未着手
- **note PDF 販売（従チャネル）**: Kindle Select 独占90日終了後に開始（`/note-attach-pdf`・¥500〜¥1,480）
- 真実源: `content/kindle/strategy.md`

### [DN-0081] content-angle P-1 カルーセルパイロット
タグ: [SNS・マーケ] [種類:改善] [実行:対話]

`ig-carousel-writer` で `angle: counter` の slide-data.json（source: note「キーワード集が点にならない理由」）→ `ig-post-create` PNG 化 → `ig-carousel-qa` 採点。過去問パック平均（保存数・リーチ）を上回った場合のみ Phase 2（ビルダー実装）へ。真実源 `content-angle-policy` §5/§6.2。

### [DN-0082] API トークン更新サイクル ＋ MCP 棚卸し
タグ: [インフラ・計測] [種類:改善] [実行:ユーザー]

GitHub Secrets: `CLOUDFLARE_API_TOKEN`/R2 キー=90日・`PSI_API_KEY`/`YOUTUBE_CLIENT_SECRET`=180日。①期限確認・更新 ②Cloudflare token の権限スコープ最小化 ③`.mcp.json` の MCP サーバー棚卸し ④更新サイクルを Calendar/schedule hook に登録。

### [DN-0083] note 編集スクリプトの共有 lib 化（Tier 2 保守性）
タグ: [エージェント・SSOT] [種類:改善] [実行:sweep]

account ゲート/ClipboardEvent paste/リンクカード化/ブラウザ起動が3〜5スクリプトにコピペ分岐（note-update-body paste 無音失敗事故の震源）。`scripts/lib/note-browser.mjs` へ一元化。**有料境界（paywall boundary）ロジックは収益直結のため統合せず各スクリプトにインライン保持**。独立 worktree で実施・dry-run/probe で挙動同一確認。

## 🟣 判断待ち — ユーザーの意思決定が必要

### [DN-0098] `.agents/` と `AGENTS.md` が壊れた第2の SSOT になっている
タグ: [エージェント・SSOT] [種類:意思決定] [実行:ユーザー] [起票:2026-08-18]

2026-08-18 にユーザー判断で追跡下へ入れた（`9cef8925ed`）が、**中身は未解決のまま**。

- `.agents/skills/`（235 件）は `.claude/skills/` の写しで、**151 件は `.claude/` → `.Codex/` の
  機械置換ぶんだけが差分**。`AGENTS.md`（258 行）も CLAUDE.md の写しで `.Codex/` 参照が 69 箇所
- **`.Codex/` は実在しない**。Codex がこれを真実源として読むと壊れたパスを辿る
- `check-doc-coupling` も `check-doc-refs` も `.claude/` 側しか走査しないので、
  **`.agents/` 側は無検査のまま腐る**（片方だけ更新されても誰も気づかない）
- 判断が要る: (a) `.claude/` を正典にして `.agents/` を消す / (b) `.Codex/` を実際に作る /
  (c) `.agents/` を `.claude/` からの生成物にして生成スクリプトと検査を足す
- 参考: 分界の真実源は `.claude/knowledge/reference/codex-division-of-labor.md`。
  Codex CLI 自体の設定（`.codex/config.toml`・hooks・agents/*.toml）は別物で、これは正当


### [DN-0084] 建設部門BK・総監の有料境界を実ライブに整合（構成監査の偽陽性16本）
タグ: [エージェント・SSOT] [種類:意思決定] [実行:対話]

`npm run check-note-structure`（2026-07-24 新設）が 建設部門BK-01道路 R08予想8＋BK-I必須8＋総監テキスト精読5＝**計20本前後を PAYWALL_LEAK として検出**（件数は目次偽陽性を除いた実数）。ただし**全て偽陽性（実ライブのpaywallは正常動作・有料内容は漏洩していない・深いprobeで確認済）**で、原因は「ソースの paidBoundary（BK=既定`試験問題`）が実ライブ境界と食い違う境界定義ズレ」。civil の値上げ・全ロック修復（2026-07-24 完了・FULL_LOCK/LEAK/IMG_MISSING すべて0化）とは別系統。
- **BK-I必須9本**: 既定境界`試験問題`だが実態は「試験問題＝無料つかみ／フル模範解答＝有料」。frontmatter `paidBoundary: "フル模範解答"` 付与で解消（ライブ再公開は不要＝既に正しい）。ただし他の BK necessity 記事との境界一貫性を要確認。
- **総監テキスト精読5・設問3バンク3**: Phase A で新ルール（最初のH2／`国家施策オプション`）を frontmatter 付与済だが、実ライブ境界はより厳しい（無料が少ない）。**新ルール適用＝より多くを無料化する再公開が必要（＝収益判断）**＋総監記事は複数行blockquoteを持ち note-update-body の再貼付で脱落するため、blockquote単一行化が前提。
- 判断: ①BK-I はソース境界を`フル模範解答`へ是正（安全）②総監8本は新ルール適用（再公開・より無料化）するか現状維持か。civil 対象外につき今回は保留。

### [DN-0085] ガイドカードのカバー写真（dormant）
タグ: [UI・UX] [種類:意思決定] [実行:対話]

literal 写真はメタ記事と不一致で撤回済（PR #277）。旧資産は commit `aed647a7f`（2026-07-07）で**削除済み**（`src/config/guide-cover-photos.json`・`src/lib/guide-cover.ts`・Imagen 生成35枚）。生存しているのは生成器 `scripts/generate-guide-covers.mjs` のみで、**再利用には Imagen 再生成＝再課金が要る**。

**有望な未検証案**: 記事別の**概念イメージ**生成（キャリア=上昇/階段、勉強法=学習机 等）。**まず5本パイロット（~$0.10・[[gemini-cost-confirm]]）→ :3020 で判断 → 良ければ123本**。ダメなら dormant 維持。
### [DN-0086] X 下書き3パック（未投入 35 件）の処遇を決める
タグ: [SNS・マーケ] [種類:意思決定] [実行:対話]

surfacer の日付パーサを直した（2026-08-17）ことで、これまで一度も surface されていなかった未投入が出てきた。いずれも **go-live 日が過ぎている**ので、退役するか日付を振り直すかの判断が要る。

| draft | 期間 | 未投入 | 素性 |
|---|---|--:|---|
| `068-civil1-secondary-keiken-w1` | 7/6-7/12 | 28 | 1級土木 二次(経験記述) Week1。**二次は 10/4** なので日付が実態と合っていない疑いが濃い＝振り直しの候補 |
| `080-pe-comprehensive-r08-hit` | 7/21 | 1 | 総監 R8 的中報告。試験直後の一発ネタで、いま出す意味は薄い |
| `082-concrete-pe-competitor-format-repurpose` | 7/25-7/29 | 6 | 競合フォーマットのリパーパス。日付依存が弱いので振り直しやすい |

退役は `content/sns/x/draft/_archive-*/` へ移すこと（surfacer は `_` 始まりを走査対象から外す）。振り直す場合は見出しの日付を書き換える。

### [DN-0087] 検査レポートの読み手を決める（quality-audit の report 11 本）
タグ: [インフラ・計測] [種類:意思決定] [実行:対話] [起票:2026-08-17]

**判断が要る**: `.claude/state/quality/audit-latest.md` を読む自動経路がゼロ。フル `quality:audit` は人が手で叩いたときだけ走り、結果を読む主体も人だけ。report 区分 11 本の FAIL が溜まっても surface されない。

選択肢: (a) weekly-review の Phase 1 へ「audit-latest.md の生成日と fail 一覧」を読む手順を足す (b) report を全部ラチェット化して ci:true へ寄せる (c) 現状維持（人が叩く前提と割り切る）。

### [DN-0088] search-growth 残存 UNKNOWN 1,280 URL の発生源裁定
タグ: [インフラ・計測] [種類:意思決定] [実行:対話] [起票:2026-08-22]

2026-08-22 に分類ロジックを修正し、ワイルドカード redirect と query variant の誤判定、
親ページの計測値継承、短期ゼロだけを根拠にした noindex 候補化を解消した。
最新 run（`.claude/state/improvements/search-growth-latest.md`）は
**EXPECTED_EXCLUSION 1,084 / UNKNOWN_REVIEW 1,280 / NOINDEX_CANDIDATE 0 / FIX_TECHNICAL 0 / REDIRECT_LEGACY 0**。
総監209本は `DN-0107` Phase 1 で5分類済みで、現時点の破壊的変更候補は0件。

残作業は、`DN-0106` で全件取得化した GSC query/page の次回 CI スナップショット（`truncated:false`）を待ってから行う:

1. `npm run search-growth:report` を再実行し、残る UNKNOWN を発生源別に束ねる。
2. 上位バケットの代表 URL を確認し、EXPECTED_EXCLUSION / KEEP_MONITOR / 個別精査へ一括裁定する。
3. noindex は「固有価値が低い」かつ「長期ゼロ流入」の双方が確認できた場合だけ提案し、自動適用しない。
4. 決定を `gsc-management.md` の観測・判断ログへ記録し、同じバケットの再検討を防ぐ。

seo-fix-planner は audit-only。変更候補が再発生した場合も適用は人の承認後。

### [DN-0089] `civil-1-takuitsu-pdf` が KDP Select 独占に抵触するかの判定
タグ: [収益化] [種類:意思決定] [実行:ユーザー] [起票:2026-08-17]

**公開手順はすべて消化済み**（2026-07-23 公開・PDF 添付・SKU flip・もくじ配線・CTA 1面を実査）。残るのは規約判定 1 点だけ。

- 実体: `civil-1-takuitsu-pdf` = 公開済み `n155093f42183`・¥1,980（`note-magazines.ts` / 記事 frontmatter とも published）
- 論点: KDP Select 独占中の A-00〜A-06（2026-07-08〜07-11 公開・独占明け ~2026-10-06）と同一デジタルコンテンツにあたるか
- **実害は低い見込み**: 同一内容の Kindle は `e-02` で、`status: in_review`・ASIN 未発行。かつ `content/kindle/strategy.md` は「択一シリーズは **KDP Select に加入せず**提出」と定めており、e-02 は元から Select 非加入方針。Select 加入 LIVE な A 系は収録範囲が異なる別タイトル（422問の論点別再構成 vs 1162問の全年度）
- 抵触と判断する場合: 10 月上旬までに KDP 管理画面で A-00〜A-06 の「KDP セレクトへの自動登録」をオフ

### [DN-0090] 過去問 年度拡張の未整備分（原典未入手・2026-07-17 調査）
タグ: [コンテンツ品質] [種類:意思決定] [実行:ユーザー]

カバレッジ調査で判明した「取りに行けば整備できるが原典が未入手」の過去問。**いずれも公式サイト（engineer.or.jp / touhokugiken 等）や書籍から入手可能性はあるが、現状ローカルに原典なし**。着手は入手が前提・優先度は流入価値で判断:
- **技術士第一次試験 H30以前**: サイトは R01〜R07（560問）のみ。H30以前は engineer.or.jp で公開されているが**正答が合本PDF（`_12` 形式）で別パイプライン要**（[exam-content-policy.md](../knowledge/reference/exam-content-policy.md) §技術士第一次試験）。RelatedKeywords も当面省略中（建設一次の論点キーワードページ未整備）
- **1級土木 第二次検定 H26〜R02**: サイトは二次 R03〜R07 のみ（一次は H26〜R07 完備）。H30〜R02 は**旧「実地試験」形式で二次原典がリポジトリに無く入手先の記録もなし**。現行 R8 対策への直接価値は限定的（旧形式）＝学科記述の論点素材としての価値で判断
- **2級土木 R02以前**: サイト・原典とも R03〜R07 のみ。旧学科/実地は原典なし・拡張計画の記録なし
- **コンクリート主任技士 R6・R7 / H24・H25 skip 分**: 上記「H24/H25 skip 分の補完＋R6/R7 拡張」参照

### [DN-0091] note 公開2スキル（note-publish / publish-note）の整理
タグ: [エージェント・SSOT] [種類:意思決定] [実行:対話]

①`publish-note` SKILL.md の幻 noteId 節にエンジン明示を追記（`note-publish-magazine` の一次ガードは Playwright 系の話・実在ゲート `verify-note-status` は全エンジン共通）②名前の紛らわしさ＝リネーム/統合か相互参照強化かの設計判断（🟣寄り・台帳同期が要る大工事なので費用対効果を要検討）。
