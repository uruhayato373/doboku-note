# NSM 改善実験パターン カタログ

`/nsm-experiment propose` が候補を生成するときに参照する典型パターン集。**progressive disclosure** で必要時のみ読まれる（本ファイルは約 3-4KB の軽量リファレンス）。

## 使い方

`/nsm-experiment propose` の assistant はこのカタログと現状メトリクス（`metrics-reader.mjs` の出力）を突き合わせ、適用可能なパターンを抽出する。各パターンには「何を見て適用判定するか」「何を計測するか」「期待 delta の目安」を記載。

**迷ったら**: 実装コスト 30 分以内 × インプレッションが現に発生している対象、を優先。

---

## カテゴリ 1: 検索クエリ個別改善

### 1-A. 順位 5-15 位のクエリの title/description 改善

**適用条件**:
- GSC で `position` が 5-15 の範囲
- `impressions` が 7 日で 3 以上
- CTR が 5% 未満

**計測指標**: `gsc_position`（目標 3 位以内）、`gsc_ctr`（目標 2 倍）

**アクション**:
1. 該当クエリを含むページ URL を GSC で確認
2. MDX の frontmatter `title` と `description` を書き換え（対象キーワードを文頭に寄せる）
3. 年度・日付など specificity を強める（例: `2026 年度試験対応`）
4. デプロイ → 10-14 日待機

**効果判定の期間**: 10-14 日（GSC 3 日遅延 + 検索再評価の時間）

**期待 delta**: position -3、CTR +100〜200%

**ROI**: 高（既にインプレッションがあるクエリへの介入は予測可能）

### 1-B. 順位 15-50 位のクエリへのコンテンツ拡充

**適用条件**:
- GSC で `position` が 15-50
- クエリが既存ページのメイン トピックと一致
- 既存ページの該当セクションが薄い（500 字未満）

**計測指標**: `gsc_position`、`gsc_impressions`

**アクション**:
1. 該当クエリを含むユーザー検索意図を推測
2. 既存ページに H2/H3 セクションを追加（500-1000 字）
3. 関連キーワードを本文にインライン リンクで繋ぐ
4. デプロイ → 14-21 日待機

**効果判定の期間**: 14-21 日

**期待 delta**: position -10、impressions +50%

**ROI**: 中（検索エンジンの再評価に時間がかかる）

---

## カテゴリ 2: CTR 改善

### 2-A. インプレッション多・CTR 低のクエリへの description 改訂

**適用条件**:
- 上位 10 クエリのうち CTR < 平均 CTR
- 対象ページの meta description が 50 字未満 or 検索クエリとマッチしていない

**計測指標**: `gsc_ctr`

**アクション**:
1. 対象ページの frontmatter `description` を 50-160 字で書き換え
2. 検索意図を具体化（「〜とは」「〜の解き方」「〜の例」など）
3. デプロイ → 7-10 日待機

**効果判定の期間**: 7-10 日

**期待 delta**: CTR +50〜100%

**ROI**: 高（即効性あり、失敗時のリスク小）

---

## カテゴリ 3: コンテンツ追加

### 3-A. 検索ニーズあるが未対応クエリの新規ページ作成

**適用条件**:
- GSC 未対応だがトップクエリ周辺で関連キーワードが出現
- 既存サイトに対応ページが存在しない
- キーワード集（pe-chapters.json など）に定義されている

**計測指標**: `gsc_impressions`（新規クエリ）、`ga4_organic_users`

**アクション**:
1. `/keyword-page create` でページを新規作成
2. `/check-mdx --all --rules frontmatter` で品質確認
3. デプロイ → 21-28 日待機（インデックスから評価まで）

**効果判定の期間**: 21-28 日

**期待 delta**: 新規 impressions 10-50/月

**ROI**: 中〜低（時間がかかるが積み上がる）

### 3-B. 関連キーワード内部リンクのインライン化

**適用条件**:
- `/check-mdx --rules related-keyword` で 8-1 違反を持つページ
- 既存の内部リンク導線が薄い（ページ/セッション < 2）

**計測指標**: `ga4_pages_per_session`、`ga4_engagement_rate`

**アクション**:
1. `/check-mdx --all --rules related-keyword` で違反検出
2. 1 バッチ 10 ページ単位でインライン化実施
3. デプロイ → 7 日待機

**効果判定の期間**: 7-14 日

**期待 delta**: ページ/セッション +20%

**ROI**: 高（既に機械検出ルールがあり量産可能）

---

## カテゴリ 4: 技術的 SEO

### 4-A. 構造化データ（JSON-LD）追加

**適用条件**:
- ページ種別（article, exam, keyword など）に対応する構造化データが未実装
- 上位クエリで competitor がリッチスニペット獲得している

**計測指標**: `gsc_ctr`、リッチスニペット獲得率

