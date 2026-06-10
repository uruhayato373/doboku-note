# 指示書（runbook）｜建設部門2次 BK-04〜11 R8予想 一括展開（クラウド実行）

> **使い方**: claude.ai/code（クラウド Claude Code）でこのファイルを開き、「**この runbook に従って BK-04〜11 の R8予想を全科目仕上げて**」と指示する。会社PCローカルでは WebSearch が遮断され事実照合が空振りするため、**必ずクラウド（または外部アクセスの通る環境）で実行**すること。

## 0. ゴールと成果物

技術士第二次試験 建設部門の**残り8専門分野（BK-04〜11）の選択科目 R8予想**を、**公開可能品質（published:false の完成成果物）**まで一括で仕上げる。1科目＝3記事（II-1 / II-2 / III）。

成果物（科目ごと）:
- `article-II1.md` / `article-II2.md` / `article-III.md`（予想問題＋フル模範解答・全選択肢網羅）
- カバー3・ハッシュタグ3（各~90）・印刷用PDF3
- `note-magazines.ts` 登録（published:false）・`note掲載文.txt`・pdf-spec
- **事実照合（factcheck）must_fix 0** ／ QA 6軸 pass

**価格設定と note 公開（published:true 化）はユーザー判断**。この runbook は published:false の完成品までで停止する。

## 1. 実行環境プリフライト（最初に1回）

1. `git branch --show-current` が `develop` であることを確認（違えば停止して報告）。
2. **WebSearch 可否**: 簡単な WebSearch を1回試す。失敗するなら事実照合ができない環境＝**この runbook を実行しない**（クラウドで実行すること）。
3. **Chrome 可否**: `node scripts/magazine-to-pdf.mjs` が Chrome headless を要する。無ければ **PDF工程だけスキップ**し、各科目で「PDF未生成（要ローカル後追い）」と明示報告（他工程は続行）。
4. スキル `/pe-secondary-yosou` とエージェント `pe-secondary-exam-writer` / `pe-secondary-exam-factcheck` / `pe-secondary-exam-qa` が存在することを確認。

## 2. 対象8科目（この順で1科目ずつ）＋予想テーマの軸

> テーマ軸は**起点**。各 writer は forecast モードで過去問 MDX `.local/r2/posts/pe-construction/r0[1-7]-{subject}` を読み、固定枠・周期を確認して**補正・確定**する。**全8科目とも運営者の合格科目外＝「発注者として担当した経験」訴求（合格者表記禁止）**、マガジン未公開につき**冒頭回遊なし**。

| 順 | subject | magazine_id / dir | II-1（4設問の枠から）｜II-2（2）｜III（2）の軸 |
|---|---|---|---|
| 1 | `construction-planning` | BK-04 / `BK-04_施工計画` | II-1: 仮設・土留め／工程管理(ネットワーク)／品質・出来形管理／積算(歩掛・間接費)・施工計画。II-2: i-Construction 2.0・ICT施工の施工計画／建設DX・自動化遠隔化導入。III: 担い手不足下の生産性向上(週休2日)／現場の安全・品質確保 |
| 2 | `geotechnical` | BK-05 / `BK-05_土質基礎` | II-1: 締固め／圧密沈下／液状化判定／基礎形式選定(直接・杭)／斜面安定 から4つ。II-2: 軟弱地盤対策(地盤改良)の設計施工／近接施工の地盤対策。III: 大規模地震の液状化・斜面防災／既設基礎の維持管理・耐震補強 |
| 3 | `steel-concrete` | BK-06 / `BK-06_鋼コン` | II-1: 鋼材の疲労／溶接継手／中性化・塩害／ASR／プレストレス から4つ。II-2: 鋼橋・コンクリート橋の長寿命化修繕・補修補強。III: 橋梁等の予防保全・更新／脱炭素(低炭素材料) |
| 4 | `environment` | BK-07 / `BK-07_建設環境` | II-1: 環境影響評価／騒音振動／水質保全／生物多様性・自然再生／建設リサイクル から4つ。II-2: グリーンインフラ・自然再生の事業計画／建設副産物・リサイクル計画。III: 生物多様性(30by30・ネイチャーポジティブ)／脱炭素・循環型 |
| 5 | `tunnel` | BK-08 / `BK-08_トンネル` | II-1: 山岳(NATM)／シールド／開削／覆工・変状の維持管理 から4つ。II-2: 都市部シールドトンネル／山岳トンネルの地質リスク対応施工計画。III: 道路トンネルの老朽化・長寿命化／防災(火災・避難)・点検DX |
| 6 | `port-airport` | BK-09 / `BK-09_港湾空港` | II-1: 防波堤(混成堤)／係船岸(矢板・桟橋)／浚渫埋立／空港舗装 から4つ。II-2: 港湾施設整備・老朽化対策／空港機能向上。III: 地震・津波・高潮への港湾強靱化・BCP／カーボンニュートラルポート |
| 7 | `railway` | BK-10 / `BK-10_鉄道` | II-1: 軌道(バラスト・スラブ)／路盤・土構造物／鉄道橋・高架橋／構造物の維持管理 から4つ。II-2: 連続立体交差・新線の施工計画／営業線近接工事の安全。III: 鉄道構造物の老朽化・耐震／防災(豪雨・地震)・利便性向上 |
| 8 | `power-civil` | BK-11 / `BK-11_電力土木` | II-1: ダム／水路・水圧管／発電所基礎／送電鉄塔基礎 から4つ。II-2: 水力・揚水発電の土木施設／再エネ(洋上風力基礎等)の土木計画。III: 再エネ拡大に伴う土木インフラ／既設電力土木設備の維持管理・防災 |

