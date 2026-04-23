---
name: improve-article
description: >
  単一記事の品質を対話的に継続改善するオーケストレータ。QA エージェントの 5 軸評価を走らせ、
  指摘項目ごとに修正方針を提示し、承認を得てから Edit / create-svg / 本文補強を実行して
  合格ライン到達まで評価→修正→再評価のループを回す。
  Use when user asks to [品質を高めて, 記事を改善, QA通して直して, /improve-article].
---

## 用途

**個別の MDX 記事を対話的に継続改善する**ためのオーケストレータ。ユーザーが URL や slug で 1 記事を指定し、QA エージェント（Evaluator）と修正ツール群（Generator）を往復させて合格ラインに到達させる。

バルク処理（数百ページを自動で回す）は対象外 → `/quality-cycle`（CEM 向け）を使う。

## 既存スキル・エージェントとの住み分け

| 役割 | 担当 | 性質 |
|---|---|---|
| **評価（5軸ルーブリック）** | `civil-construction-qa` / `cem-qa` / `content-qa` | Evaluator 専任（修正しない） |
| **PDF→MDX 変換** | `civil-construction-1-pdf-to-mdx` / `cem-pdf-to-mdx` | Generator（初回変換） |
| **キーワードページリライト** | `keyword-rewriter` | Generator（バルク改訂） |
| **SVG 図版作成** | `/create-svg` | Generator（図版） |
| **バルク品質サイクル** | `/quality-cycle`（CEM 専用） | Orchestrator（700 件回す） |
| **本スキル `/improve-article`** | 親 Opus + 上記の組合せ | **単一記事対話型 Orchestrator** |

Generator / Evaluator 分離原則は維持する。本スキルは「評価を走らせて、人間承認の下で Generator を呼び分ける」薄いオーケストレータ。

## 引数

