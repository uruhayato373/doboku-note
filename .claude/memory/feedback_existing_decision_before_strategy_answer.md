---
name: feedback-existing-decision-before-strategy-answer
description: 方針・価格・導線の問いに答える前に、同じ論点の決定がバックログと判断記録にすでに無いか確かめる
metadata:
  type: feedback
---

2026-11-10、運営者の「サイトは過去問の解答だけにして note・KDP へ導線をつくるか」という問いに、2 回続けて「今は勧めない」「半分で試す」と答えた。ところが運営者は 2026-11-08 の週次レビューで「過去問の解説を全面的に有料側へ移し、サイトは正答だけにする」と決めており、カード（DN-1044）と判断記録（`data/business/records/review-2026-11-07…json`）に残っていた。起票を頼まれて重複を調べるまで気づかず、運営者に「すべての資格試験でそうだから」と言わせた。

**Why:** 決定済みの方針に反対の助言をすると、運営者に同じ判断をやり直させる。販売と計測のデータだけを読んでも、決定は出てこない。

**How to apply:** 方針・価格・導線・商品の扱いを問われたら、データを読む前に論点の語で `git grep -n "<論点の語>" -- .claude/todo data/business/records docs/reviews` を引き、決定とカード番号を確かめる。決定があれば、答えは「その決定を進めるうえで分かったこと」として書き、是非の議論に戻さない。起票を頼まれたときは既存カードに足す。関連: [[feedback-sns-hold-check-before-proposing]]、[[feedback-review-tasks-to-backlog]]
