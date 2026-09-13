---
title: .claude/knowledge/reference/ 索引
---

# .claude/knowledge/reference/ 索引

CLAUDE.md 本体に載せるには詳細すぎるが、特定の作業時に参照したいドキュメント群。CLAUDE.md は「判断の土台」、このディレクトリは「作業マニュアル」という役割分担。

## ファイル一覧

ここに一覧は置かない。索引は **CLAUDE.md の「リファレンス索引」表が唯一**で、ファイルを増減したらそちらの行を足す・消す（2026-09-11。以前はここにも一覧があり 70 本中 7 本しか載らず腐っていた。索引が 2 つあると片方が必ず腐る）。

## 読み方の原則

1. **CLAUDE.md 本体が真実源** — プロジェクトの目的・判断の土台・URL 設計・必須ルール・ハーネス設計原則は CLAUDE.md 側にある
2. **このディレクトリは作業時に都度 Read** — 毎ターンは読まれない。該当スキル実行時や具体的な手順確認時にだけ読み込む
3. **重複を避ける** — 同じ情報を CLAUDE.md と reference の両方に置かない。CLAUDE.md 側には「参照先」のみ記載し、実体はこちら

## 更新ルール

- **新スキル追加時** → `skills-registry.md` を更新、必要なら `workflows.md` も
- **新エージェント追加時** → `agents-registry.md` と CLAUDE.md のモデル指定クイックリファレンス表の両方を更新
- **新資格追加時** → `exam-content-policy.md` の整備方針差分表・レビュー視点表の両方に列を追加
- **コンテンツ品質ルール変更時** → `.claude/knowledge/reference/content-principles.md`（真実源）をまず更新し、`content-authoring.md` は参照として揃える
- **分類語彙の変更時**（領域・記事型・タグ class・テーマ昇格基準）→ `content-taxonomy.md` をまず更新し、値は `src/config/{content-taxonomy,categories,tags,topics}.json`、整合は `npm run check-content-taxonomy` と `tests/content-taxonomy.test.mjs`

## CLAUDE.md との関係

CLAUDE.md の「リファレンス索引」セクションが各ファイルへの唯一の索引。このファイルは読み方の原則・更新ルール・frontmatter スキーマだけを持つ。

## frontmatter スキーマ

`.claude/knowledge/reference/*.md` には YAML frontmatter を必ず付与する。Obsidian の Front Matter Title プラグインがこの `title:` を読み、ファイルツリー・タブ・グラフ・検索の表示名を日本語化する。

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
