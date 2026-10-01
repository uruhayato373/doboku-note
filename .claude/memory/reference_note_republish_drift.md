---
name: note-republish-drift-detection
description: note下書き本文を修正したら再公開が必要をcheck-note-republishで自動検出(source-hash dirty-flag)。CTA以外の全本文変更を追う
metadata: 
  node_type: memory
  type: reference
  originSessionId: 94b0e16f-6b15-405c-a6c9-253c2cfedd07
  modified: 2026-07-22T22:08:23.615Z
---

`npm run check-note-republish`＝note公開記事の**本文再公開ドリフト検出**（2026-07-22新設・source-hash dirty-flag）。公開記事のソース本文ハッシュを `.claude/state/note-republish-hashes.json`（path→hash）に記録し、現ソースと突合して「要再公開」を surface。creds不要・オフライン・決定的。

**自動記録（hook）**: `note-publish.mjs`（初回公開）と `note-update-body.mjs --commit`（フル本文反映）の成功時に `recordPublishedHash` を呼び in-sync 化（共有ロジック＝`scripts/lib/note-republish-hash.mjs`）。→ 再公開すれば drift は自動で消える。

**直交関係**: D5(`audit-note-funnel --live`)=CTAのlive反映を追う／本tool=blockquote/UTM/本文改稿など**CTA以外の全本文変更**を追う。`verify-note-status`=公開状態(published/draft)。3者で相補。

**タグ追跡 v2（2026-07-23 追加）**: 本文とは別に **ハッシュタグ**も追跡（同 state の `tagHashes: {hashtags*.txt→hash}`・`tagsHashRaw` は #除去/重複除去/ソートで順序非依存）。check の出力に「要再公開(タグdrift)」を併記、`--json` に `tagDrift/tagDriftFiles`。in-sync 化＝`note-publish`（Phase10タグ適用時に `recordPublishedTagHash`）と **`note-sync-tags`**（公開済み記事へのタグ差分適用ツール）。**`note-update-body` はタグを適用しないのでタグ hash を記録しない**（本文のみ）。baseline は `--baseline --since <ref>` が本文・タグ両方を seed。2026-07-23 に 90未満220本のタグ補充後 `--since 454885034c^` で 161 hashtags を タグdrift として seed。

**設計上の限界**:
- `note-append-cta`（CTAのみ追記）は非hook＝フル反映しないため。CTA単独反映はD5が担当。
- **cover画像の再生成は対象外**（cover は frontmatter で本文hashに含まれない・将来 noteCoverHash 分離トラック可）。
- note.com上の直接編集は捕捉外（verify-note-status/D5の領域）。

**配線**: package.json `check-note-republish`／週次PDCA(`/weekly-review`)にサーフェサ／SSOT=note-funnel-architecture.md ツール表。pre-commitゲートにはしない（修正→公開の間のドリフトは正常）。**pre-commitで453記事全walkは重いので絶対にゲート化しない**。

**baseline**: `--baseline --since <ref>`で「ref以降 未変更＝現ソース≒live」を in-sync 化、変更済みは ref時点の旧hash記録で drift として残す。2026-07-22に `--since 171f100236` で初期化（synced261/drift192）。管理画面「要再公開」列追加は backlog(低)。関連 [[reference_shared_worktree_autostash_hazard]]
