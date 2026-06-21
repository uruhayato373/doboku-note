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

### ガイド記事 品質改善（guide-qa 全96本監査の結果）🔴

**発端**: 2026-06-21、新設 `guide-qa`（ガイド軸5軸）で全 `group: guide` 96本を一括監査（19本 Opus + 77本 Sonnet、コスト配慮で Sonnet 移譲）。結果は **合格 1 / リライト候補 38 / 不合格 57**。軸別平均: 導入 1.85 / 読みやすさ 1.80 / ボリューム 1.88 / 導線 1.51 / モバイル 2.32（3点満点）。詳細レポート: `.tmp/guide-audit/report.md`（全96本の file:line + 修正案）。

**横断的な構造問題（優先度順・ROI高い順）**:
1. ~~**末尾 `## 参考資料` 違反（§20）**~~ ✅ **完了（2026-06-21、commit 5d378feeb）**: 41本から機械撤去（transformMdxFile、lint 12-2=0 検証済）。残: 末尾H2命名が承認パターン外の 12-3 LOW 10本（pe-comprehensive、cosmetic）は任意。
2. ~~**本文ボリューム不足（§25 3000字未満）**~~ ✅ **完了（2026-06-21、commit d6de9a6b5/c1509a8ab/126f162c6）**: パイロット2 + civil 22 + pe/concrete 8 = 計32本を加筆（Sonnet・自己lint検証＋機械再検証）。check-guide-length 緑（published guide 76件すべて ≥3000字）。**ゲートを pre-commit + CI(r2-audit.yml) に配線済**。
3. **読みやすさ（§24 文末単調 lint 15-1）— 21/96本**: 「〜ます。」3〜11連続。ユーザー指摘の「稚拙さ」の実体。
4. **導入リード（§26）— 18/96本**: 冒頭いきなり Callout・ベネフィット型でない・見出し直下に箇条書き（6-2）。

**進め方（コスト配慮）**: ①まず §20 参考資料撤去を機械支援スイープ（検出は lint 12-2、置換は `civil-textbook-rewriter` を Sonnet で）→ ②ボリューム加筆（§25 バーンダウンと統合）→ ③文末単調・導入リードはリライト時に同時対応。Generator は **Sonnet 指定**で回す（§5 準拠、Opus は親判断のみ）。

### ✅【完了 2026-06-21】ガイド記事 3,000字下限の加筆バーンダウン（32本）

**発端**: ガイド記事（`group: guide`）で本文 3,000 字未満の薄い記事が散見。`content-principles.md §25` で「ガイド記事は本文（frontmatter除外・空白除去後）3,000字以上」を必須下限に制定（2026-06-21）。

**方針**: 31本を §17（各 H2 セクション散文 200〜400字）に沿って加筆 → **全部 ≥3,000字になったら `check-guide-length` を pre-commit/CI（`r2-audit.yml`）に登録して赤落ちゲート化**。ゲート登録までは未配線（既存 main CI を割らないため）。

**進捗確認**: `npm run check-guide-length`（published 全件・赤落ち）/ `node scripts/check-guide-length.mjs --all`（draft 含む一覧）。

**対象31本**（字数昇順・残り字数。加筆は字数水増しでなく具体＝数値/体験/選択基準を足す。加筆後 `civil-construction-review` で5軸再確認）:

