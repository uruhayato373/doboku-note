---
title: Skills 設計チェックリスト
---

# Skills 設計チェックリスト

Anthropic 公式「Skills Best Practices Guide」（`.claude/pdfs/guide.pdf`）の要点をこのプロジェクト向けに凝縮したチェックリスト。**新規スキル・エージェントを作成するとき、および既存のものをレビューするとき**にここを開く。詳細は必ず原典 PDF を参照。

## いつ読むか

- 新規スキル・エージェントを作成するとき
- 既存スキル・エージェントの description を書き直すとき
- `/review` や `skill-creator` 系の改修をするとき
- `.claude/` の定期的な棚卸しを行うとき

---

## 1. 必須の frontmatter 構造

**すべてのスキルとエージェントは、ファイル先頭に以下を持たなければならない**:

```yaml
---
name: kebab-case-name
description: >
  [何をするか（1〜2 文）]。[どんなときに使うか、具体的な条件]。
  Use when user asks to [具体的なトリガーフレーズ, 別のトリガーフレーズ, /slash-command].
---
```

### name フィールド（Critical）

- **kebab-case のみ** — `my-skill` ✓ / `my_skill` ✗ / `MySkill` ✗ / `My Skill` ✗
- **スペース・大文字・アンダースコア禁止**
- **ディレクトリ名と完全一致**（例: `.claude/skills/quality/check-mdx/` → `name: check-mdx`）
- `claude` または `anthropic` を含む名前は禁止（予約語）

### description フィールド（Critical）

- **最大 1024 文字**
- **必須の 2 要素**: 「何をするか（WHAT）」と「いつ使うか（WHEN）」
- **トリガーフレーズを具体的に含める**: ユーザーが実際に口にしそうな言葉を複数記載
  - ✓ `Use when user asks to [MDX 検査, lint MDX, 構文チェック, /check-mdx]`
  - ✗ `Helps with SEO.`（抽象的すぎる・トリガー無し）
- **必要ならファイル種別を明記**: `PDF ファイルを受け取る`、`MDX を編集する`、等
- **曖昧な表現を避ける**: `Helps with...` ✗ / `Implements...` ✗ / `Creates sophisticated multi-page...` ✗

### frontmatter で禁止されている文字

- **XML angle brackets `<` `>` 禁止**（プロンプトインジェクションのリスク）
  - ただし YAML の folded scalar 指示子 `description: >` は許容（文字列値の中に `<` が来ない限り問題なし）
- **インラインの HTML タグ禁止**: `<script>` `<div>` 等を description に入れない

---

## 2. ファイル構成（progressive disclosure 3 層）

ガイドの核心原則:

```
my-skill/
  SKILL.md          ← 必須・本体（5000 words 以下推奨）
  scripts/          ← オプション・実行可能コード
    do-thing.py
  references/       ← オプション・詳細ドキュメント（SKILL.md から参照される）
    detailed-spec.md
  assets/           ← オプション・テンプレート・フォント・アイコン
```

### 第 1 層: frontmatter

- Claude が「このスキルを load すべきか」を判断するための最初の情報
- 常に context に入る → 短く・正確に

### 第 2 層: SKILL.md 本体

- 必要になった時のみ読み込まれる
- **5000 words 以下に保つ**
- Markdown で書く、インストラクション中心
- 超えた場合は詳細を `references/` に分離

### 第 3 層: references/ と scripts/

- さらに必要になった時のみ読み込まれる
- SKILL.md から明示的に「詳細は `references/api-patterns.md` を参照」とリンクする
- 巨大な表・仕様書・サンプルコードはここに置く

### doc パス参照の規律（壊れ参照の再発防止）

SKILL.md / references から docs を参照するときは [information-architecture.md](information-architecture.md)「SSOT と参照規律」に従う:

- 章番号付きの揺れやすいパスより、安定したインデックス（README・本ガイド）か内容 SSOT を指す
- 例示パスはプレースホルダ（`{slug}` / `YYYY-Www` / `r0X` / `d-xx` 等）で書く（実在参照と区別、ガード誤検知を避ける）
- スキルが参照する doc を移動・リネームしたら、同一 commit で参照を更新し `npm run check-doc-refs` で検証（pre-commit でも staged を自動検査）

---

## 3. SKILL.md 本体の推奨構造

```markdown
---
name: ...
description: ...
---

## 用途
[このスキルの存在理由を 1 段落]

## 引数
[CLI flags や parameters を表で]

## 実行手順
### ケース 1: [典型シナリオ]
具体的な手順とコマンド

### ケース 2: [別のシナリオ]
...

## 例
[具体的な使用例 2〜3 件]

## トラブルシューティング
[よくあるエラーと対処]

## 参照
[関連スキル・関連ドキュメント]
```

**ベストプラクティス**:
- **Be specific and actionable** — 「データを検証する」ではなく「`python scripts/validate.py --input {file}` を実行する」
- **Include error handling** — よくあるエラーと対処を明記
- **Use progressive disclosure** — 詳細は `references/` に分離して SKILL.md からリンク
- **Examples of good descriptions** は原典 PDF p.11 を参照

---

## 4. description のアンチパターン集

### 悪い例 1: 抽象的すぎる
```yaml
description: Helps with projects.
```
→ 何のプロジェクトか、いつ使うのか不明

