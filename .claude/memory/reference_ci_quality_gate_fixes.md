---
name: reference_ci_quality_gate_fixes
description: "CI・workflow の罠。quality:audit:ci 赤の修復(content-quality-ratchet/note-funnel)・WASM actionlint の plain scalar クラッシュ・scheduled workflow は main 版・素の npm ci は ERESOLVE(.npmrc 解消済み)・cta:pack-top lint 衝突は解消済み"
metadata:
  type: reference
---
`Pre-merge check` の `build` が赤い時、多くは `npm run quality:audit:ci` の個別チェック失敗。個別再現＝各 npm script を直接実行（`quality-audit.mjs` の `npm:` フィールド参照）。2026-07-23 に頻出2ゲートを修復した手順:

**content-quality-ratchet**（`check-content-quality:ci` = `lint-mdx-mobile.mjs --all --baseline --ci`）
- 新年度の過去問（例 r08-primary/secondary）が baseline 比で新規違反（1-3=4列表／3-1=入れ子リスト／15-3=300字超段落）を出す。
- **過去問データ表・模範解答の散文は全年度（h21〜r05）が既に baseline 受容済み**（r04-primary は 1-3:13）。≤3列へ崩すのは他年度と不整合＝**`node .claude/scripts/lint-mdx-mobile.mjs --all --update-baseline` で新年度も同様に受容**（差分は当該記事の数エントリのみのはず）。

**note-funnel**（`check-note-funnel` = `audit-note-funnel.mjs --ci`・source のみ）
- 公開記事(noteStatus:published)に冒頭/末尾 CTA 欠落＝D1。修復は `npm run wire-note-funnel-cta -- --exam <key> --apply`（先に `--apply` 無しで dry-run）。
- **罠**: wire-cta は既存の手書き「〜もくじ」ブロックを検知せず**重複追記する**→適用後に重複を目視除去して1本化する。
- checker(`check-note-magazine-cta`)は `<!-- cta:pack-top -->` 域の markdown リンクを**免除済み**なので §14-c は問題にならない。実際に pre-commit を止めるのは**模範解答本文の段落200字超（note-lint B5）**＝散文答案は仕様免除なので `SKIP_NOTE_PARA=1 git commit` で通す（[[feedback_essay_char_limit]]）。

**共有ワークツリーでの安全な実施**: origin/develop に隔離 worktree を切り、`ln -sfn <main>/node_modules` で script を回す→`quality:audit:ci` が pass N/fail 0 を確認→`git push origin HEAD:develop`（FF）。他セッションの未コミット変更を触らない。

**CTA のライブ反映**: `check-note-republish` は**CTA 変更を drift 除外**（本文drift=0のまま）＝ソースCTAは自動再公開されない。既存公開記事へライブ反映するなら `note-append-cta`（単一URLカード追記・別形式）だが、多リンク blockquote CTA は忠実再現できない→**記事側の次回 republish（note-update-body）に載せるのが本筋**。関連: [[reference_note_status_reconciler]] / [[reference_ci_quality_gate_fixes]] / [[reference_quality_audit_system]]

---

## 単一行 run: の「: 」で WASM actionlint がクラッシュ

`run: node x.mjs --body "復旧 run: $URL"` のように **plain scalar の中に `: `** があると YAML として不正で、`check-workflow-hygiene`（npm パッケージ `actionlint` の WASM）は違反を報告せず `unreachable` で落ちる。エラーは「actionlint が X.yml の検査中に停止」で、どの行かは出ない。

**見分け方:** 直前に自分が触った workflow で、`git show origin/develop:<file>` を同じ linter に通すと 0 violations なら自分の挿入分が原因。

**直し方:** `run: |` の block scalar にする（2026-09-18 に seo-rank-watch.yml で実発生）。関連: [[reference_quality_audit_system]]

---

## scheduled workflow はデフォルトブランチ(main)版で走る

GitHub Actions の **scheduled（cron）workflow はデフォルトブランチ = `main` の版で実行される**。このプロジェクトは develop に蓄積→main へ deploy する運用なので、`.github/workflows/*.yml`（fetch-metrics.yml 等）を develop でマージしても、**main へ deploy するまで週次 scheduled run には反映されない**。

