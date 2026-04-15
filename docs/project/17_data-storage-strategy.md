# データストレージ戦略 — 複数資格試験への拡張時の判断指針

**策定日**: 2026-04-14
**ステータス**: 採用決定（D1 不採用、frontmatter + build-time JSON 継続）
**関連**:
- `01_設計思想.md`（フラット URL・MDX 一元管理）
- `13_quality-cycle-architecture.md`（品質サイクル全体像）
- `.claude/reference/exam-content-policy.md`（試験別コンテンツ整備方針＋レビュー視点）

## 1. 背景

doboku-note は土木・建設系試験対策ハブとして、現在「1級土木施工管理技士」と「技術士総合技術監理部門」の 2 試験を Phase 1 で整備中だが、将来的に以下のような追加対応を想定している:

- 技術士（建設部門・他選択科目）
- コンクリート主任技師
- コンクリート診断士
- 行政書士（建設業許可等の法務系）
- 測量士・測量士補
- 1級・2級造園施工管理技士
- 他の土木系国家資格

複数試験の追加にあたって浮上した論点が **「タグ・キーワード管理を D1（Cloudflare D1 SQLite）データベースに寄せるべきか」** である。本ドキュメントはこの判断を記録する Architecture Decision Record (ADR)。

---

## 2. 結論

### 採用方針

**D1 は導入しない。frontmatter 拡張 + build-time JSON インデックスで対応する。**

将来 iOS アプリのバックエンドや Web ダッシュボードを実装する段階で、ユーザーデータ専用に D1 を導入することは検討の余地あり。ただしその場合も「コンテンツ管理は MDX、ユーザーデータは D1」の棲み分けを守る。

---

## 3. 判断理由

### 3.1 静的サイトの優位性を捨てるコストが大きい

現在の構成:
- Cloudflare Pages がビルド時に MDX → 静的 HTML を生成して配信
- TTFB が極めて速い、CDN エッジで完結
- 運用コストはほぼゼロ

D1 を導入すると:
- Workers / Functions 経由のクエリになり、レイテンシ増加
- ローカル開発で miniflare / wrangler の起動が必要
- デプロイパイプラインが複雑化（migration、シード、ロールバック）
- エラー時のデバッグが多層化

### 3.2 規模がまだ DB が必要なラインに達していない

| 指標 | 現状 | 拡張後（3-4 試験） | DB が必要なライン |
|---|---|---|---|
| MDX ファイル数 | ~700 | 2,000-3,000 | 10,000+ |
| データクエリ頻度 | build-time のみ | build-time のみ | runtime クエリ多発 |
| ユーザー数 | ゼロ（読み手） | ゼロ | 認証ユーザー |
| 編集者数 | 1 名 | 1-2 名 | チーム編集 |

現在のスケールでは MiniSearch のクライアント全文検索と build-time JSON インデックス（`src/config/past-exam-backlinks.json` 等）で十分回る。

### 3.3 タグ・キーワード管理の本質課題は「frontmatter 規約整備」

試験横断キーワード（例: PDCA サイクル、コンクリート工学、安全管理）の重複問題は、frontmatter に試験配列を 1 本追加するだけで解決する:

```yaml
---
title: PDCAサイクル
slug: pdca-cycle
exams:                              # 複数試験対応の鍵
  - pe-comprehensive-management
  - civil-construction-1
  - concrete-chief-engineer
sections:                           # 試験別のセクション ID
  pe-comprehensive-management: '2.1'
  civil-construction-1: '4-3'
  concrete-chief-engineer: '1-2'
tags:
  - 経済性管理
  - 品質管理
  - 計画立案
---
```

カテゴリ別ページがビルド時に `exams` 配列でフィルタすれば、1 つの MDX が複数試験で再利用できる。DB は不要。

### 3.4 git が真実源である利点を失う

現状の利点:
- MDX を編集 → git に履歴が残る
- PR レビューでコンテンツ変更を確認できる
- バックアップは git remote のみで完結
- 履歴のロールバックが `git revert` で可能

D1 を真実源にすると:
- 編集 UI が必要（自分で実装するか、外部 SaaS）
- 履歴管理は別系統（D1 のスナップショット機能 or 自前）
- git diff レビューが効かなくなる
- バックアップ運用が必要

### 3.5 既存の build-time JSON で十分まかなえている

すでに以下の用途で JSON インデックスが活用できている:

| ファイル | 用途 |
|---|---|
| `src/config/past-exam-backlinks.json` | 過去問⇔キーワード双方向リンク |
| `src/config/exam-question-keywords.json` | 過去問の出題キーワード一覧 |
| `data/mechanical-screen.json` | 全 MDX の機械的指標 |
| `data/quality-scores.json` | cem-qa 採点結果 |
| `public/search-index.json` | MiniSearch 用全文インデックス |

これらは build script で MDX を一括スキャンして生成しており、DB と同等の機能を build-time で提供している。

---

## 4. D1 が活きる将来シナリオ

ただし、以下のシナリオが現実化したら D1 を真剣に検討する:

### 4.1 iOS アプリのバックエンド（最有力）

- ユーザー認証（過去問演習の進捗管理、サブスク会員）
- お気に入り・ブックマーク
- 学習履歴の同期
- プッシュ通知の購読管理

→ これは **明確に DB 案件**。コンテンツ自体は引き続き MDX、ユーザーデータだけ D1 という棲み分け。

### 4.2 Quality Cycle のダッシュボード Web UI

- `data/quality-scores.json` が 5MB を超えてきたら DB 移行を検討
- グラフ表示・期間集計・diff 比較などの動的ビューが欲しくなったら検討

