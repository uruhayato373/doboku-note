---
name: リライト方法論議論 (rewrite-method)
about: 構造的変更（拡張パターン全面改修等）で別 Issue が必要な場合のみ。通常は #206 のコメントで議論
title: "[Method] "
labels: ["rewrite-method", "content-quality"]
assignees: []
---

> ## 🛑 まず確認してください
>
> **リライト方法論の議論は原則 [#206](https://github.com/uruhayato373/doboku-note/issues/206) のコメントで行います**。新規 Issue は **以下のケースのみ** 使用してください：
>
> - 拡張パターン A-G の全面改修、視点タグの大規模再編、Phase 構造の見直し等
> - 議論が複雑で別 Issue で履歴管理した方が良い場合
>
> 通常の改善議論（視点タグ追加・拡張パターン微修正・NLM 照合プロンプト調整）は **#206 のコメント** で開始してください。合意した内容は Claude が #206 本文の「合意済み」セクションへ移動し、真実源を同期更新します。

## 観察
<!-- どのサイクルで・どの Phase で・どんな違和感があったか -->
- サイクル: `.claude/state/exam-keyword-cycles/logs/YYYY-MM-DD-{exam}-{question}.md`
- 該当 Phase:
- 現象:

## 仮説
<!-- 視点タグの追加・Phase 対応の修正・拡張パターン改修など案を提示 -->
-
-

## 検証
- [ ] 同じ問題が他のサイクルでも浮上したか（**2 回以上で起票が原則**）
- [ ] 既存スキルの組み合わせで解決可能か（新規スキル不要か）
- [ ] ハーネス原則「部品を増やすより削る」と整合するか

## 反映先（決定後に編集する真実源）
<!-- リライト方法論は対象スキル/エージェントを選択 -->
- [ ] `.claude/skills/quality/exam-keyword-cycle/SKILL.md`
- [ ] `.claude/agents/keyword-rewriter.md`
- [ ] `.claude/skills/quality/quality-cycle/SKILL.md`（CEM プロファイル）
- [ ] `.claude/skills/authoring/improve-article/SKILL.md`（NLM 照合プロンプト調整時）
- [ ] `.claude/skills/authoring/notebooklm-research/SKILL.md`（NLM 引用ルール）
- [ ] `.claude/skills/authoring/visual-research/SKILL.md`（SVG 生成ルール）

## 決定
<!-- 議論完了後に記録 -->
- 変更内容:
- 適用開始サイクル:
- 効果測定方法:

## 関連
-
