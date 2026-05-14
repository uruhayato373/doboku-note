# Issue 駆動継続改善ループ

採点（cem-qa 5 軸）とリライト方法論（4 視点 × Phase 対応）は、サイクルごとに「発見事項」が surface する。これを **既存のリファレンス Issue（#205 / #206）を最新版に update する** 形で継続改善する。

## 中核原則: Issue を増やさない

- **採点ルーブリックの議論** → **#205 のコメント**で開始
- **リライト方法論の議論** → **#206 のコメント**で開始

合意した内容は Claude が #205 / #206 本文の「合意済み」セクションへ移動し、真実源（cem-qa.md / SKILL.md 等）を同期更新する。

## ループ全体図

```
試走サイクル (/exam-keyword-cycle ...)
  ↓
Phase 5.3 サイクルログに「発見事項」記録
  ├ 採点軸への気づき
  ├ リライト方法論への気づき
  └ 議論開始候補（2 回以上浮上したパターンのみ）
  ↓
/distill-proofread-learnings --since "Ncycle" で横断抽出
  ↓
既存リファレンス Issue にコメント投稿（2 回ルール超え時）
  ├ 採点側 → #205 のコメントで議論開始
  └ リライト側 → #206 のコメントで議論開始
  ↓
コメント上で議論・ユーザー承認
  ↓
Claude が真実源を同期更新 + 該当 Issue 本文の「合意済み」へ移動
  ├ 採点修正: .claude/agents/cem-qa.md + docs/reference/content-principles.md + templates/cem.md（3 ファイル同期必須）+ #205 本文
  └ 方法論修正: .claude/skills/quality/exam-keyword-cycle/SKILL.md ほか該当 SKILL.md + #206 本文
  ↓
次サイクルから新ルール適用 → 改善効果を再観察 → ループ
```

## Issue 起票判断基準

| 判断 | アクション |
|---|---|
| **1 回限りの違和感** | サイクルログに「発見事項」として記録のみ。次サイクルで再観察 |
| **2 回以上浮上したパターン** | **#205 or #206 のコメント**で議論開始（新規 Issue は立てない） |
| **明らかなバグ・OCR エラー** | 別途 `content-quality` + `auto-generated` で個別 Issue（既存運用） |
| **例外: 構造的に大きな変更** | 5 軸完全リセット・拡張パターン A-G 全面改修等のレアケースのみ `[Rubric]` / `[Method]` テンプレで新規 Issue |

## 議論場所の選択ガイド

- **採点関連**（cem-qa 5 軸の重み・閾値・新軸追加・既存軸の判定基準改修）→ **#205**
  - 例: 「SVG 図版の質を独立軸化」「mobile 軸の lint パターン追加」「閾値 2.0 → 1.9 緩和」
  - 反映先（同期必須）: `.claude/agents/cem-qa.md` + `docs/reference/content-principles.md` + `templates/cem.md` + #205 本文
- **リライト関連**（4 視点 × Phase 対応・視点タグ・拡張パターン A-G・NLM 照合プロンプト）→ **#206**
  - 例: 「視点タグに『独立性』を追加」「Phase 2 で notebooklm-research を必須化」「拡張パターン H 新設」
  - 反映先: `.claude/skills/quality/exam-keyword-cycle/SKILL.md` ほか該当 SKILL.md + #206 本文

## 議論クローズ条件

3 点すべて揃ったら、議論コメントスレッドを「決定済み」とマークする:

1. **#205 or #206 本文の「合意済み」セクションに反映** — 変更内容・適用日・効果測定方法を本文に記録
2. **真実源 commit** — cem-qa.md / SKILL.md 等を更新して commit
3. **次サイクルでの効果確認** — 新ルール適用後、改善が観察できたかをコメントで追記
