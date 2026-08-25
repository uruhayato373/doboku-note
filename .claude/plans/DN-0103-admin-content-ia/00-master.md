---
taskId: DN-0103
type: implementation-plan
createdAt: 2026-08-21
deleteOnComplete: true
---

# DN-0103 管理画面のコンテンツ中心IAとBrainチャネル統合

## 到達点

管理画面を保存場所の一覧ではなく、運営者が「どのチャネルの何を確認したいか」から入れる構造へ変更する。

完成時は次の状態にする。

1. 左ナビの「発信」は「コンテンツ」になり、サイト・note・X・Instagram・YouTube・ココナラ・Kindle・Brainへ進める。
2. `/content` は「管理」の制作物置き場ではなく、コンテンツグループの横断入口になる。
3. `/docs` は「方針・設計」として、文書目的・対象チャネル・保持区分の複数軸で絞り込める。
4. MarkdownをSSOTのまま維持し、Callout・表・関連タスク・関連チャネルをReact側で読みやすく表示する。
5. Brainの販売本文・画像・配布ZIPは `content/brain/`、商品設計・検証は `docs/products/`、運用規約は `.claude/knowledge/`、アカウント設定は `.claude/config/` に分離される。
6. Brain専用画面で商品状態・販売文・画像・配布物・関連設計を横断確認できる。
7. 管理画面はread-onlyを維持し、公開・アップロード・価格変更・外部申請を実行しない。

## 起票時の実査

- `tools/admin-app/src/components/Nav.tsx` の第一グループは「発信」で、サイト・note・X・Instagramだけを持つ。
- `/content` は「管理 > 制作物」にあり、物理 `content/` には coconala / kindle / note / site / sns / sources が存在する。
- `docs/**/*.md` は82本。products 21本のうちBrain関連が14本で、商品設計・販売原稿・別チャネル原稿・手動プレイブックが混在する。
- Brainの投入本文は `.claude/config/brain-listings.json`、画像とZIPは `.claude/config/brain/{assets,dist}` にあり、公開コンテンツがconfig領域へ混在している。
- Brainの価格・状態・URLは `src/lib/brain-products.ts` が現行SSOT。これはサイト導線から直接importされているため、本タスクでは移動しない。
- `.claude/knowledge/reference/information-architecture.md` は「顧客へ届ける制作物と入力=content」「恒久判断=docs」「反復運用知識=.claude/knowledge」「設定・状態=.claude/config/state」を正としている。

## 設計原則

### 1. 画面分類と物理配置を一致させすぎない

画面はチャネル単位、ファイルは情報の役割と寿命で分類する。同じBrain商品について、管理画面は複数SSOTを集約してよいが、ファイルを画面都合で複製しない。

### 2. Markdownを捨てない

文書はMarkdownをSSOTとし、HTMLファイルを保存しない。UI改善はfrontmatter、Markdown AST、Reactコンポーネント、CSSで行う。任意HTML実行やsanitize無効化は禁止する。

### 3. Brainはpilot

Brainでチャネル集約の型を完成させる。Kindle・ココナラの専用ダッシュボードを同時に作り込まない。Phase 01では入口だけ整え、Brainの型を評価してから別タスク化する。

### 4. UI先行、物理移行は後

Phase 01・02でUIと分類モデルを先に確定し、Phase 03でBrainの物理移行を行う。新旧コピーを同時に置かず、各移動は参照更新と同じcommit候補にまとめる。

### 5. 外部変更を含めない

Brain公開申請、本文更新、R2アップロード、価格変更、Cloudflare deploy、main mergeは対象外。ローカルでのパス変更と管理画面実装だけを行う。

## 対象領域

### 含む

- admin左ナビとチャネルregistry
- `/content` 横断入口
- `/docs` の多軸分類とMarkdown表示改善
- `content/brain/` の新設とBrainコンテンツ移行
- Brain専用read-only画面
- Brain関連script / workflow / skill / agent / referenceのパス同期
- テスト、README、情報アーキテクチャSSOTの同期

### 含まない

- note / Brain / ココナラ / KDPへの公開操作
- R2へのアップロード
- Brain商品の価格・status・URL変更
- Brain配布ZIPの内容改訂
- Kindle・ココナラの専用ダッシュボード完成
- サイト本体のナビゲーション変更
- docs本文の事業判断・商品仕様の書き換え
- `.claude/config/brain-account.json` の表示・移動

## 確定した配置

| 情報 | 正規配置 | 管理画面 |
|---|---|---|
| Brain価格・状態・URL | `src/lib/brain-products.ts`（現行維持） | コンテンツ > Brain > 商品 |
| Brain販売本文・paid marker | `content/brain/listings.json` | コンテンツ > Brain > 販売文 |
| Brainサムネ・販売図版 | `content/brain/assets/` | コンテンツ > Brain > 画像 |
| Brain配布ZIP | `content/brain/dist/` | コンテンツ > Brain > 配布物 |
| 商品企画・仕様・検証・証拠 | `docs/products/brain-*/` | 方針・設計、Brain > 関連設計 |
| 出品運用と安全弁 | `.claude/knowledge/reference/brain-operations.md` | ナレッジ、Brain > 運用 |
| Brainアカウント・認証設定 | `.claude/config/brain-account.json` | 値を表示しない |
| Brain競合観測 | 現行config/state（本タスクで移動しない） | 分析への展開は別タスク |

