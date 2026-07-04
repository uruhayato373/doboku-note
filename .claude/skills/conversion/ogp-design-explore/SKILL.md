---
name: ogp-design-explore
user-invocable: true
description: >
  OGP 画像（1200×630）の新しいデザイン方向を aidesigner / Canva の MCP で素案として試作し、
  採用案を satori テンプレート（ogp-create）に落として量産につなげる「意匠の試作専用」スキル。
  量産・本番生成・per-article 生成はしない（それは /ogp-create）。MCP は外部 API 費用（クレジット）が発生するため都度ユーザー判断で起動する。
  Use when user asks to [OGPデザイン検討, OGP意匠の素案, OGPデザイン案を作って, OGPリデザインの試作, サムネのデザイン方向を探りたい, /ogp-design-explore].
---

## 用途

OGP 画像（1200×630）の**見た目の方向性**を、AI デザイン MCP（aidesigner / Canva）で**素案（たたき台）**として試作するためのスキル。配色・レイアウト・タイポの新方向、別テンプレ案、ブランドキット抽出などの「探索フェーズ」を担う。

**量産は必ずコードで行う。** doboku-note の OGP 本番生成は satori ベースの決定論的テンプレート（`/ogp-create`）で 1000 枚超を一括生成しており、テーマ色トークン・CLS・R2 同期・改行戦略が前提。本スキルは「素案 → 採用方向を `/ogp-create` のテンプレに実装 → `npm run ogp` で量産」という流れの**前半（ideation）だけ**を担当し、後半（量産）は `/ogp-create` に渡す。

> Negative trigger: **per-article の OGP を作りたい/全ページ再生成したい場合は本スキルではなく `/ogp-create`**。本スキルで生成した素案 PNG を本番 `ogp.png` として配信しない（決定論・一貫性が崩れる）。

## 前提（MCP の到達性とコスト）

- MCP: 主軸は **aidesigner**（`mcp__aidesigner__*`・`.mcp.json` に登録済み）。**Canva**（`mcp__claude_ai_Canva__*`）は claude.ai コネクタとして接続されている場合のみ利用可（現状は未接続の想定・使う前に接続確認）。いずれも claude.ai OAuth 経由のため**会社 PC のプロキシ（外部 API 遮断）でも到達する**（`curl`/node 直叩きとは別経路）。
- **aidesigner は無料枠でクレジット制限あり**。生成前に必ず `mcp__aidesigner__get_credit_status` を呼んで残量を確認し、**何枚生成してよいかをユーザーに確認**してから着手する（浪費防止）。
- MCP は**ヘッドレス/CI/cron では使えない**可能性が高い（インタラクティブ認証）。本スキルは対話セッション専用。自動パイプラインに組み込まない。

## 実行手順

### Step 1: スコープとコンテキスト収集
1. 対象を決める: ①テンプレ全体の新方向、②特定カテゴリ（資格）の見え方、③特定記事の OGP 案、のどれか。
2. デザイン SSOT と現状を読む:
   - `docs/reference/ogp-prompts.md`（レイアウト・配色・テーマ色・変更履歴の真実源）
   - `docs/design-system/note-cover-tokens.json` の `exams[].base`（資格別テーマ色の真実源）
   - 現行 `ogp.png` を 2〜3 枚 Read（例: `.local/r2/posts/{category}/{localSlug}/ogp.png`）して現状の見た目を把握。一括俯瞰は `npm run ogp-gallery -- --open`。

### Step 2: クレジット確認
```
mcp__aidesigner__get_credit_status   # 残量を確認。残りが少なければ生成回数をユーザーに確認
```

### Step 3: 素案の生成（MCP）
- **aidesigner**:
  - `mcp__aidesigner__create_brand_kit_from_url`（`https://doboku-note.com` 等）でサイトの配色からブランドキットを抽出 → 一貫性のある案の土台にする。
  - `mcp__aidesigner__generate_branding_kit_variations` で 3×3 のブランド案ボードを出し、ユーザーにタイル番号を選ばせてから `create_brand_kit_from_variation` で確定（MCP の運用指示に準拠）。
  - `mcp__aidesigner__generate_image` / `generate_design`（HTML）で 1200×630 想定の OGP コンセプトを生成、`refine_design` で反復。
- **Canva**:
  - `mcp__claude_ai_Canva__generate-design` → `resize-design`（1200×630）→ `export-design`（PNG）。
  - 一貫性を担保したいなら `create-brand-template-draft` / `create-design-from-brand-template`。
