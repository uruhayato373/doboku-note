# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。
> **やる月はカードの `[時期:YYYY-MM]`（または `YYYY-MM..YYYY-MM`）だけで決める**（見出しは重要度で、いつやるかを表さない）。🔴 高・🟡 中は `[時期:]` 必須、`[期日:]` があれば期日の月を含める（`check-backlog-schema` の when-missing・when-due が止める）。🟢 低と 🟣 判断待ちは時期なしを許す。年間ロードマップ（管理画面 計画 ＞ 年間ロードマップ）と月間（`[時期:]` が今月を含むカード）はこの値から自動で決まり、`monthly.md` にタスク表は書かない。月初に `todo-planner` が今月やるカードへ `[時期:]` を付ける・直す。
> **完了したタスクはセクションごと削除する**（記録は git 履歴が持つ。完了サマリ・経緯 prose を本ファイルに書かない）。
> **タイトルが残作業と乖離したら TRIM でなく RESEED**（旧カード削除＋新 ID で再起票）。
> カード品質基準の詳細は `todo-standards.md`「5. 残す条件と削除条件」。

## 凡例

> カード構文・タグ語彙は **stats47 と共通の v3-unified スキーマ**
> （正典: `.claude/knowledge/reference/todo-standards.md`。拡張 token: `[期日:]` `[進行中]`・
> `### [ID] タイトル` の ID は任意）。

| 見出し | 意味 |
|---|---|
| ## 🔴 高 | 重要度が高い（いつやるかは `[時期:]`） |
| ## 🟡 中 | 重要度が中くらい（いつやるかは `[時期:]`） |
| ## 🟢 低 | 重要度が低い。`[時期:]` が無ければ時期未定＝月間・週間に出ない |
| ## 🟣 判断待ち | **やるかどうかの意思決定が未了**（着手できないのではなく、着手すべきか決まっていない） |

## 🔴 高 — 重要度が高い



### [DN-0453] 過去問 iOS アプリを総監・技術士（建設部門）・1級土木でまず試作する
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [期日:2026-11-08] [種類:改善] [起票:2026-09-29]

**起点**: 2026-09-29 に運営者が「iOS も総監・技術士・土木施工管理でまず試す」と判断した。DN-0400（2027-03 判断で保留）を前倒しする。着手条件だった「Web 月収 ¥15,000 以上」は、受取額が月 ¥100k 規模の現状で満たしている（数値は `/metrics/business` で確認）。方針（土台・最初の資格・作り方・競合）は docs/products/07_iOS択一アプリ試作方針.md。アプリは技術士（第一次試験＋総監）と土木施工管理技士（1級＋2級）の 2 本にまとめ、技術士を第一次試験だけで先に出す（試験 2026-11-22）。

**やること**（2026-10-10 に中断。別セッションの整理が済んでから再開する）:
1. 運営者: macOS を 15.6 以降（`softwareupdate` に Sequoia 15.8.1 が出ている）へ上げ、Xcode 26 に入れ替える。2026-04-28 以降、App Store Connect へは Xcode 26（iOS 26 SDK）で組み立てたものしか上げられない。いま入っている Xcode 16.4（iOS 18.6 シミュレータ）は開発には使えるが提出できない。入れ替えのときは iOS 以外のプラットフォームを入れず、16.4 は消す（空きは 2026-10-10 時点で約 21GB）。あわせて Apple Developer Program の登録（個人か法人か）、App Store Connect の有料アプリ契約・銀行口座・税務情報と小規模事業者プログラムの申請（07 §5）
2. `~/doboku-quiz-ios` に Xcode プロジェクト（技術士アプリの target・`Packages/QuizEngine` のローカルパッケージ・`AppData/Gijutsushi/QuizData` のフォルダ参照）を作り、シミュレータで組み立てて動かす。画面・問題表示（WKWebView）・買い切り（StoreKit 2）・通知のコードは書き済みでビルド前。問題データは `npm run build-ios-quiz-bundle -- --app pe --out ~/doboku-quiz-ios/AppData/Gijutsushi/QuizData` で作る（git 管理外）。iOS リポジトリは手元だけにあるので、GitHub の非公開リポジトリを運営者の了承を得て作り、push する
3. 買い切りの確かめは StoreKit のテスト構成（.storekit）と TestFlight の Sandbox で行う。App Store Connect に `com.doboku-note.gijutsushi.full.pe-first-stage`（非消耗型・¥1,480）を作る。サイトのメール登録ページ（DN-0632）ができたら `AppConfig.mailSignupURL` に入れる
4. TestFlight の内部テストで運営者が実機確認し、2026-11-08 までに審査へ提出できれば技術士アプリ（第一次試験のみ）を App Store で公開する（無料ダウンロード＋全年度 ¥1,480）。有料アプリ契約が間に合わなければ無料版（最新年度）だけで先に出す。過ぎたら TestFlight 止まりにする（07 §7）。公開前に出題元の転載条件を確かめる
5. 総監を技術士アプリへ試験設定とデータだけで足し、土木施工管理技士アプリ（1級＋2級）を同じエンジンで作る手順を記録する（2級土木の正規化は DN-0628）

**完了条件**: 技術士アプリ（第一次試験）が TestFlight で動き、総監が試験設定とデータだけで載り、土木施工管理技士アプリを作る手順が記録されている。

### [DN-0615] check-keiken-answer-split が正しい説明文を [D] と誤検知して develop の CI が赤い（経験記述の書き方 563 行）
タグ: [領域:サイト] [時期:2026-10] [種類:不具合] [起票:2026-10-09]

**起点**: 2026-10-09、develop の CI（quality-audit の keiken-answer-split・ci:true）が赤い。`content/site/civil-construction-1/secondary-experience-writing-guide/article.mdx:563`（6325dbc60「書籍の網羅から追記する」で追加）の「令和6年度以降の形式では、検討した項目が（1）の区画の後半に入り、対応処置は（2）に入るので、検討の理由は項目ごとに短く絞る。」を、`scripts/lib/keiken-answer-split.mjs` の checkClaim が [D]「1級の(2)に検討項目そのものを割り当てている」と判定する。本文は検討項目を（1）、対応処置を（2）に置いており正しい。（2）の後ろの同じ文の続き（「検討の理由は…」）を（2）の中身として読んでいる誤検知。
**やること**: 主張の切り出し（（2）の後ろをどこまで（2）の中身とみなすか）を、「…に入るので、」のような接続で切るように直し、上の文を回帰の見本にする（テストつき）。記事の本文は 2026-10-09 に言い換えて CI を通したので（b202397f3）、見本はテストの中に置く。
**完了条件**: 上の文をテストに入れて違反に出ず、既存の真の違反の見本はこれまでどおり出る。


### [DN-0614] コンテンツ台帳 P1: content/registry の土台（設計書・型・台帳・CLI・検査・素材の ID 置き場）を作る
タグ: [領域:SNS] [時期:2026-10] [種類:改善] [起票:2026-10-09] [進行中]

**起点**: 2026-10-09 に運営者が「公開済みを含む全コンテンツ（YouTube・Shorts・IG・X・今後の Threads・TikTok）を content/ で ID 管理し、画像・動画は Drive、管理画面で目視確認」と決め、設計を承認した。いまはチャネルごとに台帳が 2〜4 本あり、実際の公開状態とずれている（通常動画は台帳で予約 111・公開 1、実際は公開 70）。この P1〜P7 の一連のカードが設計を段階に分けたもの。
**決定事項**: 承認は管理画面で見て CLI で行う（画面は読むだけ）／公開前の YouTube 動画 ID は公開リポジトリの台帳に置いてよい／古い投稿も全件取り込む（証拠の無いものは理由つきの stopped）／Codex 画像は動画ごとに使うかを決め、使ったら来歴と ai-image-fidelity-auditor の判定 ok を必須にする（Gemini は使わない）／台帳はチャネル×資格ごとの JSON／素材は Drive `制作物/コンテンツ/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}`（書き換えない）／DB サーバーは置かず、型つき JSON が正本で SQLite は生成物。
**やること（P1 土台）**:
1. 設計書を `.claude/knowledge/reference/` に置く（3 つの表・ID 規則・状態と遷移・2 段階の承認ハッシュ・照合・素材の置き場・検査 R01〜R10）
2. `config/content-registry.json`・型（dataset-schemas-content）・台帳（datasets.mjs の registry 置き場と行。PR #927 が先なら `AREAS.strict` の上に積む）・`scripts/lib/content-registry.mjs`・CLI `npm run registry`・`check-content-registry`（ci）・`check-registry-due`（ops）
3. `scripts/lib/media-paths.mjs`・Drive group `content-media`（immutable）・`npm run media` の promote・sync・verify・pull
**完了条件**: 空の registry で R01 が 0 件 FAIL、見本データで R01〜R10 の失敗例をテストで固定。総まとめ 1 作品で「描く→promote→sync→verify --cloud→空の場所へ pull して sha 一致」。


### [DN-0609] コンテンツ台帳 P3: 画面確認と2段階承認の CLI、管理画面で作品ごとに表紙・動画を目視確認する画面を作る
タグ: [領域:SNS] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-09] [進行中]

**起点**: コンテンツ台帳の P3。管理画面の動画まわりは表と状態だけで、表紙・締め・動画を見られない。画像配信のルートは Range 非対応（mp4 のシーク・Safari 再生が壊れる）で realpath 検査も無い。
**やること**:
1. `npm run media -- preview`（DN-0603 を実装: 無音プレビュー・10 秒ごとのコンタクトシート・数値。閾値は config/video-content.json）
2. 2 段階の承認 `npm run media -- approve --stage visual|final --expect <digest>` と、stage の final 関門
3. tools/admin-app の画像配信ルート: 配信元 cmedia（.tmp/media）と vault（Drive の 制作物/コンテンツ）、Range（206・416・HEAD）、全配信元の realpath 検査、Drive の絶対パスと R2 のキーを HTML に出さない
4. `/content/items`（一覧）と `/content/items/[exam]/[work]`（詳細: 表紙・締め・コンタクトシート・場面・無音プレビュー・完成動画・字幕・IG・X・公開と予約・承認・来歴・CopyButton のコマンド）。読むだけの契約は保つ
**完了条件**: e2e が desktop と mobile で緑（書き込みボタン 0・秘密が出ない・Range で 206・`..` は 403）。Tailscale 経由の iPhone で再生とシーク。総まとめで全パネルが出る。


### [DN-0608] コンテンツ台帳 P2: YouTube 動画パックを台帳へ移し、予約→公開を CI の照合で進め、表紙を ID の置き場へ移す
タグ: [領域:SNS] [時期:2026-10] [種類:改善] [起票:2026-10-09] [進行中]

**起点**: コンテンツ台帳の P2（P1 の土台の上）。YouTube の通常動画は台帳で予約 111・公開 1 だが実際は 70 本が公開中で、予約→公開へ進める処理が無い。表紙 346 件は日付フォルダ・連番名。
**やること**:
1. 動画パック（通常 112・Shorts 224・総まとめ・QA 済み 43）を `content/registry` へ取り込むスクリプト（既定 dry-run・2 回流して同じ結果・own-videos と突き合わせた件数レポート）
2. 書き手（publish-video-pack.cjs・prepare-youtube-longforms・render-longform・verify-video-publication・build-video-pack-index・手動予約の job）を同じ PR で台帳の入口へ切り替え、video-content-status.json は生成物（写し）にする
3. `registry-reconcile.yml`（毎日・videos.list で予約→公開を証拠つきで前進。後戻りは所見だけ）
4. 表紙と締め画像を ID の置き場へ移す（画素は変えない・sha 一致。DN-0607 を吸収）
5. 毎日の配信 CI（post-youtube-scheduled.yml の deliver・ref 固定）には触らない
**完了条件**: 照合で公開中の動画が published になり実際の公開数と一致。総まとめが予約→公開へ自動で進む。配信 CI が 3 日続けて緑。表紙 346 件の sha が新旧で一致。「状態は video-content-status.json」と書く文書（docs/marketing/06 §6.2・07・08・09、content-lifecycle.md、tools/admin-app/README.md）を台帳へ書き換える。


### [DN-0605] YouTube の予約・公開済み動画の概要欄に VOICEVOX のクレジット（VOICEVOX:青山龍星）を入れる
タグ: [領域:SNS] [時期:2026-10] [種類:不具合] [起票:2026-10-08]

**起点**: 2026-10-08、VOICEVOX エンジン（0.25.2）の speaker_info で、話者13（青山龍星）の利用条件が「VOICEVOX:青山龍星」のクレジット記載と確認した。予約・公開済みの通常動画（DN-0110 の112本）の概要欄（各パックの `youtube.json` の longform.description）にはこの表記が無い。2026-10-08 から `scripts/prepare-youtube-longforms.mts` が生成する概要欄に `音声：VOICEVOX:青山龍星` を入れるようにした（以後の生成分だけ）。Shorts の概要欄も同じ確認が要る。
**やること**:
1. 全パックの `youtube.json`（longform と shorts）の概要欄にクレジットが入るよう再生成する。civil の `--scope` は 1級の本数ずれ（66本）で今は止まるので、先にそこを直す
2. 予約・公開済みの動画へ `publish-video-pack.cjs --phase metadata`（CI 経由）で同期する。DN-0278（概要欄の冒頭リンク）と同じ同期なので、まとめて1回で行う
3. 公開画面の概要欄でクレジットが出ていることを数本で確かめる
**完了条件**: 予約・公開済みの全通常動画と Shorts の概要欄に「VOICEVOX:青山龍星」があり、`youtube.json` と YouTube の実体が一致する。


### [DN-0591] 書籍の網羅の残り: コンクリート 5 冊を判定し直して網羅を確かめる
タグ: [領域:教材] [時期:2026-11] [種類:制作] [起票:2026-10-08]

2026-10-08〜09 に、判定済みの 26 冊の展開を終えた（展開済み 24・展開不要 2）。進み具合は `npm run audit-reference-book-coverage -- --status`、手順は `.claude/knowledge/reference/book-coverage-judging.md`・`book-coverage-expansion.md`。
総監の論文の本（pe-cem-essay-guide）は展開しない（2026-10-10 運営者判断）: 総監のテキスト・受験対策・キーワード集の判定で gap は 0、partial は展開済み。論文の本の中身は答案例（note 商品の領域）が中心で、書き方の一般論は論文の書き方の本の展開と記述式ガイドで覆えている。再スキャンからやり直す手間に見合わない。`--status` ではこの 1 冊だけ「未着手」のまま残る。
残り: コンクリート 5 冊（concrete-*・construction-materials-basics）を `--rejudge` で候補表から作り直し、意味判定をやり直して、展開の前の判定のままになっている網羅を確かめる。新しい gap が出たら展開する。
完了条件: 5 冊の判定日が新しくなり、gap が 0 か、出た gap を展開した。


### [DN-0567] Mac の週次 note 同期で、配布 PDF を Drive から取り寄せられない原因を突き止めて直す
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-10-07] [期日:2026-10-12]

**起点**: 2026-10-04 3:00 の Mac の週次（`data/note/sync-log.json`）で、BK-01 道路の 7 本の配布 PDF を `drive-vault-sync --pull` で取り寄せられなかった。PDF は Drive に台帳どおりの大きさですべてある（2026-10-07 に Drive コネクタで確認）。同じ週次で先に取り寄せ済みだった III は通っているので、PDF ではなく Mac のマウント側（3:00 時点で Google ドライブが起動していない・ストリーミングの読み出し失敗など）を疑う。**原因は未確認**。週次は 1 回 200 本なので、ここで止まると 2級の直前導線（DN-0445 の 2）の反映が 10/25 の試験に間に合わない。

**やること**: (1) PR #905（取り寄せに失敗した記事を note へ送らず、理由を記録する）が develop に入っていることを確かめる。(2) Mac の `~/Library/Logs/doboku-note/note-sync.log` の 10/04 分と、10/11 の週次の `sync-log.json` の problems（#905 から理由が入る）を読み、原因を決める。(3) マウントが原因なら `note-sync.sh` の冒頭でマウントを確かめ、無ければ取り寄せを飛ばして理由を残す（または Drive の起動を待つ）。

**完了条件**: 10/11 以降の週次で「PDF を Drive から取り寄せられない」が 0 件。






### [DN-0502] 技術士一次試験の主要10ページを GSC でインデックス登録リクエストする（Mac・運営者作業）
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-10-02] [期日:2026-10-04]

**起点**: DN-0499 の手作業分。2026-10-02 に一次試験の内部リンク・題名・一覧ページの改善を本番へ出した（PR #829・main d2fed24）。9/30 の URL 検査で一次試験 53 ページ中 26 ページが未登録（「検出 - インデックス未登録」20・「Google に認識されていません」6）で、R07 基礎と無料演習は Google に認識されていない。11/22 の試験前に検索の入口を開けたい。

**やること**: 運営者が Mac で GSC（sc-domain:doboku-note.com）の URL 検査を開き、次の 10 URL を「インデックス登録をリクエスト」する（1 日の上限に注意）。
1. https://doboku-note.com/exam/pe-first-stage
2. https://doboku-note.com/exam/pe-first-stage/guide/overview
3. https://doboku-note.com/exam/pe-first-stage/primary/r07-basic
4. https://doboku-note.com/exam/pe-first-stage/primary/r07-aptitude
5. https://doboku-note.com/exam/pe-first-stage/primary/r07-construction
6. https://doboku-note.com/exam/pe-first-stage/primary/r06-basic
7. https://doboku-note.com/exam/pe-first-stage/primary/r06-aptitude
8. https://doboku-note.com/exam/pe-first-stage/primary/r05-basic
9. https://doboku-note.com/exam/pe-first-stage/guide/study-plan
10. https://doboku-note.com/tools/kakomon-quiz/pe-first-stage

**完了条件**: 10 URL すべてでリクエストを送った（GSC の画面で「インデックス登録をリクエスト済み」を確認）。効果の確認は DN-0499 の完了条件（2026-11 初めの比較）で行う。

### [DN-0500] 技術士一次試験 令和8年度（11/22）の解答速報ページを事前に用意し、公式正答の公開後すぐ埋める
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-10..2026-11] [種類:制作] [起票:2026-10-02] [期日:2026-11-22]

**起点**: 2026-10-02 の調査で、試験直後は「技術士一次試験 解答 令和8年度」の検索が集中する時期と判断した。現在の一次試験ページは Google の表示が月 251 回と少なく（GSC 9 月）、Bing の「技術士一次試験」（週 400〜660 表示・3〜5 位）が実質の入口。試験日に受け皿が無いと、年に一度の需要の山を取り逃す。

**やること**:
1. 令和8年度の基礎・適性・専門（建設・上下水道）の解答速報ページの枠（題名・説明・公開予定・公式正答の確認先）を試験前に公開する。
2. 試験当日〜正答公開後に、公式問題 PDF と正答 PDF から既存の過去問ページと同じ手順（起稿→原典照合）で 4 ページを作り、無料演習（建設 3 科目）に追加する。
3. 速報ページから過去問一覧・note 直前パックへの導線を置く。

**完了条件**: 公式正答の公開から 3 日以内に令和8年度の 4 ページが公開され、`node scripts/check-pe-first-stage-historical.mjs`（年度追加後）と `node scripts/build-quiz-data.mjs` が通る。

**進捗（2026-10-02）**: 手順1を完了。解答速報ページの枠 `/exam/pe-first-stage/guide/r08-answers`（公式の問題・正答の確認先、正答訂正の注意、科目ごとの自己採点、合格発表、直前対策の導線、FAQ）を本番へ反映（PR #844）。正答の公開日は実施案内に書かれていないため断定していない。残りは試験後: 公式正答の公開を確認したらページに掲載日を追記し、令和8年度の4ページ（基礎・適性・建設・上下水道）を起稿して演習へ追加する。

### [DN-0485] Cloudflare の解析用 API トークンを発行して Secret に登録し、cloudflare-metrics と cloudflare-config を復旧する
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:不具合] [起票:2026-10-01]

**起点**: 月次レビュー（2026-08-01〜2026-08-31）の点検と Issue で見つけた。`cloudflare-metrics.yml` が 9/24 から 7 連続で失敗（`check-workflow-health` 赤・Issue #636）、`cloudflare-config-audit.yml` も取得失敗（Issue #709）。run 36793694023 のログでは `CLOUDFLARE_ANALYTICS_API_TOKEN` が空で、代わりに使われた配信用トークンでは `zone-not-found: zone doboku-note.com が見つからない`。

**やること**: (1) 運営者が Cloudflare ダッシュボードで zone doboku-note.com の Analytics:Read・Zone:Read を持つトークンを発行し、`gh secret set CLOUDFLARE_ANALYTICS_API_TOKEN --repo uruhayato373/doboku-note` で登録する（エージェントはトークンを扱わない）。(2) `gh workflow run cloudflare-metrics.yml` と `cloudflare-config-audit.yml` を手動実行して緑を確かめる。(3) 復旧で #636・#709 が自動クローズされたかを見る。

**完了条件**: 両 workflow が成功し、`npm run check-workflow-health` で cloudflare-metrics が ✓。

### [DN-0535] 主任技士 小論文の新マガジン17誌に POP カバーを付ける（Codex で画像生成）
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:制作] [起票:2026-10-05] [期日:2026-11-15]

**起点**: DN-0523 で公開した全40答案・立場別5テーマ8誌・立場別合格パック8誌のカバーは従来の自動生成器（V5）で作り、POP 意匠になっていない。10/3 の全40答案の POP 案は削除したテーマ別5本前提の「PDFダウンロード」帯つきで使えない。画像生成は Codex が担当する（2026-10-05 ユーザー指示）。

**やること**: plan `.claude/plans/DN-0535-cce-pop-magazine-covers.md` のプロンプトと誌ごとの文言で1誌1枚を作り、`note-magazine-cover --commit` で反映する。

**完了条件**: 17誌とも note の公開 API で POP カバーが付き、各誌の dir に `cover-pop-20261005/pop-image.json`（プロンプト・SHA・360px の確認結果）がある。





### [DN-0477] note メンバーシップから完全に撤退する: 会員0人を確認し、会員専用マガジンとプランを削除する
タグ: [収益化] [領域:商品] [時期:2026-11] [種類:改善] [起票:2026-10-01] [期日:2026-11-15]

**起点**: 2026-09-30 に note メンバーシップ「土木セコカン合格ラボ」から撤退し（2プランとも受付停止・`published:false`）、2026-10-01 のユーザー決定で**完全撤退**（会員専用マガジンとメンバーシップ自体を削除）とした。在籍会員の支払い期間が終わるのは約1か月後（2026-11 初め・正確な終了日は note 側で要確認）なので、それまでは会員が見る記事・マガジンを触らない。会員向けだった22記事（`content/note/1級・2級土木/メンバーシップ/`）は 10/1 に無料記事へ切り替え済みだが、特典マガジンに入ったままのため `is_limited=true` で最後のブロックだけ隠れる（`memberTrial: bottom`）。

**やること**（在籍会員が0人になってから）:
1. note の管理画面で在籍会員0人を確認する（残っていれば終了日まで待つ）。
2. 会員プランの特典マガジンのうち**有料6誌（完全攻略パック・過去問模範答案集など）は削除しない**。会員プランとの紐づけを外すだけにし、単品販売は続ける。（特典 7 誌の名前は旧 `config/note-membership.json` の `benefitMagazines`＝2026-10-02 に読み手が無いため削除。1級土木 施工経験記述｜過去問 模範答案集／工種×テーマ別 完成答案集／2テーマ組合せ大全（全10組合せ）／完全攻略パック、2級土木 施工経験記述｜過去問 模範答案集（R03-R07）／工種×テーマ別 完成答案集、経験記述 週次お題ラボ｜1級・2級土木（会員専用）。前者の 6 誌が有料）
3. 会員専用マガジン「経験記述 週次お題ラボ｜1級・2級土木（会員専用）」（`mbe07bd5cecda`）を削除する（収録記事は無料記事として残る）。
4. 「はじめに-合格ラボ」（加入の勧誘記事）を非公開にする。
5. 2プラン（`4956c2d4f928`・`f9567e03949d`）とメンバーシップ自体を削除する（会員0人でないと削除できないかは未確認。画面で確かめる）。
6. 22記事の `memberTrial: bottom` と末尾の「以上、今回の〜でした。」を外し、`note-update-body --list` で反映する。
7. `note-membership.json`・`check-note-membership.mjs`（退役済みは SKIP する形に済み）・`tests/check-note-membership.test.mjs`・`tests/note-membership-funnel.test.mjs` を撤去後の状態に合わせる（コード変更は PR）。

**完了条件**: 公開 API で22記事が `is_limited=false`、`mbe07bd5cecda` と「はじめに-合格ラボ」が取得できない。有料6誌は公開 API で販売中のまま。`https://note.com/dobokunote/membership/join` が加入画面を出さない。

### [DN-0445] 2級二次（10/25）の直前受注を、ココナラ 24時間の添削・骨子と note 導線で拾い切る
タグ: [収益化] [領域:商品] [時期:2026-09..2026-10] [種類:改善] [起票:2026-09-29] [期日:2026-10-25]

**起点**: 2026-09-29 の 2級立て直しの検討。2級は記述の受験者 21,111 人と 1級（24,667 人）並みなのに、6〜9月の売上は 16 件・¥31,480（1級は ¥145,280）。note の 2級記事は 9/1〜15 で 617 PV・78 本（1 本平均 8 PV）で、読まれるのは R8 予想模試（38 PV）と過去問模範答案に集中し、受験資格などの無料記事は読まれていない。売上の中心は note とココナラで、GSC（サイトの検索）は判断に使わない。

**やること**（2026-09-29 に 1 の正本・2 の原稿配線まで済み。残りは次のとおり）:
1. ココナラの 2級 全3テーマ版 2本（`coconala-2kyu-tensaku-3theme` ¥5,000・`coconala-2kyu-sakusei-3theme` ¥6,500、どちらも24時間・骨子は納期4日）のタイトル・キャッチ・本文・価格・納期を正本どおりにライブへ反映し、2テーマ版2本と PDF 2本（予想模試・教材フルパック）をライブで休止する（`pauseReason:'absence'`・`resumeOn:2026-10-26`・公開 16→12 本）。価格は2級受検者向けの値下げ実験（旧 ¥7,500・¥10,000）。
2. note の 2級記事16本に入れた導線（`<!-- cta:coconala-2kyu-chokuzen -->`）と、2級記事85本のココナラ URL の全3テーマ版への付け替え（4418775→4418778・4418781→4418785）を、他の修正とまとめた一括更新でライブへ反映する。1 のライブ反映（骨子も24時間）より後に出す。配線は済み（2026-09-29 確認: 85本すべて `check-note-republish` の drift に入り、Mac の週次 `note-sync-routine`〔日曜3:00・1回200本〕が拾う）。ただし反映待ち320本のうち2級は200本以内に41本だけ（最後尾268番目）で、放置すると 10/4 と 10/11 の2回に分かれる。優先のしかたは後で決める: (a) 2級だけ先に `git grep -l -e services/4418778 -e services/4418785 -- 'content/note/*article.md' > .tmp/2kyu.txt` → Mac で `node scripts/note-update-body.mjs --sync --list .tmp/2kyu.txt --commit`／(b) 次の週次を `--max 400` で全件／(c) 週次の並び順に試験の近さを足す改修。
3. note の無料記事 3 本を公開し、予想模試とココナラへつなぐ。2 本は下書き済み（`2級土木/経験記述を残り3週間で仕上げる/`・`2級土木/R8二次の出題予想/`。note-fact-checker 指摘反映済み）で、残りは (a) 冒頭の著者バナー画像を `distribute-author-authority-banner.mjs --migrate` で複製してから運営者が `note-publish` で公開（「残り3週間」は試験の 21 日前＝10/4 を過ぎているので、短い場合の手順を先に見せるか早めに出す）、(b) 公開後に `npm run check-note-structure` で 2 本が CRITICAL 0、(c) 3 本目「添削で直った答案の実例」は顧客原稿がリポジトリ外なので運営者の素材待ち。
4. note のアクセスを取り直し（`npm run note-traffic-fetch`）、新記事と予想模試の PV、ココナラ 2級の受注件数を 10/25 まで追う。

**完了条件**: ココナラの 2級が全3テーマ版 2 本（24時間）で公開され、note の 2級記事にココナラ導線がライブ反映され、無料 3 本が公開済み。10/26 に受注件数と PV を記録し、値下げ実験の結果で価格を決め、試験後の出品（2テーマ版・PDF の再開）を判断している。

**進捗（2026-10-04・2級を主力へ）**: X は固定ポストを 2級の 4 部スレッド（直前パック→完成答案集→一次後期 PDF→無料の直前2週間計画）へ差し替え、自己紹介も 2級（10/25）向けへ。10/16〜10/22 は夜枠が主任技士・技術士一次で埋まり 2級が 0 本だったので、7 本を 10/26〜11/1 の昼へ移して 2級の最終週 7 本（`106-civil2-lastweek-2026-10`）を予約した（キュー 74 件を照合）。note の土木もくじは 2級を先頭に組み替え、`/links` も土木（2級→1級）を先頭へ（PR #858）。試験後の差し替え（固定・自己紹介・もくじ冒頭の「10/25 の本試験に向けて」節）は 10/26 に行う。

**締切（旧 DN-0280 から移管）**: ココナラ添削の受付締切日を決め（x-post-policy §5.4 は本試験1週間前＝10/18 を標準とする）、`2026-10-civil-final.json` の販促投稿の文面へ入れて `npm run check-x-campaign-plan` を通す。

### [DN-0537] Instagram の予約補充が 9/20 で止まっているので、2級（10/25）直前のテーマから予約を再開する
タグ: [収益化] [領域:SNS] [時期:2026-10] [種類:不具合] [起票:2026-10-05] [期日:2026-10-24]

**起点**: 2026-10-05 の 2級土木の SNS 配線の点検で、Instagram 新シリーズ（`content/sns/instagram/campaign.json`・112 テーマ／336 投稿・全件 ready）の予約が 9/20 12:30 を最後に途切れていると分かった。`.claude/knowledge/reference/instagram-campaign.md`（予約と継続配信）は Codex の定期処理 `instagram` が毎日 10:00 に補充すると書くが、`~/.codex/automations/` には `x-article-*` しか無く、launchd にも無い。video-packs の `status.json` は 9/11 以降更新が無い（ライブの Planner は未照合）。2級のテーマ 18 のうち配信済みは `anzen-ippanron-3riyu` だけで、X は 2級を主力へ切り替えた（DN-0445）のに Instagram の 2級は 0 本。プロフィール（`config/ig-account.json` の displayName・bio）も「技術士・1級土木」のまま。

**やること**: (0) 2026-10-05 に運営者が Facebook へログインできず、Business Suite のプロファイルが expired のまま（`npm run auth:status -- --service instagram`）。まずログインを復旧する。(1) Mac の Business Suite ログインで `/ig-reconcile` を回し、9/20 以降の予約・公開の実体を確かめる。(2) 2級の直前向けテーマ（`content/sns/instagram/video-packs/civil-construction-2/` の経験記述・学科記述・聞き流しまとめなど）を 10/24 までの枠へ前倒しする案を一覧にし、ユーザー承認後に `publish-ig-bs` で予約する（1 回 9 件まで・dry-run 先行）。年度・時期に依存するテーマは配信日に合うか確かめる。(3) 補充の定期処理を作り直すか、instagram-campaign.md を実態（手動補充）に直す。(4) プロフィールの 2級表記と、試験が終わった 1級直前ハイライト（07_civil-1）の扱いは DN-0363 と合わせて決める。

**(2) の前倒し案（2026-10-06・ユーザー承認待ち）**: 2級 9 テーマ×3 投稿＝27 件。各テーマは campaign.json の cadence どおり「初日 12:30 リール1 → 翌日 12:30 カルーセル → 翌日 19:00 リール2」（リール1/2 は `reels` 配列の順・`scripts/lib/instagram-campaign.mjs:48`）。`publish-ig-bs` は 9 件ずつ 3 回: 第1回 #1〜3・第2回 #4〜6 は即予約可、第3回 #7〜9 は 14 日先の制約で 10/10 以降。開始が遅れたら後ろの日付は動かさず #2・#3 から間引く。
1. 10/7 `keiken-nendo-keiko-2kyu`（出題傾向）— **年度依存あり**（「令和3〜7年度」「R06〜R07：2テーマ必答」等。10/24 までは直近5年＝R03〜R07 で合う・10/25 以降へずらせない）
2. 10/9 `keiken-gaiyo-2kyu`（工事概要）
3. 10/11 `gakka-2kyu-concrete`（学科 コンクリート。batch02 の pending 引継ぎ）
4. 10/13 `keiken-hinshitsu-kakikata`（品質管理）
5. 10/15 `keiken-kotei-kakikata`（工程管理）
6. 10/17 `keiken-anzen-2kyu-kakikata`（安全管理）
7. 10/19 `kikinagashi-2kyu-matome`（聞き流しまとめ）
8. 10/21 `gakka-kijutsu-2kyu`（学科記述の型）
9. 10/23 `keiken-genten-kyotsuten`（減点される答案の共通点）

#2〜#9 は年度・時期に依存する表現なし（campaign.json の `timeSensitive` は 2級 18 テーマとも false）。除外: `anzen-ippanron-3riyu`（9/14・15 予約済み・公開は未照合）、`nikyuu-gaiyo-roadmap`・`study-plan-2kyu`（入門・長期計画向けで旧シリーズの下書きが残る）、`keiken-koji-ga-nai`・`keiken-2kyu-level`・`gakka-2kyu-{doko,hoki,kiso,sekokeikaku}`（初期向け・#7 と重複・一次向け）。予約前に Mac で `instagram-campaign --check --media`（9/11 以降の素材の変化を確認）と、手順 (1) で 10/7〜10/24 の枠の空きをライブの Planner で照合する。

**完了条件**: 10/24 までの Instagram に 2級の投稿が予約され、Planner で実体を確かめて `status.json` に記録し、補充の仕組みと instagram-campaign.md の記述が一致している。

### [DN-0538] ココナラの経験記述添削を 1 商品（services/4418735）へ集約し、旧 8 商品を片付ける
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-05] [期日:2026-11-15]

**起点**: 2026-10-05 のユーザー決定（ココナラ展開キット.md §2 決定ログ「10/26 以降の年間の棚」）。添削・指導を級・テーマ数・形式で 8 商品に分けたため閲覧とレビューが散り、人の作業の受注は 1 件だけ。旧 DN-0264（本試験後の棚を据え置くか休止するか）はこの設計で答えたので統合した。

**やること**（2級本試験 10/25 の翌日以降）:
1. 10/26 に 2級の値下げ実験（全3テーマ ¥5,000・骨子 ¥6,500）の受注件数と、10月の閲覧・注文（`npm run coconala-analytics`）を記録し、カタログに入れた価格（基本 ¥6,000＋オプション・`coconala-listings.json` の options）を据え置くか直すか決める。オプションの数量・上限はライブの編集画面で確かめる。
2. note・サイト（`src/lib/offsite-cta.ts` ほか）・ココナラブログの送り先を 4350199・4418778・4418785・4317375・4317796 から 4418735 へ付け替える。note はライブ反映の一括更新に載せ、ブログは `coconala-blog-publish --update --commit`。
3. 運営者の判断で、統合商品をライブへ反映（`coconala-edit --service coconala-tensaku-4theme --commit`）し、旧 7 商品と `1kyu-premium` を `coconala-pause` で休止→アーカイブする。

**完了条件**: ココナラの経験記述添削の公開が 4418735 の 1 件だけになり、`npm run check-coconala-wiring`・`npm run check-coconala-blog`・`npm run check-coconala-live` が通り、リポジトリに旧 5 商品の URL への送客が残っていない。

### [DN-0442] 本試験後にココナラの予想模試 PDF 2本をアーカイブし、note の予想模試へ一本化する
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:改善] [起票:2026-09-29] [期日:2026-10-31]

**起点**: 2026-09-29 のユーザー決定（ココナラ展開キット.md §2 決定ログ）で、ココナラは添削系へ精選し、模試は note の予想模試3回（`civil-1-r8-mock3-pdf`・`civil-2-r8-mock3-pdf`・どちらも公開中）へ一本化する。ただし 1級の模試 PDF はココナラの受注4件のうち2件で、本試験の直前に売れているので、本試験までは受け付ける。同日に模範答案セット2本は先にアーカイブした（送り先の付け替え込み）。

**やること**: 1級は本試験（10/4）の翌日以降、2級は本試験（10/25）の翌日以降に、それぞれ次を行う。(1) 模試 PDF を送り先にしている箇所を付け替える（`src/lib/offsite-cta.ts`、ココナラブログ `2kyu-moshi-tsukaikata`・`2kyu-moshi-mihon`・`yosou-mondai-kaku-renshu`。ブログは `coconala-blog-publish --update --commit` で公開記事も直す）。(2) カタログを `status:'paused'`・`pauseReason:'retired'`・`archivedAt` にし、`coconala-pause --service <id> --commit` → `--archive --service <id> --commit` で休止してからアーカイブする。

**完了条件**: `coconala-1kyu-moshi-pdf` と `coconala-2kyu-moshi-pdf` がココナラの出品一覧から消え（coconala-pause が実測で確認）、`npm run check-coconala-blog` と `npm run check-coconala-live` が通る。

### [DN-0344] 技術士 口頭試験対策を全部門共通で使える形にする（筆記合格発表 11/4 の前日まで）
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:制作] [起票:2026-09-26] [期日:2026-11-03]

**起点**: 2026-09-26 の判断（06_多資格展開戦略.md）で、技術士の他部門へは部門別の模範解答ではなく、部門を問わない商品から広げることにした。口頭試験の問答（経歴・業務内容の詳細・コンピテンシー・技術者倫理）の考え方は全部門共通で、今は建設部門版（`src/lib/note-magazines.ts` の `pe-construction-oral-guide`）と総監版（`tankan-oral-complete`）しか無い。建設部門以外の受験者（上下水道・電気電子・農業・機械ほか。部門別の人数は exam-stats.json）は買える商品が無い。

**やること**: 全部門共通版の原稿（`content/note/技術士建設部門/magazines/口頭試験対策-全部門共通/`・公式照合済み・draft）と下書きエントリ `pe-oral-general-guide` を PR #776 で用意した（2026-09-30）。残りは運営者が (1) 価格を決める（¥1,980 を仮置き）(2) `src/lib/exam-brand.ts` の `examKeyOf` が `pe-oral-*` を判定できずサイトの案内枠が総監の見た目になるので、表示する資格ブランドを決める (3) PR #776 をマージして note で有料公開し、noteUrl を入れる (4) 告知は 11/4 当日から 1 日 1 本以内（案は PR #776 の説明）。

**完了条件**: 公開して noteUrl を note-magazines.ts に入れ、筆記合格発表（exam-calendar.json の writtenResult）の前日までに告知の枠を決めたら、このカードを削除する。

### [DN-0310] 1級二次（10/4）の後に、1級の経験記述サービスの受付を止めるか来季向けの文面へ替える
タグ: [収益化] [領域:商品] [時期:2026-10..2026-12] [種類:改善] [検証:check-coconala-live] [起票:2026-09-25] [期日:2026-10-06]

**起点**: 1級の添削・作成（`tensaku-set`・`tensaku-4theme`・`sakusei`・`sakusei-4theme`）と `1kyu-premium` の「お願い」欄に「二次検定（10/4予定）に確実に間に合わせるため、10/2受付分まで」と書いている。10/3 以降も受付中のままだと、試験後に買った人へ納品しても意味が無い。2級の試験後（10/25 以降）の棚は DN-0264 で決める。

