---
title: 試験別コンテンツ整備方針 + レビュー視点
---

# 試験別コンテンツ整備方針 + レビュー視点

doboku-note は複数の資格試験を扱うが、試験ごとに「**何を / どこまで / どの粒度で書くか**」が異なる。デザインの一貫性は保ちつつ、コンテンツ密度・忠実性・出題反映度は試験ごとに方針を変える。

**いつ読むか**: PDF→MDX 変換時（`/pdf-to-mdx --exam {civil-construction-1|civil-construction-2|cem|general}`）、過去問変換時（`/exam-questions-import --exam {civil-primary|civil-primary-2|civil-secondary|civil-secondary-2|pe-primary}`）、品質レビュー時（`/improve-article --mode verify`, `/review`）、新資格追加時。

このファイルは **執筆フェーズ（Generator 側）** と **レビューフェーズ（Evaluator 側）** の両方の判断基準を統合している。

---

## Part 1: 執筆フェーズ — 試験別コンテンツ整備方針

### 試験別の整備方針差分

| 観点 | 1級土木 textbook | 1級土木 guide | 2級土木 guide | 2級土木 過去問 | 総監キーワード | 総監過去問 |
|---|---|---|---|---|---|---|
| **目的** | 教科書の電子化 | 出題傾向の要約 | 基礎範囲の解説（独自執筆） | 公開過去問の逐条解説 | キーワード集の概念解説 | 過去問の解説 |
| **真実源** | 教科書 PDF 原本 | 過去問+編集判断 | 過去問+編集判断（2級向け基礎） | 過去問 PDF | キーワード集2026 | 過去問 PDF |
| **コンテンツ密度** | 高（網羅95%以上） | 中（ポイント抽出） | 中（基礎重視） | 高（逐条+解説） | 低（要約中心） | 高（逐条+解説） |
| **典型的な長さ** | 5,000-15,000字 | 2,000-5,000字 | 2,000-4,000字 | 第1次3,000-5,000字 / 第2次4,000-8,000字 | 800-2,500字 | 3,000-8,000字 |
| **図の標準量** | 多数（断面・配筋・施工写真） | 少数（重要箇所のみ） | 少数（基礎の図のみ） | 原本準拠（あれば） | ほぼゼロ（テキスト中心） | 原本準拠（あれば） |
| **数式** | 頻出（W/C 比・配合・力学） | 限定的 | 基礎数式のみ | 問題文に応じて | 少ない | 問題文に応じて |
| **Generator スキル** | `/pdf-to-mdx --exam civil-construction-1` | 手動編集 | 手動編集 + `guide-rewriter`／`guide-qa` サイクル | `/exam-questions-import --exam {civil-primary-2\|civil-secondary-2}` | `/keyword-page` | `/pdf-to-mdx` `/pdf-to-mdx --exam cem` |
| **Evaluator エージェント** | `civil-construction-qa` (textbook mode) | `civil-construction-qa` (guide mode) | `civil-construction-qa` (guide mode、category フィルタ拡張済み) | `content-qa` | `cem-qa` | `content-qa` |

**2級土木の補足**:
- **前期/後期の区分**: 2級は第1次が前期（6月）/後期（10月）の2回開催。過去問 MDX は `primary-{year}-{zenki\|kouki}` 命名（1級の `primary-{year}-{a\|b}` と命名規則が異なる）
- **guide 方針**: 1級ガイドの流用ではなく独自執筆（読者層・難易度が異なる、SEO 重複回避）。10本のコア guide（`guide-2-strategy`, `guide-2-experience-writing-basics` 等）を Phase 2 で整備
- **経験記述採点基準**: 1級より緩い（主任技術者視点）が、5要素（現場状況→課題→検討→処置→評価）の網羅は同水準で書く

### 試験別の判断ガイド

#### 1級土木 textbook（`group: textbook`）

- **整備の目標**: 元教科書 PDF をモバイルで読める形に電子化する
- **網羅率**: PDF の章節見出しを **95% 以上** カバーすること（切り捨てしない）
- **図**: PDF にある図はすべて取り込む。300dpi 以上、natural ≥ display を維持
- **数式・規格表**: 教科書通りに正確に転記。KaTeX で記述
- **執筆ツール**: `/pdf-to-mdx --exam civil-construction-1` を使い、Phase 5 で `/improve-article --mode verify` を必ず実行

