---
name: feedback_deploy_discipline
description: "ブランチ運用(doc/バルクはdevelop直・コードはPR)・UI反復中は本番デプロイしない・develop→main昇格の安全手順・MDXコンポーネント3点同時commit"
metadata:
  type: feedback
---

## ブランチ運用規律（性質別運用）
真実源は **CLAUDE.md「ブランチ運用ルール / 性質別運用ガイド」節**（memory は Why の補足）。
- ドキュメント改訂・MDX の小修正 → `develop` 直 push。バルク content（`/exam-keyword-cycle` 等）も既定で `develop` 直 push（`--pr` 指定時のみ週次 PR）。
- コード系（`src/`, `scripts/`, `package.json`, 新規スキル, CI 設定）→ PR 必須（base = `develop`）。
- main マージ（= deploy 発火）は `/deploy` 経由でユーザーがタイミング判断。例外: 本番障害 hotfix のみ `--base main` 直（merge 後 main → develop 逆 merge）。
- 判断基準: 「revert 可能性 5% 以上」「他者/他エージェントとの衝突可能性」のいずれか Yes なら PR、両方 No なら直 push。
- worktree は例外: 2 エージェント以上が物理的に同時実行 AND 継続 30 分以上 AND wall-clock 短縮が必要、のすべてを満たすときのみ。量産バッチは remote agent（`/schedule`）。
- CSS・ビルド絡みは `.next` 削除 → dev 再起動 → ブラウザ hard-refresh で実機確認してから deploy。main への deploy は「ユーザーが視認確認した」または「明示的に deploy 指示」のとき。

**Why（3 段階）:** (1) 2026-04-21 KaTeX フォント修正を 3 段階（PR #55/#56→#57/#58→#59/#60）で main へ deploy し Cloudflare Pages ビルド＋Actions を浪費（「main への小刻み deploy 禁止」）。(2) 2026-04-23 全変更 PR 運用が個人開発で過剰（並行ブランチ 9+・develop 32 コミット遅延・self-merge ばかり）→性質別運用へ。(3) 2026-04-24「起点過去問 1 問 = 1 PR」の過小粒度 PR で worktree が 3+ 孤児化、AV スキャナ負荷で Kernel-Power 41 / BugCheck=0 の OS フリーズ→バルク content も develop 直 push 既定、worktree は例外化。

## UI/デザイン反復中は毎回本番デプロイしない
2026-06-16、総監 r0X-secondary のペルソナ導線修正で、選択肢ラベルに「…してからデプロイ」があったため即 develop→main 昇格したところ、「デザインを大幅修正していきたいので毎回デプロイするのはやめたい」と表明された。develop 反映かローカル `npm run dev`（:3020）で反復し、**本番デプロイはユーザーが明示的に「デプロイして」と言ったときか設計確定時のみ**。develop/ブランチに公開プレビュー URL は無い（main push のみ本番）。完了報告は「develop 反映済み・本番は未デプロイ」と明示し、選択肢にも「デプロイ」を既定で含めない。

## develop→main 昇格の安全手順（並行セッション稼働時・2026-06-03 確立）
- **index ドリフトは無視可**: CI の `npm run build`（cloudflare-deploy.yml）冒頭で `npm run refresh-indexes` が走るので、commit 済み `src/config/*.json`（cross-exam/doc-meta/keyword-relations/pillar-exam-questions/tag-dictionary）の状態はデプロイ結果に無関係。
- **ff 昇格はリモート ref 同士で**: `git push origin origin/develop:refs/heads/main`（origin/main が origin/develop の祖先＝ff のときのみ）。作業ツリーに触れない。
- **並行稼働中の固定スナップショット**: `git worktree add --detach <dir> <origin/develop>` → 新規コミットだけ `git cherry-pick <last-dup>..<HEAD>` → `git push origin HEAD:develop` & `:main`。重複は patch-id で skip。worktree 物理削除が権限で失敗しがち→`git worktree prune`（無害な leftover）。
- **ローカルビルド検証は当てにしない**: `next dev -p 3020` 並行中は `.next` 競合で `npm run build` がハング（16分+/出力0B）。**CI build を権威ゲート**（失敗時は Cloudflare deploy step が走らず本番は前バージョン）。
- **CI deploy が Checkout でハング**する前例（18分）→ `gh run cancel` → `gh run rerun`。
- `gh run watch --exit-status` の exit code を信用せず、`gh run view <id> --json conclusion` と本番 `.pages.dev` の HTTP 実査で確認（watch が exit 0 でも failure のことがあった）。deploy 後は `npm run check-production-ssr`。

## MDX 新規カスタムコンポーネントは3点同時 commit（本番 build の不変条件）
(1) 本体 `src/components/ui/X/X.tsx` (2) `src/lib/component-loader/index.ts` の common 登録 (3) MDX 内 `<X />` 使用。欠けると本番 `next build`（Turbopack）が落ちる（本体欠落=`Module not found`、loader 欠落=prerender `Expected component X to be defined`）。dev は HMR + `SafeMDXRemote` の try/catch で隠すため dev では動く。
- **Why:** 2026-06-02、/tools 3本のデプロイが SatTextLink 本体の untracked と loader 登録漏れで2回連続失敗（prod は last-good 据え置きで tools が404）。
- **How to apply:** 本体+loader+MDX は1コミット。デプロイ前に (a) loader の全 `@/components/...` import 先の実在 (b) 全 `.local/r2/posts/**/article.mdx` の `<Upper>` タグの loader 登録、を突合。`npm run type-check` は Module not found を捕捉しない。共有ツリーでは `git commit -m "..." -- <pathspec>` で原子化（[[feedback_multi_session_concurrent_git]]）。
