# /links リンクハブ 運用ガイド

`src/app/links/page.tsx` に実装した SNS bio 用リンクハブ兼ファネル LP（ブリッジページ）の設計意図・運用方針・メンテ手順をまとめた内部ドキュメント。

最終更新: 2026-08-21（7資格を技術士／土木施工管理技士／コンクリートの3グループに再編。モバイル1列、PCは2〜3列）

## 1. 目的とポジショニング

| 項目 | 内容 |
|---|---|
| **公開 URL** | `https://doboku-note.com/links` |
| **性質** | リンクハブ兼 軽量ランディングページ（Linktree 相当の自前実装に誘導文・価値提案を載せたハイブリッド） |
| **主目的** | SNS bio から流入したユーザーに「なぜここで合格できるか」を端的に伝え、目的別の送客先へ分岐させる |
| **主な流入元** | Instagram bio リンク（最優先）／ X URL 欄 ／ YouTube 概要欄（将来） |
| **主な送客先** | note 無料記事 (M2)・note 有料マガジン（`note-magazines.ts` の published を自動掲載）・サイト試験ハブ・X |

### ランディングページ・About ページとの違い

| 種類 | 主目的 | 構成 | このページ |
|---|---|---|---|
| ランディングページ | 1 アクションへの CVR 最大化 | 訴求 → 証拠 → CTA の縦長 | △ 要素を一部採用（価値提案・3本柱） |
| **リンクハブ** | **複数の目的地への分岐** | **短い名乗り + リンク一覧** | **✓ ベース構造はこれ** |
| About ページ | 運営者・サイトの理解促進 | 経歴・編集方針を物語で説明 | `/about` 側で担当 |

「すでに SNS で接触した人が、別チャネルへ飛び移る中継地」がベース。ただし 2026-06-12 に「リンクカードを並べるだけで中身がない」課題を受け、**冒頭に価値提案（なぜここで合格できるか）+ 差別化3本柱、各有料マガジンに価格チップ**を追加し、リンクハブとファネル LP のハイブリッドへ性質変更した。深掘りの運営者紹介は引き続き `/about` に集約（Red Line #4 重複回避）。

## 2. SNS 各チャネルでの貼り方

### Instagram
- bio リンク欄に **唯一のリンク** として `https://doboku-note.com/links` を貼る
- bio 本文中に「詳細はリンクから↓」と誘導する一文を入れる

### X (Twitter)
- プロフィール URL 欄: `https://doboku-note.com`（サイトトップ）を維持
- 固定ポストスレッドで個別 note URL を案内（`/links` への送客は不要）
- 補助的に bio 本文または固定ポスト末尾で `/links` を紹介してもよい

### YouTube（将来）
- 各動画の概要欄テンプレに `/links` を含めるか、サイトトップを優先するかは流入分析後に判断

## 3. セクション構成（上から下）

**資格カード化（2026-07-28再設計、2026-08-21拡張）**: 資格ごとにカードを立て、技術士3資格／土木施工管理2資格／コンクリート2資格の3グループに編成した。カード内はサイトを必須、noteもくじと個別サービスを実体がある場合だけ加える最大3行とする。

1. **ヒーローバンド**: アバター + アカウント名 + キャッチコピー1行 + 名乗り + **グループチップ**（`#group-{id}` へジャンプ。`EXAM_GROUPS` から導出）
2. **価値提案（中身）**: 導入2段落 + **差別化3本柱**（`VALUE_PILLARS`）
3. **資格カード**（`ExamCardView`）: `EXAM_GROUPS` 配下に置き、モバイル1列／`sm` 2列／3枚の技術士グループは`lg` 3列。1枚は資格ブランド帯 + 見出し + tagline + **最大3行**。
   - ①**サイトで無料学習** → `/category/{...}`（内部リンク）
   - ②**note もくじ（L2）** → `.claude/config/note-funnel.json` の `exams.{key}.L2` を参照（**存在時のみ**。URLをページに直書きしない）
   - ③**個別サービス** → 資格に紐づく listed のココナラ（無ければ Brain）から**代表 1 件**。`pickCoconalaFor` / `pickBrainFor`（`src/lib/exam-key-bridge.ts`）が選ぶ。**0 件なら行ごと省略**（建設部門はココナラ・Brain とも 0 件なので 2 行になる）
   - 技術士第一次・コンクリート主任技士・コンクリート診断士は現在、①サイト行だけを表示する
   - 各行はアイコン（`ServiceIcon`）+ リンク名 + チャネル小ラベル + 特徴 1 行。特徴は `line-clamp: 2`（商品 `description` は 170〜210 字あり、素で出すと 1 行だけ 220px になる）
   - **マガジンの個別列挙は廃止**し L2 もくじへ集約した。商品を追加しても /links の改修は不要
