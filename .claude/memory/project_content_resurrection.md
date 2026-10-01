---
name: コンテンツ復活プロジェクト（2026-04-19 軌道修正済み）
description: Phase 1-2 完結後、2026-04-19 に reference-materials 独立カテゴリへ分離 + 5 記事を品質向上のため一時非公開（EXP-002 は paused）。
type: project
originSessionId: 9aa9af19-fa16-4081-988b-3cc5a9a26657
---

2026-04-18 に Phase 1-2 完結（復活 5 件 + 双方向リンク + コンポーネント実装）したが、2026-04-19 に運営者判断で軌道修正。

**Why:** 初期の「試験対策ハブ ← 設計便覧スポーク + 双方向リンク」戦略は、実装すると「試験対策ハブ」の看板が参照資料で薄まる。5 記事の内容もまだ試験対策文脈に最適化されておらず、公開継続は混乱要因。独立カテゴリ化 + 精度向上リワークのほうが長期価値が高い。

**How to apply:**

- reference-materials は独立カテゴリ（`src/config/categories.json` に登録済み、variant: reference, icon: BookOpen）。URL: `/category/reference-materials`
- 5 記事はすべて `published: false`（品質向上期間、slug は `reference-materials-*`、旧 `civil-construction-1-reference-*` から 301 redirect）
- civil-construction-1 の 3 textbook（port-regulations / river-act / road-act）からは `<ReferenceLinks>` 削除済み、ハブはクリーン
- 5 記事から `<ExamContext>` も削除済み、カテゴリ間は完全分離
- EXP-002 は **paused**（resume_criteria: 5 記事の精度向上 → re-publish → 新 baseline で再開）
- 主戦場の civil-construction-1 / pe-comprehensive-management コンテンツ充実が優先、reference-materials は余裕ができてから手を付ける

**判断に使う検証:**
- reference-materials の状態を更新する前に `.claude/state/experiments.json` の EXP-002 の paused_at / paused_reason / resume_criteria を確認
- 再公開時は 5 記事を一気に戻さず、1 記事で試験文脈最適化の雛形を作ってから残りを展開

**重要なファイル:**
- 戦略 + Pivot 記録: `docs/project/22_content-resurrection-plan.md` 冒頭の「Pivot サマリー」
- 実験: `.claude/state/experiments.json`（EXP-002 paused）
- 直近ハンドオフ: `.claude/state/session-handoff-2026-04-19.md`
- **コンポーネントは 2026-06-25 に削除済み**（`ReferenceLinks` / `ExamContext`、PR #272 のデッドコード掃除）。EXP-002 を再開するなら git 履歴（〜9b840f4e9 以前）から再実装する。5 本の下書き記事（published:false）は残存。
- 301 redirect: `public/_redirects` の「reference-materials カテゴリ分離」セクション
