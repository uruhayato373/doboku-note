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
| 異常 | `fetch-metrics.yml` の Report step | 取得失敗・整合性違反は Issue `fetch-metrics`、検査不成立（キー未設定・権限不足）は `fetch-metrics-check-invalid`。復旧で自動クローズ |

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

## コマンド

```bash
npm run fetch-growth-pack               # 取得（CI。ローカルは要認証）
npm run growth-digest -- --print        # 最新ダイジェストを Markdown で（週次レビューに埋め込む）
npm run growth-digest -- --week 2026-W38 --json
```
