---
name: r8-exam-restoration-2026-07
description: R8総監本試験を試験当日にサイト過去問化+note展開。残=公式正答後の暫定→確定更新
metadata: 
  node_type: memory
  type: project
  originSessionId: ca267b81-fe3c-4ecd-9b0e-5292f64ee4f6
---

2026-07-19（試験当日）に令和8年度 技術士二次 総合技術監理部門 必須科目I をスキャンPDFから復元・展開した。

**公開済（コミット済・develop）:**
- サイト `r08-primary`（択一40問・**暫定解答**・Callout明記）/ `r08-secondary`（記述I-2 地方創生・問題文全文+4ステップ骨子）。40問はOCR転記→独立導出→受験時マーク突合→労働法2点はWeb照合で確定。
- 確定暫定正答キー（1-40）: 5,3,5,4,2,4,1,5 / 3,3,1,3,4,5,2,3 / 1,5,4,2,2,3,4,4 / 1,4,2,5,3,2,3,1 / 5,4,2,5,5,2,5,2
- **note 無料3本を公開済**（2026-07-19・Playwright note-publish --commit・account=dobokunote assert・API実体検証OK）: `R8解答速報`=n/nfa8998e22a52 ／ `R8本試験模範解答例`=n/nfe8bc37ce88e ／ `R8設問(3)国家施策全集`=n/nce1ea1317eab。
- **R8設問(3)国家施策全集**（無料・新記事）: 図のアウトプットa〜r 全18項目に国家施策を1本ずつ（計21施策・b/l/m は2案）。①施策②有効性実現性③トレードオフ各600字。notebookLM「最新の白書」でグラウンディング（`s3-research/g1-6.md`）→6グループ並列生成→事実照合2体で捏造0→バンク逐語重複解消→note-lint（`SKIP_NOTE_PARA=1`＝①②③密度は転写用で有料バンクと同型）。的中訴求: R8予想6テーマに地方創生は無いが、設問3国家施策バンク(6/1公開・11テーマ)が地方創生を収録=設問(3)の弾薬は的中→バンク(m91516dfc27ac)送客。
- **note-attach-file を無料記事＋複数PDF対応に修正済**（有料エリア設定が無い=無料判定で境界検証スキップ＋`--force`で既存PDFあっても添付＋無料は後段有料維持検証スキップ）。R8本試験模範解答例に14ペルソナPDFを `--commit --force` で順次添付。
- **模範解答例は全14ペルソナに拡張→本文掲載＋目次構成に刷新**（2026-07-19 ユーザーFB: 「14PDF添付だけの単調な記事」を是正）。最終構成＝導入文＋**目次**＋全14立場の模範解答を本文掲載（ペルソナ=H2で目次14項目・設問=H3）＋採点者視点＋末尾に14PDF DL節＋設問3全集/完全パック導線。自治体道路の特別扱いを廃し全立場統一。本文全置換は `note-update-body --commit`（大記事で目次ボタンが8sタイムアウト→`note-update-body.mjs` の目次挿入を DOM native click 化して解消・コミット済 22b559ea9）。全置換でPDFは一旦全消去→`note-attach-file --commit --force` で14本再添付（14/14 live確認済 2026-07-19）。当初は note1記事＋**ペルソナ別に個別PDF**でDLの構成だった。設問(1)(2)=ペルソナ別／設問(3)=設問3国家施策バンクの6施策から軸違い2つ転用。`personas/01-14.md`（答案本体）→`pdf-src/01-14.md`（H1+前書き付き）→`scripts/pdf-specs/R8総監記述式-地方創生-模範解答例集.json`（14エントリ・include `^\*\*doboku-note`でH1二重回避）で`magazine-to-pdf`（**CHROME_PATH必須**）→`R8本試験模範解答例/pdf/R8地方創生模範解答例-{NN}-{persona}.pdf`（各3〜4p）。当初1本結合PDFで作ったが**ユーザー要望でペルソナ別14ファイルに分割**（note-attach-file は本文末尾に1ファイルずつ積む方式のため記事末尾に「立場別DL」節を新設）。**PDFのnote添付は14ファイルを順にユーザー起動**（`note-attach-file --note <key> --file <pdf> --commit` ×14。無料記事なので有料境界なし）。**2026-07-20 ユーザー要望でPDFを末尾一括→各立場セクション内へ再配置**: `note-attach-file` に `--anchor "<text>"` を追加（指定テキストを含む最小段落 p/h* の直後にカーソルを置いて挿入・未検出は exit 7 で ABORT＝誤挿入防止・省略時は従来の本文末尾）。手順＝①article.md の各立場末尾に一意キャプション「この立場の模範解答は、下のPDFでもダウンロードできます（○○版）。」14行を挿入＋末尾の一括DL節を撤去、②`note-update-body --commit`（PDF一旦全消去）、③`note-attach-file --anchor "（○○版）" --commit --force` ×14 で各キャプション直後へ挿入。live検証＝全14本が caption_1<PDF_1<caption_2<…<caption_14<PDF_14 の厳密増加＝各セクション内に収まる（コミット bf150097c）。PDF再ビルド: `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/R8総監記述式-地方創生-模範解答例集.json`。`pdf/_work`はgitignore。

