# 法令条文の e-Gov インラインリンク化 一斉移行計画

## 背景

`keyword-page` SKILL.md の L121-127 には以下のルールが明記されている：

> 本文中で法律の条文に言及する場合、e-Gov法令検索の該当条文へのアンカーリンクを付与する
> URL形式: `https://laws.e-gov.go.jp/law/{法令番号}#Mp-At_{条番号}`

しかし機械チェックが無かったため、このルールは**複数の既存ページで未適用**のまま残っていた。2026-04-13 に `scripts/lint-mdx-mobile.mjs` にルール 8-2（LOW 重大度）を追加し、機械検出が可能になった。

## 現状（2026-04-13 時点）

- `.local/r2/posts/pe-comprehensive-management/` 全体で **179 件の LOW 8-2 違反**を検出
- ドキュメント作成時に手動修正済み: 7 件
  - `unfair-trade-practices`: 独占禁止法第2条第9項（初出）・第24条・建設業法第18条
  - `portrait-publicity-privacy`: 憲法第13条（初出）・民法第709条（初出）
- **残件**: 約 170 件

## 検出コマンド

```bash
# 全件棚卸し
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ \
  2>&1 | grep "8-2" > C:/tmp/legal-citation-audit.txt
wc -l C:/tmp/legal-citation-audit.txt

# ファイル別件数
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ 2>&1 | \
  awk '/^=== /{f=$0} /8-2/{print f}' | sort | uniq -c | sort -rn
```

## 主要な法令番号（e-Gov ID）

機械修正時に使える既知の ID を以下にまとめる。`laws.e-gov.go.jp/law/{ID}` で確認できる。

| 法令 | ID |
|---|---|
| 日本国憲法 | `321CONSTITUTION` |
| 民法（明治29年法律第89号） | `129AC0000000089` |
| 独占禁止法（昭和22年法律第54号） | `322AC0000000054` |
| 労働基準法（昭和22年法律第49号） | `322AC0000000049` |
| 建設業法（昭和24年法律第100号） | `324AC0000000100` |
| 下請法（昭和31年法律第120号） | `331AC0000000120` |
| 特許法（昭和34年法律第121号） | `334AC0000000121` |
| 著作権法（昭和45年法律第48号） | `345AC0000000048` |
| 労働安全衛生法（昭和47年法律第57号） | `347AC0000000057` |
| 環境基本法（平成5年法律第91号） | `405AC0000000091` |
| 個人情報保護法（平成15年法律第57号） | `415AC0000000057` |
| 情報公開法（平成11年法律第42号） | `411AC0000000042` |

**注**: 新規法律を追加する際は `patent-rights/article.mdx:105` 等を参照、もしくは e-Gov で直接検索して ID を確認する。

## リンク記法

```markdown
[**法律名第◯条**](https://laws.e-gov.go.jp/law/{法令番号}#Mp-At_{条番号})
```

**注意点**:
- 太字はリンクテキスト内に置く（MDX は `**[text](url)**` を正しくパースしない）
- 条文番号はアラビア数字（全角不可）
- 項番号を含める場合でも `#Mp-At_◯` は条番号のみ

## 運用ルール

### 初出のみリンク

同じ条文が1ファイル内で複数回登場する場合、**初出のみリンク**し、2回目以降は太字テキストのみで可。これにより lint 8-2 で LOW が残る場合があるが、可読性を優先する。

例:
```markdown
<!-- 初出 -->
詳しくは [**著作権法第21条**](https://laws.e-gov.go.jp/law/345AC0000000048#Mp-At_21) に定める複製権を参照。

<!-- 再出（リンク不要）-->
**著作権法第21条** の複製権は...
```

### 一般論としての言及

「独占禁止法が規制する不公正な取引方法」のように条番号を伴わない言及は対象外。lint は条番号を含むケースのみ検出する。

## 一斉修正アプローチ

### アプローチA: 半自動スクリプト（推奨）

`scripts/fix-legal-citations.mjs`（未実装）を作成し、以下を実行:

1. lint 8-2 の出力をパースし、(file, line, citation) を取得
2. 法令名から上記 ID 表でマッピング
3. 条番号を抽出し URL 生成
4. 対象行を `[**法律名第◯条**](url)` 形式に置換
5. 初出判定（同ファイル内で既にリンクがあるか）して、2回目以降はスキップ

### アプローチB: ページ単位での校正タイミング修正（現状）

各キーワードページを `/review-mobile` または `/keyword-page revise` で校正する際に、個別に修正する。規模は小さいが全件完了まで時間がかかる。

### アプローチC: 過去問MDXの別扱い