**アクション**:
1. `src/components/seo/StructuredData.tsx` を拡張
2. FAQ / HowTo / Quiz などページ種別に応じた schema 追加
3. デプロイ → 14 日待機

**効果判定の期間**: 14-21 日

**期待 delta**: CTR +30〜50%（リッチスニペット獲得時）

**ROI**: 中（実装コスト中、効果は大）

### 4-C. Core Web Vitals (CWV) 改善

**適用条件**:
- `npm run fetch-psi-data -- --top 10 --strategy mobile` で field_data (実ユーザー計測) を取得
- 上位ページの LCP (Largest Contentful Paint) > 2.5 秒、INP > 200ms、CLS > 0.1 のいずれかに該当
- 特に page_fetch_state が SUCCESSFUL でも LCP が遅いページが狙い目

**計測指標**: `psi_lcp_ms`, `psi_inp_ms`, `psi_cls`, `psi_performance_score`

**アクション**:
1. PSI レポートで LCP 遅延の主因を特定（画像未最適化 / JS blocking / フォント読み込み 等）
2. 対策実施:
   - 画像: R2 配信済みだが `loading="lazy"` 追加、適切な width/height 指定、WebP 変換
   - フォント: `font-display: swap`、サブセット化
   - JS: 不要ライブラリ削除、Next.js の code splitting 徹底
3. デプロイ → 14-28 日待機（field_data は 28 日移動平均）

**効果判定の期間**: 28 日以上（CrUX が実ユーザーデータを蓄積する時間）

**期待 delta**: Performance score +10-20 点、LCP -500ms 以上

**ROI**: 中（実装は軽いが効果測定が長い）。ただし Core Web Vitals は検索順位の直接的シグナルなので、**複数ページでまとめて改善する価値が大きい**。

### 4-D. インデックス未登録ページの原因特定と解消

**適用条件**:
- 新規追加したページが公開後 14 日経過しても GSC で検索表示されない
- `npm run inspect-url -- --url <URL>` で `coverage_state` が "未登録" or "除外"

**計測指標**: インデックス済みページ数

**アクション**:
1. `inspect-url` でインデックス状態の詳細を取得
2. 問題別の対応:
   - `CRAWLED_CURRENTLY_NOT_INDEXED` → 内部リンク追加、コンテンツ拡充
   - `DISCOVERED_CURRENTLY_NOT_INDEXED` → クロール頻度が低い、内部リンク強化
   - `NOT_ON_SELECTED_PROPERTY` → プロパティ設定確認
   - `PAGE_WITH_REDIRECT` → リダイレクトチェーンを解消
   - `BLOCKED_BY_ROBOTS_TXT` → robots.txt 修正
3. 修正後、GSC 画面で「インデックス登録リクエスト」を手動送信
4. 再度 `inspect-url` で PASS 確認

**効果判定の期間**: 手動リクエスト後 3-10 日

**期待 delta**: 該当ページがインデックス済みに遷移

**ROI**: 高（新規ページ 1 件につき長期的な impressions 獲得）

### 4-B. sitemap 優先度の調整

**適用条件**:
- 重要ページがサイトマップで低優先度
- 新規追加ページが検索に出てこない

**計測指標**: `gsc_impressions`、インデックス済み数

**アクション**:
1. `scripts/generate-sitemap.mjs` の優先度ロジック確認
2. 上位パターンに対応するルールを追加
3. デプロイ → 10 日待機

**効果判定の期間**: 10-14 日

**期待 delta**: インデックス + 新規ページのインプレッション増

**ROI**: 低〜中（Google の再クロール待ち）

---

## カテゴリ 5: UX / 回遊性

### 5-A. 末尾コンポーネント導線の改善

**適用条件**:
- `ga4_pages_per_session` < 2.0
- 特定のページ種別で直帰率が平均 +10pt 以上

**計測指標**: `ga4_pages_per_session`、`ga4_bounce_rate`

**アクション**:
1. 対象ページ種別の末尾コンポーネント配置を確認
2. `CategoryNavCard` / `PastExamBacklinks` / `RelatedKeywords` の出現順を調整
3. デプロイ → 7 日待機

**効果判定の期間**: 7-14 日

**期待 delta**: ページ/セッション +20%、直帰率 -10pt

**ROI**: 中（実装は軽いが効果測定が変動しやすい）

---

## 履歴（学んだこと）

以下は実際の実験から得られた知見の蓄積欄。`/nsm-experiment close` の learnings がここに蓄積される想定。

- _(まだ実験実施なし)_

---

## 新規パターン追加のルール

1. 実際の実験で効果が確認されたら本ファイルに追記
2. カテゴリ 1-5 のどこに属するか、または新カテゴリを立てるか判断
3. 「適用条件」「計測指標」「アクション」「期待 delta」を必ず記載
4. 失敗パターンも追加（「やらない方がいい」の記録）
