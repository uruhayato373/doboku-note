# note 公開状態の照合（note-magazines.ts ↔ note 現実）

note.com の公開マガジン一覧・各マガジンの収録記事を **public API から取得**し、`src/lib/note-magazines.ts`（SoT）と突合してズレを検出する運用手順。`npm run verify-note-magazines` の真実源。

## なぜ必要か（動機となった事故）

ドキュメントと note 現実が乖離していた。例: `essay-complete-pack`（完全パック ¥7,980）は M13・note-magazines.ts・決定文書すべてで「**6本（型＋設問3＋R8＋模範論文3ペルソナ）**」と記載されていたが、note 現実は **53 記事収録（5ペルソナ＋横断全部＋R8）**。SoT/ドキュメントが現実から大きくドリフトしており、戦略判断が誤った前提に乗っていた（2026-06-10 発覚）。SoT↔現実の照合を機械化し、再発を防ぐ。

## 環境の罠：会社 PC プロキシ + TLS 失効チェック

- 会社 PC は外部通信がプロキシ経由（`HTTP(S)_PROXY=http://…:3128`）。`google.com` 系のみ `NO_PROXY`。
- `curl` 既定（schannel）は **失効確認エラーで HTTP 000 失敗**（`CRYPT_E_NO_REVOCATION_CHECK`）。プロキシの TLS 介入が原因。
- **回避策: `curl --ssl-no-revoke`**。これで note.com は HTTP 200 で到達できる（プロキシ自体は note.com を遮断していない）。
- 注意: これは「ローカルで計測 API を叩く」ことの禁止（[measurement-incidents.md](measurement-incidents.md)）とは別。note の**公開**ページ/API を照合に読むだけで、認証も creds も不要。

## note 公開 API（認証不要）

| 用途 | エンドポイント |
|---|---|
| creator のマガジン一覧 | `https://note.com/api/v2/creators/{name}/contents?kind=magazine&page=N` |
| マガジンの収録記事 | `https://note.com/api/v1/magazines/{key}/notes?page=N` |

- `{name}` = `dobokunote`、`{key}` = `m...`（マガジン URL の末尾）。
- 一覧は `data.contents[]`（`key`/`id`/`name`/`price`）、`data.isLastPage` でページ送り終了。
- 収録記事は `data.notes[]`（`key`/`name`/`price`）。
- note は Nuxt 製のため HTML に `__NEXT_DATA__` は無い。HTML スクレイプより上記 JSON API が堅牢。

## 使い方

```bash
npm run verify-note-magazines              # 一覧取得 ＋ SoT 突合（note↔note-magazines.ts・高速）
npm run verify-note-magazines -- --vs-txt   # note掲載文.txt(SoT)↔note も突合（タイトル/価格/説明/文字数）
npm run verify-note-magazines -- --contents   # 各マガジンの収録記事も取得
npm run verify-note-magazines -- --json       # スナップショットを JSON 保存
```

- スクリプト: `scripts/verify-note-magazines.mjs`。内部で `curl --ssl-no-revoke` を spawn（プロキシ env を自動利用）。
- **`--vs-txt`**: 各 `note掲載文.txt`（マガジン設定 SoT）を note 公開状態と突合。**説明文の先頭一致でマガジンを同定**（タイトルがドリフトしても照合可）し、タイトル差/価格差/説明差/文字数超過を検出。`note掲載文.txt` を編集したら本モードでドリフトを確認 → `note-edit-magazine` で push、の運用。
- `--json` 出力先: `.claude/state/note/magazines-snapshot.json`（machine データ。コミット任意、毎回再生成可）。

### 検出するズレ

- **未配線**: note 公開済だが SoT に noteUrl 配線なし（新規公開の取り込み漏れ）
- **非公開化?**: SoT の noteUrl が note 一覧に無い（404/非公開化の疑い）
- **要修正**: SoT `published:true` だが noteUrl 空
- **価格ドリフト**: SoT 価格 ≠ note 価格（例: 値上げを SoT 先行・note 未反映）
- **空マガジン**: `--contents` で収録 0 件のマガジンが見える（公開したが記事未登録）

終了コード: ズレ無し=0 / 取得失敗=1 / ズレあり=2。

## Playwright フォールバック