- [ ] 1626 civil-construction-1/guide-textbooks（あと1374）
- [ ] 1745 civil-construction-2/guide-study-method（あと1255）
- [ ] 1748 civil-construction-2/guide-overview（あと1252）
- [ ] 1822 civil-construction-1/guide-grade-comparison（あと1178）
- [ ] 1829 civil-construction-1/guide-career-agents（あと1171）
- [ ] 1867 civil-construction-2/guide-textbooks（あと1133）
- [ ] 1971 civil-construction-2/guide-quality-management（あと1029）
- [ ] 2019 civil-construction-2/guide-schedule-management（あと981）
- [ ] 2056 civil-construction-1/guide-difficulty（あと944）
- [ ] 2131 pe-construction/sentaku-kamoku-kakiwake（あと869）
- [ ] 2142 civil-construction-2/guide-concrete-key-points（あと858）
- [ ] 2152 civil-construction-2/guide-earthwork-key-points（あと848）
- [ ] 2168 civil-construction-2/guide-law-key-points（あと832）
- [ ] 2215 civil-construction-1/guide-study-method（あと785）
- [ ] 2298 concrete-chief-engineer/guide-overview（あと702）
- [ ] 2312 pe-construction/nanido-goukakuritsu（あと688）
- [ ] 2419 civil-construction-2/guide-job-reality（あと581）
- [ ] 2426 pe-construction/gyoumu-keireki-hyou（あと574）
- [ ] 2429 civil-construction-2/guide-salary（あと571）
- [ ] 2444 pe-construction/gakushuu-jikan-schedule（あと556）
- [ ] 2453 civil-construction-2/guide-study-plan（あと547）
- [ ] 2455 civil-construction-2/guide-career-change（あと545）
- [ ] 2513 pe-construction/hissu-kamoku-kaitourei（あと487）
- [ ] 2608 pe-comprehensive-management/course-selection-guide（あと392）
- [ ] 2696 civil-construction-1/guide-study-plan（あと304）
- [ ] 2751 civil-construction-1/guide-salary-up（あと249）
- [ ] 2808 civil-construction-1/guide-career-salary（あと192）
- [ ] 2855 pe-construction/secondary-study-method（あと145）
- [ ] 2868 civil-construction-1/guide-market-value（あと132）
- [ ] 2885 civil-construction-2/guide-career（あと115）
- [ ] 2969 civil-construction-2/guide-exam-overview（あと31）

**ゲート登録（最終ステップ・31本完了後）**: `scripts/install-pre-commit.mjs` に `check-guide-length.mjs --staged` を追記 → `npm run pre-commit:install`、`r2-audit.yml` に `npm run check-guide-length` を追加。

---

### 過去問・テキストの図クロップ品質整備 🟡

**残タスク**（完了分は git 履歴: 2級 r03/r07 図クロップ=`c213be9af`／1級ネットワーク工程表 h26・h27・h29-b 補完=`6f296bf70`〜。緊急度高だった r03/r07 の画像ゼロは解消済）:

1. 2級 primary 残り（r04-r06・前期等）の図参照を点検・補完
2. pe-first-stage 欠落疑い 4本を確認・補完
3. 図クロップ**品質監査**（欠落でなく品質）— 1級 primary 16本＝`civil-exam-figure-auditor`／1級 textbook 10本＝`civil-construction-qa`。優先度低

**ソース PDF**: `docs/textbook/{１級,２級}土木施工管理技士/`（年度別・論点別／正答付き）。`.claude/pdfs/` だけ見て「PDF不在」と早合点しない（2026-06-20 訂正）。手順=pdftoppm 200dpi→magick crop+trim→webp(q80)。**過去問の問題図に解答情報を入れない**（CP強調図は解説 `<details>` 内へ＝[[exam-problem-figure-no-answer]]）。

---

### 1級土木 テキスト画像：web検索写真を PDF図クロップ＋Gemini カラー化で差し替え 🟢

**背景**: textbook 系の一部ページは、本来 PDF（公式テキスト/問題集）の図をクロップすべきところを **web 検索のブランド名付き写真（.jpg）で暫定代替**している。著作権が不明確なため、**PDF から図をクロップし直し → Gemini API でカラー化 → web 写真を差し替える**（旧記載の「ChatGPT GPT-4o」は誤り、Gemini に統一）。

**ソース PDF**: `docs/textbook/１級土木施工管理技士/`（`テキスト（土木一般編）/第２章_建設機械.pdf`・`問題集/`等）。※ [[1級・2級土木施工管理技士 ソースPDF]] 参照。

**対象A＝web検索写真の差し替え（優先・著作権対応）— 8ページ・約24枚**（2026-06-20 現物照合）:
| ページ | web写真.jpg |
|---|---|
| `textbook-crane` | 7 |
| `textbook-grader-compaction` | 5 |
| `textbook-distance-angle` | 4 |
| `textbook-transport-machinery` | 3 |
| `textbook-scraper` | 2 |
| `textbook-leveling` / `textbook-loader` / `textbook-tractor-bulldozer` | 各1 |

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

### pe-construction カテゴリページのキーワード重複整理 🟡

**発端**: `https://doboku-note.com/category/pe-construction`（公開記事 121本）

