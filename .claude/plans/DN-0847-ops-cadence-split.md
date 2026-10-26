---
taskId: DN-0847
type: implementation-plan
createdAt: 2026-10-25
deleteOnComplete: true
---

# 点検の置き場を「入力が変わる頻度」と「直す人」で分け直す（DN-0847）

バックログ: [DN-0847](../todo/backlog.md)。完了したら削除する。

## Context

- 日次の ops-audit（`quality-audit.mjs --ops`・26 本）の多くは、土曜の Mac の収集（weekly-collect）が週 1 回だけ書くデータの鮮度と検算を見ている。土曜に 1 段落ちると、日曜から金曜まで同じ赤が毎朝出る。直せるのはログインできる土曜の Mac だけ。2026-10-25 時点で sales-freshness・kdp-report-freshness・weekly-collect が赤。
- note-live-audit（CI・毎週月曜）は 1 回 40 分で、19 回中 13 回が赤。直すにはログインが要るのに、検出は月曜、修復は土曜で、間が 5 日空く。
- 運営者の決定（2026-10-25）: この設計で実装まで進める。

## 置き場を決める 3 つの問い

1. ログインが要るか → 要るなら土曜の Mac。
2. 入力が変わる頻度と、壊れてから実害が出るまでの日数 → 週 1 回しか変わらない入力を毎日見ない。
3. 赤を見て誰が・いつ直すか → 直すのが土曜の運営者なら、土曜のレビューで見せる。

## 配置

| 区分 | quality-audit の定義 | 回す場所 | 点検 |
|---|---|---|---|
| 毎日の見張り | `ops: true`（cadence なし） | ops-audit.yml（日次）→ Issue channel ops | note-delivery-due・membership-drip・affiliate-placements-upcoming・registry-due・video-publication-freshness・cloudflare-metrics-freshness・gsc-sitemaps-due・weekly-collect（死活だけ） |
| 収集の検算 | `ops: true, cadence: 'collect'` | weekly-collect の段の `verify`（取った直後・取る月が無い週も回す）→ 段の合否・runs.json・Issue channel weekly-collect | a8-report-due（a8）・kdp-report-freshness（kdp）・sales-freshness（note-sales）・coconala-analytics（coconala）・gsc-ui-due と gsc-indexing-due（gsc）・note-sync-freshness（note-sync） |
| 週次の点検 | `ops: true, cadence: 'weekly'` | `npm run quality:audit:weekly`（`quality-audit.mjs --weekly`）を review-wiring の weekly.checks に載せ、下書き（review-checks）とレビューが読む | competitor-scan-due・monthly-review-due・egov-drift・coconala-live・search-triage・ga4-dimensions・codex-compat・review-wiring・x-review・x-card-render・knip-ratchet |
| CI の定期実行 | — | GitHub Actions | cloudflare-metrics（毎日・そのまま）・cloudflare-config-audit（金曜 22:47 JST へ移す。土曜のレビューが新しい結果を読む） |
| 土曜の前段へ移す | — | weekly-collect の段 `note-audit`（pre・ブラウザ不要） | note-live-audit.yml の検査 9 本・snapshot（note.status・note.magazines）・題名と価格のずれの印。前段なのでその日のレビューが読み、印は同じ日の後段の note-sync が直す |

提案時は `--weekly` と note-live-audit を「後段」と書いたが、後段はレビューの後に回るので、その日のレビューが読めない。どちらもレビューの前（前段・下書き）に置く。

## 変更

1. **quality-audit.mjs**: `cadence`（`'weekly' | 'collect'`）を足す。`--ops` は cadence の無い ops だけ、`--weekly` は cadence weekly だけ。collect はどちらでも回さない（段の verify が回す）。`selectsCheck` に weekly モード、`--weekly` の排他・検査ゼロのガード。`package.json` に `quality:audit:weekly`、`check-execution.mjs` の集約扱いに `quality:audit:weekly`。
2. **weekly-collect-plan.mjs**: 段に `verify`（quality-audit の cadence collect の点検 id。コマンドは quality-audit の定義から引く）と `addPaths` を足す。verify は skip の段でも回し、落ちたら段を failed（理由は「検算: …」）。段 `note-audit` を pre に足す（各検査の指摘は warn、検査不成立は failed）。複数コマンドの段の理由は落ちたコマンドを全部並べる。
3. **weekly-collect.mjs**:
   - commit の対象に段の `addPaths` を足す（note-audit の content/note・config/products.json・src/lib/note-magazines.ts）。
   - `--verify-last` は段ごとに一番新しい結果で判定する（`--only` の取り直しも数える）。`--alive` は直近の pre と post の日付だけを見る（日次の ops 用 `check-weekly-collect:alive`）。
   - `--only` の後、段ごとの最新がすべて合格なら Issue channel weekly-collect を自動で閉じる。
4. **note-live-audit.yml を削除**。workflow-health.json・automations.json・check-automations・管理画面・スクリプトの注記を追随させる。定期実行は main の YAML で動くので、deploy まで月曜に動き続ける（scripts は残るので壊れず、snapshot が 10/31 まで切れない）。10/31 に note-audit が通ったら `gh workflow disable note-live-audit.yml` で止め、Issue #1006 を閉じる。
5. **cloudflare-config-audit.yml** の cron を金曜 22:47 JST（`47 13 * * 5`）へ。main へ deploy されるまで旧時刻で動く。
6. **review-wiring.json・weekly-review SKILL**: weekly.checks と inputs に `quality:audit:weekly` を足す。
7. **ops-audit.yml** の Issue 本文: 鮮度の赤の案内を「収集の検算は weekly-collect の Issue」に直す。
8. **テスト**: quality-audit-ops-tier（区分の排他・collect の点検が段の verify から実際に呼ばれる・weekly が wiring に載る）、weekly-collect-plan（verify・段ごとの最新・死活）、check-automations。
9. **文書**: commands.md・workflows.md・note 関連 reference・information-architecture.md など。`/doc-sync`（doc-sync-auditor）で突き合わせる。

## 確認

- `npm test`・`npm run quality:audit:ci`・`npm run check-automations`・`npm run check-review-wiring` が緑。
- `node scripts/quality-audit.mjs --ops` が毎日の 8 本だけを回す。`npm run quality:audit:weekly` が週次の 11 本を回す。
- `node scripts/weekly-collect.mjs --plan --json` に note-audit と各段の verify が出る。
- `node scripts/weekly-collect.mjs --verify-last` が段ごとの最新で判定し、10/24 の note-traffic の取り直しを合格に数える。
- 10/31 の後: `gh workflow list --all` で note-live-audit が無効。
- 10/31（土）の自動実行で、前段の note-audit と各段の verify が回り、下書きに quality:audit:weekly が出る（DN-0817 の通しの確認と同じ回）。

## 戻し方

- `gh workflow enable note-live-audit.yml`（ファイルは git の履歴から戻す）。quality-audit の cadence を消せば、全部が日次の ops へ戻る。
