# 22. コンテンツ復活プロジェクト（ハブ&スポーク戦略）

**策定日**: 2026-04-18
**期間**: 2026-04 〜 2026-06（想定 2〜3 ヶ月）
**担当**: 親エージェント（Opus）+ metrics-analyzer / keyword-rewriter

## 背景

2026-04-18 時点で `.local/r2/posts/` は `civil-construction-1` と `pe-comprehensive-management` の 2 カテゴリのみ。一方、git history 上には旧 `content/` 配下に **547 件の .mdx** が削除履歴として存在する。

GSC/GA4 計測で以下が判明:
- 削除済みページ（design-manual / common-specs-hyogo / river-management 等）に現在も**検索流入が発生中**（44 impr / 74 impr 等）
- 主戦場（civil-construction-1 / pe-comprehensive-management）の流入は想定より弱い
- 「試験対策ハブ」という看板と実流入カテゴリに**乖離**がある

## 戦略: ハブ&スポーク + 双方向内部リンク

```
           ┌──────────────────────────────┐
           │  ハブ（試験対策）[NSM対象]    │
           │  civil-construction-1         │
           │  pe-comprehensive-management  │
           └──────┬──────────────────────-─┘
                  │  ↕ 双方向内部リンク
           ┌──────┴──────────────────────-─┐
           │  スポーク（復活）              │
           │  近畿地整 設計便覧            │
           │  兵庫県 共通仕様書             │
           │  試験範囲の実務参照資料        │
           └──────────────────────────────┘
```

### 原則

1. **試験対策がメインコンテンツ**: 新規リソース投下は civil-construction-1 / pe-comprehensive-management に集中
2. **設計便覧は試験文脈で再配置**: frontmatter の category は試験軸に統一、「参考資料」として位置づける
3. **内部リンクで価値を集約**: スポーク → ハブの遷移で NSM を押し上げる
4. **削除せず降格**: 効果の薄いスポークは `published: false` で自然減衰
5. **復活は GSC 実績ベース**: impressions のあるページから優先復活

## Group 分類

### Group 1: 即効性 最優先（GSC ヒット済）

| # | 元パス | GSC 現状 | 試験マッピング | 優先度 |
|---|---|---|---|---|
| 1 | `content/general/common-specs-hyogo/02-03-materials-port.mdx` | 44 impr / 7.48位 / CTR 0% | 1級土木 港湾材料 | **S** |
| 2 | `content/river/river-management/04.mdx` | 74 impr / 6.88位 | 1級土木・技術士 河川 | **S** |
| 3 | `content/general/design-manual/02-10-inverted-siphon.mdx` | 17 impr / 6.65位 | 1級土木 河川構造物 | A |
| 4 | `content/general/design-manual/02-07-floodgate.mdx` | 16 impr / 9.13位 | 1級土木 河川構造物 | A |
| 5 | `content/general/design-manual/03-08-tunnel-02.mdx` | 11 impr / 9.55位 | 1級土木 トンネル | A |
| 6 | `content/general/design-manual/03-15-pedestrian.mdx` | 12 impr / 20.0位 | 1級土木 道路 | B |

### Group 2: 試験範囲直結（バルク復活、セクション単位）

| カテゴリ | 削除数 | 試験対応 |
|---|---:|---|
| `general/design-manual` | 80 | 1級土木・技術士建設部門（河川/道路/トンネル/橋梁） |
| `general/common-specs-hyogo` | 46 | 1級土木 施工管理（兵庫県系） |
| `general/common-specs` | 30 | 1級土木 施工管理（近畿地整系推定） |
| `general/tech-management` | 70 | 1級土木 2次（施工・品質・安全・環境） |
| `general/construction-management` | 55 | 1級土木 2次 経験記述 |
| `general/civil-general` | 39 | 1級土木 一般 |
| `general/civil-planning` | 20 | 1級土木 計画 |
| `general/hyogo-hikkei` | 68 | 1級土木 実務参照（副次） |
| `port/fishery-port` | 47 | 1級土木 港湾 |
| `river/*`（river-chisei, hydraulics 等） | 55 | 1級土木・技術士 河川 |
| `road/road-law` | 98 | 1級土木 法規 |
| `road/*`（road-management 等） | 30 | 1級土木 道路 |

### Group 3: 凍結（復活しない）

| カテゴリ | 削除数 | 理由 |
|---|---:|---|
| `low/*` | 170+ | 行政書士（将来 Phase で再評価） |
| `environment/*` | 4 | 試験直結性低 |
| `exam/civil-construction-1` | 60 | 既存と重複の可能性、要調査 |
| `exam/cem`, `exam/rccm`, `exam/pe` | 10+ | 既存 pe-comprehensive-management と被る |

## ロードマップ

### Phase 1: 基盤構築（Week 1-2）

- [ ] Group 1 S評価 2件復活（common-specs-hyogo/02-03, river-management/04）
- [ ] frontmatter を試験文脈で書き直し（category, tags, exam_relevance 追加）
- [ ] 1級土木 textbook から復活ページへの内部リンク追加
- [ ] EXP-002 として実験登録 → baseline 固定

### Phase 2: コンポーネント化（Week 2-3）

- [ ] `<ReferenceLinks>` コンポーネント設計（ハブ → スポーク）
- [ ] `<ExamContext>` コンポーネント設計（スポーク → ハブ）
- [ ] frontmatter スキーマ拡張（`exam_relevance: string[]`）
- [ ] Group 1 A評価 3件復活 + 双方向リンク