**残タスク（重要）:**
0. **X告知（記述式模範解答）予約済**: 077択一速報(7/19)の翌日フォローとして、記述式模範解答例(全14立場・無料)の告知を **X draft 079**（@doboku373）で **2026-07-20 07:20 JST 予約**（当初12:35で予約→ユーザー「早い方が良い」で07:20へ前倒し・キャンペーン r08-model-answer・note nfe8bc37ce88e 誘導・222/280）。促進カード=`.tmp/gen-r08-model-card.mjs`（1200×675・全14立場チップ＝発注者navy10/受注者amber4＋「無料公開」バッジ）。x-schedule-guard緑→dry-run(予約モード確認OK)→本番→**x-sync-status で実キュー実在確認済(queued昇格・§9偽成功検証PASS)**。**予約時刻の前倒しはX専用取消/再予約スクリプトが無いため in-place 編集で実施**＝`.tmp/x-reschedule-079.mjs`（同一プロファイル `.local/playwright-x-profile`で予約キュー`/compose/post/unsent/scheduled`を開き、**自分の投稿を unique needle「全14の立場」で特定→本文一致を確認してからコンポーザで開く**→scheduleOption→5 selects(month/day/year/hour/minute・24hでhour maxVal=23)→scheduledConfirmationPrimaryAction→**予約モード確認(fail-safe)**→`[role="dialog"]`スコープの tweetTextarea_0 に focus して Ctrl+Enter 保存→再オープンして選択時刻を実読で検証）。他セッションの21件予約には一切触れず重複も作らない安全設計。注意: home背景コンポーザと編集ダイアログで tweetTextarea_0 / tweetButton が2つ一致するので必ず `[role="dialog"]` にスコープ＋`.first()`。
1. **公式正答公表後（日本技術士会 engineer.or.jp）に暫定→確定更新**: `r08-primary` の各 `**正答（暫定）：X**` と冒頭 warning Callout、`R8解答速報`。暫定と公式が食い違う問は解説も是正。**X解答速報も同時にフォロー**: 2026-07-19 試験当日に @doboku373 へ暫定解答速報を即時投稿済み（画像=40問解答グリッドカード・ドラフト `docs/sns/x/draft/077-pe-comprehensive-r08-sokuhou/`・tweet `x.com/doboku373/status/2078836662294155558`）。暫定≠公式の問があれば訂正リプライ/フォロー投稿を検討。**IGにも同速報を投稿済**（@dobokunotecom・ポートレート1080x1350単一画像・pack `docs/sns/instagram/cem/r08-sokuhou/`・permalink `instagram.com/dobokunotecom/p/Da-gaGpEgKO/`・キャプションはbio誘導）。カード再生成は X用=`.tmp/gen-r08-card.mjs`（16:9 1200x675）／IG用=`.tmp/gen-r08-card-ig.mjs`（ポートレート1080x1350）、ANSWERS 配列差し替え→sharp でPNG。
2. 公式PDF公開後に `r08-primary`/`r08-secondary` の frontmatter に `source_pdf:` 追記。
3. ✅note 3本公開済＋✅14ペルソナPDF添付完走（14/14 live）＋✅3記事間 note内相互リンク実URL結線済（2026-07-19・コミット aeb07f0bd）。フルメッシュ6エッジ中5本＝解答速報→模範解答例/設問3全集、設問3全集→模範解答例/解答速報、模範解答例→設問3全集。**模範解答例→解答速報の1エッジのみ意図的に見送り**（14PDF付き記事の本文全置換=PDF再消去コスト回避・模範解答例は両記事から被リンク済）。反映は `note-update-body --note <id> --article <path> --commit`（フラグは `--file` でなく **`--article`**）。
4. deploy（develop→main）はユーザー `/deploy`。

**判断根拠:** E-01(¥1,980 解答再現)を模範解答例の無料公開へ変更（集客最優先・2026-07-19ユーザー決定）。有料深掘りは E-02「私はこう書いた」に集約。関連: [[cover-ogp-regen-sweep]] [[new-pastexam-backlink-wiring]]
