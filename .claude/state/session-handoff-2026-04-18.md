---
date: 2026-04-18
type: session-handoff
next_session_priority: P1
related_plan: docs/project/22_content-resurrection-plan.md
---

# 次セッション クイックスタート（2026-04-18 ハンドオフ）

**目的**: 次セッション開始時に最初に Read し、即座に作業再開するためのガイド。

## まず Read すべき 3 ファイル

1. **本ファイル** — 次の一手の specifics
2. **`docs/project/22_content-resurrection-plan.md`** — 戦略全体と Group 分類
3. **`.claude/state/experiments.json`** — EXP-001 の pending 状態

余裕があれば:
- `.claude/state/resurrection-candidates/2026-04-18.md`（削除済みコンテンツ全体像）
- `.claude/state/improvements/2026-04-18.md`（GSC/GA4 改善候補分析）

## 今日（2026-04-18）のセッション総括

| 完了項目 | 内容 |
|---|---|
| GSC/GA4 実データ取得 | 28日・90日のクエリ/ページ/日付/チャネル別 |
| metrics-analyzer エージェント新設 | `.claude/agents/metrics-analyzer.md` |
| `/weekly-improve` スキル新設 | `.claude/skills/management/weekly-improve/SKILL.md` |
| レジストリ更新 | CLAUDE.md, agents-registry.md, skills-registry.md |
| 改善候補21件抽出 | `.claude/state/improvements/2026-04-18.md` |
| 削除済み547件の全体像把握 | Group 1/2/3 分類完了 |
| ハブ&スポーク戦略確定 | 試験対策ハブ ← 設計便覧スポーク + 双方向リンク |
| 復活プロジェクト計画書作成 | `docs/project/22_content-resurrection-plan.md` |

## 次セッションの最優先アクション（Phase 1 開始）

### アクション 1: Group 1 S評価 2件の復活

#### 1-A. `common-specs-hyogo/02-03-materials-port.mdx` を復活

```bash
# 削除コミット特定
git log --all --diff-filter=D --follow content/general/common-specs-hyogo/02-03-materials-port.mdx

# 直前のコミットから内容取得
git show <commit>^:content/general/common-specs-hyogo/02-03-materials-port.mdx > /tmp/restored-01.mdx

# 新パスに配置
mkdir -p .local/r2/posts/civil-construction-1-reference-hyogo-port-materials
# mdx-io.mjs で書き込み（CRLF 維持のため）
```

**新 slug 案**: `civil-construction-1-reference-hyogo-port-materials`
**新 URL**: `/docs/civil-construction-1-reference-hyogo-port-materials`

**frontmatter 書き直し案**:
```yaml
---
title: "港湾材料の規格（兵庫県 土木工事共通仕様書）"
seoTitle: "港湾材料の規格 | 兵庫県 土木工事共通仕様書 | doboku-note"
description: "1級土木施工管理技士 港湾分野で問われる港湾材料の規格を、兵庫県土木工事共通仕様書を元に整理。石材・コンクリート・鋼材・繊維材等の試験基準値。"
category: "civil-construction-1"
tags: ["reference", "hyogo-common-specs", "port", "materials"]
exam_relevance:
  - "civil-construction-1-primary-port"
  - "civil-construction-1-secondary-construction-mgmt"
published: true
---
```

**GSC 現状**: 44 impr / 7.48位 / CTR 0%（28日）→ タイトル改善同時実施で即効性

#### 1-B. `river/river-management/04.mdx` を復活

```bash
git log --all --diff-filter=D --follow content/river/river-management/04.mdx
git show <commit>^:content/river/river-management/04.mdx > /tmp/restored-02.mdx
mkdir -p .local/r2/posts/civil-construction-1-reference-river-management-04
```

**新 slug 案**: `civil-construction-1-reference-river-management-04`（より良い slug は content 確認後に決定）
**GSC 現状**: 74 impr / 6.88位

### アクション 2: 内部リンク追加（ハブ → スポーク）

1級土木の textbook / guide から該当ページへの参照リンク追加。候補:

