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

### IG 論点パック 残92件の波状予約（1セッション約30件）
タグ: [SNS]

1級/2級土木の論点（頻出問題）パック 122件のうち **30件を予約済**（2026-07-17・7/18〜8/1）。残 92 件を波状で継続予約する。

- **コマンド**: `node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30`（予約済は status.json で自動skip＝冪等・再開安全）。1週間以上空いたら先に `--dry-run` を1本。全体は `--plan` で確認
- **プラン**: 決定的（★降順→2級先行・1日2件 昼12:00=2級/夜19:00=1級）。全122件が 7/18〜9/16＝Meta +75日枠（9/30）内に収まる。次バッチは #31（8/2）から
- **安全弁**: ブラウザ自動操作＝Meta規約グレー・X凍結歴あり。**1セッション30件上限**（スクリプトが強制）。実行後 status.json を commit → 次セッションで同コマンド再実行
- 実行後はプランナー月ビューで実体確認（`npm run verify-ig-status`）。真実源 → memory [[project_ig_theme_packs_civil]]・ig-carousel-skill.md シリーズC

### BuildJob note展開の残作業（時間差・手動）
タグ: [収益化]

BuildJob キャンペーン（〜2026-08-31）の note ドメインパワー活用。**2026-07-14 に note 実公開まで完了**（N7-N9 新規3本公開＝na0f42fd52a51/ne49853deac96/n7a81ebf1cdc5、既存キャリア note 8本の本文再push＝サイト送客リンク live 反映、いずれも note API で実体検証済）。残:

1. **（時間差）A8 成果の月末手入力**（`.claude/state/metrics/affiliate/a8-results.json`）→ `npm run report-buildjob-affiliate` で EPC。GA4 面別は event_label 登録済（2026-07-07）＝deploy 後クリック蓄積後に `fetch-ga4-cta-clicks --by-label`
2. **stray 下書き手動削除**: `nf2316420abd0`（N7 公開検証の dry-run が作った孤児下書き・「ビルドジョブは施工管理に向くか」の下書き 11:51）。note.com/notes ダッシュボードで**公開済みの双子（11:58・同一タイトル）と取り違えないよう手動で**（`note-delete-note` は下書きカードの href を key で拾えず自動削除不可）

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

### Playwright E2Eスモークテストを導入
タグ: [品質] [E2E] [Claude Code候補]

トップ、1級土木、2級土木、技術士総監の代表ページについて、描画・主要回遊・note CTA href・モバイルoverflowをPlaywrightで検査する。note.comへのログイン、購入、公開操作や全記事クロールは対象外。Fableがオーケストレーションし、Opusは設計レビュー1回、Sonnetは実装と独立QAへ限定してトークンを節約する。

- **設計SSOT**: [12_Playwright_E2E導入設計.md](../project/04_運営/12_Playwright_E2E導入設計.md)
- **Claude Code指示**: [claude-code-playwright-e2e-implementation-prompt.md](../project/04_運営/claude-code-playwright-e2e-implementation-prompt.md)
- **既存状態**: `@playwright/test`は導入済み。設定、spec、package scripts、CI workflowは未整備。
- **初版範囲**: Chromium desktop/mobile、代表ページ、CTAはhref検査まで。
- **完了条件**: E2E、既存単体テスト、type-check、lint、build、doc-syncが成功し、失敗時artifactをCIで取得できる。

### note カバー Clarity V3 を代表記事1件で実装・検証
タグ: [UI・UX] [Codex候補]

note一覧の小さいサムネイルで主題と読後価値を瞬時に把握できるよう、既存G2と後方互換な `cover.variant: clarity` を実装する。最初は `1級経験記述で落ちる答案` 1記事だけに適用し、中央630×630クロップと幅320px相当で可読性を確認する。全記事移行と note.com へのライブ反映は別判断。

