> **doboku-note 版で読む前に**: 本ファイルは note.com エディタ操作の共通ノウハウ（stats47 由来）です。**アカウント=note.com/dobokunote、Chrome プロファイル、記事パス（docs/note/技術士総監/magazines/...）、frontmatter（notePricing/price）、有料境界、ハッシュタグ/カバー/PDF の doboku-note 固有差分は、先に publish-note/SKILL.md の「stats47 → doboku-note 差分マップ」を読むこと。** 本文中の Profile 5 / note.com/stats47 / docs/31_note記事原稿 / is_paid・price_jpy は stats47 の例であり、doboku-note では SKILL.md の対応に読み替える。

# 既存記事の更新（update モード）

すでに note に公開済みの記事を**更新**する手順。
新規作成（`editor.note.com/new`）ではなく、既存記事の編集画面を開いて差分を反映し「更新」する。

> [!danger]
> **ClipboardEvent paste は既存記事編集画面（`editor.note.com/notes/<id>/edit`）では機能しない（2026-06-16 実証）。**
> `/new` では 1 回だけ成功する paste が、edit 画面では `result: None` で**無音失敗**する。
> したがって**「全消去 → 再 paste」方式（旧 Phase U-2 → U-4）は実際には動かない**。
> 旧版（2026-05-21）は「成功した」と記録していたが、再現せず。**全消去だけ成功して paste が空振りすると、空の本文で更新が確定し公開記事が消える**（2026-06-16 に L1 サイトマップで実際に発生→変更履歴から復旧）。
>
> **正しい更新手段（用途別）**:
> 1. **末尾 / 特定箇所への追記**（CTA カード・1 段落程度）→ **type 方式**。caret を末尾へ置き、`type`（文章）＋ `Enter`＋`type`（URL 単独行）＋`Enter`。**URL は type だと OGP カード化する**（synthetic paste 不可）。本文・図版は非破壊。`scripts/wire-note-funnel-cta.mjs` 由来の CTA 追記はこの方式。
> 2. **特定の段落・価格・節だけの部分置換**（既存テキストを別テキストへ差し替え）→ **type 方式（Selection 削除 + 再入力）**。TreeWalker で対象文字列を含むノードを特定 → `Range` で**その範囲だけ**を選択 → `Delete` → `type` で新テキスト。**全消去（select-all）は絶対にしない**＝対象 needle で範囲を限定する。詳細は **Phase U-B**。2026-06-19 に建設部門もくじ（intro 段落差し替え + 無料16本リンク化）と総監ロードマップ（③価格 ¥2,480→¥3,480・目的別ガイド節の全面置換）で実証。
> 3. **本文の全面差し替え**（大改稿・本文ほぼ全体）→ **編集画面では不可**。`/new` で作り直す（旧記事は変更履歴に残る）か、note の文字数が許せば 1 段落ずつ `type` で手直しする。**全消去→paste はしない**。
> 4. **誤って空更新してしまった場合の復旧** → エディタ右上「その他」→「変更履歴」→ 直前のフル版（文字数が正しい版）→「この版を復元」→「公開に進む」→「更新する」。
>
> **一回限りの `.tmp/*.mjs` を書く前に**: 末尾追記・free 内アンカー挿入は `note-append-cta.mjs`（既存・冪等・検証込み）で足りる。部分置換（手段2）は専用スクリプトが無いので一回限りスクリプトが正当だが、**必ず本 Phase U-B のテンプレに沿わせる**（Selection 限定・通知いいえ・API 実体検証）。MCP playwright ツール（`mcp__playwright__*`）は永続ログインプロファイルを引き継げないため note 編集には使わない＝Playwright スクリプト + `.local/playwright-note-profile` 経路が正。

価格変更・誤字修正・CTA 追記などの軽微保守に使う。**本文の大規模差し替えには使わない**（paste 不可のため）。

## 起動

```
/publish-note --update <slug>
```

`<slug>` は記事ディレクトリ名。複数指定はカンマ区切り（バッチ可）。

### Windows 自動化（browser-use 不要・末尾 CTA 追記専用）

会社PC（Windows）には browser-use が無いため、末尾への CTA カード追記は **`note-append-cta.mjs`**（Playwright・`note-publish.mjs` と同じ永続プロファイル）で決定論的に自動化する。追記のみ（caret 末尾 → type、全消去 paste なし）＝空更新事故が原理的に起きない。

