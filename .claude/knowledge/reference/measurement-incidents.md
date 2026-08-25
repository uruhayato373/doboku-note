---
title: 計測・検証事故の記録
---

# 計測・検証事故の記録

計測データの欠損・誤報・不整合、および外部検証サービスとのアクセス罠が発生した過去事例を記録する。**再発防止のための教訓を蓄積**し、新規スキル・エージェント設計時に同じ落とし穴を避ける。

個別事例は時系列の逆順（新しい順）で追記する。各事例は「現象 / 根本原因 / 気づきの遅延理由（or 検出経緯）/ 適用した対策 / 教訓」を明記する。

## 2026-08-21: ランナーのディスク枯渇で計測 workflow が落ち、**ログが残らず追跡できなかった**

### 現象

`GSC auto review (record layer)` が 2026-08-21 03:42Z に failure。
`gh run view --log-failed` は `log not found: 96661002253` しか返さず、原因に到達できない。
成功と失敗が数週間ずっと交互に出ていた（2026-08-06 は 1 時間に 4 失敗 3 成功）。

### 追跡の仕方（ログが無いときの唯一の入口）

ステップの conclusion を API で見ると、**`Set up job` 以外がすべて `null`**＝1 本も走っていなかった。

```bash
gh api repos/{owner}/{repo}/actions/jobs/{job_id} --jq '.steps[] | "\(.number)	\(.conclusion)	\(.name)"'
gh api repos/{owner}/{repo}/check-runs/{job_id}/annotations --jq '.[] | "\(.annotation_level): \(.message)"'
```

annotations に真因が出ていた。

```
System.IO.IOException: No space left on device : '.../\_diag/Worker_...log'
```

**ランナーが自分の診断ログを書く空きすら無かった**ため、run ログが 1 バイトも残らなかった。
`--log-failed` が「log not found」を返すのは、ログ保持期限切れとは限らない。

### 根本原因

`fetch-depth: 0`（full clone）。このリポジトリは **remote 11 GB**（`gh api repos/{owner}/{repo} --jq .size`）で、
`ubuntu-latest` の空き（約 14 GB）を実行中の一時ファイルと合わせて超える。
容量の縁で動いていたため「たまに落ちる」形になり、異常として認識されなかった。

### なぜ気づけなかったか

- 失敗が散発で、その都度「外部要因だろう」と流していた
- ログが残らないので、原因を見に行っても何も出ない → 追跡を諦める、が繰り返された
- 同じ workflow が翌週は成功するため、恒久的な欠陥だと思われなかった

### 恒久ルール

**`fetch-depth: 0` を書かない。** 全履歴が要ると思っても、まず既定（1）で試す。
`cloudflare-deploy.yml` は既定 depth のまま sitemap の git-dates（46,466 ファイル解析）を通しており、
履歴が要る処理も shallow で成立する。

機械ゲート `npm run check-workflow-clone-depth`（`quality:audit` の CI ゲート）で禁じる。
本当に必要な workflow は `scripts/check-workflow-clone-depth.mjs` の `ALLOWLIST` へ
**理由を添えて**登録する（理由の無い登録はテストが落とす）。

### 適用した対策

- `gsc-auto-review.yml` / `competitor-scan.yml` から `fetch-depth: 0` を削除（両者とも git 履歴を使っていない）
- `check-workflow-clone-depth` を新設し CI ゲートへ登録。テスト 6 件
- あわせて `check-workflow-publish-ref`（schedule の checkout ref）も新設

### 残る課題

**remote 11 GB そのものが縁**。今回は full clone をやめて回避したが、リポジトリが太り続ければ
shallow clone でも別の面（Pagefind index・build 成果物）で同じ壁に当たる。何が容量を占めているかの
棚卸しは未実施（`DN-0109` の範囲外）。

### 関連

- ログが取れない失敗は annotations API を先に見る。`--log-failed` の沈黙を「原因不明」で終わらせない
- [affiliate-operations.md](affiliate-operations.md) と同じく、**縁で動いているものは異常として立ち上がらない**

## 2026-08-21: GA4 の `(not set)` を「配線欠落」と読み違えた（カスタムディメンションの遡及不可）

### 現象

キャリアファネルの基線レポートで、`affiliate_cta_click` の `cta_placement` が `(not set)` で
**9 クリック＝全クリックの 47%** を占めた。表示側の `(not set)` は 0 件。

これを「表示には placement が付くのにクリックには付かない面が残っている＝配線欠落」と判定し、
backlog と実装契約に「Phase 03 で直す対象」と書いた。**誤りだった。**

### 根本原因

GA4 のカスタムディメンションは**作成日より前のイベントへ遡及しない**。

- `cta_placement` の作成日 = **2026-07-25**（`.claude/config/ga4-admin-desired-state.json` の `$observed`）
- スナップショットの窓 = **2026-07-16 〜 08-12**

窓の始端が作成日より 9 日前で、その 9 日分が `(not set)` になる。仕様どおりで直す対象は無い。
表示側に `(not set)` が出なかったのは、`affiliate_cta_impression` の本番反映が同じ 2026-07-25 で、
**作成日より前のイベントがそもそも存在しない**ため（`report-buildjob-affiliate.mjs` の `IMPRESSION_SINCE`）。

### なぜ気づけなかったか

`(not set)` を見た瞬間に「実装の穴」と解釈し、**窓の始端とディメンション作成日を突き合わせなかった**。
`(not set)` は「送っていない」と「まだ集計軸が無かった」の両方で出るのに、前者だけを想定した。

### 恒久ルール

**`(not set)` を見たら、まず窓の始端とカスタムディメンションの作成日を比べる。**

- 窓の始端 < 作成日 → **遡及不可（仕様）**。直す対象は無い。判定は作成日以降の窓で行う
- 窓が全て作成日以降 → **本当の配線欠落**。そこで初めて実装を疑う
- 作成日が分からない → **断定しない**

目視に頼らず機械で切り分ける。`report-career-funnel.mjs` の `classifyNotSet()` が
`pre-registration` / `wiring-gap` / `unknown` を返し、作成日は `.claude/config/career-funnel.json` の
`dimensionRegisteredAt` に置く。実機観測値（`ga4-admin-desired-state.json`）と食い違えばテストが落ちる。

### 適用した対策

- `classifyNotSet()` と `dimensionRegisteredAt` を新設し、レポートの WARN が原因まで書くようにした
- テスト 5 件（境界＝始端と作成日が同日なら配線欠落側、作成日不明なら断定しない、を含む）
- backlog・実装契約の誤記述を訂正した

### 教訓

**新しい集計軸を足した直後の窓は、必ずその軸の作成日をまたぐ。** 導入から 28 日以内に
「前後で比べる」ことは原理的にできない。改善の効果を測る窓は、**軸の作成日以降**に取る。

### 関連

- 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）の同型。**ここでは逆に「仕様の空白を実害と読んだ」**
- `.claude/config/ga4-admin-desired-state.json`（作成日の実機観測値）
- [affiliate-operations.md](affiliate-operations.md)「悩み別に CTA 文言を出し分ける」

## 2026-08-17: NSM 下落は計測不具合ではなく試験日の季節性（4週の持ち越しを決着）

### 現象

GA4 の Organic users が 1,188 → 835 → 753 → 520 と 3 週連続で約 30%/週 下落する一方、
GSC は clicks 22→26・CTR +1.3pt・平均順位も改善。**同じ「検索流入」で符号が逆**に見えたため、
W31〜W33 の週次レビューが「どちらかが実態を映していない」として前年同期比の検証を
Must に積み続けた（4 週連続の持ち越し。この間、全施策の効果測定が保留になった）。

### 決着（2026-08-17）

**季節性で説明がつく。計測の異常ではない。** 根拠は 2 つ。

1. **試験日と一致する**（`.claude/config/exam-calendar.json` で実照合）。2級土木一次 06-07 →
   1級土木一次 07-05 → 技術士二次 総監 07-19 / 建設部門 07-20 で山が終わり、次は 1級二次 10-04 まで空く
2. **売上が同じ形で落ちている**。2026-07 ¥275,140 → 2026-08 ¥39,520（17日時点）。
   しかも 7 月の内訳は建設部門2次が牽引しており、その試験は 07-20 に終わっている