- **設計SSOT**: [note-cover-clarity-v3.md](../design-system/note-cover-clarity-v3.md)
- **Claude Code指示**: [claude-code-note-cover-clarity-v3-prompt.md](../project/05_プロダクト/claude-code-note-cover-clarity-v3-prompt.md)
- **著者属性の厳守**: 著者は**元発注者**であり添削者ではない。カバー訴求は `元発注者の視点で解説` とし、「添削者」「添削者視点」を使わない。
- **完了条件**: variantなし既存G2に差分なし／主要情報が中央590pxに収まる／fit検査対応／通常版を最後に再生成してdebug枠なし／テストと目視確認完了。

### Brain 2商品の審査後フォローと販売運用（2026-07-22 申請済み）
タグ: [収益化] [技術士総監] [1級2級土木]

両商品とも制作〜Brain公開申請まで完了（Playwright全自動・審査は原則24h・結果はメール）。旧「β商品化」「スキル商品化」タスクは完了につき本エントリへ置換（2026-07-22）。

- **申請済み**: ①施工経験記述キット ¥7,980（`brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY`）／②総監施策バンク ¥9,800（`.../a/b1IDO3UjMgoTZsNWa0JXY`）。ココナラは両商品 listed 済（¥3,000／¥2,500PDF・/links 反映済）
- **審査結果メールを確認**: 通過→販売開始の告知（note入口記事2本の手動公開＝`docs/note/技術士総監/出題テーマ分析-R8地方創生検証/`・`docs/note/1級・2級土木/経験記述-AI設計-無料/`、published:false のまま待機中）。却下→指摘に沿って修正・再申請（編集は `.tmp/brain-post*.mjs` のノウハウ＝memory 参照）
- **カテゴリ変更**: 両記事とも「ビジネス」で申請。Brain には「資格」カテゴリあり→審査通過後に変更検討
- **納品オペ**: ココナラ注文時はトークルームで送付（①=`C:\tmp\claude-code-civil-essay-kit-coconala.zip` 外部URL除去版／②=`.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf`）。Brain は有料エリアの R2 リンクで自動（`storage.doboku-note.com/brain/dist/`）
- **売上記録**: 発生したら `/record-sales`（productId 規約は sales-recorder 台帳済）
- **経緯・検証記録**: 企画〜バックテスト＝[brain-r8-policy-prediction-skill/](../project/05_プロダクト/brain-r8-policy-prediction-skill/)（00〜07・統制run結果=04§6）／①仕様=[brain-claude-code-essay-skill/](../project/05_プロダクト/brain-claude-code-essay-skill/)／出品手順=[brain-publish-playbook.md](../project/05_プロダクト/brain-publish-playbook.md)

### note施策A: 1級一次択一PDF `civil-1-takuitsu-pdf` ¥1,980 を公開（10月上旬・Select 明け）
タグ: [収益化]

**2026-07-16 に「公開直前」まで完了済み**。成果物は全て develop/main にコミット済:
- PDF: `docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/1級土木一次択一-過去問PDF.pdf`（全1162問・図109点・818頁・約12MB）
- 原稿/カバー/hashtags: 同ディレクトリ（`article.md` frontmatter は `paidBoundary: "PDF のダウンロードと使い方"` / `price: 1980`）
- SKU: `src/lib/note-magazines.ts` に `civil-1-takuitsu-pdf`（現在 `published: false` / `noteUrl: ''`）
- ビルダー: `scripts/kindle-specs/e-02.json`（再生成する場合 `node scripts/build-takuitsu-pdf.mjs --spec scripts/kindle-specs/e-02.json`）

**なぜ今公開しないか**: Kindle A系（A-00〜A-06・2026-07-08 公開）が **KDP Select 加入 LIVE＝90日独占**で、同一デジタルコンテンツを note で併売すると規約抵触。独占明けは各冊 `publishedDate + 90日`（A-01=2026-07-08→**~2026-10-06**、`scripts/kindle-published/catalog.json` で全冊の日付確認）。

**実行環境**: この Mac（`/Users/minamidaisuke/doboku-note` に note ログイン済み `.local/playwright-note-profile` あり）で実行。**会社PCはプロキシで note API 遮断のため不可**。develop worktree でやる場合は `.local/playwright-note-profile` を symlink する。

