---
name: partial-clone-repack-hazard
description: blob:none の partial clone の罠。rev-list --objects と git log -M は履歴を再DLし、repack -a -d は到達可能commitを落とす
metadata: 
  node_type: memory
  type: reference
  originSessionId: 6f1505d4-0791-480d-afdf-fc4f18b22cb7
  modified: 2026-08-21T10:44:57.101Z
---

`doboku-note` のローカル `.git` は **`blob:none` の partial clone**（`remote.origin.promisor=true` / `partialclonefilter=blob:none`）。普通の clone と挙動が違い、肥大化を直しに行くと逆に壊す罠が 3 つある。

**罠1: `git rev-list --objects --all` を素で回すと履歴を再ダウンロードする。**
欠損 blob を promisor remote から遅延取得しに行くため、`.git` が膨らむ。2026-08-21 の DN-0111 Phase 0 実査で実際に promisor pack を 266 個増やして確認した。履歴走査は必ず **`--missing=allow-any`** を付ける（欠損を欠損のまま数える）。素で回すと 5 分でも終わらないのは「遅い」のではなく「DL している」。

**罠2: `git repack -a -d` は到達可能な commit を落とすことがある。**
2026-08-21 に pack 12.01GiB → 6.52GiB（1002 pack → 3）へ縮んだ一方、**到達可能だった commit 21 個が読めなくなった**。repack 前の `cat-file --batch-all-objects` 出力に 21 個すべてが載っていたことで「元から欠損」ではなく repack が落としたと確定。git 2.44 の man は「promisor packfile は別 pack へ repack される」と書くが、promisor pack 内の到達可能 commit が取りこぼされる。`git log` の親辿りが `fatal: Failed to traverse parents` で止まる形で表面化する。

**罠3: `git log --name-status -M` は履歴の blob を丸ごと落としてくる。**
`-M` の既定は類似度 50% の**非厳密**リネーム検出で、blob の中身を読んで比較する。partial clone では
これが全 blob の遅延取得になる。2026-08-21 実測——新規 partial clone で `npm run build` を回したら、
`.claude/scripts/lib/git-dates.mjs` のこの 1 コマンドだけで `.git` が **969 MB → 7.0 GB**、
13 分間 CPU 1% のまま downloading を続けた（partial clone にした意味が最初の build で消える）。

**`-M100%`（厳密一致のみ）に変えれば blob の OID 比較で済む。** `GIT_NO_LAZY_FETCH=1` を付けて
完走すれば「blob を読んでいない」ことの決定的な証明になる（`-M` は同条件で失敗するか .git が膨らむ）。
精度差は実測して判断すること: doboku-note では content/site の MDX 1,117 件のうち
**dateModified は全件一致**、created が 22 件だけ 12 日ずれた。

**遅い ≠ 重い。partial clone で CPU 1% のまま進まないコマンドは、たいてい DL している。**

**それでも repack する場合の手順**（12GiB の約半分はパック間の重複格納なので、効果自体は大きい）:

1. 未 push commit を `git bundle create <外部dir>/x.bundle origin/develop..develop` で退避（origin に無いものは repair 経路が無い）
2. `git cat-file --batch-all-objects --batch-check` を **repack 前に**保存（後で「元から欠損」と切り分ける唯一の証拠になる）
3. `git repack -a -d`
4. **必ず** `git fsck --connectivity-only --no-dangling` → `error: Could not read <sha>` を全部拾う
5. 欠損 sha は `git cat-file -t <sha>` で 1 つずつ叩くと promisor 経路で取り戻せる（`git fetch origin <sha>` は `did not send all necessary objects` で失敗する）
6. `git reflog expire --stale-fix --all` と `git read-tree HEAD` で reflog と index cache-tree の壊れ参照を掃除
7. 合格条件は `git rev-list --all --count`（`--missing` 無し）が fatal 無しで通ること・`fsck` errors 0・古い commit の blob が読めること

`git gc` の自動実行（`-a` 無しの incremental repack）ではこの事故は起きていない。**危ないのは `-a`**。

関連: [[shared-worktree-autostash-hazard]] / [[disk-cleanup-textbook-r2-2026-07]]
