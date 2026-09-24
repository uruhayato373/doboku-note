---
name: reference-npm-ci-legacy-peer-deps
description: "素の npm ci は ERESOLVE で失敗する（eslint 10 と eslint-plugin-react の peer 衝突）。2026-09-24 に .npmrc（PR #601）で解消済み。同期後は refresh-indexes が要る"
metadata:
  node_type: memory
  type: reference
  originSessionId: b2b21062-71d2-4a92-8424-7462fc3e0f9c
  modified: 2026-09-24T02:20:59.014Z
---

素の `npm ci` を実行すると ERESOLVE で失敗する。eslint@^10 と eslint-plugin-react@7.37.5（peer は eslint ^9.7 まで）が衝突するため。CI の workflow はすべて `npm ci --legacy-peer-deps` を明示している。

2026-09-24 に `.npmrc` へ `legacy-peer-deps=true` を足す PR #601 を develop にマージした。以降は素の `npm ci` で通る。`.npmrc` が消えていたら再発する。

**Why:** 2026-09-24 の git 同期（478 コミット）の後、素の `npm ci` を案内して失敗した。ERESOLVE は node_modules を消す前に止まるので実害は無いが、手戻りになった。

**How to apply:**
- 依存の入れ直しは素の `npm ci` でよい（main へ deploy される前の古いブランチでは `--legacy-peer-deps` を付ける）。
- 同期の後は `npm run refresh-indexes` も回す。gitignore 済みの doc-meta-index.json が古いと、pre-commit の check-category-curriculum が新規ガイドを「slug 不在」として落とす。
- refresh-indexes はタイムスタンプだけ変わった追跡ファイルを 5〜7 個出す。自分のコミットには含めない。
