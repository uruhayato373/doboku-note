# 週次レビュー 2026-W21

作成日: 2026-05-24  
対象期間: 2026-05-18 〜 2026-05-24

---

## サマリー

- 計画タスク達成率: 前週計画ファイル不在のため N/A
- 主な成果: R8予想問題集 設問(3)全面改修完了・note マガジン公開・PSI 2件改善
- 課題: textbook-quality-management-text の PSI 急落（perf 99→33）・EXP-001 長期 running

---

## 開発活動

- コミット数: 119 件（develop ブランチ、直近7日）
- 変更規模: 11,438 ファイル変更、1,165,170 行追加

### 主な変更

- R8予想問題集 6本の設問(3)を施策ごと①②③形式へ改修（字数圧縮・構成修正）
- 自治体道路担当 R06/R08 設問(3)の施策ごと①②③化
- 総監模範論文マガジン — note 公開、リンク記録、カバー生成
- 過去問ページの「この試験で扱われたキーワード」セクション削除（UI クリーン）
- 空 Callout 検出ルール追加 → 135 個除去（mdx-check スクリプト強化）
- 1級土木一次系ページへのアフィリエイト広告バナー枠追加
- `<PersonaSelector>` コンポーネント新設、R8 spoke / r0X-secondary 選択 UI 統一
- MDX 本文の note 価格記述 56 箇所を削除（SoT 統一）
- note コンテンツ計画の運営者ステータス改訂（総監合格済み・土木系公務員退職者）

---

## コンテンツ実績

### 今週追加・更新したページ（.local/r2/posts/）

| ページ | 種別 |
|---|---|
| reference-materials-floodgate | 新規 |
| reference-materials-river-abandonment | 新規 |
| reference-materials-hyogo-port-materials | 新規 |
| reference-materials-tunnel-02 | 新規 |
| reference-materials-inverted-siphon | 新規 |
| civil-construction-1/guide-concrete-key-points | 更新 |
| civil-construction-1/primary-h27-a | 更新 |
| civil-construction-1/primary-r05-b | 更新 |
| civil-construction-1/secondary-r07 | 更新 |

### カテゴリ別ページ数

| カテゴリ | ファイル数 |
|---|---|
| civil-construction-1 | 83 |
| pe-comprehensive-management | 736 |
| reference-materials-* | 5（新規） |

### docs/ 更新（引き継ぎ）

| ファイル | 内容 |
|---|---|
| handoffs/2026-05-22-soukan-essay-setsumon3.md | 設問(3)施策切り口変更の未完了引き継ぎ |
| handoffs/2026-05-21-river-consultant-magazine-publish.md | 公務員河川担当マガジン公開完了 |
| handoffs/2026-05-20-yt-shorts-quality.md | YT Shorts 品質設計 |
| handoffs/2026-05-19-r8-hub-spoke-ux-refactor.md | R8 hub/spoke UX リファクタ |
| handoffs/2026-05-18-mlit-whitepaper-withdrawal.md | 国交白書関連の撤回記録 |

---

## NSM（オーガニック検索流入）

> metrics-data ブランチ未 publish のため、`.claude/state/metrics/` の保存データから読み取り。

### GA4 週次（2026-05-17 基準の累積チャネルデータ）

| チャネル / ソース | ユーザー数 | セッション数 | ページ/セッション | エンゲージメント率 |
|---|---|---|---|---|
| Bing | 252 | 485 | 5.4 | 65.2% |
| (direct) | 101 | 197 | 5.6 | 61.4% |
| Google | 77 | 194 | 9.8 | 70.6% |
| openai | 45 | 58 | 1.8 | 70.7% |
| Yahoo | 25 | 47 | 7.6 | 68.1% |
| note.com | 23 | 95 | 5.6 | 74.7% |
| chatgpt.com | 9 | 11 | 2.1 | 54.5% |

> Google セッションのページ/セッション（9.8）とエンゲージメント率（70.6%）が最高水準。コンテンツ質は良好。

### GA4 日次トレンド（直近14日比較）

| 期間 | セッション | アクティブユーザー | 前週比 |
|---|---|---|---|
| 直近7日（5/18-5/24推計） | 247 | 154 | — |
| 前7日（5/11-5/17） | 511 | 285 | -51.7% / -46.0% |