### 4.3 ユーザー生成コンテンツ

- コメント、メモ、Q&A などをユーザーが投稿できる機能
- これも DB 案件。コンテンツ MDX とは別系統。

### 4.4 マルチユーザー編集

- 編集者が複数になり、編集ロック・コンフリクト解消が必要になったら CMS 化を検討
- ただしこれは Decap CMS のような Git ベース CMS が先候補

---

## 5. 実装ステータス（2026-04-14 完了）

複数試験対応の DB 不要ロードマップは全て実装済み。**具体のルール・スキーマ・検証ロジックは本ドキュメントでは管理しない**（実装ファイルが真実源）。ここには実装の入口だけを記す。

| 項目 | 実装ファイル | 参照すべき真実源 |
|---|---|---|
| **zod スキーマ** | `scripts/lib/frontmatter-schema.mjs` + `src/lib/frontmatter-schema.ts` | スキーマ定義・enum 値・型 |
| **タグ辞書ビルダー** | `scripts/build-tag-index.mjs` → `src/config/tag-dictionary.json` | 全 MDX から集計、allowlist (`src/config/tags.json`) とのドリフト検出 |
| **試験横断キーワード** | `scripts/build-cross-exam-keyword-index.mjs` → `src/config/cross-exam-keywords.json` | `exams:` 配列の集計、真のクロス試験 entry 検出 |
| **frontmatter lint** | `scripts/lint-frontmatter.mjs` | HIGH/MEDIUM/LOW ルール本体 |
| **pre-commit 検証** | `scripts/pre-commit-mdx.mjs` | HIGH ブロック、MEDIUM/LOW 警告 |
| **スキル** | `.claude/skills/content/check-frontmatter/SKILL.md` | **ルール一覧の真実源**、ユーザー向けドキュメント |

### ルールの追加・変更はどうするか

frontmatter 検査ルールの変更は以下の順で行う:

1. `.claude/skills/content/check-frontmatter/SKILL.md` のルール表を更新（ユーザー向け説明の真実源）
2. `scripts/lint-frontmatter.mjs` に実装を追加
3. 必要なら `scripts/lib/frontmatter-schema.mjs` の zod スキーマを更新
4. `node scripts/lint-frontmatter.mjs --all` で既存 MDX 全件への影響を測定
5. 既存コンテンツを壊さないようルールの重大度（HIGH/MEDIUM/LOW）を調整

本ドキュメント（doc 17）は ADR のため、ルールの詳細やコードサンプルを書かない。doc 17 が変わるのは **判断を覆すとき**（D1 採用への方針転換など）のみ。

---

## 6. D1 移行を検討するトリガー条件

以下のいずれかが現実化したら、本ドキュメントを再評価する:

| トリガー | 検討する DB の用途 |
|---|---|
| iOS アプリの本格開発が始まる | ユーザーデータ専用の D1 |
| MDX ファイル数が 10,000 を超える | コンテンツ DB は依然不要、検索のみ別系統検討 |
| `data/quality-scores.json` が 5MB を超える | Quality Cycle 専用の D1 |
| 編集者が 3 名以上になる | Decap CMS or Git ベース CMS |
| ユーザー認証機能を実装する | D1 + Workers Auth |
| 試験を 5 種類以上扱う | frontmatter 拡張で対応継続、ただし規約厳格化 |
| ビルド時間が 5 分を超える | 増分ビルド戦略を検討（DB 化は最終手段）|

---

## 7. 採用しなかった代替案

### 7.1 D1 を全面導入

- ❌ 静的サイトの優位性を失う
- ❌ ローカル開発が複雑化
- ❌ git の真実源が失われる
- ❌ 現状の規模で見合わない

### 7.2 Markdown + 外部 CMS（Notion、Contentful、Sanity 等）

- ❌ 月額コストが発生
- ❌ ベンダーロックイン
- ❌ オフライン編集が困難
- ❌ 既存 MDX 資産を移行する手間

### 7.3 PostgreSQL（Supabase 等）

- ❌ Cloudflare Pages との親和性が低い
- ❌ コールドスタートのレイテンシ
- ❌ D1 と同じ問題に加えて外部依存

---

## 8. まとめ

| 観点 | 判断 |
|---|---|
| **コンテンツ管理** | MDX + frontmatter 継続 |
| **タグ・キーワード** | frontmatter 規約整備 + build-time JSON |
| **検索** | MiniSearch（クライアント全文検索）継続 |
| **試験横断キーワード** | frontmatter の `exams` 配列で対応 |
| **品質指標** | data/*.json 継続 |
| **ユーザーデータ** | 将来必要になったら D1（コンテンツとは別系統） |
| **編集ワークフロー** | git ベース継続 |

**核心原則**: 「**規模に合わない複雑さは入れない**」「**git を真実源として守る**」「**静的サイトの速さを犠牲にしない**」。

---

## 9. 参考リンク

- Cloudflare D1 ドキュメント: https://developers.cloudflare.com/d1/
- Decap CMS（Git ベース CMS）: https://decapcms.org/
- Astro の Content Collections（参考になる frontmatter スキーマ運用）: https://docs.astro.build/en/guides/content-collections/

---

**改訂履歴**:

- 2026-04-14: 初版作成。複数試験対応の議論を経て D1 不採用を決定。
- 2026-04-14: Section 5 を完了ステータス + 実装ファイルへのポインタに圧縮。詳細ルールは `.claude/skills/content/check-frontmatter/SKILL.md` と `scripts/lint-frontmatter.mjs` に移管し二重管理を解消。
