---
name: improve-article
description: >
  単一記事の品質を対話的に継続改善するオーケストレータ。QA エージェントの 5 軸評価を走らせ、
  指摘項目ごとに修正方針を提示し、承認を得てから Edit / create-svg / 本文補強を実行して
  合格ライン到達まで評価→修正→再評価のループを回す。`--mode verify` で PDF 照合 QA（旧 verify-pdf-mdx / qa-pdf-mdx）も実行可能。
  Use when user asks to [品質を高めて, 記事を改善, QA通して直して, PDF検証, MDX整合性, /improve-article, /verify-pdf-mdx, /qa-pdf-mdx].
---

## 用途

**個別の MDX 記事を対話的に継続改善する**ためのオーケストレータ。ユーザーが URL や slug で 1 記事を指定し、QA エージェント（Evaluator）と修正ツール群（Generator）を往復させて合格ラインに到達させる。

バルク処理（数百ページを自動で回す）は対象外 → `/quality-cycle`（CEM 向け）を使う。

## 既存スキル・エージェントとの住み分け

| 役割 | 担当 | 性質 |
|---|---|---|
| **評価（5軸ルーブリック）** | `civil-construction-qa` / `cem-qa` / `content-qa` | Evaluator 専任（修正しない） |
| **PDF→MDX 変換** | `/pdf-to-mdx --exam {cem\|civil-construction-1\|civil-construction-2\|general}` | Generator（初回変換） |
| **キーワードページリライト** | `keyword-rewriter` | Generator（バルク改訂） |
| **SVG 図版作成** | `/create-svg` | Generator（図版） |
| **バルク品質サイクル** | `/quality-cycle`（CEM 専用） | Orchestrator（700 件回す） |
| **本スキル `/improve-article`** | 親 Opus + 上記の組合せ | **単一記事対話型 Orchestrator** |

Generator / Evaluator 分離原則は維持する。本スキルは「評価を走らせて、人間承認の下で Generator を呼び分ける」薄いオーケストレータ。

## 引数

```
/improve-article <slug-or-path> [--mode improve|verify] [--auto] [--max-iter N] [--pdf <path>] [--deep]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `<slug-or-path>` | 必須 | `civil-construction-1-textbook-histogram` のような slug、`/docs/...` URL、または `.local/r2/posts/.../article.mdx` 絶対パス |
| `--mode` | 任意 | `improve`（デフォルト: 対話的品質改善ループ）/ `verify`（PDF 照合 QA、旧 `/verify-pdf-mdx` / `/qa-pdf-mdx`） |
| `--auto` | 任意 | 各修正ステップで承認を求めず一気に進む（failure リスクを受け入れる場合のみ） |
| `--max-iter N` | 任意 | 評価→修正ループの最大回数（既定: 3、improve mode のみ） |
| `--pdf <path>` | 任意 | verify mode 時の PDF 原本パス（省略時は slug/title から自動発見） |
| `--deep` | 任意 | verify mode で視覚比較を全件実行（既定は 3 件サンプル） |

## 実行フロー

### Step 0: 入力解決

1. 引数を MDX ファイルパスに解決する
   - slug が来たら `.local/r2/posts/**/article.mdx` を Glob で探す（Convention B 優先、見つからなければ Convention A）
   - URL が来たら `/docs/{slug}` → 同様に解決
2. MDX を Read して frontmatter を取得（`category`・`group` が必須）
3. dev server が起動していなければ「`npm run dev` を起動してください」と報告して中止

### Step 1: 評価エージェントのルーティング

`category` に応じて QA エージェントを呼び分ける。内部の routing で振り分け。

| category | group | エージェント |
|---|---|---|
| `civil-construction-1` | `textbook` / `guide` | `civil-construction-qa` |
| `civil-construction-1` | `primary` / `secondary` / `past-exam` | `content-qa` |
| `civil-construction-2` | `textbook` / `guide` | `civil-construction-qa` |
| `civil-construction-2` | `primary` / `secondary` / `past-exam` | `content-qa` |
| `pe-comprehensive-management` | `keyword` | `cem-qa` |
| `pe-comprehensive-management` | `exam-index` / `section` / `r*-primary` | `cem-qa`（モード自動判別） |
| `pe-first-stage` | `primary` | `content-qa` |
| その他 | — | `content-qa` |

Agent を呼び出す際は Agent tool の `subagent_type` で指定し、対象 MDX パスと `--mode auto` を渡す。

**cem-qa スコアの扱い**: スコアは「構造的に壊れた記事の検出」にのみ使用する。合否判定ゲートとしては使わない（構造軸・関連付け軸が既に安定高得点のため、コンテンツ深度の欠陥があっても 2.0 を超えてしまう）。コンテンツ品質の主判断は Step 1.5（NLM照合）の結果に基づく。

### Step 1.5: 標準テキスト照合（category=pe-comprehensive-management かつ group=keyword の場合）

**主要品質チェック**。cem-qa が構造的 broken を検出した後、NLM照合がコンテンツの実質的な品質を判定する。NLM照合の `[HIGH]` 未解決を「不合格」とみなし、解消まで修正ループを継続する。

NotebookLM CLI（`notebooklm`、旧 `nlm` から 2026-05-11 移行）経由で総監標準テキストとの照合を行う。

```bash
node .claude/scripts/notebooklm-cross-query.mjs --notebooks "総監標準テキスト" \
  "「{title}」の定義・背景・試験での問われ方・テキスト記載の重要論点をまとめてください。"
