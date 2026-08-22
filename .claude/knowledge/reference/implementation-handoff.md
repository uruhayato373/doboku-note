# 実装 handoff 規約（Codex → Claude Code）

**役割**: 設計と実装を分けて回すときの標準サイクルと、一案件の指示書（plan）の作法。誰がどこまで責任を持つかは [codex-division-of-labor.md](./codex-division-of-labor.md)、置き場の原則は [information-architecture.md](./information-architecture.md) が真実源。

## 標準サイクル

1. **設計**（Codex）— 調査・要件整理・比較・受入条件を確定し、実装指示書を書く
2. **実装**（Claude Code）— 指示書どおりに実装し、指定された検証を通す
3. **抽出**（Claude Code）— 恒久ルールを SSOT へ、残件を backlog へ移す
4. **削除**（Claude Code）— 指示書を削除する（記録は git 履歴が持つ）

外部公開・課金・削除など取り返しのつかない操作は、どの段階でもユーザーの承認を要する。

## plan の置き場と命名

```text
.claude/plans/{DN-ID}-{slug}.md
```

- 1 案件 1 ファイル。複数フェーズに分かれるなら 1 ファイル内に節を作る
- **`completed/` や `archive/` を作らない**。完了した plan は削除する
- `.claude/prompts/` へ新規ファイルを作らない。短い起動プロンプトは plan 末尾に置く
- backlog の `DN-####` と対応させる（plan は「どう作るか」、backlog は「まだ終わっていない」）

## plan の章立て

目的 / SSOT / scope（含む・含まない）/ 確定設計 / 対象ファイル / 手順 / 検証 / 停止条件 / 抽出先 / 削除条件 / 起動プロンプト。

## 状態を複製しない

**進捗・担当・完了状態は backlog だけが持つ**。plan に status 欄や作業日記を書かない。実装の実状は git 差分とコミットが示す。

## 削除の条件

次をすべて満たしたときだけ plan を削除する。

- 全フェーズの受入条件を満たした
- 検証がすべて成功した
- plan にしか存在しない恒久ルールを SSOT へ抽出した
- 未解決事項を backlog へ抽出した
- リポジトリ内に plan への参照が残っていない

1 つでも欠けるなら plan を残し、判明事項と必要な判断を報告して停止する。