#### 1級土木 guide（`group: guide`）

- **整備の目標**: 過去問データに基づき、受験者が「ここを押さえれば得点できる」要点を抽出
- **網羅率**: 教科書全部ではなく、**頻出トピックのみ**（出題頻度表を冒頭に置く）
- **過去問バックリンク**: 主要セクションごとに対応する過去問へのリンクを張る（双方向）
- **図**: 重要な概念のみ図示。過剰に貼らない
- **執筆ツール**: 手動編集（Generator スキルなし）。テンプレートとしては `essay-exam-strategy` 等を参照

#### 過去問 共通: 原典視覚突合の必須化（最重要品質ゲート、2026-05-28 追加）

- **生成時ハルシネーション対策**: PDF→MDX 生成（特に一次選択式の画像ベース PDF）は**問題文・選択肢を捏造しやすい**。2級土木 過去問15本の初稿で約240箇所の相違（問題文取り違え・設問極性逆転・選択肢の意味反転・別問題混入）が発生
- **正解番号一致は品質保証にならない**: 正解番号が正答PDFと一致していても問題文・選択肢が捏造されているケースが多発。content-qa 構造採点（3.0満点でも問題文4問捏造の実例）・verify-pdf-mdx 網羅率でも検出不可
- **唯一の防御 = 全問原典視覚突合**: 生成後に問題 PDF を PyMuPDF で 250-300dpi 画像化し、問題文・選択肢・設問極性（適当な/適当でない）・正解・❌/✅ を1問ずつ照合。OCR品質に関わらず必須（公式PDFの R07 でも46問捏造）。詳細手順は `exam-questions-import/SKILL.md` Step 5.7、memory `feedback_exam_pdf_cross_reference`
- **PDF 取得時の年度確認**: 再配布サイト取得 PDF はファイル名と表紙年度の入替りがあり得る（2級R05/R06事例）。import 前に表紙年度を視覚確認。memory `feedback_pdf_filename_year_verify`

#### 1級土木 primary（`group: primary`、一次過去問）

- **整備の目標**: 公開済み一次検定 過去問を逐条解説する
- **構造**: 問題ごとに H2 `## 問題 No.N`、解答は `<details>` で開閉式、各問題に `<ExamPoint>` 1 個（最大 1 個）
- **ExamPoint ルール**: `summary` 30〜50 字（本質）、`items` は体言止め 1〜3 個（≤60 字、句読点禁止）。詳細は [content-principles.md §5「items の禁止パターン」](./content-principles.md) 参照
- **過去歴**: `migrate-civil-answer-style.mjs` の `generateExamPoint()` バグで約 1,440 個の壊れた items が生成された（2026-04-24）。修復は `civil-exampoint-restorer` Generator サブエージェントを使う（2026-05-16 起動）
- **執筆ツール**: 既存リライトは `civil-exampoint-restorer`、新規変換は `/pdf-to-mdx --exam civil-construction-1`

#### 1級土木 secondary（`group: secondary`、二次過去問）

- **整備の目標**: 公開済み二次検定 過去問の解答例・ポイント・各設問解説を補完する
- **構造**: 問題ごとに H2 `## 問題 N`、各問題に `<details>` ブロックで `### ポイント` → `### 解答例` → `<ExamPoint>`（最大 1 個）
- **著作権配慮（最重要）**: 試験元 = 公益財団法人 全国建設研修センター（CECC）。問題文の転載は公益目的・出典明示で OK、**解答・解説は著者独自表現で再構成（公式解答例の逐語転載禁止）**
- **問1 経験記述（1級・2級 共通）**: 詳細な「書き方ヒント」「解答例テーブル」は**置かない**（経験記述は希少コンテンツ＝note 過去問模範答案集 `civil-{1,2}-pastexam-essay` が売る価値。サイトで詳細な書き方を配るとカニバる）。`### ポイント`（5要素・失格回避の一般指針）は残し、その直後に `### 経験記述は「自分の答案」が合否を分ける` 導入段落＋記事中CTA `<MagazineCard id="civil-{1,2}-pastexam-essay" utmContent="secondary-r0X-q1" />` を問1直下に配置。メンバーシップ開始後はこのCTA位置を伴走導線に差し替える（`content/note/1級・2級土木/noteコンテンツ計画.md` §7.3）。**問2以降の択一・穴埋め・用語の客観解は `### 解答例` を維持**（コモディティ＝SEO/AdSense資産、カニバらない）。2026-06-09 方針確立（1級・2級 secondary-r03〜r07 全10ページ適用済）
- **出典表記**: ファイル末尾 `**関連コンテンツ**` の直前に `## 出典` セクション必須（CECC・著者独自再構成の明示）
- **執筆ツール**: `civil-secondary-exam-writer` Generator サブエージェント（2026-05-16 起動、AdSense 再申請対応）
- **lint**: 9-12 で `## 問題` 数 > `<details>` 数（解答欠落）を機械検出

