# 総監 冒頭パック CTA 除去 2 本の note ライブ反映 — 引き継ぎ

作成 2026-09-15 / 起点は PR #510（merge commit `077860ca`）

> [!important] ソースだけ直った状態
> `article.md` から `<!-- cta:pack-top -->` ブロックを除去したが、live note の本文にはまだ
> 残っている。ライブ反映には note ログイン済みの Playwright プロファイルが要るため、
> ローカル環境での実行が必要。

---

## 1. 何を直したか

`audit-note-funnel` の review 候補（非ゲート）4 件を意味判定し、トピック不一致の 2 本から
冒頭パック CTA（記述式コアパック推し）を除去した。`cta:pack-top-light`（もくじへの軽量 CTA）は残置。

| 記事 | noteId | 判定理由 |
|---|---|---|
| 総監コスト公務員版 | `n6461ec60bd03` | キャリア/コスト判断系。親記事「総監受験コスト比較」は既に除外済みで子だけ残っていた |
| 公務員の総監学習設計 | `nc7d70c92b8b0` | 入口ロードマップ系。`pack-top-light` と二重掲出だった |

`.claude/config/note-funnel.json` の `tankan.topCtaExcludeDirs` に両 dir を追加済み（再混入は D6 が検知）。
白書R7完全対応集・総監マガジンの歩き方は CTA 適合と判定して現状維持。

どちらも `notePricing: free`。有料境界・PDF 添付の考慮は不要。

---

## 2. 残作業 — ライブ反映の手順

前提: `git checkout develop && git pull origin develop`（`077860ca` 以降）

1. **ドリフト確認** — `npm run audit-note-funnel -- --live`
   D5（ライブ未反映）にこの 2 本が出る。
2. **spec 生成** — `npm run build-note-funnel-partial-specs -- --base d16a0fbe^ --exam tankan`
   `d16a0fbe^` は CTA 除去前＝ live と同じ状態のコミット。管理ブロックだけを diff して
   `.tmp/note-funnel-partial/tankan-*.json` と `tankan.list.txt` を生成する。削除なので
   operation は `replaceTopCta`（`newText` 空）。
   **生成 spec が 2 件か必ず確認する** — `--base` が古いと間の tankan 記事も拾う。余分は list から外す。
3. **dry-run** — `npm run note-update-partial -- --list .tmp/note-funnel-partial/tankan.list.txt`
   read-only。エディタを触らないので note の下書き自動保存を汚さない。
4. **反映** — 同コマンド + `--commit`。更新通知は「いいえ」。途中停止時は `--start N` で再開。
5. **完了確認** — `npm run audit-note-funnel -- --live` の **D5 が 0 件**。
   公開本文から `m6e7de5e4ea3d`（記述式コアパック）の URL が消え、もくじリンクだけ残ることを確認する。

> [!warning] `note-update-body` は使わない
> 全文置換は live の PDF 添付を消す。今回は部分更新の `note-update-partial` が正しい手段。
> 詳細 → [note-funnel-architecture.md](../../.claude/knowledge/reference/note-funnel-architecture.md)

---

## 3. あわせて直したこと

`tests/admin-document-store.test.mjs` の ROOTS 期待値に `/strategy/policy` を追加。
共通方針ページ追加で 5 番目の root が入ったのに期待値が 4 件のままで、`develop` の
unit-tests が 7 run 連続で赤だった（最後の緑は `864b933b`）。本件とは無関係だが、
PR #510 の CI を緑にするために同梱した。
