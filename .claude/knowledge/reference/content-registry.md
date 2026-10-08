---
title: コンテンツ台帳（content/registry）— 全チャネルの公開を ID で管理する正本
---

# コンテンツ台帳（content/registry）

2026-10-09 に運営者が決めた、YouTube・Shorts・Instagram・X（今後の Threads・TikTok を含む）の**公開の事実の正本**。
公開済みも含めて 1 件の投稿を 1 つの ID で引き、その ID から台本・状態・承認・外部 ID・素材・観測値・確認画面までたどれるようにする。
段階の進め方はバックログの P1〜P7（DN-0614・DN-0608〜DN-0613）。

## 決定事項

| 項目 | 決定 |
|---|---|
| 正本の置き場 | 公開の事実（ID・状態・予定・外部 ID・承認・素材の参照）は `content/registry/`。作品の中身（台本・文面・デザインの指定）は今の作品フォルダ（`content/sns/**`）に残し、台帳はパスで指すだけ。観測（再生数・一覧・反応）は `data/` に残して状態は持たせない |
| DB | DB サーバーは置かない。型つき JSON（zod・`scripts/lib/datasets.mjs` の台帳に登録）が正本で、SQLite・JSON の索引は作り直せる生成物（`config/products.json` と同じ形・data-storage-decision.md） |
| 分け方 | チャネル×資格ごとの JSON。CI の照合と手元の承認が書くので全件 1 ファイルにはせず、作品ごと（約 1,000 ファイル）は管理画面が遅くなるので避ける |
| 承認 | 管理画面で目視し、CLI で承認する（見た版の digest 入りのコマンドをコピーして実行）。管理画面は読むだけ |
| 公開前の動画 ID | 公開リポジトリの台帳に置いてよい（運営者の判断）。移行中の旧→新の対応表は今どおり非公開 R2 の delivery-state だけ |
| 古い投稿 | 全件を取り込む。公開の証拠があるものだけ `published`、無いものは理由つきの `stopped`。古いフォルダ名は変えず ID だけ付ける |
| 素材 | Drive の `制作物/コンテンツ/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}`（手元は `.tmp/media/` の同じ相対パス）。一度置いたら書き換えない。描き直すと名前が変わる |
| Codex 画像 | 動画ごとに使うかを決める。どの役割の素材にも使えるが、使ったら来歴（モデル・指示文・ハッシュ）と `ai-image-fidelity-auditor` の判定 ok を必須にする。文字入りなら文字の誤りも監査する。Gemini は使わない |

## 3 つの表

```text
content/registry/
  works/{exam}.json                   作品（Work）
  publications/{channel}/{exam}.json  公開（Publication）: 1 チャネル 1 投稿
  media/{exam}.json  media/brand.json 素材（Media）
config/content-registry.json          チャネル×形式・アカウント・ID 規則・状態の語彙と遷移・切り替え済みのチャネル
```

| 表 | 1 行 | 持つもの | 持たないもの |
|---|---|---|---|
| Work | 1 つの主題の制作単位（動画パック・IG テーマパック・X の下書きの束・旧 Shorts の 1 問） | `id`・`kind`・`definition`（作品フォルダ）・`qa`・`theme` | 台本・文面 |
| Publication | 1 チャネル・1 アカウントへの 1 投稿 | `id`・`work`・`account`・`format`・`copy`（`file#key`）・`status`・`publishAt`・`approval`・`review.visual`・`platform`（外部 ID・公開範囲・証拠）・`media`（役割→素材 ID）・`sync`・`campaigns` | 文面そのもの・再生数 |
| Media | 採用した、または公開に使うバイナリ 1 つ | `id`・`role`・`type`・`sha256`・寸法・`store`（tier と path）・`provenance`（render・codex・photo）・`review` | 途中の生成物（場面ごとの wav・`slide-NN.mp4`・`work/`） |

作品の状態は持たない（その作品の公開から導く）。

## ID 規則

| ID | 形 | 例 |
|---|---|---|
| exam | `qualification-registry.json` の資格 id か group id | `civil-construction-2` |
| Work | `[a-z][a-z0-9-]{2,59}`。全チャネルで一意（`utm_campaign` と同じ値） | `matome-2kyu-chokuzen` |
| Publication | `{exam}/{work}/{channel}.{format}[.{variant}]` | `civil-construction-2/matome-2kyu-chokuzen/youtube.longform` |
| Media | `{pubId}/{role}`・作品で共有は `{exam}/{work}/work/{role}`・ブランド共通は `brand/{design}/{role}`（置き場は `_brand/{design}/{role}.{sha8}.{ext}`） | `civil-construction-2/matome-2kyu-chokuzen/youtube.longform/cover` |

- channel.format の語彙は `config/content-registry.json`（youtube＝longform・short、instagram＝carousel・reel・story・highlight、x＝post・thread・article、threads＝post、tiktok＝video）。
- 新しく作る ID では、日付（`\d{8}`・`20\d{2}`・`\d{4}-\d{2}`）・先頭の `NNN-`・`pack-NN`・末尾の連番を使わない。中身を表す数字（`r03`・`7items`）は単語にくっつけてよい。
- 予約（`scheduled`）以上になった ID は変えない。改名は新しい行を作り、古い行に `renamedTo` を書く。消した ID は再利用しない。
- 規則に合わない既存の ID は `idException: imported-before-cutover` を付けて残す。件数は `config/content-registry.json` の上限でラチェットにする。

