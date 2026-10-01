---
name: feedback_pdf_on_demand_only
description: "マガジンの紙用PDFは必要時のみオンデマンド生成。Macのmagazine-to-pdfは9/30にCHROME_PATH指定で完走・固まればWindows/Playwright page.pdf()"
metadata:
  type: feedback
---

note マガジンの紙用 PDF（`scripts/magazine-to-pdf.mjs`）は、マガジン作成・配線のたびに自動生成せず**必要なとき（実際に印刷/PDF納品する時）だけ生成する**（ユーザー指示 2026-05-29）。マガジン本体・配線の検証に PDF 実生成は不要で、Chrome ヘッドレス起動の毎回のコストが無駄。

**How to apply（検証）:** マガジン実装の検証は「PDF spec の JSON 妥当性（`JSON.parse`）＋ include の from/to 見出しが記事に存在するか（grep）」で行い `node scripts/magazine-to-pdf.mjs` は走らせない。PDF spec は将来のオンデマンド生成用に正しい JSON で残す（`to` の正規表現は `"^\\*\\*関連リンク"` のように JSON エスケープに注意。heredoc だと `\\` が `\` に潰れて JSON 不正になるので Write ツールで書く）。関連: [[project_civil1_flagship_pack]]

## Mac での PDF 生成（2026-06-15 → 2026-07-04 訂正 → 2026-09-30 更新）
- **2026-09-30**: Mac でも `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/magazine-to-pdf.mjs` が1本8秒で完走した（完全攻略パック12本・5ページ・既存と同じ紙面）。以下のハングは再現しなかったので、まず Mac で1本試し、固まったら Windows か Playwright へ。
- 過去の知見（2026-07-04 訂正）: ハングするのは `--print-to-pdf` 経路だけ。`magazine-to-pdf.mjs` が system Chrome を `--headless=new/old` + `--print-to-pdf` で叩くとプロセスが終了せずハング（execFileSync 120s タイムアウト）→その用途は Windows。**Playwright の `chromium.launch({headless:true})` → `page.pdf()` は Mac で正常動作**（A5赤シートPDFを数秒で生成・10本の note 公開も channel:chrome で成功＝Chrome 自体は健全）。
- カスタム HTML→PDF が要るときは magazine-to-pdf でなく Playwright `page.pdf()`。実例 `scripts/generate-anki-pdf.mjs`（直前暗記ノート一問一答を A5 赤シート化・答えは赤字#e60012・`preferCSSPageSize`・section に `break-inside:avoid-page` を付けると1分野が丸ごと次頁送りで余白発生→section は流し qa/h2 だけ avoid）。関連: [[project_civil_niji_gakka_line]] [[reference_figure_provenance_system]]
- 大規模 Workflow の並行は2本まで（[[feedback_workflow_orchestration_gotchas]]）。
