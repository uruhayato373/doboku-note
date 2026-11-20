# 答案プロファイル: cem（技術士総合技術監理部門 記述式）

essay-writer と essay-qa が、資格 `cem` で呼ばれたときに最初に読む。自分の担当の節だけ読めばよい（writer＝「執筆」、qa＝「採点」）。

## 執筆（essay-writer が読む）

技術士総合技術監理部門（総監）の **note 有料マガジン用 記述式 模範論文／模範解答**（`content/note/技術士総監/magazines/{magazine}/{slug}/article.md`）を 1 記事ずつ生成する。品質採点は essay-qa（資格 cem）、最終採否は親（Opus）。

**真実源（必読・本書は重複させず参照する）**

- **工程・評価軸・公開ゲートの SSOT** = `.claude/knowledge/reference/note-essay-review-checklist.md`（Step 0〜6f＋横展開ランブック）。字数→散文性→監理可能性→専門度→白書根拠 の順。
- **論述ルールの再利用元** = `.claude/skills/pe-essay-draft/SKILL.md`（5管理の正式名/禁止語・設問3国家スケール・トレードオフ軸の多様性・である調）。あちらは**サイト** essay 生成スキルだが論述原則は共通。
- **構成決定（ペルソナ数・R8二記事化等）** = `content/note/技術士総監/総監マガジン構成_決定2026.md`。
- **導入・無料部分・販売導線の構成** = `.claude/shared-policy/STRUCTURE.md`（売れる9型・強化6部品）＋ `.claude/knowledge/reference/note-selling-structures.md`（記事タイプ別の早見表）。論文本文の外枠（フック〜導線）にのみ適用、本文の字数・散文・専門度は上の評価軸が優先。

### 背景（必読）

総監の二次過去問（問題文）・キーワードページはサイト側（無料 SEO 基盤）。**フル模範論文は note 有料マガジンが担う**分業（Red Line）。差別化の核は「**元・地方自治体の土木職（発注者）として全分野の工事発注・監督に携わった合格者**」という真正の経験座（SSoT: `src/config/author.ts`）。受注者（ゼネコン／コンサル）ペルソナは「売る」が**受注者視点を厳守**（発注者権限の施策＝仕様書義務化/条例改正/補助金/税制は書かない）。

### 入力

| パラメータ | 説明 | 例 |
|---|---|---|
| `type` | `persona` / `r8yosou` / `setsumon3` / `crosstradeoff` | `persona` |
| `magazine` | マガジン dir 名 | `総監模範論文-自治体下水道担当` |
| `slug` | 記事スラッグ（年度 `R0X` / `R08-yosou-1` / テーマ名） | `R06` |
| `persona` | ペルソナ（`type=persona` 時）。採否は checklist Step 0 で判定 | `自治体下水道担当` |
| `theme` | 予想/設問3/クロストレードオフのテーマ | `資源循環` |

### 4 タイプの構造（既存記事を構造の正として読む）

各タイプとも**既存の手本記事を Read して構造を正とし**、捏造しない。字数・散文・見出しは下記ゲートで機械検証する。

| type | マガジン | 単位 | 手本（構造ベンチマーク） |
|---|---|---|---|
| `persona` | `総監模範論文-{persona}` | 年度別（R03-R07）＋ `R08-yosou-1`/`-2` | `総監模範論文-自治体道路担当/R06`（過去問）／`総監模範論文-自治体下水道担当/R08-yosou-1`・`-2`（R8二記事化） |
| `r8yosou` | `総監記述式-R8予想問題集` | テーマ駆動（横断フラッグシップ） | 同マガジン既存記事 |
| `setsumon3` | `総監記述式-設問3国家施策バンク` | 将来課題テーマ別（国家施策案×600字） | 同マガジン既存記事 |
| `crosstradeoff` | `総監記述式-5管理クロストレードオフ` | 5管理ペア別 | 同マガジン既存記事 |

- `persona` 過去問: `## 試験問題` → `## A 案`・`## B 案`（各「（前提条件）」付き）→ 各案 設問（１）(２)(３)→ `## 採点者視点でのチェックポイント`。設問(2)(3)の各施策は **`### 施策 X-N:` 見出し**で区切り、本文は散文。
- 新規の過去問専用ペルソナは `.claude/config/cem-essay-structure.json` の `pastExamOnlyPersonas` に理由付きで登録されたものに限り、R03-R07 の5記事を必須とする。終了済みのR8予想を追加生成しない。既存の予想付き商品は上記構成を維持する。
- `persona` R8予想: 予想テーマ2つ（例 気候変動適応／資源循環）を **`R08-yosou-1`/`-2` の2記事**に分け、各記事に A 案・B 案を収録。本文は過去問形式＋`### 出題予想根拠`。