GSC が逆を向いて見えた件も矛盾しない。**週 26 クリックは GA4 の週 520 ユーザーの約 1/20 の桁**で、
±4 は誤差の範囲。そもそも母集団が違う（GSC は Google Search のクリックのみ）。
**桁が 20 倍違う 2 指標の増減の符号を突き合わせない**こと。

### なぜ 4 週かかったか（根本原因）

検証手段に選んだ「前年同期比」が**実行不可能だった**。`.claude/state/metrics/ga4/` の最古は
2026-05-17 で、2025 年のデータが 1 件も無い。**取れないものを Must に積み続けた**ため、
毎週「持ち越し」と書くだけの週が 4 回続いた。

### 恒久ルール

- **需要の季節性が疑われるトラフィック変動は、まず `exam-calendar.json` の試験日と売上曲線に当てる**。
  この 2 つはローカルで完結し、GA4/GSC の取得状態に依存しない
- **持ち越しが 2 週を超えたタスクは、着手されない理由が「優先度」か「実行不可能」かを判定する**。
  後者ならタスクの書き方を変える（この件は前年同期比という手段自体が成立していなかった）
- 前年同期比を将来使うには**今から積む**しかない。月次のトラフィック・売上スナップショットを
  残しておくこと（2027 年に初めて比較可能になる）

### 関連

- 売上の月次: `.claude/state/sales/sales-log.json`（2026-08-17 に 7 月を実体で差し替え・[sales-tracking.md](sales-tracking.md)）
- 試験日の真実源: `.claude/config/exam-calendar.json`

## 2026-07-30: 「構造的に必ず赤いゲート」— weekly-review-guard の偽赤（恒久ルール）

### 現象

`weekly-review-guard` が 2026-07-20・07-27 と 2 週連続で failure。ログは
「週次レビュー欠落: `docs/reviews/weekly/YYYY-Www-review.md`（当時は W30）が存在しません。クラウドルーティン
（doboku-note weekly PDCA）の発火状態を確認してください」。
これを見て **「クラウドルーティンが停止している」と結論したが、誤りだった**。

### 根本原因

週次レビューには **保持方針（最新週だけ残す）** がある。W31 を作るコミット（58dfb22c1
「2026-W31 週次レビュー + 計画（旧W30は保持方針で削除）」）が **W30 を削除している**。
guard は「先週分のファイルが今あるか」だけを見ていたため、**サイクルが正常に回っていても
翌週分が作られた瞬間に先週分が消えて必ず赤くなる**構造だった。

実際 W31-review.md は 2026-07-27 06:04 JST（月曜朝）に `Co-Authored-By: Claude Opus 4.8` で
生成されており、サイクルは回っていた。赤の原因はルーティンではなく guard の判定方法。

### なぜ危険か

1. **常に赤いゲートは読み飛ばされる**ようになり、本当の欠落を隠す（偽緑と同じ害）。
2. guard のメッセージが「ルーティンを再作成せよ」と誘導していた。従えば
   **2026-05-30 の weekly-review 重複生成事故を再演**する（既存確認なしの create）。
   偽赤が誤った是正行動を促す設計になっていた。

### 恒久ルール

1. **「今の状態」で判定するゲートは、保持方針・ローテーション・削除運用と衝突しないか確認する。**
   成果物が意図的に削除される運用なら、判定は **git 履歴**（生成された事実）で行う。
2. **「無い」と「見えない」を区別する。** shallow clone で履歴が引けない場合を検出し、
   「判定不能」として扱う（`git rev-parse --is-shallow-repository`／checkout は `fetch-depth: 0`）。
3. **ゲートの修正指示に破壊的アクションを書かない。** 「再作成せよ」ではなく「まず切り分けよ」
   （誰が生成しているか → list-first → 不在を確認できないなら作らない）。
4. **赤が続いているゲートは、まず原因が本当にゲートの外にあるかを疑う。** 2 週連続で同じ赤なら
   ゲート自身の欠陥である可能性が高い。
5. **判定の精度を上げるために CI を重くしない。** 監視のための checkout / 取得コストが job の
   timeout を超えると、ゲートは緑にも赤にもならず **cancelled** になる（＝何も検査していない）。
   「軽い不変条件」で同じことが言えないか先に考える。

### 適用した対策

| 対策 | 実体 |
|---|---|
| 最新週ベース判定 | `scripts/check-weekly-review.mjs`: 「現存する最新レビューが先週以降か」で判定。保持方針下でも最新週は必ず 1 つ残るので誤検知しない |
| 判定のために CI を重くしない | 当初は `git log --diff-filter=A` で履歴判定にしたが `fetch-depth: 0` が必要になり、65,000 ファイルのこのリポジトリでは checkout が job の 5 分 timeout を超えて **cancelled**（2026-07-30 実測）。履歴も全取得も不要な最新週比較へ作り替えた |
| 誘導の修正 | 失敗メッセージを「誰が生成しているかを先に切り分け → list-first → 不在を確認できないなら作らない」へ |

### 関連

- 同日の逆パターン（偽緑）: 本 doc「GSC/GA4 UI 取得の『偽緑』」
- CLAUDE.md §8「クラウドルーティン作成ルール」（list-first）
- `RemoteTrigger list` はページングされ全件を返さない（cursor を渡しても同じページが返る・2026-07-30 実測）
  ＝**不在を証明できないので create しない**
## 2026-07-30: GSC/GA4 UI 取得の「偽緑」— 失敗した run が月次サイクルを満たしたと記録されていた（恒久ルール）

### 現象

`check-gsc-ui-due` が「OK: 前回 2026-07-23（2日前）」と緑を返していた。実際のマーカーは
`downloadedUnits 7 / totalUnits 10` で **3 ユニット分が取れていない**のに `status: "ok"` と記録されていた。
さらに GA4 UI 経路（`ga4-ui:fetch`）は **一度も走っていない**のに、それを surface する仕組みが無かった
（`.claude/state/metrics/ga4-ui/` が存在しないだけ＝誰も気づけない）。

同時に判明した実害:

- **`search-growth:audit` が一度も通っていなかった**。`gsc-ui:fetch && google-console:normalize && search-growth:report`
  の連鎖で、中間の normalize が **引数なし**で呼ばれており `resolveRunDir` が null → 「run ディレクトリが
  見つかりません」で毎回 exit 2 → report まで到達しない。個別実行でしか回っていなかった。
- **CSV から得た URL 情報が消えた**。`.claude/state/metrics/gsc-ui/*/` は gitignore で、raw CSV は
  **再取得しかできない**（再生成不可）。2026-07-23 の 1,952 行は worktree 消滅と同時に失われ、
  `report-search-growth` はその run の normalized/ しか読まないため別マシンで診断が再現しなくなった。
- **Playwright プロファイルが実質 Mac 専用だった**。`google-console-browser.mjs` の `PROFILE_ROOT` が
  Mac 絶対パスのハードコードで、Windows では `process.cwd()` にフォールバック → worktree から実行すると
  プロファイルが worktree 内に作られ、worktree を捨てると同時にログインが消える。
- **GA4 カスタムディメンション未登録が永久に緑**。`fetch-ga4-cta-clicks -- --by-label` / `--by-placement` は
  `customEvent:event_label` / `cta_placement` が未登録だと登録手順を出して **exit 0**、CI 側も
  `continue-on-error: true`。プログラム別 EPC と配置別 CTR が欠測し続けても赤くならない。

### 根本原因

1. `manifest.status = "ok"` を **例外が飛ばなかったこと**の同義として立てていた（ユニットの成否と無関係）。
2. マーカー書き込みが status に関わらず実行され、**単一の run 情報しか持たなかった**ため、失敗 run が
   直前の成功記録を上書きして消した（実際 not-signed-in の run が 07-23 の記録を消した）。
3. due 判定が `collectedAt` の経過日数のみ。完全性を見ていなかった。
4. `row-not-found`（正常なゼロ）と取得失敗が同じ「downloaded でない」として一括されていたため、
   「7/10」が異常なのか正常なのか誰も判断できなかった。

### 恒久ルール

