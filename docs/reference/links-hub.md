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

**レスポンシブ方針（PC ランディング化、2026-06-14）**: モバイルは 1 カラム（Linktree 風）を維持しつつ、PC（`max-w-5xl`）では横幅を活かす。①ヒーローを**バンド化**（アバター横並び + 試験チップ＝該当セクションへジャンプ。`sectionHasContent()` で実コンテンツのある試験のみ描画）、②差別化3本柱を **3 カラムグリッド**（`sm:grid-cols-3`）、③試験別は総監を**主力パネル**（フル幅・内部 `sm:grid-cols-2`）+ 建設/1級/2級を**均等グリッド**（描画は `ExamPanel` に共通化、各 `id="exam-{key}"` + `scroll-mt-24`）、④運営者 + SNS を **2 カラム**並置。中身（データ駆動描画・UTM・funnel・価格チップ・3本柱コピー）は不変で、変えたのはレイアウトのみ。

1. **ヒーローバンド**: アバター + アカウント名 + **キャッチコピー1行**（「発注者の視点で、土木・建設系資格の『合格』へ最短ルートを。」）+ 名乗り + **試験チップ**（ジャンプ動線）
2. **価値提案（中身）**（2026-06-12 新設）: 「市販テキスト/過去問だけでは埋まらない合格答案の型を、発注者×有資格者が逆算して教材化」+「無料サイトで土台→note フル教材で得点」の2段構え導入文。続けて**差別化3本柱**（`VALUE_PILLARS`: ①発注者・採点者の目線 ②骨子でなくフル答案 ③過去問を全網羅）をアイコン付きカードで提示。各柱は既存有料商品の共通価値（発注者視点・置換ガイド・A案/B案・印刷用PDF）を言語化したもので、個々のカードに繰り返さず済ませる役割。
3. **試験別コンテンツ**（試験ファースト・データ駆動、2026-06-11 funnel 化 / 2026-06-12 視認性・価格強化）: 各試験を〈**無料入口 → 有料マガジン**〉の funnel で構成。**旧グローバル Featured 白書を廃止**し、白書は総監の無料リードへ格下げ（多試験ハブで総監バイアスを排除）。
   - **無料入口** (`freeLinks`): 各試験のサイト試験ガイド（`/category/*`）。総監はさらに白書R7完全対応集（無料 note）を併置。**accent ボーダー + accent-fill 背景**で「無料」を強く識別。
   - **有料マガジン**: `note-magazines.ts` の `published` を `examKeyOf()`（`src/lib/exam-brand.ts`・id prefix・導線タイルと共有 SSOT）で試験別に自動描画（**ハードコード配列を廃止＝公開すれば自動掲載**）。総監はコア商品個別（**完全パックを accent 先頭＋「いちばん人気・全部入り」pill**）＋職種別**模範論文ペルソナを「全N本」1エントリに集約**（`isPersonaEssay()`、14職種をボタン化すると長くなるため）。建設部門/1級/2級は個別表示。
   - **価格チップ**（2026-06-12 追加）: 各マガジンカードに `mag.price`（note-magazines.ts が SSoT＝自動追従でドリフトなし）を accent 色チップで表示。クリック前に価格・割引率が分かり CVR を高める。
   - 各試験見出しは accent バー + 体言ヒントの sub を添え、訪問者が自分の試験を素早く判断できるようにしている。
   - 建設部門の無料サイト導線は category `visible:false` のため未掲載（公開化時に `freeLinks` へ追加）。
4. **単発の個別サービス（ココナラ）**: `listedCoconalaServices()` を 2 カラムグリッドで自動描画（`CoconalaSection`）。listed が 0 件ならセクションごと非表示（出品前の wire-ahead）。ココナラ URL に UTM は付けない（計測が外部で完結しパラメータが無駄に露出するため）
5. **Claude Code 学習キット（Brain・DL商品）**: `listedBrainProducts()` を 2 カラムグリッドで自動描画（`BrainSection`）。ココナラ節と同じデータ駆動・0件非表示・UTM 非付与。note教材（フル答案）・ココナラ（個別添削）とは別種の「Claude Code で自作するダウンロードキット」として独立表示
6. **運営者**: About カードへ（jobTitle を sub に表示、深掘りは /about。PC では SNS と 2 カラム並置）
7. **SNS**: X（PC では運営者と 2 カラム並置）

## 4. データソース（SSoT）

| データ | 真実源 | 用途 |
|---|---|---|
| 運営者情報（名前・アバター・職歴・X URL） | `src/config/author.ts` | プロフィールヒーロー + SNS セクション |
| 有料マガジン情報（タイトル・description・URL） | `src/lib/note-magazines.ts` | note 有料マガジンセクション |
| ココナラ単発サービス（状態・価格・URL） | `src/lib/coconala-services.ts`（`listedCoconalaServices()`） | 単発の個別サービスセクション（listed のみ自動掲載） |
| Brain キット商品（状態・価格・URL） | `src/lib/brain-products.ts`（`listedBrainProducts()`） | Claude Code 学習キットセクション（listed のみ自動掲載） |
| M2 完全無料記事 URL | このページ内に直書き（`EXAM_SECTIONS[tankan].freeLinks`、M2 は note-magazines.ts に含めない仕様） | 総監の無料入口 |

**M2 を note-magazines.ts に含めない理由**: M2 は 2026-05-25 に「¥2,480 magazine → 完全無料リード磁石」へ戦略転換され、note 上で単独無料記事として運用されているため、`NoteMagazine` 型（badge / price フィールド前提）に乗せていない。詳細は `docs/handoffs/2026-05-25-whitepaper-r7-free-lead-magnet.md` を参照。

## 5. UTM 設計

GA4 で SNS bio → /links → 各送客先の流入経路を区別するため、すべての外部リンクに UTM パラメータを付与している。

| 区分 | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| M2 完全無料 | `links` | `referral` | `link-hub` | `m2-free-whitepaper` |
| M9/M5/M6/M8/M3 有料マガジン | `doboku-note` | `referral` | `note-magazine` | `link-hub-{magazine-id}` |

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
- **アフィリエイトリンクを並べない** — このページは運営者の自社商品（note・サイト）のハブ。書籍紹介などのアフィリエイトは `docs/reference/book-list.md` 経由で別ページにする

## 8. 計測 KPI（提案）

| 指標 | 計測方法 | 目標目安 |
|---|---|---|
| /links のページビュー (PV) | GA4 ページレポート | Instagram フォロワー数 × 月 5-10% |
| /links 滞在時間 | GA4 エンゲージメント | 30 秒以上（リンクハブとしては短くてよい） |
| /links → M2 無料記事クリック率 | utm_content=m2-free-whitepaper の流入数 ÷ /links PV | 25-40% |
| /links → 有料マガジン総クリック率 | utm_content LIKE 'link-hub-%' ÷ /links PV | 5-15% |
| Instagram bio リンク経由 PV | GA4 acquisition / referrer = "l.instagram.com" | 月 50-300 |

## 9. 関連ドキュメント

- `docs/project/03_SNS/01_SNS集客戦略.md` — SNS チャネル別の役割（IG = SEO カタログ動線）
- `docs/project/03_SNS/02_チャネル動線設計.md` — UTM 統一フォーマット・bio link 着地点の Phase 別ロードマップ
- `docs/note/技術士総監/noteコンテンツ計画.md` — note 商品ラインナップとマガジン進捗
- `src/lib/note-magazines.ts` — 有料マガジン SSoT
- `src/config/author.ts` — 運営者情報 SSoT
- `docs/reference/content-authoring.md` — MDX/コンテンツ執筆ルール