```
npm run note-append-cta -- --note <noteId> --text "<文章>" --url <magazineUrl>            # 末尾追記・dry-run（既定・安全）
npm run note-append-cta -- --note <noteId> --text "<文章>" --url <magazineUrl> --commit   # 末尾追記・実更新（無料記事）
# 有料記事は free プレビュー内へアンカー挿入（末尾だと購入者しか見えないため）:
npm run note-append-cta -- --note <noteId> --after <既存カードkey or 文言> --text "…" --url <url> --boundary-h2 '予想問題|試験問題' --commit
```

オプション:
- `--after <needle>`: needle（URLキー/文言）を含むブロックの直後に挿入（free プレビュー内へ）。省略時は本文末尾。
- `--boundary-h2 <regex>`: 有料記事の境界基準 H2（既定 `試験問題|予想問題`、計算問題集等は `パターン`）。`公開に進む`→`有料エリア設定`→この H2 直前に境界を再設定し `boundaryBeforeExam` を検証してからのみ `更新する`（**paywall 非破壊**・検証 NG は保存せず中断）。
- `--force`: 冪等スキップ無効化（中断ドラフト残骸の上書き等・原則使わない）。

安全弁: account=dobokunote assert・既存本文 <200字 で中断・追記 URL 既存で skip（冪等）・dry-run 既定・更新後は API（price/can_read/remained_char_num + body+embedded）で paywall とカード反映を実体検証必須。2026-06-18 に総監無料18本＋R8予想有料6本（paywall全保持）のコアパックCTAライブ反映で実証。有料記事で「有料エリア設定」未検出/`boundaryBeforeExam=false` のときは保存せず中断する（収益保護）。

> [!important]
> **更新通知ダイアログは必ず「いいえ」**: 「更新する」直後に **「この記事が更新されたことを購入・購読したユーザーに通知しますか？ いいえ／はい」** ダイアログが出る。`note-append-cta` は Phase 6d で **必ず「いいえ」をクリック**する（一括更新でフォロワー/購入者に通知スパムを送らない）。保存自体は「更新する」時点で確定済みで、ダイアログ未操作だと通知は飛ばないが、明示的に「いいえ」を押すのが正。手動更新時も同じ（「はい」を押さない）。

## 対象の制約

- **公開済みの記事のみ**。`.claude/state/note-published.json` の `items` に
  該当 slug が無ければ「未公開のため更新不可」で中断する
- **当面は無料記事を主対象**とする。有料記事の更新は本文差し替え後に有料エリア境界
  （`ここから先は有料部分:`）の再設定が絡むため、Phase 7-Pricing と同じく半自動
  （境界設定は手動確認）。有料記事を更新する場合はこの点を必ずユーザーに告知する

## フロー

create モードとの差分のみ記す。共通手順は [editor-operations.md](editor-operations.md) を参照。

**追記モード（type 方式・推奨。本文・図版を非破壊で末尾に CTA 等を足す）**:

```
Phase 0        : 追記する文面（CTA テキスト＋URL）を用意
Phase 1        : ブラウザ起動 + アカウント照合ゲート（dobokunote か）
Phase U-1      : 既存記事の編集画面を開く（/new ではない）
Phase U-A1     : 冪等チェック — 本文に既に対象 URL/marker があればスキップ（再追記しない）
Phase U-A2     : caret を本文末尾へ（selectNodeContents → collapse(false)）
Phase U-A3     : Enter → type(文章) → Enter → type(URL 単独行) → Enter
                 ※ URL は type すると OGP カード化する（synthetic paste 不可）。sleep 4 で待つ
Phase U-A4     : 反映確認（innerHTML に URL/noteId が含まれるか eval）。無ければ FAIL 報告・更新しない
Phase U-6      : 「公開に進む」→「更新する」（2 段）。ハッシュタグ・価格は触らない
```

**全面差し替えは編集画面では不可**（paste が効かない）。`/new` で作り直す。**「全消去 → 再 paste」は禁止**（空更新事故の原因）。

> 旧フロー（Phase U-2 全消去 → U-4 paste → U-4.5 目次再挿入 → U-5 画像再挿入）は **paste が edit 画面で動かないため使えない**。冒頭の danger ブロックを参照。目次・本文画像も paste 前提だったため、これらを伴う全面更新は `/new` 作り直しでのみ可能。

### Phase U-1: 既存記事の編集画面を開く

公開 URL は `https://note.com/stats47/n/<noteId>`。`<noteId>` を取り出し、編集画面を開く。

```bash
# 例: noteId を URL から抽出
NOTE_URL="https://note.com/stats47/n/n455ec72c5d62"
NOTE_ID=$(basename "$NOTE_URL")   # → n455ec72c5d62
browser-use --headed --profile "Profile 5" open "https://editor.note.com/notes/$NOTE_ID/edit"
```

