# 月間計画 — 2026年6月

**フォーカス**: 建設部門 note 商品の公開完了。試験まで残り約1ヶ月の直前訴求。
**参照**: [annual.md](./annual.md) §6月

**なぜ今月が最重要か**: 6〜7月は年間売上の50%以上が集中するピーク（annual.md §収益モデル）。技術士二次の筆記（7月上旬）まで残り約1ヶ月で、17,730人の受験者全員が直前対策モードに入っている。この期間に BK-I〜BK-11 が揃っていないと、年間の主要収益機会を大半取り逃す。**BK-08〜BK-11 を後回しにするのは**、港湾・電力・鉄道・トンネル科目は受験者規模が小さく、投入コストに見合わないため（annual.md §注力しない領域）。

---

## 今月のゴール

1. **建設部門 BK-I（必須科目I）を note 投稿** — 17,730人の全受験者対象。最優先。
2. **建設部門 BK-01〜BK-11（11科目別）を note 投稿** — 科目別マガジン完成。
3. **SNS 直前訴求** — X / IG Reels / IG Carousel で技術士二次直前コンテンツを毎日配信。

---

## タスク一覧

### note 投稿（🔴 最高優先）

| タスク | 状態 | 期限 |
|---|---|---|
| BK-I（必須科目I）note 投稿 | 未着手 | 今週中 |
| BK-01（道路）note 投稿 | 未着手 | 6月中旬 |
| BK-02（河川・砂防）note 投稿 | 未着手 | 6月中旬 |
| BK-03（都市計画）note 投稿 | 未着手 | 6月中旬 |
| BK-04〜BK-07 note 投稿 | 未着手 | 6月下旬 |
| BK-08〜BK-11 note 投稿 | 未着手 | 後回し可 |

### SNS（🟡 高優先）

| タスク | 状態 |
|---|---|
| X 日次投稿（技術士二次直前シリーズ） | 継続中 |
| IG Reels「設問の書き方の型」 | 継続中 |
| IG Carousel「R08出題テーマ予測」 | 未着手 |
| X 引用リポスト（x-repost、1日2〜3件） | 継続中 |

### インフラ・サイト（🟢 中優先）

| タスク | 状態 |
|---|---|
| AdSense 再申請完遂 | 進行中 |
| pe-construction visible:true 化（noteURL確定後） | 待機中 |

---

## 今月やらないこと

- コンクリート診断士 cd-essay（来年向け、急がない）
- iOS アプリ（Web月収¥15k達成後）
- BK-08〜BK-11（港湾・電力・鉄道・トンネル）の投稿（受験者規模小）

---

## バックログ（次月以降）

### 1級土木 テキストページの品質改善（🟡 次月以降）

**発端**: `/docs/civil-construction-1-textbook-site-investigation` 等で発覚

**問題点**:
1. **頻出論点 Callout の内容が多すぎる** — 1つのCalloutに詰め込みすぎで読みにくい。箇条書き数を絞るか複数に分割する
2. **記事冒頭に Callout が来るのはおかしい** — 本文の導入なしにいきなり Callout は構成として不自然。本文（概要・説明）を先に書き、Callout は補足・強調として中盤以降に配置する

**対応方針**:
- 対象スコープ: `civil-construction-1` の textbook 系ページ全件
- `civil-construction-review` エージェントで一括監査 → `civil-textbook-rewriter` で修正
- スキル: `/quality-cycle --profile civil-textbook`

**参考 URL**: `https://doboku-note.com/docs/civil-construction-1-textbook-site-investigation`

---

### 記事構成ルールの SSOT 化 + サブエージェント管理（🟡 次月以降）

**背景**: ガイド記事の薄さ・Callout 配置の問題・導入なし冒頭など、記事品質の問題が個別に発覚している。これらを都度バックログに書くのではなく、**記事構成ルールを SSOT に集約し、サブエージェントで強制・評価する仕組み**を整える。

**やりたいこと**:

#### 1. 記事構成ルール SSOT を作成する

`docs/reference/article-structure-guide.md`（新設予定）<!-- doc-ref:ignore --> を新設し、以下を定義:
- **記事の基本構成**（導入 → 本文 → まとめ → CTA の型）
- **文字数目標**（ガイド記事 3,000字以上・テキスト記事 1,500字以上 等）
- **Callout の使い方**（冒頭禁止・中盤以降の補足に限定・1記事3個以内 等）
- **見出し構成**（H2 のみ・H1 は frontmatter から自動生成）
- **内部リンクの配置**（本文末に関連記事・サイドバー誘導）
- **CTA の型**（note マガジン誘導・過去問へのリンク）
- たけブログ（`docs/todo/reference-sites.md`）の知見を反映（見出し構成テンプレ・導入3パターン等）

