---
name: construction-management-import
description: >
  土木施工管理技術テキスト（施工管理・法規編）PDFをMDX変換する。Use when user asks to [施工管理テキスト, /construction-management-import].
---

# /construction-management-import — 土木施工管理技術テキスト（施工管理・法規編）PDF→MDX変換

## 概要

「土木施工管理技術テキスト（施工管理・法規編）」（全7章、327ページ）のPDFをMDXに変換し、`content/general/construction-management/` に取り込むスキル。1級土木施工管理技士試験対応の教科書。

**全章変換完了済み（2026-03-27）。** 照合・修正が必要な場合にこのスキルを参照する。

## 使い方

```
/construction-management-import status       # 変換状況を一覧表示
/construction-management-import verify 5     # 第5章のMDXをPDFと照合
```

## ソース情報

- **文書名**: 土木施工管理技術テキスト（施工管理・法規編）
- **所在**: `/Users/minamidaisuke/obsidian/attachments/奥義/01_土木共通/03_積算・施工/90_1級土木施工管理技士試験/土木施工管理技術テキスト（施工管理・法規編）/`
- **構成**: 7章、章別PDF
- **総ページ数**: 327ページ

## 文書構成と変換状況

| # | 章 | タイトル | ページ | 出力ディレクトリ | ファイル数 | 行数 | 状態 |
|---|---|---|---|---|---|---|---|
| 1 | 第1章 | 施工管理の概要 | 6 | `overview/` | 1 | 144 | **完了** |
| 2 | 第2章 | 施工計画 | 43 | `construction-plan/` | 11 | 1,200 | **完了** |
| 3 | 第3章 | 工程管理 | 20 | `project-management/` | 3 | 612 | **完了** |
| 4 | 第4章 | 品質管理 | 25 | `quality-management/` | 6 | 784 | **完了** |
| 5 | 第5章 | 安全管理 | 128 | `safety-management/` | 14 | 3,126 | **完了** |
| 6 | 第6章 | 環境保全管理 | 55 | `environmental-management/` | 11 | 1,591 | **完了** |
| 7 | 第7章 | 関係法規 | 50 | `related-laws/` | 9 | 1,413 | **完了** |

**合計**: 327P、55ファイル、8,870行

## ファイル一覧

### 第1章 施工管理の概要（6P → 1ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `overview/construction-management-overview.mdx` | 施工管理の概要 | 144 |

### 第2章 施工計画（43P → 11ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `construction-plan/construction-planning-overview.mdx` | 施工計画の概説 | 288 |
| `construction-plan/preliminary-survey.mdx` | 事前調査 | 121 |
| `construction-plan/basic-plan.mdx` | 基本計画 | 53 |
| `construction-plan/schedule-planning.mdx` | 工程計画 | 280 |
| `construction-plan/procurement-planning.mdx` | 調達計画 | 31 |
| `construction-plan/temporary-facilities-planning.mdx` | 仮設備計画 | 73 |
| `construction-plan/safety-management-plan.mdx` | 安全管理計画 | 76 |
| `construction-plan/quality-management-plan.mdx` | 品質管理計画 | 56 |
| `construction-plan/cost-management-plan.mdx` | 原価管理計画 | 77 |
| `construction-plan/environmental-conservation-plan.mdx` | 環境保全計画 | 101 |
| `construction-plan/other-management-plans.mdx` | その他の管理的事項に関する計画 | 44 |

### 第3章 工程管理（20P → 3ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `project-management/process-management-overview.mdx` | 工程管理の概説 | 171 |
| `project-management/process-chart-types.mdx` | 工程図表 | 225 |
| `project-management/network-diagram-creation.mdx` | ネットワーク式工程表の作成手順 | 216 |

### 第4章 品質管理（25P → 6ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `quality-management/quality-management-overview.mdx` | 品質管理の概説 | 153 |
| `quality-management/quality-management-methods.mdx` | 品質管理の方法 | 110 |
| `quality-management/process-capability-chart.mdx` | 工程能力図 | 28 |
| `quality-management/histogram.mdx` | ヒストグラム | 221 |
| `quality-management/control-charts.mdx` | 管理図（シューハート管理図） | 211 |
| `quality-management/quality-inspection-methods.mdx` | 品質検査の方式と品質管理の例 | 61 |

