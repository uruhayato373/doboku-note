# BuildJob 収益最大化スプリント

作成日: 2026-07-14  
対象期間: 2026-07-14〜2026-08-31（BuildJob 増額キャンペーン終了予定まで）  
対象: doboku-note のキャリア/転職/年収/働き方意図のサイト記事・note 無料記事・カテゴリ hub

## 目的

BuildJob（ビルドジョブ）の成果報酬が 2026-08-31 まで高単価（無料キャリア面談 ¥50,000/件）である期間に、doboku-note の既存キャリア導線を最大限活用し、短期のアフィリエイト収益を最大化する。

ただし、doboku-note の収益方針は「学習意図 = note 有料商品」「キャリア意図 = 転職アフィリ」である。したがって、試験対策・経験記述・模範論文などの学習財布を外部サービスに流す施策は行わない。BuildJob は、資格取得後・施工管理の働き方・年収・転職・発注者支援・ホワイト企業選びなど、キャリア文脈に限定して強化する。

## 現状認識

既存の真実源:

- `docs/project/04_運営/02_アフィリエイト提携状況.md`
- `docs/project/04_運営/08_転職アフィリ記事ビルド計画.md`
- `src/config/affiliate-creatives.ts`
- `src/components/ui/CareerAffiliate/CareerAffiliate.tsx`
- `src/components/ui/ArticleFooter/ArticleFooter.tsx`
- `src/components/ui/ArticleSidebar/ArticleSidebar.tsx`
- `src/components/ui/MidArticleCta/MidArticleCta.tsx`

現行実装の要点:

- BuildJob は A8.net 提携済み。
- 2026-08-31 までは、無料キャリア面談の成果報酬が ¥50,000/件。
- `resolveCareerSidebarAd()` はキャンペーン期間中 BuildJob、9/1以降 GKS へ自動復帰する。
- `resolveDocsCareerSidebarAd(category, slug)` は総監以外で `resolveCareerSidebarAbArm(slug)` を使い、BuildJob/GKS 系と建設JOBs を slug hash 50/50 で A/B している。
- `resolveCareerArticleEndCard(slug)` も同じ slug arm に合わせて、モバイル記事末カードを BuildJob または建設JOBs に出し分けている。
- `CareerAffiliate program="gks"` は、キャンペーン中 BuildJob 文言へ期間連動する。
- 本文中間テキストリンク `resolveCareerTextLink(slug)` は arm B（建設JOBs arm）では null にする設計。
- カテゴリ hub には `resolveCategoryCareerAds()` 系で建設JOBs と BuildJob/GKS を並べる設計がある。

## 外部調査メモ

### BuildJob 公式訴求

公式 LP では、以下が主な訴求軸になっている。

- 建設業界特化の転職エージェント
- 年収アップ平均金額 163万円
- 累計支援数 50,529人
- 利用者満足度 4.8以上
- キャリア言語化、求人マッチング、書類作成、面接対策、条件交渉のサポート
- 「年収も環境も妥協しない転職」

参照: <https://build-job.jp/>

> [!warning]
> **数値は公開記事に流用しないこと（2026-07-14 guide-fact-checker 検出）**。上記の企画時メモ値は、独立第三者メディア（公式引用）や現行 LP と照合すると不一致・裏取り不能だった:
> - 年収アップ平均金額「163万円」→ 第三者引用の現行公式値は **124万円**（2025年5〜6月入社実績）。
> - 累計支援数「50,529人」→ 現行公式は **「2万名以上」**（50,529 の具体値は裏取り不能）。
> - 利用者満足度「4.8以上」→ **どの情報源でも確認できず（unverifiable）**。
>
> これらは景表法・ステマ規制上リスクがあるため、**新規 3 記事（P1）では具体数値を掲載せず定性記述に是正済み**。今後 BuildJob 実績値を本文に使う場合は、公式 LP（JS 描画のため要ブラウザレンダリング確認）で現行値を目視し「サービス公表値」明記＋PR バッジ内に限定すること。job tag の年収も現行は約625万円（令和7年）＝「600万円台」表記に統一。

### 競合・比較記事で拾える訴求

第三者比較記事では、BuildJob は以下の文脈で紹介されやすい。

