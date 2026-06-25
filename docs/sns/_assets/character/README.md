# doboku-note 先生 キャラクター素材

SNS（IG/YT）横断のブランドマスコット「doboku-note 先生」の透過 PNG ライブラリ。
リール（angle-reel-create の `character` 合成）・カルーセル等で再利用する。

**SSOT** — アイデンティティ＝[CHARACTER-SPEC.md](CHARACTER-SPEC.md)（設定書）／ポーズ機械可読＝[`.claude/config/character-poses.json`](../../../../.claude/config/character-poses.json)／運用＝[docs/reference/character-asset-policy.md](../../../reference/character-asset-policy.md)。追加抽出＝`npm run character-extract`。

- `CHARACTER-SPEC.md` … 人格・外見・ブランド・避けたい表現の設定書（真実源）。
- `*.png` … 背景透過の個別ポーズ（全身・正面）。命名はポーズ内容（manifest が一覧の SoT）。
- `_source/` … 生成元のグリッド/シート（参照用マスター・抽出元）。

## ポーズ一覧（2026-06-26 初版・ChatGPT生成→白背景を flood-fill 透過）
pointing（指差し）/ idea（ひらめき）/ explaining（手のひらで解説）/ arms-crossed（腕組み）/
serious（腕組み・真剣）/ point-emphasis（腰に手＋指差し）/ point-emphasis-2 / point-up（指を立てる）/
congrats（バンザイ）/ good-sign（グッドサイン）/ wave（手を振る）/ whiteboard（ホワイトボード解説）/
pc-work（ノートPC作業）/ smile（笑顔）

> 名称はベスト推定。指差し系の近接バリエーションは要整理（重複は統合/改名可）。
> 追加・差し替えは同じく「無地背景で生成→背景除去」で。透過は flood-fill か aidesigner remove_image_background（無料）。
