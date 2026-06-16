---
name: audit-note-funnel
description: note 導線（ファネル）の資格別 3 層モデル（L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA）のドリフトを監査・修復する。公開記事の CTA 欠落・公開マガジンの L2 未収録・L2 の L1 未リンクを検出し、冪等スクリプトで配線する。Use when user says "note導線の見直し", "もくじ整備", "CTA配線", "ファネル監査". 真実源は docs/reference/note-funnel-architecture.md。
disable-model-invocation: false
user-invocable: true
argument-hint: "[--exam tankan|pe-construction|civil] [--apply] | --semantic"
---

# /audit-note-funnel — note 導線の監査・修復

note 記事・マガジンの**回遊と購入の動線**（資格別 3 層モデル）を定期的に見直し、ドリフトを修復するスキル。真実源は [docs/reference/note-funnel-architecture.md](../../../../docs/reference/note-funnel-architecture.md)、機械可読 config は `.claude/config/note-funnel.json`。

## 3 層モデル（要約）

- **L1** 全資格サイトマップ `共通/コンテンツ総合案内`（プロフィール固定）→ 各 L2 へ
- **L2** 資格別もくじ `{試験}/もくじ`（無料＋有料＋パック）→ その資格の記事・マガジン
- **L3** 記事内 CTA（冒頭=パック／末尾=同資格 L2）。冪等マーカー `cta:pack-top` / `cta:{exam}-mokuji`

**原則**: 資格別セグメント（他資格へ送らない）／冒頭=買う・末尾=回遊／追加のみ（既存非破壊）。詳細は真実源を参照。

## フロー

### 1. 機械監査（ドリフト検出・read-only）

```bash
npm run audit-note-funnel
```

検出: D1 公開記事の CTA 欠落 / D2 公開マガジンの L2 未収録 / D3 L2 の L1 未リンク / D4 L2 URL 不一致。CI ゲートは `npm run check-note-funnel`（ドリフトで exit 1、`r2-audit.yml` で発火）。

### 2. 修復

- **L3 CTA 欠落（D1）** → `npm run wire-note-funnel-cta -- --exam <key> --apply`（冪等・既存非破壊。まず `--apply` なしで dry-run）
- **マガジン未収録（D2）** → 該当 L2 もくじ `article.md` に当該マガジンのリンクを追記
- **L1 未リンク（D3）** → L1 `共通/コンテンツ総合案内/article.md` の該当資格セクションに L2 リンクを追記
- 修復後は **公開済み記事/もくじは `publish-note --update` で live 反映**（ソース編集だけでは反映されない）

### 3. 意味的監査（任意・`--semantic`）

`note-funnel-auditor` エージェント（Evaluator・sonnet）を呼び、もくじの構成・CTA 文面の関連性・回遊の質を採点させる。機械監査で拾えない「並び順がおかしい」「CTA 文が記事内容とズレる」を surface する。修正は親（Opus）またはユーザーが行う。

## 新規 L2 を増やす標準手順

真実源 [note-funnel-architecture.md](../../../../docs/reference/note-funnel-architecture.md)「標準フロー（新規 L2 を増やすとき）」を参照。要点: もくじ記事作成 → カバー/ハッシュタグ → `publish-note --free`（Phase 4.5 目次）→ config に noteId/CTA 文面記入 → L1 へリンク → `wire-note-funnel-cta --apply` → `audit-note-funnel` でゼロ確認。

## 見直しサイクル

- 新規マガジン/記事公開時・週次レビュー（[workflows.md](../../../../docs/reference/workflows.md)）・月次クラウドルーティン（`note-funnel-auditor`）・CI（`check-note-funnel`）。

## 関連

| 関連 | 役割 |
|---|---|
| `note-funnel-auditor` エージェント | 意味的監査（Evaluator） |
| `scripts/audit-note-funnel.mjs` | 機械監査（D1-D4） |
| `scripts/wire-note-funnel-cta.mjs` | L3 CTA 冪等配線 |
| `.claude/config/note-funnel.json` | L1/L2 レジストリ・CTA 文面の機械可読 SSOT |
| `publish-note` スキル | 公開・更新（L2 もくじ／記事の live 反映） |
| `verify-note-magazines` | マガジン URL/価格/公開状態の突合 |
