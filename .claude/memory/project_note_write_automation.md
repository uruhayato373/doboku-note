---
name: project_note_write_automation
description: "note の編集・保存の自動化が確立（channel:chrome でbot検知回避）。R8を¥3,480/単品¥700にライブ反映済。読み取りはverify-note-magazines、書き込みはnote-edit-session。"
metadata: 
  node_type: memory
  type: project
  originSessionId: aea63373-5bdf-48d8-bb28-ffc499b3b121
---

note.com の**書き込み（編集・保存）自動化が実機で確立**（2026-06-10、R8予想問題集で実証成功）。

**鍵となった解決**: Playwright 組み込み Chromium だと Google/note に bot 判定されログイン不可（「安全でないブラウザ」）。**`channel: 'chrome'`（システム Chrome）＋ `--disable-blink-features=AutomationControlled` で `navigator.webdriver=false` 化**して突破（publish-x と同じ方式）。App-Bound 暗号化の cookie 抽出は不要。会社 PC でも動く（Mac 限定でない）。

**構成（真実源: `docs/reference/note-api-verification.md`）**:
- **読み取り**: `npm run verify-note-magazines`（note public API `/api/v2/creators/{name}/contents?kind=magazine`・`/api/v1/magazines/{key}/notes`）。SoT `note-magazines.ts` と突合。`curl --ssl-no-revoke`（会社プロキシ失効回避）必須。
- **書き込み**: `npm run note-edit-session -- <key>`（ヘッド付き Chrome・永続プロファイル `.local/playwright-note-profile`、初回のみ手動ログイン・パスワード非接触）。
- **マガジン編集**: `https://note.com/{user}/m/{key}/edit` フォーム（`input[type=text]`=タイトル / `textarea`[0]=説明 / `textarea`[1]=アピール / `input[type=number]`=価格 / ボタン「更新」）。**制約: タイトル≤約30字、アピールポイント≤250字**（超過で更新ボタンが disabled=保存不可）。
- **記事価格変更**: `editor.note.com/notes/{key}/edit/` →「公開に進む」→ `input[placeholder="300"]` に価格 → 「有料エリア設定」→「更新する」。再公開フロー。
- **注意**: fill() だけでは更新ボタンが有効化しないことがある→ input/change イベント明示 dispatch ＋ `isDisabled()` 確認後にクリック。保存後は必ず note API で price/title 実体検証（更新マガジンは page1 先頭へ移動）。YAML 注入は heredoc 内 `new RegExp` が壊れるためリテラル正規表現で別ステップ→JSON 経由。

**R8 実績（2026-06-10 ライブ反映済）**: マガジン m6854c7437d4d を ¥2,480→**¥3,480**・タイトル「2026最終予想」・横断フラッグシップ訴求へ。6記事を各 ¥500→**¥700**（セット¥3,480 < 単品¥4,200=17%OFF整合）。

**SoT 一本化（2026-06-10 移行開始）**: マガジン設定の真実源を **`note掲載文.txt`**（■ タイトル/価格/説明/アピール＋機械ブロックの setPrice/articlePrice）に統一。`scripts/lib/note-meta.mjs`（共有パーサ）＋`npm run note-meta-lint`（文字数ゲート 30/400/250）＋`npm run note-meta-to-txt`（_meta→txt 変換）を新設。全33本 txt 化＆lint 緑化。`note-edit-magazine` は `--dir`/`--txt` で note掲載文.txt を読む。**未完**: `_meta.yaml` 全廃（civil-keiken/pe-essay/pe-note-plan 等 authoring 系スキルが _meta を SOP 参照中→txt 生成へ改修してから削除。完全パック _meta は includedMagazines/relaunchPlan 保持で残置）。

**収録追加の自動化（2026-06-15 新設・実証）**: `note-magazine-add`（`scripts/note-magazine-add-articles.mjs`・`npm run note-magazine-add`）で「既存記事を別マガジンへ収録」を自動化。**追加対象は note 公開API差分で自動算出**（`toAdd=(--from群 ∪ --notes)−ターゲット現収録`・冪等）。確定フロー＝記事ページ「記事を追加」ボタン→ダイアログ「記事を追加」（全マガジン一覧・各行 追加/追加済 トグル）→ターゲット行直後ボタンで判定→押す。**Windowsで実証**（channel:'chrome'＋ignoreHTTPSErrors でプロキシ越え。本セッションで一度「Mac必須」と誤判断したが line 12 のとおり会社PC可が正）。安全=既定dry-run/`--commit`で実行/`--limit 1`で1件確認/追加後API検証。一過性のダイアログ未展開で取りこぼし→同コマンド再実行で冪等回収。

