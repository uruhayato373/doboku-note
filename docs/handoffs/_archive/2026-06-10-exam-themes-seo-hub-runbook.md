# 指示書（runbook）｜建設部門2次 出題テーマ分析記事（無料SEOハブ）一括量産

> **使い方**: このファイルを開き「**この runbook に従って残科目の出題テーマ分析記事を量産して**」と指示する。**会社PCローカルでも実行可**（事実の真偽は手元の過去問MDXで照合＝WebSearch不要）。11本を一気に回すならクラウド/長時間セッションが楽。

## 0. これは何か・予想 runbook との違い

道路に1本だけ存在する `road-exam-themes`（`/docs/pe-construction-road-exam-themes`）と**同じ型の無料サイト記事**を、残りの科目ぶん作る。目的は**収益化ではなく集客（SEO 入口）**＝検索流入を集めて有料マガジン（過去問＋R8予想）へ送客する無料ハブ。

| | テーマ分析記事（本runbook） | 予想 runbook（別ファイル） |
|---|---|---|
| 置き場 | **サイト無料** `.local/r2/posts/pe-construction/{subject}-exam-themes/article.mdx` | note有料 `docs/note/...` |
| 形式 | **MDX**（MDXコンポーネント・表・KaTeX可） | note用 `.md`・note-lint |
| 目的 | **集客（Google SEO）** | 収益化 |
| 事実の真偽 | **手元の過去問MDXで内部照合**（WebSearch不要・ローカル可） | 外部一次情報(WebSearch) |
| 検証 | `refresh-indexes`＋`npm run build`＋`curl` SSR | factcheck＋QA6軸 |
| 公開 | `main` deploy で Google にインデックス（運用が軽い） | note手動アップロード |

> **無料/有料の Red Line を守る**: テーマ分析記事は **テーマ・カテゴリ・直近傾向・予想"テーマ"まで**（誰でも読める傾向まとめ）。**予想問題文の全文・フル模範解答は載せない**（それは有料 R8予想の商品）。末尾の MagazineCard で有料へ送る。

## 1. 対象（road は作成済。残り11本）

`.local/r2/posts/pe-construction/{subject}-exam-themes/` を新規作成。`{subject}` と正式名・送客先マガジン id:

| subject | 正式名（記事タイトル用） | MagazineCard id | 形式 |
|---|---|---|---|
| `required` | 必須科目I | `pe-construction-required-magazine` | **適応形式**（I-1/I-2 マクロテーマ分析。下記 §4） |
| `river-coast` | 河川、砂防及び海岸・海洋 | `pe-construction-river-coast-magazine` | 標準（II-1/II-2/III） |
| `urban-planning` | 都市及び地方計画 | `pe-construction-urban-planning-magazine` | 標準 |
| `construction-planning` | 施工計画、施工設備及び積算 | `pe-construction-construction-planning-magazine` | 標準 |
| `geotechnical` | 土質及び基礎 | `pe-construction-geotechnical-magazine` | 標準 |
| `steel-concrete` | 鋼構造及びコンクリート | `pe-construction-steel-concrete-magazine` | 標準 |
| `environment` | 建設環境 | `pe-construction-environment-magazine` | 標準 |
| `tunnel` | トンネル | `pe-construction-tunnel-magazine` | 標準 |
| `port-airport` | 港湾及び空港 | `pe-construction-port-airport-magazine` | 標準 |
| `railway` | 鉄道 | `pe-construction-railway-magazine` | 標準 |
| `power-civil` | 電力土木 | `pe-construction-power-civil-magazine` | 標準 |

> **MagazineCard は未登録/未公開 id では `null` を返し描画しない（ビルド安全）**。送客先マガジンが未作成でも貼ってよい＝マガジン公開（published:true）時に自動表示される。

## 2. 事前準備（最初に1回）

1. `git branch --show-current` = `develop` を確認（違えば停止報告）。
2. **`docs/reference/content-authoring.md` を Read**（MDX規約・frontmatter・コンポーネント。CLAUDE.md §8）。
3. **テンプレを Read**: `.local/r2/posts/pe-construction/road-exam-themes/article.mdx`（frontmatter とセクション構成をそのまま型として使う）。

## 3. 標準形式の記事構造（road を踏襲）

**frontmatter**（road と同型・必須）:
```yaml
title: 技術士 建設部門 {正式名}｜選択科目 出題テーマ分析（R01〜R07）
shortTitle: {短縮} 出題テーマ分析（R01〜R07）
subtitle: II-1・II-2・III 全設問のテーマ傾向と令和8年度の出題予想
description: >- （2文・頻出カテゴリと予想を要約）
category: pe-construction
group: guide
tags: [guide, 技術士（第二次試験）, 建設部門, {正式名の短縮}, 出題傾向, 過去問分析, 令和8年度]
published: true
publishedAt: '2026-06-10'
seoTitle: 技術士 建設部門 {正式名} 出題テーマ分析・傾向（R01〜R07・7年分）
reviewStatus: approved
toc_min_heading_level: 2
toc_max_heading_level: 3
faqs:  # 3問（II-1の鉄板枠／IIIの頻出／R08で新しく問われる点）
```

**本文セクション**（road の見出し順を踏襲）:
1. リード文（固定枠を1〜2文で要約。例「○○が7年連続で II-1 に出題」）
2. `## 試験の設問構成`（II-1=4問/1選択/600字…の表。2軸表・4列以内）
3. `## 年度別 全設問テーマ一覧` → `### II-1` / `### II-2` / `### III`（年度×テーマの表。**過去問MDXの設問文から正確に転記**）
4. `## テーマ別 出題傾向の分析`（頻出カテゴリごとに `###`。「○年連続」「周期」を**過去問MDXで数えて**明記。捏造禁止）
5. `## 令和8年度（R08）の出題予想`（`<Callout type="note">` で「傾向に基づく予想」断り → 改訂コンピテンシーとの関係 → 予想"テーマ"表（II-1/II-2/III）。**問題文全文・模範解答は書かない**）
6. `## 模範解答集（R03〜R07＋R8予想）`（送客 CTA。1〜2文の説明＋ `<MagazineCard id="pe-construction-{subject}-magazine" utmContent="{subject}-exam-themes" />`）