**次にやる手順（前提＝下記1が完了していること）**:
1. **【ユーザー操作】10月上旬・Select 更新日の前に、KDP 管理画面で A-00〜A-06 全冊の「KDP セレクトへの自動登録」をオフ**（真実源 = [08_Kindle出版戦略.md](../project/01_戦略/08_Kindle出版戦略.md) §KDP Select）。オフにしたことを確認してから2へ。
2. 本体公開: `node scripts/note-publish.mjs --article "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md" --commit`（draft 確認したい場合は `--commit` なしで先に流す）。**成功すると frontmatter に `noteId`/`noteUrl` が自動 writeback される**＝この `noteId` を3の `<key>` に使う。
3. PDF 添付: `node scripts/note-attach-file.mjs --note <noteId> --file "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/1級土木一次択一-過去問PDF.pdf" --boundary-regex "PDF のダウンロードと使い方" --commit`。**罠: `note-attach-file.mjs` は frontmatter の paidBoundary を読まないので `--boundary-regex` の明示が必須**（省くと既定 `試験問題|予想問題` で境界が見つからず exit 8 中断）。PDF は有料エリア末尾に添付される。
4. SKU flip: `note-magazines.ts` の `civil-1-takuitsu-pdf` を `published: true` ＋ `noteUrl: <公開URL>` に。
5. 検証＋配線: `npm run verify-note-status`（偽成功ガード）→ 公開ページを curl で有料ゲート確認 → `npm run check-note-funnel` → C 記事末尾やもくじに 1級PDF リンクを追加検討（C公開時は未公開だったため未リンク）。commit → push develop。

真実源 = [noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) §10.1

### note施策C フォローアップ: 一次「出る順 合格ノート」の露出調整（任意・売れ行き次第）
タグ: [収益化]

