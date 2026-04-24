# 計測事故の記録

計測データの欠損・誤報・不整合が発生した過去事例を記録する。**再発防止のための教訓を蓄積**し、新規スキル・エージェント設計時に同じ落とし穴を避ける。

個別事例は時系列の逆順（新しい順）で追記する。各事例は「現象 / 根本原因 / 気づきの遅延理由 / 適用した対策 / 教訓」を明記する。

## 2026-W16: BAILOUT_TO_CLIENT_SIDE_RENDERING による 6 日間 GA4 完全欠損

### 現象

2026-04-05 〜 04-10 の 6 日間、GA4 Data API で `dimension=date` を取得すると当該 6 日の行が完全不在。週次集計では **W16（Apr 7-13）の Organic Search activeUsers が 113 → 27 と -76% 激減** として Issue #83 が自動起票された。

### 根本原因

2026-04-11 commit [`c6ef1148`](https://github.com/uruhayato373/doboku-note/commit/c6ef1148) で修正された `useSearchParams()` を含む `AnalyticsProvider` の構造問題。

- `AnalyticsProvider` が children ラッパーとして機能していたため、Next.js の `useSearchParams()` がすべての子ツリーを `BAILOUT_TO_CLIENT_SIDE_RENDERING` させていた
- 全 750+ ページが server render されず、HTML body に実コンテンツが欠落
- Google クローラーは空の HTML を受信 → de-indexing が進行
- 実訪問者ゼロ化 → GA4 データも当該期間ゼロ

Apr 5 の 144 ファイル H1 構造修正（commit [`3f97641b`](https://github.com/uruhayato373/doboku-note/commit/3f97641b)）と時期が重なり、Google 側の再評価で「中身のないページ」と判定された可能性が高い。

### 気づきの遅延理由（3 つの構造的欠陥）

| # | 欠陥 | 帰結 |
|---|---|---|
| 1 | **データ整合性チェックなし** | metrics-analyzer が週集計値の前週比のみ見る設計。日次 6 日欠損と低量を区別できず「-76% drop」として症状扱い |
| 2 | **日次スナップショット非運用** | 週次 snapshot（`2026-W16.json`）のみ。日次 raw（`ga4-date-*.json`）を分析対象にしていなかった |
| 3 | **サイト健全性監視なし** | GA4 fetch のみで、本番サイトの 2xx / SSR レンダリング監視なし。BAILOUT バグは別作業（SEO 改善）で偶然発覚 |

つまり計測サイクルは **「数字が取れた前提」で差分を見る設計**で、**「数字が正しく取れているか」を検証しない**盲点を抱えていた。

### 適用した対策（Issue [#130](https://github.com/uruhayato373/doboku-note/issues/130)）

| # | 対策 | 実装 |
|---|---|---|
| A | **data-integrity-gate** | `check-data-integrity.mjs` で GA4 date 欠損検知（直近 7 日で 2 日 / 14 日で 3 日以上 → auto Issue） |
| B | **daily-snapshot**（未実装） | 週次ではなく日次 anomaly 検知に拡張 |
| C | **uptime-ping** | 1 日 3 回 curl で SSR + 2xx + 主要キーワード body 含有を検証 |
| D | **crawl-stats-monitor**（未実装） | GSC Crawl Stats API を日次 fetch、5xx rate / coverage エラー急増検知 |
| E | **本ドキュメント** | 事故記録 + 教訓整理 |

### 教訓

1. **「数字がゼロ」は「実績ゼロ」ではなく「計測不可」の可能性を常に含む**。欠損と低量を区別できるガードを持つこと
2. **大規模な UI / SSR 構造変更の後は、必ず本番 HTML の body 非空を curl で確認する**。Lighthouse の Performance スコアだけでは捕捉できない
3. **自動生成された Issue のタイトル（「Traffic-Drop -76%」）を鵜呑みにしない**。症状と原因を分離する最初の一手は「期間内の日次データを sort して可視化」
4. **`useSearchParams()` はサーバーレンダリング境界を壊す**。Next.js 13+ では `Suspense` で明示的にラップする（詳細: [Next.js docs](https://nextjs.org/docs/app/api-reference/functions/use-search-params#static-rendering)）
5. **deploy の多発と安定性は反比例する**。W15-W16 期間 230 commits（うち `test`/`てｓｔ` 系 40+）の deploy 混乱は、原因を特定困難にした副次要因だった。「テスト用 commit は別 branch で」を徹底する（今回 develop 直 push 既定化の引き金の一つでもある）

### 関連

- Issue [#83](https://github.com/uruhayato373/doboku-note/issues/83) - Traffic-Drop 事案（close 済）
- Issue [#130](https://github.com/uruhayato373/doboku-note/issues/130) - 対策 Umbrella
- commit [`c6ef1148`](https://github.com/uruhayato373/doboku-note/commit/c6ef1148) - BAILOUT 修正
- `.claude/scripts/check-data-integrity.mjs` - データ整合性検証 lib
- `.github/workflows/uptime-ping.yml` - uptime 監視
