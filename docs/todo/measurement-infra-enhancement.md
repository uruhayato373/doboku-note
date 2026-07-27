# 計測基盤 強化ロードマップ（残タスク）

**発端**: 2026-07-03、計測基盤（GA4・note ファネル・アフィリ・収益 attribution・bot 衛生）の5面並行監査（findings は現物 file:line 裏取り済み）。backlog「計測基盤 Tier 2/3 ＋ GA4 UI 設定」から参照。

**Tier 1（instrumentation/CI 配線）はコード実装済み・本番反映済み**（NoteLink 計測・MagazineCard trackLabel・収益カバレッジ/bot 監査 CI・pages.dev gtag ブロック・UTM policy+check・検索イベント・GA4×GSC crosswalk・アフィリ A/B label 取得）。GA4 UI 側もカスタムディメンション登録まで完了。以下は**未着手の残**のみ。

## 残タスク

### #5 分析 cadence 化 🟡

metrics-analyzer 出力が 2026-05-11 で停止（データは週次で流れるが分析生成が止まっている）。seo-meta fetch はどの workflow にも無く 2026-05-17 停止。metrics-analyzer は LLM＝cloud routine、seo-meta は fetch-metrics.yml 配線で cron 化。

### #7 UTM content 移行 burndown 🟡

referral 統一の policy+check は完了。**残＝既存 inline リンク 94 箇所/47 ファイル**＋建設部門論点6本の `utm_medium=inline`→`referral` 移行。対象 53 ファイルのうち 36 が cover-fit・6 が note-lint の pre-existing 債務を持ち bulk 移行が巻き込むため、**各ファイルの cover/CTA 債務解消のタイミングで段階移行**（新 check が編集時に強制・`SKIP_NOTE_UTM=1` で一時回避）。置換は writeMdxFile・CRLF 保持。

### #8 カスタムパラメータ導入（Tier 2）

`src/lib/gtag.ts:53-56` が UA 型3フィールド固定。資格 category/記事 slug/note productId/マガジンID をイベントパラメータに載せ「どの資格のどの記事からどの商品へ送客したか」をセグメント可能に。**追加 param の GA4 カスタムディメンション登録（サーバ側）とセット**。

### #12 note.com referral の GA4 追跡（Tier 2）

`fetch-ga4-data.mjs` の DIMENSION_MAP・SPAM_REFERRAL に note.com が現れず、note→site の戻り流入を集計する手段が無い。`--dimension source` で note.com を明示集計するレポート追加。

### Tier 3 — 収益 attribution 基盤（本丸・大きめ）

13. **AdSense ページ別収益（RPM）取り込み** — AdSense Management API で page/日別 estimated_earnings＋RPM を取得する fetch を新設（fetch-ga4-* と同じ CI 供給パターン）。coverage dashboard に RPM 列追加。
14. **sales-log × 流入の attribution** — productId→記事 slug マッピングを追加し、CTA クリック数と売上件数を突合する「note ファネル効率」レポート。厳密 attribution は #15 が前提。
15. **送客リダイレクタ（clean URL→302＋UTM）** — `docs/project/03_SNS/02_チャネル動線設計.md:105` の提案が `public/_redirects` で未実装。GA4 outbound click と note UTM を同一 `utm_content` で crosswalk。
16. ~~**A8 成果/報酬の取り込み** — A8 の承認/報酬を履歴 JSON 化し EPC（報酬÷クリック）を KPI 化。~~
    **実装済み（2026-07-27）** → `/a8-report`（`npm run a8-ui:fetch` → `a8-ui:normalize`）。
    SSOT=`a8-report-log.json`（monthly/daily/programMonthly）＋ `a8-results.json` へ rollup。
    A8 は API が無いため Playwright 取得＝**ローカル人間ログイン必須**（CI 供給にはできない例外）。
    stats47 との口座共用に対し サイト帰属 assert（fail-closed）。真実源 → `a8-affiliate-pipeline.md`。
    **残**: 初回実走でのセレクタ/分離方式（site-switch か site-column か）の確定。

### サーバ側（GA4 管理画面・ユーザー手作業）

- **未解決の bing bot 疑いの確定**（bing 252 > google 77 の逆転・`.claude/knowledge/reference/measurement-incidents.md` 参照）— これのみ残。内部トラフィック/参照除外・既知ボット除外・カスタムディメンションは登録済み。

## 進め方

#5 の cadence 化から着手＝additive・低リスク。#8 は GA4 側カスタムディメンション登録とセット。コード変更（src/**）は feature ブランチ＋PR。