1. **失敗は月次サイクルの時計をリセットしない**。マーカーは `lastAttempt`（毎回更新・失敗も記録）と
   `lastComplete`（完全な run のみ更新）を分けて持つ（schemaVersion 3）。年齢は `lastComplete` で測る。
2. **正常なゼロと失敗を分けて数える**。`row-not-found` は `zeroUnits`、それ以外の非取得は `failedUnits`。
   失敗が 1 件でもあれば `partial`。ある面で取得成功が 0 件なら UI 変更の疑いとして `suspiciousScopes`。
3. **不完全なら exit 0 にしない**。取得・正規化ともに非 0 を返し、合成コマンドの連鎖をそこで止める。
4. **「再取得しかできないデータ」から得た情報は commit する**。raw は gitignore のままでよいが、
   正規化結果は `ssot/urls/` ＋ `ssot/history.json` ＋ `ssot/diff/` として追跡する。
5. **プロファイルパスにユーザー名をハードコードしない**。`~/doboku-note` で解決する（Mac/Windows 共通）。
6. **「設定が無いのでスキップ」を緑にしない**。設定の期待値を config に置き、実機観測と突合するゲートを持つ。

### 適用した対策

| 対策 | 実体 |
|---|---|
| 完全性判定の単一実装 | `scripts/lib/google-console-units.mjs`（`judgeRun` / `buildMarker` / `exitCodeFor`） |
| 取得の status を完全性で決定 | `fetch-gsc-ui-csv.mjs` / `fetch-ga4-ui-csv.mjs`（`bail()` で中断時もマーカーを complete:false で記録） |
| due 判定に完全性を導入 | `check-gsc-ui-due.mjs`（gsc-ui 必須 / ga4-ui 任意の 2 チャネル） |
| CSV 情報の追跡 SSOT | `scripts/lib/google-console-ssot.mjs` ＋ `normalize-google-console-csv.mjs` ＋ `.gitignore` の `!.../ssot/` 例外 |
| SSOT 整合ゲート | `scripts/check-google-ui-ssot.mjs`（検査ゼロ・runId 不整合・不完全 run を FAIL） |
| レポートの再現性 | `report-search-growth.mjs` が SSOT を優先読込（`gscUiSource` を md に明記） |
| プロファイル解決 | `google-console-browser.mjs` の `PROFILE_ROOT_CANDIDATES`（env → `~/doboku-note` → 旧 Mac パス） |
| GA4 設定の desired state | `.claude/config/ga4-admin-desired-state.json` ＋ `scripts/ga4-admin-setup.mjs`（dry-run 既定・`--commit` gate） |
| GA4 設定のドリフト検知 | `scripts/check-ga4-custom-dimensions.mjs`（blocking 未登録は exit 1） |
| 合成コマンドの修復 | `normalize` の既定を最新 run に／`search-growth:audit` を部分成功許容＋末尾に SSOT ゲート |

### 教訓

「異常 0 件」と「1 件も検査していない」に加えて、**「一部しか取れていない」も同じ緑になる**。
検査系の出力には必ず「検査対象数・成功数・正常なゼロ・失敗数」の 4 つを出す。1 つの数字（7/10）は
それが異常かどうかを判断できないので、緑にも赤にもできない＝結局読み飛ばされる。

### 関連

- [gsc-management.md](gsc-management.md)「cadence」の不変条件 4 項
- `docs/operations/gsc-ga4-playwright-automation-spec.md`（実装指示書）
- CLAUDE.md §9「検査ゼロを PASS と呼ばない」
## 2026-07-27: 「検証できない理由」の誤り — エラー文を原因として引用しない（恒久ルール）

### 現象

EXP-005 の作業報告で、**未検証の理由を 2 つとも誤って述べた**。

1. 「PSI API が本日クォータ超過（429）のため live 検証は未了」→ **誤り**。実際は**ローカルに `PSI_API_KEY` が無い**ため、キー無しリクエストが Google の匿名共有枠に載って即 429 になっただけ。CI（Secrets にキーあり）は 44 クエリ/日を正常処理しており、日次収集は健全だった。
2. 「CI の次回実行で確認する」→ **誤り**。当該 workflow（`psi-audit.yml`）は checkout に `ref:` が無く**デフォルトブランチ（`main`）で走る**。変更は `develop` にあり、しかも未 push だった。**deploy を経るまで新コードは 1 度も実行されない**。

3. （**同日、本記事の初版でも同型の誤りを犯した**）再発防止としてこの記事に「計測 5 ジョブは全て `main` で走る」と書いたが、`link-audit` / `verify-yt-status` は `ref: develop` 指定で **develop のコードが走る**。「push 先が develop だから main で走るのだろう」と推論し、`with: ref:` を確認しなかった。さらに scheduled workflow は 5 本ではなく **9 本**あった。→ 下記「実務上の要注意事実」の表は訂正済み。

### 根本原因

- **エラーメッセージをそのまま原因として採用した**。「Quota exceeded / Queries per day」は*サーバが下した判断*であって、*呼び出し側がなぜその状態にあるか*は説明しない。`.env.local` を 1 回 grep すれば分かった。
- **CI の実行ブランチを確認しなかった**。`gh repo view --json defaultBranchRef` 1 回で分かった。
- **共通構造**: どちらも外部システムの挙動を、数秒で確認できるのに確認せず断定した。

### なぜ既存ガードレールが効かなかったか（適用範囲の穴）

同一セッションの LCP 診断では厳密に実測していた（自分が書いた `component-loader` の修正を実測で否定し撤回した）。差は「**証明するとき**は検証し、「**できない理由を述べるとき**」は検証しなかった」点。制約・注記・limitation を無意識に「主張ではないもの」として検証対象外にしていた。CLAUDE.md §8 と memory `no-overstate-external-specs` は持っていたが、どちらも「提案・推奨」「外部仕様」の文脈で書かれており、**自分の作業の制約説明**が適用範囲と認識されなかった。

注記の誤りは謙虚に見えるため指摘されにくく、commit message やレポートに固着する（実際 `2969ebb26a` のメッセージに残存）。

### 恒久ルール

- **「〜のため検証できない」と書く前に、その理由自体を 1 手で検証する。** 理由も主張であり、検証義務は結論と同じ。
- **エラーコードを原因として引用しない。** サーバの応答は症状。自環境（creds / proxy / ブランチ / 権限）を先に疑う。
- **ローカルで計測 API が 429 / 403 / 503 を返したら、まず自環境を疑う**（→ 2026-06-05 の恒久ルール「計測は CI/CD 供給が正」。ローカル live fetch はそもそも正規手順ではない）。CI 側は健全な可能性が高いので、「計測基盤の障害」と報告しない。

### 2026-08-25: 「会社 PC は外部 API 遮断」の一部は SDK 側の問題だった（R2 実測）

「会社 PC はプロキシで外部 API が遮断される」を根拠に R2 もローカル不可と扱っていたが、**R2 は通る**。

```
curl https://<account>.r2.cloudflarestorage.com/
  HTTP/1.0 200 Connection established     ← プロキシが CONNECT トンネルを張っている
  HTTP/1.1 400 Bad Request
  Server: cloudflare
  <Error><Code>InvalidArgument</Code><Message>Authorization</Message></Error>
```

400 は「署名の無いリクエストを R2 が拒否した」＝**本物の R2 に届いている**。接続 4.6ms。

それでも SDK 経由だけ失敗していたのは、**AWS SDK v3 が `HTTPS_PROXY` を自動では見ない**ため。
直接 egress が塞がれた環境では SDK のリクエストだけが落ちる。`makeS3()`
（`scripts/lib/asset-storage.mjs`）に `NodeHttpHandler` + `HttpsProxyAgent` を渡すよう修正した。

**教訓**: 「プロキシで遮断」と記録するときは、**遮断されているのがネットワークなのか、
クライアント実装がプロキシを使えていないだけなのかを分ける**。前者は端末を変えるしかないが、
後者はコードで直る。`curl` が通って SDK が通らないなら後者を疑う。

なお R2 への書き込み経路は、credential をローカルへ置かない方針のまま
`asset-inbox-push.mjs` → `asset-inbox.yml`（CI）で行う（asset-storage-policy §2）。

