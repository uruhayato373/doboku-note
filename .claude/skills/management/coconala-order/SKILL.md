---
name: coconala-order
description: >
  ココナラで受注した 1級・2級土木 経験記述サービス（S1 合格診断 / S2 添削セット）1件を、
  受領から納品文面ドラフトまで通す統括スキル。coconala-operator を起動し、ヒアリングシートの
  検証 → /keiken-tensaku で添削下書き生成 → 納品文面ドラフト → orders-log 追記 までを行う。
  最終赤入れとトークルームへの送信は運営者（人間）。代筆禁止・外部誘導禁止・個人情報非コミット。
  Use when user asks to [ココナラで受注した, ココナラの納品文面を作って, 添削依頼が来た, /coconala-order].
user-invocable: true
---

## 用途

ココナラ受注1件の E2E を定型化し、**運営者の作業を「最終赤入れ＋送信」だけに圧縮**する（目標: S2 で10〜30分/件）。

```
/coconala-order <serviceId> [ヒアリングシートのpath]
```

`serviceId` は `src/lib/coconala-services.ts` の id（`coconala-shindan` / `coconala-tensaku-set`）。シート本文はチャットに貼り付けてもよい。

## フロー（coconala-operator が実行）

1. **カタログ確認**: `serviceId` の `status` を Read。`draft`（未出品）なら停止。`full` なら受付枠超過を警告。
2. **一時保存**: ヒアリングシートを scratchpad / `.tmp/` へ `.md` 保存。**リポジトリには置かない**（個人情報）。
3. **入力検証**: 級・工種・立場・テーマ・下書き本文の欠落を検査。欠けていれば**再送依頼文**を出して停止（推測で補完しない）。
4. **添削下書き生成**: `/keiken-tensaku <path> --grade N` を起動（`civil-keiken-tensaku-drafter`）。
5. **納品文面ドラフト**: 総評／チェックリスト／赤入れ2点／字数／次の一歩 の骨組みを生成（`coconala-operator.md` のテンプレ）。
6. **orders-log 追記**: `date` / `serviceId` / `priceYen`（カタログから）/ `grade` / `status:'received'`。
7. **引き継ぎ提示**: 下記チェックリストを表示して終了。

## 運営者チェックリスト（表示される）

- [ ] ストップウォッチ開始（`tensakuMinutes` に記録する）
- [ ] 添削下書きの NG→OK は**最重要1〜2点だけ**採用（全部直さない）
- [ ] 納品文面のトーンを自分の言葉に／**AI 下書き注記が消えているか確認**
- [ ] **note・サイトの URL が入っていないか確認**（ココナラ規約: 外部誘導禁止）
- [ ] トークルームへ送信（送信はユーザー操作。エージェントは送らない）
- [ ] orders-log の `status` を `delivered` へ・`tensakuMinutes` 記録
- [ ] 共通の誤りは匿名化して添削事例アーカイブへ（1対多の資産化）

## ガードレール

- **代筆はしない（Red Line #2）**: 本人答案への赤入れまで。ゼロからの作成代行は受けない（断り文面はココナラ展開キット §3 の FAQ）。
- **顧客原稿をコミットしない**: orders-log に記録するのは日付・serviceId・金額・級・進捗・所要時間のみ。
- **価格はカタログが真実源**: 文面に価格を書くならカタログの `price` を転記。改定はカタログ→キットの順で同一 commit。
- コミット前に `npm run check-coconala-wiring`（pre-commit でも自動実行）。

## 完了条件

- 添削下書き.md（scratchpad/`.tmp`）＋納品文面ドラフトが生成され、orders-log に1件 append されている。
- `check-coconala-wiring` が exit 0。
- 「送信した」と報告しない（送信は運営者）。

## 参照

- エージェント: `.claude/agents/coconala-operator.md` / `.claude/agents/civil-keiken-tensaku-drafter.md`
- 運用 SSOT: `docs/reference/coconala-operations.md` / 戦略・文面: `docs/note/1級・2級土木/ココナラ展開キット.md`
- KPI 記録は `/coconala-status`
