---
name: related-keywords-prefix
description: "RelatedKeywords コンポーネントは bare slug を PE に自動補完する。civil-construction-1 ページでは必ず `civil-construction-1-` 接頭辞を明示すること。"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 44e9c36d-b5e1-4334-9fbe-77b46ff63b9b
---

`src/components/ui/RelatedKeywords/RelatedKeywords.tsx` の `buildHref` は、`pe-comprehensive-management-` または `civil-construction-1-` で始まる slug はそのまま使い、それ以外は **無条件で `pe-comprehensive-management-` を補完する**設計。よって:

- **PE ページ**: bare slug でよい（既定で PE 補完）
- **civil ページ**: 必ず `civil-construction-1-` 接頭辞を明示。bare のままだと PE 配下を指す URL になり 404

**Why:** 2026-05-16 に `fix-civil-related-keywords-prefix.mjs` が「bare slug 規約」を根拠に civil 42 ページから接頭辞を機械的に剥がし、240 リンクが全て 404 化。原因は lint 9-9 が PE 用規約（bare）を civil に誤適用していたこと。2026-05-17 に復旧コミット `79b00f8d3` で修復。

**How to apply:**
- civil-construction-1 配下の MDX に `<RelatedKeywords>` を書く／自動生成するときは、必ず `civil-construction-1-` 接頭辞を含める
- 「bare slug が規約」と書かれたスクリプトやドキュメントは civil 適用前提を疑う
- 「内部リンク密度」「PE と同パターン」を理由に civil 用の自動化を派生させるときは、コンポーネントの fallback 仕様を先に確認する
- 関連: lint 9-9 は `civil-construction-1-` を REDUNDANT_PREFIXES から除外済み（2026-05-17）
