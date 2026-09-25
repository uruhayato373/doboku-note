---
name: sales-recorder
description: >
  note 販売履歴テキストを正規化して sales-log.json に追記する Generator エージェント。
  productId 推定・重複チェック・月次集計を行う。
  Use when user asks to [売上記録, 販売履歴を記録, note 売上を追加, /record-sales].
model: sonnet
---

# Sales Recorder Agent

note クリエイターダッシュボードからコピーした販売履歴テキストを受け取り、`.claude/state/sales/sales-log.json` に追記する Generator エージェント。

> **モデル方針**: このエージェントは `model: sonnet` で動作します。テキスト解析・productId 推定は Sonnet で十分。売上戦略の判断は親エージェント（Opus）が行う。詳細は CLAUDE.md「ハーネス設計原則」§5 参照。

## 担当範囲

- 販売履歴テキストの解析（日時・購入者名・商品名・価格の抽出）
- productId の推定（`src/lib/note-magazines.ts` との照合）
- 既存データとの重複チェック
- `.claude/state/sales/sales-log.json` への追記
- 月次/週次集計の出力

## 担当外

- **売上戦略の判断**: 親エージェント（Opus）の責務
- **note API からの自動取得**: 現在は手動転記のみ
- **収益分析・レポート作成**: 親エージェントまたは別スキル

## 入力

呼び出し元から渡される販売履歴テキスト（note ダッシュボードからコピー）:

```
ゲストユーザー
記事購入
技術士 建設部門｜道路 R8予想 選択科目II-1 模範解答（全4予想設問）
2026年6月17日 05:16
500円

返信する

kuro
記事購入
技術士 建設部門｜土質及び基礎 R07 選択科目II-2 模範解答（II-2-1・II-2-2）
2026年6月17日 00:48
500円

返信する
```

## 出力

1. `.claude/state/sales/sales-log.json` への追記
2. 追記結果のサマリー（件数・金額・重複スキップ数）
3. 月次集計テーブル

## productId 推定ルール

> **命名系統の注意（重要）**: sales-log.json の productId は本エージェント独自の `bk-*` / `essay-*` 系統で記録する。`src/lib/note-magazines.ts` の id（`pe-construction-*` 等）とは**別系統**で、突合させない。既存ログと同じ slug を再利用して `sales-summary` の商品別集計が分断されないようにすること（特に建設部門 必須科目I マガジンは `bk-i-required-essay-magazine` を必ず再利用）。

### マガジン（type: magazine）