### 実務上の要注意事実: 定期ジョブの実行ブランチは workflow ごとに違う

> **この節は 2026-07-27 に訂正済み。** 初版では「計測 5 ジョブは全て `main` で走る」と書いたが、**2 件が誤り**だった（`link-audit` / `verify-yt-status` は `ref: develop` 指定で develop のコードが走る）。「結果を `develop` に push している」ことから実行ブランチを推論し、各 yml の `with: ref:` を確認しなかったため。**再発防止を書いたこの記事自体が、同じ「未確認の断定」で汚染されていた**。以下は全 yml を実読して作成した表。

**`push 先` と `実行ブランチ` は別物**。checkout に `ref:` があればそのブランチ、無ければデフォルトブランチ（`main`）のコードが走る。

> [!important] `workflow_dispatch` は **default branch に無いと起動すらできない**（2026-08-25 実測）
> cron の「main のコードが走る」より一段強い制約がある。新しく `workflow_dispatch` の workflow を
> 足して develop へ push しても、**API/UI からトリガーできない**:
>
> ```
> HTTP 404: workflow asset-hydrate.yml not found on the default branch
> ```
>
> `--ref develop` を付けても同じ。GitHub は「その名前の workflow が default branch に存在するか」で
> 起動可否を決め、`ref` は**実行するコードの選択**にしか使わない。既存 workflow の中身を直した場合は
> develop で dispatch できる（名前は main に在るため）が、**新規追加は main へ載るまで死んでいる**。
>
> つまり「develop に置いたから使える」は成り立たない。新規の dispatch workflow を作ったら、
> 使えるようになるのは `/deploy` で main へ昇格した後。

| workflow | cron | **実行ブランチ** | push 先 | 対象 |
|---|---|---|---|---|
| `psi-audit.yml` | `0 17 * * *` | **main**（ref 無し） | develop | PSI / Core Web Vitals |
| `fetch-metrics.yml` | `0 21 * * 4` | **main**（ref 無し） | develop | GA4 / GSC 週次 |
| `index-coverage.yml` | `0 2 1 * *` | **main**（ref 無し） | develop | GSC index coverage |
| `weekly-review-guard.yml` | `17 2 * * 1` | **main**（ref 無し） | なし | 週次レビュー実施の督促 |
| `r2-audit.yml` | `0 22 * * 0` | **main**（明示） | なし | R2 / OGP / 品質ゲート |
| `post-youtube-scheduled.yml` | `0 19 * * *` | **main**（明示） | main | YouTube 予約投稿 |
| `link-audit.yml` | `0 22 * * 4` | **develop**（明示） | develop | リンク切れ |
| `verify-yt-status.yml` | `0 20 * * 4` | **develop**（明示） | develop | YouTube 公開状態 |
| `uptime-ping.yml` | `0 23,5,11 * * *` | **develop**（明示） | なし | 死活監視（shell のみ） |

**計測スクリプトを変更したら、「いつから新しいデータが入るか」は該当 workflow の実行ブランチを見て答えること。** `main` 実行のジョブなら deploy 日が基準になる。

**機械チェック**: `npm run check-scheduled-exec-branch`（pre-commit で staged を WARN）。staged のファイルがどの定期ジョブにどのブランチで実行されるかを yml を実読して答えるので、**この表を記憶や推論で語る必要はない**。

### 教訓

- 報告の中で**最も検証が甘くなるのは「できなかったこと」の説明**。成果は疑われるので裏を取るが、制約は疑われないので素通りする。ここが誤情報の入口になる。
- 誤った制約説明は「やらなくてよい理由」を作り、次の担当者の判断を歪める。今回は「CI が勝手に検証してくれる」という誤った安心を残しかけた。
- **再発防止の文書を書く行為自体が、同じ誤りから免れない**（上記 3.）。「A だから B だろう」という推論は、防止策を書いている最中でも走る。だから**規律の文書化だけでは足りず、事実を機械に答えさせる**必要がある（→ `check-scheduled-exec-branch`）。人が表を維持する限り、その表は次の推論で汚染される。

---

## 2026-07-27: PSI の lab スパイクを CRITICAL と誤判定 — lab と field の判定原則（恒久ルール）

### 現象

W30 週次レビューで homepage の PSI を見て「Performance 59 / LCP 10,158ms、**CRITICAL REGRESSION**、W31 即対応必須」と警報を上げた。W31 で `psi-batch-*.json` を時系列で精査したところ、その値は 07-21 の**単一バッチのスパイク**で、lab Performance はその後 67〜69 で安定。**実ユーザー（CrUX field_data）の LCP p75 は 810→822ms で一貫して FAST**、実害はゼロだった。存在しない障害に緊急 bisect の工数を割きかけた。

### 根本原因

1. **判定の主源を lab に置いていた**: `psi-config.json` の `LCP_ms_max: 2500` が lab 値へフラットに適用され、`regression.LCP_ms_increase: 500` も lab の**単発差分**で発火する設計だった。lab は低速回線 + CPU 4x スロットリングの合成値で日次の振れが大きい（実測: `primary-h26-a` は 2,026〜7,201ms、`guide-four-management` は 2,101〜6,376ms が同一週内で往復）。この設計では毎日どれかが CRITICAL を踏む。
2. **field を判定に使っていなかった**: `performance-auditor` の閾値表は LCP/CLS/FCP/TBT を「lab」、field は INP と TTFB のみ。**LCP の field（実害の唯一の証拠）が判定経路に無かった**。

### 正しいモデル（恒久ルール）

| 用途 | 使う値 | 根拠 |
|---|---|---|
| **実害の有無＝対応要否の判定** | `field_data.LCP.category`（FAST/AVERAGE/SLOW） | CrUX は実ユーザーの p75。SEO 評価も field |
| 改善余地の**診断**・施策の当たり判定 | `lab_data.LCP_ms` の**複数バッチ中央値** | lab は再現条件が固定で施策の前後比較に向く |
| **やってはいけない** | lab の単発値・単発差分での CRITICAL 判定 | 日次の振れをインシデントと誤認する |

- **CRITICAL は field が SLOW/AVERAGE のときだけ**。field が FAST なら、lab がどれだけ悪くても「改善余地（優先度 Medium 以下）」であって障害ではない。
- lab で回帰を見るときは**単発差分でなく直近 3〜5 バッチの中央値**を比較する。
- field は CrUX の 28 日ローリングなので、施策直後には動かない。**deploy 直後の効果確認は lab、恒久判定は field** と役割を分ける。

### 適用した対策

- 本節を真実源として制定（2026-07-27）
- `psi-config.json` を field-primary / lab-secondary に構造化（`judgment` セクション）
- `performance-auditor` の判定を field-first に改訂し、`lcp_element` を消費して「何が LCP か」まで surface させる
- `fetch-psi-data.mjs` が PSI の `audits['largest-contentful-paint-element']` を保存するよう修正（従来は破棄していたため、原因特定に Playwright での別計測が必要だった）
- `scripts/check-lcp-image-hints.mjs` を新設し pre-commit ゲート化（下記の実害側の再発防止）
- `weekly-review` の Agent C2 を本原則に整合

### 追記 2026-08-25: field が消えると、この原則がそのまま「常時緑」に化ける（DN-0127）

field-primary にしたことで、**field が供給されなくなった瞬間にゲートが判定材料を失う**という
裏面ができていた。`psi-threshold-check.mjs` が赤にするのは `field` / `field-category` /
`coverage` の 3 型だけなので、field が全 null なら違反は 1 件も立たず**緑になる**。
「実害が無い」と「判定材料が無い」の出力が同じになる ＝ §9「検査ゼロを PASS と呼ばない」の入力欠落版。

観測（全 247 バッチ走査）:

| 期間 | field を持つ result |
|---|---|
| 〜2026-07-20 | 0（CrUX 未供給） |
| 2026-07-21 〜 08-17 | 供給あり（最終 08-17 は 22/22） |
| **2026-08-18 〜** | **0/22 が 12 バッチ連続** |

