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

### [DN-0311] ココナラの商品展開を「人の作業が主役・PDF は安い入口」へ組み直し、note・KDP と資格ごとに棲み分ける
タグ: [収益化] [種類:改善] [起票:2026-09-25]

**起点**: 2026-09-25 に、ココナラの競合（`market-research.json` 9/23 取得・関連358サービス、主要ページは当日取り直し）と自社の note（`sales-log.json` 303件）・KDP（`kdp-royalties.json` 7〜8月）・ココナラ（`orders-log.json` 4件・`kpi-log.json`）を突き合わせた。
- ココナラ土木では人の作業が売れ筋。ちゃんさと技師の添削2問 ¥12,000 が316件、4問セット ¥24,000 が156件（件数は半分でも売上額はほぼ同じ）、作成代行はセット ¥32,000 が168件で単発 ¥16,000 の138件を上回る。**「セットは売れない」ではない**
- PDF で売れているのは ¥2,500〜3,500 の安いもの（303geos の解答例186件・予想問題148件）と、YouTube から集客できる出品者のもの（ひげごろー 1級二次模試 ¥30,000・992件。本文で YouTube 経由の購入を案内している）。競合の教材 PDF の中央値は ¥3,750 で、自社の1級フルパック ¥12,000 は外れ値
- 技術士の添削は ¥2,000〜6,500 が中心で、最多でも評価59件。土木より市場が一桁小さい（例: 3619267 総監・建設の論文指導 ¥11,000・販売実績10件）。自社は今ココナラに技術士の商品が無いので直接の競合ではない
- 自社 note は累計 ¥638,840 の約8割が技術士（建設 ¥297k・総監 ¥223k）で、売れ筋上位はパックとマガジン（総監 記述式完全パック ¥77k など）。土木は約 ¥95k。KDP は2か月 ¥7,755 で技術士の模範解答集と一次過去問が中心
- 自社ココナラは受注4件（模試2・フルパック1・添削1）のみで、自社データからは結論が出ない

同日に `coconala-research.mjs` で追加キーワード12個の検索を始め、8個（経験記述 添削／経験記述 作成／施工経験記述／1級土木 二次／施工管理技士 添削／土木 論文 添削／技術士 論文 添削／技術士 二次試験）が完了、「技術士 建設部門」は途中（2/5ページ）で止めた。新しく見つかった関連サービスは45件で、最多でも評価12件（技術士の上下水道・機械・建設の個人添削）。**上位の顔ぶれ（ちゃんさと技師・ひげごろー・303geos・梅村）は変わらない**。残り4キーワードは中断再開できる: `DOBOKU_PW_MIN_FREE_MB=500 node scripts/coconala-research.mjs --query "技術士 建設部門" --query "技術士 総監" --query "土木 模擬試験" --query "コンクリート技士" --max-pages 5 --details 15` → `npm run coconala-research -- --summary-only`。ココナラの外では、土木は独学サポート事務局（作成代行＋添削セット ¥18,900）、技術士は通信講座 ¥69,300〜178,100（スタディング・新技術開発センター・アガルート・SAT・JES）とマッチングサイト（技術士システム）・個人技術士の添削サイトが競合（WebSearch・未精査）。

限界: 競合の販売実績は累計で時期が分からない。技術士の件数は評価件数で代用。YouTube 集客型は例外。季節性（技術士=6〜7月、土木=9〜10月）が混ざる。

**やること**: ユーザーの判断を待つ。案は次の3つ。
1. ココナラは添削・作成（1級・2級の8件）を主役にし、24時間返却と価格（2テーマ ¥6,000）で差をつける
2. 高額 PDF（1級・2級フルパック、1級教材一式＋添削 ¥17,000）の受付を止めるか値下げし、安い模試・完成答案だけを入口に残す。空いた枠は添削・作成の見せ方へ回す
3. 技術士はココナラに出さず note（パック・マガジン）と KDP（安い入口）で売る。来季（2027年4〜7月）に、note 購入者向けの論文添削を ¥5,000 前後でココナラに出すかを改めて決める
決めたら `docs/strategy/09_販売チャネル競合分析.md` に反映し、出品の変更は `coconala-pause` / `coconala-edit --commit` で行う。1級の試験後の扱い（DN-0310）と、2級の試験後の棚（DN-0264）と同時に決めてよい。

