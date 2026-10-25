---
taskId: DN-0852
type: implementation-plan
createdAt: 2026-10-26
deleteOnComplete: true
---

# note の公開画面の撮影と競合の公開データを CI から土曜の Mac の収集へ移す（DN-0852）

バックログ: [DN-0852](../todo/backlog.md)。完了したら削除する。

## Context

- 運営者（2026-10-26）：「CI のうち週次に回せるものがもっとあるのでは」。CI 23 本を起動条件・鍵・読み手で見直し、運営者が下の 2 本を土曜の流れへ移すと決めた。
- **note-public-view.yml**（月曜 8:15・約 20 分・鍵なし）
  - 公開 API とブラウザで未ログインの見え方を検査し、代表ページを画面幅ごとに撮って成果物（artifact）に残す。
  - 読み手は週次レビューだけ。土曜のレビューは `fetch-note-public-view-shots` で 5 日前の run の成果物を取り寄せている。
- **competitor-scan.yml**（1/4/7/10 月 1 日・約 10 分・鍵なし）
  - note とココナラの競合の公開データを取り、`data/` へ書く。
  - 読み手は `competitor-scan-due`（週次の点検）と管理画面 `/strategy/competitors`。
- 残りの 21 本は CI に残す（PR・デプロイの関門と連鎖、毎日見るもの、API の鍵が要る計測、手で動かす道具、Mac を見張る側）。

## 変更

1. **土曜の収集の段を 2 つ足す**（`scripts/lib/weekly-collect-plan.mjs`）
   - `note-public-view`（前段・毎週・45 分）
     - `check-note-public-view.mjs --review --out <撮影の置き場>/report.json --shot-dir <撮影の置き場>`。
     - 指摘（exit 1）は warn、検査不成立（「検査不成立」の出力・撮影の欠け）は failed。
     - 撮影の置き場は Mac の手元の 1 か所（`~/Library/Caches/doboku-note/note-public-view`）。収集とレビューは別の worktree で動くので、`.tmp/` には置かない。置き場の定数は `scripts/lib/note-public-view.mjs` に 1 つだけ持つ。
   - `competitors`（前段・四半期の最初の土曜だけ）
     - note とココナラの最新の取得日が、今の四半期の初日より前なら回す（純関数 `competitorsDue`。日付は `weekly-collect.mjs` が台帳から引いて渡す・kdp と同じ形）。
     - `scout-note-competitors` → `coconala-research --refresh --details 0` → `scout-coconala-competitors`。ココナラの 2 本は手元の永続 profile を使うので `browser: true`。
   - テスト：段の表・`competitorsDue` の境界（四半期の初日の前後・取得なし）。
2. **`fetch-note-public-view-shots.mjs`** を、GitHub の run の成果物ではなく手元の撮影の置き場から読む形にする。
   - `.tmp/note-public-view-review/<撮影日>/` へ写す。出力の形（`--json` の coverage など）と、欠け・古さで exit 2 は保つ。
   - 撮影が 8 日より古ければ「未確認」。
3. **workflow を外す**
   - `note-public-view.yml`・`competitor-scan.yml` を削除する。
   - main の定期実行はマージの時に `gh workflow disable` で止める。土曜の段が入る前に止めて空白の週を作らないため。
   - 台帳 `config/automations.json` の 2 行を消し、土曜の行の目的・読み手を足す。`config/workflow-health.json` の note-public-view の行を消す。
4. **案内の更新**
   - weekly-review の SKILL・`check-competitor-scan-due` の案内・`quality-audit` の note・competitor-review の SKILL。
   - commands.md・例外台帳の `_doc`・lib の注記。
   - `report-competitor-watch`・`check-note-attachments` の注記。
5. **確認**
   - `npm test`・`npm run quality:audit:ci`・`npm run check-automations`
   - `node scripts/weekly-collect.mjs --plan --json` に 2 段が出ること
   - 管理画面 `/ops/mac` の収集の段に出ること
   - 10/31（土）の自動実行で `note-public-view` の段が ok か warn になること（残作業）
