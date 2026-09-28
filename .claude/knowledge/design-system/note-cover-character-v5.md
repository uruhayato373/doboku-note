---
title: note キャラクターカバー（V5・既定）
---

新規制作・意匠変更の基準は [キャラクターPOP画像方針](../reference/pop-image-policy.md)（2026-09-27）。2026-09-28 に、note の記事・マガジンを同じ文字優先POPレイアウトへ更新した。表示安全域と既存の文字原稿管理は継続する。


# note キャラクターカバー（V5・既定）

2026-09-16のモックを元に、既存の先生と強調した日本語見出しを合成する note カバーのデザイン。2026-09-17 から記事・マガジンの通常生成器と CI 供給がこの描画を使う（旧 G2/V4 テンプレへは戻らない）。描画は `scripts/lib/note-character-cover.mjs`、対象一覧とポーズ割当は `scripts/lib/note-cover-inventory.mjs` に集約し、次の入口はどれも同じ入力・同じポーズ・同じ画像になる。

| 入口 | 出力先 | 使いどころ |
|---|---|---|
| `node scripts/generate-note-covers.mjs [dir]` | `content/note/**/img/cover*.png` | 記事の通常生成。CI の note-cover-supply.yml が欠落 dir を 1 件ずつ渡す |
| `node scripts/generate-magazine-covers.mjs [id]` | `<magazineDir>/_cover.png` | マガジンの通常生成 |
| `npm run note-character-covers -- --source-root … --output-root …` | 独立出力先 ＋ `manifest.json` | 全量差し替え。原稿ツリーに書かず照合用の hash・ポーズ・実描画枠を残す |

```bash
npm run note-character-covers -- --source-root /path/to/source-checkout --output-root /path/to/isolated-output
npm run note-character-covers -- --filter 工程管理
```

一括生成の既定出力先は`.tmp/note-character-covers/`。原稿ツリー直下への出力を拒否し、記事は元の`content/note/**/img/cover*.png`、マガジンは`_cover.png`という相対パスを出力先の下に再現する。記事原稿、元カバー、共有認証プロファイル、公開noteには書き込まない。`--filter`は記事の相対パスまたは`magazine:<ID>`の部分一致。見出し本文の検索ではない。

原稿の commit 前ゲートは `npm run check-note-cover-fit`（pre-commit は `--staged`）。描画と同じ関数（`coverFitIssues`）で同梱フォントの実測幅を見るので、緑なら同じ文言で生成は失敗しない。

## デザインと検査

- 1280×670。記事・マガジンとも安全域は x=45〜1235・y=15〜655。中央寄せにはせず、文字は左側（x=90、幅760。主見出しのみ幅790）、人物は右側（x=900〜1220）へ分ける。値の正本は `COVER_LAYOUTS`。
- 背景写真は使わない。白から資格色の薄い色面へつながる明るい背景に、資格色の5px外周枠、資格名の色帯、主見出し、黄色罫線、根拠、便益の色帯、黄色の総監訴求を重ねる。資格名と主見出しを画像より優先する。
- 資格色は `note-cover-tokens.json` を正本とし、1級土木＝青、2級土木＝緑、総監＝紺、技術士建設部門＝藍、コンクリート主任技士＝紫、RCCM＝錆色を使う。
- 同梱のNoto Sans JP Boldの実際の字幅を測り、100〜48px・最大3行で折り返す。行が1つ増えるごとに15%小さい字と同等に扱い、1行で入る見出しを大きな字で折り返さない。文字を省略せず、収まらない原稿は失敗として残す。描画は700ウェイトに同色の細い輪郭を加える。
- Satoriから主見出し・リード・補足・訴求帯の実描画枠を取得し、安全域の外に出た場合は生成失敗とする。文字列だけの推定検査では終わらせない。
- 既存のキャラクター台帳で使用可能と確認済みの腰上素材を使う。ポーズの選び方は下記。原画像hash・寸法・切り取り座標の検証は既存`character-framing.mjs`に委ねる。
- 人物は右端の320px列へ縦横比を保って収め、腰の切り取り線を外周枠の内側へ合わせる。人物は補助要素なので狭いカードでは腕や小物が切れてもよいが、顔を残す。左右反転はしない。
- コピーは原稿の`cover`／`coverTitle`と既存マガジン定義から取る。補完する定義は[設定](../../config/note-character-covers.json)に限定する。公開URL・価格は販売カタログから確認し、ここへ複製しない。

