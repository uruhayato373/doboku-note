# /links リンクハブ 運用ガイド

`src/app/links/page.tsx` に実装した SNS bio 用リンクハブ兼ファネル LP（ブリッジページ）の設計意図・運用方針・メンテ手順をまとめた内部ドキュメント。

最終更新: 2026-06-12（リンクハブ → ハイブリッド・ファネル LP へ性質変更。価値提案・3本柱・価格表示を追加）／2026-06-14（PC レスポンシブ化＝ヒーローバンド + カードグリッド。モバイル1カラムは維持）

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

**資格カード化（2026-07-28 再設計）**: 旧構成は「試験別にマガジンを全件列挙 → ページ末尾にココナラ14件・Brain2件を独立セクション」で、チャネルが資格から切り離されて並び、SNS bio から来た人が自分に関係する導線を選べなかった。**資格でカードを立て、その中に役割固定の3行を置く**形に畳んだ。

1. **ヒーローバンド**: アバター + アカウント名 + キャッチコピー1行 + 名乗り + **試験チップ**（`#exam-{key}` へジャンプ。チップは `EXAM_CARDS` から導出）
2. **価値提案（中身）**: 導入2段落 + **差別化3本柱**（`VALUE_PILLARS`）
3. **資格カード**（`ExamCardView`・`sm:grid-cols-2`）: 1 枚 = 資格ブランド帯（`EXAM_BRAND.ctaBg` の cta-bg イラスト、無ければ `themeVar` のベタ塗り）+ 見出し + tagline + **役割固定の3行**。
   - ①**サイトで無料学習** → `/category/{...}`（内部リンク）
   - ②**note もくじ（L2）** → `.claude/config/note-funnel.json` の `exams.{key}.L2` を参照（**URL をページに直書きしない**）。1級・2級は L2 が 1 本（土木もくじ）のため同一 URL を指し、`utm_content` で流入元を分ける
   - ③**個別サービス** → 資格に紐づく listed のココナラ（無ければ Brain）から**代表 1 件**。`pickCoconalaFor` / `pickBrainFor`（`src/lib/exam-key-bridge.ts`）が選ぶ。**0 件なら行ごと省略**（建設部門はココナラ・Brain とも 0 件なので 2 行になる）
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
| **note もくじ（L2）の URL** | `.claude/config/note-funnel.json` の `exams.{key}.L2`（読み出しは `src/lib/note-mokuji.ts`） | 各資格カードの② note 行 |
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

**集計時のクエリ例**:
- /links 経由の総 note クリック: `utm_campaign IN ('link-hub', 'note-magazine') AND utm_content LIKE 'link-hub-%' OR utm_content='m2-free-whitepaper'`
- /links → M2 リード磁石のみ: `utm_content='m2-free-whitepaper'`
- /links → 有料マガジン全体: `utm_content LIKE 'link-hub-%'`

## 6. メンテ手順

### 新しい有料マガジンを追加するとき（データ駆動＝原則ページ編集不要）

1. `src/lib/note-magazines.ts` に新エントリを追加し `published: true` + `noteUrl` を埋める
2. **これだけで /links に自動掲載される**（`examKeyOf()` が id prefix で試験別セクションへ振り分け）。
   - 模範論文ペルソナ（`essay-*-(consultant|municipality)-magazine` / `essay-general-contractor-magazine`）は自動的に「職種別 全N本」集約へ加算。
   - 総監コア商品の表示順を変えるときのみ `TANKAN_CORE_ORDER` を編集。新試験区分/id 接頭辞を足すときのみ `src/lib/exam-brand.ts` の `examKeyOf()`（＋ /links の `EXAM_SECTIONS`）を編集。
3. `npm run type-check` で型エラーなしを確認 → dev で `http://localhost:3020/links` を目視確認

### マガジンを一時非公開にしたいとき

`note-magazines.ts` の対象エントリを `published: false` に変更するだけで、`getMagazine()` が `null` を返し /links から自動非表示になる（ページ側の編集は不要）。

### 無料入口（白書・サイトガイド）を切り替えるとき

`src/app/links/page.tsx` の `M2_FREE_NOTE_URL` 定数、または `EXAM_SECTIONS[].freeLinks` の該当エントリ（label / sub / href）を編集。各試験の無料入口は試験季節と連動して入れ替えてよい（例: 試験直後は「解答全文再現」を総監 `freeLinks` 先頭へ）。

### 試験季節に合わせた強調変更

試験 3 週前〜直前は、該当試験の `freeLinks` 先頭に予想・直前系を一時掲出、または `TANKAN_CORE_ORDER` で R8 予想を上位へ移動。`Date` 比較で自動切替も可能だが、現状は手動で十分。

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
| /links → M2 無料記事クリック率 | utm_content=m2-free-whitepaper の流入数 ÷ /links PV | 25-40% |
| /links → 有料マガジン総クリック率 | utm_content LIKE 'link-hub-%' ÷ /links PV | 5-15% |
| Instagram bio リンク経由 PV | GA4 acquisition / referrer = "l.instagram.com" | 月 50-300 |

## 9. 関連ドキュメント

- `docs/marketing/01_SNS集客戦略.md` — SNS チャネル別の役割（IG = SEO カタログ動線）
- `docs/marketing/02_チャネル動線設計.md` — UTM 統一フォーマット・bio link 着地点の Phase 別ロードマップ
- `content/note/技術士総監/noteコンテンツ計画.md` — note 商品ラインナップとマガジン進捗
- `src/lib/note-magazines.ts` — 有料マガジン SSoT
- `src/config/author.ts` — 運営者情報 SSoT
- `.claude/knowledge/reference/content-authoring.md` — MDX/コンテンツ執筆ルール
