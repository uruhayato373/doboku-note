# note カバー V5 全量差し替え — 公開反映の続き（引き継ぎ）

作成 2026-09-18 / PR #516（`codex/note-cover-character-v5` ← `claude/note-cover-v5-rollout`）

> [!important] 生成・供給・マガジンは完了、記事の公開反映が 342/858 で中断
> 回線が不安定（テザリング・断続断）で 2026-09-18 07:xx JST に運営者判断で停止した。
> 記録は `.claude/state/note/cover-rollout/2026-09-17.json`（status: in-progress）。
> **coverless の記事は 0 件**（中断前に公開 API で確認・復旧済み）。

---

## 1. 済んでいること

| 段階 | 結果 |
|---|---|
| 生成器の接続（PR 本文参照） | `generate-note-covers` / `generate-magazine-covers` / CI が V5 描画。3 入口で画像 hash 一致 |
| 照合・再生成 | manifest 921 → 最新原稿（feat/pack-lineup 1cd3afb4f）と照合し 37 件だけ再生成 → 記事 870＋マガジン 67＝937・失敗 0 |
| 供給 | 記事 → private R2 870/870（`asset-offload`）、マガジン → Drive vault 67/67（`drive-vault-sync`）。台帳は commit 済み |
| マガジン公開反映 | 65/65 OK（公開 API で cover 変化・price/status 不変を確認）。保留 2 = `civil-1-anki` / `civil-2-anki`（単発記事の `_cover.png`・note マガジン無し） |
| 記事公開反映 | **342 OK / 30 失敗 / 486 未着手 / 保留 12**。失敗 30 の内訳: 回線断の `page.goto` 24（カバー削除前に落ちる＝live は旧カバーのまま無傷）、有料境界 line 未確認の ABORT 6（新カバーは live に載っており price も不変。「更新する」だけ未押下） |

保留 12 の理由は記録 JSON の `live.articles.held`（予約公開中 7・下書き 3・noteId 無し 2）。

## 2. 残作業 — 安定した回線で再開する

作業場 `.tmp/note-cover-rollout/`（worktree `.claude/worktrees/note-cover-v5-rollout`）を**消さない**。
`generated/manifest.json`・`live-before.json`・`live-plan.json`・`logs/` から未 OK を機械で拾う。

```bash
cd .claude/worktrees/note-cover-v5-rollout
# 前提: 他セッションの note 自動化（Chrome・共有プロファイル）が動いていない / AC 給電 / 安定回線
pgrep -fl "note-update-cover|note-publish|note-magazine-cover"
caffeinate -i -s -w $$ &   # または runner の pid に -w
DOBOKU_PW_MIN_FREE_MB=1024 npm run note-cover-rollout -- run       # 未 OK の記事だけ 25 件 chunk・逐次・最大 6 ラウンド
npm run note-cover-rollout -- verify                                # 公開 API で eyecatch 変化・price/status/is_limited 不変
npm run note-cover-rollout -- record --date 2026-09-17 --status done
git add .claude/state/note/cover-rollout/2026-09-17.json .claude/state/note-republish-hashes.json
```

- 1 記事 ≈ 40 秒。残り 516 件で 6 時間弱。runner は nohup で回し、セッションが切れても続く
- `run` は回線断で 1 件も記事に到達しない chunk を 60 秒後に最大 5 回やり直し、記事単位の失敗は次ラウンドで拾う。1 ラウンド進捗 0 で止まる
- **「新カバー未確認」で止まった記事は必ず `verify` で eyecatch を見る**。note の editor はカバー削除を「更新する」より前に live へ書くので、中断＝安全ではない（[measurement-incidents 2026-09-18](../../.claude/knowledge/reference/measurement-incidents.md)）。coverless なら同じ記事を単発で再実行（`node scripts/note-update-cover.mjs --article <path> --commit`）
- 8GB Mac は `DOBOKU_PW_MIN_FREE_MB=1024` が無いと起動ガードで止まる

### この checkout に無い原稿（22 本）

`feat/pack-lineup-2026-10` にしか無い記事は `article.md` だけを一時展開してある（`.tmp/note-cover-rollout/materialized-articles.txt`・git 未追跡）。再開時も残しておく。終わったら削除（`git status` に出る `??` の 9 dir）。#515 が develop に入れば不要になる。

## 3. 終わったら

1. `record --status done` → commit・push（PR #516 の本文「公開反映」節を実数で更新）
2. 一時展開した 22 記事を削除、`.tmp/note-cover-rollout/` は記録 JSON が commit 済みなら破棄可（`generated/` 684MB）
3. worktree を `git worktree remove`、Codex worktree（`~/.codex/worktrees/note-cover-v5-20260916`）のローカル `codex/note-cover-character-v5` は origin より古いので `git merge --ff-only origin/codex/note-cover-character-v5`
4. 本 handoff を削除（todo-plans ルール）