#### 2. ガイド記事専用 Generator エージェントを新設する

現状の `civil-textbook-rewriter` はテキスト記事向け。ガイド記事（3,000字以上・SEO重視）には専用エージェントが必要。

- エージェント名（案）: `civil-guide-writer`
- 真実源: `article-structure-guide.md` を読んで構成を決定
- 入力: 記事 slug・対象資格・ターゲットキーワード
- 出力: 3,000字以上の MDX（frontmatter 含む）

#### 3. todo の書きぶり・グループ構成を SSOT 化し `todo-planner` に参照させる

現状の `docs/todo/monthly.md` はバックログ項目の書き方・優先度表記・グループの切り方がバラバラ。  
**`docs/reference/todo-writing-guide.md`（新設予定）**<!-- doc-ref:ignore --> に todo 記述ルールをまとめ、`todo-planner` エージェントがこれを読んで weekly.md を書くようにする。

定義すべきルール:
- バックログ項目の必須フィールド（発端 URL・問題・対応方針・対象スコープ・実装ファイル）
- 優先度の表記統一（🔴 今週 / 🟡 今月 / 🟢 次月以降 + 期限目安）
- グループの切り方（コンテンツ系 / UI 系 / SEO 系 / エージェント系 / インフラ系）
- weekly.md の必須セクション（今週のゴール / 🔴 必須 / 🟡 準優先 / 🟢 余裕があれば）
- Codex 候補の表記ルール（`[Codex候補]` タグ + 根拠）

**SSOT の分割**:

| SSOT ファイル | 内容 | 参照するエージェント |
|---|---|---|
| article-structure-guide.md（新設予定） | 記事構成・文字数・Callout・CTA の型 | `civil-guide-writer` / `civil-textbook-rewriter` / `keyword-rewriter` |
| todo-writing-guide.md（新設予定） | todo 記述フォーマット・優先度・グループ定義 | `todo-planner` |

**着手順**:
1. たけブログ（`docs/todo/reference-sites.md`）の記事構成ノウハウを整理
2. `docs/reference/article-structure-guide.md`（新設）を起草（Claude Code でドラフト → ユーザーレビュー）<!-- doc-ref:ignore -->
3. `docs/reference/todo-writing-guide.md`（新設）を起草（現在の monthly.md の書き方を分析して抽象化）<!-- doc-ref:ignore -->
4. `civil-guide-writer` エージェントを新設（article-structure-guide.md を真実源として参照）
5. `todo-planner` エージェントの description に todo-writing-guide.md 参照を追加
6. `docs/todo/monthly.md` のフォーマットを新ルールに合わせて整理

---

### 2級土木（＋1級土木）ガイド記事の充実・SEO 強化（🟡 次月以降）

**発端**: `https://doboku-note.com/category/civil-construction-2` のガイド記事が内容薄い

**現状（語数確認済み）**:

| 記事 | 語数 |
|---|---|
| guide-schedule-management | 137語 |
| guide-quality-management | 153語 |
| guide-study-method | 153語 |
| guide-concrete-key-points | 157語 |
| … | … |
| guide-exam-overview（最大） | 262語 |

全14本が 137〜262語。SEO で上位表示を狙うには最低 800〜1500語が目安で、現状は全本不足。1級土木ガイドも同様（123〜262語）。

**やりたいこと**:
1. **既存ガイドの増量リライト** — 各ガイドの主要論点を深掘りし、合格体験談・具体的な勉強法・試験傾向を加えて **3,000文字以上**に増量
2. **SEO キーワード設計の見直し** — `seoTitle` / `description` を検索意図に合わせて最適化（例: 「2級土木施工管理技士 勉強方法」「2級土木 合格率」など）
3. **不足している記事テーマの追加** — 競合サイトが持っていて doboku-note にない記事を追加（例: 合格率・難易度比較・おすすめ参考書詳細レビュー）
4. **内部リンク強化** — ガイド記事から過去問・テキストページへの誘導を増やす

**文字数目標**: 3,000文字以上（現状は全本 500〜1,000文字程度と推定、3〜5倍の増量が必要）