**やること**: 試験後（10/5 以降）に、1級の5件を `coconala-pause` で受付停止にするか、来季（令和9年度）向けの文面へ替えるかを決める。受付停止ならカタログの status と pauseReason を更新し、替えるなら `coconala-listings.json` を直して `coconala-edit --service <id> --commit`（出品中の編集は下書き保存を使わない）。1級の PDF 教材（模試・完成答案・フルパック）の扱いも同時に決める。

**完了条件**: 10/6 までに5件が受付停止か新しい文面になり、`npm run check-coconala-live` が全件一致したら、このカードを削除する。

**進捗（2026-10-04）**: 受付停止に決定（2級を主力へ切り替え）。カタログは 1級 7 件すべて `paused`（`absence`・`resumeOn: 2027-07-01`）へ変更した（PR #858 に同梱）。ライブの休止は Playwright のココナラ保存セッションが切れていて未実行（9/23 保存・ログイン待ちでタイムアウト）。運営者がログインしてから `node scripts/coconala-pause.mjs --service coconala-tensaku-4theme --commit` と `--service coconala-sakusei-4theme --commit` を実行する。経験記述ブログ 12 本（`content/coconala/blog/`）も送客先を 2級の全3テーマ版へ替えた（ソースのみ）。同じログインのあとで `coconala-blog-publish --update --commit` を各記事に実行してライブへ反映する。1級の note 記事 214 本にある 1級サービス（4418735・4350199）へのリンクは、休止ページへ届くだけなので来季の文面と合わせて差し替える。

### [DN-0312] ココナラ room 18351970（1級）の残り2テーマ（環境対策・施工計画）を DM で添削する
タグ: [収益化] [領域:商品] [時期:2026-09..2026-10] [種類:改善] [起票:2026-09-25] [期日:2026-10-03]

**起点**: 2026-09-25 17:15 に2テーマ（工程管理・安全管理）を正式に納品。購入者は 20:28 におひねり ¥9,000（全5テーマ版との差額として案内した額）を払い、20:45 に承諾して取引はクローズした。クローズ後のトークルームにはメッセージ欄が無いため、同日夜に購入者プロフィールの「メッセージを送る」から DM を送った（運営者操作）。約束は、本人が書いた残り3テーマ（品質管理・環境対策・施工計画）を受け取りから24時間以内に添削・書き直し1回、答案は 10/1 までが目安、迷ったら現場の事実を箇条書きで送れば題材の振り分けを手伝う（答案は本人が書く）。orders.json は serviceId `coconala-tensaku-4theme`・priceYen 15000・`quote` に根拠を記録済み。顧客原稿と文面は Mac の `.claude/worktrees/kosshi/.tmp/coconala/talkrooms/18351970/` にしかない（リポジトリ外）。

**やること**: `npm run coconala-orders` で DM の新着を見る（DM の本文を取るスクリプトは無い＝運営者がブラウザで確認して貼る。トークルームの過去分は `node scripts/coconala-talkroom.mjs 18351970` で再取得できる）。答案が届いたら `/keiken-tensaku <答案> --grade 1` → `civil-keiken-tensaku-qa`（`check-tensaku-reply`）で PASS した文面を DM で返す（24時間以内）。書き直しを1回見たら orders.json の status を revised にし、購入者評価（期限 10/6）を返して closed にする。

**進捗**: 2026-09-26 に品質管理を確認完了（DM 17:02・22:43 返信）。購入者評価は 9/25 22:18 に送信済み（orders.json の rating に記録）。残りは環境対策・施工計画。

**完了条件**: 環境対策・施工計画の添削（と書き直し1回）を返し、orders.json の status が closed になったら、このカードを削除する。


### [DN-0262] 1級・2級土木 第2次検定 記述 Kindle（I・J系）26冊を KDP へ3回に分けて提出する
タグ: [収益化] [領域:商品] [時期:2026-10..2026-12] [種類:制作] [起票:2026-09-23] [期日:2026-10-17]

**起点**: 2026-09-23 にユーザーが「二次記述系も全部Kindle化」と指示し、26冊を制作した。KDP の新規作成は週10冊が上限（`content/kindle/strategy.md`「提出ペースと作成数制限」）。9/23 の i-04 で制限に到達したため（本は作成されていない）、同戦略の I・Jシリーズ節の改定後の計画で出す。2級は 10/25 の試験前に LIVE にしたい。

**やること**: 提出前に PR #698（記入例の記号・失格注意・ココナラ導線を除いた再ビルド）を develop へ入れる。9/30 に `node scripts/kdp-batch.mjs j-03` を1冊だけ流して回復を確かめ、通れば続けて `node scripts/kdp-batch.mjs j-01 j-02 j-11 j-12 j-13 j-14 j-15 i-04 i-01`。第2弾は 10/7 以降に `node scripts/kdp-batch.mjs i-02 i-03 i-11 i-12 i-14 i-15 i-17 i-16 i-13 i-18`、第3弾は 10/14 以降に `node scripts/kdp-batch.mjs i-19 i-20 i-21 i-22 i-23 i-24`。note 用ブラウザが別セッションで動いているときは `DOBOKU_PW_ALLOW_PARALLEL=1` を付ける。作成数制限で止まったら（exit 2）翌日以降に1冊で再確認する。提出週に既刊の価格改定（再出版）を重ねない。LIVE 化は `node scripts/kdp-publish.mjs --sync-status` で確かめ、ASIN と公開日を catalog と戦略へ記録する。

**完了条件**: catalog の i・j 系26冊がすべて ASIN 付き `live` になること。

**進捗（2026-10-02）**: 第1弾の残り（j-02 以降）を流す前の 1 冊 probe（j-02）で、新規作成の詳細フォームが開かずに停止した。原因は作成数制限ではなく、KDP の新規作成画面が直近のパスワード再入力を要求する（`/ap/signin?...max_auth_age=0` へ戻される）こと（ログイン状態の確認は通る）。**運営者が KDP の永続プロファイルで一度サインインし直してから** `node scripts/kdp-batch.mjs j-02 j-11 j-12 j-13 j-14 j-15 i-04 i-01` を流す（2級の J 系を先に・試験 10/25 前）。現状: j-01・j-03 審査中（9/28 提出）、残り 24 冊 ready。

**追記（2026-10-02）**: PR #845 で `kdp-publish.mjs` の新規作成も再認証を待つようにした。`kdp-batch` を流すと KDP のサインイン画面が開くので、そこでパスワードを入れれば（3 分以内）そのまま下書き→出版へ進む。入れなければ「サインインし直して再実行」と出て止まる（本は作成されない）。

### [DN-0248] 技術士 口頭試験対策の無料導入2本と告知を筆記合格発表日に公開する
タグ: [収益化] [領域:商品] [時期:2026-10..2026-12] [種類:制作] [起票:2026-09-16] [期日:2026-10-26]

**起点**: 7月の購入者へ、筆記の結果に応じた次の準備を案内する。送客先の有料教材と価格・公開URLは `src/lib/note-magazines.ts` の `tankan-oral-complete` / `pe-construction-oral-guide` を参照する。

**やること**: 無料2本は 2026-09-30 に日本技術士会・文部科学省の公式で照合し、口頭教材の公開URLへ配線した draft（`content/note/技術士{総監,建設部門}/筆記合格発表後にやること-無料/`）。残りは (1) 発表日D（11/4 予定）を公式掲載で確かめ、D当日に運営者が2本を公開してL2（総監・建設部門もくじ）へ配線する (2) X告知 `content/sns/x/campaigns/2026-11-pe-oral.json`（27本・`check-x-campaign-plan` 緑）の無料記事宛て4本は、未公開のため linkless・`pendingNoteArticle` で置いてある。公開後に funnel を note へ切り替える前に、無料2本を `config/products.json`（→ note-magazines.ts）へ登録するかゲートに例外を足すかを決める（未登録のまま切り替えるとゲートが赤になる見込み・未試行）(3) 投稿原稿（tweets.md）を作る。成績の評価区分（A/B/C）は日本技術士会・文部科学省の公式に区分の定義が無いことを確かめ、本文の「公式の区分ではない」の断りを維持した。

**完了条件**: 無料2本がライブ、有料教材へのリンクが公開URLと一致、`audit-note-funnel` ドリフト0、X11月計画が `check-x-campaign-plan` 緑。

### [DN-0544] 2級二次（10/25）の後に、note の冒頭 CTA を見直し、試験後の無料フォロー記事を公開する
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-06] [期日:2026-10-26]

**起点**: DN-0250 の 2級分。1級は 2026-10-06 に低価格先出しへ切り替え、経験記述の入口記事 6 本の冒頭を「完成答案集→完全攻略パック」の順にした（`config/note-intro-standard.json` の `entry`・PR #870・`audit-note-funnel --live` ずれなし）。試験後の無料記事（n90feba1be8ae）も公開した。2級は 10/25 の本試験まで現状のままにする。2級の `cta:pack-top` は、すでに完成答案集を先に案内している（`config/note-funnel.json` の `2級土木/`）。

**やること**（10/26 以降）: (1) 2級の冒頭（`standardize-civil1-note-intro --variant civil2`）に、試験後の入口記事向けの低価格先出しの規則が要るかを決める。要るなら 1級と同じく `entry` で入れ、note-update-body で反映する。(2) 無料記事「R8二次-自己採点と合格発表まで-2級-無料」を公開する。公開前に令和8年度 2級 受検の手引で、試験日 10/25・合格発表 R9/2/3・再受検の扱いを照合する。ココナラの案内は 4 本（4418735・4350199・4418778・4418785）を、集約先の 4418735 の 1 本にする（DN-0538 と同じ）。

**完了条件**: 2級の冒頭の扱いを決めて反映し（変える場合は `audit-note-funnel --live` ずれなし）、無料記事が公開されていて、公開 API で無料のまま読める。







### [DN-0339] Instagram の公開済み未記録48件と照合異常45件を /ig-reconcile で解消する
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-10] [種類:不具合] [起票:2026-09-26]

**起点**: 週次レビューの申し送り（data/analysis/growth/digest-2026-W38.json）

**やること**: CI 週次の照合 `.claude/state/ig-reconcile/snapshot.json`（2026-09-19）で published_UNrecorded 48・anomaly 45・reel_built_unposted 42 が出ている。ローカルで `/ig-reconcile` を実行し、公開済みを posted.json へ backfill、異常の内訳（重複・種別・予約ずれ）を分類して直す。未公開のうち予約すべきものは予約前に一覧を示して確認を取る（外部への予約はユーザー承認後）。

**完了条件**: 次の CI 照合 snapshot で published_UNrecorded と anomaly が 0、または残りの各件に理由（削除済み・対象外など）が台帳に記録されている。


## 🟡 中 — 重要度が中くらい

### [DN-0632] サイトにメールの登録ページを作り、配信サービスを選ぶ（iOS アプリと記事から案内して note・ココナラへつなぐ）
タグ: [収益化] [領域:サイト] [時期:2026-10..2026-11] [種類:制作] [起票:2026-10-10]

**起点**: 2026-10-10 に運営者が、iOS 択一アプリを有料（無料ダウンロード＋全年度の買い切り ¥1,480）にし、利用者をメールのリストにして note・ココナラへつなぐと決めた。アプリには登録欄を作らず、サイトのメール登録ページへ誘導する（docs/products/07_iOS択一アプリ試作方針.md §1・§5）。メールの方針は docs/products/06_PWA過去問アプリ設計方針.md §5（メールが主チャネル・販促の同意は別に取る・アドレスを Git・GA4・CI に置かない）。サイトにはまだ登録の仕組みが無い。

**やること**:
1. メール配信サービスの候補を、費用（登録数ごと）・同意の記録・配信停止・データの書き出しと削除・日本語の扱い・埋め込みフォームの有無で比べ、運営者が選ぶ（外部サービスの登録は運営者が行う）
2. サイトに登録ページを作る。配信サービスの埋め込みフォーム、利用目的（試験直前の情報・新しい教材の案内）、送信者の表示、配信停止の方法、同意のチェックを置く（特定電子メール法）。`/privacy` に項目を足す
3. 入口を配線する。iOS アプリ（設定・結果の画面）からのリンク先 URL を決め、記事末尾の CTA（config/cta-placements.json）にも置く。登録ボタンのクリックを GA4 で数える
4. 最初の配信の型を決める（試験直前の要点・note／ココナラの新しい教材の案内）

**完了条件**: 登録ページが本番にあり、テスト用アドレスで登録→確認メール→配信停止まで通り、iOS アプリから張るリンク先 URL が決まっている。


### [DN-0630] Chrome の自己複製（code_sign_clone）を check-disk-hygiene と日次掃除の対象に入れる
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-10]

**起点**: 2026-10-10 に Xcode を入れる空き容量を調べたところ、`$(dirname $TMPDIR)/X/com.google.Chrome.code_sign_clone/` に Chrome の自己複製が 8 個・11 GB 溜まっていた。Chrome は起動のたびに 1.4 GB の複製を作り、終了後も残す。Playwright で Chrome を起動する自動化（note・X・KDP・Playwright MCP）でも 1 回ごとに増える。`npm run check-disk-hygiene` はこの場所を見ていないので「問題なし」と出ていた。同日、起動中の Chrome が使っていない 6 個を手で消した（手順はメモリ reference_mac_disk_reclaim）。

**やること**:
1. `scripts/check-disk-hygiene.mjs` に項目を足す。複製ごとの作成時刻と、起動中の Chrome（`pgrep -f "MacOS/Google Chrome"` の `ps -o lstart=`）の起動時刻を照合し、どの Chrome も使っていない複製を整理候補として数と容量を出す。Chrome が 1 つも動いていなければ全部を候補にする
2. launchd の日次掃除（`com.doboku-note.disk-hygiene`）で候補を消す。使用中かどうか判定できないときは消さずに WARN を出す（検査不成立を問題なしと言わない）
3. Xcode を入れた後（DN-0453）は、`~/Library/Developer/Xcode/DerivedData` と使っていない iOS シミュレータのランタイム（`xcrun simctl runtime list`）も同じ検査で数え、DerivedData は日次掃除の対象にする。空きは Xcode 導入後に 20GB を切る見込みで、30GB の WARN 線を下回ったままになる
4. `.claude/knowledge/reference/disk-hygiene.md` に置き場と判定の仕方を足す

**完了条件**: `npm run check-disk-hygiene` が Chrome の複製の数・容量・整理候補を出し、日次掃除の後に使われていない複製が残っていない（起動中の Chrome の複製は残っている）。


### [DN-0629] コンテンツ台帳の残り: IG・X の status.json・posted.json の写しと、Drive の旧日付フォルダの表紙を消す
タグ: [領域:SNS] [時期:2026-11] [種類:改善] [起票:2026-10-10]

**起点**: 2026-10-10、コンテンツ台帳 P5〜P7（DN-0611・DN-0612・DN-0607）を締めたときに残ったもの。IG・X の公開状態はもう `content/registry` が正本で、書き手・読み手は台帳の入口（registry-ig-store・registry-x-store）へ切り替わった。ただし旧ファイルが写しとして残っている：`content/sns/**/status.json` 283 件、`posted.json` 79 件。Drive にも、どの台帳からも参照されない旧日付フォルダの表紙が残っている：`制作物/動画レンダー/採用カバー/youtube-covers-20260909` の 346 枚と `youtube-covers-logo-a-20260909`。
**やること**:
1. status.json・posted.json を読む残りのコード（`rg "status\.json|posted\.json" scripts tools`）を台帳の入口へ差し替え、写しを削除する。`information-architecture.json` の denyPatterns と RESTRUCTURED_PATHS で復活を止める
2. Drive の旧日付フォルダは参照 0 を `rg` で確かめ、運営者の了承を得てからマウント上でゴミ箱へ移す
**完了条件**: `find content/sns -name status.json -o -name posted.json` が 0 件。check-information-architecture・check-content-registry・test が緑。Drive に日付フォルダの採用カバーが残らない。


### [DN-0628] 土木施工管理技士 iOS アプリ（1級＋2級）を App Store に無料で出す
タグ: [収益化] [領域:商品] [時期:2027-02..2027-05] [種類:改善] [起票:2026-10-09]

**起点**: 2026-10-09 の方針（docs/products/07_iOS択一アプリ試作方針.md §3.1〜§3.4）で、施工管理は種目ごとに 1 本、1級と 2級は同じアプリにまとめる。2級前期は例年 6 月、1級第一次は 7 月なので、2027 年春に出す。競合は 1級が TK office（18 年分・全問 ¥1,600）、2級がドリルラボ（12 回・全問 ¥1,870）。こちらは最新年度を無料で試せて全年度は ¥1,480 の買い切り（07 §1）、全選択肢の解説付きで、公式正答付きの収録を 1級 16 年度以上・2級 14 回にする（DN-0623）。

**やること**:
1. DN-0624 の判断を受け、DN-0453 で記録した横展開の手順どおり、技術士アプリと同じエンジンで土木施工管理技士アプリを作る（1級・2級の切り替え、図の同梱）
2. DN-0623 で足した年度を含めてデータを書き出し、問題 ID の重複・消失の検査を通す
3. 名前・サブタイトル・キーワード欄に「1級」「2級」「土木施工管理技士」を振り分け、審査に出して公開する
4. 公開後 4 週間で、級ごとの検索語の表示回数と製品ページからのダウンロード率・買い切りの割合（07 §6）を記録する

**完了条件**: 土木施工管理技士アプリ（1級＋2級）が 2027-05 までに App Store で公開され、級ごとの表示回数とダウンロード率が記録されている。


### [DN-0627] 総監の択一を技術士 iOS アプリに足して公開する
タグ: [収益化] [領域:商品] [時期:2027-02..2027-05] [種類:改善] [起票:2026-10-09]

**起点**: 2026-10-09 の方針（docs/products/07_iOS択一アプリ試作方針.md §1・§3.2）で、総監の択一は技術士アプリ（第一次試験と同じアプリ）にアップデートで足す。総監は 720 問（平成21〜令和8年度）を構造化済みで、Web 演習は未公開。2026-10-09 に書き下ろし 1,000 問の総監専用アプリ（RUMAHSAKU）が出たので、実際の過去問を年度別に解けることで分ける。総監の筆記は例年 7 月。

**やること**:
1. DN-0453 で技術士アプリに総監を試験設定とデータだけで載せた版を、DN-0624 の判断を受けて仕上げる（5 管理の分野別・年度別、総監向けの試験日カウントダウン）
2. App Store の名前・サブタイトル・キーワード欄に総監の検索語を足す（07 §5）
3. 審査に出してアップデートとして公開し、App Store Connect の分析で総監の検索語の表示回数を見る

**完了条件**: 総監を含む技術士アプリが 2027-05 までに App Store で公開され、総監の検索語で表示されているかが記録されている。


### [DN-0624] 技術士第一次試験の後に iOS アプリの感触を振り返り、総監の追加・土木アプリ・有料化を決める
タグ: [収益化] [領域:商品] [時期:2026-12] [種類:意思決定] [起票:2026-10-09]

**起点**: 2026-10-09 に iOS 択一アプリの試作方針（docs/products/07_iOS択一アプリ試作方針.md）を決め、最初の 1 本を技術士アプリ（第一次試験のみ・無料）にした。方針は「初回は目標値を置かず基準値を取り、技術士第一次試験（2026-11-22）の後に次を決める」（07 §6）。前提は DN-0453 で技術士アプリが TestFlight か App Store に出ていること。

**やること**:
1. App Store Connect の分析（表示回数・製品ページ閲覧・初回ダウンロード・ダウンロード率・継続率 1 日／7 日・買い切りの割合と売上）と、同じ期間の Web 演習の `quiz_start`（GA4）を並べて記録する。公開できず TestFlight 止まりなら、運営者の 1 週間の使い心地と作る手間だけで判断する
2. 07 §6 の 5 項目（作る手間・使い心地・App Store の反応・Web との関係・まとめ方の当否）を `data/business/records/` に判断として残す
3. 次の 3 つを決めて 07 と 06_多資格展開戦略.md の判断の記録に書く: 総監を技術士アプリに足して公開するか（DN-0627）、土木施工管理技士アプリを出すか（DN-0628）、価格（¥1,480）と有料版に足す機能（07 §4.3 の候補）を見直すか
4. 管工事・建築・電気工事のアプリを作るかは、土木アプリの「全問無料の効き目」が出てから決める、と次の判断日を置く

**完了条件**: 3 つの判断と根拠（数値または「未計測」）が 07・06 と `data/business/records/` に記録され、続くカードの [時期:] が判断に合わせて直っている。


### [DN-0623] 1級・2級土木の掲載終了した択一過去問（平成18〜25年度ほか）を保存版から取得し、収録を18年分以上にする
タグ: [収益化] [領域:商品] [時期:2026-11..2027-02] [種類:制作] [起票:2026-10-09]

**起点**: 2026-10-09 に iOS 択一アプリ（DN-0453）の競合を調べ、1級土木の主力 TK office は 18 年分（平成20〜令和7年度）を収録していると分かった。手元の構造化データは平成26〜令和7年度の 12 年分。同日、JCTC の掲載終了分を Wayback Machine の保存版から在庫台帳と Drive に載せた（1級: 学科は平成18・21・22・24〜28年度、公式正答は平成18〜22・24・27・28・30年度。2級: 学科は平成18・20・21・25〜27年度、公式正答は平成18〜20・24・26・27・29・30年度と令和元年度前期）。1級の平成19・20・23年度の学科問題は保存版にも無い。方針は docs/products/07_iOS択一アプリ試作方針.md §3.4。

**やること**:
1. 1級の平成19・20・23年度の学科問題を探す（正答ページは平成19・20年度が台帳にある）。第三者が置いている公式 PDF（平成26〜29年度は touhokugiken.com にあった）は、表紙と公式正答で公式と同じものか確かめてから在庫台帳に載せる
2. 公式の問題と正答が揃う年度から構造化し、選択肢ごとの解説を付けて `src/config/civil-1-exam-questions.json`（1級 平成18・21・22・24年度）・`civil-2-exam-questions.json`（2級 平成18・20・26・27年度）に足す。公式正答が無い年度（1級 平成25年度、2級 平成21・25年度）は 07 §3.4 の条件で扱う
3. 正答は公式と照合し、原典と視覚照合する（過去に転記ミスが 81 件あった）

**完了条件**: 1級土木の構造化データが 18 年度分以上になり、足した年度の全問が公式正答と一致し、在庫台帳と Drive に原本が揃っている。


### [DN-0621] 書籍の網羅の展開の道具（brief の生成・workflow・記事ごとのコミット）を Mac の .tmp からリポジトリへ移す
タグ: [領域:教材] [時期:2026-10] [種類:改善] [起票:2026-10-09]

2026-10-08〜09 の書籍の網羅の展開（DN-0591）は、brief の生成（判定の計画を記事ごとに束ねる Python）、workflow（expand-wf-v3.js・photo-wf.js）、記事ごとのコミット（commit-article.sh）を、セッションの一時置き場と Mac の .tmp/book-coverage/ に置いて回した。git 管理外なので、ほかの PC では再現できず、セッションの一時置き場は消える（運営者の方針「すべて git か Drive で共有」に反する）。やること: (1) brief の生成を audit-reference-book-coverage に --briefs として足す（新規案の重複の検出も）。(2) workflow を .claude/workflows/ に保存し、記事の置き場の絶対パスを args で受ける。(3) commit-article.sh を scripts/ へ移す（排他・trailer・一時の作業ツリーでの索引の作り直し・図のサイズの検査）。(4) book-coverage-expansion.md から参照する。完了条件: 別の PC で DN-0591 の残り（総監の論文の本）を、この 3 つだけで判定から展開まで回せる


### [DN-0620] 品質監査でテスト standards-ogp-guards が一時的に置く孤児 OGP を、並走する check-orphan-ogp が拾って CI が偶発的に赤くなる
タグ: [領域:サイト] [時期:2026-10] [種類:不具合] [検証:check-orphan-ogp] [起票:2026-10-09]

**起点**: 2026-10-09、PR #947 の audit が orphan-ogp で落ちた（content/site/standards-articles/chubu/common/chapters/__test-orphan__/ogp.png）。tests/standards-ogp-guards.test.mjs:112-145 が実リポジトリに一時ファイルを置いて check-orphan-ogp を流し、finally で消す。quality-audit はテストと検査を並行で回すので、その間に走った orphan-ogp が一時ファイルを孤児として数える。PR の変更とは無関係で、再実行で通る。
**やること**: テストを一時ディレクトリ（ROOT を差し替えられる形）で回すか、quality-audit で orphan-ogp とテストを直列にする。
**完了条件**: 同じ組み合わせを 10 回流して orphan-ogp が赤にならない。




### [DN-0618] 1級土木の既存記事の誤り・食い違いを直す（書籍の網羅の展開の QA で見つかった範囲外の 6 件）
タグ: [領域:サイト] [時期:2026-10] [種類:不具合] [起票:2026-10-09]

2026-10-09 の書籍の網羅の展開（DN-0591・1級・2級土木の棚）で、QA が追記の範囲外にある既存の記述の誤り・食い違いを指摘した。追記の担当は範囲外を編集しないので残っている。一次資料で確かめてから直す。
- civil-construction-1/guide-strategy: 法規の出題数（L145〜155・L208〜214。労安は毎年 2 問、建設業法は令和 5 年度まで 1 問・令和 6 年度以降 2 問など）と、問題 A の問題数（令和 6 年度から工学基礎 5 問が加わり 66 問）を、追記した guide-law-key-points・同記事の実測と揃える（FAQ の JSON-LD も）
- civil-construction-1/primary-h29-b: 4 番の解説「想定される箇所には防水処理を行わなければならない」が設問の選択肢と食い違う
- civil-construction-1/primary-r03-b: L530（No.19）の解説「再資源化が困難なら縮減」「第 16 条」（建設副産物適正処理推進要綱の条と順位で訂正）
- civil-construction-1/guide-environment-management: L29（FAQ）・L145 の再生資源利用計画等の保存期間（省令では完成後 5 年）
- civil-construction-1/secondary-experience-writing-guide: 既存の「対象とは認められない工事」表の行（工場製作の鋼構造物製作・解体・ビル建築の杭・基礎・区画線）を令和 8 年度の受検の手引と照らす
- civil-construction-1/secondary-quality-management-past-problems: R1 No.3 の本文（TS・GNSS を品質規定方式の項目に入れている・(イ) を最適含水比としている）を公式の問題・解答と照らす
完了条件: 6 件それぞれ一次資料の出典つきで正誤を決め、誤りは直してコミット














### [DN-0606] 技術士の既存記事の誤りを直す（書籍の網羅の展開の QA で見つかった範囲外の 6 件）
タグ: [領域:サイト] [時期:2026-10] [種類:不具合] [起票:2026-10-08]

2026-10-08 の書籍の網羅の展開（DN-0591・技術士の棚）で、QA が追記の範囲外にある既存の記述の誤り・食い違いを指摘した。追記の担当は範囲外を編集しないので残っている。一次資料で確かめてから直す。
- pe-construction/pe-secondary-essay-guide: 冒頭 FAQ の「1枚600字（25字×24行）」と、「試験の構成と時間配分を頭に入れる」の Ⅱ-1・Ⅱ-2・Ⅲ の科目名（令和8年度 受験案内の「Ⅲ．試験科目」と補足で確かめる）
- pe-comprehensive-management/r02-primary/article.mdx:1522 の「自動車廃棄残さ」（原問の転記ミスか、日本技術士会の公式 PDF と視覚照合）
- pe-comprehensive-management/r05-primary/article.mdx:1635 の風力発電の環境アセスの規模要件（第一種 1万kW・第二種 0.75万〜1万kW は 2021 年改正前の値。現行は第一種 5万kW以上・第二種 3.75万〜5万kW。解説か設問かを確かめる）
- pe-comprehensive-management/green-infrastructure: 官民連携プラットフォームの設立年（2019 年 → 2020 年 3 月か）
- pe-comprehensive-management/exam-passing-strategy: 既存 L83 の「24問正解（60%）が合格ライン」（択一単独の合格線ではない）と、時間配分の節へのアンカーリンク
- pe-construction/shiken-toujitsu-tejun: 既存文「時計は必ずアナログのものを」と、追記の「通信・計算機能付きと大型のみ不可」の食い違い
完了条件: 6 件それぞれ一次資料の出典つきで正誤を決め、誤りは直してコミット


### [DN-0597] YouTube Analytics（視聴維持率・インプレッションのクリック率・流入元・Shorts→関連動画）を CI で取得し data/youtube へ残す
タグ: [領域:SNS] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-08]

**起点**: 一覧から取れるのは累計の再生数と尺だけ（`data/youtube/own-videos/` の caveat）。DN-0110 の6週間判定（Shorts→関連動画の流入・視聴維持）と DN-0601 の図解版の比較（28日の視聴維持）には YouTube Analytics が要る。いまは数値が無く、判定できない。
**やること**:
1. GitHub Actions の YouTube API の資格情報（投稿・予約に使っているもの）に `yt-analytics.readonly` のスコープがあるか確かめる。無ければ運営者が OAuth を取り直す（スコープの追加は運営者の操作）
2. 動画ごとの views・averageViewDuration・averageViewPercentage・impressions・impressionsClickThroughRate・trafficSourceType（Shorts の関連動画・YouTube 検索・ブラウジングを分ける）を週次で取り、`data/youtube/analytics/{date}.json` へ。台帳（`scripts/lib/datasets.mjs`）に宣言し、型（zod）を付ける
3. 管理画面 `/metrics/video` で packId と結合して表示し、未取得は「未取得」と出す（0 件と混ぜない）
**前提・罠**: 計測は CI 供給が正（会社 PC から API を叩かない・.claude/rules/operations.md）。資格情報が無いときは記録を書かず exit 2（検査不成立）。インプレッションのクリック率は公開から48時間ほど遅れる。
**完了条件**: 記録が2週続けて増え、DN-0110 の判定と DN-0601 の比較に要る指標（Shorts→関連動画の視聴回数、通常動画の平均視聴率）が欠測なく読める。


### [DN-0596] YouTube の数値（自社は月次・競合は四半期）を GitHub Actions で定期取得し、取り忘れで前回比が切れないようにする
タグ: [領域:SNS] [時期:2026-10..2026-11] [種類:改善] [検証:check-competitor-scan-due] [起票:2026-10-08]

**起点**: 2026-10-08 に YouTube の数値の正本として台帳 `youtube.own-videos`（自社・月次）と `youtube.competitors`（競合・四半期）、取得スクリプト `npm run youtube-own-metrics`・`npm run scout-youtube-competitors` を作り、初回の記録を `data/youtube/` に置いた。今は手元で回すだけで、取り忘れると前回比が切れる。
**やること**:
1. 競合: `competitor-scan.yml`（四半期・note/coconala/ig を自動取得）に youtube を足す。先に GitHub Actions のランナーで yt-dlp の一覧（`--flat-playlist`）が取れるかを probe で2回確かめる。動画の再生用 API（player）と映像は使わない
2. 自社: 月次の workflow（毎月1日・JST）で `youtube-own-metrics` を回し、`ci-data add` で `data/youtube/own-videos/` へ書き戻す
3. `scripts/check-competitor-scan-due.mjs` の youtube を `automation: 'ci'` にする。自社の月次の鮮度（台帳の `freshness.warnDays` 35）を読む検査を `quality-audit.mjs` の ops に足し、`note:` に読み手を書く
4. 失敗は `scripts/report-automation-failure.mjs` へ（取得 0 件は exit 1・検査不成立を緑にしない）
**罠**: 日本語表示の一覧は「1.2万回」を null にするので英語表示と動画 ID で結合している（`scripts/lib/youtube-listing.mjs`）。ランナーの IP で一覧まで止まるなら手動に戻し、理由を measurement-incidents.md に書く。
**完了条件**: 両方の workflow が2回続けて成功し、`data/youtube/own-videos/`・`data/youtube/competitors/` に日付つきの記録が増える。`npm run check-competitor-scan-due -- --platform youtube` が ci として OK。


### [DN-0595] 1級土木のサイトの記述と市販の教本の食い違いを、一次資料で確かめて直す（測量の許容差・分野別出題数・実務経験の可否・二次過去問の設問）
タグ: [領域:サイト] [時期:2026-10] [種類:不具合] [起票:2026-10-08]

2026-10-08 の書籍の網羅の判定（DN-0591）で、Evaluator がサイトの記述と教本の食い違いを指摘した。どちらが正しいかは未確認（教本は 2021 年版や OCR の誤りもありうる）。一次資料（公式の過去問 PDF・受検の手引・JIS・測量の作業規程）で確かめ、サイトが誤っていれば直す。
- civil-construction-1 の測量（textbook-leveling ほか）: 鋼巻尺の許容差、セオドライトの目盛誤差を正反観測で消せるか（civil1-textbook-general の判定）
- civil-construction-1/guide-strategy: 分野別の出題数（ダム・トンネルの欠落、土木一般 5/5/5、労働安全衛生法 3〜4 問）と、実務経験として認められる工事の表（解体・杭）（civil1-primary-workbook-2021 の判定）
- civil-construction-1 の二次過去問: H29 問題2・H30 問題1 などで設問・選択肢が教本と合わない（civil1-secondary-workbook-2021 の判定）。公式 PDF と視覚照合する（memory feedback_exam_pdf_cross_reference）
詳細は Drive vault の 原資料PDF/書籍/<dir>/coverage/verdict.json（手元は drive-vault-sync --pull）。完了条件: 3 項目それぞれ一次資料の出典つきで正誤を決め、誤りは直してコミット


### [DN-0593] 総監の動画パック monbun-yomikata の layers 場面が描画できない（要点が画面に収まらない）
タグ: [領域:SNS] [時期:2026-10] [種類:不具合] [起票:2026-10-08]

**現象**: 総監の動画パック `content/sns/video-packs/pe-comprehensive-management/monbun-yomikata` の scene `layers` が「説明画面の要点を分割してください: layers」で描画できない（2026-10-08、全パック 2,482 場面の描画比較で 1 件。変更前のコードでも同じ）。状態は qa_passed。
**影響**: このパックの mp4 を作り直すとき `render-longform` が止まる（backlog の原本照合カードで「monbun-yomikata は原稿を直したので mp4 を再生成」とある）。
**やること**: `layers` の items を2場面に分けるか短くし、`node scripts/render-longform.mjs --pack-dir content/sns/video-packs/pe-comprehensive-management/monbun-yomikata --skip-tts` が完走することを確かめる。台本の意味は変えない。
**完了条件**: 上のコマンドが exit 0、`npm run check-video-content` PASS。


### [DN-0589] Drive vault の検査（check-drive-vault）が develop で FAIL 86 件のまま：kindle-dist の未同期と動画レンダーの不一致を片付ける
タグ: [領域:管理] [時期:2026-10] [種類:不具合] [起票:2026-10-08]

2026-10-08 に PR #927 の確認で、本番の作業ツリー（develop）でも node scripts/check-drive-vault.mjs が FAIL 86 件（WARN 126 件）だった。主な中身は scripts/kindle-dist/*.jpg の unsynced（ローカルにしか無く、この Mac を失うと復元できない）と .tmp/video-render/**/thumbnail.png の vault-mismatch。Mac 専用で CI には無く、誰も読んでいない赤になっている。やること: (1) 内訳を group ごとに出し、作り直せるものと正本を分ける。(2) 正本は drive-vault-sync --group <g> --commit、作り直したものは --force で反映。(3) Mac で定期的に読む人を決める（週次レビューの点検に入れるか、SessionStart の警告に件数を出す）。完了条件: check-drive-vault の FAIL 0・読む人が commands.md か週次の手順に書いてある


### [DN-0587] 引き継ぎ・レビューの point-in-time 文書が指すカードを別セッションが閉じても、develop の CI を赤くしない
タグ: [領域:管理] [時期:2026-10] [種類:不具合] [起票:2026-10-08]

2026-10-08、docs/handoffs/2026-10-08-dataset-catalog-unification.md が DN-0581 を参照していたところ、別セッションが DN-0581 を修正コミット e5df3a4bc の中で閉じ（todo:complete を通らず、doc-refs の確認も通らない）、マージで両方が develop に揃った時点で ci.yml の audit（tests/project-task-refs.test.mjs の dangling-id）が赤になった（run は 08a551580）。引き継ぎを消すまで約 45 分、develop の全 PR の CI が赤のままだった。案: (1) docs/handoffs/・docs/reviews/ の dangling-id は CI では警告にし、引き継ぎの抽出漏れ検査（check-handoff-extraction）側で扱う。(2) backlog.md からカードを消すコミット（todo:complete 以外）でも、pre-commit で liveDocsReferencing を回して止める。完了条件: 両方の回帰テスト・引き継ぎがカードを指したまま閉じても ci.yml が緑・pre-commit が todo:complete 外の削除を止める


### [DN-0585] 台帳の id でデータを一覧・取得・絞り込みする共通の入口を作る（npm run data -- list/get/query。管理画面からも）
タグ: [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-08]

段階2（data-storage-decision.md「台帳を 1 本にして DB のように扱う」）。DB を置かずに SELECT 相当を台帳 scripts/lib/datasets.mjs の id で引けるようにする。list <id>（ファイル一覧と件数）・get <id> [--values]（中身）・query <id> --where <欄=値>（JSON の配列・対応表の行を絞る）。Drive vault の写し（drive）が手元に無ければ drive-vault-sync --pull を案内する。管理画面 /ops/store の詳細から同じ関数を呼ぶ。完了条件: 3 つの操作のテスト・commands.md に 1 行・管理画面で 1 データセットを絞り込める。前提: 段階1（PR #927 に積んだ .claude/state の台帳化）がマージ済み






### [DN-0582] Windowsで全体テスト11件が失敗するパス・改行・既存前提を直す
タグ: [領域:管理] [時期:2026-10] [種類:不具合] [検証:test] [起票:2026-10-08]

2026-10-08、Windows / Node 22 の独立 worktree で npm test を実行し、2,823 件中 2,806 成功・11 失敗・6 skip。追加したアフィリエイト実験テストは成功。失敗は既存領域で、区切り文字・file URL・CRLF・prh の API/前提に関するもの。

対象: tests/admin-figure-sns-board.test.mjs（4件）、check-mdx-images（1）、content-expansion（1）、pre-commit-install-guard（1）、prh-verb-forms（2）、video-cache-prune（1）、write-all-sync（1）。

やること: 未変更の develop と Linux CI の結果を突合し、Windows のパス/改行を正規化する。prh は現行 API の一次情報と使用箇所を確認する。実装と同じ文字列を照合するだけの検査に置き換えない。

完了条件: Windows と Linux の npm test が実検査数を示して成功し、共有フックや入力 fixture の不変条件が維持される。




### [DN-0579] Windows PC から Tailscale 経由で管理画面が開けるか確認する
タグ: [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-08]

別 PC（Windows）から Mac 上の管理画面（`npm run admin`・127.0.0.1:3021）を Tailscale 経由で開けるか確認する。Mac 側の設定は 2026-10-08 に完了済み（PR #924 で `allowedDevOrigins: ['**.ts.net']`、`tailscale serve --bg 3021` 実行済み・Mac からの取得は 200 を確認）。

