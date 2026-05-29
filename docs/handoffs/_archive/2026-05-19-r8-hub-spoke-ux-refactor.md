---
title: 2026-05-19 R8 hub/spoke UX リファクタ + 価格 SoT 集約 + 導線統一セッション
date: 2026-05-19
session_focus: R8 hub のメタ説明削除・段落分割・関連白書チップ外部リンク化、note 価格/ID の MDX 本文除去（SoT 統一）、PersonaSelector コンポーネント新設による R8 spoke ↔ r0X-secondary のペルソナ選択 UI 統一、R8 spoke 冗長部削除 (Phase 1)
related_strategy: docs/note/noteコンテンツ計画.md
related_principle: docs/reference/content-principles.md
related_handoff_prev: docs/handoffs/2026-05-19-spoke-fixed-persona-unification.md
---

# 2026-05-19 セッション引き継ぎ — R8 hub/spoke UX リファクタ + 価格 SoT 集約

## 1. セッション概要

R8 予想問題 hub (`r8-essay-keyword-forecast`) と spoke 9 本 (`r8-essay-theme-*`) + 過去問 r0X-secondary 5 本 (R03-R07) を対象に、以下 5 軸の UX リファクタを実施。

| 軸 | 主要な変更 |
|---|---|
| **価格情報の SoT 統一** | MDX 本文の `¥X,XXX` / `M3` / `M4` 等の表記 56 箇所を 14 ファイルから削除。価格は `src/lib/note-magazines.ts` + カードコンポーネント経由でのみ表示 |
| **白書チップの外部リンク化** | 新規 `src/lib/whitepapers.ts` registry に 18 白書 × 政府公式 URL を登録。`<SourceBadges>` が registry を照合してチップを `<a>` 化 |
| **R8 hub の長文段落分割** | T1-T9 各テーマリード (200-400 字 × 1 段落) を意味の塊で 3 段落化。「過去 12 年テーマ」の R03-R07 遷移を箇条書きに変換 |
| **ペルソナ選択 UI 統一** | 新規 `<PersonaSelector>` コンポーネントを導入し、R8 spoke 9 本（同ページアンカー）と r0X-secondary 5 本（年度別模範論文ページ直リンク）の選択 UI をカード化で揃える |
| **R8 spoke 冗長部削除 (Phase 1)** | 「ペルソナ別の取り組み方」セクション冒頭の導入文と末尾の「業界外受験者へのアレンジ」H3 セクションを削除 |

合計 11 commit、`develop` は origin より 18 commits ahead。

## 2. 完了 commit 一覧

| commit | 内容 |
|---|---|
| `54d46f6eb` | `<SourceBadges>` 新設 + hub MDX の関連白書をバッジ化 |
| `63efae193` | hub MDX bold scope 35 字 → 12 字に圧縮 |
| `fa42b6281` | `hideFromCategory` frontmatter フラグ新設、カテゴリページから R8 spoke 9 本を除外 |
| `115fb684e` | `hideFromCategory` を docs sidebar の `CategoryNavCard` にも適用 |
| `40c76549a` | note マガジン価格・ID 表記を本文から削除（14 ファイル中 14 ファイル、HIGH 違反なし） |
| `5db712a39` | `pattern-essay-river-consultant` の価格削除 + ExamPoint HIGH 9-11 体言止め化 |
| `f73c2180d` | hub リードから冗長メタ説明を削除（再 commit、message 乖離復旧） |
| `ff4aece73` | `<SourceBadges>` チップを政府公式 URL に外部リンク化（`src/lib/whitepapers.ts` 新設） |
| `b36d9a91c` | hub の長文段落を 3 段落分割（T1-T9 × 1 + R03-R07 箇条書き化 + L47/L57 分割） |
| `9a30dcfe7` | `<PersonaSelector>` 新設 + R8 spoke 9 + r0X-secondary 5 の導線統一 |
| `0f408a038` | R8 spoke 9 本から導入文 + 業界外受験者段落を削除 (Phase 1) |

別セッション/別プロセスの commit:
- `bd5b8c9c2` pe-essay-review v1.1 skill 追加（他セッション）
- `1794bda16` r03-r07 secondary theme-backlinks 削除（別セッション作業が本セッションの commit message に巻き込まれた、message 乖離あり。詳細は §7）

## 3. 価格情報の SoT 統一（最重要）

### 真実源 (Single Source of Truth)

