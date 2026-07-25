---
name: illustrate-concept
description: >
  MDX 記事に挿入する概念図を Discovery First 方式（Web 画像検索を前倒し実行し
  標準視覚パターンの有無でトリアージ）で調査し、有用素材が見つかった概念のみ
  ユーザー合意を得て複数 SVG を一括生成する。
  Use when user asks to [概念図の検討, 図の着想, SVGの素案作成, 図版案の調査, /illustrate-concept].
---

## 用途

MDX 記事（主に総合技術監理キーワードページ）に挿入する概念図について、**先に Web 検索で標準視覚パターンの存在を確認**してから SVG 化する概念を選ぶ。Web に有用素材が多い概念＝視覚的に伝えやすい概念というトリアージ原則に基づき、1 記事に複数 SVG が妥当な場合はバッチ生成する。

Claude が独力で作図すると「ありきたりの2カラム比較」に陥りやすく、かつユーザーが事前に指定した概念が実は図示に不向き（標準パターン未確立）だった場合に品質が出にくい問題を、Discovery First 方式で解決する。

## スコープと位置づけ

- **Generator スキル**。`/create-svg` のルールに従って自前で作図まで完結
- 複数 SVG 生成・MDX 挿入・コミット案内まで一貫して担当
- 出典画像のトレース・再現は **禁止**（構図着想のみ、独自作図）

## 引数

```
/illustrate-concept <対象記事のパス>
```

| 引数 | 必須 | 説明 |
|------|------|------|
| 対象記事のパス | 必須 | `.local/r2/posts/{slug}/article.mdx` の絶対パスまたは相対パス |

**概念の事前指定引数は廃止した**（Discovery First 方式により不要）。「この概念で図を作って」と決め打ちしたい場合は本スキルを使わず、`/create-svg` のルールに従って直接作図する。

## Workflow

### Phase A: Discovery（並行実行・Web 素材の有無を一括確認）

#### Step 1: 記事読解 & 候補概念抽出

1. 記事 MDX を Read し、H2/H3 構造と主要概念を把握
2. **SVG 化価値のある概念を 2〜3 個** 抽出する（判定基準）:
   - 分類・階層構造（4象限、ツリー、サイクル）
   - 時系列・プロセス（フロー、段階遷移）
   - 対比（2軸、Before/After、TBM vs CBM 等）
   - 定量関係（グラフ、位置関係）
3. **除外条件**: H3 見出しで既に分岐済みの分類、単純な2項目比較（表で足りる）、他記事に同概念の既存図あり
4. 既存 `.local/r2/posts/{slug}/img/` を確認し、既存 SVG と重複しない概念に絞る

#### Step 2: 並行 WebSearch（必ず 1 メッセージで並行実行）

各候補概念について日英各 1 クエリ生成し、**全クエリを 1 メッセージで並行実行**する:

- 日本語例: 「予防保全 分類 図」「TBM CBM 違い 図」
- 英語例: "preventive maintenance classification diagram", "TBM vs CBM comparison chart"

各検索結果から「有用そうな出典ページ URL」を 2〜3 件ピックアップ（構図が明快・出典が明示されているもの）。

#### Step 3: 並行 WebFetch（ページから画像 URL 抽出）

ピックアップした出典ページを **1 メッセージで並行 WebFetch**。各ページに以下のプロンプトで画像 URL と構図メモを抽出:

```
このページに掲載されている「{概念}」の体系図・分類図の画像 URL をすべて抽出。
img タグの src を完全 URL で返し、各画像の構図（縦ツリー/横ツリー/マトリクス/
フロー等）を 1 行で説明してください。
```

概念ごとに候補画像 URL を最大 **4 件** に集約する。

#### Step 4: 画像一括ダウンロード