C（`civil-1-ichiji-ronten` ¥1,480・[nec34238ca6d6](https://note.com/dobokunote/n/nec34238ca6d6)）は 2026-07-16 公開済。civil primary/secondary の中間CTAは**転職アフィリ優先の既存設計**のため、C は主に L2 土木もくじ経由で露出（もくじには収録済）。**hero-cta の全体ロジックは触らない**方針（2026-07-16 ユーザー確定＝A案）。数週間の売れ行きを見て露出不足なら、相性の良い一次ガイド記事の**本文に `<MagazineCard id="civil-1-ichiji-ronten">` を個別挿入**（記事単位・転職導線と非競合の外科的調整）。B（`civil-1-r8-bunseki`）も同様の位置づけ。

### civil-1 土木一般編 テキスト章 本文変換（土工/コンクリート工/基礎工 ~19記事）
タグ: [コンテンツ品質]

**Phase 1（config 統合）は完了・PR #395 で develop マージ済**（2026-07-14）。`src/config/category-curriculum.json` の civil-1 に 土工(order 1-49)・コンクリート工(50-79)・基礎工(80-99) を textbookChapters 新設し、配列順を PDF 章順（土工→建設機械→コンクリート工→基礎工→測量→解体工事）に再構成、受け皿だった「分野別対策」fields は廃止。要点ガイド4本は各章 introGuides へ移設済。→ カテゴリページの該当3章は現在「要点ガイド1〜2行」だけ表示（本文記事が空）。

**残（Phase 2-4）= OCR 済み md → textbook site 記事（MDX）の忠実変換**。変換元は `docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/` の第1/3/4章。order レンジは確保済みなので、記事 frontmatter に `textbook_order` を割り当てれば自動的に該当章へ収まる。

- **Phase 2: 第１章_土工.md（4,209行・最大）→ 約8記事（order 1-49・5刻み）**: 土質調査(概説+原位置/室内試験+土/岩分類, 行22-591) / 盛土(592-1456) / 切土・法面保護(1457-1897) / 軟弱地盤対策・排水工法(1898-2353) / 土工計画・建設機械の作業能力(2354-2863) / 道路土工・路盤(2864-3324) / アスファルト舗装(3325-3888) / 舗装補修・品質管理(3889-end)
- **Phase 3: 第３章_コンクリート工.md（2,646行）→ 約6記事（order 50-79）**: 材料 / コンクリートの性質 / 配合設計・レディーミクスト / 施工(運搬・打込み・締固め・打継目・養生) / 鉄筋工・型枠支保工 / 特別なコンクリート・品質管理検査
- **Phase 4: 第４章_基礎工.md（1,561行）→ 約5記事（order 80-99）**: 概説・地質調査 / 土留め・仮締切り / 直接基礎 / 杭基礎(既製杭) / 場所打ち杭

**手順**: 見本 = `.local/r2/posts/civil-construction-1/textbook-demolition/article.mdx`（frontmatter・リード・Callout・ArticleImage・RelatedKeywords・CareerAffiliate・参考資料を踏襲）。変換ツール = `/pdf-to-mdx --exam civil-construction-1` textbook モード（テンプレ `.claude/skills/conversion/pdf-to-mdx/templates/civil-construction-1.md`）。図は元 md 隣の `img/01-YY.png` を記事 `img/` へコピー → `<ArticleImage src=".../{name}.webp">` → `npm run generate-webp`。網羅率95%+・KaTeX（$$は複数行）・表4列以下・参考URLは実在確認済のみ（捏造禁止）。1記事=`/check-mdx`→QA(civil-construction-qa ≥2.0)→即 commit。仕上げ = `npm run refresh-indexes` + `npm run ogp`（check-ogp-coverage 対策）。

**進め方**: 1章=1セッション目安（トークン大）。develop 上で通常コンテンツフロー。関連 = [[project_civil1_textbook_transcription]]（既に両編 OCR→MD 完了・条文数値は原典照合）。既存の「土木一般編（スキャン教材）図タイト化・素材活用」タスクとは別スコープ（あちらは図タイト化＋guide/note展開、こちらは textbook 章本文の site 記事化）。

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

### guide-career / アフィリ記事の文末単調（rule 15-1）copy リライト
タグ: [コンテンツ品質]

BuildJob アフィリスプリントで注入された copy が rule 15-1（文末「〜です。/〜ます。」の連続）に触れている。mechanical-only 範囲外で copy 文言変更が必要（SSOT の残課題= `docs/reviews/2026-07-14-mechanical-quality-audit.md:75`）。現状（`node .claude/scripts/lint-mdx-mobile.mjs <file>` で 15-1 実測）:
- `civil-construction-1-guide-age-career`（5件）／`civil-construction-1-guide-career-agent-comparison`（3件）／`civil-construction-2-guide-young-career`（3件）
- **手順**: 各記事の該当段落の語尾に変化をつける（体言止め・接続で連結・「〜ます。」→「〜ます」等）。数値・主張・アフィリ配線は不変。完了後 `npm run update-content-quality-baseline` で baseline 更新。要再計測（他 career 記事にも波及の可能性）

### 過去問図 rescan-need-source 9図（要外部/別原典）
タグ: [コンテンツ品質]

進捗の生きたビュー＝管理画面ギャラリー（`npm run admin`→記事図版タブ→「対応」フィルタ）で残数を見る運用。真実源 `docs/reference/figure-provenance.md`、手順 `/figure-recrop`。

残 = h29-b-fig-02（要H29第2次B原典）／h27-a-fig-01（要H27原典）／pe-construction 4（fig22/27/04/05＝要白書PDF等）／concrete-chief 3（steel-carbon-h29・bingham-flow-h30・bingham-shear-r04＝要該当年度原典）。台帳に理由記録済。

### civil-1 secondary 合格後の残存 follow-up
タグ: [コンテンツ品質]

8本全合格済みだが scores.json の qualitative_comment に記録した改善余地: earthwork 表2.9 の散文詰込13セル解体（最優先）・入れ子リスト群のフラット化・factual table のインライン出典・qm-basics/past-problems の民間ソース不在。

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

公開（nc874692256bb）＋総監もくじ冒頭配線＋**L1配線（2026-07-14 commit 6eeccae62・`docs/note/共通/コンテンツ総合案内/article.md` へ配線＋live反映済）**は完了。残 = 孤児下書き nbf2a6de8f9c9 の手動削除のみ（note.com ダッシュボード・下書き削除ツール制約で手動）。

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

100本公開＋マガジン収録＋SKU published:true＋**無料23本への冒頭CTA live反映**（2026-07-14 funnel audit `--live` で civil 冒頭ドリフト0・サンプル3本 API 反映 True 確認）は完了。残 = ①PDF添付（civil 用 pdf-spec 設計→`magazine-to-pdf.mjs`→`note-attach-magazine-pdfs.mjs --commit`・Windows必須）②各記事へネイティブ目次挿入 ③`note-publish.mjs --schedule` の予約投稿 selector 修復 ④stray 下書き3件削除（n3e2475d0b6d5/na5b4cef4fcfe/nfc608702b477）。

### note 公開記事の bare /docs/ URL インライン化（実残: draft のみ）
タグ: [収益化]

**2026-07-14 実体照合で旧「A系6本（防災/担い手/GX/老朽化/国土形成/建設DX）」は陳腐化と判明**（当該記事の source は修正済み＝現 `check-note-site-utm` 違反リストに不在）。公開/free の唯一の実残だった **立場別模範論文の選び方**（essay-persona-guide の bare URL）は同日インライン化＋live反映完了（na030d9cb3060）。
残 = **draft 3本**（再受験対策・口頭試験対策・記述式の書き方）の bare/utm-missing /docs/ URL。**未公開＝live反映不要**、公開時に是正（検出＝`node scripts/check-note-site-utm.mjs`）。別枠の「note→サイト bare-url UTM バーンダウン(442件)」とは独立。

### note→サイト bare-url の UTM バーンダウン（442件）
タグ: [SNS・マーケ] [Codex候補]

`docs/note/**` の既存 `doboku-note.com/docs/` 送客リンク442件が bare-url のままで、note カード化により UTM が落ち GA4 Referral 計測に乗らない（新規は `check-note-site-utm --staged` で阻止済み）。bare-url を `[アンカー文言](url?utm_source=note&utm_medium=referral&utm_campaign={記事slug}&utm_content={送客先})` へ変換。アンカー文言付与に判断が要る半手動（`scripts/add-note-utm.mjs` は要検証）。バッチ・記事単位で消化。

### 競合の勝ち型を policy 化（SNS 投稿型カタログ拡張）
タグ: [SNS・マーケ]

SNS 競合実地調査（2026-07-04・`07_競合調査.md` SNS節）で surface した3型: ①聞き流し一問一答（YT・日建学院47k再生実測）＝**16:9テンプレ実装待ち** ②合格後キャリア/現場リアル リール＝**運営者の一次情報素材待ち** ③**お悩み相談回答＝素材不要で先行 policy 化可**（既存FAQ/キーワードから素材化）。着手時に該当 writer エージェントの参照を更新。真実源 `content-angle-policy`／`00_SNS整理マップ §型カタログ`。

### SNS 競合モニタリングの反復化
タグ: [SNS・マーケ]

**取得（fetch）はメインループが agent-reach スキルで実施**（サブエージェントは Bash 不可＝[[agent-bash-permission]]）。分析は新規 Evaluator `sns-research-analyst`（corpus を読んで頻出論点・刺さる切り口・gap を構造化抽出）。cadence 週次。X は**投稿アカウント @doboku373 を read に使わない**（[[x-suspension-guardrail]]）＝当初「未ログイン公開読取」は X の 404 遮断で実行不能のため、**運営者個人アカ `uruhayato373` の agent-reach twitter CLI 経由 read** がその代替（投稿アカ温存の目的は同じ・真実源 x-post-policy §11.6・2026-07-20 稼働 `scout-x-competitors.mjs`）。競合SoT = 価格/品揃え `09_販売チャネル競合分析.md` §B・エンゲージ/型 `07_競合調査.md` SNS競合節。エージェント追加時は agents-registry 更新＋check-doc-coupling。

### SEO 権威性トラック（GSC 流入の唯一残るレバー）
タグ: [SNS・マーケ]

on-page は全数検証済みで健全＝追加微修正はしない（真実源 `gsc-management.md`）。実行可能タスク:
1. **独自データ資産化**: 1級・2級土木版 頻出論点ランキング（civil は past-exam-backlinks 未収録＝論点タグ付けが先）・被リンク獲得の外部発信（note/SNS で総監ランキング紹介）
2. **8月に index 率再測定**: 7/1 の demote 回帰（81.6%→74.6%）が継続なら総監キーワード薄ページの統合を検討（[[no-new-keyword-pages]]＝新規でなく統合）
3. 受験期の高インテント head クエリの GSC 監視・月次 `/gsc-review` 継続

### SEO 品質ゲート後続（PR #390 マージ後の残タスク）
タグ: [インフラ・計測]

SEO 品質ゲート実装（PR #390・handoff `2026-07-13-seo-quality-gates.md` は削除済・git 履歴参照）の後続。ゲート本体は develop 済み。残:
1. **deploy 後の GSC 監視**: `develop→main` deploy で canonical/OGP 修正が本番反映＝サイト全ページ canonical 一斉更新の再クロールが走る。**コアアップデート期を避け、直後2週間は GSC 日次を監視**（gsc-management.md 2026-07-10 の教訓）。
2. **GSC page×query 実データ確認**: 初回検証 2026-07-15 完了（workflow_dispatch で `gsc-page-query-2026-07-15` 取得・窓 6/14–7/12）。Pattern 7 site-wide 検出 3 件は**すべて同一ページの #fragment 誤検出＝カニバリ実証 0 件**。残: (a) メタ改善は少数 URL の 14〜28 日実験に限る、(b) **8/31 BuildJob キャンペーン終了後に civil-construction-1 career 26 本を page×query で再測定**。先行シグナルは `guide-1-vs-2` ↔ `guide-grade-comparison` が同一クエリ「1級 2級 土木」で共に表示（impr 1/3・pos 73/80、閾値 impr≥5×pos≤30 に未達）のみ。年収系4本（salary-up/salary-by-role/allowance/career-salary）・辞める系3本（quit-or-stay/quit-honne/career-consultation-before-quit）はクエリ競合の観測なし。実証されたペアのみ統合（301 or canonical）、感覚では削らない。
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

### 過去問データ整合: 総監 JSON h30 欠落 + docs 数値不整合の是正
タグ: [コンテンツ品質] [エージェント・SSOT]

2026-07-17 の過去問カバレッジ調査で確定した**データ層の不整合**（サイト記事は無傷。SoT/戦略docの数字ズレ）:
1. **総監 `src/config/exam-questions.json` が h30 欠落** — 実測 h21〜r07 のうち h30 のみ無く **16年度640問**。一方サイト記事は `h30-primary/secondary`（40問）を含む17年度。IG 論点パック SoT と Kindle B「平成合本 h21-h30 400問」宣言がこの JSON 由来なら**平成合本が実は h30 分不足の疑い**→ 要確認・補完（原典 `docs/textbook/技術士（総監）/過去問/` に h30 PDF あり）
2. **docs 数値の三重不整合（総監）**: `ig-carousel-skill.md`＝16年度640問／`08_Kindle出版戦略.md`本文＝18年分／同表＝17年680問。物理在庫は17年度。正へ統一
3. **技術士一次の総問数不一致**: `08_Kindle出版戦略.md` 本文「490問」 vs D-01+02+03 表・note article「560問」。実装は560問＝本文490を是正
真実源照合は `src/config/*-exam-questions.json` の実カウント。

---

## 🟢 低 — 時期未定

### 管理画面に「note 要再公開」列を追加
タグ: [インフラ・計測]

`check-note-republish`（本文の再公開ドリフト検出・2026-07-22新設）は CLI＋週次PDCA で運用中。`tools/admin-app` の記事タブに「要再公開」列を出して目視管理できるようにする（任意・polish）。

- **データ源**: `npm run check-note-republish -- --json`（`{synced, drift, unknown, driftFiles, unknownFiles}` を返す）。admin は既存 CLI を child_process 実行しガードは CLI 側に残す方針（tools/admin-app/README.md）に沿う
- CLI＋週次で運用は回るため優先度低。真実源 → note-funnel-architecture.md ツール表・memory の再公開ドリフト機構

### ココナラ 単発コンテンツの追加展開（暗記ノート等・売れ行き次第）
タグ: [収益化][ココナラ]

2026-07-18 にコンテンツ PDF を **C1〜C9 の9本**、加えて **S1/S2 サービス＋S3 答案作成（ヒアリング→文章化・¥8,000）** を公開＝計12商品（S1/S2/S3＋C1-C9）。冗長回避で**除外した源**＝2テーマ組合せ大全・想定工事バンク・完全攻略パック・直前暗記ノート・一次（KDP Select ロック）。C8/C9＝二次予想模試（Red Line #10 例外運用）。

**売れ行きを見て検討**:
- **S3 上位版（4テーマ・¥16,000〜）**: ちゃんさと¥32,000×132 の上位帯。評価が付いたら `coconala-sakusei` の 4テーマ版を追加（作成モードは実装済み）
- **S3 価格引き上げ**: 評価20件で ¥8,000→¥12,000〜16,000（kit §2）
- **一次 予想模擬試験（本丸・要設計）**: 建築版 ¥18,000×1,730件の最大ヒット帯。土木一次は過去問1,162問資産（`civil-1-exam-questions.json` 等）から作れるが、**KDP Select 一次過去問PDF との重複を回避する設計が必須**（模試＝本番形式の予想・過去問PDF＝全問解説で別物にする線引き）。着手前に KDP 抵触を確認。
- **模試の Red Line #10 監視**: C8/C9 模試が売れる一方で**会員ベース層が伸びない兆候**（模試購入が会員ベース層純増を継続的に上回る）が出たら、模試の内容・価格を再判断 or 撤退。予想の毎月更新版は会員限定を堅持（計画 §4 Red Line #10 例外決定ログ）。
- 暗記ノート（穴埋め・¥1,000〜）や PWA 過去問との連携

手順は [coconala-operations.md §8](../reference/coconala-operations.md)・`build-coconala-content-pdf.mjs`（C8/C9 は `generated:true`）・作成モード=`/keiken-tensaku --mode sakusei`。

### コンクリート主任技師 H24/H25 skip 分の補完＋R6/R7 拡張
タグ: [コンテンツ品質]

2026-07-17 に H24（26問）・H25（12問）を site へ追加（計303問・H24〜R5）。ただし 2022年版底本の**OCR品質がまだらで、以下は復元不能/不確実として収録せず skip**。**書籍原典（コンクリート主任技師2022）を再入手できれば補完可能**（現状ローカルに原典PDFなし＝照合不可）:
- **H25 skip 18問**: Q1,3,4,5,7,8,9,10,12,13,14,15,16,17,19,20,21,26（選択肢文のOCR破綻・表崩れで数値確定不可・図が別問題と判明・解答表と技術判断の conflict 3問）
- **H24 conflict skip 4問**: Q14（低確度・肢が技術的に擁護可能で解答表と齟齬）,Q16（「鉄筋腐食→硫酸塩」等OCR再構成）,Q17（JIS A5308 計量誤差表を数値検証できず）,Q18（標準偏差値がOCRで入替わり解答表と数学的に不整合）。answer key に合わせて再構成した本文の公開は避け撤去済み
- **年度拡張**: R6・R7 は原典スキャン未入手（書籍入手が前提）
- **表記統一（軽微）**: 既存 cce に「令和1年度」と「令和元年度」の混在（同一年=R1）。片方へ統一

真実源 = [exam-content-policy.md](../reference/exam-content-policy.md) §コンクリート主任技師。

### 過去問 年度拡張の未整備分（原典未入手・2026-07-17 調査）
タグ: [コンテンツ品質]

カバレッジ調査で判明した「取りに行けば整備できるが原典が未入手」の過去問。**いずれも公式サイト（engineer.or.jp / touhokugiken 等）や書籍から入手可能性はあるが、現状ローカルに原典なし**。着手は入手が前提・優先度は流入価値で判断:
- **技術士第一次試験 H30以前**: サイトは R01〜R07（560問）のみ。H30以前は engineer.or.jp で公開されているが**正答が合本PDF（`_12` 形式）で別パイプライン要**（[exam-content-policy.md](../reference/exam-content-policy.md) §技術士第一次試験）。RelatedKeywords も当面省略中（建設一次の論点キーワードページ未整備）
- **1級土木 第二次検定 H26〜R02**: サイトは二次 R03〜R07 のみ（一次は H26〜R07 完備）。H30〜R02 は**旧「実地試験」形式で二次原典がリポジトリに無く入手先の記録もなし**。現行 R8 対策への直接価値は限定的（旧形式）＝学科記述の論点素材としての価値で判断
- **2級土木 R02以前**: サイト・原典とも R03〜R07 のみ。旧学科/実地は原典なし・拡張計画の記録なし
- **コンクリート主任技師 R6・R7 / H24・H25 skip 分**: 上記「H24/H25 skip 分の補完＋R6/R7 拡張」参照
- **コンクリート診断士**: 98問整備済みだが権利方針未決で全非公開 → 🟣「著作権方針の決定（3択）」参照

### lint 9-16（Callout 密度超過）22記事のバーンダウン
タグ: [コンテンツ品質] [Codex候補]

構造品質ルール一括設計（2026-07-15）で新設した lint `9-16`（Callout 個数が guide/pillar>12・その他>3）の既存違反22記事を baseline 登録済み（`.claude/state/quality/lint-baseline.json`・漸減対象）。内訳: 建設部門 exam-themes 13・コンクリート主任 textbook 3・経験記述系4・総監2。

処置は記事ごとに「個別ハイライトに絞り、残りを散文・SpecSheetList・表へ統合」（content-principles §7.1-5）。**仕様が固まったバルク＝Codex/サブエージェント一括候補**。対象一覧は `node .claude/scripts/lint-mdx-mobile.mjs --all --report` → latest-report の 9-16 行、または baseline JSON。着手時は各記事 lint 個別実行で 9-16 と 15-1 を 0 に、`check-content-quality:ci` 緑を確認。

### Tailwind transform 変種が本 build で無効な件の根因調査
タグ: [UI・UX]

`group-open:rotate-90`（合成 transform が `--tw-rotate` リセットに潰れる）も `[transform:…]` arbitrary variant（JIT 未生成）も回転が効かない（2026-07-14・アコーディオンで発覚、[[reference_tailwind_transform_broken]]）。今回は globals.css の素 CSS `.disclosure-chevron` で回避済み。根因は `@layer` 順・PostCSS 設定・Tailwind の base reset が unlayered で utilities を上書きしている疑い。放置すると将来 `rotate-*`/`translate-*`/`scale-*` を変種で使うたび同じ罠。tailwind.config / globals.css の layer 構成を点検し、直れば独自 CSS を Tailwind へ戻せる。急がない（回避策が機能中）。

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

### 図クロップ写り込み・切断の是正（ImageMagick 搭載マシンで実施）
タグ: [コンテンツ品質]

`check-figure-crop`（2026-07-16 新設・機械ゲート）が検出した既存債務。baseline 登録済みで CI は通るが、実体は要修復。**このマシンは ImageMagick 未インストールで `figure-recrop.mjs` 実行不可**のため別マシン/セッションで実施。

- **STRAY_SLIVER 29図（隣接図の切れ端＝写り込み・要 recrop）**: 一覧は `.claude/state/quality/figure-crop-report.json` の `rule=STRAY_SLIVER`。ユーザー報告の `r07-a-fig-04`（下端ルビ）を含む。各図 `node scripts/figure-recrop.mjs <img> --top/--bottom F` で除去→ `check-figure-crop --file` で clean 確認。precision ≈ 8/10 なので着手前に1枚ずつ現物 Read（alarp-carrot 等の FP は触らない）。
- **`r07-a-fig-02`（「収縮限界」欠け・切断済み＋白枠で機械検出不能）**: 再クロップでは修復不可（画素欠損）。provenance `rescannable:needs-source` → 元スキャン（`docs/textbook/１級土木施工管理技士`）から再抽出が必要。
- 是正後は該当図を除いて `check-figure-crop --update-baseline` で baseline を刈り込む。