**完了条件**: 3案の採否が決まり、09_販売チャネル競合分析.md とカタログ（`src/lib/coconala-services.ts`）に反映され、`npm run check-coconala-live` が全件一致したら、このカードを削除する。

### [DN-0304] 「業務経験 → 資格」カードの GA4 イベントが GA4 の画面に届いていることを確かめる
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-25] [期日:2026-10-09]

**起点**: `/practice/` 全記事と共通仕様書の章末に `QualificationBridge`（立場 3 択）を置いた（実験 EXP-012・方針は [13_土木公務員SEO戦略2026-08.md](../../docs/strategy/13_土木公務員SEO戦略2026-08.md)「非受験層を受験者へ育てる導線」）。本番反映・本番 HTML・GA4 収集エンドポイントへの送信（204）までは確認済みで、経緯は EXP-012 の `actions`。GA4 の画面での受信だけが未確認（ローカルからは Claude in Chrome 未接続・Realtime API のスクリプト無し・アプリ内ブラウザは非表示扱いで送信されない）。

**やること**: GA4 の DebugView かリアルタイムで、`qualification_bridge_impression`（`event_label`=card）と `qualification_bridge_click`（`event_label`=orderer / contractor / qualification-map）が、`cta_placement`（practice-footer / standards-chapter-footer）付きで届いていることを見る。リアルタイムは直近 30 分しか出ないため、見る直前に `node .tmp/ga-qb.mjs`（無ければ本番の `/practice/cost-and-design-change` でカードを表示して 1 回クリック）で送る。届かない場合は、送信は 204 なので GA4 側のフィルタ（内部トラフィック・データフィルタ）を先に疑う。代替として、翌日以降に `fetch-ga4-cta-clicks --by-label` の結果に 2026-09-25 のイベントがあれば受信の確認とみなしてよい。

**完了条件**: GA4 の画面か Data API で 2 イベントの受信を確認したら、このカードを削除する。

### [DN-0306] ココナラ商品画像11枚を Drive vault に登録し、PR #638 をマージする
タグ: [収益化] [種類:改善] [検証:check-coconala-wiring] [起票:2026-09-25] [期日:2026-09-28] [進行中]

**起点**: 2026-09-25 に経験記述サービスを1級・2級に分けて8件をライブ反映した（PR #638・`check-coconala-live` 18/18 一致。旧 DN-0282 の全5テーマ版 `coconala-tensaku-4theme` も 4418735 で出品済み）。PR #638 の CI `build` が `coconala-wiring` で落ちている。2級4件（`thumb-2kyu-tensaku` / `-3theme` / `thumb-2kyu-sakusei` / `-3theme`）の商品画像が Drive vault の台帳に無いため。画像は gitignore 対象で、実体は会社 PC の `.claude/config/coconala/assets/` にしか無い（全5テーマ版・1級作成・プレミアムの差し替え画像と、同日出品のコンクリート主任技士2件 `thumb-cce-essay-pdf` / `thumb-cce-takuitsu-pdf` を含め 11 枚。コンクリート2件は台帳に既存の旧版があるので上書きになる）。会社 PC は Google ドライブ未マウント・rclone の Drive リモート無しで、vault へ書けなかった。

**やること**: 会社 PC で Google ドライブ（Drive File Stream）を起動して G: を見える状態にし、`node scripts/drive-vault-sync.mjs --group coconala-asset` で対象 11 件を確認してから `--commit`。更新された `.claude/state/assets/drive-manifest.json` を PR #638 のブランチ（`feature/coconala-grade-split`・worktree `.claude/worktrees/coconala-grade`）へコミットして push し、CI が通ったら `gh pr merge 638 --merge`。マージ後に worktree `coconala-grade` と `tensaku-qa` を `git worktree remove`。**画像の実体は会社 PC の本体 `.claude/config/coconala/assets/` にしか無い**（gitignore）。別の PC で進める場合は `node scripts/coconala-thumb.mjs --service <id>` で11枚を作り直してから登録する。1級・2級系（`tensaku-set`・`tensaku-4theme`・`sakusei`・`sakusei-4theme`・`2kyu-*` 4件・`1kyu-premium`）の背景は git 追跡の `.claude/config/ogp/backgrounds/civil-1.png`/`civil-2.png`、コンクリート2件（`cce-essay-pdf`・`cce-takuitsu-pdf`）の背景 `bg-civil.png` は vault 登録済みなので先に `node scripts/drive-vault-sync.mjs --pull --path .claude/config/coconala/assets/` で取り戻す。作り直した画像は公開中の出品画像と同じ生成手順だが、差し替え（`coconala-edit --replace-image`）はしなくてよい。**例外: 作成系4件（`thumb-sakusei` / `thumb-sakusei-4theme` / `thumb-2kyu-sakusei` / `thumb-2kyu-sakusei-3theme`）は 2026-09-25 に運営の取り下げを受けて文面を「指導」版へ変え（`scripts/coconala-thumb.mjs`）、Mac で作り直してライブへ差し替え済み。会社 PC にある旧版（「経験記述 作成」）は古いので、登録前に `coconala-thumb --service <id>` で作り直す。**