1. `C:\tmp\illustrate-concept\{slug}\{concept-key}\` を概念ごとに作成
2. curl を `&&` 連結で一括取得: `candidate-1.{ext}`, `candidate-2.{ext}`, ...
3. URL に日本語を含む場合は URL エンコード

#### Step 5: 視覚検証（並行 Read）

**1 メッセージで全画像を Read** し、マルチモーダル視認でトリアージ:

- ストック写真（工場風景・人物など概念図でない画像）→ 除外
- 判読不能・低解像度 → 除外
- 類似重複（同一出典の別解像度版など）→ 1 枚に集約
- 記事の粒度と大きく乖離するもの（冗長すぎ/簡略すぎ）→ 参考度を下げる

### Phase B: User Alignment（概念単位で提示・選択）

#### Step 6: Discovery Report 提示

以下の書式で **概念単位** に結果を提示する:

```markdown
## Discovery 結果: {記事タイトル}

### 概念 A: {概念名}
- **有用候補**: 3 件
- **最有力**: `C:\tmp\...\candidate-a-1.png` ({構図の特徴1行})
- **推奨パターン**: マトリクス / カード縦並び / 2 カラム比較 / 縦フロー
- **挿入想定位置**: ### {H3 見出し名}

### 概念 B: {概念名}
- **有用候補**: 1 件（判定: 標準視覚パターン確立度 低）
- **最有力**: `C:\tmp\...\candidate-b-1.png` ({構図の特徴1行})

### 概念 C: {概念名}
- **有用候補**: 0 件
- **判定**: 作成見送り推奨（標準視覚パターン未確立 or 既存記事に類似図あり）

---
**SVG 化する概念を教えてください**（例: 「A と B を採用」「A のみ」「全部却下」）
```

Discovery で **全概念が有用候補 0 件** の場合は、その旨を報告して SVG なしで終了（tmp クリーンアップのみ実施）。

#### Step 7: バッチ選択 & 画像確定

1. ユーザーの応答を解釈し、採用概念 N 件を確定（N=0 なら終了）
2. 採用された各概念について、複数候補画像があればユーザーに提示し採用画像を 1 枚に絞る
3. N 概念 × 1 画像 ずつのペアリストが確定する

### Phase C: Generation（選択された概念を順次 SVG 化）

#### Step 8: SVG 生成ループ

既存 `.local/r2/posts/{slug}/img/` の SVG を確認し、次の連番を算出。採用ペアごとに以下を実施:

1. **作図**: `/create-svg` SKILL.md のルール（viewBox ≤ 400、デザイントークン、モバイル視認性、コントラスト比 4.5:1）に従い **独自作図**。構図着想だけ参照し、配色・形状・レイアウトは既定トークンを使う
2. **保存**: `.local/r2/posts/{slug}/img/figure-{N}.svg` （N は連番）
3. **出典コメント**: SVG 冒頭に `<!-- source: {URL} (構図着想のみ・独自作図) -->` を必ず挿入
4. **MDX 挿入**: 該当セクション（該当 H3 の直後）に以下を追加:

```mdx
<ArticleImage
  src="/posts/{slug}/img/figure-{N}.svg"
  alt="{概念の簡潔説明}"
/>
```

**重要**: `caption` 属性は絶対に使わない（`.claude/knowledge/reference/content-principles.md` 141 行目「`<ArticleImage>` の caption は使わない」ルール、過去に指摘済み）。図の説明は本文で行う。

#### Step 9: 後処理 & コミット案内

1. tmp ディレクトリ `C:\tmp\illustrate-concept\{slug}\` 配下を削除（親ディレクトリが busy でも内部ファイルは削除可）
2. MDX の文字化け（U+FFFD）が発生していないか Grep で確認
3. **1 記事 = 1 コミット** のコマンドをユーザーに提示:

```bash
git add .local/r2/posts/{category}/{slug}/
git commit -m "content({category-prefix}): {slug} に概念図 {N} 枚追加