4. **チャネル凡例**（`ChannelLegend`）: サイト／note／ココナラ／Brain が「何をくれるか」をページ内で 1 度だけ示す。カード内はアイコンと小ラベルだけなので、意味づけはここで担保する
5. **運営者**: About カードへ（PC では SNS と 2 カラム並置）
6. **SNS**: X（PC では運営者と 2 カラム並置）

> **ロゴの扱い**: チャネル識別は `src/components/icons/ServiceIcon.tsx` が担う。公式ロゴを `public/images/brand/{note,coconala,brain}.svg` に置けば自動でロゴ表示へ切り替わり、未配置の間は lucide の汎用アイコンにフォールバックする（素材待ちで表示が壊れない）。ロゴは商標なので**改変・着色をせず原寸比で出す**。
> なお handoff 2026-07-25 の「note ロゴを使わない」は **note リンクカードのサムネ画像に焼き込まない**という文脈の方針で、`check-note-link-cards` も `/images/note-links/*.webp` だけを検査する。ここで扱うサービス識別バッジは対象外（2026-07-28 にユーザー判断で方針確認済み）。

## 4. データソース（SSoT）

| データ | 真実源 | 用途 |
|---|---|---|
| 運営者情報（名前・アバター・職歴・X URL） | `src/config/author.ts` | プロフィールヒーロー + SNS セクション |
| **note もくじ（L2）の URL** | `.claude/config/note-funnel.json` の `exams.{key}.L2`（読み出しは `src/lib/note-mokuji.ts`） | L2がある資格カードの② note 行 |
| **資格ブランド（ラベル・テーマ色・背景イラスト）** | `src/lib/exam-brand.ts`（`EXAM_BRAND` / `examKeyOf`） | カード頭の帯 |
| ココナラ単発サービス（状態・価格・URL） | `src/lib/coconala-services.ts`（`listedCoconalaServices()`） | 各資格カードの③ 行（`pickCoconalaFor` が代表 1 件を選ぶ） |
| Brain キット商品（状態・価格・URL） | `src/lib/brain-products.ts`（`listedBrainProducts()`） | 同上（ココナラが 0 件の資格でのみ `pickBrainFor`） |
| 資格キーの対応（`ExamKey` ⇄ 商品カタログの `examScope`） | `src/lib/exam-key-bridge.ts` | ③ 行の突合（`tankan` ⇄ `pe-comprehensive-management` 等） |
| 有料マガジン情報（タイトル・description・URL） | `src/lib/note-magazines.ts` | **/links からは直接参照しない**（もくじへ集約したため）。記事内 CTA・サイドバーでは引き続き使用 |

**M2（白書R7 完全対応集）の現在地**: 2026-05-25 に「¥2,480 magazine → 完全無料リード磁石」へ転換され、`NoteMagazine` 型（badge / price 前提）に乗せていない単独無料記事。**資格カード化（2026-07-28）で /links からの直リンクは外し、総監もくじ（L2）経由の導線に一本化した**（カードを 3 行に保つため）。M2 自体は note 上で稼働中。経緯は `docs/handoffs/2026-05-25-whitepaper-r7-free-lead-magnet.md`。

## 5. UTM 設計

GA4 で SNS bio → /links → 各送客先の流入経路を区別するため、すべての外部リンクに UTM パラメータを付与している。

| 区分 | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| **note もくじ（L2）**（2026-07-28〜） | `links` | `referral` | `link-hub` | `mokuji-{examKey}` |
| M2 完全無料 | `links` | `referral` | `link-hub` | `m2-free-whitepaper` |
| 有料マガジン（現在 /links からは直リンクしない） | `doboku-note` | `referral` | `note-magazine` | `link-hub-{magazine-id}` |

**`utm_content` に `link-hub-` 接頭辞を使わない理由**: 下の「有料マガジン全体」クエリが `utm_content LIKE 'link-hub-%'` で集計しているため、もくじを `link-hub-mokuji-*` にすると既存 KPI に混ざる。もくじは別系統として `mokuji-{examKey}` にした。1級・2級は同じ L2 記事を指すので、この `utm_content` だけが流入元を区別する手段になる。

**有料マガジン行の現状**: 資格カード化（2026-07-28）でマガジンの個別列挙を廃止したため、/links からマガジンへの直リンクは無くなった。`buildMagazineUrl` の規約自体はサイト内の他面（記事内 CTA・サイドバー）で生きているので表は残す。

