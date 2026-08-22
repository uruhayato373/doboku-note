---
name: pe-secondary-yosou
description: >
  技術士第二次試験 建設部門 選択科目の「令和8年度 予想問題＋フル模範解答」を 1 科目分まるごと
  公開可能品質まで仕上げる統括オーケストレーション・スキル。予想は「テーマ別の独立記事（テーマ網羅型・
  1記事1ディレクトリ）」で作る。forecast モードの生成（pe-secondary-exam-writer）→ 外部事実照合
  （pe-secondary-exam-factcheck）→ 構造採点（pe-secondary-exam-qa）→ 梱包（カバー/ハッシュタグ/PDF）
  → SoT 登録 → commit を 1 入口に集約する。クラウド（Codex.ai/code）から 1 科目 1 指示で回せるよう設計。
  Use when user asks to [建設部門の予想問題を仕上げて, BK-0X の予想, {科目}の予想問題集, R8予想を展開, /pe-secondary-yosou].
user-invocable: true
---

# /pe-secondary-yosou — 建設部門 二次 選択科目 R8予想 バッチ

技術士第二次試験 建設部門の **選択科目（II-1 / II-2 / III）の令和8年度 予想問題＋模範解答**を、**テーマ別記事（テーマ網羅型）**で 1 科目分まるごと生成〜梱包〜SoT 登録〜commit まで一気通貫で仕上げる。必須科目I（複数案併記）は対象外（親が直接 writer を呼ぶ）。

> このスキルは「同じ前提・ルールを毎回書き直す／Generator と Evaluator を混同する／フレーミングや命名を取り違える」反復ミスを構造的に防ぐためにある。Generator/Evaluator の実体は各エージェント。**このスキル自体は記事本文を書かない**（親オーケストレーションが各エージェントを順に起動し、機械処理と commit を行う）。

## 予想問題の構造（2026-06-11 標準・道路パイロットで確定）

**予想は「テーマ別の独立記事」で作る。** 年度ミラー型（本番の設問構成を 1 記事に再現＝区分1ファイル全選択肢網羅）ではなく、**テーマ網羅型**（出題可能性の高いテーマを広くカバーし、1 テーマ 1 記事）。理由＝選択科目は本番が選択問題（II-1=4問中2問・II-2/III=2問中1問選択）で「**自分が書けるテーマに当たるか**」が合否を分けるため、テーマ網羅の価値が構造的に高い。競合 note の「予想問題N解答案」（¥500/記事・テーマ別）も同型で実証済み。

- **テーマの絞り込み**: `.local/r2/posts/pe-construction/{subject}-exam-themes/article.mdx`（サイトの無料テーマ分析記事）の「出題傾向の分析」「R08予想テーマ表」からテーマを抽出する。これが forecast の予想根拠源。
- **区分ごとのテーマ化**:
  - **III**（課題遂行・1800字）: 出題可能性の高い **N テーマを各 1 記事**（道路は脱炭素／4車線化／事前防災／xROAD の 4 テーマ）。年度ミラーで各スロット1択にせず、7年連続テーマ（防災等）・前年テーマの深化（DX等）の代替も拾う。
  - **II-1**（専門知識・600字・4カテゴリ固定＝道路構造計画／法改正制度／舗装／地盤土構造物）: 当面は 4 カテゴリを **1 記事**（区分1ファイル）に置く。将来カテゴリ別分割も可。
  - **II-2**（応用能力・1200字・2系統＝計画系／施工系）: 計画系・施工系を各複数テーマ。**防災施工系（道路啓開・災害復旧・床版取替 等）が手薄になりやすい**ので必ず含める。
- **1記事1ディレクトリ**: `{magazine}/R08-yosou/{dir}/` に `article.md` ＋ `img/cover.png`(+`.svg`) ＋ `hashtags.txt` ＋ `{印刷用PDF}` を同梱（note 3点セット＋PDF）。
  - dir 命名: `II-1/` `II-2/`（区分1記事）／`III-1_脱炭素/` `III-2_4車線化/` `III-3_事前防災/` `III-4_xROAD/`（テーマ番号_テーマ名）。
