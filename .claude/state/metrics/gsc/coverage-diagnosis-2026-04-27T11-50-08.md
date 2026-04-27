## GSC 未登録 URL 実データ診断（2026-04-27 11:50 UTC）

URL Inspection API + Search Analytics API による全 756 URL 一括検査の結果です。

### 0. 検査サマリ

| カテゴリ | 件数 |
|---|---:|
| ex0 | 670 |
| ex1 | 3 |
| ex2 | 22 |
| ex3 | 41 |
| ex4 | 20 |
| **合計** | **756** |

> エラー: 4 件（API/ネットワーク等）

### A. ex0 の最終クロール日分布

| 分類 | 件数 | 割合 |
|---|---:|---:|
| 一度もクロールなし | 253 | 37.8% |
| 30日以前 | 0 | 0.0% |
| 7-30日 | 0 | 0.0% |
| 7日以内 | 414 | 61.8% |

### B. page_fetch_state 別件数

| 状態 | 件数 |
|---|---:|
| SUCCESSFUL | 475 |
| PAGE_FETCH_STATE_UNSPECIFIED | 257 |
| NOT_FOUND | 20 |

### C. referring_urls 数 × カテゴリ

| referring 数 | 全体 | うち ex0 |
|---|---:|---:|
| 0 | 710 | 663 |
| 1-2 | 41 | 4 |
| 3-5 | 1 | 0 |
| 6+ | 0 | 0 |

### D. canonical 不一致

- ユーザー指定と異なる canonical を Google が選択: 0 件
- うち別 URL に正規化された（重複判定）: 0 件

### E. 幽霊ページ（インデックス済 + 90 日 impressions=0）

- 検査した URL のうちインデックス済 (verdict=PASS): 407 件
- うち 90 日 impressions=0 の幽霊ページ: 362 件 (89%)

> 対象は今回検査した URL のうち PASS のもののみ。サイト全体の幽霊率はサイトマップ全件で再計算が必要。

### F. ブランドクエリ実数

- ブランドクエリ "doboku" 系の 90 日 clicks: 0
- ブランドクエリ "doboku" 系の 90 日 impressions: 19
- 月間換算 impressions: 6.3

| クエリ | clicks | impressions | CTR | position |
|---|---:|---:|---:|---:|
| doboku | 0 | 19 | 0.0% | 7.1 |

### G. URL パターン × カテゴリ クロス集計

| パターン | ex0 | ex1 | ex2 | ex3 | ex4 | unknown | 合計 |
|---|---:|---:|---:|---:|---:|---:|---:|
| civil-guide | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| civil-primary | 19 | 0 | 0 | 0 | 0 | 0 | 19 |
| civil-secondary | 14 | 0 | 0 | 0 | 0 | 0 | 14 |
| civil-textbook | 10 | 0 | 0 | 0 | 1 | 0 | 11 |
| other | 0 | 3 | 20 | 40 | 19 | 0 | 82 |
| pe-keyword | 596 | 0 | 2 | 0 | 0 | 0 | 598 |
| pe-past-exam | 24 | 0 | 0 | 0 | 0 | 0 | 24 |

### H. verdict 分布

| verdict | 件数 |
|---|---:|
| PASS | 407 |
| NEUTRAL | 345 |

### 判定マトリクス

| コード | 重要度 | 判定 | 推奨アクション |
|---|---|---|---|
| B | high | SSR / レンダリング問題の可能性 | page_fetch_state ≠ SUCCESSFUL の URL を curl で確認、構造修正 |
| C | high | 内部リンク到達不全（Issue #29 続行で正解） | Issue #29 (内部リンク拡充) の Phase 4 計測待機を継続 |
| E | medium | 戦略資産集中の根拠確定 | low-value ページ noindex 化を検討（200-400 ページ目安） |
| F | high | ブランド認知不足（ドメイン権威性問題） | 外部被リンク獲得、SNS / X 戦略強化、note 連携、合格体験記による独自データ構築 |

**詳細根拠**:

- **B** SSR / レンダリング問題の可能性: 756 件中 SUCCESSFUL は 475 件 (62.8%)
- **C** 内部リンク到達不全（Issue #29 続行で正解）: ex0 670 件中 663 件 (99.0%) が referring_urls=0
- **E** 戦略資産集中の根拠確定: インデックス済 407 件中 362 件 (89%) が 90 日 impressions=0
- **F** ブランド認知不足（ドメイン権威性問題）: ブランドクエリ "doboku" の月間 impressions ≒ 6.3（90日で19件）

