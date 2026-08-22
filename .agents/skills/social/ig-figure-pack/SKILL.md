---
name: ig-figure-pack
description: 技術士総監／土木 キーワードの **site figure SVG を** IG 4 枚カルーセルパック（表紙/図解/テキスト/CTA）に変換（過去問パックは対象外）。resvg-js で 400×500 SVG → 1080×1350 PNG（2.7×）し caption.txt を生成。図解スライドは site の figure-N.svg を再利用。PNG はブラウザから Google Drive へ手動アップロード、caption.txt は MCP 経由で Drive に送信。使い分け＝過去問パック新規は ig-post-create、意匠一括再生成は ig-carousel-restyle。
allowed-tools: Bash, Read, Write, Edit
---

# IG figure パック生成スキル

キーワードページの site 図版（`figure-N.svg`）を活かした **4 枚カルーセルパック** を作る。`ig-post-create --slug` の旧 notebook デザインとは別系統（SVG 手書き + resvg-js）。

| スライド | ファイル | 内容 |
|---|---|---|
| 表紙 | `00-cover.svg` | キーワード名（大）+ 5 管理ラベル（orange）+ 試験種ラベル |
| 図解 | `01-figure.svg` | site の `figure-N.svg` を **cp でそのままコピー**。IG ヘッダー/フッター追加禁止（サイト図はヘッダーなし白背景が正） |
| テキスト | `02-text.svg` | 試験頻出ポイント 3 点 + orange 注意 Callout。**サイト figure-*.svg には試験ポイントを含めないルール（figure-canvas-policy §2.5）のため、IG 向けポイント配信の唯一の担当スライド** |
| CTA | `03-cta.svg` | doboku-note.com 誘導 + @doboku-note フッター |

## ディレクトリ構成

```
docs/sns/instagram/{exam}/keyword-packs/{keyword}/   ← keyword-packs/ サブdir 必須
  carousel/
    img/
      00-cover.svg
      00-cover.png   ← 生成物 (1080×1350)
      01-figure.svg  ← site figure のコピー
      01-figure.png  ← 生成物
      02-text.svg
      02-text.png    ← 生成物
      03-cta.svg
      03-cta.png     ← 生成物
    caption.txt
```

`{keyword}` は site slug（例: `mcgregor-xy-theory`）と一致させる。**`keyword-packs/` を省略して `{exam}/{keyword}/` 直下に置かない**（パスドリフト。`check-ig-cover` が pre-commit でブロック）。`figure-reel-create.mjs` は `--pack keyword-packs/{keyword}` または `--pack cem/keyword-packs/{keyword}` で指定する。

## デザイン仕様

| 項目 | 値 |
|---|---|
| SVG キャンバス | `400×500`（viewBox、4:5 固定） |
| 出力解像度 | `1080×1350`（2.7× スケール、IG feed 4:5 推奨） |
| ブランド navy | `#1a3a5c` |
| ブランド orange | `#a36b2c` |
| フォント | `Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif` |

> **配色は管理区分によらず全パック共通（navy `#1a3a5c` + orange `#a36b2c`）。** `svg-base.mjs` の `MGMT_COLORS`（管理区分別カラー）は過去問パック自動生成スクリプト専用であり keyword pack には**一切適用しない**。新規作成前に必ず既存パック（例: `maslow-hierarchy-of-needs/carousel/img/00-cover.svg`）を Read して配色を目視確認してから SVG を書く（2026-06-25 フェールセーフパックで安全管理色誤適用・修正の再発防止）。

ブランドコンテキスト: **資格試験対策**。表紙には必ず試験種（「技術士 総監 | 人的資源管理」等）を入れる。ライフスタイル系・自己啓発系フックは避ける。

## 進め方

### 0. SVG コーディングルール（全スライド共通）

SVG を Write したら**必ず即座に PNG を resvg で生成し Read で目視確認してから次のスライドに進む**。全枚書き終えてから一括確認しない（問題発覚が遅れる）。

```bash
node -e "
import('@resvg/resvg-js').then(({Resvg})=>{
  const {readFileSync,writeFileSync}=require('fs');
  const svg=readFileSync('PATH/NN-name.svg','utf8');
  const buf=new Resvg(svg,{fitTo:{mode:'width',value:1080},font:{loadSystemFonts:true}}).render().asPng();
  writeFileSync('PATH/NN-name.png',buf);
  console.log('done',buf.length);
});
"
```

> **既存スライドを後からスクリプトで一括加工したときも同じ**: 帯・ラベルの追加や座標変更をしたら、改変した全スライドの PNG を再生成して 1 枚ずつ再目視する。この per-slide ループをすり抜ける「後付け一括加工」が重なり混入の典型原因（2026-06-30 制度名 navy 帯が見出しに重なって出荷）。

