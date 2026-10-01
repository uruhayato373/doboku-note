---
name: project_civil1_figure_answer_leak
description: "過去問図の写り込み是正＋見切れ再抽出。**重要発見:見切れ図の「要ソース再取得」判定は誤り＝元PDFは大半が実在しフル再抽出可能**。並行workflow5本で計39図再抽出・台帳にsource_pdf/page記録。rescan-need-source 45→6(残は要外部/別原典)。QA教訓＝親の新旧比較目視必須(h29-b劣化版を検出除外)・BSD sed `\\|`非対応・textbook図は原典翻案リスク"
metadata:
  type: project
---

1級土木施工管理技士 primary（過去問1次）の図クロップ多数が、**解答解説資料由来**で図の上下に「したがって，(N)は適当である/でない」と**正答を明示する本文が写り込んでいる＝答え漏らし（image-policy 違反）**。ギャラリー品質問題の実体はこれだった（2026-07-07 発見）。

**方針（ユーザー決定）**: 既存画像を切り直し（SVG化でなく）／全primary を triage してから対象だけ修正／写真は CC/PD 差し替え優先。

**triage 結果**（`.local/r2/posts/civil-construction-1/primary-*/img/*.png` 約108枚を tesseract OCR + 答え漏らし語/句点で分類。スクリプトは scratchpad の triage-primary-figs.mjs）:
- **LEAK 21枚**（答え漏らし語あり・最優先）: h26-a(fig01,03,04,10) / h27-a(03) / h30-a(04,05,07,09,12) / h30-b(01,02) / r01-a(01,02,03,05※done) / r01-b(03) / r02-b(03) / r07-a(01,02)
- **PROSE 26枚**（句点2+の本文写り込み・品質）: h26-a,h26-b,h27-b,h28-a,h28-b,h29-b,h30-a(02,03,06,11,14),r01-b,r02-a,r02-b,r04-b,r05-b,r06-b,r07-a,r07-b 等
- **MAYBE 11 / CLEAN 53**

**修正手順（1図ずつ・自動化不可＝目視必須）**: auto-crop は凡例テキストを誤認して図を切りすぎるため使えない。手順＝図を Read→答えテキスト帯の位置と切り位置を目視判断→`magick <src> -crop WxH+0+Y +repage -trim +repage -bordercolor white -border 12 <out>`→OCRで答え語ゼロ再確認→png/webp上書き→**MDXの width/height を新寸法へ更新（重要）**→audit-exam-figures→1ページ1commit。

**特殊ケース＝見切れ（切り直し不可・要元スキャン。2026-07-09 確定）**: 元図が上下で見切れ図要素/答えが欠落。**鮮明＋写り込み無しゆえ機械はclean/ok誤判定→machine-blind**。`figure-sources.json` の `manual_needs` に `rescan-need-source` で登録済（[[reference_figure_provenance_system]]）:
- `r04-b-fig-02`＝`r05-b-fig-02`（md5同一・公開中）: 上端見切れで作業**B・D**＋イベント**①**欠落。解説CP=A→B→D→I が欠落部を通る＝重症。
- `r07-b-fig-02`: 作業C/Dラベル＋イベント③上半分欠落。正答(選4)が作業D特定を要す。
- `r06-b-fig-02`: C/Dラベル欠落だがnode-path解答で解決可＝軽症。
- `r01-b-fig-03`: 網目工程図見切れ。
- civil-1 工程表は10図全数目視済（残5＝h28-b/h29-b/h30-b/r02-b/r03-b は完全）。

**現況（2026-07-09 provenance）**: civil-1+pe 591図で recrop 28／recrop-urgent 4／rescan-need-source 5、**公開×掲載の recrop は1・recrop-urgent 1**まで縮小。答え漏らしの公開×掲載はほぼ解消。10図(civil-1)＋8図(pe-first-stage 問題文/選択肢写り込み)を再クロップ完了。**残**: recrop-review 190（大半は図凡例＝要目視トリアージ）／rescan 33（全concrete・要物理再スキャン）／h30-a系の未確認数枚。
専用スキル /figure-recrop（[[reference_figure_provenance_system]]・figure-recrop.mjs は `<img>`/`<ArticleImage>` 両対応）。/civil-figure-rework は問題PDFから切出す設計でこの答え漏らし図（別ソース）には非対応。[[reference_civil_pdfs]]

