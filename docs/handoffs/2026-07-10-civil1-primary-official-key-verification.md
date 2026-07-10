# 1級土木 一次過去問(primary) 公式正答肢の全問突合と是正

> [!info] 状態
> 進行中（マルチセッション）。2026-07-10 開始。r07-a 完了・commit 済み。残 21 記事。

## 1行サマリ

civil-construction-1 の一次過去問 primary 22 本を「r04-a/r05-a と同じ手順」で監査するタスクだったが、**bug1（誤答肢解説の欠落）は既にほぼ全記事で解消済み**と判明。真の欠陥は **公式正答肢との突合で見つかる 81 件の誤キー（正答転記ミス＋設問極性の反転）** ＋ 一部のプレースホルダ解説・穴埋め未展開だった。JCTC 公式正答肢を全年度入手して突合し、**r07-a の 10 件を是正・commit 完了**。残 71 件（21 記事）が本 handoff の対象。

## 決定的な前提（必読）

- **採点方針＝「every key vs official」**（ユーザー選択）: 全 ~1,100 問のキーを公式正答肢と content で突合する。優先＝most-flagged first。
- **マーク規約（SSOT, fixed r05-a 由来）**: ✅＝その選択肢の記述が適当/正しい、❌＝不適当/誤り。「適当でないもの」設問では正答肢のみ ❌（他3つ ✅）、「適当なもの」設問では正答肢のみ ✅（他3つ ❌）。個数問題は①〜④各文の適/不適をマーク。
- **誤りは2種**:
  1. **正答キー転記ミス**: `正答：N` の数字だけ誤り。選択肢本文・極性は正しく、解説の真偽判定も概ね正しいことが多い → キー＋マークを是正。
  2. **設問極性の反転**: 設問が「適当な⇄適当でない」で転記ミス。この場合 ✅/❌ が全反転する。解説本文が「◯◯は正しい」と言っているのに ❌ が付く等の内部矛盾が出る。**必ず公式(kakomonn)で設問極性を確認**してから極性語を書き換える。r07-a では No.13・No.36 がこれ。
- **図問題は画像を必ず開いて判定**（BMD 図・ひび割れ図等）。選択肢本文が図と食い違う mis-transcription もある（r07-a No.25 は選択肢説明の鉛直/水平が図と逆だった）。**サブエージェントに図問題を丸投げ禁止**（盲目でハルシネートする）。
- civil primary は **ExamPoint/RelatedKeywords 不使用**が既存規約（末尾リンクのみ）＝採点は4軸(構造/解答/リンク/モバイル)。secondary 記事は対象外。

## データとツール（永続化済み）

- **公式正答肢データ**: `.claude/state/quality/civil-1-primary-official-keys.json`（全22本 `{"r07-a":[No.1の答,No.2,...], ...}`）。出所＝JCTC 公式正答肢PDF。H26-H29 は画像PDFを pdftoppm→Read でOCR、H30-R07 はテキスト層/クリーンPDF から抽出。
- **監査スクリプト**: `.claude/state/quality/civil-1-primary-tools/`
  - `diff-keys.mjs official.json` … 現行記事キー vs 公式の差分（全22本一括）。
  - `workorder.mjs official.json <rec>` … 1記事の作業指示（公式キー全列・誤キー・プレースホルダ/マーク欠落/穴埋めの一覧）。
  - `check-marks.mjs <file>` … 各設問の ✅/❌ 個数が4か、プレースホルダ有無。
  - `check-contradict.mjs <file>...` … ❌なのに本文「正しい」等の内部矛盾検出（「〜でなく〜が正しい ❌」は偽陽性なので無視）。
  - `extract-keys.mjs <file>...` … 現行記事キー抽出。
  - 実行例: `node .claude/state/quality/civil-1-primary-tools/diff-keys.mjs .claude/state/quality/civil-1-primary-official-keys.json`
- **公式PDF入手先**: doboku-torisetsu.com `/pastproblems/1doboku/{H26..R7}_kaitou.pdf`（＝JCTC 正答肢の再掲）。JCTC本家 `jctc.jp/mondai/` は当年度のみ掲載（過年度はローテーションで消える）。curl は本環境で疎通する（会社PCプロキシとは別）。
- **kakomonn 個別問題**（設問極性・選択肢本文・正答の一次確認に使用）: `https://1dobokusekou.kakomonn.com/questions/{ID}`。R07問題Aは ID ≈ **86604 + 問番号**（No.1=86605, No.13=86617, No.33=86637, No.36=86640 で検証、ただしユニット境界で線形が崩れる可能性ありなので content で照合）。他年度の base は未実測（既知2問から実測してから使う）。

## 進捗