**完了条件**: `npm run check-coconala-wiring` が PASS し、PR #638 が develop にマージされたら、このカードを削除する。
### [DN-0310] 1級二次（10/4）の後に、1級の経験記述サービスの受付を止めるか来季向けの文面へ替える
タグ: [収益化] [種類:改善] [検証:check-coconala-live] [起票:2026-09-25] [期日:2026-10-03]

**起点**: 1級の添削・作成（`tensaku-set`・`tensaku-4theme`・`sakusei`・`sakusei-4theme`）と `1kyu-premium` の「お願い」欄に「二次検定（10/4予定）に確実に間に合わせるため、10/2受付分まで」と書いている。10/3 以降も受付中のままだと、試験後に買った人へ納品しても意味が無い。2級の試験後（10/25 以降）の棚は DN-0264 で決める。

**やること**: 10/3 に、1級の5件を `coconala-pause` で受付停止にするか、来季（令和9年度）向けの文面へ替えるかを決める。受付停止ならカタログの status と pauseReason を更新し、替えるなら `coconala-listings.json` を直して `coconala-edit --service <id> --commit`（出品中の編集は下書き保存を使わない）。1級の PDF 教材（模試・完成答案・フルパック）の扱いも同時に決める。

**完了条件**: 10/3 中に5件が受付停止か新しい文面になり、`npm run check-coconala-live` が全件一致したら、このカードを削除する。

### [DN-0312] ココナラ room 18351970（1級）の残り3テーマを DM で添削し、購入者評価を返す
タグ: [収益化] [種類:改善] [検証:check-coconala-orders] [起票:2026-09-25] [期日:2026-10-03]

**起点**: 2026-09-25 17:15 に2テーマ（工程管理・安全管理）を正式に納品。購入者は 20:28 におひねり ¥9,000（全5テーマ版との差額として案内した額）を払い、20:45 に承諾して取引はクローズした。クローズ後のトークルームにはメッセージ欄が無いため、同日夜に購入者プロフィールの「メッセージを送る」から DM を送った（運営者操作）。約束は、本人が書いた残り3テーマ（品質管理・環境対策・施工計画）を受け取りから24時間以内に添削・書き直し1回、答案は 10/1 までが目安、迷ったら現場の事実を箇条書きで送れば題材の振り分けを手伝う（答案は本人が書く）。orders-log は serviceId `coconala-tensaku-4theme`・priceYen 15000・`quote` に根拠を記録済み。顧客原稿と文面は Mac の `.claude/worktrees/kosshi/.tmp/coconala/talkrooms/18351970/` にしかない（リポジトリ外）。

**やること**: `npm run coconala-orders` で DM の新着を見る（DM の本文を取るスクリプトは無い＝運営者がブラウザで確認して貼る。トークルームの過去分は `node scripts/coconala-talkroom.mjs 18351970` で再取得できる）。答案が届いたら `/keiken-tensaku <答案> --grade 1` → `civil-keiken-tensaku-qa`（`check-tensaku-reply`）で PASS した文面を DM で返す（24時間以内）。書き直しを1回見たら orders-log の status を revised にし、購入者評価（期限 10/6）を返して closed にする。

**完了条件**: 残り3テーマの添削（と書き直し1回）を返し、購入者評価を送って orders-log の status が closed になったら、このカードを削除する。

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


### [DN-0277] 本文のバッククォートを【〇〇】へ直した note 257 本を再公開する
タグ: [収益化] [種類:不具合] [起票:2026-09-23]

