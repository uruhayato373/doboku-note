---
name: PE建設部門拡張方針
description: 技術士建設部門ページをPhase 2で追加予定。語彙は「建設部門」で統一（建設業は事実/統計文脈のみ）
type: project
originSessionId: 201b6acb-47d9-49b7-8a46-1de4e4429128
---
Phase 2 で技術士（建設部門）ページを `exam/pe-construction/` に追加する方針（2026-04-15 決定）。

**Why:** 技術士法の公式部門名（総監の5部門 + 20の技術部門の一つ）に合わせることで、Phase 2 の exam/pe-construction/ 追加時に語彙の矛盾を防ぎ、読者層（技術士受験者）との語彙親和性を高める。AdSense E-A-T 観点でも "業界解説" より "専門領域解説" のトーンの方が評価される。docs/project/01_設計思想.md L87 で既に `exam/pe-construction/` フォルダが Phase 2 候補として定義済み。総監で月間10,000UU達成後に本格着手。

**How to apply:**
- 新規作成・リライト時のセクション見出し・フレーミング文では「建設部門」を使う（`.claude/agents/keyword-rewriter.md` に明記済み）
- 事実・統計文脈（例: 建設業の営業利益率 2-6%）は「建設業」を業界分類語として使用してよい
- 法定用語（建設業法・特例・特定元方事業者・日本建設業連合会）は「建設業」のまま温存
- 物理的工事現場の意味では「建設現場」はそのまま
- civil-construction-1/ は対象外（建設業法の法定用語が頻出、206件）
- 既存 Type A 見出し 19 件は 2026-04-15 に正規化済み（pe-comprehensive-management 配下）
- Type B 本文フレーミング（70-90件）は Phase G-2 の段階的リライトで順次更新される

**関連ファイル:**
- `docs/project/01_設計思想.md` L87: `exam/pe-construction/` Phase 2 候補の定義
- `.claude/agents/keyword-rewriter.md`: パターン A / 禁止事項に建設部門優先ルールを明記
- `.claude/agents/cem-advisor.md`: 既に「建設部門対策」を記載
- `.claude/skills/content/pe-exam-guide/SKILL.md`: 既に「建設部門ガイド」を記載
