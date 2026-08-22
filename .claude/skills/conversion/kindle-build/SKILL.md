---
name: kindle-build
description: >
  Kindle(KDP)入稿用 EPUB を書籍IDから生成し、epubcheck＋check-kindle-format 機械検証と kindle-book-qa の5軸監査まで実行する。
  択一系（A=1級土木論点別 build-takuitsu-reconstruct / B=総監択一・D=技術士一次・E=2級土木択一 build-pe1-kindle）は spec で、
  記述式 essay 系（C=建設二次模範解答・F=総監記述式）は build-essay-kindle.mjs で決定論的にビルドする。構成定義/前付けが
  未整備の書籍は kindle-book-composer に委譲。全書籍の状態は catalog.json（マスター登録簿）、成果物は kindle-dist/ を git 追跡。
  表紙画像は対象外。KDP への実入稿・出版は後工程の /kdp-publish（kdp-operator）が担当。
  Use when user asks to [Kindle本を作って, EPUBを生成, KDP入稿ファイル, A-01をビルド, essay模範解答本, Kindle出版の原稿, /kindle-build].
user-invocable: true
---

## 用途

Kindle 出版戦略（[strategy.md](../../../../content/kindle/strategy.md) = 真実源）の書籍ラインナップを、書籍ID 1つを引数に **EPUB 生成 → 機械検証 → 品質監査** まで一気通貫で実行する。構成設計（Generator）・ビルド（決定的スクリプト）・評価（Evaluator）の分業で回す。

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
| A-01〜A-06 / A-00 | A: 1級土木択一・論点別 | `node scripts/build-takuitsu-reconstruct.mjs --theme {anzen\|hoki\|sekokeikaku\|kankyo\|hinshitsu\|koutei\|goubon}` | THEMES（lead判定＋exclude＋parts フィルタ） | 全7冊 LIVE |
| D-01/02/03 / D-00 | D: 技術士一次 合本 | `node scripts/build-pe1-kindle.mjs --spec scripts/kindle-specs/{id}.json` | spec + 書き下ろし前付け | 全4冊 LIVE |
| E-01 | E: 2級土木択一 全期合本 | `build-pe1-kindle.mjs --spec kindle-specs/e-01.json` | spec + 前付け（出典=全国建設研修センター） | LIVE |
| b-reiwa/b-heisei | B: 総監択一 合本 | `build-pe1-kindle.mjs --spec kindle-specs/{id}.json` | spec + 前付け（出典=第二次試験・spec.examName） | 全2冊 LIVE |
| c-01〜c-11/c-I | C: 建設二次 模範解答 essay | `node scripts/build-essay-kindle.mjs --spec scripts/kindle-specs/{id}.json` | spec（sources=模範解答 md）+ 前付け | 全12冊 LIVE |
| f-01〜f-16 | F: 総監 記述式 essay | `build-essay-kindle.mjs --spec kindle-specs/{id}.json` | spec + 前付け | F-01〜07 LIVE / F-08〜16 ready |

表紙は全冊 spec 駆動で再生成可能（`scripts/kindle-covers/specs/<id>.json`＋`backgrounds/`、下記「表紙」参照）。全書籍の状態・ASIN は [`scripts/kindle-published/catalog.json`](../../../../scripts/kindle-published/catalog.json)（マスター登録簿）が真実源。

- A系入力: `src/config/civil-1-exam-questions.json`（1,162問）。D/E系入力: 各 `content/site/**/article.mdx`（択一・全問完全解説）。C/F系入力: `content/note/**/article*.md`（記述式模範解答）
- 出力: `.tmp/kindle-{id}/{id}.epub`。git 追跡の配布物は `scripts/kindle-dist/<id>.epub` + `<id>.jpg`（`npm run sync-kindle-dist` で spec から再生成）

### ビルダー別の要点（2026-07-11 拡張）

- **build-pe1-kindle**（択一・D/E/B）: `spec.examName`/`spec.creditIssuer` で出典切替。インライン `<ExamPoint>文</ExamPoint>`（2級形式）と props 型の両対応。画像は年度スコープ href（`img/{articleId}-{name}`）で年度間衝突を防止、`sanitizeMathml` で KaTeX の不可視演算子/mtable width/多文字演算子の epubcheck エラーを除去。選択肢 loose list の番号リセットは空行先読みで回避
- **build-essay-kindle**（記述式・C/F）: 純散文用。`stripNoteSections`（## CTA節）+ `stripNoteCta`（`**bold**` 疑似見出しフッター＋インライン note CTA）+ `stripLinks`（サイトへの全リンク形式=https/相対/裸スラッグの誘導文を除去）。**R8予想は spec の sources から除外して evergreen 化**（来年度受験者向け）
- markdown レンダラは両者とも `scripts/lib/kindle-md.mjs` を共有（essay 側）。pe1 は自前 mdToXhtml（統合は回帰実績ありで保留）

## 実行手順

### ケース 1: 構成定義済み（A-01 等）

1. 解決表のコマンドを実行し、統計行（抽出→除外→圧縮→収録）を `strategy.md` の期待値（例: A-01 = 抽出153→図版4除外→同趣旨22圧縮→収録127問・9論点）と突合
2. 機械検証: `epubcheck {out}.epub`（エラー0/警告0 が合格）。epubcheck 不在時の代替: `unzip -lv` で mimetype が先頭・Stored、展開して全 `.xhtml/.opf/.ncx` に `xmllint --noout`
3. `--skip-qa` でなければ `kindle-book-qa` を起動し 5 軸監査（原稿完全性/構成整合/EPUB技術/KDP規約適合/商品性）
4. FAIL 指摘 → THEMES 微修正 or 元データ解説補完（Generator/親が適用）→ 再ビルド → 機械検証再通過。**最大2周**、収束しなければユーザーへ escalate

