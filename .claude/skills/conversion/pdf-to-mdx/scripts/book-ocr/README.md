# 経路D: 参考文献 bundle の機械 OCR（obsidian vault の ocr_pdf.py）

`content/sources/books/<id>__<書名>/` の bundle（Drive vault に `pages/pNNNN.jpg`）を、
**テキスト層が無い**本について全文起こしする経路。テキスト層がある本は経路C（`../text-layer/`）。

> [!warning] Claude は本文を書き写さない（2026-10-24）
> 市販書籍のページ画像を Claude が読んで本文を書き起こすのは、私的利用でも著作物の複製を Claude が作ることに
> なるのでやらない。文字にするのは機械 OCR だけ。Claude がするのはスクリプトの実行・品質の確認・
> できたテキストを参考資料として読むこと。精度の確認で画像と照らすのは数行まで。
> 決定記録は obsidian vault の `memos/20261024_decision_OCRは機械で行う.md`。

## 設計（全段が機械）

| 段 | スクリプト | やること |
|---|---|---|
| 0 | `book_ocr_prep.py` | 原寸画像を **sha256 で台帳と照合しながら** `.tmp/ocr/<id>/src/` へ複製し `jobs.json` を書く。照合に落ちたページは rclone で雲から取り直し、1 ページでも合わなければ止める |
| 1 | `book_ocr_machine.py` | 照合済み画像を id 順に 1 ページ 1 枚の PDF へ組み（200dpi）、obsidian vault の `ocr_pdf.py` を回す。エンジンは自動選択（縦書き＝NDLOCR-Lite／横書き＝Indra OCR／文字層＝pdftotext）。出力のページ目印を book-manifest のページ id へ写してバッチ md を書き、method と品質を `machine.json` に残す |
| 2 | `book_ocr_concat.py` | part（48 ページ）へ連結し、マーカー全数一致・U+FFFD 0 のゲート。README と登録コマンド（`register.sh`）を出す |
| 3 | 親 | 品質ゲートと抜き取り（数行）を見て、`register.sh --commit` で Drive と台帳へ登録 |

エンジンの導入と版の固定は obsidian vault の `.claude/scripts/ocr/setup.sh`（冪等。NDLOCR-Lite のコミットと
indra-ocr の版を固定し、`~/.cache/vault-ocr/` に入れる）。版を上げるのは vault 側で行う。

## 手順

```bash
B=concrete-basics-5th
bash ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/obsidian/.claude/scripts/ocr/setup.sh
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_prep.py --book $B
# 試し読み（必ず先に）: 数ページだけ。jobs.trial.json と .tmp/ocr/$B/trial/ に書き、本番の out/・ocr/ に触れない
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_machine.py --book $B --pages p0020-p0024
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_concat.py --book $B --jobs .tmp/ocr/$B/jobs.trial.json
# 全ページ（1 ページ 2〜3 秒。100 ページを超えるときは背景で回す）
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_machine.py --book $B
python3 .claude/skills/conversion/pdf-to-mdx/scripts/book-ocr/book_ocr_concat.py --book $B
sh .tmp/ocr/$B/register.sh            # dry-run
sh .tmp/ocr/$B/register.sh --commit   # Drive と台帳へ
```

- 試し読みだけしたいときは `book_ocr_prep.py --only p0020-p0024` で画像の取得をそのページに絞れる（`--only` / `--pages` は `p0007,p0032` の列挙も可）。
- **補完**: 既存の文字起こしが無いページだけを足すときは `book_ocr_machine.py --pages <列挙> --supplement` → `book_ocr_concat.py --jobs .tmp/ocr/$B/jobs.supplement.json`。part は `machine-part-NN.md` の名前で同じ `ocr/` に置き、`ocr/README.md` は既存の本文を残して `<!-- machine-ocr:start -->` 〜 `end` の節だけを書き換える。
- 試し読みの `register.sh` は `transcriptDir` の外を指すので、`record-reference-book-artifacts` が登録を拒む（誤って登録されない）。
- エンジンが合っていないとき（縦書きの本が `indra` になった等）は `--engine ndl|indra|text` で明示して試し直す。
- 出力の全文は `~/.cache/vault-ocr/out/<id>/<id>.ocr.md`（vault の外）と `.tmp/ocr/<id>/` に残る。登録後は消してよい。

## 試し読みで見るところ（`book_ocr_machine.py` の出力行）

| 項目 | 見るところ |
|---|---|
| エンジンと理由 | 縦書きの本なら `ndl`、横書きなら `indra` になっているか |
| 中央値 | 本文ページで数百字あるか（0〜数十字なら読めていない） |
| ほぼ空 | 白紙・図版以外のページが入っていないか |
| 信頼度（ndl のみ） | 0.85 以上か |

**品質ゲート**（`book_ocr_machine.py` が `machine.json` の `qualityGate` に書き、exit 1）: ほぼ空のページ（50 字未満）が
10% 超、または NDLOCR の信頼度平均 0.85 未満。図の多い本は前者に当たりやすい。原本を人が確かめ、問題なければ
`book_ocr_concat.py --accept-quality "理由"` で通す（理由は README に残る）。

## ocr_pdf.py の出力と doboku-note の形式の対応

| ocr_pdf.py | doboku-note（`ocr/part-NN.md`） |
|---|---|
| `<!-- p001 -->`（組んだ PDF の通し番号） | `<!-- p0001 -->`（book-manifest のページ id）。印字ノンブルが台帳にあれば `<!-- p0001 印字:12 -->` |
| frontmatter `generator: vault-ocr`・`engine`・`engine_version` | frontmatter `source`（参考文献 ID）・`method: "machine-ocr(<engine_version>)"`・`pages` |
| `（文字なし）` | そのまま残す。README に件数を出す |
| `<書名>.ocr.json` の `quality` | `.tmp/ocr/<id>/machine.json`（品質ゲートの結果つき）と README の要約 |
| — | `book-manifest.json` の `ocrArtifacts[].method` と、登録したページの `ocrStatus: "complete"`（`record-reference-book-artifacts` が書く） |