- **出力は必ず `.tmp/` 配下**に置く（例: `.tmp/ogp-explore/`）。本番 `.local/r2/posts/**/ogp.png` は上書きしない。

### Step 4: 比較・選定
- 素案を並べてユーザーに提示し、現行テンプレ（mono-tag）・資格別テーマ色との整合で評価。`refine_design` で反復。
- 「ブランド一貫性（資格色で分野が判別できるか）」「外部リンクカードでの可読性（大タイトル）」「note カバー（G2）との見た目整合」を判断軸にする。

### Step 5: コードへの落とし込み（量産は `/ogp-create`）
採用方向が決まったら、**MCP の生成物をそのまま配信せず**、決定論的テンプレに実装する:
1. レンダラを編集: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`（mono-tag 等の satori レンダ関数）。新テンプレを足す場合は `/ogp-create` の「テンプレート追加手順」に従う（`templates.json` / `rules.json` / `ogp-prompts.md` も更新）。
2. デザイン SSOT を更新: `docs/reference/ogp-prompts.md`（レイアウト・配色・**変更履歴**）。テーマ色を変えるなら `docs/design-system/note-cover-tokens.json` の `exams[].base`。
3. 量産＆QA:
   ```bash
   npm run ogp -- --all --force     # 全 ogp.png を新意匠で再生成（/ogp-create）
   npm run ogp-gallery -- --open    # 1 枚の HTML で全点を目視 QA
   ```
4. OGP デザインを変えたら `ogp-prompts.md` と `ogp-create` の SKILL.md/テンプレを**同一コミットで更新**（SSOT 二重化を防ぐ）。

## 例

- 「次の OGP 意匠の素案を 3 案ほしい」→ Step1（ogp-prompts.md＋現行3枚）→ Step2（クレジット確認・3案でよいか確認）→ Step3（aidesigner brand kit→variations→generate_image ×3）→ Step4（提示・選定）→ Step5（mono-tag レンダラに実装→`npm run ogp`）。
- 「総監カテゴリだけ OGP の見え方を変えたい」→ 対象=カテゴリ。テーマ色は `note-cover-tokens.json` の総監 base。素案で配色方向を出し、採用色を tokens に反映→ `/ogp-create` で当該カテゴリを再生成。
- 「Canva で 1200×630 のサムネ案を起こして」→ Canva `generate-design`→`resize-design`(1200×630)→`export-design`。良ければ意匠を mono-tag に移植。

## トラブルシューティング

| 症状 | 対応 |
|---|---|
| aidesigner がクレジット切れ（`entitled:false`・残少） | 生成回数を絞る。Canva 側で試作するか、ユーザーにクレジット追加可否を確認 |
| MCP が応答しない/CI で使えない | 本スキルは対話セッション専用。自動実行・cron では使わない |
| 素案を本番に出してよいか迷う | 出さない。必ず `/ogp-create` の satori テンプレに落として量産（決定論・テーマ色・CLS のため） |
| 生成物がトークンと合わない | MCP 出力はラスタ/概念物。配色をトークン（`exams[].base`）に手で対応付けてからコード実装する |

## 参照

- 量産・本番生成（決定論テンプレ）: `/ogp-create`（`.claude/skills/conversion/ogp-create/SKILL.md`）
- 資格別 AI 背景（背景だけを Gemini で生成・全記事共有）: `npm run ogp-backgrounds`（`scripts/generate-ogp-backgrounds.mjs`）。mono-tag の最背面に敷く下地用。**課金が発生するため実行前にユーザー確認**（`--dry-run` は無料）。意匠の全面試作は本スキル、背景下地だけならこちらが軽量。※**2026-07-02〜、現行の資格別背景は Codex 生成のブランド写真プール**（`.claude/config/ogp/backgrounds/<exam-key>.png`・真実源 [`docs/reference/brand-image-system.md`](../../../../docs/reference/brand-image-system.md)）。この Gemini 生成はレガシー/代替扱い
- デザイン SSOT: `docs/reference/ogp-prompts.md`（レイアウト・配色・テーマ色・変更履歴）
- テーマ色トークン（真実源）: `docs/design-system/note-cover-tokens.json`
- レンダラ実装: `.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`
- 一括目視 QA: `npm run ogp-gallery`
- AI デザイン MCP: `aidesigner`（スキル `/aidesigner` でも起動可）/ Canva（`mcp__claude_ai_Canva__*`）
- スキル設計規約: `docs/reference/skills-design-guide.md`
