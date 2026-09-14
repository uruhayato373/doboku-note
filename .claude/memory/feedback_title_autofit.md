---
name: feedback_title_autofit
description: 大型タイトルの不適切改行は段階フォント auto-fit で構造的に解消する（文字数制限の意味希薄化を避ける）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5fec0808-9f01-44eb-b55a-39b94a725764
---

PNG/SVG の大型タイトル（過去問 cover 156px、Stories ハイライト hero 132px）で文字数超過による不適切な改行（「ここでわかるこ／と」等）が頻発する課題への確定対策。

**ルール**: 大型タイトルは固定フォントサイズではなく **段階フォント auto-fit** で実装する。

**Why:** ユーザー指摘「不適切な改行は他の PNG/SVG でも繰り返される課題。文字数制限すると意味が希薄化（『ここでわかること』→『わかること』）、フォント縮小すると視覚バランスが崩れる、というジレンマがある」。両方を段階分けで吸収する。

**How to apply:**
- 共通 util `.claude/scripts/lib/sns-common/fit-title.mjs` を使う（`visualLength`: 全角=1.0/半角=0.55、`pickTitleSize`: 3 階層自動選択、`classifyTitle`: OK/WARN/NOTICE/ERROR）
- tokens.json に hero/heroMid/heroSm（132/100/80）+ coverTitle/Mid/Sm（120/90/72）の 3 階層を `_maxLen` 付きで定義
- builder（highlight-stories-slides.mjs / quiz-slides.mjs）が title の visualLength で自動選択
- 字数判定 4 段階: OK(<=7) / WARN(8-11) / NOTICE(12-16) / ERROR(17+)
- 機械検証 `.claude/scripts/lint-stories-titles.mjs` で全 slide-data.json をスキャン

**エージェント分業との関係**: Generator は推奨字数（4-7）を目指すが 8-11 も許容（意味が崩れない短縮を優先）。Evaluator（ig-highlight-qa / ig-carousel-qa）は lint 出力を Read して採点に引用（自己判定ではなく機械結果）。ERROR のみ -2 重大減点、WARN/NOTICE は減点なし（auto-fit で折り返しは構造的に発生しないため）。

**将来展開**: 同じ課題が notebook-slides.mjs / キーワードページ SVG で出たら fit-title.mjs を再利用する。SVG は PNG と fit ロジックが異なるため要調整。

## 関連メモリ

- [[project_sns_v7_pivot]]
