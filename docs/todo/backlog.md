# バックログ（タスクマスタ）

> **役割**: 優先度・時期問わず「いつかやる」タスクの全量を保持するマスタ。  
> 月初に `todo-planner` がここから `monthly.md` へ pull する。`monthly.md` 直下には書かない。  
> 各エントリは「発端・問題・対応方針・対象スコープ・実装ファイル」を含む。

---

## 凡例

| タグ | 意味 |
|---|---|
| 🔴 高 | 来月中に着手したい |
| 🟡 中 | 2〜3ヶ月以内 |
| 🟢 低 | 時期未定 |
| 🟣 判断待ち | ユーザーの意思決定が必要 |
| `[Codex候補]` | バルク処理向き・仕様が固まれば Codex で実施可 |

---

## カテゴリ一覧

1. [コンテンツ品質](#1-コンテンツ品質)
2. [UI / UX](#2-ui--ux)
3. [収益化（Kindle / note PDF）](#3-収益化kindle--note-pdf)
4. [エージェント・SSOT](#4-エージェントssot)
5. [SNS・マーケティング](#5-snsマーケティング)
6. [インフラ・セキュリティ](#6-インフラセキュリティ)
7. [ユーザー判断待ち](#7-ユーザー判断待ち)

---

## 1. コンテンツ品質

### 【解決済 2026-06-20】技術士総監 primary の解答・解説が過密 — 計算式・試験対策ポイントを整理

**結論**: 本項目は 2026-06-18 の折衷案決定（memory `pe-pastexam-answer-compromise`）で既に解消済み。現物照合の結果、h21〜r07 全 17 本とも ExamPoint は折衷案の形（summary＝引っかけ1行＋items 最大2項目）に圧縮済み、計算問題の KaTeX は「展開圧縮」ではなく**保持**が正（06-18 決定で目標反転）。当初 backlog の「KaTeX 1〜2行化／ExamPoint を引っかけ問のみに絞る」は失効。再作業不要。

<details><summary>当初の起票内容（参考）</summary>

**発端**: `https://doboku-note.com/docs/pe-comprehensive-management-r07-primary`。解答・解説（`<details>` 内）に教材レベルの計算導入文・KaTeX 数式・試験対策フレーズが入り込み「参考書の解説」化していた、という指摘。対象 `h21-primary`〜`h30-primary`＋`r04`・`r07`。→ 06-18 折衷案で per-option 検証は核（削ると thin content）と判断、ExamPoint は全廃せず圧縮、KaTeX は保持で確定。

</details>

---

### 1級土木 テキストページの品質改善 🟡

**問題**:
1. 頻出論点 Callout の内容が多すぎる — 箇条書き数を絞るか複数に分割
2. 記事冒頭に Callout が来る — 本文（概要・説明）を先に書き、Callout は中盤以降に

**対象**: `civil-construction-1` の textbook 系ページ全件

**対応**: `civil-construction-review` で一括監査 → `civil-textbook-rewriter` で修正。スキル: `/quality-cycle --profile civil-textbook`

**参考**: `https://doboku-note.com/docs/civil-construction-1-textbook-site-investigation`

---

### 2級土木（＋1級土木）ガイド記事の充実・SEO 強化 🟡

**発端**: `https://doboku-note.com/category/civil-construction-2` のガイド記事が内容薄い

**現状**: 全14本が 137〜262語。3,000文字以上が目標（現状の3〜5倍）

**やること**:
1. 既存ガイドの増量リライト（各 3,000文字以上）
2. seoTitle / description を検索意図に合わせて最適化
3. 内部リンク強化（ガイド → 過去問・テキストへの誘導）

**着手順**: `guide-exam-overview` を最初に 3,000文字超にリライト → 残りに展開

**担当**: `civil-textbook-rewriter` または新規 `civil-guide-rewriter`

---

### 過去問・テキストの図クロップ品質整備 🟡

**緊急度高（画像ゼロなのに「下図」参照あり）**:

| ページ | 図参照行数 | 画像枚数 |
|---|---|---|
| `civil-construction-2/primary-r03-kouki` | 5行 | 0枚 |
| `civil-construction-2/primary-r07-kouki` | 7行 | 0枚 |

**品質チェック未実施**:

| 分類 | ページ数 | 担当エージェント |
|---|---|---|
| 1級土木 primary（H26〜R07） | 16本 | `civil-exam-figure-auditor` |
| 2級土木 primary（R03〜R07） | 8本 | 未整備 |
| 1級土木 textbook | 10本 | `civil-construction-qa` |
| pe-first-stage（欠落疑い 4本） | 4本 | 未整備 |

**ソース PDF の所在**（2026-06-20 訂正）: 当初「PDF 不在でブロック」と誤記したが、実際は `docs/textbook/２級土木施工管理技士/過去問/R03〜R07/`（前期/後期/二次・正答付き）に全年度が存在。1級も `docs/textbook/１級土木施工管理技士/` 等にあり。`.claude/pdfs/` だけを見て早合点しないこと。

**着手順**:
1. ✅ **完了 2026-06-20**：2級 r03-kouki・r07-kouki に図クロップを追加（commit `c213be9af`）。`R03/R07_第一次検定_後期.pdf` を pdftoppm で 200dpi レンダリング→magick で crop+trim→webp(q80)。r03 5図（土留め工/水準測量/道路橋断面/工程表/管理図）、r07 7図（土の構成模式図/単純梁/力のモーメント/定常流れ管/基礎の種類/鋼道路橋/工程表）。下図参照数=ArticleImage 数で一致。
2. 1級 primary 16本を `civil-exam-figure-auditor` で一括監査（ソース PDF は `docs/textbook/１級土木施工管理技士/` を使用）
3. 2級 primary 残り（r04-r06・前期等）の図参照を同手順で点検・補完
4. pe-first-stage 4本の欠落疑いを確認・補完

---

### 【完了 2026-06-20】択一過去問の選択肢番号を `(1)(2)` → `1. 2.` に統一

**実施**: 行頭 `(1)〜(4)` を markdown 順序リスト `1.〜4.` に統一（commit `464016905`）。**実ファイル数は 34本**（1級 24本＝h26〜r07 各 a/b ＋ 2級 10本＝r03〜r07 各 zenki/kouki）で旧記載の「47本」は誤り。変換は **7,463 箇所**（旧記載の行数は正）。表内 `| (n)` セルは行頭が `|` のため対象外で保持。全角括弧・(5)以上・コードフェンスの不在を事前検査、全LF・U+FFFDなし、pre-commit MDX 検証 34/34 通過。スクリプトは `transformMdxFile`（EOL保持）使用。

<details><summary>当初の起票内容（参考）</summary>

**問題**: 問題文は `(1)〜` 形式、解説の `<details>` 内は `1. 2.` 形式という二重表記。**対象**: 1級土木 primary 37本（約4,392行）+ 2級土木 primary 10本（約3,071行）= 計47本・7,463行

**変換ルール**:
```
行頭 (1) → 1.  (2) → 2.  (3) → 3.  (4) → 4.
テーブル行（|で始まる行）はスキップ
```

**実装**: frontmatter 除外・テーブルスキップ・CRLF 保持（`writeMdxFile` 経由）。`past-exam-rewriter` または一括スクリプト。

</details>

---

### 【完了 2026-06-20】2級土木 二次過去問の `- （1）` 二重表記を修正

**問題**: 箇条書きマーカー `-` と全角括弧番号 `（1）` が二重に付いている。

```mdx
<!-- 現状 → 修正後 -->
- （1）工事名  →  （1）工事名
```

**対象**: `civil-construction-2/secondary-r03〜r07`（5本）+ `civil-construction-1/secondary-r07`（1本）= 計6本

**実施**: 6本144行の `- （n）` を `（n）` に修正（commit `9a1c48f37`）。ネストした `① ② …` のサブ項目は箇条書きとして保持。

---

### 1級土木 テキスト画像のカラー化 🟢

**背景**: textbook 系ページの画像を PDF 白黒図 → ChatGPT カラー化で差し替える。

**対象**: 画像を持つ textbook ページ 14本・約250枚

**手順概要**:
1. PyMuPDF で PDF 該当ページをレンダリング
2. ChatGPT GPT-4o（画像編集）でカラー化
3. 既存 web 検索画像と差し替え → `npm run generate-webp`
4. `npm run refresh-indexes` → コミット（R2 同期は CI が自動）

**パイロット**: まず `textbook-grader-compaction`（10枚）で手順確立

### pe-construction カテゴリページの過去問マトリクスをモバイル対応に刷新 🟡

**発端**: `https://doboku-note.com/category/pe-construction`

**問題**: `PeConstructionExamTable`（`src/app/category/[slug]/page.tsx` L588-646）が **12科目 × 7年度 = 8列テーブル**のマトリクスで、モバイルで以下の問題が生じる。
- 8列がビューポートに収まらず横スクロール必須
- 科目名が長い（「施工計画、施工設備及び積算」「河川、砂防及び海岸・海洋」等）のに列が多く窮屈
- 各セルの「問題」テキストリンクがタップ領域として小さい

**現状の実装**:
```tsx
// 12行（科目） × 最大8列（年度ヘッダ含む）のテーブル
// overflow-x-auto でラップしているが根本解決ではない
<th>科目</th><th>令和7</th><th>令和6</th>…<th>令和元</th>
<tr><td>必須科目I</td><td>問題</td><td>問題</td>…</tr>
<tr><td>施工計画、施工設備及び積算</td>…</tr>
```

**モバイル向け代替レイアウト（案）**:

| 案 | 内容 | 実装コスト |
|---|---|---|
| A. 縦積み＋年度ボタン | 科目を縦に並べ、各科目直下に年度ボタン（R01〜R07）を横グリッドで配置 | 低 |
| B. 科目タブ切替 | 科目タブを上部に並べ、選択した科目の年度リンクを表示 | 中 |
| C. レスポンシブ二重レイアウト | モバイル=案A・デスクトップ=現状マトリクスを CSS で出し分け | 中 |

**推奨**: 案C（デスクトップ現状維持・モバイルのみ縦積みグリッド）— 最小変更で UX 改善可能。

```tsx
{/* モバイル: 科目カード縦積み + 年度ボタングリッド */}
<div className="zenn-desktop:hidden space-y-4">
  {rows.map(subject => (
    <div key={subject.key}>
      <h4>{subject.label}</h4>
      <div className="flex flex-wrap gap-2">
        {years.map(y => doc ? <Link className="btn-year">{colLabel(y)}</Link> : null)}
      </div>
    </div>
  ))}
</div>
{/* デスクトップ: 現状マトリクス */}
<div className="hidden zenn-desktop:block overflow-x-auto">
  <table>…</table>
</div>
```

**実装ファイル**: `src/app/category/[slug]/page.tsx`（`PeConstructionExamTable` コンポーネント、L588-646）

---

### pe-construction カテゴリページのキーワード重複整理 🟡

**発端**: `https://doboku-note.com/category/pe-construction`（公開記事 121本）

**問題**: 同一テーマを「論点記事」と「キーワード集」の2種類で別 slug に作っているため、カテゴリページで見ると重複して見える。読者から区別しにくく、内部リンクも分散する。

**重複グループ（必須科目I テーマ別）**:

| テーマ | 論点記事 slug | キーワード集 slug |
|---|---|---|
| 防災・国土強靱化 | `bosai-kokudo-kyoujinka` | `bousai-genseigai-ronbun-keyword` |
| インフラ維持管理 | `infra-roukyuuka-iji` | `iji-kanri-ronbun-keyword` |
| 担い手確保・DX | `ninaite-kakuho-seisansei`・`kensetsu-dx` | `ninaite-dx-ronbun-keyword` |
| カーボンニュートラル | `carbon-neutral-kensetsu` | `datsutanso-kankyo-ronbun-keyword` |
| 地域づくり | `kokudo-keisei-chiiki` | `chiiki-dukuri-ronbun-keyword` |

**その他の問題**:
- slug 表記ゆれ: `bosai` vs `bousai`（ヘボン式と訓令式混在）、`chiiki-dukuri`（`tsukuri` の誤記の可能性）
- 選択科目キーワード集（`*-ronbun-keyword`）が river-coast・road・urban-planning の3科目のみで不完全（geotechnical・tunnel・railway 等は欠落）
- 受験ガイド系: `secondary-study-method`（勉強法）と `gakushuu-jikan-schedule`（勉強時間）がターゲット完全一致

**整理の方針（案）**:
- **A. 統合**: 各テーマの2記事を1本に合体（slug は論点記事側を維持、キーワード集をリダイレクト）
- **B. 差別化明確化**: タイトル・description で「論点：論述の骨格」vs「キーワード：用語リスト」を明示し、相互リンクを張る
- **C. カテゴリページでグループ表示**: 同一テーマの記事を「シリーズ」としてまとめて表示する UI を実装

**ユーザー判断が必要**: A（削減）か B（並存・整理）か。SEO 的には統合が有利、コンテンツ量的には分離が有利。

**着手前に確認**:
- 各記事の GSC インプレッション・クリック数（検索流入が多い方を残す）
- 内部リンク被リンク数（backlinks.json で確認）

---

### トップページ下部（note 教材・アフィリ・書籍）のデザイン統一 🟡

**発端**: `https://doboku-note.com/` のフッター直上に3セクションが後付けで積み重なっていてサイトデザインと不整合。

**現状の問題点**（`src/app/page.tsx` L142-172）:

```
Hero → ExamCards → LatestArticles → AboutSection
↓ ここから後付けのアドホックセクション
[note 有料教材]  MagazineSidebarCard（サイドバー用コンポーネント）を max-w-sm 左寄せで配置
[アフィリエイト] SchoolAffiliate をそのまま max-w-3xl に配置
[参考書籍]       BookSection "総監受験の参考書籍"（トップなのに総監限定タイトル）+ BookCard
↓ Footer
```

1. **`MagazineSidebarCard` をメインカラムに使っている** — サイドバー用コンポーネントが本文幅に配置されて `max-w-sm` 左寄せになり、前後のフル幅セクションと不整合
2. **セクションヘッダーのスタイルがバラバラ** — "Premium" ラベル（`font-mono text-[10px]`）が他セクション（Hero・ExamCards 等）の見出し設計と異なる
3. **参考書籍のタイトルが資格固定** — "総監受験の参考書籍" はトップページ（全資格横断）のコンテキストに不適
4. **`BookCard` は休止中** — アフィリエイト審査未通過なのに表示されている（別バックログ「BookCard 休止対応」と重複・連動）

**やりたいこと**:
1. 3セクションをまとめて **1つの "教材・リソース" セクション**に統合し、サイトの他セクションと同じデザインシステム（デザイントークン・余白・見出し階層）で設計し直す
2. `MagazineSidebarCard` → トップページ用の **横幅フルの CTA カード**（`MagazineFeatureCard` 等・新規 or 既存コンポーネント流用）に置き換え
3. `BookCard` はアフィリエイト審査通過まで非表示（「BookCard 休止対応」バックログと同時対応）
4. スクールアフィリエイト（`SchoolAffiliate`）も同セクション内に統合して視覚的なまとまりを作る

**実装ファイル**:
- `src/app/page.tsx`（L142-172 を再設計）
- `src/components/ui/MagazineSidebarCard/`（または新規 Feature 版コンポーネント）

**備考**: デザイン反復は develop/ローカル(:3020)で実施し、ユーザーが確認してから develop push（毎回本番 deploy しない）。

---

### 【解決済 2026-06-20】公開済み note 記事のライブ CTA 価格

**当初の想定（誤り）**: 約29本のライブ CTA が ¥14,800 のまま、と推定していた。

**API 診断の実態**: 公開済み記事のライブ body を `note.com/api/v3/notes/<id>` で全数診断した結果、**「完全パック（¥価格）」のテキストを持つライブ記事は na030d9cb3060（2026-06-20 公開）の1本だけ**。他の公開済み記事は CTA が「説明文＋埋め込みカード（価格テキスト無し）」形式で公開されており、価格陳腐化が無い＝修正不要だった。当該1本は Phase U-B で ¥9,800 へ修正済（API hasOLD=false 検証）。**→ 本タスクはクローズ**。

---

### ~~総監 R8予想6本の有料エリア内「旧3ペルソナ個別マガジン導線」を完全パック＋もくじへ置換~~ ✅ 完了（2026-06-20）

**対象 noteId**: n5116639ee21f（資源循環）/ naace4eeaa230（老朽化インフラ）/ n0c52cfabab78（経済安全保障）/ nf12d75c3e606（災害復旧）/ n05314b15b375（気候変動適応）/ nb4e6f088f0e8（AI社会）。

**実施**: 各記事末尾有料領域の旧3ペルソナ導線（道路担当/ゼネコン/河川コンサル）を**完全パック m171222175fac + 総監もくじ n3ed4c77ceed6** へ Phase U-B 置換。**6/6 ペイウォール完全保持**（price=700・can_read=false・remained>0・`boundaryBeforeExam=true`）＋新カード反映＋旧mag消失を API + 編集DOM再読で実体検証。**実害なし→慎重に完遂**（一括 bulldoze せず偵察→1本検証→残5本）。スクリプト＝`.tmp/fix-r8-funnel.mjs`。手順詳細は weekly.md W26 メモ参照。

**実装の学び**: ①note の embed マガジンカードは block `<FIGURE>`＝範囲一括 Range Delete だと ProseMirror が残カードを出す → **旧ブロック固有シグネチャで1ブロックずつ Delete**（本文を巻き込めない自己限定）が正。②note は**公開記事でも編集をドラフト auto-save する**（abort 後に再開すると新内容が残る）→ 冪等チェックで「新内容あれば保存のみ」分岐が要る。③有料記事の保存は「公開に進む（保存中で navigation を奪われるので polling）→ 有料エリア設定で境界を H2 直前へ再設定+`boundaryBeforeExam` 検証 → 更新する → 通知いいえ」。

---

## 2. UI / UX

### 過去問ページの右サイドバー目次（TOC）を廃止し最適な UI/UX に置き換える 🟡

**問題**: `primary`/`secondary` の TOC が 67件の問番号羅列になりナビゲーションとして機能していない。`pastExam`（CEM 択一）は既に非表示 ✅ だが、1級・2級土木の `primary`/`secondary` は TOC が出たまま ❌。

**実装箇所**: `src/app/docs/[...slug]/page.tsx` L.734

**推奨方針**:
- 短期: `primary`/`secondary` も TOC 非表示（条件に `&& docGroup !== 'primary' && docGroup !== 'secondary'` 追加） — **✅ 実装済 2026-06-20 [PR #266](https://github.com/uruhayato373/doboku-note/pull/266)（develop へマージ待ち）**
- 中期: 問番号ナビゲーター `ExamQuestionNav`（Q1〜Q65 のグリッドボタン）を `primary` 専用に実装 — 未着手

**新規コンポーネント**: `src/components/ui/ExamQuestionNav/ExamQuestionNav.tsx`

---

### 関連記事セクションのレイアウト統一 — MDX 直書きを廃止し `RelatedArticles` コンポーネントへ全面移行 🟡

**発端**: `https://doboku-note.com/docs/pe-construction-bousai-genseigai-ronbun-keyword`

**問題**:
- `## 関連記事` / `## 関連コンテンツ` が MDX 内に直書きされていて、`prose-blog` の中に plain markdown（見出し + リンク箇条書き）として流れ込む。コンポーネント化されておらず、記事によってレイアウトがバラバラ。
- `<article>` の中に入るか外に出るかも記事によって異なり、視覚的な一貫性がない。

**対象（計27本）**:

| カテゴリ | 件数 | 節名 |
|---|---|---|
| `pe-construction`（建設部門キーワード等） | 22本 | `## 関連記事` |
| `civil-construction-2`（2級土木 primary/secondary） | 3本 | `## 関連コンテンツ` |
| `civil-construction-1`（1級土木） | 2本 | `## 関連コンテンツ` |

加えて `civil-construction-2/primary-r*` は `<RelatedKeywords>` で他の過去問ページを指していて、リンク先も誤っている。

**やること**:
1. **MDX から削除**: 27本すべての `## 関連記事` / `## 関連コンテンツ` 節を一括削除
2. **コンポーネント実装**: `RelatedArticles`（新規）を page.tsx レイヤーで実装。frontmatter の `category` + `tags` から同カテゴリ近傍ページをカード形式で自動生成。全資格・全記事種別で共通使用。
3. **配置**: `<article>` の外（DocCard の下・AuthorCard の前）に固定配置。MDX に依存しない。
4. **`<RelatedKeywords>` のリンク先修正**: 2級土木 primary 各設問のリンクをキーワード・テキストページへ修正（`past-exam-rewriter` 活用） — **✅ 完了 2026-06-20**：2級にはキーワード/テキストページが無いため、分野別ガイド（土工/コンクリート/法規/品質/工程の重要ポイント・全published）へ統一。対象は RelatedKeywords を持つ 4本（r03/r05/r06/r07-zenki、他年度過去問・1級過去問の級ミスマッチ・空items の誤配置を解消）。slug は doc-meta-index で実在確認。残る 1〜3（`## 関連記事`/`## 関連コンテンツ` の MDX 直書き廃止＋`RelatedArticles` コンポーネント化、27本一括削除は `[Codex候補]`）は未着手。

**新規コンポーネント**: `src/components/ui/RelatedArticles/RelatedArticles.tsx`

**実装ファイル**:
- `src/app/docs/[...slug]/page.tsx`（RelatedArticles を追加、既存の category 別条件分岐の後）
- 27本の MDX（一括スクリプトで `## 関連記事` 節を削除）`[Codex候補]`

---

### AuthorCard の資格別カスタマイズ + 右サイドバー配置 🟡

**問題**: `AUTHOR.noteLabel` / `AUTHOR.noteUrl` が全資格で総監リンクにハードコード（`src/config/author.ts`）

**やること**:
1. `AuthorCard` に `category` prop → `noteByCategory` マップで出し分け
2. 右サイドバー最上部に `AuthorCardCompact`（新規）を sticky で配置

**実装ファイル**:
- `src/config/author.ts`（noteByCategory マップ追加）
- `src/components/ui/AuthorCard/AuthorCard.tsx`
- `src/components/ui/AuthorCard/AuthorCardCompact.tsx`（新規）
- `src/app/docs/[...slug]/page.tsx`

---

### カテゴリページ右サイドバーに note リンクを追加 🟡

**問題**: 右サイドバーにアフィリエイト広告しかない。civil 以外のカテゴリは右サイドバー自体が存在しない。

**やること**:
1. 右サイドバーに `resolveCategoryMagazines` で取得したマガジン一覧を追加
2. 全資格カテゴリに右サイドバーを表示（`categoryMagazines.length > 0` を条件に拡張）

**実装**: `src/app/category/[slug]/page.tsx`

---

### カテゴリページ全面 UI 刷新：ブログカード化 + 全資格サイドバー 🟢

**参考**: ソーシャルPLUS ブログ（`docs/todo/reference-sites.md`）のブログカード一覧 + 右サイドバーデザイン

**やること**:
1. 記事一覧を `BlogDocCard`（サムネイル OGP 画像 + タイトル + 概要）に刷新
2. 右サイドバーを全資格カテゴリに拡張（上記と重複・同時実施）

**実装**: `src/app/category/[slug]/page.tsx`（DocCard → BlogDocCard、aside 条件拡張）

---

### 書籍アフィリエイト（BookCard）の休止対応 — page.tsx から削除する 🟡

**問題**: `https://doboku-note.com/docs/civil-construction-2-primary-r07-zenki` に「参考書籍」セクションが残っている。Amazon アソシエイト審査未通過のため PA-API リンクは生成していないのに表示が出ている。

**対応**:
- 短期: `page.tsx` の全 `<BookSection>` / `<BookCard>` ブロックをコメントアウト（36行）
- 中期: アソシエイト審査通過後 or もしも単独継続か判断して再設計

**実装ファイル**: `src/app/docs/[...slug]/page.tsx`（BookSection/BookCard 関連 36行）

---

## 3. 収益化（Kindle / note PDF）

### Kindle 出版（KDP）＋ note PDF 販売 — 択一式過去問集 全資格展開 🟢

**既存作業**: 戦略書 `docs/project/01_戦略/08_Kindle出版戦略.md`（3シリーズ設計済み）、スクリプト `scripts/build-takuitsu-reconstruct.mjs`（1ソース → EPUB/Markdown/印刷 HTML）完成。ハンドオフ: `docs/handoffs/2026-06-09-takuitsu-kindle-epub.md`

**3シリーズ設計**:

| シリーズ | 内容 | 状態 |
|---|---|---|
| A — 1級土木 論点別 | A-01〜A-06（安全/法規/施工/環境/品質/工程）¥350〜¥490 | A-01 EPUB試作完了 |
| B — 技術士総監 年度別 | B-01〜B-05（R03〜R07 各20問）¥350 | ジェネレータ設計待ち |
| C — 建設部門 二次模範解答 | C-01〜C-03（道路/河川/都市計画）¥690 | Web¥15k達成後 |

**次の一手**:
- (a) 表紙画像の用意（EPUB 未内蔵・KDP Cover Creator か JPEG 1600×2560）
- (b) 論点まとめの剪定（複合設問由来の混入を人手校正）
- (c) A-02「法規」の THEMES 定義追加 → EPUB 生成
- (d) epubcheck（Java 環境が必要）
- (e) KDP アカウント作成・税務情報（W-8BEN）登録

**note PDF 販売（従チャネル）**: Kindle Select 独占期間（90日）終了後に開始。同一ソースから印刷 PDF を生成し note 有料記事に添付（`/note-attach-pdf` スキルで添付可能）。価格は Kindle より若干高め（¥500〜¥1,480）。

---

### 土木施工管理技士 メンバーシップ設計 — 工事別記事 × 継続配信 × 添削 🟣

> **ステータス**: 着想段階。着手前に下記「分析が必要な軸」を決定してから実設計に入る。

**コンセプト**: 一時購入マガジンではなく **継続課金（メンバーシップ）**で受験者を長期サポートする。毎月・毎週「新しい工事の完成答案」を追加することで解約抑止・試験直前まで利用し続ける動機を作る。添削サービスで差別化する。

---

**既存の経験記述ラインとの関係**（`src/lib/note-magazines.ts` より）:

| 既存マガジン（一時購入） | 特徴 |
|---|---|
| `1級土木 施工経験記述｜工種×テーマ別 完成答案集（5管理）` | 複数工種×5管理の完成答案 |
| `2級土木 施工経験記述｜工種×テーマ別 完成答案集（安全・品質・工程）` | 同上（2級） |
| `1級土木 施工経験記述｜過去問 模範答案集（R03-R07）` | 年度別過去問の模範答案 |
| `2級土木 施工経験記述｜過去問 模範答案集（R03-R07）` | 同上（2級） |
| `1級土木 施工経験記述｜2テーマ組合せ大全（5管理 全10組合せ）` | 2テーマ必答形式対応 |

→ 既存は「答案を買って参考にする」スタイル。メンバーシップは「継続的に新答案が届き + 自分の答案を添削してもらえる」スタイル。競合より補完関係に設計できる可能性あり。

---

**メンバーシップ設計の軸（検討事項）**:

#### 1. コンテンツ構成: 工事別記事

経験記述は「具体的な工事」を書かないと評価されない。工種別にリアルな工事シナリオで書いた完成答案が継続価値になる。

追加候補の工種（優先度順）:
- 道路改良工事（最多受験者層）
- 河川改修工事（護岸・堤防）
- 橋梁上部工・下部工
- 舗装工事
- 上下水道管工事
- 法面工・切土・盛土
- 仮設工事（土留め等）
- 解体工事

毎月 **2〜3工種 × テーマ** を追加配信する想定（月8〜12答案）。

#### 2. 過去問分析の統合

受験年度・テーマ傾向を分析して「今年出そうな工事×テーマの組合せ」を優先して配信する。
- `src/config/civil-1-exam-questions.json`（H26〜R07・1162問）を活用
- 問1（経験記述）のテーマ出題傾向を集計 → 直前期に「今年の狙い目工種」レポートを配信

#### 3. 添削サービス

| 方式 | コスト | スケーラビリティ |
|---|---|---|
| A. 手動添削（フォーム受付→3日以内返答） | 時間コスト大・差別化高 | 月10〜20件が限界 |
| B. AI添削補助（Claude が初稿採点→運営者が確認→返却） | コスト中・半自動 | 月50〜100件 |
| C. セルフ採点キット（ルーブリック + AI フィードバック付きフォーム） | コスト低・差別化低 | 無制限 |

→ 初期は B（AI補助 + 運営者確認）から始めて品質を担保しながらスケールを見る。

#### 4. プラットフォーム選定

| 候補 | 月額課金 | 添削収受 | 運営コスト |
|---|---|---|---|
| **note メンバーシップ** | ◎ | △（DM経由） | 低（既存アカウント流用） |
| 独自 PWA | ◎ | ◎（フォーム実装） | 高（開発コスト大） |
| Substack | ◯ | △ | 中（英語UI） |
| Discord + Stripe | ◯ | ◎（チャンネル活用） | 中 |

→ 初期は **note メンバーシップ** が最速。月額 ¥980〜¥1,480 帯が既存購読者の抵抗感低い。

#### 5. 既存マガジンとの価格戦略

- 既存マガジン（一時購入）: ¥1,480〜¥2,480 → 「試し買い」エントリーとして維持
- メンバーシップ: 月額 ¥980〜¥1,480 → 「継続利用 + 添削付き」で年間 ¥11,760〜¥17,760
- 既存マガジン購入者 → メンバーシップ移行オファーで LTV 向上

---

**着手前に決める必要があること（分析 TODO）**:

1. **工事別の優先順位** — 受験者の業種分布・SNS アンケートで「あなたの経験工事は？」を取得
2. **添削の運用コスト試算** — 月何件まで B 方式（AI補助）でさばけるか実測
3. **note メンバーシップ vs 独自** — 既存 note フォロワー数・転換率の見積もり
4. **既存マガジンの年間売上推移** — メンバーシップに移行するより単品を売り続ける方が有利かの比較
5. **継続率モデル** — 試験日（2月・10月）に向けて加入→試験後離脱のサイクルをどう設計するか

**着手条件**: Web 月収 ¥15k 達成後 + 経験記述マガジン 月3件以上の安定売上確認後

---

## 4. エージェント・SSOT

### 記事構成ルールの SSOT 化 + サブエージェント管理 🟡

**背景**: ガイド記事の薄さ・Callout 配置の問題・導入なし冒頭など、記事品質の問題が個別に発覚している。

**やること**:

1. `article-structure-guide.md`（新設予定）を起草 — 記事の基本構成・文字数目標・Callout 使い方・見出し構成・CTA の型。たけブログ（`docs/todo/reference-sites.md`）の知見を反映。
2. `todo-writing-guide.md`（新設予定）を起草 — todo 記述フォーマット・優先度表記・グループ定義。`todo-planner` エージェントがこれを参照して weekly.md を書く。
3. `civil-guide-writer` エージェントを新設 — `article-structure-guide.md` を真実源として参照。
4. `todo-planner` エージェントに `todo-writing-guide.md` と `backlog.md` の参照を追加。

**SSOT 分割**:

| ファイル | 参照エージェント |
|---|---|
| `docs/reference/article-structure-guide.md`（新設予定）<!-- doc-ref:ignore --> | `civil-guide-writer` / `civil-textbook-rewriter` / `keyword-rewriter` |
| `docs/reference/todo-writing-guide.md`（新設予定）<!-- doc-ref:ignore --> | `todo-planner` |

**着手順**:
1. `docs/reference/article-structure-guide.md` を起草（Claude Code でドラフト → ユーザーレビュー）<!-- doc-ref:ignore -->
2. `docs/reference/todo-writing-guide.md` を起草<!-- doc-ref:ignore -->
3. `civil-guide-writer` エージェント新設
4. `todo-planner` description 更新

---

## 5. SNS・マーケティング

### ~~総監 R8予想6本の旧マガジン導線削除~~ ✅ 完了（2026-06-20）

**出典**: `docs/handoffs/2026-06-18-tankan-pack-cta-republish.md`

**実施**: R8予想6本の末尾有料領域の旧3ペルソナ導線を完全パック（`m171222175fac`）＋総監もくじ（`n3ed4c77ceed6`）へ Phase U-B 置換、6/6 ペイウォール保持を実体検証。詳細は §SNS 上掲の完了エントリ参照。

---

### content-angle P-1 カルーセルパイロット 🟢

**出典**: `docs/handoffs/2026-06-09-content-angle-implementation.md`

**残作業**:
1. `ig-carousel-writer` で `angle: counter`（反論切り口）の slide-data.json を執筆（source: note 記事「キーワード集が点にならない理由」）
2. `ig-post-create` で PNG 化 → `ig-carousel-qa` で採点
3. 結果が過去問パック平均を上回った場合のみ Phase 2 へ（angle-slides.mjs・tokens.json 等）

---

## 6. インフラ・セキュリティ

### セキュリティ定期チェック：API トークン更新サイクルと Claude プラグイン棚卸し 🟢

**対象シークレット（GitHub Secrets）**:

| シークレット | 用途 | 推奨サイクル |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Pages デプロイ・R2 同期 | 90日 |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` | R2 認証 | 90日 |
| `PSI_API_KEY` | PageSpeed Insights | 180日 |
| `YOUTUBE_CLIENT_SECRET` | YouTube API | 180日 |

**MCP サーバー棚卸し** (`.mcp.json`):
- 不要な MCP サーバーを削除（攻撃面を減らす）
- 各サーバーの権限スコープを最小化
- セキュリティアップデートを確認

**やること**:
1. GitHub Secrets の有効期限確認・期限切れ間近なものを更新
2. Cloudflare API Token の権限スコープを最小化
3. `.mcp.json` の MCP サーバーを棚卸し
4. 更新サイクルを Google Calendar or schedule hook に登録

---

## 7. ユーザー判断待ち

### コンクリート診断士（cd）— 著作権方針決定後に再開 🟣

**現状**: ガイド4本・テキスト6章・択一98問が `published:false` で整備済み。図クロップ59点の著作権処理方針が未決定のため全体が止まっている。

**ユーザーが決める必要があること（3択）**:
- **A. SVG 描き直し** — 図を SVG で再作成（著作権問題なし・コスト大）
- **B. ライセンス取得** — 試験実施機関（JCMM）に問い合わせて許諾
- **C. draft 固定継続** — 図クロップのあるページを `published:false` のまま販売しない

**方針決定後の残作業**:
- 低確度フラグ問題（約40問）の人手校正（`.tmp/cd-final9.json` / `.tmp/cd-final10.json`）
- 欠番3問（問48・56・85）を MDX に補完
- cd-essay-magazine の note カバー画像生成 → note 投稿（Mac）
- `npm run refresh-indexes` 実行
