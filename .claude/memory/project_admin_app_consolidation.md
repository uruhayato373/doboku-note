---
name: project_admin_app_consolidation
description: 運営管理画面を Next.js 版 tools/admin-app に一本化し旧 zero-dep admin を退役（PR
metadata: 
  node_type: memory
  type: project
  originSessionId: f6bd8c23-d81f-4d7e-940d-8bc65696e682
---

運営管理画面（ローカル専用ダッシュボード）を **Next.js 版 `tools/admin-app` に一本化**した（2026-07-16・PR #408 `feature/admin-next-dashboard` → develop）。

- `npm run admin` = 新アプリ起動（`next dev tools/admin-app -p 3021 -H 127.0.0.1`）。旧 `admin-next` script は削除。
- **旧 zero-dep 版 `tools/admin/`（node:http・vanilla JS）は全 20 ファイル削除して退役**。
- 全タブ移植済み: 計測(GA4/GSC/PSI)・エージェント/スキル・ギャラリー×4(OGP/記事図版/note/SNS)・SNS状態板・記事/note/マガジン・売上・品質・投稿ジョブ・TODO。
- 記事図版タブは `figure-provenance.json` で enrich した **needs トリアージ**（「対応」フィルタ `?needs=`・進捗カード・source_dir ツールチップ）を実装済み。`/figure-recrop`・`quality-cycle`・`figure-provenance.md`・`backlog.md` が参照する図クロップ運用ビューはここ。
- 設計: RSC ファースト・`src/lib/repo-root.ts` の `findRepoRoot()` でパス解決（`import.meta.url` 不使用）・素CSS・inline SVG チャート・ルート node_modules 再利用・**ビルド/デプロイなし dev 専用**。CI 影響ゼロ（`tools/**` は root tsconfig/eslint/knip 対象外）。
- 投稿ジョブ `/jobs`: ホワイトリスト7アクション・dry-run 既定・本番は明示ゲート・CSRF（Origin + `X-Admin:1`・127.0.0.1 限定）・SSE。ガードは既存 CLI 側に残す。
- 計測タブは `.claude/state/metrics/{ga4,gsc,psi}` の CI コミット済み JSON を読むだけ（ライブ API を叩かない）→ [[feedback_metrics_cicd_supplied]]

worktree で `next dev` 検証する際の Turbopack node_modules 落ちは [[reference_admin_worktree_turbopack]] 参照。