| 用途 | 場所 |
|---|---|
| **note magazine 価格** | `src/lib/note-magazines.ts` の各エントリの `price` フィールド |
| **カード表示** | `<MagazineInlineCard>` / `<MagazineSidebarCard>` が `note-magazines.ts` から動的読込 |
| **note 側ページ** | note.com 側のページが最終的な販売価格を表示 |

### 禁止事項

**MDX 本文に `¥X,XXX` や `M3` / `M4` 等の magazine ID を直書きしない。**

理由: note 側の料金改定時に MDX 本文を grep して書き換える運用は現実的でない。`note-magazines.ts` 1 箇所更新で全 spoke / hub のカード表示に伝播するアーキテクチャを維持する。

### 維持対象

- 公開予定日（「2026 年 6 月公開予定」等）は **本セッションでは維持**。Phase 2 で `NoteMagazine.releaseDate` フィールドへの集約を検討
- `docs/note/**/article.md`（note ドラフト原稿）は note 公開時の媒体表記なので価格表記 OK

### 検証

```bash
grep -rn '¥' .local/r2/posts/pe-comprehensive-management/r8-essay-theme-*/article.mdx \
              .local/r2/posts/pe-comprehensive-management/r8-essay-keyword-forecast/article.mdx \
              .local/r2/posts/pe-comprehensive-management/management-tradeoffs/article.mdx \
              .local/r2/posts/pe-comprehensive-management/essay-pattern-cross-year-application/article.mdx \
              .local/r2/posts/pe-comprehensive-management/pattern-essay-*/article.mdx
# 期待値: 0 件
```

## 4. 白書 URL registry の運用

### 真実源

`src/lib/whitepapers.ts` の `WHITEPAPERS_RAW` （`as const satisfies Record<string, WhitepaperEntry>`）。

key はチップ表記そのもの（年度サフィックス込み、例: `'環境白書 R7'`）。

### 登録済み 18 白書

環境白書 R7 / 水循環白書 R7 / 国土交通白書 R7 / 防災白書 R7 / 消防白書 R7 / 水産白書 R6 / 通商白書 R7 / ものづくり白書 R7 / 経済財政白書 R7 / 厚生労働白書 R7 / 労働経済の分析 R7 / 男女共同参画白書 R7 / 地方財政白書 R8 / エネルギー白書 R6 / 原子力白書 R6 / 情報通信白書 R7 / 科学技術・イノベーション白書 R7 / サイバーセキュリティ 2025

### 新白書追加時の手順

1. `src/lib/whitepapers.ts` の `WHITEPAPERS_RAW` に 1 エントリ追加（key + url + ministry）
2. URL は政府公式 landing page を WebSearch で取得後、WebFetch で実在確認（`feedback_url_verification.md` 準拠）
3. MDX 側は `<SourceBadges items={["新白書 RX"]} />` で参照するだけ（registry に key あればリンク化、無ければ非リンク表示）

### URL 更新時の手順

`note-magazines.ts` と同じく `whitepapers.ts` 1 箇所変更で全 spoke / hub に伝播する。grep 不要。

## 5. `<PersonaSelector>` コンポーネント

### 場所

- `src/components/ui/PersonaSelector/PersonaSelector.tsx`
- 真実源（4 固定ペルソナ表記）: コンポーネント内の `PERSONA_NAMES`（`content-principles.md §21` + `note-magazines.ts` shortTitle と整合）

### 使い方

**Pattern A: R8 spoke 用（同ページアンカー、デフォルト 4 ペルソナ）**

```jsx
<PersonaSelector mode="spoke-anchor" />
```

→ `#ゼネコン` `#河川コンサル` `#環境調査` `#道路発注者` の 4 アンカーリンクカード。挿入位置は `### ゼネコン` の直前（「ペルソナ別の取り組み方」セクション内）。

**Pattern B: r0X-secondary 用（年度別模範論文ページ直リンク）**

```jsx
<PersonaSelector
  items={[
    { persona: "road-municipality", href: "/docs/pe-comprehensive-management-r05-essay-road-municipality", caption: "..." },
    { persona: "environment-survey", href: "/docs/pe-comprehensive-management-r05-essay-environment-survey", caption: "..." },
    { persona: "general-contractor", href: "/docs/pe-comprehensive-management-r05-essay-general-contractor", caption: "..." },
    { persona: "river-consultant", href: "/docs/pe-comprehensive-management-r05-essay-river-consultant", caption: "..." },
  ]}
/>
```

### Phase 2 で追加予定の mode

`mode="magazine-chapter"` — note magazine 該当章への直リンクモード。note 公開後 (2026-06) に実装判断。

## 6. R8 spoke 構造の現状（commit `0f408a038` 以後）