- 例（2026-07-03）: crosswalk 配線（PR #348）を develop にマージしただけでは金曜の `fetch-metrics.yml`（cron `0 21 * * 4`）に載らず、`develop→main` を ff deploy して初めて反映された。
- 判定: `gh repo view --json defaultBranchRef` でデフォルトブランチ確認。main の workflow 内容は blob 経由で確認（`git ls-tree origin/main <path>` → `git cat-file blob <hash>`。Windows Git Bash では `git show origin/main:<path>` の `:` がパス変換で壊れるので blob 経由が確実）。
- 逆に `on: push`/`pull_request` トリガーの workflow はブランチ版で走るので deploy 不要。scheduled/`workflow_dispatch` 既定は main。
- **新規 workflow は develop 段階では手動実行すらできない**（2026-07-28 実測）: ファイルが既定ブランチに無いと `gh workflow run <name>.yml --ref develop` も `HTTP 404: not found on the default branch` になる。`--ref` を付けても既定ブランチにその workflow が存在することが前提。つまり「develop で dispatch して動作確認 → 問題なければ main へ」という順序は取れず、**main へマージしてから初めて検証できる**。未実証の前提（外部 API への到達性など）を含む workflow を入れるときは、マージ直後に手動実行して確認する手順を backlog へ残すこと。

関連: [[feedback_deploy_discipline]]（develop→main ff 昇格の安全手順）・[[feedback_metrics_cicd_supplied]]（計測は CI/CD 供給）。

---

## 依存ゼロのワークフローは npm パッケージを（間接にも）読めない
`indexnow-submit.yml`・`ops-audit.yml`・`gsc-auto-review.yml` は npm ci をしない（依存ゼロの前提）。2026-10-02 に台帳 `scripts/lib/datasets.mjs` が型のため zod を import し、台帳からパスを引くだけのスクリプトまで zod に依存した結果、indexnow-submit がデプロイのたびに `ERR_MODULE_NOT_FOUND` で落ちた（4 回。ops-audit は同日夜の実行で落ちるところだった）。
- **原因**: 200 近いファイルが読む lib に依存を足したとき、依存ゼロの呼び出し元を確かめなかった。自分の手の走査も YAML のコメント「npm ci しない」を「npm ci する」と誤って数えて見逃した
- **対策**: 台帳は依存ゼロ（型は名前で指し、検査は `scripts/lib/dataset-validate.mjs`）。`tests/workflow-zero-dependency.test.mjs` が YAML を解析し、npm ci 前に node で実行するスクリプトの import をたどって npm パッケージに届けば落とす
- **教訓**: 広く読まれる lib に import を足す前に、その lib を読むワークフローが依存を入れているかを見る。scheduled の YAML は main で動くので、直しても deploy まで本番の失敗は続く

## 素の npm ci は ERESOLVE（.npmrc で解消済み）

素の `npm ci` を実行すると ERESOLVE で失敗する。eslint@^10 と eslint-plugin-react@7.37.5（peer は eslint ^9.7 まで）が衝突するため。CI の workflow はすべて `npm ci --legacy-peer-deps` を明示している。

2026-09-24 に `.npmrc` へ `legacy-peer-deps=true` を足す PR #601 を develop にマージした。以降は素の `npm ci` で通る。`.npmrc` が消えていたら再発する。

**Why:** 2026-09-24 の git 同期（478 コミット）の後、素の `npm ci` を案内して失敗した。ERESOLVE は node_modules を消す前に止まるので実害は無いが、手戻りになった。

**How to apply:**
- 依存の入れ直しは素の `npm ci` でよい（main へ deploy される前の古いブランチでは `--legacy-peer-deps` を付ける）。
- 同期の後は `npm run refresh-indexes` も回す。gitignore 済みの doc-meta-index.json が古いと、pre-commit の check-category-curriculum が新規ガイドを「slug 不在」として落とす。
- refresh-indexes はタイムスタンプだけ変わった追跡ファイルを 5〜7 個出す。自分のコミットには含めない。

---

## 【解消済み 2026-09-22】cta:pack-top と note-lint §14-c の衝突

経緯: `note-funnel.json` の `topCta.text`（`cta:pack-top`）が markdown リンク形式で、「マガジン CTA は bare URL 単独行」（content-principles §14-c / `check-note-magazine-cta.mjs`）と衝突し、staged-gate 修正後に 53 本が編集ブロックされた。

**現在は解消**: `.claude/scripts/check-note-magazine-cta.mjs:21-26,73-80` が `<!-- cta:pack-top -->` / `<!-- cta:pack-top-light -->` ブロック内を免除（`inPackTop`）。2026-09-22 実測で `cta:pack-top` 224 本・`cta:pack-top-light` 3 本・`cta:*-mokuji` 875 本が check-note-funnel と pre-commit を全通過。

**How to apply:** この衝突を理由に作業を止めない。ただし**同一行に ¥ を書くと今も落ちる**（価格正本は `src/lib/note-magazines.ts`）。`cta:pack-top-light` は config に無い手書き 3 本で `wire-note-funnel-cta --sync-managed` では保守されない（手で直す）。関連 [[project_r8_yosou_full_matrix_2026_07]]
