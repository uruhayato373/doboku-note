---
version: 1.0.0
updated: 2026-10-19
owner: uruhayato373
title: ローカルデータの方針（手元にしか無い正本をなくす）
summary: git の外に置いてよいのは再生成・退避済み・端末固有・資格情報・作業中の5区分だけ。各リポが local-data.json で申告し、check-local-data が申告外を止める。
type: reference
# GENERATED FROM: memos/ローカルデータ方針SSOT.md (obsidian). DO NOT EDIT.
---

# ローカルデータの方針 — 手元にしか無い正本をなくす

**正本はこの文書**（Obsidian vault `memos/ローカルデータ方針SSOT.md`）。obsidian / doboku-note / stats47 が共有する。**編集はこのファイルだけで行い**、`npm run policy:sync` で各プロジェクトの `.claude/shared-policy/LOCAL-DATA.md` へ配布する。検査スクリプト `check-local-data.mjs` も同じ経路で配る。配布された写しは直接編集しない。

## 1. 原則

**手元のディスクにしか無い正本をゼロにする。** PC が壊れても、別の PC で作業を始めても、失うものが無い状態にする。git に入らないファイルは、次の5区分のどれかとして**各リポが申告**したものだけを許す。どこにも当てはまらないものは、置き場が決まっていない＝消えたら戻らないものとして扱う。

| 区分 | 意味 | 消してよいか | 例 |
|---|---|---|---|
| `regenerable` | 正本から再生成・再取得できる | よい | `node_modules`・ビルド出力・索引・R2 から取り出した作業コピー |
| `offloaded` | 正本は R2 / Google Drive にあり、台帳で照合されている | 台帳の検査が通っていれば | doboku-note の `content/**` の退避済みアセット |
| `device` | その端末の状態。正本は要らない | 困るが、作り直せる | ブラウザのログインプロファイル・エディタの画面配置・`settings.local.json` |
| `secret` | 資格情報。どこにも同期しない | — | `credentials/`・`.env.local`・`.claude/secrets/` |
| `staging` | 作業中・受け渡し待ち。**日数の上限つき** | 上限を過ぎたら、置き場へ移すか消す | `.tmp/`・vault の `inbox/`・`.claude/inbox/`（未消化の会話記録） |

外部サイトから取ってきたもの（カード明細のスクショ・GA4 / Search Console の取得結果など）は、**取得元に保存期限がある**ので `regenerable` にしない。証憑として残すものは Drive に置き、それ以外は `staging` として期限を付ける。

## 2. 置き場の決め方（誰が使うか）

doboku-note が 2026-09-05 に決めた「置き場は誰が使うかで決める」を3リポ共通にする（元は doboku-note の `asset-storage-policy.md` §1）。

| 誰が使うか | 置き場 |
|---|---|
| テキストの正本（原稿・設定・台帳・記録） | git |
| サイトが配信する | public R2 |
| GitHub Actions が読み書きする | private R2（または git） |
| 人か手元のスクリプトだけが使う | Google Drive |

- **作業の出力はまず `staging` に出し、採用したら置き場へ移してから使う。** 採用した画像・成果物を `.tmp/` に置いたまま次へ進まない
- 置き場へ移したら、**読み戻して中身が一致したことを確かめてから**手元を消す（Drive・R2 とも）

## 3. 申告と検査

各リポは `.claude/shared-policy/local-data.json` を持つ（配布対象外・そのリポが所有して手で直す）。git の外にあるパスを区分ごとに glob で書く。

```json
{
  "regenerable": ["node_modules/", ".next/"],
  "offloaded": [{ "path": "content/**", "ledger": "npm run check-asset-storage" }],
  "device": [".local/playwright-*/"],
  "secret": ["credentials/"],
  "staging": [{ "path": ".tmp/", "maxAgeDays": 14 }]
}
```

`node .claude/shared-policy/check-local-data.mjs`（各リポの `npm run check-local-data`）が、`git ls-files --others --ignored` の全件を申告と突き合わせる。

- **申告に無いパス → 失敗**（置き場が決まっていない手元データ）
- `staging` で上限日数を過ぎたファイル → 警告（件数と古い順の例）
- `offloaded` は台帳の検査コマンドを表示するだけ。照合そのものは各リポの検査が持つ（doboku-note は `check-asset-storage`・`check-drive-vault`）
- CI では git の外のファイルが無いので、実質は手元の PC でだけ意味がある。各リポの手元の定期点検（週次レビュー・SessionStart 等）から呼ぶ

## 4. 2026-10-19 の棚卸しで分かったこと

> [!info] 観測日つきの記録
> 以下は 2026-10-19 に会社 PC（Windows）で測った値。現状は `npm run check-local-data` で確かめる。

- **obsidian**: `.local/` 863MB（ブラウザのプロファイル約 760MB と、カード・note・YAMAP の取得結果）・`.smart-env/` 211MB（Smart Connections の索引）・`.claude/inbox/` 64件（未消化13日分）・`inbox/` に業務ファイル2件
- **doboku-note**: `.tmp/` 1.2GB・約2,800件。`kindle-pop` 430MB など採用済みかもしれない成果物と、使い捨てのスクショ・ログが同じ場所に混ざっている（方針では `.tmp/scratch/` だけが使い捨て）。`content/**` 819MB は退避済みアセットで台帳がある。`data/{ga4,gsc,a8}` は外部の取得結果
- **stats47**: `.local/` 1.5GB（Kindle 表紙の生成物 460MB・note の参照図・ブラウザのプロファイル）。`docs/31_note記事原稿/` は R2 が正本の作業コピーで、出し入れのコマンドがある
- 各リポにすでにある仕組み: obsidian は原資料を Drive へ移し `check-binaries` で git への混入を止めている。doboku-note は `asset-storage-policy.md`・`local-resource-policy.md`・`disk-hygiene` で退避・容量・掃除まで持つ。stats47 は `data-storage.md`・`r2-storage-design.md` でデータの正本を R2 に置いている。**この SSOT はそれらを置き換えない**——3リポで共通の「申告に無いものを残さない」だけを足す
