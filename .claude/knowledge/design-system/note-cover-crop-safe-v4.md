# note カバー Crop-safe V4 実装仕様

> [!todo]
> **実装待ち**：note記事・関連記事・リンクカード・マガジン一覧・マガジンヘッダーで、最重要メッセージが途中で切れないカバーへ移行する。最初は代表6件だけで検証し、全件一括差し替えはパイロット合格後に行う。

## 1. 背景

noteのカバー画像は同じ画像でも表示面ごとにトリミング範囲が異なる。

- 記事の見出し画像：1280×670px推奨
- クリエイターページ／マガジン：1.91:1、1280×670pxまたは高精細1920×1006px
- マガジン一覧等：1280×454pxの範囲
- PCとmobile、ブラウザとアプリで表示範囲が変わり、中央部分が切り取られる

出典：noteヘルプセンター「登録画像の推奨サイズ一覧」

https://www.help-note.com/hc/ja/articles/360000231642-%E7%99%BB%E9%8C%B2%E7%94%BB%E5%83%8F%E3%81%AE%E6%8E%A8%E5%A5%A8%E3%82%B5%E3%82%A4%E3%82%BA%E4%B8%80%E8%A6%A7

現行G2は中央630×630を安全領域にしているが、長い`banner`について「正方形で両端が切れても許容」している。今回の目的は、重要文字の切断を許容せず、どの表示面でも記事・商品を識別できる状態へ変えることである。

## 2. SSOTと既存仕様の関係

- 現行SSOT：`.claude/knowledge/design-system/note-cover.md`
- 値SSOT：`.claude/knowledge/design-system/note-cover-tokens.json`
- 既存提案：`.claude/knowledge/design-system/note-cover-clarity-v3.md`
- 記事レンダラー：`.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`
- 記事生成：`scripts/generate-note-covers.mjs`
- マガジン生成：`scripts/generate-magazine-covers.mjs`

V4はClarity V3を破棄せず、文字階層の考え方を継承してクロップ領域を追加する。実装完了後にV4を`note-cover.md`へ統合し、Clarity V3は歴史資料へ移す。それまでは本書を実装作業票として扱う。

## 3. 目的

読者が0.5秒以内に次を判別できるようにする。

1. 誰向けか
2. 何の記事・教材か
3. 何が得られるか

成功条件は、1280×670のフル表示だけでなく、小型関連記事、中央正方形、マガジン一覧、狭いマガジンヘッダーでも最重要文字が全文残ること。

## 4. 三重安全領域

キャンバスは1280×670pxを維持する。

```text
1280×670 全体
┌────────────────────────────────────────────┐
│ 装飾、背景、人物、資格クレジット、補助情報 │
│                                            │
│     ┌────── 中央630×454 ──────┐           │
│     │ 主題、数字、読後価値             │   │
│     │                              │   │
│     │   ┌─ 中央630×216 ─┐          │   │
│     │   │ 最重要タイトル │          │   │
│     │   │ 資格・商品名    │          │   │
│     │   └───────────────┘          │   │
│     └──────────────────────────────┘   │
└────────────────────────────────────────────┘
```

座標は1280×670基準で次とする。

| 領域 | 座標 | 用途 |
|---|---|---|
| full | `x=0..1280`, `y=0..670` | 背景・装飾 |
| square-safe | `x=325..955`, `y=20..650` | 正方形表示 |
| list-safe | `x=325..955`, `y=108..562` | 関連記事・マガジン一覧の主要情報 |
| core-safe | `x=325..955`, `y=227..443` | 全表示面で絶対に残す主題 |
| text-safe | `x=345..935` | 主要文字の左右20px内余白 |

`core-safe`はマガジン用の最重要領域で、記事用でも主題と数字をこの範囲へ寄せる。背景生成画像は`text-safe`内のコントラストを下げる。

## 5. 記事カバー仕様

### 5.1 情報階層

