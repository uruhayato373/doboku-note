# note カバー Clarity V3 実装仕様

> [!todo]
> **提案段階**：既存 `note-cover-g2` を壊さず、`cover.variant: clarity` を指定した記事だけに適用する。最初の検証対象は「1級経験記述で落ちる答案」1件とし、全記事への一括適用や note.com への公開反映は行わない。

## 1. 目的

note の記事一覧やリンクカードで、読者が約 0.5 秒で次の3点を理解できるカバーにする。

1. 何の記事か：`落ちる答案`
2. 何が得られるか：`4つの型`
3. どんな視点か：`元発注者の視点で解説`

現行 G2 は `leadIn / hi / hiSuffix / banner / chips×3` が同程度に主張しやすい。Clarity V3 は「資格 → 主題 → 数字・分類 → 読後価値」の順に情報階層を固定し、補助情報を減らす。

## 2. スコープ

### 今回実装するもの

- `note-cover-g2` 内の opt-in variant `clarity`
- Clarity V3 用 frontmatter フィールド
- 中央 630×630 クロップを守る決定論的レイアウト
- 文字幅チェックの Clarity V3 対応
- 代表記事1件の frontmatter と `cover.svg` / `cover.png` の再生成
- 仕様、トークン、カバー執筆エージェントの更新

### 今回実装しないもの

- 全 note 記事の移行
- 既存 G2 の既定レイアウト変更
- `mono-tag`、`magazine-banner`、サイト OGP の変更
- note.com 上の公開済みカバー差し替え
- AI生成画像を本番素材として使用すること

## 3. 後方互換方針

分岐は `renderNoteCoverG2` の入口で行う。

```js
if (cover?.variant === 'clarity') {
  return renderNoteCoverClarity({ cover, palette }, { width, height });
}
```

- `variant` が無い既存記事はピクセル差分を発生させない。
- `cover.variant` の未知値は既存 G2 に黙ってフォールバックせず、生成時に警告または検証エラーにする。
- 既存 `cover.character` の解決処理は再利用する。
- 新 renderer を別 template ID として登録しない。生成パイプライン上は引き続き `note-cover-g2` とする。

## 4. frontmatter スキーマ

Clarity V3 は次の形を正規形とする。

```yaml
cover:
  variant: clarity
  leadIn: "1級土木｜施工経験記述"
  headline: "落ちる答案"
  hi: "4"
  hiSuffix: "つの型"
  alert: "知らないと減点"
  banner: "元発注者の視点で解説"
  meta: "無料記事"
  character: thinking
  tone: base
```

| フィールド | 必須 | 役割 | 目安 |
|---|---:|---|---|
| `variant` | 必須 | `clarity` 固定 | — |
| `leadIn` | 必須 | 資格・テーマの眉見出し | 8〜18字 |
| `headline` | 必須 | 記事の主題。最も先に読ませる | 4〜9字 |
| `hi` | 必須 | 数字または短い核語 | 1〜3字 |
| `hiSuffix` | 必須 | `hi` に続く分類・成果 | 2〜6字 |
| `alert` | 任意 | 読む理由を示す警告ラベル | 4〜9字 |
| `banner` | 必須 | 読後価値・解説視点 | 8〜18字 |
| `meta` | 任意 | 無料記事など | 既存規則を継承 |
| `character` | 任意 | 既存キャラクターポーズ slug | 既存規則を継承 |
| `tone` | 任意 | `deep\|base\|soft` | 既存規則を継承 |

Clarity V3 では `chips` を使わない。指定されていたら無視するのではなく、lint または生成ログで警告する。

## 5. レイアウト仕様

キャンバスは 1280×670。中央セーフゾーンは `x=325..955`、`y=20..650`。主要情報はさらに左右20pxの内余白を取り、`x=345..935` の 590px に収める。

```text
┌──────────────────────────────────────────────────────────────┐
│                 [doboku-note]                                │
│              1級土木｜施工経験記述             [人物・装飾] │
│                                                              │
│                    落ちる答案                                │
│   [! 知らないと減点]       4 つの型                          │
│                                                              │
│              元発注者の視点で解説                            │
└──────────────────────────────────────────────────────────────┘
```

### 幾何

| 要素 | 座標・寸法 | 文字 |
|---|---|---|
| ロゴ | 中央上、`top: 28` | 既存ワードマーク、22px |
| `leadIn` | `top: 105`, 幅590、中央 | 34〜40px、800 |
| `headline` | `top: 190`, 幅590、中央 | 最大104px、900 |
| `alert` | `left: 52`, `top: 365`、最大270×112 | 28〜34px、900、琥珀地 |
| `hi` | 中央寄り、基線 `top: 355` | 最大150px、900、資格色 |
| `hiSuffix` | `hi` の右、同一基線 | 70〜90px、900、濃紺 |
| `banner` | `left: 325`, `top: 535`, `width: 630`, `height: 98` | 38〜56px、900、白 |
| キャラクター | 右端、幅260〜310、高さ最大610 | 装飾扱い。`x >= 990` を基本 |

