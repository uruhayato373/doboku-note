# ハンドオフ: 総監テキスト → 図解SVG（1概念=1図・記事+SNS両用）

> 日付: 2026-06-21
> 関連 memory: [[textbook-svg-dual-use]]
> 計画/候補/トリアージ: `docs/sns/_plans/`（figure-candidates.json・phase3a/3c/3d worklist・phase3b-triage.json）

## 方針（確定）

総監標準テキスト各管理 md を **「1概念=1枚のわかりやすい図解SVG」** にし、**記事 `<ArticleImage>` 埋め込みと SNS/YouTube 画像に両用**（一石二鳥）。

- スタイル真実源: `create-svg` スキル + `docs/design-system/svg-tokens.json`（color allowlist）+ `principles.md`
- 図版アーティファクトの SSOT = `.local/r2/posts/{slug}/img/figure-N.svg`（サイトが真実源、SNSは派生）
- Instagram カルーセル（notebook デザイン）は「文字小・余白大・余計な情報」で**不採用**

> [!note] このセッションの主眼
> 時系列図・体系図など「概念を1枚で見せる図」の量産と、それを支えるガバナンス（カタログ・SNSレンダラー・Evaluator分業）の整備。

## 完了したこと

### 図版ライブラリ（pe-comprehensive-management・実質完成）
- **49点**の図解SVGを新規作成（全て機械監査 HIGH=0、`svg-figure-auditor` ゲート通過）
  - high 23点 + medium/low 23点（5管理横断: 経済性/人的資源/情報/安全/社会環境）
  - NEW: 知財の存続期間ラダー（`industrial-property-rights/figure-1.svg`）
  - **時系列図: 環境条約・会議・議定書の歩み（`rio-declaration/figure-1.svg`）** ← 今回の主成果
- 代表例の品質: circular-society 5段階 / risk-treatment 2×2 / PPM / safety-culture / 廃棄物区分 / ISO26000 / 環境条約タイムライン

> [!tip] 時系列・体系図の作り方（再現メモ）
> - **時系列図**: 縦の時間軸（line）+ 年代ドット（circle）+ 年ラベル（右寄せ）+ カード（分野で色分け）。複合年（1992地球サミット=リオ宣言+気候変動枠組+生物多様性条約）は1カード内に複数行。viewBox幅400・高さは要素数で確保。
> - **分野の色分け（allowlist semantic）**: 生物多様性=positive緑 / 気候=brand青 / 廃棄物・化学=warn黄 / 枠組・理念=surface灰。
> - **体系図（ツリー/階層）**: species-preservation-act（レッドリスト階層・IA/IB入れ子）、waste-management-act（一般/産業廃棄物ツリー）、ISO26000（7原則カード）が雛形。

> [!warning] 時系列図は「年代の事実精度」が最重要
> 教材(md)の年が通説とズレることがある。今回 **ワシントン条約=md表記1971年／通説1973年(採択)**。タイムラインでは通説年を採用し、フッタに相違を明記した。30by30 は名古屋(2010)ではなく「のち(COP15 2022)」と位置づけ。**年代は md 鵜呑みにせず通説と突合し、相違は図中に注記する**。

### ガバナンス整備（3点クローズ）
- **図版カタログ（コレクションSSOT）**: `npm run build-svg-catalog` → `.claude/state/svg-catalog.json`（concept/embedded/audit を join、再生成でdrift防止）。**PR #269**
- **frame-figure レンダラー（記事SVG→SNS/YT画像）**: `.claude/scripts/sns/render-figure-sns.mjs`・`npm run render-figure-sns`。`ig-single` 1080×1350 / `yt-thumb` 1280×720。図SVGを事前resvg焼き込み→`<image>`埋込・アスペクト維持・ヘッダ(概念+管理色)+フッタ(送客)。**PR #270**（circular-society で実証済）
- **分業の回復**: gen-only量産で省いた `svg-figure-auditor`(Evaluator) をかけ直し→6不合格を `svg-figure-rewriter` で是正。**Evaluatorが機械監査の見逃し（濃色背景+白文字prohibited・allowlist外色・概念逆転・aria-label矛盾）を捕捉**

## 未着手・保留（次セッション）

> [!important] 着手前に: 開いているPRのマージ判断
> - **PR #269（カタログ）/ #270（SNSレンダラー）** が develop 未マージ。**マージするまで SNSパイプライン残りは develop で進められない**（レンダラーがdevelopに無い）。マージはユーザー判断（`/deploy`系）。

- **Phase 4: 記事への `<ArticleImage>` 埋め込み**（49点は現在 orphan=未埋込）— ユーザー指示で**保留中**。catalog の orphan リストが作業リスト。1記事=1パイロット→記事単位で展開（同一記事複数図は1エージェントで・競合回避）。
- **SNSパイプライン残り**（#270マージ後）: IG管理別カルーセルのオーケストレーション（cover+図slides+cta）/ コピー Generator 配線（caption/hashtags=ig writer規約、title/desc=yt writer規約）/ Evaluator 配線（ig-carousel-qa・yt-shorts-publisher-qa）
- **図版ライブラリ残り（低優先）**: UPGRADE 2点（正規分布3σ・マズロー＝既存色なしだが実用十分）。jit プル/プッシュ図は Evaluator が概念逆転検出→破棄（既存 kanban図がカバー）。他候補は既存SVG(145点)がカバー=SKIP（トリアージ済）。
- **他章の時系列・体系図**: 経済性/人的資源/情報/安全でも時系列・体系図が有効なら同手順で作成可。

## 主要コミット（develop）
- `bffbf5aa8` 図解SVG 24点（パイロット+high）/ `c61bba3a8` 重なり・出典修正
- `6f339ff8c` 量産23点 / `13298a018` descriptive-statistics修正
- `6f002cfa2` Evaluator指摘6件をrewriterで是正
- `d444081b6` 知財 存続期間ラダー（NEW）
- `2514c12e4` **環境条約タイムライン**（今回主成果）
- PR #269（svg-catalog）/ PR #270（render-figure-sns）

## 運用知見（再発防止）
- **gen-only 量産は必ず `svg-figure-auditor` を通す**。機械監査(audit.mjs)は HIGH=0 でも prohibited(濃色背景+白文字)・allowlist外色・概念誤り・aria-label矛盾を見逃す。
- **コピー/aria-label/概念の修正は `svg-figure-rewriter` 対象外**（文言不変が原則）→ 親が手動。色/間隔/marker/viewBox/濃色背景は rewriter。
- SVG内に「出典/総監テキスト/§/図表番号/教科書章番号」を書かない（法令条番号は可）。
- Workflow の罠: args文字列化（pipelineが配列受け取れず失敗）→ ワークリストはスクリプトに埋め込む。bulkは `model:'sonnet'` 明示。
