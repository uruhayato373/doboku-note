---
name: coconala-order
description: >
  ココナラで受注した 1級・2級土木 経験記述サービス（S1 診断 / S2 添削 / S3 答案作成 / C1〜C9 コンテンツPDF）
  1件を、受領から納品文面ドラフトまで通す統括スキル。coconala-operator を起動し、商品タイプ別に分岐して
  /keiken-tensaku（S1=診断・S2=添削・S3=作成）でドラフト生成、または C系=PDF即送付文を生成 → orders-log 追記。
  最終赤入れとトークルームへの送信は運営者（人間）。捏造禁止・外部誘導禁止・個人情報非コミット。
  Use when user asks to [ココナラで受注した, ココナラの納品文面を作って, 添削依頼が来た, PDF商品が売れた, /coconala-order].
user-invocable: true
---

## 用途

ココナラ受注1件の E2E を定型化し、**運営者の作業を「最終赤入れ＋送信」だけに圧縮**する（目標: S2 で10〜30分/件）。

```
/coconala-order <serviceId> [ヒアリングシートのpath]
```

`serviceId` は `src/lib/coconala-services.ts` の id。シート/下書き本文はチャットに貼り付けてもよい。

## 商品タイプ別フロー（coconala-operator が実行）

まず `serviceId` からタイプを判定し、分岐する（真実源 → [coconala-operations.md §3](../../../../.claude/knowledge/reference/coconala-operations.md)）。

**共通の前段**
0. **実体を取る**: `npm run coconala-orders` を実行し `.claude/state/coconala/orders-snapshot.json` を更新する。**何が売れたかを購入通知の記憶や推測で決めない**。serviceId 未指定ならスナップショットから特定する（`talkroomId` / `serviceId` / `priceYen` / `soldOn` / `replyDueAt` が採れる）。ログインが切れていれば headed の Chrome で人がログイン。
1. **カタログ確認**: `serviceId` の `status` を Read。`draft`（未出品）なら停止。`full` なら受付枠超過を警告。
2. **一時保存**（S系のみ）: シート/下書きを scratchpad / `.tmp/` へ `.md` 保存。**リポジトリには置かない**（個人情報）。

**S1 診断（`coconala-shindan`）**
3. 下書き（1テーマ）の欠落を検査 → `/keiken-tensaku <path> --grade N --mode shindan` → `診断下書き.md`（A/B/C＋ワースト3＋字数・**書き換え文なし**）→ キット §4c「S1 診断 返却テンプレ」に整形。

**S2 添削（`coconala-tensaku-set`）**
3. 級・工種・立場・テーマ・下書き本文（2テーマ）の欠落を検査。欠けていれば再送依頼文を出して停止 → `/keiken-tensaku <path> --grade N` → `添削下書き.md` → 納品文面（`coconala-operator.md` テンプレ）。

**S3 答案作成（`coconala-sakusei`）**
3. 作成用ヒアリングシート（キット §4b）を検査。**宣誓チェック未記入・素材不足なら追加質問を出して停止**（創作で埋めない）→ `/keiken-tensaku <path> --grade N --mode sakusei` → `答案ドラフト.md`（事実確認チェックリスト付き）→ 納品文面（本人の事実確認が必須と明記）。

**C系 コンテンツPDF（`coconala-*-pdf`・C1〜C9）**
3. **ヒアリング不要**。該当 PDF を `.claude/config/coconala/assets/pdf/` から特定 → キット §4c「C系 PDF 送付」文を商品名・本数で埋める（トークルームで PDF 添付は運営者手作業）。個別相談は S2/S3 へ誘導。

**共通の後段**
4. **orders-log 追記**: `date` / `serviceId` / **`talkroomId`（必須）** / `priceYen`（カタログから）/ `grade`（C系は null 可）/ `status:'received'` / `replyDueAt`（snapshot から転記）/ `deliveredAt:null` / `artifacts:[]`。
5. **突合**: `npm run check-coconala-orders` を実行し exit 0 を確認（記録漏れ・金額ズレ・返信期限を機械が見る）。
6. **引き継ぎ提示**: 下記チェックリストを表示して終了。**返信期限（無連絡で自動キャンセル）を必ず明示する**。

