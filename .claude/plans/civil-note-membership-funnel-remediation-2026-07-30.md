# 1級・2級土木 noteメンバーシップ訴求・加入導線 改善作業票

> [!todo]
> **2026-07-30 実装待ち**：公開済みメンバーシップをサイト・note記事の真実源へ反映し、加入ページまでの直リンク、説明記事の無料プレビュー、二次対策ページのサイトCTAを実装する。

## 1. 結論と目的

メンバーシップ「土木セコカン 合格ラボ」は公開済みで、加入ページには2プラン・価格・参加ボタンが正常に表示されている。弱いのは商品ページではなく、サイト／note記事から加入ページへ送る前段である。

今回の実装では次を成立させる。

1. `src/lib/note-magazines.ts` とnoteライブの公開状態を一致させる。
2. サイトの1級・2級土木ページにメンバーシップCTAを表示する。
3. noteの高意図記事から加入ページへ1クリックで遷移できるようにする。
4. 加入理由を説明する記事を、加入前にほぼ全文読める状態へ戻す。
5. ソースだけ更新してnoteライブへ未反映、という状態を残さない。
6. 最小の回帰テストを追加し、再び未公開扱いへ戻るドリフトを検出する。

この作業票は実装仕様であり、導線全体のSSOTは `.claude/knowledge/reference/note-funnel-architecture.md`、商品設計のSSOTは `docs/note/1級・2級土木/noteコンテンツ計画.md` とする。

## 2. 調査時点の基準値

調査日: 2026-07-30

- プロフィール: `https://note.com/dobokunote`
  - モバイルのファーストビュー内に「メンバーシップ」ボタンあり。
  - メンバーシップカードは記事一覧の後に表示。
- 正式な加入URL: `https://note.com/dobokunote/membership/join`
  - `https://note.com/dobokunote/membership` は加入URLへリダイレクト。
  - 通年プラン `¥1,480/月`、添削つきプラン `¥2,980/月` が公開済み。
- 土木配下の公開済みnote記事: 192本。
  - メンバーシップ内の説明記事を除く191本中、合格ラボへの言及は5本。
  - 加入ページへの直接リンクは0本。
- 会員専用原稿: 23本。
  - 公開済みは説明記事1本。
  - 予想問題・学科記述予想・添削事例の22本はソース上未公開。
- サイト:
  - `civil-membership-lab` は `published:false`、`noteUrl:''`。
  - Playwrightで確認したトップと土木の代表5ページに、メンバーシップ文言・リンクは0件。
- 説明記事 `n6b66793ca20c`:
  - ソースは `notePricing: free`。
  - ライブでは「ここから先は1,495字」となり、本文の大半が会員限定。

> [!warning] `published:true` だけでは11配置すべては表示されない
> `page.tsx` の本文中間CTAは、対象グループかつ `placement.inline` の先頭1件だけを使う。現状は `secondary` が対象外で、経験記述ページではメンバーシップがinline後方にある。このため、SoTを公開済みに変えるだけでは二次の高意図ページへ表示されない。

## 3. 固定する値と非スコープ

### 固定値

```text
MEMBERSHIP_ID = civil-membership-lab
JOIN_URL = https://note.com/dobokunote/membership/join
CTA_MARKER = <!-- cta:civil-membership-lab -->
INTRO_NOTE_ID = n6b66793ca20c
CIVIL_INDEX_NOTE_ID = n4fde0f62dc20
```

加入導線には `/membership` ではなく、実際の遷移先である `/membership/join` を使う。

### 非スコープ

- 月額、プラン名、定員の変更
- 買い切りマガジンの価格・収録記事・販売状態の変更
- 既存の会員特典マガジン6誌の解除
- 他資格へのメンバーシップ展開
- `main` へのマージ、Cloudflare Pagesへのdeploy
- 新しい会員専用記事の公開・会員通知
  - §10の承認ゲートを通った場合だけ別バッチで実施する。
- 全191記事への一律CTA注入
  - 検索意図に合う高意図記事だけを第一バッチとする。

## 4. 変更対象

### サイトの真実源・描画

