---
title: note キャラクターカバーの一括生成
---

# note キャラクターカバーの一括生成

2026-09-16のモックを元に、既存の先生と強調した日本語見出しを合成する独立生成コマンド。既存V4の生成器・公開画像はこのコマンドだけでは切り替わらない。生成結果のmanifestを運営者が確認し、公開側の更新は既存のnoteカバー更新CLIで行う。

```bash
npm run note-character-covers -- --source-root /path/to/source-checkout --output-root /path/to/isolated-output
npm run note-character-covers -- --filter 工程管理
```

生成先の既定は`.tmp/note-character-covers/`。原稿ツリー直下への出力を拒否し、記事は元の`content/note/**/img/cover*.png`、マガジンは`_cover.png`という相対パスを出力先の下に再現する。記事原稿、元カバー、共有認証プロファイル、公開noteには書き込まない。

`--filter`は記事の相対パスまたは`magazine:<ID>`の部分一致。見出し本文の検索ではない。

## デザインと検査

- 1280×670。主見出しの枠はx=345〜739、y=239〜435で、中央正方形と狭いヘッダーの両方に収める。
- 同梱のNoto Sans JP Boldの実際の字幅を測り、96〜48px・最大3行で折り返す。文字を省略せず、収まらない原稿は失敗として残す。描画は700ウェイトに同色の細い輪郭を加える。
- Satoriから主見出しの実描画枠を取得し、中央630×216の外に出た場合は生成失敗とする。文字列だけの推定検査では終わらせない。
- 既存のキャラクター台帳で使用可能と確認済みの腰上素材を使う。既定は記事=`pointing`、マガジン=`good-sign`。原画像hash・寸法・切り取り座標の検証は既存`character-framing.mjs`に委ねる。
- 資格別の色と背景写真を利用する。コピーは原稿の`cover`／`coverTitle`と既存マガジン定義から取る。補完する定義は[設定](../../config/note-character-covers.json)に限定する。公開URL・価格は販売カタログから確認し、ここへ複製しない。

## 全件生成と差し替えの境界

`manifest.json`に対象・生成・失敗件数、退役対象、入力・出力のhash、生成前のカバーhash、実描画枠を保存する。0件・生成失敗・出力先重複・未解決のマガジン出力先は成功扱いにしない。途中結果も50件ごとに保存する。

別セッションの作業中は専用worktreeから元checkoutを読み取り、出力先を分ける。生成後に元原稿／旧カバーのhashを再照合し、変わった対象は再生成・再確認してから置換する。worktreeを分けてもnote認証プロファイルと公開記事は共有されるので、ブラウザを併用しない。記事・マガジンの更新を逐次実行し、公開APIのカバー変更と公開範囲・価格の保持を確認する。

生成物の保存先は[アセット置き場](../reference/asset-storage-policy.md)に従う。記事カバーはprivate R2、マガジンはDrive vault。生成結果だけをGitへ追加しない。

テスト: `node --test tests/note-character-cover.test.mjs`。
