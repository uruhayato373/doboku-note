---
name: deploy
description: >
  develop→mainブランチ経由でCloudflare Pagesにデプロイする。Use when user asks to [デプロイ, 本番反映, /deploy].
domain: ops
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

### Step 5: main へ昇格して本番を確かめる

```bash
npm run deploy:main              # 昇格先だけ見るときは -- --dry-run
```

`scripts/deploy-main.mjs` が次を 1 回で行う。**exit 0 は本番の確認まで通ったときだけ**で、途中の失敗で止まる。手でコマンドをつながない（2026-11-05、push の失敗の後も本番確認が旧版に対して緑を出した）。`main` への直接 push は `check-shell-traps` フックが止める。

1. develop の検査を待つ。最新の検査が赤なら古い緑へ逃げず止める。検査の無い bot の `[skip ci]` commit は飛ばす
2. merge commit を `checkout` なしで作る（作業ツリーと並行セッションに触らない。main が develop の子孫にならないので `--ff-only` は構造的に失敗する）
3. push し、終了コードではなくリモートの main の実体で成否を決める。先に main が進んでいたら作り直す
4. その commit のデプロイの起動を確かめて完了を待つ。失敗ならログの末尾を出して止まる
5. `npm run check-production-ssr` を実行する

exit 1 や exit 2 で止まったら、原因を直して同じコマンドをもう一度実行する。

判定はスクリプトが持つ。**手打ちの curl で代用しない**（下の 2 つの誤読を機械で潰してある）:

- exit 0 … 200 かつ `<main` あり かつ主要キーワードあり
- exit 1 … 実際に壊れている（200 でない / `<main` 0 / キーワード 0）
- exit 2 … **検査不成立＝接続できていない**（HTTP 000 または既知の社内プロキシ・ブロック HTML）。合格でも不合格でもない

> [!warning] `--noproxy` を付けない（2026-08-27 の踏み間違い）
> 会社 PC で `curl --noproxy '*'` を付けるとプロキシを自分で外すことになり、外部へ出られず
> `HTTP 000 / <main 0 件` が返る。これを「デプロイ失敗・SSR 破壊」と報告しかけた。
> **接続できていないことは、サイトが壊れている証拠ではない。**
> スクリプトは `--ssl-no-revoke` 付き curl を使い、000 と社内プロキシが返す「ブロックされました」HTML（503）を exit 2（検査不成立）として区別する。

> [!note] `<main>` で完全一致 grep しない（2026-08-05 是正・スクリプトに内蔵済み）
> 実際の出力は常に class 付き（`<main class="flex-grow">` 等）なので、完全一致は
> **構造的に必ず 0 になる＝偽赤**。開きタグの前方一致で数える。

- 500 の場合 → Cloudflare API token 期限切れを仮説1番に確認（GitHub Secrets で再発行）
- `<main` が 0 → SSR 壊れ。ユーザーに即報告し .claude/todo/backlog.md に起票
- ローカルで exit 2 の場合 → その結果をデプロイの成否の根拠にしない。公開後の `cloudflare-deploy.yml` にある SSR 検査結果を確認する。再検査は `gh workflow run cloudflare-deploy.yml --ref main -f verify_only=true`（再デプロイなし）。外部検査の exit 0 を確認して完了報告する。

### Step 6: 完了報告

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
- `deploy:main` の失敗 → 表示された原因を直して再実行し、直せないときだけユーザーに報告
- `--force` は使用しない
