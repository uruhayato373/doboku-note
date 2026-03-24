# 有料検索・AI Chat 設計と実装方針

作成日: 2026-03-24
前提文書: `paid-search-ai-chat-strategy.md`

---

## 1. 現状のアーキテクチャ

```
┌──────────────────────────────────────────────────┐
│           現在の doboku-note                       │
│                                                    │
│  Next.js 16 (App Router)                          │
│  ├── output: 'export' ← 完全静的 HTML             │
│  ├── next-mdx-remote/rsc ← MDX → React (RSC)     │
│  ├── 検索: search-index.json ← client-side フィルタ│
│  ├── 認証: なし                                    │
│  ├── API: なし                                     │
│  └── DB: D1 定義済みだが未接続                     │
│                                                    │
│  Cloudflare Pages (静的ホスティング)               │
│  ├── Workers: 未使用                               │
│  ├── D1: 設定済み（テーブル未作成）                │
│  └── Vectorize: 未使用                             │
└──────────────────────────────────────────────────┘
```

**制約**: `output: 'export'` では API Routes・ミドルウェア・サーバーサイドレンダリングが全て使えない。有料機能には **API レイヤーの追加** が必須。

---

## 2. 目標アーキテクチャ

```
┌────────────────────────────────────────────────────────┐
│                      Frontend                           │
│  Next.js 16 (Static Export — 変更なし)                 │
│  ├── MDX ページ（全て静的 HTML、無料公開）             │
│  ├── SearchBar（Free: 既存 client-side）               │
│  ├── ProSearchBar（Pro: Meilisearch API 呼び出し）     │
│  └── AIChatWidget（チャット UI）                       │
│       ↓ fetch()                                        │
├────────────────────────────────────────────────────────┤
│                  Cloudflare Workers                      │
│  /api/chat       ← AI Chat エンドポイント              │
│  /api/search     ← Pro 検索エンドポイント              │
│  /api/auth       ← 認証 webhook                        │
│  /api/stripe     ← Stripe webhook                      │
│       ↓                        ↓                       │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐            │
│  │Vectorize │  │Workers AI │  │    D1    │            │
│  │(ベクトル) │  │(Embedding)│  │(ユーザー │            │
│  └──────────┘  └───────────┘  │ 利用量)  │            │
│       ↓                       └──────────┘            │
│  ┌──────────────────┐                                  │
│  │ LLM API (外部)   │                                  │
│  │ GPT-4o mini 主力 │                                  │
│  │ Haiku 補助       │                                  │
│  └──────────────────┘                                  │
├────────────────────────────────────────────────────────┤
│              外部サービス                               │
│  ┌────────┐  ┌───────────────┐  ┌─────────┐          │
│  │ Clerk  │  │ Meilisearch   │  │ Stripe  │          │
│  │ (認証) │  │ Cloud (検索)  │  │ (決済)  │          │
│  └────────┘  └───────────────┘  └─────────┘          │
└────────────────────────────────────────────────────────┘
```

### 2.1 設計方針

| 方針 | 理由 |
|---|---|
| **静的サイトは変更しない** | SEO・表示速度・既存パイプラインを維持。有料機能は API レイヤーで分離 |
| **Cloudflare Workers で API を追加** | Pages Functions (`/functions/`) で同一ドメイン配信。CORS 不要 |
| **フロントエンドは薄く** | チャット UI・検索 UI はクライアントコンポーネントとして追加。SSR 不要 |
| **認証は Clerk の CDN SDK** | 静的サイトでも動作。`<ClerkProvider>` + `useUser()` で判定 |
| **段階的に機能追加** | Phase ごとに独立してデプロイ可能な設計 |

---

## 3. 静的サイト + API の統合方式

### 3.1 Cloudflare Pages Functions

Next.js の `output: 'export'` を維持したまま、Cloudflare Pages Functions で API を追加する。

