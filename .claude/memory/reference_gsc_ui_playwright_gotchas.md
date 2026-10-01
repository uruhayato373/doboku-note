---
name: gsc-ui-playwright-gotchas
description: GSC/GA4 を Playwright で操作する時の実UI罠（automationブロック/CSV=ZIP/scope・drillはURL）
metadata: 
  node_type: memory
  type: reference
  originSessionId: a47b3c70-2e6a-4ea5-b6e7-fb4319f0e8b1
---

`/google-search-growth`（`scripts/fetch-gsc-ui-csv.mjs`・`.local/playwright-google-profile`）で GSC「ページのインデックス登録」から CSV を取得する時の、実 UI で判明した非自明ポイント。真実源はコード内コメント＋[[project_gsc_ui_automation_2026_07]]。

- **automationブロック回避**: Playwright 既定の `--enable-automation`/`navigator.webdriver=true` を Google ログインが検知し「安全でないブラウザ」で本人ログインまで弾く。`launchContext` で `ignoreDefaultArgs:['--enable-automation']`＋`--disable-blink-features=AutomationControlled`＋`navigator.webdriver` undefined 化で回避（本人アカウントの first-party・2FA/CAPTCHAは人間）。
- **CSVはZIP・名前は文字化け**: 「CSVをダウンロード」は表＋チャート＋メタの複数CSVを ZIP で返す。メンバー名が非UTF-8で `unzip` が macOS FS に書けない（Illegal byte sequence, exit50）。→ `node:zlib` の最小ZIPリーダー（central directory+`inflateRawSync`）で名前非依存展開し `https://` 最多 member を表として採用。
- **理由行は非ARIA**: `td[data-string-value="<正式ラベル>"]`（1セル/理由・data属性で一意）。role=row/gridcellは無い。
- **scopeもdrillもURL**: 送信済み＝`&pages=ALL_SUBMITTED_URLS&sitemap`、理由ドリル＝`/index/drilldown?...&item_key=...`。ドロップダウン操作より URL 直指定が決定的。理由ラベルは drilldown ページにも残るので「ラベル消失」で判定不可＝URL の `/drilldown` で判定。
- 実ZIP内 表CSV の列名は `URL,前回のクロール`。allSubmittedPages に redirect/notFound/forbidden が無いのは正常（row-not-found）。
- 計測APIのローカル遮断（会社PCプロキシ）とは別枠＝**ブラウザは本人セッションで通る**。[[reference_playwright_auth_profiles]] の profile 方式に google を追加。