### ケース 2: 構成定義なし（A系テーマ追加・B〜F系新規）

`kindle-book-composer` サブエージェント（Generator）に構成設計を委譲してからケース 1 へ。委譲時に必ず伝えること:

- A系: 対象テーマの include regex + subtopics（論点）設計。件数実測を `strategy.md` の問題数と突合し、乖離は理由つき報告
- B〜F系: spec JSON（sources・タイトル・価格）+ 書き下ろし前付け（`content/kindle/books/{id}/front-matter.md`: はじめに・出題傾向分析・学習ガイド）。**書き下ろしは KDP 差別化（無料 web 転載でないこと）の中核**なので省略不可
- 出典クレジット: A系=全国建設研修センター / D系=日本技術士会（文面は各ビルドスクリプト内が真実源）

### 完了報告（KDP アップ用メタを必ず併記）

```
書籍ID / タイトル案 / サブタイトル案 / 価格（`strategy.md` の価格ポリシー準拠）/ 収録数・章構成
検索キーワード 7 個案 / カテゴリ案 / EPUB パス / epubcheck 結果 / qa 5軸判定
残ユーザー作業: 表紙 JPEG 1600×2560・KDP アップロード・Select 加入判断・Kindle Previewer 目視
```

## 検証

- epubcheck エラー0/警告0（EPUB 3.3 ルール）
- **`npm run check-kindle-format <epub>`**（書式インバリアント検査 R1-R4: 可読性/章改ページ/解答改ページ/選択肢連番。epubcheck が見ない書式ハウスルールを検査）
- 収録問題数 = `strategy.md` 期待値との突合（統計行）
- essay系の漏れ検査: 展開 xhtml に `note.com`・`](` 生リンク・`をご覧ください`誘導・`R8予想`/`令和8`予想問題文脈 の残存 = 0
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
- 価格: `strategy.md` の価格ポリシー（150問↑¥490 / 80-150¥390 / 80未満¥350）。ロイヤリティ **70%**（¥250-1,250 帯）

**ユーザー本人しかできない工程（自動化・代行不可）**: KDP アカウント登録、**税務情報（マイナンバー＝米国以外の TIN・住所は英語ローマ字入力）・W-8BEN**、銀行口座、最終「出版」クリック。

**表紙（git 管理下・spec 駆動で再生成可能）**: `scripts/kindle-covers/build-kindle-cover.mjs --spec scripts/kindle-covers/specs/<id>.json`。背景（Codex 生成・文字なし・上部余白ゾーン）は `scripts/kindle-covers/backgrounds/<id>.png`、文言は spec に。日本語タイトルは satori + NotoSansJP-Bold で後合成（画像モデルは日本語を崩すため文字は必ずコードで乗せる）。詳細 → `scripts/kindle-covers/README.md`

## KDP 提出運用（分割提出・catalog 管理）

- **KDP 新規/実績浅アカウントは本の作成数制限あり**（2026-07-11、d-03 提出時に到達）。数日〜で枠回復・売上/審査通過で緩和。**分割提出運用**が前提
- **入稿メモ**: `npm run gen-kdp-memo <id...>` で共通テンプレ生成（共通項=著者 doboku-note/レーベル/AI申告/カテゴリ/フローは `.claude/config/kdp-memo.json` の defaults＝真実源、読取りは `scripts/lib/kdp-common.mjs`、固有値は books[id]、title/price/issuer は spec 自動取得）→ `scripts/kindle-published/KDP入力メモ_<id>.txt`。**KDP への実入稿・出版は後工程の `/kdp-publish`（`kdp-operator`）が自動化**
- **配布物 git 追跡**: `npm run sync-kindle-dist -- --downloads` で ready 全冊を再ビルド→`kindle-dist/`＋`~/Downloads/kindle-<id>.(epub|cover.jpg)`
- **提出後**: catalog.json の `asin`＋`status=live` を更新、`strategy.md` の該当シリーズ表に ASIN/出版日を追記

## 参照

- 戦略・価格・チェックリストの真実源: [strategy.md](../../../../content/kindle/strategy.md)
- マスター登録簿（全書籍の状態/ASIN）: `scripts/kindle-published/catalog.json` ／ 配布物: `scripts/kindle-dist/`（README あり）
- 択一ビルダー: `scripts/build-takuitsu-reconstruct.mjs`（A・THEMES）/ `scripts/build-pe1-kindle.mjs`（D/E/B・spec）
- essay ビルダー: `scripts/build-essay-kindle.mjs`（C/F・spec）＋共有レンダラ `scripts/lib/kindle-md.mjs`
- 書式検査: `scripts/check-kindle-format.mjs`（`npm run check-kindle-format`）
- メモ生成/配布同期: `scripts/gen-kdp-memo.mjs` / `scripts/sync-kindle-dist.mjs`
- 試作の経緯・既知の限界: `content/note/1級・2級土木/1級土木/takuitsu-pdf-prototype.md`
- サブエージェント: `kindle-book-composer`（構成設計）/ `kindle-book-qa`（5軸監査）→ [agents-registry.md](../../../../.claude/knowledge/reference/agents-registry.md)
