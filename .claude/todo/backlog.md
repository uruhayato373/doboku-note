# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。
> **完了したタスクはセクションごと削除する**（記録は git 履歴が持つ。完了サマリ・経緯 prose を本ファイルに書かない）。
> **タイトルが残作業と乖離したら TRIM でなく RESEED**（旧カード削除＋新 ID で再起票）。
> カード品質基準の詳細は `todo-standards.md`「5. 残す条件と削除条件」。

## 凡例

> カード構文・タグ語彙は **stats47 と共通の v3-unified スキーマ**
> （正典: `.claude/knowledge/reference/todo-standards.md`。拡張 token: `[期日:]` `[進行中]`・
> `### [ID] タイトル` の ID は任意）。

| 見出し | 意味 |
|---|---|
| ## 🔴 高 | 来月中に着手したい |
| ## 🟡 中 | 2〜3ヶ月以内 |
| ## 🟢 低 | 時期未定 |
| ## 🟣 判断待ち | **やるかどうかの意思決定が未了**（着手できないのではなく、着手すべきか決まっていない） |

## 🔴 高 — 来月中に着手

### [DN-0282] ココナラに4テーマ分の経験記述添削（`coconala-tensaku-4theme`）を出品する
タグ: [収益化] [種類:改善] [検証:check-coconala-live] [起票:2026-09-24] [期日:2026-09-26] [進行中]

**起点**: 2026-09-24 に出すと決めた（¥12,000・週1名・納期7日。決定ログは `ココナラ展開キット.md` §2）。同日朝の出品は、新規出品の日次上限（前日に4件以上を新規出品）で内容入力ページへ進めず止まった。カタログは `status:'draft'`・`serviceUrl:''` のまま、本文・商品画像（Drive vault 登録済み）はそろっている。

**やること**: 9/25 0:05 以降に1回だけ `DOBOKU_PW_MIN_FREE_MB=1200 node scripts/coconala-publish.mjs --service coconala-tensaku-4theme --image thumb-tensaku-4theme.png --commit` を実行する（空きメモリが 2GB 未満のときだけ環境変数を付ける）。Mac のセッションが `.tmp/run-coconala.sh` で 0:05 に自動実行する予定なので、**9/25 朝にカタログが `draft` のままなら（Mac が寝ていた・セッションが終わっていた）手で1回流す**。二重出品は listed なら冪等に止まる。成功するとカタログへ `listed`・URL・出品日が書き戻る。止まったら再試行を重ねず翌日に回す。

**完了条件**: `npm run check-coconala-live` で listed 全件が一致し、書き戻したカタログを develop へ入れる。2級二次（10/25）の前に出品できなければ、来季へ回すかを決め直す。

### [DN-0278] YouTube 概要欄の冒頭に季節の主商品リンクと保有資格を置き、予約済み・公開済みへ同期する
タグ: [SNS・マーケ] [種類:改善] [検証:check-video-publication] [起票:2026-09-23]

**起点**: ちゃんさとは二次検定期に概要欄の1行目をココナラにし、一次検定期は note の模試を先頭に置いている（[07b_販売動線分析_ちゃんさと_2026-09.md](../../docs/marketing/07b_販売動線分析_ちゃんさと_2026-09.md) §2）。自社の概要欄は「要約→この動画で分かること→制作表記→▼リンク」の順で、リンクが折りたたみの下にある。制作表記（`.claude/config/youtube-production-disclosure.json`）は「技術士（総合技術監理部門）」だけで、建設部門と1級土木が無い。

**やること**:

1. 生成テンプレート（`scripts/prepare-youtube-longforms.mts` の description）を「1行目＝要約、2〜3行目＝▼主CTA＋URL」に変える。パック固有の主CTAは従来どおりとし、季節の主商品（一次期＝模試・論点、二次期＝経験記述の診断・添削）を置くかは 07 §6 の切替に従う。
2. 制作表記を「技術士（建設部門・総合技術監理部門）・1級土木施工管理技士」に直す。`scripts/update-youtube-authority-metadata.mjs` は最初の「▼」の前に表記を差し込むので、リンクを冒頭へ移すと表記まで上がる。差し込み位置も合わせて直す。
3. 全 `youtube.json` を再生成し、予約済み・公開済み（`.claude/state/video-content-status.json` の longform と Shorts）へ `publish-video-pack.cjs --phase metadata` で同期する。ローカルに YouTube の資格情報が無いため、CI から実行する経路を用意する。

**A8 リンク**: 概要欄にココナラ登録の A8 リンクを置く場合、YouTube チャンネルは A8 の掲載サイトに未登録（2026-09-24 時点で stats47・doboku-note・kazu-note のみ）。先に掲載サイトとして登録する（DN-0283 と同じプログラム）。

**順序・禁止**: DN-0110 の移行（移行計画の `desiredSnippet`・`planSha256`）と衝突させない。移行が終わってから、または計画を作り直せる状態で着手する。公開面で「総監は上位資格」と書かない（07 §2）。

**完了条件**: 予約済み・公開済みの全件の概要欄が新テンプレートと一致し、`verify-video-publication` の実査が通る。

### [DN-0280] X の販売投稿に、締切の統一・合格発表日への集中・新商品の段階告知を入れる
タグ: [SNS・マーケ] [種類:改善] [検証:check-x-campaign-plan] [起票:2026-09-23] [期日:2026-10-10]

**起点**: ちゃんさとは (1) 添削の受付・購入者の質問・note の割引の締切を、すべて「本試験1週間前」にそろえて繰り返し告知する、(2) 平常時はノウハウだけを投稿し、販売の投稿は一次の合格発表日（8/13）や試験直前に集中させる、(3) 新商品を「制作中→完成間近→発売・割引→割引最終日」の4回に分けて告知する（[07b_販売動線分析_ちゃんさと_2026-09.md](../../docs/marketing/07b_販売動線分析_ちゃんさと_2026-09.md) §4）。自社の `x-post-policy.md` はリンクの比率と押し売りの回避は決めているが、販売する時期と締切の決め方は決めていない。

**やること**: 3点を `x-post-policy.md` に追記し、2級二次向けの `2026-10-civil-final.json`（10/11〜）に反映する。ココナラ添削の受付締切日は、決めてから投稿に書く。リンクなしの予告は、自社の実績ではリンクなしの反応の中央値が0（同ポリシー §11.2.1）のため、採用せず比較できる形で試すに留める。

**禁止**: 凍結対策（同ポリシー §11）の重複・連投・一括予約の制限を守る。

**完了条件**: ポリシーへの追記と、10月キャンペーンの該当投稿が `check-x-campaign-plan` を通る。

### [DN-0283] サイトのココナラ出品リンクを A8 の商品リンクに切り替える（会員登録 ¥100・PR 表記つき）
タグ: [収益化] [種類:改善] [検証:check-affiliate-mats] [起票:2026-09-24]

**起点**: 2026-09-24 のユーザー決定で、ちゃんさとと同じくココナラ登録のアフィリエイトを始める（「アフィリは転職一本」の例外。自社出品への送客なので note とカニバらない）。同日に実装を始めたが、Claude Code の自動モードの安全判定（traffic redirection）で止まった。**ユーザーが許可してから実装する**。

**A8 実機で確認した事実（2026-09-24）**:

- 提携済みプログラム `s00000012624009`（株式会社ココナラ・「発注者 募集」）。成果は「ココナラを初めて使う人の会員登録 ¥100」。購入 ¥2,500 は Web・デザイン・動画・IT などのカテゴリだけで、当サイトの出品（学習指導・資格）の購入は対象外。特典を付けた誘導は否認条件。再訪問期間90日。
- 掲載サイトは `doboku-note`（`websiteId=002`）を選ぶ（既定は stats47）。商品リンク作成で「カテゴリ・出品者プロフィール・サービスページ」を飛び先にできる。
- 生成結果は全サービスで同じ形: `https://px.a8.net/svt/ejp?a8mat=4B3RUY+AINQAI+2PEO+1NIX2A&a8ejpredirect=<サービスURLを encodeURIComponent>`、計測ピクセル `https://www15.a8.net/0.gif?a8mat=4B3RUY+AINQAI+2PEO+1NIX2A`（listed 20件で照合済み）。A8 は生成リンクの改変を禁じている。
- テキスト素材「無料登録はこちら」は `4B3RUY+AINQAI+2PEO+1HMAQQ`（YouTube 等で単独リンクにする場合）。

**やること**: (1) `src/config/affiliate-creatives.ts` に mat・ピクセル・`coconalaAffiliateHref(serviceUrl)` を置く。(2) `src/lib/offsite-cta.ts` と `src/components/ui/OffsiteCta/OffsiteCta.tsx`、`src/app/links/page.tsx` のココナラ導線をこの href に替え、`AffiliatePrBadge`・`AFFILIATE_LINK_REL`・1ページ1ピクセル（`TrackingPixel`）を付ける（OffsiteCta の「アフィリではないので PR 表記不要」のコメントも直す）。(3) `src/config/affiliate-mats.json` に mat を登録。(4) A8 の実出力と照合するテストを足す。(5) `affiliate-operations.md` §1 に例外を書く。

**完了条件**: `check-affiliate-mats`・型検査・テストが通り、build 後の経験記述ページで PR 表記と A8 の href を確認できる。


### [DN-0275] 太字記号・画像重複の原稿修正 86 本を note へ再公開する（建設部門 PDF 付き 47 本を含む）
タグ: [収益化] [種類:改善] [起票:2026-09-23] [期日:2026-10-05]

**起点**: 2026-09-23 に、太字が記号のまま出る 149 か所（63 本）と同じ画像の重複（26 本）を原稿側で直した（develop `ba31a4f64`）。ライブに反映されるのは再公開してから。`check-note-republish` の要再公開のうち 86 本がこの修正によるもので、内訳は建設部門 47（全部 PDF 付き）・1級2級土木 24（メンバーシップ限定 6 を含む）・総監 12・コンクリート主任技士 2・共通 1。DN-0274（総監 模範論文マガジン 40 本）と DN-0271（序章）は別カード。

**やること**: 手順は DN-0274 と同じ（PDF は `drive-vault-sync --pull` で取り込み、`note-update-body --list <15本> --reattach-pdf --commit` を 1 つずつ。日次のアップロード上限と 3 本連続失敗で止め、CDN 待ちの中断は単発で `--force-retry`）。PDF 無しは `--reattach-pdf` 不要で、1 日の上限を使わない。加えて:
1. PR #588 のマージ後に流す。無料設定のままメンバーシップ特典マガジンに入っている記事は、`--trial-line-bottom`（ほぼ全文を誰でも読める）か `--keep-member-lock`（全文ロックを保つ）を付けないと中断するようになる。
2. 無料設定のまま会員限定の記事（2026-09-23 実測）: 全文ロックは 1級・2級の想定工事索引、合格ラボ「はじめに」、RCCM 問題III 序章、1級・2級・コンクリートの**まるごとパック入口 LP**。**入口 LP が全文ロック（未ログインで本文 0 字）なのは要判断**。`note-api-verification.md` は「入口 LP は `--trial-line-bottom` で無料プレビューを出す」扱いで、以前の更新（ラインを引かない既定）で閉じた可能性がある。ユーザーに開けるか確認してからフラグを決める。ペルソナ選択ガイドは 9/23 に `--trial-line-bottom` で本文 3,825 字を公開済み。
3. `notePricing: membership` の 6 本（予想問題マガジン・学科記述予想）は従来どおりラインなしで全文ロックを保つ（フラグ不要）。

**完了条件**: `node scripts/check-note-republish.mjs --json` の `driftFiles` に `ba31a4f64` で変えた 86 本が無い。週次の `check-note-live-headings` で太字記号が 0。

### [DN-0277] note 本文のバッククォート（`〇〇` など）が記号のまま表示される 256 本を直して再公開する
タグ: [収益化] [種類:不具合] [起票:2026-09-23]

**起点**: 2026-09-23、note 公開ページの目視確認用スクリーンショット（PR #591）の最初の 1 組で、有料記事の本文に「施工量：押え盛土\`〇〇\`m³」とバッククォートがそのまま出ているのを見つけた。原稿の「自分の数値に置き換える箇所」の目印 `〇〇` を、note はコード表記として描画せず記号のまま出す。公開 API で見える範囲だけで**公開 906 本中 248 本**が該当し、原稿では **256 本・約 3,300 行**（`〇〇` 4,762・`〇` 1,682・`〇〇〇` 334 ほか、`L`・`18` など数値も少数）。有料部分は未ログインで見えないので、読者が買った後に見る本文にも多く出ていると考えられる。

**やること**: (1) 原稿のバッククォートを外す（`` `〇〇` `` → 〇〇）。目印として強調が要るなら【〇〇】などに置き換える方針を先に決める（全置換なので書き方をそろえる）。書き込みは `writeMdxFile`、改行コードは元のまま。(2) 再発防止として note-lint に「note 記事でバッククォートを使わない」規則を足し、全件検査も CI ゲートにする（(1) の後でないと既存記事で赤になる）。(3) 256 本を再公開する。PDF 付きが多く日次のアップロード上限（90 件）に当たるので、DN-0274・DN-0275 と同じ手順で数日に分ける。DN-0275（太字記号・画像重複 86 本）と対象が重なる記事は一緒に流す。

**完了条件**: ``git grep -cE '`[^`]+`' -- 'content/note/**/article*.md'`` が 0 件、note-lint の新規則が CI で緑、`node scripts/check-note-republish.mjs --json` の要再公開に対象の記事が無い。

### [DN-0270] ココナラの出品画像を、一覧で読める型へ作り直す（人が見るサービスにキャラクター・画像に価格を入れない）
タグ: [収益化] [種類:制作] [起票:2026-09-23] [期日:2026-10-20]

**起点**: 2026-09-23 に競合の出品画像と並べて比べた。最大手のちゃんさと技師は、マスコット（ヘルメットの白クマが赤ペンで添削）と大きな「経験記述 添削」の文字、303geos は文字だけ、ひげごろーは本人写真と強い配色。3者に共通するのは太く大きい文字と強いコントラストで、自社の画像（淡い写真の背景に細い文字）は検索一覧の小さい表示で埋もれる。ユーザー決定の方針: 診断・添削・答案作成のような人が見るサービスは、doboku-note 先生を大きく入れ、資格（技術士・元発注者）を添える。PDF 教材はキャラクターを小さく隅に置き、主役は中身（冊子の見本・冊数）。画像には価格を入れない（ココナラは価格を画像の横に出す。9/23 の値上げでサムネ12枚を作り直したうえ、画像の中身は `check-coconala-live` でも検査できない）。最大手と同じ「キャラクター＋添削」の型なので、配色と構図で真似に見えないようにする。キャラクター素材（`.claude/config/character-poses.json`・11ポーズ）に「赤ペンで添削」のポーズが無く、新しいポーズは Codex で作る。Codex の利用上限が解けてから着手する。受験者が購入前に「誰が見てくれるか・何が入っているか」を一目で判断できるようにする画像で、HARMはA。画像の変更で閲覧が増えるかは未検証。

