# Search Growth 診断レポート

- run: `2026-11-01T04-24-58Z` / 生成: 2026-11-01T04:25:05.478Z
- URL universe: **4173** 件（GSC UI 3776 行 ∪ URL Inspection）
- sitemap: live=1972（source: live）/ local=1972 / _redirects=508
- 入力: inspection=`2026-10-21T06-45-10.json` gsc-page=`2026-10-31.json#page` ga4-page=`2026-10-31.json#page`
- GSC UI データ源: `ssot`（ssot=追跡SSOT・どのマシン/worktree でも再現／run-normalized=このマシンの run のみ）

## GSC UI 理由別（画面総数 vs CSV 行数 / 1,000 件上限）

| issue | scope | 画面総数 | CSV行数 | truncated |
|---|---|--:|--:|:--:|
| alternateCanonical | allKnownPages | 174 | 174 | no |
| alternateCanonical | allSubmittedPages | 0 | 0 | no |
| blockedByRobots | allKnownPages | 0 | 0 | no |
| crawledNotIndexed | allKnownPages | 381 | 381 | no |
| crawledNotIndexed | allSubmittedPages | 322 | 322 | no |
| discoveredNotIndexed | allKnownPages | 478 | 478 | no |
| discoveredNotIndexed | allSubmittedPages | 478 | 478 | no |
| forbidden | allKnownPages | 5 | 5 | no |
| noindex | allKnownPages | 157 | 157 | no |
| notFound | allKnownPages | 320 | 320 | no |
| notFound | allSubmittedPages | 30 | 30 | no |
| redirect | allKnownPages | 1304 | 1000 | ⚠ yes |
| redirect | allSubmittedPages | 431 | 431 | no |

## アクション別件数

| action | 件数 | 前回比 |
|---|--:|--:|
| FIX_TECHNICAL | 0 | +0 |
| REDIRECT_LEGACY | 0 | +0 |
| KEEP_MONITOR | 1707 | +0 |
| CANONICAL_ELSEWHERE | 10 | +0 |
| CONSOLIDATE_CANDIDATE | 0 | +0 |
| NOINDEX_CANDIDATE | 0 | +0 |
| EXPECTED_EXCLUSION | 2346 | +0 |
| UNKNOWN_REVIEW | 110 | +0 |

> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。

## 優先修正 Top20（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）

| # | action | url | status | impr | pos | sitemap live/local | issue | 根拠 |
|--:|---|---|--:|--:|--:|:--:|---|---|
| 1 | UNKNOWN_REVIEW | /standards/hokuriku/hikkei/chapters/5-1 | 200 | 4 | 9.8 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 2 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/1-3 | 200 | 4 | 6.5 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 3 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/1-8 | 200 | 4 | 9.5 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 4 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/2-4 | 200 | 4 | 34.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 5 | UNKNOWN_REVIEW | /standards/hokkaido/local/chapters/6-3 | 200 | 3 | 8.3 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 6 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/1-7 | 200 | 3 | 19.0 | ✓/✓ | URL が Google に認識されていません | 判断材料不足（UI CSV のみ・状態未確定） |
| 7 | UNKNOWN_REVIEW | /standards/hokkaido/appendix/chapters/15-1 | 200 | 2 | 8.5 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 8 | UNKNOWN_REVIEW | /standards/hokkaido/appendix/chapters/2-1 | 200 | 2 | 6.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 9 | UNKNOWN_REVIEW | /standards/hokuriku/hikkei/chapters/2-1 | 200 | 2 | 12.0 | ✓/✓ | URL が Google に認識されていません | 判断材料不足（UI CSV のみ・状態未確定） |
| 10 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/1-5 | 200 | 2 | 9.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 11 | UNKNOWN_REVIEW | /standards/mlit/sekou-kanri-kijun/chapters/5-1 | 200 | 2 | 54.0 | ✓/✓ | URL が Google に認識されていません | 判断材料不足（UI CSV のみ・状態未確定） |
| 12 | UNKNOWN_REVIEW | /standards/mlit/sekou-kanri-kijun/chapters/8-3 | 200 | 2 | 1.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 13 | UNKNOWN_REVIEW | /standards/hokkaido/appendix/chapters/13-1 | 200 | 1 | 8.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 14 | UNKNOWN_REVIEW | /standards/hokkaido/appendix/chapters/14-1 | 200 | 1 | 10.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 15 | UNKNOWN_REVIEW | /standards/hokkaido/appendix/chapters/14-2 | 200 | 1 | 28.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 16 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/1-1 | 200 | 1 | 10.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 17 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/1-9 | 200 | 1 | 10.0 | ✓/✓ | URL が Google に認識されていません | 判断材料不足（UI CSV のみ・状態未確定） |
| 18 | UNKNOWN_REVIEW | /standards/kanto/manual/chapters/2-5 | 200 | 1 | 17.0 | ✓/✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 19 | UNKNOWN_REVIEW | /standards/shikoku/manual/chapters/1-10 | 200 | 1 | 10.0 | ✓/✓ | URL が Google に認識されていません | 判断材料不足（UI CSV のみ・状態未確定） |
| 20 | UNKNOWN_REVIEW | /standards/shikoku/manual/chapters/1-11 | 200 | 1 | 18.0 | ✓/✓ | URL が Google に認識されていません | 判断材料不足（UI CSV のみ・状態未確定） |

## 承認が必要な次アクション（人間判断）

- FIX_TECHNICAL 0 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）
- REDIRECT_LEGACY 0 件: 旧 URL → 後継への 301 追加（`public/_redirects`）
- CANONICAL_ELSEWHERE 10 件: Google が別の URL を canonical に選んだ。内部リンク・301・統合のどれで正すかを判断
- CONSOLIDATE_CANDIDATE 0 件 / NOINDEX_CANDIDATE 0 件: 統合/noindex は要精査（自動適用しない）
- UNKNOWN_REVIEW 110 件: 追加データ（GSC UI CSV / live HTTP）で確定

これらはいずれも外部状態・本文・redirect を変更しない。実施は `/google-search-growth` の approval gate 通過後。