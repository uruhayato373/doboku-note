# スキャン画像 PDF 取り込みパイプライン（`--scanned`）

`pdf-to-mdx --scanned` のメインスレッド側手順書。**テキスト層を持たないスキャン書籍**（自炊した教材・参考書・基準書）を、視覚 OCR で **内部リファレンス Markdown**（`content/sources/textbook/{資格}/{書名}/`）＋図に変換する。

通常の `pdf-to-mdx`（Read の `pages` でテキスト抽出 → 公開 MDX）との違い:

| | 通常 `pdf-to-mdx` | `--scanned`（本手順） |
|---|---|---|
| 入力 | テキスト層あり PDF | **スキャン画像 PDF（テキスト層なし）** |
| 抽出 | Read `pages` / pdftotext | **pdfimages（視覚 OCR をサブエージェントで）** |
| 出力 | 公開 MDX（`content/site/`） | **内部リファレンス .md（`content/sources/textbook/`）** |
| 図 | image-policy 準拠で別途 | **PDF から精密クロップして `img/figNN.png` 埋め込み** |

> **著作権**: 市販書籍のスキャンは**原則**、内部リファレンス（論述/二次 writer の参照元 SSOT）専用で、**公開（MDX 化・note 転載）はしない**旨を README に明記する（[[project_pe_construction_secondary]] 等の writer が参照）。
> **例外（2026-07-03・運営者権利保有書籍）**: 運営者が著作権を保有する書籍は公開派生可。技術士建設部門『論文対策キーワード』は逐語本文＋スキャン図を `content/site/pe-construction/*-ronbun-keyword/` へ公開している（機械スプライス＋図クロップ埋込）。真実源＝`content/sources/textbook/技術士（建設部門）/論文対策キーワード/README.md` 方針ブロック＋`.claude/knowledge/reference/image-policy.md`「運営者権利保有書籍の例外」。1級土木テキスト等・権利未確認の書籍は原則どおり内部リファレンス専用。

ワーカー: 本文 OCR = `scanned-textbook-transcriber`（Generator）／図 bbox = `civil-exam-figure-extractor` と同型の Generator（教材はキャプション照合のため本手順では inline Workflow で実行）。

---

## 経路の選択（最初に1ページ目視で判定）

スキャン本には2系統あり、**着手前に1ページだけレンダ/抽出して Read し、どちらかを判定する**（回転方向・見開き有無は1冊で一定）。

| | 経路A: pdfimages 見開き | 経路B: PyMuPDF 単ページ |
|---|---|---|
| 入力 | 見開き2ページが90°回転で1枚に格納（例 1560×2150 portrait） | **1 PDF ページ＝1 書籍ページ・正立**（例 page 515×728 に高解像 image 1枚） |
| 抽出 | `pdfimages -j` → 回転＋左右分割（Step 1-2） | **PyMuPDF で指定幅レンダ（回転/分割不要）** |
| 環境 | pdfimages / ImageMagick が要る | **外部バイナリ不要**（会社 Windows 等で pdfimages/magick が無くても可） |
| スクリプト | 本手順 Step 1-7（bash） | **`scripts/scanned/` の Python＋Workflow テンプレ一式**（runbook = `scripts/scanned/README.md`） |
| 実績 | 建設部門 論文対策キーワード 168見開き（2026-06-14） | 1級土木 施工管理・法規編 327p/図135・土木一般編 385p/図320（2026-06-24） |

以下の Step 1-2 は**経路A専用**。経路Bは `scripts/scanned/render_pages.py` がレンダ＋バッチ計画(manifest.json)まで行い、Step 3 以降の考え方（ファンアウトOCR→連結→図クロップ）は共通だが、実装は `scripts/scanned/` の各スクリプトに置き換わる。

### 経路B（単ページ・PyMuPDF）の要点 — 今回てこずった点と対策

