# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。
> **完了したタスクはセクションごと削除する**（記録は git 履歴が持つ。完了サマリ・経緯 prose を本ファイルに書かない）。

## 凡例

| 見出し | 意味 |
|---|---|
| ## 🔴 高 | 来月中に着手したい |
| ## 🟡 中 | 2〜3ヶ月以内 |
| ## 🟢 低 | 時期未定 |
| ## 🟣 判断待ち | ユーザーの意思決定が必要 |

各タスクは `### タスク名` の直下に `タグ:` 行を置く（運営管理画面 TODO タブが機械読取り）:
`タグ: [コンテンツ品質] [Codex候補]` — 第1タグ=カテゴリ（コンテンツ品質 / UI・UX / 収益化 / エージェント・SSOT / SNS・マーケ / インフラ・計測）、`[Codex候補]`（バルク処理向き）は任意。

---

## 🔴 高 — 来月中に着手

### 1級土木 二次10/4 直前スプリント（死守コア3つ）
タグ: [収益化]

令和8年度 1級二次 **2026-10-04**（約13週）が経験記述商品の買い場ピーク。W28（7月中旬）以降に始動。真実源・設計は [docs/note/1級・2級土木/noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) §5.4／§3.3／§1.2。

**死守コア（時間が足りなければこれだけ）**:
1. **完全攻略パック 収録拡充** — SKU `civil-1-keiken-complete-pack` は published:true＋noteUrl 済（起動完了）。残は完成答案 draft の追録充実のみ。
2. **会員ローンチ** — 律速はユーザー作業（→ 🟣「土木メンバーシップ ローンチ実機」参照）。
3. **最小リスト捕獲** — LINE公式（ノーコード）＋一次→二次ブリッジ磁石「一次おつかれ→二次の始め方」。器=ユーザー／中身（磁石PDF・配信台本・友だち追加CTA）=当方。

**捨てる**: 1級向け一次PDF／重い学科予想の作り込み／2級深掘り。`[Codex候補]`=パック残公開の機械配線。

### 読み方ガイド 横展開（建設部門＋土木）
タグ: [収益化]

総監の3点セット（完全パック＋R8予想＋読み方ガイド）が sales-log で売上TOP3独占を実証。検証の結果「科目非依存の読み方ガイドのみが横断で成立」（2026-06-23。建設部門は選択科目制ゆえ横断R8予想・横断完全パックは構造的にニーズなし＝作らない）。

**残作業**: ①建設部門 読み方ガイド組成（論文対策キーワード6テーマ＋論文の書き方）②土木 読み方ガイド組成（既存ガイド再包装）。note 公開は手動（成果物は content＋note-magazines.ts published:false まで）。

### AdSense 再申請（有用性の低いコンテンツ対策の仕上げ）
タグ: [収益化]

主因＝非インデックス265本(25%)・本丸=薄いCEMキーワード（2026-07-04 診断・[[project_adsense_low_value_2026_07]]）。薄層CEMキーワード112本の全リライト＋deploy は完了済み。

**残（外部承認依存・ユーザー作業）**:
1. GSC で sitemap 再送信＋強化した主要URL 10〜20本を手動インデックス登録リクエスト
2. 非インデックス率の観察 1〜2週間（`url-inspection` 再取得）
3. **前回却下から2〜4週間空けて再申請**。チェックリスト `docs/project/_archive/03_civil-adsense-resubmission.md:147-191`

### フロントエンド土台リファクタ（残増分）
タグ: [UI・UX] [Codex候補]

page/category の合成ロジック共通化（2026-06-25 アセスメント起点）。増分1（マガジンカード統合）・増分2（ArticleFooter/ArticleSidebar 抽出・580→376行）・増分4の純粋抽出フェーズ（category 1065→230行）は PR #273 で完了。

**残**: ①増分5＝badge 等の inline `style` → Tailwind semantic class の横断 sweep ②増分3（ArticleFooter config駆動化）・増分4残（`sortDocs` 35+ if-else の strategy factory 化）は**新資格追加が実際に発生したら**着手（indirection 増に対し効果が限界的なため保留）。

**実装ファイル**: `src/app/docs/[...slug]/page.tsx`・`src/app/category/[slug]/page.tsx`・`src/components/category/`

