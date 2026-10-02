---
title: データストレージ判断 — D1 不採用と再検討トリガー
---

# データストレージ判断 — D1 不採用と再検討トリガー

複数試験追加時に「タグ・キーワード管理を Cloudflare D1（SQLite）に寄せるか」という論点に対する ADR の圧縮版。元 ADR は `.claude/knowledge/reference/data-storage-decision.md`（commit `5613b76a`）にあり、2026-04-27 に本ファイルへ集約・移管した。

## 決定（2026-04-14）

**D1 は導入しない。frontmatter 拡張 + build-time JSON インデックスで対応する。**

将来 iOS アプリのバックエンドや Web ダッシュボード実装時に、ユーザーデータ専用に D1 を導入する余地はあるが、その場合も「コンテンツ管理は MDX、ユーザーデータは D1」の棲み分けを守る。

## 根拠（要約）

- **静的サイトの優位性を捨てるコストが大きい** — TTFB、CDN エッジ完結、ローカル開発の単純さを失う
- **規模が DB 必要ラインに達していない** — MDX ファイル数 ~700（拡張後でも 2,000-3,000）、build-time のみのクエリ、認証ユーザーゼロ
- **タグ・キーワード横断は frontmatter で解決可能** — 資格タグと `topics:` で 1 つの MDX を複数試験・テーマから参照できる（当初案の `exams: []` は 2026-09-11 に廃止。語彙は [content-taxonomy.md](./content-taxonomy.md) §2・§6）
- **git を真実源として失う代償が大きい** — PR レビュー・履歴・バックアップが git で完結する利点

## frontmatter 拡張アプローチ（当初案・記録）

> 2026-09-11 の分類設計で `exams:`／`sections:` は廃止し、横断は資格タグ・`topics:` で表現することにした（[content-taxonomy.md](./content-taxonomy.md)）。以下は ADR 時点の案として残す。

試験横断キーワードは frontmatter に試験配列で表現する:

```yaml
exams:
  - pe-comprehensive-management
  - civil-construction-1
sections:
  pe-comprehensive-management: '2.1'
  civil-construction-1: '4-3'
```

カテゴリ別ページがビルド時に `exams` 配列でフィルタすれば、1 つの MDX が複数試験で再利用できる。

### 関連実装（真実源は実装ファイル）

| 項目 | ファイル |
|---|---|
| zod スキーマ | `.claude/scripts/lib/frontmatter-schema.mjs` + `src/lib/frontmatter-schema.ts` |
| タグ辞書ビルダー | `.claude/scripts/build-tag-index.mjs` → `src/config/tag-dictionary.json` |
| 試験横断キーワード | `.claude/scripts/build-cross-exam-keyword-index.mjs` → `src/config/cross-exam-keywords.json` |
| frontmatter lint | `.claude/scripts/lint-frontmatter.mjs` |
| pre-commit 検証 | `scripts/pre-commit-mdx.mjs` |
| ルール真実源 | `.claude/skills/quality/check-mdx/SKILL.md` |

frontmatter 検査ルールの追加・変更手順は `.claude/skills/quality/check-mdx/SKILL.md` を参照。

## 再検討トリガー

以下のいずれかが現実化したら本決定を再評価する:

| トリガー | 検討する DB の用途 |
|---|---|
| iOS アプリの本格開発が始まる | ユーザーデータ専用の D1 |
| MDX ファイル数が 10,000 を超える | コンテンツ DB は不要、検索のみ別系統検討 |
| `.claude/state/quality-scores.json` が 5MB を超える | Quality Cycle 専用の D1 |
| 編集者が 3 名以上になる | Decap CMS or Git ベース CMS |
| ユーザー認証機能を実装する | D1 + Workers Auth |
| 試験を 5 種類以上扱う | frontmatter 拡張で対応継続、ただし規約厳格化 |
| ビルド時間が 5 分を超える | 増分ビルド戦略を検討（DB 化は最終手段） |

## 商品の正本（2026-10-01・DN-0492）

上の決定はサイト記事（MDX）についてのもの。商品（note・ココナラ・Kindle の商品カタログ）は別に決めた。

**決定: 正本は Git 上の 1 商品 1 ファイルの JSON（`content/products/<channel>/<id>.json`）。SQLite（`npm run product:db` → `.tmp/products.db`）は検索・集計用の生成物で、正本ではない。**

