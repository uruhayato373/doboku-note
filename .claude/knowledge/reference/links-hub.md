# /links リンクハブ 運用ガイド

`src/app/links/page.tsx` に実装した SNS bio 用リンクハブ兼ファネル LP（ブリッジページ）の設計意図・運用方針・メンテ手順をまとめた内部ドキュメント。

最終更新: 2026-11-14（全資格のカード一覧へ再設計。10/31 の発信の優先順と主力教材への直行は維持）

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

「すでに SNS で接触した人が、別チャネルへ飛び移る中継地」がベース。ただし 2026-06-12 に「リンクカードを並べるだけで中身がない」課題を受け、**冒頭に価値提案（なぜここで合格できるか）+ 差別化3本柱、各有料マガジンに価格チップ**を追加し、リンクハブとファネル LP のハイブリッドへ性質変更した。深掘りの運営者紹介は引き続き `/about` に集約（Red Line #4 重複回避）。2026-09-24 に、スマホ（アプリ内ブラウザ相当の 390×664）で最初の資格リンクが 2.3 画面目・ページ全体が 8.2 画面分だったため、冒頭の導入文を廃止し 3 本柱をカードの後ろへ移した（6/12 の「冒頭に価値提案」を戻す・ユーザー判断）。

## 2. SNS 各チャネルでの貼り方

### Instagram
- bio リンク欄のサイトリンクは `config/ig-account.json` の `profile.websiteUrl` を使う（HTTPS の `/links` と `utm_source=instagram&utm_medium=social&utm_campaign=bio-link&utm_content=bio`）
- bio 本文中に教材はリンクから進める旨を入れる
- Reels・固定投稿では「プロフィール→技術士／コンクリート→無料解説またはnote教材」と資格名まで案内する。プロフィール内リンクの編集はInstagramアプリで行う

### X (Twitter)
- プロフィール URL 欄: `https://doboku-note.com`（サイトトップ）を維持
- 固定ポストスレッドで個別 note URL を案内（`/links` への送客は不要）
- 補助的に bio 本文または固定ポスト末尾で `/links` を紹介してもよい

### YouTube（将来）
- 各動画の概要欄テンプレに `/links` を含めるか、サイトトップを優先するかは流入分析後に判断

## 3. セクション構成（上から下）

**全資格のカード一覧（2026-11-14 再設計）**: ページ見出し → ページ内目次（資格の短い名前）→ 全公開資格のカード一覧。選択で表示を切り替えず、スマホでもスクロールだけで主要な入口を見渡せる。資格カードは `src/lib/learning-catalog.ts` の `buildLearningCatalog()` が組み、`src/app/links/page.tsx` は描画だけを持つ。

1. **ページ見出しと目次**: 目次は各カード（`#exam-{資格 id}`）へのページ内リンク
2. **資格カード**（`QualificationCard`）: モバイル 1 列／`md` 2 列／`xl` 3 列。1 枚の行は次の順
   - ①**無料で学ぶ** → 資格のカテゴリハブ（`getCategoryHubPath`）
   - ②**主力の教材**（`featured`）→ 発信の優先資格だけ。技術士一次は `categoryLeadMagazineId`（試験日の翌日から過去問 PDF）、コンクリート技士は `ce-chokuzen-pack`、主任技士は `cce-takuitsu-chokuzen-pack`（`FEATURED_NOTE`）
   - ③**note もくじ** → `config/note-funnel.json` の資格別 L2。②がある資格は「全教材の目次を見る」として残す（コンクリート 3 資格は共通のコンクリート資格もくじ）
   - ④**Kindle**（公開中の本があれば 1 冊）、⑤**ココナラ**（資格の `examScope` に当たる受付中の出品。PR 表記つき。主任技士の添削は受付締めを題名の下に出す）
   - 残りの教材は「ほかの教材（N件）」の折りたたみへ。商品を追加しても /links の改修は不要
3. **運営者について**（`/about`）への 1 行

**並び順**: 2026-10-31 の運営者の決定で、技術士一次 → 建設部門 → 総監 → コンクリート技士・主任技士・診断士 → 1級・2級土木 → RCCM を先頭に置く（`LINKS_PRIORITY`）。ほかの資格は資格の台帳（`qualification-registry.json`）の順で後ろに続く。`tests/learning-catalog.test.mjs` が先頭の並びと主力の教材を固定する。

**1 画面目の検査**: `e2e/mobile.spec.ts` が、スマホ（iPhone 13・390×664）で最初の資格リンク（技術士一次の「無料で学ぶ」）が 1 画面目に収まることと横スクロールが無いこと、コンクリート 2 資格が主力教材（`/m/`）へ直接進めてもくじ（`/n/`）も残すことを、PR と夜間 E2E で見る（夜間の失敗は `automation-failure` Issue → 週次レビュー）。見出しや目次の上に要素を足すとこれが赤くなる。

## 4. データソース（SSoT）

