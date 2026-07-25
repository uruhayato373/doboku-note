---
title: note 記事 公開前 拡充手順
---

# note 記事 公開前 拡充手順

`docs/note/{slug}/article.md` を **note 公開レベル** まで引き上げる作業手順の真実源。`note-prepublish-review` スキル（公開前チェック）と役割分離し、本ドキュメントは「**拡充作業の how**」を担う。

> [!note]
> **記事の導入・無料部分・販売導線の構成**は [note-selling-structures.md](note-selling-structures.md)（売れる9型）を参照する。本書は「網羅性・図版・段落分割」など拡充作業の how、向こうは「読者の悩みをつかみ購入理由を作る本文の型」。精読ガイドは勘違い破壊型・チェックリスト型が効く（B1 章構成・導入設計で適用）。

## 適用範囲

- `docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md` を中心とした「総監テキスト精読ガイド」シリーズ
- 原典：`docs/textbook/技術士（総監）/テキスト/総監標準テキスト/{管理名}.md`
- 安全管理（2026-05-08 完成）が参考実装。同シリーズの経済性／人的資源／情報／社会環境を段階的に拡充する際は本ドキュメントに従う

## 完成の定義

note 公開レベルとは以下を満たす状態：

| 項目 | 基準 |
|---|---|
| 行数 | 600-800 行（原典 1500-1700 行を note 用に圧縮） |
| 網羅率 | 原典の主要章・小節を 90% 以上カバー |
| 出題例 | 18-22 件（R03〜R07 から該当ブロックを抽出） |
| 図版 | 10-15 枚（note-svg-policy 準拠 PNG） |
| カバー画像 | 1280×670 PNG（中央 630×630 セーフティゾーン内） |
| インラインリンク | doboku-note キーワードページ + e-gov 条文 + 過去問アンカー |
| 段落 | 1段落 2-3 文・3 行以内 |
| 見出し | 番号なし（H2/H3 ともテキストのみ） |

## 工程一覧（順序つき）

```
B0: 原典との網羅性照合・本文全面リライト（最大工数）
B1: H1 設計＋章構成決定
B2: 過去問配置（核心論点直後に出題例ブロック）
B3: 過去問追加（R03〜R07 Grep から12-15件を網羅）
B4: トレードオフ章の3段階展開
B5: 段落分割＋見出し番号削除＋枝番削除
B6: e-gov 条文リンク＋ doboku-note キーワードリンク
B7: 図版生成（10-15 枚）
B8: カバー画像生成
B9: 文字化け／改行コード／リンク 404 チェック → commit + push
```

各工程を 1 commit 単位で進める（粒度はあとで参照しやすい）。

---

## B0: 原典との網羅性照合・本文全面リライト

最重要工程。多くの note 記事は「核心論点だけ抽出した薄い版」になっており、原典の網羅性を欠く。

### 手順

```bash
# 1. 原典の章構造を抽出
grep -n "^#" "docs/textbook/技術士（総監）/テキスト/総監標準テキスト/{管理名}.md" > /tmp/textbook-toc.txt

# 2. note 記事の章構造を抽出
grep -n "^#\|^\*\*[0-9一二三四五六七八九十]" "docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md" > /tmp/note-toc.txt

# 3. 両者を diff して欠落トピックを把握
diff /tmp/textbook-toc.txt /tmp/note-toc.txt
```

### 判断基準

- 原典 7 大章 → note も 7 大章を維持（5 章に統合しない。読者の試験対策では原典の構造が脳内マップになる）
- 原典の (1)(2)(3)... 小節 → note では太字 H3 相当として全カバー
- 原典の (a)(b)(c)... 枝番 → note では本文中の太字 + 改行で表現（枝番ラベル不要、B5 で整理）

### 文体ルール

- **コピペ禁止** — 原典をそのまま貼ると文体が硬く note の購読者に届かない
- **散文 + 「**強調** — 説明」混在型** — 安全管理 §2.4 リスク認知バイアスを参考実装とする
- **冒頭リード文 → 主要トピック → 引っかけ／頻出ポイント** の順でまとめる
- **「択一では…」「記述式論文では…」** を各小節末尾に1行入れて試験対策視点を明示

### 出力規模の目安

