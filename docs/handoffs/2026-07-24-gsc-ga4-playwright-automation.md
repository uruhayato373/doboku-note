---
title: GSC・GA4 Playwright 自動取得システム 実装ログ
date: 2026-07-24
---

# GSC・GA4 Playwright 自動取得システム（Google Search Growth Automation）実装ログ

実装指示書 `docs/project/04_運営/gsc-ga4-playwright-automation-spec.md` に沿って、GSC「ページの
インデックス登録」理由別 CSV の Playwright 取得 → 正規化 → 既存 API/sitemap/redirects/HTML との
URL 突合 → 修正アクション分類 → approval gate、をローカル専用パイプラインとして実装。**実ブラウザで
本番 GSC から CSV を取得し、突合レポートまで到達済み**。

## 実装物（新規）

- スクリプト: `scripts/google-console-login.mjs` / `fetch-gsc-ui-csv.mjs` / `fetch-ga4-ui-csv.mjs` /
  `normalize-google-console-csv.mjs` / `report-search-growth.mjs`
- 純関数 lib: `scripts/lib/{url-normalization,google-console-csv,search-growth-classifier,google-console-browser}.mjs`
- 設定: `.claude/config/google-console-automation.json`（property/issueLabels/scopeParams/browser・秘密情報なし）
- スキル: `.claude/skills/management/google-search-growth/`（SKILL + references/csv-schema・recovery）
- エージェント: `.claude/agents/{gsc-browser-collector,gsc-csv-auditor,seo-fix-planner}.md`
- テスト: `tests/{google-console-csv,search-growth-classifier}.test.mjs` ＋ fixtures（BOM/CRLF/quoted-newline）
- npm scripts 6 本・`.gitignore`（google profile/debug）・`.gitattributes`（fixture の EOL 固定）
- 台帳: agents-registry / skills-guide / skills-registry / CLAUDE.md 同期

## 検証結果（すべて green）

- `npm test` 193（pass 190 / skip 3 既存）・`type-check`・`lint`・`git diff --check`・`check-doc-refs`・`check-doc-coupling`
- 実ログイン成功（下記の automation ブロック回避後）
- dry-run: property/Page indexing 到達/理由行/export ボタン/CSV メニュー を実 UI で検出 OK
- **本取得 7/10 ユニット（実データ）**: allKnownPages 全5理由（crawledNotIndexed 346 / redirect 856 /
  notFound 292 / alternateCanonical 152 / forbidden 5、uiTotal=csvRows）＋ allSubmittedPages（crawledNotIndexed 297 /
  alternateCanonical 4）。残 3 は allSubmittedPages の redirect/notFound/forbidden で **row-not-found＝
  そのスコープに当該理由が無い正常状態**（取得失敗ではない）
- 突合レポート: universe 2245 URL / FIX_TECHNICAL 9・NOINDEX_CANDIDATE 312・EXPECTED_EXCLUSION 30・
  KEEP_MONITOR 120・UNKNOWN_REVIEW 1774（`.claude/state/improvements/search-growth-latest.md`）

## 実 UI で判明した非自明ポイント（真実源＝コード内コメント）

> [!warning] Google の automation ブロック
> Playwright 既定の `--enable-automation` / `navigator.webdriver=true` を GSC ログインが検知し
> 「このブラウザまたはアプリは安全でない可能性があります」で本人ログインまで弾く。`launchContext` で
> `ignoreDefaultArgs:['--enable-automation']` ＋ `--disable-blink-features=AutomationControlled` ＋
> `navigator.webdriver` を undefined 化して回避（本人アカウントの first-party アクセス。2FA/CAPTCHA は人間）。

