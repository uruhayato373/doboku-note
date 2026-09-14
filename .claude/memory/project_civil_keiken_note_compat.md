---
name: project_civil_keiken_note_compat
description: 1級(14)・2級(11) 土木 施工経験記述 note を note 互換化＋カバー完了。変換器 .tmp/note-compat-keiken.mjs 再利用可
metadata: 
  node_type: memory
  type: project
  originSessionId: 6c61979d-9550-4f91-8b80-7b6b87ada030
---

1級土木 施工経験記述 note ライン（`docs/note/1級土木/`、3マガジン+AI勉強の全14記事）を **2026-06-02 に note 公開可能化完了**（commit b1dcb5099, develop）。それまで全14記事が note-lint をブロックされていた（markdown表293行＋太字内全角括弧、計308件）。

**実施内容**:
- markdown pipe表を箇条書き化（工事概要=2列→`- **項目**：値` / 置換ガイド=3列→`- **要素**：本答案 → 自分の現場`）。note は表を描画しないため必須。
- 太字内全角括弧 Pattern A を `**A**（B）` へ外出し（`**想定災害（1つ）**`→`**想定災害**（1つ）`）。
- カバー未生成だった過去問模範答案集 R03-R07＋予想問題集3記事に G2 カバー追加・生成（civil-1=青/paid→deep）。完成答案集5＋AI勉強1は既存G2。
- 内容（数値・`〇〇`記入プレースホルダ・文章）は無改変、構造のみ。`〇〇` は34行目等で「自分の現場の値に差し替える」と明示する正当な改変前提テンプレ（note-lint 対象外）。

**判定基準**: note 公開ゲート = `node scripts/note-lint.mjs <dir or files>`（pipe表・太字内全角括弧 U+FFFD を BLOCK、pre-commit 連動。検査対象は `*/article.md` のみで企画メモ `*プラン.md` は対象外）。太字括弧の真判定は `.claude/scripts/check-note-bold-paren.mjs`（stateful、`**`境界でON/OFF）。

**再利用可能な変換器**: `.tmp/note-compat-keiken.mjs`（frontmatter保護・EOL検出保存・表→箇条書き・太字括弧外出し、決定論的で内容無改変）。`node .tmp/note-compat-keiken.mjs $(find <dir> -name article.md)`。

**2級土木も完了（2026-06-02, commit は1級 b1dcb5099 の次）**: 全11記事（過去問模範答案集 R03-R07／完成答案集3／予想問題集3=条件提示型・新項目環境出来形・日常業務記述）。168件の非互換を同変換器で解消し note-lint OK。カバー欠落8本（過去問5＋予想3）に G2 追加（civil-2=緑/deep）、完成答案集3は既存G2。

**過去問の解答密度（2026-06-02 強化, commit d1e6648c4）**: 2級過去問は選択制（2テーマから選ぶ）の R03-R05 で、従来はフル答案1テーマ＋もう一方は早見1段落だった。もう一方も同一工事でフル答案（設問2の3項目）に格上げし、各記事=選べる2テーマ両方のフル答案（解答数1→2、約2,700→3,300字）。同一工事に両テーマを書く構成で工種軸の完成答案集と非競合。R06/R07 は元から2テーマ必答で対象外。**1級はテーマ固定（選択肢なし）のため「想定工事②＝別工種のフル答案」を全5年に追加（2026-06-02, commit e2fcf4e53）**：R03安全=橋梁下部工(高所墜落)、R04安全=河川護岸築堤(出水/水難)、R05品質=場所打ちマスコン(温度ひび割れ)、R06安全+施工計画=軟弱地盤盛土(サンドドレーン/段階載荷/動態観測)、R07品質+環境=宅地造成土工(締固め/濁水・発生土)。各記事 約2,800→4,000〜4,600字。過去問と完成答案集は工種が元々分かれていたので（完成=シールド/橋梁架設/場所打ち杭/高盛土/造成/山岳トンネル/市街地騒音/河川濁水/既設近接/河川仮締切）、別工種を選び重複回避。civil-keiken-essay-writer 5体で並行執筆＋親が体裁/論点分離/非重複を検証。2級過去問は選択制ゆえ「両テーマ化」で対応済み（上記）。

**未対応（次にやる）**:
1. 1級2級とも各マガジンは `note-magazines.ts` で published:false / noteUrl 空。note.com で実公開→URL取得→ts反映 はユーザー操作。マガジンカバー（magazine-banner, generate-magazine-covers.mjs）も別途。

注意: `generate-note-covers.mjs <slug>` は部分一致のため「過去問模範答案集」だと2級分も巻き込む。dir 指定で限定するか生成後の git status で stray を確認 [[feedback_git_add_verify_staged]]。総監模範論文の note 互換は別系統で対応済 [[project_note_magazine_cleanup]]。関連 [[project_civil2_keiken_essay_line]] [[project_note_cover_g2]]
