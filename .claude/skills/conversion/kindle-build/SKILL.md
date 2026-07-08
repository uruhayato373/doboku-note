---
name: kindle-build
description: >
  Kindle(KDP)入稿用 EPUB を書籍IDから生成し、epubcheck 機械検証と kindle-book-qa の5軸監査まで実行する。
  A系（A-01〜A-06=1級土木択一・論点別再構成）は build-takuitsu-reconstruct.mjs、D系（D-01〜D-03=技術士一次・
  科目別7年分合本）は build-pe1-kindle.mjs + kindle-specs/{id}.json で決定論的にビルドする。構成定義（THEMES/spec）が
  未整備の書籍は kindle-book-composer に構成設計を委譲する。表紙画像・KDPアカウント操作は対象外（ユーザー作業）。
  Use when user asks to [Kindle本を作って, EPUBを生成, KDP入稿ファイル, A-01をビルド, Kindle出版の原稿, /kindle-build].
user-invocable: true
---

## 用途

Kindle 出版戦略（[08_Kindle出版戦略.md](../../../../docs/project/01_戦略/08_Kindle出版戦略.md) = 真実源）の書籍ラインナップを、書籍ID 1つを引数に **EPUB 生成 → 機械検証 → 品質監査** まで一気通貫で実行する。構成設計（Generator）・ビルド（決定的スクリプト）・評価（Evaluator）の分業で回す。

```
/kindle-build {書籍ID}
 ├─ 構成定義あり → ビルドスクリプト直実行（LLM 不使用）
 ├─ 構成定義なし → kindle-book-composer が THEMES / spec + 書き下ろし前付けを作成 → ビルド
 └─ ビルド後 → epubcheck → kindle-book-qa（5軸監査）→ FAIL は修正して再ビルド（最大2周）
```

## 引数

| 引数 | 必須 | 説明 |
|---|---|---|
| `書籍ID` | ✓ | `A-01`〜`A-06`（1級土木択一・論点別）/ `D-01`〜`D-03`（技術士一次・科目別合本）。合本 `A-00`/`D-00` は構成要素完成後 |
| `--skip-qa` | | kindle-book-qa 監査を省略（機械検証のみ。再ビルド時の途中確認用） |

## 書籍ID → ビルド定義の解決表

| 書籍ID | シリーズ | ビルド | 構成定義 | 状態 |
|---|---|---|---|---|
| A-01 安全管理 | A: 1級土木択一 | `node scripts/build-takuitsu-reconstruct.mjs --theme anzen --format both` | THEMES 実装済み（lead判定＋exclude） | EPUB完成（収録127問・9論点） |
| A-02〜A-06 | A | 同上 `--theme {key}` | **THEMES 未定義** → composer 委譲 | 構成待ち |
| D-01 基礎 / D-02 適性 / D-03 専門(建設) | D: 技術士一次 合本 | `node scripts/build-pe1-kindle.mjs --spec scripts/kindle-specs/{id}.json` | spec + 書き下ろし前付け | D-02 spec から整備 |

- A系入力: `src/config/civil-1-exam-questions.json`（H26-R07 構造化 1,162 問）
- D系入力: `.local/r2/posts/pe-first-stage/{r01..r07}-{basic,aptitude,construction}/article.mdx`（全問完全解説つき）
- 出力: A系 `.tmp/takuitsu-{theme}/{theme}.epub` / D系 spec の `outDir`（既定 `.tmp/kindle-{id}/`）

## 実行手順

### ケース 1: 構成定義済み（A-01 等）

1. 解決表のコマンドを実行し、統計行（抽出→除外→圧縮→収録）を 08 の期待値（例: A-01 = 抽出153→図版4除外→同趣旨22圧縮→収録127問・9論点）と突合
2. 機械検証: `epubcheck {out}.epub`（エラー0/警告0 が合格）。epubcheck 不在時の代替: `unzip -lv` で mimetype が先頭・Stored、展開して全 `.xhtml/.opf/.ncx` に `xmllint --noout`
3. `--skip-qa` でなければ `kindle-book-qa` を起動し 5 軸監査（原稿完全性/構成整合/EPUB技術/KDP規約適合/商品性）
4. FAIL 指摘 → THEMES 微修正 or 元データ解説補完（Generator/親が適用）→ 再ビルド → 機械検証再通過。**最大2周**、収束しなければユーザーへ escalate

### ケース 2: 構成定義なし（A-02 以降・D 系新規）

`kindle-book-composer` サブエージェント（Generator）に構成設計を委譲してからケース 1 へ。委譲時に必ず伝えること:

- A系: 対象テーマの include regex + subtopics（論点）設計。件数実測を 08 の問題数と突合し、乖離は理由つき報告
- D系: spec JSON（sources 7冊・タイトル・価格）+ 書き下ろし前付け（`docs/kindle/{id}/front-matter.md`: はじめに・7年分の出題傾向分析・学習ガイド）。**書き下ろしは KDP 差別化（無料 web 転載でないこと）の中核**なので省略不可
- 出典クレジット: A系=全国建設研修センター / D系=日本技術士会（文面は各ビルドスクリプト内が真実源）

### 完了報告（KDP アップ用メタを必ず併記）