- **記事内構成（テーマ別ブロック・h2）**: `## 予想問題` → `## なぜこのテーマが出るか（予想の根拠）` → `## 論述の骨子（設問構成と方針）`（`### （1）/（2）/（3）`） → `## フル模範解答`（`### （1）…（約N字）`） → `## 採点ポイント`。各記事は単独で完結し、冒頭に**テーマ網羅シリーズ案内**（全テーマ導線＋マガジン URL）を置く。
- **過去問（R03-R07）は区分1ファイル据え置き**（本番再現＝区分単位が自然。予想のみテーマ別＝商品特性で使い分ける）。

> **エージェント連携**: `pe-secondary-exam-writer`/`qa` の forecast モードは「1 テーマ＝1 記事ブロック」を生成・採点する。1 テーマにつき writer を 1 回起動し、出力は単一テーマの記事（上記ブロック構成）。エージェント定義の forecast 節が旧「区分1ファイル全選択肢網羅」のままなら、親がプロンプトで本標準（テーマ別記事）を明示して補う。

## 実行環境（必読）

- **ファクトチェック工程は WebSearch が必須**。会社 PC はプロキシで外部 API 遮断のため**ローカルでは空振りする**。**クラウド（Codex.ai/code）・CI/CD・Mac 等、外部アクセスが通る環境で実行する**こと（[[feedback_metrics_cicd_supplied]]）。
- **PDF 生成は Chrome headless 依存**。実行環境に Chrome が無ければ PDF だけ後追いでローカル/Mac バッチに回す（内容・QA・カバー・ハッシュタグ・SoT は環境非依存）。本スキルは PDF 不可でも他工程を止めない。

## 引数

```
/pe-secondary-yosou <subject> [--themes-file <path>]
```

- `subject`: 専門分野スラッグ（下表）。`--themes-file` 省略時は `{subject}-exam-themes` 記事から予想テーマを抽出する。

### subject ↔ マガジン対応（建設部門）

| subject | 正式名 | magazine_id | dir | 合格科目? → フレーミング |
|---|---|---|---|---|
| `road` | 道路 | BK-01 | `BK-01_道路` | ✅ 合格者（※テーマ別パイロット完了） |
| `river-coast` | 河川・砂防・海岸海洋 | BK-02 | `BK-02_河川砂防` | 発注者経験 |
| `urban-planning` | 都市及び地方計画 | BK-03 | `BK-03_都市計画` | 発注者経験 |
| `construction-planning` | 施工計画・施工設備及び積算 | BK-04 | `BK-04_施工計画` | **発注者経験** |
| `geotechnical` | 土質及び基礎 | BK-05 | `BK-05_土質基礎` | **発注者経験** |
| `steel-concrete` | 鋼構造及びコンクリート | BK-06 | `BK-06_鋼コン` | **発注者経験** |
| `environment` | 建設環境 | BK-07 | `BK-07_建設環境` | **発注者経験** |
| `tunnel` | トンネル | BK-08 | `BK-08_トンネル` | **発注者経験** |
| `port-airport` | 港湾及び空港 | BK-09 | `BK-09_港湾空港` | **発注者経験** |
| `railway` | 鉄道 | BK-10 | `BK-10_鉄道` | **発注者経験** |
| `power-civil` | 電力土木 | BK-11 | `BK-11_電力土木` | **発注者経験** |

> **BK-04〜11 は全て運営者の合格科目外**。記事内では「合格者」表記を使わず「**元・地方自治体の土木職（発注者）として {当該分野} の発注・監督に携わった経験**」で訴求する（[[feedback_essay_persona_authentic_seat]]）。道路（合格科目）のみ合格者表記可。

## ワークフロー（親オーケストレーション）

### Step 0: 準備
1. dir = `docs/note/技術士建設部門/magazines/{magazine_id}_{subject名}/R08-yosou/`。無ければ作成。
2. **テンプレ Read**: 道路の完成パイロット `BK-01_道路/R08-yosou/III-1_脱炭素/article.md` を 1 本 Read し、テーマ別ブロック構成・文体・テーマ網羅シリーズ案内・末尾 CTA・印刷用 PDF 節のテンプレとして writer に渡す。
3. **テーマ抽出**: `{subject}-exam-themes` 記事から III の予想テーマ（N 個）・II-2 の計画系/施工系テーマ・II-1 の 4 カテゴリを洗い出す。

