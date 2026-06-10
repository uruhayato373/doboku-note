---
name: pe-secondary-yosou
description: >
  技術士第二次試験 建設部門 選択科目の「令和8年度 予想問題＋フル模範解答」を 1 科目分まるごと
  公開可能品質まで仕上げる統括オーケストレーション・スキル。forecast モードの生成（pe-secondary-exam-writer）
  → 外部事実照合（pe-secondary-exam-factcheck）→ 構造採点（pe-secondary-exam-qa）→ 梱包（カバー/ハッシュタグ/PDF）
  → SoT 登録 → commit を 1 入口に集約する。クラウド（claude.ai/code）から 1 科目 1 指示で回せるよう設計。
  Use when user asks to [建設部門の予想問題を仕上げて, BK-0X の予想, {科目}の予想問題集, R8予想を展開, /pe-secondary-yosou].
user-invocable: true
---

# /pe-secondary-yosou — 建設部門 二次 選択科目 R8予想 バッチ

技術士第二次試験 建設部門の **選択科目（II-1 / II-2 / III）の令和8年度 予想問題＋模範解答**を、**1 科目（＝3 記事）** 単位で生成〜梱包〜SoT 登録〜commit まで一気通貫で仕上げる。必須科目I（複数案併記）は対象外（親が直接 writer を呼ぶ）。

> このスキルは「同じ前提・ルールを毎回書き直す／Generator と Evaluator を混同する／フレーミングや命名を取り違える」反復ミスを構造的に防ぐためにある。Generator/Evaluator の実体は各エージェント。**このスキル自体は記事本文を書かない**（親オーケストレーションが各エージェントを順に起動し、機械処理と commit を行う）。

## 実行環境（必読）

- **ファクトチェック工程は WebSearch が必須**。会社 PC はプロキシで外部 API 遮断のため**ローカルでは空振りする**。**クラウド（claude.ai/code）・CI/CD・Mac 等、外部アクセスが通る環境で実行する**こと（[[feedback_metrics_cicd_supplied]]）。
- **PDF 生成は Chrome headless 依存**。実行環境に Chrome が無ければ PDF だけ後追いでローカル/Mac バッチに回す（内容・QA・カバー・ハッシュタグ・SoT は環境非依存）。本スキルは PDF 不可でも他工程を止めない。

## 引数

```
/pe-secondary-yosou <subject> [--themes-file <path>]
```

- `subject`: 専門分野スラッグ（下表）。`--themes-file` 省略時は writer が過去問 MDX から予想テーマを自作する（forecast Step1）。

### subject ↔ マガジン対応（建設部門）

| subject | 正式名 | magazine_id | dir | 合格科目? → フレーミング |
|---|---|---|---|---|
| `road` | 道路 | BK-01 | `BK-01_道路` | ✅ 合格者（※完了済） |
| `river-coast` | 河川・砂防・海岸海洋 | BK-02 | `BK-02_河川砂防` | 発注者経験（※完了済） |
| `urban-planning` | 都市及び地方計画 | BK-03 | `BK-03_都市計画` | 発注者経験（※完了済） |
| `construction-planning` | 施工計画・施工設備及び積算 | BK-04 | `BK-04_施工計画` | **発注者経験** |
| `geotechnical` | 土質及び基礎 | BK-05 | `BK-05_土質基礎` | **発注者経験** |
| `steel-concrete` | 鋼構造及びコンクリート | BK-06 | `BK-06_鋼コン` | **発注者経験** |
| `environment` | 建設環境 | BK-07 | `BK-07_建設環境` | **発注者経験** |
| `tunnel` | トンネル | BK-08 | `BK-08_トンネル` | **発注者経験** |
| `port-airport` | 港湾及び空港 | BK-09 | `BK-09_港湾空港` | **発注者経験** |
| `railway` | 鉄道 | BK-10 | `BK-10_鉄道` | **発注者経験** |
| `power-civil` | 電力土木 | BK-11 | `BK-11_電力土木` | **発注者経験** |

