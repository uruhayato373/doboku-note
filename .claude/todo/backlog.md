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

## 🔴 高 — 来月中に着手

### [DN-0174] ライブ添付が欠けている note 記事 95 本へ PDF を再添付する
タグ: [収益化] [種類:不具合] [検証:check-note-attachments] [起票:2026-09-05] [期日:2026-09-12]

2026-09-05 の `node scripts/check-note-attachments.mjs --live`（575 本実査・取得失敗 0）で、本文が PDF 配布を約束しているのにライブに添付が無い記事が 95 本（1級土木/magazines 38本／magazines/総監模範論文-ゼネコン 6本／magazines/総監模範論文-河川コンサル 6本／magazines/総監模範論文-自治体上水道担当 4本／magazines/総監模範論文-自治体下水道担当 4本／magazines/総監模範論文-自治体公園緑地担当 4本／magazines/総監模範論文-自治体契約調達担当 4本／magazines/総監模範論文-自治体技術基準担当 4本／magazines/総監模範論文-自治体河川担当 4本／magazines/総監模範論文-自治体港湾担当 4本／magazines/総監模範論文-自治体砂防担当 4本／magazines/総監模範論文-自治体道路担当 4本／magazines/総監模範論文-自治体都市計画担当 4本／magazines/総監模範論文-都市計画コンサル 4本／magazines/総監模範論文-道路橋梁コンサル 1本）。当日のバナー差し替え 87 本とは無関係（台帳突合で 0 件一致）で、以前から欠けていたものが実査で表面化した。実体 PDF はローカル／Drive vault にある。手順: `node scripts/note-attach-batch.mjs --commit --limit 90`（note の 1 日 100 ファイル上限に合わせて 2 日に分ける）→ 翌日 `check-note-attachments --live` で 0 件を確認。台帳は .claude/state/note-attachments-missing.json。

### [DN-0173] 著者オーソリティ新バナーの残り 141 本をライブ差し替えする
タグ: [収益化] [種類:改善] [検証:check-note-republish] [起票:2026-09-05] [期日:2026-09-08]

2026-09-05 に正方形バナー＋本文 2 段落へ 93 本（無料 26・会員 8・有料 59）を `note-swap-author-banner` で差し替えた（差し替え済みは全件ハッシュ同期・drift 0）。残り 141 本＝**有料 89**（うち 28 本は frontmatter に `noteStatus` が無く当日のリスト生成から漏れたが API では published＝2テーマ組合せ大全ほか。n9d9a77c66392 は空 p 掃除後の DOM 順序検証で 2 回失敗＝手動で editor を見る）・無料 1（1級経験記述で落ちる答案）・**コンクリート 51**（無料 3 を含む）。対象リストは noteStatus でなく `npm run check-note-republish -- --json` の driftFiles ∩ バナー入り記事から作る。画像アップロードが note の 1 日 100 ファイル上限に数えられるか未確認のため `--daily-limit 90` で日を分ける。手順: `node scripts/note-swap-author-banner.mjs --list <paths> --commit --max-consecutive-fail 3`（30 本ずつ・全文置換はしない）→ 各バッチ後 `node scripts/check-note-structure.mjs --ci` と `node scripts/check-note-attachments.mjs --live`。完了条件＝バナー入り 247 本の本文 drift が 0。
### [DN-0169] アセット置き場移行の仕上げ（R2 側の撤去とグループ切替）
タグ: [インフラ・計測] [種類:改善] [検証:check-drive-vault] [起票:2026-09-05]

2026-09-05 に置き場ルールを「誰が使うか」へ改め、人 tier の 11 group を Google Drive vault へ同期した（drive-manifest.json）。
残りは **R2 側の削除を伴う後半**で、大量削除は人が実行する。順序は必須（asset-storage-policy.md §4・/asset-route）:

0. **教材 PDF だけ未同期**（`textbook-source-pdf` 415 本 4.1GB）。同期中に Mac の空きが 17→3.6GB まで落ちた
   （Drive が同期済み 6GB をアップロード前にローカルへ滞留）ので止めた。Drive のアップロードが終わり空きが 8GB 以上
   戻ったら `npm run drive-vault-sync -- --group textbook-source-pdf --from-r2 --dedupe-by-sha --commit`
   （既存の手動配置 63 本は sha256 で adopt）。あるいは 6 の standards ローカルコピー 3.4GB を先に消してから
1. `rclone config` で Google Drive バックエンドのリモート `doboku-gdrive` を作る（ブラウザ OAuth・1 回）
2. group ごとに `npm run drive-vault-sync -- --group <id> --verify --deep --cloud`（クラウド md5 まで一致）
3. `node scripts/delete-r2-objects.mjs --bucket private --from-manifest-group <id> --commit`（ig-rendered-image は `--bucket public` も）
4. `node scripts/asset-offload.mjs --forget-group <id> --commit`
5. asset-storage.json から group を削除・drive-vault.json 側を `status: active`・`tests/asset-storage.test.mjs` のサンプル差し替え・`check-asset-reentry.mjs` の `COEXIST_WITH_GIT` を空に
6. standards-page-image はローカル `content/sources/standards/**/{pages,text}`（3.4GB）を削除、textbook 系は `content/sources/textbook/**` の残存実体を確認
7. legacy-r2-orphan: 記事画像 2,573 件（`archive/legacy-r2/content/**`）は参照 0 を再確認して削除、SNS 素材 1,146 件は Drive 同期後に削除。group を削除
8. policy §9 の在庫表を実測で更新。合格条件: `check-drive-vault` の pending 0・`rclone ls doboku-r2:doboku-note-archive` が git-history 1 ＋ note/covers 下書きだけ
9. `scripts/audit-repository-assets.mjs` の分類ラベル（教材を R2_PRIVATE と表示）を Drive tier へ追随させる
| ## 🟡 中 | 2〜3ヶ月以内 |





### [DN-0167] 技術士第一次試験 Xキャンペーン095を週次予約する
タグ: [SNS・マーケ] [種類:制作] [起票:2026-09-05] [期日:2026-09-30]

`content/sns/x/draft/095-pe-first-stage-2026-10/` の31投稿とカード画像、`.claude/config/x-campaigns/2026-10-pe-first-stage.json` は完成している。2026-09-05の実査では `npm run x-schedule-guard -- --max-per-day 2` が、既存9月枠の1日3本を理由にBLOCKしたため未投入。既存予約を解除したり上限を迂回したりしない。

2026-09-30の既存投稿終了後に `npm run x-sync-status` で実体を更新し、`npm run x-schedule-guard -- --queue --max-per-day 2` が緑になった場合だけ、`publish-x` の予約モードを `--dry-run` で確認する。その後は一度に全件を積まず、10月分を最大1週間ずつ予約し、各バッチ後に `npm run x-sync-status` で queued 実在を確認する。凍結・ロック・認証要求が1回でも出たら停止する。

**完了条件**: 31投稿が `queued` または `posted` としてX実キュー／公開面に一致し、同時刻衝突・近似重複・1日上限超過が0件になったらカードを削除する。


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
| 17 | コンクリート診断士 98問＋記述式8本の技術内容レビュー | 2026-09-05実査で一次演習8記事は13+14+13+12+12+13+10+11=98問、記述式マガジン`mf2a132408b6f`は8記事、サイト`guide-essay`も存在。公開後の人手レビュー完了を示す実体はない | 一次演習98問、note記述式8本、`content/site/concrete-diagnostician/guide-essay`を有資格者が技術レビューし、誤りを修正・再デプロイする。原典照合できない数値を推測で補わない |
| 18 | GA4 UIバックアップとbing流入の外部照合 | Data API・週次`metrics-analyzer`・note referral集計・商品別期間効率は稼働済み。GA4 UI CSVは3ユニットとも未成立。最新14日のbingは2,683 usersだが日本比率99.4%・engagement 71.3%で自動bot署名は`flagged:false` | ログイン済みGA4 UIで正式レポート名を確定しfixtureを更新する。Bing Webmasterとdevice・landing・新規/再訪を突合し、件数比だけでbot除外しない。API主経路は継続する |

