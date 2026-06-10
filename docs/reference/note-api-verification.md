# note 公開状態の照合（note-magazines.ts ↔ note 現実）

note.com の公開マガジン一覧・各マガジンの収録記事を **public API から取得**し、`src/lib/note-magazines.ts`（SoT）と突合してズレを検出する運用手順。`npm run verify-note-magazines` の真実源。

## なぜ必要か（動機となった事故）

ドキュメントと note 現実が乖離していた。例: `essay-complete-pack`（完全パック ¥7,980）は M13・note-magazines.ts・決定文書すべてで「**6本（型＋設問3＋R8＋模範論文3ペルソナ）**」と記載されていたが、note 現実は **53 記事収録（5ペルソナ＋横断全部＋R8）**。SoT/ドキュメントが現実から大きくドリフトしており、戦略判断が誤った前提に乗っていた（2026-06-10 発覚）。SoT↔現実の照合を機械化し、再発を防ぐ。

## 環境の罠：会社 PC プロキシ + TLS 失効チェック

- 会社 PC は外部通信がプロキシ経由（`HTTP(S)_PROXY=http://…:3128`）。`google.com` 系のみ `NO_PROXY`。
- `curl` 既定（schannel）は **失効確認エラーで HTTP 000 失敗**（`CRYPT_E_NO_REVOCATION_CHECK`）。プロキシの TLS 介入が原因。
- **回避策: `curl --ssl-no-revoke`**。これで note.com は HTTP 200 で到達できる（プロキシ自体は note.com を遮断していない）。
- 注意: これは「ローカルで計測 API を叩く」ことの禁止（[measurement-incidents.md](measurement-incidents.md)）とは別。note の**公開**ページ/API を照合に読むだけで、認証も creds も不要。

## note 公開 API（認証不要）

| 用途 | エンドポイント |
|---|---|
| creator のマガジン一覧 | `https://note.com/api/v2/creators/{name}/contents?kind=magazine&page=N` |
| マガジンの収録記事 | `https://note.com/api/v1/magazines/{key}/notes?page=N` |

- `{name}` = `dobokunote`、`{key}` = `m...`（マガジン URL の末尾）。
- 一覧は `data.contents[]`（`key`/`id`/`name`/`price`）、`data.isLastPage` でページ送り終了。
- 収録記事は `data.notes[]`（`key`/`name`/`price`）。
- note は Nuxt 製のため HTML に `__NEXT_DATA__` は無い。HTML スクレイプより上記 JSON API が堅牢。

## 使い方

```bash
npm run verify-note-magazines              # 一覧取得 ＋ SoT 突合（高速）
npm run verify-note-magazines -- --contents   # 各マガジンの収録記事も取得
npm run verify-note-magazines -- --json       # スナップショットを JSON 保存
```

- スクリプト: `scripts/verify-note-magazines.mjs`。内部で `curl --ssl-no-revoke` を spawn（プロキシ env を自動利用）。
- `--json` 出力先: `.claude/state/note/magazines-snapshot.json`（machine データ。コミット任意、毎回再生成可）。

### 検出するズレ

- **未配線**: note 公開済だが SoT に noteUrl 配線なし（新規公開の取り込み漏れ）
- **非公開化?**: SoT の noteUrl が note 一覧に無い（404/非公開化の疑い）
- **要修正**: SoT `published:true` だが noteUrl 空
- **価格ドリフト**: SoT 価格 ≠ note 価格（例: 値上げを SoT 先行・note 未反映）
- **空マガジン**: `--contents` で収録 0 件のマガジンが見える（公開したが記事未登録）

終了コード: ズレ無し=0 / 取得失敗=1 / ズレあり=2。

## Playwright フォールバック

`@playwright/test` 1.59.1 が導入済み。public API が壊れた場合や、ログインが要る情報（販売ダッシュボード等）を見る場合は Playwright を使う。ただし公開マガジン照合は API の方が安定・高速なので、通常は API を使う。Playwright を使う場合も `ignoreHTTPSErrors: true` ＋ プロキシ設定が必要。

## 既知の状態（2026-06-10 時点）

- 公開マガジン 19 件（総監12・建設部門2・1/2級土木5）。SoT noteUrl 配線は一致。
- **完全パック（m171222175fac）= 53 記事**（ドキュメント記載「6本」と乖離。決定文書 §1・§2・§4 の前提修正が必要）。
- R8予想問題集（m6854c7437d4d）= note 現価 **¥2,480**（SoT は ¥3,480 に先行変更済 → note.com 側の値上げが未反映）。
- 建設部門 道路 選択科目（m9e825cfd8348）= 収録 0 件（公開済だが記事未登録）。
