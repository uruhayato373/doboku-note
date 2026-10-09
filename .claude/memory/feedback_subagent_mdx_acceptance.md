---
name: feedback_subagent_mdx_acceptance
description: "サブエージェントに MDX の整形を任せるときは textlint 0 件・lint-mdx-mobile・check-mdx-facts を受入れ条件として依頼文に書き、戻ったら自分で回してから commit する"
metadata:
  type: feedback
---

サブエージェント（general-purpose 等）に content/site の MDX の整形・書き換えを任せるときは、依頼文に受入れ条件として次の 3 つを書き、戻ってきたら commit 前に自分でも回す。

1. `npx textlint <file>` が 0 件（pre-commit の `lint-ja --staged` は**ファイル全体**を検査する。触っていない既存行の全角数字・prh も止まる）
2. `node .claude/scripts/lint-mdx-mobile.mjs <file>` で狙ったルールが減り、新しい違反が無い
3. 構造だけ変えた編集は `npm run check-mdx-facts -- <file>` で数値・「」の語の減少 0

**Why:** 2026-10-06、論文キーワード 6 本の整形を 2 体に分けて任せた。依頼文に textlint を書かなかった側の 3 本が pre-commit で 67 件止まり（ほぼ元の本文にあった全角数字）、`--fix` 相当で直した prh が動詞「仕上がります」を「仕上ります」に壊した（prh は名詞だけに直した）。片方の体は自分で textlint を回していて止まらなかった。旧本文との数値照合は各自が使い捨てスクリプトで書いていた。

**How to apply:** 依頼文に上の 3 行を貼る。戻ったら 3 つを回し、prh の置換は diff で動詞の活用に当たっていないかを見る。表を部品（SpecSheetList 等）へ変えた場合は、残った「（表: …）」の表題や「以下の表」の言及も直す。正典は content-authoring.md「書き終えたときの決定的ゲート」。
