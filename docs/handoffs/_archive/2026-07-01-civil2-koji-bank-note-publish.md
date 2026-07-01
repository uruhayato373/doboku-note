# ハンドオフ｜2級土木 想定工事バンク note公開（36工種フル・別PC・browser-use）

- 作成: 2026-07-01（36工種フル完成に伴い更新）
- 状態: **公開準備完了・note公開待ち**（マガジンは作成済み、**36記事＋無料索引**の公開＋収録が残）
- 実行環境: **別PC（note ログイン済みプロファイルのあるマシン）で browser-use/Playwright**
- 関連SSOT: [note-magazines.ts](../../src/lib/note-magazines.ts) / [2級版-想定工事バンク展開設計.md](../note/1級・2級土木/2級土木/2級版-想定工事バンク展開設計.md) / [project_civil2_keiken_essay_line メモリ]

## 1. 目的

develop に用意済みの **2級土木 想定工事バンク 全36記事＋無料索引（00）**を note.com/dobokunote で公開し、公開済みマガジンに収録する。

- **マガジン（作成済・公開済）**: `https://note.com/dobokunote/m/m8554e87ca6ec`
- **セット価格**: ¥5,480（36工種フル・`note-magazines.ts` の `civil-2-koji-bank` が真実源） ／ **各記事 単品**: ¥980 ／ **索引 `00-想定工事索引`**: 無料（notePricing:free）
- 原稿・素材の場所: `docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/工事NN-*/`
  - 各工事dir に `article.md` ＋ `img/cover.png` ＋ `hashtags.txt` の3点セット完備
  - マガジン見出し画像: 同マガジンdir直下 `_cover.png`（アップロード済みなら不要）

## 2. 前提（別PCでの準備）

1. リポジトリを **develop** に更新（`git pull` / 最新は 3点セット・CTA・UTM 全て反映済み）。最新コミット目安: 冒頭CTA＋UTM反映（`b7b219de0` 以降）。
2. note.com/dobokunote に**ログイン済みのブラウザプロファイル**があること。
   - browser-use 経路（Mac 推奨）: Chrome プロファイルにログイン ＋ 環境変数 `NOTE_PROFILE` を設定（`Profile 5` は stats47 用なので使わない）。
   - Playwright 経路（Windows も可）: `.local/playwright-note-profile`（永続・初回のみ手動ログイン）。
3. **投稿先アカウント照合ゲート**（誤爆防止）: `note.com/dobokunote` 固定。ツールが account 照合を必ず通す。真実源 [note-api-verification.md](../reference/note-api-verification.md)。

## 3. 各記事の公開設定（有料36本共通・重要／索引00は無料）

frontmatter が公開挙動を駆動するので、基本は自動。手動確認ポイント:

| 項目 | 値 |
|---|---|
| 有料/無料 | `notePricing: paid`（有料） |
| 単品価格 | `price: 980`（¥980） |
| **有料ライン** | frontmatter `paidBoundary: 品質管理` ＝ **「## 品質管理」見出しの直前**が有料境界。導入＋冒頭CTA＋「想定工事の概要」までが無料プレビュー、5管理の完成答案以降が有料 |
| 見出し画像 | 各dir `img/cover.png` |
| ハッシュタグ | 各dir `hashtags.txt`（55個・#付き・1行1個） |
| 冒頭CTA | 本文内に既に記載済み（マガジンURL単独行=リンクカード）。追加作業不要 |
| 収録先 | マガジン `m8554e87ca6ec` に追加 |

> [!warning] 有料境界の確認
> `paidBoundary: 品質管理` が効いているか（無料部分が「想定工事の概要」まで、有料が「主：必出の3管理」以降）を1本目で必ず目視。境界が検出できないと publish が中断する（boundaryBeforeExam ゲート）。

## 4. 推奨ツール（repo 同梱）

publish-note スキル（[.claude/skills/social/publish-note/SKILL.md](../../.claude/skills/social/publish-note/SKILL.md)）:

- **browser-use 経路（Mac）**: `/publish-note` 系。本文paste・カバー・タグを自動設定。
- **Playwright 経路（Windows 可）**: `scripts/note-publish.mjs`（新規公開）。frontmatter の `paidBoundary`/`price`/`notePricing` と dir の `cover.png`/`hashtags.txt` を自動で読む。バッチは `note-publish-magazine.mjs --list <manifest>`。
- マガジン収録: `note-magazine-add`（冪等）。マガジン見出し画像は `note-magazine-cover.mjs --key m8554e87ca6ec --dir <magazineDir> --commit`（未設定なら）。

いずれも `channel:'chrome'` ＋永続プロファイル＋account=dobokunote 照合の共通方式。

## 5. 対象36記事＋索引（工事番号＝1級と対応・utm_campaign＝`civil2-koji-bank-koji{NN}`）

