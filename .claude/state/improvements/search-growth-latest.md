# Search Growth 診断レポート

- run: `2026-07-23T23-20-42Z` / 生成: 2026-07-23T23:20:44.252Z
- URL universe: **2245** 件（GSC UI 1952 行 ∪ URL Inspection）
- sitemap: live=1090（source: live）/ local=1090 / _redirects=32
- 入力: inspection=`inspection-batch-2026-07-01T05-04-05.json` gsc-page=`gsc-page-query-2026-07-16T21-57-57.json` ga4-page=`ga4-page-2026-07-16T21-57-59.json`

## GSC UI 理由別（画面総数 vs CSV 行数 / 1,000 件上限）

| issue | scope | 画面総数 | CSV行数 | truncated |
|---|---|--:|--:|:--:|
| alternateCanonical | allKnownPages | 152 | 152 | no |
| alternateCanonical | allSubmittedPages | 4 | 4 | no |
| crawledNotIndexed | allKnownPages | 346 | 346 | no |
| crawledNotIndexed | allSubmittedPages | 297 | 297 | no |
| forbidden | allKnownPages | 5 | 5 | no |
| notFound | allKnownPages | 292 | 292 | no |
| redirect | allKnownPages | 856 | 856 | no |

## アクション別件数

| action | 件数 | 前回比 |
|---|--:|--:|
| FIX_TECHNICAL | 0 | +0 |
| REDIRECT_LEGACY | 0 | +0 |
| KEEP_MONITOR | 124 | +0 |
| CONSOLIDATE_CANDIDATE | 0 | +0 |
| NOINDEX_CANDIDATE | 312 | +0 |
| EXPECTED_EXCLUSION | 44 | +14 |
| UNKNOWN_REVIEW | 1765 | -14 |

> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。

## 優先修正 Top20（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）

| # | action | url | status | impr | pos | inSitemap | issue | 根拠 |
|--:|---|---|--:|--:|--:|:--:|---|---|
| 1 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-interview | 200 | 4 | 70.0 | ✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 2 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-catastrophe-bias | 200 | 4 | 19.3 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 3 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-maintenance-cost | 200 | 4 | 5.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 4 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-process-safety-mgmt | 200 | 4 | 58.8 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 5 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-company-types | 200 | 3 | 62.7 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 6 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-digital-rights | 200 | 3 | 31.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 7 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-mentor | 200 | 3 | 83.7 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 8 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-lopa | 200 | 2 | 40.5 | ✓ | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 9 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-cites | 200 | 2 | 26.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 10 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-exam-index | 200 | 2 | 69.5 | ✓ | クロール済み - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 11 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-maintenance-prevention | 200 | 2 | 28.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 12 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-talent-management | 200 | 2 | 24.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 13 | UNKNOWN_REVIEW | /category/civil-construction-2?tag=experience-writing | 200 | 1 | 16.0 | ✓ | alternateCanonical | 判断材料不足（UI CSV のみ・状態未確定） |
| 14 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-safety-education | 200 | 1 | 36.0 | ✓ | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 15 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-age-career | 200 | 1 | 55.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 16 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-career-salary | 200 | 1 | 35.0 | ✓ | クロール済み - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 17 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-consultant | 200 | 1 | 24.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 18 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-hatchu-shien | 200 | 1 | 29.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 19 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-quit-honne | 200 | 1 | 70.0 | ✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 20 | UNKNOWN_REVIEW | /docs/civil-construction-2-guide-young-career | 200 | 1 | 66.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |

## 承認が必要な次アクション（人間判断）

- FIX_TECHNICAL 0 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）
- REDIRECT_LEGACY 0 件: 旧 URL → 後継への 301 追加（`public/_redirects`）
- CONSOLIDATE_CANDIDATE 0 件 / NOINDEX_CANDIDATE 312 件: 統合/noindex は要精査（自動適用しない）
- UNKNOWN_REVIEW 1765 件: 追加データ（GSC UI CSV / live HTTP）で確定

これらはいずれも外部状態・本文・redirect を変更しない。実施は `/google-search-growth` の approval gate 通過後。