**起点**: 2026-09-23、note 公開ページの目視確認用スクリーンショット（PR #591）の最初の 1 組で、有料記事の本文に「施工量：押え盛土\`〇〇\`m³」とバッククォートがそのまま出ているのを見つけた。原稿の「自分の数値に置き換える箇所」の目印 `〇〇` を、note はコード表記として描画せず記号のまま出す。公開 API で見える範囲だけで**公開 906 本中 248 本**が該当し、原稿では **256 本・約 3,300 行**（`〇〇` 4,762・`〇` 1,682・`〇〇〇` 334 ほか、`L`・`18` など数値も少数）。有料部分は未ログインで見えないので、読者が買った後に見る本文にも多く出ていると考えられる。

**やること**: 原稿は 2026-09-24 に 257 本・7,067 か所を【〇〇】へ置換済み（70820c21f・ユーザー判断で目印は【〇〇】）、再発防止は note-lint 規則 11 と `check-note-inline-code`（CI ゲート・PR #615）で済み。残りは**再公開**だけ。対象は `node scripts/note-republish-plan.mjs` の要再公開（置換した 257 本のうち 9/25 未明の DN-0300 の流しで反映しなかったもの）。PDF 付きが多く日次のアップロード上限（90 件）に当たるので、DN-0274 と同じ手順（`drive-vault-sync --pull` → 15 本ずつ `note-update-body --list <list> --reattach-pdf --commit`・CDN 待ちの中断は単発 `--force-retry`）で数日に分ける。会員特典マガジンの無料記事は `--trial-line-bottom`、`notePricing: membership` はフラグ不要。

**完了条件**: `node scripts/check-note-republish.mjs --json` の要再公開に置換した記事が無く、`npm run check-note-inline-code` が緑。

### [DN-0270] ココナラの出品画像を、一覧で読める型へ作り直す（人が見るサービスにキャラクター・画像に価格を入れない）
タグ: [収益化] [種類:制作] [起票:2026-09-23] [期日:2026-10-20]

**起点**: 2026-09-23 に競合の出品画像と並べて比べた。最大手のちゃんさと技師は、マスコット（ヘルメットの白クマが赤ペンで添削）と大きな「経験記述 添削」の文字、303geos は文字だけ、ひげごろーは本人写真と強い配色。3者に共通するのは太く大きい文字と強いコントラストで、自社の画像（淡い写真の背景に細い文字）は検索一覧の小さい表示で埋もれる。ユーザー決定の方針: 診断・添削・答案作成のような人が見るサービスは、doboku-note 先生を大きく入れ、資格（技術士・元発注者）を添える。PDF 教材はキャラクターを小さく隅に置き、主役は中身（冊子の見本・冊数）。画像には価格を入れない（ココナラは価格を画像の横に出す。9/23 の値上げでサムネ12枚を作り直したうえ、画像の中身は `check-coconala-live` でも検査できない）。最大手と同じ「キャラクター＋添削」の型なので、配色と構図で真似に見えないようにする。キャラクター素材（`.claude/config/character-poses.json`・11ポーズ）に「赤ペンで添削」のポーズが無く、新しいポーズは Codex で作る。Codex の利用上限が解けてから着手する。受験者が購入前に「誰が見てくれるか・何が入っているか」を一目で判断できるようにする画像で、HARMはA。画像の変更で閲覧が増えるかは未検証。

**やること**: (1) 【2026-09-23 済】今の文言（「採点者視点」→「発注者視点で赤入れ」）で8件（shindan・tensaku-set・sakusei・sakusei-4theme・civil-keiken-kit・sokan-bunseki・rccm-mondai3-tensaku・rccm-mondai1-shindan）のサムネを作り直して差し替え、診断・添削のギャラリーも入れ直した（両方2枚）。`check-coconala-live` は20件一致、Drive vault 同期済み。(2) キャラクターの添削ポーズを `CHARACTER-SPEC`（1ポーズ＝1画像）に沿って Codex で作り、`character-poses.json` に登録する。(3) `coconala-thumb.mjs` に「人が見るサービス用（キャラクター大・太字・価格なし）」と「PDF 用（キャラクター小・中身の見本）」の2型を足し、添削・作成から差し替える。差し替えは `coconala-edit --replace-image` で、複数画像の商品（添削は2枚）はギャラリーを入れ直す。2026-09-25 に経験記述サービスを1級・2級に分け（PR #638）、診断・総監・RCCM はアーカイブした。対象は1級・2級の添削・作成8件（`tensaku-set`・`tensaku-4theme`・`sakusei`・`sakusei-4theme`・`2kyu-tensaku`・`2kyu-tensaku-3theme`・`2kyu-sakusei`・`2kyu-sakusei-3theme`。同日に級別の背景色で作り直し済み）と `1kyu-premium`。PDF 教材は3件の閲覧を見てから同じ型へそろえる。

