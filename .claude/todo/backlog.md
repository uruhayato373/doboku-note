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

### [DN-0260] RCCM 問題III Kindle版 h-01 をKDPで出版し、LIVE実体を台帳へ反映する
タグ: [収益化] [種類:制作] [起票:2026-09-20] [期日:2026-09-27]

**起点**: Kindle の公開状態は `scripts/kindle-published/catalog.json` を真実源とする。同台帳で未公開の完成書籍を週次計画へ配線するよう、2026-09-20にユーザーが指示した。RCCM受験者が問題IIIの公開6テーマをAmazonでも通読できる商品で、資格合格・論文作成を支えるためHARMはA。note版の販売実体はあるがKindle需要は未検証なので、公開後の販売・KENPと運営時間を確認する。

**やること**: `h-01` のEPUB・表紙・入力メモとKDP下書きを照合し、価格・KDP Select OFF・AI申告・アクセシビリティ・カテゴリーがSSOTと一致する具体的な出版画面まで準備する。レビュー可能な状態でユーザーの最終承認を得た後、`node scripts/kdp-publish.mjs --id h-01 --publish-only --commit-publish` を実行する。提出後は `node scripts/kdp-publish.mjs --sync-status` で審査状態を追い、LIVE化したらASIN・公開日・状態をcatalogとKindle戦略へ反映する。価格不一致、Select ON、別タイトル、CAPTCHA/2FAでは出版せず停止する。

**完了条件**: catalogの`h-01`がASIN付きLIVEとなり、Amazon商品ページのタイトル一致を実査できること。公開後の販売・KENPは次回の既存KDPレポートで未計測のまま0扱いせず確認する。

### [DN-0255] index coverage の中間計測（index-coverage.yml を手動 dispatch）と #485 の判定
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-19] [期日:2026-09-24]

**起点**: #485（index coverage 41.8%・3 週目）の主因は URL 移行後の再クロール待ちで、打ち手（#517 の sitemap 縮小 133 件・登録リクエスト 10 件・#518 の IndexNow）は 2026-09-19 に本番反映済み。効果は月次（10/1）まで見えないので、計画どおり 9/24 頃に中間計測を入れる（URL Inspection quota 1,516/2,000）。

**やること**: `gh workflow run index-coverage.yml --ref main` → 完走後に `node .claude/scripts/check-coverage-thresholds.mjs` の結果と `gsc-management.md` 09-17 エントリの復帰条件（/exam の索引率 70%）を照合し、同エントリへ観測を 1 行追記する。閾値が緑なら #485 は --resolve で自動クローズ、赤なら 10/1 の本判定まで待つ理由を Issue に 1 行。

**完了条件**: 中間計測の run が success で、gsc-management.md に 09-24 の観測行がある。

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

**やること**: 各公開日の後に `node scripts/note-magazine-add-articles.mjs --target mbe07bd5cecda --notes <key> --commit`。W8 `n8acfea17f953`（9/19）／W9 `ne3cf6dac882f`（9/22）／W10 `n1911131aa726`（9/24）／W11 `n64f9653dc30c`（9/28）。学科09/10・添削01 は単独記事なので収録不要。

**完了条件**: 特典マガジンの収録が 7→11 件（API 実体確認）・`npm run check-membership-drip` 緑。
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
| 10 | ココナラ C12 プレミアム週枠の再判断（旧DN-0007） | C12（教材18冊＋添削2テーマ・¥15,000）は`weeklyCapacity: 1`で開始。添削は本番顧客への納品実績が無く（S2レビュー0）、初回工数が読めないための暫定値 | 初受注時に`orders-log`の`tensakuMinutes`を実測記録。2〜3件出たら週枠を再判断（判断基準→[ココナラ展開キット.md §5](../../content/note/1級・2級土木/ココナラ展開キット.md)）。実受注が無いと1手も進まない |
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