---

### 広い表のモバイル横スクロール対応（過去問データ表が切れる）
タグ: [UI・UX]

**問題（2026-07-14 実機確認済み）**: 過去問の多列データ表（ふるい分け9列・圧縮試験5列等）がモバイル（375px）で**画面外に切り捨てられ、横スクロールもできず到達不能**。例: concrete-chief `primary-materials` の平成28問3ふるい表は「40mm」列しか見えず、25/20/15/10/5/2.5/1.2mm のデータが消える＝過去問がモバイルで解けない。根因は `article` の `overflow-hidden` ＋ prose table にスクロールラッパーが無いこと（データではなく描画の問題）。

**方針（結論）**: **横スクロールラッパー案が正解、SVG/画像化は却下**。
- SVG/画像化: 9列を375pxに収める制約は同じで解決にならず、テキスト選択・SEO索引・読み上げを失う。メモリ `figure-provenance-system`「過去問データのSVG化=誤答」に反する。「全選択肢解説」の検索流入を殺すので不可。
- 横スクロール（推奨）: 実機検証で全列にスワイプ到達を確認（`overflow-x:auto` の div で table を包むだけ）。データ・アクセシビリティ・SEO 不変、全広表を一括救済、内容改変ゼロ。弱点=気づきにくさ→スクロールバー常時/端フェード/「→横スクロール」ヒントで補う。
- 転置（縦長化）: 表による上位互換（ふるい表なら 呼び寸法×砕石A/B の3列×9行でスクロール不要）。ただし表ごと手作業＋出題の見た目が変わる。余力あれば主要広表のみ格上げ。

**実装**: `src/app/docs/[...slug]/page.tsx` の MDX `table` マッピングを `<div class="table-scroll"><table>…</table></div>` に、`src/styles/globals.css` に `.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}` ＋任意でスワイプヒント/`min-width`。

**注意**: prose 描画全体に触る UI 変更。`page.tsx`/`globals.css` を触るため、UI/デザインシステム編集の並行セッションと衝突しないタイミングで。入れば今回の「過去問データ表 1-3/1-4 免除」の前提（スクロールで見られる）が裏付けられる。

---

## 🟡 中 — 2〜3ヶ月以内

### civil-1 一次過去問 公式キー deferred 24件（要 pre-H30 原典）
タグ: [コンテンツ品質]

公式正答肢照合は16本0不一致で完了済み。残 = `h28-a`(19件)・`h29-a`(1件=No.38)・`h29-b`(4件=No.3/12/17/21)。**LLM推測厳禁**・キー番号だけの書き換え禁止（設問極性・本文化けと絡む）。

- **h28-a は mass-fix 前に official 配列自体を第2ソース（kakomonn 等）で OCR 再検証**（19件と突出＝OCR誤りの疑い）
- pre-H30 原典PDFの入手: touhokugiken.com / dobokujira.com（h29 学科A/Bは両者に無し→kakomonn等別ソース要）
- 手順SSOT: `docs/reference/exam-content-policy.md` Part 2「過去問の原典照合」＋監査ツール `.claude/state/quality/civil-1-primary-tools/`（diff-keys/check-marks/check-contradict）

### 過去問 解説品質の残指摘クラスタ（数値上合格・要照合）
タグ: [コンテンツ品質]

品質採点は failed 0 だが、個別指摘として記録済みの要照合項目（official key／原典照合が要る・LLM推測禁止）:

- civil-1 `secondary-construction-plan-past-problems` No.9(1): 解答欄記述が省略
- civil-2 `secondary-r06` 問8: 画像 `{/* TODO */}` 未挿入で本文欠落
- 総監 `h21-primary` Ⅱ-1-31（自己矛盾）・`h22-primary` Ⅱ-1-22（下書き跡）・`h28-primary` I-1-9/25/28・`h30-primary` I-1-24
- pe-first-stage `r03-construction` Ⅲ-2/Ⅲ-18（正答矛盾）・`r04-basic` Ⅰ-2-4（ハミング距離解説破綻）

### モバイル可読性リライト 第1弾
タグ: [コンテンツ品質]

