# Search Growth 診断レポート

- run: `2026-10-11T03-31-54Z` / 生成: 2026-10-11T03:32:00.177Z
- URL universe: **3828** 件（GSC UI 3776 行 ∪ URL Inspection）
- sitemap: live=1662（source: live）/ local=1658 / _redirects=1431
- 入力: inspection=`2026-10-07T07-52-24.json` gsc-page=`2026-10-10.json#page` ga4-page=`2026-10-10.json#page`
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
| KEEP_MONITOR | 1115 | -111 |
| CONSOLIDATE_CANDIDATE | 0 | +0 |
| NOINDEX_CANDIDATE | 0 | +0 |
| EXPECTED_EXCLUSION | 1849 | +212 |
| UNKNOWN_REVIEW | 864 | +179 |

> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。

## 優先修正 Top20（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）

| # | action | url | status | impr | pos | sitemap live/local | issue | 根拠 |
|--:|---|---|--:|--:|--:|:--:|---|---|
| 1 | UNKNOWN_REVIEW | /standards/guides/inverted-siphon | ? | 44 | 7.2 | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 2 | UNKNOWN_REVIEW | /standards/guides/floodgate | ? | 41 | 23.7 | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 3 | UNKNOWN_REVIEW | /exam/civil-construction-1/guide/buildjob-review | 200 | 4 | 43.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 4 | UNKNOWN_REVIEW | /exam/civil-construction-1/guide/career-agents | 200 | 4 | 26.0 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 5 | UNKNOWN_REVIEW | /exam/civil-construction-1/primary/r02-b | 200 | 4 | 6.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 6 | UNKNOWN_REVIEW | /exam/civil-construction-1/textbook/construction-business | 200 | 4 | 13.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 7 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/contingency | 200 | 4 | 17.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 8 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/cost-variance-analysis | 200 | 4 | 58.0 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 9 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/highly-professional-system | 200 | 4 | 7.5 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 10 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/immigration-control-act | 200 | 4 | 3.5 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 11 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/load-leveling | 200 | 4 | 8.0 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 12 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/mentor | 200 | 4 | 37.0 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 13 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/natech | 200 | 4 | 12.5 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 14 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/osh-management-system | 200 | 4 | 74.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 15 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/parametric-estimation | 200 | 4 | 13.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 16 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/performance-evaluation | 200 | 4 | 10.8 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 17 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/recruitment-management | 200 | 4 | 8.5 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 18 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/safety-2-0 | 200 | 4 | 34.3 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 19 | UNKNOWN_REVIEW | /exam/pe-comprehensive-management/keywords/safety-health-education | 200 | 4 | 83.5 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 20 | UNKNOWN_REVIEW | /exam/pe-construction/keywords/carbon-neutral-kensetsu | 200 | 4 | 5.8 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |

## 承認が必要な次アクション（人間判断）

- FIX_TECHNICAL 0 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）
- REDIRECT_LEGACY 0 件: 旧 URL → 後継への 301 追加（`public/_redirects`）
- CONSOLIDATE_CANDIDATE 0 件 / NOINDEX_CANDIDATE 0 件: 統合/noindex は要精査（自動適用しない）
- UNKNOWN_REVIEW 864 件: 追加データ（GSC UI CSV / live HTTP）で確定

これらはいずれも外部状態・本文・redirect を変更しない。実施は `/google-search-growth` の approval gate 通過後。