---

**【重要な方針転換 2026-07-09】見切れ図＝ブロックではなく「元PDFから再抽出可能」**：backlog/台帳は rescan-need-source 45図を「元図見切れ・再クロップ不可・要ソース再取得」＝ブロック扱いしていたが、これは**誤り**。ユーザー指摘で `docs/textbook/{資格}/過去問・テキスト/**.pdf` を実地確認したところ**元PDFは全資格ほぼ全て実在**（gitignore で git 上は不可視）。検証：`r04-b/r05-b-fig-02`（ネットワーク図・作業B/D欠落）の元PDF(R04/R05第一次B p.5 No.6)は**鮮明ベクターで完全な図を保持**＝旧クロップが上端を切り落としていただけ。「元PDFはスキャン」の前提も外れ（第一次過去問は鮮明ベクター）。

**繰り返し可能な再抽出パイプライン（確立）**：①各図の出所を導出（primary→第一次検定問題A/B PDF、slug→PDF・設問文→ページ）②並行workflow `civil1-figure-reextract`（sonnet 8worker・general-purpose・Bash可）で各worker＝pdftotextでページ特定→pdftoppm 300dpi→図領域crop+trim→**vision自己検証**（旧画像と見比べ復元確認）→temp出力＋メタ返却 ③**親（メインスレッド）が全crop目視QA**→採用分を画像/MDX寸法/台帳へ直列適用 ④台帳 `figure-sources.json` の各manual_needsに `source_pdf`/`page`/`dpi=300` を記録＝以後ページ探し不要。第一次過去問PDFは H30・R01〜R07 が個別、H26〜H29 は問題集PDF。

**進捗 2026-07-09〜10（本セッション）**：計**39図フル再抽出完了・push済**。①ネットワーク図2（r04-b/r05-b-fig-02, `b3dd2e567`）②primary8（`dda9e86a9`）③多資格過去問12＝civil-1二次/技術士一次/2級前期/総監択一（`218c64474`）④textbook13＝品質管理/土工/コンクリート/施工計画/解体（`0b9324923`）⑤H26-H28問題集4＝側圧/ボックスカルバート/粒径加積/施工体制（`2fe13b647`）。**rescan-need-source 45→6**。除外2＝h29-b-fig-02(問題集版が2図の劣化版→旧4図維持)・h27-a-fig-01(問題集にH27非収録)。

**QA教訓（ユーザー指摘由来・重要）**：workerの自己検証だけでは不十分＝**親が全図を新旧比較で目視QA必須**。実際に検出した欠陥＝(a)余白過多（worker追加の20-30px枠→再トリム+12px均一枠へ）(b)FN図の底切れ疑い→元ページ照合で完結確認 (c)**BSD(macOS/zsh) sedの `\|` 非対応でMDX寸法置換が無音失敗**（`.webp`直指定で回避）(d)zshは変数を語分割しない→`while read`で回す。**textbook図固有リスク**＝過去問図(同一図の切れ補完＝忠実)と違い、サイト版が元教材の翻案/簡略再描画のことがある（fig-2-47/2-32は原典と別作画→原典に置換・要注記）＋逐語表(rebar-joint)＋番号翻案(fig-5-6↔図3.42)。ユーザー判断で「品質許容・全部適用」。

**残6図（真にローカルPDF再抽出不可・要外部/別原典）**：①h29-b-fig-02＝旧が4図完全(タイトルのみ上端見切れ)・問題集版は2図劣化版ゆえ旧維持。要H29第2次B原典で上端補完 ②h27-a-fig-01＝土量の変化図・問題集にH27非収録(R02/R01/H30版のみ)。要H27原典 ③pe-construction 4図(fig22/27/04/05・論文キーワード記事)＝スキャン書籍「論文対策キーワード」(テキスト層なし)＝白書グラフ再録とみられ、白書PDF等の外部ソースが要る（この再抽出パイプライン対象外）。concrete系 rescan 33は別枠(書籍スキャン低品質)。**再利用可能な永続マップ**＝figure-sources.json の各manual_needsに `source_pdf`/`page`/`dpi` 記録済(39図分)。workflow4本(civil1-figure-reextract/exam-figure-reextract-batch/civil1-textbook-figure-reextract/civil1-h26-29-figure-reextract)は session workflows/scripts に保存(args差し替えで再実行可)。
