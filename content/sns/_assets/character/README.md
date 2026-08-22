# doboku-note 先生 キャラクター素材

SNS（IG/YT）横断のブランドマスコット「doboku-note 先生」の透過 PNG ライブラリ。
リール（angle-reel-create の `character` 合成）・カルーセル等で再利用する。

**SSOT** — アイデンティティ＝[CHARACTER-SPEC.md](CHARACTER-SPEC.md)（設定書）／ポーズ機械可読＝[`.claude/config/character-poses.json`](../../../../.claude/config/character-poses.json)／運用＝[.claude/knowledge/reference/character-asset-policy.md](../../../../.claude/knowledge/reference/character-asset-policy.md)。追加抽出＝`npm run character-extract`。

- `CHARACTER-SPEC.md` … 人格・外見・ブランド・避けたい表現の設定書（真実源）。
- `*.png` … 背景透過の個別ポーズ（全身・正面）。命名はポーズ内容（manifest が一覧の SoT）。
- `icons/` … 円形プロフィールアイコン（紺ラジアルグラデ円＋バスト）。`npm run character-icons` で生成（master 800 + SNS 400/180）。主ポーズ＝smile（プロフィール本命）。サイト/YouTube/IG のアイコンに使用。背景は意図的にシンプル（スペック§5「情報量多すぎない・SNSでも見やすい」）。
- `_source/` … 生成元のグリッド/シート（参照用マスター・抽出元）。

## ポーズ一覧（2026-06-29 実画像を目視確認し再マッピング・全件 verified）
gesture: pointing（指差し＝指を立てる）/ good-sign（グッドサイン＝親指）/ explaining（手のひらで解説）/ wave（手を振る・挨拶）
expression: thinking（考え中＝顎に手）/ surprised（驚き＝両手を上げる）/ congrats（バンザイ＝合格祝い）/ smile（笑顔・立ち）
item: whiteboard（ホワイトボード解説）/ pc-work（ノートPC作業）/ reading（教科書を読む）

> 2026-06-26 初版（ChatGPT生成→白背景を flood-fill 透過）の slug は AI 抽出のグリッド位置由来で実ポーズと不一致だった（例: 旧 congrats=実は読書、旧 point-up=実はバンザイ）。2026-06-29 に全 15 ファイルを目視確認し、内容に合わせて改名。重複 4 件（旧 pc-work＝smile のバイト複製・無名 .png＝pointing 複製・serious＝pointing 複製・point-emphasis-2＝good-sign 複製）を削除し 11 ポーズへ整理。機械可読の真実源は [`.claude/config/character-poses.json`](../../../../.claude/config/character-poses.json)（verified:true）。
> 追加・差し替えは同じく「無地背景で生成→背景除去」で。透過は flood-fill か aidesigner remove_image_background（無料）。腕組み（arms-crossed）は実在ポーズが無いため未収録＝必要なら新規生成。