**優先度（着手順）**:
- `guide-exam-overview`（最も検索ニーズが高い・現状でも最大の262語）を最初に 3,000文字超にリライト → 成果を見て残りに展開
- `guide-study-method`・`guide-study-plan` も需要が高い（「勉強方法」「学習計画」は検索ボリューム大）

**担当スキル**: `civil-textbook-rewriter` エージェント（guide 系にも適用可）または新規 `civil-guide-rewriter` エージェント

**参考 URL**: `https://doboku-note.com/category/civil-construction-2`

---

### 過去問の `## 関連コンテンツ` を廃止し `RelatedArticles` コンポーネントへ移行（🟡 次月以降）

**発端**: `https://doboku-note.com/docs/civil-construction-2-primary-r07-zenki`

**現状の問題（2点）**:

1. **配置が悪い**: MDX 末尾に `## 関連コンテンツ` H2 + `<RelatedKeywords>` が直書きされていて、AuthorCard の後に埋まっている。記事本文の一部として扱われているが、ナビゲーション要素なので page.tsx レイヤーで制御すべき。

2. **リンク先が間違い**: 2級土木 primary 過去問の `<RelatedKeywords>` が「1級土木 R07 問題A」など**他の過去問ページ**を指している。本来は各設問に関連する**キーワードページ・テキストページ**へのリンクであるべき（CEM 総監キーワードページの `<RelatedKeywords>` が正解例：「業績考課」「目標管理制度（MBO）」等の概念ページへリンク）。

```mdx
<!-- 現状（問題） -->
## 関連コンテンツ
<RelatedKeywords items={[
  { label: "1級土木 R07 問題A（土木一般・専門・法規）", slug: "civil-construction-1-primary-r07-a" },
  { label: "1級土木 R07 問題B（施工管理）", slug: "civil-construction-1-primary-r07-b" },
]} />
```

**やりたいこと**:

#### 1. MDX 末尾の `## 関連コンテンツ` を削除する

過去問 MDX から `## 関連コンテンツ` H2 と `<RelatedKeywords>` の関連過去問リンク部分を全削除。対象は `civil-construction-2/primary-r*` 系（同パターンを grep で全特定）。

#### 2. `RelatedArticles` コンポーネントを page.tsx レイヤーで実装する

`src/app/docs/[...slug]/page.tsx` の DocCard の下（AuthorCard の前）に `RelatedArticles` を追加。MDX には書かず、page.tsx が frontmatter の `category` + `tags` を読んで自動生成する。

- **コンポーネント**: `src/components/ui/RelatedArticles/RelatedArticles.tsx`（新規）
- **入力**: 現在のページの `category`・`tags`・`slug`
- **出力**: 同 category の近傍ページ（タグマッチ上位3〜5件）をカード形式で表示
- **共通化**: 全資格・全記事種別で同じコンポーネントを使う（カテゴリ別に設定は不要）

#### 3. 過去問の `<RelatedKeywords>` をキーワード・テキストページへのリンクに修正する

各設問の論点に対応する**キーワードページ・テキストページ**をリンク先に変える。CEM 総監キーワードページが正解例。

| 記事種別 | 現状 | あるべき姿 |
|---|---|---|
| CEM キーワードページ | 概念キーワードページへのリンク | ✅ 正しい |
| 2級土木 primary 過去問 | 他の過去問ページへのリンク | ❌ → テキスト・キーワードページへ変更 |
| 1級土木 primary 過去問 | 要確認 | 確認後対応 |

**着手順**:
1. `civil-construction-2/primary-r*` の `## 関連コンテンツ` を一括削除
2. `RelatedArticles` コンポーネントを実装（backlinks インデックス活用）
3. 2級土木 primary 各設問の正しい関連キーワードを追記（`past-exam-rewriter` エージェント活用）

**参照**: `.claude/state/indexes/backlinks.json`（既存のバックリンクインデックス）

---

### 2級土木 二次過去問の `- （1）` 二重表記を修正（🟡 次月以降）

**発端**: `https://doboku-note.com/docs/civil-construction-2-secondary-r07`

**問題**: 箇条書きマーカー（`-`）と全角括弧番号（`（1）（2）`）が二重に付いていて視認性が悪い。

```mdx
<!-- 現状（問題） -->
- （1）工事名
- （2）工事現場における施工管理上のあなたの立場

- （1）具体的な現場状況と特に留意した安全管理上の技術的課題
- （2）（1）で記述した技術的課題を解決するために検討した項目と…
```

原因: 試験問題の原文が `（1）（2）` 形式で番号を振っているが、MDX に変換する際に `-` の箇条書きも付けてしまっている。