- `src/lib/note-magazines.ts`
- `src/lib/magazine-placement.ts`
- `src/app/docs/[...slug]/page.tsx`
- 必要な回帰テスト

### note記事ソース

- `docs/note/1級・2級土木/土木もくじ/article.md`
- `docs/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md`
- `docs/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md`
- `docs/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md`
- `docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md`
- `docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md`

### 状態が古い運用文書

- `docs/note/1級・2級土木/noteコンテンツ計画.md`
- `docs/note/1級・2級土木/メンバーシップ/README.md`
- `.claude/agents/note-membership-operator.md`
- `docs/todo/backlog.md`

運用文書は「未公開ドラフト」「メンバーシップを作成する」という記述を、実機で確認した公開済み状態へ更新する。未公開の予想問題22本や添削実測など、本当に残っている作業は完了扱いにしない。

## 5. Phase 0: 作業前確認

```bash
git branch --show-current
git status --short --branch
git fetch -q origin
git log --oneline HEAD..origin/develop | head
```

条件:

- ブランチが指示と異なる場合は作業を止める。
- 未コミット変更を確認し、無関係な変更を戻さない。
- `develop` が遅れており作業ツリーがクリーンなら `git pull --ff-only origin develop`。
- 別のPlaywright処理が `.local/playwright-note-profile` を使用中なら、noteライブ更新は並行実行しない。

変更前の公開状態をPlaywrightで再確認する。

```text
https://note.com/dobokunote
https://note.com/dobokunote/membership/join
https://note.com/dobokunote/n/n4fde0f62dc20
https://note.com/dobokunote/n/nd1c0e564ef10
https://note.com/dobokunote/n/nb9b9a20106f0
https://note.com/dobokunote/n/n824a4ea20acf
```

記録するもの:

- 加入ページの最終URL
- 2プラン名・価格
- 各記事内の `/membership/join` リンク件数
- 説明記事の公開プレビュー文字数

## 6. Phase 1: サイト側を公開状態へ配線

### 6.1 `civil-membership-lab` を公開済みにする

`src/lib/note-magazines.ts` のエントリを次の状態にする。

```ts
'civil-membership-lab': {
  id: 'civil-membership-lab',
  published: true,
  noteUrl: 'https://note.com/dobokunote/membership/join',
  // 既存の title / description / price / badge / CTA文言は維持
}
```

周辺コメントの「公開時」「作成後」という未来形を、公開日と現在URLが分かる記述へ直す。価格・説明は変更しない。

### 6.2 二次ページでメンバーシップを本文中間に出す

買い切りと会員の役割を次のように分ける。

```text
記事冒頭: 買い切りの対応パック
本文中間: 土木セコカン 合格ラボ
記事末尾: 土木もくじ
```

`src/app/docs/[...slug]/page.tsx` で、全資格の `secondary` を一律対象にせず、土木だけを追加する。

実装イメージ:

```ts
const isCivilSecondary =
  (category === 'civil-construction-1' || category === 'civil-construction-2') &&
  docGroup === 'secondary';

const midEligibleGroup =
  docGroup === 'guide' ||
  docGroup === 'pillar' ||
  docGroup === 'textbook' ||
  isCivilSecondary;
```

既存の文字数・H2数ゲートは維持する。短い記事へ無理にCTAを入れない。

`src/lib/magazine-placement.ts` の土木二次系ブランチでは、`top` の買い切り商品を維持し、`inline` の先頭を `civil-membership-lab` にする。対象:

- 2級 `secondary-r0X`
- 2級 `secondary-experience-writing-(guide|examples)`
- 2級 `secondary-getting-started`
- 1級 `secondary-r0X`
- 1級 `secondary-experience-writing-(guide|examples)`
- 1級 `secondary` catch-all
- 1級 `guide-last-minute-2026`

同じ商品を `top` と本文中間へ重複表示しない既存ゲートは維持する。既存買い切り商品は削除せず、inline 2件目以降へ残す。

一次過去問ページは今回 `midEligibleGroup` に追加しない。一次では問題演習・一次商品との関連性を優先し、メンバーシップを一律表示しない。

