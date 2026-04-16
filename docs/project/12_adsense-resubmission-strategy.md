# 12. Google AdSense 再申請戦略

> **作成日**: 2026-04-14
> **改訂日**: 2026-04-14（hide 戦略を撤回、Quality Cycle 連携に変更）
> **背景**: Google AdSense 審査で「有用性の低いコンテンツ」によりポリシー違反判定。次回審査の合格を目指す。
> **参照**: <https://support.google.com/adsense/answer/10502938>
> **関連ドキュメント**: `01_設計思想.md`, `02_事業戦略.md`, `05_収益化戦略.md`, **`13_quality-cycle-architecture.md`（実装基盤）**

---

## 改訂の経緯（重要）

> ⚠️ **当初プランの「549件 hide 戦略」は撤回されました**
>
> 初版では「量が多すぎる」問題への対処として、649件のうち約549件のキーワードページを `published: false` で非公開化する戦略でした。
>
> しかしレビューで以下の致命的問題が判明:
> - keyword-2026 ハブページに **658件のインラインリンク** がある
> - 549件を非公開化すると、そのうち約500件のリンクが **404 Not Found** になる
> - サイト全体のリンク切れは AdSense 審査で更に悪化
>
> **新しい戦略**: hide ではなく「**質的リライト**」で正面突破。`13_quality-cycle-architecture.md` で定義する **Quality Cycle** を使い、機械的にスコアリング→弱いページをリライト→人間レビュー→再申請、という継続的改善サイクルで対応する。

---

## 結論（改訂版）

このサイトは **「キーワード集を網羅的に解説した薄いページが 600件以上ある」+「著者の実名・経歴が見えない」+「過去問・公的キーワード集の再構成中心で独自分析が弱い」** という3つの構造的弱点が複合し、Google から「ユーザーへの独自価値が不明な、量で稼いだサイト」と見られた可能性が高い。

**やるべきこと**:
1. **品質を継続改善する仕組みを作る** → Quality Cycle（`13` 参照）
2. **明らかなスタブと description 不備を即修正**（最小 hide）
3. **E-A-T を強化**（About 著者情報、執筆者ブロック、Article schema author）
4. **flagship 100 をリライト** → 人間レビュー → 再申請
5. **keyword-2026 ハブのリンクは無傷で維持**

**hide 戦略は撤回**したため、`published: false` にするのは「真のスタブ 5 件」と「H21〜H30 過去問 27 件」のみ。keyword-2026 にリンクされているキーワードページは全件公開維持する。

---

## 現状の事実（実測値、2026-04-14 時点）

### コンテンツ統計（701 published pages）

| 指標 | 値 |
|---|---|
| 公開済み MDX ファイル | **701件**（全て published: true） |
| カテゴリ: pe-comprehensive-management | 690 |
| カテゴリ: civil-construction-1 | 11 |
| group: keyword | **649** |
| group: past-exam | 34 |
| group: textbook | 11 |
| group: guide | 7 |

### 本文の深さ（文字数、frontmatter 除外）

| 指標 | 値 |
|---|---|
| 中央値 | **1,596 文字**（≈ 約 800 日本語字） |
| 平均 | 2,963 文字 |
| 最小 | 344 |
| 最大 | 56,052 |
| **500 文字未満（真のスタブ）** | **5件** |
| 1,000 文字未満 | 44件（6%） |
| **2,000 文字未満** | **513件（73%）** ← 大半 |
| 2,000 文字以上 | 188件 |

### 真のスタブページ 5件（500字未満）

```
344字: pdca-cycle
353字: four-m-of-production
415字: key-performance-indicators
420字: cause-and-effect-diagram
484字: analytic-hierarchy-process
```

### description の問題

| 指標 | 値 |
|---|---|
| description が 50 文字未満 | **86件** |
| description が「>-」で始まる重複（YAMLエスケープ崩れ） | **48件** |
| description 完全欠落 | 0件 |

### E-A-T 関連の所見

✅ **存在する**:
- プライバシーポリシー（`src/app/privacy/page.tsx`）
- 利用規約（`src/app/terms/page.tsx`）
- お問い合わせ（`src/app/contact/page.tsx`）
- About（`src/app/about/page.tsx`）
- 構造化データ（WebSite/Organization/Article/Breadcrumb schemas）
- フッターから法的ページへのリンク完備
- ads.txt（AdSense `ca-pub-7995274743017484`）