> コンピテンシー解説へのリンクは**本番フラットslug** `/docs/pe-construction-competency-revision-r8`（`/docs/competency-revision-r8` は404）。

## 4. 必須科目I の適応形式（required のみ）

必須Iは II-1/II-2/III が無く I-1/I-2（各年2問・1問選択）。構造を読み替える:
- `## 年度別 出題テーマ一覧`（R01〜R07 の I-1/I-2 のマクロテーマを表に。例 R01=生産性向上/人口減少、R04=DX、R05=防災、R06=国土形成計画、R07=持続可能な建設業…を**過去問MDXで確認**）
- `## マクロテーマ別の傾向`（担い手・生産性／防災・国土強靱化／インフラ老朽化・AM／カーボンニュートラル／国土形成・地域づくり／インフラDX の6系統で頻度を分析）
- `## 令和8年度の予想テーマ`（6系統の出題予想。送客先は `pe-construction-required-magazine`）

## 5. 実行手順（科目ループ — 1本ずつ commit）

各 subject について:
1. **過去問MDXを全年度読む**: `.local/r2/posts/pe-construction/r0[1-7]-{subject}/article.mdx`（R01〜R07）。設問文・区分・設問数を**正確に**把握。
2. **テーマ表を作る**: 年度×区分でテーマを転記。「○年連続」等の固定枠は**実際に数えて**書く（過去問MDXが唯一の真実源。憶測で年数を盛らない）。
3. **R08予想テーマ**を傾向＋国交省重点から導出（テーマ粒度まで。問題文・解答は書かない）。
4. **MDX を書き込む**（`writeMdxFile` 経由。frontmatter §3）。MagazineCard を末尾に。
5. **内部照合**: 作ったテーマ表・「○年連続」が過去問MDXと一致するか自己点検（不一致は修正）。`U+FFFD` 0。
6. **検証**: `npm run refresh-indexes` → `npm run build`（MDXコンパイル通過）→ 可能なら dev/serve＋`curl` で `/docs/pe-construction-{subject}-exam-themes` が HTTP 200・`<main>`・主要キーワード（{正式名}/技術士）を含むことを確認（CLAUDE.md §4・§9）。
7. **commit（pathspec厳守）**: `git commit -- .local/r2/posts/pe-construction/{subject}-exam-themes/ src/config/*.json`（refresh-indexes が触る index も同梱）。`git add`＋bare commit は禁止（[[feedback_shared_index_commit_safety]]）。pre-commit（check-sns-urls）通過を確認。
8. **1行報告** → 次の subject へ。

> **チェックポイント**: 必ず**1本ずつ commit**（11本を1コミットにしない）。中断時は未作成 dir から再開（`ls .local/r2/posts/pe-construction/*-exam-themes`）。

## 6. 各記事の完了条件（DoD）

- frontmatter 必須項目（title/seoTitle/description/category/tags/published）完備・FAQ 3問。
- 年度別テーマ表が**過去問MDXと一致**（「○年連続」等の数値も実数）。捏造なし。
- R08予想は**テーマ粒度のみ**（問題文・模範解答を載せない＝有料との Red Line）。
- 末尾に MagazineCard（該当 magazine id）。コンピテンシーリンクは正フラットslug。
- `npm run build` 通過・U+FFFD 0・`refresh-indexes` 実行済み・`curl` で SSR 確認（可能な環境で）。
- 1本ずつ pathspec commit。

## 7. 失敗時の扱い（隠さない）

- **build が MDX エラー**: コンポーネント名・表の列数（4列以内）・KaTeX を疑い修正。直らなければ該当記事を未完報告。
- **curl で `<main>` や主要キーワードが出ない**: SSR破壊の疑い。Lighthouse は破壊を捕捉できない（[[measurement-incidents]] 2026-W16）。`<main>`＋キーワード確認が最短の意図検証。落ちたら未完報告。
- **テーマ表が過去問MDXと食い違う**: 数値・年数を MDX 側に合わせて是正（盛らない）。

## 8. 報告フォーマット

```
[{subject} exam-themes] 完了 — 年度表OK(過去問MDX一致)/予想テーマ/MagazineCard({id})/build OK/curl 200&main&kw/refresh-indexes/commit {hash}
完了 N/11。未完: {あれば理由}。次: main deploy で公開→Google インデックス（ユーザー判断）。
```

## 9. 公開後（ユーザー作業）
- `develop → main`（`/deploy` スキル）で本番反映 → Google にインデックスされ集客が立つ。
- 送客先マガジン（過去問＋R8予想）を note 公開（published:true）にすると MagazineCard が自動表示されて有料動線がつながる。
- **集客（無料ハブ）と収益（有料予想・模範解答）はセット**。両 runbook を対で回すのが王道。

## 10. 参照
- テンプレ実物: `.local/r2/posts/pe-construction/road-exam-themes/article.mdx`
- MDX規約: `docs/reference/content-authoring.md`
- 過去問（テーマの真実源）: `.local/r2/posts/pe-construction/r0[1-7]-{subject}/article.mdx`
- 送客先定義: `src/lib/note-magazines.ts`（MagazineCard は未公開/未登録なら非表示＝ビルド安全）
- 対の収益施策: `docs/handoffs/2026-06-10-bk04-11-yosou-cloud-runbook.md`
