# admin-app — 運営管理ダッシュボード（Next.js 版）

ローカル専用の運営ダッシュボード。**デプロイしない・ビルドしない・dev モード専用**。
旧 zero-dep 版（`tools/admin/`・node:http）は 2026-07-16 に退役し、本アプリへ一本化した。

```bash
npm run admin   # http://127.0.0.1:3021
```

## タブ一覧

| タブ | データソース | 備考 |
|---|---|---|
| 計測概観 / GA4 / GSC / PSI | `.claude/state/metrics/{ga4,gsc,psi}/*.json` | CI がコミットするスナップショットを読むだけ。**ライブ API は叩かない**（会社 PC はプロキシで Google/Meta 遮断・CI 供給が正）。`?snapshot=` で履歴切替、鮮度バッジ（週次 CI・8 日超で赤） |
| エージェント / スキル | `.claude/agents/*.md` / `.claude/skills/**/SKILL.md` | gray-matter で frontmatter パース。役割（Generator/Evaluator）・モデル・tools・カテゴリ |
| ナレッジ | `.claude/knowledge/**/*.{md,json}` | エージェント向けSSOTの人向け読み取り専用ビュー。全文検索・カテゴリ絞り込み・Markdown HTML表示・JSON整形表示 |
| ギャラリー（OGP / 記事図版 / note画像 / SNS） | `.local/r2/posts/**`, `docs/note/**`, `docs/sns/**` | 画像は `/media/{posts,sns,note}/...` 経由で配信（traversal ガード + MIME allowlist）。`loading="lazy"` + 資格/種別フィルタ |
| SNS状態板 | `docs/sns/{schedule.json, instagram/**/posted.json, x/draft/**/status.json}` | IG 試験別進捗・X ドラフト状況・直近予定。IG 集計は `scripts/ig-status.mjs` を dynamic import して再利用（読み取り専用） |
| 記事 / note / マガジン | `src/config/doc-meta-index.json`, `docs/note/**`, `src/lib/note-magazines.ts` | サイト記事一覧・note 原稿・マガジン（価格/公開）。SoT を二重化せず regex/JSON 読取 |
| 売上 | `.claude/state/sales/sales-log.json` | 月次集計 + inline SVG 棒グラフ（¥15k マイルストーン線） |
| アフィリ | `.claude/state/metrics/affiliate/a8-report-log.json` | A8 成果の月次×プログラム集計＋EPC（確定報酬÷クリック）・日別直近31日。データ供給は `/a8-report`（`a8-ui:fetch` → `a8-ui:normalize`）。未収集時は取得コマンドを案内。`programIdMap` 未写像があれば警告表示 |
| 品質 | `.claude/state/quality/{lint-baseline,history,census}.json`, `src/config/popular-pages.json` | 違反 × 人気の優先度・ルール別・バーンダウン・採点カバレッジ census（読み取り専用） |
| 投稿ジョブ | 既存 CLI（ig-status / x-schedule-guard / publish-x / publish-ig-bs / note-publish） | ホワイトリスト 7 アクション・dry-run 既定・本番は明示ゲート。`POST /api/job/run` は SSE + CSRF（Origin + `X-Admin:1`・127.0.0.1 限定）。ガードは CLI 側に残す（UI は child_process 実行だけ） |
| TODO | `docs/todo/*.md` | tier 別カード（read-only・編集は VS Code リンク） |

## 設計方針

- **配置**: `tools/admin-app/`。ルートの `package.json` 依存（next / react）を再利用し、新規 `node_modules` を作らない（`next dev tools/admin-app` のディレクトリ引数）。`turbopack.root` = リポジトリルート。
- **アーキテクチャ**: RSC ファースト（全ページ Server Component が fs を直接読む）。HTTP セマンティクスが要る画像配信のみ Route handler（`src/app/media/[root]/[...path]/route.ts`）、投稿ジョブは Route handler（POST + SSE ＋ CSRF）＋ client component（`JobRunner`）。
- **パス解決**: `src/lib/repo-root.ts` の `findRepoRoot()`（`process.cwd()` から `package.json` name=doboku-note を上方探索）。バンドル下で不安定な `import.meta.url` は使わない。
- **チャート**: 依存追加なしのサーバーレンダー inline SVG（`src/components/charts/` の LineChart / BarChart）。
- **スタイル**: 素の CSS（`src/app/globals.css`）。Tailwind は multi-root で config 解決が曖昧になるため不採用。
- **セキュリティ**: `-H 127.0.0.1` 明示バインド。media route は traversal ガード + MIME allowlist。投稿ジョブは action ホワイトリスト + 引数正規表現検証 + shell なし spawn + `--commit` ゲート（CLI 側）。
- **CI 影響ゼロ**: `tools/**` は root の tsconfig / eslint / knip の対象外。型チェックは `npx tsc -p tools/admin-app/tsconfig.json`。