**完了条件**: 差し替えた商品の公開ページで画像枚数が変わらず（ギャラリーを保持）、`npm run check-coconala-live` が全件一致。出品画像の文言に「採点者」を自称する表現が0件。差し替えから30日後に、差し替えた商品と差し替えていない商品の閲覧数を kpi-log で読む。表示回数が非公開（セラーサクセス未加入）でクリック率は取れず、試験日の季節変動も混ざるので、効果は断定しない。

### [DN-0262] 1級・2級土木 第2次検定 記述 Kindle（I・J系）26冊を KDP へ3回に分けて提出する
タグ: [収益化] [種類:制作] [起票:2026-09-23] [期日:2026-10-17]

**起点**: 2026-09-23 にユーザーが「二次記述系も全部Kindle化」と指示し、26冊を制作した。KDP の新規作成は週10冊が上限（`content/kindle/strategy.md`「提出ペースと作成数制限」）。9/23 の i-04 で制限に到達したため（本は作成されていない）、同戦略の I・Jシリーズ節の改定後の計画で出す。2級は 10/25 の試験前に LIVE にしたい。

**やること**: 9/30 に `node scripts/kdp-batch.mjs j-03` を1冊だけ流して回復を確かめ、通れば続けて `node scripts/kdp-batch.mjs j-01 j-02 j-11 j-12 j-13 j-14 j-15 i-04 i-01`。第2弾は 10/7 以降に `node scripts/kdp-batch.mjs i-02 i-03 i-11 i-12 i-14 i-15 i-17 i-16 i-13 i-18`、第3弾は 10/14 以降に `node scripts/kdp-batch.mjs i-19 i-20 i-21 i-22 i-23 i-24`。note 用ブラウザが別セッションで動いているときは `DOBOKU_PW_ALLOW_PARALLEL=1` を付ける。作成数制限で止まったら（exit 2）翌日以降に1冊で再確認する。提出週に既刊の価格改定（再出版）を重ねない。LIVE 化は `node scripts/kdp-publish.mjs --sync-status` で確かめ、ASIN と公開日を catalog と戦略へ記録する。

**完了条件**: catalog の i・j 系26冊がすべて ASIN 付き `live` になること。

### [DN-0308] RCCM 問題I 業務経験論文テンプレと択一論点集 50 問を note で CBT 期間内（〜10/31）に出す
タグ: [収益化] [種類:制作] [起票:2026-09-25] [期日:2026-10-10]

**起点**: 2026-09-15 に問題III 模範論文集（m770bef96b39f）を note 公開し EXP-009 を開始。計画 `~/.claude/plans/rccm-staged-reef.md` T2 の残商品。試験事実の SSOT は `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md`。旧 DN-0237 からココナラ 3 出品を外して再起票した（2026-09-25 にココナラの RCCM 出品はすべてアーカイブし、ココナラからは撤退した）。

**やること**: (1) `rccm-mondai1-template`（¥1,980・`rccm-essay-writer type=mondai1` → `rccm-essay-qa`）を公開し RCCMもくじ nd297cb9b31e0 の問題I 節を実 URL に差し替える。(2) `rccm-takuitsu-yosou-50`（¥1,480・問1〜10 無料・全問自作・`content-qa`＋`note-fact-checker`）。各公開時に `note-magazines.ts` published:true・`sales-recorder.md`・もくじ追記を同一 commit で。

**完了条件**: 2 商品が note でライブ、`verify-note-magazines` が緑、RCCMもくじに 2 節の実 URL。
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

### [DN-0303] 手取り・運営費用・作業時間を週次で記録し、事業 KPI の利益判断を埋める
タグ: [収益化] [種類:改善] [起票:2026-09-25]

