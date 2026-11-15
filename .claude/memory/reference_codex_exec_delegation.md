---
name: reference_codex_exec_delegation
description: Claude から codex exec で Codex に実装を任せるときの罠（stdin 待ち・.git 書込不可・listen 不可・sandbox 解除は拒否）と分担の形
metadata:
  type: reference
---

2026-11-14（DN-1198・PR #1597）で、Claude が `codex exec` を background で起動して A→B→C の 3 段を Codex に実装させたときの実測。

- **stdin を閉じる**: `codex exec … "<prompt>" < /dev/null`。付けないと「Reading additional input from stdin...」のまま CPU 0 で 30 分止まった（1 回目は偶然進んだ）。
- **sandbox は `-s workspace-write`**。`-s danger-full-access`＋`approval_policy=never` は Claude 側の自動判定に拒否された。workspace-write は `writable_roots` に本体の `.git` を足しても `.git` に書けない（fetch の FETCH_HEAD すら EPERM）。→ **Codex は編集・build・テストまで、claim・commit・push は親（Claude）が `git -C <worktree>` で行う**、と起動プロンプトに書く。
- **ポートを listen できない**: `npm run serve`・`/site-visual-review` の撮影は親が行う。`tsx` CLI も IPC で EPERM になるので、build は `node --import tsx` と `next build --webpack` に置き換えた形で完走した。
- worktree は親が先に作り、`node_modules` は本体へ symlink。Codex に作らせない。
- モデルとエフォートは実行時に `-m` と `-c model_reasoning_effort=` で段ごとに指定する（この時の割り当ては gpt-6-astra medium＝検査、high＝配置ロジック、gpt-5.6-terra medium＝設定と CI）。既定（`~/.codex/config.toml`）は gpt-6-astra・high。
- Codex の成果は鵜呑みにしない。今回は C が `out/` 不在時の skip を消していて、手元の `quality:audit:ci` が常に赤になる変更を親が戻した。

関連: [[feedback_opus_sonnet_split]] [[reference_shared_worktree_autostash_hazard]]
