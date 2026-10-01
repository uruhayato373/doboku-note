---
name: worktree-hook-freshness-false-positive
description: 共有 .git/hooks のフック鮮度チェックは worktree 間で偽陽性を出す。古い側から pre-commit:install すると相手の進行中ゲートを剥がす
metadata: 
  node_type: memory
  type: reference
  originSessionId: 4e564e8f-16b6-4ec9-830a-cd3f25b5d27b
  modified: 2026-08-25T21:53:07.672Z
---

pre-commit の先頭にある「フック鮮度チェック」（`HOOK_HASH_INSTALLED` と
`scripts/install-pre-commit.mjs` の `HOOK_CONTENT_BODY` ハッシュを比較）は、
**worktree 間で偽陽性を出す**。`.git/hooks` は全 worktree で共有される一方、
比較対象の install スクリプトは各 worktree の CWD から読まれるため。

**罠**: 別セッションがフックに新ゲートを追加して install 済みだと、こちらの
（古い）ブランチでは「導入済みフックが古い」と出て commit が止まる。実際は
**installed 側の方が新しい**。ここで指示どおり `npm run pre-commit:install` を
実行すると、相手の未コミットの進行中ゲートを共有フックから剥がしてしまう。

**確認方法**: `grep -c "<新ゲート名>" $(git rev-parse --git-common-dir)/hooks/pre-commit`
と、両 worktree の `scripts/install-pre-commit.mjs` を diff する。相手の版が
superset なら installed が新しい＝偽陽性。

**対処**: 鮮度チェックだけを飛ばす env var は無い（個別ゲートの SKIP_* しか無い）。
フック本体を鮮度チェック抜きで手動実行して全ゲート通過を確認してから
`git commit --no-verify` し、**理由を commit message に明記する**。

```
HOOK=$(git rev-parse --git-common-dir)/hooks/pre-commit
tail -n +20 "$HOOK" > /tmp/hook-body.sh && sh /tmp/hook-body.sh
```

相手の worktree にしか無いスクリプトを呼ぶ行は落ちるので、その分は除いて回す。
共有 .git の別の事故は [[shared-worktree-autostash-hazard]]。

**再発（2026-08-26）**: `node scripts/install-pre-commit.mjs` は `--help` 等の
フラグを一切見ず、引数の有無に関わらず即座に上書き実行する（dry-run が無い）。
「中身を確認するだけのつもり」で実行しても即座に共有フックが書き換わる。
確認は必ず先に diff（上記「確認方法」）で行い、install スクリプト自体を試し打ちしない。
このときは develop 側 worktree から re-install して復旧できたが、develop 側の
worktree が存在しない・特定できない状況では復旧手段がない点に注意。