`final_url` は出続けスキーマ（keys 9）も変わっていないので、取得とパースは動いている。
8/17 の 22/22 から翌日 0/22 へ**全 URL 一斉に**落ちており、個別ページのサンプル数不足では
説明しにくい。CrUX 側の供給停止として扱う。会社 PC はプロキシで PSI API を直接叩けないため
（本ファイル冒頭の恒久ルール）、ライブ再現での確定は CI 側に委ねる。

**対策**: `min_field_coverage`（既定 1）を `psi-config.json` に追加し、`primary_source=field` の
ときに field 取得件数がこれを下回ると `field-coverage` 違反を立ててゲートを赤にする。
レポートと stderr の両方に `field(CrUX) 取得: N/M件` を**常に**出す。
これで「緑 ＝ 実害なし」と「赤 ＝ 判定不能」が区別できる。

**まだ決めていないこと**: 供給が恒久的に戻らないなら `primary_source` を lab 中央値ベースへ
書き換える必要がある。7 日の欠測では判断せず、赤を出したまま観測を続ける。書き換えるときは
本節の判定原則そのものを改訂する。

### 併せて判明した実害（EXP-005 の本体）

lab が恒常的に悪い理由自体は本物だった。Playwright + `PerformanceObserver('largest-contentful-paint')` で本番を実測した結果、`civil-construction-1-primary-r07-a` の LCP 要素は**本文1枚目の図版**（top 617px、モバイル viewport 844px の**フォールド内**）でありながら `loading="lazy"` が付いていた。低速回線では取得がレイアウト確定まで遅延し LCP が数秒伸びる。高速回線の実ユーザーでは顕在化しないため、**lab と field の乖離はこれで完全に説明がつく**。

- MDX のリテラル JSX `<img>` は **components マップを経由しない**（マップされるのは markdown 記法 `![]()` 由来の要素のみ）。そのため `src/lib/component-loader` の `img:` は当該コーパスに対してデッドコードで、MDX ソース側を直す必要がある
- 対象 24 本を `loading="eager" fetchpriority="high"` へ修正し、再発は `check-lcp-image-hints` が pre-commit で防ぐ

### 教訓

- **合成計測（lab）の単発値は「症状の疑い」であって「実害」ではない**。実ユーザー計測（field）で裏を取ってから重大度を決める。計測が2系統あるとき、どちらが実害の証拠かを設計時に決めておかないと、ノイズがインシデントに化ける。
- **「遅い」までしか記録しない計測は原因を教えない**。PSI は LCP 要素を返していたのに保存していなかったため、原因特定に別ツールでの再計測が必要になった。指標だけでなく**原因を指す属性**を保存する。
- 誤警報は 1 週間分の優先順位を歪める。W30 の Must #1 は実在しない障害だった。

## 2026-06-05: 計測は CI/CD 供給が正 — 「ローカル creds 未設定＝ブロッカー」は誤り（恒久ルール）

### 現象

週次レビュー（W23）生成時に、NSM/GSC を「ローカルで計測できない・creds 未設定＝制約／ブロッカー」とフレーミングしてレビューに記載してしまった。実際は計測は CI/CD で完結しており、コミット済みスナップショットを読むのが正規手順だった。

同セッションで Instagram API 投稿の検証中、`graph.facebook.com` 呼び出しが **会社 PC のプロキシ（Digital Arts i-FILTER / Palo Alto Networks `auris vsys5`）でブロック**されることも判明（`503` + ブロック HTML が返る）。

### 根本原因（2 つ）

1. **環境の制約**: この作業 PC（Windows）は社内 Web フィルタの背後にあり、**外部 API（Google GA4/GSC、Meta `graph.facebook.com` 等）への直接通信が遮断**される。ローカルから `metrics-reader.mjs` / `fetch-ga4-data.mjs` / `fetch-gsc-data.mjs` や Meta API を叩いても通らない（creds の有無以前にネットワークで失敗）。
2. **ドキュメントの framing 欠陥**: weekly-review / weekly-plan / weekly-improve / nsm-experiment の各スキルが「`.env.local` の `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` / `GA4_PROPERTY_ID` が**前提**。未達なら『NSM セクション: スキップ（計測基盤未整備）』」と書き、**スナップショット読みを「オフラインフォールバック」扱い**していた。これがローカル作業者に「計測できない＝基盤未整備」と誤読させた。

### 正しいモデル（恒久ルール）

- **計測は CI/CD が供給する**: `fetch-metrics.yml`（毎週金 06:00 JST）が GA4（channel 28d / date / **organic 7d**）+ GSC（全体 / **date 7d**）を取得して `.claude/state/metrics/{ga4,gsc}/` に commit。`psi-audit.yml` が PSI を日次 commit。
- **コミット済みスナップショットを読むのが既定の正規手順**（フォールバックではない）。ローカル creds は設計上不要で、**未設定をブロッカー扱いしない**。
- **ライブ fetch は creds + 外部到達性が両方ある環境（例: creds 入りの macOS）限定の任意経路**。会社 PC では到達不能なので使わない。
- スナップショットが 2 週分揃わない等で WoW が出せないときだけ「クリーン WoW は次週から」と注記する。「計測基盤未整備」とは書かない。
- **例外＝ブラウザ計測（2026-07-24）**: `/google-search-growth` は Playwright が**ユーザーの実 Google セッション**で GSC UI を開くため、サービスアカウント API がプロキシ遮断される環境でも UI CSV（理由別の例 URL）を取得できる。これは上記ルールの対象（=外部 API 直叩き）とは別枠の**正当なローカル計測**。CI 化は不可（要ログイン）なので月次手動＋`check-gsc-ui-due` で催促。将来セッションは「ローカルで計測するな」と誤解して退役させない。真実源 [gsc-management.md](gsc-management.md)。

### 適用した対策

- 本ファイルに恒久ルールとして記録（真実源）。
- `weekly-review` / `weekly-plan` / `weekly-improve` / `nsm-experiment` の各 SKILL.md の「前提条件 / 条件未達→スキップ」「オフラインフォールバック」記述を、**「コミット済みスナップショットが既定の取得元。ライブ fetch は creds+到達性がある環境のみ任意」** に統一し、本ファイルへポインタを張った。
- Meta API（旧 IG Graph 投稿経路）も同根で会社 PC 不可だった。IG 投稿は 2026-06-17 に Business Suite（`.claude/skills/social/publish-ig-bs/SKILL.md`・ローカル GUI）へ一本化し、Graph API/Actions cron 経路は全廃。

> [!note] 例外レーン: A8.net は「ローカル実行が正規手順」
> このルールは **公開 API がある計測（GA4/GSC/PSI）** の話。A8.net は公開 API が無く、
> `ads/scout-asp`（提携）・`ads/a8-report`（成果レポート）とも **Playwright + 人間ログインのローカル実行が
> 唯一の正規手順**で、CI 化できない（cron も作らない）。放置防止は `check-a8-report-due` が
> 週次 PDCA へ surface する方式で担保する。「ローカルで外部を叩くのは常に誤り」と読まないこと。

### 教訓

1. **「計測データが要る」≠「ローカルで API を叩く」**。本プロジェクトの計測は CI/CD 供給で、エージェントは `.claude/state/metrics/` のスナップショットを読むのが正。
2. **外部 API を使う作業は、ローカルの到達性を先に疑う**。会社 PC は Google/Meta 等を社内フィルタで遮断する。到達不能を「設定不足/基盤未整備」と誤診しない。
3. **ドキュメントの framing が誤判断を生む**: 既定手順を「fallback」と書くと、それが主経路の環境で「劣化・未整備」と誤読される。主経路は主経路として書く。

### 関連

- `.github/workflows/fetch-metrics.yml` - 週次 GA4/GSC 取得・commit（計測の本体）
- `.github/workflows/psi-audit.yml` - 日次 PSI 取得・commit
- `.claude/state/metrics/{ga4,gsc,psi}/` - 計測スナップショット（エージェントの既定取得元）
- `.claude/skills/social/publish-ig-bs/SKILL.md` - IG 投稿の現行経路（Business Suite・ローカル GUI）。旧 Graph API/Mac/Actions 経路は 2026-06-17 全廃

## 2026-05-16〜29: R2 アップロード Unauthorized の握り潰しによる本番画像 404（約2週間サイレント）

### 現象