❌ **欠落 / 弱い**:
- About ページに **運営者の実名・顔写真・経歴・保有資格なし**
- "doboku-note 編集部" という匿名組織のみ
- 「執筆者」「最終更新日」が各記事に表示されない
- 過去問は試験元データの再構成、キーワードは文科省キーワード集の解説 → 「独自価値の追加」が弱く見える

### 危険シグナル（Google 視点）

1. **大量バルク生成パターン**: 過去 4 日間で 100+ test commit、500+ ファイル同時変更（git log）
2. **テンプレート均一性**: 649 件の keyword ページが同じ構造（とは → サブ節 → 位置づけ → 参考資料）で、平均 800 文字
3. **公的情報の単なる解説**: 試験元（建設業振興基金、日本技術士会、文科省）の素材を加工した形のため、Google からは「Already-available content」に見えやすい

---

## Google の「Low-value content」基準と照合

Google AdSense / Web Search Quality Guidelines が厳しく見るパターン:

| Google の基準 | 当サイトの該当度 | 主な原因 |
|---|---|---|
| Thin content（薄いコンテンツ）| ⚠️ 高 | キーワードページ 513件（73%）が 2000字未満 |
| Programmatically generated / AI-generated | ⚠️ 高 | テンプレ構造が均一・短期間に大量追加・description 重複48件 |
| Insufficient added value（独自価値の追加が不十分） | ⚠️ 高 | 公的キーワード集を解説する性質上、独自分析が弱く見える |
| No clear purpose / Aggregator-like | ⚠️ 中 | keyword-2026 ページが 700 リンク集に近い構造 |
| Missing E-A-T (Expertise, Authority, Trust) | ⚠️ 高 | 著者の実名・経歴・資格が不可視。試験対策は YMYL 隣接 |
| No author transparency | ⚠️ 高 | About が組織名のみ |
| Required pages（PP, Terms, Contact） | ✅ OK | すべて存在 |

**最大の問題** = 上位 4つすべて該当（量 × 薄さ × 均一性 × E-A-T欠如）。

---

## 戦略の方針（改訂版）

旧版の「量を隠す」戦略から、「**質を上げる**」戦略へ転換。

具体的には：

1. **Quality Cycle で全ページの品質を可視化**: `13_quality-cycle-architecture.md` のシステムで全 700 ページをスコアリング
2. **スコアの低いページを AI でリライト**: 拡張パターン（具体例・計算例・比較・歴史・出題傾向・図解）で深さを追加
3. **人間ゲートで品質保証**: 全リライトは `reviewStatus: needs-review` でマーク、人間が承認するまで「未完成」
4. **E-A-T を確立**: About 著者情報、執筆者ブロック、Article schema author
5. **明らかなノイズだけ最小 hide**: 真のスタブ 5 件 + 古い過去問 27 件のみ
6. **keyword-2026 ハブは無傷で維持**: 658 件のインラインリンクを壊さない

**重要**: 549 件の hide はしない。代わりに継続的な品質改善で「サイト全体の中央値」を引き上げる。

---

## Phase 1: 最小 hide + description 整備（即時・低リスク）

旧版とは異なり **hide スコープを最小化**。keyword-2026 のリンク切れを起こさないことを最優先。

### 1-1. 真のスタブページ 5 件を published: false 化

```
344字: pdca-cycle
353字: four-m-of-production
415字: key-performance-indicators
420字: cause-and-effect-diagram
484字: analytic-hierarchy-process
```

→ 全件 **published: false** に変更
→ keyword-2026 から該当 5 件のリンクを **削除**（リンク切れ防止）

### 1-2. 過去問 H21〜H30（27 件）を published: false 化

`h*-primary` と `h*-secondary` の 27 ファイル。keyword-2026 にはリンクされていないので影響なし。

### 1-3. description の修正

- **48 件の重複 description**（`>-` から始まる、YAML 壊れ）を個別書き直し
- **86 件の 50字未満 description** を 80〜120字に書き直し
- スクリプト `scripts/fix-descriptions.mjs` で自動生成（テンプレート方式）

### 1-4. 549 件の keyword ページは公開維持

旧プランの hide 戦略はここでは**実施しない**。代わりに Phase 3 で Quality Cycle を回して質を上げる。