> **BK-04〜11 は全て運営者の合格科目外**。記事内では「合格者」表記を使わず「**元・地方自治体の土木職（発注者）として {当該分野} の発注・監督に携わった経験**」で訴求する（[[feedback_essay_persona_authentic_seat]]）。

## ワークフロー（親オーケストレーション）

### Step 0: 準備
1. dir = `docs/note/技術士建設部門/magazines/{magazine_id}_{subject名}/R08-yosou/`。無ければ作成。
2. 既に完成した同型マガジン（例 `BK-02_河川砂防/R07/article-II1.md` 等）を 1 本 Read し、構造・文体・末尾 CTA・印刷用 PDF 節のテンプレとして writer に渡す。
3. 過去問 MDX `.local/r2/posts/pe-construction/r0[1-7]-{subject}` の存在を確認（forecast の予想根拠源）。

### Step 1: 生成（pe-secondary-exam-writer ×3・並列）
区分ごと（II-1 / II-2 / III）に forecast モードで起動。各エージェントへ渡す要点:
- `year: R08-yosou` / `subject` / `exam_type` / `magazine_id` / `forecast: true`。
- **全選択肢網羅**（II-1=4 設問・II-2=2 設問・III=2 設問が標準。過去問 MDX で設問数を確認）。
- 予想設問は過去問傾向＋国交省重点から**自作**（過去問の設問文を転載しない・`## 予想問題` に出典行なし・`## 予想の根拠` 必須・冒頭に予想免責明示）。
- **フレーミング**＝発注者経験（合格者表記禁止）。
- **冒頭マガジン回遊ブロックは置かない**（マガジン未公開＝URL 未確定。プレースホルダー禁止）。
- 末尾 CTA＝必須科目I マガジン `https://note.com/dobokunote/m/m0f3bc3933454`（価格非表示）。末尾最後に `## 印刷用PDF｜本記事の模範解答`。
- frontmatter に `cover:` ブロック（`hi:"R8予想"` / `hiSuffix:"{科目}II-1"` 等）。`noteUrl`/`noteId`/`notePublishedAt` 空。
- **commit させない**（親が実施）。

### Step 2: 機械検証（親が python / note-lint で実測）
- 各選択肢の解答が個別に枚数上限内（II-1≤600 / II-2≤1200 / III≤1800）。`### {選択肢}（約…字）` 単位で **python -X utf8** 実測（自己申告は信用しない）。超過は writer に再トリム指示（余裕 -5〜-70）。
- `node scripts/note-lint.mjs <path>`（pipe 表・太字内全角括弧・U+FFFD = 0）。
- 構造: `## 予想問題` / `## 予想の根拠` 有り、`## 試験問題`・出典行・「合格者」・冒頭回遊が**無い**こと。

### Step 3: 事実照合（pe-secondary-exam-factcheck ×3）★ 完璧の担保
- 各 article を WebSearch 接地で照合。`must_fix`（likely_wrong）があれば writer に**該当箇所のみ**修正させ、再照合して `must_fix` 0 にする。
- `uncertain`（review）は親が判断（多くは表現緩和で対応）。`blocked_no_websearch` が返ったら**この工程は環境が整う場所で再実行**（ローカル空振りを「合格」と偽装しない）。

### Step 4: 構造採点（pe-secondary-exam-qa ×3）
- forecast モードで 6 軸採点。平均 ≥2.0 かつ必須ゲート全通過まで writer 修正ループ。軸6（改訂コンピテンシー）が弱ければ三側面/文化的価値/データ活用/合意形成を該当区分の締めに加筆（字数上限内で）。

