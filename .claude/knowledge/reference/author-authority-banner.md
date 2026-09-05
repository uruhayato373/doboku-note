---
title: 著者オーソリティ 汎用バナー 運用ポリシー
---

# 著者オーソリティ 汎用バナー（note 商品 top/bottom）

土木施工管理技士（1級・2級）系 note 商品・ココナラ出品で、**競合との差別化＝上位資格保有者による分析提供**を訴求する汎用バナーの真実源。運営者「架」が実際に保有する資格・経歴（SSOT: `src/config/author.ts`）に基づく、誇張のない信頼性訴求。

## アセット

| ファイル | 役割 |
|---|---|
| `content/note/共通/著者オーソリティ/img/base-keyart.png` | civil 用キーアート（ChatGPT 生成・橋＝架／5管理ヘキサゴン／ヘルメット・図面・赤チェック＝審査） |
| `content/note/共通/著者オーソリティ/img/base-keyart-concrete.png` | concrete 用キーアート（Codex MCP 生成・brand-image-system §5 プロンプト接頭辞・tint #0f6e6e） |
| `content/note/共通/著者オーソリティ/img/figure-author-authority.png` | civil 完成バナー（1280×1280、下部約380pxのみキーアート） |
| `content/note/共通/著者オーソリティ/img/figure-author-authority-concrete.png` | concrete 完成バナー（同上、キーアートは base-keyart-concrete.png） |
| `scripts/render-note-author-authority.mjs` | キーアート＋コピー合成。`--variant civil\|concrete` で対象切替（`node scripts/render-note-author-authority.mjs --variant concrete` で再生成） |
| `scripts/distribute-author-authority-banner.mjs` | 各 note 商品 article.md へ画像配布＋top/bottom 挿入（冪等）。`--exam civil\|concrete`／`--migrate` 対応 |
| `scripts/note-swap-author-banner.mjs` | 既公開記事のライブ反映（バナー画像＋説明文2段落のみ差替。全文置換はしない） |

> [!note] 各記事の `img/figure-author-authority*.png` は git 追跡しない（2026-09-05）
> 原本は上表の `共通/著者オーソリティ/img/` の 2 ファイルだけを追跡し、記事ごとの複製（247 本）は `.gitignore` で除外する（cover*.png と同じ扱い。正方形再設計で 197 本が一斉差分＝約 60MB の履歴肥大になるため）。手元に無ければ `node scripts/distribute-author-authority-banner.mjs --migrate`（civil）／`--exam concrete --all` で再複製する。

## フレーミング（厳守・誇張禁止）

運営者は技術士（総合技術監理部門・建設部門）＋1級/2級土木施工管理技士＋元・自治体土木職（発注者）を**実際に保有**（`src/config/author.ts`）。この3点を役割分担で語る:

- **総監（技術士）＝ 上位資格の"分析力"**（5管理＝経済性・安全・人的資源・情報・社会環境の統合視点）
- **元発注者（自治体土木）＝ "審査する側"の視点**
  > [!warning] 「採点者」と名乗らない（2026-08-11 訂正）
  > 発注者が実務で行うのは**施工計画書の審査・工事成績評定・出来形検査**であって、
  > **施工管理技士試験の答案採点ではない**。「発注者だから採点者」は成り立たず、
  > 資格・立場の誇張にあたる（本ファイルが禁じている「資格の混同」そのもの）。
  > 使ってよい言い方＝「審査する側」「評価する側」「書類を評価してきた読み方」。
  > 使ってはいけない＝「採点者」「採点者の視点」「採点眼」「発注者＝採点者」。
- **1級・2級 施工管理技士 ＝ 自ら合格した"当事者"**

禁止:
- 「総監だから施工管理を教えられる」的な資格の混同（総監は施工管理の教授資格ではない）。総監は"分析力の裏付け"、施工管理技士保有が"当事者性"、と役割を分ける
- R8 総監 択一の「公式正答と全40問一致」は**別軸の"解答速報の精度"**の実演であり、施工管理バナーには混ぜない（総監商品側の信頼性訴求で使う）

## レイアウト（2026-09-05 正方形へ再設計）

バナーは 1280×1280 の正方形。上部（y=0〜900）いっぱいにコピーを配置し、下部 380px 帯だけにキーアートを敷く。文字サイズ（1280px 基準）はアイブロウ 40 / 見出し 76 / 資格三本柱 各行 56 / シンセシス 60・42 / ブランド表記 30。

旧デザイン（16:9・キーアート左1/3にコピーを合成）は note モバイル表示（約343px）で見出しが約 **8px**、本文が約 **5.7px** まで縮小され読めなかった。正方形化はこれの是正で、**モバイルで必ず読ませたい文字は 1280px 基準で 52px 以上**を下限とする（52px × 343/1280 ≒ 14px。note-svg-policy.md §2 の 22px 下限は PC 表示（690px 換算で約12px）を前提にした値で、モバイル最優先の著者バナーには不足するため別基準を置く）。

## 配置パターン（画像 → 説明文2段落 → 既存カード）

