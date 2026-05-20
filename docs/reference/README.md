---
title: docs/reference/ 索引
---

# docs/reference/ 索引

CLAUDE.md 本体に載せるには詳細すぎるが、特定の作業時に参照したいドキュメント群。CLAUDE.md は「判断の土台」、このディレクトリは「作業マニュアル」という役割分担。

## ファイル一覧

| ファイル | 内容 | いつ読むか |
|---|---|---|
| [content-authoring.md](./content-authoring.md) | MDX コンポーネント・過去問構造ルール・数式図表規約・モバイル視認性詳細・画像配信・frontmatter テンプレ | MDX を書く・編集するとき（`/pdf-to-mdx`, `/keyword-page`, `/review-mobile` 等） |
| [exam-content-policy.md](./exam-content-policy.md) | 試験別コンテンツ整備方針（整備方針差分表・執筆判断ガイド）+ コンテンツ別レビュー視点（レビュー視点表）+ 新資格追加手順 | PDF→MDX 変換・品質レビュー時（`/improve-article --mode verify`, `/pdf-to-mdx --exam civil-construction-1`, `/pdf-to-mdx --exam cem` 等） |
| [skills-registry.md](./skills-registry.md) | management / dev / content / ui / marketing / analytics / strategy / ads の全スキル一覧＋Phase 別運用メモ | 利用可能なスキルを探すとき、新スキル作成時に重複がないか確認するとき |
| [agents-registry.md](./agents-registry.md) | エージェント詳細表＋チーム連携パターン＋Generator/Evaluator 分離原則 | サブエージェントを呼び出すときの担当範囲確認、連携設計時 |
| [workflows.md](./workflows.md) | 推奨ワークフロー（週次運用・PDF→MDX 変換フロー・キーワードページ作成フロー・リスク評価）+ Phase 別ロードマップ | 週次運用・変換作業・キーワードページ作成時 |
| [book-list.md](./book-list.md) | Amazonアソシエイト紹介書籍リスト（資格別×用途別、ASIN/ISBN/用途/紹介先メモ）+ PA-API 移行ロードマップ | 書籍紹介を追加・更新するとき／PA-API 実装時の seed として |

## 読み方の原則

1. **CLAUDE.md 本体が真実源** — プロジェクトの目的・判断の土台・URL 設計・必須ルール・ハーネス設計原則は CLAUDE.md 側にある
2. **このディレクトリは作業時に都度 Read** — 毎ターンは読まれない。該当スキル実行時や具体的な手順確認時にだけ読み込む
3. **重複を避ける** — 同じ情報を CLAUDE.md と reference の両方に置かない。CLAUDE.md 側には「参照先」のみ記載し、実体はこちら

## 更新ルール

- **新スキル追加時** → `skills-registry.md` を更新、必要なら `workflows.md` も
- **新エージェント追加時** → `agents-registry.md` と CLAUDE.md のモデル指定クイックリファレンス表の両方を更新
- **新資格追加時** → `exam-content-policy.md` の整備方針差分表・レビュー視点表の両方に列を追加
- **コンテンツ品質ルール変更時** → `docs/reference/content-principles.md`（真実源）をまず更新し、`content-authoring.md` は参照として揃える

## CLAUDE.md との関係

CLAUDE.md の「リファレンス索引」セクションから各ファイルへリンクが張られている。逆参照はこのファイルを参照先として使うこと。

## frontmatter スキーマ

`docs/reference/*.md` には YAML frontmatter を必ず付与する。Obsidian の Front Matter Title プラグインがこの `title:` を読み、ファイルツリー・タブ・グラフ・検索の表示名を日本語化する。

### 必須フィールド

| フィールド | 必須 | 用途 | 例 |
|---|---|---|---|
| `title` | ✅ | Obsidian 表示名、将来の HTML `<title>` 等 | `紹介書籍リスト（Amazonアソシエイト用）` |

### 拡張フィールド候補（任意）

将来必要に応じて追加可能。最小限の `title:` だけで開始し、必要が出てきた時点でフィールドを増やす方針:

| フィールド | 用途 | 例 |
|---|---|---|
| `description` | サマリ（ファイル一覧ページや SeeAlso 生成用） | `Amazonアソシエイト用の紹介書籍台帳` |
| `tags` | Obsidian タグ・横断検索 | `[reference, monetization]` |
| `updated` | 最終更新日（手動運用 or pre-commit 自動化） | `2026-05-19` |
| `aliases` | Obsidian エイリアス（短縮表記検索） | `[書籍リスト]` |
| `owner` | 担当エージェント・担当者 | `strategy-advisor` |

### フォールバック

プラグイン設定:
- **main**: `title`（frontmatter から取得）
- **fallback**: `#heading`（無い場合は H1 を使う）

つまり H1 が日本語で存在すれば、frontmatter が無いファイルも日本語表示される。ただし新規作成時は **必ず frontmatter 付与** が原則（明示性・将来拡張性のため）。

### 新規 .md 作成時のテンプレ

```markdown
---
title: ドキュメントタイトル
---

# ドキュメントタイトル

本文...
```

H1 と `title:` を二重管理する必要があるのは煩雑だが、両者の役割が異なる:
- `title:` → ツール（Obsidian / 将来の Linter / 集計スクリプト）が読む
- `# H1` → 人間が GitHub やテキストエディタで開いたときに見る
- 値が一致している限り問題なし。差別化したい場合（例: ファイルツリーは短く、本文H1はフル）は意図的に変えてOK