```

ノートブック ID: `c55503ac-07cc-47d8-81d2-41dcb150d0a2`（経済性管理 / 人的資源管理 / 情報管理 / 安全管理 / 社会環境管理 / 総合技術監理キーワード集2026 を収録）

**目的**: `cem-qa` はルーブリックの構造検査であり、テキスト由来の内容欠落を検出できない。NotebookLM 照合で「テキストに記載があるが記事にない論点」を拾う。

**照合結果の扱い**:

| 状況 | 分類 |
|---|---|
| テキストに記載がある概念が記事に欠落 | `[コンテンツ][HIGH]` |
| 記事の記述がテキストと齟齬がある | `[コンテンツ][HIGH]` |
| テキストにあるが記事が未カバーの補足事項 | `[コンテンツ][LOW]` |
| テキストになく記事のみに存在する情報 | 問題なし（記事固有の補足として許容） |

NLM照合の `[HIGH]` は Step 2 の最優先指摘として扱い、Step 5 の完了判定にも使用する。

**5管理横断テーブルの取り扱い**: NLM照合が「5管理との接点」を返すからといって機械的にテーブルを追加しない。テーブル追加は「総監テキストが明示的に複数管理分野との関係を記載している概念」（lifecycle-management・design-review 等）にのみ行う。主管理分野が明確な概念（キーワード集のセクション番号で1つの管理に紐づく記事）では、テーブルの代わりに「○○管理（サブセクション名）に位置づけられる。…が論点である。」という1〜2文の散文で記述する。

notebooklm CLI が使えない場合（未インストール・ネットワーク不可・認証期限切れ exit 2）は、ユーザーに「標準テキスト照合をスキップします。`notebooklm login` または `/notebooklm-research <slug>` で後から実行できます」と通知して Step 2 に進む。

---

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
- **概念図の欠落チェック（/visual-research 提案）** — `img/` ディレクトリが空または不在の記事で、H2 に「フロー・分類・対比・定量関係」を表す概念（例: 「〜の手法」「〜のプロセス」「〜と〜の比較」）が含まれる場合、`[視覚][LOW] 概念図なし → /visual-research <slug> で追加可能` として提案する。実行するかはユーザーが判断する
- **散文密度（§17）** — CEM キーワードページの場合、各 H2 に散文 1 段落以上あるか、ページ全体の散文比率が 60% 以上かを確認する。表・リスト・コンポーネントが大半を占める「表依存型」は `lint-mdx-mobile` rule 12-1/12-2 に相当する原則軸減点対象として `[HIGH]` で指摘する
- **`<SeeAlso>` 配置（§18）** — `<SeeAlso>` が本文中の言及直後に配置されているか確認する。末尾にコンポーネントが塊化している場合は `lint-mdx-mobile` rule 12-3 MEDIUM に相当するとして指摘し、言及箇所への移動を促す
- **`<Callout>` の `title` 欠落チェック** — `<Callout type="...">` に `title` 属性がない場合は `[構造][LOW]` として指摘し、Callout の先頭行（例: 「R04 Ⅰ-1-3 の引っかけ：…」）を `title` に昇格させて本文から削除する修正を提案する。`title` はアイコン+色に加えて見出しを付与するため、スキャン読みで論点が即座に伝わるようになる（全 12 種の `title` 省略可能仕様は `src/components/ui/Callout/README.md` 参照）
- **NotebookLM 照合の実施確認（CEM keyword）** — `pe-comprehensive-management` の `keyword` 記事を校正する場合、Step 1.5 の標準テキスト照合を必ず実施する。未実施のまま Step 2 に進むと、テキスト由来の内容欠落を見逃す可能性がある

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

cem-qa を再度呼んでスコアを参考取得しつつ、**完了判定は以下の基準**で行う（スコアは参考値のみ）：

- NLM照合 HIGH がすべて解消 → Step 6 へ
- cem-qa の構造 HIGH（0点軸）が残存 → 優先して修正、Step 3 に戻る
- MED 以下のみ残存 → Step 6 へ（残課題を記録）
- イテレーション使い切り → 残課題を列挙して停止

### Step 6: 完了レポート

```
=== /improve-article: <slug> 完了 ===
cem-qa スコア（参考）: 2.40 → 2.65
NLM HIGH 解消: 3 件 / 3 件
NLM MED 残存: 1 件（alt 属性 88字 → 要短縮）
イテレーション: 2 回
修正内容:
  - 背景段落を追記
  - SVG フォント 11px → 13px 修正
  - Callout title 属性を追加
