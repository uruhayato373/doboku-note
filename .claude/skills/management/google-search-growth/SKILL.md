---
name: google-search-growth
description: >
  GSC/GA4 の Playwright UI CSV 取得（ページのインデックス登録・理由別）と既存 API データ
  （URL Inspection / GSC page×query / GA4 page）・sitemap・_redirects・生成 HTML を URL 単位で
  突合し、index coverage・検索 performance・技術 SEO を統合診断するオーケストレータ。修正候補は
  impact × confidence × effort で優先順位付けし、redirect 追加・noindex・統合・deploy は approval
  gate で停止する（内部リンクの旧 URL 修正のみ承認後に自動可）。Playwright はローカル専用・ログイン
  /2FA/CAPTCHA は人間。Use when user asks to [検索流入改善, GSC/GA4 統合診断, /google-search-growth].
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Task
---

GSC/GA4 を横断して「どの URL が・なぜ検索に効いていないか」を突合し、修正候補を優先順位付けする
オーケストレータ。**副作用（ブラウザ操作）があるため Claude からの自動呼び出しは禁止**（ユーザーが
明示起動する）。実装・設計の真実源は
[docs/project/04_運営/gsc-ga4-playwright-automation-spec.md](../../../../docs/project/04_運営/gsc-ga4-playwright-automation-spec.md)。

## いつ使うか

- 毎月の検索流入健診（`/google-search-growth --scope monthly`）
- index 未登録・404・redirect・canonical 代替の棚卸しをして修正計画を作りたいとき
- GSC UI でしか出ない「理由別の例 URL」を API データと突合したいとき

> coverage 全体の ratio 診断は `/gsc-review`（`gsc-index-auditor`）、performance の CTR/rank 改善は
> `/weekly-improve`（`metrics-analyzer`）が別 SSOT。本スキルは UI CSV 取得 → 突合 → 修正計画に特化し、
> 収集後にそれらの Evaluator を並列で束ねて統合する。

## 前提と安全弁

- **Playwright はローカル専用**（`.local/playwright-google-profile/`・gitignore 済み）。CI では使わない。
- ログイン・2FA・CAPTCHA は**人間**が headed ブラウザで完了する（自動突破しない）。
- 対象は `sc-domain:doboku-note.com` / GA4 `419382901`。不一致なら停止。
- **外部状態を変える操作（検証開始・インデックス登録リクエスト・設定保存）は実行しない**。
- 自動変更は「内部リンクの旧 URL 修正」まで。redirect 追加 / noindex / 統合 / 削除 / deploy /
  git commit は **approval gate** で停止し、人間の明示承認を待つ。
- report-search-growth はオフライン join（既存 state を読むだけ）。GSC UI 未取得でも URL Inspection
  ベースで診断できる。

## 引数

- `--scope monthly`（既定・全 issue×両スコープを取得して突合）
- `--scope gsc-ui-only`（収集のみ・分析まで進めない）
- `--scope analyze-only`（収集せず既存 state で report のみ再生成）
- `--issues crawledNotIndexed,redirect,notFound`（issue 限定）
- `--dry-run`（DOM 検出のみ・ダウンロードしない）

## フェーズ

1. **preflight**
   - `git branch --show-current` と `git status`（並行セッションの巻き込み防止・自分の変更のみ commit）
   - `.claude/config/google-console-automation.json` の property を確認
   - `.claude/state/metrics/{gsc,ga4,url-inspection}/` の最新スナップショット日付を確認
   - `npm run check-gsc-ui-due` で **前回が完全だったか**を確認（`lastAttempt.complete !== true` なら再取得が必要）
   - `npm run check-ga4-dimensions` で GA4 設定ドリフトを確認（blocking な未登録があれば手順 7 へ）
   - `analyze-only` なら 2〜4 を飛ばして 5 へ

2. **collect**（`gsc-browser-collector` を起動）
   - まず `npm run gsc-ui:fetch -- --dry-run` で property / Page indexing 到達 / 各 issue 行 /
     export ボタン / CSV メニューの検出可否を確認
   - **未ログインなら** `npm run google-console:login` を人間に依頼して停止（ログイン後に再開）
   - **UI 変更で dry-run が失敗したら** `.local/playwright-google-debug/<run>/` を根拠に selector を
     更新（推測クリック禁止）。ダウンロードや外部状態変更はまだしない
   - dry-run OK なら本取得: `npm run gsc-ui:fetch -- --issues <keys>`（両スコープ）
   - **exit code を見る**: 0=完全 / 2=不完全（部分成功・全ゼロ）/ 3=未ログイン / 5=property 不一致 / 6=レポート到達不能。
     2 のときは `zeroUnits`（正常なゼロ）と `failedUnits`（実失敗）を出力で区別する。`suspiciousScopes` が出たら UI 変更を疑う
   - GA4 は API 優先。UI CSV が要るときのみ `npm run ga4-ui:fetch`

