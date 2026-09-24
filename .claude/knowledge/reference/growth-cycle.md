---
title: 成長サイクル（GA4 起点の計測→記録→改善）
---

# 成長サイクル（GA4 起点の計測→記録→改善）

アクセスと収益化の改善を、**CI が計測と機会抽出を供給し、ローカル週次レビューが全件を処分し、既存の実行経路が回す**一本のサイクルにする。判断理由の正典は [プロダクト戦略](../../../docs/strategy/01_プロダクト戦略.md)、KPI 定義は `.claude/config/business-direction.json`、閾値は `.claude/config/growth-cycle.json`。

## 流れと担当

| 段 | 担当 | 入力 → 出力 |
|---|---|---|
| 計測 | CI `fetch-metrics.yml`（金 06:00 JST）の `fetch-growth-pack` | GA4 Data API（landingPage×流入元×channel／pagePath×eventName）と GSC（page／page×query）を、**前の完了週（月〜日・JST）＋直前 28 日の基線**で全件取得 → `metrics/growth/pack-YYYY-Www.json` |
| 計測（外部） | 同 `fetch-bing-webmaster`・`ga4-admin-api check` | Bing の実クリック・表示 → `metrics/bing/`／GA4 管理設定（ディメンション・キーイベント・保持）→ `metrics/ga4-admin/inventory-latest.json` |
| 分析 | 同 `build-growth-digest`（オフライン・決定的） | パック×収益カバレッジ×Bing×実験台帳×triage-log → `metrics/growth/digest-YYYY-Www.json`（安定 ID `OPP-…` 付きの機会） |
| 意味の判断 | CI `gsc-auto-review.yml`（金 12:00）の `metrics-analyzer` | ダイジェストの `OPP-…` を引用して「なぜ・何を確かめるか」を足す（再抽出しない） |
| 評価 | 同 publish 内の `measure-experiments`（reset 後の develop 最新に対して） | `measure` 仕様を持つ実験を前後の窓で自動計測 → `experiments.json` の `measurements[]`。事後窓が完了すると `VERDICT_DUE` |
| 異常 | `fetch-metrics.yml` の Report step | 取得失敗・整合性違反は Issue `fetch-metrics`、検査不成立（キー未設定・権限不足）は `fetch-metrics-check-invalid`。復旧で自動クローズ |
| 処分 | ローカル土曜の `/weekly-review`（Agent G・Phase 2.5） | `growth-digest --print` をレビューへ埋め込み、`growth-triage apply` で全件を backlog / 実験 / watchword / 裁定 / 束ね / 却下 / 保留に振り分け → `metrics/growth/triage-log.json` |
| 実行 | 既存の実行経路 | SEO＝日次 `seo-rank-watch`（watchword を 1 件ずつ自動改善・効果判定）／収益導線・計測修理＝`/backlog-sweep`／実験＝`/nsm-experiment start` → 翌週 CI が自動計測 |
| 反映ゲート | 月曜 `weekly-review-guard.yml` の `check-growth-triage` | 未処分 0・レビューにマーカー・申し送りに ID。違反は Issue `growth-triage`、検査不成立は `growth-triage-check-invalid`（復旧で自動クローズ） |

週の対応: **土曜 W のレビューは digest W−1**（`reviewPeriod('weekly')`＝事業レビューと同じ窓）。GSC の日付は太平洋時間、レビューは JST。

## 機会の区分と閾値

| 区分 | type | 期待効果の単位 | 表示上限 |
|---|---|---|---|
| 計測 | `measurement-section-failed` / `-truncated` / `-thresholded` / `-input-missing` / `-event-vanished` / `-bing-mismatch` | — | 全件 |
| 実験 | `experiment-due`（experiment-due の MEASURE/CLOSE/DECIDE/PENDING/NO_BASELINE） | — | 全件 |
| SEO | `seo-high-impr-low-ctr` / `seo-striking-distance` / `seo-cannibalization` / `seo-traffic-drop` / `seo-decay` | 検索クリック/週 | 5（1 ページ 1 件） |
| 収益導線 | `revenue-page-cta-rate` / `revenue-placement-ctr` / `revenue-no-cta` / `revenue-quiz-funnel-drop` | CTA クリック/週・演習完了/週 | 3 |

- 閾値は `growth-cycle.json` の `digest`。期待効果は単位が違うので**カテゴリ内でだけ**並べる
- 自然検索の分母は google（GSC と突合できる）。GA4 の bing は bot 疑いがあるため Bing Webmaster と別照合し、比が `bingSessionsPerClickMax` を超えたら計測の機会にする
- 旧 `/docs/` URL は `_redirects` で正規 URL へ寄せて合算する（移行を「急落」「共食い」と誤検出しない）
- 欠測は 0 にしない。入力の欠落・打ち切り・thresholding は計測の機会として必ず表に出す
- 「未登録なのに需要あり」は `report-search-growth` / `index-coverage` の担当なので作らない。前年同週は GA4 履歴が 2027 年まで無いので使わない
- SEO の watchword 下書きは、受験意図（`inferIntent`）が exam-task / exam-topic で原稿が特定できるものだけに付く（Rank Watch の方針と同じ）

## 処分の規則

- **全件処分**。表示対象（計測・実験は全件、SEO 5・収益 3）を 1 件残らず処分する。迷ったら確かめる作業を backlog にする（保留の山を作らない）
- 申し送り（「## 来週への申し送り」）も `id: null` の backlog で起票し、行頭に DN を書く
- 抑止: 起票・束ね・裁定は 8 週、却下は 12 週、保留は until まで再表示しない（`suppressWeeks`）。同じ週の処分では抑止しないので、トリアージ後に CI を再実行しても表示対象は入れ替わらない
- 状態は「CI が書く digest」と「ローカルが追記する triage-log」の結合で決まる。両者は同じファイルを編集しない（fetch-metrics は triage-log を job 開始時の版で上書きしない）
- 実験の自動計測は目安（verdictHint）までで、裁定は人。売上は台帳の最終日が事後窓に届くまで確定扱いにしない

## コマンド

```bash
npm run fetch-growth-pack               # 取得（CI。ローカルは要認証）
npm run growth-digest -- --print        # 最新ダイジェストを Markdown で（週次レビューに埋め込む）
npm run growth-digest -- --week 2026-W38 --json
npm run growth-triage -- list                                             # 未処分
npm run growth-triage -- apply --decisions .tmp/growth-triage-2026-W38.json --commit
npm run check-growth-triage                                               # 月曜 guard と同じ検査
npm run measure-experiments                                               # 自動計測の dry-run（CI は --commit）
```

## 人が一度だけ行う設定

1. GA4 プロパティ 419382901 のアクセス管理で、サービスアカウントを**編集者**に（`ga4-admin-api:apply` でキーイベントを作成するため。観測だけなら閲覧者で可）。GCP で「Google Analytics Admin API」を有効化する
2. Bing Webmaster Tools でサイトを確認し、API キーを GitHub Secret `BING_WEBMASTER_API_KEY` へ（未設定の間は `fetch-metrics-check-invalid` Issue が残る）
3. ワークフロー（YAML）の変更は `/deploy` で main に届いてから定期実行に効く。スクリプトの変更は develop に入った時点で効く（fetch-metrics は develop を checkout する）
