# tools/admin — 運営管理画面（ローカル専用）

SNS 投稿・記事画像・note カバーを目視確認し、投稿状態を一覧する**ローカル専用**ダッシュボード。
デプロイしない（運用コスト 0 円）。データ SoT は git 作業ツリー内ファイルを直読。

## 起動

```bash
npm run admin        # → http://127.0.0.1:3021
```

`127.0.0.1` バインドのみ（LAN 非公開）。依存追加ゼロ（node:http のみ）。

## タブ（Phase 0〜6 実装済み）

| タブ | 内容 | データソース |
|---|---|---|
| OGP | 全 ogp.png（資格×分類フィルタ） | `.local/r2/posts/**/ogp.png` |
| 記事図版 | SVG / PNG・WebP クロップ。各カードに**写り込みバッジ（答え漏らし/写り込み/要確認＝OCR）・画質バッジ（ボケ/やや不鮮明＝ラプラシアン分散、写り込みと直交する軸）・掲載/孤児バッジ・公開状態・記事(本番/ローカル)/MDX リンク**（下書きは getDoc が published:false を弾き本番/ローカルとも 404 になるため MDX リンクのみ表示）。**needs バッジ（対応＝要再クロップ/要再スキャン等・provenance 由来。再スキャン図は元 source_dir をツールチップ表示）**。フィルタ＝資格/種別/**写り込み**/**画質(目安)**/**対応(needs)**/**公開**/**掲載**/監査(SVG severity)。「対応＝要再スキャン」で絞れば再スキャン worklist、「公開×答え漏らし」で緊急リスト等でスライスできる。図 provenance の真実源・運用は [figure-provenance.md](../../docs/reference/figure-provenance.md) | `.local/r2/posts/**/img/*`、`.claude/state/figure-text-audit.json`（`npm run audit-figure-text`＝OCR写り込み＋ラプラシアン画質）、`.claude/state/figure-provenance.json`（`npm run build-figure-provenance`＝needs算出。両方は `npm run audit-figures` で一括）、`.claude/config/figure-sources.json`（ソース台帳）、`svg-audit.json`、各記事 `article.mdx`（掲載/公開判定） |
| note画像 | カバー / 図版（試験×種別フィルタ） | `docs/note/**/img/{cover*,figure-*}.png` |
| SNSパック | IG パック・X ドラフトの画像目視 + posted バッジ | `docs/sns/instagram/**`、`docs/sns/x/draft/**` |
| SNS状態板 | IG 進捗サマリ・X 予約状況・直近スケジュール（読み取り専用） | `docs/sns/schedule.json`、posted.json、x status.json |
| 投稿/予約 | X 4ステップパイプライン・IG 予約投稿・note 公開（2段階UI + SSEログ） | 既存 CLI を child_process 実行（`lib/jobs.mjs`） |
| 記事/note/マガジン | サイト記事 / note 原稿 / マガジンの一覧・公開状態（読み取り専用） | `doc-meta-index.json`、`docs/note/**/article*.md`、`note-magazines.ts`（`lib/content.mjs`） |
| 品質 | モバイル可読性ラチェットの違反を GA4 人気度順に一覧（資格×分類×ルールでフィルタ）・ルール別集計・違反バーンダウン（読み取り専用） | `lint-baseline.json` × `popular-pages.json` × `content-rules.json` × `doc-meta-index.json` × `history.jsonl`（`lib/quality.mjs`） |
| 売上 | 月次売上推移（インライン SVG 棒グラフ）+ 商品別内訳・¥15k マイルストーン | `.claude/state/sales/sales-log.json`（`lib/sales.mjs`） |

件数は既存スクリプト（`ogp-gallery` / `note-cover-gallery` / `svg-gallery` / `sales-summary`）と一致する。

## 投稿/予約タブ（Phase 3）の安全設計

- **ホワイトリストのみ実行**（`lib/jobs.mjs` の `ACTIONS`）: `ig-mark` / `ig-unmark` / `x-guard` / `x-publish` / `x-sync` / `ig-publish` / `note-publish`。任意コマンドは走らない。
- **引数は厳格検証 + shell なし**: pack/draft/date/format を正規表現で検証し、`spawn(shell:false)` の配列引数（シェル連結しない）。最終ガードで metachar/`..` を拒否。
- **本番(commit)は明示フラグ必須**: `mode!=='commit'` の間は投稿系に `--dry-run` を強制付与。UI は dry-run/ガード成功まで本番ボタンを disabled にし、実行時は対象名タイプ確認。
- **X は 4 ステップ固定**: `x-schedule-guard`（BLOCK 判定）→ dry-run → 本番 → `x-sync-status`（予約→posted 昇格の偽成功検証）。
- **同時 1 ジョブ**（Playwright SingletonLock 対策）。ログは SSE ストリーム。
- **CSRF ガード**: POST は `Origin=127.0.0.1` 検査 + `X-Admin: 1` ヘッダ必須（drive-by POST を遮断）。

## 設計方針

- **投稿系はローカル実行必須**: Playwright ログインプロファイル（`.local/playwright-*-profile`）がこの PC にあるため。クラウドにデプロイしても投稿・書き込み不可。
- **書き込みは既存 CLI 経由に一本化**（Phase 3 以降）: `scripts/ig-status.mjs mark`、`note-publish.mjs`、publish-x 系を child_process 実行。ガード（`--commit` ゲート・dobokunote assert）を UI から迂回させない。直接 fs 書き込みはしない。
- **走査ロジックは既存資産を再利用**: `ig-status.mjs` の export（`walkPacks`/`packInfo`/`normalizePosted`）を import、ギャラリー走査は既存 `.tmp` ギャラリーの移植。
- `tools/` は eslint / tsc / knip / next build のどのスコープにも入らない（CI 影響ゼロ）。

## 構成

```
tools/admin/
  server.mjs         node:http ルーター（/ + /media/* + /api/* + POST /api/job/*）
  lib/media.mjs      /media/* パスマッピング + traversal ガード + MIME allowlist
  lib/scan.mjs       ギャラリー走査（ogp / figures / note / sns）
  lib/sot.mjs        SNS 状態板の SoT 統合
  lib/jobs.mjs       投稿アクションのホワイトリスト実行 + 引数検証 + SSE（P3）
  lib/content.mjs    記事/note/マガジン一覧（P4）
  lib/sales.mjs      売上集計（P5）
  lib/quality.mjs    品質ラチェット集計（P6・読み取り専用）
  public/            Vanilla JS SPA（no-build）
```

Phase 0〜6 実装済み。

**品質タブ（P6）の補足**: データは全て live 読み（UI に状態を持たない）。表示の鮮度は
`npm run check-content-quality` →（リライト後は）`npm run update-content-quality-baseline`
で `lint-baseline.json` を更新した時点。違反バーンダウンは `npm run quality-snapshot`
（`.claude/state/quality/history.jsonl` に日次追記）を週次で回すと折れ線になる。真実源は
`.claude/scripts/lint-mdx-mobile.mjs` / `.claude/config/content-rules.json`。

追加候補: 品質タブに「再スキャンボタン」（`lib/jobs.mjs` の CSRF/SSE パターンで
`check-content-quality` を実行）、`/quality-cycle` リライト起動、TODO（`docs/todo/*.md`）の
read-only 統合ビュー、計測ダッシュボード統合（GA4/GSC weekly-metrics）。
