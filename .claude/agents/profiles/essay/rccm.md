# 答案プロファイル: rccm（RCCM 問題III 模範論文・問題I テンプレ）

essay-writer と essay-qa が、資格 `rccm` で呼ばれたときに最初に読む。自分の担当の節だけ読めばよい（writer＝「執筆」、qa＝「採点」）。

## 執筆（essay-writer が読む）

RCCM 資格試験（建設コンサルタンツ協会）の **note 有料教材**（`content/note/RCCM/magazines/{magazine}/{slug}/article.md`）を 1 記事ずつ生成する。品質採点は essay-qa（資格 rccm）、最終採否は親（Opus）。

**真実源（必読）**

- **試験事実・公開テーマ・指定用語の SSOT** = `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md`（一次出典＝協会の出題テーマ PDF）。ここに無い日付・数値・制度は書かない。
- **商品設計** = `content/note/RCCM/noteコンテンツ計画.md`。実価格・noteUrl は `src/lib/note-magazines.ts`（`rccm-*`）。
- **導入・無料部分・販売導線** = `.claude/shared-policy/STRUCTURE.md`＋`.claude/knowledge/reference/note-selling-structures.md`。
- **論述の型（再利用元）** = 総監 設問3国家施策バンク（`content/note/技術士総監/magazines/総監記述式-設問3国家施策バンク/*`）と建設部門 必須科目I（`content/note/技術士建設部門/magazines/BK-I_必須科目I/*`）。構造の手本として Read するが、本文を流用・転載しない。

### 背景（必読）

- RCCM の過去問題は事務局非公開。**試験問題の転載・復元・民間サイトの再現問題の引用は一切しない**。問題III は協会が事前公開する 6 テーマ（設問①②・指定用語）だけを一次出典として使い、模範論文は全て自作する。
- 運営者の座は `src/config/author.ts`＝技術士（建設部門・総合技術監理部門）・元自治体土木職員として**建設コンサルタント業務を発注し成果品を検査・評定してきた発注者**。**RCCM 保有・コンサル在籍・試験の採点者は名乗らない**。論文の語り手は「建設コンサルタントの管理技術者（受注者）」で、発注者権限の施策（仕様書で義務化・条例改正・補助金・税制）は書かない。
- 差別化＝総監5管理（経済性管理・人的資源管理・情報管理・安全管理・社会環境管理）の構造で「現状と課題→あり方」を組み、指定用語を語の羅列でなく因果の中で使う。

### 入力

| パラメータ | 説明 | 例 |
|---|---|---|
| `type` | `mondai3`（問題III 公開テーマ別 模範論文）/ `mondai1`（問題I 業務経験論文テンプレ＋記入例） | `mondai3` |
| `magazine` | マガジン dir 名 | `RCCM問題III-2026模範論文集` |
| `slug` | 記事 dir 名（`NN-テーマ短名`） | `01-インフラ老朽化` |
| `theme` | `_facts-2026.md` のテーマ番号（1〜6） | `1` |

### `mondai3` 記事の構造（1 本 6,500〜8,000 字・見出しは H2 以下）

frontmatter（`writeMdxFile` 経由・price/noteUrl/noteId は本文に直書きしない）:

```yaml
---
notePricing: paid
price: 780
paidBoundary: "模範論文"
noteMagazine: RCCM問題III-2026模範論文集
noteUrl: ""
noteId: ""
notePublishedAt: ""
noteStatus: draft
utmCampaign: rccm-2026
rccmTheme: 1
rccmKeywords: ["老朽化", "人口減少", "地方公共団体", "インフラの再構築", "マネジメントサイクル", "広域連携", "多様な契約方式", "群マネ", "官民連携", "新技術"]
cover:
  variant: crop-safe-v4
  leadIn: "RCCM 問題III｜2026年度"
  headline: "インフラ老朽化"
  hi: "1,600"
  hiSuffix: "字"
  benefit: "指定語を「」で自然に使う"
---
```

`rccmKeywords` は `_facts-2026.md` の指定用語を**原文表記のまま全語**列挙する（機械ゲートの入力）。

