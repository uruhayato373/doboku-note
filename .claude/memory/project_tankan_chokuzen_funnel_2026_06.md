---
name: tankan-chokuzen-funnel-2026-06
description: 総監 直前期funnel施策(2026-06-21)。新記事公開+R8予想問題集をlive surfaceで直前導線を立ち上げ。ソースとliveに既知のズレあり
metadata: 
  node_type: memory
  type: project
  originSessionId: e3572959-44ed-471f-8823-443dded6678b
---

2026-06-21、総監売上の本命パック失速（6月W3で¥54,600→¥6,980、完全パックは06-15で停止）への対応。X凍結中のため note ドメインパワーで直前導線（試験7/20）を立ち上げた。診断結論=時期/価格/動線故障ではなく「直前ヒーロー（R8予想問題集¥3,480/コアパック¥5,480）を前面化していない＋¥9,800完全パックを直前に値上げ」。

**live 反映済み（検証済）:**
- 新無料記事「直前総仕上げロードマップ」公開 = noteId **n97e01a94e650**（docs/note/技術士総監/直前総仕上げロードマップ/）
- 総監もくじ（n3ed4c77ceed6）冒頭に新記事カードを live 挿入
- 上位リード磁石5本に R8予想問題集カード(m6854c7437d4d)を `--before-first-h2` で live append: 白書R7(n60efbccd728b)/4フェーズ(n6f9854578518)/出題傾向(nc360aaa381b0)/択一17年分(n3bcb87efddad)。トレードオフ思考(n1b325d339f59)は既存ゆえskip

**2026-07-05 ファネル監査＋D5反映完了（tankan）**: `audit-note-funnel --live` の tankan D5 5本（キーワード集2026変更点n3923cbfb651b/キーワード集が点にならない理由n14c71f3b4d72/立場別模範論文の選び方na030d9cb3060/自治体技術職員の択一盲点nb2acfecc2df7/計算問題パターン集ne190c3ef2fca）を **note-append-cta --commit で全反映＝tankan D5=0達成**（R8予想問題集m6854c7437d4dカードを--before-first-h2挿入、計算問題は有料ゆえ--keep-boundary、各API実査で反映true確認）。**pe-construction D5=0**。config topCtaから¥削除＋cta:pack-topインラインをnote-lint例外化（commit bd1165540）→ [[reference-note-funnel-cta-lint-conflict]]。**D5判定=audit-note-funnel.mjs:127がtopTargets[0]（=topCta先頭URL＝R8予想m6854c7437d4d）のlive有無で判定**。挿入は「プレーン文type＋bare URL type→OGPカード化」（markdownリンクは非対応）。

**civilも全反映完了（ユーザー指示「全て反映」）**: civil D5 22本を note-append-cta --commit で全反映（civil topCta先頭URL＝完全攻略パックm8290970a7f05を--before-first-h2挿入、全記事無料）。**全D5=0達成（総監5＋civil22＝計27本）**。civilソースD1/D2も是正（commit 1d6cc6038）: D1の2本「経験記述を自分の現場に置換」は**先頭UTF-8 BOMでwireが`^---`非マッチ→NO-FMスキップ**だったのでBOM除去→wire配線。D2は土木もくじへ5誌（完全攻略パック/1級2級学科記述/2級想定工事バンク/1級まるごとパック）追加。**ソース監査D1-D4全資格ゼロ**。civil記事に既存bare-urlサイトリンク（SKIP_NOTE_UTM=1で回避）＝別課題のバーンダウン対象。3コミット未push。