- `civil-construction-1/textbook/` 配下の港湾・河川関連章
- `civil-construction-1/secondary/` 配下の施工管理関連

Grep で既存 textbook 構造を確認してから実装:
```
.local/r2/posts/civil-construction-1/textbook/**/*.mdx
```

### アクション 3: EXP-002 を experiments.json に登録

`/nsm-experiment start` に相当する処理:

```json
{
  "id": "EXP-002",
  "title": "Group 1 S評価 2件の復活 + 試験ページへの内部リンク追加",
  "hypothesis": "common-specs-hyogo/02-03 (44 impr/7位/CTR 0%) と river-management/04 (74 impr/6.9位) を復活し、1級土木 textbook から双方向リンクを張ることで、両ページの CTR を 0% → 3% に上げ、さらに内部リンク経由でハブへの遷移を獲得する。",
  "target_metric": "combined_clicks_28d",
  "target_delta": "0 → 5+",
  "baseline": {
    "common-specs-hyogo/02-03": {"impr": 44, "clicks": 0, "position": 7.48},
    "river-management/04": {"impr": 74, "clicks": 3, "position": 6.88}
  },
  "status": "proposed",
  "actions": [
    "1. git show で削除直前の .mdx を復元",
    "2. 新 slug でフラット URL 配置",
    "3. frontmatter を試験文脈で書き直し",
    "4. 1級土木 textbook から内部リンク追加",
    "5. commit + push → Cloudflare Pages デプロイ",
    "6. GSC sitemap 再送信 + 手動 indexing request",
    "7. 14日後に /nsm-experiment measure EXP-002"
  ]
}
```

## 並行して処理可能な軽作業

### EXP-001 の pending 3 件（GSC 手動 indexing）

ユーザー手動作業のため、並行可能。以下 3 URL を GSC UI で indexing request:
- `civil-construction-1-primary-r05-a`
- `civil-construction-1-textbook-construction-mgmt-overview`
- `civil-construction-1-guide-earthwork-key-points`

完了後は `experiments.json` の `pending_user_actions` から削除。

## やらないこと（明確に）

- **Group 2 のバルク復活**: Phase 4 で章単位実施。次セッションではやらない
- **ReferenceLinks / ExamContext コンポーネント設計**: Phase 2。先に Group 1 復活で検証してから
- **metrics-analyzer Pattern 6 追加**: Phase 3。現状の metrics-analyzer で十分機能中
- **Group 3 の整理**: 凍結方針確定済み、今は触らない

## 成功条件

次セッション終了時に以下が達成されていれば成功:

- [ ] Group 1 S評価 2件が `.local/r2/posts/` に配置され published: true
- [ ] frontmatter が試験文脈で書き直されている
- [ ] 1級土木 textbook からの内部リンクが最低 1 箇所追加
- [ ] commit + push 完了（Cloudflare Pages デプロイ待ち）
- [ ] EXP-002 が experiments.json に `status: running` で登録
- [ ] next_check_date が 14 日後に設定

## 停止ポイント

次セッションの自然な停止ポイント:

- **最小**: 1件復活 + commit まで → 翌セッションで2件目
- **標準**: 2件復活 + frontmatter + 内部リンク + EXP-002 登録（Step 1-3 完了）
- **拡張**: 上記 + GSC sitemap 再送信 + 手動 indexing request（完了後 14 日待機）

**推奨は標準**。拡張は手動作業が混ざるので次々セッションに回しても良い。

## 参考: 今日の戦略判断の履歴

1. GSC/GA4 データで **主戦場と実流入の乖離**を発見
2. 削除済みコンテンツ 547 件の存在を git history で確認
3. ユーザー方針:「試験対策をメインにしつつ、設計便覧を試験に有用な情報として内部リンクで活用」
4. **ハブ&スポーク戦略**に合意
5. トークン効率のため Group 1 から順次着手する方針で保存

## 再開時の推奨プロンプト

```
次セッション開始時:
「/handoff」または
「docs/project/22_content-resurrection-plan.md と
.claude/state/session-handoff-2026-04-18.md を読んで、
Phase 1 の Group 1 S評価 2件の復活から始めて」
```
