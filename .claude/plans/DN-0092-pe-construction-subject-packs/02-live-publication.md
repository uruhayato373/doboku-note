# 選択科目パック：note実公開手順書

> [!warning] 収益アカウント操作
> 本手順はnote.com上に有料商品を新規作成する。既定はprobe／plan-onlyとし、実作成・カバー保存・記事収録には`--commit`を明示する。accountが`dobokunote`でない場合は1バイトもSoTへ反映せず停止する。

## 1. 公開対象

道路を再作成しない。次の10商品だけを対象とする。

```text
Batch A: トンネル、都市計画、河川・砂防
Batch B: 鋼コン、土質基礎、鉄道
Batch C: 建設環境、港湾空港、施工計画、電力土木
```

## 2. 開始前ゲート

```bash
npm run check-pe-construction-packs
npm run note-meta-lint
npm run check-note-cover-fit
npm run verify-note-magazines -- --vs-txt --contents --json
npm run note-edit-session
```

確認事項：

- ログインアカウントが`dobokunote`。
- 道路以外の同名パックがnote上に存在しない。
- 必須Iが¥3,480、対象選択科目が¥2,980。
- ソースマガジンが公開中で、期待記事を取得できる。
- ローカルの対象packは`published:false`、URL空。
- `_cover.png`がdefault画像ではなく、1280×670。

同名または類似名のマガジンが存在する場合は新規作成せず、key、価格、記事数を実査して既存商品の取り込み可否を判断する。

## 3. 1商品ごとの実行単位

以下を1商品ずつ完了させる。複数商品の作成を先に済ませない。

### Step 1：作成probe

```bash
node scripts/note-magazine-create.mjs --dir "{PACK_DIR}"
```

フォームのタイトル、説明、価格、アピール、カテゴリを確認する。タイトルまたは価格の読み戻しが不一致なら`--commit`しない。

### Step 2：有料マガジン作成

```bash
node scripts/note-magazine-create.mjs --dir "{PACK_DIR}" --commit
```

作成成功後、URLの`m...` keyを直ちに記録する。以後の工程が失敗しても、同じ商品を再作成しない。

一時的な復旧記録は`.tmp/pe-construction-pack-launch.json`へ置き、最低限次を持たせる。

```json
{
  "productId": "pe-construction-...-pack",
  "magazineKey": "m...",
  "createdAt": "JST ISO timestamp",
  "cover": false,
  "expectedCount": 29,
  "actualCount": 0
}
```

資格情報、cookie、画面HTML全文は保存しない。

### Step 3：カバー設定

```bash
node scripts/note-magazine-cover.mjs --key {TARGET_KEY} --dir "{PACK_DIR}"
node scripts/note-magazine-cover.mjs --key {TARGET_KEY} --dir "{PACK_DIR}" --commit
```

保存後、APIの`cover`／`coverRectangle`が`default_magazine_header`ではないことを確認する。`cover:true`を復旧記録へ反映する。

### Step 4：収録計画

```bash
npm run note-magazine-add -- \
  --target {TARGET_KEY} \
  --from m0f3bc3933454,{SUBJECT_SOURCE_KEY} \
  --plan-only
```

確認事項：

- source unionが期待29件。
- 同じnote keyが重複していない。
- 収録先が空ならtoAddも29件。
- 道路や別選択科目の記事が混入していない。

件数が異なる場合、source APIの実体とローカル原稿を突合する。29へ合わせるために記事を勝手に削除・追加しない。

### Step 5：1件だけ収録

```bash
npm run note-magazine-add -- \
  --target {TARGET_KEY} \
  --from m0f3bc3933454,{SUBJECT_SOURCE_KEY} \
  --commit --limit 1
```

APIで収録数が0→1になり、その1件が予定したsource union内であることを確認する。

### Step 6：残りを収録

```bash
npm run note-magazine-add -- \
  --target {TARGET_KEY} \
  --from m0f3bc3933454,{SUBJECT_SOURCE_KEY} \
  --commit
```

同じコマンドをplan-onlyで再実行し、`toAdd=0`、`miss=0`を確認する。一過性のmissがあれば同じ冪等コマンドを再実行し、0になるまで完了扱いにしない。

### Step 7：API実査

```bash
npm run verify-note-magazines -- --contents --json
```

新規商品について次を実測する。

- 公開一覧にtarget keyが存在する。
- 価格が¥4,980。
- カバーがdefaultではない。
- 収録数が期待値と一致する。
- 必須Iと対象選択科目のunion以外が入っていない。

### Step 8：ローカルSoT反映

API実査後に限り、`src/lib/note-magazines.ts`の該当entryを更新する。

```text
published: true
noteUrl: https://note.com/dobokunote/m/{TARGET_KEY}
```

復旧記録の`actualCount`を更新する。SoT反映後、再度`verify-note-magazines`を実行して未配線ゼロを確認する。

## 4. Batchゲート

各batch終了時に次を実行する。

```bash
npm run verify-note-magazines -- --vs-txt --contents --json
npm run check-pe-construction-packs
npm run check-magazine-cta
git diff --check
```

batch内の全商品で価格・カバー・記事数・SoTが一致しない限り、次batchへ進まない。

## 5. 失敗時の扱い

- 作成前に失敗：ローカルを修正し、同商品から再開。
- 作成後・カバー前に失敗：記録済みkeyを使い、作成を再実行しない。
- 収録途中で失敗：同じ`note-magazine-add`を再実行する。冪等差分で残件だけ追加する。
- 誤価格：新商品を次へ進めず、`note-edit-magazine`のprobeで修正計画を確認する。
- 誤記事混入：自動削除経路を新設しない。対象keyと混入記事を報告し、人間判断を求める。
- account不一致、CAPTCHA、UI変更：保存せず停止する。

## 6. 禁止事項

- `--commit`を付けた複数商品の並列実行。
- 10商品を先に空マガジンとして作ること。
- カバー未設定のまま次商品へ進むこと。
- API検証前に`published:true`へすること。
- 既存単科マガジンの記事、価格、公開状態を変更すること。
- 公開済み道路パックを再作成すること。
- フォロワー通知、記事本文更新、単品記事再公開を本工程で行うこと。

## 7. 完了条件

- 新10商品がnote公開一覧に存在する。
- 全商品が¥4,980。
- 全商品に実カバーがある。
- 全商品が期待unionだけを収録し、toAdd=0、miss=0。
- `note-magazines.ts`の全11packが`published:true`かつURLあり。
- `verify-note-magazines --vs-txt --contents`の対象ドリフトがゼロ。
