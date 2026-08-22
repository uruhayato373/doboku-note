---
name: coconala-status
description: >
  ココナラ出品の状態を read-only で照合するスキル。受注の実体を npm run coconala-orders で収集して
  orders-log と突合（check-coconala-orders）し、分析画面の数値（閲覧数/お気に入り/販売数）は
  /coconala-analytics が kpi-log.json へ週次 upsert したものを読んで、カタログ（coconala-services.ts）↔
  state ↔ sales-log のドリフトを報告、撤退ライン（出品4週で S2 受注3件未満）を判定する。
  KPI 数値は対象期間の累計（既定30日ローリング）であって週次増分ではない（cumulative フラグを見る）。
  投稿・出品・価格変更はしない（検知と報告のみ）。
  Use when user asks to [ココナラの状態を確認, ココナラKPIを記録, ココナラの数字を貼る, 撤退ライン判定, /coconala-status].
user-invocable: true
---

## 用途

ココナラ・チャネルの**週次の健康診断**。`verify-ig-status` と同じ思想＝**検知と報告のみ（read-only）**で、是正（カタログ flip・出品変更）は `/coconala-order` や運営者の判断に委ねる。

```
/coconala-status            # カタログ↔state の整合だけ確認（数値なし）
/coconala-status            # ＋ダッシュボードの数値を貼り付ければ kpi-log へ週次記録
```

## フロー

0. **受注の実体を取る**: `npm run coconala-orders`（read-only Playwright）→ `npm run check-coconala-orders`。
   記録漏れ・金額ズレ・**返信期限（無連絡で自動キャンセル）**・納品滞留を機械が surface する。
   snapshot が取れない/古いときは exit 2＝**検査不成立**なので「受注 0 件」と報告しない。
1. **整合チェック**: `node scripts/check-coconala-wiring.mjs` を実行し結果を報告（listed なのに serviceUrl 空・未知 serviceId・priceYen 不一致・**paused の理由欠落**・**復帰予定日 `resumeOn` の超過** 等）。
   ⚠ が出たら**棚が止まったままになっていないか**を必ず報告する（長期不在の全件休止から戻し忘れると、売上ゼロのまま誰も気づかない）。
2. **KPI 取得**: `npm run coconala-analytics -- --append-kpi` → `npm run check-coconala-analytics`（詳細は `/coconala-analytics`）。`kpi-log.json` の `weekly` / `blogsWeekly` へ `weekOf`（ISO 週初＝月曜）単位で upsert される。数値の**手動貼付があればそれも正規化してよい**。**読み取れない項目は `null`。推測で埋めない**。
   数値は `period` 区間の累計（`cumulative: true`・既定30日ローリング）なので、**前週行との引き算で「今週の伸び」を出さない**。
3. **受注サマリ**: `orders-log.json` から 直近4週の serviceId 別 受注件数・平均 `tensakuMinutes` を集計。
4. **判定を報告**:
   - **撤退ライン**（ココナラ展開キット §6）: 出品4週経過で **S2 受注3件未満 → 「投資停止・看板維持のみ」を推奨**（判断はユーザー）。
   - **成功の感触**: 4週で S1+S2 合計5件以上 → 価格引き上げ（S2 ¥8,000→¥12,000 は評価20件が目安）を検討。
   - **工数警告**: `tensakuMinutes` の平均が30分超 → 受付枠（`weeklyCapacity`）の引き下げを推奨。
   - **満枠**: 当週の受注が `weeklyCapacity` に達していれば `status: 'full'` への flip を提案。

## 入力（既定は自動取得・貼付でも可）

既定は `/coconala-analytics` の自動取得。手で貼りたいときは、サービスごとの数値をそのまま貼る（形式は自由・読めない項目は null 記録）。

```
経験記述 合格診断  閲覧 120  お気に入り 8  販売 2
経験記述 添削      閲覧 340  お気に入り 21 販売 3
```

## ガードレール

- **収集は read-only に限る**: KPI（`coconala-analytics`）も受注の実体（`coconala-orders`）も画面を読むだけ。
  メモ追加・期間変更・出品操作・返信送信はしない（方針の経緯は coconala-operations.md §4・§2.2b）。
- **partial を成功と呼ばない**: 取得件数は「対象 N / 取得 M / 除外 K」で報告する。`ok:false` は 0 件ではなく欠測。
- **是正しない**: カタログの status flip・価格変更は提案まで（実行は `/coconala-order` ケース3 か運営者）。
- **捏造しない**: 貼付に含まれない数値を推測で埋めない（`null` のまま記録し、欠測として報告）。

## 完了条件

- `check-coconala-orders`（受注の実体突合）と `check-coconala-wiring`（配線）の結果＋受注サマリ＋判定が報告されている。
- 受注件数は **snapshot の実検査数**とともに報告する（「0 件」と「取得できていない」を区別する）。
- 数値の貼付があった場合は kpi-log に1行 append され、`updatedAt` が更新されている。

## 参照

- エージェント: `.Codex/agents/coconala-operator.md`
- 機械ガード: `scripts/check-coconala-wiring.mjs`（`npm run check-coconala-wiring`）／`scripts/check-coconala-orders.mjs`（`npm run check-coconala-orders`）
- 受注の実体収集: `scripts/coconala-orders.mjs`（`npm run coconala-orders`・read-only）
- 運用 SSOT: `.Codex/knowledge/reference/coconala-operations.md` / KPI・撤退ライン: `docs/note/1級・2級土木/ココナラ展開キット.md` §6
- 受注処理は `/coconala-order`
