---
name: feedback_prevention_over_patching
description: "再発しうるバグもエージェントの誤読・誤操作も点修正で終えず自動検知を仕組み化。ただし機械化は§9の決定的ゲート基準を満たすときだけ。廃止仕様は全系統へ横展開"
metadata:
  type: feedback
---

再発しうる不具合（特に SNS 画像生成パイプライン・note 記事体裁）を直すときは、症状の修正だけで完了とせず、**自動検知の仕組み化（lint ルール追加・QA エージェント連携・生成時ブロック）まで実装する**。

**Why:** IG カルーセル過去問パックの「選択肢が footer にはみ出す」で、char 閾値の手当て→推定エスカレーションと2回取りこぼし同じ問題を3回報告された。ユーザーは「再発防止のためエージェントやスキルは工夫したのか？」と明示要求。点の修正は推定の穴を突く新パターンで黙って再発する。

**How to apply:** レンダラー等のレイアウト/品質判定ロジックは単一関数として export しレンダラーと lint で共有（生成物と検査を一致させる）。`lint-exam-pack-structure.mjs` は `bulk-generate-exam-packs.mjs` の pre-check と `ig-carousel-qa` の両方が実行するので、ここに ERROR ルールを足すと両経路で自動 enforce（E3=はみ出し検知・commit 47f2fc125）。エージェント/スキルを触ったら規則#8 でレジストリも同 commit 更新。推定ベースの lint は未知パターンを取りこぼすので QA の PNG 目視を最終防波堤に残す。関連: [[feedback_exam_pdf_cross_reference]]

## 2026-06-01 再発（2度目）: 手動起動の品質ゲートは必ず素通りする
note 記事で markdown 表・太字内全角括弧 Pattern A・文字化けを何度も点修正し「なぜ同じ間違いが繰り返される。サブエージェント/Skill を工夫できないか」と再び問われた。原因＝検査資産（`note-prepublish-review` スキル＝表/Pattern A を BLOCK、`check-note-bold-paren.mjs`）は揃っていたが手動起動で私が忘れてスキップ。既存 pre-commit（`pre-commit-mdx.mjs`）は .mdx 専用で note 記事 .md が対象外だった。対策＝`scripts/note-lint.mjs`（表/Pattern A/U+FFFD を検査し exit 1）を新設し `install-pre-commit.mjs` 経由で `.git/hooks/pre-commit` に組込（commit 08b0936c1）。**教訓: 手動起動の品質ゲートは必ずいつか素通りする。自動強制（pre-commit/フック）に載せて初めて再発防止**。`npm run note-lint -- <path|slug>` で手動実行可。包括レビューは `/note-prepublish-review` を併用。

## 2026-08-27 射程の拡張: エージェント自身の誤読・誤操作も同じ扱い
`gh release list` の空応答を「release が消えた＝取込成功」と読み、`curl --noproxy '*'` の `HTTP 000` を「デプロイ失敗・SSR 破壊」と読みかけた（「取得できなかった」を「異常が無い」と読む形＝[[feedback_gate_zero_coverage_false_pass]] の4つめ）。**ただし「失敗したら必ず検査を作る」ではない**——機械化するのは CLAUDE.md §9 の決定的ゲート基準（実行するコマンドと合格条件が特定できる）を満たすときだけ。満たさないものはゲートを作らず記録に留める（作ると quality-audit が肥大し §9 が禁じる汎用の検証指示になる）。分岐の実例: `--noproxy` の誤読は特定できたので `scripts/check-production-ssr.mjs`（exit 0=正常 / 1=壊れている / **2=検査不成立**・deploy skill Step 7.5 が呼ぶ・回帰テスト付き）で機械化。「`| tail` でエラー出力を流して gc が実行されていないのに気づかなかった」は特定できないので `measurement-incidents.md` へ記録のみ。**行動規範の正典は CLAUDE.md §12「自分の失敗の後処理」**（(1) 同一セッション内で自分で直す (2) 正典へ記録 (3) 特定できるときだけ機械ゲート化）。

## 廃止/変更した仕様は決定系統だけでなく全 article 系統へ横展開し機械ゲートで再混入を止める
あるコンテンツ系統で「この節/書式は廃止」と決めたら、同種の全 article 系統（総監模範論文 essay／建設部門二次／1級・2級土木 等）へ展開し、可能なら note-lint 等の pre-commit 機械ゲートで物理的に止める。
- **Why:** 「合格者／元公務員からのコメント」節の廃止（2026-06-10）が建設部門二次QA（`pe-secondary-exam-qa.md`）の減点ルールにだけ反映され、総監模範論文 essay の既存15記事（アセットマネジメント／契約調達／技術基準 × R03-R07）に取りこぼされた（2026-06-11 ユーザー指摘で削除）。QA 採点は系統ごとに別ファイルで、採点が走らない記事はすり抜ける。機械ゲートなら commit 時に全 `docs/note/**/article.md` へ一律適用。
- **How to apply:** (1) `grep -rl` で全 docs/note の混入を洗う（決定系統に限定しない）(2) 既存混入を一括是正 (3) `scripts/note-lint.mjs` に denylist 正規表現（例: `## …からのコメント`）を足して pre-commit で BLOCK。QA の減点ルールは「採点が走れば効く」補助で機械ゲートの代わりにならない。note-lint の変更は他 PR と同じ `const issues = [...]` 行を編集するので、未マージの note-lint 系 PR があればそのブランチに集約（develop 直だと確実にコンフリクト）。
