---
title: スキル ナビゲーションガイド
---

# スキル ナビゲーションガイド

アクティブなスキルを **用途別** に素早く探すための早引き。  
設計原則・退役ログ → `skills-registry.md` / 作成手順 → `skills-design-guide.md`

---

## カテゴリ別クイックリファレンス

### コンテンツ制作（authoring）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/keyword-page` | 総合技術監理キーワードページ作成・校正 | `キーワード作成`, `ページ更新`, `/keyword-page` |
| `/create-svg` | MDX 記事用 SVG 図版作成。**`figure-*.svg`（記事+SNS両用）は固定キャンバス必須**（feed 4:5 `400×500`／`--wide` 16:9 `640×360`・概念名タイトル禁止。真実源 figure-canvas-policy.md、ガード `npm run check-figure-canvas`、再レイアウトは `svg-canvas-fitter`）。一括目視 QA は `npm run svg-gallery`（site/note タブ＋資格別フィルタ・audit 重大度＋canvas 適合バッジ） | `図版を作りたい`, `SVG 作成`, `/create-svg` |
| `/illustrate-concept` | Web 画像検索→SVG 一括生成→MDX 挿入 | `コンセプト図`, `イラスト挿入`, `/illustrate-concept` |
| `/improve-article` | 単一記事の対話的改善（PDF 照合 QA も可） | `記事を改善`, `校正して`, `/improve-article` |
| `/promote-to-site` | Obsidian MD → doboku-note MDX 変換・配置 | `Obsidian記事を公開`, `MDX変換`, `.md→.mdx`, `promote` |
| `/notebooklm-research` | NotebookLM で総監キーワードを深掘り調査 | `NotebookLM調査`, `引用付き根拠強化`, `/notebooklm-research` |
| `/visual-research` | NotebookLM×参照URL → SVG 概念図生成 | `概念図をSVGで`, `URL直接渡す図版`, `/visual-research` |
| `/civil-keiken-magazine` | 1級・2級土木 施工経験記述 note有料マガジンのフル模範答案を生成・採点（Generator→Evaluator、過去問年度別/テーマ別/予想の3種） | `施工経験記述マガジン`, `模範答案を作成`, `予想問題集を作る`, `/civil-keiken-magazine` |
| `/pe-secondary-yosou` | 技術士建設部門2次 選択科目の R8予想を1科目分まるごと公開可能品質まで仕上げる統括（生成→**外部事実照合**→6軸採点→梱包→SoT→commit）。**予想はテーマ別の独立記事（テーマ網羅型・1記事1ディレクトリ）**で作る（年度ミラー/区分1ファイルでなく）。記事内は h2 ブロック構成（予想問題→なぜ出るか→論述の骨子→フル模範解答→採点ポイント）。過去問は区分1ファイル据え置き。**クラウド実行前提**（factcheck は WebSearch 必須） | `建設部門の予想問題を仕上げて`, `BK-0Xの予想`, `{科目}の予想問題集`, `/pe-secondary-yosou` |
| `pe-secondary-exam-writer` エージェント | 技術士建設部門 2次試験 note有料マガジン用 模範解答を生成（全11専門分野・科目種別I/II-1/II-2/III。元公務員発注者視点注入、合格3科目=合格者訴求・残8科目=発注者監修訴求。過去問＋forecast予想モード） | `建設部門note模範解答`, `技術士2次マガジン`, `pe-secondary-exam-writer` |
| `pe-secondary-exam-factcheck` エージェント | 建設部門2次 模範解答の技術的事実を WebSearch で外部一次情報に照合（合格科目外の専門ハルシネーション捕捉。QA=構造／note-fact-checker=内部 を補完） | `予想の事実確認`, `技術的事実の照合`, `pe-secondary-exam-factcheck` |
| `cem-essay-writer` / `cem-essay-qa` エージェント | 技術士総監 記述式 note有料マガジンの模範論文/模範解答を生成・採点（4タイプ＝persona模範論文〔R03-R07＋R8予想2記事〕/R8予想問題集/設問3国家施策バンク/5管理クロストレードオフ。各施策600字・5軸採点。ランブック＝`note-essay-review-checklist.md`。**サイトの r0X-essay は `/pe-essay-draft` で別物**） | `総監note模範論文`, `総監記述式マガジン`, `cem-essay-writer` |