`@playwright/test` 1.59.1 が導入済み。public API が壊れた場合や、ログインが要る情報（販売ダッシュボード等）を見る場合は Playwright を使う。ただし公開マガジン照合は API の方が安定・高速なので、通常は API を使う。Playwright を使う場合も `ignoreHTTPSErrors: true` ＋ プロキシ設定（`proxy: { server: process.env.HTTPS_PROXY }`）が必要。

**実証済（2026-06-10）**: 会社 PC の Chromium はプロキシ越しに note.com へ到達できる（Mac 限定ではない）。編集系 URL（`sitesettings/magazines` 等）も 200 で開くが、**ログイン無しはゲスト表示**（「会員登録 / ログイン」）になり編集 UI は出ない。＝編集画面の唯一の関門はログインセッション。

## 編集（書き込み）系: note-edit-session

ヘッド付き Chromium を**永続プロファイル**で起動し、編集画面まで開いて待機する半自動ランチャ。

```bash
npm run note-edit-session                    # マガジン設定一覧を開く
npm run note-edit-session -- <note の URL>     # 指定ページを開く
npm run note-edit-session -- m6854c7437d4d     # マガジン key だけでも可
```

- スクリプト: `scripts/note-edit-session.mjs`。**ユーザー自身のターミナルで実行**（ヘッド付きブラウザを表示・操作するため）。
- **`channel: 'chrome'`（システム Chrome）必須**。publish-x と同じ方式。組み込み Chromium だと Google/note に bot 判定されてログインが「安全でないブラウザ」で弾かれる。システム Chrome ＋ `--disable-blink-features=AutomationControlled` で `navigator.webdriver=false` になり検知回避（2026-06-10 実証）。**App-Bound 暗号化の cookie 抽出は不要**（実 Chrome が自分の cookie を使うだけ）。
- **初回のみ画面で手動ログイン**（パスワードはスクリプトが扱わない）。セッションは `.local/playwright-note-profile/`（**gitignore 済**・cookie を含むため git に入れない）に永続化され、次回からは自動でログイン済み。
- **編集・保存は人手**で行う（自動保存はしない）。理由: note 規約・bot 検知・収益アカウントのリスク回避。「自動で編集画面まで開く＋最終入力/保存は人」の半自動が安全境界。
- 自動化が割に合うのは「定型・大量・反復」の書き込み時のみ。単発のタイトル/価格修正は普通に手動編集が最速。

### マガジン編集フォームの自動操作（2026-06-10 実証済・R8で成功）

- **編集 URL**: `https://note.com/{user}/m/{key}/edit`（マガジン本体ページの「設定」リンク）。`/sitesettings/magazines` はユーザー名扱いで誤動作するので使わない。
- **フィールド**: `input[type=text]`=マガジンタイトル ／ `textarea`[0]=説明 ／ `textarea`[1]=アピールポイント ／ `input[type=number]`=販売価格 ／ ボタン「更新」=保存。
- **文字数制約（超過すると「更新」が disabled のまま＝保存不可）**: マガジンタイトル ≈ 30 字以内（旧 29 字 OK）、**アピールポイント 250 字以内**（エラー文「文字数は250文字以内にしてください」）、説明は長文可（373 字で OK）。
- **React 制御入力の注意**: `fill()` だけでは「更新」が有効化しないことがある。各欄に `input`/`change` イベントを明示 dispatch ＋ 実キーストロークのナッジ。**クリック前に `更新` ボタンの `isDisabled()` を確認**し、有効化を待ってから押す。値は `inputValue()` で読み戻し照合してから保存。
- **保存後検証**: note API（`creators/.../contents?kind=magazine`）で `name`/`price` を実体確認。更新したマガジンは page1 先頭へ移動する（updatedAt 順）。
- **YAML 値の注入**: heredoc 内の `new RegExp()` はエスケープが壊れる。block scalar 抽出は**リテラル正規表現**で別 node ステップ化し、値を JSON に書き出してから Playwright スクリプトへ渡す。

### 記事をマガジンへ収録（追加）: note-magazine-add（2026-06-15 新設・Windows実証）

既存の note 記事を別マガジンへ「収録」する。`note-edit-magazine`（設定/価格）とは別操作。`npm run note-magazine-add -- --target <key> --from <srcKey1,srcKey2> [--plan-only] [--probe] [--commit]`。