- 開く URL: https://node.tail967299.ts.net/ （tailnet 内だけ。インターネット非公開）
- Windows 側の手順: Tailscale をインストールし、Mac と同じアカウント（uruhayato373）でログイン → ブラウザで上の URL を開く
- 開けない時の確認: (1) Mac がスリープしていない (2) Mac で `npm run admin` が起動中 (3) Windows の Tailscale が Connected (4) Mac で `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve status` が `proxy http://127.0.0.1:3021` を表示
- 解除: Mac で `/Applications/Tailscale.app/Contents/MacOS/Tailscale serve reset`（Mac App 版は `tailscale` コマンドが PATH に無いのでフルパス）
- 完了条件: Windows のブラウザで管理画面のトップ（KPI）が表示され、別ページへ遷移しても崩れない
- 手順の正本: tools/admin-app/README.md「別 PC から開く（Tailscale）」










### [DN-0568] note のログイン確認が一度失敗しただけで、週次のマガジンのカバー登録が残り全部止まる
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-10-07]

**起点**: 2026-10-07 に `note-sync-routine --magazines-only` を会社 PC で回したところ、7 誌目まではログインの確認（`note-magazine-cover.mjs` の account ゲート）が通ったのに、8 誌目だけ `ABORT: account != dobokunote`（exit 2）になった。週次はこれを「ログインが切れた」と扱って `break` し、残りの 47 誌を登録しなかった。直後に同じプロファイルで再実行すると通ったので、ログインは切れておらず、確認が一時的に失敗しただけとみている（設定ページを `domcontentloaded` の 2.5 秒後に読むだけで、表示が遅いと本文にクリエイター名が出ない、が有力。**原因は未確認**）。

**やること**: (1) account ゲートを、クリエイター名が出るまで待つか、1 回だけ読み直してから判定するようにする。(2) 週次の `syncMagazines` は exit 2 が 1 回出ただけで全体を止めず、もう 1 回だけ同じ誌をやり直して、それでも 2 なら止める。

**完了条件**: account ゲートの一時的な失敗で週次が止まらない（テストで exit 2 → 再試行 → 成功の流れを確かめる）。


### [DN-0569] 2026-10-07 に会社 PC で登録したマガジンカバーの控えを Drive vault へ保存する
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:不具合] [起票:2026-10-07]

**起点**: 2026-10-07 にマガジンのカバー 56 誌（39＋17。1 誌は登録後の確認で落ちた回に入った）を会社 PC の `note-sync-routine --magazines-only` で note へ登録した。会社 PC には Google ドライブのマウントが無いので、登録した版の控え（Drive vault の `note-magazine-cover-png`）の保存が `drive-vault-sync` で失敗した（実行記録の problems に「マガジンカバーを Drive へ保存できなかった」）。台帳（`magazineCovers`）の記録と note 上の画像は済んでいる。

**やること**: Drive をマウントした PC（Mac）で、最新の develop から `node scripts/generate-magazine-covers.mjs` でマガジンの `_cover.png` を作り直し、`node scripts/drive-vault-sync.mjs --group note-magazine-cover-png --commit` で控えを保存する。作り直した画像の sha256 が台帳の `magazineCovers[*].sha256` と一致することを確かめてから保存する（一致しなければ保存せず理由を書く）。

**完了条件**: `node scripts/drive-vault-sync.mjs --group note-magazine-cover-png` の差分が 0 件で、2026-10-07 に登録した誌の控えが vault にある。



### [DN-0551] 技術士一次 H27・H28 の ExamPoint「対比点は「A」と「B」の違い」約 80 項目を、違いの要点（体言止め）で書き直す
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10..2026-12] [種類:改善] [起票:2026-10-06]

**起点**: 2026-10-06 に技術士一次の ExamPoint の lint 9-11（項目に句点・読点 2 つ以上）を直した際、`content/site/pe-first-stage/h27-*`・`h28-*` の 6 本に残る「対比点は「＜選択肢の文＞」と「＜選択肢の文＞」の違い」約 80 項目は、選択肢の文をそのまま「」で引いているため、読点を抜くと引用が原文と食い違う。機械的な修正は取り消して元のままにした（9-11 が残る: h27-construction 31・h28-construction 30・h27-aptitude 8・h28-basic 6・h27-basic 3・h28-aptitude 2）。

**やること**: 各項目を、2 つの選択肢の文の引用ではなく「何が違うか」の要点（例: 「土の密度は土粒子＋水、乾燥密度は土粒子だけの質量で定義」）を体言止めで書く。選択肢の原文は直上の解説行と設問に残っているので、ExamPoint では引用しない。1 項目に句点なし・読点 1 つ以内、項目は 3 個以内。

**完了条件**: 6 本の `node .claude/scripts/lint-mdx-mobile.mjs` で 9-11 が 0、`npm run check-mdx-facts -- <file>` で数値の減少 0（「」の語の減少は引用をやめた分として commit に書く）、`npx textlint` 0 件。





### [DN-0552] 1級土木 一次の過去問演習データへ、記事の図の修正を反映する
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:不具合] [起票:2026-10-06]

**起点**: 2026-10-06 の図クロップ品質ループ（`/figure-quality-loop`）で、1級土木 一次の過去問記事の図を切り出し直すと、過去問演習（`/tools/kakomon-quiz`）のデータには反映されないと分かった。演習データ `src/config/civil-1-exam-questions.json`（→ `npm run build-quiz-data` → `public/quiz/civil-1.json`）は記事の MDX から `.claude/scripts/sns/parse-civil-1-questions.mjs` で作るが、2026-07-16 から作り直されていない。図 50 枚のうち 10 枚で width/height が記事と違い、H30 問題A No.10 は、切り出し直した h30-a-fig-10 が図の全体になったので、記事では縮小版の h30-a-fig-11 と図名「（上部）」を外す（PR #887 の後に入る）が、演習データには重複したまま残る。画像のパスは同じなので、演習でも直した画像は出ている。

**やること**: `parse-civil-1-questions.mjs` が既存の年度も記事から作り直せるかを確かめて（見出しに「追加のみ」とある）、記事の図・寸法の変更が演習データに入るようにする。作り直すか、`refresh-indexes` か検査で記事との差を止めるかを選ぶ。作り直したら、どの記事からも演習データからも参照されなくなった `content/site/civil-construction-1/primary-h30-a/img/h30-a-fig-11.{png,webp}` と、H29 問題A No.1 の断片 `primary-h29-a/img/h29-a-fig-02`・`h29-a-fig-03`（fig-01・fig-04 を図の全体に切り出し直したので 2026-10-07 に記事から外した）を消す（Kindle の EPUB `scripts/kindle-dist/e-02.epub` にも入っているので、EPUB の作り直しと合わせる）。

**完了条件**: `src/config/civil-1-exam-questions.json` の図の width/height と図の並びが記事の MDX と一致し（不一致 0 件）、`public/quiz/civil-1.json` の H30 No.10 の図が 1 枚になっている。

### [DN-0562] Kindle の EPUB・表紙（scripts/kindle-dist）を Git から出し、置き場の方針どおりにする
タグ: [インフラ・計測] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-07]

**起点**: 置き場の方針（asset-storage-policy.md §1）は「誰が使うかで決める」で、人が使うものは Drive、CI が読むものは R2 に置く。`scripts/kindle-dist` だけは例外として Git に入っている（138 件・90MB、EPUB 65・表紙 jpg 72）。
- `config/drive-vault.json` の理由は `coexistWithGit: true`「Git が正本（CI の check-kindle-format が blob を読む）で、Drive は控え」。
- 「CI が読む」は、方針では `ci`＝R2 の行に当たり、Git に置く理由にならない。
- 作り直すたびに履歴に積まれる。履歴の切り詰め（2026-08-22）以降で 286 版・159MB あり、記事画像 1,569 版・99MB より重い。
- Drive の控えは台帳 76 件と sha256 が 1 件も合わず、控えになっていない（DN-0451）。

**やること**:
1. 正本の置き場を決める。第一案は private R2 で、`kindle-format` の検査（quality-audit の `ci: true`）が R2 から読む。人が入稿に使う控えは Drive。
2. asset-storage-policy.md §4 の手順で `git rm --cached` し、`.gitignore` に拡張子で足す。台帳（R2 の manifest か drive-manifest）に登録し、空の復元先から復元して sha256 を照合する。
3. `check-kindle-format`・`kdp-publish.mjs`・`kindle-build` の読み書き先を新しい置き場に合わせる。CI は R2 から取り寄せて検査し、取り寄せに失敗したら検査不成立にする。
4. `config/drive-vault.json` の `coexistWithGit` を外し、asset-storage-policy.md の表を直す。DN-0451 の同期と順番を合わせる。

**完了条件**: `git ls-files scripts/kindle-dist` が README だけになり、CI の `kindle-format` が新しい置き場から全 EPUB を読んで通る。復元経路で全件の sha256 が一致する。

### [DN-0554] フックの鮮度チェックが post-commit の欠落を見ず、Mac に post-commit が入っていなかった
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:不具合] [起票:2026-10-07]

**起点**: 2026-10-07、pathspec commit（`git commit -- <path>`）の後に index だけ古い版が残った（`MM`）。#885 が `scripts/install-pre-commit.mjs` に post-commit（`scripts/sync-index-after-commit.mjs`）を足したのに、この Mac の `.git/hooks` には pre-commit しか無かった。pre-commit に埋め込む鮮度チェックは `HOOK_CONTENT_BODY`（pre-commit の本文）の hash しか比べないので、post-commit だけが増えた版では「古い」と出ない。手で `npm run pre-commit:install` を入れ直した。

**やること**: 鮮度チェックの hash に post-commit の本文も含めるか、pre-commit の冒頭で post-commit の有無と版を確かめ、欠けていれば止める。「post-commit が無い・古い」を再現して止まることをテストで固定する。別 PC と各 worktree では一度 `npm run pre-commit:install` を実行する（DN-0233 の端末設定と合わせる）。

**完了条件**: post-commit を消した状態で commit すると pre-commit が理由つきで止まり、`npm run pre-commit:install` の後は通る（テストで固定）。

### [DN-0570] 図の切り出し直しを、記録（切り出し枠・回転）から同じ画像に作り直せるようにする
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-07]

**起点**: 図ごとの出典は 2026-10-07（PR #914）に `config/figure-sources.json` の `provenance`（186 件）へ一本化した。ただし残るのは原典の PDF・ページ・dpi だけで、切り出し枠（cropBox）・回転（書籍スキャンは 180° 逆さのページがある）・余白・減色は残らない。そのため、同じ画像を作り直せない。

**やること**:
1. record が worker の結果から `cropBox`・`rotate`・後処理（減色・点の除去）を `provenance` に残すようにする（型を足す）。
2. `scripts/figure-reextract.mjs <figKey>` で記録から画像を作り直し、配信中の画像と同じ寸法・画素の差が閾値以下になることを確かめる。閾値はこのカードで決める。Drive vault の在る PC でだけ動き、無ければ検査不成立で exit 2 にする。

**完了条件**: 新しく切り出し直した図は `provenance` に枠と回転があり、`figure-reextract.mjs` で任意の 3 枚を作り直すと配信中の画像と一致する。

### [DN-0556] 図クロップ品質ループの親の手作業（判定の記録・QA・結果の保存）を機械にする
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-07]

**起点**: 2026-10-06〜07 に `/figure-quality-loop` を 51 周回した。親は毎周、次を手でやっていた。
- worker の結果から判定 JSON（`.tmp/figure-loop/verdicts-*.json`）を書いた。
- 新旧の比較画像を作った。
- 画像から図番号のキャプションを外した図について、MDX に caption か `<p>` があるかを見た。
- `check-figure-crop-integrity --file` を webp だけに掛けていた。png の切れ端判定は CI で初めて出た（図5.4。判定は誤りで、#890 で検査を直した）。
- Workflow の結果がファイルに残らないので、会話の要約後は transcript から判定を拾い直した。
- worker は毎回、書籍の図のページを pdftotext と目で探した。二次問題解説集の OCR には `<!-- p0122 印字:114 -->` のページ印と `（図: 図2.41 押え盛土工法。…）` があり、引けば一発で分かる。

**やること**:
1. `figure-crop-batch.workflow.mjs` が結果を `.tmp/figure-loop/results-<runId>.json` に書く。
2. `figure-review-queue.mjs record --from-results <file> --pass <figKey...>` で、worker の結果から判定（source・cropBox 込み）を作る。
3. `scripts/figure-qa-sheet.mjs <figKey...>` が次の 3 つを一括で出し、親は合否だけを決める。
   - png・webp 両方のクロップ検査
   - 新旧を並べた画像
   - 画像から図番号のキャプションが消えたのに MDX に caption が無い図の一覧
4. record は、png か webp のどちらかに STRAY_SLIVER があれば記録を拒む。
5. `scripts/find-book-figure.mjs "図2.41"` で、書籍・PDF のページ・印字ページ・図名を OCR から引いて worker に渡す。
6. SKILL.md（`.claude/skills/quality/figure-quality-loop/`）の手順を置き換え、`/doc-sync` を回す。

**完了条件**: 判定 4 枚と切り出し直し 2 枚の 1 周を、手で JSON を書かずに `record --from-results` と `figure-qa-sheet` だけで記録できる。record が切れ端のある png を拒むことをテストで固定する。

### [DN-0557] 書籍から作った解説記事で、図の番号・alt・本文の参照が原典とずれていないかを機械で照合し、残りの記事を直す
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10..2026-11] [種類:不具合] [起票:2026-10-07]

**起点**: 2026-10-07、`civil-construction-1/secondary-earthwork-basics` の軟弱地盤対策を二次問題解説集2021 と照合して直した（ec373c03d）。見つかった不具合は次のとおり。
- 図2.36〜2.52 が 1 節ずつずれて載っていた。
- alt が画像と合っていなかった（図2.41 が「サーチャージ工法の原理」）。
- 本文の図番号が違う図を指していた（サーチャージで「図2.41」、深層混合で「図2.44」）。
- 1 枚の図が左右 2 枚に割られていた（図2.42）。
- 同じ図が 2 回載っていた（図2.52）。
- 別の教材の図番号（図1.93）が画像に写り込んでいた。
- 薬液注入工法の本文が、石灰パイル工法の説明の繰り返しだった。

同じ日、1級一次 H29 でも同じ図の切れ端が「（詳細）」の図名で重複していた。同じ書籍から作った他の `secondary-*-basics` と textbook 由来のガイドはまだ見ていないが、同じ生成の誤りが残っている見込みが高い。

**やること**:
1. 検査を作り、次の 4 点を見る。
   - `ArticleImage` の alt・caption の「図X.Y 図名」が、書籍の OCR（Drive vault の `原資料PDF/書籍/<book>/ocr/*.md` の `（図: 図X.Y 図名。…）`）と一致するか
   - 本文の「**図 X.Y**」が、同じ節（H4）にある図を指しているか
   - 同じ図番号が 2 回出ていないか
   - 図名に分割の印（「（上部）」「（下部）」「（詳細）」）が付いていないか
2. CI でも回せるよう、書籍の図番号・図名・ページだけの索引を repo の `config/` へ書き出し、datasets 台帳に宣言する。持つのは図名までで、本文は持たない。
3. 1級・2級土木の書籍由来の記事に掛け、ずれを原典と照合して直す。市販書籍（流用不可）の図は切り出し直さない（DN-0571 で自作の図に置き換える）。図番号・alt・本文の参照のずれだけを直す。
4. 検査を quality-audit に登録する（決定的なら `ci: true`）。

**完了条件**: 検査が対象記事数と実検査数を出し、不一致 0 件。quality-audit に載っている。

### [DN-0558] figure-crop-worker がネットからファイルを取得するのを hook で止める
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:不具合] [起票:2026-10-07]

**起点**: 2026-10-06、`figure-crop-worker`（sonnet）が原典を探す途中で、国交省の白書 PDF を `curl` で無断取得した（運営者は後で使用を承認）。
- 今の歯止めは `.claude/agents/figure-crop-worker.md` の「`curl`・`wget` で取得しない」という一文だけで、守られる保証が無い。
- worker の tools は `Read, Bash, Glob, Grep` なので、Bash からの取得は止まらない。

**やること**: `scripts/hooks/agent-hook.mjs` の PreToolUse に、figure-crop-worker の Bash から外部 URL を取得するコマンド（`curl`・`wget`・`python -m urllib` 等）を拒否するチェックを足す。
- 先に、hook の入力にエージェントの種別が来るかを確かめる。
- 来なければ、別の形で止める。例: 親の許可フラグが無い取得をすべて拒否する。いずれの形でも、親が正当に使う `curl`（`check-production-ssr` 等）は壊さない。
- テストを付ける。

**完了条件**: worker 相当の入力では `curl https://...` が理由つきで拒否され、親の既存コマンド（`npm run check-production-ssr` 等）は通る。これをテストで固定する。

### [DN-0532] コンクリート技士の試験概要ページを「試験日」の検索語でクリックされるようにする
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:改善] [起票:2026-10-05] [期日:2026-11-06]

**起点**: 16_検索キーワード戦略.md の資格名クラスター（コンクリートは重点資格外なので SEO Rank Watch には載せず、28 日比較で確かめる）。`/exam/concrete-engineer/guide/overview` は GSC（2026-09-01〜09-28）で「コンクリート技士 試験日」4.3 位（表示 18）、「コンクリート技士試験日 2026」7.5 位（14）、「コンクリート技士 2026」10.3 位（7）、「コンクリート技士 問題数」9.4 位（7）に出ているが、クリックは 0。Bing でも「コンクリート技士」4.3 位・表示 1,150・クリック 15（1.3%）。title「コンクリート技士とは｜2026年度試験概要・難易度・勉強法」に「試験日」が無い。本試験は 2026-11-29、申込は 8/25 に締切済み（`config/exam-calendar.json`）。

**やること**: 2026-10-05 に seoTitle・description・冒頭を試験日（11/29・13:30〜15:30・四肢択一式・2025年度は40問）へ直して本番へ出した（5f9dbebb9・deploy 9e1156d53）。2026-11-02 以降に、GSC（Google）と Bing の 28 日集計で「試験日」系の検索語の表示・クリックを反映前（09-01〜09-28）と比べる。試験後（11/30〜）は合格発表（2027-01-15）の語へ差し替える。

**完了条件**: 反映から 28 日後の集計で、「試験日」系の検索語のクリックが 0 から増えている。

### [DN-0533] コンクリート主任技士の小論文ガイドを「小論文」の検索語で 1 ページ目へ
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:改善] [起票:2026-10-05] [期日:2026-11-06]

**起点**: 16_検索キーワード戦略.md の資格名クラスター（重点資格外なので SEO Rank Watch には載せず、28 日比較で確かめる）。`/exam/concrete-chief-engineer/guide/essay` は GSC（2026-09-01〜09-28）でページ全体は平均 8.5 位・表示 88・クリック 3 だが、「コンクリート主任技士 小論文」は 12.0 位（表示 5）、「コンクリート主任技士 小論文 解答例」は 18 位（1）。主任技士の商品（立場別の模範答案・ココナラ添削）に最も近い検索語で、本試験 11/29 に向けて需要が増える。

**やること**: 2026-10-05 に冒頭で「1題・約1,000字・4項目」と「解答例の使い方」に答え、seoTitle・description に「解答例の使い方」を入れ、試験概要・出題傾向・技士と主任技士の違いの3ページからリンクを足して本番へ出した（5f9dbebb9・deploy 9e1156d53）。2026-11-02 以降に、28 日集計で「コンクリート主任技士 小論文」「〜 解答例」の順位・表示を反映前と比べる。

**完了条件**: 反映から 28 日後の集計で、「コンクリート主任技士 小論文」が 10 位以内か、表示が増えている。

### [DN-0534] コンクリート主任技士の資格トップを「過去問」の検索語の受け皿にする
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:改善] [起票:2026-10-05] [期日:2026-11-06]

**起点**: GSC（2026-09-01〜09-28）で「コンクリート主任技士 過去問」は 70〜71 位（出ているのは primary/products・表示 2）、「コンクリート主任技士 過去 問 pdf」は資格トップが 47 位。Bing では同じ語が 5 位・表示 62・クリック 9（14.5%）で、需要はある。資格トップ `/exam/concrete-chief-engineer` は分野別の過去問 8 ページを束ねるページなのに、title が「コンクリート主任技士 | doboku-note」で「過去問」の語が無い。技術士一次の資格トップは `src/config/categories.json` の `seoTitle` に「過去問一覧」を入れた前例がある。11〜30 位の改善サイクルの外（70 位）なので、効果は遅い前提。重点資格外。

**やること**: 2026-10-05 に資格トップの seoTitle・subtitle・description へ「過去問334問・平成24〜令和5年度・8分野」を入れて本番へ出した（PR #869・deploy 9e1156d53。分野別ページからはパンくずで戻れる）。2026-11-02 以降に、28 日集計で「コンクリート主任技士 過去問」系の検索語に資格トップが出ているか・表示が増えたかを反映前と比べる。

**完了条件**: 反映から 28 日後の集計で、「コンクリート主任技士 過去問」系の検索語に資格トップが出ていて、表示が増えている。


### [DN-0525] noteカバーの未退避14件を保全し、R2台帳との不一致を解消する
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:不具合] [起票:2026-10-03]

**起点**: `npm run check-asset-storage` が manifest 2,610件を検査し、既存カバーの未退避14件（舗装6・管工事1・測量士7）で exit 1。ローカルと台帳のハッシュ不一致も140件。今回保存した2級土木・コンクリートのPOPカバー4枚には問題がなく、R2読み戻しでサイズ・SHA-256の一致を確認済み。

**やること**: 未退避14枚を既存note-cover-pngグループで保存し、全バイトを読み戻して台帳へ登録する。不一致140枚は採用版を確認してから同期する。既存R2実体・ローカル実体の削除や一括上書きは行わない。

**完了条件**: `npm run check-asset-storage` が exit 0になり、note-cover-pngのnot-offloadedとlocal-newerが0件。同期対象のR2読み戻しSHA-256がローカルと一致する。






### [DN-0519] note 配布PDFの貼り直しの残り（建設部門・総監の模範解答 20 本・予想模試 2 記事）を公開記事へ反映する
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-10-03]

**起点**: 2026-10-03 に配布PDFを全数点検し、印字不具合（太字記号「**」の残り）と記事改訂の未反映（必須科目I は記事が「I-1・I-2 両方を収録」なのに PDF は 1 問分など）を直した PDF を作成済み（Drive vault・`drive-manifest.json` 登録済み）。note への貼り直しは択一 6 商品（分冊追加含む）と模範解答 47 本まで終え、運営者の指示で中断した。残りは次の 20 本と予想模試 2 記事（1級 C8 第1回 解答解説・2級 C9 第1回 問題冊子を直した版。1 記事に 6 本添付）。中断した鉄道R06・R08予想・トンネルR03 はライブで添付充足・破損なしを確認済み。残り: 建設部門 BK-10_鉄道/R06 III、建設部門 BK-10_鉄道/R07 III、建設部門 BK-10_鉄道/R08-yosou III、建設部門 BK-11_トンネル/R03 III、建設部門 BK-11_トンネル/R07 III、建設部門 BK-11_トンネル/R08-yosou III、建設部門 BK-I_必須科目I/R03、建設部門 BK-I_必須科目I/R04、建設部門 BK-I_必須科目I/R06、建設部門 BK-I_必須科目I/R07、建設部門 BK-I_必須科目I/R08-yosou-1、建設部門 BK-I_必須科目I/R08-yosou-2、建設部門 BK-I_必須科目I/R08-yosou-3、建設部門 BK-I_必須科目I/R08-yosou-5、建設部門 BK-I_必須科目I/R08-yosou-6、総監 総監模範論文-自治体下水道担当/R04、総監 総監模範論文-自治体下水道担当/R05、総監 総監模範論文-自治体下水道担当/R07、総監 総監模範論文-自治体下水道担当/R08-yosou-2、総監 総監模範論文-自治体都市計画担当/R08-yosou-2。

**やること**: (1) 上の 20 本の article パスを `.tmp/mag-resume-list.txt` に書き、10 本ずつ `DOBOKU_PW_MIN_FREE_MB=1000 node scripts/note-update-body.mjs --list <list> --reattach-pdf --force-retry --commit` で流す（まとめて流すと空きメモリ不足でブラウザが落ちた。`--force-retry` は 10/3 の中断記録を越えるため）。(2) 予想模試 `content/note/1級・2級土木/{1級土木,2級土木}/magazines/*-R8二次-予想模試3回/施工経験記述/article.md` を同じく `--reattach-pdf --commit`（2 記事で 12 件アップロード）。1 日のアップロード上限（安全側 90）を超えないよう日を分ける。

**完了条件**: 反映先 75 記事を `npm run check-note-attachments:live -- --only <noteId…>` で実査し、確定不足 0。

### [DN-0518] note 配布PDFの spec（scripts/pdf-specs・pdf-spec.json）を記事の現行構成に合わせ、作り直すと中身が欠ける・導線が混入する状態を直す
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-10-03]

**起点**: 2026-10-03 の配布PDF全数点検（全 51 spec・697 本を `.tmp` へ作り直して販売中PDFと本文比較）。改訂を反映すべき建設部門・総監の 67 本は差し替え済みだが、次の spec は今の記事で作り直すと販売中より悪くなるため差し替えを見送った。(1) RCCM問題I 部門別 3 本（上水道・下水道・土質及び基礎）が 6,000 字→400 字前後に欠ける。(2) 総監口頭試験-完全準備-想定25問 が 10,591→1,485 字に欠ける。(3) 1級土木 経験記述 完全攻略パック 100 本で「関連リンク 出題傾向と書き方（無料）…」が PDF に混入し、合格ラボ誘導文が抜ける。(4) 2テーマ組合せ大全・学科記述テーマ別（1級・2級）で末尾の「出典」節が落ちる。(5) 建設部門-口頭試験対策-想定33問 でもくじ誘導文（note URL）が混入する。販売中PDFは中身がそろっているので購入者への実害は今は無いが、次に記事を直して作り直すと欠けたPDFを配ってしまう。あわせて 1級・2級の約 200 本は本文の目印を【〇〇】へそろえた改訂（DN-0277）が PDF に未反映（見た目のみ）。`content/coconala/assets/pdf/` の C8/C9 の回番号なし旧版 4 本はどこからも参照されていない。

**やること**: (1) 上記 spec の include/exclude を現行の見出しへ合わせる。(2) 全 spec を作り直して販売中PDFと本文比較し、欠落・混入 0 を確かめる（比較手順は今回と同じ：pdftotext の空白除去テキストの文字集合比較＋note.com/関連リンク/もくじ の混入検査）。(3) 差のあるものを差し替え、`note-update-body --reattach-pdf` で note へ反映（1日 90 件まで）。

**完了条件**: 全 spec の作り直しで、販売中PDFとの差が「意図した改訂」だけになり、欠落・導線混入が 0 件。

### [DN-0514] 2級土木の note 商品ラインナップを試験後に整理する（販売 0 の 18 商品の見せ方・工種別パックを工事バンクの入口に）
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-02]

**起点**: 2026-10-02 の導線点検。2級の有料 22 商品のうち、まとめ売りで売れたのは 4 商品（完成答案集 3・直前パック 2・想定工事バンク 2・過去問模範答案集 1）と単品記事 11 件で、残り 18 商品（工種別パック 10・二次まるごと・学科記述テーマ別・暗記ノート・出題分析・予想模試・択一 PDF・小規模インフラ 4 工事）は販売 0（`data/note/sales.json`・9/28〜30 は DN-0511 で未取得）。工種別パック 10 本は想定工事バンクの部分集合（`config/products.json` の civil-2-koji-bank の includes）だが、サイトでは例文ページ下部のカードにしか無く表示は各 3 回前後（GA4 9/4〜10/1）。二次まるごと（¥8,800）は公開以来 0 件・案内記事の 9 月閲覧 15 で、値上げ（¥12,000 案）は 1級まるごと ¥11,800 を上回るため見送った。

**やること**: (1) 試験翌日（10/26）以降に EXP-011・EXP-014・EXP-015 の判定と合わせ、販売 0 商品ごとに「見せ方を変える／束ねる／据え置く」を決める。(2) 工種別パックを「自分の工種だけ ¥2,480／全部 ¥6,980」の段として見せる面（例文ページ上部・工事バンク案内記事）を作る。(3) 二次まるごとの価格を 1級まるごとより下の帯で見直す。

**完了条件**: 18 商品それぞれの扱いが `config/products.json` と配線（`src/lib/magazine-placement.ts`）に反映され、判断理由が EXP-011 の learnings に残っている。



### [DN-0503] 技術士一次試験の科目別の過去問一覧（基礎・適性・専門 建設・専門 上下水道）を作る
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-10..2026-11] [種類:制作] [起票:2026-10-02]

**起点**: 2026-10-02 の確認。一次試験の過去問は「年度×科目」の 64 ページ（`/exam/pe-first-stage/primary/{年度}-{basic|aptitude|construction|water-supply}`）で、一覧はカテゴリページの年度×科目の表だけ。科目ごとに全年度をまとめた一覧が無く、「技術士一次試験 基礎科目 過去問」のような科目名付きの検索の受け皿が無い（科目別の学習ガイド `guide-basic-subject` 等が近い役割）。需要は未確認（GSC・Bing に科目名付きのクエリはまだほぼ出ていない）。

**やること**:
1. 作り方を決める: (a) 新しい科目別一覧ページを 4 本作る、(b) 既存の科目別ガイド（基礎・適性・専門 建設）に全年度の一覧節を足し、上下水道だけ新設する。ガイドとの共食い（同じ検索語で 2 ページが競う）を避ける側を選ぶ。
2. 各一覧に H23〜R7（R01 再試験を含む）の年度リンク・問題数・その科目の出題傾向の要点・無料演習（建設 3 科目）への導線を置く。
3. 一覧ページの題名を「技術士一次試験 {科目} 過去問一覧｜平成23〜令和7年度 全N問の解答・解説」の形にし、カテゴリページと各年度ページから相互にリンクする。

**完了条件**: 4 科目の一覧（または一覧節）が公開され、`npm run refresh-indexes` が通る。公開 4 週間後に GSC・Bing で科目名付きクエリの表示とクリックを記録する。

**進捗（2026-10-02）**: (b) を採用。基礎・適性・専門（建設部門）の対策ガイドに「過去問一覧（平成23〜令和7年度・全16回）」の節と無料演習への導線を足し、seoTitle に「過去問一覧」を入れた。上下水道は科目ガイド `/exam/pe-first-stage/guide/water-supply-subject`（出題の並び・毎回出るテーマ・25問の選び方・全16回560問の一覧）を新設。本番反映済み（c0eceb317）。残りは公開 4 週間後（10/30 前後）に GSC・Bing で科目名付きクエリの表示とクリックを記録すること。

### [DN-0501] 技術士一次試験の note CTA のクリック率を比べ、配置を見直す
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-02]

**起点**: 一次試験ページの note CTA は表示約 1,300・クリック約 16（約 1.2%、GA4 by-label 10/2 取得）、note 3 商品（過去問PDF 合本・直前暗記ノート・直前パック）の売上記録は 0 件。過去問ページの平均セッション時間は 5〜10 分。2026-10-02 の運営者指示で一次試験の過去問PDF CTA に生成済みの本文用・サイドバー用 POP 画像を採用するため、変更後の反応を比較する。

**やること**:
1. 変更前後の表示・クリックを、既存の `data-cta-label`・`data-cta-placement` で比較する。変更後の 2〜3 週間を測り、note 売上も確認する。
2. `answer_reveal` の開封計測と合わせ、解説の途中を含む配置候補を検討する。配置を試す場合は `data/business/experiments.json` に登録する。

**完了条件**: 配置別の表示・クリックと売上を記録し、配置を維持するか変更するかを決めた。

### [DN-0499] 技術士一次試験ページの SEO を直す（インデックス回復・題名を検索語へ・過去問一覧を受け皿に）
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-10-02] [進行中]

**起点**: 2026-10-02 の調査。一次試験 53 ページのうち Google のインデックス済みは 27（52%・サイト全体 79%）で、R07 基礎と無料演習は「Google に認識されていない」（URL 検査 9/30）。Google の表示は月 251 回・14 クリック。Bing は「技術士一次試験」週 400〜660 表示・3〜5 位なのにクリック率 1〜3%、「過去問」「過去問 解答」は 6〜8 位で 0 クリック。題名は「令和7年度 技術士第一次試験 基礎科目 過去問解説【技術士 第一次試験】」と末尾が重複している。

**やること**:
1. インデックス回復: インデックス率の高い総監・トップ・建設部門のページから、一次試験の入口と R07 の 3 科目・無料演習へ内部リンクを張る。主要 10 ページの GSC インデックス登録リクエストは運営者が GSC の画面で行う（エージェントは対象 URL の一覧を渡す）。
2. 題名・説明文を検索語の語順へ（例「技術士一次試験 過去問 令和7年度 基礎科目｜全30問の解答・解説」）。重複する末尾の【】を外す。「技術士一次試験」で表示される入口ページの説明文を、日程・合格率・過去問の入口が伝わる形にする。
3. 一次試験のカテゴリページを「過去問一覧（H23〜R7・建設と上下水道 1,830 問・解答と解説）」の受け皿として題名と冒頭を作り直す。

**完了条件**: 変更をデプロイし、4 週間後（2026-11 初め）の GSC で一次試験ページのインデックス数・表示回数、Bing で「技術士一次試験 過去問」系のクリックを変更前（本カードの数値）と比べて記録する。



### [DN-0527] note マガジンに入っている「原稿と結び付かない記事」31 本を確かめ、原稿の記事へ差し替える
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-10-04]

**起点**: 2026-10-04 に note の全商品 143 件を `content/products/note/` へ移したとき、公開中のマガジンの収録記録（`data/note/magazines.json`）に、原稿の frontmatter の noteId と一致しない記事が 31 本あった。題名は原稿と同じで ID だけが違う（例: 建設部門 道路 R07 II-1 は原稿が `n9c791def70f4`、マガジンの収録が `n123cf1c5f8f0`）。内訳は 1級 施工経験記述 完全攻略パック 14・建設部門 道路 選択科目 模範解答集 16（道路まるごとパックも includes で同じ記事）・総監 記述式 完全パック 1。正本には今の収録どおり `note:<noteId>` で書き、`npm run check-products` が毎回一覧を出す。

**やること**:
1. 31 本の ID が note 上で何か（重複公開した旧版か・原稿の無い別記事か）を `npm run verify-note-magazines -- --contents --json` と note の実物で確かめる。
2. 旧版なら、マガジンの収録を原稿の記事へ差し替え（note の操作は運営者の承認つき）、`npm run product -- add-member / remove-member` で正本の `note:` を原稿のパスに直す。原稿の無い記事なら、原稿を起こすか収録から外す。

**完了条件**: `npm run check-products` の「原稿と結び付かない収録」が 0 本。

### [DN-0493] 商品の正本の段階2: 導線設定・カバー設定を正本から生成し、商品設計の画面を正本から読む
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-01]

**起点**: DN-0492（PR #807）で 2級土木の note 商品23件を `content/products/note/` へ移し、`note-magazines.ts` の該当部分を生成にした（2026-10-04 に残りの資格も移し、note の全 143 件が正本から生成）。冒頭導線の記事別ルール（`config/note-intro-standard.json` の variants.civil2）・カバー設定（`config/note-covers.json` の characterCovers）・マガジンの `note掲載文.txt` は、まだ正本と別に手で持っている。

**やること**:
1. 冒頭導線の記事別ルールを、正本の persona・members から生成する（`npm run product -- gen` に含める）。
2. カバー設定（proof・benefit・magazineName）と `note掲載文.txt` を正本の catalog から生成する。
3. 管理画面の商品設計（`/product/design`）を、収録の実測だけでなく正本（作成予定の商品・収録の意図との差）からも出す。
4. 正本の変更から note への反映計画（作成・改称・収録の追加）を出す `npm run product -- plan` を作る（実行は従来の承認つきスクリプト）。

**完了条件**: 2級土木で、パック1本の追加が「正本に1ファイル足す → gen → note への反映」で済み、手で直すファイルが正本以外に無い。

### [DN-0490] 技術士・1級土木の副業と独立のガイドを 1 本書き、検索需要を 8 週で確かめる
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-10..2026-12] [種類:制作] [起票:2026-10-01]

**起点**: 2026-10-01 のユーザー相談（建設業の補助金申請・建設業許可の受注で副業という視点）。自サイトの GSC（7〜9 月の全スナップショット・直近 28 日 935 クエリ）と Bing（07-05〜上位 1,200 クエリ）に「副業・独立・補助金・建設業許可」を含むクエリは 0 件（記事が無いため。需要が無い証拠ではない）。Google サジェストには「技術士 独立 年収／独立開業／建設部門 副業」「土木 積算・設計・CAD 副業」「建設業許可 専任技術者 副業」が出る。補助金申請代行・名義貸しはサジェスト無し。

**やること**: `content/site/pe-construction/` にガイド 1 本（本文 3,000 字以上）。資格保有者が合法にできる副業・独立（技術コンサル・積算・設計補助・CAD・講師・執筆）と、してはいけない線（営業所技術者等の名義貸し、建設業許可・補助金申請書類の報酬を得た作成代行＝行政書士の業務）を整理する。法令の記述は公開前に一次情報で照合。既存 `guide-career` と相互リンク。

**状態**: 2026-10-01 に `content/site/pe-construction/fukugyou-dokuritsu/article.mdx`（/exam/pe-construction/guide/fukugyou-dokuritsu）を公開・develop へ push。残りは 12 月末の計測だけ（production 反映は次回 deploy）。

**完了条件**: 公開・`npm run refresh-indexes` 済みで develop に push。公開から 8 週後（2026-12 末）に GSC・Bing で副業・独立クエリの表示有無を確認し、表示が出なければこのテーマを広げない判断をカードに書いて閉じる。

### [DN-0491] 運営者の行政書士取得を前提に、行政書士（建設業許可・補助金）領域の展開計画を立てる
タグ: [収益化] [領域:戦略] [時期:2026-10] [種類:意思決定] [起票:2026-10-01]

**起点**: 2026-10-01 にユーザーが「行政書士は取得する」と決定。`docs/strategy/02_設計思想.md` と `03_事業戦略.md` では行政書士は「将来候補・未着手」のまま。

**やること**: (1) 受験年度（行政書士試験は例年 11 月第 2 日曜）と学習計画を運営者と決める。(2) 02・03 の行政書士の位置づけを「取得予定（運営者が受験）」へ更新する。(3) 合格・登録後に可能になる建設業許可・経審・補助金の書類作成受託（ココナラ等）と、受験者向け `/exam/gyoseishoshi/` を、共通事業方針の判断の問いで評価する。登録前は報酬を得た書類作成代行を出品しない。

**完了条件**: 02・03 が更新され、展開する／しないと時期が決まって、展開するなら制作カードへ分割されている。


### [DN-0486] 資格の正本の要対応 57 件（主担当の原文照合が未了 27 件ほか）を公式ページで照合して verification を更新する
タグ: [コンテンツ品質] [領域:戦略] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-01]

**起点**: 月次レビュー（2026-08-01〜2026-08-31）の資格の正本と市場で見つけた。`npm run exam-ssot-status` が 37 資格中 26 資格で要対応 57 件。うち 27 件は「主担当の原文照合が未了（調査担当の読み取りのみ）」、残りは次年度日程の未登録・統計の公式 PDF 未特定など。

**やること**: 展開中（active）の資格から順に、実施機関の公式ページ・公式 PDF を主担当が読み、`qualification-registry.json`・`exam-calendar.json`・`exam-stats.json` の `verification`（照合日・checkedBy・unresolved/pending/notPublished）を書き換える。更新後に `npm run check-exam-calendar` を通す。1 回の月次で全部やらず、active の資格を優先して残りは翌月へ回す。

**完了条件**: `npm run exam-ssot-status` の要対応が active 資格で 0 件。