構図着想出典:
- figure-1.svg ({概念名}): {URL1}
- figure-2.svg ({概念名}): {URL2}
（独自作図、トレース禁止）"
```

## 並行実行パターン（必ず守る）

Step 2/3/5 は **必ず 1 メッセージで複数ツール呼出** して並行化する。シーケンシャル実行すると Discovery だけで 5〜10 分かかる。

| Step | 並行ツール | 想定件数 |
|---|---|---|
| Step 2 | WebSearch × 4〜6 | 候補概念数 × 日英1クエリずつ |
| Step 3 | WebFetch × 3〜5 | ピックアップした出典ページ |
| Step 5 | Read × 最大 12 | 3 概念 × 4 画像 |

## 著作権・出典ポリシー（必読）

- 取得画像は **構図・視覚メタファーの着想源のみ** として使用
- **トレース・再現は禁止**。形状・配色・レイアウトは `.claude/knowledge/design-system/design-system.md` のデザイントークンに基づき独自作図
- 出典 URL は 2 箇所に必ず記録:
  1. SVG ファイル冒頭の `<!-- source: {URL} (構図着想のみ・独自作図) -->` コメント
  2. git コミットメッセージ本文
- tmp 画像を `.local/r2/posts/` 配下に保存することは **絶対禁止**
- Step 9 完了後は tmp の画像を必ず削除

## figure-{N}.svg の連番ルール

1. 既存 `img/` を ls で確認
2. 既存なし → `figure-1.svg`
3. `figure-1.svg, figure-2.svg` あり → 次は `figure-3.svg`
4. 複数 SVG を同時作成する場合は連続番号（figure-3, figure-4, ...）

## MDX 挿入位置の決定

各概念に対応する H2 または H3 見出しを特定し、**見出し直下の導入文の直後**（次の本文ブロック詳細展開の直前）に `<ArticleImage>` を挿入する。

例:
```mdx
### 設備保全の全体体系

設備保全は、現状機能を維持する **維持活動** と、...に大別される。

<ArticleImage src="..." alt="..." />  ← ここに挿入

**維持活動**（現状機能の維持・回復を目的とする）
...
```

## `/create-svg` との連携

| 役割 | 担当 |
|---|---|
| Web Discovery & 視覚メタファー発見・複数トリアージ | `/illustrate-concept`（本スキル） |
| レイアウトパターン選択・viewBox・デザイントークン適用 | `/create-svg` SKILL.md のルール（本スキル内で参照） |
| モバイル視認性セルフチェック | `/create-svg` Step 3 ルール |
| MDX への `<ArticleImage>` 挿入（`alt` のみ） | 本スキル（複数 SVG 対応） |
| コミット案内 | 本スキル（1 記事 = 1 コミット） |

※ `/create-svg` は SKILL.md 上の作図ガイドラインであり、実行可能スラッシュコマンドではない。本スキルは `/create-svg` SKILL.md の規約に従って自前で作図する。

## 失敗時の挙動

- **Step 1 で候補概念 0 件**: 記事が単純で図の必要性なしと判定。ユーザーに報告して終了
- **Step 5 で全候補画像が無効**: Discovery Report で「全概念有用候補 0 件」として提示、終了
- **Step 7 でユーザーが全却下**: tmp クリーンアップして終了
- **Step 8 で作図途中エラー**: 生成済み SVG と MDX 編集は残したまま報告、ユーザー判断を仰ぐ

## スコープ外

- 「特定の概念を指定して即 SVG 化」のユースケース → `/create-svg` SKILL.md のルールに従って直接作図する運用
- 画像 AI 解析 API 統合（WebSearch + Read で十分）
- Instagram 等のアスペクト比対応（別施策、Phase 2 以降）
- 厳格な出典ポリシー（CC-BY 限定等）は Phase 2 以降の検討事項

## 参照

- `.claude/skills/authoring/create-svg/SKILL.md` — SVG 作図ルール・デザイントークン
- `.claude/knowledge/design-system/design-system.md` — コントラスト比 4.5:1・禁止パターン
- `.claude/knowledge/reference/content-principles.md` — `<ArticleImage>` の caption 禁止ルールなど真実源
- `.claude/knowledge/reference/content-authoring.md` — MDX コンポーネント・画像配信規約
- `CLAUDE.md` § 「コンテンツ編集時のコミット運用」 — 1 記事 = 1 コミット原則
