---
title: サブエージェント詳細レジストリ
---

# サブエージェント詳細レジストリ

`.claude/agents/` に定義されたサブエージェント群の詳細。Generator/Evaluator 分離の原則に基づき設計。

SNSの表紙・冒頭は [SNS画像ポリシー §0](./sns-image-policy.md) を共通参照する。ig-carousel-writer／x-post-writer は短い見出しと台帳のポーズ候補を制作担当へ渡し、対応QAおよびyt-shorts-publisher-qaは画像の判読・同一性・重なりを確認する。ポーズ分類の真実源は [キャラクター素材ポリシー](./character-asset-policy.md) が案内する台帳で、一覧確認は管理画面 `/gallery/characters`。画像QAから外部投稿の更新完了を推定しない。通常動画・ShortsのPOPは [承認見本](./pop-image-policy.md) と `pop-image.json` を参照し、`ai-image-fidelity-auditor` が文字・人物の忠実性、`yt-shorts-publisher-qa` がShorts表紙・操作UIを確認する。画像のみの入力は動画4軸を採点しない。

> **件数・model・tools の正本**は `.claude/agents/*.md` の frontmatter。下の「スキル → エージェント呼出マップ」と「エージェント一覧」は `npm run build-capability-index` の生成物で、手では直さない（`npm run check-doc-coupling` が一致を見る）。変更の経緯は git の履歴が持つ。

**description の運用**: 呼出時の概要は 120 code points 以下（1 文＋必要なら Use when）とし、詳細な手順・制約は各 agent 本文を読む。Codex 用 TOML は原本から自動生成する。`node scripts/check-agent-descriptions.mjs` が全件を検査し、新規超過・悪化を拒否する。

**いつ読むか**: サブエージェントを呼び出すときに担当範囲を確認するとき、連携設計時、新規エージェント追加時の命名・責務設計時。

**model の既定**（サブエージェントは sonnet・Opus は親のみ）は CLAUDE.md §5「ハーネス設計原則」に置く（判断の土台として毎ターン読めるようにするため）。per-agent の model・種別・領域は下の「エージェント一覧」（生成物）で見る（CLAUDE.md に per-agent の表は無い）。スキル/エージェント編集時の規約は `.claude/rules/skills-agents.md` が該当ファイルを開いたときに載る。

**audit-only の tools 制限（2026-07-03）**: 「audit-only（修正しない）」を明示宣言する Evaluator（`*-qa` / `*-auditor` / `*-fact-checker` 等）は frontmatter に `tools:` allowlist を持ち、変更ツール（`Edit`/`Write`/`NotebookEdit`）を機構的に除外する（`Read, Glob, Grep, Bash, WebSearch, WebFetch`。`sns-archive-auditor` は「Bash 不可」宣言に従い `Read, Glob, Grep`）。`defaultMode: bypassPermissions` 下でも監査エージェントが誤ってファイルを書き換えないための多層防御。Generator（`*-writer`/`*-rewriter`/`*-restorer` 等）は `tools:` 無指定＝全ツールで従来どおり。新規 Evaluator を追加するときは同じ allowlist を付与する。

---

2026-09-13: strategy-advisor / todo-planner / metrics-analyzerを資格別事業方針・KPI・週次/月次の共通SSOTへ結線。新規エージェントは追加せず、レビュー判断と実装・計測の担当を維持する。

## スキル → エージェント呼出マップ

<!-- generated:skill-agent-map:start（npm run build-capability-index が書く。手で直さない） -->
スキルの本文に名前が出るエージェント（呼び出しのほか、担当外の案内も含む）。

| スキル | エージェント |
|---|---|
| `/a8-report` | `a8-csv-auditor` |
| `/asset-route` | `sns-archive-auditor` |
| `/audit-exam-mapping` | `exam-keyword-mapping-auditor` |
| `/audit-note-funnel` | `note-funnel-auditor` |
| `/backlog-sweep` | `backlog-curator` |
| `/cce-essay-cycle` | `cce-essay-qa` `cce-essay-writer` `magazine-pdf-builder` |
| `/check-mdx` | `svg-figure-auditor` |
| `/civil-figure-rework` | `civil-construction-qa` `civil-exam-figure-auditor` `civil-exam-figure-extractor` |
| `/civil-keiken-magazine` | `civil-keiken-essay-qa` `civil-keiken-essay-writer` `civil-secondary-exam-writer` |
| `/coconala-blog` | `coconala-blog-qa` `coconala-blog-writer` |
| `/coconala-order` | `civil-keiken-tensaku-drafter` `civil-keiken-tensaku-qa` `coconala-operator` |
| `/coconala-publish` | `coconala-operator` |
| `/coconala-status` | `coconala-operator` |
| `/competitor-review` | `competitor-analyst` `x-post-qa` `x-post-writer` |
| `/create-pop-image` | `ai-image-fidelity-auditor` `video-content-qa` `video-script-writer` `yt-shorts-publisher-qa` |
| `/distill-proofread-learnings` | `cem-qa` |
| `/doc-declutter` | `doc-curator` |
| `/doc-sync` | `doc-sync-auditor` |
| `/exam-questions-import` | `content-qa` |
| `/fetch-gsc-data` | `gsc-index-auditor` `metrics-analyzer` |
| `/figure-quality-loop` | `figure-crop-worker` |
| `/figure-recrop` | `civil-exam-figure-auditor` `figure-crop-worker` `scanned-figure-crop-auditor` |
| `/google-search-growth` | `gsc-csv-auditor` `gsc-index-auditor` `metrics-analyzer` `seo-fix-planner` `technical-seo-auditor` |
| `/gsc-review` | `gsc-index-auditor` `metrics-analyzer` `performance-auditor` |
| `/ig-carousel-restyle` | `ig-carousel-qa` `ig-carousel-writer` |
| `/improve-article` | `cem-qa` `civil-construction-qa` `content-qa` `keyword-rewriter` |
| `/kdp-publish` | `kdp-operator` |
| `/keiken-charcount` | `civil-keiken-essay-qa` `civil-keiken-essay-writer` |
| `/keiken-tensaku` | `civil-keiken-tensaku-drafter` `civil-keiken-tensaku-qa` |
| `/keyword-page` | `cem-qa` `guide-fact-checker` `guide-qa` `guide-rewriter` |
| `/kindle-build` | `kdp-operator` `kindle-book-composer` `kindle-book-qa` |
| `/magazine-to-pdf` | `magazine-pdf-builder` |
| `/note-attach-pdf` | `magazine-pdf-builder` |
| `/note-hashtags` | `note-link-injector` |
| `/note-membership` | `note-membership-operator` |
| `/note-prepublish-review` | `note-fact-checker` `note-link-injector` `svg-figure-auditor` |
| `/note-visual-review` | `note-page-visual-auditor` |
| `/notebooklm-research` | `cem-qa` |
| `/pdf-to-mdx` | `cem-qa` `civil-construction-qa` `content-qa` `scanned-figure-crop-auditor` |
| `/pe-essay-cycle` | `cem-essay-qa` `cem-essay-writer` |
| `/pe-essay-review` | `cem-qa` `note-fact-checker` |
| `/pe-note-plan` | `strategy-advisor` |
| `/pe-secondary-yosou` | `pe-secondary-exam-factcheck` `pe-secondary-exam-qa` `pe-secondary-exam-writer` |
| `/plan-weekly` | `todo-planner` |
| `/psi-audit` | `gsc-index-auditor` `metrics-analyzer` `performance-auditor` |
| `/publish-x` | `x-post-qa` `x-post-writer` |
| `/quality-cycle` | `cem-qa` `civil-construction-qa` `civil-textbook-rewriter` `keyword-rewriter` |
| `/record-sales` | `sales-recorder` |
| `/seo-growth-review` | `gsc-index-auditor` `metrics-analyzer` `performance-auditor` `search-intent-auditor` `technical-seo-auditor` |
| `/site-visual-review` | `page-design-builder` `site-page-visual-auditor` |
| `/social-post` | `x-post-writer` |
| `/standards-table-rebuild` | `standards-table-qa` `standards-table-writer` |
| `/standards-visual-review` | `standards-page-visual-auditor` |
| `/verify-exam-coverage` | `cem-qa` |
| `/video-content` | `video-content-qa` `video-script-writer` |
| `/weekly-improve` | `keyword-rewriter` `metrics-analyzer` |
| `/x-reply` | `x-reply-drafter` |
| `/x-repost` | `x-repost-curator` |
<!-- generated:skill-agent-map:end -->