- **レンダリング解像度が OCR 精度を決める**。1700px では密な漢字を誤読する（実例: リース料→リリース料、築造→施造、採算面→保算面、節落ち）。**本文 OCR は 2200px / 図クロップは 2600px / bbox サムネは 800px** を既定にした。
- **図クロップは locate（単発目測）で終わらせない＝必須の audit/refine ループ**。locate（`figure_bbox.workflow.js`）の出す bbox は 800px サムネからの LLM 目測で**上下境界が緩く、本文段落の写り込み・図の切れが高頻度**（locate の "確信度" は「正しい図か」を測り「枠がタイトか」は測らない）。`civil-exam-figure-extractor`↔`civil-exam-figure-auditor` の過去問ループに倣い、**Evaluator `scanned-figure-crop-auditor` が実クロップ PNG を見て `adjust_bbox`（相対調整値）を返し、`apply_deltas_recrop.py` が算術適用＋再クロップを最大2〜3反復**して締める（4軸: クリップ純度45%/図完全性30%/正図同定15%/alt10%、全軸≥2 で合格）。別図を掴んだ（correct_figure=0）図は `relocate` で locate やり直しへ。**この工程を省くと図品質が低い**（2026-06-24 初回はこれを省略し、本文写り込みの緩い crop を量産した実害）。
- **本文 OCR の言い換え/誤読は proofread パスで締める**。LLM-OCR は密な数値・手順・規格の段落で原文に無い言い換え・脱落を起こす。`proofread.workflow.js`（concat 前の2パス目）で各バッチ md をページ画像と逐語照合して補正する。
- **埋め込み後の冗長プレースホルダ**（`![図]` 直後の長い `（図: …）`）は `trim_placeholders.py` で要点だけに短縮する。
- **`<!-- p.NN -->` マーカーは PDF ページと 1:1 でない**（重複・無番ページ・末尾の誤番）。図の所在を「マーカー位置」で決め打ちせず、**候補ページ窓（±N）＋キャプション照合**でエージェントに当てさせる。窓幅は drift（marker数−page数）を見て決める（drift≤±1 なら window=2）。
- **図が多いと bbox 一括 parallel がサーバ側レート制限で失敗する**（135図一括で29図失敗）。**groupSize（40図）ずつ順次 parallel バリア**で負荷を平準化すると失敗0（322図実証）。
- **数百ジョブを Workflow args に inline すると破綻**する。**章別ジョブファイル＋コーディネータ agent が Read して構造化返却**（schema で確実にパース）する経路にする。
- **低確信度 bbox は誤クロップ**になる（写真や別図を掴む）。**confidence<0.55 は未埋め込み扱い**（誤った図を貼るより貼らない）。
- **crop_embed は冪等でない**（章 md に挿入するため再実行で二重挿入）。再クロップ時は **concat で章 md をクリーン再生成してから**回す。
- **著作権安全**: `content/sources/textbook/**/img/**` は r2-sync の対象（`content/site/**/img/**`）に**入らない**＝公開R2へ同期されず git のみ。内部リファレンスを公開せずに済む。

---

## Step 1: ページ画像を抽出（pdfimages、高速）

**`pdftoppm` を使わない**。スキャン PDF は 1 ページ＝1 枚の埋め込み JPEG なので、`pdfimages -j` で**再ラスタライズせず直接ダンプ**＝瞬時・ネイティブ解像度（pdftoppm は遅い＋ネイティブ超え upscale で無駄）。

```bash
# 各 PDF を並列抽出（書籍が複数ファイルに分かれている場合）
for n in 2 3 4 5 6 7 8 9 10; do
  ( pdfimages -j "$SRC/スキャンした書類 ${n}.pdf" "$RAW/b${n}" ) &
done; wait
```

- 抽出画像は **ポートレート（例 1560×2150）で、見開き2ページが90°回転して格納**されている（`pdfimages -list` で確認）。
- 1 ページに複数画像が出る場合（インセット図）は別途要検討。通常は 1 ページ 1 画像。

## Step 2: 回転＋見開き分割で単ページ化

各スプレッド画像を **+90°（時計回り）回転 → 横長見開き → 左右に分割**して単ページにする。横書き書籍は **左ページ→右ページ**の読み順（左=偶数, 右=奇数ノンブル）。

```bash
magick "$img" -rotate 90 "$rot"            # 正立した見開きへ
# 左 = [0 .. W/2 + 3%]、右 = [W/2 - 3% .. W]（綴じ側を3%オーバーラップ）
magick "$rot" -crop ${halfL}x${H}+0+0 +repage "$PAGES/gNNNN.jpg"
magick "$rot" -crop ${rW}x${H}+${rstart}+0 +repage "$PAGES/gMMMM.jpg"
```

- **グローバル連番 `g0001..`** を読み順（book→spread→L→R）で振り、`manifest.tsv`（`g g book 元jpg L/R`）を残す。
- 回転方向は1冊1スキャナで一定。1枚 view して正立を確認してから全処理する。

### 落とし穴（必読）

- **macOS の `/bin/bash` は 3.2 で `declare -A`（連想配列）不可** → 並列クロップのオフセットは**ハードコード**（`crop_book 6 148 &` 等、各 book の開始 g を `count*2` 累積で事前計算）。
- **zsh は未クオート変数を単語分割しない** → `for g in $list` は1回しか回らない。`for g in ${=list}` を使う。
- **ディスク逼迫に注意**。raw/pages は数百 MB になり、`ENOSPC` だと**コマンド出力すら書けず途中で静かに切れる**（376→289 枚で truncate した実例）。分割が終わったら `raw/` を即削除、`df -h` を要所で確認。破損は灰色（グレー）半ページとして現れる（Step 6 のフォールバックで救済）。

## Step 3: ファンアウト OCR（Workflow）

`scanned-textbook-transcriber`（model:sonnet）に **6 ページ/エージェント**で逐語転記させる。各エージェントは**自分用ファイルに Write**し、戻り値は軽量ステータスのみ（巨大テキストを親に通さない）。168 見開き＝336 単ページ＝56 バッチ規模。

