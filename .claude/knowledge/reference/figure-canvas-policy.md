# 図版キャンバス標準（figure-canvas-policy）

図版 SVG を「記事 + SNS 両用」で運用するための**固定キャンバス標準**の真実源（SSOT）。
新規作図のサイズ規約・既存図の移行方針・ガード・カタログ管理・エージェント分業をここで定義する。

機械可読版（レンダラー・ガード・カタログ・Generator が参照）は `.claude/config/figure-canvas.json`。
色トークンは `.claude/knowledge/design-system/svg-tokens.json`、作図手順は `.claude/skills/authoring/create-svg/SKILL.md`。

> [!note] 確定事項（2026-06-22）
> - **全図版のマスターは 4:5（feed）に固定**。サイト記事と Instagram フィードはこの 1 枚を使う。
> - **YouTube 通常動画・サムネ用の 16:9（landscape）は別途作成**（記事には埋め込まない＝SNS レンダー専用）。
> - 既存 194 枚は**段階バックフィル**で規定サイズへ作り直す。新規は**ガードで即準拠を強制**する。
> - 9:16（Shorts/Reels）は新規作図しない。feed をレターボックスで派生（`render-figure-sns`）。

---

## 1. キャンバス標準（固定は 2 種のみ）

| 役割 | 用途 | viewBox（作図単位） | 比率 | 描画解像度 | 記事埋込 | ファイル名 |
|---|---|---|---|---|---|---|
| **feed**（マスター） | サイト記事・IG フィード | `0 0 400 500` | 4:5 縦 | 1080×1350 | する | `figure-N.svg` |
| **landscape**（変種） | YouTube 通常動画・サムネ・X | `0 0 640 360` | 16:9 横 | 1920×1080 | しない | `figure-N--wide.svg` |

- **feed は幅 400** を守るので create-svg の「viewBox 幅 ≤ 400・viewBox 寸法 = 画面表示 px」前提と整合する。`style="max-width:400px;width:100%"` を付与する。
- **landscape は幅 640** で create-svg の記事埋込ルール（≤400）に抵触するため、**記事に埋め込まない**。`render-figure-sns` の入力としてのみ使い、PNG に焼いて SNS へ出す。
- 9:16 は派生のみ（`authored:false`）。feed を中央配置＋上下レターボックスで 1080×1920 を生成する。

> [!important] create-svg の「高さ可変」を上書きする
> create-svg は従来「高さ = 要素数 × 110 + 余白」の**可変高さ**だった。本標準は**高さを 500（4:5）に固定**する。
> よって create-svg SKILL と `check-mdx/svg` ルールの改定が本設計に含まれる（§6 実装シーケンス参照）。
> 縦の余白は「空白で埋める」のではなく、要素の拡大・一行サマリー・凡例で**埋めて使い切る**（間延びは Evaluator が検出）。

### フォント下限
- feed: viewBox 単位の最小フォント **11**（render ×2.7 = 約 30px）。create-svg の `minSize:11` を踏襲。
- landscape: viewBox 単位の最小フォント **12**（render ×3 = 36px）。記事非埋込のため画面表示 px 制約はなく、PNG での可読性のみを担保。

---

## 2. 作図規約（今後の新規図）

1. viewBox は **`400 500`（feed）か `640 360`（landscape）のいずれか**。それ以外は CI で赤落ち（§3）。
2. landscape は **必ず `--wide` 接尾辞**を付け、`<ArticleImage>` で埋め込まない。
3. 色は `svg-tokens.json` の allowlist のみ。濃色背景＋白文字・出典/図表番号の書き込みは禁止（create-svg 準拠）。
4. **概念名タイトルを図の中に入れない**。SNS は枠レンダラー（`render-figure-sns`）が概念名をヘッダーに出し、記事は見出しが担うため、図内タイトルは SNS 出力で重複する。縦余白は「タイトル」ではなく実体（凡例・比較表・サマリー・要素拡大）で埋める。軸名・区分ラベル等の部分見出しは可。**機械検知**: check-mdx svg audit の **P11-concept-title（MEDIUM）**＝最上部中央の大見出し（font≥14・y≤26・text-anchor=middle）を概念名タイトルとして surface する。説明サブタイトル（サマリー）は font≤11 にして先頭へ繰り上げれば可。
5. **試験頻出ポイント・引っかけ論点セクションを図の中に入れない**。これらは MDX の `<ExamPoint>` / `<Callout>` コンポーネントと、IG テキストスライド（`02-text.svg` / `03-text.svg`）が担う。figure-*.svg に「試験ポイント」「引っかけ」バーや注記ボックスを入れると IG 出力で概念図とポイントが混在し視認性が下がる。既存図でこれを含むものは次回リライト時に除去する。
6. コミット前に `/check-mdx --rules svg` ＋ `node scripts/check-figure-canvas.mjs`（§3）。

