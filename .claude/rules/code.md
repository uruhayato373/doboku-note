---
paths:
  - "src/**"
  - "scripts/**"
  - ".claude/scripts/**"
  - "tools/**"
  - "tests/**"
  - "package.json"
  - ".github/workflows/**"
---

# コード・スクリプト・CI を変更するときの規約

## UI コンポーネント（CLAUDE.md §7 の詳細）

- デザイントークンを使う（`rounded-card-*` / `shadow-card-*`）。`dark:border-*` を必ず書く。インライン `borderColor` 禁止。色は `brand` / `ink-strong` / `ink-body` / `ink-muted` / `positive` / `warn` / `danger`（真実源: `src/styles/globals.css` の `--color-*`）
- トークン体系は二系統: editorial `--accent/--paper/--ink/--rule`＝ページ/prose、`--color-*`＝SVG 図版＋Tailwind semantic。レイアウト体系（PageShell/PageHeader/SectionCard）・記事 prose・禁止パターンは [design-system.md](../knowledge/design-system/design-system.md)。自己点検は `node scripts/lint-ui.mjs`、合否は `/design-review`（`page-design-builder` は自分で合格と言わない）
- `next/font` は render-blocking、`next/dynamic` を RSC に使うと LCP 悪化。metadata の title template は自動付与（個別に suffix を含めると重複）。計測ピクセル `<img>` は `suppressHydrationWarning` 必須。Tailwind の `content` に無いファイルのクラスは生成されない
- **この Next.js は学習データと違う**。書く前に `node_modules/next/dist/docs/` の該当ガイドを読む（CLAUDE.md 末尾ブロック）

## 検査スクリプトを書くとき（CLAUDE.md §9「検査ゼロを PASS と呼ばない」の実装側）

- 検査対象数と実検査数を必ず出力する／取得失敗が支配的なら exit 1（「検査不成立」。接続不能は exit 2 で本番異常と分ける＝`check-production-ssr` の形）／ファイル判定はパス全体でなく**ファイル名**で行う（`join()` は Windows で `\` を返す）／note 記事の走査は `/^article(-[^/\\]+)?\.md$/`／外部取得は `fetch` でなく `curl --ssl-no-revoke`（[measurement-incidents.md](../knowledge/reference/measurement-incidents.md)）
- **実行系も同じ**: 「対象 0 件で何もしなかった」と「全部失敗して何もできなかった」を区別して出力し、`skip` を無言で積み上げて最後に「全て in-sync」と言わない。2026-07-28 に 5 スクリプトが同時にこの状態だった（経緯は measurement-incidents.md「2026-07-28」）
- **赤いのに誰も見ていない検査は無いのと同じ**: `scripts/quality-audit.mjs` の検査は `ci: true`（ゲート＝赤落ち）と `ci: false`（report＝報告のみ）に分かれ、report は落ちても CI が緑のまま通る。`note-meta-lint` は Node 22+ の `glob` を import して Node 20 で起動即クラッシュし、report 扱いのため 3 週間 1 件も検査していなかった。**新規検査を report で追加するときは「誰がいつ読むか」を `note:` に書く**。読む人がいないなら `ci:true` にするか、作らない
- **検出器そのものが無い領域が最も危険**: `report-monetization-coverage` は import 破損で 6 週間実行不能だったが quality-audit に未登録で、週次レビューは古い集計を貼り続けた。週次・月次が読むデータを生成するスクリプトは `--check` モード（成果物を書かずに完走だけ確認）を設けて CI で担保する
- 汎用の「必ず検証」「ダブルチェック」を足さない。書いてよいのは**決定的ゲート**＝実行するコマンドと合格条件が特定できるものだけ。自分の誤りを直したときも、コマンドと合格条件が特定できるときだけゲート化する（回帰テスト付き）
- `console.log` 直後の `process.exit` はパイプで出力を捨てる（`--json` が途中で切れる）。`tsc` は `.claude/scripts/**` を見ないので壊れ import は `git grep` で全域を見る。デッドコード監査は `npm run knip`（grep で裏取り）。`pgrep -f` の待機ループは自分のシェルに一致して永久化する
- ルーティング・パース・リトライ・ステータス処理はコードで決める（サブエージェントに委ねない）。同じ判定を複数箇所に実装しない＝lib に集約する（例: 予定の集約は `scripts/lib/schedule-events.mjs` が唯一の実装、ASP のサイト帰属判定は `scripts/lib/asp-site-guard.mjs`）
- 新しい script を足したら `package.json` の scripts と [commands.md](../knowledge/reference/commands.md) に用途と罠を 1 行書き、`quality-audit.mjs` に登録するか「誰が読むか」を決める（`npm run check-command-guidance` が案内の実在を検査し、`check-doc-sync.sh` が新規追加時に配線と `/doc-sync` を促す）

## ドキュメント同期プロトコル（CLAUDE.md §8）

- `src/**` `scripts/**` `.claude/skills/**` `.claude/agents/**` `package.json` `src/config/**` `src/styles/**` 等「ドキュメント化された面」を変更したタスクは、**コミット前に `/doc-sync` を 1 回回す**（変更 diff × 候補 doc を `doc-sync-auditor` で突合し、prose・表・コマンド・件数・閾値の旧仕様化を検出→適用）。`check-doc-refs` / `check-doc-coupling`（機械）が拾えない陳腐化を埋める。純コンテンツ編集では回さない
- doc を移動・改名したら参照を同一 commit で全更新（`npm run check-doc-refs`・`npm run check-relative-links`）

## 管理画面・データ・CI

- `tools/admin-app/`（`npm run admin`・`http://127.0.0.1:3021`・RSC ファースト・ルート node_modules 再利用・dev 専用でビルド/デプロイなし・投稿は既存 CLI を child_process 実行しガードは CLI 側） → [tools/admin-app/README.md](../../tools/admin-app/README.md)。E2E は `npm run test:e2e:admin`（CI の e2e には載せない）。サイトの E2E は `npm run serve`（3025）を既定ターゲットにし、叩く URL は `npm run check-e2e-targets` で out/ に実在させる
- DB は導入しない（D1 不採用・frontmatter + build-time JSON 継続・再検討トリガー） → [data-storage-decision.md](../knowledge/reference/data-storage-decision.md)
- `notebooklm` CLI のクセ → [notebooklm-cli-gotchas.md](../knowledge/reference/notebooklm-cli-gotchas.md)。Playwright 認証プロファイル → [playwright-auth-profiles.md](../knowledge/reference/playwright-auth-profiles.md)
- CI/CD の Secrets・破壊操作の権限設計 → [ci-cd-security-hardening.md](../knowledge/reference/ci-cd-security-hardening.md)。workflow は full clone 禁止（`npm run check-workflow-clone-depth`）・actionlint/permissions/timeout/SHA 固定（`npm run check-workflow-hygiene`）。自動化の失敗・沈黙は `scripts/report-automation-failure.mjs` で `automation-failure` Issue に記録（GitHub Issue の唯一の例外）
- 計測は CI/CD 供給が正・ローカル creds 不要（会社 PC はプロキシで外部 API 遮断）。PSI は field(CrUX) で実害判定・lab 単発で CRITICAL を立てない → measurement-incidents.md
- `npm ci` は ERESOLVE で失敗する。復元は `npm install --legacy-peer-deps`（node_modules 不在だと pre-commit も落ちる）
