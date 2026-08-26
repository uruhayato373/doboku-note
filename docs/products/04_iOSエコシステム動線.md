# iOS エコシステム動線設計 — 3 層連携の真実源

<!-- audit:2026-08-18 -->
> [!note] 未チェック記法の位置づけ（2026-08-18 実査）
> App Store 審査要件と Phase 別の**判断トリガー**。iOS/PWA は着手条件（Web 月収 ¥15k）が未達で backlog にカードを持たない。条件が成立した時点で起票する。ここでは受入条件として残す。

> **v1 (2026-05-19)** — 仕様書 v2 ([01_iOSアプリ仕様.md](./01_iOSアプリ仕様.md)) Phase 0-6 として作成。iOS アプリ単体ではなく、**iOS ↔ doboku-note Web ↔ note** の 3 層エコシステム内の動線・送客・カニバリ防止・Apple ガイドライン準拠の真実源。02 (画面設計) と 03 (データパイプライン) が iOS 単体の仕様、本書は外部接続の仕様。

## 本書の役割と境界線

### 真実源として担うもの

- iOS から外部（Web / note）への送客動線
- 外部から iOS への流入動線（Universal Link / App Store バナー）
- Apple App Store Review Guidelines 準拠ルール（OK / NG パターン集）
- クーポンコード発行・利用フロー
- UTM パラメータ統一（iOS 固有 source）
- カニバリ防止のための画面別表示ルール

### 他文書に委ねるもの

- 5 チャネル全体動線（X / YT / IG / note / Web）→ [03_SNS/02_チャネル動線設計.md](../marketing/02_チャネル動線設計.md)
- iOS 画面単体の UI 仕様 → [02_iOS画面設計.md](./02_iOS画面設計.md)
- データ取得契約 → [03_iOSデータパイプライン.md](./03_iOSデータパイプライン.md)
- note 商品ラインナップ → [../note/技術士総監/noteコンテンツ計画.md](../../content/note/技術士総監/noteコンテンツ計画.md)
- Red Line 役割分担（iOS vs note vs サイト）→ [01_戦略/04_収益化戦略.md](../strategy/04_収益化戦略.md) §7

## 1. 3 層エコシステム構造

```
                ┌──────────────────────┐
                │   doboku-note.com    │
                │   (Web / SEO 入口)   │
                │  657 keyword pages   │
                │  280+ 過去問解説     │
                └──┬────────────────┬──┘
                   │                │
   App Store バナー │                │ 「演習は iOS で」CTA
   Universal Link │                │ + Premium 訴求
                   ↓                ↑
                ┌──────────────────────┐
                │     iOS アプリ        │
                │   (演習・参照ハブ)    │
                │  Free: R07 + 概要    │
                │  Premium: R01-R06    │
                │      + 詳細解説       │
                └──┬────────────────┬──┘
                   │                ↑
        クーポン   │                │ 「演習は iOS で」CTA
        + ニュート │                │ Universal Link
        ラルリンク ↓                │
                ┌──────────────────────┐
                │      note.com        │
                │   (有料商品・体験)    │
                │  E-1〜E-4 / P-01〜   │
                │  P-07 個別販売       │
                └──────────────────────┘
```

### 役割分担（再掲、戦略 §7 Red Line から派生）

| レイヤー | 主役割 | 主収益 | 訴求トーン |
|---|---|---|---|
| **doboku-note Web** | SEO 入口・体系参照・無料コンテンツ | アフィリエイト + iOS DL CV | リファレンス（中立的） |
| **iOS アプリ** | 演習・進捗・オフライン参照 | 買い切り ¥1,800 | 学習伴走（合格者ブランド） |
| **note** | 一次体験・読み物・有料商品 | 単品 ¥1,480〜¥2,980 / セット ¥1,980 | 個人体験（合格体験記） |

## 2. 動線パターン（4 方向別）

### 2.1 iOS → doboku-note Web（弱め、Free 層限定）

**目的**: Free ユーザーの逆流防止（離脱ではなく Premium CV 前の関連情報提供）+ SEO 流入の維持。

| 設置場所 | リンク内容 | 表示条件 | UX |
|---|---|---|---|
| キーワード概要画面下部 | 「doboku-note.com で関連情報を見る」（控えめ secondary ボタン） | Free ユーザー + キーワード詳細が Premium ロック中の時のみ | Safari 外部開き |
| 過去問解説画面下部 | 「サイトで原典 PDF を見る」 | 全ユーザー | Safari 外部開き |
| 設定タブ → 運営者 | 「doboku-note.com →」 | 全ユーザー | Safari 外部開き |

