---
name: note-cover-v5-rollout
description: note カバー V5（キャラクター）全量差し替えの手順と罠 — 共有 inventory でポーズ固定・manifest 照合→差分再生成・R2/Drive 供給・公開 API 前後スナップショット・8GB Mac の Playwright メモリガード
metadata: 
  node_type: memory
  type: reference
  originSessionId: c274521b-ecbc-4488-8eb7-4f273bcd5bcb
  modified: 2026-09-17T12:42:43.305Z
---

> **2026-09-29 以降の仕組み**: 一括差し替えツール・CI 供給・`note-update-cover` は廃止。カバーは記事単位の同期の一部（[[project_note_article_sync]]）。判定は CI `note-sync-live.yml`、反映は Mac の launchd `note-sync`。デザインを変えたら `note-cover-tokens.json` の `designVersion` を上げる。下の罠（editor のカバー削除先行・8GB Mac のメモリガード・マガジン同定）は今も有効。

2026-09-17 の note カバー V5 全量差し替え（PR #516・`claude/note-cover-v5-rollout`）で確立した手順と罠。

**手順の骨格**
1. 生成器は `scripts/lib/note-cover-inventory.mjs` で記事＋マガジンを 1 つの一覧にし、全件にポーズを割り当ててから絞る。`generate-note-covers <dir>` / `generate-magazine-covers <id>` / `note-character-covers --filter` の 3 入口で画像 hash が一致することを確認してから配線した（refactor 後の決定性検証はこれで足りる）
2. 一括生成の `manifest.json`（入力 sha256・ポーズ・出力 sha256）を最新原稿と照合し、新規・原稿変更・**隣接によるポーズ変更**だけ再生成（scratchpad `reconcile-covers.mjs`）。原稿の superset は別セッションの feature ブランチ（main worktree）で、develop に無い記事は `git show <branch>:<path>` で article.md だけ一時展開して CLI を通し、後で削除する
3. 供給は `asset-offload --group note-cover-png --include-untracked --commit`（記事→private R2）と `drive-vault-sync --group note-magazine-cover-png --commit`（マガジン→Drive）。worktree には `.env.local` が無いので main から symlink。台帳の note-cover 旧エントリは full 形式→lean 形式に揃い diff が大きく見えるが正常
4. 公開反映の前後は公開 API でスナップショット（`fetchNoteDetails`: status/price/eyecatch/is_limited/can_read、マガジンは creators contents の cover）。「カバー変更・価格/公開範囲不変」を機械で突合し、CLI の ok= だけを完了扱いにしない

**罠**
- `_cover.png` が `magazines/` 直下に無いマガジン（メンバーシップ特典）は gitignore にも Drive group にも該当しなかった → どちらも `content/note/**/_cover.png` に広げた
- `civil-1-anki` / `civil-2-anki` の `_cover.png` は単発記事の名残で note マガジンは存在しない（保留扱い）
- マガジン dir → live key は `note掲載文.txt` の説明文先頭一致（verify-note-magazines と同じ）。一致しない河川コンサル / ゼネコンは `note-magazines.ts` の noteUrl で同定
- 8GB Mac では `playwright-launch.mjs` の空きメモリガード（既定 2048MB）に必ず当たる。`DOBOKU_PW_MIN_FREE_MB=1024` で下げる（`SKIP_GUARD` で並行ブラウザ検知まで外さない）
- 共有 `.git/hooks` が別 worktree の新しい版だと pre-commit が「古い」で止まる。古い側から install すると相手のゲートを剥がすので、`install-pre-commit.mjs` の `HOOK_CONTENT_BODY` を抜き出して手で全通しし `--no-verify`（[[reference_worktree_hook_freshness_false_positive]]）
- `note-update-cover` は 1 件 ≈ 35 秒・`note-magazine-cover` は 1 誌 ≈ 50 秒。858 記事で 8 時間超。25 件 chunk で逐次（共有プロファイル・並列不可）。手順は `npm run note-cover-rollout -- reconcile/snapshot/plan/run/verify/record` に集約（作業場 `.tmp/note-cover-rollout/`）
- **note editor はカバー削除を「更新する」より前に live へ書く**。CLI の「新カバー未確認→中断」は coverless を防げない（DRY も同様）。verify で eyecatch を必ず突合し、coverless は単発再実行（measurement-incidents 2026-09-18）
- 長時間 run はバッテリー切れ・スリープ・テザリング断で止まる。AC 給電＋`caffeinate -i -s -w <pid>`＋nohup。`/private/tmp` の scratch は再起動で消えるので手順は repo のスクリプトに置く
- 2026-09-18 時点の進捗: マガジン 65/65 完了、記事 342/858（残 486＋失敗 30 の再実行）。再開は `docs/handoffs/2026-09-18-note-cover-v5-live-rollout.md`

関連: [[reference_note_cover_live_gotchas]] [[reference_note_status_reconciler]]

## 2026-09-19 完走時の追記
- 公開反映 856/858・マガジン 65/65 で完了（記録 `.claude/state/note/cover-rollout/2026-09-17.json` status: done）。PR #516 は develop 着地・deploy 済み
- **マガジン内の ¥100 記事**（総監記述式 序章 2 本）は editor に有料エリア設定が無く `note-update-cover` が「更新する」を見つけられず CLI は fail になるが、editor はカバーを「更新する」前に live へ書くので **API の eyecatch 変化＋price/status 不変で完了と判定**する
- 数時間の runner は Claude Code セッションと運命を共にする → `launchctl submit`（[[reference_background_jobs_die_with_session]]）。ただし submit ジョブは終了後に**自動再起動**するので、完了を確認したら即 `launchctl remove`（2 周目が走り W8 収録が二重実行される寸前だった）
- 保留 12（予約 7・下書き 3・noteId 無し 2）は公開後に差し替え＝DN-0256
