# iOS アプリ仕様書 — 技術士（総合技術監理部門）対策アプリ

## Context

doboku-note v3 戦略（2026-04-13 策定）の収益化 3 本柱（note・YouTube・iOS アプリ）のうち、**iOS アプリ**を技術士（総合技術監理部門）対策から着手する。

理由:

1. **コンテンツ資産が最も整っている**: 649 キーワード・過去問 R01〜R07・5 管理ピラー・記述式分析（並行実装中）— iOS が消費するデータが既に体系化されている
2. **運営者が 2026-07 に 2 次筆記受験**: 自身が ユーザーになる、合格体験を直接活用できる v3 中核差別化
3. **競合が薄い**: 1 級土木と異なり技術士総監は専用アプリがほぼ無い（PE-stage / 総監受験応援サイト の Web しか無い）
4. **意思決定者の質**: 受験料 14,000 円 + 1 次・2 次合計の準備費 数十万円を投じる層なので、サブスク受容性が高い

本仕様書は **MVP（試験 1 ヶ月前にリリース可能な最小機能）** と **Phase 2 以降のロードマップ** を分けて記述する。

## アプリ名称（候補、user 選定待ち）

| # | 候補 | 字数 | 検索性 | ブランド整合 | 拡張性 | 備考 |
|---|---|---|---|---|---|---|
| A | **総監 Path** | 6 | ◎（独自語） | ◯ | ◎（建設部門アプリも `建設 Path` 等） | "合格への道" 含意、英語混在で硬さ抑制 |
| B | **doboku 総監** | 7 | ○ | ◎（doboku-note 直系） | △（ブランド固定） | doboku-note ブランド資産活用 |
| C | **合格者の総監** | 6 | △（汎用語） | ◎（v3 戦略「合格体験」と一致） | ○ | 運営者の合格体験を訴求 |
| D | **総監 2026** | 6 | ◎（年度語） | ○ | △（毎年改名必要） | 受験年度を明示 |
| E | **総合技術監理 Pro** | 9 | ◎ | ○ | ◎ | 国の正式名称、検索ヒット最大化 |
| F | **5管理ノート** | 6 | △（独自語） | ◯ | ◎ | 5 管理キーワード集との連動 |

**推奨**: **A「総監 Path」** または **B「doboku 総監」**。

- A: 独自語のため検索ヒット競合無し、Path = "合格への道筋" の含意、建設部門アプリ展開時に `建設 Path` 等で揃えられる
- B: doboku-note と直系のブランド継承、既存 SEO 流入を iOS 流入に転化しやすい

## ターゲットユーザー

| ペルソナ | 年代 | 受験段階 | 学習スタイル | 期待機能 |
|---|---|---|---|---|
| 1 次受験者 | 30 代後半〜50 代 | 1 次択一対策中 | スキマ時間（通勤・休憩）| 過去問演習・キーワード暗記 |
| 2 次筆記受験者 | 40 代〜50 代 | 1 次合格後の 2 次対策 | 集中学習（夜・休日）| 記述式論点整理・5 管理間トレードオフ |
| 口頭試験対策者 | 40 代〜50 代 | 2 次筆記合格後 | 直前期の確認 | 想定問答・倫理綱領 |

**主ターゲット = 1 次受験者**（人数が最大、購買意欲が最も明確）。MVP は 1 次対策に集中する。

## MVP スコープ（v1.0、目標リリース 2026-06）

### 機能

1. **過去問演習**
   - R01〜R07 の 1 次択一（40 問 × 7 年 = 280 問）
   - 年度別演習・ランダム演習・5 管理別演習の 3 モード
   - 各問題の解説・関連キーワードリンク
   - 自動採点・正答率推移グラフ

2. **キーワード集**
   - 649 キーワードの概要（無料）+ 詳細解説（有料）
   - 5 管理 × サブカテゴリ階層ナビ
   - 全文検索（minisearch 同等）

3. **学習管理**
   - 苦手問題ブックマーク
   - 学習日数連続記録（streak）
   - 各管理の正答率・進捗ダッシュボード

4. **オフライン対応**
   - 起動後はネット接続不要（コンテンツは初回起動時に bundle + delta fetch）

### 非対象（Phase 2+）

- 2 次記述式の論文サンプル
- 口頭試験対策
- ユーザー間のコミュニティ機能
- iPad 専用 UI

