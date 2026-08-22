# iOS アプリ仕様書 — 技術士（総合技術監理部門）対策アプリ

> [!important] 2026-06-04 方針変更：過去問演習は PWA 先行へ移管
> 過去問演習という主用途は、Apple Developer $99/年・手数料 30%・着手条件 ¥15k を回避できる **PWA に先行移管**する（[06_PWA過去問アプリ設計方針.md](./06_PWA過去問アプリ設計方針.md)）。本仕様書の MVP（過去問演習）は事実上 PWA に置き換わる。iOS は将来「キーワード詳細・5 管理トレードオフ・合格体験」など PWA で出しにくい別価値に振り直すか保留とし、本仕様書は再定義候補として残す。以下の記述は移管前の前提に基づく。

> **v3 (2026-05-19)** — [05_iOSベンチマーク調査](./05_iOSベンチマーク調査.md)（資格学習 iOS アプリ 17 本横断調査）を反映してブラッシュアップ。
> v2 からの主要変更点: ①MVP に 6 機能追加（試験日カウントダウン+リマインダー、Home に進捗常駐、一問一答+4択 dual モード、解説の段階開示、学習履歴永続保証、法改正なし訴求）、②Phase 2+ ロードマップに 5 候補追加（SRS 間隔反復、AI Q&A、合格者ストーリー、論述骨子テンプレ、週次達成バッジ）、③成功監視 KPI を明文化、④収益モデル ¥1,800 買い切り単軸の妥当性を市場データで裏付け。
> v2 構造（仕様書 + [画面設計](./02_iOS画面設計.md) + [データパイプライン契約](./03_iOSデータパイプライン.md) + [エコシステム動線](./04_iOSエコシステム動線.md) + [ベンチマーク調査](./05_iOSベンチマーク調査.md) の 5 ドキュメント体制）は維持。

## Context

doboku-note v3 戦略（2026-04-13 策定）の収益化 3 本柱（note・YouTube・iOS アプリ）のうち、**iOS アプリ**を技術士（総合技術監理部門）対策から着手する。

理由:

1. **コンテンツ資産が最も整っている**: 657 キーワード・過去問 H21〜R07（MVP は R01〜R07 の 280 問）・5 管理ピラー・記述式分析（並行実装中）— iOS が消費するデータが既に体系化されている
2. **運営者が技術士総合技術監理部門に合格済み**: 自身がユーザー視点を持ち、合格体験を直接活用できる v3 中核差別化（合格者ブランドで訴求可能）
3. **競合が薄い**: 1 級土木と異なり技術士総監は専用アプリがほぼ無い（PE-stage / 総監受験応援サイト の Web しか無い）
4. **意思決定者の質**: 受験料 14,000 円 + 準備費 数十万円を投じる層なので、買い切り ¥1,800 の支払い受容性が高い

本仕様書は **MVP（試験 1 ヶ月前にリリース可能な最小機能）** と **Phase 2 以降のロードマップ** を分けて記述する。

### 着手判断と先行整備の方針

- **着手条件**（[戦略 §7](../strategy/04_収益化戦略.md) より）: ①Web 月間収益 ≥ ¥15,000 ②筆記合格発表済み
- **現状**: 筆記合格は ✅ 達成済み（運営者合格済み）。Web ¥15k は **未達成**
- **方針**: 着手判断までは仕様/設計を先行整備。実装着手は Web 収益条件達成後
- **最初のリリース目標**: 2027-07 試験（総監 2 次筆記、年 1 回）。逆算で 2027-05-31 までに App Store 公開

## アプリ名称（確定保留）

候補 A〜F は下表のとおり評価済みだが、**ユーザー判断により確定は実装着手直前まで保留**。仕様/設計フェーズでは Bundle ID・App Store 関連項目を `TBD` プレースホルダーで進める。