> **IG 図の品質ゲートは目視であって `svg/audit.mjs` ではない**: audit はサイト図（`.local/r2/posts/**`）専用で既定スコープが docs/sns を除外する。`--file=` で IG 図に当てると navy 帯＋白文字が `P8-dark-bg`（HIGH）で偽陽性になる（IG 図では navy 帯は正規仕様）。重なり検知の `P2-overlap` は MEDIUM=非ブロックなので頼らない。

**目視で必ず確認する 6 点（レイアウト品質）:**

- [ ] **テキストが列/行境界をはみ出していない** — text-anchor="middle" + 中心座標で列幅の半分を超えるテキストは折り返しか font-size 縮小
- [ ] **テキスト最下行の baseline から行ボーダー（rect 下辺）まで ≥ 20px 確保** — 行高 100px に対して最下テキストは bottom−20 以上の余裕
- [ ] **カード内テキストはヘッダー矩形の bottom + 14px 以下から開始** — ヘッダー rect の下辺 y+h から 14px あけないと英字サブタイトル等がヘッダーに食い込む
- [ ] **比較表の縦区切り線は全行セル rect の後に描画** — rect が先だと縦線が塗り潰される。`<!-- 縦線は最後 -->` コメントで明示
- [ ] **各列のテキスト密度が縦方向に均等** — 左列が上部寄り・右列が中央など非対称になっていないか
- [ ] **英字サブタイトル等の装飾テキストがヘッダー rect と重なっていない** — fill が薄い色でも bg と混ざって「幽霊テキスト」になる

### 1. ディレクトリ作成と SVG 設計

```bash
mkdir -p "docs/sns/instagram/{exam}/{keyword}/carousel/img"
```

4 枚の SVG を `viewBox="0 0 400 500"` で設計:

**00-cover.svg** — テンプレ（SSOT）をコピーして文言だけ差し替える。**一から書かない**

真実源テンプレ: [`templates/00-cover.template.svg`](templates/00-cover.template.svg)（maslow / mcgregor の現物と一致）。新規パックはこれか直近 `cem/` パックの `00-cover.svg` をコピーし、`{{ARIA}}` `{{KANRI}}` `{{TITLE1/2}}` `{{SUB1/2}}` だけ差し替える。**chrome（下記）は変更不可**:

- 2ピル構造: 塗りピル「技術士 総監」＋枠ピル「{管理区分}」（`stroke="#a36b2c"`）
- 固定バッジ「**択一 頻出テーマ**」（orange 塗り `rx=20`）
- スワイプ「スワイプして図解を確認 **▶**」
- フッター: `#0f2035` 帯・「**doboku-note.com**」（`@doboku-note` は旧仕様・NG）
**タイトル文字サイズのルール**（chrome 外＝`check-ig-cover` の機械検査対象外・運用ルール。視覚字幅＝全角 1.0／半角 0.55 で段階選択し、不適切な改行を避ける。算法は [`fit-title.mjs`](../../../scripts/lib/sns-common/fit-title.mjs) の `pickTitleSize`／`visualLength`）:

- **標準カバー**（単一キーワード）: 既定 **42px**（2 行 `y=170/220`、1 行なら `y=195`）。タイトルが長い場合のみ段階縮小する。目安: 視覚字幅 ≤7=42px ／ ≤10=34px ／ ≤13=28px。**下限はおよそ 28px**。それ未満になるならフォントを縮めず**タイトルを 2 行に分割**する（手書き生成器で字数ごとに任意のサイズを当てない＝サイズのドリフト防止）。
- **比較（A vs B ／ vs 構造）型カバー**: 2 つの対立概念を上下に大きく置き、中央に orange（`#a36b2c`）の「**vs**」(22px) を挟む**対向デザイン**にする（例: プッシュ型 vs プル型、X 理論 vs Y 理論）。雛形＝`mcgregor-xy-theory/00-cover.svg`（概念語は短く＝既定 **68px**、長い場合は段階縮小）。**タイトルを単に 2 行に積むフラット構成にしない**。chrome（2 ピル・バッジ・フッター）は標準と同一。

> これらは `check-ig-cover`（pre-commit）が機械検証する（ただし上記タイトル文字サイズは機械検査せず運用ルール）。逸脱すると赤落ち。**SKILL.md とテンプレと現物の三者は常に一致させる**（2026-06-24 制定、表紙ドリフトの再発防止）。

