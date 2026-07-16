# admin-app — 運営管理ダッシュボード（Next.js 版）

ローカル専用の運営ダッシュボード。既存の zero-dep 版（`tools/admin/`・node:http）を段階的に置き換える Next.js アプリ。**デプロイしない・ビルドしない・dev モード専用**。

```bash
npm run admin-next   # http://127.0.0.1:3022
```

## 実装済みタブ（Phase 1+2）

| タブ | データソース | 備考 |
|---|---|---|
| 計測概観 / GA4 / GSC / PSI | `.claude/state/metrics/{ga4,gsc,psi}/*.json` | CI がコミットするスナップショットを読むだけ。**ライブ API は叩かない**（会社 PC はプロキシで Google/Meta 遮断・CI 供給が正）。`?snapshot=` で履歴切替、鮮度バッジ（週次 CI・8 日超で赤） |
| エージェント / スキル | `.claude/agents/*.md` / `.claude/skills/**/SKILL.md` | gray-matter で frontmatter パース。役割（Generator/Evaluator）・モデル・tools・カテゴリ |
| ギャラリー（OGP / 記事図版 / note画像 / SNS） | `.local/r2/posts/**`, `docs/note/**`, `docs/sns/**` | 画像は `/media/{posts,sns,note}/...` 経由で配信（traversal ガード + MIME allowlist）。`loading="lazy"` + 資格/種別フィルタ |
| TODO | `docs/todo/*.md` | tier 別カード（read-only・編集は VS Code リンク） |

## 設計方針

- **配置**: `tools/admin-app/`。ルートの `package.json` 依存（next / react）を再利用し、新規 `node_modules` を作らない（`next dev tools/admin-app` のディレクトリ引数）。`turbopack.root` = リポジトリルート。
- **アーキテクチャ**: RSC ファースト（全ページ Server Component が fs を直接読む）。HTTP セマンティクスが要る画像配信のみ Route handler（`src/app/media/[root]/[...path]/route.ts`）。
- **パス解決**: `src/lib/repo-root.ts` の `findRepoRoot()`（`process.cwd()` から `package.json` name=doboku-note を上方探索）。バンドル下で不安定な `import.meta.url` は使わない。
- **チャート**: 依存追加なしのサーバーレンダー inline SVG（`src/components/charts/`）。
- **スタイル**: 素の CSS（`src/app/globals.css`）。Tailwind は multi-root で config 解決が曖昧になるため不採用。
- **CI 影響ゼロ**: `tools/**` は root の tsconfig / eslint / knip の対象外。型チェックは `npx tsc -p tools/admin-app/tsconfig.json`。

## 未実装（将来 Phase）

- SNS 状態板・投稿ジョブ実行（SSE + CSRF）・売上・品質・記事/note/マガジン一覧の移植
- 旧 `tools/admin/`（3021）の退役と `admin` script の付け替え