組んだ PDF はページ id の順に 1 枚ずつ並べるので、通し番号 n はその回で読んだ n 番目の id に当たる
（`book_ocr_machine.py` が目印の数を照合し、合わなければ止める）。見開き分割・回転・Kindle 枠の切り落としは
`pages/` を作る段（`build-reference-book-pages`）で済んでいるので、OCR は `pages/` の画像だけを読む。

## マーカーの契約

`<!-- p0001 -->` を各ページ本文の先頭に 1 回。印字ノンブルが分かるときだけ `<!-- p0001 印字:62 -->`。
concat はこの正規表現で照合する: `<!--\s*(p\d{4})(?:\s+印字:[^>]*?)?\s*-->`

## Claude の視覚 OCR を機械で止める

method に `visual-ocr`・`visual-proofread` を含む文字起こしは、廃止前（2026-10-24）の一覧
（`.claude/config/reference-sources-baseline.json` の `legacyVisualOcrTranscripts`・論理キー → sha256）と
同じ中身のものだけを許す。判定は `scripts/lib/reference-sources.mjs` の `claudeTranscriptionIssue` に 1 つだけある。

| どこで | 何を見る |
|---|---|
| `record-reference-book-artifacts`（登録時） | `--ocr-method` 必須。文字起こしの frontmatter の method と一致し、視覚 OCR でないこと |
| `check-reference-book-pages --metadata-only`（CI） | `book-manifest.json` の `ocrArtifacts[].method` と sha256 |
| `check-reference-sources --deep`（手元） | Drive の文字起こしの frontmatter の method と実体の sha256 |

**既存分の扱い（2026-10-24 本人決定）**: 廃止前の 231 件は一覧のまま残し、一括では作り直さない。**記事に使う本から順に**
機械 OCR で作り直す（目安は公開記事の `sources` にその本が挙がる数。2026-10-24 時点の上位は civil1-textbook-management・
construction-industry-trends-5th・civil-industry-trends-3rd が各 38 本、civil1-textbook-general 34 本、civil-technology-basics 25 本）。
作り直したら一覧から消す。Drive に同じ名前のファイルがあると `record-reference-book-artifacts` は上書きしないので、
作り直すときは旧ファイルの扱い（退避・削除）を先に決める。

## エージェントは Drive マウントを直接読まない

Drive のストリーミングマウントは、キャッシュから追い出されたファイルを「`ls` ではサイズがあるのに
読むと 0 バイト」で返すことがある（2026-09-09 `concrete-basics-5th` p0080 で実測）。prep が sha256 照合済みの
ローカル複製を作り、OCR はその `.tmp/ocr/<id>/src/` だけを読む。

## 検査ゼロを緑にしない

- prep: ページ 0 件で止まる。照合に落ちたページが 1 件でもあれば `jobs.json` を書かない。
- machine: 読むページ 0 件・照合済み画像の欠け・目印の数の不一致で止まる。字数中央値・ほぼ空・信頼度を必ず出す。
- concat: `machine.json` が無い・品質ゲート fail・バッチ出力の欠落・マーカー不一致・U+FFFD のどれかで exit 1。

## 試しの結果

| 日 | 本 | エンジン | 結果 |
|---|---|---|---|
| 2026-10-24 | `concrete-basics-5th`（横書き・Kindle 取込）p0020〜p0024 | indra（縦書き行 4%） | 5p・字数中央値 813・ほぼ空 0。concat のゲート合格 |
| 2026-10-24 | 文字起こしの残り 5 冊 70 ページ（DN-0716 の 4 冊の未割当ページの補完＋`pe-cem-essay-guide` 全 18 ページ） | indra | 登録済み。表は HTML の `<table>` で出る（字数が多く見えるのはタグ）。`pe-cem-textbook` p0001・p0053 は露出オーバーで文字が飛んだ写真で読めず、登録せず残した（撮り直しが要る） |

obsidian vault 側の試し（2026-10-24）: 縦書きは NDLOCR-Lite が読め（1 ページ約 2 秒・信頼度 0.93）Indra は読めない。
横書きの Kindle 本は Indra が既存の文字起こしと 96% 一致した。

## 旧経路で章別に起こした本を台帳へ載せる（`book_ocr_align_legacy.py`）

章ファイルにページ id が無い旧経路の文字起こしを、Tesseract の読みとの照合でページへ割り当てて台帳へ載せる
道具。対象は廃止前の視覚 OCR で、ページ目印を書き足すと中身が変わるため、2026-10-24 以降は登録が拒まれる
（旧経路の本は機械 OCR で作り直す）。手順の記録として残す。割り当ての根拠は次の順で採った。

1. 章ファイルの frontmatter に `pdfPages`（原本 PDF の見開きページ）があれば、book-manifest の
   `sourcePdfPage` で決定的に引き当てる（主任技士 2022/2024）
2. 無ければ各ページの Tesseract 読み（`book_ocr_tesseract.py`）と章テキストの 2-gram 再現率を、
   「第N章」順を保つ Viterbi で割り当てる
3. 手持ち撮影でぼけたページは、同じ章に挟まれた区間だけ「内挿」として章へ入れ、README に件数と区間を明示する
4. どの章にも当たらないページは登録しない

旧 `content/sources/textbook/**.md` キーは同じ Drive ファイルを指すので、登録後に `adopted` 別名へ
変えないと `check-drive-vault` が vault-collision で止まる（2026-09-10 に 36 件を別名化）。