| # | 候補 | 字数 | 検索性 | ブランド整合 | 拡張性 | 備考 |
|---|---|---|---|---|---|---|
| A | **総監 Path** | 6 | ◎（独自語） | ◯ | ◎（建設部門アプリも `建設 Path` 等） | "合格への道" 含意、英語混在で硬さ抑制 |
| B | **doboku 総監** | 7 | ○ | ◎（doboku-note 直系） | △（ブランド固定） | doboku-note ブランド資産活用 |
| C | **合格者の総監** | 6 | △（汎用語） | ◎（v3 戦略「合格体験」と一致） | ○ | 運営者の合格体験を訴求 |
| D | **総監 2026** | 6 | ◎（年度語） | ○ | △（毎年改名必要） | 受験年度を明示 |
| E | **総合技術監理 Pro** | 9 | ◎ | ○ | ◎ | 国の正式名称、検索ヒット最大化 |
| F | **5管理ノート** | 6 | △（独自語） | ◯ | ◎ | 5 管理キーワード集との連動 |

**評価による上位 2 候補**: **A「総監 Path」** または **B「doboku 総監」**。

- A: 独自語のため検索ヒット競合無し、Path = "合格への道筋" の含意、建設部門アプリ展開時に `建設 Path` 等で揃えられる
- B: doboku-note と直系のブランド継承、既存 SEO 流入を iOS 流入に転化しやすい

**確定タイミング**: Web ¥15k 達成・実装着手直前（Phase 1 リポジトリ初期化の直前）。それまでは商標検索結果や App Store 競合状況の変化を踏まえて再評価する。

## ターゲットユーザー

| ペルソナ | 年代 | 受験段階 | 学習スタイル | 期待機能 |
|---|---|---|---|---|
| 1 次受験者 | 30 代後半〜50 代 | 1 次択一対策中 | スキマ時間（通勤・休憩）| 過去問演習・キーワード暗記 |
| 2 次筆記受験者 | 40 代〜50 代 | 1 次合格後の 2 次対策 | 集中学習（夜・休日）| 記述式論点整理・5 管理間トレードオフ |
| 口頭試験対策者 | 40 代〜50 代 | 2 次筆記合格後 | 直前期の確認 | 想定問答・倫理綱領 |

**主ターゲット = 1 次受験者**（人数が最大、購買意欲が最も明確）。MVP は 1 次対策に集中する。

## MVP スコープ（v1.0、目標リリース 2027-05、最初の試験は 2027-07）

### 機能（v3 でベンチマーク調査を反映してブラッシュアップ）

1. **過去問演習**
   - R01〜R07 の択一式（40 問 × 7 年 = 280 問）
   - 年度別演習・ランダム演習・5 管理別演習の 3 モード
   - **一問一答モード + 4 択モードの dual format**（同じ問題を両形態で出題、TK office ベストプラクティス）
   - 各問題の解説・関連キーワードリンク
   - 自動採点・正答率推移グラフ
   - **解説の段階開示**（「方針」→「ヒント」→「解答」の 3 段、5 管理間トレードオフ問題で特に有効）

2. **キーワード集**
   - 657 キーワードの概要（無料）+ 詳細解説（有料）
   - 5 管理 × サブカテゴリ階層ナビ
   - 全文検索（minisearch 同等）

3. **学習管理**
   - 苦手問題ブックマーク
   - 学習日数連続記録（streak）
   - 各管理の正答率・進捗ダッシュボード（**Home Tab に常駐表示**、「現在地」が常時見える設計）
   - **学習履歴の永続保証**（SwiftData migration を v1 から確立、App Store 説明文に「永続保証」を明記）

4. **試験日対策**（v3 追加）
   - **試験日カウントダウン**（Home Tab に「試験まで N 日」を常駐表示）
   - **Local Notification リマインダー**（試験日カスタム設定、学習リマインダー）
   - **法改正なしの構造的優位を訴求**（受験者は最新版を毎年買い直す必要なし、App Store 説明文・Onboarding で明記）

5. **オフライン対応**
   - 起動後はネット接続不要（コンテンツは初回起動時に bundle + delta fetch）

### 非対象（Phase 2+）

- 2 次記述式の論文サンプル
- 口頭試験対策
- ユーザー間のコミュニティ機能
- iPad 専用 UI
- 動画講義（買い切り単軸と矛盾するため不採用）
- ランキング・SNS 的勉強仲間機能（受験母数 3,500 人では成立しないため不採用）
- 広告モデル（買い切りより LTV 低下するため不採用）