### 実データ解釈（自動判定の補正）

スクリプトの判定マトリクスは閾値ベースでマッチした項目を機械的にラベル付けしているが、実データを読むと一部の判定文言は実態を反映していない。下記が **正しい読み方**:

#### B の補正: 「SSR 問題」ではなく「クロール未到達」

`PAGE_FETCH_STATE_UNSPECIFIED` 257 件 (34%) が SUCCESSFUL を押し下げている主因。`UNSPECIFIED` は「Googlebot が取得を試みていないため状態が未定義」を意味し、ex0 (検出 - インデックス未登録) のサブセットと一致する。**SSR が壊れているのではなく、そもそもクロールされていない**。`NOT_FOUND` 20 件は ex2 (404) と整合し、これは既知の停滞 URL。

→ 判定 B は **A の言い換えに過ぎず**、独立した SSR 問題は無い。

#### C の補正: 「Issue #29 続行で正解」ではなく「内部リンクが Google に認識されていない」

ex0 670 件中 663 件 (99%) が `referring_urls=0` という結果は、Issue #29 で `<RelatedKeywords>` 96% カバレッジ + ピラー双方向化（被リンク 668 件）を実装した **後** の数値。本来なら大半の URL が `referring_urls=1+` を持つはず。

考えられる原因:

1. **Google から見た内部リンクが認識されていない** — `<RelatedKeywords>` コンポーネントや pillar blockquote が Googlebot のパースで `<a href>` として拾われていない。Next.js の RSC / hydration / レンダリングで HTML 出力が想定と異なる可能性
2. **URL Inspection の `referring_urls` フィールドの仕様制限** — API は最大 5 件のサンプルしか返さない。ただし大量内部リンクがあれば 0 ではなく 1+ になるはずなので、これだけでは説明できない
3. **PageRank が薄すぎてサンプルにすら現れない** — ドメイン権威が低く、内部リンクの PageRank が Google のランキング閾値を下回る

いずれにせよ、**Issue #29 の続行は効果薄**。「もっと内部リンクを足す」方向ではなく、HTML 出力の検証 + 外部被リンク獲得へピボットすべき。

#### E と F は実態のまま読める

- **E**: 89% 幽霊ページ率 → 戦略資産集中の根拠確定
- **F**: 月間 6.3 件のブランド impressions → ドメイン権威性が極めて低い

### 結論と次の一手

**主因は (1) ドメイン権威性不足 + (2) 内部リンクが Google に認識されていない可能性** の複合。

#### 即時アクション（今週）

1. **HTML 出力の検証**（4-6 時間） — ex0 のサンプル 30 URL を `curl` で取得し、`<a href>` で正しく内部リンクが出力されているか確認。`<RelatedKeywords>` / pillar blockquote / RelatedTextbooks 等のリンクが SSR HTML に出ているか
2. **noindex 戦略の決定**（半日） — 89% 幽霊ページ率を踏まえ、low-value 200〜400 ページの noindex 候補リスト作成
3. **クロール統計情報の確認**（10 分、Web UI） — A の「7日以内クロール 61.8%」が真に高頻度か、Googlebot のリクエスト数が低いだけか確定

#### 中期戦略転換（1-3 ヶ月）

- **Issue #29 (内部リンク拡充) は close 候補**: 実装完了しているが効果限界。新規 Phase は起こさない
- **Issue #160 (記述式思考パターン抽出) を最優先**: 運営者本人の独自データが権威性の核
- **外部被リンク獲得**:
  - note 記事内に doboku-note 被リンク掲載
  - X / SNS でのブランド露出（Issue #161 SNS 自動投稿基盤）
  - 技術士コミュニティ・受験者ブログでの言及獲得

#### 仮説検証の優先順位

| 仮説 | 検証コスト | リターン |
|---|---|---|
| HTML 出力に内部リンクが欠落している | 低（curl + grep） | 高（バグ発見ならすぐ直せる） |
| ドメイン権威性が真因 | 中（GSC クロール統計、外部被リンク数調査） | 中（事実なら長期戦） |
| コンテンツ重複判定 | 高（既に D=0 で否定済） | - |

### 生データ

- URL Inspection 結果: `.claude/state/metrics/url-inspection/inspection-batch-2026-04-27*.json`
- Search Analytics page: `.claude/state/metrics/gsc/gsc-page-2026-04-27*.json`
- Search Analytics query: `.claude/state/metrics/gsc/gsc-query-2026-04-27*.json`
- 集計 JSON: `.claude/state/metrics/gsc/coverage-diagnosis-{ts}.json`
