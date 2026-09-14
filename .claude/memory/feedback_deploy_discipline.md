---
name: ブランチ運用規律（性質別運用）
description: ドキュメント系は develop 直 push、コード/バルクは PR。真実源は CLAUDE.md「ブランチ運用ルール / 性質別運用ガイド」
type: feedback
originSessionId: 8545c528-e663-455f-a4a4-70d4e317cfe1
---
ブランチ運用の真実源は **CLAUDE.md「ブランチ運用ルール / 性質別運用ガイド」節**。memory は Why の補足のみ。

**ルールの要点（詳細は CLAUDE.md 参照）**:
- ドキュメント改訂・MDX の小修正 → `develop` 直 push（PR 不要）
- バルク content（`/exam-keyword-cycle` 等）→ **既定で `develop` 直 push**（`--pr` 指定時のみ週次 PR）
- コード系（`src/`, `scripts/`, `package.json`, 新規スキル、CI 設定）→ PR 必須（base = `develop`）
- main マージ（= deploy 発火）は `/deploy` 経由でユーザーがタイミング判断
- 例外: 本番障害 hotfix のみ `--base main` 直（merge 後 main → develop 逆 merge）

**判断基準**: 「revert 可能性 5% 以上」「他人/他エージェントとの衝突可能性あり」のいずれかが Yes なら PR、両方とも No なら直 push。

**worktree は例外**: 単独作業では使わない。2 エージェント以上が物理的に同時実行 AND 継続 30 分以上 AND wall-clock 短縮が必要、のすべてを満たすときのみ worktree を作る。量産バッチは remote agent（`/schedule`）を使う（ローカル I/O ゼロ）。

**Why（3 段階）**:

1. *2026-04-21 KaTeX フォント修正事例*: 同一機能（CSS オーバーライド）のデバッグを 3 段階（PR #55/#56 → #57/#58 → #59/#60）に分けて main へ deploy した。各段階で Cloudflare Pages ビルド＋GitHub Actions が費やされ、履歴もノイジー。この事例で「main への小刻み deploy 禁止」を CLAUDE.md でルール化。

2. *2026-04-23 PR 運用見直し*: 個人開発で「全変更を PR」運用が PR/worktree のオーバーヘッド過剰になっていることを確認（並行ブランチ 9+ 本、develop 32 コミット遅延、self-merge ばかりで品質向上効果薄）。性質別運用に切り替え。

3. *2026-04-24 粒度見直し + worktree 例外化*: 「起点過去問 1 問 = 1 PR」の過小粒度 PR 量産で worktree が 3+ 孤児ディレクトリまで蓄積、AV スキャナ負荷で Kernel-Power 41 / BugCheck=0 の OS フリーズを誘発。バルク content も develop 直 push を既定化、worktree は原則使わない運用に変更。

**How to apply**:
- 新規変更を始める前に「ドキュメント系 / バルク content / コード系」を分類する
- ドキュメント系・バルク content は `develop` で直接コミット & push（ブランチ不要）
- コード系のみ feature ブランチ + PR
- CSS・ビルド絡みの変更は `.next` 削除 → dev 再起動 → ブラウザ hard-refresh で実機確認してから deploy
- main への deploy は「ユーザーが視認確認した」または「明示的に deploy 指示」のタイミング
- 並行量産したい場合は `/schedule` で remote agent を使う（worktree ではなく）
