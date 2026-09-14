---
name: project_civil1_shikou_law_expansion
description: 1級土木 施工管理・法規編テキスト→サイト拡充計画（安全/環境 新規11ページ＋法規の緊急是正）
metadata: 
  node_type: memory
  type: project
  originSessionId: 65d3b411-2c0f-4184-a332-e695b132226e
---

1級土木「テキスト（施工管理・法規編）」全7章をサイト civil-construction-1 へ展開する計画を策定（2026-07-03、4並行監査で既存34 textbookページと突合）。真実源=[docs/todo/civil1-textbook-expansion.md](docs/todo/civil1-textbook-expansion.md)、backlog にも登録済。

**結論**: 大きな穴は第5章 安全管理（131k字・textbookゼロ→新規7ページ order 500台）と第6章 環境保全（53k字・ゼロ→新規4ページ order 600台）。他5章は既存で網羅済＝既存深掘り＋自前SVGのみ（工程図表7種の実図・NW計算演習が最有力）。

**進捗(2026-07-03大量前進)**: 新規11ページ＝**全完成(draft)**。安全7本(scaffolding/excavation-shoring/management-system/risk-assessment/machinery-crane/industrial-safety-law/work-environment)＋環境4本(noise-vibration-regulation/water-air-soil-pollution/construction-byproduct-recycle/waste-disposal-manifest)。すべてpublished:false・自前SVG計29点・写真ゼロ(著作権クリア)・数値WebSearch照合・SVG監査0 findings。Opus並列サブエージェント執筆＋親統合方式(407プロキシで落ちた1本は自作)。環境tagはenvironmental-management。

**フェーズ0緊急是正=完了**: ①金額基準4,500万→5,000万(令和7年2月改正)を12箇所是正(commit 0c69c9dd9)。②年少者/妊産婦の就業制限表をtextbook-labor-standardsに追加(重量物満16未満12/8・満18以上女性30/20、妊婦×/産婦△/その他○、OCR「35/15」是正、commit 2f0717d7f/de6742eb1)。

**残(トラッカー参照)**: フェーズ3既存深掘り(schedule-charts工程図表7種実図・network-schedule NW計算・control-chart X̄-R実図・quality-inspection OC曲線整合)=Opus可・未着手。published化+OGP=QA後。**guideテキスト参照の11本結線=publish+deploy後gate(check-sns-urlsが本番実在検証)**。機械8ページ写真差替=Gemini別環境。学びの規約: SVGは濃色塗り+白文字NG(P8)・font≥11・概念名タイトルNG・viewBox0 0 400 500、MDXは`）**`(太字末尾全角括弧)NG・description≤200字・新pageへのSeeAlsoはpublish後。並行セッションが共有indexにbroad git add→pathspec commit厳守(git reset -qで自分以外unstageは非破壊)。

**写真差し替え**: 機械系8ページの現行写真(大半Wikimedia CC/PD=合法)をPDF写真ベース→AI処理へ差替のマニフェスト作成済=[docs/todo/civil-machinery-photo-manifest.md]。24枚中20枚はPDF写真PNG(02-/05-)で賄い4枚AI生成。実行=AI処理(強い変形)→差替→commitを一体で(生画像を先行公開しない)。この環境でWebSearchは可(数値照合可)・Gemini APIはプロキシ不可でCodex/Mac側。

**制約**: テキストは市販書スキャンOCR＝公開禁止（[[project_civil1_textbook_transcription]]）。本文は自前書き起こし・図は自前SVG新規作成（スキャン転載NG、ドラフト中の一時プレースホルダは .tmp/・published:false で本番に到達させない）。数値は原典照合必須。着手順=フェーズ0緊急是正→安全→環境→既存深掘り。品質採点=civil-construction-qa。