各 R8 spoke (`r8-essay-theme-*`) の「## ペルソナ別の取り組み方」セクション構造:

```
## ペルソナ別の取り組み方

<PersonaSelector mode="spoke-anchor" />

### ゼネコン
（大手ゼネコン土木支店工事部長クラス）管理対象例: ... [200-400 字]

### 河川コンサル
（中堅建設コンサル河川・砂防部門部長クラス）管理対象例: ... [200-400 字]

### 環境調査
（中小規模の環境調査会社部長クラス）管理対象例: ... [200-400 字]

### 道路発注者
（地方公共団体・道路担当課長クラス）管理対象例: ... [200-400 字]

## 関連白書深掘り
```

導入文・業界外受験者段落は Phase 1 で削除済み。

## 7. Phase 2（note magazine 公開後、2026-06-XX 以降）

### 着手条件

- M3「R8 予想問題集」が note で公開され、`src/lib/note-magazines.ts` の `noteUrl` が埋まる
- M4「3D マトリクス 400 セル」が note で公開される
- 各 magazine の章構成が確定する（M3 第 1 章 = T1 気候変動適応、第 2 章 = T2 災害復旧、…）

### Phase 2 タスクリスト

- [ ] **H3 × 4 ペルソナ詳細を残すか note 統合で削除するか判断**
  - 判断軸: note 模範解答（3,000 字 × 4 ペルソナ）と現状の H3 詳細（200-400 字 × 4）の差別化が十分か
  - 削除する場合: 9 spoke × 4 H3 = 36 セクション（約 13,500 字）削除。SEO 損失リスクあり（GSC で流入確認推奨）
  - 残す場合: 各 H3 末尾に note 該当章 CTA を追加
- [ ] **`<PersonaSelector>` の `mode="magazine-chapter"` 拡張**
  - カードクリックで note magazine 該当章に直送するモード
  - props 例: `<PersonaSelector mode="magazine-chapter" magazineId="r8-essay-forecast" chapter={1} />`
- [ ] **「公開予定」表記を `NoteMagazine.releaseDate` フィールドに集約**
  - 現状 11 ファイルに「2026 年 6 月公開予定」が直書き。schema 変更を伴うため別タスク
  - 公開後は「公開予定」自体不要になるので、削除作業のみで完結する可能性もあり
- [ ] **lint カテゴリ追加（再発防止）**
  - `.local/r2/posts/` 配下 MDX 本文の `¥` 出現を MEDIUM 警告（価格 SoT 違反検知）
  - 既存 `lint-mdx-mobile.mjs` にカテゴリ追加

## 8. スクリプト教訓（並行作業時の MDX 編集）

### 教訓 1: frontmatter を絶対に触らない

MDX 本文を正規表現で書き換えるとき、frontmatter（`---` で囲まれた YAML）は **必ず分離してから処理する**。

```js
const fmMatch = result.match(/^(---\n[\s\S]*?\n---\n)/);
if (!fmMatch) throw new Error('No frontmatter');
const fm = fmMatch[1];
let body = result.substring(fm.length);
// body にのみ regex を適用
result = fm + body;
```

本セッションで `result.replace(/  +/g, ' ')` の連続空白圧縮が YAML indent（`    a:` の 4 空白）を破壊し pre-commit HIGH 6 件 reject。9 ファイルを `git restore` で復旧した。

### 教訓 2: スクリプトは `transformMdxFile` 経由

`.claude/scripts/lib/mdx-io.mjs` の `transformMdxFile()` を必ず使う。CRLF/LF を元のファイル状態に維持する。

```js
import { transformMdxFile } from '../.claude/scripts/lib/mdx-io.mjs';
transformMdxFile(filePath, (raw) => {
  // raw を変換して新 raw を返す。null を返すと書込みスキップ
});
```

### 教訓 3: `git add` 後の競合に注意

並行プロセス（別エージェント、CI、自動スクリプト等）が同時に staging area を変更する可能性がある。`git diff --cached --name-only` で staged 一覧を確認した直後でも、`git commit` までの間に変わることがある。本セッションでは commit `1794bda16` が message と内容乖離（私の `git add` 直後に別プロセスが r03-r07 secondary を staged 化して、私の commit がそれを巻き込んだ）。

防御策: 最終 `git add` → `git diff --cached --name-only` → `git commit` を最小ステップで連続実行する（間に他の操作を挟まない）。`feedback_git_add_verify_staged.md` 準拠。

## 9. 影響範囲（Critical Files）

### 新規ファイル

