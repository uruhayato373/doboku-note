# Search Growth 診断レポート

- run: `2026-08-25T21-04-50Z` / 生成: 2026-08-25T21:04:58.017Z
- URL universe: **2477** 件（GSC UI 1982 行 ∪ URL Inspection）
- sitemap: live=1112（source: live）/ local=1112 / _redirects=32
- 入力: inspection=`inspection-batch-2026-08-01T05-03-32.json` gsc-page=`gsc-page-query-2026-08-25T20-47-00.json` ga4-page=`ga4-page-2026-08-25T20-47-01.json`
- GSC UI データ源: `ssot`（ssot=追跡SSOT・どのマシン/worktree でも再現／run-normalized=このマシンの run のみ）

## GSC UI 理由別（画面総数 vs CSV 行数 / 1,000 件上限）

| issue | scope | 画面総数 | CSV行数 | truncated |
|---|---|--:|--:|:--:|
| alternateCanonical | allKnownPages | 160 | 160 | no |
| alternateCanonical | allSubmittedPages | 0 | 0 | no |
| blockedByRobots | allKnownPages | 0 | 0 | no |
| crawledNotIndexed | allKnownPages | 353 | 353 | no |
| crawledNotIndexed | allSubmittedPages | 302 | 302 | no |
| discoveredNotIndexed | allKnownPages | 3 | 3 | no |
| discoveredNotIndexed | allSubmittedPages | 3 | 3 | no |
| forbidden | allKnownPages | 5 | 5 | no |
| noindex | allKnownPages | 2 | 2 | no |
| notFound | allKnownPages | 297 | 297 | no |
| redirect | allKnownPages | 857 | 857 | no |

## アクション別件数

| action | 件数 | 前回比 |
|---|--:|--:|
| FIX_TECHNICAL | 0 | +0 |
| REDIRECT_LEGACY | 0 | +0 |
| KEEP_MONITOR | 115 | +2 |
| CONSOLIDATE_CANDIDATE | 0 | +0 |
| NOINDEX_CANDIDATE | 0 | +0 |
| EXPECTED_EXCLUSION | 1084 | +0 |
| UNKNOWN_REVIEW | 1278 | -2 |

> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。

## 優先修正 Top20（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）

| # | action | url | status | impr | pos | inSitemap | issue | 根拠 |
|--:|---|---|--:|--:|--:|:--:|---|---|
| 1 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-blind-drill | 200 | 4 | 21.3 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 2 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-process-safety-mgmt | 200 | 4 | 54.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 3 | UNKNOWN_REVIEW | /docs/civil-construction-2-guide-resume | 200 | 3 | 85.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 4 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-human-error-probability | 200 | 3 | 11.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 5 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-vta-method | 200 | 3 | 17.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 6 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-indirect-manufacturing-cost | 200 | 2 | 87.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 7 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-jisec | 200 | 2 | 15.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 8 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-resilience | 200 | 2 | 97.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 9 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-visual-management | 200 | 2 | 130.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 10 | UNKNOWN_REVIEW | /docs/pe-construction-r07-railway | 200 | 2 | 62.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 11 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-age-career | 200 | 1 | 63.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 12 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-allowance | 200 | 1 | 133.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 13 | UNKNOWN_REVIEW | /docs/civil-construction-1-primary-r04-b | 200 | 1 | 66.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 14 | UNKNOWN_REVIEW | /docs/civil-construction-1-primary-r05-b | 200 | 1 | 7.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 15 | UNKNOWN_REVIEW | /docs/civil-construction-1-secondary-r06 | 200 | 1 | 88.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 16 | UNKNOWN_REVIEW | /docs/civil-construction-1-textbook-construction-byproduct-recycle | 200 | 1 | 97.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 17 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-analytic-hierarchy-process | 200 | 1 | 57.0 | ✓ | クロール済み - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 18 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-budget-planning | 200 | 1 | 33.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 19 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-career-path | 200 | 1 | 90.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 20 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-design-quality | 200 | 1 | 68.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |

## 承認が必要な次アクション（人間判断）

- FIX_TECHNICAL 0 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）
- REDIRECT_LEGACY 0 件: 旧 URL → 後継への 301 追加（`public/_redirects`）
- CONSOLIDATE_CANDIDATE 0 件 / NOINDEX_CANDIDATE 0 件: 統合/noindex は要精査（自動適用しない）
- UNKNOWN_REVIEW 1278 件: 追加データ（GSC UI CSV / live HTTP）で確定

これらはいずれも外部状態・本文・redirect を変更しない。実施は `/google-search-growth` の approval gate 通過後。