- **追加対象は note 公開 API の差分で自動算出**（`toAdd =（--from 群の収録 ∪ --notes）− ターゲット現収録`・手動列挙なし・冪等）。
- **確定フロー（実機）**: 記事ページ `note.com/{user}/n/{noteKey}` の「**記事を追加**」ボタン → ダイアログ「記事を追加」（自分の全マガジン一覧・各行に **追加/追加済** トグル）→ ターゲットマガジン名の行の直後ボタンで判定 →「追加」なら押す。
- **既定 dry-run**（`--commit` で実追加）／`--probe` で実DOMダンプ／追加後 note API で収録実体検証。一過性のダイアログ未展開での取りこぼしは**同コマンド再実行で冪等回収**。
- 実績（2026-06-15）: 完全パックへ9ペルソナ63＋精読6（53→122）、コアパックへコア24を収録。

### 有料マガジンの新規作成（2026-06-15 実証・note仕様の罠）

- **quick-create は無料専用**: 記事の「記事を追加」ダイアログ →「マガジンを新規作成」はタイトルのみ＝**無料マガジン**。**後から有料に変換できない**（編集画面の販売価格が「0円」静的＝価格入力欄なし）。
- **有料マガジンは `note.com/magazines/new`**（`/magazines/all` の「マガジンを作る」）→ **「有料(単体)」を選択**で価格欄（number 100〜100,000）＋アピール欄が出現 → タイトル／説明／販売価格／アピール／**カテゴリ（必須・select。技術士系は「キャリア」）**→「作成」。
- フィールドは**可視要素を選んで fill**（`getByPlaceholder().first()` は不可視を掴むことがある）。標準作成は記事を自動収録しない → 収録は note-magazine-add で別途。実績: コアパック `m6e7de5e4ea3d` を ¥5,480 で作成。

### 記事「本文」の自動編集の限界（ProseMirror・2026-06-15 実証）

note 記事本文は **ProseMirror**。書き込み自動化の可否が操作で分かれる:

- **○ 新規挿入は安定**: URL を**単独行で入力→Enter**で**リンクカード（figure 埋め込み）化**／`## `→H2見出し／空段落への新規セクション入力。ロードマップ記事へ14ペルソナのカード追加・下段セクション挿入で実証。
- **△ 箇条書き（`- `）は typing で自動変換されない**（テキストのまま）。
- **✗ 既存段落の上書きは不安定**: triple-click / Shift+click 選択→打ち直しが**過剰選択・段落併合・ロケータ陳腐化**で破損（見出しと本文が結合する等）。**既存価格・本文の書き換えは手動が安全**。
- **公開済み記事は「一時保存」で下書きが保持されない**（再オープンで公開版ロード＝autosave は browser close で破棄）。変更は**「公開に進む→更新する」＝即公開**でしか反映されない＝**安全プレビュー不可**。自動編集は検証ゲートを挟み NG なら公開しない運用。
- **結論の更新（2026-06-24）**: **既存テキストの「全文置換」は自動化可能**（下記 `note-update-body` ＝空エディタ paste＋probe 検証＋publish フロー）。段落単位の部分上書きは依然不安定なので、本文を触るときは「全文を貼り直す」を既定とする。新規カード/セクション挿入は引き続き安定。

### 本文一括差し替え＋ライブ反映: `note-update-body`（2026-06-23 新設 / 2026-06-24 本番化）

上記「結論」の例外として、**ソースファイル（article.md）全体を貼り直す**方式で、既公開記事の本文を差し替えてライブ反映するスクリプト。部分選択の段落破損を回避できる。

```bash
node scripts/note-update-body.mjs --article <article.md>            # dry-run（既定・安全）
node scripts/note-update-body.mjs --article <article.md> --commit   # 実ライブ反映
node scripts/note-update-body.mjs --list   <list.txt>   --commit    # 複数記事を一括反映
# npm 経由: npm run note-update-body -- --article <path> [--commit]
```