**起点**: 2026-09-25 に GA4 計測と事業 KPI（`.claude/config/business-direction.json`）の収益化サイクルを点検したところ、22 指標のうち `netReceipts`（手数料等控除後の受取額）・`costYen`（運営費用）・`workMinutes`（運営作業時間）が全資格・全期間で null だった。CLAUDE.md の判断基準は「受取・費用・運営時間まで確認する」だが、売上（noteRevenue 等）はあっても利益と時間あたりの効率が数字で見えない。記録の入口 `node scripts/business-review.mjs record --input <JSON> --commit` はあるが、何を・いつ・どの粒度で入れるかが決まっていない。

**やること**: (1) ユーザーと決める: 手取りの出所（note・ココナラ・KDP・A8 の各入金明細／プラットフォームの手数料控除後の月次表示）、費用の範囲（サーバー・API・ツール課金・外注・広告）、作業時間の測り方（週次レビューで資格別の概算を手入力／タスク単位で記録）、記録の粒度（週次か月次か・資格別に按分するか）。(2) 決めた方法を business-review.md に書き、週次または月次レビューの手順に記録の工程を入れる。自動で取れるもの（例: ココナラ・note の手数料率から手取りを計算）はスクリプト化する。(3) 1 回目の記録を入れる。

**完了条件**: 直近の完了期間で 3 指標が null でなく記録され、`buildReport` のセルに出る。記録手順が business-review.md と週次/月次スキルにある。

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


### [DN-0307] 日本語が母語でない受験者向けに、経験記述の添削を広げられるか試す
タグ: [収益化] [種類:改善] [起票:2026-09-25]

**起点**: 2026-09-25 の添削受注（room 18351970）をきっかけに、外国人技術者向けの商品展開を検討した。名前から購入者の出身は判断できないので、この1件は需要の根拠にしない。分かっていること: 施工管理技術検定は外国人も受験できるが、日本語のみでふりがな・外国語版は無い。特定技能・技能実習では施工管理に就けず、買い手は技術者として働く人（日本語はある程度できる）。困りごとは試験知識より「日本語で答案を書くこと」（である調・助詞・専門用語の漢字・字数に収める言い回し）と見ている。ココナラの検索では、施工管理の経験記述に絞った外国人向け出品は見当たらなかった（未網羅）。

**やること**: 安い順に進め、前の段で反応が無ければ止める。
1. 1級・2級の経験記述 8 出品の本文と FAQ に「日本語が母語でない方も歓迎。答案の中身に加えて文法・言い回しも直します」を足す（`coconala-listings.json` → `coconala-edit --commit`）。問い合わせ・購入の件数を orders-log のメモで数える。
2. 反応があれば、添削に日本語表現の直し（誤り→正しい形＋理由）を正式に含め、価格を据え置くか上乗せするか決める。
3. よく使う言い回しと専門用語にふりがなと例文を付けた表現集（note か PDF）。翻訳は付けない（技術用語の訳を確かめる手段が無い）。
4. 外国人技術者を雇う建設会社・人材紹介会社への法人向け販売（ココナラの外・営業が要る）は、1〜3 の結果を見てから判断する。

**完了条件**: 1 を入れてから2級二次（10/25）までの反応を見て、2 以降に進むか止めるかを決めたら、このカードを削除する（進める場合は段ごとに再起票）。

### [DN-0298] Google が旧 `/docs/` を正規に選んだ 17 URL を追い、note から張られた分だけ残るならその note 18 本を再公開する
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-24]

**起点**: 2026-09-23 の URL 検査 batch で 17 URL が「重複（Google が旧 `/docs/` を正規に選択）」だった。#598 は note の被リンクが旧 URL を正規に選ばせる一因と見て張り替えたが、17 件のうち 7 件は note から張られていないのに同じ状態で、note の寄与は未検証。note から張られている 10 件を指す公開 note 記事は 18 本（PDF 付き 0）。

**やること**: 次の URL 検査 batch 以降で 17 件の `google_canonical` を比べる。note から張られていない 7 件が新 URL へ切り替わり、張られている 10 件が旧 URL のまま残るなら、その 18 本を `node scripts/note-update-body.mjs --list <list> --commit` で再公開する（PDF 付きが無いので `--reattach-pdf` は不要）。両群とも切り替わる、または両群とも残るなら再公開しない。

**完了条件**: 上の比較を 1 回行い、18 本を再公開した（`check-note-republish` の drift から消えた）か、再公開しないと決めて本カードを削除した。


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

### [DN-0256] V5 カバー未反映の保留記事（W9・W10・学科10 以外の 9 本）を公開後に差し替える
タグ: [コンテンツ品質] [種類:定期] [起票:2026-09-19] [期日:2026-10-05]

