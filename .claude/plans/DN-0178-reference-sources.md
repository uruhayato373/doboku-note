---
taskId: DN-0178
type: implementation-plan
createdAt: 2026-09-06
deleteOnComplete: true
---

# 参考文献の共通ルール（原本 → 文字起こし → コンテンツ化）— 残作業の実装指示書

## 目的

参考文献を「誰の著作物で、何をしてよいか」で区分し、原本 → 文字起こし → 記事の鎖を機械で追えるようにする。
置き場（Drive vault）は 2026-09-05〜06 に機械化済み。今回は**中身の扱い**（逐語可否・図の流用・出典の粒度）と
**記事から原本への結線**を SSOT 化し、検査で守る。

## SSOT

- 機械可読: `.claude/config/reference-sources.json`（**作成済み・commit b12a34d29**）
- 判定ロジック: `scripts/lib/reference-sources.mjs`（**作成済み**）
- 本文: `.claude/knowledge/reference/reference-sources-policy.md`（**未作成・Phase 4 で作る**）
- 置き場の SSOT は別（`asset-storage-policy.md` §1 / `drive-vault.json`）。**置き場のルールをこちらへ複製しない。**

## 確定している設計判断（2026-09-06・ユーザー回答済み。蒸し返さない）

1. 記事は書名の自由文字列でなく**台帳の id** で指す（`sources: [<id>]`、条番号は `id#第240条`）。
2. `sources` の必須化は**原本由来の記事だけ**。既存の未付与は baseline に載せ、**増やさない方向にだけ動かす**ラチェット。
3. 市販書籍（`commercial-book`）は**逐語のみ禁止**。構成流用は policy に「避ける」と書くが**ゲートにしない**。
   （`exam-content-policy.md:211-225` は構成流用も禁じているが、今回の決定が優先。既に書き換えた診断士・実務ノートの
   判断は遡って変えない。policy にこの差分を明記すること。）
4. 文字起こしは Drive group にして台帳（`drive-manifest.json`）に載せ、機械照合の対象にする。

## 済んでいること（触らない・作り直さない）

- `.claude/config/reference-sources.json` — class 6 区分 ＋ 原本 55 件。`aliases` は「移行前の書名 → 正しい参照」の
  オブジェクト（85 エントリ）。civil-practice が実際に書いている **74 文字列すべてが解決できる**ことを確認済み。
- `scripts/lib/reference-sources.mjs` — `loadReferenceSources` / `buildSourceIndex` / `expandCatalogSources`（catalog.json の
  72 文書を `std:{agencyId}/{documentId}` へ）/ `resolveSourceRef`（旧表記は `ok:false` ＋ `suggest`）/ `sourcesRequiringArticle` /
  `globToRegExp` / `normalizeForCompare` / `buildTranscriptIndex` / `findVerbatimRuns` / `parseTranscriptHeader` /
  `loadReferenceBaseline` / `loadStandardsCatalog`。
- `tests/reference-sources.test.mjs` — 12 件緑。
- **未コミットの作業ツリー変更が 1 つある**: `.claude/config/drive-vault.json` に group `source-transcript` を追加済み
  （`pathRegex: ^content/sources/textbook/(?!(?:.*/)?README\.md$).+\.md$` / `vaultDir: 文字起こし` /
  `keyFrom: stripPrefix:content/sources/textbook/` / `regenerable: false`）。dry-run で **66 件**を捉え、README を除外し、
  R2 側と衝突しないことを確認済み。**この変更を活かして続けること**（`git checkout` しない）。

## 実測して分かっている前提（再調査しなくてよい）

- 文字起こしの実体は `content/sources/textbook/**/*.md` に **66 本**（README を除く）。Drive `文字起こし/` と **sha256 が全件一致**
  （2026-09-06 実測・差分 0）。Drive にしか無いのは `土木施工実務ノート/_原本入手時スナップショット-20260826/` 等 21 本で、
  これは group の対象外のままでよい。
- 66 本の見出しの内訳: 旧形式 `> 出典:` が 36 本（うちページ情報まで取れるのが 23 本）、見出し無しが 30 本
  （土木施工実務ノート 17・新しい時代の安全管理 5・技術士（総監）8）。`parseTranscriptHeader` がこの 3 形を判別できる。
- `sources:` frontmatter を持つ記事は **47 本（すべて civil-practice）・74 文字列**。
  抽出時の注意: frontmatter 末尾に list が来ると最後の項目に改行が無い。正規表現は `(?:\n|$)` で閉じること。
- `.claude/scripts/lib/frontmatter-schema.mjs:54` に `sources: z.array(z.string()).optional()` が既にある（`.passthrough()`）。
  **スキーマ変更は不要**。コメント（:51-53）を「台帳 id で書く」へ直すだけ。