## Phase 2+ ロードマップ

| Phase | 時期 | 機能 |
|---|---|---|
| v1.1 | 2026-08（1 次試験後） | 解説の音声読み上げ、復習リマインダ通知 |
| v1.2 | 2026-09 | 2 次記述式 サンプル答案・採点観点 |
| v2.0 | 2026-12（2 次合格発表後） | 口頭試験対策・想定問答 100 問 |
| v2.1 | 2027 春 | iPad 専用 UI、Apple Pencil 対応 |
| v3.0 | 2027 中 | 1 級土木施工管理技士アプリの統合（doboku Path シリーズ化） |

## データモデル

### Question entity

```swift
struct Question {
  let id: String              // "r07-primary-001"
  let year: ExamYear          // .r07
  let session: ExamSession    // .primary
  let number: Int             // 1〜40
  let category: ManagementArea  // .economic, .humanResource, .information, .safety, .socialEnvironment
  let subcategory: String     // "2.1 事業企画" など
  let statement: String       // 問題文（markdown）
  let choices: [String]       // 5 選択肢
  let correctAnswer: Int      // 0-4
  let explanation: String     // 解説 markdown
  let relatedKeywordSlugs: [String]
  let difficulty: Difficulty  // .easy, .medium, .hard
}
```

### Keyword entity

```swift
struct Keyword {
  let id: String              // "pdca-cycle"
  let name: String            // "PDCA サイクル"
  let category: ManagementArea
  let subcategory: String
  let summary: String         // 100 文字程度（無料）
  let detailMarkdown: String  // 詳細解説（有料）
  let relatedKeywordSlugs: [String]
  let appearedInQuestions: [String]  // 過去問 id
}
```

### UserProgress entity (SwiftData / SQLite)

```swift
struct UserProgress {
  var completedQuestionIds: Set<String>
  var bookmarkedQuestionIds: Set<String>
  var correctRateByCategory: [ManagementArea: Double]
  var streakDays: Int
  var lastStudyDate: Date
}
```

## 収益モデル（v1.1 改訂 2026-04-26）

戦略の真実源は `docs/project/05_収益化戦略.md` の「7. iOS アプリ」節（v3.1）。本仕様書は実装視点で価格表・Free/Premium 境界を確定させる。

### 価格プラン（買い切り中心）

| プラン | 価格 | 含まれる機能 |
|---|---|---|
| **Free** | ¥0 | R07 全 40 問の演習・解説 + キーワード概要 (全 649 件) |
| **Standard 買い切り** | **¥1,800** | R01〜R06 全演習 + キーワード詳細 + 5 管理間トレードオフ + 弱点分析（StoreKit Non-Consumable、永続）|
| **試験 1 回パック** | ¥2,400 | Standard と同等、6 ヶ月限定（買い切り、StoreKit Non-Consumable、駆け込み層向け）|

**サブスク（年額 ¥3,000）は v2.0 以降で導入検討、MVP では出さない**。

### 価格根拠（v1 から v1.1 への変更点）

- ❌ 旧: サブスク ¥600/月・年額 ¥4,800・一括 ¥2,400 の 3 プラン（v1）
- ✅ 新: 買い切り ¥1,800 単軸（v1.1）
- 変更理由: 市場調査で **資格系アプリの相場は買い切り ¥500〜2,000、サブスクは宅建以外稀**と判明。隣接トップ TK office「1 級土木」¥1,600 が市場リーダー。受験料 ¥14,000 の 12% 相場 ¥1,800 に整合させ、「合格までずっと使える」訴求で買い切りの心理障壁を下げる

### Free / Premium 境界の設計原則

- **Free は「触ってみたい」を満たす** — R07 全開放で品質を体感させる
- **Premium は「合格まで伴走する」** — 過去 6 年分演習 + 詳細解説 + 弱点分析

詳細な境界・LTV/CAC・Red Line 運用は [05_収益化戦略.md の iOS 節](./05_収益化戦略.md) を参照。本仕様書は実装視点に集中する。

### 運営者特典の組込

- **iOS Premium 購入者には note 有料記事 30% OFF クーポン** を In-App で発行（送客）
- 受験合格後の運営者本人による「合格体験ノート（簡易版）」を Premium 内に提供（note 詳細版 ¥2,980 への導線）