## エージェント一覧

<!-- generated:agents:start（npm run build-capability-index が書く。手で直さない） -->
エージェント 84 体（`.claude/agents/*.md` の frontmatter から生成。「呼び出すスキル」はスキルの本文に名前が出るもの）。

| エージェント | 種別 | model | 領域 | 説明 | 呼び出すスキル |
|---|---|---|---|---|---|
| `a8-csv-auditor` | 監査のみ | sonnet | affiliate | A8 収集済み CSV・正規化結果の品質とサイト帰属を監査する Evaluator。取得・修正・EPC 判断はしない。Use when [A8 CSV 品質確認]. | `/a8-report` |
| `affiliate-operator` | 編集可 | sonnet | affiliate | A8・もしも・afb の提携照合、申請、ASP 間比較を行う。成果 CSV 取込・案件開拓は担当外。Use when [ASP 横断比較, 提携申請]. | — |
| `ai-image-fidelity-auditor` | 監査のみ | sonnet | site | 記事の写真・動画/商品素材の AI 生成画像が実物・本文どおりかを ok/fail で判定する Evaluator。修正・記録はしない。 | `/create-pop-image` |
| `backlog-curator` | 監査のみ | sonnet | plan | backlog カードの分類・重複・陳腐化を監査し処分案を返す Evaluator。編集・実行・週次計画はしない。Use when [バックログ棚卸し]. | `/backlog-sweep` |
| `cce-essay-qa` | 監査のみ | sonnet | product | コンクリート主任技士 小論文の note 教材（テーマ別・立場別）を5軸で採点する Evaluator。cce-essay-writer の成果物が対象。 | `/cce-essay-cycle` |
| `cce-essay-writer` | 編集可 | sonnet | product | コンクリート主任技士 小論文の note 教材（令和形式のテーマ別・立場別模範答案）を執筆する Generator。出題履歴は cce-essay-history.json のみ使用。 | `/cce-essay-cycle` |
| `cem-essay-qa` | 監査のみ | sonnet | product | 総監記述式 note マガジンの模範論文を字数・散文性・専門度・白書根拠で採点する Evaluator。生成・修正はしない。 | `/pe-essay-cycle` |
| `cem-essay-writer` | 編集可 | sonnet | product | 総監記述式 note マガジンのペルソナ別論文・予想問題・施策バンクを執筆する Generator。施策600字以内・真正な経験座を守る。 | `/pe-essay-cycle` |
| `cem-qa` | 監査のみ | sonnet | site | 総監キーワードページの5軸ルーブリック品質評価を担当する Evaluator。 | `/distill-proofread-learnings` `/improve-article` `/keyword-page` `/notebooklm-research` `/pdf-to-mdx` `/pe-essay-review` `/quality-cycle` `/verify-exam-coverage` |
| `civil-construction-qa` | 編集可 | sonnet | site | 1級・2級土木 textbook/guide の視覚検証・テキスト網羅率と、既存記事の校正（Mode R・コンクリ系教科書を含む）を担当する Evaluator。 | `/civil-figure-rework` `/improve-article` `/pdf-to-mdx` `/quality-cycle` |
| `civil-exam-figure-auditor` | 監査のみ | sonnet | site | 1級土木 過去問1次ページの図クロップを PNG と MDX 本文から4軸で採点する Evaluator。 | `/civil-figure-rework` `/figure-recrop` |
| `civil-exam-figure-extractor` | 編集可 | sonnet | site | 1級土木 過去問1次ページの図クロップ仕様を、PDF ページ画像の目視で JSON spec にして返す Generator。 | `/civil-figure-rework` |
| `civil-exampoint-restorer` | 編集可 | sonnet | site | 1級土木 一次過去問の壊れた ExamPoint を体言止めの学習ポイントに再生成する Generator。 | — |
| `civil-guide-writer` | 編集可 | sonnet | site | 1級・2級土木と civil-practice の新規ガイドを執筆する Generator。リライトと採点は担当外。 | — |
| `civil-keiken-essay-qa` | 編集可 | sonnet | product | 施工経験記述 note マガジンのフル模範答案を5軸で採点する Evaluator（重複・捏造・形式・著作権）。 | `/civil-keiken-magazine` `/keiken-charcount` |
| `civil-keiken-essay-writer` | 編集可 | sonnet | product | 施工経験記述 note マガジンのフル模範答案（年度別・テーマ別・予想・想定工事バンク）を生成する Generator。 | `/civil-keiken-magazine` `/keiken-charcount` |
| `civil-keiken-tensaku-drafter` | 編集可 | sonnet | product | 顧客原稿・ヒアリング事実から診断・添削・骨子シートの下書きを作る。事実は創作せず質問にする。最終化・送信は担当外。 | `/coconala-order` `/keiken-tensaku` |
| `civil-keiken-tensaku-qa` | 監査のみ | sonnet | product | 添削・診断・骨子の返信文を事実忠実性・指摘の正確性など5軸で検証する Evaluator。修正・送信はしない。Use when [添削返信の検証]. | `/coconala-order` `/keiken-tensaku` |
| `civil-secondary-exam-writer` | 編集可 | sonnet | site | 1級土木 二次過去問の解答・ポイント・設問解説を補完する Generator。 | `/civil-keiken-magazine` |
| `civil-textbook-rewriter` | 編集可 | sonnet | site | 1級土木施工管理技士 textbook/guide ページのバルクリライトを担当するGeneratorエージェント。 | `/quality-cycle` |
| `cli-runner` | 監査のみ | haiku | ops | Workflow の機械の段で、渡されたコマンドを 1 回だけ実行し、終了コードと出力の末尾を返す。判断・修正・検証はしない。 | — |
| `coconala-blog-qa` | 監査のみ | sonnet | product | ココナラブログ記事を5軸（0〜3）で採点する Evaluator。外部リンクゼロ等のハードゲートは check-coconala-blog で確認。修正はしない。 | `/coconala-blog` |
| `coconala-blog-writer` | 編集可 | sonnet | product | ココナラブログ記事を執筆する Generator。自出品へ送客し、外部リンクゼロ・カニバリ境界を守る。素材は書き直す（逐語転載しない）。 | `/coconala-blog` |
| `coconala-operator` | 編集可 | sonnet | product | ココナラの受注照合・出品編集・価格/状態・KPI を既存スクリプトで運用する。送信は運営者。Use when [ココナラ受注, /coconala-order]. | `/coconala-order` `/coconala-publish` `/coconala-status` |
| `competitor-analyst` | 監査のみ | sonnet | strategy | 取得済みの競合データを比較し、価格・品揃え・訴求の変化と戦略文書への反映案を返す Evaluator。取得・編集はしない。 | `/competitor-review` |
| `content-qa` | 監査のみ | sonnet | material | PDF→MDX 変換の品質を5軸で評価する Evaluator（過去問・基準書中心）。 | `/exam-questions-import` `/improve-article` `/pdf-to-mdx` |
| `doc-curator` | 監査のみ | sonnet | ops | 文書の肥大化・陳腐化・重複を外部実体に基づき監査し KEEP/TRIM/DELETE/CONSOLIDATE を返す Evaluator。編集はしない。 | `/doc-declutter` |
| `doc-sync-auditor` | 監査のみ | sonnet | ops | 変更 diff と候補ドキュメントを突合し、旧仕様化した記述を file:line つきで報告する Evaluator。自動修正はしない。 | `/doc-sync` |
| `exam-keyword-mapping-auditor` | 編集可 | sonnet | site | 総監の過去問1問の紐づけキーワード群が論点を覆うかを評価し、追加・削除候補を返す Evaluator。Use when [過去問紐づけ監査]. | `/audit-exam-mapping` |
| `figure-crop-worker` | 監査のみ | sonnet | site | 記事の図画像を1枚ずつ目視分類し、タイト再クロップか元 PDF からの切り出し直しを行う Generator。MDX・台帳・git は担当外。 | `/figure-quality-loop` `/figure-recrop` |
| `gsc-csv-auditor` | 監査のみ | sonnet | site | GSC UI の収集済み CSV の欠損・切捨て・重複・前回差分を監査する Evaluator。SEO 判断・修正はしない。 | `/google-search-growth` |
| `gsc-index-auditor` | 監査のみ | sonnet | site | GSC URL Inspection と sitemap から index coverage を診断し、原因別に hygiene 修正候補を返す Evaluator（audit-only）。 | `/fetch-gsc-data` `/google-search-growth` `/gsc-review` `/psi-audit` `/seo-growth-review` |
| `guide-fact-checker` | 監査のみ | sonnet | site | ガイド記事の試験制度・統計・法令等の事実を外部一次情報と照合し、判定・正値・出典を返す Evaluator。修正はしない。 | `/keyword-page` |
| `guide-qa` | 監査のみ | inherit | site | ガイド記事を導入・散文・ボリューム・導線・モバイル視認性の5軸で評価する Evaluator（audit-only）。 | `/keyword-page` |
| `guide-rewriter` | 編集可 | sonnet | site | ガイド記事を guide-qa と fact-checker の指摘に沿って修正する Generator。新規記事・新事実の創作は担当外。 | `/keyword-page` |
| `ig-carousel-qa` | 監査のみ | sonnet | sns | Instagram カルーセル slide-data.json v2 と PNG を6軸で評価する Evaluator。 | `/ig-carousel-restyle` |
| `ig-carousel-writer` | 編集可 | sonnet | sns | Instagram カルーセルの slide-data.json v2 を1キーワードずつ執筆する Generator。 | `/ig-carousel-restyle` |
| `kdp-operator` | 編集可 | sonnet | product | ビルド済み EPUB と表紙を KDP へ入稿し、出版・本棚照合・ASIN 記録を運用する。Use when [KDP 提出, KDP 公開状態同期]. | `/kdp-publish` `/kindle-build` |
| `keyword-rewriter` | 編集可 | sonnet | site | 総監キーワードページのバルクリライトを担当する Generator。 | `/improve-article` `/quality-cycle` `/weekly-improve` |
| `kindle-book-composer` | 編集可 | sonnet | product | Kindle の論点分類・構成 spec・前付け原稿を設計/改訂する Generator。EPUB ビルド・品質判定はしない。Use when [Kindle 構成設計]. | `/kindle-build` |
| `kindle-book-qa` | 監査のみ | sonnet | product | Kindle EPUB と原稿を完全性・構成・KDP 規約などで監査し修正案を返す Evaluator。修正・出版はしない。Use when [EPUB 品質チェック]. | `/kindle-build` |
| `magazine-pdf-builder` | 編集可 | sonnet | product | note マガジンの article.md を「問題文＋解答」中心の紙用 PDF にする spec を作り、magazine-to-pdf.mjs を実行する Generator。 | `/cce-essay-cycle` `/magazine-to-pdf` `/note-attach-pdf` |
| `metrics-analyzer` | 編集可 | sonnet | site | GSC/GA4 データから8パターンの改善機会を抽出し、/nsm-experiment propose の入力を作る Evaluator。 | `/fetch-gsc-data` `/google-search-growth` `/gsc-review` `/psi-audit` `/seo-growth-review` `/weekly-improve` |
| `note-cover-writer` | 編集可 | sonnet | product | note 記事のカバー frontmatter（cover: ブロック）を1記事ずつ執筆する Generator。V5 キャラクターカバー用。 | — |
| `note-fact-checker` | 監査のみ | sonnet | product | note 公開用ドラフトの数値・主張・年度を doboku-note 内部データと突合する Evaluator。 | `/note-prepublish-review` `/pe-essay-review` |
| `note-funnel-auditor` | 監査のみ | sonnet | product | note 導線の3層（L1/L2/L3）を、もくじの構成・CTA 関連性・回遊の質で意味監査する Evaluator（audit-only）。 | `/audit-note-funnel` |
| `note-link-injector` | 編集可 | sonnet | product | note 公開用ドラフトに doboku-note キーワードページへのインラインリンクを注入する Generator。 | `/note-hashtags` `/note-prepublish-review` |
| `note-membership-operator` | 編集可 | sonnet | product | note「土木セコカン合格ラボ」の会員配信・特典収録・プラン設定を運用する。口座と公開範囲が不一致なら公開しない。Use when [会員特典配信]. | `/note-membership` |
| `note-operator` | 編集可 | sonnet | product | note の価格・マガジン・収録・購入者コメント返信・PDF 添付を運用する。会員プランは note-membership-operator。Use when [note 価格変更]. | — |
| `note-page-visual-auditor` | 監査のみ | sonnet | product | note の公開ページの代表を画面幅ごとに撮った画像を見て、見た目の崩れ・カバーの切れ・図の不一致・価格の食い違い・有料エリア直前の情報不足をページごとに pass / fail で判定する Evaluator。直さない。 | `/note-visual-review` |
| `page-design-builder` | 編集可 | sonnet | site | サイト UI・レイアウトを共通コンポーネントとトークンで実装する Generator。合否は /design-review。SVG・カバーは担当外。Use when [ページUI設計]. | `/site-visual-review` |
| `past-exam-qa` | 監査のみ | sonnet | site | 全資格の過去問 MDX を正答・解説・ExamPoint・可読性で監査する Evaluator。修正・PDF 忠実性・図クロップは別担当。Use when [過去問品質監査]. | — |
| `past-exam-rewriter` | 編集可 | sonnet | site | 過去問 MDX に past-exam-qa の指摘を適用する Generator。設問文・正答・KaTeX は原則保持。図処理は担当外。Use when [過去問校正]. | — |
| `pe-exam-figure-auditor` | 監査のみ | sonnet | site | 総監 過去問1次の試験図 SVG を4軸（概念・ラベル・可読性・MDX 結線）で採点する Evaluator（audit-only）。 | — |
| `pe-secondary-exam-factcheck` | 編集可 | sonnet | product | 建設部門 模範解答の技術的事実（数値・条番号・制度・統計）を外部一次情報に照合し、合格科目外の誤りを公開前に捕捉する Evaluator。 | `/pe-secondary-yosou` |
| `pe-secondary-exam-qa` | 編集可 | sonnet | product | 建設部門 note マガジンの模範解答を6軸で採点する Evaluator（予想問題モード forecast:true 対応）。 | `/pe-secondary-yosou` |
| `pe-secondary-exam-writer` | 編集可 | sonnet | product | 建設部門 note マガジン用の模範解答を科目区分ごとに1記事生成する Generator（過去問/予想 forecast:true・全選択肢網羅）。 | `/pe-secondary-yosou` |
| `performance-auditor` | 監査のみ | sonnet | site | PSI 計測履歴から Core Web Vitals のしきい値違反と回帰を検出し、改善提案を優先度つきで出す Evaluator。 | `/gsc-review` `/psi-audit` `/seo-growth-review` |
| `rccm-essay-qa` | 監査のみ | sonnet | product | RCCM note 教材（問題III 模範論文・問題I テンプレ）を5軸で採点する Evaluator。生成・修正はしない。 | — |
| `rccm-essay-writer` | 編集可 | sonnet | product | RCCM note 教材（問題III 模範論文・問題I テンプレ）を執筆する Generator。指定用語4語以上・1,200〜1,600字。 | — |
| `sales-recorder` | 編集可 | sonnet | product | note 販売履歴テキストを正規化して data/note/sales.json に追記する Generator。Use when [売上記録]. | `/record-sales` |
| `scanned-figure-crop-auditor` | 監査のみ | sonnet | material | スキャン教材の図クロップ PNG を4軸で採点し、bbox の調整値を返す Evaluator（audit-only）。 | `/figure-recrop` `/pdf-to-mdx` |
| `search-intent-auditor` | 監査のみ | sonnet | site | 機械抽出した最大20 URL が対象クエリの検索意図に合致するかを意味評価する Evaluator（audit-only）。 | `/seo-growth-review` |
| `seo-fix-planner` | 監査のみ | sonnet | site | 結合済み検索計測 JSON の URL 分類を評価し、優先順位つきの修正計画を返す Evaluator。取得・修正はしない。 | `/google-search-growth` |
| `site-page-visual-auditor` | 監査のみ | sonnet | site | サイトの代表ページを全部の画面幅で撮った画面を見て、レイアウト・読みやすさ・商品導線（note・アフィリエイト・ココナラ）の崩れをページごとに pass / fail で判定する Evaluator。直さない。 | `/site-visual-review` |
| `sns-archive-auditor` | 監査のみ | sonnet | sns | SNS バイナリを Drive へ退避する前に健全性・再生成可能性・公開状態を監査し、OFFLOAD/KEEP/BLOCK を返す Evaluator。 | `/asset-route` |
| `standards-page-visual-auditor` | 監査のみ | sonnet | site | 基準書の章ページの撮影を原本のページ画像と見比べ、読者の画面の崩れ・欠けを章ごとに pass / fail で判定する Evaluator。直さない。 | `/standards-visual-review` |
| `standards-table-qa` | 監査のみ | sonnet | site | 組み直した共通仕様書の表を原本ページ画像と1セルずつ照合し、承認・差し戻しを決める Evaluator。表は直さない。 | `/standards-table-rebuild` |
| `standards-table-writer` | 編集可 | sonnet | site | 共通仕様書の版面の表を、原本ページ画像と照合して表の JSON に組み直す Generator。照合・承認は standards-table-qa。 | `/standards-table-rebuild` |
| `strategy-advisor` | 編集可 | inherit | strategy | 資格別の学習価値・図解・販売・運営負担を共通SSOTで統括し、週次/月次レビューから実験と計画へつなぐ戦略オーケストレーター。 | `/pe-note-plan` |
| `svg-canvas-fitter` | 編集可 | sonnet | site | サイト figure-*.svg を固定キャンバスへ再配置する Generator。収まらなければ親へ返す。 | — |
| `svg-figure-auditor` | 監査のみ | sonnet | site | site・note の SVG 図版を概念・本文整合・可読性・キャンバスで監査する Evaluator。修正は rewriter / fitter。 | `/check-mdx` `/note-prepublish-review` |
| `svg-figure-rewriter` | 編集可 | sonnet | site | SVG への監査指摘を適用し、色・フォント・属性・重なりを校正する Generator。再レイアウトは svg-canvas-fitter。 | — |
| `technical-seo-auditor` | 監査のみ | sonnet | site | check-seo-build・check-seo-meta・index-coverage・sitemap の機械出力を束ねて技術 SEO レポートにする Evaluator（再判定・修正はしない）。 | `/google-search-growth` `/seo-growth-review` |
| `todo-planner` | 編集可 | sonnet | plan | backlog・計画・git 実績から週次計画を更新し、月初に月間タスクを選ぶ Generator。Use when [/plan-weekly, 週次計画]. | `/plan-weekly` |
| `video-content-qa` | 監査のみ | sonnet | sns | 動画パックを6軸と BLOCK ゲートで採点する Evaluator（audit-only）。 | `/create-pop-image` `/video-content` |
| `video-review` | 監査のみ | sonnet | sns | 承認待ちの YouTube 動画を、運営者の代わりに画面と文面で確認して pass か fail を記録するエージェント。承認・公開はしない。 | — |
| `video-script-writer` | 編集可 | sonnet | sns | 動画パック（台本・storyboard・派生ブリーフ・CTA 案）を1パック書く Generator。投稿・レンダリングは担当外。 | `/create-pop-image` `/video-content` |
| `x-post-qa` | 編集可 | sonnet | sns | X 投稿 tweets.md を文字数・論点・タグ・導線・偽成功検証の5軸で採点する Evaluator。実績訴求と凍結リスクは重大減点ゲート。 | `/competitor-review` `/publish-x` |
| `x-post-writer` | 編集可 | sonnet | sns | X 投稿の tweets.md を多資格横断で執筆する Generator。280 weighted 以下・試験別タグ・時間帯スロットを守る。 | `/competitor-review` `/publish-x` `/social-post` |
| `x-reply-drafter` | 編集可 | sonnet | sns | X の返信候補（資格横断）を、相手のプロフィールと最新の投稿で仕分け、見送りの理由と返信の下書きを返す Generator。送信・記録はしない。Use when [/x-reply の候補の仕分けと下書き]. | `/x-reply` |
| `x-repost-curator` | 編集可 | sonnet | sns | X 引用リポスト候補を関連性・安全性で選別し、引用コメントを生成して approved.json を書く Evaluator+Generator。 | `/x-repost` |
| `yt-shorts-publisher-qa` | 監査のみ | sonnet | sns | YouTube Shorts の完成動画・文面・表紙を評価する。現行は動画パックの素材が対象。 | `/create-pop-image` |
| `yt-shorts-title-writer` | 編集可 | sonnet | sns | YouTube Shorts の論点ベースのタイトルを1本ずつ執筆し meta.json の title を上書きする Generator。 | — |
<!-- generated:agents:end -->

