---
name: coconala-order
description: >
  ココナラで受注したサービス（1級・2級土木 S1 診断 / S2 添削 / S3 指導 / C系・RCCM・コンクリート主任技士・技術士口頭の PDF / 技術士口頭 想定質問作成）
  1件を、受領から納品文面ドラフトまで通す統括スキル。coconala-operator を起動し、商品タイプ別に分岐して
  /keiken-tensaku（S1=診断・S2=添削・S3=骨子→添削）でドラフト生成、または C系=PDF即送付文を生成 → orders-log 追記。
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
0b. **購入者のメッセージと添付を取る**: `npm run coconala-talkroom -- <talkroomId>` で `.tmp/coconala/talkrooms/{id}/` に messages.txt・添付（原寸）・docx の本文 .txt・manifest.json を出す。**その場で Playwright を書かない**（添付はホバーで出るボタンにしかなく、画像は saveAs が競合して失敗する＝2026-09-25 に4回書き直した）。exit 2 は添付の取りこぼし。画像（手書きの工事概要など）は原寸を Read して読む。
1. **カタログ確認**: `serviceId` の `status` を Read。`draft`（未出品）なら停止。`full` なら受付枠超過を警告。
2. **一時保存**（S系のみ）: 0b の出力（または貼り付けられたシート/下書き）を `.md` にまとめて scratchpad / `.tmp/` へ保存。**リポジトリには置かない**（個人情報）。

**S1 診断（`coconala-shindan`）**
3. 下書き（1テーマ）の欠落を検査 → `/keiken-tensaku <path> --grade N --mode shindan` → `診断下書き.md`（A/B/C＋ワースト3＋字数・**書き換え文なし**）→ キット §4c「S1 診断 返却テンプレ」に整形。

**S2 添削（`coconala-tensaku-set`）**
3. 級・工種・立場・テーマ・下書き本文（2テーマ）の欠落を検査。欠けていれば再送依頼文を出して停止 → `/keiken-tensaku <path> --grade N` → `添削下書き.md` → 納品文面（`coconala-operator.md` テンプレ）。

**S3 指導（`coconala-sakusei` / `-4theme` / `coconala-2kyu-sakusei` / `-3theme`。id は旧「作成」のまま）**
2026-09-25 に作成（答案ドラフトの納品）が運営に「学校の課題の代行」として取り下げられ、代筆しない指導へ作り替えた。**答案を書くのは本人**。2段階で進める。
3. **1段目＝骨子**: 指導用ヒアリングシート（キット §4b）を検査。**宣誓チェック未記入なら停止**（創作で埋めない）→ `/keiken-tensaku <path> --grade N --mode kosshi` → `骨子シート.md`（`check-kosshi-sheet` exit 0）→ キット §4c「骨子シート送付」文を添えてトークルームで送る。**正式納品にはしない**（途中経過のメッセージ）。orders-log は `status:'kosshi-sent'`。
3'. **2段目＝添削**: 本人が書いた答案を受け取ったら S2 と同じく `/keiken-tensaku <path> --grade N`（添削）→ 返却を**正式納品**にする。再添削（1回）は S2 の書き直し受付と同じ手順。全テーマ版は、書けたテーマから順に骨子→添削をテーマ単位で回してよい。
   - **未整備**: お届け予定日までに本人の答案が届かないときの扱い（延長の依頼・その時点での納品の可否）。初回の受注で運営者が決め、キットと本スキルに書き足す。

**コンテンツPDF（`coconala-*-pdf`）**
3. **ヒアリング不要**。該当 PDF を `.claude/config/coconala/assets/pdf/` から特定 → キット §4c「C系 PDF 送付」文を商品名・本数で埋める（トークルームで PDF 添付は運営者手作業）。個別相談は S2/S3 へ誘導。PDF と商品の対応は `scripts/build-coconala-content-pdf.mjs` の `PRODUCTS`（`label`）が正。
   - **特典の同梱**: 1級の模試・フルパック・プレミアムには `coconala-A1-1級二次-直前暗記ノート.pdf`、2級の模試・フルパックには `coconala-A2-2級二次-直前暗記ノート.pdf` を必ず添える（出品本文で約束している）。
   - **部門を選ぶ商品**: `coconala-rccm-mondai1-pdf`（R3＝テンプレ＋受験部門の記入例）と `coconala-pe-oral-pdf`（O1＝総監版／建設部門版）は、購入時メッセージの部門を確認してから該当の1冊を送る。部門が書かれていなければ確認メッセージの文案を出して停止する。

