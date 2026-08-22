---
taskId: DN-0103
phase: 03
title: Brain公開コンテンツをcontent/brainへ移行
status: blocked-by-phase-02
---

# Phase 03: Brain公開コンテンツをcontent/brainへ移行

## 目的

Brainの販売本文・画像・配布ZIPをAgent config領域からPublishable Contentへ移す。商品設計・検証・運用・認証を役割別に残し、二重SSOTと壊れ参照を0にする。

## 開始条件

- Phase 01・02が完了し、admin/文書のテストがPASSしている。
- DN-0030 / DN-0031や別セッションがBrainのcatalog/listings/assets/dist/scriptsを編集中でない。
- `git status --short`を記録し、既存変更と対象が重なる場合は停止する。
- `npm run check-brain-wiring`が移行前baselineでPASSする。
- ZIP 2本のsha256、bytes、ファイル名を記録する。
- `brain-products.ts`の2商品のstatus/price/articleId/productUrl/distFileを記録する。

## 正規構成

```text
content/brain/
  README.md
  listings.json
  assets/
    thumb-civil-essay-kit.png
    thumb-sokan-policy-bank.png
    figures/
      ...
  dist/
    claude-code-civil-essay-kit-beta-8K93ERd_D6fR.zip
    pe-policy-bank-kit-beta-vfsiHyhN_1g2.zip
```

`content/brain/README.md`は次だけを記載する。

- この領域が販売投入本文・販売画像・配布物のSSOTであること
- 価格・status・URLは`src/lib/brain-products.ts`が正であること
- 公開操作は`/brain-publish`、配線検査は`check-brain-wiring`
- distのR2 object keyは`brain/dist/{filename}`でローカル移動後も不変
- secretを置かないこと

## 物理移動

| 移動元 | 移動先 | 方法 |
|---|---|---|
| `.claude/config/brain-listings.json` | `content/brain/listings.json` | move。コピー残し禁止 |
| `.claude/config/brain/assets/**` | `content/brain/assets/**` | move。相対名維持 |
| `.claude/config/brain/dist/**` | `content/brain/dist/**` | move。ファイル名・sha256維持 |

次は移動しない。

- `.claude/config/brain-account.json`
- `.claude/config/brain-competitors.json`
- `src/lib/brain-products.ts`
- `.claude/knowledge/reference/brain-operations.md`
- `docs/products/brain-*/`の企画・仕様・証拠・バックテスト

## docs/productsの棚卸し

### 販売ページdraft

- `brain-claude-code-essay-skill/02-brain-sales-page-draft.md`
- `brain-r8-policy-prediction-skill/06-brain-sales-page-draft.md`

`content/brain/listings.json`の現行本文と比較する。販売中本文のSSOTはlistingsなので、次で処理する。

1. 現行listingに無い有効な事実があれば、価格を複製せずlistingsまたはproduct-specへ抽出する。
2. 古い価格・未完成表現・仮置きは持ち越さない。
3. 現行listingに包含されることを確認したらdraftを削除する。
4. 「旧原稿」保存ディレクトリやarchiveを作らない。履歴はgitが持つ。

### 無料note draft

`brain-r8-policy-prediction-skill/05-free-note-draft.md`を実読し、既存`content/note`に同一記事がないか検索する。

- 既存実体があれば内容を統合し、docs側を削除する。
- 今後公開する有効な下書きなら、note authoring規約に従う正規`content/note/**/article.md`へ変換する。frontmatter、cover、hashtags、noteStatus draftを揃え、公開はしない。
- 企画として失効していれば、恒久判断だけproduct-specへ抽出して削除する。

### ココナラPDF source

`brain-r8-policy-prediction-skill/07-coconala-bunseki-source.md`はBrainではなくココナラ制作入力である。

- 既存`content/coconala`の同一原稿を検索する。
- 生きたPDF sourceなら`content/coconala/products/{canonical-id}/source.md`相当へmoveする。
- 既存PDF生成script/configの参照を同じ変更で更新する。
- 重複または失効なら抽出後削除する。
- ココナラ公開・商品変更は行わない。

### 手動playbook

`docs/products/brain-publish-playbook.md`と`.claude/knowledge/reference/brain-operations.md`を節ごとに比較する。

- 生きた手順・安全弁をbrain-operationsへ統合する。
- `C:\tmp`等の旧一時パスや古い手動手順は現行script実体で検証する。
- 統合後、playbookを削除する。
- Brain操作のSSOTを2本残さない。

## パス宣言

`scripts/lib/repository-paths.mjs`へ次を追加する。

