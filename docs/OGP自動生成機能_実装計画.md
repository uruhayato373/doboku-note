# OGP自動生成機能 実装詳細計画

## 1. 背景と目的
現在 `doboku-note` プロジェクトでは Cloudflare Pages へ Static Export 形式（`output: 'export'`）でデプロイしています。Next.js の動的API（`next/og`）によるオンデマンドな OGP 画像生成は、静的サイト上では動作しません。

一方で、現状のプロジェクトには `scripts/upload-images-to-r2.mjs` を利用して、ローカル（`.local/r2/posts/...`）に配置した関連画像を R2 に一括アップロードする既存のワークフローが存在します。

この既存フローと親和性を保つため、「**デプロイ前にスクリプトを実行し、Satori を用いて全記事のOGP画像をローカルに一括生成（PNG化）した上で、R2にアップロードする**」という方針を採用します。

## 2. 採用技術とライブラリ
- **[satori](https://github.com/vercel/satori)**: HTML/CSS（React相当のオブジェクト）から SVG を生成する Vercel 製ライブラリ。`next/og` の裏側で動いているものと同じ技術です。
- **[@resvg/resvg-js](https://github.com/yisibl/resvg-js)**: `satori` が生成した SVG を高速に実用的な PNG 画像に変換するネイティブ強化モジュールです。
- **satori-html**: 標準的な HTML/CSS 文字列を `satori` 用の AST（抽象構文木）に変換するユーティリティです。

> **なぜ Remotion ではないのか？**
> 動画や高度なアニメーションを作成する場合は Remotion が適していますが、ブログ記事の静的なOGP画像をバッチ生成する用途においては、Satori の方が実行時の立ち上がりが圧倒的に速く、依存関係（FFmpeg等）も不要でクリーンな構成となるためです。

## 3. 実装のステップ詳細

### ステップ 1: プロジェクトへのパッケージ追加
OGP生成用途のみで使用するため、`devDependencies` としてインストールします。
```bash
npm install -D satori @resvg/resvg-js satori-html
```

### ステップ 2: フォントファイルの準備
Satori はテキストを正しくレンダリングするために、フォントのバイナリファイル（`.ttf` や `.otf`）を必要とします。
1. `scripts/fonts/` ディレクトリを新規作成。
2. 「ミニマル＆エディトリアル」スタイルに合わせて、**Noto Sans JP** (Bold) および **Inter** (Bold) の `.ttf` ファイルをダウンロードして配置します。

### ステップ 3: 生成スクリプトの実装 (`scripts/generate-ogps.mjs`)
以下のフローを持つ Node.js スクリプトを実装します。

1. **ブログ記事の読み込み**:
   - `content/blog/` 等のディレクトリ内のすべての `.mdx` ファイルを列挙。
   - `gray-matter` を用いてフロントマターから `title` や `tags` 等のメタデータを抽出します。
2. **差分生成（スキップ処理）**:
   - 各記事について出力先 `.local/r2/posts/blog/[slug]/ogp/ogp.png` の存在と更新日時を確認します。
   - 既に最新の OGP 画像が存在する場合は、生成処理をスキップすることで後続のビルドを超高速化します。
3. **HTMLテンプレート適用**:
   - 決定した「白背景・微かな幾何学線・中央の太字タイトル」デザインを、インラインCSS（flexbox等）を用いた HTML モックアップとして記述します。
   - 例: `<div style="display: flex; ..."><h1>{title}</h1></div>`
4. **SVG → PNG 変換**:
   - `satori` を呼び出して HTML を SVG 文字列化。
   - `resvg-js` を用いて SVG を幅1200px、高さ630pxの PNG バッファにレンダリングします。
5. **ローカル上への保存**:
   - `.local/r2/posts/blog/[slug]/ogp/ogp.png` へファイル書き出しを実行します。

### ステップ 4: npm scripts への登録と運用フローの整備
1. `package.json` の `scripts` セクションに以下を追加します。
   ```json
   "generate-ogp": "node scripts/generate-ogps.mjs"
   ```
2. （必要であれば）R2アップロード作業と一連の流れで実行できるようにします。
   - 例: `"upload-images-r2": "npm run generate-ogp && tsx scripts/upload-images-to-r2.mjs"`

## 4. 今後のアクションプラン（ユーザーご承認後）
本ドキュメントの内容にご納得いただけましたら、以下の作業に着手します。

1. Font ファイルのダウンロード・配置
2. パッケージのローカルインストール
3. `scripts/generate-ogps.mjs` のコーディング
4. 数記事に対する処理テスト（正しくPNG画像が出力され、文字化け等が発生しないことの確認）
5. `upload-images-to-r2.mjs` との連携動作確認

問題がなければ、「OK」「着手して」とご指示をお願いいたします。