## 全件生成と差し替えの境界

`manifest.json`に対象・生成・失敗件数、ポーズ別件数、選択理由、人物の配置枠、退役対象、入力・出力のhash、生成前のカバーhash、実描画枠を保存する。0件・生成失敗・出力先重複・未解決のマガジン出力先は成功扱いにしない。途中結果も50件ごとに保存する。

別セッションの作業中は専用worktreeから元checkoutを読み取り、出力先を分ける。生成後に元原稿／旧カバーのhashを再照合し、変わった対象は再生成・再確認してから置換する。worktreeを分けてもnote認証プロファイルと公開記事は共有されるので、ブラウザを併用しない。記事・マガジンの更新を逐次実行し、公開APIのカバー変更と公開範囲・価格の保持を確認する。

生成物の保存先は[アセット置き場](../reference/asset-storage-policy.md)に従う。記事カバーはprivate R2（`node scripts/asset-offload.mjs --group note-cover-png --include-untracked --commit`）、マガジンはDrive vault（`node scripts/drive-vault-sync.mjs --group note-magazine-cover-png --commit`）。POP版の全件確認用一式は `.tmp/note-cover-pop-all/` に生成し、Drive vault の `note-cover-pop-preview` で `制作物/noteカバー/POP版/` へ保存する。生成結果だけをGitへ追加しない。公開側の差し替えは `scripts/note-update-cover.mjs`（記事）/ `scripts/note-magazine-cover.mjs`（マガジン）を `npm run note-cover-rollout -- reconcile → snapshot → plan → run [--magazines] → verify → record` が逐次投入・突合・記録する（作業場 `.tmp/note-cover-rollout/`）。2026-09-17 の全量差し替えの記録は `.claude/state/note/cover-rollout/`。

テスト: `node --test tests/note-character-cover.test.mjs`（通常生成器が旧テンプレを import しない静的ゲートを含む）。

## ポーズの使い分け

`cover.character`の原稿指定を最優先し、未指定分はタイトルと`coverCopy`の`headline`・`lead`・`proof`から選ぶ（`benefit`は除く）。自動選択は次の順で最初に一致した用途を採用する。

| 内容 | 候補 |
|---|---|
| AI・DX・デジタル活用 | PC作業 |
| 合格体験・合格報告 | バンザイ（一般的な「合格パック」には使わない） |
| もくじ・自己紹介・案内 | 挨拶・笑顔 |
| 精読・暗記・学習法 | 読書・思考・笑顔 |
| 過去問・予想・演習・口頭試験 | 思考・指差し・読書 |
| 上記に当たらないマガジン | グッドサイン・説明・読書・笑顔 |
| 注意点・失敗の振り返り | 指差し・思考 |
| 答案・論文・書き方 | 読書・説明・指差し・思考 |
| その他の知識・要点 | 説明・指差し・読書 |

複数候補があるときは対象キーのhashで選び、同じ資格・記事種別の直前のポーズを候補から外す。単独候補と原稿指定は内容との一致を優先する。全件に割り当ててから`--filter`を適用するため、同じ入力一覧なら絞り込んだ再生成でもポーズが変わらない。入力一覧の追加・並び替えで隣接関係が変われば選択が変わる場合がある。

要修正の驚きポーズと、腰上に切り取れないホワイトボードは自動選択しない。使用可否と切り取りの正本は既存ポーズ台帳に置き、ここへ画像品質の判定を複製しない。