> ⚠️ 編集画面 URL の正確な形式は初回実行時に確認すること。`editor.note.com/notes/<id>/edit`
> で開けない場合は、記事ページ（`note.com/stats47/n/<id>`）を開いて「…」メニュー
> または編集ボタンから編集画面に入る。判明した正しい経路をこのファイルに追記する。

編集画面が開いたら、既存のタイトル・本文・画像がすでに入った状態になる。

### ⛔ 旧 Phase U-2（全消去）/ U-4（再 paste）は廃止

`document.execCommand('delete')` での全消去後に paste で入れ直す旧手順は、
**edit 画面で paste が効かないため空更新事故になる**（冒頭 danger 参照）。**実行しない。**
全面差し替えが必要なら `/new` で作り直す。

### Phase U-A: 末尾追記（type 方式・推奨）

```bash
NID="<noteId>"; URL="https://note.com/dobokunote/n/<送客先>"; SENT="<CTA 文章>"
browser-use --headed --profile "$NOTE_PROFILE" open "https://editor.note.com/notes/$NID/edit"; sleep 6

# U-A1 冪等チェック（既に追記済みならスキップ）
HAS=$(browser-use --headed --profile "$NOTE_PROFILE" eval "var ed=document.querySelector('[contenteditable=true]');String(ed?ed.innerHTML.includes('<送客先noteId>'):'noeditor')" | tail -1)
echo "$HAS" | grep -q true && { echo "SKIP already"; exit 0; }

# U-A2 caret を末尾へ
browser-use --headed --profile "$NOTE_PROFILE" eval "var ed=document.querySelector('[contenteditable=true]');ed.focus();var r=document.createRange();r.selectNodeContents(ed);r.collapse(false);var s=getSelection();s.removeAllRanges();s.addRange(r);'end'"

# U-A3 type で追記（URL は type だと OGP カード化）
browser-use --headed --profile "$NOTE_PROFILE" keys Enter
browser-use --headed --profile "$NOTE_PROFILE" type "$SENT"
browser-use --headed --profile "$NOTE_PROFILE" keys Enter
browser-use --headed --profile "$NOTE_PROFILE" type "$URL"
browser-use --headed --profile "$NOTE_PROFILE" keys Enter
sleep 4

# U-A4 反映確認（無ければ更新しない）
browser-use --headed --profile "$NOTE_PROFILE" eval "String(document.querySelector('[contenteditable=true]').innerHTML.includes('<送客先noteId>'))"
```

実証済みバッチスクリプトの形は本セッションの note 導線 L3 ライブ反映（19 + 3 記事）で確立。1 記事ごとに U-1〜U-6 を直列実行し、複数記事は外側ループで回す（並行不可＝browser-use 競合）。

### Phase U-B: 部分置換（type 方式・段落/価格/節だけを差し替え）

既存の特定テキスト（intro 段落・価格表記・1 セクション）を**別テキストへ差し替える**手段。paste は edit 画面で死んでいる（冒頭 danger）ので、**Selection で対象範囲を限定削除 → type で再入力**する。append（U-A）でも全面差し替え（/new）でもない中間ケース。2026-06-19 に Playwright スクリプト（`.local/playwright-note-profile` 経路）で実証。**専用 npm スクリプトは無い**ため一回限りスクリプトで実装するが、必ず以下の安全弁に沿わせる。

**鉄則**:
- **select-all しない**。対象 needle（差し替えたい文字列・節の先頭/末尾の固有文言）で `Range` を限定する。範囲を間違えると周辺本文を巻き込む。
- **冪等チェック**を先に：新テキストの固有フレーズが既に本文にあればスキップ（再実行で二重化しない）。
- **API 実体検証必須**：保存後 `https://note.com/api/v3/notes/<id>` の `data.body` に新テキストが入っているか確認。入っていなければ FAIL 報告（偽成功の罠）。

**1) 1 ノード内の語句置換（価格・短いフレーズ）** — needle を含むテキストノードの該当部分だけ選択:

```js
await page.evaluate(({ oldText }) => {
  const ed = document.querySelector('[contenteditable=true]');
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = w.nextNode())) {
    const i = node.nodeValue ? node.nodeValue.indexOf(oldText) : -1;
    if (i >= 0) {
      const r = document.createRange();
      r.setStart(node, i); r.setEnd(node, i + oldText.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      return true;
    }
  }
  return false;
}, { oldText: '¥2,480（6 本セット、単品比 17%OFF）' });
await page.keyboard.press('Delete');
await page.keyboard.type('¥3,480（6 テーマセット・各 ¥700、単品比 17%OFF）', { delay: 3 });
```

