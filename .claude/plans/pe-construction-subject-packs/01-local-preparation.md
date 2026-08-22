# 選択科目パック：ローカル準備手順書

## 1. 目的

note.comへ書き込む前に、残り10商品のメタデータ、カタログ、カバー、商品ID、検査をローカルで完成させる。

## 2. 事前確認

```bash
git branch --show-current
git fetch -q
git log --oneline HEAD..origin/develop | head
git status --short
npm run verify-note-magazines -- --vs-txt --contents --json
```

- `origin/develop`より古いベースで作業しない。
- note関連ファイルを別セッションが変更中なら開始しない。
- 無関係な未コミット変更を戻さない、stageしない。
- 公開APIの取得失敗を「差分なし」と解釈しない。

## 3. `{NOTE_ROOT}`の確定

`content/note`と`docs/note`を確認し、`00-product-plan.md`の規則で1つだけ選ぶ。以後の対象は次とする。

```text
{NOTE_ROOT}/技術士建設部門/magazines/
```

## 4. パックディレクトリの正規化

既存3ディレクトリを、選択科目BK番号と一致する命名へ履歴保持で変更する。

```text
PACK-01_道路まるごと合格パック       → PACK-BK01_道路まるごと合格パック
PACK-02_トンネルまるごと合格パック   → PACK-BK11_トンネルまるごと合格パック
PACK-03_都市計画まるごと合格パック   → PACK-BK03_都市計画まるごと合格パック
```

残り8ディレクトリを作成する。

```text
PACK-BK02_河川砂防まるごと合格パック
PACK-BK04_土質基礎まるごと合格パック
PACK-BK05_鋼コンまるごと合格パック
PACK-BK06_施工計画まるごと合格パック
PACK-BK07_建設環境まるごと合格パック
PACK-BK08_港湾空港まるごと合格パック
PACK-BK09_電力土木まるごと合格パック
PACK-BK10_鉄道まるごと合格パック
```

各ディレクトリには`note掲載文.txt`と`_cover.png`だけを置く。記事本文をコピーしない。

## 5. `note掲載文.txt`

既存道路パックを構造テンプレートにし、各商品で次を作る。

```text
■ マガジンタイトル（30字以内）
■ 価格
■ 説明（400字以内）
■ アピールポイント（250字以内）
■ 機械用（編集しない・自動同期）
```

共通値：

```text
セット価格: 4980
単品価格: 780
期待記事数: 29
```

本文では必ず次を明示する。

- 必須科目I 全11記事。
- 対象選択科目 全18記事。
- 単品合計¥6,460が¥4,980。
- 元・地方自治体の土木職（発注者）視点。
- 各記事に印刷用PDF付き。

「科目合格者」と表現できるのは、運営者が実際に合格した科目だけに限定する。道路・都市計画以外へ根拠なく展開しない。

## 6. `note-magazines.ts`

道路を含む11商品が連続して並ぶよう科目パック節を整理する。

- 既存道路は変更しない。
- 既存トンネル・都市計画は`published:false`を維持したまま説明を最新テンプレートへ揃える。
- 残り8商品のentryを追加する。
- 公開前は必ず`published:false`、`noteUrl:''`。
- `price`は`¥4,980（必須I＋選択科目・単品合計¥6,460、約23%OFF）`。
- `shortTitle`と`shortDescription`は対象科目が一目で分かるようにする。
- product IDは`00-product-plan.md`の表から変更しない。

商品追加時に、sales recorderの商品ID推定、管理画面売上一覧、note CTAの型が新IDを扱えるか確認する。タイトル文字列だけへ依存する推定を増やさない。

## 7. カバー定義

`scripts/generate-magazine-covers.mjs`へ10商品の定義を追加する。すべて次を守る。

- `id`はcatalog product IDと一致。
- `magazineDir`は正規化後の`PACK-BKxx_*`。
- `fileBaseName`は`pe-construction-{subject}-pack-cover`。
- 出力は各dirの`_cover.png`、1280×670。
- 価格と自動変動する記事数を画像へ固定しない。

`.claude/config/note-cover-magazine-v4.json`へ10商品のV4定義を追加する。

```text
examKey: pe-construction
qualifier: 建設部門｜{短縮科目名}
magazineName: {短縮科目名}合格パック
proof: 必須科目I＋選択科目 二次一式
benefit: {短縮科目名}で受けるならこれ一冊
```

既存道路の`proof`表現と粒度を揃える。

## 8. カバー生成・視覚確認

商品ごとに対象scopeで生成し、全件一括生成による無関係差分を避ける。

```bash
node scripts/generate-magazine-covers.mjs <product-id>
npm run check-note-cover-fit
npm run check-note-cover-tokens
```

10枚すべてについて、中央1280×216のクロップでも科目名と「合格パック」が読めることを確認する。文字切れ、道路の画像流用に見える科目不一致、価格の画像直書きがあれば修正する。

## 9. 配線ゲート

`scripts/check-pe-construction-packs.mjs`と対応テストを追加し、最低限次を検査する。

- 選択科目11件すべてにpack entryがある。
- product ID、BK番号、subject source keyの重複がない。
- 全packの価格が¥4,980。
- `published:true`なら`noteUrl`がある。
- `published:false`なら空URLを許容する。
- 対応する`note掲載文.txt`と`_cover.png`がある。
- `note掲載文.txt`のセット価格、タイトル、科目名がcatalogと一致する。
- 公開済みpackが`magazine-placement.ts`または建設部門もくじから到達できる。

`package.json`へ`check-pe-construction-packs`を追加し、最終的に`quality:audit`へ接続する。

## 10. ローカル検証

```bash
npm run note-meta-lint
npm run check-pe-construction-packs
npm run check-note-cover-fit
npm run check-note-cover-tokens
npm run verify-note-magazines -- --vs-txt --contents --json
npm run check-doc-refs
npm run type-check
git diff --check
```

公開前の10商品が`published:false`であることによる未公開表示は正常。既存公開商品とのドリフトはゼロにする。

## 11. 完了条件

- 10商品の`note掲載文.txt`が文字数・価格検査を通る。
- 10商品のカバーが生成され、視覚確認済み。
- catalogに全11商品が存在する。
- 新10商品は`published:false`、空URL。
- source magazine 12誌（必須I＋11選択科目）のライブ価格と記事数を取得できる。
- note.comへの書込みはまだ行っていない。