> [!note] GSC の CSV は ZIP・理由テーブルは非 ARIA・scope とドリルは URL
> - 「CSV をダウンロード」は複数 CSV を **ZIP** で返す（表＋チャート＋メタ）。**メンバー名は非 UTF-8 で
>   `unzip` が macOS FS に書けない**（Illegal byte sequence）。→ `node:zlib` の最小 ZIP リーダー
>   （central directory + `inflateRawSync`）で名前非依存に展開し、`https://` を最も多く含む member を表として採用。
> - 理由行は ARIA なしの `td[data-string-value="<正式ラベル>"]`（1 セル/理由・data 属性で一意）。
> - **スコープは URL**（送信済み＝`&pages=ALL_SUBMITTED_URLS&sitemap`）、**理由ドリルも URL**
>   （`/index/drilldown?...&item_key=...`）。ドロップダウン操作より URL 直指定が決定的。理由ラベルは
>   drilldown ページにも残るため「ラベル消失」で判定してはいけない（URL の `/drilldown` で判定）。
> - 実 ZIP 内 表 CSV の列名は `URL,前回のクロール`（回帰テスト済み）。

## 評価エージェント（seo-fix-planner）が発見 → 修正した実バグ 2 件

> [!important] 突合コードの是正（Generator/Evaluator ループの成果）
> 1. **canonical 誤検知**: `report-search-growth.mjs` が URL Inspection の陳腐化 `user_canonical`
>    （3週間前スナップショットの homepage 固定値）を無条件採用し `/about` 等 9 件を誤って FIX_TECHNICAL
>    判定していた。→ 現 build の HTML canonical を優先＋`google==self`/`verdict=PASS` を self-canonical
>    とみなす `canonicalOk` を追加。**FIX_TECHNICAL 9→0**。回帰テスト追加。
> 2. **下書き誤判定**: `r0X-essay-{persona}` 18 件は「後継あり・redirect 未登録」に見えたが、現物確認で
>    **`published: false` の下書き**（source 在・意図的に未公開・`pattern-essay-*` が公開版）と判明。
>    redirect すると再公開時に URL を奪うため**追加は不可**。→ `loadDraftSlugs()` で下書き slug を検出し
>    EXPECTED_EXCLUSION に分類。**redirect は 1 件も追加していない**（正しい）。

## B/C 調査結果（ユーザー依頼）

- **B（壊れリンク 404）**: 現 build HTML に壊れた `<a href>` は**ゼロ**（`/search` のみ）。`/℃）…`・`/25.0`・
  `/h)` 等は `$math$ /unit`（例: concrete `textbook-properties/article.mdx:131` の「10⁻⁶ /℃」）の**歴史的/外部
  由来 404**で、現行サイトは生成していない。`_next/static/*.woff2` はビルド毎のフォントハッシュ回転。**対応不要**。
- **C（essay redirect 候補）**: 15 件は `published:false` 下書き（redirect 不可・上記②）。残 14 件（`essay-mlit-*`・
  `essay-data-2026`・`r8-essay-theme-{aging-society,gx-energy-security,labor-shortage}` 等）は**完全削除・source なし・
  0 impressions**で 1:1 後継が無い。→ 404 のまま放置で可（Google が漸次ドロップ）。**redirect 追加は見送り**。

## 残タスク（→ `docs/todo/backlog.md`）

- [ ] `/google-search-growth` を月次運用に載せる（`--scope monthly`）。approval gate の運用手順を回す
- [ ] GA4 UI CSV（`fetch-ga4-ui-csv.mjs`）の実ラベル確定（未ログイン検証のみ・API 優先は維持）
- [ ] 生成物（`.claude/state/metrics/gsc-ui/**` の raw ZIP/CSV）を commit するか gitignore するか方針決定
- [ ] （任意）削除済み 14 essay slug に redirect を張るか（総監 essay ハブへ集約）＝戦略判断・実害小

## 承認が必要な次アクション（外部状態・本文は未変更）

修正候補は計画止まり。redirect 追加 / noindex / 統合 / deploy はユーザー承認後。詳細は
`.claude/state/improvements/search-growth-latest.md` の Top20 と action 別件数。