- **なぜ DB を正本にしないか**: PR の差分に CI のゲート（`check-products`・収録の三軸照合）を掛けられなくなる／全セッションに Cloudflare の API トークンが要る（エージェントは資格情報を読まない方針）／worktree ごとの並行作業を PR でまとめる運用と合わない。会社 PC から R2 へは届く（ネットワークは理由ではない。D1 の API へ届くかは未確認）
- **なぜ 1 商品 1 ファイルか**: 並行セッションの衝突を減らす。書き換えは `npm run product`（型の検査・キー順・字下げ 2・LF）で行い、手で書かない
- **Windows / Mac / CI**: 判定と生成は JSON だけで完結（DB に依存しない）。SQLite は sql.js（WASM）でネイティブのビルド不要。`.gitattributes` で `content/products/**/*.json` を LF 固定
- **段階1**: 2級土木の note 商品を移し、`src/lib/note-magazines.ts` の該当エントリは正本から生成する（`// <generated:products civil-construction-2>` ブロック・読み手は変えない）。残り（導線設定・カバー設定の生成、管理画面の SQLite 読み、他資格・他チャネル、読み手の JSON 直読み）は段階2以降

**D1 へ移す条件**: 編集者が 3 名以上になる／管理画面から商品を直接書き換えたい／購入者データを扱う。生成する SQLite を D1 と同じスキーマにしてあるので、移すときはデータの移し替えだけで済む。

## 設定・記録の構成と型の正本（2026-10-02）

**決定: `config/`・`data/` の全ファイルを台帳 `scripts/lib/datasets.mjs` で宣言し、型（zod・`scripts/lib/dataset-schemas.mjs`）をそこへ結びつける。JSON Schema は zod から生成する。フォルダの移動とファイルの統合は台帳ができてから、取得元ごとに小分けで行い、統合で JSON ファイルを減らす。**

### 背景（2026-10-02 の調査）

- data/ は git 管理 846 ファイル・120 系列。最上位で分け方の軸（取得元・記録の種類・機能）が混ざり、同じ主題（X・YouTube・競合・売上・レビュー）が複数の置き場に散らばっていた。10/2 の分離後も CI は X・YouTube・Instagram の記録を `.claude/state/` に書いている（見直した結果、どれも監査結果・自動化の作業状態なので `.claude/state/` に残す。下の「フォルダの原則」）
- data/ のパスは約 185 ファイル・616 か所に直書き（`DATA_ROOT` の利用は 2）。移動後も `scheduled-publish.yml` の git add が旧パスを指し、`|| true` が失敗を隠していた（DN-0497）
- データの決まりが 6 か所に分かれていた: 領域（`domains.json`）・寿命（`prune-state-snapshots.mjs`）・不変（同じ除外リスト＋検査 2 本）・鮮度（10 本超の `check-*`）・型（管理画面の手書きの型約 40 個＋`validateRecord`）・書き手（各ワークフローの git add）
- 型の宣言は 0。JSON 108 系列のうち version 欄なし 51、欄の名前は `schemaVersion`・`version`・`schema_version` の 3 通り。形が変わっても version が変わらない例（`weekly-metrics`・`url-inspection`）、キーの snake_case と camelCase の混在があった
- 1 フォルダに複数の系列を名前の前方だけで区別して置いたことが、不具合を 2 件起こした（`gsc-page-*` が `gsc-page-query-*` を拾って突き合わせが毎週空になった・同じ系列で月次の窓が 28 日窓に黙って負けた）

### 台帳

- 1 データセット＝パス（`{ts}`・`{date}` などの型）・種類（設定・台帳・時系列・最新状態・レポート・根拠・生データ）・領域・説明・型（任意）・中身を変えないか・手元だけか。id は「取得元.データセット」で、置き場を移しても変えない
- git 管理下の全ファイルがちょうど 1 つのデータセットに当たることと、型のあるものが型に合うこと、コードが `data/` のパスを直書きせず台帳から `datasetPath`・`datasetDir` で引くことを `npm run check-datasets`（CI ゲート＋pre-commit）が止める。管理画面 管理＞設定／データ はこの台帳を並べる
- 設定・データの領域は台帳が持つ（`domains.json` の `documents` は文書だけ）。寿命表・鮮度の閾値・書き手は段階 2 以降に台帳へ寄せる

