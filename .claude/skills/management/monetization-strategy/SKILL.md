---
name: monetization-strategy
description: >
  収益化戦略のブレインストーミングと施策ロードマップを生成する。
  Use when user asks to [収益化, マネタイズ戦略, /monetization-strategy, 稼ぎ方を考えたい, 月X万円達成するには, AdSense以外の収益源, 有料記事戦略].
---

doboku-note の収益化戦略を 3-5 案ブレインストームし、適合度・リスク・検証実験を設計する。

原典: [phuryn/pm-skills](https://github.com/phuryn/pm-skills) (MIT License) の `monetization-strategy` をカスタマイズ。

## 引数

```
/monetization-strategy [constraint]
```

- `constraint`（任意）: 制約条件（例: `no-ads`, `affiliate-only`, `月5万円目標`）

## プロジェクトコンテキスト

doboku-note は土木工学に関するドキュメントサイト（Next.js 16 + next-mdx-remote）。以下の特性を前提に分析すること:

- **プロダクト**: 土木工学・施工管理・河川・道路・法律の技術ノートを無料提供
- **ユーザー**: 土木系技術者、施工管理技士受験者、技術士受験者、公務員試験受験者、行政書士受験者、土木系学生
- **現在の収益（3 本柱）**: ① **note 有料記事**（実証済みの主エンジン・月¥114k 規模・高 CTR＝学習意図の財布を自社・高粗利で独占）／② **Google AdSense**（ページ別 RPM に最適化余地）／③ **転職アフィリ一本**（建設・施工管理特化＝BuildJob・GKS・建設JOBs。講座/教材/添削/書籍は 2026-06-25 廃止＝note とカニバるため。真実源: `.claude/knowledge/reference/affiliate-operations.md`・[[affiliate-career-only]]）。**将来**: PWA 過去問アプリ（買い切り・Web 月¥15k 達成後に着手 [[project_ios_app_design]]）
- **トラフィック**: SEO 経由（検索流入が主）＋ note/SNS 送客
- **技術基盤**: Next.js 16 + next-mdx-remote + Cloudflare Pages（サーバーコスト極小）
- **運営**: 個人開発
- **コンテンツ資産**: サイト 640+ ページ（1 級土木・技術士総監/建設部門・コンクリート診断士 等）＋ note 有料/無料記事 450+（実数は Step 1 の調査で取得）
- **URL**: https://doboku-note.com

## 収益 KPI の定義（現行モデル・数値で判断する）

施策の評価は勘でなくこの 4 KPI で行う。計測は **CI/CD 供給が正**（会社 PC は社内プロキシで Google API 遮断＝ローカル fetch 不可。真実源 [[feedback_metrics_cicd_supplied]]）。

| KPI | 定義 | 分子 ÷ 分母 | 取得元 |
|---|---|---|---|
| **RPM**（広告） | 1,000 PV あたり AdSense 収益 | 収益 ÷ PV × 1000 | AdSense（ページ別取り込みは measurement-infra #13＝**未実装**・現状は手動概算） |
| **EPC**（アフィリ） | 1 クリックあたり報酬 | A8 成果報酬 ÷ アフィリクリック | `a8-results.json`（`/a8-report` で自動取込・単月 run のみ反映）÷ GA4 `affiliate_cta_click` by-label（`fetch-ga4-cta-clicks --by-label`・カスタムディメンション `event_label` 登録済 2026-07-07） |
| **CTA 転換率** | 収益 CTA のクリック率 | CTA クリック ÷ ページ流入 | GA4 `affiliate_cta_click`/`note_cta_click` ÷ `ga4-page`（`report-monetization-coverage`・週次 CI） |
| **note ファネル効率** | note 送客 → 購入 | 売上件数 ÷ `note_cta_click` | `sales-log.json`（`.claude/knowledge/reference/sales-tracking.md`）÷ GA4（厳密 attribution は measurement-infra #14/#15） |

- **EPC で案件を選ぶ**: 転職アフィリは BuildJob（無料面談 ¥50,000〜8/31 増額）/ GKS（¥25,000）/ 建設JOBs（登録 ¥4,500）が **EPC＝報酬 × 成約率**で優劣が決まる。低摩擦・低単価が高 EPC のこともある。~2026-09 に判定（backlog P5・[[project_buildjob_impressions_campaign]]）。
- **カニバリ境界（不可侵）**: 学習・受験意図は **note（自社・高粗利）が独占**、キャリア意図は**転職アフィリ**。両者は財布が別＝競合しない。この境界を崩す施策（学習導線への外部講座/教材送客等）は**提案しない**（[[affiliate-career-only]]）。

## 手順

### Step 1: 現状データ収集

以下を調査する:
- 公開ページ数（docs/ 配下の .mdx ファイル数をカテゴリ別に集計）
- 直近のアクセス規模（GA4 データがあれば使用）

### Step 2: 候補戦略のブレインストーム

doboku-note に適した収益化モデルを 3-5 案生成する。以下のカテゴリを考慮:

| カテゴリ | doboku-note での例 |
|---|---|
| **広告** | Google AdSense の配置最適化、記事内ネイティブ広告 |
| **アフィリエイト** | 転職サービス一本（2026-06-25 に書籍/教材/講座/添削アフィリは note とカニバるため完全廃止。学習導線に再提案しないこと。真実源: memory `affiliate-career-only`） |
| **資格試験対策** | 施工管理技士・技術士の問題集・模試（有料） |
| **スポンサー** | 建設会社・コンサル会社からの記事スポンサー |
| **コンテンツ課金** | 詳細解説・過去問解説の有料化 |
| **コンサル** | 技術士受験指導、施工管理技士受験コーチング |

### Step 3: 各戦略の評価

各候補について以下を分析する:

#### 3.1 戦略概要
- 収益モデルの仕組み
- 誰が支払い、何を得るか

#### 3.2 ユーザー適合度
- ターゲットユーザーの支払い意思
- ユーザー体験への影響（離脱リスク）

#### 3.3 ユニットエコノミクス推定
- 想定月間収益レンジ（悲観/標準/楽観）
- 必要トラフィック量
- 実装・運用コスト

#### 3.4 リスクと課題
- 市場リスク（需要不確実性）
- 実装複雑度
- ユーザー体験の毀損リスク
- 競合との価格競争リスク

#### 3.5 検証実験
- 低コストで検証する方法
- 成功基準と判断指標
- 実験期間

### Step 4: 優先度マトリクス

| 戦略 | 収益ポテンシャル | 実装容易性 | UX影響 | 推奨順位 |
|---|---|---|---|---|

### Step 5: 実装ロードマップ

- **Phase 1**（今すぐ）: 最も低リスク・低コストな戦略を実装
- **Phase 2**（1-2ヶ月後）: データ蓄積後に第2戦略を追加
- **Phase 3**（3ヶ月後）: 結果に基づき最適化

## 出力フォーマット

> **分量バジェット**（真実源: `.claude/knowledge/reference/docs-markdown-style.md`「長さの既定」）:
> 結論を先頭に。**各案・各項目は 12 行以内**、表は上位 5 行＋「他 N 件」。
> 検討したが採らなかった案は 1 行で理由だけ書く（比較表を作らない）。

```markdown
# doboku-note 収益化戦略分析

## 現状サマリー
- 公開ページ数: N
- カテゴリ: 一般 / 道路 / 河川 / 法律
- 推定月間 PV: ...

## 収益化候補

### 1. [戦略名]（推奨: ★★★★☆）
- **仕組み**: ...
- **収益レンジ**: 悲観 ¥X / 標準 ¥X / 楽観 ¥X（月）
- **実装コスト**: S/M/L
- **UX影響**: 低/中/高
- **リスク**: ...
- **検証実験**: ...（期間: N週間、成功基準: ...）

（以下同様）

## 優先度マトリクス
| 戦略 | 収益 | 容易性 | UX | 推奨 |
|---|---|---|---|---|

## 推奨アクション
1. まず [戦略A] を実装（理由: ...）
2. 次に [戦略B] を検証（理由: ...）

## 検証ロードマップ
...
```

会話内で出力する（恒久保存が必要な結論は `docs/strategy/04_収益化戦略.md` を更新）。

## 注意事項

- 収益化はユーザー体験を損なわない範囲で実施する
- 個人開発のため運用負荷が低い戦略を優先する
- 土木技術情報の公共性を損なわない（基本コンテンツは無料維持）
- 将来的なハイブリッドモデル（広告 + note 有料 + 転職アフィリ + PWA 過去問アプリ）を見据える（教材/講座アフィリは廃止済み＝[[affiliate-career-only]]）

## 参照

- `.claude/knowledge/reference/affiliate-operations.md` — 転職アフィリの配置面・EPC・a8-results 運用の真実源
- `.claude/knowledge/reference/sales-tracking.md` — note 売上 SSOT（sales-log.json・productId 命名）
- `docs/operations/計測基盤強化ロードマップ.md` — 計測基盤タスク（RPM 取り込み #13・attribution #14/#15 は未実装）
- `docs/strategy/04_収益化戦略.md` — 収益化戦略の恒久文書（結論はここへ）
- `.claude/skills/management/growth-loops/SKILL.md` — 成長ループ分析
- `.claude/skills/management/north-star-metric/SKILL.md` — NSM 定義
- 原典: Pawel Huryn の Monetization Strategy フレームワーク
