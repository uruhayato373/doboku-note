# 年間ロードマップ — 2026年10月〜2027年9月

**更新**: 2026-09-26（v3・重点の表を annual-roadmap.json へ移し、画面で描く）
**考え方**: [14_領域モデル.md](../../docs/strategy/14_領域モデル.md)（8 領域）／優先順位は「収益への近さ × 試験の時期」
**親戦略**: [01_プロダクト戦略.md](../../docs/strategy/01_プロダクト戦略.md)・重点資格と KPI は `.claude/config/business-direction.json`

> [!important] ここに日付・受験者数を書かない
> 試験日・申込・合格発表の正本は `.claude/config/exam-calendar.json`、受験者数・合格率は `exam-stats.json`（一覧は管理画面 `/strategy/qualifications`、日付は `/schedule`）。本書は四半期の粒度で「どの試験期に何を重点にするか」だけを書く（v1 は日付と受験者数の写しを誤り続けたため撤去した）。

## ロードマップ（正本は JSON・画面で見る）

領域 × 月の重点は `.claude/config/annual-roadmap.json` が正本で、管理画面 **計画 ＞ 年間ロードマップ**（`/plan/roadmap`）が試験カレンダー（`exam-calendar.json`）と重ねて描く。時間軸は縦（月の行）で、左に資格の行事と買い場、右に領域ごとの重点のカード。翌年の試験期で日付が未公表のものは、昨年度の同じ行事を 1 年ずらした推定として薄字で出る。

- 重点を変えるときは JSON の `items` を直す（領域・開始月・終了月・見出し・`backlogIds`）。カードを完了して削除したら、その項目に `done: true` を付けるか ID を外す
- 領域・期間・バックログ ID の食い違いは `npm run check-domains` が止める
- 月間計画（`monthly.md`）は、ここから各領域 1〜3 件を選ぶ

## 注力しない（今年度）

- **iOS / PWA の有料アプリ**: 着手条件（Web 月収）を満たすまで凍結。PWA の収益導線は pilot（DN-0115）だけ。
- **X・Threads のアフィリエイト**: 将来の掲載先として記録のみ（`affiliate-operations.md`「将来の掲載先」）。
- **資格の新規追加**: 候補資格は資格一覧で管理し、合格発表後（Q1）の見直しでだけ昇格を判断する。

## 四半期定例（recurring）

| サイクル | タスク | 実行 |
|---|---|---|
| 四半期（90日） | 販売チャネル競合レビュー（note / IG / ココナラ取得＋意味評価） | `competitor-scan.yml`（機械取得）→ `/competitor-review`（意味評価）。期限の backstop は `npm run check-competitor-scan-due` |