機械ラチェット基盤は整備済み（`content-rules.json`＋`lint-mdx-mobile --all`＋週次 `check-content-quality`）。baseline に grandfather された既存違反を GA4 人気度順にリライトして漸減させる。

- **優先上位**: `civil-construction-1-guide-strategy`（3-1×29・#1人気）／`pe-comprehensive-management-keyword-2026`（3-1×48）／`civil-construction-1-secondary-experience-writing-guide`（1-4×48）／`civil-construction-2-secondary-r0X`／`pe-construction/*-exam-themes` 残11本
- **手順**: レポート上位を group 対応の `/quality-cycle` へ。表→非表・入れ子→フラット・長段落→改段。1バッチ 10-20 記事、完了ごとに `npm run update-content-quality-baseline`
- **注意**: civil textbook の規格表・配合表は override 除外済み。過去問の年度×選択肢表は無理に崩さない

### 過去問図 rescan-need-source 9図（要外部/別原典）
タグ: [コンテンツ品質]

進捗の生きたビュー＝管理画面ギャラリー（`npm run admin`→記事図版タブ→「対応」フィルタ）で残数を見る運用。真実源 `docs/reference/figure-provenance.md`、手順 `/figure-recrop`。

残 = h29-b-fig-02（要H29第2次B原典）／h27-a-fig-01（要H27原典）／pe-construction 4（fig22/27/04/05＝要白書PDF等）／concrete-chief 3（steel-carbon-h29・bingham-flow-h30・bingham-shear-r04＝要該当年度原典）。台帳に理由記録済。

### civil-1 secondary 合格後の残存 follow-up
タグ: [コンテンツ品質]

8本全合格済みだが scores.json の qualitative_comment に記録した改善余地: earthwork 表2.9 の散文詰込13セル解体（最優先）・入れ子リスト群のフラット化・factual table のインライン出典・qm-basics/past-problems の民間ソース不在。

### トップページ下部3セクションの統合デザイン
タグ: [UI・UX]

note 教材（LinksHubTile）・アフィリ（SchoolAffiliate）・参考書籍（非表示中）が後付けで積み重なりデザイン不整合（`src/app/page.tsx` L142-172）。**1つの「教材・リソース」セクション**に統合し、デザイントークン・見出し階層を他セクションと揃える。デザイン反復は develop/:3020 でユーザー確認後 push。

### 性能: CI PSI 再計測（mobile 追加）
タグ: [UI・UX]

①`pe-comprehensive-management-exam-index` desktop Perf 56・TBT 2521ms の再現確認（Mermaid 出現0の軽構成＝計測スパイク疑い。再現なら client JS を profiling）②**モバイル PSI が未計測**→CI 供給で計測開始（外部Google API＝ローカル不可）③CLS 超過2ページ＝AdSense 枠の width/height 明示。実装: `.claude/config/psi-urls.txt`・`psi-config.json`。

### 回遊・note 動線 P4-P7
タグ: [UI・UX]

P1-P3（GA4 計測基盤・NextStepNav・季節モード note CTA）は実装済み。

- **P4**: `keyword-relations.json`（598KB・未活用）から RelatedKeywords 未記述の keyword 記事へ build 時 top-N 自動挿入 fallback。要: 挿入品質の監査＋PE keyword 面 A/B
- **P5**: アフィリ EPC 判定のタイムボックス化（~2026-09 に GA4 `affiliate_cta_click`×A8 成果で勝者決定・負け arm 撤去）
- **P6**: 高購買意欲ページへ MDX 本文内 `<MagazineCard>` の個別商品導線補強。要: `sales-log.json` で対象ページ特定が先
- **P7**（🟢）: concrete 系の L2 もくじ新設（note 商品拡充が前提）

### 総監マガジンの歩き方 L1配線 ほか
タグ: [収益化]

公開（nc874692256bb）＋総監もくじ冒頭配線は完了。残 = ①L1（全資格サイトマップ n296a88f64ac2）へ総監セクション狙い（`--after <総監needle>`）で配線（グローバル冒頭 append は総監偏重になるため不採用）②孤児下書き nbf2a6de8f9c9 の手動削除。

### note 導線 後続配線（Fable P1 残）
タグ: [収益化]