**完了条件**: 各行の実体が解消したら行ごと消し、全行が消えたらカードを削除する。

## 🟡 中 — 2〜3ヶ月以内

### [DN-0170] reels の wav/mp4（sns-archived-media）を人 tier へ統合する
タグ: [SNS・マーケ] [種類:改善] [起票:2026-09-05]

`upload-sns-r2` 系統は public R2 `sns/` に reels の wav/mp4 を置くが、読むのは人だけ（audience=human の例外として asset-storage.json に残している）。
`post-youtube-scheduled.yml` が読む `sns/youtube-shorts/` は退避台帳の外（監視漏れ）。CI が読む分だけ R2 に残し、残りを Drive `制作物/` へ寄せて `sns-archive-policy.md` と `sns-archive-auditor` を統合する。

### [DN-0168] コンクリート単品¥980の値上げ可否を試験後に判定する
タグ: [収益化] [種類:改善] [起票:2026-09-04] [期日:2026-12-12]

2026-09-04 に最上位アンカー `cce-marugoto-pack`（¥9,800）を新設した（既存SKUは据え置き）。残る論点は小論文/記述の単品 45 本（主任技士 37・診断士 8）が一律 ¥980 で、同じ記述式の土木 経験記述 ¥1,680〜1,980 より低いこと。字数単価では ¥183/千字で自社上位帯のため「安すぎる」とは断定できず、実売も 0 件のため値上げの効果は未検証。**アンカー新設の効果（¥9,800 の実売・¥5,980 の動き）を 11-29 試験〜12月上旬で観測してから**、¥1,480 への改定可否を判定する。

実行時の罠: 対象 48 本が `paidBoundary` を持つため `note-article-price-sweep` は既定 ABORT（exit 9）。`--allow-boundary-risk` の後に `note-update-body --commit` で境界を再設定し `npm run check-note-structure` で FULL_LOCK=0 を実査するまでが 1 セット（2026-07-24 に civil 58 本で無料プレビューを消した形）。




### [DN-0120] 9月中旬のA8成果を取り込み、転職アフィリ継続を再判定する
タグ: [収益化] [種類:改善] [起票:2026-08-24] [期日:2026-09-16]

2026-08は現状維持で観測を継続した。実績が確定する9月中旬に`npm run a8-ui:fetch`（ローカルログイン＋CAPTCHA要）で取り込み、(1)継続 / (2)露出を絞る / (3)撤退して自社商品導線へ、を再判定する。比較には`.claude/state/metrics/affiliate/a8-results.json`と配置別クリックを使い、確定成果・EPC・面別母数を同じ期間で揃える。


### [DN-0142] reference-materials 再公開5記事のGSC効果を計測する
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-26] [期日:2026-09-09]

旧DN-0074の残作業③。2026-08-26に精度向上のうえ再公開した5記事
（reference-materials-hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02）
について、再公開14日後（2026-09-09以降）にGSCでインデックス状況とimpressions/clicksのdeltaを計測し、
再実験化（EXP系起票）するかを判断する。EXP-002はcancelled（2026-06-27）なので新規起票になる。





### [DN-0110] 土木通常動画84本の公開・pilot派生・6週間判定
タグ: [SNS・マーケ] [種類:改善] [Codex候補] [検証:quality:audit:ci] [起票:2026-08-21]

**戦略SSOT**: [06_動画コンテンツ運用設計.md](../../docs/marketing/06_動画コンテンツ運用設計.md)