**修正方針**: `-` を外してプレーンな段落として記述し直す（`（1）` が番号として機能するため `-` は不要）

```mdx
<!-- 修正後 -->
（1）工事名

（2）工事現場における施工管理上のあなたの立場
```

または設問構造が明確な箇所は `<SpecSheetList>` への置き換えも検討。

**対象ファイル（確認済み・計6本）**:
- `civil-construction-2/secondary-r03〜r07`（5本）
- `civil-construction-1/secondary-r07`（1本）

**修正担当**: `past-exam-rewriter` エージェント or 一括スクリプト（MDX frontmatter を除いたボディのみ対象、CRLF 保持必須）

---

### 1級土木 テキスト画像のカラー化（🟡 次月以降）

**背景**: textbook 系ページに現在貼られている画像は WebSearch で拾った代替画像。本来は `docs/textbook/１級土木施工管理技士/` 配下の PDF から切り出した白黒図を使うべきで、それを ChatGPT でカラー化して差し替える。

**対象**: 画像を持つ textbook ページ 14本・約250枚
```
textbook-construction-machinery-01  (46枚)
textbook-construction-machinery-02  (50枚)
textbook-schedule-management        (48枚)
textbook-surveying                  (36枚)
textbook-crane                      (14枚)
textbook-demolition                 (14枚)
textbook-grader-compaction          (10枚)
textbook-distance-angle             ( 8枚)
textbook-construction-mgmt-overview ( 8枚)
textbook-quality-inspection         (未確認)
textbook-scraper                    ( 4枚)
textbook-leveling                   ( 2枚)
textbook-loader                     ( 2枚)
textbook-tractor-bulldozer          ( 2枚)
textbook-transport-machinery        ( 6枚)
```

**PDF と章の対応**
| textbook ページ群 | 参照 PDF |
|---|---|
| grader-compaction / machinery-01/02 / crane / scraper / loader / tractor / transport / shovel | `テキスト（土木一般編）/第２章_建設機械.pdf` |
| site-investigation | `テキスト（土木一般編）/第１章_土工.pdf` |
| surveying / distance-angle / leveling | `テキスト（土木一般編）/第５章_測量.pdf` |
| demolition | `テキスト（土木一般編）/第６章_解体工事.pdf` |
| schedule-management / schedule-charts 等 | `テキスト（施工管理・法規編）/` 配下の該当 PDF |

**作業手順（1ページ単位で繰り返す）**

1. **対応 PDF を特定し、該当ページを特定する**
   - MDX の本文・見出しから図が何の説明かを読む
   - PyMuPDF でページ画像をレンダリングして目視確認
   ```bash
   python -c "import fitz; doc=fitz.open('docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/第２章_建設機械.pdf'); page=doc[N]; mat=fitz.Matrix(2,2); pix=page.get_pixmap(matrix=mat); pix.save('.tmp/page-N.png')"
   ```

2. **白黒図を PNG で切り出す**
   - 上記でレンダリングした PNG からトリミング（必要なら手動クロップ）
   - または `pdfimages -png` でページ内の画像を直接抽出
   ```bash
   pdfimages -png -f N -l N "docs/textbook/.../第２章_建設機械.pdf" .tmp/extracted
   ```

3. **ChatGPT でカラー化する**
   - GPT-4o（画像編集モード）に白黒 PNG をアップロード
   - プロンプト例:
     > 「この白黒の建設機械の技術図をカラーに変換してください。線・ラベル・構造を完全に維持したまま、実機に近い現実的な配色を付けてください。背景は白のままにしてください。」
   - 出力 PNG をダウンロード → `.tmp/colorized-{name}.png` に保存

4. **既存の web 検索画像と差し替える**
   ```bash
   # 旧画像を削除（または退避）
   rm ".local/r2/posts/civil-construction-1/{slug}/img/{old-name}.jpg"
   rm ".local/r2/posts/civil-construction-1/{slug}/img/{old-name}.webp"
   # カラー化画像を配置
   cp .tmp/colorized-{name}.png ".local/r2/posts/civil-construction-1/{slug}/img/{name}.png"
   ```

5. **webp に変換する**
   ```bash
   npm run generate-webp
   ```

6. **MDX の参照ファイル名を更新する**（ファイル名が変わった場合のみ）
   - `<ArticleImage src="img/{old}.webp"` → `<ArticleImage src="img/{new}.webp"`

