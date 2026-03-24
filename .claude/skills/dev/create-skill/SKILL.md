---
name: create-skill
description: Claude Code スキルの作成・設計ガイド。新しいスキルを作成するとき、既存スキルを改善するときに自動で参照する背景知識。
user-invocable: false
---

Claude Code スキルの設計・実装ガイド。公式ドキュメント（code.claude.com/docs/en/skills）とこのプロジェクトの規約を統合。

## スキルのディレクトリ構造

```
<skill-name>/
├── SKILL.md           # メイン指示書（必須・500行以内）
├── reference/         # 詳細リファレンス（SKILL.md から参照）
│   ├── spec.md        # 仕様・規約
│   └── examples.md    # 使用例
├── scripts/           # 実行可能スクリプト
│   └── helper.js      # Claude が実行するスクリプト
└── examples/          # 完成物の参考例
    └── sample.svg     # 実際の出力サンプル
```

`SKILL.md` 以外はすべてオプション。`SKILL.md` から相対パスで参照する。

## SKILL.md の書き方

### frontmatter（YAML）

```yaml
---
name: skill-name              # 小文字・ハイフン区切り（省略時はディレクトリ名）
description: 何をするスキルか  # Claude が自動呼出しを判断する根拠（必須推奨）
disable-model-invocation: true # true → ユーザーのみ /name で呼出し可
user-invocable: false          # false → /menu に表示しない（背景知識用）
allowed-tools: Read, Grep      # スキル実行時に許可なく使えるツール
context: fork                  # fork → サブエージェントで実行
agent: Explore                 # context: fork 時のエージェント種別
model: sonnet                  # モデル指定（省略時は親のモデル）
argument-hint: "[slug]"        # /name の補完時に表示するヒント
---
```

### frontmatter の使い分け

| パターン | 設定 | 用途 |
|----------|------|------|
| ユーザー＆Claude両方が呼出し | (デフォルト) | 汎用リファレンス・軽い作業 |
| ユーザーのみ呼出し | `disable-model-invocation: true` | デプロイ・副作用のある操作 |
| Claudeのみ呼出し | `user-invocable: false` | 背景知識・規約 |

### 本文の構成パターン

**タスク型**（手順を実行するスキル）:
```markdown
## 用途
## 引数
## 手順
### Phase 1: ...
### Phase 2: ...
## 注意
## 参照
```

**リファレンス型**（知識を提供するスキル）:
```markdown
## いつ適用するか
## 規約
## 例外
```

### 変数置換

| 変数 | 内容 |
|------|------|
| `$ARGUMENTS` | スキル呼出し時の全引数 |
| `$ARGUMENTS[0]`, `$0` | 位置引数（0始まり） |
| `${CLAUDE_SKILL_DIR}` | SKILL.md のあるディレクトリ絶対パス |
| `${CLAUDE_SESSION_ID}` | セッション ID |

スクリプト参照は `${CLAUDE_SKILL_DIR}` を使う:
```bash
node "${CLAUDE_SKILL_DIR}/scripts/helper.js" $ARGUMENTS
```

### 動的コンテキスト注入

`` !`command` `` 構文でシェルコマンドの出力をスキル内容に埋め込める:
```markdown
## 現在の状態
- ブランチ: !`git branch --show-current`
- 未コミット: !`git status --short`
```

## scripts/ の設計

### 2つのパターン

**パラメータ駆動型**（推奨: 繰り返し使うスクリプト）:
- JSON 設定ファイルを受け取り、出力を生成
- スクリプト自体は変更不要
- 例: `scatter.js config.json output.svg`

**テンプレート型**（カスタマイズが必要なスクリプト）:
- `// CUSTOMIZE:` コメントで編集箇所を明示
- 記事ディレクトリにコピーして使う
- 例: `cover-template.js`

### スクリプトの原則

1. **自己完結**: 外部パッケージへの依存は最小限（`require('fs')`, `require('path')` 等の Node.js 標準 + プロジェクトの `node_modules`）
2. **引数は `process.argv`**: 設定は JSON ファイル or コマンド引数で渡す
3. **出力先は引数で指定**: ハードコードしない
4. **エラーメッセージは具体的に**: 設定ファイルがない場合は使い方を表示

## reference/ の設計

`SKILL.md` が 500 行を超えそうなとき、詳細を分離する:

- **デザインシステム**: 色・フォント・サイズ等の定数
- **チャートパターン**: 種別ごとの選び方・実装方法
- **API リファレンス**: 関数シグネチャ・オプション一覧

`SKILL.md` からの参照:
```markdown
詳細は [reference/design-system.md](reference/design-system.md) を参照。
```

## examples/ の設計

**完成物の実例**を置く。Claude が構造を理解する最良のリファレンス。

- 実際の記事から生成した SVG / JSON / マークダウン
- コメント付きで「なぜこの構造か」を説明（任意）

## スキルの配置場所

| 場所 | パス | 適用範囲 |
|------|------|----------|
| プロジェクト | `.claude/skills/<name>/SKILL.md` | このリポジトリ |
| 個人 | `~/.claude/skills/<name>/SKILL.md` | 全プロジェクト |
| エンタープライズ | managed settings | 組織全体 |

同名の場合の優先順位: エンタープライズ > 個人 > プロジェクト。

## ベストプラクティス

1. **SKILL.md は 500 行以内**: 詳細は reference/ に分離
2. **description は具体的に**: Claude の自動呼出し判断の根拠になる
3. **副作用のあるスキルは `disable-model-invocation: true`**: デプロイ・DB変更・外部API呼出し等
4. **一時ファイルは後処理で削除**: CLAUDE.md の作業規約に従う
5. **スクリプトは `${CLAUDE_SKILL_DIR}` で参照**: 作業ディレクトリに依存しない
6. **`context: fork` は明確なタスクがあるときのみ**: ガイドラインだけのスキルをforkすると空の結果が返る
7. **`allowed-tools` で最小権限**: 読み取り専用スキルには `Read, Grep, Glob` のみ

## このプロジェクト固有の規約

詳細は [reference/project-conventions.md](reference/project-conventions.md) を参照。