**作業契約**: [video-content-policy.md](../knowledge/reference/video-content-policy.md)

2026-09-05のユーザー決定で、QA済みの1級土木66本・2級土木18本は試験日前の通常動画公開を先行する。1級1本は公開済み、残り83本は`video-content-status.json`の`publishAt`を真実源にAPI予約する。残作業は次の順で行う。

1. 1級残り65本を2026-09-08〜10-03、2級18本を10-05〜10-22にAPI予約し、全件の`videoId`・`publishAt`・CTAを実査する
2. pilot 4本からShorts 2本・IG 1組・X 1スレッドを派生する
3. 薄い`/video-content` skillと`video-script-writer`（Generator）／`video-content-qa`（Evaluator）を追加する
4. 公開6週間後にShorts→関連動画、視聴維持、YouTube UTM、note/ココナラ遷移から継続・修正・停止を判定する

**制約**: `approved` はユーザーだけが設定する。mp4/wavをGitへ入れない。今回の先行対象はQA済み土木84本だけで、他資格の公開、ThreadsのX単純クロスポスト、未監査記事の一括動画化は行わない。IGの既存リール素材はpilot成立後に判断する。

**完了条件**: 土木84本の通常動画とpilot関連Shortsを外部実体で照合し、4packの派生が一意にjoinされ、全機械・意味ゲートとadmin型検査/E2EがPASSする。6週間後の継続/修正/停止判断とbaselineを記録したらカードを削除する。




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

### [DN-0108] Windows・Mac共通のPlaywright認証永続化基盤
タグ: [インフラ・計測] [種類:改善] [Codex候補] [起票:2026-08-21]

Playwrightのログインprofileはサービス別に永続化されているが、note/Brain/ココナラ/KDPはrepository配下の`.local`、X/Instagram/A8の一部はMacユーザー名の絶対パス、Googleだけは独自`DOBOKU_PROFILE_ROOT`と保存先規則が分裂している。worktreeやWindows/Macを切り替えると別profileを作り、再ログインや誤アカウント操作の原因になる。一方、Cookie/profileのPC間同期はOS暗号化・漏洩・破損リスクがあるため採用しない。

**実装指示書**: [DN-0108-cross-device-playwright-auth/00-master.md](../plans/DN-0108-cross-device-playwright-auth/00-master.md)

**確定方針**: コード・service registry・account assertだけをGit共有し、認証profile/stateはWindowsとMacで独立保持する。`DOBOKU_AUTH_ROOT`＋OS標準ローカル領域へ統一し、password/2FA/CookieはGit・env・GitHub Secretsへ保存しない。GitHub ActionsはAPI/MCP経路を維持する。

**ハーネス判断**: `.agents/skills/dev/playwright-auth/SKILL.md`をuser-invocableかつ`disable-model-invocation: true`で新設し、`auth:paths/doctor/login/status/migrate`を安全な順番で呼ぶ薄いオーケストレーターにする。skill内へ認証ロジックを複製せず、`skills-registry.md`へ登録する。意味評価や生成がなく決定的scriptで判定できるため、専用agentは作らない。サービス固有操作は既存operator/collectorの責務を維持する。

**機械チェック**: ①CI/ローカル共通=`check-playwright-auth-wiring:strict`でMac/Windows絶対パス、repo相対profile、resolver未使用、secret key候補を0にする、②PCローカルoffline=`auth:paths/doctor`でroot・権限・lock・legacy・profile競合を診断、③PCローカルonline read-only=`auth:status`で`authenticated/expired/blocked/unknown/unsupported`を実ページ＋account assertから判定する。profile存在だけをauthenticatedにしない。CIには実profile・login・statusを持ち込まない。

