# Search Growth 診断レポート

- run: `2026-07-30T05-52-32Z` / 生成: 2026-07-30T05:52:35.953Z
- URL universe: **2253** 件（GSC UI 1964 行 ∪ URL Inspection）
- sitemap: live=1092（source: live-curl）/ local=0 / _redirects=32
- 入力: inspection=`inspection-batch-2026-07-01T05-04-05.json` gsc-page=`gsc-page-query-2026-07-23T21-58-59.json` ga4-page=`ga4-page-2026-07-23T21-59-00.json`
- GSC UI データ源: `ssot`（ssot=追跡SSOT・どのマシン/worktree でも再現／run-normalized=このマシンの run のみ）

## GSC UI 理由別（画面総数 vs CSV 行数 / 1,000 件上限）

| issue | scope | 画面総数 | CSV行数 | truncated |
|---|---|--:|--:|:--:|
| alternateCanonical | allKnownPages | 157 | 157 | no |
| alternateCanonical | allSubmittedPages | 0 | 0 | no |
| crawledNotIndexed | allKnownPages | 350 | 350 | no |
| crawledNotIndexed | allSubmittedPages | 299 | 299 | no |
| forbidden | allKnownPages | 5 | 5 | no |
| notFound | allKnownPages | 297 | 297 | no |
| redirect | allKnownPages | 856 | 856 | no |

## アクション別件数

| action | 件数 | 前回比 |
|---|--:|--:|
| FIX_TECHNICAL | 0 | +0 |
| REDIRECT_LEGACY | 0 | +0 |
| KEEP_MONITOR | 118 | +0 |
| CONSOLIDATE_CANDIDATE | 0 | +0 |
| NOINDEX_CANDIDATE | 313 | +0 |
| EXPECTED_EXCLUSION | 44 | +0 |
| UNKNOWN_REVIEW | 1778 | +0 |

> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。

## 優先修正 Top20（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）

| # | action | url | status | impr | pos | inSitemap | issue | 根拠 |
|--:|---|---|--:|--:|--:|:--:|---|---|
| 1 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-interview | 200 | 4 | 70.0 | ✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 2 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-maintenance-cost | 200 | 4 | 5.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 3 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-mentor | 200 | 4 | 82.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 4 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-quality-costing | 200 | 4 | 38.5 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 5 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-company-types | 200 | 3 | 62.7 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 6 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-maintenance-prevention | 200 | 3 | 34.3 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 7 | UNKNOWN_REVIEW | /docs/pe-first-stage-r03-basic | 200 | 2 | 1.0 | ✓ | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 8 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-predictive-maintenance | 200 | 2 | 64.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 9 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-process-safety-mgmt | 200 | 2 | 53.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 10 | UNKNOWN_REVIEW | /docs/pe-construction-r07-railway | 200 | 2 | 48.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 11 | UNKNOWN_REVIEW | /docs/pe-construction-railway-exam-themes | 200 | 2 | 69.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 12 | UNKNOWN_REVIEW | /category/civil-construction-2?tag=experience-writing | 200 | 1 | 16.0 | ✓ | alternateCanonical | 判断材料不足（UI CSV のみ・状態未確定） |
| 13 | UNKNOWN_REVIEW | /category/concrete-chief-engineer?tag=exam-trends | 200 | 1 | 36.0 | ✓ | alternateCanonical | 判断材料不足（UI CSV のみ・状態未確定） |
| 14 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-grade-comparison | 200 | 1 | 81.0 | ✓ | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 15 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-age-career | 200 | 1 | 55.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 16 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-career-salary | 200 | 1 | 35.0 | ✓ | クロール済み - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 17 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-consultant | 200 | 1 | 24.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 18 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-hatchu-shien | 200 | 1 | 29.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 19 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-quit-honne | 200 | 1 | 70.0 | ✓ | 検出 - インデックス未登録 | 判断材料不足（UI CSV のみ・状態未確定） |
| 20 | UNKNOWN_REVIEW | /docs/civil-construction-1-textbook-construction-plan-overview | 200 | 1 | 88.0 | ✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |

## 承認が必要な次アクション（人間判断）

- FIX_TECHNICAL 0 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）
- REDIRECT_LEGACY 0 件: 旧 URL → 後継への 301 追加（`public/_redirects`）
- CONSOLIDATE_CANDIDATE 0 件 / NOINDEX_CANDIDATE 313 件: 統合/noindex は要精査（自動適用しない）
- UNKNOWN_REVIEW 1778 件: 追加データ（GSC UI CSV / live HTTP）で確定

これらはいずれも外部状態・本文・redirect を変更しない。実施は `/google-search-growth` の approval gate 通過後。