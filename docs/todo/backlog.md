# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。
> **完了したタスクはセクションごと削除する**（記録は git 履歴が持つ。完了サマリ・経緯 prose を本ファイルに書かない）。

## 凡例

| 見出し | 意味 |
|---|---|
| ## 🔴 高 | 来月中に着手したい |
| ## 🟡 中 | 2〜3ヶ月以内 |
| ## 🟢 低 | 時期未定 |
| ## 🟣 判断待ち | ユーザーの意思決定が必要 |

各タスクは `### タスク名` の直下に `タグ:` 行を置く（運営管理画面 TODO タブが機械読取り）:
`タグ: [コンテンツ品質] [Codex候補]` — 第1タグ=カテゴリ（コンテンツ品質 / UI・UX / 収益化 / エージェント・SSOT / SNS・マーケ / インフラ・計測）、`[Codex候補]`（バルク処理向き）は任意。

---

## 🔴 高 — 来月中に着手

### note 添付 残41本（明日いちばん・購入者が受け取れない）
タグ: [収益化][note運用]

本文でPDFを約束しているのにライブに添付が無い記事の復旧。**136本中94本を 2026-08-11 に添付済み**、
note の1日100件上限で打ち切り。残 41 本。

```bash
node scripts/note-attach-batch.mjs --commit
```

- done-log から自動再開。負債 `nded084d4f646`（上限で復元できなかった分）も同時に解消される
- 完了後 `npm run check-note-attachments:live` で **`missingPromised: 0`** を確認する
- 検知は `npm run check-note-delivery-due`（週次レビューにも配線済み）
- 経緯と判断の前提 → [handoff](../handoffs/2026-08-11-note-delivery-recovery.md)


### ココナラ 8/17 の復帰（不在明け・全件休止からの再開）
タグ: [収益化][ココナラ]

2026-08-06〜08-16 の不在中は**全17件を受付休止**している（購入から48時間以内に連絡できないと自動キャンセルになるため。PDF商品も手作業送付で例外を作れない）。8/17 に復帰する。

```bash
npm run coconala-pause -- --resume --absence --commit
```

- `pauseReason:'absence'` の **12件だけ**が対象。恒久廃止（`retired`・5件は archived 済）は構造的に選ばれない
- カタログの `listed` 戻しとマーカー除去も**スクリプトが行う**（人が対象を思い出す必要なし）
- 戻し忘れは `npm run check-coconala-wiring` が警告（`resumeOn` 超過で発火・実測確認済み）
- 真実源 → [coconala-operations.md](../reference/coconala-operations.md)「長期不在」節

### ココナラ 初受注〜評価まで完了（やみぎく様・2件 計¥10,000）
タグ: [収益化][ココナラ]

> [!done] 2026-08-11 完了
> - **¥2,500 予想模擬試験**（room 18082691・8/4 受注）→ PDF2冊納品 → 正式な納品 → 承諾
> - **¥7,500 教材16冊セット**（room 18091375・見積り受注）→ DM 10051134 で 8/5 14:47 提案 →
>   コンビニ払い購入 → 8/6 入金 → ZIP1ファイル（16冊・全82頁）で前倒し納品 → 承諾
> - **購入者評価 2件を送信**（4項目すべて★5・実査で「評価完了」を確認）。
>   手順は `npm run coconala-rate-buyer`（draft-first・`--submit` で送信）
> - 記録は `orders-log`（`rating` フィールド新設）と `kpi-log`（milestones）へ反映済み
>
> 副産物: **8/9 に出品者ランクが【レギュラー】へ昇格**。販売実績 2・本人確認済み。

学び（次の受注に効くもの）:
- 初回の質問は「PDFかマルチコピー機か」＝**お届け方法が商品説明から読み取れなかった**。
  購入時メッセージに納品形態を明記する運用へ（C8/C10 は反映済み）
- ZIP 納品は**解凍を知らない購入者がいる前提**で案内を添える（8/7 に実際につまずいた）
- 見積り受注はカタログ名と一致しないため `coconala-orders` が毎回
  「カタログに紐づかない取引」と警告する（下の項目で扱う）

### ~~ココナラ フィッシング DM の違反報告~~ → 対応不要（運営が処理済み）
タグ: [運用基盤]

> [!done] 2026-08-11 実査: **ココナラ運営が既に対処済みのため、こちらの報告は不要**
> `yuki7392`（DM 10051752）・`ren3111`（DM 10052267）とも、DM画面に
> 「相手の方は現在ココナラの利用を制限されているため、メッセージのやりとりができません」と表示され、
> 本文も「この内容は規約違反のため削除されました」に置き換わっている。**返信は構造的に不可**。
>
> 経緯: 2026-08-05、両者からロシア語＋PDF添付の「注文のPDFを開いてください」型 DM。
> 土木教材の出品者宛としては文脈が合わない典型的な誘導。**PDF は開いていない**。

**残る運用上の注意**: `check-coconala-orders` は「既読の DM = 返信済みか人が確認せよ」と保守的に倒すため、
この2件は今後も毎回「要対応」に挙がる。アカウント制限済みの相手は返信できないので、
挙がっても対応不要と判断してよい（黙らせるならチェック側に除外条件が要る）。

### ココナラ 見積り受注がカタログ突合で毎回警告になる（軽微）
タグ: [運用基盤][ココナラ]

`npm run coconala-orders` が room 18091375 を「カタログに紐づかない取引 1 件（title 変更の疑い）」と警告する。
見積り（カスタム提案）の取引名は出品サービス名と一致しないため**構造的に必ず出る**もので、故障ではない。

対処案はどちらか。実害は「毎回ノイズが出る」だけなので優先度は低い。

1. `src/lib/coconala-services.ts` に見積り用のエイリアス（別名）を持たせて突合対象にする
2. `coconala-orders` 側で `quote` を持つ取引を突合対象から除外する

### ココナラ 初添削の工数実測 → プレミアム週枠の再判断
タグ: [収益化][ココナラ]

C12 プレミアム（教材18冊＋添削2テーマ・¥15,000）は `weeklyCapacity: 1` で開始した。**添削は本番顧客への納品が未経験**（S2 はレビュー0＝販売実績ゼロ）のため、初回の工数が読めないことによる暫定値。

- 初受注時に `orders-log` の `tensakuMinutes` を実測記録
- 2〜3件の実測が出たら週枠を再判断（30分超が続くなら据え置き、10〜20分で収まるなら 2〜3 へ）
- 判断基準 → [ココナラ展開キット.md §5 工数設計](../note/1級・2級土木/ココナラ展開キット.md)

### note ライブ未反映 残り 177 本の再開（2026-07-31 中断）
タグ: [運用基盤]

352 本中 175 本を反映済み。残りは `.tmp/republish-batch2.txt` の 121 行目以降＋第2陣の未実行分。**添付を伴う記事は 1 日 100 件上限があるため日を分ける**。

```bash
node scripts/note-update-body.mjs --list <list> --reattach-pdf --commit
```

未反映のまま残ると、ソースに配線した L2 もくじ CTA が読者に届かない（実害＝回遊導線のみ・記事本文は正常）。検知は `npm run check-note-republish`。

### note PDF 添付 185 件（1日100件上限・最低2日）
タグ: [収益化]

土木 経験記述 178 本へ PDF を配置し本文案内までライブ反映済み。**添付だけが未了**。`check-note-attachments --live` を 457 件で実行済み（取得失敗0・充足272/不足185）。欠落リストは `.claude/state/note-attachments-missing.json` に生成済み。

**note のファイルアップロードは1日100件が上限**（超えると以降が全て ABORT）。done-log は `.claude/state/note-attach-done.json`（git 追跡下）なので翌日そのまま再実行すれば続きから進む。

```bash
node scripts/note-attach-batch.mjs --commit --limit 100
```

**最優先は `BK-I_必須科目I` の7本**（R07 模範解答＋R8予想①〜⑥）。今回の作業とは無関係な既存の欠落で、本文で印刷用PDFを約束しているのにライブに無く**購入者が受け取れていない**。

前提: note ログイン済みプロファイル（無ければ `npm run note-edit-session`）。経緯 → [2026-07-31 handoff](../handoffs/2026-07-31-note-paid-cta-and-pdf.md)

### 総監模範論文 77本に「印刷用PDF」節を追加（訴求もれ）
タグ: [収益化]

**PDF はライブに添付済みなのに、本文が一言も触れていない**。読者には「PDF が付く」ことが伝わっておらず、作った資産が購入判断の材料になっていない。2026-07-31 の全数検査で発覚し、`check-note-attachments` に非ゲート surfacer を追加したので `node scripts/check-note-attachments.mjs` で常時列挙される。

節の文面は建設部門 200 本が既存例（`## 印刷用PDF｜本記事の模範解答`）。土木 178 本と同じく `place-civil-keiken-pdfs.mjs` 相当の追記 → `note-update-body --commit` でライブ反映。**添付は済んでいるので本文更新だけ**だが、全文置換は添付カードを消すので `--allow-attachment-loss` ＋ 再添付が要る点に注意（1日100件上限も効く）。

### 総監 R8予想問題のライブ画像欠落（live=0 / sot=3）
タグ: [コンテンツ品質]

`n8e92e4673a99`。`check-note-live-headings` の公開判定バグを直した（2026-07-31）ことで初めて検出された。ソースに画像3枚があるのにライブに1枚も出ていない。有料記事なので購入者に図が見えていない可能性がある。

```bash
node scripts/check-note-live-headings.mjs --paths-only
```

### 総監 計算問題パターン集のライブ反映（画像14枚で CDN 確定せず）
タグ: [コンテンツ品質]

`ne190c3ef2fca`。4回試して毎回 note 側の CDN 確定が 9〜11/14 で止まり fail-closed で中断。押し切ると有料記事の図がライブで欠落する。画像重複なし・時間切れでもない（280秒待つ設定）。CTA と PDF 節がソース止まり。別 PC・別回線で再試行するか `--img-lenient` を使うかは要判断。

### noteカバーV4 残4件の手動更新（free×メンバーシップ連携LP）
タグ: [収益化] [SNS・マーケ]

Crop-safe V4 全量移行（記事702/706＋マガジン36/36 反映済み）の残り。free×メンバーシップ連携記事のみ note-update-cover の公開フロー非対応（設定ページ構造が特殊）のため、note UI で手動更新する。エディタに新カバーが下書き済みの可能性が高く「公開に進む→更新する→通知いいえ」だけで済む見込み。

1. メンバーシップ「はじめに-合格ラボ」（`docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/`）
2. 「1級土木-二次まるごとパック」LP（`docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/`）
3. 「完全攻略ガイド・想定工事索引」（`docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/00-完全攻略ガイド-想定工事索引/`)
4. 「2級 想定工事バンク索引」（`docs/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/00-想定工事索引/`）

いずれもライブは旧カバーのまま無傷。新カバーは各 dir の `img/cover.png`。知見 SSOT: memory `reference_note_cover_live_gotchas`

### 土木note 195記事の著者オーソリティバナー live反映
タグ: [収益化] [SNS・マーケ]

ソース配置は195記事で完了済みだが、公開noteへの反映は約12記事のみ。ログイン済みChromeのあるPCで、公開済み約156記事を冪等な `note-update-body` で複数パス実行し、CDN待ちABORTが0になるまで収束させる。

- 対象抽出: `docs/note/1級・2級土木/**/article.md` のうち `figure-author-authority.png` と `noteId` を持つもの
- 実行: `node scripts/note-update-body.mjs --list .tmp/nu-list.txt --commit`
- 安全弁: `--img-lenient` 禁止。ABORTは保存せず再実行する。完了後に公開noteを数本目視
- 未公開約38件は公開後に同処理。幅超過記事は `check-note-cover-fit --all` → frontmatter短縮 → 再配布
- SSOT: `.claude/knowledge/reference/author-authority-banner.md`

### 土木note ソース変更192本のlive同期と商品導線強化
タグ: [収益化] [Codex候補]

CTA・著者バナー・blockquote・cover文言・UTMを直したソースと公開noteの差分を解消する。

1. `npm run check-note-republish` と `npm run audit-note-funnel -- --live` で対象を再確定
2. CTAは `npm run note-append-cta`、本文変更は `publish-note --update` / `note-update-body --commit`
3. frontmatterを短縮した36記事のカバーを再生成・R2反映し、note UIで差し替える
4. 完全攻略パック `工事03/05/06/08/09` の購入リンク生存を実査し、切れていれば索引修正または公開
5. civil 6商品のdescriptionと主要記事導入部へ「元・地方自治体土木職（発注者）＋1級合格者本人」を展開

主力商品の導入フック改善、無料00インデックス、2級安全管理・法規まとめノートは上記の同期後に売上を見て判断する。著者を添削者・採点者と表現しない。

### 総監標準テキスト→キーワード集 実装分を本番deploy
タグ: [コンテンツ品質] [インフラ・計測]

完全監査とPhase 2/3実装は完了済み（D/E/G=0、新規 `landscape-act` / `cost-benefit-analysis`、補強・ナビ・keyword-relations同期・cem-qa合格）。未完はdevelop→mainのdeployと公開確認のみ。

- `/deploy` の通常手順でmainへ反映
- 新規2ページとキーワード集ハブをHTTP確認
- main push時のR2 OGP同期を確認
- 再監査: `npm run audit-pe-textbook-keyword-coverage`

### IG 論点パック 残92件の波状予約（1セッション約30件）
タグ: [SNS]

1級/2級土木の論点（頻出問題）パック 122件のうち **30件を予約済**（2026-07-17・7/18〜8/1）。残 92 件を波状で継続予約する。

