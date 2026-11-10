> **doboku-note 版で読む前に**: 本ファイルは note.com エディタ操作の共通ノウハウ（stats47 由来）です。**アカウント=note.com/dobokunote、Chrome プロファイル、記事パス（content/note/技術士総監/magazines/...）、frontmatter（notePricing/price）、有料境界、ハッシュタグ/カバー/PDF の doboku-note 固有差分は、先に publish-note/SKILL.md の「stats47 → doboku-note 差分マップ」を読むこと。** 本文中の Profile 5 / note.com/stats47 / docs/31_note記事原稿 / is_paid・price_jpy は stats47 の例であり、doboku-note では SKILL.md の対応に読み替える。

# エディタ操作の詳細手順

> このファイルは `publish-note` スキルの詳細手順です。概要は [SKILL.md](../SKILL.md) を参照。

## Phase 0: データ読み込み（Node.js スクリプト）

引数をパースした後、各 slug について以下の Node.js スクリプトを `/tmp/note-prepare-<slug>.js` に書き出して実行する。

```javascript
// /tmp/note-prepare-<slug>.js
const fs = require('fs');
const path = require('path');

const slug = '<SLUG>';
const projectRoot = '/Users/minamidaisuke/stats47';

// 探索順: 31_note記事原稿（制作中）と 32_note公開済み（公開完了ヴァーティカル）の
//         <slug> 直下および <vertical>/<slug> を検索する。
// 各ディレクトリ内では note.md (旧規約) と draft.md (新規約) の両方をチェック
const baseDirs = [];
for (const root of ['docs/31_note記事原稿', 'docs/32_note公開済み']) {
  const rootAbs = path.join(projectRoot, root);
  baseDirs.push(path.join(rootAbs, slug));
  if (fs.existsSync(rootAbs)) {
    for (const v of fs.readdirSync(rootAbs)) {
      const vDir = path.join(rootAbs, v, slug);
      if (fs.existsSync(vDir)) baseDirs.push(vDir);
    }
  }
}

let articleDir = null;
let articleFile = null;
outer: for (const d of baseDirs) {
  for (const f of ['note.md', 'draft.md']) {
    if (fs.existsSync(path.join(d, f))) {
      articleDir = d;
      articleFile = f;
      break outer;
    }
  }
}
if (!articleDir) { console.error('ERROR: note.md / draft.md not found for ' + slug); process.exit(1); }

const raw = fs.readFileSync(path.join(articleDir, articleFile), 'utf8');

// frontmatter 解析 (quote 任意)
const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
const fm = fmMatch?.[1] ?? '';
const fmField = (key) => {
  const m = fm.match(new RegExp('^' + key + ':\\s*(?:"(.+?)"|\'(.+?)\'|(.+?))\\s*$', 'm'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
};
const title = fmField('title');
const isPaid = fmField('is_paid') === 'true';
const priceJpy = parseInt(fmField('price_jpy') || '0', 10);

// 本文準備
let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
// HTML コメントをすべて除去（<!-- SVG: ... --> / <!-- note投稿時 --> / <!-- circulation-footer --> 等）。
// 残すと note 上に可視テキストとして混入する。
body = body.replace(/<!--[\s\S]*?-->\n?/g, '');
body = body.replace(/!\[.*?\]\(.*?\)\n?/g, '');
body = body.replace(/^---$/gm, '');
body = body.replace(/\n*^##\s*公開時にコピーするハッシュタグ[\s\S]*$/m, '');
// 先頭の `# H1` を除去（note ではタイトル欄に入れるため。残すと本文に H1 が重複する）
body = body.replace(/^#\s+.*\n+/, '');
body = body.trim();

// 有料境界 ("ここから先は有料部分") で free / paid 分割
let bodyFree = body;
let bodyPaid = '';
if (isPaid) {
  const splitRe = /^ここから先は有料部分[:：][^\n]*$/m;
  const splitMatch = body.match(splitRe);
  if (splitMatch) {
    const idx = body.indexOf(splitMatch[0]);
    bodyFree = body.substring(0, idx).replace(/\n*---\s*\n*$/, '').trim();
    bodyPaid = body.substring(idx + splitMatch[0].length).trim();
  }
}
// 分割後、フルボディからも有料境界マーカー行を除去する。
// どのセグメント（segments / segmentsFree / segmentsPaid）にもマーカー行を残さない。
body = body.replace(/^ここから先は有料部分[:：][^\n]*$\n?/m, '').trim();

// セグメント分割 (URL vs テキスト)
function splitSegments(text) {
  const lines = text.split('\n');
  const segs = [];
  let buf = [];
  for (const line of lines) {
    if (/^https?:\/\/\S+$/.test(line.trim())) {
      if (buf.length > 0) { segs.push({ type: 'text', content: buf.join('\n') }); buf = []; }
      segs.push({ type: 'url', content: line.trim() });
    } else { buf.push(line); }
  }
  if (buf.length > 0) segs.push({ type: 'text', content: buf.join('\n') });
  return segs;
}

const segments = splitSegments(body);                       // 全文 (paste 用)
const segmentsFree = isPaid ? splitSegments(bodyFree) : segments;
const segmentsPaid = isPaid ? splitSegments(bodyPaid) : [];

// タグファイル: hashtags.txt を優先し、無ければ tags.txt
const tagsPath = fs.existsSync(path.join(articleDir, 'hashtags.txt'))
  ? path.join(articleDir, 'hashtags.txt')
  : path.join(articleDir, 'tags.txt');
const tags = fs.existsSync(tagsPath)
  ? fs.readFileSync(tagsPath, 'utf8').trim().split('\n').map(s => s.trim()).filter(Boolean).slice(0, 50)
  : [];

// 画像ファイルの検出
const imagesDir = path.join(articleDir, 'images');
const images = { eyecatch: null, choropleth: null, chart: null, boxplot: null };
if (fs.existsSync(imagesDir)) {
  const files = fs.readdirSync(imagesDir);
  images.eyecatch = files.find(f => f.startsWith('cover-')) || null;
  images.choropleth = files.find(f => f.startsWith('choropleth-map-')) || null;
  images.chart = files.find(f => f.startsWith('chart-x-')) || null;
  images.boxplot = files.find(f => f.startsWith('boxplot-')) || null;
}

// 出力
const result = {
  slug,
  articleDir,
  articleFile,
  title,
  isPaid,
  priceJpy,
  segments,
  segmentsFree,
  segmentsPaid,
  tags,
  images,
  segmentCount: segments.length,
  freeSegmentCount: segmentsFree.length,
  paidSegmentCount: segmentsPaid.length,
  urlCount: segments.filter(s => s.type === 'url').length,
};

fs.writeFileSync('/tmp/note-data-' + slug + '.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  slug,
  title: title.substring(0, 50),
  isPaid,
  priceJpy,
  segments: segments.length,
  freeSegments: segmentsFree.length,
  paidSegments: segmentsPaid.length,
  urls: segments.filter(s => s.type === 'url').length,
  tags: tags.length,
  images: Object.entries(images).filter(([,v]) => v).map(([k]) => k),
}));
```

実行:
```bash
node /tmp/note-prepare-<slug>.js
```

## Phase 1: ブラウザ起動 & エディタ表示

```bash
browser-use --headed --profile "Profile 5" open "https://editor.note.com/new"
sleep 4
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
```

`/tmp/note-state.txt` に `contenteditable=true` が含まれていればログイン済み。含まれていなければ「ログイン」等を確認。

**未ログイン時は停止**: `echo "ERROR: not logged in to note.com"` で停止し、手動ログインを案内する。

## Phase 2: アイキャッチ画像（※必ず本文入力前に実行）

**エディタ初期状態で「画像を追加」ボタンが確実に見える。** 本文入力後はスクロール位置がずれてボタン検出に失敗する。Phase 1 の state で `aria-label=画像を追加` のインデックスを同時に取得して使う。

```bash
# Phase 1 の state から取得済みの IMG_BTN を使用
ADD_IMG_IDX=$(grep -oE '\[[0-9]+\]<button aria-label=画像を追加' /tmp/note-state.txt | grep -oE '[0-9]+')
browser-use --headed --profile "Profile 5" click $ADD_IMG_IDX
sleep 2

browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
UPLOAD_IDX=$(grep -B1 '画像をアップロード' /tmp/note-state.txt | head -1 | grep -oE '\[[0-9]+\]' | tr -d '[]')
browser-use --headed --profile "Profile 5" click $UPLOAD_IDX
sleep 2

browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
FILE_IDX=$(grep -oE '\[[0-9]+\]<input id=note-editor-eyecatch-input' /tmp/note-state.txt | grep -oE '[0-9]+')
browser-use --headed --profile "Profile 5" upload $FILE_IDX <articleDir>/images/cover-1280x670.png
sleep 3

# トリミングダイアログの「保存」ボタン（「下書き保存」と区別）
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
SAVE_IDX=$(grep -B1 '	保存$' /tmp/note-state.txt | head -1 | grep -oE '\[[0-9]+\]' | tr -d '[]')
browser-use --headed --profile "Profile 5" click $SAVE_IDX
sleep 3
```

画像ファイルが存在しない場合はこの Phase をスキップする。

## Phase 3: タイトル入力

```bash
# アイキャッチ設定後に state を再取得（インデックスが変わっている）
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
TITLE_IDX=$(grep -oE '\[[0-9]+\]<textarea placeholder=記事タイトル' /tmp/note-state.txt | grep -oE '[0-9]+')
BODY_IDX=$(grep -oE '\[[0-9]+\]<div contenteditable=true role=textbox' /tmp/note-state.txt | grep -oE '[0-9]+')
browser-use --headed --profile "Profile 5" click $TITLE_IDX
browser-use --headed --profile "Profile 5" type "<タイトルテキスト>"
```

## Phase 4: 本文入力（一括 paste 方式）

**確定原則**（2026-04-25 検証）:
- ClipboardEvent paste は **同一エディタで 1 回しか機能しない**（2 回目以降の eval は `result: None` で失敗）
- `type` コマンドは note エディタの markdown shortcut（`##` / `###` / `**bold**`）を **発動しない** → literal 文字列として残る