### 悪い例 2: トリガーフレーズが無い
```yaml
description: Creates sophisticated multi-page documentation systems.
```
→ ユーザーがどう言えば trigger するのか不明

### 悪い例 3: 技術用語だけで use case が無い
```yaml
description: Implements the Project entity model with hierarchical relationships.
```
→ ユーザーから見た価値が見えない

### 良い例
```yaml
description: >
  Analyzes Figma design files and generates developer handoff documentation.
  Use when user uploads .fig files, asks for "design specs", "component documentation",
  or "design-to-code handoff".
```

---

## 5. トリガー設計

### Under-triggering（load しない症状）

**原因**:
- description が短すぎる / 抽象的すぎる
- ユーザーが使う自然な表現を含んでいない

**対処**:
- 具体的なトリガーフレーズを 3〜5 個列挙する
- 専門用語だけでなく口語表現も含める

### Over-triggering（不要な時に load する症状）

**原因**:
- description が広すぎる
- "General-purpose" なキーワードを使っている

**対処**:
- **Negative triggers** を追加: `Do NOT use for simple data exploration (use data-viz skill instead).`
- Scope を絞る: `PDF legal documents for contract review` のように限定

---

## 6. 新規スキル作成時のチェックリスト

### 作り始める前に

- [ ] 2〜3 個の具体的な use case を定義した
- [ ] 既存スキルとの重複を確認した（`docs/reference/skills-registry.md` を grep）
- [ ] guide.pdf の該当 Pattern（1〜5）と照合した
- [ ] 必要なツール（built-in / MCP / script）を洗い出した

### 作成中

- [ ] ディレクトリ名は kebab-case
- [ ] `SKILL.md`（大文字小文字厳密）
- [ ] YAML frontmatter の `---` デリミタがある
- [ ] `name` はディレクトリ名と一致
- [ ] `description` に WHAT + WHEN + トリガーフレーズが全て含まれる
- [ ] XML タグ `<>` が description に無い
- [ ] 指示が具体的かつ実行可能
- [ ] エラーハンドリング・例を含む
- [ ] 5000 words 以下に収まる（超えるなら `references/` に分離）

### 作成後

- [ ] `docs/reference/skills-guide.md` の該当カテゴリに追記（一覧・トリガー）
- [ ] `docs/reference/skills-registry.md` のカテゴリ構造のスキル数を更新
- [ ] 関連スキルの `参照` セクションを更新
- [ ] 実際に 1〜2 件の use case で試してみた
- [ ] 必要なら Claude に「このスキルをいつ使う？」と尋ねて description が正しく解釈されるか確認

---

## 7. Skills Registry への登録ルール

**2 ファイルへの更新が必要**:

| ファイル | 何を追記するか |
|---|---|
| `docs/reference/skills-guide.md` | 該当カテゴリのテーブルに行を追加（スキル / 一言説明 / 呼ぶとき） |
| `docs/reference/skills-registry.md` | カテゴリ構造のスキル数を更新 |

Phase 2 の未実装スキルは `skills-guide.md` の「Phase 2 待機スキル」セクションに分離し、アクティブな一覧と混在させない。退役スキルは `skills-registry.md` の「退役記録」に追記する。

---

## 8. スキル削除時のルール

- `git rm` で削除
- `docs/reference/skills-registry.md` に「退役」として削除日と理由を記載
- 参照元（他スキル・エージェント・ドキュメント）を grep で洗い出して更新
- 代替スキルへのポインタを退役記録に明記

---

## 9. 参考リンク

- **原典 PDF**: `.claude/pdfs/guide.pdf`（The Complete Guide to Building Skills for Claude）
- **スキル早引き**: `docs/reference/skills-guide.md`
- **ガバナンス記録**: `docs/reference/skills-registry.md`
- **Agents Registry**: `docs/reference/agents-registry.md`
- **プロジェクト設計原則**: `CLAUDE.md` の「ハーネス設計原則」セクション

---

## 10. `user-invocable` の付与基準

frontmatter に `user-invocable: true` を付けるのは、以下のいずれかに該当する場合のみ:

- **副作用が大きい**: push、投稿、メール送信など、外部への書き込みが発生する
- **外部 API 費用が発生する**: GA4、GSC、NotebookLM など
- **対話的な入力が必須**: 採点→レポート→次アクション決定など、ユーザー判断を都度挟む

該当しないスキル（lint / review / generate など副作用なし・ローカルのみ）に `user-invocable: true` を付けない。これによりスキル一覧の「ユーザー起動フラグ」が信頼できる状態に保たれる。

---

## 11. このプロジェクト固有のルール

`CLAUDE.md` の「ハーネス設計原則」も必ず参照:

1. **Generator と Evaluator を分離する** — 作る役と評価する役を同じエージェントに担わせない
2. **「何を作るか」を先に合意する** — SKILL.md の変換ルールが完成の定義
3. **主観をルーブリック化する** — 品質は 5 軸ルーブリックで定量評価
4. **ハーネスはできるだけシンプルに保つ** — スキルを増やすより既存スキルのパラメータ化を優先
5. **新モデルが出たらハーネスを見直す** — Opus 4.6 では 1M context により大規模処理が可能
6. **Opus で考え、Sonnet で実行する** — サブエージェントは原則 `model: sonnet`
