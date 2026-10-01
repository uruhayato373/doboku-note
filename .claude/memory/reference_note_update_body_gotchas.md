---
name: note-update-body-gotchas
description: note実機反映(note-update-body/note-append-cta)の非自明な挙動＝複数行blockquote脱落(lint rule9で予防)・本文画像は自動アップロード対応済(lib/note-images)・バンドル記事の公開設定ページ検出失敗・無料記事は実は通る・ABORTでも下書きは残る・URL見出し化レース(根治済:lib/note-cardify)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 17865b08-b9bc-4cac-afc3-9cbcda90e942
  modified: 2026-07-23T05:01:26.396Z
---

note 公開済み記事のライブ反映ツール（`scripts/note-update-body.mjs` 全文置換 / `scripts/note-append-cta.mjs` 末尾追記）の実測挙動（2026-07-13）。[[reference_note_card_edit_mode]] [[reference_note_ogp_card_no_delete]] [[reference_note_republish_drift]] と同系統。

**8. `[5e] FAIL: 画像欠落(live=0)` は有料記事では系統的な偽陰性（2026-07-22 経験記述系73本再公開で実証）**
- 有料記事の画像が**有料境界より下（有料領域）**にあると、`assertLiveBody` の公開API `/api/v3/notes/{id}` は**無料プレビュー部分しか返さない**ため `imgLive=0`→`[5e] FAIL` になるが、**実際は正常公開されている**。エディタ側で `[4.4] 確定=N/N`（CDN確定）まで通り `[5c] 更新する` が押せていれば公開は成功。
- FAIL 扱いのため**ハッシュが記録されず drift が残る**。正しい確定手順＝**認証済みプロファイルでライブURL(`note.com/dobokunote/n/{id}`)を開き `bodyImgs>0` と `paidWall=true` を目視/DOM検証**→OKなら `recordPublishedHash(path)` を手動で呼んで in-sync 化（`scripts/lib/note-republish-hash.mjs`）。ワンショット検証スクリプトは書き捨てで可（page.evaluate で img 数カウント）。
- 経験記述系は 1概念=著者オーソリティバナー等で **bodyImgs=5・paidWall=true が健全パターン**だった。

**9. メンバーシップ連携記事（合格ラボ等）は3段の試し読みフロー＝`公開に進む → 試し読みエリアを設定 → 更新する`（2026-07-23 解決）**
- 対象＝`price=0` だが `is_limited=true`（会員限定）の記事。まるごとパック・完全攻略/想定工事の 00-索引・はじめに-合格ラボ 等。「公開に進む」後の設定ページで右上ボタンが `有料エリア設定`/`更新する` でなく **`試し読みエリアを設定`**。これを押すと初めて `更新する` が出る（窓延長では直らない＝原因は時間でなくフロー段数）。
- `note-update-body.mjs` 対応済み: 設定ページ検出に `試し読みエリアを設定` を追加＋5b分岐。既定は**ラインを動かさず更新**（完全会員限定＝`bodyLen:0` の索引/はじめに等はこれで維持。実証3本）。
- **入口LPの無料プレビュー復旧は `--trial-line-bottom`**（試し読みラインを「末尾の1つ手前」に設置）。**最重要の罠＝ラインを本文の絶対最後（最終要素の後）に置くと「会員限定にする中身が0」で無効になり note が全文ロック（bodyLen→0）に戻す**。末尾の1つ手前なら最終CTAカードだけが会員限定の"しっぽ"になり、ほぼ全文が無料プレビュー化する（まるごとパック＝元1819字→復旧1863字で実証）。ライン確定は `.paywall-line` 要素の出現で検証（試し読みUIの「無料で読めるエリア」テキストは常時表示なので不可）。
- 有料/会員記事の `[5e]` は無料プレビューに画像が無いと偽陰性 FAIL だが、**無料プレビューに画像がある記事（バナー等）は [5e] が正しく PASS しハッシュ自動記録される**。最終ゲートは公開API `bodyLen`（無料プレビュー量）の前後比較。ライン位置の変更前後は必ず未認証視点で bodyLen を実査する。
- 全文置換＋同一セッションでのライン再設置は成立する（初回失敗はライン位置＝絶対最後が原因で、再ペーストは無関係だった）。ただし note の 試し読みライン設置UI をドライブする ad-hoc スクリプトは Claude Code の安全分類器がブロックする→**正規ツール `note-update-body.mjs --trial-line-bottom` を使う**。