- **トンネル・都市計画パック**: 掲載文は作成済（PACK-02/PACK-03 dir）・マガジン実体未作成。再開 = `note-magazine-create --dir <PACK-02|03> --commit` → `note-magazine-add-articles --target <新key> --from m0f3bc3933454,<トンネルm5da4b560d8be|都市mc8bd949f1f51> --commit`（各29記事）→ note ヘッダー `_cover.png` 生成 → note-magazines.ts published:true+noteUrl（道路パック mebca45bcc745 と同レシピ）
- **一次→二次 季節CTA切替**: 1級土木 guide-strategy（271人・CTA変換0.4%）を二次・経験記述向けへ（7/5 一次後＝着手可）
- **建設→総監ブリッジ記事**: 建設合格者≒総監来季見込み客。無料記事1本を建設もくじ＋L1へ（総監→建設は張らない）
- 道路パックの finer placement（道路 secondary/keyword ページ・任意）

### BK-09/10 R08予想問題集の生成
タグ: [収益化]

`power-civil`(BK-09 電力土木)/`railway`(BK-10 鉄道)の2科目に R08-yosou が未生成（他10科目は収録済）。価格確定→note 公開(published:true)はユーザー、過去問15記事/科目は試験後。

### BK-I 旧4本の後処理
タグ: [収益化]

カットオーバー完了済。旧4本(R03/04/06/07)の非公開化（note 仕様で下書き戻し不可→孤児化保留）・各 article.md の `noteUrl`/`noteId`/`notePublishedAt` を新IDへ更新してコミット。

### 1級 完全攻略パック 公開後の仕上げ（note実機）
タグ: [収益化]

100本公開＋マガジン収録＋SKU published:true は完了。残 = ①PDF添付（civil 用 pdf-spec 設計→`magazine-to-pdf.mjs`→`note-attach-magazine-pdfs.mjs --commit`・Windows必須）②各記事へネイティブ目次挿入 ③無料23本へ冒頭CTA live 反映（`note-append-cta.mjs`・ソース配線済）④`note-publish.mjs --schedule` の予約投稿 selector 修復 ⑤stray 下書き3件削除（n3e2475d0b6d5/na5b4cef4fcfe/nfc608702b477）。

### note A系記事の生URL→キーワードリンク live反映
タグ: [収益化]

SoT（ローカルmd）は確定済。note.com 公開6本（防災/担い手/GX/老朽化/国土形成/建設DX）へのブラウザ反映が未着手。他7記事も同じ生URL問題。326件バーンダウンの codemod は別途。

### note→サイト bare-url の UTM バーンダウン（442件）
タグ: [SNS・マーケ] [Codex候補]

`docs/note/**` の既存 `doboku-note.com/docs/` 送客リンク442件が bare-url のままで、note カード化により UTM が落ち GA4 Referral 計測に乗らない（新規は `check-note-site-utm --staged` で阻止済み）。bare-url を `[アンカー文言](url?utm_source=note&utm_medium=referral&utm_campaign={記事slug}&utm_content={送客先})` へ変換。アンカー文言付与に判断が要る半手動（`scripts/add-note-utm.mjs` は要検証）。バッチ・記事単位で消化。

### 競合の勝ち型を policy 化（SNS 投稿型カタログ拡張）
タグ: [SNS・マーケ]

SNS 競合実地調査（2026-07-04・`07_競合調査.md` SNS節）で surface した3型: ①聞き流し一問一答（YT・日建学院47k再生実測）＝**16:9テンプレ実装待ち** ②合格後キャリア/現場リアル リール＝**運営者の一次情報素材待ち** ③**お悩み相談回答＝素材不要で先行 policy 化可**（既存FAQ/キーワードから素材化）。着手時に該当 writer エージェントの参照を更新。真実源 `content-angle-policy`／`00_SNS整理マップ §型カタログ`。

### SNS 競合モニタリングの反復化
タグ: [SNS・マーケ]