- **コマンド**: `node .claude/scripts/sns/schedule-civil-theme-packs.mjs --count 30`（予約済は status.json で自動skip＝冪等・再開安全）。1週間以上空いたら先に `--dry-run` を1本。全体は `--plan` で確認
- **プラン**: 決定的（★降順→2級先行・1日2件 昼12:00=2級/夜19:00=1級）。全122件が 7/18〜9/16＝Meta +75日枠（9/30）内に収まる。次バッチは #31（8/2）から
- **安全弁**: ブラウザ自動操作＝Meta規約グレー・X凍結歴あり。**1セッション30件上限**（スクリプトが強制）。実行後 status.json を commit → 次セッションで同コマンド再実行
- 実行後はプランナー月ビューで実体確認（`npm run verify-ig-status`）。真実源 → memory [[project_ig_theme_packs_civil]]・ig-carousel-skill.md シリーズC

### BuildJob note展開の残作業（時間差・手動）
タグ: [収益化]

BuildJob キャンペーン（〜2026-08-31）の note ドメインパワー活用。**2026-07-14 に note 実公開まで完了**（N7-N9 新規3本公開＝na0f42fd52a51/ne49853deac96/n7a81ebf1cdc5、既存キャリア note 8本の本文再push＝サイト送客リンク live 反映、いずれも note API で実体検証済）。残:

1. **（時間差）A8 成果の月末手入力**（`.claude/state/metrics/affiliate/a8-results.json`）→ `npm run report-buildjob-affiliate` で EPC。GA4 面別は event_label 登録済（2026-07-07）＝deploy 後クリック蓄積後に `fetch-ga4-cta-clicks --by-label`
2. **stray 下書き手動削除**: `nf2316420abd0`（N7 公開検証の dry-run が作った孤児下書き・「ビルドジョブは施工管理に向くか」の下書き 11:51）。note.com/notes ダッシュボードで**公開済みの双子（11:58・同一タイトル）と取り違えないよう手動で**（`note-delete-note` は下書きカードの href を key で拾えず自動削除不可）
3. ~~**（2026-08-04 追加）サイト送客リンクを足した無料 note 13 本の live 反映**~~ → **2026-08-04 完了**。
   対象13本（総監 11＋`経験記述-AI設計-無料`＋`共通/AIで土木資格を攻略`）のうち、
   `経験記述-AI設計-無料` は着手時点で反映済みだったため、残り 12 本を
   `note-update-body --list --commit` で反映。**note API で 12 本すべてを実査し、
   SoT とライブの送客先 slug が一致すること・画像が欠けていないことを確認**（ok=12 / 要確認0 / 判定不能0）。
   事前に複数行 blockquote（再貼付で脱落する総監の既知の罠）が 13 本とも無いことを検査済み。
   ねらい: この 13 本はサイトへのリンクを 1 本も持っておらず、note→サイトは実測で最も質の高い流入
   （週 91 セッション・4.6 PV/セッション・平均滞在 42 分）だった。
   **A8 の追加は不要**＝キャリア文脈の note 14 本には既に全て入っており、残りは学習系で
   実務者セグメント限定の規約上リンクを置けない

4. **（2026-08-04→08-06）施工管理 note 142 本のライブ反映 — 完了**

   > [!done] 2026-08-06: **142/142 完了**（無料 26/26・有料 116/116）
   > 最後の 2級学科記述テーマ別出る順 5本は、8/5 の中断記録により初回は安全弁が SKIP した。
   > 指示どおり `check-note-attachments --live --only` で **5/5 充足（ライブ無傷）** を確認してから
   > `--force-retry` を付けて再実行し、全件 `boundaryBeforeExam=true`・PDF添付復元OK・API実体検証OK。
   > 無料の残り1本 `nd4c5c13ee445` も `--force-retry` で成功（画像 3/3 確定）＝8/5 の CDN
   > タイムアウトは一過性で、著者バナーの重複掲載は無関係だった。
   > `check-note-republish` の本文 drift 一覧から 6 本すべてが消えたことを実査確認済み。

   > [!note] 2026-08-05: PDF 方針の確定でブロック解除
   > 添付欠落 84 本で止まっていたが、[noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) §7 の決定
   > 「閲覧＝会員／所有＝買い切り」により **79 本は添付しない**（会員特典マガジン内のため）、
   > ※**2026-08-11 に撤回**＝これらの本文は PDF を約束していたため全件添付へ（noteコンテンツ計画 §7）。
   > **2級学科記述 5 本のみ添付**（特典マガジン外）と確定。
   > 残り 85 本は添付の有無で 2 リストに分割済み:
   > - `paid-rest-no-attach.txt`（82本）→ **`--reattach-pdf` を付けずに** `note-update-body --list <file> --commit`
   >   （ライブに添付が無いので消えるものが無く、ゲートも発火しない＝コード変更不要）
   > - `paid-rest-with-attach.txt`（3本）→ `--reattach-pdf` あり
   >
   > 添付なし群は画像のみ＝1本あたり約1件で、アップロード上限（1日100件）への圧迫が小さい。


   状態の真実源は `.claude/state/note-republish/status.json`。

   | 区分 | 本数 | 反映 | 残 |
   |---|--:|--:|--:|
   | 無料（添付なし） | 26 | **26** | 0 |
   | 有料（PDF 添付あり） | 116 | **116** | 0 |

   以下の手順は**完了済みの記録**（同種の作業を再開するときの手順書として残す）。

   **前提（新しい PC では最初にこれ）**: `.local/playwright-note-profile` は gitignore で
   マシンローカル。無い環境では `npm run note-edit-session` を実行して**人がブラウザで note へログイン**する
   （スクリプトは認証情報を一切自動入力しない）。account=dobokunote を assert するので別垢では止まる。

   **続きの手順**:
   ```
   node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/2級土木/経験記述テーマ選び/article.md"
   ```
   ↑ まず 1 本 dry-run（`--commit` なし＝反映しない）。ここで
   `[4.4] 画像挿入: … 確定=N/N` まで通れば、その PC は既定の待ちで足りている。
   `画像が CDN 確定せず` が出るなら下の環境変数を付ける（回線が遅い環境だけ必要）。
   ```
   NOTE_IMG_SETTLE_MIN_MS=240000 NOTE_IMG_SETTLE_PER_IMG_MS=60000 \
     node scripts/note-update-body.mjs --list .claude/state/note-republish/free-pending.txt --commit --force-retry
   ```
   有料は **1 本 dry-run（`--reattach-pdf`）で添付の検出と復元経路を確認してから** day1 へ進む:
   ```
   node scripts/note-update-body.mjs --article <1本> --reattach-pdf          # dry-run
   node scripts/note-update-body.mjs --list .claude/state/note-republish/note-republish-paid-day1.txt \
     --commit --reattach-pdf --attach-daily-limit 45
   ```
   `--attach-daily-limit 45` の根拠: スクリプトの日次カウンタは **PDF しか数えていない**が、
   note の 1 日 100 件上限は画像も含む疑いがある。有料記事は概ね 1 画像 + 1 PDF なので、
   PDF を 45 に絞れば実アップロードが約 90 に収まる。

   **既知の失敗モードと対処**:
   - `[4.4] 画像が CDN 確定せず` … 会社 PC のプロキシで CDN 確定が既定 90 秒を超える。
     実測 1 回目 6/14 失敗 → 待ちを 4 倍（上の環境変数）にして 2 回目は 13/18 成功。
     **保存はしないので破損しない**。回線の速い PC なら既定でも通る可能性がある。
   - 3 本連続失敗でバッチが自動停止する（`--max-consecutive-fail`）。中断した記事は
     `.claude/state/note-update-aborted.json` に載り次回スキップされる（`--force-retry` で再試行）。
   - **有料記事で中断したら、その記事を人が開いて添付の有無を確認してから再実行する**。
     note のエディタは「保存しない」で抜けても全文置換＋添付削除の状態を保持するため、
     確認せず再実行すると「添付なし」を正として保存してしまう（2026-07-31 の消失はこれ）。

   **検証**: 反映後は note API（`curl --ssl-no-revoke https://note.com/api/v3/notes/<id>`）で
   本文に `doboku-note.com/docs/` が実在することを確認する。ただし `can_read: false` の
   マガジン総合案内は未ログインでは本文が返らない＝**「取れなかった」を「無い」と読まない**
   （2026-08-04 に 3 本がこれに該当・著者セッションでの確認が要る）

### 1級土木 二次10/4 直前スプリント（死守コア3つ）
タグ: [収益化]

令和8年度 1級二次 **2026-10-04**（約13週）が経験記述商品の買い場ピーク。W28（7月中旬）以降に始動。真実源・設計は [docs/note/1級・2級土木/noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) §5.4／§3.3／§1.2。

**死守コア（時間が足りなければこれだけ）**:
1. **完全攻略パック 収録拡充** — SKU `civil-1-keiken-complete-pack` は published:true＋noteUrl 済（起動完了）。残は完成答案 draft の追録充実のみ。
2. **会員ローンチ** — 律速はユーザー作業（→ 🟣「土木メンバーシップ ローンチ実機」参照）。
3. **最小リスト捕獲** — LINE公式（ノーコード）＋一次→二次ブリッジ磁石「一次おつかれ→二次の始め方」。器=ユーザー／中身（磁石PDF・配信台本・友だち追加CTA）=当方。

**捨てる**: 1級向け一次PDF／重い学科予想の作り込み／2級深掘り。`[Codex候補]`=パック残公開の機械配線。

### 読み方ガイド 横展開（建設部門＋土木）
タグ: [収益化]

総監の3点セット（完全パック＋R8予想＋読み方ガイド）が sales-log で売上TOP3独占を実証。検証の結果「科目非依存の読み方ガイドのみが横断で成立」（2026-06-23。建設部門は選択科目制ゆえ横断R8予想・横断完全パックは構造的にニーズなし＝作らない）。

**残作業**: ①建設部門 読み方ガイド組成（論文対策キーワード6テーマ＋論文の書き方）②土木 読み方ガイド組成（既存ガイド再包装）。note 公開は手動（成果物は content＋note-magazines.ts published:false まで）。

### AdSense 再申請（有用性の低いコンテンツ対策の仕上げ）
タグ: [収益化]

主因＝非インデックス265本(25%)・本丸=薄いCEMキーワード（2026-07-04 診断・[[project_adsense_low_value_2026_07]]）。薄層CEMキーワード112本の全リライト＋deploy は完了済み。

**残（外部承認依存・ユーザー作業）**:
1. GSC で sitemap 再送信＋強化した主要URL 10〜20本を手動インデックス登録リクエスト
   → **civil-1 textbook は自動化で 2 回実施済み**（7/30 に 10 件・8/04 に 10 件受理）。
   次のバッチ: ① 8/04 に `button-not-found` で送れなかった 3 件
   （labor-standards / work-scheduling / management-subplans）②civil-2 の未登録 14 件
   ③総監の未登録 208 件（日次 10 件上限のため 3 週間ぶん）。
   コマンド: `npm run gsc-indexing:request -- --from-ssot --group <group> --category <cat> --limit 10`
   （要 Google ログイン・Playwright・1 本あたり 1〜2 分＝10 件で 25〜35 分）
2. 非インデックス率の観察 1〜2週間（`url-inspection` 再取得）
   → **URL 検査の単発読みは信用しない**。同じ 20 本を 30 分あけて読むと 4 本で判定が食い違った
   （不一致率 20%・2026-08-04 実測）。登録本数の権威は月次 CI のカバレッジレポートに置く
3. **前回却下から2〜4週間空けて再申請**。チェックリスト `docs/project/_archive/03_civil-adsense-resubmission.md:147-191`

### フロントエンド土台リファクタ（残増分）
タグ: [UI・UX] [Codex候補]

page/category の合成ロジック共通化（2026-06-25 アセスメント起点）。増分1（マガジンカード統合）・増分2（ArticleFooter/ArticleSidebar 抽出・580→376行）・増分4の純粋抽出フェーズ（category 1065→230行）は PR #273 で完了。

**残**: ①増分5＝badge 等の inline `style` → Tailwind semantic class の横断 sweep ②増分3（ArticleFooter config駆動化）・増分4残（`sortDocs` 35+ if-else の strategy factory 化）は**新資格追加が実際に発生したら**着手（indirection 増に対し効果が限界的なため保留）。

**実装ファイル**: `src/app/docs/[...slug]/page.tsx`・`src/app/category/[slug]/page.tsx`・`src/components/category/`

---

### 広い表のモバイル横スクロール対応（過去問データ表が切れる）
タグ: [UI・UX]

**問題（2026-07-14 実機確認済み）**: 過去問の多列データ表（ふるい分け9列・圧縮試験5列等）がモバイル（375px）で**画面外に切り捨てられ、横スクロールもできず到達不能**。例: concrete-chief `primary-materials` の平成28問3ふるい表は「40mm」列しか見えず、25/20/15/10/5/2.5/1.2mm のデータが消える＝過去問がモバイルで解けない。根因は `article` の `overflow-hidden` ＋ prose table にスクロールラッパーが無いこと（データではなく描画の問題）。

**方針（結論）**: **横スクロールラッパー案が正解、SVG/画像化は却下**。
- SVG/画像化: 9列を375pxに収める制約は同じで解決にならず、テキスト選択・SEO索引・読み上げを失う。メモリ `figure-provenance-system`「過去問データのSVG化=誤答」に反する。「全選択肢解説」の検索流入を殺すので不可。
- 横スクロール（推奨）: 実機検証で全列にスワイプ到達を確認（`overflow-x:auto` の div で table を包むだけ）。データ・アクセシビリティ・SEO 不変、全広表を一括救済、内容改変ゼロ。弱点=気づきにくさ→スクロールバー常時/端フェード/「→横スクロール」ヒントで補う。
- 転置（縦長化）: 表による上位互換（ふるい表なら 呼び寸法×砕石A/B の3列×9行でスクロール不要）。ただし表ごと手作業＋出題の見た目が変わる。余力あれば主要広表のみ格上げ。

**実装**: `src/app/docs/[...slug]/page.tsx` の MDX `table` マッピングを `<div class="table-scroll"><table>…</table></div>` に、`src/styles/globals.css` に `.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}` ＋任意でスワイプヒント/`min-width`。

**注意**: prose 描画全体に触る UI 変更。`page.tsx`/`globals.css` を触るため、UI/デザインシステム編集の並行セッションと衝突しないタイミングで。入れば今回の「過去問データ表 1-3/1-4 免除」の前提（スクロールで見られる）が裏付けられる。

