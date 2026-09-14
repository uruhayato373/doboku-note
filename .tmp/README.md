# .tmp/ — 一時出力置き場

- 破棄可能な新規出力は `.tmp/scratch/` へ。日次の `disk-hygiene:fix` は共有クリーナーで7日超を判定する。追跡ファイル・登録アセット・リンク・nested Git・検査不成立を保護する。
- `.tmp/` 全域を日数だけで削除しない。原本・採用画像・引き継ぎ成果物は正規の置き場へ移す。
- 手動確認は `npm run resources:clean -- --category scratch`（既定dry-run）、削除は `--commit`。`prune-tmp.mjs` も同じ互換入口で、既定では削除しない。
- git worktreeは `.claude/worktrees/`（Claude）か `~/.codex/worktrees/`（Codex）へ。ここへの配置は `npm run check-disk-hygiene` が検出する。
- 運用の正典: [disk-hygiene.md](../.claude/knowledge/reference/disk-hygiene.md)。Git追跡はこのREADMEと `.gitkeep` のみ。