**問題**: 同一テーマを「論点記事」と「キーワード集」の2種類で別 slug に作っているため、カテゴリページで見ると重複して見える。読者から区別しにくく、内部リンクも分散する。

**重複グループ（必須科目I テーマ別）**:

| テーマ | 論点記事 slug | キーワード集 slug |
|---|---|---|
| 防災・国土強靱化 | `bosai-kokudo-kyoujinka` | `bousai-genseigai-ronbun-keyword` |
| インフラ維持管理 | `infra-roukyuuka-iji` | `iji-kanri-ronbun-keyword` |
| 担い手確保・DX | `ninaite-kakuho-seisansei`・`kensetsu-dx` | `ninaite-dx-ronbun-keyword` |
| カーボンニュートラル | `carbon-neutral-kensetsu` | `datsutanso-kankyo-ronbun-keyword` |
| 地域づくり | `kokudo-keisei-chiiki` | `chiiki-dukuri-ronbun-keyword` |

**その他の問題**:
- slug 表記ゆれ: `bosai` vs `bousai`（ヘボン式と訓令式混在）、`chiiki-dukuri`（`tsukuri` の誤記の可能性）
- 選択科目キーワード集（`*-ronbun-keyword`）が river-coast・road・urban-planning の3科目のみで不完全（geotechnical・tunnel・railway 等は欠落）
- 受験ガイド系: `secondary-study-method`（勉強法）と `gakushuu-jikan-schedule`（勉強時間）がターゲット完全一致

**整理の方針（案）**:
- **A. 統合**: 各テーマの2記事を1本に合体（slug は論点記事側を維持、キーワード集をリダイレクト）
- **B. 差別化明確化**: タイトル・description で「論点：論述の骨格」vs「キーワード：用語リスト」を明示し、相互リンクを張る
- **C. カテゴリページでグループ表示**: 同一テーマの記事を「シリーズ」としてまとめて表示する UI を実装

**ユーザー判断が必要**: A（削減）か B（並存・整理）か。SEO 的には統合が有利、コンテンツ量的には分離が有利。

**着手前に確認**:
- 各記事の GSC インプレッション・クリック数（検索流入が多い方を残す）
- 内部リンク被リンク数（backlinks.json で確認）

---

### トップページ下部（note 教材・アフィリ・書籍）のデザイン統一 🟡

**発端**: `https://doboku-note.com/` のフッター直上に3セクションが後付けで積み重なっていてサイトデザインと不整合。

**現状の問題点**（`src/app/page.tsx` L142-172）:

```
Hero → ExamCards → LatestArticles → AboutSection
↓ ここから後付けのアドホックセクション
[note 有料教材]  MagazineSidebarCard（サイドバー用コンポーネント）を max-w-sm 左寄せで配置
[アフィリエイト] SchoolAffiliate をそのまま max-w-3xl に配置
[参考書籍]       BookSection "総監受験の参考書籍"（トップなのに総監限定タイトル）+ BookCard
↓ Footer
```

1. **`MagazineSidebarCard` をメインカラムに使っている** — サイドバー用コンポーネントが本文幅に配置されて `max-w-sm` 左寄せになり、前後のフル幅セクションと不整合
2. **セクションヘッダーのスタイルがバラバラ** — "Premium" ラベル（`font-mono text-[10px]`）が他セクション（Hero・ExamCards 等）の見出し設計と異なる
3. **参考書籍のタイトルが資格固定** — "総監受験の参考書籍" はトップページ（全資格横断）のコンテキストに不適
4. ~~**`BookCard` は休止中** — アフィリエイト審査未通過なのに表示されている~~ → **✅ 2026-06-20 解消**（`AFFILIATE_LINKS_ENABLED=false` で homepage 含め参考書籍枠は非表示済。残るは下記「やりたいこと」のデザイン統合のみ）

**やりたいこと**:
1. 3セクションをまとめて **1つの "教材・リソース" セクション**に統合し、サイトの他セクションと同じデザインシステム（デザイントークン・余白・見出し階層）で設計し直す
2. `MagazineSidebarCard` → トップページ用の **横幅フルの CTA カード**（`MagazineFeatureCard` 等・新規 or 既存コンポーネント流用）に置き換え
3. `BookCard` はアフィリエイト審査通過まで非表示（「BookCard 休止対応」バックログと同時対応）
4. スクールアフィリエイト（`SchoolAffiliate`）も同セクション内に統合して視覚的なまとまりを作る

