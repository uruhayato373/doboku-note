# ハンドオフ｜建設部門2次 出題テーマ分析記事（無料SEOハブ）残11科目 量産完了

> 2026-06-10。`docs/handoffs/2026-06-10-exam-themes-seo-hub-runbook.md` に従い、road 以外の残11科目を一括生成・検証・commit・push した記録。次の担当者はここから「公開（deploy）」と「送客先マガジンの配線」に進む。

## 1. 何をやったか（完了）

road（既存）と同型の **出題テーマ分析記事（無料サイト記事／SEO入口）** を残11科目ぶん新規作成。各記事 = 過去問MDX照合 → MDX執筆 → `refresh-indexes` → `npm run build` → built HTML で `<main>`＋主要kw 検証 → 1本ずつ pathspec commit。

| # | subject | slug | commit | II-1の固定/傾向 |
|---|---|---|---|---|
| 1 | river-coast | pe-construction-river-coast-exam-themes | 4815f158 | 河川/ダム/砂防/海岸 4分野7年連続 |
| 2 | urban-planning | pe-construction-urban-planning-exam-themes | 2719389a | 公園緑地(II-1-4)7年連続 |
| 3 | construction-planning | pe-construction-construction-planning-exam-themes | fbe4ee60 | コンクリ(II-1-4)7年連続 |
| 4 | geotechnical | pe-construction-geotechnical-exam-themes | da09a08e | 液状化/軟弱地盤/杭/土留め循環 |
| 5 | steel-concrete | pe-construction-steel-concrete-exam-themes | 6f34c8cb | 鋼(1-2)/コンクリ(3-4) 2系統 |
| 6 | environment | pe-construction-environment-exam-themes | 5d725fab | 環境影響評価・第一種事業(II-2-1)7年連続 |
| 7 | tunnel | pe-construction-tunnel-exam-themes | e9c0d7ce | 山岳2/開削/シールド 4分野7年連続 |
| 8 | port-airport | pe-construction-port-airport-exam-themes | 1df04adf | 空港(II-1-4)R03〜連続 |
| 9 | railway | pe-construction-railway-exam-themes | 32b55a53 | 軌道ほぼ毎年 |
| 10 | power-civil | pe-construction-power-civil-exam-themes | 2d7771df | 原子力(耐震/津波)/維持管理頻出 |
| 11 | required | pe-construction-required-exam-themes | d516c156 | 適応形式(I-1/I-2・6系統) |

- ブランチ: `claude/clever-johnson-ksohlx`（push 済・origin 追跡）。
- 全記事: U+FFFD 0／build 通過／Red Line 遵守（予想はテーマ粒度のみ、問題文全文・模範解答なし）／コンピテンシーリンクは正フラット slug `/docs/pe-construction-competency-revision-r8`／末尾に `<MagazineCard id="pe-construction-{subject}-magazine" />`。

## 2. runbook 想定外の対応（要レビュー）

> [!important] getMagazine() の undefined ガード追加（src/lib/note-magazines.ts・1行）
> runbook §1 は「MagazineCard は未登録 id でも null を返しビルド安全」と記載していたが、実際は `getMagazine()` が `undefined` ガードを欠いており、**未登録 id（construction-planning 以降8科目）で `mag.published` 参照時に TypeError → build 失敗**した。関数自身の JSDoc「防御的に null を返す」契約に合わせ `if (!mag || !mag.published || !mag.noteUrl)` に修正（type-check 通過）。commit fbe4ee60 に同梱。これにより未登録/未公開の送客先 id でも安全に非表示になる。

> [!note] 環境セットアップ
> 新規コンテナで依存未インストールのため `npm install --legacy-peer-deps`（eslint peer 依存衝突回避）を実行。`package-lock.json` の差分はコミットしていない。

## 3. 残タスク（次の担当者へ）

> [!todo] 公開（ユーザー判断）
> `develop → main`（`/deploy` スキル）で本番反映 → Google インデックス。**今回はマージ・PR・deploy はしていない**（ブランチ push のみ）。なお開発ブランチは `claude/clever-johnson-ksohlx`。通常運用の `develop` とは別なので、取り込み方針（develop へ merge するか）を確認すること。

> [!todo] 送客先マガジンの配線
> 登録済みマガジン id は4件（required / river-coast / road / urban-planning）のみ。残り7科目（construction-planning / geotechnical / steel-concrete / environment / tunnel / port-airport / railway / power-civil ※power-civilは8件目）の `pe-construction-{subject}-magazine` は **note-magazines.ts に未登録**。現状ビルド安全（非表示）だが、マガジン作成時に SoT 登録＋ `published:true` にすると MagazineCard が自動表示される。対の収益施策は `docs/handoffs/2026-06-10-bk04-11-yosou-cloud-runbook.md`。

> [!todo] 公開後の検証
> deploy 後に `curl` で各 `/docs/pe-construction-{subject}-exam-themes` の HTTP 200＋`<main>`＋主要kw を確認（CLAUDE.md §4）。

## 4. 参照

- runbook（型）: `docs/handoffs/2026-06-10-exam-themes-seo-hub-runbook.md`
- テンプレ実物: `.local/r2/posts/pe-construction/road-exam-themes/article.mdx`
- 送客先 SoT: `src/lib/note-magazines.ts`
- 過去問（テーマ真実源）: `.local/r2/posts/pe-construction/r0[1-7]-{subject}/article.mdx`