**残作業**: Windows実機で、Macと同じcommit候補を使い独立した`auth:paths`→`auth:doctor`→noteのlogin/status→Chrome再起動後status→worktree非依存を検証する。Macは2026-09-05に旧note profileをOS標準rootへコピー（旧source保持）し、別プロセス`auth:status`で`authenticated`＋account assert一致までPASS済み。両PCの証拠が揃ったら恒久SSOTを最終確認し、本カードとplanを削除する。

**禁止**: profile/Cookie/storageStateのPC間・クラウド・Git同期、password/2FA自動入力、CAPTCHA回避、旧profileの自動削除、target上書き、profile並行利用時の自動kill、profile存在だけでauthenticated判定、account/site/property assert弱化、Gmail Playwright化、投稿・公開・申請・購入・push・deploy。

**完了条件**: runtimeのMac絶対パスとrepo相対profile直書きが0、全対象が共通resolver利用、Windows/Mac双方でnoteのlogin→close→別プロセスstatusとworktree非依存がPASSする。専用スキルが薄いCLIオーケストレーターとして登録され、専用agentが増えていない。A8 profile-plus-state、afb same-process、Gmail非対応を維持し、`check-playwright-auth-wiring:strict`・auth CLIテスト・affiliate/Google配線・lint/type-check/doc refsがPASS。profile/state/Cookie/password/token/2FAのGit差分は0。

### [DN-0026] 土木公務員 SEO 第1期の効果測定（handoff 2026-08-17 抽出）
タグ: [SNS・マーケ] [種類:改善] [期日:2026-09-14]

2026-08-17 に資格ハブ改稿＋1級土木の新設ページを公開・デプロイ済み。測定が残っている:

1. 資格ハブ（`pe-comprehensive-management-public-engineer-qualification-map`）と新設ページ（`civil-construction-1-public-servant-merit`）を GSC で URL 検査し、インデックス状況を記録する
2. **目安 2026-09-14 以降**、公開後 28 日と直前 28 日を比較する。判定の正規表現と基準は [13_土木公務員SEO戦略2026-08.md](../../docs/strategy/13_土木公務員SEO戦略2026-08.md)
3. 次記事「土木公務員に技術士は必要？」の着手可否は 1・2 の結果を見てから判断する（語順違いの類似ページは作らない）

## 🟢 低 — 時期未定


### [DN-0171] note カバー PNG の public 複製 820 件を整理する
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-05]

`note-cover-png` は byVisibility で公開済みを public R2 `note/covers/` に置くが、サイトも note も読んでいない（2026-09-05 実査・`src/` `tools/` に参照 0）。
CI（note-cover-supply.yml）が書く資産なので R2 のままでよいが、public 複製は不要。group を `private` 一本にし 820 件を撤去する。

### [DN-0172] drive-manifest.json を lean 化する
タグ: [インフラ・計測] [種類:改善] [起票:2026-09-05]

11,898 件で 6.3MiB（JSON 上限 4MiB を allowlist で例外扱い）。非 adopted の `vaultPath` は group から導出できるので、R2 側 manifest.json と同じ読み時補完（lean format）で 3 割減らせる。全 group 移行後に。
| ## 🟣 判断待ち | **やるかどうかの意思決定が未了**（着手できないのではなく、着手すべきか決まっていない） |

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



### [DN-0155] git履歴の次回切り詰め（.git実体1.0GBの回収）
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-29]

`.git` の `size-pack` は1.05GiB。通常のcommitでは過去blobを回収できないため、全worktreeと
長時間プロセスを停止し、`asset-storage-policy.md` §8の履歴切り詰め手順を単独で実行する。
`seo-meta` は追跡スナップショットを1件に固定済みで、明示的な`--snapshot`以外は
`seo-meta-latest.json`を上書きする。履歴切り詰め後に`git count-objects -vH`とfresh clone容量を記録し、
主要ブランチ・タグ・Cloudflareデプロイ・R2復元経路を確認してからカードを削除する。
















## 🟣 判断待ち — ユーザーの意思決定が必要