1. `headline`：主題、4〜9字
2. `hi + hiSuffix`：数字・分類・年度、合計2〜7字
3. `leadIn`：資格・対象、8〜18字
4. `benefit`：読後価値、8〜15字
5. `meta`：無料記事等

`chips×3`はV4では使用しない。既存G2記事では後方互換のため残せるが、V4指定時はlint警告にする。

### 5.2 frontmatter

```yaml
cover:
  variant: crop-safe-v4
  leadIn: "技術士 総監｜択一式"
  headline: "頻出テーマ"
  hi: "680"
  hiSuffix: "問分析"
  benefit: "学習の優先順位がわかる"
  meta: "無料記事"
  visualPrompt: "データ分析を象徴する抽象的なカードとグラフ"
  visualAsset: "img/cover-visual.png"
  character: thinking
  tone: base
```

`visualPrompt`は画像生成の指示元、`visualAsset`は生成済み素材の相対パス。公開画像へ文字として描画しない。

### 5.3 レイアウト

- `leadIn`：list-safe上部
- `headline`：core-safe中央、最大の文字
- `hi + hiSuffix`：headline直下または横並び
- `benefit`：list-safe下部
- `meta`、ロゴ、資格クレジット：full領域
- キャラクター、AI背景：左右外側を基本とし、text-safeを侵食しない

主要3要素`headline`、`hi+hiSuffix`、`benefit`は中央590pxへ一行で収める。最小フォントでも入らない場合は切り詰めず生成エラーにする。

## 6. マガジンカバー仕様

### 6.1 情報階層

1. `magazineName`：商品識別名
2. `qualifier`：資格・区分
3. `proof`：記事数・テーマ数等
4. `benefit`：得られる成果

価格は変更されるため原則として画像へ入れない。記事本数も自動更新できない場合は入れない。

### 6.2 spec

```js
{
  id: 'setsumon3-policy-bank',
  variant: 'crop-safe-v4',
  magazineDir: '...',
  qualifier: '技術士 総監｜記述式',
  magazineName: '国家施策バンク',
  proof: '11テーマ・68施策',
  benefit: '設問3の弾薬を備蓄',
  visualPrompt: '政策カードと日本地図を抽象化した専門教材の背景',
  visualAsset: '.../_cover-visual.png',
  fillBg: '#16365C'
}
```

`magazineName`と`qualifier`はcore-safeへ置く。`proof`と`benefit`はlist-safeへ置く。既存`lines[]`は後方互換として維持し、V4指定時は新フィールドを使う。

## 7. Codex画像生成の分担

### 7.1 画像生成に任せる

- 文字なし背景
- 土木・技術・分析・学習を象徴する図像
- 人物・マスコットの補助素材
- グラフ、カード、道路、橋、歯車、書類等
- 透過または背景素材

### 7.2 決定論的レンダラーに残す

- 日本語文字
- 数字
- ロゴ
- フォント
- 色
- 座標
- 安全領域
- 資格名、年度、商品名

画像生成モデルへ日本語タイトルを描かせない。文字化け、表記差、再生成時の揺れを防ぐ。

### 7.3 Claude → Codex MCPの入出力

Claude Codeは各対象についてJSONL manifestを作る。

```json
{"id":"pe-frequent-topics","kind":"article","prompt":"文字なし。濃紺の専門教材。分析カードと棒グラフ。中央630×454は低情報量。装飾は左右。1280×670。","output":"docs/note/.../img/cover-visual.png","status":"pending"}
```

Codex MCPへ1件ずつまたは少数バッチで渡し、生成結果を`visualAsset`へ保存する。生成後に次を確認する。

- 1280×670
- 文字・数字・ロゴなし
- 中央text-safeが低情報量
- 人物の顔・手・器具に破綻なし
- 資格色と競合しない
- 同一シリーズで画風が統一

生成失敗時は背景なしの決定論的テンプレへフォールバックする。AI素材がないことを公開ブロッカーにしない。

### 7.4 標準プロンプト