### ワークフロー固有の手順

**Step 1: 既存把握・ベンチマーク Read（最重要）**

- 対象マガジンの**既存 article.md を全 Read**し、構造・立場ラベル・トレードオフ軸の組合せ・語彙レベルを把握（答案本文の重複ゼロが必須）。
- `persona` は **checklist Step 0/0b** でペルソナ採否（著者の真正経験座か）と専門分野ラベル（正しい技術士選択科目／迷えば役割ベース一般化）を確定。異業種・他部門科目流用は不可。
- 同ペルソナ R7 過去問模範論文を到達目標ベンチマークにする（checklist Step 1）。

**Step 2: 執筆（checklist の品質原則を満たす）**

frontmatter（`published: false` ＋ `reviewStatus: needs-review` の人間ゲート・`price`/`noteUrl`/`noteId` は本文に直書きしない）＋本文。**note 公開する記事は `noteMagazine:` 直後に note公開メタ4行を空で初期化**：`noteUrl: ""` / `noteId: ""` / `notePublishedAt: ""` / `noteStatus: draft`（無いと `note-publish.mjs` の writeback が URL を記録できず冪等ガードも効かない。2026-07-02 writeback は「行が無ければ挿入」へ堅牢化済だがテンプレ側でも入れる）。執筆規則は以下を**厳守**（詳細は checklist 各 Step）：

1. **各施策 600 字以内（最優先）** — 設問(2)(3)の各 `### 施策` ブロックは①②③合算で 600 字以内。585〜600 字が理想、601 字以上は無条件で圧縮（checklist Step 2）。
2. **答案は散文** — `- **内容**:` `- **効果**:` のような箇条書き化は禁止。トレードオフの管理名（経済性管理 × 社会環境管理 等）は散文の中に明示（checklist Step 3）。手本＝河川／下水道／都市計画（答案箇条書き0）。
3. **文体** — 導入部（記事冒頭〜`## 試験問題`/`## 予想問題` 直前）は**ですます調**で 1 文 ≒ 1 段落に細かく区切る。答案本文（A 案/B 案の設問解答）は**である調**（checklist Step 3b/3c）。
4. **監理可能性** — 設問(2)各施策はペルソナの立場が自前で実施できる範囲に収める。越権（CIO 部局所掌のゼロトラスト移行・全庁ネットワーク整備等）は「所掌調整の枠組みに参画」へ書き換え。立場ラベルへの兼務付与で越権を正当化しない（checklist Step 4）。
5. **専門度（設問3）** — 国家スケール×**一般技術者レベル**。NG 用語（EU AI Act・SBOM・第三者認証制度・リスクベース規制・基盤モデル等）を使わず OK 語彙（リスクに応じた規制・人材育成・社会受容性・所管集約等）へ。規制側1施策＋人材/社会受容性側1施策（checklist Step 5）。
6. **5 管理の正式名と禁止語** — 経済性管理／安全管理／人的資源管理／情報管理／社会環境管理 のみ。品質管理・QCD・コスト管理・リスク管理は使わない。設問(2)の施策1と施策2で**同一トレードオフ軸ペアを繰り返さない**。
7. **白書根拠** — 「なぜ R8 でこのテーマが出るか」の白書言及は WebSearch で章構成・原表現を照合（確認不能は広い概念語へ置換。checklist Step 6）。予想テーマは「**出題が予想される**」で選定理由を書く（「論じやすい」と書かない）。
8. **blockquote 濫用禁止** — 著者の説明文（「本記事の構成」等）を `>` で書かない。引用は外部規程・白書原文・設問前文のみ（checklist Step 6b）。
9. **導入・無料部分・販売導線** — `note-selling-structures.md` の早見表で型を選ぶ（模範論文は勘違い破壊型・Before→After 型が効く）。STRUCTURE.md「強化コンポーネント」の部品（社会的証明[本物のみ]/価値3点先出し/数え上げ/FAQ 等）も導入・無料部分に載せてよい。価格は本文に書かず、マガジン誘導は `{{MAGAZINE_URL}}` 単独行（全角括弧で囲まない）。

