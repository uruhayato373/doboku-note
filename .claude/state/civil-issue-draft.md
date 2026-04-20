# Civil textbook cycle — Round 1（リライト 11件）

## 概要

1級土木施工管理技士（civil-construction-1）の textbook/guide 品質サイクル。`/civil-textbook-cycle --mode score` の結果から weighted < 2.5 のページをリライト対象として列挙。

| 指標 | 値 |
|---|---|
| 全対象 | 40件 |
| 合格（weighted ≥ 2.0）| 30件 |
| 要修正（weighted < 2.5）| 11件 |
| 平均 weighted | 2.35 |

## 弱点軸の出現頻度（対象 11件、score ≤ 1）

- **reference**: 10件
- **mobile**: 6件

## Guide（6件）

- [ ] `guide-concrete-key-points` — weighted 1, weak: ["mobile","reference"]
- [ ] `guide-concrete-maintenance` — weighted 1, weak: ["mobile","reference"]
- [ ] `guide-earthwork-key-points` — weighted 1, weak: ["mobile","reference"]
- [ ] `guide-four-management` — weighted 1, weak: ["mobile","reference"]
- [ ] `guide-law-key-points` — weighted 1, weak: ["mobile","reference"]
- [ ] `guide-strategy` — weighted 1, weak: ["mobile","reference"]

## Textbook（5件）

- [ ] `textbook-explosives-act` — weighted 1, weak: ["reference"]
- [ ] `textbook-law-compliance` — weighted 1, weak: ["reference"]
- [ ] `textbook-standard-contract` — weighted 1, weak: ["reference"]
- [ ] `textbook-surveying-basics` — weighted 1, weak: ["reference"]
- [ ] `textbook-quality-overview` — weighted 2.2, weak: []

## 運用

1. `/civil-textbook-cycle --mode rewrite --threshold 2.5 --max N` で `civil-textbook-rewriter` を起動
2. リライト後 `/civil-textbook-cycle --mode verify` で再評価
3. `reviewStatus: approved` にして PR 作成 → チェックボックス更新
4. 全件完了でクローズ

## 詳細データ

- スコア真実源: `.claude/state/civil-quality-scores.json`
- レビュー待ち一覧: `.claude/state/civil-review-queue.md`
- 評価ルーブリック: `.claude/agents/civil-construction-review.md`
- Generator: `.claude/agents/civil-textbook-rewriter.md`
- Orchestrator: `/civil-textbook-cycle`

生成: `/civil-textbook-cycle --mode issue` at 2026-04-20T05:53:27.909Z
