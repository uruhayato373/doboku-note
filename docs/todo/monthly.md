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