```js
export const BRAIN_CONTENT_ROOT = at('content', 'brain');
export const BRAIN_LISTINGS_PATH = at('content', 'brain', 'listings.json');
export const BRAIN_ASSETS_ROOT = at('content', 'brain', 'assets');
export const BRAIN_DIST_ROOT = at('content', 'brain', 'dist');
```

文字列リテラルを各scriptへ再散在させない。

## 更新対象

最低限、次を全て検索・更新する。

- `scripts/lib/brain-session.mjs`
- `scripts/brain-publish.mjs`
- `scripts/brain-insert-figures.mjs`
- `scripts/check-brain-wiring.mjs`
- `scripts/upload-brain-dist-r2.mjs`
- `scripts/install-pre-commit.mjs` のstaged path判定
- `.github/workflows/r2-brain-dist.yml`
- `src/lib/brain-products.ts` のコメント
- `.claude/skills/management/brain-publish/SKILL.md`
- `.claude/agents/brain-operator.md`
- `.claude/knowledge/reference/brain-operations.md`
- `AGENTS.md`の参照表（該当する場合）
- admin README / information architecture
- tests

`.agents/`や`.codex/`に追跡下の互換定義が存在する場合は、現行ガバナンスに従い同一変更で同期する。どちらが生成物かを確認せず片方だけ編集しない。

## listings内の更新

- `imagePath`を`content/brain/assets/...`へ変更する。
- bodyText、paidMarker、配布URL、価格、商品文言はパス移行のために変更しない。
- JSON key順・改行を不要に全面整形しない。

## workflow/R2契約

- workflow名とmanual dispatchを維持する。
- upload対象のローカルrootだけ`content/brain/dist`へ変更する。
- R2 keyは`brain/dist/{filename}`のままにする。
- GitHub Secrets名を変更しない。
- このPhaseではworkflow dispatchを実行しない。

## 検査強化

`check-brain-wiring`を次の新配置へ対応させる。

- catalog↔listings全商品一致
- imagePath実在
- distFile実在
- distFile basenameと配布URL basename一致
- listed商品はURL必須
- 価格の本文直書き禁止
- 配布URLがpaidMarkerより後
- 検査対象0件をPASSにしない
- 旧`.claude/config/brain-listings.json`、`.claude/config/brain/{assets,dist}`が存在したらFAIL

## 検証

```bash
npm run check-brain-wiring
npm run check-information-architecture
npm run check-doc-refs
node --test tests/information-architecture.test.mjs tests/repository-paths.test.mjs
npx tsc --noEmit -p tools/admin-app/tsconfig.json
npm run type-check
git diff --check
```

追加実査:

```bash
rg -n "\.claude/config/brain-listings\.json|\.claude/config/brain/(assets|dist)" \
  AGENTS.md .claude .agents .codex scripts src tools tests .github docs content
```

許可された移行履歴・検査fixture以外は0件にする。PowerShellでは同等の`rg`引数へ置き換えてよい。

移行前後で次を比較する。

- ZIP 2本のsha256、bytes、basename
- PNG/SVG件数
- 商品2件のid/status/price/articleId/productUrl/distFile
- listings 2件のbodyText hash、paidMarker、imagePath以外の値
- R2 URL文字列

## 停止条件

- catalog値や販売本文の修正が必要になる
- ZIPのsha256が変わる
- 外部R2 key変更が必要になる
- docs draftの正否を実体から判断できない
- DN-0030 / DN-0031と対象ファイルが競合する
- `.claude/config/brain-account.json`を移動・表示する必要が出る
- 旧新の両方を残さないと既存scriptが動かない

## Phase 03専用Claude Codeプロンプト

```text
DN-0103 Phase 03だけを実装してください。Phase 01・02の受入条件が完了していることを確認してください。

00-master.md、03-brain-content-migration.md、information-architecture.md、brain-operations.md、
brain-publish SKILL、brain-operator、repository-paths.mjs、brain関連scriptsとworkflowを全文読んでください。

移行前にBrain商品2件、listings、assets、ZIPの件数・sha256・価格・status・URLを記録してください。
販売本文・画像・ZIPだけをcontent/brainへmoveし、旧パスへコピーを残さないでください。
商品企画・検証はdocs/products、運用はknowledge、アカウント設定はconfigに残してください。

販売ページdraft、無料note draft、ココナラsource、手動playbookは実体と比較し、
重複なら抽出後削除、生きた別チャネル制作物なら正規contentへ移してください。
archiveや互換ミラーは作らないでください。

全script/workflow/skill/agent/reference/testを同じ変更で更新し、R2 object key、ZIP名、sha256、
商品price/status/URL、販売本文を不変にしてください。R2 upload、Brain公開、deployは実行しないでください。

全ゲート、旧パス0件、移行前後比較を報告して停止してください。Phase 04へ自動で進まないでください。
```
