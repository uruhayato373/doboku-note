---
name: google-search-growth
description: >
  GSC/GA4 の UI CSV（ページのインデックス登録・理由別。取得は土曜の Mac 収集）と既存 API データ
  （URL Inspection / GSC page×query / GA4 page）・sitemap・_redirects・生成 HTML を URL 単位で
  突合し、index coverage・検索 performance・技術 SEO を統合診断するオーケストレータ。修正候補は
  impact × confidence × effort で優先順位付けし、redirect 追加・noindex・統合・deploy は approval
  gate で停止する（内部リンクの旧 URL 修正のみ承認後に自動可）。セッションはログインせず、記録と
  最終取得日を読む。Use when user asks to [検索流入改善, GSC/GA4 統合診断, /google-search-growth].
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Task
domain: site
---

GSC/GA4 を横断して「どの URL が・なぜ検索に効いていないか」を突合し、修正候補を優先順位付けする
オーケストレータ。**修正・deploy へ進む承認ゲートがあるため Claude からの自動呼び出しは禁止**（ユーザーが
明示起動する）。UI CSV はセッションでは取りに行かず、土曜の Mac 収集（`weekly-collect` の gsc 段）が
取った記録を読む。実装・設計の真実源は
[docs/operations/gsc-ga4-playwright-automation-spec.md](../../../../docs/operations/gsc-ga4-playwright-automation-spec.md)。

## いつ使うか

- 毎月の検索流入健診（`/google-search-growth --scope monthly`）
- index 未登録・404・redirect・canonical 代替の棚卸しをして修正計画を作りたいとき
- GSC UI でしか出ない「理由別の例 URL」を API データと突合したいとき

> coverage 全体の ratio 診断は `/gsc-review`（`gsc-index-auditor`）、performance の CTR/rank 改善は
> `/weekly-improve`（`metrics-analyzer`）が別 SSOT。本スキルは UI CSV の記録 → 突合 → 修正計画に特化し、
> 記録の確認後にそれらの Evaluator を並列で束ねて統合する。

## 前提と安全弁

- **セッションはログインしない・ブラウザを開かない。** UI CSV の取得は土曜の Mac 収集（`weekly-collect` の gsc 段。profile は `<auth root>/profiles/playwright-google-profile/`）だけが行う。CI もログインしない。
- ログイン・2FA・CAPTCHA は**運営者**が `npm run auth:login -- --service google` で行う（自動突破しない）。
- 対象は `sc-domain:doboku-note.com` / GA4 `419382901`。不一致なら停止。
- **外部状態を変える操作（検証開始・インデックス登録リクエスト・設定保存）は実行しない**。
- 自動変更は「内部リンクの旧 URL 修正」まで。redirect 追加 / noindex / 統合 / 削除 / deploy /
  git commit は **approval gate** で停止し、人間の明示承認を待つ。
- report-search-growth はオフライン join（既存 state を読むだけ）。GSC UI 未取得でも URL Inspection
  ベースで診断できる。

## 引数

- `--scope monthly`（既定・全 issue×両スコープを取得して突合）
- `--scope gsc-ui-only`（取得済み記録の確認のみ・分析まで進めない）
- `--scope analyze-only`（記録の確認を飛ばして既存 state で report のみ再生成）
- `--issues crawledNotIndexed,redirect,notFound`（issue 限定）

## フェーズ

1. **preflight**
   - `git branch --show-current` と `git status`（並行セッションの巻き込み防止・自分の変更のみ commit）
   - GSC のプロパティ（`scripts/lib/site-identity.mjs` の `GSC_PROPERTY`）を確認
   - `data/{gsc,ga4}/reports/・data/gsc/url-inspection/` の最新スナップショット日付を確認
   - `npm run check-gsc-ui-due` で **前回が完全だったか**を確認（`lastAttempt.complete !== true` なら再取得が必要）
   - `npm run check-ga4-dimensions` で GA4 設定ドリフトを確認（blocking な未登録があれば手順 7 へ）
   - `analyze-only` なら 2〜4 を飛ばして 5 へ（正規化済みの記録があるとき）

