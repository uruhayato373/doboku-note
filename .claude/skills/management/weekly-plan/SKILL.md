---
name: weekly-plan
description: >
  週次実行計画を並列サブエージェントで生成し、同週の `[PDCA] YYYY-Www` Issue の body に「来週の計画」セクションとして追記する。Use when user asks to [週次計画, 今週の計画を立てたい, /weekly-plan].
---

プロジェクトの現状を調査し、戦略的な週次計画を生成する。

## 引数

```
/weekly-plan [YYYY-Www]
```

- 週番号（任意）: ISO 8601 週番号（例: `2026-W11`）。省略時は今週。

## 概要

サブエージェントで並列にコンテキストを収集し（開発状況・コンテンツ・パフォーマンス・トレンド）、優先順位を決定し、批判的にレビューした上で、実行可能な週次計画を出力する。

## 手順

### Phase 0: 週次メトリクス スナップショット

```bash
node .claude/scripts/snapshot-weekly-metrics.mjs
```

現在の週の NSM データ（GA4 + GSC の前週比較）を `docs/reviews/weekly-metrics/YYYY-Www.json` に保存し、index.json に追記する。既に実行済みの週は skip（`--force` で上書き可）。

この出力が Phase 1 Agent C のインプットになる。計測基盤が未整備なら skip 可（警告を表示）。

### Phase 1: コンテキスト収集（並列サブエージェント）

#### Agent A: 開発状況

```
調査項目:
- git log --oneline -20（直近の開発活動）
- git diff --stat（未コミット変更）
- docs/ 配下のページ数（カテゴリ別）

出力形式: 「今週何が開発されたか」「未完了の作業」をまとめる
```

#### Agent B: コンテンツ状況

```
調査項目:
- docs/ 配下の .mdx ファイル数（カテゴリ別: general, road, river, low）
- 最近更新されたファイル
- カテゴリごとのコンテンツ充実度

出力形式: 「コンテンツの充実度」「不足しているカテゴリ」「ボトルネック」
```

#### Agent C: NSM / 実験サイクル

```
調査方法:
1. Phase 0 で生成された docs/reviews/weekly-metrics/YYYY-Www.json を読む
   - 無ければ metrics-reader を直接呼ぶ fallback
2. .claude/state/experiments.json を読んで以下を把握:
   - running 実験: 経過日数、baseline との gap
   - measuring 実験: 前後比較の中間サマリ
   - proposed 実験: 優先順位（次に start すべきもの）
3. 時系列 index.json から直近 4 週分のトレンドを読む（運用中の場合）
4. 上記を統合して次の実験候補を 3-5 件提案
   - .claude/skills/management/nsm-experiment/references/playbook.md の典型パターンから
   - .claude/skills/management/nsm-experiment/references/rubric.md で優先順位付け

出力形式:
## NSM 現況
- Organic Search users: {今週} (前週比 {delta})
- GSC clicks: {今週} (前週比 {delta})
- 直近 4 週トレンド: (運用中の場合) 図表

## 実験の状態
| ID | title | status | 経過日数 | 進捗 |
|---|---|---|---|---|

### running の警告
- EXP-??? は started_at から 10 日超、そろそろ /nsm-experiment measure を実行

## 次の実験候補（rubric 順）
1. [加重 2.7] title 改善: ...
2. [加重 2.0] description 改訂: ...

### 提案アクション
- Must: 候補 1 を /nsm-experiment start で開始
- Should: 候補 2 を backlog に追加（experiments.json に proposed で残す）
```

**前提条件**:
- Step 1-3 の計測基盤が有効（.env.local の GOOGLE_SERVICE_ACCOUNT_KEY_PATH と GA4_PROPERTY_ID）
- サービスアカウントが GSC/GA4 両方で閲覧者権限を持つ
- 条件未達時は「NSM セクション: スキップ (計測基盤未整備)」と記録

#### Agent C2: オープンの改善 Issue

```
調査方法:
- gh issue list --label performance --state open --json number,title,createdAt,url --limit 50
- gh issue list --label auto-generated --state open --json number,title,createdAt,url --limit 50
- `.claude/state/improvements/psi-*.md` の直近 7 日分（performance-auditor の改善候補レポート）
  - 違反パターン別（LCP 肥大・CLS 発生等）の Critical / High 候補

分析項目:
- open 期間（放置期間）— 7 日以上は Must 候補
- Critical 優先度の改善候補は件数多くても上位 2-3 件を Should に入れる
- 同一 URL に複数 Issue が立っている場合はまとめて 1 タスク化

出力形式: 「## オープンの改善 Issue」セクションとして以下構造で:

## オープンの改善 Issue

### Critical（放置 7 日以上 または LCP/CLS 大幅超過）
| Issue | 内容 | 放置日数 | 対応方針 |
|---|---|---|---|
| #N | /docs/xxx LCP 4.2s | 10 日 | Hero 画像 priority 指定 |

### High（PSI 改善候補から）
| 候補 | 対象 URL | 改善パターン |
|---|---|---|

これらを Phase 3 の Must / Should 候補として組み込む。
```

