---
name: project_cross_tradeoff_magazine
description: note 有料マガジン「総監記述式-5管理クロストレードオフ」全6記事の公開完了状況と構成
metadata: 
  node_type: memory
  type: project
  originSessionId: 72d6d7ef-7337-493c-93b6-78311b5f5a68
---

note 有料マガジン `docs/note/技術士総監/magazines/総監記述式-5管理クロストレードオフ/`（序章[無料]＋安全/経済性/情報/人的資源/社会環境[各¥500]、セット¥1,980）。

**Why:** 総監記述式で「どのお題が来ても20セルから解決策を引き出せる」実戦的引き出し集。白書連動で差別化。

**How to apply:** note公開済み。URLは下記SoT。追加記事や改訂時は `_meta.yaml` と article frontmatter の両方を更新する。

## 公開状況（2026-06-01 全6記事 published 完了）

| 記事 | noteId | noteUrl |
|---|---|---|
| 序章（無料） | ndb524ed63c92 | https://note.com/dobokunote/n/ndb524ed63c92 |
| 安全管理 | n771c1f2357f0 | https://note.com/dobokunote/n/n771c1f2357f0 |
| 経済性管理 | n01444c9aa4a6 | https://note.com/dobokunote/n/n01444c9aa4a6 |
| 情報管理 | nc9a3d01b8129 | https://note.com/dobokunote/n/nc9a3d01b8129 |
| 人的資源管理 | nc62f62f5c507 | https://note.com/dobokunote/n/nc62f62f5c507 |
| 社会環境管理 | ne5ad458ebd84 | https://note.com/dobokunote/n/ne5ad458ebd84 |

マガジンURL: https://note.com/dobokunote/m/m921fbe060575

## 今セッション（2026-06-01）で完成した主な変更

**構成転換（シナリオ列挙＋解決フレーム型）**:
- 旧6要素《核vs核/典型場面/白書事例/解決策/関連過去問/答案ひな型》→《リード→トレードオフ複数パターン列挙（各パターンに「トレードオフの構造」＋「解決策＝総監フレーム」）→答案ひな型》へ全面転換
- 白書数値引用ブロックを廃止、解決策の説得材料として本文に織り込む方式に
- 各管理記事：4ペア×各3シナリオ＋ペア別答案ひな型＋末尾「残余リスクで締める」
- 関連過去問ブロック削除、答案ひな型のみ残す

**文体・段落**:
- 解説地の文をですます調に統一（答案ひな型はである調を維持）
- トレードオフの構造・答案ひな型のラベルを独立行化し1〜2文ごとに改段

**カバー**:
- 全6記事に G2 cover frontmatter（`add-note-cover.mjs` 注入）＋PNG生成
- マガジン用 `_cover.png` 生成（`scripts/generate-magazine-covers.mjs` に tradeoff-5kanri エントリ追加）

**note 内送客設計**:
- 序章末尾に模範論文3種への回遊リンクカードを追加
- 有料5記事の「こんな人のための記事です」直前にマガジン誘導ブロック（---区切り＋URL）を挿入
- 序章の doboku-note.com リンク → note マガジンURL に差し替え
- 序章の「マガジン公開後に各記事URL反映」プレースホルダー → 全5記事のリンクカード一覧に展開

**ハッシュタグ**: 全6記事を89〜93個規模に拡張（管理固有/試験区分/学習系/職種・業界/時事）

**_meta.yaml**: magazineUrl・全記事noteUrl・freeIntro.noteUrl を記録済み

## 残課題

- `src/lib/note-magazines.ts` に本マガジン未登録（エントリ追加で doboku-note サイト上の CTA が自動表示される）
- `docs/note/noteコンテンツ計画.md` に本マガジン追記未着手
- 序章の 20セル俯瞰マトリクス図（`img/figure-matrix-overview.png`）が未生成のままプレースホルダー記述あり
- develop → main の push は未実施（/deploy スキル経由でユーザー判断）
