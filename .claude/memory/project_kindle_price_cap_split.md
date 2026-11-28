---
name: project_kindle_price_cap_split
description: Kindle は note と併売・全巻 KDP セレクト・1 冊 ¥1,650 以下で可能な限り分冊（年度ごと）・合本廃止（2026-11-28 運営者決定）。正本は content/kindle/strategy.md
metadata:
  type: project
---

2026-11-28 の運営者決定（正本 `content/kindle/strategy.md`）:
- note と KDP は買う人が違うので併売する。全巻を KDP セレクトに入れて日本 70% で売る（中身が note・サイトと同じでも細部が違うので独占の条件に当たらない、という運営者の判断）
- 1 冊 ¥1,650 以下（70% の上限）。可能な限り分冊し、年度で並ぶ本は年度ごとに 1 巻、同じ年に受ける科目は 1 巻にまとめる。合本（A-00・d-00・c-I）は廃止。再編後は 144 巻
- まず全巻を ready まで作り、KDP への操作は台帳の `plans` に沿って 1 冊ずつ承認を得て行う。一覧は台帳と管理画面だけが持つ

**Why:** Claude は同日「重なる本はセレクトを外し 35% で値上げ」を勧めたが、運営者はリスクを承知で併売・全巻セレクトを選んだ。Claude の見方（読者層の違いは規約で考慮されない）は strategy.md に 1 行と、通知が来たときの予備の案として残してある。この判断を蒸し返さない。
**How to apply:** Kindle の価格・巻を決めるときは strategy.md §1・§2 に従う。KDP から規約の通知が来たら、strategy.md の予備の案（セレクトを外し 35% で値上げ・巻をまとめ直す）を運営者に示す。ASIN の扱いは [[feedback_kindle_dup_prevention]]、価格改定の罠は [[reference_kdp_price_change_gotchas]]。
