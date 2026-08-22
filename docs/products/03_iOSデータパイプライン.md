# iOS データパイプライン契約 — doboku-note → iOS

> **v1 (2026-05-19)** — 仕様書 v2 ([01_iOSアプリ仕様.md](./01_iOSアプリ仕様.md)) Phase 0-4 として作成。doboku-note 側 `build-ios-data.mjs` と iOS 側 `SyncService` の JSON 契約・version 規約・delta fetch・SwiftData upsert 戦略の真実源。

## アーキテクチャ概要

```
[doboku-note リポジトリ]
  content/site/pe-comprehensive-management/
    657 キーワード (article.mdx + frontmatter)
    34 過去問 (h21-r07 × primary/secondary)
  src/config/
    pillar-exam-questions.json (問題↔キーワード mapping)
        │
        │ npm run build:ios-data (prebuild)
        ▼
  out/api/v1/
    manifest.json
    questions.json
    keywords-summary.json
    keywords/{slug}.json × 657
        │
        │ main push → GitHub Actions
        ▼
[Cloudflare Pages] doboku-note.com/api/v1/*
        │
        │ CDN キャッシュ (Cache-Control: 1h)
        ▼
[iOS アプリ] SyncService
    URLSession + async/await
    → SwiftData (Question/Keyword/UserProgress entity)
```

## 設計原則

| 原則 | 内容 |
|---|---|
| **公開 CDN** | API key 不要。全データ public 配信（過去問は既に web 公開済み） |
| **オフライン優先** | 初回 download 後は全機能オフライン動作。同期は背景で実行 |
| **差分検出** | manifest の SHA256 で個別ファイルの変更検出、不要 download を回避 |
| **後方互換性** | manifest schema は major version 1 を維持、minor は追加のみ |
| **冪等性** | 同じ manifest version を複数回処理しても結果不変 |
| **エラーフォールバック** | 同期失敗時もローカル DB で全機能動作（次回起動でリトライ） |

---

## 1. JSON Schema 契約

### 1.1 `manifest.json`