---

## 🟡 中 — 2〜3ヶ月以内

### 1級土木テキストの実体なし「表N.M」参照 31箇所（図版は解消済み）
タグ: [品質] [Codex候補]

印刷教材から転記した際の `表N.M` 参照のうち、対応する表が本文に存在しないもの。読者が存在しない表を探すことになる。**図版側（`図N.M`）は 2026-08-03 に全19件を解消済み**（`86d83de65` / `8f949bc5d` / `fb4fa06bb`）で、これはその残りの同型欠陥。

走査コマンド（**空白許容が必須**）:

```bash
grep -rnoE '表[ 　]*[0-9]+\.[0-9]+' .local/r2/posts/civil-construction-1/textbook-*/article.mdx | grep -v 'alt='
```

2026-08-03 時点の実測 31箇所 — `construction-plan-overview` 10（表2.1〜2.10）/ `demolition` 6 / `transport-machinery` 5 / `distance-angle` 4 / `building-standards` 2 / `schedule-charts` `schedule-overview` `site-investigation` `standard-contract` 各1。

対応方針は図版のときと同じ2択: **(a)** 参照を外して文章を自然に整える（多くはこちら。印刷教材の様式例を指しているだけで、本文だけで理解できる）/ **(b)** 表の中身に価値があれば MDX の表として起こす（ただし CLAUDE.md §2 の「2軸比較のみ・4列以上禁止」に従う。収まらないなら `<SpecSheetList>` へ）。判断基準は「その表がないと本文が理解できないか」。

> [!warning] 走査パターンの落とし穴
> `表[0-9]+\.[0-9]+` だと `表 6.4` のように**表と数字の間に空白が入る形**を取りこぼす（図版側で実際に2件見落とし、`fb4fa06bb` で追加修正した）。必ず `表[ 　]*[0-9]+\.[0-9]+` を使い、検査数を出力して「0件」と「未検査」を区別すること。

検証: `npm run validate-mdx`。表を新規作成した場合は `npm run check-mdx` も。

### コンクリート診断士 択一98問の技術内容レビュー（人手）
タグ: [品質]

著作権対応で 8 記事・98 問を原典転記からオリジナル演習問題へ全面書き換えした（2026-07-31）。論点は保っているが、**技術内容の人手レビューは未了**。すでに本番公開済みなので、誤りが見つかったら修正して再デプロイする形になる。対象は `.local/r2/posts/concrete-diagnostician/primary-exercise-01〜08`。

原典照合できない数値は出していない（JIS 規格値は原理を問う形へ、改正年代順は塩化物総量規制の考え方へ差し替え済み）。

### 診断士 textbook 2章の文体が規約と逆（ですます調 → である調）
タグ: [品質]

`textbook-variation` と `textbook-deterioration` が **ですます調**で書かれている。[content-principles.md](../../.claude/knowledge/reference/content-principles.md) の文体ルールでは **教科書は である調**で、同じ診断士の他 4 章（assessment / repair / investigation / maintenance）は である調。資格内で文体が割れている。

副作用として lint の 15-1（同じ文末 3 連続。**ですます調限定**のルール）が 21 件出ており、2026-07-31 に baseline へ計上して CI を通した。である調へ変換すれば 15-1 は対象外になり、規約にも他章にも揃う。**変換したら baseline から該当行を落とす**こと。

機械変換する場合の注意: 「〜ています」→「〜ている」と「〜います」→「〜う」の判別、`<Callout>` 内と引用の扱い、`{/* source: */}` コメントの非対象化。変換後は `npm run check-content-quality` と目視サンプリングで検証する。

### 公開マガジン 9 件がサイト CTA 0 面
タグ: [収益化]

`npm run check-magazine-cta` が検出。note 単品 PDF 併売（`*-takuitsu-pdf` 4件）・note 単品記事（`civil-1-ichiji-ronten` 等 3件）・`civil-2-gakka-kijutsu`・`pe-construction-road-pack` に、サイト内の個別 CTA が 1 面も無い。

`.claude/config/magazine-cta-baseline.json` に理由付きで計上済み（新規の 0 面だけ CI が落ちる）。**サイト導線を付けるか、意図的に付けない設計と確定させるか**の判断が要る。付けたら baseline から削除する（スクリプトが info で知らせる）。

### コンクリート系 CTA 背景イラスト（cta-bg）未整備
タグ: [デザイン]

`cta-bg/*.webp` がコンクリート主任技師・診断士の 2 資格分だけ無く、テーマ色のベタ塗りにフォールバックしている。他資格と並べたときに CTA の見栄えが落ちる。

### 診断士 記事の増補（競合が持ち自社に無い論点）
タグ: [コンテンツ]

競合2ブログ（行ってクラブログ・エナガパパ）にあって自社に無いのは **劣化予測の計算演習・維持管理計画とLCC・基準体系・ひび割れパターン図鑑**。企画は [.claude/plans/doboku-note-purrfect-mist.md](../../.claude/plans/doboku-note-purrfect-mist.md) の Phase 4。

副次効果として、診断士は全記事が本文 8,000 字未満（最長 7,364 字）のため**中間 note CTA の発火条件を満たしていない**。加筆すれば冒頭 CTA に加えて中間 CTA も自動で乗る。

### note サイト送客リンクの UTM バーンダウン（26ファイル・114件）
タグ: [運用基盤]