**技術士 口頭試験 想定質問作成（`coconala-pe-oral-qa`）**
3. 土木の `/keiken-tensaku` は使わない。`content/coconala/products/coconala-pe-oral-qa/運用テンプレ.md` §2 のヒアリングシートを送り、提出物（業務内容の詳細・業務経歴・部門）の欠落を検査。欠けていれば追加質問を出して停止 → 同 §3 の型で想定質問20問と回答の骨子を作る（各骨子に提出物の根拠を付け、根拠の無い骨子は確認事項へ回す＝創作しない）。

**共通の後段**
3b. **返信文の検証**（土木 S1/S2/S3）: トークルームに貼る文面を `返信文.txt` にまとめ、`civil-keiken-tensaku-qa`（機械ゲート `check-tensaku-reply` を含む。S3 の骨子は `check-kosshi-sheet` も）で PASS するまで直す。送信するのは PASS した文面だけ。
4. **orders-log 追記**: `date` / `serviceId` / **`talkroomId`（必須）** / `priceYen`（カタログから）/ `grade`（C系は null 可）/ `status:'received'` / `replyDueAt`（snapshot から転記）/ `deliveredAt:null` / `artifacts:[]`。
5. **突合**: `npm run check-coconala-orders` を実行し exit 0 を確認（記録漏れ・金額ズレ・返信期限を機械が見る）。
6. **引き継ぎ提示**: 下記チェックリストを表示して終了。**返信期限（無連絡で自動キャンセル）を必ず明示する**。

## 運営者チェックリスト（表示される）

- [ ] ストップウォッチ開始（`tensakuMinutes` に記録する。C系は不要）
- [ ] S2 添削=NG→OK は**最重要1〜2点だけ**採用／S1 診断=**書き換え文を足さない**（診断のみ）／S3 指導の骨子=**答案の文章が入っていないか**（引用をつなげば答案になる並びも不可）・引用が本人回答どおりか
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

- **捏造はしない（Red Line #2 再定義）**: 経験していない工事・事実・数値を創作しない。S1 診断＝方向性まで（書き換え文なし）／S2 添削＝本人原稿への赤入れ／S3 指導＝骨子は本人の回答の引用だけ・**答案の代筆はしない**（書くのは本人。欠落は `〇〇` と確認の質問）。
- **書き直しは1回まで（S2/S3）**: 再提出は `/keiken-tensaku` を前回下書きと併せ再実行し差分中心に再チェック → `orders-log` の `status` を `revised` へ（キット §5 の再チェック手順・§4c 返却文）。
- **顧客原稿をコミットしない**: orders-log に記録するのは日付・serviceId・金額・級・進捗・所要時間のみ。
- **価格はカタログが真実源**: 文面に価格を書くならカタログの `price` を転記。改定はカタログ→キットの順で同一 commit。
- コミット前に `npm run check-coconala-wiring`（pre-commit でも自動実行）。

## 完了条件

- ドラフト（S1 診断下書き / S2 添削下書き / S3 骨子シート→添削下書き、C系は PDF 送付文）＋納品文面が生成され、orders-log に1件 append されている。
- `check-coconala-wiring` が exit 0。
- `check-coconala-orders` に「評価未送信」が出ていない（クローズ済みの取引すべてに `rating` がある）。
- 「送信した」と報告しない（送信は運営者）。

## 参照

- エージェント: `.claude/agents/coconala-operator.md` / `.claude/agents/civil-keiken-tensaku-drafter.md`
- 運用 SSOT: `.claude/knowledge/reference/coconala-operations.md` / 戦略・文面: `content/note/1級・2級土木/ココナラ展開キット.md`
- KPI 記録は `/coconala-status`