> **注意**: 直近7日のセッション大幅減（-51.7%）は異常値の可能性あり。`measurement-incidents.md` 確認推奨。データソース: `ga4-date-2026-05-21T21-31-35.json`（28日分の日次）。

### GSC 週次（対象期間: 2026-04-20 〜 2026-05-18）

| 指標 | 値 |
|---|---|
| 総クリック数 | 16 |
| 総インプレッション | 426 |
| 平均 CTR | 3.76% |

### GSC 上位クエリ（clicks 降順）

| クエリ | clicks | impr | CTR | 順位 |
|---|---|---|---|---|
| 総合技術監理 キーワード集 2026 | 3 | 78 | 3.8% | 6.8 |
| 品質原価計算 | 2 | 2 | 100% | 18.5 |
| 総合技術監理 キーワード集 解説 | 2 | 4 | 50% | 5.2 |
| alarp | 1 | 2 | 50% | 12.5 |
| ねらいの品質とは | 1 | 2 | 50% | 17.5 |
| オールハザードアプローチとは | 1 | 1 | 100% | 12.0 |
| デジタルライツ | 1 | 5 | 20% | 8.2 |
| トライポッド理論 | 1 | 9 | 11.1% | 6.4 |
| ブラインド型訓練 | 1 | 2 | 50% | 17.0 |
| ライフサイクルコスティングとは | 1 | 1 | 100% | 10.0 |

### NSM トレンドの洞察

- 検索クエリはほぼ総監キーワード集系に集中。土木施工管理系クエリがほとんどない（GSC 索引 lag の可能性）
- 「総合技術監理 キーワード集 2026」は impr=78 に対し CTR 3.8%（順位 6.8）→ seoTitle 改善で CTR 向上余地あり
- Bing がトップ流入源（252 users）だが、Bing WMT での indexing 健全性確認（T-013）は未完了

---

## 実験の進捗

### Running（3 件）

| ID | タイトル | 開始日 | 経過日数 | 対象メトリクス | 次アクション |
|---|---|---|---|---|---|
| EXP-001 | 統合ハウスキーピング: GSC クリーン + インデックス解放 | 2026-04-14 | 40日 | gsc_current_site_impressions_28d（目標 ≥200） | **measure 推奨**（10日超過） |
| EXP-003 | 個別ハイインパクト SEO 修正 5件 (seoTitle 検索意図整合) | 2026-05-16 | 8日 | combined_clicks_28d（目標 1→20） | 継続観察 |
| EXP-004 | primary h26-r06 系 21件 seoTitle suffix 重複バグ解消 | 2026-05-16 | 8日 | primary_aggregate_clicks_28d（目標 1→8） | 継続観察 |

### Paused（1 件）

| ID | タイトル | 理由 |
|---|---|---|
| EXP-002 | Group 1 S+A評価 5件の復活 + 双方向内部リンク | 5URL 一時非公開中（精度向上後に再公開予定） |

### 今週 close

- なし

### 今週 close された実験（completed）

- `perf-lcp-mobile-2026-W17`: Mobile LCP 改善 Wave 1 — 完了。学習: blur orb 削除が LCP に効果的、Noto Sans JP preload は逆効果

### 次サイクルへの仮説

- EXP-001 は 40 日経過。`/nsm-experiment measure` を実行して効果判定すべき
- EXP-003/004 は 8 日経過。EXP-003 は seoTitle 整合の early signal を 2026-05-24 以降の GSC で確認
- EXP-002 の 5 URL を再公開できるなら EXP-002 を resume すべき

---

## PSI パフォーマンス推移

データソース: `psi-batch-2026-05-23T17-41-55.json`（22 URL）vs `psi-batch-2026-05-17T17-38-56.json`

### Core Web Vitals 前週比

| URL | Perf (W20) | Perf (W21) | LCP W21 | CLS W21 | 状態 |
|---|---|---|---|---|---|
| / | — | 100 | 490ms | 0.020 | 正常 |
| /search | — | 87 | 832ms | 0.020 | 正常 |
| /category | — | 98 | 432ms | 0.000 | 正常 |
| /textbook-quality-management-text | **99** | **33** | **3131ms** | 0.020 | **CRITICAL 回帰** |
| /primary-r07-a | 86 | 78 | 1120ms | 0.183 | CLS 違反（継続） |
| /secondary-r07 | 64 | **98** | 685ms | 0.020 | **解消** |
| /secondary-experience-writing-guide | 44 | **96** | 864ms | 0.020 | **解消** |
| /pe-comprehensive-management-r07-primary | 82 | 90 | 538ms | **0.160** | CLS 違反（継続） |