- Drive のマウントは `resolveVaultRoot()` が解決する。**Drive クライアントの送信中はマウント読みが ECANCELED で落ちる**。
  `rclone size doboku-gdrive:doboku-note --json` の件数がローカル件数に追いつくまで待ってから `--verify --cloud` を回す。

---

## 残りの手順

### Phase 2 — 文字起こしを台帳へ（`drive-vault.json` の追加分は適用済み）

1. `scripts/backfill-reference-sources.mjs` を新規作成（既定 dry-run・`--commit`）。`--transcripts` モード:
   - `content/sources/textbook/**/*.md`（README 除く）を走査し、`parseTranscriptHeader` で現状を判定。
   - `kind: 'frontmatter'` は触らない。`legacy` / `none` は **先頭に YAML frontmatter を足す**（本文は削らない。
     旧 `> 出典:` 行は**残す**——人が読む注記であり、消すと OCR 品質の但し書きまで失われる）。
   - 付ける項目: `source`（台帳 id。`transcriptDir` の前方一致で一意に決まる）/ `sourcePdfs`（legacy の `pdfFile` を
     `drive-manifest.json` の `textbook-source-pdf` エントリのキーへ解決できたときだけ・配列）/ `pdfPages` / `printedPages`
     （legacy から取れたときだけ）/ `method`（`visual-ocr` 既定。ファイル名や本文に Tesseract とあれば `tesseract`）/
     `transcribedAt`（分からなければ書かない。**推測して埋めない**）。
   - 解決できなかったものは一覧で出す（`source` が決まらない・`pdfFile` が台帳に無い）。件数を必ず表示する。
   - 書き込みは `.claude/scripts/lib/mdx-io.mjs` の `writeMdxFile` を使う（CRLF 混在を作らない）。
2. `npm run drive-vault-sync -- --group source-transcript --commit` → Drive のアップロードが追いつくのを待つ →
   `npm run drive-vault-sync -- --group source-transcript --verify --deep --cloud`（66 件 3 者一致）。
3. `npm run check-drive-vault` 緑。`.claude/state/assets/drive-manifest.json` を commit。

### Phase 3 — 記事の `sources` を id へ

1. `backfill-reference-sources.mjs --articles`:
   - `content/site/**/*.mdx` の frontmatter `sources:` を読み、`resolveSourceRef` で旧表記を `suggest` の参照へ置換。
   - `sourcesRequiringArticle` に一致するのに `sources` が無い記事を集計。**自動で付けない**（どの原本かは機械では決まらない）。
     `.claude/config/reference-sources-baseline.json` に `{ version, description, missingSources: [<repo 相対パス>] }` として書き出す。
   - 書き込みは `writeMdxFile` 経由。1 記事ずつでなくまとめて 1 commit でよい（純粋な frontmatter 置換のため）。
2. `npm run refresh-indexes` → commit。

### Phase 4 — 検査・配線・ドキュメント

1. `scripts/check-reference-sources.mjs` を新規作成。

   | モード | 見るもの |
   |---|---|
   | 既定 | (a) 台帳の妥当性（lib の `loadReferenceSources` が投げる）(b) 記事 frontmatter の `sources` が全て解決でき、旧表記が残っていない (c) `appliesTo` 一致で未付与の記事が baseline より**増えていない**（増えたら FAIL・減ったら WARN で baseline を削る案内）(d) 本文の出典粒度（class の `citation` 別）と、`transcriptPublic:false` の原本を持つ記事に `content/sources/textbook/` や文字起こしのファイル名が出ていないか（漏洩） |
   | `--staged` | (b)(d) を staged の `.mdx` だけ。pre-commit 用（`SKIP_REFERENCE_SOURCES=1` で回避） |
   | `--deep` | (e) 文字起こしの frontmatter が台帳 id を指し、`sourcePdfs` が `drive-manifest` に実在する (f) `commercial-book` 由来の記事 × その原本の文字起こしで `findVerbatimRuns(minRun: 40)` が 0 件（1 件でも FAIL・一致箇所と一致長を出す） |

   - **対象数と実検査数を必ず出力**する。台帳 0 件・対象記事 0 件は「検査不成立」で exit 2。
   - 文字起こしの実体が無い端末（CI）は `--deep` でも「実体検査 0 件」と明示して (a)-(d) だけで判定する。
     型は `scripts/check-drive-vault.mjs` の「マウント無し」の出し方に合わせる。
   - 漏洩検査の型は `scripts/lib/video-content-check.mjs` の `checkSourceRefs`（:239-271）を参考にする。
2. 配線: `package.json`（`check-reference-sources` と `check-reference-sources:deep`・`backfill-reference-sources`）/
   `scripts/quality-audit.mjs` の CHECKS へ `{ id: 'reference-sources', npm: 'check-reference-sources', timeout: 120_000, ci: true, note: '...' }` /
   `scripts/install-pre-commit.mjs` に `if [ -z "$SKIP_REFERENCE_SOURCES" ]; then node scripts/check-reference-sources.mjs --staged` /
   `CLAUDE.md` の頻用コマンド 2 行とリファレンス索引 1 行 → `npm run sync-codex-compat` で AGENTS.md 再生成。
