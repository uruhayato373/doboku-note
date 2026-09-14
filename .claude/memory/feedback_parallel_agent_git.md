---
name: 並行エージェント作業時の git 操作ルール
description: 別エージェントが同じリポジトリで並行作業中、想定外のファイル変更を git checkout で復元してはいけない
type: feedback
originSessionId: 558c26df-51d5-4a25-a26d-f4e8914f16e0
---
自分の作業に無関係なファイルを `git checkout` や `git restore` で復元しない。

**Why:** 別ターミナル・別セッションのエージェントが同じリポジトリで並行作業している場合がある。想定外の diff を「エージェントの誤り」と判断して復元すると、別エージェントの正当な作業成果を破壊する（実際に create-svg/SKILL.md の変更を消失させた）。

**How to apply:** `git diff --name-only` で想定外のファイルが出たら、(1) 無視してそのまま残す、(2) `git add` は自分のファイルだけ明示指定する、(3) `git add .` / `git add -A` は使わない。CLAUDE.md「外科的に編集する」セクションにも記載済み。
