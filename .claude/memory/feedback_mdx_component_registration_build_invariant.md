---
name: feedback_mdx_component_registration_build_invariant
description: MDX新規カスタムコンポーネントは「本体ファイル+loader登録+MDX使用」の3点を同時コミットしないと本番buildが落ちる（devは隠す）。デプロイ前に突合監査。
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 64dc3028-9df5-4a8b-af1e-6bf1be76093e
---

MDX で新しいカスタムコンポーネント（例 `<SatTextLink />`）を使うときは、**3点が同時に commit/deploy 上で揃っている**ことが本番ビルドの不変条件:
1. コンポーネント本体ファイル `src/components/ui/X/X.tsx`
2. `src/lib/component-loader/index.ts` の common 登録（`X: (await import("@/components/ui/X/X")).default`）
3. MDX 内の `<X />` 使用

1つでも欠けると本番 `next build`（Turbopack）が落ちる:
- 本体ファイル欠落 → `Module not found: Can't resolve '@/components/ui/X/X'`
- loader 登録欠落 → prerender error `Expected component X to be defined: you likely forgot to import...`

**Why:** dev サーバは HMR + `SafeMDXRemote` の try/catch でエラーを隠すため、ローカル/dev で動いても本番ビルドだけ失敗する（2026-06-02: /tools 3本のデプロイが SatTextLink 本体ファイル未コミット＋loader登録欠落で2回連続失敗。prod は last-good に据え置かれ tools が404のままだった）。原因は最初の SatTextLink コミットで**本体ファイルが untracked のまま add され損ね**、後続で loader 登録も別コミットから抜けていたこと。

**How to apply:**
- 新規 MDX コンポーネントは本体+loader+MDX を**1コミットにまとめる**（別々にすると片方が漏れる）。
- **デプロイ前監査**（決定論・低コスト）: (a) loader の全 `@/components/...` import 先ファイルが実在するか、(b) 全 `.local/r2/posts/**/article.mdx` の `<Upper>` タグが loader に登録されているか、を突合。未登録/未実在が0であることを確認してから push→FF main。
- `npm run type-check` は Module not found を**捕捉しない**（tsの path 解決と build の解決が別）。突合監査が必要。
- 並行エージェント共有ツリーでは `git add -- path` でも共有 index の他者 staged 変更が相乗りする。`git commit -m "..." -- <pathspec>`（オプションは `--` の前）で**pathspec 限定コミット**して原子化する。[[feedback_shared_index_commit_safety]] [[feedback_prevention_over_patching]]
- デプロイ後は `gh run watch --exit-status` の exit code を信用せず、`gh run view <id> --json conclusion` と本番 `.pages.dev` の HTTP 実査で確認する（watch が exit 0 でも run が failure のことがあった）。
