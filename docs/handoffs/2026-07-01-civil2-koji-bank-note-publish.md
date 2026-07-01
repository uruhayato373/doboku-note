# ハンドオフ｜2級土木 想定工事バンク note公開（別PC・browser-use）

- 作成: 2026-07-01
- 状態: **公開準備完了・note公開待ち**（マガジンは作成済み、15記事の公開＋収録が残）
- 実行環境: **別PC（note ログイン済みプロファイルのあるマシン）で browser-use/Playwright**
- 関連SSOT: [note-magazines.ts](../../src/lib/note-magazines.ts) / [2級版-想定工事バンク展開設計.md](../note/1級・2級土木/2級土木/2級版-想定工事バンク展開設計.md) / [project_civil2_keiken_essay_line メモリ]

## 1. 目的

develop に用意済みの **2級土木 想定工事バンク P1 15記事**を note.com/dobokunote で公開し、公開済みマガジンに収録する。

- **マガジン（作成済・公開済）**: `https://note.com/dobokunote/m/m8554e87ca6ec`
- **セット価格**: ¥3,480 ／ **各記事 単品**: ¥980
- 原稿・素材の場所: `docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/工事NN-*/`
  - 各工事dir に `article.md` ＋ `img/cover.png` ＋ `hashtags.txt` の3点セット完備
  - マガジン見出し画像: 同マガジンdir直下 `_cover.png`（アップロード済みなら不要）

## 2. 前提（別PCでの準備）

1. リポジトリを **develop** に更新（`git pull` / 最新は 3点セット・CTA・UTM 全て反映済み）。最新コミット目安: 冒頭CTA＋UTM反映（`b7b219de0` 以降）。
2. note.com/dobokunote に**ログイン済みのブラウザプロファイル**があること。
   - browser-use 経路（Mac 推奨）: Chrome プロファイルにログイン ＋ 環境変数 `NOTE_PROFILE` を設定（`Profile 5` は stats47 用なので使わない）。
   - Playwright 経路（Windows も可）: `.local/playwright-note-profile`（永続・初回のみ手動ログイン）。
3. **投稿先アカウント照合ゲート**（誤爆防止）: `note.com/dobokunote` 固定。ツールが account 照合を必ず通す。真実源 [note-api-verification.md](../reference/note-api-verification.md)。

## 3. 各記事の公開設定（15本共通・重要）

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

## 5. 対象15記事（工事番号＝1級と対応・utm_campaign）

| 工事 | 工種 | utm_campaign |
|---|---|---|
| 01 | 道路改良盛土 | civil2-koji-bank-koji01 |
| 02 | 河川築堤盛土 | civil2-koji-bank-koji02 |
| 05 | サンドドレーン盛土 | civil2-koji-bank-koji05 |
| 07 | 切土法面地すべり | civil2-koji-bank-koji07 |
| 17 | RCボックスカルバート | civil2-koji-bank-koji17 |
| 18 | 逆T式擁壁 | civil2-koji-bank-koji18 |
| 27 | 場所打ち杭オールケーシング | civil2-koji-bank-koji27 |
| 37 | アスファルト舗装新設 | civil2-koji-bank-koji37 |
| 38 | アスファルト舗装打換え | civil2-koji-bank-koji38 |
| 40 | 道路改良拡幅 | civil2-koji-bank-koji40 |
| 51 | 河川護岸ブロック張 | civil2-koji-bank-koji51 |
| 53 | 樋門樋管 | civil2-koji-bank-koji53 |
| 62 | 砂防堰堤 | civil2-koji-bank-koji62 |
| 63 | 下水道管渠開削 | civil2-koji-bank-koji63 |
| 80 | 橋梁耐震補強 | civil2-koji-bank-koji80 |

## 6. 公開後（偽成功ガード・SoT反映）

1. **各記事の noteUrl/noteId を実体検証**してから frontmatter に記録（fail=0 の偽成功に注意＝[[feedback_note_publish_phantom_id_gate]]。noteId 実在を note API v3 で照合、公開後 `verify-note-status`）。
2. 15本の収録完了を確認したら、**`src/lib/note-magazines.ts` の `civil-2-koji-bank` を `published: true` に更新**（現在は空/部分マガジンを広告しない公開ゲートで false 据え置き）。noteUrl は既に `m8554e87ca6ec` 反映済み。
3. `develop` push → deploy でサイトのサイドバー/記事末尾CTAに自動表示。

## 7. 残・次工程

- P1公開後、**P2で21工種を追加し36へ**（同パイプライン＝civil-keiken-essay-writer 生成→独立検証。設計docの台帳参照）。
- membership「土木セコカン合格ラボ」の2級ライブラリへ内包（noteコンテンツ計画のライブラリ内包モデル）。

## 参考

- 手動公開キット（Downloadsに配置済・別PCでは repo 直参照でも可）: `Downloads/2級土木-想定工事バンク-公開素材/`（README＋マガジン素材＋15記事素材、article.mdはCTA/UTM反映済み最新）
- publish 実行環境の詳細: [publish-note SKILL.md](../../.claude/skills/social/publish-note/SKILL.md) / [note-api-verification.md](../reference/note-api-verification.md)