### 機械ゲート（返却前・必須）

`writeMdxFile`（`scripts/lib/mdx-io.mjs`、CRLF 保持）経由で書き込み後、以下を**全て自己実行して PASS**させてから返す（不合格のまま返却しない）：

```bash
node scripts/content/essay-shisaku-charcount.mjs "{magazine}" --strict          # 各施策600字超 0
node scripts/checks/check-essay-heading-structure.mjs "{magazine}" --strict     # 見出し構造違反 0（特に R08 二記事化）
node scripts/note/note-lint.mjs "<書いた article.md の絶対パス>"               # pipe表/太字内全角括弧/U+FFFD 0
```

- 散文性: `grep -nE "^- \*\*(内容|根拠|効果|障害|課題|方法|利活用|リスク|克服)" article.md` が 0。
- U+FFFD 0 / 本文に価格（¥）・noteUrl/noteId 直書き 0。

### アセット（親と分担）

- カバー: `node scripts/build/generate-note-covers.mjs "{magazine}"`、ハッシュタグ: `/note-hashtags`（`hashtags.txt`・本文に入れない）。記事ごとに必須（checklist Step 6c）。

### 担当外（cem 固有）

- 配線（`note-magazines.ts` / `note掲載文.txt` / PDF spec）・公開後 URL 反映（`npm run note-inject-magazine-url`）・commit → 親エージェント（checklist Step 6e/6f/10）
- **サイト**の総監模範論文ページ（`r0X-essay-{attr}/article.mdx`）→ `/pe-essay-draft`（別物・無料サイトページ）
- キーワードページ → `keyword-rewriter`

### 参照

- `.claude/knowledge/reference/note-essay-review-checklist.md`（工程・評価軸・公開ゲートの SSOT）
- `.claude/skills/pe-essay-draft/SKILL.md`（論述ルールの再利用元・サイト版）
- `content/note/技術士総監/総監マガジン構成_決定2026.md`（構成決定）
- `.claude/shared-policy/STRUCTURE.md`（導入・無料部分・販売導線の 9 型・強化 6 部品）
- `.claude/knowledge/reference/note-selling-structures.md`（記事タイプ別の早見表・機械ゲート・参照経路）
- メモリ: [[feedback_essay_char_limit]] / [[feedback_essay_q2_prose]] / [[feedback_essay_q3_general_level]] / [[feedback_essay_persona_authentic_seat]] / [[feedback_essay_persona_field_label]] / [[feedback_no_price_in_mdx_body]] / [[feedback_whitepaper_source_check]]

## 採点（essay-qa が読む）

総監 記述式 note マガジン模範論文／模範解答（article.md）を採点する。**評価軸・しきい値の真実源は `.claude/knowledge/reference/note-essay-review-checklist.md`**（字数→散文性→監理可能性→専門度→白書根拠 の順で固定。本節はそれを採点フローに落としたもので、しきい値は checklist が正）。

### 入力（cem 固有）

| パラメータ | 説明 |
|---|---|
| `type` | `persona` / `r8yosou` / `setsumon3` / `crosstradeoff` |
| `magazine` / `persona` | 期待されるマガジン・ペルソナ |

### 固有の読み込み

- 同マガジンの既存 article.md（`persona` は同ペルソナ R7 過去問模範論文を**ベンチマーク**）を Read し、構造・重複・語彙レベルを把握。

### 決定論ゲートの実行

```bash
node scripts/content/essay-shisaku-charcount.mjs "{magazine}" --strict          # 各施策600字超 0（601字以上は無条件で不合格）
node scripts/checks/check-essay-heading-structure.mjs "{magazine}" --strict     # 見出し構造違反 0（特に R08 二記事化）
node scripts/note/note-lint.mjs "<対象 article.md の絶対パス>"                 # pipe表/太字内全角括弧/U+FFFD 0
grep -nE "^- \*\*(内容|根拠|効果|障害|課題|方法|利活用|リスク|克服)" "<path>"   # 答案箇条書き 0
grep -nc "^> " "<path>"                                                  # blockquote 濫用チェック（フレーミング文に > を使っていないか）
```

### 5軸ルーブリック（各0〜3）

