# Kindle 表紙ビルダー

Kindle(KDP) 入稿用の表紙（1600×2560 JPEG）は、**すべて `build-pop-cover.mjs` で作る**（2026-11-10 に一本化）。
Codex の画像生成で文字まで描いた POP 表紙で、年度・分量の丸い印と帯の文字が Amazon の検索結果（幅約 136px）でも読める。
2026-11-10 に C 系 12 冊の見本を運営者が承認した型を、全冊の唯一の作り方にした。方針は [POP 画像の正典](../../.claude/knowledge/reference/pop-image-policy.md)。

## 使い方

```bash
npm run kindle-pop-cover -- --id c-05 --candidates 2          # 候補を .tmp/kindle-pop/c-05/ に出す（原寸＋136px の確認用画像・描く文字の一覧）
npm run kindle-pop-cover -- --adopt c-05 --candidate .tmp/kindle-pop/c-05/cand-1.png --review "文字 8 か所を照合・手指・顔と印の重なりなし"
```

1. 表紙 spec（`specs/<id>.json`）の `pop` に文言と場面を書く。`exam`（資格の色）・`kicker`・`title`・`titleSub`・`badge`（丸い印の [上段, 下段]）・`redBand`・`navyBand`・`scene`・`reference`（承認済みの参照表紙・既定は `scripts/kindle-dist/c-05.jpg`）。`footer` を省くと「技術士（総合技術監理部門）が制作」。数字・年度は catalog と本文で裏付ける
2. 候補を生成し、確認用画像を原寸と 136px で見る。描く文字の一覧と 1 文字ずつ照合する（誤字・欠け・余計な文字・手指・顔と印の重なり）。合否は人か `ai-image-fidelity-auditor` が決める（スクリプトは合格と言わない）
3. `--adopt` で採用する。catalog の表紙の置き場へ 1600×2560 JPEG を書き、制作記録 `pop/<id>.pop-image.json`（参照画像・プロンプト・生成と採用の SHA-256・確かめたこと）を残し、spec に `adoptedImage` を足す
4. `node scripts/asset-offload.mjs --group kindle-dist --include-untracked --commit` で private R2 へ上げ、`node scripts/kdp-publish.mjs --id <id> --update-cover --cover <jpg> --commit` で KDP へ

`npm run sync-kindle-dist` は `adoptedImage` のある本の表紙を作り直さない。縦横比が 5:8 から 1% を超えて外れた候補は採用できない（引き伸ばさずに作り直す）。

## 構成

- `build-pop-cover.mjs` … 生成と採用（生成指示の組み立ては `scripts/lib/kindle-pop-cover.mjs`、先生・画風・文字の決まりは `config/image-generation.json`）
- `specs/<book-id>.json` … 書籍ごとの `pop`（文言・場面・参照画像）と `adoptedImage`
- `pop/<book-id>.pop-image.json` … 採用した表紙の制作記録（C 系 12 冊の初回は `pop/c-series-r08.pop-image.json` にまとめて記録）
- `build-kindle-cover.mjs`・`backgrounds/` … 旧来の組版（背景画像に satori で文字を重ねる）。新しい表紙には使わない。`adoptedImage` の無い本を sync-kindle-dist が作り直すときだけ動く

## 注意

- 通常の作業出力は `.tmp/` or `~/Downloads/`。入稿済み版と配布版は再現性・差し替え確認のため `scripts/kindle-published/` または `scripts/kindle-dist/` で追跡する
- KDP 要件: 1600×2560・JPEG・RGB・白地に白枠回避の極薄エッジ入り・価格/Amazon 等の文言は入れない
- 資格テーマ色 accent は ogp-prompts.md の資格別カラー（1級土木=`#1E73C8` 等）に合わせる