**取得（fetch）はメインループが agent-reach スキルで実施**（サブエージェントは Bash 不可＝[[agent-bash-permission]]）。分析は新規 Evaluator `sns-research-analyst`（corpus を読んで頻出論点・刺さる切り口・gap を構造化抽出）。cadence 週次。X は**未ログイン公開読取に留める**（[[x-suspension-guardrail]]）。競合SoT = `docs/project/01_戦略/07_競合調査.md`。エージェント追加時は agents-registry 更新＋check-doc-coupling。

### SEO 権威性トラック（GSC 流入の唯一残るレバー）
タグ: [SNS・マーケ]

on-page は全数検証済みで健全＝追加微修正はしない（真実源 `gsc-management.md`）。実行可能タスク:
1. **独自データ資産化**: 1級・2級土木版 頻出論点ランキング（civil は past-exam-backlinks 未収録＝論点タグ付けが先）・被リンク獲得の外部発信（note/SNS で総監ランキング紹介）
2. **8月に index 率再測定**: 7/1 の demote 回帰（81.6%→74.6%）が継続なら総監キーワード薄ページの統合を検討（[[no-new-keyword-pages]]＝新規でなく統合）
3. 受験期の高インテント head クエリの GSC 監視・月次 `/gsc-review` 継続

### SEO 品質ゲート後続（PR #390 マージ後の残タスク）
タグ: [インフラ・計測]

SEO 品質ゲート実装（PR #390・`docs/handoffs/_archive/2026-07-13-seo-quality-gates.md`）の後続。ゲート本体は develop 済み。残:
1. **deploy 後の GSC 監視**: `develop→main` deploy で canonical/OGP 修正が本番反映＝サイト全ページ canonical 一斉更新の再クロールが走る。**コアアップデート期を避け、直後2週間は GSC 日次を監視**（gsc-management.md 2026-07-10 の教訓）。
2. **GSC page×query 実データ確認**: 週次 `fetch-metrics.yml`（金）初回実行後、`gsc-page-query-*.json` を `metrics-analyzer` に渡し Pattern 7/8（cannibalization/content-decay）を初検証。メタ改善は少数 URL の 14〜28 日実験に限る。
3. **orphan/unreachable 6本の gate 昇格**: `pe-comprehensive-management-r8-essay-theme-*` 6本は現状 warn（意図的未リンク）。導線設計を決めたら check-seo-build の gate へ昇格。
4. **robots / OAI-SearchBot の ADR**（v2監査 §8.3）: ChatGPT Search 露出を取りに行くか。training bot は block 維持、search/user bot の許可可否を ADR で決定。robots.txt/Cloudflare はユーザー承認事項。

### UIコードベース静的監査 残フェーズ（Phase4 A11y ＋ P3 整理）
タグ: [UI・UX] [Codex候補]

静的監査 `docs/reviews/2026-07-11-static-ui-codebase-audit.md`（作業指示書・SSOT）のうち、Phase 1〜3（UI-002/003/004/005/006）は develop 済み。残:
1. **UI-007 P2**: Header メニュー/drawer の dialog・focus 管理（開閉トラップ・閉状態の dialog semantics 除去）
2. **UI-008 P2**: `Callout` type を閉じた union へ変更＋未知 type を content lint で検出
3. **UI-009 P2**: Knip 報告のデッド UI/依存整理（`LinksHubTile`・`next-themes`・`date-fns`・fontsource は要個別確認、一括削除しない）
4. **UI-010〜012 P3** ＋ **UI-001 完了確認**（仕様書と現行実装の残ズレ同期）
- 実装順・完了条件は監査文書の各節参照。

### 計測基盤 Tier 2/3 ＋ GA4 UI 設定
タグ: [インフラ・計測]

Tier 1（NoteLink 計測・cadence 化・bot 監査 CI 等）は実装完了。残:
- **Tier 2/3**: カスタムパラメータ・検索/scroll イベント・アフィリA/B の label 取得・GA4↔GSC 突合／AdSense RPM 取込・sales×流入 attribution・送客リダイレクタ・A8 EPC
- **GA4 UI（ユーザー手作業）**: 内部トラフィック除外・参照除外・既知ボット除外 ON・カスタムディメンション登録確認
- 真実源（file:line・Tier 詳細）: [measurement-infra-enhancement.md](measurement-infra-enhancement.md)

### サイトアクセス×収益化 戦略の深掘り論点
タグ: [SNS・マーケ]