**表示しない場所**:
- Premium ユーザーのキーワード詳細画面（カニバリを生む）
- 演習中の問題画面（学習集中を阻害）
- 進捗ダッシュボード（離脱誘因が無い）

**UTM 規約**:
```
?utm_source=ios&utm_medium=app&utm_campaign=keyword-related&utm_content={slug}
```

### 2.2 iOS → note 有料記事（クーポン経由のみ）

**目的**: Premium 購入者にロイヤリティ報酬として note 商品割引を発行 → note 売上加算 + 顧客 LTV 拡大。

| トリガー | 挙動 |
|---|---|
| Premium 購入直後 | アプリ内通知 + クーポンコード表示（コピー可能、有効期限 30 日） |
| Premium 購入後の任意タイミング | 設定タブ「クーポン管理」で再表示・再コピー |
| クーポン利用 | note.com の任意の有料記事ページでコード入力（note 標準クーポン機能） |

**クーポンコード仕様**:
- フォーマット: `IOS{8桁ランダム}` 例: `IOSA3F9K2L7`
- 割引率: 30% OFF（戦略 §7 既定）
- 有効期限: 発行から 30 日（駆け込み購入を促す）
- 対象商品: 全 note 有料記事・マガジン（個別記事の除外設定は note 側で運用）
- 発行ロジック: アプリ内で Premium `Transaction.id` を seed にハッシュ生成（サーバー不要、note 側で利用時に重複検出のみ）

**Apple ガイドライン回避**:
- ❌ NG: 「note でこの記事を買う」直接ボタン → 3.1.1 IAP bypass 違反リスク
- ✅ OK: 「note.com のクーポン使い方を見る」中立的リンク + クーポンコード in-app 表示

**UTM 規約**:
```
?utm_source=ios&utm_medium=coupon&utm_campaign=premium-reward&utm_content={coupon_code}
```

### 2.3 doboku-note Web → iOS（強い CV ファネル）

**目的**: Web SEO 流入を最大効率で iOS DL に転化。Apple ガイドライン無関係（Web 上の表示）。

| 設置場所 | CTA 文言 | 遷移先 |
|---|---|---|
| 過去問ページ上部 | 「📱 過去問演習はアプリで」（バナー） | App Store + Universal Link |
| キーワードページ末尾 | 「キーワード暗記アプリで効率化」（カード） | App Store + Universal Link |
| ホーム / カテゴリページ | サイド or フッターに App Store バッジ | App Store |
| 検索結果ページ | 「アプリで検索する」サブ CTA | App Store + Universal Link |

**Universal Link 規約** (Web → iOS、アプリ未インストール時は App Store):
```
https://doboku-note.com/app/keyword/{slug}      → iOS でキーワード詳細 open
https://doboku-note.com/app/question/{id}       → iOS で問題画面 open
https://doboku-note.com/app/practice            → iOS で演習ホーム open
```

**UTM 規約** (App Store 計測):
```
?pt={apple_id}&ct=web-to-app&mt=8 (Apple Search Ads 形式)
```

### 2.4 note → iOS（戦略 Red Line 既定）

**目的**: 有料記事購入後の購買余力を iOS Premium に転化、または無料記事閲覧者を iOS Free DL に誘導。

| 設置場所 | CTA 文言 | 遷移先 |
|---|---|---|
| 全 note 記事末尾（固定 CTA） | 「演習は iOS アプリで完結」 | App Store |
| 有料記事冒頭（無料部分） | 「キーワード解説は iOS アプリで無料」 | App Store + Universal Link |
| プロフィール bio link | App Store バッジ | App Store |
| マガジン詳細ページ | 「マガジン購読者は iOS Premium 30% OFF」（Phase 2+ 検討） | クーポン経由 |

**注意**: note 側の埋め込み URL は標準 markdown リンクとなり Universal Link は機能するが、note アプリ内ブラウザで開く挙動になる場合あり。`target="_blank"` 推奨。

## 3. Apple App Store Review Guidelines 準拠

### 3.1 該当ガイドライン（2026 年時点）