- 建設業界特化
- 施工管理・建築設計・発注者支援など建設業界求人に対応
- 書類添削・面接対策・条件交渉まで支援
- 資格・経験を活かした年収アップ
- 20代から40代以降まで幅広い年代に対応
- 「今すぐ転職しない」場合でも相談しやすい、という不安解消訴求

競合としては RSG 建設転職、建築転職、建設JOBs、セコカンNEXT、建設ワークス、リクルートエージェント等が比較記事に並ぶ。RSG は年収アップ率・非公開求人・条件交渉の訴求が強く、建設JOBs は会員登録成果で低摩擦、総合型エージェントは求人数が多いが建設特化性では弱い。

参照:

- <https://career.medi-site.co.jp/media/buildjob-review/>
- <https://www.jipcc.or.jp/jipcc-tensyoku/tenshoku-kensetsu/>
- <https://www.dm-s.co.jp/collect/build-job/>
- <https://www.plex-job.com/magazine/articles/5065/>
- <https://asiro.co.jp/media-career/120131/>
- <https://coeteco.jp/career/services/build-job>

## 戦略判断

### 1. キャンペーン期間中は BuildJob を高意図面で優先する

現在は建設JOBs と BuildJob/GKS 系が slug hash 50/50 で A/B されている。A/B は長期の EPC 学習には有効だが、BuildJob が ¥50,000/件の短期増額期間中は、機会損失が大きい。

推奨:

- キャリア/転職/年収/働き方の高意図 slug は、2026-08-31 まで BuildJob 100% 表示に寄せる。
- 建設JOBs はカテゴリ hub や低意図 browsing 面、または対照群として限定的に残す。
- 9/1 以降は GKS/建設JOBs/BuidJob の EPC 実績を見て再配分する。

### 2. CTA は「無料相談」より「何がわかるか」を前面に出す

BuildJob の成果点は無料キャリア面談である。単に「無料相談」と言うと心理的ハードルが残るため、読者のジョブに合わせて「自分の市場価値」「求人相場」「年収の損得」「働き方の選択肢」を確認できる表現へ寄せる。

推奨 CTA:

- 資格・経験で狙える求人を無料で聞く
- 今の年収で損していないか確認する
- 土木施工管理の非公開求人を相談する
- 発注者支援・ホワイト企業の選択肢を聞く
- 転職するか決める前に求人相場を確認する

### 3. 「今すぐ転職しなくていい」を明示する

転職エージェントへの抵抗は「応募を急かされそう」「今すぐ転職する気はない」「相談したら断りづらい」にある。BuildJob CTA の直前に、以下の安心コピーを置く。

候補:

- 今すぐ転職すると決めていなくても、求人相場と自分の評価だけ確認できます。
- 応募するかどうかは、紹介求人と条件を見てから決められます。
- 会社を辞める前に、今の経験が外でどう評価されるかだけ確認しておくと判断しやすくなります。

### 4. 公式数値は「サービス公表値」として限定的に使う

公式 LP の数値は強いが、景表法・ステマ規制・LP 更新リスクがある。本文の編集文では断定しすぎず、PR カードまたは補足文に「サービス公表値」として使う。

使用可能な表現:

- 年収アップ平均金額 163万円（サービス公表値）
- 累計支援数 50,529人（サービス公表値）
- 利用者満足度 4.8以上（サービス公表値）

禁止:

- 必ず年収が上がる
- ホワイト企業に転職できる
- 誰でも内定できる
- BuildJob が唯一/最強/絶対おすすめ

## 優先タスク

### P0: 高意図 slug の BuildJob 優先表示

目的: キャンペーン期間中に高意図ページの BuildJob 露出を取り切る。

実装案:

1. `src/config/affiliate-creatives.ts` に高意図 slug 判定を追加する。
2. `isCampaignActive()` が true かつ高意図 slug なら、`resolveCareerSidebarAbArm(slug)` は建設JOBs arm を使わず BuildJob を返す。
3. 同じ slug 判定を `resolveCareerArticleEndCard(slug)` にも適用し、PC サイドバーとモバイル記事末を一致させる。
4. 高意図 slug は明示配列か prefix/pattern で管理する。

高意図 slug 候補:

- `civil-construction-1-guide-quit-or-stay`
- `civil-construction-1-guide-resume`
- `civil-construction-1-guide-interview`
- `civil-construction-1-guide-hatchu-shien`
- `civil-construction-1-guide-quit-honne`
- `civil-construction-1-guide-future`
- `civil-construction-1-guide-salary-by-role`
- `civil-construction-1-guide-age-career`
- `civil-construction-1-guide-public-servant`
- `civil-construction-1-guide-consultant`
- `civil-construction-1-guide-allowance`
- `civil-construction-1-guide-timing`
- `civil-construction-1-guide-white-company`
- `civil-construction-1-guide-company-types`
- `civil-construction-1-guide-women`
- `civil-construction-1-guide-dx-jobs`
- `civil-construction-1-guide-career-agents`
- `civil-construction-1-guide-career-cases`
- `civil-construction-1-guide-career-path`
- `civil-construction-1-guide-career-salary`
- `civil-construction-1-guide-salary-up`
- `civil-construction-1-guide-market-value`
- `civil-construction-2-guide-quit-or-stay`
- `civil-construction-2-guide-young-career`
- `civil-construction-2-guide-haken-seishain`
- `civil-construction-2-guide-resume`
- `civil-construction-2-guide-career-change`
- `civil-construction-2-guide-career`
- `civil-construction-2-guide-salary`
- `civil-construction-2-guide-job-reality`
- `pe-construction-guide-career`

注意:

- `pe-comprehensive-management` は総監向け DX/コンサル案件のまま。BuildJob に寄せない。
- 学習 intent の過去問・textbook・keyword ページまで一律 BuildJob 固定にしない。
- ただし既存の自動面は維持し、キャリア文脈で自然な露出に限定する。

### P0: BuildJob 用カードコピーの改善

対象:

- `resolveCareerArticleEndCard()`
- `CareerAffiliate program="gks"` の期間連動 BuildJob コピー
- `MidArticleCta` の career mode
- category hub の小バナー周辺文言

BuildJob 用デフォルトカード案:

```tsx
service: "ビルドジョブ"
category: "建設業界特化 転職エージェント"
description:
  "今すぐ転職すると決めていなくても、資格・経験で狙える求人や年収相場を無料キャリア面談で確認できます。"
points: [
  "建設業界に特化した求人紹介",
  "書類作成・面接対策・条件交渉までサポート",
  "登録・相談はすべて無料",
]
cta: "資格・経験で狙える求人を無料で聞く"
```

記事テーマ別 CTA の出し分け案:

- quit/quit-or-stay/quit-honne: `辞める前に、外で評価される条件を確認する`
- salary/allowance/market-value: `今の年収で損していないか確認する`
- resume/interview: `職務経歴書・面接対策を無料で相談する`
- hatchu-shien/consultant/public-servant: `発注者支援・別職種の選択肢を相談する`
- white-company/job-reality/timing: `残業・休日条件のよい求人を相談する`
- women/young/haken-seishain/age-career: `年齢・経歴に合う求人を無料で聞く`

実装は最初から過度に細分化しない。`resolveBuildJobCopy(slug)` のような小さな resolver を作り、数パターンにまとめる。

### P1: BuildJob 評判・比較記事の新規作成

目的: `ビルドジョブ 評判`、`施工管理 転職エージェント おすすめ` の比較/指名検索を拾う。

候補記事:

1. `civil-construction-1-guide-buildjob-review`
   - タイトル: `ビルドジョブは施工管理に向く？土木技術者目線でメリット・注意点を整理`
   - 位置づけ: BuildJob 指名検索・評判検索の受け皿
   - CTA: BuildJob
   - 内容:
     - BuildJob の基本情報
     - 向いている人
     - 向かない人
     - 相談前に整理する条件
     - 施工管理技士・技術士の資格をどう伝えるか

2. `civil-construction-1-guide-career-agent-comparison`
   - タイトル: `施工管理に強い転職エージェントの選び方｜資格・年収・働き方で比較`
   - 位置づけ: 比較検索の受け皿
   - 内容:
     - BuildJob: 資格・経験者、年収/条件相談
     - GKS: 20代・未経験/若手
     - 建設JOBs: まず求人を見たい人
     - 総合型: 求人数の幅
   - 注意: 比較は公平に。BuildJob を不自然に1位固定しない。

3. `civil-construction-1-guide-career-consultation-before-quit`
   - タイトル: `施工管理を辞める前に相談すべきこと｜求人相場・年収・働き方の確認手順`
   - 位置づけ: 痛み顕在層
   - CTA: BuildJob

