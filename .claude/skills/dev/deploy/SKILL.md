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
git pull origin main
git merge develop
```

- コンフリクトが発生した場合 → ユーザーに報告し、解消を支援

### Step 6: main を push（デプロイ開始）

```bash
git push origin main
```

GitHub Actions の `cloudflare-deploy.yml` ワークフローが自動でトリガーされる。

### Step 7: 元のブランチに戻る

```bash
git checkout {作業ブランチ}
```

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