| 項目 | 内容 | iOS アプリでの該当性 |
|---|---|---|
| **3.1.1 In-App Purchase** | 「アプリ内で消費する digital goods は IAP 必須」 | Premium 解放は StoreKit IAP で実装、外部購入誘導禁止 |
| **3.1.3 "Reader" Apps** | 既存購読者向けに限定的に外部リンク許可 | 教育アプリは Reader 該当しない、適用外 |
| **3.1.3(b) Multiplatform Services** | 他プラットフォームで使えるサービスへの言及は可能、購入誘導は不可 | doboku-note への中立的リンクは OK |
| **3.1.5(a) External Link Account** | 一部カテゴリで外部購入リンク許可（entitlement 申請要） | 申請しない方針（複雑度回避） |
| **4.7 HTML5 Games / Mini Apps** | 外部 HTML コンテンツ表示の制限 | 該当しない（ネイティブ実装） |
| **5.1.1 Data Collection** | 個人情報収集には明示同意要 | アプリ内データ収集無し、ATT 不要 |

### 3.2 OK / NG パターン集

#### OK パターン

| パターン | 文言例 |
|---|---|
| 中立的な情報リンク | 「doboku-note.com で詳細を見る」 |
| プロフィール紹介 | 「運営者は技術士総合技術監理部門合格者です。プロフィール →」 |
| 関連リソースの案内 | 「note で合格体験記を公開しています」 |
| クーポンコードの in-app 表示 | 「あなたのクーポン: IOSA3F9K2L7」 |
| Universal Link で同一アプリ起動 | doboku-note.com/app/keyword/* タップ → iOS が起動 |
| Web 側で iOS DL を訴求 | サイト上の「アプリで演習」バナー |

#### NG パターン

| パターン | 理由 |
|---|---|
| 「note でこの記事を買う」直接ボタン | 3.1.1 IAP bypass 違反、サードパーティ決済への誘導 |
| 「iOS で買うより note の方が安い」訴求 | Apple への明確な反逆姿勢でリジェクト |
| アプリ内 WebView で note の購入ページを表示 | 3.1.1 + 3.1.3(b) の両方に抵触 |
| Premium 機能を「外部 Web で解放できる」と案内 | 3.1.1 違反 |
| 強引な外部リンク CTA（赤色・点滅・全画面モーダル） | 3.1.3(b) gray area、Apple の裁量でリジェクト可能 |

### 3.3 グレーゾーン判断

| パターン | 推奨判断 | 理由 |
|---|---|---|
| クーポンコード in-app 表示 | ✅ OK | Apple 自身のガイドラインで明示禁止無し、Spotify 訴訟以降は寛容化傾向 |
| 「note でクーポンを使う」リンク | ⚠️ 中立文言なら OK | 「Get 30% off」等の積極訴求は避け、「クーポンの使い方」案内に留める |
| 設定タブのリンクリスト | ✅ OK | 一覧的・控えめ表示は問題なし |
| キーワード詳細下の「もっと見る」 | ⚠️ Free 限定なら OK | Premium 内に置くと「外部で同じものが見られる」誤解を生む |

### 3.4 申請時のチェックリスト

- [ ] StoreKit 2 で全 Premium 課金実装、外部決済導線無し
- [ ] App Store Connect の Subscription Term をプロダクト説明に明記
- [ ] Privacy Policy / Terms of Use の URL を Info.plist に登録
- [ ] 「Restore Purchases」ボタンを購入画面に必ず配置
- [ ] 外部リンクは全て Safari 開き、WebView 不使用
- [ ] note へのリンクは「読み物紹介」のみ、購入誘導なし
- [ ] Reviewer Notes に「Educational reference app, no external purchase flow」明記

## 4. クーポンコード仕様

### 4.1 発行フロー

```
[ユーザーが Premium 購入]
  ↓
[StoreKit Transaction 完了]
  ↓
[アプリ内で coupon_code 生成]
  - seed: Transaction.id + 共通 salt
  - hash: SHA256 → base32 8 桁
  - prefix: "IOS"
  ↓
[SwiftData の UserProgress に保存]
  - coupon_code: "IOSA3F9K2L7"
  - issued_at: 2026-05-19T10:30:00Z
  - expires_at: 2026-06-18T10:30:00Z (30日後)
  - used_at: null
  ↓
[アプリ内通知ポップアップで表示]
  「Premium 購入ありがとうございます。
   note 30% OFF クーポン: IOSA3F9K2L7
   [コピー] [note.com を開く]」
  ↓
[ユーザーがコピー or note.com 訪問]
  ↓
[note.com で購入時にコードを手入力]
```

### 4.2 note 側での利用フロー

note の標準クーポン機能（管理画面 → クーポン）で事前に以下を設定：
- クーポンコードパターン: `IOS********`（8 桁可変）の正規表現マッチ
- 割引率: 30%
- 対象商品: 全商品（除外したいものは個別 OFF）
- 利用回数: 1 ユーザーあたり 1 回まで
- 有効期限: 個別に運用判断

### 4.3 重複検出

- アプリ側: SwiftData の `coupon_code` UNIQUE 制約で 1 ユーザー 1 コード
- note 側: 利用時に「このコードは利用済み」エラー（note 標準機能）
- Jailbreak 端末対策: コード再生成が可能だがハッシュ衝突確率低（base32 8 桁 = 1.1 兆通り）。受容リスク

### 4.4 失効時の挙動

- 30 日経過後: 設定タブ「クーポン管理」で「期限切れ」表示、再発行は不可（戦略上 1 回限り）
- 失効時の救済: ユーザー問い合わせ経由でカスタマーサポート対応（運用負荷低）

## 5. Universal Link 設定

### 5.1 apple-app-site-association

doboku-note.com の `.well-known/apple-app-site-association` に配置：

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.uruhayato373.doboku-pe",
        "paths": [
          "/app/keyword/*",
          "/app/question/*",
          "/app/practice",
          "/app/premium"
        ]
      }
    ]
  }
}
```

注: `appID` は Phase 1 でアプリ名・bundle ID 確定後に更新。

### 5.2 URL パターン → 画面マッピング

| URL | iOS 画面 | フォールバック（未インストール時） |
|---|---|---|
| `/app/keyword/{slug}` | キーワード詳細画面 | doboku-note.com/docs/{category}-{slug} |
| `/app/question/{year}-{session}-{number}` | 問題演習画面（該当問題） | doboku-note.com/docs/{exam-page}#{anchor} |
| `/app/practice` | 演習ホーム | App Store + Marketing ページ |
| `/app/premium` | Premium 購入画面 | App Store |

### 5.3 サイト側実装

Next.js で `/app/*` ルートを定義：
```js
// pages/app/[...slug].tsx
// Universal Link が機能しなかった場合（PC・未インストール）のフォールバック表示
// + App Store バッジ + 該当 doboku-note ページへのリダイレクト
```

### 5.4 検証

- iOS Safari で `/app/keyword/agile` タップ → アプリ起動・該当画面表示
- PC / アプリ未インストール iOS → フォールバックページ → App Store
- TestFlight 段階でフォールバック挙動を必ず確認

## 6. UTM パラメータ統一（既存 02_チャネル動線設計.md の延長）

### 6.1 iOS 固有の追加 source

既存 [02_チャネル動線設計.md §4](../marketing/02_チャネル動線設計.md) のフォーマット表に以下を追加：

| 出発点 | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| **iOS 設定タブ → サイト** | `ios` | `app` | `settings-link` | `profile` |
| **iOS キーワード概要 → サイト** | `ios` | `app` | `keyword-related` | `{slug}` |
| **iOS 過去問解説 → サイト原典 PDF** | `ios` | `app` | `pdf-source` | `{question_id}` |
| **iOS Premium → note クーポン** | `ios` | `coupon` | `premium-reward` | `{coupon_code}` |
| **サイト → App Store** | `site` | `app-cta` | バナー位置 | `app-banner` |
| **note → App Store** | `note` | `app-cta` | 記事 ID | `app-cta` |

### 6.2 実装ファイル更新

- `.claude/config/utm-templates.json`（[02_チャネル動線設計.md](../marketing/02_チャネル動線設計.md) §4 で計画中）に iOS 行を追加
- iOS アプリ内のリンク生成は Swift 側のヘルパー実装：

```swift
enum UTMSource: String {
    case ios = "ios"
}

func appendUTM(to url: URL, medium: String, campaign: String, content: String? = nil) -> URL {
    var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
    var queryItems = components.queryItems ?? []
    queryItems.append(.init(name: "utm_source", value: UTMSource.ios.rawValue))
    queryItems.append(.init(name: "utm_medium", value: medium))
    queryItems.append(.init(name: "utm_campaign", value: campaign))
    if let content { queryItems.append(.init(name: "utm_content", value: content)) }
    components.queryItems = queryItems
    return components.url!
}
```

## 7. 画面別の動線設置マップ（02 と紐付け）

[02_iOS画面設計.md](./02_iOS画面設計.md) の各画面に対する外部リンク有無を一覧化：

| 画面 (02 内番号) | 設置リンク | 表示条件 | リンク先 |
|---|---|---|---|
| 1. Splash / Onboarding | なし | — | — |
| 2. 演習タブホーム | なし | — | — |
| 3. 年度別演習 | なし | — | — |
| 4. 問題演習画面 | なし | — | 学習集中阻害回避 |
| 5. 解説画面 | 「サイトで原典 PDF を見る」（フッター） | 全ユーザー | doboku-note.com 過去問ページ |
| 6. 結果サマリー | なし | — | — |
| 7. キーワード詳細 (Free) | 「doboku-note.com で関連情報」（下部 secondary） | Free のみ | doboku-note.com/docs/{slug} |
| 7. キーワード詳細 (Premium) | なし | — | カニバリ回避 |
| 8. 進捗ダッシュ | なし | — | 離脱誘因無し |
| 9. 設定タブ | 「doboku-note.com →」「クーポン管理」「note プロフィール →」 | 全ユーザー（クーポンは Premium のみ） | 各 URL |
| 9. Premium 購入画面 | 「利用規約」「プライバシーポリシー」 | 全ユーザー | doboku-note.com/privacy 等 |
| 購入完了通知 | クーポンコード + 「note を開く」 | Premium 購入直後 | note.com（無条件） |

## 8. リスクとレッドライン

| リスク | 深刻度 | 対策 |
|---|---|---|
| Apple リジェクト (3.1.1 違反) | **致命** | 全外部リンクを「中立的情報」「クーポンコード表示」に限定、購入誘導 NG 文言の排除 |
| クーポン乱用（複数 Apple ID で再生成）| 中 | 1 Transaction = 1 コード、note 側で 1 ユーザー 1 回利用制限 |
| Web → iOS の Universal Link 不発 | 中 | フォールバックページで App Store バッジを必ず表示、PC アクセスは即座にサイト本体へ |
| カニバリで note 売上低下 | 中 | クーポンで note 取引価格は下がるが流量増で売上維持を目指す（30% OFF でも note 手数料 10% < Apple IAP 30% で net 改善） |
| iOS 限定情報による Web SEO 弱体化 | 高 | Web 側の無料コンテンツは絶対に削らない（SEO 流入が枯れると iOS DL 枯渇に直結） |
| クーポンコード in-app 表示が Apple 規制強化対象に | 低 | 規制動向ウォッチ、Apple Section 3.1.x 更新時に再評価 |

### レッドライン（絶対に超えない線）

1. **iOS から外部決済への能動的誘導をしない**（3.1.1 完全遵守）
2. **Web の無料コンテンツを iOS Premium のために削らない**（SEO 入口の死守）
3. **Premium 画面から外部リンクを置かない**（カニバリと審査リスクの両回避）
4. **クーポンは Premium 購入特典に限定**（無償配布で価値毀損しない）

## 9. Phase 別実装ロードマップ

### Phase 0（仕様/設計、現在）

1. ✅ 本ドキュメント v1 確定（2026-05-19）
2. ⏸️ Universal Link URL パターンの SEO 影響評価（実装直前）
3. ⏸️ クーポンコードの note 側設定可能性確認（Phase 1 直前）

### Phase 1〜2（実装着手後）

1. Swift 側 UTM ヘルパー実装（§6.2）
2. クーポン生成・SwiftData 永続化（§4.1）
3. `apple-app-site-association` ファイル配置（§5.1）
4. Next.js `/app/[...slug]` フォールバックページ実装（§5.3）
5. note 側クーポンコードパターン設定（§4.2）

### Phase 3+ 拡張候補

- マガジン購読者向け iOS Premium 割引（§2.4）
- iOS 内で運営者の合格体験を簡易版表示 + 詳細は note 誘導
- ユーザー学習進捗の Web ダッシュボード（iCloud 同期実装後）

## 10. 関連ドキュメント

- [01_iOSアプリ仕様.md](./01_iOSアプリ仕様.md) — 仕様書本体
- [02_iOS画面設計.md](./02_iOS画面設計.md) — 画面 UI（送客リンクの設置場所）
- [03_iOSデータパイプライン.md](./03_iOSデータパイプライン.md) — データ取得契約
- [../03_SNS/02_チャネル動線設計.md](../marketing/02_チャネル動線設計.md) — 5 チャネル全体動線・UTM 統一フォーマット
- [../01_戦略/04_収益化戦略.md](../strategy/04_収益化戦略.md) §7 — Red Line 役割分担（iOS / note / Web）
- [../note/技術士総監/noteコンテンツ計画.md](../../content/note/技術士総監/noteコンテンツ計画.md) — note 商品ラインナップ

## 11. 次のアクション

1. ✅ 本書 v1 確定
2. 🔄 [02_iOS画面設計.md](./02_iOS画面設計.md) §7 画面別の動線設置マップを反映（既に 02 内に部分的に記載あり、更新で整合確認）
3. ⏸️ [02_チャネル動線設計.md](../marketing/02_チャネル動線設計.md) の UTM 統一表に iOS 行を追加（実装フェーズ近接時に同期）