## 状態

`config/content-registry.json` の `status` が全チャネル共通の語彙。

| status | 誰が動かすか | 必須の欄（**太字**は P1 で検査済み。他は P2 で強制） |
|---|---|---|
| `draft` | 作り手 | — |
| `qa_blocked`・`qa_passed` | QA | `qa`（作品側） |
| `approved` | **運営者だけ**（CLI） | **`approval.by='user'`**（approved 以降すべて）・`approval.contentSha256` |
| `rendered` | 描画スクリプト | 役割の素材がそろっている |
| `uploaded_private` | 投稿スクリプト | `platform.id` |
| `scheduled` | 投稿スクリプト | **`publishAt`**・`platform.id` |
| `published` | **CI の照合**（観測の証拠）か、即時投稿のライブ確認、今の台帳からの取り込み（`import`・証拠つき） | **`platform.id`**・`platform.publishedAt`・**`platform.evidence`** |
| `failed` | 投稿スクリプト | `error` |
| `refresh_due` | 運営者・エージェント | `reason` |
| `stopped` | 運営者だけ | **`stopReason`**（`user-decision`・`superseded`・`gone`・`unverified-legacy`） |

- `measured` は保存しない（計測があるかは `data/` から導く）。
- 照合の書き込みは前進（`scheduled→published`）だけ。後戻り・結び付かない公開・重複は `.claude/state/registry-reconcile/` に所見として出し、人が決める。資格情報が無いときは記録を書かずに exit 2。
- 期日を過ぎても公開にならない予約は `check-registry-due`（ops）が出す。

## 承認（2 段階）

ハッシュは `scripts/lib/content-registry.mjs` の `approvalHash()` だけが計算する（CLI・検査・管理画面が同じ関数を使う）。

- `review.visual.digest`: 画面確認（音声なし）の素材（表紙・締め・場面・コンタクトシート）の `role:sha256` を並べたもの。
- `approval.contentSha256`（最終）: 完成版の素材の `role:sha256` に、アカウント・形式・`publishAt`・解決した文面（題名・概要欄・タグ／キャプション／本文）を足したもの。
- どれかが変わると承認は無効になる。未公開なら検査と stage が止め、公開済みなら「要同期」として出す（概要欄の表記漏れなどを機械で見つけるため）。
- 過去の承認は `grandfathered: true`（ハッシュ無し）で取り込む。

## 素材の置き場

- 手元 `.tmp/media/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}` → Drive `制作物/コンテンツ/` の同じ相対パス（drive-vault の group `content-media`・`immutable`）。ブランド共通は `.tmp/media/_brand/{design}/{role}.{sha8}.{ext}`。
- `{sha8}` は中身の sha256 の先頭 8 桁。同じ名前で中身が違うことは起こらない（描き直すと別名になる）。immutable の group では上書きと `--force` を拒否する。
- 描画の作業場 `.tmp/video-render/{packId}/` は使い捨て。成果物だけを `npm run media -- promote` で取り込む。
- パスの組み立てと分解は `scripts/lib/media-paths.mjs` だけが行う。
- CI が読む YouTube の転送用は private R2 の sha 名（`youtube-staging/{sha256}.mp4`・P2 から）。

## 検査

`npm run check-content-registry`（`ci: true`）。切り替え前のチャネル（`config/content-registry.json` の `cutover` に無いもの）は、台帳に無い動画パックを INFO、件数の不一致を WARN に留める。

| id | 検査 |
|---|---|
| R01 | 件数（台帳全体が 0 件、または切り替え済みのチャネルが 0 件なら FAIL。型は check-datasets） |
| R02 | ID の一意と形・禁止の語・`idException` の上限 |
| R03 | 予約以上の行の削除・改名（`--base <ref>` と比べる） |
| R04 | 参照（公開→作品・作品の定義フォルダ・素材→公開・文面の鍵）と孤児 |
| R05 | `video-pack.json` の `outputs` と公開の数の一致 |
| R06 | 素材の sha と Drive 台帳（`drive-manifest.json`）の一致・置き場の名前の sha8 |
| R07 | 状態の必須欄（下の状態表の「P1 で強制」）・承認ハッシュ。遷移（`transitions`・`setBy`）の検査は approve・stop の CLI と一緒に P2 で足す |
| R08 | 外部 ID の重複・Shorts の関連動画 |
| R09 | 切り替え前のチャネルで、台帳の行が今の台帳（`video-content-status.json`・`youtube.json`）と一致 |
| R10 | AI 生成の素材は AI 台帳（鍵 `media:<id>`）の判定 ok がある |

## コマンド

```bash
npm run registry -- list --channel youtube --exam civil-construction-2
npm run registry -- show civil-construction-2/matome-2kyu-chokuzen/youtube.longform
npm run registry -- import-video-pack --pack-dir content/sns/video-packs/civil-construction-2/matome-2kyu-chokuzen
npm run registry -- index
npm run check-content-registry
npm run media -- promote --pub civil-construction-2/matome-2kyu-chokuzen/youtube.longform
npm run media -- sync --work civil-construction-2/matome-2kyu-chokuzen
npm run media -- verify --work civil-construction-2/matome-2kyu-chokuzen   # 台帳・vault・クラウドの 3 者照合
npm run media -- pull --work civil-construction-2/matome-2kyu-chokuzen
```

`import-video-pack`・`promote` は既定で dry-run（`--commit` で書く）。