## Generator と Evaluator の分離原則

> Generator と Evaluator を分離する — 自己評価バイアスは構造で解決する

同じエージェントが作成も評価も担うと、自分の出力を「良い」と判断するバイアスが生じる。Evaluator エージェントは生成・修正には一切関与せず、**完成物の品質評価のみ**を行う。

### 分離例

- **PDF→MDX 変換**: `/pdf-to-mdx`（Generator スキル）→ `content-qa`（Evaluator エージェント）
- **キーワードページ**: `/keyword-page`（Generator スキル）→ `cem-qa`（Evaluator エージェント）
- **1級・2級土木 textbook/guide**: `/pdf-to-mdx --exam {civil-construction-1|civil-construction-2}`（Generator スキル）→ `civil-construction-qa`（Evaluator エージェント、category フィルタで両級対応。既存記事の校正は Mode R で、コンクリ 3 資格の textbook も対象）

### Evaluator エージェントの区別

| エージェント | 対象ファイル | 主な軸 | 起動タイミング |
|---|---|---|---|
| **backlog-curator** | `.claude/todo/backlog.md` のカード | 種類・tier・カテゴリ・重複・鮮度・実績乖離・完了prose蓄積 → KEEP/RETAG/TRIM/MERGE/DELETE/RESEED/SPLIT | 月初、または check-backlog-health がしきい値を踏んだとき |
| **content-qa** | `.mdx`（過去問・基準書） | 静的5軸（視覚検証なし） | PDF→MDX 変換後 |
| **coconala-blog-qa** | `content/coconala/blog/**/article.md` | 検索適合・捏造なし・カニバリ境界・導線整合・構成準拠＋ハードゲート（外部リンク/連絡先/listed/価格） | ココナラブログ記事の執筆後・公開前 |
| **cem-qa** | `.mdx`（総監キーワード `group: keyword` 全件 + 横断トレードオフガイド `management-tradeoffs` の §23 構造チェック） | 5管理体系・コンポーネント原則・参考資料・横断トレードオフ §23（核同士の対称関係・固有名詞混入） | キーワードページ執筆後 / `management-tradeoffs` 編集後 |
| **civil-construction-qa** | `.mdx`（1級・2級土木 textbook/guide） | 視覚検証 + テキスト網羅率（Mode A・B） | 1級・2級土木 MDX 生成後 |
| **civil-construction-qa（校正モード＝Mode R）** | `.mdx`（1級・2級土木 textbook/guide・コンクリ 3 資格の textbook） | content-principles準拠＋モバイル視認性＋画像キャプション品質（PDF照合なし、5軸） | 既存 MDX の定期校正・編集後 |
| **guide-qa** | `.mdx`（`group: guide`・全資格横断） | ガイド軸5軸（導入/リード文§26・読みやすさ§24・ボリューム§25・コンバージョン導線§20（civil-practice・laws は一次資料・出典の軸に置換）・モバイル） | ガイド記事の品質監査・加筆後の再評価 |
| **guide-rewriter** | `.mdx`（`group: guide`・全資格横断） | §17/§26/§24/§2/§20 準拠リライト＋密度向上＋事実是正（正値で） | guide-qa/guide-fact-checker の指摘適用・加筆・密度向上 |
| **guide-fact-checker** | `.mdx`（`group: guide`・全資格横断）の検証可能な事実 | WebSearch で国交省/JCTC/技術士会/JCI/e-Gov 等の一次情報に照合 | ガイド加筆・密度向上リライトの直後（公開前） |
| **metrics-analyzer** | `data/gsc/reports/*.json`（`gsc.page-query` 含む）, `data/ga4/reports/*.json`（`ga4.source-medium-sns` 含む） | 8パターン抽出（High-Impr-Low-CTR, Rank-Stuck, Traffic-Drop, Hidden-Winner, Orphan-Query, SNS-Source-Shift, Cannibalization, Content-Decay）＝index 済みページの performance ＋ SNS 流入 | `/weekly-improve` 実行時 |
| **gsc-index-auditor** | `data/gsc/url-inspection/*.json` + `data/gsc/index-coverage.json` | coverage_state 7バケット分類・`indexed_ratio`・履歴差分・原因バケット（権威性/技術/hygiene）・hygiene URL surface（**coverage 専任**＝performance は metrics-analyzer） | `/gsc-review` 実行時（月次 CI 後） |
| **gsc-csv-auditor** | `data/gsc/ui/<run>/`（manifest + raw CSV + `normalized/*.json` + rejects） | データ品質のみ（行数=exportedRows 照合・sha256・truncation・rejects 比率・duplicateCount・前回 run 差分・schema）→ PASS/WARN/FAIL。外部アクセスなし | `/google-search-growth` の validate フェーズ |
| **seo-fix-planner** | `.claude/state/improvements/search-growth-<run>.json`（join 済み・signal＋機械分類）＋ 裏取り用 `out/docs/*.html`・`public/_redirects`・`doc-meta-index.json` | 機械分類の意味補正（similarCluster/hasParent/cannibalization 補強・UNKNOWN 確定寄せ）＋ impact×confidence×effort 優先順位。変更しない（audit-only） | `/google-search-growth` の evaluate フェーズ |
| **a8-csv-auditor** | `data/a8/ui/<run>/`（manifest + raw CSV + `normalized/*.json` + rejects）＋ `data/a8/report-log.json` の差分 | サイト帰属（mediaId 一致・siteSummary の targetSite 行・crossCheck 超過・桁違いの跳ね）→ 取得完全性（status/csvRows/sha256/encoding/period）→ 正規化健全性（fatal/rejects/unmapped・notAttributable は正常）→ 時系列整合（重複キー・遡及の説明可否）→ PASS/WARN/FAIL。外部アクセスなし | `/a8-report` の validate フェーズ |
| **performance-auditor** | `data/psi/{batch,single}/*.json`（`field_data`＝実害判定 / `lab_data`＝診断 / `lcp_element`＝原因特定） | field 主・lab 従のしきい値違反＋回帰検出（中央値ベース）＋LCP 要素に基づく打ち手分岐 | `/psi-audit` 実行時 / 日次 workflow 後 |
| **exam-keyword-mapping-auditor** | `.claude/state/exam-keyword-map.json` の anchor 1 件単位 | 紐づけ精度の 2 段階 semantic 評価（Stage 1=現紐づけのカバレッジ、Stage 2=候補発見）＋ 3 階層 confidence（auto_apply / needs_review / reject） | `/audit-exam-mapping audit-year` 実行時に各 anchor へ分配 |
| **note-fact-checker（スコープ D）** | note 記事本文の白書由来 数値・固有名 + NotebookLM 白書ノートブック（`2bf7f0dd-3935-49be-8cef-2d428c59eaa9`・白書 PDF をソース登録済み） | NotebookLM 白書ノートブックへの問い合わせ照合（`notebooklm-cross-query.mjs`・引用を返せない数値を ⚠️要確認 で surface。認証切れ時は照合不能と明記）。**ローカル白書 PDF は 2026-06-17 削除＝offline grep 不可** | 白書連動 note 記事（クロストレードオフ・白書R7対応集・R8予想問題集・模範論文の白書事例）公開前 |
| **kindle-book-qa** | Kindle 入稿用 `.epub` + 同梱原稿 `article.md`（`.tmp/` 出力） | 原稿完全性・構成整合・EPUB技術（epubcheck）・KDP規約適合・商品性（5軸、PASS/WARN/FAIL） | `/kindle-build` のビルド直後（KDP アップロード前ゲート） |
| **ig-carousel-qa** | `slide-data.json`（v2）+ 過去問パックは `carousel/img/*.png` | スライド構成・文の完結性・図文整合・字数視認性・試験的正確性（5軸）+ デザイン統一性（過去問パック、tokens.json 照合） | IG カルーセル設定ファイル執筆後 / restyle 後 |
| **civil-exam-figure-auditor** | `content/site/civil-construction-1/primary-*/img/*.png` + 該当 MDX | クリップ純度・本文重複なし・alt 精度・MDX 結線（4軸、加重 ≥2.0 かつ全軸 ≥2 で合格） | `/civil-figure-rework` 実行時、Generator 直後 |
| **scanned-figure-crop-auditor** | `content/sources/textbook/**/img/*.png`（スキャン教材クロップ）+ 出所ページ画像 | クリップ純度45/図完全性30/正図同定15/alt10（4軸、加重 ≥2.0 かつ全軸 ≥2 で合格）。`adjust_bbox` を返し再クロップ反復、別図掴みは relocate | `pdf-to-mdx --scanned` 経路Bの図 audit/refine ループ、初期クロップ直後 |
| **pe-exam-figure-auditor** | `content/site/pe-comprehensive-management/h*-primary/img/*.svg` + 該当 MDX（問題文） | 概念・構造の正確性・ラベル整合・可読性・MDX 結線（4軸）。MDX 問題文を真実源として SVG 忠実度を採点。P1-P8・キャンバス標準は非適用。`svg-audit.json.exam_crops` が対象一覧 | 総監 h2x-primary 過去問ページ SVG を新規作成・修正後 |
| **ai-image-fidelity-auditor** | `content/site/**/img/*` のうち写真（AI 生成画像・`check-image-origin --ai-queue --json`）＋生成の指示＋記事の該当節 | 種別・構造・本文整合・生成の破綻（4 軸、すべて満たすときだけ ok）。背景・色・アングルは問わない | AI 画像を足した・差し替えた後（`check-image-origin` の `ai-unreviewed`） |
| **svg-figure-auditor** | site: `content/site/**/img/figure-*.svg`（コンテンツ図版のみ）/ note: `content/note/**/img/figure-*.{svg,png}` | site=svg-tokens（viewBox/font/色 allowlist/marker）+ 概念伝達/alt/可読性/結線、note=note-svg-policy（キャンバス/フォント/ブランド/密度）。各 4 軸・加重 ≥2.0 かつ全軸 ≥2。**過去問クロップ（h*-primary）は対象外** | `/note-prepublish-review`（note 枝）/ 単体 SVG 監査時。機械 svg audit(P1-P8) の後段 |
| **yt-shorts-publisher-qa** | 現行の YouTube Shorts mp4・meta・表紙 | 尺・導線・タイトル・字幕・画面品質を評価し、予約後に `videos.list` を照合 | 現行Shorts制作時。旧IG派生経路は退役 |
| **video-content-qa** | `content/sns/video-packs/{exam}/{slug}/`（video-pack.json・script.md・storyboard.json）＋ `sourceRefs` の実体 | 悩み適合・事実/出典・視聴維持・図版音声字幕整合・差別化/Red Line・CTA/計測（6軸 0〜3・平均 ≥2.0 かつ BLOCK なし）。`check-video-content` FAIL・出典なし断定・逐語転用・主 CTA 複数は BLOCK | `/video-content` で台本生成後（レンダリング前） |
| **pe-secondary-exam-qa** | `content/note/技術士建設部門/magazines/{magazine}/{year}/article.md`（論述式 模範解答） | 設問適合・論述構成/論点絞り込み・分かりやすさ/あいまい表現排除・発注者視点/専門性・note完成度（5軸）＋字数上限〔枚数×600字〕・note-lint・設問1対1・論述式文体ゲート。論述原則は `技術士論文の書き方`（非公開・原則抽出）由来 | 技術士二次 模範解答 article.md 生成後 |
| **cem-essay-qa** | `content/note/技術士総監/magazines/{magazine}/{slug}/article.md`（総監記述式 模範論文／模範解答） | 字数〔各施策600字〕・散文性・監理可能性〔越権排除〕・専門度〔設問3 NG用語/5管理正式名〕・白書根拠/真正性〔ペルソナ経験座〕（5軸）＋字数 strict・見出し構造・note-lint・blockquote濫用ゲート。評価軸の真実源は `note-essay-review-checklist.md`。pe-secondary-exam-qa（建設部門）/cem-qa（キーワードページ）と守備範囲が直交 | 総監 note 記述式 模範論文 article.md 生成後 |
| **rccm-essay-qa** | `content/note/RCCM/magazines/{magazine}/{slug}/article.md`（RCCM 問題III 模範論文・問題I テンプレ） | 字数・形式〔1,200〜1,600 字・①②〕・指定用語〔「」4 語以上〕・視点/構成〔管理技術者視点〕・専門度・事実根拠/真正性（5軸）＋`check-rccm-essay --strict`・note-lint・問題再現節 0 ゲート。試験事実の真実源は `_facts-2026.md` | RCCM note 教材 article.md 生成後 |
| **cce-essay-qa** | `content/note/コンクリート主任技士/magazines/{magazine}/{slug}/article.md`（令和形式テーマ別・8立場／立場別はテーマ単位で8本） | 本番形式への適合・立場の書き分け・技術精度・出題実績の整合・販売構成/真正性（5軸）＋`check-cce-essay`・note-lint。出題履歴の真実源は `cce-essay-history.json` | 主任技士 小論文テーマ別教材の生成後 |
| **past-exam-qa** | `.mdx`（過去問 primary/secondary・`pe-comprehensive-management`/`pe-first-stage`/`civil-construction-1`/`-2`/`concrete-chief-engineer`/`concrete-diagnostician`） | 構造統一・正答正確性/全選択肢正誤検証・ExamPoint 折衷案準拠・RelatedKeywords健全性・モバイル文体（primary 5軸／secondary は軸3=ExamPoint を除外し4軸正規化、加重 ≥2.0 で合格） | 既存過去問記事の品質監査時・過去問品質サイクルの評価フェーズ |