### 変換（conversion）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/pdf-to-mdx` | PDF/画像 → MDX 変換（試験別テンプレート）。`--scanned` でテキスト層なしスキャン書籍を視覚 OCR（`scanned-textbook-transcriber`）→ 内部リファレンス .md ＋図クロップ | `PDF変換`, `MDX化`, `スキャン教材の文字起こし`, `書籍OCR`, `/pdf-to-mdx --exam {cem\|civil-construction-1\|general}`, `/pdf-to-mdx --scanned` |
| `/exam-questions-import` | 過去問集 PDF → MDX（解答追加も可） | `過去問取込`, `/exam-questions-import --exam {civil-primary\|civil-secondary\|pe-primary\|pe-first-stage}` |
| `/ogp-create` | サイト OGP（mono-tag・全幅＋資格別テーマ色外枠）＋ note 記事カバー（G2・試験色分け）生成。デザイン SSOT は `docs/reference/ogp-prompts.md`、一括目視 QA は `npm run ogp-gallery` | `OGP画像`, `noteカバー`, `/ogp-create` |
| `/ogp-design-explore` | OGP 意匠の**新方向を aidesigner / Canva の MCP で素案として試作**し、採用案を `/ogp-create` の satori テンプレに落として量産につなぐ。試作専用（量産・per-article 生成は `/ogp-create`）。MCP は外部クレジット消費 | `OGPデザイン検討`, `OGP素案`, `OGPリデザイン試作`, `/ogp-design-explore` |
| `/magazine-to-pdf` | note マガジンの article.md →「問題文＋解答」中心の紙用 PDF（spec 駆動・A/B案両収録） | `マガジンをPDF`, `記事を紙で`, `模範論文PDF`, `/magazine-to-pdf --spec scripts/pdf-specs/{name}.json [--desktop]` |

### 品質管理（quality）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/check-mdx` | MDX 品質検査の統合 Evaluator（10 ルール） | `MDX検査`, `lint`, `構文チェック`, `/check-mdx --rules <rule>` |
| `/quality-cycle` | 品質サイクル（スコア→リライト→検証→レビュー） | `品質サイクル`, `cem品質上げ`, `/quality-cycle --profile {cem\|civil-textbook}` |
| `/exam-backlinks` | 過去問⇔キーワード紐付け確認・再生成 | `バックリンク確認`, `/exam-backlinks` |
| `/audit-exam-mapping` | 過去問⇔キーワード紐づけマップの精度監査 | `紐づけ監査`, `/audit-exam-mapping` |
| `/build-exam-notebook` | 過去問 MDX を NotebookLM notebook に投入 | `NotebookLM投入`, `/build-exam-notebook` |
| `/verify-exam-coverage` | キーワードが過去問論点をカバーしているか検証 | `論点カバレッジ確認`, `/verify-exam-coverage` |
| `/review-mobile` | モバイル視認性・可読性レビュー | `モバイルチェック`, `スマホで見て`, `/review-mobile` |
| `/consolidate-duplicate-keyword` | 総監キーワード集の重複スラグ統合 | `重複スラグ統合`, `/consolidate-duplicate-keyword` |
| `/note-prepublish-review` | note 公開前の統合品質ゲート | `note公開前チェック`, `公開準備`, `/note-prepublish-review` |
| `/check-seo-meta` | title/description/OGP/canonical の検査 | `SEOメタ検査`, `OGP確認`, `/check-seo-meta` |
| `/pe-essay-review` | 総監記述式模範論文を 3 視点で採点（**サイト** r0X-essay ページ。note 有料マガジンは `cem-essay-qa`） | `記述式採点`, `模範論文レビュー`, `/pe-essay-review` |
| `/keiken-charcount` | 1級・2級土木 施工経験記述マガジン答案を解答欄しきい値で字数チェック（決定論的・暫定値） | `経験記述の字数確認`, `答案の字数オーバー検出`, `/keiken-charcount` |
| `/civil-figure-rework` | 1級土木 過去問1次の図クロップ品質ループ（extractor → auditor 最大3反復、1ページ単位 commit） | `過去問図再抽出`, `テキスト写り込み修正`, `/civil-figure-rework {exam-slug\|--all}` |
| `/audit-pe-first-stage` | 技術士第一次試験全21ページの正答照合・原典視覚突合・構造検査（3軸監査） | `pe-first-stage監査`, `技術士第一次試験QA`, `/audit-pe-first-stage [--year R07] [--sub aptitude]` |

