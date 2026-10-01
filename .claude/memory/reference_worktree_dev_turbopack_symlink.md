---
name: worktree-dev-turbopack-symlink
description: git worktree で node_modules symlink だと Turbopack(next dev/build)が落ちる→--webpack回避
metadata: 
  node_type: memory
  type: reference
  originSessionId: f3592716-b8c4-4005-9d7f-86b059a731f2
---

git worktree（`git worktree add <dir> -b <feat> origin/develop`）は `.git` を共有するが node_modules（gitignore）は持たない。同コミットなら `ln -s ../doboku-note/node_modules node_modules` で共有可。

**罠**: Next.js 16 の Turbopack（既定の `next dev` / `next build`）は symlink な node_modules を `Symlink [project]/node_modules is invalid, it points out of the filesystem root` で**FATAL拒否**する。tsc(type-check)/eslint(lint)/node test は symlink を問題なく解決するので気づきにくい。

**回避**: `npx next dev --webpack -p <port>` / `npx next build --webpack`。webpack は symlink を解決する。本番CIはTurbopackなので、worktree検証はwebpackでも本筋の検証になる（SSR描画・静的生成は同等に通る）。

**dev検証手順**: worktree で webpack dev を別ポート起動→`curl --retry-connrefused --retry N` で各ルート 200/`<main>`1個/breadcrumb 確認。macに `timeout` 無し→background実行＋curlリトライで待つ。Playwright screenshot は MCP cwd=メインrepo に出る（`/Users/minamidaisuke/doboku-note/*.png`）ので確認後に rm。

初出 2026-06-27 [[design-system-phase0]]。