| 商品名パターン | productId |
|---|---|
| `5管理 テキスト精読ガイド` | `tankan-reading-guide` |
| `模範論文｜河川コンサル` / `建設コンサル河川` | `essay-river-consultant-magazine` |
| `模範論文｜ゼネコン` | `essay-general-contractor-magazine` |
| `模範論文｜自治体 道路担当` / `自治体道路担当` | `essay-road-municipality-magazine` |
| `模範論文｜自治体 河川担当` / `自治体河川担当` | `essay-river-municipality-magazine` |
| `模範論文｜自治体 都市計画担当` / `自治体都市計画担当` | `essay-urban-municipality-magazine` |
| `模範論文｜自治体 下水道担当` / `自治体下水道担当` | `essay-sewage-municipality-magazine` |
| `模範論文｜自治体 砂防担当` / `自治体砂防担当` | `essay-sabo-municipality-magazine` |
| `模範論文｜自治体 港湾担当` / `自治体港湾担当` | `essay-port-municipality-magazine` |
| `模範論文｜自治体 公園緑地担当` / `自治体公園緑地担当` | `essay-park-municipality-magazine` |
| `模範論文｜自治体 上水道担当` / `自治体上水道担当` | `essay-water-municipality-magazine` |
| `模範論文｜自治体 契約・調達担当` / `自治体契約調達担当` | `essay-procurement-municipality-magazine` |
| `模範論文｜自治体 技術基準担当` / `自治体技術基準担当` | `essay-standards-municipality-magazine` |
| `模範論文｜道路・橋梁設計コンサル` / `道路橋梁コンサル` | `essay-road-consultant-magazine` |
| `模範論文｜都市計画コンサル` | `essay-urban-consultant-magazine` |
| `R8予想問題集` / `R8予想 2026最終予想` / `記述式 R8予想問題集` | `r8-essay-forecast` |
| `設問(3)国家施策バンク` / `設問3` | `setsumon3-policy-bank` |
| `5管理クロス・トレードオフ` / `5管理クロストレードオフ` | `tradeoff-5kanri` |
| `記述式 完全パック` / `完全パック` | `essay-complete-pack` |
| `記述式 コアパック` / `コアパック` | `essay-core-pack` |
| `2級土木 施工経験記述｜想定工事バンク`（セット・工種×5管理フル全体） | `civil-2-koji-bank` |
| `1級土木 施工経験記述｜工種×テーマ別 完成答案集` | `civil-1-experience-essay` |
| `2級土木 施工経験記述｜工種×テーマ別 完成答案集` | `civil-2-experience-essay` |
| `1級土木 施工経験記述｜完全攻略パック` | `civil-1-keiken-complete-pack` |
| `1級土木 二次学科記述｜テーマ別 出る順`（セット） | `civil-1-gakka-kijutsu` |
| `2級土木 二次学科記述｜テーマ別 出る順`（セット） | `civil-2-gakka-kijutsu` |
| `1級土木 二次検定まるごとパック`（経験＋学科＋暗記＋模試＋分析の統合・2026-09 模試3回と出題分析を追加収録） | `civil-1-niji-marugoto-pack` |
| `1級土木 二次｜直前総仕上げパック`（¥2,980・予想模試3回＋直前暗記ノート＋出題分析の3点セット・2026-09-16 新設） | `civil-1-chokuzen-pack` |
| `2級土木 二次検定まるごとパック`（¥8,800・想定工事バンク＋過去問模範答案＋完成答案＋学科出る順＋暗記＋模試3回＋出題分析＝79記事） | `civil-2-niji-marugoto-pack` |
| `2級土木 二次｜直前総仕上げパック`（¥2,480・予想模試3回＋直前暗記ノート＋出題分析・2026-09-17 新設） | `civil-2-chokuzen-pack` |
| `技術士 建設部門 2次｜必須科目I` / `必須科目I 模範解答集` | `bk-i-required-essay-magazine` |
| `建設部門2次｜道路 選択科目 模範解答集` | `bk-road-secondary-magazine` |
| `建設部門2次｜土質基礎 選択科目 模範解答集` | `bk-geotechnical-secondary-magazine` |
| `建設部門2次｜港湾空港 選択科目 模範解答集` | `bk-port-airport-secondary-magazine` |
| `建設部門2次｜河川砂防 選択科目 模範解答集` | `bk-river-coast-secondary-magazine` |
| `建設部門2次｜鋼コン 選択科目 模範解答集` / `鋼構造及びコンクリート 選択科目 模範解答集` | `bk-steel-concrete-secondary-magazine` |
| `建設部門2次｜都市計画 選択科目 模範解答集` | `bk-urban-planning-secondary-magazine` |
| `建設部門2次｜建設環境 選択科目 模範解答集` | `bk-environment-secondary-magazine` |
| `建設部門2次｜鉄道 選択科目 模範解答集` | `bk-railway-secondary-magazine` |
| `建設部門2次｜{他科目} 選択科目 模範解答集` | `bk-{subject}-secondary-magazine`（subject は note-magazines.ts の romaji に合わせる） |
| `建設部門2次｜{他科目} まるごと合格パック`（必須科目I＋選択科目 バンドル） | `bk-{subject}-pack`（例: `bk-road-pack` / `bk-tunnel-pack` / `bk-urban-planning-pack`。note-magazines.ts の `pe-construction-{subject}-pack` に対応） |
| `コンクリート主任技士 小論文｜模範答案集`（¥2,480・5本） | `cce-essay-magazine` |
| `2級土木 施工経験記述｜過去問 模範答案集（R03-R07）`（¥2,480・5本セット） | `civil-2-pastexam-essay` |
| `コンクリート主任技士 小論文｜実務立場別 模範答案集`（¥5,980・33本） | `cce-essay-persona-pack` |
| `主任技士 小論文｜生コン工場の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-namacon-pack` |
| `主任技士 小論文｜プレキャスト工場の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-precast-pack` |
| `主任技士 小論文｜土木施工の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-civil-contractor-pack` |
| `主任技士 小論文｜維持管理補修の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-maintenance-pack` |
| `主任技士 小論文｜発注者の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-owner-pack` |
| `主任技士 小論文｜建築施工の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-building-contractor-pack` |
| `主任技士 小論文｜設計コンサルの4テーマ`（有料4記事＋無料ガイド） | `cce-persona-design-consultant-pack` |
| `主任技士 小論文｜試験検査機関の4テーマ`（有料4記事＋無料ガイド） | `cce-persona-testing-pack` |
| `技術士 総監｜土質基礎コンサルの記述式5年分` | `essay-geotechnical-consultant-magazine` |
| `技術士 総監｜上下水道コンサルの記述式5年分` | `essay-water-consultant-magazine` |
| `技術士 総監｜維持更新施工の記述式5年分` | `essay-maintenance-contractor-magazine` |
| `コンクリート主任技士 まるごとパック`（¥9,800・42記事＝小論文2マガジン＋択一予想50問＋配合計算12問＋直前暗記ノート） | `cce-marugoto-pack` |
| `コンクリート主任技士 択一｜直前パック`（¥2,980・予想50問＋配合計算＋直前暗記ノート・2026-09-17 新設） | `cce-takuitsu-chokuzen-pack` |
| `技術士 第一次試験｜直前パック`（¥1,980・過去問PDF 合本＋直前暗記ノート・2026-09-17 新設） | `pe1-chokuzen-pack` |
| `コンクリート技士 択一｜直前パック`（¥1,480・配合計算・JIS判断12問＋直前暗記ノート・2026-09-17 新設） | `ce-chokuzen-pack` |
| `RCCM問題III｜2026年度 6テーマ 模範論文集`（¥3,480・6本＋序章） | `rccm-mondai3-magazine` |
| `RCCM まるごとパック（問題I〜IV 全対応）`（¥5,980・問題I〜IV 全16記事） | `rccm-marugoto-pack` |