### 6.3 サイト側の期待表示

最低限、次のページをローカルで確認する。

```text
/docs/civil-construction-1-guide-strategy
/docs/civil-construction-1-secondary-experience-writing-guide
/docs/civil-construction-1-secondary-r07
/docs/civil-construction-2-secondary-experience-writing-guide
/docs/civil-construction-2-secondary-r07
```

期待値:

- `a[href*="note.com/dobokunote/membership/join"]` が1件。
- UTM付与後もベースURLが `/membership/join`。
- 1級・2級の資格が混線しない。
- 冒頭の買い切りCTAと本文中間の会員CTAが同一商品にならない。
- career記事には出ない。
- CTA文言、価格、リンクが `note-magazines.ts` から供給される。

## 7. Phase 2: note記事からの直接導線

### 7.1 共通ルール

- CTAマーカーは `<!-- cta:civil-membership-lab -->`。
- 1記事内の加入URLは原則1回。
- URLは単独行にしてnoteのリンクカード化対象とする。
- 価格を本文へハードコードしない。
- 「合格保証」表現は禁止し、既存免責を維持する。
- 買い切りと会員の違いを消さない。

共通CTAの基準文:

```md
<!-- cta:civil-membership-lab -->
完成答案を読むだけでなく、毎月の予想問題で手を動かし、必要なら施工経験記述の添削まで受けたい方は、会員制「土木セコカン合格ラボ」の内容と2つのプランをご確認ください。

https://note.com/dobokunote/membership/join
```

記事の文脈に合わせて前半は調整してよいが、加入URL、商品名、予想＋添削という差別化は維持する。

### 7.2 土木もくじ

現在の「会員制で伴走する」セクションを、キャリア記事一覧より後ではなく、「まず選ぶ『1冊』」の直後へ移動する。買い切り一覧より前に置き、旗艦商品という戦略と表示順を一致させる。

「まず選ぶ『1冊』」の選択肢にも次を追加する。

```md
- **完成答案を読みながら、予想問題と添削で伴走してほしい** → 会員制「土木セコカン合格ラボ」
```

会員セクションの基準文:

```md
## 会員制で伴走してほしい方へ

買い切りマガジンは、自分のペースで教材をそろえて手元に残したい方向けです。

会員制「**土木セコカン合格ラボ**」では、1級・2級土木の完成答案ライブラリを読みながら、**毎月届く予想問題**で手を動かせます。受験シーズンは、**施工経験記述のマンツーマン添削**が付く定員制プランも選べます。

教材で自習するか、予想と添削で伴走してもらうか。自分に合う方を選んでください。

<!-- cta:civil-membership-lab -->
合格ラボの内容・会員特典・2つのプランはこちらで確認できます。

https://note.com/dobokunote/membership/join
```

次を削除する。

- 「メンバーシップ作成後にURLを記入」というTODOコメント。
- 目的別逆引きにある、リンクなしの「上のセクション参照」だけの案内。

目的別逆引きは加入URLへのMarkdownリンクにするか、直上のカードへ戻る説明に変える。bare URLカードを重複させない。

### 7.3 落ちる答案診断

「各商品の詳細・お申し込みは、プロフィールまたはマガジン一覧からどうぞ」を削除する。会員説明の直後へ共通マーカーと加入URLを追加する。

基準文:

```md
<!-- cta:civil-membership-lab -->
完成答案ライブラリ、月例予想、添削つきプランの内容はこちらで確認できます。

https://note.com/dobokunote/membership/join
```

買い切りマガジンの既存説明は維持する。

### 7.4 独学添削の限界

マンツーマン添削の説明直後、捏造禁止の引用より前に追加する。

```md
<!-- cta:civil-membership-lab -->
自分の答案を一人で採点できずに止まっている方は、添削つきプランの内容をご確認ください。

https://note.com/dobokunote/membership/join
```

### 7.5 予想問題で書く練習

「毎月届く予想問題」「マンツーマン添削」の箇条書き直後に追加する。

```md
<!-- cta:civil-membership-lab -->
毎週の練習を、お題選びから添削まで止めずに続けたい方は、合格ラボの会員特典と2つのプランをご確認ください。

https://note.com/dobokunote/membership/join
```