**やること**: (1) 【2026-09-23 済】今の文言（「採点者視点」→「発注者視点で赤入れ」）で8件（shindan・tensaku-set・sakusei・sakusei-4theme・civil-keiken-kit・sokan-bunseki・rccm-mondai3-tensaku・rccm-mondai1-shindan）のサムネを作り直して差し替え、診断・添削のギャラリーも入れ直した（両方2枚）。`check-coconala-live` は20件一致、Drive vault 同期済み。(2) キャラクターの添削ポーズを `CHARACTER-SPEC`（1ポーズ＝1画像）に沿って Codex で作り、`character-poses.json` に登録する。(3) `coconala-thumb.mjs` に「人が見るサービス用（キャラクター大・太字・価格なし）」と「PDF 用（キャラクター小・中身の見本）」の2型を足し、診断・添削・答案作成の3件から差し替える。差し替えは `coconala-edit --replace-image` で、複数画像の商品（診断・添削は2枚）はギャラリーを入れ直す。PDF 教材は3件の閲覧を見てから同じ型へそろえる。

**完了条件**: 差し替えた商品の公開ページで画像枚数が変わらず（ギャラリーを保持）、`npm run check-coconala-live` が全件一致。出品画像の文言に「採点者」を自称する表現が0件。差し替えから30日後に、差し替えた商品と差し替えていない商品の閲覧数を kpi-log で読む。表示回数が非公開（セラーサクセス未加入）でクリック率は取れず、試験日の季節変動も混ざるので、効果は断定しない。

### [DN-0267] コンクリート主任技士のココナラ2件（小論文 PDF・択一直前パック PDF）を1日1件ずつ出品する
タグ: [収益化] [種類:制作] [起票:2026-09-23] [期日:2026-09-26] [進行中]

**起点**: 2026-09-23 に出品文・サムネ・納品PDF（K1 5冊・K2 3冊、Drive vault 保管済み）を用意したが、同日5件目以降の新規出品が「内容の入力に進む」の後で止まり、draft のまま残った（原因未確認・coconala-operations.md §8 の注記）。本試験は 2026-11-29。主任技士の受験者が小論文と択一を直前に固める教材で、HARMはA。需要の証拠は無い試験出品で、継続判断は DN-0265。

**やること**: 9/24 は日次上限（9/23 に4件以上出品）で出品不可。9/25 は DN-0282 の後に `DOBOKU_PW_MIN_FREE_MB=1200 node scripts/coconala-publish.mjs --service coconala-cce-essay-pdf --image thumb-cce-essay-pdf.png --commit`（Mac セッションの `.tmp/run-coconala.sh` が DN-0282 成功時だけ 3 分後に続けて流す。朝にカタログが `draft` のままなら手で1回）。9/26 以降に `coconala-cce-takuitsu-pdf`（`thumb-cce-takuitsu-pdf.png`）を同様に出品する。止まったら再試行を重ねず翌日に回す。カタログへの書き戻し（listed・serviceUrl・listedAt）を commit する。

**完了条件**: 2件の公開ページがログアウト状態で HTTP 200、価格がカタログ（¥3,000・¥3,500）と一致し、`npm run check-coconala-wiring` が通る。

### [DN-0262] 1級・2級土木 第2次検定 記述 Kindle（I・J系）26冊を KDP へ3回に分けて提出する
タグ: [収益化] [種類:制作] [起票:2026-09-23] [期日:2026-10-17]

**起点**: 2026-09-23 にユーザーが「二次記述系も全部Kindle化」と指示し、26冊を制作した。KDP の新規作成は週10冊が上限（`content/kindle/strategy.md`「提出ペースと作成数制限」）。9/23 の i-04 で制限に到達したため（本は作成されていない）、同戦略の I・Jシリーズ節の改定後の計画で出す。2級は 10/25 の試験前に LIVE にしたい。

**やること**: 9/30 に `node scripts/kdp-batch.mjs j-03` を1冊だけ流して回復を確かめ、通れば続けて `node scripts/kdp-batch.mjs j-01 j-02 j-11 j-12 j-13 j-14 j-15 i-04 i-01`。第2弾は 10/7 以降に `node scripts/kdp-batch.mjs i-02 i-03 i-11 i-12 i-14 i-15 i-17 i-16 i-13 i-18`、第3弾は 10/14 以降に `node scripts/kdp-batch.mjs i-19 i-20 i-21 i-22 i-23 i-24`。note 用ブラウザが別セッションで動いているときは `DOBOKU_PW_ALLOW_PARALLEL=1` を付ける。作成数制限で止まったら（exit 2）翌日以降に1冊で再確認する。提出週に既刊の価格改定（再出版）を重ねない。LIVE 化は `node scripts/kdp-publish.mjs --sync-status` で確かめ、ASIN と公開日を catalog と戦略へ記録する。

**完了条件**: catalog の i・j 系26冊がすべて ASIN 付き `live` になること。

### [DN-0266] 2級二次（10/25）前に、ココナラブログの2級・直前向け下書き3本を1日1本で公開する
タグ: [収益化] [種類:制作] [起票:2026-09-23] [期日:2026-10-15]

**起点**: ココナラブログは公開8本に対し、書き上がった下書きが8本残っている（`2kyu-doko-made-kaku`・`2kyu-moshi-tsukaikata`・`chokuzen-2shukan-roadmap` ほか）。2級受験者が本試験直前に、経験記述の書き込み量と模試の使い方を確かめるための記事で、HARMはA。2026-09-23に見本記事（813777）を公開し、2級の模試とフルパックの本文から見本へリンクした。公開済み記事の閲覧は30日で各6〜16と小さい。記事公開で出品の閲覧が増えるかは未検証。

**やること**: 3本を `coconala-blog-qa` で採点し、合格した記事から `node scripts/coconala-blog-publish.mjs --post <slug> --commit` で1日1本公開する（coconala-blog-policy.md §6）。funnel 先が listed であることを `npm run check-coconala-blog` で確かめる。

**完了条件**: 3本の blogUrl が frontmatter に書き戻され、公開スクリプトのライブ実査（ログアウト状態・外部リンク0件）が通る。公開から30日後に、記事と2級出品の閲覧を kpi-log で読む（欠測は0と扱わない）。


### [DN-0293] Mac に gsc-local（launchd）を入れ、GSC 登録リクエストと sitemap 送信の自動化を確かめる
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-24]

**起点**: 登録リクエストと理由別 UI CSV は API が無く、ログインしたブラウザが要る。GitHub hosted runner は Google がセッションを Mac 側まで失効させ（2026-09-21 実測）、self-hosted runner はこのリポジトリが公開のため fork の PR に Mac 上でコードを実行されうる。そこで Mac の launchd `gsc-local`（毎日 10:30・寝ていた日は起床時）で回し、API で済む sitemap の送信と読み込み状況は `fetch-metrics.yml` が取る形にした（ユーザー判断・2026-09-24）。

**やること**:
1. Mac で `git pull origin develop`
2. Mac: 未ログインなら `npm run google-console:login` → `npm run gsc-local:install` → `npm run gsc-local:install -- --run-now`。`~/Library/Logs/doboku-note/gsc-local.log` で受理件数と develop への push を確かめる（Chrome が数分開く）
3. 金曜の fetch-metrics と月曜の weekly-review-guard の job summary で `check-gsc-sitemaps`・`check-gsc-indexing-due`・`check-gsc-ui-due` が OK か見る。registry の google は `enabled:false` のまま

**完了条件**: launchd の実行が受理を `gsc-indexing/history.json` に記録して develop へ push し、`npm run check-gsc-indexing-due` と `npm run check-gsc-sitemaps` がともに OK。

### [DN-0299] note の PDF なし 27 本の本文を再公開し、表示崩れ（太字の記号・重複バナー）と 404 リンク 2 本を note 上から消す
タグ: [SNS・マーケ] [種類:改善] [起票:2026-09-24] [期日:2026-09-25] [進行中]

**起点**: `check-note-republish`（DN-0297 で 301 等価な張り替えを除外）の要再公開 128 本のうち、PDF なし・noteId ありが 27 本（本文画像 42 枚）。中身は 9/23 18:47 `ba31a4f64` の修正（太字が `**` のまま出る・重複した著者バナー）と、`配合計算-実戦演習` の 404 リンク 2 本の修正で、いずれも note 上は未反映（公開 API で `**` の表示を確認済み）。2026-09-24 にこの 27 本を同日夜に流すと決めた。

**やること**: 9/24 夜は Mac セッションが DN-0274 の後に流す（リストは `.tmp/dn0299-first3.txt` → 確認 → `.tmp/dn0299-rest.txt`。Windows では流さない）。`DOBOKU_PW_MIN_FREE_MB=1200 node scripts/note-update-body.mjs --list <list> --commit`。リストは `node scripts/note-republish-plan.mjs` の ready と hasImage のうち noteId があり、本文が PDF 配布に触れず PDF 実体も添付記録も無い記事で、`配合計算-実戦演習` を先頭に PV 順（`.claude/state/metrics/note/articles-pv-2026-08.json`・`-09.json`）。太字記号・画像の欠落と過多・存在しないサイトリンク・見出しの URL・無料プレビュー長は 1 本ごとに公開直後の検査（[5e]）が止めるので、最初の数本では自動検査の対象外のリンクカードと目次を note 上で確かめてから残りを流す。会社 PC は `DOBOKU_PW_MIN_FREE_MB=500` と、画像の確定待ちで止まるなら `NOTE_IMG_SETTLE_MIN_MS`・`NOTE_IMG_SETTLE_PER_IMG_MS`（既定 90 秒）を延ばす。

**完了条件**: 27 本すべてで `note-update-body` の公開直後の検査 [5e] が OK、`node scripts/check-note-republish.mjs` の要再公開から 27 本が消え、`npm run check-note-live-headings` と `node scripts/check-note-structure.mjs --ci`（有料境界の漏洩・全ロック）がともに exit 0。

### [DN-0300] note の要再公開の残り 101 本（PDF 付き 89 本・会員限定 6 本ほか）を反映する
タグ: [SNS・マーケ] [種類:改善] [起票:2026-09-24]

**起点**: 要再公開 128 本のうち DN-0299 の 27 本を除いた残り。内訳は PDF 付き 89 本（本文が PDF 配布に触れる画像付き 2 本を含む。うち 40 本は総監模範論文で、記録時の版が 8/22 の履歴切り詰めより前にあり live の状態が分からない）、会員限定 6 本、noteId の無い 5 本（総監テキスト精読ガイド 5管理）、中断記録のある 1 本（総監 設問3 序章）。多くは DN-0299 と同じ 9/23 の表示崩れ修正を含み、有料記事の購入者にも崩れた表示が出ている。

**やること**:
1. PDF 付き: PDF 実体は Windows PC に 1 本分しか無いので `npm run drive-vault-sync -- --pull` で戻し、`note-update-body --list <list> --reattach-pdf --commit`。note のアップロードは 1 日 90 件まで（PDF と画像の合計）なので日を分ける。総監模範論文 40 本は `npm run check-note-attachments:live` で live の添付を確かめてから
2. 会員限定 6 本は記事ごとに `--keep-member-lock` か `--trial-line-bottom`
3. 中断記録の 1 本は live を確かめてから単独で `--force-retry`
4. noteId の無い 5 本は公開済みか確かめ、noteId を frontmatter に書き戻してから対象に入れる

**完了条件**: `node scripts/check-note-republish.mjs` の要再公開（判定できずを含む）が 0 本になり、PDF 付きは `npm run check-note-attachments:live` で添付が全件そろっている。

### [DN-0237] RCCM 問題I 業務経験論文テンプレ・択一論点集 50 問・ココナラ 3 出品を CBT 期間内（〜10/31）に出す
タグ: [収益化] [種類:制作] [起票:2026-09-16] [期日:2026-10-10]

**起点**: 2026-09-15 に問題III 模範論文集（m770bef96b39f）を note 公開し EXP-009 を開始。計画 `~/.claude/plans/rccm-staged-reef.md` T2 の残商品。試験事実の SSOT は `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md`。

**やること**: (1) `rccm-mondai1-template`（¥1,980・`rccm-essay-writer type=mondai1` → `rccm-essay-qa`）を公開し RCCMもくじ nd297cb9b31e0 の問題I 節を実 URL に差し替える。(2) `rccm-takuitsu-yosou-50`（¥1,480・問1〜10 無料・全問自作・`content-qa`＋`note-fact-checker`）。(3) ココナラ `coconala-rccm-mondai3-tensaku` / `-mondai1-shindan` / `-mondai3-pdf` を `/coconala-publish --commit`（PDF は `magazine-pdf-builder`・印刷 PDF は Windows）。各公開時に `note-magazines.ts` published:true・`sales-recorder.md`・もくじ追記を同一 commit で。

**完了条件**: 3 商品が note/ココナラでライブ、`verify-note-magazines` と `check-coconala-wiring` 緑、RCCMもくじに 3 節の実 URL。

### [DN-0247] サイト新資格 `/exam/rccm/`（ガイド 7 本）を PR-1 で公開し、重点資格へ登録する
タグ: [コンテンツ品質] [種類:制作] [起票:2026-09-16] [期日:2026-10-10]

**起点**: PR #513 で ExamKey/カレンダー/エージェントの scaffold は入ったが、サイト面は無い（note マガジンの site 面は 総監 資格地図・1級 コンサル転職ガイドの MagazineCard 2 面のみ）。2027-03-01 合格発表・5 月申込期の検索流入を仕込む。

**やること**: 計画 §PR-1 の Commit A（categories/home-exam-cards/tags/curriculum/doc-classifier/category-groups/sidebar-discovery/next-step/magazine-placement/note-mokuji/ogp-create/card 画像）→ B（CategoryPage/JumpNav/ExamCards/links/StructuredData/SearchFilters/ArticleFooter）→ C（`content/site/rccm/{guide-overview, guide-mondai3-themes-2026, guide-mondai1-keiken-ronbun, guide-mondai2-4-takuitsu, guide-study-plan, guide-eligibility-application, guide-difference-pe}` 各 ≥3,000 字・`civil-guide-writer category=rccm`→`guide-fact-checker`→`guide-qa`・exam-content-policy Part 4 メモ）。同時に `business-direction.json qualifications[]` へ rccm を追加し `seo-watchwords.json` に improve 候補 1 件以上（`seo-rank-watch-ci` が要求）。画像生成に課金ツールを使う前にユーザー確認。

**完了条件**: `check-home-exam-coverage`/`check-content-taxonomy`/`check-category-curriculum`/`check-guide-length`/`quality:audit:ci`/`build` 緑、`npm run serve` で `/exam/rccm/` に `<main>`、deploy 後 `check-production-ssr` exit 0。

### [DN-0248] 技術士 口頭試験対策の無料導入2本と告知を筆記合格発表日に公開する
タグ: [収益化] [種類:制作] [起票:2026-09-16] [期日:2026-10-26]

**起点**: 7月の購入者へ、筆記の結果に応じた次の準備を案内する。送客先の有料教材と価格・公開URLは `src/lib/note-magazines.ts` の `tankan-oral-complete` / `pe-construction-oral-guide` を参照する。

