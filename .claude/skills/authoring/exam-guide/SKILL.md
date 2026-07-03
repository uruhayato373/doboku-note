---
name: exam-guide
description: >
  既存テキスト・問題集から試験対策ガイドを生成する。1級土木・2級土木・技術士など試験別の設定ファイル（.claude/skills/authoring/templates/exam-guide/{exam}.md）を参照しパラメタライズ。
  Use when user asks to [試験対策ガイドを作りたい, 頻出テーマ抽出, ガイド生成, /exam-guide].
---

<!-- TODO: 要確認 — 現行では `group: guide` のガイド記事は `guide-qa`（評価）→ `guide-rewriter`（リライト）→ `guide-fact-checker`（事実照合）の3エージェント体制で品質サイクルが運用されている（content-authoring.md 冒頭参照）。本スキルは「既存テキスト・問題集からのガイド新規生成」が目的で、上記サイクルは「既存 MDX の改善」が対象のため重複しない可能性が高いが、新規ガイド生成が本スキル経由のままか、それとも別の生成フローに一本化されているかは未確認。重複と判断されれば退役対象になり得るが、削除判断はユーザーに委ねる。-->

## 引数

```
/exam-guide [<topic>] [--exam {civil-construction-1|civil-construction-2|pe}]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `<topic>` | 任意 | 分野名（例: `earthwork`、`concrete`）。省略時はテンプレで列挙された全カテゴリを生成 |
| `--exam` | 任意 | 試験ID。省略時は `civil-construction-1`（後方互換） |

## 利用可能テンプレート

| exam | 対応試験 | テンプレート | 出力先 |
|---|---|---|---|
| `civil-construction-1` | 1級土木施工管理技士 | `templates/exam-guide/civil-construction-1.md` | `.local/r2/posts/civil-construction-1/guide-*/article.mdx` |
| `civil-construction-2` | 2級土木施工管理技士 | `templates/exam-guide/civil-construction-2.md` | `.local/r2/posts/civil-construction-2/guide-2-*/article.mdx` |
| `pe` | 技術士総合技術監理 | `templates/exam-guide/pe.md` | `.local/r2/posts/pe-comprehensive-management/guide-*/article.mdx` |

<!-- TODO: 要確認 — `templates/exam-guide/*.md`（civil-construction-1.md / civil-construction-2.md / pe.md / _schema.md / _new-exam-template.md）内の `source_paths` / `output_dir` は旧 `content/general/...` パスのまま残っている。本 SKILL.md の改訂スコープ外のため、テンプレート側は別途是正が必要。 -->

新試験は `templates/exam-guide/{exam-id}.md` を新規作成するのみ（スキル本体は変更不要）。

### 構成テンプレート

タイトルは frontmatter の `title` から自動生成されるため、本文に H1 は書かない。

```mdx
## 出題傾向

{過去問からの出題パターン分析}

## 頻出テーマ

### テーマ1: {テーマ名}

{テキストからの要点抽出。数式・表・図は原文から引用}

<Callout type="exam" title="試験のポイント">
{この分野で特に問われやすい知識}
</Callout>

### テーマ2: ...

## 過去問リンク

{関連する過去問へのリンク一覧}

## テキスト参照

{詳細を学びたい人向けの元テキストへのリンク}
```

### 重要ルール

1. **新しい内容を創作しない** — 既存テキストと問題集からの抽出・再構成のみ
2. **出題頻度で優先順位付け** — 過去問で繰り返し出題されるテーマを上位に配置
3. **相互リンク** — テキスト元ページと過去問ページへのリンクを必ず含める
4. **`<Callout type="exam" title="試験のポイント">`** — 各テーマの試験で問われやすいポイントを強調

## 出力先

```
.local/r2/posts/civil-construction-1/
├── guide-strategy/article.mdx              # 出題傾向と得点戦略
├── guide-earthwork-key-points/article.mdx   # 土工の重要ポイント
├── guide-concrete-key-points/article.mdx    # コンクリートの重要ポイント
├── guide-four-management/article.mdx        # 施工管理4大管理まとめ
└── guide-law-key-points/article.mdx         # 法規の重要ポイント
```

URL はすべて `/docs/{slug}` フラット（ディレクトリ名がそのまま slug になる想定）。frontmatter は必須項目（`title` / `seoTitle` / `description` / `category` / `tags` / `published`）を満たし、`tags` に `guide` を含める。

<!-- TODO: 要確認 — 新規ページを一覧・回遊導線に載せるための現行のナビ生成機構（旧 `src/lib/sidebar.ts` 相当）が不明。バックリンク・カテゴリ一覧は `npm run refresh-indexes` で静的インデックス化されるが、それ以外に手動登録が必要な箇所があるかは要確認。 -->

## テンプレート設定ファイル

このスキルで使用する試験固有の設定は以下のテンプレートで一元管理されます。

### 設定参照

**1級土木施工管理技士向けの設定:**
→ `.claude/skills/authoring/templates/exam-guide/civil-construction-1.md`

**2級土木施工管理技士向けの設定**（2026-05-28 追加）:
→ `.claude/skills/authoring/templates/exam-guide/civil-construction-2.md`

このファイルには以下が定義されています：
- ソースコンテンツのパス（土工・コンクリート・施工管理テキスト等）
- 外部情報源（著作権フリーの公開資料）
- 試験構成テーブル（第1次・第2次の科目配置）
- 出力先ディレクトリ
- サイドバー登録の slug

### Phase 2 リファクタ（2026-05-28 部分実装）

複数試験対応のため `--exam` パラメータを追加。

```bash
# 後方互換（civil-construction-1 がデフォルト）
/exam-guide earthwork

# 明示指定
/exam-guide --exam civil-construction-1 earthwork
/exam-guide --exam civil-construction-2 --slug guide-2-strategy
```

新資格（コンクリート技士・測量士等）対応時は：
1. `templates/exam-guide/{exam-id}.md` を新規作成（テンプレート参照）
2. このスキル側の変更は **不要**（設定ファイル追加のみ）

## PE ガイド記事の末尾テンプレ

PE（技術士総合技術監理部門）の `group: guide` 記事は、キーワードページとは別の構造ルールに従う。詳細は [content-principles.md §20](../../../../docs/reference/content-principles.md)。**`## 総合技術監理における位置づけ` および `## 参考資料` / `## 参考文献` は使用禁止**（キーワードページ専用）。

末尾は次の 2 型から記事性質に応じて選ぶ。lint-mdx-mobile.mjs カテゴリ 12（12-1 / 12-2 / 12-3）で機械検知される。

> **マガジン CTA の書式（必須）**: note 有料マガジンへの導線は `<MagazineCard id="{magazine-id}" utmContent="{guide-slug}" />` コンポーネントで置く。**タイトル・価格・noteURL は `src/lib/note-magazines.ts` が真実源**＝**本文に価格（¥）や note URL を直書きしない**（価格改訂で陳腐化するため。[[feedback_no_price_in_mdx_body]] / content-principles.md §14-c と同根）。`id` は `published: true` のマガジンのみ指定し、未公開・該当マガジンが無い試験では CTA を省く。サイト MDX では note.com の bare URL はカード化されない（リンクカードは MagazineCard が担う）。

### Type-1「○○の選択肢」型（戦略・実務手順系）

タイトル末尾が「戦略」「計画」「手順」「ガイド」のガイドに使う。例: `essay-exam-strategy` / `exam-application-guide` / `exam-passing-strategy`。

```mdx
## 記述式対策の選択肢

{次の意思決定を促す散文 1〜2 段落（無料サイトコンテンツ → note 有料の組み合わせを示す）}

- **無料で基礎を固める** → [基礎ガイド](/docs/pe-comprehensive-management-xxx)
- **有料で本番演習** → 下記の note 有料マガジン（タイトル・価格は MagazineCard が自動表示）

<MagazineCard id="{magazine-id}" utmContent="{guide-slug}" />
```

### Type-2「次のステップ」または「関連リソース」型（俯瞰・分析系）

タイトル末尾が「予測」「分析」「俯瞰」「マップ」「トレードオフ」のガイドに使う。例: `r8-essay-keyword-forecast` / `whitepaper-study-map` / `essay-mlit-*` / `management-tradeoffs` / `mlit-whitepaper-2025`。

**SeeAlso 1〜2 件方針**（2026-05-18 改訂、content-principles.md §20 準拠、決定疲れ回避）:

```mdx
## 次のステップ

{読者の状況別にどう選ぶかの判断軸を散文 1 段落で示す。例:「論文骨子のテンプレートを先に作りたいなら A、業務領域別の論点を固めたいなら B を選んでください」}

<SeeAlso
  href="/docs/pe-comprehensive-management-xxx"
  title="{主推奨ページタイトル}"
  reason="{なぜ次に読むべきか 1〜2 行で}"
/>

<SeeAlso
  href="/docs/pe-comprehensive-management-yyy"
  title="{副推奨ページタイトル}"
  reason="{別ルートの理由を 1〜2 行で}"
/>

{該当する場合のみ note CTA を散文 1 段落で導入してから MagazineCard を置く}

<MagazineCard id="{magazine-id}" utmContent="{guide-slug}" />
```

**重要な禁則**:

- **`<RelatedKeywords>` を末尾に置かない** — 「次のステップ」と完全重複しやすく、選択肢過多で決定疲れを生む
- **箇条書き 3 件以上を `## 次のステップ` 配下に並べない** — ガイド記事の役割は読者の選択肢を減らすこと

**ハブ記事の例外**: `mlit-whitepaper-2025` のような「テーマ別深掘り入口」がハブ機能の主要価値である場合は、`## テーマ別深掘り` セクションを別途設けて 3〜7 件の箇条書きナビゲーションを維持してよい。ただし `## 次のステップ` セクションとは **明確に分離**し、後者は `<SeeAlso>` 1〜2 件に絞る。

既に `## 関連リソース` や `## note で深掘り` を持つ記事はその名称・構造を尊重し、参考文献・参考資料部分だけを削除する。

### テンプレートフォルダ全体

`.claude/skills/authoring/templates/` 以下の構成：

```
templates/
├── README.md              ← フォルダの目的と運用ルール
└── exam-guide/
    ├── _schema.md         ← 試験別設定ファイルの仕様定義
    ├── civil-construction-1.md  ← 1級土木（既定）
    ├── civil-construction-2.md  ← 2級土木（2026-05-28 追加）
    ├── pe.md              ← /exam-guide --exam pe が使用
    ├── concrete-engineer.md     ← 将来追加予定
    └── _new-exam-template.md    ← 新資格追加時のコピー用雛形
```

詳細は `templates/README.md` を参照してください。
