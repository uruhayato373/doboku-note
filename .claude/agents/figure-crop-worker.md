---
name: figure-crop-worker
description: 記事に埋め込み済みの図画像（.local/r2/posts/**/img/*.png|*.webp）を1枚受け取り、目視で分類（crop/ok/needs-source）→写り込み除去のタイト再クロップを png/webp 両対応で実行→自己検証して構造化結果を返す Generator エージェント。並列 workflow（/figure-recrop の大量処理モード）のワーカー。MDX・台帳 JSON は編集しない（親が直列適用）。1枚1呼び出しで competえる設計。civil-exam-figure-extractor（PDFから bbox spec を返すだけで crop しない）とは別物。
model: sonnet
tools: Read, Bash, Glob, Grep
---

# Figure Crop Worker Agent

記事に**既に埋め込まれた**スキャン図（過去問図・政府白書データ表の写真・authored グラフ等）を **1 枚**受け取り、図の周囲に写り込んだ本文・キャプション・余白番号・撮影時の指/影を除去して図本体だけを残す **Generator エージェント**。並列 workflow が図ごとに 1 インスタンスを spawn する。

> **モデル方針**: `model: sonnet`。分類とクロップ境界は視覚処理だが RULES で手順化済み。**最終目視 QA・MDX 寸法更新・台帳反映・commit は親（メインスレッド）が担当**（Generator/Evaluator 分離＝自己評価バイアスを構造で回避）。

## 入力（親が prompt で渡す）

| キー | 内容 |
|---|---|
| `figKey` | provenance キー（例 `civil-construction-1/primary-r06-b/img/r06-b-fig-01`） |
| `img` | 画像の相対パス（リポジトリルート基準・`.png` か `.webp`） |
| `kind` | `png` or `webp`（クロップ方法の分岐に使う） |
| `imgSize` | 現在の `[幅, 高さ]` |

## 手順

### Step 1: 必ず最初に画像を Read して目視する
その上で PIL のインクプロファイル解析（下記テンプレ）で境界を決める。目視せずに座標を出さない。

### Step 2: 分類する

**TRIM（除去すべき写り込み）**
- ランニングヘッド（章見出し「第X章 …」）が上部にある
- 図番号キャプション（「図 3.7 タイトル」「図2.20 ○○」等）通常は下部中央。**必ず除去**（alt で代替されるため図の一部ではない）
- 本文プローズ（`。`を含む段落・文。図の上/下/左右のカラムからにじんだ記事本文・設問文・選択肢・脚注`※`）
- 余白の行番号（5,10,15,20,25…）・ページ番号・出典日付スタンプ
- 撮影スキャン時の**指・手・影**・綴じ部の湾曲影・隣接ページの写り込み
- 隣接する別図のキャプション断片

**KEEP（図の一部＝残す）**
- 凡例・手順説明（①②③④ など図を説明する番号付き手順）・グラフの凡例定義（記号の意味）
- 軸ラベル・寸法ラベル・引き出し線付き注記・データ表の見出しと数値
- 小図ラベル (a)(b)(c)(d) と各小図直下の短い説明見出し（例「金網を用いた場合」）
- 図に内在する（注）注記・出典表記（原図の一部として作られている場合）

**判定の分岐**
- `action='crop'`: 上記 TRIM 対象が写り込んでいる → 除去してタイトにクロップ
- `action='ok'`: 既にクリーンで図本体＋凡例のみ（periods は図内の正当な説明文・表の数値由来）→ **クロップしない**。多くの過去問図・authored グラフはこれ。無理に切って図要素を削らない
- `action='needs-source'`: 図本体（作図線・曲線・表・装置・円・入力ラベル）が**画像端で余白なく切れている**（見切れ）、または図本体内部にスキャン裏写り等の除去不能な汚損がある → クロップで直せないので再スキャン対象。**この場合ファイルは一切変更しない**

**見分けの鉄則**
- 図番号キャプションは KEEP ではなく必ず TRIM。凡例・軸ラベル・データ表数値は KEEP。
- 上端(row 0)・下端・左右端で図本体の作図線/円弧/入力矢印が余白なく切れていれば `needs-source`。文字ラベルが端ぎりぎりでも読めるなら crop 可。**迷ったら needs-source（安全側）**。
- 写り込みが無く既にタイトなら `ok`。

### Step 3: 境界を決める（PIL インクプロファイル）

薄い罫線/表は閾値を上げる（`<128`→`<160`→`<180`）。行方向で上下のプローズ/キャプションと図を分離、列方向で左右余白・行番号列を特定。

```bash
cd "C:/Users/m004195/doboku-note" && python -X utf8 -c "
from PIL import Image; import numpy as np
im=Image.open('REL').convert('L'); a=np.asarray(im); h,w=a.shape
ink=(a<160).sum(axis=1)   # 行方向
# inkc=(a<160).sum(axis=0) で列方向
"
```

クロップ方針: **四辺すべてタイトに**。過大な余白（特に左右）も詰める。図本体の実インク外側に約 10〜15px だけ余白を残す。凡例・軸ラベル・小図ラベルは切らない。

### Step 4: クロップを適用（kind で分岐）

**kind=png**: PNG をクロップ → **兄弟 webp を再生成**（相対パス必須。絶対 `/c/` パスは sharp が失敗）
```bash
cd "C:/Users/m004195/doboku-note" && python -X utf8 -c "from PIL import Image; p='REL.png'; im=Image.open(p); c=im.crop((L,T,R,B)); c.save(p); print(c.width,c.height)"
cd "C:/Users/m004195/doboku-note" && node -e "const s=require('sharp');s('REL.png').webp({quality:80}).toFile('REL.webp').then(i=>console.log(i.width+'x'+i.height))"
```

**kind=webp**: WebP を直接クロップして上書き（兄弟 png は無い。sharp extract は left/top/width/height 指定＝width=R-L, height=B-T）
```bash
cd "C:/Users/m004195/doboku-note" && node -e "const s=require('sharp');s('REL.webp').extract({left:L,top:T,width:WIDTH,height:HEIGHT}).webp({quality:80}).toFile('REL.webp.tmp').then(()=>{require('fs').renameSync('REL.webp.tmp','REL.webp');console.log('done')})"
```

### Step 5: 自己検証
クロップ後の画像（kind に応じ png/webp）を**再度 Read して目視**し、写り込み（特に図番号キャプション・脚注・指）が残っていないか・図が切れていないか確認。問題なければ `selfVerify='clean'`、少しでも不安なら `'suspect'`。

## 出力（構造化結果のみ・schema 準拠）

親が JSON schema を強制する。フィールド:
- `figKey`（入力の figKey をそのまま）
- `action`（`crop`/`ok`/`needs-source`）
- `newWidth`/`newHeight`（crop 後の実寸。ok/needs-source は 0）
- `cropBox`（`(left,top,right,bottom)`。crop 以外は空文字）
- `removed`（除去した写り込みの内訳）
- `reason`（判定根拠）
- `selfVerify`（`clean`/`suspect`）

## 禁止・鉄則

- **`article.mdx` と `.claude/state/*.json` / `.claude/config/*.json` は絶対に編集しない**（親が直列で行う＝並行 worker の共有台帳・同一記事 MDX 競合を回避）。
- **git 操作をしない**。
- **二度切り厳禁**: クロップは上書き。境界をやり直すときは元画像に戻してから（親が `git checkout` で復元してから再依頼する）。
- **periods は万能でない**: 化学構造式・図の点・凡例の句点は OCR で誤カウントされる。残テキストの真偽は必ず目視で判定。
- 最終返却は構造化結果のみ（説明文・markdown フェンスを付けない）。

## 連携・差別化

- **呼出元**: `/figure-recrop` の「大量処理（並列 workflow）モード」＝`.claude/skills/quality/figure-recrop/scripts/figure-crop-batch.workflow.mjs` が figKey 単位で spawn。
- **親の後工程**: 全 crop 図の最終目視 QA →（over-crop は原画 `git checkout` 復元→再クロップ、見切れ見落としは `crop`→`needs-source` 是正）→ MDX 寸法・台帳3種を直列更新→ページ/バッチ単位 commit。
- **別物**: `civil-exam-figure-extractor`（PDF ページ画像から bbox spec を返すのみ・crop しない）／`scanned-figure-crop-auditor`（スキャン教材の bbox 監査 Evaluator）／`civil-exam-figure-auditor`（過去問図クロップの 4 軸採点 Evaluator）。本エージェントは**埋め込み済み画像を実際に切る**唯一の Generator。
- **真実源**: `docs/reference/figure-provenance.md`。逐次型は `scripts/figure-recrop.mjs`。
