---
name: competitor-review
description: >
  土木・建設系試験対策の競合を全チャネル横断（note / X / Instagram / ココナラ / Brain）で
  四半期に再取得し、前回比ドリフト（値上げ/新商品/休眠/新規参入）を機械検出したうえで差別化を
  再評価し、SSOT（09_販売チャネル競合分析.md）への反映パッチまで出すレビュー。scout-*（機械取得＋
  時系列＋drift）→ competitor-analyst（意味評価＋反映パッチ）→ ユーザー承認で doc へ適用、の3段。
  有料本文は全チャネルで取得不可（メタデータのみ）。価格変更・記事執筆はしない。
  Use when user asks to [競合を再調査, 競合レビュー, 競合の価格を再取得, 競合分析を更新, /competitor-review].
user-invocable: true
---

## 用途

競合の**公開データ（価格/品揃え/フォロワー/更新頻度/エンゲージ）を再取得**し、前回スナップショットからの変化を起点に差別化ポジションを再評価する。四半期サイクル。`npm run check-competitor-scan-due` が DUE を返したとき、または重要な競合の動きを察知したときに回す。

`--platform note|x|ig|coconala|brain|all`（既定 all）。真実源: 価格/品揃え軸=[09_販売チャネル競合分析.md](../../../../docs/project/01_戦略/09_販売チャネル競合分析.md)、コンテンツ型/エンゲージ軸=[07_競合調査.md](../../../../docs/project/01_戦略/07_競合調査.md) の SNS競合節。

## 手順

### 1. 機械取得（scout・チャネル別）

```bash
npm run scout-note-competitors                 # note（公開API・curl --ssl-no-revoke・会社PC可）
npm run scout-coconala-competitors              # ココナラ（Playwright・公開プロフィールの販売実績 header + market-research由来の価格・低頻度厳守）
node scripts/scout-x-competitors.mjs            # X（実アカ Playwright・read-only・安全弁必須）
node scripts/scout-ig-competitors.mjs           # IG（自セッション Playwright・read-only・セッション切れ時 best-effort）
node scripts/scout-brain-competitors.mjs        # Brain（公開ページ read-only）
```

- 各 scout の共通 snapshot schema: `{ profile, counts, price(min/median/max/bands), cadence, drift[], platformExtra }`。出力は `.claude/state/{platform}/history/competitors-YYYY-MM-DD.json`（時系列 SSOT）＋ `snapshot.json`（最新ポインタ）
- コンソール末尾の**「前回比ドリフト」**を必ず読む（価格改定・新商品・休眠・新規参入）
- note は `--exam <tag>` で試験別に切れる（部分実行=履歴を汚さない）
- 競合を足すときは対応する `.claude/config/{platform}-competitors.json` に `{handle,label,exams,note}` を追記

### 2. 意味評価（analyst）

`competitor-analyst` サブエージェント（sonnet）に対象チャネルのスナップショットを渡す（親が手順1を実行済みであること）。

- 入力: 各チャネルの `snapshot.json`（`drift[]` を起点に）、参照 09・07・`src/lib/note-magazines.ts`・`src/lib/coconala-services.ts`（自社実価格）
- 出力: 4観点（ポジショニング/価格対比/品揃えギャップ/脅威と代替軸）＋**「反映パッチ」＝反映先SSOT（09 or 07）と節番号を明示したそのまま貼れる文案**
- audit-only（取得・価格変更・doc への直接書込みはしない）

### 3. 反映（ユーザー承認 → 親が適用）

- analyst の反映パッチを**ユーザーに提示**し、承認を得てから親が該当 doc（価格/品揃え→09・エンゲージ/コンテンツ型→07）を Edit で更新
- **鉄則（現物照合）**: 自社価格を書くときは `note-magazines.ts`/`coconala-services.ts` を Read して file:line で裏取り。裏取りできない主張は confidence:low か「未確認」

## 安全弁（チャネル別）

- **note/Brain**: 公開ページ read-only（認証不要）
- **ココナラ**: 公開ページ read-only・**低頻度厳守（数ヶ月に1度・operations.md §2.3）**・外部誘導しない
- **X**: 実アカ Playwright だが **read-only 専用**（いいね/フォロー/リプライ機能を持たない）・四半期・≤15プロフィール・jitter 遅延・**challenge/captcha/凍結警告で即中断（自動リトライ禁止）**→ `probe-status.json` に記録。投稿スケジュールと実行を重ねない。方針は [x-post-policy.md](../../../../docs/reference/x-post-policy.md) §11
- **IG**: 自セッション Playwright（投稿運用 publish-ig-bs と共有）。セッション切れ時は best-effort 格下げ＝「未取得」と明記して無理に別ルートを作らない
- **有料本文は全チャネルで取得しない/できない**（中身の質は「未読」扱いで断定しない）
- **新規クラウド cron は作らない**。定期性は `check-competitor-scan-due`（weekly-review Agent B が surface）＋ annual.md 四半期定例

## 勝ち型の抽出 → 原案化（伸びてる投稿レーダー）

X scout は各競合の**エンゲージ上位10投稿**（`engagementLeaders`・`vsAvg`＝自アカ平均比）を時系列で蓄積する。四半期ごとに「どの投稿・切り口が伸びたか」を定点観測し、**勝ち型（フォーマット・トピック・切り口）を自社に取り込む**。

- **奪うのは"型"であって"文面"ではない**: `vsAvg ≥ 2` の投稿から**フォーマット**（例: 解答速報／頻出予想「偶数年は◯◯が鉄板」／試験前後の感情訴求／現役者の劣化解説）を抽出する。**文面の丸写し・微改変での再利用は禁止**（`x-post-policy.md` §11.1 の near-duplicate BLOCK＝凍結カテゴリ spam の本丸。@dobokunotecom 凍結の再現になる）。
- **原案化は `x-post-writer`**（ユニーク性を強制）へ橋渡しする: competitor-analyst が「転用する型」を surface → `x-post-writer` が自社の合格体験者ポジションで**原案**を生成 → `x-post-qa`（§11 ゲート）で near-duplicate を機械検査。
- 試験対策と無関係に伸びる投稿（例: 給与・処遇批判）は**追わない**（ブランド不整合）。型の抽出は exam-prep 純度の高い勝ち投稿に限る。

## 関連

- 機械: `scripts/scout-{note,x,ig,brain}-competitors.mjs`・`coconala-research.mjs --competitors`・`check-competitor-scan-due.mjs`
- 勝ち型の原案化: `x-post-writer`（生成・ユニーク性強制）／`x-post-qa`（§11 near-duplicate ゲート）
- Evaluator: `competitor-analyst`（[agents-registry.md](../../../../docs/reference/agents-registry.md)）
- config: `.claude/config/{note,x,ig,coconala,brain}-competitors.json`（競合ハンドル SSOT・チャネル別）
