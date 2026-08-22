# NSM 定義と計測指標

`/nsm-experiment` および関連スキル（`/weekly-plan`, `/weekly-review`）が参照する **NSM の戦略的定義と目標値の真実源**。旧 NSM 計測指標ドキュメント（当時の docs/project 配下、廃止）を本 reference に移管（2026-04-14）。

**progressive disclosure**: 本ファイルは必要時のみ skill から読み込まれる。変更時は改訂履歴に追記すること。

---

## North Star Metric

### 月間オーガニック検索流入ユーザー数

Google 検索経由の月間ユニークユーザー数（GA4 で計測）。

| 項目 | 値 |
|---|---|
| **定義** | GA4 のオーガニック検索チャネル `sessionDefaultChannelGroup = "Organic Search"` のユニークユーザー数 / 月 |
| **実装** | `.claude/scripts/lib/metrics-reader.mjs` の `ga4.organic.thisUsers`（月次版は別途集計が必要）|
| **現在値** | 週 27 UU（2026-W16 実測、月次換算 ≈ 110 UU）|
| **6 ヶ月目標** | 30,000 UU / 月 |
| **12 ヶ月目標** | 100,000 UU / 月 |

### なぜこの指標か

1. **大半の収益が SEO 流入に依存** — AdSense・アフィリエイト・note 有料記事への導線、大半がオーガニック検索から始まる
2. **コンテンツ価値の代理指標** — 検索から来るユーザーが増える = Google がコンテンツを評価している
3. **先行指標** — 収益は流入の結果。流入を伸ばせば収益は後からついてくる
4. **アクション可能** — ページ追加・SEO 最適化・内部リンク改善など、直接的な施策で改善できる

**v3 の補足**: Q3 から YouTube チャンネルを本格立ち上げするため、YouTube 経由の UTM 流入もセカンダリ指標として追跡する。直接収益の大半は依然として SEO → note が主力。

---

## 将来の補助指標

### YouTube KPI（Q3 以降）

運営者の総監合格を踏まえ、Q3 以降に立ち上げるチャンネルの計測指標:

| 項目 | 値 |
|---|---|
| 定義 | YouTube 経由の doboku-note 流入セッション数（UTM 計測） |
| 現在値 | 0（未開設） |
| 3 ヶ月目標（Q3 末） | チャンネル登録 200 / 月間再生 5,000 / UTM 流入 月 200 セッション |
| 6 ヶ月目標（Q4 末） | チャンネル登録 500 / UTM 流入 月 1,000 セッション |

### iOS アプリの NSM

| 項目 | 値 |
|---|---|
| 定義 | App Store からの月間新規ダウンロード数 |
| 現在値 | 0（未リリース） |
| **着手条件** | **Web 月間収益 ≥ ¥15,000 かつ 技術士総監筆記合格発表済み（2026-10 月末以降）** |
| リリース月目標 | 1,000 |
| 6 ヶ月目標 | 500 / 月（安定期） |

---

## Input Metrics

NSM を駆動する入力指標。施策の優先順位はこれらへの貢献度で判断する。

| # | 指標 | 定義 | データソース | 実装 |
|---|---|---|---|---|
| 1 | インデックス済みページ数 | GSC「有効」ステータスのページ数 | Google Search Console | `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs` + `.claude/scripts/inspect-url.mjs` |
| 2 | 検索 CTR | GSC 平均クリック率 | Google Search Console | `metrics-reader.mjs` の `gsc.total.thisCtr` |
| 3 | セッションあたりページ閲覧数 | GA4 の平均ページ/セッション | Google Analytics 4 | `fetch-ga4-data.mjs` の `screenPageViewsPerSession` |
| 4 | 週間リピーター率 | 週内に 2 回以上訪問したユーザーの割合 | Google Analytics 4 | GA4 Data API (未実装) |
| **5** | **Core Web Vitals (LCP / INP / CLS)** | 実ユーザー計測の 75th percentile、モバイル基準 | PageSpeed Insights API | `.claude/scripts/fetch-psi-data.mjs` |
| **6** | **Lighthouse Performance スコア** | ラボ環境での総合スコア 0-100 | PageSpeed Insights API | `.claude/scripts/fetch-psi-data.mjs` |
| ★7 | **YouTube UTM 流入** | YouTube 経由のセッション数 | GA4 + UTM | Q3 以降 |
| ★8 | **note 商品ページ遷移数** | 記事末尾 CTA から note 商品ページへの遷移 | GA4 イベント | note 商品発行後 |
| ★9 | **ページ別 AdSense RPM** | 1,000 PV あたりの収益 | AdSense Management API | AdSense 再申請通過後 |