**やること**: 総監・建設部門の無料「筆記合格発表後にやること」2本を公開前に事実照合し、旧「有料教材は公開予定」表記を公開済みURLへの案内へ直す。総監の成績通知の評価区分、口頭試験の試問事項、業務内容の詳細720字以内、建設部門のコンピテンシー改訂の説明を一次資料と照合する。発表日Dは日本技術士会の公式掲載と `exam-calendar.json` を突合し、D当日に無料2本を公開してL2へ配線する。X告知は `2026-11-pe-oral.json` にまとめる。

**完了条件**: 無料2本がライブ、有料教材へのリンクが公開URLと一致、`audit-note-funnel` ドリフト0、X11月計画が `check-x-campaign-plan` 緑。

### [DN-0249] note 流入元・記事別 PV を月次で機械取得する `note-traffic-fetch` を新設し週次レビューへ配線する
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-16] [期日:2026-10-05]

**起点**: 2026-09-15 の手動 Playwright 実測で「収益は note 内回遊＋検索直で 73〜80%、X 0.2%、サイト経由は noreferrer で不可視」が判明（memory `note-traffic-sources-2026-09`）。business-direction の notePv は欠測のまま。EXP-010 の判定にも要る。

**やること**: `scripts/note-traffic-fetch.mjs`（`note-sales-fetch.mjs` を型に read-only: `/dashboard` → 期間 → 「時系列」→ データテーブル innerText）＋ `scripts/lib/note-traffic-normalize.mjs`（純関数・test）→ `.claude/state/metrics/note/referrers-YYYY-MM.json`・`articles-pv-YYYY-MM.json`。`package.json`・commands.md・`quality-audit.mjs`（`--check` モード）・`weekly-review/SKILL.md`・`business-review.md`（notePv の出典）に配線。

**完了条件**: `npm run note-traffic-fetch -- --month 2026-09 --commit` で 2 ファイルが書かれ、検査対象数/実検査数を出力、test 緑、週次レビューが参照。

**2026-09-21 追記**: 取得本体（note ダッシュボード）は暗号化 storageState 方式で CI 化する（別 PR・login-collectors.yml）。本カードの残件は business-direction の出典記述と週次配線のみ。


### [DN-0250] 1級・2級 二次直前の note CTA 切替（〜10/4・〜10/25）と試験後の無料フォロー記事
タグ: [収益化] [種類:改善] [起票:2026-09-16] [期日:2026-10-05]

**起点**: 計画 T1。civil-1-keiken-complete-pack（¥9,800）は直近 2 件実売。**2026-09-16 実査**: ローカルの note-funnel `topCtaOverrides`（1級 `m150c9db08902` 完成答案集 ¥2,480）は 2026-09-06 の commit f02bcdd1e で切り替えたが note へ未反映（`check-note-republish` の civil ドリフト約 250 本の正体）。**ライブは完全攻略パック（m8290970a7f05）のまま**＝直前期に望ましい状態なので、10/4 までは触らない。

**やること**: 10/4 までライブ（完全攻略パック）を維持。10/5 以降に 9/6 の低価格先出し方針（完成答案集→上位パック）を採るか判断してから `note-update-body` で反映する（ドリフト 250 本の一括反映は内容を確認してから）。2級は 10/25 まで同様に据え置き。試験後に無料「R8 二次 自己採点の目安と合格発表までにやること」を各級 1 本（会員ラボ・次年度導線）。

**期日の置き方**: `[期日:]` は**最初の行動日**に合わせる（1級の判断＝10/05）。1級を反映したら 2級の期日 `2026-10-26` へ引き直す。2026-09-22 に 10-26→10-05 へ修正（10/4 の 1級判断を 3 週間過ぎてから surface する状態だったため。`check-backlog-health --due` の S14 が期日超過を SessionStart で出す）。

**完了条件**: 切替と復帰がそれぞれ `audit-note-funnel` 緑でライブ反映され、無料 2 本が公開。











### [DN-0246] 会員 経験記述 W8〜W11 を公開日後に特典マガジン mbe07bd5cecda へ収録する
タグ: [収益化] [種類:定期] [起票:2026-09-17] [期日:2026-09-29]

**起点**: 2026-09-17 に W8〜W11 を `note-publish --schedule` で予約投稿した（README 配信表・`noteStatus: reserved`）。予約中の記事は `note-magazine-add-articles` で収録できない（exit 7・実測）ため、公開後に手動で収録する必要がある。

**やること**: 残りは W11 `n64f9653dc30c`（9/28 公開）だけ。公開後に `DOBOKU_PW_MIN_FREE_MB=1200 node scripts/note-magazine-add-articles.mjs --target mbe07bd5cecda --notes n64f9653dc30c --commit`（W8〜W10 は収録済み・現収録 10 件）。学科09/10・添削01 は単独記事なので収録不要。

**完了条件**: 特典マガジンの収録が 10→11 件（API 実体確認）・`npm run check-membership-drip` 緑。
### [DN-0235] develop への push で赤くなる CI（quality audit + build）に読み手を付ける
タグ: [エージェント・SSOT] [種類:不具合] [起票:2026-09-14]

**起点**: 2026-09-13T21:53 のマージ `0cf7faeb`（feat/claude-md-slim → develop）で CLAUDE.md が 147 行から 323 行へ戻り、`check-claude-md-size`（quality-audit `ci:true`）が develop の push ごとに落ちている。09-14 までに **6 run 連続で failure** だが、develop 直 push は PR の赤と違って誰の画面にも出ないため、1 日以上誰も気づかなかった（CLAUDE.md §9「赤いのに誰も見ていない検査は無いのと同じ」）。

**やること**: develop の直近 `Pre-merge check` の conclusion を機械で surface する。候補は (a) SessionStart の `scripts/check-git-sync.mjs` に `gh run list --branch develop --limit 1` の failure を 1 行足す（`gh` が使える端末のみ・プロキシで取れないときは「未取得」と出す）、(b) `/weekly-review` の automation-failure 節に develop の失敗 run を列挙する。少なくとも (a) を入れ、`gh` 不可のときに緑と混同しない出力にする。

**完了条件**: develop の最新 run が failure のとき、次のセッション開始時に赤い 1 行が出ること。CLAUDE.md の復元そのものは別作業（設定一本化の PR）で行う。

### [DN-0226] knip ratchet の赤（Unlisted binaries `ps` / `powershell.exe`）を解消し baseline を締め直す
タグ: [エージェント・SSOT] [種類:不具合] [Codex候補] [検証:check-knip-ratchet] [起票:2026-09-14]

2026-09-13 の返済・締め直し（DN-0205 #6）の直後に、`scripts/lib/local-resources.mjs` が呼ぶ `ps` と `powershell.exe` が Unlisted binaries 0 → 2 として赤になった（`npx knip --include binaries` で実測）。システムバイナリなので 09-13 と同じく `knip.json` の `ignoreBinaries` へ入れる。併せて knip の Configuration hints（`hast-util-sanitize` を ignoreDependencies から、`du` を ignoreBinaries から外せる）も処理する。返済分（Unlisted dependencies 13→9・Unused dependencies 2→1）は `--update-baseline` で締め直す。

DN-0205（09-13 に完了・削除済み）は codex branch のマージ e019b1b1 で台帳に復活していたため、本カード起票時に再削除した。完了→削除の後は develop 先端から branch を切る（マージで戻る）。

**完了条件**: `npm run check-knip-ratchet` が緑（増加 0）で、baseline が実測と一致していること。

### [DN-0224] 教材の原典待ち17論点を復旧し記事・図解・SNSとの対応を再照合する
タグ: [コンテンツ品質] [種類:改善] [起票:2026-09-14] [検証:check-content-expansion]

**対象**: 教材対応表 `.claude/state/content-expansion.json` のうち、本IDを参照する論点。開始時は1級土木二次問題集4、総監受験対策2、総監論文対策10、技術士論文の書き方1。進捗・原本箇所・判定理由は対応表を真実源とし、管理画面 `/content/expansion` の原典待ち・要作業・再確認を確認する。

**次**: 別PCで再開するため担当を解放する。[再開手順・実査記録](../plans/DN-0224-source-recovery.md)を読み、原典を確認できた「将来展望」の私有OCR・三層構造図・SNS原稿の修正と検証から進める。原典待ち16論点は、対応表で指定したページの入手・再撮影後に再照合する。確認後に変わった記事のhashは、意味照合をしてから更新する。

**完了条件**: 全対象に原本ページと再照合根拠があり、必要な制作と検査が成立していること。原本自体の欠損は推測で埋めず、入手・再撮影が必要な書名とページを対応表に残す。他教材に同じ主題があることを原典充足の根拠にしない。

### [DN-0220] 図解整備を公開・配信し資格別KPIの初回実測を閉じる
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-13]

**根拠**: 図解の制作・公開・効果は別々に確認する。EXP-007/008で実験枠2が埋まっており、現時点で新しいSEO改善実験を開始したとは扱わない。

**次**: 制作カードの成果をdevelopへ統合後、公開対象と差分を整理して既存deploy手順で本番反映する。側圧の訂正文案は原投稿IDを示して外部送信の承認を得た後に投稿・実体確認する。SNSは既存公開/予約SSOTに接続し、公開日を起点に7日観察・28日補助確認を行う。

**完了条件**: 公開URL・投稿ID・公開日・測定窓・取得元を記録し、資格別の実測と次の判断をbusiness reviewへ残す。GSC平均順位とGA4行動、SNSで取得可能な反応、note/ココナラアクセス/販売の範囲を分ける。欠測を0と扱わず、順位・販売への因果は断定しない。

**手順・停止条件**: [実装計画](../plans/DN-0220-diagram-rollout.md)。

### [DN-0186] Windows端末のR2・Google Drive接続を整え、クラウド実体監査を成立させる
タグ: [インフラ・計測] [種類:不具合] [検証:resources:cloud] [起票:2026-09-10]

**起点**: 2026-09-10の実査では、ローカル自動監査のR2資格情報が未設定、rcloneの `doboku-gdrive` 接続も未設定で `npm run resources:cloud` が検査不成立。Driveコネクタ経由では既存vaultの1ファイルを全バイト・SHA-256照合できており、Drive自体の不存在ではない。

1. DN-0135の行15（監査キーの最小権限化）と連携し、このWindows端末の監査に読み取り専用資格情報を設定する。必要なら `scripts/local-storage-verify.mjs` のキー選択を監査専用設定に対応させ、検査目的で書き込み権限を追加しない。
2. 人のOAuthログインでrcloneの `doboku-gdrive` を既存の `doboku-note` vaultへ接続する。接続先は `.claude/config/drive-vault.json` に従う。vaultの重複作成や全量ローカル同期をせず、秘密情報をGit・監査ログへ保存しない。
3. 定期実行と同じ端末・実行環境で `npm run resources:cloud` を実行し、R2・Driveとも選定サンプルの全バイトをストリームで読み、容量とSHA-256を照合する。認証・通信失敗を0件成功やメタデータ照合で代用しない。

**完了条件**: 両保管先で実体検査が各1件以上成立し、選定対象がすべて一致してコマンドがexit 0となる。定期実行からも同じ接続を利用でき、検査件数・日時・結果を確認できること。反復監査は既存の定期運用へ戻す。

**参照**: [ローカル資源運用](../knowledge/reference/local-resource-policy.md)、[アセット保管方針](../knowledge/reference/asset-storage-policy.md)。CIキー整備はDN-0135、このカードは端末の自動監査経路を担当する。

### [DN-0209] 総監R8記述式を公式問題と照合し、再現版の注記・図・解答方針を確定する
タグ: [コンテンツ品質] [種類:不具合] [起票:2026-09-13]