- 本番（`storage.doboku-note.com`）で civil-construction-2 の図版（47 webp）等が 404。ローカル `npm run dev` では表示される。
- `r2-sync.yml`（main push で `img/**` 変更時に `upload-images-r2 --images-only` 実行）は毎回 **"success" 表示**。
- だが実ログは `Done in Xs! Uploaded: 0, Skipped: 0, Failed: 2647`（全件 Unauthorized）。少なくとも 2026-05-16 以降の全 run で `Uploaded: 0`。

### 根本原因

- R2 API トークン（GitHub Secret `CLOUDFLARE_R2_ACCESS_KEY_ID` / `SECRET`）が失効/無効で、PutObject が `Unauthorized`。
- `upload-images-to-r2.mjs` が **個別ファイルの失敗を try/catch で握り潰し、`failed` をカウントするだけで exit 0** を返していたため、workflow が緑（success）のまま。
- 失効前にアップ済みの旧画像（pe / civil-1）は R2 に残り 200 → **「一部だけ出ない」**状態で気づきにくかった。

### 気づきの遅延理由（致命度: 中）

- workflow が success 表示＝監視上は健全に見えた（exit 0 の握り潰し）ため、約2週間誰も気づかず。
- ユーザーが「ローカルでは出るが本番で画像が出ない」と気づいて初めて発覚。

### 検証中に踏んだ「外部検証アクセスの罠」（このサンドボックス固有・再利用可）

