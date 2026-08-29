# Search Growth 診断レポート

- run: `2026-08-29T23-52-08Z` / 生成: 2026-08-29T23:52:09.633Z
- URL universe: **2477** 件（GSC UI 1982 行 ∪ URL Inspection）
- sitemap: live=1417（source: live）/ local=1417 / _redirects=1190
- 入力: inspection=`inspection-batch-2026-08-01T05-03-32.json` gsc-page=`gsc-page-query-2026-08-28T05-02-24.json` ga4-page=`ga4-page-2026-08-28T05-02-25.json`
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
| KEEP_MONITOR | 4 | +0 |
| CONSOLIDATE_CANDIDATE | 0 | +0 |
| NOINDEX_CANDIDATE | 0 | +0 |
| EXPECTED_EXCLUSION | 2191 | +0 |
| UNKNOWN_REVIEW | 282 | +0 |

> 自動適用は内部リンクの旧 URL 修正のみ。redirect 追加・noindex・統合・削除・deploy は approval gate で停止。

## 優先修正 Top20（FIX_TECHNICAL → REDIRECT_LEGACY、impressions 降順）

| # | action | url | status | impr | pos | sitemap live/local | issue | 根拠 |
|--:|---|---|--:|--:|--:|:--:|---|---|
| 1 | UNKNOWN_REVIEW | /links | 200 | 1 | 73.0 | ✓/✓ | 送信して登録されました | 判断材料不足（UI CSV のみ・状態未確定） |
| 2 | UNKNOWN_REVIEW | /_next/static/media/051742360c26797e-s.p.0f97p8c3305p~.woff2 | ? | 0 | — | —/— | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 3 | UNKNOWN_REVIEW | /atom.xml | ? | 0 | — | —/— | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 4 | UNKNOWN_REVIEW | /feed.xml | ? | 0 | — | —/— | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 5 | UNKNOWN_REVIEW | /privacy | 200 | 0 | — | ✓/✓ | crawledNotIndexed | 判断材料不足（UI CSV のみ・状態未確定） |
| 6 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-textbook-machinery-overview | ? | 0 | — | —/— | forbidden | 判断材料不足（UI CSV のみ・状態未確定） |
| 7 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-keyword-2026-1 | ? | 0 | — | —/— | forbidden | 判断材料不足（UI CSV のみ・状態未確定） |
| 8 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-pe-comprehensive-management-climate-change-international | ? | 0 | — | —/— | forbidden | 判断材料不足（UI CSV のみ・状態未確定） |
| 9 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-r8-essay-theme-labor-shortage | ? | 0 | — | —/— | forbidden | 判断材料不足（UI CSV のみ・状態未確定） |
| 10 | UNKNOWN_REVIEW | /search?q=%7Bsearch_term_string%7D | ? | 0 | — | —/— | noindex | 判断材料不足（UI CSV のみ・状態未確定） |
| 11 | UNKNOWN_REVIEW | /docs/civil-construction-1-guide-four-management-5 | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 12 | UNKNOWN_REVIEW | /8 | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 13 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-concrete-chief-engineer-primary-properties | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 14 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-concrete-chief-engineer-textbook-products | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 15 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-concrete-chief-engineer-guide-trends | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 16 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-concrete-chief-engineer-guide-overview | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 17 | UNKNOWN_REVIEW | /docs/pe-comprehensive-management-concrete-chief-engineer-primary-structural-design | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 18 | UNKNOWN_REVIEW | /℃）とほぼ等しく、これが鉄筋コンクリート構造物の温度安定性の物理的根拠となる。 | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 19 | UNKNOWN_REVIEW | /25.0 | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |
| 20 | UNKNOWN_REVIEW | /docs/r01-a | ? | 0 | — | —/— | notFound | 判断材料不足（UI CSV のみ・状態未確定） |

## 承認が必要な次アクション（人間判断）

- FIX_TECHNICAL 0 件: sitemap 掲載なのに壊れている URL の技術修正（redirect/canonical/robots）
- REDIRECT_LEGACY 0 件: 旧 URL → 後継への 301 追加（`public/_redirects`）
- CONSOLIDATE_CANDIDATE 0 件 / NOINDEX_CANDIDATE 0 件: 統合/noindex は要精査（自動適用しない）
- UNKNOWN_REVIEW 282 件: 追加データ（GSC UI CSV / live HTTP）で確定

これらはいずれも外部状態・本文・redirect を変更しない。実施は `/google-search-growth` の approval gate 通過後。