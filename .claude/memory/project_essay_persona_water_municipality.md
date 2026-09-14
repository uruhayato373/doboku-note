---
name: project_essay_persona_water_municipality
description: 総監模範論文 自治体・発注者・真正の10ペルソナ(河川/都市計画/下水道/上水道/港湾/砂防/公園緑地/農業農村/技術基準/契約調達)を新標準で公開品質化完了(2026-06-10)。建築営繕＋アセマネは不採用/廃止削除。横展開ワークフローは完全ツール化済
metadata: 
  node_type: memory
  type: project
  originSessionId: 2b549401-7f9e-4686-a8ee-d4e93b588727
---

総監模範論文 自治体上水道担当ペルソナを公開品質化完了（2026-06-09, commit 72804d94a→push 697ea0d14, published:false 維持）。

**実施**: R08-yosou を予想問題ごと R08-yosou-1（気候変動適応・強靭化）/-2（資源循環・サプライチェーン強靭化）へ2記事化し、各テーマに欠けていた案（気候変動のB案・資源循環のA案）を新規生成。設問(2)(3)を ### 施策単位の散文へ再構造化（各≤600字）。R03/R05/R06/R07 の600字超過を圧縮サブエージェント4本で解消、R04 導入部 である調→ですます。全7記事に per-article カバー/hashtags(92-94)/印刷用PDF生成、_meta(計7・¥3,500・29%OFF)・pdf-spec・note-magazines.ts description 更新。

**ゲート**: charcount 600字超過0・文体混在0・U+FFFD0、見出し構造OK、note-lint 7記事OK。**散文性は `答案箇条書き(全体)=0` かつ `箇条書き混入=0` が必須**（手本は河川/下水道/都市計画。道路は箇条書き38で非散文＝基準にしない）。**R05のSWOT戦略 設問(3)「障害と克服策」を `- **障害**:`/`- **克服策**:` 箇条書きにしがち→河川R05と同じ1段落散文へ統合する**（2026-06-10 ユーザー指摘で全8ペルソナR05を散文化是正）。

**横展開ワークフローは完全ツール化済**（真実源 docs/reference/note-essay-review-checklist.md Step0-6e）: 圧縮はサブエージェント並列、設問書式は自ペルソナ R06形式（## A 案 設問／### 施策／**内容**:散文）が手本（下水道R08-1も可）、導入部分割は scripts/split-essay-intro-paragraphs.mjs、カバーは generate-note-covers.mjs <ペルソナ名> + generate-magazine-covers.mjs、hashtagsは参照ペルソナからブロック差替、PDFは magazine-to-pdf.mjs --spec ... --in-place。

**全ペルソナ品質化完了（2026-06-10）**: 自治体・発注者・真正の10ペルソナが新標準で完成。河川/都市計画/下水道/上水道/港湾に加え、砂防(05e55014a)・公園緑地(99263ded5)・農業農村(6cf0f4b9e)・技術基準(1f58533fb)・契約調達(340c42d26) を順次フル工程で品質化（各 R08二記事化＋圧縮＋de-blockquote＋R04文体＋hashtags/cover/PDF/footer/掲載文.txt/_meta廃止/note-magazines price、全ゲートGREEN）。**建築営繕は建築職領域で著者の経験座外につき不採用・削除（eb51f1388）**。**アセットマネジメント担当は2026-06-11 廃止削除（eff5266c1）＝道路担当A案=橋梁長寿命化と論点・トレードオフ軸が重複＋独自B案の公共施設等総合管理計画=庁舎/学校再編が建築営繕領域に抵触。新ペルソナ追加時は既存とのA/B案重複・経験座抵触を着手前にチェック**。公開登録済=技術基準(mf9f281e2cb32)・契約調達(m55b930cbfcf9)。残=各ペルソナの note 実公開＋URL反映（user側、inject-magazine-url.cjs）＋published:true化。道路はR08旧式のまま公開済（移行はコスト判断で保留）。受注者系（ゼネコン/コンサル）は判断保留。工程SoT＝docs/reference/note-essay-review-checklist.md Step 0〜6f。専門分野ラベルは横断役割（技術基準/契約調達/アセマネ/公園緑地/農業農村）は選択科目名を付けず役割ベース一般化。

**注意**: 圧縮サブエージェントは会社PCプロキシで407/socket切れ頻発も編集は完了することが多い→失敗報告でなくゲート実測で残作業確認。コミットは並行セッション稼働中につき pathspec 限定必須。
