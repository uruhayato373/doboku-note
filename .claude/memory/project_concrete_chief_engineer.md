---
name: project_concrete_chief_engineer
description: "コンクリート主任技師 第4資格vertical。19記事全公開済。2026-07-10にユーザー再スキャン(スキャンした書類14-18.pdf)からライブrescan 17図を完結(14図sharp化差替+3図は書籍抜粋非収録)・main deploy済"
metadata:
  type: project
---

コンクリート主任技師（日本コンクリート工学会 JCI）を doboku-note の第4資格として追加開始（2026-05-29）。slug=`concrete-chief-engineer`、variant=civil、order=2.5。対象は**主任技師のみ**（技士は将来）。

**確定アーキテクチャ**: groups = guide / textbook / primary（第1次/第2次区分なし、四肢択一+小論文の単一試験）。過去問は**分野別8分野**で構成（材料/性質/耐久性/配合設計/製造品質管理/施工/製品/構造設計）= 原典の分野別構成に一致。slug は namespaced（`concrete-chief-engineer-{dir}`）。

**原典**: 技報堂出版『コンクリート技士・主任技師 試験問題と解説』2022年版(14PDF)/2024年版(6PDF)= `docs/textbook/コンクリート主任技師20XX/`。両方とも過去問解説本（体系テキストの原典ではない→テキストは解説から合成方針）。

**⚠️並行セッション**: 別Claudeセッション(PID13960系)が **concrete-diagnostician(診断士・第5資格)** を同branch(feat/concrete-chief-engineer)でactive整備中(guide4+textbook6章+図25枚コミット済、過去問render中)。当方は **concrete-chief-engineer(主任技師)専従**・`git add -A`厳禁・診断士ファイル不可触。

**過去問8/8分野完成(2026-05-30, 118問, published:false)**: 材料18/性質15(フレッシュ8+硬化7)/耐久8/配合6/製造QC22/施工40/製品3/構造設計6。構造設計はprimary-structural-design新設(section8)。R02問23は転記2系統の正答食い違いを工学検証で正答1採用。
**図クロップ7点完了** = cement-r01/bingham-flow-r01/creep-strain-r04/volume-ratio-r03/waterunit-slump-r05/crack-pattern-r03/crack-pattern-r02。**6/8分野が図完全収録**(材料/性質/耐久/配合/製品/構造設計)。
**製造QC正確性修正**: R03問12復元(f3-09右ページは実は判読可)・R02問7冗長除去&選択肢3誤記修正・R02問5マーカー反転修正。
commits(主任技師分): fbc38fca4→...→a12bac033(図3)→54276390f(waterunit)→7cfac2d80(ふるい)→2f99cfc67(構造設計+フレッシュ)→b79e9243a(構造図)→be3ef69c5(製造QC修正)。

**2026-05-30 大幅進捗（commit be3..→fe004d8f4 以降）**:
- **過去問8/8分野が図完全収録**: 製造QC 4表(R05問15正規分布概念図webp+試験値/正規分布表インライン, R04問8/R04問13/R01問8 表転記) + 施工7図(pump-pressure-r05/r01・strength-dev-r02・form-pressure-r02・bingham-shear-r04・temp-history-r02・marine-joint-r01 webp)。施工図は f4/f5 から fractional bbox で抽出。
- **内部整合性QA 7件修正**: materials R元問2→正答2(解説の単位混同を再計算、表面水率≈3.1%), mix-design R5問7→正答4(図1単位水量168正読・容積法で細骨材率46.0%), production-qc R元問7/R2問13マーカー反転, construction R2問17(養生優劣修正+肢別マーカー)/R2問21(肢別マーカー), ⭕→✅統一。**残2問の正答未確定を計算で確定済**。
- **清書**: 単行$$→display化9件, /℃→/{}^\circ\text{C}, テキストのKaTeX警告(³/年)修正。
- **テキスト8分野 draft 生成(published:false)**: textbook-materials/properties/durability/mix-design/production-qc/construction/products/structural-design。過去問解説を主根拠にエージェント8体で合成、各COMPILE OK・HIGH 0。施工のみ生成中の可能性あり要確認。**未レビュー draft なので公開前にfact-check推奨**。

