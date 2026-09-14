---
name: feedback_pdf_on_demand_only
description: マガジンの紙用PDFは必要時のみオンデマンド生成。magazine-build の検証工程で自動生成しない
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9cae566a-85b9-4506-8f2a-47a54d8143a7
---

note マガジンの紙用 PDF（`scripts/magazine-to-pdf.mjs`）は、マガジン作成・配線のたびに自動生成しない。**必要なとき（実際に印刷/PDF納品する時）だけ生成する**。

**Why:** ユーザー指示（2026-05-29）。マガジン本体・配線の検証に PDF 実生成は不要で、Chrome ヘッドレス起動など毎回のコストが無駄。

**How to apply:** マガジン実装の検証は「PDF spec の JSON 妥当性（`JSON.parse`）＋ include の from/to 見出しが記事に存在するか（grep）」で行い、`node scripts/magazine-to-pdf.mjs` は走らせない。PDF spec ファイル自体は将来のオンデマンド生成用に正しい JSON で残す（`to` の正規表現は `"^\\*\\*関連リンク"` のように JSON エスケープに注意、heredoc だと `\\` が `\` に潰れて JSON 不正になるので Write ツールで書く）。[[project_civil2_keiken_essay_line]]