## Phase 2+ ロードマップ（v3 でベンチマーク調査の候補を追加）

| Phase | 時期 | 機能 | 根拠 |
|---|---|---|---|
| v1.1 | リリース後 1〜2 ヶ月 | **SRS（間隔反復）モード**（解いた問題を 1 日→3 日→7 日→14 日で自動再出題） | 医療系で標準化、土木建設で未浸透 → 明確な差別化軸 |
| v1.1 | リリース後 1〜2 ヶ月 | **週次達成バッジ + 試験日逆算ストリーク** | Duolingo の知見を年 1 回受験文脈に最適化 |
| v1.2 | リリース後 3〜4 ヶ月 | **合格者ストーリーモジュール**（運営者の合格体験を「失敗→修正→合格」章立てで Premium 同梱） | v3 戦略の中核差別化「合格者一次情報」の最大活用 |
| v1.2 | リリース後 3〜4 ヶ月 | 解説の音声読み上げ、復習リマインダ通知 | 耳学ニーズ |
| v1.3 | リリース後 5〜6 ヶ月 | **AI Q&A**（657 キーワード文脈、Free 1 日 3 回・Premium 無制限） | 独学 TODAY 先行、OpenAI API 従量で原価管理可 |
| v1.3 | リリース後 5〜6 ヶ月 | **記述式 論述骨子テンプレート**（note 有料記事 P-01〜P-07 を iOS 内へ移植/クロスセル） | note との相互送客強化、Premium 価値向上 |
| v2.0 | 2027 中（2 次合格発表後） | 2 次記述式 サンプル答案・採点観点、口頭試験対策・想定問答 100 問 | 戦略 §7 計画通り |
| v2.0 | 2027 中 | **論述添削サービス**（別 IAP として加える、合格年だけ必要なのでサブスク適合） | ベンチマーク §5 結論、合格後不要な過去問本体は買い切り維持 |
| v2.1 | 2027 後半 | iPad 専用 UI、Apple Pencil 対応 | iPad ニーズが見えてきた段階で |
| v3.0 | 2028 | 1 級土木施工管理技士アプリの統合（doboku Path シリーズ化） | 戦略 §7 計画通り |

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

## 収益モデル

戦略の真実源は `docs/strategy/04_収益化戦略.md` の「7. iOS アプリ」節（v3.1）。本仕様書は実装視点で価格表・Free/Premium 境界を確定させる。

### 価格プラン（買い切り中心）

| プラン | 価格 | 含まれる機能 |
|---|---|---|
| **Free** | ¥0 | R07 全 40 問の演習・解説 + キーワード概要 (全 657 件) |
| **Standard 買い切り** | **¥1,800** | R01〜R06 全演習 + キーワード詳細 + 5 管理間トレードオフ + 弱点分析（StoreKit Non-Consumable、永続）|
| **試験 1 回パック** | ¥2,400 | Standard と同等、6 ヶ月限定（買い切り、StoreKit Non-Consumable、駆け込み層向け）|

**サブスク（年額 ¥3,000）は v2.0 以降で導入検討、MVP では出さない**。

### 価格根拠（市場データによる裏付け）

[05_iOSベンチマーク調査.md](./05_iOSベンチマーク調査.md) §5 で 17 アプリ横断調査の結果、¥1,800 買い切り単軸の妥当性を確認:

- **直接競合 TK office ¥1,600（4.5★/344 件）と同価格帯**、5 管理レーダー・キーワード 657 件・合格者一次情報で価値上乗せ説明可能
- 総監は年 1 回受験・合格後不要 → サブスクの「複数年支払い」が成立しない
- **v2.0 で「論述添削サービス」を別 IAP として加える形が次のサブ併設の最適形**（合格年だけ必要なのでサブ適合、過去問本体は買い切り維持）

### 成功監視 KPI（v3 追加）

MVP リリース後に観測する指標と再評価アクション。詳細は [05_iOSベンチマーク調査.md §6](./05_iOSベンチマーク調査.md) 参照。