### 7.6 1級二次まるごとパック

「伴走・添削がほしい方へ」の説明直後に追加する。

```md
<!-- cta:civil-membership-lab -->
買い切り教材で自習するか、月例予想と添削で伴走してもらうかを比較したい方は、合格ラボの内容をご確認ください。

https://note.com/dobokunote/membership/join
```

まるごとパックの購入URL、価格、有料境界は変更しない。

### 7.7 合格ラボをはじめます

本文末尾の自己参照URL:

```text
https://note.com/dobokunote/n/n6b66793ca20c
```

を加入URLへ置換し、直前に共通マーカーと一文を置く。

```md
<!-- cta:civil-membership-lab -->
完成答案ライブラリ、月例予想、添削つきプランの内容と参加手続きはこちらから確認できます。

https://note.com/dobokunote/membership/join
```

ライブ反映時は `--trial-line-bottom` を使い、最終要素だけを会員限定のしっぽとして残す。Playwrightで、非ログイン状態でも本文の主要セクションと加入URLが読めることを確認する。

## 8. Phase 3: ソース検証

### note記事

対象6記事へ個別にlintを実行する。

```bash
node scripts/note-lint.mjs "docs/note/1級・2級土木/土木もくじ/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md"
```

追加確認:

```bash
rg -n "https://note\\.com/dobokunote/membership/join" \
  "docs/note/1級・2級土木"

rg -n "<!-- cta:civil-membership-lab -->" \
  "docs/note/1級・2級土木"
```

対象6記事それぞれにマーカーとURLが1件ずつあり、リンクなし訴求が残っていないこと。

### コード

```bash
npm run type-check
npm run lint
npm run audit-note-funnel
npm run check-note-funnel
npm test
git diff --check
```

`.local/r2/posts/**` を変更した場合だけ `npm run refresh-indexes` を実行する。今回の既定スコープではサイト記事MDXを変更しないため不要。

### 最小回帰テスト

`tests/note-membership-funnel.test.mjs` を追加し、少なくとも次を検査する。

1. `civil-membership-lab` が `published:true`。
2. `noteUrl` が正式加入URL。
3. 対象6記事の本文にCTAマーカーと加入URLが各1件。
4. 説明記事の本文に自己参照URLが残っていない。
5. `resolvePlacement` の土木二次対象で、`top` は買い切り、`inline[0]` はメンバーシップという契約が崩れていない。

テストだけを通すために商品IDや本文を別実装へ二重定義しない。可能なら実モジュールまたはソースの既存定義を参照する。

## 9. Phase 4: noteライブへ反映

> [!warning]
> ソース編集だけで完了扱いにしない。公開済みnoteはソースと非同期であり、ライブ更新が必要。

### 9.1 ログインとアカウント確認

```bash
npm run note-edit-session
```

- `.local/playwright-note-profile` にログインセッションがあること。
- アカウントが `dobokunote` であること。
- 別スクリプトが同じプロファイルを使用していないこと。

### 9.2 dry-run

まず各記事を1件ずつdry-runする。

```bash
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/土木もくじ/article.md"
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md"
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md"
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md"
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md"
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md" --trial-line-bottom
```

dry-runで確認する。

- noteIdと記事タイトルが一致。
- `dobokunote` アカウント。
- 本文長が変更前と比べて異常に短くない。
- 画像プレースホルダが残らない。
- PDF添付カードが検出された場合は中断。
- 加入URLがリンクカード化される。
- 既存の有料／会員境界を意図せず動かしていない。

`--allow-attachment-loss` は使わない。添付がある場合は保存せず、部分更新手段へ切り替える。

### 9.3 commit

dry-runが正常な記事だけ、同じコマンドに `--commit` を付けて1件ずつ反映する。バッチで一気に更新しない。

説明記事だけは必ず次を使う。

```bash
node scripts/note-update-body.mjs \
  --article "docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md" \
  --trial-line-bottom \
  --commit
```

更新通知ダイアログは必ず「いいえ」。1件失敗したら後続を止め、公開本文が空・二重・境界移動になっていないか確認する。