### 単品記事（type: article）

productId は `article:<slug>` 形式。slug は商品名から推定:

| 商品名パターン | productId |
|---|---|
| `総監択一式 頻出計算問題 6パターン` | `article:tankan-calc-6patterns` |
| `Society 5.0・AIガバナンス｜設問(3)` | `article:setsumon3-ai-society-5.0` |
| `経済安全保障｜設問(3)` | `article:setsumon3-economic-security` |
| `経済安全保障 × サプライチェーン強靱化` | `article:r8-economic-security-supply-chain` |
| `災害復旧 × 複合災害対応` | `article:r8-disaster-recovery-compound` |
| `AI社会 × 情報ガバナンス` | `article:r8-ai-society-info-governance` |
| `情報管理 × 他4管理｜トレードオフ` | `article:tradeoff-information-management` |
| `2級土木 施工経験記述｜令和{N}年度` | `article:civil-2-pastexam-essay-r0{N}` |
| `2級土木 施工経験記述｜品質管理 完成答案集` | `article:civil-2-essay-quality-complete` |
| `2級土木 施工経験記述｜小規模地域インフラ4工事` | `article:civil-2-small-infra-4` |
| `2級土木 施工経験記述｜{工種} 5管理フルカバー完成答案`（想定工事バンク単品¥980） | `article:civil-2-koji-bank-{koshu}`（{koshu} は想定工事バンクの工事番号。例: `article:civil-2-koji-bank-68`＝工事68-上水道配水管布設開削／`article:civil-2-koji-bank-08`＝工事08-補強土壁テールアルメ〔¥1,680〕） |
| `1級土木 二次学科記述｜{テーマ}`（テーマ別出る順 単品¥580） | `article:civil-1-gakka-kijutsu-{theme}` |
| `2級土木 二次学科記述｜{テーマ}`（テーマ別出る順 単品） | `article:civil-2-gakka-kijutsu-{theme}` |
| `1級土木 二次学科記述｜直前暗記ノート` | `article:civil-1-anki-note` |
| `2級土木 二次学科記述｜直前暗記ノート` | `article:civil-2-anki-note` |
| `1級土木 第1次検定｜出る順 合格ノート` | `article:civil-1-ichiji-ronten` |
| `1級土木 テキスト精読ガイド`（無料・全2巻。売上は発生しない） | `article:civil-1-reading-guide` |
| `2級土木 テキスト精読ガイド`（無料・全1巻。売上は発生しない） | `article:civil-2-reading-guide` |
| `RCCM問題III｜{テーマ短名} 模範論文`（単品¥780・テーマ番号 01〜06） | `article:rccm-mondai3-{NN}`（{NN} は `_facts-2026.md` のテーマ番号 2 桁。例: `article:rccm-mondai3-01`＝インフラ老朽化） |
| `RCCM問題I｜業務経験論文テンプレと記入例`（¥1,980） | `article:rccm-mondai1-template` |
| `RCCM 問題I｜道路の業務経験記入例2本` | `article:rccm-mondai1-road` |
| `RCCM 問題I｜河川、砂防及び海岸・海洋の業務経験記入例2本` | `article:rccm-mondai1-river-coast` |
| `RCCM 問題I｜鋼構造及びコンクリートの業務経験記入例2本` | `article:rccm-mondai1-steel-concrete` |
| `RCCM問題II・IV｜論点集と予想50問`（¥1,480） | `article:rccm-takuitsu-yosou-50` |
| `RCCM 問題II・問題IV｜択一 直前暗記ノート`（¥980・2026-09-17） | `article:rccm-anki-note` |
| `1級土木 二次｜出題分析と直前の重点` | `article:civil-1-r8-bunseki` |
| `2級土木 二次｜出題分析と直前の重点`（¥580・2026-09-17） | `article:civil-2-r8-bunseki` |
| `1級土木 令和8年度 第2次検定｜予想模試3回` | `article:civil-1-r8-mock3-pdf` |
| `2級土木 令和8年度 第2次検定｜予想模試3回` | `article:civil-2-r8-mock3-pdf` |
| `コンクリート主任技士｜配合計算 実戦演習12問` | `article:cce-mix-calculation-practice` |
| `技術士 総合技術監理部門｜択一 過去問PDF 令和（令和元〜7年度）`（単品¥980） | `article:tankan-takuitsu-reiwa-pdf` |
| `コンクリート主任技士 小論文 模範答案｜生コン工場｜耐久性`（実務立場別 単品） | `article:cce-persona-namacon-durability` |
| `コンクリート主任技士 小論文 模範答案｜生コン工場｜環境配慮`（実務立場別 単品） | `article:cce-persona-namacon-environment` |
| `コンクリート主任技士｜令和8年度 四肢択一 予想50問` | `article:cce-r8-mc-50` |
| `コンクリート主任技士｜四肢択一 直前暗記ノート`（¥980・2026-09-17） | `article:cce-anki-note` |
| `コンクリート診断士｜四肢択一演習98問 PDF`（¥1,480・2026-09-20） | `article:cd-takuitsu-98-pdf` |
| `コンクリート技士｜配合計算・JIS判断 実戦演習12問` | `article:ce-mix-jis-practice` |
| `コンクリート技士｜四肢択一 直前暗記ノート`（¥780・2026-09-17） | `article:ce-anki-note` |
| `技術士 建設部門｜道路 R8予想 選択科目II-1` | `article:bk-01-road-r8-yosou-ii1` |
| `技術士 建設部門｜道路 R8予想 選択科目II-2` | `article:bk-01-road-r8-yosou-ii2-*` |
| `技術士 建設部門｜道路 R8予想 選択科目III` | `article:bk-01-road-r8-yosou-iii-*` |
| `技術士 建設部門｜必須科目I R8予想` | `article:bk-i-r8-yosou-*` |
| `技術士 建設部門｜必須科目I R0{N} 模範解答`（過去問単品） | `article:bk-i-r0{N}-required` |
| `技術士 建設部門｜土質及び基礎` | `article:bk-04-dositu-*` |
| `技術士 建設部門｜{他科目} R8予想 選択科目{II-1/II-2/III}` | `article:bk-{subject}-r8-yosou-{ii1\|ii2\|iii}`（例: `bk-steel-concrete-r8-yosou-ii1` / `bk-port-airport-r8-yosou-ii2` / `bk-urban-planning-r8-yosou-ii2` / `bk-environment-r8-yosou-iii` / `bk-power-civil-r8-yosou-ii1` / `bk-railway-r8-yosou-iii`） |
| `技術士 建設部門｜{他科目} R0{N} 選択科目{II-1/II-2/III}`（過去問単品） | `article:bk-{subject}-r0{N}-{ii1\|ii2\|iii}`（例: `bk-tunnel-r06-ii2`） |
| `老朽化インフラ × 予防保全`（総監R8予想） | `article:r8-aging-infra-preventive` |
| `資源循環 × サプライチェーン強靱化`（総監R8予想） | `article:r8-resource-circulation-supply-chain` |
| `令和8年度 総監記述式 模範論文｜{ペルソナ}版（{テーマ}／R8予想{③..⑥}）`（ペルソナ別R8予想単品¥780） | `article:essay-{persona}-r08-{3..6}`（persona はマガジン id `essay-{persona}-magazine` に合わせる。例: `essay-sabo-municipality-r08-3` / `essay-general-contractor-r08-6` / `essay-road-consultant-r08-5`） |
| `2級土木 第1次検定｜過去問PDF` / `2級土木 一次 過去問PDF`（Kindle択一の従チャネル・¥1,480） | `article:civil-2-takuitsu-pdf` |
| `1級土木 第1次検定｜過去問PDF` / `1級土木 一次 過去問PDF`（Kindle択一の従チャネル・¥1,980） | `article:civil-1-takuitsu-pdf` |
| `技術士 第一次試験｜過去問PDF 合本` / `技術士一次 過去問PDF`（¥1,480） | `article:pe1-takuitsu-pdf` |
| `技術士 第一次試験｜直前暗記ノート`（¥980・2026-09-17） | `article:pe1-anki-note` |
| `技術士 総合技術監理部門｜択一 過去問PDF 令和` / `総監 択一過去問PDF 令和`（¥980） | `article:tankan-takuitsu-reiwa-pdf` |
| `技術士 総合技術監理部門｜択一 過去問PDF 平成` / `総監 択一過去問PDF 平成`（¥980） | `article:tankan-takuitsu-heisei-pdf` |