```text
note記事カバー用の文字なし背景素材を生成してください。

対象:
{資格・記事テーマ}

視覚モチーフ:
{visualPrompt}

デザイン:
日本の専門資格教材に適した、信頼感のあるモダンな編集デザイン。
広告的に派手すぎず、専門家の資料らしい精密さを持たせる。
資格の基調色は{baseColor}。

構図:
1280×670の横長。
中央630×454には後から日本語タイトルを重ねるため、低コントラストかつ低情報量の余白を確保する。
主要な装飾は左右外側へ置く。
人物を入れる場合は右端または左端へ寄せ、中央へ重ねない。

禁止:
文字、数字、ロゴ、透かし、署名、読めない疑似文字を描かない。
```

## 8. 実装対象

### 必須

1. `.claude/knowledge/design-system/note-cover-tokens.json`
   - version更新
   - `layout.cropSafeV4`
   - variant別schema
2. `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`
   - `renderNoteCoverCropSafeV4`
   - 既存G2入口のopt-in分岐
3. `scripts/add-note-cover.mjs`
   - V4フィールドの読書き・検証
4. `scripts/generate-note-covers.mjs`
   - `visualAsset`の読み込み
   - 素材なしフォールバック
5. `scripts/generate-magazine-covers.mjs`
   - マガジンV4分岐
6. `scripts/check-note-cover-fit.mjs`
   - crop別の文字フィット
7. `scripts/note-cover-gallery.mjs`
   - 6表示面プレビュー
8. `.claude/agents/note-cover-writer.md`
   - V4コピー規則
9. `.claude/knowledge/design-system/note-cover.md`
   - パイロット合格後にV4を現行SSOTへ統合

### 推奨追加

- `scripts/build-note-cover-inventory.mjs`
- `scripts/build-note-cover-visual-manifest.mjs`
- `scripts/audit-note-cover-crops.mjs`
- `.claude/state/note-cover-v4-inventory.json`

## 9. 6表示面プレビュー

各生成画像から次を作る。

| ID | サイズ・切り抜き | 用途 |
|---|---|---|
| full | 1280×670 | 記事見出し |
| square | 中央630×630 | 正方形系 |
| list | 中央1280×454 | マガジン一覧 |
| core | 中央1280×216 | 狭いヘッダー |
| card | 320×168 | リンクカード |
| related | 160×110 | 人気・関連記事 |

ギャラリーでは1画像につき6面を横並びにする。単なる縮小だけでなく、定義したcropを実際に切り出す。

## 10. 機械検査

`check-note-cover-fit`または新しい`audit-note-cover-crops`で次を検査する。

- `headline`推定幅 ≤ 590px
- `hi + hiSuffix`推定幅 ≤ 590px
- `benefit`推定幅 ≤ 590px
- `magazineName`推定幅 ≤ 590px
- core-safe内の主要要素が境界外へ出ない
- 主要文字のフォントがrelated表示換算で判読下限を下回らない
- V4で`chips`が指定されていない
- `visualAsset`が存在し、1280×670である
- visualAsset中央のエッジ密度が閾値を超える場合は警告
- PNGにdebug枠が残っていない

背景エッジ密度は警告のみとし、最終判断は目視Evaluatorへ残す。

## 11. パイロット

最初は次の6種類から各1件を選ぶ。

1. 総監・無料記事
2. 総監・有料記事
3. 総監・マガジン
4. 1級土木・記事
5. 2級土木・記事
6. 土木・マガジン

選定条件：

- 現在クロップ切れが目立つ
- 回遊・売上への影響が大きい
- 長いタイトルを含む
- 無料／有料、記事／商品を横断できる

既存ファイルの変更前に対象パスとnote ID／magazine keyを計画へ記録する。

## 12. パイロット実装手順