```json
{
  "schema_version": "1.0",
  "generated_at": "2026-05-19T01:06:36.042Z",
  "source": {
    "doboku_note_commit": "594857a54",
    "branch": "main"
  },
  "datasets": {
    "questions": {
      "url": "/api/v1/questions.json",
      "sha256": "a1b2c3d4...",
      "count": 280,
      "size_bytes": 512000
    },
    "keywords_summary": {
      "url": "/api/v1/keywords-summary.json",
      "sha256": "e5f6g7h8...",
      "count": 657,
      "size_bytes": 256000
    },
    "keywords_detail_base": {
      "url_pattern": "/api/v1/keywords/{slug}.json",
      "manifest_url": "/api/v1/keywords-manifest.json",
      "count": 657
    }
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `schema_version` | string | ✓ | major.minor。major bump 時はアプリ更新必須 |
| `generated_at` | ISO8601 | ✓ | ビルド時刻 |
| `source.doboku_note_commit` | string | ✓ | デバッグ用、UIには出さない |
| `datasets.*.sha256` | string | ✓ | iOS 側で差分検出に使用 |
| `datasets.*.count` | number | ✓ | 整合性検証用 |

### 1.2 `questions.json`

```json
{
  "schema_version": "1.0",
  "questions": [
    {
      "id": "r07-primary-001",
      "year": "r07",
      "year_label": "令和7年度",
      "session": "primary",
      "number": 1,
      "heading": "Ⅰ-1-1",
      "category": "economic",
      "category_label": "経済性管理",
      "subcategory": "2.1",
      "subcategory_label": "事業企画",
      "statement_md": "事業継続に関する危機的事象の教訓...",
      "choices_md": [
        "BCPは、自然災害、突発的な経営環境の変化など...",
        "企業におけるBCMは、自社の人的・物的被害の軽減が...",
        "事業中断による影響度の評価では、自社の各事業が...",
        "重要業務について、どれくらいの時間で復旧できるか...",
        "事業継続戦略・対策として、業務拠点に関しては..."
      ],
      "correct_answer": 1,
      "explanation_md": "1. 自然災害や経営環境の変化への...",
      "exam_point": {
        "summary": "BCM はサプライチェーン全体の視点が重要",
        "items": [
          "自社の人的・物的被害軽減だけが目的ではない",
          "委託先・調達先・供給先の事業継続も自社事業継続に直結",
          "頻出テーマ：「サプライチェーン全体の視点」を問う設問"
        ]
      },
      "related_keyword_slugs": [
        "business-continuity-plan",
        "risk-management-plan",
        "supply-chain-management"
      ],
      "difficulty": "medium",
      "tier": "free",
      "source_pdf": "https://www.engineer.or.jp/c_topics/011/attached/attach_11181_1.pdf"
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | string | ✓ | `{year}-{session}-{number:03d}` |
| `year` | enum | ✓ | `h21`〜`r07` |
| `session` | enum | ✓ | `primary` / `secondary`（MVP は `primary` のみ） |
| `number` | int | ✓ | 1〜40 |
| `heading` | string | ✓ | `Ⅰ-1-1` 等の試験表記 |
| `category` | enum | ✓ | `economic` / `human_resource` / `information` / `safety` / `social_environment` |
| `correct_answer` | int | ✓ | 0-4 (0-indexed) |
| `tier` | enum | ✓ | `free` (R07) / `premium` (R01-R06) |
| `difficulty` | enum | — | `easy` / `medium` / `hard`（MVP は全て `medium` で出力） |

### 1.3 `keywords-summary.json`

```json
{
  "schema_version": "1.0",
  "keywords": [
    {
      "slug": "agile",
      "name": "アジャイル",
      "category": "information",
      "subcategory": "4.4",
      "summary": "アジャイル開発は、短い開発サイクル (イテレーション) を繰り返しながら動作するソフトウェアを段階的に開発する反復型・漸進型の開発手法の総称。",
      "appeared_in_question_count": 3,
      "tier": "free",
      "detail_sha256": "abc123..."
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `slug` | string | ✓ | URL-safe ID, ディレクトリ名と一致 |
| `summary` | string | ✓ | 100〜120 文字、Free 表示用 |
| `appeared_in_question_count` | int | — | 過去問出題回数 (UI バッジ用) |
| `tier` | enum | ✓ | `free`: 概要のみ全員表示 / `premium`: 詳細解説が Premium |
| `detail_sha256` | string | ✓ | `keywords/{slug}.json` の SHA256（差分 fetch 用） |

### 1.4 `keywords/{slug}.json`

```json
{
  "schema_version": "1.0",
  "slug": "agile",
  "name": "アジャイル",
  "category": "information",
  "subcategory": "4.4",
  "summary": "アジャイル開発は、短い...",
  "detail_md": "## アジャイル開発とは\n\nアジャイル（Agile）開発とは、短い開発サイクル...",
  "related_keyword_slugs": ["scrum", "kanban", "xp", "waterfall"],
  "appeared_in_questions": [
    {"id": "r06-primary-023", "heading": "Ⅲ-2-3", "tier": "premium"},
    {"id": "r04-primary-017", "heading": "Ⅲ-1-7", "tier": "premium"}
  ],
  "tier": "premium",
  "last_modified": "2026-05-09"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `detail_md` | string | ✓ | 完全な詳細解説 markdown |
| `appeared_in_questions` | array | — | 過去問逆引き |
| `last_modified` | ISO date | ✓ | doboku-note 側 `dateModified` を継承 |

### 1.5 `keywords-manifest.json`

個別キーワードファイル 657 個の SHA256 一覧（delta fetch 用）。

```json
{
  "schema_version": "1.0",
  "keywords": {
    "agile": "abc123...",
    "business-continuity-plan": "def456...",
    ...
  }
}
```

---

## 2. Versioning 規約

### Schema Version

`schema_version` は `major.minor` の 2 階層。

| 変更種別 | 例 | iOS 側挙動 |
|---|---|---|
| **patch** (内部、表記しない) | 既存フィールドの値変更 | 透過的に取り込み |
| **minor bump** (1.0 → 1.1) | 新規 optional フィールド追加 | 旧フィールドのみ使用、警告ログ |
| **major bump** (1.x → 2.0) | フィールド削除・型変更・必須化 | アプリ更新ダイアログ表示、同期停止 |

### App Store 審査リスク

- データ schema major bump はアプリ実装の更新を伴うため、必ず App Store 審査経由
- minor 以下はサーバー側変更のみで完結（審査不要）

---

## 3. Delta Fetch プロトコル

### 起動時シーケンス

```
[App 起動]
  ↓
[UserDefaults.lastManifestVersion を読む]
  ↓
[GET /api/v1/manifest.json]
  ↓
[サーバー manifest.schema_version を確認]
  ├─ major mismatch → 「アプリ更新が必要」ダイアログ、同期中止
  └─ major match
     ↓
[各 dataset.sha256 を UserDefaults と比較]
  ├─ questions.sha256 が変更 → GET /questions.json → SwiftData upsert
  ├─ keywords-summary.sha256 が変更 → GET /keywords-summary.json → upsert
  └─ keywords-detail は別フロー (lazy)
     ↓
[UserDefaults に新 sha256 を保存]
  ↓
[同期完了通知 → UI 更新]
```

### キーワード詳細の Lazy Fetch

```
[ユーザーがキーワード詳細を開く]
  ↓
[SwiftData にローカルキャッシュ確認]
  ├─ ヒット + last_modified が manifest 内 detail_sha256 と一致 → 即表示
  └─ ミス or 古い
     ↓
  [GET /keywords/{slug}.json]
     ↓
  [SwiftData に upsert + last_modified 更新]
     ↓
  [UI 再描画]
```

### キャッシュサイズ管理

- キーワード詳細は LRU 100 件まで保持
- それ以上は古い順に削除、再アクセス時に再 fetch

### 同期頻度

| トリガー | 頻度 |
|---|---|
| アプリ起動 | 前回成功から 24h 以上経過時のみ |
| 設定画面の「今すぐ更新」 | 即時 |
| バックグラウンド | 実装しない (Apple BackgroundTasks 審査リスク回避) |

---

## 4. SwiftData Upsert 戦略

### Entity 定義（仕様書 §データモデル を継承）

```swift
@Model
final class Question {
    @Attribute(.unique) var id: String  // "r07-primary-001"
    var year: String
    var session: String
    var number: Int
    var category: String
    var statementMD: String
    var choicesMD: [String]
    var correctAnswer: Int
    var explanationMD: String
    var examPointSummary: String?
    var examPointItems: [String]
    var relatedKeywordSlugs: [String]
    var tier: String  // "free" | "premium"
    var difficulty: String
    var lastSyncedAt: Date
}

@Model
final class Keyword {
    @Attribute(.unique) var slug: String
    var name: String
    var category: String
    var subcategory: String
    var summary: String
    var detailMD: String?  // nil = まだ fetch していない
    var relatedKeywordSlugs: [String]
    var tier: String
    var detailSHA256: String?  // manifest との照合用
    var lastSyncedAt: Date
}
```

### Upsert ロジック

```swift
func upsertQuestions(_ data: QuestionsPayload) throws {
    let context = ModelContext(modelContainer)
    let existing = try context.fetch(FetchDescriptor<Question>())
    let existingByID = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

    for q in data.questions {
        if let entity = existingByID[q.id] {
            // 既存 → 上書き
            entity.statementMD = q.statementMD
            entity.choicesMD = q.choicesMD
            // ... 他フィールド
            entity.lastSyncedAt = .now
        } else {
            // 新規 → insert
            context.insert(Question(from: q))
        }
    }

    // 削除されたレコード (現在のサーバーに無い ID) は保持
    // → UserProgress との関連を壊さないため、削除は major version bump 時のみ

    try context.save()
}
```

### マイグレーション

- iOS 17 SwiftData の `Schema migration` を採用
- minor schema 追加 → デフォルト値で migrate
- major schema 変更 → 完全リセット + 再 download（ユーザー進捗は別途 export/import で保護）

---

## 5. doboku-note 側実装仕様

### スクリプト: `scripts/build-ios-data.mjs`

```js
// 入力
// - content/site/pe-comprehensive-management/{r01..r07}-primary/article.mdx
// - content/site/pe-comprehensive-management/*/article.mdx (キーワード)
// - src/config/pillar-exam-questions.json (問題↔キーワード mapping)
// - src/config/pe-chapters.json (5管理カテゴリ)

// 出力
// - out/api/v1/manifest.json
// - out/api/v1/questions.json
// - out/api/v1/keywords-summary.json
// - out/api/v1/keywords-manifest.json
// - out/api/v1/keywords/{slug}.json × 657

// 処理ステップ
// 1. PE 配下を glob → frontmatter parse
// 2. group=keyword を 657 件抽出 → summary/detail 分離
// 3. r{01-07}-primary article から 40 問抽出 (## Ⅰ-X-Y 単位で分割)
// 4. <details>...</details> ブロックから correct_answer + explanation + ExamPoint パース
// 5. <RelatedKeywords> から related_keyword_slugs 抽出
// 6. pillar-exam-questions.json で問題↔キーワード逆引き map 構築
// 7. SHA256 計算 → manifest 生成
// 8. JSON 整形して out/api/v1/ に書き出し
```

### package.json 追加

```json
{
  "scripts": {
    "build:ios-data": "node scripts/build-ios-data.mjs",
    "prebuild": "npm run build:ios-data && npm run refresh-indexes"
  }
}
```

### Cloudflare Pages 設定

- `out/` ディレクトリは Next.js export の出力ディレクトリ
- `out/api/v1/` も同時に配信される
- `_headers` ファイルで Cache-Control 設定:

```
/api/v1/manifest.json
  Cache-Control: public, max-age=300

/api/v1/questions.json
  Cache-Control: public, max-age=3600

/api/v1/keywords-summary.json
  Cache-Control: public, max-age=3600

/api/v1/keywords/*
  Cache-Control: public, max-age=86400
```

短い TTL → manifest を見れば差分検出できるので長 TTL のリソースも安全に取得可能。

---

## 6. パース実装の難所と対策

### 6.1 過去問 article.mdx からの問題抽出

**フォーマット例** (`r07-primary/article.mdx`):

```mdx
## Ⅰ-1-1

事業継続に関する...

1. BCPは、自然災害...
2. 企業におけるBCMは...
3. 事業中断による...
4. 重要業務について...
5. 事業継続戦略・対策として...

<details>
<summary>解答・解説</summary>

**正答：2**

1. 自然災害や経営環境の変化への対応計画として...
2. 委託先・調達先・供給先もBCMの検討範囲に...
...

<ExamPoint
  summary="BCM はサプライチェーン全体の視点が重要"
  items={[
    "自社の人的・物的被害軽減だけが目的ではない",
    ...
  ]}
/>

<RelatedKeywords items={[
  { label: "BCP・BCM", slug: "business-continuity-plan" },
  ...
]} />

</details>
```

**パース戦略**:
- `## Ⅰ-X-Y` を区切りに分割
- 問題文 = 区切りから最初の数字選択肢直前まで
- 選択肢 = `^[1-5]\. ` で始まる行から `<details>` 直前まで
- `**正答：N**` から `correct_answer = N - 1`
- `<ExamPoint />` JSX 属性を AST パース（remark-mdx で抽出）
- `<RelatedKeywords items={[...]} />` から slug 配列抽出

### 6.2 5 管理カテゴリの推定

`Ⅰ` = 経済性管理、`Ⅱ` = 人的資源管理、`Ⅲ` = 情報管理、`Ⅳ` = 安全管理、`Ⅴ` = 社会環境管理。`heading` の頭文字から決定。

### 6.3 キーワード summary の生成

frontmatter `description` フィールドを優先使用。無ければ本文先頭 100 文字を抽出（句点まで含める）。

### 6.4 文字化け対策

- `lib/mdx-io.mjs` の `writeMdxFile` 同等の UTF-8 LF 書き出しを徹底
- 出力 JSON は `JSON.stringify(data, null, 2)` で整形
- U+FFFD チェックを build:ios-data の最後に実施

---

## 7. エラーハンドリング

### iOS 側

| エラー | 挙動 |
|---|---|
| ネットワーク失敗 | ローカル DB で全機能継続、次回起動時リトライ。設定画面に「最終同期: N 時間前」表示 |
| HTTP 5xx | 指数バックオフ (1s, 2s, 4s) 3 回、失敗時はローカル継続 |
| HTTP 404 (個別 keyword) | UI に「コンテンツが見つかりません」+ 報告ボタン |
| Schema mismatch (major) | アプリ更新ダイアログ + App Store リンク |
| JSON parse error | 該当ファイルのみスキップ + Sentry/自前ログ送信 (Phase 2+) |
| SHA256 mismatch | 再 download 1 回 → 失敗ならスキップ |

### doboku-note 側

| エラー | 挙動 |
|---|---|
| `pillar-exam-questions.json` 欠損 | build:ios-data は exit 1、CI 失敗 |
| 問題パース失敗 (40 問揃わない年度) | 警告ログ + 該当年度を出力に含めない（部分配信） |
| キーワード summary 欠損 | description が無い slug を fallback 100 文字で補完、警告ログ |
| SHA256 計算失敗 | exit 1 (build 中止) |

---

## 8. 検証マトリクス

| 検証項目 | 方法 | 期待値 |
|---|---|---|
| build:ios-data の出力件数 | `jq '.questions \| length' out/api/v1/questions.json` | 280 |
| キーワード件数 | `jq '.keywords \| length' out/api/v1/keywords-summary.json` | 657 |
| keywords/ 個別ファイル数 | `ls out/api/v1/keywords/*.json \| wc -l` | 657 |
| manifest SHA256 整合 | `sha256sum questions.json` vs manifest 内 | 一致 |
| Free tier 問題数 | `jq '[.questions[] \| select(.tier == "free")] \| length'` | 40 (R07 のみ) |
| Premium tier 問題数 | `jq '[.questions[] \| select(.tier == "premium")] \| length'` | 240 (R01-R06) |
| iOS 初回起動 | TestFlight ビルドで Question.count | 280 |
| iOS delta fetch | サーバー側 manifest 変更 → 再起動 → 該当 dataset のみ download | バイト数で確認 |
| オフライン挙動 | 機内モードで全機能動作 | OK |

---

## 9. セキュリティ・プライバシー

- **API key 不要**: 全データ public 配信。過去問は既に web で公開済み、Premium 機能はクライアント側課金フラグでゲート
- **クライアント側ゲートのリスク**: jailbreak 端末で flag 改ざんは可能だが、ROI 低。サーバー側課金検証は Phase 2+ で StoreKit Server Notifications 導入時に検討
- **個人情報送信無し**: アプリは進捗データを端末ローカルのみ保持、サーバーに送信しない
- **App Tracking Transparency**: 計測 SDK 入れないため ATT ダイアログ不要

---

## 10. パフォーマンス目標

| 指標 | 目標 |
|---|---|
| 初回起動 download サイズ | ≤ 1.5 MB (questions + keywords-summary のみ) |
| 初回起動 → 利用可能 | ≤ 10 秒 (4G 環境) |
| 起動時 manifest fetch | ≤ 500 ms |
| キーワード詳細 fetch (cold) | ≤ 300 ms |
| キーワード詳細表示 (warm) | ≤ 50 ms (SwiftData) |
| 全文検索 (657 件) | ≤ 100 ms (NSPredicate) |

---

## 11. 関連ドキュメント

- [01_iOSアプリ仕様.md](./01_iOSアプリ仕様.md) — 仕様書本体（機能・データモデル）
- [02_iOS画面設計.md](./02_iOS画面設計.md) — 画面設計（このデータの表示先）
- [04_iOSエコシステム動線.md](./04_iOSエコシステム動線.md) — 3 層エコシステム動線（Universal Link / クーポン / Apple ガイドライン準拠）
- [../../reference/data-storage-decision.md](../../.claude/knowledge/reference/data-storage-decision.md) — D1 不採用判断（iOS は frontmatter + build-time JSON で完結する追加証拠）
- [../../reference/measurement-incidents.md](../../.claude/knowledge/reference/measurement-incidents.md) — 計測異常パターン（iOS 計測導入時に参照）

---

## 12. 次のアクション

### Phase 0-4（着手判断前）

1. ✅ **本ドキュメント v1 確定**（2026-05-19）
2. ⏸️ JSON schema を OpenAPI 3.x / JSON Schema Draft 7 形式に書き出し（実装直前で実施）
3. ⏸️ サンプル questions.json / keywords-summary.json を 5 件ずつ手書きしてフォーマット最終確認

### Phase 2（実装着手後）

1. `scripts/build-ios-data.mjs` 実装
2. `npm run build:ios-data` の CI 統合
3. `_headers` 設定
4. iOS 側 `SyncService` 実装（URLSession + SwiftData）
5. delta fetch 検証（manifest 変更 → 再 download 動作確認）