```
書籍ID / タイトル案 / サブタイトル案 / 価格（08 の価格ポリシー準拠）/ 収録数・章構成
検索キーワード 7 個案 / カテゴリ案 / EPUB パス / epubcheck 結果 / qa 5軸判定
残ユーザー作業: 表紙 JPEG 1600×2560・KDP アップロード・Select 加入判断・Kindle Previewer 目視
```

## 検証

- epubcheck エラー0/警告0（EPUB 3.3 ルール）
- 収録問題数 = 08 期待値との突合（統計行）
- `U+FFFD` grep = 0（展開した xhtml に対して）
- Kindle Previewer 3 の目視（目次遷移・改ページ・数式）は GUI のためユーザー作業として報告に明記

## トラブルシューティング

- **epubcheck が無い**: `brew install epubcheck`（openjdk 同梱）。会社 PC 等で不可なら xmllint 代替（上記）
- **収録数が期待値とズレる**: THEMES の include regex が複合設問を拾い過ぎ/漏らし。`--format md` で article.md を出し、論点見出しごとの件数を数えて regex を調整
- **数式が崩れる（D系）**: KaTeX→MathML 変換は Kindle Previewer で要目視。崩れる場合は該当式を画像化にフォールバック（build-pe1-kindle.mjs のオプション）
- **論点まとめに他論点が混入（A系）**: 複合設問由来の既知の限界。qa の指摘箇所を subtopics regex の順序変更（先勝ち）で手当て

## KDP 入稿の実運用メモ（2026-07-08 A-01 出版で確立）

初回出版で判明した、KDP 画面での実際の入力・落とし穴。2冊目以降はここを見れば迷わない。

**EPUB 構造（A系ビルダーが自動で満たす）**
- **1問=1ファイル + 解答=1ファイル**に分割（`inToc:false`）。ファイル境界で Kindle が確実に改ページ＝「問題→めくって解答」を CSS 改ページに頼らず保証。CSS 改ページ方式は Kindle Previewer で崩れる（この構造にした経緯）
- 解答ページは**全選択肢の正誤理由を ○/×** で収録（`optionExplanations` 全件）。正答だけにしない
- 元データ（`civil-1-exam-questions.json`＝サイト MDX 派生）の **HTML 数値エンティティ（`&#x2460;`=①等）・穴埋め空欄記号（▆/｜　｜）は `normalizeText` で復号/正規化**しないと Kindle で生文字列が見える
- 巻末に**学習導線（doboku-note.com＋note マガジン）＋著者プロフィール**を UTM 付きで内蔵（`utm_source=kindle`）。XHTML 属性内の `&` は `&amp;` にエスケープ（生 `&` は epubcheck FATAL）

**ファイル受け渡し**: `.tmp/` は隠しフォルダで KDP のファイル選択に出ない → **`~/Downloads/` にコピー**して渡す（EPUB＋表紙とも）

**KDP 画面の入力値（A系の定番）**
- ページを読む方向: **左から右（横書き）**
- DRM: **はい（適用）**推奨（過去問集の再配布防止・出版後変更不可）
- アクセシビリティ「画像にアクセスできますか?」: **すべてに代替テキスト/説明が含まれています**（本文に情報伝達図版なし＝図依存問題は除外済み）
- **AI 生成コンテンツ申告**: 「含む」→ 対象は**画像（表紙）のみ**（背景は Codex 生成）。**本文テキストは AI ではない**（過去問データ＋条文ベース・人が編集）と正確に申告
- 著者: **doboku-note**（ブランド統一・表紙署名/EPUB dc:creator も同じ）。フリガナ=ドボクノート
- 価格: 08 の価格ポリシー（150問↑¥490 / 80-150¥390 / 80未満¥350）。ロイヤリティ **70%**（¥250-1,250 帯）

**ユーザー本人しかできない工程（自動化・代行不可）**: KDP アカウント登録、**税務情報（マイナンバー＝米国以外の TIN・住所は英語ローマ字入力）・W-8BEN**、銀行口座、最終「出版」クリック。

**表紙（git 管理下・spec 駆動で再生成可能）**: `scripts/kindle-covers/build-kindle-cover.mjs --spec scripts/kindle-covers/specs/<id>.json`。背景（Codex 生成・文字なし・上部余白ゾーン）は `scripts/kindle-covers/backgrounds/<id>.png`、文言は spec に。日本語タイトルは satori + NotoSansJP-Bold で後合成（画像モデルは日本語を崩すため文字は必ずコードで乗せる）。詳細 → `scripts/kindle-covers/README.md`

## 参照

- 戦略・価格・チェックリストの真実源: [08_Kindle出版戦略.md](../../../../docs/project/01_戦略/08_Kindle出版戦略.md)
- A系ビルダー: `scripts/build-takuitsu-reconstruct.mjs`（THEMES スキーマは先頭コメント）
- D系ビルダー: `scripts/build-pe1-kindle.mjs` + `scripts/kindle-specs/*.json`
- 試作の経緯・既知の限界: `docs/note/1級・2級土木/1級土木/takuitsu-pdf-prototype.md`
- サブエージェント: `kindle-book-composer`（構成設計）/ `kindle-book-qa`（5軸監査）→ [agents-registry.md](../../../../docs/reference/agents-registry.md)
