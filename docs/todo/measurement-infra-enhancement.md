# 計測基盤 強化ロードマップ

**発端**: 2026-07-03、計測基盤（GA4・note ファネル・アフィリ・収益 attribution・bot 衛生）を5面並行監査（全 findings は現物 file:line 裏取り済み）。「サイトを継続運営するための計測充実」という視点で、改良・設定すべき点を棚卸しした結果を本ドキュメントに集約する。backlog §6 から参照。

## 総括

**すでに健全（触らない）**: 本番のみ gtag 発火＝dev 内部トラフィック除外（`src/components/GoogleAnalytics.tsx:14`）／BAILOUT 恒久対策の Suspense 化（`src/components/providers/AnalyticsProvider.tsx:8-10`）／fetch 既定 Japan フィルタで bot 抑制（`.claude/scripts/fetch-ga4-data.mjs:83-87`）／CTA クリック計測 note_cta・affiliate_cta 稼働（28日で 351/20 クリック）／engagementRate 取得済／収益カバレッジ表の生成ロジック（`report-monetization-coverage.mts`）。

**穴は4クラスタ**: ①instrumentation（測れていない行動）②収益 attribution（クリック→円が繋がらない）③分析 cadence（データは流れるが分析が停止）④UTM/bot の設定ドリフト。

---

## Tier 1 — すぐやる（低コスト・高効果／既存資産の配線・是正）

1. **NoteLink のクリック計測** 🔴 — `src/components/ui/NoteLink/NoteLink.tsx:60-64` の `<a>` に `data-cta="note"`＋`data-cta-label` を付与（既存デリゲート `AnalyticsProvider.tsx:26-52` に乗る）。記事内 note 無料記事送客（11箇所）が丸ごと未計測なのを解消。**最大の穴**。URL にも UTM 付与。
2. **MagazineCard に trackLabel 伝播** — `src/components/ui/MagazineCard/MagazineCard.tsx:32-39` が `MagazineInlineCard` へ `trackLabel={utmContent}` を渡していない（1行追加）。ページ×配置の CTA 粒度を回復。
3. **収益カバレッジ表を CI 配線** — `report-monetization-coverage.mts` がどの workflow からも呼ばれず `monetization/coverage-latest.md` が 2026-06-18 で停止。`.github/workflows/fetch-metrics.yml` に1ステップ追加で週次自動化。
4. **bot 比率監査を CI 配線** — `.claude/scripts/audit-ga4-bot-ratio.mjs` が未 wiring・2026-05-17 以降実行ゼロ（出力1本のみ）。fetch-metrics.yml に追加し新規スパム参照元を毎週 surface。
5. **分析 cadence 化** — metrics-analyzer 出力が 2026-05-11 で停止（データは週次で流れているのに分析生成が止まっている）。seo-meta fetch はどの workflow にも無く 2026-05-17 停止。両者を cron 化。
6. **pages.dev プレビューの gtag ブロック** — `GoogleAnalytics.tsx:22-24` が「pages.dev 除外は未実装」と自認。`window.location.hostname !== "doboku-note.com"` 判定を追加し、プレビュー/コラボ環境の本番計測混入を遮断。
7. **UTM 規約ドリフトの是正** — doc は note→site を `utm_medium=inline`・site→note を `utm_source=site`/`utm_medium=banner`（`docs/project/03_SNS/02_チャネル動線設計.md:103-105`）だが、実装は `add-note-utm.mjs:12`＝`referral`、`note-magazines.ts:850`＝`doboku-note`/`referral`。check（`check-note-site-utm.mjs:69`）は `utm_source` しか見ず不一致を検知できない。規約と実装を統一し check に medium 検査を追加。

## Tier 2 — 中期（新規実装・粒度拡張）