`check-note-site-utm` の全量実行は Windows で長らく偽 PASS（`join()` の `\` 区切りをパス正規表現で判定していたため常に0件検査）だった。2026-07-28 に修正した結果、既存違反 114 件が露出した：`utm-missing` 81 / `utm-medium`（旧 `inline` を `referral` へ）20 / `bare-url` 13。主に技術士総監の note 記事群。

pre-commit は `--staged` なので当該ファイルを触るまで止まらないが、触ると止まる（`SKIP_NOTE_UTM=1` で一時回避可）。`utm_campaign` は記事 frontmatter の `utmCampaign`、`utm_content` は送客先 slug を使う。規約の真実源は [02_チャネル動線設計.md](../project/03_SNS/02_チャネル動線設計.md) §4。

ソースを直しても note ライブには反映されない点に注意（反映するなら `note-update-body --commit`）。

### note 記事本文のライブ反映（建設部門 UTM 欠落分 残99件）
タグ: [運用基盤]

2026-07-28 に建設部門 note の送客リンク 176 件（UTM 欠落 112・相対パス 41・裸 slug 23）をソース側で是正。うち**ライブでも実際にリンク切れだった 64 件は反映済み**（64/64 実査・`check-note-structure` で要対応 CRITICAL 0）。UTM 欠落のみの 132 件は **33 件まで反映して中断**、残 99 件。リンク自体は機能するため実害は計測欠落（GA4 で Unassigned 化）に限られる。

**再開手順**: 対象リストは `.claude/state/note-utm-live-remaining.txt`（noteId 突合で生成済み・反映済みは除外済み）。

```bash
node scripts/note-update-body.mjs --list .claude/state/note-utm-live-remaining.txt --commit
```

全文置換・有料境界は既定 `試験問題|予想問題` で自動再設定。約 50 秒/件（99件で約80分）。1本ずつ完結するので途中で止めても安全。**反映後は `npm run check-note-structure` で FULL_LOCK/PAYWALL_LEAK が出ないことを確認し、`.claude/state/note-republish-hashes.json` をコミットする**（次回の対象リスト再生成にも効く）。

### search-growth 修正計画の裁定セッション（判断待ち 2,077 URL の消化）
タグ: [運用基盤]

`/google-search-growth` の最新 run（2026-07-23・`.claude/state/improvements/search-growth-latest.md`）が
**UNKNOWN_REVIEW 1,765 件・NOINDEX_CANDIDATE 312 件**を承認ゲート前で滞留させている
（FIX_TECHNICAL / REDIRECT_LEGACY は 0 件＝機械適用できる技術修正は出尽くし）。
**全件裁定は非現実的なので、上位バケットの代表を見て一括方針を決める**のがスコープ:
①UNKNOWN_REVIEW を発生源別（GSC 未登録 / 内部リンク孤立 / パラメータ違い等）に束ね、
バケットごとに「一括 noindex / 一括据え置き / 個別精査」を決める
②NOINDEX 候補 312 件は代表 10 件を実 URL で確認してから一括判断
③決めた方針を `gsc-management.md` の観測・判断ログへ記録（次 run で同じ 1,765 件を再検討しないため）。
seo-fix-planner は audit-only なので適用は人の承認後。

### Brain 施工経験記述キットの検証残（handoff 2026-07-19 抽出）
タグ: [収益化]

Brain「Claude Code 施工経験記述設計キット」の配布物検証が未実施のまま出品済み: ①実スキル `quick_validate.py` の動作確認 ②字数検査 ③Windows/macOS 両環境での動作確認。審査結果反映（status flip）は memory `Brainチャネル2026-07` 側で追跡中。仕様 SSOT: `docs/project/05_プロダクト/brain-claude-code-essay-skill/`

### note カバー Crop-safe V4＋Clarityを代表6件で実装・検証
タグ: [UI・UX] [Codex候補]

note一覧・リンクカード・関連記事・人気記事・マガジンで異なるクロップに耐えつつ、主題と読後価値を小サムネイルで把握できるようにする。既存G2と後方互換なopt-in実装とし、記事・マガジン代表6件だけでパイロットする。日本語は決定論的レンダラー、Codex画像生成は文字なし素材だけに使う。

- **主設計SSOT**: `.claude/knowledge/design-system/note-cover-crop-safe-v4.md`
- **視覚階層の補助仕様**: `.claude/knowledge/design-system/note-cover-clarity-v3.md`
- **実装計画・指示**: `.claude/plans/note-cover-crop-safe-v4-implementation.md` / `.claude/prompts/note-cover-crop-safe-v4-implementation.md`
- **著者属性の厳守**: 著者は**元発注者**であり添削者ではない。カバー訴求は `元発注者の視点で解説` とし、「添削者」「添削者視点」を使わない。
- **完了条件**: variantなし既存G2に差分なし／中央630×454・630×216を含む6cropギャラリー合格／幅320px相当で可読／fit検査対応／通常版を最後に再生成してdebug枠なし。
- note.comはパイロット中dry-runまで。公開差し替えは目視承認後の別工程。

### Brain 2商品の審査後フォローと販売運用（2026-07-22 申請済み）
タグ: [収益化] [技術士総監] [1級2級土木]

両商品とも制作〜Brain公開申請まで完了（Playwright全自動・審査は原則24h・結果はメール）。旧「β商品化」「スキル商品化」タスクは完了につき本エントリへ置換（2026-07-22）。

- **申請済み**: ①施工経験記述キット ¥7,980（`brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY`）／②総監施策バンク ¥9,800（`.../a/b1IDO3UjMgoTZsNWa0JXY`）。ココナラは両商品 listed 済（¥3,000／¥2,500PDF・/links 反映済）
- **審査結果メールを確認**: 通過→販売開始の告知（note入口記事2本の手動公開＝`docs/note/技術士総監/出題テーマ分析-R8地方創生検証/`・`docs/note/1級・2級土木/経験記述-AI設計-無料/`、published:false のまま待機中）。却下→指摘に沿って修正・再申請（編集は `.tmp/brain-post*.mjs` のノウハウ＝memory 参照）
- **カテゴリ変更**: 両記事とも「ビジネス」で申請。Brain には「資格」カテゴリあり→審査通過後に変更検討
- **納品オペ**: ココナラ注文時はトークルームで送付（①=`C:\tmp\claude-code-civil-essay-kit-coconala.zip` 外部URL除去版／②=`.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf`）。Brain は有料エリアの R2 リンクで自動（`storage.doboku-note.com/brain/dist/`）
- **売上記録**: 発生したら `/record-sales`（productId 規約は sales-recorder 台帳済）
- **経緯・検証記録**: 企画〜バックテスト＝[brain-r8-policy-prediction-skill/](../project/05_プロダクト/brain-r8-policy-prediction-skill/)（00〜07・統制run結果=04§6）／①仕様=[brain-claude-code-essay-skill/](../project/05_プロダクト/brain-claude-code-essay-skill/)／出品手順=[brain-publish-playbook.md](../project/05_プロダクト/brain-publish-playbook.md)

### note施策A: 1級一次択一PDF `civil-1-takuitsu-pdf` ¥1,980 を公開（10月上旬・Select 明け）
タグ: [収益化]

**2026-07-16 に「公開直前」まで完了済み**。成果物は全て develop/main にコミット済:
- PDF: `docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/1級土木一次択一-過去問PDF.pdf`（全1162問・図109点・818頁・約12MB）
- 原稿/カバー/hashtags: 同ディレクトリ（`article.md` frontmatter は `paidBoundary: "PDF のダウンロードと使い方"` / `price: 1980`）
- SKU: `src/lib/note-magazines.ts` に `civil-1-takuitsu-pdf`（現在 `published: false` / `noteUrl: ''`）
- ビルダー: `scripts/kindle-specs/e-02.json`（再生成する場合 `node scripts/build-takuitsu-pdf.mjs --spec scripts/kindle-specs/e-02.json`）

**なぜ今公開しないか**: Kindle A系（A-00〜A-06・2026-07-08 公開）が **KDP Select 加入 LIVE＝90日独占**で、同一デジタルコンテンツを note で併売すると規約抵触。独占明けは各冊 `publishedDate + 90日`（A-01=2026-07-08→**~2026-10-06**、`scripts/kindle-published/catalog.json` で全冊の日付確認）。

**実行環境**: この Mac（`/Users/minamidaisuke/doboku-note` に note ログイン済み `.local/playwright-note-profile` あり）で実行。**会社PCはプロキシで note API 遮断のため不可**。develop worktree でやる場合は `.local/playwright-note-profile` を symlink する。

**次にやる手順（前提＝下記1が完了していること）**:
1. **【ユーザー操作】10月上旬・Select 更新日の前に、KDP 管理画面で A-00〜A-06 全冊の「KDP セレクトへの自動登録」をオフ**（真実源 = [Kindle 管理SSOT](../../.claude/content/kindle/strategy.md) §KDP Select）。オフにしたことを確認してから2へ。
2. 本体公開: `node scripts/note-publish.mjs --article "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md" --commit`（draft 確認したい場合は `--commit` なしで先に流す）。**成功すると frontmatter に `noteId`/`noteUrl` が自動 writeback される**＝この `noteId` を3の `<key>` に使う。
3. PDF 添付: `node scripts/note-attach-file.mjs --note <noteId> --file "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/1級土木一次択一-過去問PDF.pdf" --boundary-regex "PDF のダウンロードと使い方" --commit`。**罠: `note-attach-file.mjs` は frontmatter の paidBoundary を読まないので `--boundary-regex` の明示が必須**（省くと既定 `試験問題|予想問題` で境界が見つからず exit 8 中断）。PDF は有料エリア末尾に添付される。
4. SKU flip: `note-magazines.ts` の `civil-1-takuitsu-pdf` を `published: true` ＋ `noteUrl: <公開URL>` に。
5. 検証＋配線: `npm run verify-note-status`（偽成功ガード）→ 公開ページを curl で有料ゲート確認 → `npm run check-note-funnel` → C 記事末尾やもくじに 1級PDF リンクを追加検討（C公開時は未公開だったため未リンク）。commit → push develop。

真実源 = [noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) §10.1

### note施策C フォローアップ: 一次「出る順 合格ノート」の露出調整（任意・売れ行き次第）
タグ: [収益化]

C（`civil-1-ichiji-ronten` ¥1,480・[nec34238ca6d6](https://note.com/dobokunote/n/nec34238ca6d6)）は 2026-07-16 公開済。civil primary/secondary の中間CTAは**転職アフィリ優先の既存設計**のため、C は主に L2 土木もくじ経由で露出（もくじには収録済）。**hero-cta の全体ロジックは触らない**方針（2026-07-16 ユーザー確定＝A案）。数週間の売れ行きを見て露出不足なら、相性の良い一次ガイド記事の**本文に `<MagazineCard id="civil-1-ichiji-ronten">` を個別挿入**（記事単位・転職導線と非競合の外科的調整）。B（`civil-1-r8-bunseki`）も同様の位置づけ。

### civil-1 土木一般編 テキスト章 本文変換（土工/コンクリート工/基礎工 ~19記事）
タグ: [コンテンツ品質]

**Phase 1（config 統合）は完了・PR #395 で develop マージ済**（2026-07-14）。`src/config/category-curriculum.json` の civil-1 に 土工(order 1-49)・コンクリート工(50-79)・基礎工(80-99) を textbookChapters 新設し、配列順を PDF 章順（土工→建設機械→コンクリート工→基礎工→測量→解体工事）に再構成、受け皿だった「分野別対策」fields は廃止。要点ガイド4本は各章 introGuides へ移設済。→ カテゴリページの該当3章は現在「要点ガイド1〜2行」だけ表示（本文記事が空）。

**残（Phase 2-4）= OCR 済み md → textbook site 記事（MDX）の忠実変換**。変換元は `docs/textbook/１級土木施工管理技士/テキスト（土木一般編）/` の第1/3/4章。order レンジは確保済みなので、記事 frontmatter に `textbook_order` を割り当てれば自動的に該当章へ収まる。

- **Phase 2: 第１章_土工.md（4,209行・最大）→ 約8記事（order 1-49・5刻み）**: 土質調査(概説+原位置/室内試験+土/岩分類, 行22-591) / 盛土(592-1456) / 切土・法面保護(1457-1897) / 軟弱地盤対策・排水工法(1898-2353) / 土工計画・建設機械の作業能力(2354-2863) / 道路土工・路盤(2864-3324) / アスファルト舗装(3325-3888) / 舗装補修・品質管理(3889-end)
- **Phase 3: 第３章_コンクリート工.md（2,646行）→ 約6記事（order 50-79）**: 材料 / コンクリートの性質 / 配合設計・レディーミクスト / 施工(運搬・打込み・締固め・打継目・養生) / 鉄筋工・型枠支保工 / 特別なコンクリート・品質管理検査
- **Phase 4: 第４章_基礎工.md（1,561行）→ 約5記事（order 80-99）**: 概説・地質調査 / 土留め・仮締切り / 直接基礎 / 杭基礎(既製杭) / 場所打ち杭

**手順**: 見本 = `.local/r2/posts/civil-construction-1/textbook-demolition/article.mdx`（frontmatter・リード・Callout・ArticleImage・RelatedKeywords・CareerAffiliate・参考資料を踏襲）。変換ツール = `/pdf-to-mdx --exam civil-construction-1` textbook モード（テンプレ `.claude/skills/conversion/pdf-to-mdx/templates/civil-construction-1.md`）。図は元 md 隣の `img/01-YY.png` を記事 `img/` へコピー → `<ArticleImage src=".../{name}.webp">` → `npm run generate-webp`。網羅率95%+・KaTeX（$$は複数行）・表4列以下・参考URLは実在確認済のみ（捏造禁止）。1記事=`/check-mdx`→QA(civil-construction-qa ≥2.0)→即 commit。仕上げ = `npm run refresh-indexes` + `npm run ogp`（check-ogp-coverage 対策）。

**進め方**: 1章=1セッション目安（トークン大）。develop 上で通常コンテンツフロー。関連 = [[project_civil1_textbook_transcription]]（既に両編 OCR→MD 完了・条文数値は原典照合）。既存の「土木一般編（スキャン教材）図タイト化・素材活用」タスクとは別スコープ（あちらは図タイト化＋guide/note展開、こちらは textbook 章本文の site 記事化）。

### civil-1 一次過去問 公式キー deferred 24件（要 pre-H30 原典）
タグ: [コンテンツ品質]

公式正答肢照合は16本0不一致で完了済み。残 = `h28-a`(19件)・`h29-a`(1件=No.38)・`h29-b`(4件=No.3/12/17/21)。**LLM推測厳禁**・キー番号だけの書き換え禁止（設問極性・本文化けと絡む）。

- **h28-a は mass-fix 前に official 配列自体を第2ソース（kakomonn 等）で OCR 再検証**（19件と突出＝OCR誤りの疑い）
- pre-H30 原典PDFの入手: touhokugiken.com / dobokujira.com（h29 学科A/Bは両者に無し→kakomonn等別ソース要）
- 手順SSOT: `.claude/knowledge/reference/exam-content-policy.md` Part 2「過去問の原典照合」＋監査ツール `.claude/state/quality/civil-1-primary-tools/`（diff-keys/check-marks/check-contradict）

### 過去問 解説品質の残指摘クラスタ（数値上合格・要照合）
タグ: [コンテンツ品質]

品質採点は failed 0 だが、個別指摘として記録済みの要照合項目（official key／原典照合が要る・LLM推測禁止）:

- civil-1 `secondary-construction-plan-past-problems` No.9(1): 解答欄記述が省略
- civil-2 `secondary-r06` 問8: 画像 `{/* TODO */}` 未挿入で本文欠落
- 総監 `h21-primary` Ⅱ-1-31（自己矛盾）・`h22-primary` Ⅱ-1-22（下書き跡）・`h28-primary` I-1-9/25/28・`h30-primary` I-1-24
- pe-first-stage `r03-construction` Ⅲ-2/Ⅲ-18（正答矛盾）・`r04-basic` Ⅰ-2-4（ハミング距離解説破綻）

### モバイル可読性リライト 第1弾
タグ: [コンテンツ品質]

機械ラチェット基盤は整備済み（`content-rules.json`＋`lint-mdx-mobile --all`＋週次 `check-content-quality`）。baseline に grandfather された既存違反を GA4 人気度順にリライトして漸減させる。

- **優先上位**: `civil-construction-1-guide-strategy`（3-1×29・#1人気）／`pe-comprehensive-management-keyword-2026`（3-1×48）／`civil-construction-1-secondary-experience-writing-guide`（1-4×48）／`civil-construction-2-secondary-r0X`／`pe-construction/*-exam-themes` 残11本
- **手順**: レポート上位を group 対応の `/quality-cycle` へ。表→非表・入れ子→フラット・長段落→改段。1バッチ 10-20 記事、完了ごとに `npm run update-content-quality-baseline`
- **注意**: civil textbook の規格表・配合表は override 除外済み。過去問の年度×選択肢表は無理に崩さない

### guide-career / アフィリ記事の文末単調（rule 15-1）copy リライト
タグ: [コンテンツ品質]

BuildJob アフィリスプリントで注入された copy が rule 15-1（文末「〜です。/〜ます。」の連続）に触れている。mechanical-only 範囲外で copy 文言変更が必要。現状（`node .claude/scripts/lint-mdx-mobile.mjs <file>` で 15-1 実測）:
- `civil-construction-1-guide-age-career`（5件）／`civil-construction-1-guide-career-agent-comparison`（3件）／`civil-construction-2-guide-young-career`（3件）
- **手順**: 各記事の該当段落の語尾に変化をつける（体言止め・接続で連結・「〜ます。」→「〜ます」等）。数値・主張・アフィリ配線は不変。完了後 `npm run update-content-quality-baseline` で baseline 更新。要再計測（他 career 記事にも波及の可能性）

### 過去問図 rescan-need-source 9図（要外部/別原典）
タグ: [コンテンツ品質]

進捗の生きたビュー＝管理画面ギャラリー（`npm run admin`→記事図版タブ→「対応」フィルタ）で残数を見る運用。真実源 `.claude/knowledge/reference/figure-provenance.md`、手順 `/figure-recrop`。

残 = h29-b-fig-02（要H29第2次B原典）／h27-a-fig-01（要H27原典）／pe-construction 4（fig22/27/04/05＝要白書PDF等）／concrete-chief 3（steel-carbon-h29・bingham-flow-h30・bingham-shear-r04＝要該当年度原典）。台帳に理由記録済。

### civil-1 secondary 合格後の残存 follow-up
タグ: [コンテンツ品質]

8本全合格済みだが scores.json の qualitative_comment に記録した改善余地: earthwork 表2.9 の散文詰込13セル解体（最優先）・入れ子リスト群のフラット化・factual table のインライン出典・qm-basics/past-problems の民間ソース不在。

### 性能: CI PSI 再計測（mobile 追加）
タグ: [UI・UX]

①`pe-comprehensive-management-exam-index` desktop Perf 56・TBT 2521ms の再現確認（Mermaid 出現0の軽構成＝計測スパイク疑い。再現なら client JS を profiling）②**モバイル PSI が未計測**→CI 供給で計測開始（外部Google API＝ローカル不可）③CLS 超過2ページ＝AdSense 枠の width/height 明示。実装: `.claude/config/psi-urls.txt`・`psi-config.json`。

**EXP-005を同時に正式start**: `.claude/state/experiments.json` では2026-06-26から `proposed` のまま。worst 3（6,452 / 6,226 / 5,776ms）のLCP要素を特定し、代表1ページへ外科的施策を適用→モバイルLCP 2,500ms未満を確認してから共通docsテンプレートへ展開する。RSCへの安易な`next/dynamic`適用は禁止。

### 回遊・note 動線 P4-P7
タグ: [UI・UX]

P1-P3（GA4 計測基盤・NextStepNav・季節モード note CTA）は実装済み。

- **P4**: `keyword-relations.json`（598KB・未活用）から RelatedKeywords 未記述の keyword 記事へ build 時 top-N 自動挿入 fallback。要: 挿入品質の監査＋PE keyword 面 A/B
- ~~**P5-a（9/1 までに必須）**: キャンペーン自動復帰後の arm 設計見直し~~ → **2026-08-04 完了**。
  9/1 以降の civil 記事面を **建設JOBs 100%** にした（`POST_CAMPAIGN_AB_ENABLED = false`・
  50/50 A/B は停止）。tsx で 8/15・9/5 のビルド時刻を与えて分岐を実コードで確認済み。
  根拠と再開手順は `affiliate-operations.md` §6/§6.5 裁定ログ 2026-08-04
- **P5-b（次の一手・変更ではなく計測）**: **7/28 の面再編（記事末 300×250・本文中間ネイティブ
  カード）は main 到達が 7/30 で、GA4 の計測窓〜7/29 に 1 日も入っていない**。
  `BuildJob-endbanner` 表示 0・`article-mid` 表示 1 がその証拠で、新レイアウトの良し悪しは
  まだ何も測れていない。**面をこれ以上いじる前に** 7/30 以降を窓にした
  `fetch-ga4-cta-clicks -- --by-label` / `--by-placement` を取り直す（GA4 API＝CI/CD 供給）。
  取り直すと `report-buildjob-affiliate` が面別 CTR を実値で出す（窓が揃わない間は上限のみ表示）
- **P5**: アフィリ EPC 判定（~2026-09）。基準は `affiliate-operations.md` §6.5 に新設済。**着手前に 2 点確認**: ①現状は確定成果 0 件（累計 137click）で**分母規律未達＝判定不能**、分母供給には A8 単月取得（`a8-ui:fetch -- --month`）が前提 ②9/1 以降は 50/50 A/B を停止して**建設JOBs 単一 arm**にしたため、判定は arm 間比較ではなく**時系列比較**（8 月の BuildJob ↔ 9 月以降の建設JOBs）になる。期限で無理に決めず、判定不能なら §6.5 の裁定ログに据え置きを記録する
- **P6**: 高購買意欲ページへ MDX 本文内 `<MagazineCard>` の個別商品導線補強。要: `sales-log.json` で対象ページ特定が先
- **P7**（🟢）: concrete 系の L2 もくじ新設（note 商品拡充が前提）

### 総監マガジンの歩き方 L1配線 ほか
タグ: [収益化]

公開（nc874692256bb）＋総監もくじ冒頭配線＋**L1配線（2026-07-14 commit 6eeccae62・`docs/note/共通/コンテンツ総合案内/article.md` へ配線＋live反映済）**は完了。残 = 孤児下書き nbf2a6de8f9c9 の手動削除のみ（note.com ダッシュボード・下書き削除ツール制約で手動）。

### note 導線 後続配線（Fable P1 残）
タグ: [収益化]

- **トンネル・都市計画パック**: 掲載文は作成済（PACK-02/PACK-03 dir）・マガジン実体未作成。再開 = `note-magazine-create --dir <PACK-02|03> --commit` → `note-magazine-add-articles --target <新key> --from m0f3bc3933454,<トンネルm5da4b560d8be|都市mc8bd949f1f51> --commit`（各29記事）→ note ヘッダー `_cover.png` 生成 → note-magazines.ts published:true+noteUrl（道路パック mebca45bcc745 と同レシピ）
- **一次→二次 季節CTA切替**: 1級土木 guide-strategy（271人・CTA変換0.4%）を二次・経験記述向けへ（7/5 一次後＝着手可）
- **建設→総監ブリッジ記事**: 建設合格者≒総監来季見込み客。無料記事1本を建設もくじ＋L1へ（総監→建設は張らない）
- 道路パックの finer placement（道路 secondary/keyword ページ・任意）

### BK-09/10 R08予想問題集の生成
タグ: [収益化]

`power-civil`(BK-09 電力土木)/`railway`(BK-10 鉄道)の2科目に R08-yosou が未生成（他10科目は収録済）。価格確定→note 公開(published:true)はユーザー、過去問15記事/科目は試験後。

### BK-I 旧4本の後処理
タグ: [収益化]

カットオーバー完了済。旧4本(R03/04/06/07)の非公開化（note 仕様で下書き戻し不可→孤児化保留）・各 article.md の `noteUrl`/`noteId`/`notePublishedAt` を新IDへ更新してコミット。

### 1級 完全攻略パック 公開後の仕上げ（note実機）
タグ: [収益化]

100本公開＋マガジン収録＋SKU published:true＋**無料23本への冒頭CTA live反映**（2026-07-14 funnel audit `--live` で civil 冒頭ドリフト0・サンプル3本 API 反映 True 確認）は完了。残 = ①PDF添付（civil 用 pdf-spec 設計→`magazine-to-pdf.mjs`→`note-attach-magazine-pdfs.mjs --commit`・Windows必須）②各記事へネイティブ目次挿入 ③`note-publish.mjs --schedule` の予約投稿 selector 修復 ④stray 下書き3件削除（n3e2475d0b6d5/na5b4cef4fcfe/nfc608702b477）。

### note 公開記事の bare /docs/ URL インライン化（実残: draft のみ）
タグ: [収益化]

**2026-07-14 実体照合で旧「A系6本（防災/担い手/GX/老朽化/国土形成/建設DX）」は陳腐化と判明**（当該記事の source は修正済み＝現 `check-note-site-utm` 違反リストに不在）。公開/free の唯一の実残だった **立場別模範論文の選び方**（essay-persona-guide の bare URL）は同日インライン化＋live反映完了（na030d9cb3060）。
残 = **draft 3本**（再受験対策・口頭試験対策・記述式の書き方）の bare/utm-missing /docs/ URL。**未公開＝live反映不要**、公開時に是正（検出＝`node scripts/check-note-site-utm.mjs`）。別枠の「note→サイト bare-url UTM バーンダウン(442件)」とは独立。

### note→サイト bare-url の UTM バーンダウン（442件）
タグ: [SNS・マーケ] [Codex候補]

`docs/note/**` の既存 `doboku-note.com/docs/` 送客リンク442件が bare-url のままで、note カード化により UTM が落ち GA4 Referral 計測に乗らない（新規は `check-note-site-utm --staged` で阻止済み）。bare-url を `[アンカー文言](url?utm_source=note&utm_medium=referral&utm_campaign={記事slug}&utm_content={送客先})` へ変換。アンカー文言付与に判断が要る半手動（`scripts/add-note-utm.mjs` は要検証）。バッチ・記事単位で消化。

### 競合の勝ち型を policy 化（SNS 投稿型カタログ拡張）
タグ: [SNS・マーケ]

SNS 競合実地調査（2026-07-04・`07_競合調査.md` SNS節）で surface した3型: ①聞き流し一問一答（YT・日建学院47k再生実測）＝**16:9テンプレ実装待ち** ②合格後キャリア/現場リアル リール＝**運営者の一次情報素材待ち** ③**お悩み相談回答＝素材不要で先行 policy 化可**（既存FAQ/キーワードから素材化）。着手時に該当 writer エージェントの参照を更新。真実源 `content-angle-policy`／`00_SNS整理マップ §型カタログ`。

### SNS 競合モニタリングの反復化
タグ: [SNS・マーケ]

**取得（fetch）はメインループが agent-reach スキルで実施**（サブエージェントは Bash 不可＝[[agent-bash-permission]]）。分析は新規 Evaluator `sns-research-analyst`（corpus を読んで頻出論点・刺さる切り口・gap を構造化抽出）。cadence 週次。X は**投稿アカウント @doboku373 を read に使わない**（[[x-suspension-guardrail]]）＝当初「未ログイン公開読取」は X の 404 遮断で実行不能のため、**運営者個人アカ `uruhayato373` の agent-reach twitter CLI 経由 read** がその代替（投稿アカ温存の目的は同じ・真実源 x-post-policy §11.6・2026-07-20 稼働 `scout-x-competitors.mjs`）。競合SoT = 価格/品揃え `09_販売チャネル競合分析.md` §B・エンゲージ/型 `07_競合調査.md` SNS競合節。エージェント追加時は agents-registry 更新＋check-doc-coupling。

### SEO 権威性トラック（GSC 流入の唯一残るレバー）
タグ: [SNS・マーケ]

on-page は全数検証済みで健全＝追加微修正はしない（真実源 `gsc-management.md`）。実行可能タスク:
1. **独自データ資産化**: 1級・2級土木版 頻出論点ランキング（civil は past-exam-backlinks 未収録＝論点タグ付けが先）・被リンク獲得の外部発信（note/SNS で総監ランキング紹介）
2. **8月に index 率再測定**: 7/1 の demote 回帰（81.6%→74.6%）が継続なら総監キーワード薄ページの統合を検討（[[no-new-keyword-pages]]＝新規でなく統合）
3. 受験期の高インテント head クエリの GSC 監視・月次 `/gsc-review` 継続

### SEO 品質ゲート後続（PR #390 マージ後の残タスク）
タグ: [インフラ・計測]

SEO 品質ゲート実装（PR #390・handoff `2026-07-13-seo-quality-gates.md` は削除済・git 履歴参照）の後続。ゲート本体は develop 済み。残:
1. **deploy 後の GSC 監視**: `develop→main` deploy で canonical/OGP 修正が本番反映＝サイト全ページ canonical 一斉更新の再クロールが走る。**コアアップデート期を避け、直後2週間は GSC 日次を監視**（gsc-management.md 2026-07-10 の教訓）。
2. **GSC page×query 実データ確認**: 初回検証 2026-07-15 完了（workflow_dispatch で `gsc-page-query-2026-07-15` 取得・窓 6/14–7/12）。Pattern 7 site-wide 検出 3 件は**すべて同一ページの #fragment 誤検出＝カニバリ実証 0 件**。残: (a) メタ改善は少数 URL の 14〜28 日実験に限る、(b) **8/31 BuildJob キャンペーン終了後に civil-construction-1 career 26 本を page×query で再測定**。先行シグナルは `guide-1-vs-2` ↔ `guide-grade-comparison` が同一クエリ「1級 2級 土木」で共に表示（impr 1/3・pos 73/80、閾値 impr≥5×pos≤30 に未達）のみ。年収系4本（salary-up/salary-by-role/allowance/career-salary）・辞める系3本（quit-or-stay/quit-honne/career-consultation-before-quit）はクエリ競合の観測なし。実証されたペアのみ統合（301 or canonical）、感覚では削らない。
3. **orphan/unreachable 6本の gate 昇格**: `pe-comprehensive-management-r8-essay-theme-*` 6本は現状 warn（意図的未リンク）。導線設計を決めたら check-seo-build の gate へ昇格。
4. **robots / OAI-SearchBot の ADR**（v2監査 §8.3）: ChatGPT Search 露出を取りに行くか。training bot は block 維持、search/user bot の許可可否を ADR で決定。robots.txt/Cloudflare はユーザー承認事項。

### UIコードベース静的監査 残フェーズ（Phase4 A11y ＋ P3 整理）
タグ: [UI・UX] [Codex候補]

静的監査 `docs/reviews/2026-07-11-static-ui-codebase-audit.md`（作業指示書・SSOT）のうち、Phase 1〜3（UI-002/003/004/005/006）は develop 済み。残:
1. **UI-007 P2**: Header メニュー/drawer の dialog・focus 管理（開閉トラップ・閉状態の dialog semantics 除去）
2. **UI-008 P2**: `Callout` type を閉じた union へ変更＋未知 type を content lint で検出
3. **UI-009 P2**: Knip 報告のデッド UI/依存整理（`LinksHubTile`・`next-themes`・`date-fns`・fontsource は要個別確認、一括削除しない）
4. **UI-010〜012 P3** ＋ **UI-001 完了確認**（仕様書と現行実装の残ズレ同期）
- 実装順・完了条件は監査文書の各節参照。

### 計測基盤 Tier 2/3 ＋ GA4 UI 設定
タグ: [インフラ・計測]

Tier 1（NoteLink 計測・cadence 化・bot 監査 CI 等）は実装完了。残:
- **Tier 2/3**: カスタムパラメータ・検索/scroll イベント・アフィリA/B の label 取得・GA4↔GSC 突合／AdSense RPM 取込・sales×流入 attribution・送客リダイレクタ・A8 EPC
- **GA4 UI（ユーザー手作業）**: 内部トラフィック除外・参照除外・既知ボット除外 ON・カスタムディメンション登録確認
- **Playwright UI CSV**: `fetch-ga4-ui-csv.mjs` は未ログイン検証のみ。ログイン済み実UIでレポート名・ディメンション・指標・ダウンロードメニューの正式ラベルを確定し、fixtureと回帰テストへ反映（API優先方針は維持）
  - **故障記録（2026-07-30 実測・`check-gsc-ui-due` が DUE を出し続ける原因）**: 3 ユニットとも失敗。
    `trafficAcquisition` は `csv-menu-ambiguous`（ダウンロードメニューの候補が一意に決まらない）、
    `landingPage` は `report-not-found`（候補 0）、`events` は `report-not-found`（候補 11＝絞り込めていない）。
    上のラベル確定作業がそのまま修正になる。**GSC UI 側は正常**（2026-07-30 に 10 ユニット中 7 取得・失敗 0）
- ~~**A8 単月取得（`a8-ui:fetch -- --month`）**: 未実装~~ → **2026-07-28 に実装済み**
  （`d584ef320` ＋ `e347cf1eb` で 2026-01〜07 をバックフィル）。2026-08-04 に本節の
  「未実装」は誤りと判明。`a8-results.json` には月次レコードが入っている。
  **EPC が出ないのはツールではなく成果がゼロだから**＝全レコードが `revenueYen: 0` で、
  唯一の発生 1 件（¥50,000）は cancelled。分子は「実装」ではなく**成約**で埋まる
- 真実源（file:line・Tier 詳細）: [measurement-infra-enhancement.md](measurement-infra-enhancement.md)

### サイトアクセス×収益化 戦略の深掘り論点
タグ: [SNS・マーケ]

「検索→サイト→note」が実収益回路と判明（サイト流入84%オーガニック・CTAクリック構成が売上と一致）。土木は同回路が未稼働＝最大の伸びしろ。残（全未着手・別PC）: ①勝ち記事の型抽出（GA4 page×cta-clicks で総監の勝ちパターン→土木移植）②土木SEOビルド計画（textbook 34本×テキスト13章ギャップ表）③土木のサイト→note導線整備 ④売上×イベント相関 ⑤note内発見性の手動検証 ⑥AI検索対策。

### SVG図版 dual-use パイプライン残
タグ: [コンテンツ品質]

PR #269（カタログ）/#270（SNSレンダラー）済。残 = Phase4 記事への `<ArticleImage>` 埋込（orphan 49点・**ユーザー保留中**）・SNSパイプライン残（IG管理別カルーセルのオーケストレーション/コピーGenerator/Evaluator配線）・doc-sync 宿題（`build-svg-catalog`/`render-figure-sns` を reference 索引へ追記）。

### 記事構成ルールの SSOT 化 + サブエージェント管理
タグ: [エージェント・SSOT]

1. `.claude/knowledge/reference/article-structure-guide.md`（新設予定）<!-- doc-ref:ignore --> を起草 — 基本構成・文字数目標・Callout 使い方・見出し構成・CTA の型（たけブログの知見反映 → reference-sites.md）
2. `.claude/knowledge/reference/todo-writing-guide.md`（新設予定）<!-- doc-ref:ignore --> を起草 — todo 記述フォーマット・優先度表記
3. `civil-guide-writer` エージェント新設（article-structure-guide を真実源に）
4. `todo-planner` に todo-writing-guide と backlog の参照を追加

### `note-meta-lint` をNode 18/20対応へ修正
タグ: [インフラ・計測] [Codex候補]

`scripts/note-meta-lint.mjs` が `node:fs/promises` の `glob` を直接importしており、Node v20.19.0で起動時にSyntaxErrorとなる。`package.json` のサポート範囲はNode 18以上なので、再帰`readdir`または既存依存へ置換する。

- 再現: `node scripts/note-meta-lint.mjs --help`
- 完了条件: Node 18/20で起動、対象探索結果が現行意図と一致、fixtureまたは純関数テスト追加、既存lint/type-check成功
- 新たなglob依存を追加する場合は既存依存との重複を確認する

### 過去問データ整合: 総監 JSON h30 欠落 + docs 数値不整合の是正
タグ: [コンテンツ品質] [エージェント・SSOT]

2026-07-17 の過去問カバレッジ調査で確定した**データ層の不整合**（サイト記事は無傷。SoT/戦略docの数字ズレ）:
1. **総監 `src/config/exam-questions.json` が h30 欠落** — 実測 h21〜r07 のうち h30 のみ無く **16年度640問**。一方サイト記事は `h30-primary/secondary`（40問）を含む17年度。IG 論点パック SoT と Kindle B「平成合本 h21-h30 400問」宣言がこの JSON 由来なら**平成合本が実は h30 分不足の疑い**→ 要確認・補完（原典 `docs/textbook/技術士（総監）/過去問/` に h30 PDF あり）
2. **docs 数値の三重不整合（総監）**: `ig-carousel-skill.md`＝16年度640問／`.claude/content/kindle/strategy.md` 本文＝18年分／同表＝17年680問。物理在庫は17年度。正へ統一
3. **技術士一次の総問数不一致**: `.claude/content/kindle/strategy.md` 本文「490問」 vs D-01+02+03 表・note article「560問」。実装は560問＝本文490を是正
真実源照合は `src/config/*-exam-questions.json` の実カウント。

---

## 🟢 低 — 時期未定

### A8 月次バックフィルと不足クリック 13 の特定
タグ: [インフラ・計測]

単月取得（`--month`）は 2026-07-28 に実装・実走完了（下の旧タスクは解決済み）。残作業は 2 つ:

**バックフィルは 2026-07-28 に実施済み**（2026-01〜2026-07）。判明した実態:
01〜04 は doboku-note の成果データが実質ゼロ（01/02 は CSV ボタンすら出ない＝データ皆無、
03/04 は自社案件のクリック 0）、**05 から稼働し 06 が最初の本格月**。
現在 `a8-results.json` は 05〜07 の 8 records。

残作業:

1. **EPC の分子と分母で期間を揃える**: `report-buildjob-affiliate` が GA4 を分母に使っているのは
   確認済み（2026-07-28）で、窓外の月の報酬が混ざる不具合も修正した。ただし
   **分子＝月全体の確定報酬 / 分母＝GA4 の 28 日窓クリック** というズレが残り EPC は概算のまま
   （検証: 6月に ¥50,000 が確定した想定で EPC 7,143 円と出る。市場平均 942 円の 7.6 倍）。
   揃えるには GA4 by-label を月次で取る必要があるが、`fetch-ga4-cta-clicks` は `--days N`
   （N日前〜今日）しか無く、GA4 API は会社 PC のプロキシで叩けない＝**CI 供給側の対応**が要る。
   A/B 勝者判定の前に解消しておく（誤った EPC で勝敗を決めない）
2. ~~**2026-06 の不足クリック 13 の説明**~~ → **2026-08-04 解消**。単月取得で 2026-07 を
   引き直したところ `hasShortfall: false`（不足 -18＝allowlist の方が多い＝取りこぼしなし）・
   `missingProgramCandidates: 0` で、未登録プログラムの疑いは消えた。
   残るのは逆向きの `exceeded`（口座横断に stats47 が混じる）だが、これは A8 にサイト切替が
   無い以上**構造的に必ず起きる**。`check-a8-report-due` は超過がサイト別クリックの 50% 以下なら
   [想定内] として比率だけ出すよう変更済み（毎回 [要対応] を出す偽赤をやめた）

### （解決済み）A8 レポートの期間指定（月次内訳の自動化）
タグ: [インフラ・計測]

`/a8-report` は実装・実走済みだが、**A8 は期間を URL クエリで制御できない**（`start_date`/`end_date` は無視される＝2026-07-27 実測）。
現状は A8 の既定期間（年初〜当月の累計）しか取れず、`a8-results.json`（月次キー）へは書けていない（`notAttributable` に退避）。

**手順（1 の実機観察が未了。2026-07-28 に着手したが A8 セッション切れで停止＝ログインは人）**:

1. `npm run a8-ui:fetch -- --dry-run --probe-period --headed` で期間フォームの実機 DOM を観察
   （2026-07-28 に committed 化済み・read-only で入力もクリックもしない）。
   `input name=start` / `end` は**月レンジと日レンジの 2 組**あるため、どちらを操作するかは
   この出力で確定する（推測でセレクタを書かない）
2. 観察結果を `.claude/config/a8-report-automation.json` の `a8.periodForm` として記述
3. `scripts/lib/a8-report-browser.mjs` に `setPeriodMonth()` を追加（config 駆動・一意に定まらなければ
   `dumpFailure` で停止）。`fetch-a8-ui-csv.mjs` に `--month YYYY-MM` を追加し、export ボタン探索の前に呼ぶ
4. **fail-closed 検証**: DL 後に `unit.period.singleMonth !== requestedMonth` なら `period-mismatch` として
   normalize に流さない（ファイル名が唯一の期間証拠）。`normalize-a8-csv.mjs` 側でも不一致 run の upsert を拒否
5. 対象は `site-summary`（doboku 分離済みの月次実績）と `program-detail`（プログラム別の月次内訳）の 2 つに限定
6. 完了条件: `npm test`（a8-report-csv）green ＋ 実走 1 回で `a8-results.json` に `2026-06::*` の records が入る
   ＋ `npm run check-affiliate-wiring` green

**2026-07-28 に全ステップ完了**（`d584ef320`。`e347cf1eb` で 2026-01〜07 をバックフィル済み）。
`a8-results.json` には月次キーの records が入っており、分母は供給されている。
「残作業はフォーム操作のみ」は当時の途中経過で、**2026-08-04 時点では残作業なし**。

したがって EPC が出ない原因は分母ではなく**分子**＝確定報酬が全月ゼロであること
（唯一の発生 1 件 ¥50,000 は cancelled）。ここは実装では埋まらず、成約が要る。
判定基準は [affiliate-operations.md](../../.claude/knowledge/reference/affiliate-operations.md) §6.5。

### 画像系 pre-render ワークアラウンドの再検証（Opus 5 vision）
タグ: [インフラ・計測]

Anthropic の Opus 5 プロンプトガイドが「旧モデル向けに仕込んだ vision ワークアラウンドは不要になっている可能性があるので再検証せよ」「vision はモデル自身が切り出し・拡大・目視確認できるツールを持つときに最も精度が出る（思考量を上げるより費用対効果が高い）」としている。

現状、図まわりは親が**事前に**レンダリング・抽出してからエージェントへ渡す設計になっている。この前処理が今も必要か測る。

- 対象: `civil-exam-figure-extractor`（事前レンダリング済みページ画像を Read して bbox spec を返す）、`scanned-textbook-transcriber` / `scanned-figure-crop-auditor`（`pdfimages` で抽出・回転・分割した単ページ画像を渡す）、`figure-crop-worker`
- 測り方: 既知の正解がある数枚で「従来の事前レンダリング経路」と「エージェントが自分で開いて拡大・クロップして確認する経路」を突き合わせ、bbox 精度と総トークンを比較
- 簡素化できるならスキル側の前処理ステップを削る。できないなら**なぜ必要か**を各エージェント定義に1行残す（次に同じ検討を繰り返さないため）
- 根拠: <https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5>

### 既存画像 grandfather 135件の圧縮バーンダウン
タグ: [UI・UX] [Codex候補]

画像品質ゲート導入前から残る大容量PNG/JPG/WebPを、アクセス数と削減可能容量の高い順に段階処理する。新規画像は既存ゲートで防止済み。

- `quality:audit` の画像レポートを起点に対象を再計測
- noteマガジンカバー、販売画像、外部参照画像など誤検知を除外
- `generate-webp`または既存の用途別変換経路を使用し、寸法・透過・OGP参照を維持
- 1バッチごとにbuild・画像参照・差分容量を検証し、baselineを漸減

### 管理画面に「note 要再公開」列を追加
タグ: [インフラ・計測]

`check-note-republish`（本文の再公開ドリフト検出・2026-07-22新設）は CLI＋週次PDCA で運用中。`tools/admin-app` の記事タブに「要再公開」列を出して目視管理できるようにする（任意・polish）。

- **データ源**: `npm run check-note-republish -- --json`（`{synced, drift, unknown, driftFiles, unknownFiles}` を返す）。admin は既存 CLI を child_process 実行しガードは CLI 側に残す方針（tools/admin-app/README.md）に沿う
- CLI＋週次で運用は回るため優先度低。真実源 → note-funnel-architecture.md ツール表・memory の再公開ドリフト機構

### ココナラ 単発コンテンツの追加展開（暗記ノート等・売れ行き次第）
タグ: [収益化][ココナラ]

> [!note] 前提の更新（2026-08-05 再構成後）
> 現行は **実売10本**＝S1/S2/S3 ＋ C8/C9（模試）＋ C2'/C3'（模範答案セット）＋ C10/C11（教材フルパック）＋ C12（プレミアム＝教材＋添削¥15,000）。
> **C1/C4/C5/C6/C7 は archived**（恒久廃止・フルパック限定収録 or セットへ統合）。
> **2026-08-06〜08-16 は運営者不在で全件 受付休止中**（8/17 に `npm run coconala-pause -- --resume --absence --commit` で復帰）。

2026-07-18 にコンテンツ PDF を **C1〜C9 の9本**、加えて **S1/S2 サービス＋S3 答案作成（ヒアリング→文章化・¥8,000）** を公開＝計12商品（S1/S2/S3＋C1-C9）。冗長回避で**除外した源**＝2テーマ組合せ大全・想定工事バンク・完全攻略パック・直前暗記ノート・一次（KDP Select ロック）。C8/C9＝二次予想模試（Red Line #10 例外運用）。

**売れ行きを見て検討**:
- **S3 上位版（4テーマ・¥16,000〜）**: ちゃんさと¥32,000×132 の上位帯。評価が付いたら `coconala-sakusei` の 4テーマ版を追加（作成モードは実装済み）
- **S3 価格引き上げ**: 評価20件で ¥8,000→¥12,000〜16,000（kit §2）
- **一次 予想模擬試験（本丸・要設計）**: 建築版 ¥18,000×1,730件の最大ヒット帯。土木一次は過去問1,162問資産（`civil-1-exam-questions.json` 等）から作れるが、**KDP Select 一次過去問PDF との重複を回避する設計が必須**（模試＝本番形式の予想・過去問PDF＝全問解説で別物にする線引き）。着手前に KDP 抵触を確認。
- **模試の Red Line #10 監視**: C8/C9 模試が売れる一方で**会員ベース層が伸びない兆候**（模試購入が会員ベース層純増を継続的に上回る）が出たら、模試の内容・価格を再判断 or 撤退。予想の毎月更新版は会員限定を堅持（計画 §4 Red Line #10 例外決定ログ）。
- 暗記ノート（穴埋め・¥1,000〜）や PWA 過去問との連携

手順は [coconala-operations.md §8](../reference/coconala-operations.md)・`build-coconala-content-pdf.mjs`（C8/C9 は `generated:true`）・作成モード=`/keiken-tensaku --mode sakusei`。

### コンクリート主任技師 H24/H25 skip 分の補完＋R6/R7 拡張
タグ: [コンテンツ品質]

2026-07-17 に H24（26問）・H25（12問）を site へ追加（計303問・H24〜R5）。ただし 2022年版底本の**OCR品質がまだらで、以下は復元不能/不確実として収録せず skip**。**書籍原典（コンクリート主任技師2022）を再入手できれば補完可能**（現状ローカルに原典PDFなし＝照合不可）:
- **H25 skip 18問**: Q1,3,4,5,7,8,9,10,12,13,14,15,16,17,19,20,21,26（選択肢文のOCR破綻・表崩れで数値確定不可・図が別問題と判明・解答表と技術判断の conflict 3問）
- **H24 conflict skip 4問**: Q14（低確度・肢が技術的に擁護可能で解答表と齟齬）,Q16（「鉄筋腐食→硫酸塩」等OCR再構成）,Q17（JIS A5308 計量誤差表を数値検証できず）,Q18（標準偏差値がOCRで入替わり解答表と数学的に不整合）。answer key に合わせて再構成した本文の公開は避け撤去済み
- **年度拡張**: R6・R7 は原典スキャン未入手（書籍入手が前提）
- **表記統一（軽微）**: 既存 cce に「令和1年度」と「令和元年度」の混在（同一年=R1）。片方へ統一

真実源 = [exam-content-policy.md](../reference/exam-content-policy.md) §コンクリート主任技師。

### 過去問 年度拡張の未整備分（原典未入手・2026-07-17 調査）
タグ: [コンテンツ品質]

カバレッジ調査で判明した「取りに行けば整備できるが原典が未入手」の過去問。**いずれも公式サイト（engineer.or.jp / touhokugiken 等）や書籍から入手可能性はあるが、現状ローカルに原典なし**。着手は入手が前提・優先度は流入価値で判断:
- **技術士第一次試験 H30以前**: サイトは R01〜R07（560問）のみ。H30以前は engineer.or.jp で公開されているが**正答が合本PDF（`_12` 形式）で別パイプライン要**（[exam-content-policy.md](../reference/exam-content-policy.md) §技術士第一次試験）。RelatedKeywords も当面省略中（建設一次の論点キーワードページ未整備）
- **1級土木 第二次検定 H26〜R02**: サイトは二次 R03〜R07 のみ（一次は H26〜R07 完備）。H30〜R02 は**旧「実地試験」形式で二次原典がリポジトリに無く入手先の記録もなし**。現行 R8 対策への直接価値は限定的（旧形式）＝学科記述の論点素材としての価値で判断
- **2級土木 R02以前**: サイト・原典とも R03〜R07 のみ。旧学科/実地は原典なし・拡張計画の記録なし
- **コンクリート主任技師 R6・R7 / H24・H25 skip 分**: 上記「H24/H25 skip 分の補完＋R6/R7 拡張」参照
- **コンクリート診断士**: 98問整備済みだが権利方針未決で全非公開 → 🟣「著作権方針の決定（3択）」参照

### lint 9-16（Callout 密度超過）22記事のバーンダウン
タグ: [コンテンツ品質] [Codex候補]

構造品質ルール一括設計（2026-07-15）で新設した lint `9-16`（Callout 個数が guide/pillar>12・その他>3）の既存違反22記事を baseline 登録済み（`.claude/state/quality/lint-baseline.json`・漸減対象）。内訳: 建設部門 exam-themes 13・コンクリート主任 textbook 3・経験記述系4・総監2。

処置は記事ごとに「個別ハイライトに絞り、残りを散文・SpecSheetList・表へ統合」（content-principles §7.1-5）。**仕様が固まったバルク＝Codex/サブエージェント一括候補**。対象一覧は `node .claude/scripts/lint-mdx-mobile.mjs --all --report` → latest-report の 9-16 行、または baseline JSON。着手時は各記事 lint 個別実行で 9-16 と 15-1 を 0 に、`check-content-quality:ci` 緑を確認。

### Tailwind transform 変種が本 build で無効な件の根因調査
タグ: [UI・UX]

`group-open:rotate-90`（合成 transform が `--tw-rotate` リセットに潰れる）も `[transform:…]` arbitrary variant（JIT 未生成）も回転が効かない（2026-07-14・アコーディオンで発覚、[[reference_tailwind_transform_broken]]）。今回は globals.css の素 CSS `.disclosure-chevron` で回避済み。根因は `@layer` 順・PostCSS 設定・Tailwind の base reset が unlayered で utilities を上書きしている疑い。放置すると将来 `rotate-*`/`translate-*`/`scale-*` を変種で使うたび同じ罠。tailwind.config / globals.css の layer 構成を点検し、直れば独自 CSS を Tailwind へ戻せる。急がない（回避策が機能中）。

### 総監キーワード cem-qa 2.2–2.5帯 40本リライト
タグ: [コンテンツ品質] [Codex候補]

合格マージン大（2.2:2/2.3:27/2.4:7/2.5:4）で緊急度低。先頭 = inventory-control / personal-info-protection / risk-analysis / ojt-off-jt。1バッチ4本。

### 薄層 377本の散文増補（3,000字下限）
タグ: [コンテンツ品質] [Codex候補]

総監 keyword 360（5/29 demote 源流コホート・[[project_adsense_low_value_2026_07]] の続き）・pe-construction keyword 16・concrete textbook 1。3,000字下限へ散文増補（7月112本バッチの継続）。census の thin 指標で残数管理（`npm run quality-census`）。

### 品質 census 月次恒久化（Phase 3）
タグ: [コンテンツ品質]

月次 `/gsc-review` と同タイミングで `npm run quality-census` 再生成→新規公開の未採点・薄層逆戻り・スコア低下を surface。census を group 別の正しい Evaluator ルーティングに拡張するのが宿題。

### reference-materials 5記事 精度向上 → 再公開
タグ: [コンテンツ品質]

hyogo-port-materials / river-abandonment / inverted-siphon / floodgate / tunnel-02（`published:false`・GSC impr 資産保持）。試験ピーク 7/13 後: ①精度向上リライト ②published:true→refresh-indexes→commit ③再公開14日後に GSC delta 計測し再実験化を判断。EXP-002 は cancelled（2026-06-27）。

### 1級土木 textbook Phase 3 の実体確認
タグ: [コンテンツ品質]

schedule-charts／network-schedule／control-chart／quality-inspection: 進捗トラッカーは「SVG実体あり・チェック欄が陳腐化」とするが後工程メモに「⬜ vs 完了の食い違い」記録あり。**着手前に各 MDX に該当 SVG/節が実在するか確認**し、欠けていれば深掘りリライト。

### 土木一般編（スキャン教材）図タイト化・素材活用
タグ: [コンテンツ品質]

①図320点のタイト化 — 再開時は軽量版 `apply_deltas_recrop.py --damp 0.7`＋監査2-3ラウンド上限（フルはトークン過大で後回し）②素材活用（本丸）: 検証済みテキストで guide 品質改善・note 無料集客記事展開（GSC 先行で伸び悩みトピック特定）。runbook = `.claude/skills/conversion/pdf-to-mdx/scripts/scanned/README.md`。

### textbook 白黒図のカラー化（対象B・任意）
タグ: [コンテンツ品質]

PDF クロップ済み白黒図 約65枚（construction-machinery-01=13/-02=7/schedule-management=24/surveying=11/demolition=6/construction-mgmt-overview=4 ほか）。著作権問題なし・見栄え向上のみ。**Gemini 有料→着手前に必ずユーザー確認（[[gemini-cost-confirm]]）**。パイロット5枚→品質・コスト確認→全体。

### pe-construction 選択科目 within-specialty インラインリンク
タグ: [コンテンツ品質]

選択科目3記事（road/river-coast/urban-planning）＋新規8記事の本文からの個別キーワードページへのインラインリンク拡充（本文精読を伴う別スコープ）。

### 1級 textbook 10本の品質監査
タグ: [コンテンツ品質]

`civil-construction-qa` で監査（合格マージン大・低優先）。H28-A fig-02/07/08/09 は元 PDF に図が無く修正不能で確定。

### カテゴリカードの残改善
タグ: [UI・UX]

①サムネイル画像の本格採用（OGP はタイトル焼込みで二重になるため写真素材を別途持つ設計が要る）②人気データの鮮度（CI の ga4-page 取得依存・週次見込み）③トップページ／検索結果ページへの横展開。

### Kindle 出版（KDP）続き
タグ: [収益化]

A-01〜A-06 個別本6冊は KDP 公開済（LIVE）。残:
- **D-02 適性**: `kindle-book-composer` で書き下ろし前付け作成 → `/kindle-build D-02`
- A-00 合本（422問 EPUB 完成・未公開）の公開判断（保留中）
- B系（総監 年度別 R03-R07 各20問¥350）＝ジェネレータ設計待ち／C系（建設部門 二次模範解答）＝着手条件達成済み・未着手
- **note PDF 販売（従チャネル）**: Kindle Select 独占90日終了後に開始（`/note-attach-pdf`・¥500〜¥1,480）
- 真実源: `.claude/content/kindle/strategy.md`

### content-angle P-1 カルーセルパイロット
タグ: [SNS・マーケ]

`ig-carousel-writer` で `angle: counter` の slide-data.json（source: note「キーワード集が点にならない理由」）→ `ig-post-create` PNG 化 → `ig-carousel-qa` 採点。過去問パック平均（保存数・リーチ）を上回った場合のみ Phase 2（ビルダー実装）へ。真実源 `content-angle-policy` §5/§6.2。

### note 公開2スキル（note-publish / publish-note）の整理
タグ: [エージェント・SSOT]

①`publish-note` SKILL.md の幻 noteId 節にエンジン明示を追記（`note-publish-magazine` の一次ガードは Playwright 系の話・実在ゲート `verify-note-status` は全エンジン共通）②名前の紛らわしさ＝リネーム/統合か相互参照強化かの設計判断（🟣寄り・台帳同期が要る大工事なので費用対効果を要検討）。

### API トークン更新サイクル ＋ MCP 棚卸し
タグ: [インフラ・計測]

GitHub Secrets: `CLOUDFLARE_API_TOKEN`/R2 キー=90日・`PSI_API_KEY`/`YOUTUBE_CLIENT_SECRET`=180日。①期限確認・更新 ②Cloudflare token の権限スコープ最小化 ③`.mcp.json` の MCP サーバー棚卸し ④更新サイクルを Calendar/schedule hook に登録。

### OGP タイトル改行 per-page 手動チューニング（81件）
タグ: [コンテンツ品質] [Codex候補]

主題が3行以上に折れる published ページ 81件（pe-construction 過去問が最多）。`frontmatter.ogp.title` の `\n` を詰めて `npm run ogp -- <slug> --force` 再生成→commit→区切りで `/deploy`。コード変更不要。

### note 編集スクリプトの共有 lib 化（Tier 2 保守性）
タグ: [エージェント・SSOT]

account ゲート/ClipboardEvent paste/リンクカード化/ブラウザ起動が3〜5スクリプトにコピペ分岐（note-update-body paste 無音失敗事故の震源）。`scripts/lib/note-browser.mjs` へ一元化。**有料境界（paywall boundary）ロジックは収益直結のため統合せず各スクリプトにインライン保持**。独立 worktree で実施・dry-run/probe で挙動同一確認。

### 1級土木 第2章 施工計画フロー図の自前SVG化（任意）
タグ: [コンテンツ品質]

`textbook-construction-plan-overview`（施工計画フロー図2.1）・`textbook-site-investigation`（施工方法決定フロー図2.8）を自前SVG化（現状フロー図なし）。figure-canvas-policy / create-svg 準拠。

---

## 🟣 判断待ち — ユーザーの意思決定が必要

### ~~ココナラ PDF 4商品の取り下げ（note 一本化 C-2 の後半）~~ → **2026-08-05 決着・着手不要**
タグ: [収益化]

> [!important] このタスクは 2026-08-05 の商品再構成で**上書きされた**（決定ログ → [ココナラ展開キット.md §2 追補](../note/1級・2級土木/ココナラ展開キット.md)）
> - 対象4商品のうち **1級/2級 過去問模範答案は archived**（恒久廃止・実行済み）
> - **1級/2級 完成答案集は取り下げず、「模範答案セット」へ改装して継続**（¥5,000 / ¥4,000。過去問模範答案を統合した10冊/8冊）
> - C-2 の「教材をやめ人が動くサービスに絞る」路線は、**教材3段はしご（模試→模範答案セット→フルパック）＋添削つきプレミアム**へ改訂された。
>   根拠＝純教材の価格天井は実測¥10,000で物量では超えられず、労働を足して初めて上の帯に入る（競合ちゃんさとは教材なしの純労働）。
> - **この表のとおりに取り下げると C2'/C3' を誤って消す。着手しないこと。**

以下は当時の記録（保存）。note の土木 経験記述 178 本に印刷用PDFを付けたため、同内容を売っている以下 4 商品が重複する。C-2 方針＝「note へ一本化し、ココナラは人が動くサービス（診断/添削/作成）に絞る」。

| ココナラ商品 | 価格 |
|---|---|
| 1級土木の経験記述 完成答案集を送ります | ¥3,500 |
| 2級土木の経験記述 完成答案集を送ります | ¥3,000 |
| 1級土木 経験記述の過去問模範答案を送ります | ¥3,000 |
| 2級土木 経験記述の過去問模範答案を送ります | ¥3,000 |

取り下げ後に SSOT を更新: `src/lib/coconala-services.ts`（status）／`docs/note/1級・2級土木/ココナラ展開キット.md` §2 価格表／`.claude/knowledge/reference/coconala-operations.md`。整合は `npm run check-coconala-wiring`。

**残り5商品**（学科記述攻略 1級2級・予想模試 1級2級・出題分析）は note 側に PDF spec が無いので今回の対象外。やるなら `gen-pdf-specs-civil-keiken.mjs` と同じ方式で spec を起こす。

**先に A（PDF 添付185件）を終えてから**。添付前に取り下げると、どちらでも買えない期間ができる。

### FLOW 週次配信（W1/W2 配信済・W3 以降は週1）
タグ: [収益化] [note運用]

**2026-08-05 に初の入会**（通年プラン ¥1,480）。プラン説明が約束する「月例の予想問題配信」が1本も出ていない状態だったが、**2026-08-06 に W1/W2 を会員限定で配信して解消**。

> [!done] 2026-08-06 完了（すべて自動）
> - W1 `n66570efb6d23` / W2 `nc92c82ac4ea5` を**会員限定で公開**。両方 `is_limited=true`・
>   未ログイン本文0字を public API で実取得確認
> - 特典マガジン **`mbe07bd5cecda`「経験記述 週次お題ラボ｜1級・2級土木（会員専用）」**を新設し
>   2本を収録（API で 2/2 検証）→ 通年・添削つきの**両プランへ紐付け**（再読取で実体確認）
> - 旧記載「`note-publish` は会員限定公開に非対応・運営者の手作業が必要」は**失効**。
>   実装と note 側の仕様は [[note-membership-publish]] を参照

**W3 以降（8/17 帰宅後）**: W3+W4 を二本立てで公開して追いつき → 以降週1（W5 8/24・W6 8/31・W7 9/7・W8 9/14・W9 9/21・W10 9/24頃・W11 9/28）で 10/4 に間に合う。1本あたり:

```bash
node scripts/note-publish.mjs --article "docs/note/1級・2級土木/メンバーシップ/予想問題マガジン/03_工程管理-工程遅延の回復/article.md" --commit
```

公開後に `note-magazine-add-articles --target mbe07bd5cecda --notes <noteId> --commit` で特典マガジンへ収録する。

### 添削つきプラン ¥2,980 → ¥4,980 改定 — 完了（プラン再作成）
タグ: [収益化]

毎週1本添削で ¥745/本、ココナラ S2（¥3,000/本）と同一役務で4倍差だったのを是正。会員0名のうちに実施。

> [!done] 2026-08-06 完了（全自動）
> **note では一度設定した会費を変更できない**（静的テキストになり入力欄が消える。運営者が UI から
> 直すこともできない）。新規作成直後のプランにだけ `input[name=price]` があり、そこで入れた値が
> 確定値になる——つまり**作り直しが唯一の手段**。事故を避けるため「新プランを作って公開 → 旧プランを削除」
> の順で実施した（逆だと作成失敗時にプランが消えたまま残る）。
>
> - 新 `f9567e03949d` ¥4,980／定員20／特典マガジン7誌（旧プランと完全一致・会費のみ変更）
> - 旧 `ceacc4bb4574` ¥2,980 を削除（**在籍者0名を assert**してから実行。唯一の会員は通年プラン）
> - 非ログインの加入ページを実描画して ¥1,480 と ¥4,980 の2プランだけが出ることを確認
>
> 実装した道具: `note-membership-plan-create`（作成）／`note-membership-plan-edit --benefit-magazine`
> （特典マガジン紐付け）／`note-membership-plan-status --publish|--delete`（公開トグル・削除。
> 削除ダイアログはプラン名の入力を求める二段確認）。

### 会員特典22本の会員限定公開（メンバーシップ未ローンチ・2026-07-24）
タグ: [note運用]

> [!note] 2026-08-06 更新: **技術的壁は解消**（`note-publish` が会員限定公開に対応）。残るのは配信ペースの判断だけで、22本のうち W1/W2 は配信済み・残 20 本。

診断士除く64本公開のうち **無料10＋有料32＝42本を公開完了**（有料はprice欄欠落による無料公開事故を検出→全32本を¥500等で正しく有料化＝値崩れ修復済／新ツール `scripts/note-convert-to-paid.mjs`）。残る **会員特典20本**（`メンバーシップ/予想問題マガジン`9・`学科記述予想`10・`添削事例アーカイブ`1）:
- **旧「技術的壁」は失効**: `note-publish` が `notePricing: membership` を解して会員限定で公開できる（2026-08-06 実装・[[note-membership-publish]]）。W1/W2 で実証済み。
- **配信は一括ではなく週1ドリップ**（README の配信カレンダー）。学科記述予想10本は週2本ペースで併走。
- **メンバーシップ本体は公開済み（2026-07-30 実査）**が、この会員特典22本は依然 is_limited 化して配信していない（受け取る会員が0の段階）。ローンチ律速はユーザー作業（添削実測）＝[[project_civil_membership_design]]。
- **判断**: ①メンバーシップ ローンチ時にまとめて配信（推奨・今出しても会員0）②会員限定publishツールを新規作成して今公開（脆弱・失敗リスク）③一般公開（会員モデル放棄・非推奨）。

### note ハッシュタグ90+ ライブ反映の残1本（会員記事のみ・2026-07-23）
タグ: [note運用]

159本のタグdrift一括反映で **158本が live≥90 完了**（156本=既存公開へタグ追加／2本=総監コスト分析を新規公開＝各93タグ・`note-sync-tags` autocomplete確定バグ修正込み・drift 159→1）。残り:
- **はじめに-合格ラボ（会員記事・`n6b66793ca20c`）**: メンバーシップ(is_limited)のタグのみ保存は「試し読みエリアを設定→更新する」サブフローでタグ入力状態が破棄され live=0 のまま（3回実測・記事は無傷）。本文更新と違いタグは設定画面入力のため。**手動で `docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/hashtags.txt`（93タグ）を編集画面で全選択コピペ→更新する**が確実。編集URL: `https://editor.note.com/notes/n6b66793ca20c/edit/`

### 建設部門BK・総監の有料境界を実ライブに整合（構成監査の偽陽性16本）
タグ: [エージェント・SSOT]

`npm run check-note-structure`（2026-07-24 新設）が 建設部門BK-01道路 R08予想8＋BK-I必須8＋総監テキスト精読5＝**計20本前後を PAYWALL_LEAK として検出**（件数は目次偽陽性を除いた実数）。ただし**全て偽陽性（実ライブのpaywallは正常動作・有料内容は漏洩していない・深いprobeで確認済）**で、原因は「ソースの paidBoundary（BK=既定`試験問題`）が実ライブ境界と食い違う境界定義ズレ」。civil の値上げ・全ロック修復（2026-07-24 完了・FULL_LOCK/LEAK/IMG_MISSING すべて0化）とは別系統。
- **BK-I必須9本**: 既定境界`試験問題`だが実態は「試験問題＝無料つかみ／フル模範解答＝有料」。frontmatter `paidBoundary: "フル模範解答"` 付与で解消（ライブ再公開は不要＝既に正しい）。ただし他の BK necessity 記事との境界一貫性を要確認。
- **総監テキスト精読5・設問3バンク3**: Phase A で新ルール（最初のH2／`国家施策オプション`）を frontmatter 付与済だが、実ライブ境界はより厳しい（無料が少ない）。**新ルール適用＝より多くを無料化する再公開が必要（＝収益判断）**＋総監記事は複数行blockquoteを持ち note-update-body の再貼付で脱落するため、blockquote単一行化が前提。
- 判断: ①BK-I はソース境界を`フル模範解答`へ是正（安全）②総監8本は新ルール適用（再公開・より無料化）するか現状維持か。civil 対象外につき今回は保留。
タグ: [収益化]

モデルは「ライブラリ内包」へ転換済み（2026-07-01・SSOT [docs/note/1級・2級土木/noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md)）。全24記事＋週次お題11週＋無料導線2本は下書き仕込み完了・サイトCTA配線 PR #271 MERGED。

**2026-07-30 完了**: 会員作成・2プラン公開（加入ページ `note.com/dobokunote/membership/join` 実査）・`civil-membership-lab` の noteUrl SoT 記入＋`published:true`・サイト会員CTA（二次系/経験記述/guide の本文中間）発火（代表5ページを mobile/desktop 実査）・note 送客5記事＋説明記事「はじめに-合格ラボ」へ加入URLをライブ反映（説明記事は `--trial-line-bottom` で無料プレビュー 0→約7,100字に復旧）。**develop→main へ commit・本番 deploy 済み（Cloudflare Pages success・本番SSRで会員CTA実査）**。

**追加完了（運営者確認 2026-07-30）**: 完成答案ライブラリの会員特典マガジン収録（入会の引き金＝ライブラリ内包）。

**残**: ①**添削実測**（1本30分以内→定員/価格確定・募集前必須・ユーザーのみ）②フロー在庫8週分（当方制作）③無料集客16本公開（`note-publish-magazine --commit`）④特典マガジン会員配信（週次ドリップ＝会員フロー22本）開始。2級後期は2026-10-25で公式確認済み（SSOT: `.claude/config/exam-calendar.json`）。

### コンクリート診断士 — 著作権方針（2026-07-31 決定済み）
タグ: [コンテンツ品質]

**決定**: 自作に全面置換する。旧3択（A. SVG描き直し／B. 許諾問い合わせ／C. draft固定）のうち A を採り、さらに調査で判明した本文側の問題に対応して**択一は設問文からオリジナル化**する。

**textbook 6章＝完了（2026-07-31）**: 図25枚を全数置換済み（自作SVG 21・AI生成写真3・表と重複のため削除1）。書籍ページ撮影の webp はゼロ。guide 4本は図を持たないため、**guide 4 + textbook 6 = 10記事は公開可能な状態**。

**択一98問＝オリジナル演習問題へ転換（2026-07-31 完了）**: 8記事すべてを自作の設問・選択肢・解説へ書き換え済み（第1回13問・第2回14問・第3回13問・第4回12問・第5回12問・第6回13問・第7回10問・第8回11問＝計98問）。書籍ページを撮影した webp は診断士カテゴリから全廃し、残る画像8枚はすべて自作 SVG または生成画像。旧記事の「正答の確度が低い」注記（全記事で計42問分）と逐語転記の注記も解消。転換の理由は以下の3つの壁。
- 図59枚のうち**約27枚は写真そのものが設問**（「この写真の変状の原因は」型）。解説が写真の中身を特定していない問は生成でも再現不能
- 一部はクロップが切れている／四択の微差が読み取れない。**原典スキャン `docs/textbook/コンクリート診断士` は既にリポジトリから削除済み**で参照できない
- 記事冒頭の下書き注記のとおり**設問文・選択肢は原典の逐語転記**。図を差し替えても本文が他者著作物の複製である問題は残る

→ 対応: **論点は保ちつつ設問文・選択肢・設定数値をオリジナルで書き直し、「過去問演習」ではなく演習問題として出す**。自作設問なら図も自分で決められるため、図の材料不足も同時に解消する。正答も自分で確定するので低確度フラグ問題も解消する。
記事の位置づけも「過去問演習」から「演習問題」へ変更し、原典由来の枠組み（厳選101問より問題N〜M）と `past-questions` タグを外した。欠番3問（旧 問48/56/85）はオリジナル化により消滅。

**残作業**: 択一・記述式の公開前人手レビュー（内容の技術的確認）・cd-essay の note 公開＋placement 配線・サイト公開配線（`categories.json` の `visible`・`home-exam-cards.json`・`category-curriculum.json`・exam-brand トークン・`exam-calendar.json`・OGP 生成・`npm run refresh-indexes`）。

### 2級 想定工事バンクの会員ライブラリ内包
タグ: [収益化]

想定工事バンク36本＋索引は note 公開・SKU `civil-2-koji-bank` published:true 完了（¥5,480）。**会員ローンチ（上記）後**に会員特典として2級ライブラリへ内包。会員ローンチ自体が律速。

### ガイドカードのカバー写真（dormant）
タグ: [UI・UX]

literal 写真はメタ記事と不一致で撤回済（PR #277）。dormant 資産（再課金なしで再利用可・develop 存置）: `scripts/generate-guide-covers.mjs`・`src/config/guide-cover-photos.json`・`src/lib/guide-cover.ts`・Imagen 生成35枚。

**有望な未検証案**: 記事別の**概念イメージ**生成（キャリア=上昇/階段、勉強法=学習机 等）。**まず5本パイロット（~$0.10・[[gemini-cost-confirm]]）→ :3020 で判断 → 良ければ123本**。ダメなら dormant 維持。

### 建設BK-09/10 R8予想 印刷用PDF添付（Windows専用）
タグ: [収益化] [試験前 7/20]

R8予想62本は2026-07-13に全公開・収録・導線検証済（[[project_r8_yosou_full_matrix_2026_07]]）。残りは建設BK-09電力土木/BK-10鉄道の6記事のみ本文が「印刷用PDF付き」を約束しており、**Mac生成不可が実測確定**（Chrome常駐との衝突で ETIMEDOUT）。spec は R08-yosou 追記済み。

**Windows で実行**:
1. `node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/BK-09_電力土木.json --in-place`（BK-10 も同様）
2. `note-attach-pdf` で6記事へ添付（1日100件上限に注意）
3. 生成PDFを pathspec commit

### 図クロップ写り込み・切断の是正（ImageMagick 搭載マシンで実施）
タグ: [コンテンツ品質]

`check-figure-crop`（2026-07-16 新設・機械ゲート）が検出した既存債務。baseline 登録済みで CI は通るが、実体は要修復。**このマシンは ImageMagick 未インストールで `figure-recrop.mjs` 実行不可**のため別マシン/セッションで実施。

- **STRAY_SLIVER 29図（隣接図の切れ端＝写り込み・要 recrop）**: 一覧は `.claude/state/quality/figure-crop-report.json` の `rule=STRAY_SLIVER`。ユーザー報告の `r07-a-fig-04`（下端ルビ）を含む。各図 `node scripts/figure-recrop.mjs <img> --top/--bottom F` で除去→ `check-figure-crop --file` で clean 確認。precision ≈ 8/10 なので着手前に1枚ずつ現物 Read（alarp-carrot 等の FP は触らない）。
- **`r07-a-fig-02`（「収縮限界」欠け・切断済み＋白枠で機械検出不能）**: 再クロップでは修復不可（画素欠損）。provenance `rescannable:needs-source` → 元スキャン（`docs/textbook/１級土木施工管理技士`）から再抽出が必要。
- 是正後は該当図を除いて `check-figure-crop --update-baseline` で baseline を刈り込む。

### PSI 収集の欠測 6.8% にリトライを入れる
タグ: [計測]

`fetch-psi-data.mjs` が PSI の一時障害（`500 Lighthouse returned error: Something went wrong`）をそのまま記録して次へ進むため、日次バッチに欠測が出ている。直近14バッチ 308 計測中 21 失敗＝**欠測率 6.8%**（429 は 0 件＝クォータ問題ではない）。1バッチで最大 6/22 が欠けた日もある（2026-07-24 desktop）。

**なぜ困るか**: ある日「違反が消えた」ように見えても、実は測れていないだけという誤読が起きる。バッチごとに件数が 18〜22 と揺れるのはこれが原因。`performance-auditor` は直近5バッチ中央値で判定する設計にしたが、**欠測を考慮していない**。

**やること**:
1. `fetch-psi-data.mjs` の `fetchPsi()` に 5xx のみリトライ（1〜2回・数秒バックオフ。4xx はリトライしない＝設定ミスを隠さないため）
2. 欠測が残った場合に備え、`performance-auditor` の中央値計算で「その URL が測れているバッチのみ」を母数にする旨を明記
3. 反映は `main` deploy 後（`psi-audit.yml` は `ref:` 指定が無いため main のコードで実行される。実行ブランチは workflow ごとに違うので `npm run check-scheduled-exec-branch` か [[measurement-incidents]]「定期ジョブの実行ブランチは workflow ごとに違う」の実測表で確認すること）

**注意**: ローカルでの live PSI 検証は不可（`.env.local` に `PSI_API_KEY` 無し・キー無しは匿名共有枠で即 429）。キーは GitHub Secrets 側にあり、計測は CI 供給が正。動作確認は deploy 後の psi-batch で行う。

### KDP: F系 残り9冊（f-08〜f-16）を提出（枠回復後）
タグ: [収益化] [KDP]

2026-07-27 に10冊（c-10/c-11/c-I ＋ f-01〜f-07）を出版し、**f-08 で KDP の作成数制限に到達**して中断（モーダル「本の作成数制限を超えました」）。数日で枠が回復する。

**やること**: 枠の回復を確認して残り9冊を流すだけ。EPUB・表紙・`kdp-memo.json` のメタデータは全て配置済み。

```bash
npm run kdp-batch -- f-08 f-09 f-10 f-11 f-12 f-13 f-14 f-15 f-16
```

driver が「配置→下書き→プロファイル掃除→出版→catalog更新」を1冊約3.5分で回し、制限に再到達したら即中断する。手順と罠の真実源は `.claude/skills/conversion/kdp-publish/SKILL.md`。

**ASIN 記録は完了済み**（2026-07-27 提出の10冊は同日中に LIVE 化し、3箇所へ記録済み）。f-08〜f-16 も出版後は同様に ASIN を **3箇所**（`catalog.json` / `.claude/content/kindle/strategy.md` / `scripts/kindle-published/README.md`）に記録する。ASIN は `node scripts/kdp-publish.mjs --sync-status` の保存する `.tmp/kdp-bookshelf.html` から draftAsin と対応づけて取得できる（本棚リストは20件で切れるため JSON 出力だけでは足りない）。