「検索→サイト→note」が実収益回路と判明（サイト流入84%オーガニック・CTAクリック構成が売上と一致）。土木は同回路が未稼働＝最大の伸びしろ。残（全未着手・別PC）: ①勝ち記事の型抽出（GA4 page×cta-clicks で総監の勝ちパターン→土木移植）②土木SEOビルド計画（textbook 34本×テキスト13章ギャップ表）③土木のサイト→note導線整備 ④売上×イベント相関 ⑤note内発見性の手動検証 ⑥AI検索対策。

### SVG図版 dual-use パイプライン残
タグ: [コンテンツ品質]

PR #269（カタログ）/#270（SNSレンダラー）済。残 = Phase4 記事への `<ArticleImage>` 埋込（orphan 49点・**ユーザー保留中**）・SNSパイプライン残（IG管理別カルーセルのオーケストレーション/コピーGenerator/Evaluator配線）・doc-sync 宿題（`build-svg-catalog`/`render-figure-sns` を reference 索引へ追記）。

### 記事構成ルールの SSOT 化 + サブエージェント管理
タグ: [エージェント・SSOT]

1. `docs/reference/article-structure-guide.md`（新設予定）<!-- doc-ref:ignore --> を起草 — 基本構成・文字数目標・Callout 使い方・見出し構成・CTA の型（たけブログの知見反映 → reference-sites.md）
2. `docs/reference/todo-writing-guide.md`（新設予定）<!-- doc-ref:ignore --> を起草 — todo 記述フォーマット・優先度表記
3. `civil-guide-writer` エージェント新設（article-structure-guide を真実源に）
4. `todo-planner` に todo-writing-guide と backlog の参照を追加

---

## 🟢 低 — 時期未定

### 総監キーワード cem-qa 2.2–2.5帯 40本リライト
タグ: [コンテンツ品質] [Codex候補]

合格マージン大（2.2:2/2.3:27/2.4:7/2.5:4）で緊急度低。先頭 = inventory-control / personal-info-protection / risk-analysis / ojt-off-jt。1バッチ4本。

### 薄層 377本の散文増補（3,000字下限）
タグ: [コンテンツ品質] [Codex候補]

総監 keyword 360（5/29 demote 源流コホート・[[project_adsense_low_value_2026_07]] の続き）・pe-construction keyword 16・concrete textbook 1。3,000字下限へ散文増補（7月112本バッチの継続）。census の thin 指標で残数管理（`npm run quality-census`）。

### 品質 census 月次恒久化（Phase 3）
タグ: [コンテンツ品質]

月次 `/gsc-review` と同タイミングで `npm run quality-census` 再生成→新規公開の未採点・薄層逆戻り・スコア低下を surface。census を group 別の正しい Evaluator ルーティングに拡張するのが宿題。

### reference-materials 5記事 精度向上 → 再公開
タグ: [コンテンツ品質]

hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02（`published:false`・GSC impr 資産保持）。試験ピーク 7/13 後: ①精度向上リライト ②published:true→refresh-indexes→commit ③再公開14日後に GSC delta 計測し再実験化を判断。EXP-002 は cancelled（2026-06-27）。

### 1級土木 textbook Phase 3 の実体確認
タグ: [コンテンツ品質]

schedule-charts／network-schedule／control-chart／quality-inspection: 進捗トラッカーは「SVG実体あり・チェック欄が陳腐化」とするが後工程メモに「⬜ vs 完了の食い違い」記録あり。**着手前に各 MDX に該当 SVG/節が実在するか確認**し、欠けていれば深掘りリライト。

### 土木一般編（スキャン教材）図タイト化・素材活用
タグ: [コンテンツ品質]

①図320点のタイト化 — 再開時は軽量版 `apply_deltas_recrop.py --damp 0.7`＋監査2-3ラウンド上限（フルはトークン過大で後回し）②素材活用（本丸）: 検証済みテキストで guide 品質改善・note 無料集客記事展開（GSC 先行で伸び悩みトピック特定）。runbook = `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/README.md`。

### textbook 白黒図のカラー化（対象B・任意）
タグ: [コンテンツ品質]