## 3. 実行手順（科目ループ — 1科目ずつ、commit でチェックポイント）

各科目について `/pe-secondary-yosou <subject>` の手順（= スキル本文）を実行する。要点:

1. **生成**: `pe-secondary-exam-writer` を II-1 / II-2 / III の3並列で forecast 起動（上表のテーマ軸を渡す。全選択肢網羅・発注者経験・冒頭回遊なし・末尾必須ICTA・cover:ブロック・出典行なし・予想根拠/免責あり）。commit させない。
2. **機械検証**: python -X utf8 で各選択肢が個別に上限内（II-1≤600 / II-2≤1200 / III≤1800）、`note scripts/note-lint.mjs` 通過、`## 予想問題`/`## 予想の根拠` 有り・`合格者`/出典行/冒頭回遊が無いこと。超過は writer に再トリム。
3. **事実照合**: `pe-secondary-exam-factcheck` を3記事に起動（WebSearch接地）。`must_fix`（likely_wrong）は writer に**該当箇所のみ**修正させ**再照合して0**にする。`blocked_no_websearch` が返ったら**この科目を止めて報告**（環境不備）。
4. **6軸採点**: `pe-secondary-exam-qa` を3記事に起動（forecast）。平均≥2.0かつ必須ゲート全通過まで修正ループ。軸6が弱ければ三側面/文化的価値/データ活用/合意形成を締めに加筆（字数上限内）。
5. **梱包**: カバー（`generate-note-covers.mjs "{dir}"`）／ハッシュタグ3（過去問同型 or 近縁科目の hashtags を土台に年度タグを `#令和8年度`/`#R08予想`/`#予想問題`/`#出題予想`/`#試験直前対策` へ差し替え＋区分テーマ、1行1個~90）／PDF（一時spec・予想問題レンジ。Chrome無ならスキップ明示＋永続spec `scripts/pdf-specs/{dir}.json` 新規作成）。
6. **SoT**: `note-magazines.ts` に `pe-construction-{subject}-magazine`（**published:false**）を新規登録。**予想3記事のみ構成**なので price は確定せず暫定（例 `'予想3記事（単品¥500）'`）にし、本文・note掲載文に確定価格を書かない（価格はユーザー判断）。`note掲載文.txt`（4セクション＋機械用ブロックは価格未確定なら省略可）。
7. **commit（pathspec厳守）**: `git commit -- <dir> <note掲載文> <pdf-spec> src/lib/note-magazines.ts`。**`git add`＋bare commit は禁止**（並行index巻き込み）。pre-commit（note-lint/check-sns-urls）通過を確認。
8. **科目完了を1行で報告** → 次の科目へ。

> **チェックポイント設計**: 必ず**科目ごとに commit**する。8科目を1コミットにまとめない。途中で中断/失敗しても、未コミットの科目から再開できる（`git log --oneline` で完了科目を確認）。

## 4. 各科目の完了条件（DoD）

- 3記事が全選択肢網羅・各選択肢字数上限内・note-lint OK・U+FFFD 0。
- **factcheck must_fix 0**（WebSearch環境で実施済み）。
- QA 3本 pass（平均≥2.0・予想ゲート全通過・合格者表記なし・冒頭回遊なし）。
- カバー3・ハッシュタグ3（各~90）・PDF3（Chrome不可ならスキップを明示）。
- note-magazines.ts 登録（published:false）・note掲載文.txt・pdf-spec。
- 科目単位の pathspec commit 済み。

## 5. 失敗時の扱い（隠さない）

- **factcheck が `blocked_no_websearch`**: 環境がWebSearch不可＝事実担保ができない。その科目を**止めて報告**（「完璧」と偽らない）。
- **Chrome無でPDF不可**: PDFのみスキップし「PDF未生成（要ローカル後追い）」を科目報告に明記。他工程は続行。
- **QA が pass に到達しない**: 2回修正しても平均<2.0 or 必須ゲート不合格なら、その記事を**未完として報告**し次工程に進まない（不完全を「完了」と言わない）。
- **index.lock 競合**: 数秒待って再試行。`git commit -- <pathspec>` を厳守。

## 6. 進捗・最終報告フォーマット

科目ごと:
```
[BK-0X {subject}] 完了 — 記事3/字数OK/note-lint OK/factcheck must_fix=0/QA[II-1 x.xx, II-2 x.xx, III x.xx]/カバー3/タグ3/PDF{3 or スキップ}/commit {hash}
```
最終:
```
完了 N/8 科目。未完: {あれば科目と理由}。残作業: 価格確定→note公開(published:true)はユーザー、過去問15記事/科目は試験後。
```

## 7. 参照（真実源）

- スキル: `.claude/skills/authoring/pe-secondary-yosou/SKILL.md`（手順の実体）
- エージェント: `.claude/agents/pe-secondary-exam-writer.md`（forecast）/ `pe-secondary-exam-factcheck.md`（WebSearch事実照合）/ `pe-secondary-exam-qa.md`（6軸）
- 商品設計・規約: `docs/note/技術士建設部門/noteコンテンツ計画.md`、メモリ `project_pe_construction_bk_magazines`
- 既存完成例（構造テンプレ）: `docs/note/技術士建設部門/magazines/BK-02_河川砂防/R08-yosou/`（発注者経験・冒頭回遊なしの予想3記事の見本）

---

**この runbook の対象は予想（時限商品）のみ。過去問15記事/科目は試験後に同 writer の過去問モードで別 runbook を用意する。**