h24-h26 primary などの過去問 MDX には大量の条文言及があるが、それらは **過去問解説という性質上、キーワードページとは別扱い**することを検討すべき。過去問側は設問の引用が中心なので、リンク化の優先度は低い。

## 推奨実行順序

### Phase 1: 修正スクリプト作成（見積もり: 1〜2 時間）

`scripts/fix-legal-citations.mjs` を作成し、ID マップを内蔵する。

### Phase 2: キーワードページのみ修正（高優先度ファイル）

過去問を除外し、キーワード説明ページのみを対象に lint を実行 → 修正。

```bash
# 過去問を除く対象ファイル
find .local/r2/posts/pe-comprehensive-management -name "article.mdx" \
  ! -path "*/h2*-primary/*" ! -path "*/r*-primary/*" \
  ! -path "*/h2*-secondary/*" ! -path "*/r*-secondary/*"
```

見積もり: 約 50〜80 件（h24-h26 primary等を除外後）

### Phase 3: 過去問MDXの処理（必要に応じて）

スコープ的に受益者が少ない場合はスキップ可。

### Phase 4: 最終確認

```bash
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ | \
  grep "8-2" | wc -l
```

目標: 「初出のみリンク」で残る許容 LOW を除きゼロ。

## リスクと回避策

| リスク | 回避策 |
|---|---|
| 条文番号の自動抽出ミス（「第32条第1項」等の複雑表記） | 半自動でパースし、疑わしいものは手動確認 |
| 法律名の略称（「独禁法」等）が ID マップにない | ID マップに略称→正式名称の変換を追加 |
| 条文が存在しないリンク生成 | e-Gov にアクセスして 404 でないか自動確認 |
| 「同法第◯条」のような前出参照 | 前後の文脈から参照先を特定する処理を追加 |

## 参照

- `scripts/lint-mdx-mobile.mjs` — ルール 8-2 の実装
- `.claude/skills/content/keyword-page/SKILL.md` L121-127 — 法令条文リンクルールの原典
- `.claude/skills/content/review-mobile/SKILL.md` 8. リンクの配置 — チェック項目
- 手動修正完了事例: `unfair-trade-practices`, `portrait-publicity-privacy`（2026-04-13）

## 進捗

| 日付 | 対応 | 修正件数 | 残件 |
|---|---|---|---|
| 2026-04-13 | 手動対応（unfair-trade-practices, portrait-publicity-privacy） | 7 | 約 170 |
| 2026-04-13 | **`fix-legal-citations.mjs` 自動一斉適用** | **122 edits / 50 files** | **53 (残り30%)** |
| 2026-04-13 | **枝番付き条文の誤リンク修正** — 17件のリンクを剥がして太字のみに | 17 edits / 15 files | 39 |

## 枝番付き条文の扱い（重要）

**第38条の3 のような枝番付き条文は独立した別条文**であり、第38条へのリンクは誤り。e-Gov の枝番アンカー形式（`#Mp-At_38_3` 等の可能性）が公式に確定していないため、**枝番付き条文にはリンクを付けない**方針。

- `lint-mdx-mobile.mjs` ルール 8-2 は枝番パターン（`第◯条の◯`）を検出対象外とした（negative lookahead）
- `fix-legal-citations.mjs` も枝番パターンをスキップ
- 誤って生成されていた 17 件の枝番誤リンクは `C:/tmp/fix-branch-article-links.mjs`（使い捨てスクリプト）で剥がし、太字のみに変換済み

## 残 39 件の内訳（手動対応必要）

自動スクリプトで処理できなかったパターン:

- **「同法第◯条」**: 前出参照。文脈追跡が必要なため自動化せず。約20件
- **「労働組合法 第14条」**: 法令名と条番号の間に全角スペース。スクリプトの正規表現で拾えるよう改善の余地
- **一部の再出**: 初出のみリンクルールで2回目以降は意図的にスキップ（10件程度）
- **マップ未登録の法律**: 上記以外の個別法律（順次マップ拡充）

## e-Gov URL 形式の正当性検証

- 全31の unique base URL: HTTP 200 OK（2026-04-13 確認）
- `#Mp-At_◯` 形式: 法曹実務（[note.com/lovely_moose206](https://note.com/lovely_moose206/n/n99fea17e4db8)）で確認。「URL の末尾に `#Mp-At_a` と入れると条文に直接遷移できる」
- e-Gov は SPA のため curl では内部 anchor が見えないが、**ブラウザでは正しく遷移する**

## 使用した自動スクリプト

`scripts/fix-legal-citations.mjs` — dry-run / apply の2段階対応。バックアップは `C:/tmp/fix-legal-citations-backup/` に自動生成。
