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

### [DN-0183] 共通仕様書データ公開・比較基盤を別PCで仕上げてデプロイする
タグ: [UI・UX] [インフラ・計測] [収益化] [種類:改善] [Codex候補] [進行中] [起票:2026-09-07]

2026-09-07 の作業はこのカードと同じ `develop` の引き継ぎコミットにまとめる。各整備局の共通仕様書を「閲覧HTML（検索対象）＋Markdown/JSON-LD（`X-Robots-Tag: noindex` の再利用データ）」として公開し、地域差比較と加工受託の実績提示までつなぐ。原機関を加工データの publisher と誤表示せず、原本の発行者と doboku-note の加工主体を分離する。

**実装済み**:

- `/standards/data` と `/standards/compare`、文書・章ごとの Markdown/JSON-LD ダウンロード導線
- `content/site/standards-articles/comparison.json` と生成スクリプト。構造化済み8文書を比較し、近畿基準で同一5局、差分2局（12章・54差分塊）を抽出
- 8文書・344章・14,432条・707ファイルの公開データ生成と検査。生成物 `public/standards-data/` はGit対象外で、build時に再生成する
- 出典・原本SHA-256・掲載ページ・章SHA-256・利用条件・加工主体をエクスポートへ付与
- 共通仕様書ページの上部整理、パンくず・右サイドバー・フォント・カード意匠をサイト全体へ統一
- データダウンロード計測、問い合わせ種別、情報設計・収益化戦略、Windows対応のbuild/UI検査を更新

**確認済み**: `npm run check-standard-articles` は120検査PASS、`npm run check-standards-data` は8文書/344章/14,432条PASS、`node scripts/lint-ui.mjs --all` は156ファイルPASS、`npm run type-check` と `npm run build` はPASS、`npm run check-seo-meta` はHIGH 0（既存 `/search` の本文薄さだけMEDIUM 1）。アプリ内ブラウザの安全制限で localhost の自動再読込だけ未成立。

**別PCでの再開順**:

1. `develop` を同期し、`npm ci` → `npm run dev`。`/standards`、`/standards/data`、`/standards/compare`、`/standards/kinki/common/chapters/1-1` をPC/スマホ幅・ライト/ダークで目視する
2. 原本PDF行・章ナビ行が章ページ上部へ戻っていないこと、パンくずが「第1編 共通編」であること、右サイドバーの本文フォントと余白を確認する
3. `npm run build-standards-data` → `npm run check-standard-articles` → `node scripts/lint-ui.mjs --all` → `npm run type-check` → `npm run build` → `npm run check-seo-meta` を再実行する
4. 差分をレビューし、今回無関係な自動生成時刻だけの変更を含めずcommitする。`public/standards-data/`はcommitしない
5. ユーザー承認後に `/deploy` で本番反映し、本番の4ページ・データURL・ヘッダーを確認する
6. GSCで新規2ページの検出・インデックス状況を記録し、GA4の `standards_data_download` と問い合わせ件数を週次/月次レビューで追う。行政からの直接受注は実績が出るまで売上前提にしない

**完了条件**: 本番でHTML・Markdown・JSON-LD・比較ページが取得でき、正規URL/構造化データ/レスポンスヘッダー/モバイルUIが正常、GSCとGA4の計測開始を確認したらカードを削除する。

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



### [DN-0168] コンクリート単品¥980の値上げ可否を試験後に判定する
タグ: [収益化] [種類:改善] [起票:2026-09-04] [期日:2026-12-12]

2026-09-04 に最上位アンカー `cce-marugoto-pack`（¥9,800）を新設した（既存SKUは据え置き）。残る論点は小論文/記述の単品 45 本（主任技士 37・診断士 8）が一律 ¥980 で、同じ記述式の土木 経験記述 ¥1,680〜1,980 より低いこと。字数単価では ¥183/千字で自社上位帯のため「安すぎる」とは断定できず、実売も 0 件のため値上げの効果は未検証。**アンカー新設の効果（¥9,800 の実売・¥5,980 の動き）を 11-29 試験〜12月上旬で観測してから**、¥1,480 への改定可否を判定する。