3. `tests/reference-sources.test.mjs` に (c) のラチェット判定と (d) の citation 判定の純関数テストを足す。
   `tests/drive-vault.test.mjs` に `source-transcript` の正例／負例（README を巻き込まない・R2 と衝突しない）を足す。
4. **新規 SSOT** `.claude/knowledge/reference/reference-sources-policy.md` を書く。章立て:
   区分表（class 6 行・逐語／図／文字起こし公開／出典粒度）/ ライフサイクル（原本を Drive へ → 台帳へ登録 →
   文字起こし（frontmatter 必須・group で同期）→ 記事（`sources` id・citation）→ 検査）/ 参考文献を 1 冊増やす手順 /
   Drive vault の階層と台帳の対応 / 「構成流用は避ける（ゲートにしない）」の但し書きと 2026-07-31 診断士の前例。
5. 既存 doc を**ポインタ化**（重複を作らない。差し替えは `model: sonnet` のサブエージェント 1 体に file:line と差し替え文を
   渡してよい。lib・検査・テスト・台帳・policy 本文は親が書く）:
   `exam-content-policy.md`（:72-74, :175, :211-225 の著作権記述 → 「区分は reference-sources-policy §1」）/
   `content-authoring.md`（frontmatter テンプレ :264-308 に `sources` 行）/ `content/sources/textbook/README.md` /
   `textbook-pdf-archive.md` / `asset-storage-policy.md` §1-1 の「文字起こし」行（対象外 → group）/
   `.claude/skills/dev/asset-route/SKILL.md`（新 group）/ `pdf-to-mdx/SKILL.md` と `references/scanned-image-pipeline.md`
   （出力に frontmatter を付ける・group で同期）/ `.claude/agents/scanned-textbook-transcriber.md`（出力先頭に frontmatter。
   description は変えない＝`check-doc-coupling` を無用に鳴らさない）/ `information-architecture.md` 判断フロー :103 の後 /
   `.claude/scripts/lib/frontmatter-schema.mjs:51-53` のコメント。
6. backlog に後追いカードを起票（`DN-0179` 以降。現在の最大は DN-0177）: 総監キーワード 663 本の `sources` 付与 /
   Drive `文字起こし/共通仕様書` 350 本と standards-library の関係整理 / 逐語窓幅（40 字）の実測調整 / 白書由来記事の付与。

---

## 検証（受入条件）

| コマンド | 合格 |
|---|---|
| `npm test` | 全緑 |
| `npm run check-reference-sources` | 台帳 N 件・記事 M 件を実検査して FAIL 0。baseline 件数を表示 |
| `npm run check-reference-sources -- --deep`（Mac） | 文字起こし 66 件の frontmatter が台帳と整合。`commercial-book` 由来記事の逐語一致 0 |
| 負例: 記事に `sources: [存在しないid]` → `--staged` | FAIL。旧表記なら候補を案内 |
| 負例: 文字起こしの一文を記事へ貼る → `--deep` | 逐語一致で FAIL・一致箇所と長さを出力 |
| `npm run drive-vault-sync -- --group source-transcript --verify --deep --cloud` | 66 件 3 者一致 |
| `DOBOKU_DRIVE_VAULT=/nonexistent npm run check-reference-sources -- --deep` | 「実体検査 0 件」を明示し (a)-(d) だけで判定 |
| `check-drive-vault` / `check-asset-storage` / `check-doc-refs` / `check-relative-links` / `check-codex-compat` / `check-command-guidance` / `check-gate-parity:ci` / `lint-frontmatter --all` | 全緑 |

## 停止条件（勝手に進めない）

- 台帳の class を増やす・`verbatim` の値を変える（区分はユーザー決定事項）
- `commercial-book` の逐語ゲートを警告へ弱める
- 文字起こしの本文を書き換える（frontmatter の追加だけ。OCR 本文は原本の再現物）
- Drive・R2 の削除操作全般
- 総監キーワード 663 本への一括 `sources` 付与（今回の射程外・backlog へ）

## 作業規律

- ブランチは `develop`。着手前に `git branch --show-current` と `git fetch -q && git log --oneline develop..origin/develop | head`。
- **並行セッションが常態**。`git add -A` を使わず、変更したファイルだけ明示指定して commit する。
  `.claude/state/**` や `content/note/**` に自分が触っていない差分があれば、それは他セッションのもの。触らない。
- commit 前に `npm run pre-commit:install`（他 worktree がフックを入れ替えていると「導入済みフックが古い」で止まる）。
- Phase ごとに commit する。