| 節（H2） | 無料/有料 | 目安字数 | 内容 |
|---|---|---|---|
| H1 `# {テーマ名}｜RCCM 問題III 管理技術力 模範論文（2026年度）` → **こんな人のための記事です**（4 項目）／**この記事でわかること**（4 項目） | 無料 | 400 | ですます調。価格は書かない |
| マガジン導線 `{{MAGAZINE_URL}}` 単独行 | 無料 | — | 全角括弧で囲まない |
| `## テーマの読み解き` | 無料 | 900〜1,100 | なぜ 2026 年度にこのテーマか（白書・長寿命化計画・i-Construction 2.0・BIM/CIM 原則適用など**WebSearch で原表現を照合した一次出典**）。指定用語を列挙し、それぞれ「どの文脈で使う語か」を 1 行で |
| `## 答案構成の設計` | 無料 | 600〜800 | ①現状と課題 ≈500 字／②あり方 ≈950 字の配分、指定用語をどこに置くか、管理技術者の視点で何を書き何を書かないか |
| `## 模範論文` | **有料境界（paidBoundary）** | **1,400〜1,550**（ゲート 1,200〜1,600） | `### ① {設問①の原文}` / `### ② {設問②の原文}`。である調・散文。指定用語を **5 語以上**「」で囲んで使う（ゲートは 4 語以上）。同じ語を「」で繰り返し囲まない（初出のみ「」）|
| `## 指定用語の使用チェック` | 有料 | 300 | 2 列表（用語｜使用箇所①/②・要旨）。使わなかった語も「未使用」と明記 |
| `## 部門別の置換ポイント` | 有料 | 700〜900 | 道路／河川、砂防及び海岸・海洋／都市計画及び地方計画／建設環境 の 4 部門 × 150〜200 字（自部門の業務に置き換える視点）。他の部門は列挙のみ |
| `## 採点者が見るポイント` | 有料 | 400 | 発注者として成果品を検査してきた立場からの 5 点（箇条書き可） |

### `mondai1` 記事の構造（問題I 業務経験論文テンプレ・1 本）

無料＝業務実績証明書との整合／技術上の問題点と業務上の問題点の立て方／落ちる論文 3 型。**有料境界 `## テンプレート`**＝2,400 字の穴埋め骨子 → `## 記入例` ×3（道路／河川砂防／鋼構造コンクリート・各 2,300〜2,400 字・架空の業務は「記入例」と明記し、実在の工事名・発注者名・固有数値を捏造しない）。

### 執筆規則（厳守）

1. **字数**: `## 模範論文` 節（H2 直下〜次の H2 直前）の本文は **1,200〜1,600 字**（空白・見出し・記号を除く）。1,400〜1,550 を狙う。
2. **指定用語**: `rccmKeywords` のうち **4 語以上**を「」で囲んで模範論文内に使う。原文表記のまま（「国土強靭化」は PDF 表記）。「」の中に別の語を混ぜない。羅列（「A」「B」「C」を並べるだけ）は不可＝各語は因果・手段・効果のどれかを担う。
3. **視点**: 語り手は建設コンサルタントの管理技術者。発注者・行政の権限でしか実施できない施策を「私が行う」と書かない（「発注者に提案する」「協議で合意形成する」は可）。
4. **構成**: ①現状と課題 → ②あり方。①は数字・制度の現状→課題 2〜3 点、②は課題に対応する取り組み（管理技術者として実施できること）＋期待効果＋留意点。5 管理の語を使ってよいが総監用語（「総合技術監理」）を前面に出さない。
5. **文体**: 導入・解説はですます調で 1 文 ≒ 1 段落、模範論文はである調。blockquote は設問原文・白書原文の引用のみ。
6. **事実**: 日付・数値・制度名は `_facts-2026.md` と WebSearch で照合した一次出典に限る。不確かなものは概念語へ（「近年の調査では」等）。白書の表現は捏造しない。
7. **禁止**: 試験問題文の再現、競合記事の文言、価格の直書き、RCCM 合格/コンサル在籍の詐称、絵文字、4 列以上の表。

### 機械ゲート（返却前・必須）

`writeMdxFile`（`.claude/scripts/lib/mdx-io.mjs`）で書き込み後、以下を全て PASS させてから返す：

```bash
node scripts/check-rccm-essay.mjs "<article.md の絶対パス>" --strict   # 字数 1,200〜1,600・指定用語「」4語以上・見出し・試験問題節の不在
node scripts/note-lint.mjs "<article.md の絶対パス>"                    # pipe表/太字内全角括弧/U+FFFD 0
grep -c $'\xef\xbf\xbd' "<path>"                                              # 0
```

### 担当外（rccm 固有）

- カバー・ハッシュタグ・掲載文・`note-magazines.ts` 配線・公開・commit → 親
- サイトのガイド記事（`content/site/rccm/**`）→ `guide-writer`（`category: rccm`）
- 択一（問題II/IV）予想問題 → 親が直接（`content-qa`＋`note-fact-checker` で採点）

### 参照

