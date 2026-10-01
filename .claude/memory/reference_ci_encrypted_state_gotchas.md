---
name: reference-ci-encrypted-state-gotchas
description: encrypted-state CI 化で踏んだ罠 — rclone の不在キー exit 0 / worktree で npm install すると symlink が実体化 / import 時の profile 解決が CI オフライン検査を落とす / redact が公開鍵を伏せる / zsh の env $VAR / Business Suite の marker は asset_id
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3d31dc7a-199e-4849-9e8c-9fa9c87e117b
  modified: 2026-09-21T02:40:40.419Z
---

2026-09-21（PR #549/#550）の実測。

- **rclone `cat` / `lsjson` は存在しないキーでも exit 0**（空出力 / `[]`）。S3 互換に見せるアダプタ（`scripts/lib/rclone-s3-adapter.mjs`）は `[]` を NoSuchKey/NotFound に写像しないと `JSON.parse('')` で「Unexpected end of JSON input」になる。CAS（IfMatch）は rclone に無い
- **worktree で `npm install` すると node_modules の symlink が 985MB の実体コピーに化ける**。復元は `rm -rf node_modules && ln -s <main>/node_modules`。未マージの依存は main で `npm install --no-save` して全 worktree に見せる
- **共有セッション lib（note-browser / coconala-session）は import 時に `resolveProfileDir` を呼んではいけない**。CI の quality-audit（ci:true の check-coconala-blog・unit-tests）が browser を開かないのに CI 判定で落ちた。profile は launch の瞬間に解決（`profileDir()`）。回帰テストは `tests/playwright-auth-ci-gate.test.mjs`
- **`redactAuthDiagnostic` は 40 字超の英数字列を全部伏せる**ので age の公開 recipient（`age1…`）まで `[REDACTED]` になり keygen の出力が使えなかった。`keyHint === 'recipient'` で除外
- **zsh は `env $VAR cmd` の `$VAR` を word-split しない**。「CI 模擬で collector を回した」つもりが実はローカル profile で動いていた。env は 1 行に直書きする（または `${=VAR}`）
- **Business Suite（instagram）の `auth:status` は旧 marker（ハンドル/ページ名）だと常に `unknown`**。プランナー本文にアカウント名が出ない（img/aria）。ログイン済みなら URL に `asset_id=<ページ ID>` が付くので、それを marker にする（`ig-account.json businessSuite.assetId`）
- **`verify-ig-status` の exit 2 はドリフト（正常動作）**。慢性（published_UNrecorded 47）なので workflow では収集成功扱いにし、exit 1（ライブ取得失敗）だけ失敗にする
- 既存 write スクリプトの「dry-run」は下書き保存＝それ自体が書き込み。plan hash を dry-run 出力から取る設計は成立しない → repo の inputs ハッシュで決める

**Why:** どれも「緑に見えて実は別のものを検査していた」型。**How to apply:** encrypted-state / ops-write を触るとき、CI 模擬は env を直書きし、offline 検査を `GITHUB_ACTIONS=true` で回して import が通るか見る。
