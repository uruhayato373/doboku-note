# docs/project と GitHub Issue の役割分離ルール

`docs/project/*.md` に「Why/戦略」と「実行タスク TODO」が混在すると、進捗把握と更新コストが跳ね上がる。真実源を分離し、週次メンテで同期する。

- **真実源を一箇所に固定**し、反対側は参照リンクのみにする（転記禁止）
- 週次の `/weekly-review` Agent G が Umbrella Issue を棚卸しして drift を検出する
- 新規に「やるべきこと」を書きたくなったら、まず Issue（Umbrella の checklist 項目）として追加する

## 真実源マトリクス

| 情報の種類 | 真実源 | 反対側での扱い |
|---|---|---|
| Why / 背景 / 戦略 / 判断プロセス | **md**（`docs/project/`） | Issue body 冒頭にリンク（`関連ロードマップ: docs/project/NN_xxx.md`） |
| 設計書・ADR（不変の決定記録） | **md**（`docs/project/` or `docs/adr/`） | Issue からはリンクのみ |
| 実行タスクの状態（open / closed） | **Issue** | md には `追跡 Issue: #N` を 1 行書く。個別 checklist は md に書かない |
| 進捗率 / 完了タイミング | **Issue の checkbox と close** | md では言及しない |
| 実装詳細（コード・テストコマンド等） | **Issue の checklist 項目 or PR** | md は方針のみ |

迷ったら: 「2 ヶ月後も残すべき文書的価値があるか」→ Yes なら md、No なら Issue。

## ロードマップ md の標準構成

`docs/project/NN_xxx-roadmap.md` の推奨セクション（上から順）:

1. **冒頭メタ**: 策定日、ステータス、**追跡 Issue: #N**（Umbrella Issue への 1 行リンク）
2. **現状（完了分）**: 何が実装済みか。MVP 等
3. **Why / 設計思想 / 方針**: 各 Phase の目的・戦略を散文で記述（タスク列挙はしない）
4. **中止判定基準**: 続行 / 中止 / 方針転換の条件
5. **関連**: 参照文書・他 md・関連スキルへのリンク集

**書かない**:
- Phase N-1 / N-2 等の細分化された実装タスクの checklist（Issue 側に置く）
- 所要時間つき優先順位テーブル（Issue の checklist の並び順で表現）
- 「未実施」「TODO」等の状態表現

## Umbrella Issue の標準形

### タイトル

`[Umbrella] <ロードマップ短名>`（例: `[Umbrella] exam-keyword-cycle Phase 2/3 実装`）

### ラベル

- `umbrella` — 必須。ロードマップ追跡を示す
- 追加ラベルは任意（`auto-generated` 等、既存運用に合わせる）

### Body 構造

```markdown
## 関連ロードマップ
[`docs/project/NN_xxx-roadmap.md`](docs/project/NN_xxx-roadmap.md)

## Phase N タスク
- [ ] タスク 1（1 行で完了条件が判定できる粒度）
- [ ] タスク 2

## Phase N+1 タスク
- [ ] タスク ...

## 完了判定
全 checkbox が checked になったら close。close 時に md の「追跡 Issue」行から該当を外す or 新 Umbrella に差し替え。
```

**粒度の目安**: 1 チェックボックス = 1 PR / 1 コミット相当。これ以上細かくしない。

## メンテナンス原則

- **週次棚卸し**: `/weekly-review` Phase 1 Agent G が `gh issue list --label umbrella --state open` を走査し、以下を surface
  - 2 週間以上更新なしの Umbrella（停滞）
  - 全項目 checked なのに open（close 漏れ）
  - 対応する md が見当たらない Umbrella（孤立）
- **ロードマップ追加時**: md の冒頭に `追跡 Issue: #N` を必ず書く。Issue 側の Body 冒頭にも md パスを書く（双方向リンク）
- **Issue close 時**: 対応する md の「追跡 Issue」行を確認し、後継 Umbrella があれば差し替え、なければ削除

## 既存運用との整合

- `/civil-textbook-cycle` は既に `gh issue create --body-file` で Umbrella Issue を作成している。本ルールに沿わせる場合、タイトルを `[Umbrella] civil-textbook Round N` に、ラベルを `umbrella` に統一
- PSI 違反 Issue（`auto-generated`, `performance` ラベル）は個別 Issue であり Umbrella ではない。対象外

## Pilot

本ルールはまず `docs/project/25_exam-keyword-cycle-roadmap.md` で Pilot 運用する。2-3 週間様子を見てから他 `docs/project/*.md` に展開する。摩擦が出た場合のみスキル化（`/docs-issue-sync` 等）を検討する（現時点では手運用で十分）。
