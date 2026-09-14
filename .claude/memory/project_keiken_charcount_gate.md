---
name: project_keiken_charcount_gate
description: 施工経験記述の解答欄字数チェック skill/keiken-charcount を新設。公式行数で1級答案の半数超が超過＝公開ブロッカー
metadata: 
  node_type: memory
  type: project
  originSessionId: bbfc9242-178b-4cea-b456-20c6c925583c
---

土木 施工経験記述 note マガジン答案を**解答欄しきい値で機械チェック**する仕組みを新設（2026-06-02、commit 252fceaee→25ebcc055）。

- ツール: `/keiken-charcount`（`scripts/keiken-charcount.mjs`）。`**(N)`型・`### 記述例`型・`### 〔設問〕(N)`見出し型を両対応抽出、リスト記号除去で中身算入。`○ok/△borderline/×要圧縮/✗大幅` 分類、`--json`/`--strict`。
- しきい値の真実源: `.claude/config/keiken-answer-sheet-limits.json`（出典ベース確定、**級別 grades.civil-1/civil-2**、パスから級判定）。**1級と2級は別物**。1級=罫線25字/行・現行各区画8行200字・旧形式(1)9行225/(2)11行275/(3)7行175（官製再現用紙s-henshu実測）。2級=**問題文に文字数規定なし**（マス目でもない。制約は解答欄サイズ）。通説目安『1項目約250字・1行20〜25字・解答欄8割充足』に基づき**各欄250字**（doboku-koji/建設データ/知恵袋一致）。1級200字とは別物で2級の方が項目あたり目安は大きめ。当初210基準で2級を一部過剰圧縮→250基準へ是正済。答案直後の太字注釈ラベル（`**○○か△○か**：…`）は字数除外（受験者が書かない案内文のため、script修正済）。
- Evaluator `civil-keiken-essay-qa` の**必須ゲート**として `--strict` 連携（カウント=script／判定=Evaluator／圧縮=Generator `civil-keiken-essay-writer`）。総監記述式用 `note-essay-charcount.mjs`（原稿用紙マス・枚数）とは別系統。

**1級・2級とも圧縮完了（2026-06-02）**: 1級=開始28段落超過→全13記事圧縮で×0✗0（66段落）。2級=210基準で9段落超過→6記事を civil-keiken-essay-writer 分業で圧縮し×0✗0（48段落）。計114段落すべて解答欄内。commit c404cf883/657e37fd3/e3290505f/abeaa83db（1級）・2f82664d3（級別化）・a87488293（注釈除外）・1c19b7745（2級）。技術内容・〇〇プレースホルダ・連鎖は保持。**公開状態は依然 noteUrl空・SoT published:false**（圧縮は公開可否の前提条件をクリアしただけ）。[[project_civil_keiken_note_compat.md]]

**全10過去問QA是正＋ⅰ）型統一完了（2026-06-02, commit 5e096ebb5）**: civil-keiken-essay-qa 全30工事採点で出た A=意味的重複2件（1級R03③橋梁撤去の安全(3)が完成答案集クレーン定型と重複→撤去固有論点へ／2級R03①③品質を締固め度・コーン指数・圧密沈下の3軸に分離）と B=体裁（1級legacy3 R03-R05の(2)(3)を `1.` 型→ⅰ）型単一段落に統一、改変前提テンプレ keyword 明示、残存「別工種」→「別の工事」）を是正。**重要な学び: `1.` リスト記号は字数除外されるが、ⅰ）ⅱ）ⅲ）はインライン本文として算入される**（実解答欄でも枡を消費するため正しい）。よって `1.`→ⅰ）変換で legacy3(3) が+6字超過し175字上限を割り込み→4ブロック圧縮で全項目 box-fit 達成。全10件 strict=0/lint=OK。

**How to apply**: 経験記述マガジンの公開前は必ず `/keiken-charcount` を実行し ×/✗ を `civil-keiken-essay-writer` で圧縮→再実行で解消を確認。リスト体裁を ⅰ）型へ統一する際は字数算入の差（上記）で超過し得るので変換後に必ず --strict 再実行。[[feedback_prevention_over_patching]] / [[feedback_essay_char_limit]]