7. **インデックス再生成してコミット**
   ```bash
   npm run refresh-indexes
   git add .local/r2/posts/civil-construction-1/{slug}/
   git commit -m "img(civil-textbook): {slug} の画像をテキスト白黒→ChatGPTカラー化に差替"
   ```

8. **R2 同期は CI が自動実行**（main push 後に `r2-sync.yml` が `**/img/**` を同期）

**進め方の推奨**
- 1回のセッションで 1ページ（1章）単位で進める（画像数が多いため）
- まず `textbook-grader-compaction`（10枚）で手順を確立してから残りに横展開
- ChatGPT のカラー化品質が不十分な場合は `image-policy.md` の代替ソース（CC/PD 写真）を検討

**進捗メモ**（着手したら更新）
- [ ] textbook-grader-compaction（手順確立パイロット）
- [ ] textbook-construction-machinery-01
- [ ] textbook-construction-machinery-02
- [ ] textbook-crane
- [ ] textbook-scraper / loader / tractor / transport
- [ ] textbook-surveying / distance-angle / leveling
- [ ] textbook-demolition
- [ ] textbook-schedule-management
- [ ] textbook-construction-mgmt-overview

---

### カテゴリページ右サイドバーに note リンクを追加（🟡 次月以降）

**発端**: `https://doboku-note.com/category/civil-construction-2` の右サイドバーにアフィリエイト広告しかない。note 記事・マガジンへのリンクも並べて回遊・購入導線を強化したい。全資格カテゴリで同様に対応する。

**現状の実装**（`src/app/category/[slug]/page.tsx`）:
- 右サイドバー（`<aside>`）は `careerSidebar` が true のとき＝civil 系カテゴリのみ表示
- 中身は `<SidebarAdBanner>`（転職アフィリ）1つだけ
- note マガジン CTA はメインコンテンツ内に表示されているが、サイドバーにはない
- 総監など civil 以外のカテゴリは右サイドバー自体が存在しない

**やりたいこと**:
1. 右サイドバーに、そのカテゴリに関連する note マガジン・記事のリンクリストを追加
2. civil 以外の資格カテゴリ（pe-comprehensive-management 等）にも右サイドバーを表示する
3. アフィリ広告は残しつつ、その下（または上）に note リンク群を sticky で表示

**実装方針（案）**:
- `resolveCategoryMagazines`（既存）でそのカテゴリに紐づくマガジン一覧を取得済み → これをサイドバーにも流用する
- サイドバー表示条件を `careerSidebar || categoryMagazines.length > 0` に拡張
- note リンクの UI は既存の `<MagazineCard>` またはシンプルなリンクリスト（タイトル + 価格 + arrow）
- sticky で追従させる（アフィリと同じ `sticky top-6` コンテナ内に並べる）

**対象カテゴリ**（note マガジンが存在する資格）:
- `civil-construction-1`（1級土木）
- `civil-construction-2`（2級土木）
- `pe-comprehensive-management`（技術士総監）
- 今後追加される資格も同様

**参考 URL**: `https://doboku-note.com/category/civil-construction-2`

---

### AuthorCard の資格別カスタマイズ + 右サイドバー配置（🟡 次月以降）

**発端**: `https://doboku-note.com/docs/pe-construction-bousai-genseigai-ronbun-keyword` など建設部門の記事末尾に「note で総監 R08 対策の続編を発信中」と表示されていて資格と噛み合っていない。

**現状の問題**（`src/components/ui/AuthorCard/AuthorCard.tsx`）:
- `AUTHOR.noteUrl` / `AUTHOR.noteLabel` が `src/config/author.ts` にハードコード → 全資格・全記事で総監リンクが出る
- AuthorCard は記事末尾（`src/app/docs/[...slug]/page.tsx`）に固定配置、右サイドバーにはない

**やりたいこと**:

#### 1. note リンクを資格別に出し分ける

記事の `category`（frontmatter）から資格を判定し、対応する note リンクに切り替える。

| category 判定 | noteLabel | noteUrl |
|---|---|---|
| `pe-comprehensive-management` | note で総監 R08 対策を発信中 | 総監ロードマップ note URL |
| `pe-construction` | note で技術士建設部門の模範解答を発信中 | 建設部門もくじ note URL |
| `civil-construction-1` | note で1級土木の合格教材を発信中 | 1級土木もくじ note URL |
| `civil-construction-2` | note で2級土木の合格教材を発信中 | 2級土木もくじ note URL |
| その他 | （現状のデフォルト） | 総監ロードマップ URL |

実装: `AuthorCard` に `category` prop を追加 → `src/config/author.ts` に `noteByCategory` マップを追加。