**ライブ土木もくじへのD2 5誌も反映完了（＝全反映100%）**: 「mid-doc inline編集はtype不可」は**部分的に誤り**だった。編集画面(`notes/<id>/edit`)で **`document.execCommand('insertHTML', false, '<a href>title</a>')` または `li.insertAdjacentHTML('afterend', '<li><p><a href>…</a> 説明</p></li>')` ＋ `ed.dispatchEvent(new InputEvent('input',{bubbles:true}))`** で**インラインリンク(li)を生成でき、ProseMirrorが取り込んで「更新する」で保存に残る**（API実査で5誌inline<a>・h3健全を確認）。**Why**: pasteは編集画面で無音失敗するが、execCommand/直接DOM変異はMutationObserver/inputハンドラ経由でPMモデルに同期される（type→URLカード化とは別経路でinlineリンクが作れる）。**How to apply**: 既存記事のリスト中間へリンク項目追加は「セクションのul末尾liへinsertAdjacentHTMLで兄弟li挿入」が最も安定（execCommandのul全体置換はProseMirror再正規化でh3巻き込み崩れが出た）。必ずdry-run(未保存)でDOM検証(anchor＋inLi)＋スクショ→--commit→API実査。**専用ツール化済=`npm run note-append-list-links -- --spec <json> [--commit]`（scripts/note-append-list-links.mjs・spec JSON駆動）**。SSOT反映済: update-mode.md手段2b・audit-note-funnel SKILL D2ライブ反映・note-funnel-architectureツール表。併せてwire-note-funnel-ctaのBOM無音スキップ修正・§14-c/linterのcta:pack-top例外化も同時整備。

**既知のソース↔liveズレ（次セッション注意）:**
- `note-funnel.json` の総監topCtaを「R8予想問題集→コアパック」に変更しソースへ反映・push済み。だが**公開済み記事のインラインリンク差し替えはtypeで再現不可**（[[1-2-pdf]]系のupdate-mode制約）。完全な反映は次回正式republish時。
- もくじソースは4リンクの【直前期の総仕上げ】節を持つが、live は新記事カード1枚のみ反映
- **孤児下書き n107ab7c2bbca**（公開版n97e01a94e650と重複・非公開）未削除＝note下書き一覧から手動削除推奨

**運用の学び:** note-append-cta(Playwright,.local/playwright-note-profile)は連続起動でブラウザ起動が競合・ハングする→1本ずつ順次・各実行でAPI実査(/api/v3/notes/<id>のbodyにurlKey有無)。新規公開はnote-publish.mjs --article（既定draft/--commit公開・dobokunoteアカウントゲート付）。frontmatterにnoteUrl空欄を用意しないと公開後の自動反映が効かない（手動追記要）。

**2026-06-21 横断系単品¥780統一（commit afc8ae51a・develop push済）:** 総監の単品note=129本（ペルソナ模範論文98+横断31）。売上分析で「単品で売れるのは横断系（R8予想/設問3/計算/トレードオフ）だけ・ペルソナ98本は同ペルソナ¥2,480マガジンが上位互換で全期間単品ゼロ」と判明→横断23本をlive¥780化（R8予想¥700→/設問3¥300→/トレードオフ¥500→/計算¥300→。弾力性はR8予想が¥500→¥700で実証済）。**序章2本（設問3序章n3eb135ebdff7・トレードオフ無料リードndb524ed63c92）は¥100で保護＝マガジンsweepが掴むので--exclude必須**。ペルソナは不変。ツール=`note-article-price-sweep.mjs --magazines <m> --exclude <序章key> --price 780 --commit`（マガジン非所属の計算は`--notes <key>`）。罠: 価格セッターの全選択はMacで`Control+A`不可→`Meta+A`（旧版は78000化バグ・修正済）。実行中にwifi切替でERR_INTERNET_DISCONNECTED多発→失敗分は--notesで個別再実行。価格SSOT=各article.md frontmatter `price:`＋note-magazines.tsのprice文字列＋noteコンテンツ計画.md。

**②横断単品ショーケースは実質live完了（commit 3b7308e07）:** live もくじ(n3ed4c77ceed6)を実査すると**全マガジンURL（R8予想/設問3/トレードオフ/計算/コア/完全/ロードマップ/R8無料）が既に掲載済**＝ショーケースのリンクはlive。マガジン説明文(■説明)に単品価格は露出しない（note掲載文.txtの「単品¥NNN」は内部コピペ用）ので説明文側のlive不整合も無し。よって残はrepo SoT掃除のみ実施＝note掲載文.txt 3本の単品¥700/300/500→¥780＋もくじソース直前節に「各¥780で1本から→セット割安」を追記。なお「直前期の総仕上げ」節header自体はlive もくじに未反映（mid-doc inline編集はtype不可・URL変わるrecreateは回避）＝既知ドリフトとして許容（リンクは別位置でlive済のため実害なし）。