### 型の正本は zod

- 商品と記事 frontmatter が既に zod（方式を 2 つにしない）。管理画面（`allowJs`・`strict`）は zod から型を得られ、手書きの型を減らせる。JSON Schema は `z.toJSONSchema` で生成してエディタ・管理画面・Codex に渡す
- JSON Schema ファイルを正本にする案も検証した（`z.fromJSONSchema` で pattern・enum・余分なキー・日時形式・`$ref` の検査が効き、依存も増えない）が、TypeScript の型が作れないので採らない
- 書き方の約束: version 欄は `schemaVersion`（整数）1 本、キーは camelCase、日時は UTC の ISO 8601（末尾 Z）、日付だけの値は JST の YYYY-MM-DD と型に書く、意味と単位は `.describe()` に書く、人と CI が書き足す記録は `.strict()`。既存の欄の名前は移すときに揃え、それまでは型に今の名前を書く

### フォルダの原則（移動は段階 3）

```
data/<取得元>/<データセット>/   外部から取った記録（ga4・gsc・note・coconala・x・youtube・kdp・a8 …）
data/business/<データセット>/   自社で発生した記録（KPI 台帳・レビュー・実験・週次/月次）
data/analysis/<データセット>/   記録から計算した結果・文書が引く調査
```

- 取得元を軸にする: 書き手（取得スクリプト）が取得元ごとに 1 つで、データは複数の領域から使われるため。領域は台帳が持つ
- 1 データセット＝1 フォルダ（または 1 ファイル）。時系列はファイル名を時刻だけにし、種類は名前で表す（時系列は `<時刻>.json`、最新状態は `latest.json`、追記の台帳は `.jsonl`）
- 人が読む md は `analysis/` だけ、手書きのメモは `docs/`。手元だけの生データは `<取得元>/ui/` で git 管理外
- `.claude/state/` に残る外部サービスの記録（X の公開照合 `x-posted-live`・YouTube の公開検証 `yt-verify` と投稿キュー `youtube-schedule.json`・Instagram の照合 `ig-reconcile`・Cloudflare の設定ドリフト）は、見直した結果、監査結果と自動化の作業状態なので `.claude/state/` に残す（2026-10-02）
- config/ に紛れた計画・作業記録（`x-campaigns`・`x-review`・`r2-delete-list.txt`・`coconala-thumb-approved`・`past-exam-inventory`）の置き場は段階 4 で見直す

### 統合の基準（JSON ファイルを減らす）

統合するもの:

- 同じ書き手が同じ実行で書くもの → 1 回の実行を 1 ファイルに
- 同じものの写し（最新ファイルと履歴の最新、同じ内容の json と md）→ 写しを消す
- 読み手のいない一回きりの出力 → 消す（文書が根拠として引く調査は `analysis/` に残す）
- 書き手が 1 つだけで増え続ける 1 件 1 ファイル → 月ごとの追記ファイル（`.jsonl`）
- config/ の同じ主題の小さな設定で、一緒に変えるもの → 1 ファイル

統合しないもの:

- 書き手か書く時期が違うもの（CI と手元・別のワークフロー）。1 ファイルにすると並行セッションと CI の衝突が増える（商品を 1 商品 1 ファイルにしたのと同じ理由）
- 書き手が複数の中身を変えない台帳（`data/business/records`。CI の週次取得と手元のレビューが書く）
- 読み手の多い正本（`qualification-registry`・`exam-*`）と、更新の多い設定（`coconala-listings`・`asset-storage`・`workflow-health` など）

| 対象 | 今 | 統合後 | 条件・注意 |
|---|---|---|---|
| rank-watch | 216（毎日約 11 増・年約 4,000） | 月 1 本の `.jsonl` | 書き手は CI だけ。不変の検査を「既存の行が変わらない」に変える |
| GA4 の週次取得 | 284（17 系列が 1 フォルダ・23 回分） | 1 回の取得＝1 ファイル（約 23） | 約 20 回の取得コマンドを 1 ファイルへ書き足す形にする。business 台帳と `seo-watchwords` が名前で引く分（`cta-clicks-by-label`・`gsc-page-query`）は読み替えを用意する |
| GSC の週次取得 | 95（25 回分） | 同上（約 25） | 水曜の 1000 行打ち切り版は別の実行として残る |
| GSC の URL 一覧（`gsc-ui/ssot/urls`） | 11 | 1 | 同じ実行で書かれる |
| 履歴の最新の写し（競合 5・X の自分の投稿） | 6 | 0 | 履歴の最新とバイト単位で同じ。読み手を履歴の最新に |
| 読み手の無い md・一回きりの出力 | 7 | 0 | md は同じ内容の JSON がある。手書きのメモは `docs/` へ |
| config/ の小さな設定（競合リスト 5・動画/YouTube 4・note カバー 3・OGP 3・PSI 2 など） | 約 25 | 約 8 | 一緒に変える単位でまとめる |