- `noteId` を frontmatter から取得し `editor.note.com/notes/{noteId}/edit` へ直接遷移
- **本文置換 = 全選択(Meta+A on macOS / Ctrl+A on Windows) → Delete で空に → ClipboardEvent paste**。全選択した「選択状態」のまま synthetic paste しても **ProseMirror は置換しない**（無音失敗・「pasted」とログだけ出て中身が変わらない）。**一度 Delete で空にしてから paste** すると成功する＝`note-publish.mjs` の `/new` 空エディタ paste と同条件（2026-06-24 バグ修正）。**macOS では Ctrl+A が行頭移動（emacs binding）で全選択にならず空化に失敗→本文が二重化する**ため `Meta+A` 必須（2026-07-02 是正・`process.platform === 'darwin'` で自動分岐）
- **paste 直後に probe 文字列が `contenteditable.innerText` に入ったか必ず検証**。無ければ保存せず中断（無音失敗による空更新事故を防止）。probe は `--probe "<文字列>"` で明示、省略時は本文の素の散文行から自動導出（`--list` 時は各記事ごと自動）
- **ライブ反映は `--commit` 必須**（既定は dry-run でスクショのみ）。**「下書き保存」だけでは公開済み記事に一切反映されない**（autosave 下書きは browser close で破棄→再オープンで公開版ロード）。`--commit` で **公開に進む →（有料記事なら有料境界保持）→ 更新する → 更新通知は必ず「いいえ」**まで実行（`note-append-cta.mjs:144-219` を移植）
- **有料記事**: 全文置換で paywall 境界が消えるため、`試験問題|予想問題` H2 直前へ境界を再設定し検証（NG なら保存せず中断＝paywall 保護）。試験 H2 が無い有料記事は `--keep-boundary`、別パターンは `--boundary-h2 "<regex>"`。**無料記事は境界処理を飛ばす**（有料エリア設定ボタンの有無で自動判定）
- URL 行のリンクカード化（type→Enter・共有実装 `scripts/lib/note-cardify.mjs`）まで自動。**URL 見出し残存時は保存せず中断（[4b] ABORT）・ライブ反映後は API で URL 見出しを自動検証（[5e]）**＝詳細は下記「live 見出しURL検査」節。カバー画像・タグは変更しない（タイトルは frontmatter `title` があれば差し替え）。BOM 付きファイル対応済み
- **4.5 目次再挿入**（2026-07-02 / 2026-07-04 更新）: 全文置換で note ネイティブ目次が消えるため、H2 見出しが 3 つ以上の記事は**最初の h2 の直前**に目次ブロック（`#toc-setting`）を自動で再挿入する（`--no-toc` で抑止）。**body 先頭に入れると導入段落を分断する**ため h2 直前にする。挿入後に `目次 < 最初のh2` を DOM 自己チェックし、**不一致なら誤配置分を除去して 1 回再挿入**。再挿入しても直らなければ末尾サマリに `目次位置NG` として計上し **exit 1**（バッチでも見逃せない）。`.tmp/nu-toc-*.png` スクショ併用、公開後は API body で `pos(<table-of-contents) < pos(<h2)` を実査。~~無料記事のライブ更新は publishLive の「更新する」ボタン検出が未対応~~（**2026-07-14 実測で解消確認**: 無料記事の `--commit` は「更新する」まで自動完走する。当日 10 本以上のライブ反映＋API 実査で確認済み）
- 検証: 反映後に `curl --ssl-no-revoke https://note.com/api/v3/notes/{noteId}` の `data.body` で新文字列の出現・旧文字列の消失を実体確認
- 実証: 2026-06-24 1級・2級土木 導線 5 記事をライブ反映し note API で全件 in-sync 確認（旧 `.tmp/note-retype-body.mjs` ＝無料専用の使い捨て版で先行実証）
- 実行はローカル（note ログイン済みプロファイルのある Windows/Mac）限定。会社 PC で可（`channel:'chrome'`）
- **`--boundary-h2` の型別上書き**: 既定 `試験問題|予想問題`。他コンテンツ型は上書きする（例: 二次学科記述の有料境界は `出る順①`／1級施工計画・環境のみ `施工計画・出る順①`）。`note-attach-file.mjs` も同様に `--boundary-regex` で境界見出しを上書きできる（2026-07-04 新設）

