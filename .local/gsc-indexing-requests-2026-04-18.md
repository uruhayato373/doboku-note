---
date: 2026-04-18
type: gsc-indexing-request
related_experiments: EXP-001, EXP-002
total_urls: 8
completed_at: 2026-04-18T12:00:00.000Z
status: completed
---

# GSC 手動 indexing リクエスト（2026-04-18 デプロイ分）

## 実施手順

1. [Search Console](https://search.google.com/search-console) にログイン（プロパティ: `https://doboku-note.com/`）
2. 上部の URL Inspection バーに 1 URL ずつ貼り付け
3. 「インデックス登録をリクエスト」をクリック
4. 完了後、このファイルのチェックボックスを埋める

**注意**: GSC は 1 日 11 件程度で上限に達する（2026-04-14 実測）。本リストは 8 件なので 1 日で完了可能だが、時間を空けてリクエストする。

## 先にやること: sitemap 再送信

Cloudflare Pages デプロイ完了後（2026-04-18 11:55 JST 以降）、以下を実施:

1. GSC → サイトマップ → `https://doboku-note.com/sitemap.xml` を再送信
2. 取得日時が更新されることを確認

## リクエスト対象 URL

### EXP-002: Phase 1 復活ページ（5 件、最優先）

新規公開なので early indexing が最重要。Cloudflare Pages デプロイ完了（200 OK 確認済み）後に順次:

- [x] `https://doboku-note.com/docs/civil-construction-1-reference-hyogo-port-materials`
  - 兵庫県土木工事共通仕様書 第2編 第3章 港湾工事材料
  - 元 GSC: 44 impr / 7.48位 / CTR 0%（復活前）
- [x] `https://doboku-note.com/docs/civil-construction-1-reference-river-abandonment`
  - 廃川処理事務（河川区域変更・廃止時の手続き）
  - 元 GSC: 74 impr / 6.88位（復活前）
- [x] `https://doboku-note.com/docs/civil-construction-1-reference-inverted-siphon`
  - 伏せ越しの設計（近畿地整 設計便覧 第2編 第10章）
  - 元 GSC: 17 impr / 6.65位
- [x] `https://doboku-note.com/docs/civil-construction-1-reference-floodgate`
  - 水門の設計（近畿地整 設計便覧 第2編 第7章）
  - 元 GSC: 16 impr / 9.13位
- [x] `https://doboku-note.com/docs/civil-construction-1-reference-tunnel-02`
  - トンネルの坑口・換気・補助工法（近畿地整 設計便覧 第3編 第8章）
  - 元 GSC: 11 impr / 9.55位

### EXP-001: 既存の pending 3 件

2026-04-14 の初回リクエスト時にクォータ上限で持ち越しになった分:

- [x] `https://doboku-note.com/docs/civil-construction-1-primary-r05-a`
- [x] `https://doboku-note.com/docs/civil-construction-1-textbook-construction-mgmt-overview`
- [x] `https://doboku-note.com/docs/civil-construction-1-guide-earthwork-key-points`

## 完了後の作業

1. 本ファイルのチェックボックスを埋めて commit
2. `.claude/state/experiments.json` の `EXP-001` と `EXP-002` の `pending_user_actions` から完了した URL を削除
3. 14 日後（2026-05-02）に `fetch-gsc-data` 再実行 → EXP-002 の `combined_clicks_28d` を measure
