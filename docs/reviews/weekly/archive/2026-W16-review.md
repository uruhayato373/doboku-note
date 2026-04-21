---
week: "2026-W16"
type: review
generatedAt: "2026-04-19"
---

# 週次レビュー 2026-W16

## サマリー

- 計画タスク達成率: 前週計画ファイルなし（週次 PDCA 初回運用）
- 主な成果: 土木教科書コンテンツの大規模品質向上（画像置換・破損修復・Callout 追加）
- NSM（Organic Search ユーザー）: 389 ユーザー（前週比 +1.0%）
- 週間コミット: 50件、2,917 ファイル変更

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| SEO 総合レビュー（2026-04-08） | 監査 | 完了 | 総合スコア 58/100、thin content 問題 509 ページ特定 |
| 競合分析: 1 級土木（2026-04-04） | 調査 | 完了 | 7 社調査、UVP 分析完了 |
| 競合分析: PE 総合技術監理（2026-04-05） | 調査 | 完了 | pejp.net 等の脅威度評価 |
| textbook 大規模品質改善（13+ 件） | コンテンツ | 完了 | PDF スキャン 82 枚削除、SVG 4 枚追加 |
| primary 破損解説修復 61 件（Phase C） | コンテンツ | 完了 | h26〜r07 全範囲修復 |
| /audit-svg スキル追加 | 開発 | 完了 | SVG 静的品質検出 |
| /audit-exam-explanations スキル追加 | 開発 | 完了 | 破損解説検出基盤 |
| 静的インデックス再生成 | 保守 | 完了 | backlinks + cross-exam + tags |
| スタブ 509 ページ非公開化（P0） | SEO | 未着手 | SEO 監査 P0 最優先タスクだが未実施 |

## 成果ハイライト

1. **土木教科書の大規模画像品質向上**: textbook-shovel-excavator・textbook-distance-angle・textbook-port-regulations など複数教科書で、低品質 PDF スキャン画像を Wikimedia CC ライセンス写真や自作 SVG に全面置換（削除 82 枚、SVG 4 枚追加）
2. **primary 試験問題 破損解説 61 件を全面修復**: 法規・品質管理・測量・工程管理など複数分野に頻出論点 Callout を系統的に追加
3. **QA 自動化スキル 2 件新設**: `/audit-svg`（SVG 品質検出）と `/audit-exam-explanations`（破損解説検出）を追加し、今後の品質維持コストを削減
4. **EXP-001（GSC ハウスキーピング）着手**: 手動 indexing 14 件完了、2026-04-29 に計測予定

## 開発活動

- コミット数: 50 件
- 変更ファイル数: 2,917 ファイル
- 追加行数: 約 1,822,725 行
- 削除行数: 約 5,596 行

### 主な変更

- 土木教科書: PDF スキャン廃止・CC 写真置換・SVG 追加
- primary ファイル: 破損解説修復・Callout 追加（法規・品質・測量・工程）
- スキル開発: `/audit-svg`・`/audit-exam-explanations` 新設
- UI: ArticleImage のデフォルト size を default→medium に変更
- content-principles §8 改訂（帰属キャプション許容基準）

## コンテンツ実績

| カテゴリ | ファイル数 |
|---|---|
| civil-construction-1/guide | 6 |
| civil-construction-1/primary | 30 |
| civil-construction-1/secondary | 15 |
| civil-construction-1/textbook | 80 |
| pe-comprehensive-management | 690 |
| **合計** | **821** |

- 今週追加: 775 件（civil-construction-1 全カテゴリ）
- 今週更新: 109 件（primary H26〜R07、textbook 複数）

## NSM（オーガニック検索流入）

> データソース: `.claude/state/metrics/ga4/ga4-channel-2026-04-19T11-17-44.json` および `gsc-query-2026-04-19T11-17-45.json`（metrics-data ブランチから取得）

### GA4 週次サマリー（28 日ローリング比較）

| 指標 | 当期 | 前期 | 増減 |
|---|---|---|---|
| 総セッション数 | 686 | 687 | -1 (-0.1%) |
| Organic Search ユーザー ★NSM | 389 | 385 | **+4 (+1.0%)** |
| Organic Search セッション | 486 | 478 | +8 (+1.7%) |
| Direct ユーザー | 142 | 154 | -12 (-7.8%) |
| Direct セッション | 200 | 209 | -9 (-4.3%) |

| エンゲージメント指標 | 値 |
|---|---|
| Organic Search 1 セッション当たり PV | 1.39 |
| Organic Search 平均セッション時間 | 167 秒（2分47秒） |
| Organic Search エンゲージメント率 | 59.3% |
| Organic Search バウンス率 | 40.7% |