各 article.md で:
- 画像行は **alt を空にする**（`![](img/figure-author-authority.png)`）。note はキャプションを表示しないため、alt があると意図せずキャプションとして出てしまう
- **top**: H1 直後に 画像 → P1 → P2 の順で挿入。P1・P2 は資格別（`--exam`）に固定文言（[distribute-author-authority-banner.mjs](../../../scripts/distribute-author-authority-banner.mjs) が真実源）:
  - civil P1: 「この教材は、技術士（総合技術監理部門）を持つ元・地方自治体の土木職（発注者）がつくっています。1級・2級土木施工管理技士にも自分で合格しており、受験者と同じ答案を書いた当事者です。」
  - concrete P1: 「この教材は、技術士（総合技術監理部門）を持つ元・地方自治体の土木職（発注者）がつくっています。コンクリート主任技士・コンクリート診断士にも自分で合格しており、小論文・記述式を書いた当事者です。」
  - P2（共通）: 「総監の5つの管理の視点で記述を分析し、発注者として施工計画書や工事成績評定の書類を審査してきた目で「評価される書き方」を整理しています。」
- **bottom**: 本文の締め → 同バナー（alt 空） → 橋渡し1文 → **既存のマガジン/記事カード（URL単独行）**。カードに**価格（¥）は書かない**・URL は bare 単独行でカード化（[note-funnel-architecture.md](note-funnel-architecture.md)／content-principles §14-c）
- **HTML コメントは使わない**（note paste で文字として残るため）。冪等判定は画像ファイル名＋著者文マーカー（`この教材は、技術士（総合技術監理部門）を持つ`）の両方の存在で行う

橋渡し文（bottom）: 「上位資格の分析力・発注者として書類を評価してきた目・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。」

## 適用対象（できるもの）

- **対象**: 試験・経験記述・添削 文脈の入口ページ（`notePricing: free`）— 購入判断の手前で効く
- **除外**: 転職/キャリア系ファネル（転職エージェント比較・年収・ホワイトな会社 等）は文脈不一致のため貼らない（civil のみ）
- 内部の答案記事まで広げるなら `--all`

## コンクリート適用範囲

- 対象ディレクトリ: `content/note/コンクリート技士/` `content/note/コンクリート主任技士/` `content/note/コンクリート診断士/` の全 article.md（3資格まとめて `--exam concrete`）
- バナー画像: `figure-author-authority-concrete.png`（civil 用 `figure-author-authority.png` と混在させない）
- **当事者ワードの厳守**: 運営者が実際に保有するのは**コンクリート主任技士・コンクリート診断士**のみ（`src/config/author.ts` の `qualifications`）。**コンクリート技士**は保有していないため、「技士に合格」のような表現をコンクリート技士ページも含めて使わない。当事者性の文言は常に「主任技士・診断士」で統一する

## ライブ反映

既公開記事へバナーを差し替える／説明文2段落を挿入するには `npm run note-swap-author-banner` を使う。**note-update-body による全文置換は使わない**——全文置換は PDF 添付カードを一度消して再アップロードさせ、note の「1日100ファイル」上限を消費するため。

```bash
npm run note-swap-author-banner -- --article <article.md>              # probe（既定・未変更で確認のみ）
npm run note-swap-author-banner -- --article <article.md> --commit     # 差替・ライブ公開
npm run note-swap-author-banner -- --list <paths.txt> --commit         # 一括（--max-consecutive-fail・--daily-limit 既定90）
```

モード（editor の figure を画像比率で分類して自動決定）: `swap`＝旧 16:9 バナーを削除して新正方形バナー＋段落へ／`insert`＝ライブにバナーが 1 枚も無い記事（2026-09-05 のコンクリート 51 本）で先頭ブロック直前へ新バナー＋段落を挿入／`prose-only`＝新バナーはあるが段落が無い／`already-done`＝再公開ハッシュだけ記録。bottom バナーは旧 bottom figure がある記事だけ差し替え、無い記事へは追加しない。

安全ゲート: account=dobokunote 確認／編集前に旧 figure の位置・前後文脈を表示／PDF 添付数が編集前後で減少していないか／画像数が差替前後で同数（bottom 未検出時のみ +1 許容）／公開後に public API で新本文の存在と旧キャプションの不在を検証／1日あたりの成功件数上限は `--daily-limit`（既定90）で `.claude/state/note-swap-banner-done.json` に記録。ただし **画像アップロードは note の 100 ファイル/日上限に数えられない**（2026-09-05 に 1 日で 136 本・約 150 枚を通した実測。上限に掛かるのは PDF 等のファイル添付）ので、バナー差し替えだけなら `--daily-limit 400` で 1 日に回してよい。

```bash
node scripts/distribute-author-authority-banner.mjs                          # civil 入口(free)のみ・キャリア系除外
node scripts/distribute-author-authority-banner.mjs --exam concrete --all    # concrete 3資格の全 article.md
node scripts/distribute-author-authority-banner.mjs --migrate --dry          # civil の既存バナー移行を確認のみ
node scripts/distribute-author-authority-banner.mjs --exam concrete --migrate # concrete の既存バナーを移行
```

注意: 各 article.md は独立 note 投稿。ソース挿入後、**ライブ反映には `npm run note-swap-author-banner`（上記）が必要**。

## 利用するエージェント/スキル

- `civil-keiken-essay-writer` — 経験記述系 note 記事の生成時、買い手向け入口記事に本バナーを top/bottom 配置
- `civil-keiken-tensaku-drafter` — 添削返却/案内で差別化コピーの根拠として参照
- `coconala-operator` — ココナラ S1/S2 出品文面に同コピー＋バナー画像添付（実操作＝画像アップロードはユーザー）