### 記事の削除: note-delete-note（2026-07-04 実機確定）
- **公開済み記事はエディタからは削除できない**。`editor.note.com/notes/{key}/edit` の右上「・・・」メニューは**「変更履歴」のみ**で削除項目がない（下書きでも編集画面のブロック用「削除」ボタンが紛れて誤操作しやすい）。
- **削除は記事管理ダッシュボード `note.com/notes` から**: 対象記事カードの操作メニュー（・・・）→「削除」→ 確認ダイアログ「削除する」。マガジン収録も自動で外れる。
- ツール: `node scripts/note-delete-note.mjs --note <key>`（既定 PROBE）／`--commit`（実削除・account gate＋API消滅検証つき）。
- **note リッチエディタは既存ブロックの移動・削除に強く抵抗**する（プログラム的 marker を剥がす・画像ブロックの scripted 削除が無反応）。**構成変更は「旧note破棄→新規公開で理想順に組む」が確実**（見出し直前への挿入＝native h2 に range→Enter→ArrowUp→座標で+menu は堅牢）。

### PDF 生成の環境依存（2026-07-04 訂正）
- **Mac でハングするのは `magazine-to-pdf.mjs` の Chrome `--print-to-pdf` 経路だけ**。**Playwright `chromium.launch({headless:true})` → `page.pdf()` は Mac で正常動作**する（実例 `scripts/generate-anki-pdf.mjs`＝A5赤シートPDF・`--sample` で見本PNG）。カスタムHTML→PDF は magazine-to-pdf でなく `page.pdf()` を使う。

## live 本文整合性検査: check-note-live-headings（URL見出し/空引用/画像欠落の検知網）

note-publish / note-update-body には、SoT どおりに live が反映されない 3 系統の破損があった:

- **URL 見出し化**（2026-07-14・291 本中 7 本）— 旧リンクカード化で URL 単独行が h2 見出しに化けて note ネイティブ目次に URL 露出。原因は (1) Enter 後の embed 変換が非同期なのに盲目 4500ms 待ちのレース、(2) `Set` dedup による重複 URL 未処理、(3) 選択先ブロック種の無検査。共有実装 `scripts/lib/note-cardify.mjs` で根治（毎回 DOM 再クエリ・段落限定選択・カード生成の実測待ち）。
- **空引用**（2026-07-15・5 本）— 複数行 blockquote が paste で中身脱落し「空の引用」だけ残る。note-lint ルール 9（`>` 連続 2 行以上をブロック・`SKIP_NOTE_BQ=1` で回避）で予防し、修復は SoT を単一行 blockquote／平文へ書き換えて再貼付。
- **本文画像欠落**（2026-07-15・33 本）— paste 前処理が `![](img/xxx.png)` を除去していたため図が live に載らなかった。`scripts/lib/note-images.mjs` で、画像行を一意トークン `〔〔IMG:n〕〕` へ置換して paste→「＋」メニューで実画像アップロード（キャプション=alt）する方式に変更。トークン残存/挿入失敗は保存/公開せず中断。

3 層の防衛網:

1. **書き込みスクリプト内蔵ゲート**: `note-publish.mjs` / `note-update-body.mjs` はカード化後に URL 見出しを修復（`repairUrlHeadings`）・本文画像をアップロード（`insertImagesAtPlaceholders`）し、残存/失敗すれば**保存/公開せず中断**。公開/更新後は public API で本文を自動検証（`assertLiveBody`＝URL見出し/空引用/画像欠落の 3 検査）。ネットワーク未達は WARN（手動確認コマンド表示）。共有実装は `scripts/lib/note-live-check.mjs`。
2. **横断スイープ**: `npm run check-note-live-headings` — noteStatus=published 全記事（約 291 本）の live 本文を並列 8 で取得し、3 検査で不整合を列挙。BAD≥1 で exit 1。有料記事は API 本文が paywall で切断されるため画像期待値は「有料境界より前の枚数」、境界が SoT に無い有料は画像検査 skip（PARTIAL）。`--paths` で BAD の article.md パスのみ出力（修復 list 生成用）。
3. **lint 予防**（note-lint）: ルール 8＝無料記事の地の文 200 字以上段落（`SKIP_NOTE_PARA=1`）、ルール 9＝複数行 blockquote（`SKIP_NOTE_BQ=1`）。既存違反はバーンダウン（触った記事から漸次是正）。

```bash
npm run check-note-live-headings                          # 全 published を 3 検査でスイープ
node scripts/check-note-live-headings.mjs docs/note/共通  # パス絞り込み
node scripts/check-note-live-headings.mjs --paths         # BAD パスのみ（list 生成）
```

### 本文画像・PDF 添付の修復手順