### Step 1: 生成（pe-secondary-exam-writer・テーマ単位で並列）
**1 テーマ＝1 writer 起動**（III は N 本、II-2 は計画系/施工系の各テーマ、II-1 は 1 本）。各エージェントへ渡す要点:
- `year: R08-yosou` / `subject` / `exam_type`（II-1/II-2/III）/ `magazine_id` / `forecast: true` / `theme`（当該テーマ名）。
- **テーマ別記事**（テーマ網羅型）。記事内は h2 ブロック構成（予想問題→なぜ出るか→論述の骨子→フル模範解答→採点ポイント）。
- 予想設問は過去問傾向＋国交省重点から**自作**（過去問の設問文を転載しない・`## 予想問題` に出典行なし・`## なぜこのテーマが出るか（予想の根拠）` 必須・冒頭に予想免責明示）。前年既出テーマは**別角度の深化**で差別化（例: R06 啓開＝事後 → R08 事前防災／R07 xROAD → R08 予防保全への深化）。
- **フレーミング**＝発注者経験（合格者表記は道路のみ可、他科目は禁止）。
- 冒頭に**テーマ網羅シリーズ案内**（全テーマの箇条書き＋公開済みマガジン URL があれば単独行リンク。未公開なら URL を出さずテーマ列挙のみ）。
- 末尾 CTA＝必須科目I マガジン `https://note.com/dobokunote/m/m0f3bc3933454`（価格非表示）。末尾最後に `## 印刷用PDF｜本記事の模範解答`。
- frontmatter に `cover:` ブロック（`hi:"R8予想"` / `hiSuffix:"{科目}III-1"` 等、テーマごとに固有）。`noteUrl`/`noteId`/`notePublishedAt` 空。
- **commit させない**（親が実施）。

### Step 2: 機械検証（親が python / note-lint で実測）
- 各記事のフル模範解答が枚数上限内（II-1≤600 / II-2≤1200 / III≤1800）。`### （N）…（約…字）` 単位で **python -X utf8** 実測（自己申告は信用しない）。超過は writer に再トリム指示（余裕 -5〜-70）。
- `node scripts/note-lint.mjs <path>`（pipe 表・太字内全角括弧・U+FFFD = 0）。**太字内全角括弧の頻出地雷**: 見出し `**…（…）**` → `**…**（…）` に直す（シリーズ案内見出し等）。
- 構造: `## 予想問題` / `## なぜこのテーマが出るか（予想の根拠）` 有り、`## 試験問題`・出典行・（道路以外で）「合格者」が**無い**こと。

### Step 3: 事実照合（pe-secondary-exam-factcheck・記事単位）★ 完璧の担保
- 各 article を WebSearch 接地で照合。`must_fix`（likely_wrong）があれば writer に**該当箇所のみ**修正させ、再照合して `must_fix` 0 にする。
- `uncertain`（review）は親が判断（多くは表現緩和で対応）。`blocked_no_websearch` が返ったら**この工程は環境が整う場所で再実行**（ローカル空振りを「合格」と偽装しない）。

### Step 4: 構造採点（pe-secondary-exam-qa・記事単位）
- forecast モードで 6 軸採点。平均 ≥2.0 かつ必須ゲート全通過まで writer 修正ループ。軸6（改訂コンピテンシー）が弱ければ三側面/文化的価値/データ活用/合意形成を該当テーマの締めに加筆（字数上限内で）。

### Step 5: 梱包（親が機械処理・1記事1ディレクトリ）
1. **カバー**: `node scripts/generate-note-covers.mjs "{magazine_id}_{科目名}"`。再帰探索＋`article.md` 対応済みなので、各記事 dir の `article.md` → 同 dir `img/cover.png` を frontmatter `cover:` ブロックから生成する。
2. **ハッシュタグ**: 各記事 dir に `hashtags.txt`（~90〜99 個・**1 行 1 個**）。同マガジンの過去問 hashtags か近縁科目を土台に、年度タグを `#令和8年度`/`#R08予想`/`#予想問題`/`#出題予想`/`#試験直前対策` に差し替え＋テーマ固有タグを足し、重複排除。
3. **PDF**: 永続 spec `scripts/pdf-specs/{magazine_id}_{科目名}.json` に R08-yosou の各記事 dir を追記（`src: "R08-yosou/{dir}/article.md"`、include=`^## 予想問題`→`^## なぜこのテーマ` ＋ `^## フル模範解答`→`^## 採点ポイント`）。`node scripts/magazine-to-pdf.mjs --spec <spec> --in-place`（Chrome 必要）。Chrome 不可環境なら PDF はスキップして親が「PDF 未生成」を明示報告。