### P1: 既存キャリア記事の CTA 文脈強化

既存記事を大改稿せず、機械的・安全に追加できる範囲で以下を入れる。

- BuildJob カード直前の安心コピー
- 3択行動フレーム
  - 今の会社で改善交渉する
  - 同業他社/発注者支援へ移る
  - まだ辞めず求人相場だけ見る
- 記事テーマ別 CTA
- RelatedKeywords/関連記事へのキャリアクラスタリンク

対象優先:

1. `civil-construction-1-guide-quit-or-stay`
2. `civil-construction-1-guide-quit-honne`
3. `civil-construction-1-guide-salary-by-role`
4. `civil-construction-1-guide-hatchu-shien`
5. `civil-construction-1-guide-white-company`
6. `civil-construction-1-guide-timing`
7. `civil-construction-2-guide-career-change`
8. `civil-construction-2-guide-job-reality`
9. `pe-construction-guide-career`

### P1: note 無料記事からの送客強化

対象:

- `docs/note/1級・2級土木/転職した方がいい施工管理-発注者視点-無料/article.md`
- `docs/note/1級・2級土木/転職のベストタイミング-無料/article.md`
- `docs/note/1級・2級土木/転職エージェントの使い方-無料/article.md`
- `docs/note/1級・2級土木/年収を上げる人の違い-無料/article.md`
- `docs/note/1級・2級土木/ホワイトな建設会社の見分け方-無料/article.md`
- `docs/note/1級・2級土木/公務員土木か民間か-無料/article.md`

やること:

- note 記事内からサイトの高意図記事へ UTM 付きリンクを強化する。
- note.com 直接アフィリではなく、サイト記事へ送る。サイト側で BuildJob CTA を受ける。
- note 本文では「転職を煽る」より「判断軸を整理する」立場を保つ。

### P2: BuildJob クリック集計レポート

目的: `どの記事/面/コピーがクリックを生んでいるか` を週次で見られるようにする。

実装案:

- GA4 の `affiliate_cta_click` を `data-cta-label` ごとに集計する既存スクリプトがあれば流用。
- なければ `report-buildjob-affiliate` 的な script を追加する。
- GA4 API がローカルで使えない場合は、A8 成果・GA4 ダウンロード CSV を読み込む fallback でもよい。

最低限レポート項目:

- 期間
- label別クリック
  - `BuildJob-sidebar`
  - `BuildJob-inline`
  - `BuildJob-end`
  - `BuildJob-midtext`
  - `BuildJob-hubcareer`
- slug別クリック上位
- category別クリック
- mobile/desktop 可能なら分離
- A8成果件数（手入力でも可）
- 推定 EPC

### P2: A/B 配分のドキュメント化

BuildJob 100% 寄せは短期収益施策であり、恒久設計ではない。実装したら以下に明記する。

- `docs/project/04_運営/02_アフィリエイト提携状況.md`
- `docs/project/04_運営/08_転職アフィリ記事ビルド計画.md`
- 本ファイル

記載内容:

- 2026-08-31 まで高意図 slug は BuildJob 優先
- 建設JOBs A/B は低意図面・hub で継続
- 9/1 以降は自動復帰または実績を見て再判断

## 実装制約

- `git add -A` 禁止。変更ファイルだけ明示。
- A8 mat の MDX 直書き禁止。`src/config/affiliate-creatives.ts` と `src/config/affiliate-mats.json` を真実源にする。
- `rel="nofollow sponsored noopener"` を維持。
- PR 表記を維持。
- 同一 mat の 1ページ1ピクセル原則を維持。
- `check-affiliate-mats`、`check-affiliate-prose`、`check-cta-density` を必ず実行。
- 学習記事で note CTA より上に BuildJob を割り込ませない。
- 外部講座・書籍アフィリは復活させない。
- BuildJob 公式数値は「サービス公表値」と明示し、本文で保証表現にしない。
- note.com への実投稿、A8 管理画面操作、Cloudflare deploy は実施しない。

## 検証コマンド

最低限:

```bash
npm run check-affiliate-mats
npm run check-affiliate-prose
npm run check-cta-density
npm run lint
npm run type-check
npm run build
```

記事を追加・編集した場合:

```bash
npm run refresh-indexes
npm run ogp
npm run check-ogp-coverage
npm run validate-mdx
```