## 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| 言語 | Swift 6 | strict concurrency 対応 |
| UI | SwiftUI | iOS 17+ 限定（古い OS 切り捨ててコード簡素化）|
| データ永続化 | SwiftData | iOS 17+ 標準、CoreData の後継 |
| 課金 | StoreKit 2 | iOS 15+、async/await 統合 |
| ネットワーク | URLSession + async/await | サードパーティ依存無し |
| 全文検索 | NSPredicate + SwiftData fetch | minisearch 不要（端末内検索のためレベル足りる）|
| Markdown レンダリング | Apple 純正 `AttributedString` (markdown init) | 簡易、外部 lib 不要 |
| アナリティクス | StoreKit Analytics + 自前 ログ | プライバシー配慮、外部 SDK 入れない |
| 配布 | TestFlight → App Store | Xcode Cloud or GitHub Actions + Fastlane |

**最低 OS**: iOS 17.0（2023 秋リリース、2026-06 時点で 90%+ シェア見込み）

## コンテンツパイプライン（doboku-note → iOS）

iOS アプリは doboku-note の build 出力を消費する。doboku-note 側に export スクリプトを追加。

### 1. doboku-note 側の追加

```
scripts/build-ios-data.mjs   # 新規
out/api/v1/
  questions.json             # 280 件、~500KB
  keywords-summary.json      # 649 件の概要、~200KB
  keywords/{slug}.json       # 個別詳細、各 5〜20KB
  manifest.json              # バージョン・件数
```

`npm run build` の prebuild で `build-ios-data` を実行、`out/api/v1/` 以下を生成。Cloudflare Pages が自動配信、CDN キャッシュも効く。

### 2. iOS アプリの取得方式

| データ | 取得タイミング | 保存先 |
|---|---|---|
| `manifest.json` | 起動時 | UserDefaults（version 比較） |
| `questions.json` | manifest version 更新時 | SwiftData に upsert |
| `keywords-summary.json` | 同上 | SwiftData に upsert |
| `keywords/{slug}.json` | 該当キーワード閲覧時 | SwiftData に lazy upsert + LRU キャッシュ |

**初回起動**: 全データ download (~1MB) → SwiftData 投入 → オフライン利用可能。

**コンテンツ更新**: doboku-note で過去問・キーワードを編集 → main push → Cloudflare 配信 → ユーザー次回起動時に自動更新（App Store 審査不要）。

## App Store 登録情報

| 項目 | 内容 |
|---|---|
| App Name | （上記候補から選定） |
| Subtitle | 例: 「過去問 280 問 + キーワード集 649 で 1 発合格」 |
| Bundle ID | `com.uruhayato373.doboku-pe` |
| Category | Primary: Education, Secondary: Reference |
| Age Rating | 4+ |
| Privacy Policy | https://doboku-note.com/privacy |
| Support URL | https://doboku-note.com/contact |
| Marketing URL | https://doboku-note.com/category/pe-comprehensive-management |
| キーワード（100 文字以内、半角カンマ区切り）| `総合技術監理,技術士,5管理,過去問,試験対策,経済性管理,人的資源管理,情報管理,安全管理,社会環境管理` |

## アイコン・ブランディング

### コンセプト

- doboku-note のロゴと視覚的繋がり（同じセリフ書体・同じブランドカラー）
- 「総監」を象徴するモチーフ:
  - 候補 1: 5 管理を表す 5 角形
  - 候補 2: PDCA を表す円環
  - 候補 3: 「総」の漢字をモダンに抽象化

**推奨**: 候補 1（5 角形）。5 管理は試験のテーマ階層と一致、視覚的識別性が高い。

### カラーパレット

doboku-note の `--color-brand`（深ブルー系）を踏襲、アクセントに `--color-positive`（試験合格を象徴する緑）を点で入れる。

## 開発フェーズ