**実体**: [r08-secondary](../../content/site/pe-comprehensive-management/r08-secondary/article.mdx) の冒頭に「公式の問題公表前」「再現に基づく」が残る一方、[日本技術士会の公式一覧](https://www.engineer.or.jp/c_categories/index02022241.html)にはR8記述式が掲載されている（2026-09-13確認）。[公式PDF](https://www.engineer.or.jp/c_topics/011/attached/attach_11991_2.pdf)は3ページ。公式との本文差分は未照合。

**次**: PDF全3ページを目視し、問題文・設問の条件・答案枚数・図a〜rと記事を照合する。差分に応じて独自の解答方針も直し、`source_pdf` と出典を配線してから再現版注記を更新する。図の文章化で関係が落ちていれば公式図を出典付きで補う。

**停止条件**: PDFの取得だけで確定版としない。判読できない箇所は未照合として残す。R8択一式の公式正答照合をやり直すカードではない。

**完了条件**: 全設問・図の照合記録が揃い、問題文と解答方針が整合し、未照合箇所が0になること。対象MDXの構文・リンク・出典検査を通し、公式確認済みの範囲に合う注記へ更新する。

### [DN-0206] 技術士建設部門R8の必須・選択11科目を年度別過去問12記事へ追加する
タグ: [コンテンツ品質] [種類:制作] [Codex候補] [起票:2026-09-13]

**実体**: `content/site/pe-construction/` はR01〜R07の12区分×7年度＝84記事で、`r08-*` は0件（2026-09-13実査）。[日本技術士会の公式一覧](https://www.engineer.or.jp/c_categories/index02022229.html)にはR8必須科目と選択11科目のPDFが揃っている。既存の [R7必須科目](../../content/site/pe-construction/r07-required/article.mdx) と同じ「問題文＋関連する学習先」の無料記事として整備する。

**次**: 必須I・道路・河川海岸・都市計画を先行し、土質基礎・鋼コン・施工計画・環境・港湾空港・トンネル・鉄道・電力土木を続ける。R7の区分slugを継いだ12記事に公式PDFの全設問・選択指示・答案枚数・図表を収録し、既存の科目別 `*-exam-themes` 12記事もR8までの分析に更新して相互リンクする。原本は `ipej-past-exams#令和8年度` で出典を管理する。

**停止条件**: 公式PDFの省略部分を推測で復元しない。noteのR8予想を実際のR8問題・模範解答として流用しない。有料のフル模範解答制作・商品追加は本カードに含めず、資格別note企画SSOTで扱う。

**完了条件**: 12記事すべてについて公式PDFとの問題番号・小問・図表の被覆を確認し、科目別分析12記事からR8記事へ到達できること。対象MDXの構文・出典・リンク検査と `npm run refresh-indexes` を通す。公開反映は `/deploy` の判断に従う。

### [DN-0184] YouTube・SNSの人物／見出しテンプレートを複数ポーズで実装し、既存予約・公開投稿へ反映する
タグ: [SNS・マーケ] [種類:改善] [Codex候補] [検証:check-video-content] [起票:2026-09-08]

**目的**: 「doboku-note先生＋短い極太見出し」の採用方針を生成テンプレートへ実装し、別PCでログイン済みの投稿実体へ反映する。制作・公開の定常運用と6週間計測は DN-0110、このカードは意匠と更新経路の改修を担当する。

**参照**: [SNS画像ポリシー §0・§0.1](../knowledge/reference/sns-image-policy.md)、[キャラクター素材ポリシー](../knowledge/reference/character-asset-policy.md)、[ポーズ台帳](../config/character-poses.json)。制作・QA・投稿スキルはこの共通ルールを参照する。ルールの存在をレンダラーの実装完了とみなさない。

**別PCでの再開順**:

1. このカードと関連ルール・スキル・エージェント定義の差分を同期する。今回のサンプルPNGは元PCの `.tmp/sns-design-mockups/` にあるローカル試作でGit同期されない。見た目の再現は共通ルールを基準とし、比較原本が必要なら [アセット置き場](../knowledge/reference/asset-storage-policy.md) に従いDrive vaultへ引き継ぐ。端末固有の絶対パスへ依存しない。
2. 管理画面「キャラクター素材」（`/gallery/characters`）で用途・配置から候補を選び、同じテーマ「最短工期、どこで決まる？」で、指差し（pointing）・考え中（thinking）・手のひらで解説（explaining）の最低3案を比較する。見出し・配色を揃え、ポーズと配置による差を見られるようにする。必要に応じ笑顔・good-signを締め用に追加し、顔・服装・ヘルメット表記の同一性を確認する。全投稿を指差し1種へ固定せず、問い／解説／締めに合う使い分けを決める。不足する向き・役割だけを新規生成し、目視して既存ポーズ台帳へ登録する。使用前に台帳の `quality` を確認し、要修正素材の透過抜け等を解消する（名称照合の `verified` と画像品質を混同しない）。
3. YouTube通常動画サムネ16:9、Shorts/Reels冒頭9:16、Instagram表紙4:5、Xカード16:9へ展開する。文字は編集可能なデータ、人物は既存素材で保持し、媒体別のトークンと共通レンダラーを改修する。幅360pxの画像と動画冒頭を確認し、見出し・人物・字幕・操作ボタンの重なりを解消する。
4. 元データ／カバー／動画派生物／配信先素材の参照を追跡し、未アップロード分はまとめて再生成する。予定や公開状態はYouTube台帳、IGのstatus/posted、Xのstatusと実機から読む（件数・日時をこのカードへ複製しない）。
5. 既存の `.claude/scripts/youtube/set-thumbnail-uploaded.mjs` は全videoId対象・既定書き込みのため、ID指定・既定dry-run・アカウント照合・変更前後の記録を実装してから選択対象へ適用する。旧Shorts用台帳だけでなくDN-0110の通常動画／Shorts経路も調べ、対象の取りこぼしを避ける。IGは新規投稿フローと既存予約編集を分け、対応項目を実機確認する。
6. 予約分を優先し、公開済みYouTubeはサムネ変更から進める。Instagramの本文／Reelsカバー／本体、Xの編集期限を項目別に確認する。動画本体の再アップロードや投稿の削除・再投稿が必要なものは、URL・反応履歴への影響を示してユーザーの依頼範囲内で扱う。保存後にID・予約日時・公開状態・実表示を再照合し、素材生成だけで外部反映済みとしない。

**完了条件**: 3ポーズ以上の比較を経た媒体別テンプレートが実装され、代表画像／動画の目視と該当機械検査が通ること。適用対象の一覧に「反映・実表示確認済み／変更不可と理由／対象外と理由」が揃い、未対応を完了へ混ぜず、予約重複・意図しない即時公開・投稿履歴の無断削除がないこと。機械検査だけで外部反映を判定しない。

### [DN-0185] 共通仕様書データ公開の計測を立ち上げ、加工受託の入口として評価する
タグ: [インフラ・計測] [収益化] [種類:改善] [起票:2026-09-08]

2026-09-08 に `/standards/data` と `/standards/compare` を本番反映した（DN-0183 は削除）。
公開そのものは実査済み＝4ページ 200・データURL 707 件・`X-Robots-Tag: noindex, follow`・
CORS `*`・canonical・Dataset/DataDownload の構造化データまで確認した。残るのは計測だけ。

1. GSC で `/standards/data` と `/standards/compare` の検出・インデックス状況を記録する
2. GA4 の `standards_data_download` が発火しているか、問い合わせ種別に「データ加工」が入るかを見る
3. 週次・月次レビューで 1・2 を追い、行政からの直接受注は実績が出るまで売上前提にしない

**完了条件**: GSC の索引状況と GA4 のイベント発火を 1 度ずつ記録し、加工受託の入口として
続けるか畳むかを判断したらカードを削除する。公開の実装は完了しているので作り直さない。

### [DN-0135] 人・外部実体が必要な残務
タグ: [収益化] [種類:不具合] [起票:2026-08-25]

この環境だけでは完了できない残務を集約する。weekly の手動キューはこの ID だけを参照し、状態や件数は複製しない。

| # | 残務 | 実体（2026-08-25 照合） | 律速 |
|---|---|---|---|
| 3 | Kindle `e-02` の差し替え | catalog は LIVE 反映済み（2026-08-28・ASIN B0H3GX3HNW）。残＝ローカルの修復済みEPUB（2026-08-12修復・章名article.mdx漏れ解消・epubcheck 0件・check-kindle-epub-leak PASS）をKDPへ差し替える経路が無い。`kdp-publish.mjs` に「LIVE本のマニュスクリプト更新」モードが未実装で、`--dump --page content` の `title-setup/kindle/<asin>/content` は既刊では404（下書き専用パス） | 正しいKDP編集導線（本棚→編集→コンテンツ更新）の特定から必要。KDP 実機。顧客影響がある可能性が高いため優先度を上げて確認すべき |
| 8 | civil-1 一次過去問 公式キー 24 件 | 残＝`h28-a`(19)・`h29-a`(1=No.38)・`h29-b`(4=No.3/12/17/21)。h28-a は 19 件と突出＝official 配列自体の OCR 誤りを疑い、mass-fix 前に第2ソースで再検証 | pre-H30 原典 PDF の入手（touhokugiken.com / dobokujira.com に h29 学科A/B は無し）。**LLM 推測厳禁**・キー番号だけの書き換え禁止 |
| 9 | 過去問 解説・図の要照合クラスタ | 解説＝civil-1 `secondary-construction-plan-past-problems` No.9(1) 記述省略／civil-2 `secondary-r06` 問8 画像未挿入／総監 h21・h22・h28・h30 の 7 問／pe-first-stage 3 問。図は `figure-provenance.md` の `rescan-need-source` 7 図（`r07-a-fig-02` を含む） | 原典照合・外部原典の入手。進捗ビューは admin 記事図版タブ |
| 10 | ココナラ C12 プレミアム週枠の再判断（旧DN-0007） | C12（教材18冊＋添削2テーマ・¥17,000＝2026-09-23 改定）は`weeklyCapacity: 1`で開始。添削は本番顧客への納品実績が無く（S2レビュー0）、初回工数が読めないための暫定値 | 初受注時に`orders-log`の`tensakuMinutes`を実測記録。2〜3件出たら週枠を再判断（判断基準→[ココナラ展開キット.md §5](../../content/note/1級・2級土木/ココナラ展開キット.md)）。実受注が無いと1手も進まない |
| 11 | Gmail転送＋フィルタ設定（旧DN-0017・別PC作業） | ココナラの運営通知は`dobokunotecom@gmail.com`にしか届かずMCPから見えない。ラベル`dobokunotecom`は作成済み、`create_filter`はセッションに未公開のためフィルタ作成は人の作業 | 手順1: `uruhayato373`側でフィルタ作成（To=dobokunotecom・受信トレイスキップ＋ラベル付与）→手順2: `dobokunotecom`側で転送先追加・確認コード承認・転送有効化。完了条件は`label:dobokunotecom`で1件以上ヒット |
| 12 | KDP Select 自動更新オフ A-00〜A-06（旧DN-0089） | note 択一PDF（`n155093f42183`・¥1,980・公開済み）との抵触リスクを安全側に倒すと判断（2026-08-27）。e-02 は Select 非加入方針・A 系列は収録範囲違い（422問論点別 vs 1162問全年度）だが部分集合の可能性が否定できない | KDP 管理画面で A-00〜A-06 の「KDPセレクトへの自動登録」をオフ。**期限=独占明け 2026-10-06 より前（10月上旬）**。10/6 を過ぎて自動更新されなければ制約自体が消滅 |
| 19 | 技術士第一次試験 KDP Select早期解除の回答反映 | D-00／D-03の状態は`scripts/kindle-published/catalog.json`の`notes`を真実源とする。申請受付のローカル証跡は`.tmp/kdp-select-support-result.json`にあり、Amazonからの回答待ち | 回答受信後、KDP本棚で両書籍のSelect状態を実査する。解除済みならcatalogと`content/kindle/strategy.md`へ反映し、noteとの併売可否を確定する。未解除なら回答内容に従い再連絡し、解除確認前に恒常併売を確定しない |
| 13 | LINE 一次→二次ブリッジの器 | 磁石記事・配信台本3通・友だち追加CTA文言は完成済み。残るのは外部アカウントと実URLだけ | LINE公式アカウント開設→`delivery-script.md`を管理画面へ転記→`friend-add-cta.md`のプレースホルダーを実URLへ差し替え、X・note・サイトへ配置 |
| 15 | Cloudflare / R2 認証キーの最小権限化 | 固定90/180日ローテーションの根拠はない。R2監査専用キーの作成手順は`ci-cd-security-hardening.md`に既存 | Cloudflare管理画面で`CLOUDFLARE_API_TOKEN`の実期限・権限を確認し、R2読み取り専用キーを`CLOUDFLARE_R2_AUDIT_*`へ登録。`r2-audit.yml`が汎用キーへフォールバックせず成功することを確認 |
| 16 | コンクリート主任技士の原典待ち問題 | H25 skip 18問・H24 conflict 4問とR6/R7はローカル原典がなく、推測補完できない。詳細は`exam-content-policy.md`の主任技士メモが真実源 | 原典入手後に問題・公式解答表を視覚照合し、復元できた設問だけ追加。解答キーに合わせた本文創作は禁止 |
| 17 | コンクリート診断士 98問＋既存8本＋新規8本の技術内容レビュー | 一次演習98問、既存記述式8記事、サイト`guide-essay`、構造物別の新規8記事と商品は公開済み。レビュー表は`content/note/コンクリート診断士/技術レビューチェックリスト.md` | 公開中の教材を有資格者が技術レビューし、指摘をサイト・note・Kindleの該当原稿へ反映する。原典照合できない数値を推測で補わない |
| 18 | GA4 UIバックアップとbing流入の外部照合 | Data API・週次`metrics-analyzer`・note referral集計・商品別期間効率は稼働済み。GA4 UI CSVは3ユニットとも未成立。最新14日のbingは2,683 usersだが日本比率99.4%・engagement 71.3%で自動bot署名は`flagged:false` | ログイン済みGA4 UIで正式レポート名を確定しfixtureを更新する。Bing Webmasterとdevice・landing・新規/再訪を突合し、件数比だけでbot除外しない。API主経路は継続する |


| 20 | 既存の動画退避物3件のハッシュ不一致 | `check-drive-vault` で `.tmp/video-render/career-komuin-minkan/wav/01-premise.wav`、`gakka-2kyu-hoki/shorts/point-overview-1/thumbnail.png`、`kikinagashi-shunin-suchi/shorts/point-tanni-saikotsu-kuuki-2/meta.json` のvault実体と台帳が不一致。今回制作した137ファイルはクラウドまで全件一致 | 各制作パックの現在の原稿/公開版と照合し、正しい版を確定してから退避し直す。台帳のSHAだけを書き換えない |

**完了条件**: 各行の実体が解消したら行ごと消し、全行が消えたらカードを削除する。

## 🟡 中 — 2〜3ヶ月以内

### [DN-0301] `/links` の OG 画像（og-links.png）の資格数を 9 に作り直す
タグ: [SNS・マーケ] [種類:改善] [起票:2026-09-24]

**起点**: `public/images/og-links.png` は「土木・建設系7資格」、`src/app/links/page.tsx` の openGraph の画像 alt は「8資格」だが、ページの資格カードは RCCM を含む 9 資格。2026-09-24 に本文とメタデータの説明文だけ 9 資格に直した。SNS で `/links` を共有するとリンクカードに古い数が出る。

**やること**: `ogp-prompts.md` の手順（`/ogp-create`）で og-links.png を「9資格」「技術士・施工管理・コンクリート・RCCM」に作り直し、alt も合わせる。

**完了条件**: og-links.png の表記と alt がともに 9 資格になり、`npm run ogp-gallery` で崩れが無い。

### [DN-0298] Google が旧 `/docs/` を正規に選んだ 17 URL を追い、note から張られた分だけ残るならその note 18 本を再公開する
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-24]

**起点**: 2026-09-23 の URL 検査 batch で 17 URL が「重複（Google が旧 `/docs/` を正規に選択）」だった。#598 は note の被リンクが旧 URL を正規に選ばせる一因と見て張り替えたが、17 件のうち 7 件は note から張られていないのに同じ状態で、note の寄与は未検証。note から張られている 10 件を指す公開 note 記事は 18 本（PDF 付き 0）。

**やること**: 次の URL 検査 batch 以降で 17 件の `google_canonical` を比べる。note から張られていない 7 件が新 URL へ切り替わり、張られている 10 件が旧 URL のまま残るなら、その 18 本を `node scripts/note-update-body.mjs --list <list> --commit` で再公開する（PDF 付きが無いので `--reattach-pdf` は不要）。両群とも切り替わる、または両群とも残るなら再公開しない。

**完了条件**: 上の比較を 1 回行い、18 本を再公開した（`check-note-republish` の drift から消えた）か、再公開しないと決めて本カードを削除した。

### [DN-0284] ココナラ出品の文面変更と4テーマ添削の追加（PR #595・#596）について /doc-sync を1回回す
タグ: [エージェント・SSOT] [種類:改善] [検証:check-doc-refs] [起票:2026-09-24]

**起点**: 2026-09-24 に `src/lib/coconala-services.ts`（タイトル変更・`coconala-tensaku-4theme` 追加）と `scripts/coconala-thumb.mjs` を変えた。規約（code ルール「ドキュメント同期プロトコル」）ではコミット前に `/doc-sync` を回すが、そのセッションでは skill を呼べなかったため、運用表（coconala-operations.md）・売上記録の対応表・展開キットは手で直した。

**やること**: `/doc-sync` を2つのマージコミット（`56749ec1f`・`bc9759e50`）の差分に対して1回回し、旧タイトル（「1・2級土木の経験記述を元発注者が診断します」「新形式対応 土木経験記述を元発注者が添削します」）やココナラの出品数・価格表の陳腐化を直す。`.claude/state/coconala/` の実測スナップショットは当時の記録なので直さない。

**完了条件**: doc-sync-auditor の指摘が0件になるか、指摘を適用して `check-doc-refs` が通る。

### [DN-0279] 無料模試とサービス紹介の動画パックを作る（同じ形式の無料版→有料版、申し込み方の実演）
タグ: [SNS・マーケ] [種類:制作] [検証:check-video-content] [起票:2026-09-23]

**起点**: ちゃんさとは (a) 同じ形式の無料模試の動画から note の有料模試へつなぎ、(b) ココナラの申し込み手順と問い合わせ文の例を見せる宣伝専用の動画を出している（[07b_販売動線分析_ちゃんさと_2026-09.md](../../docs/marketing/07b_販売動線分析_ちゃんさと_2026-09.md) §3）。自社の土木84パックには、どちらの型も無い。

**やること**:

1. 1級・2級二次の模試（ココナラ `coconala-{1,2}kyu-moshi-pdf`・note の模試）から問題数を絞った無料版のパックを、級ごとに1本ずつ作る。主CTAは有料の模試。
2. 診断・添削の流れ、納品物の見本、購入前メッセージの書き方（「何で知ったか一言」）を見せるパックを1本作る。主CTAは診断。
3. 新しく作るパックは、冒頭で保有資格（技術士の建設部門・総合技術監理部門、1級土木）を示す。既存パックの再レンダーは DN-0184 の更新経路で扱う。

**時期**: 2級二次（10/25）に間に合わなければ、来季（2027年の一次期→二次期）に回す。

**完了条件**: 3パックが `video-pack.json` を持ち、`video-content-policy.md` の QA を通って公開予約されている。

### [DN-0269] note の原稿と公開記事のずれ（本文145・タグ136・素材197）を解消し、古いずれを CI で止める検査を入れる
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-23]

