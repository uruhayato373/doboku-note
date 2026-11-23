---
name: reference-adsense-ga4-accounts
description: AdSense と GA4 は別の Google アカウント。収益は GA4 リンク（2026-11-23〜）経由で取る
metadata:
  node_type: memory
  type: reference
  originSessionId: 295f14b1-8287-4fc9-a4c0-0fbc52f26edc
  modified: 2026-11-22T23:08:31.036Z
---

- doboku-note の GA4（プロパティ 419382901）は内部ブラウザの authuser=0 のアカウント、AdSense（pub-8504035087322664）は authuser=2 の別アカウントにある。authuser=0 には別サイト（統計で見る都道府県）の GA4 もあるので取り違えない。
- 2026-11-23 に AdSense 側のアカウントを GA4 プロパティの「編集者」に足し、そのアカウントから GA4 ⇔ AdSense をリンクした（運営者の承認のうえで代行）。
- GA4 は遡って入らないので、`totalAdRevenue` は 2026-11-22 以前は 0（欠測であって収益 0 ではない）。収益の収集は `fetch-business-metrics`（adsenseRevenue）と `fetch-ga4-data --adsense`。AdSense Management API はサービスアカウント不可なので使っていない。
- 実験は EXP-066（手動の枠だけ vs 手動＋自動のページ内広告）。

関連: [[feedback-metrics-cicd-supplied]]
