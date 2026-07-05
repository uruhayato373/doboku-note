---
name: audit-note-funnel
description: note 導線（ファネル）の資格別 3 層モデル（L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA）のドリフトを監査・修復する。ソース監査（D1-D4＝CTA 欠落・L2 未収録・L1 未リンク）に加え --live でライブ反映（D5＝配線後に再投稿せず live が死ぬドリフト）を検出し、wire-note-funnel-cta（ソース配線）／note-append-cta（公開済み記事へ live 反映）で修復する。Use when user says "note導線の見直し", "もくじ整備", "CTA配線", "ファネル監査". 真実源は docs/reference/note-funnel-architecture.md。
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

**スコープ注意**: 機械監査 D1-D5 は `magazines/` 配下（有料単品記事）を**除外**する。有料単品の冒頭カード回遊はソースへ直挿し＋`note-append-cta` で個別維持する（真実源 原則9）。1 資格に 1級／2級 等のサブ資格が同居する場合、冒頭パックは config の `topCtaOverrides`（`[{dirPrefix,marker,text}]`）でディレクトリ接頭辞ごとに向き先を差し替える（真実源 原則8。例: civil `2級土木/` → 2級バンク `m8554e87ca6ec`）。

## フロー

### 1. 機械監査（ドリフト検出・read-only）

```bash
npm run audit-note-funnel            # ソース監査（D1-D4・高速）
npm run audit-note-funnel -- --live  # ＋ライブ反映検証（D5）
```

検出: D1 公開記事の CTA マーカー欠落（ソース）/ D2 公開マガジンの L2 未収録 / D3 L2 の L1 未リンク / D4 L2 URL 不一致 / **D5 公開記事の CTA が live note に未反映（`--live` のみ・note API body+embedded で機械検証＝「ソースは正でも配線後に再投稿せず live が死ぬ」ドリフトを検出。2026-06-18 に総監19本で実害化）**。CI ゲートは `npm run check-note-funnel`（**ソース D1-D4** のみ・exit 1、`r2-audit.yml`）。D5 は network 依存で低速のため CI 非対象＝月次/手動で回す。

### 2. 修復

- **L3 CTA 欠落（D1）** → `npm run wire-note-funnel-cta -- --exam <key> --apply`（冪等・既存非破壊。まず `--apply` なしで dry-run）。**先頭 UTF-8 BOM 付き記事も 2026-07-05 以降は自動除去して配線する**（旧版は BOM で `^---` 非マッチ→`NO-FM` 無音スキップだった）。`NO-FM` が出たら該当ファイルの先頭バイトを確認（`head -c6 … | od -c`）
- **マガジン未収録（D2）** → **(a) ソース**: 該当 L2 もくじ `article.md` の有料マガジン節に当該マガジンの markdown リンクを追記（もくじは `noteSeries: 総合案内` ＝ index 例外で markdown リンク可・価格は書かない）。**(b) ライブ反映**: `npm run note-append-list-links -- --spec <json> [--commit]`（`sections[].anchorMagId` で追加先 `<ul>` を特定し末尾へインラインリンク `<li>` を挿入。type ではインラインリンクが作れないための専用ツール＝update-mode.md 手段2b）。まず dry-run で DOM 検証→`--commit`→API 実査
- **L1 未リンク（D3）** → L1 `共通/コンテンツ総合案内/article.md` の該当資格セクションに L2 リンクを追記
- **ライブ未反映（D5）** → **`npm run note-append-cta`**（Playwright・Windows 可・browser-use 不要）で公開済み記事へ CTA を live 反映。`--after`=free プレビューへアンカー挿入／`--before-first-h2`=最初のH2直前へ挿入／`--keep-boundary`・`--boundary-h2`=有料記事の paywall 境界を保持／**更新通知は必ず「いいえ」を自動クリック**。または `publish-note --update`（type 追記）。**D5 判定は `audit-note-funnel.mjs` が topCta 本文の先頭 URL（`topTargets[0]`）が live body にあるかで見る**（tankan=R8予想 `m6854c7437d4d`／civil=完全攻略パック `m8290970a7f05`。ログの「(コアパック)」ラベルは総称）。詳細 → [publish-note/references/update-mode.md](../publish-note/references/update-mode.md)
- 修復後は **公開済み記事/もくじはソース編集だけでは live に反映されない**＝必ず `note-append-cta`（記事 CTA）／`note-append-list-links`（もくじのマガジン項目）／`publish-note --update` を回し、`audit-note-funnel --live` で D5 が消えるところまでがクローズ条件

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
| `scripts/audit-note-funnel.mjs` | 機械監査（D1-D4 ソース ＋ `--live` で D5 ライブ反映） |
| `scripts/wire-note-funnel-cta.mjs` | L3 CTA をソースへ冪等配線 |
| `scripts/note-append-cta.mjs`（`npm run note-append-cta`） | 公開済み記事へ CTA を live 反映（D5 修復・Windows 可・通知いいえ） |
| `scripts/note-append-list-links.mjs`（`npm run note-append-list-links`） | 公開済みもくじの既存 `<ul>` へインラインリンク項目を live 追加（D2 ライブ反映・spec JSON 駆動・insertAdjacentHTML 方式） |
| `.claude/config/note-funnel.json` | L1/L2 レジストリ・CTA 文面の機械可読 SSOT |
| `publish-note` スキル | 公開・更新（L2 もくじ／記事の live 反映） |
| `verify-note-magazines` | マガジン URL/価格/公開状態の突合 |