- [x] 全22本の公式正答肢入手・突合 → **81 件の誤キー検出**（commit `9fc72255c`）
- [x] **r07-a** 10件是正＋プレースホルダ2件（No.23/33）＋図2問（No.3/25）（commit `857c79186`）。kakomonn で No.13/33/36 裏取り済み。
- [x] **r03-a** 11件是正（commit `e409fc677`）。**No.20 は隠れた設問極性反転**（記事stem「適当な」→公式「適当でない」）。本文化けも是正（No.18 締め直す→緩め／No.27 適正圧→過転圧）。
- [x] **r07-b** 9件是正（commit `dd22a206d`）。極性反転なし＝全キー誤り。個数(No.22/31)/組合せ(No.27)/穴埋め(No.33)含む。
- [x] **r06-a** 8件是正（commit `bca13514d`）。極性反転なし。本文化け5件是正(No.17活動断面→せん断面/No.25常時湛水速い→常時滞水遅い/No.27吹出し→吸出し/No.48統合作業→競合作業・明減→明滅/No.52外圧大きい→小さい)。
- [x] **r06-b** 6件是正（commit `74714cd82`）。図2問(No.3配筋図・No.6ネットワーク＝画像/計算で確定)＋個数/組合せ4問。**残: 穴埋めplaceholder No.21/23/26/29/33 は正答正しく解説のみ薄層＝prose follow-up**。
- [x] **r03-b** 5件是正（commit `b425f9885`）。図2問(No.3 L型擁壁配筋＝たて壁背面①/かかと版上面③・No.6ネットワーク＝E on CPで3日遅延→3日遅れ)＋設問化け復元(No.1 opt1本文/No.6設問文＋選択肢が別値に化け→公式へ復元)。
- [ ] 残 7 記事（下記 32 件）＝ h29-b(4)→h27-a(3)→h26-a(2)/h26-b(2)→h27-b(1)/h29-a(1)＋h28-a(19 要OCR再検証)

> [!important] 残り7記事は全て pre-H30（H26〜H29）＝公式問題PDFがローカルに無い
> `docs/textbook/１級土木施工管理技士/過去問/` は H30〜R07 のみ。**H26〜H29 の問題A/B原本は touhokugiken.com（memory [[reference_civil_pdfs]] / [[civil1-primary-answer-key-errors]] バグ3節）が無料公開**：問題=`https://www.touhokugiken.com/answer/{h27|h28…}/…-1doboku-a.pdf`（命名ゆれ有=h27は`h27-1doboku-a.pdf`、h28は`1doboku-a.pdf`）。正答肢は doboku-torisetsu `{H26..H29}_kaitou.pdf`（画像テーブル＝**pdftoppm→Read でOCR目視**、H30以降のようなテキスト層が無い）。**設問文・選択肢本文も画像なので、これまで以上に本文化け(bug3)照合が重要**。h28-a(19件)は突出＝official配列自体をkakomonn等の第2ソースで**mass-fix前にOCR再検証**すること。

> [!tip] 実務Tips（4記事の実績から）
> - **個数/組合せ問題の選択肢値**は pdftotext が数字を化かす（⑴が「2つ」等）が、記事側の表示は正しい→記事の選択肢値＋公式キー番号で「Nつ＝選択肢N」を確定できる。
> - **図問題は必ず画像 Read**：r06-b No.3(配筋図で鉄筋径確認)・No.6(ネットワークをEST計算)。記事の図読み取りが誤っていることがある(No.3 opt4を誤読)。
> - **反例が出たら官報級で照合**：公式キーが工学直感と食い違うときは①本文化け(bug3)②極性反転③自分の理解不足のいずれか。r06-a No.48「発光機は建築限界内」は直感に反するが公式どおり正しかった(WebSearch確認)。

> [!danger] 方法論の重大修正（r03-a No.20 で判明・必読）
> **workorder.mjs の `stem極性` は記事側の（化けている）stem を読むので信用してはいけない。** r03-a No.20 は記事 stem が「適当な」に化けており、公式は「適当でない」だった（＝隠れ極性反転）。**必ず公式問題PDFで設問極性と選択肢本文を確認**してから是正する。
> - official.json は **JCTC 公式正答肢 sheet と突合済（R03/R07 で検証、全一致）＝キーは信頼してよい**。化けているのは記事側。
> - **本文化け（bug3）はキー誤りと絡む**：選択肢本文が公式と違う（例 r03-a No.18「締め直す」→公式「緩め」、No.27「適正圧」→「過転圧」）。**公式PDFの選択肢本文へ忠実化**してから ✅/❌ と解説を書く。
> - **公式問題PDF**：`docs/textbook/１級土木施工管理技士/過去問/{R03..R07}/R0X_第一次検定_問題{A,B}.pdf` に R03〜R07 が実在。H26-H29/R01-R02 は doboku-torisetsu から DL（問題A=`R3_A.pdf` 形式・正答肢=`R3_kaitou.pdf`／`R7_kaitou.pdf` 形式、curl 200 実績）。
> - **抽出手順**：`pdftotext -layout` → perl で CJK 間スペース除去 → python で `【No.N】`ブロック抽出（furigana行除去）。数字は pdftotext が化ける（1→8, 2→9, 3→L, 4→O, 7→X 等）ので設問脈絡で復号。
> - **個数/組合せ/穴埋め**は ①②③④ 各文に(適当)/(誤り)+✅/❌、末尾に「○つ＝選択肢N」と明記。組合せ問題(No.24/32/35 等,キーは正)は旧式の紛らわしい✅/❌が残存＝別途 prose 整形の対象（キー誤りではない）。