無料索引 `00-想定工事索引`（utm `civil2-koji-bank-index`・notePricing:free）を先に or 最後に公開。有料36本は下記（8工種グループ順）。全記事に `article.md`＋`img/cover.png`＋`hashtags.txt` 完備。

| 工事 | 工種 | utm_campaign |
|---|---|---|
| 01 | 道路改良盛土 | civil2-koji-bank-koji01 |
| 02 | 河川築堤盛土 | civil2-koji-bank-koji02 |
| 05 | サンドドレーン盛土 | civil2-koji-bank-koji05 |
| 06 | セメント改良土盛土 | civil2-koji-bank-koji06 |
| 07 | 切土法面地すべり | civil2-koji-bank-koji07 |
| 08 | 補強土壁テールアルメ | civil2-koji-bank-koji08 |
| 13 | 高含水比粘性土盛土 | civil2-koji-bank-koji13 |
| 17 | RCボックスカルバート | civil2-koji-bank-koji17 |
| 18 | 逆T式擁壁 | civil2-koji-bank-koji18 |
| 22 | 暑中コンクリート | civil2-koji-bank-koji22 |
| 23 | 寒中コンクリート | civil2-koji-bank-koji23 |
| 25 | 根固めブロック | civil2-koji-bank-koji25 |
| 27 | 場所打ち杭オールケーシング | civil2-koji-bank-koji27 |
| 28 | 場所打ち杭アースドリル | civil2-koji-bank-koji28 |
| 29 | PHC杭打込み | civil2-koji-bank-koji29 |
| 35 | 橋台直接基礎 | civil2-koji-bank-koji35 |
| 37 | アスファルト舗装新設 | civil2-koji-bank-koji37 |
| 38 | アスファルト舗装打換え | civil2-koji-bank-koji38 |
| 39 | コンクリート舗装版 | civil2-koji-bank-koji39 |
| 40 | 道路改良拡幅 | civil2-koji-bank-koji40 |
| 42 | 排水性舗装 | civil2-koji-bank-koji42 |
| 44 | 路上路盤再生 | civil2-koji-bank-koji44 |
| 47 | 交差点改良 | civil2-koji-bank-koji47 |
| 48 | 歩道整備バリアフリー | civil2-koji-bank-koji48 |
| 51 | 河川護岸ブロック張 | civil2-koji-bank-koji51 |
| 53 | 樋門樋管 | civil2-koji-bank-koji53 |
| 55 | 河道掘削しゅんせつ | civil2-koji-bank-koji55 |
| 56 | 床止め落差工 | civil2-koji-bank-koji56 |
| 57 | 海岸護岸消波工 | civil2-koji-bank-koji57 |
| 62 | 砂防堰堤 | civil2-koji-bank-koji62 |
| 63 | 下水道管渠開削 | civil2-koji-bank-koji63 |
| 65 | 推進工法小口径 | civil2-koji-bank-koji65 |
| 68 | 上水道配水管布設開削 | civil2-koji-bank-koji68 |
| 79 | 床版取替更新 | civil2-koji-bank-koji79 |
| 80 | 橋梁耐震補強 | civil2-koji-bank-koji80 |
| 99 | 法面対策吹付グラウンドアンカー | civil2-koji-bank-koji99 |

## 6. 公開後（偽成功ガード・SoT反映）

1. **各記事の noteUrl/noteId を実体検証**してから frontmatter に記録（fail=0 の偽成功に注意＝[[feedback_note_publish_phantom_id_gate]]。noteId 実在を note API v3 で照合、公開後 `verify-note-status`）。
2. 36本の収録完了を確認したら、**`src/lib/note-magazines.ts` の `civil-2-koji-bank` を `published: true` に更新**（現在は空/部分マガジンを広告しない公開ゲートで false 据え置き）。noteUrl は既に `m8554e87ca6ec` 反映済み。
3. **索引 `00-想定工事索引` に per-article リンクを埋める**（1級索引と同じく、36本の公開後に各記事 noteUrl を取得してから工種名をリンク化。現状は工種名リスト＋マガジンCTAのみ）。
4. `develop` push → deploy でサイトのサイドバー/記事末尾CTAに自動表示。

## 7. 残・次工程

- **36工種フルは制作完了済み**（P1 15＋P2 21・2026-07-01。旧「P2で21工種を追加」は実施済み）。残るのは本ハンドオフの note ブラウザ公開作業のみ。
- membership「土木セコカン合格ラボ」の2級ライブラリへ内包（noteコンテンツ計画のライブラリ内包モデル）。

## 参考

- 手動公開キット（旧・15記事版が Downloads に配置済の可能性あり）: 最新の正は **repo 直参照**（`docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/` の全36工種＋索引00・article.mdはCTA/UTM反映済み最新・img/cover.png＋hashtags.txt完備）。旧 Downloads キットは15記事版のため使わない。
- publish 実行環境の詳細: [publish-note SKILL.md](../../.claude/skills/social/publish-note/SKILL.md) / [note-api-verification.md](../reference/note-api-verification.md)