**1. 複数行 blockquote は note ペーストで丸ごと脱落する（2026-07-15 lint rule9 で予防）**
- `> 行1` / `>`（空） / `> 行2` の複数行 blockquote は note-update-body の ClipboardEvent paste→ProseMirror 変換で**中身ごと消え「空の引用」だけ残る**（過去問PDF系5本で実測＝サンプル問題文が空箱化）。単一行 blockquote は残る（cta:pack-top 等で実証済）。
- 対策: 単一行 blockquote に分割（空行区切り）するか平文化。`note-lint` **ルール9**が `>` 連続2行以上をブロック（回避 `SKIP_NOTE_BQ=1`・既存62本はバーンダウン）。横断検知は `check-note-live-headings` の空引用検査。反映後は API 実査必須。

**1b. 本文インライン画像は自動アップロード対応済み（2026-07-15）**
- 旧 note-publish/note-update-body は paste 前処理で `![](img/xxx.png)` を**除去**していた＝図が live に載らない（published 33本で欠落）。`scripts/lib/note-images.mjs` で、画像行を一意トークン `〔〔IMG:n〕〕` へ置換して paste→「＋」メニュー→画像アップロード（filechooser・alt=キャプション）する方式に変更。トークン残存/失敗は保存/公開せず中断。
- 有料 PDF 記事（paid領域に PDF 添付カード）は全文置換がカードを破壊するため **`--images-only`**（本文アンカー直後に画像だけ追加・境界/カード不変）。破壊時は `note-attach-file.mjs` で PDF 再添付。真実源: note-api-verification.md「本文画像・PDF 添付の修復手順」。

**2. バンドル記事（記事の追加リストが長い）は「公開設定ページ到達せず」で ABORT**
- まるごとパック等、公開設定の「記事の追加」に大量マガジンを列挙する記事は、`更新する` ボタンの描画がポーリング窓(8×1.8s×3)を超え、note-append-cta も note-update-body も `[5] ABORT: 公開設定ページに到達せず` で失敗（再現的）。→ その1記事は手動で `更新する` クリックが要る。ポーリング窓延長が根治だが未対応。

**3. 無料記事の --commit は実は通る（ヘッダの「未検証→--pause推奨」は過度に保守的）**
- 単純な無料記事（受験資格・土木もくじ）は `--commit` で `[5c] 更新する` まで自動完走。無料でも --pause 不要。失敗するのは上記2のバンドル記事だけ。

**4. ABORT しても note 下書きには追記が残る（冪等スキップの罠）**
- note-append-cta が [5]追記後に境界判定で ABORT しても、note のオートセーブ**下書きに追記が残存**（再オープンで chars が追記後サイズ）。次回実行が冪等チェックで「既に本文に存在」と誤スキップ→公開版は未更新のまま。復旧は `--save-only`（挿入せず既存下書きの publish フローのみ実行、要 already 検出）。`--force` は再追記＝重複するので不可。

**5. 有料記事の末尾CTA追記は `--keep-boundary`**
- paidBoundary が「試験問題/予想問題」H2でない有料記事（出る順①/コンクリート工 等）は既定境界regex不一致で ABORT。`--keep-boundary` で既存境界を動かさず更新（末尾追記は有料領域内＝購入者向けクロスセルになる）。

**6. 有料記事の反映は公開APIで実査不可**
- 末尾CTAは有料領域ゆえ `api/v3/notes/{id}` の公開bodyに出ない。ツールの `[6c]更新完了`＋`既存境界line=true` を信頼するしかない。無料記事は公開APIで `body.includes` 実査可（制御文字で JSON.parse 落ちるので `[ -]` を除去してからパース）。

**7. URL見出し化グリッチ（2026-07-14 根治済み・再導入禁止）**
- 旧 cardify（URL行を Range選択→Delete→type→Enter・盲目4500ms待ち）は、embed 変換の**非同期 DOM 再構築中に次 URL の選択が壊れ、URL が隣接 h2 に typed される**レースがあった（published 291本中7本で目次にURL露出）。`Set` dedup で同一URL 2箇所目未処理のバグも併発。
- 根治は `scripts/lib/note-cardify.mjs`（毎回 DOM 再クエリ・段落限定・カード生成の実測待ち）＋保存前ゲート＋公開後 API assert。横断検知は `npm run check-note-live-headings`。cardify を再実装するときは必ずこの共有 lib を使う（両スクリプトへのコピペ再導入禁止）。真実源: note-api-verification.md「live 見出しURL検査」。