- `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md`（試験事実 SSOT）
- `content/note/RCCM/noteコンテンツ計画.md`（商品設計）
- `.claude/agents/profiles/essay/cem.md`（設計の出自。総監固有ルール＝施策600字・設問3国家スケールは RCCM に適用しない）

## 採点（essay-qa が読む）

RCCM note 教材（article.md）を採点する。

試験事実・公開テーマ・指定用語の真実源は `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md`。ここと食い違う記述は軸 5 を 0 にする。

### 入力（rccm 固有）

| パラメータ | 説明 |
|---|---|
| `type` | `mondai3` / `mondai1` |
| `theme` | `_facts-2026.md` のテーマ番号（`mondai3` 時） |

### 固有の読み込み

- `_facts-2026.md` と対象 article.md を Read。frontmatter（`rccmKeywords`・`paidBoundary`）と本文を分離。
- 同マガジンの既存 article.md を Read し、模範論文の重複・語彙レベル・構造を把握。

### 決定論ゲート

```bash
node scripts/check-rccm-essay.mjs "<path>" --strict    # 字数 1,200〜1,600 / 指定用語「」4語以上 / 見出し / 試験問題節の不在
node scripts/note-lint.mjs "<path>"                     # pipe表・太字内全角括弧・U+FFFD 0
grep -nc "^> " "<path>"                                 # blockquote は設問原文・白書原文の引用のみ
grep -nE "¥|note\.com/dobokunote/(m|n)/" "<path>"       # 価格・URL 直書き 0（{{MAGAZINE_URL}} 単独行は可）
```

### 5 軸ルーブリック（各 0〜3）

| 軸 | 観点 |
|---|---|
| 1. 字数・形式 | `## 模範論文` が 1,200〜1,600 字（1,400〜1,550 が理想）。①②の見出しが設問原文と一致。ですます（導入）／である（論文）で文体が割れない。範囲外は 0＋必須ゲート不合格 |
| 2. 指定用語 | `rccmKeywords` から 4 語以上を「」で使用（5 語以上で 3 点）。各語が因果・手段・効果を担い、羅列や不自然な挿入が無い。表記が原文どおり。使用チェック表が実際の使用と一致 |
| 3. 視点・構成 | 語り手が建設コンサルタントの管理技術者。発注者・行政の権限施策を自分の取り組みとして書いていない。①現状→課題 2〜3 点、②課題に対応する取り組み＋効果＋留意点が対応している。テーマ 4〜6 は「業務遂行能力の観点」が本文に表れている |
| 4. 専門度 | 建設コンサルタント実務（照査・成果品・設計協議・積算・維持管理計画）の語彙で書かれ、一般論・スローガンに終わっていない。部門別置換ポイントが 4 部門それぞれ具体的 |
| 5. 事実根拠・真正性 | 日付・数値・制度が `_facts-2026.md`／WebSearch 一次出典と整合。試験問題文の転載・競合文言の流用が無い。運営者の座（発注者として検査・評定した技術士）を超える主張（RCCM 保有・コンサル在籍・採点者）が無い |

### 必須ゲート（1 つでも違反は不合格）

- `check-rccm-essay --strict` exit 0。
- `note-lint` exit 0。
- 本文に価格（¥）・noteUrl/noteId 直書き 0（`{{MAGAZINE_URL}}` 単独行は可）。
- `## 試験問題` `## 過去問` 等の**問題再現節が無い**（公開テーマの設問①②見出しは可）。
- 記事ごとアセット（推奨検査）: `img/cover.png`・`hashtags.txt` の有無を `issues` に記録（無くても不合格にはしない）。

### 出力の例（rccm 固有の欄）

```json
{
  "path": "...",
  "type": "mondai3",
  "theme": 1,
  "scores": { "length_format": 3, "keywords": 3, "viewpoint_structure": 2, "expertise": 2, "facts_authenticity": 3 },
  "average": 2.6,
  "gates": { "check_rccm_essay": true, "note_lint": true, "no_body_price": true, "no_exam_reproduction": true },
  "verdict": "pass",
  "issues": ["file:line ＋ 重大度 ＋ 修正案"]
}
```

### 担当外（rccm 固有）

- 配線・公開・commit → 親
- サイトのガイド記事（`content/site/rccm/**`）の評価 → `guide-qa`／事実照合 → `guide-fact-checker`

### 参照

- `content/note/RCCM/magazines/RCCM問題III-2026模範論文集/_facts-2026.md`
- ゲート: `scripts/check-rccm-essay.mjs` / `scripts/note-lint.mjs`
