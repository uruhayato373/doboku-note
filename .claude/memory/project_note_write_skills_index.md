---
name: project_note_write_skills_index
description: note 有料記事/マガジンの書込み自動化サブシステムの索引。Playwright+システムChromeの決定的スキル群(create/cover/publish/add/attach-pdf/edit-magazine)、全て disable-model-invocation・非サブエージェント・account=dobokunote ゲート・note API 実体検証。真実源は note-api-verification.md と skills-registry。
metadata: 
  node_type: memory
  type: project
  originSessionId: 253bb7cc-bf21-4dc0-bc9c-cd9422006c87
---

note 有料記事・マガジンへの「書込み（作成/公開/収録/カバー/PDF添付/設定編集）」を自動化する Playwright ブラウザ CLI 群の索引。複数スキルが `[[project_note_write_automation]]` でこの文脈を参照する。

**役割分業（social/ カテゴリ）**: `note-magazine-create`（新規作成）→ `note-magazine-cover`（見出し画像）→ `note-publish`（下書き→公開・有料境界設定）→ `note-magazine-add`（既存記事を収録）→ `note-attach-pdf`（印刷PDFをダウンロードカード添付）→ `note-edit-magazine`（マガジン設定＋単品価格編集）。読取照合は `note-magazine-sync`。

**共通設計**: いずれも channel:'chrome'＋永続プロファイル＋proxy＋ignoreHTTPSErrors で社内プロキシ(TLS傍受)越え（「投稿=Mac 必須」は browser-use 固有の話で Playwright 版は Windows でも可）。**全て `disable-model-invocation: true`（ユーザー起動限定）＋サブエージェント化しない**（決定的フロー＝CLAUDE.md 原則5）。安全弁＝account=dobokunote assert・既定 dry-run/draft・`--commit` でのみ実行・実行後 note 公開 API で実体検証（偽成功ガード）。

**真実源**: 実機確定フロー・DOM セレクタ・文字数制限・有料境界制御は `docs/reference/note-api-verification.md`、各スキルの追加ログは `docs/reference/skills-registry.md`（social 節・2026-06-10〜16 の追加エントリ）。関連: [[project_note_magazine_infra]]（CTA 配置インフラ側）・[[reference_note_status_reconciler]]（公開状態ドリフト）・リンクカード化の実機知見 [[reference_note_card_edit_mode]]。