#### 総監キーワード（`group: keyword`）

- **整備の目標**: キーワード集2026 の各キーワードを **1 ページ 800-2,500 字** で完結させる
- **網羅率**: 教科書ではなくキーワード集を真実源とし、「冒頭定義 → サブ概念 → 総合技術監理における位置づけ → 参考資料」の構造で要約
- **コンポーネント原則**: ExamPoint 最大 2 個、参考資料は公的 + 民間の両方必須、過去問への双方向バックリンク
- **図**: 原則ゼロ。テキストとコンポーネントで表現
- **執筆ツール**: `/keyword-page` スキル
- **反映状況の監査**: 総監標準テキスト5管理と公開ページ（ハブ＋個別）の反映（A〜G）を突合する再監査は `npm run audit-pe-textbook-keyword-coverage`（read-only・決定的）。完全対応表と実装判断は `.claude/state/pe-textbook-keyword-coverage.json` を真実源とする

#### 総監ガイド（`group: guide`）

- **整備の目標**: 受験戦略・学習計画・俯瞰ハブとして、サイト内回遊と note 有料コンテンツへのコンバージョンを担う
- **網羅率**: 教材原典を網羅する必要はない。出題傾向・学習導線・5管理トレードオフ俯瞰など、独自編集の付加価値で構成
- **典型的な長さ**: 2,000-8,000 字（俯瞰系は長め、戦略系は短め）
- **構造**: キーワードページ専用セクション（`## 総合技術監理における位置づけ` / `## 参考資料` / `## 参考文献`）は **使用禁止**。末尾は Type-1「○○の選択肢」型（戦略・実務手順系）または Type-2「次のステップ」「関連リソース」型（俯瞰・分析系）。詳細は [content-principles.md §20](./content-principles.md)
- **外部リソース**: 公的資料への離脱を最小化（必要なら本文中インラインリンクで言及、末尾セクション化禁止）。コンバージョン地点として設計
- **執筆ツール**: 手動編集 + `group: guide` 品質サイクル（`guide-rewriter` 生成／`guide-qa` 評価／`guide-fact-checker` 事実照合）。末尾テンプレは [content-principles.md §20](./content-principles.md) 準拠
- **Evaluator**: 未割当（lint-mdx-mobile.mjs カテゴリ 12 で構造違反を機械検知。Phase 2 で `guide-qa` 検討）
- **lint**: 12-1（位置づけ混入）/ 12-2（参考資料・参考文献混入）/ 12-3（末尾 H2 が承認パターン外）

#### 総監過去問（`group: past-exam`）