## 運営者チェックリスト（表示される）

- [ ] ストップウォッチ開始（`tensakuMinutes` に記録する。C系は不要）
- [ ] S2 添削=NG→OK は**最重要1〜2点だけ**採用／S1 診断=**書き換え文を足さない**（診断のみ）／S3 作成=**答案の事実・数値が本人回答通りか照合**（`〇〇` の残りを本人記入に委ねる）
- [ ] 納品文面のトーンを自分の言葉に／**AI 下書き注記が消えているか確認**
- [ ] **note・サイトの URL が入っていないか確認**（ココナラ規約: 外部誘導禁止）
- [ ] トークルームへ送信（送信はユーザー操作。エージェントは送らない）
- [ ] orders-log の `status` を `delivered` へ・`deliveredAt`・`artifacts`（送ったファイルと sha256）・`tensakuMinutes` 記録
      ※ C系 PDF は再ビルドで中身が変わりうる。**どの版を送ったか**を残さないと後から特定できない（2026-08-05 の C8 で実際に発生）
- [ ] 共通の誤りは匿名化して添削事例アーカイブへ（1対多の資産化）

**取引クローズ後（評価まで終えて完了）**

- [ ] 購入者評価を送る。**クローズ＝完了ではない**。期限（概ね完了から2週間）を過ぎると
      こちらの評価は公開されず、相手の評価だけが残る
- [ ] 文面はトークルームの実ログから拾った事実で書く（定型の一文で終えない・捏造しない）。
      同一顧客の複数取引は書き分ける
```bash
npm run coconala-rate-buyer -- <talkroomId> <コメントtxt>            # 入力のみ（既定）
npm run coconala-rate-buyer -- <talkroomId> <コメントtxt> --submit   # 送信
```
- [ ] orders-log に `rating`（送った文面そのもの）を記録し `status` を `closed` へ
- [ ] **星を5にしたくない取引ではスクリプトを使わない**（星5固定のため。人が UI で入力する）

> [!warning] 通知メールでは気づけない
> ココナラの取引通知・評価依頼は出品アカウントの登録アドレス `dobokunotecom@gmail.com` に
> しか届かない。Gmail コネクタが繋がっているのは `uruhayato373` 側で、そちらには
> **取引通知が1通も来ない**（2026-08-11 実査）。気づく経路は `npm run check-coconala-orders`
> （評価未送信・期限切迫を検知）に置くこと。

## ガードレール

- **捏造はしない（Red Line #2 再定義）**: 経験していない工事・事実・数値を創作しない。S1 診断＝方向性まで（書き換え文なし）／S2 添削＝本人原稿への赤入れ／S3 作成＝本人ヒアリング事実のみから構成（欠落は `〇〇`・本人の事実確認必須）。
- **書き直しは1回まで（S2/S3）**: 再提出は `/keiken-tensaku` を前回下書きと併せ再実行し差分中心に再チェック → `orders-log` の `status` を `revised` へ（キット §5 の再チェック手順・§4c 返却文）。
- **顧客原稿をコミットしない**: orders-log に記録するのは日付・serviceId・金額・級・進捗・所要時間のみ。
- **価格はカタログが真実源**: 文面に価格を書くならカタログの `price` を転記。改定はカタログ→キットの順で同一 commit。
- コミット前に `npm run check-coconala-wiring`（pre-commit でも自動実行）。

## 完了条件

- ドラフト（S1 診断下書き / S2 添削下書き / S3 答案ドラフト、C系は PDF 送付文）＋納品文面が生成され、orders-log に1件 append されている。
- `check-coconala-wiring` が exit 0。
- `check-coconala-orders` に「評価未送信」が出ていない（クローズ済みの取引すべてに `rating` がある）。
- 「送信した」と報告しない（送信は運営者）。

## 参照

- エージェント: `.claude/agents/coconala-operator.md` / `.claude/agents/civil-keiken-tensaku-drafter.md`
- 運用 SSOT: `.claude/knowledge/reference/coconala-operations.md` / 戦略・文面: `content/note/1級・2級土木/ココナラ展開キット.md`
- KPI 記録は `/coconala-status`