#### Agent D: トレンド・検索需要

```
調査項目:
- 土木系資格試験の日程（施工管理技士: 6月・11月、技術士: 7月・10月）
- 季節性の需要変動（試験前の学習需要増）
- 関連ニュース（インフラ、防災、建設業界）

出力形式: 「今週のトレンド機会」「試験シーズンとの関連」
```

### Phase 2: 戦略分析

エージェントの結果を統合し分析する:

1. **KPI との距離**: 目標に対する現在地
2. **ギャップ**: 計画と実行の乖離
3. **機会**: 季節性・トレンドに応じた施策
4. **リスク**: 放置すると悪化すること

### Phase 3: 優先度提案

#### Must（必ずやる: 2-3件）
- 各タスクに: 理由, 成功基準, 推定工数(S/M/L)

#### Should（できればやる: 2-3件）

#### Could（余力があれば: 1-2件）

### Phase 4: 批判的レビュー（セルフレビュー）

1. 「技術的に楽しいだけでは？」— 収益・PV に直結しないタスクが Must に入っていないか
2. 「先週と同じ失敗を繰り返してないか？」— 前週の計画と照合
3. 「今週やらないと機会損失になるものは？」— 試験シーズン等のタイミング

### Phase 5: 出力（GitHub Issue に追記）

生成した markdown を、同週の `[PDCA] YYYY-Www` Issue の body に「---」区切りで追記する。

```bash
# 1. 既存 Issue の body を取得
ISSUE_NUM=$(gh issue list --label weekly-pdca --search "[PDCA] YYYY-Www in:title" --state open --json number --jq '.[0].number')

# 2. 既存 body + 計画セクション を合成して更新
gh issue view $ISSUE_NUM --json body --jq .body > /tmp/existing-body.md
cat /tmp/existing-body.md > /tmp/updated-body.md
echo "" >> /tmp/updated-body.md
echo "---" >> /tmp/updated-body.md
cat /tmp/weekly-plan-section.md >> /tmp/updated-body.md
gh issue edit $ISSUE_NUM --body-file /tmp/updated-body.md
```

先に `/weekly-review` が Issue を作成している前提。Issue が存在しない場合は `gh issue create` で計画のみで新規作成してよい（この場合 body 冒頭に「# 来週の計画」の見出しを追加）。

## 出力フォーマット（Issue body の追記セクション）

```markdown
## 来週の計画

### 前週の振り返り (W-1)

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|

## 現状サマリー

| 指標 | 現在値 | 目標 |
|---|---|---|
| 公開ページ数 | N | — |
| 推定月間 PV | N | — |

## トレンド機会

| トレンド | 関連コンテンツ | アクション |
|---|---|---|

## 今週の実験

<!-- Agent C が experiments.json と nsm-experiment の rubric 評価から自動生成。
     running / measuring / 新規 start 候補 を一覧で表示。 -->

| ID | title | status | 次のアクション |
|---|---|---|---|

## オープンの改善 Issue（前週からの継続）

<!-- Agent C2 が gh issue list（performance ラベル）と
     .claude/state/improvements/psi-*.md から自動生成。
     Must/Should 候補の根拠となる。 -->

### Critical（放置 7 日以上）
| Issue | 内容 | 放置日数 |
|---|---|---|

### High（今週対応候補）
| 候補 | 対象 URL | 改善パターン |
|---|---|---|

## 今週のタスク

### Must
1. **タスク名** [S/M/L]
   - 理由:
   - 成功基準:

### Should

### Could

## 批判的レビュー

> 調整があればここに記載。

## 次週への申し送り
```

## 運用ルール

- **毎週月曜に実行**する想定
- 前週の計画ファイルが存在する場合、**自動で振り返りを生成**する
- 計画ファイルは蓄積する（削除しない）

## 参照

- `.claude/skills/management/weekly-review/SKILL.md` — 週次レビュー
- `.claude/skills/management/nsm-experiment/SKILL.md` — 実験ライフサイクル管理
- `.claude/skills/management/nsm-experiment/references/playbook.md` — 実験パターン
- `.claude/skills/management/nsm-experiment/references/rubric.md` — 実験優先順位
- `.claude/scripts/snapshot-weekly-metrics.mjs` — Phase 0 スナップショット
- `.claude/scripts/lib/metrics-reader.mjs` — NSM 計測本体
- `.claude/skills/management/nsm-experiment/references/definition.md` — NSM 定義
