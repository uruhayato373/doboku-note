---
paths:
  - "docs/**"
  - ".claude/knowledge/**"
---

# docs/ と .claude/knowledge/ の .md を書くときの規約

- Obsidian callout（`> [!note]` 等）の運用は [docs-markdown-style.md](../knowledge/reference/docs-markdown-style.md) 準拠（推奨 4 タイプ限定。MDX `<Callout>` とは別系統で混同しない）
- `.claude/knowledge/reference/*.md` は YAML frontmatter `title:` 必須（[README.md](../knowledge/reference/README.md)「frontmatter スキーマ」）。ファイルを足したら同 README の「ファイル一覧」に行を足す（CLAUDE.md の索引には足さない）
- `docs/` は人が読む恒久的な戦略・設計・判断だけ（担当・進捗・実装順序は書かない）。領域の入口は [docs/README.md](../../docs/README.md)、置き場の判断フローと `docs/`↔`content/`↔`.claude/` の境界は [information-architecture.md](../knowledge/reference/information-architecture.md)（`npm run check-information-architecture` が廃止した置き場への逆戻りを止める）
- 1 トピック = 1 SSOT。重複が必要なら片方を正典にし、もう片方は 1 行の参照にする。doc を移動・改名・統廃合したら参照を同一 commit で全更新する（`npm run check-doc-refs`・`npm run check-relative-links`。例示パスはプレースホルダで書く、廃止台帳行は `<!-- doc-ref:ignore -->`）
- 決定が複数文書に散在するクラスタは `.claude/config/policy-anchors.json`（`npm run check-policy-anchors`）で横展開もれを surface する
- 完了済み・重複・肥大した doc は定期棚卸し（`npm run check-doc-lifecycle` → `/doc-declutter`）。書く時点で埋め草・同内容の反復・定型の前置きで太らせない
- 戦略の入口: [docs/strategy/README.md](../../docs/strategy/README.md)（トピック軸×資格軸の 2 軸ナビ）→ `docs/strategy/01_プロダクト戦略.md`（5 問フレームワークの北極星）・`docs/strategy/03_事業戦略.md`・`docs/strategy/04_収益化戦略.md`（note 個別価格・リリース計画は各試験の noteコンテンツ計画.md）。SNS は `docs/marketing/01_SNS集客戦略.md`・`docs/marketing/02_チャネル動線設計.md`
- GSC/GA4 Playwright UI CSV 取得の実装指示書 → [gsc-ga4-playwright-automation-spec.md](../../docs/operations/gsc-ga4-playwright-automation-spec.md)
- 計測事故・外部検証の罠を新たに知ったら [measurement-incidents.md](../knowledge/reference/measurement-incidents.md) へ「現象 / 根本原因 / 検出経緯 / 対策 / 教訓」で追記（時系列逆順）。作業規律の教訓は memory の feedback
- `docs/handoffs/` `docs/reviews/` は todo-plans ルール（抽出→削除・point-in-time）に従う