**起点**: 2026-09-23 の `check-note-republish` で、本文145本（総監117本）・タグ136本・素材197本が原稿と公開記事でずれていた。検出は週1回の note-live-audit（月曜・報告のみ）で、ずれが何日残っても止まらない。同日、別セッションが `note-update-body` の分割一括反映（spec d1／d1b）で本文のずれを解消中。部分更新（`note-update-partial`・`note-append-cta`）は反映済みとして記録しない設計のため、部分更新だけで直した記事もずれとして残り続ける。

**やること**: (1) 一括反映の完了後に `check-note-republish` を再実行し、残ったずれを「本文・タグ・素材」別に解消する（部分更新で直した記事は本文全体の反映で記録を一致させる）。素材（カバー・本文画像・PDF）のずれは、2026-09-19 に完了した V5 カバー全量差し替えが記事ごとの素材記録（`recordPublishedAssetHash`）を付けていないことによる「記録だけのずれ」が大半とみられる。公開 API の eyecatch と V5 生成 manifest の出力を突き合わせ、一致したものだけ記録を付け直す（一致しないものは `note-update-cover` で反映）。タグのずれは `note-sync-tags` が追加しかできず、上限99個に達した記事は原稿に無いタグを消せないため解消できない（例: 土木もくじ n4fde0f62dc20 は公開側に原稿外の11個〔まとめ・現場管理・過去問対策・現場代理人・セコカン・出来形管理・もくじ・5管理・模範答案・建設キャリアアップ・施工管理技術者〕、未反映7個〔1級土木施工管理技士試験・合格体験記・資格・通信講座・施工・地方公務員・土木職〕・2026-09-23 実測）。【2026-09-23 済・PR #586】公開設定画面のタグ削除を `note-sync-tags --prune` として追加し、土木もくじを原稿と一致させた（live 99→95・削除11・追加7）。残りのタグのずれは dry-run の `余分=N` が出る記事へ `--prune --commit` を当てる。【2026-09-23 済・PR #587/#590/本PR】公開913本へ `--prune` を一括適用し、ライブのタグずれ0本（再点検）・`check-note-republish` のタグdrift 136→0（918本 synced）。途中で見つかった大文字小文字の無視・会員限定記事のログイン読み取り・入力できない文字（`-` `.` `/`→原稿を `_` へ置換し check-note-hashtags で停止）・公開 API 403 時の中断・完全一致記事の記録を実装済み。タグ以外（本文127・素材330）は未着手。(2) `check-note-republish` に「原稿の最終変更からN日を超えてずれている記事があれば exit 1」のモードを足し、quality-audit の ops 区分（日次 ops-audit）へ登録する。N は運用上の反映周期（週次の note-live-audit）より長くし、壁時計依存なので ci には入れない。

**完了条件**: `node scripts/check-note-republish.mjs --json` で本文・タグ・素材のずれが0件（または理由付きの除外のみ）。新モードが ops-audit で実行され、検査件数（対象・実検査）を出力し、N日超のずれが0件で緑になる。

### [DN-0268] 土木の有料 note 記事末尾の合格ラボ添削 CTA の横に、ココナラ単発添削の案内を並べるか決めて配線する
タグ: [収益化] [種類:改善] [起票:2026-09-23]

**起点**: 2026-09-23 に「添削はココナラ（単発）と合格ラボ（毎週）の両方を維持し、note から導線を置く」とユーザーが決め、無料記事3本と土木もくじに導線を置いた（ココナラ展開キット.md §2 決定ログ）。一方、土木二次の有料記事は `wire-note-paid-cta.mjs` が末尾（有料域）に合格ラボの添削 CTA を置いており、「答案を書き換えた直後に第三者の目がほしい」購入者に最も近い位置だが、ココナラの単発添削は並んでいない。公開中の有料記事は約250本あり、全文置換での反映は有料境界の事故の実績がある（reference: note 有料境界の事故）。

**やること**: まず有料記事の購入者の多いマガジンに絞るか全件かを決める。配線は `wire-note-paid-cta.mjs` の会員 CTA ブロックへココナラの一文とカードを足す形にし、ライブ反映は `note-update-partial` の insertAfter で有料境界を動かさずに行う（全文置換は使わない）。

**完了条件**: 対象記事の原稿と公開記事の両方にココナラの案内があり、`node scripts/wire-note-paid-cta.mjs --check` が通る。反映後30日のココナラ添削・診断の閲覧と注文を kpi-log で読む（欠測は0と扱わない）。

### [DN-0263] サイトの口頭試験・RCCM記事から新しいココナラ商品へ導線を配線し、送客クリックを読めるようにする
タグ: [収益化] [種類:改善] [起票:2026-09-23]

**起点**: 2026-09-23 に RCCM 択一 PDF と技術士口頭試験の2商品を出品したが、`src/lib/offsite-cta.ts` の対応表に無く、サイトからの導線が無い。サイト→ココナラのクリック（`data-cta="coconala"`）は集計しておらず、送客の寄与は判断できない（09_販売チャネル競合分析.md §D7）。口頭試験の受験者（HARM は A）が筆記合格発表（11月上旬）後に準備教材を探す場面で届けたい。

**やること**: 口頭試験の無料記事と、公開後の `/exam/rccm/` の記事を offsite-cta.ts の対応表へ加える。GA4 で cta=coconala のイベント件数を取る経路を確かめ、週次レビューが読む指標へ加える。

**完了条件**: build 後の該当ページの HTML に `data-cta="coconala"` のカードがある（curl で確認）。GA4 の取得でイベント件数が出て、0件と未取得を区別して表示できる。

### [DN-0256] V5 カバー未反映の保留 12 記事を公開後に差し替える（予約 7・下書き 3・noteId 無し 2）
タグ: [コンテンツ品質] [種類:定期] [起票:2026-09-19] [期日:2026-10-05]

**起点**: V5 カバー全量差し替え（記録 `.claude/state/note/cover-rollout/2026-09-17.json`・09-19 完走）は公開済み 856/858 に反映したが、計画時に予約公開中・下書き・noteId 無しだった 12 本（`live.articles.held`）は対象外のまま。予約分（会員 W8〜W11・学科10・添削01 等）は予約時の旧デザインのカバーで go-live する（W8 は 09-19 に公開済み）。マガジン側の保留 2（`civil-1-anki` / `civil-2-anki` の `_cover.png`）は単発記事の名残で対象外。

**やること**: 各記事の公開後に `DOBOKU_PW_MIN_FREE_MB=1024 node scripts/note-update-cover.mjs --article <path> --commit`（8GB Mac は環境変数必須・ログイン済みプロファイル）。まとめて回すなら `npm run note-cover-rollout -- plan` → `run` で held が解消した分だけ拾える。マガジン内 ¥100 記事は「更新する」未検出で CLI は fail になるが editor がカバーを先に live へ書くため API で eyecatch 変化を確認すれば完了扱い（09-19 実測 2 本）。

**完了条件**: 12 本の live eyecatch が V5（`generated/manifest.json` の hash）と一致し、記録 JSON の held が 0。

### [DN-0251] dark モードの色コントラスト不足 29 箇所を直し、a11y ベースラインをゼロへ締める
タグ: [コンテンツ品質] [種類:不具合] [検証:test:e2e:a11y] [起票:2026-09-17]

**起点**: axe（WCAG 2.1 AA）を代表 8 ページ×light/dark で回したところ、色コントラスト（serious）が 29 ノード。critical（検索の消去ボタンに名前なし）と scrollable-region-focusable は同 PR で修正済み。コントラストは `e2e/a11y-baseline.json` にラチェットとして固定し、悪化だけ止めている。

**実測**（`.tmp/axe-contrast.mjs`・本番）:
- dark: `bg-brand` + `text-white`（brand が dark で `#93b8e0` に反転）= 2.06 — 「note 限定」バッジ・note CTA アンカー（r06 ×12・alarp ×3）
- dark: バッジ `text-white` on `#80858f` = 3.7 — KW 記事右上の管理分類バッジ・textbook の章バッジ（×4）
- dark: `--color-positive` 系 `#86efac` + `text-white` = 1.4 — keiken-charcount の判定ピル
- light/dark 共通: `--hero-cta-button #12886f` on white = 4.39（要 4.5）— secondary/r06 の CTA ×6
- light/dark 共通: `--ink-muted #697080` on `#edf3fa` = 4.44 / dark `#80858f` on `#1d2836` = 4.02 — 章番号・ラベル小文字

**やること**: dark で `text-white` を使うバッジ／CTA は `dark:text-[var(--ink-strong)]` か背景を濃色トークンにする（design-system.md の色選定・page-design-builder → /design-review）。`--hero-cta-button` と `--ink-muted` は数値を 1〜2 段だけ濃くして 4.5 を満たす。直したら `npm run test:e2e:a11y:baseline` で減った件数を commit（増やす更新はしない）。

**完了条件**: `e2e/a11y-baseline.json` の全キーが `{}`（serious 0）で `npm run test:e2e:a11y` が緑。

### [DN-0238] ビジュアルリグレッション（Playwright toHaveScreenshot）を代表テンプレに入れる
タグ: [コンテンツ品質] [種類:改善] [起票:2026-09-17]

**起点**: 2026-09-17 の CI 監査（第 1 バッチ #519 で axe・本番スイープ・夜間 E2E を導入）で残った最大の穴。CSS・Tailwind 変更によるレイアウト崩れは lint-ui でも axe でも捕まらず、Tailwind の transform 変種が本 build で無効だった件（memory）もこの種だった。

**やること**: `e2e/a11y.spec.ts` と同じ代表 8 テンプレ（home / 資格ハブ / KW 記事 / 過去問 / テキスト / 基準章 / ツール / 検索）と `/links`（SNS のプロフィールから来る入口・2026-09-24 に 1 画面目の密度を直した）× desktop・mobile × light/dark の約 32 枚を `toHaveScreenshot` で固定。アニメーション無効化・GA 等の外部要素をマスク・`maxDiffPixelRatio` は 0.01 から。基準画像は CI（ubuntu・同一フォント）で生成して commit し、ローカルは `--update-snapshots` を使わない運用を docs/operations/12 に書く。

**完了条件**: PR の E2E で意図しないレイアウト差分が赤になる。基準更新の手順（CI の artifact から取り込む）が docs にあり、1 回の意図的な UI 変更で更新を実演済み。

### [DN-0239] 日本語校正（textlint + prh）を変更ファイルだけのラチェットで導入する
タグ: [コンテンツ品質] [種類:改善] [起票:2026-09-17]

**起点**: 1,267 記事の表記ゆれ（施工/施行、〜ヶ所/〜か所、全角英数、機種依存文字）と冗長表現を人手では追えない。既存の check-mdx は構造（Callout・表・リンク）を見るが日本語そのものは見ていない。

**やること**: `textlint` + `textlint-rule-preset-ja-technical-writing` + `textlint-rule-prh`（自前辞書 `.textlintrc` / `prh.yml`。土木用語の正表記を最初は 30 語程度）。全件は初回ノイズが多いので、**pre-commit と CI では staged / PR diff の MDX だけ**に掛ける。全件は `report` として週次で件数を出し、辞書を育てながら漸減させる。数式・コード・frontmatter は除外設定。

**完了条件**: `npm run lint:ja`（変更ファイル）が quality-audit `ci:true`、`lint:ja:all` が report で件数を出す。誤検知を潰した辞書と除外が commit され、直近 2 週間で偽陽性による差し戻しが 0。

### [DN-0240] Lighthouse CI を PR に入れ、a11y / SEO / best-practices をゲートにする
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-17]

**起点**: PSI は本番の事後計測（毎日 22 URL・CrUX）で、マージ前に LCP 画像肥大や a11y スコア低下を止める手段が無い。

**やること**: `@lhci/cli` を e2e.yml と同じ build 成果物（`npm run serve`）に対して 3〜4 ページ（home / KW 記事 / 過去問 / ツール）で実行。`categories:accessibility ≥ 0.95`・`seo ≥ 0.95`・`best-practices ≥ 0.9` は error、`performance` は lab の揺れが大きいので warn（値は job summary）。`lighthouserc.json` を SSOT にし、PSI 側の閾値（psi-config）と二重管理しないよう役割を commands.md に書く。

**完了条件**: PR で lhci が走り、a11y/SEO/BP のしきい値割れが赤になる。performance は warn のみで、揺れによる赤が 2 週間で 0。

### [DN-0241] JSON-LD の @type 別必須プロパティを check-seo-build で検証する
タグ: [インフラ・計測] [種類:改善] [検証:check-seo-build] [起票:2026-09-17]

**起点**: check-seo-build は JSON-LD の parse エラーは見るが、`FAQPage` / `Article` / `BreadcrumbList` / `HowTo` の必須キー欠落（リッチリザルト落ち）は見ていない。

**やること**: `scripts/check-seo-build.mjs` に `@type` → 必須キー表（Article: headline/datePublished/author、FAQPage: mainEntity[].name/acceptedAnswer.text、BreadcrumbList: itemListElement[].position/name/item 等）を足し、欠落を error、推奨キー欠落を warn にする。表は Google の構造化データ ガイドの必須欄を根拠にコメントで URL を残す。

**完了条件**: `npm run check-seo-build:ci` が必須キー欠落を 1 件も残さず緑。意図的に headline を消したフィクスチャで赤になる回帰テスト付き。


### [DN-0231] Mac のGit保守を導入し、次回clone時にpartial cloneを使う（履歴は書き換えない）
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-14]

**起点**: 旧カード「git 履歴の次回切り詰め（`size-pack` 1.05 GiB の回収）」は 2026-09-14 に「履歴は書き換えない」と決めて廃止した。代わりに clone 側を軽くする。Windows は 09-14 に `git maintenance start` 済み（`maintenance.strategy=incremental`）。`.git/lfs` の孤児 2.25 GB（参照 0）は同日に削除済み。