---

## メトリクスツリー

NSM（月間オーガニック検索流入ユーザー数）は以下の因果関係で構成される:

```
NSM = 検索表示回数 × CTR
  検索表示回数 = インデックス済みページ数 × ページあたり平均表示回数
    → インデックス数を増やす施策: コンテンツ追加、サイトマップ最適化
    → ページあたり表示を増やす施策: title/description 最適化、構造化データ
  CTR を上げる施策: title 改善、リッチスニペット対応、検索意図との一致

補助指標:
  ページ/セッション → 内部リンク・関連コンテンツの質を反映
  リピーター率 → コンテンツの継続的価値を反映
```

`playbook.md` の実験カテゴリはこのツリーと対応している:

- カテゴリ 1（検索クエリ個別改善） → CTR × ページあたり表示の向上
- カテゴリ 2（CTR 改善） → CTR 直接向上
- カテゴリ 3（コンテンツ追加） → インデックス数の向上
- カテゴリ 4（技術的 SEO） → リッチスニペット獲得 → CTR 向上
- カテゴリ 5（UX / 回遊性） → ページ/セッション の補助指標向上

---

## 試験別の成功指標

2 試験フォーカスの効果を計測するため、試験別のセカンダリ指標も追跡:

| 試験 | 計測指標 | 目標値 |
|---|---|---|
| **1 級土木施工管理技士** | 関連キーワード（「1 級土木」「施工管理」等）での月間流入 | 月間 10,000+ UU |
| **技術士（総合技術監理）** | 関連キーワード（「技術士」「総監」等）での月間流入 | 月間 5,000+ UU（2 次上線後） |

これらは NSM のサブセット。全体 NSM が 30,000 に到達していなくても、どちらかの試験で目標に届いていれば「その試験のコンテンツは機能している」と判定する。

---

## 計測基盤の現状（2026-04-14 時点）

すべて Step 1-3 で構築済み:

- GA4: `G-8VXJ1RL1HG` で計測中、Data API アクセス権あり
- GSC: `sc-domain:doboku-note.com` へサービスアカウント `mac-145@doboku-note-492906.iam.gserviceaccount.com` が閲覧者権限を持つ
- PageSpeed Insights API: 同サービスアカウント経由で呼び出し可能、Core Web Vitals + Lighthouse スコア取得
- URL Inspection API: GSC と同スコープで呼び出し、インデックス状態診断
- `.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs`, `.claude/scripts/fetch-ga4-data.mjs`, `.claude/scripts/fetch-psi-data.mjs`, `.claude/scripts/inspect-url.mjs`, `.claude/scripts/lib/metrics-reader.mjs`, `.claude/scripts/snapshot-weekly-metrics.mjs` が動作
- `/weekly-plan` と `/weekly-review` の Agent C が自動取得
- 週次スナップショット: `.claude/state/weekly-metrics/YYYY-Www.json`

**AdSense Management API は別途**: doc 12 (AdSense 再申請戦略) の審査通過後に `scripts/fetch-adsense-data.mjs` を追加予定。同サービスアカウント流用可。

---

## 関連ドキュメント

- `docs/strategy/03_事業戦略.md` — 成長ループとの関係（v3）
- `docs/strategy/04_収益化戦略.md` — 収益化戦略の四半期目標（v3）
- `docs/marketing/01_SNS集客戦略.md` — SNS 集客戦略 v5（X・YouTube・Instagram 統合）
- `.claude/knowledge/reference/data-storage-decision.md` — 計測データの保存方針（ADR）

---

**改訂履歴**:

- 2026-04-14: 旧 NSM 計測指標ドキュメント（当時の docs/project 配下、廃止）から本 reference に移管。計測基盤の現状セクションを Step 1-3 完了後の実装ポインタに書き換え。「計測の開始条件（サービスアカウント未取得）」セクションは完了により削除。
