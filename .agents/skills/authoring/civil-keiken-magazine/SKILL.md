---
name: civil-keiken-magazine
description: >
  1級・2級土木 第2次検定「施工経験記述」の note 有料マガジン用フル模範答案を、Generator
  (civil-keiken-essay-writer) → Evaluator (civil-keiken-essay-qa) で生成・採点する。
  過去問年度別 / テーマ別完成答案集 / 予想問題集 の3種に対応。サイト無料記事とは重複させず
  (Red Line #4)、規格値は捏造せずプレースホルダ運用、改変前提テンプレとして打ち出す。
  Use when user asks to [施工経験記述マガジン, 模範答案を作成, 経験記述の模範解答, 過去問模範答案集, 予想問題集を作る, /civil-keiken-magazine].
user-invocable: true
---

## 用途

土木施工管理技士 第2次検定 問題1（施工経験記述）の **note 有料マガジン記事**（フル模範答案）を作る。手書きせずエージェント駆動で量産・採点する。サイト（無料 SEO 本体）はフル答案を持たず、note 有料がフル答案を担う三層分業（Red Line #4）。

## 引数

| 引数 | 必須 | 説明 |
|---|---|---|
| `--grade {1\|2}` | ✓ | 1=監理技術者レベル / 2=主任技術者レベル |
| `--type {pastexam\|theme\|yosou}` | ✓ | 過去問年度別 / テーマ別完成答案集 / 予想問題集 |
| `--slug <name>` | ✓ | 記事スラッグ（R0X / 管理名 / 新方向名）。複数可 |
| `--koushu <list>` | | 使用工種（既存と重複しないものを指定。省略時は親が既存を読んで割当） |

## 実行手順

1. **既存把握（重複回避）**: 対象級の既存マガジン全 article.md ＋ サイト `secondary-experience-writing-{guide,examples}` を確認し、**使用済み工種・現場設定を「テーマ×工種マトリクス」として書き出す**（下記「量産」参照）。`pastexam` はサイト `secondary-r0X` の問題1（公式問題文）を正として用意。
2. **生成**: `civil-keiken-essay-writer`（Generator/sonnet）を slug ごとに起動。**未使用の工種・現場設定を親が明示指定**、規格値は `〇〇`（法定・規格の固定値はリテラル）、形式は級・年度どおり、答案は **ⅰ）型完結文の散文**、複数工種は `想定工事①②…`（2級選択制は同一工事と分かる表記）、置換ガイド・失格注意を必須。**ⅰ）型は列挙マーカーも字数算入される**ので `1.`型から変えたら `--strict` 再実行。**ハッシュタグは本文でなく `hashtags.txt`**（`/note-hashtags`・**1 行 1 タグ＝`#` 接頭辞・改行区切り**・**90 個以上必須〜99**。`npm run check-note-hashtags` がゲート。space 区切り単一行は note 側で 1 タグ扱いの不良）に生成する。
3. **採点**: `civil-keiken-essay-qa`（Evaluator/sonnet）で5軸採点＋必須ゲート（字数 `--strict`／散文形式／inter-article 重複／固定値リテラル／構造欠落なし）。平均≥2.0 かつ全ゲート通過で合格。不合格は Generator に修正指示で再走。
4. **配線（親）**: `note掲載文.txt`（掲載文＋機械ブロック・`npm run note-meta-lint` で文字数検査 30/400/250）/ `note-magazines.ts` エントリ / `magazine-placement.ts` / `scripts/pdf-specs/{magazine}.json` を整備（PDF は生成せず spec の JSON 妥当性＋見出し存在のみ確認＝オンデマンド方針）。マガジンカバー（note 公開時のヘッダー用）は `node scripts/generate-magazine-covers.mjs {id}` でマガジンdir `_cover.png` を生成（資格別 `fillBg` 背景塗り：1級青#155293/2級緑#1C5038）。※サイト表示用の画像は不要（サイト CTA は exam-brand.ts の cta-bg 背景＋HTML 文字でデータ駆動）。
5. **検証・commit（親）**: `npm run type-check`、明示パスで commit（並行作業を巻き込まない）。

## 公開時（note 公開後の URL 反映）

note でマガジンを公開し URL（`note.com/.../m/...`）を取得したら **3 箇所**に反映する（[[feedback_no_price_in_mdx_body]] / [[feedback_note_link_card]]）。

1. **SoT**: `note-magazines.ts` の該当 id を `published: true` ＋ `noteUrl: '<マガジンURL>'` に更新（これで `MagazineCard`／`magazine-placement` の購入導線が描画・稼働）。
2. **本文プレースホルダ**: 各記事の「（マガジン公開後に URL を反映）」等を **マガジン URL 単独行**（note リンクカード）に置換。収録記事ごとにマガジン全体への回遊導線になる（QA gate は導線リンクカード URL を許可）。
3. **note掲載文.txt**: 掲載文＋機械ブロック（価格）が SoT。URL/公開状態は `note-magazines.ts`（手順1）で反映するため、note掲載文.txt 側の URL 追記は不要。
4. 個別記事 n/ URL を取得したら本文リンクカードを n/ URL に差し替え。`npm run type-check` ＋ 明示パス commit。

## 量産（テーマ×工事マトリクス）

> **用語**: 想定工事①②③ の単位は **工事（プロジェクト：例 宅地造成工事・樋門工事）**。「工種」（土工・擁壁工・舗装工…）は工事概要「④主な工種」に入る作業種別で、別概念。差別化・重複回避は**工事**単位で行う（結果として工種も異なる）。

テーマ別に想定工事①②③…を厚くするとき（完成答案集／過去問集とも）は、**重複を体系で防ぐ**ことが最優先。

1. **マトリクス台帳を作る**: 行=テーマ（品質/安全/工程/施工計画/環境…）、列=**工事（種別）**（造成/道路/河川/下水道・上水道/構造物・橋梁/法面/海岸…）。各セルに「使用済み（記事パス）／未使用」を記録。既存マガジン＋過去問＋（旧）サイト例文を読んで埋める。
2. **未使用セルを生成対象に**: 各セルは**別の工事（別現場設定・別工種構成・別の対策の組合せ）**であること。同種の工事でも現場条件（市街地/山間部/河川内、夏季/冬季/出水期 等）で差別化できるが、対策の中身が被らないこと。
3. **1サイクル**: `civil-keiken-essay-writer`（**工事を明示**）→ 自己 `keiken-charcount --strict` → `civil-keiken-essay-qa`（**inter-article 重複を既存note全体に対して**検査）→ 親が diff 検証＋commit。これをセル単位で回す。
4. **品質＞量**: 1テーマ3工事が費用対効果の良い帯（それ以上は重複感・保守コスト増で逓減）。silent な打ち切りはせず、どのセルを埋め残したか台帳に記録。
5. **値付け（親）**: 厚くするなら上位商品（例「工事別 完成答案 大全」）として `note-magazines.ts` に新規 id ＋価格、or 既存マガジンの増補。本文に価格直書きしない（SoT は note-magazines.ts）。

## 完了条件

- 各記事 U+FFFD 0 / 本文価格直書き 0 / サイト・**既存note全体**と答案重複 0（逐語＋意味的）
- 答案が解答欄字数内（`keiken-charcount --strict` exit 0）かつ **ⅰ）型完結文の散文**（断片化なし）
- 法定・規格の固定値はリテラル、現場固有値のみ `〇〇`
- Evaluator 合格（平均≥2.0・全ゲート通過）
- 形式が級・年度どおり（PDF spec の include 見出しと整合）、複数工種は `想定工事①②…` で対称構造
- `hashtags.txt` に note タグ **90個以上〜99**（1行1タグ・`/note-hashtags` 準拠・**本文には入れない**・`check-note-hashtags` ゲート）
- **有料記事は frontmatter `paidBoundary` 必須**（無料プレビュー範囲の境界H2先頭一致・完成答案集/過去問模範答案集等は SSOT `.Codex/knowledge/reference/note-api-verification.md`「有料境界のマガジン別 SSOT」参照。`check-note-boundary` ゲート）

## 担当エージェント

- Generator: `civil-keiken-essay-writer`
- Evaluator: `civil-keiken-essay-qa`

## 関連

- 紙用 PDF 化（オンデマンド）: `/magazine-to-pdf --spec scripts/pdf-specs/{magazine}.json`
- サイト過去問ページの解答補完: `civil-secondary-exam-writer`
- プラン: `docs/note/1級・2級土木/{1級土木,2級土木}/*施工経験記述プラン.md`
