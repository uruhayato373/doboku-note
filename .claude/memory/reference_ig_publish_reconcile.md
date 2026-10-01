---
name: reference_ig_publish_reconcile
description: "IG公開状態の照合＋未公開予約の継続運用スキル一式（verify-ig-status / ig-reconcile / ig-publish-auditor）と実ハンドル・プランナー読取の罠"
metadata:
  type: reference
---
IG 投稿の「公開済みか照合（現状確認）」と「未公開の予約投稿」を反復運用する仕組みを 2026-06-25 に新設（commit cc621fc23、develop）。手作業でやって手こずった経緯の仕組み化。真実源 → `docs/reference/ig-publish-reconcile.md`。

**構成（verify-note-status の reconciler パターンに倣う）:**
- `config/ig-account.json` — IGアカウントSSOT。**実ハンドルは `@dobokunotecom`**（X と同一）。`docs/sns/instagram/profile.md` の旧「`@doboku_note` 想定」は誤りで是正済み。publish-ig-bs.ts は既定 `dobokunotecom` で整合。
- `npm run verify-ig-status`（`scripts/verify-ig-status.mjs`）— ライブのグリッド＋プランナー↔ローカル posted.json/status.json を突合。read-only・ドリフト7分類（published_recorded / published_UNrecorded★ / draft_misrecorded★ / recorded_but_gone★ / scheduled / unpublished / anomaly★）→ `.claude/state/ig-reconcile/snapshot.json`・exit 2。ig-status.mjs の walk/normalize を再利用（export化＋main guard 済み）。
- `/ig-reconcile` スキル（`.claude/skills/social/`）— 照合→SoT是正→ig-publish-auditor ゲート→publish-ig-bs で 19:00 帯予約→プランナー実体確認。投稿/予約は operator 確認後・**削除は対象外**。
- `ig-publish-auditor`（Evaluator/sonnet/Bash不可）— 公開可否ゲート＋重複異常検出。
- 週次: `/weekly-review` に `verify-ig-status` をサーフェス配線。

**実装上の罠（再発防止）:**
- 記録側の判定は**直接存在チェック**（`/p/<sc>` が「ご利用いただけません」か）。プロフィールグリッド走査は遅延ロードで全件載らず、membership 判定だと生存投稿を「削除済み」誤検知する（cash-flow/mcgregor で実証）。
- プランナー予約確認は**月ビューの時刻チップ座標抽出のみ動く**。週送りボタンは Playwright クリック不可・日セルのクリックは投稿作成画面を開く（禁止）。
- 削除直後の存在チェックはキャッシュ誤検知あり→数秒後に再確認。
- ブラウザ系は `.local/playwright-ig-bs-profile`（ログイン済）必須＝**ローカル実行限定**。
- **`publish-ig-bs --now`（即時）は偽陰性を出す（2026-07-19 実証）**: 「投稿の公開中 しばらくお待ちください…」モーダル表示中に確認タイムアウトし `🚨 公開の成功を確認できません`→`❌ 失敗` と報告するが、**IG 側は server-side で公開完了しておりライブになっている**。publish-x の偽成功（失敗を成功と誤報）とは逆向き。**鉄則＝--now が失敗報告でも即リトライしない**（重複投稿＝spam リスク）。必ずプロフィールグリッド（`instagram.com/<handle>/`）を実査し top 投稿の alt/日付で実在確認してから status を判定。R8解答速報カード（解答グリッドは alt が "calendar and text" になる）で実証。`--now` は fail-safe が緩む設計（SKILL上「非推奨」）＝速報用途では確認前提で使う。
- **単一画像フィード投稿は可能**: SKILL説明は「カルーセル2-10枚」だがコードは `CAROUSEL_MIN = 1`＝画像1枚でも通る（`carousel/img/*.png` 1枚＋`carousel/caption.txt`）。速報の単発カードに使える。
- **投稿型判定（リール/カルーセル）は `<video>` 要素の有無が最も確実**（実測 reel=1/carousel=0）。/reel/ リダイレクト・本文「オリジナル音源」「リール動画を宣伝」マーカーは headless で取りこぼすことあり（待機 2.5s 推奨）。og:type は両方 article で使えない。

**rio 型取り違え事故（2026-06-25・type_mismatch を新設した動機）**: rio(環境条約の流れ)の黒カルーセル DZ8qhf0k3ah を「白版に貼り直し済み」と誤認して削除したが、残っていた DaAFq59EuIO は**リール**だった（カルーセルでなく）。結果カルーセル消失。**鉄則=リール≠カルーセル、同テーマのリール存在はカルーセル削除の根拠にならない、削除/重複判定前に型を確認**。verify-ig-status に `type_mismatch`（carousel 記録がリールを指す）＋型考慮 anomaly を追加し機械ガード化（commit 42abc0331）。posted.json 是正（b40e473f6）＋**白カルーセルを 7/3 19:00 に再予約完了（84ee7dc4b・プランナー実体確認済み）＝復旧完了**。rio はカルーセル＋リールの両フォーマット揃い。

**publish-ig-bs は symlink した .local の worktree から実行すると失敗する（重要）**: 2026-06-25、verify-ig-status(headless・実パス) はセッション有効なのに、publish-ig-bs を symlink された `.local` の worktree（doboku-note-ig）から実行すると「ログインが必要」で 300s ハング。原因＝**Chrome が --user-data-dir の symlink パスを実パスと別プロファイル扱い**しログイン状態を拾えない。**解決＝実体 `.local` のあるメイン worktree から実行**（朝の予約が動いたのもメインからだった）。ブラウザ操作は symlink worktree で回さない（commit は symlink worktree でも可＝node_modules symlink だけで足りる）。スタックした browser は `pkill -f playwright-ig-bs-profile` で掃除。

関連: [[reference_note_status_reconciler]]・[[feedback_workflow_orchestration_gotchas]]・[[feedback_multi_session_concurrent_git]]。
