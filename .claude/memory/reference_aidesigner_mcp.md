---
name: reference_aidesigner_mcp
description: "aidesigner MCP は OAuth 接続済・無料枠でクレジット僅少。generate は要ユーザー確認。inspire+url でデザイン参照生成"
metadata:
  type: reference
---
aidesigner MCP（`https://api.aidesigner.ai/api/v1/mcp`）は OAuth 認証済みで接続（user uruhayato373@gmail.com・scope design/credits/profile）。`/aidesigner` skill から呼ぶ。会社 PC の proxy でも**実行時 API は通る**（whoami/generate 成功実績、2026-06-26）。

**クレジット制約（重要）**: 無料枠 = 月 limit 5・購入残高 0。`generate_design`/`generate_image` は**1回ごとに1クレジット消費**（reference-mode website 分析も 1）。`whoami`/`get_credit_status`/`list_*` は無料。**クレジット消費系は実行前に必ずユーザー確認**（[[feedback_no_confirmation]] と同じ原則）。残数は `get_credit_status` で確認。

**ワークフロー**: `mode:"inspire"|"clone"|"enhance"` + `url` で参照デザイン生成（doboku-note は editorial トーン維持のため基本 inspire）。返却 HTML を `public/` 一時ファイル化→preview :3020 で描画・スクショ→確認後削除、が実物確認の最短。実装時は「デザインシステム層＝精密移植／コンテンツ層＝実データに適応」。OGP がタイトル焼込み済なので mockup の画像サムネは doboku-note では非採用（ランクバッジ＋タイポに置換）。

初適用: PR #274（socialplus inspire run 87d50e23 → BlogDocCard ＋ GA4駆動の人気特集/ランキング）。GA4 人気データは `ga4-page` snapshot → `src/config/popular-pages.json`（`build-popular-pages.mjs`・refresh-indexes 配線）→ `src/lib/popular.ts`。
