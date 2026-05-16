---
title: 2026-05-17 国土交通白書R7×テーマ別トレードオフ×過去問適用 8記事プロジェクト完成（W1+W6前倒し+仕上げ）
date: 2026-05-17
session_focus: NotebookLM思考プロセスのサイト展開、合格体験ポジション(v3戦略)中核資産の構造完成
related_memory:
  - project_mlit_theme_articles
  - project_v3_strategy
  - feedback_pe_essay_template_axis
related_commits:
  - 7e01ae2e4  # W1: stub + 雛形
  - 0ba54233f  # 8記事 published + SVG 8枚
  - 37ff1adb1  # W6前倒し: 過去問/キーワード逆リンク + note CTA infra
  - cade20701  # 仕上げ: 5ピラー×7テーマ動線 + primary逆リンク135件
  - e593fd42d  # lint LOW 解消
---

# 2026-05-17 セッション引き継ぎ — 白書テーマ記事群プロジェクト完成

## 何が起きたか（1 行）

運営者本人が NotebookLM で得た「国土交通白書 → 5管理間トレードオフ → 解決フレーム → 過去問適用」の思考プロセスを、6 週間スケジュール想定の **W1 + W6 + 仕上げ作業を 2 セッション（前日 + 本日）で完遂**し、サイト構造として完成させた。

## プロジェクト位置づけ（v3 戦略中核）

- **memory [project_v3_strategy]**: 運営者が 2026-07 総監2次筆記受験、「合格体験ポジション」を中核差別化
- **memory [feedback_pe_essay_template_axis]**: テーマ×5管理×専門部門の3D構造で設計
- **memory [project_mlit_theme_articles]**: 本プロジェクトの状態管理（W6 仕上げまで完了を記録済み）

競合（資格学校・他ブログ）は「正解」を売るが、運営者本人が今まさに本番受験生として思考プロセスを公開できるのは doboku-note だけ。E-E-A-T の "E"（Experience）の真打ち。

## 本日の commit（5件）

| Commit | 種別 | 内容 |
|---|---|---|
| `7e01ae2e4` | site(cem) | W1完了: 8記事 stub + frontmatter + scripts + 上位ハブ化 |
| `0ba54233f` | site(cem) | 8記事 `published: true` 切替 + SVG図版8枚追加 |
| `37ff1adb1` | site(cem) | W6前倒し: 過去問5secondary逆リンク + キーワード8件逆リンク + note CTA infra接続 |
| `cade20701` | site(cem) | 仕上げ: 5管理ピラー13リンク + primary7本に135 Callout注入 + lint整備 |
| `e593fd42d` | chore(cem) | tags.json 4タグ追加で lint LOW warning を全クリア |

## 完成した動線網

```
[白書ハブ mlit-whitepaper-2025]
        ↕
[7 テーマ記事 essay-mlit-*]  ←→ [5 管理ピラー (SeeAlso 13リンク)]
        ↕                              ↑
[過去問 12本: primary 7 (Callout 135) + secondary 5]
        ↕
[フレーム系キーワード 8件 (関連テーマ記事セクション)]
        ↕
[note 有料 5マガジン (frontmatter駆動 自動配置)]
```

## 数値で見る成果

| 領域 | 件数 |
|---|---|
| 新規ページ | 8 (白書ハブ + テーマ 7) |
| SVG 図版 | 8 |
| 5ピラー → テーマ SeeAlso | 13 リンク |
| 過去問 → テーマ Callout | 140 件 (primary 135 + secondary 5) |
| キーワード → テーマ動線 | 16 リンク (8 キーワード) |
| note CTA 自動配置 | 8 テーマ全件 |
| tags.json 追加 | 18 タグ |
| lint 警告 | HIGH 0 / MEDIUM 0 (新規分) / LOW 0 |

## 新規・修正された資産

### 新規 MDX (8 記事)
- `.local/r2/posts/pe-comprehensive-management/mlit-whitepaper-2025/article.mdx` (白書ハブ)
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-aging-infrastructure/article.mdx`
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-construction-2024/article.mdx`
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-river-basin-management/article.mdx`
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-green-transformation/article.mdx`
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-i-construction-2/article.mdx`
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-infrastructure-group-mgmt/article.mdx`
- `.local/r2/posts/pe-comprehensive-management/essay-mlit-foreign-workers/article.mdx`

### 新規 SVG (8 図版)
- 全 8 ディレクトリの `img/` 配下に主軸トレードオフ + 解決フレーム可視化
- viewBox 380x340 統一、モバイル視認性ルール準拠

