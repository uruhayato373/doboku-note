---
name: reference_gsc_diagnosis_toolkit
description: "GSC の診断・操作。URL Inspection+Search Analytics 診断スクリプト群と判定マトリクス・GSC/GA4 を Playwright で操作する時の UI 罠（automationブロック/CSV=ZIP/scopeはURL）"
metadata:
  type: reference
---
GSC「インデックス未登録」「impressions 低下」等の数値を **推測ではなく実データで診断** するために構築したスクリプト群。月次/季節ごとの再診断で再利用可能。

**Why**: 2026-04-27 セッションで「ex0 670 件未登録」の真因を診断する際、推測ベースの戦略議論（内部リンク不足仮説）から実データ駆動診断にピボット。本ツール群で 60 分以内にドメイン権威性問題まで真因特定できた。

**実行フロー**（合計 ~60 分、URL Inspection クォータ 800/2000 消費）:

```bash
# 1. Issue から URL リスト抽出（クォータ消費 0、~2 分）
gh issue view {issue} --json comments --jq '.comments[].body' > .tmp/issue-comments.txt
node .claude/scripts/extract-gsc-coverage-urls.mjs --input .tmp/issue-comments.txt --output-dir .tmp/gsc-urls/

# 2. URL Inspection 4 並列（クォータ ~38%、ウォール時間 ~25 分）
split -l $(($(wc -l < .tmp/gsc-urls/all.txt)/4 + 1)) .tmp/gsc-urls/all.txt .tmp/gsc-urls/chunk-
for c in aa ab ac ad; do
  npm run inspect-url -- --file .tmp/gsc-urls/chunk-$c --json 2>&1 | tail -50 &
done; wait

# 3. Search Analytics（クォータ別枠、~3 分）
npm run fetch-gsc-data -- --dimension page --days 90 --limit 1000
npm run fetch-gsc-data -- --dimension query --days 90 --limit 200
npm run fetch-gsc-data -- --dimension query --days 90 --limit 50 --query "doboku"  # ブランドクエリ

# 4. 集計 + 診断レポート（~3 分）
node .claude/scripts/analyze-gsc-coverage.mjs \
  --inspection-glob "data/metrics/url-inspection/inspection-batch-*.json" \
  --page-data data/metrics/gsc/gsc-page-LATEST.json \
  --query-data data/metrics/gsc/gsc-query-LATEST.json \
  --brand-query-data data/metrics/gsc/gsc-query-BRAND.json \
  --url-dir .tmp/gsc-urls/

# 5. 補助分析（必要に応じて）
node .claude/scripts/verify-html-links.mjs --urls .tmp/gsc-urls/ex0.txt --sample 30  # HTML 出力検証
node .claude/scripts/build-noindex-candidates.mjs --inspection-glob ... --page-data ...  # noindex 候補
node .claude/scripts/analyze-hubs.mjs --page-data ...  # hub 強化対象特定
```

**判定マトリクス**（analyze-gsc-coverage.mjs が自動出力）:
- last_crawl null ≥ 50% → クロールバジェット問題
- page_fetch SUCCESSFUL < 80% → SSR/レンダリング問題
- referring_urls 0 件 ≥ 50% → 内部リンク不全
- referring 6+ なのに ex0 滞留 ≥ 100 → 権威性問題（内部施策効かない）
- canonical 不一致 ≥ 30% → 重複判定問題
- インデックス済 + 90 日 imp=0 ≥ 80% → 戦略資産集中の根拠
- ブランド月間 imp < 100 → 権威性問題（直接シグナル）

**API 制約**:
- URL Inspection: 2000 URL/日/property
- Search Analytics: 緩い（数千 query/日 OK）
- クロール統計情報: API なし、Web UI のみ
- 外部被リンク: API なし（または 3rd party Ahrefs/Semrush）

**生データ保存先**: `data/metrics/url-inspection/` `data/metrics/gsc/`

**関連 commit**: `eb87d5c7` (scripts) `a0e33889` (data保存)

---

## GSC/GA4 を Playwright で操作する時の実UI罠

`/google-search-growth`（`scripts/fetch-gsc-ui-csv.mjs`・`.local/playwright-google-profile`）で GSC「ページのインデックス登録」から CSV を取得する時の、実 UI で判明した非自明ポイント。真実源はコード内コメント＋[[project_gsc_ui_automation_2026_07]]。

- **automationブロック回避**: Playwright 既定の `--enable-automation`/`navigator.webdriver=true` を Google ログインが検知し「安全でないブラウザ」で本人ログインまで弾く。`launchContext` で `ignoreDefaultArgs:['--enable-automation']`＋`--disable-blink-features=AutomationControlled`＋`navigator.webdriver` undefined 化で回避（本人アカウントの first-party・2FA/CAPTCHAは人間）。
- **CSVはZIP・名前は文字化け**: 「CSVをダウンロード」は表＋チャート＋メタの複数CSVを ZIP で返す。メンバー名が非UTF-8で `unzip` が macOS FS に書けない（Illegal byte sequence, exit50）。→ `node:zlib` の最小ZIPリーダー（central directory+`inflateRawSync`）で名前非依存展開し `https://` 最多 member を表として採用。
- **理由行は非ARIA**: `td[data-string-value="<正式ラベル>"]`（1セル/理由・data属性で一意）。role=row/gridcellは無い。
- **scopeもdrillもURL**: 送信済み＝`&pages=ALL_SUBMITTED_URLS&sitemap`、理由ドリル＝`/index/drilldown?...&item_key=...`。ドロップダウン操作より URL 直指定が決定的。理由ラベルは drilldown ページにも残るので「ラベル消失」で判定不可＝URL の `/drilldown` で判定。
- 実ZIP内 表CSV の列名は `URL,前回のクロール`。allSubmittedPages に redirect/notFound/forbidden が無いのは正常（row-not-found）。
- 計測APIのローカル遮断（会社PCプロキシ）とは別枠＝**ブラウザは本人セッションで通る**。[[reference_playwright_auth_profiles]] の profile 方式に google を追加。