**2026-05-30 vertical 公開完了（commit 84e8b9483→366d89d65）**: 主任技師は **計19記事 published:true** = ガイド3 + 過去問8分野(118問・図完全収録・内部整合性QA済) + テキスト8分野(過去問解説起点で合成、2エージェント fact-check HIGH 0)。テキストは published:true 化済。refresh-indexes 反映(doc-meta/cross-exam/tags/keyword-relations/pillar) + type-check PASS + 全MDX COMPILE OK。exam-content-policy.md に整備方針(図クロップ割合bbox方式/テキスト合成/公開前QA)を記録。

**2026-06-01 H29/H30 転記 進行中（task #9）**: 2022本 分野別編から H30/H29 四肢択一を全問視覚突合で転記中。
- **doc02 完了・commit ea19477fa**: 材料5問(H30問3混和材料/H29問5混和材料/H29問6化学混和剤/H30問4補強材/H29問7補強材応力ひずみ図) + 性質3問(H30問7ビンガム図/H30問8空気量/H29問11空気量)。図2点webp収録(steel-carbon-strength-h29 / bingham-flow-h30)。**材料・性質は7年被覆(H29-R05)達成**。
- **重要教訓**: ①survey agent の page/year/theme マッピングは**不正確**(doc02で複数誤り検出)→ナビ補助のみ。転記は親が原典ページ直読で全問突合必須。②**ページ構造**: 各 rot/docNN-MM.png = 1見開き(3585×5053前後、縦書き)。上半分=1書面・下半分=1書面、各書面は右側=問題文+選択肢+年度タグ(下右隅)・左側=解説(末尾【正解(n)】)。crop法: 右portion `crop 1960x(H/2)+(W-1960)+0`(TR)/`+（W-1960)+(H/2)`(BR)、左portion(解説)は `crop (W-1650)x(H/2)+0+...`。細かい選択肢は `crop 1050x1900` 級の高zoom strip 2本(右=stem+opt12, 左=opt34)で判読可。③図クロップは bottom-half の図領域を直接crop→quality82でwebp化。
- **残docs 03-07 の転記方式**: 当初survey(下記)はナビ補助。各docを親が直読 or transcription-agent(原典直読+max zoom+[判読不能]厳守)+親QA(年度タグ・正答・図を必ず突合)。原本118問も agent転記+QA方式で出荷済(=本verticalの標準)。
- **★2026-06-01 確定方針(重要)**: ①**transcription-agent は使用不可**＝ sonnet は dense問題(配合計算/製造QC統計)を**ガラ落ち転写**(doc04で「目標空気量90%」等の捏造を確認)、かつサーバ側で **rate-limit / 600s watchdog stall** 多発(doc03/05/06/07 全滅)。②**解決策＝300 DPI 再レンダリングで親(Opus)が直読**すると dense計算も明瞭に読める(doc04 H29問9 の 1936/2.038≒959.8→40.2% 等を確認)。**300 DPI native はすでに正立(回転不要)**。手順: `pdftoppm -png -r 300 -f N -l N "docs/textbook/コンクリート主任技師2022/スキャンした書類 X.pdf" /tmp/p` → native(~6317×9050)から問題領域を `magick -crop 2000x3400+X+Y` で高zoom crop→Read。doc番号→PDF: doc02=書類2.pdf … doc07=書類7.pdf。③残り docs03-07(~30問・計算/図多数)は**全て親が300DPIで手動転写**するしかない(長丁場・compaction 前提)。
- **⚠️2026-06-01 知見: doc07(構造設計/PC施工)は親直読(170DPI)では読取限界**。構造・PC の選択肢は専門用語が密で、設問タイプ(適当/不適当)や図問題の正答(解説が頁跨ぎで【正解】が追えない)を親のスキャン読取では確信を持てず→**捏造防止のため未出荷**。dense系(配合計算/製造QC統計/構造図)は transcription-agent(max-zoom 1問単位)の方が親の一括読みより精度高い可能性。ただし agent は **サーバ側 rate-limit** で5体同時起動が全滅した(2026-06-01)→**2-3体ずつ staggered 起動**必須。
- **doc07 詳細マップ(視覚突合済・正答は要再確認)**: ⑥/10海洋=R01問17(済) / ⑥/12 PC施工: R03問25・R02問25・R01問27(R系・既存記事に無く gap) ・**H30問27**(正答2?・doc07-03BR text)・**H29問30**(doc07-04 PC荷重ひずみ段階図1+図2) / ⑧構造設計: R01問25(済)・R01問26(門型ラーメン曲げM図・既存に無くgap)・**H30問24**(梁設計・正答1・doc07-11TR text)・**H30問25**(ラーメン引張鉄筋配置図・doc07-11BR)・**H29問28**(スターラップ図・doc07-12BR)・**H29問29**(柱断面破壊形式・水平力フレーム図・doc07-13BR)。図問題4点(H30問25/H29問28/H29問29/H29問30)は正答が解説overflowで未確定+図クロップ未。PC施工問題は construction記事へ、構造設計問題は structural-design記事へルーティング。
- **survey結果(ナビ補助・要現地確認)**: doc03=性質後半+耐久+配合前半 / doc04(配合: H30問6,H29問9,H29問10 ; 製造QC: H30問12,13,H29問4,16,17) / doc05(製造QC: H30問5,H29問18 ; 施工: H30問14,15,16,17,H29問19,20,21) / doc06(施工: H30問18,20,21,22,23,H29問22,23,24,25,26,27 ; 図=R02問21/H30問21/H29問25等) / doc07=施工後半+構造設計(H30問27,H29問29圏)。
- 旧①**2022本(H29-30 拡張)** survey/レンダリング部分:
  - **2022年版構造（survey済）**: 3部構成。①分野別問題編=`スキャンした書類{無印,2-7}.pdf`(=doc01-07)に R03→R02→R01→**H30→H29** を8分野別・各分野/小節の末尾に収録（問題文直後に解説一体）。②年度別編=doc08-10 に H28→H24。③小論文=doc11-14。**H29/H30 は①分野別編(doc02-07)のみに散在**（製品⑦は当該期間 出題なし）。
  - **レンダリング再現コマンド**: `pdftoppm -png -r 170 "{file}" out` → 各 PNG を `magick {png} -rotate 90`（**-rotate 90 が正立**、sips不要）。doc02=材料+性質前半, doc03=性質後半+耐久+配合前半, doc04=配合後半+製造QC前半, doc05=製造QC後半, doc06=施工, doc07=施工後半+構造設計。
  - **H29/H30 概略位置（survey, 要現地確認）**: 材料 H30問3/5/6・H29問5/6(doc02), 性質 H30問7-12・H29問12-13(doc02-03), 配合 H30問6/10・H29問8/10(doc04), 製造QC H30問8/18・H29問18(doc05), 施工 H30問17/18/22/27・H29問23/26/29(doc06-07), 構造 H30問27・H29問29(doc07)。問題番号は年内通し番号。
  - **転記方針**: 全7分野を**一括**で（部分追記は分野間の年度被覆が不揃いになり UX 悪化）。各分野の H30→H29 を年度順で R01 の後に挿入。図依存問題は 2024本と同じ割合bbox方式でクロップ。**全問 視覚突合必須**（[[feedback_exam_pdf_cross_reference]]）。R元問2(材料)の正答は計算で正答2確定済だが2022本のH29-30とは別物。