### 新規スクリプト
- `.claude/scripts/inject-theme-backlinks.mjs` (テーマ→過去問 Callout 自動注入)

### 新規設定
- `.claude/config/theme-to-questions.json` (テーマ→過去問マッピング真実源、現在 149 件)

### 編集された既存資産
- `.claude/scripts/build-pillar-exam-questions.mjs` (EXCLUDE_SLUGS に 8 slug 追加)
- `src/config/tags.json` (18 タグ追加)
- `src/lib/magazine-placement.ts` (8 テーマ slug → note マガジン配置追加)
- `.local/r2/posts/pe-comprehensive-management/management-tradeoffs/article.mdx` (上位ハブ化 + MEDIUM 3件修正)
- 5管理ピラー 5本 (SeeAlso 13リンク追加)
- 過去問 12本 (Callout 140件挿入)
- フレーム系キーワード 8本 (関連テーマ記事セクション追加)

## 次にやるべきこと

### 即時 (本日中)
- [ ] **`/deploy` 実行** (develop に 5 commits 蓄積、未反映)
  - deploy 後検証: `curl https://doboku-note.com/docs/pe-comprehensive-management-mlit-whitepaper-2025 | grep -c '<main>'` → 1
  - 7 テーマ記事も同様に curl 確認
  - Cloudflare Pages ダッシュボードで HTTP 200 確認

### W2-W5 (受験者本人による本文執筆、AI 代筆禁止)
- [ ] テーマ記事 7 本の本文を順次充実
  - 「論文4ステップ適用例」セクション (対立構造 → 評価軸 → フレーム選定 → 残余リスク)
  - 「過去問適用パスポート」セクション (該当年度の設問単位解説)
  - 「5管理対立構造」本文の散文展開
- [ ] 1日1テーマペース、W5 (6/13-6/19) までに 7 本完成

### `theme-to-questions.json` の精度向上
- [ ] 各エントリの `note: "（要確認: AI推定）..."` を実際の論点で書き換え
- [ ] 過剰マッピングの整理 (green-transformation 45件、construction-2024 36件は過剰の可能性)
- [ ] 不足テーマの追加 (infrastructure-group-mgmt 3件、foreign-workers 7件は薄い)
- [ ] 精度向上後に `inject-theme-backlinks.mjs --apply --force` で Callout 再生成

### W6 (2026-06-26) 最終仕上げ
- [ ] テーマ記事に note CTA 実装 (現在は「公開時に UTM 付きリンク差し込み予定」プレースホルダ)
- [ ] `cem-qa` で 8 テーマ記事の 5 軸採点
- [ ] PageSpeed Insights で LCP/CLS 確認
- [ ] 受験準備への移行 (試験本番まで残り 1ヶ月)

### 7月 (試験本番、サイト凍結)
- サイト作業は凍結、受験者本人が試験に集中
- R8 出題後に「予想的中率」を note 記事で振り返り (合格体験ポジション強化)

## 守るべき制約 (memory より)

- ❌ AI による思考プロセス代筆禁止 (W2-W5 は受験者本人作業)
- ❌ R8 予想の Web 直接公開 (note 有料に隔離、信頼崩壊回避)
- ❌ 新規キーワードページ作成 ([no-new-keyword-pages])
- ❌ `/deploy` の AI 起動 (ユーザー判断)
- ✅ note と Web で重複技術解説禁止 (Red Line #5 / Web=フレーム、note=完成答案)
- ✅ MDX 書き込みは `writeMdxFile` 経由必須 (CRLF 保持)
- ✅ `git add` はファイル明示指定 (並列 sweep 事故防止 / memory [parallel-agent-commit-sweep])

## 参照リンク

- メモリ: [project_mlit_theme_articles](../../.claude/projects/-Users-minamidaisuke-doboku-note/memory/project_mlit_theme_articles.md)
- プラン: `.claude/plans/s-abundant-marble.md` (本日の plan 履歴)
- 既存 ハブ: `.local/r2/posts/pe-comprehensive-management/management-tradeoffs/article.mdx`
- 既存 関連戦略: `docs/project/02_コンテンツ/01_記述式コンテンツ戦略.md`、`02_採点ルーブリック方針.md`、`03_リライト方法論方針.md`
- 既存 essay-analysis 成果: `docs/project/02_コンテンツ/記述式分析/` (R07-R04 思考パターン 6 型)