**utm_source が異なる理由**: 有料マガジンは `note-magazines.ts` の `buildMagazineUrl()` を共通利用しており、サイト内の他箇所（記事内 CTA・サイドバー）からの送客と統一規約で扱う方が分析しやすい。M2 だけが /links 独自の UTM になっている。

**集計時のクエリ例**: /links → noteもくじは `utm_campaign='link-hub' AND utm_content LIKE 'mokuji-%'` で集計する。

## 6. メンテ手順

### 新しい有料マガジンを追加するとき（データ駆動＝原則ページ編集不要）

1. `src/lib/note-magazines.ts` に新エントリを追加し、資格別L2もくじからその商品へ案内する
2. 既存資格なら `/links` はL2もくじを指し続けるため、ページ編集は不要
3. 新資格なら `src/lib/exam-brand.ts` と `/links` の `EXAM_CARDS`／`EXAM_GROUPS` を更新する。L2・商品が未整備ならサイト行だけで公開する
4. `npm run type-check` で型エラーなしを確認し、devの `/links` をPC・モバイルで目視する

### マガジンを一時非公開にしたいとき

`/links` は個別マガジンではなくL2もくじを指す。個別商品の非公開は `note-magazines.ts` とL2もくじ側で反映し、L2自体を止める場合だけ `note-funnel.json` の該当L2を見直す。

### 無料入口（白書・サイトガイド）を切り替えるとき

`src/app/links/page.tsx` の `EXAM_CARDS[].site`（label / sub / href）を編集する。資格のカテゴリハブを既定とし、季節施策へ一時変更する場合も試験後に戻す。

### 試験季節に合わせた強調変更

試験3週前〜直前は、該当資格の `EXAM_CARDS[].site` を予想・直前系へ一時変更できる。変更履歴と戻す日を同時に記録する。

## 7. やらないこと

- **価値提案は「スキャンできる」長さに留める** — 2026-06-12 に誘導文・3本柱を追加したが、ファネル LP でも壁のような長文は離脱要因（非スクロール離脱の業界ベンチマーク 60% 超）。短い段落・太字キーフレーズ・3本柱カードで「読まずに分かる」設計を維持し、運営者の物語的な深掘りは `/about` に集約する（ヒーロー直下に経歴を長文展開しない）
- **Header navigation に出さない** — SNS bio 専用の中継ページなので、サイト内回遊からは原則アクセスしない設計。Header に出すと一般訪問者の目に入り「リンク集だけのページ」と誤認されサイトの体系性が薄まる
- **同じ文章を /about と両方に書かない** — Red Line #4（重複コンテンツ）回避。/links の価値提案・導入文は要約に留め、編集方針・保有資格一覧などの深掘りは `/about` への送客で対応
- **価格・ID を直書きしない** — 価格チップは必ず `note-magazines.ts` の `mag.price`（SSoT）から描画し、page.tsx にハードコードしない（改訂追従不能・ドリフトの原因。`feedback_no_price_in_mdx_body` と同趣旨）
- **アフィリエイトリンクを並べない** — このページは運営者の自社商品（note・サイト）のハブ。書籍紹介などのアフィリエイトは `.claude/knowledge/reference/book-list.md` 経由で別ページにする

## 8. 計測 KPI（提案）

| 指標 | 計測方法 | 目標目安 |
|---|---|---|
| /links のページビュー (PV) | GA4 ページレポート | Instagram フォロワー数 × 月 5-10% |
| /links 滞在時間 | GA4 エンゲージメント | 30 秒以上（リンクハブとしては短くてよい） |
| /links → noteもくじクリック率 | `utm_campaign=link-hub` かつ `utm_content=mokuji-*` の流入数 ÷ /links PV | 基線取得後に設定 |
| Instagram bio リンク経由 PV | GA4 acquisition / referrer = "l.instagram.com" | 月 50-300 |

## 9. 関連ドキュメント

- `docs/marketing/01_SNS集客戦略.md` — SNS チャネル別の役割（IG = SEO カタログ動線）
- `docs/marketing/02_チャネル動線設計.md` — UTM 統一フォーマット・bio link 着地点の Phase 別ロードマップ
- `content/note/技術士総監/noteコンテンツ計画.md` — note 商品ラインナップとマガジン進捗
- `src/lib/note-magazines.ts` — 有料マガジン SSoT
- `src/config/author.ts` — 運営者情報 SSoT
- `.claude/knowledge/reference/content-authoring.md` — MDX/コンテンツ執筆ルール
