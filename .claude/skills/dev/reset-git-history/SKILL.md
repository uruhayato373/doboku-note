Git 履歴をリセットして `.git` を軽量化する。

## 概要

`.git` が肥大化した場合（過去に大きなバイナリをコミットした等）、
現在の状態だけを保持した新しいリポジトリに作り直し、リモートに force push する。

## いつ使うか

- `.git/` のサイズが 1GB を超えた場合
- `du -sh .git/` で確認

## 前提条件

- リモート（GitHub）が最新の状態であること
- 自分だけが使うリポジトリであること（他のクローンが壊れるため）
- 未コミットの変更がないこと（`git status` がクリーン）

## 手順

### 1. 事前確認

```bash
du -sh .git/                  # 現在の .git サイズ
git status                    # 未コミットの変更がないことを確認
git remote -v                 # リモート URL を確認
```

### 2. .gitignore の確認

以下が `.gitignore` に含まれていることを確認する。
含まれていない場合は追加してから実行すること。

```
node_modules/
**/.next/
.turbo
.local/
.git-old/
.cursor/
```

### 3. Git リポジトリを再作成

```bash
# 古い .git をバックアップ（push 成功後に削除）
mv .git .git-old

# 新しいリポジトリを作成
git init
git add -A

# 不要ファイルが含まれていないことを確認
git ls-files --cached | grep -cE '\.git-old|\.next/|\.turbo/|node_modules/'
# → 0 であること

# コミット
git commit -m "Initial commit"

# サイズ確認
du -sh .git/
```

### 4. リモートに push

```bash
git remote add origin git@github.com:uruhayato373/stats47.git
git push --force origin main
```

### 5. クリーンアップ

```bash
# push 成功を確認後、古い .git を削除
rm -rf .git-old
```

### 6. develop ブランチの再作成（必要な場合）

```bash
git checkout -b develop
git push -u origin develop
```

## 注意事項

- **全てのコミット履歴が消える**（元に戻せない）
- **リモートへの force push が必要**
- `.gitignore` 対象ファイル（`.local/`, `node_modules/` 等）はディスク上に残る（影響なし）
- リモートの古いブランチ・PR は無効になる

## 参照

- `.gitignore` — 除外パターンの定義