1. Mac: `npm run disk-hygiene:install` でGit保守も登録する。次回clone時は `git clone --filter=blob:none` を使う。既存cloneへのpromisor設定と `git gc` だけでは到達可能な履歴blobは落ちない。現checkoutの自動置換や履歴切り詰めはしない。根拠: [Git gc](https://git-scm.com/docs/git-gc)、[partial clone](https://git-scm.com/docs/partial-clone)。
2. 両 PC: `git count-objects -vH` の `size-pack` と `garbage`、`git config maintenance.strategy` を `asset-storage-policy.md` §8 の末尾へ実測として 1 行記録する（Windows の 09-14 実測: size-pack 1.11 GiB / garbage 2 = 8.45 MiB の tmp_pack）。

**完了条件**: Macで保守登録を確認して両PCの実測を記録する。次回clone時のfilter確認はcloneを更新する際に行い、既存packの強制削除を完了条件にしない。


### [DN-0233] Mac 端末の初期設定を今回の設計に合わせて揃える（hygiene・pre-commit・dotfiles・memory リンク・MCP）
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-14]

**起点**: 2026-09-14 の設計（`~/.claude/plans/greedy-jingling-boole.md`）で個人設定は private dotfiles + symlink、memory は repo `.claude/memory/` を junction/symlink、user-scope MCP `github`/`filesystem` は削除、と決めた。Windows は同日に実施済み。Mac は未着手。

Mac で行う（各 1 回・順に）: (1) `git pull` で Windows 対応・設定一本化の PR を取り込む、(2) `npm run disk-hygiene:install` と `npm run pre-commit:install`、(3) dotfiles の `bin/link.mjs --host mac` で `~/.claude/settings.json`（`cleanupPeriodDays: 7` 入り）と `~/.codex/config.toml` を張る、(4) `node scripts/setup-memory-link.mjs` で `~/.claude/projects/-Users-minamidaisuke-doboku-note/memory` を repo へ向ける（既存の実ディレクトリは `memory.bak-*` に退避される）、(5) `claude mcp remove -s user github filesystem`、(6) DN-0231 の partial clone。

**完了条件**: Mac で `npm run check-disk-hygiene` が FAIL 0、`claude mcp list` に github/filesystem が無い、memory リンクが symlink で `MEMORY.md` の行数が repo と一致、`npm run check-codex-compat` 緑。

### [DN-0227] YouTube 公開照合の `recorded_but_gone` 6 件を切り分け、台帳を実体に合わせる
タグ: [SNS・マーケ] [種類:不具合] [起票:2026-09-14]

`verify-yt-status`（CI 週次）が 08-28 以降ずっと同じ 6 件を「記録はあるがライブから消えた」と返している: r03-pack-01-q1（pJE0G113lWE）・r03-pack-03-q1（v78PwwNo_fQ）・q2（l-aSQXfwOq8）・q3（AxGWdocgSZ0）・q4（GZzG6IqyXyI）・r03-pack-04-q1（V9iQe4iQcI0）。09-09〜10 に旧動画の削除・置換フェーズを整備しているので、置換で削除された旧 ID なのか、記録側の誤りなのかを YouTube Studio か Data API で確認し、置換後 ID への更新か削除記録のどちらかを台帳へ書く。

**完了条件**: `.claude/state/yt-verify/latest.json` の `recorded_but_gone` が 0 で、6 件それぞれの処置（置換 ID／削除日）が台帳に残っていること。認証が要るので Mac か CI（verify-yt-status.yml）で行う。

### [DN-0228] PSI の field(CrUX) が全 URL で null の期間を「判定不能」として機械で示し、判定規則を固定する
タグ: [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-09-14]

2026-08-18 以降の全 psi-batch で 22/22 URL の `field_data` が null（`field_availability.url_level` / `origin_level` とも false）。W36 の週次レビューがこれを「復旧」と誤記した（measurement-incidents.md 2026-09-14）。実害判定（Critical）は field でしか立てられないので、この期間は判定不能であることを人が読み違えない形にする。

1. `fetch-psi-data` の batch サマリ（または weekly-metrics の psi 節）に「field 非 null URL 数 / 対象数（url_level・origin_level 別）」を出力し、週次レビューの PSI 節はその機械値を転記する
2. `.claude/config/psi-config.json` の `judgment` に「field 無し期間の扱い」を明文化する（lab は直近 5 バッチ中央値・重大度は Medium 上限・復旧報告は非 null になったバッチ名と URL 数を併記）
3. origin レベルも無い＝CrUX の母数不足の可能性が高いので、対象 22 URL の見直しか、母数のあるトップ・ハブに絞るかを判断して記録する

**完了条件**: 週次レビューが機械出力から field 件数を転記でき、field 無し期間の判定規則が psi-config と measurement-incidents.md で一致していること。

### [DN-0230] 週次レビューの申し送りが台帳へ届かない構造を塞ぐ（振り分けの必須化＋削除時の抽出ゲート）
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-09-14]

`/weekly-review` の出口は `docs/reviews/weekly/*-review.md` の「来週への申し送り」と `/weekly-plan` の Must/Should/Could までで、`.claude/todo/weekly.md` を書く `/plan-weekly` はそれを読まない。旧レビューの削除も `check-handoff-extraction` の対象外（`docs/handoffs/` だけ）なので、前送りの漏れを機械が止めない。2026-09-14 の W37 レビューで、申し送り 5 件に台帳上の居場所が無いことを実測。

1. weekly-review SKILL の Phase 4 に「申し送りの各行を backlog 起票／weekly 定常運用／既存 ID・Issue・実験への接続 のいずれかへ振り分け、振り分け先をレビューに書く」を必須化する（skills-guide の更新は doc-coupling が要求）
2. `scripts/check-handoff-extraction.mjs` の抽出ゲートを `docs/reviews/weekly/*.md` の削除にも適用する（削除される本文の申し送り行と DN-ID が backlog か最新レビューに残っているかを検査）。回帰テストを `tests/` に置く

**完了条件**: 1・2 に回帰テストがあり、旧週レビューを抽出せずに削除するコミットが pre-commit で止まること。

### [DN-0225] `check-external-write-orphans` が取得失敗を数えずに「✓ 痕跡なし」を返す偽 PASS を直す
タグ: [エージェント・SSOT] [種類:不具合] [Codex候補] [起票:2026-09-14]

2026-09-14 の週次レビューで、直近 30 日の失敗 run 9 本のうち 5 本の取得が `Proxy Authentication Required` で失敗したまま「外部成功 × 記録失敗 の痕跡なし」を exit 0 で返した。取得失敗は warning に流れるだけで検査数に反映されず、社内プロキシ配下では常に部分不成立の緑になる（CLAUDE.md §9「検査ゼロを PASS と呼ばない」の型）。

**完了条件**: 対象 run 数・実検査数・取得失敗数を必ず出力し、取得失敗が 1 本でもあれば「検査不成立（N/M 取得失敗）」を明示して exit 2 にする（全件失敗と 0 件対象も区別する）。取得失敗を再現する回帰テストを付ける。

### [DN-0207] 技術士一次・基礎科目の解析を途中式から学ぶ計算ガイド3本を作る
タグ: [コンテンツ品質] [種類:制作] [Codex候補] [起票:2026-09-13]

**実体**: 技術士一次には科目別ガイド6本・年度別過去問39本があるが、独立した計算手順ガイドはない（2026-09-13実査）。[基礎科目ガイドの3群](../../content/site/pe-first-stage/guide-basic-subject/article.mdx) はテーマと選択戦略を説明し、途中式は [R7基礎科目](../../content/site/pe-first-stage/r07-basic/article.mdx) などの個別設問に分散している。解説自体の欠落とは扱わない。

**次**: `pe-first-stage` のguideとして、①行列・ベクトル（逆行列の検算、内積・勾配）②微積分・数値解析（偏微分、ニュートン法、台形則・シンプソン則）③電気回路（合成抵抗、対称性、電流の立式）の3本を作る。R01〜R07から各テーマに該当する実際の問題番号を拾い、前提知識→例題の途中式→誤りやすい操作→既存過去問での練習へつなぐ。基礎科目ガイドと引用した年度記事からもリンクする。

**停止条件**: 総監の待ち行列・信頼性・工程管理を重複新設しない。過去問の解説を丸ごと並べ替えるだけにせず、初見の条件でも立式・検算できる説明を加える。取得できない原典や市販解説の推測転載で補わない。

**完了条件**: 3記事それぞれに独自例題2題以上と2年度以上の実在問題へのリンクを備え、計算結果を代入・逆算等で確認する。KaTeX描画・モバイル幅・対象MDXの構文・出典・リンク検査と `npm run refresh-indexes` を通す。

### [DN-0208] 技術士一次の令和元年度再試験を基礎・適性・建設の3記事へ追加する
タグ: [コンテンツ品質] [種類:制作] [Codex候補] [起票:2026-09-13]