| 軸 | 観点 |
|---|---|
| 1. 字数（各施策600字） | 設問(2)(3)の各 `### 施策` ブロックが①②③合算で 600 字以内。`essay-shisaku-charcount --strict` 準拠。601字以上は本軸 0＋必須ゲート不合格 |
| 2. 散文性 | 答案本文が散文段落（`- **内容/効果/障害**:` 等の箇条書き化が無い）。トレードオフの管理名が散文中に明示。導入部はですます・答案はである調で文体が割れない |
| 3. 監理可能性 | 設問(2)各施策がペルソナの立場の自前実施範囲内。越権施策（他部局所掌）を所掌調整の枠組みに収めている。立場ラベルへの兼務付与による越権正当化が無い |
| 4. 専門度 | 設問(3)が国家スケール×一般技術者レベル。NG用語（EU AI Act・SBOM・第三者認証・リスクベース規制・基盤モデル等）が無く OK語彙。5管理は正式名のみ（品質管理・QCD・コスト管理・リスク管理の混入が無い）。施策1と施策2でトレードオフ軸ペアが重複しない |
| 5. 白書根拠・真正性 | 予想根拠の白書言及が原表現と整合（捏造でない）。予想テーマ選定理由が「出題が予想される」（「論じやすい」でない）。ペルソナが著者の真正経験座（Step 0）・専門分野ラベルが正しい技術士選択科目 or 役割ベース一般化（Step 0b・他部門科目の流用が無い）。受注者ペルソナは受注者視点を逸脱しない |

### 必須ゲート（1つでも違反は不合格）

- 字数: `essay-shisaku-charcount --strict` が exit 0（601字以上 0）。超過設問は `issues` に列挙。
- 散文: 答案箇条書き 0・箇条書き混入 0（grep 0）。
- 見出し構造: `check-essay-heading-structure --strict` が exit 0（R08 は二記事化＝単一 `R08-yosou` を弾く）。
- note 互換: `note-lint` が exit 0（pipe 表・太字内全角括弧・U+FFFD 0）。
- blockquote 濫用 0: フレーミング文（本記事の構成・A案/B案対象者注記 等）に `>` を使っていない（公開済 河川/都市計画/下水道が基準＝全記事 0）。設問前文・白書原文の真正引用のみ例外。
- 本文に価格（¥）・noteUrl/noteId 直書き 0（SoT は note-magazines.ts／note掲載文.txt）。**マガジン/関連記事への導線リンクカード用 URL 単独行は許可**（[[feedback_note_link_card]]）。
- 導入部文体混在: 新規生成は 0 を目指す（`essay-shisaku-charcount` の「導入部文体混在(警告) N」。警告＝既存の許容は人間判断）。
- 記事ごとアセット（推奨検査）: `img/cover.png` ＋ `hashtags.txt`（単一行 space 区切り・80–90個）の有無。本文中のハッシュタグ羅列は規約違反として `issues` に記録。

### 出力の例（cem 固有の欄）

```json
{
  "path": "...",
  "type": "persona",
  "scores": { "charcount": 3, "prose": 3, "manageability": 2, "expertise": 3, "whitepaper_authenticity": 3 },
  "average": 2.8,
  "gates": { "charcount_strict": true, "prose_no_bullets": true, "heading_structure": true, "note_lint": true, "no_blockquote_abuse": true, "no_body_price": true },
  "verdict": "pass",
  "issues": ["指摘があれば file:line ＋ 重大度 ＋ 修正案で具体的に"]
}
```

### 担当外（cem 固有）

- 配線・公開後 URL 反映・commit → 親エージェント
- 白書一次照合（NotebookLM スコープ D）→ `note-fact-checker`（補完関係。本軸5は構成・原表現の整合まで）
- サイトの総監模範論文ページ評価 → `/pe-essay-review`（別物・無料サイトページ）／キーワードページ → `keyword-qa`

### 参照

- `.claude/knowledge/reference/note-essay-review-checklist.md`（評価軸・しきい値・横展開ランブックの SSOT）
- 字数ゲート: `scripts/content/essay-shisaku-charcount.mjs` / 見出し: `scripts/checks/check-essay-heading-structure.mjs` / note 互換: `scripts/note/note-lint.mjs`
- メモリ: [[feedback_essay_char_limit]] / [[feedback_essay_q2_prose]] / [[feedback_essay_q3_general_level]] / [[feedback_essay_persona_authentic_seat]] / [[feedback_essay_persona_field_label]] / [[feedback_no_price_in_mdx_body]]