| 章 | 原典行数 | note 行数 |
|---|---|---|
| 第1章 事業企画 | 250-400 | 100-150 |
| 第2章 品質管理 | 100-200 | 80-120 |
| 第3章 工程管理 | 350-500 | 150-200 |
| 第4章 原価管理 | 100-150 | 60-80 |
| 第5章 財務会計 | 100-150 | 60-80 |
| 第6章 設備管理 | 100-150 | 50-80 |
| 第7章 数理的手法 | 200-300 | 80-120 |
| トレードオフ章 | （原典なし） | 100-150 |

合計 600-800 行。

---

## B1: H1 設計＋章構成決定

### H1 のルール

```markdown
# {管理名}｜総監キーワード精読ガイド｜{サブタイトル}
```

- **カギ括弧（「」）禁止** — `generate-note-covers.mjs` の wrap で行頭・行末分割される
- **メインタイトルは管理名（4-6 文字）** — カバー画像で大きく表示される最大要素
- **サブタイトル `｜...` 以降** — `extractTitle()` が切り捨てるため自由に書ける（SEO 視点で使える）

### 例（安全管理）

```markdown
# 安全管理｜総監キーワード精読ガイド｜択一・記述直結リンク付き
```

extractTitle 後の表示：「安全管理」（カバーで大きく表示、note 一覧でインパクト）。

### 章タイトル

```markdown
## {章名}（優先度: 高/最高/中〜高/中）
```

優先度ラベルは note 読者が「どこから読むか」決める判断材料。原典の章順は維持。

---

## B2: 過去問配置

### 配置位置

各小節の **核心論点を解説した直後** に出題例ブロックを挿入。章末配置は禁止（直前小節と無関係な出題が来ると違和感）。

### 引用ブロックのテンプレ

```markdown
> **【出題例: [R{NN}年度 Ⅰ-1-{NN}](https://doboku-note.com/docs/pe-comprehensive-management-r{NN}-primary?utm_source=note&utm_medium=referral&utm_campaign=99-{slug}#1-{NN})】** {問題冒頭の文}。{選択肢{X}}.「{誤答内容}」→ **正答{X}：{正解の説明}。**
```

### 過去問アンカーの仕組み

- doboku-note 過去問ページの見出し `## Ⅰ-1-{NN}` は `rehype-slug`（`src/lib/toc.ts:11`）で `#1-{NN}` の id が自動生成される
- ローマ数字「Ⅰ」は `\w` 範囲外で除去されるため、結果として `1-{NN}` になる
- 形式は `consumer-safety/article.mdx:33` などに既存例多数

### 出題例文の作成手順

1. R0X-primary article.mdx の該当問題本文＋ `<details>` の解答解説を Read
2. 問題のテーマ・核心引っかけを 1 文に圧縮
3. 正答番号の選択肢のみ引用（全選択肢は note 文体で重い）
4. 「→ **正答{X}：…**」で核心結論を明示

---

## B3: 過去問追加

### 抽出方法

```bash
# 対象法令（管理）に該当する出題範囲を Grep
for f in r03-primary r04-primary r05-primary r06-primary r07-primary; do
  grep -A 2 "^## Ⅰ-1-{範囲}" ".local/r2/posts/pe-comprehensive-management/$f/article.mdx"
done
```

範囲の目安：
- 安全管理：Ⅰ-1-25〜Ⅰ-1-32（5年×8問=40問）
- 経済性管理：Ⅰ-1-1〜Ⅰ-1-15
- 人的資源管理：Ⅰ-1-16〜Ⅰ-1-23
- 情報管理：Ⅰ-1-33〜Ⅰ-1-40
- 社会環境管理：Ⅰ-1-25〜Ⅰ-1-29 中の社会環境系（境界曖昧）

### 採否基準（推奨 12-15 件）

- **本文で「頻出」「定番」「最頻出」と明示している小節** に該当する問題は必ず採用
- バイアス・OSHMS・BCP・警戒レベル・FTA計算など **マッチング型・計算型** は採用優先度高
- 同一小節に複数候補があるときは、最新年度（R07 > R06 > R05）を優先

---

## B4: トレードオフ章の3段階展開

### 構造

```markdown
## 記述式で使う「{管理名} × 他の管理」トレードオフ

{導入リード3-4 文}

![{管理名} × 他4管理 — 3段階トレードオフマトリクス](img/figure-N-tradeoff-map.png)

### {管理名} × 経済性管理（{白書テーマ}）

**対立の構造** — {対立内容3 文}。

**評価軸：{短期 vs 中長期 / 効率 vs 安全}**。

**解決フレームワーク**

- **{フレーム1}** — {内容}
- **{フレーム2}** — {内容}
- **{フレーム3}** — {内容}

**残余リスクと監視** — {残余リスク2 文}。
```

