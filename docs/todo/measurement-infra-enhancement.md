# 計測基盤 強化ロードマップ

**発端**: 2026-07-03、計測基盤（GA4・note ファネル・アフィリ・収益 attribution・bot 衛生）を5面並行監査（全 findings は現物 file:line 裏取り済み）。「サイトを継続運営するための計測充実」という視点で、改良・設定すべき点を棚卸しした結果を本ドキュメントに集約する。backlog §6 から参照。

## 総括

**すでに健全（触らない）**: 本番のみ gtag 発火＝dev 内部トラフィック除外（`src/components/GoogleAnalytics.tsx:14`）／BAILOUT 恒久対策の Suspense 化（`src/components/providers/AnalyticsProvider.tsx:8-10`）／fetch 既定 Japan フィルタで bot 抑制（`.claude/scripts/fetch-ga4-data.mjs:83-87`）／CTA クリック計測 note_cta・affiliate_cta 稼働（28日で 351/20 クリック）／engagementRate 取得済／収益カバレッジ表の生成ロジック（`report-monetization-coverage.mts`）。

**穴は4クラスタ**: ①instrumentation（測れていない行動）②収益 attribution（クリック→円が繋がらない）③分析 cadence（データは流れるが分析が停止）④UTM/bot の設定ドリフト。

---

## 実施状況（2026-07-03・本番 deploy 済 `93b379df6`）

**コード実装完了（develop→main 反映済）**:
- ✅ #1 NoteLink 計測（別イベント `note_article_click`・PR #343）
- ✅ #2 MagazineCard trackLabel 伝播（PR #344）
- ✅ #3 収益カバレッジ表を CI 週次配線（PR #344）
- ✅ #4 bot 比率監査を CI 週次配線（PR #344）
- ✅ #6 pages.dev の gtag ブロック（fail-open・PR #344）
- ✅ #7 UTM referral の policy+check（PR #345・**content 移行は burndown 残**＝下記 item 7）
- ✅ #9 サイト内検索を URL(?q=) 同期し `view_search_results` 有効化（PR #346）。scroll は拡張計測 ON で自動・outbound は #1＋拡張計測でカバー済＝#9 完了
- ✅ #11 GA4×GSC crosswalk レポート（PR #347）＋週次 CI 自動化（gsc-page fetch＋crosswalk step）
- ✅ #10 アフィリ A/B の event_label 取得（PR #378 で `fetch-ga4-cta-clicks --by-label`＋fetch-metrics.yml step 配線・2026-07-07 に GA4 カスタムディメンション `event_label`/`event_category`〔イベントスコープ〕登録で前提充足＝以降ラベル別 CTR〔BuildJob-sidebar/midtext/hubcareer・KensetsuJobs-sidebar〕取得可。遡及なしのため蓄積待ち）
- （関連）deploy ドリフト検知＋check-links 偽陽性是正（PR #342）

**GA4 UI（ユーザー作業）**: A 内部トラフィック/参照除外 ✅・B キーイベント ✅・C 拡張計測 全 ON 確認 ✅・**D カスタムディメンション ✅**（`event_label`＋`event_category`・イベントスコープ・2026-07-07 登録＝#10 の前提を充足。#8 の追加 param〔productId 等〕は当該コード着手時に別途登録）／**E bing bot 確定 未**

**残（未着手）**: #5 分析 cadence（metrics-analyzer は LLM＝cloud routine／seo-meta 配線）・#8 カスタムパラメータ（追加 param の GA4 登録が前提）・#12 note.com referral・Tier 3（#13-16）・#7 content 移行 burndown

**deploy 後の検証待ち**: GA4 DebugView で `note_article_click`/`view_search_results` 発火・金曜 fetch-metrics 週次で coverage/bot-audit/crosswalk が更新されるか

---

## Tier 1 — すぐやる（低コスト・高効果／既存資産の配線・是正）

1. **NoteLink のクリック計測** 🔴 — `src/components/ui/NoteLink/NoteLink.tsx:60-64` の `<a>` に `data-cta="note"`＋`data-cta-label` を付与（既存デリゲート `AnalyticsProvider.tsx:26-52` に乗る）。記事内 note 無料記事送客（11箇所）が丸ごと未計測なのを解消。**最大の穴**。URL にも UTM 付与。
2. **MagazineCard に trackLabel 伝播** — `src/components/ui/MagazineCard/MagazineCard.tsx:32-39` が `MagazineInlineCard` へ `trackLabel={utmContent}` を渡していない（1行追加）。ページ×配置の CTA 粒度を回復。
3. **収益カバレッジ表を CI 配線** — `report-monetization-coverage.mts` がどの workflow からも呼ばれず `monetization/coverage-latest.md` が 2026-06-18 で停止。`.github/workflows/fetch-metrics.yml` に1ステップ追加で週次自動化。
4. **bot 比率監査を CI 配線** — `.claude/scripts/audit-ga4-bot-ratio.mjs` が未 wiring・2026-05-17 以降実行ゼロ（出力1本のみ）。fetch-metrics.yml に追加し新規スパム参照元を毎週 surface。
5. **分析 cadence 化** — metrics-analyzer 出力が 2026-05-11 で停止（データは週次で流れているのに分析生成が止まっている）。seo-meta fetch はどの workflow にも無く 2026-05-17 停止。両者を cron 化。
6. **pages.dev プレビューの gtag ブロック** — `GoogleAnalytics.tsx:22-24` が「pages.dev 除外は未実装」と自認。`window.location.hostname !== "doboku-note.com"` 判定を追加し、プレビュー/コラボ環境の本番計測混入を遮断。
7. **UTM 規約ドリフトの是正** — referral へ統一に決定（GA4 標準 medium）。**policy+check は PR #345 で完了**（doc を実装値へ是正＋check に `utm_medium=referral` 検証追加）。**残＝content 移行 burndown**: 既存 inline リンク 94 箇所/47 ファイル＋建設部門論点6本を referral へ移行する必要があるが、対象 53 ファイルのうち 36 が cover-fit・6 が note-lint の pre-existing 債務を持ち bulk 移行がそれらを巻き込む。→ 各ファイルの cover/CTA 債務を解消するタイミングで referral へ段階移行（新 check が編集時に強制・`SKIP_NOTE_UTM=1` で一時回避）。移行ロジックは `utm_medium=inline`→`referral` の単純置換（writeMdxFile・CRLF 保持）。

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