git 管理の data/ は 846 → 約 280 ファイル（約 7 割減）、年間の増加は数千 → 数百になる見込み。

### 進め方

1. 台帳と検査を入れ、`domains.json` の config/・data/ の割り当てと管理画面の推定を台帳へ寄せる（ファイルは動かさない）。**2026-10-02 済み**
2. 型を書く: 売上（note・KDP は済み。ココナラ受注・A8）→ business 台帳（`validateRecord` は業務ルールとして残す）→ `experiments`・`weekly-metrics`。読み書きを台帳経由の関数にし、パスの直書きを減らす。ワークフローは書き戻しを `npm run ci-data`（`scripts/ci-data.mjs`。変わったファイルを git status から拾って退避・復元し、実在するパスだけを add）で行い、YAML にデータのパスを書かない。最新ファイルの場所も `ci-data latest <id>` で引く（2026-10-02 済み。DN-0497 の旧パスもここで解消）
3. 取得元ごとに 1 PR で移動・統合する。ワークフローは develop を checkout して develop のスクリプトで書き、YAML は置き場の根と台帳の id だけを渡すので（段階 1）、移動に合わせて main の YAML を変えなくてよい（id を消すときは `RETIRED_IDS` に後継を書く）。中身を変えない台帳は中身を書き換えず `MOVED_PATHS`・`RESTRUCTURED_PATHS`（`resolveMovedPath` が 2 段の移動もたどる）で読み替える。business 台帳の `sources[].sha256` は「その時点の版」の記録で、あとから照合し直さない（書式を揃えても壊れない）。**2026-10-02 済み**（#823 競合・市場／#825 note・KDP・ココナラ／#827 SNS・アフィリエイト・サイト計測・寿命を台帳の `retain` へ／#828 GSC・GA4 の一括でない取得・画面取得の URL 一覧 11→1／#831 GA4・GSC の週次取得を日ごとに 1 ファイル（377→40・読み書きは `scripts/lib/metric-reports.mjs`）／rank-watch を月ごとの追記 jsonl・事業の台帳を `data/business/records/`（ファイル名を保つ）・分析を `data/analysis/`）。git 管理の data/ は 846 → 364。`data/metrics/` は無くなった。決めたこと: 寿命は台帳の各データセットの `retain` が正本（`prune-state-snapshots` は台帳を読むだけ・`--family` の名前はワークフローとの契約）／GA4・GSC は種類 id（`ga4.page` など）で引き、参照は「ファイル#種類」／追記だけの台帳（`*.jsonl`）は `.gitattributes` で LF に固定し、不変の検査は「HEAD の中身が前方に残る」で見る
4. config/ も同じ台帳で型を持つ。優先は読み手が多い `qualification-registry`（32 ファイル）・`domains`（24）・`product-lineup`（14）と、更新の多い `coconala-listings`。資格 id の照合のようなファイル間の整合は既存の `check-*` に残す

## 参考リンク

- Cloudflare D1: https://developers.cloudflare.com/d1/
- Decap CMS（Git ベース CMS）: https://decapcms.org/
- Astro Content Collections（frontmatter スキーマ運用の参考）: https://docs.astro.build/en/guides/content-collections/

## 改訂履歴

- 2026-04-14: 元 ADR `.claude/knowledge/reference/data-storage-decision.md` 初版（commit `5613b76a`）。複数試験対応の議論を経て D1 不採用を決定
- 2026-04-27: ADR を圧縮し本ファイルへ移管。元ファイル削除。詳細経緯は git history 参照
- 2026-10-02: 「設定・記録の構成と型の正本」を追加（台帳 `datasets.mjs`・型の正本 zod・フォルダの原則・統合の基準）
