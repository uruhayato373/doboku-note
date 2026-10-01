---
name: a8-affiliate-pipeline-2026-07
description: stats47のA8 Playwrightパイプラインをdobokuへ移植。Phase1(承認確認)完了・commit f9ceac3e7。残=実機ログイン→セレクタ確定→Phase2/3
metadata: 
  node_type: memory
  type: project
  originSessionId: daa93bb3-29a4-4d15-b735-f413cf1a4ef6
---

2026-07-20 開始。stats47 の A8.net アフィリ操作パイプライン（`~/stats47/.claude/skills/ads/scout-asp/`）を doboku へ移植。ユーザーの主目的＝**申請済みアフィリの承認確認**（`list`）。ブランチ `feat/a8-affiliate-pipeline`（develop から・code系なのでPR予定）。

**設計の核（stats47 との非互換）**: stats47 の register 先は `AFFILIATE_ADS[]`（10-vertical intent-hub・R2 snapshot 配信）。doboku の creative SSOT は手キュレーションの `src/config/affiliate-creatives.ts`（3枠・意図配置・カニバリ回避）。→ **前段(login/scout/apply/check-approval/harvest)は移植可、register(自動配置)は移植しない**。harvest は配置候補(SidebarAdCreative形+affiliate-mats.json追記案)を catalog の adDraft に出力するまで・確定配置は人判断。scout は A8 カテゴリ09(仕事)のみ＋講座/教材/書籍/添削を blocklist 恒久除外（[[feedback_affiliate_career_only]] の Red Line 機械強制）。

**Phase 1 完了（commit f9ceac3e7・11ファイル）**: `.claude/skills/ads/scout-asp/{login.mjs,a8-browser.ts,SKILL.md}`（新カテゴリ ads・90→91スキル）／`.claude/scripts/ads/lib/{a8-scout-core,a8-code-core}.mjs`（純関数コア・stats47からほぼ忠実移植）／`check-a8-apply-budget.cjs`／`data/a8-curated.json`（doboku転職スコープ・vertical=civil-career/pe-career/career・weeklyApplyMax5）／`.claude/state/ads/a8-catalog.json`（空）／canon `docs/reference/a8-affiliate-pipeline.md`。`a8-browser.ts` は stats47 に無い `list`（申込中+参加中を読み配置済みmatと突合）を追加。認証＝永続プロファイル`.local/playwright-a8-profile`＋`login.mjs`が storageState を `.local/playwright-a8-state.json` に捕獲→起動時 addCookies 再注入（A8認証は揮発Cookie）。純粋コア健全性テスト全green（resolveVertical最長一致バグ＝汎用長語が具体語を上回る問題を修正済）。

**Phase 1 実機検証 完了（2026-07-20・commit 4d4129e19）**: ユーザーが `login.mjs` で手動ログイン成功（Cookie19件保存）。セレクタは stats47 の media-console.a8.net 値が**実機で全一致**（div.pgInner/h3.pgName/p.ecName/pgDetail/labelInfo/labelValue/`programId=(s\d+)`）。`list` 実走で **申込中39(審査待ち)/参加中134(承認済み)/配置済み8mat** を正しく照合。承認済み134のうち転職系24（civil-career5・pe-career1・career18）、非転職110（過去の広範な提携＝Antivirus/光回線/ブライダル/占い/車査定等）。**バグ修正**: `/program/list/applying` は `?pageNo=` が効かず毎回同じ1ページ(39件)を返すため collectList が同一集合を30回集めて申込中1170に膨張していた→programId dedupe＋新規0で打ち切りに修正（partnered は real ページネーションで134正常）。注: resolveVertical は「建設業/施工管理」が貪欲で建設ファクタリング・施工管理通信講座も civil-career に誤タグ（配置は手判断なので実害なし・curated 微調整余地）。

**Phase 2 一部実施＝キーワード検索＋pe案件4件申請（2026-07-20・commit 38de6086b）**: A8 にキーワード検索 `/program/search/keyword?keywords=…` があり、doboku ニッチ語で未提携の有望案件を探索可能（`.tmp/a8-search-explore.mjs` 参照。civil は GKS/ビルドジョブ/建設JOBs で充足済＝カニバリ、pe=技術士/ハイクラスが伸びしろ）。ユーザー選定の pe-career 4件を **doboku-note で提携申請（全て審査中）**: LHH転職(s00000026941002)/コンコード(s00000026492001)/ランスタッド プロフェッショナル(s00000019113004)/タイズ メーカー転職(s00000027409001)。週次申請 4/5。

> [!critical] **複数サイト口座＝申請時 webSiteId=doboku-note を必須選択**。この A8 口座は 001 統計で見る都道府県(stats47) / 002 doboku-note の2サイト登録。apply detail の `<select name=webSiteId>` 既定は 001＝盲目クリックだと **stats47 で提携申請してしまう**。`applyToProgram` に「申請前に doboku-note を selectOption→read-back 検証、選べなければ申請中止(error)」の site assert を実装済（TARGET_SITE 定数）。ヘッダの「サイト名 統計で見る都道府県様」は口座既定サイト表示で申請 webSiteId とは別軸（申請後も 001 表示のまま＝正常）。**注意: 以前 list で取った 参加中134/申込中39 は口座横断の可能性＝doboku-note 単独の提携数ではないかもしれない（要確認）。**

**完成度アップ完了（2026-07-20・commit 38de6086b の後続）**: 未検証・不足を実機検証しつつ全部埋めた。(1) **search コマンド新設**＝`/program/search/keyword` で curated `searchKeywords`（施工管理/技術士/ハイクラス等10語）を狙い撃ち検索→既提携/blocklist除外→candidate化（scout=カテゴリ09・1ページはニッチに弱いため search 推奨。`--keyword` 単発可）。(2) **harvest に websiteId=doboku-note 選択**追加（create-link は `<select name=websiteId>` 小文字w＝apply の webSiteId と別名・ラベル "doboku-note【アピールサイト】"）。実機検証: GKS harvest の a8mat が配置済み mat と完全一致＝doboku-note コードが取れる確証。(3) `harvest --program <pid>` 狙い撃ち。(4) **list は口座横断**（`?webSiteId=` は A8 で無視＝doboku-note 単独に絞れない）と明示。(5) check-approval 実機検証（審査中4件で0昇格＝正常）。(6) **純関数コアの node:test 30件移植**（`npm run test:ads`・全pass）。**残る唯一の未検証は `scout`(本走)だが search が上位互換なので実害小。** list/search/apply/check-approval/harvest は実機検証済＝実用可。

**残（次フェーズ）**:
1. Phase 2 = scout+apply の実走（転職案件開拓・A8カテゴリ09のみ・週次上限5）。Phase 3 = harvest → affiliate-creatives.ts 手配置支援＋agent `affiliate-manager` 検討。配置候補=承認済みだが未配置の pe/career 系（例 Groovement CxO/DX・明光エンジニア転職）。
2. ~~develop への取り込み~~ **完了**: feat/a8-affiliate-pipeline を develop に ff マージ＋origin/develop へ push 済（54cb36995・計4コミット f9ceac3e7/4d4129e19/38de6086b/54cb36995）。feature ブランチ削除済。
3. 小残: `docs/reference/playwright-auth-profiles.md` に a8 profile 行を追記（別セッションの未コミットファイルのため未着手・canon doc 側には記載済）。

node_modules は容量削減で消していたが本作業で `npm install --legacy-peer-deps` 復元済（[[npm-ci-broken-use-legacy-peer-deps]]）。pre-commit は 15+ スクリプト直列で重く2分超（bg commit で完走）。
