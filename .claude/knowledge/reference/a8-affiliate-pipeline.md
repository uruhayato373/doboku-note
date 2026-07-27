# A8.net アフィリエイト パイプライン（doboku-note）

A8.net の提携アフィリエイトを Playwright で操作し、**申請済みアフィリの承認確認 → 転職案件の開拓 → 申請 →
承認 → 広告コード取得 → 配置候補出力** までを回す運用の SSOT。2026-07-20 制定（stats47 の同名パイプラインを
doboku=転職一本へ移植・スリム化）。

## なぜ必要か

- A8.net は **公開 API が無い**（`.claude/state/metrics/affiliate/a8-results.json` も「月1手入力」）。提携状況の確認・
  広告コード取得は管理画面の手作業しかなく、Playwright 自動操作が唯一の機械化手段。
- doboku の提携は `.claude/knowledge/reference/affiliate-operations.md` に**人手で記録**しているため、A8 実機との
  ドリフト（申請したが承認されたか／却下されたか）を人が追えていなかった。`list` で機械照合する。

## doboku 固有の設計（stats47 との違い）

> [!important] register は手キュレーション（自動一括配置しない）
> stats47 の register 先は `AFFILIATE_ADS[]`（10-vertical intent-hub・R2 snapshot 配信）。doboku の creative SSOT は
> `src/config/affiliate-creatives.ts`（**3枠・意図配置・カニバリ回避・campaign 窓**）で、自動追記機構は持たない。
> よって **harvest は「配置候補（`SidebarAdCreative` 形 + `affiliate-mats.json` 追記案）を catalog の `adDraft` に出力」
> するまでで止め、確定配置は人が判断**する。1ページ1ピクセル・vertical セグメント・campaign 窓を機械で壊さないため。

