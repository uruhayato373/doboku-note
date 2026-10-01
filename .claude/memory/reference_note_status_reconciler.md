---
name: reference_note_status_reconciler
description: "note のステータス・再公開ドリフト・タグの照合系。noteStatus draftドリフト(verify-note-status)・本文/タグ再公開ドリフト検出(check-note-republish)・タグ入力規則(- . / 不可・上限99・403)"
metadata:
  type: reference
---
note 記事 frontmatter の `noteStatus` が「公開済みなのに draft」のままドリフトする問題の原因と恒久対策（2026-06-21 実装）。

**原因**: `scripts/note-publish.mjs` の writeBack は元々 `noteUrl`/`noteId`/`notePublishedAt` のみを書き戻し、`noteStatus` は対象外だった。さらに予約投稿は go-live が note サーバ側で後刻に起きるためローカル書戻しの機会が無い。**実シグナルは「noteUrl 非空 OR noteStatus に publish」の OR**（note-lint.mjs / .claude/scripts/check-note-3set.mjs）なので、noteUrl さえ入れば機能は壊れず、noteStatus の嘘は赤くならない＝検知されず放置される（2026-06-21、建設部門 無料入口16本で実害化）。

**対策**:
- writeBack に noteStatus 行追加（即時=published / 予約=reserved）。
- `npm run verify-note-status`（`scripts/verify-note-status.mjs`）= noteStatus 行を持つ記事のみ（~95本）を note 公開API と突合し drift 検知、`-- --fix` で既存行を是正。連続取得はレート制限されるため throttle(0.4s)+retry 必須。noteStatus 行が無い記事（マガジン収録記事等＝noteUrl管理の別規約）には field 注入しない。
- weekly-review skill の Agent B に配線（週次で自己修復）。creds 不要・network依存ゆえ CI ゲート非対象（[[feedback_session_start_git_sync]] 系の verify-note-magazines / audit-note-funnel --live と同系統）。

関連: [[feedback_platform_only_artifacts_destroyed_by_bulk_ops]]（note公開状態の制約）。

**--fix の偽成功（2026-09-19）**: frontmatter 正規表現が LF 専用（`---\n`）で、Windows 由来の CRLF 記事（pack-lineup の会員記事・学科09・W8）は 1 バイトも書き換わらないまま「是正済み」と数えられていた＝書き込み版の「検査ゼロを PASS と呼ばない」。修正: 置換を `scripts/lib/note-status.mjs` の `setNoteStatus`（`\r?\n`）へ集約し、`--fix` は `next !== raw` のときだけ「是正」と数え、書き換え不能は UNFIXED として exit 1（`tests/verify-note-status-crlf.test.mjs`）。**書き換え系スクリプトは「対象件数」でなく「実際に差分が出た件数」を報告させる**。

---

## 再公開ドリフト検出 check-note-republish（source-hash dirty-flag）

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

---

## タグ入力欄の仕様と一括同期の403罠

2026-09-23 に `note-sync-tags --prune` で約900本を一括同期したときの実測。

- **入力できない文字**: `-` `.` `/` を含むタグは Enter しても chip にならず入力欄に残る（i-Construction・Park-PFI・地方創生2.0・BIM/CIM）。`_` は可（Society5_0・BIM_CIM）。原稿では `_` に置き換え、`check-note-hashtags` が止める（PR #590）
- **大文字小文字を区別しない**: 原稿 `GX` を足してもライブは既存の `gx` のまま。比較は小文字キーで行う（`scripts/lib/note-tag-plan.mjs` の tagKey）
- **上限99**: 埋まっているとタグを1つも足せない。原稿に無いタグを外す `--prune` で解消（PR #586）
- **会員限定記事**: 未ログインの公開 API はタグを空で返す。ログイン済みブラウザの `ctx.request` なら著者として読める（24本で確認）
- **403 の罠**: 公開 API を 0.25 秒間隔で約900回読んだ直後、note.com 全体（ページも）が CloudFront 403 になった。約1分で解除。一括は1秒間隔（`--throttle-ms`）にし、403 が続いたら止める
- 公開設定のタグ chip は `<button>#タグ<span aria-label="削除">`。textContent 末尾に改行が付くので完全一致の正規表現は空白を許す

関連: [[reference_note_update_body_gotchas]] [[reference_note_status_reconciler]]