## フェーズ

| Phase | 実装契約 | 主な出口 | 外部変更 |
|---|---|---|---|
| 01 | [ナビ・チャネルregistry](./01-admin-navigation-and-channel-registry.md) | 「コンテンツ」グループと全チャネル入口 | なし |
| 02 | [文書分類・Markdown表示](./02-document-taxonomy-and-rendering.md) | 多軸filter、Callout、関連チャネル | なし |
| 03 | [Brain物理移行](./03-brain-content-migration.md) | `content/brain`、全参照同期、二重SSOT 0 | なし |
| 04 | [Brain専用ビュー](./04-brain-admin-view.md) | 商品・本文・画像・ZIP・設計の横断画面 | なし |
| 99 | [完了確認](./99-finalize-and-delete.md) | 恒久SSOT抽出、カードとplan削除 | なし |

## 実行順

1. Phase 01を単独で実装・検証し、画面スクリーンショットと変更一覧を報告して停止する。
2. Phase 02を単独で実装する。82文書への一括frontmatter追加はせず、既定推論と必要文書だけのoverrideから始める。
3. DN-0030 / DN-0031や別セッションがBrain配線を触っていないことを確認してからPhase 03を行う。
4. Phase 03のパス移行が全ゲートを通ってからPhase 04へ進む。
5. Phase 04の目視・E2Eを完了し、Brain方式を他チャネルへ展開するかは別途判断する。
6. Phase 99で再利用する規則だけを恒久SSOTへ抽出し、一時計画を削除する。

## 全体禁止事項

- 共有worktreeの既存変更をreset、checkout、stash、上書きしない。
- originより古いベースで実装しない。同期が必要なら破壊的操作をせず停止する。
- `docs/products/brain-*` を一括で `content/brain` へ移さない。
- 販売原稿を旧パスと新パスへコピーして二重SSOTを作らない。
- `remark-html` のsanitizeを無効化しない。
- HTMLファイルを文書SSOTとして追加しない。
- adminに公開、価格変更、R2 upload、任意shell実行ボタンを追加しない。
- Brainのstatus、price、productUrl、articleIdを本タスク都合で変更しない。
- トークン付きZIP名や配布URLを変更しない。
- `.claude/config/brain-account.json` の中身を画面・ログ・テストfixtureへ出さない。
- main merge、push、deploy、外部サービス変更を行わない。

## 全体受入条件

- 左ナビで「発信」が0件、「コンテンツ」が1グループ存在する。
- `/content` が管理グループから消え、コンテンツグループから到達できる。
- Site / note / X / Instagram / YouTube / Coconala / Kindle / Brainへの入口がある。
- `/docs` は文書目的・チャネル・保持区分で絞り込め、URL queryで状態を復元できる。
- MarkdownのH2/H3目次、リンク、sanitize、DN関連タスクが壊れていない。
- Brainのlisting/assets/distは `content/brain` のみがSSOTで、旧配置が0件。
- Brainの公開URL、価格、status、ZIPファイル名、R2 object keyが移行前後で不変。
- Brain画面はread-onlyで、配線不一致を空欄や緑ではなく警告として表示する。
- `npm run check-information-architecture`、`npm run check-doc-refs`、`npm run check-brain-wiring` がPASSする。
- adminの型検査、単体テスト、E2E、dark/light目視がPASSする。

## Claude Code開始プロンプト

```text
DN-0103をPhase 01から実装してください。

最初に次を全文読んでください。
- AGENTS.md
- tools/admin-app/AGENTS.md
- .claude/todo/backlog.md のDN-0103
- .claude/plans/DN-0103-admin-content-ia/00-master.md
- .claude/plans/DN-0103-admin-content-ia/01-admin-navigation-and-channel-registry.md
- .claude/knowledge/reference/information-architecture.md
- tools/admin-app/README.md

ブランチとoriginとの差、git statusを確認し、古いベースまたは競合する既存変更があれば
勝手にreset/checkout/stashせず停止してください。共有worktreeの既存変更は戻さないでください。

このターンではPhase 01だけを実装してください。左ナビの「発信」を「コンテンツ」へ変更し、
チャネル定義を純粋なchannel registryへ集約して、Site/note/X/Instagram/YouTube/Coconala/Kindleと
「すべてのコンテンツ」への入口を整えてください。Brainはregistryに定義するだけに留め、未実装routeをリンクしないでください。/contentを管理グループから外し、
/docsの表示名は「方針・設計」にしてください。保存場所の移動やcontent/brain作成には進まないでください。

Phase 01のテスト・admin型検査・E2E・dark/light目視まで実施し、
変更ファイル、検証結果、スクリーンショット、未解決事項を報告して停止してください。
commitはPhase単位の候補まで、push・deploy・Brain/note/R2の外部変更は実行しないでください。
```