3. **validate**（`gsc-csv-auditor` を起動）
   - raw CSV / manifest / 行数 / sha256 / truncation / rejects / 重複 / 前回差分を PASS/WARN/FAIL 判定
   - FAIL（sha256 不一致・全 download 失敗等）なら再取得を促し、join へ進めない

4. **normalize**（決定的スクリプト）
   - `npm run google-console:normalize`（既定で最新 run。raw/manifest は不変）
   - run 配下の共通 JSON に加えて **追跡 SSOT** を更新する: `gsc-ui/ssot/urls/*.json`・`ssot/history.json`・`ssot/diff/<runId>.json`
   - downloaded が 0 件なら exit 1（正規化不成立）。取得をやり直す
   - `npm run check-google-ui-ssot` で marker ↔ history ↔ urls の整合を確認

5. **join**（決定的スクリプト）
   - `npm run search-growth:report`（GSC UI 正規化 ∪ URL Inspection を universe に、sitemap/_redirects/
     out HTML/GSC page/GA4 page を突合 → URL 分類）
   - 生成: `.claude/state/improvements/search-growth-<run>.json` と `search-growth-latest.md`

6. **evaluate**（Evaluator を並列起動）
   - `seo-fix-planner`（URL 分類の意味補正・優先順位）
   - `gsc-index-auditor`（coverage ratio・原因バケット）
   - `metrics-analyzer`（performance パターン）
   - `technical-seo-auditor`（build SEO・canonical/sitemap hygiene）
   - 収集/品質が済んでから、可能な範囲で並列で呼ぶ

7. **integrate**（親 Claude）
   - 4 Evaluator + report を **1 つの優先順位表**へ統合（重複排除・矛盾解消）

8. **approval gate**（停止して報告）
   - 下記を提示して **停止**。ユーザーの明示承認なしに修正・deploy へ進まない
     - 理由別の画面総数 / CSV 行数 / truncation / 前月差分
     - action 別件数（FIX_TECHNICAL / REDIRECT_LEGACY / KEEP_MONITOR / CONSOLIDATE_CANDIDATE /
       NOINDEX_CANDIDATE / EXPECTED_EXCLUSION / UNKNOWN_REVIEW）
     - 優先修正 Top20（URL・根拠・変更予定ファイル・外部状態変更の有無）

9. **apply（承認された対象のみ）**
   - 承認された「内部リンクの旧 URL 修正」だけを外科的に適用（`git add` は触ったファイルのみ）
   - redirect 追加 / noindex / 統合は、承認後に該当 Generator or 人間が別途実施

10. **finalize（継続運用）**
    - **観測・判断ログ追記**: `.claude/knowledge/reference/gsc-management.md` の「観測・判断ログ」へ、当月の理由別件数・
      前月差分・決めた打ち手を 1 エントリ追記（`/gsc-review` と同じ append-only ログ＝月次で「何を見つけ→
      直し→効いたか」を追跡し continuity を担保）。数値は当該 run の manifest / report を引用。
    - マーカーは fetch が `gsc-ui/last-run.json` に自動更新済み（`check-gsc-ui-due` が次月の期限を surface）。
    - 修正を適用した場合のみ `npm run build`（or `check-seo-build`）・SEO 監査
    - 大きな設計変更時のみ `docs/handoffs/` に実施ログ（extract→削除の原則）

## 復旧（UI 変更時）

`.claude/skills/management/google-search-growth/references/recovery.md` を参照。
`.local/playwright-google-debug/<run>/` の screenshot / page.html / visible-text / failure.json から
UI 変更点を特定し、role/label/text ベースで selector を更新して `--dry-run` で一意性だけ再検証する。

## 参照

- 実装指示書: `docs/project/04_運営/gsc-ga4-playwright-automation-spec.md`
- CSV schema: `references/csv-schema.md`
- 復旧手順: `references/recovery.md`
- GSC 管理 SSOT: `.claude/knowledge/reference/gsc-management.md`
- Playwright 認証: `.claude/knowledge/reference/playwright-auth-profiles.md`
- 計測の原則: `.claude/knowledge/reference/measurement-incidents.md`（CI 供給が正・外部検証の罠）
