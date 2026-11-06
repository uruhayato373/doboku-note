---
name: feedback-measure-before-building-tracking
description: 計測の仕組みを足す提案の前に、既存のデータで取れないかと、対象の規模を確かめる
metadata:
  type: feedback
---

2026-11-06、動画から note へのクリックを取るために転送ページを勧めて実装まで進めたが、運営者に「必ず必要か」「UTM で GA4 で分析できるのでは」と止められた。UTM の `campaign`・`campaign-note-cta` は既に動画ごとに取れていて、動画の再生も 28 日で 94 回だった。

**Why:** 読者の導線に 1 手間足す仕組みは、規模が小さいと数字が 0 と 1 しか並ばず、離脱の害だけが残る。

**How to apply:** 計測の仕組みを提案する前に、`data/` に同じ問いへ答える数字が無いかを見て、件数が判断に足りるかを確かめる。「note へ直接行ったクリックは取れない」は今も事実なので、数字はサイト経由の分だけと明示する。[[feedback_prevention_over_patching]]

**仕組みでの止め方**: 計測の状態は手で書かない。取得元は `config/business-direction.json` の `dataSource`、判定は `npm run metric-status`。台帳の文章で「未計測」とあっても、この結果を信じる。