**起点**: V5 カバー全量差し替え（記録 `.claude/state/note/cover-rollout/2026-09-17.json`・09-19 完走）は公開済み 856/858 に反映したが、計画時に予約公開中・下書き・noteId 無しだった 12 本（`live.articles.held`）は対象外のまま。予約分（会員 W8〜W11・学科10・添削01 等）は予約時の旧デザインのカバーで go-live する（W8 は 09-19 に公開済み）。マガジン側の保留 2（`civil-1-anki` / `civil-2-anki` の `_cover.png`）は単発記事の名残で対象外。

**やること**: 会員 W9・W10・学科10 は 2026-09-25 に V5 へ差し替え済み（ライブの eyecatch をキャラクター入り V5 で目視確認）。残りの held（W8・W11・添削01・下書き 3・noteId 無し 2 など）は各記事の公開後に、`node scripts/generate-note-covers.mjs <dir名>` で V5 の `img/cover.png` を作ってから `DOBOKU_PW_MIN_FREE_MB=1024 node scripts/note-update-cover.mjs --article <path> --commit`（8GB Mac は環境変数必須・ログイン済みプロファイル）。記事フォルダの `img/cover.png` は旧デザインのまま残っていることがあるので、生成し直さずに差し替えると旧カバーを貼り直すだけになる。`npm run note-cover-rollout -- plan` は作業場 `.tmp/note-cover-rollout/generated/manifest.json` が無いと動かない（9/24 に ENOENT）。マガジン内 ¥100 記事は「更新する」未検出で CLI は fail になるが editor がカバーを先に live へ書くため API で eyecatch 変化を確認すれば完了扱い（09-19 実測 2 本）。

**完了条件**: 保留していた 12 本すべての live eyecatch が V5 になり、記録 JSON の held が 0。

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

**2026-09-24 夜にわかったこと**（ツールは PR #613・#616・#619 で追加済み: `insertBeforeBlockHtml`・`--paid-line-bottom`）:
- エディタには 9/23 に中断した全文更新の下書きが残っていた。「この記事でわかること」は入っていたが、有料ラインが**冒頭（その直後）にずれていた**。`--keep-boundary` で公開していたら、本文のほぼ全部が ¥100 の有料側に入るところだった。下書きの `**` の段落は直し、ラインを本文の最後へ置いた状態で下書き保存までは済んでいる（ライブは元のまま無事）。
- ラインを本文の一番最後に置くと、note は「更新する」を押しても `draft_save` しか走らず、公開されない（エラー表示なし・2 回再現）。

**やること**: ラインを最後の箇条書き（「前提と注意」の 3 項目）の直前に置けば更新できるかを確かめる。そうするとその 3 項目が有料側に入り、無料で読める範囲が今より減るので、**ユーザーに可否を確認してから**流す（`publishLive` の `paidLineBottom` は今は最後のボタンを押す。置き場所を 1 つ前にする変更が要る）。公開できたら、公開 API で冒頭の追加文・価格 ¥100・`**` 無しを確かめ、`recordPublishedHash` で再公開台帳へ記録する。原稿を `notePricing: paid`・`price: 100` にそろえる改修（`check-note-boundary` に末尾境界の表現を足す）は、全文更新をこの記事に使うときまで不要。

**完了条件**: `node scripts/check-note-republish.mjs --json` の drift に n3eb135ebdff7 が無く、ライブの価格が ¥100・本文冒頭に「この記事でわかること」がある。

### [DN-0272] 部分更新の `replaceTopCta`／`insertTopCta` が冒頭 CTA を見出しにし、直後の見出しをカードで割る
タグ: [収益化] [種類:不具合] [起票:2026-09-23]

**起点**: 2026-09-23 に公開 note 918 本をライブ API で走査したところ、R8予想問題（n8e92e4673a99）と総監択一式17年分分析（n3bcb87efddad）の 2 本で、冒頭 CTA の文が `h2` になり、その後ろに URL だけの段落・カードが並び、直後の見出し「R8 で何が出るのか」「はじめに」が「R」「は」の段落＋カード＋残りの段落に割れていた（目次から節が消える）。2 本とも同日に全文更新で元の構造へ戻し、API で確認済み。形から見て、`scripts/note-update-partial.mjs` の `replaceTopCta`／`insertTopCta` が「次の `h2` の直前へ caret を置いて Enter→文字入力→URL 入力」する実装で、入力が見出しブロックの中に入ったとみられる（どの実行で起きたかは未特定）。

