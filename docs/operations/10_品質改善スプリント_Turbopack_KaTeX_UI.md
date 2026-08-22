# 品質改善スプリント指示書：Turbopack / KaTeX / UI 残タスク

> [!todo]
> **目的**：`npm run build` の警告ノイズを減らし、KaTeX警告を機械的に可視化・修正し、残るUIコード品質タスクまでやりきる。実装担当は Claude Code を想定。

## 0. 現状

2026-07-14 時点で、Codex側で以下は実装済み。

- `Callout` / `SpecSheetList` の不要な Client Component 境界削除。
- 共通 `.focus-ring` 追加と主要導線への適用。
- `SpecSheetList` の Editorial token 移行。
- カードプリミティブ統一の一部実装。
- `transition-all` 0件化。
- `scripts/lint-ui.mjs` に以下を追加済み:
  - focus outline 代替欠如検出
  - SpecSheetList旧トークン逆戻り検出
  - `transition-all` 検出

直近検証は以下が通過済み。

```bash
node scripts/lint-ui.mjs --all
npm run type-check
npm run lint
npm run build
```

ただし `npm run build` では次の既存警告が残っている。

- Turbopack broad pattern warning
- KaTeX strict warning

また UI-005 のカードプリミティブ統一は一部残っている。

---

## 1. 最優先：Turbopack broad pattern warning 解消

### 1.1 現象

`npm run build` で以下の警告が出る。

```text
Turbopack build encountered 2 warnings:
./src/lib/docs.ts:218:22
The file pattern ('/ROOT/content/site/' <dynamic> | '/ROOT/content/site' <dynamic>) matches 18652 files in [project]/

./src/lib/docs.ts:257:27
The file pattern ('/ROOT/content/site/' <dynamic> | '/ROOT/content/site' <dynamic>) matches 18652 files in [project]/
```

該当箇所:

- `src/lib/docs.ts` `getDocMeta()`
- `src/lib/docs.ts` `getDoc()`

両方とも、`path.join(localContentDirectory, relativePath)` の動的パスが Turbopack に広域ファイルパターンとして解析されている。

### 1.2 既存構造

`src/lib/docs.ts` には以下がある。

- `localContentDirectory = SITE_CONTENT_ROOT`（当時は `.local/r2/posts` 直書き。2026-08-18 に `content/site` へ移行し `scripts/lib/repository-paths.mjs` へ集約）
- `findMdxFiles()` が `content/site` を再帰走査
- `getAllDocSlugs()` が slug → `relativePath` の `slugToKeyMap` を構築
- `getDocMeta()` / `getDoc()` が `relativePath` からローカルファイルを読む

`doc-meta-index.json` は `getDocMeta()` の高速パスとして既に使われている。

### 1.3 実装方針

Turbopack が Server Component import graph 内で `content/site/**` の動的参照を広域解析しない形にする。

推奨案:

1. `src/lib/docs.ts` のローカルファイル読み込みを小さな helper に分離する。
2. helper 内では `relativePath` を必ず安全検証する。
3. 可能なら `path.resolve()` + prefix check で path traversal を防ぐ。
4. それでも Turbopack warning が残る場合は、ローカル読み込み部分を別モジュールへ分離し、`await import()` で runtime-only に逃がす。

候補 helper:

```ts
function resolveLocalPostPath(relativePath: string): string | null {
  if (path.isAbsolute(relativePath)) return null;
  if (relativePath.includes('\0')) return null;
  if (!relativePath.endsWith('.mdx')) return null;

  const root = path.resolve(localContentDirectory);
  const filePath = path.resolve(root, relativePath);
  const relative = path.relative(root, filePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return filePath;
}

function readLocalPost(relativePath: string): string | null {
  if (!fs.existsSync(localContentDirectory)) return null;
  const filePath = resolveLocalPostPath(relativePath);
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}
```

ただし、この形でも Turbopack が警告を出す場合がある。その場合の次案:

- `src/lib/local-post-reader.ts` を作る
- `readLocalPost()` / `hasLocalPosts()` / `findLocalMdxFiles()` をそこへ移す
- `docs.ts` 側からは必要時だけ `await import('./local-post-reader')` する
- `getAllDocSlugs()` のローカル走査も同モジュールに寄せる

### 1.4 完了条件

```bash
npm run build
```

で以下を満たすこと。

- Turbopack broad pattern warning が0件。
- 静的生成が完走。
- `generateStaticParams()` の docs 件数が意図せず減らない。
- `/docs/[slug]` の代表ページが引き続き生成される。

確認用:

```bash
npm run type-check
npm run lint
npm run build 2>&1 | tee /tmp/doboku-build.log
rg -n "broad pattern|matches .* files|Turbopack build encountered" /tmp/doboku-build.log
```

`rg` が0件なら完了。

### 1.5 注意点

- `getDoc()` は R2 fallback も持っている。ローカル読み込みを直しても R2 経路を壊さない。
- `slugToKeyMap` は flattened slug から R2 key を復元する重要な状態。削除しない。
- `content/site` はローカル開発・static export build の実体ソース。存在しない環境では R2 fallback が必要。
- path traversal 対策を入れる場合、既存の slug/relativePath 形式を誤って弾かない。

---

## 2. 次点：KaTeX strict warning の機械レポート化と修正

### 2.1 現象

`npm run build` 中に以下のような警告が多数出る。

```text
LaTeX-incompatible input and strict mode is set to 'warn':
Unicode text character "＝" used in math mode [unicodeTextInMathMode]

LaTeX-incompatible input and strict mode is set to 'warn':
Unrecognized Unicode character "−" (8722) [unknownSymbol]

LaTeX-incompatible input and strict mode is set to 'warn':
% comment has no terminating newline ... [commentAtEnd]
```

主な原因候補:

- 数式 `$...$` / `$$...$$` 内に日本語や全角記号がそのまま入っている。
- `−`（U+2212）など KaTeX が認識しないUnicode記号が入っている。
- `%` が数式内コメントとして解釈され、改行なしで math mode 終端をコメントアウトしている。
- 単行 `$$...$$` が remark-math v6 で inline 扱いになり、表示や strict warning の温床になっている。

既存ルール:

- `.claude/knowledge/reference/content-authoring.md`
  - ブロック数式は開始 `$$` と終了 `$$` を別行に置く
  - CJKを含む分数は `\frac` ではなく `\dfrac`
- `.claude/scripts/lint-mdx-mobile.mjs`
  - カテゴリ 11-2 で単行 `$$...$$` を検出
- `scripts/pre-commit-mdx.mjs` / `.claude/scripts/validate-mdx.mjs`
  - MDX compile check はあるが、KaTeX strict warning の発生源一覧化は弱い

### 2.2 実装方針

まず「どのファイル・何行・どの数式・どの警告か」を出す専用スクリプトを作る。

推奨ファイル:

```text
scripts/audit-katex-warnings.mjs
```

仕様:

- 対象:
  - デフォルト: `content/site/**/*.mdx`
  - 引数でファイル指定可
- frontmatter を除いた本文を対象にする
- fenced code block は除外
- inline math `$...$` と block math `$$...$$` を抽出
- `katex.renderToString(math, { throwOnError: false, strict: (code, msg, token) => { ... } })` を使い、warning を収集
- 出力:
  - human readable
  - `--json` オプション
  - `--strict` なら warning > 0 で exit 1

出力例:

```text
KaTeX warnings: 128

content/site/.../article.mdx:123 [unicodeTextInMathMode]
  math: LCC＝C＋...
  message: Unicode text character "＝" used in math mode
  suggestion: 全角＝を = に置換、または日本語部分を \text{...} に入れる
```

### 2.3 自動修正の候補

レポート作成後、低リスクのものから修正する。

低リスク:

- `＝` → `=`
- `＜` → `<`
- `＞` → `>`
- `＋` → `+`
- `−` → `-`
- `／` → `/`
- `×` → `\times` または `×` を数式外へ出す

中リスク:

- math mode 内の日本語を `\text{...}` へ包む
- `%` を `\%` にする
- 単行 `$$...$$` を3行化する

高リスク:

- 数式と文章が混ざった inline math を散文へ戻す
- `\text{}` 内の日本語と数式記号が混在しているものを分割する

### 2.4 推奨ステップ

1. `scripts/audit-katex-warnings.mjs` を作る。
2. 全件レポートを出す。
3. 件数の多い warning code を集計する。
4. 低リスク置換だけを `--fix-safe` として実装する。
5. `--fix-safe` 後に再監査。
6. 残りは手修正または専用fixerを追加。
7. `.claude/knowledge/reference/content-authoring.md` に実例を追記。
8. 可能なら `pre-commit-mdx.mjs` に staged ファイル限定の KaTeX strict warning 監査を追加する。ただし既存記事に大量warningがある間は commit blocking しない。

### 2.5 完了条件

最終的に以下を満たす。

```bash
node scripts/audit-katex-warnings.mjs --strict
npm run build 2>&1 | tee /tmp/doboku-build.log
rg -n "LaTeX-incompatible input|strict mode is set to 'warn'" /tmp/doboku-build.log
```

