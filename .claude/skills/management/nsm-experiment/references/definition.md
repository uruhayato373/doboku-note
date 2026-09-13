# NSMと事業KPIの参照

方針と判断理由の正典は `docs/strategy/01_プロダクト戦略.md`。重点資格・指標定義は `.claude/config/business-direction.json`。このファイルに目標値や現在値を複製しない。

既存NSMは集客の継続指標 `organicUsers`（GA4 Organic Search、日本、期間全体のactiveUsers）。Googleだけの人数ではなく、日別人数やページ別人数を合計した値でもない。GSC表示回数×CTRはクリックでありユーザー数ではない。

事業判断では資格別の学習行動、note/ココナラの販売先アクセスと販売実績、実受取・費用・運営時間、教材品質も確認する。自然検索の増加だけで事業の成功としない。学習価値を表すNSM候補は計測範囲と重複排除を検証してから採否を判断する。

目標と基準値は `.claude/state/metrics/business/` のtarget/snapshot履歴で管理する。対象・期間・根拠・見直し日を必要とし、未計測や過去の仮目標で埋めない。

実験の状態は `.claude/state/experiments.json`、週次・月次の判断は事業レビュー履歴。手順は `.claude/knowledge/reference/business-review.md`。SEO Rank Watchは `.claude/knowledge/reference/seo-rank-watch.md` の本番反映後7日・延長・1位判定を優先する。