- **整備の目標**: 公開済み過去問を逐条解説する
- **網羅率**: 設問単位で 100%（漏らさない）
- **構造**: 設問ごとに H2、解答・解説は `<details>` で開閉式。`<RelatedKeywords>` で関連キーワードへ
- **執筆ツール**: `/pdf-to-mdx` `/pdf-to-mdx --exam cem` `/pdf-to-mdx --exam civil-construction-1`
- **図版反映時の caption / alt**: **問題文に無い情報を一切追加しない**。構造・関係・分類など受験者が判断すべき情報を漏らさない。詳細・NG/OK 例は [.claude/knowledge/reference/image-policy.md §過去問図の caption / alt](./image-policy.md#過去問図の-caption--alt--問題文に無い情報を絶対に追加しない) 参照（2026-04-26 追加、Issue #128 起因）

---

## Part 2: レビューフェーズ — コンテンツ別レビュー視点

試験ごとに「正しい状態」の定義が異なるため、レビュー時に評価軸を自動で切り替える。新資格を追加する際の指針にもなる。

| 観点 | 総監キーワード（cem-qa）| 1級土木 textbook（civil-construction-qa）| 1級土木 guide（civil-construction-qa）|
|---|---|---|---|
| **真実源** | キーワード集2026 + content-principles.md | 元の教科書 PDF 原本（章節構造） | 複数 PDF を編集統合した記事 |
| **テキスト網羅性** | 不要（要約が正解） | **95% 以上必須**（教科書を切り捨てない） | 不要（出題範囲を抽出） |
| **図の標準量** | **ほぼゼロ**（テキスト中心） | **多数**（断面・配筋・施工写真） | 少なめ（重要箇所を図示） |
| **図の検証** | しない（False Positive 多発する） | **視覚比較 + 寸法 + 切れ・ノイズ検出** | あるものだけチェック |
| **コンポーネント原則** | ExamPoint 最大2個・特殊ルール多数 | 一般 MDX ルール（特殊なし） | guide 固有要素（出題頻度表など） |
| **数式** | 少ない | **頻出**（W/C 比・配合計算・力学） | 限定的 |
| **表** | 2軸比較のみ厳格 | **規格表・配合表など 4列以上も許容** | 出題頻度表 |
| **参考資料** | 公的＋民間の両方必須 | 教科書 PDF が原本 | 公的資料 + 過去問へのリンク |
| **過去問バックリンク** | 双方向必須 | 不要 | **過去問への誘導が重要** |
| **モバイル視認性** | review-mobile 厳格 | 図のレスポンシブが課題 | review-mobile 適用 |

**判定方法**: `/improve-article --mode verify` スキルが MDX の `category` と `group` から自動判定し、適切な Evaluator エージェントへ振り分ける（cem-qa / civil-construction-qa / content-qa）。詳細は各エージェント定義 `.claude/agents/*.md` を参照。

**機械ルールの資格×種別マトリクス**: 上表の「表」「モバイル視認性」行など機械検知可能なルールの重大度・資格別の有効/無効は **`.claude/config/content-rules.json`** が SSOT（実装は `lint-mdx-mobile.mjs`）。例: 上表の「1級土木 textbook＝規格表・配合表など4列以上も許容」は同 config の `overrides.civil-construction-{1,2}.textbook` で 1-3/1-4 を無効化して機械化済み。**civil-construction-1 の `secondary` にも同免除を適用**（2026-07-10 品質サイクル決定）: 二次検定の解説/基礎ページ（secondary-*-basics 等）は textbook 転載の規格表（JIS A5308 17列・土量計算 12列・締固め機種 10列 等）を含み、箇条書き化すると 2 次元参照性を失うため。ただし**散文をセルに詰め込んだだけの表**（説明文 100〜200 字/セル）は免除対象でなくリライトで解体する。全量ラチェット（`npm run check-content-quality` / 週次 `r2-audit.yml`）が `fullScan` ルール群で新規違反を赤落ちさせ、既存違反は baseline で grandfather する。リライト優先度は `.claude/state/quality/latest-report.md`（GA4 人気度順）。

### 過去問の原典照合（単一正答が崩れたとき）

過去問（primary）で**単一正答が成立しない／複数正答に見える**ときは、`past-exam-qa` の内部照合（条文・統計ロジック）だけで断定せず、**必ず原典（実際の試験問題PDF）と照合**する。転記ミスは正答キーだけでなく、**設問文・全選択肢の本文そのものが別問題に化けている**ことがある（答え番号は合っているのに本文が別物＝civil-1 `primary-h27-a`/`primary-h28-a` の No.61 港則法で実証、2026-07-10）。`past-exam-rewriter` は本文化けを直せない（統計・条文推測での書き直しは捏造）ので、**親が原典照合して本文を差し替える**。

- **原典（civil-1 一次）**: `content/sources/textbook/１級土木施工管理技士/過去問/` は **H30〜R07 のみ**。H26〜H29 の問題A/B原本と**公式正答肢表**は touhokugiken.com が無料公開（問題=`/answer/{h27|h28…}/…-1doboku-a.pdf`〔H27は`h27-1doboku-a.pdf`・H28は`1doboku-a.pdf`と命名ゆれ〕、正答=`…-kaitou.pdf`、索引=`/answer.html`）。
- **PDFの読み方**: WebFetch はPDFバイナリを読めない → 保存された PDF を `pdftotext -layout` で直読み。**正答肢表は画像テーブル** → `pdftoppm -png` で PNG 化して目視。
- **条文の許可/届出**: e-Gov はSPAで WebFetch 不可 → `hourei.net` / `lawplayer.com` の静的ミラーで条番号を確認。
- 詳細な失敗モードと入手経路は memory [[civil1-primary-answer-key-errors]]、進捗は `.claude/todo/backlog.md`「全資格 品質採点カバレッジ トラック」Phase2分類1。

---

## Part 3: 全試験で共通のデザイン制約

試験を問わず、以下は **必ず統一** する。これによりサイト全体のデザイン一貫性が保たれる:

- **frontmatter スキーマ**: `title`, `description`, `category`, `tags`, `group`, `published`, `publishedAt`（必須項目）
- **MDX コンポーネント**: `<Callout>`, `<ExamPoint>`, `<CustomUnorderedList>`, `<RelatedKeywords>`, `<Timeline>`, `<PdcaCycle>`, `<details>` を試験横断で使用
- **モバイル視認性ルール**: 表は2軸比較のみ、4列以上禁止、計算手順は番号付きリスト、3列以上の表はセル15字以内
- **数式**: KaTeX 一択
- **図表**: SVG / PNG
- **画像配信**: R2 経由 `/posts/{slug}/img/` パスで参照
- **URL**: フラット `/docs/{slug}` 設計
- **見出し階層**: H1 = ページタイトル、H2-H4 = 本文構造
- **絵文字禁止**: 装飾絵文字は本文に使わない（Callout の type で表現）
- **MDX 書き込み**: `.claude/scripts/lib/mdx-io.mjs` 経由で改行コード保持

詳細は [content-authoring.md](./content-authoring.md) を参照。

---

## Part 4: 新資格を追加するときの手順

1. Part 1 の「試験別の整備方針差分」表に新しい列を追加して整備方針を決定
2. Part 2 の「コンテンツ別レビュー視点」表にも対応する列を追加
3. 必要なら `{exam-id}-pdf-to-mdx`（Generator スキル）と `{exam-id}-qa`（Evaluator エージェント）を新設
4. `/review` のディスパッチ表（`.claude/skills/dev/review/SKILL.md`）に行を追加
5. `/improve-article --mode verify` のルートテーブル（`.claude/skills/authoring/improve-article --mode verify/SKILL.md`）に行を追加
6. このファイル（exam-content-policy.md）と `agents-registry.md` を更新
7. **トップページの資格カードに追加**（公開＝サイトに出すなら必須）: `src/config/home-exam-cards.json` にカード（`slug`/`order`/`label`/`en`/`subtitle`/`description`/`nextExam`/`stats`）を追加する。`nextExam` は**フォールバック文字列**で、実際の表示は `.claude/config/exam-calendar.json` の未来イベントから `src/lib/exam-schedule.ts` が「次回 日付 名称 ＋ あと N 日」を算出する（2026-09-03〜。未来イベントが無い資格だけ `nextExam` を出す）。新資格は exam-calendar にも登録する。**ナビ（`categories.json`）と別管理**なのは、カードのコピーがナビ用と意図的に異なるため（例: ナビ「技術士第二次試験（建設部門）」⇄ カード「技術士（建設部門）」）。「どの資格をトップに出すか」は `categories.json` の `visible`（≠false）/`variant`（≠reference）が真実源で、両者の整合は `npm run check-home-exam-coverage`（pre-commit / CI ゲート）が強制する。**これを忘れると、公開済みコンテンツがあってもトップの資格カードに出ない**（2026-06-15 pe-first-stage 21本が該当＝ナビからのみ到達可能だった）。意図的にトップへ出さない資格は `categories.json` で `visible:false` にする。
8. **SNSリンクハブに追加**: `src/app/links/page.tsx` の `EXAM_CARDS` と `EXAM_GROUPS` に追加する。L2もくじ・商品が未整備ならサイト行だけを表示する。
9. **OGP 画像を生成**（公開前必須）: `npm run ogp -- --all`（未生成分のみ生成）→ 新規 `ogp.png` を pathspec commit。**新カテゴリは OGP が 0 枚から始まる**ため、これを忘れると `og:image` が R2 で 404 になり、**note / X / Facebook 等の外部リンクカードが生成されない**（2026-06-12 pe-construction で全114本が該当）。`published:false` のドラフトは仕様上スキップされる＝公開化（`published:true`）のタイミングで再実行する。`ogp.png` は `r2-sync.yml` の path フィルタ（`**/ogp.png`）経由で main push 時に R2 同期される。詳細 → [measurement-incidents.md](./measurement-incidents.md)「2026-06-12 OGP 404」

### 新資格メモ: コンクリート診断士（`concrete-diagnostician`、2026-05-30 新設 → 2026-07-31 公開）

- groups = guide / textbook / primary。variant=civil / order=2.6。**2026-07-31 に 18 記事（ガイド4・テキスト6章・演習問題8）を公開**（`visible` 解除・`home-exam-cards.json` order 7・`category-curriculum.json` に受験ガイド4本）。テーマ色は `--exam-concrete-diagnosis`（`#6E3A8C` 紫。note カバー/OGP と同一の資格アイデンティティ色）。
- **テキスト**: 原典（技報堂スキャン）の文を写さず独自散文で合成。図は当初スキャンのクロップだったが、**2026-07-31 に 25 枚を全数置換**（自作 SVG 21・生成画像 3・本文の表と重複のため削除 1）。書籍ページ撮影の webp はゼロ。
- **択一（`primary-exercise-01〜08`・98問）**: 当初は原典を逐語転記した「過去問演習」だったが、**設問文・選択肢そのものが他者著作物の複製**であり図を差し替えても公開できないと判明したため、**2026-07-31 に論点だけ保って全 98 問を自作の設問・選択肢・解説へ書き換え、「演習問題」として公開**した。原典由来の枠組み（厳選101問より問題N〜M）と `past-questions` タグは外している。この転換により、図の材料不足（写真が設問の核である約27問・クロップ切れ・原典スキャンの消失）と、正答の確度が低い42問分の注記が同時に解消した。
- **原典照合できない数値は出題しない**。JIS の規格値を問う設問は原理を問う形に、JIS 改正の年代順は塩化物総量規制の考え方に差し替えた。
- **note 連動**: 記述式マガジン `cd-essay-magazine`（8記事・¥1,980／単品¥500）を **2026-07-31 公開**（`m/mf2a132408b6f`）。サイト側の CTA は `guide-essay` の冒頭（top）と `textbook-assessment` / `textbook-repair` の MDX 内 `<MagazineCard>`。**診断士は全記事が本文 8,000 字未満で中間 CTA の発火条件を満たさず、concrete 系は非 HUB 資格でもくじタイルも出ない**ため、この 2 経路以外では CTA が出ない（発火条件の一覧は `src/lib/magazine-placement.ts` の診断士ブロックのコメント）。
- **残課題**: 98 問の技術内容の人手レビュー（公開済みのため、誤りが見つかれば修正して再デプロイ）→ `.claude/todo/backlog.md`。
- 経緯の詳細は git 履歴（handoff `2026-07-31-concrete-diagnostician-launch.md` は抽出のうえ削除済み）。スキャン整備期の経緯は旧 handoff `2026-05-30-concrete-diagnostician.md`（同）。

### 新資格メモ: コンクリート主任技士（`concrete-chief-engineer`、2026-05-30 公開）

- groups = guide / textbook / primary（第1次/第2次区分なし、四肢択一＋小論文の単一試験）。variant=civil / order=2.5。
- **公開構成**: ガイド3 + 過去問8分野（材料/性質/耐久性/配合設計/製造QC/施工/製品/構造設計）+ テキスト8分野 = 計19記事 published:true。診断士と異なり**出荷済**。差は「①問題の図依存率が低く逐語転記が安定 ②正答が各問末尾 [正解(n)] にあり確定可能」だったこと。
- **過去問の年度範囲（2026-07-17 拡張）**: **平成24〜令和5年度・計303問**（分野別8記事に `### {年度} 問題N` で横断収録）。2026-07-17 に H24（26問）・H25（12問）を 2022年版底本から追加。**H24/H25 は OCR 品質がまだらで、選択肢文が復元不能に破綻した問題・公式解答表と技術判断が食い違う問題は収録せず skip**（H25=18問 skip・H24=4問 conflict skip。一覧は backlog）。正答は各年度の公式解答表から機械照合済み。**残の年度拡張余地**: R6・R7（原典スキャン未入手）、H25/H24 の skip 分（原典で復元できれば補完可）。表記ゆれ: 既存に「令和1年度」と「令和元年度」の混在あり（同一年・要統一）。
- **図依存問題の図クロップ手法（実証済）**: 事前レンダリング済み頁 PNG をサブエージェントに読ませ、図の外接矩形を**「頁全体に対する割合 x/y/w/h」で返させる**→ 親が `magick -crop {w*W}x{h*H}+{x*W}+{y*H}` で実ピクセル切り出し→ `-quality 82` で webp。選択肢が図の問題は「問題図（全選択肢/全曲線）」を収録し**解説図（正答強調）は除外**。データ表（計量値・配合条件等）は4列超でも**インライン markdown 転記**（モバイルより完全性優先、過去問の慣行）。手順 → [[reference-scanned-pdf-pipeline]]。
- **テキスト合成手法（実証済）**: 各分野の過去問解説を**唯一の主根拠**にサブエージェント（model:sonnet）が論点別の散文学習教材を生成（問題番号・正答に言及しない）。生成後に**2エージェントで過去問解説と突合する fact-check** を必ず実施（捏造JIS規格番号・矛盾数値を検出。今回 HIGH 0）。frontmatter は `group:textbook` / `section:N` / tags=`[textbook, concrete-chief-engineer]`。
- **公開前 必須QA**: ①内部整合性（`正答番号` と各肢 ✅/❌ マーカー・設問極性の一致。マーカー反転・正答欠落を全問チェック）②図依存問題の正答が計算で再現できるか（今回 R元問2・R5問7 の「正答別頁で未確定」を容積法/図読取りで確定）。
- **残**: R6・R7 の追加収録（原典スキャン未入手・書籍入手が前提）。H24/H25 skip 分の原典照合による補完（backlog）。

### 新資格メモ: 技術士 第一次試験（`pe-first-stage`、2026-06-04 新設）

- **総監（`pe-comprehensive-management`）とは別カテゴリ**。総監の `{year}-primary` は内部呼称が「第1次」だが実体は総監第二次の択一式。本カテゴリは全部門共通の**真の第一次試験**（基礎・適性・専門）。混同回避のため独立カテゴリ化。variant=pe / order=2.2 / visible=true。
- groups = primary（科目別ページ）。`--sub basic|aptitude|construction` で科目切替。出力先 `content/site/pe-first-stage/{year}-{basic|aptitude|construction}/article.mdx`。
- **科目範囲**: 基礎科目（全部門共通・5群30問）＋適性科目（共通・15問）＋専門科目は**建設部門のみ**（土木読者向け。専門は20部門あるが建設に限定）。整備済み: R元〜R7（21ページ・約560問、2026-06-04時点）。次の拡張候補は H30以前だが正答が合本PDF（`_12`）になるため別処理が必要。
- **組合せ問題の誤転記検出（2026-06-04 追加）**: ○×組合せ・語句組合せ問題で**2つの選択肢が完全一致したら転記ミス確定**（実試験では起こり得ない）。視覚突合だけでは見落とすため、全ページに対し「設問内で同一選択肢が複数ないか」の機械スキャンを必須化する。本検査は R元〜R4 で約12件、視覚突合済みの R5〜R7 でも4件の誤転記を検出・是正した実績がある。
- **正答表の確定は全科目目視（2026-06-04）**: 正答 PDF はテキスト抽出可だが、出題不備の救済（例 R2 基礎Ⅰ-5-5「4又は3」）や脚注で抽出が崩れることがある。正答番号は科目ごとに正答表画像を Read して目視確定する。
- **本文の不等号は全角 ＜＞**: 散文・選択肢中の半角 `<`/`>` は MDX が JSX 開始タグと誤認し details が消失する。数式は `$...$` 内に格納し、生成後は MDX 単体コンパイルで `COMPILE OK` を確認する。
- **PDF 特性**: 問題 PDF（engineer.or.jp 公式）は**画像ベースでテキスト抽出不可**＝全問を rotate なしの 200dpi 画像から視覚転記。正答 PDF（`{R##}-正答.pdf`）は**テキスト抽出可**で年度1ファイルに全科目の正答番号表が入る＝正答は機械突合で確定可。ただし問題文・選択肢の捏造防止に原典視覚突合は必須。
- **RelatedKeywords は当面省略**（建設一次の論点に対応するキーワードページが未整備。リンク先のない RelatedKeywords は置かない）。
- Generator = `/exam-questions-import --exam pe-first-stage`。Evaluator = `content-qa`。ソース PDF = `content/sources/textbook/技術士第一次試験/`。

### 新カテゴリメモ: 土木施工の実務（`civil-practice`、2026-08-27 新設・**非資格カテゴリ**）

**位置づけ**: 資格に紐づかない実務コンテンツの初のカテゴリ。`variant: "general"`（`reference` と同じく
非資格扱い＝`check-home-exam-coverage` の資格カード必須ゲート対象外）・order 2.8・**`visible: true`**
（2026-08-27 にナビ公開。ヘッダー/フッターのカテゴリドロップダウンには非資格カテゴリの区切り
「資格を問わない実務」を追加済み）。

**素材と著作権の原則（最重要）**: 素材は `content/sources/textbook/土木施工実務ノート/`
＝市販の土木施工実務書のスキャンを再構成した内部ノート（全15章160項目）。再構成済みではあるが、
**章立て・160項目の選択と配列・項目名は原本の編集著作**であり、そのまま公開物にはできない。

- 原本の章立て・項目名・見出し順を写さず、**テーマ単位で独自に再構成**する
- 数値・基準はノートを出典にせず、**一次資料**（コンクリート標準示方書・土木工事共通仕様書・
  労働安全衛生規則・JIS・建築基準法施行令）で取り直して出典を明記する
- ノート内の `<!-- 要確認 -->` 箇所（20超）は公開物に一切使わない
- 原本由来の逸話・経験則・現場エピソードは使わない
- ノートの図版 SVG（17点）も流用しない。公開用は figure-canvas 標準で別途作図する

判断の根拠はコンクリート診断士択一の前例（逐語でなくても原典構成のままでは公開不可と判断し
全98問を自作へ書き換えた）と同型。

**完遂（2026-08-27）**: 原本160項目を44記事（統合により計画61スロットを44本に集約）で全カバー、
図版17点（固定キャンバス400×500・自前作図）、計算ツール7ページ・9計算機（原本HTML 10本を全移植・
残り8本の設計は WebSearch で一次資料照合し直し・出典不明の定数は不採用）、現場管理値の早見表
`civil-practice-reference-values` まで完了。記事は `group: guide` として §20 Type-2「次のステップ」・
§26 読者ベネフィット型リード・3,000字下限に準拠。読者は受験者でなく実務者だが、論点が1級土木
第2次検定と重なるため末尾で資格記事へ送客している記事もある。検証コマンド:
`node scripts/check-civil-practice-coverage.mjs`（未着手スロット・未カバー項目を列挙）。

**公開配線（2026-08-27 完了分）**: `visible:true` 化に伴い `SearchFilters.tsx` の `CATEGORIES` に追加、
`StructuredData.tsx` の `getExamName` に `civil-practice` の case を追加。ヘッダー/フッターの
カテゴリ列挙は `categories.json` の `visible` 連動で自動追随（区切り「資格を問わない実務」を
`variant: general` 用に追加）。**未配線のまま**: `src/app/links/page.tsx` の `EXAM_CARDS`（SNS bio 導線）・
`category-curriculum.json`（未設定でもフラットグリッドで動くため必須ではない）・note CTA
（`magazine-placement.ts` に配線なし・残課題は backlog DN-0148）。OGP は `ogp-create.mjs` の
`CATEGORY_TO_EXAM_KEY` で `common`（bronze `#9A6B1E`）へ明示マップ済み。`--exam-*` CSS トークンは
凍結のため追加しない。

---

**真実源参照**: このファイル内の情報が他のドキュメント（CLAUDE.md・SKILL.md・エージェント定義）と矛盾した場合、`.claude/knowledge/reference/content-principles.md` > このファイル > 他 の優先順位で判断する。