**残り（2026-10-06 時点・全体 56 件）**: active で残るのは測量士・測量士補の次年度日程の 2 件だけ（国土地理院の令和9年の公式発表を確かめて `exam-calendar.json` を更新。gsi.go.jp はクラウドのセッションから届かないので手元の端末で確認する）。

### [DN-0487] 過去問の年度在庫で「取得済みなのに Drive 台帳にも手元にも無い」2,112 件を、実在に合わせて直すか取得し直す
タグ: [コンテンツ品質] [領域:戦略] [時期:2026-10] [種類:不具合] [起票:2026-10-01]

**起点**: 月次レビュー（2026-08-01〜2026-08-31）の点検と Issue で見つけた。`npm run check-past-exam-inventory` が FAIL 2,112 件（WARN 0）。全件が技術士の重点外の部門（第一次試験 361・機械 171・農業 133・電気電子 113・化学 105 ほか 20 部門）で、理由は全件「取得済みと書いたのに Drive 台帳にも手元にも無い」。

**やること**: (1) 実際に Drive の過去問 vault にあるかを 1 部門で確かめ、台帳（`data/pastexams/inventory.json`）の書き方の誤りか、ファイルの欠落かを切り分ける。(2) 台帳の誤りなら取得状態を実在に合わせて直す。欠落なら `/past-exam-archive` の手順で公式から取り直すか、重点外の部門は在庫の対象から外す（外すなら理由を台帳に書く）。

**完了条件**: `npm run check-past-exam-inventory` が FAIL 0 件。

### [DN-0484] afb を CI で取得し、取得スクリプト自身が Secrets でログインする形を試す
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-01] [進行中]

**起点**: 2026-10-01 にユーザー決定で、ログインが必要な全サービスを CI でも自動で入り直す方針にした。afb はログイン状態を別プロセスへ持ち出せない（`sessionPersistsAcrossProcesses: false`・9/21 CI で requiredlogin へ戻された）ため、`auth-session-refresh --ci` で入り直してから別プロセスの取得スクリプトを動かす形は効かない。

**やること**: (1) afb のログイン画面（`https://www.afi-b.com/pa/`）の入力欄を読み取りで確かめ、`scripts/lib/auth-session-refresh.mjs` の `AUTO_LOGIN` に afb を足す（正本の `autoLogin` も true）。(2) `afb-scan` / `affiliate-status` の afb 経路で、未ログインなら同じプロセス内で `readServiceCredential('afb')` の ID/PW で 1 回だけログインしてから取得する。(3) 正本の afb を `ci.enabled:true`・`credential.ciCredential:true` にし、`login-collectors.yml` の afb step に Secrets を渡す。(4) 毎月 3 日の実行で取得できるかを見て、続けるか戻すかを決める。afb の既定サイトは stats47（`asp-site-guard`）なので、サイト帰属の検査は維持する。

**完了条件**: CI の afb 取得が 1 回以上成功する、または不成立の理由を記録して正本を `ciCredential:false` に戻した。

**2026-10-01 実装**: (1)〜(3) を実装（`openAsp` が同じプロセスで 1 回だけログイン・CI では人を待たずに失敗）。残りは (4) 11/4 の定期実行（または `workflow_dispatch` service=afb）の結果を見て判断する。main へ deploy してから。

### [DN-0483] もしもアフィリエイトの CI 取得を新設し、Secrets で入り直す形を試す
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-01] [進行中]

**起点**: 2026-10-01 にユーザー決定で、ログインが必要な全サービスを CI でも自動で入り直す方針にした。もしもは正本で `ci.mode: none`（CI で取得していない）で、手元の `affiliate-status` / `affiliate-apply` だけが使う。口座は stats47 と共用。

**やること**: (1) CI で何を取るか決める（提携状況・成果など `affiliate-status` のもしも経路）。(2) 正本の moshimo を `ci.mode: encrypted-state`・`enabled: true`・cron・`readOnlyScripts` に設定し、Mac の `auth-session-refresh --export` で暗号化 state を渡す。(3) `login-collectors.yml` に moshimo の step と Re-login の対象を足し、正本の `credential.ciCredential` を true にする（Secrets は保管済み）。(4) 数回の実行で取得が続くか・共用口座に追加確認が出ないかを見て、続けるか戻すかを決める。

**完了条件**: CI のもしも取得が 1 回以上成功する、または不成立の理由を記録して戻した。

**2026-10-01 実装**: (1)〜(3) を実装（提携状況を `affiliate-status --asp moshimo --write` で毎週日曜 21:40 UTC に取得）。残りは Mac の `auth-session-refresh --export` でもしもの暗号化 state を渡すこと（DN-0479 と同じ Mac 作業）と、main へ deploy 後の実行結果で (4) を判断すること。


### [DN-0481] A8 の CI 取得で Secrets による入り直しを 10 月の火曜実行で評価し、続けるか戻すかを決める
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-01] [期日:2026-11-05]

**起点**: A8 は揮発性 Cookie で、Mac から渡した暗号化 state が CI の定期収集の時点で切れていた（2026-09-22 run 35670832802・Issue #570）。2026-10-01 にユーザー決定で、A8 も GitHub Secrets（`DOBOKU_AUTH_A8_USER` / `_PASSWORD`）を持たせ、`login-collectors.yml` で切れていたときだけ 1 回入り直す形にした。口座は stats47 と共用。

**やること**:
1. main へ deploy されたことを確かめる（scheduled は main 版で動く）。
2. 10 月の火曜（JST 06:20）の login-collectors の A8 の結果を見る: restore の状態、re-login の結果（ok / login_failed / human_required）、`a8-ui:fetch` の rc、Issue の有無。
3. stats47 の A8 収集と、手元（Windows・Mac）の A8 のログイン維持が同じ週に止まっていないかを `/ops/auth` と stats47 側で確かめる（ログイン回数が増えてロック・追加確認が出ていないか）。
4. 取得が続き、共用口座に追加確認が出ていなければ続ける。出るなら `playwright-auth-profiles.json` の a8 を `credential.ciCredential:false` に戻し、ワークフローの Re-login 対象から外して Secrets を削除する。

**完了条件**: 続ける／戻すを決め、正本・ワークフロー・Secrets をその状態にそろえた。

### [DN-0480] KDP の CI 取得（Secrets で入り直し）を 10/16・10/28 の実行で評価し、続けるか戻すかを決める
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-10-01] [期日:2026-11-05]

**起点**: 2026-10-01 にユーザー決定で、KDP も GitHub Secrets（`DOBOKU_AUTH_KDP_USER` / `_PASSWORD`）を持たせ、`login-collectors.yml` の KDP を `enabled:true` に戻して試すことにした。9/21 は CI の state 復元で Amazon が端末変更として再認証を求め、手元のセッションまで切れたため `enabled:false` にしていた。今回は CI の「Re-login with Secrets」と各 PC の毎日のログイン維持（17:45）で入り直せる形にしてある。

**やること**:
1. main へ deploy されたことを確かめる（scheduled は main 版で動く）。
2. 10/16・10/28（JST 06:40）の login-collectors の KDP の結果を見る: restore の状態、re-login の結果（ok / human_required / login_failed）、`kdp-report` の rc、Issue の有無。
3. 同じ日の手元（Windows・Mac）の KDP のログイン維持の結果を管理画面 `/ops/auth` で見る（CI のせいで手元が切れていないか）。
4. 2 回とも取得できていれば続ける。2 段階認証で止まる・手元が毎回切れるなら、`playwright-auth-profiles.json` の kdp を `ci.enabled:false`・`credential.ciCredential:false` に戻し、Secrets を削除する。

**完了条件**: 続ける／戻すを決め、正本・ワークフロー・Secrets をその状態にそろえた。

### [DN-0479] Mac でも全ログインサービスの資格情報をキーチェーンへ登録し、管理画面で揃ったことを確かめる
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-01]

**起点**: 2026-10-01 にユーザー決定で、ログインが必要な全サービスの ID/PW を各 PC の OS 資格情報ストアで管理する方針にした。正本は `.claude/config/playwright-auth-profiles.json` の `services.<id>.credential`、確認は管理画面の 管理 ＞ ログインと資格情報（`/ops/auth`）。Windows は note・ココナラを登録済み（同日）で、Mac は未着手。管理画面が見えるのはその PC の登録だけなので、Mac は Mac で確かめる。

**やること**（Mac で。パスワードは対話入力にして引数や履歴に残さない）:
1. develop を最新にして `npm run admin` を起動し、`/ops/auth` を開いて未登録の行を確かめる。
2. 全 9 サービスの項目をキーチェーンへ登録する: `security add-generic-password -s doboku-note-auth-<service> -a <ログインID> -w`（service は note・coconala・kdp・a8・moshimo・x・instagram・google・afb）。note・ココナラの ID は dobokunotecom@gmail.com。A8・もしもは stats47 の `stats47-measurement-a8` / `-moshimo` が Mac にあればそれで足りる（doboku-note 側を優先して読む）。
3. `npm run auth-refresh:install -- --status` で launchd（`com.doboku-note.auth-session-refresh`）が登録済みか確かめる。未登録なら `npm run auth-refresh:install`。
4. `npm run auth-refresh:install -- --run-now` で 1 回走らせ、`~/Library/Logs/doboku-note/auth-session-refresh.log` と `/ops/auth` の「最新の維持結果」が ok になるのを確かめる。
5. `node scripts/note-sales-fetch.mjs --month <前月>`（dry-run）で、売上ページのパスワード再確認を資格情報で通せるか（`[1b]` の行）を確かめる。

**完了条件**: Mac の `/ops/auth` で「この PC の資格情報」が 9 件とも登録済み（A8・もしもは共用項目でも可）、定期実行が登録済み、自動ログイン対応の行（note・ココナラ・KDP・A8・もしも）の最新の維持結果が ok か失敗理由が分かる状態。

### [DN-0478] 2級二次の後に、無料化した週次お題10本の時期表現を来年度も使える言い方へ直す
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:改善] [起票:2026-10-01] [期日:2026-10-31]

**起点**: 2026-10-01 に合格ラボの週次お題（`content/note/1級・2級土木/メンバーシップ/予想問題マガジン/` W01〜W10）を無料記事へ切り替えた。中身（公衆災害・コンクリート品質・工程遅延の回復など）は年度に依存せず来年度も使えるので、ユーザー決定で削除せず残す。ただし題名・カバー・本文に「今週のお題」、冒頭のココナラ案内に「直前に答案を〜」が残り、試験後は古く見える。2級二次（10/25）までは直前期の表現のまま触らない。学科記述予想10本は時期の表現が無く対象外。

**やること**（10/26 以降）:
1. W01〜W10 の H1・`coverTitle`・`cover.leadIn`・本文見出しの「今週のお題」を「経験記述のお題」へ、冒頭ココナラ案内の「直前に答案を人の目で確かめたいときは」を「答案を人の目で確かめたいときは」へ言い換える。
2. `note-update-body --list` で本文を、`note-update-cover` でカバーを反映する（タイトルは frontmatter に `title` が無いので、反映の要否を先に確かめる）。
3. W11 直前総点検は、10/26 以降の閲覧数（`npm run note-traffic-fetch`）を見て、非公開にするか来年の直前期まで寝かせるかを決める。
4. 添削事例01の冒頭ココナラ案内の「直前に」も同じく言い換える。

**完了条件**: `git grep -n -e 今週のお題 -e 直前に答案 -- 'content/note/1級・2級土木/メンバーシップ/*article.md'` が W11 以外で0件、公開 API で W01〜W10 と添削事例01の本文に「今週のお題」「直前に答案」が無い。W11 の扱いが決まっている。

### [DN-0475] 2級土木 一次の残り 6 年度分（前期 r07・後期 r03〜r07）と 1級土木 一次の設問文の転記ずれを公式問題と照合する
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10..2026-11] [種類:不具合] [起票:2026-10-01]

**起点**: 2026-09-30 に 2級土木 一次前期 r03〜r06 を公式問題と照合したところ（DN-0473）、AI 転記の崩れが 4 年度で数百行あり、意味が変わるもの（「適当なもの／でないもの」の取り違え、「堆積させなければならない」→「させてはならない」、表の中身の別内容）も含まれていた。同じ手順で作った他の年度にも同種の崩れがある見込みが高い。

**やること**: `content/site/civil-construction-2/primary-r07-zenki` と `primary-r03-kouki`〜`primary-r07-kouki`、`content/site/civil-construction-1/primary-*`（h26〜r07・a/b）の全問について、設問文・選択肢を公式の問題（全国建設研修センターの公表 PDF、現行ページが 404 なら Wayback Machine。1級は docs/textbook 配下の原典 PDF も可）と照合し、ずれを直す。正答は公式の正答表と照合し、変わる場合は解説と ExamPoint も合わせる。年度ごとに commit し、`past-exam-qa` で監査する。原典が取れない年度は理由を残す。

**手がかり（2026-10-06）**: (a) r07 前期 No.63（足場の数値の組合せ）は正答 (1) の作業床幅を「30 cm 以上」とし、解説が「条文上 40 cm が原則だが小規模特例あり」と補っている。労働安全衛生規則 第563条は作業床の幅 40 cm 以上・支持物 2 以上なので、今の選択肢表ではどれも条文と合わない＝転記の崩れが疑わしい（r08 前期 No.53 の公式正答でも「作業床の幅は 30 cm 以上」は誤り）。最優先で原典と照合する。(b) 2級の PDF は poppler（pdftotext/pdftoppm）だと太字＝設問番号と「適当でないもの」等の極性語が落ち、ふりがなが混入する。照合は pypdfium2（`python3 -I`）で描画した画像で行う（DN-0547 で確認）。r07 前期の公式 PDF は現行ページに無く、jctc.jp の wp-content/uploads/2025/06 の推測 URL も 404、web.archive.org はクラウドのセッションから届かないので、手元の端末で原典を取る。

**完了条件**: 対象の全年度で照合済み（照合できなかった年度・問題は理由つきで列挙）、`past-exam-qa` で転記起因の指摘が 0、`npm run refresh-indexes` 済み。


### [DN-0468] 技術系公務員の定年延長と再任用のガイドを新規に書く（土木公務員の資格意図の受け皿）
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-12..2027-02] [種類:制作] [起票:2026-09-30]

**起点**: `docs/strategy/17_定年後・独立キャリア記事拡充計画2026-09.md` の順 1。GSC（2026-08-28〜09-24）で「公務員 土木 資格」が約 22 表示・9〜11 位、「役職定年制」4、「管理職 定年」2。

**やること**: 技術系公務員の定年延長・再任用・役職定年で、資格（1級土木・技術士）により選択肢がどう変わるかを書く。運営者の発注者経験を一次情報にする。既存のキーワードページ（`elderly-employment-act`・`continued-employment-system`・`mandatory-management-retirement`）は削除せず、制度の定義はそちら、本記事は「自分はどうするか」に分けて相互リンクする。転職導線は置かない。制度・数値は人事院・総務省の公表資料で照合する。

**完了条件**: 本文 3,000 字以上で公開・`npm run refresh-indexes` 済み。`qualification-map` とキーワードページ 3 本から本記事へリンクがあり、note 導線なし。`npm run check-guide-length` が通る。

### [DN-0469] 建設コンサル・発注者支援への転身ガイドを新規に書く（company-types・consultant と役割分け）
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-12..2027-02] [種類:制作] [起票:2026-09-30]

**起点**: 計画書（docs/strategy/17）の順 2。GSC で「サブコン コンサル」8 表示（7〜10 位）、「建設コンサルタント 施工管理 違い」5（15.8 位）、「ゼネコン コンサル」8（47 位）。既存の `civil-construction-1/guide-company-types`・`guide-consultant` が受けている。

**やること**: 施工管理経験者と公務員 OB に向けて、建設コンサル・発注者支援業務への転身で何が変わるかを比較する。既存 2 本は削除せず、本記事を「転身の判断」、既存を「会社の種類の違い」に分けて相互リンクする。転職導線は既存規約どおりに置く。他者の体験談・想定年収・成功率は載せない。

**完了条件**: 本文 3,000 字以上で公開・`refresh-indexes` 済み。既存 2 本から本記事へリンクがあり、`npm run check-career-separation` が通る。

### [DN-0470] 建設部門の guide/career に技術士の定年後の働き方の節を足す
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-12..2027-02] [種類:改善] [起票:2026-09-30]

**起点**: 計画書（docs/strategy/17）の順 3。GSC で「技術士 年収」系が約 11 表示（73 位前後）、「技術士転職」7。冒頭の年収の答えは 2026-09-30 に足し済み（DN-0391）。

**やること**: `content/site/pe-construction/guide-career` に再就職・顧問・嘱託など定年後の働き方の節を足す。独立の詳細は DN-0472 の記事へ送る（先行リンクは張らない）。年収の数値は公表統計で照合する。転職導線は既存の配置を保つ。

**完了条件**: 節を追加して公開済み、冒頭の年収の答えを損なっていない、`refresh-indexes` 済み、`npm run check-career-separation` が通る。

### [DN-0471] 1級土木の age-career に 60 代の再雇用・嘱託・技術者の年齢の節を足す
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-12..2027-02] [種類:改善] [起票:2026-09-30]

**起点**: 計画書（docs/strategy/17）の順 4。`civil-construction-1/guide-age-career` は 11 表示・13.5 位。現状は 40〜50 代中心。

**やること**: 60 代の再雇用・嘱託と、監理技術者・主任技術者の年齢面の扱いを一次資料（国交省など）で確かめて節にする。転職導線は既存の配置を保つ。他者の体験談や想定年収は載せない。

**完了条件**: 節を追加して公開済み、本文 3,000 字以上を維持、`refresh-indexes` 済み、`npm run check-career-separation` が通る。

### [DN-0467] coconala-edit の公開中サービス dry-run を実機で 1 回走らせ、exit 0 と公開画像が変わらないことを確かめる（運営者の再ログイン後）
タグ: [インフラ・計測] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-09-30]

**起点**: PR #848 で、公開中サービスの `coconala-edit.mjs` を `--commit` なしで回すと送信しない dry-run になり、画像には触らず枚数だけ読むようにした（回帰テスト `tests/coconala-submit-choice.test.mjs`）。2026-10-03 の実機確認は Mac のココナラのログインが切れていて未実施（6 分待機でタイムアウト・パスワードはエージェントが入れない）。

**やること**: 運営者が Mac でココナラに再ログインしたあと、`node scripts/coconala-edit.mjs --service coconala-cce-essay-tensaku --image <main の content/coconala/assets/thumb-cce-essay-tensaku.png の絶対パス> --replace-image` を実行し、公開ページ https://coconala.com/services/4425046 の og:image（実行前 `757b3de9-9784853.png`）と比べる。

**完了条件**: 上の実行が `RESULT` の `mode:"dry-run"`・exit 0 で終わり、公開ページの og:image が実行前と同じ。





### [DN-0452] 管工事（1級・2級）の施工記述を分析し、note 教材を 1 商品で試す
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:制作] [起票:2026-09-29]

**起点**: 2026-09-29 に運営者が管工事を見送りから候補へ戻した（docs/strategy/06_多資格展開戦略.md 判断の記録）。令和6年度から第二次の経験記述は「施工記述」になり、設備全般・工程管理・安全管理が必須、空調か衛生を 1 問選ぶ形式（令和7年度 JCTC 公表問題）。受験者ごとの経験に左右されにくいため模範答案を作りやすく、衛生（給排水）は運営者の上下水道の専門と重なる。

**やること**:
1. 令和6・7年度の第二次（1級・2級）の問題原文を集め、設問の型（語句・留意点・工程表・安全）と、自分で書く設問が残っているかを `exam-formats.json` の `pipe-work-*` に記録する
2. 競合（note・ココナラ・YouTube）を市場スキャンに加える（iOS の択一アプリは docs/products/07_iOS択一アプリ試作方針.md §3.3）
3. ~~最初の 1 商品を設計~~ 2026-09-29 済: 手順1 も済（exam-formats.json 更新・出題分析は content/note/管工事/第二次検定-出題分析.md）。商品は機器別の施工記述 模範解答バンク ¥1,980（content/note/管工事/noteコンテンツ計画.md）。残りは執筆・外部照合（空調は資料根拠）と手順2
4. 売れたかを見て active にするか決める（`qualification-registry.json` と 06 の判断の記録を同じ commit で直す）

**進捗（2026-09-30）**: 商品 content/note/管工事/施工記述-機器別模範解答バンク/article.md（¥1,980・13機器）は公開準備まで完了（draft）。公共建築工事標準仕様書（機械設備工事編）令和7年版と照合済み、カバー・hashtags 済み。残り: 競合スキャン（手順2）と公開（公開は運営者の判断で行う（2026-09-30 決定・下書き止め）。手順: 下書き保存で表示確認 `node scripts/note-publish.mjs --article <path>` → 公開 `--commit`（1記事ずつ・ブラウザ同時1本）→ マガジンは /note-magazine-create・/note-magazine-cover・/note-magazine-add（掲載文は各マガジンの note掲載文.txt）→ note-magazines.ts・product-lineup.json salesRules に登録 → npm run verify-note-status。）。

**完了条件**: note に 1 商品が公開され、`pipe-work-*` の出題形式と競合が正本に記録されている。

### [DN-0454] 管工事・建築・電気工事（1級・2級）の択一過去問を集め、正答と解説を整える
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:制作] [起票:2026-09-29]

**起点**: 2026-09-29 に運営者が、iOS 試作（DN-0453）の前に択一の過去問データを揃えると判断した。アプリの中身と、サイトの無料入口の両方になる。電気工事は記述の商品は作らず、択一とアプリだけ扱う（docs/strategy/06_多資格展開戦略.md）。公式（JCTC 等）は直近の年度しか掲載しない。

**やること**:
1. 管工事の構造化に使える年度を確かめる。2026-10-09 時点の在庫台帳で公式の問題と公式正答が揃うのは 1級 9 年度（平成18・21・26・27年度、令和4〜8年度）、2級 11 回（平成26・27年度、令和4〜8年度の前期・後期）。2級の平成28〜令和2年度と 1級の平成29年度は保存版にも無い
2. 択一の問題・正答を構造化し、選択肢ごとの解説を付ける（正答は公式と照合する。公式正答が無い年度は 07 §3.4 の条件で扱う）
3. アプリ（DN-0453）とサイトの両方が読める形式にする

**完了条件**: 3 資格の取得できる年度が在庫台帳と Drive に揃い、管工事の択一に正答と解説が付いている。

### [DN-0456] 測量士補の択一過去問（令和4〜8年・各28問）をサイトに載せる
タグ: [収益化] [領域:サイト] [時期:2026-11..2027-01] [種類:制作] [起票:2026-09-30]

**起点**: 2026-09-30 に運営者が、測量士・舗装・管工事の択一過去問をサイトへ展開すると決めた。測量士補は受験者 13,363 人（R7・exam-stats.json）で3資格中最多、国土地理院が問題と正答を公開している。サイトの `/exam/surveyor/` には受験ガイドしか無い（PR #738）。

**やること**: 2026-10-01 に PR #778 で 5 年分 140 問（令和4〜8年・全問が国土地理院の公式正答と一致・年度ごとに past-exam-qa 監査済み）とカテゴリの過去問グループをマージした。残りは deploy 後に `/exam/surveyor/` の過去問が本番に出ることを確かめ、修正後の年度を past-exam-qa で再監査する。R08 No.12（区間の較差の判定）は公式の規定文を未確認。

**完了条件**: 5 年分 140 問が `/exam/surveyor/` の過去問として本番に出て、全問の正答が公式と一致している（past-exam-qa 合格）。

### [DN-0457] 測量士の午前（択一）過去問（令和4〜8年・各28問）をサイトに載せる
タグ: [収益化] [領域:サイト] [時期:2027-01..2027-02] [種類:制作] [起票:2026-09-30]

**起点**: DN-0456 と同じ判断（2026-09-30）。測量士の午前は択一 28 問で、問題・正答は国土地理院が公開している。午後の記述は note 教材（DN-0354）で扱い、午前はサイトの無料過去問にして note へつなぐ。

**やること**: DN-0456 で作った過去問の型を使い、令和4〜8年の午前を年度ごとに構造化して正答・選択肢解説・ExamPoint を付ける。測量士補と論点が重なる問題は相互にリンクする。原本は Drive `原資料PDF/過去問/測量士/`。

**完了条件**: 5 年分 140 問が本番に出て、past-exam-qa 合格。

### [DN-0458] 舗装施工管理技術者の一般試験（択一）過去問（1級・2級・令和4〜8年）をサイトに載せる
タグ: [収益化] [領域:サイト] [時期:2027-02..2027-04] [種類:制作] [起票:2026-09-30]

**起点**: DN-0456 と同じ判断（2026-09-30）。日本道路建設業協会は直近 5 年度の問題を掲載しているが、正答は公表していない（exam-formats.json）。舗装の買われる時期は 5〜6 月。

**やること**:
1. pavement カテゴリに過去問グループを足す（DN-0456 と同じ配線）
2. 1級・2級の一般試験を年度ごとに構造化する。正答は公式が無いので、舗装設計便覧・舗装施工便覧・国交省の基準など公的資料で根拠を付けて示し、「公式解答ではない」と明記する。根拠が取れない問は正答を載せない
3. 原本は Drive `原資料PDF/過去問/{１級,２級}舗装施工管理技術者/`（テキスト層なし・画像から読む）

**完了条件**: 取得済み年度の一般試験が本番に出て、全問に根拠資料が付いている（past-exam-qa 合格）。

### [DN-0459] サイトに管工事施工管理技士（1級・2級）の入口と第二次「施工記述」のガイドを作る
タグ: [収益化] [領域:サイト] [時期:2027-03..2027-05] [種類:制作] [起票:2026-09-30]

**起点**: 管工事は note 教材の下書き（DN-0452）と択一の整備（DN-0454）があるが、サイトにカテゴリが無い。測量士・舗装の入口（PR #738）と同じ形で、検索の入口と note への導線を用意する。

**やること**:
1. カテゴリ `pipe-work` を新設する（categories.json・home-exam-cards・doc-classifier・category-groups・CategoryJumpNav・CategoryPage・StructuredData・ExamCards テーマ色・tags・category-curriculum。PR #738 の差分が手本）
2. 受験ガイド 4 本（試験の概要・第二次 施工記述の書き方・工程表の解き方・学習計画）。出題分析は content/note/管工事/第二次検定-出題分析.md、日程・受験者数は公式と照合する
3. DN-0454 の択一過去問をこのカテゴリの過去問グループとして載せる

**完了条件**: `/exam/pipe-work/` が本番に出て（deploy 後 `npm run check-production-ssr`）、ガイドが guide-qa 合格。

### [DN-0451] 今日R2へ保存したKDP成果物を現行のDrive保管へ同期し、保存経路の不整合を解消する
タグ: [インフラ・計測] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-09-29]

**起点**: 2026-09-29 にKDP成果物をR2へ保存した一方、現行SSOTの `config/drive-vault.json` は `kindle-dist` を `audience: human`、Google Drive `制作物/Kindle` 保管としている。対象ファイルと実行経路は未特定。R2上の実体は保全し、調査中に削除・上書きしない。2026-10-07 時点で `quality:audit:ci` の drive-vault が `scripts/kindle-dist/a-05.jpg`・`a-06.jpg` を「ローカルにしか無い（台帳未登録）。このマシンを失うと復元不能」と FAIL にする。ただし 2 枚とも git で追跡済みで origin/develop と同じ中身なので、実際は復元できる（`check-drive-vault.mjs` は git の追跡を見ずに「復元不能」と書く。文言を直すか、git 追跡済みを区別する）。`node scripts/drive-vault-sync.mjs --group kindle-dist` の dry-run は 138 件中 137 件を対象にし（台帳 `kindle-dist` の 76 件と sha256 が 1 件も合わない）、Drive の `制作物/Kindle` には同名の 110 件が既にある。`--commit` は同名を上書きするので、先に同名の sha256 を比べて差分だけにする（手順 2）。

**やること**:
1. 当日の実行ログ、R2台帳、R2実体、`scripts/kindle-dist/`、KDP台帳を照合し、保存したEPUB・表紙の対象数、キー、bytes、SHA-256を特定する。取得失敗や対象0件を正常扱いしない
2. Google Driveの既存 `制作物/Kindle` へ差分だけ同期し、Driveから全バイトを読み戻してローカルおよびR2のSHA-256と一致することを確認する。同名ファイルは先に既存実体を検索し、重複作成しない
3. `.claude/state/assets/drive-manifest.json` の `kindle-dist` に登録し、空の復元先から既存pull経路で復元できることを確認する。Mac実機未確認なら、その制約を完了報告に残す
4. なぜ現行SSOTと異なるR2経路が使われたかを特定し、コマンド案内・スキル・自動化・文書のうち原因箇所だけを修正する。コードやスキルを変更した場合は `/doc-sync` を実行する
5. R2の削除は本カードに含めない。Drive同期・台帳登録・復元確認後もR2を保持し、削除またはバックアップ継続は別途ユーザー判断とする

**完了条件**: 当日R2へ保存したKDP成果物の対象数と実検査数が一致し、全件がDriveへ同期・台帳登録され、Drive読み戻しと復元でSHA-256一致を確認済み。保存経路の不整合原因が解消され、R2実体は削除されていない。



### [DN-0441] develop に「build 必須」のルールセットを作り、PR の自動マージが CI を待つようにする
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-09-29]

**起点**: 2026-09-29 にリポジトリの「Allow auto-merge」をオンにした。だが develop には合格必須の検査が無く、自動マージを予約すると CI を待たずに即マージされる。従来のブランチ保護で必須検査を足すと、develop へ直接 push するワークフロー 16 本（fetch-metrics・ogp-supply・competitor-scan ほか）が止まるので、ルールセットで PR のマージだけに build を求める。ルールセットはセキュリティ設定なので運営者が設定する（同日に設定したつもりが API では 0 件だった）。

**やること**: Settings → Rules → Rulesets → New branch ruleset で、name `develop-build-required`・Enforcement Active・Bypass に Repository admin と GitHub Actions（Always allow）・Target に `develop`・Rules の Require status checks に `build`（Pre-merge check の検査名）を入れて保存する。保存後、`gh api repos/uruhayato373/doboku-note/rules/branches/develop` で内容を照合する。

**完了条件**: 上の API が `required_status_checks`（context `build`）を返し、次の PR で自動マージを予約すると build 完了まで待ってからマージされ、develop へ直接 push するワークフローが止まっていない。

### [DN-0431] Tailwind v4（PR #683）を main へ上げる前に、古いブラウザからのアクセス比率を確かめる
タグ: [インフラ・計測] [領域:サイト] [時期:2026-10] [種類:意思決定] [起票:2026-09-28]

**起点**: 2026-09-28 に Tailwind CSS を v3→v4 へ移行し develop へマージした（PR #683）。v4 の対象ブラウザは Safari 16.4+ / Chrome 111+ / Firefox 128+ で、それ未満では CSS（カスケードレイヤー・oklch 色・@property）が効かず表示が崩れる。会社 PC は GA4 API がプロキシで遮断され、`data/ga4/reports/` にもブラウザ別の集計が無いため未確認のまま。

**やること**: GA4（直近 28 日）の「ブラウザ」「ブラウザのバージョン」「OS のバージョン」で、対象未満のユーザー比率を出す（Safari は iOS 16.3 以下が主な対象）。比率が小さければ develop→main の昇格（`/deploy`）へ進む。大きければ移行の扱いを判断する。

**完了条件**: 対象未満のユーザー比率（%）と取得期間を記録し、main 昇格の可否を決めている。

### [DN-0432] 管理画面を shadcn/ui の標準部品・雛形・テーマで作り直し、余白やカードの書き方を共通化する
タグ: [UI・UX] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-09-28] [進行中]

**起点**: 2026-09-28、KPI 画面のカード同士がくっつく不具合（PR #684 で修正）から、見た目の共通化・再利用・単一責務を相談した。原因は余白を `.card + .card`（直後がカードのときだけ）で決めていたことで、ページ側は生の `className="card"` 102 箇所・インライン `style` 161 箇所・`globals.css` 2,300 行超に依存し、`src/components/primitives.tsx` の Card/Badge は 7 ファイルでしか使われていない。前提の Tailwind v4 移行は PR #683 で完了済み。

**やること**:
1. 土台：`components.json` を置き、shadcn の Card / Badge / Button / Table / Tabs / Chart を CLI で追加して `primitives.tsx`・`ui.tsx` の重複を置き換える。テーマは shadcn の CSS 変数（基本色は slate 等から選ぶ）に寄せる
2. レイアウト部品：`Stack` / `Grid` / `Section` を足し、並べ方の余白は親の `gap` で持つ。`.card + .card` を廃止する
3. 枠：`sidebar` と `dashboard-01` の雛形で左ナビ＋本文を作り直し、KPI 画面から移す。残りの画面は数回に分けて移し、移した分の `globals.css` を削る
4. ゲート：ページ（`tools/admin-app/src/app/**`）の生 `className="card"` とインライン `style` の件数を lint で数え、基準値より増えたら落とす
5. 表：`TableFrame` を直に置いている 37 ページを `components/admin` の `DataTable`（shadcn の Data Table）へ移す。行ごとに形が違う表は除く

**完了条件**: KPI 画面が shadcn 部品とレイアウト部品だけで書かれ、`.card + .card` が無い。全画面の移行後、ページの生 `className="card"` とインライン `style` が 0（または lint の基準値以下）で、ゲートが CI にある。


### [DN-0423] テーマ（/topics）15 ページを検索の入口として働くように作り直す
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11..2026-12] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 の集客点検で、`/topics/*` 15 ページのうち 12 ページは Google に登録済みなのに、GSC の表示が 4 週（2026-08-25〜09-21）で合計約 20 回・クリック 0 だった（未登録は economic-management・human-resource-management・safety-management-cem の 3 ページ）。原因は、題名が「〇〇｜試験・実務・基準を横断」で検索語に当たらず、本文が 1 行のリードと記事カードの一覧だけであること（`src/app/topics/[slug]/page.tsx`）。総監の 5 管理のテーマは 1 ページに 120〜149 本が区切りなく並ぶ。

**やること**: (1) 各テーマの題名とリードを、そのテーマで実際に検索される語（例「コンクリート 施工管理 ポイント」「河川 砂防 違い」）へ合わせる。検索需要の根拠は content-taxonomy.md §6 の昇格基準どおり `description` 直下に残す。(2) 一覧の前に、テーマの要点（何を押さえるか・資格ごとの出方・実務での使いどころ）を数段落で書き、記事を「資格試験／施工実務／公的基準」と小テーマで区切って並べる。(3) 総監の大きなテーマは小テーマごとに分ける。(4) 未登録の 3 ページは DN-0390 の原因切り分けに含める。

**完了条件**: 15 ページの題名・リード・構成を直し、反映から 28 日後に `/topics/*` の表示が直す前の 4 週より増えたかを確かめたら、このカードを削除する。

**進捗（2026-09-27）**: PR #679 で 15 テーマに `seoTitle`・書き直した `description`・`demandEvidence`（GSC 2026-08-28〜09-24 の根拠 1 行）・3 段落の導入文を付け、記事一覧を「資格試験（資格ごと）／土木施工の実務／公的基準」に区切った。残りは総監の大きいテーマ（120〜149 本）の小テーマ分けと、反映 28 日後の表示の比較。未登録 3 ページは DN-0390。


### [DN-0420] 土木施工実務（civil-practice）ガイドの検索表示ゼロ 37 本を、登録と検索意図の両面で直す
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27、管理画面 教材 ＞ サイトの配線先（`/materials?view=site`）で、教材から配線した記事のうち GSC 表示 0（2026-08-25〜09-21）が 133 ページあり、civil-practice/guide が 37 本と資格・区分別で 2 番目に多かった。URL 検査（2026-09-23）では 23 本が「検出 - インデックス未登録」、13 本が登録済みで表示 0。通年の実務検索で、試験期に縛られない。根拠教材は土木施工実務ノート・よくわかる土木技術・防災土木・土木情報学ほか。

**やること**: (1) 未登録 23 本は、内部リンク（practice ハブ・関連記事）とサイトマップ・内容の重複を確かめ、原因ごとに直す（統合・noindex の基準は DN-0390 と共通）。(2) 登録済みで表示 0 の 13 本は、題名・リード文が実務の検索語（「〜とは」「〜 手順」「〜 基準」）に答えているかを見て合わせる。新しい記事は増やさない。

**完了条件**: 次の URL 検査で未登録の理由がページごとに説明でき、直した記事の反映から 28 日後に配線先の「検索で表示」の割合が上がったかを管理画面で確かめたら、このカードを削除する。

### [DN-0421] 技術士 建設部門『論文対策キーワード』150 論点を検索の入口にする（6 ページ未登録・テーマ別ページの要否）
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-12..2027-02] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27、教材ごとの配線先で、運営者が著作権を持つ『論文対策キーワード』は 150 論点が 8 ページだけに配線され、うち 6 テーマ集約ページ（`/exam/pe-construction/keywords/*-ronbun-keyword`・1 ページ 19〜42 論点）はすべて「検出 - インデックス未登録」で表示 0 だった。表示があるのは 1 ページだけ。教材から新しい検索入口を作る余地が全教材で最も大きい。試験は 2027 年 7 月で、検索が増える 3〜6 月の前に仕込む。

**やること**: (1) 6 ページを登録させる（建設部門ハブ・選択科目の過去問ページからの内部リンク、サイトマップ。原因の切り分けは DN-0390 と共通）。(2) 登録後の検索語を見て、検索される論点（例：脱炭素・インフラ老朽化・担い手）を、既存の keywords 区分にテーマ別ページとして分けるかを決める。分けるなら 1 論点＝1 ページにはせず、検索語のまとまりごとにする。

**完了条件**: 6 ページが登録され、テーマ別ページを作るかどうかを決めて（作るなら個別に起票して）、このカードを削除する。

### [DN-0422] 総監キーワードのうち登録済みなのに検索表示 0 の 62 ページの題名・リードを検索語に合わせる
タグ: [コンテンツ品質] [領域:サイト] [時期:2027-01..2027-04] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27、教材ごとの配線先で、総監 標準テキストなどから配線した keywords ページのうち 62 ページが URL 検査で登録済みなのに GSC 表示 0（2026-08-25〜09-21）だった。登録の問題ではなく、題名・リードが検索語に届いていない。総監は新規キーワードページを作らず既存を補強する方針。試験は 2027 年 7 月。

**やること**: 62 ページについて、概念名がそのまま検索される語か（「〜とは」「〜 総監」）、題名・リード文が定義に一文で答えているかを見て、seoTitle とリードだけを直す（本文の大改修はしない）。管理画面 教材 ＞ 総監 標準テキスト ＞ サイトの配線先 の表示 0 の行が対象。

**完了条件**: 対象の手直しを終え、28 日後に同じ画面で表示のあるページの割合が上がったかを確かめたら、このカードを削除する。

### [DN-0417] 週次 GSC まとめ W38 の未起票の改善候補 5 件を片付ける（題名・CTA・共食い）
タグ: [SNS・マーケ] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 の集客バックログ点検で、`data/analysis/growth/digest-2026-W38.json` の候補のうち DN-0338 以外にカードが無かった。
- OPP-07ad782c8d「スクレープドーザ」6.3 位・CTR 0%（`/exam/civil-construction-1/textbook/scraper`）
- OPP-09ce18f721「中国地方整備局 共通仕様書」で `/standards/chugoku/local` と `/part-01` が共食い
- OPP-4d4eb6bc94 サイドバー配置の CTA が CTR 0.02%（配置の中央値 0.23%・表示 12,916）
- OPP-abef5fbc86 `/exam/civil-construction-1/guide/exam-overview` の CTA クリック率 0.28%（サイト平均 0.7%）
- OPP-3061b036bb `/exam/pe-comprehensive-management/past-exams/r08-primary` の CTA クリック率 0.32%