### Phase 3: 計測基盤拡張（Week 3-4）

- [ ] metrics-analyzer に Pattern 6 (Spoke-Link-Opportunity) 追加
- [ ] NSM 再定義（Primary / Secondary / Funnel Metric の3層化）
- [ ] GA4 イベント計測: スポーク → ハブの内部リンクCTR
- [ ] `/weekly-improve` が Funnel Metric を含むように拡張

### Phase 4: バルク復活（Week 4-8）

- [ ] Group 2-A design-manual を章単位で復活（80件 → 4-6章に分割）
- [ ] Group 2-B common-specs 系（76件）を復活
- [ ] Group 2-C tech-management / construction-management（125件）を復活
- [ ] 各セクション復活時に試験ページへの内部リンクを同時整備

### Phase 5: 効果測定・整理（月次）

- [ ] Funnel Metric の前後比較
- [ ] 効果の薄いスポーク（impressions 増加なし）を `published: false`
- [ ] 学びを `docs/project/04_コンテンツロードマップ.md` にフィードバック

## 計測戦略

### NSM 再定義

| 指標 | 定義 | 運用 |
|---|---|---|
| **Primary NSM** | ハブ（試験対策）の Organic Search users | 週次 KPI |
| **Secondary** | スポーク（reference）の Organic impressions | 観察指標 |
| **Funnel Metric** | スポーク → ハブの内部リンクCTR | 月次評価 |
| **Total** | 全体 Organic users | AdSense 連動 |

### metrics-analyzer の Pattern 6 仕様

**Pattern 6: Spoke-Link-Opportunity**

- **条件**: スポーク（`tags` に `reference` を含む）ページで impressions あり、かつ該当ハブページへの内部リンクが未設置
- **出力**: スポーク URL + 推奨リンク先ハブ URL + 現在の遷移率
- **活用**: ハブ&スポーク設計の欠損を自動 surface

### 改善の優先順位（Priority ルール）

```
Priority 1: ハブの Rank-Stuck / High-Impr-Low-CTR 改善
Priority 2: スポーク復活 → ハブへの内部リンク強化（NSM 間接押し上げ）
Priority 3: スポーク単体の title/desc 改善（Funnel Metric 向上）
Priority 4: 効果なしスポークの published: false 降格
```

## 技術的メモ

### 復活手順

```bash
# 1. 削除コミットの特定
git log --all --diff-filter=D --follow content/general/design-manual/02-10-inverted-siphon.mdx

# 2. 削除直前のコミットから内容取得
git show <commit>^:content/general/design-manual/02-10-inverted-siphon.mdx > /tmp/restored.mdx

# 3. 新パスに配置（フラット URL 戦略に従う）
mkdir -p .local/r2/posts/civil-construction-1-reference-inverted-siphon
mv /tmp/restored.mdx .local/r2/posts/civil-construction-1-reference-inverted-siphon/article.mdx

# 4. frontmatter を試験文脈で書き直し
```

### 復活後の frontmatter テンプレート

```yaml
---
title: "伏越工の設計（近畿地整 設計便覧 第2章 河川構造物）"
seoTitle: "伏越工の設計 | 近畿地整 設計便覧 | doboku-note"
description: "1級土木施工管理技士 2次試験・技術士建設部門で頻出の伏越工の設計要点。近畿地方整備局 設計便覧より転載・要約。"
category: "civil-construction-1"
tags: ["reference", "kinki-design-manual", "river-structure", "secondary"]
exam_relevance:
  - "civil-construction-1-secondary-construction-mgmt"
  - "civil-construction-1-primary-river"
published: true
---
```

### 画像資産の扱い

- 旧 `content/**/img/` 配下の画像は R2 に残っている可能性
- 復活時に画像リンクを `.local/r2/posts/{new-slug}/img/` に付け替え
- 初回は `/sync-r2-images` で R2 からローカルに同期確認

### 旧 URL と新 URL の 301 リダイレクト

EXP-001 で既に旧 URL 301 は実装済み（2026-04-13）。復活時は新 URL に揃える前に、旧 URL が 301 で新 URL に向いているか確認。

## リスク

| リスク | 緩和策 |
|---|---|
| 復活ページが低品質で離脱率悪化 | 復活時に必ず現代的な MDX コンポーネント・試験文脈の title/desc で書き直し |
| スポーク側が増えすぎて「便覧集」化 | Phase 5 で定期的に Funnel Metric 未達ページを `published: false` |
| ハブとスポークの category が曖昧化 | 原則「category = 試験軸」「tags = 便覧種別」で厳格運用 |
| AdSense 再申請で薄いサイト判定 | 復活は impressions 実績ベースで厳選、無意味な量産をしない |

## 関連ファイル

- `.claude/state/resurrection-candidates/2026-04-18.md` — 本計画の元データ
- `.claude/state/improvements/2026-04-18.md` — GSC/GA4 改善候補分析
- `.claude/state/experiments.json` — EXP-001（統合ハウスキーピング）ほか
- `.claude/agents/metrics-analyzer.md` — 計測データ分析エージェント
- `.claude/skills/management/weekly-improve/SKILL.md` — 週次改善ループ
- `docs/project/02_事業戦略.md` — v3 事業戦略
- `docs/project/04_コンテンツロードマップ.md` — コンテンツ整備ロードマップ
- `docs/project/13_quality-cycle-architecture.md` — 品質改善サイクル