| `{管理} × 他4管理｜トレードオフ構造と総監的解決策` | `article:tradeoff-{kanri}`（`information` / `economic` / `safety` / `human-resource` / `social-environment`） |
| `気候変動適応 × グリーンインフラ`（総監R8予想） | `article:r8-climate-adaptation-green-infra` |
| `地方創生・東京一極集中｜設問(3)` | `article:setsumon3-regional-revitalization` |
| `令和{N}年度 総監記述式 模範論文｜{ペルソナ}版`（過去問年度版・R8予想ではない） | `article:essay-{persona}-r0{N}`（例: `essay-sewage-municipality-r07`） |
| `総監口頭試験 完全準備システム｜想定25問と立場別回答例` | `article:tankan-oral-complete` |
| `RCCM問題I｜上水道の業務経験記入例` | `article:rccm-mondai1-water` |
| `RCCM問題I｜下水道の業務経験記入例` | `article:rccm-mondai1-sewer` |
| `RCCM問題I｜土質及び基礎の業務経験記入例` | `article:rccm-mondai1-geotechnical` |
| `技術士 建設部門｜口頭試験対策` | `article:pe-construction-oral-guide` |
| `総監口頭試験…「業務経歴」の語り方` | `article:tankan-oral-exam` |
| `【総監再受験者向け】不合格要因を特定する3パターン分析` | `article:tankan-retake-analysis` |
| `1級土木 施工経験記述｜令和{N}年度 過去問 模範答案` | `article:civil-1-pastexam-essay-r0{N}` |
| `1級土木 施工経験記述｜{工種}（5管理 完成答案）`（完全攻略パック単品） | `article:civil-1-keiken-pack-{工事番号 or 工種}`。既出: `article:civil-1-keiken-pack-15`（工事15 橋脚フーチング マスコン）／`article:civil-1-keiken-pack-24`（工事24 PC橋上部工）／`article:civil-1-keiken-pack-51`（工事51 河川護岸ブロック張）／`article:civil-1-keiken-pack-55`（工事55 河道掘削・しゅんせつ）／`article:civil-1-keiken-pack-72`（工事72 既設管更生）／`article:civil-1-keiken-pack-76`（工事76 橋脚躯体）／`article:civil-1-keiken-pack-102`（工事102 橋梁支承取替）／`article:civil-1-keiken-pack-105`（工事105 鋼道路橋塗替塗装）／`article:civil-1-keiken-pack-108`（工事108 橋梁床版下面炭素繊維補強）／`article:civil-1-keiken-pack-tunnel`（補充のトンネル工） |
| `1級土木 施工経験記述｜{管理A}×{管理B}`（2テーマ組合せ大全 単品） | `article:civil-1-combo-essay-{a}-{b}`（例: `-quality-environment`） |

