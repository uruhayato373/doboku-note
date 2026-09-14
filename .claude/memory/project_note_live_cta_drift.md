---
name: project_note_live_cta_drift
description: note無料記事のCTAが「ソースにあるがライブに出ない」ドリフトの実例と検証法（2026-06-18監査）。総監19本が購入CTA欠落、建設/2級は健全。
metadata: 
  node_type: memory
  type: project
  originSessionId: 36e31cf6-5ed1-4d84-b032-4992de187786
---

2026-06-18 に高アクセス記事→有料マガジン導線を監査して判明した実害ドリフトと、ライブ照合の正しい方法。

**ドリフトの構造**：note無料記事を5月に公開→funnel CTA（冒頭コアパック/完全パック直販＋末尾もくじ）を **6/16に後付け配線**（commit `1f5dde8a1`、旧完全パック回遊は `db6b92317` 6/3）→ `publish-note --update` で再投稿しないと**ライブのnoteに反映されない**（原則6＝ソース→ライブ非同期）。`audit-note-funnel`（機械）はソース構造しか見ないので「ドリフトなし」と出る＝**ライブ実害を検出できない**。

**実査結果**：総監 公開無料記事20本中**19本がコアパック直販CTAをライブで欠落**（唯一の例外＝ロードマップ）。計算問題集(45ビュー)・総監コスト・受験コスト比較は**マガジン導線が一切ライブに出ていない**。逆に**建設部門・2級土木はCTA配線後に公開（6/17-18予約投稿など）したためライブCTAが全て生きている**＝最もリッチな源を持つ総監がライブ最弱という逆転。

**ライブ照合の正しい方法**（会社PCプロキシ下でも可）：
- `curl --ssl-no-revoke "https://note.com/api/v3/notes/<noteId>"` で取得（[[project_note_write_automation]] の verify 系と同じ）。
- 照合対象は **`data.body` + `data.embedded_contents` のみ**。理由：CTAは単独行URL＝リンクカード([[feedback_note_link_card]])で `embedded_contents` に入り `body`テキストには出ない→**body-only照合は全部✗の誤判定**。逆に **JSON全体grepはnote自動レコメンドを拾う偽陽性**。中間の body+embedded が正。
- パック判定の指紋：コア=`m6e7de5e4ea3d`／完全=`m171222175fac`／R8予想集=`m6854c7437d4d`。

**副次drift**：R8予想有料6本はソースのline44に未差し替えplaceholder「（マガジン公開後にURL反映）」が残存、一方ライブ無料プレビューには既にR8集カードが反映済み＝**ソースが古い**。現ソースで再投稿するとR8集カードを失う。commit `ab35ca431` で R8集カード書き戻し＋コアパックバンドルCTA追加（paywall前の無料領域・価格非記載）。

**バッチA完了(2026-06-18)**：総監無料18本にコアパックCTAを末尾追記→**18/18 ライブAPI実体検証OK**。手段=新設 `scripts/note-append-cta.mjs`（`npm run note-append-cta`・Playwright・browser-useなしのWindows経路）。browser-useは会社PC未導入(Mac専用)と実機確認済→`note-publish.mjs`のtype method流用で自作。追記のみ＝空更新事故なし・dry-run既定・冪等・account assert。commit `6d8881011`。**冒頭CTAは既存記事に後付け不可なので末尾追記**（もくじの後）。

**バッチB完了(2026-06-18)**：R8予想有料6本に コアパックCTA を **無料プレビュー内（R8集カード m6854c7437d4d 直後）へアンカー挿入**→6/6 paywall完全保持(価格700・can_read False・有料5400-6500字ゲート)＋反映をAPI検証。note-append-cta に `--after`(指定ブロック直後に挿入)・`--boundary-h2`(有料境界H2・既定 試験問題|予想問題)・`--force` を追加。有料保存は `note-publish.mjs` の境界ロジック(予想問題H2直前に再設定＋boundaryBeforeExam検証ゲート)を移植＝paywall非破壊。

**計算問題集(ne190c3ef2fca・¥300)も完了(2026-06-18)**：`--force --after m607bf095b02a --boundary-h2 'パターン'`で無料プレビュー(精読ガイドカード直後)にコアパック反映(810→993字・価格300/ゲート維持)。公開フローのポーリング堅牢化(保存中でnavigation奪取問題)＋`--save-only`(挿入せず既存下書きのみ保存)追加で解決。末尾に残骸1枚(有料領域・無害)。

**合計25本ライブ反映済(無料18+R8有料6+計算問題集1)**。導線設計(SSOT=[[reference_note_selling_structures]]・note-funnel-architecture)は健全＝公開オペレーション(配線後の未再投稿)の問題だった。自動化資産=`scripts/note-append-cta.mjs`(`npm run note-append-cta`)。

**2026-06-30 インラインCTA→カード式変換＋全文ライブ反映**：総監の作り込みインラインCTA（blockquote内 markdownリンク＋¥価格）を `check-note-magazine-cta` 準拠の**カード式**（散文は残し de-link＋¥除去、bare URL を直後の単独行＝embedded card）へ変換（PR#295）＋キャラcover variant適用→deploy。**公開済み13本を `scripts/note-update-body.mjs --list --commit` でライブ全文置換反映**（draft6本は対象外＝noteId選別が前提）。API実体検証2/2（`curl --ssl-no-revoke note api/v3`）で旧markdownCTA 0件・マガジン埋込カード化を確認。**`note-update-body`（全文置換・Playwright・channel:chrome・会社PC Windows）はライブ更新を実証**（[[project_publish_note_skill]] の「実走未検証」を更新）。教訓＝1バッチ13本は9分でタイムアウト→**7-8本/バッチ or run_in_background 推奨**。note-append-cta（末尾追記）と異なり全文置換なのでソースがライブの正＝事前に origin/develop の最新へ揃える。

**機械検知を仕組み化(2026-06-18 commit 1b7b6b6e2)**：`audit-note-funnel`に`--live`(D5)追加＝公開記事のCTAがライブ反映済みかnote API body+embeddedで機械検証。従来D1-D4はソースマーカーしか見ず今回の事故を検出できなかった盲点を解消。低速のためCI(--ci)には含めず月次/手動。修復は note-append-cta。fm の\s*改行bleedで未公開記事がすり抜けるバグも同時修正。新規回遊エージェントは作らない(note-funnel-auditorと重複)＝必要だったのは意味監査でなく機械的ライブ検証だった。残=計算問題集の末尾もくじ未反映(D5が1件surface・有料preview card過多回避で保留可)。定点観測(note view取得+sales結合)は未着手(認証依存でfragile)。
