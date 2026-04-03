---
name: exam-guide
description: >
  既存テキスト・問題集から試験対策ガイドを生成する。Use when user asks to [試験対策ガイドを作りたい, /exam-guide].
---
```

### 構成テンプレート

```mdx
# {分野名} 重要ポイント

## 出題傾向

{過去問からの出題パターン分析}

## 頻出テーマ

### テーマ1: {テーマ名}

{テキストからの要点抽出。数式・表・図は原文から引用}

:::note[試験のポイント]
{この分野で特に問われやすい知識}
:::

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
4. **:::note[試験のポイント]** — 各テーマの試験で問われやすいポイントを強調

## 出力先

```
content/general/exam-guide/
├── strategy.mdx              # 出題傾向と得点戦略
├── earthwork-key-points.mdx  # 土工の重要ポイント
├── concrete-key-points.mdx   # コンクリートの重要ポイント
├── four-management.mdx       # 施工管理4大管理まとめ
└── law-key-points.mdx        # 法規の重要ポイント
```

## サイドバー登録

`src/lib/sidebar.ts` の `generalSidebar` に追加:

```typescript
{
  type: 'category',
  label: '1級土木施工管理 試験対策ガイド',
  link: {
    type: 'generated-index',
    title: '1級土木施工管理 試験対策ガイド',
    slug: 'exam-guide',
  },
  items: [
    'general/exam-guide/strategy',
    'general/exam-guide/earthwork-key-points',
    'general/exam-guide/concrete-key-points',
    'general/exam-guide/four-management',
    'general/exam-guide/law-key-points',
  ],
},
```

## テンプレート設定ファイル

このスキルで使用する試験固有の設定は以下のテンプレートで一元管理されます。

### 設定参照

**1級土木施工管理技士向けの設定:**
→ `.claude/skills/content/templates/exam-guide/civil-construction-1.md`

このファイルには以下が定義されています：
- ソースコンテンツのパス（土工・コンクリート・施工管理テキスト等）
- 外部情報源（著作権フリーの公開資料）
- 試験構成テーブル（第1次・第2次の科目配置）
- 出力先ディレクトリ
- サイドバー登録の slug

### Phase 2 への移行

**2026年秋予定**: このスキルを複数試験対応の汎用化へリファクタリングします。

```bash
# Phase 1（現在）
/exam-guide earthwork

# Phase 2（予定）
/exam-guide --exam civil-construction-1 --topic earthwork
```

新資格（コンクリート技士・測量士等）対応時は：
1. `templates/exam-guide/{exam-id}.md` を新規作成（テンプレート参照）
2. このスキル側の変更は **不要**（設定ファイル追加のみ）
3. Phase 2 汎用化時に `--exam` パラメータで自動統合

### テンプレートフォルダ全体

`.claude/skills/content/templates/` 以下の構成：

```
templates/
├── README.md              ← フォルダの目的と運用ルール
└── exam-guide/
    ├── _schema.md         ← 試験別設定ファイルの仕様定義
    ├── civil-construction-1.md  ← 本スキルが使用（当ファイル）
    ├── pe.md              ← /pe-exam-guide が使用
    ├── concrete-engineer.md     ← Phase 2で対応予定
    └── _new-exam-template.md    ← 新資格追加時のコピー用雛形
```

詳細は `templates/README.md` を参照してください。