### 9.4 ライブ検証

非ログインの新規ブラウザコンテキスト、モバイル `390x844` とデスクトップ `1440x1000` で確認する。

期待値:

- 5つの送客記事に `/membership/join` のクリック可能リンクが1件。
- 土木もくじの会員セクションが買い切り一覧より前。
- 説明記事で主要本文が加入前に読める。
- 説明記事の末尾またはnoteネイティブ枠から参加画面へ進める。
- まるごとパックの購入導線・価格・本文が維持。
- 加入ページの2プラン、価格、参加ボタンが維持。

note公開APIで本文を取得できる記事は、PlaywrightだけでなくAPI本文にも加入URLがあることを確認する。取得0件や全件取得失敗をPASSと呼ばない。

## 10. Phase 5: 継続価値の証明は別承認

コア導線の修正後、次の会員専用記事を公開すると「月例予想」「添削」の実績を加入ページで見せられる。

候補:

- `メンバーシップ/予想問題マガジン/01_安全管理-公衆災害の防止/article.md`
- `メンバーシップ/添削事例アーカイブ/事例01_工事概要の具体性/article.md`

ただし、新規公開と特典マガジン収録は既存会員への配信・通知を伴う可能性がある。次を満たすまで実行しない。

1. ユーザーがこの2本の公開を明示承認。
2. 特典マガジンの実IDを実機で確認。推測したIDを使わない。
3. `note-lint`、内容、公開日、配信順を確認。
4. `note-membership-operator` のdry-runで対象とアカウントを確認。
5. 公開後に特典マガジン収録とAPI実査まで行う。

承認されない場合、導線修正は完了としてよいが、「継続価値の公開実績は未着手」と報告する。

## 11. 運用文書の同期

実装後、次を現在形へ直す。

- `noteコンテンツ計画.md`
  - メンバーシップ作成・2プラン公開・既存6マガジン特典化を実施済みにする。
  - note記事内直リンクとサイトCTAの反映日を記録。
  - 22本のフロー原稿未公開、添削実測など残件は維持。
- `メンバーシップ/README.md`
  - 「published:false・自動発火待ち」を削除。
  - 正式加入URLとサイト表示済み状態を記録。
- `note-membership-operator.md`
  - 「作成済み・非公開ドラフト」「公開は運営者手動」というローンチ前提を、公開済み運用へ更新。
  - 公開中プランの編集保存が即時反映か未確認なら、自動保存禁止・手動確認と明記。
- `docs/todo/backlog.md`
  - 「会員作成」「noteUrl flip」を完了へ移すか削除。
  - 未公開コンテンツ、添削実測、継続配信だけを残す。

コード・スクリプト・エージェント文書を変更したため、コミット前に `/doc-sync` を1回実行する。

## 12. 完了条件

- `civil-membership-lab` が公開済みで正式加入URLを持つ。
- サイトの代表5ページで意図したメンバーシップCTAを確認。
- noteの対象5送客記事に加入リンクがライブ反映。
- 説明記事が加入前にほぼ全文読める。
- 買い切り商品・価格・有料境界・添付を壊していない。
- 更新通知を送っていない。
- 対象6記事のlintが成功。
- `type-check`、`lint`、`audit-note-funnel`、`check-note-funnel`、対象回帰テストが成功。
- 運用文書が公開済み状態と一致。
- `docs/handoffs/YYYY-MM-DD-note-membership-funnel-remediation.md` に変更・検証・未実施を記録。
- 変更したファイルだけを明示的にstageする。`git add .` と `git add -A` は使わない。

## 13. 中断条件

次の場合は保存・公開せず中断して報告する。

- noteアカウントが `dobokunote` ではない。
- 加入ページが404、非公開、またはプランが表示されない。
- note記事の本文が空、異常に短い、二重化した。
- PDF添付や有料境界を維持できない。
- 試し読みラインを末尾直前へ置けたことを確認できない。
- 更新通知を「いいえ」にできない。
- 未コミットの無関係な変更と対象変更が衝突する。
- 新規会員記事の公開承認がない。

