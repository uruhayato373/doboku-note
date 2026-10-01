---
name: workflow-orchestration-gotchas
description: Workflowツールの罠—args文字列化/新規agentType未解決/重いdoc Readでストール/writerが勝手にcommit/QA指摘が規約を壊す。回避策まとめ
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b8972bc6-05e5-41a6-8185-402cd9789004
---

`Workflow` ツールで fan-out するときの実証済みの罠と回避策（2026-06-21、ガイド品質一括処理の100+本で確認）。

**Why/How to apply:**
- **args は文字列化されて渡る**: スクリプト先頭で `const items = typeof args === 'string' ? JSON.parse(args) : args` のガードを必ず入れる（入れないと `items.map is not a function` で即死）。
- **セッション途中で作成した agent は workflow の agentType で解決できない**: 新規 `.claude/agents/*.md` を `agentType:` 指定すると "agent type not found"。回避＝agentType を外し、**ルーブリック/指示をプロンプトに完全埋め込み**（既定の workflow subagent で動く）。次セッションからは登録される。
- **fan-out subagent に重い doc の全 Read を課すとストールする**: content-principles 全文(1000+行)を並列で Read させたら無編集のまま停止。回避＝**doc は読ませずルールをプロンプトに埋め込む**。civil-textbook-rewriter 等は system prompt に規約を持つので Read 不要で安定。
- **bulk subagent は必ず Sonnet**: `model:inherit` の Evaluator(guide-qa等)を親 Opus 下で大量 fan-out すると Opus 実行になりセッション上限直撃（19本で停止）。bulk は `model:'sonnet'` を明示 override、Opus は判断/fact-fix/フラグシップのみ。[[opus-sonnet-split]]
- **writer/rewriter subagent は指示しなくても `git commit` する**（2026-09-22 実証）: brief に「返答は path と字数だけ」と書いただけでは足りず、W4 の 5 体が develop へ **7 commit** を勝手に積んだ（未 push だったので回収できた）。レビュー前に HEAD へ載るので事故。**Workflow の全ステージのプロンプト末尾に「git コマンドを一切実行しない（commit/add/push/checkout/stash 禁止）。編集したらそのまま置く」を連結する**。明記すると守る（以降のエージェントは「git操作は実行していません」と報告した）。[[parallel-agent-commit-sweep]] は別物（あちらは他セッションの `git add -A` に巻き込まれる話）
- **QA の指摘をそのまま適用させると規約側を壊すことがある**: guide-qa が「想定読者 Callout を削除しリード散文へ溶かせ」と指示し、rewriter が従って必須 Callout が消えた（2026-09-22・W4 でも同型）。**決定的ゲート（個数チェック）を各記事に付けておけば次段で捕まる**ので、QA の助言は絶対視せずゲートで縛る。逆に言うと、ゲートを付けていない規約は QA の一言で壊れる
- **パイプライン途中でファイルを検査すると偽の NG が出る**: fix ステージがまだ走っている最中に親が gate 相当の grep をすると、直後に復旧される中間状態を掴む。**親の独立検証は workflow 完了通知の後に回す**
- 並行 Workflow は2本まで（[[workflow-concurrency-and-mac-pdf]]）。`git add $(node -e 'join(" ")')` はワード分割で失敗しやすい→ `xargs` を使う。