次のアクション:
  - コミット（未実行）: `content(pe): {slug} 品質向上`
  - SNS 展開（任意・CEM keyword のみ）: `/ig-post-create --slug {slug}` で Instagram carousel を作成可能
  - PR 作成（任意）
```

## 対話のガイドライン

1. **各 HIGH 項目は個別に方針を確認してから実行**。関連項目（例: 「見出し順序入れ替え + 表構造修正」）はまとめて確認してよい
2. **LOW 項目は自動スキップ**。必要なら最後にまとめて「他に LOW が N 件あります」と報告
3. **図版の扱い**: 視覚 HIGH/MED で SVG 化候補が出たら、**原 PNG を Read で目視確認**してから SVG 化すべきかを判断する。写真は SVG 化禁止（`docs/reference/image-policy.md`）
4. **--auto でも破壊的操作は確認**: 画像ファイルの削除、多数ファイルの一括リネーム、他記事への影響がある変更は必ず確認

## --mode verify（旧 `/verify-pdf-mdx` / `/qa-pdf-mdx` 吸収）

PDF 原本と MDX を照合する QA モード。**修正ループは回さず、レポートのみ返す**。修正は別途 `--mode improve` を使う。

### 実行環境

- macOS only（Homebrew `poppler` 前提）
- `pdftotext` / `pdfinfo` / `pdftoppm` が PATH にあることが必須。未導入なら `brew install poppler`

### ディスパッチルール（旧 verify-pdf-mdx のルーター機能）

frontmatter の `category` / `group` から呼び出す Evaluator を決定:

| category | group | Evaluator | モード |
|---|---|---|---|
| `civil-construction-1` | `textbook` | `civil-construction-qa` | textbook（視覚検証＋網羅率 95%）|
| `civil-construction-1` | `guide` | `civil-construction-qa` | guide（topic_rate 80%）|
| `civil-construction-1` | `primary` / `secondary` / `past-exam` | `content-qa` | 静的 5 軸 |
| `civil-construction-2` | `textbook` | `civil-construction-qa` | textbook（視覚検証＋網羅率 95%）|
| `civil-construction-2` | `guide` | `civil-construction-qa` | guide（topic_rate 80%）|
| `civil-construction-2` | `primary` / `secondary` / `past-exam` | `content-qa` | 静的 5 軸 |
| `pe-comprehensive-management` | `keyword` | `cem-qa` | — |
| `pe-comprehensive-management` | `past-exam` / `guide` / `r*-primary` | `content-qa` | — |
| その他 | — | 「対応するエージェントがありません」と案内 | — |

### 実行手順（verify mode）

#### Step 1: 前提確認

1. 入力ファイルの存在確認
2. dev server 起動確認: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3020` が `200`
3. 起動していなければ「`/dev-start` を実行してください」と報告して中止
4. `pdftotext -v` と `pdfinfo -v` が成功するか確認。失敗時は `brew install poppler`

#### Step 2: 決定論的前処理（旧 verify-pdf-mdx scripts）

```bash
node .claude/skills/conversion/pdf-to-mdx/scripts/verify-pdf-mdx.mjs <mdx-path>
```

JSON 出力をパースして以下を取得:
- frontmatter（category, group, slug, title）
- MDX 内 `<img>` の属性と存在確認
- テキスト文字数・KaTeX 数式数・表数
- PDF 章節見出しリスト
- テキスト網羅率（heading-based / topic-based）と missing topics