2. **read**（取得済みの記録を読む。ブラウザは開かない）
   - `gsc-ui/last-run.json` と `data/gsc/ui-urls.json` の**最終取得日**（`lastComplete`）を確認し、報告の冒頭に書く
   - 最終取得日が古い（`npm run check-gsc-ui-due` が DUE）、または `lastAttempt.complete !== true` なら、数値を埋めず
     **「未取得」**と書く。取り直しは次の土曜の Mac 収集を待つか、運営者が収集用 worktree
     （`.claude/worktrees/weekly-collect`）の端末で `node scripts/weekly-collect.mjs --only gsc` を実行する
   - 未ログインで取得が失敗していた場合は、運営者に `npm run auth:login -- --service google` を依頼する（セッションからは入らない）
   - GA4 は API 優先（`data/ga4/reports/`）。UI CSV が要るときも同じく記録を読む

3. **validate**（`gsc-csv-auditor` を起動）
   - raw CSV / manifest / 行数 / sha256 / truncation / rejects / 重複 / 前回差分を PASS/WARN/FAIL 判定
   - FAIL（sha256 不一致・全 download 失敗等）なら再取得を促し、join へ進めない

4. **normalize**（決定的スクリプト）
   - 土曜の収集が取得と正規化まで済ませ、追跡 SSOT（`gsc-ui/ssot/`）を develop へ push 済み。raw CSV（gitignore）がこの checkout に無いときは、追跡 SSOT で 3〜4 の整合だけ確かめ、取り直さない
   - `npm run google-console:normalize`（既定で最新 run。raw/manifest は不変）
   - run 配下の共通 JSON に加えて **追跡 SSOT** を更新する: `data/gsc/ui-urls.json`・`ui-history.json`・`ssot/diff/<runId>.json`
   - downloaded が 0 件なら exit 1（正規化不成立）。取得をやり直す
   - `npm run check-google-ui-ssot` で marker ↔ history ↔ urls の整合を確認

5. **join**（決定的スクリプト）
   - `npm run search-growth:report`（GSC UI 正規化 ∪ URL Inspection を universe に、sitemap/_redirects/
     out HTML/GSC page/GA4 page を突合 → URL 分類）
   - 生成: `.claude/state/improvements/search-growth-<run>.json` と `search-growth-latest.md`

5.5 **介入候補の抽出（crawled-not-indexed）**
   - `npm run gsc-indexing:check -- --from-ssot --category <cat> --group <group>` で診断（読み取りのみ）
   - `crawl=true` / `index=true` なのに `not-indexed` なら技術的阻害ゼロ＝Google の選別。残るレバーは
     インデックス登録リクエスト（`npm run gsc-indexing:request -- … --limit 10`・外向き操作なので gate 済み）
   - **実行したら `/nsm-experiment start` で台帳に載せる**（baseline と next_check_date を入れる）。
     載せないと再計測されず学びが残らない（`check-experiment-due` が期限を surface する）
   - 期待値の出し方: 同 group の登録済みページの「1 本あたり表示」× 未登録本数。件数の多さで選ばない。型ごとの登録済み平均表示と未登録率は `data/gsc/indexing-priority.json` の `types[]` にあるので、手計算の前に参照する（毎日の送信順もこの期待値順）
     （2026-07-30 実測では textbook 20 本＝期待 +264 が keyword 190 本＝+180 を上回った）

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

取得（土曜の収集の gsc 段、または運営者の `--only gsc`）が UI 変更で失敗したときに、運営者または修正担当が使う。
`.claude/skills/management/google-search-growth/references/recovery.md` を参照。
`.local/playwright-google-debug/<run>/` の screenshot / page.html / visible-text / failure.json から
UI 変更点を特定し、role/label/text ベースで selector を更新して `--dry-run` で一意性だけ再検証する。

## 参照

- 実装指示書: `docs/operations/gsc-ga4-playwright-automation-spec.md`
- CSV schema: `references/csv-schema.md`
- 復旧手順: `references/recovery.md`
- GSC 管理 SSOT: `.claude/knowledge/reference/gsc-management.md`
- Playwright 認証: `.claude/knowledge/reference/playwright-auth-profiles.md`
- 計測の原則: `.claude/knowledge/reference/measurement-incidents.md`（CI 供給が正・外部検証の罠）
