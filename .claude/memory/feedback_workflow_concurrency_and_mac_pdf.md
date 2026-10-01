---
name: workflow-concurrency-and-mac-pdf
description: 大規模Workflowは並行2本まで。Macのmagazine-to-pdfは9/30に完走（CHROME_PATH指定）・固まればWindows
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f177789f-7bca-4e0d-96b0-80957b73cf0a
---

大規模 note 生成（pe-secondary-exam-writer/factcheck/qa を回す Workflow）の運用で得た再発防止則（2026-06-15、建設部門BK-04〜11拡充）。

**並行ワークフローは最大2本**まで。3本同時（同時40+ の sonnet エージェント＋WebSearch）にすると、エージェントが「no progress 180s × 6回」でストールし、記事が未検証のまま pipeline から落ちる事故が多発した。2本に絞ったらストールはゼロ。`pe-secondary-exam-factcheck` は WebSearch で1件5〜8分かかり重いので特に効く。

**2026-09-30 追記: Mac でも `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/magazine-to-pdf.mjs` が 1 本 8 秒で完走した（完全攻略パック 12 本・5 ページ・既存と同じ紙面）。以下のハングは再現しなかったので、まず Mac で 1 本試し、固まったら Windows か Playwright へ。**

**Mac で「ハングするのは `--print-to-pdf` 経路だけ」（2026-07-04 訂正）**。`scripts/magazine-to-pdf.mjs` が system Chrome を `--headless=new/old` + `--print-to-pdf` で叩くとプロセスが終了せずハング（execFileSync 120s タイムアウト）→ その用途は Windows。**ただし Playwright の `chromium.launch({headless:true})` → `page.pdf()` は Mac で正常動作する**（実測: A5赤シートPDF を数秒で生成。10本の note 公開も channel:chrome で成功済み＝Chrome 自体は健全）。カスタムHTML→PDF が要るときは magazine-to-pdf ではなく Playwright `page.pdf()` を使う。実例 `scripts/generate-anki-pdf.mjs`（直前暗記ノート一問一答を A5 赤シート化・答えは赤字#e60012・`preferCSSPageSize`・section に break-inside:avoid-page を付けると1分野が丸ごと次頁送りされ余白発生→section は流し、qa/h2 だけ avoid）。関連: [[project_civil_niji_gakka_line]]

**Why**: 大規模並行は API/リソース競合でサブエージェントが沈黙する。Mac Chrome の new/old headless はこの環境で print-to-pdf 後に正常終了しない。

**How to apply**: Workflow は2本まで／各科目はfullモード後に「ストール＋fact残存」を gapfill で拾う。PDFは Windows。`check-note-charlimits`(pre-commit) は QAのpython計測より厳密で III/必須I の1,800字超過を弾くので commit 前提で圧縮が要ることがある。fact残存（自動fixで解けない likely_wrong）は factcheck詳細→該当行Edit の手動是正が確実。関連: [[reference_cover_ogp_regen_sweep]]