→ 最善策は **「全セグメントを 1 つの markdown 文字列に連結 → 1 回だけ ClipboardEvent paste」**。
これにより H2 / H3 / 太字すべて正しく変換される。トレードオフ: URL は plain text のまま貼られて OGP カード化しない。

### 4-1. 本文エリアにフォーカス

```bash
BODY_IDX=$(find_idx "contenteditable=true role=textbox")
browser-use --headed --profile "Profile 5" click $BODY_IDX
```

### 4-2. 全本文を 1 回 paste

```bash
# 全セグメントを連結して /tmp/note-body-<slug>.txt に保存
node -e "
const data = JSON.parse(require('fs').readFileSync('/tmp/note-data-<slug>.json','utf8'));
const body = data.segments
  .map(s => s.type === 'url' ? '\n\n' + s.content + '\n\n' : s.content)
  .join('')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
require('fs').writeFileSync('/tmp/note-body-<slug>.txt', body);
"

# 本文をブラウザ側グローバル window.__nb にチャンク分割注入してから paste 発火。
# 【重要】本文全文を 1 回の eval で渡すと、本文が大きい記事 (おおむね 5KB 超) で
# browser-use daemon のペイロード上限に達しタイムアウトする (2026-05-20 #00 試験公開で発生)。
# eval 1 回あたり encodeURIComponent 後で 4KB 以内に収める。日本語は 1 文字が encode 後
# 約 9 バイトになるため、ソース 1 チャンク = 約 400 字 が安全な目安。
browser-use --headed --profile "Profile 5" eval "window.__nb='';'init'"

BODYLEN=$(node -e "process.stdout.write(String([...require('fs').readFileSync('/tmp/note-body-<slug>.txt','utf8')].length))")
OFFSET=0
while [ "$OFFSET" -lt "$BODYLEN" ]; do
  # encodeURIComponent は `'` を変換しないため、eval の JS 文字列リテラルが破断する。
  # `'` を %27 に明示置換する（decodeURIComponent が復元する）。
  CHUNK=$(node -e "const b=[...require('fs').readFileSync('/tmp/note-body-<slug>.txt','utf8')]; process.stdout.write(encodeURIComponent(b.slice($OFFSET,$OFFSET+400).join('')).replace(/'/g,'%27'))")
  browser-use --headed --profile "Profile 5" eval "window.__nb+=decodeURIComponent('$CHUNK');String(window.__nb.length)"
  OFFSET=$((OFFSET + 400))
done

# 全チャンク注入後、小さい eval で ClipboardEvent paste を発火
browser-use --headed --profile "Profile 5" eval "
  const editor = document.querySelector('[contenteditable=true]');
  if (editor) {
    editor.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', window.__nb);
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    const n = window.__nb.length;
    delete window.__nb;
    'pasted ' + n + ' chars';
  } else { 'editor not found'; }