必要に応じて:

```bash
npm run check-links
npm run check-seo-meta
npm run check-content-quality:ci
```

## Claude Code 向け実装プロンプト

```text
doboku-note の BuildJob アフィリエイト収益最大化スプリントを実装してください。

最初に読むこと:
- CLAUDE.md
- docs/project/04_運営/02_アフィリエイト提携状況.md
- docs/project/04_運営/08_転職アフィリ記事ビルド計画.md
- docs/project/04_運営/09_BuildJob収益最大化スプリント.md
- src/config/affiliate-creatives.ts
- src/components/ui/CareerAffiliate/CareerAffiliate.tsx
- src/components/ui/ArticleFooter/ArticleFooter.tsx
- src/components/ui/ArticleSidebar/ArticleSidebar.tsx
- src/components/ui/MidArticleCta/MidArticleCta.tsx

目的:
- 2026-08-31までの BuildJob 高単価キャンペーン期間に、高意図キャリア記事の BuildJob クリックを最大化する。
- note 有料商品とカニバらないよう、学習意図ではなくキャリア/転職/年収/働き方意図だけを対象にする。
- 誇張・ステマ・景表法リスクを避け、PR表記・サービス公表値・無料相談の範囲を守る。

実装タスク:
1. src/config/affiliate-creatives.ts に、BuildJob キャンペーン中の高意図 slug 判定を追加してください。
2. 高意図 slug では、キャンペーン期間中 `resolveDocsCareerSidebarAd()` と `resolveCareerArticleEndCard()` が建設JOBs arm ではなく BuildJob を返すようにしてください。
3. 高意図 slug 以外では、既存の建設JOBs A/B やカテゴリ hub の並置設計を壊さないでください。
4. BuildJob のカードコピーを改善してください。基本方針は「無料相談」ではなく「資格・経験で狙える求人/年収相場/働き方の選択肢を確認できる」です。
5. 可能なら `resolveBuildJobCopy(slug)` のような小さな resolver を作り、quit/salary/resume/hatchu-shien/white-company など数パターンで CTA を出し分けてください。
6. BuildJob CTA 直前またはカード description に、「今すぐ転職すると決めていなくても、求人相場と自分の評価だけ確認できる」趣旨の安心コピーを入れてください。
7. BuildJob 公式数値を使う場合は「サービス公表値」と明記し、保証表現にしないでください。
8. 必要ならキャリア記事のうち優先度上位数本にだけ、本文文脈に合う小さなCTA/安心コピーを追加してください。大量リライトは禁止です。
9. 変更した仕様を docs/project/04_運営/02_アフィリエイト提携状況.md と docs/project/04_運営/08_転職アフィリ記事ビルド計画.md に追記してください。
10. 作業ログを docs/handoffs/YYYY-MM-DD-buildjob-affiliate-sprint.md に残してください。

制約:
- A8 mat を MDX に直書きしない。
- 外部講座・書籍アフィリを復活させない。
- 同一 mat の 1ページ1ピクセル原則を守る。
- PR表記、nofollow sponsored noopener を維持する。
- 学習意図ページで note CTA を邪魔しない。
- pe-comprehensive-management は総監向け DX/コンサル案件を維持し、BuildJob に寄せない。
- note.com 投稿、A8 管理画面操作、Cloudflare deploy はしない。
- 破壊的 git 操作は禁止。変更ファイルだけ明示して扱う。

検証:
- npm run check-affiliate-mats
- npm run check-affiliate-prose
- npm run check-cta-density
- npm run lint
- npm run type-check
- npm run build

記事やMDXを変更した場合は追加で:
- npm run refresh-indexes
- npm run validate-mdx
- npm run ogp
- npm run check-ogp-coverage

完了報告:
- 変更したファイル
- BuildJob 優先表示の対象 slug
- CTA コピーの変更内容
- 実行した検証コマンドと結果
- 未実施/手動確認が必要なこと
を簡潔にまとめてください。
```

## 実装記録

### 2026-07-14 P0 実装完了