```
/improve-article <slug-or-path> [--auto] [--max-iter N]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `<slug-or-path>` | 必須 | `civil-construction-1-textbook-histogram` のような slug、`/docs/...` URL、または `.local/r2/posts/.../article.mdx` 絶対パス |
| `--auto` | 任意 | 各修正ステップで承認を求めず一気に進む（失敗リスクを受け入れる場合のみ） |
| `--max-iter N` | 任意 | 評価→修正ループの最大回数（既定: 3） |

## 実行フロー

### Step 0: 入力解決

1. 引数を MDX ファイルパスに解決する
   - slug が来たら `.local/r2/posts/**/article.mdx` を Glob で探す（Convention B 優先、見つからなければ Convention A）
   - URL が来たら `/docs/{slug}` → 同様に解決
2. MDX を Read して frontmatter を取得（`category`・`group` が必須）
3. dev server が起動していなければ「`npm run dev` を起動してください」と報告して中止

### Step 1: 評価エージェントのルーティング

`category` に応じて QA エージェントを呼び分ける。`/verify-pdf-mdx` 経由で routing させてもよい。

| category | group | エージェント |
|---|---|---|
| `civil-construction-1` | `textbook` / `guide` | `civil-construction-qa` |
| `civil-construction-1` | `primary` / `secondary` / `past-exam` | `content-qa` |
| `pe-comprehensive-management` | `keyword` | `cem-qa` |
| `pe-comprehensive-management` | `exam-index` / `section` / `r*-primary` | `cem-qa`（モード自動判別） |
| その他 | — | `content-qa` |

Agent を呼び出す際は Agent tool の `subagent_type` で指定し、対象 MDX パスと `--mode auto` を渡す。

### Step 2: 指摘の構造化

エージェント出力（5 軸スコア + 指摘リスト）を以下の 4 カテゴリに分類する:

1. **構造**: 見出し階層、リスト/表の構造、frontmatter の過不足、description と本文の不整合
2. **コンテンツ**: 欠落トピック、誤り、補足不足、過去問バックリンク不足
3. **視覚**: 画像の解像度不足、PDF スキャン PNG、モバイル横スクロール、ダークモード不具合
4. **互換性**: MDX 構文、KaTeX エラー、不正リンク、文字化け（U+FFFD）

各カテゴリ内で `[HIGH] / [MEDIUM] / [LOW]` の優先度を付けて報告。

**必ずチェックする項目**（過去の改善で頻出したパターン）:

- **PDF 番号参照が見出しに残っていないか** — `### 用語の定義（表 7.21）` `### 航法の要点（図 7.6）` のように原典の表番号・図番号が H3/H4 に混入していたら構造 HIGH として指摘。見出しは**構造ラベル**であり、原典バックリファレンスは本文（「表 X のとおり」「図 Y に示す」）に書くべき。目次・ジャンプ URL・SEO タイトルの汚染を防ぐ
- **「(1)」「1)」の太字段落が見出し化していないか** — `**(1) 〜**` 形式の太字段落は H4/H5 へ昇格。目次生成・ページ内ジャンプに乗る
- **本文参照されている表/図が欠落していないか** — 「**表 N.N のとおりである**」「**図 N.N に示す**」と本文が参照しているのに該当コンテンツが無い場合はコンテンツ HIGH。PDF→MDX 変換で表が脱落するケースが多い
- **description と本文の整合** — description で謳っているトピックが本文に含まれているか
- **Callout 化されていない試験頻出ポイント** — 過去問で繰り返し問われる数値・区分は `<Callout type="exam" title="頻出論点：...">` でハイライト（全 12 種と使い分けは [`docs/ui/callout-gallery.md`](../../../../docs/ui/callout-gallery.md) 参照）
- **過去問バックリンクはアンカー付きにする** — `/docs/civil-construction-1-primary-r07-a` のように URL だけで終わらず、**必ず `#問題-no{N}` を付けて該当設問に直接ジャンプさせる**（例: `/docs/civil-construction-1-primary-r07-a#問題-no66`）。問題 ID は H2 見出し「問題 No.N」から自動生成される（ドット `.` は削除、スペースは `-` に置換、日本語は URL エンコードで突合）。バックリンクが多いほど全文検索・内部リンク強度・回遊率が上がる
- **過去問解説の破損検出** — primary / secondary の MDX を扱う場合は `node .claude/skills/quality/check-mdx/scripts/rules/explanations/audit.mjs --topic=<テーマ>` を走らせ、`」と規定されている` 文頭欠落や `summary="」..."` ExamPoint 欠落がないか確認。検出されたら `/improve-article` の修正案に必ず組み込む。意味矛盾（設問肢と同じ内容なのに ❌）は読者視点で拾う
- **SVG 品質の静的検査** — 記事に SVG を含む場合は `node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs --path=<img dir>/*.svg` を走らせ、文字クリップ（P1）・必須属性欠落（P3）・テキスト重なり（P2）等を検出。HIGH は必ず修正、MEDIUM は視覚検証（Playwright スクリーンショット）と合わせて判断

### Step 3: 修正方針の提示（対話）

ユーザーに対して下記フォーマットで提示:

```
=== /improve-article: <slug> ===
現在スコア: 1.75 / 3.00（不合格）
合格まで: +0.25 必要

【構造】
  [HIGH] 見出し順序がタイトルと逆（ヒストグラム・工程能力図 → 本文は工程能力図が先）
  [HIGH] 表4.5 ほか 3 つが 4 列超（CLAUDE.md 違反）
  [MED]  bold 段落が見出し代わりになっている（H4 昇格推奨）

【コンテンツ】
  [HIGH] description に「工程能力指数」とあるが本文に Cp/Cpk が欠落

【視覚】
  [MED]  fig-4-6〜4-9 は PDF スキャン PNG → SVG 化推奨（create-svg）

修正方針:
  案 A（軽量・15 分）: 構造 HIGH + コンテンツ HIGH のみ
  案 B（しっかり・40 分）: 上記 + 視覚 SVG 化 + bold→H4
  案 C（カスタム）: ユーザーが選択

どれで進めますか？
```

`--auto` 指定時は案 B を既定で実行。

### Step 4: 修正の実行

承認された案に応じて、以下のツールを呼び出す:

| 修正タイプ | 使うツール |
|---|---|
| 構造（見出し・リスト・表） | Edit / Write（CLAUDE.md「MDX ファイル書き込みの規約」遵守：CRLF 維持） |
| コンテンツ追記 | Edit / Write |
| SVG 新規作成 | `/create-svg` スキル（または直接 SVG を Write） |
| MDX 互換性 | `/check-mdx` スキル |
| モバイル視認性 | `/review-mobile` スキル |

1 記事編集が一区切りついたら CLAUDE.md「コンテンツ編集時のコミット運用」に従って**即コミットを提案**（ただし実行は人間承認を得てから）。

### Step 5: 再評価

同じ QA エージェントを再度呼び、加重スコアを取得。

- 合格（≥ 2.0）→ Step 6 へ
- 不合格かつイテレーション残あり → Step 3 に戻る
- 不合格かつイテレーション使い切り → 残課題を列挙して停止

### Step 6: 完了レポート

```
=== /improve-article: <slug> 完了 ===
開始スコア: 1.75 → 終了スコア: 2.65（合格）
イテレーション: 2 回
修正内容:
  - 見出し階層再構成（H2→H3→H4）
  - 工程能力指数 Cp/Cpk を追記
  - figure-4-6〜4-9 を SVG 化（4 枚）
  - 表 4 つを散文化
次のアクション:
  - コミット（未実行）: `content(civil): textbook-histogram 品質向上`
  - PR 作成（任意）
```

## 対話のガイドライン

1. **各 HIGH 項目は個別に方針を確認してから実行**。関連項目（例: 「見出し順序入れ替え + 表構造修正」）はまとめて確認してよい
2. **LOW 項目は自動スキップ**。必要なら最後にまとめて「他に LOW が N 件あります」と報告
3. **図版の扱い**: 視覚 HIGH/MED で SVG 化候補が出たら、**原 PNG を Read で目視確認**してから SVG 化すべきかを判断する。写真は SVG 化禁止（`.claude/reference/image-policy.md`）
4. **--auto でも破壊的操作は確認**: 画像ファイルの削除、多数ファイルの一括リネーム、他記事への影響がある変更は必ず確認

## 制約・前提

- dev server（port 3020）が起動中であること
- 対象 MDX は既存で `published: true` または `false` のどちらでもよい
- 評価エージェントは Sonnet で走るため、1 イテレーションあたり数分〜十数分かかる
- 本スキル自身は親 Opus の判断で動く。`--max-iter` を超えて「あと少し」のときに暴走しないよう、ユーザー確認を優先する

## 失敗時の振る舞い

- **PDF が見つからない**（textbook モード）: エージェントが教える `hint_candidates` をユーザーに提示し、`--pdf` 指定を促す
- **SVG 化中に画像原典が不明**: 本文からの再構成に切り替えるか、ユーザーに Sketch を依頼
- **修正後スコアが下がった**（稀）: 直前の変更を diff 表示して「巻き戻すか」を確認

## 参照

- [.claude/agents/civil-construction-qa.md](../../../agents/civil-construction-qa.md) — civil 記事の評価基準
- [.claude/agents/cem-qa.md](../../../agents/cem-qa.md) — CEM 記事の評価基準
- [.claude/agents/content-qa.md](../../../agents/content-qa.md) — 汎用（過去問）の評価基準
- [.claude/skills/content/verify-pdf-mdx/SKILL.md](../verify-pdf-mdx/SKILL.md) — QA ルーター（本スキルは内部的にこれを呼んでもよい）
- [.claude/skills/content/create-svg/SKILL.md](../create-svg/SKILL.md) — SVG 図版作成
- [.claude/skills/content/quality-cycle/SKILL.md](../quality-cycle/SKILL.md) — CEM バルク処理（本スキルと補完関係）
- [.claude/reference/image-policy.md](../../../reference/image-policy.md) — 図/写真の判定フロー
- [CLAUDE.md](../../../../CLAUDE.md) — MDX 書き込み規約・コミット運用