#### 2. 右サイドバーの一番上に AuthorCard（コンパクト版）を配置

参考: たけブログ（`docs/todo/reference-sites.md`）の著者プロフィール欄のデザイン。

- 記事ページ（`src/app/docs/[...slug]/page.tsx`）の右サイドバー最上部に著者カードを `sticky` で表示
- サイドバー用はアイコン + 名前 + 一言 bio + note リンクボタンのコンパクト版（`AuthorCardCompact`）
- 現状は記事末尾にフル版 `AuthorCard` のみ → 末尾フル版は残し、サイドバーにコンパクト版を追加

**実装ファイル**:
- `src/config/author.ts` — `noteByCategory` マップ追加
- `src/components/ui/AuthorCard/AuthorCard.tsx` — `category` prop 追加・出し分けロジック
- `src/components/ui/AuthorCard/AuthorCardCompact.tsx` — 新規（サイドバー用）
- `src/app/docs/[...slug]/page.tsx` — サイドバーに `AuthorCardCompact` を追加、`AuthorCard` に `category` を渡す

---

### カテゴリページ全面 UI 刷新：ブログカード化 + 全資格サイドバー（🟡 次月以降）

**背景**: 上記「noteリンクをサイドバーへ」とセットで実施する大きめのUI改善。参考サイト（ソーシャルPLUS ブログ `docs/todo/reference-sites.md`）の「余白を絞ったブログカード一覧 + 右サイドバー」レイアウトを doboku-note のカテゴリページに導入する。

**やりたいこと（2点）**

#### 1. 記事一覧をブログカード形式に（サムネイル画像付き）

現状の `DocCard`（`src/app/category/[slug]/page.tsx` L.224）はタイトルのみのテキストカード。  
これを **サムネイル画像 + タイトル + 概要文** のブログカード形式に変更する。

- OGP 画像（`ogp.webp`）が各記事の `img/` 配下に存在 → サムネイルに流用可能
- 画像 URL は `https://storage.doboku-note.com/posts/{slug}/ogp.webp`（R2）
- `description` frontmatter を抜粋テキストとして表示
- カード高さを揃えて余白を絞り、参考サイトのような高密度・整列感を出す
- モバイルでは 1 列、PC では 2〜3 列グリッド（現状と同じ）

実装イメージ:
```tsx
// DocCard を BlogDocCard に刷新（イメージ）
<Link href={`/docs/${doc.slug}`} className="group flex flex-col overflow-hidden rounded-card border ...">
  <div className="aspect-[16/9] overflow-hidden bg-gray-100">
    <img src={`https://storage.doboku-note.com/posts/${doc.slug}/ogp.webp`} alt={doc.title} className="w-full h-full object-cover" />
  </div>
  <div className="p-4 flex flex-col gap-1">
    <h3 className="font-bold text-[var(--ink)] line-clamp-2">{doc.title}</h3>
    <p className="text-sm text-[var(--ink-muted)] line-clamp-2">{doc.description}</p>
  </div>
</Link>
```

#### 2. 右サイドバーを全資格カテゴリに拡張

現状は civil 系のみ。`categoryMagazines.length > 0` を条件にして全資格で `<aside>` を表示する。

サイドバー内の構成（上から順に）:
- **note 有料マガジン・記事リスト** — `categoryMagazines` で取得したマガジンをリンクカード（タイトル + 価格 + arrow）で列挙。参考サイトの「カテゴリから記事を探す」スタイル（下線 + リンク配色）
- **アフィリエイト広告**（civil のみ。他資格は広告なし）
- `sticky top-6` で追従

**実装の影響範囲**:
- `src/app/category/[slug]/page.tsx`（メイン）
  - `DocCard` コンポーネント → `BlogDocCard` に刷新
  - `<aside>` 表示条件を `careerSidebar || categoryMagazines.length > 0` に変更
  - サイドバー内にマガジンリンクリストを追加
- `src/components/ui/SidebarNoteLinks/`（新規コンポーネント、任意）

**注意点**:
- OGP 画像が存在しない記事（`published: false` 等）はフォールバック画像（カテゴリ色のプレースホルダ）を表示
- `next/image` の `remotePatterns` に `storage.doboku-note.com` が登録済みか確認（→ `next.config.mjs`）
- `/design-review --visual` でモバイル・PC 両方を目視確認してからコミット

**参考**: `docs/todo/reference-sites.md` ソーシャルPLUS ブログのサイドバー・カードデザイン観察
