# Instagram カルーセル品質ポリシー

技術士・総合技術監理キーワードの Instagram カルーセル（`slide-data.json` v2）を、agent が1本ずつ執筆・採点するための品質基準。`ig-carousel-writer`（Generator）と `ig-carousel-qa`（Evaluator）の両方がこの文書を真実源とする。

関連: 設計・パイプライン全体は `docs/handoffs/2026-05-20-ig-carousel-quality-design.md`。

## slide-data.json v2 スキーマ

```
{
  "cover":  { "keyword", "subtitle", "hook", "stickyText", "management" },
  "slides": [ { "type": "board"|"figure", ... }, ... ],   // 1〜8 枚
  "cta":    { "related": [...] }
}
```

カルーセル合計 = cover + slides + cta。Instagram 制約により **3〜10 枚**（slides は 1〜8 枚）。

### cover

| フィールド | 内容 | ルール |
|---|---|---|
| `keyword` | キーワード名（大見出し） | MDX frontmatter の `title` と一致。14 字以内が望ましい |
| `subtitle` | 比率・数値・原語など | 任意。無ければ `null` |
| `hook` | 副題下のフック文（カバーで「ーー {hook}」と表示） | 任意。**そのキーワード固有**の問いかけ・暗記喚起にする（例: 欲求5段階説 →「5段階、言える？」）。汎用文や他キーワードで通用する文は禁止。無ければ省略 |
| `stickyText` | 付箋メモ（`\n` 区切り） | 暗記項目を 2〜3 行。各行 8 字以内 |
| `management` | 管理区分 | `economic` / `human` / `info` / `safety` / `social` のいずれか |

### slides — board スライド

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"board"` | |
| `heading` | 短見出し | 16 字以内。「定義」「試験のポイント」など |
| `body` | 解説文 | 完全な文。120 字以内、3〜5 行相当 |
| `noteText` | 要点（`\n` 区切り可） | 45 字以内。`body` と論点を重複させない |

### slides — figure スライド

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"figure"` | |
| `heading` | 図の見出し | 18 字以内 |
| `imagePath` | 既存 SVG/PNG のリポジトリ相対パス | 任意。doboku-note の図版を再利用する場合に指定 |
| `figureSpec` | 図版仕様（`imagePath` 無し時） | 何を・どう図示するか具体的に。描画要素・配置・ラベルを書く |
| `note` | 図の下に置く一言 | 30 字以内。図から読み取るべき結論 |

`imagePath` と `figureSpec` は排他。SVG を再利用するなら `imagePath`、新規図版が必要なら `figureSpec`（実制作は別工程）。

### cta

| フィールド | 内容 | ルール |
|---|---|---|
| `related` | 関連キーワード配列 | 2〜4 件。MDX の RelatedKeywords から採る |

---

## 過去問パック（exam モード）専用スキーマ

