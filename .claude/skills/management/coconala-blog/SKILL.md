---
name: coconala-blog
description: ココナラブログ（記事型）の企画・執筆・採点・公開を一気通貫で回す。ココナラ内の検索/回遊から自出品（S1診断・S2添削・S3作成・C系PDF）へ送客する記事を、外部リンクゼロ・カニバリ境界内で作り、下書き保存→ライブ実査まで検証する。coconala-blog-writer で書き coconala-blog-qa で採点し、scripts/coconala-blog-publish.mjs（draft-first・実公開は --commit gate）で投入。競合偵察は npm run scout-coconala-blogs。出品そのものを作る /coconala-publish、受注を回す /coconala-order とは対象が異なる。Use when user asks to [ココナラブログを書く, ココナラブログを公開, ココナラのブログ記事, ブログで送客, /coconala-blog].
user-invocable: true
---

# /coconala-blog — ココナラブログの企画〜公開

ココナラブログを**ココナラ内の第4面**として運用する。真実源は
[coconala-blog-policy.md](../../../knowledge/reference/coconala-blog-policy.md)、
プラットフォーム仕様は [coconala-operations.md §9](../../../knowledge/reference/coconala-operations.md)。
このファイルには手順だけを書く（ルールを写経しない）。

## 前提（最重要）

- **実行はローカルのみ**（ココナラログイン済みプロファイル `.local/playwright-coconala-profile` があるマシン）
- **収益アカウント**。`assertAccount`（sellerName=dobokunote）を全操作の前に通す
- **外部リンクは書けない**。note・doboku-note の URL も名前も本文に出さない（アカウント制限リスク）
- 送客は**サービスカード**で行う（本文に `service:<serviceId>` の単独行 → publish が URL へ展開）

## 引数

| 引数 | 例 | 説明 |
|---|---|---|
| `slug` | `ochiru-keiken-kijutsu-3-pattern` | 記事ディレクトリ名 |
| `exam` | `civil-1` / `civil-2` / `civil` / `pe-sokan` | 対象資格（土木中心・総監は少数） |
| `angle` | `体験` / `理由` / `ハウツー` / `数字` | 切り口（policy §3） |
| `funnel` | `coconala-shindan` | 送客先 serviceId（**listed のみ**） |

## フロー

### 1. 選題（policy §3 の資産マップ）

`.claude/state/coconala/blog-competitors.json` を読み、競合が書いていない／自分に一次資産がある論点を選ぶ。
古ければ `npm run scout-coconala-blogs`（四半期でよい）。

### 2. 執筆 — `coconala-blog-writer`

`slug` / `exam` / `angle` / `funnel` / `source` を渡す。source は**素材**であって原稿ではない
（note 記事を渡す場合は `stripNoteFunnel` した本文を渡す）。

### 3. 採点 — `coconala-blog-qa`

平均 2.0 以上かつハードゲート全通過で合格。**不合格なら writer へ1回だけ差し戻す**。
2回目も落ちたら選題か素材の問題なので、親が判断して止める。

### 4. 下書き投入（既定・公開しない）

```bash
node scripts/coconala-blog-publish.mjs --post <slug>
```

このコマンドは以下を**実測**する。どれか一つでも欠ければ中断する。

- 本文の反映が元テキストの 90% 以上（途中で切れていない）
- サービスカードが期待枚数ぶん生成されている
- 一覧（`.c-blogContent`）にタイトルが実在する

> 「クリックが成功した」を成功と呼ばない。**逆に、クリックがタイムアウトしても保存されていることがある**
> （operations.md §9.4）。必ず一覧の実体で判定する。

### 5. 目視 → 公開

スクリーンショット（`.tmp/coconala/blog-*.png`）と本文をユーザーに提示し、**公開の可否を確認してから**:

```bash
node scripts/coconala-blog-publish.mjs --post <slug> --commit
```

公開後、スクリプトが自動で:
1. 一覧の状態が「下書き」でないことを確認（下書きのままなら exit 2・「公開した」と報告しない）
2. ライブ URL を取得し、**ログアウト状態の新規コンテキスト**でタイトル・本文・外部リンク0を DOM 実査（G6）
3. 検証を通ったときだけ frontmatter へ `blogUrl` / `blogId` / `status: published` / `publishedAt` を書き戻す

### 6. 記録

```bash
npm run check-coconala-blog       # ドリフト0を確認
```

`docs/coconala-blog/{slug}/article.md` を commit する（`git add` は変更ファイルのみ明示）。

## ガードレール

1. **公開は1日1本まで**（policy §6・bot 検知回避）。初回は1本公開して 24〜48 時間観察してから続ける
2. **draft-first**。`--commit` は目視確認の後だけ
3. **捏造しない**。経験していない工事・数値・実績を書かない。権威表現は「発注者＝審査する側」（採点者ではない）
4. **価格を本文に書かない**（カードがライブ価格を描画する）
5. **カニバリ境界**（policy §2）を越えない。note 無料記事より深く書かない
6. UI が変わって selector が効かないときは、**盲目的に新しい selector を作らず** probe（read-only）してから直し、
   結果を operations.md §9.4 に追記する

## 完了条件

- `coconala-blog-qa` が PASS（平均 2.0 以上・ハードゲート全通過）
- `--commit` 実行が exit 0（＝一覧で公開状態・ライブ実査で外部リンク0）
- frontmatter に `blogUrl` と `publishedAt` が入っている
- `npm run check-coconala-blog` が exit 0

## 参照

- 真実源: [coconala-blog-policy.md](../../../knowledge/reference/coconala-blog-policy.md)
- プラットフォーム仕様・セレクタ: [coconala-operations.md §9](../../../knowledge/reference/coconala-operations.md)
- エージェント: `coconala-blog-writer`（Generator）/ `coconala-blog-qa`（Evaluator）
- 隣接スキル: `/coconala-publish`（出品の作成・修正）・`/coconala-order`（受注）・`/coconala-status`（KPI）