```
doboku-note/
├── out/                  ← Next.js 静的ビルド出力
├── functions/            ← Cloudflare Pages Functions（NEW）
│   ├── api/
│   │   ├── chat.ts       ← POST /api/chat
│   │   ├── search.ts     ← GET  /api/search?q=...
│   │   ├── usage.ts      ← GET  /api/usage
│   │   └── webhooks/
│   │       └── stripe.ts ← POST /api/webhooks/stripe
│   └── _middleware.ts    ← 認証チェック（Clerk JWT 検証）
├── content/              ← MDX コンテンツ（既存）
├── src/                  ← Next.js ソース（既存）
└── scripts/
    ├── build-vector-index.mjs  ← Vectorize インデックス構築（NEW）
    └── sync-meilisearch.mjs    ← Meilisearch インデックス同期（NEW）
```

**動作フロー**:
1. `npm run build` → `out/` に静的 HTML を生成（従来通り）
2. `wrangler pages deploy out` → 静的ファイル + `functions/` を一緒にデプロイ
3. `/docs/...` → 静的 HTML を返す
4. `/api/...` → Cloudflare Pages Functions が処理

### 3.2 wrangler.toml の変更

```toml
# 現在
name = "doboku-note"
compatibility_date = "2024-01-01"

# 追加
[vars]
CLERK_PUBLISHABLE_KEY = ""
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "doboku-note-db"
database_id = "実際のID"

[[vectorize]]
binding = "VECTORIZE"
index_name = "doboku-content"

[ai]
binding = "AI"
```