---

## 3. ガード — 「新規は確実にこのサイズ」

**新規 `scripts/check-figure-canvas.mjs`**（pre-commit + CI）:

- `.local/r2/posts/**/img/figure-*.svg` を走査。
- `--wide` でないファイル → viewBox が `400 500` であること。
- `--wide` ファイル → viewBox が `640 360` であること。
- 違反は file:line と期待値を出して **exit 1**。
- `check-mdx/svg/detect.mjs` と同列に配線（既存 svg 監査 P1〜P8 の隣に canvas 適合を追加）。

> [!tip] バックフィル中の段階適用
> 既存未移行ファイルを一括で赤落ちさせないため、ガードは初期に **allowlist（移行待ちパス）** を持ち、`fitStatus=conforming` になった図から allowlist を外す。新規ファイルは最初から対象。

> [!warning] check-figure-canvas は SVG 側しか見ない
> このガードが検査するのは **SVG ファイルの viewBox だけ**で、記事 MDX に書かれた `<ArticleImage>` の `width` / `height` は一切見ない。したがって「SVG を 400×500 に揃えたが、MDX の埋込寸法が旧値のまま」という状態を**素通りする**。この穴は次の埋込寸法ガードが塞ぐ。

### 埋込寸法ガード — 「MDX の width/height は SVG の実 viewBox と一致させる」

**`scripts/check-figure-embed-dims.mjs`**（pre-commit `--staged` + CI `r2-audit.yml` 全量・`npm run check-figure-embed-dims`）:

- `.local/r2/posts/**/*.mdx|*.md` 本文の `<ArticleImage src="/posts/….svg">` を走査し、参照先 SVG の `viewBox="0 0 W H"` と `width={W}` `height={H}` を突合。
- 不一致は file・figure 名・両者の寸法を出して **exit 1**。修正は `npm run check-figure-embed-dims -- --fix`（`writeMdxFile` 経由で CRLF を保持）。
- `width` / `height` を**書いていない**埋込は違反としない（後述のとおり SVG 経路では描画に使われないため。実測でも 318 箇所中 236 箇所は寸法を書いていない）。
- 実体なし参照は `check-orphan-figures` / pre-commit の image 検査、`viewBox` を持たない SVG は `check-figure-canvas` の担当なので、本ガードは黙って対象外にする。
- 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）に従い、**記事本数 / SVG 埋込数 / SVG 解決数 / 実比較数**を成功・失敗いずれの経路でも出力する。埋込を見つけたのに SVG 実体を 1 件も解決できない場合は「検査不成立」として exit 1。メタゲート `check-gate-coverage` にも登録済み（実比較数の下限 40）。
- 背景: 2026-08-03、4:5 固定キャンバスへの移行で SVG 側だけを揃えた結果、MDX の埋込寸法が旧値のまま **26 箇所**取り残されていた（例: viewBox 400×500 に対し MDX が 380×160 / 400×870）。全件是正のうえ本ガードを新設。

> [!note] 現状の `<ArticleImage>` は SVG に width/height を出力しない
> `src/components/ui/ArticleImage/ArticleImage.tsx` は `.svg` のとき `next/image` を使わず素の `<img>` を描画し、そこに `width` / `height` 属性を渡していない（拡大防止のため SVG 側の `style="max-width:400px;width:100%"` に寸法決定を委ねている）。つまり MDX の `width` / `height` は **SVG 経路では描画に使われない**。ずれた寸法が即レイアウトシフトを起こすわけではないが、図の実寸を示すメタデータとしては誤りであり、将来この属性を出力に載せた時点で CLS の原因になるため一致させる。

### 孤立 figure ガード — 「作った figure は必ず本文に出す」

**`scripts/check-orphan-figures.mjs`**（pre-commit `--staged` + CI `r2-audit.yml` 全量・`npm run check-orphan-figures`）:

- `.local/r2/posts/**/img/figure-*.svg` を走査し、その figure の親（`img/` の 1 つ上）ディレクトリ直下の `*.mdx` / `*.md` 本文を読む。
- 本文に「basename（`figure-N.svg`）」も「stem（`figure-N`、別拡張子参照を許容）」も**現れない** figure を**孤立**として **exit 1**。
- 孤立 figure は `img/` に存在してもサイトに一切表示されない（`<ArticleImage>` 等で結線して初めて表示される）。
- 過去問専用ディレクトリ（`h24-primary` / `primary-h26-*` / `primary-exercise-NN` 等）は figure 命名対象外なので免除。設問図は原図の縦横比に従うため固定キャンバス（4:5 / 16:9）も適用しない（`check-figure-canvas.mjs` の `EXAM_DIR_RE`）。`{/* quiz-figures:start */}…end */}` ブロック内の `<ArticleImage>` も「本文参照」として有効（孤立扱いしない）。
- 背景: 2026-06-29、総監（pe-comprehensive-management）で figure 総数 182 の 27%（49 枚）が未結線で非表示だった。全件結線のうえ本ガードを新設。