- **無料記事の画像欠落**: `node scripts/note-update-body.mjs --article <path> --commit`。全文再貼付＋画像アップロードで一括反映。
- **有料 PDF 記事**（`paidBoundary` あり・paid 領域に PDF 添付カード）: 全文置換は PDF 添付カードを破壊するため **`--images-only`**（本文アンカー直後に画像だけ追加・境界/カード不変）を使う。空引用も直す必要がある場合のみ全文 `--commit`（`paidBoundary` で境界保持）→ 破壊された PDF は `note-attach-file.mjs --note <key> --file <pdf> --commit` で再添付。
- 画像挿入が一部失敗しても続行したいときは `--img-lenient`（既定は保存せず ABORT）。
- **メンバーシップ連携記事**（`price=0` だが `is_limited=true` の会員限定＝合格ラボの索引/はじめに/入口LP）: 公開設定が3段フロー（`公開に進む → 試し読みエリアを設定 → 更新する`）。`note-update-body.mjs` は `試し読みエリアを設定` を自動検出し、既定は**試し読みラインを動かさず更新**（完全会員限定＝無料プレビュー0の記事はこれで維持）。**入口LPの無料プレビューを復旧するときは `--trial-line-bottom`**（ラインを「末尾の1つ手前」に設置＝ほぼ全文を無料プレビュー化）。**罠: ラインを本文の絶対最後に置くと会員限定にする中身が0で無効化され note が全文ロック（bodyLen→0）に戻す**ため、末尾の1つ手前に置く。前後で公開API `body`（無料プレビュー量）を実査すること。

## 記事 frontmatter への公開URL backfill: backfill-note-article-meta

公開マガジンの収録記事 URL を、`docs/note/**/magazines/` 配下の各 `article.md` frontmatter（`noteUrl` / `noteId` / `notePublishedAt` / `price`）へ書き戻すツール。note 公開後に「ソース側へ URL を記録する」工程を自動化する（マガジン単位の `verify-note-magazines` に対し、こちらは**記事単位**）。

```bash
node scripts/backfill-note-article-meta.mjs            # dry-run（突合結果と埋める予定を一覧表示）
node scripts/backfill-note-article-meta.mjs -- --apply # 空フィールドのみ書き込み（既存値は不変）
```

- **突合**: note 公開 API（`magazines/{key}/notes`）の記事名を NFKC 正規化し、ソース `article.md` の H1 見出しと照合（exact → 失敗時は末尾括弧を除いた語幹一致 loose、語幹が一意なときのみ採用）。dry-run で note 実名を併記し誤マッチを目視検査できる。
- **冪等**: 既に `/n/` URL が入っている記事は触らない。新マガジン公開後に再実行すれば差分だけ充足（陳腐化を構造的に防ぐ）。
- **自然に未突合になるもの**: `published:false` の下書きマガジン（note 未公開）、①②等で語幹が衝突するペルソナ R8予想、1ソース÷note複数記事の構造差。dry-run の「未突合」に列挙される。
- 実績（2026-06-11）: マガジン収録 98 記事を backfill。

## 既知の状態（2026-06-11 時点）

- 公開マガジン 26 件（総監系19・建設部門2・1/2級土木5）。`verify-note-magazines` で **SoTズレ 0 件**（公開↔配線↔価格すべて一致）。
- **完全パック（m171222175fac）= 53 記事**（ドキュメント記載「6本」と乖離。決定文書 §1・§2・§4 の前提修正が必要）。
- 解消済みドリフト: R8予想問題集（m6854c7437d4d）= note も **¥3,480** に追従（旧 ¥2,480 ドリフト解消）。建設部門 道路 選択科目（m9e825cfd8348）= **24 記事**登録済（旧 0 件解消）。
- マガジン収録記事の frontmatter URL は `backfill-note-article-meta`（上節）で 98 記事 backfill 済。

**2026-06-15 更新**: 2段ラダー実装で公開マガジン **27 件**（コアパック新設 +1）。**完全パック（m171222175fac）= 122 記事 / ¥14,800**（全14ペルソナ＋精読＋型＋設問3＋R8。受験料¥20,500アンカー入り）。**コアパック（m6e7de5e4ea3d）= 24 記事 / ¥5,480**（型＋設問3＋R8）。設問3バンク= ¥2,980（旧¥2,480ドリフト解消）。`verify-note-magazines` で SoTズレ 0。