**やること**: (1) 2 つの操作を、キーボード入力ではなく許可タグの HTML 差し込み（`insertBeforeHeadingHtml` と同じ方式・カードは差し込み後に URL 段落を 1 つずつ cardify）へ置き換えるか、廃止して全文更新へ寄せる。(2) 検証に「CTA 挿入後に対象見出しの `h2` が同じ文言のまま 1 つだけ残っている」「60 字を超える `h2` が増えていない」を足す（崩れたら保存しない）。(3) 走査に使った判定（60 字超の `h2`／`h3`、1〜2 字の段落の直後にカード）を `check-note-live-headings` 等の既存ライブ検査へ入れるか判断する。

**完了条件**: 冒頭 CTA を差し替える部分更新を 1 本で実行し、ライブ API で CTA が引用ブロック、直後の見出しが `h2` のまま、60 字超の見出しが 0 であることを確認できる。


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

### [DN-0314] Drive vault にあるココナラ商品画像の旧版5枚を、現行の生成画像で上書きするか決める
タグ: [収益化] [種類:意思決定] [起票:2026-09-25] [期日:2026-10-09]

**起点**: vault 台帳（`.claude/state/assets/drive-manifest.json`）の5枚が、今の `scripts/coconala-thumb.mjs` の出力と違う。`thumb-tensaku-4theme` は旧商品「4テーマセット ¥12,000」のままで、公開中の全5テーマ版（¥15,000）と合わない。`thumb-tensaku-set` / `thumb-1kyu-premium` も旧版。`thumb-sakusei` / `thumb-sakusei-4theme` は台帳が「作成」版で、Mac 上の実体は「指導」版（ライブ差し替え済み）。CI（`coconala-wiring`）は台帳にエントリがあれば通るので影響しない。上書きは vault の旧版を消すため、自動モードでは不可逆操作として止まる。

**やること**: 上書きしてよいか決める。する場合は Mac で `node scripts/coconala-thumb.mjs --service coconala-<id> --out .tmp/thumb-verify/thumb-<id>.png` で3枚（`tensaku-set` / `tensaku-4theme` / `1kyu-premium`）を作り直して `.claude/config/coconala/assets/` へ置き、`node scripts/drive-vault-sync.mjs --group coconala-asset --commit` で5枚を登録して台帳を commit する。あわせて会社 PC の worktree `coconala-grade` と `tensaku-qa`（PR #638 はマージ済み）を `git worktree remove` する。

**完了条件**: 上書きする場合は `node scripts/drive-vault-sync.mjs --group coconala-asset --verify` が不一致 0。しない場合は理由をこのカードに書いて削除する。

### [DN-0305] 「業務経験 → 資格」カード（EXP-012）の反応を見て、入口記事を増やすか・文言や位置を変えるかを決める
タグ: [コンテンツ品質] [種類:意思決定] [起票:2026-09-25] [期日:2026-11-30]

**起点**: EXP-012 は非受験層（業務の悩みで来る実務記事・共通仕様書の読者）を資格ページへ送る実験。判定基準は 13_土木公務員SEO戦略2026-08.md「計測と判定」の表にある（クリック 20 件以上かつクリック率 1.5% 以上で継続・拡張）。

**やること**: (1) 2026-10-23 前後に途中経過として `npm run fetch-ga4-cta-clicks -- --by-label` と `-- --by-placement` の `qualification_bridge_*` を読み、立場別・面別の表示とクリックを EXP-012 の `measurements` に記録する（欠測は 0 と扱わない）。(2) 事後窓の終わり（2026-11-26）の後、`npm run measure-experiments` の自動計測とクリック率で判定する。(3) 継続なら、クリックが多い立場の遷移先を強化し、入口記事（臨時協議・ワンデーレスポンス等）を 1 本ずつ追加する。0.5〜1.5% なら文言か位置（記事末 → 本文中間の区切り）を 1 つだけ変えて再計測する。0.5% 未満か表示 200 件未満なら入口記事の追加を止める。

**完了条件**: 判定と根拠（表示・クリック・立場別内訳の実数）を EXP-012 の `result`・`learnings` に記録し、続ける場合は作業カードを別に起票している。

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