| フェーズ | 期間 | 完了条件 |
|---|---|---|
| **0. 仕様確定** | 2026-04-26〜04-30 | アプリ名確定・本仕様書 v1 確定・user 承認 |
| **1. リポジトリ初期化** | 2026-05-01〜05-03 | `doboku-ios` GitHub repo + Xcode project + SwiftData スキーマ + 課金 sandbox 検証 |
| **2. データパイプライン** | 2026-05-03〜05-07 | doboku-note 側で `out/api/v1/*.json` 出力、iOS が download → SwiftData 投入できる |
| **3. MVP 実装** | 2026-05-08〜05-25 | 過去問演習・キーワード集・進捗ダッシュボード・課金フロー |
| **4. TestFlight ベータ** | 2026-05-25〜05-31 | 運営者本人テスト + Apple 審査 |
| **5. App Store 公開** | 2026-06-01 | 1 次試験 1 ヶ月前リリース、App Store Search Ads 投下 |
| **6. 試験前最終調整** | 2026-06-01〜07-12 | バグ修正・コンテンツ追加（FAQ 等）|

## 検証エンドツーエンド

| 検証項目 | 方法 | 期待値 |
|---|---|---|
| データパイプライン | `npm run build:ios-data && jq '. | length' out/api/v1/questions.json` | 280 件 |
| iOS データ取得 | TestFlight ビルドで初回起動 → SwiftData の Question count 確認 | 280 件 |
| 過去問演習 | R07 全 40 問を解答 → 正答率表示確認 | 40/40 表示 |
| キーワード詳細 | キーワード閲覧 → ネット切断 → 再閲覧 | キャッシュ表示 |
| 課金フロー | StoreKit Sandbox で月額購入 → Premium 機能解放 | 全機能アンロック |
| オフライン | 機内モードで全機能動作 | OK |
| 受験者 UX | 運営者本人が試験 1 ヶ月前から実利用 | 合格に貢献する手応え |

## クリティカルファイル一覧

### doboku-note 側（追加）

- `scripts/build-ios-data.mjs`（新規）
- `package.json`（npm script `build:ios-data` 追加）
- `out/api/v1/`（build 副産物、git 追跡しない）

### doboku-ios 側（新規リポジトリ）

```
doboku-ios/
├── doboku-pe.xcodeproj
├── doboku-pe/
│   ├── App/                  # entry, splash, launch
│   ├── Features/
│   │   ├── Practice/         # 過去問演習
│   │   ├── Keywords/         # キーワード集
│   │   ├── Progress/         # 進捗ダッシュボード
│   │   └── Subscription/     # 課金
│   ├── Data/
│   │   ├── Models/           # SwiftData entity
│   │   ├── Sync/             # doboku-note からの fetch
│   │   └── Repository/
│   ├── UI/
│   │   ├── Components/
│   │   └── Theme/            # doboku-note ブランド継承
│   └── Resources/
│       ├── Assets.xcassets/
│       └── Localizable.strings
├── doboku-peTests/
└── README.md
```

## リスクと回避策

| リスク | 回避策 |
|---|---|
| 試験前リリースが間に合わない | MVP スコープを最小化、Phase 2 機能を切る覚悟。最悪 7 月試験は β（TestFlight）で運営者本人だけ使う形で受験 |
| Apple 審査リジェクト | 課金フロー・プライバシー記述を Apple ガイドライン準拠で初回提出、リリースの 2 週間前に提出 |
| コンテンツ更新が App Store 審査ボトルネック | コンテンツは doboku-note からの runtime fetch にしているため、コードの bug fix 以外は審査不要 |
| Free → Premium 転換率が想定 15% を下回る | Free 範囲を「触ってみたい」に最適化、買い切り価格を ¥1,500 に下げる検討（v1.2）|
| 1 級土木との統合判断（v3.0）| 当面は別アプリ。統合は v3.0 で判断（合格後）|
| note カニバリで売上分散 | [05 の Red Line 運用化表](./05_収益化戦略.md) に従い iOS は演習・参照、note は読み物・体験で完全分離 |

## 関連ドキュメント

- `docs/project/02_事業戦略.md`（v3） — 3 本柱戦略
- `docs/project/05_収益化戦略.md`（v3） — iOS アプリ位置づけ
- `docs/project/19_note-content-runway-2026.md` — note 連携
- `docs/project/27_essay-pattern-extraction-plan.md` — 2 次記述式（v1.2 で組み込み予定）

## 次のアクション

1. **アプリ名確定**（候補 A〜F から user 選定）
2. **アイコンデザイン方針確定**
3. **doboku-ios リポジトリ初期化**（Apple Developer Program 加入要、年 $99）
4. **doboku-note 側 `build-ios-data.mjs` 着手**