PDF クロップ済み白黒図 約65枚（construction-machinery-01=13/-02=7/schedule-management=24/surveying=11/demolition=6/construction-mgmt-overview=4 ほか）。著作権問題なし・見栄え向上のみ。**Gemini 有料→着手前に必ずユーザー確認（[[gemini-cost-confirm]]）**。パイロット5枚→品質・コスト確認→全体。

### pe-construction 選択科目 within-specialty インラインリンク
タグ: [コンテンツ品質]

選択科目3記事（road/river-coast/urban-planning）＋新規8記事の本文からの個別キーワードページへのインラインリンク拡充（本文精読を伴う別スコープ）。

### 1級 textbook 10本の品質監査
タグ: [コンテンツ品質]

`civil-construction-qa` で監査（合格マージン大・低優先）。H28-A fig-02/07/08/09 は元 PDF に図が無く修正不能で確定。

### カテゴリカードの残改善
タグ: [UI・UX]

①サムネイル画像の本格採用（OGP はタイトル焼込みで二重になるため写真素材を別途持つ設計が要る）②人気データの鮮度（CI の ga4-page 取得依存・週次見込み）③トップページ／検索結果ページへの横展開。

### Kindle 出版（KDP）続き
タグ: [収益化]

A-01〜A-06 個別本6冊は KDP 公開済（LIVE）。残:
- **D-02 適性**: `kindle-book-composer` で書き下ろし前付け作成 → `/kindle-build D-02`
- A-00 合本（422問 EPUB 完成・未公開）の公開判断（保留中）
- B系（総監 年度別 R03-R07 各20問¥350）＝ジェネレータ設計待ち／C系（建設部門 二次模範解答）＝着手条件達成済み・未着手
- **note PDF 販売（従チャネル）**: Kindle Select 独占90日終了後に開始（`/note-attach-pdf`・¥500〜¥1,480）
- 真実源: `docs/project/01_戦略/08_Kindle出版戦略.md`

### content-angle P-1 カルーセルパイロット
タグ: [SNS・マーケ]

`ig-carousel-writer` で `angle: counter` の slide-data.json（source: note「キーワード集が点にならない理由」）→ `ig-post-create` PNG 化 → `ig-carousel-qa` 採点。過去問パック平均（保存数・リーチ）を上回った場合のみ Phase 2（ビルダー実装）へ。真実源 `content-angle-policy` §5/§6.2。

### note 公開2スキル（note-publish / publish-note）の整理
タグ: [エージェント・SSOT]

①`publish-note` SKILL.md の幻 noteId 節にエンジン明示を追記（`note-publish-magazine` の一次ガードは Playwright 系の話・実在ゲート `verify-note-status` は全エンジン共通）②名前の紛らわしさ＝リネーム/統合か相互参照強化かの設計判断（🟣寄り・台帳同期が要る大工事なので費用対効果を要検討）。

### API トークン更新サイクル ＋ MCP 棚卸し
タグ: [インフラ・計測]

GitHub Secrets: `CLOUDFLARE_API_TOKEN`/R2 キー=90日・`PSI_API_KEY`/`YOUTUBE_CLIENT_SECRET`=180日。①期限確認・更新 ②Cloudflare token の権限スコープ最小化 ③`.mcp.json` の MCP サーバー棚卸し ④更新サイクルを Calendar/schedule hook に登録。

### IG ディレクトリ資格軸再編の残ファイル更新
タグ: [SNS・マーケ]

`.claude/` 配下19ファイルの旧 `_exam-packs` パス参照更新（sns-config.mjs→パック生成2/スキル実行5/その他5/エージェント.md 8）。完了確認 = `rg "_exam-packs" .claude/` が0件。

### OGP タイトル改行 per-page 手動チューニング（81件）
タグ: [コンテンツ品質] [Codex候補]

主題が3行以上に折れる published ページ 81件（pe-construction 過去問が最多）。`frontmatter.ogp.title` の `\n` を詰めて `npm run ogp -- <slug> --force` 再生成→commit→区切りで `/deploy`。コード変更不要。

### note 編集スクリプトの共有 lib 化（Tier 2 保守性）
タグ: [エージェント・SSOT]

