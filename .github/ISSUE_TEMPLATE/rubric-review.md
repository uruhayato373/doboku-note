---
name: 採点ルーブリック議論 (rubric-review)
about: cem-qa 5 軸の重み・閾値・新軸追加・既存軸の判定基準改修の議論
title: "[Rubric] "
labels: ["rubric-review", "content-quality"]
assignees: []
---

## 観察
<!-- どのサイクルで・どんな現象を見たか。サイクルログへのリンクを貼る -->
- サイクル: `.claude/state/exam-keyword-cycles/logs/YYYY-MM-DD-{exam}-{question}.md`
- 現象:

## 仮説
<!-- 採点軸のどこを変えるべきか案を 1-2 件 -->
-
-

## 検証
- [ ] 過去 N サイクル中、何件で同じ問題が浮上したか（**2 回以上で起票が原則**）
- [ ] `/distill-proofread-learnings --since "Ncycle"` で横断確認した
- [ ] 影響範囲: 既存ページ約 N 件の再評価が必要か見積もり済み

## 反映先（決定後に編集する真実源）
<!-- 採点関連は 3 ファイル同期更新が必須 -->
- [ ] `.claude/agents/cem-qa.md` の「品質ルーブリック」セクション（重み・加重スコア式）
- [ ] `.claude/content-principles.md` の該当 §（判定基準の真実源）
- [ ] `.claude/skills/quality/quality-cycle/templates/cem.md`（参考資料）

## 決定
<!-- 議論完了後に記録 -->
- 変更内容:
- 適用開始サイクル:
- 既存ページの再評価方針:

## 関連
-
