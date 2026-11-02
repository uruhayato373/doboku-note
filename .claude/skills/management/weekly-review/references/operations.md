# headless 実行の詳細・運用ルール・参照

`SKILL.md` の「実行主体」「運用ルール」の詳細。ヘッドレスで回すとき、運用ルールや関連スクリプトを確かめたいときに読む。

## ヘッドレスで回すときの詳細

**ヘッドレスで回すとき**（launchd の起動プロンプトがそう伝える）: AskUserQuestion は使えないので、Phase 3.5 の判断待ちは「## バックログの関門」に背景・選択肢・おすすめを 1 件ずつ書き、行頭に `<!-- weekly-review:pending-questions -->` を置く（台帳の 🟣 は残す）。次の対話セッションで諮り、答えで台帳を直してから印を消す。外部への公開・投稿・送信・購入はしない。**Claude の中ではログインしない**（`CLAUDECODE=1` で資格情報が読めない）。ログインが要る取得・照合は直前の土曜の収集が回しているので、その記録と、段ごとの結果 `.claude/state/weekly-collect/runs.json`（`npm run check-weekly-collect` で段ごとの最新の合否。運営者の取り直しも数える）を読み、失敗・skipped の段は理由とともに未取得として書く。段の理由の「検算 <点検 id>」は、取った記録の検算（quality-audit の cadence collect）が落ちたもので、取り直すか記録を直す（DN-0847）。`.claude/` の下のファイルは Claude Code の保護で書けないので、翌週の `.claude/todo/weekly.md` などは `.tmp/claude-out/` の下に `.claude/` を外した相対パスで書く（例 `.tmp/claude-out/todo/weekly.md`。途中に `.claude` を含めるとその書き込みも拒否される。終了後に `scripts/apply-claude-out.mjs` が写して commit する・DN-0829）。機械で決まる surfacer は CI 側（quality-audit の ops（毎日）/report 区分・weekly-review-guard の job summary）と、下書きの review-checks（週次の点検 `npm run quality:audit:weekly`）が先に回しているので、本スキルは**その結果を読む**ことを優先し、同じ検査を二重に叩かない。

## 運用ルール

- **毎週土曜にローカルで実行**（金曜 06:00 JST の fetch-metrics が成長パック・機会ダイジェスト・実験の自動計測を push し、この回の直前に Mac の GSC の記録層が意味の判断を観測ログへ足した後）
- レビューは `docs/reviews/weekly/YYYY-Www-review.md` に保存（GitHub Issue は使わない）
- レビュー完了後に `/plan-weekly` を実行し、翌週の計画を `.claude/todo/weekly.md` に書く
- 未完了アクションは「来週への申し送り」に振り分け先付きで書き（Phase 4）、次週計画へ引き継ぐ
- 計測ダイジェストの表示対象（`OPP-…`）は Phase 2.5 で全件処分する。未処分とレビューへの未反映は月曜の `check-growth-triage` が Issue にする
- 最新レビュー＋次週計画だけを `docs/reviews/weekly/` に保持する。旧週は未完タスク・恒久知見を抽出後に削除し、履歴はgitで参照する（抽出もれは `check-handoff-extraction` が pre-commit で止める）

## 参照

- `.claude/skills/management/plan-weekly/SKILL.md` — 週次計画
- `.claude/skills/management/nsm-experiment/SKILL.md` — 実験ライフサイクル管理
- `.claude/scripts/lib/metrics-reader.mjs` — NSM 週次メトリクス取得（本スキル Agent C の中核）
- `scripts/x-queue-surfacer.mjs` — X 予約キューの未投入下書き surfacer（本スキル Agent I の中核。`npm run x-queue-surfacer`）
- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs` — GSC 個別取得（ページ別・フィルタ付き）
- `.claude/scripts/fetch-ga4-data.mjs` — GA4 個別取得（ディメンション・メトリクス指定）
- `scripts/check-experiment-due.mjs` — 実験の再計測/close 期限 surfacer（`npm run check-experiment-due`）
- `scripts/build-growth-digest.mjs` / `scripts/growth-triage.mjs` / `scripts/check-growth-triage.mjs` — 計測ダイジェスト・全件トリアージ・月曜の反映ゲート（本スキル Agent G と Phase 2.5 の中核。真実源 [growth-cycle.md](../../../../knowledge/reference/growth-cycle.md)）
- `scripts/check-note-delivery-due.mjs` — **note の商品が購入者に届いているか**の surfacer（日次 ops `note-delivery-due`）
- `scripts/check-coconala-orders.mjs` — ココナラ取引の突合＋**評価未送信/期限切迫** surfacer（`npm run check-coconala-orders -- --json`）
- `scripts/check-coconala-blog.mjs` — ココナラブログのハードゲート＋**送客先ドリフト** surfacer（CI ゲート `coconala-blog`）
- `scripts/check-internal-links-vs-gsc.mjs` — 公開ページ→404/リダイレクト URL の内部リンク検査（`/google-search-growth` で使う）
- `scripts/check-disk-hygiene.mjs` — ローカル容量の surfacer（quality-audit report `disk-hygiene`）。**Mac のローカルでのみ成立**（CI は exit 2＝検査不成立）。掃除は日次 launchd が回すので、レビューで見るのは「止まっていないか」と履歴の棚卸し要否だけ
- `.claude/skills/management/nsm-experiment/references/definition.md` — NSM 定義の真実源
