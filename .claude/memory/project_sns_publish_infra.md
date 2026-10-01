---
name: sns-publish-infra
description: X予約投稿は280字違反で長期間 reject されていた。check-x-length.mjs と publish-ig.mjs の運用基盤を 2026-05-17 に整備
metadata: 
  node_type: memory
  type: project
  originSessionId: 69ca72e4-67ba-4530-a605-5691cc8a57c3
---

X / Instagram の投稿基盤を 2026-05-17 に整備完了。

## X（Twitter）

- **真因**: 30 ドラフト 208/216 ツイートが X の 280 weighted chars 上限超過で予約投稿 reject されていた
- **追加**: `scripts/check-x-length.mjs`（日本語=2/URL=23/上限280 の重み付きチェッカー、exit 1 で CI 組込可）
- **追加**: `docs/sns/x/README.md`（テンプレ規約: ハッシュタグ2個固定 / URL 1本 / CTA は `→` のみ / 表禁止 / 本文 75〜90 日本語字目安）
- **リライト**: 30 ドラフト × 216 ツイート全件圧縮済み（5 並列サブエージェント、commit `a136200d2`）
- **既存**: `publish-x.ts` (Playwright)、`gen-x-card.mjs` (PNG 生成)

## Instagram

- **基盤**: `.claude/scripts/lib/sns-common/media-uploader.mjs` の `postInstagramCarousel` / `postInstagramReel`（Meta Graph API v21.0）が既存
- **追加**: `scripts/publish-ig.mjs`（CLI、R2 アップロード → caption 自動生成 → publish → status.json 更新、dry-run 動作確認済）
- **追加**: `docs/sns/instagram/README.md`（投稿手順・API 制約・トラブルシューティング）
- **在庫**: 生成済み 727 ドラフト（充分）
- **R2 パス規約**: `storage.doboku-note.com/sns/instagram/<YYYY-MM-DD-slug>/carousel/*.png`
- **API 制約**: 予約投稿ネイティブ非対応 → 即時投稿のみ、外部 cron で対応（GitHub Actions schedule = T-004 で未実装）
- **トークン期限**: 60 日。`META_LONG_LIVED_TOKEN` 期限切れ時は `node .claude/scripts/meta-auth.mjs` 再実行

**Why**: ユーザーが「X 予約投稿がうまくいかない、おそらく文字数」と仮説提示 → 検証で 208/216 違反確定。IG は「投稿を増やしたい・API 利用したい」とのことで Graph API 経路を構築。

**How to apply**:
- 新規 X ドラフトを書いた直後に `node scripts/check-x-length.mjs --over` で確認
- IG 投稿は `node scripts/publish-ig.mjs <date>-<slug> --dry-run` → 本番の順
- トークン切れに気付いたら meta-auth.mjs 再実行をユーザーに依頼（ブラウザ操作必須）

関連: [[sns-drafts-directory]] / [[sns-automation-umbrella]]