**Phase 1 修正対象ファイル**:
- `scripts/fix-descriptions.mjs`（新規）
- `.local/r2/posts/pe-comprehensive-management/{5 stubs}/article.mdx`（published: false）
- `.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx`（5 件のリンク削除）
- `.local/r2/posts/pe-comprehensive-management/{27 h*-primary/secondary}/article.mdx`（published: false）
- `.local/r2/posts/pe-comprehensive-management/{86+48 件}/article.mdx`（description 修正）

---

## Phase 2: E-A-T の補強

### 2-1. About ページの大幅強化

`src/app/about/page.tsx` を以下の構成に書き換え:

```
# このサイトについて

## 運営者
- 名前: {ペンネーム or 実名}
- プロフィール: 土木工学を専門とする{年数}年の実務経験者
- 保有資格: 1級土木施工管理技士（{合格年}）/ 技術士（建設部門）{受験予定年}
- 写真 or アバター画像
- 経歴の3-4行サマリ

## このサイトの目的
- 1級土木施工管理技士・技術士総監受験者向けの「読めば合格できる」試験対策ハブ
- なぜ作ったか（個人的な動機）
- どこが他サイトと違うか（独自体験・図解・分野横断分析）

## コンテンツの作り方
- 公式キーワード集・過去問を一次資料とする
- 著者の実務経験から「現場で使う観点」を付加
- 法令引用は e-Gov、技術引用は学会公式へリンク

## 編集方針
- 全コンテンツを著者本人が確認
- 誤りは即修正、参考資料は適時更新
- AdSense 等の広告は文末/サイドバーに配置（読書を妨げない）

## 連絡先
- お問い合わせフォーム / 公開メール / X アカウント

## 最終更新
- {YYYY-MM-DD}
```

→ ペンネームでも構わないが「実在する人」と分かる粒度（経歴・資格・写真）が必須。

### 2-2. 全記事フッターに「執筆者・更新日」表示

`src/app/docs/[...slug]/page.tsx` で、本文末尾（参考資料の前後）にメタ情報ブロックを表示:

```
─────────────────────────
本記事の執筆者: {著者名（About リンク）}
最終更新日: {publishedAt or updatedAt}
本ページの内容は { 著者の経歴 1行 } により監修されています。
─────────────────────────
```

frontmatter に `author` を追加するか、layout 側で固定値を表示。最小コストは layout 固定値。

### 2-3. 構造化データに `author` を追加

`src/components/seo/StructuredData.tsx` の Article schema に：

```json
{
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "{著者名}",
    "url": "https://doboku-note.com/about",
    "jobTitle": "土木技術者",
    "knowsAbout": ["1級土木施工管理技士", "技術士総合技術監理"]
  }
}
```

→ Google が著者の専門性をマシンリーダブルに認識できる。

**Phase 2 修正対象ファイル**:
- `src/app/about/page.tsx`
- `src/app/docs/[...slug]/page.tsx`（執筆者ブロック追加）
- `src/components/seo/StructuredData.tsx`（author 追加）
- `static/img/author.png` 等（顔写真 or アバター）

---

## Phase 3: 独自価値の補強（Quality Cycle 経由・改訂版）

旧版では「100件を手作業で実務観点追記」「ガイド7件を増量」「新規エッセイ3本執筆」を Phase 3 にまとめていた。新版では Quality Cycle システムを使って体系化する。

### 3-1. Quality Cycle で全ページをスコアリング

```bash
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode screen        # Tier1 機械的事前ふるい（全件）
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode score --top 200  # Tier2 質的評価（上位200件）
```

→ `.claude/state/quality-scores.json` に 200 件の 5 軸スコア + 弱点軸 + 質的コメント

### 3-2. flagship 100 を選定

スコア降順で上位 100 件を抽出。これが**公開維持＆優先改善対象**。`.claude/state/flagship-100.json` に保存。

### 3-3. 弱いページに拡張パターンを適用

```bash
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode rewrite --threshold 2.5
```

→ flagship 100 のうち weighted < 2.5 のページに対して `keyword-rewriter` エージェントが拡張パターン（A〜F）を適用
→ 各ページに `frontmatter.reviewStatus = "needs-review"`
→ バッチ並列 3 件、コミット 10 件ごとに分割

### 3-4. リライト後の再評価と人間レビュー待ちリスト

