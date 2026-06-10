# ハンドオフ｜建設部門2次 BK-04〜11 R8予想 一括展開 進捗（2026-06-10）

runbook: `docs/handoffs/2026-06-10-bk04-11-yosou-cloud-runbook.md` に従い、クラウド（claude.ai/code）で実行した進捗記録。

## 完了状況：4/8 科目

| 科目 | 状態 | factcheck | QA 6軸 | commit |
|---|---|---|---|---|
| BK-04 施工計画 | ✅ 完了（予想3記事） | must_fix=0 | II-1 2.67 / II-2 2.83 / III 2.50 | 02e19037 |
| BK-05 土質基礎 | ✅ 完了（予想3記事） | must_fix=0 | II-1 2.83 / II-2 2.83 / III 2.67 | 7c342bff |
| BK-06 鋼コン | ✅ 完了（予想3記事） | must_fix=0 | II-1 2.67 / II-2 2.83 / III 2.83 | a029443d |
| BK-07 建設環境 | ✅ 完了（予想3＋過去問15＝全18記事マガジンSoT整備） | must_fix=0 | II-1 2.67 / II-2 2.50 / III 2.83 | 12a8a391 |
| BK-08 トンネル | ⬜ 未着手（dir のみ作成済・ファイルなし） | — | — | — |
| BK-09 港湾空港 | ⬜ 未着手 | — | — | — |
| BK-10 鉄道 | ⬜ 未着手（**過去問15記事が既存**） | — | — | — |
| BK-11 電力土木 | ⬜ 未着手 | — | — | — |

- ブランチ `claude/zen-goodall-yi292j`（作業ツリー clean・origin 同期済み）。
- **PR #240**（`claude/zen-goodall-yi292j` → `develop`）作成済み・レビュー待ち：https://github.com/uruhayato373/doboku-note/pull/240
- 全成果物 `published:false`。価格確定・note公開（published:true）はユーザー判断で未実施。

## 各完了科目の成果物（runbook §3 準拠）

- `R08-yosou/article-II1/II2/III.md`（全選択肢網羅・発注者経験フレーミング・合格者表記なし・冒頭マガジン回遊なし・末尾 必須科目I CTA・末尾 `## 印刷用PDF` 節）
- カバー3（cover-II1/II2/III.png＋svg）／ハッシュタグ3（各95個・1行1個）
- `note掲載文.txt`（価格未確定の予想専用科目は機械用ブロック省略＝runbook §6 許容）
- `scripts/pdf-specs/{科目}.json`／`src/lib/note-magazines.ts` 登録（published:false）／`src/lib/magazine-placement.ts` 配線

## 重要な発見・恒久メモ（次セッションで必読）

1. **BK-07・BK-10 は過去問 R03-R07（各15記事）が既にコミット済み**。runbook §2 の「予想専用」前提と異なる。BK-07 は本セッションで全18記事マガジン（過去問カバー未コミット分も補完）として SoT 整備済み。**BK-10 も着手時は「R03-R07＋R8予想＝全18記事 ¥2,980」として SoT 登録すること**（BK-02/03/07 と同方式）。残り BK-08/09/11 は予想専用（暫定価格・機械ブロック省略）。
2. **字数判定は公式カウンタ（python: `len(re.sub(r'\s','',re.sub(r'[#*\`\-|\[\]()> 　\t]+','',body)))`）が真実源**。writer の自己申告は計測法差で ~9〜200字過小になることがある（特に III はサブ見出し `#### III-1-（1）` を含む全文ブロックで測る）。**親が必ず再実測し、超過は親がトリム**。III は `### III-1（` 〜 `### III-2（`、`### III-2（` 〜 `## 採点者` の全文を合算。
3. **PDF はクラウドで生成不可**。`scripts/magazine-to-pdf.mjs` が Windows 専用（`const CHROME='C:\\...'`／作業ディレクトリ `C:\tmp\...`／root で `--no-sandbox` 未対応）。全科目 PDFスキップ。永続 spec は作成済みなので**ローカル（Windows）で `node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/{科目}.json --in-place`** で後追い生成。※失敗時に `C:\tmp\...` という名のゴミディレクトリがリポジトリ直下に生成されるので `rm -rf` で除去（コミットに含めない）。
4. **fresh container は `node_modules` 未インストール**。カバー生成（satori/sharp/resvg）に `npm install --legacy-peer-deps` が必要（eslint peer 競合のため `--legacy-peer-deps` 必須）。
5. factcheck の典型 must_fix（建設部門で繰り返し出る誤り）：i-Construction 2.0=令和6年4月策定・省人化「少なくとも3割（生産性1.5倍）」（「4割減」は誤り）／間接費＝共通仮設費・現場管理費・一般管理費等の3層／BIM/CIM（旧 CIM 不可）／インフラ長寿命化基本計画＝平成25年策定（行動計画は別）／30by30＝「陸と海の30%以上」／水質汚濁防止法 pH 5.8〜8.6／特定建設資材4品目／橋梁50年超は2033年度末 約63%。
6. コミットは**科目単位 pathspec**（`git add <dir> <pdf-spec> note-magazines.ts magazine-placement.ts` → commit。`git add -A` 禁止）。pre-commit（note-lint/check-sns-urls）通過を確認。各科目 commit 後に push。

## 残作業（再開手順）

1. 同 runbook（`2026-06-10-bk04-11-yosou-cloud-runbook.md`）に従い BK-08→09→10→11 を1科目ずつ：生成（writer×3並列）→ 親が字数再実測・トリム → factcheck×3 → must_fix修正 → QA×3 → 梱包（カバー/タグ/pdf-spec/note掲載文/SoT/placement）→ 科目単位 commit → push。
2. テーマ軸は runbook §2 の表を起点（BK-08 山岳NATM/シールド/開削/覆工維持管理・都市部シールド/山岳地質リスク・道路トンネル老朽化/防災点検DX 等）。
3. **BK-10 鉄道は過去問15記事が既存** → 全18記事マガジンとして SoT 登録。
4. 価格確定・`published:true` 化・PDFローカル生成はユーザー作業。

## 参照
- runbook: `docs/handoffs/2026-06-10-bk04-11-yosou-cloud-runbook.md`
- スキル: `.claude/skills/authoring/pe-secondary-yosou/SKILL.md`
- 構造見本: `docs/note/技術士建設部門/magazines/BK-02_河川砂防/R08-yosou/`
