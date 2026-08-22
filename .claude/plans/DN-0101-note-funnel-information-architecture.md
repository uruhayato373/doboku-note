# DN-0101 note L1/L2・サイト→note意味導線の再編

## 目的

DN-0100で不具合を止めた後、note内とサイト→noteの導線を「売る側の商品一覧」ではなく「読者の現在地に合う次の一歩」で並べ直す。

## SSOT

- `AGENTS.md`
- `.claude/skills/social/audit-note-funnel/SKILL.md`
- `.claude/knowledge/reference/note-funnel-architecture.md`
- `.claude/config/note-funnel.json`
- `.claude/config/exam-calendar.json`
- `content/note/共通/コンテンツ総合案内/article.md`
- `content/note/技術士総監/総監もくじ/article.md`
- `content/note/技術士建設部門/建設部門もくじ/article.md`
- `content/note/1級・2級土木/土木もくじ/article.md`
- `src/lib/hub-cta.ts`
- `src/lib/magazine-placement.ts`

## Scope

### 含む

- L1総合案内の公開実体との同期
- 3つの既存L2の順序とCTA文面
- 総監キーワードhubの読者意図との一致確認
- 1級一次過去問→二次商品の季節切替のカレンダー駆動化
- ソース変更後のnoteライブ反映

### 含まない

- コンクリート系・技術士一次の新規L2作成
- 新商品の制作、価格変更
- 記事の削除・統合
- mainへのマージ、deploy

## 確定設計

### L1

- コンクリート主任技士・診断士を「準備中」と書かない。`note-magazines.ts` で公開中の2商品を既存公開URLへ案内する
- 技術士第一次試験は、公開済み `pe1-takuitsu-pdf`（`n466132e6fd74`）へ1経路だけ追加する。商品名・価格・URLは `note-magazines.ts` から取得し、本文へ価格を複製しない
- L1は全資格の俯瞰に留め、商品を大量列挙しない。各資格にL2がある場合はL2を主導線にする
- concrete/技術士一次のL2新設は本カードで行わない。必要性が出たら別カードで判断する

### L2

3記事とも、基本順序を次のようにする。

1. 無料で現在地を確認する
2. 買い切り・伴走を選ぶ
3. 有料教材で仕上げる
4. 無料記事・目的別逆引き

既存リンク、価格、商品名、資格セグメントは維持する。土木のメンバーシップは冒頭固定の唯一解にせず、「買い切り／伴走」の選択肢として無料導線の後へ置く。

### サイト→note

- 総監キーワードhubでは精読ガイドを最初の中間CTAにする。DN-0100で完了済みなら再変更しない
- 1級一次過去問は、`exam-calendar.json` の1級二次試験終了までは二次商品、終了後は一次の出る順ノートへ戻す
- 日付判定をテスト可能な純関数へ分離し、境界直前・試験日・翌日を固定時刻で検証する
- `Date.now()` をテストで直接モックするだけの構造にせず、任意の `nowMs` を渡せる小さなresolverを使う

## 手順

### Phase A: 実体確認

1. DN-0100がローカルで完了していることを確認する
2. `verify-note-magazines` で公開商品と価格のSoT一致を確認する
3. L1/L2の見出し、リンク、商品順を表にし、削除・追加・移動を差分単位で確定する
4. 技術士一次の公開入口は `pe1-takuitsu-pdf`（`n466132e6fd74`）とし、`note-magazines.ts` の `published:true` とURLを再確認する

### Phase B: ローカル実装

1. L1のコンクリート「準備中」を公開実体へ更新し、技術士一次入口を追加する
2. 3 L2の節を確定設計の順へ移動する。本文の技術内容や価格は書き換えない
3. `magazine-placement.ts` に1級一次の季節resolverを追加し、手動の「10月中旬に戻す」コメントを削除する
4. 既存の配置テストへ、試験前・試験日・試験後のケースを追加する

### Phase C: ソース検証

```bash
npm run audit-note-funnel
npm run check-note-funnel
npm run check-magazine-cta:ci
npm run check-note-link-cards
npm run check-note-site-utm
npm run verify-note-magazines
npm run type-check
git diff --check
```

L1/L2のURL重複、資格セグメント混在、未公開URL、価格直書きの陳腐化がないかも確認する。ここで変更差分とライブ更新方法を提示し、ユーザー承認まで停止する。

### Phase D: noteライブ反映（ユーザー承認後のみ）

- `/publish-note --update` の安全手順を使い、L1→各L2の順に1本ずつ更新する
- select-all→pasteは禁止。節移動が安全な部分更新でできない場合は、無理に自動化せずユーザーへ方法を提示する
- 更新通知は「いいえ」。既存のnoteネイティブ目次、画像、価格、マガジンカードを保持する
- 各記事の公開APIで新しい見出し・リンク・旧「準備中」の消失を確認する
- `audit-note-funnel -- --live --ci` と目視でL1→L2→記事→同資格L2の往復を確認する

## 停止条件

- DN-0100が未完了で同じCTAへ競合する
- 未公開商品をL1/L2へ載せる必要がある
- 新規L2作成が必要になる
- note本文の安全な部分更新ができない
- アカウント不一致、ログイン、CAPTCHA、価格・目次・画像の保持不能
- 外部変更のユーザー承認がない

## 抽出先と削除条件

季節resolverの恒久仕様は `note-funnel-architecture.md` とコード近傍コメントへ抽出する。新規L2判断などの残件は別カードにする。全受入条件・ライブ実査・参照除去後に本planとDN-0101カードを削除する。

## Claude Code起動プロンプト

```text
DN-0101を実装してください。

最初にAGENTS.md、.claude/todo/backlog.mdのDN-0101、
.claude/plans/DN-0101-note-funnel-information-architecture.md、
.claude/skills/social/audit-note-funnel/SKILL.md、
.claude/knowledge/reference/note-funnel-architecture.mdを全文読んでください。

DN-0100が未完了なら競合箇所を変更せず停止してください。
planのPhase Aで公開実体を確認してから、L1、3つのL2、1級一次の季節CTAをローカル実装してください。
新しい商品やL2は作らず、公開済み実体だけを案内してください。

L2は「無料で現在地確認→買い切り/伴走を選ぶ→有料で仕上げる→目的別逆引き」の順にし、
資格を跨ぐL3導線、未公開URL、価格の新規直書きを入れないでください。
1級一次CTAはexam-calendar.json駆動とし、試験前・当日・翌日の固定日テストを追加してください。

Phase Cの検証結果とnoteライブ更新差分を報告し、ユーザーが明示承認するまでnote.com更新・publish・deployを実行しないでください。
承認後はL1から1本ずつ安全に更新し、通知「いいえ」、目次・価格・画像保持、公開API実査を必須にしてください。
```
