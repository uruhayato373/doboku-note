---
name: SVG図版ランウェイ2026
description: 総監キーワードページへのSVG図版追加プラン（Tier 1 = 15本、受験2026-07まで完走予定）
type: project
originSessionId: d0faf20e-9dde-4d76-be3f-2bd9de9b7ada
---
`pe-comprehensive-management` キーワードページに対する SVG 図版整備を週次バッチで進める計画。

**Why**: 運営者が 2026-07 に総監受験予定で、視覚化による理解深化とL2〜L3品質向上を狙う。既にSVGは72個存在するが、単発対応で優先順位が見えていなかったため、Tier 1 の15本を絞り込み週2-3本ペースで投下する仕組みを作った。

**How to apply**:
- 計画書本体: `docs/project/21_svg-illustration-runway-2026.md`（進捗表・スタイルガイド・ワークフロー含む）
- Tier 1 の15キーワード（process-capability-index, design-review, front-loading, concurrent-engineering, pdca-cycle, gantt-chart, control-limits, activity-abc, fmea, hazop, heinrich-law, redundancy-safety, swot-analysis, maslow-hierarchy-of-needs, herzberg-two-factor-theory）
- 週次バッチ運用: Claude下書き → ユーザーがブラウザでレビュー → 承認後commit → 進捗表更新
- SVGは `.local/r2/posts/pe-comprehensive-management/{slug}/img/{slug}-{purpose}.svg` 形式で `<ArticleImage>` タグ（caption なし、alt のみ）で記事に挿入
- スタイル規約: viewBox柔軟、#333本線、#666補助、#8a8a8aフィル、#b22234アクセント（`quality-control/qc-seven-tools.svg` がテンプレ）
- 次に着手するときは計画書の「⬜ 未着手」行から上位2〜3本を選ぶ