**やること**: `e2e/a11y.spec.ts` と同じ代表 8 テンプレ（home / 資格ハブ / KW 記事 / 過去問 / テキスト / 基準章 / ツール / 検索）× desktop・mobile × light/dark の約 32 枚を `toHaveScreenshot` で固定。アニメーション無効化・GA 等の外部要素をマスク・`maxDiffPixelRatio` は 0.01 から。基準画像は CI（ubuntu・同一フォント）で生成して commit し、ローカルは `--update-snapshots` を使わない運用を docs/operations/12 に書く。

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

### [DN-0120] 9月中旬のA8成果を取り込み、転職アフィリ継続を再判定する
タグ: [収益化] [種類:改善] [起票:2026-08-24] [期日:2026-09-30]

2026-08は現状維持で観測を継続した。実績が確定する9月中旬に`npm run a8-ui:fetch`（ローカルログイン＋CAPTCHA要）で取り込み、(1)継続 / (2)露出を絞る / (3)撤退して自社商品導線へ、を再判定する。比較には`.claude/state/metrics/affiliate/a8-results.json`と配置別クリックを使い、確定成果・EPC・面別母数を同じ期間で揃える。

**取得はもう手作業ではない**: 2026-09-21 から `login-collectors.yml` の a8 cron（毎週火 06:20 JST・暗号化 state）が hosted CI で `a8-ui:fetch` → `normalize` を回す。`a8-results.json` は 2026-05〜2026-08 を保持（最終取得 2026-09-21T15:17Z・`check-a8-report-due` は OK）。旧記載の端末制約（会社 PC のプロキシが `management.af8.jp` を拒否・Mac 必須）は取得経路が変わったため解消。**残作業は判定のみ**＝ (1)継続 / (2)露出を絞る / (3)撤退して自社商品導線へ。EPC の分母は GA4 by-label クリック。


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

### [DN-0257] X Article パイロット: Article 3・1・4 の公開時刻を Codex アプリ側で確定し、告知 Tweet 4 の枠を決める
タグ: [SNS・マーケ] [種類:不具合] [検証:check-x-queue-health] [起票:2026-09-19] [期日:2026-09-28]

**起点**: Codex の 1 回限りローカル自動化は Mac スリープ中に発火せず、起床時（05:30 前後）に遅延実行されて `x-article:publish` の公開窓（15 分前〜120 分後）を外し exit 1 で停止していた（`~/.codex/automations/x-article-*/memory.md`）。Article 2 は 2026-09-20 08:54 に手動復旧で公開済み（https://x.com/doboku373/status/2101459864715510124・台帳へ書き戻し・Tweet 4 は `tweets.md` に解放済み）。同日、`automation.toml` の rrule を直接編集して Article 3 を 09:20 へ寄せたが、Mac 稼働中・アプリ起動中でも 09:37 まで発火せず＝**アプリは toml 直接編集を読まない**。台帳と toml は元の夕方枠（09-20 19:35 / 09-22 20:20 / 09-27 20:15）へ戻してある。

**やること**: (1) 夕方枠のまま出すなら、各予定の 15 分前〜2 時間後は Mac を起こしておく（09-20 19:35 が最初）。早朝へ移すなら **ChatGPT アプリの Automations 画面で時刻を変え、同時に `article-drafts.json` / `status.json` の `scheduled_at` を合わせる**（片方だけ変えると時刻窓で必ず止まる）。(2) 各回の翌朝に `x-article-N/memory.md` と `article_url` を確認し、逸失したら手動復旧 `DOBOKU_PW_MIN_FREE_MB=1024 npm run x-article:publish -- --article N --publish --force`（Claude Code の auto mode は拒否するので人が起動）。(3) Tweet 4 の枠: 元の 09-17 08:00 は逸失し 9 月は全日 3 本で埋まっている。09-22 07:54 の `091#25`（linkless・X キュー投入済）を差し替える案＝X 側の予約を削除 → `status.json` で `replaced` → `x-schedule-guard --max-per-day 3` → `publish-x 094 --tweet 4 <日時> --dry-run` → 予約。見送るなら Tweet 4 を `cancelled` にして台帳を閉じる。

**完了条件**: `npm run check-x-queue-health` の issues が空で、4 本の `article_url` が埋まっている（Tweet 4 を見送る場合は台帳が `cancelled` で issues が空）。