**実体**: [公式一覧](https://www.engineer.or.jp/c_categories/index02021.html)は令和元年度と同年度の再試験を別掲載している。既存の [r01-basic](../../content/site/pe-first-stage/r01-basic/article.mdx)・`r01-aptitude`・`r01-construction` は通常回の `attach_6834_*` を参照し、siteには再試験・`attach_7102_*` の収録がない（2026-09-13実査）。原典は再試験の [基礎](https://www.engineer.or.jp/c_topics/007/attached/attach_7102_1.pdf)・[適性](https://www.engineer.or.jp/c_topics/007/attached/attach_7102_2.pdf)・[建設](https://www.engineer.or.jp/c_topics/007/attached/attach_7102_11.pdf)。

**次**: [公式正答一覧](https://www.engineer.or.jp/c_topics/004/004106.html)の「令和元年度（再試験）」と対応づけ、既存通常回を保持して別slugの3記事を作る。基礎30問・適性15問・建設35問を原典と突合し、各選択肢の独自解説と必要図を揃える。年度一覧・科目ガイドでは「13年度＋R1再試験」と区別し、記事索引・PWA問題生成が同年度の別回を落とさないことを確認する。

**停止条件**: 通常回の記事・正答キーを上書きしない。公式PDFで省略された問題は推測補完せず、その範囲を明示する。DN-0135の既存問題の原典待ちとは別対象。

**完了条件**: 3記事・計80問について収録または公式省略の理由が揃い、収録問題の正答を再試験の公式表と全件照合する。通常回とのslug・問題ID衝突0、対象MDXの構文・出典・リンク検査と `npm run refresh-indexes` を通す。PWAが未対応なら必要な変更を含めてから完了とする。


### [DN-0261] 転職アフィリ第2波の効果を EXP-008 の wave-2 基線で再計測する
タグ: [収益化] [種類:改善] [起票:2026-09-22] [期日:2026-10-20] [検証:report-career-funnel]

2026-09-22 に第 2 波を出荷した（サイト新設 4・改稿 5・note 5・公務員土木クラスタ）。第 1 波（EXP-008・2026-09-08）の判定は DN-0120 で **継続（追加投資なし）** と裁定済みで、理由と残る問いは [affiliate-operations.md](../knowledge/reference/affiliate-operations.md) の裁定ログ 2026-09-22 にある。

deploy から 28 日後に、`npm run report-career-funnel` を **wave-2 基線** `.claude/state/metrics/affiliate/career-funnel-baseline-2026-09-16.json`（2026-09-22 凍結・GA4 窓 08-20〜09-16＝出荷直前） と比較する。第 1 波の 08-12 基線とは別ファイルで、混ぜない。afb の確定成果は `afb-outcomes-latest.json` を併記する（鍵登録後）。

**この期間に答えを出す問い**: 11 click で確定成果 ¥0 だった件について、a8mat ピクセルが実際に発火しているかを本番 HTML で確認する（`curl` で対象ページの `a8mat=` がちょうど 1 件＝配置は既に検証済み。未検証なのは発火そのもの）。原因と決めつけずに観測する。

**完了条件**: wave-2 基線との差分（表示・クリック・面別）と afb/A8 の確定成果を並べた記録を裁定ログへ追記し、(1) 継続 / (2) 露出を絞る / (3) 撤退 を再判定している。

### [DN-0110] 承認済み動画パック112本＋Shorts224本の公開・6週間判定
タグ: [SNS・マーケ] [種類:改善] [Codex候補] [検証:quality:audit:ci] [起票:2026-08-21]

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

2026-09-05のユーザー決定で、QA済みの1級土木66本・2級土木18本・コンクリート技士12本・主任技士16本の通常動画112本と、各パック2本のShorts計224本を公開工程へ進める。通常動画は112本すべて公開済みまたはAPI予約済み。残作業は次の順で行う。

1. 通常動画の残存メタデータを著者主体・AI制作補助表記へ同期し、全件の`videoId`・`publishAt`・CTAを実査する
2. Shorts224本をprivate R2へ配置し、API日次更新後に最大45pack/90本でprivate uploadする
3. 各ShortでStudioの関連動画を該当通常動画へ設定してからAPI予約し、通常動画を含む最大3投稿/日・試験日除外を守る
4. 公開6週間後にShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移から継続・修正・停止を判定する

**制約**: `approved` はユーザーだけが設定する。mp4/wavをGitへ入れない。今回の対象は明示承認済み112パックだけで、技術士総監・建設部門・診断士・IG/X/Threads/TikTokへ承認を波及させない。legacy総監Shorts187本はretiredのまま再開しない。

**完了条件**: 通常動画112本とShorts224本を外部実体で照合し、全Shortsの関連動画・予約日時・著者表記が正しく、全機械・意味ゲートがPASSする。6週間後の継続/修正/停止判断とbaselineを記録したらカードを削除する。


### [DN-0115] PWA買い切り・メール主／LINE補助の収益導線pilot
タグ: [収益化] [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-08-22]

1級土木の無料過去問演習を、**Premium買い切り・note送客・自社リスト**へつなぐ。全1,098問、ログイン不要、`localStorage`進捗、note CTAは無料のまま維持する。Premiumは弱点分析・復習計画・端末間同期などのツール価値に限定し、note商品の本文を複製しない。

**設計SSOT**: [PWA過去問アプリ設計方針 v2](../../docs/products/06_PWA過去問アプリ設計方針.md) ／ [リスト化・自社オーディエンス戦略](../../docs/strategy/10_リスト化・自社オーディエンス戦略.md) ／ [収益化戦略](../../docs/strategy/04_収益化戦略.md)

**ファネル**:

```text
SEO記事・note・SNS
  → 1級土木PWA無料演習（ログイン不要）
  → 2回目完了／間違い蓄積／結果画面
  → Premium案内 + メール学習レポート任意登録 + LINE期限通知任意追加
  → Stripe買い切り
  → Webhookでentitlement付与
  → メールのマジックリンクでログイン
  → 弱点分析・復習計画・端末間同期
  → 記述式／模範答案はnoteへ送客
```

**残作業 — Phase 0 本番計測**:

1. ユーザーが対象差分のdeployを承認した回に、1級土木だけでfake-doorを公開する。技術士一次には表示しない
2. 週次`fetch-metrics.yml`で`ga4-quiz-funnel-*.json`と`quiz-premium-funnel-latest.{json,md}`を取得し、1級PWA利用者100人以上まで待つ
3. `premium_intent / premium_view >= 5%`かつ、GA4 `totalUsers`で購入希望10人以上を確認する。未達なら認証・決済・メール基盤を作らず停止する
4. success gateを満たした場合だけ、Phase 1の費用・保存データ・停止方法を提示してユーザー承認を待つ

**Phase 1 — メールリストpilotとLINE補助（外部サービス承認後）**:

1. メール候補を料金、export、削除、unsubscribe、double opt-in、custom domain、SPF/DKIM/DMARC、Webhook、障害復旧で比較する
2. 最小フィールドを`subscriber_id / email / exam / source / consent_at / consent_text_version / status / unsubscribed_at`に限定し、氏名・勤務先・生年月日・住所を取らない
3. 販促同意は未選択を既定とし、transactionalメールとmarketing配信を分離する。月2回以下、解除とsuppressionを必須にする
4. LINEは無料200通の範囲で1資格・1イベントだけ試す。有料プランへ自動変更しない
5. 30日で`登録率 / 確認完了率 / 開封 / クリック / unsubscribe / PWA再訪 / premium_intent`を集計する

**Phase 2 — Stripe買い切り・マジックリンク・権限（Phase 0成功後）**:

- auth／DBのADRを作り、Stripe test mode、署名検証、冪等なentitlement、購入復元、返金・削除、端末mergeをfixtureとE2Eで検証する。本番Payment Link・実決済・価格公開は別承認
- 最初の有料機能は弱点分析と端末間同期だけ。無料演習と1端末内`localStorage`を壊さない

**Phase 3 — 有料pilotと拡張判断**:

- 1級だけで30日または購入20件まで試し、購入10件、`purchase / premium_view >= 2%`、権限漏れ0、復元100%、対応30分/件以下を合格条件にする
- 未達なら他資格・月額へ広げない。成立時も総監か2級の片方だけを次候補にする

**法務・データ・安全弁**:

- 直接販売前に特商法表記、利用規約、プライバシーポリシー、返金方針、問い合わせ、データ削除・export、未成年購入の扱いをユーザーが確認する。エージェントが法的適合を断定しない
- Secret、Webhook署名、メールアドレス、Stripe customer、LINE user ID、session、magic-link tokenをGit、ログ、GA4、Sentry、CI artifactへ出さない
- 外部サービス登録、DNS、Stripe本番設定、価格公開、実決済、メール／LINE送信、deployは、対象、費用、保存データ、停止・削除方法を提示し、ユーザー承認まで実行しない

**削除条件**:

Phase 3の評価を戦略SSOTへ反映し、資格拡張の可否を確定したらカードを削除する。


### [DN-0026] 土木公務員 SEO 第1期の効果測定（handoff 2026-08-17 抽出）
タグ: [SNS・マーケ] [種類:改善] [期日:2026-09-28]

2026-08-17 に資格ハブ改稿＋1級土木の新設ページを公開・デプロイ済み。測定が残っている:

1. 資格ハブ（`pe-comprehensive-management-public-engineer-qualification-map`）と新設ページ（`civil-construction-1-public-servant-merit`）を GSC で URL 検査し、インデックス状況を記録する
2. **目安 2026-09-14 以降**、公開後 28 日と直前 28 日を比較する。判定の正規表現と基準は [13_土木公務員SEO戦略2026-08.md](../../docs/strategy/13_土木公務員SEO戦略2026-08.md)
3. 次記事「土木公務員に技術士は必要？」の着手可否は 1・2 の結果を見てから判断する（語順違いの類似ページは作らない）

## 🟢 低 — 時期未定

### [DN-0276] X の投稿済みを毎週 CI で確かめる（投稿時に URL を記録し、ログイン不要の oEmbed で照合する）
タグ: [SNS・マーケ] [種類:改善] [起票:2026-09-23]

**起点**: 2026-09-23 に note・SNS の品質を週次の CI で見る仕組みを整えた（PR #589）。X は文字数（未投稿分）を CI ゲートにしたが、**投稿済みがライブに存在するか・本文やリンクが原稿どおりか**は見ていない。`content/sns/x/draft/*/status.json` の投稿済み 170 件のうち、投稿の URL（ID）が記録されているのは 19 件だけで、照合の手がかりが無い。ログイン不要の公開 API `https://publish.twitter.com/oembed?url=<投稿URL>` は、存在する投稿なら 200 と本文入りの JSON、存在しなければ 404 を返すことを確かめた（リダイレクト追従が要る）。Instagram は、CI からのログインが 1 回でセッション切れになり、Graph API 版は Meta の利用制限で待機中なので、今回は対象外（YouTube は既存の週次 `verify-yt-status` がある）。

**やること**: (1) `.claude/skills/social/publish-x/publish-x.ts`（CI の `scheduled-publish.yml` から 1 日数回動く）で、投稿直後に自分のプロフィールの最新の投稿から `/status/<ID>` を読み、本文の先頭が一致したときだけ `status.json` の該当投稿に `url` を書く。取れなくても投稿は失敗にしない（`url: null` と警告）。(2) 週次の CI で、`url` を持つ投稿済みを oEmbed で照合する検査を足す。404 は削除（凍結・手動削除の疑い）、本文にサイトへのリンクが無いのは UTM 落ちとして報告し、`url` の無い投稿済みの件数も出す（検査ゼロを PASS にしない）。(3) 既存の 19 件で先に (2) を動かして判定を確かめる。

**完了条件**: 新しく投稿した X に `url` が記録され、週次の CI が oEmbed で投稿済みを照合して、対象件数・照合件数・異常件数を出す。

### [DN-0271] 総監 設問3国家施策バンクの序章（¥100・有料境界が末尾）の冒頭に「この記事でわかること」を反映する
タグ: [収益化] [種類:改善] [起票:2026-09-23]

**起点**: 2026-09-23 の note 再公開一括処理で、`content/note/技術士総監/magazines/総監記述式-設問3国家施策バンク/00-序章/article.md`（n3eb135ebdff7）だけが反映できずに残った。原稿の変更は冒頭への「この記事でわかること」（太字1行＋箇条書き3項目）の追加 1 か所だが、次の 3 つが重なって既存の道具では安全に入れられない。

- ライブは **¥100 の有料記事で、本文は全部無料で読め、有料境界は末尾**にある（マガジン内の序章を ¥100 にする運用。`check-note-price-consistency` の allowlist が「序章 ¥100」を意図的な価格差として扱っている）。一方、原稿は `notePricing: free` のまま。
- 全文更新（`note-update-body`）は、原稿が無料だと無料記事の手順で進み、「更新する」ボタンを見つけられず中断する（2026-09-23 実測）。原稿を有料にすると境界を見出しの直前へ付け直すので、いま無料で読めている節が有料側へ移る。`--keep-boundary` は本文ブロックが増えると境界が冒頭へずれ、無料プレビューが消える既知の事故がある。
- 部分更新（`note-update-partial`）には、本文の最初のブロックの前へ差し込む操作が無い（`insertBeforeHeadingHtml` は見出しの直前だけ、`replaceElementHtml` は要素の中身だけを置き換える）。

価格は ¥100 のまま維持する（2026-09-23 ユーザー判断）。

**やること**: (1) `note-update-partial` に、指定ブロックの直前へ許可タグの HTML を差し込む操作（例: `insertBeforeBlockHtml`・`beforeNeedle` で一意に特定）を足す。(2) `check-note-boundary` に「有料境界が末尾」の表現を足す（例: `paidBoundary` の予約値）。未定義のまま原稿を有料にすると CI で落ちる。(3) 序章の原稿を `notePricing: paid`・`price: 100`・末尾境界へ直し、(1) で冒頭へ差し込む。反映後に公開 API で冒頭の追加文があり、価格が ¥100 のままであることを確かめてから再公開台帳へ記録する。同じ構成の序章（RCCM 問題III 2026 模範論文集・総監記述式 完全パックの「はじめに」など）があれば同じ扱いにそろえる。

**完了条件**: `node scripts/check-note-republish.mjs --json` の drift に n3eb135ebdff7 が無く、ライブの価格が ¥100・本文冒頭に「この記事でわかること」がある。`check-note-boundary` が緑。

### [DN-0272] 部分更新の `replaceTopCta`／`insertTopCta` が冒頭 CTA を見出しにし、直後の見出しをカードで割る
タグ: [収益化] [種類:不具合] [起票:2026-09-23]

**起点**: 2026-09-23 に公開 note 918 本をライブ API で走査したところ、R8予想問題（n8e92e4673a99）と総監択一式17年分分析（n3bcb87efddad）の 2 本で、冒頭 CTA の文が `h2` になり、その後ろに URL だけの段落・カードが並び、直後の見出し「R8 で何が出るのか」「はじめに」が「R」「は」の段落＋カード＋残りの段落に割れていた（目次から節が消える）。2 本とも同日に全文更新で元の構造へ戻し、API で確認済み。形から見て、`scripts/note-update-partial.mjs` の `replaceTopCta`／`insertTopCta` が「次の `h2` の直前へ caret を置いて Enter→文字入力→URL 入力」する実装で、入力が見出しブロックの中に入ったとみられる（どの実行で起きたかは未特定）。

**やること**: (1) 2 つの操作を、キーボード入力ではなく許可タグの HTML 差し込み（`insertBeforeHeadingHtml` と同じ方式・カードは差し込み後に URL 段落を 1 つずつ cardify）へ置き換えるか、廃止して全文更新へ寄せる。(2) 検証に「CTA 挿入後に対象見出しの `h2` が同じ文言のまま 1 つだけ残っている」「60 字を超える `h2` が増えていない」を足す（崩れたら保存しない）。(3) 走査に使った判定（60 字超の `h2`／`h3`、1〜2 字の段落の直後にカード）を `check-note-live-headings` 等の既存ライブ検査へ入れるか判断する。

**完了条件**: 冒頭 CTA を差し替える部分更新を 1 本で実行し、ライブ API で CTA が引用ブロック、直後の見出しが `h2` のまま、60 字超の見出しが 0 であることを確認できる。

### [DN-0273] 全文更新の「CDN確定待ちタイムアウト」が、挿入した画像がエディタから消えた場合も同じ表示になる
タグ: [収益化] [種類:改善] [起票:2026-09-23]

**起点**: 2026-09-23、`note-update-body` の全文更新で 3 本（R8予想問題・一般部門との違い・総監択一式17年分分析）が確定待ちを 480〜720 秒に伸ばしても毎回「確定=2/3」「1/2」で中断した。一時的にタイムアウト時のエディタ内 `img` を出力したところ、一般部門との違いでは 3 枚挿入したはずが **エディタに 1 枚しか残っていなかった**（blob のまま待っていたのではない）。同じ記事を待ち時間を戻して再実行すると 3/3 で通った。待ち時間を伸ばしても直らない失敗を、待てば通る失敗と同じ文言で出しているため、延長を繰り返す無駄が出た。

**やること**: `scripts/lib/note-images.mjs` の `settleUploads` で、タイムアウト時に「blob のまま」と「エディタに無い」を分けて数えて出力する。無い場合は待ちを伸ばす案内ではなく再実行を案内し、`insertImagesAtPlaceholders` の中断理由も分ける（`img-settle` と `img-lost`）。消える原因（前の画像が選択されたまま次のアップロードで置き換わる等）は、枚数を記録してから切り分ける。

**完了条件**: 画像が消えたときの出力に「エディタに無い n 枚」が出て、中断理由が `img-settle` と区別されて `.claude/state/note-update-aborted.json` に残る。単体テストで 2 つの分類を確かめる。

### [DN-0302] note のリンクカード化が、カードにならない URL 1 本で止まり、後ろの URL が全部素のリンクで公開される
タグ: [収益化] [種類:不具合] [起票:2026-09-24]

**起点**: 2026-09-24、DN-0299 で `経験記述-AI設計-無料`（n0171b3105e2d）を全文更新したら `[4] cardify: processed=40 cards=0` になり、Brain の URL とその後ろの note 記事 URL がどちらも素のリンクのまま公開された。`scripts/lib/note-cardify.mjs` の `cardifyBareUrls` は毎回「最初の bare URL 段落」を探し直すため、埋め込みにならない URL（brain-market.com）が先頭に残り続け、同じ行を上限 40 回（各 10 秒待ち＝約 7 分）打ち直して終わる。公開直後の検査 [5e] はカードの有無を見ないので通ってしまう。

**やること**: カード数が増えなかった段落に目印を付けて次の探索から外し、後ろの URL へ進むようにする。カード化できなかった URL を件数と一緒に出力し、`note-update-body` と `note-publish` の公開後検査で「URL 単独行なのにカードでない」を WARN に出す。直したら n0171b3105e2d を 1 本だけ再更新する。

**完了条件**: 埋め込めない URL を先頭に置いた単体テストで、後ろの URL がカード化される。n0171b3105e2d の公開 API に note 記事 URL（n4fde0f62dc20）のカードがある。

### [DN-0258] macOS ローカルで `npm test` が 2 件だけ赤になる（CI は緑）— realpath と pipe 8192 バイト
タグ: [インフラ・計測] [種類:不具合] [検証:test] [起票:2026-09-20]

**起点**: 2026-09-19 の `quality:audit --ci` ローカル全量で unit-tests が赤。`tests/prune-state-snapshots.test.mjs`「CLI: 一時 repo で --commit が計画どおり unlink し…」は子プロセスの JSON 出力が 8192 バイトで切れて parse 失敗（pipe の既定バッファ）、「defaultMemoryTarget: worktree でもメイン作業ツリーの .claude/memory を指す」は `/var/folders/...` と `/private/var/folders/...`（macOS の symlink）の比較で不一致。Linux の CI では両方通るため、ローカルの赤が「自分の変更のせいか」を毎回切り分ける手間になる。

**やること**: (1) 子プロセス出力は `maxBuffer` 明示＋ファイル経由か `spawnSync` の `stdout` 全読みにする。(2) パス比較は両辺を `fs.realpathSync` してから比べる（テスト側・本体側のどちらに置くかは他テストの流儀に合わせる）。

**完了条件**: macOS で `npm test` が 0 fail、CI も緑。

### [DN-0259] `*-diagrams` X カード PNG（098/099・35 枚）が `.gitignore` 下で描画台帳に載らず、ローカルの `check-x-card-render` が恒常赤
タグ: [SNS・マーケ] [種類:改善] [検証:check-x-card-render] [起票:2026-09-20]

**起点**: `.gitignore:417` の `content/sns/x/draft/*-diagrams/img/tweet-*.png` で 098-cem-textbook-diagrams / 099-pe-construction-textbook-diagrams の X カード 35 枚は追跡外。`check-x-card-render`（ci:true）は台帳 `.claude/state/sns/x-card-render.json` と実 PNG を突合するので、CI（PNG 無し）は緑・ローカル（PNG あり・台帳無し）は赤になり、ローカルの `quality:audit --ci` が毎回この 35 件で落ちる（2026-09-19 実測）。`gen-x-card --all --force` で台帳へ載せると今度は CI 側が「台帳にあるのに PNG が無い」になる恐れがある。

**やること**: 検査の対象を「git 追跡下の PNG」に限定する（`git rm --cached` 後の on-disk 件数と同じ「ローカルだけ緑/赤」の型・`git ls-files -z` で列挙）か、`*-diagrams` の ignore をやめて追跡するかを決めて 1 つにする。決めたら `check-x-card-render` の走査元を合わせ、ローカルと CI の結果を一致させる。

**完了条件**: ローカルと CI の `check-x-card-render` が同じ結果（緑）になり、098/099 の 35 枚の扱いが台帳か ignore のどちらかに一本化されている。
### [DN-0242] npm audit を CI の job summary に出す（CodeQL は GitHub 既定セットアップで稼働済み）
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-17]

**起点**: 2026-09-17 の PR checks を見ると CodeQL（Analyze javascript-typescript / python）と Socket Security は **GitHub 側の既定セットアップで既に走っている**（リポジトリに workflow は無い）。残るのは npm 依存の既知脆弱性の棚卸しだけ。静的サイトなので価値は中程度、工数は極小。

**やること**: ci.yml に `npm audit --audit-level=high` を warn（`|| true` で job summary に出し、red にはしない。ERESOLVE 環境で audit fix を自動適用しない）。CodeQL の workflow は作らない（既定セットアップと二重になる）。

**完了条件**: audit の high 以上が PR の job summary に列挙される。

### [DN-0243] 年度表現の陳腐化（「2026 年度」「令和 8 年」）を年替わりで検知する
タグ: [コンテンツ品質] [種類:改善] [検証:check-exam-calendar] [起票:2026-09-17]

**起点**: ガイド・KW 記事に当年度の表現が本文・title・description に多数ある。年明けに一斉に古くなるが、現状は exam-calendar 検査が試験日程の JSON だけを見ている。

**やること**: `business-direction.json`（または exam-calendar）の当年度を真実源に、`content/site/**` の title/seoTitle/description/本文で **前年度以前の年度表現**（「2025 年度」「令和 7 年度」）を warn で列挙する report を作り、年度切替（毎年 1 月）に `ci:true` へ上げる運用を書く。過去問記事の年度（R7 問題）は対象外にするパターンを用意する。

**完了条件**: 年度切替後の最初の週次で、旧年度表現の一覧が出て 2 週間以内に 0 になる。



### [DN-0234] Codex の archived_sessions 1.25 GB を棚卸しして 30 日超を消す
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-14]

