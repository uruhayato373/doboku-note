---
name: civil-textbook-cycle Round 1
description: 1級土木 textbook/guide 品質サイクル Round 1 — 40件採点完了、gh 認証後に umbrella issue 作成→リライト着手
type: project
originSessionId: c15f12e3-a323-4cf8-ba10-1d7175eb27ff
---
1級土木施工管理技士（civil-construction-1）の textbook/guide ページ（40件）に対する品質サイクル。2026-04-20 に `/civil-textbook-cycle` スキル新設、Round 1 初回採点完了。

**Why**: 運営者が textbook/guide 品質を継続的にサイクル化したい旨、総監 CEM 側（`/quality-cycle`）と同様の仕組みを civil 側にも敷きたい（ハーネス一貫性）。

**How to apply**: 次セッションでユーザーが `/civil-textbook-cycle` や「1級土木の品質」関連を話題にしたら、**最初に `.claude/state/session-handoff-civil-textbook-cycle.md` を Read すること**。そこに現在位置と次の作業（Step 1: gh auth login → Step 2: `--mode issue --create` → Step 3: guide 6件から順次リライト）が明記されている。

**重要な数値**（2026-04-20 時点）:
- 平均 weighted 2.35、合格30件/要修正11件/満点9件
- リライト候補 11件（guide 6 + textbook 5、全て weighted < 2.5）
- 弱点軸頻度: reference 11 / mobile 6 / figures 2
- guide 6件は全て mobile+reference 両軸 0 点（同一テンプレ起因）

**未コミット**: スキル実装・エージェント・採点結果 JSON・issue draft・本 handoff ファイルが未コミット。2段階コミット推奨（feat: スキル + content: 採点結果）。

**gh CLI 状態**: `C:\Program Files\GitHub CLI\gh.exe` にインストール済みだが bash PATH 外・認証未済。ユーザー本人が `gh auth login` を1回実行する必要がある。