- `audit-katex-warnings --strict` が exit 0。
- build log に KaTeX strict warning が0件。
- MDX compile / build が通る。

必須検証:

```bash
node .claude/scripts/validate-mdx.mjs
npm run type-check
npm run lint
npm run build
```

### 2.6 注意点

- 数式の意味を壊さない。置換は小さく。
- 過去問の正答・選択肢本文・公式数値は勝手に変えない。
- `$...$` の範囲誤認識に注意。日本語本文の金額や記号を math と誤検出しないよう、まず dry-run レポートを確認する。
- `SpecSheetList` は JSX prop文字列内の `$...$` を独自に KaTeX render する。監査対象に含めるかは別途判断。

---

## 3. UIコード修正の続き

### 3.1 現状

済み:

- focus ring 統一
- `transition-all` 0件化
- `SpecSheetList` Editorial token 化
- 検索 / トップ最新記事 / about / links / tools のカード primitive 部分適用

残候補:

- `CareerAffiliate`
- `NoteLink`
- `MagazineInlineCard`
- `LinkCardClient`
- `RelatedArticleCard`
- `HubCtaBanner`
- `LinksHubTile`
- `MagazineTopBanner`
- `SidebarAdBanner`
- `AuthorProfile`
- `PdcaCycle`
- `PersonaSelector`

### 3.2 実装方針

一括抽象化より、既存CSS primitiveを使う。

原則:

- 外観は `card-surface-content` / `card-surface-section`
- クリック可能カードは `card-interactive` または限定transition
- 操作要素は `focus-ring`
- 独自背景やアクセント色に意味があるカードは、無理に `card-surface-*` 化しない
- 画像カードや広告カードは見た目の差分が収益/CTRに関わるため小さく触る

検索コマンド:

```bash
rg -n "rounded-card-(content|section).*border.*bg-\\[var\\(--paper\\)|bg-\\[var\\(--paper\\).*border.*rounded-card|shadow-card-content|shadow-soft|hover:shadow" src/components src/app -g '*.tsx'
```

### 3.3 優先順位

1. 本文内カード:
   - `NoteLink`
   - `MagazineInlineCard`
   - `LinkCardClient`
   - `RelatedArticleCard`
2. 収益導線:
   - `CareerAffiliate`
   - `HubCtaBanner`
   - `MagazineTopBanner`
3. 補助カード:
   - `AuthorProfile`
   - `PersonaSelector`
   - `PdcaCycle`

### 3.4 完了条件

- UI監査 `UI-005` の残件が明確に減る。
- クリックカードは原則 `focus-ring` を持つ。
- `transition-all` は復活しない。
- `node scripts/lint-ui.mjs --all` が通る。

検証:

```bash
node scripts/lint-ui.mjs --all
npm run type-check
npm run lint
npm run build
```

必要に応じて Playwright / screenshot で主要ページを目視する。

---

## 4. Claude Code 実装プロンプト

Claude Codeに渡すプロンプトは以下。

```text
doboku-note の品質改善を、docs/operations/10_品質改善スプリント_Turbopack_KaTeX_UI.md に沿って実装してください。

ゴールは 1, 2, 3 をすべてやりきることです。

優先順:
1. npm run build の Turbopack broad pattern warning を0件にする
2. KaTeX strict warning をファイル/行/数式単位でレポート化し、低リスク修正から適用して build warning を0件にする
3. UI-005 の残りカードプリミティブ統一を進める

制約:
- 既存のユーザー/Codex変更を戻さない
- まず関連コードを読み、最小差分で進める
- R2 fallback と slugToKeyMap を壊さない
- KaTeX修正では数式・正答・選択肢の意味を変えない
- UI修正では見た目の意味があるアクセントカードを無理に共通化しない
- apply後は必ず検証コマンドを実行する

必須検証:
node scripts/lint-ui.mjs --all
npm run type-check
npm run lint
node .claude/scripts/validate-mdx.mjs
npm run build

完了条件:
- build log に Turbopack broad pattern warning が0件
- build log に KaTeX strict warning が0件
- src/app / src/components に transition-all が0件のまま
- lint/type-check/build が通る
- 変更内容と残課題を docs/handoffs/YYYY-MM-DD-quality-warning-ui-sprint.md に記録する
```

---

## 5. 推奨コミット単位

Claude Codeが作業する場合は、可能なら以下の単位で分ける。

1. `fix(build): remove turbopack broad local post pattern`
2. `chore(katex): add warning audit script`
3. `fix(content): resolve safe katex strict warnings`
4. `refactor(ui): continue card primitive migration`
5. `docs(handoff): record quality warning sprint`

まとめて1コミットにする場合も、PR説明では上記単位で説明する。
