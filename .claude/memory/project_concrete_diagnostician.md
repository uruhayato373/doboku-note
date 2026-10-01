---
name: project_concrete_diagnostician
description: "コンクリート診断士 第5資格。18記事公開済・権利確認は2026-09-12運営者確定（演習全数オリジナル・図はスキャン0）。テキスト6章深掘り(DN-0193)＋概念図15枚(DN-0194)完了 2026-09-13"
metadata:
  type: project
---

コンクリート診断士（JCI）を doboku-note の**第5資格 vertical** として新設（2026-05-30）。slug=`concrete-diagnostician` / variant=civil / order=2.6 / **visible:false**（下書き段階、サイト非露出）。groups = guide / textbook / primary。試験=四肢択一40問＋記述式（問題A/B）3.5h、各足切り。原典=技報堂『コンクリート診断士 受験対策講座 2020』スキャン10分冊（`docs/textbook/コンクリート診断士/`、I部択一解説テキスト＋II部記述式＋III部厳選101問）。

**出荷済（全 published:false / 18記事）**: ガイド4本（`c710e6715`）、テキスト6章＋図25点webp（`36471a984`）、**択一過去問98問＋図59点を演習8本** `primary-exercise-01〜08`（`9b72e9530`/`0839de1e3`）。scaffolding `e8717ba67`。テキスト散文・解説は原典を写さず独自執筆、図のみ原典スキャンからクロップ。

**過去問択一の正攻法整備（重要・実証）**: 初回 transcribe→verify は照合パス5/53と低品質（約6割図依存・逐語誤り・正答別頁）。そこで **頁ごと回転補正(rotate 90°)→左右分割→transcribe→verify→self-repair(校閲指摘をfeedbackに再transcribe)→再verify** の自己修復パイプライン＋**図依存問題の bbox クロップ**＋**正答は頁内解説＋独立解答で確定(confidence付与)** で完遂（PDF9 84エージェント/PDF10 102エージェント、計~520万トークン）。解答一覧表(PDF10 p16-18)は読取不整合で不採用。低確度正答(~40問)は記事冒頭の下書き注記Callout＋`{/* */}`注記で明示。**JCI過去問再録のため公開は権利確認必須＝当面draft固定**。残課題: 低確度の人手校正・欠番(48/56/85)補完・図トリミング・記述式(II部)。雛形は `.tmp/{render-rot,wf-finalize9/10,assemble}.mjs`。詳細 → handoff。スキャン回転は頁により不統一。[[reference_scanned_pdf_pipeline]] の発展形。

**記述式は note 有料マガジン**（2026-05-31, `7b2b9a38d`）: サイトではなく note 有料で展開。`docs/note/コンクリート診断士/magazines/コンクリート診断士-記述式-模範答案集/` に8記事（解法ガイド1＋問題A模範答案2＋問題B模範答案5: 塩害/中性化/ASR/凍害/疲労複合）。**オリジナル代表問題**＋フル模範答案＋採点者視点＋置換ガイド、固有数値は〇〇置換前提＝**択一と違い公開に支障なし（sellable）**。`note-magazines.ts` に `cd-essay-magazine`(published:false, ¥1,980/8本)登録。公開時: noteUrl埋め＋cover画像＋placement配線。`civil-keiken-essay-qa` は施工経験記述専用で診断士論述に非対応＝人手レビュー要。[[project_note_write_automation]]。

**2026-08-22 更新（上の「当面draft固定」は解消済み）**: サイト18記事は現在 **published:true**。演習98問は**オリジナル設問へ書き直し済み**（記事冒頭 Callout で明示）、旧スキャン図58点は記事から外され実体も削除済み。現存する図は自作 SVG 22点＋**実写真8点**（スキャンではない）。ただし写真に出典表記が無く、`figure-provenance.json` の `figure_origin: textbook-scan` は `source_dir` からの推定ラベルで実体と一致しない（**実見で確認すること**）。Kindle `g-01`(¥990) は EPUB 完成・`status: ready` だが、写真のライセンス特定が済むまで提出保留（DN-0117）。姉妹の `g-02` コンクリート主任技士は図57点が**本物の印刷ページスキャン**（裏写り・網点）で、こちらは自作 SVG への描き直しが要る。

**公開ゲート**: 公開時は (1) テキスト図の精密トリミング/SVG化（現状ラフな頁領域クロップ＝原典本文画像を含み著作権上も要差替え）(2) `refresh-indexes` 実行（並行セッション競合回避のため未実行）(3) visible:true + published:true。[[project_concrete_chief_engineer]] の姉妹 vertical。

**並行セッション事故**: 作業中、別セッションが同一ブランチ `feat/concrete-chief-engineer` で並行コミットし `git add` が診断士PDF(`04062a1c4`)と初期版テキスト(`7c670c675`)を巻込。修正版上書き済。[[feedback_multi_session_concurrent_git]]。


**2026-09-12 権利確認確定（DN-0195 削除）**: 運営者が「確認済みとして着手」を選択。根拠＝演習 8 本すべて冒頭 Callout でオリジナル設問と明示・raster 8 点は全て AI 生成（MDX の `{/* source: AI 生成画像 */}` が真実源・`figure-sources.json` の textbook-scan ラベルは 2026-09-12 に ai-generated へ是正）・deep 逐語 0／264 組。結論は reference-sources.json の notes に記録。テキスト 6 章の深掘り（DN-0193）は主任技士と同じ Reader→親→Writer→Evaluator の brief 方式（プロンプトは scratchpad `cd-reader/writer/qa-*`）。記述式の模範答案は note 商品なので記事には「思考フレーム」H2 だけ置き答案例は書かない。

**2026-09-13 DN-0193/0194 完了**: テキスト 6 章を 13k〜16.5k 字へ深掘り（各章末に H2「記述式で使う思考フレーム」＝変状→機構→調査→判定→対策の鎖を散文で他章リンク付き。答案例は書かない）、概念図 SVG 15 枚追加（既存 22＋15＝37）。guide-overview の 5 本柱から 6 章へリンク。QA が捕まえた注意点: Sonnet Writer は jsce id=3359 を「耐久性照査編」と誤記しがち（実タイトル＝2022年制定［維持管理編］、設計編は id=3358）／腐食発生限界 1.2 kg/m³ は旧一般値で現行は $C_{lim}=-3.0(W/C)+3.4$（普通・W/C 0.30〜0.55）と港湾 2.0 kg/m³ を基準別に併記する／JIS A 1191 は 2021 年改正（kikakurui は 2004 版のみ）。
