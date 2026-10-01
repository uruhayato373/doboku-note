---
name: feedback_ssot_no_hand_copies_self_verify
description: "資格の日程・受験者数は正本3ファイルだけ・台帳へ写さず主担当が原文照合(サブエージェント引用は鵜呑みにしない)。商品仕様は自己申告でなく既存成果物の実測から取る"
metadata:
  type: feedback
---

## 資格データは正本3ファイルだけに書き、値は主担当が原文照合する
試験日程・受験者数・合格発表などは `.claude/config/qualification-registry.json`（一覧・展開状態）・`exam-calendar.json`（日程）・`exam-stats.json`（統計）だけに書く。計画書（annual.md など）や説明文へ数値を写さず、正本と管理画面「資格一覧」「商品ラインナップ」への案内にする。正本へ入れる値は調査担当（サブエージェント）の引用をそのまま使わず、主担当が公式原文（curl＋pdftotext／cp932）で照合してから `verification.checkedBy: self` にする。
- **Why:** 2026-09-26、annual.md の手書き表が主任技士の試験日・申込締切・受験者規模・合格発表見込みを4種類とも誤っていた。同日の調査ではサブエージェントの引用に暦と合わない曜日が混じり、倍率を合格率欄へ入れ、前期と後期を取り違えた。WebFetch の要約も日付を入れ替えた。詳細は measurement-incidents.md「2026-09-26」。
- **How to apply:** ユーザーが「確かめて」「正本で管理」と言ったら、未確認は null＋理由（unresolved/pending/notPublished）で残し推測で埋めない。調査を委任したときは戻った値のうち正本を書き換えるものを自分で原文照合してから書く。月次レビューは `npm run exam-ssot-status` で要対応を読む。関連: [[feedback_factcheck_guide_facts]] [[feedback_verify_your_excuses]]

## 商品仕様はカタログの自己申告でなく既存成果物の実測から取る（2026-08-20）
新しい商品・記事の仕様（字数・本数・構成）は、既存の同系商品の実物を実測してから発注する。カタログや doc の自己申告値を仕様の真実源にしない。
- **事故（DN-0095）**: コンクリート主任技士「実務立場別小論文集」16本の発注で、`src/lib/note-magazines.ts` の既存商品 `cce-essay-magazine` の description「1200〜1700字級フル模範小論文」をそのまま仕様として渡した。その記述自体が実物より過少で、既存記事の実測は1,793〜2,864字。結果、**¥3,980の上位商品が¥2,480の入口商品より4割薄い**商品設計欠陥になり、16本全部を2,200〜2,500字へ増補し直した。
- **QA も検出できない**: Generator/Evaluator を分離していても、Evaluator に親が渡した誤った基準（1200〜1700字）で採点させたため「範囲内＝PASS」。**発注時の仕様が誤っていると分離していても検出されない**。
- **How to apply**: 発注プロンプトに字数・構成の数値を書く前に参照元の実物を測る:
  ```
  awk '/^### 序論/{f=1} /^## 採点者視点/{f=0} f' <article.md> | sed 's/^\*\*.*\*\*$//; s/^###.*$//' \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{console.log([...s.replace(/\s/g,"")].length)})'
  ```
  実測と doc の記述がずれていたら **doc 側を実測値へ直す**（今回は description を「1800字級以上」へ修正済み）。上位商品を作るときは「既存商品の実測値を上回るか」を受入条件に入れる。関連 [[feedback_gate_zero_coverage_false_pass]]（自己申告を検査結果と読み違える同型）[[feedback_note_article_three_set_dod]]（代理指標でなく実条件を見る）