- ②**/deploy**: develop→main はユーザー判断（CLAUDE.md準拠）。deploy後 curl で doboku-note.pages.dev の concrete ページ HTTP 200 + `<main>` 確認。
- ③(任意) テキストの軽微LOW: materials/properties で熱膨張係数 10 vs 11 の表記ゆれ（双方正当・未修正）。
- #8 診断士 vertical は**別セッション所管**（不可触）。

**2026-06-02 note 有料マガジン新設（小論文 模範答案集）commit 96c786f05**: `docs/note/コンクリート主任技師/magazines/コンクリート主任技師-小論文-模範答案集/` = 解法ガイド + テーマ別フル模範小論文4本（耐久性/品質管理/環境配慮/施工トラブル）計5本・各約5,000字。診断士マガジン(cd-essay)と同型・序論本論結論の論述型・実在過去問の逐語再現なし・固有数値は〇〇置換前提。`_meta.yaml`(setPrice 1480/単品500×5/41%OFF) + hashtags×6 完備。SoT=`cce-essay-magazine`(note-magazines.ts, published:false)、placement=`concrete-chief-engineer-guide-essay` に防御的CTA配線。type-check PASS。**残（公開前作業）**: note本体投稿→noteUrl埋め+published:true、cover画像 cce-essay-cover.webp 作成（generate-magazine-covers.mjs）。執筆は親Opus(解法ガイド)+sonnet4体(4テーマ)分担→親QA（技術精度OK・軽微用語2件修正済）。
**2026-07-10（続き）追加スキャン取り込み＝年度別過去問＋小論文章**: ユーザーが同書籍の残り(年度別全問H26-30＝スキャンした書類3=H30/2=H29/9=H28/4=H27/5=H26、小論文章=6-8)を追加スキャン→`docs/textbook/コンクリート主任技師2024/`(git追跡外・計13PDF保持)。①**図2枚差替**(commit `76f177286`)＝前回not-foundのbingham-flow-h30(p206)・steel-carbon-strength-h29(p222)を年度別パートから抽出(前回は項目別章のみ探索し見逃し)。旧steel図は横倒し+手書きの答え書込み(答え漏らし)だった→グラフのみ正立で解消。rescan-need-source concrete-chief 3→1(残=bingham-shear-r04・要R4原典)。②**小論文ガイド増補**(guide-essay 3478→4794字・commit)＝書き方6原則+通常/キーワード先出しモードをオリジナル散文で追加(逐語複製なし)。③**年度別過去問H26-28転記＝同日完遂（90問）**: H28→H27→H26 の順に「並行workflow転記(8-10 worker/年)→補完worker(ページまたぎ)→親が公式解答一覧と全問突合＋計算問題全数検算→解説は親執筆(h2X-details.json)→assemble/insert スクリプトで8分野へ年度降順挿入→年度単位commit」。図12点クロップ(H28:6/H27:6/H26:6、alt も出題情報のみ・答え漏らしなし)。8分野の被覆が**平成26〜令和5年度**化(過去問 計208問)。台帳に全図 source_pdf/page 記録。パイプライン成果物=.tmp/cce-rescan2/{answers,h2X-problems,h2X-details}.json+assemble.mjs+insert-year.mjs(H29/H30余力枠に再利用可)。handoff は削除済み(2026-07-11 archive廃止・git履歴から復元可)。教訓: 鮮明横書き原稿なら sonnet workflow 転記+親検算で捏造ゼロ(2022本の縦書きボケとは条件が別物)。④**H29/H30 転記＝同日完遂（49問）**: H29 26問+H30 23問（既収録8問除く全問）を全8分野へ挿入。正答は原典解答一覧と全数突合（既収録8問の正答一致で一覧読取りを交差検証）+計算問題は親が全数検算。H29問16 は検算矛盾→JIS A 5308「計量値の差は四捨五入で整数に丸める」規定（テキスト05章L127）で正答4を確定（丸め規定が出題意図）。H29問27 は機械検証（details↔answers突合）が親の誤判定を検出→流動化の細骨材率は一般コンより1〜2%大が正。図12点クロップ（3並列subagent+親全数目視QA）。H29問4 の綴じ側欠落は反対ページ左端の写り込み文字で復元。workflow の schema付き agent が「test」プレースホルダを返す失敗2件→再実行+親直読でリカバリ。**年度別被覆=平成26〜令和5年度・全8分野完結（過去問 計257問）**。