**01-figure.svg** — site figure をコピー＋**白背景rectを必ず追加**
```bash
copy ".local\r2\posts\{exam}\{slug}\img\figure-1.svg" "docs\sns\instagram\{exam}\{keyword}\carousel\img\01-figure.svg"
```
- **コピー直後に `<svg>` タグの直後へ `<rect width="400" height="500" fill="#ffffff"/>` を追加する**。サイト図はページの白背景に乗る前提で背景を持たないため、そのまま PNG 化すると**透明 → Instagram が黒で表示**され濃色文字が読めなくなる（2026-06-24、8中5パックで発生）。`check-ig-cover` が pre-commit で背景欠落をブロックする
- `figure-N.svg` が `640×360`（landscape）の場合は `viewBox` を再調整して縦型にリレイアウトが必要

**02-text.svg** — 白背景
- ヘッダ帯: navy 背景・試験種（orange 10px）+ ページタイトル（白 bold 16px）
- 番号付きポイント 3 点（navy circle + テキスト）
- 注意 Callout: orange 左縁・`fill="#fce8d0"` 背景・強調テキスト
- フッター帯: navy・`doboku-note.com`

**03-cta.svg** — テンプレ（SSOT）をコピーして文言だけ差し替える。**一から書かない**

真実源テンプレ: [`templates/03-cta.template.svg`](templates/03-cta.template.svg)（pfi / sexual-harassment / labor-relations-adjustment-act の現物と一致、2026-06-25 標準化）。`{{ARIA}}` `{{TITLE}}` `{{DESC1/2}}` だけ差し替える。**chrome は変更不可**:

- 見出し「もっと深く学びたい方へ」（薄青 14px・固定）
- 本アイコン（幾何学、orange stroke・固定）
- テーマ別タイトル「{キーワード} 完全解説」（白 bold 18px）＋このページで分かることを 2 行（薄青 14px）
- URL ボタン: `rx="26"` 丸角・orange 塗り・白文字 `doboku-note.com`
- 誘導文「プロフィールのリンクから／総監キーワード集へアクセス」（薄青 13px・固定）
- フッター帯: 濃 navy・`@doboku-note`

> **画像内にハッシュタグを書かない**（クリック・検索できず無意味。タグは caption.txt のみ）。旧 maslow / mcgregor 系 CTA（汎用文言「もっと解きたい方へ」＋画像内ハッシュタグ）は本標準より前の様式で、新規パックでは使わない。末尾スライド名はパック枚数で `03-cta.svg`（4 枚）/ `04-cta.svg`（5 枚）/ `05-cta.svg`（6 枚）になる。
>
> これらは `check-ig-cta`（pre-commit）が機械検証する（見出し「もっと深く学びたい方へ」／誘導文／`@doboku-note`／画像内ハッシュタグ禁止）。逸脱すると赤落ち。**SKILL.md とテンプレと現物の三者は常に一致させる**（2026-06-25 制定、CTA ドリフトの再発防止。表紙の `check-ig-cover` と対）。

### 2. PNG 変換スクリプトを作成・実行

`.tmp/svg-to-png.mjs` を作成（前回パックのを PACK_DIR・FIGURE_SRC だけ書き換えて再利用可能）:

```javascript
import { readFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';

const PACK_DIR = 'docs/sns/instagram/{keyword}/carousel/img';
const FIGURE_SRC = '.local/r2/posts/{exam}/{slug}/img/figure-1.svg';
const SCALE = 2.7; // 400×500 → 1080×1350

async function svgToPng(svgPath, pngPath) {
  const svg = readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: Math.round(400 * SCALE) },
    font: { loadSystemFonts: true },
  });
  const pngBuffer = resvg.render().asPng();
  const { writeFileSync } = await import('fs');
  writeFileSync(pngPath, pngBuffer);
  console.log(`✓ ${pngPath} (${pngBuffer.length} bytes)`);
}

await svgToPng(`${PACK_DIR}/00-cover.svg`, `${PACK_DIR}/00-cover.png`);
await svgToPng(FIGURE_SRC, `${PACK_DIR}/01-figure.png`);
await svgToPng(`${PACK_DIR}/02-text.svg`, `${PACK_DIR}/02-text.png`);
await svgToPng(`${PACK_DIR}/03-cta.svg`, `${PACK_DIR}/03-cta.png`);
console.log('\n4 枚完了。');
```

```bash
node .tmp/svg-to-png.mjs
```

前提: `@resvg/resvg-js` が `node_modules` に存在すること（`npm install --legacy-peer-deps` 済みなら入っている）。

### 3. caption.txt を作成

```
docs/sns/instagram/{keyword}/carousel/caption.txt
```

構成テンプレ:

```
{キーワード和名}を完全整理

{試験種} {5管理名}の択一で頻出のテーマです。

▶ {ポイント1見出し}
{1-2行の説明}

▶ {ポイント2見出し}
{1-2行の説明}

{引っかけポイントの注意一文（X/Y理論の入れ替えなど）}

詳しい解説と過去問演習は プロフィールのリンクから
→ doboku-note.com

---
#技術士 #総監 #技術士総監 #{管理名} #択一 #試験対策 #{キーワードタグ} ...（15-20 個）
```

X ポリシーのタグ 1-3 個ルールとは別系統。IG は 20 個まで OK。

### 4. 品質確認

> **Step 0 で各スライド Write 直後に目視確認済みであること**が前提。ここは全枚揃った段階の最終チェック。

Read ツールで全枚 PNG を確認（画像として表示される）。

**コンテンツ（全スライド）**
- [ ] 表紙に試験種ラベル（「技術士 総監 | {管理名}」等）が入っている
- [ ] navy `#1a3a5c` / orange `#a36b2c` が統一されている
- [ ] テキストスライドのポイントが簡潔（各 1-2 行）
- [ ] CTA に `doboku-note.com` が入っている
- [ ] caption.txt のハッシュタグが 15-20 個

**視覚品質（Step 0 の 6 点を全枚で再確認）**
- [ ] テキストが枠外にはみ出していない（特に比較表の左列・長い用語）
- [ ] 行ボーダーとテキストの間に十分な余白がある（最下行 baseline から ≥ 20px）
- [ ] 比較表の縦区切り線が全行にわたって見えている（行 rect に隠れていない）
- [ ] 列間のテキスト密度が縦方向に揃っている（上寄り・下寄りの非対称がない）
- [ ] 装飾テキストがヘッダーや背景矩形と重なっていない

### 5. スマホへの転送

**caption.txt**: Google Drive MCP ツールで直接アップロード可能

```
mcp__claude_ai_Google_Drive__create_file(
  title="caption.txt",
  textContent=<caption 内容>,
  contentMimeType="text/plain",
  disableConversionToGoogleType=true,
  parentId=<Google Drive フォルダ ID>
)
```

**PNG 4 枚**: `mcp__filesystem__read_text_file` の出力上限が約 25K chars のため MCP 経由不可（最小の 03-cta.png でも 57KB → 76K chars base64 → 3× オーバー）。PNG は git に commit 済みなので転送が必要な場合は以下:

1. Windows Explorer で `docs/sns/instagram/{keyword}/carousel/img/` を開き → ブラウザで drive.google.com にドラッグ＆ドロップ
2. Mac 側に repo があれば Mac で `.tmp/svg-to-png.mjs` を実行して生成
3. OAuth スクリプト（`C:\tmp\upload-to-drive.mjs`）: Drive スコープのトークンを取得して REST API で直接アップロード（ブラウザ認可 1 回のみ必要）

## 担当外

- **slide-data.json 形式（過去問 4 問パック）** → `ig-post-create --exam`
- **A シリーズ択一クイズパック** → `ig-post-create --slug` + render-quiz-pack.mjs
- **figure パックの Reels 動画化（ナレーション付き）** → `node scripts/figure-reel-create.mjs --pack <topic>`（carousel/img の 4:5 PNG を 9:16 白パディング＋VOICEVOX ナレーション＋ffmpeg で解説リール mp4 化。`reels/script.txt`＝ナレ原稿が必要、VOICEVOX 起動が前提）。**`ig-reel-create` は過去問パック専用（slide-data.json quiz スキーマ）で figure パックは扱えない**ので混同しない
- **IG 予約投稿** → `publish-ig-bs`（`figure-reel-create` 出力の `reels/cover.png` を編集ステップでサムネ設定）
- **品質採点** → `ig-carousel-qa`
- **過去問 H21-R7 全網羅パック** → `ig-carousel-restyle`
- **figure-*.svg を Stories / Reels の 9:16 キャンバスに配置する静止画変換** → `.Codex/knowledge/reference/sns-image-policy.md §13`（本スキルが生成した 4:5 PNG はそのまま 9:16 中央に配置できる）

## 注意

- `git add -A` 禁止（AGENTS.md §3）。PNG は gitignore 対象外なのでパス指定で add
- site の figure SVG が `640×360`（landscape、`--wide` フラグ想定）の場合は縦型への再レイアウトが必要
- resvg-js はシステムフォント（`loadSystemFonts: true`）を使うため、日本語が文字化けする場合は Node.js プロセスの locale を確認する
- 一時出力先として `.tmp/` を使うケースは `.gitignore` 対象なので C:\tmp\ または `docs/sns/` 配下に最終成果物を置く