### 4 ペア × 3 段階の発想元

国土交通白書（最新版：[令和7年版](https://www.mlit.go.jp/hakusyo/mlit/r06/hakusho/r07/index.html)）の現行課題と直結させる：

- 経済性 × 安全：インフラ老朽化と予防保全（事故リスク vs 短期コスト）
- 経済性 × 人的資源：2024 年問題（生産維持 vs 教育コスト）
- 経済性 × 情報：DX 投資（生産性 vs 投資不確実性）
- 経済性 × 社会環境：脱炭素・流域治水（環境負荷 vs 短期コスト）

### 解決フレーム辞書（汎用化可能なもの）

| フレーム | 出典 | 適用領域 |
|---|---|---|
| ALARP 原則 | リスクマネジメント | 安全 × 経済性 |
| RBM（リスクベースメンテナンス） | 設備管理 | 経済性 × 安全 |
| ミティゲーション階層（回避→低減→代替→代償） | 環境影響評価法 | 安全 × 社会環境 |
| 段階的実施（PoC） | DX | 経済性 × 情報 |
| 結果事象アプローチ | BCP/BCM | 危機管理全般 |
| オールハザードアプローチ | 危機管理 | 安全 × 社会環境 |
| 多層防御・OT セキュリティ | サイバー | 安全 × 情報 |
| 勤務間インターバル制度（11時間） | 労働安全衛生 | 安全 × 人的資源 |

---

## B5: 段落分割＋見出し番号削除＋枝番削除

### 段落分割ルール

- **目安：1段落 2-3 文・3 行以内**
- **1文1段落は禁止** — ぶつ切りで論理が見えなくなる
- **接続詞を段落冒頭に置く** — 「一方で」「さらに」「ただし」を新段落の頭にして流れを保つ
- **「評価軸：xxx」は独立段落にする** — トレードオフ章
- **文章リライトはしない** — 改行調整のみ
- **決定論ツールで一括適用可**: `npm run note-reflow -- [--target N] <file|dir>`（`scripts/reflow-note-paragraphs.mjs`）。>120 字の段落を文（。）境界で再パッキング（語句不変・改行のみ）。答案本文（`## 試験問題` 以降）・見出し・**画像行（`![` で始まる行）**・箇条書きは自動保護。`--dry` で点検先行。詳細: `content-principles.md §14-e`

### 番号削除（一括）

Python で機械的に削除（CRLF 改行コード保持）：

```python
import re
path = "docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md"
with open(path, "rb") as f:
    content = f.read()

# サブセクション番号削除：**N.M タイトル** → **タイトル**
new_content = re.sub(rb'\*\*(\d+\.\d+) (.+?)\*\*', rb'**\2**', content)

# H2 章番号削除：## N. xxx → ## xxx（手動 Edit 推奨）
# ## 1. → ## だけ Edit ツールで7箇所手動

# H3 番号削除：### N.M タイトル → ### タイトル
new_content = re.sub(rb'### (\d+\.\d+) (.+)', rb'### \2', new_content)

# 枝番削除：**（a）xxx** → **xxx** （全角括弧、a-e）
new_content = re.sub(rb'\*\*\xef\xbc\x88[a-e]\xef\xbc\x89(.+?)\*\*', rb'**\1**', new_content)

with open(path, "wb") as f:
    f.write(new_content)
```

### 残す要素

- 数字付き箇条書き（`1. 人命の保護が最大限図られること`）— 順序情報
- ハイフン箇条書き（`- 設計上の欠陥／製造上の欠陥`）
- 引用ブロック（`> **【出題例: ...】**`）

---

## B6: e-gov 条文リンク＋ doboku-note キーワードリンク

### e-gov リンクの URL 形式

```
https://laws.e-gov.go.jp/law/{法令番号}#Mp-At_{条番号}
```

枝番条文：`#Mp-At_{N}_{M}` 形式（例：第66条の10 → `#Mp-At_66_10`）

### 法令番号の取得

1. 既存の doboku-note キーワードページから流用：
   ```bash
   grep -roh "laws\.e-gov\.go\.jp/law/[A-Z0-9]\+" .local/r2/posts/pe-comprehensive-management/ | sort -u
   ```
2. 不足分は WebSearch + WebFetch で実在確認（`feedback_url_verification.md` 準拠）

### 主要法令番号（経済性管理で使用想定）

| 法令 | 法令番号 |
|---|---|
| 民法 | 129AC0000000089 |
| 商法 | 132AC0000000048 |
| 会社法 | 417AC0000000086 |
| PFI 法 | 411AC0000000117 |
| 建設業法 | 324AC0000000100 |
| 入札契約適正化法 | 412AC0000000127 |
| 公共サービス改革法 | 418AC0000000051 |

不明法令は WebSearch で取得。

### doboku-note キーワードリンクの方針

- **すべての概念名（キーワード）は最初の登場時にリンク化**
- 既存記事は `note-link-injector` エージェントが自動注入できる（`/note-prepublish-review` で起動）
- UTM パラメータ：`?utm_source=note&utm_medium=referral&utm_campaign=99-{slug}`

---

## B7: 図版生成

### スクリプト雛形

`scripts/render-figure-safety-management.mjs` を参考に `scripts/render-figure-{管理名スラッグ}.mjs` を新規作成。

### 必須仕様（note-svg-policy 準拠）

- キャンバス幅 1200（同一記事内で統一）
- フォント：本文 22px 以上、メインタイトル 32-36px、補足 18px、**16px 未満は禁止**
- 表は 8 行 × 4 列まで（超える場合は分割）
- 余白：要素間 24px、ヘッダ↔データ行 40px、データ行↔凡例 40px
- ウォーターマーク不要（ユーザー指示）：`brandFrame` を `return ''` に
- カラートークン：`#2e6da4` (brand) / `#1a3a5c` (brand-deep) / `#3a7d44` (positive) / `#d4a017` (warn) / `#b22234` (danger) など

### 図版テーマ候補（管理別）

**経済性管理**：
- 投資判断3手法（NPV / 回収期間 / ROI）比較
- QC7つ道具 一覧
- 新QC7つ道具 一覧
- PERT ネットワーク（クリティカルパス強調）
- 工程能力指数 Cp/Cpk の規格との関係
- B/S・P/L・C/F の関係図
- 開発プロセス5種比較（ウォーターフォール／V字／スパイラル／アジャイル／イテレーティブ）
- AHP マトリクス
- ABC（活動基準原価計算）の計算フロー
- トレードオフ3段階マトリクス（4ペア × 3列）

### 検証手順

```bash
# フォントサイズ規約違反チェック
for f in docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/img/figure-*.svg; do
  echo "=== $f ==="
  grep -o 'font-size="[0-9]*"' "$f" | sort -u
done
# → 16 未満が出たら修正

# PNG レンダリング目視
# Read tool で各 PNG を確認、レイアウト重なり・密度過多を判定
```

---

## B8: カバー画像生成

### コマンド

```bash
node scripts/generate-note-covers.mjs {管理名スラッグ}
# → docs/note/{slug}/img/cover.{svg,png} が生成される
```

### デザイン: V4（crop-safe・既定）

`article.md` frontmatter の `cover:` ブロックは **V4（`variant: crop-safe-v4`）が既定**（2026-07-24 全量移行済み・試験区分=ベース色は dir から自動解決）。cover: ブロック自体が無ければ `mono-tag`（`coverTitle` から）にフォールバック。旧 G2「全幅バナー帯」（banner/chips/meta）はレガシーで新規に書かない。

```yaml
cover:
  variant: crop-safe-v4
  leadIn: "1級土木｜第2次検定"        # 資格・試験区分 8〜18字
  headline: "安全管理 完成答案"       # 主題 4〜8字目安・最重要（70px固定・590pxに一行）
  hi: "R7"
  hiSuffix: "対応"                    # hi+hiSuffix 合計 2〜7字
  benefit: "書き換えてそのまま使える"  # 読後価値 8〜15字
```

コピー規則・字数上限・安全領域 → `.claude/knowledge/design-system/note-cover-crop-safe-v4.md`（SSOT）、値 → `note-cover-tokens.json`。

### H1 の確認（mono-tag フォールバック時）

`cover:` が無い記事はカバー中央タイトルを `extractTitle(H1)` で抽出する（`generate-note-covers.mjs`）。

- `｜` 以降は切り捨て
- `【...】` は除去
- カギ括弧は wrap で分割される → **B1 で除去済みであるべき**

### 検証

- 中央 630×630 セーフティゾーン内にバナー帯テキスト・強調キーワードが収まる（`--debug-safety` で赤枠確認。これは note-cover-g2 の話。mono-tag フォールバックは 2026-06-16 以降は全幅化しており中央枠制約は適用しない）
- note 一覧・リンクカードの中央クロップでも欠けない（バナーは自動で 590px 幅にフィット）
- `1280×670` のサイズが維持されている

---

## B9: 検証 → commit + push

### 必須チェック

```bash
# 1. 文字化け（U+FFFD）
grep -c $'\xef\xbf\xbd' docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md
# → 0 であること

# 2. 改行コード混在チェック（docs/note/ は警告のみ、ブロックされない）
file docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md
# → CRLF または LF 統一

# 3. 図版ファイル存在チェック
ls docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/img/figure-*.png

# 4. リンク 404 防止（内部 slug + アンカー断片を決定的に検証）
npm run check-links -- --scope note
# → docs/note/** 全体を走査。BROKEN_SLUG / BROKEN_ANCHOR が 0 であること。
#   PLACEHOLDER（未発売マガジン）は INFO 表示でブロック対象外。
#   絶対 URL（https://doboku-note.com/docs/...）・裸 URL のリンクカードも対象。

# 5. e-gov リンク確認
grep -oE 'laws\.e-gov\.go\.jp/law/[A-Z0-9]+' docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md | sort -u
# → WebSearch で実在確認済みの法令番号と突合

# 6. note 非互換ゲート（pipe表・太字内全角括弧・マガジンCTA形式 = markdown リンク/同一行¥）
node scripts/note-lint.mjs docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md
# → ✅ OK であること。commit 時に pre-commit でも自動 BLOCK（content-principles.md §14-c）。
#   マガジン導線は markdown リンクでなく bare URL 単独行・CTA に価格(¥)を書かない。

# 7. 段落長 WARN（note 可読性・content-principles.md §14-e）
npm run note-reflow -- --dry docs/note/magazines/総監テキスト精読ガイド/5管理-{管理名}/article.md
# → >120字段落の件数を WARN（0件でなくても GO 可・編集判断）。長段落は note-reflow で一括分割可（語句不変）。
```

### commit 戦略

- 工程ごとに分けて commit（B0 で 1コミット、B2-B3 で 1コミット...）
- メッセージ形式：`content(pe): {管理名} note 記事 — {工程の要約}`
- **`git add .` 禁止** — 自分が変更したファイルだけ明示指定
- 並行作業の他ファイルは触らない

### push 先

- ドキュメント系として `develop` 直 push（CLAUDE.md「性質別運用ガイド」）
- PR 不要（小修正の積み重ね）

### 最終確認：`/note-prepublish-review` 実行

すべての工程が完了したら既存スキルで品質ゲートを通す：

```
/note-prepublish-review {管理名スラッグ}
```

inline チェック（pipe・blockquote・U+FFFD・404・太字レンダリング崩れ）+ 3 並列エージェント（link-injector / figure-auditor / fact-checker）で最終検証。

---

## 進捗管理（推奨：TaskCreate）

工程数が多い（B0〜B9 = 10 工程）ため、TaskCreate で各工程を独立タスクとして登録し、in_progress / completed を逐次更新する。

```
B0: 原典との網羅性照合・全面リライト
B1: H1 設計＋章構成決定
B2: 過去問配置
B3: 過去問追加
B4: トレードオフ章
B5: 段落分割＋番号削除
B6: 条文・キーワードリンク
B7: 図版生成
B8: カバー画像生成
B9: 最終検証＋commit/push
```

---

## 参考実装

- **安全管理（完成版）**：`docs/note/技術士総監/magazines/総監テキスト精読ガイド/5管理-安全管理/article.md`（806行・19出題例・12図版・カバー画像・全条文 e-gov リンク済み）
- **図版生成スクリプト**：`scripts/render-figure-safety-management.mjs`
- **カバー生成**：`scripts/generate-note-covers.mjs`
- **既存スキル**：`.claude/skills/quality/note-prepublish-review/SKILL.md`（公開前チェック）
- **図版品質**：`.claude/knowledge/reference/note-svg-policy.md`
- **記事品質**：`.claude/knowledge/reference/content-principles.md`

## 改訂履歴

- 2026-05-08：安全管理 note 記事の作業履歴をもとに初版作成
- 経済性管理着手時に B0 工程の重要性を反映（網羅率 25% スタートのケースに対応）