### 今週の変動

- **新規回帰（CRITICAL）**: `/textbook-quality-management-text` が perf=99→33、LCP=738ms→3131ms に急落。直近コミットとの相関調査が必要
- **解消**: `/secondary-r07`（perf 64→98）、`/secondary-experience-writing-guide`（perf 44→96）— コンテンツ更新の結果
- **継続違反**: `/primary-r07-a`（CLS 0.183）、`/r07-primary`（CLS 0.160）

### 洞察

- `textbook-quality-management-text` の回帰は今週のコミット（空 Callout 除去等）との因果関係を調査すべき
- CLS 違反 2 件は継続中。画像サイズ指定 or レイアウト安定化が必要

---

## 過去問起点の校正サイクル

### 今週のサイクル実施

今週の実施: **なし**（最後の実施: 2026-04-25）

### 年度別カバレッジ（progress.json より）

| 年度 | カバー / 全問 | 進捗 |
|---|---|---|
| R01 | 40 / 40 | 100% |
| R02 | 40 / 40 | 100% |
| R03 | 40 / 40 | 100% |
| R04 | 40 / 40 | 100% |
| R05 | 40 / 40 | 100% |
| R06 | 40 / 40 | 100% |
| R07 | 40 / 40 | 100% |
| **全体** | **280 / 280** | **100%** |

**全年度の過去問校正が完了。次フェーズは再レビューループ or 精度監査。**

### 次週候補

全問カバー完了のため、select-next-question.mjs の実行不要。次フェーズの判断（精度再評価・Phase 2 設計）が必要。

---

## 校正学習の蒸留

> metrics-data 未 publish / distill-proofread-learnings スキル未実行のため、今週のコミット履歴から手動推定。

### 今週の抽出結果

- 既存原則の適用: 多数（設問(3)施策①②③形式は既存ルール）
- 新規ルール候補: 1 件
- ワークフロー改善: 1 件

### 採択候補（ユーザー承認待ち）

| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | `check-mdx` スクリプトへの空コンテナ検出ルール追加が 135 件の品質問題を検出 — MDX 書き込み後は空 Callout チェックを標準化 | content-principles.md §品質チェック |
| 2 | ワークフロー改善 | MDX 本文への note 価格記述は SoT 統一（`note-magazines.ts`）により一元管理。今後 MDX への価格埋め込みを明示禁止 | content-authoring.md §note価格 |

---

## GitHub Umbrella Issue 棚卸し

> gh CLI が利用不可のため、実施なし。GitHub MCP ツールを使った確認が必要な場合はユーザーが手動確認。

---

## 課題・ブロッカー

1. **PSI 回帰 CRITICAL**: `/textbook-quality-management-text` が perf 99→33 に急落。原因不明。コミット履歴と突合必要
2. **GA4 セッション大幅減**: 前週比 -51.7%。measurement-incidents.md 参照・クロスチェック推奨
3. **EXP-001 長期 running**: 40 日経過で measure 推奨状態。計測未実施
4. **AdSense 再申請**: T-010 は in_progress だが進捗不明
5. **snapshot-weekly-metrics.mjs 失敗**: `@google-analytics/data` パッケージ未インストール（エラー: ERR_MODULE_NOT_FOUND）

---

## 学び

- 空 Callout 検出スクリプトの強化で 135 件を一括除去 → 品質管理の自動化が有効
- PersonaSelector コンポーネントの統一で UX 一貫性向上 — 9+5 ページへの横展開完了
- PSI は毎週比較することで急落を早期検出できる（今週の回帰はバッチデータで捕捉）
- note 価格を SoT 統一したことでメンテナンスコスト削減

---

## 来週への申し送り

- `textbook-quality-management-text` PSI 回帰の原因調査 → 早急修正
- EXP-001 measure 実施（`/nsm-experiment measure EXP-001`）
- 総監設問(3)施策切り口変更（気候変動適応・脱炭素 2 施策）— handoffs/2026-05-22 参照
- R8 試験前コンテンツ最終化（T-024）— 1 級土木 6 月試験を想定
- AdSense 再申請進捗確認