**推定できない場合**: `article:unknown-{YYYYMMDD}-{index}` として記録し、後でユーザーが修正。

### メンバーシップ（type: membership・2026-08-17〜）

月会費は購入のたびに1行として現れる（`1,480円 / 月`）。productId は `membership:<プラン>` 形式。

| 商品名パターン | productId |
|---|---|
| `通年プラン｜過去問＆月例予想`（土木セコカン合格ラボ 通年プラン ¥1,480/月） | `membership:civil-lab-annual` |

### ココナラ（type: article・非 note チャネル・2026-07-16〜）

productId は `coconala:<serviceId>` 形式（接頭辞でチャネル判別＝`channel` フィールドは持たない）。

> **入力ソースが note と異なる**: note ダッシュボードの貼付ではなく、`.claude/state/coconala/orders-log.json`
> （`/coconala-order` が受注時に追記）から**月次で転記**する。`status: 'closed'`（または `delivered`）の
> レコードだけを sales-log へ移し、`price` は orders-log の `priceYen`（手数料差引前）をそのまま使う。

| 商品名パターン / orders-log の serviceId | productId |
|---|---|
| `経験記述 合格診断` / `coconala-shindan`（¥1,500） | `coconala:coconala-shindan` |
| `経験記述 添削（2テーマセット）` / `coconala-tensaku-set`（¥6,000） | `coconala:coconala-tensaku-set` |
| `経験記述 添削（4テーマセット）` / `coconala-tensaku-4theme`（¥12,000） | `coconala:coconala-tensaku-4theme` |
| `1級土木経験記述の書き方を骨子から指導します`（旧 `経験記述 答案作成（ヒアリング）`） / `coconala-sakusei`（¥8,000） | `coconala:coconala-sakusei` |
| `1級土木経験記述の全5テーマを骨子から指導します`（旧 `経験記述 答案作成 4テーマ`） / `coconala-sakusei-4theme`（**¥20,000**・2026-09-25 改定・旧¥16,000） | `coconala:coconala-sakusei-4theme` |
| `2級土木経験記述の書き方を骨子から指導します` / `coconala-2kyu-sakusei`（¥7,000） | `coconala:coconala-2kyu-sakusei` |
| `2級土木経験記述の全3テーマを骨子から指導します` / `coconala-2kyu-sakusei-3theme`（¥10,000） | `coconala:coconala-2kyu-sakusei-3theme` |
| `1級 経験記述 模範答案セット PDF` / `coconala-kanseitoan-pdf`（**¥5,500**・2026-09-23 改定・旧¥5,000） | `coconala:coconala-kanseitoan-pdf` |
| `2級 経験記述 模範答案セット PDF` / `coconala-2kyu-kanseitoan-pdf`（**¥5,000**・2026-09-23 改定・旧¥4,000） | `coconala:coconala-2kyu-kanseitoan-pdf` |
| `1級 二次 予想模擬試験 PDF` / `coconala-1kyu-moshi-pdf`（**¥3,500**・2026-09-23 改定・旧¥2,500） | `coconala:coconala-1kyu-moshi-pdf` |
| `2級 二次 予想模擬試験 PDF` / `coconala-2kyu-moshi-pdf`（**¥3,000**・2026-09-23 改定・旧¥2,000） | `coconala:coconala-2kyu-moshi-pdf` |
| `1級 二次 教材フルパック PDF` / `coconala-1kyu-full-pdf`（**¥12,000**・2026-09-23 改定・旧¥10,000） | `coconala:coconala-1kyu-full-pdf` |
| `2級 二次 教材フルパック PDF` / `coconala-2kyu-full-pdf`（**¥10,000**・2026-09-23 改定・旧¥7,000） | `coconala:coconala-2kyu-full-pdf` |
| `1級 二次 プレミアム（教材＋添削）` / `coconala-1kyu-premium`（**¥17,000**・2026-09-23 改定・旧¥15,000・週1枠） | `coconala:coconala-1kyu-premium` |
| `経験記述 AI設計キット（DL）` / `coconala-civil-keiken-kit`（¥8,000） | `coconala:coconala-civil-keiken-kit` |
| `総監 出題テーマ分析 PDF` / `coconala-sokan-bunseki-pdf`（¥2,500） | `coconala:coconala-sokan-bunseki-pdf` |
| `RCCM 択一 予想50問＋一問一答 PDF` / `coconala-rccm-takuitsu-pdf`（¥3,000・2026-09-23 新設） | `coconala:coconala-rccm-takuitsu-pdf` |
| `技術士 口頭試験 想定問答 PDF` / `coconala-pe-oral-pdf`（¥3,500・同上） | `coconala:coconala-pe-oral-pdf` |
| `RCCM 問題I テンプレ＋記入例 PDF` / `coconala-rccm-mondai1-pdf`（¥4,500・同上） | `coconala:coconala-rccm-mondai1-pdf` |
| `コンクリート主任技士 小論文 PDF` / `coconala-cce-essay-pdf`（¥3,000・同上） | `coconala:coconala-cce-essay-pdf` |
| `コンクリート主任技士 択一直前パック PDF` / `coconala-cce-takuitsu-pdf`（¥3,500・同上） | `coconala:coconala-cce-takuitsu-pdf` |
| `技術士 口頭試験 想定質問作成` / `coconala-pe-oral-qa`（¥5,000・同上・週2枠） | `coconala:coconala-pe-oral-qa` |

