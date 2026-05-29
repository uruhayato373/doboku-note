---
title: 2026-05-18 M1「データ駆動戦略」+ essay-data-2026 撤回セッション
date: 2026-05-18
session_focus: note 有料マガジン M1 と関連サイトページ essay-data-2026 を全面撤回、Red Line #6 追加で再発防止
related_strategy: docs/note/noteコンテンツ計画.md
related_plan: ~/.claude/plans/eventual-swinging-key.md
---

# 2026-05-18 M1 撤回セッション 引き継ぎ

## 何が起きたか（1 行）

ユーザーの「essay-data-2026 不要では」「M1 マガジンも有料として成立しないのでは」の指摘から、M1「データ駆動戦略」（¥1,480、未投稿）と関連サイトページ essay-data-2026 を全面撤回。Red Line #6「未合格者は独自データ分析を有料販売しない」を新設して構造的に再発防止。

## 撤回の根拠（3 点）

### 1. 循環論証問題

M1 の核となる「18 論文 × 637 KW 機械分析」の **分析対象は運営者自身が書いた模範論文 18 編**。

- 「ゼネコン安全管理 23 回」は運営者がゼネコン論文を書く際に安全管理を主軸にしただけで、出題側（文部科学省）のシグナルではない
- 「環境調査会社で形式知 14 回・暗黙知 13 回」も運営者が SECI モデルを論点に選んだだけ
- つまり「データ駆動」の看板で売っているが、実質は **「自分が書いた論文を自分で分析した」自己参照** であり、購入者が気づくと信頼が崩壊する

### 2. 第 5 章「迷ったら知識」のゼロ価値結論

択一過去問 280 問 × χ² = 1.107 の結論は「**均等と矛盾しない、つまり偶然**」。
つまり ¥1,480 払って読むと「データを見たけど、やはり偶然でした、番号で当てる戦略は使えません」と言われるのが第 5 章丸ごと。章タイトル「迷ったら知識」の期待値と中身のギャップが詐欺的体験を生む。

### 3. 第 4 章が M3「R8 予想問題集」（¥2,480）と完全重複

R08 ホットテーマ Top 5（安全管理 × 2024 年問題 / DX × i-Con 2.0 / インフラ老朽化 等）は M3 でも展開予定。両方買う購入者は重複に気づき、リピート購入率が低下する構造的リスク。

### 加えて：未合格者が独自データ分析を売るリスク

運営者は 2026-07 受験中（未合格）。「未合格者がデータ駆動戦略を売る」構造は、不合格時に「分析対象の論文自体の信頼性破綻」が露見する。これは Red Line #6 として明文化し、同種の商品設計を構造的に禁止した。

## 本セッションで実施した作業（5 commit 構成予定）

### C1: noteコンテンツ計画書から M1 削除 + Red Line #6 追加（本 commit）
- `docs/note/noteコンテンツ計画.md`: M1 を dashboard / timeline / TODO / portfolio から削除、M1 詳細セクションを撤回記録に置換、Red Line #6 追加、price 表更新、completed magazine count 9 → 8 に修正、essay-data-2026 関連サイト連携記述を撤回ノートに書き換え
- `.claude/state/task-queue.json`: T-016 の notes 更新（M1 撤回ノート追加）、T-024 から essay-data-2026 への参照削除
- `docs/handoffs/2026-05-18-m1-withdrawal.md`: 本ファイル新規作成

### C2: essay-data-2026 サイトページ削除（次 commit）
- `.local/r2/posts/pe-comprehensive-management/essay-data-2026/` ディレクトリ全削除
- `.local/r2/posts/pe-comprehensive-management/r8-essay-keyword-forecast/article.mdx`: L33 本文内インラインリンク削除、L175 相当の RelatedKeywords エントリ削除
- `npm run refresh-indexes` で生成された `src/config/*.json` 変更を同 commit に含める

### C3: M1 マガジンディレクトリ削除（次 commit）
- `docs/note/magazines/data-driven-strategy/` 全削除
- `scripts/render-figure-data-driven.mjs` 削除
- `scripts/generate-magazine-covers.mjs` から data-driven-strategy 関連ブロック削除

### C4: src/lib から M1 配線解除（次 commit）
- `src/lib/note-magazines.ts` L111-124 ブロック削除
- `src/lib/magazine-placement.ts` の M1 関連ブロック削除（コメント / dataDriven 定数 / essay-data-2026 placement / r07-secondary sidebar）
- `npm run type-check` で TypeScript エラーがないことを確認

### C5: M3/M4 マガジン本文から参照削除（最終 commit）
- `docs/note/magazines/essay-template-3d/article.md`: L1406（essay-data-2026 link）削除、L1415（M1 推奨）削除
- `docs/note/magazines/r8-essay-forecast/article.md`: L592（essay-data-2026 link）削除

## 検証チェックリスト

- [ ] `npm run type-check` 通過
- [ ] `npm run refresh-indexes` で essay-data-2026 が backlinks/tag-dictionary から消える
- [ ] `npm run build` 全体ビルド通過
- [ ] `curl -I http://localhost:3020/docs/pe-comprehensive-management-essay-data-2026` → HTTP 404
- [ ] `grep -r "essay-data-2026" .local/ docs/ src/` → ノーマッチ
- [ ] `grep -r "data-driven-strategy" .local/ docs/ src/ scripts/` → ノーマッチ

## 残作業 / 注意事項

- `primary-statistics-2026/article.mdx` は既に `published: false` のため変更不要だが、L117/L122 の essay-data-2026 リンクは将来再公開時に備えて削除を推奨（本セッションでは見送り）
- `docs/handoffs/2026-05-18-r8-pe-double-track.md` の Phase 1 commit 8cdf9eda1 の記述「essay-data-2026 冒頭に M1 マガジン CTA 追加」は履歴であり改変不要（行われた事実の記録）
- `noteコンテンツ計画.md` の M1 セクション ID は欠番のまま維持し再利用しない（読み手が「M1 が抜けている」ことで撤回の存在を認識できる構造）

## 学び（Red Line #6 化の動機）

| 観点 | 内容 |
|---|---|
| 構造問題 | 未合格者が「独自データ分析」を商品化すると、データ自体の信頼性が著者の合格実績に依存する。これは構造的に成立しない |
| 売れるもの | 「他者の経験」「公式情報の整理（白書・キーワード集の編集）」「自分が書いた成果物そのもの（模範論文・予想問題）」のみ |
| 売れないもの | 「自分が書いたものを自分で分析した結果」「自分の経験則の数値化」「未合格時点での権威付けが必要な戦略書」 |

この区別を Red Line #6 として明文化したことで、今後の note 商品設計時に同種の誤りを構造的に防止できる。
