---
name: cover-ogp-regen-sweep
description: generate-note-covers と ogp --all は全dirを再生成し他記事の成果物を巻き込むため選択ステージ＋restoreで防ぐ
metadata: 
  node_type: memory
  type: reference
  originSessionId: 099fd843-6e8a-41d6-9515-53732a046a10
---

`scripts/generate-note-covers.mjs`（`note-cover` 系）と `npm run ogp -- --all` は**全 dir を走査して再生成**する。自分の対象だけでなく、**他記事/他マガジンのカバー(cover.png/svg)・OGP を tracked変更(` M`) や untracked(`??`) として作業ツリーに残す**（カバーはバイト差で M になることがある）。

**Why:** 並行セッション常態下で、これらを `git add -A` すると他テリトリの成果物を巻き込んで壊す（[[parallel-agent-commit-sweep]] と同型）。実際 note キーワード記事6本制作時、generate-note-covers が 1級2級土木 経験記述・総監 模範論文の cover を13件 ` M` 化した。

**How to apply:**
- **`generate-note-covers.mjs` は位置引数でターゲット指定できる**＝全dir再生成を回避できる（2026-07-19 確認）。`node scripts/generate-note-covers.mjs "<記事dir名の部分文字列>"`（例 `"R8解答速報"`）で1記事だけ生成。完全一致 or 部分一致で解決。**引数無しで走らせない**（585ドラフト全再生成→巻き込み）。出力は記事dir直下でなく `img/cover.png` + `img/cover.svg`。
- `npm run ogp` も slug 必須（`node .../ogp-create.mjs <fullSlug>` or `--all`）。単記事は fullSlug 指定。
- それでも全再生成した場合: コミットは**自分の対象 path のみ明示 `git add`**（`git add -A` 禁止）。`git status --porcelain` で cover.png/svg 副作用を確認し本タスク外は `git restore <path>`（日本語パスは python の porcelain -z パースで確実に）。