account ゲート/ClipboardEvent paste/リンクカード化/ブラウザ起動が3〜5スクリプトにコピペ分岐（note-update-body paste 無音失敗事故の震源）。`scripts/lib/note-browser.mjs` へ一元化。**有料境界（paywall boundary）ロジックは収益直結のため統合せず各スクリプトにインライン保持**。独立 worktree で実施・dry-run/probe で挙動同一確認。

### 1級土木 第2章 施工計画フロー図の自前SVG化（任意）
タグ: [コンテンツ品質]

`textbook-construction-plan-overview`（施工計画フロー図2.1）・`textbook-site-investigation`（施工方法決定フロー図2.8）を自前SVG化（現状フロー図なし）。figure-canvas-policy / create-svg 準拠。

---

## 🟣 判断待ち — ユーザーの意思決定が必要

### 土木メンバーシップ ローンチ実機作業（律速=ユーザー）
タグ: [収益化]

モデルは「ライブラリ内包」へ転換済み（2026-07-01・SSOT [docs/note/1級・2級土木/noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md)）。全24記事＋週次お題11週＋無料導線2本は下書き仕込み完了・サイトCTA配線 PR #271 MERGED。

**残**: ①**添削実測**（1本30分以内→定員/価格確定・募集前必須・ユーザーのみ）②**note実機**（会員作成・2プラン・完成答案ライブラリ内包の同時配置検証）③フロー在庫8週分（当方制作）④無料集客16本公開（`note-publish-magazine --commit`）→ `civil-membership-lab` の noteUrl SoT 記入＋published:true ⑤特典マガジン会員配信（週次ドリップ）開始 ⑥2級後期の公式試験日確認。

### コンクリート診断士 — 著作権方針の決定（3択）
タグ: [コンテンツ品質]

ガイド4本・テキスト6章・択一98問が `published:false` 整備済み。図クロップの著作権処理方針が未決定で全体停止中。

- **A. SVG 描き直し**（著作権問題なし・コスト大）／**B. JCMM に許諾問い合わせ**／**C. draft 固定継続**（販売しない）

**方針決定後の残作業**: 低確度フラグ約40問の人手校正（`.tmp/cd-final9.json`/`.tmp/cd-final10.json`）・欠番3問（問48/56/85）補完・cd-essay の note カバー生成→note 投稿＋placement 配線・記述式の公開前人手レビュー・`npm run refresh-indexes`。図クロップ recrop-review 26＋rescan 16 の workflow 処理も方針決定後にまとめて実施可。

### 2級 想定工事バンクの会員ライブラリ内包
タグ: [収益化]

想定工事バンク36本＋索引は note 公開・SKU `civil-2-koji-bank` published:true 完了（¥5,480）。**会員ローンチ（上記）後**に会員特典として2級ライブラリへ内包。会員ローンチ自体が律速。

### ガイドカードのカバー写真（dormant）
タグ: [UI・UX]

literal 写真はメタ記事と不一致で撤回済（PR #277）。dormant 資産（再課金なしで再利用可・develop 存置）: `scripts/generate-guide-covers.mjs`・`src/config/guide-cover-photos.json`・`src/lib/guide-cover.ts`・Imagen 生成35枚。

**有望な未検証案**: 記事別の**概念イメージ**生成（キャリア=上昇/階段、勉強法=学習机 等）。**まず5本パイロット（~$0.10・[[gemini-cost-confirm]]）→ :3020 で判断 → 良ければ123本**。ダメなら dormant 維持。

### 建設BK-09/10 R8予想 印刷用PDF添付（Windows専用）
タグ: [収益化] [試験前 7/20]

R8予想62本は2026-07-13に全公開・収録・導線検証済（[[project_r8_yosou_full_matrix_2026_07]]）。残りは建設BK-09電力土木/BK-10鉄道の6記事のみ本文が「印刷用PDF付き」を約束しており、**Mac生成不可が実測確定**（Chrome常駐との衝突で ETIMEDOUT）。spec は R08-yosou 追記済み。

**Windows で実行**:
1. `node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/BK-09_電力土木.json --in-place`（BK-10 も同様）
2. `note-attach-pdf` で6記事へ添付（1日100件上限に注意）
3. 生成PDFを pathspec commit
