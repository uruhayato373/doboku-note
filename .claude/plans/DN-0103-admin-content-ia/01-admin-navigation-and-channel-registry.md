---
taskId: DN-0103
phase: 01
title: adminナビとチャネルregistry
status: ready
---

# Phase 01: adminナビとチャネルregistry

## 目的

物理ディレクトリを管理画面の第一分類にせず、運営者が扱うチャネルから入れる左ナビへ変更する。このPhaseではファイル移動をしない。

## 変更対象

- `tools/admin-app/src/components/Nav.tsx`
- 新規 `tools/admin-app/src/lib/channel-registry.ts`
- `tools/admin-app/src/lib/document-roots.ts`
- `tools/admin-app/src/app/content/page.tsx`
- 必要なadmin UI component / CSS
- `tools/admin-app/README.md`
- `tests/admin-document-store.test.mjs` または新規の小さなregistryテスト
- 必要なら `tests/admin-navigation.test.mjs`

## registryの契約

`channel-registry.ts` はNode APIやfsをimportしない純粋なデータモジュールにする。Client ComponentのNavとServer Componentのcontent pageの双方から安全にimportできること。

最低限、次を型で持つ。

```ts
type AdminChannelId =
  | 'site'
  | 'note'
  | 'x'
  | 'instagram'
  | 'youtube'
  | 'coconala'
  | 'kindle'
  | 'brain';

type AdminChannel = {
  id: AdminChannelId;
  label: string;
  sourcePath: string | null;
  tabs: readonly {
    href: string;
    label: string;
    match: string;
    query?: Readonly<Record<string, string>>;
  }[];
};
```

`sourcePath`は表示・関連付け用であり、fsアクセスに直接使わない。実ファイル解決は既存の`document-roots.ts`とtraversal guardを維持する。

## 確定ナビ

### コンテンツ

1. `すべて` → `/content`
2. サイト
   - 記事 `/content/articles`
   - OGP `/gallery/ogp`
   - 記事図版 `/gallery/figures`
3. note
   - 記事 `/content/note`
   - マガジン `/content/magazines`
   - 画像 `/gallery/note`
4. X
   - 画像 `/gallery/sns?ch=x`
   - 投稿状態は既存 `/sns` のX sectionへ到達できる範囲でリンクする。新しい書込UIは作らない
5. Instagram
   - 画像・動画 `/gallery/sns?ch=instagram`
   - 投稿状態は既存 `/sns`
6. YouTube
   - `content/sns/youtube` の汎用read-only drilldown。新しい動画操作画面は作らない
7. ココナラ
   - `content/coconala` の汎用read-only drilldown
8. Kindle
   - `content/kindle` の汎用read-only drilldown
9. Brain
   - Phase 04までは専用画面が無いため、無効リンクを置かない
   - Phase 01では「準備中」表示もリンクも作らず、registryへ`enabled:false`相当を持たせるか、`/content`上の今後のチャネルとしてのみ定義する
   - Phase 04で `/content/brain` を有効化する

### その他グループ

- 計画、運用、分析、収益は現行順とルートを維持する。
- 「管理」の`制作物`を削除する。
- 「管理」の`ドキュメント`は表示名だけ`方針・設計`へ変更し、routeは`/docs`のままにする。
- 品質概観、実装計画、ナレッジ、エージェント、スキルは維持する。

## 手順

1. `Nav.tsx`の現行GROUPSとactive判定のテスト可能部分を棚卸しする。
2. pure registryを追加し、チャネルentryをNavへ投影する。routeやlabelをNavへ再複製しない。
3. query付きrouteのactive判定（X/Instagram）が相互に同時activeにならないことをテストする。
4. `/content`のchannel labelも同じregistryから引く。物理segmentと論理channelが一対一でないSNSは別mapping関数を用意する。
5. `/content`のPageHeadと説明を「コンテンツ横断入口」として書き直す。パスや容量を主役にせず、チャネル名・ファイル数・用途を先に出す。
6. READMEのタブ一覧とナビ設計を同期する。
7. desktop幅と狭幅でnavの折りたたみ、active、スクロールを確認する。

## UIルール

- 上部チップの新設やディレクトリパスの強調をしない。
- 1チャネルの情報は1〜2行で一覧できる密度を維持する。
- 既存Tailwind v3 + shadcn互換tokenを使い、生hex・別design systemを追加しない。
- アイコン追加は必須ではない。アイコンよりラベルと階層を優先する。
- disabledな未実装routeはクリック可能に見せない。

## テスト

最低限、次を自動化する。

- channel id重複0
- href重複0（同じhrefでもqueryが違うX/Instagramは複合keyで比較）
- enabled entryのhref空欄0
- Nav内に旧`発信`文字列0
- 管理グループに`/content`がない
- コンテンツグループに`/content`が1つだけある
- XとInstagramのquery activeが排他
- content rootの物理6チャネルが表示から消えていない

## 検証

```bash
node --test tests/admin-document-store.test.mjs tests/backlog-parity.test.mjs
npx tsc --noEmit -p tools/admin-app/tsconfig.json
npm run test:e2e:admin
npm run check-information-architecture
npm run check-doc-refs
git diff --check
```

`npm run admin`を起動して、light/dark、desktop、狭幅を確認する。既存3021が動いている場合は勝手に別プロセスを重複起動せず、現在のサーバーが変更を反映しているか確認する。

## 停止条件

- registry導入にファイル移動が必要になる
- 既存Nav変更と共有worktreeで競合する
- 未実装routeへリンクしないと要件を満たせない
- content初期表示で本文全読込が発生する
- adminに書込操作を追加する必要が出る

## Phase 01専用Claude Codeプロンプト

```text
DN-0103 Phase 01だけを実装してください。

00-master.mdと01-admin-navigation-and-channel-registry.md、AGENTS.md、
tools/admin-app/AGENTS.md、tools/admin-app/README.mdを全文読んでください。

「発信」を「コンテンツ」へ変更し、pureなchannel-registry.tsを新設して、
Navと/contentのラベル・route定義をそこから引いてください。
管理グループから制作物を外し、/docsは表示名だけ「方針・設計」に変更してください。

このPhaseではcontent/brainを作らず、ファイルを移動せず、Brain専用routeも作りません。
未実装routeをクリック可能にしないでください。既存のread-only方針とtraversal guardを維持してください。

テスト、admin型検査、E2E、light/darkと狭幅の目視まで行い、結果を報告して停止してください。
次Phase、commit、push、deployへ自動で進まないでください。
```