実行時の罠: 対象 48 本が `paidBoundary` を持つため `note-article-price-sweep` は既定 ABORT（exit 9）。`--allow-boundary-risk` の後に `note-update-body --commit` で境界を再設定し `npm run check-note-structure` で FULL_LOCK=0 を実査するまでが 1 セット（2026-07-24 に civil 58 本で無料プレビューを消した形）。


### [DN-0120] 9月中旬のA8成果を取り込み、転職アフィリ継続を再判定する
タグ: [収益化] [種類:改善] [起票:2026-08-24] [期日:2026-09-16]

2026-08は現状維持で観測を継続した。実績が確定する9月中旬に`npm run a8-ui:fetch`（ローカルログイン＋CAPTCHA要）で取り込み、(1)継続 / (2)露出を絞る / (3)撤退して自社商品導線へ、を再判定する。比較には`.claude/state/metrics/affiliate/a8-results.json`と配置別クリックを使い、確定成果・EPC・面別母数を同じ期間で揃える。

**実行端末**: 会社PCでは不可。プロキシが `management.af8.jp` への CONNECT を拒否する（2026-09-07 実測。`www.a8.net` は 200 で通るがトンネルは張れない）。Mac か別回線で実行する。EPC の分母（GA4 by-label クリック）と `check-a8-report-due`（2026-09-07 時点で DUE）は手元で足りている。


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
タグ: [SNS・マーケ] [種類:改善] [期日:2026-09-14]

2026-08-17 に資格ハブ改稿＋1級土木の新設ページを公開・デプロイ済み。測定が残っている:

1. 資格ハブ（`pe-comprehensive-management-public-engineer-qualification-map`）と新設ページ（`civil-construction-1-public-servant-merit`）を GSC で URL 検査し、インデックス状況を記録する
2. **目安 2026-09-14 以降**、公開後 28 日と直前 28 日を比較する。判定の正規表現と基準は [13_土木公務員SEO戦略2026-08.md](../../docs/strategy/13_土木公務員SEO戦略2026-08.md)
3. 次記事「土木公務員に技術士は必要？」の着手可否は 1・2 の結果を見てから判断する（語順違いの類似ページは作らない）

## 🟢 低 — 時期未定


### [DN-0180] Drive共通仕様書文字起こし350本とstandards-libraryの関係を整理する
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-09-06]

Drive `文字起こし/共通仕様書/` 約350本は `source-transcript` のrepo対応外で、公開側の
`content/site/standards-library/` と別経路になっている。重複・入力元・更新方向を実査し、公開章記事の
provenanceに必要なもの、監査用にだけ残すもの、台帳対象外でよいものを分類する。削除は別承認とし、
まず `standards-catalog` ID、原本sha256、版面ページまでの対応表を作る。

### [DN-0181] 逐語一致ゲートの40文字窓幅を実測で校正する
タグ: [エージェント・SSOT] [種類:改善] [Codex候補] [起票:2026-09-06]

`check-reference-sources --deep` の `commercial-book` 逐語検査は40文字を初期値にした。短い定型句の
誤検知と、句読点・空白・表記差を挟んだ転載の見逃しを、実記事と合成fixtureで測る。しきい値変更は
検出率・誤検知率・代表例を示してから判断し、今回確定した `verbatim: forbidden` 自体は変えない。


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


### [DN-0155] git履歴の次回切り詰め（.git実体1.0GBの回収）
タグ: [インフラ・計測] [種類:改善] [起票:2026-08-29]

`.git` の `size-pack` は1.05GiB。通常のcommitでは過去blobを回収できないため、全worktreeと
長時間プロセスを停止し、`asset-storage-policy.md` §8の履歴切り詰め手順を単独で実行する。
`seo-meta` は追跡スナップショットを1件に固定済みで、明示的な`--snapshot`以外は
`seo-meta-latest.json`を上書きする。履歴切り詰め後に`git count-objects -vH`とfresh clone容量を記録し、
主要ブランチ・タグ・Cloudflareデプロイ・R2復元経路を確認してからカードを削除する。


## 🟣 判断待ち — ユーザーの意思決定が必要