**11. `note-sync-tags` のタグ確定は autocomplete が初回 Enter を飲む＝連結して赤枠無効化（2026-07-23 修正済）**
- 症状: 159本タグ反映で10本が `[3] ABORT: タグchipが増えていない`。スクショで、ハッシュタグ入力が**赤枠**＋末尾に赤字の連結文字列（例「ノフラ老朽化建設コンサル」＝2タグが連結）。原因＝note のサジェストポップオーバーが `type→Enter` の**初回 Enter を飲み込み**、未確定のまま次の `type()` が前入力に連結→note が無効判定で全体拒否。少数追加(+5)でも大量(+74)でも発生（件数非依存・特定記事で再現）。
- 修正（scripts/note-sync-tags.mjs:139付近）: 各タグごとに `inputValue()` の空化を検証し、未確定なら `Escape`（サジェスト閉じ）→`Enter` 再試行、なお残れば `fill('')` で連結を断つ。`[3b] 確定=N/M` を出力。実測 8/9 回復（確定=93/93・73/74 等、live≥90 到達）。この class は恒久解消。
- **メンバーシップ記事（is_limited・price=0）は別系統で未解決**: はじめに-合格ラボ は `確定=93/93`（入力欄は受理）でも `chipCount`（body innerText の `#` 数）が増えず ABORT＝保存前中断で live tags=0 のまま。設定画面のタグ widget 構造差が原因。1本の無料会員記事につき自動化R&Dは過剰→SKILL 推奨の**編集画面で hashtags.txt 全選択コピペ**で対応。
- **noteId=TBD（noteUrl/noteId が literal "TBD"）は note 未公開**＝タグ以前に公開が必要。check-note-republish がタグdrift計上するが sync 対象外（先に publish）。

**10. `note-article-price-sweep` は有料境界を破壊する＝価格変更時に全ロック化（2026-07-24 実損58本）**
- 根因: 価格スイープが「有料エリア設定」ビューを開き**ライン位置を再設定せず**「更新する」→ note が境界を先頭リセット→無料プレビュー空＝FULL_LOCK（civil経験記述58本で発生・ユーザーが「有料ラインがおかしい」で気付いた）。まるごとパックを全ロックにしたのと同じ「境界ビューに入って未設定で更新」パターン。
- **鉄則**: 有料エリア設定/試し読みビューに入ったら**必ずライン再設定してから更新**する。price変更のためだけに境界ビューを開いて素通り更新しない。
- **防衛3層（実装済）**: ①`note-article-price-sweep` にガード＝対象noteIdをソース逆引きし paidBoundary持ちが含まれたら既定ABORT(exit9)・`--allow-boundary-risk`で上書き。②`check-note-boundary.mjs`（pre-commit＋CI全量）＝paid published の paidBoundary 解決可能性を事前ゲート（RULE_GAP再発防止）。③`check-note-structure.mjs --ci`（週次/月次・note API）＝ライブ無料本文とソース境界を突合し FULL_LOCK/PAYWALL_LEAK を検出、`.claude/config/note-structure-allow.json` の allowlist でBK/総監の境界定義ズレ偽陽性20本をWAIVED。
- 修復: 全ロック記事は `note-update-body --commit`（paidBoundary で境界H2再設定・価格は不変）。公開APIの無料テキスト長が0→回復で確認。バナーも全ロックの中に隠れて「PR画像未挿入」に見えるが境界修復で連動復活。

## 2026-09-23 追記: 「CDN確定待ちタイムアウト」の一部は画像消失
- 確定=2/3 等で毎回 1 枚足りない記事は、待ち時間(480〜720s)を伸ばしても通らなかった。タイムアウト時のエディタ内 img を出すと 3 枚挿入のはずが 1 枚しか無かった＝blob 待ちではなく挿入画像が消えている。**待ちを戻して単発で再実行したら 3/3 で通った**（3 本とも）。延長を重ねず単発再実行を先に試す。分類の改修は DN-0273。
- 冒頭 CTA の部分更新（replaceTopCta/insertTopCta）は CTA 文を h2 にし、直後の見出しを「R」＋カード＋残りに割ることがある（DN-0272）。ライブ走査は「60字超の h2/h3」「1〜2字の段落の直後にカード」で拾える。