### GSC 上位クエリ（クリック数順）

| クエリ | クリック | IMP | CTR | 平均順位 |
|---|---|---|---|---|
| 総合技術監理 キーワード集 2026 | 2 | 32 | 6.3% | 6.4 位 |
| doboku | 0 | 18 | 0% | 6.9 位 |
| 河川法 とは | 0 | 4 | 0% | 57.3 位 |
| 「土木工事共通仕様書」塩化物 0.30kg | 0 | 3 | 0% | 10.3 位 |
| 廃川 | 0 | 3 | 0% | 8.3 位 |

### GSC 上位ページ（クリック数順）

| URL | クリック | IMP | CTR | 平均順位 |
|---|---|---|---|---|
| /docs/civil-construction-1-primary-r06-a | 1 | 5 | 20.0% | 3.8 位 |
| /docs/pe-comprehensive-management-bcp-crisis-management | 1 | 10 | 10.0% | 56.7 位 |
| /docs/general/design-manual/03-08-tunnel-02 | 1 | 11 | 9.1% | 9.5 位 |
| /docs/pe-comprehensive-management-keyword-2026 | 2 | 70 | 2.9% | 7.3 位 |
| /docs/river/river-management/04 | 3 | 74 | 4.1% | 6.9 位 |

### NSM トレンドの洞察

- **Organic Search ユーザー微増**: +4 ユーザー (+1.0%) で安定成長傾向
- **高インプレッション・低 CTR が課題**: river-management/04（74 imp/4.1%）と pe-comprehensive-management-keyword-2026（70 imp/2.9%）は露出はあるが CTR が低く、title/description 改善の余地あり
- **GSC クリック総数が低水準**: 月間 7〜8 クリックにとどまる。EXP-001 のインデックス促進効果が 4/29 以降に現れるか注目

## 実験の進捗

### Running（1 件）

| ID | title | 経過日数 | ベースライン | 次アクション |
|---|---|---|---|---|
| EXP-001 | 統合ハウスキーピング: GSC クリーン + インデックス解放 | 5 日 | impressions 66/28d → 200 目標 | 2026-04-29 に計測実施 |

- EXP-001 詳細: 手動 indexing 14 件完了（2026-04-14/18 実施）。計測日は 2026-04-29

### Paused（1 件）

| ID | title | 状態 | 一時停止理由 |
|---|---|---|---|
| EXP-002 | Group 1 S+A 評価 5 件の復活 + 双方向内部リンク | Paused | カテゴリ精度向上が必要と判断、5 記事を再 unpublish |

### 今週 close

- なし

### 次サイクルへの仮説

1. **スタブページ非公開化 → 全体品質スコア向上**: SEO 監査で指摘された 509 スタブページの非公開化は、Googleの crawl budget 効率化とサイト品質評価向上に直結する最優先施策
2. **高インプレッション・低 CTR ページの title/description 改善**: `pe-comprehensive-management-keyword-2026`（70 imp/2.9%）と `river-management/04`（74 imp/4.1%）は CTR 改善余地が大きく、EXP として取り組む価値あり

## 課題・ブロッカー

1. **SEO P0 タスク（スタブ 509 ページ非公開化）が未着手**: SEO 監査で最優先と判断されたにもかかわらず実施できていない。試験シーズン前（7 月）に完了が必要
2. **snapshot-weekly-metrics.mjs が実行不可**: `@google-analytics/data` パッケージ未インストールのため GA4 live API 呼び出し不可。metrics-data ブランチからの JSON 手動取得で代替中
3. **週次 PDCA 初回運用**: 前週計画ファイルが存在せず、計画 vs 実績の定量比較が取れない。本週より運用開始

## 学び

- 大規模ファイル変更（50 コミット・2,917 ファイル）でも、1 コミット 1 機能の粒度を維持することで追跡性が確保できた
- EXP-002 の一時停止判断（カテゴリ精度問題）は適切。ベースラインのないまま計測しても効果判定できない
- `/audit-svg` スキルにより今後の SVG 品質チェックが自動化され、手動レビューコストが削減される

## 来週への申し送り

- SEO P0: スタブページ 509 件の非公開化を最優先で実施
- EXP-001 計測: 2026-04-29 に `inspect-url + metrics-reader` で delta 確認
- EXP-002 再開条件の確認: 5 記事の内容精度向上が完了したら再 published 化
- CTR 改善 EXP を提案: `pe-comprehensive-management-keyword-2026` の title/description 改善
- `@google-analytics/data` パッケージのインストール検討（metrics-data branch への依存を解消）