**2026-07-10 ライブ図品質完結（rescan 17図・commit `4effe26ed`・main deploy）**: ユーザーが原典書籍（項目別過去問解説）を高品質再スキャン→`docs/textbook/コンクリート主任技師2024/スキャンした書類 14-18.pdf`（書籍p24-221連続・git追跡外・診断士前例踏襲）。pdfimages→回転90°→左右分割で200頁化→並行workflow（cce-rescan-figure-extract・17worker sonnet・vision自己検証）＋親の新旧比較QAで**14図フル差替**＝sharpness 18-118(blurry/soft)→330-1855(全図sharp・10-40倍)。指の大写り込み（strength-dev/pump-r05/crack-r02）・見切れ（normal-dist/bingham-flow-r01/waterunit）解消。form-pressure/temp-history は残存見出し/指影を magick 白塗りで除去。**3図は書籍が項目別「抜粋」のため非収録**（steel-carbon-h29=収録R5〜H30でH29範囲外/bingham-flow-h30=冒頭の表は出題実績一覧で収録一覧ではない/bingham-shear-r04=②/01のR4収録は問題14のみ）→rescan-need-source へ・旧維持・要該当年度原典。台帳に source_pdf+page 記録済（再現可能）。MDXは`<img>`寸法属性なしのため webp 差替のみで完結。残 rescan 16 は全て診断士（published:false 凍結）。