**やること**: (1) scraper は seoTitle とリード文を検索語に合わせる。(2) 中国地方整備局は親ページを正にし、part-01 の題名を章名へ寄せて役割を分ける。(3) サイドバーの CTA は外すか本文内へ移すかを決める（DN-0364 の配線方針と合わせる）。(4) CTA の低い 2 ページは、冒頭近くに資格の主力商品への導線を置く。

**完了条件**: 5 件それぞれ対応したか「やらない」と決め、反映から 28 日後の週次まとめで同じ候補が再掲されないことを確認したら、このカードを削除する。

**進捗（2026-09-27）**: (a) スクレーパの seoTitle・リードを「スクレープドーザとは」へ（018751c39）。(c) 1級 exam-overview のリード直後に 1級二次まるごとパック、(d) 総監 r08-primary に択一 過去問PDF（令和）のカードを置いた（5fc9bd35b・221a1f98e）。(b) 中国地方整備局の分冊 part-01/02 の題名を章名始まりにした（PR #680）。サイドバーの CTA は DN-0364 の配線方針と合わせて決めるため未着手。残りは反映 28 日後の再掲確認。

**進捗（2026-10-02）**: (3) サイドバーの CTA は EXP-008 でサイドバー枠ごと撤去済み（2026-W39 週次レビュー「sidebar は EXP-008 で撤去済み」）のため対応不要。5 件とも対応済みで、残りは反映 28 日後（10/25 前後）の週次まとめで同じ候補が再掲されないかの確認だけ。

### [DN-0418] 被リンク獲得の声かけ（アウトリーチ）を始める
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-11..2027-01] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 の点検で、戦略文書 `docs/marketing/04_被リンク獲得アウトリーチ.md` があるのに backlog に対応カードが 0 件だった。GSC 戦略転換（2026-04）で「内部施策打切→独自データ＋被リンク」と決めた柱のうち、被リンク側が止まっている。

**やること**: 候補 10 件と上位 5 件の依頼文の下書きは 2026-09-30 に文書へ追記済み（「1 巡目 候補と下書き」節）。運営者が署名を埋め、各サイトの問い合わせ規約を確かめてから 1 件ずつ送り、送信記録表へ記録する（一斉送信しない・競合性のある先は相互リンク要請に見えない文面を保つ）。得た被リンクは GSC のリンクレポートで追う。

**完了条件**: 1 巡目の送信を終え、反応と獲得リンク数を文書へ記録したら、このカードを削除する（続けるなら次の巡を再起票）。


### [DN-0410] チャネル別の送客（UTM）を 1 画面で見られる GA4 の計測ダッシュボードを作る
タグ: [インフラ・計測] [領域:SNS] [時期:2026-11] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 の判断待ちの棚卸しで、docs/marketing/02_チャネル動線設計.md §8 の未着手の打ち手のうち運営者が「やる」とした 1 つ。

**やること**: X・Instagram・note・YouTube からサイトへの送客（UTM の source/medium/campaign 別のセッション・キーイベント）を、管理画面の SNS か KPI の入口に 1 画面で出す。既存の `fetch-ga4-data --dimension sourceMedium --sns-only` と管理画面 KPI の「入口」と重ならないよう、足りない切り口だけを足す。

**完了条件**: 管理画面でチャネル別の送客が直近 28 日と前期間の比較で見える。

### [DN-0314] Drive vault にあるココナラ商品画像の旧版5枚を、現行の生成画像で上書きするか決める
タグ: [収益化] [領域:商品] [時期:2026-09..2026-10] [種類:改善] [起票:2026-09-25] [期日:2026-10-09]

**起点**: vault 台帳（`.claude/state/assets/drive-manifest.json`）の5枚が、今の `scripts/coconala-thumb.mjs` の出力と違う。`thumb-tensaku-4theme` は旧商品「4テーマセット ¥12,000」のままで、公開中の全5テーマ版（¥15,000）と合わない。`thumb-tensaku-set` / `thumb-1kyu-premium` も旧版。`thumb-sakusei` / `thumb-sakusei-4theme` は台帳が「作成」版で、Mac 上の実体は「指導」版（ライブ差し替え済み）。CI（`coconala-wiring`）は台帳にエントリがあれば通るので影響しない。上書きは vault の旧版を消すため、自動モードでは不可逆操作として止まる。

**やること**: 上書きしてよいか決める。する場合は Mac で `node scripts/coconala-thumb.mjs --service coconala-<id> --out .tmp/thumb-verify/thumb-<id>.png` で3枚（`tensaku-set` / `tensaku-4theme` / `1kyu-premium`）を作り直して `content/coconala/assets/` へ置き、`node scripts/drive-vault-sync.mjs --group coconala-asset --commit` で5枚を登録して台帳を commit する。あわせて会社 PC の worktree `coconala-grade` と `tensaku-qa`（PR #638 はマージ済み）を `git worktree remove` する。

**完了条件**: 上書きする場合は `node scripts/drive-vault-sync.mjs --group coconala-asset --verify` が不一致 0。しない場合は理由をこのカードに書いて削除する。

**判断（2026-09-27・運営者）**: 上書きする。

### [DN-0360] note の記事単位の同期で、未反映（本文・カバー・タグ）と止まっている記事を 0 にする
タグ: [収益化] [領域:商品] [時期:2026-09..2026-11] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-29 に note の反映を記事単位に変えた。記事ごとの反映計画（`scripts/lib/note-sync-plan.mjs`）が本文・カバー・タグの未反映分と止まっている理由を決め、Mac の launchd `note-sync`（毎週日曜 3:00）が `note-update-body --sync` で 1 記事 1 回の更新にまとめて反映し、CI の `note-sync-live.yml`（月曜 9:00）が判定だけを持つ。カバー台帳は再公開台帳へ統合した。統合時点の計画は公開 918 本のうち反映済み 410・反映待ち 505（本文 295〔配布 PDF の取り寄せ 203〕・カバー 216）・止まっている 3（中断: nded084d4f646 R06 過去問模範答案・n8d98d7fc24cc 工事21 下水処理場水槽RC・n3eb135ebdff7 序章＝DN-0271）。マガジンはカバーの新レイアウト（designVersion.magazine を上げた）で 98 誌が要登録。旧 DN-0269（原稿と公開記事のずれの解消と CI 検査）・DN-0277（【〇〇】に直した 257 本の再公開）・DN-0316（総監 2 本の冒頭 CTA 除去の反映）を統合した。

**やること**: (1) 残りは記事の本文 340 本（うち配布 PDF の取り寄せ 279）・カバー 8 本と、止まっている 3 本（2026-10-07 の note-sync-live）。マガジンの要登録は 2026-10-07 に 0 にした。Mac の週次（日曜 3:00・1 回 200 本）が反映する。PDF を取り寄せられない件は DN-0567。(2) 止まっている 3 本（BK-10 鉄道 R07・R08予想の III、BK-11 トンネル R03 の III。前回の更新が途中で止まった）は管理画面 /content/note-sync で理由を見て直す。(3) 週次の結果は管理画面の「週次の結果」と CI の note-sync-live で見る（登録の記録は develop にあるので、手で流すときは `gh workflow run note-sync-live.yml --ref develop`）。

**追記（2026-09-29・コンクリート主任技士の小論文 37 本）**: bea060922 で `magazines/コンクリート主任技士-実務立場別小論文集`（01〜08 の 32 本）と`-小論文-模範答案集`（5 本）の冒頭と末尾に、ココナラ添削（services/4425046）への導線を入れた。同期計画では 37 本とも反映待ち（本文）・noteId あり（2026-09-29 確認）。週次の同期のあとに公開ページで導線が出ているかを照合し、**照合できた日付を DN-0265（コンクリート主任技士のココナラ出品の継続判定）の効果判定の起点に使う**。照合の方法: 37 本とも有料記事で、末尾の導線は有料部分の区切りより後ろにある。**公開 API（`https://note.com/api/v3/notes/<noteId>`）で見えるのは冒頭の導線だけ**なので、冒頭はこの本文に `services/4425046` があるかで 37 本を照合し、末尾は `data/note/sync-log.json` の該当 run で 37 本が本文を更新済み（failed に無い）ことと、ログイン済みの編集画面で数本を目視して確かめる。照合日と件数（冒頭 n/37）をこのカードに書き、同じ日付を DN-0265 の起点に写す。

**完了条件**: `npm run check-note-sync` が exit 0（反映待ち・止まっている記事・マガジンの要登録が 0）になったら、このカードを削除する。
### [DN-0439] コンテンツ台帳から、選んだ制作物の反映計画を作って一括で更新する（ずれの検知をチャネル共通の部品に）
タグ: [インフラ・計測] [領域:管理] [時期:2026-11] [種類:改善] [起票:2026-09-29]

**起点**: 2026-09-29 のオーナー判断（管理画面を「テーマ（資格＋転職など）」と「チャネル」の 2 軸で 1 つにまとめる）。テーマの分類（content-themes.json）とコンテンツ台帳（/content/ledger）は済み。ずれの検知と記事単位の更新は note には `note-sync-plan`・`note-update-body --sync` があるが、ココナラは一致の検査（`check-coconala-live`）だけ、Kindle は別の仕組みで、チャネルごとに形が違う。

**やること**: (1) ずれの検知と反映を「一覧・ずれ・反映」の同じ形の部品にそろえる（note は既存、ココナラ・Kindle は既存スクリプトを包む）。(2) 台帳で行を選び、反映計画（dry-run）を作ってから実行する。実行は既存の CLI を 1 本ずつ呼ぶか、ログイン済みブラウザが要るものは Mac の自動同期の待ち行列に積む。本文・カバーの編集は原稿（git）で行い、管理画面にエディタは作らない。

**完了条件**: 台帳で選んだ note の記事とココナラの出品を、計画の確認→実行で更新でき、実行後に台帳の「ずれ」から消える。

### [DN-0362] Playwright 認証を「人・Mac・CI」の役割分担で設計し直し、ログインの維持を自動化する
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-09-27] [進行中]

**起点**: 2026-09-27、Instagram の状態確認で、自動化用プロファイルの多くが期限切れのまま使う直前まで気づけない構造だと分かった（`.claude/knowledge/reference/playwright-auth-profiles.md` の 9/7 実測で 9 サービス中 6 つが expired）。サービスごとの CI 扱いはあるが、ログインを誰がどこでするかの共通ルールと、ログインの維持・期限切れ検知が無い。文書の一部は Windows 前提（`%LOCALAPPDATA%`）のまま。stats47 には、キーチェーンの ID/PW で切れたときだけ 1 回再ログインし、2FA・CAPTCHA では止めて通知、失敗は 1 回で止める実装がある（`~/stats47/.claude/scripts/measurement/refresh-session.mjs`・`bootstrap-session.mjs`）。A8・もしもは stats47 とログイン状態を共有済み。

**やること**: (1) 役割分担を文書化する＝人（初回ログイン・2FA・キーチェーン登録・失敗印の解除）／Mac の launchd（ログイン維持・CI への状態受け渡し・見た目に関わる書き込み）／CI（読み取りの定期収集のみ。ログインしない・期限切れは検査不成立）。(2) stats47 の refresh-session 方式を共通化し、note・ココナラへ広げる。X・Instagram は凍結・利用制限の危険が大きいので健康診断と通知だけにして再ログインは人が行う。(3) 週1回のログイン健康診断を週次レビューに載せる。(4) 文書の Windows 前提を Mac の実パスへ直す。(5) 2026-09-28 オーナー承認: Windows でも同じ維持を回す＝ID/PW は Windows 資格情報マネージャー（stats47 `credential-store.mjs` と同じ読み口・CI は読まない）、起動はタスクスケジューラ。Windows→CI の受け渡しはしない（CI へは Mac から一方向のまま）。ID/PW をログ・引数・ファイルに出さない。エージェントはパスワードでのログインを実行しない（実行はオーナーか launchd）。

**完了条件**: 役割分担が文書にあり、note・ココナラのログイン維持が launchd（Mac）とタスクスケジューラ（Windows）で動き、週次レビューにログイン健康診断の欄があることを確認したら、このカードを削除する。

### [DN-0363] SNS の入口→サイト→note/ココナラの経路を台帳と機械監査で管理する
タグ: [収益化] [領域:SNS] [時期:2026-10..2026-11] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 の点検で、入口の多くが収益に繋がっていなかった。X は自己紹介が「固定ポストの無料note白書R7」と書くのに固定は 7 資格ルート（サイトトップ行き・285 表示）で、`x-account.json` とも食い違い。Instagram は固定 0 件・ハイライトは技術士総監 1 つだけ（`ig-account.json` の予定 5 つのうち 4 つ未作成）。`/links` には撤退済み Brain のリンクが本番に残存（ソースは削除済み・未 deploy）。サイトの 1級・2級 hub は直前期に暗記ノート単品（¥580）だけへ直リンクし、ココナラ導線も無かった（hub は PR #657 で直前総仕上げパックへ差し替え）。PC で Business Suite からストーリー投稿、instagram.com からハイライト作成ができることは確認済み。

**やること**: (1) 資格別の入口台帳（例 `.claude/config/ig-highlights.json`）を作り、動線の型「導入→無料（サイト）→主力商品→直前演習→全部見る/添削」、各枚の行き先、並び順、季節の切り替えを持つ。価格・URL は `note-magazines.ts` と `exam-calendar.json` から引き、台帳へ写さない。(2) `check-ig-highlights`（運用アラート）で、リンク先の公開・到達、試験日を過ぎた季節外れ文言、台帳と実プロフィールのずれ（Mac の保存プロファイルで照合・DN-0362 が前提）を検査する。(3) サイト hub と主要記事から、その季節の主力商品とココナラ（受付期限内）への導線があるかを同じ検査で見る。(4) X の固定投稿・自己紹介と `/links` も同じ台帳・検査に載せる。SNS プロフィールのリンクを商品一覧（Linktree か自サイト 1 ページ・UTM 付き）へ移す判断もここで行う（旧 DN-0411 を統合）。(5) 週次レビューに「SNS の入口」欄を足し、件数があれば起票する。展開順は 1級・2級（今週手作業）→総監・建設部門（11月）→コンクリート・RCCM ほか。

**完了条件**: 台帳と検査があり、週次レビューに欄があり、少なくとも 1級・2級・総監の入口がこの台帳で管理されていることを確認したら、このカードを削除する。


### [DN-0354] 測量士・測量士補の商品設計を決めて、午後記述（計算）の解き方と択一の解説をまとめた商品を作る
タグ: [収益化] [領域:商品] [時期:2026-11..2027-03] [種類:制作] [起票:2026-09-26] [期日:2027-03-15]

**起点**: 2026-09-26 にユーザーが測量士の展開を決め、資格台帳を active にした（ユーザーは取得済み）。試験は 5 月で、買われる時期（3〜5 月）が夏の山と重ならず平準化に効く。出題は午前 択一・午後 記述（計算を含む）で、経験記述や論文は無い。国土地理院が過去 5 か年の問題と解答例を公開しているので、価値は「解答例までの解き方」と計算の型にある。測量士補（同じ日・択一のみ・受験者は測量士の3倍以上＝exam-stats.json）も同日に展開を決めた。

**やること**: 2026-09-29 に構成と価格を決めた（content/note/測量士/noteコンテンツ計画.md、R4〜R8 午後の出題分析は同ディレクトリ 午後記述-出題分析.md）。分野別マガジン ¥2,980（序章無料＋No.1〜5 単品 ¥980）→ 計算の型20 ¥1,480 の順に作る。測量士補は有料を作らず、サイト無料記事と過去問アプリで測量士の商品へつなぐ。最終値は公式解答例と照合してから載せる。

**進捗（2026-09-30）**: 公開準備まで完了（noteStatus: draft）。分野別マガジン content/note/測量士/magazines/測量士午後-分野別/（00 序章無料＋No.1〜5 各¥980・セット¥2,980、掲載文・_cover.png あり）、計算の型20 content/note/測量士/測量士午後-計算の型20/（¥1,480）。要確認は問題図・解答例・e-Gov で全件解消、新科目名（測地測量・測図測量ほか）を併記。全記事にカバー文言・hashtags（97〜98）済み。公開は運営者の判断で行う（2026-09-30 決定・下書き止め）。手順: 下書き保存で表示確認 `node scripts/note-publish.mjs --article <path>` → 公開 `--commit`（1記事ずつ・ブラウザ同時1本）→ マガジンは /note-magazine-create・/note-magazine-cover・/note-magazine-add（掲載文は各マガジンの note掲載文.txt）→ note-magazines.ts・product-lineup.json salesRules に登録 → npm run verify-note-status。

**完了条件**: 公開して note-magazines.ts（id は `surveyor-`／`assistant-surveyor-` 始まり）・product-lineup.json・salesRules に載せたら、このカードを削除する。

### [DN-0342] 1級・2級建築施工管理の無料記事を数本公開し、2027年の二次検定に向けて需要を測る
タグ: [収益化] [領域:サイト] [時期:2026-11..2027-01] [種類:制作] [起票:2026-09-26]

**起点**: 2026-09-26 の判断（06_多資格展開戦略.md）で、建築は候補のまま無料記事で需要を測ることにした。第二次検定に経験記述があり（令和6年度改正後は工事概要から選んで自分の経験で解答）、受験者は 1級・2級とも土木に近い規模で、買われる時期（8月末〜11月）が夏の山と重ならない。弱みは経験記述の信頼性（運営者は土木）と強い既存の売り手（ひげごろー等）。出題形式は exam-formats.json（調査担当の読み取り。展開を決める前に主担当が公式原文で照合する）。

**やること**: 2026-09-30 に (1) exam-formats.json の building-construction-1/2 を R7 問題・R8 受検の手引の原文で直した（adae5d716・checkedBy は agent のまま。原文 URL は同コミットの source）(2) 無料ガイド 3 本（1級・2級の経験記述の書き方、二次の過去問傾向）と非表示カテゴリ `building-construction` を PR #777 で用意した。PR #777 は 2026-09-30 にマージ済み。残りは、主担当が引用を原文で照合して checkedBy: self にする・deploy 後に 3 本の URL を DN-0427 に書く。カテゴリページ `/exam/building-construction` はナビから辿れないがパンくず用に生成される（入口とみなすかは運営者判断）。

**完了条件**: 記事を公開して refresh-indexes まで済ませ、検索表示とクリックを見る URL を DN-0427 に書いたら、このカードを削除する。

### [DN-0333] 合格発表に合わせて合格体験者としての発信を行う
タグ: [SNS・マーケ] [領域:SNS] [時期:2027-01..2027-03] [種類:制作] [起票:2026-09-26]

**起点**: 合格発表の時期は「合格体験者」の立場が最も効く。X・note で発信する。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 合格発表に合わせた投稿が予約・公開されたら、このカードを削除する。

### [DN-0307] 日本語が母語でない受験者向けに、経験記述の添削を広げられるか試す
タグ: [収益化] [領域:商品] [時期:2027-01..2027-03] [種類:改善] [起票:2026-09-25]

**起点**: 2026-09-25 の添削受注（room 18351970）をきっかけに、外国人技術者向けの商品展開を検討した。名前から購入者の出身は判断できないので、この1件は需要の根拠にしない。分かっていること: 施工管理技術検定は外国人も受験できるが、日本語のみでふりがな・外国語版は無い。特定技能・技能実習では施工管理に就けず、買い手は技術者として働く人（日本語はある程度できる）。困りごとは試験知識より「日本語で答案を書くこと」（である調・助詞・専門用語の漢字・字数に収める言い回し）と見ている。ココナラの検索では、施工管理の経験記述に絞った外国人向け出品は見当たらなかった（未網羅）。

**やること**: 安い順に進め、前の段で反応が無ければ止める。
1. 1級・2級の経験記述 8 出品の本文と FAQ に「日本語が母語でない方も歓迎。答案の中身に加えて文法・言い回しも直します」を足す（`coconala-listings.json` → `coconala-edit --commit`）。問い合わせ・購入の件数を orders.json のメモで数える。
2. 反応があれば、添削に日本語表現の直し（誤り→正しい形＋理由）を正式に含め、価格を据え置くか上乗せするか決める。
3. よく使う言い回しと専門用語にふりがなと例文を付けた表現集（note か PDF）。翻訳は付けない（技術用語の訳を確かめる手段が無い）。
4. 外国人技術者を雇う建設会社・人材紹介会社への法人向け販売（ココナラの外・営業が要る）は、1〜3 の結果を見てから判断する。

**完了条件**: 1 を入れてから2級二次（10/25）までの反応を見て、2 以降に進むか止めるかを決めたら、このカードを削除する（進める場合は段ごとに再起票）。

### [DN-0298] Google が旧 `/docs/` を正規に選んだ 17 URL を追い、note から張られた分だけ残るならその note 18 本を再公開する
タグ: [インフラ・計測] [領域:サイト] [時期:2026-11] [種類:改善] [起票:2026-09-24]

**起点**: 2026-09-23 の URL 検査 batch で 17 URL が「重複（Google が旧 `/docs/` を正規に選択）」だった。#598 は note の被リンクが旧 URL を正規に選ばせる一因と見て張り替えたが、17 件のうち 7 件は note から張られていないのに同じ状態で、note の寄与は未検証。note から張られている 10 件を指す公開 note 記事は 18 本（PDF 付き 0）。

**やること**: 次の URL 検査 batch 以降で 17 件の `google_canonical` を比べる。note から張られていない 7 件が新 URL へ切り替わり、張られている 10 件が旧 URL のまま残るなら、その 18 本を `node scripts/note-update-body.mjs --list <list> --commit` で再公開する（PDF 付きが無いので `--reattach-pdf` は不要）。両群とも切り替わる、または両群とも残るなら再公開しない。

**追記（2026-09-27）**: 旧 DN-0387 を統合。`/docs/pe-construction-r07-railway`（「技術士鉄道」）と `/docs/pe-construction-hissu-kamoku-kaitourei`（「技術士模範解答」）は 1 回の 301 で新 URL へ転送され、サイト内リンクも直した。次の GSC 集計で同じ検索語に新 URL が出るかも同じ比較で確かめる。

**完了条件**: 上の比較を 1 回行い、18 本を再公開した（`check-note-republish` の drift から消えた）か、再公開しないと決めて本カードを削除した。



### [DN-0239] 日本語校正（textlint + prh）の偽陽性ゼロを2週間観察する
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-17]

**実装済み**（PR [#650](https://github.com/uruhayato373/doboku-note/pull/650)・develop へ未マージ）: `textlint` + `textlint-rule-preset-ja-technical-writing` + `textlint-rule-prh`。`npm run lint:ja`（staged の `content/site/**/*.mdx` のみ・pre-commit + quality-audit `ci:true`）と `npm run lint:ja:all`（全件 report・ゲートしない）。辞書は `prh.yml`（実測で表記ゆれ確認済みの19語）。全件実測で `ja-no-redundant-expression`・`ja-no-successive-word`・`no-unmatched-pair`・`no-double-negative-ja` 等スタイル判断寄りの規則は誤検知が支配的と判明し無効化（過去問の空欄記法・記号連続・原文の二重否定表現を誤検知するため）。有効なのは文字衛生系（no-hankaku-kana 等）+ prh + jtf-style 2.1.8/2.1.9（全角英数）+ ja-no-abusage。ベースライン: 全 1,280 ファイル中 537 ファイルで検知 2,067 件。

**残作業**: PR #650 のマージ後、日常のコミットで `lint:ja`（pre-commit）が誤検知で差し戻される事例が無いかを 2 週間観察する（目安 2026-10-10 まで）。差し戻しがあれば prh.yml/.textlintrc.json を調整、無ければこのカードを削除して完了とする。

### [DN-0240] Lighthouse CI の warn 揺れゼロを2週間観察する
タグ: [インフラ・計測] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-17]

**実装済み**（PR [#651](https://github.com/uruhayato373/doboku-note/pull/651)・develop へ未マージ）: `@lhci/cli` を `.github/workflows/lighthouse.yml` で PR 実行。`lighthouserc.json` が代表4ページ（home / KW記事 / 過去問 / ツール）で `categories:accessibility ≥0.95`・`seo≥0.95`・`best-practices≥0.9` を error、`performance≥0.7` を warn（job summary のみ）でチェック。ローカルで実際にゲートを回し、見つかった3件の実在する a11y 違反（ロゴリンクの aria-label 不整合・広告バッジのダーク時コントラスト不足・SpecSheetList の見出しレベル固定）を修正済み。役割分担（本番 field 監視の psi-config とは二重管理しない）は commands.md に明記。

**残作業**: PR #651 のマージ後、PR ごとの lhci 実行で `performance` warn が「実装と無関係な lab の揺れ」で頻発しないかを 2 週間観察する（目安 2026-10-10 まで）。揺れが大きければ `numberOfRuns`（現在3）を増やすか閾値を調整、問題なければこのカードを削除して完了とする。

### [DN-0231] Mac のGit保守を導入し、次回clone時にpartial cloneを使う（履歴は書き換えない）
タグ: [インフラ・計測] [領域:管理] [時期:2026-11..2026-12] [種類:改善] [起票:2026-09-14]

**起点**: 旧カード「git 履歴の次回切り詰め（`size-pack` 1.05 GiB の回収）」は 2026-09-14 に「履歴は書き換えない」と決めて廃止した。代わりに clone 側を軽くする。Windows は 09-14 に `git maintenance start` 済み（`maintenance.strategy=incremental`）。`.git/lfs` の孤児 2.25 GB（参照 0）は同日に削除済み。

1. Mac: `npm run disk-hygiene:install` でGit保守も登録する。次回clone時は `git clone --filter=blob:none` を使う。既存cloneへのpromisor設定と `git gc` だけでは到達可能な履歴blobは落ちない。現checkoutの自動置換や履歴切り詰めはしない。根拠: [Git gc](https://git-scm.com/docs/git-gc)、[partial clone](https://git-scm.com/docs/partial-clone)。
2. 両 PC: `git count-objects -vH` の `size-pack` と `garbage`、`git config maintenance.strategy` を `asset-storage-policy.md` §8 の末尾へ実測として 1 行記録する（Windows の 09-14 実測: size-pack 1.11 GiB / garbage 2 = 8.45 MiB の tmp_pack）。

**完了条件**: Macで保守登録を確認して両PCの実測を記録する。次回clone時のfilter確認はcloneを更新する際に行い、既存packの強制削除を完了条件にしない。

### [DN-0233] Mac 端末の初期設定を今回の設計に合わせて揃える（hygiene・pre-commit・dotfiles・memory リンク・MCP）
タグ: [インフラ・計測] [領域:管理] [時期:2026-11..2026-12] [種類:改善] [起票:2026-09-14]

**起点**: 2026-09-14 の設計（`~/.claude/plans/greedy-jingling-boole.md`）で個人設定は private dotfiles + symlink、memory は repo `.claude/memory/` を junction/symlink、user-scope MCP `github`/`filesystem` は削除、と決めた。Windows は同日に実施済み。Mac は未着手。

Mac で行う（各 1 回・順に）: (1) `git pull` で Windows 対応・設定一本化の PR を取り込む、(2) `npm run disk-hygiene:install` と `npm run pre-commit:install`、(3) dotfiles の `bin/link.mjs --host mac` で `~/.claude/settings.json`（`cleanupPeriodDays: 7` 入り）と `~/.codex/config.toml` を張る、(4) `node scripts/setup-memory-link.mjs` で `~/.claude/projects/-Users-minamidaisuke-doboku-note/memory` を repo へ向ける（既存の実ディレクトリは `memory.bak-*` に退避される）、(5) `claude mcp remove -s user github filesystem`、(6) DN-0231 の partial clone。

**(4) は 2026-10-02 に実施済み**: Mac は (4) 未実施のまま別リポジトリ `doboku-note-memory` へ SessionStart/End フック（`~/.claude/hooks/sync-memory.sh`）で同期され、repo と 188 件 vs 143 件に分裂していた。統合して `.claude/memory` へリンクし、フックを `~/.claude/settings.json` から外した（スクリプトは `sync-memory.sh.retired-2026-10-02`、元ディレクトリは `memory.bak-*` に退避）。再発は `npm run check-memory`（SessionStart の `--session`）が検出する。残りは (1)(2)(3)(5)(6)。

**完了条件**: Mac で `npm run check-disk-hygiene` が FAIL 0、`claude mcp list` に github/filesystem が無い、memory リンクが symlink で `MEMORY.md` の行数が repo と一致、`npm run check-codex-compat` 緑。

### [DN-0496] config/・data/ 分離後に各 PC の git 管理外ファイルと定期処理を新しい置き場へ揃える
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-02]

**起点**: 2026-10-02、事業の正本とツール設定を `.claude/config` → `config/`、事業の記録を `.claude/state` → `data/`、ココナラ素材を `.claude/config/coconala/assets` → `content/coconala/assets` へ移した（PR feature/config-data-dirs）。git 管理下のファイルは pull で移るが、**git 管理外のファイルは各 PC の旧パスに取り残される**。**着手条件**: 当該 PR が develop にマージ済み。

各 PC（Windows・Mac）で repo 直下から:
1. `git switch develop; git pull` と `npm run pre-commit:install`（pre-commit の内容が変わったため）。
2. 取り残しの確認: 旧パス `.claude/config/coconala/assets/`・`.claude/state/metrics/gsc-ui/`・`.claude/state/metrics/ga4-ui/`・`.claude/state/metrics/affiliate/a8-ui/` にファイルが残っていないか見る。
3. 残っていれば新しい置き場へ移す（中身を上書きしない）: ココナラ素材は `content/coconala/assets/`（無ければ `node scripts/drive-vault-sync.mjs --pull --path 'content/coconala/assets/'` で Drive から取り戻す）、GSC・GA4 の UI CSV と A8 の生ファイルは `data/` 配下の同じ相対位置へ。空になった旧ディレクトリは消す。
4. 承認済みで未実行の CI 書き込み計画（`ops-write`）があれば作り直す（入力のパスが変わり plan hash が変わったため、古い計画は通らない）。

**完了条件**: 各 PC で旧パスに git 管理外のファイルが 0 件、`npm run check-information-architecture` と `npm run check-drive-vault -- --staged-only` が通り、Mac の定期処理の次回実行が `data/` へ書いている（定期処理の worktree は毎回 origin/develop へ reset されるので手で更新しなくてよい）。

**進捗（2026-10-02）**: Windows 分は完了。手順 1〜3 を実施し、旧パスの git 管理外ファイル 153 件（ココナラ素材 19・gsc-ui 70・ga4-ui 2・a8-ui 62）を上書きなしで新しい置き場へ移し、旧ディレクトリを削除（残り 0 件）。`check-information-architecture`（違反 0）と `check-drive-vault -- --staged-only` は通過。手順 4 は手元に保存される計画が無く対象なし。`.claude/state/` に残る git 管理外ファイル（content-ledger.json・quality/・improvements/ 等）は現行スクリプトの出力先なので移さない。Mac 分も同日に手順 1〜3 を実施（`.claude/` 側の取り残し 0 件、`data/metrics/` の gsc-ui 3 回分・a8-ui 6 回分を `data/gsc/ui/`・`data/a8/ui/` へ移して旧ディレクトリを削除）し、`.gitignore` の移行中の行を消した。残りは Mac の定期処理の次回実行が `data/` へ書いていることの確認と、Windows の worktree `.claude/worktrees/data3` の `git worktree remove`（ブランチ `feat/data-config`・`feat/data-rank-watch` は origin で削除済み・DN-0498 の引き継ぎから移した）。

### [DN-0494] Windows の記憶（memory）が repo の .claude/memory 1 本を指しているかを確かめて揃える
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-02]

**起点**: 2026-10-02、Mac の記憶が別リポジトリ `doboku-note-memory` へフック同期されたまま repo と分裂していた（DN-0233 (4)）。Windows は 09-14 に junction 済みのはずだが、同じフックや実ディレクトリが残っていないかは未確認。**着手条件**: `check-memory` を入れる PR（feature/memory-guard）が develop にマージ済み。

Windows の PowerShell で repo 直下から順に:
1. `git switch develop; git pull` で記憶の統合と `scripts/check-memory.mjs` を取り込む。
2. `node scripts/check-memory.mjs --local` で現状を見る。exit 0 なら 6 へ。
3. 「実ディレクトリ」と出たら、中身を先に救う: `$m="$env:USERPROFILE\.claude\projects\<key>\memory"`（`<key>` は repo の絶対パスの英数字以外を `-` にしたもの。例 `C--Users-<名前>-doboku-note`）。`Compare-Object (ls $m -Name) (ls .claude\memory -Name)` で `<=` 側（Windows にだけある記憶）を `.claude\memory` へコピーする。同名で中身が違うものは上書きせず別名で残し、`MEMORY.md` に 1 行ずつ足して `npm run check-memory` が通ってから develop へコミット・push する。
4. `node scripts/setup-memory-link.mjs` を実行する（実ディレクトリは `memory.bak-*` に退避され、junction が張られる。管理者権限は不要）。
5. 「別同期フック」と出たら、`$env:USERPROFILE\.claude\settings.json` の `hooks` から `sync-memory` を呼ぶ SessionStart/SessionEnd を消し、`$env:USERPROFILE\.claude\hooks\sync-memory.*` を `.retired-2026-10-02` 付きに改名する。dotfiles の `claude/` に同じフックがあればそちらも消す（dotfiles から張り直すと復活する）。
6. `npm run pre-commit:install`（pre-commit に記憶のゲートが加わったため。**Mac も同じくマージ後に 1 回**）。
7. `node scripts/check-memory.mjs --local` が exit 0、`(Get-Item $m).LinkType` が `Junction` で `Target` が repo の `.claude\memory`。

**運用の約束**: 記憶はファイルが repo 内にあるだけで、コミット・push しないと他の PC に届かない。記憶を書いた作業のコミットに `.claude/memory` を含める（記憶だけの develop push は CI を走らせない）。

**完了条件**: Windows で 7 が成立し、Mac と Windows の `MEMORY.md` が同じコミットを指す。




### [DN-0261] 転職アフィリ第2波の効果を EXP-008 の wave-2 基線で再計測する
タグ: [収益化] [領域:アフィリエイト] [時期:2026-10..2026-12] [種類:改善] [起票:2026-09-22] [期日:2026-10-20]

2026-09-22 に第 2 波を出荷した（サイト新設 4・改稿 5・note 5・公務員土木クラスタ）。第 1 波（EXP-008・2026-09-08）の判定は DN-0120 で **継続（追加投資なし）** と裁定済みで、理由と残る問いは [affiliate-operations.md](../knowledge/reference/affiliate-operations.md) の裁定ログ 2026-09-22 にある。

deploy から 28 日後に、`npm run report-career-funnel` を **wave-2 基線** `data/analysis/career-funnel-baseline/2026-09-16.json`（2026-09-22 凍結・GA4 窓 08-20〜09-16＝出荷直前） と比較する。第 1 波の 08-12 基線とは別ファイルで、混ぜない。afb の確定成果は `data/afb/outcomes/ の最新` を併記する（鍵登録後）。

**この期間に答えを出す問い**: 11 click で確定成果 ¥0 だった件について、a8mat ピクセルが実際に発火しているかを本番 HTML で確認する（`curl` で対象ページの `a8mat=` がちょうど 1 件＝配置は既に検証済み。未検証なのは発火そのもの）。原因と決めつけずに観測する。

**完了条件**: wave-2 基線との差分（表示・クリック・面別）と afb/A8 の確定成果を並べた記録を裁定ログへ追記し、(1) 継続 / (2) 露出を絞る / (3) 撤退 を再判定している。

### [DN-0110] 承認済み動画パック112本＋Shorts224本の公開・6週間判定
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-09..2026-10] [種類:改善] [Codex候補] [検証:quality:audit:ci] [起票:2026-08-21]

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

2026-09-05のユーザー決定で、QA済みの1級土木66本・2級土木18本・コンクリート技士12本・主任技士16本の通常動画112本と、各パック2本のShorts計224本を公開工程へ進める。通常動画は112本すべて公開済みまたはAPI予約済み。残作業は次の順で行う。

1. 通常動画の残存メタデータを著者主体・AI制作補助表記へ同期し、全件の`videoId`・`publishAt`・CTAを実査する
2. Shorts224本をprivate R2へ配置し、API日次更新後に最大45pack/90本でprivate uploadする
3. 各ShortでStudioの関連動画を該当通常動画へ設定してからAPI予約し、通常動画を含む最大3投稿/日・試験日除外を守る
4. 公開6週間後にShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移から継続・修正・停止を判定する

**制約**: `approved` はユーザーだけが設定する。mp4/wavをGitへ入れない。今回の対象は明示承認済み112パックだけで、技術士総監・建設部門・診断士・IG/X/Threads/TikTokへ承認を波及させない。legacy総監Shorts187本はretiredのまま再開しない。

**完了条件**: 通常動画112本とShorts224本を外部実体で照合し、全Shortsの関連動画・予約日時・著者表記が正しく、全機械・意味ゲートがPASSする。6週間後の継続/修正/停止判断とbaselineを記録したらカードを削除する。

### [DN-0317] ログイン必須の計測・書き込みの CI 化を、残りのサービスへ canary で広げる
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-12] [種類:改善] [起票:2026-09-25]

**起点**: PR #548 / #549 / #550（2026-09-21 merge）で暗号化 storageState による CI 化の基盤は揃い、a8・coconala・note(traffic) は schedule 起動で緑（2026-09-22〜25）。残りのサービスは `ci.enabled:false` のまま。

**やること**: 読み取りは kdp → x → google → afb の順に、レジストリで `canary:true, enabled:true` → `gh workflow run login-collectors.yml --ref develop -f service=<svc> -f mode=probe-only` を2回 → `-f mode=collect` を別日に3回 → Mac で `npm run auth:status -- --service <svc>` が authenticated のまま → `canary:false` で cron。書き込みは `npm run ops-write:plan` → `ops-write.yml`（最初は `commit=false`）で instagram.publish-bs → note.sync-tags → note.update-body → note.publish → coconala → X 投稿 → X Articles → KDP の順。事前のユーザー操作（Secret `DOBOKU_AUTH_AGE_IDENTITY`・`CLOUDFLARE_ANALYTICS_API_TOKEN`・各サービスの `auth:export`・Environment `external-writes`）が済んでいないサービスはそこで止める。罠は memory の reference_ci_encrypted_state_gotchas。4週安定したら `check-*-due` と ops freshness の `note:` を CI 主経路に書き換える。

**完了条件**: 対象サービスがすべて `canary:false` で cron 稼働するか、サービスごとのカードへ分けたら、このカードを削除する。

### [DN-0338] 1級土木「ネットワーク式工程表」のtitle・descriptionを「インターフェアリングフロートとは」の検索意図に合わせる
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-26]

**起点**: 週次トリアージ（data/analysis/growth/digest-2026-W38.json）の OPP-2ee0d7aa00: 「インターフェアリングフロートとは」は平均 7.6 位なのに CTR 0.16%（期待 3%）（期待効果 6.9 searchClicks/週）。原稿: `content/site/civil-construction-1/textbook-network-schedule/article.mdx`

**やること**: GSC で「インターフェアリングフロートとは」（35日 表示1,215・クリック2・平均7.6位・旧URLを含む）の着地ページと表示中のタイトルを確認し、textbook-network-schedule の seoTitle・description・リード文にフロート4種（トータル/フリー/インターフェアリング/ディペンデント）の定義と試験での問われ方を入れる。本文に無い定義は足さず、既存の図 figure-3-21-23 と整合させる。変更後は refresh-indexes。