- Workflow `args` は**文字列で届くことがある** → スクリプト側で `typeof args === 'string' ? JSON.parse(args) : args` のガードと既定値を必ず入れる。
- agentType は `general-purpose`（Read 画像＋Write が要るため）。
- 各エージェントの戻り `sectionHeadings`（`## ` にしたトップ節見出し）を集約しておく＝章分割の境界マップになる。

## Step 4: 連結 → 章（節）ファイルへ分割

全バッチ出力を**読み順に連結**して 1 本の global stream を作り、**トップ節見出し（`## N.M …`）で章ファイルに分割**する。

- 分割境界の正規表現は **`^## (1\.7|2\.[1-6])[　 ]`** のように**単一数字の節のみ**マッチ（`## 2.1.2` の3桁節は誤って境界にしない）。
- 一部エージェントが3桁節を `## ` にしてしまうので、各章ファイルで **`## N.M.K` → `### N.M.K` に降格**。
- 行頭 `&gt;` → `> ` に正規化。3 連以上の空行を 1 行に圧縮。
- 出力は `content/sources/textbook/{資格}/{書名}/{NN_節タイトル}.md`。各ファイル先頭に **H1（節名）＋ `> 出典:` ブロック**（既存 `コンクリート主任技師2024/*.md` の体裁。frontmatter は付けない＝公開 MDX ではない）。
- 章扉・章導入が節境界をまたぐ場合は次節ファイルの冒頭に寄せる等、見出しと内容の整合を取る。
- **検証**: 全ファイルで `U+FFFD`（`﹖`）0 件、各ファイルの先頭/末尾 `<!-- p.NN -->` で実ノンブル範囲を確定し README 表に反映。

## Step 5: 図の精密クロップ＆埋め込み

1. 各章ファイルの `（図: …）` プレースホルダを抽出（**`（図の出典：…` の単独行は図ではないので除外**）。直前の `<!-- p.NN -->` を対象ページとする。
2. `book ノンブル → g` 対応を**バッチ出力のマーカー順**から復元（バッチ単位で割り当てると重複スキャンによるズレが局所化する）。
3. 図 bbox を Workflow で判定（ページ画像＋キャプション → `{found,x,y,w,h}` を**画像比率 0–1** で返す。`civil-exam-figure-extractor` と同型 Generator。トランスクリプト肥大回避のため**ページ画像を 800px に縮小**して渡す）。
4. メインが**元解像度ページ**を比率でクロップ（±1〜2% パディング）→ `img/figNN.png`。
5. `![図NN](img/figNN.png)` を `（図: …）` の**直前に挿入**（キャプションはデータ検索用に残置）。

### Step 6: 破損ページのフォールバック（スプレッド直接クロップ）

bbox 判定で `found:false`（「本文のみ／下半分グレー空白」）になったページは、**Step 2 の単ページ分割版が破損している**ことが多い（ディスク逼迫時の truncate）。その場合は **元スプレッドを `pdfimages -j -f P -l P` で1枚だけ再抽出 → 回転 → 分割せず丸ごと表示**して図の実在を確認し、**スプレッドから直接クロップ**する（`manifest.tsv` で対象 book/spread/side を引く）。これで「抽出不可」を「破損の再生成」に切り分けられる（実例: fig15/21/30 を救済）。

## Step 7: 仕上げ・コミット

- README（索引）に **ファイル↔節↔ノンブル↔字数表・文字起こし方法・図埋め込み状況・既知の限界**（図プレースホルダ／スキャン末尾の途切れ／原文ママ箇所）を記録。
- `content/sources/textbook/` は site index 非対象 → **`refresh-indexes` 不要**。純コンテンツ編集ゆえ **`/doc-sync` も対象外**。
- `git add` は**変更ファイルを明示指定**（`git add -A` 禁止）。スキャン PDF を追跡するかはユーザー判断（大容量＋著作権）。一時スクリプトは `.tmp/`（gitignore）に置きコミットしない。

## 実績

- 技術士（建設部門）「論文対策キーワード」168 見開き → 7 章 .md（約312k字・文字化け0）＋図31点を埋め込み（2026-06-14、**経路A: pdfimages 見開き**）。[[project_pe_construction_secondary]] 等の二次 writer の論点参照元。旧 `reference_scanned_pdf_pipeline`（pdftoppm 方式）を pdfimages 方式に更新。
- 1級土木施工管理技士 テキスト 施工管理・法規編 327p→7章（320k字）＋図135、土木一般編 385p→6章（369k字）＋図320 を埋め込み（2026-06-24、**経路B: PyMuPDF 単ページ**、`scripts/scanned/` 一式で実施）。会社 Windows に pdfimages/magick が無く PyMuPDF 経路を確立。図 bbox の groupSize 順次処理でレート制限を回避（135図一括時の29失敗→322図で失敗0）。[[project_civil1_textbook_transcription]]。