#### Step 3: Evaluator 呼び出し

該当エージェントを Task ツールで呼び出す。プロンプトに含める:
- 検証対象 MDX パス
- frontmatter（category/group/slug/title）
- 推定 PDF パス（civil-construction-qa の場合）
- `--deep` フラグの有無

#### Step 4: 照合レポート（旧 qa-pdf-mdx Phase 1）

6 カテゴリの問題を検出（全件 PDF 照合）:

1. **コンテンツ完全性**: PDF 各見出し・各段落の冒頭文が MDX に存在するか
2. **図の完全性**: PDF の図番号が MDX に全て反映されているか
3. **画像トリミング**: 本文テキスト・別図キャプションの映り込みがないか
4. **表**: PDF の表が Markdown テーブルに変換されているか、表と同内容の画像が重複していないか
5. **数式**: PDF の数式が KaTeX 記法で反映されているか、`\tag{}` で式番号が一致するか
6. **キャプション・参照**: 本文「図 X-X」「表 X-X」参照が実在するか

#### Step 5: 結果返却

5 軸スコア + 指摘リスト（HIGH/MEDIUM/LOW、重大度別）を返す。**修正は行わない**。

修正が必要なら:
- **自動ループ型**: `/improve-article <slug> --mode improve --auto`
- **対話型**: `/improve-article <slug> --mode improve`

### verify mode の引数

```
/improve-article <slug-or-path> --mode verify [--pdf <path>] [--deep]
```

- `<slug-or-path>`: MDX パス or slug（必須）
- `--pdf`: PDF 原本を明示指定（省略時は `.claude/skills/conversion/pdf-to-mdx/scripts/verify-pdf-mdx.mjs` の `SLUG_PDF_HINTS` + title glob で自動発見）
- `--deep`: 視覚比較を全件実行（既定は 3 件サンプル）

### verify mode の使い方の例

```bash
# auto モード（category/group から Evaluator を自動振り分け）
/improve-article civil-construction-1-textbook-construction-mgmt-overview --mode verify

# guide ページ
/improve-article .local/r2/posts/civil-construction-1/guide/concrete-key-points.mdx --mode verify

# 視覚比較を全件実行
/improve-article civil-construction-1-textbook-construction-machinery-01 --mode verify --deep

# PDF を明示指定
/improve-article <path> --mode verify --pdf _sources/foo.pdf
```

## 制約・前提

- dev server（port 3020）が起動中であること
- 対象 MDX は既存で `published: true` または `false` のどちらでもよい
- 評価エージェントは Sonnet で走るため、1 イテレーションあたり数分〜十数分かかる
- 本スキル自身は親 Opus の判断で動く。`--max-iter` を超えて「あと少し」のときに暴走しないよう、ユーザー確認を優先する
- verify mode は Evaluator 専任（旧 verify-pdf-mdx 同様）。修正ループは improve mode で行う

## 失敗時の振る舞い

- **PDF が見つからない**（textbook モード）: エージェントが教える `hint_candidates` をユーザーに提示し、`--pdf` 指定を促す
- **SVG 化中に画像原典が不明**: 本文からの再構成に切り替えるか、ユーザーに Sketch を依頼
- **修正後スコアが下がった**（稀）: 直前の変更を diff 表示して「巻き戻すか」を確認

## 参照

- [.claude/agents/civil-construction-qa.md](../../../agents/civil-construction-qa.md) — civil 記事の評価基準
- [.claude/agents/cem-qa.md](../../../agents/cem-qa.md) — CEM 記事の評価基準
- [.claude/agents/content-qa.md](../../../agents/content-qa.md) — 汎用（過去問）の評価基準
- [.claude/skills/conversion/pdf-to-mdx/scripts/verify-pdf-mdx.mjs](../../conversion/pdf-to-mdx/scripts/verify-pdf-mdx.mjs) — verify mode の決定論的前処理スクリプト
- [.claude/skills/authoring/create-svg/SKILL.md](../create-svg/SKILL.md) — SVG 図版作成
- [.claude/skills/quality/quality-cycle/SKILL.md](../quality-cycle/SKILL.md) — CEM バルク処理（本スキルと補完関係）
- [docs/reference/image-policy.md](../../../reference/image-policy.md) — 図/写真の判定フロー
- [CLAUDE.md](../../../../CLAUDE.md) — MDX 書き込み規約・コミット運用