> [!warning] 転職一本の Red Line を機械強制
> doboku は 2026-06-25 に講座/教材/書籍/添削アフィリを完全廃止（note 有料商品とのカニバリ回避・memory
> `affiliate-career-only`）。本パイプラインは (1) scout を A8 カテゴリ **09(仕事) のみ**に限定（curated
> `categoryCodeToVertical`）、(2) `blocklistKeywords` に「講座/教材/参考書/問題集/添削/予備校/通信教育/eラーニング/**スクール/学習塾**」を
> 追加、の2段で非転職案件を機械除外する。さらに (3) `offTargetKeywords`（薬剤師/看護/介護 等）は
> **規約NGではないが読者と無関係**な業種として別枠で除外する（Red Line の意味を濁らせないため）。

## 申請サイト assert（複数サイト口座・最重要）

> [!warning] 申請時は必ず webSiteId=doboku-note を選ぶ
> この A8 口座は**複数サイト登録**（`webSiteId=001` 統計で見る都道府県〔stats47〕/ `002` doboku-note）。
> apply の detail ページには `<select name="webSiteId">` があり、**既定は 001（口座の既定サイト）**。
> 盲目的にボタンを押すと **stats47 のサイトで提携申請してしまう**（2026-07-20 に実機で判明）。
> `applyToProgram` は申請前に `TARGET_SITE="doboku-note"` を selectOption し、read-back で確定を検証、
> doboku-note が選べない場合は**申請を中止（error）**する（誤サイト提携の構造的防止＝publish-x/coconala の
> account assert と同じ思想）。ヘッダーの「サイト名 統計で見る都道府県様」は口座の既定サイト表示で、
> 申請フォームの webSiteId とは別軸（申請成立後も表示は 001 のまま＝正常）。
>
> **harvest（広告コード取得）も同様**: create-link ページの `<select name="websiteId">`（**小文字 w**＝apply の
> `webSiteId` とは別名・ラベルは "doboku-note【アピールサイト】"）を doboku-note に選んでからコードを取る。
> 検証済み: GKS を harvest → `a8mat` が affiliate-mats.json の配置済み GKS mat と完全一致（doboku-note のコードが取れる）。
> **`list` は口座横断**（`?webSiteId=` フィルタは A8 側で無視＝doboku-note 単独に絞れない・全サイト混在で表示）。

## 状態機械（a8-catalog.json）

```
candidate → applied → approved → harvested → registered → published
既存提携の取り込み: list / import-partnered が提携中を直接 approved で登録（candidate/applied を経ない）
分岐: rejected(審査落ち・再申請しない) / blocked(blocklist) / pending-vertical(map未解決) / error(step+screenshot)
```

- 状態と遷移の検証は `a8-scout-core.mjs`（不正遷移は throw）。catalog は状態を巻き戻さない upsert。
- doboku では `registered`/`published` は**手配置後に人が catalog を進める**（自動 register が無いため）。

## スコアリング（curated 値・ハードコードしない）

`score = 0.40·rewardNorm + 0.25·epcNorm + 0.15·confirmNorm + 0.20·gapBonus`。
係数・上限・blocklist・vertical 写像・`weeklyApplyMax`・`minScore` の SSOT は `.claude/scripts/ads/data/a8-curated.json`。

- **vertical（doboku career 3軸）**: `civil-career`（施工管理系＝GKS/ビルドジョブ枠）/ `pe-career`（技術士ハイクラス枠）/
  `career`（汎用フォールバック）。`resolveVertical` は最長一致で `civil-career`/`pe-career` を汎用 `career` に先取りさせない。
- gapBonus の inventory（`inventory-latest.json`）は doboku に無いため実質 `other`（0.2）固定。scout は報酬/EPC/確定率が主。

## 規律（機械強制）

| 規律 | 手段 |
|---|---|
| 申請は週 `weeklyApplyMax`（初期 5）件まで | `check-a8-apply-budget.cjs` が apply 前に判定 |
| NG ジャンル + 講座/教材/書籍/添削/**スクール/学習塾**は申請しない | curated `blocklistKeywords` → status=blocked。**`資格取得` 等の語は足さない**（GKS の名称「資格取得も支援」を誤ブロックする・テストで固定済み） |
| 既存 creative と重複する案件は候補にしない | `isDuplicate`（a8mat / title 一致・`affiliate-creatives.ts` + `affiliate-mats.json` を突合） |
| canonical 4 種以外のサイズは harvest しない | `parseA8Code` が non-canonical を弾く |
| セッション失効でパイプラインを壊さない | isLoggedIn 失敗は catalog に error 記録して exit 0。再ログインは人間 |
| 候補にしなかったものを黙って捨てない | `scoreAndRank` は `belowThreshold` / `pendingVertical` も返し、search/scout が必ず表示（2026-07-27） |
| doboku の 3 軸に写像できない案件を候補にしない | vertical 未解決は `pending-vertical`（IT フリーランスが建設サイトの候補に並んでいた事故の再発防止） |
| 読者と無関係な業種を候補にしない | curated `offTargetKeywords`（薬剤師/看護/介護 等）→ `offTarget`。**blocklist（Red Line＝規約NG・カニバリ）とは別枠**にして Red Line の意味を濁らせない |

## 実行形態（ローカル限定・OS は問わない）

- Playwright プロファイル（`.local/playwright-a8-profile`）がローカルにあるため **GitHub Actions では動かない**。
  ローカルであれば Mac / Windows どちらでも動く（2026-07-27 に可搬化・Windows で実走確認）。
- **初回のみ人間**: `login.mjs` で A8 手動ログイン（credential は env に置かない）→ `list --dry-run --headed` で A8 の
  DOM をダンプしてセレクタ実機調整。これが済むまで実操作しない。
- A8 の自動操作は会員規約上のリスクがあるため件数を保守的に開始する（`weeklyApplyMax` 初期 5）。
- **プロファイル root は可搬**: Mac パスが実在しなければリポジトリルートへフォールバックする
  （`a8-browser.ts` / `login.mjs` とも 2026-07-27 修正）。以前は Mac 絶対パス固定で、Windows 機では
  別ドライブ配下に空プロファイルを掘り「ログイン済みなのに未ログイン」になっていた。
- **node_modules 不在時は先に `npm install --legacy-peer-deps`**（tsx/playwright に必要。memory `npm-ci-broken-use-legacy-peer-deps`）。

## 認証方式（永続プロファイル + セッション Cookie 再注入）

X/IG/note/ココナラと同じ永続プロファイル方式（`.claude/knowledge/reference/playwright-auth-profiles.md`）。ただし **A8 の認証は
揮発性セッション Cookie で永続プロファイルに残らない**ため、`login.mjs` が `storageState`（Cookie 含む JSON）を
`.local/playwright-a8-state.json` に捕獲し、`a8-browser.ts` が起動時に `addCookies` で再注入する（これが認証再利用の実体）。
`PROFILE_ROOT` は本体チェックアウト固定（Mac では `/Users/minamidaisuke/doboku-note`）＝worktree からでも同一ログインを共有。
**そのパスが実在しない環境（Windows 機等）ではリポジトリルートへフォールバックする**（2026-07-27）。
なお成果レポート側（`fetch-a8-ui-csv.mjs`）は人間のログイン直後に自分で `storageState` を保存するため、
`login.mjs` を別途走らせる必要はない。

## 成果レポート パイプライン（`/a8-report`・2026-07-27 新設）

提携運用（上記＝申請・素材）とは**別サブシステム**。A8 のレポート CSV を取り込んで
**EPC 判定の分母**（成果・確定報酬）を供給する。従来 `a8-results.json` は月1手入力の前提で
空のままだったため、`report-buildjob-affiliate.mjs` が EPC を出せずビルドジョブ vs 建設JOBs の
A/B 判断が保留になっていた。ここを自動化した。

### 流れ

```
npm run a8-ui:fetch      → .claude/state/metrics/affiliate/a8-ui/<runId>/{*.csv, manifest.json}
   （a8-report-collector が実行。口座 assert が通らなければ DL しない）
npm run a8-ui:normalize  → <runId>/normalized/*.json ＋ SSOT へ upsert
   （a8-csv-auditor が PASS/WARN/FAIL を出してから実行）
npm run report-buildjob-affiliate → GA4 クリック × A8 成果 の EPC
```

### サイト帰属（この機能の最重要ポイント・2026-07-27 実機確定）

**A8 のメディア管理画面にサイト切替は存在しない。** メディアID＝口座で、ヘッダーの「サイト名」は
口座の代表サイト（統計で見る都道府県）が常に出るだけ。したがって:

- **ログイン後に assert するのは「正しい口座か」（`mediaId`）**。ここで doboku-note を探しても永久に見つからない
- **doboku-note の分離はレポート単位**（`reports[].siteScope`）

| レポート | siteScope | 分離 |
|---|---|---|
| `/report/site`（サイト別） | `site-rows` | **可能**。サイト行から doboku-note だけ採る＝**実績の真実源** |
| `/report/program/detail` | `account-wide` | 不可。`programIdMap` の allowlist で doboku 分を抽出 |
| `/report/period/{monthly,daily}` | `account-wide` | 不可。トレンド把握のみ（水準は doboku 単独ではない） |

**検算（両方向）**: `crossCheckAgainstSite` が allowlist 抽出とサイト別 doboku-note 行を突合する。
- **超過**（picked > site）＝ stats47 混入の疑い
- **不足**（picked < site）＝ **自社の未登録プログラムが集計から漏れている疑い**。口座横断レポートには
  stats47 のプログラムが 45 件並ぶので「未写像 = 取りこぼし」とは言えない。取りこぼしの客観シグナルは
  この不足分だけで、不足があるときのみ `missingProgramCandidates`（既知 stats47 を除外）を出す
- 2026-07-27 実測: **137/137 の完全一致**（buildjob 56 + dx-consulting 35 + gks 30 + kensetsu-jobs 16）。
  doboku-note のクリックが 4 プログラムで過不足なく説明でき、混入も取りこぼしも無いことが数値で確認できた

検討して**捨てた**代替案: `/report/material`（素材別）の「素材ID」は `001`/`003`/`999` の 3 桁で、
`affiliate-mats.json` の a8mat 第4トークン（`TSBE9` 等）とは別物。素材による分離はできない。

### 期間（URL では制御できない）

`?start_date=&end_date=` を付けても**無視される**（2026-07-27 実測）。期間は画面のフォーム
（`input name=start` / `end`・月レンジと日レンジの 2 組）で操作する必要がある。現状の取得は
A8 の既定期間＝**年初〜当月の累計**。実際の期間は CSV のファイル名にしか出ない
（`site_202601-202607_20260727105756.csv`）ので manifest に記録する。

そのため **`a8-results.json`（月次キー）へは単月 run のときしか書かない**。累計値を特定月の実績として
書き込まない（`notAttributable` で理由を残す）。月次内訳は `docs/todo/backlog.md` の後続タスク。

### upsert である理由

A8 は承認確定に伴って**過去月の数値が遡及変化**する（発生 → 確定、確定報酬の増加）。
append すると同じ期間が二重に積まれるため、SSOT は `period+site` / `month` / `date` / `period+programId` を
キーに **最新 fetch で置換**する。確定が「減る」方向の変化は異常として auditor が拾う。

### 継続運用の装備

| 装備 | 実体 | いつ効くか |
|---|---|---|
| cadence surfacer | `npm run check-a8-report-due`（既定30日） | 週次 PDCA（`/weekly-review`）が DUE と `issues[]` を毎週 surface。A8 は API 無し＝cron 化できないので「思い出させる」方式 |
| 配線ドリフト検知 | `npm run check-affiliate-wiring`（pre-commit） | `affiliate-mats.json` ↔ `affiliate-catalog.json` ↔ `programIdMap` ↔ 消費側の 4 点がズレたら commit を止める。**初回実行で dx-consulting の取りこぼしを実検出**（2026-07-27 に 3 ASP 横断へ拡張・旧 `check-a8-wiring` を統合） |
| 取りこぼし検知 | `crossCheck.hasShortfall` → `missingProgramCandidates` | 掲載しているのに集計されていない広告を、サイト別との差分で炙り出す |
| 誤アカウント防止 | 口座 assert（`mediaId`）→ exit 5 | 別口座でログインしていたら 1 バイトも取り込まない |

### レポート系ファイル

- ブラウザ: `scripts/fetch-a8-ui-csv.mjs`（`a8-ui:fetch`）／`scripts/lib/a8-report-browser.mjs`
  （**汎用部は `scripts/lib/google-console-browser.mjs` を import 再利用**＝launchContext / downloadTo /
  dumpFailure / findUniqueByLabels。コピーはしない）
- 正規化: `scripts/normalize-a8-csv.mjs`（`a8-ui:normalize`）／コア `scripts/lib/a8-report-csv.mjs`
- テスト（node:test・20件）: `tests/a8-report-csv.test.mjs`（`npm test` に含まれる）
- 継続運用: `scripts/check-a8-report-due.mjs`（surfacer）／`scripts/check-affiliate-wiring.mjs`（pre-commit ガード・3 ASP 横断）
- 設定 SoT: `.claude/config/a8-report-automation.json`（URL・ラベル・`columnAliases`・`programIdMap`・`mediaId`・`reports[].siteScope`）
- SSOT: `.claude/state/metrics/affiliate/a8-report-log.json`
  （`siteSummary`＝doboku 分離済みの真実源 / `programPeriod`＝allowlist 抽出 / `monthly`・`daily`＝口座横断 /
  `crossCheck` / `unmapped` / `notAttributable`）＋ `a8-results.json`（既存スキーマへ rollup・消費側は無変更）
- skill: `.claude/skills/ads/a8-report/SKILL.md`（`disable-model-invocation: true`）
- agents: `a8-report-collector`（収集）／`a8-csv-auditor`（品質監査）
- 管理画面: admin-app `/affiliate` タブ（月次×プログラム×EPC・未写像の警告）

### つまずきポイント

- **取りこぼし**: `crossCheck` に不足が出たら、自社の広告なのに `programIdMap` に無いプログラムがある。
  候補は `missingProgramCandidates` に出るので config に追記して再 normalize する。
  写像キーは**プログラムID**（`s00000024757004`=buildjob / `s00000023057002`=kensetsu-jobs /
  `s00000022176005`=gks）。名前は A8 側で変わるが ID は不変
- **文字コード**: Shift_JIS（2026-07-27 実測確定）。`decodeCsvBuffer` が U+FFFD を数えて UTF-8 へ自動フォールバック
- **CSV のヘッダーは画面と別物**: 画面は説明文つき（「広告がクリックされた回数 ※… click数」）だが
  CSV はクリーンな短い列名（`click数`）。**`確定金額`（EPC の分子）と `発生金額` を取り違えない**。
  `未確定金額` は `確定金額` を部分文字列に含むため、`mapColumns` は完全一致を先に全列走査する
- **CSV に合計行は無い**（画面にはある）
- **エクスポートは `<button>CSV</button>` 1 個だけ**。`exportButtonLabels` に候補語を足すと
  `findUniqueByLabels` が同一ボタンに複数ヒットして「曖昧」となり押せなくなる。増やさない
- **ラベルドリフト**: 停止したら `.local/playwright-a8-debug/<runId>/visible-text.txt` を見て
  **config を直す**（スクリプト本体は触らない）

## ファイル一覧

- ブラウザ: `.claude/skills/ads/scout-asp/scripts/{a8-browser.ts,login.mjs}`
- skill: `.claude/skills/ads/scout-asp/SKILL.md`（`/scout-asp`・`disable-model-invocation: true`）
- コア（純関数）: `.claude/scripts/ads/lib/{a8-scout-core,a8-code-core}.mjs`
- テスト（node:test・30件）: `.claude/scripts/ads/__tests__/*.test.mjs`（`npm run test:ads`）
- 申請上限: `.claude/scripts/ads/check-a8-apply-budget.cjs`
- curated（係数・blocklist・vertical・上限・`searchKeywords`）: `.claude/scripts/ads/data/a8-curated.json`
- カタログ（状態機械）: `.claude/state/ads/a8-catalog.json`
- 配置先 SSOT: `src/config/affiliate-creatives.ts` / `src/config/affiliate-mats.json` / `.claude/knowledge/reference/affiliate-operations.md`

## 関連

- [playwright-auth-profiles.md](playwright-auth-profiles.md) — 永続プロファイル運用（a8 profile もここに登録）
- [measurement-incidents.md](measurement-incidents.md) — 会社 PC はプロキシで外部 API 遮断（ローカル自宅端末で実行）
- `.claude/knowledge/reference/affiliate-operations.md` — 提携状況の人間向け真実源（`list` の突合先）