- `src/lib/whitepapers.ts` — 白書 URL registry SoT
- `src/components/ui/PersonaSelector/PersonaSelector.tsx` — 4 ペルソナ選択カード
- `src/components/ui/PersonaSelector/index.ts` — 同 entry
- `src/components/ui/SourceBadges/SourceBadges.tsx` — 関連白書チップ（commit `54d46f6eb` で新設、`ff4aece73` で外部リンク化）
- `src/components/ui/SourceBadges/index.ts` — 同 entry

### 修正ファイル（既存）

- `src/components/ui/PersonaSelector/PersonaSelector.tsx` — registry 連動
- `src/components/ui/SourceBadges/SourceBadges.tsx` — registry 連動
- `src/lib/component-loader/common.ts` — SourceBadges + PersonaSelector 登録
- `src/lib/component-loader/index.ts` — SourceBadges + PersonaSelector 動的 import
- `src/app/category/[slug]/page.tsx` L500 — `hideFromCategory` フィルタ追加
- `src/app/docs/[...slug]/page.tsx` L224 — `categoryArticles` フィルタ追加

### コンテンツ（合計 25 ファイル）

- 9 R8 spoke (`r8-essay-theme-*/article.mdx`) — 価格削除 + `hideFromCategory: true` + `<PersonaSelector mode="spoke-anchor" />` 追加 + Phase 1 削除
- 1 R8 hub (`r8-essay-keyword-forecast/article.mdx`) — 価格削除 + 段落分割 + リードメタ削除 + SourceBadges 18 個に適用
- 5 r0X-secondary (`r0[3-7]-secondary/article.mdx`) — `<PersonaSelector items={[...]} />` 化、リンク先を `r0X-essay-{persona}` に統一
- 1 `management-tradeoffs/article.mdx` — 価格削除
- 1 `essay-pattern-cross-year-application/article.mdx` — 価格削除
- 3 pattern-essay (`pattern-essay-{river-consultant,environment-survey,general-contractor}/article.mdx`) — 価格 + 割引率削除
- 5 src/config/*.json — refresh-indexes 出力

## 10. 残課題

| 項目 | 種別 | 対応タイミング |
|---|---|---|
| **Phase 2 着手** | コンテンツ + コンポーネント | note 公開後 (2026-06-XX) |
| `1794bda16` の commit message 乖離 | 任意 | push 前ならいつでも `git commit --amend` で修正可。放置でも実害なし |
| `docs/reference/skills-registry.md` CRLF/LF 残差 | 影響なし | 任意 |
| dev サーバー停止 | 任意 | 本セッションで `npm run dev`（task ID `byup6gesg`）を起動。継続使用するならそのまま |

## 11. 関連リファレンス

### 真実源

- 価格: [src/lib/note-magazines.ts](../../src/lib/note-magazines.ts)
- 白書 URL: [src/lib/whitepapers.ts](../../src/lib/whitepapers.ts)
- 4 固定ペルソナ: [docs/reference/content-principles.md](../reference/content-principles.md) §21
- 戦略: [docs/note/noteコンテンツ計画.md](../note/noteコンテンツ計画.md) Red Line #8

### コード

- カテゴリページフィルタ: [src/app/category/[slug]/page.tsx](../../src/app/category/%5Bslug%5D/page.tsx) L500
- docs sidebar フィルタ: [src/app/docs/[...slug]/page.tsx](../../src/app/docs/%5B...slug%5D/page.tsx) L224
- magazine 配置: [src/lib/magazine-placement.ts](../../src/lib/magazine-placement.ts)
- MDX 書込みヘルパー: [.claude/scripts/lib/mdx-io.mjs](../../.claude/scripts/lib/mdx-io.mjs)

### 前セッションのハンドオフ

- [2026-05-19 spoke 固定 4 ペルソナ化](./2026-05-19-spoke-fixed-persona-unification.md) — 本セッションの起点
- [2026-05-18 R8 essay forecast 白書派生](./2026-05-18-r8-essay-forecast-whitepaper-derived.md) — R8 spoke 9 本初版
- [2026-05-18 PE double track](./2026-05-18-r8-pe-double-track.md) — R8 候補テーマ拡張

### 確認のみで変更不要（CLAUDE.md §8 準拠）

- `docs/reference/agents-registry.md` — 新規エージェント追加なし
- `docs/reference/skills-guide.md` — 新規スキル追加なし
- `docs/reference/skills-registry.md` — 退役・カテゴリ変更なし
- `docs/reference/exam-content-policy.md` — 既存ルールと矛盾なし
- `docs/reference/content-authoring.md` — 既存ルールと矛盾なし