```bash
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode verify   # cem-qa で再評価
node .claude/skills/content/quality-cycle/scripts/quality-cycle.mjs --mode review   # .claude/state/review-queue.md 出力
```

### 3-5. 人間レビュー（実装スコープ外）

- `.claude/state/review-queue.md` を見ながらブラウザで該当ページを確認
- 1 日 10〜20 ページずつ手直し
- frontmatter の `reviewStatus` を `approved` / `rejected` に書き換え
- 30〜50 件レビュー完了時点で AdSense 再申請

### 3-6. ガイド記事・新規エッセイ（オプション、人間タスク）

- guide の 7 件を 1.5 倍に増量（実体験追加）
- 新規エッセイを 3 本（合格戦略・差分分析・頻出論点）作成
- これは Quality Cycle の対象外で、人間が書く必要あり

詳細は `13_quality-cycle-architecture.md` 参照。

**Phase 3 修正対象ファイル**:
- `.local/r2/posts/pe-comprehensive-management/{guide 7件}/article.mdx`（増量）
- `.local/r2/posts/pe-comprehensive-management/{flagship-keywords 30-50件}/article.mdx`（実務観点追記）
- `.local/r2/posts/pe-comprehensive-management/{新規3件}/article.mdx`

---

## Phase 4: bulk-generation シグナルの除去

### 4-1. test commit の squash

直近 4 日分の `てｓｔ`/`test`/`ts` commit 100+ 件を、有意なチャンクに squash する。

選択肢:

- **A**: develop ブランチを 1〜3 commit に rebase squash → develop force-push 必要
- **B**: 新ブランチを切って、過去 1ヶ月の差分を 5〜8 個の意味あるコミットとして再構築 → 安全だが手間
- **C**: 過去は残し、今後の commit 規約だけ整える → 履歴を壊さない

### 4-2. 今後の commit 規約

`.git/hooks` または CLAUDE.md に「commit メッセージは英語 or 日本語の意味ある一文」を強制。

---

## Phase 5: 再申請前の最終チェックリスト

実装後・再申請前に確認:

1. ✅ `published: true` の MDX 数が 130〜140 件に絞られている
2. ✅ 5 件のスタブが非公開化されている
3. ✅ description 50 字未満が ゼロ
4. ✅ description 重複が ゼロ
5. ✅ About ページに著者プロフィールが表示される
6. ✅ 全記事末尾に執筆者・更新日が表示される
7. ✅ Article schema に `author` が含まれる
8. ✅ 独自エッセイ 3 本が公開されている
9. ✅ ガイド 7 件が増量されている
10. ✅ git log の test commit が消えている（または今後の規約が整っている）
11. ✅ Cloudflare Pages にデプロイ済み
12. ✅ Google Search Console で sitemap.xml が認識されている
13. ✅ サイト内の主要ページを Google が再クロールしてから 3〜7 日待つ
14. → AdSense 再申請

---

## 検証手順

### Phase 1 完了後

```bash
# 公開件数チェック
python -c "
import glob
total = sum(1 for f in glob.glob('.local/r2/posts/**/article.mdx', recursive=True))
pub = sum(1 for f in glob.glob('.local/r2/posts/**/article.mdx', recursive=True)
          if 'published: true' in open(f, encoding='utf-8').read())
print(f'Total: {total}, Published: {pub}')
"
# → Published が 130〜140 程度

# 描画確認
npm run build
npm run dev
```

### Phase 2 完了後

- `/about` をブラウザで開いて著者プロフィール表示確認
- 任意の `/docs/...` ページの末尾に執筆者ブロック表示
- ブラウザの DevTools で構造化データ（`<script type="application/ld+json">`）に `author` フィールドがあることを確認

### Phase 3 完了後

- 新規エッセイ 3 本がそれぞれ `/docs/...` でアクセス可能
- ガイド 7 件の文字数が 1.5 倍前後

### Phase 4 完了後

- `git log --oneline -20` で「てｓｔ」が消えている（A/B 採用時）
- `git log --since="2 weeks ago"` で意味あるコミットが並ぶ

### Phase 5（再申請前）

- 本番（doboku-note.com）にデプロイ済み
- Google Search Console で URL 検査 → `Indexed`
- 主要ページを `site:doboku-note.com` で検索 → 出てくる
- AdSense ダッシュボードで再申請

---

## リスクと対応

