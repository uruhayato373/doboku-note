# 2026-07-14 カテゴリページ UI 刷新（アコーディオン共通化・過去問 ExamMatrix）

カテゴリページ UI の連続改善を実施し、本番反映まで完了。**残作業なし**（フォローアップは任意）。

> [!note] 状態
> 全て develop→main マージ・**本番デプロイ済**（`doboku-note.pages.dev` HTTP 200 検証済）。ブランチは `main`+`develop` のみのクリーン状態。

## 何を出したか

- **PR #395**（merged/deployed）— カードUI刷新: サイト全カード角丸ゼロ化（`--radius-card-*`）／カテゴリページ メインカラム白カード統一(A-1)＋人気記事を OGP サムネ縦リスト化(B-2)／件数バッジ・人気副題・集計期間の冗長テキスト削減／カリキュラムリスト説明文の縦積み化／**civil-1 分野別対策をテキスト章構成(PDF準拠)へ統合**（config `textbookChapters` に土工/コンクリート工/基礎工を新設・`fields` 廃止）
- **PR #397**（merged/deployed）— アコーディオン開閉アイコンを細線シェブロンに共通化（`DisclosureChevron` 新設・FAQCard/prose details/CurriculumList で共用）／テキスト章もくじ E-1 化（章番号 config `chapterNo`＋N記事＋右端シェブロン・分冊見出しの階層是正・閉状態プレビューは撤去）／**過去問テーブルを全資格共通 `ExamMatrix` 化**（desktop表/mobileチップリスト・`ExamChipLink` 共通チップ・4テーブル重複削除）
- **PR #393**（別セッションの eslint ^10 依存更新・merged/deployed）
- SSOT 同期: `design-system.md` に ExamMatrix/DisclosureChevron/E-1章もくじ/`--disclosure-chevron` トークンを反映（`2d88d385a`・develop のみ）

## 重要な知見（memory 抽出済み）

> [!warning] Tailwind の transform 変種が本 build で無効
> `group-open:rotate-90`（合成 transform）も `[transform:rotate(90deg)]`（arbitrary）もこの build で回転が効かない。アコーディオン回転は globals.css の `.disclosure-chevron`（素の CSS）で実装。→ [[reference_tailwind_transform_broken]]

- ブラウザペインの検証で `getComputedStyle` がトランジション中フレーム（identity）を返す測定アーティファクト。transition を無効化して最終値を測る → [[reference_browser_transition_measure_artifact]]
- 共有ワークツリーで並行セッションが `feature/*` を2度 reset する事故 → 隔離 worktree で cherry-pick して復旧（CLAUDE.md §10 の worktree 分離を再確認）

## フォローアップ（任意・急ぎでない）

- **Tailwind transform 変種の根因調査**（`@layer`/リセット順か）→ backlog 🟢 に起票済み
- 完全な `/doc-sync` 一括監査（design-system.md は手動同期済み）