## 残りの誤キー一覧（71件・most-flagged 順で処理推奨）

优先: r03-a(11) → r07-b(9) → r06-a(8) → r06-b(6) → r03-b(5) → h29-b(4) → h27-a(3) → h26-a(2)/h26-b(2) → h27-b(1)/h29-a(1)。

```
r03-a(11): No.18 2→3 / No.20 4→2 / No.25 2→3 / No.27 2→4 / No.28 4→1 / No.34 3→4 / No.41 1→4 / No.43 4→1 / No.48 3→1 / No.49 4→2 / No.53 3→4
r03-b(5):  No.1 4→2 / No.3 4→2 / No.6 1→2 / No.11 1→2 / No.30 4→1
r06-a(8):  No.17 2→4 / No.25 2→3 / No.26 4→2 / No.27 2→4 / No.34 3→2 / No.48 3→1 / No.51 2→4 / No.52 3→1
r06-b(6):  No.3 4→3 / No.6 1→2 / No.22 1→2 / No.24 2→3 / No.25 1→2 / No.28 4→3
r07-b(9):  No.1 4→1 / No.6 4→3 / No.11 2→1 / No.16 3→2 / No.18 1→4 / No.22 2→1 / No.27 1→4 / No.31 4→3 / No.33 2→3
h29-b(4):  No.3 2→3 / No.12 1→2 / No.17 3→1 / No.21 4→1
h27-a(3):  No.2 3→2 / No.27 3→4 / No.58 1→4
h26-a(2):  No.10 1→4 / No.11 3→4        h26-b(2): No.28 2→3 / No.29 3→2 (隣接スワップ)
h27-b(1):  No.23 4→1                      h29-a(1): No.38 4→3
```

> [!warning] h28-a は 19 件 = 要 OCR 再検証
> h28-a だけ 31%(19/61) と突出。誤キーが No.4-15 に密集。picture PDF の OCR ミスの可能性を排除するため、**mass-fix 前に H28-A 正答肢を第2ソース（kakomonn 等）で再確認**すること。h28-b は突合0件で H28-B の OCR は正。h28-a の official 配列は `.claude/state/quality/civil-1-primary-official-keys.json` の `h28-a`（要 double-check）。

> [!note] 7本は突合0件（キー健全）
> h28-b / h30-a / h30-b / r01-a / r01-b / r02-a / r02-b。これらは**キー修正不要**だが、プレースホルダ解説やマーク欠落（個数/穴埋め）が残る場合あり（`check-marks.mjs` で確認）。穴埋め placeholder は r06-b/r07-b に多い。

## 1記事の処理手順（r07-a で実証済み）

1. `node .../workorder.mjs official.json <rec>` で誤キー＋プレースホルダを一覧。
2. 各誤キー設問: 記事の設問文・選択肢・現行解説を読む。公式キーが指す選択肢が
   - 設問極性に整合（例: 適当でない設問で公式キー肢が「誤りの記述」）→ **キー数字＋マークのみ是正**、解説を真偽に合わせて書き直し。
   - 極性と逆（記事極性「適当な」だが公式キー肢が「誤りの記述」）→ **設問極性語を反転**＋キー＋マーク＋解説。kakomonn で極性を裏取り。
   - 図問題 → 画像(`img/*.webp`)を Read して図と照合。選択肢説明が図と食い違えば選択肢本文も是正。
   - 判定不能/選択肢本文が公式と食い違う疑い → kakomonn で一次確認、なお不明なら handoff に FLAG。
3. プレースホルダ解説（"記述は適当である"/"正しい記述 ❌"/"誤りを含む記述"/"穴埋め問題である"）→ 選択肢ごとの実質理由に書き換え。穴埋めは各誤答肢で「どの空欄がどう違うか」を書く。個数問題は①〜④各文の適/不適。
4. 検証: `diff-keys`（該当記事 0 件）＋`check-marks`（全4マーク）＋`check-contradict`（"〜でなく〜が正しい"以外の矛盾0）＋ `grep -c $'�'`＋CRLFなし。
5. 1記事ずつ `git add <明示パス>` → commit。

## タスク完了後（全21記事終了時）

- `npm run refresh-indexes`（timestamp のみ変化なら config は restore）。
- `past-exam-qa` で再採点し `.claude/state/quality/civil-1-extra-scores.json` に pages 追記 → `npm run quality-census` でカバレッジ確認。
- memory `[[civil1-primary-answer-key-errors]]` を更新（81→残数、完了記事）。

## 関連

- memory: [[civil1-primary-answer-key-errors]]（r04-a/r05-a の先行事例）、[[reference_quality_census]]
- 先行 commit: r04-a/r05-a 是正は別ブランチ `claude/intelligent-volhard-0cd641`（`152d69c6e` 他、develop 未マージ）。本作業と別ファイルなので競合なし。
