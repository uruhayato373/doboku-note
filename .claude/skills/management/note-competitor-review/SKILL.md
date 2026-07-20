---
name: note-competitor-review
description: >
  note 競合（土木・建設系試験対策）の価格・品揃え・ポジショニングを四半期で再取得し、
  前回比ドリフト（値上げ/新商品/休眠/新規参入）を機械検出したうえで差別化を再評価し、
  09_note競合分析2026.md への反映パッチまで出すレビュー。scout-note-competitors（機械取得＋
  時系列＋drift）→ note-competitor-analyst（意味評価＋09パッチ）→ ユーザー承認で 09 へ適用、の
  3段。有料本文は paywall で取得不可（タイトル/価格/スキ数まで）。価格変更・記事執筆はしない。
  Use when user asks to [競合を再調査, note競合レビュー, 競合の価格を再取得, 競合分析を更新, /note-competitor-review].
user-invocable: true
---

## 用途

note 上の競合クリエイターの**公開データ（マガジン/単品記事/価格/スキ数/更新頻度）を再取得**し、前回スナップショットからの変化を起点に差別化ポジションを再評価する。四半期サイクル（09 の「競合の再調査は四半期ごと」に対応）。`npm run check-competitor-scan-due` が DUE を返したとき、または重要な競合の動きを察知したときに回す。

真実源: [09_note競合分析2026.md](../../../../docs/project/01_戦略/09_note競合分析2026.md)。手順の背景は [note-api-verification.md](../../../../docs/reference/note-api-verification.md)（会社 PC プロキシ・`curl --ssl-no-revoke`）。

## 手順

### 1. 機械取得（scout）

```bash
npm run scout-note-competitors              # config 12社・単品直近5ページ・時系列保存＋前回比drift
# 深掘りが要るとき:
npm run scout-note-competitors -- --note-pages 20   # 単品を直近20ページまで
npm run scout-note-competitors -- --contents        # 各有料マガジンの収録記事も
```

- 出力: `.claude/state/note/history/competitors-YYYY-MM-DD.json`（時系列 SSOT・コミット）＋ `.claude/state/note/competitors-snapshot.json`（最新ポインタ）。
- コンソール末尾の**「前回比ドリフト」**を必ず読む（value 改定・新商品・休眠・新規参入）。
- 新しい競合を足すときは `.claude/config/note-competitors.json` に `{handle,label,exams,note}` を追記（handle は note ユーザー検索 API `api/v3/searches?context=user&q=` で urlname を確認）。

### 2. 意味評価（analyst）

`note-competitor-analyst` サブエージェントに最新スナップショットを渡す（親が事前に手順1を実行済みであること）。

- 入力: `.claude/state/note/competitors-snapshot.json`（`drift[]` を起点に）、参照 `docs/project/01_戦略/09_note競合分析2026.md`・`src/lib/note-magazines.ts`（自社実価格）。
- 出力: 4観点（ポジショニング/価格対比/品揃えギャップ/脅威と代替軸）＋**「09 反映パッチ」＝そのまま貼れる節別更新文案**。
- audit-only（取得・価格変更・09 への直接書込みはしない）。

### 3. 反映（ユーザー承認 → 親が適用）

- analyst の「09 反映パッチ」を**ユーザーに提示**し、承認を得てから親が `docs/project/01_戦略/09_note競合分析2026.md` を Edit で更新する。
- **鉄則（現物照合）**: 自社価格を書くときは `note-magazines.ts` を Read して file:line で裏取り（09 は判断記録・実価格の真実源ではない）。裏取りできない主張は confidence:low か「未確認」。
- 価格の**変更提案**が出た場合も、確定は `note-magazines.ts` ＋各 noteコンテンツ計画.md 側の判断（本レビューは「妥当性の評価」まで）。

## 安全弁

- **取得は公開ページのみ**（認証不要・creds 不要）。会社 PC ではプロキシ経由で note.com に到達（`curl --ssl-no-revoke`・scout が内蔵）。計測 API のローカル禁止とは別（[measurement-incidents.md](../../../../docs/reference/measurement-incidents.md)）。
- **有料本文は取得しない/できない**（paywall）。中身の質は「未読」扱いで断定しない。
- **新規クラウドルーティンは作らない**。定期性は (1) `npm run check-competitor-scan-due`（weekly-review Agent B が surface）＋ (2) `docs/todo/annual.md` の四半期タスク で担保する。

## 関連

- Generator/機械: `scripts/scout-note-competitors.mjs`・`scripts/check-competitor-scan-due.mjs`
- Evaluator: `note-competitor-analyst`（[agents-registry.md](../../../../docs/reference/agents-registry.md)）
- config: `.claude/config/note-competitors.json`（競合ハンドル SSOT）
