# /links リンクハブ 運用ガイド

`src/app/links/page.tsx` に実装した SNS bio 用リンクハブ（ブリッジページ）の設計意図・運用方針・メンテ手順をまとめた内部ドキュメント。

最終更新: 2026-05-26

## 1. 目的とポジショニング

| 項目 | 内容 |
|---|---|
| **公開 URL** | `https://doboku-note.com/links` |
| **性質** | リンクハブ / ブリッジページ（Linktree 相当の自前実装） |
| **主目的** | SNS bio から流入したユーザーを目的別の送客先へ分岐させる中継地 |
| **主な流入元** | Instagram bio リンク（最優先）／ X URL 欄 ／ YouTube 概要欄（将来） |
| **主な送客先** | note 無料記事 (M2)・note 有料マガジン (M9/M5/M6/M8/M3)・サイト試験ハブ・X |

### ランディングページ・About ページとの違い

| 種類 | 主目的 | 構成 | このページ |
|---|---|---|---|
| ランディングページ | 1 アクションへの CVR 最大化 | 訴求 → 証拠 → CTA の縦長 | ✗ 該当しない |
| **リンクハブ** | **複数の目的地への分岐** | **短い名乗り + リンク一覧** | **✓ これ** |
| About ページ | 運営者・サイトの理解促進 | 経歴・編集方針を物語で説明 | `/about` 側で担当 |

「すでに SNS で接触した人が、別チャネルへ飛び移る中継地」として設計。情報量を絞り、ボタンの並びを主役にしている。

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

1. **プロフィールヒーロー**: アバター + アカウント名 + 1 行ティザー
2. **導入文**: 運営者の信頼根拠 + サイト/note の役割分担 + 推奨入口の提示
3. **Featured（M2 完全無料）**: 最目立つ accent カラーボタン
4. **note 有料マガジン**: 精読ガイド / ゼネコン / 河川コンサル / 自治体道路担当 / R8予想問題集 / 設問3国家施策バンク / 5管理クロストレードオフ（計7件）— `note-magazines.ts` の `MagazineId` から動的取得（`PAID_MAGAZINE_IDS` 順）
5. **無料サイトコンテンツ**: 総監カテゴリ / 1級土木カテゴリ / About
6. **SNS**: X

各セクション見出しに「**こんな方へ**」のサブテキストを 1 行添えて、訪問者が自分の目的に合う場所を素早く判断できるようにしている。

## 4. データソース（SSoT）

| データ | 真実源 | 用途 |
|---|---|---|
| 運営者情報（名前・アバター・職歴・X URL） | `src/config/author.ts` | プロフィールヒーロー + SNS セクション |
| 有料マガジン情報（タイトル・description・URL） | `src/lib/note-magazines.ts` | note 有料マガジンセクション |
| M2 完全無料記事 URL | このページ内に直書き（M2 は note-magazines.ts に含めない仕様） | Featured セクション |

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

### 新しい有料マガジンを追加するとき

1. `src/lib/note-magazines.ts` に新エントリを追加し `published: true` + `noteUrl` を埋める
2. `src/app/links/page.tsx` の `PAID_MAGAZINE_IDS` 配列に新 `MagazineId` を追加（順序が表示順）
3. `npm run type-check` で型エラーなしを確認
4. dev サーバーで `http://localhost:3020/links` を開き目視確認

### マガジンを一時非公開にしたいとき

`note-magazines.ts` の対象エントリの `published: false` に変更するだけで、`getMagazine()` が `null` を返し /links から自動非表示になる。`PAID_MAGAZINE_IDS` 配列を編集する必要はない。

### Featured（M2）を別の無料記事に切り替えるとき

`src/app/links/page.tsx` 上部の `M2_FREE_NOTE_URL` 定数とその直下のヒーロー導入文・Featured ボタンのタイトル/サブテキストを編集。完全無料リード磁石は試験季節と連動して入れ替わる前提（例: 試験直後は「2026 解答全文再現」が Featured に昇格しうる）。

### 試験季節に合わせた強調変更

試験 3 週前〜直前は M3 R8予想問題集を Featured に並列表示する案あり。実装するなら Featured セクションを `<section>` で 2 つ並べる構成に拡張。優先度判定は試験前 6 週間以内かどうかで `Date` 比較ロジックを入れる選択肢もあるが、現状は手動切替で十分。

## 7. やらないこと

- **ヒーローを長文化しない** — リンクハブで本文長文化は離脱要因（業界ベンチマークで非スクロール離脱 60% 超）。詳しい運営者紹介は `/about` に集約
- **Header navigation に出さない** — SNS bio 専用の中継ページなので、サイト内回遊からは原則アクセスしない設計。Header に出すと一般訪問者の目に入り「リンク集だけのページ」と誤認されサイトの体系性が薄まる
- **同じ文章を /about と両方に書かない** — Red Line #4（重複コンテンツ）回避。/links の導入文は要約に留め、深掘りは /about への送客で対応
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
- `docs/note/noteコンテンツ計画.md` — note 商品ラインナップとマガジン進捗
- `src/lib/note-magazines.ts` — 有料マガジン SSoT
- `src/config/author.ts` — 運営者情報 SSoT
- `docs/reference/content-authoring.md` — MDX/コンテンツ執筆ルール
