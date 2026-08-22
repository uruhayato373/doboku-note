---
name: deploy
description: >
  develop→mainブランチ経由でCloudflare Pagesにデプロイする。Use when user asks to [デプロイ, 本番反映, /deploy].
---

Cloudflare Pages へデプロイする。

## ブランチ戦略

```
作業ブランチ → develop → main → GitHub Actions → Cloudflare Pages
```

## 前提

- 変更がすべてコミット済みであること

## 手順

### Step 1: 事前チェック

```bash
git branch --show-current
git status
gh secret list | grep -i cloudflare   # token が登録されているか（deploy 500 の主因は期限切れ）
```

- 未コミットの変更がある場合 → ユーザーに確認
- 現在のブランチを記録しておく

### Step 2: develop にマージ

```bash
# develop ブランチに切り替え
git checkout develop

# develop を最新に
git pull origin develop

# 作業ブランチをマージ（fast-forward できない場合はマージコミット）
git merge {作業ブランチ}
```

- コンフリクトが発生した場合 → ユーザーに報告し、解消を支援

### Step 3: ビルド確認

```bash
npm run build
```

ビルドが失敗した場合はユーザーに報告し、続行するか確認する。

### Step 4: develop を push

```bash
git push origin develop
```

### Step 5: main にマージ

```bash
git checkout main
git pull --ff-only origin main
git merge --no-edit develop
```

- コンフリクトが発生した場合 → ユーザーに報告し、解消を支援
- **`--ff-only` は使わない**: main は PR の squash/merge コミットを持つため develop の子孫にならず、
  fast-forward は構造的に失敗する（`fatal: Not possible to fast-forward`）。マージコミットが正。
- **`npm run build` は生成インデックス（`src/config/*.json` の `generated_at` / `dateModified`）を
  書き換える**。これは CI のビルドで再生成されるノイズなので、main へ直接コミットせず破棄してから
  マージする（`git checkout -- src/config/<該当ファイル>`・中身が timestamp 差分だけであることを確認してから）。

### Step 6: main を push（デプロイ開始）

```bash
git push origin main
```

GitHub Actions の `cloudflare-deploy.yml` ワークフローが自動でトリガーされる。

### Step 7: 元のブランチに戻る

```bash
git checkout {作業ブランチ}
```

### Step 7.5: 本番 SSR 検証

**注意**: 検証は `.pages.dev`（デプロイ直後のビルド成果物）で行う。`doboku-note.com`（Cloudflare 経由の本番ドメイン）でも可だが、Cloudflare のキャッシュ反映ラグや（設定変更時の）Bot 保護の影響を避けるため `.pages.dev` を一次確認に使う。なお 2026-06-12 時点では `doboku-note.com` は `curl` 既定 UA・`facebookexternalhit` 等の bot UA でも 200 を返す（旧記載「bot で必ず 403」は実測と不一致＝Bot Fight Mode は現状緩和。外部 Validator の IP ベース挑戦は別問題で残りうる→ [measurement-incidents.md](../../../../.Codex/knowledge/reference/measurement-incidents.md) 2026-04-25）。

```bash
# HTTP ステータス確認
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://doboku-note.pages.dev)
echo "HTTP Status: $HTTP_STATUS"

# <main> タグ + 主要キーワード確認
# ★ `<main>` で grep しない。実際の出力は常に class 付き（`<main class="flex-grow">` 等）で
#   **構造的に必ず 0 になる＝偽赤**。開きタグの前方一致で数える（2026-08-05 是正）。
curl -s https://doboku-note.pages.dev | grep -c "<main"
curl -s https://doboku-note.pages.dev | grep -o "<main[^>]*>" | head -1   # 実体を目視
```

- HTTP 200 かつ `<main` が 1 以上 → 正常
- 500 の場合 → Cloudflare API token 期限切れを仮説1番に確認（GitHub Secrets で再発行）
- `<main` が 0 → SSR 壊れ。ユーザーに即報告し .Codex/todo/ に起票

### Step 8: 完了報告

以下を報告する:
- マージ・push 結果
- GitHub Actions のワークフロー URL（`gh run list --limit 1` で取得）
- エラーがあった場合はその内容

## 手動デプロイ（CI/CD を使わない場合）

```bash
npm run build
npx wrangler pages deploy out --project-name=doboku-note
```

## エラー時の方針

- ビルド失敗 → ユーザーに確認し、修正 or 中止
- マージコンフリクト → ユーザーに報告し、解消を支援
- push 失敗 → ユーザーに報告
- `--force` は使用しない