| KPI | 業界ベンチマーク | 当方目標 | アクション |
|---|---|---|---|
| **DL→Premium 購入 CV** | 2〜5% | 5% | 達成 → 値上げ検討 / 未達 → Free 範囲拡大検討 |
| **D7 retention** | 教育系 20-30% | 25% | 未達 → Onboarding + Push 通知再設計 |
| **D30 retention** | 教育系 10-15% | 12% | 未達 → SRS 等の学習継続機能を v1.1 で優先実装 |
| **平均評価** | 競合 4.5〜4.8 | 4.5 以上 | 未達 → レビュー分析で改善優先順位決定 |
| **再 DL 率（試験翌年）** | 不明 | 任意ログ | 20% 超なら「翌年版アップデート ¥800」等の Consumable IAP 検討 |
| **Premium 購入者の合格率** | 業界平均 13% | 25% | 任意アンケート、訴求材料化 |

### Free / Premium 境界の設計原則

- **Free は「触ってみたい」を満たす** — R07 全開放で品質を体感させる
- **Premium は「合格まで伴走する」** — 過去 6 年分演習 + 詳細解説 + 弱点分析

詳細な境界・LTV/CAC・Red Line 運用は [04_収益化戦略.md の iOS 節](../strategy/04_収益化戦略.md) を参照。本仕様書は実装視点に集中する。

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

> **詳細仕様**: JSON schema・versioning・delta fetch・エラーハンドリングは [03_iOSデータパイプライン.md](./03_iOSデータパイプライン.md) を真実源とする。本セクションは概略のみ。

### 1. doboku-note 側の追加

```
scripts/build-ios-data.mjs   # 新規
out/api/v1/
  manifest.json              # バージョン・件数・SHA256
  questions.json             # 280 件、~500KB
  keywords-summary.json      # 657 件の概要、~250KB
  keywords/{slug}.json       # 個別詳細、各 5〜20KB
```

`npm run build` の prebuild で `build-ios-data` を実行、`out/api/v1/` 以下を生成。Cloudflare Pages が自動配信、CDN キャッシュも効く。

### 2. iOS アプリの取得方式

| データ | 取得タイミング | 保存先 |
|---|---|---|
| `manifest.json` | 起動時（前回から 24h 以上経過時） | UserDefaults（version 比較） |
| `questions.json` | manifest version 更新時 | SwiftData に upsert |
| `keywords-summary.json` | 同上 | SwiftData に upsert |
| `keywords/{slug}.json` | 該当キーワード閲覧時 | SwiftData に lazy upsert + LRU キャッシュ |

**初回起動**: 全データ download (~1MB) → SwiftData 投入 → オフライン利用可能。

**コンテンツ更新**: doboku-note で過去問・キーワードを編集 → main push → Cloudflare 配信 → ユーザー次回起動時に自動更新（App Store 審査不要）。

## App Store 登録情報

| 項目 | 内容 |
|---|---|
| App Name | TBD（アプリ名確定後に記入） |
| Subtitle | 例: 「過去問 280 問 + キーワード集 657 で 1 発合格」 |
| Bundle ID | TBD（アプリ名確定後に決定、暫定: `com.uruhayato373.doboku-pe`） |
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

**Phase 0（仕様/設計）は着手判断前に並走可能**、Phase 1 以降は着手判断（Web ¥15k 達成 + 筆記合格）後に開始。日付は着手判断日を T+0 とした相対表記。

### Phase 0: 仕様/設計（着手判断前、並走可能）

