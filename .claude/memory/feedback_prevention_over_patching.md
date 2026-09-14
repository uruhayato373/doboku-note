---
name: feedback-prevention-over-patching
description: 再発しうるバグもエージェント自身の誤読・誤操作も、点の修正で終わらせず自動検知を仕組み化する。ただし機械化は §9 の決定的ゲート基準を満たすときだけで、満たさなければ記録に留める
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 977b042f-7d38-4d11-b21a-db2169a0b407
---

再発しうる不具合（特に SNS 画像生成パイプライン）を直すときは、症状の修正だけで完了とせず、**自動検知の仕組み化（lint ルール追加・QA エージェント連携・生成時ブロック）まで実装する**。

**Why:** IG カルーセル過去問パックの「選択肢が footer にはみ出す」不具合で、char 閾値の手当て→推定エスカレーション→と修正したが2回取りこぼし、同じ問題を3回報告された。ユーザーは「再発防止のためエージェントやスキルは工夫したのか？」と明示的に検知の仕組み化を要求した。点の修正は推定の穴を突く新パターンで黙って再発する。

**How to apply:** レンダラー等のレイアウト/品質判定ロジックは単一関数として export し、レンダラーと lint で共有（生成物と検査を一致させる）。`lint-exam-pack-structure.mjs` は `bulk-generate-exam-packs.mjs` の pre-check と `ig-carousel-qa` エージェントの両方が実行するため、ここに ERROR ルールを足すと両経路で自動 enforce される（E3=はみ出し検知が実例、commit 47f2fc125）。エージェント/スキルを触ったら規則#8 でレジストリも同 commit 更新。なお推定ベースの lint は推定式が外れる未知パターンを取りこぼし得るので、QA の PNG 目視を最終防波堤として残す。関連: [[feedback_exam_pdf_cross_reference]]

**[2026-06-01 再発（2度目の同種指摘）] note 記事で markdown表・太字内全角括弧 Pattern A・文字化けを何度も点修正し、ユーザーに再び「なぜ同じ間違いが繰り返される。サブエージェント/Skillを工夫できないか」と問われた。** 原因＝検査資産（`note-prepublish-review` スキル＝表/Pattern A を BLOCK 判定、`check-note-bold-paren.mjs`）は揃っていたが**手動起動**で、私が忘れてスキップ。さらに既存 git pre-commit（`pre-commit-mdx.mjs`）は **.mdx 専用で note 記事 .md が対象外**だった。対策＝`scripts/note-lint.mjs`（表/Pattern A/U+FFFD を検査し exit 1）を新設し `install-pre-commit.mjs` 経由で `.git/hooks/pre-commit` に組込（commit 08b0936c1）。これで全コミットで自動ブロック。**教訓: 検査が存在しても「手動起動の品質ゲート」は必ずいつか素通りする。自動強制（pre-commit/フック）に載せて初めて再発防止になる。** `npm run note-lint -- <path|slug>` で手動実行も可。包括レビューは `/note-prepublish-review` を併用。

**[2026-08-27 射程の拡張] 対象は製品バグだけではない——エージェント自身の操作ミス・誤読も同じ扱いにする。** 同セッションで `gh release list` の空応答を「release が消えた＝取込成功」と読み、`curl --noproxy '*'` の `HTTP 000` を「デプロイ失敗・SSR 破壊」と読みかけた（どちらも「取得できなかった」を「異常が無い」と読む形＝[[feedback_gate_zero_coverage_false_pass]] の 4 つめ）。**ただし「失敗したら必ず検査を作る」ではない**——機械化するのは CLAUDE.md §9 の決定的ゲート基準（実行するコマンドと合格条件が特定できる）を満たすときだけ。満たさないものはゲートを作らず記録に留める（作れば quality-audit が肥大し、§9 が禁じる汎用の検証指示になる）。実例の分岐: `--noproxy` の誤読は特定できたので `scripts/check-production-ssr.mjs` で機械化（exit 0=正常 / 1=壊れている / **2=検査不成立＝接続できていない**・deploy skill Step 7.5 が呼ぶ・回帰テスト付き）／「`| tail` でエラー出力を流して gc が実行されていないのに気づかなかった」は特定できないので `measurement-incidents.md` へ記録のみ。**行動規範は CLAUDE.md §12「自分の失敗の後処理」が正典**（(1) 同一セッション内で自分で直す (2) 正典へ記録 (3) 特定できるときだけ機械ゲート化）。