### Step 6: SoT 登録（親が編集）
- `src/lib/note-magazines.ts` に `pe-construction-{subject}-magazine`（`published:false`）。**予想テーマ別記事化で記事数が増える**（道路は II-1/II-2/III×4=計6 ＋過去問）。`title`/`description`/`price` は予想（テーマ別単品）＋過去問の構成で書く。**価格はユーザー判断**（テーマ別単品 ¥? ＋セット）＝確定値はユーザーに確認、暫定で published:false 登録に留める。
- `note掲載文.txt`（コピペ用 4 セクション＋`■ 機械用（編集しない・自動同期）` の `セット価格`/`単品価格`）。価格はユーザー確定後に同期。
- **記事本文に価格を書かない**（SoT は note-magazines.ts。[[feedback_no_price_in_mdx_body]]）。

### Step 7: commit（親・pathspec 厳守）
- **必ず `git commit -- <pathspec>`**（`git add` + bare commit は並行エージェントの index を巻き込む。[[feedback_shared_index_commit_safety]]）。対象＝`{dir}` 配下＋`note掲載文.txt`＋`pdf-specs/...json`＋`note-magazines.ts`。
- pre-commit（note-lint / check-sns-urls）が通ることを確認。

## 完了条件（DoD）
- 各テーマ記事（III×N・II-2・II-1）が**テーマ別ブロック構成**・字数上限内・note-lint OK・U+FFFD 0。
- **fact-check `must_fix` 0**（WebSearch 環境で実施済み。未実施なら「事実照合 未完」と明示）。
- QA 各記事 pass（平均 ≥2.0・予想ゲート全通過・道路以外は合格者表記なし）。
- **1記事1ディレクトリ**で梱包（各 dir に article.md＋img/cover.png＋hashtags.txt〜90＋PDF。Chrome 不可なら PDF スキップを明示）。
- note-magazines.ts 登録（published:false）・note掲載文.txt・pdf-spec 追記。
- pathspec commit 済み。価格・公開は**ユーザー判断**（published:false のまま）。

## 戦略メモ
- **予想を先に**（試験 7 月中旬・時限商品）。最頻出・母数大の科目から（施工計画 → 土質基礎 → 鋼コン …）。
- テーマ別記事化の狙い＝テーマ単位の単品購入＋ロングテール検索発見性（「{科目} {テーマ} 予想」でヒット）。マガジンで全テーマ網羅（セット）も売る。
- 過去問模範解答（各科目 15 記事）は**試験後**に常緑在庫として別途展開（同 writer の過去問モード・**区分1ファイル据え置き**）。
- 1 科目 = サブエージェント多数（writer テーマ数＋factcheck＋qa＋修正）。クラウドで科目ごとにバッチ実行する。

## 参照
- 道路パイロット（完成形・テンプレ）: `docs/note/技術士建設部門/magazines/BK-01_道路/R08-yosou/III-1_脱炭素/article.md`
- `.Codex/agents/pe-secondary-exam-writer.md`（Generator・forecast モード）
- `.Codex/agents/pe-secondary-exam-factcheck.md`（外部事実照合・WebSearch）
- `.Codex/agents/pe-secondary-exam-qa.md`（6軸構造採点・forecast ゲート）
- `.Codex/knowledge/reference/agents-registry.md` / `.Codex/knowledge/reference/skills-guide.md`
- メモリ: [[project_pe_construction_bk_magazines]] / [[feedback_essay_persona_authentic_seat]] / [[feedback_shared_index_commit_safety]] / [[feedback_no_price_in_mdx_body]]