| サブフェーズ | 期間目安 | 完了条件 | ステータス |
|---|---|---|---|
| **0-1. 戦略整合** | 完了 | [04_収益化戦略.md §7](../strategy/04_収益化戦略.md) と整合した価格・スコープ確定 | ✅ v3.1 / 本仕様書 v2 で確定 |
| **0-2. 仕様書 v2** | 完了 | 本ドキュメント v2 確定 | ✅ 2026-05-19 |
| **0-3. 画面設計** | 1-2 週 | [02_iOS画面設計.md](./02_iOS画面設計.md) 確定（主要 8 画面ワイヤー + 画面遷移図 + Free/Premium UI 挙動） | ✅ v2 (2026-05-19) |
| **0-4. データパイプライン契約** | 1 週 | [03_iOSデータパイプライン.md](./03_iOSデータパイプライン.md) 確定（JSON schema + version 規約 + delta fetch） | ✅ v1 (2026-05-19) |
| **0-5. エコシステム動線** | 3-5 日 | [04_iOSエコシステム動線.md](./04_iOSエコシステム動線.md) 確定（iOS ↔ Web ↔ note の動線・Apple ガイドライン準拠・クーポン・Universal Link） | ✅ v1 (2026-05-19) |
| **0-6. ベンチマーク調査** | 1 日 | [05_iOSベンチマーク調査.md](./05_iOSベンチマーク調査.md) 確定（資格学習 iOS アプリ 17 本横断調査、MVP 追加機能の根拠） | ✅ v1 (2026-05-19) |
| **0-7. アプリ名確定** | — | A〜F から user 選定、商標調査、bundle ID 決定 | ⏸️ Phase 1 直前まで保留 |

### Phase 1〜6: 実装（着手判断後、T+0 = Web ¥15k 達成日）

| フェーズ | 期間 | 完了条件 |
|---|---|---|
| **1. リポジトリ初期化** | T+0〜T+3d | `doboku-ios` GitHub repo + Xcode project + SwiftData スキーマ + 課金 sandbox 検証、Apple Developer Program 加入 |
| **2. データパイプライン実装** | T+3d〜T+10d | doboku-note 側で `out/api/v1/*.json` 出力（02 仕様準拠）、iOS が download → SwiftData 投入できる |
| **3. MVP 実装** | T+10d〜T+45d | 主要 8 画面（02 設計準拠）+ 課金フロー + 進捗ダッシュ |
| **4. TestFlight ベータ** | T+45d〜T+60d | 運営者本人テスト + クローズドベータ + Apple 審査 |
| **5. App Store 公開** | T+60d | リリース、ASO 開始（App Store Search Ads は当面投下しない） |
| **6. 試験前最終調整** | リリース後〜試験 | バグ修正・コンテンツ追加（FAQ 等） |

**最初の試験リリース目標**: 2027-07 試験向け → 逆算で T+60d ≤ 2027-05-31 → **T+0 ≤ 2027-04-01**（Web ¥15k がそれまでに達成されていない場合は 2028-07 試験にスライド）。

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
| note カニバリで売上分散 | [04_収益化戦略.md の Red Line 運用化表](../strategy/04_収益化戦略.md) に従い iOS は演習・参照、note は読み物・体験で完全分離 |

## 関連ドキュメント

- `docs/strategy/03_事業戦略.md`（v3） — 3 本柱戦略
- `docs/strategy/04_収益化戦略.md`（v3） — iOS アプリ位置づけ
- `../../note/技術士総監/noteコンテンツ計画.md` — note 連携
- 2 次記述式の組み込みは v1.2 予定（記述式パターン分析は task-queue T-017 で進行中）

## 次のアクション

### Phase 0（着手判断前、現在進行中）

1. ✅ **本仕様書 v3 確定**（2026-05-19、ベンチマーク反映）
2. ✅ **[02_iOS画面設計.md](./02_iOS画面設計.md) v2 確定**（2026-05-19、新機能 UI 反映）
3. ✅ **[03_iOSデータパイプライン.md](./03_iOSデータパイプライン.md) v1 確定**（2026-05-19）
4. ✅ **[04_iOSエコシステム動線.md](./04_iOSエコシステム動線.md) v1 確定**（2026-05-19）
5. ✅ **[05_iOSベンチマーク調査.md](./05_iOSベンチマーク調査.md) v1 確定**（2026-05-19、資格学習アプリ 17 本横断調査）
6. ⏸️ **アイコンデザイン方針確定**（実装直前に Phase 0-3 と接続）

### Phase 1（着手判断 = Web ¥15k 達成後）

1. **アプリ名確定**（候補 A〜F から user 選定）
2. **Apple Developer Program 加入**（年 $99）
3. **doboku-ios リポジトリ初期化**
4. **doboku-note 側 `build-ios-data.mjs` 着手**（02 契約準拠）