- **S3 API 直叩き不可**: `@aws-sdk/client-s3` の HeadObject がプロキシ/TLS で全件 `Unknown` エラー（CDN 200 のオブジェクトすら MISSING と誤判定）。バケット実在判定に使えない。
- **`curl -I` の罠**: `HTTP/1.0 200 Connection established` はプロキシの CONNECT トンネル応答であり実 HTTP ステータスではない。実ステータスは **`curl -s -o /dev/null -w "%{http_code}"`** で取る。
- **CDN 404 キャッシュの切り分け**: 通常 URL が 404 でも「オブジェクト不在」か「404 キャッシュ」か不明 → **`?cb=<random>` のキャッシュバスター**でオリジン(R2)を直に叩いて判定（cb 付きも 404 なら真にバケット不在）。
- **`git cat-file -e <ref>:<path>` の罠（Windows bash）**: `origin/main:path` の `:` が `;`・`/` が `\` に変換され false negative になる。存在判定は **`git ls-tree -r <ref> -- <path>`** を使う。

### 適用した対策

- ユーザーが Cloudflare で R2 トークン再発行 + GitHub Secrets 更新 → `gh workflow run r2-sync.yml` で再同期（`Uploaded: 2647, Failed: 0`）。本番 200 確認。
- **再発防止（code）**: `upload-images-to-r2.mjs` を **失敗1件でも `process.exitCode = 1`** に変更 → 次回トークン失効時は CI が赤く落ちる。併せて Windows パス区切り正規化（`toPosix`。未正規化だと R2 キーが `posts/…\…` になり別の 404 を生む）。
- **二重チェック（CI）**: `.github/workflows/r2-audit.yml` 新設。週次 + 手動で `diff-r2 --images-only --json` を **main 基準**で実行し、未同期 / サイズ不一致 / 認証失敗で赤落ち。
- 注: 上記 code/CI 変更は 2026-05-29 時点で feature ブランチ上に**未コミット保留**（並行セッションとの衝突回避）。handoff `2026-05-29-r2-content-fallback-removal.md` 参照。

### 教訓

1. **一括アップロード/同期スクリプトは「個別失敗の握り潰し + exit 0」を避ける**。1 件でも失敗したら非ゼロ終了で CI を赤くする。success 表示は「全件成功」を意味しなければならない。
2. **"workflow success" は "処理成功" ではない**。集計ログ（Uploaded / Failed）まで見ないと握り潰しを見抜けない。監視は exit code に依存させる。
3. **トークン失効は部分的な症状で出る**（新規追加分だけ欠落、既存は残存）。「一部だけ出ない」は権限/同期の部分失敗をまず疑う。CLAUDE.md §12「Cloudflare トークン期限切れを仮説 1 番」と整合。
4. **本番/ストレージ検証はこのサンドボックスで罠が多い**: 実ステータスは `curl %{http_code}`、CDN キャッシュ切り分けは cache-buster、バケット実在は CDN 経由で確認（S3 直叩きはプロキシで不可）、git の `ref:path` 判定は `ls-tree`。
5. **R2 同期の健全性を受動監視（push 時）だけに頼らない**。`diff-r2` の定期監査で「local にあるが R2 に無い」を能動検知する。

### 関連

- `.claude/scripts/upload-images-to-r2.mjs` - 同期スクリプト（exit 1 化 + パス正規化）
- `.github/workflows/r2-sync.yml` - main push 時の R2 同期
- `.github/workflows/r2-audit.yml` - 週次 diff-r2 監査（新設）
- `.claude/skills/dev/diff-r2/scripts/diff-r2.mjs` - 差分監査
- handoff `docs/handoffs/2026-05-29-r2-content-fallback-removal.md`

## 2026-06-12: OGP 画像が r2-sync の path フィルタ外で 404 → note 外部リンクカード生成不能

### 現象

- note 無料記事（技術士建設部門）から doboku-note の `/docs/pe-construction-*` を URL 単独行で貼っても**リンクカードが生成されない**（note 自身の URL はカード化される）。
- ページ HTML・OGP テキストタグ（og:title/description/url）は**全 UA で 200・正常**。Cloudflare ボットブロックは無関係（`facebookexternalhit`/`Twitterbot`/空 UA/`Validator/1.0`/default-curl すべて 200 を実測）。
- 壊れていたのは **`og:image`（`storage.doboku-note.com/.../ogp.png`）だけが 404**。note のカード生成器はサムネイル取得に失敗してカードを作れない。

### 根本原因（2層）

1. **OGP 生成は手動**: `ogp.png` は `npm run ogp -- --all`（`ogp-create`）で生成するが、新規カテゴリで未実行だと 0 枚。pe-construction(114)/civil-2(31)/concrete系/pe-first-stage が 0 枚だった（`published:false` ドラフトは仕様スキップ）。
2. **R2 同期が ogp を拾わない（核心）**: R2 アップロードは `cloudflare-deploy.yml` ではなく専用 `r2-sync.yml`。その push トリガーの path フィルタが旧 `**/img/**` 限定で、`ogp.png` は記事ディレクトリ**直下**（img/ の外）にあるため **push しても自動同期されない**。既存カテゴリの OGP は過去の手動同期で上がっていただけ。

### 監視がすり抜けた理由

- `r2-audit.yml`（`diff-r2 --images-only`）は「**local にあるが R2 に無い**」は検知するが、「**そもそも local 未生成**」は検知できない（diff の母集合に入らない）。OGP 未生成カテゴリは丸ごと素通りした。

### 適用した対策

- 生成: `npm run ogp -- --all` で未生成 213 枚生成 → pathspec commit（`26630a1b3`）。
- 反映: `gh workflow run r2-sync.yml -f images_only=true` で全画像 upload（`Uploaded: 3041, Failed: 0`）→ og:image 6/6 が 200 を実測。
- **再発防止（code）**: `r2-sync.yml` の path フィルタに `**/ogp.png` `**/ogp.webp` を追加（`b33430063`、次回 deploy で main 反映）。
- OGP 解決はファイル隣接ではなく **slug 解決**（`getOgpImageUrl`＝category プレフィックス剥がし）。`pe-construction-guide-required-essay/article.mdx` のような変則レイアウトは og:image が `pe-construction/guide-required-essay/ogp.png` を指す（隣接判定は誤検知する）。

### 教訓

1. **外部リンクカードが出ない＝まず og:image の到達性を疑う**（HTML/OGP テキストが 200 でも画像だけ 404 で全カードが死ぬ）。検証は `curl --ssl-no-revoke --retry 5 -A facebookexternalhit/1.1 .../ogp.png` の `%{http_code}`（プロキシ 407/000 はノイズ、retry 必須）。
2. **能動監視（diff-r2）は「local にある前提」**。「未生成」は別途、**公開記事 → og:image 解決先の到達性**で検知する必要がある（プレビューは [[project_ogp_r2_sync_gap]]）。
3. **path フィルタは成果物の実レイアウトに合わせる**。`ogp.png` は img/ の外＝`**/img/**` では拾えない。

### 関連

- `.github/workflows/r2-sync.yml` - path フィルタに ogp 追加済み
- `.claude/skills/conversion/ogp-create/` - OGP 生成（手動・新規カテゴリで要実行）
- `src/lib/r2-image-loader.ts` - `getOgpImageUrl`（slug→ogp パス解決の真実源）

## 2026-04-26: GA4 direct US bot スパイクと weekly-metrics 母数汚染

### 現象

2026-W17（4/20–4/26）の GA4 weekly metrics で、**direct activeUsers が w/e 04-26 で 102（前週 49 / 4 週平均 41 から +2.5x）に急増**。同時に bing source も 126 users（前週 72）と高水準。

| 週末 | bing | google | (direct) |
|---|---:|---:|---:|
| 04-12 | 6 | 4 | 10 |
| 04-19 | 72 | 11 | 49 |
| **04-26** | **126** | **30** | **102** |

### 根本原因（bot 流入）

過去 14 日の direct を切り分けた結果、**ほぼ bot 由来**:

| 指標 | 値 | 解釈 |
|---|---:|---|
| 国別 United States | 88 / 130 (68%) | 日本語の土木試験対策サイトに US から direct = bot |
| 国別 Japan | 21 | これがおそらく実ユーザー |
| 国別 (not set) | 23 | 国判定不能 = bot 典型 |
| device | desktop 130 / mobile 8 (94%) | 受験者は mobile 主体のはず |
| landing | `/` ホーム直行 76 (59%) | 検索由来なら個別記事に着地 |
| 日次 4/24→25→26 | 12→25→32 | 2 日で 2.6 倍のスパイク |

`mobilesecurity.trendmicro.com` のスキャナー referral が source 上位に出ており、bot トラフィックが現に到達している。先行する 2026-04-25 Cloudflare Bot incident と時期が一致。Bing source も同様の bot 疑いを残す（過去 28 日 bing 338 / google 41 という日本語サイトとして異常な比率）。

### 検出経緯（致命度: 中）

- ユーザーから「ダイレクトが増えている理由は」と問われたことが起点
- 通常の weekly-metrics サイクルでは「direct +108%」を **トラフィック増の好シグナル** として誤読する設計欠陥が露呈
- GA4 source 単独では bot/human を区別できないため、country × device × landing を交差させて初めて bot 確定

### 影響範囲

- weekly metrics の direct/bing/google 比率が歪み、**実ユーザー動向の判断を汚染**
- Bing Webmaster Tools 登録（2026-04-27, Issue #173）の効果計測も、実ユーザー流入かボット流入かで意味が逆転する
- 過去の weekly-metrics スナップショット（2026-W14 以降）にも同種の bot が混入していた可能性。retroactive な再評価が必要

### 適用した対策

- Issue [#172](https://github.com/uruhayato373/doboku-note/issues/172) を起票（weekly-pdca, Umbrella #82 配下）
- Issue [#173](https://github.com/uruhayato373/doboku-note/issues/173) で Bing Webmaster データと GA4 bing source の整合性確認を計画
- `weekly-metrics` 集計を **Japan フィルタ版に切り替える方針** を提示（実装は #172 で追跡）
- **2026-05-17 追加対策**：
  - `snapshot-weekly-metrics.mjs` は既に `ga4_jp`（country=Japan）を併記する仕様（`metrics-reader.mjs` 内 `fetchGa4Weekly({ country: "Japan" })`）
  - `fetch-ga4-data.mjs`（アドホック取得）も既定で `country=Japan` + 参照スパムリスト除外を ON 化。実測値で `(direct)` 1,641 → 101、`bing` 1,293 → 252 と激減（過去 14 日）
  - `--include-all` フラグで bot 込みの生データに切替可能（bot 比率検証時に使用）
  - スパム参照リスト: `(not set)` / `ntp.msn.com` / `statics.teams.cdn.office.net` / `hustler.zenhp.co.jp` / `mobilesecurity.trendmicro.com`（`fetch-ga4-data.mjs` の `SPAM_REFERRAL_SOURCES`）
  - **bot 比率監査**: `npm run audit-ga4-bot-ratio` で source 別の海外比率を算出し、新規スパム候補を自動 surface（`audit-ga4-bot-ratio.mjs`）。週次サイクルで実行推奨

### GA4 プロパティ側で行う追加対策（推奨・未実施）

スクリプト側フィルタは fetch 時に弾くだけ。GA4 UI で見る数値も汚染されたままなので、プロパティ側で恒久対策する：

1. **不要な参照元のリスト**: 管理 → データストリーム → タグ設定の詳細 → 不要な参照のリスト
   - `mobilesecurity.trendmicro.com`、`hustler.zenhp.co.jp` 等を追加（参照ではなく direct 計上に降格、bot 流入の本質的な遮断にはならないが効果あり）
2. **データフィルタ（内部トラフィック）**: 管理 → データ設定 → データフィルタ → 内部トラフィック除外
   - 自分の作業 IP を除外
3. **既存のスパイクデータの遡及修正は不可**: GA4 はフィルタ適用日以降のみ対象。過去分析は本ファイルの incident 記録を参照して人間が割り引く

### 教訓

1. **「source 別 user 数」の単純な前週比だけでは bot/human を区別できない**。country × device × landing を最低限の判定ディメンションとして併用する
2. **日本語ニッチサイトで US が direct トップは即 bot 疑い**。地理的な需要分布と乖離する流入はまず計測ノイズと仮定する
3. **Cloudflare Bot Fight Mode は完全防御ではない**。Validator 系 UA は弾くが、direct 計上される自動化トラフィックは通過する。GA4 母数の Japan フィルタ運用が現実的な救済策
4. **「増えた = 良い」を起点に分析しない**。スパイクは「実ユーザー増」「bot 増」「計測バグ」「重複 utm」のどれかで、最頻値は後ろ 3 つ
5. **新たな計測ツール導入時（Bing Webmaster 等）は、最初に bot/human の比率を確認してから施策効果計測に進む**。計測ツール側の数字が「実ユーザー」基準になっていないと施策評価が成立しない

### 関連

- Issue [#172](https://github.com/uruhayato373/doboku-note/issues/172) - Bot inflation incident（追跡中）
- Issue [#173](https://github.com/uruhayato373/doboku-note/issues/173) - Bing Webmaster 運用追跡
- Umbrella [#82](https://github.com/uruhayato373/doboku-note/issues/82) - Weekly Metrics PDCA
- 2026-04-25 Cloudflare Bot incident（同根の可能性、本ファイル下方）

### 2026-07-01 フォローアップ（フィルタ後も bing 残留・回遊分析で再確認）

`ga4-source`（5/17・japanOnly＋スパム除外済）で **bing 252 users > google 77（3.3x）** が残存。フィルタで 1,293→252 に激減済みだが、**日本語土木試験サイトで bing>google の逆転は本 incident の署名のまま**。ただし残 252 は 5.36 ページ/session・493 秒・engagement 65% と **human 的挙動**で、単純 bot 署名（1ページ・0秒・直帰100%）ではない＝**「疑わしいが未確定」**。教訓#1 のとおり source 単独では判定不能。**次の CI/CD GA4 取得で bing × device × landing × 新規/再訪 を交差**して確定する（会社PC はプロキシで外部 API 不可＝CI/CD 供給待ち）。

**運用ルール（2026-07-01 確定）**: **GSC を Google 人間検索の真実源（下限）として扱う**。GA4-google（77/2週）≒ GSC(~5クリック/日×14) で両者は一致しており、GSC は汚染されない。GA4 の「organic 84%・低アクセスではない」は **bing 水増し込み**として割り引く。

## 2026-04-25: Cloudflare Bot 保護で外部 RSS/Atom Validator が 403

### 現象

Issue [#80](https://github.com/uruhayato373/doboku-note/issues/80)（RSS/Atom フィード生成）の本番デプロイ後、生成物の妥当性確認で外部 Validator がアクセス拒否された。

| 検証手段 | 結果 |
|---|---|
| `curl https://doboku-note.com/feed.xml`（UA: `curl/8.x.x`） | HTTP 200, well-formed RSS 2.0 |
| `curl https://doboku-note.com/atom.xml` | HTTP 200, well-formed Atom 1.0 |
| [W3C Feed Validation Service](https://validator.w3.org/feed/) | HTTP 403 Forbidden |
| [RSS Board Validator](https://www.rssboard.org/rss-validator/) | Cloudflare チャレンジページに到達 |

フィード XML 自体は技術的に正しく、Bot 保護がアクセスを阻害しているだけ。

### 根本原因

Cloudflare Pages の **Bot Fight Mode** が `Validator/*` 系の User-Agent を「不審なボット」と判定して 403 を返す。これは Cloudflare の Verified Bots（Googlebot / Feedly / Inoreader 等）以外を保護対象にする標準動作で、設定変更しない限り解消しない。

### 検出経緯（致命度: 低）

- デプロイ完了直後の検証ステップで即座に検出（curl 200 / Validator 403 の食い違い）
- 計測の「気づきの遅延」事象ではなく、**検証フェーズで前提が崩れた**ケース

### 影響範囲（同種で躓きうるケース）

Cloudflare Bot 保護下では以下も 403 になる可能性がある:

- Schema.org Validator / Google Rich Results Test（独自ボット側）
- OGP / Twitter Card Validator
- AMP Validator
- Ahrefs / SEMrush 等の独自クローラ（Verified Bot 登録のないもの）

逆に通る経路:

- `curl` / `wget` のデフォルト UA、ブラウザ
- Cloudflare Verified Bots 一覧（Googlebot / Bingbot / Feedly / Inoreader 等）
- `gh api`（GitHub の Verified UA）

### 適用した対策

- 本セッション内: Issue [#159](https://github.com/uruhayato373/doboku-note/issues/159) を fork して **WAF カスタムルールで Validator 系 UA をホワイトリスト** する案を起票（実利用者報告まで保留方針）
- フィード生成完了は #80 で close、**「外部 Validator 通過」は完了条件から外し** インフラ調整スコープに分離

### 教訓

1. **外部 Validator から本番 URL に到達できないことは「コンテンツが invalid」を意味しない**。フィード / 構造化データ / sitemap の妥当性は **ローカル検証**（`python xml.etree.ElementTree.parse()` 等）で先に確認する。外部 Validator は補助
2. **公開エンドポイント（feed.xml / sitemap.xml / robots.txt / OGP 画像）は 3 種類の到達性を意識する**: 人間ブラウザ・主要 Verified Bot・各種 Validator。Cloudflare Bot Fight Mode は 3 番目を弾く
3. **PR の完了条件に「外部 Validator 通過」を含めない**。代わりに「ローカル well-formed 検証」+「本番 curl 200 + body 検証」を完了条件にし、Validator はベストエフォート扱い
4. **計測 / 監視スクリプトが本番 URL を叩く設計のときは UA 偽装の必要性を検討**。Cloudflare 側の Verified Bot 一覧と照合して、自前ボットなら UA 偽装 or `User-Agent: Mozilla/5.0 ...` で回避可能

### 関連

- Issue [#80](https://github.com/uruhayato373/doboku-note/issues/80) - RSS/Atom フィード生成（close 済）
- Issue [#159](https://github.com/uruhayato373/doboku-note/issues/159) - Cloudflare Bot 保護調整（バックログ）
- PR [#158](https://github.com/uruhayato373/doboku-note/pull/158) - フィード実装（merged）
- `scripts/generate-rss.mjs` - フィード生成スクリプト

## 2026-W16: BAILOUT_TO_CLIENT_SIDE_RENDERING による 6 日間 GA4 完全欠損

### 現象

2026-04-05 〜 04-10 の 6 日間、GA4 Data API で `dimension=date` を取得すると当該 6 日の行が完全不在。週次集計では **W16（Apr 7-13）の Organic Search activeUsers が 113 → 27 と -76% 激減** として Issue #83 が自動起票された。

### 根本原因

2026-04-11 commit [`c6ef1148`](https://github.com/uruhayato373/doboku-note/commit/c6ef1148) で修正された `useSearchParams()` を含む `AnalyticsProvider` の構造問題。

- `AnalyticsProvider` が children ラッパーとして機能していたため、Next.js の `useSearchParams()` がすべての子ツリーを `BAILOUT_TO_CLIENT_SIDE_RENDERING` させていた
- 全 750+ ページが server render されず、HTML body に実コンテンツが欠落
- Google クローラーは空の HTML を受信 → de-indexing が進行
- 実訪問者ゼロ化 → GA4 データも当該期間ゼロ

Apr 5 の 144 ファイル H1 構造修正（commit [`3f97641b`](https://github.com/uruhayato373/doboku-note/commit/3f97641b)）と時期が重なり、Google 側の再評価で「中身のないページ」と判定された可能性が高い。

### 気づきの遅延理由（3 つの構造的欠陥）

| # | 欠陥 | 帰結 |
|---|---|---|
| 1 | **データ整合性チェックなし** | metrics-analyzer が週集計値の前週比のみ見る設計。日次 6 日欠損と低量を区別できず「-76% drop」として症状扱い |
| 2 | **日次スナップショット非運用** | 週次 snapshot（`2026-W16.json`）のみ。日次 raw（`ga4-date-*.json`）を分析対象にしていなかった |
| 3 | **サイト健全性監視なし** | GA4 fetch のみで、本番サイトの 2xx / SSR レンダリング監視なし。BAILOUT バグは別作業（SEO 改善）で偶然発覚 |

つまり計測サイクルは **「数字が取れた前提」で差分を見る設計**で、**「数字が正しく取れているか」を検証しない**盲点を抱えていた。

### 適用した対策（Issue [#130](https://github.com/uruhayato373/doboku-note/issues/130)）

| # | 対策 | 実装 |
|---|---|---|
| A | **data-integrity-gate** | `check-data-integrity.mjs` で GA4 date 欠損検知（直近 7 日で 2 日 / 14 日で 3 日以上 → auto Issue） |
| B | **daily-snapshot**（未実装） | 週次ではなく日次 anomaly 検知に拡張 |
| C | **uptime-ping** | 1 日 3 回 curl で SSR + 2xx + 主要キーワード body 含有を検証 |
| D | **crawl-stats-monitor**（未実装） | GSC Crawl Stats API を日次 fetch、5xx rate / coverage エラー急増検知 |
| E | **本ドキュメント** | 事故記録 + 教訓整理 |

### 教訓

1. **「数字がゼロ」は「実績ゼロ」ではなく「計測不可」の可能性を常に含む**。欠損と低量を区別できるガードを持つこと
2. **大規模な UI / SSR 構造変更の後は、必ず本番 HTML の body 非空を curl で確認する**。Lighthouse の Performance スコアだけでは捕捉できない
3. **自動生成された Issue のタイトル（「Traffic-Drop -76%」）を鵜呑みにしない**。症状と原因を分離する最初の一手は「期間内の日次データを sort して可視化」
4. **`useSearchParams()` はサーバーレンダリング境界を壊す**。Next.js 13+ では `Suspense` で明示的にラップする（詳細: [Next.js docs](https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering)）
5. **deploy の多発と安定性は反比例する**。W15-W16 期間 230 commits（うち `test`/`てｓｔ` 系 40+）の deploy 混乱は、原因を特定困難にした副次要因だった。「テスト用 commit は別 branch で」を徹底する（今回 develop 直 push 既定化の引き金の一つでもある）

### 関連

- Issue [#83](https://github.com/uruhayato373/doboku-note/issues/83) - Traffic-Drop 事案（close 済）
- Issue [#130](https://github.com/uruhayato373/doboku-note/issues/130) - 対策 Umbrella
- commit [`c6ef1148`](https://github.com/uruhayato373/doboku-note/commit/c6ef1148) - BAILOUT 修正
- `.claude/scripts/check-data-integrity.mjs` - データ整合性検証 lib
- `.github/workflows/uptime-ping.yml` - uptime 監視
