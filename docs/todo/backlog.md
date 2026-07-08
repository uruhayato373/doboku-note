# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。  
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。  
> 各エントリは「発端・問題・対応方針・対象スコープ・実装ファイル」を含む。

---

## 凡例

| タグ | 意味 |
|---|---|
| 🔴 高 | 来月中に着手したい |
| 🟡 中 | 2〜3ヶ月以内 |
| 🟢 低 | 時期未定 |
| 🟣 判断待ち | ユーザーの意思決定が必要 |
| `[Codex候補]` | バルク処理向き・仕様が固まれば Codex で実施可 |

---

## カテゴリ一覧

1. [コンテンツ品質](#1-コンテンツ品質)
2. [UI / UX](#2-ui--ux)
3. [収益化（Kindle / note PDF）](#3-収益化kindle--note-pdf)
4. [エージェント・SSOT](#4-エージェントssot)
5. [SNS・マーケティング](#5-snsマーケティング)
6. [インフラ・セキュリティ](#6-インフラセキュリティ)
7. [ユーザー判断待ち](#7-ユーザー判断待ち)

---

## 1. コンテンツ品質

### モバイル可読性リライト 第1弾（表・入れ子・長段落の既存違反）🟡

機械ラチェット基盤は整備済み（`content-rules.json` ＋ `lint-mdx-mobile.mjs --all` ＋ 週次 `check-content-quality`、パイロット=`pe-construction/river-coast-exam-themes`）。baseline に grandfather された既存違反を、`.claude/state/quality/latest-report.md` の **GA4 人気度順**上位から実際にリライトして漸減させる。

- **優先上位（違反数 × 人気）**: `civil-construction-1-guide-strategy`（3-1×29・#1人気）／`pe-comprehensive-management-keyword-2026`（3-1×48）／`civil-construction-1-secondary-experience-writing-guide`（1-4×48）／`civil-construction-2-secondary-r0X`（1-4 多数）／`pe-construction/*-exam-themes` 残11本（river-coast と同型の年度マトリクス表）
- **手順**: レポート上位を `category`/`group` 対応の `/quality-cycle`（cem / civil-textbook 等・ルーティング＝exam-content-policy.md Part 2）へ。表→非表・入れ子→フラット・長段落→改段（カタログ＝content-authoring.md）。1バッチ 10-20 記事、完了ごとに `npm run update-content-quality-baseline` で刈り込み
- **注意**: civil textbook の規格表・配合表は override で除外済み（触らない）。過去問（primary/secondary）の年度×選択肢表は構造上必要な場面があり、無理に崩さない

---

### 過去問図の品質（写り込み/見切れ/画質）— provenance 台帳で継続管理 🟢

**進捗の生きたビュー＝管理画面ギャラリー**（`npm run admin`→記事図版タブ→上部「進捗（公開×掲載）」バー＋「対応」フィルタ）。真実源 `docs/reference/figure-provenance.md`、手順スキル `/figure-recrop`、機械台帳 `.claude/config/figure-sources.json`（`manual_needs` 含む）。**この項目は逐一列挙せずギャラリーで残数を見る**運用に移行。

**完了（2026-06〜07）**: 1級/2級 primary・pe-first-stage の図クロップ欠落補完＋答え漏らし/問題文・選択肢写り込みの再クロップ（civil-1 answer-leak 系・pe-first-stage 8図 等）。**公開×掲載の recrop/recrop-urgent はほぼ0**（2026-07-09 時点 各1）。旧「完了済み」記述はこの再クロップ作業で更新。

**残（2026-07-09・優先度順）**:
1. 🟡 **見切れ5図**（civil-1 工程表 r04-b/r05-b/r01-b/r07-b/r06-b-fig-02＝作業/ノード/ラベル欠落）。needs-source 棚上げ中（`manual_needs`登録済）。完全な元スキャン入手 or 工程表SVG再作図で解消。
2. 🟢 **recrop-review 163**（公開×掲載）＝句点ありだが多くは図の凡例。目視トリアージし凡例なら `manual_needs` で ok 上書き・写り込みなら再クロップ。
3. 🟢 **rescan 17**（全て concrete-chief・書籍スキャン低品質）＝物理再スキャン要（PDF無し・ユーザー作業）。
4. 🟢 **h30-a 系の見切れ再確認**（handoff は fig-04、旧メモは fig-12 で食い違い・未検証）。
5. 🟢 1級 textbook 10本の `civil-construction-qa` 品質監査（低優先・合格マージン大）。H28-A fig-02/07/08/09 は元 PDF に図が無く（問題用紙テキスト形式）修正不能で確定。

**ソース/手順**: `docs/textbook/{１級,２級}土木施工管理技士/`。手順=pdftoppm 200dpi→magick crop+trim→webp(q80)。**過去問の問題図に解答情報を入れない**（[[exam-problem-figure-no-answer]]）。**過去問データグラフのSVG化禁止**（幾何が答え＝誤答誘発）。[[civil1-figure-answer-leak-remediation]] / [[figure-provenance-system]]

---

### 1級土木 施工管理・法規編 テキスト → サイト拡充（新規11ページ＋既存深掘り）🔴

**背景**: `docs/textbook/１級土木施工管理技士/テキスト（施工管理・法規編）`（全7章）を4並行エージェントで既存34 textbook ページと突合。**大きな穴＝第5章 安全管理（131k字・textbook ゼロ）・第6章 環境保全（textbook ゼロ）**。他5章は既存で網羅済み＝既存深掘り＋自前SVG。

**計画の真実源**: [civil1-textbook-expansion.md](civil1-textbook-expansion.md)（フェーズ・slug・order・ExamPoint・必要SVG・原典照合必須の数値を詳細化）。

**規模**: 新規11ページ（安全7＝order 500台／環境4＝order 600台）＋既存深掘り約8ページ＋緊急是正2件（**法規の金額基準4,500万→5,000万 令和6年改正**・**労基の就業制限表 表7.1/7.2 欠落**）。自前SVG 約27点。制約=スキャン本文/図は公開禁止（自前書き起こし＋自前SVG）・数値は e-Gov 原典照合必須。着手順=フェーズ0緊急是正→安全→環境→既存深掘り。



**背景**: textbook 系の一部ページは、本来 PDF（公式テキスト/問題集）の図をクロップすべきところを **web 検索のブランド名付き写真（.jpg）で暫定代替**している。著作権が不明確なため、**PDF から図をクロップし直し → Gemini API でカラー化 → web 写真を差し替える**（旧記載の「ChatGPT GPT-4o」は誤り、Gemini に統一）。

**ソース PDF**: `docs/textbook/１級土木施工管理技士/`（`テキスト（土木一般編）/第２章_建設機械.pdf`・`問題集/`等）。※ [[1級・2級土木施工管理技士 ソースPDF]] 参照。

**対象A＝写真の差し替え（8ページ・24枚）— 対応表完成（2026-07-03）**: 差し替え元PDF写真PNGとの対応は [civil-machinery-photo-manifest.md](civil-machinery-photo-manifest.md) が真実源（24枚中20枚はPDF写真PNG=02-/05-で賄い、4枚はAI生成）。**注**: 現行写真の大半は Wikimedia CC/PD で著作権上は合法のため、差し替えは著作権対応ではなく体裁統一。PDF写真は市販書由来のため**AI処理は強い変形（実質再生成）必須**、AI処理→差替→commitを一体で（生画像を先行公開しない）。

**対象B＝既存B&W図のカラー化（任意・後回し）**: `fig-*.png` で PDF 由来の白黒図を持つページ（construction-machinery-01=13 / -02=7 / schedule-management=24 / surveying=11 / demolition=6 / construction-mgmt-overview=4 ほか、計 約65枚）。すでに PDF クロップ済なので著作権問題はなく、見栄え向上のカラー化のみ。

**手順**:
1. `pdftoppm -r 200` で該当ページをレンダリング → `magick -crop+trim` で図を切り出し（過去問図と同手順）
2. Gemini API（画像編集）でカラー化 — 実装は `scripts/generate-ogp-backgrounds.mjs` の Gemini 連携パターンを流用
3. web 写真 .jpg を削除し、カラー化図に差し替え（alt も「ブランド名」から図の説明へ）→ `npm run generate-webp`
4. `npm run refresh-indexes` → コミット（R2 同期は CI が自動）

**コスト注意**: Gemini 画像生成は**有料**。実行前に必ずユーザー確認（[[gemini-cost-confirm]]）。**まず対象A の `textbook-grader-compaction`（5枚）でパイロット**し品質・コストを確認してから全体へ。

**ワークリスト（対象24枚・元PDFリファレンス・状態）**: [textbook-image-colorization.md](textbook-image-colorization.md)（2026-06-20 作成）。

**決定方針（2026-06-20）**: PDF の機械イラストはメーカー提供写真（コマツ/酒井重工業/トプコン等）が多く切出し使用は著作権 NG のため、**(C) Gemini/GPT でオリジナルのカラーイラストを生成して差し替える**（元PDFは形状リファレンスのみ）。**有料 → 着手前に必ずユーザー確認**（[[gemini-cost-confirm]]）。当面 web 写真は据え置き、生成画像が揃い次第入れ替え。**パイロット**＝`textbook-grader-compaction`（5枚）でスタイル/コスト確定 → 全24枚。手順・対象はワークリスト参照。

---

### 1級土木テキスト（スキャン教材）図クロップ残作業 🟢

**背景**: テキスト両編（施工管理・法規編／土木一般編）を高解像度OCRでMD化＋図クロップ埋め込み済。図は `docs/textbook/**/img`（r2-sync 対象外＝内部リファレンス・非公開）。handoff `2026-06-24-civil1-textbook-figures.md`（`_archive` 退避済）から抽出。

**残タスク**:

1. ✅ **施工管理・法規編（完了・2026-07-02）**: 難所図の手動差し替え（9図＝`03-11, 03-14, 05-18, 05-19, 05-22, 05-24, 06-01, 06-11, 07-07`。`07-02` は p.308 で完結する表7.1 の実在しない「続き」＝OCR由来の重複のため画像・本文とも削除）＋**全7章133図の全数目視再クロップ**を完了。真実源＝当該編 README「図クロップ品質」ノート。**残るは下記の土木一般編のみ**。
2. 土木一般編（図320点）の図タイト化 — **後回し**（パイロットで audit/refine ≒20Mトークン×2.4倍）。再開時は軽量版 `apply_deltas_recrop.py --damp 0.7` ＋監査2-3ラウンド上限。
3. 本文OCR校正パス（`proofread.workflow.js`）— **見送り**（再OCRコスト）。
4. 素材活用（本丸）: 検証済みテキストを使った guide 品質改善・note 無料集客記事への展開（GSC 先行で伸び悩みトピックを特定）。

**runbook**: `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/README.md`（locate→crop→audit/refine→trim→embed）。

---

### pe-construction 選択科目キーワード集の欠落科目を補完 🟢

**残**: 選択科目の論点キーワード集（`*-ronbun-keyword`）が river-coast・road・urban-planning の3科目のみ。geotechnical（土質基礎）・鋼構造コンクリート・港湾空港・電力土木・鉄道・トンネル・施工計画・建設環境 の8分野が欠落。需要のある科目から新規作成する。**新規作成したらハブ `pe-secondary-essay-guide` の「選択科目別 論点キーワード」節に追記するだけで回遊導線に自動で乗る**（縦の導線は整備済み・2026-07-03）。

> 注（完了・2026-06-21）: 必須科目I の重複ペア5テーマは A統合でなく **B 差別化＋相互リンク**（seoTitle を「論述の型」/「キーワード集」に明確化・相互リンク挿入）で解消済（[[keep-differentiate-not-delete]] 準拠・GSC カニバリ無し確認）。上記「残」は選択科目の新規作成のみ。

> 注（完了・2026-07-03）: 必須科目I 6テーマは書籍全文スプライス＋図28枚＋通し校正で拡充し、相互リンク網＋ハブ双方向を整備。選択科目3記事（road/river-coast/urban-planning）も縦の回遊導線（ハブ↔記事＋必須科目I橋渡し）を整備済み。詳細 → `docs/handoffs/2026-07-03-pe-construction-ronbun-keyword-expansion.md`。**低優先の残**: 3記事の within-specialty インラインリンク（本文精読を伴う別スコープ）。

---

### reference-materials 5記事 精度向上 → 再公開（試験後）🟢

**背景**: EXP-002 で復活させた reference-materials 系5記事（hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02）は、運営者判断で 2026-04-19 から `published: false`（精度向上後に再公開予定）。EXP-002 は非公開のまま計測不能で70日滞留したため 2026-06-27 に **cancelled で close**。記事は削除せず非公開保持（GSC impr 資産 combined 162 impr / 4 clicks を捨てないため）。

**残タスク**（試験ピーク 7/13 後に着手）:

1. 5記事の精度向上リライト（試験文脈・出典・図版の品質を上げる）
2. `published: true` で再公開 → `npm run refresh-indexes` → commit（R2 は CI 同期）
3. 再公開14日後に GSC で impr/clicks delta を計測し、再実験化するか判断

**根拠**: `.claude/state/experiments.json` EXP-002（cancelled, 2026-06-27）。

---

### トップページ下部（note 教材・アフィリ・書籍）のデザイン統一 🟡

**発端**: `https://doboku-note.com/` のフッター直上に3セクションが後付けで積み重なっていてサイトデザインと不整合。

**現状の問題点**（`src/app/page.tsx` L142-172）:

```
Hero → ExamCards → LatestArticles → AboutSection
↓ ここから後付けのアドホックセクション
[note 有料教材]  LinksHubTile（/links への画像レス内部リンクタイル・2026-07 に MagazineSidebarCard から置換）を max-w-sm 左寄せで配置
[アフィリエイト] SchoolAffiliate をそのまま max-w-3xl に配置
[参考書籍]       BookSection "総監受験の参考書籍"（トップなのに総監限定タイトル）+ BookCard
↓ Footer
```

1. ~~**`MagazineSidebarCard` をメインカラムに使っている**~~ → **✅ 2026-07 解消**（`LinksHubTile`＝画像レス内部リンクタイルに置換。旧 `MagazineSidebarCard`/焼き込み画像は退役）。残るは下記「やりたいこと」の3セクション統合デザインのみ
2. **セクションヘッダーのスタイルがバラバラ** — "Premium" ラベル（`font-mono text-[10px]`）が他セクション（Hero・ExamCards 等）の見出し設計と異なる
3. **参考書籍のタイトルが資格固定** — "総監受験の参考書籍" はトップページ（全資格横断）のコンテキストに不適
4. ~~**`BookCard` は休止中** — アフィリエイト審査未通過なのに表示されている~~ → **✅ 2026-06-20 解消**（`AFFILIATE_LINKS_ENABLED=false` で homepage 含め参考書籍枠は非表示済。残るは下記「やりたいこと」のデザイン統合のみ）

**やりたいこと**:
1. 3セクションをまとめて **1つの "教材・リソース" セクション**に統合し、サイトの他セクションと同じデザインシステム（デザイントークン・余白・見出し階層）で設計し直す
2. ~~`MagazineSidebarCard` → 横幅フルの CTA カードに置き換え~~ → 現状 `LinksHubTile`（画像レス）。フル幅 Feature 版にするかは3セクション統合時に判断
3. `BookCard` はアフィリエイト審査通過まで非表示（「BookCard 休止対応」バックログと同時対応）
4. スクールアフィリエイト（`SchoolAffiliate`）も同セクション内に統合して視覚的なまとまりを作る

**実装ファイル**:
- `src/app/page.tsx`（L142-172 を再設計）
- `src/components/ui/LinksHubTile/`（または新規 Feature 版コンポーネント）

**備考**: デザイン反復は develop/ローカル(:3020)で実施し、ユーザーが確認してから develop push（毎回本番 deploy しない）。

---

### 総監 essay の壊れアンカー 20 件を修正 — ほぼ完了 🟢

> 注: BROKEN_ANCHOR 20件は修正完了（commit `8a08ecba4`・`check-links` で BROKEN_ANCHOR=0 確認）。**残＝PR #342（BROKEN_SLUG 54件偽陽性の check 側是正）マージ待ち**。マージ後この行を削除。

---

## 2. UI / UX

### フロントエンド土台リファクタ（page/category の config駆動化）🔴 [Codex候補]

**発端**: 2026-06-25 アクセスアップ＋デザイン改善の議論。デザイン改善の前提として「改修改修でスパゲッティ化した合成ロジック」の共通化が必要（ユーザー指摘）。アセスメント実施済み（デザイントークン自体は良好＝globals.css 単一ソース。負債は page 合成ロジック）。

**問題（file:line 裏取り済み）**:
- `src/app/docs/[...slug]/page.tsx` と `src/app/category/[slug]/page.tsx` が category×docGroup ごとに記事末セクション/レイアウトをハードコード → 新資格追加で両ファイル編集が必要。
- `category/[slug]/page.tsx` の `sortDocs()` が 35+ if-else、secondary split regex 重複。
- マガジンカードが4コンポーネントに過分割（MagazineCard/InlineCard/SidebarCard/SidebarPromoCard）。badge パターン重複・一部 inline-style／`dark:` 漏れ。

**やること（増分順・各増分で build＋curl `<main>`/キーワード検証）**:
1. ✅ **[低リスク] マガジンカード統合**（PR #273）: `MagazineBadge` 抽出＋inline `style`→`bg-brand`。※`MagazineCard` proxy撤廃（4→2）は **descope**（48 MDX が直接参照する facade のため）。
2. ✅ **[中] docs ArticleFooter/ArticleSidebar 抽出**（PR #273）: 記事末ブロック＋右 aside を純粋抽出（ロジック不変）→ `docs/[...slug]/page.tsx` 580→376行。
3. **[中] ArticleFooter を config駆動化**: `src/lib/article-section-config.ts` で category×docGroup→section[] を定義、registry で section→render を解決。新資格＝JSON のみ。※純粋抽出済みなので残りは config 化のみ。再評価で indirection 増に対し効果は限界的＝**保留**（新資格追加が実際に発生したら着手）。
4. ◑ **[高] category レイアウト template化**（PR #273 で純粋抽出フェーズ完了）: `category/[slug]/page.tsx` 1065→230行。`lib/category-groups.ts`（grouping/sort）・`components/category/CategorySections.tsx`（DocCard/DocSection/5 テーブル）・`components/category/CategoryViews.tsx`（資格別 5 view）へ分離。**残**: `sortDocs` の 35+ if-else はファイル移動しただけ＝strategy factory 化は未（増分3 と同じく「新資格追加が実際に発生したら」着手で十分。今の view 分離で新資格は CategoryViews へ 1 関数追加すれば済む）。
5. **[低] dark:/inline-style 一掃**: badge 等の inline `style` → Tailwind semantic class。※増分1で MagazineBadge は対応済み。残りは横断 sweep（別タスク）。

**実装ファイル**: `src/app/docs/[...slug]/page.tsx`・`src/app/category/[slug]/page.tsx`・`src/components/ui/Magazine*`・新規 `src/lib/article-section-config.ts`・新規 `src/components/ui/{ArticleFooter,ArticleSidebar,MagazineBadge}/`・新規 `src/lib/category-groups.ts`・新規 `src/components/category/{CategorySections,CategoryViews}.tsx`

**前提・順序**: PR #272（アフィリ除去）は develop マージ済み。リファクタは feature ブランチ `refactor/magazine-cards-consolidation`＋PR #273 で進行中。増分2以降は1000+ページの記事末に影響するため build＋複数ページ種別の SSR 目視必須（各増分で実施済み）。

### 性能: CI PSI 再計測フラグ（Phase 0）🟡

**発端**: 2026-06-25 性能アセスメント。

**問題**:
1. `pe-comprehensive-management-exam-index` が desktop PSI で Perf 56・TBT 2521ms。ただし**当該ページに Mermaid は無く（出現0）**、271行の軽い構成。真因はローカルで確定不能＝**計測スパイクの可能性**。次回 CI PSI で再計測し、再現するなら Timeline/ExamFields 等の client JS を疑って profiling。
2. **モバイル PSI が未計測**（desktop のみ）。モバイルが主流入＋Google ランキング信号。**外部Google API＝ローカル不可（会社PCプロキシ遮断）→ CI 供給で計測**（`fetch-psi-audit` の mobile）。
3. CLS 超過2ページ（civil-construction-1-primary-r07-a 0.176 / pe-comprehensive-management-r07-primary 0.151）＝AdSense枠の width/height 明示で是正可。

**実装ファイル**: `.claude/config/psi-urls.txt`・`.claude/config/psi-config.json`（mobile 戦略）。計測は CI（measurement-incidents の恒久ルール）。

### AdSense 再申請（有用性の低いコンテンツ対策の仕上げ）🔴

**発端**: 2026-07-04 診断。「有用性の低いコンテンツ」で直近2-3回却下。主因＝非インデックス265本(サイトの25%)、本丸は薄いCEMキーワード。診断詳細＝`docs/handoffs/_archive/2026-07-04-adsense-low-quality-report.md`、真実源メモリ `[[project_adsense_low_value_2026_07]]`。

**完了済**: 本文3,000字未満だった薄層CEMキーワード**112本を全リライト→3,000字超の実質散文化・deploy済**（本番反映確認）。画像クロップ/CLSは主因でないと確定（対応不要）。

**残（ユーザー作業＝外部承認依存）**:
1. GSC で sitemap 再送信 ＋ 強化した主要URL 10〜20本を手動インデックス登録リクエスト。
2. 非インデックス率が下がるか 1〜2週間観察（`url-inspection` 再取得）。
3. **前回却下から2〜4週間空けて再申請**（短間隔の連続再申請は逆効果）。既存チェックリスト `docs/project/_archive/03_civil-adsense-resubmission.md:147-191`。

**任意（優先度低）**: W2転職ガイド8本・W3/W4長尺過去問は薄さでなく権威性/鮮度/重複が非索引要因のため、AdSense対策としては後回し（本文3,000字超のW1 54本も同様に対象外）。

### カテゴリページの記事一覧をブログカード化 ◑（PR #274）

記事一覧を `BlogDocCard` 化。右サイドバー全資格拡張は完了済（`hasSidebar` 化）。参考: ソーシャルPLUS ブログ（`docs/todo/reference-sites.md`）。

> 注（完了・PR #274）: `DocCard` 刷新（`CategorySections.tsx`）＋GA4 駆動の人気記事 特集/ランキング（`build-popular-pages.mjs`・`popular.ts`・`PopularSections.tsx`）実装済。SSOT は該当コンポーネント。

**残**: ①サムネイル画像の本格採用＝現状 OGP はタイトル焼込み済でカード題と二重になるため未採用（写真素材を別途持つ設計が要る）。②人気データの鮮度＝CI の `ga4-page` 取得に依存（週次見込み）。③トップページ／検索結果ページへの横展開。

---

### ガイドカードのカバー写真 🟣 ペンディング（dormant・2026-06-26）

**経緯**: ガイド記事カードに資格別プールの AI 生成写真を付けた（PR #276）が、civil-1 等のガイドは大半が**メタ記事**（年収/合格率/勉強法/参考書/級の違い）で、literal な建設機械写真が記事トピックと不一致＝「無関係な画像」に見え**撤回（PR #277）**。

**dormant 資産（再課金なしで再利用可・develop に存置）**: `scripts/generate-guide-covers.mjs`（npm `guide-covers`）・`src/config/guide-cover-photos.json`・`src/lib/guide-cover.ts`・`public/images/guide-covers/`（Imagen 生成 35枚・資格×5）。再有効化は `DocCard`（CategorySections）に `guideCoverFor` を再配線。

**不採用と分かった案**: (a) OGP をカバー流用＝関連はするがタイトル二重＋サムネで余白だらけで弱い。(b) literal 写真の category プール＝メタ記事に被写体が無く破綻。

**有望な未検証案（やるなら）**: 記事別の**概念イメージ**生成（agent が各ガイドのトピック→概念プロンプト：キャリア＝上昇/階段、勉強法＝学習机、合格率＝チェック/グラフ）。メタ記事でも関連感が出る可能性。**まず5本パイロット（~$0.10・[[gemini-cost-confirm]]）→ :3020 で判断 → 良ければ123本**。ダメなら dormant 維持。

---

### 回遊・note 動線 最適化 P4/P5（P1-P3 は実装済み）🟡

**背景**: 2026-07-04 に回遊・note 動線・アフィリを全面調査。P1（内部回遊の GA4 計測基盤）・P2（guide 記事末「次のステップ」導線 NextStepNav）・P3（カテゴリ hub の季節モード note CTA）は実装済み（PR feat/funnel-tracking）。以下は増分で今回スコープ外。

- **P4: keyword-relations.json の自動レコメンド活用** — `keyword-relations.json`（598KB・refresh-indexes 生成）は存在するが `RelatedKeywords` は MDX ハードコードで未活用。RelatedKeywords 未記述の keyword 記事に build 時 top-N を自動挿入する fallback を入れれば PE 総監 keyword 650 面の回遊が強化される。**要: 挿入品質の監査（自動レコメンドの妥当性）と PE keyword 面での A/B**。既存ハードコードは優先維持。
- **P5: アフィリ EPC 判定のタイムボックス化** — 建設JOBs vs ビルドジョブ/GKS の恒久 A/B（slug ハッシュ 50/50・`affiliate-creatives.ts`）は EPC 計測中で判定期限が未定。~2026-09 に GA4 の `affiliate_cta_click` × label（arm 別）× A8 成果で EPC 比較→勝者決定・負け arm 撤去。あわせて concrete/pe-first-stage の docs sidebar 空白を既存クリエイティブで埋める是非（セグメント適合を優先し無理に埋めない判断も可）。**まず P1 計測の実データ（2-4 週）を見てから**。
- **P6: 高購買意欲ページへの個別 MagazineCard 補強**（PR #382 の後続）🟡 — note CTA を全 HUB ページで「もくじタイル」に統一（PR #382）した際、記事末尾の個別マガジンタイル（最大3枚）を廃止。1級土木二次・総監 essay ハブ等の高 converting 面は、個別商品への直リンクが季節タイル 1 枚に減った。売上実績のあるページから優先し、MDX 本文内 `<MagazineCard>` で個別商品導線を明示補強する。**要: 売上ログ（`sales-log.json`）で対象ページを特定してから着手**。
- **P7: concrete 系の L2 もくじ新設** 🟢 — `resolveHubCta` の HUB は civil-1/2・総監・建設のみ。concrete-chief-engineer / concrete-diagnostician は note 側に L2 もくじ記事が無く、docs もくじタイルが出ない（現状は正しく非表示）。note に concrete もくじを作成→`note-funnel.json` L2 登録→`hub-cta.ts` の HUB に追加すれば concrete 面も統一導線に乗る。**note 商品の拡充が前提**。

---

## 3. 収益化（Kindle / note PDF）

### 読み方ガイド 横展開（建設部門＋土木）🔴

**発端**: 総監の3点セット（完全パック＋R8予想＋読み方ガイド）が sales-log で実証（売上TOP3独占）。型の横展開を検討したが、検証の結果「科目非依存の読み方ガイドのみが横断で成立」と判明（2026-06-23）。

**スコープ確定（科目構造補正後）**: **読み方ガイド ×（建設部門＋土木）の2本のみ**。建設部門は選択科目制（必須I＋11科目から1選択）ゆえ横断R8予想・横断完全パックは構造的にニーズなし→作らない。科目非依存の読み方ガイド（論文/経験記述の書き方）だけが横断で成立。R8予想・完全パックは科目別マガジンが既に解決済み。土木の予想は二刀流＝会員フロー（2026-06-12決定）を尊重。

**実行計画 SSOT**: [docs/handoffs/_archive/2026-06-23-3piece-horizontal-replication.md](../handoffs/_archive/2026-06-23-3piece-horizontal-replication.md)。

**残作業**: ①建設部門 読み方ガイド組成（論文対策キーワード6テーマ＋論文の書き方）②土木 読み方ガイド組成（既存ガイド再包装）。note 公開は手動（成果物は content＋note-magazines.ts published:false まで）。

> 2026-06-23 経緯: 当初「フル3点横展開」で計画したが、(a)R8予想は10科目が既存マガジンに収録済（誤記是正）(b)選択科目制ゆえ横断商品は不成立（ユーザー指摘）の2点で、横展開すべきは読み方ガイド2本に収束した。

### 総監マガジンの歩き方（17ペルソナ診断ハブ）公開＋配線 🟡（ほぼ完了）

**発端**: Fable 収益ファネル横断再設計（2026-07-02）。完全パック¥9,800 は6月トップ商品（7件¥57,680）だが、買い手が自分のペルソナを自己判定できないと「網羅保証」が刺さらない。sosou_nino（物量63誌）への差別化＝「3分で1冊が決まる」探索コスト低減の要。

**状態（2026-07-02 公開＋配線 済）**:
- ✅ **公開**：`note-publish --commit` で公開・**note nc874692256bb**（HTTP 200 実在確認）。`article.md` に noteUrl/noteId/notePublishedAt/`noteStatus: published` writeback 済（commit dd8bc6248）。
- ✅ **総監もくじ（L2・n3ed4c77ceed6）冒頭へ 歩き方カード配線**（`note-append-cta --before-first-h2 --commit`・note API で body に urlKey 実在確認）。
- 🧹 孤児下書き **nbf2a6de8f9c9**（初回 draft 作成分）は手動削除推奨（無料下書き・低害）。

**残作業**: ①**L1（全資格サイトマップ n296a88f64ac2）への配線**は保留＝グローバル冒頭 append は多資格ページが総監偏重になるため不採用。総監セクション狙い（`--after <総監needle>`）で後日。※L1→総監もくじ→歩き方 の経路は既に成立。関連: [[project_pe_hub_article_design]]・[[note-competitive-analysis-2026]]。

### note 導線 後続配線（Fable P1 由来）🟡 — 当方コード分は PR #330 完了・残は note実機/試験後

**発端**: Fable 収益ファネル横断再設計（2026-07-02）で検出。建設部門CTAの描画ゼロ本体は [PR #329](https://github.com/uruhayato373/doboku-note/pull/329)（`sidebarImageUrl` 15誌欠落＋`CATEGORY_MAGAZINES` に pe-construction 無し）で修復済み。残る導線改善を集約。

**残タスク（note実機・試験後のみ）**:
- ✅ **建設 topCta（完了）**：文面A案 note-funnel.json 設定（PR #333）＋ `wire-note-funnel-cta --apply` で建設 note 22記事の source 注入（PR #334）。**live 反映は不要と確認**＝公開済み建設16記事は**全て公開時から BK-I/道路/もくじ CTA を live 保有**（2026-07-02 note API 実査 have=16/miss=0）。未公開6記事は publish 時に source の topCta が反映。
- 🟡 **科目パック¥4,980（道路 LAUNCHED・他2は同レシピ）**：
  - ✅ **道路パック 完全開通（2026-07-02）**：note LIVE＝`建設部門2次｜道路まるごと合格パック` **mebca45bcc745**・¥4,980・35記事（API実査済）・HTTP 200（PR #336 で noteUrl 記録）。**site も開通**＝cover(1280×670)/sidebar(300×250) satori 生成・published:true・CATEGORY_MAGAZINES[pe-construction] 先頭配線（PR #337）。／docs 側も本番反映済（PR #337 origin/main 入り確認）。
  - 確立レシピ（他パックも同じ）: 掲載文dir作成 → `note-magazine-create --dir <dir> --commit`（有料単体・¥4,980）→ `note-magazine-add-articles --target <key> --from <BK-I key>,<科目 key> --commit`（記事再収録・API自動差分）→ API実査。**入れ子不可問題は再収録モデルで解消済（完全パック precedent）**。
  - ⏳ **残**：①トンネル・都市計画パック — **掲載文は作成済（commit e8d76dfdf・PACK-02/PACK-03 dir）だがマガジン実体は未作成**。再開＝`note-magazine-create --dir <PACK-02|03> --commit` → `note-magazine-add-articles --target <新key> --from m0f3bc3933454,<トンネルm5da4b560d8be|都市mc8bd949f1f51> --commit`（各29記事）→ note ヘッダー `_cover.png` 生成（`generate-magazine-covers.mjs`・サイト表示用画像は不要＝CTA は exam-brand の cta-bg でデータ駆動）→ note-magazines.ts published:true+noteUrl → CATEGORY_MAGAZINES は廃止済のため配線不要（hub CTA は resolveHubCta のもくじ集約）。②道路パックの finer placement（道路secondary/keywordページ・任意）。
- **一次→二次 季節CTA切替**（試験後）：1級土木 guide-strategy（271人・CTA変換0.4%）を二次・経験記述向けへ（当方コード・7/5一次後）。
- **建設→総監ブリッジ記事**（試験後）：建設合格者≒総監来季見込み客。無料記事1本を建設もくじ＋L1へ。総監→建設は張らない。
- ✅ **建設SSOT価格を実勢へ是正**（PR #333）：計画値（BK-I¥2,480/道路¥3,980/標準¥3,480）と実勢（¥3,480/¥3,480/¥2,980）の逆方向乖離を、ユーザー確認（実勢が正）の上で全面是正。
- ✅ **civil-2-koji-bank を高intent面へ配線**（PR #330）／✅ **死にエントリ削除**（PR #330）／✅ **建設SSOTカレンダー是正**（PR #330）。

**実装ファイル**: `src/lib/note-magazines.ts`・`src/lib/magazine-placement.ts`・`.claude/config/note-funnel.json`。真実源: PR#329・Fable P1レポート。

### Kindle 出版（KDP）＋ note PDF 販売 — 択一式過去問集 全資格展開 🟢

**既存作業（2026-07-08 更新）**: 戦略書 `docs/project/01_戦略/08_Kindle出版戦略.md`（v3・4シリーズ設計）。制作パイプライン整備済み＝`/kindle-build` スキル＋`kindle-book-composer`/`kindle-book-qa` エージェント、A系 `scripts/build-takuitsu-reconstruct.mjs`（lead判定+exclude 是正済み）、D系 `scripts/build-pe1-kindle.mjs`（spec駆動・MathML/画像同梱）。**A-01 は EPUB 完成（収録127問・epubcheck 0/0・5軸監査→混入是正済み・¥390）**。

**4シリーズ設計**:

| シリーズ | 内容 | 状態 |
|---|---|---|
| A — 1級土木 論点別 | A-01〜A-06（安全/法規/施工/環境/品質/工程） | **A-01 EPUB完成**・A-02以降 THEMES実測待ち |
| B — 技術士総監 年度別 | B-01〜B-05（R03〜R07 各20問）¥350 | ジェネレータ設計待ち |
| C — 建設部門 二次模範解答 | C-01〜C-03（道路/河川/都市計画）¥690・合本¥1,250 | 着手条件達成済み・未着手 |
| D — 技術士一次 科目別7年分合本 | D-01基礎¥490 / D-02適性¥390（パイロット）/ D-03専門建設¥490 | ビルダー完成・D-02 spec作成済み・書き下ろし前付け待ち |

**次の一手**:
- (a) KDP アカウント作成・税務情報（W-8BEN）登録 ← A-01 出版の残ブロッカー（ユーザー作業）
- (b) ~~表紙画像の用意~~ → **完了（2026-07-08）**: A-00/A-02〜A-06 全冊 spec 駆動で生成済み（`scripts/kindle-covers/`）
- (c) Kindle Previewer 3 で各冊最終目視 → KDP アップロード（登録順メモ = `~/Downloads/KDP登録順メモ_Aシリーズ全冊.txt`。A-01 は更新版 EPUB の差し替え再アップ）
- (d) D-02 適性: `kindle-book-composer` で書き下ろし前付け作成 → `/kindle-build D-02`
- (e) ~~A-02「法規」の THEMES 定義~~ → **完了（2026-07-08）**: A-02〜A-06＋A-00 合本まで全冊 EPUB 完成（epubcheck 0/0・QA済み）
- (f) ~~サイト MDX の尻切れ解説の恒久修正~~ → **完了（2026-07-09）**: 破損解説 348 件（逆移植242＋新規補完106）を MDX 15記事へ書き戻し、パーサーを現行「1.」選択肢書式対応に修正して JSON 再生成を恒久安全化（再実行しても破損0・packEligible 892 に回復）。commit b23c934ea / 827a7706a

**note PDF 販売（従チャネル）**: Kindle Select 独占期間（90日）終了後に開始。同一ソースから印刷 PDF を生成し note 有料記事に添付（`/note-attach-pdf` スキルで添付可能）。価格は Kindle より若干高め（¥500〜¥1,480）。

---

### 土木施工管理技士 メンバーシップ設計 — 工事別記事 × 継続配信 × 添削 🟣

> **ステータス**: 着想段階。着手前に下記「分析が必要な軸」を決定してから実設計に入る。

**コンセプト**: 一時購入マガジンではなく **継続課金（メンバーシップ）**で受験者を長期サポートする。毎月・毎週「新しい工事の完成答案」を追加することで解約抑止・試験直前まで利用し続ける動機を作る。添削サービスで差別化する。

---

**既存の経験記述ラインとの関係**（`src/lib/note-magazines.ts` より）:

| 既存マガジン（一時購入） | 特徴 |
|---|---|
| `1級土木 施工経験記述｜工種×テーマ別 完成答案集（5管理）` | 複数工種×5管理の完成答案 |
| `2級土木 施工経験記述｜工種×テーマ別 完成答案集（安全・品質・工程）` | 同上（2級） |
| `1級土木 施工経験記述｜過去問 模範答案集（R03-R07）` | 年度別過去問の模範答案 |
| `2級土木 施工経験記述｜過去問 模範答案集（R03-R07）` | 同上（2級） |
| `1級土木 施工経験記述｜2テーマ組合せ大全（5管理 全10組合せ）` | 2テーマ必答形式対応 |

→ 既存は「答案を買って参考にする」スタイル。メンバーシップは「継続的に新答案が届き + 自分の答案を添削してもらえる」スタイル。競合より補完関係に設計できる可能性あり。

---

**メンバーシップ設計の軸（検討事項）**:

#### 1. コンテンツ構成: 工事別記事

経験記述は「具体的な工事」を書かないと評価されない。工種別にリアルな工事シナリオで書いた完成答案が継続価値になる。

追加候補の工種（優先度順）:
- 道路改良工事（最多受験者層）
- 河川改修工事（護岸・堤防）
- 橋梁上部工・下部工
- 舗装工事
- 上下水道管工事
- 法面工・切土・盛土
- 仮設工事（土留め等）
- 解体工事

毎月 **2〜3工種 × テーマ** を追加配信する想定（月8〜12答案）。

#### 2. 過去問分析の統合

受験年度・テーマ傾向を分析して「今年出そうな工事×テーマの組合せ」を優先して配信する。
- `src/config/civil-1-exam-questions.json`（H26〜R07・1162問）を活用
- 問1（経験記述）のテーマ出題傾向を集計 → 直前期に「今年の狙い目工種」レポートを配信

#### 3. 添削サービス

| 方式 | コスト | スケーラビリティ |
|---|---|---|
| A. 手動添削（フォーム受付→3日以内返答） | 時間コスト大・差別化高 | 月10〜20件が限界 |
| B. AI添削補助（Claude が初稿採点→運営者が確認→返却） | コスト中・半自動 | 月50〜100件 |
| C. セルフ採点キット（ルーブリック + AI フィードバック付きフォーム） | コスト低・差別化低 | 無制限 |

→ 初期は B（AI補助 + 運営者確認）から始めて品質を担保しながらスケールを見る。

#### 4. プラットフォーム選定

| 候補 | 月額課金 | 添削収受 | 運営コスト |
|---|---|---|---|
| **note メンバーシップ** | ◎ | △（DM経由） | 低（既存アカウント流用） |
| 独自 PWA | ◎ | ◎（フォーム実装） | 高（開発コスト大） |
| Substack | ◯ | △ | 中（英語UI） |
| Discord + Stripe | ◯ | ◎（チャンネル活用） | 中 |

→ 初期は **note メンバーシップ** が最速。月額 ¥980〜¥1,480 帯が既存購読者の抵抗感低い。

#### 5. 既存マガジンとの価格戦略

- 既存マガジン（一時購入）: ¥1,480〜¥2,480 → 「試し買い」エントリーとして維持
- メンバーシップ: 月額 ¥980〜¥1,480 → 「継続利用 + 添削付き」で年間 ¥11,760〜¥17,760
- 既存マガジン購入者 → メンバーシップ移行オファーで LTV 向上

---

**着手前に決める必要があること（分析 TODO）**:

1. **工事別の優先順位** — 受験者の業種分布・SNS アンケートで「あなたの経験工事は？」を取得
2. **添削の運用コスト試算** — 月何件まで B 方式（AI補助）でさばけるか実測
3. **note メンバーシップ vs 独自** — 既存 note フォロワー数・転換率の見積もり
4. **既存マガジンの年間売上推移** — メンバーシップに移行するより単品を売り続ける方が有利かの比較
5. **継続率モデル** — 試験日（2月・10月）に向けて加入→試験後離脱のサイクルをどう設計するか

**着手条件**: Web 月収 ¥15k 達成後 + 経験記述マガジン 月3件以上の安定売上確認後

---

## 4. エージェント・SSOT

### 記事構成ルールの SSOT 化 + サブエージェント管理 🟡

**背景**: ガイド記事の薄さ・Callout 配置の問題・導入なし冒頭など、記事品質の問題が個別に発覚している。

**やること**:

1. `article-structure-guide.md`（新設予定）を起草 — 記事の基本構成・文字数目標・Callout 使い方・見出し構成・CTA の型。たけブログ（`docs/todo/reference-sites.md`）の知見を反映。
2. `todo-writing-guide.md`（新設予定）を起草 — todo 記述フォーマット・優先度表記・グループ定義。`todo-planner` エージェントがこれを参照して weekly.md を書く。
3. `civil-guide-writer` エージェントを新設 — `article-structure-guide.md` を真実源として参照。
4. `todo-planner` エージェントに `todo-writing-guide.md` と `backlog.md` の参照を追加。

**SSOT 分割**:

| ファイル | 参照エージェント |
|---|---|
| `docs/reference/article-structure-guide.md`（新設予定）<!-- doc-ref:ignore --> | `civil-guide-writer` / `civil-textbook-rewriter` / `keyword-rewriter` |
| `docs/reference/todo-writing-guide.md`（新設予定）<!-- doc-ref:ignore --> | `todo-planner` |

**着手順**:
1. `docs/reference/article-structure-guide.md` を起草（Claude Code でドラフト → ユーザーレビュー）<!-- doc-ref:ignore -->
2. `docs/reference/todo-writing-guide.md` を起草<!-- doc-ref:ignore -->
3. `civil-guide-writer` エージェント新設
4. `todo-planner` description 更新

---

### note公開2スキル（note-publish / publish-note）の整理 🟢

**背景**: 同じ「note.com 記事公開」を別エンジンで実装した2スキルが並存（意図的だが名前がほぼアナグラムで紛らわしい）。`publish-note`=browser-use（LLM操作・Mac推奨・stats47由来、2026-06-10）／`note-publish`=Playwright×システムChrome（決定的・Windows会社PC可、2026-06-15＝publish-note の Windows 版）。台帳（skills-registry 2026-06-15/skills-guide）に経緯あり。

**やること**:

1. **`publish-note` SKILL.md の幻noteId節をエンジン明示に是正**（軽微）: 2026-07-01 に偽成功ガードを追記したが、`note-publish-magazine.mjs` の一次ガードは Playwright 系（`note-publish`）の話。publish-note（browser-use）は別エンジンで同スクリプトを使わない。「実在ゲート `verify-note-status` は全エンジン共通・note-publish-magazine の一次ガードは Playwright 系」とエンジンを明示して誤読を防ぐ。
2. **名前の紛らわしさ**（設計判断・🟣寄り）: 将来どちらかにリネーム/統合するか、少なくとも両 SKILL 冒頭の相互参照を強化する。リネームは skills-guide/registry・呼出マップの同期が要る大工事なので費用対効果を要検討。

**真実源**: `.claude/skills/social/{note-publish,publish-note}/SKILL.md`、`docs/reference/skills-registry.md`、[[feedback_note_publish_phantom_id_gate]]。

---

## 5. SNS・マーケティング

### SNS UTM 統一の実装（GA4 経路分類の空白を埋める）✅ 完了（2026-07-04）

**完了**: `.claude/config/utm-templates.json`＋`.claude/scripts/lib/utm-builder.mjs`（2026-07-03 実装）に加え、**YT 生成スクリプト（yt-shorts-create / per-problem-shorts）の `.replace()` 手書きを `buildUtmUrl()` へ配線・sns-config のハードコード utmParams 撤去（出力 byte 等価を検証）**。X 送客リンクは新設 `check-x-utm`（pre-commit ゲート）が utm_source=x/utm_medium=social を強制。さらに GA4 SNS 流入 breakdown（`fetch-ga4-data --sns-only`→`ga4-sourceMedium-sns-*`）・週次スナップショット CI 復旧＋SNS 拡張・YT 公開照合 `verify-yt-status`・週次レビュー Agent F＋metrics-analyzer Pattern 6 まで一括整備。SSOT: `00_SNS整理マップ §型カタログ`／`02_チャネル動線設計 §4`。

### note→サイト bare-url の UTM バーンダウン（442件）🟡

**発端**: SNS 計測基盤整備（2026-07-04・上記 UTM 統一の派生）。X 側は `check-x-utm` で新規を阻止したが、`docs/note/**` の既存 `doboku-note.com/docs/` 送客リンク **442件が bare-url（単独行）のまま**で、`/note-publish` がカード化して UTM が落ち GA4 の Referral 計測に乗らない。`check-note-site-utm --staged` で新規は既に阻止済み＝**既存分のバーンダウン**が残タスク。

**対応方針**: bare-url を `[アンカー文言](url?utm_source=note&utm_medium=referral&utm_campaign={記事slug}&utm_content={送客先})` のインライン形式へ変換。アンカー文言の付与に判断が要る半手動作業（`scripts/add-note-utm.mjs` が自動付与候補だが debug 途上＝要検証）。真実源 `02_チャネル動線設計 §4`／ゲート `check-note-site-utm`。
**規模**: 442件（`node scripts/check-note-site-utm.mjs` で一覧）。バッチ・記事単位で消化。

### 競合の勝ち型を policy 化（SNS 投稿型カタログの拡張）🟡

**発端**: SNS 競合実地調査（2026-07-04・`07_競合調査.md` SNS節）で、競合が伸ばしている型のうち現行の型カタログ（`00_SNS整理マップ §型カタログ`）に無い3種を surface。型として正式に policy 化すれば writer エージェントが量産に使える。

**対象3型**:
1. **聞き流し一問一答**（YT 空白型・日建学院で47k再生実測）→ YT 通常動画/長尺。**ブロッカー: 16:9 テンプレ未実装**（`05_YouTube §5` 参照）。テンプレ実装が前提。
2. **合格後キャリア/現場リアル リール**（IG 差別化・現場密着リールにバイラル実績）→ `ig-reels-policy` に型追加。**要運営者の一次情報**（キャリア体験素材。Red Line=一次情報は note 有料囲い込み・断片/フックまで）。
3. **お悩み相談回答**（技術士系 X/YT で定着）→ `x-post-policy` の投稿型 or Reels 角度。既存 FAQ/キーワードから素材化可能＝運営者素材なしで着手可。

**対応方針**: 3の「お悩み相談回答」は素材不要で先行 policy 化可。1は16:9テンプレ待ち、2はキャリア素材待ち。着手時に該当 writer エージェント（`x-post-writer`/`ig-reels-writer`）の参照を更新。真実源 `content-angle-policy`／`00_SNS整理マップ §型カタログ 型バックログ`。

### 1級土木 二次10/4 直前スプリント（死守コア3つ）🔴

**発端**: 令和8年度 1級二次 **2026-10-04**（約13週）が経験記述商品の買い場ピーク。1級一次 7/5・技術士PE二次が終わる **W28（7月中旬）以降に始動**。真実源・設計は [docs/note/1級・2級土木/noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) §5.4／§3.3／§1.2。

**死守コア（時間が足りなければこれだけ）**:
1. 🟡 **完全攻略パック 起動済み・収録拡充中** — SKU `civil-1-keiken-complete-pack` は **published:true＋noteUrl 済**（起動完了・note-magazines.ts:509）。配線/CTA 済。残は完成答案 draft の追録充実のみ。
2. 🟣 **会員ローンチ** — §5.1 ゲート通過。律速＝① 添削実測（1本30分→定員/価格確定・ユーザーのみ）／② note実機（会員作成・2プラン・完成答案ライブラリ内包の同時配置検証）／③ フロー在庫8週分（当方制作）。
3. 🟣 **最小リスト捕獲** — LINE公式（ノーコード・アプリ不要）＋ **一次→二次ブリッジ磁石**「一次おつかれ→二次の始め方」（直前チェックは不採用）。器=ユーザー／中身（磁石PDF・あいさつ/ステップ配信台本・友だち追加CTA）=当方。

**捨てる**: 1級向け一次PDF（7/5に間に合わない）／重い学科予想の作り込み／2級深掘り。 `[Codex候補]`=パック残公開の機械配線。

### 1級・2級土木 二次 学科記述（問題2〜11）買い切りライン 制作 🟡

**発端**: 2026-07-03 設計。既存 civil 買い切り7誌は全て問題1（経験記述）で、二次配点の約4割を占める学科記述（問題2〜11）と低価格エントリー帯が空白だった。SKU は wire-ahead 登録済（note-magazines.ts `civil-1-gakka-kijutsu`/`civil-2-gakka-kijutsu`/`civil-1-anki-note`/`civil-2-anki-note`/`civil-1-niji-marugoto-pack`・全て published:false）。真実源・設計＝[noteコンテンツ計画.md §9](../note/1級・2級土木/noteコンテンツ計画.md)。**死守コア3つ（上記スプリント）を最優先し、その邪魔をしない範囲で並行**。

**前提の是正（2026-07-03 現物照合）**: (1) 二次PDFは R03-R07 の5年分のみ（H30-R02 は一次のみ）→「8年分」は不成立、**R03-R07 5年分**。(2) サイト無料 `secondary-*-past-problems` が既にテーマ別頻度表＋解説を公開済＝カニバリあり → オーナー判断で**一旦考慮せず作って計測**（§9.1）。(3) 逐語転載はしない（独自散文）。

**制作順（§5.4 の投入時期）**:
1. ✅ **P1 パイロット（土工）完成**（2026-07-03）— `magazines/1級土木-二次学科記述-テーマ別出る順/土工/article.md`。R03-R07 の土工出題を頻度分析（TS/GNSS締固めが5年中4年で最頻出）→出る順→論点別攻略→頻出穴埋め語句→書き方の型。guide-fact-checker で技術事実VERIFIED・試験構成の誤り是正済。**学科記述商品の型を確立**。残り6テーマ（コンクリート/品質/安全/施工計画・環境/法規/書き方）は本パイロットの型を踏襲して量産。
2. **P1 残6テーマ制作** — 8月中旬公開目標。各テーマ＝R03-R07 5年分の頻度分析＋出る順＋解答の型＋頻出語句。縮退時はコン・安全を先行。`[Codex候補]`=頻度集計の機械処理。専用 Generator/Evaluator エージェントは未整備（型が固まったのでエージェント化を検討）
2. **P3a 派生**（1級 暗記ノート ¥980）— P1 の穴埋め頻出語句を一問一答150-250問＋赤シート対応A5 PDF（`scripts/magazine-to-pdf.mjs` 流用）。8月下旬
3. **P5 束ね**（1級 まるごとパック ¥11,800）— 完全攻略パック＋P1＋P3a を統合、索引記事1本のみ新規。9月上旬。商品ページに「伴走・添削は会員へ」分岐明記
4. **P2/P3b 移植**（2級版）— P1 の型完成後に移植。10月上旬（2級後期前）

**公開手順（各SKU共通）**: 原稿制作 → note ヘッダー `_cover.png` 生成（`generate-magazine-covers.mjs` に定義追加。サイト表示用の画像は不要＝CTA は exam-brand の cta-bg でデータ駆動）→ note マガジン作成 → noteUrl 埋め＋published:true。**不採用**: 買い切り予想問題集（Red Line #10 堅持・§9.4）。

### content-angle P-1 カルーセルパイロット 🟢

**前提**: P-2（X experience）は 2026-06-15 完了済（draft 059・x-post-qa 3.0）。残るは P-1（IG）のみ。真実源 → `docs/reference/content-angle-policy.md`（§5 Red Line・§6.2 骨子）。2段階の実装設計・Phase 2 ビルダー仕様・検証ルーブリックの詳細 → `docs/handoffs/_archive/2026-06-09-content-angle-implementation.md`。

**残作業**:
1. `ig-carousel-writer` で `angle: counter`（反論切り口）の slide-data.json を執筆（source: note 記事「キーワード集が点にならない理由」・既存 notebook-* 型再利用・`meta.angle: counter`）。`meta.angle` が lint を通るか確認（弾かれたら slide-data スキーマを最小拡張）
2. `ig-post-create` で PNG 化 → `ig-carousel-qa` で採点。完了条件 = PNG が角度骨子に沿う（cover が言い切り/「〜は逆」）＋角度純度 OK（主角度1つ・反論骨子・verbatim なし）＋ Red Line（content-angle-policy §5）逸脱なし
3. 結果が過去問パック平均（保存数・リーチ）を上回った場合のみ Phase 2 へ（`angle-slides.mjs`＋`slide-render.mjs` dispatch・tokens.json 角度トークン・`ig-post-create --angle/--source` ＋ SKILL.md/skills-guide.md 更新）

---

### SEO 権威性トラック（GSC 流入の唯一残る레버） 🟡

**発端**: 2026-06-22 の GSC 流入減調査で、在庫下の技術・on-page SEO レバーを全数検証し**すべて健全/最適化済み**と確定（真実源: `docs/reference/gsc-management.md` 2026-06-22 ログ）。

**確定事実（再調査不要・現物検証済）**:
- index 率は **volatile**（4/27 **54%** → 6/19 **81.6%** → 7/1 **74.6%**）。7/1 は既存 indexed 126本（総監KW 97中心）が「クロール済み-未登録」へ回帰＝Google の価値判断による demote。「81.6%達成で権威性の壁失効」は**部分的に揺り戻し**。真実源: `gsc-management.md` 2026-07-02 ログ。**8月再測定で回帰継続なら総監キーワード薄ページの統合を検討**（[[no-new-keyword-pages]]＝新規でなく既存の統合）
- hygiene = redirect/404 とも **0**（7/1 も維持＝回帰は技術問題でなく権威性）
- 未index の過去問 23本は robots=ALLOWED / indexing=ALLOWED / canonical 一致 / fetch=SUCCESSFUL ＝**技術バグ無し**。「クロール済み未登録」は純粋に Google の価値判断（旧年度の低需要ページ）。on-page 編集で強制 index 不可
- 本文量・タイトル・description・FAQ schema・内部リンク（82.5/ページ）= 全て充足
- 流入減は ①新規ページによる blended 平均順位の希釈アーティファクト ②定義ロングテール（換金性ゼロ）中心、で実害は小

**結論**: GSC 流入を実質的に動かせるのは**ドメイン権威性（off-page）のみ**。これは code 編集でなく独自データ + 被リンクの継続プログラム。on-page の追加微修正はしない（[[hub-strengthening-approach]]・2026-04 pivot で「内部施策は天井」と既出）。

**実行可能タスク（権威性を上げる）**:
1. 独自・被引用される **データ資産**化: 680 問の過去問 + 合格者模範論文を、外部がリンクしたくなる統計/まとめとして整備
   - 総監の頻出論点ランキングは公開済（`/docs/pe-comprehensive-management-frequent-topics`・`build-frequent-topics.mjs`・published:true）。**残**: ①1級・2級土木版（civil は past-exam-backlinks 未収録＝論点タグ付けが先）②合格率推移（独自性低）③被リンク獲得の外部発信（note/SNS で本ランキング紹介）
2. **外部被リンク**起点: note 記事 → サイトの文脈リンク、`/links` ハブ、X/IG bio、合格体験記の寄稿
3. 受験期（6-7月）の**高インテント head クエリ**（`1級土木施工管理技士 過去問 解答`）を category/hub ページが取れているか GSC で監視（現状 query に未出現＝未ランク or 季節前）
4. 継続監視: 月次 `index-coverage.yml` + `/gsc-review`、週次 `fetch-metrics.yml` + `/weekly-improve` は配線済。指標を観測ログへ追記

**やらないこと**: 個別ページの seoTitle/description 微修正の量産（検証済みで上積み数クリック・換金性ゼロ）。GSC 数値悪化を見ても on-page 施策を増やさない。

---

### SNS 競合モニタリングの反復化（agent-reach 取得 ＋ 分析エージェント）🟡

**発端**: Agent-Reach（`~/.claude/skills/agent-reach`・グローバルスキル・2026-06-25 導入、X/YouTube/Web/GitHub 等 8/13 チャンネル稼働、X は twitter-cli で未ログイン公開読取可）を入れたので、競合（X・YouTube）の反復モニタリングを仕組み化したい。ユーザー意思決定済み（2026-06-25、「反復的な競合モニタリングにしたい」）。

**設計の決め手（重要・再導出しない）**: **サブエージェントは Bash 不可**（[[agent-bash-permission]]）。Agent-Reach は `twitter`/`yt-dlp`/`curl jina` 等シェル実行が必須なので、**取得（fetch）はメインループが agent-reach スキルで行う**。サブエージェントは取得した corpus（テキスト）を読んで分析するだけ。既存の X/YT 系（`x-post-writer`/`x-post-qa`/`yt-shorts-title-writer`）は投稿生成・採点（Generator/Evaluator）で役割が別＝**fetch を足して肥大化させない**。

**対応方針（2段）**:
1. **取得**: メインループが agent-reach で競合 X 投稿・YouTube（タイトル/字幕）・関連 Web を収集。対象競合・クエリは既存の競合 SoT を起点に固定（`docs/project/01_戦略/07_競合調査.md`、[[reference_competitors_civil]]/[[reference_competitors_pe]]）。
2. **分析**: 新規 Evaluator 型サブエージェント `sns-research-analyst`（Bash 不可・渡された corpus を読む）で、頻出論点・刺さっている切り口（[[content-angle-policy 相当: 結論/理由/体験/反論/数字/ハウツー]]）・エンゲージ傾向・自分が埋めるべき gap を構造化抽出 → `x-post-writer`/コンテンツ企画が消費。

**対象スコープ / 実装**:
- cadence: 週次（`/weekly-improve` か専用ルーティンに接続。`/schedule`＝RemoteTrigger 新規作成前に `/routines` で重複確認＝[[feedback_session_start_git_sync 隣の cron 重複ルール]]）。
- 「どの競合を・どのクエリで」を固定するなら、エージェントより**薄い project スキル `sns-research`** で定型化する方が筋が良い（要判断：スキル化 vs インライン手順）。
- 出力先: 観測ログ（`.claude/state/` 配下の機械データ or 週次レビュー節）。新規 `.claude/state/*.md` は作らない（[[information-architecture 4ゾーン]]）。
- エージェント追加時は `agents-registry.md` 更新＋ `check-doc-coupling`、新スクリプト追加時は discoverability 配線＋`/doc-sync`（[[new-tool-doc-wiring]]）。
- 凍結リスク: X は**未ログイン公開読取に留める**（[[x-suspension-guardrail]]・新アカ Cookie を食わせない）。Instagram は Agent-Reach 非対応＝対象外。

---

## 6. インフラ・セキュリティ

### 計測基盤 強化ロードマップ（GA4/note ファネル/収益 attribution/bot 衛生）🟡

**発端**: 2026-07-03 の計測基盤5面並行監査（現物 file:line 裏取り済）。土台は健全（dev 除外・BAILOUT 対策・Japan bot フィルタ・CTA クリック計測は稼働）だが、穴が4クラスタ＝①instrumentation ②収益 attribution ③分析 cadence 停止 ④UTM/bot 設定ドリフト。

**Tier 1（すぐ・低コスト高効果）**: ①NoteLink クリック計測（`NoteLink.tsx:60-64` に data-cta 付与＝最大の穴）②MagazineCard の trackLabel 伝播 ③収益カバレッジ表を CI 配線（06-18 停止）④bot 比率監査を CI 配線（05-17 以降ゼロ）⑤metrics-analyzer/seo-meta の cadence 化（05-11/05-17 停止）⑥pages.dev の gtag ブロック ⑦UTM 規約ドリフト是正（doc=inline/実装=referral）。

**Tier 2/3**: カスタムパラメータ・検索/scroll イベント・アフィリA/B の label 取得・複合 dimension＋GA4↔GSC 突合／AdSense RPM 取込・sales×流入 attribution・送客リダイレクタ・A8 EPC。

**サーバ側（GA4 UI・ユーザー手作業）**: 内部トラフィック除外・参照除外・既知ボット除外 ON・カスタムディメンション登録・bing bot 疑い確定。

**真実源（全 file:line・Tier 詳細）**: [measurement-infra-enhancement.md](measurement-infra-enhancement.md)

### セキュリティ定期チェック：API トークン更新サイクルと Claude プラグイン棚卸し 🟢

**対象シークレット（GitHub Secrets）**:

| シークレット | 用途 | 推奨サイクル |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Pages デプロイ・R2 同期 | 90日 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` | R2 認証 | 90日 |
| `PSI_API_KEY` | PageSpeed Insights | 180日 |
| `YOUTUBE_CLIENT_SECRET` | YouTube API | 180日 |

**MCP サーバー棚卸し** (`.mcp.json`):
- 不要な MCP サーバーを削除（攻撃面を減らす）
- 各サーバーの権限スコープを最小化
- セキュリティアップデートを確認

**やること**:
1. GitHub Secrets の有効期限確認・期限切れ間近なものを更新
2. Cloudflare API Token の権限スコープを最小化
3. `.mcp.json` の MCP サーバーを棚卸し
4. 更新サイクルを Google Calendar or schedule hook に登録

---

## 7. ユーザー判断待ち

### コンクリート診断士（cd）— 著作権方針決定後に再開 🟣

**現状**: ガイド4本・テキスト6章・択一98問が `published:false` で整備済み。図クロップ59点の著作権処理方針が未決定のため全体が止まっている。

**ユーザーが決める必要があること（3択）**:
- **A. SVG 描き直し** — 図を SVG で再作成（著作権問題なし・コスト大）
- **B. ライセンス取得** — 試験実施機関（JCMM）に問い合わせて許諾
- **C. draft 固定継続** — 図クロップのあるページを `published:false` のまま販売しない

**方針決定後の残作業**:
- 低確度フラグ問題（約40問）の人手校正（`.tmp/cd-final9.json` / `.tmp/cd-final10.json`）
- 欠番3問（問48・56・85）を MDX に補完
- cd-essay-magazine の note カバー画像生成 → note 投稿（Mac）＋ `magazine-placement.ts` に診断士ページ→マガジンの placement 配線（vertical 公開後）
- cd-essay 記述式論述の公開前 人手レビュー（`civil-keiken-essay-qa` は施工経験記述専用で非対応）
- `npm run refresh-indexes` 実行

**整備の詳細記録**: 自己修復パイプライン・資産インベントリ（18記事・図84点）・並行セッション事故の経緯は `docs/handoffs/_archive/2026-05-30-concrete-diagnostician.md`（退避済）。

---

### figure P12「試験ポイント/引っかけ」機械検知 — 完了 ✅（2026-06-28）

> 注: `svg/detect.mjs` に P12（HIGH＝pre-commit ブロック）実装・SKILL.md P-code 表更新済（SSOT はそちら）。既存違反3図は本文既出のため除去済・P12=0 確認。余白 cosmetic（sexual-harassment 下部）は `svg-canvas-fitter` で任意 polish。詳細 → `.claude/state/proofread-learnings/2026-06-27.md`。

---

## 8. アーカイブ handoff 由来の継続タスク

> **2026-06-23 運用移行**: handoff は「タスクを backlog へ抽出 → 本体は即 `_archive` 退避」へ統一（handoffs/ は溜めない）。以下は退避済み handoff の生きたタスク。詳細手順・経緯・runbook は各**出典（_archive）**を参照。

### BK-09/10 R08予想問題集の生成 🟡
**残**: `power-civil`(BK-09 電力土木)/`railway`(BK-10 鉄道)の2科目に R08-yosou が未生成（他10科目は収録済）。価格確定→note公開(published:true)はユーザー、過去問15記事/科目は試験後。
**出典(runbook)**: `docs/handoffs/_archive/2026-06-10-bk04-11-yosou-cloud-runbook.md`

### BK-I（I-1/I-2両収録版）旧4本の後処理 🟡
**残**: カットオーバー完了済。旧4本(R03/04/06/07)の非公開化（note仕様で下書き戻し不可→孤児化保留）・各 article.md の `noteUrl`/`noteId`/`notePublishedAt` を新IDへ更新してコミット。
**出典**: `docs/handoffs/_archive/2026-06-20-bki-i2-draft-staging.md`

### 総監キーワード cem-qa 2.2–2.5帯 40本リライト 🟢
**残**: 合格マージン大（2.2:2/2.3:27/2.4:7/2.5:4）で緊急度低。先頭=inventory-control / personal-info-protection / risk-analysis / ojt-off-jt。作業レシピ=1バッチ4本。
**出典**: `docs/handoffs/_archive/2026-06-20-cem-keyword-quality-cycle.md`

### 土木メンバーシップ ローンチ実機作業（ローカル）🟣
**前提**: 全24記事＋週次お題11週＋無料導線2本を下書き仕込み完了。サイトCTA配線=PR #271 MERGED。§3「メンバーシップ設計」の着想段階から実装段階へ進行。
**残**: 1.無料集客16本を公開（`note-publish-magazine --commit`）2.`civil-membership-lab` の noteUrl→SoT記入＋published:true 3.特典マガジン会員配信（週次ドリップ）開始 4.添削実測ゲート（1本30分以内・募集前必須）5.2級後期の公式試験日確認。
**出典**: `docs/handoffs/_archive/2026-06-21-civil-membership-content-stocked.md` / `docs/handoffs/_archive/2026-06-23-civil-note-membership-local.md`

### SVG図版 dual-use パイプライン残 🟡
**前提**: PR #269(カタログ)/#270(SNSレンダラー) MERGED済。
**残**: Phase4=記事への `<ArticleImage>` 埋込（orphan 49点・ユーザー保留中）・SNSパイプライン残（IG管理別カルーセルのオーケストレーション/コピーGenerator/Evaluator配線）・doc-sync宿題（新コマンド `build-svg-catalog`/`render-figure-sns` を reference索引へ追記）。
**出典**: `docs/handoffs/_archive/2026-06-21-svg-figures-timeline.md`

### note A系記事の生URL→キーワードリンク反映（note.com実機）🟡
**残**: SoT(ローカルmd)は確定済。note.com公開6本（防災/担い手/GX/老朽化/国土形成/建設DX）へブラウザ反映が未着手。他7記事も同じ生URL問題。326件バーンダウンの codemod は次セッション。
**出典**: `docs/handoffs/_archive/2026-06-22-note-a-series-funnel-utm.md`

### 建設部門 論文対策キーワード 増補 — 完了 ✅（2026-07-02）

> 注: 全6節を現行方式（逐語複製せず textbook 出典の事実ベース増補）に統一完了（commit `95bb47239`/`28180bc28`/`d16677664`/`6c0605ef4`）。詳細 → `docs/handoffs/_archive/2026-06-22-pe-construction-verbatim-reflection.md`。

### IGディレクトリ資格軸再編の残ファイル更新 🟢
**残**: 本体再編コミット(437853fbb)済。`.claude/` 配下19ファイルの旧 `_exam-packs` パス参照更新（sns-config.mjs→パック生成2/スキル実行5/その他5/エージェント.md 8）。完了確認= `rg "_exam-packs" .claude/` が0件。
**出典**: `docs/handoffs/_archive/2026-06-23-ig-dir-reorg-remaining.md`

### 1級土木 完全攻略パック 公開後の仕上げ 🟡
**前提**: 100本note公開＋マガジン `m8290970a7f05` 100/100収録＋SKU `civil-1-keiken-complete-pack` published:true 完了（PR#313 merged）。以下は公開後の live 化残作業（repo に痕跡が出ない browser/別PC作業）。
**残**: 1.PDF添付（civil用pdf-spec設計→`magazine-to-pdf.mjs`→`note-attach-magazine-pdfs.mjs --commit`・Windows必須）2.各記事へネイティブ目次挿入（`publish-note/references/editor-operations.md` Phase 4.5）3.無料23本へ冒頭CTA live反映（`note-append-cta.mjs`・ソース配線済/ライブ未反映）4.`note-publish.mjs --schedule` の予約投稿selector修復（`.tmp/np-sched-*.png` から作り直し）5.stray下書き3件削除（`n3e2475d0b6d5`/`na5b4cef4fcfe`/`nfc608702b477`）。
**出典**: `docs/handoffs/_archive/2026-06-30-civil1-flagship-postpublish.md` / `docs/handoffs/_archive/2026-06-30-civil1-flagship-publish.md`

### OGPタイトル改行 per-page 手動チューニング 🟢
**前提**: ダークOGPの主題/サブタイトル手動制御（`frontmatter.ogp.title/subtitle`）は実装・デプロイ済。作業は frontmatter編集＋プレビュー＋commit のみ（コード変更不要）。
**残**: 2026-06-29時点で主題が3行以上に折れる published ページ 81件（過去問 `pe-construction-r0X-*` が最多／論文キーワード／長い説明系）。`node .tmp/title-audit.mjs`（出典handoff内スクリプト）で再カウント→ `ogp.title` の `\n` を詰めて `npm run ogp -- <slug> --force` 再生成→commit→区切りで `/deploy`。
**出典**: `docs/handoffs/_archive/2026-06-29-ogp-title-tuning.md`

### 2級土木 想定工事バンクの membership 2級ライブラリ内包 🟣
**前提**: 想定工事バンク36本＋索引は note公開・SKU `civil-2-koji-bank` published:true 完了（¥5,480）。会員ローンチ（§5 死守コア2）後に会員特典として2級ライブラリへ内包。会員ローンチ自体が律速。
**出典**: `docs/handoffs/_archive/2026-07-01-civil2-koji-bank-note-publish.md`

### サイトアクセス×収益化 戦略の深掘り論点 🟡
**前提**: データ検証で「検索→サイト→note」が実収益回路と判明（サイト流入84%オーガニック・note環流4%未満・CTAクリックの試験構成が売上と一致）。土木は同回路が未稼働＝最大の伸びしろ。分析結論は出典handoff内に一次保持（恒久戦略docへ未転記）。
**残（別PC深掘り・全未着手）**: 1.勝ち記事の型抽出（GA4 `ga4-page-*`×`ga4-cta-clicks-*` で総監の勝ちパターンをテンプレ化→土木移植）2.土木SEOビルド計画（`textbook-*`34本×テキスト13章カバレッジギャップ表→未カバー節の原著記事化）3.土木のサイト→note導線整備（総監の効くCTA/UTM型を土木全記事へ）4.売上×イベント相関（sales-log×SNS/note公開日でnote-native分ブラケット）5.note内発見性の手動検証（noteアクセス状況ダッシュボード）6.AI検索対策（openai/chatgpt/copilot流入の実態とAI引用構造）。
**出典**: `docs/handoffs/_archive/2026-07-01-site-access-monetization-strategy.md`

### note 編集スクリプトの共通処理を共有lib化（Tier 2 保守性改善）🟢
**発端**: 2026-06-24、note-update-body の paste 無音失敗事故。原因の一つは account ゲート/ClipboardEvent paste/リンクカード化/ブラウザ起動が note-publish・note-update-body・note-append-cta 等3〜5箇所にコピペで分岐し、note-publish の正しい paste 条件が note-update-body に伝播していなかったこと。
**方針**: 震源の共通処理を `scripts/lib/note-browser.mjs`（launchNoteBrowser/accountGate/openEditor/pasteBody{clear}/cardifyUrls/clickPublishProceed/clickUpdate）へ一元化し、上記スクリプトを差し替える。**有料境界(paywall boundary)ロジックは収益直結のため統合せず各スクリプトにインライン保持**（壊すと有料エリアが崩れる）。
**実施条件**: task_4deea43c の Tier 1 修正が commit 済みであること。**独立 worktree で実施**（収益noteに触る5スクリプト改修・並行セッション衝突回避＝§10）。各スクリプトは dry-run/probe で挙動同一を確認、note-publish は次回実公開でスモークテスト。
**設計の出発点**: 本セッションで note-browser.mjs の設計を完了済み（このセッションのトランスクリプト参照）。

### 1級土木 第2章 施工計画フロー図の自前SVG化（任意・低優先）🟢
**前提**: 施工管理・法規テキスト拡充（新規11本公開・guide結線・機械写真差替・フェーズ0.5法規深掘り）は 2026-07-04 完了（develop `c0971cb3f`）。残る tack-on 任意項目のみ。
**残**: `textbook-construction-plan-overview`（施工計画フロー図2.1）・`textbook-site-investigation`（施工方法決定フロー図2.8）を自前SVG化（現状フロー図なし）。図版標準＝figure-canvas-policy / create-svg 準拠。
**出典**: `docs/handoffs/_archive/2026-07-03-civil1-textbook-expansion.md`（フェーズ0.5「第2章フロー図SVG化も任意」）