1. `git status --short`とブランチを確認する。
2. 対象6件の現行画像を退避せず、gitで差分追跡できることを確認する。
3. V4 tokensとrendererをopt-inで実装する。
4. 記事3〜4件のfrontmatterを`add-note-cover.mjs`経由で更新する。
5. マガジン2件程度のspecをV4へ変更する。
6. Claudeが文字コピーとvisual manifestを作る。
7. Codex MCPで文字なし素材を生成する。
8. 記事・マガジンカバーを生成する。
9. 6表示面ギャラリーを生成する。
10. 独立Evaluatorが視認性、内容一致、回遊性、ブランド一貫性を採点する。
11. 合格後のみnote.comへdry-runする。
12. ユーザーの実更新指示がある場合のみ`--commit`する。

## 13. 評価ルーブリック

各0〜3点、合計18点。各軸2点以上、合計15点以上を合格とする。

1. クロップ耐性
2. 0.5秒での主題理解
3. 記事・商品との内容一致
4. 資格区分の識別
5. 小型表示の可読性
6. ブランド一貫性

Evaluatorは生成担当と分離する。

## 14. 一括移行

パイロット合格後に全件inventoryを作る。

各対象に次を記録する。

- article pathまたはmagazineDir
- noteIdまたはmagazine key
- 現行variant
- pricing
- exam
- headline
- primary number
- benefit
- visualPrompt
- visualAsset
- crop audit
- live update status

一括生成は資格×種別で分割する。推奨順：

1. 高流入無料記事
2. L1/L2もくじ
3. 主力有料記事
4. 主力マガジン
5. その他公開記事
6. 低優先・休眠商品

全画像を同時にnoteへ反映しない。20件前後のチャンクで更新し、各チャンク後にAPIとブラウザで確認する。

## 15. note.comへのライブ反映

### 記事

```bash
npm run note-update-cover -- --list .tmp/note-cover-v4-articles.txt
npm run note-update-cover -- --list .tmp/note-cover-v4-articles.txt --commit
```

安全条件：

- account=`dobokunote`
- dry-run成功後のみcommit
- 有料記事のpriceとpaywall境界を維持
- 更新通知は「いいえ」
- eyecatch新IDをAPIで確認
- 1件失敗したらチャンクを止める

### マガジン

```bash
npm run note-magazine-cover -- --key <key> --dir <magazineDir>
npm run note-magazine-cover -- --key <key> --dir <magazineDir> --commit
```

保存後、APIの`cover`／`coverRectangle`がdefaultではなく新画像になったことを確認する。

### 実表示

各チャンクから最低3件を、PCとmobile相当で確認する。

- 記事ページ
- 記事内リンクカード
- 人気記事・関連記事
- マガジン一覧
- マガジンページ

## 16. 検証コマンド

```bash
node scripts/generate-note-covers.mjs <scope>
node scripts/generate-magazine-covers.mjs <scope>
npm run check-note-cover-fit
npm run note-cover-gallery
node --test tests/*.test.mjs
npm run type-check
npm run lint
git diff --check
```

新しい監査コマンドを追加した場合もここへ追記する。

## 17. 完了条件

### パイロット

- 代表6件だけV4
- 既存variantなし/G2の出力に意図しない差分なし
- 6表示面ギャラリー生成
- ルーブリック合格
- 通常画像にdebug枠なし
- note.com未反映、または明示承認された対象だけ反映

### 全件移行

- 全公開記事・マガジンがinventoryにある
- 主要文字が全cropで切れない
- 全カバーfit検査成功
- 生成素材の文字混入ゼロ
- noteライブ反映とAPI検証済み
- 有料価格・境界の変化ゼロ
- 更新通知送信ゼロ
- handoffに対象、結果、失敗、ロールバック方法を記録

## 18. ロールバック

- 記事：`cover.variant`とV4フィールドを外し、既存G2フィールドへ戻して再生成
- マガジン：`variant`を外し、既存`lines[]`で再生成
- note.com：旧カバーをgitの直前版から再生成し、同じ更新ツールで差し替える
- renderer：V4はopt-in分岐なので、variant指定を外せば既存出力へ戻る

破壊的なgit操作は使わない。