**完了条件**: seoTitle・description・リードが検索語の定義に答える形で公開され、公開日から28日後の同クエリの CTR を変更前（0.16%）と比べた記録が business review か本カードの完了記録にある。

**進捗（2026-09-27）**: seoTitle を「インターフェアリングフロートとは｜IF＝TF−FF…」に、description とリードを定義と試験での問われ方（IF を求める計算・TF＝FF＋IF の空欄補充）に直して develop へ反映（29cbf89f2）。残りは 28 日後（10/25 前後）の CTR 比較だけ。

### [DN-0346] ココナラの資格別の市場スキャンを取り直し、展開の判断のココナラ列を下限から実測に変える
タグ: [インフラ・計測] [領域:戦略] [時期:2026-10] [種類:改善] [起票:2026-09-26]

**起点**: 2026-09-26 の市場スキャンで、ココナラの資格別の検索語 26 語は Playwright のメモリガード（空き 1,175MB < 閾値 1,200MB）で取得できなかった。管理画面 戦略 ＞ 資格と市場 ＞ 展開の判断のココナラ列は、汎用の検索結果から数えた下限（*）のまま。

**やること**: 管理画面の dev サーバーなど大きいプロセスを止めて空きを作り、`npm run scan-qualification-market -- --channel coconala` を実行する（ガードの閾値は下げない）。

**完了条件**: `npm run qualification-market` のココナラ列から * が消え（見送り以外の全資格）、取得物をコミットしたら、このカードを削除する。

### [DN-0311] ココナラの商品展開を「人の作業が主役・PDF は安い入口」へ組み直し、note・KDP と資格ごとに棲み分ける
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-09-25]

**起点**: 2026-09-25 に、ココナラの競合（`market-research.json` 9/23 取得・関連358サービス、主要ページは当日取り直し）と自社の note（`data/note/sales.json` 303件）・KDP（`data/kdp/royalties.json` 7〜8月）・ココナラ（`data/coconala/orders.json` 4件・`data/coconala/kpi.json`）を突き合わせた。
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

### [DN-0278] YouTube 概要欄の冒頭に季節の主商品リンクと保有資格を置き、予約済み・公開済みへ同期する
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-10..2026-12] [種類:改善] [検証:verify-video-publication] [起票:2026-09-23]

**起点**: ちゃんさとは二次検定期に概要欄の1行目をココナラにし、一次検定期は note の模試を先頭に置いている（[07b_販売動線分析_ちゃんさと_2026-09.md](../../docs/marketing/07b_販売動線分析_ちゃんさと_2026-09.md) §2）。自社の概要欄は「要約→この動画で分かること→制作表記→▼リンク」の順で、リンクが折りたたみの下にある。制作表記（`config/youtube-production-disclosure.json`）は「技術士（総合技術監理部門）」だけで、建設部門と1級土木が無い。

**やること**:

1. 生成テンプレート（`scripts/prepare-youtube-longforms.mts` の description）を「1行目＝要約、2〜3行目＝▼主CTA＋URL」に変える。パック固有の主CTAは従来どおりとし、季節の主商品（一次期＝模試・論点、二次期＝経験記述の診断・添削）を置くかは 07 §6 の切替に従う。
2. 制作表記を「技術士（建設部門・総合技術監理部門）・1級土木施工管理技士」に直す。`scripts/update-youtube-authority-metadata.mjs` は最初の「▼」の前に表記を差し込むので、リンクを冒頭へ移すと表記まで上がる。差し込み位置も合わせて直す。
3. 全 `youtube.json` を再生成し、予約済み・公開済み（`.claude/state/video-content-status.json` の longform と Shorts）へ `publish-video-pack.cjs --phase metadata` で同期する。ローカルに YouTube の資格情報が無いため、CI から実行する経路を用意する。

**A8 リンク**: 概要欄にココナラ登録の A8 リンクを置く場合、YouTube チャンネルは A8 の掲載サイトに未登録（2026-09-24 時点で stats47・doboku-note・kazu-note のみ）。先に掲載サイトとして登録する（DN-0283 と同じプログラム）。

**順序・禁止**: DN-0110 の移行（移行計画の `desiredSnippet`・`planSha256`）と衝突させない。移行が終わってから、または計画を作り直せる状態で着手する。公開面で「総監は上位資格」と書かない（07 §2）。

**完了条件**: 予約済み・公開済みの全件の概要欄が新テンプレートと一致し、`verify-video-publication` の実査が通る。


### [DN-0270] ココナラの出品画像を、一覧で読める型へ作り直す（人が見るサービスにキャラクター・画像に価格を入れない）
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:制作] [起票:2026-09-23] [期日:2026-10-20]

**起点**: 2026-09-23 に競合の出品画像と並べて比べた。最大手のちゃんさと技師は、マスコット（ヘルメットの白クマが赤ペンで添削）と大きな「経験記述 添削」の文字、303geos は文字だけ、ひげごろーは本人写真と強い配色。3者に共通するのは太く大きい文字と強いコントラストで、自社の画像（淡い写真の背景に細い文字）は検索一覧の小さい表示で埋もれる。ユーザー決定の方針: 診断・添削・答案作成のような人が見るサービスは、doboku-note 先生を大きく入れ、資格（技術士・元発注者）を添える。PDF 教材はキャラクターを小さく隅に置き、主役は中身（冊子の見本・冊数）。画像には価格を入れない（ココナラは価格を画像の横に出す。9/23 の値上げでサムネ12枚を作り直したうえ、画像の中身は `check-coconala-live` でも検査できない）。最大手と同じ「キャラクター＋添削」の型なので、配色と構図で真似に見えないようにする。キャラクター素材（`config/character-poses.json`・11ポーズ）に「赤ペンで添削」のポーズが無く、新しいポーズは Codex で作る。Codex の利用上限が解けてから着手する。受験者が購入前に「誰が見てくれるか・何が入っているか」を一目で判断できるようにする画像で、HARMはA。画像の変更で閲覧が増えるかは未検証。

**やること**: (1) 【2026-09-23 済】今の文言（「採点者視点」→「発注者視点で赤入れ」）で8件（shindan・tensaku-set・sakusei・sakusei-4theme・civil-keiken-kit・sokan-bunseki・rccm-mondai3-tensaku・rccm-mondai1-shindan）のサムネを作り直して差し替え、診断・添削のギャラリーも入れ直した（両方2枚）。`check-coconala-live` は20件一致、Drive vault 同期済み。(2) キャラクターの添削ポーズを `CHARACTER-SPEC`（1ポーズ＝1画像）に沿って Codex で作り、`character-poses.json` に登録する。(3) `coconala-thumb.mjs` に「人が見るサービス用（キャラクター大・太字・価格なし）」と「PDF 用（キャラクター小・中身の見本）」の2型を足し、添削・作成から差し替える。差し替えは `coconala-edit --replace-image` で、複数画像の商品（添削は2枚）はギャラリーを入れ直す。2026-09-25 に経験記述サービスを1級・2級に分け（PR #638）、診断・総監・RCCM はアーカイブした。対象は1級・2級の添削・作成8件（`tensaku-set`・`tensaku-4theme`・`sakusei`・`sakusei-4theme`・`2kyu-tensaku`・`2kyu-tensaku-3theme`・`2kyu-sakusei`・`2kyu-sakusei-3theme`。同日に級別の背景色で作り直し済み）と `1kyu-premium`。PDF 教材は3件の閲覧を見てから同じ型へそろえる。

**完了条件**: 差し替えた商品の公開ページで画像枚数が変わらず（ギャラリーを保持）、`npm run check-coconala-live` が全件一致。出品画像の文言に「採点者」を自称する表現が0件。差し替えから30日後に、差し替えた商品と差し替えていない商品の閲覧数を kpi.json で読む。表示回数が非公開（セラーサクセス未加入）でクリック率は取れず、試験日の季節変動も混ざるので、効果は断定しない。

### [DN-0220] 図解整備を公開・配信し資格別KPIの初回実測を閉じる
タグ: [インフラ・計測] [領域:教材] [時期:2026-09..2026-10] [種類:改善] [起票:2026-09-13]

**根拠**: 図解の制作・公開・効果は別々に確認する。EXP-007/008で実験枠2が埋まっており、現時点で新しいSEO改善実験を開始したとは扱わない。

**次**: 制作カードの成果をdevelopへ統合後、公開対象と差分を整理して既存deploy手順で本番反映する。側圧の訂正文案は原投稿IDを示して外部送信の承認を得た後に投稿・実体確認する。SNSは既存公開/予約SSOTに接続し、公開日を起点に7日観察・28日補助確認を行う。

**完了条件**: 公開URL・投稿ID・公開日・測定窓・取得元を記録し、資格別の実測と次の判断をbusiness reviewへ残す。GSC平均順位とGA4行動、SNSで取得可能な反応、note/ココナラアクセス/販売の範囲を分ける。欠測を0と扱わず、順位・販売への因果は断定しない。

**手順・停止条件**: [実装計画](../plans/DN-0220-diagram-rollout.md)。

### [DN-0186] Windows端末のR2・Google Drive接続を整え、クラウド実体監査を成立させる
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:不具合] [検証:resources:cloud] [起票:2026-09-10]

**起点**: 2026-09-10の実査では、ローカル自動監査のR2資格情報が未設定、rcloneの `doboku-gdrive` 接続も未設定で `npm run resources:cloud` が検査不成立。Driveコネクタ経由では既存vaultの1ファイルを全バイト・SHA-256照合できており、Drive自体の不存在ではない。

1. DN-0135の行15（監査キーの最小権限化）と連携し、このWindows端末の監査に読み取り専用資格情報を設定する。必要なら `scripts/local-storage-verify.mjs` のキー選択を監査専用設定に対応させ、検査目的で書き込み権限を追加しない。
2. 人のOAuthログインでrcloneの `doboku-gdrive` を既存の `doboku-note` vaultへ接続する。接続先は `config/drive-vault.json` に従う。vaultの重複作成や全量ローカル同期をせず、秘密情報をGit・監査ログへ保存しない。
3. 定期実行と同じ端末・実行環境で `npm run resources:cloud` を実行し、R2・Driveとも選定サンプルの全バイトをストリームで読み、容量とSHA-256を照合する。認証・通信失敗を0件成功やメタデータ照合で代用しない。

**完了条件**: 両保管先で実体検査が各1件以上成立し、選定対象がすべて一致してコマンドがexit 0となる。定期実行からも同じ接続を利用でき、検査件数・日時・結果を確認できること。反復監査は既存の定期運用へ戻す。

**参照**: [ローカル資源運用](../knowledge/reference/local-resource-policy.md)、[アセット保管方針](../knowledge/reference/asset-storage-policy.md)。CIキー整備はDN-0135、このカードは端末の自動監査経路を担当する。

### [DN-0184] YouTube・SNSの人物／見出しテンプレートを複数ポーズで実装し、既存予約・公開投稿へ反映する
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-09..2026-10] [種類:改善] [Codex候補] [起票:2026-09-08]

**目的**: 「doboku-note先生＋短い極太見出し」の採用方針を生成テンプレートへ実装し、別PCでログイン済みの投稿実体へ反映する。制作・公開の定常運用と6週間計測は DN-0110、このカードは意匠と更新経路の改修を担当する。

**参照**: [SNS画像ポリシー §0・§0.1](../knowledge/reference/sns-image-policy.md)、[キャラクター素材ポリシー](../knowledge/reference/character-asset-policy.md)、[ポーズ台帳](../../config/character-poses.json)。制作・QA・投稿スキルはこの共通ルールを参照する。ルールの存在をレンダラーの実装完了とみなさない。

**別PCでの再開順**:

1. このカードと関連ルール・スキル・エージェント定義の差分を同期する。今回のサンプルPNGは元PCの `.tmp/sns-design-mockups/` にあるローカル試作でGit同期されない。見た目の再現は共通ルールを基準とし、比較原本が必要なら [アセット置き場](../knowledge/reference/asset-storage-policy.md) に従いDrive vaultへ引き継ぐ。端末固有の絶対パスへ依存しない。
2. 管理画面「キャラクター素材」（`/gallery/characters`）で用途・配置から候補を選び、同じテーマ「最短工期、どこで決まる？」で、指差し（pointing）・考え中（thinking）・手のひらで解説（explaining）の最低3案を比較する。見出し・配色を揃え、ポーズと配置による差を見られるようにする。必要に応じ笑顔・good-signを締め用に追加し、顔・服装・ヘルメット表記の同一性を確認する。全投稿を指差し1種へ固定せず、問い／解説／締めに合う使い分けを決める。不足する向き・役割だけを新規生成し、目視して既存ポーズ台帳へ登録する。使用前に台帳の `quality` を確認し、要修正素材の透過抜け等を解消する（名称照合の `verified` と画像品質を混同しない）。
3. YouTube通常動画サムネ16:9、Shorts/Reels冒頭9:16、Instagram表紙4:5、Xカード16:9へ展開する。文字は編集可能なデータ、人物は既存素材で保持し、媒体別のトークンと共通レンダラーを改修する。幅360pxの画像と動画冒頭を確認し、見出し・人物・字幕・操作ボタンの重なりを解消する。
4. 元データ／カバー／動画派生物／配信先素材の参照を追跡し、未アップロード分はまとめて再生成する。予定や公開状態はYouTube台帳、IGのstatus/posted、Xのstatusと実機から読む（件数・日時をこのカードへ複製しない）。
5. 既存の `.claude/scripts/youtube/set-thumbnail-uploaded.mjs` は全videoId対象・既定書き込みのため、ID指定・既定dry-run・アカウント照合・変更前後の記録を実装してから選択対象へ適用する。旧Shorts用台帳だけでなくDN-0110の通常動画／Shorts経路も調べ、対象の取りこぼしを避ける。IGは新規投稿フローと既存予約編集を分け、対応項目を実機確認する。
6. 予約分を優先し、公開済みYouTubeはサムネ変更から進める。Instagramの本文／Reelsカバー／本体、Xの編集期限を項目別に確認する。動画本体の再アップロードや投稿の削除・再投稿が必要なものは、URL・反応履歴への影響を示してユーザーの依頼範囲内で扱う。保存後にID・予約日時・公開状態・実表示を再照合し、素材生成だけで外部反映済みとしない。

**完了条件**: 3ポーズ以上の比較を経た媒体別テンプレートが実装され、代表画像／動画の目視と該当機械検査が通ること。適用対象の一覧に「反映・実表示確認済み／変更不可と理由／対象外と理由」が揃い、未対応を完了へ混ぜず、予約重複・意図しない即時公開・投稿履歴の無断削除がないこと。機械検査だけで外部反映を判定しない。

### [DN-0303] 手取り・運営費用・作業時間を週次で記録し、事業 KPI の利益判断を埋める
タグ: [収益化] [領域:戦略] [時期:2026-10..2026-12] [種類:改善] [起票:2026-09-25]

**起点**: 2026-09-25 に GA4 計測と事業 KPI（`config/business-direction.json`）の収益化サイクルを点検したところ、22 指標のうち `netReceipts`（手数料等控除後の受取額）・`costYen`（運営費用）・`workMinutes`（運営作業時間）が全資格・全期間で null だった。CLAUDE.md の判断基準は「受取・費用・運営時間まで確認する」だが、売上（noteRevenue 等）はあっても利益と時間あたりの効率が数字で見えない。記録の入口 `node scripts/business-review.mjs record --input <JSON> --commit` はあるが、何を・いつ・どの粒度で入れるかが決まっていない。

**やること**: (1) ユーザーと決める: 手取りの出所（note・ココナラ・KDP・A8 の各入金明細／プラットフォームの手数料控除後の月次表示）、費用の範囲（サーバー・API・ツール課金・外注・広告）、作業時間の測り方（週次レビューで資格別の概算を手入力／タスク単位で記録）、記録の粒度（週次か月次か・資格別に按分するか）。(2) 決めた方法を business-review.md に書き、週次または月次レビューの手順に記録の工程を入れる。自動で取れるもの（例: ココナラ・note の手数料率から手取りを計算）はスクリプト化する。(3) 1 回目の記録を入れる。

**完了条件**: 直近の完了期間で 3 指標が null でなく記録され、`buildReport` のセルに出る。記録手順が business-review.md と週次/月次スキルにある。

### [DN-0135] 人・外部実体が必要な残務
タグ: [収益化] [領域:管理] [時期:2026-09..2026-12] [種類:不具合] [起票:2026-08-25]

この環境だけでは完了できない残務を集約する。weekly の手動キューはこの ID だけを参照し、状態や件数は複製しない。

| # | 残務 | 実体（2026-08-25 照合） | 律速 |
|---|---|---|---|
| 3 | Kindle `e-02` の差し替え | catalog は LIVE 反映済み（2026-08-28・ASIN B0H3GX3HNW）。残＝ローカルの修復済みEPUB（2026-08-12修復・章名article.mdx漏れ解消・epubcheck 0件・check-kindle-epub-leak PASS）をKDPへ差し替える経路が無い。`kdp-publish.mjs` に「LIVE本のマニュスクリプト更新」モードが未実装で、`--dump --page content` の `title-setup/kindle/<asin>/content` は既刊では404（下書き専用パス） | 正しいKDP編集導線（本棚→編集→コンテンツ更新）の特定から必要。KDP 実機。顧客影響がある可能性が高いため優先度を上げて確認すべき |
| 8 | civil-1 一次過去問 公式キー 24 件 | 残＝`h28-a`(19)・`h29-a`(1=No.38)・`h29-b`(4=No.3/12/17/21)。h28-a は 19 件と突出＝official 配列自体の OCR 誤りを疑い、mass-fix 前に第2ソースで再検証 | pre-H30 原典 PDF の入手（touhokugiken.com / dobokujira.com に h29 学科A/B は無し）。**LLM 推測厳禁**・キー番号だけの書き換え禁止 |
| 9 | 過去問 解説・図の要照合クラスタ | 解説＝civil-1 `secondary-construction-plan-past-problems` No.9(1) 記述省略／civil-2 `secondary-r06` 問8 画像未挿入／総監 h21・h22・h28・h30 の 7 問／pe-first-stage 3 問。図は `figure-provenance.md` の `rescan-need-source` 7 図（`r07-a-fig-02` を含む） | 原典照合・外部原典の入手。進捗ビューは admin 記事図版タブ |
| 10 | ココナラ C12 プレミアム週枠の再判断（旧DN-0007） | C12（教材18冊＋添削2テーマ・¥17,000＝2026-09-23 改定）は`weeklyCapacity: 1`で開始。添削は本番顧客への納品実績が無く（S2レビュー0）、初回工数が読めないための暫定値 | 初受注時に`orders.json`の`tensakuMinutes`を実測記録。2〜3件出たら週枠を再判断（判断基準→[ココナラ展開キット.md §5](../../content/note/1級・2級土木/ココナラ展開キット.md)）。実受注が無いと1手も進まない |
| 11 | Gmail転送＋フィルタ設定（旧DN-0017・別PC作業） | ココナラの運営通知は`dobokunotecom@gmail.com`にしか届かずMCPから見えない。ラベル`dobokunotecom`は作成済み、`create_filter`はセッションに未公開のためフィルタ作成は人の作業 | 手順1: `uruhayato373`側でフィルタ作成（To=dobokunotecom・受信トレイスキップ＋ラベル付与）→手順2: `dobokunotecom`側で転送先追加・確認コード承認・転送有効化。完了条件は`label:dobokunotecom`で1件以上ヒット |
| 12 | KDP Select 自動更新オフ A-00〜A-06（旧DN-0089） | note 択一PDF（`n155093f42183`・¥1,980・公開済み）との抵触リスクを安全側に倒すと判断（2026-08-27）。e-02 は Select 非加入方針・A 系列は収録範囲違い（422問論点別 vs 1162問全年度）だが部分集合の可能性が否定できない | KDP 管理画面で A-00〜A-06 の「KDPセレクトへの自動登録」をオフ。**期限=独占明け 2026-10-06 より前（10月上旬）**。10/6 を過ぎて自動更新されなければ制約自体が消滅 |
| 19 | 技術士第一次試験 KDP Select早期解除の回答反映 | D-00／D-03の状態は`scripts/kindle-published/catalog.json`の`notes`を真実源とする。申請受付のローカル証跡は`.tmp/kdp-select-support-result.json`にあり、Amazonからの回答待ち | 回答受信後、KDP本棚で両書籍のSelect状態を実査する。解除済みならcatalogと`content/kindle/strategy.md`へ反映し、noteとの併売可否を確定する。未解除なら回答内容に従い再連絡し、解除確認前に恒常併売を確定しない |
| 13 | LINE 一次→二次ブリッジの器 | 磁石記事・配信台本3通・友だち追加CTA文言は完成済み。残るのは外部アカウントと実URLだけ | LINE公式アカウント開設→`delivery-script.md`を管理画面へ転記→`friend-add-cta.md`のプレースホルダーを実URLへ差し替え、X・note・サイトへ配置 |
| 15 | Cloudflare / R2 認証キーの最小権限化 | 固定90/180日ローテーションの根拠はない。R2監査専用キーの作成手順は`ci-cd-security-hardening.md`に既存 | Cloudflare管理画面で`CLOUDFLARE_API_TOKEN`の実期限・権限を確認し、R2読み取り専用キーを`CLOUDFLARE_R2_AUDIT_*`へ登録。`r2-audit.yml`が汎用キーへフォールバックせず成功することを確認 |
| 16 | コンクリート主任技士の原典待ち問題 | H25 skip 18問・H24 conflict 4問とR6/R7はローカル原典がなく、推測補完できない。詳細は`exam-content-policy.md`の主任技士メモが真実源（2026-09-30 追記: 図SVG化の過程で Drive vault `原資料PDF/書籍/concrete-chief-textbook-202{2,4}__*/pages/` のページ画像から H25・R01 の問題が目視で読めることを確認。サイトに節が無く図だけ先に作った4枚＝H25問15問題図・H25問19解説傾向図・R01問26問題図/解説図を同 vault の `crops/held-svg/` に退避。R01問26 も未収録。節を起こしたら図を配線する） | 原典入手後に問題・公式解答表を視覚照合し、復元できた設問だけ追加。解答キーに合わせた本文創作は禁止 |
| 17 | コンクリート診断士 98問＋既存8本＋新規8本の技術内容レビュー | 一次演習98問、既存記述式8記事、サイト`guide-essay`、構造物別の新規8記事と商品は公開済み。レビュー表は`content/note/コンクリート診断士/技術レビューチェックリスト.md` | 公開中の教材を有資格者が技術レビューし、指摘をサイト・note・Kindleの該当原稿へ反映する。原典照合できない数値を推測で補わない |
| 18 | GA4 UIバックアップとbing流入の外部照合 | Data API・週次`metrics-analyzer`・note referral集計・商品別期間効率は稼働済み。GA4 UI CSVは3ユニットとも未成立。最新14日のbingは2,683 usersだが日本比率99.4%・engagement 71.3%で自動bot署名は`flagged:false` | ログイン済みGA4 UIで正式レポート名を確定しfixtureを更新する。Bing Webmasterとdevice・landing・新規/再訪を突合し、件数比だけでbot除外しない。API主経路は継続する |

| 20 | 既存の動画退避物3件のハッシュ不一致 | `check-drive-vault` で `.tmp/video-render/career-komuin-minkan/wav/01-premise.wav`、`gakka-2kyu-hoki/shorts/point-overview-1/thumbnail.png`、`kikinagashi-shunin-suchi/shorts/point-tanni-saikotsu-kuuki-2/meta.json` のvault実体と台帳が不一致。今回制作した137ファイルはクラウドまで全件一致 | 各制作パックの現在の原稿/公開版と照合し、正しい版を確定してから退避し直す。台帳のSHAだけを書き換えない |

**完了条件**: 各行の実体が解消したら行ごと消し、全行が消えたらカードを削除する。

### [DN-0272] 部分更新の `replaceTopCta`／`insertTopCta` が冒頭 CTA を見出しにし、直後の見出しをカードで割る
タグ: [収益化] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-09-23] [進行中]

**起点**: 2026-09-23 に公開 note 918 本をライブ API で走査したところ、R8予想問題（n8e92e4673a99）と総監択一式17年分分析（n3bcb87efddad）の 2 本で、冒頭 CTA の文が `h2` になり、その後ろに URL だけの段落・カードが並び、直後の見出し「R8 で何が出るのか」「はじめに」が「R」「は」の段落＋カード＋残りの段落に割れていた（目次から節が消える）。2 本とも同日に全文更新で元の構造へ戻し、API で確認済み。形から見て、`scripts/note-update-partial.mjs` の `replaceTopCta`／`insertTopCta` が「次の `h2` の直前へ caret を置いて Enter→文字入力→URL 入力」する実装で、入力が見出しブロックの中に入ったとみられる（どの実行で起きたかは未特定）。

**やること**: コードは PR #773（2026-09-30 マージ）で済んだ（冒頭 CTA を HTML 差し込み＋URL 段落の cardify に置換、保存前に対象 h2 の一致・60 字超の見出しの増加を検査、`check-note-live-headings` に割れ見出し・長い見出しの検査を追加）。残りは運営者の了承を得て 1 本で冒頭 CTA の部分更新を実行し、ライブで確かめること（手順: `npm run note-update-partial -- --spec <spec>` を dry-run → `--commit` → `node scripts/check-note-live-headings.mjs <記事パスの一部>`）。

**完了条件**: 冒頭 CTA を差し替える部分更新を 1 本で実行し、ライブ API で CTA が引用ブロック、直後の見出しが `h2` のまま、60 字超の見出しが 0 であることを確認できる。

### [DN-0257] X Article パイロット: 今夜の Article 4 を出し、逸失した Article 1・3 を 10/26・10/28 に手動で公開する
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-09..2026-10] [種類:不具合] [検証:check-x-queue-health] [起票:2026-09-19] [期日:2026-10-29]

**起点**: Codex の 1 回限りローカル自動化は Mac スリープ中に発火せず、起床時に遅延実行されて公開窓（15 分前〜120 分後）を外す（Article 1・3 はこれで逸失）。アプリは `automation.toml` の直接編集を読まない。2026-09-27 に運営者が「今夜は Mac を起こす＋1・3 は手動」と決定。9・10 月は 10/8 と 10/23 以降しか 1 日 3 本の空きが無いため、1・3 を 10/26・10/28 の夕方へ引き直し（告知は翌朝）、Article 2 の告知 Tweet 4 は見送り（`cancelled`）にした。

**やること**: (1) 2026-09-27 20:00〜22:15 は Mac を起こしておき、自動化 `x-article-4` の公開と告知 Tweet 8（9/28 07:50）の予約を翌朝 `~/.codex/automations/x-article-4/memory.md` と `article_url` で確認する。逸失したら手動復旧 `DOBOKU_PW_MIN_FREE_MB=1024 npm run x-article:publish -- --article 4 --publish --force`（Claude Code の auto mode は拒否するので運営者が起動）。(2) 10/26 19:20 に `npm run x-article:publish -- --article 1 --publish`、10/28 19:35 に `--article 3` を運営者が実行し、告知（Tweet 2・6）を publish-x で予約する（手順は `.claude/skills/social/publish-x/SKILL.md`）。

**完了条件**: `npm run check-x-queue-health` の issues が空で、Article 1・3・4 の `article_url` が埋まっている。


### [DN-0366] 資格ハブから技術士・総監・1級土木へのクリックを計測する
タグ: [インフラ・計測] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 土木公務員 SEO 第1期の判定表で「クリックあり」のときの次の対応が「関連資格ページと収益導線への遷移を計測」（13_土木公務員SEO戦略2026-08.md）。資格ハブ `pe-comprehensive-management-public-engineer-qualification-map` からの遷移は、まだ測れていない。

**やること**: 資格ハブ内の技術士・総監・1級土木へのリンクのクリックを GA4 で取れるようにし（既存の CTA イベントで取れるならその確認だけ）、公開後 4 週の遷移数を記録する。

**完了条件**: ハブからの 3 方向の遷移数が GA4 で 4 週分読め、13 の第2期に記録されている。

**進捗（2026-09-27）**: PR #678 で資格ハブ末尾の 3 枚のカードに `internal_nav_click`（label: qualification-map:civil1 / :pe / :pe-cm）を付け、技術士（業務経歴票）へのカードを足した。読み方は 13_土木公務員SEO戦略 第2期に記載。残りは deploy 後 4 週分の遷移数の記録。

### [DN-0367] 受取額（netReceipts）を毎月機械で記録する
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 に NSM を月の受取額へ切り替え、月 ¥100,000 の目標を置いた（[15_KPIツリー.md](../../docs/strategy/15_KPIツリー.md)）。8月分は運営者の再認証のうえ手で拾った（note「売上詳細」の手数料控除後売上・ココナラ売上履歴・KDP 確定値）。毎月手で拾うと記録が抜ける。

**やること**: note の月別「売上詳細」の手数料控除後売上を `note-sales-fetch` と同じ永続プロファイルで取得し、ココナラ売上履歴（控除後・クローズ日）と KDP 確定値を合わせて `subject: netReceipts` の計測記録を書く処理を作り、月次レビューの取得手順に入れる。

**完了条件**: 2026年9月分の netReceipts が機械の取得で complete として記録され、月次レビューの手順から実行できる。

**進捗（2026-09-27）**: `npm run record-net-receipts` を作った（PR）。note の手数料控除後売上は売上管理の月別詳細（`/dashboard/salesmanage?datespan=YYYYMM`）から自動取得、KDP は data/kdp/royalties.json の catalog 対象・確定値、ココナラは `--coconala` で渡す。2026-08 で試運転し 74,218 円（手で拾った値と一致）。残りは 9 月分を 10 月初めの月次で記録すること。ココナラの自動取得は DN-0414。

### [DN-0368] 運営費用と作業時間の記録方法を決め、時間あたり受取額を出す
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:改善] [起票:2026-09-27]

**起点**: KPI ツリー（15_KPIツリー.md）の運営の制約で、`costYen`・`workMinutes` が全期間未計測。受取額の目標を置いても、手間に見合うかが判断できない。

**やること**: 固定費（ドメイン・ツール・AI 利用料など）と作業時間の記録の置き場と粒度を決め、月次で `costYen`・`workMinutes` を記録する。資格・チャネル別に分けられる範囲だけ分ける。

**完了条件**: 2026年10月分の費用と作業時間が記録され、管理画面で受取額 − 費用と時間あたり受取額が出る。



### [DN-0383] 共通仕様書の地域別ページを 1 桁へ（沖縄県・中国地整・北陸地整・北海道・近畿地整）
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 検索キーワード戦略（`docs/strategy/16_検索キーワード戦略.md`）の技術図書クラスター。2026-08-25〜09-21 の Google で「沖縄県 土木工事共通仕様書」10.7 位（表示 9）、「中国地整 共通仕様書」10.6 位（12）、「共通仕様書 北陸地方整備局」12 位（3）、「北海道開発局 共通仕様書」11 位など、発行元名＋共通仕様書の語が 10〜12 位に並ぶ（`npm run report-search-opportunities`）。

**やること**: 対象 `/standards/okinawa`・`/standards/chugoku/local`・`/standards/hokuriku`・`/standards/hokkaido`・`/standards/kinki` の title・description・H1 に発行元の正式名（「沖縄県」「中国地方整備局」等）と「土木工事共通仕様書」・版（年度）を正確に入れ、冒頭で「どの版のどの章があるか」と原本への導線を答える。地域一覧ページから各ページへの内部リンクを確かめる。新しいページは作らない。

**完了条件**: 反映から 28 日後の集計で、対象の検索語のうち半数以上が 1 桁になるか、対象ページの表示が増えている。

**進捗（2026-10-02）**: 対応は 208270c14（2026-09-27）で反映済み・本番確認済み（例 `北陸地方整備局 土木工事共通仕様書（令和8年3月）・工事必携`）。残りは反映 28 日後（10/25 前後）の集計だけ。注意: 検索語「沖縄県 土木工事共通仕様書」は県の仕様書を探す意図の可能性があり、`/standards/okinawa` は国の沖縄総合事務局の仕様書なので、順位が上がらなければ意図のずれとして扱う。

### [DN-0384] 技術士 CPD のキーワード記事を「CPD 義務化・ガイドライン」の検索語で 1 ページ目へ
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 16_検索キーワード戦略.md の資格名クラスター。`/exam/pe-comprehensive-management/keywords/cpd` が「技術士cpd義務化」22 位（表示 14）、「技術士cpdガイドライン」18.8 位（13）。表示はあるのに 2 ページ目。

**やること**: 義務化の現状（制度の根拠・いつから・何時間）とガイドラインの要点を冒頭で答え、title・description に「義務化」「ガイドライン」を入れる。制度の事実は公式（日本技術士会・文部科学省）で照合してから書く。関連ページ（総監・建設部門の受験ガイド）からの内部リンクを足す。

**完了条件**: 反映から 28 日後の集計で、2 つの検索語がどちらも 10 位以内か、表示が増えている。

**進捗（2026-09-27）**: seoTitle・description に「義務化」「ガイドライン」を入れ、冒頭で「努力義務（技術士法第47条の2）・基準 20／推奨 50 CPD 時間（うち倫理 1 時間）」に答えた（日本技術士会 CPD ガイドライン Ver.1.3 と照合）。総監の試験ガイドと建設部門のキャリアガイドから内部リンクを足した。残りは反映から 28 日後の順位の確認。

### [DN-0385] 1級土木 二次の令和6年度 解答例ページを「解答例 令和6年」の検索語で 1 ページ目へ
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 16_検索キーワード戦略.md の資格名クラスター。`/exam/civil-construction-1/secondary/r06` が「1級土木施工管理技士 2次試験 解答例 令和6年」16.2 位（表示 12）。令和7年度版（r07）は SEO Rank Watch で観察中（11 位）なので、r06 は同じ型の直しを先に当てられる。10/4 の二次検定の直前で需要が高い。

**やること**: title・description・冒頭に「令和6年度」「2次試験（第二次検定）」「解答例」を検索語どおりに入れ、設問ごとの解答例へ目次から飛べるようにする。r07 ページと相互リンクする。r07 の観察を妨げないよう、r07 は触らない。

**完了条件**: 反映から 28 日後の集計で、対象の検索語が 10 位以内か、表示が増えている。

**進捗（2026-09-27）**: title・seoTitle・description・冒頭に「令和6年度 2次試験（第二次検定）解答例」を入れ、r06 → r07 のリンクを足した（r07 → r06 は既存・r07 は触っていない）。目次は既存の問題番号ジャンプで足りる。残りは反映から 28 日後の順位の確認。

### [DN-0386] 資格ハブを「土木公務員 資格」の検索語で 1 桁へ
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 16_検索キーワード戦略.md の土木公務員クラスター。資格ハブ `/exam/pe-comprehensive-management/guide/public-engineer-qualification-map` が「土木公務員 資格」10.8 位（表示 5）、「公務員 土木 資格」11 位、「rccm 受験資格 公務員」15 位。あと少しで 1 ページ目。記事の新設（DN-0365）・遷移の計測（DN-0366）とは別に、既存ハブの手直しで先に上げる。

**やること**: title と冒頭 1〜2 文で「土木公務員に役立つ資格」に直接答え、公務員の実務経験で受験できるか（1級土木・RCCM）を表で示す。運営者の経歴（元・自治体の土木職）を根拠として冒頭近くに置く。

**完了条件**: 反映から 28 日後の集計で「土木公務員 資格」が 10 位以内。

**進捗（2026-09-27）**: ハブの題名・冒頭は既に検索語に直接答えていたため変えず、公務員の実務経験が 1級土木・RCCM の受験資格にどう扱われるかの表（出典: 全国建設研修センター・建設コンサルタンツ協会の手引への案内）を足した。残りは反映から 28 日後の順位の確認。

### [DN-0390] 技術士 建設部門（60%）と RCCM（0%）のインデックス率が低い原因を調べて直す
タグ: [インフラ・計測] [領域:サイト] [時期:2026-10] [種類:不具合] [起票:2026-09-27]

**起点**: 2026-09-23 の URL 検査を資格別に集計すると、1級土木 84.2%・総監 96.7% に対し、技術士 建設部門 59.9%（88/147）・RCCM 0.0%（0/8）。RCCM は 9/18 公開の新ページで、登録前なだけの可能性もある。管理画面 検索 ＞ インデックス で見られる。

**やること**: 建設部門と RCCM の未登録 URL の状態（検出・未クロール／クロール済み・未登録／正規 URL の不一致）を URL 検査の結果で分類し、サイトマップ・内部リンク・正規 URL・内容の重複のどれが原因かを切り分けて直す。新しいページの登録待ちなら、登録リクエストの対象に入っているかを確かめる。

**完了条件**: 次の週次の URL 検査で、建設部門が 80% 以上、RCCM が 1 ページ以上登録されているか、未登録の理由がページごとに説明できる。

**追記（2026-09-27）**: 未登録ページを統合・noindex する基準もこのカードで決める（旧 DN-0320 の ③）。

**追記（2026-09-27・集客点検）**: 対象を建設部門・RCCM に限らず、`data/gsc/indexing-priority.txt` の需要あり未登録 38 件（総監 cost-benefit-analysis・1級 guide/construction-plan・2級 guide/schedule-management など）へ広げる。 2026-09-27 の教材配線先の点検では、教材から配線した 1級 textbook 7 本（steel-structures・water-sewer・coast-port・dam-construction・tunnel-natm・sabo-landslide・railway-underground）・1級 guide 2 本・2級 guide 4 本（exam-overview・concrete-key-points・quality-management・study-method）も未登録で表示 0。2級二次（10/25）前に 2級分を先に見る。

**進捗（2026-09-27）**: 2026-09-23 の URL 検査で未登録 144 件を分類。本番の sitemap.xml 漏れ 0・canonical 誤り 0・被リンク数と本文量は登録済みと差なし。大半は「検出 - 未登録」（未クロール）で、建設部門 50・RCCM 7・1級 20・2級 21。総監 13 件と 1級 2 件は Google が旧 /docs/ URL を正規に選んだまま（301 済み・旧 URL 用 sitemap は 11/30 まで）。本文からの被リンクが 0〜1 件だった 2級一次過去問 10 回分・2級ガイド 5 本・1級ガイド 4 本へ内部リンクを追加した（814de5390）。コードとコンテンツで打てる手は尽きたので、残りは GSC での登録リクエスト（ブラウザ作業・2級二次関連と RCCM を優先）と次の URL 検査での確認。

### [DN-0391] 転職クラスターの手直し（技術士 建設部門 career の冒頭）の効果を 28 日後に確かめる
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-30 に検索語ごとの受け皿を点検し、ずれていた `/exam/pe-construction/guide/career`（技術士の年収に冒頭で答えていなかった）だけを直した（判定表と記録は `docs/strategy/16_検索キーワード戦略.md` の点検記録）。ほかの受け皿は検索意図に合っていた。

**やること**: 2026-10-28 以降に、同じ長さの期間どうしで `/exam/pe-construction/guide/career` の「技術士 年収」「技術士年収」「技術士建設部門年収」の表示と平均順位を比べ、点検記録に追記する。「技術士 総合技術監理部門 年収」（29〜30 位）に受け皿が要るかもあわせて判断する（新規記事は作らない方針）。

**完了条件**: 比較の結果が点検記録にあり、表示が増えたか平均順位が上がったかを判定している。


