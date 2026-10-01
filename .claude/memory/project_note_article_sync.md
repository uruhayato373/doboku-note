---
name: project_note_article_sync
description: "noteは記事単位で同期(本文・カバー・タグを1記事1回)。判定=CI note-sync-live、反映=Mac launchd note-sync。ライブ照合の正しい方法(API body+embedded)とCTAドリフトの教訓を含む"
metadata:
  type: project
---

2026-09-29 から note の公開記事への反映は**記事単位**。種類別（本文だけ・カバーだけ・タグだけ）に流すと同じ記事を何度も「更新する」ことになる、という運営者の指摘で作り替えた（PR #700→#701・#702）。

- 反映計画: `scripts/lib/note-sync-plan.mjs`（`npm run note-sync-plan`）。部品 body/cover/tags と、止まっている理由（aborted・trial-guard・image-missing・boundary・meta）と直し方
- 1 記事 1 回の更新: `note-update-body --sync`（計画から部品を決める）/ `--parts cover,tags`（明示）。本文を触らない記事は有料境界・試し読みラインを動かさない。`note-update-cover` は廃止
- 週次: launchd `com.doboku-note.note-sync`（日曜 3:00・`npm run note-sync:install`）が専用 worktree `.claude/worktrees/note-sync` で `note-sync-routine` を回し、最大 200 記事・配布 PDF は Drive から取り寄せ・マガジンのカバーも登録・`.claude/state/note/sync-log.json` に記録して develop へ push
- CI: `note-sync-live.yml`（月曜 9:00・`check-note-sync`・Issue channel note-sync）は判定だけ
- 台帳: カバーの記録は `note-republish-hashes.json` の `coverHashes` / `magazineCovers`。meta・asset からカバーは外した。見た目を変えたら `note-cover-tokens.json` の `designVersion` を上げる
- 会員特典マガジン内の無料記事は frontmatter `memberTrial: bottom|lock` で公開範囲を決める

**Why:** 9/28 のカバー一括差し替え 699 本のうち 286 本は本文の変更も未反映で、二度更新が必要だった。

**How to apply:** note を直したら原稿を develop へ入れるだけでよい（週次が反映）。急ぐ記事だけ `note-update-body --sync --article <path> --commit`。反映状況の質問には管理画面 `/content/note-sync` か `npm run note-sync-plan` を見て答える。DN-0360 が完了条件（`check-note-sync` exit 0）を持つ。序章 n3eb135ebdff7 は DN-0271（有料ラインの位置の判断待ち）。関連: [[reference_note_cover_v5_rollout]] [[project_asset_audience_routing]]

## 統合: ライブ CTA ドリフトとライブ照合（旧 note_live_cta_drift・2026-06-18 監査）
- 構造: 無料記事を先に公開→funnel CTA を後付け配線（ソース更新）→`note-update-body` 等で再投稿しないとライブに反映されない（ソース→ライブ非同期）。`audit-note-funnel` はソース構造しか見ず「ドリフトなし」と出る→**`audit-note-funnel --live`（D5）**が note API body＋embedded でライブ反映を機械検証（低速のため CI には含めず月次/手動・修復は `note-append-cta`）。配線後に公開した建設部門・2級は健全、最もリッチな源を持つ総監がライブ最弱という逆転が起きた。
- **ライブ照合の正しい方法**（会社PCプロキシ下でも可）: `curl --ssl-no-revoke https://note.com/api/v3/notes/<noteId>` の **`data.body` + `data.embedded_contents` のみ**を見る（CTA は単独行 URL＝リンクカードで embedded_contents に入り body テキストに出ない→body-only は全部✗の誤判定、JSON 全体 grep は自動レコメンドを拾う偽陽性）。パック指紋: コア `m6e7de5e4ea3d`／完全 `m171222175fac`／R8予想集 `m6854c7437d4d`。
- 修復ツール: `note-append-cta`（末尾追記・`--after`/`--before-first-h2`/`--boundary-h2`/`--keep-boundary`/`--force`/`--save-only`・冪等・dry-run 既定。挿入は直後ブロックのスタイルを継承するので段落が続くアンカーを選ぶ）、全文置換は `note-update-body --commit`（1バッチ7-8本か background 推奨・事前に origin/develop の最新へ揃える）。有料記事は保存時に有料境界を再設定し paywall 保持を検証。教訓: 新規回遊エージェントは作らない（機械的ライブ検証で足りる）。
- R8予想有料6本のソースには未差替 placeholder「（マガジン公開後にURL反映）」が残る一方ライブは R8集カード反映済み＝ソースが古いので、現ソースで再投稿するとカードを失う（書戻し済みか要確認）。