実装時は上記を tokens に移し、renderer に px を重複直書きしない。Satori の制約に合わせ `display: flex` を各コンテナに明示する。

### 情報の優先順位

1. `headline`
2. `hi + hiSuffix`
3. `banner`
4. `leadIn`
5. `alert`
6. ロゴ・キャラクター

キャラクターと `alert` は中央クロップで欠けても意味が成立する補助要素とする。`headline`、`hi + hiSuffix`、`banner` は中央590pxに全文を収める。

## 6. 文字サイズとフィット

既存の `effectiveCharCount` を再利用し、次の純関数を追加する。

```js
clarityHeadlineFontSize(text) // 64..104px、590pxに収める
clarityCountFontSize(text)    // 96..150px
claritySuffixFontSize(text)   // 58..90px、hiとの合計が590px以内
clarityBannerFontSize(text)   // 38..56px、590pxに収める
clarityAlertFontSize(text)    // 26..34px、ラベル内幅に収める
```

推定幅は日本語フォントの誤差を見込み、`effectiveCharCount × fontSize × 1.04` とする。最小サイズでも収まらない文字列は切り詰めず検証エラーにする。二行化は今回入れない。

## 7. 色と装飾

- 背景：既存の warm off-white を維持する。
- 主題文字：`neutral.ink` または既存の濃紺。
- 数字 `hi` と benefit band：資格ごとの `palette.band`。
- 警告：背景 `#F5B82E`、文字 `#16365C`。赤は使わない。
- グリッド：既存より弱くし、主要文字の背後では視認できない程度にする。
- グラデーションは背景の既存表現以外では使わない。
- キャラクターは新規生成せず `docs/sns/_assets/character/{slug}.png` を利用する。

## 8. 変更対象

### 必須

1. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`
   - `renderNoteCoverClarity` を追加
   - `renderNoteCoverG2` 冒頭で opt-in 分岐
   - 既存アイコン、背景、文字幅 helper を再利用
2. `docs/design-system/note-cover-tokens.json`
   - version を minor update
   - `layout.clarity` と `coverSchema` のフィールドを追加
3. `scripts/add-note-cover.mjs`
   - `variant/headline/alert/character` を安全に書き出す
   - variant別の必須項目検証
   - Clarity V3 では chips を必須にしない
4. `scripts/check-note-cover-fit.mjs`
   - variant別に幅検証
   - headline、count row、banner、alert を検査
5. `.claude/agents/note-cover-writer.md`
   - G2既定とClarity V3 opt-inを区別
6. `docs/design-system/note-cover.md`
   - variantへの導線と採用条件を追記

### 代表記事

- `docs/note/1級・2級土木/1級土木/1級経験記述で落ちる答案/article.md`
- 同ディレクトリの `img/cover.svg` / `img/cover.png`

対象記事の本文・その他frontmatterは変更しない。CRLF保護が必要なら `scripts/add-note-cover.mjs` 経由で更新する。

## 9. 実装順序

1. 作業前に `git status --short` を確認し、無関係な変更を保持する。
2. tokens と schema validation を先に更新する。
3. renderer と文字フィット関数を実装する。
4. `check-note-cover-fit` を variant 対応する。
5. 代表記事だけ `variant: clarity` に変更する。
6. カバーを通常版と `--debug-safety` 版で生成する。
7. 1280×670、中央630×630、幅320px相当の3表示を目視する。
8. 既存variantなし記事を1件再生成し、意図しない差分がないことを確認する。
9. ドキュメントとエージェント指示を同期する。

## 10. 検証

```bash
node scripts/generate-note-covers.mjs "1級経験記述で落ちる答案"
node scripts/generate-note-covers.mjs "1級経験記述で落ちる答案" --debug-safety
npm run check-note-cover-fit
npm run note-cover-gallery
node --test tests/*.test.mjs
git diff --check
git status --short
```

通常版を最後に再生成し、赤いセーフティ枠が成果物へ残らないようにする。

### 目視チェック

- 320px幅で `落ちる答案` と `4つの型` が読める。
- 中央630pxクロップで headline、count row、banner が欠けない。
- キャラクターが headline より目立たない。
- 警告ラベルが中央情報に重ならない。
- `元発注者の視点で解説` が一行で読める。
- 文字、人物、帯、画像端に意図しないクリップがない。

## 11. 完了条件

- 代表記事のみ Clarity V3 になっている。
- variantなし既存G2の出力ロジックが変わっていない。
- フィット検査が Clarity V3 の主要4領域を検査する。
- `cover.png` と `cover.svg` が1280×670で生成される。
- 上記コマンドが成功し、目視チェックを満たす。
- note.comへのアップロード、公開、既存記事のライブ差し替えは未実施である。

## 12. ロールバック

代表記事の `cover.variant/headline/alert` を外し、従来の `chips` 3件を戻して再生成すれば既存G2へ戻せる。renderer側はopt-in分岐のため、機能を残しても他記事へ影響しない。