**起点**: `~/.codex/archived_sessions` 1.34 GB・`sessions` 65 MB・`plugins` 455 MB（Windows 09-14 実測）。`disk-hygiene.json` の `reportOnly` で「30 日超は手で棚卸し」と決めており自動削除しない。`thread_history_1.sqlite` 725 MB も同居。

**やること**: 30 日超のアーカイブを日付で選んで削除し、`npm run check-disk-hygiene` の `history:*` 行で残量を確認する。Codex 本体の設定に保持期間があればそれを使い、無ければ四半期の棚卸しとして `disk-hygiene.md` §5 に手順を 2 行足す。

**完了条件**: `archived_sessions` が 300 MB 未満、手順が doc にあること。

### [DN-0236] SessionStart の 6 スクリプトから `run()` を export し、1 プロセス内で順次実行する
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-09-14]

**起点**: SessionStart hook は `x-sync-status --dry` / `check-plan-staleness` / `check-backlog-health --due` / `check-git-sync` / `local-resource-audit --quick` / `check-disk-hygiene --quick` の node を 6 本同時に起動する。09-14 の設計で `scripts/session-start.mjs` が `execFileSync` で順次呼ぶ形にしたが、各 script が `main()` をモジュール内に閉じているため子プロセスは残る。

**やること**: 6 本それぞれに `export async function run({ quiet })` を足し（既存の CLI 経路は維持）、`session-start.mjs` を import 呼び出しに切り替える。`check-git-sync` の `git fetch` はそのまま。

**完了条件**: `node scripts/session-start.mjs` の実行中に node プロセスが 1 本、出力は現状と同じ、`node --test tests/session-start.test.mjs` 緑。

### [DN-0180] Drive共通仕様書文字起こし350本とstandards-libraryの関係を整理する
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-09-06]

Drive `文字起こし/共通仕様書/` 約350本は `source-transcript` のrepo対応外で、公開側の
`content/site/standards-library/` と別経路になっている。重複・入力元・更新方向を実査し、公開章記事の
provenanceに必要なもの、監査用にだけ残すもの、台帳対象外でよいものを分類する。削除は別承認とし、
まず `standards-catalog` ID、原本sha256、版面ページまでの対応表を作る。

### [DN-0175] SNS残存画像を公開完了後に再監査する
タグ: [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-09-06]

2026-09-06 のSNS容量監査で、重い動画・音声はDrive退避とローリング削除まで完了した。現時点で
削除せず保持した小容量資産は、IG CEM PNG 48件（4.09MiB・投稿状態とSoT内訳が未確定）、legacy
YouTube thumbnail 32件（2.20MiB・private動画と投稿スクリプトが参照）、Xの旧アカウント／投稿済み
カード104件（約11MiB・Git追跡かつpublisher/checkerがローカル実体を要求）の3群。

**再開条件**: DN-0110 の通常動画112本＋Shorts224本の外部実体照合が完了するか、
`npm run audit-repo-assets`で`content/sns`が500MiBを再び超えたとき。条件前は容量効果に対して
復元経路の改修コストが大きいため着手しない。

再開時は次の順で実査する。

1. IG CEMは`slide-data.json`・caption・statusをパック単位で監査し、完成PNGは既存
   `ig-rendered-image`へ同期、中間PNGは再生成可能性を確認してから削除する
2. legacy YouTube thumbnailは公開／retiredの実体と参照スクリプトを照合し、参照が残る間は保持する
3. Xカードは対象が100MiB以上になった場合だけ、Drive group・使用直前hydrate・検査の台帳対応を
   1セットで実装する。100MiB未満ならKEEP_LOCALを確定してカードを削除する

**禁止**: `content/sns/_assets/`のブランド原本と`content/sns/figures/`の共通図版を退避対象へ含めない。
Drive台帳・vault・Drive APIの照合前にローカル実体を削除しない。

**完了条件**: 3群をOFFLOAD／REGENERATE_DELETE／KEEP_LOCALへ再分類し、必要な同期・自動復元・検査を
反映する。`node --test tests/drive-vault.test.mjs tests/video-cache-prune.test.mjs`、
`npm run check-drive-vault`、`npm run check-command-guidance`を通したらカードを削除する。


> [!note] 🟣 は「ユーザー作業待ち」置き場ではない（2026-08-17 是正）
> 以前は 12 件中 7 件が「ユーザーの手作業待ち」で、判断は済んでいるのに 🟣 に沈殿していた。
> **待ち先が人であることを理由に 🟣 へ置かない**（ユーザーの手が要ることは本文に書く）。tier は緊急度だけを表す。

各タスクは `### タスク名` の直下に `タグ:` 行を置く（運営管理画面 TODO タブと `backlog-sweep-pick` が機械読取り）:

```
タグ: [カテゴリ] [種類:X] [Codex候補] [検証:cmd] [起票:YYYY-MM-DD]
```

| token | 意味 |
|---|---|
| 第1トークン | カテゴリ（コンテンツ品質 / UI・UX / 収益化 / エージェント・SSOT / SNS・マーケ / インフラ・計測） |
| **`[種類:X]`** | X = `不具合` / `改善` / `意思決定` / `制作` / `定期`。tier（緊急度）・カテゴリ（ドメイン）とは**直交する軸** |
| `[Codex候補]` | バルク処理向き（任意） |
| `[検証:cmd]` | 完了を判定できる npm script（任意。あると sweep が自動検証できる）。**下の「[検証:] を付けない判断」を先に読む** |
| `[起票:date]` | 鮮度測定用。**新規カードは必須**（`check-backlog-schema --staged` が止める）。既存の欠落分は返済を強制しない |

**種類の決定規則**（上から順に、最初に当たったものを採る）:

1. 期日で反復発火するか（毎週・毎月・四半期）→ `定期`。**これが付いたら backlog に置くべきでない合図**（backlog は「いつかやる」のマスタ。反復は monthly/weekly か `check-*-due` の担当）
2. 成果物が「決めたこと」そのもので、決まるまで着手できないか → `意思決定`。**このとき tier は 🟣**（🟣 の定義と一致する）
3. 約束・仕様に対して現状が壊れている／欠けているか → `不具合`
4. 新しい成果物（記事・図・書籍・投稿・商品）が増えるか → `制作`
5. それ以外（動いているものをより良くする）→ `改善`

境界の実例: 「薄層377本の散文増補」は既存成果物の質を上げるので `改善`／「BK-09/10 R08予想問題集の生成」は新しい成果物が増えるので `制作`。

選定順序は `node scripts/backlog-sweep-pick.mjs` が出す（**不具合を第1キー・tier を第2キー**・🟣 と `[進行中]` は自動選定しない）。tier がもはや不具合の緊急度を表していない（🟢 に沈む）ため、壊れているものを先に出す。**単独で回せるか（ユーザーの手・対話が要るか）は選定側が本文を読んで判断する**——旧 `[実行:]` 軸は 2026-08-26 に廃止した（起票時の判断をタグに凍結すると陳腐化し、モデルが本文から再導出できるため。doboku / stats47 両方）。

**`[検証:]` を付けない判断**（2026-08-25 に実測して確定・DN-0129 の結論）:

`[検証:]` は「そのカードが片付いたら**赤から緑へ変わる**」npm script にだけ付ける。**空欄のままが正しいカードは多い**——付けようとして 2 度失敗している:

- 2026-08-25 ①: `[検証:]` を持つ 11 枚のうち **5 枚が常時緑**だった（`check-note-paid-cta` / `audit-note-funnel` / `check-career-separation` / `check-doc-refs` / `quality-census`）。いずれも「報告するだけの surfacer」か「別軸の検査」で、完了判定に使えないので token を外した
- 同 ②: 空欄の sweep カードへ付けようと候補 5 本（`check-content-quality` / `check-image-assets` / `check-competitor-scan-due` / `check-script-imports` / `check-note-structure`）を実走したところ**全部 exit 0**。**baseline ラチェット型**（既存違反を台帳に載せて新規だけ落とす）なので、既存債務を返しても緑のままで数字が動かない。付ければ ① で外したのと同じ常時緑が復活する

したがって:

- **新しいゲートを「空欄を埋めるため」に作らない**。別作業が終わるまで構造的に赤いゲートは偽赤で、緑と同じくらい信号を殺す
- **`制作` と `意思決定` には原則付かない**。前者は「成果物が在ること」、後者は「決まったこと」で完了するので、指せる script が存在しない
- 陳腐化の本来の受け皿は `[検証:]` ではなく**定期棚卸し**（`check-backlog-due` → `/backlog-sweep --audit`）。`check-backlog-health` の S7（検証ゲート欠落）は 0 にする対象ではなく、読むための数

---


## 🟣 判断待ち — ユーザーの意思決定が必要

### [DN-0265] コンクリート主任技士のココナラ試験出品（PDF 2件）を本試験後に継続か休止か判定する
タグ: [収益化] [種類:意思決定] [起票:2026-09-23] [期日:2026-12-15]

**起点**: 2026-09-23 に `coconala-cce-essay-pdf`（小論文 PDF5冊）と `coconala-cce-takuitsu-pdf`（択一直前パック PDF3冊）を出品した。ココナラの主任技士の出品は1件・レビュー0で、空白か需要不在かを判別できない（09_販売チャネル競合分析.md §D7 判断5）。受験者が小論文と択一を直前に固めるための教材で、HARMはA。PDF は既存 note 資産から作り、1件ごとの作業はほぼ無い。

**やること**: 本試験（2026-11-29）の後に、2件の閲覧・お気に入り・注文を `npm run coconala-analytics` の kpi-log で確認する。注文があれば来年度も継続し、小論文の添削（人の作業）を足すかを判断する。閲覧はあるが注文0なら本文と価格を見直し、閲覧もほぼ0なら `pauseReason:'retired'` で休止する。

**完了条件**: 判断と根拠（閲覧・注文の実数。欠測は0と扱わない）を ココナラ展開キット.md §2 の決定ログに記録する。

### [DN-0264] 土木二次の本試験後（10/25以降）のココナラ棚と、来季に模試を主役にするかを決める
タグ: [収益化] [種類:意思決定] [起票:2026-09-23] [期日:2026-11-15]

**起点**: 出品22件のうち13件が土木二次向けで、2級本試験（10/25）の後は翌春まで需要が立たない。1級土木二次の模試は、競合が ¥30,000 で992件売れている（本人の YouTube 集客が前提）。これに対し自社の模試は ¥2,500（2026-09-23 に note との価格ルールで ¥3,500 へ改定）で、ココナラの累計販売は3件（09_販売チャネル競合分析.md §D7）。改定後の閲覧と注文も判断材料にする。

**やること**: (1) オフ期の棚を据え置くか、人の作業を伴う出品だけ休止するか（`pauseReason:'absence'`）を決める。(2) 来季（2027年春〜）に模試を主役にするかを決める。年度版の更新表示・見本の公開・価格帯の見直しを、10月までの模試・フルパックの販売と見本ブログの閲覧を見て判断する。

**完了条件**: 判断と理由を ココナラ展開キット.md §2 の決定ログに記録する。実行する場合は作業カードを別に起票する。

### [DN-0257] X Article パイロット: Article 3・1・4 の公開時刻を Codex アプリ側で確定し、告知 Tweet 4 の枠を決める
タグ: [SNS・マーケ] [種類:不具合] [検証:check-x-queue-health] [起票:2026-09-19] [期日:2026-09-28]

**起点**: Codex の 1 回限りローカル自動化は Mac スリープ中に発火せず、起床時（05:30 前後）に遅延実行されて `x-article:publish` の公開窓（15 分前〜120 分後）を外し exit 1 で停止していた（`~/.codex/automations/x-article-*/memory.md`）。Article 2 は 2026-09-20 08:54 に手動復旧で公開済み（https://x.com/doboku373/status/2101459864715510124・台帳へ書き戻し・Tweet 4 は `tweets.md` に解放済み）。同日、`automation.toml` の rrule を直接編集して Article 3 を 09:20 へ寄せたが、Mac 稼働中・アプリ起動中でも 09:37 まで発火せず＝**アプリは toml 直接編集を読まない**。台帳と toml は元の夕方枠（09-20 19:35 / 09-22 20:20 / 09-27 20:15）へ戻してある。

**やること**: (1) 夕方枠のまま出すなら、各予定の 15 分前〜2 時間後は Mac を起こしておく（09-20 19:35 が最初）。早朝へ移すなら **ChatGPT アプリの Automations 画面で時刻を変え、同時に `article-drafts.json` / `status.json` の `scheduled_at` を合わせる**（片方だけ変えると時刻窓で必ず止まる）。(2) 各回の翌朝に `x-article-N/memory.md` と `article_url` を確認し、逸失したら手動復旧 `DOBOKU_PW_MIN_FREE_MB=1024 npm run x-article:publish -- --article N --publish --force`（Claude Code の auto mode は拒否するので人が起動）。(3) Tweet 4 の枠: 元の 09-17 08:00 は逸失し 9 月は全日 3 本で埋まっている。09-22 07:54 の `091#25`（linkless・X キュー投入済）を差し替える案＝X 側の予約を削除 → `status.json` で `replaced` → `x-schedule-guard --max-per-day 3` → `publish-x 094 --tweet 4 <日時> --dry-run` → 予約。見送るなら Tweet 4 を `cancelled` にして台帳を閉じる。

**完了条件**: `npm run check-x-queue-health` の issues が空で、4 本の `article_url` が埋まっている（Tweet 4 を見送る場合は台帳が `cancelled` で issues が空）。

