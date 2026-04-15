# スキルテンプレート — 複数資格対応への段階的汎用化

最終更新: 2026-04-01

複数の土木系資格試験に対応するにあたり、スキルの試験ごとの差分を集約・管理するフォルダです。

---

## 目的

1級土木施工管理技士専用だったスキル (`exam-guide`, `exam-questions-import` 等) を複数資格対応に拡張する際、
**スキル本体には共通ロジックだけを保持し、試験固有の設定をこのフォルダで管理する** ことで、以下を実現します。

- 新資格対応時にスキルを追加する必要がない（設定ファイル追加のみ）
- スキル保守の複雑性を最小化
- ハーネス設計原則4「スキルを増やすより既存スキルのパラメータ化を優先」に準拠

---

## フォルダ構成

```
templates/
├── README.md              ← このファイル
└── exam-guide/
    ├── _schema.md         ← 試験ごとの設定ファイルの仕様定義
    ├── civil-construction-1.md  ← 1級土木施工管理技士の設定
    ├── pe.md              ← 技術士（建設部門）の設定
    ├── concrete-engineer.md     ← コンクリート技士の設定（Phase 2で埋める）
    └── _new-exam-template.md    ← 新資格追加時のコピー用雛形
```

---

## 運用ルール

### 1. 試験ごとの設定ファイル名

設定ファイル名は **URL設計ガイドラインで定義した `exam-id`** と一致させる。

例：
- `civil-construction-1.md` ← `/docs/exam/civil-construction-1/`
- `pe.md` ← `/docs/exam/pe/`
- `concrete-engineer.md` ← `/docs/exam/concrete-engineer/`（未実装）

### 2. 新資格追加時の手順

1. `_new-exam-template.md` をコピー
2. ファイル名を `{exam-id}.md` に変更
3. `_schema.md` の6つの変数を埋める（詳細は `_schema.md` 参照）
4. 対応するスキル（`exam-guide`, `exam-questions-import` など）の参照を更新

### 3. 設定ファイルの変更

試験主催機関が科目構成を変更した場合などは、該当する `.md` ファイルのみを更新。
スキルSKILL.md本体の変更は不要。

---

## Phase 別の進化ロードマップ

### Phase 1（現在 2026-04-01）：テンプレート外部化

**状態**: 設定ファイルは外部化されるが、スキルSKILL.md本体はまだ試験固有。

```
/exam-guide （1級土木施工管理技士向け）
  ↓ templates/exam-guide/civil-construction-1.md を参照

/pe-exam-guide （技術士向け）
  ↓ templates/exam-guide/pe.md を参照
```

**メリット**: 新資格追加時、設定ファイル追加のみ。スキル追加なし。

**デメリット**: スキル本体は複数存在（DRY原則的には不十分）。

### Phase 2（2026年秋予定）：スキル汎用化へリファクタリング

**目標**: スキルを1つに集約し、パラメータで試験を指定。

```
/exam-guide --exam {exam-id}
  ↓ 内部で templates/exam-guide/{exam-id}.md を読み込み
  ↓ スキルは1つのみ

/pe-exam-guide → 廃止（/exam-guide --exam pe に統合）
```

**このフォルダの役割**:
- Phase 2 実装時の参照実装
- スキル側での `--exam` パラメータ処理の仕様書になる

---

## 各フォルダの詳細

### `exam-guide/`

試験対策ガイド生成スキル（`/exam-guide`, `/pe-exam-guide` 等）が参照する設定の集約。

**ファイル一覧**

| ファイル | 内容 | 必須度 |
|---|---|---|
| `_schema.md` | 試験ごとの設定の仕様書（6変数の定義） | ✅ 必須 |
| `civil-construction-1.md` | 1級土木施工管理技士の設定値 | ✅ 現在運用中 |
| `pe.md` | 技術士（建設部門）の設定値 | ✅ 現在運用中 |
| `concrete-engineer.md` | コンクリート技士の設定値 | ⏳ Phase 2で作成 |
| `_new-exam-template.md` | 新資格追加時のコピー用テンプレート | ✅ 常時参照 |

---

## スキルとの関係

### `/exam-guide` （1級土木施工管理技士）

- **スキルファイル**: `.claude/skills/content/exam-guide/SKILL.md`
- **参照テンプレート**: `templates/exam-guide/civil-construction-1.md`
- **記載例**: SKILL.md の末尾に以下を記載

  ```markdown
  ## テンプレート設定ファイル
  
  このスキルで使用する試験固有設定：
  → `.claude/skills/content/templates/exam-guide/civil-construction-1.md`
  
  **Phase 2**: `--exam civil-construction-1` パラメータ化予定
  ```

### `/pe-exam-guide` （技術士建設部門）

- **スキルファイル**: `.claude/skills/content/pe-exam-guide/SKILL.md`
- **参照テンプレート**: `templates/exam-guide/pe.md`

### （未実装）新資格のガイド生成

- 新資格（例：コンクリート技士）の対策ガイドが必要になったら：
  1. `templates/exam-guide/concrete-engineer.md` を新規作成
  2. スキル側の変更は **不要**（または最小限）
  3. Phase 2 汎用化時に統合

---

## テンプレートの同期ルール

変更追跡のためのチェックリスト：

- [ ] 試験主催機関が科目構成を変更 → 該当する `.md` ファイルの `exam_structure` セクションを更新
- [ ] 新しい公開情報源が追加 → `external_sources` セクションを更新
- [ ] ソースコンテンツの配置が変わった → `source_paths` セクションを更新

---

## 参照リンク

- URL設計ガイドライン: `docs/00_プロジェクト管理/07_URL設計ガイドライン.md`
- スキル一覧: `.claude/reference/skills-registry.md`
- 各スキルの詳細: `.claude/skills/content/{skill-name}/SKILL.md`
