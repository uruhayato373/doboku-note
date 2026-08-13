---
name: x-campaign-plan
description: >
  X の月次投稿計画（.claude/config/x-campaigns/YYYY-MM-*.json）を 1 日 3 本体制（schemaVersion 2）で
  起案し、機械ゲートを通してから執筆・週次投入へ引き継ぐ。試験日程・自投稿の反応実測・競合スナップショット・
  商品カタログ（listed / published のみ）を根拠に、資格配分と時間帯スロット A/B/C を決める。
  Use when user says "来月のX計画を作って", "X投稿計画を立てて", "9月分のXを設計", "/x-campaign-plan".
disable-model-invocation: true
argument-hint: "--month YYYY-MM [--primary-exam civil-1]"
---

# X Campaign Plan

月次の X 投稿計画を作る。**計画 JSON が先、原稿は後**。先に配分・日付・スロット・着地先を確定させ、
機械ゲートで潰してから `x-post-writer` に原稿を書かせる。逆順にすると、書いた後で
「受付終了した出品に送客していた」「販売投稿が連続していた」が見つかって全部書き直しになる。

## 真実源

| 何を決めるか | 読むファイル |
|---|---|
| 本数体制・スロット・凍結ガード | `.claude/knowledge/reference/x-post-policy.md`（§11.2.1 スロット / §11.6 段階復帰 / §5.3 実績訴求） |
| 資格ごとの季節性（申込・試験日） | `.claude/config/exam-calendar.json` |
| 何が実際に反応したか | `.claude/state/x-metrics/own-posts.json`（`npm run x-own-metrics -- --report`） |
| 競合の動き | `.claude/state/x-competitors/snapshot.json`（`npm run scout-x-competitors`・四半期） |
| 売れる状態の商品だけ | `src/lib/coconala-services.ts`(`listed`) / `note-magazines.ts`(`published:true`) / `brain-products.ts`(`listed`) |

## 手順

1. **反応実測を更新する**（前回から 2 週間以上空いていれば）

   ```bash
   npm run x-own-metrics
   ```

   **中央値を主に読む**。平均は 1 本のバズで動く（実例: リンクなしは平均 7.31 だが中央値 0 で、
   2 本の当たりが作った値だった）。「平均が高い型」に寄せる前に中央値と本数を見る。

2. **季節性から資格配分を決める**

   `exam-calendar.json` の申込締切・試験日から、その月に**受験者が動いている資格**を特定する。
   終わった試験の直前対策は書かない（合否待ち期は別の切り口＝実務での活かし方・来年度の検討）。
   反応実測の資格別中央値も併せて見る（本数が少ない資格の 0 を「効かない」と断定しない）。

3. **1 日 3 本 × 全日を組む**（schemaVersion 2）

   - スロット **A 朝 07:10–08:40 / B 昼 12:10–12:55 / C 夜 19:30–21:30** を 1 本ずつ
   - 時刻は日ごとに分単位でジッタ（同一 HH:MM 固定は凍結ガード違反）
   - 同一日の間隔 60 分以上
   - **販売 funnel（note/coconala/brain）は 1 日 1 本まで・スロット C のみ**・日をまたいで連続させない
   - `target` は**カタログで売れる状態のものだけ**。`linkless` は `target: null`

   ```jsonc
   {
     "schemaVersion": 2,
     "month": "2026-09",
     "timezone": "Asia/Tokyo",
     "status": "approved-plan",
     "strategy": { "cadence": "1日3本", "primaryExam": "civil-1", "mix": {}, "funnelMix": {}, "rules": [] },
     "posts": [
       { "date": "2026-09-01", "time": "07:40", "slot": "A", "exam": "civil-1",
         "type": "共感フック", "funnel": "linkless", "target": null, "image": null }
     ]
   }
   ```

4. **機械ゲートを通す**

   ```bash
   npm run check-x-campaign-plan
   ```

   1 日 3 本・全日・スロット重複なし・間隔 60 分・販売制約・URL/UTM・**送客先が listed/published か**を検査する。
   赤のまま執筆へ進まない。出力末尾の「N ファイル / 投稿 M 件を実検査」で**検査件数が想定どおりか**を確認する
   （0 件や極端に少ない緑は故障）。

5. **原稿へ渡す**

   `x-post-writer` に月・週の範囲を渡して `docs/sns/x/draft/<NNN>-<exam>-<topic>/tweets.md` を書かせる。
   見出しは `## Tweet NN: M/D HH:MM <exam> / <型> / <funnel>`（`<exam>` は `gen-x-card` が読む）。
   → `x-post-qa` で平均 2.0 以上 → `npm run x-schedule-guard --queue` 緑 → `publish-x`。

6. **投入は 1 週間分ずつ**（policy §11.6）

   月まとめの一括投入はしない。凍結兆候が出たとき被害が 1 週間分で止まるようにする。
   投入後は必ず `npm run x-sync-status` で**キュー実在を実照合**する（ローカル JSON が queued でも
   X 側から消えていることがある）。

## 落とし穴

- **`publish-x` に日時を渡すとき zsh は単語分割しない**。`$DATES` だと 19 個の日時が引数 1 個になり、
  静かに即時投稿モードへ落ちる。`${=DATES}` を使う（`publish-x/SKILL.md` に事故記録）。
- **`--dry-run` の「N/N 件完了」は成功の証拠にならない**。上記の事故は dry-run でも緑だった。
- 計画 JSON を書き換えたら**必ず checker を回す**。v1（1 日 1 本）の既存計画は後方互換で通るので、
  v2 にしたつもりで `schemaVersion` を上げ忘れると 1 日 1 本として検査され、3 本入っていると赤になる。

## 担当外

- 原稿執筆 → `x-post-writer` ／ 採点 → `x-post-qa`
- カード画像 → `/create-x-card`（`gen-x-card.mjs`）
- 予約実行 → `/publish-x` ／ 消化確認 → `npm run x-sync-status`