`page.evaluate` は**引数 1 個まで**（複数渡すならオブジェクトに包む。`(a,b)=>{}, a, b` は `Too many arguments` で落ちる）。

**2) 節まるごと置換（先頭 needle 〜 次節 needle の手前まで）** — start ノード/offset と end ノード/offset を別々に拾って 1 つの Range にする:

```js
await page.evaluate(({ startNeedle, endNeedle }) => {
  const ed = document.querySelector('[contenteditable=true]');
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, null);
  let sN=null,sO=0,eN=null,eO=0,node;
  while ((node = w.nextNode())) {
    if (!sN && node.nodeValue?.includes(startNeedle)) { sN=node; sO=node.nodeValue.indexOf(startNeedle); }
    if (node.nodeValue?.includes(endNeedle)) { eN=node; eO=node.nodeValue.indexOf(endNeedle); break; }
  }
  if (!sN || !eN) return false;
  const r = document.createRange(); r.setStart(sN,sO); r.setEnd(eN,eO);
  getSelection().removeAllRanges(); getSelection().addRange(r);
  return true;
}, { startNeedle: '読み手の状況別に', endNeedle: '関連メディア' });
await page.keyboard.press('Delete');
// 新内容を行ごとに type。空行は Enter、URL 行は type→Enter→sleep(3000) で OGP カード化
```

その後の保存は U-6（「公開に進む」→「更新する」）と同じ。**通知ダイアログは必ず「いいえ」**（U-6 上の important 参照）。

### Phase U-1.5: アイキャッチ差し替え（カバー更新時のみ）

カバー画像を更新する場合、本文編集の前にアイキャッチを差し替える。
editor-operations.md Phase 2 と同じ手順で既存アイキャッチを置き換える（画像はアップロード操作なので edit 画面でも機能する。paste 制約は本文テキストのみ）。

### Phase U-6: 「公開に進む」→「更新する」（2 段）

公開済み記事の編集画面でも、右上ボタンは create と同じ **「公開に進む」**。
それを押した次画面で **「更新する」**（create の「公開」とは別ラベル）をクリックする。
**1 段ではなく 2 段操作**。

### Phase U-R: 空更新事故からの復旧（変更履歴）

万一、空または壊れた本文で更新してしまったら、ソースから入れ直すより **note の変更履歴**が速くて確実:

1. エディタ右上「**その他**」（`aria-label=その他`）→「**変更履歴**」をクリック
2. 右ペインの版リストから**文字数が正しい直前の版**を選ぶ（破損版は文字数が極端に小さい）
3. 「**この版を復元**」→「公開に進む」→「更新する」

2026-06-16 に L1 サイトマップを空更新→ 19:29 版（2,871 字）復元で完全復旧した実績。

## 更新モードで「触らないもの」

- ハッシュタグ（既存のまま。再入力すると重複する恐れ）
- 販売価格（既存のまま。価格変更は note のペイウォール設定で行う別オペレーション）

**追記（type）またはカバー差し替え**が edit 画面でできる更新の範囲。**本文の全面差し替えはできない**（paste 不可）。

## 実機検証で判明した注意点

### 2026-06-16（最新・優先）

- **paste は edit 画面で動かない**。`/new` の初回 1 回のみ機能し、`notes/<id>/edit` では `result: None` で無音失敗する。clear+paste 方式は空更新事故になる（L1 サイトマップで実害→変更履歴復元）。**追記は type、全面差し替えは /new 作り直し、復旧は変更履歴**（冒頭 danger ＋ Phase U-A / U-R）。
- **type による URL は OGP カード化する**（Enter で確定後 4 秒待つ）。CTA カードの追記はこれで安定。
- **eval は最後に必ず文字列を返す**（`String(...)` で締める）。オブジェクト返しは `result: None` になり成否判定を誤る。
- 複数記事は**直列**で回す（browser-use daemon 共有のため並行不可）。

### 2026-05-21（旧・一部失効）

- 編集画面 URL `editor.note.com/notes/<id>/edit` は機能する（これは現在も正）。
- 「更新」は **「公開に進む」→「更新する」の 2 段**（現在も正）。
- ~~「本文全消去 → paste で update 成功」~~ → **2026-06-16 に再現せず失効**。当時成功したように見えたのは別要因（小さい本文／タイミング）の可能性。clear+paste は使わない。