| データ | 真実源 | 用途 |
|---|---|---|
| 資格の一覧・名前 | `buildExamCards()`（`home-exam-cards`）と `qualification-registry.json` | カードと目次 |
| note 教材（題名・URL・公開状態） | `config/products.json`（読み出しは `src/lib/note-magazines.ts`） | ②・折りたたみの note 行 |
| 複数資格に当たる教材の振り分け | `config/product-lineup.json`（`classifyProduct`） | 口頭対策・共通教材の置き先 |
| note もくじ（L2）の URL | `config/note-funnel.json` の `exams.{key}.L2`（`src/lib/note-mokuji.ts`） | ③ |
| ココナラ出品（状態・URL） | `src/lib/coconala-services.ts`（`listedCoconalaServices()`） | ⑤（アフィリエイトの経由 URL は `coconalaAffiliateHref`） |
| Kindle（ASIN・公開状態） | `config/products.json` の kindle 行 | ④ |

価格・割引説明・運営メモは表示用のデータに含めない（`tests/learning-catalog.test.mjs` が止める）。

## 5. UTM 設計

GA4 で SNS bio → /links → 各送客先の流入経路を区別するため、外部リンクに UTM パラメータを付ける。

| 区分 | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| note もくじ（L2） | `links` | `referral` | `link-hub` | `mokuji-{examKey}` |
| note 教材（主力・折りたたみ） | `doboku-note` | `referral` | `note-magazine` | `links-{商品 id}` |

**`utm_content` に `link-hub-` 接頭辞を使わない理由**: 有料マガジン全体の集計が `utm_content LIKE 'link-hub-%'` を使うため、もくじは別系統の `mokuji-{examKey}` にした。1級・2級、コンクリート 3 資格は同じ L2 記事を指すので、この `utm_content` が流入元を区別する手段になる。

**計測**: Instagram→/links は GA4 で `session_source=instagram` と `session_campaign=bio-link` を見る。/links→note のクリックはサイト側の `note_cta_click`（`data-cta-label`・`data-cta-placement="links-hub"`）で数える。note 側の UTM は note の流入識別用で、サイトの GA4 で外部遷移を数える代わりにはならない。

## 6. メンテ手順

- **商品を足す・止める**: `config/products.json` を更新するだけでよい（公開・受付中のものだけが自動で載る）。複数資格に当たる note 教材は `config/product-lineup.json` の分類に足す
- **主力の教材を替える**: `src/lib/learning-catalog.ts` の `FEATURED_NOTE` を更新し、`tests/learning-catalog.test.mjs` の期待も直す
- **発信の優先順を変える**: `LINKS_PRIORITY` と同テスト、`e2e/mobile.spec.ts` の 1 画面目の期待を同時に直す（運営者の判断。経緯をこの文書に残す）
- **確認**: `npm run type-check`、`node --test tests/learning-catalog.test.mjs`、dev の `/links` をスマホ幅で目視する

## 7. やらないこと

- **資格カードより先に価値提案・長文を置かない** — 2026-09-24 に冒頭の導入文を廃止した。スマホの 1 画面目は資格カードのリンクに使う（E2E が検査）
- **価値提案は「スキャンできる」長さに留める** — 2026-06-12 に誘導文・3本柱を追加したが、ファネル LP でも壁のような長文は離脱要因（非スクロール離脱の業界ベンチマーク 60% 超）。短い段落・太字キーフレーズ・3本柱カードで「読まずに分かる」設計を維持し、運営者の物語的な深掘りは `/about` に集約する（ヒーロー直下に経歴を長文展開しない）
- **Header navigation に出さない** — SNS bio 専用の中継ページなので、サイト内回遊からは原則アクセスしない設計。Header に出すと一般訪問者の目に入り「リンク集だけのページ」と誤認されサイトの体系性が薄まる
- **同じ文章を /about と両方に書かない** — Red Line #4（重複コンテンツ）回避。/links の価値提案（3 本柱）は要約に留め、編集方針・保有資格一覧などの深掘りは `/about` への送客で対応
- **価格・ID を直書きしない** — 商品は `config/products.json` から引き、page.tsx に題名・URL・価格を書かない（改訂追従不能・ドリフトの原因）
- **アフィリエイトリンクを並べない** — このページは運営者の自社商品（note・サイト）のハブ。書籍紹介などのアフィリエイトは `.claude/knowledge/reference/book-list.md` 経由で別ページにする

## 8. 計測 KPI（提案）

| 指標 | 計測方法 | 目標目安 |
|---|---|---|
| /links のページビュー (PV) | GA4 ページレポート | Instagram フォロワー数 × 月 5-10% |
| /links 滞在時間 | GA4 エンゲージメント | 30 秒以上（リンクハブとしては短くてよい） |
| /links → note教材・もくじクリック率 | GA4の `note_cta_click`（placement=`links-hub`）÷ /links PV | 基線取得後に設定 |
| Instagram bio リンク経由 PV | GA4の `session_source=instagram`・`session_campaign=bio-link` | 月 50-300 |

## 9. 関連ドキュメント

- `docs/marketing/01_SNS集客戦略.md` — SNS チャネル別の役割（IG = SEO カタログ動線）
- `docs/marketing/02_チャネル動線設計.md` — UTM 統一フォーマット・bio link 着地点の Phase 別ロードマップ
- `content/note/技術士総監/noteコンテンツ計画.md` — note 商品ラインナップとマガジン進捗
- `src/lib/note-magazines.ts` — 有料マガジン SSoT
- `src/config/author.ts` — 運営者情報 SSoT
- `.claude/knowledge/reference/content-authoring.md` — MDX/コンテンツ執筆ルール
