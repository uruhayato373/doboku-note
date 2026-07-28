# 週間計画 — 2026-W31（07/28〜08/03）

**今週のゴール**: BuildJob増額キャンペーン終了（8/31）まで残り約5週の折返し。**A8単月取得の実機観察を完了させ、9月のアフィリEPC判定に向けた分母供給を再開する**のが最優先。並行して8月末の1級土木一次合格発表に向け二次（10/4）対策の死守コアを始動し、deploy済みのEXP-005（モバイルLCP改善）は再測定判定へ進める。
**参照**: [monthly.md](./monthly.md)（8月＝1級二次対策 仕込み期／BuildJob最終月）

---

## 今週やること

| 優先 | タスク | 担当 | 状態 |
|---|---|---|---|
| 🔴 | A8単月取得の実機観察を完了（`npm run a8-ui:fetch -- --dry-run --probe-period --headed`。read-onlyでcommitted化済み）→ 期間フォームDOMを`.claude/config/a8-report-automation.json`へ記述 → `setPeriodMonth()`実装。9月のEPC判定（対BuildJob→対GKS切替）の分母を供給する第一歩 | 当方（要ユーザーA8ログイン） | ユーザー操作待ち |
| 🔴 | EXP-005（docsテンプレ モバイルLCP改善）再測定＋判定。介入コミット`af8b6454a`（図版24本eager+fetchpriority化）は**既にmain deploy済み**、psi-batchも07-27 18:42Z時点で介入後の計測に入っている。数バッチ蓄積を待ってr07-aのmobile lab LCP中央値をbaseline 5653msと比較し`experiments.json`へ結果記録 | 当方（CI psi-batch蓄積待ち） | 判定待ち |
| 🔴 | 1級土木二次（10/4・残約9.5週）死守コア始動：完全攻略パック 完成答案draftの追録充実（会員ローンチ・LINE公式リスト捕獲はユーザー作業が律速のため今週は当方担当分のみ） | 当方 | 未着手 |
| 🟡 | search-growth修正計画の裁定セッション：最新run（07-23）で滞留中のUNKNOWN_REVIEW 1,765件を発生源別（GSC未登録/内部リンク孤立/パラメータ違い等）に束ねて一括方針決定、NOINDEX候補312件は代表10件を実URL確認して一括判断→`gsc-management.md`裁定ログへ記録（次runで同じ件数を再検討しないため） | 当方 | 未着手 |
| 🟡 | BK-09電力土木／BK-10鉄道 R08予想 各3記事 生成→factcheck→QA（他10科目は収録済・残る最後の2科目） | 当方（クラウド実行） | 未着手 |
| 🟡 | 読み方ガイド横展開（建設部門＋土木）組成着手：科目非依存の読み方ガイドのみ横断で成立と実証済み（06-23・売上TOP3独占の型）。①建設部門版（論文対策キーワード6テーマ＋書き方）②土木版（既存ガイド再包装） | 当方 | 未着手 |
| 🟡 | noteライブ有料境界の検査をcurl経路で恒久化（会社PCの`fetch`プロキシ遮断で偽PASS化＝2026-07-28実測675/675 FETCH_ERR。`.tmp/verify-note-boundary.mjs`で18/18判定成功済のプロトタイプをcommitted script化） | 当方 [Codex候補] | 未着手 |
| 🟢 | lint 9-16（Callout密度超過）22記事のバーンダウン（建設部門exam-themes13/コンクリート主任textbook3/経験記述系4/総監2） | 当方 [Codex候補] | 未着手 |
| 🟢 | note→サイト bare-url UTMバーンダウン(442件)のバッチ消化 | 当方 [Codex候補] | 未着手 |

### 手動キュー（ユーザー/Mac・時間差で可）

- A8ログイン＋`--probe-period --headed`の実機立会い（🔴の前提。A8セッション切れのため人のログインが必要）
- BuildJob stray下書き `nf2316420abd0` のnote.comダッシュボード手動削除（公開済み双子11:58と取り違えないよう手動限定）
- KDP: F系残り9冊（f-08〜f-16）を作成数制限の回復後に `npm run kdp-batch -- f-08 f-09 f-10 f-11 f-12 f-13 f-14 f-15 f-16` で提出

---

## 今週やらないこと

- コンクリート診断士cd-essay（来年7月向け・急がない）／iOSアプリ（Web月収¥15k達成後）
- BK-08〜BK-11のうちBK-09/10着手以外（港湾・トンネルは受験者規模小・後回し）
- 大規模UIリファクタ・広い表のモバイル横スクロール対応（`page.tsx`/`globals.css`を触るため、UI/デザインシステム編集の並行セッションと衝突しないタイミングで別途）
- IG論点パック残92件の波状予約（Meta規約上1セッション30件上限・別セッションで継続）
- 会員特典22本の会員限定公開・2級想定工事バンクの会員内包（メンバーシップローンチが律速＝ユーザー判断待ち・🟣backlog参照）

---

## メモ・ブロッカー

- **BuildJobキャンペーン終了 = 2026-08-31**。9/1にGKSへ全面が自動復帰する（SSG・ビルド時刻で確定）。残り約5週。A8実績が入らないと9月のA/B判定が実行不能＝今週のA8対応が最優先タスク。
- **EXP-005**: 介入コミット`af8b6454a`は既にmain deploy済み（`git merge-base --is-ancestor`で確認）。判定は複数psi-batch中央値で行う設計（lab値の単発判断はしない・measurement-incidents.md準拠）。数日分蓄積後に`npm run check-experiments-due`で状態確認して判定を進める。
- **search-growth**: 最新run（07-23）でUNKNOWN_REVIEW 1,765件・NOINDEX候補312件が承認ゲート前で滞留。機械適用できるFIX_TECHNICAL/REDIRECT_LEGACYは0件＝出尽くし済み。全件裁定は非現実的なので上位バケット代表を見て一括方針を決めるスコープに限定する。
- **weekly.mdが2週分（W30）未更新だったギャップをgit logで補完**：技術士二次試験終了（7/19-20）後、W30相当の期間でBuildJob note展開の実公開完了・KDP 13冊出版（C系3+F系7+当初3）・3ASPアフィリ運用基盤統合（A8/もしも/afb横断カタログ・サイト帰属ガード`asp-site-guard.mjs`）・エージェント7体のBOM欠損修正（読み込まれていなかった）・A8 `--probe-isolation`→`--probe-period`実装・アフィリEPC判断マトリクス新設（affiliate-operations.md §6.5）・BK価格frontmatter同期（132本+6本）・実験再測定期限surfacer(`check-experiments-due`)新設 が実績として積み上がった。次回からweekly.mdは毎週更新する。
- **並行セッション注意**: 複数セッション常態のため、push前に`git log origin/develop..HEAD`で巻き込み確認。commitはpathspec明示（`git add -A`禁止）。