`docs/sns/instagram/{exam}/exam-packs/<year>/pack-<NN>/slide-data.json` は別構造。
デザイン真実源は [`docs/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json)、仕様書は [`docs/design-system/instagram-carousel.md`](../design-system/instagram-carousel.md)。

```jsonc
{
  "slides": [
    { "type": "cover",   ... },     // 1 枚目
    { "type": "problem", ... },     // 2/4/6/8 枚目
    { "type": "answer",  ... },     // 3/5/7/9 枚目
    { "type": "cta",     ... }      // 10 枚目
  ]
}
```

合計 10 枚固定。`pageIndex` / `totalPages` は `ig-post-create.mjs` が index から自動算出するので省略可。

### exam-cover

> **試験識別カバー（多資格・2026-06-02 刷新）**: `_meta.exam` がある過去問パックは `exam-cover-ig.mjs` で描画する（`quiz-slides` の旧 quiz-cover ではない）。**年度を主役（大）**にし、試験色帯＋正式名称（1 行）＋形式ラベルで構成。試験別に色が変わる（総監=紺 / 1級=青 / 2級=緑、`exam-palette.mjs` 経由）。carousel(1080×1350)/reels(1080×1920)/stories(1080×1920) の 3 フォーマットに対応（`format` 引数で Y レイアウト分岐、CTA/ブランドは共通寸法）。レイアウトは左基準 mx=96・タグ左 72・形式右 120 のインデント体系。真実源は `docs/reference/x-post-policy.md` ではなく本 § と `exam-cover-ig.mjs`。

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"cover"` | |
| `title` | **年度ラベル** | `令和7年度` 等。試験識別カバーの主役（大フォント）。※旧 quiz-cover では管理名だったが、試験識別カバーでは年度 |
| `subtitle` | 形式ラベル | `択一式 過去問`（総監）/ `第一次検定 過去問`（1級）/ `第一次検定 前期`（2級前期）等。`_meta.fmtLabel` 優先 |
| `sectionTag` | タグピル文言 | `過去問`。帯内のタグピルに表示 |
| `_meta.exam` | 試験キー | `pe-comprehensive` / `civil-1` / `civil-2`。これがあると試験識別カバーで描画。正式名称（1 行）・帯色を解決 |

正式名称は `officialNameLines(exam)` が返す（総監「技術士 総合技術監理部門」1 行 72px、1級2級は label 1 行）。slide-data には色を書かない。

### exam-problem

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"problem"` | |
| `bodyLines` | 問題本文の配列 | 各行 25-32 字目安。Satori が句点で自動 wrap。**並列列挙（（ア）（イ）等）・markdown 表（`\|...\|`）を書かない**（下記 `lists` / `table` へ） |
| `options` | 5 択 | `[{ num: 1-5, text: "..." }]` 5 要素必須。組合せ表問題で「①〜⑤」が表内にある場合は空配列でも可 |
| `lists` | 並列列挙データ（任意） | `[{ items: ["（ア）...", "（イ）..."] }]`。「（ア）（イ）」「（A）（B）」等の項目が 2 個以上ある場合は必須 |
| `table` | 表データ（任意） | `{ headers: ["列1", "列2"], rows: [["a","b"]] }`。原典に markdown 表がある場合は必須 |
| `qNum` | 問番号 | 1-4 |
| `totalQ` | 総問数 | 通常 4 |

**lists / table を使う判定基準**（lint で機械検出可・`scripts/lint-exam-pack-structure.mjs`）:
- E1: bodyLines に「（ア）」「（A）」等が 2 個以上 → `lists` 必須
- E2: bodyLines に `|` 含む行 2 行以上 → `table` 必須

**圧縮モード自動判定**（`quiz-slides.mjs` の 4 段階）:
- normal: 総文字数 ≤ 320 → q-text 44px / opt minH 96px
- dense: 320-550 字 or 選択肢 60+ 字 → q-text 36px / opt minH 84px
- compact: 550-700 字 or 選択肢 100+ 字 or table/lists あり → q-text 30px / opt minH 76px
- ultra: 700+ 字 → q-text 26px / opt minH 68px / 選択肢 22px

### exam-answer ⭐ 新スキーマ（2026-05-27 確定）

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"answer"` | |
| `correctNum` | 正答番号 | 1-5 |
| `correctText` | **問題の主題**（a-hero title） | 例「品質管理の統計的手法」「損益分岐点の分析」。**「ここがポイント」の論点ではなく問題の主題** |
| `optionExplanations` | **5 要素必須**・選択肢別の正誤と理由 | `[{ "num": 1-5, "correct": true/false, "text": "..." }]`。`text` は 60 字以内目安・1 文 |
| `pointText` | a-point 枠の本文（ここがポイント） | 80 字以内。論点を 1 行で抽出 |
| `qNum` / `totalQ` | 問番号・総問数 | |

**廃止フィールド**: `explanationLines`（旧スキーマ、フォールバックなし）。

**`correct` の判定ルール**:
- 「最も**適切**なものはどれか」型 → `correctNum` と一致する選択肢のみ `correct: true`
- 「最も**不適切**なものはどれか」型 → `correctNum` と一致する選択肢のみ `correct: false`（**それ以外** 4 つが `true`）

### exam-cta

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"cta"` | |

文言（FULL CONTENT /「doboku-note で全問解説をチェック」/ 保存ボタンを押して 等）と stats・色は **`quiz-slides.mjs` の `buildQuizCta` が `_meta.exam` で試験別に出し分け**（slide-data.json には書かない）。`ig-post-create` が各 slide.data に `_meta.exam` を注入する。

| 試験 (`_meta.exam`) | stats | 色 |
|---|---|---|
| `pe-comprehensive`（総監） | 640問・PRACTICE / 5管理・SCOPE | 紺（tokens 既定） |
| `civil-1`（1級土木） | 1162問・PRACTICE / 12年度・YEARS | 青 |
| `civil-2`（2級土木） | 630問・PRACTICE / 10回・EXAMS | 緑 |

> 採点時の注意（`ig-carousel-qa`）: 「640問/5管理」は**総監固有**。1級/2級パックの CTA が 640問/5管理・紺になっていたら**誤り**（試験別出し分けの未反映）。reels の CTA は保存→フォロー誘導に分岐（`actionTitleReels`）。

---

## 5 軸ルーブリック

各軸を 1〜5 で採点する。

### 軸1: スライド構成の妥当性

枚数がキーワードの説明量に見合うか。薄いキーワードを無理に水増しせず、厚いキーワードを詰め込みすぎない。cover → slides → cta の流れが学習動線として自然か。

- 5: 枚数・順序が説明量に最適。各スライドに固有の役割がある
- 3: 枚数は許容範囲だが、役割が薄い／重複するスライドが 1 枚ある
- 1: 枚数が説明量と乖離（薄い内容を 8 枚に水増し／厚い内容を 1 枚に圧縮）

### 軸2: 文の完結性

`body` が読んで意味の通る完全な文か。体言止めの羅列・記号棒読み・途中で切れた文がないか。`noteText`・`note` が要点として独立して成立するか。

- 5: 全スライドが完全な文／意味の通る要点。途中切れ・断片なし
- 3: おおむね文になっているが、1 箇所に体言止め断片や不自然な省略
- 1: 体言止めの羅列や途中切れ（旧・一括生成の `…` 切れ等）が複数

### 軸3: 図文整合・figure 判断

figure スライドが「図で理解が進む論点」に使われているか。文章で足りる内容を無理に図にしていないか。`imagePath` の SVG が論点と合っているか。`figureSpec` が制作者に伝わる具体性を持つか。board と figure の役割分担が明確か。

- 5: figure が論点理解を明確に助ける。SVG 再利用が的確／spec が具体的
- 3: figure はあってよいが、note が図と弱く結びつく／spec がやや抽象的
- 1: 文章で足りる内容を図にしている／SVG が論点と無関係／spec が曖昧

### 軸4: 字数・視認性

モバイル（カルーセル 1080×1350）で読める字数・密度か。本スキーマの字数ルールを満たすか。1 スライドに情報を詰め込みすぎていないか。

- 5: 全フィールドが字数ルール内。1 スライド 1 メッセージで余白がある
- 3: 字数は概ね収まるが、1 スライドだけ密度が高い
- 1: 字数超過が複数、または 1 スライドに論点を詰め込みすぎ

### 軸5: 試験的正確性

固有名詞・数値・法則名・年号・原語が正しいか。MDX 本文の記述と整合するか。

- 5: 全記述が MDX 本文と整合。固有名詞・数値・年号に誤りなし
- 3: 軽微な表記ゆれはあるが事実誤認はない
- 1: 法則名・数値・年号の取り違え、または MDX と矛盾する記述

> [!warning] 固有名詞・法則名の取り違え
> 数値・比率・年号・人名・原語は MDX 本文を真実源にする。確信が持てない場合は MDX の記述に忠実にし、推測で補わない。
> 例: ハインリッヒの法則は災害比率 1:29:300。事故コストの比率 1:4 は別の知見であり混同しない。

## 合否ライン

- **合格**: 5 軸平均 4.0 以上 **かつ** 全軸 3 以上。
- 不合格は Generator に差し戻す。軸4（字数）は機械チェックで事前にゲートする。

### cover-title の段階フォント auto-fit（v7.1）

`quiz-slides.mjs` の `buildQuizCover` が visualLength で coverTitle 120 / coverTitleMid 90 / coverTitleSm 72 を自動分岐する。**folder back（折り返し）は構造的に発生しない**：

| 視覚字数 | フォント | 推奨度 |
|---|---|---|
| `<= 7` | coverTitle (120px) | ✅ 推奨 |
| `8-11` | coverTitleMid (90px) | ⚠ 許容（lint WARN）|
| `12-16` | coverTitleSm (72px) | ⚠⚠ 警告（lint NOTICE）|
| `17+` | — | ❌ エラー（lint ERROR、必須短縮）|

機械検証: `node .claude/scripts/lint-stories-titles.mjs` で全 slide-data.json の字数判定を一覧化。Evaluator (`ig-carousel-qa`) は lint 出力を Read して軸 4 採点に反映する（ERROR は -2 重大減点、WARN/NOTICE は減点なし・コメントのみ）。

## 相互改善ループ（IG ↔ doboku-note）

writer / QA がキーワード MDX を読む過程で気づいた doboku-note 側の問題（説明不足・事実誤認・図が欲しい箇所）は、MDX を直接編集せず **findings ログ** `docs/sns/instagram/_keyword-findings.md` に追記する。IG 用に作った良い図版の「doboku-note 寄贈候補」も同ログに記録する。キーワードページ改善・SVG 寄贈は別途まとめて直列に反映する（MDX 編集衝突を防ぐため discovery と application を分離）。