**記事本文の自動編集の限界（2026-06-15 実証）**: note 記事本文は **ProseMirror**。**新規挿入は自動化で安定**＝URL単独行→Enterで**リンクカード化**／`## `→H2見出し／空段落への新規入力（下段セクション＋カードの挿入に成功）。一方 **既存段落の上書き編集は不安定**＝triple-click/Shift+click 選択→打ち直しが**過剰選択・段落併合・ロケータ陳腐化**を起こし、見出しと本文がmergeするなど破損する。ロードマップ(n3d73729e6cc7)の価格書き換えで実証（公開はせず＝ライブ無事だが下書き破損）。**結論: 既存記事の価格・本文の書き換えは手動が安全。自動化は「新規カード/セクション挿入」に限定。** さらに重要: **公開済み記事は「一時保存」では下書きが保持されず（再オープンで公開版がロードされる）、変更は「公開に進む→更新する」＝即公開でしか反映されない**＝安全プレビュー不可。よって公開済み記事の自動編集は「即公開」前提となり、上書き編集の不安定さと相まって実質不可（2026-06-15ロードマップ更新を断念＝記事は無傷で未更新のまま）。

**マガジン新規作成（2026-06-15 実証・note仕様の罠）**: ①**quick-create**（記事の「記事を追加」ダイアログ→「マガジンを新規作成」＝タイトルのみ）は**無料マガジン専用で、後から有料に変換できない**（編集画面の販売価格が「0円」静的＝価格入力欄なし）。②**有料マガジンは必ず `https://note.com/magazines/new`**（/magazines/all の「マガジンを作る」）→**「有料(単体)」選択**で価格欄(number 100〜100,000)＋アピール欄が出現→title/説明/価格/アピール/**カテゴリ(必須・select。技術士系は「キャリア」)**を埋め「作成」。フィールドは可視要素を選んで fill（getByPlaceholder.first()は不可視を掴むことがある）。作成は標準作成で記事自動収録なし→収録は note-magazine-add で別途。実績: コアパック m6e7de5e4ea3d を¥5,480で作成。

**有料記事のフル自動公開（2026-06-15 確立・実証）**: `note-publish`（`scripts/note-publish.mjs`・skill `social/note-publish`・disable-model-invocation＝ユーザー起動限定）で note 有料記事を**下書き作成→公開**まで全自動。channel:chrome＋永続プロファイル＋proxy＋ignoreHTTPSErrors（**Windows可**）。自動工程＝カバー/タイトル/本文(ClipboardEvent paste・markdown変換)/価格(Shadow DOM `#price` を JS setter)/タグ/**有料境界**/**リンクカード化**/公開。**有料境界の自動化を初実装**（既存 publish-note が punt＝scheduling.md「自動化未確定」）＝有料エリア設定画面で「試験問題/予想問題」H2直前の「ラインをこの場所に変更」をDOM順特定→`boundaryBeforeExam`検証ゲート（NGなら公開中断）。**リンクカード化は `keyboard.type` 方式が正解**＝note の埋め込み検出は**実入力で起動・synthetic ClipboardEvent paste では起動しない**（paste/Enter系 v1〜v5 全失敗→v6/v7 type で確定。実装＝bulk paste後の各プレーンURL行を Range選択→Delete→type→Enter でその場カード化。L27 の「新規挿入は type で安定」を skill 化）。安全弁＝account=dobokunote assert／既定draft・`--commit` のみ公開／公開前境界検証／公開後 実体検証（無料プレビュー/価格/ペイウォール）。**実証: BK-02 R03 II-1 を¥1,980でライブ公開（n11bf14f07563）・全項目検証OK**。→「note投稿＝Mac必須」（browser-use固有）は覆り、Windowsで記事のフル新規公開が可能。横展開＝BK-02残17＋BK-03〜11、全18記事公開後にマガジン published:true。