### [DN-0395] 月次レビューの手順が証拠を残すように、月次レポート（docs/reviews/monthly）を書かせる
タグ: [インフラ・計測] [領域:戦略] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 に管理画面 戦略 ＞ レビュー ＞ 手順の点検（`/metrics/business/procedure?cadence=monthly`）を作ったところ、月次の 7 手順のうち証拠が残るのはレビュー記録（事業の判断）だけで、検索クラスターの推移・販売の突合・資格の正本と市場・目標と配分・時期付け・実験の判定の 6 手順は「記録が残らない」だった。週次は docs/reviews/weekly のレポートの節で実施を確かめられるが、月次にはレポートが無い。DN-0388 のマージ（#665）が前提。

**やること**: 月次スキル（`.claude/skills/management/monthly-review/SKILL.md`）に週次と同じ形の「出力フォーマット」（手順ごとの節）と保存先 `docs/reviews/monthly/YYYY-MM-review.md` を足し、`.claude/config/review-wiring.json` の monthly の procedure を evidence: sections に切り替える（`scripts/lib/review-wiring.mjs` の buildProcedureView が月次レポートを読むように直す）。

**完了条件**: 次の月次レビュー後に手順の点検（月次）で「記録が残らない」が 0 件になり、`npm run check-review-wiring` と `node --test tests/review-wiring.test.mjs` が通る。

**進捗（2026-09-27）**: 実装済み（PR #665: review-wiring.json の report・月次スキルの出力フォーマット・buildProcedureView）。#665 のマージ後、最初の月次レビューのあとに手順の点検（月次）で完了条件を確かめて削除する。

### [DN-0398] 2026-07-19 の note 監査の残り（ライブ CTA 未反映・無料記事の CTA 重複・商品階層・magazines の CTA 監査）を実査して直す
タグ: [コンテンツ品質] [領域:商品] [時期:2026-10] [種類:不具合] [起票:2026-09-27] [期日:2026-10-11]

**起点**: 2026-09-27 に docs/ を棚卸しした際、2026-07-19 の監査（docs/reviews/2026-07-19-civil-note-content-funnel-audit.md。同日削除・原文は `git show 08da26e20:docs/reviews/2026-07-19-civil-note-content-funnel-audit.md`）の P0「著者属性と異なる表現」が 2 か月間 backlog に載らず未対応だった。運営者は元発注者で、添削者・試験採点者ではない（`src/config/author.ts`）。9/27 時点で `git -c core.quotepath=false grep -l -E "添削する側|採点する立場|発注者・添削視点" -- content` が 6 ファイルを返す（1級/2級「施工経験記述で落ちる答案」の H1・H2、2級「工事概要の書き方」本文、2級集客記事クラスター、1級動画パックの台本と絵コンテ）。

**やること**: 監査の置換表どおりに直す（添削する側→元発注者として工事書類を確認してきた立場／採点者視点→読み手に伝わる整合性／採点者が減点する箇所→答案の説得力を下げる箇所／発注者・添削視点→元発注者の視点）。公式の採点基準を確認できない内容は断定しない。公開済みの note は本文更新（`/note-operate`・有料境界は --boundary-h2）とカバーの文言まで反映する。同じ監査の残り（P0 ライブ CTA 未反映＝2級一次択一 PDF の末尾もくじ CTA、P1 無料記事の CTA 重複・商品階層の不明瞭・magazines 配下の CTA 監査空白。P2 カバー文字溢れは DN-0360 へ移した）は `npm run audit-note-funnel -- --exam civil --live` で今の状態を実査し、残っているものだけ同じカードで直すか別カードに分ける。

**完了条件**: 上の grep が 0 ファイルを返し、該当 note の公開ページにも同じ表現が無い（live 照合）。

**進捗（2026-09-27）**: P0「著者属性と異なる表現」は済み。「採点する側／採点する立場／発注者側＝採点する側」を note 4 本（原稿と公開ページ）で直し、公開ページで全文を照合した。「添削」はココナラで添削を販売しているため残す（運営者判断）。残りは同じ監査の他の指摘で、`npm run audit-note-funnel -- --exam civil --live` で今の状態を実査してから直す。


**残り（2026-10-06 時点）**: 原稿はカードの grep 0 件。監査の残り（ライブ CTA 未反映・CTA 重複）は現存しない。(1) 1級/2級「落ちる答案」2本の題名・本文・カバーを note へ反映し（10/11 日曜の Mac note-sync。`check-note-republish` の題名 drift に 2 本とも出ている）、公開ページ（`nfea4a39cf108`・`na5e045a1c6f8`）から表現が消えたことを照合する。**反映前に `--adopt-live` を回すと公開側の旧題名で原稿が戻る**（10/1 の PR #798 で一度戻った）。(2) 1級動画パックの再レンダリング要否を決める。

### [DN-0397] 実ユーザー計測（#666）を本番で立ち上げ、表示速度の「計測→起票→改善」を閉じる
タグ: [インフラ・計測] [領域:サイト] [時期:2026-10] [種類:改善] [起票:2026-09-27] [期日:2026-10-17]

**起点**: 2026-09-27 に PSI の計測サイクルを点検した。毎日の計測と記録は動いていたが、CrUX（実ユーザー値）が 44 件中 0 件で「実害判定不能 → 手を打たない」のまま 1 か月、改善カードが 0 枚だった。ラボのスマホ LCP は同じ URL で日ごとに 2.0〜7.8 秒と振れ、ラボ値だけでは改善の的を決められない。一方 /search の PC の CLS 0.730 は毎日同じ値の実不具合で、#666 で直した（dev 1350px で 0.026）。#666 は実ユーザー計測（web-vitals → GA4 → fetch-ga4-web-vitals → report-web-vitals → 週次で不良を起票）も入れている。#665 の上に積んでいるので DN-0388 の後にマージする。

**やること**: (1) #665 → #666 の順にマージし、/deploy する。(2) `npm run ga4-admin:apply` で GA4 のカスタムディメンション metric_name・metric_rating を作る（GA4 の管理画面にログインした状態で。アカウント設定の変更なので運営者が実行する）。(3) GA4 リアルタイムで web_vitals イベントが届くことを確認する。(4) 次の fetch-metrics（週次）の後に `npm run report-web-vitals` が exit 0 で組を出すことを確認する。(5) /search の desktop CLS が次の PSI バッチで 0.1 未満になったことを確認する。(6) 2 週分溜まったら週次レビューが report-web-vitals の「不良」を起票しているか（手順の点検で）確かめる。

**完了条件**: `npm run report-web-vitals` が exit 0 で、判定できた組が 1 つ以上ある。PSI の /search desktop CLS が 0.1 未満。

### [DN-0414] ココナラの売上履歴（手数料控除後・クローズ日計上）を月別に自動取得し、受取額の記録に入れる
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 に `record-net-receipts`（DN-0367）を作ったとき、ココナラだけ自動取得できなかった。Playwright のココナラのプロファイルはログインが切れていて、ブラウザの画面では売上のページの URL がメニューの奥にあり特定できなかった。手持ちの orders-snapshot / orders.json は販売価格だけで、手数料控除後の額と計上日（クローズ日）を持たない。

**やること**: ココナラの売上管理（売上履歴）のページの URL と DOM を確かめ、月別の手数料控除後の合計を read-only で読む処理を `scripts/lib/net-receipts.mjs` と `record-net-receipts.mjs` に足す（CI の encrypted-state でココナラは取得できる。ローカルはプロファイルの再ログインが要る）。`--coconala` を渡さなくても組み立てられるようにする。

**完了条件**: `npm run record-net-receipts -- --month 2026-09` がココナラの値を自動で取り、手で確かめた額と一致する。
## 🟢 低 — 重要度が低い（時期未定を含む）





### [DN-0603] 公開前の10秒ごとの画面確認（無音プレビュー・コンタクトシート・同じ画面の割合）をスクリプトにして承認前の関門にする
タグ: [領域:SNS] [種類:改善] [起票:2026-10-08]

**起点**: 公開前の画面確認（設計尺の無音プレビュー→10秒ごとに1枚）は video-content-policy §4 の3つのコマンドを手で回す形で、数値（直前と同じ画面の割合など）は 2026-10-08 にその場の Python で出しただけ。人によって見落としが出る。
**やること**:
1. `render-longform` に `--preview`（または `scripts/video-preview-sheet.mjs`）を足し、無音プレビュー・10秒ごとのコンタクトシート・数値（直前と同じ画面の割合・冒頭の表紙の秒数・20秒以上同じ画面が続く箇所）を `.tmp/video-render/{packId}/` に出す（Git に入れない）
2. 判定の閾値（例: 冒頭の表紙は5秒以内、同じ画面は20秒まで）は `config/video-content.json` に置き、checker とプレビューが同じ値を読む
3. approved に上げる前に、この数値と画像を確認したことを状態の記録に残す
**完了条件**: 既存パック1本と図解版で数値が出て、判定ロジックを tests で固定する。


### [DN-0602] 競合動画を Mac で10秒ごとに切り出して画面の切り替え間隔を測り、07c §3 を埋める
タグ: [領域:SNS] [種類:改善] [起票:2026-10-08]

**起点**: 2026-10-08、クラウドの調査環境では競合動画の映像を取れなかった（web 系はロボット確認、android は映像が 403。[07c](../../docs/marketing/07c_YouTube競合動画の画面分析_2026-10.md) §3 の todo）。競合の画面が何秒ごとに変わるかは、サムネと自動の3コマからの推定にとどまる。
**やること**: Mac で 07c §6 の手順（deno と最新の yt-dlp・memory の reference_competitors_civil「競合YouTube動画の映像解析の手順と罠」）で、次の6本を10秒ごとに切り出して目視する。土木マン「経験記述は型で書け」（6HJFfA1dlkc）、日建学院「1級土木実地試験 経験記述の書き方」（hk6FP82vFOA）、ちゃんさと「経験記述NG例」（oWQmFoe-7z0）、雅「1級第2次 コンクリート」（R34hnuS-jHU）、建設資格データ研究所「全189問 約90分で総まとめ」（TM3eoT0TvMY・先頭3分と以降は数分おき）、ひげごろー「2級経験記述」（ct5SznUfGVM）。見るのは、画面の切り替え間隔、人物（講師・キャラクター）と図の出方、冒頭10秒の見せ方。
**著作権**: 切り出した画像は分析後に削除し、07c には要旨だけを書く。
**完了条件**: 07c §3 の todo を消し、自社の旧形式・図解版と同じ物差し（10秒ごとの比較で直前と同じ画面の割合）で競合6本の値を表に入れる。


### [DN-0601] 図解版の試作 koji-gaiyo-sheet-zukai を音声付きで公開し、旧版と28日の再生・視聴維持を比べる
タグ: [領域:SNS] [種類:制作] [検証:check-video-content] [起票:2026-10-08]

**起点**: 図解版の試作パック `content/sns/video-packs/civil-construction-1/koji-gaiyo-sheet-zukai/`（先生の常駐・解答用紙の図・悪い例と良い例、約3分20秒・音声なし）は、10秒ごとの比較で「直前と同じ画面」が旧形式40回中32回→19回中2回（[07c](../../docs/marketing/07c_YouTube競合動画の画面分析_2026-10.md) §3）。再生と視聴維持で効くかはまだ分からない。`config/youtube-formats.json` の `single-topic-zukai`（trial）。
**やること**（2026-10-08 の判断: DN-0597 で視聴維持を取れるようになってから公開する）:
1. 表紙と締めを採用画像にする（cover-design.json・cta-design.json を足す。sns-image-policy §0.1）
2. Mac で `node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-sheet-zukai --speaker 13` で音声付きにし、10秒プレビューで目視
3. video-content-qa（6軸）→ youtube.json（題名・概要欄・UTM `utm_campaign=koji-gaiyo-sheet-zukai`）→ ユーザー承認 → 公開
4. 28日後に旧版 `koji-gaiyo-7items` と、再生・平均視聴率（DN-0597 の YouTube Analytics）を比べる
**完了条件**: 比べた結果を 07 §11 に1段落で残し、`single-topic-zukai` を active か rejected にする。active なら公開済みパックの作り直しの順番を決める。


### [DN-0600] 一問一答（読み上げ）の動画の型を作る（過去問記事から論点の穴埋めと答えのカード）
タグ: [領域:SNS] [種類:制作] [起票:2026-10-08]

**起点**: 建設資格データ研究所が VOICEVOX の読み上げで一問一答を作り、90分・24,735回再生。日建学院の「一問一答」10本は再生中央値51,500回（[07c](../../docs/marketing/07c_YouTube競合動画の画面分析_2026-10.md) §1・§2）。自社は VOICEVOX と過去問の記事を両方持つ。`config/youtube-formats.json` の `quiz-tts`（proposed）。
**やること**（2026-10-08 の判断: 2027年1〜3月に着手する）:
1. サイトの過去問記事から「論点の穴埋め→答え→根拠1行」を作る生成器を作る。過去問の問題文は全文を写さず、論点の一問一答に組み直す（07 §10 の Red Line）
2. render-longform に `kind: 'quiz'`（問題・考える間・答えのカード）を足す。字幕と読み上げを合わせる
3. 20〜90分に束ね、分野ごとのチャプターを付ける。送り先は一次の頻出論点の note・過去問 PDF・模試（DN-0279 と同じ線）
**完了条件**: 1級一次の1分野で20問の試作を作り、10秒プレビューで目視して承認待ちで止める。`quiz-tts` を trial にする。


### [DN-0599] 総まとめ・聞き流し（承認済み動画パックの連結・チャプター付き）の1本目「2級 直前総まとめ」を音声付きにして承認・公開する
タグ: [領域:SNS] [時期:2026-10] [種類:制作] [起票:2026-10-08] [進行中]

**起点**: 競合の土木の動画321本では30〜60分の再生中央値が21,000回、題名に「聞き流し」を含む19本は30,000回（[07c](../../docs/marketing/07c_YouTube競合動画の画面分析_2026-10.md) §1）。2026-10-08 にユーザーが試作に採用した（`config/youtube-formats.json` の `compilation` は trial）。
**済み（2026-10-08）**: 組み立ての仕組み（`compilation.json` → `npm run build-video-compilation` → `render-longform`・`check-video-content` の K01/K02）。1本目のパック `content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen/`（2級の承認済み15パック・15章・設計尺26分）。画面と字幕の無音プレビューを10秒ごとに目視した。
**やること**:
1. VOICEVOX のある環境で `npm run render-longform -- --pack-dir content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen --speaker 13` を回す（この Mac には VOICEVOX が無い。字幕の焼き込みは libass 入りの ffmpeg が要る＝Mac は ffmpeg-full）。元パックの wav は使わない（Drive の wav は 2026-09-05 版で読みの辞書が古く、予約済み動画は 2026-09-09 版）
2. 表紙と締めの採用画像（`cover-design.json`・`cta-design.json`）を作り、`youtube.json`（題名に「聞き流し」「総まとめ」、概要欄のチャプターは render-manifest の実尺から、UTM `utm_campaign=matome-2kyu-chokuzen`）を用意する
3. video-content-qa → ユーザー承認 → 予約。2級の試験（10/25）の前、単体動画の予約が終わる 10/22 の翌日 10/23 を目安にする
4. 公開28日後に再生・視聴維持を単体動画と比べ、`compilation` を active か rejected にする。次の候補は1級二次の経験記述 howto・1級一次の学科 exam-point（2027年の試験前）
**前提**: 公開はユーザー承認後だけ。
**完了条件**: 2級 直前総まとめが承認済みで予約・公開され、28日後の比較を 07 §11 に1段落で残して `compilation` の status を決める。




### [DN-0590] git 呼び出しの maxBuffer 検査が、引数にテンプレート文字列（${…}）を含む呼び出しで maxBuffer を見落として誤って止める
タグ: [領域:管理] [種類:不具合] [起票:2026-10-08]

2026-10-08、scripts/audit-reference-book-coverage.mjs の execFileSync('git', [..., `--since=${since}…`, ...], { encoding, maxBuffer }) が tests/git-exec-maxbuffer.test.mjs で「maxBuffer 未指定」になった（maxBuffer は書いてあった）。呼び出しの切り出しがテンプレートの { } で途切れているとみられる。引数を変数へ出して回避した。やること: findGitCalls をテンプレート文字列と入れ子の括弧に対応させ、回帰テスト（${} を含む引数で maxBuffer ありは通る・無しは止める）を足す


### [DN-0588] 正規表現のエスケープを共通の部品 1 つにまとめ、各スクリプトでの書き写しを増やさない
タグ: [領域:管理] [種類:改善] [起票:2026-10-08]

2026-10-08、path-literals.mjs で置き場のパスを正規表現へ入れるとき「.」だけを逃がし、CodeQL（Incomplete string escaping）に指摘された（PR #927）。scripts/ に同じ escapeRegExp の書き写しが 16 か所あり、逃がす記号が少しずつ違う（datasets.mjs・reference-sources.mjs・disk-hygiene.mjs・playwright-auth.mjs は * や {} を意図して外すグロブ用、ほかは全記号）。案: scripts/lib/regexp-escape.mjs に escapeRegExp（全記号）と globToRegExp を置いて置き換え、tests/read-json-ratchet.test.mjs と同じ形のラチェットで書き写しを増やさない。完了条件: 置き換え後に既存テスト全件が通る・ラチェットの基準線が 0 か理由つきの例外だけ


### [DN-0586] 台帳に参照（資格 id・商品 id・記事 slug）を宣言し、汎用の参照整合検査にする（外部キー相当）
タグ: [領域:管理] [時期:2026-11] [種類:改善] [起票:2026-10-08]

段階3（data-storage-decision.md「台帳を 1 本にして DB のように扱う」）。各データセットの行に refs（JSON の場所 → qualification・product・article）を宣言し、check-datasets が参照先（qualification-registry.json・products.json・content/site の記事）の実在を検査する。既存の個別検査（check-qualification-ssot など）のうち汎用の検査で置き換えられるものを洗い出す。最初の対象は state.book-coverage の expansions[].article。完了条件: 宣言のある全データセットで参照切れ 0・検査した参照の件数を出力・検査ゼロを PASS にしない。前提: 段階2


### [DN-0572] note からココナラへの冒頭導線（DN-0268）の反映後 30 日の閲覧・注文を読み、残すか決める
タグ: [収益化] [領域:商品] [時期:2026-11] [種類:意思決定] [起票:2026-10-07]

**起点**: DN-0268 で、1級・2級土木の有料答案と無料の解説記事の冒頭（最初の見出しの直前・無料部分）に、ココナラの「添削」と「骨子」への 2 段の導線を置いた。2026-10-07 にコンテンツ台帳の導線照合で `coconala-custom` が 345 本すべて ok になり、原稿と公開記事がそろった（最後の 1 本 n1a0cef1de78b は切れたリンクを全文置換で直した）。

**やること**: 反映がそろった 2026-10-07 から 30 日の、ココナラの添削・骨子・診断の閲覧と注文を、反映前の 30 日と並べて読む（`npm run coconala-analytics` が週次で書く `data/coconala/kpi.json`）。note 側の流入元が分かるならそれも見る。欠測は 0 と扱わない。

**完了条件**: 2026-11-06 以降に前後 30 日の閲覧・注文を比べ、導線を残す・文面を変える・外すのどれかを決めて、ココナラ運用文書（coconala-operations.md）の決定ログに 1 行残す。






### [DN-0565] 「公式の設問を含むページ」の判定を、パスの正規表現から分類データへ移す
タグ: [コンテンツ品質] [領域:サイト] [種類:改善] [起票:2026-10-07]

**起点**: lint-ja・lint-mdx-mobile は、公式問題の逐語を表記統一から外すページを、`scripts/lib/official-question-text.mjs` の `OFFICIAL_QUESTION_PAGE`（パスの正規表現）で決めている。分類の正本 `src/config/content-taxonomy.json` の group `secondary` は記述式の解説（`*-basics`）と過去問（`*-past-problems`）の両方を含むので、分類からは引けない。正規表現に無い種類のページは黙って対象外になり、`secondary-*-past-problems` は 2026-10-07（DN-0553・#889）まで設問の転記が commit を止めていた。

**やること**:
1. 分類（`content-taxonomy.json` の flags か、frontmatter の印）に「公式の設問を含む」を持たせる。
2. `official-question-text.mjs` がその印を読むようにする。
3. 置き換え前の正規表現と対象ページの集合が一致することをテストで確かめてから、正規表現を消す。

**完了条件**: `OFFICIAL_QUESTION_PAGE` の正規表現が無くなる。判定対象のページ集合が置き換え前と一致する（テスト）。

### [DN-0559] develop への載せ直し（fetch → reset --keep → cherry-pick → パッチ照合 → push）をスクリプト 1 本にする
タグ: [インフラ・計測] [領域:管理] [種類:改善] [起票:2026-10-07]

**起点**: 並行セッションと CI の自動コミットで develop が数分おきに進む。2026-10-06〜07 の図ループでは、commit のたびに手書きのゲートで載せ直した（約 15 回）。手順を `;` で繋いで、失敗の後も先へ進んだ事故が 3 回ある（memory `reference_partial_clone_repack_hazard`「push を失敗しうる手順に ; で繋がない」）。

**やること**: `scripts/replay-onto-develop.mjs <sha...> [--push]` を作る。
- 処理: commit が在ることを確かめ、`git fetch`・`git reset --keep origin/develop`・`git cherry-pick` を行い、元の範囲と同じパッチかを比べる。`--push` は、同じパッチのときだけ push する。
- 途中で止まった場合: 何が残ったかを出して非 0 で終える。cherry-pick が止まったら `--quit` で抜け、作業ツリーには触れない。
- テスト: 一時リポジトリで「同じパッチ」「衝突」「commit 失敗の後に呼ばれた」の 3 通りを固定する。
- 文書: workflows.md「ブランチ・並行セッション運用」と memory の該当節を、このスクリプトの案内に置き換える。

**完了条件**: テスト 3 通りが通り、workflows.md の手順がスクリプト 1 行になっている。

### [DN-0560] macOS でだけ落ちるコマンド（BSD と GNU の差）を CI の前に止める
タグ: [インフラ・計測] [領域:管理] [種類:改善] [起票:2026-10-07]

**起点**: 2026-10-07、`tests/sync-index-after-commit.test.mjs` の `sed -i "s/…/"` が macOS の BSD sed で落ち、Mac で回す `npm run test` と `quality:audit:ci` の unit-tests が赤くなっていた（#891 で `-i.bak` に直した）。CI は Linux だけなので、Mac でだけ落ちる書き方は CI では見つからない。

**やること**:
1. `tests/`・`scripts/`・`.claude/scripts/`・フックの本文から、BSD と GNU で挙動が違う書き方を見つける静的検査を作る。対象の例: 拡張子なしの `sed -i`、`grep -P`、`date -d`、`readlink -f`、`stat -c`、`xargs -r`。
2. `tests/scripts-no-undef.test.mjs` と同じく npm test に載せる。
3. 今ある該当箇所を直す。

**完了条件**: 検査が対象ファイル数と検出数を出し、検出 0 件。わざと `sed -i "s/a/b/" f` を入れたテストが落ちる。

### [DN-0561] 1級土木 一次 H27・H28 の問題 PDF（原典）を入手し、原典が無くて直せない図 2 枚を切り出し直す
タグ: [コンテンツ品質] [領域:サイト] [種類:改善] [起票:2026-10-07]

**起点**: 図クロップ品質ループで、次の 2 枚が `source-unavailable`（原典なし）のまま残った。
- `primary-h27-a/img/h27-a-fig-02`: 凡例「△：支承」の右側が切れている
- `primary-h28-a/img/h28-a-fig-13`: 製管工法の立坑上部が切れている

vault にある 1級土木の問題 PDF は H30 以降だけ。一次問題解説集2021 も代わりにならず、H27 No.18 の図のページはスキャンから欠け、H28 の図はページの上が切れている。公開元で H27・H28 の PDF が今も配られているかは未確認。

**やること**:
1. 公開元（全国建設研修センター等）で H27・H28 の問題 PDF が手に入るかを確かめる。
2. 手に入るなら、運営者の了解を得てダウンロードし、Drive vault `原資料PDF/過去問/１級土木施工管理技士/` に置き、`/figure-quality-loop` の reextract 段で 2 枚を切り出し直す。
3. 手に入らなければ、記事の注記で欠けを補うか SVG で描き直すかを決める（過去問の図の SVG 化の基準は memory `reference_figure_provenance_system`）。

**完了条件**: 2 枚とも判定台帳で `ok` になっている。入手できない場合は、その判断と代わりの対応が記事に入っている。

### [DN-0524] .claude/config/ の JSON 20 本に zod の型を付ける（/ops/auth の認証設定を含む）
タグ: [インフラ・計測] [領域:管理] [時期:2026-10] [種類:改善] [起票:2026-10-03]

**起点**: 2026-10-03 に config/・data/ の JSON 全データセットへ型を付けた（PR #855）。`.claude/config/` は台帳 `scripts/lib/datasets.mjs` の外なので、認証の許可リスト `playwright-auth-profiles.json`（管理画面 /ops/auth が読む）・CI の書き込み許可 `ci-write-operations.json`・品質ゲートの基準値（`*-baseline.json`）・許可リスト（`*-allow.json`）など 20 本が型なしのまま。壊れるとログインや書き戻しが止まる。

**やること**: 方式を運営者が選んでから着手する。案A＝台帳に `.claude/config/` を 3 つ目の領域として載せ、型を台帳の schema に結ぶ（置き場の規則・パスの直書き検査・管理画面 /ops/store の拡張が要る）。案B＝台帳は変えず、20 本の型と検査だけを足す。型は `scripts/lib/dataset-schema-parts.mjs` の部品で書き、版の欄・strict の方針は `.claude/knowledge/reference/data-storage-decision.md`「型の正本は zod」に従う。

**完了条件**: `.claude/config/` の JSON 20 本すべてが型で検査され、型の無い JSON を CI が止める。`npm run check-datasets`（案A）か追加した検査（案B）が検査したファイル数を出して違反 0。


### [DN-0521] 上下水道ページの note 導線を公開4週間後に配置別CTRで評価する
タグ: [収益化] [領域:商品] [時期:2026-11] [種類:改善] [起票:2026-10-03]

**起点**: 上下水道ページの共通科目教材への導線を公開した2026-10-03から28日が経過し、GA4のデータが確定した時点。

**やること**: `npm run fetch-ga4-cta-clicks -- --by-placement` の公開後28日間データから、上下水道の過去問16ページと科目ガイド1ページについて、article-top / article-mid / article-end / article-sidebar の表示・クリック・表示基準CTRを記録する。期間・対象URL・取得範囲を残し、流入の少なさと取得欠損を区別する。商品の収録範囲の注記を保つ。

**完了条件**: 公開後28日間の配置別表示・クリックと、欠測を除いたCTRを記録し、配置を維持するか調整するか判断した。取得不成立はゼロとして扱わない。


### [DN-0510] 一次試験の検査の説明文が古い・原典取得スクリプトが会社 PC のプロキシで落ちる
タグ: [インフラ・計測] [領域:管理] [時期:2026-10..2026-11] [種類:不具合] [起票:2026-10-02]

**起点**: 2026-10-02。(1) `scripts/quality-audit.mjs` の `pe-first-stage-historical` の note が「H25-H30の480問」のままだが、実際の検査対象は H23〜H30 の建設 3 科目と上下水道 16 回分の 40 ページ・1,190 問。(2) `scripts/fetch-pe-first-stage-historical.mjs` が Node の `fetch` で取得しており、会社 PC のプロキシで `TypeError: fetch failed` になる（規約は `curl --ssl-no-revoke`）。上下水道の原典（16 本＋正答 8 本）は過去問の在庫台帳（`data/pastexams/inventory.json`・固定した原典は files[] の sha256・pages）にも未登録。

**やること**: (1) quality-audit の note を実態に合わせる。(2) 取得を `curl --ssl-no-revoke` に替え、取得失敗と SHA 不一致を区別して件数を出す。(3) 上下水道の原典 24 本の SHA-256・ページ数を在庫台帳の該当ファイル（files[]）に足す（`historicalSources` は専門科目の別部門を `h23-specialty-NN.pdf` の名で取り出す）。

**完了条件**: 会社 PC で `node scripts/fetch-pe-first-stage-historical.mjs` が全件 PASS（上下水道を含む）し、quality-audit の note が検査対象と一致する。





### [DN-0488] stats47 の建設統計・行政財政指標を note 記事のデータ根拠に 1〜2 点埋め込んで試作する
タグ: [収益化] [領域:商品] [種類:改善] [起票:2026-10-01]

**起点**: 月次レビュー（2026-08-01〜2026-08-31）の点検と Issue で、2026-07-21 から開いたままの GitHub Issue #422（cross-pollination）をバックログへ移した（タスクは GitHub Issue でなく backlog で持つ）。元の提案は、stats47 の行政財政・建設・インフラ指標を、技術者の収入実態・発注者視点の note 記事の根拠として流用すること。

**やること**: 該当する note 企画を 1 本選び、stats47 の建設統計・行政財政指標を 1〜2 点埋め込んで試作する。売上・閲覧への効果を見る前提が無いので、時期を付けるかどうかは次の月次のバックログの関門で運営者が決める。

**完了条件**: 試作 1 本を公開した、または関門で削除を決めた。

### [DN-0474] 総監記述式 H21〜H24 の模範論文 12 本を再レビューで 8.0 へ上げ、H21〜H27 の公開を判断する
タグ: [コンテンツ品質] [領域:商品] [種類:改善] [起票:2026-09-30]

**起点**: 2026-09-30 に H21〜H27 の 21 本を作成・3ペルソナレビュー反映まで済ませた（すべて `published: false`・`reviewStatus: needs-review`）。H21〜H24 の 12 本は反映前の総合が 7.0〜7.6 で、反映後の再レビューをしていない。レビュー記録は `.claude/state/pe-essay-review/h2*-essay-*.md`。

**やること**: (1) H21〜H23 の 9 本は 2026-10-01 に再レビューで総合 8.0（自己採点・境界値。reviewStatus は needs-review のまま）。残る H24 の 3 本を `/pe-essay-cycle review` で再レビューし、8.0 未満は指摘を反映して再採点する。照合できていない年次数値はレビュー記録から拾って WebSearch で照合する。(2) 21 本を公開するかを運営者が決める（公開するなら `published: true`・`reviewStatus` を更新し、secondary ページからリンクする）。

**完了条件**: 12 本の再レビュー後の総合がすべて 8.0 以上（届かないものは理由を記録）で、公開するかどうかが決まり、`docs/editorial/01_記述式コンテンツ戦略.md` の年度表が現況と一致している。

### [DN-0472] 技術士として独立する現実のガイドを書く（独立・開業の検索表示が出てから）
タグ: [SNS・マーケ] [領域:サイト] [種類:制作] [起票:2026-09-30]

**起点**: 計画書（docs/strategy/17）の順 5。「独立」「開業」「定年後」系の語は GSC で表示 0（2026-08-28〜09-24）。素材は note 無料記事「総監を取って独立した技術者の収入実態」。

**着手条件**: DN-0468〜DN-0471 の公開後に GSC で独立・開業・定年後の語に表示が出ていること。公開から 2 か月出なければ、このカードを削除する。

**やること**: 開業手続き・受注・収入の見方を、note 記事の書き直しで書く（逐語転載しない）。他者の収入例や成功率は載せない。数値は公表統計で照合する。転職導線と note 導線は置かない。総監ハブと `second-career`・`side-jobs` から相互リンクする。

**完了条件**: 本文 3,000 字以上で公開・`refresh-indexes` 済み・`check-career-separation` が通る。

### [DN-0415] Instagram のストーリーズ投稿（リンクスタンプ付き）を Business Suite で自動化できるか確かめる
タグ: [SNS・マーケ] [領域:SNS] [時期:2026-11] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 に 1級・2級の直前ハイライト（各 5 枚）の自動化を頼まれた。ハイライトへの登録は Instagram のスマホアプリにしか無く（ブラウザ版・Graph API とも不可）、手元の iOS シミュレーターには App Store が無いので自動化できない。一方、ストーリーズの投稿自体は Meta Business Suite（ブラウザ）で作れる可能性があるが、`publish-ig-bs` はカルーセルとリールだけに対応している。今回は画像を生成して運営者の端末へ送り、投稿とハイライト登録は運営者が行った。

**やること**: Business Suite のストーリーズ作成でリンクスタンプ（URL）を付けられるかを確かめ、付けられるなら `publish-ig-bs` にストーリーズの投稿（`content/sns/instagram/highlights/<dir>/img` と note.md の URL）を足す。付けられないなら、その結論を ig-highlight-design-policy.md に書いてカードを閉じる。

**完了条件**: ストーリーズの投稿が `publish-ig-bs` の dry-run で通るか、できない根拠が方針文書に書かれている。


### [DN-0400] 総監対策 iOS アプリ（買い切り ¥1,800）を作るかを決め、作るなら凍結中の仕様 5 本で着手する
タグ: [収益化] [領域:商品] [時期:2027-03] [種類:意思決定] [起票:2026-09-27]

**起点**: 2026-09-27 に docs/ を棚卸しし、凍結中の iOS 仕様 5 本（docs/products/01〜05・約 2,400 行）を文書から外してこのカードで持つことにした（運営者の判断）。過去問演習は 2026-06-04 に PWA 先行へ移している（docs/products/06_PWA過去問アプリ設計方針.md）。原文は `git show 747fab5d9:docs/products/<ファイル名>` で読める。

**決まっていたこと**: 技術士（総合技術監理部門）対策・買い切り ¥1,800 の単軸（Free＝R07 全 40 問＋キーワード概要、Premium＝R01〜R06）。最初のリリース目標は 2027-07 の筆記試験（逆算で着手 ≤ 2027-04-01）。着手条件は「Web 月収 ¥15,000 以上」だった（NSM を月の受取額へ切り替えた 2026-09-27 以降は、受取額と目標の差で読み直す）。

**仕様 5 本（着手するときの作業単位）**:
1. `01_iOSアプリ仕様.md` v3 — 仕様本体（MVP＋Phase 2、成功監視 KPI、試験日カウントダウン・一問一答/4 択の dual モードなど 05 を反映した追加 6 機能）
2. `02_iOS画面設計.md` v2 — 8 画面のワイヤー・画面遷移・Free/Premium の出し分け（永続保証・法改正なしの訴求）
3. `03_iOSデータパイプライン.md` v1 — `out/api/v1/*.json` の JSON schema・差分取得・SwiftData upsert（doboku-note 側 `build-ios-data.mjs`）
4. `04_iOSエコシステム動線.md` v1 — iOS ↔ サイト ↔ note の動線・Apple ガイドライン準拠・クーポン・Universal Link・Phase 別の判断トリガー
5. `05_iOSベンチマーク調査.md` v1 — 資格学習 iOS アプリ 17 本の横断調査（2026-05-19 時点。再調査は MVP リリース 6 か月後）

**決めること**: 作るか（PWA で足りるか）、作るなら着手月。作ると決めたら 5 本を docs/products/ へ戻して現行化し、この カードを実装カードへ分ける。

**判断（2026-09-27・運営者）**: 保留。2027-03 に受取額と目標の差を見て作るか決める（DN-0382「スマホアプリを作るか」はこのカードへ統合）。

**判断（2026-09-29・運営者）**: 総監・技術士・土木施工管理でまず試作する。実装は DN-0453 で進める。


### [DN-0429] 次の年間ロードマップ（2027-10〜）を作る
タグ: [収益化] [領域:戦略] [時期:2027-07..2027-09] [種類:制作] [起票:2026-09-26]

**起点**: 年間ロードマップはバックログの [時期:] と annual-roadmap.json の期間で描く。次の期間へ切り替える。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: annual-roadmap.json の period を次の12か月にし、翌期の重点カードに [時期:] を付けたら、このカードを削除する。

### [DN-0328] 総監 R9 予想・建設部門の直前商品を公開し、2級前期の直前訴求を入れる
タグ: [収益化] [領域:商品] [時期:2027-04..2027-06] [種類:制作] [起票:2026-09-26]

**起点**: 直前期の主力商品を試験前に公開し、2級土木前期の直前訴求を合わせる。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 総監 R9 予想と建設部門の直前商品が note で公開され、2級前期の直前 CTA が配線されたら、このカードを削除する。

### [DN-0329] 1級二次の経験記述商品を今季版へ更新し、診断士の直前訴求を入れる
タグ: [収益化] [領域:商品] [時期:2027-07..2027-09] [種類:改善] [起票:2026-09-26]

**起点**: 1級一次の合格発表後から二次の買い場が開く。経験記述商品を今季の出題に合わせて更新する。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 経験記述商品の今季版が公開され、診断士の直前 CTA が配線されたら、このカードを削除する。

### [DN-0332] 1級土木 一次の解答速報と過去問を追加する
タグ: [コンテンツ品質] [領域:サイト] [時期:2027-07..2027-09] [種類:制作] [起票:2026-09-26]

**起点**: 1級一次の試験直後は検索需要が高い。解答速報と年度別過去問を追加する。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 解答速報と過去問記事が公開され、refresh-indexes まで済んだら、このカードを削除する。

### [DN-0334] 総監・建設部門の直前カウントダウン投稿を用意する
タグ: [SNS・マーケ] [領域:SNS] [時期:2027-04..2027-06] [種類:制作] [起票:2026-09-26]

**起点**: 技術士二次の直前期に X で直前カウントダウンを流す（凍結対策のルールを守る）。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 直前期の投稿が予約され、x-post-qa を通ったら、このカードを削除する。

### [DN-0335] 1級二次・コンクリート診断士の直前投稿を用意する
タグ: [SNS・マーケ] [領域:SNS] [時期:2027-07..2027-09] [種類:制作] [起票:2026-09-26]

**起点**: 1級二次と診断士の直前期に合わせた投稿を用意する。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 直前投稿が予約され、x-post-qa を通ったら、このカードを削除する。

### [DN-0337] 新年度版の教材を参考文献台帳へ取り込む
タグ: [コンテンツ品質] [領域:教材] [時期:2027-07..2027-09] [種類:制作] [起票:2026-09-26]

**起点**: 新年度版の教材が出たら、参考文献台帳への登録と論点の対応づけを行う。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: reference-sources.json と教材の対応表に新年度版が登録されたら、このカードを削除する。

### [DN-0276] 次の実投稿で publish-x.ts が posted_url を書くか確認する
タグ: [SNS・マーケ] [領域:SNS] [種類:改善] [起票:2026-09-23]

**やった**: (2)(3) は実装・実データ検証済み。`scripts/check-x-posted-live.mjs`（+ `scripts/lib/x-posted-live.mjs`・test 5件）が `content/sns/x/{draft,published}/*/status.json` の `status:"posted"` を集め、`posted_url` を持つものだけ `https://publish.twitter.com/oembed?url=...`（ログイン不要）で照合する。既存 8 件（旧「19件」から実減）で実行し、live 8 / gone 0 / 取得失敗 0 を確認した。`posted_url` の無い投稿済み（162件）と本文にサイトリンクが無いもの（121件・意図的な linkless 施策を含むため gate しない）は件数のみ報告する。週次 `link-audit.yml`（金曜）に組み込み済み（PR は本カードのブランチで作成）。
(1) `publish-x.ts` に `findLatestPostedUrl()` を追加し、即時投稿の直後に自分のプロフィールから本文一致で `/status/<ID>` を読み、`status.json` の `posted_url`（既存8件と同じキー名）へ書くようにした。取れなくても投稿は失敗にしない。

**残り**: (1) は次に実際に X へ即時投稿したときにだけ検証できる（ドライランでは compose 画面を閉じる前に return するため、この経路を通らない）。次の投稿後に対象記事の `status.json` に `posted_url` が入っているか確認し、入っていれば削除する。

