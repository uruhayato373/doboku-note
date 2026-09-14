---
name: project_civil1_combo_essay
description: 1級土木 経験記述「2テーマ組合せ大全」新設（予想問題集を転換、全10組合せ×工事①②③＝30答案）。SoT=civil-1-combo-essay
metadata: 
  node_type: memory
  type: project
  originSessionId: bbfc9242-178b-4cea-b456-20c6c925583c
---

1級土木 施工経験記述の新マガジン **「2テーマ組合せ大全」** を新設（2026-06-02）。`docs/note/1級土木/magazines/1級土木-施工経験記述-2テーマ組合せ大全/`。

**設計判断（ユーザー提案）**: 予想問題集（civil-1-yosou-essay＝条件提示型/日常業務。**出題実績のない投機**）を転換。R06以降の実形式＝「5管理から2テーマが選ばれ同一工事で設問1・設問2を書き分け（同一内容不可）」に対し、**C(5,2)=10組合せ全網羅 × 想定工事①②③＝30答案**。投機でなく現行形式の全網羅（的中・不的中の概念がない）。10組合せ: 品質×{安全/工程/施工計画/環境}、安全×{工程/施工計画/環境}、工程×{施工計画/環境}、施工計画×環境。dir slug は `品質x安全` 等（ASCII x）。

**生成**: `civil-keiken-essay-writer` を組合せごと（3バッチ＝3+4+3）で起動。各エージェントに「組合せ・想定工事①②③割当・使用済み工事リスト（重複回避）」を明示指定。全30答案 keiken-charcount --strict=0 / note-lint OK。**答案レベル重複（ⅰ）行セグメント）= 新×既存0・新×新0**。工事割当の真実源は同dir `_企画.md`（10組合せ×工事マトリクス）。

**QA（全10記事採点済・全合格、2026-06-02）**: civil-keiken-essay-qa で全10記事採点。当初**2記事不合格**（意味的重複＝逐語スキャン不可）: 品質×安全（①PC品質≈品質×工程③／②マスコン品質≈品質×環境①／③酸欠安全≈完成答案集シールド）・工程×環境（③造成工程が**完成答案集と実質一致**＝Red Line #4）。→ **差別化再生成で解消**（品質×安全 2.6→2.8＝床版/重力式擁壁/推進・酸欠廃止、工程×環境 2.6→3.0＝舗装サイクル/造成シフト計画、commit 0cd175815）。**最終: 全10記事 平均2.8-3.0 合格**。残る軽微（pass内・任意）: 品質×施工計画の工法比較が薄い／品質×安全③が安全×工程②と土留め論点近接。**教訓: ⅰ）行の逐語重複が0でも、同じ品質角度（PC・マスコン）や工程レバー（土積図・出来高曲線）を別組合せで使うと意味的重複になる→量産時は工事だけでなく品質角度/工程レバーも台帳管理し、最終QAは代表記事でなく全記事必須**。

**配線済**: 導線10件統一（自=公開前プレースホルダ＋過去問[[m3a578194a0a9]]・完成[[m150c9db08902]]への相互リンクカード）。hashtags.txt 10件（88-90個・1行1タグ）。SoT `note-magazines.ts` に `civil-1-combo-essay`（published:false・¥3,980/10本34%OFF・カバー未生成）。`civil-1-yosou-essay` は superseded 表記（原稿は archive 残置）。

**配線完了（2026-06-02）**: カバー生成済（civil-1-combo-essay-cover.{png,webp}＋_cover.png、generate-magazine-covers.mjs id=civil-1-combo）。magazine-placement.ts の1級経験記述スロットを yosou→combo へ置換済。

**予想問題集 civil-1-yosou-essay は完全退役済（commit 935883b3f）**: 原稿dir・SoTエントリ・placement・cover spec・pdf-spec を削除。理由＝出題実績のない投機。combo が現行形式を全網羅するため。

**未完（次にやる）**: ①note 実公開→ `note-magazines.ts` を published:true＋noteUrl（マガジン m/ ＆各記事 n/）。`_meta.yaml` にも反映 ②任意: QA軽微2件の磨き（安全×施工計画②③に工法比較／ダム・樋門の濁水処理フレーム差別化）③任意: combo の pdf-spec 新規作成（紙用、オンデマンド）。関連 [[project_keiken_charcount_gate]] [[project_civil_keiken_note_compat]]。