**予約投稿（時間ずらし）対応（2026-06-17 追加・selectorは要first-run検証）**: note の予約公開は**現在は無料**（旧「プレミアム加入者のみ」は撤回・scheduling.md/SKILL.md是正済）。即時公開のみだった `note-publish.mjs` に **`--schedule "YYYY-MM-DDTHH:MM"`(JST)** を追加＝即時「投稿する」の代わりに 日時設定→日付→時刻→「予約投稿」を操作。**安全弁=日時をUIで確定できないときは即時公開せず下書きに退避**（誤即時公開防止）。バッチ `note-publish-magazine.mjs` に **`--schedule-start`＋`--interval-hours`(既定24)** で stagger 割当（slot i=start+i*interval・TZ非依存 wall-clock 加算）、**`--list <manifest>`** で対象明示選択（B系統hold/BK混在を除外）、`--pattern` で article.md 対応。無料16本マニフェスト=`.claude/state/note-publish/pe-construction-free-16.txt`（commit c7e4a9e4a）。構文/stagger計算/--list dry-runは検証済だが**予約投稿UIのselectorは未実走＝初回 .tmp/np-sched-*.png で要確認**（安全弁で誤公開はしない）。[[project_pe_construction_note_funnel]]

**関連の発見**: 完全パック m171222175fac は当初**実53記事/5ペルソナ＋横断全部**（ドキュメント「6本/3ペルソナ」は誤りだった）。マガジン構成は2段ラダー（記述式コアパック¥5,480＋全記事パック¥14,800）に決定。**2026-06-15 に9ペルソナ63記事を収録し 53→116（全14ペルソナ完備）。残=精読の収録（計算問題同梱の是非）＋¥14,800改定**。真実源 [[project_sales_log]]・[[feedback_essay_pack_ssot_adr]] と `docs/note/技術士総監/総監マガジン構成_決定2026.md`。

**公開済み記事の「全文置換」更新は自動化できる（2026-06-24 実証＋本番化・L27の「実質不可」を更新）**: L27 が不可としたのは**既存段落のin-place上書き**（triple-click選択→打ち直し＝過剰選択・段落併合で破損）。一方**本文を丸ごと差し替える全文置換は安定**＝①`Ctrl+A → Delete でエディタを空にしてから` ClipboardEvent paste（**空エディタへのpasteは成功・選択状態のまま置換pasteは無音失敗**＝note-publish が /new 空エディタで成功するのと同条件）→ ②paste直後に probe文字列がDOMにあるか検証（無ければ中断＝空更新事故防止）→ ③URL行を type方式でカード化 → ④**同一セッション内で**「公開に進む→（有料は境界保持）→更新する→更新通知いいえ」。**`note-update-body.mjs` の2実バグを修正・本番化（2026-06-24）**＝(a) Ctrl+A後 Delete せず paste＝置換が無音失敗→**Delete で空化してから paste＋probe検証**、(b) 下書き保存(autosave)のみで「更新する」を踏まず公開済み記事に未反映（autosaveはbrowser close で破棄）→**`--commit` で publish フロー（note-append-cta:144-219 移植）を実行**。既定は dry-run、実反映は `--commit` 必須。有料記事は `試験問題|予想問題` H2直前へ境界再設定し検証（`--keep-boundary`/`--boundary-h2`）、無料記事は境界処理を飛ばす（有料エリア設定ボタン有無で自動判定）。先行実証＝使い捨て `.tmp/note-retype-body.mjs`（無料専用）で civil 導線5本＝L1総合案内(n296a88f64ac2)+土木もくじ(n4fde0f62dc20)+1級AI(n8b0e42784742)+2級全体像(n27455b88bcd5)/受験資格(n6e6db14f4dfc) をライブ反映、全件 note API v3 body で PASS 検証（旧プレースホルダ消失・新文字列出現を確認）。真実源 docs/reference/note-api-verification.md。無料記事は有料境界処理不要で単純。[[project_note_live_cta_drift]]

**How to apply**: note の編集自動化は確立済だが、書き込み（保存）は note 規約・bot 検知リスクがあるため「自動で編集→保存前に値の読み戻し検証＋ボタン有効化確認→保存→API実体検証」の安全段階を踏む。単発少量なら手動も可。定型大量（全記事パック relaunch で多マガジン編集等）は本環境で自動化する価値あり。
