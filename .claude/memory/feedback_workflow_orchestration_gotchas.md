---
name: feedback_workflow_orchestration_gotchas
description: "Workflow/サブエージェント運用の罠: 並列ワーカーの一時パス共有・args文字列化・新agentType未解決・重いdoc Readでストール・writerが勝手にcommit・並行2本まで・Bash不可・夜間一括・機械作業は直接処理"
metadata:
  type: feedback
---

`Workflow` ツール・サブエージェントで fan-out するときの実証済みの罠と回避策（主に2026-06-21 ガイド品質一括100+本・2026-06-15 建設部門BK拡充・2026-09-22・2026-09-30）。

## Workflow の罠
- **args は文字列化されて渡る**: 先頭で `const items = typeof args === 'string' ? JSON.parse(args) : args` のガード必須（無いと `items.map is not a function` で即死）。
- **並列ワーカーに共有の一時パスを書かせない**（2026-10-06）: 図の worker 定義が `$TMPDIR/view.png` に変換して Read させていたため、同時に走った 2 体が互いの画像を読み、gnss-receiver を隣の fig-2-53 の画像で判定した（判定理由に入力と違う図の内容が書かれて発覚）。一時ファイルは入力ごとの専用ディレクトリ（figKey 等から作る）に置かせ、判定前に「読んだ画像が入力か（寸法・alt）」を確かめさせる。親は理由文が入力と合っているかを見る。
- **セッション途中で作成した agent は agentType で解決できない**（"agent type not found"）: agentType を外しルーブリック/指示をプロンプトに完全埋め込み。次セッションから登録される。
- **fan-out subagent に重い doc の全 Read を課すとストール**（content-principles 全文1000+行を並列 Read させたら無編集のまま停止）: doc は読ませずルールをプロンプトに埋め込む。civil-textbook-rewriter 等は system prompt に規約を持つので Read 不要で安定。
- **bulk subagent は必ず Sonnet**: `model:inherit` の Evaluator(guide-qa 等)を親 Opus 下で大量 fan-out すると Opus 実行になりセッション上限直撃（19本で停止）。bulk は `model:'sonnet'` を明示 override、Opus は判断/fact-fix/フラグシップのみ（[[feedback_opus_sonnet_split]]）。
- **writer/rewriter subagent は指示しなくても `git commit` する**（2026-09-22 実証）: brief に「返答は path と字数だけ」では足りず W4 の5体が develop へ7 commit を勝手に積んだ（未 push で回収）。**全ステージのプロンプト末尾に「git コマンドを一切実行しない（commit/add/push/checkout/stash 禁止）。編集したらそのまま置く」を連結**（明記すると守る）。他セッションの `git add -A` に巻き込まれる話は [[feedback_multi_session_concurrent_git]]。
- **QA の指摘をそのまま適用させると規約側を壊す**: guide-qa が「想定読者 Callout を削除しリード散文へ溶かせ」と指示し rewriter が従って必須 Callout が消えた（2026-09-22・W4 も同型）。決定的ゲート（個数チェック）を各記事に付ければ次段で捕まる＝QA の助言は絶対視せずゲートで縛る（ゲート未設置の規約は QA の一言で壊れる）。
- **パイプライン途中のファイル検査は偽 NG**: fix ステージ稼働中に親が gate 相当の grep をすると中間状態を掴む。親の独立検証は workflow 完了通知の後。
- **並行 Workflow は最大2本**: 3本同時（同時40+ の sonnet + WebSearch）だとエージェントが「no progress 180s × 6回」でストールし記事が未検証のまま pipeline から落ちた（2本に絞ったらストールゼロ・`pe-secondary-exam-factcheck` は WebSearch で1件5〜8分と特に重い）。各科目は full モード後に「ストール＋fact 残存」を gapfill で拾う。`check-note-charlimits`（pre-commit）は QA の python 計測より厳密で III/必須I の1,800字超過を弾くので commit 前提で圧縮が要ることがある。fact 残存（自動 fix で解けない likely_wrong）は factcheck 詳細→該当行 Edit の手動是正が確実。`git add $(node -e 'join(" ")')` はワード分割で失敗しやすい→`xargs`。

## サブエージェントは Bash を使えない
Agent ツールのサブエージェントは bypassPermissions でも Bash を拒否される（settings.local.json の `permissions.allow` はメインプロセスにのみ適用・独立した権限コンテキスト）。PDF→MDX 変換など Bash（pdftotext, pdftoppm）が要る作業は、メインで事前にテキスト抽出して `/tmp/` に保存し、サブエージェントには Read + Write のみで完結するタスクを渡す。

## 夜間一括消化の規律（2026-09-30 夜・エージェント約20体・PR 7本）
- develop 直 push のコンテンツが content-quality-ratchet（15-1 等）に触れ以降の全 PR の CI を赤くした（ラチェットが CI にしか無かった）→2026-10-01 に pre-commit へ staged 版を追加済み（install-pre-commit.mjs・published: true だけ対象）。エージェントが付けた `reviewStatus: verified` はスキーマ外（needs-review/approved/rejected のみ）。PR が他人起因で赤いときは `gh pr update-branch` で develop の修正を取り込んでから再判定。
- 並行エージェントがセッション共通 scratchpad に `edit.mjs` 等の汎用名で置き互いに上書き→委任文で一時ファイルは worktree 内 `.tmp/<担当>/` と指定（workflows.md「同一ワークツリーで並行」）。
- 親が子を3体起動すると同時起動が §5 上限超→委任文に「子は同時2体まで」。
- 見た目が変わる PR の e2e visual 失敗は、失敗 run の `playwright-e2e-*` artifact の `*-actual.png` を基準画像名にコピーして commit（`visual-snapshots-*` は既存と同じで役に立たない）。diff 画像で意図どおりか確認してから。関連: [[feedback_exam_pdf_cross_reference]]

## 仕様が固まった機械作業は直接処理する（2026-06-21）
note 売上のダッシュボード→sales-log.json 転記など明確な作業は、skill 呼び出し→サブエージェント委譲と遠回りせず Read/Edit/Bash で直接処理する（surface されていない `/record-sales` を Skill で呼んで弾かれ、`sales-recorder` 委譲でユーザーに2回 interrupt された）。skill が利用可能一覧に無ければ SSOT（reference）を Read して手順を踏み直接実行。
- 売上記録は既存ログの (date, productId, price) と突合して重複 skip（既存月は記録済みのことが多い）。productId は sales-recorder.md の mapping と既存ログの slug 系統（`bk-*`/`essay-*`。note-magazines.ts の `pe-construction-*` とは別系統）に合わせる。
- 新商品を売ったら sales-recorder.md の mapping 追加が必要。取りこぼしは `npm run check-sales-mapping` が pre-commit で検知（2026-06-21 新設・未文書化 productId・`article:unknown-*` で exit 1・回避 `SKIP_SALES_MAPPING=1`）。`npm run sales-summary -- 2026-06`（月は位置引数。`--month`/`--trend`/`--by-product` は未実装）。