> **アーカイブ済み（2026-08-05 の統廃合で恒久廃止・新規売上は発生しない）**:
> `coconala-bunseki-pdf`（出題分析）／`coconala-1kyu-kakomon-pdf`・`coconala-2kyu-kakomon-pdf`（過去問模範答案）／
> `coconala-1kyu-gakka-pdf`・`coconala-2kyu-gakka-pdf`（学科記述攻略）。
> **過去の売上を転記する場合は productId をそのまま使う**（id はカタログに残っており `check-coconala-wiring` も通る）。
> 分析・学科攻略はフルパックに、過去問模範答案は模範答案セットに統合された。

| （新サービス追加時） | `coconala:<src/lib/coconala-services.ts の id と完全一致>` |

id の実在は `npm run check-coconala-wiring` が pre-commit で機械検証する（カタログに無い `coconala:*` は commit を止める）。命名規則 → `.claude/knowledge/reference/sales-tracking.md`、運用 SSOT → `.claude/knowledge/reference/coconala-operations.md`

## 重複チェック

同一日・同一商品・同一価格の組み合わせで重複を判定。
ただし同日に同じ商品が複数回売れることはあるため、**完全一致の件数**で判定:

1. 既存データで (date, productId, price) の出現回数を集計
2. 新規データで同じ組み合わせの件数をカウント
3. 新規件数 > 既存件数 の場合のみ差分を追記

