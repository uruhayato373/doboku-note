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

`docs/sns/instagram/_exam-packs/<year>/pack-<NN>/slide-data.json` は別構造。
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

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"cover"` | |
| `title` | 管理名 | 経済性管理／人的資源管理／情報管理／安全管理／社会環境管理 のいずれか。156px 1 行 |
| `subtitle` | サブ情報 | `R07 4問パック` などの年度表記 |
| `sectionTag` | セクションタグ | 任意。`2 経済性管理` 等 |

### exam-problem

| フィールド | 内容 | ルール |
|---|---|---|
| `type` | `"problem"` | |
| `bodyLines` | 問題本文の配列 | 各行 25-32 字目安。Satori が句点で自動 wrap |
| `options` | 5 択 | `[{ num: 1-5, text: "..." }]` 5 要素必須 |
| `qNum` | 問番号 | 1-4 |
| `totalQ` | 総問数 | 通常 4 |

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

文言（FULL CONTENT / 640問 / All章 / 保存ボタンを押して 等）はすべて tokens.json が真実源。slide-data.json には書かない。

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

## 相互改善ループ（IG ↔ doboku-note）

writer / QA がキーワード MDX を読む過程で気づいた doboku-note 側の問題（説明不足・事実誤認・図が欲しい箇所）は、MDX を直接編集せず **findings ログ** `docs/sns/instagram/_keyword-findings.md` に追記する。IG 用に作った良い図版の「doboku-note 寄贈候補」も同ログに記録する。キーワードページ改善・SVG 寄贈は別途まとめて直列に反映する（MDX 編集衝突を防ぐため discovery と application を分離）。