**完了条件**: 次の実投稿で `status.json` に `posted_url` が記録されたら、このカードを削除する。

### [DN-0271] 総監 設問3国家施策バンクの序章（¥100・有料境界が末尾）の冒頭に「この記事でわかること」を反映する
タグ: [収益化] [領域:商品] [種類:改善] [起票:2026-09-23]

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

### [DN-0426] 年度切替後、年度表現の陳腐化検査を ci:true へ上げて 0 件まで追う
タグ: [コンテンツ品質] [時期:2027-01..2027-03] [領域:サイト] [種類:改善] [起票:2026-09-17] [期日:2027-01-31]

**やった**: `scripts/check-year-staleness.mjs`（+ `scripts/lib/year-staleness.mjs`・test 9件）を新設。当年度は `exam-calendar.json` の `exams[*].year` 最大値、対象は `content/site/**` の frontmatter title/seoTitle/description（本文は過去問・白書の年度引用が桁違いに多くregexでは陳腐化と正しい年度引用を区別できないため対象外）。group（past-exam/primary/secondary）と、ディレクトリ名が特定年度を表す記事（`r05-essay-*`・`primary-r07-a` 等＝その年度自体が主題）は除外。現状 5 件 warn（すべて「令和X年度からY年度まで」型の歴史的レンジ引用で、机上では偽陽性）。`package.json`・commands.md・quality-audit.mjs（`ci:false`・report）に配線済み。

**残り**: 次の年度切替（2027年1月）の直後に quality-audit.mjs の `year-staleness` エントリを `ci:true` へ上げ、週次レビューで一覧を見ながら 2 週間以内に 0 件（または全件を年度スラッグ除外に追加）へ収束させたら `ci:false` へ戻し、このカードを削除する。

### [DN-0234] Codex の archived_sessions 1.25 GB を棚卸しして 30 日超を消す
タグ: [インフラ・計測] [領域:管理] [種類:改善] [起票:2026-09-14]

**起点**: `~/.codex/archived_sessions` 1.34 GB・`sessions` 65 MB・`plugins` 455 MB（Windows 09-14 実測）。`disk-hygiene.json` の `reportOnly` で「30 日超は手で棚卸し」と決めており自動削除しない。`thread_history_1.sqlite` 725 MB も同居。

**やること**: 30 日超のアーカイブを日付で選んで削除し、`npm run check-disk-hygiene` の `history:*` 行で残量を確認する。Codex 本体の設定に保持期間があればそれを使い、無ければ四半期の棚卸しとして `disk-hygiene.md` §5 に手順を 2 行足す。

**完了条件**: `archived_sessions` が 300 MB 未満、手順が doc にあること。


### [DN-0175] SNS残存画像を公開完了後に再監査する
タグ: [インフラ・計測] [領域:管理] [種類:改善] [Codex候補] [起票:2026-09-06]

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


### [DN-0224] 教材の原典待ち17論点を復旧し記事・図解・SNSとの対応を再照合する
タグ: [コンテンツ品質] [領域:教材] [時期:2026-10..2026-12] [種類:改善] [起票:2026-09-14] [検証:check-content-expansion:linked]

**状況（2026-09-30）**: 17 論点のうち「将来展望の書き方」を原本（印字35〜38頁）で照合して復旧した。残り 16 論点は Drive vault（原資料PDF/書籍・教材・その他のパソコン）を再走査しても原本が無く、人の再撮影・入手が要る（必要な書名とページは `.claude/state/content-expansion.json` の各論点 reason と `.claude/plans/DN-0224-source-recovery.md`）。内訳: 1級土木二次問題集2021（印字317〜末尾）4・総監受験万全対策 第1章 1.2〜1.3 2・総監論文対策 第2章（印字24〜34 の遮蔽なし再撮影）4・同 第6章 5・技術士論文の書き方（印字176 全幅）1。未走査は iPhone 写真フォルダ約900枚。

**やること**: 運営者が上記ページを撮影・入手して vault へ置いたら、原本と照合して記事・図解・SNS との対応を再照合する。動画 sanso-kozo・monbun-yomikata は原稿を直したので mp4 を再生成して公開・予約状態と照合する。

**完了条件**: 全対象に原本ページと再照合根拠があり、必要な制作と検査が成立していること。原本自体の欠損は推測で埋めず、入手・再撮影が必要な書名とページを対応表に残す。他教材に同じ主題があることを原典充足の根拠にしない。

### [DN-0209] 総監R8記述式を公式問題と照合し、再現版の注記・図・解答方針を確定する
タグ: [コンテンツ品質] [領域:サイト] [時期:2027-04..2027-06] [種類:不具合] [起票:2026-09-13]

**実体**: [r08-secondary](../../content/site/pe-comprehensive-management/r08-secondary/article.mdx) の冒頭に「公式の問題公表前」「再現に基づく」が残る一方、[日本技術士会の公式一覧](https://www.engineer.or.jp/c_categories/index02022241.html)にはR8記述式が掲載されている（2026-09-13確認）。[公式PDF](https://www.engineer.or.jp/c_topics/011/attached/attach_11991_2.pdf)は3ページ。公式との本文差分は未照合。

**次**: PDF全3ページを目視し、問題文・設問の条件・答案枚数・図a〜rと記事を照合する。差分に応じて独自の解答方針も直し、`source_pdf` と出典を配線してから再現版注記を更新する。図の文章化で関係が落ちていれば公式図を出典付きで補う。

**停止条件**: PDFの取得だけで確定版としない。判読できない箇所は未照合として残す。R8択一式の公式正答照合をやり直すカードではない。

**完了条件**: 全設問・図の照合記録が揃い、問題文と解答方針が整合し、未照合箇所が0になること。対象MDXの構文・リンク・出典検査を通し、公式確認済みの範囲に合う注記へ更新する。

### [DN-0206] 技術士建設部門R8の必須・選択11科目を年度別過去問12記事へ追加する
タグ: [コンテンツ品質] [領域:サイト] [時期:2027-04..2027-06] [種類:制作] [Codex候補] [起票:2026-09-13]

**実体**: `content/site/pe-construction/` はR01〜R07の12区分×7年度＝84記事で、`r08-*` は0件（2026-09-13実査）。[日本技術士会の公式一覧](https://www.engineer.or.jp/c_categories/index02022229.html)にはR8必須科目と選択11科目のPDFが揃っている。既存の [R7必須科目](../../content/site/pe-construction/r07-required/article.mdx) と同じ「問題文＋関連する学習先」の無料記事として整備する。

**次**: 必須I・道路・河川海岸・都市計画を先行し、土質基礎・鋼コン・施工計画・環境・港湾空港・トンネル・鉄道・電力土木を続ける。R7の区分slugを継いだ12記事に公式PDFの全設問・選択指示・答案枚数・図表を収録し、既存の科目別 `*-exam-themes` 12記事もR8までの分析に更新して相互リンクする。原本は `ipej-past-exams#令和8年度` で出典を管理する。

**停止条件**: 公式PDFの省略部分を推測で復元しない。noteのR8予想を実際のR8問題・模範解答として流用しない。有料のフル模範解答制作・商品追加は本カードに含めず、資格別note企画SSOTで扱う。

**完了条件**: 12記事すべてについて公式PDFとの問題番号・小問・図表の被覆を確認し、科目別分析12記事からR8記事へ到達できること。対象MDXの構文・出典・リンク検査と `npm run refresh-indexes` を通す。公開反映は `/deploy` の判断に従う。

### [DN-0185] 共通仕様書データ公開の計測を立ち上げ、加工受託の入口として評価する
タグ: [インフラ・計測] [領域:戦略] [時期:2026-09..2026-10] [収益化] [種類:改善] [起票:2026-09-08]

2026-09-08 に `/standards/data` と `/standards/compare` を本番反映した（DN-0183 は削除）。
公開そのものは実査済み＝4ページ 200・データURL 707 件・`X-Robots-Tag: noindex, follow`・
CORS `*`・canonical・Dataset/DataDownload の構造化データまで確認した。残るのは計測だけ。

1. GSC で `/standards/data` と `/standards/compare` の検出・インデックス状況を記録する
2. GA4 の `standards_data_download` が発火しているか、問い合わせ種別に「データ加工」が入るかを見る
3. 週次・月次レビューで 1・2 を追い、行政からの直接受注は実績が出るまで売上前提にしない

**完了条件**: GSC の索引状況と GA4 のイベント発火を 1 度ずつ記録し、加工受託の入口として
続けるか畳むかを判断したらカードを削除する。公開の実装は完了しているので作り直さない。

### [DN-0349] 技術士 上下水道部門 必須科目I の模範解答集を作る（令和元年度〜＋次年度予想）
タグ: [収益化] [領域:商品] [時期:2027-01..2027-04] [種類:制作] [起票:2026-09-26] [期日:2027-04-30]

**起点**: 上下水道部門の展開（DN-0348 で順番を確定）。建設部門では必須科目I の模範解答集が売上の柱の一つ。上下水道の必須科目I は部門独自の問題で、建設部門の答案は流用できない。買われる時期（5〜7 月）の前に公開する。

**やること**: DN-0348 で決めた体制で、全年度の必須科目I の模範解答と次年度の予想を書く。執筆・採点は建設部門の writer/qa（`pe-secondary-exam-writer`・`pe-secondary-exam-qa`・`pe-secondary-exam-factcheck`）を上下水道に広げて使うか、別に定義するかを決め、エージェント定義と registry を同じ commit で直す。

**完了条件**: note で公開し、note-magazines.ts（id は `pe-water-` 始まり＝product-lineup.json で pe-water-supply:written に分類）と売上記録の salesRules に載せたら、このカードを削除する。

### [DN-0350] 技術士 上下水道部門 選択科目（上水道及び工業用水道・下水道）の模範解答集を作る
タグ: [収益化] [領域:商品] [時期:2027-02..2027-05] [種類:制作] [起票:2026-09-26] [期日:2027-05-31]

**起点**: 上下水道部門の展開（DN-0348）。建設部門では選択科目ごとの模範解答集とまるごとパックが売れている。選択科目は 2 つだけなので、2 冊と必須I を束ねたパックまで作れる。

**やること**: 選択科目II-1・II-2・III の全年度の模範解答と予想を、DN-0349 と同じ体制で書く。必須I と束ねたパックの価格は DN-0348 の決定に従う。

**完了条件**: 公開して note-magazines.ts・product-lineup.json・salesRules に載せたら、このカードを削除する。

### [DN-0351] サイトに技術士 上下水道部門の入口（過去問の傾向・勉強法・もくじ）を作る
タグ: [収益化] [領域:サイト] [時期:2026-12..2027-03] [種類:制作] [起票:2026-09-26]

**起点**: 上下水道部門は資格台帳で active になったが、サイトに入口が無い（トップの資格カード・categories.json・/exam/ 配下）。有料商品の公開（DN-0349・0350）より前に検索での入口と note への導線を用意する。

**やること**: 建設部門の入口（/exam/pe-construction）の構成を参考に、上下水道の出題傾向・勉強法のガイドと note のもくじを作る。categories.json・トップの資格カード・note-funnel.json の配線と、check-home-exam-coverage を通す。

**完了条件**: 本番で入口が表示され（deploy 後 `npm run check-production-ssr`）、note への導線が機能したら、このカードを削除する。

### [DN-0353] 舗装施工管理技術者 応用試験の経験記述 模範答案集を作る（1級・2級）
タグ: [収益化] [領域:商品] [時期:2027-01..2027-04] [種類:制作] [起票:2026-09-26] [期日:2027-04-15]

**起点**: 舗装の展開。2026-09-29 に商品の順番・価格を確定（content/note/舗装/noteコンテンツ計画.md、出題分析は同ディレクトリ 応用試験-出題分析.md）: 1級経験記述マガジン ¥2,980 → 1級選択の頻出論点 ¥1,480 → 2級経験記述 ¥980。一般試験はサイト無料記事で扱う。買われる時期（5〜6 月）の前に公開する。

**やること**: 計画の商品を、civil-keiken-essay-writer／qa の型（重複・捏造・形式の検査）で書く。舗装に広げるならエージェント定義と registry を同じ commit で直す。

**進捗（2026-09-30）**: 公開準備まで完了（noteStatus: draft）。1級マガジン content/note/舗装/magazines/舗装1級-経験記述/（序章無料＋工程・出来形品質・安全、各¥980・セット¥2,480、掲載文・_cover.png あり）、1級選択 content/note/舗装/舗装1級-選択問題-頻出論点/（¥1,480・要確認24件を問題図と公的資料で解消）、2級 content/note/舗装/舗装2級-経験記述/（¥980）。全記事にカバー文言・hashtags（97）済み。公開は運営者の判断で行う（2026-09-30 決定・下書き止め）。手順: 下書き保存で表示確認 `node scripts/note-publish.mjs --article <path>` → 公開 `--commit`（1記事ずつ・ブラウザ同時1本）→ マガジンは /note-magazine-create・/note-magazine-cover・/note-magazine-add（掲載文は各マガジンの note掲載文.txt）→ note-magazines.ts・product-lineup.json salesRules に登録 → npm run verify-note-status。

**完了条件**: note で公開し、note-magazines.ts（id は `pavement-` 始まり＝product-lineup.json で分類）と売上記録の salesRules に載せたら、このカードを削除する。

### [DN-0355] サイトに舗装施工管理技術者と測量士・測量士補の入口（出題傾向・勉強法・もくじ）を作る
タグ: [収益化] [領域:サイト] [時期:2027-01..2027-03] [種類:制作] [起票:2026-09-26]

**起点**: 舗装・測量士・測量士補は資格台帳で active になったが、サイトに入口が無い（トップの資格カード・categories.json・/exam/ 配下）。買われる時期（測量士 3〜5 月・舗装 5〜6 月）より前に検索の入口と note への導線を用意する。

**やること**: 既存資格の入口の構成を参考に、出題傾向・勉強法のガイドと note のもくじを作り、categories.json・トップの資格カード・note-funnel.json を配線して check-home-exam-coverage を通す。

**進捗（2026-09-30）**: PR #738 を develop にマージ済み（カテゴリ surveyor・pavement＋受験ガイド各4本・トップのカードは RCCM と同じ共通背景を暫定使用）。残り: develop→main の deploy（/deploy・運営者判断）と check-production-ssr、note 商品公開後の MagazineCard・magazine-placement・note-funnel・/links 配線、専用のカード写真。択一過去問は DN-0456〜0458。

**完了条件**: 本番で入口が表示され（deploy 後 `npm run check-production-ssr`）、note への導線が機能したら、このカードを削除する。

### [DN-0345] 技術士の「業務内容の詳細」（受験申込書の 720 字）を全部門共通で書ける商品にする（申込期の 2〜4 月に向けて）
タグ: [収益化] [領域:商品] [時期:2026-12..2027-02] [種類:制作] [起票:2026-09-26] [期日:2027-02-28]

**起点**: 2026-09-26 の判断（06_多資格展開戦略.md）。業務内容の詳細は 4 月の受験申込で書き、口頭試験でも問われる。書き方（立場・課題・技術的提案・成果の組み立て）は全部門共通で、今は建設部門の無料記事（`content/note/技術士建設部門/業務経歴票の書き方/`）だけ。買われる時期が 2〜4 月で、夏の山の前の谷を埋める（年間の平準化）。

**やること**: 全部門共通の書き方と、部門ごとに差し替える部分（専門用語・事例）を分けた商品を作る。例文は運営者の経験で信頼性を担保できる部門（建設・上下水道・農業土木など土木に近い部門）に限る。

**完了条件**: 公開して note-magazines.ts・product-lineup.json に載せ、申込開始（exam-calendar.json の applicationOpen）の 4 週前までに告知の枠を決めたら、このカードを削除する。

### [DN-0325] 来年度の試験期に合わせて Q2〜Q3 の重点カードを起票する
タグ: [インフラ・計測] [領域:計画] [時期:2027-01..2027-03] [種類:制作] [起票:2026-09-26]

**起点**: 年間ロードマップは [時期:] 付きのカードだけで描く。来年度の試験期（春〜夏）に向けた重点をカードにしておく。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: Q2〜Q3 の重点が [時期:] 付きのカードとしてバックログにそろったら、このカードを削除する。

### [DN-0326] 総監 R9 予想問題集を執筆する
タグ: [収益化] [領域:商品] [時期:2027-01..2027-03] [種類:制作] [起票:2026-09-26]

**起点**: 総監の note 有料教材は R9（令和9年度）向けに予想問題集へ一本化する方針。直前期に間に合わせる。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: R9 予想問題集の原稿が品質チェック（cem-essay-qa）を通ったら、このカードを削除する。

### [DN-0327] コンクリート診断士の記述対策を執筆する
タグ: [収益化] [領域:商品] [時期:2027-01..2027-03] [種類:制作] [起票:2026-09-26]

**起点**: 診断士は夏の試験に向けて記述対策を仕込む（今年度は商品を出していない）。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 記述対策の原稿が品質チェックを通ったら、このカードを削除する。

### [DN-0336] 教材ページの「要確認」をゼロにする
タグ: [コンテンツ品質] [領域:教材] [時期:2027-01..2027-03] [種類:改善] [起票:2026-09-26]

**起点**: 教材ページ（管理画面 教材）に未確認・原典待ち・確認後の変更が残っている。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: npm run check-content-expansion で要確認が 0 になったら、このカードを削除する。

### [DN-0279] 無料模試とサービス紹介の動画パックを作る（同じ形式の無料版→有料版、申し込み方の実演）
タグ: [SNS・マーケ] [領域:SNS] [時期:2027-04..2027-07] [種類:制作] [起票:2026-09-23]

**起点**: ちゃんさとは (a) 同じ形式の無料模試の動画から note の有料模試へつなぎ、(b) ココナラの申し込み手順と問い合わせ文の例を見せる宣伝専用の動画を出している（[07b_販売動線分析_ちゃんさと_2026-09.md](../../docs/marketing/07b_販売動線分析_ちゃんさと_2026-09.md) §3）。自社の土木84パックには、どちらの型も無い。

**やること**:

1. 1級・2級二次の模試（ココナラ `coconala-{1,2}kyu-moshi-pdf`・note の模試）から問題数を絞った無料版のパックを、級ごとに1本ずつ作る。主CTAは有料の模試。
2. 診断・添削の流れ、納品物の見本、購入前メッセージの書き方（「何で知ったか一言」）を見せるパックを1本作る。主CTAは診断。
3. 新しく作るパックは、冒頭で保有資格（技術士の建設部門・総合技術監理部門、1級土木）を示す。既存パックの再レンダーは DN-0184 の更新経路で扱う。

**時期**: 2級二次（10/25）に間に合わなければ、来季（2027年の一次期→二次期）に回す。

**完了条件**: 3パックが `video-pack.json` を持ち、`video-content-policy.md` の QA を通って公開予約されている。

### [DN-0115] PWA買い切り・メール主／LINE補助の収益導線pilot
タグ: [収益化] [領域:商品] [時期:2027-01..2027-06] [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-08-22]

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
2. 週次`fetch-metrics.yml`で`ga4.quiz-funnel`と`quiz-premium-funnel-latest.{json,md}`を取得し、1級PWA利用者100人以上まで待つ
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

### [DN-0401] 転職アフィリ記事の「検証済みファクトパック」（年収・2024 年問題・担い手・合格率）を年次で照合し直す
タグ: [コンテンツ品質] [領域:アフィリエイト] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 に docs/operations/08_転職アフィリ記事ビルド計画.md を棚卸しした。記事インベントリ（サイト S1〜S27・note N1〜N12）はすべて公開済みで計画としては完了、配置と単価の正本は `.claude/knowledge/reference/affiliate-operations.md` と 09_BuildJob収益最大化スプリント.md に移っている。残る価値は、全キャリア記事が引用する「検証済みファクトパック」（2026-06 に一次照合）の鮮度だけ。原文は `git show 747fab5d9:docs/operations/08_転職アフィリ記事ビルド計画.md`。

**やること**: 厚労省 job tag の土木施工管理技術者の平均年収（年度更新）・建設業の時間外労働上限（2024-04 適用）・建設業就業者数と 55 歳以上比率（国交省・白書）・1 級土木の合格率（全国建設研修センター・R8 を追加）を一次情報で照合し、数値が変わっていれば引用しているキャリア記事（S1〜S27・N1〜N12）を `guide-fact-checker` で直す。記事の書き方の原則（本文 3,000 字以上・キャリア文脈の下部に 1 枚・冒頭に置かない・誇張と年収保証の禁止）は affiliate-operations.md に 1 節で残す。

**完了条件**: ファクトパックの 4 項目に照合日と出典 URL が付き、差分のあった記事が直っている。

### [DN-0403] 総監・建設部門の note 共同マガジンの候補と参加条件を調べる
タグ: [収益化] [領域:商品] [種類:意思決定] [起票:2026-09-27]

**起点**: 2026-09-27 に docs/ に埋もれた未完の作業を洗い出した。docs/strategy/09_販売チャネル競合分析.md のアクション3（共同マガジン・外部リーチの検討着手）が backlog に無かった。sosou_nino のリーチ源の一つが共同マガジン。

**やること**: 非競合・隣接のクリエイターの共同マガジンを探し、候補と参加条件（収録条件・品質・ブランド整合）を一覧にする。販売物の混載や参加の実行はまだしない。

**完了条件**: 候補の一覧と参加するかの判断材料がこのカードに書かれている。

### [DN-0406] 動画パックの入口 /video-content と、台本の Generator・Evaluator エージェント（video-script-writer・video-content-qa）を作る
タグ: [エージェント・SSOT] [領域:SNS] [種類:改善] [起票:2026-09-27]

**起点**: 2026-09-27 に docs/ に埋もれた未完の作業を洗い出した。docs/marketing/06_動画コンテンツ運用設計.md §4 で新設を決めていたが、スキルもエージェントも無く backlog にも無かった。機械検査 `check-video-content` は実装済み。

**やること**: 06 §4 の責務分担どおり、`/create-skill` で `/video-content`（薄いオーケストレーター）と 2 つのエージェントを作り、skills-guide・agents-registry を更新する。

**完了条件**: `npm run check-doc-coupling` が通り、動画パック 1 本をこの入口で作って `npm run check-video-content` が通る。


## 🟣 判断待ち — ユーザーの意思決定が必要

### [DN-0604] YouTube の解答速報（試験当日・直後）をやるか、やるなら対象・形・正答の確かめ方を決める
タグ: [領域:SNS] [種類:意思決定] [起票:2026-10-08]

**起点**: 試験当日・直後の解答速報は、競合で再生が集まる型（ひげごろーの1級二次の解答速報ライブ 24,205回・日建学院も実施）。07a §3 が「10/4・10/25 の直後は YouTube でも解答速報の窓」と指摘したまま、自社では検討していない。`config/youtube-formats.json` の `exam-sokuho`（proposed・判断カード未定）。
**決めること**:
1. やるか。やるなら対象（2級二次 10/25 の直後か、2027年の1級一次・二次から）と形（ライブか、当日夜の録画か）
2. 正答の確かめ方（誤答の公開は信頼を大きく損なう）。公式の正答公表前は「速報・暫定」と明示し、訂正の出し方を決める
3. 当日の制作時間を取れるか（運営者は在職中）
**決めたら**: `config/youtube-formats.json` の `exam-sokuho` の status と decision を更新する。


### [DN-0598] 経営の指標（business-direction）に YouTube の KPI を足すか、何を主 KPI にするかを決める
タグ: [領域:戦略] [種類:意思決定] [起票:2026-10-08]

**起点**: `config/business-direction.json` の metrics に YouTube が無い（Instagram は igReach・igFollowers がある）。週次レビューは GA4 の youtube/video 流入（2026-09-17〜23 は0人）を本文で読むだけで、管理画面 `/metrics/business` にも月次の判断にも出ない。2026-10-08 時点で通常動画70本の再生中央値は4回（`data/youtube/own-videos/2026-10-08.json`）。
**決めること**:
1. 主 KPI を何にするか。06 §9 の方針は「送客（utm_source=youtube のサイト・note 流入、ココナラへの遷移）が主、登録者・広告収益は主にしない」。候補: YouTube 経由のサイト利用者（GA4・utm_source=youtube）・通常動画の再生の増分（own-videos の合計の差分）・登録者（期末）
2. 目標を置くか。置くなら実測の期間・対象・理由を添える（business-direction の rules）
**決めたら**: business-direction.json の metrics に足し、月次・週次のスナップショットを作るスクリプトに取得元を足して `/metrics/business` と `/weekly-review`・`/monthly-review` が読むようにする（欠測を0にしない）。




### [DN-0507] 「解答・解説」の開封計測を見て、過去問の解説を有料側（note・KDP）へ移すかを決める
タグ: [収益化] [領域:商品] [時期:2026-11] [種類:意思決定] [起票:2026-10-02]

**起点**: 2026-10-02 に運営者が「サイトは正答だけにして、解説は note や KDP に導線を貼る」案を提示。検討では、Google からの流入は小さい（一次試験ページ 9 月 表示 251・クリック 14）一方、来た人は過去問ページに平均 5〜10 分滞在し、競合（過去問.com・SUKIYAKI塾）は解説を無料公開、無料演習 1,270 問も解説に依存、戦略の分業（Web＝無料で反復・note＝印刷・KDP＝通読）とも食い違う、として全面移行は保留。判断材料として過去問ページの「解答・解説」開封を `answer_reveal`（PR #826・2026-10-02 本番反映）で計測し始めた。

**判断材料**: 2〜3 週間後の GA4 `answer_reveal`（`--by-label` でページ別・`--by-placement` で問題番号別）、note CTA のクリックと note の売上、KDP 一次試験 4 冊の印税。

**選択肢**: (a) 現状維持（全解説を無料・CTA を強化＝DN-0501）、(b) 一部（新規の部門・古い年度など）だけ解説を有料側へ、(c) 全面移行。KDP Select と無料公開の関係（DN-0135）も合わせて決める。

### [DN-0505] 技術士一次試験の他部門（環境・衛生工学）の専門科目を展開するか決める
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:意思決定] [起票:2026-10-02]

**起点**: 2026-10-02 に運営者から「環境部門・水産部門・衛生工学部門の専門も展開できるか」。原典（公式問題 PDF）は 3 部門とも H23〜R07＋R01 再試験の 16 回分あり、上下水道（PR #820）と同じ手順で各 16 ページ・560 問を作れる。ただし (1) 建設以外の部門の需要は未確認（上下水道は 2026-10-02 公開）、(2) 専門外ほど誤りが残りやすい（上下水道でも各年度 2〜5 問が未確定＝DN-0504）、(3) 1 部門で約 32 回のエージェント作業、(4) 一次試験の note 商品は建設部門向けで売上記録 0 件。

**判断材料**: 2026-11 初めに上下水道 16 ページの流入（GSC の表示・クリック、Bing、GA4 の利用者）を確認する。相性は 環境（総監の社会環境管理・建設の環境分野と重なる）＞ 衛生工学（上下水道と一部重なるが建築設備は遠い）＞ 水産（読者・運営者の専門とも遠い）。

**提案**: 上下水道に流入が出ていれば 環境 → 衛生工学 の順に展開し、水産は対象外。DN-0504 の未確定問の解消を先に済ませる。

### [DN-0425] `/blog/`（時事解説・運営記事）を開くかを決める
タグ: [コンテンツ品質] [領域:サイト] [時期:2027-01] [種類:意思決定] [起票:2026-09-27]

**起点**: 05_情報アーキテクチャ.md は `/blog/` を「将来の時事性・運営性コンテンツだけ」の領域として設計済みだが、ルートは未実装で、時事的な内容（国交省の施策・白書・業界動向・建設 DX・AI 活用）は資格の keyword／guide か civil-practice に入っている。業界動向・建設業AI経営・Claude Code 実践ガイドなど時事性の強い教材は、試験の論点として配線されている。2026-09-27 の集客点検で、試験以外の展開先として挙がった。

**選択肢**: (A) 開かない。時事的な内容はテーマ（DN-0423）の中で扱い、更新の手間を増やさない。(B) 開く。白書・施策の改定や業界の動きを短く解説し、テーマと資格のページへつなぐ。更新が止まると古い記事が残るので、月 2 本などの頻度を先に決める。推奨は (A) を先に行い、DN-0423 の反映後にテーマの表示が伸びたら (B) を検討する。

**完了条件**: A か B かを決め、B なら開設と頻度を個別に起票して、このカードを削除する。

### [DN-0305] 「業務経験 → 資格」カード（EXP-012）の反応を見て、入口記事を増やすか・文言や位置を変えるかを決める
タグ: [コンテンツ品質] [領域:サイト] [時期:2026-11] [種類:意思決定] [起票:2026-09-25] [期日:2026-11-30]

**起点**: EXP-012 は非受験層（業務の悩みで来る実務記事・共通仕様書の読者）を資格ページへ送る実験。判定基準は 13_土木公務員SEO戦略2026-08.md「計測と判定」の表にある（クリック 20 件以上かつクリック率 1.5% 以上で継続・拡張）。

**やること**: (1) 2026-10-23 前後に途中経過として `npm run fetch-ga4-cta-clicks -- --by-label` と `-- --by-placement` の `qualification_bridge_*` を読み、立場別・面別の表示とクリックを EXP-012 の `measurements` に記録する（欠測は 0 と扱わない）。(2) 事後窓の終わり（2026-11-26）の後、`npm run measure-experiments` の自動計測とクリック率で判定する。(3) 継続なら、クリックが多い立場の遷移先を強化し、入口記事（臨時協議・ワンデーレスポンス等）を 1 本ずつ追加する。0.5〜1.5% なら文言か位置（記事末 → 本文中間の区切り）を 1 つだけ変えて再計測する。0.5% 未満か表示 200 件未満なら入口記事の追加を止める。

**完了条件**: 判定と根拠（表示・クリック・立場別内訳の実数）を EXP-012 の `result`・`learnings` に記録し、続ける場合は作業カードを別に起票している。

### [DN-0440] コンクリート主任技士の小論文添削を、直前期（11月）の受注に応えられる状態にする
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:改善] [起票:2026-09-29] [期日:2026-10-31]

**起点**: 2026-09-29 に `coconala-cce-essay-tensaku` を出品した（https://coconala.com/services/4425046）。本試験は 2026-11-29 で、需要は直前に立つ見込み。商品画像は承認済み POP 意匠へ差し替え済みで、主任技士の小論文添削は手作業テンプレートで受注できる。ココナラのプロフィールの「資格・検定」欄には主任技士・診断士がまだ無い（自己紹介文には記載済み）。

**やること**: ココナラの画面でプロフィールの「資格・検定」に コンクリート主任技士・コンクリート診断士 を追加する（人の作業・自動化なし）。

**完了条件**: 公開プロフィールの資格欄にコンクリート主任技士・コンクリート診断士が表示される。

**進捗（2026-09-30）**: (1) 主任技士の紫 POP 画像を運営者が承認。公開ページ（services/4425046）で新画像を目視確認し、承認台帳 SHA `0ad039fb31a33e1fc70f1ef07d01d7cc88003210681e4b6995bb72be82833143` と PNG が一致、`npm run check-coconala-wiring` は exit 0。(3) 受注手順は `content/note/コンクリート主任技士/小論文-添削テンプレ.md` と coconala-operations.md §3 に結線済み（9b964cb5b）。残りはプロフィール資格欄の追加。

### [DN-0265] コンクリート主任技士のココナラ小論文添削を本試験後に継続か休止か判定する
タグ: [収益化] [領域:商品] [時期:2026-12] [種類:意思決定] [起票:2026-09-23] [期日:2026-12-15]

**起点**: 2026-09-23 に `coconala-cce-essay-pdf`（小論文 PDF5冊）と `coconala-cce-takuitsu-pdf`（択一直前パック PDF3冊）、2026-09-29 に `coconala-cce-essay-tensaku`（小論文添削 ¥5,000・骨子オプション +¥3,000）を出品した。2026-09-30 に PDF 単品2件は販売0のまま retired にし、令和形式小論文と択一を収録した完全パック（¥8,000）へ集約した（旧2件の数字は判定に混ぜない）。主任技士の添削の競合は2件（¥5,000 販売0／¥3,000 ★1.0・09-29 実測）で、空白か需要不在かを判別できない（09_販売チャネル競合分析.md §D7 判断5）。土木の添削は試験9日前に初めて売れたため、主任技士も需要は直前（11月）に立つ仮説。note の主任技士 小論文37本の冒頭と末尾に添削への導線を入れた（bea060922）。

**やること**: 本試験（2026-11-29）の後に、小論文添削（指導オプションを含む）の閲覧・お気に入り・注文を `npm run coconala-analytics` の kpi.json で確認する。添削は受注の流入元（購入者が「何で知ったか」に書いた内容）と、note 導線が公開ページに出た日付を照らし合わせ、note→ココナラ導線の効果を判定する。注文があれば来年度も継続し、閲覧はあるが注文0なら本文と価格を見直し、閲覧もほぼ0なら `pauseReason:'retired'` で休止する。

**効果判定の起点**: 2026-10-05。9/29 に旧版37本へ入れた導線は、10/01・10/03 の作り直しで記事ごと消えていた。DN-0528 で立場別40本の冒頭（無料部分）と無料の出題傾向分析に添削（services/4425046）への導線を戻し、2026-10-05 に公開 API で41本すべての無料部分に導線のカードがあることを確かめた。10/05 より前の閲覧・注文とは混ぜずに比べる。

**完了条件**: 判断と根拠（閲覧・注文の実数。欠測は0と扱わない）を ココナラ展開キット.md §2 の決定ログに記録する。


### [DN-0427] 合格発表後に候補資格の昇格・見送りを決める（建築の有料化・舗装・技術士の他部門ほか）
タグ: [収益化] [領域:戦略] [時期:2027-01..2027-03] [種類:意思決定] [起票:2026-09-26]

**起点**: 2026-09-26 に施工管理系は判断済み（土木二次を先に立て直す・建築は無料記事で需要を測る・電気/管/造園/建設機械は見送り。06_多資格展開戦略.md の判断の記録）。残る候補は、建築（有料で 1 商品の実験をするか）・技術士の他部門（上下水道は 2026-09-26 に展開を決定済み＝DN-0348〜0351。舗装・測量士も同日に決定済み＝DN-0352〜0355。他の部門は部門別の模範解答では広げない）・公務員・測量ほか。材料は管理画面 戦略 ＞ 資格と市場 ＞ 展開の判断（`npm run qualification-market`）で、市場スキャンが 90 日を超えていたら先に `npm run scan-qualification-market -- --coconala` で取り直す。建築は DN-0342 の無料記事の検索表示とクリックも見る。

**完了条件**: qualification-registry.json の portfolio を更新し、判断と理由を 06_多資格展開戦略.md の判断の記録へ書いたら、このカードを削除する。

### [DN-0343] 土木二次の売上が市場の大きさに比べて小さい原因を切り分け、来季の打ち手を決める
タグ: [収益化] [領域:商品] [時期:2026-11..2027-01] [種類:意思決定] [起票:2026-09-26]

**起点**: 土木二次（1級・2級）は自分で答案を組み立てる区分の受験者が施工管理系で最大なのに、資格別の売上は技術士建設部門の半分以下（`npm run qualification-market`）。競合は YouTube・note・ココナラとも多い。ココナラの棚と模試は DN-0264 が扱う。

**やること**: 商品ごとの閲覧→購入、サイトからの送客、競合との価格と品揃え（09_販売チャネル競合分析.md）を並べ、売れない原因が集客・商品・価格のどこにあるかを切り分ける。

**完了条件**: 原因と来季（2027年6月〜）の打ち手を 06_多資格展開戦略.md の判断の記録に書き、実行する打ち手を別カードに起票したら、このカードを削除する。

### [DN-0330] 掲載先（サイト／note）別の A8 成果で案件と配置を見直す
タグ: [収益化] [領域:アフィリエイト] [時期:2027-01..2027-03] [種類:意思決定] [起票:2026-09-26]

**起点**: 2026-09-26 に note を A8 の副サイト（006）として分け、成果を掲載先別に取れるようになった。数か月分がたまった時点で見直す。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 掲載先別の成果を見て案件・配置の継続／変更を決め、affiliate-operations.md に記録したら、このカードを削除する。

### [DN-0428] 総監・建設部門の直前期（試験前）の価格と品揃えを確定する
タグ: [収益化] [領域:戦略] [時期:2027-04..2027-06] [種類:意思決定] [起票:2026-09-26]

**起点**: 総監・建設部門は技術士二次の直前期が年間売上の山になる。価格と品揃えを直前期の前に決めておく。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: note-magazines.ts の価格と商品ラインナップの品揃えが確定し、月次レビューに記録したら、このカードを削除する。

### [DN-0331] 年間の EPC で継続する転職案件を決める
タグ: [収益化] [領域:アフィリエイト] [時期:2027-07..2027-09] [種類:意思決定] [起票:2026-09-26]

**起点**: 転職アフィリは確定 3 件未満では案件の勝敗を決めない。1 年分の EPC で継続案件を決める。（2026-09-26 に年間ロードマップの重点をバックログへ一本化したときに起票）

**完了条件**: 継続・停止の案件を決め、affiliate-catalog.json と配置を更新したら、このカードを削除する。

### [DN-0348] 技術士 上下水道部門の商品設計を決める（出題テーマ・競合・書ける範囲）
タグ: [収益化] [領域:商品] [時期:2026-10..2026-11] [種類:意思決定] [起票:2026-09-26]

**起点**: 2026-09-26 にユーザーが上下水道部門の展開を決め、資格台帳を active にした（06_多資格展開戦略.md の判断の記録）。受験者は技術士の部門で建設に次ぐ規模、YouTube・note・ココナラの強い売り手はほぼいない（`npm run qualification-market`）。筆記は建設部門と同じ 7 月で、買われる時期は 5〜7 月。選択科目は「上水道及び工業用水道」「下水道」の 2 つ（exam-formats.json）。

**やること**: (1) 日本技術士会の過去問（令和元年度〜）から必須科目I・選択科目II/III の出題テーマを並べる。(2) note・ココナラの上下水道の売り手と価格を見る（市場スキャンの上位と追跡リストへの追加）。(3) 運営者の経験で信頼性を担保できる論点と、専門事実の外部照合の体制（`pe-secondary-exam-factcheck` を上下水道に使えるか）を決める。(4) 建設部門のラインナップ（必須I 模範解答集・選択科目の模範解答集・まるごとパック・R 予想）のうち何をどの順で作るかと価格を決める。

**完了条件**: 商品の順番・価格・執筆と照合の体制を決めて、DN-0349〜0351 の範囲を確定させたら、このカードを削除する。
### [DN-0393] 国・都道府県の技術図書の整理を共通仕様書の次へ広げるかを決める
タグ: [コンテンツ品質] [領域:サイト] [種類:意思決定] [起票:2026-09-27]

**起点**: 検索キーワード戦略の技術図書クラスターは `/standards/` 公開後 1 か月で表示 236 まで伸びた。運営者は 2026-09-27 に「国や都道府県の技術図書を分かりやすく見やすく整理する」方向を示した。戦略では、共通仕様書で 1 桁が取れてから広げる順番にしている（DN-0383 が最初の一歩）。

**決めること**: DN-0383 の反映から 28 日後の集計を見て、共通仕様書の次に整理する図書（施工管理基準・設計要領・積算基準・歩掛など）と対象の発行元（地整・都道府県）を決めるか、共通仕様書の深掘りを続けるか。

**判断の期限**: DN-0383 の反映から 28 日後の月次レビュー。