**対象ファイル・軸・起動タイミングが全て異なる**ため、これらは統合しない（「対象ドメインの分離」原則）。

**PE ガイド記事（`group: guide`）の Evaluator は部分割当**: `cem-qa` は原則キーワードページ専用だが、**横断トレードオフガイド（`management-tradeoffs`）の §23 構造チェック**は cem-qa の追加スコープとして 2026-05-28 起動済み（核同士の対称関係宣言・固有名詞混入・SpecSheetList 個数・評価軸メタ解説）。他の `group: guide` 記事（戦略系 Type-1 / 俯瞰系 Type-2）は依然 lint-mdx-mobile.mjs カテゴリ 12 で構造違反を機械検知のみ。Phase 2 で `guide-qa` Evaluator 新設を検討（note CTA 整合性・サイト内回遊密度の 3 軸）。

**UI・ページデザイン**は Generator/Evaluator を分離する: Generator＝`page-design-builder`（`design-system.md` 単一 SSOT 準拠でページ/レイアウト/UI コンポーネントを実装）、Evaluator＝`/design-review --visual` スキル（旧 `ui-visual-qa` エージェントを統合・light/dark × desktop/mobile 視覚回帰 + 7 カテゴリ）。静的 lint は `scripts/lint-ui.mjs`。図版 SVG は別系統（`svg-canvas-fitter`/`svg-figure-rewriter` ↔ `svg-figure-auditor`）。

