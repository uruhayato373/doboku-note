---
name: reference_admin_worktree_turbopack
description: admin-app を git worktree で next dev 検証すると Turbopack が node_modules junction を拒否する回避策
metadata: 
  node_type: memory
  type: reference
  originSessionId: f6bd8c23-d81f-4d7e-940d-8bc65696e682
---

`tools/admin-app`（Next.js 版管理画面）を **git worktree 内で `next dev` 検証**しようとすると Turbopack が落ちる:

```
FATAL ... Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

原因: `next.config.mjs` の `turbopack.root` が app の 2 階層上（= worktree ルート）に固定される。worktree には実体 node_modules が無いので親リポの `node_modules` へ **junction（`mklink /J`）** を張るが、その junction 先が turbopack.root の外を指すため Turbopack が拒否する。

回避策（検証時のみ・commit しない）:
- worktree の `next.config.mjs` で `repoRoot` を **共通親（3 階層上 = `%USERPROFILE%`）** に一時的に広げる → junction 先がルート内に入り起動する。検証後 `git checkout -- next.config.mjs` で戻す。
- 本番 `npm run admin`（:3021）は**メインリポで実行すれば実体 node_modules・turbopack.root=リポルートで正常**。この問題は worktree 検証固有。

補足: junction を消すときは必ず `cmd /c rmdir <link>`（reparse point だけ削除）。`rm -rf` や `git worktree remove` が junction を辿ると**親リポの node_modules 本体を消す危険**があるため、worktree 削除前に junction を先に外す。

関連: [[feedback_multi_session_concurrent_git]]（複数セッション常態下では admin 作業も worktree 隔離が安全）