8. **カスタムパラメータ導入** — `src/lib/gtag.ts:53-56` が UA 型3フィールド固定。資格category/記事slug/note productId/マガジンID をイベントパラメータに載せ、GA4 で「どの資格のどの記事からどの商品へ送客したか」をセグメント可能に。GA4 側でカスタムディメンション登録が前提（サーバ側作業）。
9. **サイト内検索・scroll depth・記事完読イベント** — `src/hooks/useSearch.ts:36-65` の executeSearch が GA4 `search`/`view_search_results` を未送信（検索語・0件ヒット率＝コンテンツ需要が不明）。scroll 90%・記事末到達も未計測（CTA より上での離脱が判定不能）。
10. **アフィリ A/B の event_label 取得** — 建設JOBs vs ビルドジョブ 50/50 A/B を config が設定（`affiliate-creatives.ts:99`）だが `fetch-ga4-cta-clicks.mjs:107-116` が `pagePath × eventName` のみで event_label（プログラム名）を dimension に含めず→**A/B が計測不能**。fetch に label 相当 dimension を追加。
11. **複合 dimension＋GA4↔GSC 突合** — `fetch-ga4-data.mjs`・`fetch-gsc-data.mjs` とも単一 dimension 固定。GA4 の channel×page（ページ別流入内訳）・GSC の query×page（どのページがどのクエリで表示）が取れず診断が粗い。URL キーで両者を join する週次レポートも無い。
12. **note.com referral の GA4 追跡** — `fetch-ga4-data.mjs` の DIMENSION_MAP・SPAM_REFERRAL に note.com が現れず、note→site の戻り流入を集計する手段が無い。`--dimension source` で note.com を明示集計するレポート追加。

## Tier 3 — 収益 attribution 基盤（本丸・大きめ）

13. **AdSense ページ別収益（RPM）取り込み** — 収益 fetch スクリプト0件・`.claude/state/metrics/monetization/` に AdSense 収益データ無し（coverage 生成物のみ）。AdSense Management API で page/日別 estimated_earnings＋RPM を取得する fetch を新設（fetch-ga4-* と同じ CI 供給パターン）。coverage dashboard に RPM 列を追加。
14. **sales-log × 流入の attribution** — `sales-log.json` に流入元なし・join 処理0件。次善策として productId→記事slug マッピングを追加し、CTA クリック数（`note_cta_click` ページ別）と売上件数を突合する「note ファネル効率」レポート。厳密 attribution は下記15が前提。
15. **送客リダイレクタ（clean URL→302＋UTM）** — `docs/project/03_SNS/02_チャネル動線設計.md:105` の提案が `public/_redirects` で未実装。自前ドメインの計測可能リダイレクタ経由にすれば GA4 outbound click と note UTM を同一 `utm_content` で crosswalk でき、site 境界で切れるファネルを繋げる。
16. **A8 成果/報酬の取り込み** — affiliate クリックは取れるが A8 の承認/報酬は手動確認のみ。A8 成果 CSV/API を履歴 JSON 化し EPC（報酬÷クリック）を KPI 化。

## サーバ側（GA4 管理画面 — コード不可・ユーザー手作業）

`measurement-incidents.md:186-194` が「未実施」と記録。fetch 側フィルタは取得時に弾くだけで GA4 UI の生数値は汚染されたままなので効果大:

- 内部トラフィック除外フィルタ（自分の作業 IP）
- 参照元除外リスト（spam referral）
- 「既知のボットを除外」ON の確認
- カスタムディメンション・キーイベントの登録（Tier 2-8/9 の前提）
- 未解決の bing bot 疑い（bing 252 > google 77 の逆転・`measurement-incidents.md:211-215`）の確定

## 付随発見（別修正候補）

- `monetization-strategy` SKILL.md が旧・書籍アフィリ前提のまま陳腐化（`SKILL.md:48` 「技術書籍（Amazon）」＝2026-06-25 廃止済み）。RPM/転換率/EPC の KPI 定義が skill 群に無い。

## 進め方

Tier 1（特に #1 NoteLink・#3-5 の CI 配線）から着手＝いずれも additive・低リスク。#8/#9 は GA4 側カスタムディメンション登録（サーバ側）とセット。コード変更（src/**）は feature ブランチ＋PR、CI/config 配線も同様。真実源の詳細 file:line は本ドキュメント。