### 第5章 安全管理（128P → 14ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `safety-management/labor-accidents.mdx` | 労働災害 | 129 |
| `safety-management/construction-safety-prevention.mdx` | 建設工事の労働災害防止対策 | 411 |
| `safety-management/labor-safety-law-overview.mdx` | 労働安全衛生法の解説 | 164 |
| `safety-management/safety-measures-civil-engineering.mdx` | 土木工事の安全対策 | 827 |
| `safety-management/safety-reinforced-concrete.mdx` | 鉄筋・コンクリート工事の安全対策 | 68 |
| `safety-management/safety-earthwork-foundation.mdx` | 土工工事・基礎工事の安全対策 | 283 |
| `safety-management/safety-construction-machinery.mdx` | 車両系建設機械・クレーン等の安全対策 | 161 |
| `safety-management/safety-tunnel.mdx` | 山岳トンネル工事の安全対策 | 236 |
| `safety-management/safety-bridge-compressed-air.mdx` | 橋梁工事・圧気工事・コンクリート造の工作物の解体等工事の安全対策 | 280 |
| `safety-management/safety-oxygen-deficiency.mdx` | 酸素欠乏等に関する安全対策 | 139 |
| `safety-management/safety-dust-heatstroke.mdx` | 粉じん障害・熱中症対策 | 59 |
| `safety-management/safety-weather-debris-flow.mdx` | 悪天候・異常気象時および土石流対策 | 115 |
| `safety-management/safety-rope-access-traffic.mdx` | ロープ高所作業・交通安全対策 | 94 |
| `safety-management/safety-related-provisions.mdx` | 関連条項の集成 | 160 |

### 第6章 環境保全管理（55P → 11ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `environmental-management/environmental-management-overview.mdx` | 環境保全管理の概要 | 82 |
| `environmental-management/noise-vibration.mdx` | 騒音・振動の防止 | 348 |
| `environmental-management/air-water-pollution.mdx` | ばい煙・粉じん・水質汚濁の防止 | 70 |
| `environmental-management/neighborhood-environment.mdx` | 近隣環境の保全 | 46 |
| `environmental-management/workplace-environment.mdx` | 現場作業環境の保全 | 16 |
| `environmental-management/soil-contamination.mdx` | 土壌汚染対策 | 39 |
| `environmental-management/construction-byproducts.mdx` | 建設副産物の対策 | 178 |
| `environmental-management/recycling-law.mdx` | リサイクル法 | 154 |
| `environmental-management/construction-recycling-law.mdx` | 建設リサイクル法 | 137 |
| `environmental-management/waste-disposal-law.mdx` | 廃棄物処理法 | 238 |
| `environmental-management/byproduct-proper-disposal.mdx` | 建設副産物適正処理推進要綱 | 283 |

### 第7章 関係法規（50P → 9ファイル）

| ファイル | タイトル | 行数 |
|---|---|---|
| `related-laws/01-compliance-overview.mdx` | 建設工事の施工管理における法令等の遵守 | 67 |
| `related-laws/02-labor-standards-act.mdx` | 労働基準法 | 222 |
| `related-laws/03-construction-business-act.mdx` | 建設業法 | 292 |
| `related-laws/04-standard-contract.mdx` | 公共工事標準請負契約約款 | 107 |
| `related-laws/05-road-act.mdx` | 道路法 | 180 |
| `related-laws/06-river-act.mdx` | 河川法 | 143 |
| `related-laws/07-building-standards-act.mdx` | 建築基準法 | 148 |
| `related-laws/08-explosives-control-act.mdx` | 火薬類取締法 | 106 |
| `related-laws/09-port-regulations-act.mdx` | 港則法 | 148 |

## テキスト抽出

### PyMuPDF

```python
import fitz, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PDF_BASE = '/Users/minamidaisuke/obsidian/attachments/奥義/01_土木共通/03_積算・施工/90_1級土木施工管理技士試験/土木施工管理技術テキスト（施工管理・法規編）'
doc = fitz.open(f'{PDF_BASE}/第{N}章_{タイトル}/第{N}章_{タイトル}.pdf')
for i in range(start_page, end_page):
    text = doc[i].get_text()
    print(f'--- Page {i+1} ---')
    print(text)
```

## 変換ルール

土木一般編と同じパターンに準拠（`/civil-general-import` 参照）。

### frontmatter

```yaml
---
id: {slug}
title: {タイトル}
sidebar_label: {短縮ラベル}
description: "{要約240-310文字}。1級土木施工管理技士試験対応。"
toc_min_heading_level: 2
toc_max_heading_level: 5
---
```

### 見出し・表・図・数式

- 見出し: `#` h1, `##` X.X, `###` (X), `####` X)
- 表: 標準Markdownテーブル（ラッパー不使用）
- 図: `{/* 図X.X タイトル */}` JSXコメント
- 数式: `$$...$$` / `$...$`

## サイドバー

`src/lib/sidebar.ts` の `generalSidebar` 内「施工管理」カテゴリに全7サブカテゴリ登録済み。

## 姉妹スキル

- `/civil-general-import` — 土木一般編（全6章、385P、39ファイル、10,142行）**完了**
- `/construction-management-import` — 施工管理・法規編（本スキル、全7章、327P、55ファイル、8,870行）**完了**

両テキスト合計: **712P、94ファイル、19,012行**

## 参照

- `.claude/skills/content/civil-general-import/SKILL.md` — 姉妹スキル（土木一般編）
- `.claude/skills/content/pdf-to-mdx/SKILL.md` — 汎用PDF→MDX変換ルール
- `.claude/skills/content/qa-pdf-mdx/SKILL.md` — QA検証スキル
- `.claude/skills/content/check-mdx/SKILL.md` — MDX構文チェック
