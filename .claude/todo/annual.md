# 年間ロードマップ — 2026年10月〜2027年9月

**更新**: 2026-09-26（v4・重点をバックログの [時期:] に一本化し、画面で描く）
**考え方**: [14_領域モデル.md](../../docs/strategy/14_領域モデル.md)（8 領域）／優先順位は「収益への近さ × 試験の時期」
**親戦略**: [01_プロダクト戦略.md](../../docs/strategy/01_プロダクト戦略.md)・重点資格と KPI は `.claude/config/business-direction.json`

> [!important] ここに日付・受験者数を書かない
> 試験日・申込・合格発表の正本は `.claude/config/exam-calendar.json`、受験者数・合格率は `exam-stats.json`（一覧は管理画面 `/strategy/qualifications`、日付は `/schedule`）。本書は四半期の粒度で「どの試験期に何を重点にするか」だけを書く（v1 は日付と受験者数の写しを誤り続けたため撤去した）。

## ロードマップ（正本はバックログの [時期:]・画面で見る）

年間の重点は **バックログのカードに `[時期:YYYY-MM]`（または `YYYY-MM..YYYY-MM`）を付けたもの**がすべてで、別の一覧を持たない。管理画面 **計画 ＞ 年間ロードマップ**（`/plan/roadmap`）が、月の行ごとに資格の行事・買い場（`exam-calendar.json`）と、その月に始めるカードを並べる。表示期間と買い場の週数だけ `.claude/config/annual-roadmap.json` に置く。

- 年間 → 月間 → 週間は同じカードで流れる: `[時期:]` が今月を含むカードが月間の候補、そこから週次で選ぶ
- 重点を足す・動かすときはカードを起票するか `[時期:]` を直す。形式は `npm run check-backlog-schema`、時期を過ぎて残るカードは `npm run check-backlog-health` の S15 が出す
- 毎月の判定や棚卸しのような繰り返しは、カードにせず月次・週次レビューの手順に置く

## 注力しない（今年度）

- **iOS / PWA の有料アプリ**: 着手条件（Web 月収）を満たすまで凍結。PWA の収益導線は pilot（DN-0115）だけ。
- **X・Threads のアフィリエイト**: 将来の掲載先として記録のみ（`affiliate-operations.md`「将来の掲載先」）。
- **資格の新規追加**: 候補資格は資格一覧で管理し、合格発表後（Q1）の見直しでだけ昇格を判断する。

## 四半期定例（recurring）

| サイクル | タスク | 実行 |
|---|---|---|
| 四半期（90日） | 販売チャネル競合レビュー（note / IG / ココナラ取得＋意味評価） | `competitor-scan.yml`（機械取得）→ `/competitor-review`（意味評価）。期限の backstop は `npm run check-competitor-scan-due` |