**実装ファイル**:
- `src/app/page.tsx`（L142-172 を再設計）
- `src/components/ui/MagazineSidebarCard/`（または新規 Feature 版コンポーネント）

**備考**: デザイン反復は develop/ローカル(:3020)で実施し、ユーザーが確認してから develop push（毎回本番 deploy しない）。

---

## 2. UI / UX

### AuthorCard の資格別カスタマイズ + 右サイドバー配置 🟡

**問題**: `AUTHOR.noteLabel` / `AUTHOR.noteUrl` が全資格で総監リンクにハードコード（`src/config/author.ts`）

**やること**:
1. `AuthorCard` に `category` prop → `noteByCategory` マップで出し分け
2. 右サイドバー最上部に `AuthorCardCompact`（新規）を sticky で配置

**実装ファイル**:
- `src/config/author.ts`（noteByCategory マップ追加）
- `src/components/ui/AuthorCard/AuthorCard.tsx`
- `src/components/ui/AuthorCard/AuthorCardCompact.tsx`（新規）
- `src/app/docs/[...slug]/page.tsx`

---

### カテゴリページの記事一覧をブログカード化 🟢

記事一覧を `BlogDocCard`（サムネイル OGP 画像 + タイトル + 概要）に刷新。右サイドバー全資格拡張は完了済（`hasSidebar` 化）。参考: ソーシャルPLUS ブログ（`docs/todo/reference-sites.md`）。実装: `src/app/category/[slug]/page.tsx`（DocCard → BlogDocCard）。

---

### 書籍アフィリエイト（BookCard）— 審査通過後に再有効化 🟡

アソシエイト審査通過後に `src/config/affiliate-flags.ts` の `AFFILIATE_LINKS_ENABLED` を `true` に戻す（現在 false で `BookCard`/`BookSection` を枠ごと非表示・commit `284b840f5`）。再有効化時は「トップページ下部デザイン統一」と連動して再設計。

---

## 3. 収益化（Kindle / note PDF）

### Kindle 出版（KDP）＋ note PDF 販売 — 択一式過去問集 全資格展開 🟢

**既存作業**: 戦略書 `docs/project/01_戦略/08_Kindle出版戦略.md`（3シリーズ設計済み）、スクリプト `scripts/build-takuitsu-reconstruct.mjs`（1ソース → EPUB/Markdown/印刷 HTML）完成。ハンドオフ: `docs/handoffs/2026-06-09-takuitsu-kindle-epub.md`

**3シリーズ設計**:

| シリーズ | 内容 | 状態 |
|---|---|---|
| A — 1級土木 論点別 | A-01〜A-06（安全/法規/施工/環境/品質/工程）¥350〜¥490 | A-01 EPUB試作完了 |
| B — 技術士総監 年度別 | B-01〜B-05（R03〜R07 各20問）¥350 | ジェネレータ設計待ち |
| C — 建設部門 二次模範解答 | C-01〜C-03（道路/河川/都市計画）¥690 | Web¥15k達成後 |

**次の一手**:
- (a) 表紙画像の用意（EPUB 未内蔵・KDP Cover Creator か JPEG 1600×2560）
- (b) 論点まとめの剪定（複合設問由来の混入を人手校正）
- (c) A-02「法規」の THEMES 定義追加 → EPUB 生成
- (d) epubcheck（Java 環境が必要）
- (e) KDP アカウント作成・税務情報（W-8BEN）登録

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

## 5. SNS・マーケティング

### content-angle P-1 カルーセルパイロット 🟢

**出典**: `docs/handoffs/2026-06-09-content-angle-implementation.md`

**残作業**:
1. `ig-carousel-writer` で `angle: counter`（反論切り口）の slide-data.json を執筆（source: note 記事「キーワード集が点にならない理由」）
2. `ig-post-create` で PNG 化 → `ig-carousel-qa` で採点
3. 結果が過去問パック平均を上回った場合のみ Phase 2 へ（angle-slides.mjs・tokens.json 等）

---

## 6. インフラ・セキュリティ

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
- cd-essay-magazine の note カバー画像生成 → note 投稿（Mac）
- `npm run refresh-indexes` 実行
