---
name: feedback_competitor_ledger_before_claims
description: 競合の空き・不在は追跡リストで判断しない。市場の検索と台帳で確かめ、分析役の報告も実データで裏を取る
metadata:
  type: feedback
---

競合の分析の結論は `config/competitor-positions.json` に置き、文書へ写さない。企画と分析の前に `npm run competitor-position -- --exam <資格 id>` を読む。

**Why:** 2026-11-06 の見直しで、1 社の分析を全体の結論にしていた。市場の検索にかけると、RCCM・測量士・舗装・技術士一次で追跡していない売り手が多数見つかり、「競合が薄い」「小論文は空き」の一部が崩れた。自社の動画も検索に出るので、除かないと空きの判定を誤る。分析役の報告にも誤りがあり、`study_room358` の小論文の出品を「無い」と報告した。

**How to apply:**
- 空き・不在は `probes` で市場の検索に照らす。確かめられなければ `untested` にする
- 検索語が足りないときは `config/market-scan.json` の `probeKeywords` に足して取り直す
- 実測の全体の数字はチャンネル全体のもの。資格の数字は検索の件数と分けて読む
- 型を外す前に backlog の運営者の判断を見る。一問一答（DN-0600）は前倒しの判断があった
- YouTube の取得は `yt-dlp` が古いと再生数が全滅する。`scout-youtube-competitors` は保存せず止まるので、更新してから取り直す

関連: [[feedback_measure_before_building_tracking]] [[feedback_verify_your_excuses]] [[reference_competitors_civil]]