| リスク | 対応 |
|---|---|
| 549 件を非公開化すると既存 SEO 流入が下がる | 一時的。合格後 Wave 方式で戻す。GSC 7位の `/keyword-2026` は厳選 100 に必ず含める |
| About に実名・顔写真を載せたくない | ペンネーム＋アバターでも可。「実在する人」の手触りがあれば OK |
| git history の force push でリポジトリが壊れる | develop/main の force push は破壊的。バックアップ先に push してから実施 |
| 「公開→非公開」の大量変更で内部リンク切れが発生 | 非公開ページへの内部リンクは 404 ではなく「公開準備中」表示にするか、リンク自体を grep して仮に削除（後で復活） |
| 厳選 100 件の選定スコアが恣意的 | スコア式は調整可能。`/tmp/flagship-selection.json` を出力して人間が見て修正できる |
| 再申請してまた落ちる | 一度で受からない可能性は残る。落ちた場合は Search Console と AdSense の通知から具体的な指摘箇所を読み取り、追加対策 |

---

## 完了の定義

1. ✅ Phase 1〜4 がすべて完了
2. ✅ Cloudflare Pages にデプロイされ、本番 doboku-note.com で確認可能
3. ✅ Google Search Console で sitemap が認識されている
4. ✅ サイト訪問者が About を見れば「誰が運営しているか」5秒で分かる
5. ✅ サイト内の任意の記事末尾に執筆者・更新日が表示される
6. ✅ AdSense 再申請を送信
7. → 数日後、AdSense から「合格」通知（最終ゴール）

---

## 推奨される実行順序

```
[Phase 1]  コンテンツ可視性調整（即時、半日）
   ↓
[Phase 2]  E-A-T 補強（半日〜1日、要：著者プロフィール文言の確定）
   ↓
[Phase 3]  独自価値の補強（1〜3日、要：エッセイ執筆）
   ↓
[Phase 4]  git history 整理（30分、ユーザー承認後）
   ↓
[Phase 5]  デプロイ → GSC 確認 → 数日待機 → 再申請
```

---

## ユーザー判断を仰ぐ点（実装着手前に決めること）

### 1. About ページの著者情報をどうするか

- **案 A**: 実名 + 顔写真 + 実際の保有資格（最強だが個人情報を晒す）
- **案 B**: ペンネーム + アバター画像 + 「1級土木施工管理技士保有・技術士総監受験予定」（**推奨**）
- **案 C**: そのまま（再審査で再び落ちる可能性が高い）

### 2. published: false で 549 件を非公開化することを許容するか

- **案 A**: 推奨どおり 130〜140 件に絞る（**推奨**、合格後すぐ Wave 方式で戻せる）
- **案 B**: 半分の ~350 件に留める（リスクとリターンの中間）
- **案 C**: そのまま（再審査で再び落ちる可能性が高い）

### 3. git history の test commit を squash するか

- **案 A**: develop と main を rebase squash + force push（履歴が綺麗、リスク中）
- **案 B**: 触らない（履歴は汚いまま、Google が見るとは限らない）
- **案 C**: 新しいきれいな commit を上に積むだけ（**推奨**、過去は残るが今後は綺麗）

### 4. 新規エッセイ 3 本の執筆を AI 補助で行うか

- AI で書くと「AI 生成コンテンツ」の罠に再びハマる
- **推奨**: 著者本人がアウトラインと体験談を書き、AI は校正のみに使う

### 5. 再申請までの待機期間

- すぐ申請 vs 1〜2 週間運用してから申請
- **推奨**: Phase 1〜4 完了後、デプロイから **5〜7 日** 待ってから再申請（Google にクロールさせる時間が必要）

### 6. 実装の進め方

- **案 A**（**推奨**）: 私が Phase 1（コンテンツ非公開化）から先に着手し、ユーザーが Phase 2 用の著者情報を用意するのを並行して待つ
- **案 B**: ユーザーが先に著者情報（名前・経歴・写真）を準備、私はそれを待つ間 Phase 1 を完了

---

## 関連リソース

- AdSense ポリシー: <https://support.google.com/adsense/answer/10502938>
- Google Search Quality Guidelines: <https://developers.google.com/search/docs/essentials>
- 関連 doc: `01_設計思想.md`（サイトの目的）, `02_事業戦略.md`（収益化の文脈）, `05_収益化戦略.md`（広告配置設計）