### Step 5: 梱包（親が機械処理）
1. **カバー**: `node scripts/generate-note-covers.mjs "{magazine_id}_{科目名}"`（cover:ブロックから cover-II1/II2/III.png 生成）。
2. **ハッシュタグ**: 各区分 `hashtags-{suf}.txt` を ~90〜99 個・**1 行 1 個**で作る。同マガジンの過去問 hashtags か近縁科目を土台に、年度タグを `#令和8年度`/`#R08予想`/`#予想問題`/`#出題予想`/`#試験直前対策` に差し替え＋区分テーマタグを足し、重複排除（道路/河川の生成方式を踏襲）。
3. **PDF**: 一時 spec（`srcDir`＋R08-yosou の article-II1/II2/III、include=`^## 予想問題`→`^## 設問構成と論述方針` ＋ `^## フル模範解答`→`^## 採点者が見る`）を作り `node scripts/magazine-to-pdf.mjs --spec <tmp> --in-place`。永続 spec `scripts/pdf-specs/{magazine_id}_{科目名}.json` にも R08-yosou 3 件を追記（過去問が未作成の新マガジンは spec を新規作成）。Chrome 不可環境なら PDF はスキップして親が「PDF 未生成」を明示報告。

### Step 6: SoT 登録（親が編集）
- `src/lib/note-magazines.ts` に `pe-construction-{subject}-magazine`（`published:false`）。過去問が未着手の科目は **予想 3 記事のみ**なので、`title`/`description`/`price` は予想単体構成で書く（例 `price: '予想3記事 ¥1,200（単品¥500）'` 等は**ユーザー判断**＝確定値はユーザーに確認。暫定で published:false 登録に留める）。過去問が既にあるマガジンは「R03-R07＋R8予想 全18記事・¥2,980」に更新。
- `note掲載文.txt`（コピペ用 4 セクション＋`■ 機械用（編集しない・自動同期）` の `セット価格`/`単品価格`）。価格はユーザー確定後に同期。
- **記事本文に価格を書かない**（SoT は note-magazines.ts。[[feedback_no_price_in_mdx_body]]）。

### Step 7: commit（親・pathspec 厳守）
- **必ず `git commit -- <pathspec>`**（`git add` + bare commit は並行エージェントの index を巻き込む。[[feedback_shared_index_commit_safety]]）。対象＝`{dir}` 配下＋`note掲載文.txt`＋`pdf-specs/...json`＋`note-magazines.ts`。
- pre-commit（note-lint / check-sns-urls）が通ることを確認。

## 完了条件（DoD）
- 3 記事（article-II1/II2/III）が全選択肢網羅・字数上限内・note-lint OK・U+FFFD 0。
- **fact-check `must_fix` 0**（WebSearch 環境で実施済み。未実施なら「事実照合 未完」と明示）。
- QA 3 本 pass（平均 ≥2.0・予想ゲート全通過・合格者表記なし・冒頭回遊なし）。
- カバー3・ハッシュタグ3（各 ~90）・PDF3（Chrome 不可ならスキップを明示）。
- note-magazines.ts 登録（published:false）・note掲載文.txt・pdf-spec 追記。
- pathspec commit 済み。価格・公開は**ユーザー判断**（published:false のまま）。

## 戦略メモ
- **予想を先に**（試験 7 月中旬・時限商品）。最頻出・母数大の科目から（施工計画 → 土質基礎 → 鋼コン …）。
- 過去問模範解答（各科目 15 記事）は**試験後**に常緑在庫として別途展開（同 writer の過去問モード）。
- 1 科目 = サブエージェント約 9〜12 本（writer3＋factcheck3＋qa3＋修正）。クラウドで科目ごとにバッチ実行する。

## 参照
- `.claude/agents/pe-secondary-exam-writer.md`（Generator・forecast モード）
- `.claude/agents/pe-secondary-exam-factcheck.md`（外部事実照合・WebSearch）
- `.claude/agents/pe-secondary-exam-qa.md`（6軸構造採点・forecast ゲート）
- `docs/reference/agents-registry.md` / `docs/reference/skills-guide.md`
- メモリ: [[project_pe_construction_bk_magazines]] / [[feedback_essay_persona_authentic_seat]] / [[feedback_shared_index_commit_safety]] / [[feedback_no_price_in_mdx_body]]