**Secrets**（`wrangler secret put` で設定）:
- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`（GPT-4o mini 用）
- `ANTHROPIC_API_KEY`（Haiku 用）

---

## 4. 各機能の設計

### 4.1 AI Chat

#### API エンドポイント: `POST /api/chat`

```typescript
// functions/api/chat.ts
interface ChatRequest {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

interface ChatResponse {
  answer: string;
  sources: {
    title: string;
    path: string;     // MDX ファイルパス → ページ URL
    heading: string;   // 該当見出し
    snippet: string;   // 該当チャンクの抜粋
    score: number;     // ベクトル類似度
  }[];
}
```

#### 処理フロー

```
1. リクエスト受信
   ├── Clerk JWT 検証（_middleware.ts）
   ├── ユーザー特定 → D1 で利用回数チェック
   │   ├── Free: 月 5 回超 → 402 Payment Required
   │   ├── Pro: 月 50 回超 → 402
   │   └── Team: 無制限
   └── rate limit（IP + userId で 10 req/min）

2. クエリ処理
   ├── ユーザー質問を Embedding 化
   │   └── env.AI.run('@cf/baai/bge-m3', { text: [query] })
   ├── Vectorize で類似チャンク検索（top-k=5）
   │   └── env.VECTORIZE.query(queryVector, { topK: 5 })
   └── チャンクのメタデータから出典情報を取得

3. LLM 呼び出し
   ├── システムプロンプト + チャンク + 質問 を構築
   ├── GPT-4o mini で回答生成（デフォルト）
   │   └── 複雑質問判定 → Haiku にルーティング（将来）
   └── ストリーミングレスポンス（ReadableStream）

4. レスポンス返却 + 利用記録
   ├── D1 に利用回数をインクリメント
   └── answer + sources を返す
```

#### システムプロンプト（案）

```
あなたは土木技術の専門家です。以下の技術資料の内容のみに基づいて回答してください。

## ルール
- 提供された資料に記載されている情報のみを使用すること
- 資料にない情報は「該当する記載は見つかりませんでした」と回答すること
- 回答の末尾に必ず出典（資料名、該当箇所）を記載すること
- 数値や基準値は資料の記載を正確に引用すること
- 推測や一般論で補完しないこと

## 資料
{chunks}

## 質問
{question}
```

#### UI コンポーネント: `AIChatWidget`

```
src/components/chat/
├── AIChatWidget.tsx       ← フローティングボタン + チャットパネル
├── ChatPanel.tsx          ← メッセージ一覧 + 入力欄
├── ChatMessage.tsx        ← 個別メッセージ（Markdown レンダリング）
├── SourceList.tsx         ← 出典リンク一覧
└── ChatUsageIndicator.tsx ← 残り質問回数表示
```

**UI の動作**:
1. 右下にフローティングボタン（💬）
2. クリックでチャットパネルが展開（モバイル: フルスクリーン）
3. 未ログイン → 「ログインして AI Chat を使う」CTA 表示
4. Free 会員 → 残り回数表示 + 上限到達で Pro への誘導
5. 回答はストリーミングで表示（SSE）
6. 出典はクリックでページ内の該当箇所にジャンプ

### 4.2 Pro 検索（Meilisearch）

#### インデックス構造

```javascript
// Meilisearch ドキュメントスキーマ
{
  id: "general/common-specs/03-02-construction-02a#h2-盛土工",
  title: "土木工事共通仕様書 第3編 土工",
  heading: "第2節 盛土工",
  content: "盛土の締固め度は路体で90%以上、路床で95%以上...",
  category: "general",
  subcategory: "common-specs",
  documentType: "仕様書",
  path: "/docs/general/common-specs/03-02-construction-02a",
  anchor: "h2-盛土工",
  keywords: ["盛土", "締固め度", "路体", "路床"]
}
```

#### ファセット（フィルタ属性）

| ファセット | 値の例 |
|---|---|
| `category` | general, road, river, low, port, environment |
| `documentType` | 仕様書, 設計基準, 法令, マニュアル |
| `subcategory` | common-specs, design-manual, hydraulics |

#### API エンドポイント: `GET /api/search`

```typescript
// functions/api/search.ts
interface SearchRequest {
  q: string;              // 検索クエリ
  category?: string;      // カテゴリフィルタ
  documentType?: string;  // 文書種別フィルタ
  page?: number;          // ページネーション
  limit?: number;         // 件数（デフォルト 20）
}

interface SearchResponse {
  hits: {
    id: string;
    title: string;
    heading: string;
    content: string;       // ハイライト付き
    path: string;
    anchor: string;
    category: string;
  }[];
  totalHits: number;
  processingTimeMs: number;
  facetDistribution: Record<string, Record<string, number>>;
}
```

#### 検索 UI の分岐

```
SearchBar.tsx（既存）
├── 未ログイン / Free → 既存の client-side 検索
│   └── search-index.json をフィルタ（変更なし）
│
ProSearchBar.tsx（新規）
├── Pro / Team → Meilisearch API 呼び出し
│   ├── 全文検索（本文・表・数式含む）
│   ├── ファセットフィルタ（サイドパネル）
│   ├── ハイライト付き結果表示
│   └── 検索履歴の保存（D1）
│
└── 切替: useUser() の plan で判定
```

### 4.3 認証（Clerk）

#### 静的サイトへの統合

Clerk は CDN 経由の JavaScript SDK で静的サイトでも動作する。

```typescript
// src/app/layout.tsx に追加
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

**注意**: `output: 'export'` では `NEXT_PUBLIC_` 変数はビルド時に埋め込まれる。Clerk の Publishable Key は公開情報なので問題なし。

#### ユーザーメタデータ

```typescript
// Clerk のユーザーメタデータで plan を管理
interface UserPublicMetadata {
  plan: 'free' | 'pro' | 'team';
  stripeCustomerId?: string;
  chatUsage: {
    month: string;       // "2026-03"
    count: number;       // 今月の利用回数
  };
}
```

#### API 側の認証検証

```typescript
// functions/_middleware.ts
import { verifyToken } from '@clerk/backend';

export async function onRequest(context) {
  const { request, env, next } = context;

  // /api/ 以外はスルー（静的ファイル）
  if (!new URL(request.url).pathname.startsWith('/api/')) {
    return next();
  }

  // 公開 API（検索の Free 版等）はスルー
  const publicPaths = ['/api/webhooks/stripe'];
  if (publicPaths.some(p => request.url.includes(p))) {
    return next();
  }

  // JWT 検証
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    context.data.userId = payload.sub;
    context.data.metadata = payload.public_metadata;
    return next();
  } catch {
    return new Response('Invalid token', { status: 401 });
  }
}
```

### 4.4 決済（Stripe）

#### サブスクリプション設計

```
Stripe Products:
├── Pro Plan
│   ├── Price: ¥980/月（monthly）
│   └── Price: ¥9,800/年（yearly）
└── Team Plan
    └── Price: ¥2,980/ユーザー/月（monthly, per-seat）
```

#### Webhook フロー

```
Stripe → POST /api/webhooks/stripe
  │
  ├── checkout.session.completed
  │   └── Clerk メタデータ更新: plan = 'pro'
  │
  ├── customer.subscription.updated
  │   └── plan 変更を Clerk に反映
  │
  ├── customer.subscription.deleted
  │   └── Clerk メタデータ更新: plan = 'free'
  │
  └── invoice.payment_failed
      └── 通知（将来）
```

### 4.5 D1 データベース

#### テーブル設計

```sql
-- ユーザーの AI Chat 利用量
CREATE TABLE chat_usage (
  user_id TEXT NOT NULL,
  year_month TEXT NOT NULL,  -- "2026-03"
  count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, year_month)
);

-- チャット履歴（Pro/Team のみ保存）
CREATE TABLE chat_history (
  id TEXT PRIMARY KEY,        -- UUID
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT,               -- JSON
  created_at TEXT NOT NULL,   -- ISO 8601
  INDEX idx_user_date (user_id, created_at)
);

-- 検索履歴（Pro/Team のみ保存）
CREATE TABLE search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER,
  created_at TEXT NOT NULL,
  INDEX idx_user_date (user_id, created_at)
);

-- 既存定義の page_views, page_feedback は維持
```

---

## 5. RAG インデックス構築

### 5.1 チャンキング戦略

```
MDX ファイル
  │
  ├── frontmatter 解析 → メタデータ（title, category）
  │
  ├── h2 見出しで分割 → チャンク単位
  │   ├── チャンク内に h3 があれば、メタデータとして記録
  │   ├── 各チャンク: 200〜1000 tokens
  │   ├── 1000 tokens 超 → h3 でさらに分割
  │   └── 前後 100 tokens のオーバーラップ
  │
  ├── 表（table）→ 表単位で独立チャンク化
  │   └── 表のキャプション + 前後の文脈をメタデータに
  │
  └── 数式（KaTeX）→ テキスト化して含める
      └── $E = mc^2$ → "E = mc^2"
```

### 5.2 メタデータスキーマ

```typescript
interface ChunkMetadata {
  fileId: string;          // "general/common-specs/03-02-construction-02a"
  filePath: string;        // フルパス
  title: string;           // ページタイトル
  heading: string;         // h2 見出し
  subHeading?: string;     // h3 見出し（あれば）
  category: string;        // "general"
  subcategory: string;     // "common-specs"
  chunkIndex: number;      // ファイル内の順序
  tokenCount: number;      // トークン数
  contentType: 'text' | 'table' | 'formula';
}
```

### 5.3 インデックス構築スクリプト

```
scripts/build-vector-index.mjs

1. content/ 配下の全 MDX をスキャン
2. 各ファイルをチャンキング
3. Cloudflare Workers AI (bge-m3) で Embedding 生成
4. Cloudflare Vectorize にアップサート
5. 実行: npm run build:vectors
   ├── ローカル: wrangler vectorize で操作
   └── CI: GitHub Actions のビルドパイプラインに追加
```

**推定規模**:
- 501 ファイル × 平均 10 チャンク = 約 5,000 ベクトル
- 1024 次元 × 5,000 = 5,120,000 次元 → Vectorize 無料枠内

### 5.4 Meilisearch インデックス構築

```
scripts/sync-meilisearch.mjs

1. content/ 配下の全 MDX をスキャン
2. frontmatter + 見出し + 本文を抽出
3. 見出し単位でドキュメント化（チャンクより細かい粒度）
4. Meilisearch Cloud API でアップサート
5. ファセット設定（category, documentType）
6. 実行: npm run build:search
```

---

## 6. ファイル構成（新規追加分）

```
doboku-note/
├── functions/                          ← NEW: Cloudflare Pages Functions
│   ├── _middleware.ts                  ← 認証ミドルウェア
│   └── api/
│       ├── chat.ts                     ← AI Chat API
│       ├── search.ts                   ← Pro 検索 API
│       ├── usage.ts                    ← 利用量取得 API
│       └── webhooks/
│           └── stripe.ts              ← Stripe Webhook
│
├── src/
│   ├── components/
│   │   ├── chat/                       ← NEW: チャット UI
│   │   │   ├── AIChatWidget.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── SourceList.tsx
│   │   │   └── ChatUsageIndicator.tsx
│   │   ├── search/                     ← NEW: Pro 検索 UI
│   │   │   ├── ProSearchBar.tsx
│   │   │   ├── SearchFacets.tsx
│   │   │   └── SearchResultCard.tsx
│   │   ├── auth/                       ← NEW: 認証 UI
│   │   │   ├── LoginButton.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   └── PlanBadge.tsx
│   │   └── pricing/                    ← NEW: 料金ページ
│   │       ├── PricingTable.tsx
│   │       └── CheckoutButton.tsx
│   │
│   ├── lib/
│   │   ├── api-client.ts              ← NEW: /api/ 呼び出しヘルパー
│   │   ├── clerk.ts                   ← NEW: Clerk ユーティリティ
│   │   └── stripe.ts                  ← NEW: Stripe Checkout 生成
│   │
│   └── app/
│       └── pricing/
│           └── page.tsx               ← NEW: 料金ページ
│
├── scripts/
│   ├── build-vector-index.mjs         ← NEW: Vectorize インデックス構築
│   ├── sync-meilisearch.mjs           ← NEW: Meilisearch インデックス同期
│   └── migrate-d1.mjs                 ← NEW: D1 マイグレーション
│
└── migrations/                         ← NEW: D1 SQL マイグレーション
    ├── 0001_create_chat_usage.sql
    ├── 0002_create_chat_history.sql
    └── 0003_create_search_history.sql
```

---

## 7. 実装順序（Phase 別）

### Phase 0: 基盤準備（1〜2 日）

```
□ wrangler.toml に D1, Vectorize, AI バインディング追加
□ D1 データベース作成 + マイグレーション実行
□ Vectorize インデックス作成（doboku-content, 1024 次元）
□ functions/ ディレクトリ作成 + ヘルスチェック API
□ デプロイ確認（静的サイト + Functions が共存するか検証）
```

### Phase 1: AI Chat MVP（5〜7 日）

```
□ scripts/build-vector-index.mjs 実装
  ├── MDX パーサー（gray-matter + チャンキング）
  ├── Workers AI (bge-m3) で Embedding 生成
  └── Vectorize にアップサート

□ functions/api/chat.ts 実装
  ├── Vectorize 検索（top-k=5）
  ├── GPT-4o mini 呼び出し（ストリーミング）
  └── 出典付きレスポンス返却

□ src/components/chat/ 実装
  ├── AIChatWidget（フローティングボタン）
  ├── ChatPanel（メッセージ UI）
  └── SourceList（出典リンク）

□ 利用制限（IP ベース、未認証: 月 3 回）
  └── D1 の chat_usage テーブルで管理

□ テスト
  ├── 代表的な質問 20 問で回答品質を検証
  └── レイテンシ目標: 3 秒以内
```

### Phase 2: 認証 + 課金（5〜7 日）

```
□ Clerk セットアップ
  ├── Clerk アプリ作成（日本語 UI）
  ├── ClerkProvider を layout.tsx に追加
  ├── LoginButton, UserMenu コンポーネント
  └── Navbar に認証 UI 追加

□ functions/_middleware.ts 実装
  └── JWT 検証 + ユーザー情報の context 注入

□ Stripe セットアップ
  ├── Product + Price 作成（Pro ¥980/月、¥9,800/年）
  ├── Checkout Session 生成 API
  ├── Customer Portal 設定
  └── Webhook エンドポイント

□ 料金ページ
  ├── PricingTable コンポーネント
  └── /pricing ページ

□ AI Chat の利用制限を認証連携
  ├── Free: 月 5 回
  ├── Pro: 月 50 回
  └── 上限到達時の Pro 誘導 UI
```

### Phase 3: Pro 検索（3〜5 日）

```
□ Meilisearch Cloud セットアップ
  ├── インスタンス作成
  ├── API キー取得
  └── ファセット設定

□ scripts/sync-meilisearch.mjs 実装
  └── MDX → Meilisearch ドキュメント変換 + アップロード

□ functions/api/search.ts 実装
  └── Meilisearch API プロキシ（認証チェック付き）

□ src/components/search/ 実装
  ├── ProSearchBar（全文検索 UI）
  ├── SearchFacets（カテゴリフィルタ）
  └── SearchResultCard（ハイライト付き結果）

□ 検索 UI の分岐ロジック
  └── useUser().plan で Free/Pro 切替
```

### Phase 4: 品質改善 + 運用（継続）

```
□ チャット品質改善
  ├── 質問ログ分析 → プロンプト調整
  ├── チャンキング粒度の最適化
  └── 回答品質のスコアリング（ユーザーフィードバック）

□ 複雑質問の Haiku ルーティング
  └── 質問の長さ・専門性で判定

□ Team プラン追加
  ├── Stripe per-seat pricing
  ├── 組織管理 UI（Clerk Organizations）
  └── API アクセスキー発行

□ CI/CD パイプライン拡張
  ├── コンテンツ追加時に自動でインデックス更新
  └── Vectorize + Meilisearch の差分更新
```

---

## 8. 技術的な判断ポイント

### 8.1 output: 'export' を維持するか？

| 選択肢 | メリット | デメリット |
|---|---|---|
| **維持（推奨）** | SEO 最適、ビルド速度、CDN キャッシュ効率 | API は別レイヤーで実装が必要 |
| SSR に切替 | API Route が使える、ミドルウェアが使える | Cloudflare Pages の SSR 対応に制約あり、ビルド複雑化 |

**判断: 維持**。静的サイトの利点（SEO、速度、コスト）が大きく、API は Cloudflare Pages Functions で十分。

### 8.2 ストリーミング方式

| 選択肢 | メリット | デメリット |
|---|---|---|
| **SSE（Server-Sent Events）推奨** | シンプル、ブラウザネイティブ、Cloudflare Workers 対応 | 単方向のみ |
| WebSocket | 双方向 | Cloudflare Pages Functions 未対応、Durable Objects 必要 |
| Polling | 最もシンプル | UX が悪い（遅延感） |

**判断: SSE**。`ReadableStream` + `TransformStream` で Workers から直接ストリーミング可能。

### 8.3 LLM モデルルーティング

```
質問受信
  │
  ├── トークン数 < 100 かつ単純検索的 → GPT-4o mini
  │   例: 「盛土の締固め度は？」
  │
  ├── トークン数 > 100 または比較・分析 → Claude Haiku
  │   例: 「河川堤防と道路盛土の締固め基準の違いは？」
  │
  └── Phase 4 以降で判定ロジックを追加
      初期は全て GPT-4o mini で開始し、品質問題があれば Haiku に移行
```

### 8.4 Clerk の静的サイト統合の注意点

`output: 'export'` では以下の制約がある:

1. **Clerk Middleware は使えない** → Pages Functions の `_middleware.ts` で代替
2. **`currentUser()` サーバー関数は使えない** → クライアント側の `useUser()` のみ
3. **認証状態に基づくページ生成は不可** → ページは全て公開、UI で動的に切替

```typescript
// 正しいパターン（クライアント側判定）
'use client';
import { useUser } from '@clerk/nextjs';

function ChatWidget() {
  const { user, isLoaded } = useUser();
  const plan = user?.publicMetadata?.plan || 'free';

  if (!isLoaded) return <Skeleton />;
  if (!user) return <LoginPrompt />;
  if (plan === 'free') return <FreeChatUI />;
  return <ProChatUI />;
}
```

---

## 9. ビルド・デプロイパイプライン

### 9.1 現在のパイプライン

```
npm run build
  → sync-content-images.mjs
  → next build (→ out/)
  → generate-search-index.mjs
  → generate-sitemap.mjs

wrangler pages deploy out
```

### 9.2 拡張後のパイプライン

```
npm run build
  → sync-content-images.mjs         （既存）
  → next build (→ out/)             （既存）
  → generate-search-index.mjs       （既存、Free 検索用）
  → generate-sitemap.mjs            （既存）

npm run build:indexes               （NEW — コンテンツ変更時のみ）
  → build-vector-index.mjs          （Vectorize 更新）
  → sync-meilisearch.mjs            （Meilisearch 更新）

wrangler pages deploy out            （functions/ も自動デプロイ）
```

### 9.3 GitHub Actions 拡張

```yaml
# .github/workflows/cloudflare-deploy.yml に追加
- name: Build indexes
  if: contains(github.event.head_commit.message, '[reindex]') || github.event_name == 'workflow_dispatch'
  run: |
    npm run build:indexes
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    MEILISEARCH_HOST: ${{ secrets.MEILISEARCH_HOST }}
    MEILISEARCH_API_KEY: ${{ secrets.MEILISEARCH_API_KEY }}
```

コンテンツ追加のたびにインデックスを更新するのではなく、コミットメッセージに `[reindex]` を含めるか手動実行時のみ実行する。

---

## 10. モニタリング

| 項目 | 方法 | 閾値 |
|---|---|---|
| API レイテンシ | Cloudflare Analytics | chat: < 5s, search: < 500ms |
| エラーレート | Cloudflare Analytics | < 1% |
| LLM API コスト | OpenAI/Anthropic ダッシュボード | 月 ¥10,000 超でアラート |
| 有料転換率 | Stripe + GA4 | 目標 0.5% |
| チャーン率 | Stripe | < 5%/月 |
| Chat 利用率 | D1 クエリ | DAU の 3% 以上 |

---

## 11. セキュリティ

| 脅威 | 対策 |
|---|---|
| プロンプトインジェクション | システムプロンプトに「資料の情報のみで回答」を厳格に指示。ユーザー入力のサニタイズ |
| API 不正利用 | Clerk JWT + rate limit（10 req/min/user）+ IP ベース制限 |
| Stripe Webhook 偽装 | `stripe.webhooks.constructEvent()` で署名検証 |
| コンテンツスクレイピング | 静的 HTML なので防止不可（公的文書のため許容） |
| API キー漏洩 | 全て Cloudflare Secrets に格納。フロントエンドに API キーを露出しない |

---

## 12. まとめ: 最小構成で動く MVP

Phase 1（AI Chat MVP）の最小実装:

| コンポーネント | 実装量 | 必須 |
|---|---|---|
| `scripts/build-vector-index.mjs` | 150〜200 行 | ○ |
| `functions/api/chat.ts` | 100〜150 行 | ○ |
| `src/components/chat/AIChatWidget.tsx` | 200〜300 行 | ○ |
| `functions/_middleware.ts` | 30〜50 行 | △（IP ベース制限なら不要） |
| wrangler.toml 更新 | 10 行 | ○ |
| **合計** | **約 500〜700 行** | |

**MVP では認証なしで開始可能**。IP ベースで月 3 回の制限をかけ、利用データを収集してから認証・課金を追加する。
