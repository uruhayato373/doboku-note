---
name: generate-ogp
description: >
  OGP画像（Open Graph Protocol）を一括生成またはslug指定で個別生成する。Use when user asks to [OGP生成, OGP画像, generate-ogp, /generate-ogp].
---

satori + @resvg/resvg-js で全記事のOGP画像（1200x630 PNG）を生成し、各記事ディレクトリに `ogp.png` としてコロケーション出力する。

## コマンド

```bash
# 全記事の差分生成（変更のあったMDXのみ）
npm run generate-ogp

# 全記事を強制再生成
node scripts/generate-ogps.mjs --force

# 特定slugのみ生成
node scripts/generate-ogps.mjs --slug <slug>

# 特定slugを強制再生成
node scripts/generate-ogps.mjs --force --slug <slug>
```

## 引数

| オプション | 説明 |
|---|---|
| `--force` | 既存画像があっても再生成する |
| `--slug <slug>` | 指定したslugのOGP画像のみ生成する |

## 動作フロー

1. `.local/r2/posts/` 配下の全MDXファイル（`article.mdx`）を探索
2. frontmatterから `title`, `category`, `published` を読み取り
3. `published: false` の記事はスキップ
4. 差分チェック: MDXの更新日時 > OGP画像の更新日時 の場合のみ生成（`--force` で無視）
5. satori でJSXオブジェクト → SVG、resvg-js で SVG → PNG に変換
6. 該当記事ディレクトリ配下に `ogp.png` として出力（例: `.local/r2/posts/pe-comprehensive-management/iso-14000/ogp.png`）

## デザイン仕様

- **サイズ**: 1200 x 630 px
- **背景**: グラデーション（#f8fafc → #e2e8f0, 135deg）
- **上部装飾**: 6px 青グラデーションライン（#3b82f6 → #1e40af）
- **カテゴリラベル**: 青（#3b82f6）、22px
- **タイトル**: #1e293b、文字数に応じてフォントサイズ自動調整（48px→26px）
- **サイト名**: 右下に "doboku-note"（#94a3b8, 20px）
- **フォント**: Noto Sans JP Bold + Inter Bold（`scripts/fonts/` に配置）

### カテゴリ表示名

| category値 | 表示名 |
|---|---|
| `pe-comprehensive-management` | 技術士 総監 |
| `civil-construction-1` | 1級土木施工管理技士 |
| `civil-general` | 土木一般 |
| `construction-management` | 施工管理 |
| `keywords-law` | キーワード・法規 |

## 出力パス

- **ローカル**: `.local/r2/posts/{category}/{local-slug}/ogp.png`（記事ディレクトリにコロケーション）
- **本番URL**: `https://storage.doboku-note.com/posts/{category}/{local-slug}/ogp.png`

`{local-slug}` は category prefix を除いた slug（例: slug `pe-comprehensive-management-iso-14000` の local-slug は `iso-14000`）。各カテゴリの直下はフラット1階層（`textbook/foo` のようなネストは不可）。

## R2アップロード

OGP画像生成後、R2にアップロードする場合:
```bash
npm run upload-images-r2
```

## デザイン変更時

OGPデザインを変更する場合は `scripts/generate-ogps.mjs` の `createOgpElement()` 関数を編集する。変更後は `--force` で全画像を再生成する。

```bash
node scripts/generate-ogps.mjs --force
```

## 技術スタック

| ライブラリ | 用途 |
|---|---|
| [satori](https://github.com/vercel/satori) | JSXオブジェクト → SVG変換（Vercel製、next/og の内部ライブラリ） |
| [@resvg/resvg-js](https://github.com/yisibl/resvg-js) | SVG → PNG 高速変換 |
| gray-matter | MDX frontmatter パース |

## 依存ファイル

- `scripts/generate-ogps.mjs` — 生成スクリプト本体
- `scripts/fonts/NotoSansJP-Bold.ttf` — 日本語フォント
- `scripts/fonts/Inter-Bold.ttf` — 英語フォント

## トラブルシューティング

- **フォントが見つからない**: `scripts/fonts/` に `NotoSansJP-Bold.ttf` と `Inter-Bold.ttf` を配置する
- **文字化け**: フォントファイルが破損している可能性。Google Fonts から再ダウンロード
- **特定記事だけ再生成したい**: `--slug` オプションを使用
