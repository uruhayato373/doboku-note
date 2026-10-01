---
name: project-domain-model
description: "事業を8領域で束ねる正本 domains.json（2026-09-26）。サイドバー・backlog [領域:]・schedule・skill/agent domain・文書割当が参照"
metadata:
  node_type: memory
  type: project
  originSessionId: c810297c-e3bd-4390-99c3-3cb4efdff09a
  modified: 2026-09-26T01:21:21.102Z
---

2026-09-26、事業を8領域（戦略/計画/商品/アフィリエイト/サイト/SNS/教材/管理）で束ねた。正本は `.claude/config/domains.json`、考え方は `docs/strategy/14_領域モデル.md`。

**Why:** 収益拡大の打ち手（計測・SEO・商品展開・動線・品質・SNS・アフィリ）が多く、同じ分類で優先順位とスケジュールを持つため。ユーザーはエージェント・スキル・文書まで同じ領域で整理することを求めた。

**How to apply:** 新しいスキル/エージェントは frontmatter `domain:` 必須、新しい docs/reference は domains.json `documents` に割当、backlog カードは `[領域:]` 必須（check-domains / check-backlog-schema が止める）。置き場（ディレクトリ）は作業の種類で、領域のために移さない。横断視点（計測・品質・動線）は独立領域にせず対象領域へ割り振る。年間計画 annual.md は四半期×領域で、日付・受験者数を書かない（[[ssot-no-hand-copies-self-verify]]）。