**四肢択一マガジン＝企画のみ確定（2026-06-02、commit 0b5b8a4d6）**: 当初ユーザーは「技士のマガジン」を希望→対話で(a)技士は**小論文なし=四肢択一+○×のみ**、(b)サイトの過去問ページ`primary-*`は**主任技師**の四肢択一で**既に無料公開**=単純な過去問解説集は無料再販で有料価値弱い、と判明。最終着地＝**「コンクリート主任技師 四肢択一 R8予想問題集」（オリジナル作問・無料過去問と非競合・既存vertical統合）**。技士特化版は見送り。**作問は未着手、企画書のみ**: `docs/note/コンクリート主任技師/magazines/コンクリート主任技師-四肢択一-R8予想問題集/_企画.md`（SoT予定id=`cce-yosou-mc-magazine`/8分野・計50-64問/記事スキーマ/分野別出題予想seed/制作フロー=全問親Opus検算QA必須/パイロット推奨=材料・施工）。本制作時はこの企画書を真実源にする。

**2026-09-30 小論文を令和形式へ再構築（PR feat/cce-essay-reiwa）**: 旧4テーマ×8立場（序論本論結論・約2,300字）は R2 以降の「1題・約1,000字・行数指定・(1)表題/(2)現状と課題/(3)業務との関係/(4)今後の対策」と不一致、施工トラブルは令和で単独出題なしと判明。出題履歴 SSOT=`config/cce-essay-history.json`（H24〜R7・確度付き。JCI は問題文非公開→書籍OCR＋公開記事の突合）、`check-cce-essay`（型・字数・8立場・出題年一致・予測断定H11・履歴ブロック同期 --fix）、`cce-essay-writer/qa`、`/cce-essay-cycle`。新マガジン `コンクリート主任技士-小論文テーマ別-令和形式`（無料傾向分析＋5テーマ）＝SoT `cce-essay-reiwa-pack`（published:false・¥3,980）、ココナラ K3（draft・¥4,500）。残＝note 公開→サイト/旧商品の導線切替。新エージェント型はセッション再読込まで未解決→general-purpose に定義を読ませて代行した。

**2026-10-03 立場別へ戻す（DN-0523）**: 10/1 の一本化（テーマ別5本に8立場）をユーザーが誤りと判断。1立場×1テーマの40本（各¥980）を書き（writer→qa、テーマ単位8本×5）、立場別5テーマ8誌（¥2,480）・立場別合格パック8誌（択一直前3点＋5テーマ・¥3,980）・全40答案（`cce-essay-reiwa-pack` ¥5,980）・まるごと（¥7,980）へ再収録。テーマ別5本は note から削除し原稿は content/sources へ。ココナラ K3 は ¥9,000 へ。対応表は `content/note/コンクリート主任技士/noteコンテンツ計画.md`。[[feedback_magazine_atomic_recollection]]