### SNS 運用（social）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/social-post` | note / X 投稿テキスト生成の統合スキル | `note投稿文`, `X投稿テキスト`, `/social-post --platform {note\|x}` |
| `/pe-note-plan` | 技術士総監 記述式 note 有料記事・magazine の**編集ロードマップ**を提案する企画スキル（本文は書かない）。段階投下方針・magazine 在庫・価格・過去問カバレッジを突合し「次に何を・どの順で・いくらで出すか」を優先度付きで提示 | `noteの次の一手`, `magazine企画`, `記述式コンテンツの投下計画`, `/pe-note-plan [--horizon {next\|quarter}]` |
| `/note-hashtags` | note 公開用ハッシュタグ 99 個を生成（選択科目は `--article II1-1` 等でファイル別出力） | `ハッシュタグ生成`, `/note-hashtags {slug} [--article {suffix}]` |
| `/ig-post-create` | Instagram カルーセル PNG の**新規生成**（過去問パック・KW 解説の単発）。※既存パック再生成は restyle、figure 変換は figure-pack | `Instagram投稿作成`, `IG スライド`, `/ig-post-create --slug {kw}` |
| `/ig-figure-pack` | キーワードの **site figure SVG を** 4 枚カルーセルパック（表紙/図解/テキスト/CTA）に変換。resvg-js で 1080×1350 PNG 生成 + caption.txt。slide-data.json 不要の軽量ワンオフ用途（過去問パックは対象外） | `IG figure 投稿`, `キーワード図解カルーセル`, `/ig-figure-pack {keyword}` |
| `/ig-carousel-restyle` | tokens.json 更新後に**既存**過去問パック PNG を 3 フォーマット（Carousel/Reels/Stories）一括再生成（新規生成は post-create） | `IGデザイン再適用`, `カルーセル再生成`, `/ig-carousel-restyle --year r07` |
| `/ig-reel-create` | 過去問パックのカルーセル PNG から 1080×1920 Reels mp4 を生成（VOICEVOX TTS + ffmpeg）。`--exam-dir` で多資格対応（技術士総監 / 1級土木 / 2級土木、2級は年度に z=前期 / k=後期 接尾辞） | `IG リール作成`, `動画化`, `/ig-reel-create --exam-dir 1級土木 --exam r07-pack-01 --skip-png` |
| `/create-x-card` | tweets.md から X 投稿用サマリカード PNG 生成（多資格＝総監/1級/2級の試験別色・ヘッダに自動切替） | `Xカード作成`, `X投稿カード`, `/create-x-card` |
| `/publish-x` | Playwright で X 投稿を自動化（即時・予約）。**予約運用は再開（2026-07-07・@doboku373）**。凍結実因＝連続/重複予約を潰すため **ガード付きフロー必須**: writer→`x-schedule-guard`緑→`--dry-run`→`--queue`緑→本番→`x-sync-status`（policy §11.5）。ガード赤なら予約しない・1 週間分ずつ・1 日 3 本上限・自動エンゲージ禁止 | `X投稿`, `自動投稿`, `/publish-x` |
| `/publish-note` | browser-use CLI で note.com/dobokunote に投稿。(1) 模範論文マガジン記事（有料・`<persona> <RXX>`）または (2) 建設部門 無料ファネル記事（入口/キーワード・`--free <dir>`）を下書き/予約/即時公開（stats47 由来を適応）。本文paste・カバー・タグ自動／有料境界・PDF添付・リンクカードは半手動。**実行は Mac 推奨**（会社PCプロキシ制約） | `note投稿`, `note公開`, `note下書き作成`, `/publish-note <persona> <RXX>`, `/publish-note --free <dir>` |
| `/audit-note-funnel` | note 導線（資格別 3 層モデル＝L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA）のドリフトを監査・修復。**ソース D1-D4**（CTA 欠落・L2 未収録・L1 未リンク／`npm run audit-note-funnel`・CI=`check-note-funnel`）＋ **`--live` で D5 ライブ反映**（配線後に再投稿せず live が死ぬドリフトを note API で検出）。修復は `wire-note-funnel-cta`（ソース配線）／**`note-append-cta`（公開済み記事へ live 反映・Windows 可・通知いいえ）**。意味監査は `note-funnel-auditor`。真実源 `docs/reference/note-funnel-architecture.md` | `note導線の見直し`, `もくじ整備`, `CTA配線`, `ファネル監査`, `/audit-note-funnel [--exam {key}] [--apply\|--semantic\|--live]` |
| `/note-magazine-sync` | note.com 公開マガジン（27件）と SoT（note-magazines.ts）の同期ズレを検出・自動修正。SoT 側（未配線/価格ドリフト）は自動 Edit+commit、note.com 側（空マガジン/異質記事）は残件報告。`node scripts/verify-note-magazines.mjs --contents` 駆動（npm run は intermittent 失敗あり → node 直呼び） | `noteの同期確認`, `SoT突合`, `マガジン公開状態チェック`, `ブラウザcliでnoteを確認`, `/note-magazine-sync` |
| `/note-edit-magazine` | note 有料マガジン設定（タイトル/説明/アピール/価格）と収録記事の単品価格を **`note掲載文.txt`（単一SoT）駆動**で自動編集→保存（Playwright × システム Chrome）。文字数制限ガード（タイトル30/説明400/アピール250・超過 abort）・読み戻し照合・保存後 API 検証。dry-run 必須。文字数ゲートは `npm run note-meta-lint`、読取照合は `/note-magazine-sync`、入口は `npm run note-edit-session` | `noteマガジン編集`, `note価格変更`, `noteタイトル変更`, `/note-edit-magazine --key {key} --dir {magazineDir}` |
| `/note-magazine-add` | 既存 note 記事を別マガジンへ**収録（追加）**するブラウザ CLI（Playwright × システム Chrome）。追加対象は note 公開 API の**差分で自動算出**（手動列挙なし・冪等）。**既定 dry-run・実追加は `--commit`**・`--probe` で実DOMダンプ・追加後 API で収録実体検証。**Windows(会社PC)動作確認済（2026-06-15・channel:chrome＋ignoreHTTPSErrorsでプロキシ越え）・Mac可**。`note-edit-magazine`（設定/価格）とは別操作 | `マガジンに記事を追加`, `完全パックに収録`, `パックへ記事を入れる`, `ブラウザcliでマガジンに記事追加`, `/note-magazine-add --target {key} --from {k1,k2}` |
| `/note-magazine-create` | note 有料マガジンを **`note掲載文.txt` 駆動**で新規作成（`/magazines/new`・有料単体・カテゴリ=キャリア）。`note-edit-magazine`(編集)・`note-magazine-add`(収録)と役割分離。**既定 probe・実作成は `--commit`**・作成前に fill 読み戻し検証・key 取得。Windows可（channel:chrome＋ignoreHTTPSErrors） | `noteマガジン作成`, `note有料マガジンを作る`, `/note-magazine-create --dir {magazineDir}` |
| `/note-publish` | note 有料記事を Playwright × システム Chrome で**下書き作成→公開**（`publish-note`=browser-use の Windows 決定的版）。account=dobokunote ゲート・**既定 draft / `--commit` で公開**・カバー/タイトル/本文(markdown)/価格(`#price`)/タグ/**有料境界を「試験問題・予想問題」直前に自動設定＋公開前に `boundaryBeforeExam` 検証**まで自動。**リンクカード化も type 方式で自動**（各URL行を Range選択→Delete→type→Enter。note の埋め込み検出は keyboard.type で起動・synthetic paste不可）。Windows(会社PC)動作（channel:chrome＋ignoreHTTPSErrors）。**予約投稿対応**=`--schedule "YYYY-MM-DDTHH:MM"`（note無料・即時の代わりに予約公開・日時未確定なら下書き退避）、バッチ時間ずらしは `note-publish-magazine --list <manifest> --schedule-start ... --interval-hours N` | `note記事公開`, `note有料記事を投稿`, `note自動公開`, `/note-publish --article {path} [--commit] [--schedule YYYY-MM-DDTHH:MM]` |
| `/note-magazine-cover` | note 有料マガジンの**見出し画像（cover）**を `_cover.png`（1280×670）から設定（Playwright × システム Chrome）。`note-magazine-create` が作成時に付けない systematic 欠落を補う＝**マガジン作成パイプラインの一工程**。**既定 probe・実保存は `--commit`**・「この画像を使う」→更新・保存後 API で `cover`/`coverRectangle`（`eyecatch` でない）が実カバー（未設定時 cloudfront `default_magazine_header`＝デフォルト判定）かを検証。Windows可 | `noteマガジンのカバー設定`, `マガジン見出し画像`, `マガジン画像が未登録`, `/note-magazine-cover --key {key} --dir {magazineDir}` |
| `/note-attach-pdf` | 公開済み note 有料記事の**本文末尾（有料エリア内）に印刷用 PDF をダウンロードカードとして添付**し再公開（Playwright × システム Chrome）。`note-publish` が扱わない「ファイル添付」（従来半手動）を自動化。1記事=`note-attach-file.mjs`／1マガジン直列バッチ=`note-attach-magazine-pdfs.mjs`（noteId↔PDF 突合・done-log 再開・最大2回試行）。**既定 dry/probe・実添付は `--commit`**・有料境界を**非破壊検証**（既定=試験問題直前を維持・**別型は `--boundary-regex "<H2先頭一致>"` で上書き**、例 暗記ノート=`コンクリート工`／`2. コンクリート工`・崩れたら中断）→更新する・偽成功ガード（公開ページで有料維持を実査）・冪等（既添付は再公開のみ）。**PDF挿入は本文末尾へJSで caret 移動**（旧 Control+End は Windows専用でMac無効→冒頭挿入=無料流出だった・2026-07-04是正）。Windows/Mac可 | `note記事にPDF添付`, `印刷用PDFを記事末尾に`, `マガジンのPDFが未添付`, `/note-attach-pdf --dir {magazineDir} [--commit] [--boundary-regex "<H2>"]` |
| `/publish-ig-bs` | Playwright × Meta Business Suite で IG **カルーセル/リール**を**予約投稿**（`--reel` で reels/video.mp4・IG 単独化・spinbutton 時刻・dry-run 必須）。即時は `--now`（Graph API 経路は 2026-06-17 全廃＝IG 投稿は本スキルに一本化） | `IG予約投稿`, `インスタ予約`, `リール予約`, `Business Suite 投稿`, `/publish-ig-bs` |
| `/ig-reconcile` | IG 公開状態をライブのグリッド＋プランナーと照合（`verify-ig-status`）し、posted.json/status.json のドリフトを是正・未公開を安全に予約まで運ぶ運用スキル。`ig-publish-auditor` で公開可否ゲート→`publish-ig-bs` で衝突しない時間帯へ予約→プランナー実体確認。投稿/予約は operator 確認後・削除は対象外。真実源 `docs/reference/ig-publish-reconcile.md` | `IG公開状態を確認`, `未公開を予約投稿`, `IGのSoTドリフト是正`, `IG status reconcile`, `/ig-reconcile` |
| `/x-repost` | 高エンゲージな技術士総監/1級・2級土木ツイートを検索 → `x-repost-curator` で選別＋引用コメント生成 → Playwright で引用RP（ローカル `/loop` 運用・dry-run 必須） | `Xリポスト`, `引用リポスト`, `/x-repost` |
| `/yt-shorts-create` | **v7: IG Reels mp4 から YouTube Shorts を派生**（**≤60秒**トリム〔60秒超は通常動画扱い〕+ 概要欄差替、`--from-reels`。投稿は3本/日・JST07:30/12:30/20:00、真実源 policy §5-7。MDX 直結 `--slug` は廃止） | `YouTube Shorts`, `YT 派生`, `/yt-shorts-create --from-reels r03-pack-01` |

### 開発（dev）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/dev-start` | ポート 3020 をクリーンアップして開発サーバー起動 | `開発サーバー`, `dev start`, `/dev-start` |
| `/deploy` | Cloudflare Pages へデプロイ | `デプロイ`, `本番反映`, `/deploy` |
| `/code-review` | Next.js コード品質レビュー | `コードレビュー`, `/code-review` |
| `/review` | 対象ファイル種別を自動判定しレビュースキルを実行 | `レビューして`, `/review` |
| `/pr-create` | 現ブランチから GitHub PR を作成 | `PR作成`, `/pr-create` |
| `/simplify` | 変更 diff を点検し最小差分で修正→lint→PR チェーン | `diff確認`, `最小修正`, `/simplify` |
| `/create-skill` | スキル作成ガイド | `スキルを作りたい`, `/create-skill` |
| `/sync-r2-images` | R2 画像のローカル同期 | `R2同期`, `/sync-r2-images` |
| `/diff-r2` | ローカル ↔ R2 の双方向差分検出 | `R2差分`, `/diff-r2` |
| `npm run upload-sns-r2` + `sns-archive-auditor` エージェント | docs/sns の reels wav/mp4 等を R2 へ退避（容量削減）。`sns-archive-auditor` が SoT 無傷＝再生成可否で OFFLOAD/ARCHIVE_KEEP/KEEP_LOCAL/BLOCK を判定→`--purge-local` は R2 バイト一致検証後のみ削除。真実源 `sns-archive-policy.md` | `SNS容量削減`, `wav/mp4退避`, `投稿済みパック退避` |
| `/monitor` | バックグラウンド監視 | `監視`, `/monitor` |
| `/zenn-audit` | Zenn 本番 CSS との差分検出 | `Zenn差分`, `/zenn-audit` |
| `/doc-sync` | コード/設定変更 diff × 候補 doc を `doc-sync-auditor` で突合し prose 陳腐化を検出→適用（機械ガード check-doc-refs/coupling の意味的な補完） | `ドキュメント同期`, `doc同期`, `仕様ズレ確認`, `/doc-sync` |
| `/doc-declutter` | doc の肥大化棚卸し（完了 handoff 退避/古い行 trim/重複統廃合）。機械 surfacer `check-doc-lifecycle` で候補→外部実体を検証→`doc-curator` が処分判定→退避/参照更新/memory 同期まで適用 | `ドキュメント棚卸し`, `handoff 整理`, `doc 肥大化`, `/doc-declutter` |

### 分析（analytics）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/fetch-gsc-data` | Google Search Console データ取得 | `GSCデータ`, `検索データ取得`, `/fetch-gsc-data` |
| `/psi-audit` | PSI で代表ページ日次計測、CWV しきい値違反を surface | `PSI計測`, `Core Web Vitals`, `/psi-audit` |
| `/record-sales` | note 販売履歴を SSOT（sales-log.json）に記録・集計 | `売上記録`, `販売履歴を記録`, `note売上`, `/record-sales` |

### 戦略・管理（management）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/plan-weekly` | docs/todo/ を読んで今週の優先タスクを決め weekly.md を直接更新（Sonnet 1回・軽量。※戦略計画は /weekly-plan） | `今週のタスクを決めて`, `今週何をすべきか`, `weekly.md更新`, `/plan-weekly` |
| `/weekly-improve` | 計測→改善候補抽出→実験登録の軽量オーケストレータ（performance 側） | `今週の改善`, `PDCA`, `/weekly-improve` |
| `/gsc-review` | 月次 GSC index coverage レビュー（gsc-index-auditor 起動→判断ログ追記） | `GSC月次レビュー`, `インデックス率`, `index coverage`, `/gsc-review` |
| `/weekly-review` | 週次レビューを生成 | `週次レビュー`, `今週の振り返り`, `/weekly-review` |
| `/weekly-plan` | 週次計画を生成（NSM・メトリクス連動・重め） | `戦略的週次計画`, `NSM込みの計画`, `/weekly-plan` |
| `/nsm-experiment` | NSM 改善の実験ライフサイクル管理 | `実験登録`, `NSM実験`, `/nsm-experiment` |
| `/north-star-metric` | NSM と Input Metrics を定義 | `NSM定義`, `北極星指標`, `/north-star-metric` |
| `/growth-loops` | 成長ループの設計・評価 | `成長ループ`, `フライホイール設計`, `/growth-loops` |
| `/monetization-strategy` | 収益化戦略のブレインストーム | `収益化`, `月X万円達成するには`, `/monetization-strategy` |
| `/knowledge` | 過去の失敗・教訓を参照・追記 | `ナレッジ参照`, `失敗から学ぶ`, `/knowledge` |
| `/critical-review` | 批判的レビュー | `批判的に見て`, `/critical-review` |
| `/pre-mortem` | Pre-Mortem の実施 | `Pre-Mortem`, `リスク洗い出し`, `/pre-mortem` |
| `/distill-proofread-learnings` | 校正作業から新規ルール・ユーザー嗜好を抽出 | `校正から学ぶ`, `新ルール抽出`, `/distill-proofread-learnings` |
| `/routines` | クラウドルーティン（/schedule）を一覧・監査（重複・残骸・平文トークン・cron 衝突検出）。**新規作成前の重複チェック必須** | `ルーティン一覧`, `ルーティン監査`, `/routines` |

### UI/UX（ui）

| スキル | 一言説明 | 呼ぶとき |
|---|---|---|
| `/design-review` | デザインシステム準拠レビュー（7 カテゴリ）＋ `--visual` で視覚検証 | `デザインレビュー`, `/design-review` |

---

## 用途別ガイド（今やること別）

### note 記事を公開前に仕上げたい

1. `/note-prepublish-review` — 公開前チェックゲート（inline + 3 エージェント並列）
2. `/note-hashtags {slug}` — ハッシュタグ 99 個を生成（選択科目: `--article II1-1` 等でファイル別出力 → `hashtags-II1-1.txt`）
3. `npm run note-reflow -- --dry <file>` — 段落長点検・一括リフロー（>120 字を文境界で短く・語句不変、`content-principles.md §14-e`）

### キーワード品質を上げたい

1. `/quality-cycle --profile cem --mode auto-loop` — 全件スコアリング → 低スコア自動リライト → 再評価（閉ループ）
2. `/audit-exam-mapping` — 紐づけ精度の一括 semantic 監査

### SNS 投稿を量産したい（v7: IG 一次 → YT 派生）

1. `/ig-post-create --exam {pack-id}` — Instagram カルーセル/Reels PNG（一次制作）
2. `/ig-reel-create --exam {pack-id}` — カルーセル PNG → 全4問フル Reels mp4（VOICEVOX + ffmpeg、≈90-145秒）
   - **短い「1問1リール」が欲しいとき**: `node .claude/skills/social/yt-shorts-create/scripts/per-problem-shorts.mjs --ig-mode --year {r07} --pack {r07-pack-01} [--questions 1,2]` → `reels-pp/q<N>/{video.mp4,caption.txt}`（≈36-45秒・チャーム無し・論点 caption）
3. `/publish-ig-bs post {pack|reels-pp/q<N>} [--reel] --schedule …` — IG カルーセル/リールを Business Suite で**予約投稿**（即時は `--now`。Graph API 経路は 2026-06-17 全廃）
   - **リール JIT**（生成→予約→mp4削除で在庫を持たない）: `node scripts/publish-reel-jit.mjs --pack {r07-pack-01} --question 1 --schedule {YYYY-MM-DDTHH:MM}`。動画 mp4・wav は gitignore（コミットは slide-data + script.txt + caption.txt、wav は R2 退避＝upload-sns-r2／再生成可）
4. `/yt-shorts-create --from-reels {pack-id}` — IG Reels mp4 → YouTube Shorts 派生
5. `/create-x-card` — X 投稿カード作成（`/publish-x` 予約運用は 2026-07-07 再開・ガード付きフロー必須。policy §11.5 / skills-guide §69）

**IG ハイライト整備**（戦略 v7.1、`node` スクリプト）:
- `node .claude/scripts/instagram/build-highlight-materials.mjs --all` — 6 ハイライト × 32 PNG 一括生成（モダンシック意匠、ジャンル別カラー）
- `node .claude/scripts/lint-stories-titles.mjs` — title 字数 lint（auto-fit 4 段階判定）
- エージェント: `ig-highlight-designer`（slide-data 執筆）→ `ig-highlight-qa`（4 軸採点）
- 詳細: `docs/reference/ig-highlight-design-policy.md`

**SNS 計測・公開状態照合**（「投稿 → 計測 → 改善」ループ。計測は CI 供給が正・ローカル creds 不要）:
- SNS 流入 breakdown: `fetch-metrics.yml`（金 06:00 JST）が `npm run fetch-ga4-data -- --dimension sourceMedium --sns-only` を回し `ga4-sourceMedium-sns-*.json` を蓄積。週次スナップショット（`weekly-metrics/`）にも SNS 流入（source 別 WoW）が入る
- 週次レビュー: `/weekly-review` の **Agent F**（SNS 流入・投稿実績）＋ `metrics-analyzer` の **Pattern 6 SNS-Source-Shift**（急落/新規成長 source を surface）
- X UTM ゲート: `npm run check-x-utm`（pre-commit・X 送客リンクに `utm_source=x`/`utm_medium=social` 必須）
- YT 公開照合: `npm run verify-yt-status`（`verify-yt-status.yml` 週次・削除/非公開/アップ穴を検知・read-only → `.claude/state/yt-verify/latest.json`）
- IG 公開照合: `/ig-reconcile`（`verify-ig-status`）／型・雛形の索引: `docs/project/03_SNS/00_SNS整理マップ.md §型カタログ`

### PDF を MDX に変換したい

1. `/pdf-to-mdx --exam {cem|civil-construction-1|general}` — テキスト・図版含む変換
2. `/exam-questions-import --exam {civil-primary|civil-secondary|pe-primary}` — 過去問集

### 建設部門 2次 note 模範解答を生成したい

1. `pe-secondary-exam-writer` エージェントに `year` / `subject` / `exam_type` / `magazine_id` を渡す
2. 運営者が article.md をレビューして note 投稿（noteUrl を frontmatter に記入）
3. 詳細: `docs/note/技術士建設部門/noteコンテンツ計画.md`、エージェント: `.claude/agents/pe-secondary-exam-writer.md`

### 総監 記述式 模範論文（note 有料）を生成したい

1. `cem-essay-writer` エージェントに `type`（`persona`/`r8yosou`/`setsumon3`/`crosstradeoff`）/ `magazine` / `slug` を渡す → `cem-essay-qa` で5軸採点（不合格は writer へ修正指示で再走）
2. 工程・評価軸・公開ゲートの SoT＝`docs/reference/note-essay-review-checklist.md`（Step 0〜6f がランブック）。配線・公開後 URL 反映・commit は親
3. **サイトの r0X-essay-{attr} ページは別物** → `/pe-essay-draft`（Generator）→ `/pe-essay-review`（Evaluator）

### Kindle EPUB（KDP 出版）を生成したい

1. **Aシリーズ（1級土木 択一・論点別）**: `node scripts/build-takuitsu-reconstruct.mjs --theme {key} --format epub`
   - `--theme` に指定できるキー: `anzen`（安全管理）、今後 `hoki`/`sekko`/`kankyo`/`hinshitsu`/`kotei` を追加
   - 出力先: `.tmp/takuitsu-{key}/{key}.epub`（gitignore）
   - Kindle Previewer 確認後、KDP（[kdp.amazon.co.jp](https://kdp.amazon.co.jp)）にアップロード
2. **Bシリーズ（技術士総監 択一・年度別）**: ジェネレータ未設計（Phase 2 着手予定）
3. **Cシリーズ（技術士建設部門 二次・模範解答）**: 着手条件「Web月収¥15k達成後」
4. 戦略全体・ラインナップ一覧 → `docs/project/01_戦略/08_Kindle出版戦略.md`

### マガジン記事を紙用 PDF にしたい

1. `/magazine-to-pdf --spec scripts/pdf-specs/{name}.json [--desktop]` — spec 済みマガジンを「問題文＋解答」PDF に再生成
2. 新規マガジン（spec 無し）は `magazine-pdf-builder` エージェントに spec 作成から委譲（A/B案など複数解答は両方収録）

### 週次 PDCA を回したい

1. `/weekly-improve` — 計測データから改善候補を自動抽出・実験登録（performance）
2. `/weekly-review` → `/weekly-plan` — 振り返りと翌週計画の作成

### GSC のインデックス状況（登録/未登録）を管理したい

1. 月次 CI（`index-coverage.yml`）が URL Inspection を取得済みの前提（無ければ `gh workflow run index-coverage.yml`）
2. `/gsc-review` — `gsc-index-auditor` が indexed_ratio・原因バケット（権威性/技術/hygiene）を診断
3. `docs/reference/gsc-management.md` の観測・判断ログへ判断を追記（真実源）。performance 側は `/weekly-improve` と直交

### 記事を Obsidian から本番サイトに上げたい

1. `/promote-to-site` — Obsidian MD → MDX 変換・配置
2. `/check-mdx --rules all` — 変換後の品質検査
3. `/deploy` — Cloudflare Pages に反映

### コードを変更してデプロイしたい

1. `/dev-start` — 開発サーバー起動
2. `/code-review` — コードレビュー
3. `/deploy` — Cloudflare Pages デプロイ

---

## Phase 2 待機スキル（現在未稼働）

| スキル | 着手条件 |
|---|---|
| `/keyword-gap` | Web 月収 ¥15k 達成後 |
| `/exam-demand` | Web 月収 ¥15k 達成後 |
| `/discover-exam-season` | Web 月収 ¥15k 達成後 |
| `/plan-affiliate` | Web 月収 ¥15k 達成後 |
| `/register-affiliate-banner` | Web 月収 ¥15k 達成後 |
| `/audit-ads` | Web 月収 ¥15k 達成後 |