---

## チーム連携パターン（Phase 1）

| シナリオ | エージェント連携 |
|---|---|
| **Phase 1 開発フロー** | 1. PDF→MDX 変換 → 2. **content-qa**（品質評価） → 3. `/deploy`（本番反映） |
| 週次 PDCA（簡略版） | strategy-advisor（weekly-review → plan-weekly） |
| キーワードページ作成 | `/keyword-page`（Generator） → `cem-qa`（Evaluator）→ 不合格なら再修正 |
| キーワードページ品質サイクル | `/quality-cycle`（オーケストレータ） → `cem-qa`（評価） → `keyword-rewriter`（改訂） → 再評価 → 人間レビュー |
| 1級・2級土木 textbook 変換 | `/pdf-to-mdx --exam {civil-construction-1\|civil-construction-2}`（Generator） → `civil-construction-qa`（Evaluator） → `/improve-article --mode verify` |
| 2級土木 過去問変換 | `/exam-questions-import --exam {civil-primary-2\|civil-secondary-2}` --year r0X [--sub zenki\|kouki]（Generator） → `content-qa`（Evaluator） → `civil-secondary-exam-writer`（解答補完、Phase 1 対応予定） |
| 技術士第一次 過去問変換 | `/exam-questions-import --exam pe-first-stage` --year r0X --sub {basic\|aptitude\|construction}（Generator） → `content-qa`（Evaluator、`pe-first-stage` + `primary`） |
| 1級土木 textbook/guide 品質サイクル | `/civil-textbook-cycle`（オーケストレータ） → `civil-construction-qa`（校正モード）（評価） → `civil-textbook-rewriter`（改訂） → 再評価 → 人間レビュー |
| UI・ページデザイン | `page-design-builder`（`design-system.md` 準拠で実装）→ `/design-review --visual`（light/dark × desktop/mobile 視覚回帰）→ 親が `lint-ui.mjs` 検証・`/simplify` で微修正 |
| 過去問品質サイクル | `past-exam-qa`（評価・指摘）→ `past-exam-rewriter`（指摘適用）→ 親が lint-mdx-mobile/validate-mdx で検証 → 再評価 → 親が明示パス commit |
| 総監 記述式 模範論文サイクル | `cem-essay-writer`（生成・自己ゲート）→ `cem-essay-qa`（5軸採点）→ 不合格は writer へ修正指示で再走 → 親が配線（note-magazines.ts/note掲載文.txt/PDF spec）・公開後 URL 反映・明示パス commit。ランブック＝`note-essay-review-checklist.md` |
| RCCM note 教材サイクル | `rccm-essay-writer`（生成・`check-rccm-essay --strict` 自己ゲート）→ `rccm-essay-qa`（5軸採点）→ 不合格は writer へ修正指示で再走 → 親が配線（`note-magazines.ts rccm-*`／`note-magazine-membership.json`／`sales-recorder.md`）・カバー・公開・明示パス commit。試験事実は `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md` が SSOT |
| 主任技士 小論文サイクル（`/cce-essay-cycle`） | 新年度は SSOT `cce-essay-history.json` へ追記→`check-cce-essay --fix` でサイト/note の出題履歴ブロックを再生成。答案は `cce-essay-writer`（`check-cce-essay` 自己ゲート）→ `cce-essay-qa`（5軸）→ 不合格は writer 再走 → 親が技術事実の抜き取り照合・配線・PDF・commit |

