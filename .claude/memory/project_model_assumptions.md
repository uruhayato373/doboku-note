---
name: project_model_assumptions
description: "現行は Opus 5.5 前提。ハーネスは公式ガイド準拠で棚卸し済み（Opus 5: 2026-07-27、Opus 5.5: 2026-09-25）"
metadata:
  type: project
---

現行モデル: **Claude Opus 5.5**（1M context が既定かつ上限・effort 既定 medium・thinking 無効化不可）。2026-09-25 更新（旧: Opus 5・4.8・4.6）。
利用可能な上位モデル: Claude Fable 5 — 主ループの `Agent(model: "fable")` で指定。適合条件は [[feedback_opus_sonnet_split]] を参照。

2026-07-27 に Anthropic 公式「Prompting Claude Opus 5」を実読し、CLAUDE.md・skills 98・agents 77 を全量棚卸しして反映済み。
2026-09-25 に `/claude-api prompt-audit` で Opus 5.5 向けに再棚卸し。残っていたのは古いモデル名固定・スキル内の版履歴・「〜に廃止/移設」の日付入り経緯・件数上限だけで、強調語の大半は事故・金銭・公開リスクに紐づく正当なもの（維持）。

**適用範囲の原則（最重要）**: agents 77 体のうち **74 体は `model: sonnet` 固定**なので、Opus 5 固有の調整（検証指示の削除など）を機械適用してはいけない。対象は CLAUDE.md・skills（親が読む）と `model: inherit` の3体（`civil-construction-review` / `guide-qa` / `strategy-advisor`）のみ。sonnet 定義にはモデル非依存の改善（出力長の校正・検出抑制の解除）だけを入れた。

**反映済みの要点**:
- 汎用の検証指示・自己再チェック指示は書かない（Opus 5 は自律検証するので二重になる）。書いてよいのは決定的ゲート（`npm run check-*`・curl 200・lint）だけ
- 成果物（md）は長さを校正する。**検出は全件・絞るのは表示**で、落とす分は件数と参照先を必ず書く（真実源: `docs-markdown-style.md`「長さの既定」）
- 「重大のみ報告」「N 件まで」は検出抑制として文字通り実行されるので使わない
- サブエージェントの同時起動は原則 3 体まで。自分の作業の検証目的で spawn しない
- **エージェントに自分の実行モデルを条件分岐させない**（モデルは自分が何で動くか確実には知らない。検出軸を自主的に落とす方向にしか働かない）
- effort は low/medium でも品質が保たれる場面が多い。機械的ステージでは積極的に下げる

**モデル更新時に見直す項目**: 公式プロンプトガイドを実読して上記棚卸しを再実行する／サブエージェントへのテキスト量制限／画像ベース PDF の読み取り精度／並列エージェント数の上限。

**Why:** ハーネス設計原則（CLAUDE.md §5）「新モデルが出たらハーネスを見直す」に基づく。関連: [[feedback_opus_sonnet_split]] [[feedback_verify_your_excuses]]