"
sleep 3
```

### 4-3. URL カード化（手動仕上げ）

一括 paste では URL は plain text のまま。OGP カードに変換するには以下のいずれか:

**人間が手動で**（推奨）: エディタ上で各 URL 行をクリック → 行末で Enter → 4 秒待つ → カード化

**または別 Phase で自動化（未実装、TODO）**: paste 後に各 URL の text node を eval で発見 → Selection API でカーソルを行末に置く → Enter キーを dispatch して note の URL→card 変換をトリガする実装を将来追加する余地あり。

---

**重要:**
- 必ず ClipboardEvent paste を使う（type は markdown 変換が効かない）
- 連続 paste は不可 → 全本文を 1 つの string に連結し、1 回だけ paste 発火する
- 本文は window.__nb にチャンク分割注入する（eval 1 回 ≤ 4KB）。一括 eval は大きい本文でタイムアウトする
- URL カード化は paste 後の手動 / 別 Phase の責務

## Phase 4.5: 目次ブロック挿入（H2 が 3 つ以上のとき実行）

note には**見出し（H2/H3）からクリックジャンプ可能な「目次」を自動生成するネイティブブロック**がある。**もくじ/総合案内/長文記事**ではこれを**最初の h2 の直前**に挿入する（短い単一セクション記事ではスキップ可）。

> ⚠️ **body 先頭に入れてはいけない**（2026-07-04 是正）。`selectNodeContents(ed); collapse(true)` で本文先頭に置くと、note の ProseMirror では導入段落（例「こんな人のための記事です」）の**途中**に割り込み、「見出し→目次→本文リスト」と導入が分断される（二次学科記述 9 記事で発生）。**最初の h2 に caret を置き（`ed.querySelector('h2')` に range→collapse）→ Enter→ArrowUp で h2 直前に空段落を作る**。不変条件は `導入 < 目次(table-of-contents) < 最初のh2`。

> ⚠️ **markdown の `[text](#anchor)` リンクは note では機能しない**。見出しジャンプは必ずこのネイティブ目次ブロック（`<button id=toc-setting>`）で行う。Phase 0 で本文の `(#...)` アンカーは素テキスト化しておくこと。

```bash
# 本文 paste 完了後に実行。BODY_IDX は contenteditable の index
browser-use --headed --profile "$NOTE_PROFILE" state 2>&1 > /tmp/note-state.txt
BODY_IDX=$(grep -oE '\[[0-9]+\]<div contenteditable=true role=textbox' /tmp/note-state.txt | grep -oE '[0-9]+' | head -1)

# 1) 最初の h2 の直前に空段落を作り、その行へカーソルを移す（body 先頭は導入を分断するため不可）
browser-use --headed --profile "$NOTE_PROFILE" click "$BODY_IDX"
browser-use --headed --profile "$NOTE_PROFILE" eval "
  var ed=document.querySelector('[contenteditable=true]'); ed.focus();
  var h=ed.querySelector('h2');
  var r=document.createRange(); r.selectNodeContents(h); r.collapse(true);
  var s=window.getSelection(); s.removeAllRanges(); s.addRange(r); String('caret-first-h2');
"
browser-use --headed --profile "$NOTE_PROFILE" keys Enter
browser-use --headed --profile "$NOTE_PROFILE" keys ArrowUp
sleep 1

# 2) 空行左の「+」メニューを開く → 目次ボタン（id=toc-setting）をクリック
browser-use --headed --profile "$NOTE_PROFILE" state 2>&1 > /tmp/note-state.txt
MENU_IDX=$(grep -oE '\[[0-9]+\]<button aria-label=メニューを開く' /tmp/note-state.txt | grep -oE '[0-9]+' | head -1)
browser-use --headed --profile "$NOTE_PROFILE" click "$MENU_IDX"
sleep 2
browser-use --headed --profile "$NOTE_PROFILE" state 2>&1 > /tmp/note-state.txt
TOC_IDX=$(grep -oE '\[[0-9]+\]<button id=toc-setting' /tmp/note-state.txt | grep -oE '[0-9]+' | head -1)
browser-use --headed --profile "$NOTE_PROFILE" click "$TOC_IDX"
sleep 2

# 3) 実体検証は screenshot で行う（querySelector ベースの eval は note の目次 markup と一致せず当てにならない）
browser-use --headed --profile "$NOTE_PROFILE" screenshot /tmp/note-toc-check.png
```

**実機で確認した落とし穴（2026-06-16 / 2026-07-04 更新）**:
- **挿入位置は「最初の h2 直前」**（2026-07-04）。body 先頭に入れると導入段落を分断する（上の ⚠️ 参照）。`h2 に caret → Enter → ArrowUp` で h2 直前に空行を作ってから `+` メニューを開く。
- **空段落の確立が肝**。空行が無い／別行を掴むと挿入が無音で失敗する。**失敗したら編集画面を再読込してクリーンな状態でやり直す**と通る。`+` メニューは caret に**最も近い**ものを座標クリックで掴む（`.first()` は最上部を掴み位置ずれする）
- **再発防止＝自己検証＋自動再挿入＋サマリ計上**（2026-07-04）。`note-update-body`/`note-publish` は挿入後に `目次ノード < 最初のh2`（`table-of-contents`/`[data-name=index]` の document order）を DOM で自己検証し、**後ろにあれば誤配置分を除去して h2 直前へ 1 回だけ入れ直す**。再挿入しても直らない場合、note-update-body は末尾サマリに `目次位置NG` として列挙し **exit 1**（WARN ログ埋没による再発を防ぐ＝バッチでも見逃せない）、note-publish は最終行に手動移動を促すエラーを出す。`document.querySelector('[data-name=index] …')` は編集画面の目次 markup と一致せず偽陰性になりやすいので screenshot(`.tmp/nu-toc-*.png`/`.tmp/np-toc.png`) も併用。公開後は API body で `pos(<table-of-contents) < pos(<h2)` を実査できる
- **目次はソース markdown には保存されない**（note が見出しから自動生成する要素）。`--update` で本文を丸ごと貼り直すと目次は消えるので Phase 4.5 を再実行する
- 左サイドバーの「目次」パネルはエディタの見出しナビ（常時表示）であり、**本文に挿入される目次ブロックとは別物**。混同しない

## Phase 5: 挿絵の挿入

A シリーズ記事の標準画像配置（存在する画像のみ挿入）:

| 挿入先セクション | 画像ファイル |
|---|---|
| `【コロプレス地図】` | `choropleth-map-*.png` |
| `上位5：分析` | `chart-x-*.png` |
| `下位5：分析` | `chart-x-*.png`（同じ画像） |
| `地域別の傾向` | `boxplot-*.png` |

**記事の上から順に挿入する。** 各画像について:

### 5-1. 目次からセクションにジャンプ

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
TOC_IDX=$(find_idx "aria-label=目次")
browser-use --headed --profile "Profile 5" click $TOC_IDX
sleep 1
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
SEC_IDX=$(find_idx "<セクション名の一部>")
browser-use --headed --profile "Profile 5" click $SEC_IDX
sleep 1
```

### 5-2. 見出し直後に空行を作成してメニューから画像挿入

```bash
# 見出し直後の段落にカーソルを置く
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
# 見出し直後の <p> をクリック
browser-use --headed --profile "Profile 5" click <段落のindex>
browser-use --headed --profile "Profile 5" keys Home
browser-use --headed --profile "Profile 5" keys Enter
browser-use --headed --profile "Profile 5" keys Up
sleep 1

# メニューを開く → 画像を選択
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
MENU_IDX=$(find_idx "aria-label=メニューを開く")
browser-use --headed --profile "Profile 5" click $MENU_IDX
sleep 1

browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
IMG_BTN_IDX=$(grep -B1 '画像' /tmp/note-state.txt | grep '<button' | head -1 | grep -oE '\[[0-9]+\]' | tr -d '[]')
browser-use --headed --profile "Profile 5" click $IMG_BTN_IDX
sleep 1

browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
IMG_FILE_IDX=$(find_idx "note-editor-image-upload-input")
browser-use --headed --profile "Profile 5" upload $IMG_FILE_IDX <画像ファイルの絶対パス>
sleep 3
```

**4箇所すべてについてこの手順を繰り返す。画像ファイルが存在しないセクションはスキップ。**

## Phase 6: 下書き保存

```bash
browser-use --headed --profile "Profile 5" state 2>&1 > /tmp/note-state.txt
DRAFT_IDX=$(find_idx "下書き保存")
browser-use --headed --profile "Profile 5" click $DRAFT_IDX
sleep 3
```

**予約日時 + 有料設定 が共に不要な場合は Phase 8 へスキップ。**
**有料設定または予約投稿が必要なら Phase 7 へ進む（[scheduling.md](./scheduling.md) を参照）。**

## Phase 8: 確認スクリーンショット

```bash
browser-use --headed --profile "Profile 5" screenshot /tmp/note-publish-<slug>.png
```

結果を報告（下書き保存 or 予約投稿、タイトル、タグ数、画像数、予約日時）。

## バッチ実行時: 次の記事へ

バッチの場合はブラウザを閉じずに Phase 1 に戻り、`browser-use --headed --profile "Profile 5" open "https://editor.note.com/new"` で新しいエディタを開く。

## 全記事完了後

```bash
browser-use --headed --profile "Profile 5" close
```