**注**: 月次企画・四半期レビュー・試験シーズン対策・広告最適化は Phase 2 で再開予定。

---

## 新規エージェント追加時の手順

1. `.claude/agents/{agent-name}.md` を作成
2. frontmatter に `name` / `description` / `model` を必ず指定
   - model 選択ルールは `.claude/skills/create-skill/SKILL.md` の「サブエージェント作成時の model 指定ルール」または CLAUDE.md「ハーネス設計原則」§5 を参照
3. Generator か Evaluator かを明記（混在禁止）
4. 本文に「モデル方針」欄を設け、`model: sonnet/inherit` を選んだ理由を 1-2 文で記載
5. `npm run build-capability-index` を回し、書き換わった文書（このファイルと skills-guide.md）を同じ commit に含める（`check-doc-coupling` が一致を見る）
6. Evaluator なら「Evaluator エージェントの区別」表に 1 行足す（ここだけ手書き）
7. CLAUDE.md は per-agent の表を持たず件数・詳細を agents-registry.md に委譲する（CLAUDE.md 本体の編集は不要。`model:` 方針の一文は §5 にある）

2026-09-13: strategy-advisor / todo-planner は `check-content-expansion` で教材・図解の未確認と変更後の再確認を読み、既存backlogと事業レビューへ接続する。