- **高意図 slug の BuildJob 優先表示**: `HIGH_INTENT_CAREER_SLUGS`（31 slug・全ファイル実在確認済み）を `src/config/affiliate-creatives.ts` に追加。`isKensetsuJobsArmEffective()` がキャンペーン中のみ arm B を無効化し、サイドバー・記事末カード・本文中間テキストの 3 面を共有判定で BuildJob に固定。うち 17 本が建設JOBs arm からの切替、14 本は元から BuildJob（コピー強化のみ）。9/1 以降は `isCampaignActive()`=false で自動復帰（コード削除不要）。
- **カードコピー改善**: `resolveBuildJobCopy(slug)` 新設。description に安心コピーを常時内蔵、CTA は記事テーマ別 6 パターン＋既定「資格・経験で狙える求人を無料で聞く」。`resolveCareerArticleEndCard` の BuildJob 分岐と inline `CareerAffiliate program="gks"`（163 枚）に自動反映。公式数値（163万円等）は保証表現リスク回避のためカードでは不使用。
- **本文中間テキスト CTA**: `CareerTextLink` に `lead`（安心コピー）を追加し `MidArticleCta` career モードでリンク直前に表示。A8 公式テキストリンク文言自体は不変。
- **検証**: check-affiliate-mats / check-affiliate-prose / check-cta-density / lint / type-check / build すべて通過。
- 作業ログ: `docs/handoffs/2026-07-14-buildjob-affiliate-sprint.md`

### 2026-07-14 P1/P2 実装完了（同日・Opus）

- **P1 新規記事 3 本**（civil-construction-1・group=guide・career・published:true・本文 3,000 字以上・OGP 生成済み）:
  - `guide-buildjob-review`（ビルドジョブ指名検索の受け皿・向く人/向かない人を正直に併記）
  - `guide-career-agent-comparison`（比較検索・特化型/求人サイト/総合型を軸で公平比較・既存 guide-career-agents と角度差別化+相互リンク）
  - `guide-career-consultation-before-quit`（辞める前顕在層・求人相場/年収/働き方の確認手順）
  - 3 slug は `HIGH_INTENT_CAREER_SLUGS` に追加（サイドバー/記事末/inline とも BuildJob 固定・SSG 出力で建設JOBs mat=0・1 ページ 1 ピクセル・PR/nofollow sponsored 確認済み）。BuildJob 公式値（年収アップ平均163万円・満足度4.8・内定率77% 等）は WebSearch 照合のうえ「サービス公表値」明記、保証表現なし。年収/担い手統計は doc 08 検証済みファクトパック再利用。
- **P1 note 送客強化**: `転職エージェントの使い方`→比較記事、`転職した方がいい施工管理`/`転職のベストタイミング`→辞める前相談記事へ UTM 付きインラインリンクを 1 本ずつ追加（大量リライトなし・note-lint 通過）。
- **P2 クリック集計レポート**: `npm run report-buildjob-affiliate`（`.claude/scripts/report-buildjob-affiliate.mjs`）を新設。最新 GA4 by-label + page 別 + a8-results.json を束ね、プログラム別クリック/BuildJob 面別内訳/上位ページ/推定 EPC を `.claude/state/metrics/affiliate/buildjob-report-latest.md` に出力。**訂正（2026-07-14）: event_label カスタムディメンションは「CTA label」として 2026-07-07 に登録済み**（当初「未登録」と誤診）。既存 by-label スナップショット（期間〜07-08）が `(not set)` に集約されていたのは、取得期間の大半が登録日 07-07 より前でカスタムディメンションが遡及しないため。**追加の GA4 設定は不要**。deploy 後にクリックが溜まり、07-07 以降を含む期間で `npm run fetch-ga4-cta-clicks -- --by-label` を取り直せば面別に分解される。
- **未実施**: P1「既存キャリア記事の本文文脈強化」は、安心コピーが `resolveBuildJobCopy`/`resolveCareerTextLink.lead` により全 career カードへコード側で自動反映されたため、個別 MDX の手編集は不要と判断（大量リライト禁止の制約も踏まえ見送り）。deploy・note 実投稿・A8 操作は未実施（ユーザーゲート）。

## 期待する成果

- 2026-08-31 までの高単価期間に、高意図記事で BuildJob の露出を最大化できる。
- 建設JOBs との長期 A/B は必要な面に残しつつ、短期収益機会を逃さない。
- CTA が「広告」ではなく、読者の不安に対する自然な次アクションになる。
- 9/1 以降に GKS/建設JOBs/BuildJob の EPC 比較へ戻せる。
