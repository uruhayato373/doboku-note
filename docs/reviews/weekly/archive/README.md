# 週次 PDCA アーカイブ (〜 2026-W16)

2026-W17 以降の週次 PDCA は **GitHub Issue** `[PDCA] YYYY-Www`（label: `weekly-pdca`）に一本化されています。本ディレクトリは 2026-W16 以前の旧 md ファイルを保全するための archive です。

## なぜ Issue に切り替えたか

- open/close 状態のある情報（未完了アクション・翌週への申し送り）が md に埋もれて棚卸しが起きなかった
- GitHub UI で一覧・検索・クローズできる Issue のほうが「課題と TODO の一元化」に適する
- 詳細: [.claude/reference/docs-issue-separation.md](../../../.claude/reference/docs-issue-separation.md) の「週次 PDCA Issue 運用」

## 過去の週次 PDCA を探すには

- `gh issue list --label weekly-pdca --state all` で Issue を一覧
- 本 archive ディレクトリの md を直接読む（W16 以前のみ）