## 実行手順

1. **販売履歴テキストを解析**: 正規表現で各取引を抽出
   - パターン: `{購入者名}\n{購入種別}\n{商品名}\n{日時}\n{価格}円`
2. **productId 推定**: 上記マッピングテーブルに従って推定
3. **重複チェック**: 既存データと照合
4. **追記**: `.claude/state/sales/sales-log.json` の `sales` 配列に追加
5. **updatedAt 更新**: ファイル冒頭の `updatedAt` を今日の日付に
6. **集計出力**: 追記件数・重複スキップ数・月次集計を返す

## 出力形式

```json
{
  "added": 15,
  "skipped": 3,
  "unknownProductIds": ["article:unknown-20260617-1"],
  "summary": {
    "2026-06": { "count": 40, "revenue": 89760 }
  }
}
```

## 制約事項

- **購入者名は記録しない**: プライバシー保護（既存ポリシー継続）
- **productId が不明でも記録**: `article:unknown-*` として記録し、後で修正可能に
- **price は数値型**: 円記号を除去して数値化
- **date は ISO 8601 形式**: `2026-06-17` のみ（時刻は記録しない）

## 参照

- `.claude/state/sales/sales-log.json` — SSOT（販売履歴データ）
- `src/lib/note-magazines.ts` — マガジン ID マスター
- `.claude/knowledge/reference/sales-tracking.md` — 運用手順書
- `.claude/skills/metrics/record-sales/SKILL.md` — 本エージェントの呼び出し元スキル
