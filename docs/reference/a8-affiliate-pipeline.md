# A8.net アフィリエイト パイプライン（doboku-note）

A8.net の提携アフィリエイトを Playwright で操作し、**申請済みアフィリの承認確認 → 転職案件の開拓 → 申請 →
承認 → 広告コード取得 → 配置候補出力** までを回す運用の SSOT。2026-07-20 制定（stats47 の同名パイプラインを
doboku=転職一本へ移植・スリム化）。

## なぜ必要か

- A8.net は **公開 API が無い**（`.claude/state/metrics/affiliate/a8-results.json` も「月1手入力」）。提携状況の確認・
  広告コード取得は管理画面の手作業しかなく、Playwright 自動操作が唯一の機械化手段。
- doboku の提携は `docs/project/04_運営/02_アフィリエイト提携状況.md` に**人手で記録**しているため、A8 実機との
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
> `categoryCodeToVertical`）、(2) `blocklistKeywords` に「講座/教材/参考書/問題集/添削/予備校/通信教育/eラーニング」を
> 追加、の2段で非転職案件を機械除外する。

## 申請サイト assert（複数サイト口座・最重要）

> [!warning] 申請時は必ず webSiteId=doboku-note を選ぶ
> この A8 口座は**複数サイト登録**（`webSiteId=001` 統計で見る都道府県〔stats47〕/ `002` doboku-note）。
> apply の detail ページには `<select name="webSiteId">` があり、**既定は 001（口座の既定サイト）**。
> 盲目的にボタンを押すと **stats47 のサイトで提携申請してしまう**（2026-07-20 に実機で判明）。
> `applyToProgram` は申請前に `TARGET_SITE="doboku-note"` を selectOption し、read-back で確定を検証、
> doboku-note が選べない場合は**申請を中止（error）**する（誤サイト提携の構造的防止＝publish-x/coconala の
> account assert と同じ思想）。ヘッダーの「サイト名 統計で見る都道府県様」は口座の既定サイト表示で、
> 申請フォームの webSiteId とは別軸（申請成立後も表示は 001 のまま＝正常）。

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
| NG ジャンル + 講座/教材/書籍/添削は申請しない | curated `blocklistKeywords` → status=blocked |
| 既存 creative と重複する案件は候補にしない | `isDuplicate`（a8mat / title 一致・`affiliate-creatives.ts` + `affiliate-mats.json` を突合） |
| canonical 4 種以外のサイズは harvest しない | `parseA8Code` が non-canonical を弾く |
| セッション失効でパイプラインを壊さない | isLoggedIn 失敗は catalog に error 記録して exit 0。再ログインは人間 |

## 実行形態（ローカル Mac 限定）

- Playwright プロファイル（`.local/playwright-a8-profile`）がローカルにあるため **GitHub Actions では動かない**。
- **初回のみ人間**: `login.mjs` で A8 手動ログイン（credential は env に置かない）→ `list --dry-run --headed` で A8 の
  DOM をダンプしてセレクタ実機調整。これが済むまで実操作しない。
- A8 の自動操作は会員規約上のリスクがあるため件数を保守的に開始する（`weeklyApplyMax` 初期 5）。
- **node_modules 不在時は先に `npm install --legacy-peer-deps`**（tsx/playwright に必要。memory `npm-ci-broken-use-legacy-peer-deps`）。

## 認証方式（永続プロファイル + セッション Cookie 再注入）

X/IG/note/ココナラと同じ永続プロファイル方式（`docs/reference/playwright-auth-profiles.md`）。ただし **A8 の認証は
揮発性セッション Cookie で永続プロファイルに残らない**ため、`login.mjs` が `storageState`（Cookie 含む JSON）を
`.local/playwright-a8-state.json` に捕獲し、`a8-browser.ts` が起動時に `addCookies` で再注入する（これが認証再利用の実体）。
`PROFILE_ROOT` は本体チェックアウト固定（`/Users/minamidaisuke/doboku-note`）＝worktree からでも同一ログインを共有。

## ファイル一覧

- ブラウザ: `.claude/skills/ads/scout-asp/scripts/{a8-browser.ts,login.mjs}`
- skill: `.claude/skills/ads/scout-asp/SKILL.md`（`/scout-asp`・`disable-model-invocation: true`）
- コア（純関数）: `.claude/scripts/ads/lib/{a8-scout-core,a8-code-core}.mjs`
- 申請上限: `.claude/scripts/ads/check-a8-apply-budget.cjs`
- curated（係数・blocklist・vertical・上限）: `.claude/scripts/ads/data/a8-curated.json`
- カタログ（状態機械）: `.claude/state/ads/a8-catalog.json`
- 配置先 SSOT: `src/config/affiliate-creatives.ts` / `src/config/affiliate-mats.json` / `docs/project/04_運営/02_アフィリエイト提携状況.md`

## 関連

- [playwright-auth-profiles.md](playwright-auth-profiles.md) — 永続プロファイル運用（a8 profile もここに登録）
- [measurement-incidents.md](measurement-incidents.md) — 会社 PC はプロキシで外部 API 遮断（ローカル自宅端末で実行）
- `docs/project/04_運営/02_アフィリエイト提携状況.md` — 提携状況の人間向け真実源（`list` の突合先）
