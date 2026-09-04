# Kindle 表紙ビルダー

Kindle(KDP) 入稿用の表紙（1600×2560 JPEG）を **spec 駆動で決定論的に再生成**する。
Codex 等で生成した背景画像に、satori + NotoSansJP-Bold で**日本語タイトルを後合成**する
（画像モデルは日本語を崩すため、文字は必ずコードで乗せる）。

## 使い方

```bash
node scripts/kindle-covers/build-kindle-cover.mjs --spec scripts/kindle-covers/specs/a-01.json --out ~/Downloads/kindle-cover-A-01.jpg
```

## 構成（再生成に必要な入力は git 管理下）

- `build-kindle-cover.mjs` … レンダラ（決定的）
- `specs/<book-id>.json` … 書籍ごとの文言・背景・色（真実源）
- `backgrounds/<book-id>.png` … Codex 生成の背景画像（元データ）

## 新しい表紙を追加する手順（A-02 以降）

1. Codex で背景を生成（プロンプトは brand-image-system 準拠・**文字なし**・上部に余白ゾーン）→ `backgrounds/<id>.png` へ保存
2. `specs/<id>.json` を作成（kicker / titleLines / subLines / accent は資格テーマ色 / brand=doboku-note）
3. `node scripts/kindle-covers/build-kindle-cover.mjs --spec specs/<id>.json --out ~/Downloads/...` で生成
4. KDP にアップロード

## 注意

- 通常の作業出力は `.tmp/` or `~/Downloads/`。入稿済み版と配布版は再現性・差し替え確認のため `scripts/kindle-published/` または `scripts/kindle-dist/` で追跡する
- KDP 要件: 1600×2560・JPEG・RGB・白地に白枠回避の極薄エッジ入り・価格/Amazon 等の文言は入れない
- 資格テーマ色 accent は ogp-prompts.md の資格別カラー（1級土木=`#1E73C8` 等）に合わせる
