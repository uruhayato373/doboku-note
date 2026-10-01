---
name: ga4-default-filter
description: fetch-ga4-data.mjs は 2026-05-17 以降、既定で country=Japan + 参照スパム 5 件除外。生データには --include-all
metadata: 
  node_type: memory
  type: project
  originSessionId: 90283f84-133f-457a-a65f-602491875f4a
---

`fetch-ga4-data.mjs` (`npm run fetch-ga4-data`) は **2026-05-17 以降、既定で country=Japan + 参照スパム除外** が ON。

**Why:** [[affiliate-tracking-pixel-hydration]] と同じ「外部要因による計測汚染」系。incident 2026-04-26（GA4 direct US bot スパイク）の恒久対策。weekly snapshot 側は `metrics-reader.mjs` で `ga4_jp` として実装済みだったが、アドホック取得は無防備で `(direct) 1641 / bing 1293` のような bot 込み数値が `.claude/state/metrics/ga4/` に蓄積していた。

**How to apply:**
- GA4 数値が「思ったより少ない」と感じても既定がフィルタ後なのが正常。フィルタ前の 5〜6 倍値が記録された過去ファイル（〜2026-05-16）と直接比較しないこと
- bot 比率を確認したい時のみ `--include-all` で生データ取得（記録は `(direct)` がブレるので分析時のみ）
- スパムリスト追加が必要になったら `fetch-ga4-data.mjs` の `SPAM_REFERRAL_SOURCES` 配列に追記
- 詳細経緯と GA4 プロパティ側の追加推奨対策は `docs/reference/measurement-incidents.md` 2026-04-26 セクション末尾