---

## 4. カタログ SSOT 拡張 ＋ 目視ループ

- `.claude/state/svg-catalog.json`（ビルダー `build-svg-catalog`）に各図の以下を追加:
  - `canvas`（feed / landscape）・`viewBox`・`aspect`・`fitStatus`（conforming / needs-rework / cannot-fit）・`hasWideVariant`。
- `fitStatus` がコレクション全体の**移行進捗の真実源**。親はこの JSON だけ読めば残件が分かる（SVG 本体を読まない＝トークン節約）。
- `svg-gallery.mjs` に **canvas 適合バッジ**を追加（4:5 ✓ / 要再作図 / 横長変種あり）。ブラウザで**継続的に目視確認**し、間延び・窮屈をここで拾って改善に回す。

---

## 5. 移行（既存 194 枚・段階バックフィル）

現状アスペクト分布（2026-06-22 実測）: 横長 119 / feed寄り 32 / 正方 21 / 縦長 22。**横長 119 が最大の再作図対象**。

優先度順（カタログで管理）:

1. **公開記事に埋込済みの図**（ユーザー体験への影響大）
2. SNS 展開予定の概念図
3. 残り

各図の処理:
- feed寄り/縦長/正方（75 枚）→ 4:5 に軽〜中調整。
- 横長（119 枚）→ 4:5 へ**再レイアウト**（縦積み化・要素拡大・サマリー追加）。
- どうしても 4:5 に収まらない図 → Evaluator が `cannot-fit` で escalate → 親が判断（2 段スタック化 or landscape 専用として記録）。
- YouTube で使う概念は別途 `figure-N--wide.svg`（16:9）を作成。

---

## 6. エージェント分業（Generator / Evaluator 分離・sonnet 委譲）

| 役割 | 担当 | model | 仕事 |
|---|---|---|---|
| 設計・割当判断・カタログ統合・ガバナンス | **親** | opus | catalog/config の JSON のみ読む。SVG 本体は読まない |
| キャンバス整形（再レイアウト） | **新 `svg-canvas-fitter`** | **sonnet** | (図, 目標 viewBox)→固定枠で再配置。data 値・文言・概念は不変。縦余白を使い切る |
| 適合品質の採点 | **既存 `svg-figure-auditor` を拡張** | **sonnet** | viewBox 一致＋窮屈/間延び/可読性/余白バランスを 1 軸追加。`cannot-fit` を escalate |
| 色/フォント微修正 | 既存 `svg-figure-rewriter` | sonnet | 従来どおり（narrow contract、整形とは混ぜない） |

**トークン配慮**:
- 親は JSON 駆動で軽量。トリアージ（aspect→推奨 canvas）は build 時にルールで機械生成し、親は境界ケースのみ判断。
- 整形・採点は sonnet サブエージェントに **4〜6 枚/バッチ**で pipeline 委譲（Generator→Evaluator）。
- 一括ではなく優先度順の小分けで、中断・再開しやすくする。

---

## 7. 実装シーケンス（設計承認後）

- [ ] `.claude/config/figure-canvas.json`（機械 SSOT）— 本 doc と対で作成済み
- [ ] `scripts/check-figure-canvas.mjs` ＋ pre-commit / CI 配線（allowlist 付き）
- [ ] create-svg SKILL.md を固定キャンバス（高さ 500 固定・2 canvas）へ改定
- [ ] `build-svg-catalog` に canvas/fitStatus フィールド追加（※ PR#269 の所在を要確認）
- [ ] `svg-gallery.mjs` に canvas 適合バッジ追加
- [ ] `render-figure-sns.mjs` に 9:16 派生（feed レターボックス）を追加
- [ ] 新エージェント `svg-canvas-fitter` 定義 ＋ `svg-figure-auditor` に適合軸追加（→ skills-guide / agents-registry 同時更新・check-doc-coupling）
- [ ] 段階バックフィル開始（優先度1から）

> [!warning] ガバナンス
> エージェント追加・description 変更は同一 commit で `skills-guide.md` / `agents-registry.md` を更新（`check-doc-coupling` が pre-commit で検知）。
> create-svg・check-mdx・config を変更したコミットは `/doc-sync` を 1 回回す（prose 陳腐化検出）。
